<template>
    <DefaultLayout>
        <div v-if="itemStatus=='Loaded'" class="mave-collection">
            Collection Page for {{ item.name }}
        </div>
        <div v-else-if="itemStatus=='Loading' || itemStatus=='NotLoaded'">
            <PageLoading/>
        </div>
        <div v-else>
            <ItemNotFound model="collection" :itemId="itemId"/>
        </div>
    </DefaultLayout>
</template>

<script>

import DefaultLayout from '@/components/layout/DefaultLayout'
import ItemNotFound from '@/components/common/ItemNotFound'
import PageLoading from '@/components/common/PageLoading'
import config from '@/config'
// import useAuth from '@/composition/auth'
import useFormatters from '@/composition/formatters'
import useItem from '@/composition/item'

export default {
    name: 'CollectionView',

    components: { DefaultLayout, ItemNotFound, PageLoading },

    props: {
        itemId: {
            type: String,
            required: true
        }
    },

    setup: () => {
        // const {userIsAuthenticated} = useAuth()
        return {
            config: config,
            // userIsAuthenticated,

            ...useFormatters(),
            ...useItem({ itemTypeName: 'collection' }),
        }
    },

    watch: {
        itemId: {
            handler: function(newValue, oldValue) {
                if (newValue != oldValue) {
                    this.setItemId(newValue)
                }
            },
            immediate: true
        }
    }
}

</script>

<style scoped>

</style>