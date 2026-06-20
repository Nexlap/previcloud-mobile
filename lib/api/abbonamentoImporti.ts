import { MESI_BREVI } from '../constants'
import { supabase } from '../supabase'
import { Abbonamento, RataAbbonamento } from '../types'
import { calcolaImportiRate, formatImportoEuro } from 'preventivoai-shared'

export type ImportiAlert = { title: string; message: string }

export function nuovoStatoDopoImportoRata(rata: RataAbbonamento, nuovoImporto: number): RataAbbonamento['stato'] {
  const acconto = rata.acconto || 0
  if (acconto >= nuovoImporto) return 'incassato'
  if (acconto > 0) return 'parziale'
  if (rata.stato === 'in_ritardo') return 'in_ritardo'
  return 'da_incassare'
}

export function rateScaduteDaSegnalare(
  abbonamentiAttivi: Abbonamento[],
  ratePerPiano: Record<string, RataAbbonamento[]>,
  ora = new Date(),
) {
  const meseOra = ora.getMonth() + 1
  const annoOra = ora.getFullYear()
  const giornoOggi = ora.getDate()
  const scadute: { abbonamentoId: string; rataId: string }[] = []

  for (const abbonamento of abbonamentiAttivi) {
    const rate = ratePerPiano[abbonamento.id] || []
    for (const r of rate) {
      if (r.stato === 'da_incassare' || r.stato === 'parziale') {
        const scaduta =
          r.anno < annoOra
          || (r.anno === annoOra && r.mese < meseOra)
          || (r.anno === annoOra && r.mese === meseOra && giornoOggi > abbonamento.giorno_scadenza)
        if (scaduta) {
          scadute.push({ abbonamentoId: abbonamento.id, rataId: r.id })
        }
      }
    }
  }

  return scadute
}

export async function segnaRataInRitardo(rataId: string) {
  return supabase.from('rate_abbonamento').update({ stato: 'in_ritardo' }).eq('id', rataId)
}

export type ModificaImportoPianoRateResult =
  | { ok: true; nuovoImportoTotale: number }
  | { ok: false; alert?: ImportiAlert }

export async function modificaImportoPianoRate(
  abbonamento: Abbonamento,
  rate: RataAbbonamento[],
  nuovoImportoTotale: number,
): Promise<ModificaImportoPianoRateResult> {
  if (!(nuovoImportoTotale > 0)) {
    return {
      ok: false,
      alert: { title: 'Importo non valido', message: 'Inserisci un importo maggiore di zero.' },
    }
  }

  const raccolto = rate.reduce(
    (a, r) => a + (r.stato === 'incassato' ? r.importo : (r.acconto || 0)),
    0,
  )
  if (nuovoImportoTotale < raccolto) {
    return {
      ok: false,
      alert: {
        title: 'Importo troppo basso',
        message: `Hai già incassato \u20AC${formatImportoEuro(raccolto, 2)}. L'importo totale non può essere inferiore.`,
      },
    }
  }

  const rateAperte = [...rate]
    .filter(r => r.stato !== 'incassato')
    .sort((a, b) => a.anno - b.anno || a.mese - b.mese)
  if (rateAperte.length === 0) {
    return {
      ok: false,
      alert: { title: 'Nessuna rata da aggiornare', message: 'Tutte le rate sono già pagate.' },
    }
  }

  const residuo = Math.round((nuovoImportoTotale - raccolto) * 100) / 100
  const nuoviImporti = calcolaImportiRate(residuo, rateAperte.length)
  if (nuoviImporti.length === 0) return { ok: false }

  const { error: errAb } = await supabase
    .from('abbonamenti')
    .update({ importo_default: nuovoImportoTotale })
    .eq('id', abbonamento.id)
  if (errAb) {
    return { ok: false, alert: { title: 'Errore', message: errAb.message } }
  }

  for (let i = 0; i < rateAperte.length; i++) {
    const rata = rateAperte[i]
    const nuovoImporto = nuoviImporti[i]
    const acconto = rata.acconto || 0
    let nuovoStato: RataAbbonamento['stato'] = rata.stato
    if (acconto >= nuovoImporto) nuovoStato = 'incassato'
    else if (acconto > 0) nuovoStato = 'parziale'

    const { error } = await supabase
      .from('rate_abbonamento')
      .update({ importo: nuovoImporto, stato: nuovoStato })
      .eq('id', rata.id)
    if (error) {
      return { ok: false, alert: { title: 'Errore', message: error.message } }
    }
  }

  return { ok: true, nuovoImportoTotale }
}

