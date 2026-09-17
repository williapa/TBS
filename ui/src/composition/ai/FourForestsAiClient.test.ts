import { createWaitingGameStateFixture } from "@TBS/test-kit";
import { describe, expect, it, vi } from "vitest";

import { FourForestsAiClient, type AiWorker } from "./FourForestsAiClient";
import type { FourForestsAiWorkerRequest, FourForestsAiWorkerResponse } from "./fourForestsAiWorkerProtocol";

class FakeWorker implements AiWorker {
  readonly requests: FourForestsAiWorkerRequest[] = [];
  readonly terminate = vi.fn();
  private readonly listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  postMessage(message: FourForestsAiWorkerRequest): void {
    this.requests.push(message);
  }

  respond(response: FourForestsAiWorkerResponse): void {
    const event = new MessageEvent("message", { data: response });
    for (const listener of this.listeners.get("message") ?? []) listener(event);
  }
}

describe("FourForestsAiClient", () => {
  it("sends canonical state to a worker and resolves only the matching selection", async () => {
    const worker = new FakeWorker();
    const client = new FourForestsAiClient(worker);
    const state = createWaitingGameStateFixture();
    const selection = client.choose(state);

    expect(worker.requests).toEqual([{ type: "choose", requestId: 1, state }]);
    worker.respond({
      type: "selection",
      requestId: 1,
      stateRevision: state.revision,
      candidateKey: "end-turn",
      action: { type: "end-turn" },
    });
    await expect(selection).resolves.toMatchObject({ action: { type: "end-turn" } });

    client.dispose();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("surfaces worker failures without inventing a fallback move", async () => {
    const worker = new FakeWorker();
    const client = new FourForestsAiClient(worker);
    const selection = client.choose(createWaitingGameStateFixture());
    worker.respond({ type: "error", requestId: 1, message: "model unavailable" });

    await expect(selection).rejects.toThrow("model unavailable");
    client.dispose();
  });
});
