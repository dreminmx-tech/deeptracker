/**
 * Проверка, что статика реально отдаётся сервером.
 *
 *   npm run dev                                  # в одном терминале
 *   node scripts/smoke.mjs                       # в другом (по умолчанию :5173)
 *   npm run preview                              # или собранная версия
 *   node scripts/smoke.mjs http://127.0.0.1:4173/
 *
 * Понимает и dev-сервер (отдаёт /src/main.tsx), и preview (хэшированный бандл).
 */
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const publicFiles = ['sw.js', 'manifest.webmanifest', 'favicon.svg', 'icons/icon-192.png'];

let failures = 0;

async function check(label, url) {
  try {
    const response = await fetch(url);
    const body = await response.text();
    if (!response.ok) failures += 1;
    console.log(`${label.padEnd(28)} ${response.status} ${String(body.length).padStart(7)} bytes`);
    return body;
  } catch (error) {
    failures += 1;
    console.log(`${label.padEnd(28)} FAIL ${error.message}`);
    return '';
  }
}

const html = await check('index.html', base);
if (html) {
  const dev = html.includes('/src/main.tsx');
  const preview = html.match(/(?:src|href)="\.\/(assets\/[^"]+)"/);
  console.log(`режим: ${dev ? 'dev (vite serve)' : 'production build'}`);

  if (dev) {
    for (const module of ['/src/main.tsx', '/src/App.tsx', '/src/components/TodayView.tsx', '/src/styles.css']) {
      const response = await fetch(new URL(module, base));
      const body = await response.text();
      if (!response.ok) failures += 1;
      console.log(`${module.padEnd(28)} ${response.status} ${String(body.length).padStart(7)} bytes`);
    }
  } else if (preview) {
    await check(preview[1], new URL(preview[1], base));
  } else {
    console.log('ссылка на бандл не найдена в index.html');
    failures += 1;
  }
}

for (const file of publicFiles) {
  await check(file, new URL(file, base));
}

console.log(failures === 0 ? '\nSMOKE OK' : `\nSMOKE FAILURES: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
