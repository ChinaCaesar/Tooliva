import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const vars = {};
  for (const line of readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }

  return vars;
}

/**
 * @param {"development" | "production"} mode
 */
export function resolveAppVersion(mode = "development") {
  const envFile = mode === "production" ? ".env.production" : ".env.development";
  const vars = parseEnvFile(resolve(root, envFile));
  const version = vars.APP_VERSION?.trim();

  if (!version) {
    throw new Error(`APP_VERSION is missing in ${envFile}`);
  }

  return version;
}
