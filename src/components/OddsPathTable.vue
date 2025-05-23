<template>
    <div v-if="scoreSet.scoreRanges.oddsPath">
        <table class="mave-odds-path-table">
            <tr>
                <th>Odds Path Abnormal<sup>*</sup></th>
                <th>Odds Path Normal<sup>*</sup></th>
            </tr>
            <tr v-if="scoreSet.scoreRanges.oddsPath.ratios">
                <td>{{ scoreSet.scoreRanges.oddsPath.ratios.abnormal }}</td>
                <td>{{ scoreSet.scoreRanges.oddsPath.ratios.normal }}</td>
            </tr>
            <tr>
                <td :class="`mave-evidence-code-${scoreSet.scoreRanges.oddsPath.evidenceStrengths.abnormal}`">{{
                    scoreSet.scoreRanges.oddsPath.evidenceStrengths.abnormal }}</td>
                <td :class="`mave-evidence-code-${scoreSet.scoreRanges.oddsPath.evidenceStrengths.normal}`">{{
                    scoreSet.scoreRanges.oddsPath.evidenceStrengths.normal }}</td>
            </tr>
        </table>
        <div v-if="scoreSet.scoreRanges.oddsPath.source" style="font-style: italic; text-align: center; margin-bottom: 2em;"><sup>*</sup>
            Source: <a :href="scoreSet.scoreRanges.oddsPath.source" target="_blank">{{ scoreSet.scoreRanges.oddsPath.source }}</a></div>
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

table.mave-odds-path-table td.mave-evidence-code-PS3_STRONG {
    background-color: #b02418;
    color: white;
    font-weight: bold;
}

table.mave-odds-path-table td.mave-evidence-code-BS3_STRONG {
    background-color: #385492;
    color: white;
    font-weight: bold;
}
</style>
