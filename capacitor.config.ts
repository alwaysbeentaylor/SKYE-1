import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skye.familie',
  appName: 'SKYE',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0EA5E9',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff'
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0EA5E9'
    },
    Camera: {
      permissions: {
        camera: 'SKYE gebruikt je camera voor videogesprekken.',
        photos: 'SKYE gebruikt je foto\'s om avatars op te slaan.'
      }
    },
    Geolocation: {
      permissions: {
        location: 'SKYE gebruikt je locatie om je positie te delen tijdens gesprekken.'
      }
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  },
  ios: {
    scheme: 'SKYE',
    contentInset: 'automatic'
  }
};

export default config;
