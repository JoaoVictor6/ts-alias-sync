import colors from 'colors';
import { setCommand } from './set-command'

const [, , method] = process.argv
console.log(process.argv)
async function main() {
  switch (method) {
    case 'set':
      await setCommand();
      break
    default:
      console.log(colors.bold.bgRed('Command not found'))
  }
}
main()
