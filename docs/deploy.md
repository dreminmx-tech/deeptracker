# 🚢 Своя копия на GitHub Pages

Приложение — статический сайт, поэтому деплой сводится к публикации папки `dist/`.
Ни сервера, ни базы, ни переменных окружения не нужно; хостинг бесплатный.

Текущая живая версия (DeepTracker): **https://dreminmx-tech.github.io/deeptracker/**

## ✅ Что уже настроено в этом репозитории

- `.github/workflows/deploy.yml` — на каждый пуш в `main`: `npm ci` → тесты → сборка → публикация `dist/`;
- Pages включён с источником **GitHub Actions** (`build_type=workflow`);
- в `vite.config.ts` стоит `base: './'`, поэтому один и тот же `dist/` работает и на `user.github.io/repo/`, и на своём домене — пути править не нужно;
- `actions/configure-pages` вызывается с `enablement: true`, так что в форке Pages включится сам при первом запуске.

---

## 🍴 Вариант A — форк (быстрее всего)

1. **Fork** этого репозитория.
2. Во вкладке **Actions** нажать *I understand my workflows, go ahead and enable them* (в форках workflows выключены).
3. **Actions → Deploy to GitHub Pages → Run workflow** (или просто сделать любой коммит).
4. Через минуту сайт будет на `https://<твой-логин>.github.io/deeptracker/`.

Если хочется другое имя в адресе — переименуй репозиторий: workflow и относительные пути это переживут.

> **Про имя.** Приложение называется **DeepTracker**, а репозиторий и адрес остаются `deeptracker`
> в нижнем регистре: `STORAGE_KEY = 'deeptracker.v1'`, `id` манифеста `./` и имя файла бэкапа
> `deeptracker-YYYY-MM-DD.json` менять нельзя — иначе потеряются данные у тех, кто уже пользуется.
> Имя в интерфейсе берётся из `index.html` (`<title>`, OG, JSON-LD) и `public/manifest.webmanifest`.

## ⚡ Вариант B — с нуля через `gh`

```bash
git init -b main
git add .
git commit -m "DeepTracker"
gh repo create deeptracker --public --source=. --remote=origin
gh api -X POST repos/<user>/deeptracker/pages -f build_type=workflow
git push -u origin main
```

Последняя команда запускает первый деплой. Следить: `gh run watch`.

## 🧰 Вариант C — вручную, без `gh`

1. Создать пустой публичный репозиторий на GitHub.
2. Запушить код:
   ```bash
   git init
   git add .
   git commit -m "DeepTracker"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```
3. **Settings → Pages → Source: GitHub Actions**.
4. Вкладка **Actions** — сборка и деплой пройдут автоматически.

Альтернатива без CI: `npm run build` и выложить содержимое `dist/` в ветку `gh-pages`
(годится, если не хочется давать Actions права).

## 🔁 Как обновлять

```bash
git add -A
git commit -m "что изменилось"
git push
```

Пуш в `main` пересобирает и переопубликовывает сайт (~30 секунд). Вручную — **Actions → Deploy to GitHub Pages → Run workflow**.

> ⚠️ **Важно:** если менял оболочку (иконки, `manifest.webmanifest`, статику из `public/`) — подними
> `CACHE_VERSION` в `public/sw.js`. Иначе у тех, кто уже установил приложение, останется старая версия
> этих файлов в кэше service worker. `index.html` и хэшированные ассеты обновляются сами.

## 🌐 Свой домен

1. **Settings → Pages → Custom domain** → ввести домен, поставить галочку *Enforce HTTPS*.
2. У регистратора добавить `CNAME` на `<user>.github.io` (для apex-домена — `A`-записи GitHub).
3. Сборку менять не нужно: `base: './'` уже даёт корректные относительные пути.

Абсолютные URL в проекте захардкожены под `dreminmx-tech.github.io/deeptracker` — их стоит заменить на свой домен:

| Файл | Что заменить |
| --- | --- |
| `index.html` | `rel="canonical"`, `og:url`, `og:image`, `twitter:image`, `url` внутри JSON-LD |
| `public/sitemap.xml` | `<loc>` |
| `public/robots.txt` | строка `Sitemap:` |

Проверить можно так: `grep -rn "dreminmx-tech.github.io" --include="*.html" --include="*.xml" --include="*.txt" .`

## ✅ Проверка после деплоя

```bash
npm run build && npm run preview          # локально
node scripts/smoke.mjs http://127.0.0.1:4173/

node scripts/smoke.mjs https://<user>.github.io/<repo>/   # живой сайт
```

Ожидаемый вывод — `SMOKE OK`: отдаются `index.html`, бандл, `sw.js`, манифест и иконки.
Дальше стоит открыть сайт в браузере, поставить приложение на телефон и проверить, что оно открывается
в авиарежиме (первый запуск обязательно должен быть онлайн, чтобы service worker встал в кэш).

<a id="troubleshooting"></a>

## 🐛 Траблшутинг

| Симптом | Причина | Что делать |
| --- | --- | --- |
| `localhost:5173` — «не удаётся установить соединение» | Vite с `host: localhost` мог забиндиться только на IPv6 `::1`, а браузер идёт на `127.0.0.1` | В конфиге уже стоит `host: '127.0.0.1'`; открывай `http://127.0.0.1:5173/`. Если порт занят старым процессом, Vite возьмёт 5174 — смотри строку `➜ Local:` в выводе |
| Порт занят после закрытия терминала | остался висеть прошлый `vite` | `Ctrl+C` в том терминале либо завершить процесс `node` в диспетчере задач |
| Pages: 404 или белая страница | источник Pages не переключён на Actions, либо деплой ещё идёт | **Settings → Pages → Source: GitHub Actions**, затем Actions → Run workflow |
| Сборка падает на `npm ci` | нет `package-lock.json` в репозитории | Закоммитить `package-lock.json` (он в проекте есть и не игнорируется) |
| В Actions ошибка про права/токен | workflow без `pages: write` / `id-token: write` | Вернуть блок `permissions` из `.github/workflows/deploy.yml` |
| Изменения не видны после деплоя | кэш service worker или кэш браузера | Поднять `CACHE_VERSION` в `public/sw.js`, обновить страницу с `Ctrl+Shift+R` |
| Приложение не предлагает установку | нет HTTPS, либо уже установлено, либо браузер без поддержки | Pages всегда отдаёт HTTPS; для Android — Chrome, для iOS — Safari → «Поделиться» → «На экран „Домой“» |
| Тёмная/светлая тема «мигает» при загрузке | тема применяется до первого кадра инлайн-скриптом в `index.html` | Если правил `index.html` — не удаляй этот скрипт и ключ `deeptracker.v1` в нём |
