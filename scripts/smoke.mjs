/**
 * Проверка, что статика и SEO-разметка реально отдаются сервером.
 *
 *   npm run dev                                  # в одном терминале
 *   node scripts/smoke.mjs                       # в другом (по умолчанию :5173)
 *   npm run preview                              # или собранная версия
 *   node scripts/smoke.mjs http://127.0.0.1:4173/
 *   node scripts/smoke.mjs https://<user>.github.io/<repo>/
 *
 * Понимает и dev-сервер (отдаёт /src/main.tsx), и preview (хэшированный бандл),
 * и живой деплой. Падает с ненулевым кодом, если чего-то не хватает.
 */
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])/.test(base);

const publicFiles = [
  'sw.js',
  'manifest.webmanifest',
  'favicon.svg',
  'robots.txt',
  'sitemap.xml',
  'og.png',
  'icons/icon-192.png',
];

let failures = 0;

async function check(label, url) {
  try {
    const response = await fetch(url);
    const body = await response.text();
    if (!response.ok) failures += 1;
    console.log(`${label.padEnd(30)} ${response.status} ${String(body.length).padStart(7)} bytes`);
    return body;
  } catch (error) {
    failures += 1;
    console.log(`${label.padEnd(30)} FAIL ${error.message}`);
    return '';
  }
}

function expect(label, condition) {
  if (!condition) failures += 1;
  console.log(`${label.padEnd(30)} ${condition ? 'ok' : 'НЕ НАЙДЕНО'}`);
}

const html = await check('index.html', base);

if (html) {
  const dev = html.includes('/src/main.tsx');
  console.log(`режим: ${dev ? 'dev (vite serve)' : 'production build'}`);

  if (dev) {
    for (const module of ['/src/main.tsx', '/src/App.tsx', '/src/components/TodayView.tsx', '/src/styles.css']) {
      const response = await fetch(new URL(module, base));
      const body = await response.text();
      if (!response.ok) failures += 1;
      console.log(`${module.padEnd(30)} ${response.status} ${String(body.length).padStart(7)} bytes`);
    }
  } else {
    const assets = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g)].map((match) => match[1]);
    if (assets.length === 0) {
      console.log('ссылки на бандл не найдены в index.html');
      failures += 1;
    }
    for (const asset of assets) await check(asset, new URL(asset, base));
    expect('относительные пути ассетов', /(?:src|href)="\.\/assets\//.test(html));
  }

  console.log('— SEO —');
  expect('<title>', /<title>.{10,}<\/title>/.test(html));
  expect('meta description', /<meta\s+name="description"\s+content="[^"]{60,}"/.test(html));
  expect('link canonical', /<link\s+rel="canonical"\s+href="https?:\/\/[^"]+"/.test(html));
  expect('og:title / og:description', /property="og:title"/.test(html) && /property="og:description"/.test(html));
  expect('og:image (абсолютный)', /property="og:image"\s+content="https?:\/\/[^"]+"/.test(html));
  expect('twitter:card', /name="twitter:card"\s+content="summary_large_image"/.test(html));
  expect('JSON-LD SoftwareApplication', /application\/ld\+json/.test(html) && /"@type": "SoftwareApplication"/.test(html));

  const ogImage = (html.match(/property="og:image"\s+content="(https?:\/\/[^"]+)"/) || [])[1];
  if (ogImage && !isLocal) await check('og:image', ogImage);
}

for (const file of publicFiles) {
  await check(file, new URL(file, base));
}

console.log(failures === 0 ? '\nSMOKE OK' : `\nSMOKE FAILURES: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
