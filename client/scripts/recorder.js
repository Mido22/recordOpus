(function(window){

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    var audio_context = new AudioContext(),
        WORKER_PATH = '/scripts/recorderWorker.js';


    function Recorder(stream, cfg, socket){
        var config = cfg || {}
            , newSampRate = cfg.samplingRate || 16000
            , bufferLen = config.bufferLength || 16384
            , intervalTime = config.intervalTime || 5000
            , autoUpload = !!config.autoUpload
            , callback = config.callback || defaultCB
            , recording = false
            , worker = new Worker(config.workerPath || WORKER_PATH)
            , source =audio_context.createMediaStreamSource(stream)
            , vInterval
        ;
        
        this.context = source.context;
        this.node = (this.context.createScriptProcessor || this.context.createJavaScriptNode).call(this.context,bufferLen, 2, 2);
        var uid = genRandom();
        worker.postMessage({
            command: 'init',
            config: {
                sampleRate: this.context.sampleRate,
                newSampRate: newSampRate,
            }
        });

        function defaultCB(){
            worker.terminate();   
        }

        worker.onmessage = function(e){	
            if(e.data.type === 'packets'){
                socket.emit('recording', {
                    packets: e.data.packets,
                    uid: uid,
                    stop: e.data.stop
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

        function getPackets(last){
            worker.postMessage({command: 'getPackets', last:last, autoUpload:autoUpload});
        }

        source.connect(this.node);
		
		socket.on('link', function(e){
			console.log('datum', e.data);
			var url = location.protocol + '//' + location.host + '/'+e.data.path;
			callback(url);
		});
    };

    function genRandom(){
        return ('Rec:'+(new Date()).toTimeString().slice(0, 8) + ':' + Math.round(Math.random()*1000)).replace(/:/g,'_');
    }

    window.Recorder = Recorder;

})(window);
