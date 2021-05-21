const path = require("path");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
module.exports = {
  target: "node",
  devtool: 'source-map',
  node: false,
  entry: "./src/cli.js",
  output: {
    globalObject: "this",
    path: path.resolve(__dirname, "bin"),
    filename: "graphql-testkit.js",
    library: "graphql-testkit",
    libraryTarget: "umd"
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/, // Transform all .js and .jsx files required somewhere with Babel
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
  externals: {
    react: {
      commonjs: "react",
      commonjs2: "react",
      amd: "react",
      root: "react"
    }
  },
  optimization: {
    usedExports: true,
    providedExports: true,
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true,
        terserOptions: {
          // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
        }
      })
    ]
  },
  plugins: [
    new CopyPlugin([
      { from: "./node_modules/shelljs/src/exec-child.js", to: "" }
    ]),
    new webpack.EnvironmentPlugin({
      NODE_ENV: "development"
    })
  ],
  resolve: {
    modules: ["node_modules", "app"],
    mainFields: ["browser", "jsnext:main", "main"]
  }
};
