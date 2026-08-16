import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "downloads");
mkdirSync(outputDir, { recursive: true });

const releaseVersion = process.env.PACKAGE_VERSION || new Date().toISOString().slice(0, 10).replaceAll("-", "");

const trackedFiles = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean)
  .filter((file) => !file.startsWith("public/downloads/"));

// The embedded Pindou HTML is intentionally kept outside Git for now, but it is
// part of the public workbench release. Other untracked local assets stay out.
const publicReleaseExtras = ["public/pindou/index.html"]
  .filter((file) => existsSync(path.join(root, file)));

const releaseFiles = [...new Set([...trackedFiles, ...publicReleaseExtras])];

const localFiles = releaseFiles.filter((file) => ![
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
    filename: `cabin-workbench-local-${releaseVersion}.zip`,
    files: localFiles,
  },
  {
    edition: "多用户服务器版",
    filename: `cabin-workbench-server-${releaseVersion}.zip`,
    files: releaseFiles,
  },
];

const commit = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();

const manifest = [];
for (const item of packages) {
  const outputPath = path.join(outputDir, item.filename);
  if (existsSync(outputPath)) {
    throw new Error(`下载包已存在，请更换 PACKAGE_VERSION：${item.filename}`);
  }
  execFileSync("zip", ["-q", outputPath, ...item.files], { cwd: root, stdio: "inherit" });
  const size = statSync(outputPath).size;
  manifest.push({ edition: item.edition, filename: item.filename, bytes: size, commit, releaseVersion });
  console.log(`${item.edition}：${item.filename} (${(size / 1024 / 1024).toFixed(2)} MB)`);
}

writeFileSync(
  path.join(outputDir, `manifest-${releaseVersion}.json`),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), releaseVersion, packages: manifest }, null, 2)}\n`,
);
