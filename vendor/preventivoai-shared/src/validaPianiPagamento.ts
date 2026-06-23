import { calcolaAccontoSaldoPiano, type RateAccontoTipo, type RateModalitaPiano } from './calcolaAccontoSaldoPiano'
import { giornoScadenzaValido, meseInizioValido } from './giornoScadenza'

export type ValidaPianiPagamentoInput = {
  pagamentoRateAttivo: boolean
  abbonamentoAttivo: boolean
  clienteCollegato: boolean
  rateNumero: string
  rateGiornoScadenza: string
  rateMeseInizio: string
  abGiorno: string
  abMeseInizio: string
  rateModalita?: RateModalitaPiano
  rateAccontoTipo?: RateAccontoTipo
  rateAccontoValore?: string
  rateImportoTotale?: number
}

/** Restituisce messaggio errore o null se i piani pagamento sono validi. */
export function validaPianiPagamento(input: ValidaPianiPagamentoInput): string | null {
  const {
    pagamentoRateAttivo,
    abbonamentoAttivo,
    clienteCollegato,
    rateNumero,
    rateGiornoScadenza,
    rateMeseInizio,
    abGiorno,
    abMeseInizio,
    rateModalita = 'rate_uguali',
    rateAccontoTipo = 'fisso',
    rateAccontoValore = '',
    rateImportoTotale = 0,
  } = input

  if (pagamentoRateAttivo && !clienteCollegato) {
    return 'Associa un cliente al preventivo per il pagamento a rate.'
  }
  if (abbonamentoAttivo && !clienteCollegato) {
    return "Associa un cliente al preventivo per l'abbonamento mensile."
  }
  if (pagamentoRateAttivo) {
    if (!(giornoScadenzaValido(rateGiornoScadenza) && meseInizioValido(rateMeseInizio))) {
      return 'Inserisci giorno scadenza (1-31) e mese inizio (1-12).'
    }
    if (rateModalita === 'acconto_saldo') {
      const accontoSaldo = calcolaAccontoSaldoPiano(rateImportoTotale, rateAccontoTipo, rateAccontoValore)
      if (!accontoSaldo) {
        return rateAccontoTipo === 'fisso'
          ? 'Inserisci un acconto valido: maggiore di zero e minore dell\'importo totale.'
          : 'Inserisci una percentuale di acconto tra 1 e 99.'
      }
    } else {
      const num = parseInt(rateNumero, 10)
      if (!(num >= 2)) {
        return 'Inserisci numero di rate (minimo 2), giorno scadenza (1-31) e mese inizio (1-12).'
      }
    }
  }
  if (abbonamentoAttivo && !(giornoScadenzaValido(abGiorno) && meseInizioValido(abMeseInizio))) {
    return "Inserisci giorno scadenza (1-31) e mese inizio (1-12) per l'abbonamento."
  }
  return null
}
