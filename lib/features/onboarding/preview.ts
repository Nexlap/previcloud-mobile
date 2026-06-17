export function scalaHtmlPreviewOnboarding(html: string) {
  return html.replace(
    '</head>',
    `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>html{width:100%;overflow:hidden}body{transform-origin:top left;transform:scale(__PREVIEW_SCALE__);width:__PREVIEW_WIDTH_PERCENT__%;overflow:hidden}a{pointer-events:none!important;cursor:default!important}</style>
        </head>`
  )
}
