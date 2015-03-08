
var decoder 
  , sampleRate 
  , fs = require('fs')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , opus = require('./opus')
  , TMP_PATH = './uploads'
  , ffmpeg = require('fluent-ffmpeg');
;

process.on('message', function(m) {
	switch(m.command){
		case 'init':
			init(m.config);
			break;
		case 'decode':
			decode(m.data);
			break;
	}
});
function init(config){
	config = config || {};
	sampleRate = config.samplingRate || 16000;
	var channels = config.channels || 1;
	decoder = new (new opus()).decoder(sampleRate, channels);
}
function decodePacket(packet){
	return decoder.decode(packet);
}
function decode(data){
	// splitting ArrayBuffer into packets and decoding back to PCM
	var  decodedPacket, pcmData;
	data.packets.forEach(function(packet){
        packet = array2Ab(packet);
		decodedPacket = decodePacket(packet);
		if(!pcmData){	
			pcmData=decodedPacket;
		}else{
			pcmData=concatInt16Array(pcmData,decodedPacket);
        }
	});
	delete data.packets;
	data.pcmData = pcmData;
	
	//checking if temp dir exists, creating it if not.
	fs.exists(TMP_PATH, function(exists){
		if(exists){
			saveAudio(data);
		}else{
			mkdirp(TMP_PATH,'0755', function(err){
				if(err)
					console.log( 'error creating folder');
				else	
					saveAudio(data);
			});
		}
	});	
}

//saving the .wav file in a temporary location
function saveAudio(data){
	var name  = 'wav'+Math.floor(Math.random()*100)+'.wav';
	var filepath=path.join(TMP_PATH,name);
	var wavBlob = encodeWav(data.pcmData);
	var wstream = fs.createWriteStream(filepath);            
	wstream.write(toBuffer(wavBlob));
	wstream.end();
	delete data.pcmData;
	data.name = name;
	data.path = filepath;
	process.send(data); // returning it, making it appear like file.
};
	
function encodeWav(data){
	var arrayBuffer = new ArrayBuffer(44 + data.byteLength);
	var view = new DataView(arrayBuffer);
	var offset=44;
	writeString(view, 0, 'RIFF');	/* RIFF identifier */	
	view.setUint32(4, 32 + data.byteLength, true);/* file length */	
	writeString(view, 8, 'WAVE');/* RIFF type */	
	writeString(view, 12, 'fmt ');/* format chunk identifier */	
	view.setUint32(16, 16, true);/* format chunk length */	
	view.setUint16(20, 1, true);/* sample format (raw) */	
	view.setUint16(22, 1, true);/* channel count */ /*MONO*/	
	view.setUint32(24, sampleRate, true);/* sample rate */	
	view.setUint32(28, sampleRate * 2, true);/* byte rate (sample rate * block align) */ /*MONO*/	
	view.setUint16(32, 2, true); /* block align (channel count * bytes per sample) *//*MONO*/	
	view.setUint16(34, 16, true);/* bits per sample */	
	writeString(view, 36, 'data');/* data chunk identifier */	
	view.setUint32(40, data.byteLength, true);	/* data chunk length */			// check these	
	for (var i = 0; i < data.byteLength/2; i++, offset+=2)
		view.setInt16(offset, data[i], true);
	return arrayBuffer;
}

function concatInt16Array(a,b){ // for concatenating two Int16Array	
	var c = new Int16Array(a.length + b.length);
	c.set(a);
	c.set(b, a.length);
	return c;
}

function writeString(view, offset, string){
	for (var i = 0; i < string.length; i++)		view.setUint8(offset + i, string.charCodeAt(i));		
}

function toBuffer(ab) {
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

function array2Ab(arry){
    var len = arry.length, 
        ib = new Uint8Array(len),
        view = new DataView(ib.buffer);
	for (var i = 0; i < len; i++)
		view.setInt8(i, arry[i], true);
    return ib.buffer;    
}

























