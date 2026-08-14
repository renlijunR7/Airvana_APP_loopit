# Airvana Android Demo Wrapper

This wrapper packages the existing `public/` frontend as an installable Android
demo APK. It intentionally does not bundle the Node.js/SQLite backend.

## Build

```bash
./build-apk.sh
```

The installable debug APK is written to:

```text
build/outputs/Airvana-v1.0.14-debug.apk
```

The app uses the temporary demo application ID `ai.airvana.demo`. Production
publishing still requires an approved application ID, release signing key,
backend/API deployment, privacy review, and store configuration.
