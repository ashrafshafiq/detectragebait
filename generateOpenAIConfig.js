// Simple build helper to copy values from .env into an ES module
// that the Chrome extension can import at runtime.
//
// Usage:
//   node generateOpenAIConfig.js
//
// This will read OPENAI_API_KEY and OPENAI_API_BASE_URL from .env
// in the project root and write them into openaiConfig.js.

const fs = require("fs");
const path = require("path");

function loadEnv(filePath) {
  const env = {};

  if (!fs.existsSync(filePath)) {
    console.warn("[DRB] .env file not found at", filePath);
    return env;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function generateConfig() {
  const rootDir = process.cwd();
  const envPath = path.join(rootDir, ".env");
  const env = loadEnv(envPath);

  const apiKey = env.OPENAI_API_KEY || "";
  const baseUrl = env.OPENAI_API_BASE_URL || "https://api.openai.com/v1";

  const output = [
    "// This file is generated from .env by generateOpenAIConfig.js",
    "// Do not commit real secrets to version control if you publish this extension.",
    "",
    `export const OPENAI_API_KEY = ${JSON.stringify(apiKey)};`,
    `export const OPENAI_API_BASE_URL = ${JSON.stringify(baseUrl)};`,
    "",
  ].join("\n");

  const outPath = path.join(rootDir, "openaiConfig.js");
  fs.writeFileSync(outPath, output, { encoding: "utf8" });
  console.log("[DRB] Wrote", outPath);
}

generateConfig();

