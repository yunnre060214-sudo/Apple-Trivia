import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('dialog rules override native modal width caps and explicitly anchor mobile sheets', async () => {
  const css = await readFile(new URL('../assets/style.css', import.meta.url), 'utf8');
  const rules = [...css.matchAll(/(?:^|\n)\s*dialog\s*\{([^}]+)\}/g)].map(m => m[1]);
  assert.equal(rules.length, 2);
  assert.match(rules[0], /position:fixed;/);
  assert.match(rules[0], /inset:0;/);
  assert.match(rules[0], /max-width:none;/);
  assert.match(rules[0], /margin:auto;/);
  assert.match(rules[1], /inset:auto 0 0;/);
  assert.match(rules[1], /width:100%;/);
  assert.match(rules[1], /margin:0 auto;/);
  assert.match(rules[1], /env\(safe-area-inset-bottom\)/);
});

test('Safari canvas uses committed browser state while the captured page uses the new appearance', async () => {
  const css = await readFile(new URL('../assets/style.css', import.meta.url), 'utf8');
  const rule = selector => css.slice(css.indexOf(`${selector} {`) + selector.length + 2).split('}')[0];
  assert.match(rule(':root'), /color-scheme:light;/);
  assert.match(rule(':root'), /--browser-bg:#f5f4f0;/);
  assert.match(rule(':root[data-browser-theme=dark]'), /color-scheme:dark; --browser-bg:#080d1b;/);
  for (const selector of ['html','body']) {
    assert.match(rule(selector), /background:var\(--browser-bg\);/);
    assert.doesNotMatch(rule(selector), /background:var\(--bg\);/);
  }
  assert.match(rule(':is(#site-content,[data-theme-copy-id=site-content])'), /background:var\(--bg\); color-scheme:var\(--page-scheme\);/);
  assert.match(rule('[data-theme=dark]'), /--page-scheme:dark;/);
  assert.doesNotMatch(rule('[data-theme=dark]'), /(?:^|[;\s])color-scheme:/);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /dataset\.browserTheme = dark \? 'dark' : 'light';/);
  const app = await readFile(new URL('../assets/app.mjs', import.meta.url), 'utf8');
  assert.match(app, /if\(syncChrome&&!document\.documentElement\.classList\.contains\('theme-revealing'\)\)syncBrowserTheme\(theme\);/);
});
