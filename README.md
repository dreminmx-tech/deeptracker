<div align="center">

# ✅ deeptracker

**Минималистичный офлайн-трекер привычек для СДВГ-мозга.**
Пять типов привычек, мягкие серии «не пропускай дважды» и максимум три главных дела в день.
Без аккаунтов, рекламы и сети — все данные остаются в браузере.

### 🚀 [Открыть приложение →](https://dreminmx-tech.github.io/deeptracker/)

[![Deploy](https://github.com/dreminmx-tech/deeptracker/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/dreminmx-tech/deeptracker/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square&labelColor=141418)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-offline--first-0070f3?style=flat-square&labelColor=141418)](docs/technical.md#pwa)
[![Tests](https://img.shields.io/badge/tests-25%20passing-22c55e?style=flat-square&labelColor=141418)](docs/technical.md#tests)
[![React](https://img.shields.io/badge/React-19-0070f3?style=flat-square&labelColor=141418)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-0070f3?style=flat-square&labelColor=141418)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-0070f3?style=flat-square&labelColor=141418)](https://vite.dev)
[![Bundle](https://img.shields.io/badge/бандл-83%20kB%20gzip-333538?style=flat-square&labelColor=141418)](docs/technical.md#build)

</div>

---

## 🚀 Быстрый старт

**Ничего устанавливать не нужно:** [**dreminmx-tech.github.io/deeptracker**](https://dreminmx-tech.github.io/deeptracker/) — открывается в браузере, ставится на телефон и дальше работает без интернета.

Локально — три команды:

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm test         # 25 тестов: логика + рендер всех экранов
```

Сборка и просмотр продакшн-версии:

```bash
npm run build    # typecheck + dist/
npm run preview  # http://127.0.0.1:4173
```

| Хочу | Куда смотреть |
| --- | --- |
| 🚢 Задеплоить свою копию на GitHub Pages | [docs/deploy.md](docs/deploy.md) |
| 🔧 Как устроено внутри: логика, данные, тесты | [docs/technical.md](docs/technical.md) |
| 🎨 Палитра и токены темы | [docs/technical.md#palette](docs/technical.md#palette) |
| 🐛 Браузер не открывает localhost | [docs/deploy.md#troubleshooting](docs/deploy.md#troubleshooting) |

## ✨ Что внутри

- ✅ **Пять типов привычек** — отметка, счётчик с целью, минуты с таймером, «не делать» и гибкая частота вроде «3 раза в неделю».
- 🪶 **Мягкие серии** — «не пропускай дважды»: один пропущенный день не обнуляет прогресс, ломают только два подряд, а сегодняшний незакрытый день вообще не считается пропуском.
- 🎯 **«Главное сегодня»** — максимум три привычки наверху, остальные ниже: меньше паралича выбора.
- ⏱️ **«Просто начни»** — таймер на 2 минуты с минимальной версией привычки вместо целого дела.
- 🧠 **Брейн-дамп** — быстрый инбокс мыслей на сегодня, чтобы не держать их в голове.
- 📊 **Статистика без осуждения** — heatmap на 30 или 90 дней, серая шкала, ни одного красного цвета: пустая клетка — просто пустая клетка.
- 📴 **Полный офлайн** — service worker, манифест и иконки: приложение ставится на телефон и работает в самолёте.
- 🔒 **Приватность по умолчанию** — никаких аккаунтов, аналитики и сети; данные лежат в `localStorage`, бэкап — экспорт в JSON.
- 🌗 **Две темы** — тёмная в цветах дашборда DeepSeek Platform и строго чёрно-белая светлая. Интерфейс на русском и английском.

### 🗂 Типы привычек

| Тип | Как работает |
| --- | --- |
| ✅ Отметка | Сделано / не сделано, один тап по карточке |
| 🔢 Счётчик | Цель в день (например, 6 стаканов воды), кнопки − / + |
| ⏳ Минуты | Цель по времени, минуты накапливаются таймером |
| 🚫 Не делать | Чисто по умолчанию, отмечаются только срывы |
| 🔄 Гибкая частота | Например, 3 раза в неделю, с чипом `1/3 за неделю` |

## 📱 Установка на телефон

| Платформа | Как поставить |
| --- | --- |
| 🤖 Android / Chrome | Открыть сайт → меню браузера → **Установить приложение** (или кнопка в настройках приложения) |
| 🍎 iPhone / Safari | **Поделиться** → **На экран «Домой»** |

После установки приложение открывается без интернета и без адресной строки.

## 📚 Документация

| Документ | О чём |
| --- | --- |
| 🚢 [docs/deploy.md](docs/deploy.md) | Самостоятельный деплой на GitHub Pages: через `gh`, вручную, форком, свой домен, обновления, траблшутинг |
| 🔧 [docs/technical.md](docs/technical.md) | Стек, структура, модель данных, алгоритм мягких серий, хранение и импорт, PWA, палитра, тесты, скрипты |

## 📄 Лицензия

[MIT](LICENSE) — делай что хочешь, ссылка на автора приятна, но не обязательна.
