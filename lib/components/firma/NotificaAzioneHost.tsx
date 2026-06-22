import { useEffect, useState } from 'react'
import { eventBus } from '../../eventBus'
import { useNotifiche, type Notifica } from '../../hooks/useNotifiche'
import { NotificaRataDialog } from './NotificaRataDialog'

export function NotificaAzioneHost() {
  const { segnaLetta, rimanda, ricarica } = useNotifiche()
  const [notifica, setNotifica] = useState<Notifica | null>(null)

  useEffect(() => {
    function apriDaNotifica(n: Notifica) {
      setNotifica(n)
    }
    eventBus.on('apri-notifica-rata', apriDaNotifica)
    return () => { eventBus.off('apri-notifica-rata', apriDaNotifica) }
  }, [])

  async function handleRimanda() {
    if (notifica) await rimanda(notifica.id)
    void ricarica()
    setNotifica(null)
  }

  async function handleCompletata() {
    if (notifica && !notifica.letta) await segnaLetta(notifica.id)
    void ricarica()
    setNotifica(null)
  }

  if (!notifica) return null

  return (
    <NotificaRataDialog
      notifica={notifica}
      visible
      onClose={() => setNotifica(null)}
      onRimanda={() => void handleRimanda()}
      onCompletata={() => void handleCompletata()}
    />
  )
}
