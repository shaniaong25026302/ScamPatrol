// eslint.config.js — flat config (ESLint 9). Node + CommonJS.
const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        process: "readonly",
        console: "readonly",
        module: "writable",
        require: "readonly",
        __dirname: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Browser client scripts
    files: ["public/js/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        fetch: "readonly",
        console: "readonly",
      },
    },
  },
  {
    ignores: ["node_modules/**", "public/css/**"],
  },
];
