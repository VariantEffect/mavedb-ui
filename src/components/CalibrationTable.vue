<template>
    <table v-if="evidenceStrengthsForDisplay" class="mave-calibrations-table">
        <tr>
            <th>Evidence Strength</th>
            <th v-for="evidenceStrength of evidenceStrengthsForDisplay" :key="evidenceStrength"><b>{{ evidenceStrength }}</b></th>
        </tr>
        <tr>
            <td>Likelihood Ratio+</td>
            <td v-for="likelihoodRatio of positiveLikelihoodRatiosForDisplay" :key="likelihoodRatio">{{ likelihoodRatio }}</td>
        </tr>
        <tr>
            <td>Score Threshold</td>
            <td v-for="threshold of thresholdsForDisplay" :key="threshold">{{ threshold }}</td>
        </tr>
    </table>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import { Calibrations } from '@/lib/calibrations';

export default defineComponent({
    name: 'CalibrationTable',
    components: { },

    props: {
        calibrations: {
            type: Object as () => {[key: string]: Calibrations},
            required: true
        },

        selectedCalibration: {
            type: String,
            required: true
        }
    },

    computed: {
        selectedCalibrations: function () {
            return this.calibrations[this.selectedCalibration]
        },

        evidenceStrengthsForDisplay: function() {
            return this.selectedCalibrations.evidenceStrengths
        },

        positiveLikelihoodRatiosForDisplay: function() {
            return this.selectedCalibrations.positiveLikelihoodRatios
        },

        thresholdsForDisplay: function() {
            return this.selectedCalibrations.thresholds
        },
    },

    methods: {
        titleCase(s: string) {
            return s.replace (/^[-_]*(.)/, (_, c) => c.toUpperCase())       // Initial char (after -/_)
                    .replace (/[-_]+(.)/g, (_, c) => ' ' + c.toUpperCase()) // First char after each -/_
        }
    }
})
</script>

<style>
table.mave-calibrations-table {
   border-collapse: collapse;
   margin: 1em auto 0.5em auto;
}

table.mave-calibrations-table td,
table.mave-calibrations-table th {
   border: 1px solid gray;
   padding: 0.5em 1em;
   text-align: center;
}
</style>
