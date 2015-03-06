navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

var recorder
  , input
  , start
  , stop
  , recordingslist
  , socket
  , audioStream 
;
    
document.addEventListener("DOMContentLoaded", function() {
  socket = io();
  start = document.getElementById('start');
  stop = document.getElementById('stop');
  recordingslist = document.getElementById('recordingslist');
  audio_context = new AudioContext;
  navigator.getUserMedia({audio: true}, function(stream) {
        audioStream = stream;
      start.removeAttribute('disabled');
      //startRecording();
  }, function(e){ console.log('error occoured= '+e)});

  start.setAttribute('disabled',true);
  stop.setAttribute('disabled',true);
  start.onclick = startRecording;
  stop.onclick = stopRecording;
});


  function startRecording() {
    console.log('starting...');
    recorder = new Recorder(audioStream, {}, socket);
    recorder.start();
    start.setAttribute('disabled',true);
    stop.removeAttribute('disabled');
  }

  function stopRecording() {
    console.log('stopping...');
    recorder.stop(createDownloadLink);
    start.removeAttribute('disabled');
    stop.setAttribute('disabled',true);    
  }



  function createDownloadLink(url) {
	  var li = document.createElement('li');
	  var au = document.createElement('audio');
	  var hf = document.createElement('a');
	  
	  au.controls = true;
	  au.src = url;
	  hf.href = url;
	  hf.download = new Date().toISOString() + '.wav';
	  hf.innerHTML = hf.download;
	  li.appendChild(au);
	  li.appendChild(hf);
	  recordingslist.appendChild(li); 
  }
  