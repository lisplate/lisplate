module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true,
        "node": true,
        "amd": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            2
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
        "consistent-return": [
            "error"
        ],
        "curly": [
            "error",
            "all"
        ],
        "no-sequences": [
            "error"
        ],
        "no-throw-literal": [
            "error"
        ],
        "no-shadow": [
            "error",
            { "builtinGlobals": true,  "allow": ['callback', 'err', 'root'] }
        ],
        "brace-style": [
            "error",
            "1tbs"
        ],
        "eqeqeq": [
            "error",
            "smart"
        ],
        "camelcase": [
            "error",
            {"properties": "never"}
        ],
        "comma-style": [
            "error",
            "last"
        ],
        "consistent-this": [
            "error",
            "_self"
        ],
        "eol-last": [
            "error",
        ],
        "key-spacing": [
            "error",
            { "beforeColon": false, "afterColon": true }
        ],
        "keyword-spacing": [
            "error",
            { "before": true, "after": true }
        ],
        "new-parens": [
            "error",
        ],
        "no-trailing-spaces": [
            "error",
        ],
        "one-var": [
            "error",
            "never"
        ],
        "one-var-declaration-per-line": [
            "error",
            "always"
        ],
        "space-before-function-paren": [
            "error",
            "never"
        ],
        "space-infix-ops": [
            "error",
        ]
    }
};