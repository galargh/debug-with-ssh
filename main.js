const core = require('@actions/core')
const tc = require('@actions/tool-cache')
const exec = require('@actions/exec')

const os = require('os')
const path = require('path')
const fs = require('fs')

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

async function installTmux(platform, arch, version) {
  let tmuxPath = tc.find('tmux', version, arch)
  if (tmuxPath !== '') {
    core.info(`Found cached tmux(${version}) for ${platform}(${arch}) at ${tmuxPath}`)
  } else {
    let binPath
    switch(platform) {
      case 'linux':
        // Assuming Ubuntu
        await exec.exec('sudo apt update')
        await exec.exec('sudo apt remove -y tmux')
        await exec.exec(`sudo apt install -y tmux${version === 'latest' ? '' : `=${version}`}`)
        binPath = (await exec.getExecOutput('which tmux')).stdout.trim()
        break
      case 'darwin':
        await exec.exec('brew update')
        await exec.exec(`brew install --force tmux${version === 'latest' ? '' : `@${version}`}`)
        binPath = (await exec.getExecOutput('which tmux')).stdout.trim()
        break
      case 'windows':
        // https://github.com/actions/toolkit/issues/229
        await exec.exec('C:\\msys64\\usr\\bin\\bash.exe', ['-lc', `pacman -Sy --noconfirm tmux${version === 'latest' ? '' : `=${version}`}`])
        binPath = (await exec.getExecOutput('C:\\msys64\\usr\\bin\\bash.exe', ['-lc', 'which tmux'])).stdout.trim()
        break
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }

    core.info(`Caching ${binPath}`)
    cachePath = await tc.cacheFile(binPath, 'tmux', 'tmux', version, arch)

    tmuxPath = path.join(cachePath, 'tmux')
  }

  dirPath = path.dirname(tmuxPath)

  core.info(`Adding ${dirPath} which contains ${tmuxPath} to PATH`)
  core.addPath(dirPath)
}

async function run() {
  try {
    const cloudflaredVersion = core.getInput('cloudflared')
    const tmuxVersion = core.getInput('tmux')

    const [platform, arch] = getPlatformAndArch()

    await installCloudflared(platform, arch, cloudflaredVersion)
    await installTmux(platform, arch, tmuxVersion)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
