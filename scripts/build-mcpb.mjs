import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stage = join(root, ".mcpb-stage");
const output = join(root, "dist", "deputy-workforce-mcp.mcpb");

rmSync(stage, { force: true, recursive: true });
rmSync(output, { force: true });
mkdirSync(stage, { recursive: true });

try {
  for (const source of ["package.json", "pnpm-lock.yaml"]) {
    cpSync(join(root, source), join(stage, source));
  }
  cpSync(join(root, "dist"), join(stage, "dist"), {
    filter: (source) => source !== stage,
    recursive: true,
  });
  cpSync(join(root, "mcpb", "manifest.json"), join(stage, "manifest.json"));

  execFileSync("pnpm", [
    "install",
    "--dir",
    stage,
    "--prod",
    "--frozen-lockfile",
    "--node-linker=hoisted",
  ], { stdio: "inherit" });
  execFileSync("pnpm", [
    "dlx",
    "@anthropic-ai/mcpb@2.1.2",
    "pack",
    stage,
    output,
  ], { cwd: root, stdio: "inherit" });

  if (!existsSync(output)) {
    throw new Error(`MCPB output was not created at ${output}`);
  }
} finally {
  rmSync(stage, { force: true, recursive: true });
}
