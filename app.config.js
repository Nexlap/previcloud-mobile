import 'dotenv/config'

export default {
  expo: {
    name: "PreviCloud",
    slug: "previcloud-mobile",
    owner: "danieleglamax",
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
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
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
  url: "https://u.expo.dev/317d7a20-8484-4976-a566-d30f289f7a1c"
},
runtimeVersion: {
  policy: "appVersion"
},
extra: {
  eas: {
    projectId: "317d7a20-8484-4976-a566-d30f289f7a1c"
  },
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
}
  }
}