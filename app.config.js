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
      package: "com.preventivoai.app"
    },
    plugins: [
      "expo-router",
      "expo-secure-store"
    ],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
    }
  }
}