# AlbumGuessnr Backend - EN

Backend API for AlbumGuessnr, the music album guessing game. The project combines user authentication, music service integrations, and data synchronization to power the game, statistics, social system, and the daily album challenge.

## Overview

The application is built with TypeScript and Express, using Prisma as the ORM, PostgreSQL as the primary database, and Supabase for avatar storage. The backend handles:

- local and OAuth authentication
- integration with music providers (Spotify, Last.fm, Google)
- album and user metadata synchronization
- game rules and scoring
- rankings, friends, and statistics
- daily album and guess attempts
- usage logging and observability

## Stack

- Runtime: Node.js
- Framework: Express 5
- Language: TypeScript
- ORM: Prisma
- Database: PostgreSQL
- Storage: Supabase
- Auth: JWT in HttpOnly cookies + refresh tokens
- OAuth: Google, Spotify, Last.fm
- Email: Resend
- Messaging: RabbitMQ / CloudAMQP
- Scheduling: node-cron
- Validation: Zod
- Logging: Winston + morgan
- Deploy: Render / operational environment with health checks

## Architecture

The application follows a modular, domain-based structure, with manual dependency injection in `app.ts` and a `Controller → Service → Repository` layered separation.

```text
src/
├── app.ts                  # route and dependency wiring
├── server.ts               # API bootstrap
├── config/                 # Prisma, env, logger, RabbitMQ, Supabase
├── modules/
│   ├── album/              # album catalog and data
│   ├── auth/               # local auth, cookies, OAuth, users, password reset
│   ├── dailyAlbum/         # daily album and guess attempts
│   ├── friends/            # requests, friendship, and relationships
│   ├── game/               # sync middleware and guess orchestration
│   ├── game/guess/         # guess attempts, history, and game rules
│   ├── integration/        # provider sync and normalization
│   ├── integration/providers/ # Spotify/Last.fm wrappers and consumers
│   ├── leaderboards/       # global and social rankings
│   ├── profile/            # profile, editing, and public data
│   ├── scoring/            # score calculation
│   ├── stats/              # overall and per-album statistics
│   ├── userLogs/           # internal user data logs
│   └── ...
├── shared/
│   ├── config/             # env and shared configuration
│   ├── errors/             # app exceptions
│   ├── middlewares/        # auth, validation, error handler
│   └── utils/              # helpers, cron, health checks, retry
└── generated/              # generated Prisma client
```

## Main features

### 1. Authentication and account

- local registration with email and password
- email verification via token
- login with JWT in HttpOnly cookie
- refresh token with secure routing
- logout and password reset
- guest user creation
- authentication with Google, Spotify, and Last.fm
- provider account linking and main account selection

### 2. Music provider integration

- syncing user data from Spotify and Last.fm
- pagination and incremental album retrieval
- album enrichment with track, genre, and artist data
- name normalization to avoid duplicate albums
- album year retrieval via MusicBrainz / fallback by name and artist
- storing sync errors and failures for diagnostics
- RabbitMQ workers for asynchronous sync processing

### 3. Game and guessing

- guess attempts by category: album, artist, genre, year, and track
- score calculation per category and response time
- attempt logging, best scores, and history
- user statistics updates without complex real-time queries
- orchestration architecture to centralize guess-attempt logic

### 4. Daily album

- admin-selected daily album
- pool of candidate albums
- per-user daily attempt
- overall and individual daily album statistics
- attempt and performance tracking

### 5. Social system and rankings

- friend requests and status control (pending, friend, denied, cancelled)
- public user profiles
- global and friends leaderboard
- performance and statistics comparison between users

### 6. Security and operations

- CORS with credentials enabled
- rate limiting on sensitive routes
- global error-handling middleware
- structured logging with Winston
- health check at `/health`
- endpoint protection with required or optional authentication

## Data modeling and normalization

The database is modeled to avoid duplicating albums, artists, genres, and tracks. Some key points:

- `Album` uses `normalizedName + normalizedArtist` as its uniqueness key
- `Track` uses `normalizedName + albumId` as its uniqueness key
- `UserAlbumFamiliarity` links user and album with a familiarity score
- `UserStats` centralizes overall user statistics
- `GuessAttempt` records guess attempts and scores
- `UserFriends` represents the friendship network and requests
- `DailyAlbum` and `UserDailyAlbum` handle the daily challenge

## Main routes

### Authentication

- `GET /health`
- `GET /me`
- `POST /login`
- `POST /register`
- `DELETE /logout`
- `POST /refresh`
- `POST /forgot`
- `PUT /passwordChange/:passwordResetToken`
- `GET /verify/:userVerificationToken`
- `POST /resendVerification`
- `GET /guest` / `POST /guest`

### OAuth

