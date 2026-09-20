const path = require("path")
const fs = require("fs")
const fsPromise = require("fs/promises")
const axios = require("axios")
const { createBar, printError } = require("./progress")

const MIN_SPEED_BYTES_PER_SEC = 5 * 1024 * 1024 // 5MB/s - tốc độ tối thiểu chấp nhận được
const TIMEOUT_BUFFER_MULTIPLIER = 2 // hệ số an toàn (200MB / 5MB/s = 40s -> x3 = 120s = 2p)
const MIN_TIMEOUT_MS = 30 * 1000 // timeout tối thiểu cho file nhỏ
const MAX_TIMEOUT_MS = 30 * 60 * 1000 // timeout tối đa (chặn trên, tránh treo vô hạn với file cực lớn)

function calculateTimeout(fileSizeBytes) {
  if (!fileSizeBytes || fileSizeBytes <= 0) {
    return MIN_TIMEOUT_MS
  }

  const estimatedMs = (fileSizeBytes / MIN_SPEED_BYTES_PER_SEC) * 1000
  const bufferedMs = estimatedMs * TIMEOUT_BUFFER_MULTIPLIER

  return Math.min(Math.max(bufferedMs, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS)
}

async function downloadFile({ url, outputPath, onProgress }) {
  const directory = path.dirname(outputPath)

  await fs.promises.mkdir(directory, {
    recursive: true,
  })

  const tempPath = `${outputPath}.part`

  await fs.promises.rm(tempPath, {
    force: true,
  })

  try {
    let contentLength = 0
    try {
      const headResponse = await axios.head(url, { timeout: 10 * 1000 })
      contentLength = Number(headResponse.headers["content-length"] ?? 0)
    } catch {
      contentLength = 0
    }

    const timeout = calculateTimeout(contentLength)

    const response = await axios.get(url, {
      responseType: "stream",
      timeout,
    })

    const total = Number(response.headers["content-length"] ?? contentLength)
    let downloaded = 0

    const writer = fs.createWriteStream(tempPath)

    response.data.on("data", (chunk) => {
      downloaded += chunk.length

      const progress = total ? (downloaded / total) * 100 : 0

      onProgress?.(progress, downloaded, total)
    })

    response.data.on("error", (error) => {
      writer.destroy(error)
    })

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve)
      writer.on("error", reject)

      response.data.pipe(writer)
    })

    await fs.promises.rename(tempPath, outputPath)

    return {
      outputPath,
      total,
      downloaded,
      timeout,
    }
  } catch (error) {
    await fs.promises.rm(tempPath, {
      force: true,
    })

    throw error
  }
}

async function downloadFileWrapper({
  url,
  outDir,
  filename,
  current,
  total: totalDownload,
  isAlbum = false,
  originalUrl,
}) {
  const bar = createBar(isAlbum)

  bar.start(100, 0, {
    currentFile: current,
    totalFile: totalDownload,
    downloadedMB: "0.00",
    totalMB: "?",
    filename,
  })

  try {
    await downloadFile({
      url,
      outputPath: path.join(outDir, filename),

      onProgress: (progress, downloaded, total) => {
        bar.update(progress, {
          current,
          total: totalDownload,
          downloadedMB: (downloaded / 1024 / 1024).toFixed(2),
          totalMB: total ? (total / 1024 / 1024).toFixed(2) : "?",
          filename,
        })
      },
    })

    bar.update(100)
    bar.stop()

    // Xuống dòng sau file cuối cùng của album/lần tải để tách nhóm rõ ràng
    if (current === totalDownload) {
      console.log("")
    }
  } catch (error) {
    bar.stop()
    logErrorToFile(originalUrl)
    printError(filename ? `[${filename}] ${error.message}` : error.message)
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

function extractAlbumFiles(script) {
  const marker = "window.albumFiles"

  const start = script.indexOf(marker)
  if (start === -1) return null

  const equal = script.indexOf("=", start)
  if (equal === -1) return null

  const arrayStart = script.indexOf("[", equal)
  if (arrayStart === -1) return null

  let depth = 0
  let quote = null
  let escaped = false

  for (let i = arrayStart; i < script.length; i++) {
    const char = script[i]

    // Đang ở trong string
    if (quote) {
      if (escaped) {
        escaped = false
        continue
      }

      if (char === "\\") {
        escaped = true
        continue
      }

      if (char === quote) {
        quote = null
      }

      continue
    }

    // Bắt đầu string
    if (char === '"' || char === "'" || char === "`") {
      quote = char
      continue
    }

    // Array/object nesting
    if (char === "[") {
      depth++
    } else if (char === "]") {
      depth--

      // Đã đóng array ngoài cùng
      if (depth === 0) {
        return script.slice(arrayStart, i + 1)
      }
    }
  }

  return null
}

module.exports = {
  downloadFile,
  downloadFileWrapper,
  getUrlsFromFile,
  logErrorToFile,
  extractAlbumFiles,
}
