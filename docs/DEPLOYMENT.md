# Deployment Guide — Pokemon Tracker & TCG Investor

This guide covers everything required to deploy and run the new monorepo version of **Pokemon Tracker & TCG Investor**, featuring the Vue 3 SPA frontend, Hono Node.js API backend, libSQL database, and Google OAuth / Drive sheet seeding.

---

## 1. Architecture & Deployment Strategy

```
                          ┌────────────────────────┐
                          │  User / Web Browser    │
                          └───────────┬────────────┘
                                      │
                         HTTPS (DNS / Custom Domain)
                                      │
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │                Vercel Edge / Host               │
             │                                                 │
             │   /*              ──►  apps/web/dist (Static)   │
             │   /api/* (Rewrite)──►  api/index.ts  (Serverless│
             │                        Hono Function)           │
             └───────────────┬─────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌─────────────────────────┐       ┌────────────────────────┐
│  Turso Cloud (libSQL)   │       │   Google Cloud APIs    │
│  - collector_profiles   │       │   - Google OAuth 2.0   │
│  - expansions & cards   │       │   - Google Drive API   │
│  - price_history        │       │   - Google Sheets API  │
└─────────────────────────┘       └────────────────────────┘
```

### Key Components
1. **Frontend (`apps/web`)**: Vue 3 + Vite + Tailwind CSS SPA, compiled to `apps/web/dist`.
2. **Backend (`apps/api` / `api/index.ts`)**: Hono Node.js server mounted as a Vercel Serverless Function via `@hono/node-server/vercel`.
3. **Database Layer (`@libsql/client` + Drizzle ORM)**:
   - **Local / Self-Hosted**: Embedded SQLite file (`file:local.db`).
   - **Serverless Production (Vercel)**: Remote **Turso Cloud** libSQL database (prevents data loss from serverless ephemeral storage). Tables are automatically initialized on startup via `ensureDatabaseTables()`.
4. **Shared Types (`packages/shared`)**: Shared domain contracts imported by both frontend and backend.

---

## 2. Prerequisites & Required Accounts

