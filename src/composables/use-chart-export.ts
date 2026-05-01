import {ref, computed, type Ref, type ComputedRef} from 'vue'

/**
 * Yields execution until the browser has committed at least one rendered frame to the screen.
 *
 * This is necessary before running blocking work (e.g. synchronous SVG serialization) when
 * you need reactive state changes — like showing a spinner or disabling a button — to be
 * *visible* to the user first, not just written to the DOM.
 *
 * Why two levels of deferral?
 *
 * 1. Vue flushes reactive updates as microtasks, so after `svgInProgress = true` is set the
 *    DOM is updated before any macrotask or animation frame runs. But DOM updates alone don't
 *    guarantee a paint — the browser batches rendering and only paints when it's ready.
 *
 * 2. `requestAnimationFrame(cb)` schedules `cb` to run at the start of the next frame, just
 *    before the browser paints that frame. So we're now inside the frame lifecycle, but the
 *    paint itself hasn't happened yet.
 *
 * 3. `setTimeout(resolve, 0)` inside the rAF schedules the continuation as a macrotask for
 *    the *next* event loop turn — after the browser has finished painting the current frame.
 *
 * The result: any state changes made before calling `yieldToRenderer()` are guaranteed to be
 * painted on screen before the promise resolves.
 */
function yieldToRenderer(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
}

export interface ChartExportFns {
  svg: () => void
  png: () => Promise<void>
}

export interface UseChartExport {
  inProgress: ComputedRef<boolean>
  exportSvg: () => void
  exportPng: () => Promise<void>
}

/**
 * Provides reactive in-progress state and wrapper methods for SVG and PNG chart exports.
 *
 * SVG export is synchronous but can block the main thread for large charts. The wrapper
 * defers execution with requestAnimationFrame so the in-progress state is painted to the
 * screen before the work begins.
 *
 * PNG export is async. The wrapper awaits it and clears the flag when done.
 *
 * @param exportFns A ref containing { svg, png } export functions.
 */
export function useChartExport(exportFns: Ref<ChartExportFns | null>): UseChartExport {
  const svgInProgress = ref(false)
  const pngInProgress = ref(false)
  const inProgress = computed(() => svgInProgress.value || pngInProgress.value)

  function exportSvg() {
    if (!exportFns.value || svgInProgress.value || pngInProgress.value) return
    svgInProgress.value = true
    yieldToRenderer().then(() => {
      try {
        exportFns.value!.svg()
      } finally {
        svgInProgress.value = false
      }
    })
  }

  async function exportPng() {
    if (!exportFns.value || svgInProgress.value || pngInProgress.value) return
    pngInProgress.value = true
    await yieldToRenderer()
    try {
      await exportFns.value.png()
    } finally {
      pngInProgress.value = false
    }
  }

  return {inProgress, exportSvg, exportPng}
}
