const path = require('node:path');
const { rspack } = require('@rspack/core');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');

module.exports = function createConfig(context, port, federation) {
  return (env) => {
    const scriptFilename = env?.RSPACK_SERVE ? '[name].js' : '[name].[contenthash].js';
    const config = {
      context,
      entry: './src/index.ts',
      lazyCompilation: false,
      output: {
        path: path.join(context, 'dist'),
        uniqueName: federation.name,
        publicPath: 'auto',
        filename: scriptFilename,
        chunkFilename: scriptFilename,
        clean: true,
      },
      resolve: { extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'] },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            exclude: /node_modules/,
            use: {
              loader: 'builtin:swc-loader',
              options: {
                jsc: {
                  parser: { syntax: 'typescript', tsx: true },
                  transform: { react: { runtime: 'automatic' } },
                },
              },
            },
          },
          { test: /\.css$/, type: 'css/auto' },
          { test: /\.(png|jpe?g|gif|webp|avif|svg|woff2?)$/i, type: 'asset/resource' },
        ],
      },
      plugins: [
        new ModuleFederationPlugin({
          ...federation,
          filename: 'remoteEntry.js',
          manifest: true,
          dts: false,
          shared: {
            react: { singleton: true, requiredVersion: '19.3.1' },
            'react-dom': { singleton: true, requiredVersion: '19.3.1' },
          },
        }),
        new rspack.HtmlRspackPlugin({ template: './src/index.html', chunks: ['main'] }),
        new rspack.CopyRspackPlugin({
          patterns: [{ from: 'public', noErrorOnMissing: true }],
        }),
      ],
      devServer: {
        port,
        historyApiFallback: true,
        headers: { 'Access-Control-Allow-Origin': '*' },
      },
    };
    if (env?.zephyr) {
      const { withZephyr } = require('zephyr-rspack-plugin');
      return withZephyr({ failBuild: true })(config);
    }
    return config;
  };
};
