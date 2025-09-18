// @ts-check

// import eslint from '@eslint/js'
// import eslintConfigPrettier from 'eslint-config-prettier'
// import vueTsEslintConfig from '@vue/eslint-config-typescript'
// import pluginVue from 'eslint-plugin-vue'
// import tseslint from 'typescript-eslint'

// export default tseslint.config(
//   pluginVue.configs['flat/recommended'],
//   eslint.configs.recommended,
//   tseslint.configs.recommended,
//   eslintConfigPrettier,
//   {
//     extends: [
//       'prettier'
//     ],
//     rules: {
//       '@html-eslint/indent': ['error', 2],
//       '@typescript-eslint/no-explicit-any': 'off',
//       'vue/no-multiple-template-root': 'off'
//     }
//   }
// )

import pluginVue from 'eslint-plugin-vue'
import {defineConfigWithVueTs, vueTsConfigs} from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  // {
  //   name: 'app/files-to-lint',
  //   files: ['**/*.{ts,mts,tsx,vue}'],
  // },
  // {
  //   name: 'app/files-to-ignore',
  //   ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  // },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  skipFormatting,
)
