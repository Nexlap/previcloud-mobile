import { StyleSheet } from 'react-native'

/** Riga condivisa card preventivo (Storico + Cliente): allinea al centro il blocco sinistro rispetto alle azioni destra. */
export const preventivoCardRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  left: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
})
