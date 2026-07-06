<div align="center">

<img src="app/src/main/assets/assets/img/logo.svg" width="120" alt="HesabYar logo">

# HesabYar — Android · حساب‌یار

### The Persian personal‑accounting suite, in your pocket — pixel‑identical to the web app, fully offline.

<p>
<img alt="Platform" src="https://img.shields.io/badge/platform-Android%207.0%2B%20(API%2024)-3DDC84?logo=android&logoColor=white">
<img alt="Version" src="https://img.shields.io/badge/version-1.1.0-4F46E5">
<img alt="Language" src="https://img.shields.io/badge/Kotlin-WebView-7F52FF?logo=kotlin&logoColor=white">
<img alt="Storage" src="https://img.shields.io/badge/storage-SQLite%20(offline)-003B57?logo=sqlite&logoColor=white">
<img alt="UI" src="https://img.shields.io/badge/UI-فارسی%20(RTL)-16A34A">
<img alt="License" src="https://img.shields.io/badge/license-MIT-black">
</p>

<img src="docs/screenshot-mobile-dashboard.png" width="300" alt="HesabYar Android dashboard">

</div>

---

> **On language.** This README is in English; the app itself is **100% Persian (RTL)** — Toman/Rial, Jalali (Shamsi) calendar, Persian numerals, live TGJU rates.

## 📱 What it is

A **real Android app** (Kotlin · Gradle · APK, opens in Android Studio) whose UI is a full‑screen **WebView** running the *exact* same HTML/CSS/JS and fonts as the mobile website — so it looks and behaves **identically**, down to the pixel. All data is stored **locally on the phone** in SQLite (via `sql.js`, persisted through a native bridge) and works fully **offline**. When online, it syncs both ways through your WordPress site.

It shares the desktop app's rendering engine and business logic **verbatim**, so the same rigorous [accounting model](https://github.com/hrschemiker/hesabyar-desktop#-the-accounting-model-precisely) applies here: borrowing isn't income, repayments are financing (not a second expense), net worth = accounts + asset market value − open obligations.

## ✨ Features

Everything the web/desktop app has, in your pocket:

- 📊 **Dashboard** — surplus/deficit, live USD & gold rates, KPIs, due‑date reminders.
- 🏦 **Accounts** (multi‑currency) · 🔁 **11 transaction types** with the step‑by‑step mobile entry wizard.
- 🏷️ **Categories** (essential/non‑essential) · 📉 **Debts, loans** (installment schedules), **cheques**, **recurring** · 📈 **Receivables**.
- 💎 **Assets** with live valuation, realized/unrealized **P&L** and financial **goals**.
- 📄 **Reports** — health ratios, money routes, per‑item spending, the financing‑vs‑expense split, financial calendar, **PDF export** (Android print) — plus **JSON backup**.
- 💱 **Rates** (TGJU) · 🗄️ **Archive** a period (+ PDF) · ♻️ recycle bin · 🔒 PIN lock.
- Jalali calendar & Persian numerals throughout, same **IRANSansX** + **Gramophone** fonts.

## 🆕 New in 1.2.0

- **🎨 Redesigned mobile UI.** A refreshed, cohesive look across the app: a purple **موجودی کل** balance hero with a 3D wallet, four colour-coded quick actions (expense · income · transfer · new invoice), softer cards with consistent spacing, and a floating‑action bottom bar with a raised centre **＋**.
- **🏦 Bank logos for accounts.** When adding an account you can now pick your **bank's real logo** (Melli, Mellat, Tejarat, Saderat, Sepah, Pasargad, Parsian, and 25+ more) instead of an emoji — and the logo shows throughout the account lists and ledger.
- **🧾 Correct transaction form.** The step‑wizard is retired in favour of a clean inline form that shows exactly the right fields per type: choosing **تسویه بدهی/چک/طلب** now shows the *which‑obligation* selector (as on the desktop/site), and purchase **items** no longer appear on settlements/transfers.
- **🔁 Instant sync on connect.** The moment you connect the app to your site, a full two‑way sync runs immediately — and on every launch thereafter.

## 🆕 New in 1.1.0

- **⬆️ Quick‑access hub in Settings.** The menus that don't fit the compact bottom bar on a phone — **accounts, categories, debts/loans/cheques, receivables, rates** — now live in a tidy grid at the top of **Settings**, so everything is reachable on mobile.
- **📐 Edge‑to‑edge, done right.** On phones that draw the app behind the system bars (e.g. some Samsung devices), the content no longer slips **under the status bar** or **behind the back/home buttons**. The app reads the real system‑bar / display‑cutout insets and pads itself exactly, on every screen — while devices without that behaviour are unaffected.
- **🔁 Invisible background sync.** Save a transaction and it's pushed to your site **in the background** — no "sync" button to press. On launch, newer data is pulled in the background. It's non‑blocking (you never wait), and crash‑safe: close mid‑sync and the next open reconciles both ways.

## 🔁 Sync — phone ↔ site ↔ desktop

Your WordPress site is the hub; the phone and desktop each sync with it (no direct phone‑to‑PC link needed):

1. **In WordPress:** install the [HesabYar plugin](https://github.com/hrschemiker/hesabyar-wordpress-plugin) (v3.13.0+) and enable **«اتصال نرم‌افزار دسکتاپ»** in its settings.
2. **In the app:** **تنظیمات → اتصال به سایت** → enter your site URL and WordPress username/password, then connect.
3. From then on it's automatic: **phone → site → desktop** and back, on launch and whenever the connection returns.

## 📥 Download & install

Grab the APK from the [**Releases**](../../releases) page and install it (you may need to allow "install from unknown sources").

## 🛠️ Build from source

Requires Android Studio (or the Android SDK + JDK 17+).

```bash
# in Android Studio: File → Open → this folder → Run ▶
# or from the command line:
./gradlew assembleDebug      # -> app/build/outputs/apk/debug/app-debug.apk
```

> If your checkout path contains non‑ASCII characters, keep `android.overridePathCheck=true` in `gradle.properties` (already set), or move the project to an ASCII path.

## 🧩 How it works

- **Kotlin** `MainActivity` hosts a WebView served via `WebViewAssetLoader` (`app/src/main/assets/`), goes **edge‑to‑edge** and feeds the system‑bar insets to the web layer as CSS variables (`--hpa-inset-*`), with a JavaScript bridge (`HesabYar`) for SQLite persistence and PDF export (Android print framework).
- The web layer **reuses the desktop/plugin engine verbatim** — `core.js`, `util.js`, a browser SQLite layer (`db-web.js` over `sql.js`), the shared `hpa.css` / `hpa.js`, and the sync client `sync.js` — guaranteeing an identical UI and identical accounting.
- **Full‑page‑reload navigation** (like the desktop server) so the UI enhancers run fresh on each screen — avoiding duplicate‑listener bugs.

## Related projects

- 🖥️ [**hesabyar-desktop**](https://github.com/hrschemiker/hesabyar-desktop) — the Windows desktop app.
- 🌐 [**hesabyar-wordpress-plugin**](https://github.com/hrschemiker/hesabyar-wordpress-plugin) — the WordPress plugin & sync hub.

## License

[MIT](LICENSE) © hrschemiker
