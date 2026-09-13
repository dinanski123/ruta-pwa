# RUTA — Fuel & Maintenance Tracker

RUTA is a local-first PWA and Capacitor Android app focused on three jobs: tracking fuel expenses, understanding fuel consumption, and staying ahead of maintenance.

## RUTA v1.4.0

The main app has three tabs only:

- **Home** — current odometer, average km/L, fuel spending this month, and the next maintenance reminder.
- **Fuel** — simple fill-up logging using current odometer, price per liter, and total purchase. RUTA calculates liters automatically and summarizes monthly spend, liters, and average price per liter.
- **Maintenance** — service intervals, due odometer, kilometers remaining, and due/overdue reminders.

RUTA is English-only. Light mode is the default; dark mode remains optional in Settings. Fuel Watch/Nearby and location collection were removed in v1.4.0, so the Android app no longer requests location permission. Historical station/location values already stored in the database remain intact but are not used by the app.

## Build source

The deployable `index.html` and `cloud-sync.js` are reconstructed by `npm run build:web` from the compressed source chunks in `src-bundle/`. This keeps the PWA and Capacitor Android build on the exact same static runtime without service-worker code injection or a second sync engine. The generated files are written to `www/`.

## Data and cloud sync

RUTA remains usable offline using local storage. Optional Cloud Sync uses the dedicated RUTA Supabase project so the same account can carry vehicle, fuel, and maintenance records between devices. The client uses one authenticated Supabase session, one persistent outbox, and one reconciliation engine.

Existing cloud data is protected by row-level security. Fuel and maintenance deletions are soft-deleted in the cloud to avoid stale-device resurrection.

## PWA

Vercel runs `npm run build:web` and serves the `www/` output. On iPhone, open the production URL in Safari and use **Share → Add to Home Screen**.

The service worker uses network-first behavior for HTML and JavaScript so updates are less likely to remain stuck behind an old cached runtime.

## Android Studio

Package ID: `app.ruta.tracker`

Requirements: Node.js 22+, Java 21, Android Studio.

```bash
npm install
npm run android:init
npx cap open android
```

For an existing generated `android/` directory, use `npm run android:sync` instead of `android:init`.

The Android pipeline preserves adaptive icons, resizable activity / tablet support, portrait and landscape operation, and does not request location permission.

## GitHub Actions

The APK workflow is **manual-only** (`workflow_dispatch`). It can be run from a fork or another GitHub account with available Actions minutes. Normal source pushes do not automatically consume APK-build minutes.
