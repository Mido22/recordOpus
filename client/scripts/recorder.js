(function(window){

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    var audio_context = new AudioContext(),
        WORKER_PATH = '/scripts/recorderWorker.js';


    function Recorder(stream, cfg, socket){
        console.log('cfg:', cfg);
        var config = cfg || {}
			, self = this
            , bufferLen = 16384
            , intervalTime = config.intervalTime || 60000
            , autoUpload = !!config.autoUpload
            , type = config.type || 'wav'
            , callback = config.callback || defaultCB
            , recording = false
            , worker = new Worker(config.workerPath || WORKER_PATH)
            , source = audio_context.createMediaStreamSource(stream)
            , sampleRate = source.context.sampleRate
            , vInterval
        ;
        
        this.context = source.context;
        this.node = (this.context.createScriptProcessor || this.context.createJavaScriptNode).call(this.context,bufferLen, 2, 2);
        this.uid = genRandom();
		
        worker.postMessage({
            command: 'init',
            config: {
                sampleRate: sampleRate
            }
        });

        function defaultCB(){
            worker.terminate();   
        }

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
					defaultCB();
                }
            }
        }

        this.node.onaudioprocess = function(e){
            if (!recording) return;
            worker.postMessage({
                command: 'record',
                buffer: e.inputBuffer.getChannelData(0)
            });
        }

        this.start = function(){
            recording = true;      
            if(autoUpload)	vInterval = setInterval(getPackets, intervalTime);
        }

        this.stop = function(cb){
            callback = cb || callback;
            if(vInterval)	clearInterval(vInterval);
            getPackets(true);
            recording = false;
        }

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

        source.connect(this.node);		
		socket.on('link', onFileReady);
		
		
    };

    function genRandom(){
        return ('Rec:'+(new Date()).toTimeString().slice(0, 8) + ':' + Math.round(Math.random()*1000)).replace(/:/g,'_');
    }

    window.Recorder = Recorder;

})(window);
