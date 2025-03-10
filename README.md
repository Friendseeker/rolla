<p align="center">
  <a href="#">
    <img alt="Rolla" width="128px" height="128px" src="https://raw.githubusercontent.com/RollaEditor/rolla/main/images/logo-192.png">
  </a>
</p>

# Rolla

[![Netlify Status](https://api.netlify.com/api/v1/badges/98668f69-e768-46db-9433-024c7b87461d/deploy-status)](https://app.netlify.com/sites/rolla-new/deploys)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Rolla is a progressive web application that automatically edits video and audio
footage. It does this by scanning the clip for silent segments and performs
non-destructive edits in an FCPXML file - a format that is readable by video
editing applications such as Davinci Resolve and Final Cut. Rolla runs entirely
in the browser and can be installed in one click for offline use on any platform.

Check it out: [https://rolla.netlify.app](https://rolla.netlify.app)

## How to use

Drag and drop, or click to select the footage you want Rolla to edit. When the
edit is ready, it will appear as a download.

The downloaded file contains a timeline. You can import it into Davinci Resolve
or Final Cut Pro for further production.

For those concerned about privacy:
Rolla does not send your footage to a server - your files are processed locally
on your device.

## Browser support

Rolla works on most mainstream browsers, with a notable exception being Safari.
Unfortunately, Safari does not support the SharedArrayBuffer feature that is
required for Rolla to function.

## Editor support

Davinci Resolve, Final Cut Pro
