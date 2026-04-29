import { copyFileSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const indexPath = resolve(root, "index.html");
const index2Path = resolve(root, "index2.html");
const templatePath = resolve(root, "index2.template.html");
const distIndexPath = resolve(root, "dist/index.html");
const distIndex2Path = resolve(root, "dist/index2.html");
const backupIndexPath = resolve(root, ".tmp-index-original.html");
const backupDistIndexPath = resolve(root, ".tmp-dist-index-original.html");

if (!existsSync(templatePath)) {
  throw new Error("Missing index2.template.html");
}

copyFileSync(indexPath, backupIndexPath);
if (existsSync(distIndexPath)) {
  copyFileSync(distIndexPath, backupDistIndexPath);
}

try {
  copyFileSync(templatePath, indexPath);

  const result = spawnSync("vite", ["build"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(`vite build failed with status ${result.status}`);
  }

  if (!existsSync(distIndexPath)) {
    throw new Error("dist/index.html was not generated");
  }

  copyFileSync(distIndexPath, index2Path);
  copyFileSync(distIndexPath, distIndex2Path);
} finally {
  copyFileSync(backupIndexPath, indexPath);
  rmSync(backupIndexPath, { force: true });

  if (existsSync(backupDistIndexPath)) {
    copyFileSync(backupDistIndexPath, distIndexPath);
    rmSync(backupDistIndexPath, { force: true });
  }
}
