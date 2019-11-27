virtualMQRequire=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/opt/new_swarm_engine_release/privatesky/builds/tmp/virtualMQ_intermediar.js":[function(require,module,exports){
(function (global){
global.virtualMQLoadModules = function(){ 
	$$.__runtimeModules["source-map-support"] = require("source-map-support");
	$$.__runtimeModules["source-map"] = require("source-map");
	$$.__runtimeModules["buffer-from"] = require("buffer-from");
	$$.__runtimeModules["virtualmq"] = require("virtualmq");
	$$.__runtimeModules["foldermq"] = require("foldermq");
	$$.__runtimeModules["yazl"] = require("yazl");
	$$.__runtimeModules["yauzl"] = require("yauzl");
	$$.__runtimeModules["buffer-crc32"] = require("buffer-crc32");
	$$.__runtimeModules["node-fd-slicer"] = require("node-fd-slicer");
	$$.__runtimeModules["edfs"] = require("edfs");
	$$.__runtimeModules["psk-http-client"] = require("psk-http-client");
	$$.__runtimeModules["zmq_adapter"] = require("zmq_adapter");
}
if (false) {
	virtualMQLoadModules();
}; 
global.virtualMQRequire = require;
if (typeof $$ !== "undefined") {            
    $$.requireBundle("virtualMQ");
    };
    require('source-map-support').install({});
    
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"buffer-crc32":"buffer-crc32","buffer-from":"buffer-from","edfs":"edfs","foldermq":"foldermq","node-fd-slicer":"node-fd-slicer","psk-http-client":"psk-http-client","source-map":"source-map","source-map-support":"source-map-support","virtualmq":"virtualmq","yauzl":"yauzl","yazl":"yazl","zmq_adapter":"zmq_adapter"}],"/opt/new_swarm_engine_release/privatesky/modules/edfs/flows/BricksManager.js":[function(require,module,exports){
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const PskHash = require('pskcrypto').PskHash;

const folderNameSize = process.env.FOLDER_NAME_SIZE || 5;
const FILE_SEPARATOR = '-';
let rootfolder;
let aliasesPath;

$$.flow.describe("BricksManager", {
    init: function (rootFolder, callback) {
        if (!rootFolder) {
            callback(new Error("No root folder specified!"));
            return;
        }
        rootFolder = path.resolve(rootFolder);
        this.__ensureFolderStructure(rootFolder, function (err, pth) {
            rootfolder = rootFolder;
            aliasesPath = path.join(rootfolder, "aliases");
            callback(err, rootFolder);
        });
    },
    write: function (fileName, readFileStream, callback) {
        if (!this.__verifyFileName(fileName, callback)) {
            return;
        }

        if (!readFileStream || !readFileStream.pipe || typeof readFileStream.pipe !== "function") {
            callback(new Error("Something wrong happened"));
            return;
        }

        const folderName = path.join(rootfolder, fileName.substr(0, folderNameSize));

        this.__ensureFolderStructure(folderName, (err) => {
            if (err) {
                return callback(err);
            }

            this.__writeFile(readFileStream, folderName, fileName, callback);
        });

    },
    read: function (fileName, writeFileStream, callback) {
        if (!this.__verifyFileName(fileName, callback)) {
            return;
        }

        const folderPath = path.join(rootfolder, fileName.substr(0, folderNameSize));
        const filePath = path.join(folderPath, fileName);

        this.__verifyFileExistence(filePath, (err, result) => {
            if (!err) {
                this.__readFile(writeFileStream, filePath, callback);
            } else {
                callback(new Error(`File ${filePath} was not found.`));
            }
        });
    },
    addAlias: function (fileName, readStream, callback) {
        if (!this.__verifyFileName(fileName, callback)) {
            return;
        }

        this.__streamToString(readStream, (err, alias) => {
            if (err) {
                return callback(err);
            }
            if (!alias) {
                return callback(new Error("No alias was provided"));
            }

            this.__readAliases((err, aliases) => {
                if (err) {
                    return callback(err);
                }

                if (!aliases[alias]) {
                    aliases[alias] = [];
                }

                if(!aliases[alias].includes(fileName)) {
                    aliases[alias].push(fileName);
                    this.__writeAliases(aliases, callback);
                }

                callback();
            });

        });
    },
    writeWithHash: function (fileHash, readStream, callback) {
        this.write(fileHash, readStream, (err, computedDigest) => {
            if (err) {
                return callback(err);
            }

            if (fileHash !== computedDigest) {
                fs.unlink(fileHash, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    callback(new Error("The specified file hash is incorrect"));
                });
            }

            callback();
        });
    },
    writeWithAlias: function (alias, readStream, callback) {
        const fileName = encodeURIComponent(crypto.randomBytes(20).toString("base64"));
        this.write(fileName, readStream, (err, fileHash) => {
            if (err) {
                return callback(err);
            }

            this.__renameFile(fileName, fileHash, (err) => {
                if (err) {
                    return callback(err);
                }

                this.__readAliases((err, aliases) => {
                    if (err) {
                        return callback(err);
                    }

                    if (typeof aliases[alias] === "undefined") {
                        aliases[alias] = [];
                    }

                    if (!aliases[alias].includes(fileHash)) {
                        aliases[alias].push(fileHash);
                        this.__writeAliases(aliases, callback);
                    }else{
                        callback();
                    }
                });
            });
        });
    },
    readWithAlias: function (alias, writeStream, callback) {
        this.__readAliases((err, aliases) => {
            if (err) {
                return callback(err);
            }

            const fileName = this.__getFileName(aliases, alias);
            this.read(fileName, writeStream, callback);
        });

    },
    readVersion: function (fileName, fileVersion, writeFileStream, callback) {
        if (!this.__verifyFileName(fileName, callback)) {
            return;
        }

        const folderPath = path.join(rootfolder, fileName.substr(0, folderNameSize));
        const filePath = path.join(folderPath, fileName, fileVersion);
        this.__verifyFileExistence(filePath, (err, result) => {
            if (!err) {
                this.__readFile(writeFileStream, path.join(filePath), callback);
            } else {
                callback(new Error("No file found."));
            }
        });
    },
    getVersionsForFile: function (fileName, callback) {
        if (!this.__verifyFileName(fileName, callback)) {
            return;
        }

        const folderPath = path.join(rootfolder, fileName.substr(0, folderNameSize), fileName);
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                return callback(err);
            }

            const totalNumberOfFiles = files.length;
            const filesData = [];

            let resolvedFiles = 0;

            for (let i = 0; i < totalNumberOfFiles; ++i) {
                fs.stat(path.join(folderPath, files[i]), (err, stats) => {
                    if (err) {
                        filesData.push({version: files[i], creationTime: null, creationTimeMs: null});
                        return;
                    }

                    filesData.push({
                        version: files[i],
                        creationTime: stats.birthtime,
                        creationTimeMs: stats.birthtimeMs
                    });

                    resolvedFiles += 1;

                    if (resolvedFiles >= totalNumberOfFiles) {
                        filesData.sort((first, second) => {
                            const firstCompareData = first.creationTimeMs || first.version;
                            const secondCompareData = second.creationTimeMs || second.version;

                            return firstCompareData - secondCompareData;
                        });
                        callback(undefined, filesData);
                    }
                });
            }
        });
    },
    compareVersions: function (bodyStream, callback) {
        let body = '';

        bodyStream.on('data', (data) => {
            body += data;
        });

        bodyStream.on('end', () => {
            try {
                body = JSON.parse(body);
                this.__compareVersions(body, callback);
            } catch (e) {
                callback(e);
            }
        });
    },
    __verifyFileName: function (fileName, callback) {
        if (!fileName || typeof fileName !== "string") {
            return callback(new Error("No fileId specified."));
        }

        if (fileName.length < folderNameSize) {
            return callback(new Error("FileId too small. " + fileName));
        }

        return true;
    },
    __ensureFolderStructure: function (folder, callback) {
        fs.mkdir(folder, {recursive: true}, callback);
    },
    __writeFile: function (readStream, folderPath, fileName, callback) {
        const hash = require("crypto").createHash("sha256");
        const filePath = path.join(folderPath, fileName);
        fs.access(filePath, (err) => {
            if (err) {
                readStream.on('data', (data) => {
                    hash.update(data);
                });

                const writeStream = fs.createWriteStream(filePath, {mode: 0o444});

                writeStream.on("finish", () => {
                    callback(undefined, hash.digest("hex"));
                });

                writeStream.on("error", (err) => {
                    writeStream.close();
                    callback(err);
                });

                readStream.pipe(writeStream);
            } else {
                callback();

            }
        });
    },
    __getNextVersionFileName: function (folderPath, fileName, callback) {
        this.__getLatestVersionNameOfFile(folderPath, (err, fileVersion) => {
            if (err) {
                console.error(err);
                return callback(err);
            }

            callback(undefined, fileVersion.numericVersion + 1);
        });
    },
    __getLatestVersionNameOfFile: function (folderPath, callback) {
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                console.error(err);
                callback(err);
                return;
            }

            let fileVersion = {numericVersion: 0, fullVersion: '0' + FILE_SEPARATOR};

            if (files.length > 0) {
                try {
                    const allVersions = files.map(file => file.split(FILE_SEPARATOR)[0]);
                    const latestFile = this.__maxElement(allVersions);
                    fileVersion = {
                        numericVersion: parseInt(latestFile),
                        fullVersion: files.filter(file => file.split(FILE_SEPARATOR)[0] === latestFile.toString())[0]
                    };

                } catch (e) {
                    e.code = 'invalid_file_name_found';
                    callback(e);
                }
            }

            callback(undefined, fileVersion);
        });
    },
    __maxElement: function (numbers) {
        let max = numbers[0];

        for (let i = 1; i < numbers.length; ++i) {
            max = Math.max(max, numbers[i]);
        }

        if (isNaN(max)) {
            throw new Error('Invalid element found');
        }

        return max;
    },
    __compareVersions: function (files, callback) {
        const filesWithChanges = [];
        const entries = Object.entries(files);
        let remaining = entries.length;

        if (entries.length === 0) {
            callback(undefined, filesWithChanges);
            return;
        }

        entries.forEach(([fileName, fileHash]) => {
            this.getVersionsForFile(fileName, (err, versions) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        versions = [];
                    } else {
                        callback(err);
                    }

                }

                const match = versions.some(version => {
                    const hash = version.version.split(FILE_SEPARATOR)[1];
                    return hash === fileHash;
                });

                if (!match) {
                    filesWithChanges.push(fileName);
                }

                if (--remaining === 0) {
                    callback(undefined, filesWithChanges);
                }
            })
        });
    },
    __readFile: function (writeFileStream, filePath, callback) {
        const readStream = fs.createReadStream(filePath);

        writeFileStream.on("finish", callback);
        writeFileStream.on("error", callback);

        readStream.pipe(writeFileStream);
    },
    __verifyFileExistence: function (filePath, callback) {
        fs.access(filePath, callback);
    },
    __getFileName: function (aliases, alias) {
        const lastIndex = aliases[alias].length - 1;
        return aliases[alias][lastIndex];
    },
    __writeAliases: function (aliases, callback) {
        fs.writeFile(aliasesPath, JSON.stringify(aliases), callback);
    },
    __readAliases: function (callback) {
        fs.readFile(aliasesPath, (err, aliases) => {
            if (err) {
                if (err.code === "ENOENT") {
                    return callback(undefined, {});
                }else{
                    return callback(err);
                }
            }
            callback(undefined, JSON.parse(aliases.toString()));
        });
    },
    __checkIfFileHasAlias: function (aliases, alias, fileName) {
        return !!aliases[alias].find(el => el === fileName);
    },
    __streamToString: function (readStream, callback) {
        let str = '';
        readStream.on("data", (chunk) => {
            str += chunk;
        });

        readStream.on("end", () => {
            callback(undefined, str);
        });

        readStream.on("error", callback);
    },
    __renameFile: function (oldFileName, newFileName, callback) {
        const oldFolderPath = path.join(rootfolder, path.basename(oldFileName).substring(0, folderNameSize));
        const newFolderPath = path.join(rootfolder, path.basename(newFileName).substring(0, folderNameSize));
        const oldFilePath = path.join(oldFolderPath, oldFileName);
        const newFilePath = path.join(newFolderPath, newFileName);

        fs.stat(newFolderPath, (err, stats) => {
            if (err) {
                if (err.code === "ENOENT") {
                    fs.mkdir(newFolderPath, {recursive: true}, (err) => {
                        if (err) {
                            return callback(err);
                        }
                        __moveFile(callback);
                    });
                } else {
                    return callback(err);
                }
            } else {
                __moveFile(callback);
            }
        });

        function __moveFile(callback) {
            fs.access(newFilePath, (err) => {
                if (!err) {
                    __removeFile(callback);
                    return;
                }

                fs.copyFile(oldFilePath, newFilePath, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    __removeFile(callback);
                });
            });

        }

        function __removeFile(callback) {
            fs.unlink(oldFilePath, (err) => {
                if (err) {
                    return callback(err);
                }

                fs.readdir(oldFolderPath, (err, files) => {
                    if (err) {
                        return callback(err);
                    }

                    if (files.length === 0) {
                        fs.rmdir(oldFolderPath, callback);
                    }
                });
            });
        }
    }
});

},{"crypto":false,"fs":false,"path":false,"pskcrypto":false}],"/opt/new_swarm_engine_release/privatesky/modules/edfs/lib/EDFSClient.js":[function(require,module,exports){
require("psk-http-client");

function EDFSClient(url) {
    this.attachAlias = (fileName, alias, callback) => {
        $$.remote.doHttpPost(url + "/EDFS/addAlias/" + fileName, alias, callback);
    };

    this.writeToAlias = (alias, data, callback) => {
        $$.remote.doHttpPost(url + "/EDFS/alias/" + alias, data, callback);
    };

    this.readFromAlias = (alias, callback) => {
        $$.remote.doHttpGet(url + "/EDFS/alias/" + alias, callback);
    };

    this.writeFile = (fileName, data, callback) => {
        $$.remote.doHttpPost(url + "/EDFS/" + fileName, data, callback);
    };

    this.readFile = (fileName, callback) => {
        $$.remote.doHttpGet(url + "/EDFS/" + fileName, callback);
    };
}

module.exports = EDFSClient;
},{"psk-http-client":"psk-http-client"}],"/opt/new_swarm_engine_release/privatesky/modules/edfs/lib/EDFSMiddleware.js":[function(require,module,exports){
require("../flows/BricksManager");

function EDFSMiddleware(server) {

    server.post('/:fileId', (req, res) => {
        $$.flow.start("BricksManager").writeWithHash(req.params.fileId, req, (err, result) => {
            res.statusCode = 201;
            if (err) {
                res.statusCode = 500;

                if (err.code === 'EACCES') {
                    res.statusCode = 409;
                }
            }
            res.end();
        });
    });

    server.get('/:fileId', (req, res) => {
        res.setHeader("content-type", "application/octet-stream");
        $$.flow.start("BricksManager").read(req.params.fileId, res, (err, result) => {
            res.statusCode = 200;
            if (err) {
                console.log(err);
                res.statusCode = 404;
            }
            res.end();
        });
    });

    server.post('/addAlias/:fileId', (req, res) => {
        $$.flow.start("BricksManager").addAlias(req.params.fileId, req, (err, result) => {
            res.statusCode = 201;
            if (err) {
                res.statusCode = 500;

                if (err.code === 'EACCES') {
                    res.statusCode = 409;
                }
            }
            res.end();
        });
    });

    server.post('/alias/:alias', (req, res) => {
        $$.flow.start("BricksManager").writeWithAlias(req.params.alias, req,  (err, result) => {
            res.statusCode = 201;
            if (err) {
                res.statusCode = 500;

                if (err.code === 'EACCES') {
                    res.statusCode = 409;
                }
            }
            res.end();
        });
    });

    server.get('/alias/:alias', (req, res) => {
        res.setHeader("content-type", "application/octet-stream");
        $$.flow.start("BricksManager").readWithAlias(req.params.alias, res, (err, result) => {
            res.statusCode = 200;
            if (err) {
                console.log(err);
                res.statusCode = 404;
            }
            res.end();
        });
    });
}

module.exports = EDFSMiddleware;
},{"../flows/BricksManager":"/opt/new_swarm_engine_release/privatesky/modules/edfs/flows/BricksManager.js"}],"/opt/new_swarm_engine_release/privatesky/modules/foldermq/lib/folderMQ.js":[function(require,module,exports){
const utils = require("swarmutils");
const OwM = utils.OwM;
var beesHealer = utils.beesHealer;
var fs = require("fs");
var path = require("path");


//TODO: prevent a class of race condition type of errors by signaling with files metadata to the watcher when it is safe to consume

function FolderMQ(folder, callback = () => {}){

	if(typeof callback !== "function"){
		throw new Error("Second parameter should be a callback function");
	}

	folder = path.normalize(folder);

	fs.mkdir(folder, {recursive: true}, function(err, res){
		fs.exists(folder, function(exists) {
			if (exists) {
				return callback(null, folder);
			} else {
				return callback(err);
			}
		});
	});

	function mkFileName(swarmRaw){
		let meta = OwM.prototype.getMetaFrom(swarmRaw);
		let name = `${folder}${path.sep}${meta.swarmId}.${meta.swarmTypeName}`;
		const unique = meta.phaseId || $$.uidGenerator.safe_uuid();

		name = name+`.${unique}`;
		return path.normalize(name);
	}

	this.getHandler = function(){
		if(producer){
			throw new Error("Only one consumer is allowed!");
		}
		producer = true;
		return {
			sendSwarmSerialization: function(serialization, callback){
				if(typeof callback !== "function"){
					throw new Error("Second parameter should be a callback function");
				}
				writeFile(mkFileName(JSON.parse(serialization)), serialization, callback);
			},
			addStream : function(stream, callback){
				if(typeof callback !== "function"){
					throw new Error("Second parameter should be a callback function");
				}

				if(!stream || !stream.pipe || typeof stream.pipe !== "function"){
					return callback(new Error("Something wrong happened"));
				}

				let swarm = "";
				stream.on('data', (chunk) =>{
					swarm += chunk;
				});

				stream.on("end", () => {
					writeFile(mkFileName(JSON.parse(swarm)), swarm, callback);
				});

				stream.on("error", (err) =>{
					callback(err);
				});
			},
			addSwarm : function(swarm, callback){
				if(!callback){
					callback = $$.defaultErrorHandlingImplementation;
				}else if(typeof callback !== "function"){
					throw new Error("Second parameter should be a callback function");
				}

				beesHealer.asJSON(swarm,null, null, function(err, res){
					if (err) {
						console.log(err);
					}
					writeFile(mkFileName(res), J(res), callback);
				});
			},
			sendSwarmForExecution: function(swarm, callback){
				if(!callback){
					callback = $$.defaultErrorHandlingImplementation;
				}else if(typeof callback !== "function"){
					throw new Error("Second parameter should be a callback function");
				}

				beesHealer.asJSON(swarm, OwM.prototype.getMetaFrom(swarm, "phaseName"), OwM.prototype.getMetaFrom(swarm, "args"), function(err, res){
					if (err) {
						console.log(err);
					}
					var file = mkFileName(res);
					var content = JSON.stringify(res);

					//if there are no more FD's for files to be written we retry.
					function wrapper(error, result){
						if(error){
							console.log(`Caught an write error. Retry to write file [${file}]`);
							setTimeout(()=>{
								writeFile(file, content, wrapper);
							}, 10);
						}else{
							return callback(error, result);
						}
					}

					writeFile(file, content, wrapper);
				});
			}
		};
	};

	var recipient;
	this.setIPCChannel = function(processChannel){
		if(processChannel && !processChannel.send || (typeof processChannel.send) != "function"){
			throw new Error("Recipient is not instance of process/child_process or it was not spawned with IPC channel!");
		}
		recipient = processChannel;
		if(consumer){
			console.log(`Channel updated`);
			(recipient || process).on("message", receiveEnvelope);
		}
	};


	var consumedMessages = {};

	function checkIfConsummed(name, message){
		const shortName = path.basename(name);
		const previousSaved = consumedMessages[shortName];
		let result = false;
		if(previousSaved && !previousSaved.localeCompare(message)){
			result = true;
		}
		return result;
	}

	function save2History(envelope){
		consumedMessages[path.basename(envelope.name)] = envelope.message;
	}

	function buildEnvelopeConfirmation(envelope, saveHistory){
		if(saveHistory){
			save2History(envelope);
		}
		return `Confirm envelope ${envelope.timestamp} sent to ${envelope.dest}`;
	}

	function buildEnvelope(name, message){
		return {
			dest: folder,
			src: process.pid,
			timestamp: new Date().getTime(),
			message: message,
			name: name
		};
	}

	function receiveEnvelope(envelope){
		if(!envelope || typeof envelope !== "object"){
			return;
		}
		//console.log("received envelope", envelope, folder);

		if(envelope.dest !== folder && folder.indexOf(envelope.dest)!== -1 && folder.length === envelope.dest+1){
			console.log("This envelope is not for me!");
			return;
		}

		let message = envelope.message;

		if(callback){
			//console.log("Sending confirmation", process.pid);
			recipient.send(buildEnvelopeConfirmation(envelope, true));
			consumer(null, JSON.parse(message));
		}
	}

	this.registerAsIPCConsumer = function(callback){
		if(typeof callback !== "function"){
			throw new Error("The argument should be a callback function");
		}
		registeredAsIPCConsumer = true;
		//will register as normal consumer in order to consume all existing messages but without setting the watcher
		this.registerConsumer(callback, true, (watcher) => !watcher);

		//console.log("Registered as IPC Consummer", );
		(recipient || process).on("message", receiveEnvelope);
	};

	this.registerConsumer = function (callback, shouldDeleteAfterRead = true, shouldWaitForMore = (watcher) => true) {
		if(typeof callback !== "function"){
			throw new Error("First parameter should be a callback function");
		}
		if (consumer) {
			throw new Error("Only one consumer is allowed! " + folder);
		}

		consumer = callback;

		fs.mkdir(folder, {recursive: true}, function (err, res) {
			if (err && (err.code !== 'EEXIST')) {
				console.log(err);
			}
			consumeAllExisting(shouldDeleteAfterRead, shouldWaitForMore);
		});
	};

	this.writeMessage = writeFile;

	this.unlinkContent = function (messageId, callback) {
		const messagePath = path.join(folder, messageId);

		fs.unlink(messagePath, (err) => {
			callback(err);
		});
	};

	this.dispose = function(force){
		if(typeof folder != "undefined"){
			var files;
			try{
				files = fs.readdirSync(folder);
			}catch(error){
				//..
			}

			if(files && files.length > 0 && !force){
				console.log("Disposing a channel that still has messages! Dir will not be removed!");
				return false;
			}else{
				try{
					fs.rmdirSync(folder);
				}catch(err){
					//..
				}
			}

			folder = null;
		}

		if(producer){
			//no need to do anything else
		}

		if(typeof consumer != "undefined"){
			consumer = () => {};
		}

		if(watcher){
			watcher.close();
			watcher = null;
		}

		return true;
	};


	/* ---------------- protected  functions */
	var consumer = null;
	var registeredAsIPCConsumer = false;
	var producer = null;

	function buildPathForFile(filename){
		return path.normalize(path.join(folder, filename));
	}

	function consumeMessage(filename, shouldDeleteAfterRead, callback) {
		var fullPath = buildPathForFile(filename);

		fs.readFile(fullPath, "utf8", function (err, data) {
			if (!err) {
				if (data !== "") {
					try {
						var message = JSON.parse(data);
					} catch (error) {
						console.log("Parsing error", error);
						err = error;
					}

					if(checkIfConsummed(fullPath, data)){
						//console.log(`message already consumed [${filename}]`);
						return ;
					}

					if (shouldDeleteAfterRead) {

						fs.unlink(fullPath, function (err, res) {
							if (err) {throw err;};
						});

					}
					return callback(err, message);
				}
			} else {
				console.log("Consume error", err);
				return callback(err);
			}
		});
	}

	function consumeAllExisting(shouldDeleteAfterRead, shouldWaitForMore) {

		let currentFiles = [];

		fs.readdir(folder, 'utf8', function (err, files) {
			if (err) {
				$$.errorHandler.error(err);
				return;
			}
			currentFiles = files;
			iterateAndConsume(files);

		});

		function startWatching(){
			if (shouldWaitForMore(true)) {
				watchFolder(shouldDeleteAfterRead, shouldWaitForMore);
			}
		}

		function iterateAndConsume(files, currentIndex = 0) {
			if (currentIndex === files.length) {
				//console.log("start watching", new Date().getTime());
				startWatching();
				return;
			}

			if (path.extname(files[currentIndex]) !== in_progress) {
				consumeMessage(files[currentIndex], shouldDeleteAfterRead, (err, data) => {
					if (err) {
						iterateAndConsume(files, ++currentIndex);
						return;
					}
					consumer(null, data, path.basename(files[currentIndex]));
					if (shouldWaitForMore()) {
						iterateAndConsume(files, ++currentIndex);
					}
				});
			} else {
				iterateAndConsume(files, ++currentIndex);
			}
		}
	}

	function writeFile(filename, content, callback){
		if(recipient){
			var envelope = buildEnvelope(filename, content);
			//console.log("Sending to", recipient.pid, recipient.ppid, "envelope", envelope);
			recipient.send(envelope);
			var confirmationReceived = false;

			function receiveConfirmation(message){
				if(message === buildEnvelopeConfirmation(envelope)){
					//console.log("Received confirmation", recipient.pid);
					confirmationReceived = true;
					try{
						recipient.off("message", receiveConfirmation);
					}catch(err){
						//...
					}

				}
			}

			recipient.on("message", receiveConfirmation);

			setTimeout(()=>{
				if(!confirmationReceived){
					//console.log("No confirmation...", process.pid);
					hidden_writeFile(filename, content, callback);
				}else{
					if(callback){
						return callback(null, content);
					}
				}
			}, 200);
		}else{
			hidden_writeFile(filename, content, callback);
		}
	}

	const in_progress = ".in_progress";
	function hidden_writeFile(filename, content, callback){
		var tmpFilename = filename+in_progress;
		try{
			if(fs.existsSync(tmpFilename) || fs.existsSync(filename)){
				console.log(new Error(`Overwriting file ${filename}`));
			}
			fs.writeFileSync(tmpFilename, content);
			fs.renameSync(tmpFilename, filename);
		}catch(err){
			return callback(err);
		}
		callback(null, content);
	}

	var alreadyKnownChanges = {};

	function alreadyFiredChanges(filename, change){
		var res = false;
		if(alreadyKnownChanges[filename]){
			res = true;
		}else{
			alreadyKnownChanges[filename] = change;
		}

		return res;
	}

	function watchFolder(shouldDeleteAfterRead, shouldWaitForMore){

		setTimeout(function(){
			fs.readdir(folder, 'utf8', function (err, files) {
				if (err) {
					$$.errorHandler.error(err);
					return;
				}

				for(var i=0; i<files.length; i++){
					watchFilesHandler("change", files[i]);
				}
			});
		}, 1000);

		function watchFilesHandler(eventType, filename){
			//console.log(`Got ${eventType} on ${filename}`);

			if(!filename || path.extname(filename) === in_progress){
				//caught a delete event of a file
				//or
				//file not ready to be consumed (in progress)
				return;
			}

			var f = buildPathForFile(filename);
			if(!fs.existsSync(f)){
				//console.log("File not found", f);
				return;
			}

			//console.log(`Preparing to consume ${filename}`);
			if(!alreadyFiredChanges(filename, eventType)){
				consumeMessage(filename, shouldDeleteAfterRead, (err, data) => {
					//allow a read a the file
					alreadyKnownChanges[filename] = undefined;

					if (err) {
						// ??
						console.log("\nCaught an error", err);
						return;
					}

					consumer(null, data, filename);


					if (!shouldWaitForMore()) {
						watcher.close();
					}
				});
			}else{
				console.log("Something happens...", filename);
			}
		}


		const watcher = fs.watch(folder, watchFilesHandler);

		const intervalTimer = setInterval(()=>{
			fs.readdir(folder, 'utf8', function (err, files) {
				if (err) {
					$$.errorHandler.error(err);
					return;
				}

				if(files.length > 0){
					console.log(`\n\nFound ${files.length} files not consumed yet in ${folder}`, new Date().getTime(),"\n\n");
					//faking a rename event trigger
					watchFilesHandler("rename", files[0]);
				}
			});
		}, 5000);
	}
}

exports.getFolderQueue = function(folder, callback){
	return new FolderMQ(folder, callback);
};

},{"fs":false,"path":false,"swarmutils":false}],"/opt/new_swarm_engine_release/privatesky/modules/node-fd-slicer/modules/node-pend/index.js":[function(require,module,exports){
module.exports = Pend;

function Pend() {
  this.pending = 0;
  this.max = Infinity;
  this.listeners = [];
  this.waiting = [];
  this.error = null;
}

Pend.prototype.go = function(fn) {
  if (this.pending < this.max) {
    pendGo(this, fn);
  } else {
    this.waiting.push(fn);
  }
};

Pend.prototype.wait = function(cb) {
  if (this.pending === 0) {
    cb(this.error);
  } else {
    this.listeners.push(cb);
  }
};

Pend.prototype.hold = function() {
  return pendHold(this);
};

function pendHold(self) {
  self.pending += 1;
  var called = false;
  return onCb;
  function onCb(err) {
    if (called) throw new Error("callback called twice");
    called = true;
    self.error = self.error || err;
    self.pending -= 1;
    if (self.waiting.length > 0 && self.pending < self.max) {
      pendGo(self, self.waiting.shift());
    } else if (self.pending === 0) {
      var listeners = self.listeners;
      self.listeners = [];
      listeners.forEach(cbListener);
    }
  }
  function cbListener(listener) {
    listener(self.error);
  }
}

function pendGo(self, fn) {
  fn(pendHold(self));
}

},{}],"/opt/new_swarm_engine_release/privatesky/modules/psk-http-client/lib/psk-abstract-client.js":[function(require,module,exports){
let SwarmPacker = require("swarmutils").SwarmPacker;

const receiveEndpoint = process.env.RECEIVE_ENDPOINT || "receive-message/";
const sendEndpoint = process.env.SEND_ENDPOINT || "send-message/";
const createChannelEndpoint = process.env.CREATE_CHANNEL_ENDPOINT || 'create-channel/';

/**********************  utility class **********************************/
function RequestManager(pollingTimeOut){
    if(!pollingTimeOut){
        pollingTimeOut = 1000; //1 second by default
    }

    const self = this;

    function Request(endPoint, initialSwarm, delayedStart){
        let onReturnCallbacks = [];
        let onErrorCallbacks = [];
        let onCallbacks = [];
        const requestId = initialSwarm.meta.requestId;
        initialSwarm = null;

        this.getRequestId = function(){
            return requestId;
        };

        this.on = function(phaseName, callback){
            if(typeof phaseName != "string"  && typeof callback != "function"){
                throw new Error("The first parameter should be a string and the second parameter should be a function");
            }

            onCallbacks.push({
                callback:callback,
                phase:phaseName
            });

            if(typeof delayedStart === "undefined"){
                self.poll(endPoint, this);
            }

            return this;
        };

        this.onReturn = function(callback){
            onReturnCallbacks.push(callback);
            if(typeof delayedStart === "undefined"){
                self.poll(endPoint, this);
            }
            return this;
        };

        this.onError = function(callback){
            if(onErrorCallbacks.indexOf(callback)!==-1){
                onErrorCallbacks.push(callback);
            }else{
                console.log("Error callback already registered!");
            }
        };

        this.start = function(){
            if(typeof delayedStart !== "undefined"){
                self.poll(endPoint, this);
            }
        };

        this.dispatch = function(err, result){
            if(result instanceof ArrayBuffer) {
                result = SwarmPacker.unpack(result);
            }

            result = typeof result === "string" ? JSON.parse(result) : result;

            result = OwM.prototype.convert(result);
            const resultReqId = result.getMeta("requestId");
            const phaseName = result.getMeta("phaseName");
            let onReturn = false;

            if(resultReqId === requestId){
                onReturnCallbacks.forEach(function(c){
                    c(null, result);
                    onReturn = true;
                });
                if(onReturn){
                    onReturnCallbacks = [];
                    onErrorCallbacks = [];
                }

                onCallbacks.forEach(function(i){
                    //console.log("XXXXXXXX:", phaseName , i);
                    if(phaseName === i.phase || i.phase === '*') {
                        i.callback(err, result);
                    }
                });
            }

            if(onReturnCallbacks.length === 0 && onCallbacks.length === 0){
                self.unpoll(endPoint, this);
            }
        };

        this.dispatchError = function (err) {
            for (let i = 0; i < onErrorCallbacks.length; i++) {
                const errCb = onErrorCallbacks[i];
                errCb(err);
            }
        };

        this.off = function(){
            self.unpoll(endPoint, this);
        };
    }

    this.createRequest = function(remoteEndPoint, swarm, delayedStart){
        return new Request(remoteEndPoint, swarm, delayedStart);
    };

    /* *************************** polling zone ****************************/

    const pollSet = {};

    const activeConnections = {};

    this.poll = function(remoteEndPoint, request){
        let requests = pollSet[remoteEndPoint];
        if(!requests){
            requests = {};
            pollSet[remoteEndPoint] = requests;
        }
        requests[request.getRequestId()] = request;
        pollingHandler();
    };

    this.unpoll = function(remoteEndPoint, request){
        const requests = pollSet[remoteEndPoint];
        if(requests){
            delete requests[request.getRequestId()];
            if(Object.keys(requests).length === 0){
                delete pollSet[remoteEndPoint];
            }
        }
        else {
            console.log("Unpolling wrong request:",remoteEndPoint, request);
        }
    };

    function createPollThread(remoteEndPoint){
        function reArm(){
            $$.remote.doHttpGet(remoteEndPoint, function(err, res){
                let requests = pollSet[remoteEndPoint];

                if(err){
                    for(const req_id in requests){
                        if(!requests.hasOwnProperty(req_id)) {return;}

                        let err_handler = requests[req_id].dispatchError;
                        if(err_handler){
                            err_handler(err);
                        }
                    }
                    activeConnections[remoteEndPoint] = false;
                } else {

                    for(const k in requests){
                        if(!requests.hasOwnProperty(k)) {return;}

                        requests[k].dispatch(null, res);
                    }

                    if(Object.keys(requests).length !== 0) {
                        reArm();
                    } else {
                        delete activeConnections[remoteEndPoint];
                        console.log("Ending polling for ", remoteEndPoint);
                    }
                }
            });
        }
        reArm();
    }

    function pollingHandler(){
        let setTimer = false;
        for(const remoteEndPoint in pollSet){
            if(!pollSet.hasOwnProperty(remoteEndPoint)) {return;}

            if(!activeConnections[remoteEndPoint]){
                createPollThread(remoteEndPoint);
                activeConnections[remoteEndPoint] = true;
            }
            setTimer = true;
        }
        if(setTimer) {
            setTimeout(pollingHandler, pollingTimeOut);
        }
    }

    setTimeout( pollingHandler, pollingTimeOut);
}


function extractDomainAgentDetails(url){
    const vRegex = /([a-zA-Z0-9]*|.)*\/agent\/([a-zA-Z0-9]+(\/)*)+/g;

    if(!url.match(vRegex)){
        throw new Error("Invalid format. (Eg. domain[.subdomain]*/agent/[organisation/]*agentId)");
    }

    const devider = "/agent/";
    let domain;
    let agentUrl;

    const splitPoint = url.indexOf(devider);
    if(splitPoint !== -1){
        domain = url.slice(0, splitPoint);
        agentUrl = url.slice(splitPoint+devider.length);
    }

    return {domain, agentUrl};
}

function urlEndWithSlash(url){

    if(url[url.length - 1] !== "/"){
        url += "/";
    }

    return url;
}

const OwM = require("swarmutils").OwM;

/********************** main APIs on working with remote end points **********************************/
function PskHttpClient(remoteEndPoint, agentUid, options){
    const baseOfRemoteEndPoint = remoteEndPoint; //remove last id
    let channelInitialized = false;
    let channelInitStarted = false;

    remoteEndPoint = urlEndWithSlash(remoteEndPoint);

    //domainInfo contains 2 members: domain (privateSky domain) and agentUrl
    const domainInfo = extractDomainAgentDetails(agentUid);
    let homeSecurityContext = domainInfo.agentUrl;
    let returnRemoteEndPoint = remoteEndPoint;

    if(options && typeof options.returnRemote != "undefined"){
        returnRemoteEndPoint = options.returnRemote;
    }

    if(!options || options && (typeof options.uniqueId == "undefined" || options.uniqueId)){
        homeSecurityContext += "_"+Math.random().toString(36).substr(2, 9);
    }

    returnRemoteEndPoint = urlEndWithSlash(returnRemoteEndPoint);

    this.startSwarm = function(swarmName, phaseName, ...args){
        const swarm = new OwM();
        swarm.setMeta("swarmId", $$.uidGenerator.safe_uuid());
        swarm.setMeta("requestId", swarm.getMeta("swarmId"));
        swarm.setMeta("swarmTypeName", swarmName);
        swarm.setMeta("phaseName", phaseName);
        swarm.setMeta("args", args);
        swarm.setMeta("command", "executeSwarmPhase");
        swarm.setMeta("target", domainInfo.agentUrl);
        swarm.setMeta("homeSecurityContext", getRemoteToSendMessage(returnRemoteEndPoint, homeSecurityContext));

        const requestToBeReturned = $$.remote.requestManager.createRequest(getRemoteToReceiveMessage(returnRemoteEndPoint, homeSecurityContext), swarm, true);

        if(!channelInitialized && channelInitStarted === false) {
            channelInitStarted = true;
            $$.remote.doHttpPut(getRemoteToCreateChannel(returnRemoteEndPoint, homeSecurityContext), 'someSignature', (err) => {
                if(err && err.statusCode !== 409) {
                    console.error(err, err.statusCode);
                    requestToBeReturned.dispatchError(err);
                    channelInitialized = false;
                    return;
                }

                channelInitialized = true;
                requestToBeReturned.start();
                $$.remote.doHttpPost(getRemoteToSendMessage(remoteEndPoint, domainInfo.domain), SwarmPacker.pack(swarm), function (err, res) {
                    if (err) {
                        requestToBeReturned.dispatchError(err);
                    }
                });
            });
        } else {
            requestToBeReturned.start();
            $$.remote.doHttpPost(getRemoteToSendMessage(remoteEndPoint, domainInfo.domain), SwarmPacker.pack(swarm), function (err, res) {
                if (err) {
                    requestToBeReturned.dispatchError(err);
                }
            });
        }

        return requestToBeReturned;
    };

    this.continueSwarm = function(existingSwarm, phaseName, ...args){
        const swarm = new OwM(existingSwarm);
        swarm.setMeta("phaseName", phaseName);
        swarm.setMeta("args", args);
        swarm.setMeta("command", "executeSwarmPhase");
        swarm.setMeta("target", domainInfo.agentUrl);
        swarm.setMeta("homeSecurityContext", returnRemoteEndPoint+$$.remote.base64Encode(homeSecurityContext));

        $$.remote.doHttpPost(getRemoteToSendMessage(remoteEndPoint, domainInfo.domain), SwarmPacker.pack(swarm), function(err, res){
            if(err){
                console.log(err);
            }
        });
        //return $$.remote.requestManager.createRequest(swarm.getMeta("homeSecurityContext"), swarm);
    };

    const allCatchAlls = [];
    let requestsCounter = 0;

    function CatchAll(swarmName, phaseName, callback){ //same interface as Request
        const requestId = requestsCounter++;
        this.getRequestId = function(){
            return "swarmName" + "phaseName" + requestId;
        };

        this.dispatch = function(err, result){
            result = OwM.prototype.convert(result);
            const currentPhaseName = result.getMeta("phaseName");
            const currentSwarmName = result.getMeta("swarmTypeName");
            if((currentSwarmName === swarmName || swarmName === '*') && (currentPhaseName === phaseName || phaseName === '*')) {
                return callback(err, result);
            }
        };
    }

    this.on = function(swarmName, phaseName, callback){
        const c = new CatchAll(swarmName, phaseName, callback);
        allCatchAlls.push({
            s:swarmName,
            p:phaseName,
            c:c
        });

        if(!channelInitialized) {
            $$.remote.doHttpPut(getRemoteToCreateChannel(returnRemoteEndPoint, homeSecurityContext), 'someSignature', (err) => {
                if(err) {
                    if(err.statusCode !== 409) {
                        channelInitialized = false;
                        c.dispatch(err); // should this be here?
                        return;
                    }
                }

                channelInitialized = true;
                $$.remote.requestManager.poll(getRemoteToReceiveMessage(remoteEndPoint, domainInfo.domain) , c);
            });
        } else {
            $$.remote.requestManager.poll(getRemoteToReceiveMessage(remoteEndPoint, domainInfo.domain) , c);
        }

    };

    this.off = function(swarmName, phaseName){
        allCatchAlls.forEach(function(ca){
            if((ca.s === swarmName || swarmName === '*') && (phaseName === ca.p || phaseName === '*')){
                $$.remote.requestManager.unpoll(getRemoteToReceiveMessage(remoteEndPoint, domainInfo.domain), ca.c);
            }
        });
    };

    this.uploadCSB = function(cryptoUid, binaryData, callback){
        $$.remote.doHttpPost(baseOfRemoteEndPoint + "/CSB/" + cryptoUid, binaryData, callback);
    };

    this.downloadCSB = function(cryptoUid, callback){
        $$.remote.doHttpGet(baseOfRemoteEndPoint + "/CSB/" + cryptoUid, callback);
    };

    function getRemoteToReceiveMessage(baseUrl, domain){
        return [urlEndWithSlash(baseUrl), receiveEndpoint, $$.remote.base64Encode(domain)].join("");
    }

    function getRemoteToSendMessage(baseUrl, domain){
        return [urlEndWithSlash(baseUrl), sendEndpoint, $$.remote.base64Encode(domain)].join("");
    }

    function getRemoteToCreateChannel(baseUrl, domain) {
        return [urlEndWithSlash(baseUrl), createChannelEndpoint, $$.remote.base64Encode(domain)].join("");

    }
}

/********************** initialisation stuff **********************************/
if (typeof $$ === "undefined") {
    $$ = {};
}

if (typeof  $$.remote === "undefined") {
    $$.remote = {};
    $$.remote.createRequestManager = function(timeOut){
        $$.remote.requestManager = new RequestManager(timeOut);
    };


    $$.remote.cryptoProvider = null;
    $$.remote.newEndPoint = function(alias, remoteEndPoint, agentUid, options){
        if(alias === "newRemoteEndPoint" || alias === "requestManager" || alias === "cryptoProvider"){
            console.log("PskHttpClient Unsafe alias name:", alias);
            return null;
        }

        $$.remote[alias] = new PskHttpClient(remoteEndPoint, agentUid, options);
    };


    $$.remote.doHttpPost = function (url, data, callback){
        throw new Error("Overwrite this!");
    };

    $$.remote.doHttpPut = function (url, data, callback){
        throw new Error("Overwrite this!");
    };

    $$.remote.doHttpGet = function doHttpGet(url, callback){
        throw new Error("Overwrite this!");
    };

    $$.remote.base64Encode = function base64Encode(stringToEncode){
        throw new Error("Overwrite this!");
    };

    $$.remote.base64Decode = function base64Decode(encodedString){
        throw new Error("Overwrite this!");
    };
}

/*  interface
function CryptoProvider(){

    this.generateSafeUid = function(){

    }

    this.signSwarm = function(swarm, agent){

    }
} */

},{"swarmutils":false}],"/opt/new_swarm_engine_release/privatesky/modules/psk-http-client/lib/psk-browser-client.js":[function(require,module,exports){
(function (Buffer){
function generateMethodForRequestWithData(httpMethod) {
    return function (url, data, callback) {
        const xhr = new XMLHttpRequest();

        xhr.onload = function () {
            if (xhr.readyState === 4 && (xhr.status >= 200 && xhr.status < 300)) {
                const data = xhr.response;
                callback(null, data);
            } else {
                if(xhr.status>=400){
                    const error = new Error("An error occured. StatusCode: " + xhr.status);
                    callback({error: error, statusCode: xhr.status});
                } else {
                    console.log(`Status code ${xhr.status} received, response is ignored.`);
                }
            }
        };

        xhr.open(httpMethod, url, true);
        //xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

        if(data && data.pipe && typeof data.pipe === "function"){
            const buffers = [];
            data.on("data", function(data) {
                buffers.push(data);
            });
            data.on("end", function() {
                const actualContents = Buffer.concat(buffers);
                xhr.send(actualContents);
            });
        }
        else {
            if(ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
                xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            }

            xhr.send(data);
        }
    };
}


$$.remote.doHttpPost = generateMethodForRequestWithData('POST');

$$.remote.doHttpPut = generateMethodForRequestWithData('PUT');


$$.remote.doHttpGet = function doHttpGet(url, callback) {

    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
        //check if headers were received and if any action should be performed before receiving data
        if (xhr.readyState === 2) {
            var contentType = xhr.getResponseHeader("Content-Type");
            if (contentType === "application/octet-stream") {
                xhr.responseType = 'arraybuffer';
            }
        }
    };

    xhr.onload = function () {

        if (xhr.readyState === 4 && xhr.status == "200") {
            var contentType = xhr.getResponseHeader("Content-Type");

            if(contentType==="application/octet-stream"){
                let responseBuffer = this.response;
                callback(null, responseBuffer);
            }
            else{
                callback(null, xhr.response);
            }

        } else {
            callback(new Error("An error occured. StatusCode: " + xhr.status));
        }
    };

    xhr.open("GET", url);
    xhr.send();
};


function CryptoProvider(){

    this.generateSafeUid = function(){
        let uid = "";
        var array = new Uint32Array(10);
        window.crypto.getRandomValues(array);


        for (var i = 0; i < array.length; i++) {
            uid += array[i].toString(16);
        }

        return uid;
    }

    this.signSwarm = function(swarm, agent){
        swarm.meta.signature = agent;
    }
}



$$.remote.cryptoProvider = new CryptoProvider();

$$.remote.base64Encode = function base64Encode(stringToEncode){
    return window.btoa(stringToEncode);
};

$$.remote.base64Decode = function base64Decode(encodedString){
    return window.atob(encodedString);
};

}).call(this,require("buffer").Buffer)

},{"buffer":false}],"/opt/new_swarm_engine_release/privatesky/modules/psk-http-client/lib/psk-node-client.js":[function(require,module,exports){
(function (Buffer){
require("./psk-abstract-client");

const http = require("http");
const https = require("https");
const URL = require("url");
const userAgent = 'PSK NodeAgent/0.0.1';
const signatureHeaderName = process.env.vmq_signature_header_name || "x-signature";


console.log("PSK node client loading");

function getNetworkForOptions(options) {
	if(options.protocol === 'http:') {
		return http;
	} else if(options.protocol === 'https:') {
		return https;
	} else {
		throw new Error(`Can't handle protocol ${options.protocol}`);
	}

}

function generateMethodForRequestWithData(httpMethod) {
	return function (url, data, callback) {
		const innerUrl = URL.parse(url);

		const options = {
			hostname: innerUrl.hostname,
			path: innerUrl.pathname,
			port: parseInt(innerUrl.port),
			headers: {
				'User-Agent': userAgent,
				[signatureHeaderName]: 'replaceThisPlaceholderSignature'
			},
			method: httpMethod
		};

		const network = getNetworkForOptions(innerUrl);

		if (ArrayBuffer.isView(data) || Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
			if (!Buffer.isBuffer(data)) {
				data = Buffer.from(data);
			}

			options.headers['Content-Type'] = 'application/octet-stream';
			options.headers['Content-Length'] = data.length;
		}

		const req = network.request(options, (res) => {
			const {statusCode} = res;

			let error;
			if (statusCode >= 400) {
				error = new Error('Request Failed.\n' +
					`Status Code: ${statusCode}\n` +
					`URL: ${options.hostname}:${options.port}${options.path}`);
			}

			if (error) {
				callback({error: error, statusCode: statusCode});
				// free up memory
				res.resume();
				return;
			}

			let rawData = '';
			res.on('data', (chunk) => {
				rawData += chunk;
			});
			res.on('end', () => {
				try {
					return callback(null, rawData, res.headers);
				} catch (err) {
					return callback(err);
				}
			});
		}).on("error", (error) => {
			console.log("POST Error", error);
			callback(error);
		});

		if (data && data.pipe && typeof data.pipe === "function") {
			data.pipe(req);
			return;
		}

		if (typeof data !== 'string' && !Buffer.isBuffer(data) && !ArrayBuffer.isView(data)) {
			data = JSON.stringify(data);
		}

		req.write(data);
		req.end();
	};
}

$$.remote.doHttpPost = generateMethodForRequestWithData('POST');

$$.remote.doHttpPut = generateMethodForRequestWithData('PUT');

$$.remote.doHttpGet = function doHttpGet(url, callback){
    const innerUrl = URL.parse(url);

	const options = {
		hostname: innerUrl.hostname,
		path: innerUrl.pathname + (innerUrl.search || ''),
		port: parseInt(innerUrl.port),
		headers: {
			'User-Agent': userAgent,
            [signatureHeaderName]: 'someSignature'
		},
		method: 'GET'
	};

	const network = getNetworkForOptions(innerUrl);

	const req = network.request(options, (res) => {
		const { statusCode } = res;

		let error;
		if (statusCode !== 200) {
			error = new Error('Request Failed.\n' +
				`Status Code: ${statusCode}`);
			error.code = statusCode;
		}

		if (error) {
			callback({error:error, statusCode:statusCode});
			// free up memory
			res.resume();
			return
		}

		let rawData;
		const contentType = res.headers['content-type'];

		if(contentType === "application/octet-stream"){
			rawData = [];
		}else{
			rawData = '';
		}

		res.on('data', (chunk) => {
			if(Array.isArray(rawData)){
				rawData.push(...chunk);
			}else{
				rawData += chunk;
			}
		});
		res.on('end', () => {
			try {
				if(Array.isArray(rawData)){
					rawData = Buffer.from(rawData);
				}
				return callback(null, rawData, res.headers);
			} catch (err) {
				console.log("Client error:", err);
			}
		});
	});

	req.on("error", (error) => {
		if(error && error.code !== 'ECONNRESET'){
        	console.log("GET Error", error);
		}

		callback(error);
	});

	req.end();
};

$$.remote.base64Encode = function base64Encode(stringToEncode){
    return Buffer.from(stringToEncode).toString('base64');
};

$$.remote.base64Decode = function base64Decode(encodedString){
    return Buffer.from(encodedString, 'base64').toString('ascii');
};

}).call(this,require("buffer").Buffer)

},{"./psk-abstract-client":"/opt/new_swarm_engine_release/privatesky/modules/psk-http-client/lib/psk-abstract-client.js","buffer":false,"http":false,"https":false,"url":false}],"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/ChannelsManager.js":[function(require,module,exports){
(function (Buffer,__dirname){
const storageFolder = process.env.vmq_channel_storage || "../tmp";
const maxQueueSize = process.env.vmq_max_queue_size || 100;
const tokenSize = process.env.vmq_token_size || 48;
const tokenHeaderName = process.env.vmq_token_header_name || "x-tokenHeader";
const signatureHeaderName = process.env.vmq_signature_header_name || "x-signature";

const channelsFolderName = "channels";
const channelKeyFileName = "channel_key";

const path = require("path");
const fs = require("fs");
const crypto = require('crypto');
const integration = require("zmq_adapter");

const Queue = require("swarmutils").Queue;
const SwarmPacker = require("swarmutils").SwarmPacker;

function ChannelsManager(server){

    const rootFolder = path.join(storageFolder, channelsFolderName);
    fs.mkdirSync(rootFolder, {recursive: true});

    const channelKeys = {};
    const queues = {};
    const subscribers = {};


    process.env.enable_signature_check = true;

    let baseDir = __dirname;

    //if __dirname appears in process.cwd path it means that the code isn't run from browserified version
    //TODO: check for better implementation
    if(process.cwd().indexOf(__dirname) ===-1){
        baseDir = path.join(process.cwd(), __dirname);
    }


    const forwarder = integration.getForwarderInstance(process.env.vmq_zeromq_forward_address);

    function generateToken(){
        let buffer = crypto.randomBytes(tokenSize);
        return buffer.toString('hex');
    }

    function createChannel(name, publicKey, callback){
        let channelFolder = path.join(rootFolder, name);
        let keyFile = path.join(channelFolder, channelKeyFileName);
        let token = generateToken();

        if(typeof channelKeys[name] !== "undefined" || fs.existsSync(channelFolder)){
            let e = new Error("channel exists!");
            e.code = 409;
            return callback(e);
        }

        fs.mkdirSync(channelFolder);

        if(fs.existsSync(keyFile)){
            let e = new Error("channel exists!");
            e.code = 409;
            return callback(e);
        }

        const config = JSON.stringify({publicKey, token});
        fs.writeFile(keyFile, config, (err, res)=>{
            if(!err){
                channelKeys[name] = config;
            }
            return callback(err, !err ? token : undefined);
        });
    }

    function retriveChannelDetails(channelName, callback){
        if(typeof channelKeys[channelName] !== "undefined"){
            return callback(null, channelKeys[channelName]);
        }else{
            fs.readFile(path.join(rootFolder, channelName, channelKeyFileName), (err, res)=>{
                if(res){
                    channelKeys[channelName] = JSON.parse(res);
                }
                callback(err, channelKeys[channelName]);
            });
        }
    }

    function forwardChannel(channelName, forward, callback){
        let channelKeyFile = path.join(rootFolder, channelName, channelKeyFileName);
        fs.readFile(channelKeyFile, (err, content)=>{
            let config;
            try{
                config = JSON.parse(content);
            }catch(e){
                return callback(e);
            }

            if(typeof config !== "undefined"){
                config.forward = forward;
                fs.writeFile(channelKeyFile, JSON.stringify(config), (err, ...args)=>{
                    if(!err){
                        channelKeys[channelName] = config;
                    }
                    callback(err, ...args);
                });
            }
        });
    }

    function readBody(req, callback){
        let data = "";
        req.on("data", (messagePart)=>{
            data += messagePart;
        });

        req.on("end", ()=>{
           callback(null, data);
        });

        req.on("error", (err)=>{
           callback(err);
        });
    }

    function createChannelHandler(req, res){
        const channelName = req.params.channelName;

        readBody(req, (err, message)=>{
            if(err){
                return sendStatus(res, 400);
            }

            const publicKey = message;
            if (typeof channelName !== "string" || channelName.length === 0 ||
                typeof publicKey !== "string" || publicKey.length === 0) {
                return sendStatus(res, 400);
            }

            let handler = getBasicReturnHandler(res);

            createChannel(channelName, publicKey, (err, token)=>{
                if(!err){
                    res.setHeader('Cookie', [`${tokenHeaderName}=${token}`]);
                }
                handler(err, res);
            });
        });
    }

    function sendStatus(res, reasonCode){
        res.statusCode = reasonCode;
        res.end();
    }

    function getBasicReturnHandler(res){
        return function(err, result){
            if(err){
                return sendStatus(res, err.code || 500);
            }

            return sendStatus(res, 200);
        }
    }

    function enableForwarderHandler(req, res){

        readBody(req, (err, message)=>{
            const {enable} = message;
            const channelName = req.params.channelName;
            const signature = req.headers[signatureHeaderName];

            if(typeof channelName !== "string" || typeof signature !== "string"){
                return sendStatus(res, 400);
            }

            retriveChannelDetails(channelName, (err, details)=>{
                if(err){
                    return sendStatus(res, 500);
                }else{
                    //todo: check signature against key [details.publickey]

                    if(typeof enable === "undefined" || enable){
                        forwardChannel(channelName, true, getBasicReturnHandler(res));
                    }else{
                        forwardChannel(channelName, null, getBasicReturnHandler(res));
                    }
                }
            });
        });
    }

    function getQueue(name){
        if(typeof queues[name] === "undefined"){
            queues[name] = new Queue();
        }

        return queues[name];
    }

    function checkIfChannelExist(channelName, callback){
        retriveChannelDetails(channelName, (err, details)=>{
            callback(null, err ? false : true);
        });
    }

    function writeMessage(subscribers, message){
        let dispatched = false;
        try {
            while(subscribers.length>0){
                let subscriber = subscribers.pop();
                if(!dispatched){
                    deliverMessage(subscriber, message);
                    dispatched = true;
                }else{
                    sendStatus(subscriber, 403);
                }
            }
        }catch(err) {
            //... some subscribers could have a timeout connection
            if(subscribers.length>0){
                deliverMessage(subscribers, message);
            }
        }

        return dispatched;
    }

    function readSendMessageBody(req, callback){
        const contentType = req.headers['content-type'];

        if (contentType === 'application/octet-stream') {
            const contentLength = Number.parseInt(req.headers['content-length'], 10);

            if(Number.isNaN(contentLength)){
                let error = new Error("Wrong content length header received!");
                error.code = 411;
                return callback(error);
            }

            streamToBuffer(req, contentLength, (err, bodyAsBuffer) => {
                if(err) {
                    return callback(err);
                }
                callback(undefined, bodyAsBuffer);
            });
        } else {
            callback(new Error("Wrong message format received!"));
        }

        function streamToBuffer(stream, bufferSize, callback) {
            const buffer = Buffer.alloc(bufferSize);
            let currentOffset = 0;

            stream.on('data', function(chunk){
                const chunkSize = chunk.length;
                const nextOffset = chunkSize + currentOffset;

                if (currentOffset > bufferSize - 1) {
                    stream.close();
                    return callback(new Error('Stream is bigger than reported size'));
                }

                write2Buffer(buffer, chunk, currentOffset);
                currentOffset = nextOffset;

            });
            stream.on('end', function(){
                callback(undefined, buffer);
            });
            stream.on('error', callback);
        }

        function write2Buffer(buffer, dataToAppend, offset) {
            const dataSize = dataToAppend.length;

            for (let i = 0; i < dataSize; i++) {
                buffer[offset++] = dataToAppend[i];
            }
        }
    }

    function sendMessageHandler(req, res){
        let channelName = req.params.channelName;

        checkIfChannelExist(channelName, (err, exists)=>{
            if(!exists){
                return sendStatus(res, 403);
            }else{
                retriveChannelDetails(channelName, (err, details)=>{
                    //we choose to read the body of request only after we know that we recognize the destination channel
                    readSendMessageBody(req, (err, message)=>{
                        if(err){
                            //console.log(err);
                            return sendStatus(res, 403);
                        }

                        let header;
                        try{
                            header = SwarmPacker.unpack(message.buffer);
                        }catch(error){
                            //console.log(error);
                            return sendStatus(res, 400);
                        }

                        //TODO: to all checks based on message header

                        if(details.forward){
                            //console.log("Forwarding message <", message, "> on channel", channelName);
                            forwarder.send(channelName, message);
                        }else{
                            let queue = getQueue(channelName);
                            let subscribers = getSubscribersList(channelName);
                            let dispatched = false;
                            if(queue.isEmpty()){
                                dispatched = writeMessage(subscribers, message);
                            }
                            if(!dispatched) {
                                if(queue.length < maxQueueSize){
                                    queue.push(message);
                                }else{
                                    //queue is full
                                    return sendStatus(res, 429);
                                }

                                /*
                                if(subscribers.length>0){
                                    //... if we have somebody waiting for a message and the queue is not empty means that something bad
                                    //happened and maybe we should try to dispatch first message from queue
                                }
                                */

                            }
                        }
                        return sendStatus(res, 200);
                    });
                })
            }
        });
    }

    function getSubscribersList(channelName){
        if(typeof subscribers[channelName] === "undefined"){
            subscribers[channelName] = [];
        }

        return subscribers[channelName];
    }

    function deliverMessage(res, message){
        if(Buffer.isBuffer(message)) {
            res.setHeader('content-type', 'application/octet-stream');
        }

        if(typeof message.length !== "undefined"){
            res.setHeader('content-length', message.length);
        }

        res.write(message);
        sendStatus(res, 200);
    }

    function getCookie(res, cookieName){
        let cookies = res.headers['cookie'];
        if(typeof cookies === "undefined"){
            return undefined;
        }
        if(Array.isArray(cookies)){
            for(let i=0; i<cookies.length; i++){
                let cookie = cookies[i];
                if(cookie.indexOf(cookieName) !== -1){
                    return cookie.substr(cookieName.length+1);
                }
            }
        }else{
            cookieName = cookieName.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');

            let regex = new RegExp('(?:^|;)\\s?' + cookieName + '=(.*?)(?:;|$)','i');
            let match = cookies.match(regex);

            return match && unescape(match[1]);
        }
    }

    function receiveMessageHandler(req, res){
        let channelName = req.params.channelName;
        checkIfChannelExist(channelName, (err, exists)=>{
            if(!exists){
                return sendStatus(res, 403);
            }else{
                retriveChannelDetails(channelName, (err, details)=>{
                    if(err){
                        return sendStatus(res, 500);
                    }
                    //TODO: check signature agains details.publickey


                    if(details.forward){
                        //if channel is forward it does not make sense
                        return sendStatus(res, 409);
                    }

                    /*let signature = req.headers["signature"];
                    if(typeof signature === "undefined"){
                        return sendStatus(res, 403);
                    }*/

                    // let cookie = getCookie(req, tokenHeaderName);

                    // if(typeof cookie === "undefined" || cookie === null){
                    //     return sendStatus(res, 412);
                    // }

                    let queue = getQueue(channelName);
                    let message = queue.pop();

                    if(!message){
                        getSubscribersList(channelName).push(res);
                    }else{
                        deliverMessage(res, message);
                    }
                });
            }
        });
    }

    server.put("/create-channel/:channelName", createChannelHandler);
    server.post("/forward-zeromq/:channelName", enableForwarderHandler);
    server.post("/send-message/:channelName", sendMessageHandler);
    server.get("/receive-message/:channelName", receiveMessageHandler);
}

module.exports = ChannelsManager;
}).call(this,require("buffer").Buffer,"/modules/virtualmq")

},{"buffer":false,"crypto":false,"fs":false,"path":false,"swarmutils":false,"zmq_adapter":"zmq_adapter"}],"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/VMQRequestFactory.js":[function(require,module,exports){
(function (Buffer){
const http = require('http');
const {URL} = require('url');
const swarmUtils = require('swarmutils');
const SwarmPacker = swarmUtils.SwarmPacker;
const signatureHeaderName = process.env.vmq_signature_header_name || "x-signature";

function RequestFactory(virtualMQAddress, zeroMQAddress) {
    function createChannel(channelName, publicKey, callback) {
        const options = {
            path: `/create-channel/${channelName}`,
            method: "PUT"
        };

        const req = http.request(virtualMQAddress, options, callback);
        req.write(publicKey);
        req.end();
    }

    function createForwardChannel(channelName, publicKey, callback) {
        const options = {
            path: `/create-channel/${channelName}`,
            method: "PUT"
        };

        const req = http.request(virtualMQAddress, options, (res) => {
            this.enableForward(channelName, "justASignature", callback);
        });
        req.write(publicKey);
        req.end();
    }

    function enableForward(channelName, signature, callback) {
        const options = {
            path: `/forward-zeromq/${channelName}`,
            method: "POST"
        };

        const req = http.request(virtualMQAddress, options, callback);
        req.setHeader(signatureHeaderName, signature);
        req.end();
    }

    function sendMessage(channelName, message, signature, callback) {
        const options = {
            path: `/send-message/${channelName}`,
            method: "POST"
        };

        const req = http.request(virtualMQAddress, options, callback);
        req.setHeader(signatureHeaderName, signature);

        let pack = SwarmPacker.pack(message);

        req.setHeader("content-length", pack.byteLength);
        req.setHeader("content-type", 'application/octet-stream');
        req.write(Buffer.from(pack));
        req.end();
    }

    function receiveMessage(channelName, signature, callback) {
        const options = {
            path: `/receive-message/${channelName}`,
            method: "GET"
        };

        const req = http.request(virtualMQAddress, options, function (res) {
            const utils = require("./utils");
            utils.readMessageBufferFromStream(res, function (err, message) {

                callback(err, res, (message && Buffer.isBuffer(message)) ? SwarmPacker.unpack(message.buffer) : message);
            });
        });

        req.setHeader(signatureHeaderName, signature);
        req.end();
    }

    function receiveMessageFromZMQ(channelName, signature, readyCallback, receivedCallback) {
        const zmqIntegration = require("zmq_adapter");

        let catchEvents = (eventType, ...args) => {
            // console.log("Event type caught", eventType, ...args);
            if (eventType === "connect") {
                //connected so all good
                readyCallback();
            }
        };

        let consumer = zmqIntegration.createZeromqConsumer(zeroMQAddress, catchEvents);
        consumer.subscribe(channelName, signature, (channel, receivedMessage) => {
            receivedCallback(JSON.parse(channel.toString()).channelName, receivedMessage.buffer);
        });
    }

    function generateMessage(swarmName, swarmPhase, args, targetAgent, returnAddress){
        return {
            meta:{
                swarmId: swarmUtils.generateUid(32).toString("hex"),
                requestId: swarmUtils.generateUid(32).toString("hex"),
                swarmTypeName: swarmName || "testSwarmType",
                phaseName: swarmPhase || "swarmPhaseName",
                args: args || [],
                command: "executeSwarmPhase",
                target: targetAgent || "agentURL",
                homeSecurityContext: returnAddress || "no_home_no_return"
            }};
    }

    function getPort() {
        try {
            return new URL(virtualMQAddress).port;
        } catch (e) {
          console.error(e);
        }
    }

    // targeted virtualmq apis
    this.createChannel = createChannel;
    this.createForwardChannel = createForwardChannel;
    this.enableForward = enableForward;
    this.sendMessage = sendMessage;
    this.receiveMessage = receiveMessage;
    this.receiveMessageFromZMQ = receiveMessageFromZMQ;

    // utils for testing
    if(!process.env.NODE_ENV || (process.env.NODE_ENV && !process.env.NODE_ENV.startsWith('prod'))) { // if NODE_ENV does not exist or if it exists and is not set to production
        this.getPort = getPort;
        this.generateMessage = generateMessage;
    }
}

module.exports = RequestFactory;
}).call(this,require("buffer").Buffer)

},{"./utils":"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/utils.js","buffer":false,"http":false,"swarmutils":false,"url":false,"zmq_adapter":"zmq_adapter"}],"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/fileManager.js":[function(require,module,exports){
(function (Buffer){
const fs = require('fs');
const path = require('path');
let rootFolder = process.env.npm_package_config_ROOT_FILE_UPLOAD || process.env.ROOT_FILE_UPLOAD || "./FileUploads";

rootFolder = path.resolve(rootFolder);

guid = function() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};

module.exports.upload = function (req, callback) {
    const readFileStream = req;
    if(!readFileStream || !readFileStream.pipe || typeof readFileStream.pipe !== "function"){
        callback(new Error("Something wrong happened"));
        return;
    }

    const folder = Buffer.from(req.params.folder, 'base64').toString().replace('\n', '');
    if (folder.includes('..')){
        return callback('err');
    }
    let filename = guid();
    if (filename.split('.').length > 1){
        return callback('err');
    }
    const completeFolderPath = path.join( rootFolder, folder );

    const contentType = req.headers['content-type'].split('/');

    if (contentType[0] === 'image' || ( contentType[0] === 'application' && contentType[1] === 'pdf') ) {
        filename += '.' + contentType[1];
    }else {
        return callback('err');
    }
    try {
        fs.mkdirSync(completeFolderPath, { recursive: true });
    }catch (e) {
        return callback(e);
    }
    const writeStream = fs.createWriteStream( path.join(completeFolderPath, filename));

    writeStream.on('finish', () => {
        writeStream.close();
        return callback(null, {'path': path.posix.join(folder,filename)});
    });

    writeStream.on('error', (err) => {
        writeStream.close();
        return callback(err);
    });
    req.pipe(writeStream);
};

module.exports.download = function (req, res, callback) {
    const readFileStream = req;
    if(!readFileStream || !readFileStream.pipe || typeof readFileStream.pipe !== "function"){
        callback(new Error("Something wrong happened"));
        return;
    }
    const folder = Buffer.from(req.params.filepath, 'base64').toString().replace('\n', '');

    const completeFolderPath = path.join( rootFolder, folder );
    if (folder.includes('..')){
        return callback('err');
    }
    if (fs.existsSync(completeFolderPath)) {
        const fileToSend = fs.createReadStream(completeFolderPath);
        res.setHeader('Content-Type', `image/${folder.split('.')[1]}`);
        return callback(null, fileToSend);
    }
    else {
        return callback('err');
    }
};

}).call(this,require("buffer").Buffer)

},{"buffer":false,"fs":false,"path":false}],"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/TokenBucket.js":[function(require,module,exports){
/**
 * An implementation of the Token bucket algorithm
 * @param startTokens - maximum number of tokens possible to obtain and the default starting value
 * @param tokenValuePerTime - number of tokens given back for each "unitOfTime"
 * @param unitOfTime - for each "unitOfTime" (in milliseconds) passed "tokenValuePerTime" amount of tokens will be given back
 * @constructor
 */

function TokenBucket(startTokens = 6000, tokenValuePerTime = 10, unitOfTime = 100) {

    if(typeof startTokens !== 'number' || typeof  tokenValuePerTime !== 'number' || typeof unitOfTime !== 'number') {
        throw new Error('All parameters must be of type number');
    }

    if(isNaN(startTokens) || isNaN(tokenValuePerTime) || isNaN(unitOfTime)) {
        throw new Error('All parameters must not be NaN');
    }

    if(startTokens <= 0 || tokenValuePerTime <= 0 || unitOfTime <= 0) {
        throw new Error('All parameters must be bigger than 0');
    }


    TokenBucket.prototype.COST_LOW    = 10;  // equivalent to 10op/s with default values
    TokenBucket.prototype.COST_MEDIUM = 100; // equivalent to 1op/s with default values
    TokenBucket.prototype.COST_HIGH   = 500; // equivalent to 12op/minute with default values

    TokenBucket.ERROR_LIMIT_EXCEEDED  = 'error_limit_exceeded';
    TokenBucket.ERROR_BAD_ARGUMENT    = 'error_bad_argument';



    const limits = {};

    function takeToken(userKey, cost, callback = () => {}) {
        if(typeof cost !== 'number' || isNaN(cost) || cost <= 0 || cost === Infinity) {
            callback(TokenBucket.ERROR_BAD_ARGUMENT);
            return;
        }

        const userBucket = limits[userKey];

        if (userBucket) {
            userBucket.tokens += calculateReturnTokens(userBucket.timestamp);
            userBucket.tokens -= cost;

            userBucket.timestamp = Date.now();



            if (userBucket.tokens < 0) {
                userBucket.tokens = 0;
                callback(TokenBucket.ERROR_LIMIT_EXCEEDED, 0);
                return;
            }

            return callback(undefined, userBucket.tokens);
        } else {
            limits[userKey] = new Limit(startTokens, Date.now());
            takeToken(userKey, cost, callback);
        }
    }

    function getLimitByCost(cost) {
        if(startTokens === 0 || cost === 0) {
            return 0;
        }

        return Math.floor(startTokens / cost);
    }

    function getRemainingTokenByCost(tokens, cost) {
        if(tokens === 0 || cost === 0) {
            return 0;
        }

        return Math.floor(tokens / cost);
    }

    function Limit(maximumTokens, timestamp) {
        this.tokens = maximumTokens;
        this.timestamp = timestamp;

        const self = this;

        return {
            set tokens(numberOfTokens) {
                if (numberOfTokens < 0) {
                    numberOfTokens = -1;
                }

                if (numberOfTokens > maximumTokens) {
                    numberOfTokens = maximumTokens;
                }

                self.tokens = numberOfTokens;
            },
            get tokens() {
                return self.tokens;
            },
            timestamp
        };
    }


    function calculateReturnTokens(timestamp) {
        const currentTime = Date.now();

        const elapsedTime = Math.floor((currentTime - timestamp) / unitOfTime);

        return elapsedTime * tokenValuePerTime;
    }

    this.takeToken               = takeToken;
    this.getLimitByCost          = getLimitByCost;
    this.getRemainingTokenByCost = getRemainingTokenByCost;
}

module.exports = TokenBucket;

},{}],"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Client.js":[function(require,module,exports){
(function (Buffer){
const http = require('http');
const url = require('url');
const stream = require('stream');

/**
 * Wraps a request and augments it with a "do" method to modify it in a "fluent builder" style
 * @param {string} url
 * @param {*} body
 * @constructor
 */
function Request(url, body) {
    this.request = {
        options: url,
        body
    };

    this.do = function (modifier) {
        modifier(this.request);
        return this;
    };

    this.getHttpRequest = function () {
        return this.request;
    };
}


/**
 * Modifies request.options to contain the url parsed instead of as string
 * @param {Object} request - Object that contains options and body
 */
function urlToOptions(request) {
    const parsedUrl = url.parse(request.options);

    // TODO: movie headers declaration from here
    request.options = {
        host: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        headers: {}
    };
}


/**
 * Transforms the request.body in a type that can be sent through network if it is needed
 * @param {Object} request - Object that contains options and body
 */
function serializeBody(request) {
    if (!request.body) {
        return;
    }

    const handler = {
        get: function (target, name) {
            return name in target ? target[name] : (data) => data;
        }
    };

    const bodySerializationMapping = new Proxy({
        'Object': (data) => JSON.stringify(data),
    }, handler);

    request.body = bodySerializationMapping[request.body.constructor.name](request.body);
}

/**
 *
 * @param {Object} request - Object that contains options and body
 */
function bodyContentLength(request) {
    if (!request.body) {
        return;
    }

    if (request.body.constructor.name in [ 'String', 'Buffer', 'ArrayBuffer' ]) {
        request.options.headers['Content-Length'] = Buffer.byteLength(request.body);
    }
}


function Client() {
    /**
     *
     * @param {Request} customRequest
     * @param modifiers - array of functions that modify the request
     * @returns {Object} - with url and body properties
     */
    function request(customRequest, modifiers) {
        for (let i = 0; i < modifiers.length; ++i) {
            customRequest.do(modifiers[i]);
        }

        return customRequest.getHttpRequest();
    }

    function getReq(url, config, callback) {
        const modifiers = [
            urlToOptions,
            (request) => {request.options.headers = config.headers || {};}
        ];

        const packedRequest = request(new Request(url, config.body), modifiers);
        const httpRequest = http.request(packedRequest.options, callback);
        httpRequest.end();

        return httpRequest;
    }

    function postReq(url, config, callback) {
        const modifiers = [
            urlToOptions,
            (request) => {request.options.method = 'POST'; },
            (request) => {request.options.headers = config.headers || {}; },
            serializeBody,
            bodyContentLength
        ];

        const packedRequest = request(new Request(url, config.body), modifiers);
        const httpRequest = http.request(packedRequest.options, callback);

        if (config.body instanceof stream.Readable) {
            config.body.pipe(httpRequest);
        }
        else {
            httpRequest.end(packedRequest.body, config.encoding || 'utf8');
        }
        return httpRequest;
    }

    function deleteReq(url, config, callback) {
        const modifiers = [
            urlToOptions,
            (request) => {request.options.method = 'DELETE';},
            (request) => {request.options.headers = config.headers || {};},
        ];

        const packedRequest = request(new Request(url, config.body), modifiers);
        const httpRequest = http.request(packedRequest.options, callback);
        httpRequest.end();

        return httpRequest;
    }

    this.get = getReq;
    this.post = postReq;
    this.delete = deleteReq;
}

/**
 * Swap third and second parameter if only two are provided and converts arguments to array
 * @param {Object} params
 * @returns {Array} - arguments as array
 */
function parametersPreProcessing(params) {
    const res = [];

    if (typeof params[0] !== 'string') {
        throw new Error('First parameter must be a string (url)');
    }

    const parsedUrl = url.parse(params[0]);

    if (!parsedUrl.hostname) {
        throw new Error('First argument (url) is not valid');
    }

    if (params.length >= 3) {
        if (typeof params[1] !== 'object' || !params[1]) {
            throw new Error('When 3 parameters are provided the second parameter must be a not null object');
        }

        if (typeof params[2] !== 'function') {
            throw new Error('When 3 parameters are provided the third parameter must be a function');
        }
    }

    if (params.length === 2) {
        if (typeof params[1] !== 'function') {
            throw new Error('When 2 parameters are provided the second one must be a function');
        }

        params[2] = params[1];
        params[1] = {};
    }

    const properties = Object.keys(params);
    for(let i = 0, len = properties.length; i < len; ++i) {
        res.push(params[properties[i]]);
    }

    return res;
}

const handler = {
    get(target, propName) {
        if (!target[propName]) {
            console.log(propName, "Not implemented!");
        } else {
            return function () {
                const args = parametersPreProcessing(arguments);
                return target[propName].apply(target, args);
            };
        }
    }
};

module.exports = function () {
    return new Proxy(new Client(), handler);
};
}).call(this,require("buffer").Buffer)

},{"buffer":false,"http":false,"stream":false,"url":false}],"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Middleware.js":[function(require,module,exports){
const querystring = require('querystring');

function matchUrl(pattern, url) {
	const result = {
		match: true,
		params: {},
		query: {}
	};

	const queryParametersStartIndex = url.indexOf('?');
	if(queryParametersStartIndex !== -1) {
		const urlQueryString = url.substr(queryParametersStartIndex + 1); // + 1 to ignore the '?'
		result.query = querystring.parse(urlQueryString);
		url = url.substr(0, queryParametersStartIndex);
	}

    const patternTokens = pattern.split('/');
    const urlTokens = url.split('/');

    if(urlTokens[urlTokens.length - 1] === '') {
        urlTokens.pop();
    }

    if (patternTokens.length !== urlTokens.length) {
        result.match = false;
    }

    if(patternTokens[patternTokens.length - 1] === '*') {
        result.match = true;
        patternTokens.pop();
    }

    for (let i = 0; i < patternTokens.length && result.match; ++i) {
        if (patternTokens[i].startsWith(':')) {
            result.params[patternTokens[i].substring(1)] = urlTokens[i];
        } else if (patternTokens[i] !== urlTokens[i]) {
            result.match = false;
        }
    }

    return result;
}

function isTruthy(value) {
    return !!value;

}

function methodMatch(pattern, method) {
    if (!pattern || !method) {
        return true;
    }

    return pattern === method;
}

function Middleware() {
    const registeredMiddlewareFunctions = [];

    function use(method, url, fn) {
        method = method ? method.toLowerCase() : undefined;
        registeredMiddlewareFunctions.push({method, url, fn});
    }

    this.use = function (...params) {
	    let args = [ undefined, undefined, undefined ];

	    switch (params.length) {
            case 0:
				throw Error('Use method needs at least one argument.');
				
            case 1:
                if (typeof params[0] !== 'function') {
                    throw Error('If only one argument is provided it must be a function');
                }

                args[2] = params[0];

                break;
            case 2:
                if (typeof params[0] !== 'string' || typeof params[1] !== 'function') {
                    throw Error('If two arguments are provided the first one must be a string (url) and the second a function');
                }

                args[1]=params[0];
                args[2]=params[1];

                break;
            default:
                if (typeof params[0] !== 'string' || typeof params[1] !== 'string' || typeof params[2] !== 'function') {
                    throw Error('If three or more arguments are provided the first one must be a string (HTTP verb), the second a string (url) and the third a function');
                }

                if (!([ 'get', 'post', 'put', 'delete', 'patch', 'head', 'connect', 'options', 'trace' ].includes(params[0].toLowerCase()))) {
                    throw new Error('If three or more arguments are provided the first one must be a HTTP verb but none could be matched');
                }

                args = params;

                break;
        }

        use.apply(this, args);
    };


    /**
     * Starts execution from the first registered middleware function
     * @param {Object} req
     * @param {Object} res
     */
    this.go = function go(req, res) {
        execute(0, req.method.toLowerCase(), req.url, req, res);
    };

    /**
     * Executes a middleware if it passes the method and url validation and calls the next one when necessary
     * @param index
     * @param method
     * @param url
     * @param params
     */
    function execute(index, method, url, ...params) {
        if (!registeredMiddlewareFunctions[index]) {
            if(index===0){
                console.error("No handlers registered yet!");
            }
            return;
        }

	    const registeredMethod = registeredMiddlewareFunctions[index].method;
	    const registeredUrl = registeredMiddlewareFunctions[index].url;
	    const fn = registeredMiddlewareFunctions[index].fn;

	    if (!methodMatch(registeredMethod, method)) {
            execute(++index, method, url, ...params);
            return;
        }

        if (isTruthy(registeredUrl)) {
            const urlMatch = matchUrl(registeredUrl, url);

            if (!urlMatch.match) {
                execute(++index, method, url, ...params);
                return;
            }

            if (params[0]) {
                params[0].params = urlMatch.params;
                params[0].query  = urlMatch.query;
            }
        }

        let counter = 0;

        fn(...params, (err) => {
            counter++;
            if (counter > 1) {
                console.warn('You called next multiple times, only the first one will be executed');
                return;
            }

            if (err) {
                console.error(err);
                return;
            }

            execute(++index, method, url, ...params);
        });
    }
}

module.exports = Middleware;

},{"querystring":false}],"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Router.js":[function(require,module,exports){
function Router(server) {
    this.use = function use(url, callback) {
        callback(serverWrapper(url, server));
    };
}

function serverWrapper(baseUrl, server) {
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.substring(0, baseUrl.length - 1);
    }

    return {
        use(url, reqResolver) {
            server.use(baseUrl + url, reqResolver);
        },
        get(url, reqResolver) {
            server.get(baseUrl + url, reqResolver);
        },
        post(url, reqResolver) {
            server.post(baseUrl + url, reqResolver);
        },
        put(url, reqResolver) {
            server.put(baseUrl + url, reqResolver);
        },
        delete(url, reqResolver) {
            server.delete(baseUrl + url, reqResolver);
        },
        options(url, reqResolver) {
            server.options(baseUrl + url, reqResolver);
        }
    };
}

module.exports = Router;

},{}],"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Server.js":[function(require,module,exports){
const Middleware = require('./Middleware');
const http = require('http');
const https = require('https');

function Server(sslOptions) {
    const middleware = new Middleware();
    const server = _initServer(sslOptions);


    this.use = function use(url, callback) {
        //TODO: find a better way
        if (arguments.length >= 2) {
            middleware.use(url, callback);
        } else if (arguments.length === 1) {
            callback = url;
            middleware.use(callback);
        }

    };


    this.get = function getReq(reqUrl, reqResolver) {
        middleware.use("GET", reqUrl, reqResolver);
    };

    this.post = function postReq(reqUrl, reqResolver) {
        middleware.use("POST", reqUrl, reqResolver);
    };

    this.put = function putReq(reqUrl, reqResolver) {
        middleware.use("PUT", reqUrl, reqResolver);
    };

    this.delete = function deleteReq(reqUrl, reqResolver) {
        middleware.use("DELETE", reqUrl, reqResolver);
    };

    this.options = function optionsReq(reqUrl, reqResolver) {
        middleware.use("OPTIONS", reqUrl, reqResolver);
    };


    /* INTERNAL METHODS */

    function _initServer(sslConfig) {
        if (sslConfig) {
            return https.createServer(sslConfig, middleware.go);
        } else {
            return http.createServer(middleware.go);
        }
    }

    return new Proxy(this, {
       get(target, prop, receiver) {
           if(typeof target[prop] !== "undefined") {
               return target[prop];
           }

           if(typeof server[prop] === "function") {
               return function(...args) {
                   server[prop](...args);
               }
           } else {
               return server[prop];
           }
       }
    });
}

module.exports = Server;
},{"./Middleware":"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Middleware.js","http":false,"https":false}],"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/http-wrapper/src/httpUtils.js":[function(require,module,exports){
const fs = require('fs');
const path = require('path');

function setDataHandler(request, callback) {
    let bodyContent = '';

    request.on('data', function (dataChunk) {
        bodyContent += dataChunk;
    });

    request.on('end', function () {
        callback(undefined, bodyContent);
    });

    request.on('error', callback);
}

function setDataHandlerMiddleware(request, response, next) {
    if (request.headers['content-type'] !== 'application/octet-stream') {
        setDataHandler(request, function (error, bodyContent) {
            request.body = bodyContent;
            next(error);
        });
    } else {
        return next();
    }
}

function sendErrorResponse(error, response, statusCode) {
    console.error(error);
    response.statusCode = statusCode;
    response.end();
}

function bodyParser(req, res, next) {
    let bodyContent = '';

    req.on('data', function (dataChunk) {
        bodyContent += dataChunk;
    });

    req.on('end', function () {
        req.body = bodyContent;
        next();
    });

    req.on('error', function (err) {
        next(err);
    });
}

function serveStaticFile(baseFolder, ignorePath) {
    return function (req, res) {
        const url = req.url.substring(ignorePath.length);
        const filePath = path.join(baseFolder, url);
        fs.stat(filePath, (err) => {
            if (err) {
                res.statusCode = 404;
                res.end();
                return;
            }

            if (url.endsWith('.html')) {
                res.contentType = 'text/html';
            } else if (url.endsWith('.css')) {
                res.contentType = 'text/css';
            } else if (url.endsWith('.js')) {
                res.contentType = 'text/javascript';
            }

            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

        });
    };
}

module.exports = {setDataHandler, setDataHandlerMiddleware, sendErrorResponse, bodyParser, serveStaticFile};

},{"fs":false,"path":false}],"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/http-wrapper/src/index.js":[function(require,module,exports){
const Client = require('./classes/Client');
const Server = require('./classes/Server');
const httpUtils = require('./httpUtils');
const Router = require('./classes/Router');

module.exports = {Server, Client, httpUtils, Router};


},{"./classes/Client":"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Client.js","./classes/Router":"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Router.js","./classes/Server":"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Server.js","./httpUtils":"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/http-wrapper/src/httpUtils.js"}],"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/utils.js":[function(require,module,exports){
(function (Buffer){
function readMessageBufferFromHTTPStream(reqORres, callback){
    const contentType = reqORres.headers['content-type'];

    if (contentType === 'application/octet-stream') {
        const contentLength = Number.parseInt(reqORres.headers['content-length'], 10);

        if(Number.isNaN(contentLength)){
            return callback(new Error("Wrong content length header received!"));
        }

        streamToBuffer(reqORres, contentLength, (err, bodyAsBuffer) => {
            if(err) {
                return callback(err);
            }
            callback(undefined, bodyAsBuffer);
        });
    } else {
        callback(new Error("Wrong message format received!"));
    }

    function streamToBuffer(stream, bufferSize, callback) {
        const buffer = Buffer.alloc(bufferSize);
        let currentOffset = 0;

        stream.on('data', function(chunk){
            const chunkSize = chunk.length;
            const nextOffset = chunkSize + currentOffset;

            if (currentOffset > bufferSize - 1) {
                stream.close();
                return callback(new Error('Stream is bigger than reported size'));
            }

            write2Buffer(buffer, chunk, currentOffset);
            currentOffset = nextOffset;

        });
        stream.on('end', function(){
            callback(undefined, buffer);
        });
        stream.on('error', callback);
    }

    function write2Buffer(buffer, dataToAppend, offset) {
        const dataSize = dataToAppend.length;

        for (let i = 0; i < dataSize; i++) {
            buffer[offset++] = dataToAppend[i];
        }
    }
}

module.exports.readMessageBufferFromStream = readMessageBufferFromHTTPStream;
}).call(this,require("buffer").Buffer)

},{"buffer":false}],"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/array-set.js":[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = require('./util');
var has = Object.prototype.hasOwnProperty;
var hasNativeMap = typeof Map !== "undefined";

/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
function ArraySet() {
  this._array = [];
  this._set = hasNativeMap ? new Map() : Object.create(null);
}

/**
 * Static method for creating ArraySet instances from an existing array.
 */
ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
  var set = new ArraySet();
  for (var i = 0, len = aArray.length; i < len; i++) {
    set.add(aArray[i], aAllowDuplicates);
  }
  return set;
};

