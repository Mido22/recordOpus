importScripts("libopus.js");
importScripts("opus.js");

var recLength = 0, trecLength=0
, recBuffersL =[], trecBuffersL =[]
, sampleRate
, newSampRate
, encodingInProgress = false
, opusEncoder
;
this.onmessage = function(e){
	switch(e.data.command){
		case 'init':
			init(e.data.config);
			break;
		case 'record':
			record(e.data.buffer);
			break;
		case 'getPackets':
			getPackets(!!e.data.last);
			break;
	}
};


function init(config){
	sampleRate = config.sampleRate;
	newSampRate = config.newSampRate || 16000;
	frameDuration = config.frameDuration || 20;
    opusEncoder = new OpusEncoder(newSampRate, 1 /*no. of channels*/, 2049 /* Audio */, frameDuration);
}

function record(buffer){
	if(!encodingInProgress){
		recBuffersL.push(buffer);
		recLength += buffer.length;
	}else{
		trecBuffersL.push(buffer);
		trecLength += buffer.length;
	}  
}

//PCM encoding the data.
function getPackets(last){
	encodingInProgress = true;
	var bufferL = mergeBuffers(recBuffersL, recLength);
	var fitCount = Math.round(bufferL.length*(newSampRate/sampleRate));
	bufferL=interpolateArray(bufferL,fitCount); // resampling the audio
	var wavdata = new Int16Array(bufferL.length);
	var ctr=0;
	var len = bufferL.length;
	for(var i=0;i<len;i++){
		var s = Math.max(-1, Math.min(1, bufferL[i]));	
		s = s < 0 ? s * 0x8000 : s * 0x7FFF;
		wavdata[ctr]=s;
		ctr++;
	}
    
    var packets = opusEncoder.encode(wavdata);
	this.postMessage({
        type:'packets',
        packets:packets,
        stop: last,
        sampleRate: newSampRate
    }); 
    clear();
}

function clear(){
	recLength = trecLength;
	recBuffersL = trecBuffersL;
	trecLength = 0;
	trecBuffersL = [];
	encodingInProgress = false;
}

function mergeBuffers(recBuffers, recLength){
  var result = new Float32Array(recLength);
  var offset = 0;
  for (var i = 0; i < recBuffers.length; i++){
    result.set(recBuffers[i], offset);
    offset += recBuffers[i].length;
  }
  return result;
}


// for changing the sampling rate, data, 
function interpolateArray(data, fitCount) {
	var newData = new Array();
	var springFactor = new Number((data.length - 1) / (fitCount - 1));
	newData[0] = data[0]; // for new allocation
	for ( var i = 1; i < fitCount - 1; i++) {
		var tmp = i * springFactor;
		var before = new Number(Math.floor(tmp)).toFixed();
		var after = new Number(Math.ceil(tmp)).toFixed();
		var atPoint = tmp - before;
		newData[i] = this.linearInterpolate(data[before], data[after], atPoint);
		}
	newData[fitCount - 1] = data[data.length - 1]; // for new allocation
	return newData;
};
	
function linearInterpolate(before, after, atPoint) {
	return before + (after - before) * atPoint;
};