#  Opus Audio Recorder



I am using [kazuki](https://github.com/kazuki)'s [opus library](https://github.com/kazuki/opus.js-sample) for compressing wav audio into opus packets on client side,  sending it to my server using `socket.io`, where I decode it and convert it back to `wav` file.


### Things needed:
* node (for server)
* ffmpeg (for media manipulation, OPTIONAL)


### set-up:
 * npm install 
 * `ffmpeg` must be pre-installed and must be part of path
 
to start the application, just type `npm start` in the project root folder.

 
### Sources:
  * [Opus](https://github.com/kazuki/opus.js-sample)
  * [Wav Recorder](https://github.com/mattdiamond/Recorderjs)
 
### Features 
  
  * Can either upload recording in one shot, 
  * able to save in various formats( wav, mp3 and ogg) (Note: ffmpeg must be installed in system for this.)
 
License
-------

See file LICENSE for further information.


Author
------

Ban Mido

