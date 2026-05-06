import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(rootDir, "dist");
const releaseDir = resolve(rootDir, "release");
const packageJson = readJson(resolve(rootDir, "package.json"));
const manifestPath = resolve(distDir, "manifest.json");

if (!existsSync(manifestPath)) {
  fail("dist/manifest.json is missing. Run npm run build before packaging.");
}

const manifest = readJson(manifestPath);
const forbiddenPermissions = ["activeTab", "scripting", "tabs", "alarms"];
const grantedPermissions = manifest.permissions ?? [];
const leakingPermissions = grantedPermissions.filter((permission) => forbiddenPermissions.includes(permission));

if (manifest.manifest_version !== 3) {
  fail("Chrome beta package must use Manifest V3.");
}

if (manifest.version !== packageJson.version) {
  fail(`Manifest version ${manifest.version} does not match package version ${packageJson.version}.`);
}

if (leakingPermissions.length > 0) {
  fail(`Manifest includes production-risk permissions: ${leakingPermissions.join(", ")}.`);
}

for (const requiredFile of ["content.js", "popup.html", "icons/icon-128.png"]) {
  if (!existsSync(resolve(distDir, requiredFile))) {
    fail(`dist/${requiredFile} is missing from the build output.`);
  }
}

mkdirSync(releaseDir, { recursive: true });
const zipPath = resolve(releaseDir, `canvasbuddy-chrome-beta-${packageJson.version}.zip`);

if (existsSync(zipPath)) {
  rmSync(zipPath);
}

run("zip", ["-qr", zipPath, ".", "-x", "*.DS_Store", "__MACOSX/*"], distDir);

const listing = spawnSync("unzip", ["-l", zipPath], { encoding: "utf8" });
if (listing.status !== 0) {
  fail("Created zip, but could not inspect it with unzip -l.");
}

if (!listing.stdout.split("\n").some((line) => /\smanifest\.json$/.test(line))) {
  fail("Upload zip does not contain manifest.json at the archive root.");
}

console.log(`Chrome beta package ready: ${zipPath}`);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
