import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useEffect, useState } from 'react'
import type { CanaleFirma } from '../../api/firma'
import {
  apriWhatsAppFirma,
  apriEmailFirma,
  copiaLinkFirma,
  inviaPreventivoPerFirma,
  caricaMessaggiCliente,
  buildMessaggioFirmaInvio,
  buildOggettoFirmaInvio,
} from '../../api/firma'
import { sessionToken } from '../../api/settings'

type Props = {
  visible: boolean
  preventivoId: string
  nomeCliente: string
  telefonoCliente?: string | null
  emailCliente?: string | null
  nomeAzienda?: string
  haStripe?: boolean
  onClose: () => void
  onInviato?: () => void
  onFirmaManuale?: () => void
}

export function InviaFirmaModal({
  visible,
  preventivoId,
  nomeCliente,
  telefonoCliente,
  emailCliente,
  nomeAzienda,
  haStripe,
  onClose,
  onInviato,
  onFirmaManuale,
}: Props) {
  const [loading, setLoading] = useState<CanaleFirma | null>(null)
  const [feedback, setFeedback] = useState('')
  const [errore, setErrore] = useState('')

  useEffect(() => {
    if (visible) void caricaMessaggiCliente(true)
  }, [visible])

  async function esegui(canale: CanaleFirma) {
    setErrore('')
    setFeedback('')
    setLoading(canale)
    try {
      const token = await sessionToken()
      const templates = await caricaMessaggiCliente()
      const res = await inviaPreventivoPerFirma(preventivoId, canale, token)
      if (!res.url) throw new Error('Link firma non disponibile')
      const testo = buildMessaggioFirmaInvio(nomeCliente, res.url, nomeAzienda, { haStripe, templates })
      if (canale === 'whatsapp') {
        await apriWhatsAppFirma(telefonoCliente, testo)
        setFeedback('WhatsApp aperto con il link.')
      } else if (canale === 'email') {
        await apriEmailFirma(
          emailCliente,
          testo,
          buildOggettoFirmaInvio(nomeCliente, templates),
        )
        setFeedback(emailCliente ? 'Email aperta con il link.' : 'Scegli il destinatario nell\'app email.')
      } else {
        await copiaLinkFirma(res.url)
        setFeedback('Link condiviso.')
      }
      onInviato?.()
      setTimeout(onClose, 1000)
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore invio')
    } finally {
      setLoading(null)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi" />
        <View style={styles.box}>
          <Text style={styles.title}>Invia per firma</Text>
          <Text style={styles.subtitle}>
            Il cliente <Text style={styles.bold}>{nomeCliente}</Text> potrà firmare online (30 giorni).
            {haStripe ? ' Il pagamento Stripe è già nella pagina — non serve inviarlo a parte.' : ''}
          </Text>
          {(['whatsapp', 'email', 'link'] as CanaleFirma[]).map((c) => (
            <TouchableOpacity
              key={c}
              disabled={!!loading}
              activeOpacity={0.85}
              onPress={() => void esegui(c)}
              style={styles.canaleBtn}
            >
              <Text style={styles.canaleBtnText}>
                {loading === c ? '...' : c === 'whatsapp' ? 'WhatsApp' : c === 'email' ? 'Email' : 'Copia link'}
              </Text>
            </TouchableOpacity>
          ))}
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
          {errore ? <Text style={styles.errore}>{errore}</Text> : null}
          {onFirmaManuale ? (
            <TouchableOpacity onPress={() => { onClose(); onFirmaManuale() }} style={styles.firmaManuale}>
              <Text style={styles.firmaManualeText}>Il cliente ha firmato a mano</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onClose} style={styles.annulla} activeOpacity={0.85}>
            <Text style={styles.annullaText}>Annulla</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  subtitle: { marginTop: 8, color: '#6B7280', fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: '600', color: '#0D1B2A' },
  canaleBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  canaleBtnText: { fontWeight: '600', color: '#0D1B2A' },
  feedback: { marginTop: 10, color: '#0E9F8E', fontSize: 13 },
  errore: { marginTop: 10, color: '#DC2626', fontSize: 13 },
  firmaManuale: { marginTop: 14, alignItems: 'center' },
  firmaManualeText: { color: '#0E9F8E', fontWeight: '600', fontSize: 14 },
  annulla: { marginTop: 16, alignItems: 'center' },
  annullaText: { color: '#6B7280' },
})