/**
 * Return how many unique items are in this ArraySet. If duplicates have been
 * added, than those do not count towards the size.
 *
 * @returns Number
 */
ArraySet.prototype.size = function ArraySet_size() {
  return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
};

/**
 * Add the given string to this set.
 *
 * @param String aStr
 */
ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
  var sStr = hasNativeMap ? aStr : util.toSetString(aStr);
  var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
  var idx = this._array.length;
  if (!isDuplicate || aAllowDuplicates) {
    this._array.push(aStr);
  }
  if (!isDuplicate) {
    if (hasNativeMap) {
      this._set.set(aStr, idx);
    } else {
      this._set[sStr] = idx;
    }
  }
};

/**
 * Is the given string a member of this set?
 *
 * @param String aStr
 */
ArraySet.prototype.has = function ArraySet_has(aStr) {
  if (hasNativeMap) {
    return this._set.has(aStr);
  } else {
    var sStr = util.toSetString(aStr);
    return has.call(this._set, sStr);
  }
};

/**
 * What is the index of the given string in the array?
 *
 * @param String aStr
 */
ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
  if (hasNativeMap) {
    var idx = this._set.get(aStr);
    if (idx >= 0) {
        return idx;
    }
  } else {
    var sStr = util.toSetString(aStr);
    if (has.call(this._set, sStr)) {
      return this._set[sStr];
    }
  }

  throw new Error('"' + aStr + '" is not in the set.');
};

