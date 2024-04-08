<template>
    <div style="height: 100vh;">
        <ProgressSpinner  class="mave-page-loading" />
    </div>
</template>

<script>
import ProgressSpinner from 'primevue/progressspinner'

export default {
    name: 'LoadingView',
    components: { ProgressSpinner },
}
</script>

<style>
.mave-page-loading {
    position: absolute;
    top: 40%; /* leave 10% for menu bar */
    left: 50%;
}
</style>
