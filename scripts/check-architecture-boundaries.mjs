import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const ignoredDirectories = new Set(["build", "coverage", "dist", "generated", "node_modules"]);

const sourceFilesUnder = async (root) => {
  const files = [];
  const visit = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (sourceExtensions.has(extname(entry.name))) files.push(path);
    }
  };
  await visit(root);
  return files;
};

const importedModules = (source) => {
  const modules = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) modules.push(match[1]);
  }
  return modules;
};

const rules = [
  {
    roots: ["packages/game-core/src"],
    message: "game-core is the innermost framework-free package and cannot depend on other workspace, UI, renderer, or provider packages",
    disallowed: (module) =>
      module.startsWith("@TBS/") ||
      module === "react" ||
      module.startsWith("react/") ||
      module === "three" ||
      module.startsWith("@react-three/") ||
      module.startsWith("@supabase/"),
  },
  {
    roots: ["packages/protocol/src"],
    message: "protocol may depend only on game-core and external runtime-schema libraries",
    disallowed: (module) => module.startsWith("@TBS/") && module !== "@TBS/game-core",
  },
  {
    roots: ["packages/game-rules/src"],
    message: "game-rules may depend only on game-core and external runtime-schema libraries",
    disallowed: (module) => module.startsWith("@TBS/") && module !== "@TBS/game-core",
  },
  {
    roots: ["packages/game-setup/src"],
    message: "game-setup may depend only on game-core and game-rules",
    disallowed: (module) => module.startsWith("@TBS/") && ![
      "@TBS/game-core",
      "@TBS/game-rules",
    ].includes(module),
  },
  {
    roots: ["packages/presentation/src"],
    message: "presentation may depend only on domain contracts and cannot depend on React, renderers, browser APIs, or provider implementations",
    disallowed: (module) =>
      module === "react"
      || module.startsWith("react/")
      || module === "three"
      || module.startsWith("@react-three/")
      || module.startsWith("@supabase/")
      || (module.startsWith("@TBS/") && ![
        "@TBS/game-core",
        "@TBS/game-rules",
      ].includes(module)),
  },
  {
    roots: ["packages/renderer-2d/src", "packages/renderer-3d/src"],
    message: "renderers may depend on React and presentation contracts but cannot import game rules, persistence, setup, application, or providers",
    disallowed: (module) => module.startsWith("@TBS/") && module !== "@TBS/presentation",
  },
  {
    roots: ["packages/application/src"],
    message: "application may depend only on game-core, game-rules, and protocol",
    disallowed: (module) =>
      module === "react" ||
      module.startsWith("react/") ||
      module.startsWith("@supabase/") ||
      module.includes("adapter-supabase") ||
      module.includes("/ui/") ||
      module.startsWith("../ui") ||
      (module.startsWith("@TBS/") && ![
        "@TBS/game-core",
        "@TBS/game-rules",
        "@TBS/protocol",
      ].includes(module)),
  },
  {
    roots: ["packages/adapter-memory/src", "packages/adapter-supabase/src"],
    excludeFile: (file) => file.endsWith(".test.ts") || file.endsWith(".test.tsx"),
    message: "adapters may depend only on application and protocol workspace packages; rules codecs are injected by composition",
    disallowed: (module) => module.startsWith("@TBS/") && ![
      "@TBS/application",
      "@TBS/protocol",
    ].includes(module),
  },
  {
    roots: ["ui/src"],
    excludeFile: (file) => file.endsWith(".test.ts") || file.endsWith(".test.tsx"),
    message: "UI production source may depend only on application, presentation, setup, and renderer workspace packages",
    disallowed: (module) => module.startsWith("@TBS/") && ![
      "@TBS/adapter-supabase",
      "@TBS/application",
      "@TBS/game-setup",
      "@TBS/presentation",
      "@TBS/renderer-2d",
      "@TBS/renderer-3d",
    ].includes(module),
  },
  {
    roots: ["ui/src"],
    message: "UI source must use application ports and cannot import the Supabase SDK",
    disallowed: (module) => module.startsWith("@supabase/"),
  },
  {
    roots: ["ui/src"],
    except: ["ui/src/composition"],
    excludeFile: (file) => file.endsWith(".test.ts") || file.endsWith(".test.tsx"),
    message: "concrete infrastructure adapters may be imported only by the UI composition root",
    disallowed: (module) => module.startsWith("@TBS/adapter-"),
  },
  {
    roots: ["supabase/functions"],
    message: "Edge Functions may compose core, rules, protocol, and provider clients, but cannot depend on React, UI, or adapters",
    disallowed: (module) =>
      module === "react"
      || module.startsWith("react/")
      || module.includes("/ui/")
      || module.startsWith("@TBS/adapter-")
      || (module.startsWith("@TBS/") && ![
        "@TBS/game-core",
        "@TBS/game-rules",
        "@TBS/protocol",
      ].includes(module)),
  },
];

const normalized = (path) => relative(repositoryRoot, path).split(sep).join("/");
const violations = [];

for (const rule of rules) {
  for (const root of rule.roots) {
    for (const path of await sourceFilesUnder(join(repositoryRoot, root))) {
      const file = normalized(path);
      if (rule.except?.some((allowedRoot) => file === allowedRoot || file.startsWith(`${allowedRoot}/`))) continue;
      if (rule.excludeFile?.(file)) continue;
      const source = await readFile(path, "utf8");
      for (const module of importedModules(source)) {
        if (rule.disallowed(module)) violations.push(`${file}: forbidden import ${JSON.stringify(module)} — ${rule.message}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Architecture boundaries passed.");
}
