declare const identifierBrand: unique symbol;

type Identifier<Name extends string> = string & {
  readonly [identifierBrand]: Name;
};

export type ContentVersion = Identifier<"ContentVersion">;
export type EntityId = Identifier<"EntityId">;
export type RulesetVersion = Identifier<"RulesetVersion">;
export type TeamId = Identifier<"TeamId">;
export type TerrainTypeId = Identifier<"TerrainTypeId">;
export type UnitTypeId = Identifier<"UnitTypeId">;

const identifier = <Name extends string>(value: string, kind: Name): Identifier<Name> => {
  if (value.trim().length === 0) {
    throw new Error(`${kind} must not be empty`);
  }
  return value as Identifier<Name>;
};

export const contentVersion = (value: string): ContentVersion => identifier(value, "ContentVersion");
export const entityId = (value: string): EntityId => identifier(value, "EntityId");
export const rulesetVersion = (value: string): RulesetVersion => identifier(value, "RulesetVersion");
export const teamId = (value: string): TeamId => identifier(value, "TeamId");
export const terrainTypeId = (value: string): TerrainTypeId => identifier(value, "TerrainTypeId");
export const unitTypeId = (value: string): UnitTypeId => identifier(value, "UnitTypeId");
