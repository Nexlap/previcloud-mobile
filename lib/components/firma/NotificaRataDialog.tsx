import { Alert, Linking, Modal, Text, TouchableOpacity, View } from 'react-native'
import { useRef, useState } from 'react'
import { formatDataBreve, formatImportoEuro } from 'preventivoai-shared'
import { creaLinkPagamentoRata } from '../../api/pdf'
import { sessioneClienteDettaglio } from '../../api/clienteDettaglio'
import { supabase } from '../../supabase'
import type { Notifica } from '../../hooks/useNotifiche'
import { CanaleCondivisioneButton } from './CanaleCondivisioneButton'

const MESI_FULL = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

type Props = {
  notifica: Notifica
  visible: boolean
  onClose: () => void
  onRimanda: () => void
  onCompletata: () => void
}

export function NotificaRataDialog({ notifica, visible, onClose, onRimanda, onCompletata }: Props) {
  const payload = notifica.payload || {}
  const [loading, setLoading] = useState(false)
  const inFlightRef = useRef(false)

  const clienteNome = typeof payload.cliente_nome === 'string' ? payload.cliente_nome : 'Cliente'
  const importoResiduo = typeof payload.importo_residuo === 'number' ? payload.importo_residuo : null
  const scadenza = typeof payload.scadenza === 'string' ? payload.scadenza : null
  const rataId = typeof payload.rata_id === 'string' ? payload.rata_id : null
  const tipoPiano = payload.tipo_piano === 'canone' ? 'canone' : 'rate'
  const mese = typeof payload.mese === 'number' ? payload.mese : null
  const anno = typeof payload.anno === 'number' ? payload.anno : null
  const clienteId = typeof payload.cliente_id === 'string' ? payload.cliente_id : null

  async function inviaReminderWhatsApp() {
    if (!rataId || inFlightRef.current || loading) return
    inFlightRef.current = true
    setLoading(true)
    try {
      const session = await sessioneClienteDettaglio()
      if (!session) throw new Error('Sessione non valida')

      const residuo = importoResiduo ?? 0
      const link = await creaLinkPagamentoRata(rataId, clienteNome, session.access_token)

      let telefono: string | undefined
      if (clienteId) {
        const { data } = await supabase.from('clienti').select('telefono').eq('id', clienteId).maybeSingle()
        telefono = data?.telefono?.replace(/\s/g, '') || undefined
      }

      let testo: string
      if (tipoPiano === 'canone' && mese && anno) {
        testo = `Ciao ${clienteNome}, ti ricordo il pagamento di €${formatImportoEuro(residuo, 2)} per il canone di ${MESI_FULL[mese - 1]} ${anno}. Puoi pagare qui: ${link}`
      } else if (scadenza) {
        testo = `Ciao ${clienteNome}, ti ricordo il pagamento di €${formatImportoEuro(residuo, 2)} per la rata del ${formatDataBreve(scadenza)}. Puoi pagare qui: ${link}`
      } else {
        testo = `Ciao ${clienteNome}, ti ricordo il pagamento di €${formatImportoEuro(residuo, 2)}. Puoi pagare qui: ${link}`
      }

      const url = `whatsapp://send?text=${encodeURIComponent(testo)}${telefono ? `&phone=${telefono}` : ''}`
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url)
        onCompletata()
      } else {
        Alert.alert('WhatsApp non disponibile', 'Copia il link e invialo manualmente', [
          { text: 'OK' },
        ])
        onRimanda()
      }
    } catch {
      onRimanda()
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }

  const dettaglioRata = [
    clienteNome,
    importoResiduo != null ? `€${formatImportoEuro(importoResiduo, 2)} residuo` : null,
    scadenza ? `scadenza ${formatDataBreve(scadenza)}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0D1B2A' }}>{notifica.titolo}</Text>
          <Text style={{ marginTop: 8, color: '#6B7280', fontSize: 14, lineHeight: 20 }}>{notifica.messaggio}</Text>
          {dettaglioRata ? (
            <Text style={{ marginTop: 12, color: '#0D1B2A', fontSize: 13, fontWeight: '600' }}>{dettaglioRata}</Text>
          ) : null}

          <CanaleCondivisioneButton
            label="Invia reminder WA"
            variant="primary"
            loading={loading}
            disabled={!rataId || loading}
            onPress={() => void inviaReminderWhatsApp()}
            style={{ marginTop: 16 }}
          />
          <TouchableOpacity onPress={onRimanda} style={{ marginTop: 12, alignItems: 'center' }} activeOpacity={0.65} disabled={loading}>
            <Text style={{ color: '#6B7280' }}>Rimanda (24 h)</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