Before starting, ensure you have access to:
- [GitHub](https://github.com/) repository with latest code.
- [Vercel](https://vercel.com/) account (Free Hobby tier works).
- [Turso](https://turso.tech/) account (Free tier includes 9GB storage & 500 databases).
- [Google Cloud Console](https://console.cloud.google.com/) for Google Sign-in credentials.

---

## 3. Step-by-Step Setup

### Step 3.1: Provision the Database (Turso Cloud)

Since Vercel serverless functions have ephemeral, read-only filesystems, production requires a managed libSQL instance. Turso is natively compatible with `@libsql/client`.

#### Option A: Using the Turso CLI
1. Install Turso CLI:
   ```bash
   # Windows (PowerShell)
   irm https://get.tur.so/install.ps1 | iex

   # macOS / Linux
   curl -sSfL https://get.tur.so/install.sh | bash
   ```
2. Log in and create the database:
   ```bash
   turso auth login
   turso db create pokemon-tracker
   ```
3. Get the database URL:
   ```bash
   turso db show pokemon-tracker --url
   # Output example: libsql://pokemon-tracker-youruser.turso.io
   ```
4. Generate an authentication token:
   ```bash
   turso db tokens create pokemon-tracker
   # Copy the generated token string
   ```

#### Option B: Using the Turso Web Console
1. Navigate to [turso.tech/app](https://turso.tech/app).
2. Click **Create Database** -> Name it `pokemon-tracker` -> Select your nearest region.
3. Under the **Overview** tab, copy the **Database URL** (`libsql://...`).
4. Under the **Tokens** tab, click **Create Token** -> Copy the JWT token.

> **Note**: You do not need to run manual SQL migrations. The API automatically runs `ensureDatabaseTables()` at cold start to create all schema tables if they do not exist.

---

### Step 3.2: Configure Google Cloud OAuth 2.0

For Google Sign-in and automatic collection seeding from Google Drive:

1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Select or create your project (e.g. `Pokemon Tracker`).
3. **Enable Required APIs**:
   - Navigate to **APIs & Services** > **Library**.
   - Search for and enable **Google Drive API**.
   - Search for and enable **Google Sheets API**.
4. **Configure OAuth Consent Screen**:
   - User Type: **External**.
   - App Name: `Pokemon Tracker`.
   - Support email: your email.
   - Under **Scopes**, add:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/spreadsheets.readonly`
5. **Create OAuth Client ID**:
   - Go to **Credentials** > **Create Credentials** > **OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Pokemon Tracker Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (Vite dev)
     - `http://localhost:3000` (Local preview)
     - `https://<your-project-name>.vercel.app` (Your production Vercel domain)
   - Click **Create** and copy your **Client ID** (ends with `.apps.googleusercontent.com`).

---

### Step 3.3: Deploy to Vercel (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** > **Project**.
2. Select your repository: `PedroFabrino/PokemonTracker-Vue`.
3. Configure the project settings:
   - **Framework Preset**: `Other`
   - **Root Directory**: `./` (leave as root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `apps/web/dist`
   - **Install Command**: `npm install`
4. Add the following **Environment Variables** in Vercel:

   | Variable Name | Value | Description |
   |---|---|---|
   | `DATABASE_URL` | `libsql://pokemon-tracker-xxx.turso.io` | Turso Database connection URL |
   | `DATABASE_AUTH_TOKEN` | `<turso_jwt_token>` | Turso Database authentication token |
   | `VITE_GOOGLE_OAUTH_CLIENT_ID` | `<client_id>.apps.googleusercontent.com` | Google Cloud OAuth Web Client ID |
   | `NODE_ENV` | `production` | Production mode |

5. Click **Deploy**.
6. Once deployed, copy your assigned Vercel URL (e.g., `https://pokemon-tracker-vue.vercel.app`).
7. **Important**: Go back to [Google Cloud Console](https://console.cloud.google.com/apis/credentials), edit your OAuth Client ID, and add this production Vercel URL to **Authorized JavaScript origins**.

---

### Step 3.4: Alternative Deployments

#### Option A: Docker Container (Self-hosted / VPS / Render / Railway)

A multi-stage [`Dockerfile`](file:///c:/Users/pfabr/Documents/Git/PokemonTracker-Vue/Dockerfile) is provided in the repository root.

1. **Build the image**:
   ```bash
   docker build -t pokemon-tracker:latest .
   ```

2. **Run with local persistent volume (SQLite)**:
   ```bash
   docker run -d \
     --name pokemon-tracker \
     -p 3001:3001 \
     -v pokemon_data:/app/data \
     -e DATABASE_URL="file:/app/data/pokemon.db" \
     -e VITE_GOOGLE_OAUTH_CLIENT_ID="<your_client_id>" \
     pokemon-tracker:latest
   ```

3. **Or run connected to Turso**:
   ```bash
   docker run -d \
     --name pokemon-tracker \
     -p 3001:3001 \
     -e DATABASE_URL="libsql://pokemon-tracker-xxx.turso.io" \
     -e DATABASE_AUTH_TOKEN="<turso_token>" \
     -e VITE_GOOGLE_OAUTH_CLIENT_ID="<your_client_id>" \
     pokemon-tracker:latest
   ```

#### Option B: Local Production Run

To test the compiled production build locally before cloud deployment:

```bash
# 1. Install dependencies
npm install

# 2. Compile all packages (@pokemontracker/shared, @pokemontracker/api, @pokemontracker/web)
npm run build

# 3. Start standalone Node API server
PORT=3001 node apps/api/dist/index.js

# 4. In a separate terminal, serve the frontend build
npx vite preview --prefix apps/web --port 3000
```

---

## 4. Post-Deployment Verification Checklist

Once deployed, verify each layer of the application:

1. **API Health Check**:
   - Open: `https://<your-domain>/api/health`
   - Expected JSON:
     ```json
     {
       "status": "ok",
       "service": "pokemon-tracker-api",
       "database": "connected"
     }
     ```

2. **TCG Ingestion Test**:
   - Navigate to `https://<your-domain>/tcg-investor`.
   - In the scrape bar, enter:
     `https://www.cartasdepokemon.com.br/megaevolucao/escuridao-absoluta`
   - Click **Analisar Expansão**.
   - Verify that the set appears in the leaderboard with:
     - Base Count: `84`
     - Secret Cards count
     - Investment Score (0–100)
     - Top Chase card name and price (BRL).
   - Click the set row to open the Secret Cards gallery modal.

3. **Google Sign-in & Sheet Auto-Seed**:
   - Click **Sign in with Google** on the Dex or Header.
   - Sign in with the Google Account that owns your `"Pokemon Collection Tracker"` spreadsheet.
   - Verify your avatar appears and Pokémon cards show as collected based on your `GEN 1`–`GEN 9` sheet data.

---

## 5. Troubleshooting & FAQ

### Issue: "idpiframe_initialization_failed" or Google Login popup closes immediately
- **Cause**: The current domain is not registered in Google Cloud Console.
- **Solution**: Go to Google Cloud Console > Credentials > Edit your OAuth Client ID > Ensure your exact Vercel URL (including `https://` with no trailing slash) is listed in **Authorized JavaScript origins**.

### Issue: Database writes fail with "read-only file system" on Vercel
- **Cause**: `DATABASE_URL` is missing in Vercel environment variables, causing the app to fall back to `file:local.db` (which Vercel Serverless blocks).
- **Solution**: Set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` in your Vercel project environment variables pointing to your remote Turso instance.

### Issue: Expansion scraping returns 0 cards or timeout
- **Cause**: Target URL changed or external site is rate-limiting requests.
- **Solution**: Ensure the URL matches the supported structure (`https://www.cartasdepokemon.com.br/<series>/<slug>`). The backend scraper checks the embedded `_officialCards` script and extracts all cards with `local_id > officialCards`.
