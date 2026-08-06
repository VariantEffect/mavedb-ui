import axios from 'axios'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {getAlleleByGnomad} from './alleles'

vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  },
  isAxiosError: (error: unknown) => Boolean((error as {isAxiosError?: boolean})?.isAxiosError)
}))

const mockedAxiosGet = vi.mocked(axios.get)

/** A ClinGen allele, trimmed to the fields these tests care about. */
const ALLELE = {'@id': 'http://reg.genome.network/allele/CA412761507'}

/** The registry rejects a position whose reference allele doesn't match the assembly with a 400. */
function referenceMismatch() {
  return {
    isAxiosError: true,
    response: {status: 400, data: {errorType: 'IncorrectReferenceAllele'}}
  }
}

/** The HGVS strings axios was asked to resolve, in order. */
function queriedHgvs() {
  return mockedAxiosGet.mock.calls.map((call) => call[1]?.params?.hgvs)
}

describe('getAlleleByGnomad', () => {
  beforeEach(() => {
    mockedAxiosGet.mockReset()
  })

  it('resolves a GRCh38 ID without trying GRCh37', async () => {
    mockedAxiosGet.mockResolvedValueOnce({data: ALLELE} as never)

    expect(await getAlleleByGnomad('X-41334274-A-C')).toEqual({allele: ALLELE, assembly: 'grch38'})
    expect(queriedHgvs()).toEqual(['NC_000023.11:g.41334274A>C'])
  })

  it('falls back to the GRCh37 accession when the reference allele does not match GRCh38', async () => {
    mockedAxiosGet.mockRejectedValueOnce(referenceMismatch()).mockResolvedValueOnce({data: ALLELE} as never)

    expect(await getAlleleByGnomad('17-7579472-G-C')).toEqual({allele: ALLELE, assembly: 'grch37'})
    expect(queriedHgvs()).toEqual(['NC_000017.11:g.7579472G>C', 'NC_000017.10:g.7579472G>C'])
  })

  it('propagates a server error instead of masking it as a wrong-assembly retry', async () => {
    const outage = {isAxiosError: true, response: {status: 503, data: {}}}
    mockedAxiosGet.mockRejectedValueOnce(outage)

    await expect(getAlleleByGnomad('X-41334274-A-C')).rejects.toBe(outage)
    expect(mockedAxiosGet).toHaveBeenCalledTimes(1)
  })

  it('propagates a network failure, which carries no response', async () => {
    const offline = {isAxiosError: true, message: 'Network Error'}
    mockedAxiosGet.mockRejectedValueOnce(offline)

    await expect(getAlleleByGnomad('X-41334274-A-C')).rejects.toBe(offline)
    expect(mockedAxiosGet).toHaveBeenCalledTimes(1)
  })

  it('surfaces the GRCh37 failure when neither assembly resolves', async () => {
    const mismatch = referenceMismatch()
    mockedAxiosGet.mockRejectedValueOnce(referenceMismatch()).mockRejectedValueOnce(mismatch)

    await expect(getAlleleByGnomad('17-7579472-G-C')).rejects.toBe(mismatch)
    expect(mockedAxiosGet).toHaveBeenCalledTimes(2)
  })

  it('reads only the requested assembly when one is forced, without falling back', async () => {
    mockedAxiosGet.mockResolvedValueOnce({data: ALLELE} as never)

    expect(await getAlleleByGnomad('17-7676154-G-C', 'grch37')).toEqual({allele: ALLELE, assembly: 'grch37'})
    expect(queriedHgvs()).toEqual(['NC_000017.10:g.7676154G>C'])
  })

  it('surfaces the failure of a forced assembly rather than trying the other one', async () => {
    const mismatch = referenceMismatch()
    mockedAxiosGet.mockRejectedValueOnce(mismatch)

    await expect(getAlleleByGnomad('17-7676154-G-C', 'grch37')).rejects.toBe(mismatch)
    expect(mockedAxiosGet).toHaveBeenCalledTimes(1)
  })

  it('rejects an ID it cannot translate without calling the registry', async () => {
    // Passes gnomadIdRegex, but the alleles describe no change.
    await expect(getAlleleByGnomad('1-11796321-A-A')).rejects.toThrow('Not a valid gnomAD variant ID')
    expect(mockedAxiosGet).not.toHaveBeenCalled()
  })
})
