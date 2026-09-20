const axios = require("axios")
const path = require("path")
const { downloadFileWrapper } = require("./util")
const { printHeader } = require("./progress")

class TurboHelper {
  constructor() {
    this.UrlRegex = /^https:\/\/turbo\.cr\/d\/[A-Za-z0-9_-]+$/
    this.SignURL = "https://turbo.cr/api/sign"
  }

  async handleDownloadFile({ url, outDir, currentLink, totalLink }) {
    printHeader({ type: "file", url, currentLink, totalLink })

    const fileId = this._getTurboId(url)

    const { url: cdnUrl, ext } = await this._getFileData(fileId)
    await downloadFileWrapper({
      url: cdnUrl,
      filename: `${fileId}${ext}`,
      outDir,
      current: currentLink,
      total: totalLink,
      originalUrl: url,
    })
  }

  async _getFileData(fileId) {
    const url = new URL(this.SignURL)

    url.searchParams.set("v", fileId)

    const { data } = await axios.get(url.toString())

    const extFile = path.extname(data.filename || data.original_filename)

    return { ...data, ext: extFile }
  }

  _getTurboId(url) {
    const id = url.split("/").at(-1)
    return id ?? null
  }

  isTurboLink(url) {
    return this.UrlRegex.test(url)
  }
}

const turboHelper = new TurboHelper()

module.exports = {
  turboHelper,
}
