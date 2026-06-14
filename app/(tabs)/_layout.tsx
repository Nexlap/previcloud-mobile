import { router, Stack, usePathname } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const TABS = [
  { icon: '🏠', label: 'Home',     path: '/(tabs)' },
  { icon: '📋', label: 'Storico',  path: '/(tabs)/storico' },
  { icon: null, label: '',         path: '/(tabs)/nuovo' },
  { icon: '👥', label: 'Clienti',  path: '/(tabs)/clienti' },
  { icon: '⚙️', label: 'Settings', path: '/screens/settings' },
]

export default function TabsLayout() {
  const pathname = usePathname()

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          if (tab.icon === null) {
            return (
              <TouchableOpacity key="fab" style={styles.fab} onPress={() => router.push('/(tabs)/nuovo')} activeOpacity={0.85}>
                <Text style={styles.fabText}>+</Text>
              </TouchableOpacity>
            )
          }
          const isActive = pathname === tab.path || (tab.path === '/(tabs)' && pathname === '/')
          return (
            <TouchableOpacity key={tab.path} style={styles.tabBtn} onPress={() => router.push(tab.path as any)} activeOpacity={0.7}>
              <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: 24, paddingTop: 10, paddingHorizontal: 8, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
  tabBtn: { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon: { fontSize: 22, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  tabLabelActive: { color: '#0D1B2A', fontWeight: '700' },
  fab: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#0E9F8E', justifyContent: 'center', alignItems: 'center', marginTop: -24, shadowColor: '#0E9F8E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 34 },
})