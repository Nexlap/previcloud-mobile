import { VocePreventivo } from '../types'
import { calcolaTotaleTrasferte, calcolaTotaleVoci } from './fiscale'
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
    const totaleVoce = (qty * costo).toFixed(0)
    testo += `\nSERVIZIO: ${v.nome}\n`
    if (v.descrizione) testo += `DETTAGLI:\n- ${v.descrizione}\n`
    if (qty > 1) testo += `DETTAGLI:\n- ${qty} ${v.unita}\n`
    testo += `PREZZO: €${totaleVoce}\n`
  })
  if (trasferte.length > 0) {
    testo += `\nRIMBORSI SPESE:\n`
    trasferte.forEach(t => {
      if (t.tipo === 'km') {
        testo += `RIMBORSO: Trasferta km\nDETTAGLIO: ${t.km} km × €0.25 = €${t.importo}\nTIPO: ${t.esente ? 'Esente' : 'Imponibile'}\n`
      } else {
        testo += `RIMBORSO: ${t.nome}\nDETTAGLIO: Spesa viva\nTIPO: ${t.esente ? 'Esente' : 'Imponibile'}\nIMPORTO: €${t.importo}\n`
      }
    })
  }
  const totaleFinale = calcolaTotaleVoci(voci) + calcolaTotaleTrasferte(trasferte)
  testo += `\nRIEPILOGO:\n`
  if (includiIva) {
    testo += `Imponibile: €${totaleFinale.toFixed(2).replace(/\.00$/, '')}\nIVA 22%: €${(totaleFinale * 0.22).toFixed(2).replace(/\.00$/, '')}\n─────────────────\nTOTALE: €${(totaleFinale * 1.22).toFixed(2).replace(/\.00$/, '')}\n`
  } else {
    testo += `TOTALE: €${totaleFinale.toFixed(2).replace(/\.00$/, '')}\n`
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
