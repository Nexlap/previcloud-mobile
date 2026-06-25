import { parseImportoEuro } from './importo'

export type VocePreventivoParsed = {
  refId: string
  nome: string
  descrizione: string
  costo: string
  quantita: string
  unita: string
}

export type TrasfertaParsed = {
  id: string
  tipo: 'km' | 'spesa'
  nome: string
  importo: string
  km?: string
  esente: boolean
}

export type ScontoPreventivoParsed = {
  tipo: 'percentuale' | 'fisso'
  valore: number
}

export type ParsedPreventivoTesto = {
  nomeCliente: string
  voci: VocePreventivoParsed[]
  trasferte: TrasfertaParsed[]
  includiIva: boolean
  noteExtra: string
  pagamentoNome: string
  sconto?: ScontoPreventivoParsed | null
}

export type ServizioListinoRef = {
  id: string
  nome: string
  unita?: string
}

function parseImporto(raw: string): string {
  const val = parseImportoEuro(raw.match(/([\d.,]+)/)?.[1] || raw)
  return val != null ? String(val) : raw.replace(/€/g, '').replace(/\s/g, '').replace(',', '.').trim()
}

function normalizzaNome(nome: string) {
  return nome.trim().toLowerCase()
}

/** Desktop builder: campo `id` sulle voci. */
export function vociParsedConId(voci: VocePreventivoParsed[]) {
  return voci.map(({ refId, ...rest }) => ({ ...rest, id: refId }))
}

/** Mobile builder: campo `servizio_id` sulle voci. */
export function vociParsedConServizioId(voci: VocePreventivoParsed[]) {
  return voci.map(({ refId, ...rest }) => ({ ...rest, servizio_id: refId }))
}

export function collegaVociAlListino(voci: VocePreventivoParsed[], servizi: ServizioListinoRef[]): VocePreventivoParsed[] {
  if (servizi.length === 0) return voci

  return voci.map(voce => {
    if (servizi.some(s => s.id === voce.refId)) return voce

    const match = servizi.find(s => normalizzaNome(s.nome) === normalizzaNome(voce.nome))
    if (match) {
      return { ...voce, refId: match.id, unita: voce.unita || match.unita || 'cad' }
    }

    return voce
  })
}

function parseScontoDaRiga(riga: string): ScontoPreventivoParsed | null {
  const matchPercentuale = riga.match(/^Sconto\s+(\d+)%/i)
  if (matchPercentuale) {
    const valore = parseInt(matchPercentuale[1], 10)
    return valore > 0 ? { tipo: 'percentuale', valore } : null
  }
  const importoRaw = riga
    .replace(/^(SCONTO:|Sconto)\s*/i, '')
    .replace(/^-?\s*€?\s*/, '')
    .trim()
  const importo = parseImportoEuro(importoRaw)
  return importo != null && importo > 0 ? { tipo: 'fisso', valore: importo } : null
}

