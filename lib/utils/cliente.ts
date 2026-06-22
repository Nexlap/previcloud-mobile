export function inizialiCliente(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0] || '?').slice(0, 2).toUpperCase()
}

export function labelPreventivi(count: number): string {
  return `${count} ${count === 1 ? 'preventivo' : 'preventivi'}`
}
