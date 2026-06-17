import { MetodoPagamento } from '../../api/preventivoPdf'

type ParametriPDFInput = {
  testo: string
  versionePadreId: string
  clienteId: string
  metodoPagamento: MetodoPagamento | null
}

export function parametriPDF({
  testo,
  versionePadreId,
  clienteId,
  metodoPagamento,
}: ParametriPDFInput) {
  return {
    testo,
    versione_padre_id: versionePadreId,
    cliente_id: clienteId,
    metodo_pagamento_id: metodoPagamento?.id || '',
  }
}
