navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

var recorder
  , input
  , start
  , stop
  , recordingslist
  , socket
  , autoUpload = document.getElementById('autoUpload')
  , intervalTime = document.getElementById('intervalTime')
;

socket = io();
socket.on('link', onServerFileReady);  
function onServerFileReady(data){
    //if(self.uid!== data.uid)	return;
    data.path = data.path.replace('\\', '/');
    var url = location.protocol + '//' + location.host + '/'+data.path;
    data.url = url;
    tmp =url.split('/');
    data.name = tmp[tmp.length-1];
    addFileLink(data);			
}

document.addEventListener("DOMContentLoaded", function() {
  socket = io();
  start = document.getElementById('start');
  stop = document.getElementById('stop');
  recordingslist = document.getElementById('recordingslist');
  audio_context = new AudioContext;
  navigator.getUserMedia({audio: true}, function(stream) {
        window.stream = stream;
      start.removeAttribute('disabled');
  }, function(e){ console.log('error occoured= '+e)});

  start.setAttribute('disabled',true);
  stop.setAttribute('disabled',true);
  start.onclick = startRecording;
  stop.onclick = stopRecording;
});

function startRecording() {
  recorder = new OpusRecorder(window.stream, {
     autoUpload: autoUpload.checked,
     intervalTime: Math.round(intervalTime.value * 1000)
  }, socket);
  recorder.start();
  start.setAttribute('disabled',true);
  stop.removeAttribute('disabled');
}

function stopRecording() {
  recorder.stop(addFileLink);
  start.removeAttribute('disabled');
  stop.setAttribute('disabled',true);    
}

function addFileLink(data) {
    
  var url = data.url
    , li = document.createElement('li')
    , au = document.createElement('audio')
    , hf = document.createElement('a')
  ;
  if(document.querySelector('li.'+data.uid))  return;
  li.className += " ."+data.uid;
  au.controls = true;
  au.src = url;
  hf.href = url;
  hf.download = data.name || 'download';
  hf.innerHTML = hf.download;
  li.appendChild(au);
  li.appendChild(hf);
  recordingslist.appendChild(li); 
}
  
