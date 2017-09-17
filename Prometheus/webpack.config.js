const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
	template: './client/index.html',
	filename: 'index.html',
	inject: 'body'
});

module.exports = {
	entry: ['babel-polyfill', './client/index.js'],
	output: {
		path: path.resolve('build'),
		filename: 'index_bundle.js'
	},
	devServer: {
		filename: 'index_bundle.js'
	},
	devtool: 'inline-source-map',
	module: {
		loaders: [{
			test: /\.js$/,
			loader: 'babel-loader',
			exclude: /node_modules/
		}, {
			test: /\.jsx$/,
			loader: 'babel-loader',
			exclude: /node_modules/
		}, {
			test: /\.css$/,
			loader: 'css',
			exclude: /node_modules/
		}, {
			test: /\.(jpg|png|svg)$/,
			loader: 'url-loader',
			options: {
				limit: 10000
				// Use urls if images are bigger than 10 KB.
			},
			exclude: /node_modules/
		}]
	},
	plugins: [
		HtmlWebpackPluginConfig
	]
};
