/** @type {import('jest').Config} */
module.exports = {
    moduleFileExtensions: ["js", "ts"],
    fakeTimers: {
        enableGlobally: true
    },
    transform: {
        "^.+\\.ts?$": [
            "ts-jest",
            {
                isolatedModules: true
            }
        ]
    },
    testRegex: ".+\\.test\\.ts?$",
    testEnvironment: "jsdom"
};
