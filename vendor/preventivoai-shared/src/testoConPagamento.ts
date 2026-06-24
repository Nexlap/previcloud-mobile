import {
  calcolaScadenzeRate,
  formatImportoEuro,
  importoDaTesto,
  labelScadenzaRata,
  parseImportoEuro,
  testoPagamentoRatePdf,
} from './importo'
import { giornoScadenzaValido } from './giornoScadenza'
import type { RateAccontoTipo, RateModalitaPiano } from './calcolaAccontoSaldoPiano'
import { calcolaAccontoSaldoPiano } from './calcolaAccontoSaldoPiano'

/** Formato importo per URL PayPal.me: "150" o "150.50", punto decimale, senza migliaia. */
function formatImportoPaypalMe(importo: number): string {
  const arrotondato = Math.round(importo * 100) / 100
  const haCentesimi = Math.round(arrotondato * 100) % 100 !== 0
  const formatted = formatImportoEuro(arrotondato, haCentesimi ? 2 : 0)
  return formatted.replace(/\./g, '').replace(',', '.')
}

export function generaLinkPaypalMe(username: string, importo: number): string {
  const user = username
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^paypal\.me\//i, '')
    .replace(/^\/+|\/+$/g, '')
  return `https://paypal.me/${user}/${formatImportoPaypalMe(importo)}EUR`
}

export type MetodoPagamentoTesto = {
  nome: string
  tipo?: string
  dati?: Record<string, string> | null
}

export type GeneraTestoReminderPagamentoParams = {
  clienteNome: string
  residuo: number
  periodoLabel: string
  metodo: MetodoPagamentoTesto | null
  link?: string | null
}

export function generaTestoReminderPagamento({
  clienteNome,
  residuo,
  periodoLabel,
  metodo,
  link,
}: GeneraTestoReminderPagamentoParams): string {
  const importo = formatImportoEuro(residuo, 2)
  const base = `Ciao ${clienteNome}, ti ricordo il pagamento di €${importo} per ${periodoLabel}`

  if (!metodo) {
    return `${base}.`
  }

  if (metodo.tipo === 'stripe' || (metodo.tipo === 'paypal' && link)) {
    return `${base}. Puoi pagare qui: ${link}`
  }

  if (metodo.tipo === 'bonifico') {
    let testo = `${base}.`
    if (metodo.dati?.iban) {
      testo += `\nIBAN: ${metodo.dati.iban}`
    }
    if (metodo.dati?.intestatario) {
      testo += `\nIntestatario: ${metodo.dati.intestatario}`
    }
    return testo
  }

  if (metodo.tipo === 'paypal' && metodo.dati?.email) {
    return `${base}. Puoi inviare il pagamento al conto PayPal: ${metodo.dati.email}`
  }

  return `${base}.`
}

export type TestoConPagamentoParams = {
  testo: string
  abbonamentoAttivo: boolean
  abVisibileNelPDF: boolean
  abImporto: string
  abGiorno?: string
  abMeseInizio?: number
  pagamentoRateAttivo?: boolean
  rateVisibileNelPDF?: boolean
  rateImportoTotale?: number
  rateNumero?: number
  rateGiornoScadenza?: number
  rateMeseInizio?: number
  rateModalita?: RateModalitaPiano
  rateAccontoTipo?: RateAccontoTipo
  rateAccontoValore?: string
  metodoPagamento: MetodoPagamentoTesto | null
  token: string
  preventivoId: string
  creaLinkPagamento: (preventivoId: string, titolo: string, token: string) => Promise<{ payment_url: string; stripe_session_id: string }>
  accontoLinkPrecomputato?: string
  onStripeSessionCreated?: (sessionId: string) => void
}

