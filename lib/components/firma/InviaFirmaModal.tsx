import { Modal, Text, TouchableOpacity, View } from 'react-native'
import { useState } from 'react'
import type { CanaleFirma } from '../../api/firma'
import {
  apriWhatsAppFirma,
  apriEmailFirma,
  copiaLinkFirma,
  inviaPreventivoPerFirma,
  testoInvioFirma,
} from '../../api/firma'
import { sessionToken } from '../../api/settings'

type Props = {
  visible: boolean
  preventivoId: string
  nomeCliente: string
  telefonoCliente?: string | null
  emailCliente?: string | null
  nomeAzienda?: string
  onClose: () => void
  onInviato?: () => void
}

export function InviaFirmaModal({
  visible,
  preventivoId,
  nomeCliente,
  telefonoCliente,
  emailCliente,
  nomeAzienda,
  onClose,
  onInviato,
}: Props) {
  const [loading, setLoading] = useState<CanaleFirma | null>(null)
  const [feedback, setFeedback] = useState('')
  const [errore, setErrore] = useState('')

  async function esegui(canale: CanaleFirma) {
    setErrore('')
    setFeedback('')
    setLoading(canale)
    try {
      const token = await sessionToken()
      const res = await inviaPreventivoPerFirma(preventivoId, canale, token)
      if (!res.url) throw new Error('Link firma non disponibile')
      const testo = testoInvioFirma(nomeCliente, res.url, nomeAzienda)
      if (canale === 'whatsapp') {
        await apriWhatsAppFirma(telefonoCliente, testo)
        setFeedback('WhatsApp aperto con il link.')
      } else if (canale === 'email') {
        await apriEmailFirma(emailCliente, testo, `Preventivo da firmare — ${nomeCliente}`)
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
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0D1B2A' }}>Invia per firma</Text>
          <Text style={{ marginTop: 8, color: '#6B7280', fontSize: 14 }}>
            Il cliente <Text style={{ fontWeight: '600' }}>{nomeCliente}</Text> potrà firmare online (30 giorni).
          </Text>
          {(['whatsapp', 'email', 'link'] as CanaleFirma[]).map((c) => (
            <TouchableOpacity
              key={c}
              disabled={!!loading}
              onPress={() => void esegui(c)}
              style={{ marginTop: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, alignItems: 'center' }}
            >
              <Text style={{ fontWeight: '600', color: '#0D1B2A' }}>
                {loading === c ? '...' : c === 'whatsapp' ? 'WhatsApp' : c === 'email' ? 'Email' : 'Copia link'}
              </Text>
            </TouchableOpacity>
          ))}
          {feedback ? <Text style={{ marginTop: 10, color: '#0E9F8E', fontSize: 13 }}>{feedback}</Text> : null}
          {errore ? <Text style={{ marginTop: 10, color: '#DC2626', fontSize: 13 }}>{errore}</Text> : null}
          <TouchableOpacity onPress={onClose} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: '#6B7280' }}>Annulla</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
