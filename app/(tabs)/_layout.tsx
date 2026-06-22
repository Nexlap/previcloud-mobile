import { router, Stack, usePathname } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppIcon, type AppIconName } from '../../lib/components/icons/AppIcon'
import { NotificaToastStack } from '../../lib/components/firma/NotificaToastStack'
import { NotificaAzioneHost } from '../../lib/components/firma/NotificaAzioneHost'
import { useTheme } from '../../lib/theme/ThemeContext'

type TabDef = { icon: AppIconName | null; label: string; path: string }

const TABS: TabDef[] = [
  { icon: 'home', label: 'Home', path: '/(tabs)' },
  { icon: 'file-text', label: 'Storico', path: '/(tabs)/storico' },
  { icon: null, label: '', path: '/(tabs)/nuovo' },
  { icon: 'users', label: 'Clienti', path: '/(tabs)/clienti' },
  { icon: 'settings', label: 'Settings', path: '/screens/settings' },
]

export default function TabsLayout() {
  const pathname = usePathname()
  const { colors } = useTheme()

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      <NotificaToastStack />
      <NotificaAzioneHost />
      <View style={[styles.tabBar, { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder }]}>
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
            <TouchableOpacity key={tab.path} style={styles.tabBtn} onPress={() => router.push(tab.path as never)} activeOpacity={0.7}>
              <AppIcon name={tab.icon} size={22} color={isActive ? colors.tabActive : colors.tabInactive} />
              <Text style={[
                styles.tabLabel,
                { color: isActive ? colors.tabActive : colors.tabInactive },
                isActive && styles.tabLabelActive,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row', borderTopWidth: 1, paddingBottom: 24, paddingTop: 10, paddingHorizontal: 8,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
  },
  tabBtn: { flex: 1, alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 10, fontWeight: '500' },
  tabLabelActive: { fontWeight: '700' },
  fab: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: '#0E9F8E', justifyContent: 'center',
    alignItems: 'center', marginTop: -24, shadowColor: '#0E9F8E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 34 },
})
