import Constants from 'expo-constants'

// ── URL Backend ────────────────────────────────────────────────────
export const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl as string

// ── Colori principali ─────────────────────────────────────────────
export const COLORS = {
  primary: '#0D1B2A',
  accent: '#0E9F8E',
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

export const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'] as const

// ── Template PDF disponibili ───────────────────────────────────────
export const TEMPLATES = [
  { id: 'pulito', nome: 'Pulito', desc: 'Moderno e professionale', emoji: '⬜' },
  { id: 'classico', nome: 'Classico', desc: 'Formale con bordi', emoji: '📋' },
  { id: 'bold', nome: 'Bold', desc: 'Intestazione colorata', emoji: '🎨' },
  { id: 'minimal_dark', nome: 'Dark', desc: 'Sfondo scuro elegante', emoji: '🌙' },
  { id: 'artigiano', nome: 'Artigiano', desc: 'Caldo e personale', emoji: '🪵' },
] as const

// ── Unità di misura servizi ────────────────────────────────────────
export const UNITA_MISURA = ['cad', 'ora', 'giorno', 'mq', 'ml', 'set', 'progetto'] as const

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
