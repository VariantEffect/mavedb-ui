import pluginVue from 'eslint-plugin-vue'
import {defineConfigWithVueTs, vueTsConfigs} from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  skipFormatting,
  {
    rules: {
      'vue/attributes-order': [
        'error', {alphabetical: true}
      ],
      '@typescript-eslint/no-unused-vars': [
        'error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}
      ]
    }
  },
  {
    // marked passes raw HTML through, so markdown must render via the sanitizing helper.
    ignores: ['src/lib/form-helpers.ts'],
    rules: {
      'no-restricted-imports': [
        'error', {paths: [{name: 'marked', message: 'Use markdownToHtml from @/lib/form-helpers, which sanitizes the output.'}]}
      ]
    }
  }
)
