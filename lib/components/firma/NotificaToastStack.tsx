import { useEffect, useRef } from 'react'
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  caricaNotificaById,
  useNotifiche,
  type Notifica,
  type NotificaToast,
} from '../../hooks/useNotifiche'
import { apriNotificaUi } from '../../utils/apriNotifica'

function toastApribile(t: NotificaToast) {
  return Boolean(t.preventivo_id) || t.tipo === 'rata_in_scadenza'
}

function toastToNotifica(t: NotificaToast): Notifica {
  return {
    id: t.id,
    tipo: t.tipo,
    preventivo_id: t.preventivo_id,
    invio_id: null,
    titolo: t.titolo,
    messaggio: t.messaggio,
    payload: t.payload,
    letta: false,
    snooze_until: null,
    created_at: new Date().toISOString(),
  }
}

function ToastItem({
  toast,
  onPress,
  onDismiss,
}: {
  toast: NotificaToast
  onPress: () => void
  onDismiss: () => void
}) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-10)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()
  }, [opacity, translateY])

  useEffect(() => {
    if (!toast.leaving) return
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -6, duration: 300, useNativeDriver: true }),
    ]).start()
  }, [toast.leaving, opacity, translateY])

  return (
    <Animated.View
      style={[
        styles.toast,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.accentBar} />
      <TouchableOpacity
        style={styles.toastBody}
        onPress={onPress}
        activeOpacity={toastApribile(toast) ? 0.7 : 1}
        disabled={!toastApribile(toast)}
      >
        <Text style={styles.titolo} numberOfLines={1}>{toast.titolo}</Text>
        {toast.messaggio ? (
          <Text style={styles.messaggio} numberOfLines={1}>{toast.messaggio}</Text>
        ) : null}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.closeBtn}
      >
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

export function NotificaToastStack() {
  const insets = useSafeAreaInsets()
  const { toasts, rimuoviToast } = useNotifiche()

  if (toasts.length === 0) return null

  async function handleToastPress(t: NotificaToast) {
    rimuoviToast(t.id)
    if (!toastApribile(t)) return

    let notifica = toastToNotifica(t)
    if (t.tipo === 'rata_in_scadenza' && !t.payload?.rata_id) {
      const loaded = await caricaNotificaById(t.id)
      if (!loaded) return
      notifica = loaded
    }

    apriNotificaUi(notifica)
  }

  return (
    <View
      style={[styles.stack, { top: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          toast={t}
          onPress={() => handleToastPress(t)}
          onDismiss={() => rimuoviToast(t.id)}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 200,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: '#0E9F8E',
  },
  toastBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minWidth: 0,
  },
  titolo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  messaggio: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  closeText: {
    fontSize: 20,
    color: '#9CA3AF',
    lineHeight: 20,
  },
})