/**
 * What is the element at the given index?
 *
 * @param Number aIdx
 */
ArraySet.prototype.at = function ArraySet_at(aIdx) {
  if (aIdx >= 0 && aIdx < this._array.length) {
    return this._array[aIdx];
  }
  throw new Error('No element indexed by ' + aIdx);
};

/**
 * Returns the array representation of this set (which has the proper indices
 * indicated by indexOf). Note that this is a copy of the internal array used
 * for storing the members so that no one can mess with internal state.
 */
ArraySet.prototype.toArray = function ArraySet_toArray() {
  return this._array.slice();
};

exports.ArraySet = ArraySet;

},{"./util":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/util.js"}],"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/base64-vlq.js":[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var base64 = require('./base64');

// A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

var VLQ_BASE_SHIFT = 5;

// binary: 100000
var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

// binary: 011111
var VLQ_BASE_MASK = VLQ_BASE - 1;

// binary: 100000
var VLQ_CONTINUATION_BIT = VLQ_BASE;

/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */
function toVLQSigned(aValue) {
  return aValue < 0
    ? ((-aValue) << 1) + 1
    : (aValue << 1) + 0;
}

/**
 * Converts to a two-complement value from a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
 */
function fromVLQSigned(aValue) {
  var isNegative = (aValue & 1) === 1;
  var shifted = aValue >> 1;
  return isNegative
    ? -shifted
    : shifted;
}

/**
 * Returns the base 64 VLQ encoded value.
 */
exports.encode = function base64VLQ_encode(aValue) {
  var encoded = "";
  var digit;

  var vlq = toVLQSigned(aValue);

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;
    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }
    encoded += base64.encode(digit);
  } while (vlq > 0);

  return encoded;
};

/**
 * Decodes the next base 64 VLQ value from the given string and returns the
 * value and the rest of the string via the out parameter.
 */
exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
  var strLen = aStr.length;
  var result = 0;
  var shift = 0;
  var continuation, digit;

  do {
    if (aIndex >= strLen) {
      throw new Error("Expected more digits in base 64 VLQ value.");
    }

    digit = base64.decode(aStr.charCodeAt(aIndex++));
    if (digit === -1) {
      throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
    }

    continuation = !!(digit & VLQ_CONTINUATION_BIT);
    digit &= VLQ_BASE_MASK;
    result = result + (digit << shift);
    shift += VLQ_BASE_SHIFT;
  } while (continuation);

  aOutParam.value = fromVLQSigned(result);
  aOutParam.rest = aIndex;
};

},{"./base64":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/base64.js"}],"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/base64.js":[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */
exports.encode = function (number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }
  throw new TypeError("Must be between 0 and 63: " + number);
};

/**
 * Decode a single base 64 character code digit to an integer. Returns -1 on
 * failure.
 */
exports.decode = function (charCode) {
  var bigA = 65;     // 'A'
  var bigZ = 90;     // 'Z'

  var littleA = 97;  // 'a'
  var littleZ = 122; // 'z'

  var zero = 48;     // '0'
  var nine = 57;     // '9'

  var plus = 43;     // '+'
  var slash = 47;    // '/'

  var littleOffset = 26;
  var numberOffset = 52;

  // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
  if (bigA <= charCode && charCode <= bigZ) {
    return (charCode - bigA);
  }

  // 26 - 51: abcdefghijklmnopqrstuvwxyz
  if (littleA <= charCode && charCode <= littleZ) {
    return (charCode - littleA + littleOffset);
  }

  // 52 - 61: 0123456789
  if (zero <= charCode && charCode <= nine) {
    return (charCode - zero + numberOffset);
  }

  // 62: +
  if (charCode == plus) {
    return 62;
  }

  // 63: /
  if (charCode == slash) {
    return 63;
  }

  // Invalid base64 digit.
  return -1;
};

},{}],"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/binary-search.js":[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

exports.GREATEST_LOWER_BOUND = 1;
exports.LEAST_UPPER_BOUND = 2;

/**
 * Recursive implementation of binary search.
 *
 * @param aLow Indices here and lower do not contain the needle.
 * @param aHigh Indices here and higher do not contain the needle.
 * @param aNeedle The element being searched for.
 * @param aHaystack The non-empty array being searched.
 * @param aCompare Function which takes two elements and returns -1, 0, or 1.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 */
function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
  // This function terminates when one of the following is true:
  //
  //   1. We find the exact element we are looking for.
  //
  //   2. We did not find the exact element, but we can return the index of
  //      the next-closest element.
  //
  //   3. We did not find the exact element, and there is no next-closest
  //      element than the one we are searching for, so we return -1.
  var mid = Math.floor((aHigh - aLow) / 2) + aLow;
  var cmp = aCompare(aNeedle, aHaystack[mid], true);
  if (cmp === 0) {
    // Found the element we are looking for.
    return mid;
  }
  else if (cmp > 0) {
    // Our needle is greater than aHaystack[mid].
    if (aHigh - mid > 1) {
      // The element is in the upper half.
      return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
    }

    // The exact needle element was not found in this haystack. Determine if
    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return aHigh < aHaystack.length ? aHigh : -1;
    } else {
      return mid;
    }
  }
  else {
    // Our needle is less than aHaystack[mid].
    if (mid - aLow > 1) {
      // The element is in the lower half.
      return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
    }

    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return mid;
    } else {
      return aLow < 0 ? -1 : aLow;
    }
  }
}

/**
 * This is an implementation of binary search which will always try and return
 * the index of the closest element if there is no exact hit. This is because
 * mappings between original and generated line/col pairs are single points,
 * and there is an implicit region between each of them, so a miss just means
 * that you aren't on the very start of a region.
 *
 * @param aNeedle The element you are looking for.
 * @param aHaystack The array that is being searched.
 * @param aCompare A function which takes the needle and an element in the
 *     array and returns -1, 0, or 1 depending on whether the needle is less
 *     than, equal to, or greater than the element, respectively.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
 */
exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
  if (aHaystack.length === 0) {
    return -1;
  }

  var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
                              aCompare, aBias || exports.GREATEST_LOWER_BOUND);
  if (index < 0) {
    return -1;
  }

  // We have found either the exact element, or the next-closest element than
  // the one we are searching for. However, there may be more than one such
  // element. Make sure we always return the smallest of these.
  while (index - 1 >= 0) {
    if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
      break;
    }
    --index;
  }

  return index;
};

},{}],"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/mapping-list.js":[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = require('./util');

/**
 * Determine whether mappingB is after mappingA with respect to generated
 * position.
 */
function generatedPositionAfter(mappingA, mappingB) {
  // Optimized for most common case
  var lineA = mappingA.generatedLine;
  var lineB = mappingB.generatedLine;
  var columnA = mappingA.generatedColumn;
  var columnB = mappingB.generatedColumn;
  return lineB > lineA || lineB == lineA && columnB >= columnA ||
         util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
}

/**
 * A data structure to provide a sorted view of accumulated mappings in a
 * performance conscious manner. It trades a neglibable overhead in general
 * case for a large speedup in case of mappings being added in order.
 */
function MappingList() {
  this._array = [];
  this._sorted = true;
  // Serves as infimum
  this._last = {generatedLine: -1, generatedColumn: 0};
}

/**
 * Iterate through internal items. This method takes the same arguments that
 * `Array.prototype.forEach` takes.
 *
 * NOTE: The order of the mappings is NOT guaranteed.
 */
MappingList.prototype.unsortedForEach =
  function MappingList_forEach(aCallback, aThisArg) {
    this._array.forEach(aCallback, aThisArg);
  };

/**
 * Add the given source mapping.
 *
 * @param Object aMapping
 */
MappingList.prototype.add = function MappingList_add(aMapping) {
  if (generatedPositionAfter(this._last, aMapping)) {
    this._last = aMapping;
    this._array.push(aMapping);
  } else {
    this._sorted = false;
    this._array.push(aMapping);
  }
};

/**
 * Returns the flat, sorted array of mappings. The mappings are sorted by
 * generated position.
 *
 * WARNING: This method returns internal data without copying, for
 * performance. The return value must NOT be mutated, and should be treated as
 * an immutable borrow. If you want to take ownership, you must make your own
 * copy.
 */
MappingList.prototype.toArray = function MappingList_toArray() {
  if (!this._sorted) {
    this._array.sort(util.compareByGeneratedPositionsInflated);
    this._sorted = true;
  }
  return this._array;
};

exports.MappingList = MappingList;

},{"./util":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/util.js"}],"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/quick-sort.js":[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

// It turns out that some (most?) JavaScript engines don't self-host
// `Array.prototype.sort`. This makes sense because C++ will likely remain
// faster than JS when doing raw CPU-intensive sorting. However, when using a
// custom comparator function, calling back and forth between the VM's C++ and
// JIT'd JS is rather slow *and* loses JIT type information, resulting in
// worse generated code for the comparator function than would be optimal. In
// fact, when sorting with a comparator, these costs outweigh the benefits of
// sorting in C++. By using our own JS-implemented Quick Sort (below), we get
// a ~3500ms mean speed-up in `bench/bench.html`.

/**
 * Swap the elements indexed by `x` and `y` in the array `ary`.
 *
 * @param {Array} ary
 *        The array.
 * @param {Number} x
 *        The index of the first item.
 * @param {Number} y
 *        The index of the second item.
 */
function swap(ary, x, y) {
  var temp = ary[x];
  ary[x] = ary[y];
  ary[y] = temp;
}

/**
 * Returns a random integer within the range `low .. high` inclusive.
 *
 * @param {Number} low
 *        The lower bound on the range.
 * @param {Number} high
 *        The upper bound on the range.
 */
function randomIntInRange(low, high) {
  return Math.round(low + (Math.random() * (high - low)));
}

/**
 * The Quick Sort algorithm.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 * @param {Number} p
 *        Start index of the array
 * @param {Number} r
 *        End index of the array
 */
function doQuickSort(ary, comparator, p, r) {
  // If our lower bound is less than our upper bound, we (1) partition the
  // array into two pieces and (2) recurse on each half. If it is not, this is
  // the empty array and our base case.

  if (p < r) {
    // (1) Partitioning.
    //
    // The partitioning chooses a pivot between `p` and `r` and moves all
    // elements that are less than or equal to the pivot to the before it, and
    // all the elements that are greater than it after it. The effect is that
    // once partition is done, the pivot is in the exact place it will be when
    // the array is put in sorted order, and it will not need to be moved
    // again. This runs in O(n) time.

    // Always choose a random pivot so that an input array which is reverse
    // sorted does not cause O(n^2) running time.
    var pivotIndex = randomIntInRange(p, r);
    var i = p - 1;

    swap(ary, pivotIndex, r);
    var pivot = ary[r];

    // Immediately after `j` is incremented in this loop, the following hold
    // true:
    //
    //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
    //
    //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
    for (var j = p; j < r; j++) {
      if (comparator(ary[j], pivot) <= 0) {
        i += 1;
        swap(ary, i, j);
      }
    }

    swap(ary, i + 1, j);
    var q = i + 1;

    // (2) Recurse on each half.

    doQuickSort(ary, comparator, p, q - 1);
    doQuickSort(ary, comparator, q + 1, r);
  }
}

/**
 * Sort the given array in-place with the given comparator function.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 */
exports.quickSort = function (ary, comparator) {
  doQuickSort(ary, comparator, 0, ary.length - 1);
};

},{}],"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/source-map-consumer.js":[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = require('./util');
var binarySearch = require('./binary-search');
var ArraySet = require('./array-set').ArraySet;
var base64VLQ = require('./base64-vlq');
var quickSort = require('./quick-sort').quickSort;

function SourceMapConsumer(aSourceMap) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
  }

  return sourceMap.sections != null
    ? new IndexedSourceMapConsumer(sourceMap)
    : new BasicSourceMapConsumer(sourceMap);
}

SourceMapConsumer.fromSourceMap = function(aSourceMap) {
  return BasicSourceMapConsumer.fromSourceMap(aSourceMap);
}

/**
 * The version of the source mapping spec that we are consuming.
 */
SourceMapConsumer.prototype._version = 3;

// `__generatedMappings` and `__originalMappings` are arrays that hold the
// parsed mapping coordinates from the source map's "mappings" attribute. They
// are lazily instantiated, accessed via the `_generatedMappings` and
// `_originalMappings` getters respectively, and we only parse the mappings
// and create these arrays once queried for a source location. We jump through
// these hoops because there can be many thousands of mappings, and parsing
// them is expensive, so we only want to do it if we must.
//
// Each object in the arrays is of the form:
//
//     {
//       generatedLine: The line number in the generated code,
//       generatedColumn: The column number in the generated code,
//       source: The path to the original source file that generated this
//               chunk of code,
//       originalLine: The line number in the original source that
//                     corresponds to this chunk of generated code,
//       originalColumn: The column number in the original source that
//                       corresponds to this chunk of generated code,
//       name: The name of the original symbol which generated this chunk of
//             code.
//     }
//
// All properties except for `generatedLine` and `generatedColumn` can be
// `null`.
//
// `_generatedMappings` is ordered by the generated positions.
//
// `_originalMappings` is ordered by the original positions.

SourceMapConsumer.prototype.__generatedMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
  get: function () {
    if (!this.__generatedMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__generatedMappings;
  }
});

SourceMapConsumer.prototype.__originalMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
  get: function () {
    if (!this.__originalMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__originalMappings;
  }
});

SourceMapConsumer.prototype._charIsMappingSeparator =
  function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
    var c = aStr.charAt(index);
    return c === ";" || c === ",";
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
SourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    throw new Error("Subclasses must implement _parseMappings");
  };

SourceMapConsumer.GENERATED_ORDER = 1;
SourceMapConsumer.ORIGINAL_ORDER = 2;

SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
SourceMapConsumer.LEAST_UPPER_BOUND = 2;

/**
 * Iterate over each mapping between an original source/line/column and a
 * generated line/column in this source map.
 *
 * @param Function aCallback
 *        The function that is called with each mapping.
 * @param Object aContext
 *        Optional. If specified, this object will be the value of `this` every
 *        time that `aCallback` is called.
 * @param aOrder
 *        Either `SourceMapConsumer.GENERATED_ORDER` or
 *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
 *        iterate over the mappings sorted by the generated file's line/column
 *        order or the original's source/line/column order, respectively. Defaults to
 *        `SourceMapConsumer.GENERATED_ORDER`.
 */
SourceMapConsumer.prototype.eachMapping =
  function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
    var context = aContext || null;
    var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

    var mappings;
    switch (order) {
    case SourceMapConsumer.GENERATED_ORDER:
      mappings = this._generatedMappings;
      break;
    case SourceMapConsumer.ORIGINAL_ORDER:
      mappings = this._originalMappings;
      break;
    default:
      throw new Error("Unknown order of iteration.");
    }

    var sourceRoot = this.sourceRoot;
    mappings.map(function (mapping) {
      var source = mapping.source === null ? null : this._sources.at(mapping.source);
      if (source != null && sourceRoot != null) {
        source = util.join(sourceRoot, source);
      }
      return {
        source: source,
        generatedLine: mapping.generatedLine,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        name: mapping.name === null ? null : this._names.at(mapping.name)
      };
    }, this).forEach(aCallback, context);
  };

/**
 * Returns all generated line and column information for the original source,
 * line, and column provided. If no column is provided, returns all mappings
 * corresponding to a either the line we are searching for or the next
 * closest line that has any mappings. Otherwise, returns all mappings
 * corresponding to the given line and either the column we are searching for
 * or the next closest column that has any offsets.
 *
 * The only argument is an object with the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.
 *   - column: Optional. the column number in the original source.
 *
 * and an array of objects is returned, each with the following properties:
 *
 *   - line: The line number in the generated source, or null.
 *   - column: The column number in the generated source, or null.
 */
SourceMapConsumer.prototype.allGeneratedPositionsFor =
  function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
    var line = util.getArg(aArgs, 'line');

    // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
    // returns the index of the closest mapping less than the needle. By
    // setting needle.originalColumn to 0, we thus find the last mapping for
    // the given line, provided such a mapping exists.
    var needle = {
      source: util.getArg(aArgs, 'source'),
      originalLine: line,
      originalColumn: util.getArg(aArgs, 'column', 0)
    };

    if (this.sourceRoot != null) {
      needle.source = util.relative(this.sourceRoot, needle.source);
    }
    if (!this._sources.has(needle.source)) {
      return [];
    }
    needle.source = this._sources.indexOf(needle.source);

    var mappings = [];

    var index = this._findMapping(needle,
                                  this._originalMappings,
                                  "originalLine",
                                  "originalColumn",
                                  util.compareByOriginalPositions,
                                  binarySearch.LEAST_UPPER_BOUND);
    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (aArgs.column === undefined) {
        var originalLine = mapping.originalLine;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we found. Since
        // mappings are sorted, this is guaranteed to find all mappings for
        // the line we found.
        while (mapping && mapping.originalLine === originalLine) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      } else {
        var originalColumn = mapping.originalColumn;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we were searching for.
        // Since mappings are sorted, this is guaranteed to find all mappings for
        // the line we are searching for.
        while (mapping &&
               mapping.originalLine === line &&
               mapping.originalColumn == originalColumn) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      }
    }

    return mappings;
  };

exports.SourceMapConsumer = SourceMapConsumer;

/**
 * A BasicSourceMapConsumer instance represents a parsed source map which we can
 * query for information about the original file positions by giving it a file
 * position in the generated source.
 *
 * The only parameter is the raw source map (either as a JSON string, or
 * already parsed to an object). According to the spec, source maps have the
 * following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - sources: An array of URLs to the original source files.
 *   - names: An array of identifiers which can be referrenced by individual mappings.
 *   - sourceRoot: Optional. The URL root from which all sources are relative.
 *   - sourcesContent: Optional. An array of contents of the original source files.
 *   - mappings: A string of base64 VLQs which contain the actual mappings.
 *   - file: Optional. The generated file this source map is associated with.
 *
 * Here is an example source map, taken from the source map spec[0]:
 *
 *     {
 *       version : 3,
 *       file: "out.js",
 *       sourceRoot : "",
 *       sources: ["foo.js", "bar.js"],
 *       names: ["src", "maps", "are", "fun"],
 *       mappings: "AA,AB;;ABCDE;"
 *     }
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
 */
function BasicSourceMapConsumer(aSourceMap) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
  }

  var version = util.getArg(sourceMap, 'version');
  var sources = util.getArg(sourceMap, 'sources');
  // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
  // requires the array) to play nice here.
  var names = util.getArg(sourceMap, 'names', []);
  var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
  var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
  var mappings = util.getArg(sourceMap, 'mappings');
  var file = util.getArg(sourceMap, 'file', null);

  // Once again, Sass deviates from the spec and supplies the version as a
  // string rather than a number, so we use loose equality checking here.
  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  sources = sources
    .map(String)
    // Some source maps produce relative source paths like "./foo.js" instead of
    // "foo.js".  Normalize these first so that future comparisons will succeed.
    // See bugzil.la/1090768.
    .map(util.normalize)
    // Always ensure that absolute sources are internally stored relative to
    // the source root, if the source root is absolute. Not doing this would
    // be particularly problematic when the source root is a prefix of the
    // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
    .map(function (source) {
      return sourceRoot && util.isAbsolute(sourceRoot) && util.isAbsolute(source)
        ? util.relative(sourceRoot, source)
        : source;
    });

  // Pass `true` below to allow duplicate names and sources. While source maps
  // are intended to be compressed and deduplicated, the TypeScript compiler
  // sometimes generates source maps with duplicates in them. See Github issue
  // #72 and bugzil.la/889492.
  this._names = ArraySet.fromArray(names.map(String), true);
  this._sources = ArraySet.fromArray(sources, true);

  this.sourceRoot = sourceRoot;
  this.sourcesContent = sourcesContent;
  this._mappings = mappings;
  this.file = file;
}

BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;

/**
 * Create a BasicSourceMapConsumer from a SourceMapGenerator.
 *
 * @param SourceMapGenerator aSourceMap
 *        The source map that will be consumed.
 * @returns BasicSourceMapConsumer
 */
BasicSourceMapConsumer.fromSourceMap =
  function SourceMapConsumer_fromSourceMap(aSourceMap) {
    var smc = Object.create(BasicSourceMapConsumer.prototype);

    var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
    var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
    smc.sourceRoot = aSourceMap._sourceRoot;
    smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                            smc.sourceRoot);
    smc.file = aSourceMap._file;

    // Because we are modifying the entries (by converting string sources and
    // names to indices into the sources and names ArraySets), we have to make
    // a copy of the entry or else bad things happen. Shared mutable state
    // strikes again! See github issue #191.

    var generatedMappings = aSourceMap._mappings.toArray().slice();
    var destGeneratedMappings = smc.__generatedMappings = [];
    var destOriginalMappings = smc.__originalMappings = [];

    for (var i = 0, length = generatedMappings.length; i < length; i++) {
      var srcMapping = generatedMappings[i];
      var destMapping = new Mapping;
      destMapping.generatedLine = srcMapping.generatedLine;
      destMapping.generatedColumn = srcMapping.generatedColumn;

      if (srcMapping.source) {
        destMapping.source = sources.indexOf(srcMapping.source);
        destMapping.originalLine = srcMapping.originalLine;
        destMapping.originalColumn = srcMapping.originalColumn;

        if (srcMapping.name) {
          destMapping.name = names.indexOf(srcMapping.name);
        }

        destOriginalMappings.push(destMapping);
      }

      destGeneratedMappings.push(destMapping);
    }

    quickSort(smc.__originalMappings, util.compareByOriginalPositions);

    return smc;
  };

/**
 * The version of the source mapping spec that we are consuming.
 */
BasicSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
  get: function () {
    return this._sources.toArray().map(function (s) {
      return this.sourceRoot != null ? util.join(this.sourceRoot, s) : s;
    }, this);
  }
});

/**
 * Provide the JIT with a nice shape / hidden class.
 */
function Mapping() {
  this.generatedLine = 0;
  this.generatedColumn = 0;
  this.source = null;
  this.originalLine = null;
  this.originalColumn = null;
  this.name = null;
}

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
BasicSourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    var generatedLine = 1;
    var previousGeneratedColumn = 0;
    var previousOriginalLine = 0;
    var previousOriginalColumn = 0;
    var previousSource = 0;
    var previousName = 0;
    var length = aStr.length;
    var index = 0;
    var cachedSegments = {};
    var temp = {};
    var originalMappings = [];
    var generatedMappings = [];
    var mapping, str, segment, end, value;

    while (index < length) {
      if (aStr.charAt(index) === ';') {
        generatedLine++;
        index++;
        previousGeneratedColumn = 0;
      }
      else if (aStr.charAt(index) === ',') {
        index++;
      }
      else {
        mapping = new Mapping();
        mapping.generatedLine = generatedLine;

        // Because each offset is encoded relative to the previous one,
        // many segments often have the same encoding. We can exploit this
        // fact by caching the parsed variable length fields of each segment,
        // allowing us to avoid a second parse if we encounter the same
        // segment again.
        for (end = index; end < length; end++) {
          if (this._charIsMappingSeparator(aStr, end)) {
            break;
          }
        }
        str = aStr.slice(index, end);

        segment = cachedSegments[str];
        if (segment) {
          index += str.length;
        } else {
          segment = [];
          while (index < end) {
            base64VLQ.decode(aStr, index, temp);
            value = temp.value;
            index = temp.rest;
            segment.push(value);
          }

          if (segment.length === 2) {
            throw new Error('Found a source, but no line and column');
          }

          if (segment.length === 3) {
            throw new Error('Found a source and line, but no column');
          }

          cachedSegments[str] = segment;
        }

        // Generated column.
        mapping.generatedColumn = previousGeneratedColumn + segment[0];
        previousGeneratedColumn = mapping.generatedColumn;

        if (segment.length > 1) {
          // Original source.
          mapping.source = previousSource + segment[1];
          previousSource += segment[1];

          // Original line.
          mapping.originalLine = previousOriginalLine + segment[2];
          previousOriginalLine = mapping.originalLine;
          // Lines are stored 0-based
          mapping.originalLine += 1;

          // Original column.
          mapping.originalColumn = previousOriginalColumn + segment[3];
          previousOriginalColumn = mapping.originalColumn;

          if (segment.length > 4) {
            // Original name.
            mapping.name = previousName + segment[4];
            previousName += segment[4];
          }
        }

        generatedMappings.push(mapping);
        if (typeof mapping.originalLine === 'number') {
          originalMappings.push(mapping);
        }
      }
    }

    quickSort(generatedMappings, util.compareByGeneratedPositionsDeflated);
    this.__generatedMappings = generatedMappings;

    quickSort(originalMappings, util.compareByOriginalPositions);
    this.__originalMappings = originalMappings;
  };

/**
 * Find the mapping that best matches the hypothetical "needle" mapping that
 * we are searching for in the given "haystack" of mappings.
 */
BasicSourceMapConsumer.prototype._findMapping =
  function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                         aColumnName, aComparator, aBias) {
    // To return the position we are searching for, we must first find the
    // mapping for the given position and then return the opposite position it
    // points to. Because the mappings are sorted, we can use binary search to
    // find the best mapping.

    if (aNeedle[aLineName] <= 0) {
      throw new TypeError('Line must be greater than or equal to 1, got '
                          + aNeedle[aLineName]);
    }
    if (aNeedle[aColumnName] < 0) {
      throw new TypeError('Column must be greater than or equal to 0, got '
                          + aNeedle[aColumnName]);
    }

    return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
  };

/**
 * Compute the last column for each generated mapping. The last column is
 * inclusive.
 */
BasicSourceMapConsumer.prototype.computeColumnSpans =
  function SourceMapConsumer_computeColumnSpans() {
    for (var index = 0; index < this._generatedMappings.length; ++index) {
      var mapping = this._generatedMappings[index];

      // Mappings do not contain a field for the last generated columnt. We
      // can come up with an optimistic estimate, however, by assuming that
      // mappings are contiguous (i.e. given two consecutive mappings, the
      // first mapping ends where the second one starts).
      if (index + 1 < this._generatedMappings.length) {
        var nextMapping = this._generatedMappings[index + 1];

        if (mapping.generatedLine === nextMapping.generatedLine) {
          mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
          continue;
        }
      }

      // The last mapping for each line spans the entire line.
      mapping.lastGeneratedColumn = Infinity;
    }
  };

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.
 *   - column: The column number in the generated source.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.
 *   - column: The column number in the original source, or null.
 *   - name: The original identifier, or null.
 */
BasicSourceMapConsumer.prototype.originalPositionFor =
  function SourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util.getArg(aArgs, 'line'),
      generatedColumn: util.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._generatedMappings,
      "generatedLine",
      "generatedColumn",
      util.compareByGeneratedPositionsDeflated,
      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._generatedMappings[index];

      if (mapping.generatedLine === needle.generatedLine) {
        var source = util.getArg(mapping, 'source', null);
        if (source !== null) {
          source = this._sources.at(source);
          if (this.sourceRoot != null) {
            source = util.join(this.sourceRoot, source);
          }
        }
        var name = util.getArg(mapping, 'name', null);
        if (name !== null) {
          name = this._names.at(name);
        }
        return {
          source: source,
          line: util.getArg(mapping, 'originalLine', null),
          column: util.getArg(mapping, 'originalColumn', null),
          name: name
        };
      }
    }

    return {
      source: null,
      line: null,
      column: null,
      name: null
    };
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
  function BasicSourceMapConsumer_hasContentsOfAllSources() {
    if (!this.sourcesContent) {
      return false;
    }
    return this.sourcesContent.length >= this._sources.size() &&
      !this.sourcesContent.some(function (sc) { return sc == null; });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
BasicSourceMapConsumer.prototype.sourceContentFor =
  function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    if (!this.sourcesContent) {
      return null;
    }

    if (this.sourceRoot != null) {
      aSource = util.relative(this.sourceRoot, aSource);
    }

    if (this._sources.has(aSource)) {
      return this.sourcesContent[this._sources.indexOf(aSource)];
    }

    var url;
    if (this.sourceRoot != null
        && (url = util.urlParse(this.sourceRoot))) {
      // XXX: file:// URIs and absolute paths lead to unexpected behavior for
      // many users. We can help them out when they expect file:// URIs to
      // behave like it would if they were running a local HTTP server. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
      var fileUriAbsPath = aSource.replace(/^file:\/\//, "");
      if (url.scheme == "file"
          && this._sources.has(fileUriAbsPath)) {
        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
      }

      if ((!url.path || url.path == "/")
          && this._sources.has("/" + aSource)) {
        return this.sourcesContent[this._sources.indexOf("/" + aSource)];
      }
    }

    // This function is used recursively from
    // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
    // don't want to throw if we can't find the source - we just want to
    // return null, so we provide a flag to exit gracefully.
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.
 *   - column: The column number in the original source.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.
 *   - column: The column number in the generated source, or null.
 */
BasicSourceMapConsumer.prototype.generatedPositionFor =
  function SourceMapConsumer_generatedPositionFor(aArgs) {
    var source = util.getArg(aArgs, 'source');
    if (this.sourceRoot != null) {
      source = util.relative(this.sourceRoot, source);
    }
    if (!this._sources.has(source)) {
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    }
    source = this._sources.indexOf(source);

    var needle = {
      source: source,
      originalLine: util.getArg(aArgs, 'line'),
      originalColumn: util.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._originalMappings,
      "originalLine",
      "originalColumn",
      util.compareByOriginalPositions,
      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (mapping.source === needle.source) {
        return {
          line: util.getArg(mapping, 'generatedLine', null),
          column: util.getArg(mapping, 'generatedColumn', null),
          lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
        };
      }
    }

    return {
      line: null,
      column: null,
      lastColumn: null
    };
  };

exports.BasicSourceMapConsumer = BasicSourceMapConsumer;

/**
 * An IndexedSourceMapConsumer instance represents a parsed source map which
 * we can query for information. It differs from BasicSourceMapConsumer in
 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
 * input.
 *
 * The only parameter is a raw source map (either as a JSON string, or already
 * parsed to an object). According to the spec for indexed source maps, they
 * have the following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - file: Optional. The generated file this source map is associated with.
 *   - sections: A list of section definitions.
 *
 * Each value under the "sections" field has two fields:
 *   - offset: The offset into the original specified at which this section
 *       begins to apply, defined as an object with a "line" and "column"
 *       field.
 *   - map: A source map definition. This source map could also be indexed,
 *       but doesn't have to be.
 *
 * Instead of the "map" field, it's also possible to have a "url" field
 * specifying a URL to retrieve a source map from, but that's currently
 * unsupported.
 *
 * Here's an example source map, taken from the source map spec[0], but
 * modified to omit a section which uses the "url" field.
 *
 *  {
 *    version : 3,
 *    file: "app.js",
 *    sections: [{
 *      offset: {line:100, column:10},
 *      map: {
 *        version : 3,
 *        file: "section.js",
 *        sources: ["foo.js", "bar.js"],
 *        names: ["src", "maps", "are", "fun"],
 *        mappings: "AAAA,E;;ABCDE;"
 *      }
 *    }],
 *  }
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
 */
function IndexedSourceMapConsumer(aSourceMap) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
  }

  var version = util.getArg(sourceMap, 'version');
  var sections = util.getArg(sourceMap, 'sections');

  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  this._sources = new ArraySet();
  this._names = new ArraySet();

  var lastOffset = {
    line: -1,
    column: 0
  };
  this._sections = sections.map(function (s) {
    if (s.url) {
      // The url field will require support for asynchronicity.
      // See https://github.com/mozilla/source-map/issues/16
      throw new Error('Support for url field in sections not implemented.');
    }
    var offset = util.getArg(s, 'offset');
    var offsetLine = util.getArg(offset, 'line');
    var offsetColumn = util.getArg(offset, 'column');

    if (offsetLine < lastOffset.line ||
        (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
      throw new Error('Section offsets must be ordered and non-overlapping.');
    }
    lastOffset = offset;

    return {
      generatedOffset: {
        // The offset fields are 0-based, but we use 1-based indices when
        // encoding/decoding from VLQ.
        generatedLine: offsetLine + 1,
        generatedColumn: offsetColumn + 1
      },
      consumer: new SourceMapConsumer(util.getArg(s, 'map'))
    }
  });
}

IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;

/**
 * The version of the source mapping spec that we are consuming.
 */
IndexedSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
  get: function () {
    var sources = [];
    for (var i = 0; i < this._sections.length; i++) {
      for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
        sources.push(this._sections[i].consumer.sources[j]);
      }
    }
    return sources;
  }
});

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.
 *   - column: The column number in the generated source.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.
 *   - column: The column number in the original source, or null.
 *   - name: The original identifier, or null.
 */
IndexedSourceMapConsumer.prototype.originalPositionFor =
  function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util.getArg(aArgs, 'line'),
      generatedColumn: util.getArg(aArgs, 'column')
    };

    // Find the section containing the generated position we're trying to map
    // to an original position.
    var sectionIndex = binarySearch.search(needle, this._sections,
      function(needle, section) {
        var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
        if (cmp) {
          return cmp;
        }

        return (needle.generatedColumn -
                section.generatedOffset.generatedColumn);
      });
    var section = this._sections[sectionIndex];

    if (!section) {
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    }

    return section.consumer.originalPositionFor({
      line: needle.generatedLine -
        (section.generatedOffset.generatedLine - 1),
      column: needle.generatedColumn -
        (section.generatedOffset.generatedLine === needle.generatedLine
         ? section.generatedOffset.generatedColumn - 1
         : 0),
      bias: aArgs.bias
    });
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
  function IndexedSourceMapConsumer_hasContentsOfAllSources() {
    return this._sections.every(function (s) {
      return s.consumer.hasContentsOfAllSources();
    });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
IndexedSourceMapConsumer.prototype.sourceContentFor =
  function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      var content = section.consumer.sourceContentFor(aSource, true);
      if (content) {
        return content;
      }
    }
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.
 *   - column: The column number in the original source.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.
 *   - column: The column number in the generated source, or null.
 */
IndexedSourceMapConsumer.prototype.generatedPositionFor =
  function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      // Only consider this section if the requested source is in the list of
      // sources of the consumer.
      if (section.consumer.sources.indexOf(util.getArg(aArgs, 'source')) === -1) {
        continue;
      }
      var generatedPosition = section.consumer.generatedPositionFor(aArgs);
      if (generatedPosition) {
        var ret = {
          line: generatedPosition.line +
            (section.generatedOffset.generatedLine - 1),
          column: generatedPosition.column +
            (section.generatedOffset.generatedLine === generatedPosition.line
             ? section.generatedOffset.generatedColumn - 1
             : 0)
        };
        return ret;
      }
    }

    return {
      line: null,
      column: null
    };
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
IndexedSourceMapConsumer.prototype._parseMappings =
  function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    this.__generatedMappings = [];
    this.__originalMappings = [];
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];
      var sectionMappings = section.consumer._generatedMappings;
      for (var j = 0; j < sectionMappings.length; j++) {
        var mapping = sectionMappings[j];

        var source = section.consumer._sources.at(mapping.source);
        if (section.consumer.sourceRoot !== null) {
          source = util.join(section.consumer.sourceRoot, source);
        }
        this._sources.add(source);
        source = this._sources.indexOf(source);

        var name = section.consumer._names.at(mapping.name);
        this._names.add(name);
        name = this._names.indexOf(name);

        // The mappings coming from the consumer for the section have
        // generated positions relative to the start of the section, so we
        // need to offset them to be relative to the start of the concatenated
        // generated file.
        var adjustedMapping = {
          source: source,
          generatedLine: mapping.generatedLine +
            (section.generatedOffset.generatedLine - 1),
          generatedColumn: mapping.generatedColumn +
            (section.generatedOffset.generatedLine === mapping.generatedLine
            ? section.generatedOffset.generatedColumn - 1
            : 0),
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: name
        };

        this.__generatedMappings.push(adjustedMapping);
        if (typeof adjustedMapping.originalLine === 'number') {
          this.__originalMappings.push(adjustedMapping);
        }
      }
    }

    quickSort(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
    quickSort(this.__originalMappings, util.compareByOriginalPositions);
  };

exports.IndexedSourceMapConsumer = IndexedSourceMapConsumer;

},{"./array-set":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/array-set.js","./base64-vlq":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/base64-vlq.js","./binary-search":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/binary-search.js","./quick-sort":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/quick-sort.js","./util":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/util.js"}],"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/source-map-generator.js":[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var base64VLQ = require('./base64-vlq');
var util = require('./util');
var ArraySet = require('./array-set').ArraySet;
var MappingList = require('./mapping-list').MappingList;

/**
 * An instance of the SourceMapGenerator represents a source map which is
 * being built incrementally. You may pass an object with the following
 * properties:
 *
 *   - file: The filename of the generated source.
 *   - sourceRoot: A root for all relative URLs in this source map.
 */
function SourceMapGenerator(aArgs) {
  if (!aArgs) {
    aArgs = {};
  }
  this._file = util.getArg(aArgs, 'file', null);
  this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
  this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
  this._sources = new ArraySet();
  this._names = new ArraySet();
  this._mappings = new MappingList();
  this._sourcesContents = null;
}

SourceMapGenerator.prototype._version = 3;

/**
 * Creates a new SourceMapGenerator based on a SourceMapConsumer
 *
 * @param aSourceMapConsumer The SourceMap.
 */
SourceMapGenerator.fromSourceMap =
  function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
    var sourceRoot = aSourceMapConsumer.sourceRoot;
    var generator = new SourceMapGenerator({
      file: aSourceMapConsumer.file,
      sourceRoot: sourceRoot
    });
    aSourceMapConsumer.eachMapping(function (mapping) {
      var newMapping = {
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn
        }
      };

      if (mapping.source != null) {
        newMapping.source = mapping.source;
        if (sourceRoot != null) {
          newMapping.source = util.relative(sourceRoot, newMapping.source);
        }

        newMapping.original = {
          line: mapping.originalLine,
          column: mapping.originalColumn
        };

        if (mapping.name != null) {
          newMapping.name = mapping.name;
        }
      }

      generator.addMapping(newMapping);
    });
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        generator.setSourceContent(sourceFile, content);
      }
    });
    return generator;
  };

/**
 * Add a single mapping from original source line and column to the generated
 * source's line and column for this source map being created. The mapping
 * object should have the following properties:
 *
 *   - generated: An object with the generated line and column positions.
 *   - original: An object with the original line and column positions.
 *   - source: The original source file (relative to the sourceRoot).
 *   - name: An optional original token name for this mapping.
 */
SourceMapGenerator.prototype.addMapping =
  function SourceMapGenerator_addMapping(aArgs) {
    var generated = util.getArg(aArgs, 'generated');
    var original = util.getArg(aArgs, 'original', null);
    var source = util.getArg(aArgs, 'source', null);
    var name = util.getArg(aArgs, 'name', null);

    if (!this._skipValidation) {
      this._validateMapping(generated, original, source, name);
    }

    if (source != null) {
      source = String(source);
      if (!this._sources.has(source)) {
        this._sources.add(source);
      }
    }

    if (name != null) {
      name = String(name);
      if (!this._names.has(name)) {
        this._names.add(name);
      }
    }

    this._mappings.add({
      generatedLine: generated.line,
      generatedColumn: generated.column,
      originalLine: original != null && original.line,
      originalColumn: original != null && original.column,
      source: source,
      name: name
    });
  };

/**
 * Set the source content for a source file.
 */
SourceMapGenerator.prototype.setSourceContent =
  function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
    var source = aSourceFile;
    if (this._sourceRoot != null) {
      source = util.relative(this._sourceRoot, source);
    }

    if (aSourceContent != null) {
      // Add the source content to the _sourcesContents map.
      // Create a new _sourcesContents map if the property is null.
      if (!this._sourcesContents) {
        this._sourcesContents = Object.create(null);
      }
      this._sourcesContents[util.toSetString(source)] = aSourceContent;
    } else if (this._sourcesContents) {
      // Remove the source file from the _sourcesContents map.
      // If the _sourcesContents map is empty, set the property to null.
      delete this._sourcesContents[util.toSetString(source)];
      if (Object.keys(this._sourcesContents).length === 0) {
        this._sourcesContents = null;
      }
    }
  };

/**
 * Applies the mappings of a sub-source-map for a specific source file to the
 * source map being generated. Each mapping to the supplied source file is
 * rewritten using the supplied source map. Note: The resolution for the
 * resulting mappings is the minimium of this map and the supplied map.
 *
 * @param aSourceMapConsumer The source map to be applied.
 * @param aSourceFile Optional. The filename of the source file.
 *        If omitted, SourceMapConsumer's file property will be used.
 * @param aSourceMapPath Optional. The dirname of the path to the source map
 *        to be applied. If relative, it is relative to the SourceMapConsumer.
 *        This parameter is needed when the two source maps aren't in the same
 *        directory, and the source map to be applied contains relative source
 *        paths. If so, those relative source paths need to be rewritten
 *        relative to the SourceMapGenerator.
 */
