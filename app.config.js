import 'dotenv/config'

export default {
  expo: {
    name: "PreventivoAI",
    slug: "preventivoai-mobile",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "preventivoai",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.preventivoai.app"
    },
    android: {
      package: "com.preventivoai.app",
      softwareKeyboardLayoutMode: "resize",
    },
    plugins: [
  "expo-router",
  "expo-secure-store",
  "expo-web-browser",
  "expo-audio",
  [
    "expo-notifications",
    {
      "icon": "./assets/images/icon.png",
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