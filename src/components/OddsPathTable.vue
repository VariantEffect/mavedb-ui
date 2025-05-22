<template>
    <table v-if="evidenceStrengths" class="mave-odds-path-table">
        <tr>
            <th>Odds Path Abnormal<sup>*</sup></th>
            <th>Odds Path Normal<sup>*</sup></th>
        </tr>
        <tr v-if="evidenceStrengths.oddsOfPathogenicity">
            <td>{{ evidenceStrengths.oddsOfPathogenicity.abnormal }}</td>
            <td>{{ evidenceStrengths.oddsOfPathogenicity.normal }}</td>
        </tr>
        <tr>
            <td :class="`mave-evidence-code-${evidenceStrengths.evidenceCodes.abnormal}`">{{
                evidenceStrengths.evidenceCodes.abnormal }}</td>
            <td :class="`mave-evidence-code-${evidenceStrengths.evidenceCodes.normal}`">{{
                evidenceStrengths.evidenceCodes.normal }}</td>
        </tr>
    </table>
    <div v-if="evidenceStrengths" style="font-style: italic; text-align: center; margin-bottom: 2em;"><sup>*</sup>
        Source: <a :href="evidenceStrengths.source" target="_blank">{{ evidenceStrengths.source }}</a></div>
    <div v-if="evidenceStrengths?.exampleVariant"
        style="font-style: italic; text-align: center; margin-top: -1.5em; margin-bottom: 2em;">
        <router-link :to="{ name: 'variantMeasurement', params: { urn: evidenceStrengths.exampleVariant.urn } }">Click
            here</router-link> for a preview of future clinical variant features.
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: "OddsPathTable",

    props: {
        scoreSet: {
            type: Object,
            required: true
        },
    },

    computed: {
        evidenceStrengths: function () {
            return {
                'urn:mavedb:00000050-a-1': {
                    oddsOfPathogenicity: {
                        abnormal: 24.9,
                        normal: 0.043
                    },
                    evidenceCodes: {
                        abnormal: 'PS3_Strong',
                        normal: 'BS3_Strong'
                    },
                    source: 'https://pubmed.ncbi.nlm.nih.gov/36550560/'
                },
                'urn:mavedb:00000097-0-1': {
                    oddsOfPathogenicity: {
                        abnormal: 52.4,
                        normal: 0.02
                    },
                    evidenceCodes: {
                        abnormal: 'PS3_Strong',
                        normal: 'BS3_Strong'
                    },
                    source: 'https://pubmed.ncbi.nlm.nih.gov/34793697/',
                    exampleVariant: {
                        urn: 'urn:mavedb:00000097-0-1#1697',
                        name: 'NM_007294.4(BRCA1):c.5237A>C (p.His1746Pro)'
                    }
                }
            }[this.scoreSet.urn] || null
        }
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

table.mave-odds-path-table td.mave-evidence-code-PS3_Strong {
    background-color: #b02418;
    color: white;
    font-weight: bold;
}

table.mave-odds-path-table td.mave-evidence-code-BS3_Strong {
    background-color: #385492;
    color: white;
    font-weight: bold;
}
</style>
