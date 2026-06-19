import { useMemo } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import {
  MESSAGGI_VARIABILI,
  inserisciVariabileMessaggio,
  parseMessaggioSegmenti,
  proteggiModificaMessaggio,
  serializzaMessaggioSegmenti,
  type TipoMessaggioCliente,
} from '../../messaggiCliente'
import { useSettingsTheme } from '../../hooks/useSettingsTheme'
import { settingsStyles as styles } from './settingsStyles'

type Props = {
  tipo: TipoMessaggioCliente
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}

export function MessaggioTemplateEditor({ tipo, value, onChange, multiline = true }: Props) {
  const t = useSettingsTheme()
  const ph = t.sub.color as string
  const variabili = MESSAGGI_VARIABILI[tipo]
  const segments = useMemo(() => parseMessaggioSegmenti(value, variabili), [value, variabili])

  const boxStyle = {
    backgroundColor: t.input.backgroundColor,
    borderColor: t.input.borderColor,
  }

  function aggiornaTesto(index: number, testo: string) {
    const next = segments.map((s, i) => (i === index && s.type === 'text' ? { ...s, value: testo } : s))
    onChange(serializzaMessaggioSegmenti(next))
  }

  function rimuoviVariabile(index: number) {
    onChange(serializzaMessaggioSegmenti(segments.filter((_, i) => i !== index)))
  }

  function inserisci(varName: string) {
    onChange(inserisciVariabileMessaggio(value, varName))
  }

  if (!multiline) {
    return (
      <View style={editorStyles.wrap}>
        <View style={[editorStyles.segmentRow, boxStyle]}>
          {segments.map((seg, i) =>
            seg.type === 'text' ? (
              <TextInput
                key={`t-${i}`}
                style={[editorStyles.inlineInput, { color: t.title.color }]}
                value={seg.value}
                onChangeText={(txt) => aggiornaTesto(i, txt)}
                placeholderTextColor={ph}
              />
            ) : (
              <Pressable key={`v-${i}`} style={editorStyles.varChip} onPress={() => rimuoviVariabile(i)}>
                <Text style={editorStyles.varChipText}>{`{${seg.name}}`}</Text>
              </Pressable>
            ),
          )}
        </View>
        <VariabiliBar variabili={variabili} value={value} onInsert={inserisci} t={t} />
      </View>
    )
  }

  return (
    <View style={editorStyles.wrap}>
      <TextInput
        style={[styles.input, t.input, { minHeight: 120, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={(next) => onChange(proteggiModificaMessaggio(value, next, variabili))}
        multiline
        placeholderTextColor={ph}
      />
      <VariabiliInTesto value={value} variabili={variabili} />
      <VariabiliBar variabili={variabili} value={value} onInsert={inserisci} t={t} />
    </View>
  )
}

function VariabiliInTesto({ value, variabili }: { value: string; variabili: string[] }) {
  const presenti = variabili.filter(v => value.includes(v))
  if (!presenti.length) return null
  return (
    <View style={editorStyles.varRow}>
      {presenti.map(v => (
        <View key={v} style={editorStyles.varChipLocked}>
          <Text style={editorStyles.varChipLockedText}>{v}</Text>
        </View>
      ))}
    </View>
  )
}

function VariabiliBar({
  variabili,
  value,
  onInsert,
  t,
}: {
  variabili: string[]
  value: string
  onInsert: (name: string) => void
  t: ReturnType<typeof useSettingsTheme>
}) {
  const disponibili = variabili.filter(v => !value.includes(v))
  if (!disponibili.length) return null
  return (
    <View style={editorStyles.insertRow}>
      <Text style={[editorStyles.insertLabel, t.sub]}>Inserisci</Text>
      {disponibili.map(v => (
        <Pressable
          key={v}
          style={[editorStyles.insertChip, { backgroundColor: t.input.backgroundColor, borderColor: t.input.borderColor }]}
          onPress={() => onInsert(v)}
        >
          <Text style={editorStyles.insertChipText}>{v}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const editorStyles = {
  wrap: { gap: 8 } as const,
  segmentRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    minHeight: 44,
  },
  inlineInput: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 60,
    fontSize: 14,
    paddingVertical: 2,
  },
  varRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
  varChip: {
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  varChipText: { fontSize: 12, color: '#0369A1', fontWeight: '600' as const },
  varChipLocked: {
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  varChipLockedText: { fontSize: 11, color: '#0369A1', fontWeight: '600' as const },
  insertRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const, gap: 6 },
  insertLabel: { fontSize: 11, fontWeight: '600' as const },
  insertChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  insertChipText: { fontSize: 11, color: '#0E9F8E', fontWeight: '600' as const },
}
