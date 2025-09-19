import {showSaveFilePicker} from 'native-file-system-adapter'
import domtoimage from 'dom-to-image'

const XMLNS = 'http://www.w3.org/2000/xmlns/'
const XLINKNS = 'http://www.w3.org/1999/xlink'
const SVGNS = 'http://www.w3.org/2000/svg'

/**
 * Save an SVG image as a file on the user's local machine.
 *
 * The user should be prompted for the save location, filename, and type, with SVG and PNG as file type options. This
 * does not work reliably on all browsers right now, but when it fails, the image is saved as an SVG file with the
 * specified default filename.
 *
 * The file chooser dialog tends to work in Chrome but not in Firefox or Safari, where the image is just saved in SVG
 * format. The behavior may depend on browser settings.
 *
 * @param svgElement The SVG element containing the image to export.
 * @param suggestedFilenameBase The filename to suggest, without its extension.
 * @param containerElementClass An optional ancestor element class to consider when building CSS for the serialized SVG
 *   image. See {@link getCSSStyles} for details about its use.
 */
export async function saveChartAsFile(
  svgContainer: HTMLElement,
  suggestedFilenameBase: string = 'mavedb-chart',
  containerElementClass?: string
) {
  const fileHandle = await showSaveFilePicker({
    _preferPolyfill: false,
    suggestedName: `${suggestedFilenameBase}.svg`,
    types: [{accept: {'image/svg+xml': ['.svg']}}, {accept: {'image/png': ['.png']}}],
    excludeAcceptAllOption: false // default
  })

  const extensionChosen = fileHandle.name.split('.').pop()

  if (extensionChosen === 'png') {
    const filter = (node: Node) => {
      return (node as Element).classList.contains('exclude-from-export') ? false : true
    }
    const pngBlob = await domtoimage.toBlob(svgContainer, {
      filter: filter,
      width: svgContainer.scrollWidth,
      height: svgContainer.scrollHeight
    })
    await pngBlob.stream().pipeTo(await fileHandle.createWritable())
  } else {
    // use custom serializer to support images composed of multiple SVGs
    const svgBlob = new Blob([serializeAsSvgString(svgContainer, containerElementClass)], {type: 'image/svg+xml'})
    await svgBlob.stream().pipeTo(await fileHandle.createWritable())
  }
}

/**
 * Serialize an SVG element and its content as a blob containing SVG XML text, which can then be saved to a file as a
 * way of exporting the SVG image.
 *
 * @param svgElement The <svg> element to serialize.
 * @param containerElementClass An optional ancestor element class to consider when building CSS for the serialized SVG
 *   image. See {@link getCSSStyles} for details about its use.
 * @returns A blob containing SVG XML text representing the same image, stripped as much as possible of its relation to
 *   its context on the page.
 */
function serializeAsSvgString(svgElement: Element, containerElementClass?: string) {
  const svgClone = svgElement.cloneNode(true) as Element

  const elements = svgClone.getElementsByClassName('exclude-from-export')
  for (const element of Array.from(elements)) {
    svgClone.removeChild(element)
  }

  const cssStr = getCSSStyles(svgElement, containerElementClass)

  const styleElement = document.createElement('style')
  styleElement.setAttribute('type', 'text/css')
  styleElement.innerHTML = cssStr
  const refNode = svgClone.hasChildNodes() ? svgClone.children[0] : null
  svgClone.insertBefore(styleElement, refNode)

  const fragment = window.location.href + '#'
  const walker = document.createTreeWalker(svgClone, NodeFilter.SHOW_ELEMENT)
  while (walker.nextNode()) {
    for (const attr of (walker.currentNode as Element).attributes) {
      if (attr.value.includes(fragment)) {
        attr.value = attr.value.replace(fragment, '#')
      }
    }
  }

  svgClone.setAttributeNS(XMLNS, 'xmlns', SVGNS)
  svgClone.setAttributeNS(XMLNS, 'xmlns:xlink', XLINKNS)
  const serializer = new window.XMLSerializer()
  const string = serializer.serializeToString(svgClone)
  return string
}

/**
 * Build a CSS string of all styles that affect a parent element or its descendants.
 *
 * The purpose of this function is to identify all the CSS styles that affect an SVG rendered in the browser, so as to
 * include them in an exported copy of the SVG.
 *
 * The limitation of this approach is that styles applied on the basis of CSS classes belonging to ancestors of
 * parentElement will be found, but their CSS selectors will not match elements in the exported SVG, which lacks those
 * ancestors. Normally, therefore, when using this approach it it necessary to use global styles that apply to SVG
 * elements regardless of the enclosing DOM context.
 *
 * We support one extension here, which is to strip out a single ancestor class name, with an optional attribute
 * selector (which in the selector follows the class name immediately, enclosed in square brackets:
 *`class-name[attribute]`). In particular, this supports the case where styles are applied to SVG elements only in the
 * context of some element rendered by a Vue component, and where Vue's style scope has been used. This case produces
 * CSS selectors like `.histogramContainer[data-v-75e9f366] .threshold-lines`, and in this case we strip out the
 * first part and only use `.threshold-lines` in the generated CSS text.
 *
 * @param parentElement The root element of the subtree to examine.
 * @param containerElementClass An optional ancestor element class to strip from the beginning of CSS selectors, along
 *   with an optional attribute.
 * @returns A CSS string representing all the rules that affect the specified parent element or its descendants.
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
