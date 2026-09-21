import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, Plus } from 'lucide-react';
import type { Dict } from '../lib/i18n';
import type { JournalNote, Lang } from '../types';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { formatDay, formatTime, todayKey, type DateKey } from '../lib/date';
import { NOTE_MAX, commitDraft, draftOn, editNote, journalDays, notesOn, setDraft } from '../lib/journal';
import { useKeyboardInset } from '../lib/useKeyboardInset';

const ICON = 19;
/** Выше этого поле заметки не растёт — иначе панель съедает экран. */
const FIELD_MAX = 132;

interface ComposerProps {
  value: string;
  placeholder: string;
  label: string;
  sendLabel: string;
  /** Поле открылось по тапу — значит, курсор и клавиатура нужны сразу. */
  focus?: boolean;
  onChange: (text: string) => void;
  onSend: () => void;
}

/**
 * Поле заметки и кнопка отправки. Enter здесь — обычный Enter: в заметке бывает
 * несколько строк, и отбирать у него перенос было ошибкой. Отправляет кнопка.
 */
function Composer({ value, placeholder, label, sendLabel, focus, onChange, onSend }: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const ready = value.trim().length > 0;

  // Поле растёт под заметку, а не скроллится внутри себя.
  useEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, FIELD_MAX)}px`;
  }, [value]);

  return (
    <div className="jcomposer-row">
      <textarea
        ref={ref}
        className="jcomposer"
        rows={1}
        value={value}
        maxLength={NOTE_MAX}
        placeholder={placeholder}
        aria-label={label}
        autoFocus={focus}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="jsend"
        data-ready={ready ? 'true' : 'false'}
        aria-label={sendLabel}
        title={sendLabel}
        disabled={!ready}
        // Тап по кнопке не должен закрывать клавиатуру: иначе после каждой
        // заметки её пришлось бы поднимать заново.
        onPointerDown={(event) => event.preventDefault()}
        onClick={onSend}
      >
        <ArrowUp size={ICON} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
}

interface NoteProps {
  note: JournalNote;
  lang: Lang;
  editLabel: string;
  onSave: (text: string) => void;
}

/**
 * Одна заметка: время и текст. Тап по тексту — правка на месте,
 * тап мимо — сохранить. Пустой текст не сохраняется: удаления здесь нет.
 */
function Note({ note, lang, editLabel, onSave }: NoteProps) {
  const [text, setText] = useState<string | null>(null);
  const time = (
    <time className="jnote-time" dateTime={note.createdAt}>
      {formatTime(note.createdAt, lang)}
    </time>
  );

  if (text === null) {
    return (
      <li className="jnote-item">
        <button type="button" className="jnote" aria-label={editLabel} onClick={() => setText(note.text)}>
          {time}
          <span className="jnote-text">{note.text}</span>
        </button>
      </li>
    );
  }

  function commit() {
    if (text !== null) onSave(text);
    setText(null);
  }

  return (
    <li className="jnote-item">
      {time}
      <textarea
        className="jnote-input"
        value={text}
        rows={2}
        maxLength={NOTE_MAX}
        aria-label={editLabel}
        autoFocus
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
      />
    </li>
  );
}

interface DayProps {
  day: DateKey;
  today: DateKey;
  lang: Lang;
  dict: Dict;
}

/** Один день ленты: дата, заметки по порядку и — у прошлого дня — поле для новой. */
function Day({ day, today, lang, dict }: DayProps) {
  const { data, update } = useStore();
  const [tapped, setTapped] = useState(false);
  const isToday = day === today;
  const notes = notesOn(data, day);
  const draft = draftOn(data, day);
  const open = !isToday && draft !== undefined;
  const addLabel = dict['journal.add'];

  return (
    <section className="jday" data-today={isToday ? 'true' : 'false'}>
      <div className="jday-head">
        <p className="label">{formatDay(day, lang)}</p>
        {/* Сегодняшнее поле живёт в панели внизу. В прошлый день его открывает
            один тап: «+» — открыть, галочка — закрыть, дописав заметку. */}
        {isToday ? null : (
          <button
            type="button"
            className="icon-btn"
            aria-label={open ? dict['journal.done'] : addLabel}
            title={open ? dict['journal.done'] : addLabel}
            onClick={() => {
              if (open) {
                update((current) => commitDraft(current, day));
                return;
              }
              setTapped(true);
              update((current) => setDraft(current, day, ''));
            }}
          >
            {open ? (
              <Check size={ICON} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Plus size={ICON} strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {open ? (
        <Composer
          value={draft ?? ''}
          placeholder={dict['journal.placeholder']}
          label={dict['journal.placeholder']}
          sendLabel={dict['journal.send']}
          focus={tapped}
          onChange={(text) => update((current) => setDraft(current, day, text))}
          onSend={() => update((current) => commitDraft(current, day))}
        />
      ) : null}

      {notes.length > 0 ? (
        <ul className="jnotes">
          {notes.map((note) => (
            <Note
              key={note.id}
              note={note}
              lang={lang}
              editLabel={dict['journal.note']}
              onSave={(text) => update((current) => editNote(current, day, note.id, text))}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * Журнал — это лента, как чат: сверху старые дни, снизу сегодняшний, а под ним
 * поле заметки. Открыл вкладку — ты уже внизу, там, где пишешь.
 */
export default function JournalView() {
  const { data, update } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const today = todayKey();
  const days = journalDays(data, today);
  const todayNotes = notesOn(data, today).length;

  const barRef = useRef<HTMLDivElement>(null);
  const opened = useRef(false);
  const inset = useKeyboardInset();

  /** Лента всегда открывается снизу: там последняя заметка и поле. */
  function toEnd(smooth = false) {
    const top = document.documentElement.scrollHeight;
    window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  }

  // Высота панели переменная (поле растёт под текст), поэтому запас снизу считает
  // она сама, а не константа в CSS. Этот эффект идёт первым: прокрутка вниз должна
  // знать настоящую высоту панели, иначе лента останавливается на пару пикселей выше.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement;
    const apply = () =>
      root.style.setProperty('--jbar', `${Math.round(bar.getBoundingClientRect().height)}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--jbar');
    };
  }, []);

  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      toEnd();
      return;
    }
    toEnd(true);
  }, [todayNotes]);

  // Клавиатура съела пол-экрана — последняя заметка всё равно должна быть видна.
  useEffect(() => {
    if (inset > 0) toEnd(true);
  }, [inset]);

  return (
    <>
      <div className="journal">
        {days.map((day) => (
          <Day key={day} day={day} today={today} lang={lang} dict={dict} />
        ))}
      </div>

      <div className="jbar" ref={barRef}>
        <Composer
          value={draftOn(data, today) ?? ''}
          placeholder={dict['journal.placeholder']}
          label={dict['journal.placeholder']}
          sendLabel={dict['journal.send']}
          onChange={(text) => update((current) => setDraft(current, today, text))}
          onSend={() => update((current) => commitDraft(current, today))}
        />
      </div>
    </>
  );
}
