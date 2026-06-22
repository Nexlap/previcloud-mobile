import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Modal, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { segnaPreventivoPagato } from '../../api/preventivoPdf'
import { eventBus } from '../../eventBus'
import { inputDateToIso, oggiInputDate } from 'preventivoai-shared'
import {
  formatTempoNotifica,
  notificaInRimando,
  useNotifiche,
  type Notifica,
} from '../../hooks/useNotifiche'
import { AppIcon } from '../icons/AppIcon'
import { NotificaFirmaDialog } from './NotificaFirmaDialog'

export function NotificheBell() {
  const { notifiche, count, segnaLetta, rimanda, archivia, ricarica } = useNotifiche()
  const [listaAperta, setListaAperta] = useState(false)

  useFocusEffect(useCallback(() => {
    void ricarica()
  }, [ricarica]))

  async function apriNotifica(n: Notifica) {
    setListaAperta(false)
    await segnaLetta(n.id)
    if (!n.preventivo_id) return
    router.push('/(tabs)/storico')
    setTimeout(() => eventBus.emit('apri-notifica', n), 150)
  }

  return (
    <>
      <TouchableOpacity onPress={() => setListaAperta(true)} style={{ position: 'relative', padding: 8 }}>
        <AppIcon name="bell" size={22} color="#0D1B2A" />
        {count > 0 ? (
          <View style={{
            position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9,
            backgroundColor: '#0E9F8E', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{count > 9 ? '9+' : count}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal visible={listaAperta} transparent animationType="fade" onRequestClose={() => setListaAperta(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setListaAperta(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', paddingTop: 100, paddingHorizontal: 20 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', maxHeight: 420 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: '#0D1B2A' }}>Notifiche</Text>
              {count > 0 ? (
                <Text style={{ marginTop: 2, fontSize: 12, color: '#9CA3AF' }}>{count} da fare</Text>
              ) : notifiche.length > 0 ? (
                <Text style={{ marginTop: 2, fontSize: 12, color: '#9CA3AF' }}>Tutte rimandate</Text>
              ) : null}
            </View>
            {notifiche.length === 0 ? (
              <Text style={{ padding: 20, color: '#9CA3AF', fontSize: 14 }}>Nessuna notifica</Text>
            ) : (
              notifiche.map(n => {
                const rimandata = notificaInRimando(n)
                return (
                  <View key={n.id} style={{ borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingRight: 8 }}>
                      <TouchableOpacity
                        onPress={() => void apriNotifica(n)}
                        style={{ flex: 1, flexDirection: 'row', padding: 16, gap: 10 }}
                      >
                        <View style={{
                          width: 8, height: 8, borderRadius: 4, marginTop: 6,
                          backgroundColor: rimandata ? '#D1D5DB' : '#0E9F8E',
                        }} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontWeight: '700', fontSize: 14, color: '#0D1B2A' }}>{n.titolo}</Text>
                            {rimandata ? (
                              <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E' }}>RIMANDATA</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text numberOfLines={2} style={{ marginTop: 4, fontSize: 12, color: '#6B7280' }}>{n.messaggio}</Text>
                          <Text style={{ marginTop: 4, fontSize: 11, color: '#9CA3AF' }}>{formatTempoNotifica(n.created_at)}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => void archivia(n.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ padding: 12, marginTop: 4 }}
                      >
                        <Text style={{ fontSize: 20, color: '#9CA3AF', lineHeight: 20 }}>×</Text>
                      </TouchableOpacity>
                    </View>
                    {!rimandata ? (
                      <TouchableOpacity
                        onPress={() => void rimanda(n.id)}
                        style={{ alignSelf: 'flex-end', paddingHorizontal: 16, paddingBottom: 10 }}
                      >
                        <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '600' }}>Rimanda</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )
              })
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

export function NotificaAzioneStorico({
  notifica,
  onClose,
}: {
  notifica: Notifica | null
  onClose: () => void
}) {
  const { segnaLetta, rimanda, ricarica } = useNotifiche()

  async function handleSegnaPagato(preventivoId: string) {
    await segnaPreventivoPagato(preventivoId, true, inputDateToIso(oggiInputDate()))
    if (notifica && !notifica.letta) await segnaLetta(notifica.id)
    eventBus.emit('aggiorna-home')
    void ricarica()
    onClose()
  }

  async function handleRimanda() {
    if (notifica) await rimanda(notifica.id)
    void ricarica()
    onClose()
  }

  async function handleCompletata() {
    if (notifica && !notifica.letta) await segnaLetta(notifica.id)
    void ricarica()
    onClose()
  }

  if (!notifica) return null

  return (
    <NotificaFirmaDialog
      notifica={notifica}
      visible
      onClose={onClose}
      onSegnaPagato={id => void handleSegnaPagato(id)}
      onRimanda={() => void handleRimanda()}
      onCompletata={() => void handleCompletata()}
    />
  )
}
