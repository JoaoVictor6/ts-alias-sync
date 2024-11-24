import { prompt } from 'prompts'
import path from 'node:path'
import fs from 'node:fs/promises'
import { execSync } from 'node:child_process'
import colors from 'colors'
import { editCypressConfigFile } from './cypress-file'
import { updateTsConfig } from './ts-config-file'

const basePath = execSync('pwd').toString().replaceAll('\n', '')
async function inputAlias() {
  return await prompt({
    name: 'value',
    type: 'text',
    message: 'Digite o nome do alias:'
  }, { oncancel: () => false }) as { value?: string }
}
async function inputPath(projectFolders: string[]) {
  return await prompt({
    name: 'value',
    type: 'autocomplete',
    message: 'Escolha a pasta',
    choices: projectFolders.map(path => ({ title: path }))
  }, { oncancel: () => false }) as { value?: string }
}
export async function setCommand() {
  const projectFolders = await searchFolders(basePath)
  if (!projectFolders) return console.error(colors.bold.bgRed("Projects path not found"))
  const aliasPathReponse = await inputAlias()
  if (!aliasPathReponse.value) return process.exit(1)
  const pathResponse = await inputPath(projectFolders)
  if (!pathResponse.value) return process.exit(1)

  const filesOnRoot = await fs.readdir(basePath)
  if (filesOnRoot.includes('tsconfig.json')) await updateTsConfig({
    pathTitle: aliasPathReponse.value, aliasPath: pathResponse.value, basePath
  })
  if (filesOnRoot.includes('cypress.config.ts')) {
    const cypressConfigPath = path.resolve(basePath, 'cypress.config.ts')
    const editedFile = editCypressConfigFile({
      originalCode: await fs.readFile(cypressConfigPath, { encoding: 'utf8' }),
      aliasSetting: {
        alias: aliasPathReponse.value,
        path: pathResponse.value
      }
    })
    if (!editedFile) return
    await fs.writeFile(cypressConfigPath, editedFile, { encoding: 'utf8' })
    console.info(colors.bgGreen.black.bold('\udb83\ude1e webpack setup on cypress.config.ts is updated'))
  }
}

async function searchFolders(basePath: string, savedFolders: string[] = []) {
  const dir = await fs.readdir(basePath)
  let folders: string[] = []

  for (let idx = 0; idx <= dir.length; idx++) {
    const file = dir[idx]
    if (file === 'node_modules') continue;
    if (file === '.git') continue;
    console.log({ file })
    try {
      await fs.readdir(path.resolve(basePath, file))
      const searchedFolders = await searchFolders(path.resolve(basePath, file), [...savedFolders, `./${file}/*`])
      folders = folders.concat(searchedFolders as string[])
    } catch {
      if (idx === dir.length - 1) return [...folders, ...savedFolders]
    }
  }
}
