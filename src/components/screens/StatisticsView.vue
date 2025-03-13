<template>
    <DefaultLayout>
        <div v-if="loading"><PageLoading></PageLoading></div>
        <div v-else>
            <h1 style="font-size: 2em; color: #3f51b5;">MaveDB Site Statistics</h1>
            <div class="statistics-pane">
                <Card class="statistics-tile-full">
                    <template #content>
                        <Carousel :value="summaryCarouselOptions" :numVisible="3" :numScroll="1" circular :autoplayInterval="10000">
                            <template #item="slotProps">
                                <div class="border-1 surface-border border-round m-2  p-3">
                                        <div class="count-container">
                                            <h2 class="count-header">{{ slotProps.data.title }}</h2>
                                            <h1 class="emphasis-number">{{ new Intl.NumberFormat("en-US").format(slotProps.data.statistic) }}</h1>
                                            <p class="count-footer">{{ slotProps.data.footer }}</p>
                                        </div>
                                </div>
                            </template>"
                        </Carousel>
                    </template>
                </Card>
                <Card class="statistics-tile-full">
                    <template #content>
                        <div class="chart-header">
                            <div class="chart-header-item">
                                <h2 style="margin-top: 0; margin-bottom: 0;">Database Growth over Time</h2>
                            </div>
                            <div class="chart-header-item" style="margin-right: auto;">
                                <SelectButton v-model="selectedAggregationLevel" :options="aggregationLevels" optionLabel="label" optionValue="value" aria-labelledby="basic"/>
                            </div>
                        </div>
                        <div>
                            <TimeSeriesLineChart :data="timeSeriesData" :interpolateMissingDates="timeSeriesInterpolation" :level="selectedAggregationLevel"></TimeSeriesLineChart>
                        </div>
                    </template>
                </Card>
                <div class="statistics-tile-full">
                    <div class="flowchart-container">
                        <Card>
                            <template #content>
                                <div class="flowchart-card-element">
                                    <span style="text-align: center;">
                                        <h1 class="emphasis-number">{{ new Intl.NumberFormat("en-US").format(totalScoreSets) }}</h1>
                                        total score sets
                                        <h1 class="emphasis-number">{{ new Intl.NumberFormat("en-US").format(totalVariants) }}</h1>
                                        variant effect measurements
                                    </span>
                                </div>
                            </template>
                        </Card>
                        <div class="flowchart-arrow-element">
                            <i class="pi pi-arrow-right" style="font-size: 3rem"></i>
                        </div>
                        <Card>
                            <template #content>
                                <div class="flowchart-card-element">
                                    <span style="text-align: center;">
                                        <h1 class="emphasis-number">{{ new Intl.NumberFormat("en-US").format(totalHumanScoreSets) }}</h1>
                                        score sets with human targets
                                        <h1 class="emphasis-number">{{ new Intl.NumberFormat("en-US").format(totalMappedVariants) }}</h1>
                                        variant effect measurements mapped to the human genome
                                    </span>
                                </div>
                            </template>
                        </Card>
                        <div class="flowchart-arrow-element">
                            <i class="pi pi-arrow-right" style="font-size: 3rem"></i>
                        </div>
                        <Card>
                            <template #content>
                                <div class="flowchart-card-element">
                                    <span style="text-align: center;">
                                        These variant effect measurements map to
                                        <h1 class="emphasis-number">{{ new Intl.NumberFormat("en-US").format(totalMappedTargetGenes) }}</h1>
                                        distinct human genes
                                    </span>
                                </div>
                            </template>
                        </Card>
                    </div>
                </div>
                <Card class="statistics-tile-half">
                    <template #content>
                        <div>
                            <Chart type="doughnut" :data="organismChartData" :options="organismChartOptions"></Chart>
                        </div>
                    </template>
                </Card>
                <Card class="statistics-tile-half">
                    <template #content>
                        <div>
                            <Chart type="doughnut" :data="mappedTargetChartData" :options="mappedTargetChartOptions"></Chart>
                        </div>
                    </template>
                </Card>
            </div>
        </div>
    </DefaultLayout>
</template>

<script>
import config from '@/config'

import Carousel from 'primevue/carousel';
import Card from 'primevue/card';
import Chart from 'primevue/chart';
import DefaultLayout from '../layout/DefaultLayout.vue';
import SelectButton from 'primevue/selectbutton';
import PageLoading from '../common/PageLoading.vue';
import TimeSeriesLineChart from '../TimeSeriesLineChart.vue';

import useItem from '@/composition/item'

