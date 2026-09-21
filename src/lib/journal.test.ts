import { describe, expect, it } from 'vitest';
import type { AppData } from '../types';
import { freshData, normalizeData } from './storage';
import { addDays, todayKey } from './date';
import { NOTE_MAX, commitDraft, draftOn, editNote, journalDays, notesOn, setDraft } from './journal';

const TODAY = todayKey();
const YESTERDAY = addDays(TODAY, -1);
const BEFORE = addDays(TODAY, -2);
const AT = '2026-09-21T21:40:00.000Z';

const fresh = (): AppData => freshData('ru');

describe('the feed', () => {
  it('always shows today, even when nothing is written', () => {
    expect(journalDays(fresh(), TODAY)).toEqual([TODAY]);
  });

  it('keeps the newest day on top', () => {
    let data = commitDraft(setDraft(fresh(), BEFORE, 'позавчера'), BEFORE, AT);
    data = commitDraft(setDraft(data, YESTERDAY, 'вчера'), YESTERDAY, AT);
    expect(journalDays(data, TODAY)).toEqual([TODAY, YESTERDAY, BEFORE]);
  });

  it('keeps the newest note on top inside a day', () => {
    let data = commitDraft(setDraft(fresh(), TODAY, 'первая'), TODAY, AT);
    data = commitDraft(setDraft(data, TODAY, 'вторая'), TODAY, AT);
    expect(notesOn(data, TODAY).map((note) => note.text)).toEqual(['вторая', 'первая']);
  });

  it('counts a past day in as soon as its field is opened', () => {
    const data = setDraft(fresh(), YESTERDAY, '');
    expect(draftOn(data, YESTERDAY)).toBe('');
    expect(journalDays(data, TODAY)).toEqual([TODAY, YESTERDAY]);
  });

  it('autosaves every keystroke instead of waiting for a button', () => {
    const data = setDraft(fresh(), TODAY, 'мысль без точки');
    expect(draftOn(data, TODAY)).toBe('мысль без точки');
    expect(notesOn(data, TODAY)).toHaveLength(0);
  });

  it('closes an empty field without inventing a note', () => {
    const data = commitDraft(setDraft(fresh(), TODAY, '   '), TODAY, AT);
    expect(notesOn(data, TODAY)).toHaveLength(0);
    expect(draftOn(data, TODAY)).toBeUndefined();
  });

  it('keeps line breaks but trims stray edges', () => {
    const data = commitDraft(setDraft(fresh(), TODAY, '  первая строка\nвторая  '), TODAY, AT);
    expect(notesOn(data, TODAY)[0].text).toBe('первая строка\nвторая');
  });

  it('caps one note at NOTE_MAX characters', () => {
    const long = 'я'.repeat(NOTE_MAX + 50);
    expect(draftOn(setDraft(fresh(), TODAY, long), TODAY)).toHaveLength(NOTE_MAX);
  });
});

describe('editing a note', () => {
  function withNote(): { data: AppData; id: string } {
    const data = commitDraft(setDraft(fresh(), TODAY, 'черновик'), TODAY, AT);
    const note = notesOn(data, TODAY)[0];
    if (!note) throw new Error('the note was not written');
    return { data, id: note.id };
  }

  it('rewrites the text in place, keeping time and order', () => {
    const { data, id } = withNote();
    const next = editNote(data, TODAY, id, '  уже не черновик  ');
    expect(notesOn(next, TODAY)[0]).toMatchObject({ id, text: 'уже не черновик' });
  });

  it('refuses to erase a note: the journal has no delete', () => {
    const { data, id } = withNote();
    expect(editNote(data, TODAY, id, '   ')).toBe(data);
    expect(editNote(data, TODAY, id, '')).toBe(data);
  });

  it('ignores a note that is not there', () => {
    const { data } = withNote();
    expect(editNote(data, TODAY, 'n_missing', 'привет')).toBe(data);
  });
});

describe('the journal in storage', () => {
  it('survives a round trip, with the open field still open and full', () => {
    let data = commitDraft(setDraft(fresh(), YESTERDAY, 'вчерашняя мысль'), YESTERDAY, AT);
    data = setDraft(data, TODAY, 'пишу прямо сейчас');
    const restored = normalizeData(JSON.parse(JSON.stringify(data)));

    expect(notesOn(restored, YESTERDAY).map((note) => note.text)).toEqual(['вчерашняя мысль']);
    expect(draftOn(restored, TODAY)).toBe('пишу прямо сейчас');
    expect(journalDays(restored, TODAY)).toEqual([TODAY, YESTERDAY]);
  });

  it('throws away junk instead of the whole feed', () => {
    const restored = normalizeData({
      habits: [{ name: 'Вода' }],
      journal: {
        'не дата': [{ text: 'мусор' }],
        '2026-09-20': [{ text: 'ок' }, { text: '  ' }, 'строка'],
      },
      drafts: { '2026-09-19': 42, '2026-09-20': 'черновик' },
    });

    expect(Object.keys(restored.journal)).toEqual(['2026-09-20']);
    expect(notesOn(restored, '2026-09-20')).toHaveLength(1);
    expect(restored.drafts).toEqual({ '2026-09-20': 'черновик' });
  });

  it('starts empty on a fresh install', () => {
    expect(fresh().journal).toEqual({});
    expect(fresh().drafts).toEqual({});
  });
});
