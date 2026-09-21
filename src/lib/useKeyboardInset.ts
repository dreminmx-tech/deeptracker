import { useEffect, useState } from 'react';

/**
 * Клавиатура на телефоне: сколько пикселей она закрывает снизу.
 *
 * Android с `interactive-widget=resizes-content` укорачивает само окно, поэтому
 * там честный ответ — 0: панель заметки и так оказывается над клавиатурой.
 * iOS Safari окно не укорачивает, поэтому считаем по `visualViewport` и поднимаем
 * панель руками — иначе она остаётся под клавиатурой и писать вслепую.
 *
 * Хук живёт ровно столько, сколько открыт журнал: на других вкладках клавиатура
 * ничего не двигает, и `--kb` там не нужен.
 */
const KEYBOARD_MIN = 60;

export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;

    const measure = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
      const next = covered > KEYBOARD_MIN ? Math.round(covered) : 0;
      setInset(next);
      // Панель читает --kb и поднимается на эту высоту (см. .jbar в styles.css).
      root.style.setProperty('--kb', `${next}px`);
      if (next > 0) root.dataset.typing = 'true';
      else delete root.dataset.typing;
    };

    measure();
    viewport.addEventListener('resize', measure);
    viewport.addEventListener('scroll', measure);
    return () => {
      viewport.removeEventListener('resize', measure);
      viewport.removeEventListener('scroll', measure);
      root.style.removeProperty('--kb');
      delete root.dataset.typing;
    };
  }, []);

  return inset;
}
