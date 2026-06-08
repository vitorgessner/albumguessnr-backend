# AlbumGuessnr — Backend

Este projeto consiste no Projeto Integrador do curso de Sistemas para Internet na Univali.

O projeto se trata de um jogo de adivinhação de álbuns musicais integrado (atualmente apenas) ao Last.fm. O sistema segue um fluxo de puxar álbuns ouvidos
pelo usuário usando seu username do Last.fm, normalizar nomes de álbuns, artistas, gêneros, tracks retirando palavras referentes a versionamento
(como version, remastered, edition), salvar no banco e exibir ao usuário a capa do álbum borrada permitindo que ele adivinhe o que queira.

## Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Linguagem**: TypeScript
- **ORM**: Prisma
- **Banco de dados**: Supabase (PostgreSQL)
- **HTTP Client**: Axios
- **Auth**: JWT (HttpOnly cookies) + Refresh Tokens
- **Email**: Resend
- **Outros**: cookie-parser, bcrypt, winston
- **Deploy**: Render
- **Monitoramento**: Uptimerobot


## Arquitetura

O projeto segue uma arquitetura modular por domínio:

```
src/
├── config/          # Prisma client, Axios, configurações globais
├── modules/
│   ├── auth/        # Registro, login, logout, verificação de email, refresh token
│   ├── profile/     # Perfil do usuário
│   ├── integration/ # Integração com Last.fm, sync de álbuns
│   └── album/       # Repositório de álbuns
├── shared/
│   ├── errors/      # Classes de erro customizadas
│   ├── middleware/  # Global error handler, rate limiter, sync middleware
│   └── utils/       # Utilitários compartilhados
└── generated/       # Tipos gerados pelo Prisma
```

Cada módulo possui sua própria camada de `Controller → Service → Repository`, com injeção de dependência manual.

## Principais Módulos

### Auth

- Registro com verificação de email (token via `randomBytes`, deletado após uso)
- Login com JWT armazenado em HttpOnly cookie
- Refresh token
- Rate limiting
- Prevenção de user enumeration — diversos endpoints de registro retornam 200 genérico

### Integration (Last.fm)

- Entidade `LastFmIntegration` separada do `User`/`Profile`
- Sync de álbuns via `user.getTopAlbums` (50 álbuns por página, paginado)
- Enriquecimento de dados via `album.getInfo` (tracks e gêneros/tags)
- Fire-and-forget com `Map<userId, boolean>` para prevenir race conditions
- Callback pattern para reset de estado sem acoplamento
- Sync progressivo: `lastPageSynced` e `lastSyncedAt` (cadência diária)
- Álbuns não encontrados no Last.fm (404) ou no MusicBrainz ou mesmo sem tracks, são salvos e logados os respectivos campos faltantes

### Game/Guess

- `GuessOrchestratorServic` e `GuessController` cuidam da orquestração de registrar uma tentativa de guess para cada categoria e para o álbum num geral com o próprio módulo de **Guess**, cálculo de pontuação usando o módulo **Scoring**, incremento de userStats usando o módulo de **Stats**, 

### Stats e Scoring

- Ambos são atualizados ao realizar uma guess para se evitar queries complexas ao banco.

## Normalização

Localizada em `modules/integration/utils/normalize.ts`:

- **`normalizeAlbumName`**: remove sufixos de edição (Remastered, Deluxe, etc.), lowercase
- **`normalizeArtistName`**: lowercase
- **`normalizeTrackName`**: idem ao álbum
- **`normalizeTagName`**: remove pontuação simbólica, lowercase
- Caracteres unicode (acentos, ç, ñ, etc.) são preservados
- Regex de edição: `EDITION_REGEX` cobre palavras-chave de versionamento

## Banco de dados (Prisma Schema — resumo)

```
User
  └── LastFmIntegration
        └── UserAlbumFamiliarity → Album
                                    ├── Track
                                    ├── AlbumsGenre → Genre
                                    └── AlbumsArtist → Artist
```

- `UserAlbumFamiliarity`: `@@id([lastFmIntegrationId, albumId])`
- `Album`: `@@unique([normalizedName, normalizedArtist])`
- `Track`: `@@unique([normalizedName, albumId])`

## Segurança

- CORS com `credentials: true` e `sameSite: 'strict' as const`
- Tokens de verificação de email deletados após uso
- Global error middleware centralizado
- Rate limiting por endpoint sensível

## O que está feito

- [x] Registro + verificação de email
- [x] Login / logout / refresh token
- [x] Integração com Last.fm (`connectLastfmUser`)
- [x] Sync de álbuns com paginação e cadência diária
- [x] Enriquecimento via `album.getInfo` (tracks + gêneros)
- [x] Normalização completa (álbum, artista, track, tag)
- [x] Endpoint `/integration/albums` retornando álbuns com tracks e gêneros
- [x] Sync middleware com fire-and-forget e básico
- [x] Ano do álbum (fonte: MusicBrainz via `mbid`, fallback por nome+artista ou mbid)
- [x] Timer no jogo (frontend)
- [x] Forgot/reset password
- [x] Zod — validação completa de env vars e inputs
- [x] Refresh route
- [x] Exibir quantas vezes o usuário adivinhou o álbum (`UserAlbumStats`)
- [x] Ver perfil de outros usuários
- [x] Adicionar outros usuários, como amigos
- [x] Ao adivinhar um álbum, exibir amigos que adivinharam também
- [x] Ganhar pontos ao acertar características do álbum
- [x] Ganhar pontos de acordo com a velocidade da tentativa
- [x] Leaderboard de pontos entre amigos
- [x] Leaderboard global
- [x] Visualização de estatísticas no perfil do usuário
- [x] Melhorias gerais e correção de bugs
- [x] Migrar imagens de usuário para Supabase Storage (remover pasta `public` do servidor)

## O que está aberto / falta fazer

- [ ] Zod schemas na edição de perfil

### Pós-MVP

- [ ] BullMQ + Redis (job queues para sync em background)
- [ ] Last.fm e outros serviços de streaming de música OAuth
- [ ] Índices de banco de dados
- [ ] Multiplayer

## Padrões e decisões de design

- **Controller**: controllers nunca sabem qual caminho interno foi tomado — toda lógica de branch fica no service
- **Repository**: repositórios nunca contêm lógica de negócio
- **Tratamento de Erros** (ex: email de notificação): envoltas em try/catch que loga e continua
- **Banco de Dados**: relacionamentos ausentes são modelados como entidades separadas (ex: `LastFmIntegration`)
- **Endpoint health**: Serve tanto para saber o estado da aplicação como também para o Uptimerobot deixar o deploy do Render ativo sem entrar em estado inativo
