import { useMemo, type RefObject } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../../theme/ThemeContext'
import { Messaggio } from '../../types'

type Props = {
  scrollRef: RefObject<ScrollView | null>
  messaggi: Messaggio[]
  input: string
  loading: boolean
  onInputChange: (v: string) => void
  onInvia: () => void
}

function AvatarAi() {
  return (
    <View style={avatarStyles.wrap}>
      <Text style={avatarStyles.label}>AI</Text>
    </View>
  )
}

const avatarStyles = StyleSheet.create({
  wrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0E9F8E',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  label: { color: '#fff', fontSize: 10, fontWeight: '700' },
})

export function NuovoChatView({
  scrollRef,
  messaggi,
  input,
  loading,
  onInputChange,
  onInvia,
}: Props) {
  const { colors } = useTheme()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { flex: 1 },
        chatContent: { padding: 16, gap: 12, flexGrow: 1 },
        emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
        emptyChatIcon: { fontSize: 40, marginBottom: 12 },
        emptyChatTitle: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' },
        emptyChatSub: {
          fontSize: 13,
          color: colors.textMuted,
          textAlign: 'center',
          marginTop: 6,
          paddingHorizontal: 32,
        },
        rowUser: { flexDirection: 'row', justifyContent: 'flex-end' },
        rowAi: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
        bubbleUser: {
          maxWidth: '80%',
          borderRadius: 16,
          borderBottomRightRadius: 4,
          padding: 12,
          backgroundColor: '#0E9F8E',
        },
        bubbleAi: {
          maxWidth: '80%',
          borderRadius: 16,
          borderBottomLeftRadius: 4,
          padding: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        bubbleTextUser: { fontSize: 14, lineHeight: 20, color: '#fff' },
        bubbleTextAi: { fontSize: 14, lineHeight: 20, color: colors.text },
        inputArea: {
          flexDirection: 'row',
          gap: 10,
          padding: 12,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          alignItems: 'flex-end',
        },
        input: {
          flex: 1,
          backgroundColor: colors.bg,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          fontSize: 14,
          color: colors.text,
          maxHeight: 120,
        },
        sendBtn: {
          width: 44,
          height: 44,
          backgroundColor: '#0E9F8E',
          borderRadius: 22,
          justifyContent: 'center',
          alignItems: 'center',
        },
        sendBtnDisabled: { opacity: 0.4 },
        sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '600' },
      }),
    [colors],
  )

  return (
    <>
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.chatContent}>
        {messaggi.length === 0 && (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatIcon}>💬</Text>
            <Text style={styles.emptyChatTitle}>Descrivi il lavoro</Text>
            <Text style={styles.emptyChatSub}>Anche vago — l'AI farà le domande giuste</Text>
          </View>
        )}
        {messaggi.map((m, i) =>
          m.role === 'user' ? (
            <View key={i} style={styles.rowUser}>
              <View style={styles.bubbleUser}>
                <Text style={styles.bubbleTextUser}>{m.content}</Text>
              </View>
            </View>
          ) : (
            <View key={i} style={styles.rowAi}>
              <AvatarAi />
              <View style={styles.bubbleAi}>
                <Text style={styles.bubbleTextAi}>{m.content}</Text>
              </View>
            </View>
          ),
        )}
        {loading && (
          <View style={styles.rowAi}>
            <AvatarAi />
            <View style={styles.bubbleAi}>
              <ActivityIndicator size="small" color="#0E9F8E" style={{ marginTop: 4 }} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={onInputChange}
          placeholder="Descrivi il lavoro..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={onInvia}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendBtnText}>→</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}
