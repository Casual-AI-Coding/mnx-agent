module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  ignorePatterns: [
    'dist/', 'node_modules/', 'coverage/',
    '*.cjs', '*.js', '*.d.ts',
    '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts',
    'postcss.config.js', 'tailwind.config.js',
    'scripts/',
    'server/__tests__/', 'server/**/__tests__/',
    'src/**/__tests__/',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
}