- `GET /login/google`
- `GET /google/callback`
- `GET /login/spotify`
- `GET /spotify/callback`

### Profile and user

- `GET /profile/:username`
- `PATCH /profile/:username/edit`
- `GET /stats/:username`

### Integration and providers

- `GET /integration/albums`
- `DELETE /provider/spotify`
- `DELETE /provider/lastfm`
- `GET /login/spotify`
- `GET /login/google`

### Game and guess

- `POST /guess`
- `GET /guess/:albumId`
- `GET /guess/recently`

### Daily album

- `POST /daily/import`
- `GET /daily/album`
- `POST /daily/album`
- `POST /daily/find`
- `POST /daily/album/try`
- `GET /daily/album/statistics`
- `GET /daily/album/overall/statistics`
- `PUT /daily/album/overall/statistics`

### Friends, scoring, ranking, and statistics

- `GET /friend/...`
- `GET /scoring/...`
- `GET /leaderboards/...`
- `GET /stats/...`

## Environment variables

The project requires a `.env` file with the values below. A base example is available in `.env.example`.

```env
PORT=
FRONTEND_URL=
BASE_URL=
NODE_ENV=
DATABASE_URL=
DIRECT_URL=
SUPABASE_URL=
SUPABASE_API_KEY=
SECRET_JWT=
RESEND_API_KEY=
API_KEY=
LOG_LEVEL=
DEFAULT_AVATAR=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_OAUTH_REDIRECT_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URL=
LASTFM_CLIENT_SECRET=
LASTFM_OAUTH_REDIRECT_URL=
RABBITMQ_URL=
CRON_API_KEY=
```

### Notes

- `DATABASE_URL` and `DIRECT_URL` are used by Prisma with PostgreSQL
- `SUPABASE_URL` and `SUPABASE_API_KEY` support avatar upload and retrieval
- `SECRET_JWT` is required to generate/validate tokens
- `RABBITMQ_URL` enables the asynchronous sync consumers
- `CRON_API_KEY` is used for scheduling / automation routines

## Running locally

1. Install dependencies:

```bash
npm install
```

2. Create the environment file:

```bash
cp .env.example .env
```

3. Set the variables in `.env` for your local environment.

4. Generate the Prisma client:

```bash
npx prisma generate
```

5. Apply database migrations:

```bash
npx prisma migrate deploy
```

6. Start the development server:

```bash
npm run dev
```

7. For a production build:

```bash
npm run build
npm run start
```

## Available scripts

```bash
npm run dev         # development with tsx watch
npm run build       # compiles TypeScript
npm run start       # runs the compiled build in dist/
npm run lint       # lints with ESLint
npm run format      # applies prettier to TS/JS/MD/YAML files
```

## Observability and operations

- health endpoint at `/health`
- error logs with sanitized context and stack traces
- database and RabbitMQ connection monitoring
- global middleware to catch exceptions without leaking details in production

## Roadmap and improvements

Items in progress or planned / improvements to make / known limitations and bugs:

- [ ] database index optimization
- [ ] further refinement of the bulk sync flow
- [ ] more robust queue and jobs for background processing
- [ ] expanded music provider integrations
- [ ] multiplayer / real-time challenges
- [ ] add daily album streak design to the user profile (something like a badge and progress bar)
- [ ] implement caching for the daily album
- [ ] enable sharing daily album guesses on social media
- [ ] show more hints as the user makes attempts on the daily album
- [ ] increase the number of descriptors and genres compared
- [ ] fix bug when trying to connect to an existing Google account after guessing the daily album while not logged in
- [ ] limit the number of albums synced during the initial sync
- [ ] allow the user to choose the main provider for syncing music
- [ ] fix refresh token bug when the user is connected via Google
- [ ] improve metrics collection
- [ ] Google Analytics Measurement Protocol (also collect on the backend, useful for users with adblockers)
- [ ] customizable Google Analytics events for key system metric operations
- [ ] create a login_events table for better metrics collection
- [ ] detect the number of users using an adblocker

# AlbumGuessnr Backend - PT-BR

API backend do jogo de adivinhação de álbuns musicais AlbumGuessnr. O projeto combina autenticação de usuários, integração com serviços de música e sincronização de dados para alimentar o jogo, as estatísticas, o sistema social e o desafio diário de álbum.

## Visão geral

A aplicação foi construída em TypeScript com Express e Prisma, usando PostgreSQL como banco principal e Supabase para armazenamento de avatares. O backend cuida de:

- autenticação local e via OAuth
- conexão com provedores de música (Spotify, Last.fm, Google)
- sincronização de álbuns e metadados do usuário
- regras de jogo e pontuação
- rankings, amigos e estatísticas
- album diário e tentativas de palpite
- logs de uso e observabilidade

## Stack

