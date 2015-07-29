(function(window){
  
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.URL = window.URL || window.webkitURL;
    window.audioContext = new AudioContext();
    window.OpusRecorder = OpusRecorder;
    var WORKER_PATH = 'workers/recorderWorker.js',
        OPUS_WORKER_PATH = 'workers/EmsWorkerProxy.js',
        commonCallback;     

    function OggShimRecorder(stream, cfg){
    

        var config = cfg || {}
			, self = this
            , bufferLen = 16384
            , intervalTime = config.intervalTime || 60000
            , autoUpload = !!config.autoUpload
            , recording = false
            , worker = new Worker(config.workerPath || WORKER_PATH)
            , oggWorker = new Worker(config.opusWorkerPath || OPUS_WORKER_PATH)
            , source = window.audioContext.createMediaStreamSource(stream)
            , ctx = source.context
            , sampleRate = ctx.sampleRate
            , node = ctx.createScriptProcessor(bufferLen, 2, 2)
            , callback = config.callback
            , vInterval
            , recorderType = 'OggShim'
        ;
        source.connect(node);        
        node.connect(ctx.destination);

        //using the below variables to keep track of chucks sent to worker for conversion, we are gonna convert chunks sequencially as when done in parallel, sometimes the (last) smaller chuck finishes first sometimes and previous few chucks are missed.
        var encodingInProgess = false,
            waitQueue = [];  // for holding wav to ogg conversion worker call data( used for ensuring sequencing)

        
        node.onaudioprocess = function(e){
            if (!recording) return;
            worker.postMessage({
                command: 'record',
                buffer: [e.inputBuffer.getChannelData(0), e.inputBuffer.getChannelData(1)]
            });
        };
		
        worker.postMessage({
            command: 'init',
            config: {
                sampleRate: sampleRate
            }
        });
        
        worker.onmessage = function(e){	
            var data = e.data;
            delete data.command;
            blobToArrayBuffer(data.blob, function(buffer){
                oggWorker.postMessage({
                  command: 'encode',
                  args: ['in', 'out'],
                  outData: {out: {MIME: 'audio/ogg'}},
                  fileData: {in: new Uint8Array(buffer)}
                });  
                oggWorker.onmessage = function(e) {
                  var next;
                  if(e.data && e.data.reply){
                    if(e.data.reply === 'done'){      
                      data.blob = e.data.values.out.blob;
                      callback(data);
                      if(waitQueue.length){
                        next = waitQueue.shift();
                        worker.postMessage(next);
                      }else{
                        encodingInProgess = false;
                      }
                    }
                  }
                };                    
            });
        };

        this.start = function(){
            recording = true;      
            if(autoUpload)	vInterval = setInterval(getBlob, intervalTime);
        };

        this.stop = function(cb){
            callback = cb || callback;
            if(vInterval)	clearInterval(vInterval);
            getBlob(true);
            recording = false;
        };
        
        function getBlob(last){

            var msg = {
                command: 'export',
                autoUpload: autoUpload,
                stop: last,
                recorderType: recorderType
            };
            if(encodingInProgess){
                waitQueue.push(msg);
            }else{
                encodingInProgess = true;
                worker.postMessage(msg);
            }
        }	

    };

    function FoxRecorder(stream, cfg){
        
        console.log('using native MediaRecorder for recording...' );
        var mediaRecorder = new MediaRecorder(stream);
        var config = cfg || {}
			, self = this
            , intervalTime = config.intervalTime || 60000
            , autoUpload = !!config.autoUpload
            , callback = config.callback
            , chunksRequested = 0, chunkId = 0                        // for identifying the last data chunk
            , vInterval
            , stopped
            , callback = config.callback
            , recorderType = 'Fox'
        ;
        
        this.start = function(){
            mediaRecorder.start();
            if(autoUpload)	vInterval = setInterval(requestData, intervalTime);
        };

        this.stop = function(cb){
            callback = cb || callback;
            if(vInterval)	clearInterval(vInterval);
            mediaRecorder.stop();
            chunksRequested++;
            stopped = true;     // can also be checked as mediarecorder.state === 'inactive'
        };
		
        function requestData(){
            mediaRecorder.requestData();
            chunksRequested++;
        }
        
        mediaRecorder.ondataavailable = function(e){
            chunkId++;
            callback({
                autoUpload: autoUpload,
                stop: (chunkId >= chunksRequested) && stopped,
                type: 'ogg',
                blob: e.data,
                recorderType: recorderType
            });  
        }
    };
    
    function OpusRecorder(stream, cfg, socket){
    
        var config = cfg || {}
			, self = this
            , callback = config.callback
            , recorder
            , uid = genRandom()
        ;
        
        config.intervalTime = config.intervalTime || 60000;
        config.autoUpload = !!config.autoUpload;
        config.type = 'ogg';
        config.callback = onBlobData;        
        if(callback)    commonCallback = callback;        
        
        this.start = function(){
            recorder  = (window.MediaRecorder)? new FoxRecorder(stream, config) : new OggShimRecorder(stream, config);
            recorder.start();
        };

        this.stop = function(cb){
            if(cb)  callback = commonCallback = cb;
            recorder.stop();
        };

        function onBlobData(data){
            data.uid= uid;
            if(!autoUpload){
                data.name = [data.uid, data.type || 'ogg'].join('.');
                data.url = window.URL.createObjectURL(data.blob);
                callback(data);
            }else{
                socket.emit('save', data);
            }
        }      
		
    };
    
    function genRandom(){
        return ('Rec:'+(new Date()).toTimeString().slice(0, 8) + ':' + Math.round(Math.random()*1000)).replace(/:/g,'_');
    }
        
    function blobToArrayBuffer(blob, cb){
        var fileReader = new FileReader();
        fileReader.onload = function() {
            cb(this.result);
        };
        fileReader.readAsArrayBuffer(blob);
    }
  
})(window);



