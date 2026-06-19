import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Modal, Text, TouchableOpacity, View } from 'react-native'
import { segnaPreventivoPagato } from '../../api/preventivoPdf'
import { useNotifiche, type Notifica } from '../../hooks/useNotifiche'
import { NotificaFirmaDialog } from './NotificaFirmaDialog'

export function NotificheBell() {
  const { notifiche, count, segnaLetta, ricarica } = useNotifiche()
  const [listaAperta, setListaAperta] = useState(false)
  const [attiva, setAttiva] = useState<Notifica | null>(null)

  useEffect(() => {
    const prima = notifiche.find(n => !n.letta)
    if (prima && !attiva && !listaAperta) setAttiva(prima)
  }, [notifiche, attiva, listaAperta])

  useFocusEffect(useCallback(() => {
    void ricarica()
  }, [ricarica]))

  async function handleSegnaPagato(preventivoId: string) {
    await segnaPreventivoPagato(preventivoId, true)
    if (attiva) await segnaLetta(attiva.id)
    setAttiva(null)
    void ricarica()
  }

  async function handleDopo() {
    if (attiva) await segnaLetta(attiva.id)
    setAttiva(null)
    void ricarica()
  }

  function apriNotifica(n: Notifica) {
    setListaAperta(false)
    setAttiva(n)
  }

  return (
    <>
      <TouchableOpacity onPress={() => setListaAperta(true)} style={{ position: 'relative', padding: 8 }}>
        <Text style={{ fontSize: 22 }}>{'\uD83D\uDD14'}</Text>
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
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', maxHeight: 360 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: '#0D1B2A' }}>Notifiche</Text>
            </View>
            {notifiche.length === 0 ? (
              <Text style={{ padding: 20, color: '#9CA3AF', fontSize: 14 }}>Nessuna notifica</Text>
            ) : (
              notifiche.map(n => (
                <TouchableOpacity key={n.id} onPress={() => apriNotifica(n)} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: '#0D1B2A' }}>{n.titolo}</Text>
                  <Text numberOfLines={2} style={{ marginTop: 4, fontSize: 12, color: '#6B7280' }}>{n.messaggio}</Text>
                </TouchableOpacity>
              ))
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {attiva ? (
        <NotificaFirmaDialog
          notifica={attiva}
          visible
          onClose={() => setAttiva(null)}
          onSegnaPagato={id => void handleSegnaPagato(id)}
          onDopo={() => void handleDopo()}
        />
      ) : null}
    </>
  )
}
