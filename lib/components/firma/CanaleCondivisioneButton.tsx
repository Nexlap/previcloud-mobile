import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

type Props = {
  label: string
  loading?: boolean
  disabled?: boolean
  onPress: () => void
  style?: StyleProp<ViewStyle>
  variant?: 'outline' | 'primary'
  accent?: boolean
}

export function CanaleCondivisioneButton({
  label,
  loading = false,
  disabled = false,
  onPress,
  style,
  variant = 'outline',
  accent = false,
}: Props) {
  const busy = loading || disabled

  return (
    <Pressable
      disabled={busy}
      onPress={onPress}
      android_ripple={{ color: 'rgba(14, 159, 142, 0.18)' }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : accent ? styles.outlineAccent : styles.outline,
        busy ? styles.busy : null,
        pressed && !busy ? styles.pressed : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : '#0E9F8E'} />
      ) : (
        <Text style={[
          styles.label,
          variant === 'primary' ? styles.labelPrimary : null,
          accent ? styles.labelAccent : null,
        ]}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  outline: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  outlineAccent: {
    borderWidth: 1,
    borderColor: '#0E9F8E',
    backgroundColor: '#fff',
  },
  primary: {
    backgroundColor: '#0E9F8E',
  },
  pressed: {
    opacity: 0.65,
  },
  busy: {
    opacity: 0.55,
  },
  label: {
    fontWeight: '600',
    color: '#0D1B2A',
  },
  labelPrimary: {
    color: '#fff',
  },
  labelAccent: {
    color: '#0B7A6D',
  },
})
