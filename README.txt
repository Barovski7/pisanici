KLATI.ME V2 — full-stack prototype

Файлове:
- wrangler.toml — Worker + Static Assets + D1 binding
- src/worker.js — API, login/session, CRUD
- schema.sql — D1 таблица posts
- public/index.html — публичният сайт
- public/admin-login.html — админ вход
- public/admin.html — админ редактор

Необходима конфигурация:
1. Създай D1 база с име klati-db.
2. Изпълни schema.sql в нея.
3. След първоначалния deploy вържи D1 базата към Worker-а от Settings → Bindings → D1 database.
   Не е нужно да редактираш wrangler.toml за първоначалния deploy.
4. Задай Worker secret-и:
   ADMIN_PASSWORD
   SESSION_SECRET
5. Deploy като Worker със Static Assets.
6. Вържи klati.me към новия Worker.