export async function testoConPagamento({
  testo,
  abbonamentoAttivo,
  abVisibileNelPDF,
  abImporto,
  abGiorno = '1',
  abMeseInizio = 0,
  pagamentoRateAttivo = false,
  rateVisibileNelPDF = false,
  rateImportoTotale = 0,
  rateNumero = 0,
  rateGiornoScadenza = 0,
  rateMeseInizio = 0,
  rateModalita = 'rate_uguali',
  rateAccontoTipo = 'fisso',
  rateAccontoValore = '',
  metodoPagamento,
  token,
  preventivoId,
  creaLinkPagamento,
  accontoLinkPrecomputato,
  onStripeSessionCreated,
}: TestoConPagamentoParams): Promise<string> {
  let testoBase = testo

  const accontoSaldoRate =
    pagamentoRateAttivo
    && rateModalita === 'acconto_saldo'
    && rateImportoTotale > 0
      ? calcolaAccontoSaldoPiano(rateImportoTotale, rateAccontoTipo, rateAccontoValore)
      : null

  if (pagamentoRateAttivo && rateVisibileNelPDF) {
    testoBase += testoPagamentoRatePdf({
      attivo: true,
      visibileNelPDF: true,
      importoTotale: rateImportoTotale,
      numeroRate: rateNumero,
      giornoScadenza: rateGiornoScadenza,
      meseInizio: rateMeseInizio >= 1 && rateMeseInizio <= 12 ? rateMeseInizio : undefined,
      rateModalita,
      rateAccontoTipo,
      rateAccontoValore,
    })
  }

  if (abbonamentoAttivo && abVisibileNelPDF && abImporto) {
    const importoCanone = parseImportoEuro(abImporto)
    testoBase += `\nCANONE MENSILE: \u20AC${importoCanone != null ? formatImportoEuro(importoCanone, 2) : abImporto}/mese`
    const giorno = parseInt(abGiorno, 10)
    const mese = abMeseInizio >= 1 && abMeseInizio <= 12 ? abMeseInizio : undefined
    if (giornoScadenzaValido(abGiorno)) {
      const prima = calcolaScadenzeRate(1, giorno, mese)[0]
      if (prima) {
        testoBase += `\nSCADENZA PRIMO CANONE: ${labelScadenzaRata(prima.mese, prima.anno, prima.giorno)}`
      }
    }
  }

  if (!metodoPagamento) return testoBase

  const importoPagamento = accontoSaldoRate?.acconto ?? (importoDaTesto(testo) || 0)
  const rigaAccontoRichiesto = accontoSaldoRate
    ? `\nACCONTO RICHIESTO: \u20AC${formatImportoEuro(accontoSaldoRate.acconto, 2)} (saldo \u20AC${formatImportoEuro(accontoSaldoRate.saldo, 2)} alla consegna)`
    : ''

  if (metodoPagamento.tipo === 'stripe') {
    if (accontoSaldoRate && accontoLinkPrecomputato) {
      return `${testoBase}\nPAGAMENTO: Online con carta${rigaAccontoRichiesto}\nLINK PAGAMENTO: ${accontoLinkPrecomputato}`
    }
    if (!preventivoId) {
      return `${testoBase}\nPAGAMENTO: Online con carta${rigaAccontoRichiesto}\nLINK PAGAMENTO: [PAGAMENTO_ONLINE]`
    }
    const result = await creaLinkPagamento(preventivoId, 'Preventivo', token)
    onStripeSessionCreated?.(result.stripe_session_id)
    return `${testoBase}\nPAGAMENTO: Online con carta${rigaAccontoRichiesto}\nLINK PAGAMENTO: ${result.payment_url}`
  }

  let extra = `\nPAGAMENTO: ${metodoPagamento.nome}${rigaAccontoRichiesto}`
  if (metodoPagamento.tipo === 'bonifico' && metodoPagamento.dati?.iban) {
    extra += `\nIBAN: ${metodoPagamento.dati.iban}`
  }
  if (metodoPagamento.tipo === 'paypal') {
    if (metodoPagamento.dati?.email) {
      extra += `\nPayPal: ${metodoPagamento.dati.email}`
    }
    const paypalme = metodoPagamento.dati?.paypalme?.trim()
    if (accontoSaldoRate && accontoLinkPrecomputato) {
      extra += `\nLINK PAGAMENTO: ${accontoLinkPrecomputato}`
    } else if (paypalme) {
      extra += `\nLINK PAGAMENTO: ${generaLinkPaypalMe(paypalme, importoPagamento)}`
    }
  }
  return testoBase + extra
}
