import typescript from "@rollup/plugin-typescript";
import copy from 'rollup-plugin-copy';

const files = ["crunchyroll", "editor_bridge", "background", "hidive", "emby", "youtube", "options"]    // "description"

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
    ...files.map((filename) => {
        return {
            input: `src/${filename}.ts`,
            output: [
                {
                    file: `dist/${filename}.js`,
                    format: "iife"
                }
            ],
            plugins: [
                typescript({ tsconfig: "./tsconfig.json" }),
            ]
        }
    })
]