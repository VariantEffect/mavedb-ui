import {beforeEach, describe, expect, it, vi} from 'vitest'
import {ref, watch, type Ref} from 'vue'

import {useScoreSetDownloads} from './use-score-set-downloads'

const downloadScoreSetFile = vi.fn()
const downloadScoreSetVariantData = vi.fn()
const downloadMappedVariants = vi.fn()

vi.mock('@/api/mavedb', () => ({
  downloadScoreSetFile: (...args: unknown[]) => downloadScoreSetFile(...args),
  downloadScoreSetVariantData: (...args: unknown[]) => downloadScoreSetVariantData(...args),
  downloadMappedVariants: (...args: unknown[]) => downloadMappedVariants(...args)
}))

// The real one reaches for `document`; these tests run in the node environment.
vi.mock('@/lib/downloads', () => ({triggerDownload: vi.fn()}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SCORE_SET = ref({urn: 'urn:mavedb:00000001-a-1'} as any)

/** Collect every value the progress ref takes; it is back to null by the time a download resolves. */
function recordProgress(source: Ref<number | null>): {values: (number | null)[]; stop: () => void} {
  const values: (number | null)[] = []
  const stop = watch(source, (value) => values.push(value), {flush: 'sync'})
  return {values, stop}
}

beforeEach(() => {
  downloadScoreSetFile.mockReset()
  downloadScoreSetVariantData.mockReset()
  downloadMappedVariants.mockReset()
})

describe('useScoreSetDownloads download indicator', () => {
  it('is idle before anything is requested', () => {
    const {fileDownloadInProgress, fileDownloadLabel} = useScoreSetDownloads({scoreSet: SCORE_SET})

    expect(fileDownloadInProgress.value).toBe(false)
    expect(fileDownloadLabel.value).toBeNull()
  })

  it('names the file being prepared while the request is in flight', async () => {
    let release: (csv: string) => void = () => {}
    downloadScoreSetFile.mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
    const {downloadFile, fileDownloadInProgress, fileDownloadLabel} = useScoreSetDownloads({scoreSet: SCORE_SET})

    const pending = downloadFile('counts')
    expect(fileDownloadInProgress.value).toBe(true)
    expect(fileDownloadLabel.value).toBe('Counts')

    release('accession,c_0\n')
    await pending

    expect(fileDownloadInProgress.value).toBe(false)
    expect(fileDownloadLabel.value).toBeNull()
  })

  it('leaves a CSV indeterminate, since a gzipped body has no measurable total', async () => {
    let release: (csv: string) => void = () => {}
    downloadScoreSetFile.mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
    const {downloadFile, fileDownloadProgress} = useScoreSetDownloads({scoreSet: SCORE_SET})

    const pending = downloadFile('scores')
    expect(fileDownloadProgress.value).toBeNull()

    release('accession,score\n')
    await pending
  })

  it('clears the indicator when the request fails', async () => {
    // Otherwise a failed 10MB download leaves the buttons disabled behind a bar that never stops.
    downloadScoreSetFile.mockRejectedValueOnce(new Error('boom'))
    const {downloadFile, fileDownloadInProgress} = useScoreSetDownloads({scoreSet: SCORE_SET})

    await expect(downloadFile('scores')).rejects.toThrow('boom')

    expect(fileDownloadInProgress.value).toBe(false)
  })

  it('ignores a second request while one is already running', async () => {
    let release: (csv: string) => void = () => {}
    downloadScoreSetFile.mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
    const {downloadFile, fileDownloadLabel} = useScoreSetDownloads({scoreSet: SCORE_SET})

    const pending = downloadFile('scores')
    await downloadFile('counts')

    // The first request still owns the indicator, and the second never reached the API.
    expect(fileDownloadLabel.value).toBe('Scores')
    expect(downloadScoreSetFile).toHaveBeenCalledTimes(1)

    release('accession,score\n')
    await pending
  })

  it('covers the custom-columns download too', async () => {
    let release: (csv: string) => void = () => {}
    downloadScoreSetVariantData.mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
    const {downloadMultipleData, fileDownloadLabel} = useScoreSetDownloads({scoreSet: SCORE_SET})

    const pending = downloadMultipleData({namespaces: ['scores'], extras: []})
    expect(fileDownloadLabel.value).toBe('Custom data')

    release('accession,score\n')
    await pending

    expect(fileDownloadLabel.value).toBeNull()
  })

  it('covers the mapped-variants download too', async () => {
    let release: (data: unknown) => void = () => {}
    downloadMappedVariants.mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
    const {downloadMappedVariantsFile, fileDownloadLabel} = useScoreSetDownloads({scoreSet: SCORE_SET})

    const pending = downloadMappedVariantsFile()
    expect(fileDownloadLabel.value).toBe('Mapped variants')

    release([])
    await pending

    expect(fileDownloadLabel.value).toBeNull()
  })

  it('does nothing without a score set', async () => {
    const {downloadFile, fileDownloadInProgress} = useScoreSetDownloads({scoreSet: ref(null)})

    await downloadFile('scores')

    expect(downloadScoreSetFile).not.toHaveBeenCalled()
    expect(fileDownloadInProgress.value).toBe(false)
  })
})

describe('useScoreSetDownloads annotation streaming shares the indicator', () => {
  /** Serve an NDJSON body in the given chunks, with an optional X-Total-Count. */
  function mockStream(chunks: string[], totalCount: string | null = '4') {
    const encoder = new TextEncoder()
    let index = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: {get: (name: string) => (name === 'X-Total-Count' ? totalCount : null)},
        body: {
          getReader: () => ({
            read: async () =>
              index < chunks.length ? {done: false, value: encoder.encode(chunks[index++])} : {done: true}
          })
        }
      })
    )
  }

  beforeEach(() => {
    // The stream saves its file through Blob + an anchor click rather than `triggerDownload`, so the
    // node environment needs both stubbed for the completion path to run.
    vi.stubGlobal('Blob', class {})
    vi.stubGlobal('URL', {createObjectURL: () => 'blob:stub', revokeObjectURL: () => {}})
    vi.stubGlobal('document', {createElement: () => ({click: () => {}})})
  })

  it('reports a percentage, since a VA-Spec stream can count records', async () => {
    mockStream(['{"a":1}\n', '{"a":2}\n'], '2')
    const downloads = useScoreSetDownloads({scoreSet: SCORE_SET})
    const {values, stop} = recordProgress(downloads.fileDownloadProgress)

    const pending = downloads.streamVariantAnnotations('study-result', 'Functional Study Result')
    expect(downloads.fileDownloadLabel.value).toBe('Functional Study Result')
    await pending
    stop()

    // One record then both, then released.
    expect(values).toEqual([50, 100, null])
  })

  it('refuses to save a truncated download', async () => {
    // The bar stalling partway is the visible symptom of the server generator raising mid-stream: the 200
    // and its headers are long gone, so a short body is all the client ever sees. Saving it would hand
    // the user a silently incomplete file.
    mockStream(['{"a":1}\n'], '5')
    const downloads = useScoreSetDownloads({scoreSet: SCORE_SET})

    await expect(downloads.streamVariantAnnotations('functional-statement')).rejects.toThrow('received 1 of 5 records')
    expect(downloads.fileDownloadInProgress.value).toBe(false)
  })

  it('tallies variants the server could not annotate, so a caller can report them', async () => {
    const errorRecord = '{"variant_urn":"urn:1","annotation":null,"error":{"type":"ValueError","detail":"bad"}}\n'
    mockStream([errorRecord, '{"variant_urn":"urn:2","annotation":{"type":"Stub"}}\n'], '2')
    const downloads = useScoreSetDownloads({scoreSet: SCORE_SET})

    expect(await downloads.streamVariantAnnotations('study-result')).toEqual({received: 2, errored: 1})
  })

  it('saves a stream containing error records, since the file is complete', async () => {
    // A variant the server could not annotate is reported in-band. The download is not a failure.
    const errorRecord = '{"variant_urn":"urn:1","annotation":null,"error":{"type":"KeyError","detail":"score"}}\n'
    mockStream([errorRecord], '1')
    const downloads = useScoreSetDownloads({scoreSet: SCORE_SET})

    await expect(downloads.streamVariantAnnotations('study-result')).resolves.toEqual({received: 1, errored: 1})
  })

  it('counts an error record split across chunks exactly once', async () => {
    // Records are scanned per chunk, so a boundary landing mid-record must not lose or double it.
    mockStream(['{"variant_urn":"urn:1","annotation":null,"err', 'or":{"type":"KeyError","detail":"s"}}\n'], '1')
    const downloads = useScoreSetDownloads({scoreSet: SCORE_SET})

    expect(await downloads.streamVariantAnnotations('study-result')).toEqual({received: 1, errored: 1})
  })

  it('does not mistake an "error" nested inside an annotation for a failed record', async () => {
    // The substring test is only a prefilter; the record is parsed to confirm the key is its own.
    mockStream(['{"variant_urn":"urn:1","annotation":{"notes":"see \\"error\\" handling"}}\n'], '1')
    const downloads = useScoreSetDownloads({scoreSet: SCORE_SET})

    expect(await downloads.streamVariantAnnotations('study-result')).toEqual({received: 1, errored: 0})
  })

  it('is not skewed by a multi-byte character', async () => {
    // The body is still retained as bytes — only one chunk at a time is decoded, to scan its lines.
    mockStream(['{"p":"p.Trp26€"}\n', '{"p":"p.Met1?"}\n'], '2')
    const downloads = useScoreSetDownloads({scoreSet: SCORE_SET})
    const {values, stop} = recordProgress(downloads.fileDownloadProgress)

    await downloads.streamVariantAnnotations('study-result')
    stop()

    expect(values).toEqual([50, 100, null])
  })

  it('does not overshoot 100% across chunk boundaries', async () => {
    // `split('\n').length` counted one extra per chunk, so a record split across chunks was double
    // counted and the old bar sailed past 100%.
    mockStream(['{"a":1}\n{"a":', '2}\n{"a":3}\n{"a":4}\n'], '4')
    const downloads = useScoreSetDownloads({scoreSet: SCORE_SET})
    const {values, stop} = recordProgress(downloads.fileDownloadProgress)

    await downloads.streamVariantAnnotations('study-result')
    stop()

    expect(Math.max(...values.map((value) => value ?? 0))).toBe(100)
  })

  it('stays indeterminate when the total count header is absent', async () => {
    // Previously this divided by zero and set the bar to Infinity.
    mockStream(['{"a":1}\n'], null)
    const downloads = useScoreSetDownloads({scoreSet: SCORE_SET})
    const {values, stop} = recordProgress(downloads.fileDownloadProgress)

    await downloads.streamVariantAnnotations('study-result')
    stop()

    expect(values.every((value) => value === null)).toBe(true)
  })

  it('blocks a CSV download while a stream is running, since they share one indicator', async () => {
    let releaseRead: () => void = () => {}
    const encoder = new TextEncoder()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: {get: () => '1'},
        body: {
          getReader: () => ({
            read: () =>
              new Promise((resolve) => {
                releaseRead = () => resolve({done: false, value: encoder.encode('{"a":1}\n')})
              })
          })
        }
      })
    )
    const {streamVariantAnnotations, downloadFile, fileDownloadLabel} = useScoreSetDownloads({scoreSet: SCORE_SET})

    void streamVariantAnnotations('study-result', 'Functional Study Result')
    await Promise.resolve()
    await Promise.resolve()
    await downloadFile('scores')

    expect(fileDownloadLabel.value).toBe('Functional Study Result')
    expect(downloadScoreSetFile).not.toHaveBeenCalled()
    releaseRead()
  })
})
