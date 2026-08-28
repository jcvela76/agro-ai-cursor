import { readFileSync } from "node:fs";
import { join } from "node:path";

let cached: string | null = null;

const instructionsPath = join(process.cwd(), "src/agents/agro-agent/instructions.md");

export function loadAgroAgentInstructions(): string {
  if (process.env.NODE_ENV === "production" && cached) {
    return cached;
  }
  const text = readFileSync(instructionsPath, "utf8");
  if (process.env.NODE_ENV === "production") {
    cached = text;
  }
  return text;
}

/** Test helper — clears production cache. */
export function clearAgroAgentInstructionsCache(): void {
  cached = null;
}
