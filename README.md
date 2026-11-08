# Котоба Сампо (言葉散歩)

Личное приложение для изучения японского: уроки хираганы с порядком черт и проверкой письма, повторения по FSRS, фразы и разбор песен. Без серий дней, наград и рекламы.

- Сайт: GitHub Pages из корня ветки `main`.
- Профили и синхронизация: Supabase, функции `kotoba_login` и `kotoba_save` (см. `supabase_setup.sql`).
- Исходники в `src/`; `python3 build_web.py` (из `src/`, рядом нужны `supa.json` и папка `dictw/` со словарём) собирает `index.html`.

Сторонние материалы: порядок черт — [KanjiVG](https://kanjivg.tagaini.net) (CC BY-SA 3.0, Ulrich Apel); разбор текста — [kuromoji.js](https://github.com/takuyaa/kuromoji.js) и словарь IPADIC (Apache 2.0).
