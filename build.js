// Build script for Disagall Viewer using esbuild
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const USERSCRIPT_BANNER = `// ==UserScript==
// @name         디시 사진 뷰어 (Disagall Viewer - Safari / Tampermonkey)
// @namespace    https://gall.dcinside.com/
// @version      1.1.0
// @description  디시인사이드 게시글 사진을 화면에 맞춰 원본 화질 그대로 감상하는 유저스크립트 (Safari 지원)
// @author       Beomjun Kim
// @match        https://gall.dcinside.com/*
// @match        https://*.dcinside.com/*
// @run-at       document-end
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==
`;

const EXTENSION_ASSETS = [
  'manifest.json',
  'background.js',
  'content.js',
  'content.css',
  'popup.html',
  'popup.js',
  'icon16.png',
  'icon48.png',
  'icon128.png',
];

function syncSafariResources(rootDir) {
  const safariResourcesDir = path.join(
    rootDir,
    'safari_extension',
    'DisagallViewerSafari',
    'DisagallViewerSafari Extension',
    'Resources'
  );
  if (!fs.existsSync(safariResourcesDir)) return;

  for (const asset of EXTENSION_ASSETS) {
    const srcPath = path.join(rootDir, asset);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(safariResourcesDir, asset));
    }
  }
  console.log('✅ Synced Safari Extension Resources:', safariResourcesDir);
}

const BUILD_TARGETS = ['chrome100', 'firefox100', 'safari15'];
const EXTENSION_BANNER = '// Disagall Viewer - Content Script for DC Inside (Built from src/)\n\n';

async function buildExtensionBundle(rootDir) {
  const extResult = await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/extension.js')],
    bundle: true,
    format: 'iife',
    target: BUILD_TARGETS,
    write: false,
  });

  const extOutput = extResult.outputFiles[0].text;
  fs.writeFileSync(path.join(rootDir, 'content.js'), EXTENSION_BANNER + extOutput, 'utf8');
  console.log('✅ Generated Chrome Extension script: content.js');
}

async function buildUserscriptBundle(rootDir, cssContent) {
  const userResult = await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/userscript.js')],
    bundle: true,
    format: 'iife',
    target: BUILD_TARGETS,
    define: {
      '__INJECTED_CSS__': JSON.stringify(cssContent)
    },
    write: false,
  });

  const userOutput = userResult.outputFiles[0].text;
  fs.writeFileSync(path.join(rootDir, 'disagall_viewer.user.js'), USERSCRIPT_BANNER + '\n' + userOutput, 'utf8');
  console.log('✅ Generated Userscript: disagall_viewer.user.js');
}

async function build() {
  const rootDir = __dirname;
  const cssPath = path.join(rootDir, 'content.css');
  const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

  console.log('📦 Building Disagall Viewer with esbuild...');
  await buildExtensionBundle(rootDir);
  await buildUserscriptBundle(rootDir, cssContent);
  syncSafariResources(rootDir);
  console.log('🎉 Build completed successfully!');
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
