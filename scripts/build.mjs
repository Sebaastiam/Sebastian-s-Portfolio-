/**
 * Production build for the static portfolio site.
 *
 * What this does:
 *   - Mirrors the existing source layout (index.html, landing/, panels/,
 *     loadscreen/, photowall/, scroll/, fonts/) into dist/ with the SAME
 *     relative paths, so every <link>/<script src> in index.html keeps
 *     working unmodified — no path rewriting, no bundling, no framework.
 *   - Minifies HTML (html-minifier-terser), CSS (PostCSS: autoprefixer +
 *     cssnano) and JS (esbuild), stripping comments from the output only.
 *   - Emits external source maps for CSS/JS so production issues can still
 *     be debugged against the original source, without bloating the
 *     shipped files (maps are only fetched when devtools is open).
 *   - Copies fonts (and any other binary assets) through unchanged — they
 *     are already in an optimized, pre-compressed format (WOFF2), so
 *     re-encoding them would add risk for no benefit ("optimize where
 *     safe" -> skip re-encoding safe/optimal formats).
 *   - Never touches anything under docs/ or the original source files.
 *     dist/ is the only thing this script writes to.
 */

import { readFile, writeFile, mkdir, readdir, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';
import postcss from 'postcss';
import { minify as minifyHtml } from 'html-minifier-terser';
import { plugins as postcssPlugins } from '../postcss.config.js';

const rootDir = path.resolve(fileURLToPath(import.meta.url), '../..');
const distDir = path.join(rootDir, 'dist');

// Everything that makes up the deployed site today. Intentionally explicit
// (rather than "copy everything") so build tooling, docs/, and repo config
// can never accidentally leak into the production bundle.
const SOURCE_ENTRIES = [
  'index.html',
  'landing',
  'panels',
  'loadscreen',
  'photowall',
  'scroll',
  'fonts',
];

const FONT_EXTENSIONS = new Set(['.woff2', '.woff', '.ttf', '.otf', '.eot']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico']);

const stats = { html: 0, css: 0, js: 0, copied: 0, bytesBefore: 0, bytesAfter: 0 };

async function listFilesRecursively(entryPath) {
  const entryStat = await stat(entryPath);
  if (entryStat.isFile()) return [entryPath];

  const out = [];
  const items = await readdir(entryPath, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(entryPath, item.name);
    if (item.isDirectory()) {
      out.push(...(await listFilesRecursively(full)));
    } else {
      out.push(full);
    }
  }
  return out;
}

async function ensureDirFor(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function buildHtml(srcPath, outPath) {
  const src = await readFile(srcPath, 'utf8');
  const out = await minifyHtml(src, {
    collapseWhitespace: true,
    conservativeCollapse: false,
    removeComments: true,
    removeEmptyAttributes: false,
    minifyCSS: true,
    minifyJS: true,
    keepClosingSlash: true,
    caseSensitive: true,
  });
  await ensureDirFor(outPath);
  await writeFile(outPath, out, 'utf8');
  stats.html += 1;
  stats.bytesBefore += Buffer.byteLength(src);
  stats.bytesAfter += Buffer.byteLength(out);
}

async function buildCss(srcPath, outPath) {
  const src = await readFile(srcPath, 'utf8');
  const mapOutPath = `${outPath}.map`;

  const result = await postcss(postcssPlugins).process(src, {
    from: srcPath,
    to: outPath,
    map: { inline: false, annotation: path.basename(mapOutPath) },
  });

  await ensureDirFor(outPath);
  await writeFile(outPath, result.css, 'utf8');
  if (result.map) {
    await writeFile(mapOutPath, result.map.toString(), 'utf8');
  }
  stats.css += 1;
  stats.bytesBefore += Buffer.byteLength(src);
  stats.bytesAfter += Buffer.byteLength(result.css);
}

async function buildJs(srcPath, outPath, relPath) {
  const src = await readFile(srcPath, 'utf8');
  const mapFileName = `${path.basename(outPath)}.map`;

  // transform() (not build/bundle) is used deliberately: these are plain
  // browser <script> files that share the global scope (e.g. config.js
  // defines CONFIG, other files read it). Bundling or IIFE-wrapping would
  // change that architecture; transform() only minifies in place.
  const result = await esbuild.transform(src, {
    loader: 'js',
    minify: true,
    legalComments: 'none',
    sourcemap: 'external',
    sourcefile: relPath,
    target: ['es2019'],
  });

  const code = `${result.code}//# sourceMappingURL=${mapFileName}\n`;

  await ensureDirFor(outPath);
  await writeFile(outPath, code, 'utf8');
  await writeFile(`${outPath}.map`, result.map, 'utf8');
  stats.js += 1;
  stats.bytesBefore += Buffer.byteLength(src);
  stats.bytesAfter += Buffer.byteLength(code);
}

async function copyAsIs(srcPath, outPath) {
  await ensureDirFor(outPath);
  const buf = await readFile(srcPath);
  await writeFile(outPath, buf);
  stats.copied += 1;
  stats.bytesBefore += buf.length;
  stats.bytesAfter += buf.length;
}

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  for (const entry of SOURCE_ENTRIES) {
    const entryPath = path.join(rootDir, entry);
    let files;
    try {
      files = await listFilesRecursively(entryPath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.warn(`[build] skipping missing source entry: ${entry}`);
        continue;
      }
      throw err;
    }

    for (const srcPath of files) {
      const relPath = path.relative(rootDir, srcPath);
      const outPath = path.join(distDir, relPath);
      const ext = path.extname(srcPath).toLowerCase();

      if (ext === '.html') {
        await buildHtml(srcPath, outPath);
      } else if (ext === '.css') {
        await buildCss(srcPath, outPath);
      } else if (ext === '.js') {
        await buildJs(srcPath, outPath, relPath);
      } else if (FONT_EXTENSIONS.has(ext) || IMAGE_EXTENSIONS.has(ext)) {
        // Fonts are shipped as WOFF2 (already compressed) and there are no
        // raster/vector images in the current source — nothing unsafe to
        // re-encode, so these pass through untouched.
        await copyAsIs(srcPath, outPath);
      } else {
        console.warn(`[build] unrecognized file type, copying as-is: ${relPath}`);
        await copyAsIs(srcPath, outPath);
      }
    }
  }

  // Prevents GitHub Pages' default Jekyll processing from touching the
  // output (e.g. ignoring/renaming files that start with an underscore).
  // Harmless for a plain static site and a standard safeguard for the
  // GitHub Actions "deploy dist/ as-is" workflow.
  await writeFile(path.join(distDir, '.nojekyll'), '');

  const saved = stats.bytesBefore ? (1 - stats.bytesAfter / stats.bytesBefore) * 100 : 0;
  console.log('\n[build] done.');
  console.log(
    `  html: ${stats.html}  css: ${stats.css}  js: ${stats.js}  copied: ${stats.copied}`
  );
  console.log(
    `  ${stats.bytesBefore.toLocaleString()} bytes -> ${stats.bytesAfter.toLocaleString()} bytes ` +
      `(${saved.toFixed(1)}% smaller)`
  );
  console.log(`  output: ${path.relative(process.cwd(), distDir)}/`);
}

main().catch((err) => {
  console.error('[build] failed:', err);
  process.exitCode = 1;
});
