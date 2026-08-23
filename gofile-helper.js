const { downloadFileWrapper, logErrorToFile } = require("./util")

class GofileHelper {
  constructor() {
    this.ApiURL = "https://api.gofile.io/contents"
  }

  async handleDownloadFile(fileId) {
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
      await logErrorToFile(`GOFILE | ${fileId}`)
      console.error(`❌ [${error.message}]`)
    }
  }

  _getFileData() {}
}

const gofileHelper = new GofileHelper()

module.exports = {
  gofileHelper,
}
