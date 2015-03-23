
var decoder = []
  , fs = require('fs')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , opus = require('./opus')
  , rm = require('rimraf')
  , TMP_PATH = './uploads'
  , ffmpeg = require('fluent-ffmpeg')
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

function init(sampleRate, channels){
	channels = channels || 1;
	decoder[sampleRate] = new (new opus()).decoder(sampleRate, channels);
}

function decodePacket(packet, sampleRate){
	return decoder[sampleRate].decode(packet);
}

function decode(data){
	// splitting ArrayBuffer into packets and decoding back to PCM
	var  decodedPacket, pcmData, sampleRate = data.sampleRate;
    if(!decoder[sampleRate]){
        init(data.sampleRate, 1);
    }
	data.packets.forEach(function(packet){
        packet = array2Ab(packet);
		decodedPacket = decodePacket(packet, sampleRate);
		if(!pcmData){	
			pcmData=decodedPacket;
		}else{
			pcmData=concatInt16Array(pcmData,decodedPacket);
        }
	});
	delete data.packets;
	saveFile(data, pcmData);
}


function saveFile(data, pcmData){	
	var path = (data.autoUpload) ? TMP_PATH+'/'+data.uid : TMP_PATH;
	data.path = path;
	//checking if temp dir exists, creating it if not.
	fs.exists(path, function(exists){
		if(exists){
			saveAudio(data, pcmData);
		}else{
			mkdirp(path,'0755', function(err){
				if(err)
					console.log( 'error creating folder');
				else	
					saveAudio(data, pcmData);
			});
		}
	});	
} 

//saving the .wav file in a temporary location
function saveAudio(data, pcmData){
    var fileName;
	if(!data.autoUpload){
        fileName  = data.uid + '.wav';
    }else{
        fileName  = 'audio_' + Math.random() + '.wav';
        var p = path.resolve(data.path);
        fs.appendFileSync(path.join(p,'files.txt'), "file '"+path.join(p,fileName)+"'\n");
    }
    
	var filepath = path.join(data.path, fileName),
        wavBlob = encodeWav(pcmData, data.sampleRate),
        wstream = fs.createWriteStream(filepath);        
    
	wstream.write(toBuffer(wavBlob));
	wstream.end();	
    
    if(data.autoUpload && data.stop){
        var outFile  = path.join(TMP_PATH, data.uid + '.wav'),
            inFile = path.join(path.resolve(data.path),'files.txt');
        concat(inFile, outFile, function(filepath){
            
			rm(data.path, function(err){
				if(err){
					console.log('error while removing dir',err);
                }
			});
            returnLink(data, filepath);
        });
    }else if(!data.autoUpload){
        returnLink(data, filepath);
    }
};

function returnLink(data, filepath){
    var callback = function(p){
            data.path = p;
            process.send(data);
    };
	data.type = data.type || 'wav';
	switch(data.type){
		case 'wav': callback(filepath);
		                 break;
		case 'ogg':  var outPath = path.join(data.path, data.uid+'.ogg');
		                 convert(filepath, outPath, callback);
						 break;
		case 'mp3':  var outPath = path.join(data.path, data.uid+'.mp3');
		                 convert(filepath, outPath, callback);
						 break;
	}
}
	
function encodeWav(data, sampleRate){
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

function convert(inFile, outFile, callback){	  
	try{                
		ffmpeg().input(inFile)
			.output(outFile)
			.on('error', function(err) {
				console.log('err:', err);
				callback(err);
			}).on('end', function() {
				callback(outFile);
			}).run();                
	}catch(e){
		console.log('err:', e);
		callback(e);
	}      
}

function concat(inFile, outFile, callback){	  
	try{                
		ffmpeg().input(inFile)
			.inputOptions('-f', 'concat')
			.output(outFile)
			.on('error', function(err) {
				console.log('err:', err);
				callback(err);
			}).on('end', function() {
				callback(outFile);
			}).run();                
	}catch(e){
		console.log('err:', e);
		callback(e);
	}      
}






















