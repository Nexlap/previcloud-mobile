import { router } from 'expo-router'
import { eventBus } from '../eventBus'
import type { Notifica } from '../hooks/useNotifiche'

export function isNotificaRata(n: Notifica) {
  return n.tipo === 'rata_in_scadenza'
}

export function apriNotificaUi(n: Notifica) {
  if (isNotificaRata(n)) {
    const clienteId = typeof n.payload?.cliente_id === 'string' ? n.payload.cliente_id : null
    const nome = typeof n.payload?.cliente_nome === 'string' ? n.payload.cliente_nome : 'Cliente'
    if (clienteId) {
      router.push({ pathname: '/screens/cliente-dettaglio', params: { id: clienteId, nome } })
    }
    setTimeout(() => eventBus.emit('apri-notifica-rata', n), 150)
    return
  }

  if (!n.preventivo_id) return
  router.push('/(tabs)/storico')
  setTimeout(() => eventBus.emit('apri-notifica', n), 150)
}
