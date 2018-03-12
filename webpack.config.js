const path = require('path');

console.log(__dirname);
console.log("Output: " + path.resolve(__dirname, 'dist'));

module.exports = {
  entry: "./src/entry.js",

  devtool: 'inline-source-map',

  output: {
    path: path.resolve(__dirname, 'dist'),
    library: 'Backdraft',
    libraryTarget: "var",
    libraryExport: "default",
    filename: 'backdraft.js'
  },

  externals: {
    "backbone": "Backbone",
    "jquery": "$",
    "underscore": "_",
  },

  module: {
    rules: [{
      test: /\.js$/,
      exclude: /(node_modules)/,
      loader: 'babel-loader'
    }]
  }
};
