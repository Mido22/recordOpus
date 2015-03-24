var app = require('express')()
  , open = require("open")
  , child_process = require('child_process')
  , OPUS_PATH =  './server/opus.worker.js'
  , TMP_PATH = 'uploads';
app.use("/", require('express').static(__dirname.replace('server', 'client')));
app.use("/uploads", require('express').static(__dirname.replace('server', TMP_PATH)));

var http = require('http').Server(app);
http.listen(80, function(){
    console.log('listening on 80');
    open("http://localhost:80");
});

var opusWorker=child_process.fork(OPUS_PATH);
opusWorker.on('message', function(m) {
	io.emit('link', m);
});

var io = require('socket.io')(http);
io.on('connection', function(socket){  
  socket.on('decode', function(data){
		opusWorker.send({
			command:'decode',
			data : data		
		});
  });  
});