import { HistogramShader } from "@/lib/histogram"

export const POSITIVE_EVIDENCE_STRENGTH_COLOR_SHADES = "#ff4444"
export const NEGATIVE_EVIDENCE_STRENGTH_COLOR_SHADES = "#4444ff"

export interface Calibrations {
    thresholds: number[]
    positiveLikelihoodRatios: number[]
    evidenceStrengths: number[]
}

export function prepareThresholdsForHistogram(calibrations: Calibrations): HistogramShader[] {
    const thresholdRanges: HistogramShader[] = []

    const thresholdCardinality = inferCardinalityOfThresholds(calibrations)

    calibrations.thresholds.forEach((threshold, idx) => {
        const evidenceStrengthAtIndex = calibrations.evidenceStrengths[idx]
        const evidenceStrengthIsPositive = evidenceStrengthAtIndex > 0
        const thresholdColor = evidenceStrengthIsPositive ? POSITIVE_EVIDENCE_STRENGTH_COLOR_SHADES : NEGATIVE_EVIDENCE_STRENGTH_COLOR_SHADES

        const thresholdRange: HistogramShader = {
            min: null,
            max: null,

            color: thresholdColor,
            thresholdColor: thresholdColor,
            title: calibrations.evidenceStrengths[idx].toString(),
            align: null,

            startOpacity: 0.15,
            stopOpacity: 0.05,

            gradientUUID: undefined,
        }

        // The first and last threshold have no min or max. Depending on their cardinality, the threshold itself is the other
        // value.
        if (idx === 0 || idx === calibrations.thresholds.length - 1) {
            thresholdCardinality[idx] > 0 ? thresholdRange.min = threshold : thresholdRange.max = threshold
            thresholdCardinality[idx] > 0 ? thresholdRange.align = "left" : thresholdRange.align = "right"
        }
        // If the threshold cardinality is positive, the threshold maximum will be the next threshold. The opposite is true
        // for thresholds with negative cardinality.
        else {
            if (thresholdCardinality[idx] > 0) {
                thresholdRange.min = threshold
                thresholdRange.max = calibrations.thresholds[idx+1]
                thresholdRange.align = "left"
            } else {
                thresholdRange.min = calibrations.thresholds[idx-1]
                thresholdRange.max = threshold
                thresholdRange.align = "right"
            }
        }

        thresholdRanges.push(thresholdRange)
    })

    return thresholdRanges
}


// Infer the cardinality of a given threshold.
// Assumptions:
//     - The thresholds are ordered in either ascending or descending fashion
//     - The evidence strengths are ordered in either ascending or descending fashion
//     - All positive evidence strengths have the same cardinality (the same applies for negative evidence strengths)
function inferCardinalityOfThresholds(calibrations: Calibrations): number[] {

    // If the first threshold is larger, that implies its initial cardinality is positive.
    const initialCardinality = calibrations.thresholds[0] > calibrations.thresholds[-1] ? 1 : -1

    const thresholdCardinality = [initialCardinality]

    let lastCardinality = initialCardinality
    for (let i = 1; i < calibrations.thresholds.length; i++) {
        const evidenceStrengthFlipped = calibrations.evidenceStrengths[i-1] * calibrations.evidenceStrengths[i] < 0 ? true : false

        // If the sign of the evidence strength flipped, flip the cardinality of the threhsold. Otherwise, the
        // cardinality will be the same as the prior threshold.
        if (evidenceStrengthFlipped) {
            thresholdCardinality.push(lastCardinality * -1)
        } else {
            thresholdCardinality.push(lastCardinality)
        }

        lastCardinality = thresholdCardinality[thresholdCardinality.length - 1]
    }

    return thresholdCardinality
}
