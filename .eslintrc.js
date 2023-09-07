module.exports = {
    extends: ["plugin:@typescript-eslint/recommended"],
    env: {
        browser: true,
        node: true,
    },
    rules: {
        "@typescript-eslint/no-unused-vars": [ "warn", { "argsIgnorePattern": "^_" } ]
    },
};
