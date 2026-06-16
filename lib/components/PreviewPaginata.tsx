import { useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native'
import WebView from 'react-native-webview'

const A4_RATIO = 297 / 210

type PageBreakMessage = {
  type: 'page-breaks'
  pageHeightPx?: number
  totalPages?: number
  breakPoints?: { page: number; offsetTop: number; tag?: string }[]
}

type Props = {
  htmlContent: string
  width?: number
  height?: number
  borderRadius?: number
}

export default function PreviewPaginata({ htmlContent, width, height, borderRadius = 10 }: Props) {
  const larghezza = width ?? Dimensions.get('window').width - 24 * 2 - 14 * 2 - 2
  const altezza = height ?? larghezza * A4_RATIO
  const [totalPages, setTotalPages] = useState(1)
  const [breakPoints, setBreakPoints] = useState<PageBreakMessage['breakPoints']>([])
  const [paginaAttiva, setPaginaAttiva] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    setTotalPages(1)
    setBreakPoints([])
    setPaginaAttiva(0)
    scrollRef.current?.scrollTo({ x: 0, animated: false })
  }, [htmlContent])

  const pagine = useMemo(() => Array.from({ length: Math.max(totalPages, 1) }, (_, i) => i), [totalPages])

  function htmlPerPagina(pageIndex: number) {
    if (pageIndex === 0) return htmlContent
    const offsetScalato = Math.round(altezza * pageIndex)
    return htmlContent.replace(
      '</head>',
      `<style>body{margin-top:-${offsetScalato}px!important}</style></head>`
    )
  }

  function onMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as PageBreakMessage
      if (data.type !== 'page-breaks') return
      setTotalPages(Math.max(1, Math.min(data.totalPages || 1, 4)))
      setBreakPoints(data.breakPoints || [])
    } catch {}
  }

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setPaginaAttiva(Math.round(event.nativeEvent.contentOffset.x / larghezza))
  }

  if (!htmlContent) return null

  if (totalPages <= 1) {
    return (
      <View style={[styles.pageFrame, { width: larghezza, height: altezza, borderRadius }]}>
        <WebView
          source={{ html: htmlContent }}
          style={styles.webview}
          scrollEnabled={false}
          scalesPageToFit={false}
          pinchGestureEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          onMessage={onMessage}
        />
      </View>
    )
  }

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={{ width: larghezza, height: altezza }}
      >
        {pagine.map(pageIndex => (
          <View key={pageIndex} style={[styles.pageFrame, { width: larghezza, height: altezza, borderRadius }]}>
            <WebView
              source={{ html: htmlPerPagina(pageIndex) }}
              style={styles.webview}
              scrollEnabled={false}
              scalesPageToFit={false}
              pinchGestureEnabled={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {pagine.map(pageIndex => (
          <View key={pageIndex} style={[styles.dot, pageIndex === paginaAttiva && styles.dotActive]} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  pageFrame: { overflow: 'hidden', backgroundColor: '#fff' },
  webview: { flex: 1, backgroundColor: '#fff' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  dotActive: { width: 18, backgroundColor: '#0E9F8E' },
})
