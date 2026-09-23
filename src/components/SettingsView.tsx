import { useState, type ChangeEvent } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useStore } from '../store';
import { fill, t } from '../lib/i18n';
import { dateKey, diffDays, formatDay, todayKey } from '../lib/date';
import { downloadJson, freshData, parseImport } from '../lib/storage';
import { updateSettings } from '../lib/actions';
import { hasAnyData } from '../lib/habits';
import { APP_VERSION } from '../lib/version';
import { useInstallPrompt } from '../lib/useInstallPrompt';
import { copyDiagnostics } from '../lib/diagnostics';
import Modal from './Modal';
import { useToast } from './Toast';

const ICON = 16;

/**
 * Settings follow the same pattern as everything else: one card per topic,
 * 16px inside, 12px between children, actions in a row, danger separated by a rule.
 */
export default function SettingsView() {
  const { data, update, replace } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const notify = useToast();
  const { canInstall, installed, install } = useInstallPrompt();

  const [confirmWipe, setConfirmWipe] = useState(false);

  const lastExport = data.settings.lastExport;
  const backupAge = lastExport ? diffDays(dateKey(new Date(lastExport)), todayKey()) : null;
  const backupStale = hasAnyData(data) && (backupAge === null || backupAge >= 21);

  function applyImport(text: string) {
    try {
      const next = parseImport(text);
      replace(next);
      notify(dict['settings.importOk'], 'ok');
    } catch {
      notify(dict['settings.importBad']);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      applyImport(await file.text());
    } catch {
      notify(dict['settings.importBad']);
    }
  }

  return (
    <div className="stack">
      <header className="view-head">
        <h1>{dict['settings.title']}</h1>
      </header>

      {/* Two settings, two rows. A full-width switch for a binary choice was the
          heaviest control in the app; now it is a label with a small switch right.
          Язык и тема — те же 44px, что у кнопок данных: контролы одной высоты. */}
      <section className="card">
        <h2>{dict['settings.general']}</h2>

        <div className="set-row">
          <span className="row-name">{dict['settings.language']}</span>
          <div className="segmented" role="group" aria-label={dict['settings.language']}>
            <button
              type="button"
              data-active={lang === 'ru' ? 'true' : 'false'}
              onClick={() => update((current) => updateSettings(current, { lang: 'ru' }))}
            >
              Русский
            </button>
            <button
              type="button"
              data-active={lang === 'en' ? 'true' : 'false'}
              onClick={() => update((current) => updateSettings(current, { lang: 'en' }))}
            >
              English
            </button>
          </div>
        </div>

        <div className="set-row">
          <span className="row-name">{dict['settings.theme']}</span>
          <div className="segmented" role="group" aria-label={dict['settings.theme']}>
            <button
              type="button"
              data-active={data.settings.theme === 'dark' ? 'true' : 'false'}
              onClick={() => update((current) => updateSettings(current, { theme: 'dark' }))}
            >
              {dict['settings.theme.dark']}
            </button>
            <button
              type="button"
              data-active={data.settings.theme === 'light' ? 'true' : 'false'}
              onClick={() => update((current) => updateSettings(current, { theme: 'light' }))}
            >
              {dict['settings.theme.light']}
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>{dict['settings.data']}</h2>

        {/* Two identical actions. Settings has no main button — so nothing here is blue,
            and the line below says whether a backup is due. */}
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            onClick={() => {
              downloadJson(data);
              update((current) => updateSettings(current, { lastExport: new Date().toISOString() }));
            }}
          >
            <Download size={ICON} strokeWidth={1.8} aria-hidden="true" />
            {dict['settings.export']}
          </button>
          <label className="btn file-btn">
            <Upload size={ICON} strokeWidth={1.8} aria-hidden="true" />
            {dict['settings.importFile']}
            <input type="file" accept="application/json,.json,text/plain" onChange={handleFile} hidden />
          </label>
        </div>

        <p className="muted small">
          {lastExport
            ? fill(dict['settings.lastExport'], {
                date: formatDay(dateKey(new Date(lastExport)), lang, false),
              })
            : dict['settings.neverExported']}
          {backupStale
            ? ` ${lastExport ? dict['settings.backupStaleCta'] : dict['settings.backupNeverCta']}`
            : ''}
        </p>

        <div className="zone zone-danger">
          <p className="label">{dict['settings.dangerZone']}</p>
          <button type="button" className="btn btn-danger" onClick={() => setConfirmWipe(true)}>
            <Trash2 size={ICON} strokeWidth={1.8} aria-hidden="true" />
            {dict['settings.wipe']}
          </button>
        </div>
      </section>

      <section className="card">
        <h2>{dict['settings.install']}</h2>
        {installed ? (
          <p className="muted small">{dict['settings.installed']}</p>
        ) : canInstall ? (
          <button type="button" className="btn" onClick={() => void install()}>
            {dict['settings.install']}
          </button>
        ) : (
          <p className="muted small">{dict['settings.installIos']}</p>
        )}
      </section>

      <section className="card">
        <h2>{dict['settings.about']}</h2>
        <p className="muted small">{dict['settings.aboutText']}</p>
      </section>

      <p className="muted small center">{fill(dict['settings.version'], { v: APP_VERSION })}</p>

      {/* Ниже — не для человека, а для разбора полётов: размеры считает браузер
          на телефоне, и без его чисел правки вёрстки превращаются в догадки. */}
      <div className="center">
        <button type="button" className="link" onClick={() => void copyDiagnostics(notify, dict['settings.diagnoseCopied'])}>
          {dict['settings.diagnose']}
        </button>
      </div>

      {confirmWipe ? (
        <Modal
          title={dict['settings.wipe']}
          onClose={() => setConfirmWipe(false)}
          closeLabel={dict['common.close']}
          footer={
            <>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  replace({ ...freshData(lang), settings: { ...data.settings } });
                  setConfirmWipe(false);
                }}
              >
                {dict['settings.wipeYes']}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmWipe(false)}>
                {dict['settings.wipeNo']}
              </button>
            </>
          }
        >
          <p>{dict['settings.wipeConfirm']}</p>
        </Modal>
      ) : null}
    </div>
  );
}
