# ChatFlow — Client

Real-time chat web app (React + Vite + Tailwind CSS + daisyUI). Builds to a single HTML file and deploys to Vercel. PWA-ready (manifest, icons, service worker included).

## Quick start

```bash
npm install
cp .env.example .env   # then fill in your keys
npm run dev            # local dev server
npm run build          # production build -> dist/
npm run preview        # preview the production build
```

## Environment variables

See `.env.example`. Never commit `.env` (it is gitignored).

| Variable | Purpose |
|---|---|
| `VITE_API_URL` / `VITE_WS_URL` | Backend REST + WebSocket URL |
| `VITE_GIPHY_KEY` / `VITE_TENOR_KEY` | GIF pickers |
| `VITE_USE_BACKEND` / `VITE_USE_WEBSOCKET` | Feature flags |
| `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | Voice/video calls (secret — keep in `.env` only) |

## Backend

The backend (`single-file-chatflow-backend/`) lives in a separate repo and is intentionally excluded from this one (see `.gitignore`). Point `VITE_API_URL` / `VITE_WS_URL` at your deployed backend.

## Deploy (Vercel)

```bash
npm run build
npx vercel --prod
```

`vercel.json` rewrites all routes to `index.html` for client-side routing.

## Android APK (built by GitHub)

No Android Studio needed locally. The `android/` folder is a WebView wrapper around the deployed site, and `.github/workflows/build-apk.yml` builds it on GitHub Actions:

1. Push to `main` (or trigger the workflow manually).
2. Open the run under the repo's **Actions** tab.
3. Download the **ChatFlow-APK** artifact and install it on your device (debug build — allow "Install unknown apps").

## Push notifications (FCM)

The app can receive push notifications, but needs a one-time Firebase setup:

1. **Firebase console** (console.firebase.google.com): create a project, add an Android app with package name `com.chatflow.app`, download `google-services.json`.
2. **Give it to builds**: either commit the file at `android/app/google-services.json`, or add a `GOOGLE_SERVICES_JSON` repo secret containing the base64 of the file (the workflow decodes it automatically). Without one of these the APK build fails by design.
3. **Backend**: when a message arrives, also send FCM (Admin SDK) to the recipient's device token. The web app can read the token via `window.ChatFlowNative?.getPushToken()` and register it with your backend. `areNotificationsEnabled()` and `openNotificationSettings()` are exposed the same way.

Notifications only arrive when your backend actually sends them — the app side alone shows nothing.

## PWA icons

Regenerate icons from SVG source with:

```bash
node scripts/generate-icons.js          # public/icon-*.png + icon.svg
node scripts/generate-android-icons.mjs # android mipmap icons
```

`sharp` is a devDependency used only by these scripts.
