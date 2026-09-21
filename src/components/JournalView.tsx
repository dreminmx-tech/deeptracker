import { useEffect, useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import type { Dict } from '../lib/i18n';
import type { JournalNote, Lang } from '../types';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { formatDay, formatTime, todayKey, type DateKey } from '../lib/date';
import { NOTE_MAX, commitDraft, draftOn, editNote, journalDays, notesOn, setDraft } from '../lib/journal';

const ICON = 19;

interface ComposerProps {
  value: string;
  placeholder: string;
  label: string;
  /** Поле открылось по тапу — значит, курсор и клавиатура нужны сразу. */
  focus?: boolean;
  onChange: (text: string) => void;
  onCommit: () => void;
}

/** Поле заметки: растёт под текст, Enter отправляет, Shift+Enter — новая строка. */
function Composer({ value, placeholder, label, focus, onChange, onCommit }: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Мысль не должна жить в окошке с полосой прокрутки: поле растёт вместе с текстом.
  useEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 320)}px`;
  }, [value]);

  return (
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
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || event.shiftKey) return;
        event.preventDefault();
        onCommit();
      }}
    />
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
 * Enter или тап мимо — сохранить. Пустой текст не сохраняется: удаления здесь нет.
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
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.shiftKey) return;
          event.preventDefault();
          commit();
        }}
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

/** Один день ленты: дата, поле для новой заметки и сами заметки — новые сверху. */
function Day({ day, today, lang, dict }: DayProps) {
  const { data, update } = useStore();
  const [tapped, setTapped] = useState(false);
  const isToday = day === today;
  const notes = notesOn(data, day);
  const draft = draftOn(data, day);
  const open = isToday || draft !== undefined;
  const addLabel = dict['journal.add'];

  return (
    <section className="jday" data-today={isToday ? 'true' : 'false'}>
      <div className="jday-head">
        <p className="label">{formatDay(day, lang)}</p>
        {/* Сегодня поле открыто всегда. В прошлый день его открывает один тап:
            «+» — открыть, галочка — закрыть, дописав заметку. */}
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
          focus={tapped}
          onChange={(text) => update((current) => setDraft(current, day, text))}
          onCommit={() => update((current) => commitDraft(current, day))}
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
 * Журнал — это лента: сверху сегодня, ниже вчера, ещё ниже позавчера.
 * Один экран, одно поле, ноль настроек: записал мысль и пошёл дальше.
 */
export default function JournalView() {
  const { data } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const today = todayKey();
  const days = journalDays(data, today);

  return (
    <div className="journal">
      {days.map((day) => (
        <Day key={day} day={day} today={today} lang={lang} dict={dict} />
      ))}
    </div>
  );
}
