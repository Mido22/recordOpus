#  Opus Audio Recorder



I am using [kazuki](https://github.com/kazuki)'s [opus library](https://github.com/kazuki/opus.js-sample) for compressing wav audio into opus packets on client side,  sending it to my server using `socket.io`, where I decode it and convert it back to `wav` file.


### Things needed:
* node (for server)
* ffmpeg (for media manipulation, OPTIONAL)


### set-up:
 * npm install 
 * `ffmpeg` must be pre-installed and must be part of path
 
 
### Sources:
  * [Opus](https://github.com/kazuki/opus.js-sample)
  * [Wav Recorder](https://github.com/mattdiamond/Recorderjs)
 
### Note 
  
  Still in the process of adding auto-upload option, but the audio format options for downloading are `.wav`, `.mp3` and `.ogg`
 
License
-------

See file LICENSE for further information.


Author
------

Ban Mido

