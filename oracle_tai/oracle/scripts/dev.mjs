import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname);
const indexPath = resolve(root, 'index.html');
const templatePath = resolve(root, 'index.template.html');
const backupPath = resolve(root, '.tmp-index-before-dev.html');

if (!existsSync(templatePath)) {
  throw new Error('Missing index.template.html');
}

copyFileSync(indexPath, backupPath);
copyFileSync(templatePath, indexPath);

const child = spawn('vite', [], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const restore = () => {
  if (existsSync(backupPath)) {
    copyFileSync(backupPath, indexPath);
    rmSync(backupPath, { force: true });
  }
};

child.on('exit', (code, signal) => {
  restore();
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});
