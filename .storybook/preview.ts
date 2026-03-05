import type {Preview} from '@storybook/vue3-vite'

// Import design tokens and global styles
import '@fontsource/raleway'
import '@fontsource/exo-2/700.css'
import '@fontsource/exo-2/800.css'
import '@fontsource/exo-2/900.css'
import '../src/assets/app.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },

    a11y: {
      test: 'todo'
    }
  }
}

export default preview
