/**
 * Снимки интерфейса для README и визуальной проверки UI.
 *
 *   npm run preview            # в одном терминале
 *   node scripts/shots.mjs     # в другом
 *
 * Управляет headless Chrome через DevTools Protocol: подставляет демо-данные
 * в localStorage, открывает каждую вкладку и сохраняет PNG в docs/screenshots.
 * Переопределяется через переменные окружения: CHROME_PATH, SHOTS_BASE.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'docs', 'screenshots');
const BASE = process.env.SHOTS_BASE ?? 'http://127.0.0.1:4173/';
const PORT = 9333;
const CHROME =
  process.env.CHROME_PATH ??
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].find((path) => existsSync(path));

if (!CHROME) {
  console.error('Chrome/Edge не найден — укажи CHROME_PATH');
  process.exit(1);
}

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function shift(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dayKey(date);
}

/** Правдоподобная история за 24 дня, чтобы на скриншотах была не пустота. */
function demoData(theme) {
  const created = new Date();
  created.setDate(created.getDate() - 24);
  const createdAt = created.toISOString();

  const habits = [
    { id: 'h1', name: 'Выпить таблетки', kind: 'check', tiny: 'Достать упаковку и налить воды', pinned: true, createdAt, order: 0 },
    { id: 'h2', name: 'Вода', kind: 'counter', target: 6, unit: 'стаканов', pinned: true, createdAt, order: 1 },
    { id: 'h3', name: 'Прогулка', kind: 'duration', target: 20, unit: 'мин', tiny: 'Выйти на улицу на 2 минуты', pinned: true, createdAt, order: 2 },
    { id: 'h4', name: 'Спорт', kind: 'flex', perWeek: 3, tiny: 'Размяться 2 минуты', createdAt, order: 3 },
    { id: 'h5', name: 'Не листать телефон в постели', kind: 'negative', tiny: 'Оставить телефон на столе', createdAt, order: 4 },
  ];

  const days = {};
  for (let i = 1; i <= 24; i += 1) {
    const entries = {};
    if (i % 7 !== 3) entries.h1 = { done: true, value: 1 };
    if (i % 3 !== 0) entries.h2 = { value: 4 + (i % 3), done: false };
    if (i % 4 === 0) entries.h3 = { value: 20, done: true };
    if (i % 5 === 0) entries.h4 = { done: true, value: 1 };
    if (i % 9 === 0) entries.h5 = { value: 1, done: false };
    if (Object.keys(entries).length > 0) days[shift(i)] = { entries, dump: [] };
  }

  const now = new Date().toISOString();
  days[shift(0)] = {
    entries: {
      h1: { done: true, value: 1 },
      h2: { value: 3, done: false },
      h3: { value: 20, done: true },
    },
    dump: [
      { id: 'd1', text: 'Позвонить в поликлинику', done: false, createdAt: now },
      { id: 'd2', text: 'Записаться в зал', done: true, createdAt: now },
    ],
  };

  return { version: 1, habits, days, settings: { lang: 'ru', theme } };
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve: done, reject: fail } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) fail(new Error(message.error.message));
        else done(message.result);
        return;
      }
      const listeners = this.handlers.get(message.method);
      if (listeners) for (const listener of [...listeners]) listener(message.params);
    });
  }

  send(method, params = {}) {
    const id = (this.nextId += 1);
    return new Promise((done, fail) => {
      this.pending.set(id, { resolve: done, reject: fail });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method) {
    return new Promise((done) => {
      if (!this.handlers.has(method)) this.handlers.set(method, new Set());
      const listener = (params) => {
        this.handlers.get(method).delete(listener);
        done(params);
      };
      this.handlers.get(method).add(listener);
    });
  }
}

async function waitForEndpoint(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error(`не дождались ${url}`);
}

const profile = join(tmpdir(), `ds-shots-${Date.now()}`);
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

let socket;
try {
  await waitForEndpoint(`http://127.0.0.1:${PORT}/json/version`);
  const targets = await waitForEndpoint(`http://127.0.0.1:${PORT}/json/list`);
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('нет вкладки для подключения');

  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', fail, { once: true });
  });
  const cdp = new Cdp(socket);

  await cdp.send('Page.enable');
  await cdp.send('Network.enable');

  mkdirSync(OUT_DIR, { recursive: true });
  let scriptId = null;

  const shots = [
    { name: 'today', tab: 'today', theme: 'dark', width: 390, height: 900 },
    {
      name: 'today-past',
      tab: 'today',
      theme: 'dark',
      width: 390,
      height: 900,
      // стрелка назад: открывается прошлый понедельник вместе с прошлой неделей
      clickJs: "document.querySelector('.daystrip-shift')?.click()",
    },
    {
      name: 'today-log',
      tab: 'today',
      theme: 'dark',
      width: 390,
      height: 820,
      // второе значение — «Прогулка»: окно быстрого ввода минут с чипами и таймером
      clickJs: "document.querySelectorAll('.stepper-value')[1]?.click()",
    },
    { name: 'habits', tab: 'habits', theme: 'dark', width: 390, height: 520 },
    { name: 'habits-actions', tab: 'habits', theme: 'dark', width: 390, height: 620, click: '.row-act' },
    { name: 'stats', tab: 'stats', theme: 'dark', width: 390, height: 1560 },
    { name: 'settings', tab: 'settings', theme: 'dark', width: 390, height: 1420 },
    { name: 'today-light', tab: 'today', theme: 'light', width: 390, height: 900 },
  ];

  for (const shot of shots) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: shot.width,
      height: shot.height,
      deviceScaleFactor: 2,
      mobile: true,
    });

    // Seed runs before the app scripts on every new document — no race with hydration.
    if (scriptId) await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });
    const source = `try { localStorage.setItem('deeptracker.v1', ${JSON.stringify(
      JSON.stringify(demoData(shot.theme)),
    )}); } catch (error) {}`;
    ({ identifier: scriptId } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source }));

    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: `${BASE}?shot=${shot.name}#${shot.tab}` });
    await loaded;
    await sleep(700); // let fonts + transitions settle

    if (shot.click) {
      await cdp.send('Runtime.evaluate', {
        expression: `document.querySelector(${JSON.stringify(shot.click)})?.click()`,
      });
      await sleep(400);
    }

    if (shot.clickJs) {
      await cdp.send('Runtime.evaluate', { expression: shot.clickJs });
      await sleep(400);
    }

    const check = await cdp.send('Runtime.evaluate', {
      expression:
        "JSON.stringify({ rows: document.querySelectorAll('.habit-card, .hrow').length, theme: document.documentElement.dataset.theme, stored: (localStorage.getItem('deeptracker.v1') || '').length })",
      returnByValue: true,
    });
    console.log(`  ${check.result.value}`);

    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(OUT_DIR, `${shot.name}.png`), Buffer.from(data, 'base64'));
    console.log(`${shot.name}.png — ${shot.width}x${shot.height} @2x`);
  }
} finally {
  socket?.close();
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