- Runtime: Node.js
- Framework: Express 5
- Linguagem: TypeScript
- ORM: Prisma
- Banco de dados: PostgreSQL
- Storage: Supabase
- Auth: JWT em cookies HttpOnly + refresh tokens
- OAuth: Google, Spotify, Last.fm
- Email: Resend
- Mensageria: RabbitMQ / CloudAMQP
- Agendamento: node-cron
- Validação: Zod
- Logs: Winston + morgan
- Deploy: Render / ambiente operacional com health checks

## Arquitetura

A aplicação segue uma estrutura modular por domínio, com injeção manual de dependências no `app.ts` e separação em camadas `Controller → Service → Repository`.

```text
src/
├── app.ts                  # montagem de rotas e dependências
├── server.ts               # bootstrap da API
├── config/                 # Prisma, env, logger, RabbitMQ, Supabase
├── modules/
│   ├── album/              # catálogo e dados de álbuns
│   ├── auth/               # auth local, cookies, OAuth, usuários, reset de senha
│   ├── dailyAlbum/         # álbum diário e tentativas
│   ├── friends/            # solicitações, amizade e relacionamento
│   ├── game/               # middleware de sincronização e guess orchestration
│   ├── game/guess/         # tentativa de palpite, histórico e regras do jogo
│   ├── integration/        # sincronização com providers e normalização
│   ├── integration/providers/ # wrappers e consumers para Spotify/Last.fm
│   ├── leaderboards/       # ranking global e por rede social
│   ├── profile/            # perfil, edição e dados públicos
│   ├── scoring/            # cálculo de pontuações
│   ├── stats/              # estatísticas gerais e por álbum
│   ├── userLogs/           # logs internos de dados do usuário
│   └── ...
├── shared/
│   ├── config/             # env e configurações compartilhadas
│   ├── errors/             # exceções da app
│   ├── middlewares/        # auth, validação, error handler
│   └── utils/              # helpers, cron, health checks, retry
└── generated/              # client Prisma gerado
```

## Principais funcionalidades

### 1. Autenticação e conta

- registro local com e-mail e senha
- verificação de e-mail por token
- login com JWT em cookie HttpOnly
- refresh token com roteamento seguro
- logout e reset de senha
- criação de usuários convidados
- autenticação com Google, Spotify e Last.fm
- vínculo de contas de provedores e seleção de conta principal

### 2. Integração com provedores musicais

- sincronização de dados do usuário a partir do Spotify e Last.fm
- paginação e recuperação incremental de álbuns
- enriquecimento de álbum com dados de tracks, gêneros e artistas
- normalização de nomes para evitar duplicidades do mesmo álbum
- recuperação de ano do álbum via MusicBrainz / fallback por nome e artista
- armazenamento de erros e falhas de sincronização para diagnóstico
- workers em RabbitMQ para processar sincronização assíncrona

### 3. Jogo e adivinhação

- tentativa de palpite por categoria: álbum, artista, gênero, ano e faixa
- cálculo de pontuação por categoria e por tempo de resposta
- registro de tentativas, melhores pontuações e histórico
- atualização de estatísticas do usuário sem consultas complexas em tempo real
- arquitetura de orquestração para centralizar a regra da tentativa

### 4. Álbum diário

- seleção de álbum diário por admin
- pool de álbuns candidatos
- tentativa diária por usuário
- estatísticas gerais e individuais do álbum do dia
- medição de tentativas e desempenho

### 5. Sistema social e rankings

- solicitações de amizade e controle de status (pending, friend, denied, cancelled)
- perfil público de usuários
- leaderboard global e por amigos
- comparação de desempenho e estatísticas do usuário

### 6. Segurança e operação

- CORS com credenciais habilitadas
- rate limiting em rotas sensíveis
- middleware global de erros
- logs estruturados com Winston
- health check em `/health`
- proteção de endpoints com autenticação obrigatória ou opcional

## Normalização e modelagem de dados

A base de dados foi modelada para evitar duplicação de álbuns, artistas, gêneros e faixas. Alguns pontos importantes:

- `Album` usa `normalizedName + normalizedArtist` como chave de unicidade
- `Track` usa `normalizedName + albumId` como chave de unicidade
- `UserAlbumFamiliarity` liga usuário e álbum com score de familiaridade
- `UserStats` centraliza estatísticas gerais do usuário
- `GuessAttempt` registra tentativas e pontuações por palpite
- `UserFriends` representa a rede de amizades e pedidos
- `DailyAlbum` e `UserDailyAlbum` tratam o desafio diário

## Rotas principais

### Autenticação

- `GET /health`
- `GET /me`
- `POST /login`
- `POST /register`
- `DELETE /logout`
- `POST /refresh`
- `POST /forgot`
- `PUT /passwordChange/:passwordResetToken`
- `GET /verify/:userVerificationToken`
- `POST /resendVerification`
- `GET /guest` / `POST /guest`

