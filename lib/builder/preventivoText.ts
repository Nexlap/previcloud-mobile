import { VocePreventivo } from '../types'
import { calcolaTotaleTrasferte, calcolaTotaleVoci } from './fiscale'
import { formatImportoEuroVisuale } from '../utils/importo'
import { TrasfertaBuilder } from './types'

type MetodoPagamento = {
  nome: string
  tipo?: string
  dati?: {
    iban?: string
    intestatario?: string
    email?: string
  }
}

export function generaTestoPreventivoBuilder(params: {
  nomeCliente: string
  voci: VocePreventivo[]
  trasferte: TrasfertaBuilder[]
  includiIva: boolean
  noteExtra: string
  metodoPagamentoSelezionato: MetodoPagamento | null
}) {
  const { nomeCliente, voci, trasferte, includiIva, noteExtra, metodoPagamentoSelezionato } = params
  const oggi = new Date().toLocaleDateString('it-IT')
  let testo = `PREVENTIVO\nData: ${oggi}  |  Validita': 30 giorni\n`
  if (nomeCliente) testo += `Cliente: ${nomeCliente}\n`
  testo += `\nSERVIZI:\n`
  voci.forEach(v => {
    const qty = parseFloat(v.quantita) || 1
    const costo = parseFloat(v.costo) || 0
    const totaleVoce = qty * costo
    testo += `\nSERVIZIO: ${v.nome}\n`
    if (v.descrizione) testo += `DETTAGLI:\n- ${v.descrizione}\n`
    if (qty > 1) testo += `DETTAGLI:\n- ${qty} ${v.unita}\n`
    testo += `PREZZO: €${formatImportoEuroVisuale(totaleVoce)}\n`
  })
  if (trasferte.length > 0) {
    testo += `\nRIMBORSI SPESE:\n`
    trasferte.forEach(t => {
      if (t.tipo === 'km') {
        const importoKm = parseFloat(t.importo) || 0
        testo += `RIMBORSO: Trasferta km\nDETTAGLIO: ${t.km} km × €0.25 = €${formatImportoEuroVisuale(importoKm)}\nTIPO: ${t.esente ? 'Esente' : 'Imponibile'}\n`
      } else {
        const importoSpesa = parseFloat(t.importo) || 0
        testo += `RIMBORSO: ${t.nome}\nDETTAGLIO: Spesa viva\nTIPO: ${t.esente ? 'Esente' : 'Imponibile'}\nIMPORTO: €${formatImportoEuroVisuale(importoSpesa)}\n`
      }
    })
  }
  const totaleFinale = calcolaTotaleVoci(voci) + calcolaTotaleTrasferte(trasferte)
  testo += `\nRIEPILOGO:\n`
  if (includiIva) {
    testo += `Imponibile: €${formatImportoEuroVisuale(totaleFinale)}\nIVA 22%: €${formatImportoEuroVisuale(totaleFinale * 0.22)}\n─────────────────\nTOTALE: €${formatImportoEuroVisuale(totaleFinale * 1.22)}\n`
  } else {
    testo += `TOTALE: €${formatImportoEuroVisuale(totaleFinale)}\n`
  }
  if (noteExtra) testo += `\nNote: ${noteExtra}`
  if (metodoPagamentoSelezionato) {
    const m = metodoPagamentoSelezionato
    let pagamento = `\nPAGAMENTO: ${m.nome}`
    if (m.tipo === 'bonifico' && m.dati?.iban) pagamento += `\nIBAN: ${m.dati.iban}`
    if (m.tipo === 'bonifico' && m.dati?.intestatario) pagamento += `\nIntestatario: ${m.dati.intestatario}`
    if (m.tipo === 'paypal' && m.dati?.email) pagamento += `\nPayPal: ${m.dati.email}`
    testo += pagamento
  }
  return testo
}
