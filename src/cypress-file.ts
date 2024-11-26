import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import colors from 'colors';

// 1. Configurar o parser
const parser = new Parser();
parser.setLanguage(TypeScript.typescript);

// 2. Código original
const code = `
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
    supportFile: 'cypress/support/component.ts',
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
`;

function navigateIntoNode(node: Parser.SyntaxNode, typeMap: string[]) {
  const nextNode = node.children.find(({ type }) => type === typeMap[0])
  if (!nextNode) return node;

  return navigateIntoNode(nextNode, typeMap.slice(1))
}
function getChildrenNodes(node: Parser.SyntaxNode, type: string) {
  return node.children.filter((child) => child.type === type)
}
function isLexicalScopeName(name: string) {
  return (node: Parser.SyntaxNode) => {
    const variableDeclationNode = navigateIntoNode(node, ['variable_declarator'])
    return variableDeclationNode.childForFieldName('name')?.text === name;
  }
}
function searchResolveObjectNode(nodes: Parser.SyntaxNode[]) {
  return nodes.find(node => {
    const resolveObjectNode = getChildrenNodes(
      navigateIntoNode(node, ['pair', 'property_identifier']),
      'property_identifier'
    ).find(child => child.text === 'resolve')

    return resolveObjectNode
  })
}
function searchAliasPropertyNode(node: Parser.SyntaxNode) {
  return getChildrenNodes(navigateIntoNode(node, ['object']), 'pair').find(child => {
    return navigateIntoNode(child, ['property_identifier']).text === 'alias'
  })
}
function navigateToAliasPropertyOfWebpack(originalCode: string) {
  const node = parser.parse(originalCode).rootNode
  const lexicalDeclarationNodes = getChildrenNodes(node, 'lexical_declaration')
  const webpackLexicalDeclarationNode = lexicalDeclarationNodes.find(isLexicalScopeName('webpackConfig'))
  if (!webpackLexicalDeclarationNode) return console.log(colors.bgRed.bold.black('webPack config declaration not found\nTip: rename or create a webpack config var with name "webpackConfig"'))
  const webpackConfigBlockReturnNode = navigateIntoNode(webpackLexicalDeclarationNode, ['variable_declarator', 'arrow_function', 'statement_block', 'return_statement', 'object'])

  const returnObjectPropertiesNodes = getChildrenNodes(webpackConfigBlockReturnNode, 'pair')
  const resolveObjectNode = searchResolveObjectNode(returnObjectPropertiesNodes)
  if (!resolveObjectNode) return console.log(colors.bgRed.bold.black('resolve property is not configured on webpack config return on cypress config file'))
  const aliasPropertyNode = searchAliasPropertyNode(resolveObjectNode)
  if (!aliasPropertyNode) return console.log(colors.bgRed.bold.black('alias property is not configured on webpack config return on cypress config file'))

  const aliasObjectNode = navigateIntoNode(aliasPropertyNode, ['object'])

  return aliasObjectNode
}

export function editCypressConfigFile({ aliasSetting, originalCode }: { originalCode: string, aliasSetting: { path: string, alias: string } }) {
  const aliasObjectNode = navigateToAliasPropertyOfWebpack(originalCode);
  if (!aliasObjectNode) return

  return (
    originalCode.slice(0, aliasObjectNode.startIndex + 1) +
    `\n'${aliasSetting.alias}': path.resolve(__dirname, '${aliasSetting.path.replace('/*', '')}'),` +
    originalCode.slice(aliasObjectNode.startIndex + 1)
  )
}

