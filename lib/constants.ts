import Constants from 'expo-constants'

export {
  ESEMPI_LISTINO,
  labelMese,
  MESI_BREVI,
  MESI_FULL,
  TEMPLATES,
  UNITA_MISURA,
} from 'previcloud-shared'

// ── URL Backend ────────────────────────────────────────────────────
export const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl as string

// ── Colori principali ─────────────────────────────────────────────
export const COLORS = {
  primary: '#0D1B2A',
  accent: '#0E9F8E',
  // Variante più scura del teal, usata come colore testo/icona su sfondi chiari
  // per garantire un contrasto WCAG AA (il teal puro è ~3.3:1 su bianco).
  accentInk: '#0B7A6D',
  background: '#F7F8FA',
  white: '#fff',
  border: '#E5E7EB',
  textPrimary: '#0D1B2A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  danger: '#EF4444',
  success: '#0E9F8E',
  warning: '#F59E0B',
} as const

// ── Categorie professionali ────────────────────────────────────────
export const CATEGORIE = [
  'videomaker', 'fotografo', 'catering', 'falegname',
  'estetista', 'elettricista', 'idraulico', 'imbianchino',
  'consulente', 'altro'
] as const

// ── Toni comunicazione ─────────────────────────────────────────────
export const TONI = [
  'professionale e diretto',
  'cordiale e disponibile',
  'formale e preciso',
  'semplice e informale'
] as const

// ── Stati preventivo ───────────────────────────────────────────────
export const STATI_PREVENTIVO = ['bozza', 'inviato', 'accettato', 'rifiutato'] as const

// ── Colori preset brand ────────────────────────────────────────────
export const COLORI_PRESET = [
  '0D1B2A', '0E9F8E', '6B21A8', 'B45309',
  '1D4ED8', 'DC2626', '065F46', '374151',
] as const
