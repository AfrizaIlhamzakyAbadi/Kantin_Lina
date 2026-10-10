# Kantin Lina 🍱

Pre-order food system for a school canteen.

| Layer | Tech |
|---|---|
| Frontend | React (Vite) on Cloudflare Pages |
| API | Cloudflare Pages Functions (`functions/api/*`) |
| Database | Firebase Firestore (client SDK from the frontend) |
| Payments | Midtrans Dynamic QRIS (created by Cloudflare Functions) |

> Status: **scaffold only**. Routing, config and function shells exist; UI components and business logic are marked with `TODO`.

## Project structure

```
├── functions/api/
│   ├── checkout.js     # POST /api/checkout  -> requests QRIS from Midtrans
│   └── webhook.js      # POST /api/webhook   -> Midtrans payment notification
├── src/
│   ├── firebase/config.js   # Firebase init (reads VITE_FIREBASE_* env vars)
│   ├── pages/               # Route stubs: Home, Menu, Cart, Payment, NotFound
│   ├── App.jsx              # Routes
│   └── main.jsx             # BrowserRouter entry
├── public/_redirects        # SPA fallback for Cloudflare Pages
├── firestore.rules          # Dummy rules: no client writes to menu/orders
├── firebase.json            # Lets Firebase CLI deploy firestore.rules
├── wrangler.toml            # Cloudflare Pages config
└── .env.example             # Template for all keys
```

## Local development

```bash
npm install
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
# Then create .dev.vars (see "Where to paste your keys" below)
```

**Frontend only** (Vite, hot reload, no `/api`):

```bash
npm run dev          # http://localhost:5173
```

**Full stack** (frontend + Cloudflare Functions, reads `.dev.vars`):

```bash
npm run build
npm run dev:cf       # http://localhost:8788  (wrangler pages dev ./dist)
```

> `dev:cf` serves the *built* `dist/`, so re-run `npm run build` after frontend changes.

Test a function locally (placeholder amount until implemented):

```bash
curl -X POST http://localhost:8788/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Budi","items":[{"id":"nasi-goreng","qty":1}]}'
```

## Where to paste your keys

There are **two files** and they hold different keys. Both are git-ignored.

### 1. Firebase (frontend) → `.env`

Copy `.env.example` to `.env`, then fill in from  
**Firebase Console → Project Settings → General → Your apps → SDK setup and configuration**:

| `.env` variable | Firebase field |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

Restart `npm run dev` after editing `.env`.

### 2. Midtrans + Firebase service account (backend) → `.dev.vars`

Create a file named `.dev.vars` in the project root (same folder as `package.json`):

```ini
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxx
MIDTRANS_IS_PRODUCTION=false

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

- **Midtrans keys:** Midtrans Dashboard → Settings → Access Keys (use the **Sandbox** environment while testing).
  The Client Key also goes in `.env` as `VITE_MIDTRANS_CLIENT_KEY` if the frontend needs it.
- **Firebase service account:** Firebase Console → Project Settings → Service accounts → *Generate new private key*.
  Copy `project_id`, `client_email`, `private_key` from the downloaded JSON. Do **not** commit that JSON.
- Restart `npm run dev:cf` after editing `.dev.vars`.

### 3. Production (Cloudflare Pages)

Cloudflare Dashboard → **Workers & Pages → your project → Settings → Variables and Secrets**.
Add every variable from **both** sections above (`VITE_*` variables must exist at **build time**).
Set `MIDTRANS_IS_PRODUCTION=true` and use the Production keys when going live.

### 4. Midtrans webhook URL

Midtrans Dashboard → Settings → Configuration → **Payment Notification URL**:

```
https://<your-site>.pages.dev/api/webhook
```

(For local testing, expose port 8788 with a tunnel such as `cloudflared tunnel --url http://localhost:8788`.)

## Firestore data

Created by the owner in the Firebase Console (clients can only read them):

| Path | Fields |
|---|---|
| `menu/{itemId}` | `name` (string), `price` (number, IDR), `stock` (number), optional `description`, `imageUrl`, `category`, `available` (boolean, `false` hides the item) |
| `settings/schedule` | optional `days` (array, `0`=Sun … `6`=Sat, default `[1,2,3,4,5]`), `openTime` (`"08:00"`), `closeTime` (`"16:00"`), `closedDates` (array of `"YYYY-MM-DD"`). If the doc is missing, Mon-Fri 08:00-16:00 is used. |

The exact `stock` number is never shown to customers; they only see "Sold out".

## Firestore rules

`firestore.rules` is a **dummy**: clients can read but never write `menu` / `orders`. Writes happen only from Cloudflare Functions using the service account.
Deploy with:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project <your-project-id>
```

## Deploying to Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- `functions/` is detected automatically at the repo root.

## Remaining TODOs

- `checkout.js`: fetch real prices from Firestore, compute `gross_amount`, create the `orders` doc.
- `webhook.js`: update `orders/{id}` status via Firestore REST + service account.
- Build real UI in `src/pages/`.
- Tighten `firestore.rules` read access for `orders`.
