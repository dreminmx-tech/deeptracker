import { useState, type ChangeEvent } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useStore } from '../store';
import { fill, t } from '../lib/i18n';
import { APP_VERSION } from '../lib/version';
import { downloadJson, freshData, parseImport } from '../lib/storage';
import { updateSettings } from '../lib/actions';
import { useInstallPrompt } from '../lib/useInstallPrompt';
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

  const [paste, setPaste] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);

  const offlineReady =
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    navigator.serviceWorker.controller !== null;

  function applyImport(text: string) {
    try {
      const next = parseImport(text);
      replace(next);
      setPaste('');
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

      <section className="card">
        <h2>{dict['settings.language']}</h2>
        <div className="segmented segmented-wide">
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
      </section>

      <section className="card">
        <h2>{dict['settings.theme']}</h2>
        <div className="segmented segmented-wide">
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
      </section>

      <section className="card">
        <h2>{dict['settings.data']}</h2>
        <p className="muted small">{dict['settings.exportHint']}</p>

        <div className="btn-col">
          <button type="button" className="btn" onClick={() => downloadJson(data)}>
            <Download size={ICON} strokeWidth={1.8} aria-hidden="true" />
            {dict['settings.export']}
          </button>
          <label className="btn file-btn">
            <Upload size={ICON} strokeWidth={1.8} aria-hidden="true" />
            {dict['settings.importFile']}
            <input type="file" accept="application/json,.json,text/plain" onChange={handleFile} hidden />
          </label>
        </div>

        <details className="disclosure">
          <summary>{dict['settings.importPasteToggle']}</summary>
          <div className="group">
            <label className="field">
              <textarea
                value={paste}
                rows={4}
                spellCheck={false}
                aria-label={dict['settings.importPaste']}
                placeholder={dict['settings.importPaste']}
                onChange={(event) => setPaste(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn"
              disabled={paste.trim().length === 0}
              onClick={() => applyImport(paste)}
            >
              {dict['settings.importApply']}
            </button>
          </div>
        </details>

        <div className="zone zone-danger">
          <p className="label">{dict['settings.dangerZone']}</p>
          <p className="muted small">{dict['settings.wipeHint']}</p>
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
          <>
            <p className="muted small">{dict['settings.installHint']}</p>
            <button type="button" className="btn btn-primary" onClick={() => void install()}>
              {dict['settings.install']}
            </button>
          </>
        ) : (
          <p className="muted small">{dict['settings.installIos']}</p>
        )}
        <p className="muted small">
          {dict['settings.offline']}: {offlineReady ? dict['common.yes'] : dict['common.no']}
        </p>
      </section>

      <section className="card">
        <h2>{dict['settings.help']}</h2>
        <p className="muted small">{dict['settings.helpBody']}</p>
      </section>

      <section className="card">
        <h2>{dict['settings.about']}</h2>
        <p className="muted small">{dict['settings.aboutText']}</p>
      </section>

      <p className="muted small center">{fill(dict['settings.version'], { v: APP_VERSION })}</p>

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