export default {
    data() {
        const aggregationLevels = [
            {label: 'Month', value: 'month'},
            {label: 'Year', value: 'year'}
        ]

        const targetGeneOrganismStatistic = useItem({ itemTypeName: 'target-gene-statistics' })
        targetGeneOrganismStatistic.setItemId('organism')
        return {
            config: config,

            loading: true,

            scoreSetsByMonth: [],
            experimentsByMonth: [],
            variantsByMonth: [],
            mappedTargetGeneCounts: {},

            margins: {
                top: 0,
                right: 20,
                bottom: 0,
                left: 75
            },

            aggregationLevels: aggregationLevels,
            selectedAggregationLevel: aggregationLevels[1].value,
            targetGeneOrganismFieldCounts: targetGeneOrganismStatistic.item,
        };
    },
    components: {Carousel, Card, Chart, DefaultLayout, SelectButton, PageLoading, TimeSeriesLineChart},
    async mounted() {
        this.fetchStatistics();
    },
    computed: {
        totalScoreSets() {
            return this.scoreSetsByMonth.reduce((acc, item) => acc + item.count, 0);
        },
        totalExperiments() {
            return this.experimentsByMonth.reduce((acc, item) => acc + item.count, 0);
        },
        totalVariants() {
            return this.variantsByMonth.reduce((acc, item) => acc + item.count, 0);
        },
        totalMappedVariants() {
            return this.mappedVariantsByMonth.reduce((acc, item) => acc + item.count, 0);
        },
        totalMappedTargetGenes() {
            return Object.keys(this.mappedTargetGeneCounts).length;
        },
        totalHumanScoreSets(){
            return this.targetGeneOrganismFieldCounts ? this.targetGeneOrganismFieldCounts["Homo sapiens"] : 0
        },
        summaryCarouselOptions(){
            return [
                {
                    statistic: this.totalExperiments,
                    title: "Experiments",
                    footer: "total published all time",
                },
                {
                    statistic: this.totalScoreSets,
                    title: "Score Sets",
                    footer: "total published all time",
                },
                {
                    statistic: this.totalVariants,
                    title: "Variant Effect Measurements",
                    footer: "total created all time",
                },
                {
                    statistic: this.totalMappedVariants,
                    title: "Mapped Variant Effect Measurements",
                    footer: "total created all time",
                }
            ]
        },
        monthlyMergedTimeSeriesData() {
            const scoreSets = this.scoreSetsByMonth;
            const variants = this.variantsByMonth;

            const allDates = new Set([...scoreSets.map(s => s.date.getTime()), ...variants.map(v => v.date.getTime())]);

            const merged = Array.from(allDates).map(time => {
                const scoreSet = scoreSets.find(s => s.date.getTime() === time);
                const variant = variants.find(v => v.date.getTime() === time);
                return {
                    x: new Date(scoreSet.date.getUTCFullYear(), scoreSet.date.getUTCMonth()),
                    y1: scoreSet ? scoreSet.count : 0,
                    y2: variant ? variant.count : 0
                };
            });
            return merged;
        },
        yearlyMergedTimeSriesData() {
            const merged = this.monthlyMergedTimeSeriesData.reduce((acc, item) => {
                const year = item.x.getUTCFullYear();
                if (!acc[year]) {
                    acc[year] = {x: new Date(year, 0), y1: 0, y2: 0};
                }
                acc[year].y1 += item.y1;
                acc[year].y2 += item.y2;
                return acc;
            }, {});

            return Object.values(merged);
        },
        timeSeriesData() {
            return this.selectedAggregationLevel === 'month' ? this.monthlyMergedTimeSeriesData : this.yearlyMergedTimeSriesData;
        },
        timeSeriesInterpolation() {
            return this.selectedAggregationLevel === 'month';
        },
        organismChartData: function() {
            return this.targetGeneOrganismFieldCounts ? this.statisticsDictToChartData(this.targetGeneOrganismFieldCounts) : null
        },
        organismChartOptions: function() {
            return this.organismChartData ? this.setChartOptions('Target Organism', this.organismChartData, 'target-organism-name') : null
        },
        mappedTargetChartData: function() {
            return this.mappedTargetGeneCounts ? this.statisticsDictToChartData(this.mappedTargetGeneCounts) : null
        },
        mappedTargetChartOptions: function() {
            return this.mappedTargetChartData ? this.setChartOptions('Mapped Target Genes', this.mappedTargetChartData, 'target-name') : null
        },
    },
    methods: {
        async fetchStatistics() {
            this.loading = true;

            try {
                const scoreSetsResponse = await fetch(`${config.apiBaseUrl}/statistics/record/score-set/published/count?group=month`);
                const scoreSetsData = await scoreSetsResponse.json();
                this.scoreSetsByMonth = Object.keys(scoreSetsData).map(date => {
                    const parsedDate = new Date(date);
                    return {date: new Date(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth()), count: scoreSetsData[date]}
                });

                const experimentsResponse = await fetch(`${config.apiBaseUrl}/statistics/record/experiment/published/count?group=month`);
                const experimentsData = await experimentsResponse.json();
                this.experimentsByMonth = Object.keys(experimentsData).map(date => {
                    const parsedDate = new Date(date);
                    return {date: new Date(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth()), count: experimentsData[date]}
                });

                const variantsResponse = await fetch(`${config.apiBaseUrl}/statistics/variant/count?group=month`);
                const variantsData = await variantsResponse.json();
                this.variantsByMonth = Object.keys(variantsData).map(date => {
                    const parsedDate = new Date(date);
                    return {date: new Date(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth()), count: variantsData[date]}
                });

                const mappedVariantsResponse = await fetch(`${config.apiBaseUrl}/statistics/mapped-variant/count?group=month`);
                const mappedVariantsData = await mappedVariantsResponse.json();
                this.mappedVariantsByMonth = Object.keys(mappedVariantsData).map(date => {
                    const parsedDate = new Date(date);
                    return {date: new Date(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth()), count: mappedVariantsData[date]}
                });

                const mappedTargetGeneResponse = await fetch(`${config.apiBaseUrl}/statistics/target/mapped/gene`);
                const mappedTargetGeneData = await mappedTargetGeneResponse.json();
                this.mappedTargetGeneCounts = mappedTargetGeneData;
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                this.loading = false;
            }
        },

        statisticsDictToChartData: function (stats) {
            const numToShow = 18

            let entries = Object.entries(stats)

            // Sort in descending order.
            entries.sort((a,b) => b[1] - a[1])
            console.log(entries)

            // Bundle up smaller categories into an 'Others' category.
            const top = entries.slice(0, numToShow)
            const others = entries.slice(numToShow)
            if (others.length) {
                top.push(['Others', others.reduce((a,b) => a + b[1], 0)])
            }

            return {
                labels: top.map((e) => e[0]),
                datasets: [
                {
                    data: top.map((e) => e[1]),
                    // Colors for pie charts; Colors palette from https://sashamaps.net/docs/resources/20-colors/.
                    backgroundColor: ['#3f51b5', '#e6194b', '#3cb44b', '#ffe119', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#f58231', '#911eb4', '#4363d8', '#46f0f0', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#808080', '#ffffff', '#000000']
                }
                ]
            }
        },

        setChartOptions: function (title, data, model) {
            const searchOnClick = (event, element) => {
                if (!model) {
                    model = 'search'
                }

                if (element.text == 'Others') {
                    return
                }

                window.open(`${config.appBaseUrl}/#/search?${model}=${element.text}`)
            }

            return {
                onClick: searchOnClick,
                plugins: {
                    legend: {
                        display: true,
                        position: 'right',
                        onClick: searchOnClick,
                        width: 'max-content',
                    },
                    title: {
                        display: true,
                        text: title,
                        position: 'top',
                        align: 'start',
                    },
                }
            }
        },
    }
};
</script>

<style scoped>
h1 {
    font-size: 2em;
    margin-bottom: 0.5em;
}

.statistics-pane {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 1em;
}

.statistics-tile-full {
    flex: 1 1 auto;
    grid-column: 1 / -1;
}

.statistics-tile-2-2 {
    flex: 1 1 auto;
    grid-row-end: span 2;
}

.statistics-tile:deep(.p-card-content) {
    padding: 0;
}

.chart-header {
    display: flex;
}

.chart-header-item {
    flex: 1 1 100%;
    margin-left: auto;
    margin-right: auto;
}

.flowchart-container {
    display: grid;
    grid-template-columns: 4fr 1fr 4fr 1fr 4fr;
    grid-template-rows: 1fr;
}

.flowchart-arrow-element {
    justify-self: center;
    align-self: center;
    margin: 1em;
}

.flowchart-card-element {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    margin: 1em;
    height: 300px;
    justify-self: stretch;
    align-self: stretch;
}

.emphasis-number {
  font-size: 3.5em;
  color: #3f51b5;
  margin: 0;
  text-align: center;
}

.count-container {
    height: 300px;
    margin: 1em;
}
</style>
