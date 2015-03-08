var app = require('express')()
  , child_process = require('child_process')
  , OPUS_PATH =  './server/opus.worker.js'
  , TMP_PATH = 'uploads';

app.use("/", require('express').static(__dirname.replace('server', 'client')));
app.use("/uploads", require('express').static(__dirname.replace('server', TMP_PATH)));

var http = require('http').Server(app);
var io = require('socket.io')(http);

io.on('connection', function(socket){
  
  socket.on('recording', function(data){
		opusWorker.send({
			command:'decode',
			data : data		
		});
  });
  
});

http.listen(3001, function(){
  console.log('listening on 3001');
});

var opusWorker=child_process.fork(OPUS_PATH);
opusWorker.send({	
	command:'init', 
	config:{
		samplingRate:16000,
		channels: 1
	}
}); 

opusWorker.on('message', function(m) {
	io.emit('link', m);
});
 /* */
