# SKYE - Native App Deployment Guide

Deze guide helpt je om SKYE te deployen naar de App Store (iOS) en Google Play Store (Android).

## 📋 Vereisten

### Voor iOS (App Store):
- **Mac computer** met macOS (vereist voor Xcode)
- **Apple Developer Account** ($99/jaar)
- **Xcode** (gratis via App Store)
- **CocoaPods** (voor iOS dependencies)

### Voor Android (Play Store):
- **Android Studio** (gratis)
- **Google Play Developer Account** ($25 eenmalig)
- **Java JDK** (included in Android Studio)

## 🚀 Stap 1: Capacitor Setup

De app is al geconfigureerd met Capacitor. Volg deze stappen:

### 1. Build de web app
```bash
npm run build
```

### 2. Sync met native platforms
```bash
npm run cap:sync
```

## 📱 iOS Deployment (App Store)

### Stap 1: iOS Platform Toevoegen
```bash
npm run cap:add:ios
```

### Stap 2: Open in Xcode
```bash
npm run cap:open:ios
```

### Stap 3: Xcode Configuratie

1. **Selecteer het project** in Xcode navigator
2. **Selecteer "SKYE" target**
3. **General Tab:**
   - Bundle Identifier: `com.skye.familie`
   - Version: `1.0.0`
   - Build: `1`
   - Minimum iOS Version: `13.0`

4. **Signing & Capabilities:**
   - Team: Selecteer je Apple Developer Team
   - Automatically manage signing: ✅ AAN
   - Capabilities toevoegen:
     - ✅ Camera
     - ✅ Microphone
     - ✅ Location (When In Use)
     - ✅ Push Notifications
     - ✅ Background Modes → Voice over IP

5. **Info.plist aanpassen:**
   - `NSLocationWhenInUseUsageDescription`: "SKYE gebruikt je locatie om je positie te delen tijdens gesprekken."
   - `NSCameraUsageDescription`: "SKYE gebruikt je camera voor videogesprekken."
   - `NSMicrophoneUsageDescription`: "SKYE gebruikt je microfoon voor videogesprekken."

### Stap 4: App Icons & Splash Screens

