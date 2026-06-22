import { VocePreventivo } from '../types'
export type { RisultatoFiscale } from 'preventivoai-shared'

export type TrasfertaBuilder = {
  id: string
  tipo: 'km' | 'spesa'
  nome: string
  importo: string
  km?: string
  esente: boolean
}

export type BuilderMemoryState = {
  voci: VocePreventivo[]
  nomeCliente: string
  noteExtra: string
  includiIva: boolean
  trasferte: TrasfertaBuilder[]
  mostraTrasferte: boolean
  nuovaSpesaNome: string
  nuovaSpesaImporto: string
  nuoviKm: string
  abbonamentoAttivo: boolean
  abImporto: string
  abGiorno: string
  abMeseInizio: string
  abMensilita: string
  abVisibileNelPDF: boolean
  pagamentoRateAttivo: boolean
  rateNumero: string
  rateGiornoScadenza: string
  rateMeseInizio: string
  rateVisibileNelPDF: boolean
  metodoPagamentoNessuno: boolean
  metodoPagamentoId: string | null
}
