<template>
    <div v-if="oddsPathExists">
        <table class="mave-odds-path-table">
            <tr>
                <th :colspan="abnormalRanges.length">Odds Path Abnormal<sup>*</sup></th>
                <th :colspan="normalRanges.length">Odds Path Normal<sup>*</sup></th>
            </tr>
            <tr>
                <td v-for="range in abnormalRanges.concat(normalRanges)" :key="range.label">
                    <span>{{ range.label }}</span>
                </td>
            </tr>
            <tr>
                <td v-for="range in abnormalRanges.concat(normalRanges)" :key="range.label">
                    <span v-if="range.oddsPath?.ratio">{{ range.oddsPath.ratio }}</span>
                    <span v-else>Not Provided</span>
                </td>
            </tr>
            <tr>
                <td v-for="range in abnormalRanges.concat(normalRanges)" :class="`mave-evidence-code-${range.oddsPath?.evidence}`" :key="range.label">
                    <span v-if="range.oddsPath?.evidence">{{ range.oddsPath.evidence }}</span>
                    <span v-else>Not Provided</span>
                </td>
            </tr>
        </table>
        <div v-if="oddsPathSource" style="font-style: italic; text-align: center; margin-bottom: 2em;"><sup>*</sup>
            Source: <a :href="oddsPathSource.url" target="_blank">{{ oddsPathSource.url }}</a></div>
    </div>
</template>

<script lang="ts">
import config from '@/config';
import { defineComponent } from 'vue';
import { EVIDENCE_STRENGTHS, ScoreSetRange } from '@/lib/ranges';

export default defineComponent({
    name: "OddsPathTable",

    props: {
        scoreSet: {
            type: Object,
            required: true
        },
    },

    setup() {
        return {
            config: config,
        }
    },

    computed: {
        // When creating OddsPaths, the source is selected from the list of primary and secondary publications, so its presence in the score set's publication
        // list should be guaranteed. To avoid an extra request, just look for the publication in the list of a score sets primary and secondary publications.
        oddsPathSource() {
            if (!this.scoreSet?.scoreRanges?.oddsPathSource) {
                return null
            }

            const oddsPathSource = this.scoreSet.scoreRanges.oddsPathSource[0];
            return this.scoreSet.primaryPublicationIdentifiers.concat(this.scoreSet.secondaryPublicationIdentifiers).find((source) => {
                return source.dbName === oddsPathSource.dbName && source.identifier === oddsPathSource.identifier
            }) || null;
        },

        oddsPathExists() {
            const ranges: ScoreSetRange[] = this.scoreSet?.scoreRanges?.ranges || [];
            return ranges.some(range => {
                return range.oddsPath;
            });
        },

        normalRanges() {
            const ranges: ScoreSetRange[] = this.scoreSet?.scoreRanges?.ranges || [];
            return ranges.filter(range => {
                return range.classification === 'normal';
            }).sort((a, b) => this.sortScoreRangeByEvidence(a, b));;
        },


        abnormalRanges() {
            const ranges: ScoreSetRange[] = this.scoreSet?.scoreRanges?.ranges || [];
            return ranges.filter(range => {
                return range.classification === 'abnormal';
            }).sort((a, b) => this.sortScoreRangeByEvidence(b, a));;
        },
    },

    methods: {
        sortScoreRangeByEvidence(a: ScoreSetRange, b: ScoreSetRange): number {
            if (a.oddsPath?.evidence && b.oddsPath?.evidence) {
                return EVIDENCE_STRENGTHS[a.oddsPath.evidence] - EVIDENCE_STRENGTHS[b.oddsPath.evidence];
            } else if (a.oddsPath?.evidence) {
                return -1; // a has evidence, b does not
            } else if (b.oddsPath?.evidence) {
                return 1; // b has evidence, a does not
            }
            return 0;
        },
    }
})
</script>

<style>
/* Evidence strength */

table.mave-odds-path-table {
    border-collapse: collapse;
    margin: 1em auto 0.5em auto;
}

table.mave-odds-path-table td,
table.mave-odds-path-table th {
    border: 1px solid gray;
    padding: 0.5em 1em;
    text-align: center;
}

table.mave-odds-path-table td.mave-evidence-code-PS3_VERY_STRONG {
    background-color: #7b1910;
    color: white;
    font-weight: bold;
}

table.mave-odds-path-table td.mave-evidence-code-PS3_STRONG {
    background-color: #b02418;
    color: white;
    font-weight: bold;
}

table.mave-odds-path-table td.mave-evidence-code-PS3_MODERATE {
    background-color: #cf7b74;
    color: white;
    font-weight: bold;
}


table.mave-odds-path-table td.mave-evidence-code-PS3_SUPPORTING {
    background-color: #e7bdb9;
    color: white;
    font-weight: bold;
}

table.mave-odds-path-table td.mave-evidence-code-BS3_STRONG {
    background-color: #385492;
    color: white;
    font-weight: bold;
}

table.mave-odds-path-table td.mave-evidence-code-BS3_MODERATE {
    background-color: #7387b2
    ;
    color: white;
    font-weight: bold;
}

table.mave-odds-path-table td.mave-evidence-code-BS3_SUPPORTING {
    background-color: #c3cbde;
    color: white;
    font-weight: bold;
}


table.mave-odds-path-table td.mave-evidence-code-BS3_INDETERMINATE {
    background-color: #d9cb00;
    color: white;
    font-weight: bold;
}

table.mave-odds-path-table td.mave-evidence-code-undefined {
    background-color: #7b7b7b;
    color: white;
    font-weight: bold;
}
</style>
