import { HistogramShader } from "@/lib/histogram"

export const NORMAL_RANGE_DEFAULT_COLOR = "#4444ff"
export const ABNORMAL_RANGE_DEFAULT_COLOR = "#ff4444"

export interface ScoreSetRanges {
    wtScore: number
    ranges: Array<ScoreSetRange>
}

export interface ScoreSetRange {
    label: string,
    description: string | undefined,
    classification: "normal" | "abnormal"
    range: Array<number>
}

export function prepareRangesForHistogram(scoreRanges: ScoreSetRanges): HistogramShader[] {
    const preparedRanges: HistogramShader[] = []

    scoreRanges.ranges.forEach((range) => {
        const rangeIsNormal = range.classification === "normal" ? true : false

        const scoreRange: HistogramShader = {
            min: range.range[0],
            max: range.range[1],
            title: range.label,
            color: rangeIsNormal ? NORMAL_RANGE_DEFAULT_COLOR : ABNORMAL_RANGE_DEFAULT_COLOR,
            thresholdColor: rangeIsNormal ? NORMAL_RANGE_DEFAULT_COLOR : ABNORMAL_RANGE_DEFAULT_COLOR,
            startOpacity: 0.15,
            stopOpacity: 0.05,
            gradientUUID: undefined
        }

        preparedRanges.push(scoreRange)
    })

    return preparedRanges
}
