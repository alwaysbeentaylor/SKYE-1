# 🚀 SKYE Android Setup & Deployment

## ✅ Wat is al gedaan:
- ✅ Android platform toegevoegd
- ✅ Permissions geconfigureerd (Camera, Microfoon, Locatie, Notifications)
- ✅ App ID: `com.skye.familie`
- ✅ Version: 1.0.0

## 📋 Vereisten:

1. **Android Studio** (gratis)
   - Download: https://developer.android.com/studio
   - Installeer Android SDK (API 24+)

2. **Google Play Developer Account** ($25 eenmalig)
   - Registreer: https://play.google.com/console/signup

## 🔧 Stap 1: Open in Android Studio

```bash
# Sync web app met Android
npm run build
npx cap sync

# Open in Android Studio
npm run cap:open:android
```

Of handmatig:
- Open Android Studio
- File → Open → Selecteer `android` folder

## 🔧 Stap 2: Android Studio Configuratie

### 1. Gradle Sync
- Wacht tot Gradle sync klaar is (onderaan in Android Studio)
- Als er errors zijn, klik op "Sync Project with Gradle Files"

### 2. SDK Check
- File → Project Structure → SDK Location
- Zorg dat Android SDK geïnstalleerd is (API 24+)

### 3. Build Variants
- View → Tool Windows → Build Variants
- Selecteer "debug" voor testen, "release" voor Play Store

## 📱 Stap 3: Test op Emulator of Fysiek Apparaat

### Emulator:
1. Tools → Device Manager
2. Create Device → Kies een device (bijv. Pixel 5)
3. Download system image (API 30+)
4. Run → Run 'app'

### Fysiek Apparaat:
1. Zet Developer Options aan op je Android telefoon:
   - Settings → About Phone → Tap "Build Number" 7x
2. Zet USB Debugging aan:
   - Settings → Developer Options → USB Debugging
3. Verbind telefoon via USB
4. Run → Run 'app'

## 🎨 Stap 4: App Icons Aanpassen

### Optie 1: Online Generator (Aanbevolen)
1. Ga naar: https://romannurik.github.io/AndroidAssetStudio/
2. Upload je 512x512 icon
3. Download en pak uit
4. Kopieer mipmap folders naar `android/app/src/main/res/`

### Optie 2: Handmatig
- Maak icons in deze formaten:
  - `mipmap-mdpi`: 48x48
  - `mipmap-hdpi`: 72x72
  - `mipmap-xhdpi`: 96x96
  - `mipmap-xxhdpi`: 144x144
  - `mipmap-xxxhdpi`: 192x192
- Plaats in `android/app/src/main/res/`

## 🔐 Stap 5: Signing Key Genereren (voor Play Store)

### Windows (PowerShell):
```powershell
cd android/app
keytool -genkey -v -keystore skye-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias skye
```

**BELANGRIJK:** 
- Onthoud je wachtwoorden!
- Bewaar `skye-release-key.jks` VEILIG (backup!)
- Zonder deze key kun je geen updates maken!

### Maak `android/key.properties`:
```properties
storePassword=JE_WACHTWOORD
keyPassword=JE_WACHTWOORD
keyAlias=skye
storeFile=../app/skye-release-key.jks
```

### Update `android/app/build.gradle`:
Voeg toe in `android {` block:

```gradle
signingConfigs {
    release {
        def keystorePropertiesFile = rootProject.file("key.properties")
        def keystoreProperties = new Properties()
        if (keystorePropertiesFile.exists()) {
            keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

## 📦 Stap 6: Build Release APK/AAB

### Voor Play Store (AAB - Aanbevolen):
```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Voor Direct Install (APK):
```bash
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

## 🏪 Stap 7: Google Play Console

### 1. Maak App Aan
- Ga naar: https://play.google.com/console
- Create app
- App naam: **SKYE**
- Default language: **Nederlands**
- App or game: **App**
- Free or paid: **Free**

### 2. App Access
- Alle gebruikers (of beperkt voor testing)

### 3. Store Listing

**App naam:** SKYE

**Short description (80 karakters):**
```
Veilige familie communicatie app met videogesprekken en real-time locatie
```

**Full description:**
```
SKYE - Veilige Familie Verbinding

