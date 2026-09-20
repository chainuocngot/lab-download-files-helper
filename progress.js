const cliProgress = require("cli-progress")
const chalk = require("chalk")

function printHeader({ type, url, meta, currentLink, totalLink }) {
  const isAlbum = type === "album"
  const icon = isAlbum ? "📁" : "📄"
  const label =
    type === "album" ? chalk.yellow.bold("ALBUM") : chalk.blue.bold("FILE ")
  const metaText = meta ? chalk.dim(`  (${meta})`) : ""

  console.log(
    `\n [${currentLink}/${totalLink}] ${icon} ${label} ${chalk.underline(url)}${metaText}`,
  )
}

function createBar(isAlbum = false) {
  let format = `  ${chalk.cyan(
    "{bar}",
  )} {percentage}% | {downloadedMB}/{totalMB} MB | {filename}`

  if (isAlbum) {
    format = `  [{currentFile}/{totalFile}] ${chalk.cyan(
      "{bar}",
    )} {percentage}% | {downloadedMB}/{totalMB} MB | {filename}`
  }

  return new cliProgress.SingleBar(
    {
      format,
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
      clearOnComplete: false,
    },
    cliProgress.Presets.shades_classic,
  )
}

function printSuccess(text) {
  console.log(chalk.green(`  ✓ ${text}`))
}

function printError(text) {
  console.error(chalk.red(`  ❌ ${text}`))
}

module.exports = {
  printHeader,
  createBar,
  printSuccess,
  printError,
}
