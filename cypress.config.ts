import { defineConfig } from 'cypress';
import * as Webpack from 'webpack';
import { devServer } from '@cypress/webpack-dev-server';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import webpack from 'webpack';
import { config as configEnvs } from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, './envs/.env.test');
const envVars = configEnvs({ path: envPath }).parsed || {};

const webpackConfig = (
  cypressConfig: Cypress.PluginConfigOptions,
): Webpack.Configuration => {
  return {
    resolve: {
      extensions: ['.js', '.ts', '.tsx'],
      alias: {
        '@components': path.resolve(__dirname, './src/components'),
        '@config': path.resolve(__dirname, './src/config'),
        '@context': path.resolve(__dirname, './src/context'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@redux': path.resolve(__dirname, './src/redux'),
        '@services': path.resolve(__dirname, './src/services'),
        '@styles': path.resolve(__dirname, './src/styles'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@src': path.resolve(__dirname, './src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: [/node_modules/],
          use: [
            {
              loader: 'ts-loader',
              options: { transpileOnly: true },
            },
          ],
        },
        {
          test: /\.feature$/,
          use: [
            {
              loader: '@badeball/cypress-cucumber-preprocessor/webpack',
              options: cypressConfig,
            },
          ],
        },
        {
          test: /\.(css)$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': JSON.stringify(envVars),
      }),
    ],
  };
};

export default defineConfig({
  component: {
    video: false,
    screenshotOnRunFailure: false,
    specPattern: '**/*.feature',
    supportFile: 'cypress/support/component.tsx',
    defaultCommandTimeout: 10000,
    devServer(devServerConfig) {
      return devServer({
        ...devServerConfig,
        framework: 'react',
        webpackConfig: webpackConfig(devServerConfig.cypressConfig),
      });
    },
    async setupNodeEvents(on, config) {
      // This is required for the preprocessor to be able to generate JSON reports after each run, and more.
      await addCucumberPreprocessorPlugin(on, config);

      // Make sure to return the config object as it might have been modified by the plugin.
      return config;
    },
  },
});
