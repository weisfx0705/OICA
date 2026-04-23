import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname);
const indexPath = resolve(root, 'index.html');
const templatePath = resolve(root, 'index.template.html');
const distIndexPath = resolve(root, 'dist/index.html');
const backupPath = resolve(root, '.tmp-index-before-build.html');

if (!existsSync(templatePath)) {
  throw new Error('Missing index.template.html');
}

copyFileSync(indexPath, backupPath);

try {
  copyFileSync(templatePath, indexPath);
  mkdirSync(resolve(root, 'dist'), { recursive: true });

  const result = spawnSync('vite', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`vite build failed with status ${result.status}`);
  }

  if (!existsSync(distIndexPath)) {
    throw new Error('dist/index.html was not generated');
  }

  copyFileSync(distIndexPath, indexPath);
} catch (error) {
  copyFileSync(backupPath, indexPath);
  throw error;
} finally {
  rmSync(backupPath, { force: true });
}
