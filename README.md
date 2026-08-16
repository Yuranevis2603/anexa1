# Anexa Club

Приватна бізнес-спільнота — SaaS платформа .

## Статус (Тиждень 1 — Фундамент)

Готово в цьому скелеті:
- Next.js 14 (App Router) + TypeScript + Tailwind
- Дизайн-система (`tailwind.config.ts`) — кольори, glow-тіні, шрифти, взяті з
  оригінального прев'ю, щоб новий UI лишався візуально ідентичним
- `Sidebar` + `Header` + `DashboardLayout` з усіма пунктами меню з брифу
- Supabase: клієнти для браузера й сервера (`lib/supabase`), SQL-схема
  (`supabase/schema.sql`) з таблицями `profiles` та `invite_codes` (під
  закритий бета-запуск) + RLS-політики

## Запуск локально

```bash
npm install
cp .env.example .env.local   # встав свої Supabase URL + anon key
npm run dev
```

## Наступні кроки

1. Створити проєкт на Supabase, виконати `supabase/schema.sql` у SQL Editor
2. Додати auth-сторінки (логін/реєстрація)
3. Задеплоїти на Vercel, підключити env-змінні там само
4. Далі — модуль **Feed** (тиждень 2 плану)

## Правила розробки

Дивись `docs/instructions.md` (інструкція для Claude Code) — порядок модулів
і принципи архітектури звідти є обов'язковими для всієї подальшої розробки.
