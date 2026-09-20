const { bunkrHelper } = require("./bunkr-helper.js")
const { turboHelper } = require("./turbo-helper.js")
const { getUrlsFromFile, logErrorToFile } = require("./util.js")
const minimist = require("minimist")
const path = require("path")

async function main() {
  const argv = minimist(process.argv.slice(2))
  const { albumUrl, outDir, urlsFilePath } = argv
  const fullCommand = process.argv.join(" ")

  if (albumUrl && urlsFilePath) {
    console.error(
      "❌ Chỉ có thể chứa tham số --albumUrl hoặc --urlsFilePath cùng 1 câu lệnh",
    )
    process.exit(1)
  }
  // node . --urlsFilePath "C:\Users\PC\Desktop\list.txt" --outDir "D:\Personal\down"
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
  const urls = await getUrlsFromFile(urlsFilePath)

  const totalValidUrls = urls.filter(
    (url) => bunkrHelper.isBunkrLink(url) || turboHelper.isTurboLink(url),
  )
  // https://pixeldrain.com/api/file/v6fXR67y?download
  // https://pixeldrain.com/u/v6fXR67y

  try {
    const totalLink = totalValidUrls.length
    let currentLink = 0
    await logErrorToFile(fullCommand)

    for (const url of totalValidUrls) {
      currentLink++
      switch (true) {
        // Bunkr
        case bunkrHelper.isBunkrLink(url):
          await bunkrHelper.handleDownloadFiles({
            url,
            outDir,
            currentLink,
            totalLink,
          })
          break

        // Turbo
        case turboHelper.isTurboLink(url):
          await turboHelper.handleDownloadFile({
            url,
            outDir,
            currentLink,
            totalLink,
          })
          break

        default:
          break
      }
    }
  } catch (error) {
    console.error(`MAIN LEVEL: ❌ [${error.message}]`)
  }
}

main()
