# Ссылки

1. **Внутренние ссылки на документацию оригинала** (`/first-steps`, `/cli/overview`, `https://docs.nestjs.com/...`):
   - если страница уже переведена — обычная относительная ссылка на `.md`-файл: `[Первые шаги](./first-steps.md)`;
   - если ещё нет — убираем ссылку, оставляем текст и сразу после него MDX-комментарий-заглушку:

     ```md
     Nest CLI{/* TODO-LINK: https://docs.nestjs.com/cli/overview — CLI → Overview */}
     ```

     Формат: `TODO-LINK: <полный URL оригинала> — <Раздел меню> → <Страница>`. Комментарий не виден на сайте.
   - URL и названия раздела/страницы берём из меню оригинала, а не из текста ссылки (в тексте бывают устаревшие пути, например `/techniques/cookies` вместо `/http/cookies`): `https://raw.githubusercontent.com/nestjs/docs.nestjs.com/master/src/app/shared/nav/nav-items.ts`.
   - Ссылка на якорь другой страницы: `TODO-LINK: https://docs.nestjs.com/application/validation#stripping-properties — Application → Validation → Stripping properties`.
2. **Якоря на той же странице** (`#alternatives`, а также `controllers#status-code` / `/controllers#...` внутри страницы controllers → `#status-code`) — оставляем как есть, они работают благодаря явным id заголовков.
3. **Внешние ссылки** (nodejs.org, GitHub, статьи) — оставляем без изменений; если ресурс на английском, можно дописать «(на английском)».
4. **После перевода новой страницы** — найти заглушки, которые на неё указывают, и заменить на ссылки:

   ```bash
   grep -rn "TODO-LINK: https://docs.nestjs.com/first-steps" docs/
   ```
