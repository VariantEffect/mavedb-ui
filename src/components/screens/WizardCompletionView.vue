<template>
  <DefaultLayout>
    <div class="mave-wizard-completion">
        <h1>Thank you for uploading your data!</h1>
        <p>Your score set has been saved successfully.</p>

        <p>
        You can now view your score set:
        <a href="/score-sets/${this.itemId}"></a>
        <RouterLink :to="scoreSetPath">{{ itemId }}</RouterLink>
        </p>

        <p>
        If you’re ready to publish your data, you can review the score set and follow the publishing steps.
        </p>
    </div>
  </DefaultLayout>
</template>

<script>

import DefaultLayout from '@/components/layout/DefaultLayout'

export default {
    name: 'WizardCompletionView',
    components: { DefaultLayout },

    props: {
        itemId: {
        type: String,
        required: true
        }
  },

  computed: {
    scoreSetPath() {
      return `/score-sets/${this.itemId}`
    }
  }

}
</script>

<style scoped>

.mave-wizard-completion {
  padding: 20px;
}

</style>