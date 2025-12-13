# Laser Workshop Management Monorepo

Full-stack MVP platform for managing a small craft laser-cutting workshop.

## Stack

- **Monorepo:** pnpm + Turborepo
- **Backend API:** NestJS, PostgreSQL (Docker) + Prisma
- **Web app:** Next.js 14 (React, TypeScript, TailwindCSS)
- **Shared libs:** validation + pricing engine as workspace packages
- **Mobile:** planned (not implemented yet)

---

## 1. Local development setup

1. **Install pnpm** (version from `packageManager` in `package.json`).
2. **Start PostgreSQL via Docker:**
   ```bash
   docker compose up -d
   ```
   This starts Postgres on `localhost:5432` with database `laser` / user `laser` / password `laser`.
3. **Install dependencies:**
   ```bash
   pnpm install
   ```
4. **Apply Prisma schema & seed data:**
   ```bash
   pnpm prisma:migrate
   pnpm db:seed
   ```
   The Prisma datasource URL is currently inlined in `prisma/schema.prisma` and points to the Docker DB above.
5. **(Optional) Configure environment variables:**
   - API: copy `apps/api/.env.example` → `apps/api/.env` and adjust secrets / port if needed.
   - Web: copy `apps/web/.env.local.example` → `apps/web/.env.local` if you want to change the API URL.
6. **Start API and Web in dev mode (recommended):**
   - Terminal 1 (API, NestJS):
     ```bash
     pnpm dev:api
     ```
   - Terminal 2 (Web, Next.js):
     ```bash
     pnpm dev:web
     ```
   API runs on `http://localhost:4000`, Web on `http://localhost:3000`.

You can also run everything via Turborepo:

```bash
pnpm dev
```

---

## 2. Environment variables

### API (`apps/api/.env`)

The API uses `dotenv` to load `apps/api/.env`:

- `PORT` – server port (default: `4000`).
- `JWT_ACCESS_SECRET` – secret for access tokens (**change in production**).
- `JWT_REFRESH_SECRET` – secret for refresh tokens (**change in production**).
- `JWT_ACCESS_EXPIRES_IN` – access token TTL (default: `15m`).
- `JWT_REFRESH_EXPIRES_IN` – refresh token TTL (default: `7d`).

Database connection for Prisma in dev is **hard-coded** to the Docker Postgres instance inside `prisma/schema.prisma`. For non‑Docker / production setups, update the `datasource db` URL there and re-run `pnpm prisma:generate` / `pnpm prisma:migrate` as needed.

### Web (`apps/web/.env.local`)

The web app uses:

- `NEXT_PUBLIC_API_URL` – base URL for the API client.

Defaults to `http://localhost:4000` if the variable is not set.

In production (Docker), `NEXT_PUBLIC_API_URL` must be reachable from the user's browser (public host/IP), not a Docker-internal hostname like `http://api:4000`. Because it is a `NEXT_PUBLIC_` variable, it is inlined into the Next.js client build, so changing it requires rebuilding the web image.

---

## 3. Default login

After seeding, you get an admin user:

- Email: `admin@example.com`
- Password: `admin123`

This account has full ADMIN rights and is intended for local development only.

---

## 4. Implemented screens (MVP)

- **Dashboard** – basic cards for orders this week, revenue estimate, top materials, average production time.
- **Orders** – list with filters (status, search), order detail page with items, files and activity log.
- **Materials** – list with stock info and low-stock badge, detail page with stock movements history and adjustments.
- **Pricing** – interactive calculator using the pricing engine; shows material/machine/labor costs, total cost and recommended price; allows saving quotes.
- **Quotes** – list of saved quotes and detail view with stored input, breakdown and raw JSON payload.

Mobile worker app flows (queue, scanning, quick status updates) are planned but not implemented yet.

---

## 5. API docs

When the API is running, Swagger docs are available at:

- `http://localhost:4000/docs`

---

## 6. Template products (personalized items)

The app supports **reusable product templates** for personalized items (e.g. name ornaments, door signs, gift boxes). A template defines:

- A **base product** (`ProductTemplate`)
- One or more **variants** (`TemplateVariant` – size/material presets)
- One or more **personalization fields** (`TemplatePersonalizationField`)
- A set of **pricing rules** (`TemplatePricingRule`) on top of the normal material/machine pricing

