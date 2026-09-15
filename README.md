# StockFlow

**Know your inventory. Predict your demand. Never run out.**

StockFlow is a production-oriented inventory, purchasing, sales, analytics, and demand-forecasting platform for small and medium-sized businesses.

## Architecture

- `apps/web` — Next.js + TypeScript frontend
- `apps/api` — NestJS + TypeScript REST API
- `packages/contracts` — shared API/domain types
- `prisma` — PostgreSQL schema and seed
- `docker-compose.yml` — PostgreSQL + Redis local infrastructure

## Core domain

Multi-tenant organizations, users/RBAC, warehouses, products, suppliers, inventory, stock movements, purchase orders, sales orders, transfers, alerts, forecasts, recommendations, and audit logs.

## Getting started

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The web app runs on `http://localhost:3000` and the API on `http://localhost:4000`.

## Docker

```bash
docker compose up --build
```

## Demo account

Use the seeded demo account documented in `.env.example`/seed output for local development. Do not use demo credentials in production.

## Forecasting

The first forecasting release uses moving-average baselines and weighted moving averages from persisted sales history. Forecasts expose their methodology and are not presented as opaque AI predictions. Reorder recommendations combine current available stock, inbound stock, reserved stock, demand during supplier lead time, and safety stock derived from demand variability when sufficient history exists.
