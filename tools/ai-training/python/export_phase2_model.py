from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np
import onnxruntime as ort
import torch

from model import TbsPolicyValueModel


INPUT_NAMES = [
    "cell_features",
    "cell_mask",
    "cell_neighbors",
    "entity_features",
    "entity_mask",
    "entity_cells",
    "entity_carriers",
    "candidate_features",
    "candidate_mask",
    "candidate_actors",
    "candidate_destinations",
    "candidate_target_entities",
    "candidate_target_cells",
    "global_features",
]


def _load(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def _write(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _tensor(value: Any, dtype: torch.dtype) -> torch.Tensor:
    return torch.tensor([value], dtype=dtype)


def model_inputs(encoding: dict[str, Any]) -> tuple[torch.Tensor, ...]:
    tensors = encoding["tensors"]
    return (
        _tensor(tensors["cellFeatures"], torch.float32),
        _tensor(tensors["cellMask"], torch.float32),
        _tensor(tensors["cellNeighbors"], torch.int64),
        _tensor(tensors["entityFeatures"], torch.float32),
        _tensor(tensors["entityMask"], torch.float32),
        _tensor(tensors["entityCells"], torch.int64),
        _tensor(tensors["entityCarriers"], torch.int64),
        _tensor(tensors["candidateFeatures"], torch.float32),
        _tensor(tensors["candidateMask"], torch.float32),
        _tensor(tensors["candidateActors"], torch.int64),
        _tensor(tensors["candidateDestinations"], torch.int64),
        _tensor(tensors["candidateTargetEntities"], torch.int64),
        _tensor(tensors["candidateTargetCells"], torch.int64),
        _tensor(tensors["globalFeatures"], torch.float32),
    )


def _numpy_inputs(inputs: tuple[torch.Tensor, ...]) -> dict[str, np.ndarray]:
    return {name: value.detach().cpu().numpy() for name, value in zip(INPUT_NAMES, inputs)}


def _permuted_entity_inputs(inputs: tuple[torch.Tensor, ...]) -> tuple[torch.Tensor, ...]:
    values = list(inputs)
    entity_count = values[3].shape[1]
    permutation = torch.arange(entity_count - 1, -1, -1)
    inverse = torch.empty_like(permutation)
    inverse[permutation] = torch.arange(entity_count)
    values[3] = values[3][:, permutation]
    values[4] = values[4][:, permutation]
    values[5] = values[5][:, permutation]
    carriers = values[6][:, permutation]
    values[6] = torch.where(carriers >= 0, inverse[carriers.clamp_min(0)], carriers)
    for input_index in (9, 11):
        references = values[input_index]
        values[input_index] = torch.where(
            references >= 0, inverse[references.clamp_min(0)], references
        )
    return tuple(values)


def _permuted_candidate_inputs(inputs: tuple[torch.Tensor, ...]) -> tuple[torch.Tensor, ...]:
    values = list(inputs)
    candidate_count = values[7].shape[1]
    permutation = torch.arange(candidate_count - 1, -1, -1)
    for input_index in range(7, 13):
        values[input_index] = values[input_index][:, permutation]
    return tuple(values)


def _padded_inputs(inputs: tuple[torch.Tensor, ...]) -> tuple[torch.Tensor, ...]:
    values = list(inputs)
    values[0] = torch.cat((values[0], torch.zeros_like(values[0][:, :1])), dim=1)
    values[1] = torch.cat((values[1], torch.zeros_like(values[1][:, :1])), dim=1)
    values[2] = torch.cat((values[2], torch.full_like(values[2][:, :1], -1)), dim=1)
    values[3] = torch.cat((values[3], torch.zeros_like(values[3][:, :1])), dim=1)
    values[4] = torch.cat((values[4], torch.zeros_like(values[4][:, :1])), dim=1)
    values[5] = torch.cat((values[5], torch.full_like(values[5][:, :1], -1)), dim=1)
    values[6] = torch.cat((values[6], torch.full_like(values[6][:, :1], -1)), dim=1)
    values[7] = torch.cat((values[7], torch.zeros_like(values[7][:, :1])), dim=1)
    values[8] = torch.cat((values[8], torch.zeros_like(values[8][:, :1])), dim=1)
    for input_index in range(9, 13):
        values[input_index] = torch.cat(
            (values[input_index], torch.full_like(values[input_index][:, :1], -1)), dim=1
        )
    return tuple(values)


def _candidate_subset_inputs(inputs: tuple[torch.Tensor, ...]) -> tuple[torch.Tensor, ...]:
    values = list(inputs)
    for input_index in range(7, 13):
        values[input_index] = values[input_index][:, ::2]
    return tuple(values)


def _assert_permutation_contract(
    model: TbsPolicyValueModel,
    inputs: tuple[torch.Tensor, ...],
    logits: torch.Tensor,
    value: torch.Tensor,
) -> None:
    with torch.no_grad():
        entity_logits, entity_value = model(*_permuted_entity_inputs(inputs))
        candidate_logits, candidate_value = model(*_permuted_candidate_inputs(inputs))
    torch.testing.assert_close(entity_logits, logits, atol=1e-6, rtol=1e-6)
    torch.testing.assert_close(entity_value, value, atol=1e-6, rtol=1e-6)
    torch.testing.assert_close(candidate_logits, logits.flip(1), atol=1e-6, rtol=1e-6)
    torch.testing.assert_close(candidate_value, value, atol=1e-6, rtol=1e-6)


def _assert_shape_and_mask_contract(
    model: TbsPolicyValueModel,
    inputs: tuple[torch.Tensor, ...],
    logits: torch.Tensor,
    value: torch.Tensor,
) -> None:
    with torch.no_grad():
        padded_logits, padded_value = model(*_padded_inputs(inputs))
        subset_logits, subset_value = model(*_candidate_subset_inputs(inputs))
    torch.testing.assert_close(padded_logits[:, :-1], logits, atol=1e-6, rtol=1e-6)
    torch.testing.assert_close(padded_logits[:, -1], torch.tensor([-1.0e9]))
    torch.testing.assert_close(padded_value, value, atol=1e-6, rtol=1e-6)
    torch.testing.assert_close(subset_logits, logits[:, ::2], atol=1e-6, rtol=1e-6)
    torch.testing.assert_close(subset_value, value, atol=1e-6, rtol=1e-6)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("fixture", type=Path)
    parser.add_argument("output_directory", type=Path)
    args = parser.parse_args()
    fixture = _load(args.fixture)
    encoding = fixture["encoding"]
    tensors = encoding["tensors"]
    output_directory: Path = args.output_directory
    output_directory.mkdir(parents=True, exist_ok=True)

    torch.manual_seed(20260914)
    model = TbsPolicyValueModel(
        cell_feature_count=len(tensors["cellFeatures"][0]),
        entity_feature_count=len(tensors["entityFeatures"][0]),
        candidate_feature_count=len(tensors["candidateFeatures"][0]),
        global_feature_count=len(tensors["globalFeatures"]),
    ).eval()
    inputs = model_inputs(encoding)
    with torch.no_grad():
        pytorch_logits, pytorch_value = model(*inputs)
    _assert_permutation_contract(model, inputs, pytorch_logits, pytorch_value)
    _assert_shape_and_mask_contract(model, inputs, pytorch_logits, pytorch_value)

    checkpoint_path = output_directory / "checkpoint.pt"
    onnx_path = output_directory / "policy-value.onnx"
    expected_path = output_directory / "pytorch-output.json"
    manifest_path = output_directory / "manifest.json"
    torch.save(
        {
            "architectureId": model.architecture_id,
            "stateDict": model.state_dict(),
            "torchSeed": 20260914,
            "trainingState": "untrained-export-smoke",
        },
        checkpoint_path,
    )
    dynamic_axes = {
        name: {0: "batch"} for name in INPUT_NAMES
    }
    for name in ("cell_features", "cell_mask", "cell_neighbors"):
        dynamic_axes[name][1] = "cells"
    for name in ("entity_features", "entity_mask", "entity_cells", "entity_carriers"):
        dynamic_axes[name][1] = "entities"
    for name in (
        "candidate_features",
        "candidate_mask",
        "candidate_actors",
        "candidate_destinations",
        "candidate_target_entities",
        "candidate_target_cells",
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
        runtime_alternate_logits, runtime_alternate_value = runtime.run(
            None, _numpy_inputs(alternate_inputs)
        )
        np.testing.assert_allclose(
            runtime_alternate_logits, alternate_logits.numpy(), atol=1e-5, rtol=1e-5
        )
        np.testing.assert_allclose(
            runtime_alternate_value, alternate_value.numpy(), atol=1e-5, rtol=1e-5
        )
    _write(
        expected_path,
        {
            "policyLogits": pytorch_logits[0].tolist(),
            "value": float(pytorch_value[0]),
        },
    )

    model_hash = hashlib.sha256(onnx_path.read_bytes()).hexdigest()
    manifest = {
        "manifestVersion": "tbs-model-manifest@1",
        "releaseId": "money-mountain-phase-2-untrained-smoke",
        "qualifiedForPlayerRelease": False,
        "presetId": fixture["presetId"],
        "presetHash": fixture["presetHash"],
        "schemaVersion": fixture["schemaVersion"],
        "rulesetVersion": fixture["rulesetVersion"],
        "contentVersion": fixture["contentVersion"],
        "observationEncodingVersion": encoding["version"],
        "candidateEncodingVersion": encoding["candidateVersion"],
        "architectureId": model.architecture_id,
        "modelSha256": model_hash,
        "normalization": fixture["normalization"],
        "featureNames": fixture["featureNames"],
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
        "turnLimitSemantics": {
            "maximumPlayerTurns": 60,
            "remainingTurnsIncludesCurrentTurn": True,
            "drawIsTerminal": True,
        },
        "trainingConfigurationReference": "untrained deterministic export smoke; not a trained checkpoint",
    }
    _write(manifest_path, manifest)
    print(
        json.dumps(
            {
                "checkpoint": str(checkpoint_path),
                "model": str(onnx_path),
                "manifest": str(manifest_path),
                "modelSha256": model_hash,
                "pytorchOnnxMaximumAbsoluteDifference": float(
                    np.max(np.abs(runtime_logits - pytorch_logits.numpy()))
                ),
            }
        )
    )


if __name__ == "__main__":
    main()