SourceMapGenerator.prototype.applySourceMap =
  function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
    var sourceFile = aSourceFile;
    // If aSourceFile is omitted, we will use the file property of the SourceMap
    if (aSourceFile == null) {
      if (aSourceMapConsumer.file == null) {
        throw new Error(
          'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
          'or the source map\'s "file" property. Both were omitted.'
        );
      }
      sourceFile = aSourceMapConsumer.file;
    }
    var sourceRoot = this._sourceRoot;
    // Make "sourceFile" relative if an absolute Url is passed.
    if (sourceRoot != null) {
      sourceFile = util.relative(sourceRoot, sourceFile);
    }
    // Applying the SourceMap can add and remove items from the sources and
    // the names array.
    var newSources = new ArraySet();
    var newNames = new ArraySet();

    // Find mappings for the "sourceFile"
    this._mappings.unsortedForEach(function (mapping) {
      if (mapping.source === sourceFile && mapping.originalLine != null) {
        // Check if it can be mapped by the source map, then update the mapping.
        var original = aSourceMapConsumer.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn
        });
        if (original.source != null) {
          // Copy mapping
          mapping.source = original.source;
          if (aSourceMapPath != null) {
            mapping.source = util.join(aSourceMapPath, mapping.source)
          }
          if (sourceRoot != null) {
            mapping.source = util.relative(sourceRoot, mapping.source);
          }
          mapping.originalLine = original.line;
          mapping.originalColumn = original.column;
          if (original.name != null) {
            mapping.name = original.name;
          }
        }
      }

      var source = mapping.source;
      if (source != null && !newSources.has(source)) {
        newSources.add(source);
      }

      var name = mapping.name;
      if (name != null && !newNames.has(name)) {
        newNames.add(name);
      }

    }, this);
    this._sources = newSources;
    this._names = newNames;

    // Copy sourcesContents of applied map.
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aSourceMapPath != null) {
          sourceFile = util.join(aSourceMapPath, sourceFile);
        }
        if (sourceRoot != null) {
          sourceFile = util.relative(sourceRoot, sourceFile);
        }
        this.setSourceContent(sourceFile, content);
      }
    }, this);
  };

/**
 * A mapping can have one of the three levels of data:
 *
 *   1. Just the generated position.
 *   2. The Generated position, original position, and original source.
 *   3. Generated and original position, original source, as well as a name
 *      token.
 *
 * To maintain consistency, we validate that any new mapping being added falls
 * in to one of these categories.
 */
SourceMapGenerator.prototype._validateMapping =
  function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                              aName) {
    // When aOriginal is truthy but has empty values for .line and .column,
    // it is most likely a programmer error. In this case we throw a very
    // specific error message to try to guide them the right way.
    // For example: https://github.com/Polymer/polymer-bundler/pull/519
    if (aOriginal && typeof aOriginal.line !== 'number' && typeof aOriginal.column !== 'number') {
        throw new Error(
            'original.line and original.column are not numbers -- you probably meant to omit ' +
            'the original mapping entirely and only map the generated position. If so, pass ' +
            'null for the original mapping instead of an object with empty or null values.'
        );
    }

    if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
        && aGenerated.line > 0 && aGenerated.column >= 0
        && !aOriginal && !aSource && !aName) {
      // Case 1.
      return;
    }
    else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
             && aOriginal && 'line' in aOriginal && 'column' in aOriginal
             && aGenerated.line > 0 && aGenerated.column >= 0
             && aOriginal.line > 0 && aOriginal.column >= 0
             && aSource) {
      // Cases 2 and 3.
      return;
    }
    else {
      throw new Error('Invalid mapping: ' + JSON.stringify({
        generated: aGenerated,
        source: aSource,
        original: aOriginal,
        name: aName
      }));
    }
  };

/**
 * Serialize the accumulated mappings in to the stream of base 64 VLQs
 * specified by the source map format.
 */
SourceMapGenerator.prototype._serializeMappings =
  function SourceMapGenerator_serializeMappings() {
    var previousGeneratedColumn = 0;
    var previousGeneratedLine = 1;
    var previousOriginalColumn = 0;
    var previousOriginalLine = 0;
    var previousName = 0;
    var previousSource = 0;
    var result = '';
    var next;
    var mapping;
    var nameIdx;
    var sourceIdx;

    var mappings = this._mappings.toArray();
    for (var i = 0, len = mappings.length; i < len; i++) {
      mapping = mappings[i];
      next = ''

      if (mapping.generatedLine !== previousGeneratedLine) {
        previousGeneratedColumn = 0;
        while (mapping.generatedLine !== previousGeneratedLine) {
          next += ';';
          previousGeneratedLine++;
        }
      }
      else {
        if (i > 0) {
          if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
            continue;
          }
          next += ',';
        }
      }

      next += base64VLQ.encode(mapping.generatedColumn
                                 - previousGeneratedColumn);
      previousGeneratedColumn = mapping.generatedColumn;

      if (mapping.source != null) {
        sourceIdx = this._sources.indexOf(mapping.source);
        next += base64VLQ.encode(sourceIdx - previousSource);
        previousSource = sourceIdx;

        // lines are stored 0-based in SourceMap spec version 3
        next += base64VLQ.encode(mapping.originalLine - 1
                                   - previousOriginalLine);
        previousOriginalLine = mapping.originalLine - 1;

        next += base64VLQ.encode(mapping.originalColumn
                                   - previousOriginalColumn);
        previousOriginalColumn = mapping.originalColumn;

        if (mapping.name != null) {
          nameIdx = this._names.indexOf(mapping.name);
          next += base64VLQ.encode(nameIdx - previousName);
          previousName = nameIdx;
        }
      }

      result += next;
    }

    return result;
  };

SourceMapGenerator.prototype._generateSourcesContent =
  function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
    return aSources.map(function (source) {
      if (!this._sourcesContents) {
        return null;
      }
      if (aSourceRoot != null) {
        source = util.relative(aSourceRoot, source);
      }
      var key = util.toSetString(source);
      return Object.prototype.hasOwnProperty.call(this._sourcesContents, key)
        ? this._sourcesContents[key]
        : null;
    }, this);
  };

/**
 * Externalize the source map.
 */
SourceMapGenerator.prototype.toJSON =
  function SourceMapGenerator_toJSON() {
    var map = {
      version: this._version,
      sources: this._sources.toArray(),
      names: this._names.toArray(),
      mappings: this._serializeMappings()
    };
    if (this._file != null) {
      map.file = this._file;
    }
    if (this._sourceRoot != null) {
      map.sourceRoot = this._sourceRoot;
    }
    if (this._sourcesContents) {
      map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
    }

    return map;
  };

/**
 * Render the source map being generated to a string.
 */
SourceMapGenerator.prototype.toString =
  function SourceMapGenerator_toString() {
    return JSON.stringify(this.toJSON());
  };

exports.SourceMapGenerator = SourceMapGenerator;

},{"./array-set":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/array-set.js","./base64-vlq":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/base64-vlq.js","./mapping-list":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/mapping-list.js","./util":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/util.js"}],"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/source-node.js":[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var SourceMapGenerator = require('./source-map-generator').SourceMapGenerator;
var util = require('./util');

// Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
// operating systems these days (capturing the result).
var REGEX_NEWLINE = /(\r?\n)/;

// Newline character code for charCodeAt() comparisons
var NEWLINE_CODE = 10;

// Private symbol for identifying `SourceNode`s when multiple versions of
// the source-map library are loaded. This MUST NOT CHANGE across
// versions!
var isSourceNode = "$$$isSourceNode$$$";

/**
 * SourceNodes provide a way to abstract over interpolating/concatenating
 * snippets of generated JavaScript source code while maintaining the line and
 * column information associated with the original source code.
 *
 * @param aLine The original line number.
 * @param aColumn The original column number.
 * @param aSource The original source's filename.
 * @param aChunks Optional. An array of strings which are snippets of
 *        generated JS, or other SourceNodes.
 * @param aName The original identifier.
 */
function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
  this.children = [];
  this.sourceContents = {};
  this.line = aLine == null ? null : aLine;
  this.column = aColumn == null ? null : aColumn;
  this.source = aSource == null ? null : aSource;
  this.name = aName == null ? null : aName;
  this[isSourceNode] = true;
  if (aChunks != null) this.add(aChunks);
}

/**
 * Creates a SourceNode from generated code and a SourceMapConsumer.
 *
 * @param aGeneratedCode The generated code
 * @param aSourceMapConsumer The SourceMap for the generated code
 * @param aRelativePath Optional. The path that relative sources in the
 *        SourceMapConsumer should be relative to.
 */
SourceNode.fromStringWithSourceMap =
  function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
    // The SourceNode we want to fill with the generated code
    // and the SourceMap
    var node = new SourceNode();

    // All even indices of this array are one line of the generated code,
    // while all odd indices are the newlines between two adjacent lines
    // (since `REGEX_NEWLINE` captures its match).
    // Processed fragments are accessed by calling `shiftNextLine`.
    var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
    var remainingLinesIndex = 0;
    var shiftNextLine = function() {
      var lineContents = getNextLine();
      // The last line of a file might not have a newline.
      var newLine = getNextLine() || "";
      return lineContents + newLine;

      function getNextLine() {
        return remainingLinesIndex < remainingLines.length ?
            remainingLines[remainingLinesIndex++] : undefined;
      }
    };

    // We need to remember the position of "remainingLines"
    var lastGeneratedLine = 1, lastGeneratedColumn = 0;

    // The generate SourceNodes we need a code range.
    // To extract it current and last mapping is used.
    // Here we store the last mapping.
    var lastMapping = null;

    aSourceMapConsumer.eachMapping(function (mapping) {
      if (lastMapping !== null) {
        // We add the code from "lastMapping" to "mapping":
        // First check if there is a new line in between.
        if (lastGeneratedLine < mapping.generatedLine) {
          // Associate first line with "lastMapping"
          addMappingWithCode(lastMapping, shiftNextLine());
          lastGeneratedLine++;
          lastGeneratedColumn = 0;
          // The remaining code is added without mapping
        } else {
          // There is no new line in between.
          // Associate the code between "lastGeneratedColumn" and
          // "mapping.generatedColumn" with "lastMapping"
          var nextLine = remainingLines[remainingLinesIndex];
          var code = nextLine.substr(0, mapping.generatedColumn -
                                        lastGeneratedColumn);
          remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn -
                                              lastGeneratedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
          addMappingWithCode(lastMapping, code);
          // No more remaining code, continue
          lastMapping = mapping;
          return;
        }
      }
      // We add the generated code until the first mapping
      // to the SourceNode without any mapping.
      // Each line is added as separate string.
      while (lastGeneratedLine < mapping.generatedLine) {
        node.add(shiftNextLine());
        lastGeneratedLine++;
      }
      if (lastGeneratedColumn < mapping.generatedColumn) {
        var nextLine = remainingLines[remainingLinesIndex];
        node.add(nextLine.substr(0, mapping.generatedColumn));
        remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
        lastGeneratedColumn = mapping.generatedColumn;
      }
      lastMapping = mapping;
    }, this);
    // We have processed all mappings.
    if (remainingLinesIndex < remainingLines.length) {
      if (lastMapping) {
        // Associate the remaining code in the current line with "lastMapping"
        addMappingWithCode(lastMapping, shiftNextLine());
      }
      // and add the remaining lines without any mapping
      node.add(remainingLines.splice(remainingLinesIndex).join(""));
    }

    // Copy sourcesContent into SourceNode
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aRelativePath != null) {
          sourceFile = util.join(aRelativePath, sourceFile);
        }
        node.setSourceContent(sourceFile, content);
      }
    });

    return node;

    function addMappingWithCode(mapping, code) {
      if (mapping === null || mapping.source === undefined) {
        node.add(code);
      } else {
        var source = aRelativePath
          ? util.join(aRelativePath, mapping.source)
          : mapping.source;
        node.add(new SourceNode(mapping.originalLine,
                                mapping.originalColumn,
                                source,
                                code,
                                mapping.name));
      }
    }
  };

/**
 * Add a chunk of generated JS to this source node.
 *
 * @param aChunk A string snippet of generated JS code, another instance of
 *        SourceNode, or an array where each member is one of those things.
 */
SourceNode.prototype.add = function SourceNode_add(aChunk) {
  if (Array.isArray(aChunk)) {
    aChunk.forEach(function (chunk) {
      this.add(chunk);
    }, this);
  }
  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
    if (aChunk) {
      this.children.push(aChunk);
    }
  }
  else {
    throw new TypeError(
      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
    );
  }
  return this;
};

/**
 * Add a chunk of generated JS to the beginning of this source node.
 *
 * @param aChunk A string snippet of generated JS code, another instance of
 *        SourceNode, or an array where each member is one of those things.
 */
SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
  if (Array.isArray(aChunk)) {
    for (var i = aChunk.length-1; i >= 0; i--) {
      this.prepend(aChunk[i]);
    }
  }
  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
    this.children.unshift(aChunk);
  }
  else {
    throw new TypeError(
      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
    );
  }
  return this;
};

/**
 * Walk over the tree of JS snippets in this node and its children. The
 * walking function is called once for each snippet of JS and is passed that
 * snippet and the its original associated source's line/column location.
 *
 * @param aFn The traversal function.
 */
SourceNode.prototype.walk = function SourceNode_walk(aFn) {
  var chunk;
  for (var i = 0, len = this.children.length; i < len; i++) {
    chunk = this.children[i];
    if (chunk[isSourceNode]) {
      chunk.walk(aFn);
    }
    else {
      if (chunk !== '') {
        aFn(chunk, { source: this.source,
                     line: this.line,
                     column: this.column,
                     name: this.name });
      }
    }
  }
};

/**
 * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
 * each of `this.children`.
 *
 * @param aSep The separator.
 */
SourceNode.prototype.join = function SourceNode_join(aSep) {
  var newChildren;
  var i;
  var len = this.children.length;
  if (len > 0) {
    newChildren = [];
    for (i = 0; i < len-1; i++) {
      newChildren.push(this.children[i]);
      newChildren.push(aSep);
    }
    newChildren.push(this.children[i]);
    this.children = newChildren;
  }
  return this;
};

/**
 * Call String.prototype.replace on the very right-most source snippet. Useful
 * for trimming whitespace from the end of a source node, etc.
 *
 * @param aPattern The pattern to replace.
 * @param aReplacement The thing to replace the pattern with.
 */
SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
  var lastChild = this.children[this.children.length - 1];
  if (lastChild[isSourceNode]) {
    lastChild.replaceRight(aPattern, aReplacement);
  }
  else if (typeof lastChild === 'string') {
    this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
  }
  else {
    this.children.push(''.replace(aPattern, aReplacement));
  }
  return this;
};

/**
 * Set the source content for a source file. This will be added to the SourceMapGenerator
 * in the sourcesContent field.
 *
 * @param aSourceFile The filename of the source file
 * @param aSourceContent The content of the source file
 */
SourceNode.prototype.setSourceContent =
  function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
    this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
  };

/**
 * Walk over the tree of SourceNodes. The walking function is called for each
 * source file content and is passed the filename and source content.
 *
 * @param aFn The traversal function.
 */
SourceNode.prototype.walkSourceContents =
  function SourceNode_walkSourceContents(aFn) {
    for (var i = 0, len = this.children.length; i < len; i++) {
      if (this.children[i][isSourceNode]) {
        this.children[i].walkSourceContents(aFn);
      }
    }

    var sources = Object.keys(this.sourceContents);
    for (var i = 0, len = sources.length; i < len; i++) {
      aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
    }
  };

/**
 * Return the string representation of this source node. Walks over the tree
 * and concatenates all the various snippets together to one string.
 */
SourceNode.prototype.toString = function SourceNode_toString() {
  var str = "";
  this.walk(function (chunk) {
    str += chunk;
  });
  return str;
};

/**
 * Returns the string representation of this source node along with a source
 * map.
 */
SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
  var generated = {
    code: "",
    line: 1,
    column: 0
  };
  var map = new SourceMapGenerator(aArgs);
  var sourceMappingActive = false;
  var lastOriginalSource = null;
  var lastOriginalLine = null;
  var lastOriginalColumn = null;
  var lastOriginalName = null;
  this.walk(function (chunk, original) {
    generated.code += chunk;
    if (original.source !== null
        && original.line !== null
        && original.column !== null) {
      if(lastOriginalSource !== original.source
         || lastOriginalLine !== original.line
         || lastOriginalColumn !== original.column
         || lastOriginalName !== original.name) {
        map.addMapping({
          source: original.source,
          original: {
            line: original.line,
            column: original.column
          },
          generated: {
            line: generated.line,
            column: generated.column
          },
          name: original.name
        });
      }
      lastOriginalSource = original.source;
      lastOriginalLine = original.line;
      lastOriginalColumn = original.column;
      lastOriginalName = original.name;
      sourceMappingActive = true;
    } else if (sourceMappingActive) {
      map.addMapping({
        generated: {
          line: generated.line,
          column: generated.column
        }
      });
      lastOriginalSource = null;
      sourceMappingActive = false;
    }
    for (var idx = 0, length = chunk.length; idx < length; idx++) {
      if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
        generated.line++;
        generated.column = 0;
        // Mappings end at eol
        if (idx + 1 === length) {
          lastOriginalSource = null;
          sourceMappingActive = false;
        } else if (sourceMappingActive) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
      } else {
        generated.column++;
      }
    }
  });
  this.walkSourceContents(function (sourceFile, sourceContent) {
    map.setSourceContent(sourceFile, sourceContent);
  });

  return { code: generated.code, map: map };
};

exports.SourceNode = SourceNode;

},{"./source-map-generator":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/source-map-generator.js","./util":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/util.js"}],"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/util.js":[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

/**
 * This is a helper function for getting values from parameter/options
 * objects.
 *
 * @param args The object we are extracting values from
 * @param name The name of the property we are getting.
 * @param defaultValue An optional value to return if the property is missing
 * from the object. If this is not specified and the property is missing, an
 * error will be thrown.
 */
function getArg(aArgs, aName, aDefaultValue) {
  if (aName in aArgs) {
    return aArgs[aName];
  } else if (arguments.length === 3) {
    return aDefaultValue;
  } else {
    throw new Error('"' + aName + '" is a required argument.');
  }
}
exports.getArg = getArg;

var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
var dataUrlRegexp = /^data:.+\,.+$/;

function urlParse(aUrl) {
  var match = aUrl.match(urlRegexp);
  if (!match) {
    return null;
  }
  return {
    scheme: match[1],
    auth: match[2],
    host: match[3],
    port: match[4],
    path: match[5]
  };
}
exports.urlParse = urlParse;

function urlGenerate(aParsedUrl) {
  var url = '';
  if (aParsedUrl.scheme) {
    url += aParsedUrl.scheme + ':';
  }
  url += '//';
  if (aParsedUrl.auth) {
    url += aParsedUrl.auth + '@';
  }
  if (aParsedUrl.host) {
    url += aParsedUrl.host;
  }
  if (aParsedUrl.port) {
    url += ":" + aParsedUrl.port
  }
  if (aParsedUrl.path) {
    url += aParsedUrl.path;
  }
  return url;
}
exports.urlGenerate = urlGenerate;

/**
 * Normalizes a path, or the path portion of a URL:
 *
 * - Replaces consecutive slashes with one slash.
 * - Removes unnecessary '.' parts.
 * - Removes unnecessary '<dir>/..' parts.
 *
 * Based on code in the Node.js 'path' core module.
 *
 * @param aPath The path or url to normalize.
 */
function normalize(aPath) {
  var path = aPath;
  var url = urlParse(aPath);
  if (url) {
    if (!url.path) {
      return aPath;
    }
    path = url.path;
  }
  var isAbsolute = exports.isAbsolute(path);

  var parts = path.split(/\/+/);
  for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
    part = parts[i];
    if (part === '.') {
      parts.splice(i, 1);
    } else if (part === '..') {
      up++;
    } else if (up > 0) {
      if (part === '') {
        // The first part is blank if the path is absolute. Trying to go
        // above the root is a no-op. Therefore we can remove all '..' parts
        // directly after the root.
        parts.splice(i + 1, up);
        up = 0;
      } else {
        parts.splice(i, 2);
        up--;
      }
    }
  }
  path = parts.join('/');

  if (path === '') {
    path = isAbsolute ? '/' : '.';
  }

  if (url) {
    url.path = path;
    return urlGenerate(url);
  }
  return path;
}
exports.normalize = normalize;

/**
 * Joins two paths/URLs.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be joined with the root.
 *
 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
 *   first.
 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
 *   is updated with the result and aRoot is returned. Otherwise the result
 *   is returned.
 *   - If aPath is absolute, the result is aPath.
 *   - Otherwise the two paths are joined with a slash.
 * - Joining for example 'http://' and 'www.example.com' is also supported.
 */
function join(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }
  if (aPath === "") {
    aPath = ".";
  }
  var aPathUrl = urlParse(aPath);
  var aRootUrl = urlParse(aRoot);
  if (aRootUrl) {
    aRoot = aRootUrl.path || '/';
  }

  // `join(foo, '//www.example.org')`
  if (aPathUrl && !aPathUrl.scheme) {
    if (aRootUrl) {
      aPathUrl.scheme = aRootUrl.scheme;
    }
    return urlGenerate(aPathUrl);
  }

  if (aPathUrl || aPath.match(dataUrlRegexp)) {
    return aPath;
  }

  // `join('http://', 'www.example.com')`
  if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
    aRootUrl.host = aPath;
    return urlGenerate(aRootUrl);
  }

  var joined = aPath.charAt(0) === '/'
    ? aPath
    : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

  if (aRootUrl) {
    aRootUrl.path = joined;
    return urlGenerate(aRootUrl);
  }
  return joined;
}
exports.join = join;

exports.isAbsolute = function (aPath) {
  return aPath.charAt(0) === '/' || !!aPath.match(urlRegexp);
};

/**
 * Make a path relative to a URL or another path.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be made relative to aRoot.
 */
function relative(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }

  aRoot = aRoot.replace(/\/$/, '');

  // It is possible for the path to be above the root. In this case, simply
  // checking whether the root is a prefix of the path won't work. Instead, we
  // need to remove components from the root one by one, until either we find
  // a prefix that fits, or we run out of components to remove.
  var level = 0;
  while (aPath.indexOf(aRoot + '/') !== 0) {
    var index = aRoot.lastIndexOf("/");
    if (index < 0) {
      return aPath;
    }

    // If the only part of the root that is left is the scheme (i.e. http://,
    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
    // have exhausted all components, so the path is not relative to the root.
    aRoot = aRoot.slice(0, index);
    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
      return aPath;
    }

    ++level;
  }

  // Make sure we add a "../" for each component we removed from the root.
  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
}
exports.relative = relative;

var supportsNullProto = (function () {
  var obj = Object.create(null);
  return !('__proto__' in obj);
}());

function identity (s) {
  return s;
}

/**
 * Because behavior goes wacky when you set `__proto__` on objects, we
 * have to prefix all the strings in our set with an arbitrary character.
 *
 * See https://github.com/mozilla/source-map/pull/31 and
 * https://github.com/mozilla/source-map/issues/30
 *
 * @param String aStr
 */
function toSetString(aStr) {
  if (isProtoString(aStr)) {
    return '$' + aStr;
  }

  return aStr;
}
exports.toSetString = supportsNullProto ? identity : toSetString;

function fromSetString(aStr) {
  if (isProtoString(aStr)) {
    return aStr.slice(1);
  }

  return aStr;
}
exports.fromSetString = supportsNullProto ? identity : fromSetString;

function isProtoString(s) {
  if (!s) {
    return false;
  }

  var length = s.length;

  if (length < 9 /* "__proto__".length */) {
    return false;
  }

  if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
      s.charCodeAt(length - 2) !== 95  /* '_' */ ||
      s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 4) !== 116 /* 't' */ ||
      s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
      s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
      s.charCodeAt(length - 8) !== 95  /* '_' */ ||
      s.charCodeAt(length - 9) !== 95  /* '_' */) {
    return false;
  }

  for (var i = length - 10; i >= 0; i--) {
    if (s.charCodeAt(i) !== 36 /* '$' */) {
      return false;
    }
  }

  return true;
}

/**
 * Comparator between two mappings where the original positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same original source/line/column, but different generated
 * line and column the same. Useful when searching for a mapping with a
 * stubbed out mapping.
 */
function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
  var cmp = mappingA.source - mappingB.source;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0 || onlyCompareOriginal) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  return mappingA.name - mappingB.name;
}
exports.compareByOriginalPositions = compareByOriginalPositions;

/**
 * Comparator between two mappings with deflated source and name indices where
 * the generated positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same generated line and column, but different
 * source/name/original line and column the same. Useful when searching for a
 * mapping with a stubbed out mapping.
 */
function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0 || onlyCompareGenerated) {
    return cmp;
  }

  cmp = mappingA.source - mappingB.source;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return mappingA.name - mappingB.name;
}
exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

function strcmp(aStr1, aStr2) {
  if (aStr1 === aStr2) {
    return 0;
  }

  if (aStr1 > aStr2) {
    return 1;
  }

  return -1;
}

/**
 * Comparator between two mappings with inflated source and name strings where
 * the generated positions are compared.
 */
