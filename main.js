const core = require('@actions/core')
const tc = require('@actions/tool-cache')

const os = require('os')

function getPlatformAndArch() {
  let platform, arch
  switch(os.platform()) {
    case 'darwin':
      platform = 'darwin'
      break
    case 'win32':
      platform = 'windows'
      break
    case 'linux':
      platform = 'linux'
      break
    default:
      throw new Error(`Unsupported platform: ${os.platform()}`)
  }

  switch(os.arch()) {
    case 'x64':
      arch = 'amd64'
      break
    case 'x32':
      arch = '386'
      break
    case 'arm64':
      arch = 'arm64'
      break
    default:
      throw new Error(`Unsupported architecture: ${os.arch()}`)
  }

  // https://github.com/cloudflare/cloudflared/issues/389
  if (platform === 'darwin') {
    arch = 'amd64'
  }

  return [platform, arch]
}

async function downloadCloudflared(platform, arch, version) {
  let extension
  switch(platform) {
    case 'darwin':
      extension = '.tgz'
      break
    case 'windows':
      extension = '.exe'
      break
    default:
      extension = ''
  }

  const url = `https://github.com/cloudflare/cloudflared/releases/${version === 'latest' ? 'latest/download' : `download/${version}`}/cloudflared-${platform}-${arch}${extension}`

  core.info(`Downloading cloudflared(${version}) for ${platform}(${arch}) from ${url}`)
  let path = await tc.downloadTool(url)

  if (extension === '.tgz') {
    core.info(`Extracting ${path}`)
    path = await tc.extractTar(path)
  }
}

async function installCloudflared(platform, arch, version) {
  let path = tc.find('cloudflared', version, arch)
  if (path !== undefined) {
    core.info(`Found cached cloudflared(${version}) for ${platform}(${arch}) at ${path}`)
  } else {
    core.info(`Downloading cloudflared(${version}) for ${platform}(${arch})`)
    path = await downloadCloudflared(platform, arch, version)

    core.info(`Caching ${path}`)
    path = await tc.cacheFile(path, 'cloudflared', 'cloudflared', version, arch)
  }

  core.info(`Adding ${path} to PATH`)
  core.addPath(path)
}

async function run() {
  try {
    const version = core.getInput('version')

    const [platform, arch] = getPlatformAndArch()

    await installCloudflared(platform, arch, version)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
