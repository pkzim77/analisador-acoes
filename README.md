# Analisador de Ações

Aplicação web para acompanhar cotações de ações da B3. Digite um ticker (ex: `PETR4`) e ele é adicionado a uma tabela persistida em banco de dados, com preço, variação, indicadores fundamentalistas, setor, tag along, RSI e preço-teto calculado pelos métodos de Bazin, Graham e Lynch.

## Stack

- **Frontend:** React + Vite + AG Grid
- **Backend:** Node.js + Express
- **Banco de dados:** PostgreSQL (Neon)

## Fontes de dados

- **[brapi.dev](https://brapi.dev)** — preço, variação, volume, faixa de 52 semanas, P/L, LPA, histórico curto (sparkline/RSI) e setor. Tudo vem da cotação básica + módulo `summaryProfile`, que continuam liberados no plano gratuito.
- **[fundamentus.com.br](https://www.fundamentus.com.br)** — VPA, Dividend Yield e crescimento de receita (5 anos), usados nas fórmulas de preço-teto.
- **[statusinvest.com.br](https://statusinvest.com.br)** — Tag Along, não disponível nas outras duas fontes.

Fundamentus e StatusInvest não têm API oficial — o backend faz scraping das páginas públicas de cada ticker (`backend/src/services/fundamentusService.js` e `backend/src/services/statusInvestService.js`). Por não serem APIs oficiais, qualquer falha nesse scraping (mudança de layout, indisponibilidade) faz os campos correspondentes ficarem `null` em vez de quebrar a requisição — preço e o resto dos dados continuam funcionando normalmente.

## Configuração

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edite `backend/.env` e preencha:

```
DATABASE_URL=postgres://usuario:senha@host/banco?sslmode=require
BRAPI_TOKEN=seu_token_da_brapi_dev
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173
```

Crie a tabela no banco (roda `db/schema.sql` contra o `DATABASE_URL`):

```bash
npm run db:init
```

### 2. Frontend

```bash
cd frontend
npm install
```

## Rodando em desenvolvimento

Na raiz do projeto (sobe backend na porta 3001 e frontend na porta 5173 juntos):

```bash
npm install
npm run dev
```

Ou individualmente, em dois terminais:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

Acesse http://localhost:5173.

## API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/stocks` | Lista as ações rastreadas |
| POST | `/api/stocks` | Adiciona um ticker (`{ "ticker": "PETR4" }`) |
| DELETE | `/api/stocks/:ticker` | Remove um ticker rastreado |
| POST | `/api/stocks/:ticker/refresh` | Atualiza a cotação de um ticker |
| GET | `/api/stocks/:ticker/history` | Histórico curto (1 mês) usado no sparkline e no RSI |
