// eslint.config.mjs
export default {
  root: true,
  ignores: [
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "prisma/**",
    "src/generated/**", // ignore all generated Prisma files
  ],
  extends: ["next/core-web-vitals"], // optional, includes recommended Next.js rules
  rules: {
    "@typescript-eslint/no-empty-object-type": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-unused-expressions": "off",
  },
};
