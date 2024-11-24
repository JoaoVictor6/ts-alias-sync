import colors from 'colors';
import path from 'node:path'
import fs from 'node:fs/promises'
import ts from 'typescript'

export async function updateTsConfig({ basePath, aliasPath, pathTitle }: { pathTitle: string, aliasPath: string, basePath: string }) {
  const tsConfigPath = path.resolve(basePath, 'tsconfig.json');
  const rawTsConfig = await fs.readFile(tsConfigPath, { encoding: 'utf8' })
  const result = ts.parseConfigFileTextToJson(tsConfigPath, rawTsConfig)
  if (result.error) return console.log(colors.bgRed(JSON.stringify(result.error, null, 4)))
  await fs.writeFile(tsConfigPath, JSON.stringify(
    {
      ...result.config,
      compilerOptions: {
        ...result.config.compilerOptions,
        paths: {
          ...(result.config.compilerOptions.paths || {}),
          [`${pathTitle}/*`]: [aliasPath]
        }
      }
    }, null, 2
  ), { encoding: 'utf8' })
  console.info(colors.bgGreen.black.bold('\udb83\ude1e tsconfig updated'))
}
