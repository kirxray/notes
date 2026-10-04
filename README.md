# Конспект

Переводы официальной документации на русский язык — личный конспект на [Docusaurus](https://docusaurus.io/).

Сайт: https://kirxray.github.io/notes/

- Только русский текст, оригинал не дублируется — в начале каждой страницы есть ссылка на него, версия и дата перевода.
- Код и команды не переводятся, комментарии в коде — переводятся.
- Свои пометки, которых нет в оригинале, выделены блоком `:::note[Примечание]`.

## Что переведено

### NestJS

| Раздел | Страницы |
| --- | --- |
| — | Introduction |
| Обзор (Overview) | First steps, Controllers, Providers, Modules, Middleware, Exception filters, Pipes, Guards, Interceptors, Custom decorators |
| Основы (Fundamentals) | Custom providers, Asynchronous providers |

## Структура

```text
docs/
├── intro.md                  # главная страница («О конспекте»)
└── backend/
    └── nestjs/
        ├── introduction.md
        ├── overview/         # раздел меню «Обзор»
        └── fundamentals/     # раздел меню «Основы»
static/img/nestjs/            # схемы из оригинальной документации
src/css/custom.css            # стили (в т. ч. инверсия схем в тёмной теме)
.claude/                      # правила оформления переводов
.github/workflows/deploy.yml  # сборка и деплой на GitHub Pages
```

- Раздел — папка в `docs/` с `_category_.json` (`label`, `position`).
- Имя файла — slug страницы оригинала (`first-steps.md`, `custom-providers.md`).
- Правила оформления страниц и переноса ссылок — в [`.claude/rules/`](.claude/rules/).

## Разработка

Нужен Node.js 20+.

```bash
yarn install
npm start
```

Dev-сервер: http://localhost:7007

Поиск локальный, его индекс строится только при сборке. Поэтому `npm start` сначала собирает сайт и копирует индекс в `static/search-index.json`. Если поменяли текст при запущенном сервере, индекс в dev устаревает — обновите его:

```bash
npm run search-index
```

## Проверка

```bash
npm run build
```

Сборка падает на битых ссылках и ошибках MDX — запускайте её перед коммитом.

## Деплой

Автоматический: при пуше в `main` GitHub Actions собирает сайт и публикует его на GitHub Pages (`.github/workflows/deploy.yml`). В настройках репозитория **Settings → Pages → Source** должно быть выбрано **GitHub Actions**.