export type ModificaImportoRataResult =
  | { ok: true; nuovoImporto: number; nuovoStato: RataAbbonamento['stato'] }
  | { ok: false; alert: ImportiAlert }

export async function modificaImportoRata(
  abbonamento: Abbonamento,
  rate: RataAbbonamento[],
  rata: RataAbbonamento,
  nuovoImporto: number,
): Promise<ModificaImportoRataResult> {
  if (!(nuovoImporto > 0)) {
    return {
      ok: false,
      alert: { title: 'Importo non valido', message: 'Inserisci un importo maggiore di zero.' },
    }
  }
  if (nuovoImporto < (rata.acconto || 0)) {
    return {
      ok: false,
      alert: {
        title: 'Importo troppo basso',
        message: 'L\'importo non può essere inferiore a quanto già incassato su questa rata.',
      },
    }
  }

  if (abbonamento.tipo === 'rate') {
    const sommaAltri = rate
      .filter(r => r.id !== rata.id)
      .reduce((a, r) => a + r.importo, 0)
    const sommaTotale = Math.round((sommaAltri + nuovoImporto) * 100) / 100
    if (Math.abs(sommaTotale - abbonamento.importo_default) > 0.01) {
      return {
        ok: false,
        alert: {
          title: 'Somma rate errata',
          message: `Le rate devono sommare \u20AC${formatImportoEuro(abbonamento.importo_default, 2)}. Usa Personalizza rate per ripartire gli importi.`,
        },
      }
    }
  }

  const nuovoStato = nuovoStatoDopoImportoRata(rata, nuovoImporto)
  const { error } = await supabase
    .from('rate_abbonamento')
    .update({ importo: nuovoImporto, stato: nuovoStato })
    .eq('id', rata.id)
  if (error) {
    return { ok: false, alert: { title: 'Errore', message: error.message } }
  }

  return { ok: true, nuovoImporto, nuovoStato }
}

export type SalvaImportiRatePersonalizzatiResult =
  | { ok: true }
  | { ok: false; alert?: ImportiAlert }

export async function salvaImportiRatePersonalizzati(
  abbonamento: Abbonamento,
  rate: RataAbbonamento[],
  importiPerRata: Record<string, number>,
): Promise<SalvaImportiRatePersonalizzatiResult> {
  if (abbonamento.tipo !== 'rate') return { ok: false }

  const incassate = rate.filter(r => r.stato === 'incassato')
  const modificabili = rate.filter(r => r.stato !== 'incassato')

  for (const rata of modificabili) {
    const importo = importiPerRata[rata.id]
    if (importo === undefined || !(importo > 0)) {
      return {
        ok: false,
        alert: { title: 'Importo non valido', message: 'Inserisci un importo valido per ogni rata modificabile.' },
      }
    }
    if (importo < (rata.acconto || 0)) {
      return {
        ok: false,
        alert: {
          title: 'Importo troppo basso',
          message: `La rata di ${MESI_BREVI[rata.mese - 1]} ${rata.anno} ha già un acconto di \u20AC${formatImportoEuro(rata.acconto || 0, 2)}.`,
        },
      }
    }
  }

  const sommaIncassate = incassate.reduce((a, r) => a + r.importo, 0)
  const sommaModificabili = modificabili.reduce((a, r) => a + importiPerRata[r.id], 0)
  const sommaTotale = Math.round((sommaIncassate + sommaModificabili) * 100) / 100
  const target = abbonamento.importo_default

  if (Math.abs(sommaTotale - target) > 0.01) {
    return {
      ok: false,
      alert: {
        title: 'Somma rate errata',
        message: `Le rate devono sommare \u20AC${formatImportoEuro(target, 2)} (attuale: \u20AC${formatImportoEuro(sommaTotale, 2)}).`,
      },
    }
  }

  for (const rata of modificabili) {
    const nuovoImporto = importiPerRata[rata.id]
    const nuovoStato = nuovoStatoDopoImportoRata(rata, nuovoImporto)
    const { error } = await supabase
      .from('rate_abbonamento')
      .update({ importo: nuovoImporto, stato: nuovoStato })
      .eq('id', rata.id)
    if (error) {
      return { ok: false, alert: { title: 'Errore', message: error.message } }
    }
  }

  return { ok: true }
}
