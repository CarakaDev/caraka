# Privacy policy

**Product:** Caraka, the `caraka` npm package and the Caraka Android app · **Last updated:** 13 October 2026 · **Bahasa Indonesia:** [privacy.id.md](privacy.id.md)

Caraka has no account, no cloud service, and no server run by the developer. This page says what that means for your data.

## Who we are

PT Global Raya Oris Wijaya (the developer) makes Caraka. The developer is the controller of any personal data that this policy covers. To reach the developer, write to [halo@caraka.dev](mailto:halo@caraka.dev).

## What the developer collects

Nothing. The `caraka` package and the Android app send no analytics and no crash reports to the developer. The developer cannot see your messages, your files, or your server address.

## What the Android app sends

The app connects to one server: the Caraka server that you pair it with. That server is your own Caraka installation. The app sends your messages, your files, and the name of your device to that server. It sends them nowhere else.

Release builds use HTTPS only.

## What the Android app stores

The app stores the pairing cookie and the server address on your device. The Android Keystore encrypts both. Android backup is off for the app.

When you tap Disconnect, the app calls logout on your server. Then it deletes all local app data.

## Camera and QR codes

The app has no camera permission. To scan a pairing QR code, it uses Google code scanner from Google Play services. The scanner runs on your device.

## Google Play

Google Play processes install data under Google's own privacy policy.

## Your Caraka server

The Caraka server runs on your machine. It keeps session history in a local SQLite database, `~/.caraka/caraka.db`. The `CARAKA_HOME` variable can name another directory.

You control this data and you can delete it. Run `caraka stop`, then remove the data directory. That also removes your config and your secrets.

## Chat channels and your coding agent

Telegram, Discord, and WhatsApp are optional. If you connect one, your messages pass through that provider, and the provider's policy applies.

Caraka also passes your messages to the coding agent on your machine. Caraka holds no API key for that agent. The agent's provider sets the rules for that data.

## Children

Caraka is not directed at children under 13, or under 18 where the law sets that age.

## Changes

The top of this page shows the date of the last update. The repository history lists every change: [github.com/CarakaDev/caraka](https://github.com/CarakaDev/caraka/commits/main/docs/privacy.md).

## Contact

[halo@caraka.dev](mailto:halo@caraka.dev)
