import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "rolldown";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const outputFile = resolve(
  repositoryRoot,
  "supabase/functions/submit-action/generated/trusted-action-runtime.js",
);
const workspaceSources = {
  "@TBS/game-core": resolve(repositoryRoot, "packages/game-core/src/index.ts"),
  "@TBS/game-rules": resolve(repositoryRoot, "packages/game-rules/src/index.ts"),
  "@TBS/protocol": resolve(repositoryRoot, "packages/protocol/src/index.ts"),
};

await mkdir(dirname(outputFile), { recursive: true });
const result = await build({
  cwd: repositoryRoot,
  input: "packages/application/src/commands/trustedActionRuntime.ts",
  platform: "browser",
  resolve: { alias: workspaceSources },
  treeshake: true,
  output: {
    file: outputFile,
    format: "esm",
    minify: true,
    sourcemap: false,
  },
});

const bundledModuleIds = result.output.flatMap((output) =>
  output.type === "chunk" ? Object.keys(output.modules) : []
);
const staleWorkspaceModule = bundledModuleIds.find((moduleId) =>
  moduleId.includes("/packages/") && moduleId.includes("/dist/")
);
if (staleWorkspaceModule) {
  throw new Error(`Trusted action bundle included stale workspace output: ${staleWorkspaceModule}`);
}
for (const sourceEntry of Object.values(workspaceSources)) {
  if (!bundledModuleIds.some((moduleId) => moduleId.startsWith(dirname(sourceEntry)))) {
    throw new Error(`Trusted action bundle did not include workspace source: ${sourceEntry}`);
  }
}
