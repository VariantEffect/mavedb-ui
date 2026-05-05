/**
 * Maximum canvas dimension (px) supported across all major browsers.
 * Chrome/Firefox allow 32767; Safari caps at 16384. We use the lower bound.
 */
const MAX_CANVAS_DIMENSION = 16384

/**
 * Maximum total canvas area (px²) before Chrome throws an allocation error.
 */
const MAX_CANVAS_AREA = 268_435_456

const XMLNS = 'http://www.w3.org/2000/xmlns/'
const XLINKNS = 'http://www.w3.org/1999/xlink'
const SVGNS = 'http://www.w3.org/2000/svg'

/**
 * Save a chart container as an SVG file. Works across all major browsers by using a
 * programmatic anchor download.
 *
 * The exported file contains a proper <svg> root element so that it opens correctly in vector
 * graphics editors such as Inkscape and Affinity Designer. If the container holds multiple SVG
 * elements (e.g. a stacked heatmap), they are combined into a single <svg> root.
 *
 * @param container The HTML element whose chart SVG(s) should be exported.
 * @param filename The suggested filename base, without its .svg extension.
 * @param containerElementClass An optional ancestor element class to strip from CSS selector
 *   prefixes. See {@link getCSSStyles} for details.
 */
export function saveChartAsSvg(
  container: HTMLElement,
  filename: string = 'mavedb-chart',
  containerElementClass?: string
): void {
  const svgStr = serializeAsSvgString(container, containerElementClass)
  triggerDownload(new Blob([svgStr], {type: 'image/svg+xml'}), `${filename}.svg`)
}

/**
 * Save a chart container as a PNG file by rasterizing its serialized SVG onto a canvas.
 * Automatically scales down if the chart dimensions would exceed browser canvas limits.
 *
 * @param container The HTML element containing the chart to rasterize.
 * @param filename The suggested filename base, without its .png extension.
 * @param containerElementClass An optional ancestor element class to strip from CSS selector
 *   prefixes. See {@link getCSSStyles} for details.
 */
export async function saveChartAsPng(
  container: HTMLElement,
  filename: string = 'mavedb-chart',
  containerElementClass?: string
): Promise<void> {
  const svgStr = serializeAsSvgString(container, containerElementClass)

  // Get the true dimensions from the serialized SVG, not from the container.
  // container.scrollWidth only reflects the visible (clipped) size of the wrapper div,
  // which can be much smaller than the SVG content (e.g. inside a scroll container).
  const svgRoot = new DOMParser().parseFromString(svgStr, 'image/svg+xml').documentElement
  const viewBox = svgRoot.getAttribute('viewBox')?.split(/\s+/)
  const widthAttribute = parseFloat(svgRoot.getAttribute('width') || '0')
  const heightAttribute = parseFloat(svgRoot.getAttribute('height') || '0')
  const viewBoxWidth = viewBox ? parseFloat(viewBox[2]) : 0
  const viewBoxHeight = viewBox ? parseFloat(viewBox[3]) : 0
  const naturalWidth = widthAttribute || viewBoxWidth || container.scrollWidth
  const naturalHeight = heightAttribute || viewBoxHeight || container.scrollHeight

  // Scale down proportionally if the natural dimensions would overflow the canvas. We're
  // accepting the fact that this can result in an image that doesn't look great for large
  // charts, but this is unavoidable given browser limits. SVG export is the default, and
  // we prefer it as the recommended option for high-resolution output in any case.
  const scale = Math.min(
    1,
    MAX_CANVAS_DIMENSION / naturalWidth,
    MAX_CANVAS_DIMENSION / naturalHeight,
    Math.sqrt(MAX_CANVAS_AREA / (naturalWidth * naturalHeight))
  )
  const canvasWidth = Math.floor(naturalWidth * scale)
  const canvasHeight = Math.floor(naturalHeight * scale)

  if (scale < 0.75) {
    console.warn(
      `[chart-export] PNG scaled down to ${Math.round(scale * 100)}% (${canvasWidth}×${canvasHeight}px) ` +
        `due to browser canvas limits. For full-resolution output, use SVG export instead.`
    )
  }

  const svgBlob = new Blob([svgStr], {type: 'image/svg+xml'})
  const svgUrl = URL.createObjectURL(svgBlob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = svgUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvasWidth, canvasHeight)

    const pngBlob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(
                new Error(
                  'Failed to convert canvas to PNG. The canvas may be invalid or memory insufficient. Try SVG export or reduce chart size.'
                )
              ),
        'image/png'
      )
    )
    triggerDownload(pngBlob, `${filename}.png`)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

/**
 * Trigger a browser file download using a temporary object URL and anchor element.
 * This approach works across Chrome, Firefox, and Safari.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * Serialize the chart SVG(s) inside a container element into a self-contained SVG string that
 * can be saved to disk and opened in vector graphics editors.
 *
 * If the container itself is an <svg> it is used directly. Otherwise every <svg> descendant
 * (excluding those inside .exclude-from-export) is collected. A single SVG is used as the root
 * as-is; multiple SVGs are stacked vertically inside a new <svg> wrapper.
 *
 * @param container The HTML element wrapping the chart(s).
 * @param containerElementClass An optional ancestor element class to strip from CSS selector
 *   prefixes. See {@link getCSSStyles} for details.
 */
