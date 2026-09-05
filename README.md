# CRM платформа

Внутрішня CRM для команди, що супроводжує P2P-трейдерів (платіжний процесинг,
Індія): портфель трейдерів, картка трейдера з історією та задачами,
щоденний огляд менеджера, оцінка ризику відтоку та внутрішні новини.

## Стек

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** — дизайн-система на CSS-змінних (`app/tokens.css`),
  тільки перевикористовувані компоненти з `components/ui`
- **Supabase** — Postgres + Auth (email/password) + Row Level Security
  через `@supabase/ssr` (окремі клієнти для браузера, сервера та proxy)

## Структура

```
app/(dashboard)/   екрани CRM (за middleware-guard'ом /login)
app/login/         сторінка входу
components/ui/     базові компоненти дизайн-системи
components/*/      композиції для конкретних екранів
lib/               Supabase-клієнти, типи, форматування, бізнес-логіка
supabase/migrations/  SQL-міграції — виконуються вручну в SQL Editor
proxy.ts           сесія Supabase + редіректи /login <-> захищені сторінки
```

## Локальний запуск

1. Встановіть залежності:

   ```bash
   npm install
   ```

2. Створіть `.env.local` у корені проєкту (він у `.gitignore` і не
   потрапляє в коміти):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-public-key>
   ```

   Значення беруться з Supabase Dashboard → Project Settings → API.

3. У Supabase SQL Editor виконайте міграції з `supabase/migrations/` по
   порядку (0001 → 0002 → 0003). 0002 — сідові дані, перед ним потрібно
   вручну створити кількох auth-користувачів; деталі — коментарями
   на початку самого файлу.

4. Запустіть дев-сервер:

   ```bash
   npm run dev
   ```

   Відкриється на [http://localhost:3000](http://localhost:3000) і
   одразу редіректить на `/login`.

## Інші команди

```bash
npm run build   # production-збірка
npm run start   # запуск production-збірки локально
npm run lint    # ESLint
```
