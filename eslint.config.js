// <Shania Start>
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
        fetch: "readonly",
        URL: "readonly",
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
        alert: "readonly",
        confirm: "readonly",
        location: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        FormData: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        CustomEvent: "readonly",
        Event: "readonly",
        URLSearchParams: "readonly",
      },
    },
  },
  {
    ignores: ["node_modules/**", "public/css/**"],
  },
];
// <Shania End>
