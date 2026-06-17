import { ServizioForm } from '../../types'

function riconosciUnita(riga: string) {
  const testo = riga.toLowerCase()
  if (/(ora|orario|all'ora|\/ora)/.test(testo)) return 'ora'
  if (/(giorno|giornata|al giorno)/.test(testo)) return 'giorno'
  if (/(mq|metro quadro|al mq)/.test(testo)) return 'mq'
  if (/(set|a set)/.test(testo)) return 'set'
  if (/(progetto|a progetto)/.test(testo)) return 'progetto'
  return 'cad'
}

function pulisciNome(riga: string, prezzo: string) {
  return riga
    .replace(prezzo, '')
    .replace(/€/gi, '')
    .replace(/\beuro\b/gi, '')
    .replace(/\ball'ora\b|\b\/ora\b|\borario\b|\bora\b/gi, '')
    .replace(/\bal giorno\b|\bgiornata\b|\bgiorno\b/gi, '')
    .replace(/\bal mq\b|\bmetro quadro\b|\bmq\b/gi, '')
    .replace(/\ba set\b|\bset\b/gi, '')
    .replace(/\ba progetto\b|\bprogetto\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function serviziDaTesto(testoServizi: string): Omit<ServizioForm, 'id'>[] {
  return testoServizi
    .split('\n')
    .map(riga => riga.trim())
    .filter(Boolean)
    .map(riga => {
      const unita = riconosciUnita(riga)
      const match = riga.match(/^(.+?):\s*(\d+(?:[.,]\d+)?)\s*€?/)
      if (match) {
        return {
          nome: match[1].trim(),
          descrizione: '',
          costo: match[2].replace(',', '.'),
          unita,
        }
      }
      const matchPrezzo = riga.match(/(\d+(?:[.,]\d+)?)/)
      if (matchPrezzo) {
        const costo = matchPrezzo[1].replace(',', '.')
        return {
          nome: pulisciNome(riga, matchPrezzo[1]) || riga,
          descrizione: '',
          costo,
          unita,
        }
      }
      return { nome: riga, descrizione: '', costo: '', unita: 'cad' }
    })
}
