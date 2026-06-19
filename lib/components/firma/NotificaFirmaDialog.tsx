import { Alert, Modal, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import type { Notifica } from '../../hooks/useNotifiche'
import {
  apriWhatsAppFirma,
  copiaLinkFirma,
  disabilitaReminderInvio,
  inviaPreventivoPerFirma,
  registraReminderWhatsapp,
  testoInvioFirma,
} from '../../api/firma'
import { sessionToken } from '../../api/settings'

type Props = {
  notifica: Notifica
  visible: boolean
  onClose: () => void
  onSegnaPagato: (preventivoId: string) => void
  onDopo: () => void
}

export function NotificaFirmaDialog({ notifica, visible, onClose, onSegnaPagato, onDopo }: Props) {
  const preventivoId = notifica.preventivo_id
  const invioId = notifica.invio_id
  const payload = notifica.payload || {}

  async function inviaReminderWhatsApp() {
    if (!preventivoId) return
    const token = await sessionToken()
    const res = await inviaPreventivoPerFirma(preventivoId, 'whatsapp', token)
    if (!res.url) throw new Error('Link non disponibile')
    const testo = testoInvioFirma(String(payload.nomeCliente || 'Cliente'), res.url)
    await apriWhatsAppFirma(payload.telefonoCliente as string | undefined, testo)
    if (invioId) await registraReminderWhatsapp(invioId)
    onDopo()
  }

  async function inviaReminderEmail() {
    const url = payload.urlFirma as string | undefined
    if (url) await copiaLinkFirma(url)
    else if (preventivoId) {
      const res = await inviaPreventivoPerFirma(preventivoId, 'link', await sessionToken())
      if (res.url) await copiaLinkFirma(res.url)
    }
    onDopo()
  }

  async function nonChiederePiu() {
    if (!invioId) { onDopo(); return }
    try {
      await disabilitaReminderInvio(invioId)
      onDopo()
    } catch (e) {
      Alert.alert('Errore', e instanceof Error ? e.message : 'Operazione non riuscita')
    }
  }

  const isFirmaRicevuta = notifica.tipo === 'firma_ricevuta'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0D1B2A' }}>{notifica.titolo}</Text>
          <Text style={{ marginTop: 8, color: '#6B7280', fontSize: 14, lineHeight: 20 }}>{notifica.messaggio}</Text>

          {isFirmaRicevuta ? (
            <>
              {preventivoId && payload.chiediPagato ? (
                <TouchableOpacity
                  onPress={() => { onSegnaPagato(preventivoId); onClose() }}
                  style={{ marginTop: 16, backgroundColor: '#0E9F8E', borderRadius: 12, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Segna come pagato</Text>
                </TouchableOpacity>
              ) : null}
              {preventivoId ? (
                <TouchableOpacity
                  onPress={() => { onClose(); router.push('/(tabs)/storico') }}
                  style={{ marginTop: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontWeight: '600', color: '#0D1B2A' }}>Vai allo storico</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={onDopo} style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280' }}>Dopo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => void inviaReminderWhatsApp().catch(() => onDopo())}
                style={{ marginTop: 16, backgroundColor: '#0E9F8E', borderRadius: 12, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Sì — WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void inviaReminderEmail().catch(() => onDopo())}
                style={{ marginTop: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ fontWeight: '600', color: '#0D1B2A' }}>Sì — Email / link</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onDopo} style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280' }}>No</Text>
              </TouchableOpacity>
              {invioId ? (
                <TouchableOpacity onPress={() => void nonChiederePiu()} style={{ marginTop: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 12, textDecorationLine: 'underline' }}>
                    Non chiedermelo più per questo preventivo
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
