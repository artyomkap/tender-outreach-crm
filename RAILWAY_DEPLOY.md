# Деплой на Railway

## Структура проекта

```
├── backend/   — NestJS API (порт 4000)
├── frontend/  — Next.js (порт 3000)
└── docker-compose.yml — локальная разработка
```

## Шаг 1. Создание проекта в Railway

1. Зайди на [railway.app](https://railway.app) и создай новый проект
2. Выбери **"Empty Project"**

## Шаг 2. Добавление PostgreSQL

1. Внутри проекта нажми **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway автоматически создаст базу данных
3. Скопируй `DATABASE_URL` из раздела **Variables** → **Connect** (формат: `postgresql://...`)

## Шаг 3. Деплой Backend

1. Нажми **"+ New"** → **"GitHub Repo"** → выбери этот репозиторий
2. В настройках сервиса:
   - **Root Directory**: `backend`
   - **Builder**: `Dockerfile`
3. Перейди в **Variables** и добавь:

```
PORT=4000
NODE_ENV=production
DATABASE_URL=<скопируй из PostgreSQL сервиса>
JWT_SECRET=<сгенерируй длинный случайный ключ>
JWT_REFRESH_SECRET=<сгенерируй другой длинный ключ>
FRONTEND_URL=https://<домен-фронтенда>.up.railway.app
```

> Для генерации ключей: `openssl rand -hex 32`

4. В **Settings** → **Networking**: сгенерируй публичный домен
5. Запомни URL бэкенда (например: `https://backend-xxx.up.railway.app`)

### Сидирование базы (создание админа)

После первого деплоя бэкенда выполни в Railway CLI:
```bash
railway run npm run seed
```

Или добавь переменную `DATABASE_URL` в Railway shell и запусти:
```bash
railway shell
cd backend
npx ts-node src/seeds/seed.ts
```

Данные для входа админа: `admin@admin.com` / `admin123`

## Шаг 4. Деплой Frontend

1. Нажми **"+ New"** → **"GitHub Repo"** → выбери этот же репозиторий
2. В настройках сервиса:
   - **Root Directory**: `frontend`
   - **Builder**: `Dockerfile`
3. Добавь **Build Arguments** (важно — это ARG для Docker):

```
NEXT_PUBLIC_API_URL=https://<домен-бэкенда>.up.railway.app/api
```

4. Добавь переменные:

```
PORT=3000
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://<домен-бэкенда>.up.railway.app/api
```

5. В **Settings** → **Networking**: сгенерируй публичный домен

## Шаг 5. Связывание сервисов

1. В настройках **Backend** обнови `FRONTEND_URL` на актуальный URL фронтенда
2. В настройках **Frontend** проверь что `NEXT_PUBLIC_API_URL` указывает на бэкенд с `/api`
3. Редеплой оба сервиса после изменения переменных

## Шаг 6. Кастомный домен (опционально)

1. В настройках сервиса → **Settings** → **Networking** → **Custom Domain**
2. Укажи свой домен и добавь CNAME запись в DNS

## Локальная разработка

```bash
# Быстрый старт с Docker
docker compose up

# Или вручную:
# 1. Запусти PostgreSQL
# 2. Backend:
cd backend
cp .env.example .env  # отредактируй подключение к БД
npm install
npm run start:dev

# 3. Frontend:
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## Переменные окружения

### Backend
| Переменная | Описание | Пример |
|---|---|---|
| `PORT` | Порт сервера | `4000` |
| `NODE_ENV` | Окружение | `production` |
| `DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Секрет JWT | Случайная строка 64+ символов |
| `JWT_REFRESH_SECRET` | Секрет refresh токена | Случайная строка 64+ символов |
| `FRONTEND_URL` | URL фронтенда (CORS) | `https://frontend.up.railway.app` |

### Frontend
| Переменная | Описание | Пример |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL API бэкенда | `https://backend.up.railway.app/api` |

## Роли пользователей

| Роль | Код | Доступ |
|---|---|---|
| Администратор | `admin` | Полный доступ: управление пользователями, статистика, все разделы |
| Директор | `director` | Просмотр пользователей, статистика, все аналитические разделы |
| Менеджер | `manager` | Просмотр отдельных пользователей, рабочие разделы |
| Техподдержка | `support` | Личный кабинет, тикеты |
| Продавец | `seller` | Личный кабинет, продажи |
| Маркетолог | `marketer` | Личный кабинет, маркетинг |
| Клиент | `client` | Личный кабинет |
| Партнёр | `partner` | Личный кабинет |

## API Документация

После деплоя бэкенда Swagger доступен по адресу:
```
https://<домен-бэкенда>.up.railway.app/api/docs
```
