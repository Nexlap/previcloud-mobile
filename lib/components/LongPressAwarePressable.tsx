import { Pressable, PressableProps, TouchableOpacity, TouchableOpacityProps } from 'react-native'
import { useLongPressPressable } from '../hooks/useLongPressPressable'

type PressProps = {
  onPress: () => void
  onLongPress?: () => void
  delayLongPress?: number
}

type LongPressAwarePressableProps = Omit<PressableProps, 'onPress' | 'onLongPress' | 'delayLongPress'> & PressProps

export function LongPressAwarePressable({
  onPress,
  onLongPress,
  delayLongPress,
  ...rest
}: LongPressAwarePressableProps) {
  const handlers = useLongPressPressable(onPress, onLongPress, { delayLongPress })
  return <Pressable {...rest} {...handlers} />
}

type LongPressAwareTouchableOpacityProps = Omit<TouchableOpacityProps, 'onPress' | 'onLongPress' | 'delayLongPress'> & PressProps

export function LongPressAwareTouchableOpacity({
  onPress,
  onLongPress,
  delayLongPress,
  ...rest
}: LongPressAwareTouchableOpacityProps) {
  const handlers = useLongPressPressable(onPress, onLongPress, { delayLongPress })
  return <TouchableOpacity {...rest} {...handlers} />
}
