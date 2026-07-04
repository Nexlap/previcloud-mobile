import { useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native'
import { COLORS, labelMese } from '../../constants'
import { clampGiornoAlMese, giorniInMese, giornoValidoPerMese } from 'previcloud-shared'
import { AppIcon } from '../icons/AppIcon'

const MESI = Array.from({ length: 12 }, (_, i) => i + 1)
const PRESET_GIORNI_REMINDER = [1, 3, 5, 7, 14, 30] as const

type BaseProps = {
  disabled?: boolean
  style?: ViewStyle
  placeholder?: string
}

type GiornoProps = BaseProps & {
  value: string
  onChange: (value: string) => void
  /** Se indicato, limita i giorni al mese (es. febbraio max 28/29). */
  mese?: string
  anno?: string
}

type MeseProps = BaseProps & {
  value: string
  onChange: (value: string) => void
  giornoCollegato?: string
  onGiornoCollegatoChange?: (value: string) => void
  annoCollegato?: string
}

type GiorniReminderProps = BaseProps & {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

type AnnoProps = BaseProps & {
  value: string
  onChange: (value: string) => void
  meseCollegato?: string
  giornoCollegato?: string
  onGiornoCollegatoChange?: (value: string) => void
}

function PickerTrigger({
  display,
  isPlaceholder,
  disabled,
  style,
  onPress,
}: {
  display: string
  isPlaceholder: boolean
  disabled?: boolean
  style?: ViewStyle
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.trigger, style, disabled && styles.triggerDisabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text style={[styles.triggerText, isPlaceholder && styles.placeholder]} numberOfLines={1}>
        {display}
      </Text>
      <AppIcon name="chevron-down" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  )
}

export function GiornoScadenzaPicker({
  value,
  onChange,
  disabled,
  style,
  placeholder = 'Seleziona giorno',
  mese,
  anno,
}: GiornoProps) {
  const [open, setOpen] = useState(false)
  const meseNum = mese ? parseInt(mese, 10) : 0
  const annoNum = anno ? parseInt(anno, 10) : undefined
  const maxGiorni = useMemo(() => {
    if (!(meseNum >= 1 && meseNum <= 12)) return 31
    return giorniInMese(meseNum, annoNum && annoNum > 2000 ? annoNum : undefined)
  }, [meseNum, annoNum])
  const giorni = useMemo(
    () => Array.from({ length: maxGiorni }, (_, i) => i + 1),
    [maxGiorni],
  )
  const valid = giornoValidoPerMese(value, mese, anno)
  const n = parseInt(value, 10)
  const display = valid ? `${n} del mese` : placeholder

  return (
    <>
      <PickerTrigger
        display={display}
        isPlaceholder={!valid}
        disabled={disabled}
        style={style}
        onPress={() => setOpen(true)}
      />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Giorno scadenza</Text>
            {meseNum >= 1 && meseNum <= 12 ? (
              <Text style={styles.sheetHint}>
                {labelMese(mese!)} — max {maxGiorni} giorni
              </Text>
            ) : null}
            <ScrollView style={styles.gridScroll} contentContainerStyle={styles.dayGrid}>
              {giorni.map(d => {
                const selected = value === String(d)
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayChip, selected && styles.chipSelected]}
                    onPress={() => { onChange(String(d)); setOpen(false) }}
                  >
                    <Text style={[styles.dayChipText, selected && styles.chipTextSelected]}>{d}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

export function MeseInizioPicker({
  value,
  onChange,
  disabled,
  style,
  placeholder = 'Seleziona mese',
  giornoCollegato,
  onGiornoCollegatoChange,
  annoCollegato,
}: MeseProps) {
  const [open, setOpen] = useState(false)
  const nome = labelMese(value)
  const display = nome || placeholder

  function seleziona(m: string) {
    onChange(m)
    if (giornoCollegato && onGiornoCollegatoChange) {
      onGiornoCollegatoChange(clampGiornoAlMese(giornoCollegato, m, annoCollegato))
    }
    setOpen(false)
  }

  return (
    <>
      <PickerTrigger
        display={display}
        isPlaceholder={!nome}
        disabled={disabled}
        style={style}
        onPress={() => setOpen(true)}
      />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Mese</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {MESI.map(m => {
                const selected = value === String(m)
                const label = labelMese(String(m))
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.listOption, selected && styles.listOptionSelected]}
                    onPress={() => seleziona(String(m))}
                  >
                    <Text style={[styles.listOptionText, selected && styles.listOptionTextSelected]}>
                      {label}
                    </Text>
                    {selected ? <AppIcon name="check" size={16} color={COLORS.accent} /> : null}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

export function GiorniReminderPicker({
  value,
  onChange,
  disabled,
  style,
  min = 1,
  max = 30,
}: GiorniReminderProps) {
  const label = value === 1 ? '1 giorno' : `${value} giorni`

  function step(delta: number) {
    onChange(Math.min(max, Math.max(min, value + delta)))
  }

  return (
    <View style={[styles.reminderWrap, style]}>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[styles.stepperBtn, (disabled || value <= min) && styles.stepperBtnDisabled]}
          onPress={() => step(-1)}
          disabled={disabled || value <= min}
        >
          <Text style={styles.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.stepperValue, disabled && styles.placeholder]}>{label}</Text>
        <TouchableOpacity
          style={[styles.stepperBtn, (disabled || value >= max) && styles.stepperBtnDisabled]}
          onPress={() => step(1)}
          disabled={disabled || value >= max}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.presetRow}>
        {PRESET_GIORNI_REMINDER.filter(n => n >= min && n <= max).map(n => {
          const selected = value === n
          return (
            <TouchableOpacity
              key={n}
              style={[styles.presetChip, selected && styles.chipSelected]}
              onPress={() => !disabled && onChange(n)}
              disabled={disabled}
            >
              <Text style={[styles.presetChipText, selected && styles.chipTextSelected]}>{n}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

export function AnnoPicker({
  value,
  onChange,
  disabled,
  style,
  placeholder = 'Seleziona anno',
  meseCollegato,
  giornoCollegato,
  onGiornoCollegatoChange,
}: AnnoProps) {
  const [open, setOpen] = useState(false)
  const anni = useMemo(() => {
    const corrente = new Date().getFullYear()
    return Array.from({ length: 8 }, (_, i) => corrente - 2 + i)
  }, [])
  const display = value && parseInt(value, 10) > 2000 ? value : placeholder

  function seleziona(a: string) {
    onChange(a)
    if (meseCollegato && giornoCollegato && onGiornoCollegatoChange) {
      onGiornoCollegatoChange(clampGiornoAlMese(giornoCollegato, meseCollegato, a))
    }
    setOpen(false)
  }

  return (
    <>
      <PickerTrigger
        display={display}
        isPlaceholder={!value || parseInt(value, 10) <= 2000}
        disabled={disabled}
        style={style}
        onPress={() => setOpen(true)}
      />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Anno</Text>
            {anni.map(a => {
              const selected = value === String(a)
              return (
                <TouchableOpacity
                  key={a}
                  style={[styles.listOption, selected && styles.listOptionSelected]}
                  onPress={() => seleziona(String(a))}
                >
                  <Text style={[styles.listOptionText, selected && styles.listOptionTextSelected]}>{a}</Text>
                  {selected ? <AppIcon name="check" size={16} color={COLORS.accent} /> : null}
                </TouchableOpacity>
              )
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 12,
    gap: 8,
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText: { fontSize: 14, color: COLORS.primary, flex: 1 },
  placeholder: { color: COLORS.textMuted },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13,27,42,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  sheetHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 10,
  },
  gridScroll: { maxHeight: 280 },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChipText: { fontSize: 14, fontWeight: '500', color: COLORS.primary },
  chipSelected: { backgroundColor: '#E6F7F5', borderColor: COLORS.accent },
  chipTextSelected: { color: COLORS.accent, fontWeight: '700' },
  listOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  listOptionSelected: { backgroundColor: COLORS.background },
  listOptionText: { fontSize: 15, color: COLORS.primary },
  listOptionTextSelected: { color: COLORS.accent, fontWeight: '600' },
  reminderWrap: { gap: 10 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperBtnText: { fontSize: 20, fontWeight: '600', color: COLORS.primary, lineHeight: 22 },
  stepperValue: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.primary, textAlign: 'center' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetChipText: { fontSize: 13, fontWeight: '500', color: COLORS.primary },
})
