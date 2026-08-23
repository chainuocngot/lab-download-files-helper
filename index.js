const { bunkrHelper } = require("./bunkr-helper.js")
const { turboHelper } = require("./turbo-helper.js")
const { getUrlsFromFile } = require("./util.js")
const minimist = require("minimist")
const path = require("path")
const chalk = require("chalk")

async function main() {
  const argv = minimist(process.argv.slice(2))
  const { albumUrl, outDir, urlsFilePath } = argv

  if (albumUrl && urlsFilePath) {
    console.error(
      "❌ Chỉ có thể chứa tham số --albumUrl hoặc --urlsFilePath cùng 1 câu lệnh",
    )
    process.exit(1)
  }

  if (!albumUrl && !urlsFilePath) {
    console.error("❌ Thiếu tham số --albumUrl hoặc --urlsFilePath. Ví dụ:")
    console.error(
      '   node . --albumUrl "https://bunkr.cr/a/xxxxxxxx?advanced=1"',
    )
    console.error('   node . --urlsFilePath "C:\\videos\\urls.txt"')
    process.exit(1)
  }

  if (urlsFilePath) {
    const extFile = path.extname(urlsFilePath)

    if (extFile !== ".txt") {
      console.error("❌ File phải là file có đuôi .txt")
      process.exit(1)
    }
  }

  if (!outDir) {
    console.error("❌ Thiếu tham số --outDir. Ví dụ:")
    console.error('   node . --outDir "C:\\videos"')
    process.exit(1)
  }
  // https://cold2.gofile.io/download/web/3462fe6e-42cd-4a91-b15e-95086eccf229/Cici%20MsBreewc%20Idaman%20Pascol%20Indo%20Happy%20Crot%20-%20BOKEPSIN.mp4
  // https://store4.gofile.io/download/web/f3b0e0cd-3913-4030-8200-ba55831cd803/1.mp4
  const urls = await getUrlsFromFile(urlsFilePath)

  const totalValidUrls = urls.filter(
    (url) => bunkrHelper.isBunkrLink(url) || turboHelper.isTurboLink(url),
  )

  try {
    let currentUrl = 0
    for (const url of totalValidUrls) {
      console.log(chalk.blue(`\n\n---|${url}|---`))
      currentUrl++
      switch (true) {
        // Bunkr
        case bunkrHelper.isBunkrLink(url):
          await bunkrHelper.handleDownloadFiles({
            url,
            outDir,
            current: currentUrl,
            total: totalValidUrls.length,
          })
          break

        // Turbo
        case turboHelper.isTurboLink(url):
          await turboHelper.handleDownloadFile({
            url,
            outDir,
            current: currentUrl,
            total: totalValidUrls.length,
          })
          break

        default:
          break
      }
    }
  } catch (error) {
    console.error(`❌ [${error.message}]`)
  }
}

main()
