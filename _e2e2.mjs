/** Temporary e2e: статистика двумя списками, кнопка внутри поля, меню при наборе, воздух в журнале. */
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 9800 + Math.floor(Math.random() * 150);
const BASE = process.argv[2] ?? 'http://127.0.0.1:4173/';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
const profile = join(tmpdir(), `ds-e2e2-${Date.now()}`);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-extensions', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

class Cdp {
  constructor(socket) { this.socket = socket; this.id = 0; this.pending = new Map(); this.handlers = new Map(); socket.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && this.pending.has(m.id)) { const { done, fail } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? fail(new Error(m.error.message)) : done(m.result); } else if (m.method) { for (const h of this.handlers.get(m.method) ?? []) h(m.params); } }); }
  send(method, params = {}) { this.id += 1; return new Promise((done, fail) => { this.pending.set(this.id, { done, fail }); this.socket.send(JSON.stringify({ id: this.id, method, params })); }); }
  once(method) { return new Promise((done) => { if (!this.handlers.has(method)) this.handlers.set(method, new Set()); const l = (p) => { this.handlers.get(method).delete(l); done(p); }; this.handlers.get(method).add(l); }); }
}

async function endpoint(url, attempts = 60) { for (let i = 0; i < attempts; i += 1) { try { const r = await fetch(url); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error(`no ${url}`); }

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = dayKey(new Date());
const created = new Date(Date.now() - 20 * 86400000).toISOString();
const days = {};
for (let i = 0; i < 6; i += 1) {
  const d = new Date(Date.now() - i * 86400000);
  days[dayKey(d)] = { entries: { h1: { done: true, value: 1 }, h2: { done: true, value: 1 } }, dump: [] };
}
const seed = { version: 1, habits: [
  { id: 'h1', name: 'Выпить таблетки', kind: 'check', pinned: true, createdAt: created, order: 0 },
  { id: 'h2', name: 'Вода', kind: 'check', createdAt: created, order: 1 },
  { id: 'h3', name: 'Не листать телефон в постели', kind: 'negative', createdAt: created, order: 2 },
], days, journal: {}, drafts: {}, settings: { lang: 'ru', theme: 'dark' } };

let checks = 0;
let failures = 0;
function expect(label, value, wanted = true) {
  checks += 1;
  const ok = value === wanted;
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : ` — got ${JSON.stringify(value)}, wanted ${JSON.stringify(wanted)}`}`);
}

let socket;
try {
  await endpoint(`http://127.0.0.1:${PORT}/json/version`);
  const targets = await endpoint(`http://127.0.0.1:${PORT}/json/list`);
  socket = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((d, f) => { socket.addEventListener('open', d, { once: true }); socket.addEventListener('error', f, { once: true }); });
  const cdp = new Cdp(socket);
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('deeptracker.v1', ${JSON.stringify(JSON.stringify(seed))}); } catch (e) {}` });

  async function go(hash) {
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: `${BASE}#${hash}` });
    try { await Promise.race([loaded, sleep(2500)]); } catch { /* уже загружено */ }
    const again = cdp.once('Page.loadEventFired');
    await cdp.send('Page.reload');
    await Promise.race([again, sleep(15000).then(() => { throw new Error(`страница не загрузилась: ${hash}`); })]);
    await sleep(700);
  }
  async function js(expression) {
    const out = await Promise.race([
      cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }),
      sleep(20000).then(() => { throw new Error('Runtime.evaluate не ответил :: ' + expression.slice(0, 80)); }),
    ]);
    if (out.exceptionDetails) throw new Error(out.exceptionDetails.text + ' :: ' + expression.slice(0, 100));
    return out.result.value;
  }

  // ---------- статистика ----------
  await go('stats');
  const stats = JSON.parse(await js(`(() => {
    const labels = [...document.querySelectorAll('.block .label')].map(e => e.textContent);
    const html = document.querySelector('.stack').innerHTML;
    const rowNames = [...document.querySelectorAll('.hstat-name')].map(e => e.textContent);
    return JSON.stringify({ labels, rowNames,
      doIdx: html.indexOf('>Делать<'), dontIdx: html.indexOf('>Не делать<'),
      usefulIdx: html.indexOf('Выпить таблетки'), banIdx: html.indexOf('Не листать'),
      streakOfBan: document.querySelectorAll('.hstat-streak')[2]?.textContent ?? '' });
  })()`));
  expect('подписи блоков', JSON.stringify(stats.labels), JSON.stringify(['Эта неделя', 'По привычкам', 'Делать', 'Не делать']));
  expect('строки в списке', JSON.stringify(stats.rowNames), JSON.stringify(['Выпить таблетки', 'Вода', 'Не листать телефон в постели']));
  expect('«Делать» перед полезными', stats.doIdx < stats.usefulIdx, true);
  expect('полезные перед «Не делать»', stats.usefulIdx < stats.dontIdx, true);
  expect('«Не делать» перед запретом', stats.dontIdx < stats.banIdx, true);
  expect('у запрета та же серия', stats.streakOfBan.includes('серия'), true);
  console.log('   · статистика:', JSON.stringify(stats.labels), stats.streakOfBan);

  // ---------- настройки: контролы 44px ----------
  await go('settings');
  const settings = JSON.parse(await js(`(() => {
    const groups = [...document.querySelectorAll('.set-row .segmented')];
    const heights = groups.map(g => Math.round(g.querySelector('button').getBoundingClientRect().height));
    const exportH = Math.round([...document.querySelectorAll('.btn-row .btn')].find(b => b.textContent.includes('Скачать JSON')).getBoundingClientRect().height);
    const inner = groups.map(g => [...g.querySelectorAll('button')].map(b => b.textContent));
    return JSON.stringify({ heights, exportH, inner, version: [...document.querySelectorAll('.muted.small.center')].map(e => e.textContent).join('') });
  })()`));
  expect('язык и тема 44px', JSON.stringify(settings.heights), JSON.stringify([44, 44]));
  expect('как кнопки данных', settings.heights[0], settings.exportH);
  expect('подписи тем', JSON.stringify(settings.inner[1]), JSON.stringify(['Тёмная', 'Светлая']));
  expect('версия 0.9.1', settings.version.includes('0.9.1'), true);

  // ---------- быстрые дела: кнопка внутри поля ----------
  await go('today');
  const field = JSON.parse(await js(`(() => {
    const field = document.querySelector('.dump-field');
    const input = field.querySelector('input');
    const button = field.querySelector('.dump-send');
    const fr = field.getBoundingClientRect(), ir = input.getBoundingClientRect(), br = button.getBoundingClientRect();
    const bs = getComputedStyle(button);
    return JSON.stringify({
      inside: field.contains(button), fieldH: Math.round(fr.height), inputH: Math.round(ir.height),
      buttonW: Math.round(br.width), buttonH: Math.round(br.height),
      rightGap: Math.round(ir.right - br.right), bottomGap: Math.round(ir.bottom - br.bottom),
      visibility: bs.visibility, radius: bs.borderRadius, bg: bs.backgroundColor,
      hiddenWhenEmpty: bs.visibility === 'hidden', label: button.getAttribute('aria-label'),
      inputRightPad: getComputedStyle(input).paddingRight, placeholder: input.placeholder,
    });
  })()`));
  expect('кнопка внутри поля', field.inside, true);
  expect('поле 44px', field.inputH, 44);
  expect('кнопка меньше поля', field.buttonH < field.inputH, true);
  expect('кнопка в правом нижнем углу (4px)', JSON.stringify([field.rightGap, field.bottomGap]), JSON.stringify([4, 4]));
  expect('пустое поле прячет кнопку', field.hiddenWhenEmpty, true);
  expect('подпись кнопки', field.label, 'Добавить');
  expect('под полем текста хватает кнопке', parseFloat(field.inputRightPad) >= 48, true);
  console.log('   · поле:', JSON.stringify(field));

  await js(`(() => { const i = document.querySelector('.dump-form input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'Проверка'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(200);
  expect('кнопка появилась с текстом', await js(`getComputedStyle(document.querySelector('.dump-send')).visibility`), 'visible');
  await js(`document.querySelector('.dump-send').click()`);
  await sleep(250);
  expect('дело добавлено', await js(`!![...document.querySelectorAll('.dump-text')].find(e => e.textContent === 'Проверка')`), true);
  expect('поле очищено', await js(`document.querySelector('.dump-form input').value`), '');
  expect('кнопка снова скрыта', await js(`getComputedStyle(document.querySelector('.dump-send')).visibility`), 'hidden');

  // меню уезжает, пока пишем в «быстрых делах» (клик мышью — как палец)
  const dumpRect = JSON.parse(await js(`(() => { const r = document.querySelector('.dump-form input').getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); })()`));
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dumpRect.x, y: dumpRect.y, button: 'left', clickCount: 1, buttons: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dumpRect.x, y: dumpRect.y, button: 'left', clickCount: 1, buttons: 0 });
  await sleep(350);
  const typing = JSON.parse(await js(`(() => { const tabs = getComputedStyle(document.querySelector('.tabs')); const app = getComputedStyle(document.querySelector('.app')); const input = document.querySelector('.dump-form input').getBoundingClientRect(); return JSON.stringify({ typing: document.documentElement.dataset.typing ?? 'нет', tabs: tabs.opacity, appPad: app.paddingBottom, inputBottom: Math.round(input.bottom), vh: Math.round(window.innerHeight) }); })()`));
  expect('режим набора включился', typing.typing, 'true');
  expect('меню уехало', typing.tabs, '0');
  expect('поле ещё на экране', typing.inputBottom < typing.vh, true);
  console.log('   · набор:', JSON.stringify(typing));
  // текст, введённый с клавиатуры, доходит до React
  await cdp.send('Input.insertText', { text: 'С клавиатуры' });
  await sleep(250);
  expect('текст с клавиатуры на месте', await js(`document.querySelector('.dump-form input').value`), 'С клавиатуры');
  expect('кнопка появилась', await js(`getComputedStyle(document.querySelector('.dump-send')).visibility`), 'visible');
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape', code: 'Escape' });
  await js(`document.querySelector('.dump-form input').blur()`);
  await sleep(350);
  expect('меню вернулось', await js(`getComputedStyle(document.querySelector('.tabs')).opacity`), '1');
  expect('режим набора снят', await js(`document.documentElement.dataset.typing ?? 'нет'`), 'нет');

  // ---------- журнал: 12px воздуха ----------
  await go('journal');
  const journal = JSON.parse(await js(`(() => {
    const barEl = document.querySelector('.jbar');
    const bar = barEl.getBoundingClientRect();
    const tabs = document.querySelector('.tabs').getBoundingClientRect();
    const box = document.querySelector('.jcomposer-box').getBoundingClientRect();
    const bs = getComputedStyle(barEl);
    return JSON.stringify({
      barTop: bar.top, barBottom: bar.bottom, barLeft: bar.left, barRight: bar.right, barH: bar.height,
      boxTop: box.top, boxBottom: box.bottom, boxH: box.height,
      tabsTop: tabs.top, tabsBottom: tabs.bottom, tabsH: tabs.height,
      padTop: bs.paddingTop, padBottom: bs.paddingBottom, gapRow: bs.rowGap, display: bs.display,
      bgGap: Math.round(tabs.top - bar.bottom), boxToBarBottom: Math.round(bar.bottom - box.bottom),
      boxBottom: box.bottom, tabsTop: tabs.top,
    });
  })()`));
  console.log('   · журнал:', JSON.stringify(journal));
  expect('фон панели не ниже меню', journal.bgGap >= 10, true);
  expect('под коробкой внутри панели 8px', journal.boxToBarBottom, 8);
  expect('воздух до меню стал больше 12px', journal.tabsTop - journal.boxBottom > 12, true);

  const jRect = JSON.parse(await js(`(() => { const r = document.querySelector('.jcomposer').getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); })()`));
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: jRect.x, y: jRect.y, button: 'left', clickCount: 1, buttons: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: jRect.x, y: jRect.y, button: 'left', clickCount: 1, buttons: 0 });
  await sleep(150);
  await cdp.send('Input.insertText', { text: 'я' });
  await sleep(400);
  const typingJ = JSON.parse(await js(`(() => { const bar = document.querySelector('.jbar').getBoundingClientRect(); const tabs = getComputedStyle(document.querySelector('.tabs')); return JSON.stringify({ barBottom: Math.round(bar.bottom), vh: Math.round(window.innerHeight), tabs: tabs.opacity }); })()`));
  expect('пока пишем — панель у низа экрана', typingJ.barBottom, typingJ.vh);
  expect('меню скрыто', typingJ.tabs, '0');

  await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
} finally {
  socket?.close();
  chrome.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch {}
}

console.log(`\nchecks: ${checks}, failures: ${failures}`);
console.log(failures === 0 ? 'E2E OK' : 'E2E FAIL');
process.exit(failures === 0 ? 0 : 1);
