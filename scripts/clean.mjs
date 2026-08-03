import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(fileURLToPath(import.meta.url), '../..');
const distDir = path.join(rootDir, 'dist');

await rm(distDir, { recursive: true, force: true });
console.log('[clean] removed dist/');
