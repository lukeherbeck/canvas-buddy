import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const browserGlobals = {
  HTMLElement: "readonly",
  HTMLAnchorElement: "readonly",
  HTMLButtonElement: "readonly",
  HTMLInputElement: "readonly",
  MouseEvent: "readonly",
  KeyboardEvent: "readonly",
  Event: "readonly",
  EventTarget: "readonly",
  Node: "readonly",
  Request: "readonly",
  RequestInfo: "readonly",
  RequestInit: "readonly",
  Response: "readonly",
  URL: "readonly",
  console: "readonly",
  confirm: "readonly",
  document: "readonly",
  fetch: "readonly",
  globalThis: "readonly",
  localStorage: "readonly",
  requestIdleCallback: "readonly",
  setTimeout: "readonly",
  window: "readonly",
  chrome: "readonly",
  browser: "readonly",
};

export default [
  {
    ignores: ["dist/**", "node_modules/**", "xcode/**", "coverage/**"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "*.ts", "*.mjs"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals,
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];
