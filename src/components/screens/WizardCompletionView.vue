<template>
  <MvLayout>
    <div v-if="userIsAuthenticated && item" class="mx-auto max-w-[640px] px-6 py-[60px]">
      <div class="mave-gradient-bar relative overflow-hidden rounded-xl border border-border bg-white px-9 py-10 text-center">
        <MvDecorativeBars variant="leading" />

        <h2 class="mb-2 mt-6 text-[22px] font-bold text-text-dark">Your score set has been saved!</h2>
        <p class="mb-6 text-[15px] text-text-secondary">Thank you for uploading your data to MaveDB.</p>

        <!-- View score set link -->
        <router-link
          class="mb-7 flex items-center justify-between rounded-lg border border-light-green bg-mint-light px-[18px] py-3.5 text-sm font-semibold text-text-primary no-underline transition-colors hover:bg-[#e0f5e0]"
          :to="{name: 'scoreSet', params: {urn: itemId}}"
        >
          <span
            >View your score set: <span class="font-mono font-normal text-sage">{{ itemId }}</span></span
          >
          <span class="text-lg text-sage">&rarr;</span>
        </router-link>

        <!-- What's next? -->
        <div class="mb-7 text-left">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-text-secondary">What's next?</h3>
          <router-link
            class="completion-action"
            :to="{name: 'createScoreSetInExperiment', params: {urn: item.experiment.urn}}"
          >
            <div class="text-sm font-semibold text-text-primary">Add another score set to the same experiment</div>
            <div class="mt-0.5 text-xs text-text-secondary">
              {{ item.experiment.title }} ({{ item.experiment.urn }})
            </div>
          </router-link>
          <router-link class="completion-action" :to="{name: 'createExperiment'}">
            <div class="text-sm font-semibold text-text-primary">Create a score set in a new experiment</div>
            <div class="mt-0.5 text-xs text-text-secondary">Start a new experiment and add score sets to it</div>
          </router-link>
          <router-link class="completion-action" :to="{name: 'scoreSetCalibrations', params: {urn: itemId}}">
            <div class="text-sm font-semibold text-text-primary">Add a score calibration</div>
            <div class="mt-0.5 text-xs text-text-secondary">
              Help users interpret functional scores by providing clinical reference points
            </div>
          </router-link>
        </div>

        <!-- Done? -->
        <div class="mb-7 text-left">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-text-secondary">All done?</h3>
          <router-link class="completion-action" :to="{name: 'dashboard'}">
            <div class="text-sm font-semibold text-text-primary">Go to your dashboard</div>
            <div class="mt-0.5 text-xs text-text-secondary">
              View and manage all your score sets, experiments, and collections
            </div>
          </router-link>
        </div>

        <!-- Attention box -->
        <div class="rounded-lg border border-[#fbda68] bg-[#fffdf0] p-4 text-left">
          <h3 class="mb-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-[#b8860b]">
            <i class="pi pi-exclamation-circle text-sm" />
            Important
          </h3>
          <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed text-text-secondary">
            <li>
              Your data is currently <strong class="text-text-primary">unpublished</strong> and viewable only to you.
            </li>
            <li>
              You can add other users as contributors without publishing, or add the dataset to a collection and give
              users permission to view the collection.
            </li>
            <li>
              Once you publish a dataset, the data will be
              <strong class="text-text-primary">public and permanent</strong>. It cannot be made private again.
            </li>
            <li>Only a limited subset of metadata may be edited after publication. Please only publish when ready.</li>
          </ul>
        </div>
      </div>
    </div>
    <div v-else-if="userIsAuthenticated" class="p-8">
      <MvPageLoading />
    </div>
    <div v-else>
      <MvItemNotFound :item-id="itemId" model="score set" />
    </div>
  </MvLayout>
</template>

<script lang="ts">
import MvLayout from '@/components/layout/MvLayout.vue'
import MvDecorativeBars from '@/components/common/MvDecorativeBars.vue'
import MvItemNotFound from '@/components/common/MvItemNotFound.vue'
import MvPageLoading from '@/components/common/MvPageLoading.vue'
import useAuth from '@/composition/auth'
import useItem from '@/composition/item.ts'
import {useHead} from '@unhead/vue'
import {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']

export default {
  name: 'WizardCompletionView',

  components: {MvLayout, MvDecorativeBars, MvItemNotFound, MvPageLoading},

  props: {
    itemId: {
      type: String,
      required: true
    }
  },

  setup: () => {
    useHead({title: 'Score set saved!'})

    const {userIsAuthenticated} = useAuth()

    return {
      userIsAuthenticated,
      ...useItem<ScoreSet>({itemTypeName: 'scoreSet'})
    }
  },

  watch: {
    itemId: {
      handler: function (newValue, oldValue) {
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
.completion-action {
  display: block;
  padding: 14px 18px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 8px;
  text-decoration: none;
  transition:
    border-color 120ms,
    background 120ms;
}

.completion-action:last-child {
  margin-bottom: 0;
}

.completion-action:hover {
  border-color: var(--color-sage);
  background: var(--color-bg);
  text-decoration: none;
}
</style>

