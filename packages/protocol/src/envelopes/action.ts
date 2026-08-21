import { z } from "zod";

export const CURRENT_PROTOCOL_VERSION = 2 as const;

type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.null(),
  z.boolean(),
  z.number().finite(),
  z.string(),
  z.array(jsonValueSchema),
  z.record(z.string(), jsonValueSchema),
]));

export const actionEnvelopeSchema = z.object({
  protocolVersion: z.literal(CURRENT_PROTOCOL_VERSION),
  actionId: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
  rulesetVersion: z.string().trim().min(1),
  action: z.record(z.string(), jsonValueSchema),
}).strict();

export type ActionEnvelopeDocument = z.infer<typeof actionEnvelopeSchema>;

export const parseActionEnvelope = (value: unknown): ActionEnvelopeDocument => actionEnvelopeSchema.parse(value);
