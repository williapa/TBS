from __future__ import annotations

import torch
from torch import Tensor, nn


def _masked_mean(values: Tensor, mask: Tensor, dimension: int) -> Tensor:
    weights = mask.unsqueeze(-1).to(values.dtype)
    return (values * weights).sum(dimension) / weights.sum(dimension).clamp_min(1.0)


def _safe_gather(values: Tensor, indices: Tensor) -> Tensor:
    batch, count, width = values.shape
    padded = torch.cat((values, values.new_zeros((batch, 1, width))), dim=1)
    sentinel = torch.full_like(indices, count)
    safe_indices = torch.where(indices >= 0, indices, sentinel)
    return torch.gather(padded, 1, safe_indices.unsqueeze(-1).expand(-1, -1, width))


class TbsPolicyValueModel(nn.Module):
    """Small permutation-safe graph encoder used to prove the export boundary."""

    architecture_id = "hex-graph-policy-value@1"

    def __init__(
        self,
        cell_feature_count: int,
        entity_feature_count: int,
        candidate_feature_count: int,
        global_feature_count: int,
        hidden_size: int = 64,
    ) -> None:
        super().__init__()
        self.hidden_size = hidden_size
        self.cell_input = nn.Linear(cell_feature_count, hidden_size)
        self.cell_neighbors = nn.Linear(hidden_size, hidden_size, bias=False)
        self.entity_input = nn.Linear(entity_feature_count, hidden_size)
        self.entity_cell = nn.Linear(hidden_size, hidden_size, bias=False)
        self.entity_carrier = nn.Linear(hidden_size, hidden_size, bias=False)
        self.entity_cargo = nn.Linear(hidden_size, hidden_size, bias=False)
        self.entity_to_cell = nn.Linear(hidden_size, hidden_size, bias=False)
        self.global_input = nn.Linear(global_feature_count, hidden_size)
        self.context = nn.Sequential(
            nn.Linear(hidden_size * 3, hidden_size),
            nn.Tanh(),
        )
        self.candidate_input = nn.Linear(candidate_feature_count, hidden_size)
        self.candidate_actor = nn.Linear(hidden_size, hidden_size, bias=False)
        self.candidate_destination = nn.Linear(hidden_size, hidden_size, bias=False)
        self.candidate_target_entity = nn.Linear(hidden_size, hidden_size, bias=False)
        self.candidate_target_cell = nn.Linear(hidden_size, hidden_size, bias=False)
        self.policy = nn.Linear(hidden_size, 1)
        self.value = nn.Linear(hidden_size, 1)

    def forward(
        self,
        cell_features: Tensor,
        cell_mask: Tensor,
        cell_neighbors: Tensor,
        entity_features: Tensor,
        entity_mask: Tensor,
        entity_cells: Tensor,
        entity_carriers: Tensor,
        candidate_features: Tensor,
        candidate_mask: Tensor,
        candidate_actors: Tensor,
        candidate_destinations: Tensor,
        candidate_target_entities: Tensor,
        candidate_target_cells: Tensor,
        global_features: Tensor,
    ) -> tuple[Tensor, Tensor]:
        cell_base = torch.tanh(self.cell_input(cell_features))
        batch, cell_count, _ = cell_base.shape
        neighbor_flat = cell_neighbors.reshape(batch, -1)
        neighbor_hidden = _safe_gather(cell_base, neighbor_flat).reshape(
            batch, cell_count, 6, self.hidden_size
        )
        neighbor_mask = (cell_neighbors >= 0).to(cell_base.dtype)
        neighbor_sum = (neighbor_hidden * neighbor_mask.unsqueeze(-1)).sum(dim=2)
        neighbor_mean = neighbor_sum / neighbor_mask.sum(dim=2, keepdim=True).clamp_min(1.0)
        cell_hidden = torch.tanh(cell_base + self.cell_neighbors(neighbor_mean))

        entity_base = torch.tanh(
            self.entity_input(entity_features)
            + self.entity_cell(_safe_gather(cell_hidden, entity_cells))
        )
        entity_ids = torch.arange(entity_base.shape[1], device=entity_carriers.device).reshape(
            1, entity_base.shape[1], 1
        )
        cargo_weights = (
            (entity_carriers.unsqueeze(1) == entity_ids).to(entity_base.dtype)
            * entity_mask.unsqueeze(1)
        )
        cargo_mean = torch.bmm(cargo_weights, entity_base) / (
            cargo_weights.sum(dim=2, keepdim=True).clamp_min(1.0)
        )
        entity_hidden = torch.tanh(
            entity_base
            + self.entity_carrier(_safe_gather(entity_base, entity_carriers))
            + self.entity_cargo(cargo_mean)
        )

        cell_ids = torch.arange(cell_count, device=entity_cells.device).reshape(1, cell_count, 1)
        cell_entity_weights = (
            (entity_cells.unsqueeze(1) == cell_ids).to(entity_hidden.dtype)
            * entity_mask.unsqueeze(1)
        )
        cell_entity_mean = torch.bmm(cell_entity_weights, entity_hidden) / (
            cell_entity_weights.sum(dim=2, keepdim=True).clamp_min(1.0)
        )
        cell_hidden = torch.tanh(cell_hidden + self.entity_to_cell(cell_entity_mean))

        board_summary = _masked_mean(cell_hidden, cell_mask, 1)
        entity_summary = _masked_mean(entity_hidden, entity_mask, 1)
        global_summary = torch.tanh(self.global_input(global_features))
        context = self.context(torch.cat((board_summary, entity_summary, global_summary), dim=-1))

        candidate_hidden = torch.tanh(
            self.candidate_input(candidate_features)
            + self.candidate_actor(_safe_gather(entity_hidden, candidate_actors))
            + self.candidate_destination(_safe_gather(cell_hidden, candidate_destinations))
            + self.candidate_target_entity(_safe_gather(entity_hidden, candidate_target_entities))
            + self.candidate_target_cell(_safe_gather(cell_hidden, candidate_target_cells))
            + context.unsqueeze(1)
        )
        policy_logits = self.policy(candidate_hidden).squeeze(-1)
        policy_logits = policy_logits.masked_fill(candidate_mask <= 0, -1.0e9)
        value = torch.tanh(self.value(context)).squeeze(-1)
        return policy_logits, value
