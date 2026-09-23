import type { ToastTone } from '../components/Toast';

/**
 * Замер вёрстки для разбора полётов на настоящем телефоне.
 *
 * Вёрстка низа журнала зависит от того, чего headless-браузер не знает: как
 * именно устройство прячет клавиатуру и что при этом честно отдаёт
 * `visualViewport`. Поэтому размеры считает сам браузер на телефоне, а мы читаем
 * готовые числа — иначе правки превращаются в догадки.
 */

/** Все числа — целые: в отчёте важны пиксели, а не дробная часть. */
const round = (value: number | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;

function box(selector: string): string {
  const el = document.querySelector(selector);
  if (!el) return `${selector}=нет`;
  const rect = el.getBoundingClientRect();
  const styles = getComputedStyle(el);
  return [
    `${selector}=x${round(rect.left)} y${round(rect.top)} w${round(rect.width)} h${round(rect.height)}`,
    `pad:${styles.paddingTop}/${styles.paddingBottom}`,
  ].join(' ');
}

/** Один абзац текста: его можно выделить и переслать как есть. */
export function layoutReport(): string {
  const viewport = window.visualViewport;
  const app = document.querySelector('.app');
  const note = [...document.querySelectorAll('.jnote')].pop();
  const noteRect = note?.getBoundingClientRect();
  const boxRect = document.querySelector('.jcomposer-box')?.getBoundingClientRect();
  const lines = [
    `DeepTracker ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    `окно: inner ${round(window.innerHeight)}×${round(window.innerWidth)}`,
    `visual: h${round(viewport?.height)} top${round(viewport?.offsetTop)} scale${viewport?.scale ?? '—'}`,
    `dpr ${window.devicePixelRatio} скролл ${round(window.scrollY)} из ${round(document.documentElement.scrollHeight)}`,
    `html: kb=${getComputedStyle(document.documentElement).getPropertyValue('--kb').trim() || '0'} typing=${document.documentElement.dataset.typing ?? 'нет'}`,
    box('.app'),
    box('.journal'),
    box('.jbar'),
    box('.jcomposer-box'),
    box('.tabs'),
  ];
  if (noteRect && boxRect) {
    lines.push(
      `заметка: h${round(noteRect.height)} низ ${round(noteRect.bottom)}, до коробки ${round(boxRect.top - noteRect.bottom)}`,
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

/** Складывает отчёт в буфер обмена и говорит об этом плашкой. */
export async function copyDiagnostics(notify: (message: string, tone?: ToastTone) => void, done: string): Promise<void> {
  const report = layoutReport();
  try {
    await navigator.clipboard.writeText(report);
    notify(done, 'ok');
  } catch {
    // Буфер обмена может быть закрыт (http, старый браузер) — тогда хотя бы в консоль.
    console.info(report);
    notify(done);
  }
}