1. **App Icons:**
   - Maak icons in verschillende formaten (1024x1024 voor App Store)
   - Plaats in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Gebruik [App Icon Generator](https://www.appicon.co/) voor alle formaten

2. **Splash Screen:**
   - Aangepast in `capacitor.config.ts`
   - Achtergrondkleur: `#0EA5E9` (Sky Blue)

### Stap 5: Build & Archive

1. **Selecteer "Any iOS Device"** in Xcode
2. **Product → Archive**
3. Wacht tot archive klaar is
4. **Distribute App** → **App Store Connect**
5. Volg de wizard om te uploaden

### Stap 6: App Store Connect

1. Ga naar [App Store Connect](https://appstoreconnect.apple.com)
2. Maak nieuwe app aan:
   - Name: SKYE
   - Primary Language: Nederlands
   - Bundle ID: `com.skye.familie`
   - SKU: `skye-familie-001`

3. **App Information:**
   - Category: Social Networking
   - Privacy Policy URL: (vereist)

4. **Pricing & Availability:**
   - Price: Gratis
   - Availability: Alle landen

5. **App Store Listing:**
   - Screenshots (vereist):
     - iPhone 6.7" (1290 x 2796)
     - iPhone 6.5" (1284 x 2778)
     - iPad Pro 12.9" (2048 x 2732)
   - Description (Nederlands):
     ```
     SKYE - Veilige familie communicatie app
     
     Verbind met je familie via videogesprekken, real-time locatie delen en een unieke bubble interface.
     
     Features:
     • Videogesprekken met familie
     • Real-time locatie delen tijdens gesprekken
     • Push notifications voor inkomende oproepen
     • Eenvoudige login voor kinderen (6-cijferige code)
     • Veilige en privé familie communicatie
     ```
   - Keywords: familie, video, communicatie, veilig, kinderen
   - Support URL: (vereist)
   - Marketing URL: (optioneel)

6. **Version Information:**
   - What's New: "Eerste release van SKYE - Veilige familie communicatie"
   - Screenshots uploaden
   - App Preview video (optioneel)

7. **Submit for Review:**
   - Na upload vanuit Xcode, wacht op "Processing" → "Ready to Submit"
   - Submit for Review
   - Review duurt meestal 1-3 dagen

## 🤖 Android Deployment (Play Store)

### Stap 1: Android Platform Toevoegen
```bash
npm run cap:add:android
```

### Stap 2: Open in Android Studio
```bash
npm run cap:open:android
```

### Stap 3: Android Studio Configuratie

1. **Open `android/app/build.gradle`:**
   - `applicationId`: `com.skye.familie`
   - `versionCode`: `1`
   - `versionName`: `"1.0.0"`
   - `minSdkVersion`: `24` (Android 7.0)
   - `targetSdkVersion`: `34` (Android 14)

2. **AndroidManifest.xml Permissions:**
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
   ```

3. **App Icons:**
   - Maak icons in `android/app/src/main/res/`
   - Format: `mipmap-xxxhdpi`, `mipmap-xxhdpi`, etc.
   - Gebruik [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/) voor alle formaten

### Stap 4: Signing Key Genereren

```bash
cd android/app
keytool -genkey -v -keystore skye-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias skye
```

**BELANGRIJK:** Bewaar deze key veilig! Je hebt hem nodig voor updates.

### Stap 5: Build Configuratie

1. Maak `android/key.properties`:
   ```properties
   storePassword=YOUR_STORE_PASSWORD
   keyPassword=YOUR_KEY_PASSWORD
   keyAlias=skye
   storeFile=../app/skye-release-key.jks
   ```

2. Update `android/app/build.gradle` met signing config (zie Capacitor docs)

### Stap 6: Build Release APK/AAB

```bash
cd android
./gradlew bundleRelease  # Voor AAB (aanbevolen voor Play Store)
# of
./gradlew assembleRelease  # Voor APK
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Stap 7: Google Play Console

1. Ga naar [Google Play Console](https://play.google.com/console)
2. Maak nieuwe app aan:
   - App naam: SKYE
   - Default language: Nederlands
   - App of game: App
   - Free or paid: Free

3. **App Access:**
   - Alle gebruikers (of beperkt voor testing)

4. **Store Listing:**
   - Short description: "Veilige familie communicatie app"
   - Full description:
     ```
     SKYE - Veilige familie communicatie app
     
     Verbind met je familie via videogesprekken, real-time locatie delen en een unieke bubble interface.
     
     Features:
     • Videogesprekken met familie
     • Real-time locatie delen tijdens gesprekken
     • Push notifications voor inkomende oproepen
     • Eenvoudige login voor kinderen (6-cijferige code)
     • Veilige en privé familie communicatie
     ```
   - Screenshots (vereist):
     - Phone: Minimaal 2, maximaal 8
     - Tablet: (optioneel)
     - Format: PNG of JPEG, 16:9 of 9:16
   - Feature Graphic: 1024 x 500
   - App Icon: 512 x 512

5. **Content Rating:**
   - Vul vragenlijst in (waarschijnlijk PEGI 3 of Everyone)

6. **Privacy Policy:**
   - Privacy Policy URL: (vereist)

7. **App Releases:**
   - Maak nieuwe release aan
   - Upload AAB bestand
   - Release notes: "Eerste release van SKYE"
   - Review & Rollout

8. **Submit for Review:**
   - Review duurt meestal 1-7 dagen

## 🔧 Handige Commands

```bash
# Build web app
npm run build

# Sync met native platforms
npm run cap:sync

# Open iOS in Xcode
npm run cap:open:ios

# Open Android in Android Studio
npm run cap:open:android

# Build iOS (na sync)
npm run cap:build:ios

# Build Android (na sync)
npm run cap:build:android
```

## 📝 Checklist voor Release

### iOS:
- [ ] App icons in alle formaten
- [ ] Splash screen geconfigureerd
- [ ] Permissions in Info.plist
- [ ] Signing & Capabilities geconfigureerd
- [ ] Archive gemaakt en geüpload
- [ ] App Store Connect listing compleet
- [ ] Screenshots geüpload
- [ ] Privacy Policy URL ingevuld
- [ ] Submitted for review

### Android:
- [ ] App icons in alle formaten
- [ ] Permissions in AndroidManifest.xml
- [ ] Signing key gegenereerd en beveiligd
- [ ] Release build gemaakt (AAB)
- [ ] Play Console listing compleet
- [ ] Screenshots geüpload
- [ ] Privacy Policy URL ingevuld
- [ ] Content rating voltooid
- [ ] Submitted for review

## 🆘 Troubleshooting

### iOS:
- **"No signing certificate found"**: Check je Apple Developer account
- **"Bundle identifier already exists"**: Kies een unieke identifier
- **Archive fails**: Check build errors in Xcode

### Android:
- **"Gradle sync failed"**: Update Android Studio en Gradle
- **"Signing config error"**: Check key.properties bestand
- **"Build fails"**: Check Android SDK versies

## 📚 Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)
- [App Icon Generator](https://www.appicon.co/)
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)

## 🎉 Succes!

Na goedkeuring verschijnt je app in de App Store en Play Store! 🚀

