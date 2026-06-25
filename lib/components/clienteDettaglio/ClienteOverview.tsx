import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Cliente } from '../../types'
import { formatImportoEuroVisuale } from 'preventivoai-shared'
import { AppIcon } from '../icons/AppIcon'
import { IconLabel } from '../icons/IconLabel'

export type ClienteDettaglioTab = 'preventivi' | 'pagamento_rate' | 'abbonamento'

type HeaderProps = {
  title: string
  onBack: () => void
  onEdit: () => void
}

export function ClienteDettaglioHeader({ title, onBack, onEdit }: HeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <AppIcon name="arrow-left" size={20} color="#9CA3AF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={onEdit}>
          <AppIcon name="edit-2" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

type SelectionBarProps = {
  count: number
  onCancel: () => void
  onDelete: () => void
  onMove?: () => void
}

export function ClienteSelectionBar({ count, onCancel, onMove, onDelete }: SelectionBarProps) {
  return (
    <View style={styles.selectionBar}>
      <TouchableOpacity onPress={onCancel} style={styles.selectionCancel}>
        <Text style={styles.selectionCancelText}>{'\u2715'}</Text>
      </TouchableOpacity>
      <Text style={styles.selectionCount}>{count} selezionati</Text>
      <View style={styles.selectionActions}>
        {onMove ? (
          <TouchableOpacity style={styles.selectionAction} onPress={onMove}>
            <Text style={styles.selectionActionText}>{'\u2197'} Sposta</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.selectionAction, styles.selectionActionDelete]} onPress={onDelete}>
          <IconLabel icon="trash-2" label="Elimina" danger />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export function ClienteInfoCard({ cliente }: { cliente: Cliente }) {
  const [espanso, setEspanso] = useState(false)

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setEspanso(v => !v)}
      activeOpacity={0.85}
    >
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(cliente.nome || 'C').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerRow}>
          <View style={styles.avatarInfo}>
            <Text
              style={styles.clienteNome}
              numberOfLines={espanso ? undefined : 1}
              ellipsizeMode={espanso ? undefined : 'tail'}
            >
              {cliente.nome || ''}
            </Text>
            {cliente.telefono ? (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <AppIcon name="phone" size={14} color="#9CA3AF" />
                </View>
                <Text
                  style={[styles.clienteInfo, { flex: 1, flexShrink: 1 }]}
                  numberOfLines={espanso ? undefined : 1}
                  ellipsizeMode={espanso ? undefined : 'tail'}
                >
                  {cliente.telefono}
                </Text>
              </View>
            ) : null}
            {espanso && cliente.email ? (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <AppIcon name="mail" size={14} color="#9CA3AF" />
                </View>
                <Text style={[styles.clienteInfo, { flex: 1, flexShrink: 1 }]}>{cliente.email}</Text>
              </View>
            ) : null}
            {espanso && cliente.indirizzo ? (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <AppIcon name="map-pin" size={14} color="#9CA3AF" />
                </View>
                <Text style={[styles.clienteInfo, { flex: 1, flexShrink: 1 }]}>{cliente.indirizzo}</Text>
              </View>
            ) : null}
            {espanso && cliente.note ? <Text style={styles.clienteNote}>{cliente.note}</Text> : null}
          </View>
          <View style={styles.chevron}>
            <AppIcon name={espanso ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

type StatsProps = {
  preventiviCount: number
  totaleValore: number
  trascrizioniCount: number
  abbonamentoTotale?: number | null
}

export function ClienteStats({ preventiviCount, totaleValore, trascrizioniCount, abbonamentoTotale }: StatsProps) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statVal}>{preventiviCount}</Text>
        <Text style={styles.statLabel}>Preventivi</Text>
      </View>
      <View style={styles.statCard}>
        <Text
          style={[styles.statVal, { color: '#0E9F8E' }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {`\u20AC${formatImportoEuroVisuale(totaleValore)}`}
        </Text>
        <Text style={styles.statLabel}>Incassato</Text>
      </View>
      {abbonamentoTotale !== null && abbonamentoTotale !== undefined ? (
        <View style={styles.statCard}>
          <Text
            style={[styles.statVal, { color: '#0E9F8E' }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {`\u20AC${formatImportoEuroVisuale(abbonamentoTotale)}`}
          </Text>
          <Text style={styles.statLabel}>Abbonamento</Text>
        </View>
      ) : (
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{trascrizioniCount}</Text>
          <Text style={styles.statLabel}>Chiamate</Text>
        </View>
      )}
    </View>
  )
}

type TabsProps = {
  active: ClienteDettaglioTab
  onChange: (tab: ClienteDettaglioTab) => void
}

export function ClienteTabs({ active, onChange }: TabsProps) {
  return (
    <View style={styles.tabs}>
      <TouchableOpacity style={[styles.tabBtn, active === 'preventivi' && styles.tabBtnActive]} onPress={() => onChange('preventivi')}>
        <Text style={[styles.tabText, active === 'preventivi' && styles.tabTextActive]}>Preventivi</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.tabBtn, active === 'pagamento_rate' && styles.tabBtnActive]} onPress={() => onChange('pagamento_rate')}>
        <Text style={[styles.tabText, active === 'pagamento_rate' && styles.tabTextActive]}>Pagamento a rate</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.tabBtn, active === 'abbonamento' && styles.tabBtnActive]} onPress={() => onChange('abbonamento')}>
        <Text style={[styles.tabText, active === 'abbonamento' && styles.tabTextActive]}>Abbonamento</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4, width: 50 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' },
  headerActions: { flexDirection: 'row', gap: 12, width: 50, justifyContent: 'flex-end' },
  selectionBar: { backgroundColor: '#0D1B2A', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectionCancel: { padding: 4 },
  selectionCancelText: { color: '#9CA3AF', fontSize: 18 },
  selectionCount: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  selectionActions: { flexDirection: 'row', gap: 12 },
  selectionAction: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  selectionActionDelete: { backgroundColor: 'rgba(239,68,68,0.15)' },
  selectionActionText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  avatarRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  avatarInfo: { flex: 1, minWidth: 0, gap: 3 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flex: 1 },
  chevron: { paddingLeft: 8 },
  clienteNome: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  clienteInfo: { fontSize: 13, color: '#6B7280', flex: 1, flexShrink: 1, flexWrap: 'wrap' },
  infoRow: { flexDirection: 'row', flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 6 },
  infoIcon: { marginTop: 2, flexShrink: 0 },
  clienteNote: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', minWidth: 0 },
  statVal: { fontSize: 20, fontWeight: '700', color: '#0D1B2A', width: '100%', textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#0D1B2A' },
  tabText: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
  tabTextActive: { color: '#fff' },
})
