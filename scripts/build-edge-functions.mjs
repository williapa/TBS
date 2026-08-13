import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "rolldown";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const outputFile = resolve(
  repositoryRoot,
  "supabase/functions/submit-action/generated/trusted-action-runtime.js",
);

await mkdir(dirname(outputFile), { recursive: true });
await build({
  cwd: repositoryRoot,
  input: "packages/application/src/commands/trustedActionRuntime.ts",
  platform: "browser",
  treeshake: true,
  output: {
    file: outputFile,
    format: "esm",
    minify: true,
    sourcemap: false,
  },
});
