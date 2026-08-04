import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "downloads");
mkdirSync(outputDir, { recursive: true });

const trackedFiles = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean)
  .filter((file) => !file.startsWith("public/downloads/"));

const localFiles = trackedFiles.filter((file) => ![
  ".openai/",
  "build/",
  "deploy/",
  "examples/",
  "worker/",
].some((prefix) => file.startsWith(prefix)) && ![
  "vite.config.ts",
  "wrangler.jsonc",
].includes(file));

const packages = [
  {
    edition: "个人本地版",
    filename: "cabin-workbench-local.zip",
    prefix: "cabin-workbench-local/",
    files: localFiles,
  },
  {
    edition: "多用户服务器版",
    filename: "cabin-workbench-server.zip",
    prefix: "cabin-workbench-server/",
    files: trackedFiles,
  },
];

const commit = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();

const manifest = [];
for (const item of packages) {
  const outputPath = path.join(outputDir, item.filename);
  execFileSync("git", [
    "archive",
    "--format=zip",
    `--prefix=${item.prefix}`,
    `--output=${outputPath}`,
    "HEAD",
    "--",
    ...item.files,
  ], { cwd: root, stdio: "inherit" });
  const size = statSync(outputPath).size;
  manifest.push({ edition: item.edition, filename: item.filename, bytes: size, commit });
  console.log(`${item.edition}：${item.filename} (${(size / 1024 / 1024).toFixed(2)} MB)`);
}

writeFileSync(
  path.join(outputDir, "manifest.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), packages: manifest }, null, 2)}\n`,
);
