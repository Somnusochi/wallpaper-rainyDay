import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { VueLoaderPlugin } from 'vue-loader';
import AutoImport from 'unplugin-auto-import/rspack';
import Components from 'unplugin-vue-components/rspack';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
// Target browsers, see: https://github.com/browserslist/browserslist
const targets = ['chrome >= 87', 'edge >= 88', 'firefox >= 78', 'safari >= 14'];

export default defineConfig({
  context: __dirname,
  entry: {
    main: './src/main.js',
  },
  output: {
    path: resolve(__dirname, 'dist'), // 输出目录
    filename: '[name].bundle.js', // 输出文件名
    chunkFilename: 'js/[name]/[name].[contenthash].js', // 异步 chunk 文件名
    publicPath: '/', // 公共路径
    clean: true, // 清理输出目录
    assetModuleFilename: 'assets/[name].[hash][ext]', // 资源文件命名规则
  },
  devtool: isProduction ? false : 'source-map', // 生产环境禁用 .map 文件，开发环境生成 .map 文件
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'), // 将 '@' 映射到 'src' 文件夹
      // 添加其他别名
    },
    extensions: ['...', '.ts', '.vue'],
  },
  module: {
    rules: [
      {
        test: /\.(css|sass|scss)$/,
        use: ['vue-style-loader', 'css-loader', 'sass-loader'],
        type: 'javascript/auto',
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          experimentalInlineMatchResource: true,
        },
      },
      {
        test: /\.(js|ts)$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                },
              },
              env: { targets },
            },
          },
        ],
      },
      {
        test: /\.svg/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    AutoImport({
      imports: ['vue', 'vue-router'],
    }),
    Components({}),
    new rspack.HtmlRspackPlugin({
      template: './public/index.html',
    }),
    new rspack.DefinePlugin({
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
    }),
    new VueLoaderPlugin(),
  ],
  optimization: {
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin(),
      new rspack.LightningCssMinimizerRspackPlugin({
        minimizerOptions: { targets },
      }),
    ],
  },
  experiments: {
    css: false,
  },
});
