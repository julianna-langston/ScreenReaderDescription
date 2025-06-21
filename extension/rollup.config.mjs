import typescript from "@rollup/plugin-typescript";
import copy from 'rollup-plugin-copy';

export default [
    {
        input: "src/popup.ts",
        output: [
            {
                file: "dist/popup.js",
                format: "iife"
            }
        ],
        plugins: [
            typescript({ tsconfig: "./tsconfig.json" }),
            copy({
                targets: [
                    {
                        src: "public/*",
                        dest: "dist"
                    }
                ]
            })
        ]
    },
    {
        input: "src/editor_bridge.ts",
        output: [
            {
                file: "dist/editor_bridge.js",
                format: "iife"
            }
        ],
        plugins: [
            typescript({ tsconfig: "./tsconfig.json" }),
        ]
    },
    {
        input: "src/background.ts",
        output: [
            {
                file: "dist/background.js",
                format: "iife"
            }
        ],
        plugins: [
            typescript({ tsconfig: "./tsconfig.json" }),
        ]
    },
    // {
    //     input: "src/description.ts",
    //     output: [
    //         {
    //             file: "dist/description.js",
    //             format: "iife"
    //         }
    //     ],
    //     plugins: [
    //         typescript({ tsconfig: "./tsconfig.json" }),
    //     ]
    // },
    {
        input: "src/crunchyroll.ts",
        output: [
            {
                file: "dist/crunchyroll.js",
                format: "iife"
            }
        ],
        plugins: [
            typescript({ tsconfig: "./tsconfig.json" }),
        ]
    },
    // {
    //     input: "src/hidive.ts",
    //     output: [
    //         {
    //             file: "dist/hidive.js",
    //             format: "iife"
    //         }
    //     ],
    //     plugins: [
    //         typescript({ tsconfig: "./tsconfig.json" }),
    //     ]
    // },
    {
        input: "src/emby.ts",
        output: [
            {
                file: "dist/emby.js",
                format: "iife"
            }
        ],
        plugins: [
            typescript({ tsconfig: "./tsconfig.json" }),
        ]
    },
    {
        input: "src/youtube.ts",
        output: [
            {
                file: "dist/youtube.js",
                format: "iife"
            }
        ],
        plugins: [
            typescript({ tsconfig: "./tsconfig.json" }),
        ]
    }
]