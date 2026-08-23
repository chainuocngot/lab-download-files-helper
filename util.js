const path = require("path")
const fs = require("fs")
const fsPromise = require("fs/promises")
const axios = require("axios")

async function downloadFile({ url, outputPath, onProgress }) {
  const directory = path.dirname(outputPath)

  await fs.promises.mkdir(directory, {
    recursive: true,
  })

  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 5 * 60 * 1000, // 5 phút
  })

  const total = Number(response.headers["content-length"] ?? 0)
  let downloaded = 0

  response.data.on("data", (chunk) => {
    downloaded += chunk.length

    const progress = total ? (downloaded / total) * 100 : 0

    onProgress?.(progress, downloaded, total)
  })

  const writer = fs.createWriteStream(outputPath)

  response.data.pipe(writer)

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve)
    writer.on("error", reject)
    response.data.on("error", reject)
  })

  return {
    outputPath,
    total,
    downloaded,
  }
}

async function downloadFileWrapper({
  url,
  outDir,
  filename,
  current,
  total: totalDownload,
  prefixErrorLog,
}) {
  try {
    await downloadFile({
      url,
      outputPath: path.join(outDir, filename),

      onProgress: (progress, downloaded, total) => {
        process.stdout.write(
          `\rDownloading [${current}/${totalDownload}]: ${progress.toFixed(2)}% ` +
            `(${(downloaded / 1024 / 1024).toFixed(2)} MB / ` +
            `${(total / 1024 / 1024).toFixed(2)} MB)`,
        )
      },
    }).then(() => {
      // This mean is album collections || FIX IT LATER
      if (prefixErrorLog) {
        console.log("\n")
      }
    })
  } catch (error) {
    console.error(`\n❌ [${error.message}]\n`)
  }
}

async function getUrlsFromFile(filePath) {
  return [
    ...new Set(
      (await fsPromise.readFile(filePath, "utf8"))
        .split(/\r?\n/)
        .map((url) => url.trim().replace(/\/+$/, ""))
        .filter(Boolean),
    ),
  ]
}

async function logErrorToFile(text, filePath = "./log.txt") {
  await fsPromise.appendFile(filePath, text + "\n", "utf8")
}

module.exports = {
  downloadFile,
  downloadFileWrapper,
  getUrlsFromFile,
  logErrorToFile,
}
