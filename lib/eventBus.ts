import EventEmitter from 'eventemitter3'

// Bus globale per comunicazione tra schermate
// Uso: eventBus.emit('aggiorna-home') da qualsiasi schermata
//      eventBus.on('aggiorna-home', callback) in index.tsx
export const eventBus = new EventEmitter()

export function emitAggiornaProfilo(): void {
  eventBus.emit('aggiorna-profilo')
}

export function onAggiornaProfilo(cb: () => void): () => void {
  eventBus.on('aggiorna-profilo', cb)
  return () => {
    eventBus.off('aggiorna-profilo', cb)
  }
}