import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { ArrowUp, Check, Plus, Trash2 } from 'lucide-react';
import type { Dict } from '../lib/i18n';
import type { JournalNote, Lang } from '../types';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { formatDay, formatTime, todayKey, type DateKey } from '../lib/date';
import {
  NOTE_MAX,
  commitDraft,
  draftOn,
  editNote,
  journalDays,
  notesOn,
  removeNote,
  setDraft,
  unfinishedDay,
} from '../lib/journal';
import { useKeyboardInset } from '../lib/useKeyboardInset';
import { rememberLayout } from '../lib/diagnostics';

const ICON = 19;
/** Выше этого поле заметки не растёт — иначе панель съедает экран. */
const FIELD_MAX = 132;

/** Куда пишет поле: в день или в конкретную заметку. */
type ComposerState = { kind: 'write'; day: DateKey } | { kind: 'edit'; day: DateKey; id: string };

/** Тап по кнопке не должен закрывать клавиатуру: иначе её придётся поднимать заново. */
function keepFocus(event: ReactPointerEvent) {
  event.preventDefault();
}

interface ComposerProps {
  value: string;
  mode: 'write' | 'edit';
  dict: Dict;
  fieldRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (text: string) => void;
  onSend: () => void;
  onDone: () => void;
  onRemove: () => void;
  onWriting: (writing: boolean) => void;
}

/**
 * Композер: одна скруглённая коробка во всю ширину, кнопки внутри у правого
 * нижнего края. Enter — обычный Enter, в заметке бывает несколько строк.
 */
