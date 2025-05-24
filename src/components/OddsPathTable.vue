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
        <div v-if="oddsPathSource" style="font-style: italic; text-align: center; margin-bottom: 2em;"><sup>*</sup>
            Source: <a :href="oddsPathSource.url" target="_blank">{{ oddsPathSource.url }}</a></div>
    </div>
</template>

<script lang="ts">
import config from '@/config';
import { defineComponent } from 'vue';

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
            if (!this.scoreSet?.scoreRanges?.oddsPath?.source) {
                return null
            }

            const oddsPathSource = this.scoreSet.scoreRanges.oddsPath.source[0];
            return this.scoreSet.primaryPublicationIdentifiers.concat(this.scoreSet.secondaryPublicationIdentifiers).find((source) => {
                return source.dbName === oddsPathSource.dbName && source.identifier === oddsPathSource.identifier
            }) || null;
        }
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
