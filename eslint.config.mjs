import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...compat.extends("prettier"),
  {
    ignores: [".next/**", "node_modules/**", "out/**", "public/sw.js", "public/workbox-*.js"],
  },
];

export default eslintConfig;
