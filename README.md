# Full Stack Lead Distribution System

# Lead-Distribution

Next.js App Router, Prisma, PostgreSQL, transactional allocation, idempotent webhook quota reset, and live dashboard updates through Server-Sent Events.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment values:

```bash
cp .env.example .env
```

3. Start PostgreSQL, or use the included Docker Compose database:

```bash
docker compose up -d
```

4. Run migrations and seed data:

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

5. Start the app:

```bash
npm run dev
```

Open:

- `/request-service` for the public lead form
- `/dashboard` for provider quota and lead assignments
- `/test-tools` for webhook and bulk lead simulations

## Deployment

Set `DATABASE_URL` in the deployment environment, then run:

```bash
npm run prisma:deploy
npm run build
npm run start
```

For serverless hosting, SSE works per running instance. For multi-instance production, replace the in-memory event emitter in `lib/realtime.ts` with Redis pub/sub or a managed realtime transport while keeping the same publish/subscribe boundary.

## Verification

The project has been checked with:

```bash
npm run lint
npm run build
```

`npm audit` currently reports a remaining moderate advisory through Next.js/PostCSS. The high-severity Next 14 advisories were removed by upgrading to Next 16.2.6; npm's suggested fix for the remaining item would downgrade Next, so it is intentionally not applied.

## Business Rules Implemented

- Same `phone + serviceId` cannot create duplicate leads because of the `Lead` unique constraint.
- Each lead is assigned to exactly three providers inside the same transaction that creates the lead.
- Mandatory providers are applied first:
  - Service 1: Provider 1
  - Service 2: Provider 5
  - Service 3: Provider 1 and Provider 4
- Remaining providers are chosen through persisted round-robin state in `AllocationState`.
- Provider quota is spent with guarded SQL updates: quota only increments when `usedQuota < monthlyQuota`.
- Webhook quota reset is idempotent through unique `WebhookEvent.eventId`.
