import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { formatData, inputDateToIso, oggiInputDate } from 'preventivoai-shared'
import { InputDatePicker } from '../pickers/InputDatePicker'

type Props = {
  pagata: boolean
  dataIncasso?: string | null
  onToggle: (pagata: boolean, dataIncasso?: string) => Promise<void> | void
  disabled?: boolean
}

function dataIncassoValida(date: string): boolean {
  if (!date.trim()) return false
  return !Number.isNaN(new Date(`${date}T12:00:00`).getTime())
}

export function RataSegnaPagataSection({ pagata, dataIncasso, onToggle, disabled }: Props) {
  const [salvando, setSalvando] = useState(false)
  const [mostraDataIncasso, setMostraDataIncasso] = useState(false)
  const [dataIncassoInput, setDataIncassoInput] = useState(oggiInputDate())
  const [erroreData, setErroreData] = useState<string | null>(null)
  const [pagataLocale, setPagataLocale] = useState(pagata)

  useEffect(() => {
    setPagataLocale(pagata)
    setMostraDataIncasso(false)
    setErroreData(null)
  }, [pagata, dataIncasso])

  async function handleToggle(value: boolean) {
    if (value) {
      setDataIncassoInput(oggiInputDate())
      setErroreData(null)
      setPagataLocale(true)
      setMostraDataIncasso(true)
      return
    }
    setSalvando(true)
    try {
      await onToggle(false)
      setPagataLocale(false)
      setMostraDataIncasso(false)
    } finally {
      setSalvando(false)
    }
  }

  async function confermaPagata() {
    if (!dataIncassoValida(dataIncassoInput)) {
      setErroreData('Inserisci una data di incasso valida.')
      return
    }
    setErroreData(null)
    setSalvando(true)
    try {
      await onToggle(true, inputDateToIso(dataIncassoInput))
      setPagataLocale(true)
      setMostraDataIncasso(false)
    } finally {
      setSalvando(false)
    }
  }

  function annullaData() {
    setMostraDataIncasso(false)
    setErroreData(null)
    setPagataLocale(pagata)
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>Segna come pagata</Text>
        {salvando ? (
          <ActivityIndicator color="#0E9F8E" />
        ) : (
          <Switch
            value={pagataLocale}
            onValueChange={handleToggle}
            disabled={disabled || salvando}
            trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
            thumbColor="#fff"
          />
        )}
      </View>
      {pagataLocale && dataIncasso && !mostraDataIncasso ? (
        <Text style={styles.dataEsistente}>Incassata il {formatData(dataIncasso)}</Text>
      ) : null}
      {mostraDataIncasso ? (
        <View style={styles.dataBox}>
          <Text style={styles.dataLabel}>DATA INCASSO</Text>
          <InputDatePicker
            value={dataIncassoInput}
            onChange={(v) => {
              setDataIncassoInput(v)
              if (erroreData) setErroreData(null)
            }}
            maximumDate={new Date()}
          />
          {erroreData ? <Text style={styles.errore}>{erroreData}</Text> : null}
          <View style={styles.dataActions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={annullaData} disabled={salvando}>
              <Text style={styles.btnSecondaryText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={confermaPagata} disabled={salvando}>
              <Text style={styles.btnPrimaryText}>Conferma</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 14, fontWeight: '500', color: '#0D1B2A' },
  dataEsistente: { fontSize: 12, color: '#9CA3AF' },
  dataBox: { backgroundColor: '#F7F8FA', borderRadius: 12, padding: 12, gap: 8 },
  dataLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
  errore: { fontSize: 12, color: '#DC2626' },
  dataActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnSecondary: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  btnPrimary: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#0E9F8E',
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '600', color: '#fff' },
})
