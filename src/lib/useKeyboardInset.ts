import { useEffect, useRef, useState } from 'react';

/**
 * Клавиатура на телефоне: сколько пикселей она закрывает снизу.
 *
 * Android с `interactive-widget=resizes-content` укорачивает само окно, поэтому
 * там честный ответ — 0: панель заметки и так оказывается над клавиатурой.
 * iOS Safari окно не укорачивает, поэтому считаем по `visualViewport` и поднимаем
 * панель руками — иначе она остаётся под клавиатурой и писать вслепую.
 *
 * `active` — в поле заметки стоит курсор. Пока это так, на `<html>` висит
 * `data-typing`: по нему нижние полосы и запас снизу знают про клавиатуру. Полосы
 * при этом никуда не прячутся — меню должно оставаться на экране, пока человек
 * пишет. Хук живёт в журнале и в «Быстрых делах».
 */
const KEYBOARD_MIN = 60;

export function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);
  /** Клавиатура была на экране: по этому признаку ловим её закрытие. */
  const wasOpen = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    if (!active) {
      setInset(0);
      wasOpen.current = false;
      root.style.removeProperty('--kb');
      delete root.dataset.typing;
      return;
    }

    root.dataset.typing = 'true';
    const viewport = window.visualViewport;
    /** Поле наверху компонента, но поднять его здесь — единственный способ
     *  убрать `data-typing`, когда на iOS закрывают саму клавиатуру кнопкой, а
     *  курсор в поле остаётся: иначе запас снизу остался бы под клавиатуру,
     *  которой уже нет. */
    const field = document.activeElement;
    const measure = () => {
      const covered = window.innerHeight - (viewport?.height ?? 0) - (viewport?.offsetTop ?? 0);
      const next = viewport && covered > KEYBOARD_MIN ? Math.round(covered) : 0;
      const closed = wasOpen.current && next === 0;
      wasOpen.current = next > 0;
      setInset(next);
      // Панель читает --kb и поднимается на эту высоту (см. .jbar в styles.css).
      root.style.setProperty('--kb', `${next}px`);
      if (closed && field instanceof HTMLElement && document.activeElement === field) field.blur();
    };

    measure();
    viewport?.addEventListener('resize', measure);
    viewport?.addEventListener('scroll', measure);
    return () => {
      viewport?.removeEventListener('resize', measure);
      viewport?.removeEventListener('scroll', measure);
      root.style.removeProperty('--kb');
      delete root.dataset.typing;
    };
  }, [active]);

  return inset;
}
