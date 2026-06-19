import { Text, TouchableOpacity, View } from 'react-native'
import { useSettingsTheme } from '../../hooks/useSettingsTheme'
import { AppIcon, type AppIconName } from '../icons/AppIcon'
import { settingsStyles as styles } from './settingsStyles'

export type SettingsNavItem = {
  title: string
  subtitle: string
  icon: AppIconName
  onPress: () => void
}

type Props = {
  items: SettingsNavItem[]
}

export function SettingsNavSection({ items }: Props) {
  const t = useSettingsTheme()

  return (
    <View style={{ gap: 10 }}>
      {items.map(item => (
        <TouchableOpacity
          key={item.title}
          style={[styles.navCard, t.card]}
          onPress={item.onPress}
          activeOpacity={0.7}
        >
          <View style={[styles.navCardIcon, t.navIconBg]}>
            <AppIcon name={item.icon} size={20} color={t.icon} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.navCardTitle, t.title]}>{item.title}</Text>
            <Text style={[styles.navCardSub, t.sub]}>{item.subtitle}</Text>
          </View>
          <AppIcon name="chevron-right" size={18} color={t.icon} />
        </TouchableOpacity>
      ))}
    </View>
  )
}
