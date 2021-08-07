// Show TypeScript that:
//  - Constant FFmpeg does exist
//  - It exists as a module
import * as _FFmpeg from '@ffmpeg/ffmpeg';

declare global {
  const FFmpeg: typeof _FFmpeg;
}

// Key components for ffmpeg library, declared to be initialized later in load()
let createFFmpeg, fetchFile: { (data: string | File | Blob): Promise<Uint8Array> }, ffmpeg: _FFmpeg.FFmpeg

// Execute load() when window (main page) loaded
window.onload = () => load()

// Loads FFmpeg library if browser is supported
// Otherwise display error and return -1 prematurely
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

// Workaround for TypeScript's limitation of detecting
// that file can be a attribute of target
// Credit for StackOverflow
interface HTMLInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

// Called after user uploaded a video/audio file
// Detects the silent interval
// and displays an fcpxml download prompt (for which contains the silent intervals)
const main = async (event: HTMLInputEvent) => {

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
      // await download(objectURL)
      await process(outputBlob, videoFile) // TODO: replace it with a class/module
    } catch (error) {
      console.log(error)
    }
  } catch (error) {
    message.innerHTML = 'Input File has no audio track'
    await new Promise(r => setTimeout(r, 1000)) // sleep for 1 sec
  }
  message.innerHTML = 'Choose a Clip'
}

// Wait for video duration to refresh
// Application: other functions can use it as an intermediary step to get video duration
async function waitForDurationChange (video: HTMLVideoElement) {
  return new Promise<void>(resolve => (video.ondurationchange = () => resolve()))
}

// Execute main when user finishes uploading
const elm = document.getElementById('media-upload')
elm!.addEventListener('change', main)
