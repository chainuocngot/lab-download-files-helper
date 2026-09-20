const axios = require("axios")
const cheerio = require("cheerio")
const path = require("path")
const {
  downloadFileWrapper,
  logErrorToFile,
  extractAlbumFiles,
} = require("./util")
const { printHeader } = require("./progress")

class BunkrHelper {
  constructor() {
    this.StandardUrlRegex = "https://bunkr.cr"
    this.UrlRegex = /^https:\/\/bunkr\.[^/]+/
    this.DlBunkrURL = "https://dl.bunkr.cr/api/_001_v2"
    this.GlbApiSignCdnURL = "https://glb-apisign.cdn.cr/sign"
  }

  async handleDownloadFiles({ url, outDir, currentLink, totalLink }) {
    const { url: normalizedUrl, isAlbum } = this._normalizeBunkrUrl(url)

    if (isAlbum) {
      await this._handleDownloadFilesFromAlbum({
        albumUrl: normalizedUrl,
        outDir,
        currentLink,
        totalLink,
      })
    } else {
      await this._handleDownloadSingleFile({
        fileUrl: normalizedUrl,
        outDir,
        currentLink,
        totalLink,
      })
    }
  }

  async _handleDownloadSingleFile({ fileUrl, outDir, currentLink, totalLink }) {
    printHeader({ type: "file", url: fileUrl, currentLink, totalLink })

    const fileId = await this._getFileId(fileUrl)

    await this._downloadFile({
      fileId,
      outDir,
      current: currentLink,
      total: totalLink,
      originalUrl: fileUrl,
    })
  }

  async _getFileId(fileUrl) {
    const { data: html } = await axios.get(fileUrl)
    const $ = cheerio.load(html)

    return $("script[data-file-id]").attr("data-file-id")
  }

  async _handleDownloadFilesFromAlbum({
    albumUrl,
    outDir,
    currentLink,
    totalLink,
  }) {
    const { ids: fileIds, totalSize } = await this._getAlbumData(albumUrl)

    printHeader({
      type: "album",
      url: albumUrl,
      meta: `${fileIds.length} files${totalSize ? `, ${totalSize}` : ""}`,
      currentLink,
      totalLink,
    })

    let current = 0
    for (const fileId of fileIds) {
      current++
      await this._downloadFile({
        fileId,
        outDir,
        current,
        total: fileIds.length,
        albumUrl,
        originalUrl: albumUrl,
      })
    }
  }

  async _downloadFile({
    fileId,
    outDir,
    current,
    total,
    albumUrl,
    originalUrl,
  }) {
    const { url, ext } = await this._getFileCdnData(fileId)

    await downloadFileWrapper({
      url,
      filename: `${fileId}${ext}`,
      outDir,
      current,
      total,
      isAlbum: Boolean(albumUrl),
      originalUrl,
    })
  }

  async _getAlbumData(albumUrl) {
    const { data: html } = await axios.get(albumUrl)
    const $ = cheerio.load(html)

    // Lấy total size + số files
    const text = $(".visitors .font-semibold").first().text().trim()
    const match = text.match(/\(([^)]+)\)\s*(\d+)\s*Files?/i)

    const totalSize = match?.[1] ?? ""
    const totolFiles = match ? Number(match[2]) : 0

    // Lấy tất cả ID videos
    let rawArrayString = ""
    $("script").each((_, el) => {
      const script = $(el).html()

      if (!script?.includes("window.albumFiles")) {
        return
      }

      const match = extractAlbumFiles(script)

      if (!match || rawArrayString) return

      rawArrayString = match
    })

    // Parse string sang Array
    const arrayString = rawArrayString
      .trim()
      .replace(/^window\.albumFiles\s*=\s*/, "")
      .replace(/;\s*$/, "")

    const albumFiles = new Function(`return ${arrayString}`)()

    return {
      totalSize,
      totolFiles,
      ids: albumFiles.map((af) => af.id),
    }
  }

  async _getFileCdnData(rawId) {
    const id = String(rawId)
    const data = await this._getPathFile(id)
    const session = await this._getSignSession(data.path)

    const url = new URL(data.path, data.mediafiles)

    url.searchParams.set("n", data.original)
    url.searchParams.set("token", session.token)
    url.searchParams.set("ex", session.ex)

    const extFile = path.extname(data.original)

    return {
      url: url.toString(),
      ext: extFile,
    }
  }

  async _getPathFile(id) {
    const { data } = await axios.post(this.DlBunkrURL, {
      id,
    })

    return data
  }

  async _getSignSession(pathFile) {
    const fullUrl = new URL(this.GlbApiSignCdnURL)
    fullUrl.searchParams.set("path", pathFile)

    const { data } = await axios.get(fullUrl.toString())

    return data
  }

  _normalizeBunkrUrl(url) {
    let normalizedUrl = url.replace(this.UrlRegex, this.StandardUrlRegex)

    const isAlbum = normalizedUrl.includes("/a/")
    if (isAlbum) {
      normalizedUrl += "?advanced=1"
    }

    return {
      url: normalizedUrl,
      isAlbum,
    }
  }

  isBunkrLink(url) {
    return this.UrlRegex.test(url)
  }
}

const bunkrHelper = new BunkrHelper()

module.exports = {
  bunkrHelper,
}
