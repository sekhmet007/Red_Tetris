module.exports = {
  root: true,
  env: {
    browser: true,
    node: true, // Active les globales Node.js comme `process`
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react', 'react-hooks'],
  rules: {
    'no-unused-vars': 'warn', // Avertissement pour variables inutilisées
    'no-dupe-keys': 'error', // Erreur pour les clés dupliquées
    'react/react-in-jsx-scope': 'off', // React 17+ n'a pas besoin d'import explicite de React
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
