
var decoder 
  , sampleRate 
  , fs = require('fs')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , opus = require('.//opus')
  , TMP_PATH = './uploads'
  , ffmpeg = require('fluent-ffmpeg');
;

process.on('message', function(m) {
	switch(m.command){
		case 'init':
			init(m.config);
			break;
		case 'decode':
			decode(m.packets);
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
function decode(packets){
		
	// splitting ArrayBuffer into packets and decoding back to PCM
	var  decodedPacket, pcmData;
	packets.forEach(function(packet){
        packet = array2Ab(packet);
		decodedPacket = decodePacket(packet);
		if(!pcmData){	
			pcmData=decodedPacket;
		}else{
			pcmData=concatInt16Array(pcmData,decodedPacket);
        }
	});
	
	//saving the .wav file in a temporary location
	var saveAudio = function(){
        var name  = 'wav'+Math.floor(Math.random()*100)+'.wav';
		console.log('in save audio. name:'+name );
		var filepath=path.join(TMP_PATH,name);
		var wavBlob = encodeWav(pcmData);
		var wstream = fs.createWriteStream(filepath);            
		wstream.write(toBuffer(wavBlob));
		wstream.end();
		var reply = {};
		reply.data = {name:name,path:filepath};
		process.send(reply); // returning it, making it appear like file.
	};
	
	//checking if temp dir exists, creating it if not.
	fs.exists(TMP_PATH, function(exists){
		if(exists){
			saveAudio();
		}else{
			mkdirp(TMP_PATH,'0755', function(err){
				if(err)
					console.log( 'error creating folder');
				else	
					saveAudio();
			});
		}
	});
	
}

function encodeWav(data){
	var arrayBuffer = new ArrayBuffer(44 + data.byteLength);
	var view = new DataView(arrayBuffer);
	var offset=44;
	/* RIFF identifier */
	writeString(view, 0, 'RIFF');
	/* file length */
	view.setUint32(4, 32 + data.byteLength, true);
	/* RIFF type */
	writeString(view, 8, 'WAVE');
	/* format chunk identifier */
	writeString(view, 12, 'fmt ');
	/* format chunk length */
	view.setUint32(16, 16, true);
	/* sample format (raw) */
	view.setUint16(20, 1, true);
	/* channel count */
	view.setUint16(22, 1, true); /*MONO*/
	/* sample rate */
	view.setUint32(24, sampleRate, true);
	/* byte rate (sample rate * block align) */
	view.setUint32(28, sampleRate * 2, true); /*MONO*/
	/* block align (channel count * bytes per sample) */
	view.setUint16(32, 2, true); /*MONO*/
	/* bits per sample */
	view.setUint16(34, 16, true);
	/* data chunk identifier */
	writeString(view, 36, 'data');
	/* data chunk length */
	view.setUint32(40, data.byteLength, true);				// check these
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

























