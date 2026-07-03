import { creaLinkPagamento } from '../../api/pdf'
import { MetodoPagamento } from '../../api/preventivoPdf'
import { testoConPagamento as testoConPagamentoShared } from 'preventivoai-shared'

export { scalaHtmlPreview } from './pdfPreviewPaginata'

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
