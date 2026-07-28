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
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        structuredClone: "readonly",
        queueMicrotask: "readonly",
        performance: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // `catch (_) {}` is our deliberate "safe to ignore" idiom; other empty blocks stay errors.
      "no-empty": ["error", { allowEmptyCatch: true }],
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
        URL: "readonly",
        history: "readonly",
        DOMParser: "readonly",
        Audio: "readonly",
        DataTransfer: "readonly",
        SpeechSynthesisUtterance: "readonly",
        speechSynthesis: "readonly",
        Blob: "readonly",
        File: "readonly",
        FileReader: "readonly",
        Image: "readonly",
        AbortController: "readonly",
        IntersectionObserver: "readonly",
        MutationObserver: "readonly",
        matchMedia: "readonly",
        getComputedStyle: "readonly",
        crypto: "readonly",
      },
    },
  },
  {
    ignores: ["node_modules/**", "public/css/**"],
  },
];
// <Shania End>
