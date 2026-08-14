# Airvana iOS Demo Wrapper

This native SwiftUI/WKWebView wrapper embeds the current Loopit v2 `public/`
frontend for installation on a physical iPhone. It does not replace or modify
the existing Android wrapper and does not bundle the Node.js backend.

## Requirements

- Full Xcode installed from the Mac App Store
- Apple ID signed in under Xcode → Settings → Accounts
- An Apple Development certificate created by Xcode
- iPhone connected, trusted, paired, and in Developer Mode

## Build and install

```bash
./install-on-device.sh
```

If more than one iPhone is connected, pass its device identifier:

```bash
./install-on-device.sh DEVICE_IDENTIFIER
```

The demo bundle identifier is `com.renlijun.airvana.loopit.demo`. A free
Personal Team signing profile normally expires after seven days; reconnect the
iPhone and rerun the script to reinstall it.
