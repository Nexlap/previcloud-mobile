import { creaLinkPagamento } from '../../api/pdf'
import { MetodoPagamento } from '../../api/preventivoPdf'

export function importoDaTesto(testo: string): number | null {
  const match = testo.match(/TOTALE[:\s]*?€?\s*([\d.,]+)/i)
  return match ? parseFloat(match[1].replace(',', '.')) : null
}

type TestoConPagamentoParams = {
  testo: string
  abbonamentoAttivo: boolean
  abVisibileNelPDF: boolean
  abImporto: string
  metodoPagamento: MetodoPagamento | null
  token: string
}

export async function testoConPagamento({
  testo,
  abbonamentoAttivo,
  abVisibileNelPDF,
  abImporto,
  metodoPagamento,
  token,
}: TestoConPagamentoParams) {
  let testoBase = testo

  if (abbonamentoAttivo && abVisibileNelPDF && abImporto) {
    testoBase += `\nCANONE MENSILE: EUR ${abImporto}/mese`
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
          <style>html{width:100%}body{transform-origin:top left;transform:scale(0.45);width:222%}</style>
        </head>`)
}
