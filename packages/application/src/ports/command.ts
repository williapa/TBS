import type { SubmitActionInput, SubmitActionResult } from "../contracts";

export interface GameCommandPort {
  submitAction(input: SubmitActionInput): Promise<SubmitActionResult>;
}
