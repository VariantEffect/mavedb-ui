<template>
  <DefaultLayout>
    <div v-if="userIsAuthenticated">
      <div class="mave-wizard-completion">
        <h1>Your score set has been saved successfully!</h1>
        <p>Thank you for uploading your data!</p>
        <p>
          You can now view your score set:
          <router-link :to="{name: 'scoreSet', params: {urn: itemId}}">{{ itemId }}</router-link>
        </p>
        <div>
          If you would like to add another score set to the same experiment, you may do so
          <router-link :to="{name: 'createScoreSetInExperiment', params: {urn: item?.experiment.urn}}"
            >here</router-link
          >
          or from its
          <router-link :to="{name: 'experiment', params: {urn: item?.experiment.urn}}">experiment page</router-link>
          later.
          <br />
          Alternatively,
          <router-link :to="{name: 'createExperiment'}">create a score set in a new experiment</router-link>.
        </div>
        <h3>Attention</h3>
        <ul class="attention-list">
          <li>
            Your data is currently unpublished and viewable only to you. You can add other users as contributors without
            publishing it, or add the dataset to a collection and give users permission to view the collection.
          </li>
          <li>
            Once you publish a dataset, the data will be public. Once a dataset has been published, it can not be made
            private again and only a limited subset of metadata may be edited. Please only publish this dataset once it
            is ready to be made public.
          </li>
        </ul>
      </div>
    </div>
    <div v-else>
      <ItemNotFound :item-id="itemId" model="score set" />
    </div>
  </DefaultLayout>
</template>

<script>
import DefaultLayout from '@/components/layout/DefaultLayout'
import ItemNotFound from '@/components/common/ItemNotFound'
import useAuth from '@/composition/auth'
import useItem from '@/composition/item'

export default {
  name: 'WizardCompletionView',

  components: {DefaultLayout, ItemNotFound},

  props: {
    itemId: {
      type: String,
      required: true
    }
  },

  setup: () => {
    const {userIsAuthenticated} = useAuth()

    return {
      userIsAuthenticated,
      ...useItem({itemTypeName: 'scoreSet'})
    }
  },

  watch: {
    itemId: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.setItemId(newValue)
          console.log(newValue)
        }
      },
      immediate: true
    }
  }
}
</script>

<style scoped>
.attention-list {
  margin-top: 0.25rem;
}
.mave-wizard-completion {
  padding: 20px;
}
.mave-wizard-completion h3 {
  margin-bottom: 0.25rem;
}
</style>
