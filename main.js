const core = require('@actions/core')
const tc = require('@actions/tool-cache')
const os = require('os')

async function install() {
  const version = core.getInput('version')

  const platform = os.platform()
  const arch = os.arch()

  // https://github.com/cloudflare/cloudflared/issues/389
  let name
  if (platform === 'darwin') {
    name = 'cloudflared-darwin-amd64.tgz'
  } else if (platform === 'wind32') {
    name = `cloudflared-windows-${arch === 'x64' ? 'amd64' : arch}.exe`
  } else {
    name = `cloudflared-linux-${arch === 'x64' ? 'amd64' : arch}`
  }

  const url = `https://github.com/cloudflare/cloudflared/releases/${version === 'latest' ? 'latest/download' : `download/${version}`}/${name}`

  core.info(`Downloading cloudflared(${version}) for ${platform}(${arch}) from ${url}`)
  let path = await tc.downloadTool(url)

  if (name.endsWith('.tgz')) {
    core.info(`Extracting ${path}`)
    path = await tc.extractTar(path)
  }

  core.info(`Adding ${path} to PATH`)
  core.addPath(path)
}

async function run() {
  try {
    await install()
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
