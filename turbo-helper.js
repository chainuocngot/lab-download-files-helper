const axios = require("axios")
const { downloadFileWrapper, logErrorToFile } = require("./util")

class TurboHelper {
  constructor() {
    this.UrlRegex = /^https:\/\/turbo\.cr\/d\/[A-Za-z0-9_-]+$/
    this.SignURL = "https://turbo.cr/api/sign"
  }

  async handleDownloadFile({ url, outDir, current, total }) {
    const fileId = this._getTurboId(url)

    try {
      const { original_filename, url: cdnUrl } = await this._getFileData(fileId)

      await downloadFileWrapper({
        url: cdnUrl,
        filename: original_filename,
        outDir,
        current,
        total,
      })
    } catch (error) {
      await logErrorToFile(`TURBO | ${fileId}`)
      console.error(`❌ [${error.message}]`)
    }
  }

  async _getFileData(fileId) {
    const url = new URL(this.SignURL)

    url.searchParams.set("v", fileId)

    const { data } = await axios.get(url.toString())

    return data
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
