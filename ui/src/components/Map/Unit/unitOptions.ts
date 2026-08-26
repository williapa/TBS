import { mapUnitOptionGroups } from "@TBS/game-setup";
import type { OptionGroups } from "../../../types";

export const unitOptions = [
  ["empty", ["none"]],
  ...mapUnitOptionGroups.map(([category, units]) => [category, units] as const),
] satisfies OptionGroups;
