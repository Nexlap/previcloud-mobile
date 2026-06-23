import {
  calcolaTotaleTrasferte,
  calcolaTotaleVoci,
  type TrasfertaCalcolo,
  type VoceCalcolo,
} from './fiscaleCalcolo'
import { formatImportoEuroVisuale, parseImportoEuro } from './importo'

export type VoceBuilderTesto = VoceCalcolo & {
  nome: string
  descrizione: string
  unita: string
}

export type TrasfertaBuilderTesto = TrasfertaCalcolo & {
  tipo: 'km' | 'spesa'
  nome: string
  km?: string
}

export type MetodoPagamentoBuilder = {
  nome: string
  tipo?: string
  dati?: {
    iban?: string
    intestatario?: string
    email?: string
  } | null
}

function parseQuantita(raw: string): number {
  const val = parseImportoEuro(raw)
  return val != null && val > 0 ? val : 1
}

function parseCosto(raw: string): number {
  return parseImportoEuro(raw) ?? 0
}

export function generaTestoPreventivoBuilder(params: {
  nomeCliente: string
  voci: VoceBuilderTesto[]
  trasferte?: TrasfertaBuilderTesto[]
  includiIva: boolean
  noteExtra: string
  metodoPagamentoSelezionato?: MetodoPagamentoBuilder | null
}): string {
  const {
    nomeCliente,
    voci,
    trasferte = [],
    includiIva,
    noteExtra,
    metodoPagamentoSelezionato = null,
  } = params
  const oggi = new Date().toLocaleDateString('it-IT')
  let testo = `PREVENTIVO\nData: ${oggi}  |  Validita': 30 giorni\n`
  if (nomeCliente) testo += `Cliente: ${nomeCliente}\n`
  testo += `\nSERVIZI:\n`
  voci.forEach((v) => {
    const qty = parseQuantita(v.quantita)
    const costo = parseCosto(v.costo)
    const totaleVoce = qty * costo
    testo += `\nSERVIZIO: ${v.nome}\n`
    if (v.descrizione) testo += `DETTAGLI:\n- ${v.descrizione}\n`
    if (qty > 1) testo += `DETTAGLI:\n- ${qty} ${v.unita}\n`
    testo += `PREZZO: \u20AC${formatImportoEuroVisuale(totaleVoce)}\n`
  })
  if (trasferte.length > 0) {
    testo += `\nRIMBORSI SPESE:\n`
    trasferte.forEach((t) => {
      if (t.tipo === 'km') {
        const importoKm = parseImportoEuro(t.importo) ?? 0
        testo += `RIMBORSO: Trasferta km\nDETTAGLIO: ${t.km} km \u00d7 \u20AC0.25 = \u20AC${formatImportoEuroVisuale(importoKm)}\nTIPO: ${t.esente ? 'Esente' : 'Imponibile'}\n`
      } else {
        const importoSpesa = parseImportoEuro(t.importo) ?? 0
        testo += `RIMBORSO: ${t.nome}\nDETTAGLIO: Spesa viva\nTIPO: ${t.esente ? 'Esente' : 'Imponibile'}\nIMPORTO: \u20AC${formatImportoEuroVisuale(importoSpesa)}\n`
      }
    })
  }
  const totaleFinale = calcolaTotaleVoci(voci) + calcolaTotaleTrasferte(trasferte)
  testo += `\nRIEPILOGO:\n`
  if (includiIva) {
    testo += `Imponibile: \u20AC${formatImportoEuroVisuale(totaleFinale)}\nIVA 22%: \u20AC${formatImportoEuroVisuale(totaleFinale * 0.22)}\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nTOTALE: \u20AC${formatImportoEuroVisuale(totaleFinale * 1.22)}\n`
  } else {
    testo += `TOTALE: \u20AC${formatImportoEuroVisuale(totaleFinale)}\n`
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
