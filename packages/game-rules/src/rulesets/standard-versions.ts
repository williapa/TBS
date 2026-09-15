import { rulesetVersion, type RulesetVersion } from "@TBS/game-core";

export const LEGACY_STANDARD_RULESET_VERSION = rulesetVersion("standard@1");
export const STANDARD_RULESET_VERSION = rulesetVersion("standard@2");

export const STANDARD_MAX_TURNS = 60;

export const isSupportedStandardRulesetVersion = (
  value: RulesetVersion,
): boolean => value === LEGACY_STANDARD_RULESET_VERSION || value === STANDARD_RULESET_VERSION;
