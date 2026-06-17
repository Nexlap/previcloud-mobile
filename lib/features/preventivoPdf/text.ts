import { creaLinkPagamento } from '../../api/pdf'
import { MetodoPagamento } from '../../api/preventivoPdf'
import { parseImportoEuro, testoPagamentoRatePdf, calcolaScadenzeRate, labelScadenzaRata } from '../../utils/importo'
import { giornoScadenzaValido } from '../../utils/giornoScadenza'

export function importoDaTesto(testo: string): number | null {
  const righe = testo.split('\n')
  for (let i = righe.length - 1; i >= 0; i--) {
    const riga = righe[i].trim()
    if (!/^TOTALE:/i.test(riga)) continue
    const match = riga.match(/TOTALE:\s*(?:EUR\s*)?(?:€\s*)?([\d.,]+)/i)
    if (match) return parseImportoEuro(match[1])
  }

  const matches = [...testo.matchAll(/TOTALE:\s*(?:EUR\s*)?(?:€\s*)?([\d.,]+)/gi)]
  if (matches.length > 0) {
    return parseImportoEuro(matches[matches.length - 1][1])
  }

  const imponibile = testo.match(/Imponibile:\s*(?:EUR\s*)?(?:€\s*)?([\d.,]+)/i)
  if (imponibile && !/IVA\s*22%/i.test(testo)) {
    return parseImportoEuro(imponibile[1])
  }

  return null
}

type TestoConPagamentoParams = {
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
  metodoPagamento: MetodoPagamento | null
  token: string
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
  metodoPagamento,
  token,
}: TestoConPagamentoParams) {
  let testoBase = testo

  if (pagamentoRateAttivo && rateVisibileNelPDF) {
    testoBase += testoPagamentoRatePdf({
      attivo: true,
      visibileNelPDF: true,
      importoTotale: rateImportoTotale,
      numeroRate: rateNumero,
      giornoScadenza: rateGiornoScadenza,
      meseInizio: rateMeseInizio >= 1 && rateMeseInizio <= 12 ? rateMeseInizio : undefined,
    })
  }

  if (abbonamentoAttivo && abVisibileNelPDF && abImporto) {
    testoBase += `\nCANONE MENSILE: \u20AC${abImporto}/mese`
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

  if (metodoPagamento.tipo === 'stripe') {
    const link = await creaLinkPagamento(importoDaTesto(testo) || 0, 'Preventivo', token)
    return testoBase + `\nPAGAMENTO: Online con carta\nLINK PAGAMENTO: ${link}`
  }

  return testoBase + `\nPAGAMENTO: ${metodoPagamento.nome}${metodoPagamento.tipo === 'bonifico' && metodoPagamento.dati?.iban ? '\nIBAN: ' + metodoPagamento.dati.iban : ''}${metodoPagamento.tipo === 'paypal' && metodoPagamento.dati?.email ? '\nPayPal: ' + metodoPagamento.dati.email : ''}`
}

export function scalaHtmlPreview(html: string) {
  return html.replace('</head>', `
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>html{width:100%}body{transform-origin:top left;transform:scale(__PREVIEW_SCALE__);width:__PREVIEW_WIDTH_PERCENT__%}</style>
        </head>`)
}
