const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'development', // ou 'production' selon ton besoin
  entry: './src/client/index.js',
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
            plugins: [
              '@babel/plugin-transform-class-properties',
              '@babel/plugin-transform-object-rest-spread',
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html', // Assurez-vous que le fichier existe bien à cet emplacement
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  devServer: {
    static: {
      directory: path.join(__dirname), // On indique que le serveur statique sert depuis la racine du projet
    },
    compress: true,
    port: 8080,
    headers: {
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data: http: https:; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
    },
  },
};
