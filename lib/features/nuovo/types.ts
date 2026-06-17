export type NuovoParams = {
  trascrizione: string
  trascrizioneId: string
  preventivo_id: string
  modifica: string
  testo_modifica: string
  versione_padre_id: string
  versione_numero: string
  cliente_id: string
  cliente_nome: string
}

export type ClienteSuggerito = {
  id: string
  nome: string
  telefono: string | null
  email: string | null
}

export type ClienteRilevato = {
  id: string
  nome: string
}

export type DatiClienteNuovo = {
  telefono: string
  email: string
  indirizzo: string
}
