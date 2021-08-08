import * as _math from 'mathjs'
// import * as console from 'console' // Hope this line doesn't cause any issue
// In worst case leverage esbuild, use standard import and leverage external feature

declare global {
  const math: typeof _math
}

// Rationalize a decimal to fraction (in seconds)
function rationalize (value: number) {
  return math.format(math.fraction(value), { fraction: 'ratio' }) + 's'
}

export class AssetClip {
  assetClip = document.createElement('asset-clip')
  start: number
  duration: number
  offset: number

  constructor (cut: Cut, prevOffset: number, fileName: string) {
    this.start = cut.start
    this.duration = cut.end - cut.start
    this.offset = prevOffset + this.duration
    // Fill in above info in assetClip
    setAttributes(this.assetClip,
      {
        'offset': rationalize(this.offset),
        'name': fileName,
        'format': 'r1',
        'tcFormat': 'NDF',
        'start': rationalize(this.start),
        'ref': 'r2', // TODO: should r2 be factored out into separate variable?
        'enabled': '1',
        'duration': rationalize(this.duration)
      })
  }
}

export class Cut {
  start: number
  end: number

  // Refer to https://beginnersapproach.com/davinci-resolve-start-timecode/

  constructor (start: number, end: number) {
    this.start = start
    this.end = end
  }
}

// Let FCPXML only support Video First
// TODO: upgrade to support Audio CLEANLY

export class FCPXML {
  // Constants:
  xmlParser = new DOMParser() // Parser
  // var processor = new XSLTProcessor(); Not sure if I will need to use xpath + xslt
  // Note: below xml is only for video
  xml = this.xmlParser.parseFromString(
    '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE fcpxml><fcpxml version="1.9"><resources>' +
    '<format id="r0" width="1920" name="FFVideoFormat1080p30" height="1080" frameDuration="1/30s"/>' +
    '<format id="r1" width="1280" name="FFVideoFormat720p30" height="720" frameDuration="1/30s"/>' +
    '</resources><library>' +
    '<event name="output">' +
    '<project name="output">' +
    '<sequence format="r0" duration="271/15s" tcFormat="NDF" tcStart="3600/1s">' +
    '<spine>' +
    '</spine></sequence></project></event></library></fcpxml>', 'text/xml')
  // TODO: setup width and height properly
  // TODO: merge tcStart with same properly in cuts

  // Internal States
  // MAX_CUTS_TO_SAVE: number
  duration!: number // Well... Not the ideal practice but works
  cuts: Cut[] = []
  media: File

  // Only to set the states
  // Don't do any processing
  constructor (media: File, cuts: Cut[]) {
    this.media = media // If I want to determine media type (video/audio), add it here
    this.cuts = cuts
    // this.MAX_CUTS_TO_SAVE = MAX_CUTS_TO_SAVE
    // this.setDuration().then()
    // Above code causes premature return
    // duration is set long after other class methods are called...

  }

  // Write changes to the xml
  // Also handles async operations that cannot be placed in constructor (Factory)
  async write () {
    // Adds the input file as <asset> under <resources>
    await this.setDuration()
    this.setAsset()
    this.setAssetClips()
  }

  // Adds the Clips to the HTML
  setAssetClips () {

    // Calculate duration (for <sequence>)
    // duration: duration of video after cut
    for (let cut of this.cuts) {
      this.duration -= cut.end - cut.start
    }

    // Add duration to <sequence>
    const sequence = this.xml.querySelector('sequence')
    if (sequence == null) {
      console.error('Either Default xml preset or selection is flawed')
      return
    }
    sequence.setAttribute('duration', rationalize(this.duration))

    // Set Asset-clips

    // Selecting spine
    const spine = this.xml.querySelector('spine')
    if (spine == null) {
      console.error('Either Default xml preset or selection is flawed')
      return
    }
    // And add each Asset-clips as spine's child
    let prevOffset = 3600 // TODO: merge all incidences of 3600 together
    for (let cut of this.cuts) {
      const assetClip = new AssetClip(cut, prevOffset, this.media.name)
      spine.appendChild(assetClip.assetClip)
      prevOffset = assetClip.offset
    }
  }

  // Add proper asset value
  setAsset () {
    // Navigate to resources
    const resources = this.xml.querySelector('resources')
    // Add asset (no attributes)
    const asset = document.createElement('asset')
    // Set attributes for asset
    setAttributes(asset, {
      'hasVideo': '1',
      'audioSources': '1',
      'hasAudio': '1',
      'name': this.media.name,
      'format': 'r1',
      'start': '0/1s',
      'audioChannels': '2', // TODO: address single channel old school case
      'id': 'r2',
      'duration': rationalize(this.duration)
    })
    // Add child node to asset
    const media_rep = document.createElement('media-rep')
    setAttributes(media_rep, {
      kind: 'original-media',
      src: '' // TODO: determine if there's a better way to check src
    })
    asset.appendChild(media_rep)
    // Defensive coding
    // Ideally this should never be executed
    if (resources == null) {
      console.error('Either Default xml preset or selection is flawed')
      return
    }
    resources.appendChild(asset)
  }

  async setDuration () {
    // Load the video in an HTML element
    let video = document.createElement('video')
    video.src = URL.createObjectURL(this.media)
    video.load() // not sure if this is needed

    // Wait for the video to finish loading
    await new Promise<void>(resolve => (video.ondurationchange = () => resolve()))

    this.duration = video.duration
    video.remove()
  }

  async addCut (cut: Cut) {
    this.cuts.push(cut)
  }

  async addCuts (cuts: Cut[]) {
    this.cuts.concat(cuts)
  }

  async download () {

    // Generate a download button (to be clicked on)
    let link = document.createElement('a')

    // Serialize and attach this.xml to the download button
    const xmlSerializer = new XMLSerializer()
    link.href = URL.createObjectURL(
      new Blob([
      xmlSerializer.serializeToString(this.xml).
      replaceAll('xmlns="http://www.w3.org/1999/xhtml"', '')],
      { type: 'text/xml' }))
    // link.href = URL.createObjectURL(new Blob([this.xml.documentElement.outerHTML],
    //   { type: 'text/xml' }))
    link.download = `result.fcpxml`
    document.body.appendChild(link)

    // Click the download button
    link.click()
    // Remove the download button
    link.remove()
  }

}

function setAttributes (element: Element, Attrs: { [key: string]: string }) {
  for (let key in Attrs) {
    element.setAttribute(key, Attrs[key])
  }
}

// Parses output (blob) from ffmpeg
// and convert to cuts
// Credit to Aidan
export class FFmpegOutputParser {
  static async getCuts (ffmpeg_out: Blob) {
    //
    const cuts: Cut[] = []
    const out = await ffmpeg_out.text()
    // Break output line by line
    const split = out.split('\n')

    const startString = 'silence_start'
    let endString = 'silence_end'
    let times = [-1.0, -1.0]
    for (let line of split) {
      if (line.includes(startString)) {
        times[0] = parseFloat(line.split('=')[1])
      } else if (line.includes(endString)) {
        times[1] = parseFloat(line.split('=')[1])
      }
      if (!times.includes(-1.0)) {
        cuts.push(new Cut(times[0], times[1]))
        // console.log(`${times[0]} ${times[1]}`)
        times[0] = -1.0
        times[1] = -1.0
      }
    }
    return cuts
  }
}
