import { Feather } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

export type AppIconName = ComponentProps<typeof Feather>['name']

type Props = {
  name: AppIconName
  size?: number
  color?: string
}

/** Icone stroke minimali — stile coerente con desktop. */
export function AppIcon({ name, size = 18, color = '#6B7280' }: Props) {
  return <Feather name={name} size={size} color={color} />
}
