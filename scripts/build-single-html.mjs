import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const indexPath = path.join(rootDir, 'index.html');
const tailwindPath = path.join(rootDir, 'css', 'tailwind.min.css');
const stylePath = path.join(rootDir, 'css', 'style.css');
const jsDir = path.join(rootDir, 'js');

const moduleOrder = [
  'config.js',
  'model.js',
  'store.js',
  'centrifuge.js',
  'gestures.js',
  'labView.js',
  'main.js',
];

function stripModuleSyntax(code) {
  return code
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+(?=(?:const|let|var|function|class)\b)/gm, '')
    .trim();
}

const tailwindCss = fs.readFileSync(tailwindPath, 'utf8').trim();
const customCss = fs.readFileSync(stylePath, 'utf8').trim();
const bundledJs = [
  '(function () {',
  ...moduleOrder.map((file) => {
    const raw = fs.readFileSync(path.join(jsDir, file), 'utf8');
    return `// --- ${file} ---\n${stripModuleSyntax(raw)}`;
  }),
  '})();',
].join('\n\n');

let html = fs.readFileSync(indexPath, 'utf8');

// Replace external CSS links (or existing inlined style block)
const linkPattern = /  <link rel="stylesheet" href="\.\/css\/tailwind\.min\.css" \/>\r?\n  <link rel="stylesheet" href="\.\/css\/style\.css" \/>/;
const inlinedStylePattern = /  <style data-inlined-bundle>[\s\S]*?<\/style>/;
const styleBlock = `  <style data-inlined-bundle>\n${tailwindCss}\n${customCss}\n  </style>`;

if (linkPattern.test(html)) {
  html = html.replace(linkPattern, styleBlock);
} else if (inlinedStylePattern.test(html)) {
  html = html.replace(inlinedStylePattern, styleBlock);
} else {
  throw new Error('Could not find CSS links or inlined style block in index.html');
}

// Replace external module script (or existing inlined script block)
const scriptTagPattern = /  <script type="module" src="\.\/js\/main\.js"><\/script>/;
const inlinedScriptPattern = /  <script data-inlined-bundle>[\s\S]*?<\/script>/;
const scriptBlock = `  <script data-inlined-bundle>\n${bundledJs}\n  </script>`;

if (scriptTagPattern.test(html)) {
  html = html.replace(scriptTagPattern, scriptBlock);
} else if (inlinedScriptPattern.test(html)) {
  html = html.replace(inlinedScriptPattern, scriptBlock);
} else {
  throw new Error('Could not find main.js script tag or inlined script block in index.html');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log(`Bundled single-file index.html (${Buffer.byteLength(html, 'utf8')} bytes).`);
