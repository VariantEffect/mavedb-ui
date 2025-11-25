<template>
    <div style="height: 100vh;">
        <h1>Could not find the requested {{ model }}.</h1>
        <div v-if=itemId>
            The {{ model }} with identifier `{{ itemId }}` does not exist, or you do not have permission to view it.
        </div>
        <div v-else>
            The requested {{ model }} does not exist, or you do not have permission to view it.
        </div>
    </div>
</template>

<script lang="ts">
export default {
    name: 'PageNotFoundView',
    components: { },

    props: {
        model: {
            type: String,
            default: null,
            required: true
        },
        itemId: {
            type: String,
            default: null,
            required: false
        }
    }
}
</script>

<style>

</style>
