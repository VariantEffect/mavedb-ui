import { HistogramShader } from "@/lib/histogram"

export const NORMAL_RANGE_DEFAULT_COLOR = "#4444ff"
export const ABNORMAL_RANGE_DEFAULT_COLOR = "#ff4444"
export const NOT_SPECIFIED_RANGE_DEFAULT_COLOR = "#a6a600"

export const INDETERMINATE_RANGE_EVIDENCE = ["INDETERMINATE"] as const
export const NORMAL_RANGE_EVIDENCE = ["BS3_STRONG", "BS3_MODERATE", "BS3_SUPPORTING"] as const
export const ABNORMAL_RANGE_EVIDENCE = ["PS3_VERY_STRONG", "PS3_STRONG", "PS3_MODERATE", "PS3_SUPPORTING"] as const
export const EVIDENCE_STRENGTHS = {
    "BS3_STRONG": 4,
    "BS3_MODERATE": 2,
    "BS3_MODERATE+": 3,
    "BS3_SUPPORTING": 1,
    "BS3_VERY_STRONG": 8,
    "INDETERMINATE": 0,
    "PS3_VERY_STRONG": -8,
    "PS3_STRONG": -4,
    "PS3_MODERATE+": -3,
    "PS3_MODERATE": -2,
    "PS3_SUPPORTING": -1
}
export const EVIDENCE_STRENGTHS_REVERSED = Object.fromEntries(
    Object.entries(EVIDENCE_STRENGTHS).map(([key, value]) => [value, key])
)

export interface pillarProjectParameters {
    skew: number
    scale: number
    location: number
}

export interface pillarProjectParameterSet {
    functionallyAltering: pillarProjectParameters
    functionallyNormal: pillarProjectParameters
    fractionFunctionallyAltering: number
}

// There may be other keys defined in the future. They should still be added here explicitly,
// but we allow their implicit possibility as well.
export interface ScoreSetRanges {
    investigatorProvided: ScoreRanges
    pillarProject: ScoreRanges
    [key: string]: ScoreRanges
}

export interface ScoreRanges {
    baselineScore?: number
    baselineScoreDescription?: string | undefined
    oddsPathSource?: [{ identifier: string, dbName: string }] | undefined

    priorProbabilityPathogenicity?: number | undefined
    parameterSets?: Array<pillarProjectParameterSet>,

    ranges: Array<ScoreRange>
    source?: [{ identifier: string, dbName: string }] | undefined
}

export interface ScoreRange {
    label: string,
    description: string | undefined,
    classification: "normal" | "abnormal" | "not_specified",
    range: Array<number>
    oddsPath?: {
        ratio: number,
        evidence: typeof INDETERMINATE_RANGE_EVIDENCE[number] | typeof NORMAL_RANGE_EVIDENCE[number] | typeof ABNORMAL_RANGE_EVIDENCE[number] | undefined
    } | undefined
    positiveLikelihoodRatio?: number | undefined
    evidenceStrength?: number | undefined
    inclusiveLowerBound: boolean
    inclusiveUpperBound: boolean
}

export function prepareRangesForHistogram(scoreRanges: ScoreRanges): HistogramShader[] {
    const preparedRanges: HistogramShader[] = []

    scoreRanges.ranges.forEach((range) => {
        const scoreRange: HistogramShader = {
            min: range.range[0],
            max: range.range[1],
            title: range.label,
            align: "center",
            color: getRangeColor(range),
            thresholdColor: getRangeColor(range),
            startOpacity: 0.15,
            stopOpacity: 0.05,
            gradientUUID: undefined
        }

        preparedRanges.push(scoreRange)
    })
    return preparedRanges
}


function getRangeColor(range: ScoreRange): string {
    if (range.classification === "normal") {
        return NORMAL_RANGE_DEFAULT_COLOR
    } else if (range.classification === "abnormal") {
        return ABNORMAL_RANGE_DEFAULT_COLOR
    } else if (range.classification === "not_specified") {
        return NOT_SPECIFIED_RANGE_DEFAULT_COLOR
    } else {
        return "#000000"
    }
}
