import { z } from "zod";

export type ProtocolValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export class ProtocolValidationError extends Error {
  readonly issues: readonly ProtocolValidationIssue[];

  constructor(issues: readonly ProtocolValidationIssue[]) {
    super(issues.map(({ path, message }) => `${path}: ${message}`).join("; "));
    this.name = "ProtocolValidationError";
    this.issues = issues;
  }
}

const issuePath = (prefix: string, path: readonly PropertyKey[]): string =>
  [prefix, ...path.map(String)].filter(Boolean).join(".");

export const protocolValidationError = (error: unknown, prefix = "value"): ProtocolValidationError => {
  if (error instanceof ProtocolValidationError) {
    return new ProtocolValidationError(error.issues.map((issue) => ({
      ...issue,
      path: issuePath(prefix, [issue.path]),
    })));
  }
  if (error instanceof z.ZodError) {
    return new ProtocolValidationError(error.issues.map((issue) => ({
      path: issuePath(prefix, issue.path),
      message: issue.message,
    })));
  }
  return new ProtocolValidationError([{
    path: prefix,
    message: error instanceof Error ? error.message : "invalid value",
  }]);
};

export const parseProtocolValue = <Value>(
  prefix: string,
  parser: (value: unknown) => Value,
  value: unknown,
): Value => {
  try {
    return parser(value);
  } catch (error) {
    throw protocolValidationError(error, prefix);
  }
};
