import { readFileSync } from "node:fs";
import { join } from "node:path";

let cached: string | null = null;

export function loadAgroAgentInstructions(): string {
  if (cached) {
    return cached;
  }
  cached = readFileSync(
    join(process.cwd(), "src/agents/agro-agent/instructions.md"),
    "utf8",
  );
  return cached;
}
