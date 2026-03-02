# Bolão — Candidatos 2026

Bolão de apostas amigáveis para o Torneio de Candidatos de Xadrez 2026.  
Sem dinheiro envolvido — só a glória! ♚🏆

## Stack

- **Framework**: Next.js 14 (SSR + API Routes)
- **Linguagem**: TypeScript
- **ORM**: Prisma
- **Banco de Dados**: SQLite (dev) / PostgreSQL (prod)
- **Auth**: bcrypt + otplib (TOTP) — 100% in-app
- **Testes**: Jest + ts-jest

## Requisitos

- **Node.js** >= 18.x LTS (recomendado usar [nvm](https://github.com/nvm-sh/nvm) ou [Volta](https://volta.sh/))
- **npm** >= 9.x

## Início Rápido

### 1. Clonar o repositório

```bash
git clone <repo-url>
cd bolao_candidatos_tentativa_3
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copie o arquivo de exemplo e edite conforme necessário:

```bash
cp .env.example .env
```

As variáveis mais importantes:

| Variável | Descrição | Padrão (dev) |
|---|---|---|
| `DATABASE_URL` | URL do banco de dados | `file:./dev.db` |
| `SECRET_KEY` | Chave para criptografia AES (TOTP) | *deve ser alterada* |
| `TOTP_ISSUER` | Nome do emissor TOTP | `Bolao-2026` |

> **Precedência**: variáveis de ambiente do sistema operacional têm prioridade sobre valores do `.env`.

### 4. Gerar o cliente Prisma e rodar migrações

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. (Opcional) Popular o banco com dados de teste

```bash
npx ts-node prisma/seed.ts
```

Contas de teste criadas:
- **Gerente**: `gerente@bolao.com` / `Manager123`
- **Jogadores**: `jogador1@bolao.com`, `jogador2@bolao.com`, `jogador3@bolao.com` / `Jogador123`

### 6. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### 7. Rodar os testes

```bash
npm test
```

## Estrutura do Projeto

```
├── prisma/
│   ├── schema.prisma     # Modelos do banco de dados
│   └── seed.ts           # Script de seed
├── src/
│   ├── app/              # App Router (Next.js 14)
│   │   ├── api/          # API Routes
│   │   │   ├── auth/     # Login, registro, TOTP
│   │   │   ├── bets/     # Apostas
│   │   │   ├── championships/
│   │   │   ├── exports/  # Exportação CSV
│   │   │   ├── leaderboard/
│   │   │   ├── manager/  # CRUD do gerente
│   │   │   └── notifications/
│   │   ├── auth/         # Páginas de autenticação
│   │   ├── championships/
│   │   ├── manager/      # Painel do gerente
│   │   ├── notifications/
│   │   ├── globals.css   # Design system
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Dashboard
│   ├── components/       # Componentes React
│   │   ├── BetForm.tsx
│   │   └── Navbar.tsx
│   └── lib/              # Bibliotecas utilitárias
│       ├── crypto.ts     # AES-GCM encrypt/decrypt
│       ├── csrf.ts       # Proteção CSRF
│       ├── prisma.ts     # Singleton Prisma client
│       ├── rate-limit.ts # Rate limiting
│       ├── scoring.ts    # Motor de pontuação
│       └── sessions.ts   # Sessões server-side
├── __tests__/            # Testes unitários
├── .env.example          # Exemplo de variáveis de ambiente
├── .github/workflows/    # CI/CD
├── next.config.js
├── jest.config.js
├── tsconfig.json
└── package.json
```

## Funcionalidades

- ✅ Cadastro de usuários com roles (boleiro/gerente)
- ✅ Autenticação com senha (bcrypt) + TOTP obrigatório
- ✅ Sessões server-side com cookies HttpOnly
- ✅ Criação de campeonatos, rodadas e partidas
- ✅ Apostas com trava automática (10 min antes da partida)
- ✅ Pontuação automática (+1 resultado, +2 jogador correto)
- ✅ Classificação (leaderboard) atualizada em tempo real
- ✅ Notificações in-app
- ✅ Exportação CSV do leaderboard
- ✅ Rate limiting e proteção CSRF
- ✅ Design responsivo e acessível (pt-BR)

## Produção

Para produção, use PostgreSQL:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/bolao" npm run build
npm start
```

## Licença

Projeto pessoal, livre para uso entre amigos.
