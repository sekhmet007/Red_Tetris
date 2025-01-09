import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  js.configs.recommended,
  {
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off", // React 17+ n'a pas besoin d'import explicite de React
      "react-hooks/rules-of-hooks": "error", // Vérifie les règles des hooks
      "react-hooks/exhaustive-deps": "warn", // Vérifie les dépendances dans useEffect
    },
  },
];
