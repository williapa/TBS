from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path
from typing import Any

import numpy as np
import onnxruntime as ort
import torch

from export_phase2_model import (
    INPUT_NAMES,
    _assert_permutation_contract,
    _assert_shape_and_mask_contract,
    _candidate_subset_inputs,
    _numpy_inputs,
    _padded_inputs,
    _write,
    model_inputs,
)
from four_forests_phase3 import (
    CANONICAL_TRAINING_PROFILE,
    MODEL_ARCHITECTURE,
    OBJECTIVE_POLICY_VERSION,
    PILOT_VERSION,
    TrainingEnvironmentClient,
)
from model import TbsPolicyValueModel


def _load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description="Export a qualified Four Forests policy bundle")
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("qualification_report", type=Path)
    parser.add_argument("output_directory", type=Path)
    args = parser.parse_args()

    checkpoint_path: Path = args.checkpoint.resolve()
    qualification_path: Path = args.qualification_report.resolve()
    output_directory: Path = args.output_directory.resolve()
    qualification = _load(qualification_path)
    if qualification.get("qualification", {}).get("decision") != "passed":
        raise RuntimeError("Four Forests export requires a passing qualification report")
    checkpoint_hash = _sha256(checkpoint_path)
    if qualification.get("checkpoint", {}).get("sha256") != checkpoint_hash:
        raise RuntimeError("qualification report does not identify the supplied checkpoint")

    with TrainingEnvironmentClient() as client:
        observation = client.reset("export", 20260916, 1)
        encoding = client.encode("export")
        client.release("export")
    provenance = {
        "presetId": observation["presetId"],
        "presetHash": observation["presetHash"],
        "schemaVersion": observation["state"]["schemaVersion"],
        "rulesetVersion": observation["state"]["rulesetVersion"],
        "contentVersion": observation["state"]["contentVersion"],
        "environmentVersion": observation["environmentVersion"],
        "observationEncodingVersion": encoding["version"],
        "candidateEncodingVersion": observation["candidateVersion"],
        "curriculumProfile": CANONICAL_TRAINING_PROFILE,
    }
    if qualification.get("provenance") != provenance:
        raise RuntimeError("qualification provenance does not match the live Four Forests identity")

    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    if checkpoint.get("architectureId") != MODEL_ARCHITECTURE:
        raise RuntimeError("checkpoint architecture is not supported by the Four Forests exporter")
    if checkpoint.get("provenance") != provenance:
        raise RuntimeError("checkpoint provenance does not match the qualified identity")
    tensors = encoding["tensors"]
    model = TbsPolicyValueModel(
        cell_feature_count=len(tensors["cellFeatures"][0]),
        entity_feature_count=len(tensors["entityFeatures"][0]),
        candidate_feature_count=len(tensors["candidateFeatures"][0]),
        global_feature_count=len(tensors["globalFeatures"]),
    ).eval()
    model.load_state_dict(checkpoint["stateDict"])
    inputs = model_inputs(encoding)
    with torch.no_grad():
        pytorch_logits, pytorch_value = model(*inputs)
    _assert_permutation_contract(model, inputs, pytorch_logits, pytorch_value)
    _assert_shape_and_mask_contract(model, inputs, pytorch_logits, pytorch_value)

    output_directory.mkdir(parents=True, exist_ok=True)
    exported_checkpoint = output_directory / "checkpoint.pt"
    onnx_path = output_directory / "policy-value.onnx"
    fixture_path = output_directory / "four-forests-observation.json"
    expected_path = output_directory / "pytorch-output.json"
    qualification_copy = output_directory / "qualification-report.json"
    manifest_path = output_directory / "manifest.json"
    shutil.copyfile(checkpoint_path, exported_checkpoint)
    shutil.copyfile(qualification_path, qualification_copy)
    _write(fixture_path, {
        **provenance,
        "encoding": encoding,
    })

    dynamic_axes = {name: {0: "batch"} for name in INPUT_NAMES}
    for name in ("cell_features", "cell_mask", "cell_neighbors"):
        dynamic_axes[name][1] = "cells"
    for name in ("entity_features", "entity_mask", "entity_cells", "entity_carriers"):
        dynamic_axes[name][1] = "entities"
    for name in (
        "candidate_features", "candidate_mask", "candidate_actors", "candidate_destinations",
        "candidate_target_entities", "candidate_target_cells",
    ):
        dynamic_axes[name][1] = "candidates"
    dynamic_axes["policy_logits"] = {0: "batch", 1: "candidates"}
    dynamic_axes["value"] = {0: "batch"}
    torch.onnx.export(
        model,
        inputs,
        onnx_path,
        input_names=INPUT_NAMES,
        output_names=["policy_logits", "value"],
        dynamic_axes=dynamic_axes,
        opset_version=18,
        dynamo=False,
    )
    runtime = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    runtime_logits, runtime_value = runtime.run(None, _numpy_inputs(inputs))
    np.testing.assert_allclose(runtime_logits, pytorch_logits.numpy(), atol=1e-5, rtol=1e-5)
    np.testing.assert_allclose(runtime_value, pytorch_value.numpy(), atol=1e-5, rtol=1e-5)
    for alternate_inputs in (_padded_inputs(inputs), _candidate_subset_inputs(inputs)):
        with torch.no_grad():
            alternate_logits, alternate_value = model(*alternate_inputs)
        runtime_logits_alternate, runtime_value_alternate = runtime.run(
            None, _numpy_inputs(alternate_inputs)
        )
        np.testing.assert_allclose(
            runtime_logits_alternate, alternate_logits.numpy(), atol=1e-5, rtol=1e-5
        )
        np.testing.assert_allclose(
            runtime_value_alternate, alternate_value.numpy(), atol=1e-5, rtol=1e-5
        )
    _write(expected_path, {
        "policyLogits": pytorch_logits[0].tolist(),
        "value": float(pytorch_value[0]),
    })

    manifest = {
        "manifestVersion": "tbs-model-manifest@1",
        "releaseId": "four-forests-phase-3-release-candidate",
        "qualifiedForFourForestsPolicyRelease": True,
        "qualifiedForPlayerRelease": False,
        "playerReleaseBlockers": [
            "implement and verify the qualified deterministic policy postprocessor in the player runtime",
        ],
        **provenance,
        "architectureId": MODEL_ARCHITECTURE,
        "checkpointSha256": checkpoint_hash,
        "modelSha256": _sha256(onnx_path),
        "qualificationReportSha256": _sha256(qualification_copy),
        "pilotVersion": PILOT_VERSION,
        "inferencePolicy": {
            "version": OBJECTIVE_POLICY_VERSION,
            "objectiveTopK": qualification["configuration"]["objectiveTopK"],
            "canonicalOpeningGuardrail": True,
            "considersAllLegalObjectiveAttackerActions": True,
            "recentPositionWindow": 64,
        },
        "qualification": qualification["qualification"],
        "supportedShapes": {
            "dynamicAxes": ["batch", "cells", "entities", "candidates"],
            "limits": encoding["limits"],
            "featureCounts": {
                "cell": len(tensors["cellFeatures"][0]),
                "entity": len(tensors["entityFeatures"][0]),
                "candidate": len(tensors["candidateFeatures"][0]),
                "global": len(tensors["globalFeatures"]),
            },
        },
    }
    _write(manifest_path, manifest)
    print(json.dumps({
        "checkpoint": str(exported_checkpoint),
        "model": str(onnx_path),
        "manifest": str(manifest_path),
        "modelSha256": manifest["modelSha256"],
        "qualifiedForFourForestsPolicyRelease": True,
        "qualifiedForPlayerRelease": False,
    }))


if __name__ == "__main__":
    main()
