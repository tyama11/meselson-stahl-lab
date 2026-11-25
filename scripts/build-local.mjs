import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';

const rootDir = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(rootDir, 'src');
const outDir = path.join(rootDir, 'js');

fs.mkdirSync(outDir, { recursive: true });

for (const entry of fs.readdirSync(srcDir)) {
  if (!entry.endsWith('.ts') || entry === 'types.ts') continue;

  const srcPath = path.join(srcDir, entry);
  const tsSource = fs.readFileSync(srcPath, 'utf8');
  let jsSource = stripTypeScriptTypes(tsSource, { mode: 'strip' });

  // Rewrite relative `.ts` module specifiers to `.js`
  jsSource = jsSource.replace(
    /((?:from|import)\s+['"]\.\/[^'"]+)\.ts(['"])/g,
    '$1.js$2'
  );

  // Clean up blank lines left by stripped `import type` blocks
  jsSource = jsSource.replace(/^\s*\n(?=\s*\n)/gm, '');

  const outPath = path.join(outDir, entry.replace(/\.ts$/, '.js'));
  fs.writeFileSync(outPath, jsSource, 'utf8');
}

console.log('Emitted js/*.js from src/*.ts via Node stripTypeScriptTypes.');