### 6.1 Data model

Implemented via Prisma models in `schema.prisma`:

- `TemplateCategory` – groups templates (e.g. Ornaments, Names & Signs, Gift Boxes)
- `ProductTemplate` – the template itself (name, slug, default material, base size, layers)
- `TemplateVariant` – optional size/material variants per template
- `TemplatePersonalizationField` – fields the customer fills in (name, year, message, etc.)
- `TemplatePricingRule` – rules such as `FIXED_BASE`, `PER_CHARACTER`, `PER_CM2`, `PER_ITEM`, `LAYER_MULTIPLIER`, `ADD_ON_LINK`

Order items link back to templates via:

- `OrderItem.templateId` / `templateVariantId`
- `OrderItem.personalizationJson` – raw personalization data
- `OrderItem.derivedFieldsJson` – computed metrics (character count, layers, etc.)

### 6.2 Seeded demo templates

The Prisma seed (`pnpm db:seed`) creates a few demo entries:

- Categories: **Ornaments**, **Names & Signs**, **Gift Boxes**
- Templates:
  - `Name Ornament - Circle` (clear acrylic, round ornament, name + optional year)
  - `Door Name Sign` (birch plywood, horizontal name sign)
  - `Engraved Gift Box` (small box with engraved lid text)
- Each template gets at least one variant, a couple of personalization fields, and pricing rules (base price + per-character or per-cm² adjustments).

These are intended to be realistic starting points so you can test the full template flow without manual setup.

### 6.3 Template management UI

All template management screens are in the web app (admin area):

- **Templates list** – `/templates`
  - Filter by search, category, active status
  - Quick create for new templates
  - Shows counts for variants/fields/pricing rules
- **Template detail** – `/templates/:id`
  - **Details** tab: name, slug, category, default material, base size, layers, active flag
  - **Variants** tab: add/enable/disable variants
  - **Fields** tab: add fields and inline-edit label/required/affectsPricing/affectsProductionNotes
  - **Pricing rules** tab: add rules and inline-edit type/value/priority/variant

### 6.4 Using templates on orders

On the order detail page (`/orders/:id`):

- **Add item from template** (left column, within "Pricing summary" card)
  - Choose template, variant (optional), material (optional) and quantity
  - Fill in personalization fields (e.g. Name, Year)
  - **Preview price** – calls `POST /orders/:id/add-item-from-template` with `dryRun: true`
  - **Add item** – same endpoint without `dryRun`, creates a real `OrderItem`
- **Bulk add from template** (right column)
  - Reuses the selected template
  - Choose variant/material and which personalization field should receive the name from each line
  - Paste one name per line, optionally with `|qty` (e.g. `Ana`, `Bogdan|2`)
  - **Preview bulk** – `POST /orders/:id/bulk-add-from-template` with `dryRun: true`
  - **Add items** – same endpoint without `dryRun`, creates multiple `OrderItem` rows

Each resulting order item stores the template reference plus `personalizationJson` and a template-aware `priceSnapshotJson` from the shared pricing engine.

### 6.5 Textual screenshot descriptions

For accessibility and for understanding the UI without running it:

- **Screenshot: Templates list page** – a table with template rows showing name, category, active badge, default material, and counts for variants/fields/pricing rules. A sidebar form on the left lets you quickly add a new template.
- **Screenshot: Template detail – Fields tab** – a two-column layout: on the left, a small form to add a new personalization field; on the right, a list of existing fields, each in a card with label, key, type, required flag and an `Edit` button that opens inline controls.
- **Screenshot: Order detail – Add item from template** – on the left of the order detail page, a card under "Pricing summary" with dropdowns for template/variant/material, quantity input, a grid of personalization inputs, and buttons for `Preview price` and `Add item`, with a small summary of the previewed price.

---

## 7. Known limitations / notes

- **Single-tenant + single admin** – no multi-tenant or team management yet.
- **Auth:** no password reset flow; JWT secrets use simple dev defaults unless overridden.
- **Database URL:** inlined in `prisma/schema.prisma` for easier local setup; update it manually for other environments.
- **Files:** uploaded files are stored on the local filesystem under `uploads/`; there is no S3/Cloud storage wiring yet.
- **Pricing:** basic cost model (material area, machine time, simple add-ons, margin) – no tax/VAT/currency management.
- **Mobile app:** basic Expo app with Today Queue, batch management, and offcut logging.

