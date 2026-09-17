import type { AiOpponent, StandardGameSnapshot } from "@TBS/application";

import type {
  FourForestsAiSelection,
  FourForestsAiWorkerRequest,
  FourForestsAiWorkerResponse,
} from "./fourForestsAiWorkerProtocol";

const INFERENCE_TIMEOUT_MS = 30_000;

type PendingRequest = Readonly<{
  reject: (reason: Error) => void;
  resolve: (selection: FourForestsAiSelection) => void;
  timeout: ReturnType<typeof setTimeout>;
}>;

export type AiWorker = Pick<Worker, "addEventListener" | "postMessage" | "removeEventListener" | "terminate">;

const createWorker = (): AiWorker => new Worker(
  new URL("./fourForestsAi.worker.ts", import.meta.url),
  { name: "four-forests-ai", type: "module" },
);

export class FourForestsAiClient implements AiOpponent {
  private nextRequestId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly worker: AiWorker;

  constructor(worker: AiWorker = createWorker()) {
    this.worker = worker;
    this.worker.addEventListener("message", this.receive as EventListener);
    this.worker.addEventListener("error", this.failAll as EventListener);
  }

  choose(state: StandardGameSnapshot["state"]): Promise<FourForestsAiSelection> {
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error("The AI took too long to choose a move"));
      }, INFERENCE_TIMEOUT_MS);
      this.pending.set(requestId, { reject, resolve, timeout });
      const request: FourForestsAiWorkerRequest = { type: "choose", requestId, state };
      this.worker.postMessage(request);
    });
  }

  dispose(): void {
    this.worker.removeEventListener("message", this.receive as EventListener);
    this.worker.removeEventListener("error", this.failAll as EventListener);
    this.worker.terminate();
    this.rejectPending(new Error("AI worker was stopped"));
  }

  private readonly receive = (event: MessageEvent<FourForestsAiWorkerResponse>): void => {
    const response = event.data;
    const pending = this.pending.get(response.requestId);
    if (!pending) return;
    clearTimeout(pending.timeout);
    this.pending.delete(response.requestId);
    if (response.type === "error") pending.reject(new Error(response.message));
    else pending.resolve(response);
  };

  private readonly failAll = (event: Event): void => {
    const message = "message" in event && typeof event.message === "string" && event.message
      ? `The AI worker stopped unexpectedly: ${event.message}`
      : "The AI worker stopped unexpectedly";
    this.rejectPending(new Error(message));
  };

  private rejectPending(reason: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(reason);
    }
    this.pending.clear();
  }
}