function serializeAsSvgString(container: Element, containerElementClass?: string): string {
  // Clone so we can mutate safely
  const containerClone = container.cloneNode(true) as Element

  // Remove elements excluded from export at any depth
  for (const el of Array.from(containerClone.querySelectorAll('.exclude-from-export'))) {
    el.parentNode?.removeChild(el)
  }

  // Collect the SVG element(s) to include in the output
  let svgsToProcess: Element[]
  if (containerClone.tagName.toLowerCase() === 'svg') {
    svgsToProcess = [containerClone]
  } else {
    svgsToProcess = Array.from(containerClone.querySelectorAll('svg'))
  }

  if (svgsToProcess.length === 0) return ''

  // Collect CSS from the original (pre-clone) element so that selectors still match
  const cssStr = getCSSStyles(container, containerElementClass)

  // Build the root SVG: single SVG is used directly; multiple are wrapped
  let rootSvg: Element
  if (svgsToProcess.length === 1) {
    rootSvg = svgsToProcess[0]
  } else {
    // Stack all inner SVGs vertically inside a new root
    let totalHeight = 0
    let maxWidth = 0
    const svgDimensions = svgsToProcess.map((svg) => {
      const vb = svg.getAttribute('viewBox')?.split(/\s+/)
      const w = parseFloat(svg.getAttribute('width') || '0') || (vb ? parseFloat(vb[2]) : 0)
      const h = parseFloat(svg.getAttribute('height') || '0') || (vb ? parseFloat(vb[3]) : 0)
      totalHeight += h
      maxWidth = Math.max(maxWidth, w)
      return {width: w, height: h}
    })

    const wrapperSvg = document.createElementNS(SVGNS, 'svg')
    wrapperSvg.setAttribute('width', String(maxWidth))
    wrapperSvg.setAttribute('height', String(totalHeight))

    let yOffset = 0
    for (let i = 0; i < svgsToProcess.length; i++) {
      const inner = svgsToProcess[i]
      inner.setAttribute('x', '0')
      inner.setAttribute('y', String(yOffset))
      wrapperSvg.appendChild(inner)
      yOffset += svgDimensions[i].height
    }

    rootSvg = wrapperSvg
  }

  // Rewrite absolute fragment URLs (e.g. linearGradient references) to relative ones so that
  // they resolve correctly when the file is opened outside the browser page
  const fragment = window.location.href + '#'
  const walker = document.createTreeWalker(rootSvg, NodeFilter.SHOW_ELEMENT)
  while (walker.nextNode()) {
    for (const attr of (walker.currentNode as Element).attributes) {
      if (attr.value.includes(fragment)) {
        attr.value = attr.value.replace(fragment, '#')
      }
    }
  }

  // Embed the relevant page CSS into the SVG so styles are preserved when opened externally
  const styleElement = document.createElement('style')
  styleElement.setAttribute('type', 'text/css')
  styleElement.innerHTML = cssStr
  rootSvg.insertBefore(styleElement, rootSvg.children[0] ?? null)

  // Declare SVG namespace so the file is recognized as SVG by editors and validators
  rootSvg.setAttributeNS(XMLNS, 'xmlns', SVGNS)
  rootSvg.setAttributeNS(XMLNS, 'xmlns:xlink', XLINKNS)

  return new window.XMLSerializer().serializeToString(rootSvg)
}

/**
 * Build a CSS string of all styles that affect a parent element or its descendants.
 *
 * The purpose of this function is to identify all the CSS styles that affect an SVG rendered in
 * the browser, so as to include them in an exported copy of the SVG.
 *
 * The limitation of this approach is that styles applied on the basis of CSS classes belonging
 * to ancestors of parentElement will be found, but their CSS selectors will not match elements
 * in the exported SVG, which lacks those ancestors. Normally, therefore, when using this
 * approach it is necessary to use global styles that apply to SVG elements regardless of the
 * enclosing DOM context.
 *
 * We support one extension here, which is to strip out a single ancestor class name, with an
 * optional attribute selector (which in the selector follows the class name immediately,
 * enclosed in square brackets: `class-name[attribute]`). In particular, this supports the case
 * where styles are applied to SVG elements only in the context of some element rendered by a
 * Vue component, and where Vue's style scope has been used. This case produces CSS selectors
 * like `.histogramContainer[data-v-75e9f366] .threshold-lines`, and in this case we strip out
 * the first part and only use `.threshold-lines` in the generated CSS text.
 *
 * @param parentElement The root element of the subtree to examine.
 * @param containerElementClass An optional ancestor element class to strip from the beginning
 *   of CSS selectors, along with an optional attribute.
 * @returns A CSS string representing all the rules that affect the specified parent element or
 *   its descendants.
 */
function getCSSStyles(parentElement: Element, containerElementClass?: string): string {
  const nodesToCheck = [parentElement, ...parentElement.getElementsByTagName('*')]

  const extractedCSSRules = []
  for (const stylesheet of [...document.styleSheets]) {
    try {
      if (!stylesheet.cssRules) {
        continue
      }
    } catch (e: any) {
      if (e.name !== 'SecurityError') {
        throw e // for Firefox
      }
      continue
    }

    for (const rule of [...stylesheet.cssRules]) {
      if (rule instanceof CSSStyleRule) {
        const ruleMatches = nodesToCheck.reduce(function (a, b) {
          return a || b.matches(rule.selectorText)
        }, false)
        if (ruleMatches) {
          if (containerElementClass) {
            const regex = new RegExp(`^.*\\.${containerElementClass}(\\[[^\\]]+\\])? `)
            const selectorParts = rule.selectorText
              .split(',')
              .map((x) => x.trim())
              .map((x) => x.replace(regex, ''))

            const selectorText = selectorParts.join(', ')
            const ruleStr = `${selectorText} {${rule.style.cssText}}`
            extractedCSSRules.push(ruleStr)
          } else {
            extractedCSSRules.push(rule.cssText)
          }
        }
      }
    }
  }
  return extractedCSSRules.join(' ')
}
