import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettierConfig,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    // Site scripts: loaded via plain <script src> tags (see index.html),
    // not ES modules — sourceType stays "script" so top-level declarations
    // remain shared globals across files, matching the existing architecture
    // (e.g. config.js defines CONFIG, other files read it as a global).
    files: [
      'landing/**/*.js',
      'panels/**/*.js',
      'loadscreen/**/*.js',
      'photowall/**/*.js',
      'scroll/**/*.js',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        // Cross-file globals: one script defines these, others read them.
        CONFIG: 'writable',
        HistoryManager: 'writable',
        PHOTO_WALL_MEDIA: 'writable',
        SCROLL_NARRATIVE_CONFIG: 'writable',
        gtag: 'writable',
        dataLayer: 'writable',
        // Loaded from third-party <script> tags in index.html.
        Vimeo: 'readonly',
        // Optional a11y helper some panels reference.
        createFocusTrap: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-redeclare': ['error', { builtinGlobals: false }],
    },
  },
  {
    // Node-side build tooling (ESM).
    files: ['scripts/**/*.mjs', 'postcss.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
];
