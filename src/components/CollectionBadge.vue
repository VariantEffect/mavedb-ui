<template>
    <div class="collection-badge">
        <!-- TODO add router link to collection page -->
        <!-- TODO may want to add img alt (collection name) -->
        <img v-if="badgeNameIsLink" :src="badgeName"/>
        <Tag v-else :class="tagClassName" :value="badgeName" rounded></Tag>
    </div>
</template>

<script>

import Tag from 'primevue/tag'

export default {
    name: 'CollectionBadge',

    components: { Tag },

    props: {
        badgeName: {
            type: String,
            required: true
        }
    },

    computed: {
        // determine whether badgeName is a link to an img or not
        // TODO if so, also get the badge's collection name to use as img alt?
        badgeNameIsLink: function() {
            // TODO make this a regex to also allow https
            return this.badgeName.startsWith("http://")
        },

        tagClassName: function() {
            return {
                IGVF: "mave-collection-badge-igvf"
            }[this.badgeName] || "mave-collection-badge-other"
        },


    }
}

</script>

<style scoped>

.collection-badge {
    display: inline; /* may need inline-block */
    padding: 0 7px 0 0;
}

.collection-badge img {

}

.collection-badge .p-tag {

}

.collection-badge .mave-collection-badge-igvf {
    background-color: rgb(227, 35, 176);
}

.collection-badge .mave-collection-badge-other {
    background-color:cadetblue;
}

</style>