### OAuth

- `GET /login/google`
- `GET /google/callback`
- `GET /login/spotify`
- `GET /spotify/callback`

### Perfil e usuário

- `GET /profile/:username`
- `PATCH /profile/:username/edit`
- `GET /stats/:username`

### Integração e provedores

- `GET /integration/albums`
- `DELETE /provider/spotify`
- `DELETE /provider/lastfm`
- `GET /login/spotify`
- `GET /login/google`

### Jogo e guess

- `POST /guess`
- `GET /guess/:albumId`
- `GET /guess/recently`

### Álbum diário

- `POST /daily/import`
- `GET /daily/album`
- `POST /daily/album`
- `POST /daily/find`
- `POST /daily/album/try`
- `GET /daily/album/statistics`
- `GET /daily/album/overall/statistics`
- `PUT /daily/album/overall/statistics`

### Amigos, pontuação, ranking e estatísticas

- `GET /friend/...`
- `GET /scoring/...`
- `GET /leaderboards/...`
- `GET /stats/...`

## Variáveis de ambiente

O projeto exige um arquivo `.env` com os dados abaixo. O exemplo base está em `.env.example`.

```env
PORT=
FRONTEND_URL=
BASE_URL=
NODE_ENV=
DATABASE_URL=
DIRECT_URL=
SUPABASE_URL=
SUPABASE_API_KEY=
SECRET_JWT=
RESEND_API_KEY=
API_KEY=
LOG_LEVEL=
DEFAULT_AVATAR=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_OAUTH_REDIRECT_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URL=
LASTFM_CLIENT_SECRET=
LASTFM_OAUTH_REDIRECT_URL=
RABBITMQ_URL=
CRON_API_KEY=
```

### Observações

- `DATABASE_URL` e `DIRECT_URL` são usados pelo Prisma com PostgreSQL
- `SUPABASE_URL` e `SUPABASE_API_KEY` suportam upload e leitura de avatares
- `SECRET_JWT` é obrigatório para gerar/validar tokens
- `RABBITMQ_URL` habilita os consumers assíncronos de sincronização
- `CRON_API_KEY` é usado em rotinas de agendamento / automação

## Como rodar localmente

1. Instale as dependências:

```bash
npm install
```

2. Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

3. Ajuste as variáveis do `.env` com os valores do seu ambiente local.

4. Gere o client do Prisma:

```bash
npx prisma generate
```

5. Aplique as migrações do banco:

```bash
npx prisma migrate deploy
```

6. Inicie o servidor em modo desenvolvimento:

```bash
npm run dev
```

7. Para build de produção:

```bash
npm run build
npm run start
```

## Scripts disponíveis

```bash
npm run dev         # desenvolvimento com tsx watch
npm run build       # compila TypeScript
npm run start       # executa a build já compilada em dist/
npm run lint       # lints com ESLint
npm run format      # aplica prettier em arquivos TS/JS/MD/YAML
```

## Observabilidade e operação

- health endpoint em `/health`
- logs de erros com contexto e stack sanitizados
- monitoramento de conexão com banco e RabbitMQ
- middleware global para capturar exceções sem vazamento de detalhes em produção

## Roadmap e melhorias

Itens em evolução ou planejados / melhorias a se fazer / limitações e bugs conhecidos:

- [ ] otimização de índices no banco
- [ ] mais refinamento no fluxo de sincronização massiva
- [ ] queue e jobs mais robustos para background processing
- [ ] expansão de integrações de provedores musicais
- [ ] multiplayer / desafios em tempo real
- [ ] adicionar design de streak de álbum diário no perfil do usuário (algo como uma badge e barra de progresso)
- [ ] implementar cache para o álbum diário
- [ ] possibilitar compartilhar álbum diário adivinhado em redes sociais
- [ ] exibir mais dicas conforme o usuário vai fazendo tentativas no álbum diário
- [ ] aumentar número de descriptors e gêneros comparados
- [ ] resolver bug de tentar conectar à uma conta google já existente após adivinhar álbum diário sem estar logado
- [ ] limitar quantidade de álbuns sincronizados no sync inicial
- [ ] possibilitar ao usuário escolher o provider principal para sincronizar as músicas
- [ ] resolver bug de refresh token quando o usuário está conectado pelo google
- [ ] melhorar coleta de métricas
- [ ] google analytics measurement protocol (coleta também no backend, bom para usúarios com adblocker)
- [ ] eventos customizáveis no google analytics para operações importantes nas métricas do sistema
- [ ] criar tabela de login_events para melhor coleta de métricas
- [ ] identificação de número de usuários utilizando adblocker
