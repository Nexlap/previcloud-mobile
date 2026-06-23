export const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'] as const

/** Giorni di retention soft-delete cestino (desktop e mobile). */
export const CESTINO_GIORNI = 7

export const MESI_FULL = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
] as const

/** Etichetta mese da stringa "1"-"12". */
export function labelMese(meseStr: string, breve = false): string {
  const n = parseInt(meseStr, 10)
  if (!(n >= 1 && n <= 12)) return ''
  return breve ? MESI_BREVI[n - 1] : MESI_FULL[n - 1]
}

export const TEMPLATES = [
  { id: 'pulito', nome: 'Pulito', desc: 'Moderno e professionale', emoji: '⬜' },
  { id: 'classico', nome: 'Classico', desc: 'Formale con bordi', emoji: '📋' },
  { id: 'bold', nome: 'Bold', desc: 'Intestazione colorata', emoji: '🎨' },
  { id: 'minimal_dark', nome: 'Dark', desc: 'Sfondo scuro elegante', emoji: '🌙' },
  { id: 'artigiano', nome: 'Artigiano', desc: 'Caldo e personale', emoji: '🪵' },
] as const

/** Unità di misura servizi (include ml usato in listino mobile e ServizioModal desktop). */
export const UNITA_MISURA = ['cad', 'ora', 'giorno', 'mq', 'ml', 'set', 'progetto'] as const

/** Alias per onboarding / listino smart. */
export const UNITA_SERVIZIO = UNITA_MISURA

export const ESEMPI_LISTINO: Record<string, string> = {
  videomaker: 'Riprese mezza giornata: 400€\nMontaggio video: 300€\nColor grading: 150€\nReel social: 200€',
  fotografo: 'Servizio foto evento: 500€\nRitocco foto (set 10): 150€\nBook professionale: 400€\nFoto prodotto: 80€/cad',
  catering: 'Menu pranzo (a persona): 35€\nMenu cena (a persona): 50€\nAperitivo: 20€/persona\nAllestimento tavoli: 200€',
  falegname: 'Montaggio mobile: 150€\nRiparazione porta: 80€\nPosa parquet (mq): 25€\nProgetto su misura: 500€',
  estetista: 'Piega e colore: 80€\nTaglio capelli: 35€\nManicure: 30€\nTrattamento viso: 60€',
  elettricista: 'Installazione presa: 80€\nCertificazione impianto: 200€\nIntervento urgente: 120€\nQuadro elettrico: 350€',
  idraulico: 'Riparazione perdita: 100€\nSostituzione rubinetto: 80€\nInstallazione caldaia: 500€\nIntervento urgente: 150€',
  imbianchino: 'Tinteggiatura stanza (mq): 8€\nPreparazione pareti: 5€/mq\nSmaltimento vernice: 50€\nPosa carta da parati: 15€/mq',
  consulente: 'Consulenza oraria: 80€\nProgetto strategico: 1500€\nFormazione (mezza giornata): 400€\nReport analitico: 600€',
  altro: 'Servizio base: 100€\nServizio premium: 200€\nConsulenza: 80€/ora\nProgetto completo: 500€',
}
