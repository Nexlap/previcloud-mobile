import { useCallback, useState } from 'react'
import { Preventivo } from '../../types'
import { ModificaPreventivoInput, modificaParamsFromPreventivo } from './apriModificaPreventivo'

export function useModificaPreventivoScelta() {
  const [modificaInput, setModificaInput] = useState<ModificaPreventivoInput | null>(null)

  const apriDaPreventivo = useCallback((preventivo: Preventivo, versioneSorgente?: Preventivo) => {
    setModificaInput(modificaParamsFromPreventivo(preventivo, versioneSorgente))
  }, [])

  const chiudiSceltaModifica = useCallback(() => setModificaInput(null), [])

  return { modificaInput, apriDaPreventivo, chiudiSceltaModifica }
}
