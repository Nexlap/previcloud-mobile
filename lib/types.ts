// ── Tipi condivisi in tutta l'app ─────────────────────────────────

export interface Profile {
  id?: string
  nome_azienda: string | null
  categoria: string | null
  citta: string | null
  piva: string | null
  telefono: string | null
  tono: string | null
  listino: string | null
  logo_url: string | null
  colore_brand: string | null
  note_pagamento: string | null
  firma_nome: string | null
  template_preferito: string | null
  contatore_preventivi: number
  plan?: string | null
}

export interface Cliente {
  id: string
  nome: string
  telefono: string | null
  email: string | null
  indirizzo: string | null
  note: string | null
  created_at?: string
  totale_preventivi?: number
  num_preventivi?: number
}

export interface Preventivo {
  id: string
  user_id?: string
  testo_preventivo: string | null
  importo_totale: number | null
  stato: string
  created_at: string
  versione: number | null
  is_ultimo: boolean
  cliente_id: string | null
  nome_cliente: string | null
  preventivo_padre_id: string | null
  template: string | null
  titolo: string | null
  pdf_url: string | null
  messaggi_chat?: Messaggio[] | null
  clienti?: { nome: string } | null
}

export interface Servizio {
  id: string
  nome: string
  descrizione: string | null
  costo: number | null
  unita: string
  ordine?: number
}

export interface VocePreventivo {
  servizio_id: string
  nome: string
  descrizione: string
  costo: string
  quantita: string
  unita: string
}

export interface Messaggio {
  role: 'user' | 'assistant'
  content: string
}

export interface ProfiloFiscale {
  id?: string
  regime: 'forfettario' | 'ordinario' | 'occasionale'
  coefficiente_redditivita: string
  aliquota_sostitutiva: string
  inps_percentuale: string
  inps_tipo: string
  riduzione_contributiva: boolean
  riduzione_percentuale: string
  rivalsa_inps: boolean
  rivalsa_percentuale: string
  soglia_fatturato: string
  aliquota_iva: string
  costi_deducibili_percentuale: string
  ritenuta_acconto: string
  soglia_occasionale: string
  attivo?: boolean
}

export interface Trascrizione {
  id: string
  titolo: string | null
  testo: string | null
  durata_secondi: number | null
  created_at: string
  cliente_id?: string | null
}

export interface Segnalazione {
  tipo: 'bug' | 'suggerimento' | 'altro'
  titolo: string
  descrizione: string
  schermata?: string
}
