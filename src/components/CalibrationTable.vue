<template>
    <table v-if="evidenceStrengthsForDisplay" class="mave-calibrations-table">
        <tr>
            <td colspan="100" class="dropdown" >
                <Dropdown v-model="activeCalibrationKey" :options="Object.keys(calibrations)" :optionLabel="titleCase" style="width: 100%;" :disabled="Object.keys(calibrations).length < 2" />
            </td>
        </tr>
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
import Dropdown from 'primevue/dropdown';

export default defineComponent({
    name: 'CalibrationTable',
    components: { Dropdown },

    data: function() {
        const defaultCalibration = Object.keys(this.calibrations)[0]
        this.$emit('calibrationSelected', defaultCalibration)

        return {
            activeCalibrationKey: defaultCalibration
        }
    },

    emits: ['calibrationSelected'],

    props: {
        calibrations: {
            type: Object as () => {[key: string]: Calibrations},
            required: true
        },
    },

    computed: {
        selectedCalibrations: function () {
            return this.calibrations[this.activeCalibrationKey]
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
    },

    watch: {
        activeCalibrationKey: {
            handler: function() {
                this.$emit('calibrationSelected', this.activeCalibrationKey)
            }
        }
    }
})
</script>

<style>
table.mave-calibrations-table {
   border-collapse: collapse;
   margin: 1em auto 0.5em auto;
}

table.mave-calibrations-table .dropdown {
    border-top-style: hidden;
    border-left-style: hidden;
    border-right-style: hidden;
}

table.mave-calibrations-table td,
table.mave-calibrations-table th {
   border: 1px solid gray;
   padding: 0.5em 1em;
   text-align: center;
}
</style>