Verbind met je familie via videogesprekken, real-time locatie delen en een unieke bubble interface.

✨ Features:
• Videogesprekken met familie
• Real-time locatie delen tijdens gesprekken
• Push notifications voor inkomende oproepen
• Eenvoudige login voor kinderen (6-cijferige code)
• Veilige en privé familie communicatie
• Mooie bubble interface met physics

🔒 Privacy & Veiligheid:
• End-to-end encryptie voor gesprekken
• Alleen familie leden kunnen elkaar zien
• Geen data wordt gedeeld met derden

👨‍👩‍👧‍👦 Perfect voor:
• Ouders die contact willen houden met kinderen
• Grote families die willen verbinden
• Iedereen die veilige communicatie zoekt
```

**App Icon:**
- Upload 512x512 PNG
- Geen transparantie
- Geen ronde hoeken (Play Store voegt die toe)

**Feature Graphic:**
- 1024 x 500 PNG
- Promotie afbeelding voor Play Store

**Screenshots (vereist - minimaal 2):**
- Phone: 16:9 of 9:16
- Format: PNG of JPEG
- Minimaal 2, maximaal 8 screenshots

**Categories:**
- Primary: Social
- Secondary: Communication

**Contact details:**
- Email: (jouw email)
- Website: (optioneel)
- Privacy Policy URL: **VERPLICHT** (maak een privacy policy pagina)

### 4. Content Rating
- Vul vragenlijst in
- Waarschijnlijk: **Everyone** of **PEGI 3**

### 5. Privacy Policy
- **VERPLICHT** voor Play Store
- Maak een privacy policy pagina (bijv. op je website)
- Of gebruik een generator: https://www.freeprivacypolicy.com/

### 6. App Releases

**Production:**
1. Create new release
2. Upload AAB bestand (`app-release.aab`)
3. Release name: `1.0.0`
4. Release notes:
   ```
   Eerste release van SKYE!
   
   • Videogesprekken met familie
   • Real-time locatie delen
   • Push notifications
   • Eenvoudige login voor kinderen
   ```
5. Review & Rollout

### 7. Submit for Review
- Klik "Submit for review"
- Review duurt meestal 1-7 dagen
- Je krijgt email updates

## 🔄 Updates Maken

Na eerste release:

1. **Update version in `android/app/build.gradle`:**
   ```gradle
   versionCode 2  // Verhoog met 1
   versionName "1.0.1"  // Nieuwe versie
   ```

2. **Build en sync:**
   ```bash
   npm run build
   npx cap sync
   ```

3. **Build nieuwe release:**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

4. **Upload in Play Console:**
   - App → Production → Create new release
   - Upload nieuwe AAB
   - Submit

## 🆘 Troubleshooting

### "Gradle sync failed"
- File → Invalidate Caches → Restart
- Check internet verbinding (Gradle download dependencies)

### "SDK not found"
- File → Project Structure → SDK Location
- Download Android SDK via SDK Manager

### "Build failed"
- Check errors in Build tab
- Meestal: missing dependencies → Gradle sync opnieuw

### "App crashes on start"
- Check Logcat in Android Studio
- Meestal: missing permissions → check AndroidManifest.xml

### "Signing error"
- Check `key.properties` bestand
- Check wachtwoorden
- Check of `skye-release-key.jks` bestaat

## 📚 Handige Links

- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [Google Play Console](https://play.google.com/console)
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)
- [Privacy Policy Generator](https://www.freeprivacypolicy.com/)

## ✅ Checklist voor Release

- [ ] App werkt op emulator/fysiek apparaat
- [ ] App icons aangepast
- [ ] Signing key gegenereerd en beveiligd
- [ ] Release build gemaakt (AAB)
- [ ] Play Console account aangemaakt
- [ ] App listing compleet (description, screenshots, etc.)
- [ ] Privacy Policy URL ingevuld
- [ ] Content rating voltooid
- [ ] AAB geüpload
- [ ] Submitted for review

## 🎉 Succes!

Na goedkeuring verschijnt SKYE in de Google Play Store! 🚀

