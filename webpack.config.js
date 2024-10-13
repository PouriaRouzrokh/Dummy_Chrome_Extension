const path = require('path');

module.exports = {
  entry: {
    background: './src/background.js',
    popup: './src/popup.js',
    uppercase: './src/uppercase.js',
    sidepanel: './src/sidepanel.js',
    content: './src/content.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  mode: 'development',
  devtool: 'source-map'
};
