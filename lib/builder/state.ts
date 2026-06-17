import { BuilderMemoryState } from './types'

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
}