function Composer({
  value,
  mode,
  dict,
  fieldRef,
  onChange,
  onSend,
  onDone,
  onRemove,
  onWriting,
}: ComposerProps) {
  const ready = value.trim().length > 0;

  // Поле растёт под текст; когда текст перестал помещаться, показываем его конец,
  // иначе каретка уезжает вниз, а на экране остаются первые строки.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, FIELD_MAX)}px`;
    if (field.scrollHeight > FIELD_MAX) field.scrollTop = field.scrollHeight;
  }, [fieldRef, value]);

  return (
    <div className="jcomposer-box" data-mode={mode}>
      <textarea
        ref={fieldRef}
        className="jcomposer"
        rows={1}
        value={value}
        maxLength={NOTE_MAX}
        placeholder={dict['journal.placeholder']}
        aria-label={dict['journal.placeholder']}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => onWriting(true)}
        onBlur={() => onWriting(false)}
      />

      {mode === 'edit' ? (
        <>
          <button
            type="button"
            className="jcircle jremove"
            aria-label={dict['journal.delete']}
            title={dict['journal.delete']}
            onPointerDown={keepFocus}
            onClick={onRemove}
          >
            <Trash2 size={ICON} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="jcircle jdone"
            data-ready="true"
            aria-label={dict['journal.done']}
            title={dict['journal.done']}
            onPointerDown={keepFocus}
            onClick={onDone}
          >
            <Check size={ICON} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </>
      ) : (
        <button
          type="button"
          className="jcircle jsend"
          data-ready={ready ? 'true' : 'false'}
          aria-label={dict['journal.send']}
          title={dict['journal.send']}
          disabled={!ready}
          onPointerDown={keepFocus}
          onClick={onSend}
        >
          <ArrowUp size={ICON} strokeWidth={1.8} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

interface NoteProps {
  note: JournalNote;
  lang: Lang;
  editing: boolean;
  editLabel: string;
  onEdit: () => void;
}

/** Одна заметка: время и текст. Тап поднимает её в поле внизу — там и правят. */
function Note({ note, lang, editing, editLabel, onEdit }: NoteProps) {
  return (
    <li className="jnote-item">
      <button
        type="button"
        className="jnote"
        data-editing={editing ? 'true' : 'false'}
        aria-label={editLabel}
        onClick={onEdit}
      >
        <time className="jnote-time" dateTime={note.createdAt}>
          {formatTime(note.createdAt, lang)}
        </time>
        <span className="jnote-text">{note.text}</span>
      </button>
    </li>
  );
}

interface DayProps {
  day: DateKey;
  today: DateKey;
  lang: Lang;
  dict: Dict;
  composer: ComposerState;
  onWrite: (day: DateKey) => void;
  onEdit: (day: DateKey, id: string) => void;
}

/** Один день ленты: дата и заметки по порядку. Поле для новых живёт внизу экрана. */
function Day({ day, today, lang, dict, composer, onWrite, onEdit }: DayProps) {
  const { data } = useStore();
  const isToday = day === today;
  const notes = notesOn(data, day);
  const targeting = composer.kind === 'write' && composer.day === day;
  const addLabel = dict['journal.add'];

  return (
    <section className="jday" data-today={isToday ? 'true' : 'false'} data-target={targeting ? 'true' : 'false'}>
      <div className="jday-head">
        <p className="label">{formatDay(day, lang)}</p>
        {/* «+» нацеливает поле на этот день, галочка возвращает его к сегодняшнему */}
        {isToday ? null : (
          <button
            type="button"
            className="icon-btn"
            aria-label={targeting ? dict['journal.done'] : addLabel}
            title={targeting ? dict['journal.done'] : addLabel}
            onClick={() => onWrite(targeting ? today : day)}
          >
            {targeting ? (
              <Check size={ICON} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Plus size={ICON} strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {notes.length > 0 ? (
        <ul className="jnotes">
          {notes.map((note) => (
            <Note
              key={note.id}
              note={note}
              lang={lang}
              editing={composer.kind === 'edit' && composer.id === note.id}
              editLabel={dict['journal.note']}
              onEdit={() => onEdit(day, note.id)}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * Журнал — это лента, как чат: сверху старые дни, снизу сегодняшний, а под ним
 * поле заметки. Писать, править и удалять — из одного поля внизу.
 */
export default function JournalView() {
  const { data, update } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const today = todayKey();

  const [composer, setComposer] = useState<ComposerState>(() => ({
    kind: 'write',
    day: unfinishedDay(data, today),
  }));
  const [writing, setWriting] = useState(false);
  // Текст правки живёт здесь: поле должно уметь оставаться пустым, а в данных
  // пустая заметка не сохраняется.
  const [editText, setEditText] = useState('');

  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const wanted = useRef(false);
  const opened = useRef(false);
  const inset = useKeyboardInset(writing);

  // День-цель всегда в ленте, даже если в нём ещё ни одной заметки: иначе «+»
  // у пустого дня не имел бы куда деться.
  const days = useMemo(() => {
    const list = journalDays(data, today);
    if (list.includes(composer.day)) return list;
    return [...list, composer.day].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }, [data, today, composer.day]);

  const edited = composer.kind === 'edit' ? notesOn(data, composer.day).find((note) => note.id === composer.id) : undefined;
  const value =
    composer.kind === 'edit'
      ? edited
        ? editText
        : ''
      : (draftOn(data, composer.day) ?? '');

  /**
   * Лента всегда открывается снизу: там последняя заметка и поле.
   *
   * Прокручивается `main` внутри колонки (см. `.app` в styles.css), а не окно:
   * поэтому и цель — его `scrollHeight`. Считаем до конца содержимого, а не «до
   * конца окна»: прокрутка ниже просто не нужна, а `scrollTop = scrollHeight`
   * ставит ленту ровно на последнюю строку.
   */
  function toEnd(smooth = false) {
    const scroller = document.querySelector('.jfeed');
    if (scroller instanceof HTMLElement) {
      // Присваиваем `scrollTop`, а не `scrollTo`: на телефоне браузер зажимает
      // `scrollTo` по layout-вьюпорту, а прямое присваивание доезжает до конца.
      scroller.scrollTop = scroller.scrollHeight;
      return;
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }

  // Высота панели переменная (поле растёт под текст, строка над полем появляется
  // и исчезает), поэтому запас снизу у ленты считает сама панель — по её полной
  // высоте. Одна высота на всё приложение: панель и запас не могут разойтись,
  // потому что считаются по одному и тому же числу.
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const apply = () =>
      root.style.setProperty('--jbar', `${Math.round(bar.getBoundingClientRect().height)}px`);
    apply();
    if (typeof ResizeObserver === 'undefined') {
      return () => root.style.removeProperty('--jbar');
    }
    const observer = new ResizeObserver(apply);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--jbar');
    };
  }, []);

  // Курсор ставится после того, как поле получило новый текст.
  useEffect(() => {
    if (!wanted.current) return;
    wanted.current = false;
    const field = fieldRef.current;
    if (!field) return;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }, [composer]);

  const todayNotes = notesOn(data, today).length;
  useEffect(() => {
    // Первое открытие — без плавности: лента должна стоять внизу сразу, а не
    // доезжать туда на глазах. Дальше новая заметка доезжает плавно.
    toEnd(opened.current);
    opened.current = true;
  }, [todayNotes]);

  // Клавиатура съела пол-экрана — последняя заметка всё равно должна быть видна.
  // Прокрутку отпускаем без плавности: вместе с поднимающейся клавиатурой
  // плавный ход читается как рывок, а показать надо сразу.
  useEffect(() => {
    if (inset <= 0) return;
    toEnd();
    // Окну нужно стать прокручиваемым: в тот же кадр прокручивать ещё нечего.
    const frame = window.requestAnimationFrame(() => toEnd());
    return () => window.cancelAnimationFrame(frame);
  }, [inset]);

  /**
   * Человек начал печатать: рядом со шрифтом снимаем замер вёрстки — он нужен
   * при открытой клавиатуре, а в настройках её уже не будет. Два снимка: сразу
   * и когда раскладка устоялась (см. `lib/diagnostics.ts`).
   */
  function markWriting(writing: boolean) {
    setWriting(writing);
    if (!writing) return;
    rememberLayout('клавиатура открыта');
    window.setTimeout(() => rememberLayout('клавиатура открыта, устоялось'), 700);
  }

  // Поле выросло под текст или заметка появилась — лента снова доезжает до конца.
  // Следим за её окном: высота меняется вместе с клавиатурой и панелью.
  useEffect(() => {
    const scroller = document.querySelector('.jfeed');
    if (!(scroller instanceof HTMLElement)) return;
    const pin = () => {
      if (scroller.scrollHeight > scroller.clientHeight) scroller.scrollTop = scroller.scrollHeight;
    };
    pin();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(pin);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [value]);

  /** «+» у дня: пишем в него. Галочка у дня возвращает поле к сегодняшнему дню. */
  function writeTo(day: DateKey) {
    wanted.current = true;
    setComposer({ kind: 'write', day });
  }

  function startEdit(day: DateKey, id: string) {
    const note = notesOn(data, day).find((item) => item.id === id);
    if (!note) return;
    setEditText(note.text);
    wanted.current = true;
    setComposer({ kind: 'edit', day, id });
  }

  function finish() {
    setComposer({ kind: 'write', day: today });
    fieldRef.current?.blur();
  }

  function change(text: string) {
    if (composer.kind === 'edit') {
      setEditText(text);
      // Пустое поле в данные не пишем: иначе заметка исчезла бы прямо во время набора.
      if (text.trim()) update((current) => editNote(current, composer.day, composer.id, text));
      return;
    }
    update((current) => setDraft(current, composer.day, text));
  }

  function done() {
    if (composer.kind !== 'edit') return;
    const { day, id } = composer;
    const text = editText.trim();
    update((current) => (text ? editNote(current, day, id, editText) : removeNote(current, day, id)));
    finish();
  }

  function remove() {
    if (composer.kind !== 'edit') return;
    const { day, id } = composer;
    update((current) => removeNote(current, day, id));
    finish();
  }

  return (
    <>
      <div className="jfeed">
        <div className="journal">
          {days.map((day) => (
            <Day
              key={day}
              day={day}
              today={today}
              lang={lang}
              dict={dict}
              composer={composer}
              onWrite={writeTo}
              onEdit={startEdit}
            />
          ))}
        </div>
      </div>

      <div className="jbar" ref={barRef}>
        <div className="jbar-inner">
          {composer.kind === 'edit' ? (
            <div className="jbar-note">
              <p className="label">
                {dict['journal.editing']} {formatTime(edited?.createdAt ?? '', lang)}
              </p>
            </div>
          ) : composer.day !== today ? (
            <div className="jbar-note">
              <p className="label">{formatDay(composer.day, lang)}</p>
              <button type="button" className="link" onClick={() => writeTo(today)}>
                {dict['today.today']}
              </button>
            </div>
          ) : null}

          <Composer
            value={value}
            mode={composer.kind}
            dict={dict}
            fieldRef={fieldRef}
            onChange={change}
            onSend={() => update((current) => commitDraft(current, composer.day))}
            onDone={done}
            onRemove={remove}
            onWriting={markWriting}
          />
        </div>
        {/* Воздух до меню отдельным слоем: safe-area его не трогает. */}
        <div className="jbar-gap" aria-hidden="true" />
      </div>
    </>
  );
}