function compareByGeneratedPositionsInflated(mappingA, mappingB) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

},{}],"buffer-crc32":[function(require,module,exports){
var Buffer = require('buffer').Buffer;

var CRC_TABLE = [
  0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419,
  0x706af48f, 0xe963a535, 0x9e6495a3, 0x0edb8832, 0x79dcb8a4,
  0xe0d5e91e, 0x97d2d988, 0x09b64c2b, 0x7eb17cbd, 0xe7b82d07,
  0x90bf1d91, 0x1db71064, 0x6ab020f2, 0xf3b97148, 0x84be41de,
  0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7, 0x136c9856,
  0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9,
  0xfa0f3d63, 0x8d080df5, 0x3b6e20c8, 0x4c69105e, 0xd56041e4,
  0xa2677172, 0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b,
  0x35b5a8fa, 0x42b2986c, 0xdbbbc9d6, 0xacbcf940, 0x32d86ce3,
  0x45df5c75, 0xdcd60dcf, 0xabd13d59, 0x26d930ac, 0x51de003a,
  0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423, 0xcfba9599,
  0xb8bda50f, 0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924,
  0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d, 0x76dc4190,
  0x01db7106, 0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f,
  0x9fbfe4a5, 0xe8b8d433, 0x7807c9a2, 0x0f00f934, 0x9609a88e,
  0xe10e9818, 0x7f6a0dbb, 0x086d3d2d, 0x91646c97, 0xe6635c01,
  0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e, 0x6c0695ed,
  0x1b01a57b, 0x8208f4c1, 0xf50fc457, 0x65b0d9c6, 0x12b7e950,
  0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3,
  0xfbd44c65, 0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2,
  0x4adfa541, 0x3dd895d7, 0xa4d1c46d, 0xd3d6f4fb, 0x4369e96a,
  0x346ed9fc, 0xad678846, 0xda60b8d0, 0x44042d73, 0x33031de5,
  0xaa0a4c5f, 0xdd0d7cc9, 0x5005713c, 0x270241aa, 0xbe0b1010,
  0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f,
  0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17,
  0x2eb40d81, 0xb7bd5c3b, 0xc0ba6cad, 0xedb88320, 0x9abfb3b6,
  0x03b6e20c, 0x74b1d29a, 0xead54739, 0x9dd277af, 0x04db2615,
  0x73dc1683, 0xe3630b12, 0x94643b84, 0x0d6d6a3e, 0x7a6a5aa8,
  0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1, 0xf00f9344,
  0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb,
  0x196c3671, 0x6e6b06e7, 0xfed41b76, 0x89d32be0, 0x10da7a5a,
  0x67dd4acc, 0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5,
  0xd6d6a3e8, 0xa1d1937e, 0x38d8c2c4, 0x4fdff252, 0xd1bb67f1,
  0xa6bc5767, 0x3fb506dd, 0x48b2364b, 0xd80d2bda, 0xaf0a1b4c,
  0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55, 0x316e8eef,
  0x4669be79, 0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236,
  0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f, 0xc5ba3bbe,
  0xb2bd0b28, 0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31,
  0x2cd99e8b, 0x5bdeae1d, 0x9b64c2b0, 0xec63f226, 0x756aa39c,
  0x026d930a, 0x9c0906a9, 0xeb0e363f, 0x72076785, 0x05005713,
  0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38, 0x92d28e9b,
  0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21, 0x86d3d2d4, 0xf1d4e242,
  0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1,
  0x18b74777, 0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c,
  0x8f659eff, 0xf862ae69, 0x616bffd3, 0x166ccf45, 0xa00ae278,
  0xd70dd2ee, 0x4e048354, 0x3903b3c2, 0xa7672661, 0xd06016f7,
  0x4969474d, 0x3e6e77db, 0xaed16a4a, 0xd9d65adc, 0x40df0b66,
  0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9,
  0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605,
  0xcdd70693, 0x54de5729, 0x23d967bf, 0xb3667a2e, 0xc4614ab8,
  0x5d681b02, 0x2a6f2b94, 0xb40bbe37, 0xc30c8ea1, 0x5a05df1b,
  0x2d02ef8d
];

if (typeof Int32Array !== 'undefined') {
  CRC_TABLE = new Int32Array(CRC_TABLE);
}

function newEmptyBuffer(length) {
  var buffer = new Buffer(length);
  buffer.fill(0x00);
  return buffer;
}

function ensureBuffer(input) {
  if (Buffer.isBuffer(input)) {
    return input;
  }

  var hasNewBufferAPI =
      typeof Buffer.alloc === "function" &&
      typeof Buffer.from === "function";

  if (typeof input === "number") {
    return hasNewBufferAPI ? Buffer.alloc(input) : newEmptyBuffer(input);
  }
  else if (typeof input === "string") {
    return hasNewBufferAPI ? Buffer.from(input) : new Buffer(input);
  }
  else {
    throw new Error("input must be buffer, number, or string, received " +
                    typeof input);
  }
}

function bufferizeInt(num) {
  var tmp = ensureBuffer(4);
  tmp.writeInt32BE(num, 0);
  return tmp;
}

function _crc32(buf, previous) {
  buf = ensureBuffer(buf);
  if (Buffer.isBuffer(previous)) {
    previous = previous.readUInt32BE(0);
  }
  var crc = ~~previous ^ -1;
  for (var n = 0; n < buf.length; n++) {
    crc = CRC_TABLE[(crc ^ buf[n]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1);
}

function crc32() {
  return bufferizeInt(_crc32.apply(null, arguments));
}
crc32.signed = function () {
  return _crc32.apply(null, arguments);
};
crc32.unsigned = function () {
  return _crc32.apply(null, arguments) >>> 0;
};

module.exports = crc32;

},{"buffer":false}],"buffer-from":[function(require,module,exports){
(function (Buffer){
var toString = Object.prototype.toString

var isModern = (
  typeof Buffer.alloc === 'function' &&
  typeof Buffer.allocUnsafe === 'function' &&
  typeof Buffer.from === 'function'
)

function isArrayBuffer (input) {
  return toString.call(input).slice(8, -1) === 'ArrayBuffer'
}

function fromArrayBuffer (obj, byteOffset, length) {
  byteOffset >>>= 0

  var maxLength = obj.byteLength - byteOffset

  if (maxLength < 0) {
    throw new RangeError("'offset' is out of bounds")
  }

  if (length === undefined) {
    length = maxLength
  } else {
    length >>>= 0

    if (length > maxLength) {
      throw new RangeError("'length' is out of bounds")
    }
  }

  return isModern
    ? Buffer.from(obj.slice(byteOffset, byteOffset + length))
    : new Buffer(new Uint8Array(obj.slice(byteOffset, byteOffset + length)))
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  return isModern
    ? Buffer.from(string, encoding)
    : new Buffer(string, encoding)
}

function bufferFrom (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value)) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return isModern
    ? Buffer.from(value)
    : new Buffer(value)
}

module.exports = bufferFrom

}).call(this,require("buffer").Buffer)

},{"buffer":false}],"edfs":[function(require,module,exports){
module.exports.getEDFSMiddleware = () => require("./lib/EDFSMiddleware");
module.exports.createEDFSClient = (url) => {
    const EDFSClient = require("./lib/EDFSClient");
    return new EDFSClient(url);
};


},{"./lib/EDFSClient":"/opt/new_swarm_engine_release/privatesky/modules/edfs/lib/EDFSClient.js","./lib/EDFSMiddleware":"/opt/new_swarm_engine_release/privatesky/modules/edfs/lib/EDFSMiddleware.js"}],"foldermq":[function(require,module,exports){
module.exports = {
					createQue: require("./lib/folderMQ").getFolderQueue
					//folderMQ: require("./lib/folderMQ")
};
},{"./lib/folderMQ":"/opt/new_swarm_engine_release/privatesky/modules/foldermq/lib/folderMQ.js"}],"node-fd-slicer":[function(require,module,exports){
(function (Buffer,setImmediate){
var fs = require('fs');
var util = require('util');
var stream = require('stream');
var Readable = stream.Readable;
var Writable = stream.Writable;
var PassThrough = stream.PassThrough;
var Pend = require('./modules/node-pend');
var EventEmitter = require('events').EventEmitter;

exports.createFromBuffer = createFromBuffer;
exports.createFromFd = createFromFd;
exports.BufferSlicer = BufferSlicer;
exports.FdSlicer = FdSlicer;

util.inherits(FdSlicer, EventEmitter);
function FdSlicer(fd, options) {
  options = options || {};
  EventEmitter.call(this);

  this.fd = fd;
  this.pend = new Pend();
  this.pend.max = 1;
  this.refCount = 0;
  this.autoClose = !!options.autoClose;
}

FdSlicer.prototype.read = function(buffer, offset, length, position, callback) {
  var self = this;
  self.pend.go(function(cb) {
    fs.read(self.fd, buffer, offset, length, position, function(err, bytesRead, buffer) {
      cb();
      callback(err, bytesRead, buffer);
    });
  });
};

FdSlicer.prototype.write = function(buffer, offset, length, position, callback) {
  var self = this;
  self.pend.go(function(cb) {
    fs.write(self.fd, buffer, offset, length, position, function(err, written, buffer) {
      cb();
      callback(err, written, buffer);
    });
  });
};

FdSlicer.prototype.createReadStream = function(options) {
  return new ReadStream(this, options);
};

FdSlicer.prototype.createWriteStream = function(options) {
  return new WriteStream(this, options);
};

FdSlicer.prototype.ref = function() {
  this.refCount += 1;
};

FdSlicer.prototype.unref = function() {
  var self = this;
  self.refCount -= 1;

  if (self.refCount > 0) return;
  if (self.refCount < 0) throw new Error("invalid unref");

  if (self.autoClose) {
    fs.close(self.fd, onCloseDone);
  }

  function onCloseDone(err) {
    if (err) {
      self.emit('error', err);
    } else {
      self.emit('close');
    }
  }
};

util.inherits(ReadStream, Readable);
function ReadStream(context, options) {
  options = options || {};
  Readable.call(this, options);

  this.context = context;
  this.context.ref();

  this.start = options.start || 0;
  this.endOffset = options.end;
  this.pos = this.start;
  this.destroyed = false;
}

ReadStream.prototype._read = function(n) {
  var self = this;
  if (self.destroyed) return;

  var toRead = Math.min(self._readableState.highWaterMark, n);
  if (self.endOffset != null) {
    toRead = Math.min(toRead, self.endOffset - self.pos);
  }
  if (toRead <= 0) {
    self.destroyed = true;
    self.push(null);
    self.context.unref();
    return;
  }
  self.context.pend.go(function(cb) {
    if (self.destroyed) return cb();
    var buffer = new Buffer(toRead);
    fs.read(self.context.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
      if (err) {
        self.destroy(err);
      } else if (bytesRead === 0) {
        self.destroyed = true;
        self.push(null);
        self.context.unref();
      } else {
        self.pos += bytesRead;
        self.push(buffer.slice(0, bytesRead));
      }
      cb();
    });
  });
};

ReadStream.prototype.destroy = function(err) {
  if (this.destroyed) return;
  err = err || new Error("stream destroyed");
  this.destroyed = true;
  this.emit('error', err);
  this.context.unref();
};

util.inherits(WriteStream, Writable);
function WriteStream(context, options) {
  options = options || {};
  Writable.call(this, options);

  this.context = context;
  this.context.ref();

  this.start = options.start || 0;
  this.endOffset = (options.end == null) ? Infinity : +options.end;
  this.bytesWritten = 0;
  this.pos = this.start;
  this.destroyed = false;

  this.on('finish', this.destroy.bind(this));
}

WriteStream.prototype._write = function(buffer, encoding, callback) {
  var self = this;
  if (self.destroyed) return;

  if (self.pos + buffer.length > self.endOffset) {
    var err = new Error("maximum file length exceeded");
    err.code = 'ETOOBIG';
    self.destroy();
    callback(err);
    return;
  }
  self.context.pend.go(function(cb) {
    if (self.destroyed) return cb();
    fs.write(self.context.fd, buffer, 0, buffer.length, self.pos, function(err, bytes) {
      if (err) {
        self.destroy();
        cb();
        callback(err);
      } else {
        self.bytesWritten += bytes;
        self.pos += bytes;
        self.emit('progress');
        cb();
        callback();
      }
    });
  });
};

WriteStream.prototype.destroy = function() {
  if (this.destroyed) return;
  this.destroyed = true;
  this.context.unref();
};

util.inherits(BufferSlicer, EventEmitter);
function BufferSlicer(buffer, options) {
  EventEmitter.call(this);

  options = options || {};
  this.refCount = 0;
  this.buffer = buffer;
  this.maxChunkSize = options.maxChunkSize || Number.MAX_SAFE_INTEGER;
}

BufferSlicer.prototype.read = function(buffer, offset, length, position, callback) {
  var end = position + length;
  var delta = end - this.buffer.length;
  var written = (delta > 0) ? delta : length;
  this.buffer.copy(buffer, offset, position, end);
  setImmediate(function() {
    callback(null, written);
  });
};

BufferSlicer.prototype.write = function(buffer, offset, length, position, callback) {
  buffer.copy(this.buffer, position, offset, offset + length);
  setImmediate(function() {
    callback(null, length, buffer);
  });
};

BufferSlicer.prototype.createReadStream = function(options) {
  options = options || {};
  var readStream = new PassThrough(options);
  readStream.destroyed = false;
  readStream.start = options.start || 0;
  readStream.endOffset = options.end;
  // by the time this function returns, we'll be done.
  readStream.pos = readStream.endOffset || this.buffer.length;

  // respect the maxChunkSize option to slice up the chunk into smaller pieces.
  var entireSlice = this.buffer.slice(readStream.start, readStream.pos);
  var offset = 0;
  while (true) {
    var nextOffset = offset + this.maxChunkSize;
    if (nextOffset >= entireSlice.length) {
      // last chunk
      if (offset < entireSlice.length) {
        readStream.write(entireSlice.slice(offset, entireSlice.length));
      }
      break;
    }
    readStream.write(entireSlice.slice(offset, nextOffset));
    offset = nextOffset;
  }

  readStream.end();
  readStream.destroy = function() {
    readStream.destroyed = true;
  };
  return readStream;
};

BufferSlicer.prototype.createWriteStream = function(options) {
  var bufferSlicer = this;
  options = options || {};
  var writeStream = new Writable(options);
  writeStream.start = options.start || 0;
  writeStream.endOffset = (options.end == null) ? this.buffer.length : +options.end;
  writeStream.bytesWritten = 0;
  writeStream.pos = writeStream.start;
  writeStream.destroyed = false;
  writeStream._write = function(buffer, encoding, callback) {
    if (writeStream.destroyed) return;

    var end = writeStream.pos + buffer.length;
    if (end > writeStream.endOffset) {
      var err = new Error("maximum file length exceeded");
      err.code = 'ETOOBIG';
      writeStream.destroyed = true;
      callback(err);
      return;
    }
    buffer.copy(bufferSlicer.buffer, writeStream.pos, 0, buffer.length);

    writeStream.bytesWritten += buffer.length;
    writeStream.pos = end;
    writeStream.emit('progress');
    callback();
  };
  writeStream.destroy = function() {
    writeStream.destroyed = true;
  };
  return writeStream;
};

BufferSlicer.prototype.ref = function() {
  this.refCount += 1;
};

BufferSlicer.prototype.unref = function() {
  this.refCount -= 1;

  if (this.refCount < 0) {
    throw new Error("invalid unref");
  }
};

function createFromBuffer(buffer, options) {
  return new BufferSlicer(buffer, options);
}

function createFromFd(fd, options) {
  return new FdSlicer(fd, options);
}

}).call(this,require("buffer").Buffer,require("timers").setImmediate)

},{"./modules/node-pend":"/opt/new_swarm_engine_release/privatesky/modules/node-fd-slicer/modules/node-pend/index.js","buffer":false,"events":false,"fs":false,"stream":false,"timers":false,"util":false}],"psk-http-client":[function(require,module,exports){
//to look nice the requireModule on Node
require("./lib/psk-abstract-client");
if(!$$.browserRuntime){
	require("./lib/psk-node-client");
}else{
	require("./lib/psk-browser-client");
}
},{"./lib/psk-abstract-client":"/opt/new_swarm_engine_release/privatesky/modules/psk-http-client/lib/psk-abstract-client.js","./lib/psk-browser-client":"/opt/new_swarm_engine_release/privatesky/modules/psk-http-client/lib/psk-browser-client.js","./lib/psk-node-client":"/opt/new_swarm_engine_release/privatesky/modules/psk-http-client/lib/psk-node-client.js"}],"source-map-support":[function(require,module,exports){
var SourceMapConsumer = require('source-map').SourceMapConsumer;
var path = require('path');

var fs;
try {
  fs = require('fs');
  if (!fs.existsSync || !fs.readFileSync) {
    // fs doesn't have all methods we need
    fs = null;
  }
} catch (err) {
  /* nop */
}

var bufferFrom = require('buffer-from');

// Only install once if called multiple times
var errorFormatterInstalled = false;
var uncaughtShimInstalled = false;

// If true, the caches are reset before a stack trace formatting operation
var emptyCacheBetweenOperations = false;

// Supports {browser, node, auto}
var environment = "auto";

// Maps a file path to a string containing the file contents
var fileContentsCache = {};

// Maps a file path to a source map for that file
var sourceMapCache = {};

// Regex for detecting source maps
var reSourceMap = /^data:application\/json[^,]+base64,/;

// Priority list of retrieve handlers
var retrieveFileHandlers = [];
var retrieveMapHandlers = [];

function isInBrowser() {
  if (environment === "browser")
    return true;
  if (environment === "node")
    return false;
  return ((typeof window !== 'undefined') && (typeof XMLHttpRequest === 'function') && !(window.require && window.module && window.process && window.process.type === "renderer"));
}

function hasGlobalProcessEventEmitter() {
  return ((typeof process === 'object') && (process !== null) && (typeof process.on === 'function'));
}

function handlerExec(list) {
  return function(arg) {
    for (var i = 0; i < list.length; i++) {
      var ret = list[i](arg);
      if (ret) {
        return ret;
      }
    }
    return null;
  };
}

var retrieveFile = handlerExec(retrieveFileHandlers);

retrieveFileHandlers.push(function(path) {
  // Trim the path to make sure there is no extra whitespace.
  path = path.trim();
  if (/^file:/.test(path)) {
    // existsSync/readFileSync can't handle file protocol, but once stripped, it works
    path = path.replace(/file:\/\/\/(\w:)?/, function(protocol, drive) {
      return drive ?
        '' : // file:///C:/dir/file -> C:/dir/file
        '/'; // file:///root-dir/file -> /root-dir/file
    });
  }
  if (path in fileContentsCache) {
    return fileContentsCache[path];
  }

  var contents = '';
  try {
    if (!fs) {
      // Use SJAX if we are in the browser
      var xhr = new XMLHttpRequest();
      xhr.open('GET', path, /** async */ false);
      xhr.send(null);
      if (xhr.readyState === 4 && xhr.status === 200) {
        contents = xhr.responseText;
      }
    } else if (fs.existsSync(path)) {
      // Otherwise, use the filesystem
      contents = fs.readFileSync(path, 'utf8');
    }
  } catch (er) {
    /* ignore any errors */
  }

  return fileContentsCache[path] = contents;
});

// Support URLs relative to a directory, but be careful about a protocol prefix
// in case we are in the browser (i.e. directories may start with "http://" or "file:///")
function supportRelativeURL(file, url) {
  if (!file) return url;
  var dir = path.dirname(file);
  var match = /^\w+:\/\/[^\/]*/.exec(dir);
  var protocol = match ? match[0] : '';
  var startPath = dir.slice(protocol.length);
  if (protocol && /^\/\w\:/.test(startPath)) {
    // handle file:///C:/ paths
    protocol += '/';
    return protocol + path.resolve(dir.slice(protocol.length), url).replace(/\\/g, '/');
  }
  return protocol + path.resolve(dir.slice(protocol.length), url);
}

function retrieveSourceMapURL(source) {
  var fileData;

  if (isInBrowser()) {
     try {
       var xhr = new XMLHttpRequest();
       xhr.open('GET', source, false);
       xhr.send(null);
       fileData = xhr.readyState === 4 ? xhr.responseText : null;

       // Support providing a sourceMappingURL via the SourceMap header
       var sourceMapHeader = xhr.getResponseHeader("SourceMap") ||
                             xhr.getResponseHeader("X-SourceMap");
       if (sourceMapHeader) {
         return sourceMapHeader;
       }
     } catch (e) {
     }
  }

  // Get the URL of the source map
  fileData = retrieveFile(source);
  var re = /(?:\/\/[@#][\s]*sourceMappingURL=([^\s'"]+)[\s]*$)|(?:\/\*[@#][\s]*sourceMappingURL=([^\s*'"]+)[\s]*(?:\*\/)[\s]*$)/mg;
  // Keep executing the search to find the *last* sourceMappingURL to avoid
  // picking up sourceMappingURLs from comments, strings, etc.
  var lastMatch, match;
  while (match = re.exec(fileData)) lastMatch = match;
  if (!lastMatch) return null;
  return lastMatch[1];
};

// Can be overridden by the retrieveSourceMap option to install. Takes a
// generated source filename; returns a {map, optional url} object, or null if
// there is no source map.  The map field may be either a string or the parsed
// JSON object (ie, it must be a valid argument to the SourceMapConsumer
// constructor).
var retrieveSourceMap = handlerExec(retrieveMapHandlers);
retrieveMapHandlers.push(function(source) {
  var sourceMappingURL = retrieveSourceMapURL(source);
  if (!sourceMappingURL) return null;

  // Read the contents of the source map
  var sourceMapData;
  if (reSourceMap.test(sourceMappingURL)) {
    // Support source map URL as a data url
    var rawData = sourceMappingURL.slice(sourceMappingURL.indexOf(',') + 1);
    sourceMapData = bufferFrom(rawData, "base64").toString();
    sourceMappingURL = source;
  } else {
    // Support source map URLs relative to the source URL
    sourceMappingURL = supportRelativeURL(source, sourceMappingURL);
    sourceMapData = retrieveFile(sourceMappingURL);
  }

  if (!sourceMapData) {
    return null;
  }

  return {
    url: sourceMappingURL,
    map: sourceMapData
  };
});

function mapSourcePosition(position) {
  var sourceMap = sourceMapCache[position.source];
  if (!sourceMap) {
    // Call the (overrideable) retrieveSourceMap function to get the source map.
    var urlAndMap = retrieveSourceMap(position.source);
    if (urlAndMap) {
      sourceMap = sourceMapCache[position.source] = {
        url: urlAndMap.url,
        map: new SourceMapConsumer(urlAndMap.map)
      };

      // Load all sources stored inline with the source map into the file cache
      // to pretend like they are already loaded. They may not exist on disk.
      if (sourceMap.map.sourcesContent) {
        sourceMap.map.sources.forEach(function(source, i) {
          var contents = sourceMap.map.sourcesContent[i];
          if (contents) {
            var url = supportRelativeURL(sourceMap.url, source);
            fileContentsCache[url] = contents;
          }
        });
      }
    } else {
      sourceMap = sourceMapCache[position.source] = {
        url: null,
        map: null
      };
    }
  }

  // Resolve the source URL relative to the URL of the source map
  if (sourceMap && sourceMap.map && typeof sourceMap.map.originalPositionFor === 'function') {
    var originalPosition = sourceMap.map.originalPositionFor(position);

    // Only return the original position if a matching line was found. If no
    // matching line is found then we return position instead, which will cause
    // the stack trace to print the path and line for the compiled file. It is
    // better to give a precise location in the compiled file than a vague
    // location in the original file.
    if (originalPosition.source !== null) {
      originalPosition.source = supportRelativeURL(
        sourceMap.url, originalPosition.source);
      return originalPosition;
    }
  }

  return position;
}

// Parses code generated by FormatEvalOrigin(), a function inside V8:
// https://code.google.com/p/v8/source/browse/trunk/src/messages.js
function mapEvalOrigin(origin) {
  // Most eval() calls are in this format
  var match = /^eval at ([^(]+) \((.+):(\d+):(\d+)\)$/.exec(origin);
  if (match) {
    var position = mapSourcePosition({
      source: match[2],
      line: +match[3],
      column: match[4] - 1
    });
    return 'eval at ' + match[1] + ' (' + position.source + ':' +
      position.line + ':' + (position.column + 1) + ')';
  }

  // Parse nested eval() calls using recursion
  match = /^eval at ([^(]+) \((.+)\)$/.exec(origin);
  if (match) {
    return 'eval at ' + match[1] + ' (' + mapEvalOrigin(match[2]) + ')';
  }

  // Make sure we still return useful information if we didn't find anything
  return origin;
}

// This is copied almost verbatim from the V8 source code at
// https://code.google.com/p/v8/source/browse/trunk/src/messages.js. The
// implementation of wrapCallSite() used to just forward to the actual source
// code of CallSite.prototype.toString but unfortunately a new release of V8
// did something to the prototype chain and broke the shim. The only fix I
// could find was copy/paste.
function CallSiteToString() {
  var fileName;
  var fileLocation = "";
  if (this.isNative()) {
    fileLocation = "native";
  } else {
    fileName = this.getScriptNameOrSourceURL();
    if (!fileName && this.isEval()) {
      fileLocation = this.getEvalOrigin();
      fileLocation += ", ";  // Expecting source position to follow.
    }

    if (fileName) {
      fileLocation += fileName;
    } else {
      // Source code does not originate from a file and is not native, but we
      // can still get the source position inside the source string, e.g. in
      // an eval string.
      fileLocation += "<anonymous>";
    }
    var lineNumber = this.getLineNumber();
    if (lineNumber != null) {
      fileLocation += ":" + lineNumber;
      var columnNumber = this.getColumnNumber();
      if (columnNumber) {
        fileLocation += ":" + columnNumber;
      }
    }
  }

  var line = "";
  var functionName = this.getFunctionName();
  var addSuffix = true;
  var isConstructor = this.isConstructor();
  var isMethodCall = !(this.isToplevel() || isConstructor);
  if (isMethodCall) {
    var typeName = this.getTypeName();
    // Fixes shim to be backward compatable with Node v0 to v4
    if (typeName === "[object Object]") {
      typeName = "null";
    }
    var methodName = this.getMethodName();
    if (functionName) {
      if (typeName && functionName.indexOf(typeName) != 0) {
        line += typeName + ".";
      }
      line += functionName;
      if (methodName && functionName.indexOf("." + methodName) != functionName.length - methodName.length - 1) {
        line += " [as " + methodName + "]";
      }
    } else {
      line += typeName + "." + (methodName || "<anonymous>");
    }
  } else if (isConstructor) {
    line += "new " + (functionName || "<anonymous>");
  } else if (functionName) {
    line += functionName;
  } else {
    line += fileLocation;
    addSuffix = false;
  }
  if (addSuffix) {
    line += " (" + fileLocation + ")";
  }
  return line;
}

function cloneCallSite(frame) {
  var object = {};
  Object.getOwnPropertyNames(Object.getPrototypeOf(frame)).forEach(function(name) {
    object[name] = /^(?:is|get)/.test(name) ? function() { return frame[name].call(frame); } : frame[name];
  });
  object.toString = CallSiteToString;
  return object;
}

function wrapCallSite(frame) {
  if(frame.isNative()) {
    return frame;
  }

  // Most call sites will return the source file from getFileName(), but code
  // passed to eval() ending in "//# sourceURL=..." will return the source file
  // from getScriptNameOrSourceURL() instead
  var source = frame.getFileName() || frame.getScriptNameOrSourceURL();
  if (source) {
    var line = frame.getLineNumber();
    var column = frame.getColumnNumber() - 1;

    // Fix position in Node where some (internal) code is prepended.
    // See https://github.com/evanw/node-source-map-support/issues/36
    var headerLength = 62;
    if (line === 1 && column > headerLength && !isInBrowser() && !frame.isEval()) {
      column -= headerLength;
    }

    var position = mapSourcePosition({
      source: source,
      line: line,
      column: column
    });
    frame = cloneCallSite(frame);
    var originalFunctionName = frame.getFunctionName;
    frame.getFunctionName = function() { return position.name || originalFunctionName(); };
    frame.getFileName = function() { return position.source; };
    frame.getLineNumber = function() { return position.line; };
    frame.getColumnNumber = function() { return position.column + 1; };
    frame.getScriptNameOrSourceURL = function() { return position.source; };
    return frame;
  }

  // Code called using eval() needs special handling
  var origin = frame.isEval() && frame.getEvalOrigin();
  if (origin) {
    origin = mapEvalOrigin(origin);
    frame = cloneCallSite(frame);
    frame.getEvalOrigin = function() { return origin; };
    return frame;
  }

  // If we get here then we were unable to change the source position
  return frame;
}

// This function is part of the V8 stack trace API, for more info see:
// https://v8.dev/docs/stack-trace-api
function prepareStackTrace(error, stack) {
  if (emptyCacheBetweenOperations) {
    fileContentsCache = {};
    sourceMapCache = {};
  }

  var name = error.name || 'Error';
  var message = error.message || '';
  var errorString = name + ": " + message;

  return errorString + stack.map(function(frame) {
    return '\n    at ' + wrapCallSite(frame);
  }).join('');
}

// Generate position and snippet of original source with pointer
function getErrorSource(error) {
  var match = /\n    at [^(]+ \((.*):(\d+):(\d+)\)/.exec(error.stack);
  if (match) {
    var source = match[1];
    var line = +match[2];
    var column = +match[3];

    // Support the inline sourceContents inside the source map
    var contents = fileContentsCache[source];

    // Support files on disk
    if (!contents && fs && fs.existsSync(source)) {
      try {
        contents = fs.readFileSync(source, 'utf8');
      } catch (er) {
        contents = '';
      }
    }

    // Format the line from the original source code like node does
    if (contents) {
      var code = contents.split(/(?:\r\n|\r|\n)/)[line - 1];
      if (code) {
        return source + ':' + line + '\n' + code + '\n' +
          new Array(column).join(' ') + '^';
      }
    }
  }
  return null;
}

function printErrorAndExit (error) {
  var source = getErrorSource(error);

  // Ensure error is printed synchronously and not truncated
  if (process.stderr._handle && process.stderr._handle.setBlocking) {
    process.stderr._handle.setBlocking(true);
  }

  if (source) {
    console.error();
    console.error(source);
  }

  console.error(error.stack);
  process.exit(1);
}

function shimEmitUncaughtException () {
  var origEmit = process.emit;

  process.emit = function (type) {
    if (type === 'uncaughtException') {
      var hasStack = (arguments[1] && arguments[1].stack);
      var hasListeners = (this.listeners(type).length > 0);

      if (hasStack && !hasListeners) {
        return printErrorAndExit(arguments[1]);
      }
    }

    return origEmit.apply(this, arguments);
  };
}

var originalRetrieveFileHandlers = retrieveFileHandlers.slice(0);
var originalRetrieveMapHandlers = retrieveMapHandlers.slice(0);

exports.wrapCallSite = wrapCallSite;
exports.getErrorSource = getErrorSource;
exports.mapSourcePosition = mapSourcePosition;
exports.retrieveSourceMap = retrieveSourceMap;

exports.install = function(options) {
  options = options || {};

  if (options.environment) {
    environment = options.environment;
    if (["node", "browser", "auto"].indexOf(environment) === -1) {
      throw new Error("environment " + environment + " was unknown. Available options are {auto, browser, node}")
    }
  }

  // Allow sources to be found by methods other than reading the files
  // directly from disk.
  if (options.retrieveFile) {
    if (options.overrideRetrieveFile) {
      retrieveFileHandlers.length = 0;
    }

    retrieveFileHandlers.unshift(options.retrieveFile);
  }

  // Allow source maps to be found by methods other than reading the files
  // directly from disk.
  if (options.retrieveSourceMap) {
    if (options.overrideRetrieveSourceMap) {
      retrieveMapHandlers.length = 0;
    }

    retrieveMapHandlers.unshift(options.retrieveSourceMap);
  }

  // Support runtime transpilers that include inline source maps
  if (options.hookRequire && !isInBrowser()) {
    var Module;
    try {
      Module = require('module');
    } catch (err) {
      // NOP: Loading in catch block to convert webpack error to warning.
    }
    var $compile = Module.prototype._compile;

    if (!$compile.__sourceMapSupport) {
      Module.prototype._compile = function(content, filename) {
        fileContentsCache[filename] = content;
        sourceMapCache[filename] = undefined;
        return $compile.call(this, content, filename);
      };

      Module.prototype._compile.__sourceMapSupport = true;
    }
  }

  // Configure options
  if (!emptyCacheBetweenOperations) {
    emptyCacheBetweenOperations = 'emptyCacheBetweenOperations' in options ?
      options.emptyCacheBetweenOperations : false;
  }

  // Install the error reformatter
  if (!errorFormatterInstalled) {
    errorFormatterInstalled = true;
    Error.prepareStackTrace = prepareStackTrace;
  }

  if (!uncaughtShimInstalled) {
    var installHandler = 'handleUncaughtExceptions' in options ?
      options.handleUncaughtExceptions : true;

    // Provide the option to not install the uncaught exception handler. This is
    // to support other uncaught exception handlers (in test frameworks, for
    // example). If this handler is not installed and there are no other uncaught
    // exception handlers, uncaught exceptions will be caught by node's built-in
    // exception handler and the process will still be terminated. However, the
    // generated JavaScript code will be shown above the stack trace instead of
    // the original source code.
    if (installHandler && hasGlobalProcessEventEmitter()) {
      uncaughtShimInstalled = true;
      shimEmitUncaughtException();
    }
  }
};

exports.resetRetrieveHandlers = function() {
  retrieveFileHandlers.length = 0;
  retrieveMapHandlers.length = 0;

  retrieveFileHandlers = originalRetrieveFileHandlers.slice(0);
  retrieveMapHandlers = originalRetrieveMapHandlers.slice(0);
  
  retrieveSourceMap = handlerExec(retrieveMapHandlers);
  retrieveFile = handlerExec(retrieveFileHandlers);
}

},{"buffer-from":"buffer-from","fs":false,"module":false,"path":false,"source-map":"source-map"}],"source-map":[function(require,module,exports){
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
exports.SourceMapGenerator = require('./lib/source-map-generator').SourceMapGenerator;
exports.SourceMapConsumer = require('./lib/source-map-consumer').SourceMapConsumer;
exports.SourceNode = require('./lib/source-node').SourceNode;

},{"./lib/source-map-consumer":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/source-map-consumer.js","./lib/source-map-generator":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/source-map-generator.js","./lib/source-node":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/source-node.js"}],"virtualmq":[function(require,module,exports){
const path = require("path");
const httpWrapper = require('./libs/http-wrapper');
const EDFSMiddleware = require("edfs").getEDFSMiddleware();
const Server = httpWrapper.Server;
const Router = httpWrapper.Router;
const TokenBucket = require('./libs/TokenBucket');

const signatureHeaderName = process.env.vmq_signature_header_name || 'x-signature';

function VirtualMQ({listeningPort, rootFolder, sslConfig}, callback) {
	const port = listeningPort || 8080;
	const tokenBucket = new TokenBucket(600000, 1, 10);
	const CSB_storage_folder = "uploads";

	let bindFinish = (err)=>{
		if(err){
			console.log(err);
			if(callback){
				callback(err);
			}
			return;
		}

		this.close = server.close;
		$$.flow.start("BricksManager").init(path.join(rootFolder, CSB_storage_folder), function (err, result) {
			if (err) {
				throw err;
			} else {
				console.log("BricksManager is using folder", result);
				registerEndpoints();
				if (callback) {
					callback();
				}
			}
		});
	};

	const server = new Server(sslConfig);
	server.listen(port, (err) => {
		if(err){
			console.log(err);
			if(callback){
				callback(err);
			}
		}
	});

	server.on('listening', bindFinish);

	function registerEndpoints() {
		const router = new Router(server);
		router.use("/EDFS", (newServer) => {
			new EDFSMiddleware(newServer);
		});

		server.use(function (req, res, next) {
			res.setHeader('Access-Control-Allow-Origin', req.headers.origin || req.headers.host);
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
			res.setHeader('Access-Control-Allow-Headers', `Content-Type, Access-Control-Allow-Origin, ${signatureHeaderName}`);
			res.setHeader('Access-Control-Allow-Credentials', true);
			next();
		});

        server.use(function (req, res, next) {
            const ip = res.socket.remoteAddress;

            tokenBucket.takeToken(ip, tokenBucket.COST_MEDIUM, function(err, remainedTokens) {
            	res.setHeader('X-RateLimit-Limit', tokenBucket.getLimitByCost(tokenBucket.COST_MEDIUM));
            	res.setHeader('X-RateLimit-Remaining', tokenBucket.getRemainingTokenByCost(remainedTokens, tokenBucket.COST_MEDIUM));

            	if(err) {
            		if (err === TokenBucket.ERROR_LIMIT_EXCEEDED) {
						res.statusCode = 429;
					} else {
						res.statusCode = 500;
					}

            		res.end();
            		return;
            	}

            	next();
            });
        });

		//folder can be userId/tripId/...
		server.post('/files/upload/:folder', function (req,res) {
			let fileManager = require('./fileManager');
			fileManager.upload(req, (err, result)=>{
				if(err){
					res.statusCode = 500;
					res.end();
				}else{
					res.statusCode = 200;
					res.end(JSON.stringify(result));
				}
			})
		});

		server.get('/files/download/:filepath', function (req,res) {
			let fileManager = require('./fileManager');
			fileManager.download(req, res, (err, result)=>{
				if(err){
					res.statusCode = 404;
					res.end();
				}else{
					res.statusCode = 200;
					result.pipe(res);
					result.on('finish', () => {
						res.end();
					})
				}
			})
		});


		server.options('/*', function (req, res) {
			const headers = {};
			// IE8 does not allow domains to be specified, just the *
			headers["Access-Control-Allow-Origin"] = req.headers.origin;
			// headers["Access-Control-Allow-Origin"] = "*";
			headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
			headers["Access-Control-Allow-Credentials"] = true;
			headers["Access-Control-Max-Age"] = '3600'; //one hour
			headers["Access-Control-Allow-Headers"] = `Content-Type, Access-Control-Allow-Origin, User-Agent, ${signatureHeaderName}`;
			res.writeHead(200, headers);
			res.end();
		});

		require("./ChannelsManager.js")(server);

		server.use(function (req, res) {
			res.statusCode = 404;
			res.end();
		});
	}
}

module.exports.createVirtualMQ = function(port, folder, sslConfig, callback){
	if(typeof sslConfig === 'function') {
		callback = sslConfig;
		sslConfig = undefined;
	}

	return new VirtualMQ({listeningPort:port, rootFolder:folder, sslConfig}, callback);
};

module.exports.getVMQRequestFactory = function(virtualMQAddress, zeroMQAddress) {
	const VMQRequestFactory = require('./VMQRequestFactory');

	return new VMQRequestFactory(virtualMQAddress, zeroMQAddress);
};

module.exports.getHttpWrapper = function() {
	return require('./libs/http-wrapper');
};

},{"./ChannelsManager.js":"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/ChannelsManager.js","./VMQRequestFactory":"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/VMQRequestFactory.js","./fileManager":"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/fileManager.js","./libs/TokenBucket":"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/TokenBucket.js","./libs/http-wrapper":"/opt/new_swarm_engine_release/privatesky/modules/virtualmq/libs/http-wrapper/src/index.js","edfs":"edfs","path":false}],"yauzl":[function(require,module,exports){
(function (Buffer,setImmediate){
var fs = require("fs");
var zlib = require("zlib");
const fd_slicer = require("node-fd-slicer");
var crc32 = require("buffer-crc32");
var util = require("util");
var EventEmitter = require("events").EventEmitter;
var Transform = require("stream").Transform;
var PassThrough = require("stream").PassThrough;
var Writable = require("stream").Writable;

exports.open = open;
exports.fromFd = fromFd;
exports.fromBuffer = fromBuffer;
exports.fromRandomAccessReader = fromRandomAccessReader;
exports.dosDateTimeToDate = dosDateTimeToDate;
exports.validateFileName = validateFileName;
exports.ZipFile = ZipFile;
exports.Entry = Entry;
exports.RandomAccessReader = RandomAccessReader;

function open(path, options, callback) {
	if (typeof options === "function") {
		callback = options;
		options = null;
	}
	if (options == null) options = {};
	if (options.autoClose == null) options.autoClose = true;
	if (options.lazyEntries == null) options.lazyEntries = false;
	if (options.decodeStrings == null) options.decodeStrings = true;
	if (options.validateEntrySizes == null) options.validateEntrySizes = true;
	if (options.strictFileNames == null) options.strictFileNames = false;
	if (callback == null) callback = defaultCallback;
	fs.open(path, "r", function (err, fd) {
		if (err) return callback(err);
		fromFd(fd, options, function (err, zipfile) {
			if (err) fs.close(fd, defaultCallback);
			callback(err, zipfile);
		});
	});
}

function fromFd(fd, options, callback) {
	if (typeof options === "function") {
		callback = options;
		options = null;
	}
	if (options == null) options = {};
	if (options.autoClose == null) options.autoClose = false;
	if (options.lazyEntries == null) options.lazyEntries = false;
	if (options.decodeStrings == null) options.decodeStrings = true;
	if (options.validateEntrySizes == null) options.validateEntrySizes = true;
	if (options.strictFileNames == null) options.strictFileNames = false;
	if (callback == null) callback = defaultCallback;
	fs.fstat(fd, function (err, stats) {
		if (err) return callback(err);
		var reader = fd_slicer.createFromFd(fd, {autoClose: true});
		fromRandomAccessReader(reader, stats.size, options, callback);
	});
}

function fromBuffer(buffer, options, callback) {
	if (typeof options === "function") {
		callback = options;
		options = null;
	}
	if (options == null) options = {};
	options.autoClose = false;
	if (options.lazyEntries == null) options.lazyEntries = false;
	if (options.decodeStrings == null) options.decodeStrings = true;
	if (options.validateEntrySizes == null) options.validateEntrySizes = true;
	if (options.strictFileNames == null) options.strictFileNames = false;
	// limit the max chunk size. see https://github.com/thejoshwolfe/yauzl/issues/87
	var reader = fd_slicer.createFromBuffer(buffer, {maxChunkSize: 0x10000});
	fromRandomAccessReader(reader, buffer.length, options, callback);
}

function fromRandomAccessReader(reader, totalSize, options, callback) {
	if (typeof options === "function") {
		callback = options;
		options = null;
	}
	if (options == null) options = {};
	if (options.autoClose == null) options.autoClose = true;
	if (options.lazyEntries == null) options.lazyEntries = false;
	if (options.decodeStrings == null) options.decodeStrings = true;
	var decodeStrings = !!options.decodeStrings;
	if (options.validateEntrySizes == null) options.validateEntrySizes = true;
	if (options.strictFileNames == null) options.strictFileNames = false;
	if (callback == null) callback = defaultCallback;
	if (typeof totalSize !== "number") throw new Error("expected totalSize parameter to be a number");
	if (totalSize > Number.MAX_SAFE_INTEGER) {
		throw new Error("zip file too large. only file sizes up to 2^52 are supported due to JavaScript's Number type being an IEEE 754 double.");
	}

	// the matching unref() call is in zipfile.close()
	reader.ref();

	// eocdr means End of Central Directory Record.
	// search backwards for the eocdr signature.
	// the last field of the eocdr is a variable-length comment.
	// the comment size is encoded in a 2-byte field in the eocdr, which we can't find without trudging backwards through the comment to find it.
	// as a consequence of this design decision, it's possible to have ambiguous zip file metadata if a coherent eocdr was in the comment.
	// we search backwards for a eocdr signature, and hope that whoever made the zip file was smart enough to forbid the eocdr signature in the comment.
	var eocdrWithoutCommentSize = 22;
	var maxCommentSize = 0xffff; // 2-byte size
	var bufferSize = Math.min(eocdrWithoutCommentSize + maxCommentSize, totalSize);
	var buffer = newBuffer(bufferSize);
	var bufferReadStart = totalSize - buffer.length;
	readAndAssertNoEof(reader, buffer, 0, bufferSize, bufferReadStart, function (err) {
		if (err) return callback(err);
		for (var i = bufferSize - eocdrWithoutCommentSize; i >= 0; i -= 1) {
			if (buffer.readUInt32LE(i) !== 0x06054b50) continue;
			// found eocdr
			var eocdrBuffer = buffer.slice(i);

			// 0 - End of central directory signature = 0x06054b50
			// 4 - Number of this disk
			var diskNumber = eocdrBuffer.readUInt16LE(4);
			if (diskNumber !== 0) {
				return callback(new Error("multi-disk zip files are not supported: found disk number: " + diskNumber));
			}
			// 6 - Disk where central directory starts
			// 8 - Number of central directory records on this disk
			// 10 - Total number of central directory records
			var entryCount = eocdrBuffer.readUInt16LE(10);
			// 12 - Size of central directory (bytes)
			// 16 - Offset of start of central directory, relative to start of archive
			var centralDirectoryOffset = eocdrBuffer.readUInt32LE(16);
			// 20 - Comment length
			var commentLength = eocdrBuffer.readUInt16LE(20);
			var expectedCommentLength = eocdrBuffer.length - eocdrWithoutCommentSize;
			if (commentLength !== expectedCommentLength) {
				return callback(new Error("invalid comment length. expected: " + expectedCommentLength + ". found: " + commentLength));
			}
			// 22 - Comment
			// the encoding is always cp437.
			var comment = decodeStrings ? decodeBuffer(eocdrBuffer, 22, eocdrBuffer.length, false)
				: eocdrBuffer.slice(22);

			if (!(entryCount === 0xffff || centralDirectoryOffset === 0xffffffff)) {
				return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options.autoClose, options.lazyEntries, decodeStrings, options.validateEntrySizes, options.strictFileNames));
			}

			// ZIP64 format

			// ZIP64 Zip64 end of central directory locator
			var zip64EocdlBuffer = newBuffer(20);
			var zip64EocdlOffset = bufferReadStart + i - zip64EocdlBuffer.length;
			readAndAssertNoEof(reader, zip64EocdlBuffer, 0, zip64EocdlBuffer.length, zip64EocdlOffset, function (err) {
				if (err) return callback(err);

				// 0 - zip64 end of central dir locator signature = 0x07064b50
				if (zip64EocdlBuffer.readUInt32LE(0) !== 0x07064b50) {
					return callback(new Error("invalid zip64 end of central directory locator signature"));
				}
				// 4 - number of the disk with the start of the zip64 end of central directory
				// 8 - relative offset of the zip64 end of central directory record
				var zip64EocdrOffset = readUInt64LE(zip64EocdlBuffer, 8);
				// 16 - total number of disks

				// ZIP64 end of central directory record
				var zip64EocdrBuffer = newBuffer(56);
				readAndAssertNoEof(reader, zip64EocdrBuffer, 0, zip64EocdrBuffer.length, zip64EocdrOffset, function (err) {
					if (err) return callback(err);

					// 0 - zip64 end of central dir signature                           4 bytes  (0x06064b50)
					if (zip64EocdrBuffer.readUInt32LE(0) !== 0x06064b50) {
						return callback(new Error("invalid zip64 end of central directory record signature"));
					}
					// 4 - size of zip64 end of central directory record                8 bytes
					// 12 - version made by                                             2 bytes
					// 14 - version needed to extract                                   2 bytes
					// 16 - number of this disk                                         4 bytes
					// 20 - number of the disk with the start of the central directory  4 bytes
					// 24 - total number of entries in the central directory on this disk         8 bytes
					// 32 - total number of entries in the central directory            8 bytes
					entryCount = readUInt64LE(zip64EocdrBuffer, 32);
					// 40 - size of the central directory                               8 bytes
					// 48 - offset of start of central directory with respect to the starting disk number     8 bytes
					centralDirectoryOffset = readUInt64LE(zip64EocdrBuffer, 48);
					// 56 - zip64 extensible data sector                                (variable size)
					return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options.autoClose, options.lazyEntries, decodeStrings, options.validateEntrySizes, options.strictFileNames));
				});
			});
			return;
		}
		callback(new Error("end of central directory record signature not found"));
	});
}

util.inherits(ZipFile, EventEmitter);

function ZipFile(reader, centralDirectoryOffset, fileSize, entryCount, comment, autoClose, lazyEntries, decodeStrings, validateEntrySizes, strictFileNames) {
	var self = this;
	EventEmitter.call(self);
	self.reader = reader;
	// forward close events
	self.reader.on("error", function (err) {
		// error closing the fd
		emitError(self, err);
	});
	self.reader.once("close", function () {
		self.emit("close");
	});
	self.readEntryCursor = centralDirectoryOffset;
	self.fileSize = fileSize;
	self.entryCount = entryCount;
	self.comment = comment;
	self.entriesRead = 0;
	self.autoClose = !!autoClose;
	self.lazyEntries = !!lazyEntries;
	self.decodeStrings = !!decodeStrings;
	self.validateEntrySizes = !!validateEntrySizes;
	self.strictFileNames = !!strictFileNames;
	self.isOpen = true;
	self.emittedError = false;

	if (!self.lazyEntries) self._readEntry();
}

ZipFile.prototype.close = function () {
	if (!this.isOpen) return;
	this.isOpen = false;
	this.reader.unref();
};

function emitErrorAndAutoClose(self, err) {
	if (self.autoClose) self.close();
	emitError(self, err);
}

function emitError(self, err) {
	if (self.emittedError) return;
	self.emittedError = true;
	self.emit("error", err);
}

ZipFile.prototype.readEntry = function () {
	if (!this.lazyEntries) throw new Error("readEntry() called without lazyEntries:true");
	this._readEntry();
};
ZipFile.prototype._readEntry = function () {
	var self = this;
	if (self.entryCount === self.entriesRead) {
		// done with metadata
		setImmediate(function () {
			if (self.autoClose) self.close();
			if (self.emittedError) return;
			self.emit("end");
		});
		return;
	}
	if (self.emittedError) return;
	var buffer = newBuffer(46);
	readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function (err) {
		if (err) return emitErrorAndAutoClose(self, err);
		if (self.emittedError) return;
		var entry = new Entry();
		// 0 - Central directory file header signature
		var signature = buffer.readUInt32LE(0);
		if (signature !== 0x02014b50) return emitErrorAndAutoClose(self, new Error("invalid central directory file header signature: 0x" + signature.toString(16)));
		// 4 - Version made by
		entry.versionMadeBy = buffer.readUInt16LE(4);
		// 6 - Version needed to extract (minimum)
		entry.versionNeededToExtract = buffer.readUInt16LE(6);
		// 8 - General purpose bit flag
		entry.generalPurposeBitFlag = buffer.readUInt16LE(8);
		// 10 - Compression method
		entry.compressionMethod = buffer.readUInt16LE(10);
		// 12 - File last modification time
		entry.lastModFileTime = buffer.readUInt16LE(12);
		// 14 - File last modification date
		entry.lastModFileDate = buffer.readUInt16LE(14);
		// 16 - CRC-32
		entry.crc32 = buffer.readUInt32LE(16);
		// 20 - Compressed size
		entry.compressedSize = buffer.readUInt32LE(20);
		// 24 - Uncompressed size
		entry.uncompressedSize = buffer.readUInt32LE(24);
		// 28 - File name length (n)
		entry.fileNameLength = buffer.readUInt16LE(28);
		// 30 - Extra field length (m)
		entry.extraFieldLength = buffer.readUInt16LE(30);
		// 32 - File comment length (k)
		entry.fileCommentLength = buffer.readUInt16LE(32);
		// 34 - Disk number where file starts
		// 36 - Internal file attributes
		entry.internalFileAttributes = buffer.readUInt16LE(36);
		// 38 - External file attributes
		entry.externalFileAttributes = buffer.readUInt32LE(38);
		// 42 - Relative offset of local file header
		entry.relativeOffsetOfLocalHeader = buffer.readUInt32LE(42);

		if (entry.generalPurposeBitFlag & 0x40) return emitErrorAndAutoClose(self, new Error("strong encryption is not supported"));

		self.readEntryCursor += 46;

		buffer = newBuffer(entry.fileNameLength + entry.extraFieldLength + entry.fileCommentLength);
		readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function (err) {
			if (err) return emitErrorAndAutoClose(self, err);
			if (self.emittedError) return;
			// 46 - File name
			var isUtf8 = (entry.generalPurposeBitFlag & 0x800) !== 0;
			entry.fileName = self.decodeStrings ? decodeBuffer(buffer, 0, entry.fileNameLength, isUtf8)
				: buffer.slice(0, entry.fileNameLength);

			// 46+n - Extra field
			var fileCommentStart = entry.fileNameLength + entry.extraFieldLength;
			var extraFieldBuffer = buffer.slice(entry.fileNameLength, fileCommentStart);
			entry.extraFields = [];
			var i = 0;
			while (i < extraFieldBuffer.length - 3) {
				var headerId = extraFieldBuffer.readUInt16LE(i + 0);
				var dataSize = extraFieldBuffer.readUInt16LE(i + 2);
				var dataStart = i + 4;
				var dataEnd = dataStart + dataSize;
				if (dataEnd > extraFieldBuffer.length) return emitErrorAndAutoClose(self, new Error("extra field length exceeds extra field buffer size"));
				var dataBuffer = newBuffer(dataSize);
				extraFieldBuffer.copy(dataBuffer, 0, dataStart, dataEnd);
				entry.extraFields.push({
					id: headerId,
					data: dataBuffer,
				});
				i = dataEnd;
			}

			// 46+n+m - File comment
			entry.fileComment = self.decodeStrings ? decodeBuffer(buffer, fileCommentStart, fileCommentStart + entry.fileCommentLength, isUtf8)
				: buffer.slice(fileCommentStart, fileCommentStart + entry.fileCommentLength);
			// compatibility hack for https://github.com/thejoshwolfe/yauzl/issues/47
			entry.comment = entry.fileComment;

			self.readEntryCursor += buffer.length;
			self.entriesRead += 1;

			if (entry.uncompressedSize === 0xffffffff ||
				entry.compressedSize === 0xffffffff ||
				entry.relativeOffsetOfLocalHeader === 0xffffffff) {
				// ZIP64 format
				// find the Zip64 Extended Information Extra Field
				var zip64EiefBuffer = null;
				for (var i = 0; i < entry.extraFields.length; i++) {
					var extraField = entry.extraFields[i];
					if (extraField.id === 0x0001) {
						zip64EiefBuffer = extraField.data;
						break;
					}
				}
				if (zip64EiefBuffer == null) {
					return emitErrorAndAutoClose(self, new Error("expected zip64 extended information extra field"));
				}
				var index = 0;
				// 0 - Original Size          8 bytes
				if (entry.uncompressedSize === 0xffffffff) {
					if (index + 8 > zip64EiefBuffer.length) {
						return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include uncompressed size"));
					}
					entry.uncompressedSize = readUInt64LE(zip64EiefBuffer, index);
					index += 8;
				}
				// 8 - Compressed Size        8 bytes
				if (entry.compressedSize === 0xffffffff) {
					if (index + 8 > zip64EiefBuffer.length) {
						return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include compressed size"));
					}
					entry.compressedSize = readUInt64LE(zip64EiefBuffer, index);
					index += 8;
				}
				// 16 - Relative Header Offset 8 bytes
				if (entry.relativeOffsetOfLocalHeader === 0xffffffff) {
					if (index + 8 > zip64EiefBuffer.length) {
						return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include relative header offset"));
					}
					entry.relativeOffsetOfLocalHeader = readUInt64LE(zip64EiefBuffer, index);
					index += 8;
				}
				// 24 - Disk Start Number      4 bytes
			}

			// check for Info-ZIP Unicode Path Extra Field (0x7075)
			// see https://github.com/thejoshwolfe/yauzl/issues/33
			if (self.decodeStrings) {
				for (var i = 0; i < entry.extraFields.length; i++) {
					var extraField = entry.extraFields[i];
					if (extraField.id === 0x7075) {
						if (extraField.data.length < 6) {
							// too short to be meaningful
							continue;
						}
						// Version       1 byte      version of this extra field, currently 1
						if (extraField.data.readUInt8(0) !== 1) {
							// > Changes may not be backward compatible so this extra
							// > field should not be used if the version is not recognized.
							continue;
						}
						// NameCRC32     4 bytes     File Name Field CRC32 Checksum
						var oldNameCrc32 = extraField.data.readUInt32LE(1);
						if (crc32.unsigned(buffer.slice(0, entry.fileNameLength)) !== oldNameCrc32) {
							// > If the CRC check fails, this UTF-8 Path Extra Field should be
							// > ignored and the File Name field in the header should be used instead.
							continue;
						}
						// UnicodeName   Variable    UTF-8 version of the entry File Name
						entry.fileName = decodeBuffer(extraField.data, 5, extraField.data.length, true);
						break;
					}
				}
			}

			// validate file size
			if (self.validateEntrySizes && entry.compressionMethod === 0) {
				var expectedCompressedSize = entry.uncompressedSize;
				if (entry.isEncrypted()) {
					// traditional encryption prefixes the file data with a header
					expectedCompressedSize += 12;
				}
				if (entry.compressedSize !== expectedCompressedSize) {
					var msg = "compressed/uncompressed size mismatch for stored file: " + entry.compressedSize + " != " + entry.uncompressedSize;
					return emitErrorAndAutoClose(self, new Error(msg));
				}
			}

			if (self.decodeStrings) {
				if (!self.strictFileNames) {
					// allow backslash
					entry.fileName = entry.fileName.replace(/\\/g, "/");
				}
				var errorMessage = validateFileName(entry.fileName, self.validateFileNameOptions);
				if (errorMessage != null) return emitErrorAndAutoClose(self, new Error(errorMessage));
			}
			self.emit("entry", entry);

			if (!self.lazyEntries) self._readEntry();
		});
	});
};

ZipFile.prototype.openReadStream = function (entry, options, callback) {
	var self = this;
	// parameter validation
	var relativeStart = 0;
	var relativeEnd = entry.compressedSize;
	if (callback == null) {
		callback = options;
		options = {};
	} else {
		// validate options that the caller has no excuse to get wrong
		if (options.decrypt != null) {
			if (!entry.isEncrypted()) {
				throw new Error("options.decrypt can only be specified for encrypted entries");
			}
			if (options.decrypt !== false) throw new Error("invalid options.decrypt value: " + options.decrypt);
			if (entry.isCompressed()) {
				if (options.decompress !== false) throw new Error("entry is encrypted and compressed, and options.decompress !== false");
			}
		}
		if (options.decompress != null) {
			if (!entry.isCompressed()) {
				throw new Error("options.decompress can only be specified for compressed entries");
			}
			if (!(options.decompress === false || options.decompress === true)) {
				throw new Error("invalid options.decompress value: " + options.decompress);
			}
		}
		if (options.start != null || options.end != null) {
			if (entry.isCompressed() && options.decompress !== false) {
				throw new Error("start/end range not allowed for compressed entry without options.decompress === false");
			}
			if (entry.isEncrypted() && options.decrypt !== false) {
				throw new Error("start/end range not allowed for encrypted entry without options.decrypt === false");
			}
		}
		if (options.start != null) {
			relativeStart = options.start;
			if (relativeStart < 0) throw new Error("options.start < 0");
			if (relativeStart > entry.compressedSize) throw new Error("options.start > entry.compressedSize");
		}
		if (options.end != null) {
			relativeEnd = options.end;
			if (relativeEnd < 0) throw new Error("options.end < 0");
			if (relativeEnd > entry.compressedSize) throw new Error("options.end > entry.compressedSize");
			if (relativeEnd < relativeStart) throw new Error("options.end < options.start");
		}
	}
	// any further errors can either be caused by the zipfile,
	// or were introduced in a minor version of yauzl,
	// so should be passed to the client rather than thrown.
	if (!self.isOpen) return callback(new Error("closed"));
	if (entry.isEncrypted()) {
		if (options.decrypt !== false) return callback(new Error("entry is encrypted, and options.decrypt !== false"));
	}
	// make sure we don't lose the fd before we open the actual read stream
	self.reader.ref();
	var buffer = newBuffer(30);
	readAndAssertNoEof(self.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader, function (err) {
		try {
			if (err) return callback(err);
			// 0 - Local file header signature = 0x04034b50
			var signature = buffer.readUInt32LE(0);
			if (signature !== 0x04034b50) {
				return callback(new Error("invalid local file header signature: 0x" + signature.toString(16)));
			}
			// all this should be redundant
			// 4 - Version needed to extract (minimum)
			// 6 - General purpose bit flag
			// 8 - Compression method
			// 10 - File last modification time
			// 12 - File last modification date
			// 14 - CRC-32
			// 18 - Compressed size
			// 22 - Uncompressed size
			// 26 - File name length (n)
			var fileNameLength = buffer.readUInt16LE(26);
			// 28 - Extra field length (m)
			var extraFieldLength = buffer.readUInt16LE(28);
			// 30 - File name
			// 30+n - Extra field
			var localFileHeaderEnd = entry.relativeOffsetOfLocalHeader + buffer.length + fileNameLength + extraFieldLength;
			var decompress;
			if (entry.compressionMethod === 0) {
				// 0 - The file is stored (no compression)
				decompress = false;
			} else if (entry.compressionMethod === 8) {
				// 8 - The file is Deflated
				decompress = options.decompress != null ? options.decompress : true;
			} else {
				return callback(new Error("unsupported compression method: " + entry.compressionMethod));
			}
			var fileDataStart = localFileHeaderEnd;
			var fileDataEnd = fileDataStart + entry.compressedSize;
			if (entry.compressedSize !== 0) {
				// bounds check now, because the read streams will probably not complain loud enough.
				// since we're dealing with an unsigned offset plus an unsigned size,
				// we only have 1 thing to check for.
				if (fileDataEnd > self.fileSize) {
					return callback(new Error("file data overflows file bounds: " +
						fileDataStart + " + " + entry.compressedSize + " > " + self.fileSize));
				}
			}
			var readStream = self.reader.createReadStream({
				start: fileDataStart + relativeStart,
				end: fileDataStart + relativeEnd,
			});
			var endpointStream = readStream;
			if (decompress) {
				var destroyed = false;
				var inflateFilter = zlib.createInflateRaw();
				readStream.on("error", function (err) {
					// setImmediate here because errors can be emitted during the first call to pipe()
					setImmediate(function () {
						if (!destroyed) inflateFilter.emit("error", err);
					});
				});
				readStream.pipe(inflateFilter);

				if (self.validateEntrySizes) {
					endpointStream = new AssertByteCountStream(entry.uncompressedSize);
					inflateFilter.on("error", function (err) {
						// forward zlib errors to the client-visible stream
						setImmediate(function () {
							if (!destroyed) endpointStream.emit("error", err);
						});
					});
					inflateFilter.pipe(endpointStream);
				} else {
					// the zlib filter is the client-visible stream
					endpointStream = inflateFilter;
				}
				// this is part of yauzl's API, so implement this function on the client-visible stream
				endpointStream.destroy = function () {
					destroyed = true;
					if (inflateFilter !== endpointStream) inflateFilter.unpipe(endpointStream);
					readStream.unpipe(inflateFilter);
					// TODO: the inflateFilter may cause a memory leak. see Issue #27.
					readStream.destroy();
				};
			}
			callback(null, endpointStream);
		} finally {
			self.reader.unref();
		}
	});
};

function Entry() {
}

Entry.prototype.getLastModDate = function () {
	return dosDateTimeToDate(this.lastModFileDate, this.lastModFileTime);
};
Entry.prototype.isEncrypted = function () {
	return (this.generalPurposeBitFlag & 0x1) !== 0;
};
Entry.prototype.isCompressed = function () {
	return this.compressionMethod === 8;
};

function dosDateTimeToDate(date, time) {
	var day = date & 0x1f; // 1-31
	var month = (date >> 5 & 0xf) - 1; // 1-12, 0-11
	var year = (date >> 9 & 0x7f) + 1980; // 0-128, 1980-2108

	var millisecond = 0;
	var second = (time & 0x1f) * 2; // 0-29, 0-58 (even numbers)
	var minute = time >> 5 & 0x3f; // 0-59
	var hour = time >> 11 & 0x1f; // 0-23

	return new Date(year, month, day, hour, minute, second, millisecond);
}

function validateFileName(fileName) {
	if (fileName.indexOf("\\") !== -1) {
		return "invalid characters in fileName: " + fileName;
	}
	if (/^[a-zA-Z]:/.test(fileName) || /^\//.test(fileName)) {
		return "absolute path: " + fileName;
	}
	if (fileName.split("/").indexOf("..") !== -1) {
		return "invalid relative path: " + fileName;
	}
	// all good
	return null;
}

function readAndAssertNoEof(reader, buffer, offset, length, position, callback) {
	if (length === 0) {
		// fs.read will throw an out-of-bounds error if you try to read 0 bytes from a 0 byte file
		return setImmediate(function () {
			callback(null, newBuffer(0));
		});
	}
	reader.read(buffer, offset, length, position, function (err, bytesRead) {
		if (err) return callback(err);
		if (bytesRead < length) {
			return callback(new Error("unexpected EOF"));
		}
		callback();
	});
}

util.inherits(AssertByteCountStream, Transform);

function AssertByteCountStream(byteCount) {
	Transform.call(this);
	this.actualByteCount = 0;
	this.expectedByteCount = byteCount;
}

AssertByteCountStream.prototype._transform = function (chunk, encoding, cb) {
	this.actualByteCount += chunk.length;
	if (this.actualByteCount > this.expectedByteCount) {
		var msg = "too many bytes in the stream. expected " + this.expectedByteCount + ". got at least " + this.actualByteCount;
		return cb(new Error(msg));
	}
	cb(null, chunk);
};
AssertByteCountStream.prototype._flush = function (cb) {
	if (this.actualByteCount < this.expectedByteCount) {
		var msg = "not enough bytes in the stream. expected " + this.expectedByteCount + ". got only " + this.actualByteCount;
		return cb(new Error(msg));
	}
	cb();
};

util.inherits(RandomAccessReader, EventEmitter);

function RandomAccessReader() {
	EventEmitter.call(this);
	this.refCount = 0;
}

RandomAccessReader.prototype.ref = function () {
	this.refCount += 1;
};
RandomAccessReader.prototype.unref = function () {
	var self = this;
	self.refCount -= 1;

	if (self.refCount > 0) return;
	if (self.refCount < 0) throw new Error("invalid unref");

	self.close(onCloseDone);

	function onCloseDone(err) {
		if (err) return self.emit('error', err);
		self.emit('close');
	}
};
RandomAccessReader.prototype.createReadStream = function (options) {
	var start = options.start;
	var end = options.end;
	if (start === end) {
		var emptyStream = new PassThrough();
		setImmediate(function () {
			emptyStream.end();
		});
		return emptyStream;
	}
	var stream = this._readStreamForRange(start, end);

	var destroyed = false;
	var refUnrefFilter = new RefUnrefFilter(this);
	stream.on("error", function (err) {
		setImmediate(function () {
			if (!destroyed) refUnrefFilter.emit("error", err);
		});
	});
	refUnrefFilter.destroy = function () {
		stream.unpipe(refUnrefFilter);
		refUnrefFilter.unref();
		stream.destroy();
	};

	var byteCounter = new AssertByteCountStream(end - start);
	refUnrefFilter.on("error", function (err) {
		setImmediate(function () {
			if (!destroyed) byteCounter.emit("error", err);
		});
	});
	byteCounter.destroy = function () {
		destroyed = true;
		refUnrefFilter.unpipe(byteCounter);
		refUnrefFilter.destroy();
	};

	return stream.pipe(refUnrefFilter).pipe(byteCounter);
};
RandomAccessReader.prototype._readStreamForRange = function (start, end) {
	throw new Error("not implemented");
};
RandomAccessReader.prototype.read = function (buffer, offset, length, position, callback) {
	var readStream = this.createReadStream({start: position, end: position + length});
	var writeStream = new Writable();
	var written = 0;
	writeStream._write = function (chunk, encoding, cb) {
		chunk.copy(buffer, offset + written, 0, chunk.length);
		written += chunk.length;
		cb();
	};
	writeStream.on("finish", callback);
	readStream.on("error", function (error) {
		callback(error);
	});
	readStream.pipe(writeStream);
};
RandomAccessReader.prototype.close = function (callback) {
	setImmediate(callback);
};

util.inherits(RefUnrefFilter, PassThrough);

function RefUnrefFilter(context) {
	PassThrough.call(this);
	this.context = context;
	this.context.ref();
	this.unreffedYet = false;
}

RefUnrefFilter.prototype._flush = function (cb) {
	this.unref();
	cb();
};
RefUnrefFilter.prototype.unref = function (cb) {
	if (this.unreffedYet) return;
	this.unreffedYet = true;
	this.context.unref();
};

var cp437 = '\u0000☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';

function decodeBuffer(buffer, start, end, isUtf8) {
	if (isUtf8) {
		return buffer.toString("utf8", start, end);
	} else {
		var result = "";
		for (var i = start; i < end; i++) {
			result += cp437[buffer[i]];
		}
		return result;
	}
}

function readUInt64LE(buffer, offset) {
	// there is no native function for this, because we can't actually store 64-bit integers precisely.
	// after 53 bits, JavaScript's Number type (IEEE 754 double) can't store individual integers anymore.
	// but since 53 bits is a whole lot more than 32 bits, we do our best anyway.
	var lower32 = buffer.readUInt32LE(offset);
	var upper32 = buffer.readUInt32LE(offset + 4);
	// we can't use bitshifting here, because JavaScript bitshifting only works on 32-bit integers.
	return upper32 * 0x100000000 + lower32;
	// as long as we're bounds checking the result of this function against the total file size,
	// we'll catch any overflow errors, because we already made sure the total file size was within reason.
}

// Node 10 deprecated new Buffer().
var newBuffer;
if (typeof Buffer.allocUnsafe === "function") {
	newBuffer = function (len) {
		return Buffer.allocUnsafe(len);
	};
} else {
	newBuffer = function (len) {
		return new Buffer(len);
	};
}

function defaultCallback(err) {
	if (err) throw err;
}

}).call(this,require("buffer").Buffer,require("timers").setImmediate)

},{"buffer":false,"buffer-crc32":"buffer-crc32","events":false,"fs":false,"node-fd-slicer":"node-fd-slicer","stream":false,"timers":false,"util":false,"zlib":false}],"yazl":[function(require,module,exports){
(function (Buffer,setImmediate){
var fs = require("fs");
var Transform = require("stream").Transform;
var PassThrough = require("stream").PassThrough;
var zlib = require("zlib");
var util = require("util");
var EventEmitter = require("events").EventEmitter;
var crc32 = require("buffer-crc32");

exports.ZipFile = ZipFile;
exports.dateToDosDateTime = dateToDosDateTime;

util.inherits(ZipFile, EventEmitter);

function ZipFile() {
	this.outputStream = new PassThrough();
	this.entries = [];
	this.outputStreamCursor = 0;
	this.ended = false; // .end() sets this
	this.allDone = false; // set when we've written the last bytes
	this.forceZip64Eocd = false; // configurable in .end()
}

ZipFile.prototype.addFile = function (realPath, metadataPath, options) {
	var self = this;
	metadataPath = validateMetadataPath(metadataPath, false);
	if (options == null) options = {};

	var entry = new Entry(metadataPath, false, options);
	self.entries.push(entry);
	fs.stat(realPath, function (err, stats) {
		if (err) return self.emit("error", err);
		if (!stats.isFile()) return self.emit("error", new Error("not a file: " + realPath));
		entry.uncompressedSize = stats.size;
		if (options.mtime == null) entry.setLastModDate(stats.mtime);
		if (options.mode == null) entry.setFileAttributesMode(stats.mode);
		entry.setFileDataPumpFunction(function () {
			var readStream = fs.createReadStream(realPath);
			entry.state = Entry.FILE_DATA_IN_PROGRESS;
			readStream.on("error", function (err) {
				self.emit("error", err);
			});
			pumpFileDataReadStream(self, entry, readStream);
		});
		pumpEntries(self);
	});
};

ZipFile.prototype.addReadStream = function (readStream, metadataPath, options) {
	var self = this;
	metadataPath = validateMetadataPath(metadataPath, false);
	if (options == null) options = {};
	var entry = new Entry(metadataPath, false, options);
	self.entries.push(entry);
	entry.setFileDataPumpFunction(function () {
		entry.state = Entry.FILE_DATA_IN_PROGRESS;
		pumpFileDataReadStream(self, entry, readStream);
	});
	pumpEntries(self);
};

ZipFile.prototype.addBuffer = function (buffer, metadataPath, options) {
	var self = this;
	metadataPath = validateMetadataPath(metadataPath, false);
	if (buffer.length > 0x3fffffff) throw new Error("buffer too large: " + buffer.length + " > " + 0x3fffffff);
	if (options == null) options = {};
	if (options.size != null) throw new Error("options.size not allowed");
	var entry = new Entry(metadataPath, false, options);
	entry.uncompressedSize = buffer.length;
	entry.crc32 = crc32.unsigned(buffer);
	entry.crcAndFileSizeKnown = true;
	self.entries.push(entry);
	if (!entry.compress) {
		setCompressedBuffer(buffer);
	} else {
		zlib.deflateRaw(buffer, function (err, compressedBuffer) {
			setCompressedBuffer(compressedBuffer);
			
		});
	}

	function setCompressedBuffer(compressedBuffer) {
		entry.compressedSize = compressedBuffer.length;
		entry.setFileDataPumpFunction(function () {
			writeToOutputStream(self, compressedBuffer);
			writeToOutputStream(self, entry.getDataDescriptor());
			entry.state = Entry.FILE_DATA_DONE;

			// don't call pumpEntries() recursively.
			// (also, don't call process.nextTick recursively.)
			setImmediate(function () {
				pumpEntries(self);
			});
		});
		pumpEntries(self);
	}
};


ZipFile.prototype.addEmptyDirectory = function (metadataPath, options) {
	var self = this;
	metadataPath = validateMetadataPath(metadataPath, true);
	if (options == null) options = {};
	if (options.size != null) throw new Error("options.size not allowed");
	if (options.compress != null) throw new Error("options.compress not allowed");
	var entry = new Entry(metadataPath, true, options);
	self.entries.push(entry);
	entry.setFileDataPumpFunction(function () {
		writeToOutputStream(self, entry.getDataDescriptor());
		entry.state = Entry.FILE_DATA_DONE;
		pumpEntries(self);
	});
	pumpEntries(self);
};

ZipFile.prototype.end = function (options, finalSizeCallback) {
	if (typeof options === "function") {
		finalSizeCallback = options;
		options = null;
	}
	if (options == null) options = {};
	if (this.ended) return;
	this.ended = true;
	this.finalSizeCallback = finalSizeCallback;
	this.forceZip64Eocd = !!options.forceZip64Format;
	pumpEntries(this);
};

function writeToOutputStream(self, buffer) {
	self.outputStream.write(buffer);
	self.outputStreamCursor += buffer.length;
}

function pumpFileDataReadStream(self, entry, readStream) {
	var crc32Watcher = new Crc32Watcher();
	var uncompressedSizeCounter = new ByteCounter();
	var compressor = entry.compress ? new zlib.DeflateRaw() : new PassThrough();
	var compressedSizeCounter = new ByteCounter();
	readStream.pipe(crc32Watcher)
		.pipe(uncompressedSizeCounter)
		.pipe(compressor)
		.pipe(compressedSizeCounter)
		.pipe(self.outputStream, {end: false});
	compressedSizeCounter.on("end", function () {
		entry.crc32 = crc32Watcher.crc32;
		if (entry.uncompressedSize == null) {
			entry.uncompressedSize = uncompressedSizeCounter.byteCount;
		} else {
			if (entry.uncompressedSize !== uncompressedSizeCounter.byteCount) return self.emit("error", new Error("file data stream has unexpected number of bytes"));
		}
		entry.compressedSize = compressedSizeCounter.byteCount;
		self.outputStreamCursor += entry.compressedSize;
		writeToOutputStream(self, entry.getDataDescriptor());
		entry.state = Entry.FILE_DATA_DONE;
		pumpEntries(self);
	});
}

function pumpEntries(self) {
	if (self.allDone) return;
	// first check if finalSize is finally known
	if (self.ended && self.finalSizeCallback != null) {
		var finalSize = calculateFinalSize(self);
		if (finalSize != null) {
			// we have an answer
			self.finalSizeCallback(finalSize);
			self.finalSizeCallback = null;
		}
	}

	// pump entries
	var entry = getFirstNotDoneEntry();

	function getFirstNotDoneEntry() {
		for (var i = 0; i < self.entries.length; i++) {
			var entry = self.entries[i];
			if (entry.state < Entry.FILE_DATA_DONE) return entry;
		}
		return null;
	}

	if (entry != null) {
		// this entry is not done yet
		if (entry.state < Entry.READY_TO_PUMP_FILE_DATA) return; // input file not open yet
		if (entry.state === Entry.FILE_DATA_IN_PROGRESS) return; // we'll get there
		// start with local file header
		entry.relativeOffsetOfLocalHeader = self.outputStreamCursor;
		var localFileHeader = entry.getLocalFileHeader();
		writeToOutputStream(self, localFileHeader);
		entry.doFileDataPump();
	} else {
		// all cought up on writing entries
		if (self.ended) {
			// head for the exit
			self.offsetOfStartOfCentralDirectory = self.outputStreamCursor;
			self.entries.forEach(function (entry) {
				var centralDirectoryRecord = entry.getCentralDirectoryRecord();
				writeToOutputStream(self, centralDirectoryRecord);
			});
			writeToOutputStream(self, getEndOfCentralDirectoryRecord(self));
			self.outputStream.end();
			self.allDone = true;
		}
	}
}

function calculateFinalSize(self) {
	var pretendOutputCursor = 0;
	var centralDirectorySize = 0;
	for (var i = 0; i < self.entries.length; i++) {
		var entry = self.entries[i];
		// compression is too hard to predict
		if (entry.compress) return -1;
		if (entry.state >= Entry.READY_TO_PUMP_FILE_DATA) {
			// if addReadStream was called without providing the size, we can't predict the final size
			if (entry.uncompressedSize == null) return -1;
		} else {
			// if we're still waiting for fs.stat, we might learn the size someday
			if (entry.uncompressedSize == null) return null;
		}
		// we know this for sure, and this is important to know if we need ZIP64 format.
		entry.relativeOffsetOfLocalHeader = pretendOutputCursor;
		var useZip64Format = entry.useZip64Format();

		pretendOutputCursor += LOCAL_FILE_HEADER_FIXED_SIZE + entry.utf8FileName.length;
		pretendOutputCursor += entry.uncompressedSize;
		if (!entry.crcAndFileSizeKnown) {
			// use a data descriptor
			if (useZip64Format) {
				pretendOutputCursor += ZIP64_DATA_DESCRIPTOR_SIZE;
			} else {
				pretendOutputCursor += DATA_DESCRIPTOR_SIZE;
			}
		}

		centralDirectorySize += CENTRAL_DIRECTORY_RECORD_FIXED_SIZE + entry.utf8FileName.length;
		if (useZip64Format) {
			centralDirectorySize += ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE;
		}
	}

	var endOfCentralDirectorySize = 0;
	if (self.forceZip64Eocd ||
		self.entries.length >= 0xffff ||
		centralDirectorySize >= 0xffff ||
		pretendOutputCursor >= 0xffffffff) {
		// use zip64 end of central directory stuff
		endOfCentralDirectorySize += ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE + ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE;
	}
	endOfCentralDirectorySize += END_OF_CENTRAL_DIRECTORY_RECORD_SIZE;
	return pretendOutputCursor + centralDirectorySize + endOfCentralDirectorySize;
}

var ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE = 56;
var ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE = 20;
var END_OF_CENTRAL_DIRECTORY_RECORD_SIZE = 22;

function getEndOfCentralDirectoryRecord(self, actuallyJustTellMeHowLongItWouldBe) {
	var needZip64Format = false;
	var normalEntriesLength = self.entries.length;
	if (self.forceZip64Eocd || self.entries.length >= 0xffff) {
		normalEntriesLength = 0xffff;
		needZip64Format = true;
	}
	var sizeOfCentralDirectory = self.outputStreamCursor - self.offsetOfStartOfCentralDirectory;
	var normalSizeOfCentralDirectory = sizeOfCentralDirectory;
	if (self.forceZip64Eocd || sizeOfCentralDirectory >= 0xffffffff) {
		normalSizeOfCentralDirectory = 0xffffffff;
		needZip64Format = true;
	}
	var normalOffsetOfStartOfCentralDirectory = self.offsetOfStartOfCentralDirectory;
	if (self.forceZip64Eocd || self.offsetOfStartOfCentralDirectory >= 0xffffffff) {
		normalOffsetOfStartOfCentralDirectory = 0xffffffff;
		needZip64Format = true;
	}
	if (actuallyJustTellMeHowLongItWouldBe) {
		if (needZip64Format) {
			return (
				ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE +
				ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE +
				END_OF_CENTRAL_DIRECTORY_RECORD_SIZE
			);
		} else {
			return END_OF_CENTRAL_DIRECTORY_RECORD_SIZE;
		}
	}

	var eocdrBuffer = new Buffer(END_OF_CENTRAL_DIRECTORY_RECORD_SIZE);
	// end of central dir signature                       4 bytes  (0x06054b50)
	eocdrBuffer.writeUInt32LE(0x06054b50, 0);
	// number of this disk                                2 bytes
	eocdrBuffer.writeUInt16LE(0, 4);
	// number of the disk with the start of the central directory  2 bytes
	eocdrBuffer.writeUInt16LE(0, 6);
	// total number of entries in the central directory on this disk  2 bytes
	eocdrBuffer.writeUInt16LE(normalEntriesLength, 8);
	// total number of entries in the central directory   2 bytes
	eocdrBuffer.writeUInt16LE(normalEntriesLength, 10);
	// size of the central directory                      4 bytes
	eocdrBuffer.writeUInt32LE(normalSizeOfCentralDirectory, 12);
	// offset of start of central directory with respect to the starting disk number  4 bytes
	eocdrBuffer.writeUInt32LE(normalOffsetOfStartOfCentralDirectory, 16);
	// .ZIP file comment length                           2 bytes
	eocdrBuffer.writeUInt16LE(0, 20);
	// .ZIP file comment                                  (variable size)
	// no comment

	if (!needZip64Format) return eocdrBuffer;

	// ZIP64 format
	// ZIP64 End of Central Directory Record
	var zip64EocdrBuffer = new Buffer(ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE);
	// zip64 end of central dir signature                                             4 bytes  (0x06064b50)
	zip64EocdrBuffer.writeUInt32LE(0x06064b50, 0);
	// size of zip64 end of central directory record                                  8 bytes
	writeUInt64LE(zip64EocdrBuffer, ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE - 12, 4);
	// version made by                                                                2 bytes
	zip64EocdrBuffer.writeUInt16LE(VERSION_MADE_BY, 12);
	// version needed to extract                                                      2 bytes
	zip64EocdrBuffer.writeUInt16LE(VERSION_NEEDED_TO_EXTRACT_ZIP64, 14);
	// number of this disk                                                            4 bytes
	zip64EocdrBuffer.writeUInt32LE(0, 16);
	// number of the disk with the start of the central directory                     4 bytes
	zip64EocdrBuffer.writeUInt32LE(0, 20);
	// total number of entries in the central directory on this disk                  8 bytes
	writeUInt64LE(zip64EocdrBuffer, self.entries.length, 24);
	// total number of entries in the central directory                               8 bytes
	writeUInt64LE(zip64EocdrBuffer, self.entries.length, 32);
	// size of the central directory                                                  8 bytes
	writeUInt64LE(zip64EocdrBuffer, sizeOfCentralDirectory, 40);
	// offset of start of central directory with respect to the starting disk number  8 bytes
	writeUInt64LE(zip64EocdrBuffer, self.offsetOfStartOfCentralDirectory, 48);
	// zip64 extensible data sector                                                   (variable size)
	// nothing in the zip64 extensible data sector


	// ZIP64 End of Central Directory Locator
	var zip64EocdlBuffer = new Buffer(ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE);
	// zip64 end of central dir locator signature                               4 bytes  (0x07064b50)
	zip64EocdlBuffer.writeUInt32LE(0x07064b50, 0);
	// number of the disk with the start of the zip64 end of central directory  4 bytes
	zip64EocdlBuffer.writeUInt32LE(0, 4);
	// relative offset of the zip64 end of central directory record             8 bytes
	writeUInt64LE(zip64EocdlBuffer, self.outputStreamCursor, 8);
	// total number of disks                                                    4 bytes
	zip64EocdlBuffer.writeUInt32LE(1, 16);


	return Buffer.concat([
		zip64EocdrBuffer,
		zip64EocdlBuffer,
		eocdrBuffer,
	]);
}

function validateMetadataPath(metadataPath, isDirectory) {
	if (metadataPath === "") throw new Error("empty metadataPath");
	metadataPath = metadataPath.replace(/\\/g, "/");
	if (/^[a-zA-Z]:/.test(metadataPath) || /^\//.test(metadataPath)) throw new Error("absolute path: " + metadataPath);
	if (metadataPath.split("/").indexOf("..") !== -1) throw new Error("invalid relative path: " + metadataPath);
	var looksLikeDirectory = /\/$/.test(metadataPath);
	if (isDirectory) {
		// append a trailing '/' if necessary.
		if (!looksLikeDirectory) metadataPath += "/";
	} else {
		if (looksLikeDirectory) throw new Error("file path cannot end with '/': " + metadataPath);
	}
	return metadataPath;
}

var defaultFileMode = parseInt("0100664", 8);
var defaultDirectoryMode = parseInt("040775", 8);

// this class is not part of the public API
function Entry(metadataPath, isDirectory, options) {
	this.utf8FileName = new Buffer(metadataPath);
	if (this.utf8FileName.length > 0xffff) throw new Error("utf8 file name too long. " + utf8FileName.length + " > " + 0xffff);
	this.isDirectory = isDirectory;
	this.state = Entry.WAITING_FOR_METADATA;
	this.setLastModDate(options.mtime != null ? options.mtime : new Date());
	if (options.mode != null) {
		this.setFileAttributesMode(options.mode);
	} else {
		this.setFileAttributesMode(isDirectory ? defaultDirectoryMode : defaultFileMode);
	}
	if (isDirectory) {
		this.crcAndFileSizeKnown = true;
		this.crc32 = 0;
		this.uncompressedSize = 0;
		this.compressedSize = 0;
	} else {
		// unknown so far
		this.crcAndFileSizeKnown = false;
		this.crc32 = null;
		this.uncompressedSize = null;
		this.compressedSize = null;
		if (options.size != null) this.uncompressedSize = options.size;
	}
	if (isDirectory) {
		this.compress = false;
	} else {
		this.compress = true; // default
		if (options.compress != null) this.compress = !!options.compress;
	}
	this.forceZip64Format = !!options.forceZip64Format;
}

Entry.WAITING_FOR_METADATA = 0;
Entry.READY_TO_PUMP_FILE_DATA = 1;
Entry.FILE_DATA_IN_PROGRESS = 2;
Entry.FILE_DATA_DONE = 3;
Entry.prototype.setLastModDate = function (date) {
	var dosDateTime = dateToDosDateTime(date);
	this.lastModFileTime = dosDateTime.time;
	this.lastModFileDate = dosDateTime.date;
};
Entry.prototype.setFileAttributesMode = function (mode) {
	if ((mode & 0xffff) !== mode) throw new Error("invalid mode. expected: 0 <= " + mode + " <= " + 0xffff);
	// http://unix.stackexchange.com/questions/14705/the-zip-formats-external-file-attribute/14727#14727
	this.externalFileAttributes = (mode << 16) >>> 0;
};
// doFileDataPump() should not call pumpEntries() directly. see issue #9.
Entry.prototype.setFileDataPumpFunction = function (doFileDataPump) {
	this.doFileDataPump = doFileDataPump;
	this.state = Entry.READY_TO_PUMP_FILE_DATA;
};
Entry.prototype.useZip64Format = function () {
	return (
		(this.forceZip64Format) ||
		(this.uncompressedSize != null && this.uncompressedSize > 0xfffffffe) ||
		(this.compressedSize != null && this.compressedSize > 0xfffffffe) ||
		(this.relativeOffsetOfLocalHeader != null && this.relativeOffsetOfLocalHeader > 0xfffffffe)
	);
}
var LOCAL_FILE_HEADER_FIXED_SIZE = 30;
var VERSION_NEEDED_TO_EXTRACT_UTF8 = 20;
var VERSION_NEEDED_TO_EXTRACT_ZIP64 = 45;
// 3 = unix. 63 = spec version 6.3
var VERSION_MADE_BY = (3 << 8) | 63;
var FILE_NAME_IS_UTF8 = 1 << 11;
var UNKNOWN_CRC32_AND_FILE_SIZES = 1 << 3;
Entry.prototype.getLocalFileHeader = function () {
	var crc32 = 0;
	var compressedSize = 0;
	var uncompressedSize = 0;
	if (this.crcAndFileSizeKnown) {
		crc32 = this.crc32;
		compressedSize = this.compressedSize;
		uncompressedSize = this.uncompressedSize;
	}

	var fixedSizeStuff = new Buffer(LOCAL_FILE_HEADER_FIXED_SIZE);
	var generalPurposeBitFlag = FILE_NAME_IS_UTF8;
	if (!this.crcAndFileSizeKnown) generalPurposeBitFlag |= UNKNOWN_CRC32_AND_FILE_SIZES;

	// local file header signature     4 bytes  (0x04034b50)
	fixedSizeStuff.writeUInt32LE(0x04034b50, 0);
	// version needed to extract       2 bytes
	fixedSizeStuff.writeUInt16LE(VERSION_NEEDED_TO_EXTRACT_UTF8, 4);
	// general purpose bit flag        2 bytes
	fixedSizeStuff.writeUInt16LE(generalPurposeBitFlag, 6);
	// compression method              2 bytes
	fixedSizeStuff.writeUInt16LE(this.getCompressionMethod(), 8);
	// last mod file time              2 bytes
	fixedSizeStuff.writeUInt16LE(this.lastModFileTime, 10);
	// last mod file date              2 bytes
	fixedSizeStuff.writeUInt16LE(this.lastModFileDate, 12);
	// crc-32                          4 bytes
	fixedSizeStuff.writeUInt32LE(crc32, 14);
	// compressed size                 4 bytes
	fixedSizeStuff.writeUInt32LE(compressedSize, 18);
	// uncompressed size               4 bytes
	fixedSizeStuff.writeUInt32LE(uncompressedSize, 22);
	// file name length                2 bytes
	fixedSizeStuff.writeUInt16LE(this.utf8FileName.length, 26);
	// extra field length              2 bytes
	fixedSizeStuff.writeUInt16LE(0, 28);
	return Buffer.concat([
		fixedSizeStuff,
		// file name (variable size)
		this.utf8FileName,
		// extra field (variable size)
		// no extra fields
	]);
};
var DATA_DESCRIPTOR_SIZE = 16;
var ZIP64_DATA_DESCRIPTOR_SIZE = 24;
Entry.prototype.getDataDescriptor = function () {
	if (this.crcAndFileSizeKnown) {
		// the Mac Archive Utility requires this not be present unless we set general purpose bit 3
		return new Buffer(0);
	}
	if (!this.useZip64Format()) {
		var buffer = new Buffer(DATA_DESCRIPTOR_SIZE);
		// optional signature (required according to Archive Utility)
		buffer.writeUInt32LE(0x08074b50, 0);
		// crc-32                          4 bytes
		buffer.writeUInt32LE(this.crc32, 4);
		// compressed size                 4 bytes
		buffer.writeUInt32LE(this.compressedSize, 8);
		// uncompressed size               4 bytes
		buffer.writeUInt32LE(this.uncompressedSize, 12);
		return buffer;
	} else {
		// ZIP64 format
		var buffer = new Buffer(ZIP64_DATA_DESCRIPTOR_SIZE);
		// optional signature (unknown if anyone cares about this)
		buffer.writeUInt32LE(0x08074b50, 0);
		// crc-32                          4 bytes
		buffer.writeUInt32LE(this.crc32, 4);
		// compressed size                 8 bytes
		writeUInt64LE(buffer, this.compressedSize, 8);
		// uncompressed size               8 bytes
		writeUInt64LE(buffer, this.uncompressedSize, 16);
		return buffer;
	}
};
var CENTRAL_DIRECTORY_RECORD_FIXED_SIZE = 46;
var ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE = 28;
Entry.prototype.getCentralDirectoryRecord = function () {
	var fixedSizeStuff = new Buffer(CENTRAL_DIRECTORY_RECORD_FIXED_SIZE);
	var generalPurposeBitFlag = FILE_NAME_IS_UTF8;
	if (!this.crcAndFileSizeKnown) generalPurposeBitFlag |= UNKNOWN_CRC32_AND_FILE_SIZES;

	var normalCompressedSize = this.compressedSize;
	var normalUncompressedSize = this.uncompressedSize;
	var normalRelativeOffsetOfLocalHeader = this.relativeOffsetOfLocalHeader;
	var versionNeededToExtract;
	var zeiefBuffer;
	if (this.useZip64Format()) {
		normalCompressedSize = 0xffffffff;
		normalUncompressedSize = 0xffffffff;
		normalRelativeOffsetOfLocalHeader = 0xffffffff;
		versionNeededToExtract = VERSION_NEEDED_TO_EXTRACT_ZIP64;

		// ZIP64 extended information extra field
		zeiefBuffer = new Buffer(ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE);
		// 0x0001                  2 bytes    Tag for this "extra" block type
		zeiefBuffer.writeUInt16LE(0x0001, 0);
		// Size                    2 bytes    Size of this "extra" block
		zeiefBuffer.writeUInt16LE(ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE - 4, 2);
		// Original Size           8 bytes    Original uncompressed file size
		writeUInt64LE(zeiefBuffer, this.uncompressedSize, 4);
		// Compressed Size         8 bytes    Size of compressed data
		writeUInt64LE(zeiefBuffer, this.compressedSize, 12);
		// Relative Header Offset  8 bytes    Offset of local header record
		writeUInt64LE(zeiefBuffer, this.relativeOffsetOfLocalHeader, 20);
		// Disk Start Number       4 bytes    Number of the disk on which this file starts
		// (omit)
	} else {
		versionNeededToExtract = VERSION_NEEDED_TO_EXTRACT_UTF8;
		zeiefBuffer = new Buffer(0);
	}

	// central file header signature   4 bytes  (0x02014b50)
	fixedSizeStuff.writeUInt32LE(0x02014b50, 0);
	// version made by                 2 bytes
	fixedSizeStuff.writeUInt16LE(VERSION_MADE_BY, 4);
	// version needed to extract       2 bytes
	fixedSizeStuff.writeUInt16LE(versionNeededToExtract, 6);
	// general purpose bit flag        2 bytes
	fixedSizeStuff.writeUInt16LE(generalPurposeBitFlag, 8);
	// compression method              2 bytes
	fixedSizeStuff.writeUInt16LE(this.getCompressionMethod(), 10);
	// last mod file time              2 bytes
	fixedSizeStuff.writeUInt16LE(this.lastModFileTime, 12);
	// last mod file date              2 bytes
	fixedSizeStuff.writeUInt16LE(this.lastModFileDate, 14);
	// crc-32                          4 bytes
	fixedSizeStuff.writeUInt32LE(this.crc32, 16);
	// compressed size                 4 bytes
	fixedSizeStuff.writeUInt32LE(normalCompressedSize, 20);
	// uncompressed size               4 bytes
	fixedSizeStuff.writeUInt32LE(normalUncompressedSize, 24);
	// file name length                2 bytes
	fixedSizeStuff.writeUInt16LE(this.utf8FileName.length, 28);
	// extra field length              2 bytes
	fixedSizeStuff.writeUInt16LE(zeiefBuffer.length, 30);
	// file comment length             2 bytes
	fixedSizeStuff.writeUInt16LE(0, 32);
	// disk number start               2 bytes
	fixedSizeStuff.writeUInt16LE(0, 34);
	// internal file attributes        2 bytes
	fixedSizeStuff.writeUInt16LE(0, 36);
	// external file attributes        4 bytes
	fixedSizeStuff.writeUInt32LE(this.externalFileAttributes, 38);
	// relative offset of local header 4 bytes
	fixedSizeStuff.writeUInt32LE(normalRelativeOffsetOfLocalHeader, 42);

	return Buffer.concat([
		fixedSizeStuff,
		// file name (variable size)
		this.utf8FileName,
		// extra field (variable size)
		zeiefBuffer,
		// file comment (variable size)
		// empty comment
	]);
};
Entry.prototype.getCompressionMethod = function () {
	var NO_COMPRESSION = 0;
	var DEFLATE_COMPRESSION = 8;
	return this.compress ? DEFLATE_COMPRESSION : NO_COMPRESSION;
};

function dateToDosDateTime(jsDate) {
	var date = 0;
	date |= jsDate.getDate() & 0x1f; // 1-31
	date |= ((jsDate.getMonth() + 1) & 0xf) << 5; // 0-11, 1-12
	date |= ((jsDate.getFullYear() - 1980) & 0x7f) << 9; // 0-128, 1980-2108

	var time = 0;
	time |= Math.floor(jsDate.getSeconds() / 2); // 0-59, 0-29 (lose odd numbers)
	time |= (jsDate.getMinutes() & 0x3f) << 5; // 0-59
	time |= (jsDate.getHours() & 0x1f) << 11; // 0-23

	return {date: date, time: time};
}

function writeUInt64LE(buffer, n, offset) {
	// can't use bitshift here, because JavaScript only allows bitshiting on 32-bit integers.
	var high = Math.floor(n / 0x100000000);
	var low = n % 0x100000000;
	buffer.writeUInt32LE(low, offset);
	buffer.writeUInt32LE(high, offset + 4);
}

function defaultCallback(err) {
	if (err) throw err;
}

util.inherits(ByteCounter, Transform);

function ByteCounter(options) {
	Transform.call(this, options);
	this.byteCount = 0;
}

ByteCounter.prototype._transform = function (chunk, encoding, cb) {
	this.byteCount += chunk.length;
	cb(null, chunk);
};

util.inherits(Crc32Watcher, Transform);

function Crc32Watcher(options) {
	Transform.call(this, options);
	this.crc32 = 0;
}

Crc32Watcher.prototype._transform = function (chunk, encoding, cb) {
	this.crc32 = crc32.unsigned(chunk, this.crc32);
	cb(null, chunk);
};
}).call(this,require("buffer").Buffer,require("timers").setImmediate)

},{"buffer":false,"buffer-crc32":"buffer-crc32","events":false,"fs":false,"stream":false,"timers":false,"util":false,"zlib":false}],"zmq_adapter":[function(require,module,exports){
(function (Buffer){
const defaultForwardAddress = process.env.vmq_zeromq_forward_address || "tcp://127.0.0.1:5001";
const defaultSubAddress = process.env.vmq_zeromq_sub_address || "tcp://127.0.0.1:5000";
const defaultPubAddress = process.env.vmq_zeromq_pub_address || "tcp://127.0.0.1:5001";

let zmq = require("zeromq");

function registerKiller(children){
    const events = ["SIGINT", "SIGUSR1", "SIGUSR2", "uncaughtException", "SIGTERM", "SIGHUP"];

    events.forEach(function(event){
        process.on(event, function(...args){
            children.forEach(function(child){
                console.log("Something bad happened.", event, ...args);
                try{
                    child.close();
                }catch(err){
                    //..
                    console.log(err);
                }
            });
        });
    });
}

function ZeromqForwarder(bindAddress){

    let socket = zmq.socket("pub");
    let initialized = false;

    function connect(){
        socket.monitor();
        socket.connect(bindAddress);

        socket.on("connect",(fd)=>{
            console.log(`[Forwarder] connected on ${bindAddress}`);
            initialized = true;
            sendBuffered();
        });
    }

    connect();

    registerKiller([socket]);

    const Queue = require("swarmutils").Queue;
    let buffered = new Queue();

    let sendBuffered = ()=>{
        while(buffered.length>0){
            this.send(...buffered.pop());
        }
    };

    this.send = function(channel, ...args){
        if(initialized){
            //console.log("[Forwarder] Putting message on socket", args);
            socket.send([channel, ...args], undefined, (...args)=>{
                //console.log("[Forwarder] message sent");
            });
        }else{
            //console.log("[Forwarder] Saving it for later");
            buffered.push([channel, ...args]);
        }
    }
}

function ZeromqProxyNode(subAddress, pubAddress, signatureChecker){

    const publishersNode = zmq.createSocket('xsub');
    const subscribersNode = zmq.createSocket('xpub');

    // By default xpub only signals new subscriptions
    // Settings it to verbose = 1 , will signal on every new subscribe
    // uncomment next lines if messages are lost
    subscribersNode.setsockopt(zmq.ZMQ_XPUB_VERBOSE, 1);

    publishersNode.on('message', deliverMessage);

    function deliverMessage(channel, message){
        //console.log(`[Proxy] - Received message on channel ${channel.toString()}`);
        let ch = channelTranslationDictionary[channel.toString()];
        if(ch){
            //console.log("[Proxy] - Sending message on channel", ch);
            subscribersNode.send([Buffer.from(ch), message]);
        }else{
            //console.log(`[Proxy] - message dropped!`);
        }
        //subscribersNode.send([channel, message]);
    }

    let channelTranslationDictionary = {};

    subscribersNode.on('message', manageSubscriptions);

    function manageSubscriptions(subscription){
        //console.log("[Proxy] - manage message", subscription.toString());

        let message = subscription.toString();
        let type = subscription[0];
        message = message.substr(1);

        //console.log(`[Proxy] - Trying to send ${type==1?"subscribe":"unsubscribe"} type of message`);

        if(typeof signatureChecker === "undefined"){
            //console.log("[Proxy] - No signature checker defined then transparent proxy...", subscription);
            publishersNode.send(subscription);
            return;
        }

        try{
            //console.log("[Proxy] - let's deserialize and start analize");
            let deserializedData = JSON.parse(message);
            //TODO: check deserializedData.signature
            //console.log("[Proxy] - Start checking message signature");
            signatureChecker(deserializedData.channelName, deserializedData.signature, (err, res)=>{
                if(err){
                    //...
                    //console.log("Err", err);
                }else{
                    let newSub = Buffer.alloc(deserializedData.channelName.length+1);
                    let ch = Buffer.from(deserializedData.channelName);
                    if(type===1){
                        newSub.write("01", 0, 1, "hex");
                    }else{
                        newSub.write("00", 0, 1, "hex");
                    }

                    ch.copy(newSub, 1);
                    //console.log("[Proxy] - sending subscription", /*"\n\t\t", subscription.toString('hex'), "\n\t\t", newSub.toString('hex'),*/ newSub);
                    channelTranslationDictionary[deserializedData.channelName] = message;
                    publishersNode.send(newSub);
                    return;
                }
            });
        }catch(err){
            if(message.toString()!==""){
                //console.log("Something went wrong. Subscription will not be made.", err);
            }
        }
    }

    try{
        publishersNode.bindSync(pubAddress);
        subscribersNode.bindSync(subAddress);
        console.log(`\nStarting ZeroMQ proxy on [subs:${subAddress}] [pubs:${pubAddress}]\n`);
    }catch(err){
        console.log("Caught error on binding", err);
        throw new Error("No zeromq!!!");
    }

    registerKiller([publishersNode, subscribersNode]);
}

function ZeromqConsumer(bindAddress, monitorFunction){

    let socket = zmq.socket("sub");

    if(typeof monitorFunction === "function"){
        let events = ["connect", "connect_delay", "connect_retry", "listen", "bind_error", "accept", "accept_error", "close", "close_error", "disconnect"];
        socket.monitor();
        events.forEach((eventType)=>{
            socket.on(eventType, (...args)=>{
                monitorFunction(eventType, ...args);
            });
        });
    }

    function connect(callback){
        socket.connect(bindAddress);
        socket.on("connect", callback);
    }

    let subscriptions = {};
    let connected = false;

    this.subscribe = function(channelName, signature, callback){
        let subscription = JSON.stringify({channelName, signature:signature});
        if(!subscriptions[subscription]){
            subscriptions[subscription] = [];
        }

        subscriptions[subscription].push(callback);

        if(!connected){
            connect(()=>{
                connected = true;
                for(var subscription in subscriptions){
                    socket.subscribe(subscription);
                }
            });
        }else{
            socket.subscribe(subscription);
        }
    };

    this.close = function(){
        socket.close();
    };

    socket.on("message", (channel, receivedMessage)=>{
       let callbacks = subscriptions[channel];
       if(!callbacks || callbacks.length === 0){
           return console.log(`No subscriptions found for channel ${channel}. Message dropped!`);
       }
       for(let i = 0; i<callbacks.length; i++){
           let cb = callbacks[i];
           cb(channel, receivedMessage);
       }
    });
}

let instance;
module.exports.getForwarderInstance = function(address){
    if(!instance){
        address = address || defaultForwardAddress;
        instance = new ZeromqForwarder(address);
    }
    return instance;
};

module.exports.createZeromqProxyNode = function(subAddress, pubAddress, signatureChecker){
    subAddress = subAddress || defaultSubAddress;
    pubAddress = pubAddress || defaultPubAddress;
    return new ZeromqProxyNode(subAddress, pubAddress, signatureChecker);
};

module.exports.createZeromqConsumer = function(bindAddress, monitorFunction){
    return new ZeromqConsumer(bindAddress, monitorFunction);
};

module.exports.registerKiller = registerKiller;
}).call(this,require("buffer").Buffer)

},{"buffer":false,"swarmutils":false,"zeromq":false}]},{},["/opt/new_swarm_engine_release/privatesky/builds/tmp/virtualMQ_intermediar.js"])
//# sourceMappingURL=virtualMQ.js.map