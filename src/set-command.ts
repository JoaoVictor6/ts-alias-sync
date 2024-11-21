import { prompt } from 'prompts'
import path from 'node:path'
import fs from 'node:fs/promises'
import { execSync } from 'node:child_process'
import colors from 'colors'
import ts from 'typescript'
import { editCypressConfigFile } from './cypress-file'

const basePath = execSync('pwd').toString().replaceAll('\n', '')
export async function setCommand() {
  const aliasPathReponse = await prompt({
    name: 'value',
    type: 'text',
    message: 'Digite o nome do alias:'
  }) as { value: string }
  const projectPaths = await searchFolders(basePath, [])
  if (!projectPaths) return console.error(colors.bold.bgRed("Projects path not found"))
  const pathSelectedResponse = await prompt({
    name: 'value',
    type: 'autocomplete',
    message: 'Escolha a pasta',
    choices: projectPaths.map(path => ({ title: path }))
  }) as { value: string }

  const filesOnRoot = await fs.readdir(basePath)

  if (filesOnRoot.includes('tsconfig.json')) await updateTsConfig(aliasPathReponse.value, pathSelectedResponse.value)
  if (filesOnRoot.includes('cypress.config.ts')) {
    const cypressConfigPath = path.resolve(basePath, 'cypress.config.ts')
    const editedFile = editCypressConfigFile({
      originalCode: await fs.readFile(cypressConfigPath, { encoding: 'utf8' }),
      aliasSetting: {
        alias: aliasPathReponse.value,
        path: pathSelectedResponse.value
      }
    })
    if (!editedFile) return
    await fs.writeFile(cypressConfigPath, editedFile, { encoding: 'utf8' })
  }
}

async function updateTsConfig(aliasPath: string, fullPath: string) {
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
          [`${aliasPath}/*`]: [fullPath]
        }
      }
    }, null, 2
  ), { encoding: 'utf8' })
  console.info(colors.bgGreen.black.bold('\udb83\ude1e tsconfig updated'))
}

async function searchFolders(basePath: string, savedFolders: string[]) {
  const dir = await fs.readdir(basePath)
  let folders: string[] = []

  for (let idx = 0; idx <= dir.length; idx++) {
    const file = dir[idx]
    if (file === 'node_modules') continue;
    try {
      await fs.readdir(path.resolve(basePath, file))
      const searchedFolders = await searchFolders(path.resolve(basePath, file), [...savedFolders, `./${file}/*`])
      folders = folders.concat(searchedFolders as string[])
    } catch {
      if (idx === dir.length - 1) return [...folders, ...savedFolders]
    }
  }
}
