/** Patch client-side su pageBreakScript.js (iniettato dal backend), come desktop/web. */
export function preparaPreview(html: string): string {
  let out = html

  // Anteprima paginata: il running footer è position:absolute sul fondo pagina.
  // Con pagine successive il contenuto può non arrivare al fondo del foglio virtuale → overflow:hidden lo taglia.
  out = out.replace(
    `        } else {
          var previewIndex = window.__PREVIEW_PAGE_INDEX || 0;
          if (previewIndex < totalPages) {
            mount.appendChild(createRunningFooterClone(template, previewIndex, totalPages));
          }
        }`,
    `        } else {
          var previewIndex = window.__PREVIEW_PAGE_INDEX || 0;
          if (previewIndex < totalPages) {
            var pageEnd = (previewIndex + 1) * A4_HEIGHT_UNSCALED;
            if (getDocumentLayoutBottom() < pageEnd) {
              mount.style.minHeight = pageEnd + 'px';
            }
            mount.appendChild(createRunningFooterClone(template, previewIndex, totalPages));
          }
        }`,
  )

  return out
}

export function scalaHtmlPreview(html: string): string {
  const withScale = html.replace(
    '</head>',
    `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>html{width:100%}body{transform-origin:top left;transform:scale(__PREVIEW_SCALE__);width:__PREVIEW_WIDTH_PERCENT__%}</style>
        </head>`,
  )

  return preparaPreview(withScale)
}
