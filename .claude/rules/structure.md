# Структура

- Раздел = папка в `docs/` с `_category_.json` (`label`, `position`). Пример: `docs/backend/nestjs/`.
- Группы меню оригинала → подпапки с русским `label` (NestJS: Overview → `overview/` «Обзор»). Страницы вне групп (Introduction) лежат в корне раздела.
- Имя файла — slug страницы оригинала на английском (`introduction.md`, `first-steps.md`).
- `sidebar_position` страницы — порядок как в меню оригинала.
