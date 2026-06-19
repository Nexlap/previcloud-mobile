import { Linking, Modal, Text, TouchableOpacity, View } from 'react-native'
import { useEffect, useState } from 'react'
import type { Preventivo } from '../../types'
import type { PreventivoInvio } from '../../api/firma'
import {
  apriEmailFirma,
  apriWhatsAppFirma,
  caricaContattiCliente,
  copiaLinkFirma,
  ottieniUrlFirma,
  statoFirmaInvio,
  testoInvioFirma,
} from '../../api/firma'

type Props = {
  visible: boolean
  preventivo: Preventivo
  invio?: PreventivoInvio
  nomeAzienda?: string
  onClose: () => void
  onInviaNuovo?: () => void
}

export function FirmaDettaglioModal({
  visible,
  preventivo,
  invio,
  nomeAzienda,
  onClose,
  onInviaNuovo,
}: Props) {
  const sf = statoFirmaInvio(invio)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [telefono, setTelefono] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const nomeCliente = preventivo.nome_cliente || 'Cliente'

  useEffect(() => {
    if (!visible) return
    setFeedback('')
    if (!preventivo.cliente_id) return
    void caricaContattiCliente(preventivo.cliente_id).then(c => {
      if (c) {
        setTelefono(c.telefono)
        setEmail(c.email)
      }
    })
  }, [visible, preventivo.cliente_id])

  async function condividi(tipo: 'whatsapp' | 'email' | 'link') {
    setFeedback('')
    setLoading(tipo)
    try {
      const url = await ottieniUrlFirma(preventivo.id, invio)
      const testo = testoInvioFirma(nomeCliente, url, nomeAzienda)
      if (tipo === 'whatsapp') {
        await apriWhatsAppFirma(telefono, testo)
        setFeedback('WhatsApp aperto.')
      } else if (tipo === 'email') {
        await apriEmailFirma(email, testo, `Preventivo da firmare — ${nomeCliente}`)
        setFeedback(email ? 'Email aperta.' : 'Scegli il destinatario nell\'app email.')
      } else {
        await copiaLinkFirma(url)
        setFeedback('Link condiviso.')
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoading(null)
    }
  }

  const titolo =
    sf === 'firmato' ? 'Preventivo firmato'
      : sf === 'attesa' ? 'Condividi link firma'
        : 'Firma digitale'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0D1B2A' }}>{titolo}</Text>
          <Text style={{ marginTop: 6, color: '#6B7280', fontSize: 14 }}>Cliente: {nomeCliente}</Text>

          {sf === 'firmato' && invio ? (
            <View style={{ marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0', backgroundColor: '#ECFDF5', padding: 12 }}>
              <Text style={{ fontWeight: '700', color: '#065F46' }}>
                Firmato il {new Date(invio.firmato_at!).toLocaleDateString('it-IT')}
              </Text>
              {invio.pdf_firmato_url ? (
                <TouchableOpacity onPress={() => void Linking.openURL(invio.pdf_firmato_url!)} style={{ marginTop: 8 }}>
                  <Text style={{ color: '#0E9F8E', fontWeight: '600' }}>Apri PDF firmato</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {sf === 'attesa' && invio ? (
            <>
              <Text style={{ marginTop: 12, fontSize: 13, color: '#92400E' }}>
                In attesa firma · valido fino al {new Date(invio.scade_at).toLocaleDateString('it-IT')}
              </Text>
              {(['whatsapp', 'email', 'link'] as const).map(c => (
                <TouchableOpacity
                  key={c}
                  disabled={!!loading}
                  onPress={() => void condividi(c)}
                  style={{ marginTop: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontWeight: '600', color: '#0D1B2A' }}>
                    {loading === c ? '...' : c === 'whatsapp' ? 'WhatsApp' : c === 'email' ? 'Email' : 'Copia link'}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          ) : null}

          {(sf === 'scaduto' || sf === 'revocato') && onInviaNuovo ? (
            <TouchableOpacity
              onPress={() => { onClose(); onInviaNuovo() }}
              style={{ marginTop: 16, backgroundColor: '#0E9F8E', borderRadius: 12, padding: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Invia nuovo link</Text>
            </TouchableOpacity>
          ) : null}

          {feedback ? <Text style={{ marginTop: 10, color: '#0E9F8E', fontSize: 13 }}>{feedback}</Text> : null}

          <TouchableOpacity onPress={onClose} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: '#6B7280' }}>Chiudi</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
