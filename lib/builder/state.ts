import { BuilderMemoryState } from './types'
import { meseCorrenteString } from 'preventivoai-shared'

export const builderState: BuilderMemoryState = {
  voci: [],
  nomeCliente: '',
  noteExtra: '',
  includiIva: false,
  trasferte: [],
  mostraTrasferte: false,
  nuovaSpesaNome: '',
  nuovaSpesaImporto: '',
  nuoviKm: '',
  abbonamentoAttivo: false,
  abImporto: '',
  abGiorno: '1',
  abMeseInizio: meseCorrenteString(),
  abMensilita: '',
  abVisibileNelPDF: true,
  pagamentoRateAttivo: false,
  rateNumero: '',
  rateGiornoScadenza: '1',
  rateMeseInizio: meseCorrenteString(),
  rateVisibileNelPDF: true,
  metodoPagamentoNessuno: false,
  metodoPagamentoId: null,
}

export function resetBuilderState() {
  builderState.voci = []
  builderState.nomeCliente = ''
  builderState.noteExtra = ''
  builderState.includiIva = false
  builderState.trasferte = []
  builderState.mostraTrasferte = false
  builderState.nuovaSpesaNome = ''
  builderState.nuovaSpesaImporto = ''
  builderState.nuoviKm = ''
  builderState.abbonamentoAttivo = false
  builderState.abImporto = ''
  builderState.abGiorno = '1'
  builderState.abMeseInizio = meseCorrenteString()
  builderState.abMensilita = ''
  builderState.abVisibileNelPDF = true
  builderState.pagamentoRateAttivo = false
  builderState.rateNumero = ''
  builderState.rateGiornoScadenza = '1'
  builderState.rateMeseInizio = meseCorrenteString()
  builderState.rateVisibileNelPDF = true
  builderState.metodoPagamentoNessuno = false
  builderState.metodoPagamentoId = null
}