This README is focused on the current MVP; as features evolve, extend it with additional flows and deployment notes.

---

## 8. WordPress SSO & Membership Entitlements

The app supports integration with a WordPress membership site (LaserfilesPro) for:

- **Single Sign-On (SSO):** Users can log in with their WordPress/membership account
- **Plan-based feature gating:** Features are locked/unlocked based on the user's subscription plan
- **Numeric limits:** Templates, offcuts, batches, etc. have plan-based limits

### 8.1 Plans and Features

| Plan | Features | Limits |
|------|----------|--------|
| **GUEST** | None | All zeros |
| **FREE** | Basic pricing, basic templates, basic exports | 3 templates, 1 batch |
| **STARTER** | + Personalization, batch mode, offcuts, analytics | 10 templates, 5 batches, 50 offcuts |
| **PRO** | + Advanced pricing, unlimited templates, Etsy/WooCommerce sync, seasons | 1000 templates, 100 batches, 10K offcuts |
| **LIFETIME** | All features, highest limits | Effectively unlimited |

Feature flags and limits are defined in `packages/shared/src/entitlements.ts` and `packages/shared/src/wp-plugin-contract.ts`.

### 8.2 Dev Mode (Local Development)

For local development without a WordPress site, set in your `.env`:

```env
ENTITLEMENTS_DEV_MODE=1
```

This returns **PRO** entitlements for any user, allowing full access to all features.

To test different plans in dev mode, you can modify `EntitlementsService.getDevEntitlements()` in `apps/api/src/entitlements/entitlements.service.ts` or use the `ENTITLEMENTS_DEV_PLAN` environment variable:

```env
ENTITLEMENTS_DEV_MODE=1
ENTITLEMENTS_DEV_PLAN=STARTER
```

### 8.3 SSO Login Flow

1. User clicks "Continue with LaserfilesPro account" on login page
2. In dev mode: enter any string as the "WP token" (treated as wpUserId)
3. API calls `POST /auth/wp-sso` which:
   - Fetches entitlements for the wpUserId
   - Creates/links a local User via `UserIdentityLink`
   - Saves a `WorkspacePlanSnapshot` for audit
   - Returns JWT tokens + entitlements
4. Web/Mobile stores tokens and entitlements in localStorage/AsyncStorage
5. Plan badge appears in the sidebar/header

### 8.4 Feature Gating

When a user tries to access a locked feature:

- **API:** Returns `403 Forbidden` with `{ code: 'FEATURE_LOCKED', feature: '...' }`
- **Web/Mobile:** Shows a user-friendly message explaining the feature requires an upgrade

When a user hits a numeric limit:

- **API:** Returns `403 Forbidden` with `{ code: 'LIMIT_REACHED', limitKey: '...', limit: N, current: M }`
- **Web/Mobile:** Shows a message with the limit and suggestions (delete items or upgrade)

### 8.5 WordPress Plugin Contract

The WordPress plugin should expose these REST endpoints (defined in `packages/shared/src/wp-plugin-contract.ts`):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/laserfiles/v1/auth/validate-token` | POST | Validate SSO token, return user identity |
| `/laserfiles/v1/entitlements/{wpUserId}` | GET | Get user's plan, features, limits |
| `/laserfiles/v1/webhooks/entitlements-changed` | POST | Notify when plan changes |
| `/laserfiles/v1/auth/login-url` | GET | Generate SSO redirect URL |

Environment variables for WP integration:

```env
WP_PLUGIN_BASE_URL=https://laserfilespro.com/wp-json/laserfiles/v1
WP_PLUGIN_API_KEY=your-server-to-server-key
WP_PLUGIN_CLIENT_ID=laser-workshop-app
WP_PLUGIN_WEBHOOK_SECRET=your-webhook-secret
```

### 8.6 Database Models

Two Prisma models support the entitlements system:

- **`UserIdentityLink`** – Links a local `User` to an external identity (WordPress user ID)
- **`WorkspacePlanSnapshot`** – Audit trail of entitlements at login time (plan, features, limits)

These enable offline entitlements validation and identity federation.
#   l a s e r f i l e s - c a l c u l a t o r 
 
 