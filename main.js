const core = require('@actions/core')
const tc = require('@actions/tool-cache')
const os = require('os')

async function install() {
  const version = core.getInput('version')

  const platform = os.platform()
  const arch = os.arch()

  const name = `upterm_${platform === 'windows' ? 'linux' : platform}_${arch}`
  const url = `https://github.com/owenthereal/upterm/releases/${version === 'latest' ? 'latest/download' : `download/${version}`}/${name}.tar.gz`

  core.info(`Downloading upterm(${version}) for ${platform}(${arch}) from ${url}`)
  const tar = await tc.downloadTool(url)

  core.info(`Extracting ${tar}`)
  const path = await tc.extractTar(tar)

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
