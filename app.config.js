import 'dotenv/config'

export default {
  expo: {
    name: "PreviCloud",
    slug: "previcloud-mobile",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "previcloud",
    userInterfaceStyle: "light",
    icon: "./assets/images/icon.png",
    ios: {
      supportsTablet: false,
      bundleIdentifier: "it.previcloud.app",
      buildNumber: "1",
      infoPlist: {
        NSCameraUsageDescription: "Consente di scattare foto per il listino e i documenti",
        NSPhotoLibraryUsageDescription: "Consente di selezionare immagini dalla galleria",
        NSMicrophoneUsageDescription: "Consente la registrazione vocale per creare preventivi",
        NSFaceIDUsageDescription: "Consente l'accesso rapido tramite Face ID",
        LSApplicationQueriesSchemes: ["whatsapp"]
      }
    },
    android: {
      package: "it.previcloud.app",
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
        backgroundColor: "#0D1B2A"
      }
    },
    web: {
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
  "expo-router",
  "expo-secure-store",
  "expo-web-browser",
  "expo-audio",
  "expo-image-picker",
  "expo-local-authentication",
  [
    "expo-splash-screen",
    {
      "backgroundColor": "#0D1B2A",
      "image": "./assets/images/splash-icon.png",
      "imageWidth": 200
    }
  ],
  [
    "expo-notifications",
    {
      "icon": "./assets/images/android-icon-monochrome.png",
      "color": "#0D1B2A",
      "androidMode": "default"
    }
  ],
  "@react-native-community/datetimepicker"
    ],
updates: {
  url: "https://u.expo.dev/a842ab0e-24f7-41b4-b93a-6b97a75b9621"
},
runtimeVersion: {
  policy: "appVersion"
},
extra: {
  eas: {
    projectId: "a842ab0e-24f7-41b4-b93a-6b97a75b9621"
  },
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
}
  }
}