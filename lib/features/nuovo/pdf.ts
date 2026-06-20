import { MetodoPagamento } from '../../api/preventivoPdf'
import { importoDaTesto } from 'preventivoai-shared'

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
  const importo = importoDaTesto(testo)
  return {
    testo,
    versione_padre_id: versionePadreId,
    cliente_id: clienteId,
    metodo_pagamento_id: metodoPagamento?.id || '',
    importo_totale: importo != null ? String(Math.round(importo)) : '',
  }
}
