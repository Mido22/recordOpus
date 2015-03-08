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
  }, function(e){ console.log('error occoured= '+e)});

  start.setAttribute('disabled',true);
  stop.setAttribute('disabled',true);
  start.onclick = startRecording;
  stop.onclick = stopRecording;
});


  function startRecording() {
    recorder = new Recorder(audioStream, {}, socket);
    recorder.start();
    start.setAttribute('disabled',true);
    stop.removeAttribute('disabled');
  }

  function stopRecording() {
    recorder.stop(onFileReady);
    start.removeAttribute('disabled');
    stop.setAttribute('disabled',true);    
  }



  function onFileReady(data) {
	  var url = data.url
	    , li = document.createElement('li')
	    , au = document.createElement('audio')
	    , hf = document.createElement('a');
	  
	  au.controls = true;
	  au.src = url;
	  hf.href = url;
	  hf.download = new Date().toISOString() + '.wav';
	  hf.innerHTML = hf.download;
	  li.appendChild(au);
	  li.appendChild(hf);
	  recordingslist.appendChild(li); 
  }
  