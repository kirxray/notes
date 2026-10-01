# Конспект

Docusaurus-сайт с переводами официальной документации на русский. Только русский язык, оригинал не дублируем.

- Dev-сервер: `npm start` → http://localhost:7007
- Поиск — локальный (`@easyops-cn/docusaurus-search-local`, языки `ru` + `en`). Индекс строится при сборке; для dev `npm start` сначала запускает `npm run search-index` (build + копия `build/search-index.json` в `static/`, файл в `.gitignore`). После правок текста индекс в dev устаревает — перезапустить `npm run search-index`.
- Проверка перед завершением: `npm run build` (битые ссылки и ошибки MDX валят сборку).

Правила разбиты по темам в `.claude/rules/`:

- `structure.md` — разделы, файлы, сайдбар
- `page-format.md` — оформление переведённой страницы
- `links.md` — перенос ссылок и заглушки `TODO-LINK`
