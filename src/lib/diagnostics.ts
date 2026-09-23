/**
 * Замер вёрстки для разбора полётов на настоящем телефоне.
 *
 * Низ журнала зависит от того, чего headless-браузер не знает: как именно
 * устройство прячет клавиатуру и что при этом честно отдаёт `visualViewport`.
 * Поэтому размеры считает сам браузер на телефоне.
 *
 * Снять замер надо ровно в тот момент, когда клавиатура на экране: в настройках
 * её уже нет, и журнал оттуда не виден вовсе. Поэтому замеры копятся в
 * `localStorage` сами — по одному на каждое появление клавиатуры, — а человек
 * потом просто копирует последний.
 */

const SNAPSHOTS_KEY = 'deeptracker.diag.v1';
/** Больше десятка не нужно: интересен последний, а первые — для сравнения. */
const KEEP = 10;

/** Все числа — целые: в отчёте важны пиксели, а не дробная часть. */
const round = (value: number | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
const px = (value: string): string => value.trim() || '0';

function box(selector: string): string {
  const el = document.querySelector(selector);
  if (!el) return `${selector}=нет`;
  const rect = el.getBoundingClientRect();
  const styles = getComputedStyle(el);
  return `${selector}=x${round(rect.left)} y${round(rect.top)} w${round(rect.width)} h${round(rect.height)} pad:${px(styles.paddingTop)}/${px(styles.paddingBottom)}`;
}

/** Один абзац текста: его можно выделить и переслать как есть. */
export function layoutReport(tag = 'сейчас'): string {
  const viewport = window.visualViewport;
  const app = document.querySelector('.app');
  const note = [...document.querySelectorAll('.jnote')].pop();
  const noteRect = note?.getBoundingClientRect();
  const inboxRect = document.querySelector('.jcomposer-box')?.getBoundingClientRect();
  const root = getComputedStyle(document.documentElement);
  const lines = [
    `DeepTracker ${tag} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    `окно: inner ${round(window.innerHeight)}×${round(window.innerWidth)}`,
    `visual: h${round(viewport?.height)} top${round(viewport?.offsetTop)} scale${viewport?.scale ?? '—'}`,
    `dpr ${window.devicePixelRatio} скролл ${round(window.scrollY)} из ${round(document.documentElement.scrollHeight)}`,
    `html: kb=${px(root.getPropertyValue('--kb'))} typing=${document.documentElement.dataset.typing ?? 'нет'}`,
    box('.app'),
    box('.jbar'),
    box('.jcomposer-box'),
    box('.tabs'),
  ];
  if (noteRect && inboxRect) {
    lines.push(
      `заметка: h${round(noteRect.height)} низ ${round(noteRect.bottom)}, до коробки ${round(inboxRect.top - noteRect.bottom)}`,
    );
  }
  if (app) {
    lines.push(
      `app: h${round(app.getBoundingClientRect().height)} скролл ${round(app.scrollTop)} из ${round(app.scrollHeight - app.clientHeight)}`,
    );
  }
  lines.push(`активный: ${document.activeElement?.tagName ?? '—'} ${document.activeElement?.className ?? ''}`);
  return lines.join('\n');
}

function readSnapshots(): string[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/** Замеры, снятые в момент печати: последний — сверху. Живут только на устройстве. */
export function layoutSnapshots(): string[] {
  return readSnapshots();
}

/** Сохраняет замер в список. Кладём в начало — читать его будут с конца списка. */
export function rememberLayout(tag: string): void {
  const report = layoutReport(tag);
  try {
    const all = [report, ...readSnapshots()].slice(0, KEEP);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(all));
  } catch {
    /* приватный режим или переполнение — замер просто не сохранится */
  }
}

/** Что копировать: замеры момента печати, а если их нет — текущий экран. */
export function diagnosticsText(): string {
  const saved = readSnapshots();
  if (saved.length === 0) return layoutReport('сейчас (замеров печати ещё нет)');
  return [...saved, '', '--- сейчас ---', layoutReport('сейчас')].join('\n\n');
}

/** Складывает отчёт в буфер обмена и говорит об этом плашкой. */
export async function copyDiagnostics(
  notify: (message: string, tone?: 'plain' | 'ok' | 'warn') => void,
  done: string,
): Promise<void> {
  const report = diagnosticsText();
  try {
    await navigator.clipboard.writeText(report);
    notify(done, 'ok');
  } catch {
    // Буфер обмена может быть закрыт (http, старый браузер) — тогда хотя бы в консоль.
    console.info(report);
    notify(done);
  }
}
