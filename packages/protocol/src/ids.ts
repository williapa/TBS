declare const protocolIdentifierBrand: unique symbol;

type ProtocolIdentifier<Name extends string> = string & {
  readonly [protocolIdentifierBrand]: Name;
};

export type ActionId = ProtocolIdentifier<"ActionId">;
export type RequestId = ProtocolIdentifier<"RequestId">;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const uuidIdentifier = <Name extends string>(value: string, kind: Name): ProtocolIdentifier<Name> => {
  if (!uuidPattern.test(value)) throw new Error(`${kind} must be a UUID`);
  return value as ProtocolIdentifier<Name>;
};

export const actionId = (value: string): ActionId => uuidIdentifier(value, "ActionId");
export const requestId = (value: string): RequestId => uuidIdentifier(value, "RequestId");
