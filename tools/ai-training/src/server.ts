#!/usr/bin/env node
import { createInterface } from "node:readline";

import { MAX_PROTOCOL_LINE_BYTES, TrainingProtocol } from "./protocol";

const protocol = new TrainingProtocol();
const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });

const write = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value)}\n`);
};

lines.on("line", (line) => {
  if (Buffer.byteLength(line, "utf8") > MAX_PROTOCOL_LINE_BYTES) {
    write({ id: null, ok: false, error: { code: "invalid-request", message: "request exceeds byte limit" } });
    return;
  }
  try {
    write(protocol.handle(JSON.parse(line)));
  } catch (error) {
    write({
      id: null,
      ok: false,
      error: {
        code: "invalid-request",
        message: error instanceof Error ? error.message : "request is not valid JSON",
      },
    });
  }
});
