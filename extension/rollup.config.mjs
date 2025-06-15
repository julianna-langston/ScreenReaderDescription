import typescript from "@rollup/plugin-typescript";
import copy from 'rollup-plugin-copy';

export default [
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
            copy({
                targets: [
                    {
                        src: "public/*",
                        dest: "dist"
                    }
                ]
            })
        ]
    }
]