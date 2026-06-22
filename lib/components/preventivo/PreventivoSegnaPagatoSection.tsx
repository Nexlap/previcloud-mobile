import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { formatData, inputDateToIso, oggiInputDate } from 'preventivoai-shared'
import { InputDatePicker } from '../pickers/InputDatePicker'

type Props = {
  pagato: boolean
  dataPagamento?: string | null
  onTogglePagato: (pagato: boolean, dataPagamento?: string) => void | Promise<void>
  disabled?: boolean
}

function dataPagamentoValida(date: string): boolean {
  if (!date.trim()) return false
  return !Number.isNaN(new Date(`${date}T12:00:00`).getTime())
}

export function PreventivoSegnaPagatoSection({
  pagato,
  dataPagamento,
  onTogglePagato,
  disabled,
}: Props) {
  const [salvando, setSalvando] = useState(false)
  const [mostraDataPagamento, setMostraDataPagamento] = useState(false)
  const [dataPagamentoInput, setDataPagamentoInput] = useState(oggiInputDate())
  const [erroreData, setErroreData] = useState<string | null>(null)
  const [pagatoLocale, setPagatoLocale] = useState(pagato)

  useEffect(() => {
    setPagatoLocale(pagato)
    setMostraDataPagamento(false)
    setErroreData(null)
  }, [pagato, dataPagamento])

  async function handleToggle(value: boolean) {
    if (value) {
      setDataPagamentoInput(oggiInputDate())
      setErroreData(null)
      setPagatoLocale(true)
      setMostraDataPagamento(true)
      return
    }
    setSalvando(true)
    try {
      await onTogglePagato(false)
      setPagatoLocale(false)
      setMostraDataPagamento(false)
    } finally {
      setSalvando(false)
    }
  }

  async function confermaPagato() {
    if (!dataPagamentoValida(dataPagamentoInput)) {
      setErroreData('Inserisci una data di pagamento valida.')
      return
    }
    setErroreData(null)
    setSalvando(true)
    try {
      await onTogglePagato(true, inputDateToIso(dataPagamentoInput))
      setPagatoLocale(true)
      setMostraDataPagamento(false)
    } finally {
      setSalvando(false)
    }
  }

  function annullaData() {
    setMostraDataPagamento(false)
    setErroreData(null)
    setPagatoLocale(pagato)
  }

  return (
    <>
      <View style={styles.pagatoDivider} />
      <View style={styles.pagatoRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pagatoLabel}>Segna come pagato</Text>
          <Text style={styles.pagatoSub}>Registra l&apos;incasso del preventivo accettato</Text>
        </View>
        {salvando ? (
          <ActivityIndicator color="#0E9F8E" />
        ) : (
          <Switch
            value={pagatoLocale}
            onValueChange={handleToggle}
            disabled={disabled || salvando}
            trackColor={{ false: '#E5E7EB', true: '#0E9F8E' }}
            thumbColor="#fff"
          />
        )}
      </View>
      {pagatoLocale && dataPagamento && !mostraDataPagamento ? (
        <Text style={styles.pagatoDataEsistente}>Pagato il {formatData(dataPagamento)}</Text>
      ) : null}
      {mostraDataPagamento ? (
        <View style={styles.dataBox}>
          <Text style={styles.dataLabel}>DATA PAGAMENTO</Text>
          <InputDatePicker
            value={dataPagamentoInput}
            onChange={(v) => {
              setDataPagamentoInput(v)
              if (erroreData) setErroreData(null)
            }}
            maximumDate={new Date()}
          />
          {erroreData ? <Text style={styles.errore}>{erroreData}</Text> : null}
          <View style={styles.dataActions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={annullaData} disabled={salvando}>
              <Text style={styles.btnSecondaryText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={confermaPagato} disabled={salvando}>
              <Text style={styles.btnPrimaryText}>Conferma</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  pagatoDivider: { height: 1, backgroundColor: '#F3F4F6', marginTop: 8, marginBottom: 4 },
  pagatoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  pagatoLabel: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  pagatoSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  pagatoDataEsistente: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  dataBox: { backgroundColor: '#F7F8FA', borderRadius: 12, padding: 12, marginBottom: 8, gap: 8 },
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
