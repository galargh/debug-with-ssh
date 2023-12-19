const core = require('@actions/core')
const tc = require('@actions/tool-cache')

async function install() {
  const version = core.getInput('version')

  const arch = os.arch()
  const platform = os.platform()

  const name = `upterm_${platform === 'windows' ? 'linux' : platform}_${arch}`
  const url = `https://github.com/owenthereal/upterm/releases/download/${version}/${name}.tar.gz`
  const tar = await tc.downloadTool(url)
  const path = await tc.extractTar(tar)

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
