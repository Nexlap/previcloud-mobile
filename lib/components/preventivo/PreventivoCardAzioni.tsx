import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { InviaFirmaChip } from '../firma/InviaFirmaChip'
import { PreventivoStatoBadge } from './PreventivoStatoBadge'
import type { Preventivo } from '../../types'
import { formatImportoDb, formatDataBreve } from 'preventivoai-shared'

type Props = {
  preventivo: Preventivo
  collegamentoPiano?: boolean
  mostraInvia: boolean
  modalitaSelezione?: boolean
  selezionato?: boolean
  onStatoPress: () => void
  onScaricaPdf: () => void
  onInviaFirma?: () => void
  onMenu: () => void
  onToggleSelezione?: () => void
  onLongPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function PreventivoCardAzioni({
  preventivo: p,
  collegamentoPiano = false,
  mostraInvia,
  modalitaSelezione = false,
  selezionato = false,
  onStatoPress,
  onScaricaPdf,
  onInviaFirma,
  onMenu,
  onToggleSelezione,
  onLongPress,
  style,
}: Props) {
  const mostraAzioni = !modalitaSelezione
  const mostraDataPagamento = Boolean(p.pagato && p.data_pagamento && !collegamentoPiano && !modalitaSelezione)
  const toggleSelezione = () => onToggleSelezione?.()
  const longPressProps = onLongPress
    ? { onLongPress, delayLongPress: 400 as const }
    : {}

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.stack}>
        <Text
          style={styles.importo}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {p.importo_totale ? `\u20AC${formatImportoDb(p.importo_totale)}` : '\u2014'}
        </Text>

        <TouchableOpacity
          style={styles.statoTouch}
          onPress={modalitaSelezione ? toggleSelezione : onStatoPress}
          activeOpacity={0.7}
          disabled={modalitaSelezione && !onToggleSelezione}
          {...longPressProps}
        >
          <PreventivoStatoBadge
            stato={p.stato}
            pagato={p.pagato}
            pagamentoGestitoDalPiano={collegamentoPiano}
            showArrow={!modalitaSelezione}
          />
          {mostraDataPagamento ? (
            <View style={styles.dataPagamentoSlot}>
              <Text style={styles.dataPagamento}>Pagato il {formatDataBreve(p.data_pagamento!)}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {mostraAzioni ? (
          <>
            <TouchableOpacity
              onPress={onScaricaPdf}
              style={styles.iconBtn}
              activeOpacity={0.7}
              accessibilityLabel={p.pdf_url ? 'Scarica PDF' : 'Genera PDF'}
              {...longPressProps}
            >
              <Feather name="download" size={18} color="#0E9F8E" />
            </TouchableOpacity>
            {mostraInvia && onInviaFirma ? <InviaFirmaChip onPress={onInviaFirma} onLongPress={onLongPress} /> : null}
          </>
        ) : null}
      </View>

      {mostraAzioni ? (
        <TouchableOpacity style={styles.menuCol} onPress={onMenu} hitSlop={8} activeOpacity={0.7} {...longPressProps}>
          <Text style={styles.menuPuntini}>{'\u22EE'}</Text>
        </TouchableOpacity>
      ) : modalitaSelezione ? (
        <TouchableOpacity style={styles.menuCol} onPress={toggleSelezione} hitSlop={8} activeOpacity={0.7} {...longPressProps}>
          <Text style={styles.selezioneIcon}>{selezionato ? '\u2611' : '\u2610'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'stretch',
    marginLeft: 8,
  },
  stack: {
    alignItems: 'flex-end',
    gap: 6,
    paddingRight: 2,
    minWidth: 100,
  },
  statoTouch: {
    alignItems: 'flex-end',
  },
  importo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
    alignSelf: 'stretch',
    textAlign: 'right',
  },
  dataPagamento: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'right',
  },
  dataPagamentoSlot: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  iconBtn: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  menuCol: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 4,
    minWidth: 28,
  },
  menuPuntini: {
    fontSize: 22,
    color: '#9CA3AF',
    lineHeight: 24,
  },
  selezioneIcon: {
    fontSize: 18,
    color: '#0E9F8E',
  },
})
