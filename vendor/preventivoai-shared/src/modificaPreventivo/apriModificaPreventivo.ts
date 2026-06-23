export type PreventivoModifica = {
  id: string
  testo_preventivo?: string | null
  versione?: number | null
  cliente_id?: string | null
  nome_cliente?: string | null
}

export type ModificaPreventivoInput = {
  testoPreventivo: string
  versionePadreId: string
  versioneNumero: number
  clienteId?: string | null
  clienteNome?: string | null
}

export function modificaParamsFromPreventivo(
  preventivo: PreventivoModifica,
  versioneSorgente?: PreventivoModifica,
): ModificaPreventivoInput {
  const source = versioneSorgente || preventivo
  return {
    testoPreventivo: source.testo_preventivo || '',
    versionePadreId: preventivo.id,
    versioneNumero: (preventivo.versione || 1) + 1,
    clienteId: preventivo.cliente_id,
    clienteNome: preventivo.nome_cliente,
  }
}

export function paramsRouterModifica(input: ModificaPreventivoInput) {
  return {
    modifica: '1',
    versione_padre_id: input.versionePadreId,
    versione_numero: String(input.versioneNumero),
    cliente_id: input.clienteId || '',
    cliente_nome: input.clienteNome || '',
  }
}
