# RUTA — Fuel & Maintenance Tracker (PWA)

## Ano ang laman ng folder na ito
- `index.html` — ang buong app (UI + logic), gumagamit ng `localStorage` para sa data
- `manifest.json` — PWA config (pangalan, icons, kulay)
- `service-worker.js` — nagpapagana ng offline access
- `icons/` — app icons (192, 512, maskable, apple touch icon, favicon)

Data ng bawat user ay naka-store lang sa sarili niyang device/browser (`localStorage`) — walang backend o database, kaya walang gastos sa hosting.

---

## Paraan 1: iOS — gawing PWA (pinakamadali)

1. I-upload ang buong folder (`index.html`, `manifest.json`, `service-worker.js`, `icons/`) sa isang static host:
   - **Netlify** (drag-and-drop sa app.netlify.com/drop — pinakamabilis)
   - **Vercel** (`vercel deploy`)
   - **GitHub Pages**
2. Buksan ang deployed URL gamit ang **Safari** sa iPhone (kailangan Safari, hindi Chrome, para gumana ang "Add to Home Screen").
3. Tap **Share** → **Add to Home Screen**.
4. Lalabas ang RUTA icon sa home screen mo, gagana na parang native app (full screen, may sariling icon, may offline support).

> Note: Sa iOS, ang geolocation (Fuel Watch feature) ay gagana lang kapag naka-HTTPS ang site mo (automatic ito sa Netlify/Vercel/GitHub Pages) at pumayag ka sa location permission prompt.

---

## Paraan 2: Android — gawing installable app gamit ang Capacitor

Ito ang pinakamadaling paraan para magkaroon ng totoong Android app (APK/AAB) mula sa parehong HTML files, hindi mo kailangan i-rewrite sa Kotlin/Java.

```bash
# 1. Sa isang bagong folder, i-install ang Node.js tools
npm init -y
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli

# 2. I-initialize ang Capacitor project
npx cap init "RUTA" "com.yourname.ruta" --web-dir=www

# 3. Kopyahin ang index.html, manifest.json, service-worker.js, at icons/
#    papunta sa isang "www" folder sa loob ng project na ito

# 4. Idagdag ang Android platform
npx cap add android

# 5. I-sync ang web assets papunta sa Android project
npx cap sync

# 6. Buksan sa Android Studio para i-build/i-test ang APK
npx cap open android
```

Sa Android Studio, pwede mo nang i-run ang app sa emulator o physical device, o i-build ang signed APK/AAB para i-publish sa Google Play.

**Tip:** Palitan ang `com.yourname.ruta` ng sarili mong package name (dapat unique, hal. `com.juandelacruz.ruta`) bago mag-publish sa Play Store.

---

## Paano baguhin ang icon o kulay

- Icons: palitan lang ang mga PNG files sa `icons/` (panatilihin ang parehong filenames at sizes: 192x192, 512x512).
- Theme color: baguhin ang `theme_color` at `background_color` sa `manifest.json`, at ang `<meta name="theme-color">` sa `index.html`.

---

## Limitasyon ng Fuel Watch feature

Ang "Malapit" tab ay based sa mga gas station na na-log mo mismo (lokasyon + presyo mula sa iyong sariling fuel entries) — hindi ito kumukuha ng live prices mula sa ibang users o sa internet. Habang mas madami kang naka-log na fill-ups sa iba't ibang estasyon, mas magiging useful ang comparison na ito.
