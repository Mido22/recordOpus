(function(window){

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.audioContext = new AudioContext();
    var WORKER_PATH = '/scripts/recorderWorker.js';

    function Recorder(stream, cfg, socket){
    
        this.uid = genRandom();
        var config = cfg || {}
			, self = this
            , bufferLen = 16384
            , intervalTime = config.intervalTime || 60000
            , autoUpload = !!config.autoUpload
            , type = config.type || 'wav'
            , callback = config.callback
            , recording = false
            , worker = new Worker(config.workerPath || WORKER_PATH)
            , source = window.audioContext.createMediaStreamSource(stream)
            , sampleRate = source.context.sampleRate
            , vInterval
            , ctx = source.context
            , node = ctx.createScriptProcessor(bufferLen, 2, 2)
        ;
        
        node.onaudioprocess = function(e){
            if (!recording) return;
            worker.postMessage({
                command: 'record',
                buffer: e.inputBuffer.getChannelData(0)
            });
        }
        source.connect(node);        
        node.connect(ctx.destination);
		
        worker.postMessage({
            command: 'init',
            config: {
                sampleRate: sampleRate
            }
        });
        
        worker.onmessage = function(e){	
            if(e.data.type === 'packets'){
                socket.emit('decode', {
                    packets: e.data.packets,
                    uid: self.uid,
                    stop: e.data.stop,
					type: type,
					sampleRate: e.data.sampleRate,
                    autoUpload: autoUpload
                });
                if(e.data.stop){
                    worker.terminate(); 
                }
            }
        }


        this.start = function(){
            recording = true;      
            if(autoUpload)	vInterval = setInterval(getPackets, intervalTime);
        };

        this.stop = function(cb){
            callback = cb || callback;
            if(vInterval)	clearInterval(vInterval);
            getPackets(true);
            recording = false;
        };

		 function onFileReady(data){
			if(self.uid!== data.uid)	return;
            data.path = data.path.replace('\\', '/');
			var url = location.protocol + '//' + location.host + '/'+data.path;
			data.url = url;
			callback(data);			
		}
		
        function getPackets(last){
            worker.postMessage({command: 'getPackets', last:last, autoUpload:autoUpload});
        }
	
		socket.on('link', onFileReady);	
    };

    function genRandom(){
        return ('Rec:'+(new Date()).toTimeString().slice(0, 8) + ':' + Math.round(Math.random()*1000)).replace(/:/g,'_');
    }

    window.Recorder = Recorder;
})(window);