export function parsePreventivoTesto(testo: string): ParsedPreventivoTesto {
  const righe = testo.split('\n').map(r => r.trim()).filter(Boolean)

  let nomeCliente = ''
  let noteExtra = ''
  let pagamentoNome = ''
  let includiIva = false
  let sconto: ScontoPreventivoParsed | null = null
  const voci: VocePreventivoParsed[] = []
  const trasferte: TrasfertaParsed[] = []

  let fase = 'header'
  let servizioCorrente: { nome: string; descrizione: string; dettagli: string[]; prezzo: string } | null = null
  let rimborsoCorrente: { nome: string; dettaglio: string; tipo: string; importo: string } | null = null
  let voceIndex = 0

  function pushServizio() {
    if (!servizioCorrente) return
    const prezzoNum = parseFloat(parseImporto(servizioCorrente.prezzo)) || 0
    let quantita = '1'
    let unita = 'cad'
    let descrizione = servizioCorrente.descrizione

    for (const dettaglio of servizioCorrente.dettagli) {
      const qtyMatch = dettaglio.match(/^([\d.,]+)\s+(\w+)$/)
      if (qtyMatch) {
        quantita = qtyMatch[1].replace(',', '.')
        unita = qtyMatch[2]
      } else if (!descrizione) {
        descrizione = dettaglio
      } else {
        descrizione = `${descrizione}\n${dettaglio}`
      }
    }

    const qtyNum = parseFloat(quantita) || 1
    const costo = qtyNum > 0 ? String(prezzoNum / qtyNum) : String(prezzoNum)

    voci.push({
      refId: `import-${voceIndex++}`,
      nome: servizioCorrente.nome,
      descrizione,
      costo,
      quantita,
      unita,
    })
    servizioCorrente = null
  }

  function pushRimborso() {
    if (!rimborsoCorrente) return
    const esente = rimborsoCorrente.tipo.toLowerCase().includes('esente')
    const importoRaw = rimborsoCorrente.importo || rimborsoCorrente.dettaglio
    const importo = parseImporto(importoRaw)

    if (rimborsoCorrente.nome.toLowerCase().includes('km') || rimborsoCorrente.dettaglio.toLowerCase().includes(' km')) {
      const kmMatch = rimborsoCorrente.dettaglio.match(/([\d.,]+)\s*km/i)
      trasferte.push({
        id: `import-${trasferte.length}`,
        tipo: 'km',
        nome: 'Trasferta km',
        importo,
        km: kmMatch ? kmMatch[1].replace(',', '.') : '',
        esente,
      })
    } else {
      trasferte.push({
        id: `import-${trasferte.length}`,
        tipo: 'spesa',
        nome: rimborsoCorrente.nome,
        importo,
        esente,
      })
    }
    rimborsoCorrente = null
  }

  for (const riga of righe) {
    if (riga.startsWith('Cliente:')) {
      nomeCliente = riga.replace('Cliente:', '').trim()
      continue
    }
    if (riga === 'SERVIZI:' || riga === 'SERVIZI') {
      fase = 'servizi'
      continue
    }
    if (riga.startsWith('SERVIZIO:') && fase === 'servizi') {
      pushServizio()
      const nomeServizio = riga.replace('SERVIZIO:', '').trim()
      const colIdx = nomeServizio.indexOf(': ')
      servizioCorrente = {
        nome: colIdx > -1 ? nomeServizio.slice(0, colIdx).trim() : nomeServizio,
        descrizione: colIdx > -1 ? nomeServizio.slice(colIdx + 2).trim() : '',
        dettagli: [],
        prezzo: '',
      }
      continue
    }
    if (riga === 'DETTAGLI:' && servizioCorrente) continue
    if (riga.startsWith('- ') && servizioCorrente && fase === 'servizi') {
      servizioCorrente.dettagli.push(riga.slice(2).trim())
      continue
    }
    if (riga.startsWith('PREZZO:') && servizioCorrente) {
      servizioCorrente.prezzo = riga.replace('PREZZO:', '').trim()
      continue
    }
    if (riga === 'RIMBORSI SPESE:') {
      pushServizio()
      fase = 'rimborsi'
      continue
    }
    if (fase === 'rimborsi') {
      if (riga.startsWith('RIMBORSO:')) {
        pushRimborso()
        rimborsoCorrente = { nome: riga.replace('RIMBORSO:', '').trim(), dettaglio: '', tipo: '', importo: '' }
        continue
      }
      if (riga.startsWith('DETTAGLIO:') && rimborsoCorrente) {
        rimborsoCorrente.dettaglio = riga.replace('DETTAGLIO:', '').trim()
        const match = rimborsoCorrente.dettaglio.match(/=\s*€?([\d.,]+)/)
        if (match) rimborsoCorrente.importo = match[1]
        continue
      }
      if (riga.startsWith('TIPO:') && rimborsoCorrente) {
        rimborsoCorrente.tipo = riga.replace('TIPO:', '').trim()
        continue
      }
      if (riga.startsWith('IMPORTO:') && rimborsoCorrente) {
        rimborsoCorrente.importo = riga.replace('IMPORTO:', '').trim()
        continue
      }
    }
    if (riga === 'RIEPILOGO:') {
      pushServizio()
      pushRimborso()
      fase = 'totali'
      continue
    }
    if (riga.startsWith('Imponibile:') || riga.startsWith('IVA')) {
      includiIva = true
      continue
    }
    if (riga.startsWith('TOTALE LORDO:')) {
      continue
    }
    if (riga.startsWith('SCONTO:') || riga.startsWith('Sconto')) {
      sconto = parseScontoDaRiga(riga)
      continue
    }
    if (riga.startsWith('Note:')) {
      noteExtra = riga.replace('Note:', '').trim()
      continue
    }
    if (riga.startsWith('PAGAMENTO:')) {
      pagamentoNome = riga.replace('PAGAMENTO:', '').trim()
      continue
    }
  }

  pushServizio()
  pushRimborso()

  return { nomeCliente, voci, trasferte, includiIva, noteExtra, pagamentoNome, sconto }
}

export function trovaMetodoPagamentoDaNome<T extends { nome: string }>(metodi: T[], pagamentoNome: string): T | null {
  if (!pagamentoNome) return null
  const normalizzato = pagamentoNome.trim().toLowerCase()
  return metodi.find(m => m.nome.trim().toLowerCase() === normalizzato)
    || metodi.find(m => normalizzato.includes(m.nome.trim().toLowerCase()))
    || null
}
