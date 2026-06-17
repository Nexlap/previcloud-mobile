import { useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native'
import WebView, { WebViewMessageEvent } from 'react-native-webview'

const TEMPLATE_WIDTH_PX = 800
const PAGE_HEIGHT_LAYOUT = 1123

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
  const scale = larghezza / TEMPLATE_WIDTH_PX
  const altezza = height ?? Math.round(PAGE_HEIGHT_LAYOUT * scale)
  const [totalPages, setTotalPages] = useState(1)
  const [paginaAttiva, setPaginaAttiva] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    setTotalPages(1)
    setPaginaAttiva(0)
    scrollRef.current?.scrollTo({ x: 0, animated: false })
  }, [htmlContent])

  const pagine = useMemo(() => Array.from({ length: Math.max(totalPages, 1) }, (_, i) => i), [totalPages])

  function htmlPerPagina(pageIndex: number) {
    const widthPercent = (100 / scale).toFixed(2)
    const pageScript = `<script>window.__PREVIEW_PAGE_INDEX=${pageIndex};</script>`
    return htmlContent
      .replace(/__PREVIEW_SCALE__/g, scale.toFixed(4))
      .replace(/__PREVIEW_WIDTH_PERCENT__/g, widthPercent)
      .replace('</head>', `${pageScript}</head>`)
  }

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as PageBreakMessage
      if (data.type !== 'page-breaks') return
      setTotalPages(Math.max(1, Math.min(data.totalPages || 1, 20)))
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
          source={{ html: htmlPerPagina(0) }}
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
              onMessage={onMessage}
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
