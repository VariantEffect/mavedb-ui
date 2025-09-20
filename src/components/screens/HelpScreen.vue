<template>
  <DefaultLayout>
    <div class="help-screen-container">
      <h1>Help & Support</h1>
      <p>
        Welcome to MaveDB! If you need assistance, want to report a bug, or have a feature request, you're in the right
        place.
      </p>
      <ul>
        <li>
          <strong>Chat with us:</strong>
          <a href="https://zulip.mavedb.com" target="_blank" rel="noopener"> Join our Zulip chat</a> to ask questions,
          get help, or discuss upcoming development work.
        </li>
        <li>
          <strong>Documentation:</strong>
          <a href="/docs" target="_blank" rel="noopener"> Check out our documentation</a> for guides and reference.
        </li>
        <li>
          <strong>Submit a bug report or feature request:</strong>
          You can use our <a href="https://zulip.mavedb.com" target="_blank" rel="noopener">Zulip chat</a> to let us
          know about any
          <a
            href="https://mavedb.zulipchat.com/#narrow/channel/511174-bug-reports/topic/channel.20events/with/525122858"
            target="_blank"
            rel="noopener"
            >bugs</a
          >
          causing you problems or any
          <a
            href="https://mavedb.zulipchat.com/#narrow/channel/511173-features/topic/channel.20events/with/525122848"
            target="_blank"
            rel="noopener"
            >features</a
          >
          you'd like to see. Alternatively, you can submit an issue directly on our
          <a href="github.com/varianteffect/mavedb-ui/issues" target="_blank" rel="noopener">GitHub repository</a>.
        </li>
      </ul>
    </div>
  </DefaultLayout>
</template>

<script>
import DefaultLayout from '@/components/layout/DefaultLayout.vue'

export default {
  name: 'HelpScreen',
  components: {DefaultLayout}
}
</script>

<style scoped>
.help-screen-container {
  margin: 40px auto;
  padding: 32px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.help-screen-container h1 {
  margin-top: 0px;
  margin-bottom: 20px;
}
.help-screen-container ul {
  margin: 20px 0;
  padding-left: 20px;
}
.help-screen-container li {
  margin-bottom: 16px;
  font-size: 1.1em;
}
</style>
