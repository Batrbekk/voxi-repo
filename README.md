# Voxi - AI Voice Agent Platform

Платформа для создания и управления AI голосовыми агентами с интеграцией Gemini Live.

## Структура проекта

```
voxi-repo/
├── backend/          # NestJS backend с Gemini Live
├── frontend/         # Next.js frontend
├── asterisk/         # Asterisk конфигурация для медиа
├── kamailio/         # Kamailio SIP proxy
└── docker-compose.yml
```

## Технологии

- **Backend**: NestJS, MongoDB, Gemini Live API
- **Frontend**: Next.js 14, React, TailwindCSS
- **VoIP**: Asterisk (медиа), Kamailio (SIP)
- **AI**: Google Gemini Live API, RAG

## Быстрый старт

### Локальная разработка

```bash
# Клонировать репозиторий
git clone https://github.com/Batrbekk/voxi-repo.git
cd voxi-repo

# Настроить переменные окружения
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Запустить все сервисы
docker compose up -d

# Установить зависимости backend
cd backend && npm install && npm run build
cd ..

# Установить зависимости frontend
cd frontend && npm install
cd ..

# Запустить в dev режиме
npm run dev
```

### Production деплой

```bash
# Собрать все сервисы
docker compose -f docker-compose.prod.yml build

# Запустить
docker compose -f docker-compose.prod.yml up -d
```

## Функционал

### Gemini Live Integration
- ✅ Real-time bidirectional audio streaming
- ✅ WebSocket для браузера (тестирование)
- ✅ SIP integration для телефонных звонков
- ✅ Asterisk медиа обработка
- ✅ Kamailio SIP маршрутизация

### AI Features
- Настраиваемые системные промпты
- База знаний (RAG)
- Голосовые настройки
- Приветственные сообщения
- Анализ разговоров

### VoIP
- Входящие звонки
- Исходящие звонки
- Пакетные звонки
- Запись разговоров
- Real-time транскрипция

## API Endpoints

### Agents
- `POST /api/agents` - Создать агента
- `GET /api/agents` - Список агентов
- `GET /api/agents/:id` - Получить агента
- `PATCH /api/agents/:id` - Обновить агента

### Conversations
- `GET /api/conversations` - История звонков
- `GET /api/conversations/:id` - Детали звонка
- `GET /api/conversations/:id/recording` - Запись звонка

### Knowledge Base
- `POST /api/knowledge-bases` - Создать базу знаний
- `POST /api/knowledge-bases/:id/documents/text` - Добавить текст
- `POST /api/knowledge-bases/:id/documents/url` - Добавить из URL

## Переменные окружения

### Backend (.env)
```env
# Database
MONGODB_URI=mongodb://mongodb:27017/voxi

# Google Gemini
GEMINI_API_KEY=your_api_key

# SIP
KAMAILIO_HOST=kamailio
KAMAILIO_PORT=5060
ASTERISK_HOST=asterisk
ASTERISK_ARI_PORT=8088
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

## Лицензия

Proprietary
