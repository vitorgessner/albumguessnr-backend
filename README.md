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
- **Email**: Nodemailer
- **Outros**: cookie-parser, bcrypt

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

## Módulos

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
- Condição de guarda: `album.getInfo` só é chamado para álbuns sem tracks no banco
- Fire-and-forget com `Map<userId, boolean>` para prevenir race conditions
- Callback pattern para reset de estado sem acoplamento
- Sync progressivo: `lastPageSynced` e `lastSyncedAt` (cadência diária)
- Singles (álbuns sem tracklist) são ignorados no sync
- Álbuns não encontrados no Last.fm (404) são pulados sem interromper o sync

### Album

- Deduplicação de tracks com mesmo `normalizedName` antes do insert

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

## O que está aberto / falta fazer

- [ ] Forgot/reset password
- [ ] Zod — validação completa de env vars e inputs
- [ ] Responsividade (frontend)
- [ ] Embaralhamento de pixels da capa do álbum borrada

### Até 21/04

- [ ] Ano do álbum (fonte: MusicBrainz via `mbid`, fallback por nome+artista ou mbid)
- [ ] Timer no jogo (frontend)

### Até 28/04

- [ ] Exibir quantas vezes o usuário adivinhou o álbum (`UserAlbumStats`)
- [ ] Melhorias gerais e correção de bugs

### Pós-MVP

- [ ] BullMQ + Redis (job queues para sync em background)
- [ ] Last.fm e outros serviços de streaming de música OAuth
- [ ] Índices de banco de dados
- [ ] Migrar imagens de capa para Supabase Storage (remover pasta `public` do servidor)
- [ ] Multiplayer

## Padrões e decisões de design

- **Controller**: controllers nunca sabem qual caminho interno foi tomado — toda lógica de branch fica no service
- **Repository**: repositórios nunca contêm lógica de negócio
- **Tratamento de Erros** (ex: email de notificação): envoltas em try/catch que loga e continua
- **Banco de Dados**: relacionamentos ausentes são modelados como entidades separadas (ex: `LastFmIntegration`)
- **Early returns** no lugar de condicionais aninhados
