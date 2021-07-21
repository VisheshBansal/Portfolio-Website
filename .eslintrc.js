module.exports = {
    env: {
        browser: true,
        es6: true,
    },
    extends: ["eslint:recommended", "plugin:vue/essential"],
    globals: {
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
    },
    parserOptions: {
        ecmaVersion: 2018,
    },
    plugins: ["vue"],
    rules: {
        "vue/valid-v-for": 0,
        "no-undef": 0,
        "no-console": "off",
    },
};
