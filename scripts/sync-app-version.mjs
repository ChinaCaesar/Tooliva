import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAppVersion } from "./read-app-version.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const mode = process.argv.includes("--production") ? "production" : "development";
const appVersion = resolveAppVersion(mode);

const packageJsonPath = resolve(root, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
packageJson.version = appVersion;
writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf-8");

const cargoTomlPath = resolve(root, "src-tauri", "Cargo.toml");
const cargoToml = readFileSync(cargoTomlPath, "utf-8");
const versionLine = `version = "${appVersion}"`;
const nextCargoToml = cargoToml.replace(
  /^version\s*=\s*"[^"]*"\r?$/m,
  versionLine,
);
if (!/^version\s*=\s*"[^"]*"\r?$/m.test(cargoToml)) {
  throw new Error("Failed to locate [package].version in src-tauri/Cargo.toml");
}
if (nextCargoToml !== cargoToml) {
  writeFileSync(cargoTomlPath, nextCargoToml, "utf-8");
}

console.log(`[sync-app-version] APP_VERSION=${appVersion} (${mode})`);
