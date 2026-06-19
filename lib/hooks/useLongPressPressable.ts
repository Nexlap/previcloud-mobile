import { useCallback, useRef } from 'react'

const DEFAULT_SUPPRESS_MS = 500

/** Evita che onPress parta subito dopo onLongPress (comportamento standard di React Native). */
export function useLongPressPressable(
  onPress: () => void,
  onLongPress?: () => void,
  options?: { delayLongPress?: number; suppressMs?: number },
) {
  const suppressPressRef = useRef(false)
  const delayLongPress = options?.delayLongPress ?? 400
  const suppressMs = options?.suppressMs ?? DEFAULT_SUPPRESS_MS

  const handleLongPress = useCallback(() => {
    if (!onLongPress) return
    suppressPressRef.current = true
    onLongPress()
    setTimeout(() => {
      suppressPressRef.current = false
    }, suppressMs)
  }, [onLongPress, suppressMs])

  const handlePress = useCallback(() => {
    if (suppressPressRef.current) return
    onPress()
  }, [onPress])

  return {
    onPress: handlePress,
    onLongPress: onLongPress ? handleLongPress : undefined,
    delayLongPress,
  }
}
