import * as _math from 'mathjs' // Hope this line doesn't cause any issue
// In worst case leverage esbuild, use standard import and leverage external feature

declare global {
  const math: typeof _math
}

class cut {
  start: number
  end: number
  enabled: boolean
  offset: string
  startTimeCode: number // In seconds, represents starting offset
  // Refer to https://beginnersapproach.com/davinci-resolve-start-timecode/

  constructor (start: number, end: number, enabled: boolean = false, startTimeCode: number = 3600) {
    this.start = start
    this.end = end
    this.enabled = enabled
    this.startTimeCode = startTimeCode
    this.offset = start === 0 ? `${startTimeCode}/1` : math.fraction(3600 + startTimeCode).toString()
  }
}

// Let FCPXML only support Video First
// TODO: upgrade to support Audio CLEANLY

class FCPXML {
  // Constants:
  xmlParser = new DOMParser()
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
  MAX_CUTS_TO_SAVE: number
  duration!: number // Well... Not the ideal practice but works
  cuts: cut[] = []
  media: File

  // Only to set the states
  // Don't do any processing
  constructor (media: File, cuts: cut[], MAX_CUTS_TO_SAVE = 50) {
    this.media = media // If I want to determine media type (video/audio), add it here
    this.cuts = cuts
    this.MAX_CUTS_TO_SAVE = MAX_CUTS_TO_SAVE
    this.setDuration().then()
  }

  // Write cuts to the xml
  async write () {

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

  async addCut (cut: cut) {
    this.cuts.push(cut)
  }

  async addCuts (cuts: cut[]) {
    this.cuts.concat(cuts)
  }

  async download (objectURL: string) {
    let link = document.createElement('a')
    link.href = objectURL
    link.download = `result.fcpxml`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
}

// Parses output (blob) from ffmpeg
// and convert to cuts
class FFmpegOutputParser {
  static async getCuts (ffmpeg_out: Blob) {
    //
    const cuts: cut[] = []
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
        cuts.push(new cut(times[0], times[1]))
        // console.log(`${times[0]} ${times[1]}`)
        times[0] = -1.0
        times[1] = -1.0
      }
    }
  }
}