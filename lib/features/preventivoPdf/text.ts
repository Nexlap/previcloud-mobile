import { creaLinkPagamento } from '../../api/pdf'
import { MetodoPagamento } from '../../api/preventivoPdf'
import { testoConPagamento as testoConPagamentoShared } from 'preventivoai-shared'

type TestoConPagamentoParams = {
  testo: string
  preventivoId: string
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

export async function testoConPagamento(params: TestoConPagamentoParams) {
  return testoConPagamentoShared({ ...params, creaLinkPagamento })
}

export function scalaHtmlPreview(html: string) {
  return html.replace('</head>', `
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>html{width:100%}body{transform-origin:top left;transform:scale(__PREVIEW_SCALE__);width:__PREVIEW_WIDTH_PERCENT__%}</style>
        </head>`)
}
