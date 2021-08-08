(() => {
  // src/fcpxml.ts
  var AssetClip = class {
    constructor(cut, prevOffset, fileName) {
      this.assetClip = document.createElement("asset-clip");
      this.start = cut.start;
      this.duration = cut.end - cut.start;
      this.offset = prevOffset + this.duration;
      Object.assign(this.assetClip, {
        offset: math.fraction(this.offset).toString(),
        name: fileName,
        format: "r1",
        tcFormat: "NDF",
        start: this.start,
        ref: "r2",
        enabled: "1",
        duration: this.duration
      });
    }
  };
  var Cut = class {
    constructor(start, end) {
      this.start = start;
      this.end = end;
    }
  };
  var FCPXML = class {
    constructor(media, cuts) {
      this.xmlParser = new DOMParser();
      this.xml = this.xmlParser.parseFromString('<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE fcpxml><fcpxml version="1.9"><resources><format id="r0" width="1920" name="FFVideoFormat1080p30" height="1080" frameDuration="1/30s"/><format id="r1" width="1280" name="FFVideoFormat720p30" height="720" frameDuration="1/30s"/></resources><library><event name="output"><project name="output"><sequence format="r0" duration="271/15s" tcFormat="NDF" tcStart="3600/1s"><spine></spine></sequence></project></event></library></fcpxml>', "text/xml");
      this.cuts = [];
      this.media = media;
      this.cuts = cuts;
      this.setDuration().then();
    }
    async write() {
      this.setAsset();
      this.setAssetClips();
    }
    setAssetClips() {
      for (let cut of this.cuts) {
        this.duration -= cut.end - cut.start;
      }
      const sequence = this.xml.querySelector("sequence");
      if (sequence == null) {
        console.error("Either Default xml preset or selection is flawed");
        return;
      }
      sequence.setAttribute("duration", math.fraction(this.duration).toString());
      const spine = this.xml.querySelector("spine");
      if (spine == null) {
        console.error("Either Default xml preset or selection is flawed");
        return;
      }
      let prevOffset = 3600;
      for (let cut of this.cuts) {
        const assetClip = new AssetClip(cut, prevOffset, this.media.name);
        spine.appendChild(assetClip.assetClip);
        prevOffset = assetClip.offset;
      }
    }
    setAsset() {
      const resources = this.xml.querySelector("resources");
      const asset = document.createElement("format");
      Object.assign(asset, {
        hasVideo: "1",
        audioSources: "1",
        hasAudio: "1",
        name: this.media.name,
        format: "r1",
        start: "0/1s",
        audioChannels: "2",
        id: "r2",
        duration: this.duration
      });
      const media_rep = document.createElement("media-rep");
      Object.assign(media_rep, {
        kind: "original-media",
        src: ""
      });
      if (resources == null) {
        console.error("Either Default xml preset or selection is flawed");
        return;
      }
      resources.appendChild(asset);
    }
    async setDuration() {
      let video = document.createElement("video");
      video.src = URL.createObjectURL(this.media);
      video.load();
      await new Promise((resolve) => video.ondurationchange = () => resolve());
      this.duration = video.duration;
      video.remove();
    }
    async addCut(cut) {
      this.cuts.push(cut);
    }
    async addCuts(cuts) {
      this.cuts.concat(cuts);
    }
    async download() {
      let link = document.createElement("a");
      link.href = URL.createObjectURL(this.xml);
      link.download = `result.fcpxml`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };
  var FFmpegOutputParser = class {
    static async getCuts(ffmpeg_out) {
      const cuts = [];
      const out = await ffmpeg_out.text();
      const split = out.split("\n");
      const startString = "silence_start";
      let endString = "silence_end";
      let times = [-1, -1];
      for (let line of split) {
        if (line.includes(startString)) {
          times[0] = parseFloat(line.split("=")[1]);
        } else if (line.includes(endString)) {
          times[1] = parseFloat(line.split("=")[1]);
        }
        if (!times.includes(-1)) {
          cuts.push(new Cut(times[0], times[1]));
          times[0] = -1;
          times[1] = -1;
        }
      }
      return cuts;
    }
  };

  // src/app.ts
  var createFFmpeg;
  var fetchFile;
  var ffmpeg;
  window.onload = () => load();
  async function load() {
    if (typeof SharedArrayBuffer === "undefined") {
      document.getElementById("message").innerHTML = "Error: Please use latest Chrome/Firefox/Edge";
      return -1;
    }
    createFFmpeg = FFmpeg.createFFmpeg;
    fetchFile = FFmpeg.fetchFile;
    ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
  }
  var main = async (event) => {
    const message = document.getElementById("message");
    if (event.target.files == null) {
      document.getElementById("message").innerHTML = "Error: You did not select any files!";
      return -1;
    }
    let videoFile = event.target.files[0];
    const { name } = videoFile;
    message.innerHTML = "Loading ffmpeg-core.js";
    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
    }
    message.innerHTML = "Start Extracting Silence Interval";
    ffmpeg.FS("writeFile", name, await fetchFile(videoFile));
    let noise = -27;
    let pause_duration = 0.5;
    await ffmpeg.run("-i", name, "-af", `silencedetect=n=${noise}dB:d=${pause_duration},ametadata=mode=print:file=plswork.txt`, "-f", "null", "-");
    message.innerHTML = "Completed Extraction";
    try {
      let data = ffmpeg.FS("readFile", "plswork.txt");
      try {
        const output = new Blob([data.buffer], { type: ".txt" });
        const cuts = await FFmpegOutputParser.getCuts(output);
        const fcpxml = new FCPXML(videoFile, cuts);
        await fcpxml.write();
        await fcpxml.download();
      } catch (error) {
        console.log(error);
      }
    } catch (error) {
      message.innerHTML = "Input File has no audio track";
      await new Promise((r) => setTimeout(r, 1e3));
    }
    message.innerHTML = "Choose a Clip";
  };
  var elm = document.getElementById("media-upload");
  elm.addEventListener("change", main);
})();
