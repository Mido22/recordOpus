#  Opus Audio Recorder



I am using [kazuki](https://github.com/kazuki)'s [opus library](https://github.com/kazuki/opus.js-sample) for compressing wav audio into opus packets on client side,  sending it to my server using `socket.io`, where I decode it and convert it back to `wav` file.


### Things needed:
* node (for server)
* ffmpeg (for media manipulation, OPTIONAL)


### set-up:
 * npm install 
 * `ffmpeg` must be pre-installed and must be part of path
 * 
 
 
 ### Sources:
  * [Opus](https://github.com/kazuki/opus.js-sample)
  * [Wav Recorder](https://github.com/mattdiamond/Recorderjs)
 
 ### Note 
  
  The app is not yet complete, there are some bugs, currently, ffmpeg is yet be added. For only, data is converted and and uploaded to server at one go, planning to change it, give user an option to upload at particular time intervals( say every 15 seconds) and then finally merge all the wav files and give him a single url to download from, probably give him an option to convert it to .ogg or .mp3 server side.
 
License
-------

See file LICENSE for further information.


Author
------

Ban Mido

