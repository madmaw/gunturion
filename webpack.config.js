module.exports = {
    entry: "./src/main/ts/index.ts",
    output: {
        filename: "build/bundle.js"
    },
    devServer: {
        contentBase: './'
    },
    resolve: {
        // Add '.ts' and '.tsx' as a resolvable extension.
        modules: ["src/main/ts/**/*.ts", "node_modules"],
        extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js"]
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    }
}