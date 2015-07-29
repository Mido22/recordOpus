var app = require('express')()
  , TMP_PATH = 'uploads'
  , open = require("open")
  , ffmpeg = require('fluent-ffmpeg')
  , rm = require('rimraf')
  , fs = require('fs')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , noop = function(){}
;
app.use("/", require('express').static(__dirname.replace('server', 'client')));
app.use("/workers", require('express').static(__dirname.replace('server', 'client/workers')));
app.use("/uploads", require('express').static(__dirname.replace('server', TMP_PATH)));

var http = require('http').Server(app);
http.listen(80, function(){
    console.log('listening on 80');
    open("http://localhost:80");
});

// for socket communication.
var io = require('socket.io')(http);
io.on('connection', function(socket){  
  socket.on('save', function(data){
    saveAudio(data, function(response){
      socket.emit('link', response);
    });
  });  
});

//function listening to save request from client, callback is called once the response is ready
function saveAudio(data, callback){
    if(data.recorderType === 'Fox' || !data.autoUpload){
        saveFox(data, callback);
    }else{
        saveOpusShim(data, callback);
    }
}

// function in charge of saving file for Firefox native recorder[ we just append to file, not create new file for each chunck of audio recieved]
function saveFox(data, callback){
    data.path = path.join(TMP_PATH, data.uid + '.ogg');
    fs.appendFile( data.path, data.blob, function(err){
        if(err){
            console.log(err);
            return;
        }        
        if(data.autoUpload && !data.stop)   return;
        returnLink(data, data.path, callback);
    }); 
}

// function in charge of saving file for OggShimRecorder
function saveOpusShim(data, callback){
    data.path = TMP_PATH+'/'+data.uid;
    mkDir(data.path, function(){        
        var fileName  = 'audio_' + Math.random() + '.ogg',
            p = path.resolve(data.path);
        fs.appendFile(path.join(p,'files.txt'), "file '"+path.join(p,fileName)+"'\n", function(err){
            if(err){
                console.log(err);
                return;
            }        
            fs.appendFile( path.join(p,fileName), data.blob, function(err){
                if(err){
                    console.log(err);
                    return;
                }        
                if(data.stop){
                    var outFile  = path.join(TMP_PATH, data.uid + '.ogg'),
                        inFile = path.join(p,'files.txt');
                    concat(inFile, outFile, function(err, filepath){
                        
                        rm(data.path, function(err){
                            if(err){
                                console.log('error while removing dir',err);
                            }
                        });
                        returnLink(data, filepath, callback);
                    });
                }
            }); 
        });
    });
}

// common method for responding once the file is successfully saved in server.
function returnLink(data, filepath, callback){
    data.path = filepath;
    delete data.blob;
    callback(data);
}

// for concating all audio chunks into single file.
function concat(inFile, outFile, callback){	  
	try{                
		ffmpeg().input(inFile)
			.inputOptions('-f', 'concat')
			.output(outFile)
			.on('error', function(err) {
				console.log('err:', err);
				callback(err);
			}).on('end', function() {
				callback(null, outFile);
			}).run();                
	}catch(e){
		console.log('err:', e);
		callback(e);
	}      
}

// for creating a directory at the given path if not present already.
function mkDir(dirPath, cb){
    fs.exists(dirPath, function(exists){
        if(!exists){
            mkdirp(dirPath, '0755', function(err){
                if(err) console.log( 'error creating folder');
                else cb();
            });
        }else{
            cb();
        }
    });	
}

mkDir(TMP_PATH, noop);