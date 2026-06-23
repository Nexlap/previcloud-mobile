import { parseImportoEuro } from './importo'

export type VoceCalcolo = {
  costo: string
  quantita: string
}

export type TrasfertaCalcolo = {
  importo: string
  esente: boolean
}

export type ProfiloFiscaleCalcolo = {
  regime: 'forfettario' | 'ordinario' | 'occasionale'
  coefficiente_redditivita: string | number
  aliquota_sostitutiva: string | number
  inps_percentuale: string | number
  riduzione_contributiva: boolean
  riduzione_percentuale: string | number
  rivalsa_inps: boolean
  rivalsa_percentuale: string | number
  aliquota_iva: string | number
  costi_deducibili_percentuale: string | number
  ritenuta_acconto: string | number
}

export type RisultatoFiscale = {
  regime: string
  lordo: number
  netto: number
  rivalsa: number
  totaleCliente: number
  imponibile: number
  contributi: number
  imposta: number
  iva: number
  irpef: number
  ritenuta: number
}

export function calcolaIrpef(base: number): number {
  const scaglioni = [{ fino: 28000, aliquota: 0.23 }, { fino: 50000, aliquota: 0.35 }, { fino: Infinity, aliquota: 0.43 }]
  let imposta = 0
  let precedente = 0
  for (const s of scaglioni) {
    if (base <= precedente) break
    imposta += (Math.min(base, s.fino) - precedente) * s.aliquota
    precedente = s.fino
  }
  return imposta
}

function parseQuantita(raw: string): number {
  const val = parseImportoEuro(raw)
  return val != null && val > 0 ? val : 1
}

function parseCosto(raw: string): number {
  return parseImportoEuro(raw) ?? 0
}

export function calcolaTotaleVoci(voci: VoceCalcolo[]): number {
  return voci.reduce((acc, v) => acc + parseCosto(v.costo) * parseQuantita(v.quantita), 0)
}

export function calcolaTotaleTrasferte(trasferte: TrasfertaCalcolo[]): number {
  return trasferte.reduce((acc, t) => acc + (parseImportoEuro(t.importo) ?? 0), 0)
}

function numero(value: string | number | null | undefined) {
  return typeof value === 'number' ? value : parseFloat(value || '0') || 0
}

function normalizzaProfiloFiscale(profilo: ProfiloFiscaleCalcolo) {
  return {
    ...profilo,
    coefficiente_redditivita: numero(profilo.coefficiente_redditivita),
    aliquota_sostitutiva: numero(profilo.aliquota_sostitutiva),
    inps_percentuale: numero(profilo.inps_percentuale),
    riduzione_percentuale: numero(profilo.riduzione_percentuale),
    rivalsa_percentuale: numero(profilo.rivalsa_percentuale),
    aliquota_iva: numero(profilo.aliquota_iva),
    costi_deducibili_percentuale: numero(profilo.costi_deducibili_percentuale),
    ritenuta_acconto: numero(profilo.ritenuta_acconto),
  }
}

export function calcolaFiscalePreventivo(
  profiloFiscale: ProfiloFiscaleCalcolo | null,
  mostraFiscale: boolean,
  voci: VoceCalcolo[],
  trasferte: TrasfertaCalcolo[],
  includiIva: boolean,
): RisultatoFiscale | null {
  if (!profiloFiscale || !mostraFiscale) return null
  const totaleImponibileTrasferte = trasferte.filter(t => !t.esente).reduce((a, t) => a + (parseImportoEuro(t.importo) ?? 0), 0)
  const lordo = calcolaTotaleVoci(voci) + totaleImponibileTrasferte
  const p = normalizzaProfiloFiscale(profiloFiscale)
  const zero: RisultatoFiscale = { regime: '', lordo, netto: 0, rivalsa: 0, totaleCliente: 0, imponibile: 0, contributi: 0, imposta: 0, iva: 0, irpef: 0, ritenuta: 0 }

  if (p.regime === 'forfettario') {
    const rivalsa = p.rivalsa_inps ? lordo * (p.rivalsa_percentuale / 100) : 0
    const totaleCliente = lordo + rivalsa
    const imponibile = lordo * (p.coefficiente_redditivita / 100)
    const inpsPerc = p.riduzione_contributiva ? p.inps_percentuale * (1 - p.riduzione_percentuale / 100) : p.inps_percentuale
    const contributi = imponibile * (inpsPerc / 100)
    const imposta = imponibile * (p.aliquota_sostitutiva / 100)
    const netto = lordo + rivalsa - contributi - imposta
    return { ...zero, regime: 'forfettario', rivalsa, totaleCliente, imponibile, contributi, imposta, netto }
  }
  if (p.regime === 'ordinario') {
    const iva = includiIva ? lordo * (p.aliquota_iva / 100) : 0
    const rivalsa = p.rivalsa_inps ? lordo * (p.rivalsa_percentuale / 100) : 0
    const totaleCliente = lordo + iva + rivalsa
    const costiDeducibili = lordo * (p.costi_deducibili_percentuale / 100)
    const imponibile = lordo - costiDeducibili
    const contributi = imponibile * (p.inps_percentuale / 100)
    const irpef = calcolaIrpef(imponibile - contributi)
    const netto = lordo + rivalsa - contributi - irpef
    return { ...zero, regime: 'ordinario', iva, rivalsa, totaleCliente, imponibile, contributi, irpef, netto }
  }
  if (p.regime === 'occasionale') {
    const ritenuta = lordo * (p.ritenuta_acconto / 100)
    return { ...zero, regime: 'occasionale', ritenuta, netto: lordo - ritenuta }
  }
  return null
}

export function calcolaLordoDaNetto(netto: number, profiloFiscale: ProfiloFiscaleCalcolo | null): number | null {
  if (!profiloFiscale) return null
  const p = normalizzaProfiloFiscale(profiloFiscale)
  if (p.regime === 'forfettario') {
    const rivalsaPerc = p.rivalsa_inps ? p.rivalsa_percentuale / 100 : 0
    const coeffPerc = p.coefficiente_redditivita / 100
    const inpsPerc = p.riduzione_contributiva
      ? p.inps_percentuale * (1 - p.riduzione_percentuale / 100) / 100
      : p.inps_percentuale / 100
    const aliquotaPerc = p.aliquota_sostitutiva / 100
    const moltiplicatore = 1 + rivalsaPerc - coeffPerc * inpsPerc - coeffPerc * aliquotaPerc
    return netto / moltiplicatore
  }
  if (p.regime === 'ordinario') {
    let lordo = netto * 1.4
    for (let i = 0; i < 10; i++) {
      const costiDeducibili = lordo * (p.costi_deducibili_percentuale / 100)
      const imponibile = lordo - costiDeducibili
      const contributi = imponibile * (p.inps_percentuale / 100)
      const irpef = calcolaIrpef(imponibile - contributi)
      const nettoCalcolato = lordo - contributi - irpef
      lordo = lordo + (netto - nettoCalcolato) * 0.8
    }
    return lordo
  }
  if (p.regime === 'occasionale') {
    return netto / (1 - p.ritenuta_acconto / 100)
  }
  return null
}
