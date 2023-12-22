const core = require('@actions/core')
const tc = require('@actions/tool-cache')

const os = require('os')
const path = require('path')

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
  let cloudflaredPath = await tc.downloadTool(url)

  if (extension === '.tgz') {
    core.info(`Extracting ${cloudflaredPath}`)
    cloudflaredPath = await tc.extractTar(cloudflaredPath)
    cloudflaredPath = path.join(cloudflaredPath, 'cloudflared')
  }

  return cloudflaredPath
}

async function installCloudflared(platform, arch, version) {
  let cloudflaredPath = tc.find('cloudflared', version, arch)
  if (cloudflaredPath !== '') {
    core.info(`Found cached cloudflared(${version}) for ${platform}(${arch}) at ${cloudflaredPath}`)
  } else {
    core.info(`Downloading cloudflared(${version}) for ${platform}(${arch})`)
    binPath = await downloadCloudflared(platform, arch, version)

    extension = platform === 'windows' ? '.exe' : ''

    core.info(`Caching ${binPath}`)
    cachePath = await tc.cacheFile(binPath, `cloudflared${extension}`, 'cloudflared', version, arch)

    cloudflaredPath = path.join(cachePath, `cloudflared${extension}`)

    if (platform === 'linux') {
      core.info(`Setting ${cloudflaredPath} to 755`)
      fs.chmodSync(cloudflaredPath, '755')
    }
  }

  dirPath = path.dirname(cloudflaredPath)

  core.info(`Adding ${dirPath} which contains ${cloudflaredPath} to PATH`)
  core.addPath(dirPath)
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
