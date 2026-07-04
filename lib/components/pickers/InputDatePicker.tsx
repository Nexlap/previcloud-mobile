import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useState } from 'react'
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native'
import { formatDataBreve, inputDateToIso, oggiInputDate } from 'previcloud-shared'
import { COLORS } from '../../constants'
import { AppIcon } from '../icons/AppIcon'

type Props = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  style?: ViewStyle
  placeholder?: string
  maximumDate?: Date
}

function parseInputDate(value: string): Date {
  if (value && !Number.isNaN(new Date(`${value}T12:00:00`).getTime())) {
    return new Date(`${value}T12:00:00`)
  }
  return new Date(`${oggiInputDate()}T12:00:00`)
}

function dateToInputValue(date: Date): string {
  return date.toLocaleDateString('en-CA')
}

export function InputDatePicker({
  value,
  onChange,
  disabled,
  style,
  placeholder = 'Seleziona data',
  maximumDate,
}: Props) {
  const [showAndroid, setShowAndroid] = useState(false)
  const [showIos, setShowIos] = useState(false)
  const [iosDraft, setIosDraft] = useState(() => parseInputDate(value))

  const display = value ? formatDataBreve(inputDateToIso(value)) : placeholder
  const isPlaceholder = !value

  function openPicker() {
    if (disabled) return
    setIosDraft(parseInputDate(value))
    if (Platform.OS === 'ios') {
      setShowIos(true)
    } else {
      setShowAndroid(true)
    }
  }

  function handleAndroidChange(event: DateTimePickerEvent, selectedDate?: Date) {
    setShowAndroid(false)
    if (event.type === 'dismissed' || !selectedDate) return
    onChange(dateToInputValue(selectedDate))
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, style, disabled && styles.triggerDisabled]}
        onPress={openPicker}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Text style={[styles.triggerText, isPlaceholder && styles.placeholder]} numberOfLines={1}>
          {display}
        </Text>
        <AppIcon name="calendar" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      {showAndroid ? (
        <DateTimePicker
          value={parseInputDate(value)}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          onChange={handleAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={showIos} transparent animationType="fade" onRequestClose={() => setShowIos(false)}>
          <Pressable style={styles.overlay} onPress={() => setShowIos(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>Data</Text>
              <DateTimePicker
                value={iosDraft}
                mode="date"
                display="spinner"
                maximumDate={maximumDate}
                onChange={(_, selectedDate) => {
                  if (selectedDate) setIosDraft(selectedDate)
                }}
              />
              <View style={styles.iosActions}>
                <TouchableOpacity style={styles.iosBtnSecondary} onPress={() => setShowIos(false)}>
                  <Text style={styles.iosBtnSecondaryText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iosBtnPrimary}
                  onPress={() => {
                    onChange(dateToInputValue(iosDraft))
                    setShowIos(false)
                  }}
                >
                  <Text style={styles.iosBtnPrimaryText}>Conferma</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
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
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  iosActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  iosBtnSecondary: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  iosBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  iosBtnPrimary: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#0E9F8E',
    paddingVertical: 12,
    alignItems: 'center',
  },
  iosBtnPrimaryText: { fontSize: 14, fontWeight: '600', color: '#fff' },
})
