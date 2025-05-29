import { HistogramShader } from "@/lib/histogram"

export const NORMAL_RANGE_DEFAULT_COLOR = "#4444ff"
export const ABNORMAL_RANGE_DEFAULT_COLOR = "#ff4444"
export const NOT_SPECIFIED_RANGE_DEFAULT_COLOR = "#a6a600"

export const INDETERMINATE_RANGE_EVIDENCE = ["INDETERMINATE"]
export const NORMAL_RANGE_EVIDENCE = ["BS3_STRONG", "BS3_MODERATE", "BS3_SUPPORTING"]
export const ABNORMAL_RANGE_EVIDENCE = ["PS3_VERY_STRONG", "PS3_STRONG", "PS3_MODERATE", "PS3_SUPPORTING"]
export const EVIDENCE_STRENGTHS = {
    "BS3_STRONG": 3,
    "BS3_MODERATE": 2,
    "BS3_SUPPORTING": 1,
    "INDETERMINATE": 0,
    "PS3_VERY_STRONG": 4,
    "PS3_STRONG": -3,
    "PS3_MODERATE": -2,
    "PS3_SUPPORTING": -1
}

export interface ScoreSetRanges {
    wtScore: number
    ranges: Array<ScoreSetRange>
}

export interface ScoreSetRange {
    label: string,
    description: string | undefined,
    classification: "normal" | "abnormal" | "not_specified",
    range: Array<number>
}

export function prepareRangesForHistogram(scoreRanges: ScoreSetRanges): HistogramShader[] {
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


function getRangeColor(range: ScoreSetRange): string {
    console.log(range.classification)
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
