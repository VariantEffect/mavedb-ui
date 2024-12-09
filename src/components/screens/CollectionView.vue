<template>
    <DefaultLayout>
        <div v-if="itemStatus=='Loaded'" class="mave-collection">
            <div class="mave-1000px-col">
                <div class="mave-screen-title-bar">
                    <div class="mave-screen-title">{{ item.name }}</div>
                </div>
                <div v-if="item.description" class="mave-collection-description">{{ item.description }}</div>               
            </div>
            <div class="mave-1000px-col">
                <div v-if="item.creationDate">Created {{ formatDate(item.creationDate) }} <span v-if="item.createdBy">
                    <a :href="`https://orcid.org/${item.createdBy.orcidId}`" target="blank"><img src="@/assets/ORCIDiD_icon.png"
                        alt="ORCIDiD">{{ item.createdBy.firstName }} {{ item.createdBy.lastName }}</a></span></div>
                <div v-if="item.modificationDate">Last updated {{ formatDate(item.modificationDate) }} <span
                    v-if="item.modifiedBy">
                    <a :href="`https://orcid.org/${item.modifiedBy.orcidId}`" target="blank"><img src="@/assets/ORCIDiD_icon.png"
                        alt="ORCIDiD">{{ item.modifiedBy.firstName }} {{ item.modifiedBy.lastName }}</a></span></div>

                <div class="mave-collection-section-title">Score Sets</div>
                <div v-if="item.scoreSetUrns.length != 0">
                    <ul>
                        <li v-for="scoreSetUrn in item.scoreSetUrns" :key="scoreSetUrn">
                            <router-link :to="{ name: 'scoreSet', params: { urn: scoreSetUrn } }">{{ scoreSetUrn }}</router-link>
                        </li>
                    </ul>
                </div>
                <div v-else>No associated score sets yet</div>

                <div class="mave-collection-section-title">Experiments</div>
                <div v-if="item.experimentUrns.length != 0">
                    <ul>
                        <li v-for="experimentUrn in item.experimentUrns" :key="experimentUrn">
                            <router-link :to="{ name: 'experiment', params: { urn: experimentUrn } }">{{ experimentUrn }}</router-link>
                        </li>
                    </ul>
                </div>
                <div v-else>No associated experiments yet</div>

                <div class="mave-collection-section-title">Contributors</div>
                <!-- TODO think about what to show if there are no admins (shouldn't happen), editors, or viewers.
                Keep in mind that we shouldn't show the editors or viewers sections to non-collection-admins at all.
                But we might want to show if those sections are blank to collection admins. -->
                <div v-if="item.admins.length != 0" class="mave-collection-contributors-subsection">
                    <div class="mave-collection-contributors-subsection-title">Admins</div>
                    <ul>
                        <div v-for="admin in item.admins" :key="admin">
                            <a :href="`https://orcid.org/${admin.orcidId}`" target="blank">
                                <img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD">
                                {{ admin.firstName }} {{ admin.lastName }}
                            </a>
                        </div>
                    </ul>
                </div>
                <div v-if="item.editors.length != 0" class="mave-collection-contributors-subsection">
                    <div class="mave-collection-contributors-subsection-title">Editors</div>
                    <ul>
                        <div v-for="editor in item.editors" :key="editor">
                            <a :href="`https://orcid.org/${editor.orcidId}`" target="blank">
                                <img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD">
                                {{ editor.firstName }} {{ editor.lastName }}
                            </a>
                        </div>
                    </ul>
                </div>
                <div v-if="item.viewers.length != 0" class="mave-collection-contributors-subsection">
                    <div class="mave-collection-contributors-subsection-title">Viewers</div>
                    <ul>
                        <div v-for="viewer in item.viewers" :key="viewer">
                            <a :href="`https://orcid.org/${viewer.orcidId}`" target="blank">
                                <img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD">
                                {{ viewer.firstName }} {{ viewer.lastName }}
                            </a>
                        </div>
                    </ul>
                </div>
            </div>
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

.mave-collection {
  padding: 20px;
}

.mave-collection-description {
  margin: 0 0 10px 0;
}

.mave-collection-section-title {
  font-size: 24px;
  padding: 0 0 5px 0;
  border-bottom: 1px solid #ccc;
  margin: 20px 0 10px 0;
}

.mave-collection-contributors-subsection-title {
  font-size: 18px;
  padding: 0 0 0 0;
  /* margin: 20px 0 10px 0; */
}

.mave-collection-contributors-subsection {
  padding: 0 0 5px 0;
  border-bottom: 1px dashed #ccc;
  margin: 20px 0 10px 0;
}

</style>