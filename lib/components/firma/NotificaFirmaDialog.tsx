import { Alert, Modal, Text, TouchableOpacity, View } from 'react-native'
import { useRef, useState } from 'react'
import type { Notifica } from '../../hooks/useNotifiche'
import {
  apriWhatsAppFirma,
  apriEmailFirma,
  apriPdfFirmatoDaNotifica,
  disabilitaReminderInvio,
  inviaPreventivoPerFirma,
  registraReminderWhatsapp,
  caricaMessaggiCliente,
  buildMessaggioFirmaReminder,
  buildOggettoFirmaReminder,
} from '../../api/firma'
import { sessionToken } from '../../api/settings'
import { CanaleCondivisioneButton } from './CanaleCondivisioneButton'

type Props = {
  notifica: Notifica
  visible: boolean
  onClose: () => void
  onSegnaPagato: (preventivoId: string) => void
  onRimanda: () => void
  onCompletata: () => void
}

export function NotificaFirmaDialog({ notifica, visible, onClose, onSegnaPagato, onRimanda, onCompletata }: Props) {
  const preventivoId = notifica.preventivo_id
  const invioId = notifica.invio_id
  const payload = notifica.payload || {}
  const [loading, setLoading] = useState<'whatsapp' | 'email' | 'pdf' | null>(null)
  const inFlightRef = useRef(false)

  async function inviaReminderWhatsApp() {
    if (!preventivoId || inFlightRef.current || loading) return
    inFlightRef.current = true
    setLoading('whatsapp')
    try {
      const token = await sessionToken()
      const templates = await caricaMessaggiCliente()
      const res = await inviaPreventivoPerFirma(preventivoId, 'whatsapp', token)
      if (!res.url) throw new Error('Link non disponibile')
      const testo = buildMessaggioFirmaReminder(String(payload.nomeCliente || 'Cliente'), res.url, undefined, { templates })
      await apriWhatsAppFirma(payload.telefonoCliente as string | undefined, testo)
      if (invioId) await registraReminderWhatsapp(invioId)
      onCompletata()
    } catch {
      onRimanda()
    } finally {
      inFlightRef.current = false
      setLoading(null)
    }
  }

  async function inviaReminderEmail() {
    if (inFlightRef.current || loading) return
    inFlightRef.current = true
    setLoading('email')
    try {
      const templates = await caricaMessaggiCliente()
      let url = payload.urlFirma as string | undefined
      if (!url && preventivoId) {
        const res = await inviaPreventivoPerFirma(preventivoId, 'link', await sessionToken())
        url = res.url || undefined
      }
      if (!url) throw new Error('Link non disponibile')
      const testo = buildMessaggioFirmaReminder(String(payload.nomeCliente || 'Cliente'), url, undefined, { templates })
      await apriEmailFirma(
        payload.emailCliente as string | undefined,
        testo,
        buildOggettoFirmaReminder(templates),
      )
      onCompletata()
    } catch {
      onRimanda()
    } finally {
      inFlightRef.current = false
      setLoading(null)
    }
  }

  async function nonChiederePiu() {
    if (!invioId) { onCompletata(); return }
    try {
      await disabilitaReminderInvio(invioId)
      onCompletata()
    } catch (e) {
      Alert.alert('Errore', e instanceof Error ? e.message : 'Operazione non riuscita')
    }
  }

  async function apriPdfFirmato() {
    if (!preventivoId || inFlightRef.current || loading) return
    inFlightRef.current = true
    setLoading('pdf')
    try {
      await apriPdfFirmatoDaNotifica(preventivoId)
    } catch {
      Alert.alert(
        'PDF non disponibile',
        'Impossibile aprire il documento firmato in questo momento. Riprova tra poco dal dettaglio firma.',
      )
    } finally {
      inFlightRef.current = false
      setLoading(null)
    }
  }

  const isFirmaRicevuta = notifica.tipo === 'firma_ricevuta'
  const mostraPdfFirmato = Boolean(preventivoId && isFirmaRicevuta)
  const azioneInCorso = loading !== null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0D1B2A' }}>{notifica.titolo}</Text>
          <Text style={{ marginTop: 8, color: '#6B7280', fontSize: 14, lineHeight: 20 }}>{notifica.messaggio}</Text>

          {isFirmaRicevuta ? (
            <>
              {mostraPdfFirmato ? (
                <CanaleCondivisioneButton
                  label="Apri PDF firmato"
                  accent
                  loading={loading === 'pdf'}
                  disabled={azioneInCorso && loading !== 'pdf'}
                  onPress={() => void apriPdfFirmato()}
                  style={{ marginTop: 16 }}
                />
              ) : null}
              {preventivoId && payload.chiediPagato ? (
                <CanaleCondivisioneButton
                  label="Segna come pagato"
                  variant="primary"
                  disabled={azioneInCorso}
                  onPress={() => { onSegnaPagato(preventivoId); onClose() }}
                  style={{ marginTop: 16 }}
                />
              ) : null}
              {preventivoId && !payload.chiediPagato ? (
                <CanaleCondivisioneButton
                  label="Visto"
                  variant="primary"
                  disabled={azioneInCorso}
                  onPress={() => { onCompletata(); onClose() }}
                  style={{ marginTop: 16 }}
                />
              ) : null}
              <TouchableOpacity onPress={onRimanda} style={{ marginTop: 12, alignItems: 'center' }} activeOpacity={0.65} disabled={azioneInCorso}>
                <Text style={{ color: '#6B7280' }}>Rimanda (24 h)</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <CanaleCondivisioneButton
                label="Sì — WhatsApp"
                variant="primary"
                loading={loading === 'whatsapp'}
                disabled={azioneInCorso && loading !== 'whatsapp'}
                onPress={() => void inviaReminderWhatsApp()}
                style={{ marginTop: 16 }}
              />
              <CanaleCondivisioneButton
                label="Sì — Email / link"
                loading={loading === 'email'}
                disabled={azioneInCorso && loading !== 'email'}
                onPress={() => void inviaReminderEmail()}
              />
              <TouchableOpacity onPress={onRimanda} style={{ marginTop: 12, alignItems: 'center' }} activeOpacity={0.65} disabled={azioneInCorso}>
                <Text style={{ color: '#6B7280' }}>Rimanda (24 h)</Text>
              </TouchableOpacity>
              {invioId ? (
                <TouchableOpacity onPress={() => void nonChiederePiu()} style={{ marginTop: 8, alignItems: 'center' }} disabled={azioneInCorso} activeOpacity={0.65}>
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
