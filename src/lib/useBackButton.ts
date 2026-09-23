import { useEffect, useRef, useState } from 'react';

/** Клавиатура на экране: курсор стоит в поле ввода. */
function typingNow(): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  return active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable;
}

/**
 * Что «висит» поверх экрана и должно уйти первым. Шторка важнее клавиатуры: она
 * закрывает весь экран, а клавиатура — только низ.
 */
export type BackLayer = 'screen' | 'dialog';

interface Handler {
  layer: BackLayer;
  run: () => void;
}

const handlers: Handler[] = [];
/** Свой шаг в истории: без него «назад» сразу уходит на предыдущую страницу. */
let guarded = false;
let listening = false;

/** Открыта ли шторка: пока открыта, клавиатура в очередь слоёв не встаёт. */
function dialogOpen(): boolean {
  return handlers.some((handler) => handler.layer === 'dialog');
}

/** Шторка меняет очередь без событий фокуса — об этом надо сказать наружу. */
const LAYERS_CHANGED = 'deeptracker:layers';

function announce() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(LAYERS_CHANGED));
}

function pushGuard() {
  if (guarded || typeof window === 'undefined') return;
  guarded = true;
  try {
    window.history.pushState({ deeptracker: 'back' }, '');
  } catch {
    /* приватный режим или file:// — останемся без перехвата */
  }
}

function onPop() {
  const top = handlers[handlers.length - 1];
  const wasGuarded = guarded;
  guarded = false;
  if (!top) return;
  top.run();
  // Слой никуда не делся (клавиатура осталась, шторка ещё закрывается) — значит
  // «назад» просил убрать именно его. Шаг в историю возвращаем, иначе следующее
  // нажатие уже закрыло бы приложение.
  if (wasGuarded && handlers.includes(top)) pushGuard();
}

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('popstate', onPop);
}

function join(layer: BackLayer, run: () => void): Handler {
  const handler: Handler = { layer, run };
  // Верхний слой — последний в списке: он и отвечает на «назад».
  handlers.push(handler);
  listen();
  pushGuard();
  announce();
  return handler;
}

function leave(handler: Handler) {
  const index = handlers.indexOf(handler);
  const wasTop = index === handlers.length - 1;
  if (index >= 0) handlers.splice(index, 1);
  // Свой шаг снимается только у верхнего, и только пока в нём есть надобность:
  // у нижних он ещё нужен, а `history.back()` дёрнул бы popstate поверх чужого слоя.
  if (wasTop && guarded && handlers.length === 0) {
    guarded = false;
    try {
      window.history.back();
    } catch {
      /* лишний шаг в истории безвреден */
    }
  }
  announce();
}

/**
 * Регистрирует слой поверх экрана, пока `active`. Обработчиков в приложении
 * несколько (оболочка и шторки), поэтому они живут в одном списке: на «назад»
 * отвечает только верхний, и одно нажатие убирает один слой — первым шторку,
 * потом клавиатуру, и только потом приложение закрывается.
 */
export function useBackButton(active: boolean, layer: BackLayer, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!active) return;
    const handler = join(layer, () => closeRef.current());
    return () => leave(handler);
  }, [active, layer]);
}

/**
 * Слой «клавиатура»: он есть ровно тогда, когда курсор стоит в поле ввода.
 * Фокус приходит и уходит сам, поэтому состояние живёт здесь, а не у вызывающего.
 *
 * Пока открыта шторка, клавиатура в очередь не встаёт: «назад» должен закрыть
 * шторку, а не снять фокус с поля внутри неё.
 */
export function useTypingLayer(): void {
  const [typing, setTyping] = useState(false);
  const [blocked, setBlocked] = useState(dialogOpen);

  useEffect(() => {
    const sync = () => {
      setTyping(typingNow());
      setBlocked(dialogOpen());
    };
    document.addEventListener('focusin', sync);
    document.addEventListener('focusout', sync);
    window.addEventListener(LAYERS_CHANGED, sync);
    sync();
    return () => {
      document.removeEventListener('focusin', sync);
      document.removeEventListener('focusout', sync);
      window.removeEventListener(LAYERS_CHANGED, sync);
    };
  }, []);

  useBackButton(typing && !blocked, 'screen', () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  });
}
