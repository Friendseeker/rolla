/// <reference path="types/index.d.ts" />
// import * as FFmpeg from './types'; // TODO: if it doesn't work, try declare global var
// declare global ffmpeg: ffmpeg

// declare var FFmpeg
import { FFmpeg } from './types'

let createFFmpeg, fetchFile: { (data: string | File | Blob): Promise<Uint8Array> }, ffmpeg: FFmpeg.ffmpeg
window.onload = () => load()

async function load () {
  if (typeof SharedArrayBuffer === 'undefined') {
    document.getElementById('message')!.innerHTML =
      'Error: Please use latest Chrome/Firefox/Edge'
      return -1  // TODO: determine if it does break execution
  }
  createFFmpeg = FFmpeg.createFFmpeg // ffmpeg is exported from ffmpeg script
  fetchFile = FFmpeg.fetchFile
  ffmpeg = createFFmpeg({ log: true })
  await ffmpeg.load() // key line: loading wasm
}
interface HTMLInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

const trim = async (event: HTMLInputEvent) => {
  // Explanation:
  // Trim is called by EventListener elm
  // EventListener feeds in Event as input
  // then {target : {files}} is just a destructuring assignment
  // standing for Event.target.files
  const message = document.getElementById('message')!
  // OH MY GOD it picked it up
  // The not selecting file causing error
  // as it notified me automatically that videoFile can be null
  if (event.target.files == null) {
    document.getElementById('message')!.innerHTML =
      'Error: You did not select any files!'
    return -1  // TODO: determine if it does break execution
  }
  let videoFile = event.target.files[0]
  const { name } = videoFile

  message.innerHTML = 'Loading ffmpeg-core.js'
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load()
  }
  message.innerHTML = 'Start Extracting Silence Interval'
  ffmpeg.FS('writeFile', name, await fetchFile(videoFile))
  // silence detection
  let noise = -27
  let pause_duration = 0.5
  await ffmpeg.run(
    '-i',
    name,
    '-af',
    `silencedetect=n=${noise}dB:d=${pause_duration},ametadata=mode=print:file=plswork.txt`,
    '-f',
    'null',
    '-'
  )
  message.innerHTML = 'Completed Extraction'

  try {
    let data = ffmpeg.FS('readFile', 'plswork.txt')
    // const objectURL = URL.createObjectURL(new Blob([data.buffer], {type: '.txt'}));
    try {
      const outputBlob = new Blob([data.buffer], { type: '.txt' })
      // const objectURL = URL.createObjectURL(outputBlob); // might not be needed
      // await download(objectURL) // TODO: fix this
      await process(outputBlob, videoFile)
    } catch (error) {
      console.log(error)
    }
  } catch (error) {
    message.innerHTML = 'Input File has no audio track'
    await new Promise(r => setTimeout(r, 1000)) // sleep for 1 sec
  }
  message.innerHTML = 'Choose a Clip'
}

async function DurationChange (video) {
  return new Promise(resolve => (video.ondurationchange = () => resolve()))
}

const elm = document.getElementById('media-upload')
elm!.addEventListener('change', trim)

// Aidan's works:



