consoleToolsRequire=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/home/cosmin/Workspace/reorganizing/privatesky/builds/tmp/consoleTools_intermediar.js":[function(require,module,exports){
(function (global){
global.consoleToolsLoadModules = function(){ 
	$$.__runtimeModules["yazl"] = require("yazl");
	$$.__runtimeModules["yauzl"] = require("yauzl");
	$$.__runtimeModules["psk-http-client"] = require("psk-http-client");
	$$.__runtimeModules["pskwallet"] = require("pskwallet");
	$$.__runtimeModules["pskdb"] = require("pskdb");
	$$.__runtimeModules["interact"] = require("interact");
	$$.__runtimeModules["foldermq"] = require("foldermq");
	$$.__runtimeModules["signsensus"] = require("signsensus");
	$$.__runtimeModules["buffer-crc32"] = require("buffer-crc32");
	$$.__runtimeModules["node-fd-slicer"] = require("node-fd-slicer");
	$$.__runtimeModules["csb-wizard"] = require("csb-wizard");
}
if (false) {
	consoleToolsLoadModules();
}; 
global.consoleToolsRequire = require;
if (typeof $$ !== "undefined") {            
    $$.requireBundle("consoleTools");
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"buffer-crc32":"buffer-crc32","csb-wizard":"csb-wizard","foldermq":"foldermq","interact":"interact","node-fd-slicer":"node-fd-slicer","psk-http-client":"psk-http-client","pskdb":"pskdb","pskwallet":"pskwallet","signsensus":"signsensus","yauzl":"yauzl","yazl":"yazl"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/csb-wizard/CSBWizard.js":[function(require,module,exports){
(function (__dirname){
const path = require('path');
const fs = require('fs');
const VirtualMQ = require('virtualmq');
const httpWrapper = VirtualMQ.getHttpWrapper();
const httpUtils = httpWrapper.httpUtils;
const Server = httpWrapper.Server;
const crypto = require('pskcrypto');
const interact = require('interact');
const serverCommands = require('./utils/serverCommands');
const executioner = require('./utils/executioner');
const url = require('url');

function CSBWizard({listeningPort, rootFolder, sslConfig}, callback) {
	const port = listeningPort || 8081;
	const server = new Server(sslConfig).listen(port);
	const randSize = 32;
	rootFolder = path.join(rootFolder, 'CSB_TMP');

	console.log("Listening on port:", port);

	fs.mkdir(rootFolder, {recursive: true}, (err) => {
		if(err && err.code !== "EEXIST") {
			throw err;
		}

		console.log("Local folder:", rootFolder);
		registerEndpoints();
		if(typeof callback === 'function') {
			return callback();
		}
	});

	function registerEndpoints() {
		server.use((req, res, next) => {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Origin');
			res.setHeader('Access-Control-Allow-Credentials', true);
			next();
		});

		server.post('/beginCSB', (req, res) => {
			const transactionId = crypto.randomBytes(randSize).toString('hex');
			fs.mkdir(path.join(rootFolder, transactionId), {recursive: true}, (err) => {
				if (err) {
					res.statusCode = 500;
					res.end();
					return;
				}

				res.end(transactionId);
			});
		});

		server.post('/attachFile', (req, res) => {
			res.statusCode = 400;
			res.end('Illegal url, missing transaction id');
		});

		server.post('/attachFile/:transactionId/:fileAlias', (req, res) => {
			const transactionId = req.params.transactionId;
			const fileObj = {
				fileName: req.params.fileAlias,
				stream: req
			};

			serverCommands.attachFile(path.join(rootFolder, transactionId), fileObj, (err) => {
				if(err) {
					if(err.code === 'EEXIST') {
						res.statusCode = 409;
					} else {
						res.statusCode = 500;
					}
				}

				res.end();
			});
		});

		server.post('/addBackup', (req, res) => {
			res.statusCode = 400;
			res.end('Illegal url, missing transaction id');
		});

		server.post('/addBackup/:transactionId', httpUtils.bodyParser);

		server.post('/addBackup/:transactionId', (req, res) => {
			const transactionId = req.params.transactionId;

			const backupObj = {
				endpoint: req.body
			};

			serverCommands.addBackup(path.join(rootFolder, transactionId), backupObj, (err) => {
				if(err) {
					res.statusCode = 500;
				}

				res.end();
			});
		});

		server.post('/buildCSB', (req, res) => {
			res.statusCode = 400;
			res.end('Illegal url, missing transaction id');
		});
		server.post('/buildCSB/:transactionId', httpUtils.bodyParser);
		server.post('/buildCSB/:transactionId', (req, res) => {
			const transactionId = req.params.transactionId;
			executioner.executioner(path.join(rootFolder, transactionId), (err, seed) => {
				if(err) {
					res.statusCode = 500;
					console.log("Error", err);
					res.end();
					return;
				}

				if(req.body){
					const body = JSON.parse(req.body);
					const endpoint = new url.URL(body.url).origin;
					const channel = body.channel;
					const ris = interact.createRemoteInteractionSpace('remote', endpoint, channel);
					ris.startSwarm('notifier', 'init', seed.toString());
					res.end(seed.toString());
				}else {
					res.end(seed.toString());
				}
			});
		});

		server.use('/web', (req, res) => {
			res.statusCode = 303;
			let redirectLocation = 'index.html';

			if(!req.url.endsWith('/')) {
				redirectLocation = '/web/' + redirectLocation;
			}

			res.setHeader("Location", redirectLocation);
			res.end();
		});

		server.use('/web/*', httpUtils.serveStaticFile(path.join(__dirname, 'web'), '/web'));

		server.use((req, res) => {
			res.statusCode = 404;
			res.end();
		});
	}
}

module.exports = CSBWizard;

}).call(this,"/modules/csb-wizard")

},{"./utils/executioner":"/home/cosmin/Workspace/reorganizing/privatesky/modules/csb-wizard/utils/executioner.js","./utils/serverCommands":"/home/cosmin/Workspace/reorganizing/privatesky/modules/csb-wizard/utils/serverCommands.js","fs":false,"interact":"interact","path":false,"pskcrypto":false,"url":false,"virtualmq":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/csb-wizard/utils/CommandsAssistant.js":[function(require,module,exports){
const fs = require('fs');
const path = require('path');

function CommandsAssistant(localFolder) {

	const filePath = path.join(localFolder, 'commands.json');

	function loadCommands(callback) {
		$$.ensureFolderExists(localFolder, (err) => {
			if (err) {
				return callback(err);
			}

			fs.readFile(filePath, (err, commands) => {
				if (err) {
					return callback(undefined, []);
				}

				callback(undefined, JSON.parse(commands.toString()));
			});
		});
	}

	function saveCommands(commandsArr, callback) {
		$$.ensureFolderExists(localFolder, (err) => {
			if (err) {
				return callback(err);
			}

			fs.writeFile(filePath, JSON.stringify(commandsArr), callback);
		});
	}

	function addCommand(command, callback) {
		loadCommands((err, commandsArr) => {
			if (err) {
				return callback(err);
			}

			commandsArr.push(command);

			saveCommands(commandsArr, callback);
		});
	}

	return {
		addCommand,
		loadCommands
	};
}

module.exports = CommandsAssistant;

},{"fs":false,"path":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/csb-wizard/utils/csbInteractions.js":[function(require,module,exports){
const path = require('path');
$$.loadLibrary("flows", require("../../pskwallet/libraries/flows"));
const is = require("interact").createInteractionSpace();


function createCSB(workingDir, backups, callback) {
    let savedSeed;
    is.startSwarm("createCsb", "withoutPin", "", backups, workingDir, undefined, false).on({
        printSensitiveInfo: function (seed, defaultPin) {
            savedSeed = seed;
        },
        handleError: function (err) {
            callback(err);
        },
        __return__: function () {
            callback(undefined, savedSeed);
        }
    });
}

function attachFile(workingDir, fileName, seed, callback) {
    is.startSwarm("attachFile", "withCSBIdentifier", seed, fileName, path.join(workingDir, fileName), workingDir).on({
        handleError: function (err) {
            callback(err);
        },

        __return__: function () {
            callback();
        }
    });
}

function saveBackup(workingDir, seed, callback) {
    is.startSwarm("saveBackup", "withCSBIdentifier", seed, workingDir).on({
        handleError: function (err) {
            callback(err);
        },

        csbBackupReport: function (result) {
            callback(result.errors, result.successes);
        }
    });
}

module.exports = {
    attachFile,
    createCSB,
    saveBackup
};

},{"../../pskwallet/libraries/flows":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/index.js","interact":"interact","path":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/csb-wizard/utils/executioner.js":[function(require,module,exports){
const csbInteraction = require('./csbInteractions');
const CommandsAssistant = require('./CommandsAssistant');

function executioner(workingDir, callback) {
    const filteredCommands = [];
    const backups = [];

    const commandsAssistant = new CommandsAssistant(workingDir);
    commandsAssistant.loadCommands((err, commands) => {
        if (err) {
            console.log();
        }
        for (let i = 0; i < commands.length; ++i) {
            if (commands[i].name === 'addBackup') {
                backups.push(commands[i].params.endpoint);
                continue;
            }

            filteredCommands.push(commands[i]);
        }


        csbInteraction.createCSB(workingDir, backups, (err, seed) => {
            if (err) {
                return callback(err);
            }

            executeCommand(filteredCommands, seed, workingDir, 0, (err) => {
                if (err) {
                    return callback(err);
                }

                csbInteraction.saveBackup(workingDir, seed, (errors, successes) => {
                    if (errors) {
                        return callback(errors);
                    }

                    callback(undefined, seed);
                });
            });
        });
    });
}

function executeCommand(commands, seed, workingDir, index = 0, callback) {
    if (index === commands.length) {
        return callback();
    }

    const match = judge(commands[index], seed, workingDir, (err) => {
        if (err) {
            return callback(err);
        }

        executeCommand(commands, seed, workingDir, ++index, callback);
    });

    if (!match) {
        return callback(new Error('No match for command found' + commands[index].name));
    }
}

function judge(command, seed, workingDir, callback) {
    switch (command.name) {
        case 'attachFile':
            csbInteraction.attachFile(workingDir, command.params.fileName, seed, callback);
            break;
        default:
            return false;
    }

    return true;
}

module.exports = {
    executioner
};

},{"./CommandsAssistant":"/home/cosmin/Workspace/reorganizing/privatesky/modules/csb-wizard/utils/CommandsAssistant.js","./csbInteractions":"/home/cosmin/Workspace/reorganizing/privatesky/modules/csb-wizard/utils/csbInteractions.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/csb-wizard/utils/serverCommands.js":[function(require,module,exports){
const fs = require("fs");
const path = require("path");
const url = require('url');

const CommandsAssistant = require("./CommandsAssistant");

function attachFile(workingDir, FileObj, callback) {
	const cmd = {
		name: 'attachFile',
		params: {
			fileName: FileObj.fileName
		}
	};

	const commandsAssistant = new CommandsAssistant(workingDir);
	const filePath = path.join(workingDir, FileObj.fileName);
	fs.access(filePath, (err) => {
		if (!err) {
			const e = new Error('File already exists');
			e.code = 'EEXIST';
			return callback(e);
		}

		const file = fs.createWriteStream(filePath);

		file.on('close', () => {
			commandsAssistant.addCommand(cmd, callback);
		});

		FileObj.stream.pipe(file);
	});
}

function addBackup(workingDir, backupObj, callback) {
	try {
		const endpoint = new url.URL(backupObj.endpoint).origin;

		const cmd = {
			name: 'addBackup',
			params: {
				endpoint: endpoint
			}
		};

		const commandAssistant = new CommandsAssistant(workingDir);
		commandAssistant.addCommand(cmd, callback);
	} catch (e) {
		return callback(e);
	}
}

module.exports = {
	attachFile,
	addBackup
};

},{"./CommandsAssistant":"/home/cosmin/Workspace/reorganizing/privatesky/modules/csb-wizard/utils/CommandsAssistant.js","fs":false,"path":false,"url":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/foldermq/lib/folderMQ.js":[function(require,module,exports){
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

},{"fs":false,"path":false,"swarmutils":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/SoundPubSubMQBasedInteractionSpace.js":[function(require,module,exports){
function MemoryMQInteractionSpace() {
    var swarmInteract = require("./../swarmInteraction");
    var swarmHandlersSubscribers = {};

    function dispatchingSwarms(swarm){
		setTimeout(function(){
            var subsList = swarmHandlersSubscribers[swarm.meta.swarmId];
            if(subsList){
                for(var i=0; i<subsList.length; i++){
                    var handler = subsList[i];
                    handler(null, swarm);
                }
            }
        }, 1);
    }

    var initialized = false;
    function init(){
		if(!initialized){
			initialized = true;
			$$.PSK_PubSub.subscribe($$.CONSTANTS.SWARM_FOR_EXECUTION, dispatchingSwarms);
		}
    }

    var comm = {
        startSwarm: function (swarmName, ctor, args) {
			init();
            return $$.swarm.start(swarmName, ctor, ...args);
        },
        continueSwarm: function (swarmHandler, swarmSerialisation, ctor, args) {
			init();
            swarmHandler[ctor].apply(swarmHandler, args);
        },
        on: function (swarmHandler, callback) {
			init();
            if(!swarmHandlersSubscribers[swarmHandler.getInnerValue().meta.swarmId]){
				swarmHandlersSubscribers[swarmHandler.getInnerValue().meta.swarmId] = [ callback ];
            }else{
				swarmHandlersSubscribers[swarmHandler.getInnerValue().meta.swarmId].push(callback);
            }
        },
        off: function (swarmHandler) {
			if(swarmHandlersSubscribers[swarmHandler.getInnerValue().meta.swarmId]){
				swarmHandlersSubscribers[swarmHandler.getInnerValue().meta.swarmId] = [];
            }
        }
    };

    return swarmInteract.newInteractionSpace(comm);

}

var space;
module.exports.createInteractionSpace = function () {
    if(!space){
        space = new MemoryMQInteractionSpace();
    }else{
        console.log("MemoryMQInteractionSpace already created! Using same instance.");
    }
    return space;
};
},{"./../swarmInteraction":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/swarmInteraction.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/WebViewMQInteractionSpace.js":[function(require,module,exports){
function WindowMQInteractionSpace(channelName, communicationWindow, secondCommunicationChannel){
    var swarmInteract = require("./../swarmInteraction");
    var childMessageMQ = require("./specificMQImpl/ChildWebViewMQ").createMQ(channelName, communicationWindow, secondCommunicationChannel);
    var swarmInstances = {};

    var comm = {
        startSwarm: function (swarmName, ctor, args) {
            var swarm = {meta:{
                    swarmTypeName:swarmName,
                    ctor:ctor,
                    args:args
                }};
            childMessageMQ.produce(swarm);
            return swarm;
        },
        continueSwarm: function (swarmHandler, swarmSerialisation, phaseName, args) {

            var newSerialization = JSON.parse(JSON.stringify(swarmSerialisation));
            newSerialization.meta.ctor = undefined;
            newSerialization.meta.phaseName = phaseName;
            newSerialization.meta.target = "iframe";
            newSerialization.meta.args = args;
            childMessageMQ.produce(newSerialization);
        },
        on: function (swarmHandler, callback) {
            childMessageMQ.registerConsumer(callback);
        },
        off: function (swarmHandler) {

        }
    };


    var space = swarmInteract.newInteractionSpace(comm);
    this.startSwarm = function (name, ctor, ...args) {
        return space.startSwarm(name, ctor, ...args);
    };

    this.init = function () {

        childMessageMQ.registerConsumer(function (err, data) {
            if (err) {
                console.log(err);
            }
            else {
                var swarm;
                if(data && data.meta && data.meta.swarmId && swarmInstances[data.meta.swarmId]){
                    swarm = swarmInstances[data.meta.swarmId];
                    swarm.update(data);
                    swarm[data.meta.phaseName].apply(swarm, data.meta.args);
                }else{

                    swarm = $$.swarm.start(data.meta.swarmTypeName, data.meta.ctor, ...data.meta.args);

                    swarmInstances[swarm.getInnerValue().meta.swarmId] = swarm;

                    swarm.onReturn(function(data){
                        console.log("Swarm is finished");
                        console.log(data);
                    });
                }
            }
        });
        const readyEvt = {webViewIsReady: true};
        parent.postMessage(JSON.stringify(readyEvt), "*");

    };

    function handler(message){
        log("sending swarm ", message);
        childMessageMQ.produce(message);
    }

    function filterInteractions(message){
        log("checking if message is 'interaction' ", message);
        return message && message.meta && message.meta.target && message.meta.target === "interaction";
    }
    //TODO fix this for nativeWebView

    $$.PSK_PubSub.subscribe($$.CONSTANTS.SWARM_FOR_EXECUTION, handler, function(){return true;}, filterInteractions);

    log("registering listener for handling interactions");

    function log(...args){
        args.unshift("[WindowMQInteractionSpace"+(window.frameElement ? "*": "")+"]" );
        //console.log.apply(this, args);
    }
}

module.exports.createInteractionSpace = function(channelName, communicationWindow, secondCommunicationChannel){
    return new WindowMQInteractionSpace(channelName, communicationWindow, secondCommunicationChannel);
};
},{"./../swarmInteraction":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/swarmInteraction.js","./specificMQImpl/ChildWebViewMQ":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWebViewMQ.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/WindowMQInteractionSpace.js":[function(require,module,exports){
/*TODO
For the moment I don't see any problems if it's not cryptographic safe.
This version keeps  compatibility with mobile browsers/webviews.
 */
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function WindowMQInteractionSpace(channelName, communicationWindow) {
    var swarmInteract = require("./../swarmInteraction");
    var childMessageMQ = require("./specificMQImpl/ChildWndMQ").createMQ(channelName, communicationWindow);
    var swarmInstances = {};

    var comm = {
        startSwarm: function (swarmName, ctor, args) {

            var uniqueId = uuidv4();
            var swarm = {
                meta: {
                    swarmTypeName: swarmName,
                    ctor: ctor,
                    args: args,
                    requestId: uniqueId,
                }
            };
            childMessageMQ.produce(swarm);
            return swarm;
        },
        continueSwarm: function (swarmHandler, swarmSerialisation, phaseName, args) {

            var newSerialization = JSON.parse(JSON.stringify(swarmSerialisation));
            newSerialization.meta.ctor = undefined;
            newSerialization.meta.phaseName = phaseName;
            newSerialization.meta.target = "iframe";
            newSerialization.meta.args = args;
            childMessageMQ.produce(newSerialization);
        },
        on: function (swarmHandler, callback) {
            childMessageMQ.registerCallback(swarmHandler.meta.requestId, callback);
        },
        off: function (swarmHandler) {
            console.log("Function not implemented!");
        }
    };


    var space = swarmInteract.newInteractionSpace(comm);
    this.startSwarm = function (name, ctor, ...args) {
        return space.startSwarm(name, ctor, ...args);
    };

    this.init = function () {

        childMessageMQ.registerConsumer(function (err, data) {
            if (err) {
                console.log(err);
            }
            else {
                var swarm;
                if (data && data.meta && data.meta.swarmId && swarmInstances[data.meta.swarmId]) {
                    swarm = swarmInstances[data.meta.swarmId];
                    swarm.update(data);
                    swarm[data.meta.phaseName].apply(swarm, data.meta.args);
                } else {

                    swarm = $$.swarm.start(data.meta.swarmTypeName, data.meta.ctor, ...data.meta.args);
                    swarm.setMetadata("requestId", data.meta.requestId);
                    swarmInstances[swarm.getInnerValue().meta.swarmId] = swarm;

                    swarm.onReturn(function (data) {
                        console.log("Swarm is finished");
                        console.log(data);
                    });
                }
            }
        });
        parent.postMessage({webViewIsReady: true}, "*");
    };

    function handler(message) {
        log("sending swarm ", message);
        childMessageMQ.produce(message);
    }

    function filterInteractions(message) {
        log("checking if message is 'interaction' ", message);
        return message && message.meta && message.meta.target && message.meta.target === "interaction";
    }

    $$.PSK_PubSub.subscribe($$.CONSTANTS.SWARM_FOR_EXECUTION, handler, function () {
        return true;
    }, filterInteractions);
    log("registering listener for handling interactions");

    function log(...args) {
        args.unshift("[WindowMQInteractionSpace" + (window.frameElement ? "*" : "") + "]");
        //console.log.apply(this, args);
    }
}

module.exports.createInteractionSpace = function (channelName, communicationWindow) {
    return new WindowMQInteractionSpace(channelName, communicationWindow);
};

},{"./../swarmInteraction":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/swarmInteraction.js","./specificMQImpl/ChildWndMQ":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/folderMQBasedInteractionSpace.js":[function(require,module,exports){
var OwM = require("swarmutils").OwM;
var swarmInteract = require("./../swarmInteraction");
var folderMQ = require("foldermq");

function FolderMQInteractionSpace(agent, targetFolder, returnFolder) {
    var swarmHandlersSubscribers = {};
    var queueHandler = null;
    var responseQueue = null;

    var queue = folderMQ.createQue(targetFolder, (err , result) => {
        if(err){
           throw err;
        }
    });

    function createSwarmPack(swarmName, phaseName, ...args){
        var swarm = new OwM();

        swarm.setMeta("swarmId", $$.uidGenerator.safe_uuid());

        swarm.setMeta("requestId", swarm.getMeta("swarmId"));
        swarm.setMeta("swarmTypeName", swarmName);
        swarm.setMeta("phaseName", phaseName);
        swarm.setMeta("args", args);
        swarm.setMeta("command", "executeSwarmPhase");
        swarm.setMeta("target", agent);
        swarm.setMeta("homeSecurityContext", returnFolder);

        return swarm;
    }

    function dispatchingSwarms(err, swarm){
        if (err) {
            console.log(err);
        }
		setTimeout(function(){
            var subsList = swarmHandlersSubscribers[swarm.meta.swarmId];
            if(subsList){
                for(var i=0; i<subsList.length; i++){
                    let handler = subsList[i];
                    handler(null, swarm);
                }
            }
        }, 1);
    }

    function init(){
        if(!queueHandler){
            queueHandler = queue.getHandler();
        }
    }
	
	init();

    function prepareToConsume(){
        if(!responseQueue){
            responseQueue = folderMQ.createQue(returnFolder);
            responseQueue.registerConsumer(dispatchingSwarms);
        }
    }

    var communication = {
        startSwarm: function (swarmName, ctor, args) {
            prepareToConsume();
            var swarm = createSwarmPack(swarmName, ctor, ...args);
            queueHandler.sendSwarmForExecution(swarm);
            return swarm;
        },
        continueSwarm: function (swarmHandler, swarmSerialisation, ctor, ...args) {
            try{
                swarmHandler.update(swarmSerialisation);
                swarmHandler[ctor].apply(swarmHandler, args);
            }catch(err){
                console.log(err);
            }
        },
        on: function (swarmHandler, callback) {
            prepareToConsume();

            if(!swarmHandlersSubscribers[swarmHandler.meta.swarmId]){
                swarmHandlersSubscribers[swarmHandler.meta.swarmId] = [];
            }
            swarmHandlersSubscribers[swarmHandler.meta.swarmId].push(callback);

        },
        off: function (swarmHandler) {
            swarmHandlersSubscribers[swarmHandler.meta.swarmId] = [];
        }
    };

    return swarmInteract.newInteractionSpace(communication);
}

var spaces = {};

module.exports.createInteractionSpace = function (agent, targetFolder, returnFolder) {
    var index = targetFolder+returnFolder;
    if(!spaces[index]){
        spaces[index] = new FolderMQInteractionSpace(agent, targetFolder, returnFolder);
    }else{
        console.log(`FolderMQ interaction space based on [${targetFolder}, ${returnFolder}] already exists!`);
    }
    return spaces[index];
};
},{"./../swarmInteraction":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/swarmInteraction.js","foldermq":"foldermq","swarmutils":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/httpInteractionSpace.js":[function(require,module,exports){
require('psk-http-client');

function HTTPInteractionSpace(alias, remoteEndPoint, agentUid, cryptoInfo) {
    const swarmInteract = require("./../swarmInteraction");

    let initialized = false;
    function init(){
        if(!initialized){
            initialized = true;
            $$.remote.createRequestManager();
            $$.remote.newEndPoint(alias, remoteEndPoint, agentUid, cryptoInfo);
        }
    }

    const comm = {
        startSwarm: function (swarmName, ctor, args) {
            init();
            return $$.remote[alias].startSwarm(swarmName, ctor, ...args);
        },
        continueSwarm: function (swarmHandler, swarmSerialisation, ctor, args) {
            return $$.remote[alias].continueSwarm(swarmSerialisation, ctor, args);
        },
        on: function (swarmHandler, callback) {
            swarmHandler.on('*', callback);
        },
        off: function (swarmHandler) {
            swarmHandler.off('*');
        }
    };

    return swarmInteract.newInteractionSpace(comm);
}

module.exports.createInteractionSpace = function (alias, remoteEndPoint, agentUid, cryptoInfo) {
    //singleton
    return new HTTPInteractionSpace(alias, remoteEndPoint, agentUid, cryptoInfo);
};
},{"./../swarmInteraction":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/swarmInteraction.js","psk-http-client":"psk-http-client"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWebViewMQ.js":[function(require,module,exports){
(function (global){
var channelsRegistry = {}; //keeps callbacks for consumers and windows references for producers
var callbacksRegistry = {};

function dispatchEvent(event) {
    var swarm = JSON.parse(event.data);
    if(swarm.meta){
        var callback = callbacksRegistry[swarm.meta.channelName];
        if (callback) {
            return callback(null, swarm);
        } else {
            throw new Error("");
        }
    }

}


function ChildWndMQ(channelName, mainWindow, secondCommunicationChannel) {
    //channel name is

    channelsRegistry[channelName] = mainWindow;

    this.produce = function (swarmMsg) {
        swarmMsg.meta.channelName = channelName;
        var message = {
            meta:swarmMsg.meta,
            publicVars:swarmMsg.publicVars,
            privateVars:swarmMsg.privateVars
        };

        message.meta.args = message.meta.args.map(function (argument) {
            if (argument instanceof Error) {
                var error = {};
                if (argument.message) {
                    error["message"] = argument.message;
                }
                if (argument.code) {
                    error["code"] = argument.code;
                }
                return error;
            }
            return argument;
        });
        mainWindow.postMessage(JSON.stringify(message), "*");
    };

    var consumer;

    this.registerConsumer = function (callback, shouldDeleteAfterRead = true) {
        if (typeof callback !== "function") {
            throw new Error("First parameter should be a callback function");
        }
        if (consumer) {
           // throw new Error("Only one consumer is allowed!");
        }

        consumer = callback;
        callbacksRegistry[channelName] = consumer;

        if (secondCommunicationChannel && typeof secondCommunicationChannel.addEventListener !== "undefined") {
            secondCommunicationChannel.addEventListener("message", dispatchEvent);
        }
      };
}


module.exports.createMQ = function createMQ(channelName, wnd, secondCommunicationChannel){
    return new ChildWndMQ(channelName, wnd, secondCommunicationChannel);
};


module.exports.initForSwarmingInChild = function(domainName){

    var pubSub = $$.require("soundpubsub").soundPubSub;

    var inbound = createMQ(domainName+"/inbound");
    var outbound = createMQ(domainName+"/outbound");


    inbound.registerConsumer(function(err, swarm){
        if (err) {
            console.log(err);
        }
        //restore and execute this tasty swarm
        global.$$.swarmsInstancesManager.revive_swarm(swarm);
    });

    pubSub.subscribe($$.CONSTANTS.SWARM_FOR_EXECUTION, function(swarm){
        outbound.sendSwarmForExecution(swarm);
    });
};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ.js":[function(require,module,exports){
(function (global){
var channelsRegistry = {}; //keeps callbacks for consumers and windows references for producers
var callbacksRegistry = {};
var swarmCallbacks = {};

function dispatchEvent(event) {

    if (event.source !== window) {

        var swarm = event.data;

        if (swarm.meta) {
            let callback;
            if (!swarm.meta.requestId || !swarmCallbacks[swarm.meta.requestId]) {
                callback = callbacksRegistry[swarm.meta.channelName];
            }
            else {
                callback = swarmCallbacks[swarm.meta.requestId];
            }

            if (callback) {
                return callback(null, swarm);
            } else {
                throw new Error("");
            }

        }
    }
}


function ChildWndMQ(channelName, mainWindow) {
    //channel name is

    channelsRegistry[channelName] = mainWindow;

    this.produce = function (swarmMsg) {
        swarmMsg.meta.channelName = channelName;
        var message = {
            meta: swarmMsg.meta,
            publicVars: swarmMsg.publicVars,
            privateVars: swarmMsg.privateVars
        };
        //console.log(swarmMsg.getJSON());
        //console.log(swarmMsg.valueOf());
        message.meta.args = message.meta.args.map(function (argument) {
            if (argument instanceof Error) {
                var error = {};
                if (argument.message) {
                    error["message"] = argument.message;
                }
                if (argument.code) {
                    error["code"] = argument.code;
                }
                return error;
            }
            return argument;
        });
        mainWindow.postMessage(message, "*");
    };

    var consumer;

    this.registerConsumer = function (callback, shouldDeleteAfterRead = true) {
        if (typeof callback !== "function") {
            throw new Error("First parameter should be a callback function");
        }
        if (consumer) {
            // throw new Error("Only one consumer is allowed!");
        }

        consumer = callback;
        callbacksRegistry[channelName] = consumer;
        mainWindow.addEventListener("message", dispatchEvent);
    };

    this.registerCallback = function (requestId, callback) {
        swarmCallbacks[requestId] = callback;
        callbacksRegistry[channelName] = callback;
        mainWindow.addEventListener("message", dispatchEvent);
    };

}


module.exports.createMQ = function createMQ(channelName, wnd) {
    return new ChildWndMQ(channelName, wnd);
};


module.exports.initForSwarmingInChild = function (domainName) {

    var pubSub = $$.require("soundpubsub").soundPubSub;

    var inbound = createMQ(domainName + "/inbound");
    var outbound = createMQ(domainName + "/outbound");


    inbound.registerConsumer(function (err, swarm) {
        if (err) {
            console.log(err);
        }
        //restore and execute this tasty swarm
        global.$$.swarmsInstancesManager.revive_swarm(swarm);
    });

    pubSub.subscribe($$.CONSTANTS.SWARM_FOR_EXECUTION, function (swarm) {
        outbound.sendSwarmForExecution(swarm);
    });
};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/swarmInteraction.js":[function(require,module,exports){
if (typeof $$ == "undefined") {
    $$ = {};
}

function VirtualSwarm(innerObj, globalHandler){
    let knownExtraProps = [ "swarm" ];

    function buildHandler() {
        var utility = {};
        return {
            set: function (target, property, value, receiver) {
                switch (true) {
                    case target.privateVars && target.privateVars.hasOwnProperty(property):
                        target.privateVars[property] = value;
                        break;
                    case target.publicVars && target.publicVars.hasOwnProperty(property):
                        target.publicVars[property] = value;
                        break;
                    case target.hasOwnProperty(property):
                        target[property] = value;
                        break;
                    case knownExtraProps.indexOf(property) === -1:
                        if (!globalHandler.protected) {
                            globalHandler.protected = {};
                        }
                        globalHandler.protected[property] = value;
                        break;
                    default:
                        utility[property] = value;
                }
                return true;
            },
            get: function (target, property, receiver) {

                switch (true) {
                    case target.publicVars && target.publicVars.hasOwnProperty(property):
                        return target.publicVars[property];
                    case target.privateVars && target.privateVars.hasOwnProperty(property):
                        return target.privateVars[property];
                    case target.hasOwnProperty(property):
                        return target[property];
                    case globalHandler.protected && globalHandler.protected.hasOwnProperty(property):
                        return globalHandler.protected[property];
                    case utility.hasOwnProperty(property):
                        return utility[property];
                    default:
                        return undefined;
                }
            }
        };
    }

    return new Proxy(innerObj, buildHandler());
}

function SwarmInteraction(communicationInterface, swarmName, ctor, args) {

    var swarmHandler = communicationInterface.startSwarm(swarmName, ctor, args);

    this.on = function(description){
        communicationInterface.on(swarmHandler, function(err, swarmSerialisation){
            if (err) {
                console.log(err);
            }
            let phase = description[swarmSerialisation.meta.phaseName];
            let virtualSwarm = new VirtualSwarm(swarmSerialisation, swarmHandler);

            if(!phase){
                //TODO review and fix. Fix case when an interaction is started from another interaction
                if(swarmHandler && (!swarmHandler.Target || swarmHandler.Target.swarmId !== swarmSerialisation.meta.swarmId)){
                    console.log("Not my swarm!");
                    return;
                }
                var interactPhaseErr =  new Error("Interact method "+swarmSerialisation.meta.phaseName+" was not found.");
                if(description["onError"]){
                    description["onError"].call(virtualSwarm, interactPhaseErr);
                    return;
                }
                else{
                    throw interactPhaseErr;
                }
            }

            virtualSwarm.swarm = function(phaseName, ...args){
                communicationInterface.continueSwarm(swarmHandler, swarmSerialisation, phaseName, args);
            };

            phase.apply(virtualSwarm, swarmSerialisation.meta.args);
            if(virtualSwarm.meta.command === "asyncReturn"){
                communicationInterface.off(swarmHandler);
            }
        });
    };

    this.onReturn = function(callback){
        this.on({
            __return__: callback
        });
    };
}

var abstractInteractionSpace = {
    startSwarm: function (swarmName, ctor, args) {
        throw new Error("Overwrite  SwarmInteraction.prototype.startSwarm");
    },
    resendSwarm: function (swarmInstance, swarmSerialisation, ctor, args) {
        throw new Error("Overwrite  SwarmInteraction.prototype.continueSwarm ");
    },
    on: function (swarmInstance, phaseName, callback) {
        throw new Error("Overwrite  SwarmInteraction.prototype.onSwarm");
    },
off: function (swarmInstance) {
        throw new Error("Overwrite  SwarmInteraction.prototype.onSwarm");
    }
};

module.exports.newInteractionSpace = function (communicationInterface) {

    if(!communicationInterface) {
        communicationInterface = abstractInteractionSpace ;
    }
    return {
        startSwarm: function (swarmName, ctor, ...args) {
            return new SwarmInteraction(communicationInterface, swarmName, ctor, args);
        }
    };
};


},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/node-fd-slicer/modules/node-pend/index.js":[function(require,module,exports){
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

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-abstract-client.js":[function(require,module,exports){


/**********************  utility class **********************************/
function RequestManager(pollingTimeOut){
    if(!pollingTimeOut){
        pollingTimeOut = 1000; //1 second by default
    }

    var self = this;

    function Request(endPoint, initialSwarm){
        var onReturnCallbacks = [];
        var onErrorCallbacks = [];
        var onCallbacks = [];
        var requestId = initialSwarm.meta.requestId;
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
            self.poll(endPoint, this);
            return this;
        };

        this.onReturn = function(callback){
            onReturnCallbacks.push(callback);
            self.poll(endPoint, this);
            return this;
        };

        this.onError = function(callback){
            if(onErrorCallbacks.indexOf(callback)!==-1){
                onErrorCallbacks.push(callback);
            }else{
                console.log("Error callback already registered!");
            }
        };

        this.dispatch = function(err, result){
            result = typeof result == "string" ? JSON.parse(result) : result;
            result = OwM.prototype.convert(result);
            var resultReqId = result.getMeta("requestId");
            var phaseName = result.getMeta("phaseName");
            var onReturn = false;

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

        this.dispatchError = function(err){
            for(var i=0; i < onErrorCallbacks.length; i++){
                var errCb = onErrorCallbacks[i];
                errCb(err);
            }
        };

        this.off = function(){
            self.unpoll(endPoint, this);
        };
    }

    this.createRequest = function(remoteEndPoint, swarm){
        let request = new Request(remoteEndPoint, swarm);
        return request;
    };

    /* *************************** polling zone ****************************/

    var pollSet = {
    };

    var activeConnections = {
    };

    this.poll = function(remoteEndPoint, request){
        var requests = pollSet[remoteEndPoint];
        if(!requests){
            requests = {};
            pollSet[remoteEndPoint] = requests;
        }
        requests[request.getRequestId()] = request;
        pollingHandler();
    };

    this.unpoll = function(remoteEndPoint, request){
        var requests = pollSet[remoteEndPoint];
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
                    for(let req_id in requests){
                        let err_handler = requests[req_id].dispatchError;
                        if(err_handler){
                            err_handler(err);
                        }
                    }
                    activeConnections[remoteEndPoint] = false;
                } else {
                    for(var k in requests){
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
        for(var v in pollSet){
            if(!activeConnections[v]){
                createPollThread(v);
                activeConnections[v] = true;
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
    var baseOfRemoteEndPoint = remoteEndPoint; //remove last id

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
        var swarm = new OwM();
        swarm.setMeta("swarmId", $$.uidGenerator.safe_uuid());
        swarm.setMeta("requestId", swarm.getMeta("swarmId"));
        swarm.setMeta("swarmTypeName", swarmName);
        swarm.setMeta("phaseName", phaseName);
        swarm.setMeta("args", args);
        swarm.setMeta("command", "executeSwarmPhase");
        swarm.setMeta("target", domainInfo.agentUrl);
        swarm.setMeta("homeSecurityContext", returnRemoteEndPoint+$$.remote.base64Encode(homeSecurityContext));

        $$.remote.doHttpPost(getRemote(remoteEndPoint, domainInfo.domain), swarm, function(err, res){
            if(err){
                console.log(err);
            }
        });

        return $$.remote.requestManager.createRequest(swarm.getMeta("homeSecurityContext"), swarm);
    };

    this.continueSwarm = function(existingSwarm, phaseName, ...args){
        var swarm = new OwM(existingSwarm);
        swarm.setMeta("phaseName", phaseName);
        swarm.setMeta("args", args);
        swarm.setMeta("command", "executeSwarmPhase");
        swarm.setMeta("target", domainInfo.agentUrl);
        swarm.setMeta("homeSecurityContext", returnRemoteEndPoint+$$.remote.base64Encode(homeSecurityContext));

        $$.remote.doHttpPost(getRemote(remoteEndPoint, domainInfo.domain), swarm, function(err, res){
            if(err){
                console.log(err);
            }
        });
        //return $$.remote.requestManager.createRequest(swarm.getMeta("homeSecurityContext"), swarm);
    };

    var allCatchAlls = [];
    var requestsCounter = 0;
    function CatchAll(swarmName, phaseName, callback){ //same interface as Request
        var requestId = requestsCounter++;
        this.getRequestId = function(){
            let reqId = "swarmName" + "phaseName" + requestId;
            return reqId;
        };

        this.dispatch = function(err, result){
            result = OwM.prototype.convert(JSON.parse(result));
            var currentPhaseName = result.getMeta("phaseName");
            var currentSwarmName = result.getMeta("swarmTypeName");
            if((currentSwarmName === swarmName || swarmName === '*') && (currentPhaseName === phaseName || phaseName === '*')) {
                return callback(err, result);
            }
        };
    }

    this.on = function(swarmName, phaseName, callback){
        var c = new CatchAll(swarmName, phaseName, callback);
        allCatchAlls.push({
            s:swarmName,
            p:phaseName,
            c:c
        });

        $$.remote.requestManager.poll(getRemote(remoteEndPoint, domainInfo.domain) , c);
    };

    this.off = function(swarmName, phaseName){
        allCatchAlls.forEach(function(ca){
            if((ca.s === swarmName || swarmName === '*') && (phaseName === ca.p || phaseName === '*')){
                $$.remote.requestManager.unpoll(getRemote(remoteEndPoint, domainInfo.domain), ca.c);
            }
        });
    };

    this.uploadCSB = function(cryptoUid, binaryData, callback){
        $$.remote.doHttpPost(baseOfRemoteEndPoint + "/CSB/" + cryptoUid, binaryData, callback);
    };

    this.downloadCSB = function(cryptoUid, callback){
        $$.remote.doHttpGet(baseOfRemoteEndPoint + "/CSB/" + cryptoUid, callback);
    };

    function getRemote(baseUrl, domain) {
        return urlEndWithSlash(baseUrl) + $$.remote.base64Encode(domain);
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
    $$.remote.newEndPoint = function(alias, remoteEndPoint, agentUid, cryptoInfo){
        if(alias === "newRemoteEndPoint" || alias === "requestManager" || alias === "cryptoProvider"){
            console.log("PskHttpClient Unsafe alias name:", alias);
            return null;
        }
        
        $$.remote[alias] = new PskHttpClient(remoteEndPoint, agentUid, cryptoInfo);
    };


    $$.remote.doHttpPost = function (url, data, callback){
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

},{"swarmutils":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-browser-client.js":[function(require,module,exports){
(function (Buffer){
$$.remote.doHttpPost = function (url, data, callback) {

    var xhr = new XMLHttpRequest();

    xhr.onload = function () {
        if (xhr.readyState == 4 && xhr.status == "200") {
            var data = xhr.response;
            callback(null, data);
        } else {
            if(xhr.status>=400){
            callback(new Error("An error occured. StatusCode: " + xhr.status));
            }
        }
    };

    xhr.open("POST", url, true);
    //xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    if(data && data.pipe && typeof data.pipe === "function"){
        var buffers = [];
        data.on("data", function(data) {
            buffers.push(data);
        });
        data.on("end", function() {
            var actualContents = Buffer.concat(buffers);
            xhr.send(actualContents);
        });
    }
    else{
        xhr.send(data);
    }
};


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

        if (xhr.readyState == 4 && xhr.status == "200") {
            var contentType = xhr.getResponseHeader("Content-Type");

            if(contentType==="application/octet-stream"){
                let responseBuffer = Buffer.from(this.response);
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

},{"buffer":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-node-client.js":[function(require,module,exports){
(function (Buffer){
require("./psk-abstract-client");

const http = require("http");
const https = require("https");
const URL = require("url");
const userAgent = 'PSK NodeAgent/0.0.1';

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

$$.remote.doHttpPost = function (url, data, callback){
	const innerUrl = URL.parse(url);

	const options = {
		hostname: innerUrl.hostname,
		path: innerUrl.pathname,
		port: parseInt(innerUrl.port),
		headers: {
			'User-Agent': userAgent
		},
		method: 'POST'
	};

	const network = getNetworkForOptions(innerUrl);

	const req = network.request(options, (res) => {
		const { statusCode } = res;

		let error;
		if (statusCode >= 400) {
			error = new Error('Request Failed.\n' +
				`Status Code: ${statusCode}`);
		}

		if (error) {
			callback(error);
			// free up memory
			res.resume();
			return ;
		}

		let rawData = '';
		res.on('data', (chunk) => { rawData += chunk; });
		res.on('end', () => {
			try {
				return callback(null, rawData);
			} catch (err) {
				return callback(err);
			}
		});
	}).on("error", (error) => {
        console.log("POST Error", error);
		callback(error);
	});

    if(data && data.pipe && typeof data.pipe === "function"){
        data.pipe(req);
        return;
    }

    if(typeof data !== 'string' && !Buffer.isBuffer(data)) {
		data = JSON.stringify(data);
	}

	req.write(data);
	req.end();
};

$$.remote.doHttpGet = function doHttpGet(url, callback){
    const innerUrl = URL.parse(url);

	const options = {
		hostname: innerUrl.hostname,
		path: innerUrl.pathname + (innerUrl.search || ''),
		port: parseInt(innerUrl.port),
		headers: {
			'User-Agent': userAgent
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
			callback(error);
			// free up memory
			res.resume();
			return ;
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
				return callback(null, rawData);
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

},{"./psk-abstract-client":"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-abstract-client.js","buffer":false,"http":false,"https":false,"url":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/Blockchain.js":[function(require,module,exports){
const consUtil = require('signsensus').consUtil;
const beesHealer = require("swarmutils").beesHealer;

function Blockchain(pds) {
    let swarm = null;

    this.beginTransaction = function (transactionSwarm) {
        if (!transactionSwarm) {
            throw new Error('Missing swarm');
        }

        swarm = transactionSwarm;
        return new Transaction(pds.getHandler());
    };

    this.commit = function (transaction) {

        const diff = pds.computeSwarmTransactionDiff(swarm, transaction.getHandler());
        const t = consUtil.createTransaction(0, diff);
        const set = {};
        set[t.digest] = t;
        pds.commit(set, 1);
    };
}


function Transaction(pdsHandler) {
    const ALIASES = '/aliases';


    this.add = function (asset) {
        const swarmTypeName = asset.getMetadata('swarmTypeName');
        const swarmId = asset.getMetadata('swarmId');

        const aliasIndex = new AliasIndex(swarmTypeName);
        if (asset.alias && aliasIndex.getUid(asset.alias) !== swarmId) {
            aliasIndex.create(asset.alias, swarmId);
        }

        asset.setMetadata('persisted', true);
        const serializedSwarm = beesHealer.asJSON(asset, null, null);

        pdsHandler.writeKey(swarmTypeName + '/' + swarmId, J(serializedSwarm));
    };

    this.lookup = function (assetType, aid) { // alias sau id
        let localUid = aid;

        if (hasAliases(assetType)) {
            const aliasIndex = new AliasIndex(assetType);
            localUid = aliasIndex.getUid(aid) || aid;
        }

        const value = pdsHandler.readKey(assetType + '/' + localUid);

        if (!value) {
            return $$.asset.start(assetType);
        } else {
            const swarm = $$.asset.continue(assetType, JSON.parse(value));
            swarm.setMetadata("persisted", true);
            return swarm;
        }
    };

    this.loadAssets = function (assetType) {
        const assets = [];

        const aliasIndex = new AliasIndex(assetType);
        Object.keys(aliasIndex.getAliases()).forEach((alias) => {
            assets.push(this.lookup(assetType, alias));
        });

        return assets;
    };

    this.getHandler = function () {
        return pdsHandler;
    };

    function hasAliases(spaceName) {
        return !!pdsHandler.readKey(spaceName + ALIASES);
    }

    function AliasIndex(assetType) {
        this.create = function (alias, uid) {
            const assetAliases = this.getAliases();

            if (typeof assetAliases[alias] !== "undefined") {
                $$.errorHandler.throwError(new Error(`Alias ${alias} for assets of type ${assetType} already exists`));
            }

            assetAliases[alias] = uid;

            pdsHandler.writeKey(assetType + ALIASES, J(assetAliases));
        };

        this.getUid = function (alias) {
            const assetAliases = this.getAliases();
            return assetAliases[alias];
        };

        this.getAliases = function () {
            let aliases = pdsHandler.readKey(assetType + ALIASES);
            return aliases ? JSON.parse(aliases) : {};
        };
    }
}

module.exports = Blockchain;
},{"signsensus":"signsensus","swarmutils":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/FolderPersistentPDS.js":[function(require,module,exports){
var memoryPDS = require("./InMemoryPDS");
var fs = require("fs");
var path = require("path");


function FolderPersistentPDS(folder) {
    this.memCache = memoryPDS.newPDS(this);

    function mkSingleLine(str) {
        return str.replace(/[\n\r]/g, "");
    }

    function makeCurrentValueFilename() {
        return path.normalize(folder + '/currentVersion');
    }

    function getCurrentValue(path) {
        try {
            if(!fs.existsSync(path)) {
                return null;
            }

            return JSON.parse(fs.readFileSync(path).toString());
        } catch (e) {
            console.log('error ', e);
            return null;
        }
    }

    this.persist = function (transactionLog, currentValues, currentPulse) {

        transactionLog.currentPulse = currentPulse;
        transactionLog = mkSingleLine(JSON.stringify(transactionLog)) + "\n";

        fs.mkdir(folder, {recursive: true}, function (err, res) {
            if (err && err.code !== "EEXIST") {
                throw err;
            }

            fs.appendFileSync(folder + '/transactionsLog', transactionLog, 'utf8');
            fs.writeFileSync(makeCurrentValueFilename(), JSON.stringify(currentValues, null, 1));
        });
    };

    const innerValues = getCurrentValue(makeCurrentValueFilename());
    this.memCache.initialise(innerValues);
}

exports.newPDS = function (folder) {
    const pds = new FolderPersistentPDS(folder);
    return pds.memCache;
};

},{"./InMemoryPDS":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/InMemoryPDS.js","fs":false,"path":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/InMemoryPDS.js":[function(require,module,exports){
(function (global){

var cutil   = require("../../signsensus/lib/consUtil");
var ssutil  = require("pskcrypto");


function Storage(parentStorage){
    var cset            = {};  // containes all keys in parent storage, contains only keys touched in handlers
    var writeSet        = !parentStorage ? cset : {};   //contains only keys modified in handlers

    var readSetVersions  = {}; //meaningful only in handlers
    var writeSetVersions = {}; //will store all versions generated by writeKey

    var vsd             = "empty"; //only for parent storage
    var previousVSD     = null;

    var myCurrentPulse    = 0;
    var self = this;


    function hasLocalKey(name){
        return cset.hasOwnProperty(name);
    }

    this.hasKey = function(name){
        return parentStorage ? parentStorage.hasKey(name) : hasLocalKey(name);
    };

    this.readKey = function readKey(name){
        var value;
        if(hasLocalKey(name)){
            value = cset[name];
        }else{
            if(this.hasKey(name)){
                value = parentStorage.readKey(name);
                cset[name] = value;
                readSetVersions[name] = parentStorage.getVersion(name);
            }else{
                cset[name] = undefined;
                readSetVersions[name] = 0;
            }
            writeSetVersions[name] = readSetVersions[name];
        }
        return value;
    };

    this.getVersion = function(name, realVersion){
        var version = 0;
        if(hasLocalKey(name)){
            version = readSetVersions[name];
        }else{
            if(this.hasKey(name)){
                cset[name] = parentStorage.readKey();
                version = readSetVersions[name] = parentStorage.getVersion(name);
            }else{
                cset[name] = undefined;
                readSetVersions[name] = version;
            }
        }
        return version;
    };

    this.writeKey = function modifyKey(name, value){
        var k = this.readKey(name); //TODO: unused var

        cset [name] = value;
        writeSetVersions[name]++;
        writeSet[name] = value;
    };

    this.getInputOutput = function () {
        return {
            input: readSetVersions,
            output: writeSet
        };
    };

    this.getInternalValues = function(currentPulse, updatePreviousVSD){
        if(updatePreviousVSD){
            myCurrentPulse = currentPulse;
            previousVSD = vsd;
        }
        return {
            cset:cset,
            writeSetVersions:writeSetVersions,
            previousVSD:previousVSD,
            vsd:vsd,
            currentPulse:currentPulse
        };
    };

    this.initialiseInternalValue = function(storedValues){
        if(!storedValues) {
            return;
        }

        cset = storedValues.cset;
        writeSetVersions = storedValues.writeSetVersions;
        vsd = storedValues.vsd;
        writeSet = cset;
        myCurrentPulse = storedValues.currentPulse;
        previousVSD = storedValues.previousVSD;
    };

    function applyTransaction(t){
        for(let k in t.output){ 
            if(!t.input.hasOwnProperty(k)){
                return false;
            }
        }
        for(let l in t.input){
            var transactionVersion = t.input[l];
            var currentVersion = self.getVersion(l);
            if(transactionVersion !== currentVersion){
                //console.log(l, transactionVersion , currentVersion);
                return false;
            }
        }

        for(let v in t.output){
            self.writeKey(v, t.output[v]);
        }

		var arr = process.hrtime();
		var current_second = arr[0];
		var diff = current_second-t.second;

		global["Tranzactions_Time"]+=diff;

		return true;
    }

    this.computePTBlock = function(nextBlockSet){   //make a transactions block from nextBlockSet by removing invalid transactions from the key versions point of view
        var validBlock = [];
        var orderedByTime = cutil.orderTransactions(nextBlockSet);
        var i = 0;

        while(i < orderedByTime.length){
            var t = orderedByTime[i];
            if(applyTransaction(t)){
                validBlock.push(t.digest);
            }
            i++;
        }
        return validBlock;
    };

    this.commit = function(blockSet){
        var i = 0;
        var orderedByTime = cutil.orderTransactions(blockSet);

        while(i < orderedByTime.length){
            var t = orderedByTime[i];
            if(!applyTransaction(t)){ //paranoid check,  fail to work if a majority is corrupted
                //pretty bad
                //throw new Error("Failed to commit an invalid block. This could be a nasty bug or the stakeholders majority is corrupted! It should never happen!");
                console.log("Failed to commit an invalid block. This could be a nasty bug or the stakeholders majority is corrupted! It should never happen!"); //TODO: replace with better error handling
            }
            i++;
        }
        this.getVSD(true);
    };

    this.getVSD = function(forceCalculation){
        if(forceCalculation){
            var tmp = this.getInternalValues(myCurrentPulse, true);
            vsd = ssutil.hashValues(tmp);
        }
        return vsd;
    };
}

function InMemoryPDS(permanentPersistence){

    var mainStorage = new Storage(null);


    this.getHandler = function(){ // a way to work with PDS
        var tempStorage = new Storage(mainStorage);
        return tempStorage;
    };

    this.computeSwarmTransactionDiff = function(swarm, forkedPds){
        var inpOutp     = forkedPds.getInputOutput();
        swarm.input     = inpOutp.input;
        swarm.output    = inpOutp.output;
        return swarm;
    };

    this.computePTBlock = function(nextBlockSet){
        var tempStorage = new Storage(mainStorage);
        return tempStorage.computePTBlock(nextBlockSet);

    };

    this.commit = function(blockSet, currentPulse){
        mainStorage.commit(blockSet);
        if(permanentPersistence) {
            permanentPersistence.persist(blockSet, mainStorage.getInternalValues(currentPulse, false), currentPulse);
        }
    };

    this.getVSD = function (){
        return mainStorage.getVSD(false);
    };

    this.initialise = function(savedInternalValues){
        mainStorage.initialiseInternalValue(savedInternalValues);
    };

}


exports.newPDS = function(persistence){
    return new InMemoryPDS(persistence);
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../signsensus/lib/consUtil":"/home/cosmin/Workspace/reorganizing/privatesky/modules/signsensus/lib/consUtil.js","pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/PersistentPDS.js":[function(require,module,exports){
const memoryPDS = require("./InMemoryPDS");

function PersistentPDS({getInitValues, persist}) {
	this.memCache = memoryPDS.newPDS(this);
	this.persist = persist;

	const innerValues = getInitValues() || null;
	this.memCache.initialise(innerValues);
}


module.exports.newPDS = function (readerWriter) {
	const pds = new PersistentPDS(readerWriter);
	return pds.memCache;
};

},{"./InMemoryPDS":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/InMemoryPDS.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/ACLScope.js":[function(require,module,exports){

$$.asset.describe("ACLScope", {
    public:{
        concern:"string:key",
        db:"json"
    },
    init:function(concern){
        this.concern = concern;
    },
    addResourceParent : function(resourceId, parentId){
        //TODO: empty functions!
    },
    addZoneParent : function(zoneId, parentId){
        //TODO: empty functions!
    },
    grant :function(agentId,  resourceId){
        //TODO: empty functions!
    },
    allow :function(agentId,  resourceId){
        return true;
    }
});
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/Agent.js":[function(require,module,exports){

$$.asset.describe("Agent", {
    public:{
        alias:"string:key",
        publicKey:"string"
    },
    init:function(alias, value){
        this.alias      = alias;
        this.publicKey  = value;
    },
    update:function(value){
        this.publicKey = value;
    },
    addAgent: function () {
        throw new Error('Not Implemented');
    },
    listAgent: function () {
        throw new Error('Not Implemented');

    },
    removeAgent: function () {
        throw new Error('Not Implemented');

    }
});
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/Backup.js":[function(require,module,exports){

$$.asset.describe("Backup", {
    public:{
        id:  "string",
        url: "string"
    },

    init:function(id, url){
        this.id = id;
        this.url = url;
    }
});

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/CSBMeta.js":[function(require,module,exports){

$$.asset.describe("CSBMeta", {
	public:{
		isMaster:"string",
		alias:"string:key",
		description: "string",
		creationDate: "string",
		updatedDate : "string",
		id: "string",
		icon: "string"
	},
	init:function(id){
		this.alias = "meta";
		this.id = id;
	},

	setIsMaster: function (isMaster) {
		this.isMaster = isMaster;
	}

});

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/CSBReference.js":[function(require,module,exports){

$$.asset.describe("CSBReference", {
    public:{
        alias:"string:key",
        seed :"string",
        dseed:"string"
    },
    init:function(alias, seed, dseed ){
        this.alias = alias;
        this.seed  = seed;
        this.dseed = dseed;
    },
    update:function(fingerprint){
        this.fingerprint = fingerprint;
        this.version++;
    },
    registerBackupUrl:function(backupUrl){
        this.backups.add(backupUrl);
    }
});

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/DomainReference.js":[function(require,module,exports){

$$.asset.describe("DomainReference", {
    public:{
        role:"string:index",
        alias:"string:key",
        addresses:"map",
        constitution:"string",
        workspace:"string",
        remoteInterfaces:"map",
        localInterfaces:"map"
    },
    init:function(role, alias){
        this.role = role;
        this.alias = alias;
        this.addresses = {};
        this.remoteInterfaces = {};
        this.localInterfaces = {};
    },
    updateDomainAddress:function(replicationAgent, address){
        if(!this.addresses){
            this.addresses = {};
        }
        this.addresses[replicationAgent] = address;
    },
    removeDomainAddress:function(replicationAgent){
        this.addresses[replicationAgent] = undefined;
        delete this.addresses[replicationAgent];
    },
    addRemoteInterface:function(alias, remoteEndPoint){
        if(!this.remoteInterfaces){
            this.remoteInterfaces = {};
        }
        this.remoteInterfaces[alias] = remoteEndPoint;
    },
    removeRemoteInterface:function(alias){
        if(this.remoteInterface){
            this.remoteInterfaces[alias] = undefined;
            delete this.remoteInterfaces[alias];
        }
    },
    addLocalInterface:function(alias, path){
        if(!this.localInterfaces){
            this.localInterfaces = {};
        }
        this.localInterfaces[alias] = path;
    },
    removeLocalInterface:function(alias){
        if(this.localInterfaces){
            this.localInterfaces[alias] = undefined;
            delete this.localInterfaces[alias];
        }
    },
    setConstitution:function(pathOrUrlOrCSB){
        this.constitution = pathOrUrlOrCSB;
    },
    getConstitution:function(){
        return this.constitution;
    },
    setWorkspace:function(path){
        this.workspace = path;
    },
    getWorkspace:function(){
        return this.workspace;
    }
});
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/EmbeddedFile.js":[function(require,module,exports){
$$.asset.describe("EmbeddedFile", {
	public:{
		alias:"string"
	},

	init:function(alias){
		this.alias = alias;
	}
});
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/FileReference.js":[function(require,module,exports){
$$.asset.describe("FileReference", {
	public:{
		alias:"string",
		seed :"string",
		dseed:"string"
	},
	init:function(alias, seed, dseed){
		this.alias = alias;
		this.seed  = seed;
		this.dseed = dseed;
	}
});
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/Key.js":[function(require,module,exports){

$$.asset.describe("key", {
    public:{
        alias:"string"
    },
    init:function(alias, value){
        this.alias = alias;
        this.value = value;
    },
    update:function(value){
        this.value = value;
    }
});
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/index.js":[function(require,module,exports){
module.exports = $$.library(function(){
    require("./DomainReference");
    require("./CSBReference");
    require("./Agent");
    require("./Backup");
    require("./ACLScope");
    require("./Key");
    require("./transactions");
    require("./FileReference");
    require("./EmbeddedFile");
    require('./CSBMeta');
});
},{"./ACLScope":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/ACLScope.js","./Agent":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/Agent.js","./Backup":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/Backup.js","./CSBMeta":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/CSBMeta.js","./CSBReference":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/CSBReference.js","./DomainReference":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/DomainReference.js","./EmbeddedFile":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/EmbeddedFile.js","./FileReference":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/FileReference.js","./Key":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/Key.js","./transactions":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/transactions.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/transactions.js":[function(require,module,exports){
$$.transaction.describe("transactions", {
    updateKey: function (key, value) {
        var transaction = $$.blockchain.beginTransaction(this);
        var key = transaction.lookup("Key", key);
        var keyPermissions = transaction.lookup("ACLScope", "KeysConcern");
        if (keyPermissions.allow(this.agentId, key)) {
            key.update(value);
            transaction.add(key);
            $$.blockchain.commit(transaction);
        } else {
            this.securityError("Agent " + this.agentId + " denied to change key " + key);
        }
    },
    addChild: function (alias) {
        var transaction = $$.blockchain.beginTransaction();
        var reference = $$.contract.start("DomainReference", "init", "child", alias);
        transaction.add(reference);
        $$.blockchain.commit(transaction);
    },
    addParent: function (value) {
        var reference = $$.contract.start("DomainReference", "init", "child", alias);
        this.transaction.save(reference);
        $$.blockchain.persist(this.transaction);
    },
    addAgent: function (alias, publicKey) {
        var reference = $$.contract.start("Agent", "init", alias, publicKey);
        this.transaction.save(reference);
        $$.blockchain.persist(this.transaction);
    },
    updateAgent: function (alias, publicKey) {
        var agent = this.transaction.lookup("Agent", alias);
        agent.update(publicKey);
        this.transaction.save(reference);
        $$.blockchain.persist(this.transaction);
    }
});


$$.newTransaction = function(transactionFlow,ctor,...args){
    var transaction = $$.swarm.start( transactionFlow);
    transaction.meta("agentId", $$.currentAgentId);
    transaction.meta("command", "runEveryWhere");
    transaction.meta("ctor", ctor);
    transaction.meta("args", args);
    transaction.sign();
    //$$.blockchain.sendForConsent(transaction);
    //temporary until consent layer is activated
    transaction[ctor].apply(transaction,args);
};

/*
usages:
    $$.newTransaction("domain.transactions", "updateKey", "key", "value")

 */

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/swarms/agentsSwarm.js":[function(require,module,exports){
// const sharedPhases = require('./sharedPhases');
// const beesHealer = require('swarmutils').beesHealer;

$$.swarms.describe("agents", {
    add: function (alias, publicKey) {
        const transaction = $$.blockchain.beginTransaction({});
        const agentAsset = transaction.lookup('global.Agent', alias);

        agentAsset.init(alias, publicKey);
        try {
            transaction.add(agentAsset);

            $$.blockchain.commit(transaction);
        } catch (err) {
            this.return(new Error("Agent already exists"));
            return;
        }

        this.return(null, alias);
    },
});

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/swarms/domainSwarms.js":[function(require,module,exports){
const sharedPhases = require('./sharedPhases');
const beesHealer = require('swarmutils').beesHealer;

$$.swarms.describe("domains", {
    add: function (role, alias) {
        const transaction = $$.blockchain.beginTransaction({});
        const domainsSwarm = transaction.lookup('global.DomainReference', alias);

        if (!domainsSwarm) {
            this.return(new Error('Could not find swarm named "global.DomainReference"'));
            return;
        }

        domainsSwarm.init(role, alias);
        try{
            transaction.add(domainsSwarm);

            $$.blockchain.commit(transaction);
        }catch(err){
            this.return(new Error("Domain allready exists!"));
            return;
        }

        this.return(null, alias);
    },
    getDomainDetails:function(alias){
        const transaction = $$.blockchain.beginTransaction({});
        const domain = transaction.lookup('global.DomainReference', alias);

        if (!domain) {
            this.return(new Error('Could not find swarm named "global.DomainReference"'));
            return;
        }

        this.return(null, beesHealer.asJSON(domain).publicVars);
    },
    connectDomainToRemote(domainName, alias, remoteEndPoint){
        const transaction = $$.blockchain.beginTransaction({});
        const domain = transaction.lookup('global.DomainReference', domainName);

        if (!domain) {
            this.return(new Error('Could not find swarm named "global.DomainReference"'));
            return;
        }

        domain.addRemoteInterface(alias, remoteEndPoint);

        try{
            transaction.add(domain);

            $$.blockchain.commit(transaction);
        }catch(err){
            console.log(err);
            this.return(new Error("Domain update failed!"));
            return;
        }

        this.return(null, alias);
    },
    // getDomainDetails: sharedPhases.getAssetFactory('global.DomainReference'),
    getDomains: sharedPhases.getAllAssetsFactory('global.DomainReference')
});

},{"./sharedPhases":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/swarms/sharedPhases.js","swarmutils":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/swarms/index.js":[function(require,module,exports){
require('./domainSwarms');
require('./agentsSwarm');
},{"./agentsSwarm":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/swarms/agentsSwarm.js","./domainSwarms":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/swarms/domainSwarms.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/swarms/sharedPhases.js":[function(require,module,exports){
const beesHealer = require("swarmutils").beesHealer;

module.exports = {
    getAssetFactory: function(assetType) {
        return function(alias) {
            const transaction = $$.blockchain.beginTransaction({});
            const domainReferenceSwarm = transaction.lookup(assetType, alias);

            if(!domainReferenceSwarm) {
                this.return(new Error(`Could not find swarm named "${assetType}"`));
                return;
            }

            this.return(undefined, beesHealer.asJSON(domainReferenceSwarm));
        };
    },
    getAllAssetsFactory: function(assetType) {
        return function() {
            const transaction = $$.blockchain.beginTransaction({});
            const domains = transaction.loadAssets(assetType) || [];

            this.return(undefined, domains.map((domain) => beesHealer.asJSON(domain)));
        };
    }
};
},{"swarmutils":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/BackupEngine.js":[function(require,module,exports){
const AsyncDispatcher = require("../utils/AsyncDispatcher");
const EVFSResolver = require("./backupResolvers/EVFSResolver");
// const crypto = require("pskcrypto");

function BackupEngineBuilder() {
    const resolvers = {};
    this.addResolver = function (name, resolver) {
        resolvers[name] = resolver;
    };

    this.getBackupEngine = function(urls) {
        if (!urls || urls.length === 0) {
            throw new Error("No url was provided");
        }

        return new BackupEngine(urls, resolvers);
    };
}

function BackupEngine(urls, resolvers) {

    this.save = function (csbIdentifier, dataStream, callback) {
        const asyncDispatcher = new AsyncDispatcher(callback);
        asyncDispatcher.dispatchEmpty(urls.length);
        for (const url of urls) {
            resolverForUrl(url, (err, resolver) => {
                if(err){
                    return callback(err);
                }
                resolver.auth(url, undefined, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    resolver.save(url, csbIdentifier, dataStream, (err) => {
                        if (err) {
                            asyncDispatcher.markOneAsFinished(err);
                            return;
                        }
                        asyncDispatcher.markOneAsFinished(undefined, url);
                    });
                });
            });
        }
    };

    this.load = function (csbIdentifier, version, callback) {
        if (typeof version === "function") {
            callback = version;
            version = "";
        }

        tryDownload(csbIdentifier, version, 0, (err, resource) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, resource);
        });
    };

    this.getVersions = function (csbIdentifier, callback) {
        console.log("Empty function");
    };

    this.compareVersions = function (fileList, callback) {
        const url = urls[0];
        resolverForUrl(url, (err, resolver) => {
            if (err) {
                return callback(err);
            }

            resolver.auth(url, undefined, (err) => {
                if (err) {
                    return callback(err);
                }

                resolver.compareVersions(url, fileList, callback);
            });
        });
    };

    //------------------------------------------------ INTERNAL METHODS ------------------------------------------------

    function resolverForUrl(url, callback) {
        const keys = Object.keys(resolvers);
        let resolver;
        let i;

        for (i = 0; i < keys.length; ++i) {
            if (match(keys[i], url)) {
                resolver = resolvers[keys[i]];
                break;
            }
        }

        if (i === keys.length) {
            resolver = resolvers['evfs'];
            if (!resolver) {
                return callback(new Error(`No resolver matches the url ${url}`));
            }
        }

        callback(undefined, resolver);
    }

    function match(str1, str2) {
        return str1.includes(str2) || str2.includes(str1);
    }


    function tryDownload(csbIdentifier, version, index, callback) {
        if (index === urls.length) {
            return callback(new Error("Failed to download resource"));
        }

        const url = urls[index];
        resolverForUrl(url, (err, resolver) => {
            if (err) {
                return callback(err);
            }

            resolver.auth(url, undefined, (err) => {
                if (err) {
                    return tryDownload(csbIdentifier, version, ++index, callback);
                }

                resolver.load(url, csbIdentifier, version, (err, resource) =>{
                    if (err) {
                        return tryDownload(csbIdentifier, version, ++index, callback);
                    }

                    callback(undefined, resource);
                });
            });

        });
    }
}

const engineBuilder = new BackupEngineBuilder();

// engineBuilder.addResolver('dropbox', new DropboxResolver());
// engineBuilder.addResolver('drive', new DriveResolver());
engineBuilder.addResolver('evfs', new EVFSResolver());

module.exports = {
    getBackupEngine: function (urls) {
        return engineBuilder.getBackupEngine(urls);
    }
};

},{"../utils/AsyncDispatcher":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/AsyncDispatcher.js","./backupResolvers/EVFSResolver":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/backupResolvers/EVFSResolver.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/CSBCache.js":[function(require,module,exports){
 function CSBCache(maxSize) {

     let cache = {};
    let size = 0;
    const clearingRatio = 0.5;


    this.load = function (uid) {
        // if (cache[uid]) {
        //     cache[uid].count += 1;
        //     return cache[uid].instance;
        // }

        return undefined;
    };

    this.put = function (uid, obj) {
        if (size > maxSize) {
            clear();
        } else {
            size++;
            cache[uid] = {
                instance: obj,
                count: 0
            };
        }

    };

    //-------------------------internal methods---------------------------------------

    function clear() {
        size = maxSize - Math.round(clearingRatio * maxSize);

        const entries = Object.entries(cache);
        cache = entries
            .sort((arr1, arr2) => arr2[1].count - arr1[1].count)
            .slice(0, size)
            .reduce((obj, [ k, v ]) => {
                obj[k] = v;
                return obj;
            }, {});
    }
}

module.exports = CSBCache;

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/CSBIdentifier.js":[function(require,module,exports){
(function (Buffer){
const crypto = require("pskcrypto");


function CSBIdentifier(id, backupUrls, keyLen = 32) {
    let seed;
    let dseed;
    let uid;
    let encSeed;
    // let encDseed;

    init();

    this.getSeed = function () {
        if(!seed){
            throw new Error("Cannot return seed. Access is denied.");
        }

        return generateCompactForm(seed);
    };

    this.getDseed = function () {
        if(dseed){
            return generateCompactForm(dseed);
        }

        if(seed){
            dseed = deriveSeed(seed);
            return generateCompactForm(dseed);
        }

        throw new Error("Cannot return derived seed. Access is denied.");
    };

    this.getUid = function () {
        if(uid){
            return generateCompactForm(uid).toString();
        }

        if(dseed){
            uid = computeUid(dseed);
            return generateCompactForm(uid).toString();
        }

        if(seed){
            dseed = deriveSeed(seed);
            uid = computeUid(dseed);
            return generateCompactForm(uid).toString();
        }

        throw new Error("Cannot return uid");
    };

    this.getEncSeed = function (encryptionKey) {
        if(encSeed){
            return generateCompactForm(encSeed);
        }

        if(!seed){
            throw new Error("Cannot return encSeed. Access is denied");
        }

        if (!encryptionKey) {
            throw new Error("Cannot return encSeed. No encryption key was provided");
        }

        //TODO: encrypt seed using encryptionKey. Encryption algorithm remains to be chosen
    };



    this.getBackupUrls = function () {
        if(seed){
            return seed.backup;
        }

        if(dseed){
            return dseed.backup;
        }

        throw new Error("Backup URLs could not be retrieved. Access is denied");
    };

    //------------------------------ internal methods ------------------------------
    function init() {
        if (!id) {
            if (!backupUrls) {
                throw new Error("No backups provided.");
            }

            seed = create();
        }else{
            classifyId();
        }
    }

    function classifyId() {
        if (typeof id !== "string" && !Buffer.isBuffer(id) && !(typeof id === "object" && !Buffer.isBuffer(id))) {
            throw new Error(`Id must be a string or a buffer. The type provided was ${typeof id}`);
        }

        const expandedId = load(id);
        switch(expandedId.tag){
            case 's':
                seed = expandedId;
                break;
            case 'd':
                dseed = expandedId;
                break;
            case 'u':
                uid = expandedId;
                break;
            case 'es':
                encSeed = expandedId;
                break;
            case 'ed':
                encDseed = expandedId;
                break;
            default:
                throw new Error('Invalid tag');
        }
    }



    function create() {
        const localSeed = {};
        if (!Array.isArray(backupUrls)) {
            backupUrls = [ backupUrls ];
        }

        localSeed.tag    = 's';
        localSeed.random = crypto.randomBytes(keyLen);
        localSeed.backup = backupUrls;

        return localSeed;
    }

    function deriveSeed(seed) {
        let compactSeed = seed;

        if (typeof seed === 'object' && !Buffer.isBuffer(seed)) {
            compactSeed = generateCompactForm(seed);
        }

        if (Buffer.isBuffer(seed)) {
            compactSeed = seed.toString();
        }

        if (compactSeed[0] === 'd') {
            throw new Error('Tried to derive an already derived seed.');
        }

        const decodedCompactSeed = decodeURIComponent(compactSeed);
        const splitCompactSeed = decodedCompactSeed.substring(1).split('|');

        const strSeed = Buffer.from(splitCompactSeed[0], 'base64').toString('hex');
        const backupUrls = Buffer.from(splitCompactSeed[1], 'base64').toString();
        const dseed = {};

        dseed.tag = 'd';
        dseed.random = crypto.deriveKey(strSeed, null, keyLen);
        dseed.backup = JSON.parse(backupUrls);

        return dseed;
    }

    function computeUid(dseed){
        if(!dseed){
            throw new Error("Dseed was not provided");
        }

        if (typeof dseed === "object" && !Buffer.isBuffer(dseed)) {
            dseed = generateCompactForm(dseed);
        }

        const uid = {};
        uid.tag = 'u';
        uid.random = Buffer.from(crypto.generateSafeUid(dseed));

        return uid;
    }

    function generateCompactForm({tag, random, backup}) {
        let compactId = tag + random.toString('base64');
        if (backup) {
            compactId += '|' + Buffer.from(JSON.stringify(backup)).toString('base64');
        }
        return Buffer.from(encodeURIComponent(compactId));
    }

    function encrypt(id, encryptionKey) {
        if(arguments.length !== 2){
            throw new Error(`Wrong number of arguments. Expected: 2; provided ${arguments.length}`);
        }

        let tag;
        if (typeof id === "object" && !Buffer.isBuffer(id)) {
            tag = id.tag;
            id = generateCompactForm(id);
        }

        if (tag === 's') {
            //TODO encrypt seed
        }else if (tag === 'd') {
            //TODO encrypt dseed
        }else{
            throw new Error("The provided id cannot be encrypted");
        }

    }

    function load(compactId) {
        if(typeof compactId === "undefined") {
            throw new Error(`Expected type string or Buffer. Received undefined`);
        }

        if(typeof compactId !== "string"){
            if (typeof compactId === "object" && !Buffer.isBuffer(compactId)) {
                compactId = Buffer.from(compactId);
            }

            compactId = compactId.toString();
        }

        const decodedCompactId = decodeURIComponent(compactId);
        const id = {};
        const splitCompactId = decodedCompactId.substring(1).split('|');

        id.tag = decodedCompactId[0];
        id.random = Buffer.from(splitCompactId[0], 'base64');

        if(splitCompactId[1] && splitCompactId[1].length > 0){
            id.backup = JSON.parse(Buffer.from(splitCompactId[1], 'base64').toString());
        }

        return id;
    }
}

module.exports = CSBIdentifier;

}).call(this,require("buffer").Buffer)

},{"buffer":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/RawCSB.js":[function(require,module,exports){
const OwM = require('swarmutils').OwM;
const pskdb = require('pskdb');

function RawCSB(initData) {
	const data = new OwM({blockchain: initData});
	const blockchain = pskdb.startDb({getInitValues, persist});

	if(!data.blockchain) {
		data.blockchain = {
			transactionLog : '',
			embeddedFiles: {}
		};
	}

	data.embedFile = function (fileAlias, fileData) {
		const embeddedAsset = data.getAsset("global.EmbeddedFile", fileAlias);
		if(embeddedAsset.isPersisted()){
			console.log(`File with alias ${fileAlias} already exists`);
			return;
		}

		data.blockchain.embeddedFiles[fileAlias] = fileData;
		data.saveAsset(embeddedAsset);
	};

	data.attachFile = function (fileAlias, path, seed) {
		data.modifyAsset("global.FileReference", fileAlias, (file) => {
			if (!file.isEmpty()) {
				console.log(`File with alias ${fileAlias} already exists`);
				return;
			}

			file.init(fileAlias, path, seed);
		});
	};

	data.saveAsset = function(asset) {
		const transaction = blockchain.beginTransaction({});
		transaction.add(asset);
		blockchain.commit(transaction);
	};

	data.modifyAsset = function(assetType, aid, assetModifier) {
		const transaction = blockchain.beginTransaction({});
		const asset = transaction.lookup(assetType, aid);
		assetModifier(asset);

		transaction.add(asset);
		blockchain.commit(transaction);
	};

	data.getAsset = function (assetType, aid) {
		const transaction = blockchain.beginTransaction({});
		return transaction.lookup(assetType, aid);
	};

	data.getAllAssets = function(assetType) {
		const transaction = blockchain.beginTransaction({});
		return transaction.loadAssets(assetType);
	};

	/* internal functions */

	function persist(transactionLog, currentValues, currentPulse) {
		transactionLog.currentPulse = currentPulse;

		data.blockchain.currentValues = currentValues;
		data.blockchain.transactionLog += mkSingleLine(JSON.stringify(transactionLog)) + "\n";
	}

	function getInitValues () {
		if(!data.blockchain || !data.blockchain.currentValues) {
			return null;
		}
		return data.blockchain.currentValues;
	}

	function mkSingleLine(str) {
		return str.replace(/\n|\r/g, "");
	}

	return data;
}

module.exports = RawCSB;
},{"pskdb":"pskdb","swarmutils":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/RootCSB.js":[function(require,module,exports){
const RawCSB = require('./RawCSB');
const fs = require('fs');
const crypto = require('pskcrypto');
const utils = require('../utils/utils');
const DseedCage = require('../utils/DseedCage');
const HashCage = require('../utils/HashCage');
const CSBCache = require("./CSBCache");
const CSBIdentifier = require("./CSBIdentifier");
const EventEmitter = require('events');

const rawCSBCache = new CSBCache(10);
const instances = {};

/**
 *
 * @param localFolder   - required
 * @param currentRawCSB - optional
 * @param csbIdentifier - required
 * @constructor
 */
function RootCSB(localFolder, currentRawCSB, csbIdentifier) {
    if (!localFolder || !csbIdentifier) {
        throw new Error('Missing required parameters');
    }


    const hashCage = new HashCage(localFolder);
    const event = new EventEmitter();
    this.on = event.on;
    this.off = event.removeListener;
    this.removeAllListeners = event.removeAllListeners;
    this.emit = event.emit;

    this.getMidRoot = function (CSBPath, callback) {
        throw new Error('Not implemented');
    };

    this.loadRawCSB = function (CSBPath, callback) {
        if (!currentRawCSB) {
            __loadRawCSB(csbIdentifier, (err, rawCSB) => {
                if (err) {
                    return callback(err);
                }

                currentRawCSB = rawCSB;

                if (CSBPath || CSBPath !== '') {
                    this.loadRawCSB(CSBPath, callback);
                    return;
                }

                callback(undefined, currentRawCSB);
            });
            return;
        }
        if (!CSBPath || CSBPath === '') {
            return callback(null, currentRawCSB);
        }

        this.loadAssetFromPath(CSBPath, (err, asset, rawCSB) => {

            if (err) {
                return callback(err);
            }

            if (!asset || !asset.dseed) {
                return callback(new Error(`The CSBPath ${CSBPath} is invalid.`));
            }

            __loadRawCSB(new CSBIdentifier(asset.dseed), callback);
        });
    };

    this.saveRawCSB = function (rawCSB, CSBPath, callback) {
        // save master
        if (!CSBPath || CSBPath === '') {
            if (rawCSB) {
                currentRawCSB = rawCSB;
            }

            __initializeAssets(currentRawCSB);
            return __writeRawCSB(currentRawCSB, csbIdentifier, callback);
        }

        // save csb in hierarchy
        const splitPath = __splitPath(CSBPath);
        this.loadAssetFromPath(CSBPath, (err, csbReference) => {
            if (err) {
                return callback(err);
            }
            if (!csbReference.dseed) {
                const backups = csbIdentifier.getBackupUrls();
                const newCSBIdentifier = new CSBIdentifier(undefined, backups);
                const localSeed = newCSBIdentifier.getSeed();
                const localDseed = newCSBIdentifier.getDseed();
                csbReference.init(splitPath.assetAid, localSeed, localDseed);

                this.saveAssetToPath(CSBPath, csbReference, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    this.loadAssetFromPath(CSBPath, (err, csbRef) => {
                        if (err) {
                            return callback(err);
                        }

                        __initializeAssets(rawCSB, csbRef, backups);
                        __writeRawCSB(rawCSB, new CSBIdentifier(csbReference.dseed), (err) => {
                            if (err) {
                                return callback(err);
                            }

                            this.emit('end');
                            callback();
                        });
                    });
                });
            } else {
                __writeRawCSB(rawCSB, new CSBIdentifier(csbReference.dseed), callback);
            }
        });
    };

    this.saveAssetToPath = function (CSBPath, asset, callback) {
        const splitPath = __splitPath(CSBPath, {keepAliasesAsString: true});
        this.loadRawCSB(splitPath.CSBAliases, (err, rawCSB) => {
            if (err) {
                return callback(err);
            }
            try {
                rawCSB.saveAsset(asset);
                this.saveRawCSB(rawCSB, splitPath.CSBAliases, callback);
            } catch (e) {
                return callback(e);
            }
        });
    };

    this.loadAssetFromPath = function (CSBPath, callback) {
        const processedPath = __splitPath(CSBPath);
        if (!currentRawCSB) {
            return callback(new Error('currentRawCSB does not exist'));
        }

        let CSBReference = null;
        if (processedPath.CSBAliases.length > 0) {
            const nextAlias = processedPath.CSBAliases[0];
            CSBReference = currentRawCSB.getAsset('global.CSBReference', nextAlias);
        } else {
            if (!processedPath.assetType || !processedPath.assetAid) {
                return callback(new Error('Not asset type or id specified in CSBPath'));
            }

            CSBReference = currentRawCSB.getAsset(processedPath.assetType, processedPath.assetAid);
        }

        if (processedPath.CSBAliases.length === 0) {
            return callback(null, CSBReference, currentRawCSB);
        }

        processedPath.CSBAliases.shift();

        if(!CSBReference || !CSBReference.dseed){
            return callback(new Error(`The CSBPath ${CSBPath} is invalid`));
        }
        __loadAssetFromPath(processedPath, new CSBIdentifier(CSBReference.dseed), 0, callback);
    };


    /* ------------------- INTERNAL METHODS ------------------- */

    function __loadRawCSB(localCSBIdentifier, callback) {
        const uid = localCSBIdentifier.getUid();
        const cachedRawCSB = rawCSBCache.load(uid);

        if (cachedRawCSB) {
            return callback(null, cachedRawCSB);
        }

        const rootPath = utils.generatePath(localFolder, localCSBIdentifier);
        fs.readFile(rootPath, (err, encryptedCsb) => {
            if (err) {
                return callback(err);
            }

            crypto.decryptObject(encryptedCsb, localCSBIdentifier.getDseed(), (err, csbData) => {
                if (err) {
                    return callback(err);
                }
                const csb = new RawCSB(csbData);
                rawCSBCache.put(uid, csb);
                callback(null, csb);
            });
        });
    }

    /**
     *
     * @param CSBPath: string - internal path that looks like /{CSBName1}/{CSBName2}:{assetType}:{assetAliasOrId}
     * @param options:object
     * @returns {{CSBAliases: [string], assetAid: (*|undefined), assetType: (*|undefined)}}
     * @private
     */
    function __splitPath(CSBPath, options = {}) {
        const pathSeparator = '/';

        if (CSBPath.startsWith(pathSeparator)) {
            CSBPath = CSBPath.substring(1);
        }

        let CSBAliases = CSBPath.split(pathSeparator);
        if (CSBAliases.length < 1) {
            throw new Error('CSBPath too short');
        }

        const lastIndex = CSBAliases.length - 1;
        const optionalAssetSelector = CSBAliases[lastIndex].split(':');

        if (optionalAssetSelector[0] === '') {
            CSBAliases = [];
        } else {
            CSBAliases[lastIndex] = optionalAssetSelector[0];
        }

        if (!optionalAssetSelector[1] && !optionalAssetSelector[2]) {
            optionalAssetSelector[1] = 'global.CSBReference';
            optionalAssetSelector[2] = CSBAliases[lastIndex];
            CSBAliases.pop();
        }

        if (options.keepAliasesAsString === true) {
            CSBAliases = CSBAliases.join('/');
        }
        return {
            CSBAliases: CSBAliases,
            assetType: optionalAssetSelector[1],
            assetAid: optionalAssetSelector[2]
        };
    }

    function __loadAssetFromPath(processedPath, localCSBIdentifier, currentIndex, callback) {
        __loadRawCSB(localCSBIdentifier, (err, rawCSB) => {
            if (err) {
                return callback(err);
            }

            if (currentIndex < processedPath.CSBAliases.length) {
                const nextAlias = processedPath.CSBAliases[currentIndex];
                const asset = rawCSB.getAsset("global.CSBReference", nextAlias);
                const newCSBIdentifier = new CSBIdentifier(asset.dseed);

                __loadAssetFromPath(processedPath, newCSBIdentifier, ++currentIndex, callback);
                return;
            }

            const asset = rawCSB.getAsset(processedPath.assetType, processedPath.assetAid);
            callback(null, asset, rawCSB);

        });

    }

    function __writeRawCSB(rawCSB, localCSBIdentifier, callback) {
        crypto.encryptObject(rawCSB.blockchain, localCSBIdentifier.getDseed(), null, (err, encryptedBlockchain) => {
            if (err) {
                return callback(err);
            }

            hashCage.loadHash((err, hashObj) => {
                if (err) {
                    return callback(err);
                }

                const key = localCSBIdentifier.getUid();
                hashObj[key] = crypto.pskHash(encryptedBlockchain).toString('hex');

                hashCage.saveHash(hashObj, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    fs.writeFile(utils.generatePath(localFolder, localCSBIdentifier), encryptedBlockchain, callback);
                });
            });
        });
    }

    function __initializeAssets(rawCSB, csbRef, backupUrls) {

        let isMaster;

        const csbMeta = rawCSB.getAsset('global.CSBMeta', 'meta');
        if (currentRawCSB === rawCSB) {
            isMaster = typeof csbMeta.isMaster === 'undefined' ? true : csbMeta.isMaster;
            if (!csbMeta.id) {
                csbMeta.init($$.uidGenerator.safe_uuid());
                csbMeta.setIsMaster(isMaster);
                rawCSB.saveAsset(csbMeta);
            }
        } else {
            backupUrls.forEach((url) => {
                const uid = $$.uidGenerator.safe_uuid();
                const backup = rawCSB.getAsset('global.Backup', uid);
                backup.init(uid, url);
                rawCSB.saveAsset(backup);
            });

            isMaster = typeof csbMeta.isMaster === 'undefined' ? false : csbMeta.isMaster;
            csbMeta.init(csbRef.getMetadata('swarmId'));
            csbMeta.setIsMaster(isMaster);
            rawCSB.saveAsset(csbMeta);
        }
    }
}


function createRootCSB(localFolder, masterRawCSB, csbIdentifier, pin, callback) {
    let masterDseed;

    if (csbIdentifier) {
        masterDseed = csbIdentifier.getDseed();
        if (masterRawCSB) {
            const rootCSB = new RootCSB(localFolder, masterRawCSB, masterDseed);
            return callback(null, rootCSB);
        }

        return loadWithIdentifier(localFolder, masterDseed, callback);
    } else if (pin) {

        return loadWithPin(localFolder, pin, callback);
    } else {
        return callback(new Error('Missing seed, dseed and pin, at least one is required'));
    }
}

function loadWithPin(localFolder, pin, callback) {
    new DseedCage(localFolder).loadDseedBackups(pin, (err, csbIdentifier, backups) => {
        if (err) {
            return callback(err);
        }

        if (!csbIdentifier && (!backups || backups.length === 0)) {
            return callback();
        }

        if (!csbIdentifier) {
            return callback(undefined, undefined, undefined, backups);
        }

        const dseed = csbIdentifier.getDseed();
        const key = crypto.generateSafeUid(dseed, localFolder);
        if (!instances[key]) {
            instances[key] = new RootCSB(localFolder, null, csbIdentifier);
        }

        const rootCSB = instances[key];

        rootCSB.loadRawCSB('', (err) => {
            if (err) {
                return callback(err);
            }
            callback(undefined, rootCSB, csbIdentifier, backups);
        });
    });
}

function loadWithIdentifier(localFolder, csbIdentifier, callback) {
    const masterDseed = csbIdentifier.getDseed();
    const key = crypto.generateSafeUid(masterDseed, localFolder);
    if (!instances[key]) {
        instances[key] = new RootCSB(localFolder, null, csbIdentifier);
    }

    const rootCSB = instances[key];
    rootCSB.loadRawCSB('', (err) => {
        if (err) {
            return callback(err);
        }
        callback(null, rootCSB);
    });
}

function createNew(localFolder, csbIdentifier, rawCSB) {
    if (!localFolder || !csbIdentifier) {
        throw new Error("Missing required arguments");
    }

    rawCSB = rawCSB || new RawCSB();
    const masterDseed = csbIdentifier.getDseed();
    const key = crypto.generateSafeUid(masterDseed, localFolder);
    if (!instances[key]) {
        instances[key] = new RootCSB(localFolder, rawCSB, csbIdentifier);
    }

    return instances[key];
}

function writeNewMasterCSB(localFolder, csbIdentifier, callback) {
    if (!localFolder || !csbIdentifier) {
        return callback(new Error('Missing required arguments'));
    }

    const masterDseed = csbIdentifier.getDseed();
    const key = crypto.generateSafeUid(masterDseed, localFolder);
    if (!instances[key]) {
        instances[key] = new RootCSB(localFolder, null, csbIdentifier);
    }

    const rootCSB = instances[key];
    rootCSB.saveRawCSB(new RawCSB(), '', callback);
}

module.exports = {
    createNew,
    createRootCSB,
    loadWithIdentifier,
    loadWithPin,
    writeNewMasterCSB
};
},{"../utils/DseedCage":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/DseedCage.js","../utils/HashCage":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/HashCage.js","../utils/utils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/utils.js","./CSBCache":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/CSBCache.js","./CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","./RawCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/RawCSB.js","events":false,"fs":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/backupResolvers/EVFSResolver.js":[function(require,module,exports){

function EVFSResolver() {
    let isAuthenticated = false;

    this.auth = function (url, authObj, callback) {
        isAuthenticated = true;
        callback();
    };

    this.save = function (url, csbIdentifier, dataStream, callback) {
        if (!isAuthenticated) {
            return callback(new Error('Unauthenticated'));
        }

        $$.remote.doHttpPost(url + "/CSB/" + csbIdentifier.getUid(), dataStream, (err, res) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, res);
        });
    };

    this.load = function (url, csbIdentifier, version, callback) {
        if (!isAuthenticated) {
            return callback(new Error('Unauthenticated'));
        }

        if (typeof version === "function") {
            callback = version;
            version = "";
        }

        $$.remote.doHttpGet(url + "/CSB/" + csbIdentifier.getUid() + "/" + version, (err, resource) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, resource);
        });

    };

    this.getVersions = function (url, csbIdentifier, callback) {
        if (!isAuthenticated) {
            return callback(new Error('Unauthenticated'));
        }

        $$.remote.doHttpGet(url + "/CSB/" + csbIdentifier.getUid() + "/versions", (err, versions) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, JSON.parse(versions));
        });
    };

    this.compareVersions = function (url, filesList, callback) {
        if (!isAuthenticated) {
            return callback(new Error('Unauthenticated'));
        }

        $$.remote.doHttpPost(url + "/CSB/compareVersions", JSON.stringify(filesList), (err, modifiedFiles) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, modifiedFiles);
        });
    };
}

module.exports = EVFSResolver;
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/addBackup.js":[function(require,module,exports){
const flowsUtils = require("../../utils/flowsUtils");
const validator = require("../../utils/validator");
const DseedCage = require("../../utils/DseedCage");
const fs = require('fs');
const path = require('path');

$$.swarm.describe("addBackup", {
    start: function (backupUrl, localFolder = process.cwd()) {
        if(!backupUrl){
            return this.swarm("interaction", "handleError", new Error("No backup url provided"));
        }

        this.localFolder = localFolder;
        this.backupUrl = backupUrl;
        fs.stat(path.join(this.localFolder, ".privateSky", 'dseed'), (err, stats)=>{
            if(err){
                this.swarm("interaction", "createPin", flowsUtils.defaultPin, flowsUtils.noTries);
            }else{
                this.swarm("interaction", "readPin", flowsUtils.noTries);
            }
        });
    },

    validatePin: function (pin) {
        validator.validatePin(this.localFolder, this, "addBackup", pin, flowsUtils.noTries);
    },
    
    addBackup: function (pin = flowsUtils.defaultPin, backups) {
        backups = backups || [];
        backups.push(this.backupUrl);
        const dseedCage = new DseedCage(this.localFolder);
        dseedCage.saveDseedBackups(pin, this.csbIdentifier, backups, validator.reportOrContinue(this, 'finish', "Failed to save backups"));
    },

    finish: function () {
        this.swarm("interaction", 'printInfo', this.backupUrl + ' has been successfully added to backups list.');
    }
});
},{"../../utils/DseedCage":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/DseedCage.js","../../utils/flowsUtils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/flowsUtils.js","../../utils/validator":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/validator.js","fs":false,"path":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/addCsb.js":[function(require,module,exports){
// var path = require("path");

const utils = require("./../../utils/flowsUtils");
// const crypto = require("pskcrypto");
// var fs = require("fs");

$$.swarm.describe("addCsb", {
	start: function (aliasCsb, aliasDestCsb) {
		this.aliasCsb = aliasCsb;
		this.aliasDestCsb = aliasDestCsb;
		this.swarm("interaction", "readPin", 3);
	},
	validatePin: function (pin, noTries) {
		var self = this;
		utils.checkPinIsValid(pin, function (err) {
			if(err){
				self.swarm("interaction", "readPin", noTries-1);
			}else {
				self.addCsb(pin, self.aliasCsb);
			}
		});
	},
	addCsb: function (pin, aliasCSb, aliasDestCsb, callback) {
		var self = this;
		utils.getCsb(pin, aliasCSb, function (err, parentCsb) {
			if(err){
				self.swarm("interaction", "handleError", err, "Failed to get csb");
			}
		});
	}
});
},{"./../../utils/flowsUtils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/flowsUtils.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/attachFile.js":[function(require,module,exports){
const flowsUtils = require("./../../utils/flowsUtils");
const utils = require("./../../utils/utils");
const crypto = require("pskcrypto");
const fs = require("fs");
const path = require('path');
const validator = require("../../utils/validator");
const CSBIdentifier = require("../CSBIdentifier");
const HashCage = require('../../utils/HashCage');
const RootCSB = require("../RootCSB");

$$.swarm.describe("attachFile", { //url: CSB1/CSB2/aliasFile
    start: function (url, filePath, localFolder = process.cwd()) { //csb1:assetType:alias
        const {CSBPath, alias} = utils.processUrl(url, 'FileReference');
        this.CSBPath = CSBPath;
        this.alias = alias;
        this.filePath = filePath;
        this.localFolder = localFolder;
        this.swarm("interaction", "readPin", flowsUtils.noTries);
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, 'loadFileReference', pin, noTries);
    },

    withCSBIdentifier: function (id, url, filePath, localFolder = process.cwd()) {
        const {CSBPath, alias} = utils.processUrl(url, 'FileReference');
        this.CSBPath = CSBPath;
        this.alias = alias;
        this.filePath = filePath;
        this.localFolder = localFolder;
        this.csbIdentifier = new CSBIdentifier(id);
        RootCSB.loadWithIdentifier(this.localFolder, this.csbIdentifier, (err, rootCSB) => {
            if (err) {
                this.swarm("interaction", "handleError", err, "Failed to load rootCSB");
                return;
            }

            this.rootCSB = rootCSB;
            this.loadFileReference();

        });
    },

    loadFileReference: function () {
        this.rootCSB.loadRawCSB('', validator.reportOrContinue(this, 'loadAsset', 'Failed to load masterCSB.'));
    },

    loadAsset: function () {
        this.rootCSB.loadAssetFromPath(this.CSBPath, validator.reportOrContinue(this, 'saveFileToDisk', 'Failed to load asset'));
    },

    saveFileToDisk: function (fileReference) {
        if (fileReference.isPersisted()) {
            this.swarm("interaction", "handleError", new Error("File is persisted"), "A file with the same alias already exists ");
            return;
        }

        const csbIdentifier = new CSBIdentifier(undefined, this.csbIdentifier.getBackupUrls());
        this.fileID = utils.generatePath(this.localFolder, csbIdentifier);
        crypto.on('progress', (progress) => {
            this.swarm('interaction', 'reportProgress', progress);
        });
        crypto.encryptStream(this.filePath, this.fileID, csbIdentifier.getDseed(), validator.reportOrContinue(this, 'saveFileReference', "Failed at file encryption.", fileReference, csbIdentifier));

    },


    saveFileReference: function (fileReference, csbIdentifier) {
        crypto.removeAllListeners('progress');
        fileReference.init(this.alias, csbIdentifier.getSeed(), csbIdentifier.getDseed());
        this.rootCSB.saveAssetToPath(this.CSBPath, fileReference, validator.reportOrContinue(this, 'computeHash', "Failed to save file", this.fileID));
    },


    computeHash: function () {
        const fileStream = fs.createReadStream(this.fileID);
        crypto.pskHashStream(fileStream, validator.reportOrContinue(this, "loadHashObj", "Failed to compute hash"));
    },

    loadHashObj: function (digest) {
        this.hashCage = new HashCage(this.localFolder);
        this.hashCage.loadHash(validator.reportOrContinue(this, "addToHashObj", "Failed to load hashObj", digest));
    },

    addToHashObj: function (hashObj, digest) {
        hashObj[path.basename(this.fileID)] = digest.toString("hex");
        this.hashCage.saveHash(hashObj, validator.reportOrContinue(this, "printSuccess", "Failed to save hashObj"));
    },

    printSuccess: function () {
        this.swarm("interaction", "printInfo", this.filePath + " has been successfully added to " + this.CSBPath);
        this.swarm("interaction", "__return__");
    }
});

},{"../../utils/HashCage":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/HashCage.js","../../utils/validator":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/validator.js","../CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","../RootCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/RootCSB.js","./../../utils/flowsUtils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/flowsUtils.js","./../../utils/utils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/utils.js","fs":false,"path":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/createCsb.js":[function(require,module,exports){
const flowsUtils = require('../../utils/flowsUtils');
const RootCSB = require("../RootCSB");
const RawCSB = require("../RawCSB");
const validator = require("../../utils/validator");
const DseedCage = require("../../utils/DseedCage");
const CSBIdentifier = require("../CSBIdentifier");

$$.swarm.describe("createCsb", {
    start: function (CSBPath, localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.CSBPath = CSBPath || '';
        validator.checkMasterCSBExists(localFolder, (err, status) => {
            if (err) {
                this.swarm("interaction", "createPin", flowsUtils.defaultPin);
            } else {
                this.swarm("interaction", "readPin", flowsUtils.noTries);
            }
        });
    },

    withoutPin: function (CSBPath, backups, localFolder = process.cwd(), seed, isMaster = false) {
        this.localFolder = localFolder;
        this.CSBPath = CSBPath;
        this.isMaster = isMaster;
        if (typeof backups === 'undefined' || backups.length === 0) {
            backups = [ flowsUtils.defaultBackup ];
        }

        validator.checkMasterCSBExists(localFolder, (err, status) => {
            if (err) {
                this.createMasterCSB(backups);
            } else {
                const csbIdentifier = new CSBIdentifier(seed);
                this.withCSBIdentifier(CSBPath, csbIdentifier);
            }
        });

    },

    withCSBIdentifier: function (CSBPath, csbIdentifier) {
        this.CSBPath = CSBPath;
        RootCSB.loadWithIdentifier(this.localFolder, csbIdentifier, validator.reportOrContinue(this, 'createCSB', 'Failed to load master with provided dseed'));
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, "createCSB", pin, noTries);
    },

    loadBackups: function (pin) {
        this.pin = pin;
        this.dseedCage = new DseedCage(this.localFolder);
        this.dseedCage.loadDseedBackups(this.pin, (err, csbIdentifier, backups) => {
            if (err) {
                this.createMasterCSB();
            } else {
                this.createMasterCSB(backups);
            }
        });
    },

    createMasterCSB: function (backups) {
        this.csbIdentifier = new CSBIdentifier(undefined, backups || flowsUtils.defaultBackup);

        this.swarm("interaction", "printSensitiveInfo", this.csbIdentifier.getSeed(), flowsUtils.defaultPin);

        const rawCSB = new RawCSB();
        const meta = rawCSB.getAsset('global.CSBMeta', 'meta');
        meta.init();
        meta.setIsMaster(true);
        if (typeof this.isMaster !== 'undefined') {
            meta.setIsMaster(this.isMaster);
        }
        rawCSB.saveAsset(meta);
        this.rootCSB = RootCSB.createNew(this.localFolder, this.csbIdentifier, rawCSB);
        const nextPhase = (this.CSBPath === '' || typeof this.CSBPath === 'undefined') ? 'saveRawCSB' : 'createCSB';
        if (this.pin) {
            this.dseedCage.saveDseedBackups(this.pin, this.csbIdentifier, backups, validator.reportOrContinue(this, nextPhase, "Failed to save dseed "));
        } else {
            this[nextPhase]();
        }
    },

    createCSB: function (rootCSB) {
        this.rootCSB = this.rootCSB || rootCSB;
        const rawCSB = new RawCSB();
        const meta = rawCSB.getAsset("global.CSBMeta", "meta");
        meta.init();
        meta.setIsMaster(false);
        rawCSB.saveAsset(meta);
        this.saveRawCSB(rawCSB);
    },

    saveRawCSB: function (rawCSB) {
        this.rootCSB.saveRawCSB(rawCSB, this.CSBPath, validator.reportOrContinue(this, "printSuccess", "Failed to save raw CSB"));

    },


    printSuccess: function () {
        let message = "Successfully saved CSB at path " + this.CSBPath;
        if (!this.CSBPath || this.CSBPath === '') {
            message = 'Successfully saved CSB root';
        }
        this.swarm("interaction", "printInfo", message);
        this.swarm('interaction', '__return__');
    }
});

},{"../../utils/DseedCage":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/DseedCage.js","../../utils/flowsUtils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/flowsUtils.js","../../utils/validator":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/validator.js","../CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","../RawCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/RawCSB.js","../RootCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/RootCSB.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/extractFile.js":[function(require,module,exports){
const flowsUtils = require("./../../utils/flowsUtils");
const utils = require("./../../utils/utils");
const crypto = require("pskcrypto");
const validator = require("../../utils/validator");
const CSBIdentifier = require("../CSBIdentifier");

$$.swarm.describe("extractFile", {
	start: function (url, localFolder = process.cwd()) {
		this.localFolder = localFolder;
		const {CSBPath, alias} = utils.processUrl(url, 'global.FileReference');
		this.CSBPath = CSBPath;
		this.alias = alias;
		this.swarm("interaction", "readPin", flowsUtils.noTries);
	},

	validatePin: function (pin, noTries) {
		validator.validatePin(this.localFolder, this, "loadFileAsset", pin, noTries);
	},

	loadFileAsset: function () {
		this.rootCSB.loadAssetFromPath(this.CSBPath, validator.reportOrContinue(this, "decryptFile", "Failed to load file asset " + this.alias));
	},
	
	decryptFile: function (fileReference) {
		const csbIdentifier = new CSBIdentifier(fileReference.dseed);
		const filePath = utils.generatePath(this.localFolder, csbIdentifier);

		crypto.on('progress', (progress) => {
            this.swarm('interaction', 'reportProgress', progress);
        });

		crypto.decryptStream(filePath, this.localFolder, csbIdentifier.getDseed(), (err, fileNames) => {
			if(err){
				return this.swarm("interaction", "handleError", err, "Failed to decrypt file" + filePath);
			}

			this.swarm("interaction", "printInfo", this.alias + " was successfully extracted. ");
			this.swarm("interaction", "__return__", fileNames);
		});
	}
});
},{"../../utils/validator":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/validator.js","../CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","./../../utils/flowsUtils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/flowsUtils.js","./../../utils/utils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/utils.js","pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/index.js":[function(require,module,exports){
require("callflow");

module.exports = $$.library(function () {
    require('./addCsb');
    require('./addBackup');
    require('./attachFile');
    require('./createCsb');
    require('./extractFile');
    require('./listCSBs');
    require('./resetPin');
    require('./restore');
    require('./receive');
	require('./saveBackup');
    require('./setPin');
});



},{"./addBackup":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/addBackup.js","./addCsb":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/addCsb.js","./attachFile":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/attachFile.js","./createCsb":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/createCsb.js","./extractFile":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/extractFile.js","./listCSBs":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/listCSBs.js","./receive":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/receive.js","./resetPin":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/resetPin.js","./restore":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/restore.js","./saveBackup":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/saveBackup.js","./setPin":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/setPin.js","callflow":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/listCSBs.js":[function(require,module,exports){
const flowsUtils = require("./../../utils/flowsUtils");
const validator = require("../../utils/validator");
// const fs = require("fs");
const RootCSB = require("../RootCSB");
const CSBIdentifier = require("../CSBIdentifier");

$$.swarm.describe("listCSBs", {
    start: function (CSBPath, localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.CSBPath = CSBPath || '';
        validator.checkMasterCSBExists(localFolder, (err, status) => {
            if (err) {
                this.swarm("interaction", "noMasterCSBExists");
            } else {
                this.swarm("interaction", "readPin", flowsUtils.noTries);
            }
        });
    },

    withCSBIdentifier: function (id, CSBPath = '', localFolder = process.cwd()) {
        this.csbIdentifier = new CSBIdentifier(id);
        this.CSBPath = CSBPath;
        this.localFolder = localFolder;
        this.loadMasterRawCSB();
    },

    loadMasterRawCSB: function () {
        RootCSB.loadWithIdentifier(this.localFolder, this.csbIdentifier, validator.reportOrContinue(this, "loadRawCSB", "Failed to create RootCSB."));
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, 'loadRawCSB', pin, noTries);
    },

    loadRawCSB: function (rootCSB) {
        if(typeof this.rootCSB === "undefined" && rootCSB){
            this.rootCSB = rootCSB;
        }
        this.rootCSB.loadRawCSB(this.CSBPath, validator.reportOrContinue(this, 'getCSBs', 'Failed to load rawCSB'));
    },

    getCSBs: function (rawCSB) {
        const csbReferences = rawCSB.getAllAssets('global.CSBReference');
        const csbsAliases = csbReferences.map((ref) => ref.alias);

        const fileReferences = rawCSB.getAllAssets('global.FileReference');
        const filesAliases = fileReferences.map((ref) => ref.alias);

        this.swarm("interaction", "__return__", {
            csbs: csbsAliases,
            files: filesAliases
        });
    }

});

},{"../../utils/validator":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/validator.js","../CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","../RootCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/RootCSB.js","./../../utils/flowsUtils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/flowsUtils.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/receive.js":[function(require,module,exports){

$$.swarm.describe("receive", {
    start: function (endpoint, channel) {

        const alias = 'remote';
        $$.remote.createRequestManager(1000);
        $$.remote.newEndPoint(alias, endpoint, channel);
        $$.remote[alias].on('*', '*', (err, swarm) => {
            if (err) {
                return this.swarm('interaction', 'handleError', err, 'Failed to get data from channel' + channel);
            }
            const seed = swarm.meta.args[0];
            this.swarm("interaction", "printSensitiveInfo", seed);

            $$.remote[alias].off("*", "*");
        });

    }
});
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/resetPin.js":[function(require,module,exports){
const utils = require("./../../utils/flowsUtils");
const RootCSB = require("../RootCSB");
const DseedCage = require("../../utils/DseedCage");
const CSBIdentifier = require("../CSBIdentifier");

$$.swarm.describe("resetPin", {
    start: function (localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.swarm("interaction", "readSeed", utils.noTries);
    },

    validateSeed: function (seed, noTries) {
        try{
            this.csbIdentifier = new CSBIdentifier(seed);
            RootCSB.loadWithIdentifier(this.localFolder, this.csbIdentifier, (err, rootCSB) => {
                if (err) {
                    this.swarm("interaction", "readSeed", noTries - 1);
                }else{
                    this.swarm("interaction", "insertPin", utils.noTries);
                }
            });
        } catch (e) {
            return this.swarm('interaction', 'handleError', new Error('Invalid seed'));
        }
    },

    actualizePin: function (pin) {
        const dseedCage = new DseedCage(this.localFolder);
        dseedCage.saveDseedBackups(pin, this.csbIdentifier, undefined, (err)=>{
            if(err){
                return this.swarm("interaction", "handleError", "Failed to save dseed.");
            }

            this.swarm("interaction", "printInfo", "The pin has been changed successfully.");
        });
    }
});

},{"../../utils/DseedCage":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/DseedCage.js","../CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","../RootCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/RootCSB.js","./../../utils/flowsUtils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/flowsUtils.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/restore.js":[function(require,module,exports){
const path = require("path");
const flowsUtils = require("./../../utils/flowsUtils");
const utils = require("./../../utils/utils");
const crypto = require("pskcrypto");
const fs = require("fs");
const validator = require("../../utils/validator");
const DseedCage = require("../../utils/DseedCage");
const RootCSB = require('../RootCSB');
const CSBIdentifier = require('../CSBIdentifier');
const BackupEngine = require('../BackupEngine');
const HashCage = require('../../utils/HashCage');
const AsyncDispatcher = require('../../utils/AsyncDispatcher');


$$.swarm.describe("restore", {
    start: function (url, localFolder = process.cwd()) {
        this.localFolder = localFolder;
        if (url) {
            const {CSBPath, alias} = utils.processUrl(url, 'global.CSBReference');
            this.CSBPath = CSBPath;
            this.CSBAlias = alias;
        }

        this.swarm("interaction", "readSeed");
    },

    withSeed: function (url, localFolder = process.cwd(), seedRestore, localSeed) {
        this.localFolder = localFolder;
        if (url) {
            const {CSBPath, alias} = utils.processUrl(url, 'global.CSBReference');
            this.CSBPath = CSBPath;
            this.CSBAlias = alias;
        }

        if (localSeed) {
            this.localCSBIdentifier = new CSBIdentifier(localSeed);
        }

        this.restoreCSB(seedRestore);
    },

    restoreCSB: function (restoreSeed) {
        this.hashCage = new HashCage(this.localFolder);
        this.hashObj = {};
        this.csbRestoreIdentifier = new CSBIdentifier(restoreSeed);
        let backupUrls;
        try {
            backupUrls = this.csbRestoreIdentifier.getBackupUrls();
        } catch (e) {
            return this.swarm('interaction', 'handleError', new Error('Invalid seed'));
        }

        this.backupUrls = backupUrls;
        this.restoreDseedCage = new DseedCage(this.localFolder);
        const backupEngine = new BackupEngine.getBackupEngine(this.backupUrls);

        backupEngine.load(this.csbRestoreIdentifier, (err, encryptedCSB) => {
            if (err) {
                return this.swarm("interaction", "handleError", err, "Failed to restore CSB");
            }

            this.__addCSBHash(this.csbRestoreIdentifier, encryptedCSB);
            this.encryptedCSB = encryptedCSB;

            validator.checkMasterCSBExists(this.localFolder, (err, status) => {
                if (err) {
                    console.log(err);
                }
                if (status === false) {
                    this.createAuxFolder();
                } else if (this.localCSBIdentifier) {
                    if (!this.CSBAlias) {
                        utils.deleteRecursively(this.localFolder, true, (err) => {
                            if (err) {
                                console.log(err);
                            }
                            return this.swarm("interaction", "handleError", new Error("No CSB alias was specified"));
                        });
                    } else {
                        this.writeCSB();
                    }
                } else {
                    if (!this.CSBAlias) {
                        return this.swarm("interaction", "handleError", new Error("No CSB alias was specified"));
                    } else {
                        this.swarm("interaction", "readPin", flowsUtils.noTries);
                    }
                }
            });
        });
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, "writeCSB", pin, noTries);
    },

    createAuxFolder: function () {
        fs.mkdir(path.join(this.localFolder, ".privateSky"), {recursive: true}, validator.reportOrContinue(this, "writeCSB", "Failed to create folder .privateSky"));
    },


    writeCSB: function () {
        fs.writeFile(utils.generatePath(this.localFolder, this.csbRestoreIdentifier), this.encryptedCSB, validator.reportOrContinue(this, "createRootCSB", "Failed to write masterCSB to disk"));
    },

    createRootCSB: function () {
        RootCSB.loadWithIdentifier(this.localFolder, this.csbRestoreIdentifier, validator.reportOrContinue(this, "loadRawCSB", "Failed to create rootCSB with dseed"));
    },

    loadRawCSB: function (rootCSB) {

        this.asyncDispatcher = new AsyncDispatcher(( errs, succs) => {
            this.hashCage.saveHash(this.hashObj, (err) => {
                if (err) {
                    return this.swarm('interaction', 'handleError', err, 'Failed to save hashObj');
                }
                this.swarm('interaction', 'printInfo', 'All CSBs have been restored.');
                this.swarm('interaction', '__return__');

            });
        });
        rootCSB.loadRawCSB('', validator.reportOrContinue(this, "checkCSBStatus", "Failed to load RawCSB", rootCSB));
    },

    checkCSBStatus: function (rawCSB, rootCSB) {
        this.rawCSB = rawCSB;
        const meta = this.rawCSB.getAsset('global.CSBMeta', 'meta');
        if (this.rootCSB) {
            this.attachCSB(this.rootCSB, this.CSBPath, this.CSBAlias, this.csbRestoreIdentifier);
        } else {
            if (meta.isMaster) {
                this.rootCSB = rootCSB;
                this.saveDseed();
            } else {
                this.createMasterCSB();
            }
        }
    },

    saveDseed: function () {
        this.restoreDseedCage.saveDseedBackups(flowsUtils.defaultPin, this.csbRestoreIdentifier, undefined, validator.reportOrContinue(this, "collectFiles", "Failed to save dseed", this.rawCSB, this.csbRestoreIdentifier, '', 'master'));
    },


    createMasterCSB: function () {
        const csbIdentifier = new CSBIdentifier(undefined, this.backupUrls);
        this.swarm("interaction", "printSensitiveInfo", csbIdentifier.getSeed(), flowsUtils.defaultPin);
        this.rootCSB = RootCSB.createNew(this.localFolder, csbIdentifier);
        this.restoreDseedCage.saveDseedBackups(flowsUtils.defaultPin, csbIdentifier, undefined, validator.reportOrContinue(this, "attachCSB", "Failed to save master dseed ", this.rootCSB, this.CSBPath, this.CSBAlias, this.csbRestoreIdentifier));
    },


    attachCSB: function (rootCSB, CSBPath, CSBAlias, csbIdentifier) {
        this.__attachCSB(rootCSB, CSBPath, CSBAlias, csbIdentifier, validator.reportOrContinue(this, 'loadRestoredRawCSB', 'Failed to attach rawCSB'));

    },

    loadRestoredRawCSB: function () {
        this.CSBPath = this.CSBPath.split(':')[0] + '/' + this.CSBAlias;
        this.rootCSB.loadRawCSB(this.CSBPath, validator.reportOrContinue(this, "collectFiles", "Failed to load restored RawCSB", this.csbRestoreIdentifier, this.CSBPath, this.CSBAlias));
    },

    collectFiles: function (rawCSB, csbIdentifier, currentPath, alias, callback) {

        const listFiles = rawCSB.getAllAssets('global.FileReference');
        const asyncDispatcher = new AsyncDispatcher((errs, succs) => {
            this.collectCSBs(rawCSB, csbIdentifier, currentPath, alias);
            if (callback) {
                return callback(errs, succs);
            }
        });

        if (listFiles.length === 0) {
            asyncDispatcher.markOneAsFinished();
        }

        listFiles.forEach((fileReference) => {
            const csbIdentifier = new CSBIdentifier(fileReference.dseed);
            const fileAlias = fileReference.alias;
            const urls = csbIdentifier.getBackupUrls();
            const backupEngine = BackupEngine.getBackupEngine(urls);
            asyncDispatcher.dispatchEmpty();
            backupEngine.load(csbIdentifier, (err, encryptedFile) => {
                if (err) {
                    return this.swarm('interaction', 'handleError', err, 'Could not download file ' + fileAlias);
                }

                this.__addCSBHash(csbIdentifier, encryptedFile);

                fs.writeFile(utils.generatePath(this.localFolder, csbIdentifier), encryptedFile, (err) => {
                    if (err) {
                        return this.swarm('interaction', 'handleError', err, 'Could not save file ' + fileAlias);
                    }

                    asyncDispatcher.markOneAsFinished(undefined, fileAlias);
                });
            });
        });
    },

    collectCSBs: function (rawCSB, csbIdentifier, currentPath, alias) {

        const listCSBs = rawCSB.getAllAssets('global.CSBReference');
        const nextArguments = [];
        let counter = 0;

        if (listCSBs.length === 0) {
            this.asyncDispatcher.dispatchEmpty();
            this.asyncDispatcher.markOneAsFinished();
        }

        if (listCSBs && listCSBs.length > 0) {
            listCSBs.forEach((CSBReference) => {
                const nextPath = currentPath + '/' + CSBReference.alias;
                const nextCSBIdentifier = new CSBIdentifier(CSBReference.dseed);
                const nextAlias = CSBReference.alias;
                const nextURLs = csbIdentifier.getBackupUrls();
                const backupEngine = BackupEngine.getBackupEngine(nextURLs);
                this.asyncDispatcher.dispatchEmpty();
                backupEngine.load(nextCSBIdentifier, (err, encryptedCSB) => {
                    if (err) {
                        return this.swarm('interaction', 'handleError', err, 'Could not download CSB ' + nextAlias);
                    }

                    this.__addCSBHash(nextCSBIdentifier, encryptedCSB);

                    fs.writeFile(utils.generatePath(this.localFolder, nextCSBIdentifier), encryptedCSB, (err) => {
                        if (err) {
                            return this.swarm('interaction', 'handleError', err, 'Could not save CSB ' + nextAlias);
                        }

                        this.rootCSB.loadRawCSB(nextPath, (err, nextRawCSB) => {

                            if (err) {
                                return this.swarm('interaction', 'handleError', err, 'Failed to load CSB ' + nextAlias);
                            }
                            nextArguments.push([ nextRawCSB, nextCSBIdentifier, nextPath, nextAlias ]);

                            if (++counter === listCSBs.length) {
                                nextArguments.forEach((args) => {
                                    this.collectFiles(...args, () => {
                                        this.asyncDispatcher.markOneAsFinished(undefined, alias);
                                    });
                                });
                            }
                        });
                    });
                });
            });
        }
    },

    __tryDownload(urls, csbIdentifier, index, callback) {
        if (index === urls.length) {
            return callback(new Error('Could not download resource'));
        }

        const url = urls[index];
        this.backupEngine.load(url, csbIdentifier, (err, resource) => {
            if (err) {
                return this.__tryDownload(urls, csbIdentifier, ++index, callback);
            }

            callback(undefined, resource);
        });

    },

    __addCSBHash: function (csbIdentifier, encryptedCSB) {
        const pskHash = new crypto.PskHash();
        pskHash.update(encryptedCSB);
        this.hashObj[csbIdentifier.getUid()] = pskHash.digest().toString('hex');

    },

    __attachCSB: function (rootCSB, CSBPath, CSBAlias, csbIdentifier, callback) {
        if (!CSBAlias) {
            return callback(new Error("No CSB alias was specified"));
        }

        rootCSB.loadRawCSB(CSBPath, (err, rawCSB) => {
            if (err) {
                rootCSB.loadAssetFromPath(CSBPath, (err, csbRef) => {
                    if (err) {
                        return callback(err);
                    }

                    csbRef.init(CSBAlias, csbIdentifier.getSeed(), csbIdentifier.getDseed());
                    rootCSB.saveAssetToPath(CSBPath, csbRef, (err) => {
                        if (err) {
                            return callback(err);
                        }

                        callback();
                    });

                });
            } else {
                return callback(new Error(`A CSB having the alias ${CSBAlias} already exists.`));
            }
        });
    }
});


},{"../../utils/AsyncDispatcher":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/AsyncDispatcher.js","../../utils/DseedCage":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/DseedCage.js","../../utils/HashCage":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/HashCage.js","../../utils/validator":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/validator.js","../BackupEngine":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/BackupEngine.js","../CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","../RootCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/RootCSB.js","./../../utils/flowsUtils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/flowsUtils.js","./../../utils/utils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/utils.js","fs":false,"path":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/saveBackup.js":[function(require,module,exports){
const utils = require("./../../utils/utils");
const fs = require("fs");
const validator = require("../../utils/validator");
const HashCage = require('../../utils/HashCage');
const AsyncDispatcher = require("../../utils/AsyncDispatcher");
const RootCSB = require('../RootCSB');
const CSBIdentifier = require('../CSBIdentifier');
const BackupEngine = require('../BackupEngine');
const path = require('path');


$$.swarm.describe("saveBackup", {
    start: function (localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.swarm("interaction", "readPin", 3);
    },

    validatePin: function (pin, noTries) {
        validator.validatePin(this.localFolder, this, "loadHashFile", pin, noTries);
    },

    withCSBIdentifier: function (id, localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.csbIdentifier = new CSBIdentifier(id);
        RootCSB.loadWithIdentifier(localFolder, this.csbIdentifier, (err, rootCSB) => {
            if (err) {
                this.swarm('interaction', 'handleError', err, 'Failed to load root CSB');
                return;
            }

            this.rootCSB = rootCSB;
            this.loadHashFile();
        });
    },

    loadHashFile: function (pin, backups) {
        this.backups = backups;
        this.hashCage = new HashCage(this.localFolder);
        this.hashCage.loadHash(validator.reportOrContinue(this, 'readEncryptedMaster', 'Failed to load hash file'));
    },

    readEncryptedMaster: function (hashFile) {
        this.hashFile = hashFile;
        this.masterID = utils.generatePath(this.localFolder, this.csbIdentifier);
        fs.readFile(this.masterID, validator.reportOrContinue(this, 'loadMasterRawCSB', 'Failed to read masterCSB.'));
    },


    loadMasterRawCSB: function () {
        this.rootCSB.loadRawCSB('', validator.reportOrContinue(this, "dispatcher", "Failed to load masterCSB"));
    },

    dispatcher: function (rawCSB) {
        this.asyncDispatcher = new AsyncDispatcher((errors, results) => {
            if (errors) {
                this.swarm('interaction', 'handleError', JSON.stringify(errors, null, '\t'), 'Failed to collect all CSBs');
                return;
            }
            this.collectFiles(results);
        });

        this.asyncDispatcher.dispatchEmpty();
        this.collectCSBs(rawCSB, this.csbIdentifier, '', 'master');
    },

    collectCSBs: function (rawCSB, csbIdentifier, currentPath, alias) {
        const listCSBs = rawCSB.getAllAssets('global.CSBReference');

        const nextArguments = [];
        let counter = 0;

        listCSBs.forEach((CSBReference) => {
            const nextPath = currentPath + '/' + CSBReference.alias;
            const nextCSBIdentifier = new CSBIdentifier(CSBReference.dseed);
            const nextAlias = CSBReference.alias;
            this.rootCSB.loadRawCSB(nextPath, (err, nextRawCSB) => {
                if (err) {
                    console.log(err);
                }
                nextArguments.push([ nextRawCSB, nextCSBIdentifier, nextPath, nextAlias ]);
                if (++counter === listCSBs.length) {
                    nextArguments.forEach((args) => {
                        this.asyncDispatcher.dispatchEmpty();
                        this.collectCSBs(...args);
                    });
                    this.asyncDispatcher.markOneAsFinished(undefined, {rawCSB, csbIdentifier, alias});
                }
            });
        });

        if (listCSBs.length === 0) {
            this.asyncDispatcher.markOneAsFinished(undefined, {rawCSB, csbIdentifier, alias});
        }
    },

    collectFiles: function (collectedCSBs) {
        this.asyncDispatcher = new AsyncDispatcher((errors, newResults) => {
            if (errors) {
                this.swarm('interaction', 'handleError', JSON.stringify(errors, null, '\t'), 'Failed to collect files attached to CSBs');
            }

            if (!newResults) {
                newResults = [];
            }
            this.__categorize(collectedCSBs.concat(newResults));
        });

        this.asyncDispatcher.dispatchEmpty(collectedCSBs.length);
        collectedCSBs.forEach(({rawCSB, csbIdentifier, alias}) => {
            this.__collectFiles(rawCSB, alias);
        });

    },

    __categorize: function (files) {
        const categories = {};
        let backups;
        files.forEach(({csbIdentifier, alias}) => {
            if (!this.backups || this.backups.length === 0) {
                backups = csbIdentifier.getBackupUrls();
            } else {
                backups = this.backups;
            }
            const uid = csbIdentifier.getUid();
            categories[uid] = {backups, alias};
        });

        this.asyncDispatcher = new AsyncDispatcher((errors, successes) => {
            this.swarm('interaction', 'csbBackupReport', {errors, successes});
        });

        this.backupEngine = BackupEngine.getBackupEngine(backups);
        this.filterFiles(categories);
        // Object.entries(categories).forEach(([uid, {alias, backups}]) => {
        //     this.filterFiles(uid, alias, backups);
        // });
    },

    filterFiles: function (filesBackups) {
        const filesToUpdate = {};
        Object.keys(this.hashFile).forEach((uid) => {
            if (filesBackups[uid]) {
                filesToUpdate[uid] = this.hashFile[uid];
            }
        });

        this.asyncDispatcher.dispatchEmpty();
        this.backupEngine.compareVersions(filesToUpdate, (err, modifiedFiles) => {
            if (err) {
                return this.swarm("interaction", "handleError", err, "Failed to retrieve list of modified files");
            }

            this.__backupFiles(JSON.parse(modifiedFiles), filesBackups);
        });
    },

    __backupFiles: function (files, filesBackups) {
        this.asyncDispatcher.dispatchEmpty(files.length);
        files.forEach((file) => {
            const fileStream = fs.createReadStream(path.join(this.localFolder, file));
            const backupUrls = filesBackups[file].backups;
            const backupEngine = BackupEngine.getBackupEngine(backupUrls);
            backupEngine.save(new CSBIdentifier(file), fileStream, (err, url) => {
                if (err) {
                    return  this.asyncDispatcher.markOneAsFinished({alias: filesBackups[file].alias, backupURL: url});
                }

                this.asyncDispatcher.markOneAsFinished(undefined, {alias: filesBackups[file].alias, backupURL: url});
            });
        });

        this.asyncDispatcher.markOneAsFinished(); // for http request to compareVersions
    },

    __collectFiles: function (rawCSB, csbAlias) {
        const files = rawCSB.getAllAssets('global.FileReference');
        this.asyncDispatcher.dispatchEmpty(files.length);
        files.forEach((FileReference) => {
            const alias = FileReference.alias;
            const csbIdentifier = new CSBIdentifier(FileReference.dseed);
            this.asyncDispatcher.markOneAsFinished(undefined, {csbIdentifier, alias});
        });
        this.asyncDispatcher.markOneAsFinished();
    }
});


},{"../../utils/AsyncDispatcher":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/AsyncDispatcher.js","../../utils/HashCage":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/HashCage.js","../../utils/validator":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/validator.js","../BackupEngine":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/BackupEngine.js","../CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","../RootCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/RootCSB.js","./../../utils/utils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/utils.js","fs":false,"path":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/setPin.js":[function(require,module,exports){
const validator = require("../../utils/validator");
const DseedCage = require('../../utils/DseedCage');

$$.swarm.describe("setPin", {
    start: function (localFolder = process.cwd()) {
        this.localFolder = localFolder;
        this.swarm("interaction", "readPin", 3);
    },

    validatePin: function (oldPin, noTries) {
        this.oldPin = oldPin;
        validator.validatePin(this.localFolder, this, "interactionJumper", oldPin, noTries);
    },

    interactionJumper: function () {
        this.swarm("interaction", "enterNewPin");
    },

    actualizePin: function (newPin) {
        this.dseedCage = new DseedCage(this.localFolder);
        this.dseedCage.loadDseedBackups(this.oldPin, validator.reportOrContinue(this, "saveDseed", "Failed to load dseed.", newPin));
    },

    saveDseed: function (csbIdentifier, backups, pin) {
        this.dseedCage.saveDseedBackups(pin, csbIdentifier, backups, validator.reportOrContinue(this, "successState", "Failed to save dseed"));
    },

    successState: function () {
        this.swarm("interaction", "printInfo", "The pin has been successfully changed.");
    }
});
},{"../../utils/DseedCage":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/DseedCage.js","../../utils/validator":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/validator.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/AsyncDispatcher.js":[function(require,module,exports){

function AsyncDispatcher(finalCallback) {
	let results = [];
	let errors = [];

	let started = 0;

	function markOneAsFinished(err, res) {
		if(err) {
			errors.push(err);
		}

		if(arguments.length > 2) {
			arguments[0] = undefined;
			res = arguments;
		}

		if(typeof res !== "undefined") {
			results.push(res);
		}

		if(--started <= 0) {
            callCallback();
		}
	}

	function dispatchEmpty(amount = 1) {
		started += amount;
	}

	function callCallback() {
	    if(errors.length === 0) {
	        errors = undefined;
        }

	    if(results.length === 0) {
	        results = undefined;
        }

        finalCallback(errors, results);
    }

	return {
		dispatchEmpty,
		markOneAsFinished
	};
}

module.exports = AsyncDispatcher;
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/DseedCage.js":[function(require,module,exports){
(function (Buffer){
const crypto = require('pskcrypto');
const path = require('path');
const fs = require("fs");
const CSBIdentifier = require("../libraries/CSBIdentifier");

function DseedCage(localFolder) {
	const dseedFolder = path.join(localFolder, '.privateSky');
	const dseedPath = path.join(dseedFolder, 'dseed');

	function loadDseedBackups(pin, callback) {
		fs.mkdir(dseedFolder, {recursive: true}, (err) => {
			if (err) {
				return callback(err);
			}

			crypto.loadData(pin, dseedPath, (err, dseedBackups) => {
				if (err) {
					return callback(err);
				}
				try{
					dseedBackups = JSON.parse(dseedBackups.toString());
				}catch (e) {
					return callback(e);
				}

				let csbIdentifier;
				if (dseedBackups.dseed && !Buffer.isBuffer(dseedBackups.dseed)) {
					dseedBackups.dseed = Buffer.from(dseedBackups.dseed);
					csbIdentifier = new CSBIdentifier(dseedBackups.dseed);
				}

				callback(undefined, csbIdentifier, dseedBackups.backups);
			});
		});
	}

	function saveDseedBackups(pin, csbIdentifier, backups, callback) {
		fs.mkdir(dseedFolder, {recursive: true}, (err) => {
			if (err) {
				return callback(err);
			}

			let dseed;
			if(csbIdentifier){
				dseed = csbIdentifier.getDseed();
			}
			const dseedBackups = JSON.stringify({
				dseed,
				backups
			});

			crypto.saveData(Buffer.from(dseedBackups), pin, dseedPath, callback);
		});
	}


	return {
		loadDseedBackups,
		saveDseedBackups,
	};
}


module.exports = DseedCage;
}).call(this,require("buffer").Buffer)

},{"../libraries/CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","buffer":false,"fs":false,"path":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/HashCage.js":[function(require,module,exports){
const path = require('path');
const fs = require('fs');

function HashCage(localFolder) {
	const hashFolder = path.join(localFolder, '.privateSky');
	const hashPath = path.join(hashFolder, 'hash');

	function loadHash(callback) {
		fs.mkdir(hashFolder, {recursive: true}, (err) => {
			if (err) {
				return callback(err);
			}

			fs.readFile(hashPath, (err, data) => {
				if(err){
					return callback(null, {});
				}

				callback(null, JSON.parse(data));
			});

		});
	}

	function saveHash(hashObj, callback) {
		fs.mkdir(hashFolder, {recursive: true}, (err) => {
			if (err) {
				return callback(err);
			}

			fs.writeFile(hashPath, JSON.stringify(hashObj, null, '\t'), (err) => {
				if (err) {
					return callback(err);
				}
				callback();
			});
		});
	}

	return {
		loadHash,
		saveHash
	};
}

module.exports = HashCage;

},{"fs":false,"path":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/flowsUtils.js":[function(require,module,exports){
// const path = require("path");


exports.defaultBackup = "http://localhost:8080";
exports.defaultPin = "12345678";
exports.noTries = 3;


},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/utils.js":[function(require,module,exports){
const fs = require("fs");
const path = require('path');
// const crypto = require("pskcrypto");

function generatePath(localFolder, csbIdentifier) {
    return path.join(localFolder, csbIdentifier.getUid());
}

function processUrl(url, assetType) {
    const splitUrl = url.split('/');
    const aliasAsset = splitUrl.pop();
    const CSBPath = splitUrl.join('/');
    return {
        CSBPath: CSBPath + ':' + assetType + ':' + aliasAsset,
        alias: aliasAsset
    };
}

function deleteRecursively(inputPath, isRoot = true, callback) {

    fs.stat(inputPath, function (err, stats) {
        if (err) {
            callback(err, stats);
            return;
        }
        if (stats.isFile()) {
            fs.unlink(inputPath, (err) => {
                if (err) {
                    return callback(err, null);
                } else {
                    return callback(null, true);
                }
            });
        } else if (stats.isDirectory()) {
            fs.readdir(inputPath, (err, files) => {
                if (err) {
                    callback(err, null);
                    return;
                }
                const f_length = files.length;
                let f_delete_index = 0;

                const checkStatus = () => {
                    if (f_length === f_delete_index) {
                        if(!isRoot) {
                            fs.rmdir(inputPath, (err) => {
                                if (err) {
                                    return callback(err, null);
                                } else {
                                    return callback(null, true);
                                }
                            });
                        }
                        callback(null, true);
                        return true;
                    }
                    return false;
                };
                if (!checkStatus()) {
                    files.forEach((file) => {
                        const tempPath = path.join(inputPath, file);
                        deleteRecursively(tempPath, false,(err, status) => {
                            if (!err) {
                                f_delete_index++;
                                checkStatus();
                            } else {
                                return callback(err, null);
                            }
                        });
                    });
                }
            });
        }
    });
}

module.exports = {
    generatePath,
    processUrl,
    deleteRecursively
};


},{"fs":false,"path":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/validator.js":[function(require,module,exports){
const RootCSB = require("../libraries/RootCSB");
const fs = require("fs");
const path = require("path");


module.exports.validatePin = function (localFolder, swarm, phaseName, pin, noTries, ...args) {
	RootCSB.createRootCSB(localFolder, undefined, undefined, pin, (err, rootCSB, csbIdentifier, backups) =>{
		if(err){
			swarm.swarm("interaction", "readPin", noTries - 1);
		}else{
			if(csbIdentifier){
				swarm.rootCSB = rootCSB;
				swarm.csbIdentifier = csbIdentifier;
			}
			args.push(backups);
			swarm[phaseName](pin, ...args);
		}
	});
};

module.exports.reportOrContinue = function(swarm, phaseName, errorMessage, ...args){
	return function(err,...res) {
		if (err) {
			swarm.swarm("interaction", "handleError", err, errorMessage);
		} else {
			if (phaseName) {
					swarm[phaseName](...res, ...args);
			}
		}
	};
};

module.exports.checkMasterCSBExists = function (localFolder, callback) {
	fs.stat(path.join(localFolder, ".privateSky/hash"), (err, stats)=>{
		if(err){
			return callback(err, false);
		}

		return callback(undefined, true);
	});
};
},{"../libraries/RootCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/RootCSB.js","fs":false,"path":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/signsensus/lib/consUtil.js":[function(require,module,exports){
/*
consensus helper functions
*/

var pskcrypto = require("pskcrypto");


function Pulse(signer, currentPulseNumber, block, newTransactions, vsd, top, last) {
    this.signer         = signer;               //a.k.a. delegatedAgentName
    this.currentPulse   = currentPulseNumber;
    this.lset           = newTransactions;      //digest -> transaction
    this.ptBlock        = block;                //array of digests
    this.vsd            = vsd;
    this.top            = top;                  // a.k.a. topPulseConsensus
    this.last           = last;                 // a.k.a. lastPulseAchievedConsensus
}

function Transaction(currentPulse, swarm) {
    this.input      = swarm.input;
    this.output     = swarm.output;
    this.swarm      = swarm;

    var arr = process.hrtime();
    this.second     = arr[0];
    this.nanosecod  = arr[1];

    this.CP         = currentPulse;
    this.digest     = pskcrypto.hashValues(this);
}


exports.createTransaction = function (currentPulse, swarm) {
    return new Transaction(currentPulse, swarm);
}

exports.createPulse = function (signer, currentPulseNumber, block, newTransactions, vsd, top, last) {
    return new Pulse(signer, currentPulseNumber, block, newTransactions, vsd, top, last);
}

exports.orderTransactions = function (pset) { //order in place the pset array
    var arr = [];
    for (var d in pset) {
        arr.push(pset[d]);
    }

    arr.sort(function (t1, t2) {
        if (t1.CP < t2.CP) return -1;
        if (t1.CP > t2.CP) return 1;
        if (t1.second < t2.second) return -1;
        if (t1.second > t2.second) return 1;
        if (t1.nanosecod < t2.nanosecod) return -1;
        if (t1.nanosecod > t2.nanosecod) return 1;
        if (t1.digest < t2.digest) return -1;
        if (t1.digest > t2.digest) return 1;
        return 0; //only for identical transactions...
    })
    return arr;
}

function getMajorityFieldInPulses(allPulses, fieldName, extractFieldName, votingBox) {
    var counterFields = {};
    var majorityValue;
    var pulse;

    for (var agent in allPulses) {
        pulse = allPulses[agent];
        var v = pulse[fieldName];
        counterFields[v] = votingBox.vote(counterFields[v]);        // ++counterFields[v]
    }

    for (var i in counterFields) {
        if (votingBox.isMajoritarian(counterFields[i])) {
            majorityValue = i;
            if (fieldName == extractFieldName) {                    //??? "vsd", "vsd"
                return majorityValue;
            } else {                                                // "blockDigest", "ptBlock"
                for (var agent in allPulses) {
                    pulse = allPulses[agent];
                    if (pulse[fieldName] == majorityValue) {
                        return pulse[extractFieldName];
                    }
                }
            }
        }
    }
    return "none"; //there is no majority
}

exports.detectMajoritarianVSD = function (pulse, pulsesHistory, votingBox) {
    if (pulse == 0) return "none";
    var pulses = pulsesHistory[pulse];
    var majorityValue = getMajorityFieldInPulses(pulses, "vsd", "vsd", votingBox);
    return majorityValue;
}

/*
    detect a candidate block
 */
exports.detectMajoritarianPTBlock = function (pulse, pulsesHistory, votingBox) {
    if (pulse == 0) return "none";
    var pulses = pulsesHistory[pulse];
    var btBlock = getMajorityFieldInPulses(pulses, "blockDigest", "ptBlock", votingBox);
    return btBlock;
}

exports.makeSetFromBlock = function (knownTransactions, block) {
    var result = {};
    for (var i = 0; i < block.length; i++) {
        var item = block[i];
        result[item] = knownTransactions[item];
        if (!knownTransactions.hasOwnProperty(item)) {
            console.log(new Error("Do not give unknown transaction digests to makeSetFromBlock " + item));
        }
    }
    return result;
}

exports.setsConcat = function (target, from) {
    for (var d in from) {
        target[d] = from[d];
    }
    return target;
}

exports.setsRemoveArray = function (target, arr) {
    arr.forEach(item => delete target[item]);
    return target;
}

exports.setsRemovePtBlockAndPastTransactions = function (target, arr, maxPulse) {
    var toBeRemoved = [];
    for (var d in target) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == d || target[d].CP < maxPulse) {
                toBeRemoved.push(d);
            }
        }
    }

    toBeRemoved.forEach(item => delete target[item]);
    return target;
}

exports.createDemocraticVotingBox = function (shareHoldersCounter) {
    return {
        vote: function (previosValue) {
            if (!previosValue) {
                previosValue = 0;
            }
            return previosValue + 1;
        },

        isMajoritarian: function (value) {
            //console.log(value , Math.floor(shareHoldersCounter/2) + 1);
            return value >= Math.floor(shareHoldersCounter / 2) + 1;
        }
    };
}

},{"pskcrypto":false}],"buffer-crc32":[function(require,module,exports){
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

},{"buffer":false}],"csb-wizard":[function(require,module,exports){
module.exports = require('./CSBWizard');

},{"./CSBWizard":"/home/cosmin/Workspace/reorganizing/privatesky/modules/csb-wizard/CSBWizard.js"}],"foldermq":[function(require,module,exports){
module.exports = {
					createQue: require("./lib/folderMQ").getFolderQueue
					//folderMQ: require("./lib/folderMQ")
};
},{"./lib/folderMQ":"/home/cosmin/Workspace/reorganizing/privatesky/modules/foldermq/lib/folderMQ.js"}],"interact":[function(require,module,exports){
/*
Module that offers APIs to interact with PrivateSky web sandboxes
 */


const exportBrowserInteract = {
    enableIframeInteractions: function () {
        module.exports.createWindowMQ = require("./lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ").createMQ;
        module.exports.createWindowInteractionSpace = require("./lib/interactionSpaceImpl/WindowMQInteractionSpace").createInteractionSpace;
    },
    enableReactInteractions: function () {
        module.exports.createWindowMQ = require("./lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ").createMQ;
        module.exports.createWindowInteractionSpace = require("./lib/interactionSpaceImpl/WindowMQInteractionSpace").createInteractionSpace;
    },
    enableWebViewInteractions:function(){
        module.exports.createWindowInteractionSpace = require("./lib/interactionSpaceImpl/WebViewMQInteractionSpace").createInteractionSpace;
        module.exports.createWindowMQ = require("./lib/interactionSpaceImpl/specificMQImpl/ChildWebViewMQ").createMQ;
    },
    enableLocalInteractions: function () {
        module.exports.createInteractionSpace = require("./lib/interactionSpaceImpl/SoundPubSubMQBasedInteractionSpace").createInteractionSpace;
    },
    enableRemoteInteractions: function () {
        module.exports.createRemoteInteractionSpace = require('./lib/interactionSpaceImpl/httpInteractionSpace').createInteractionSpace;
    }
};


if (typeof navigator !== "undefined") {
    module.exports = exportBrowserInteract;
}
else {
    module.exports = {
        createNodeInteractionSpace: require("./lib/interactionSpaceImpl/folderMQBasedInteractionSpace").createInteractionSpace,
        createInteractionSpace: require("./lib/interactionSpaceImpl/SoundPubSubMQBasedInteractionSpace").createInteractionSpace,
        createRemoteInteractionSpace: require('./lib/interactionSpaceImpl/httpInteractionSpace').createInteractionSpace
    };
}
},{"./lib/interactionSpaceImpl/SoundPubSubMQBasedInteractionSpace":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/SoundPubSubMQBasedInteractionSpace.js","./lib/interactionSpaceImpl/WebViewMQInteractionSpace":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/WebViewMQInteractionSpace.js","./lib/interactionSpaceImpl/WindowMQInteractionSpace":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/WindowMQInteractionSpace.js","./lib/interactionSpaceImpl/folderMQBasedInteractionSpace":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/folderMQBasedInteractionSpace.js","./lib/interactionSpaceImpl/httpInteractionSpace":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/httpInteractionSpace.js","./lib/interactionSpaceImpl/specificMQImpl/ChildWebViewMQ":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWebViewMQ.js","./lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ.js"}],"node-fd-slicer":[function(require,module,exports){
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

},{"./modules/node-pend":"/home/cosmin/Workspace/reorganizing/privatesky/modules/node-fd-slicer/modules/node-pend/index.js","buffer":false,"events":false,"fs":false,"stream":false,"timers":false,"util":false}],"psk-http-client":[function(require,module,exports){
//to look nice the requireModule on Node
require("./lib/psk-abstract-client");
if(!$$.browserRuntime){
	require("./lib/psk-node-client");
}else{
	require("./lib/psk-browser-client");
}
},{"./lib/psk-abstract-client":"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-abstract-client.js","./lib/psk-browser-client":"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-browser-client.js","./lib/psk-node-client":"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-node-client.js"}],"pskdb":[function(require,module,exports){
const Blockchain = require('./lib/Blockchain');

module.exports = {
    startDB: function (folder) {
        if ($$.blockchain) {
            throw new Error('$$.blockchain is already defined');
        }
        $$.blockchain = this.createDBHandler(folder);
        return $$.blockchain;
    },
    createDBHandler: function(folder){
        require('./lib/domain');
        require('./lib/swarms');

        const fpds = require("./lib/FolderPersistentPDS");
        const pds = fpds.newPDS(folder);

        return new Blockchain(pds);
    },
    parseDomainUrl: function (domainUrl) {
        console.log("Empty function");
    },
    getDomainInfo: function () {
        console.log("Empty function");
    },
    startInMemoryDB: function() {
		require('./lib/domain');
		require('./lib/swarms');

		const pds = require('./lib/InMemoryPDS');

		return new Blockchain(pds.newPDS(null));
    },
    startDb: function(readerWriter) {
        require('./lib/domain');
        require('./lib/swarms');

        const ppds = require("./lib/PersistentPDS");
        const pds = ppds.newPDS(readerWriter);

        return new Blockchain(pds);
    }
};

},{"./lib/Blockchain":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/Blockchain.js","./lib/FolderPersistentPDS":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/FolderPersistentPDS.js","./lib/InMemoryPDS":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/InMemoryPDS.js","./lib/PersistentPDS":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/PersistentPDS.js","./lib/domain":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/index.js","./lib/swarms":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/swarms/index.js"}],"pskwallet":[function(require,module,exports){
module.exports.utils  = require("./utils/flowsUtils");
const RootCSB = require('./libraries/RootCSB');
module.exports.createRootCSB = RootCSB.createRootCSB;
module.exports.loadWithIdentifier = RootCSB.loadWithIdentifier;
module.exports.loadWithPin   = RootCSB.loadWithPin;
module.exports.writeNewMasterCSB = RootCSB.writeNewMasterCSB;
module.exports.RootCSB = RootCSB;
module.exports.RawCSB = require('./libraries/RawCSB');
module.exports.CSBIdentifier = require('./libraries/CSBIdentifier');
module.exports.init = function () {
	$$.loadLibrary("pskwallet", require("./libraries/flows/index"));
};


},{"./libraries/CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/CSBIdentifier.js","./libraries/RawCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/RawCSB.js","./libraries/RootCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/RootCSB.js","./libraries/flows/index":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/libraries/flows/index.js","./utils/flowsUtils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskwallet/utils/flowsUtils.js"}],"signsensus":[function(require,module,exports){
module.exports = {
    consUtil: require('./consUtil')
};
},{"./consUtil":"/home/cosmin/Workspace/reorganizing/privatesky/modules/signsensus/lib/consUtil.js"}],"yauzl":[function(require,module,exports){
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

},{"buffer":false,"buffer-crc32":"buffer-crc32","events":false,"fs":false,"stream":false,"timers":false,"util":false,"zlib":false}]},{},["/home/cosmin/Workspace/reorganizing/privatesky/builds/tmp/consoleTools_intermediar.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZHMvdG1wL2NvbnNvbGVUb29sc19pbnRlcm1lZGlhci5qcyIsIm1vZHVsZXMvY3NiLXdpemFyZC9DU0JXaXphcmQuanMiLCJtb2R1bGVzL2NzYi13aXphcmQvdXRpbHMvQ29tbWFuZHNBc3Npc3RhbnQuanMiLCJtb2R1bGVzL2NzYi13aXphcmQvdXRpbHMvY3NiSW50ZXJhY3Rpb25zLmpzIiwibW9kdWxlcy9jc2Itd2l6YXJkL3V0aWxzL2V4ZWN1dGlvbmVyLmpzIiwibW9kdWxlcy9jc2Itd2l6YXJkL3V0aWxzL3NlcnZlckNvbW1hbmRzLmpzIiwibW9kdWxlcy9mb2xkZXJtcS9saWIvZm9sZGVyTVEuanMiLCJtb2R1bGVzL2ludGVyYWN0L2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9Tb3VuZFB1YlN1Yk1RQmFzZWRJbnRlcmFjdGlvblNwYWNlLmpzIiwibW9kdWxlcy9pbnRlcmFjdC9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvV2ViVmlld01RSW50ZXJhY3Rpb25TcGFjZS5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1dpbmRvd01RSW50ZXJhY3Rpb25TcGFjZS5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL2ZvbGRlck1RQmFzZWRJbnRlcmFjdGlvblNwYWNlLmpzIiwibW9kdWxlcy9pbnRlcmFjdC9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvaHR0cEludGVyYWN0aW9uU3BhY2UuanMiLCJtb2R1bGVzL2ludGVyYWN0L2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9zcGVjaWZpY01RSW1wbC9DaGlsZFdlYlZpZXdNUS5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL3NwZWNpZmljTVFJbXBsL0NoaWxkV25kTVEuanMiLCJtb2R1bGVzL2ludGVyYWN0L2xpYi9zd2FybUludGVyYWN0aW9uLmpzIiwibW9kdWxlcy9ub2RlLWZkLXNsaWNlci9tb2R1bGVzL25vZGUtcGVuZC9pbmRleC5qcyIsIm1vZHVsZXMvcHNrLWh0dHAtY2xpZW50L2xpYi9wc2stYWJzdHJhY3QtY2xpZW50LmpzIiwibW9kdWxlcy9wc2staHR0cC1jbGllbnQvbGliL3Bzay1icm93c2VyLWNsaWVudC5qcyIsIm1vZHVsZXMvcHNrLWh0dHAtY2xpZW50L2xpYi9wc2stbm9kZS1jbGllbnQuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9CbG9ja2NoYWluLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvRm9sZGVyUGVyc2lzdGVudFBEUy5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL0luTWVtb3J5UERTLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvUGVyc2lzdGVudFBEUy5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9BQ0xTY29wZS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9BZ2VudC5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9CYWNrdXAuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9kb21haW4vQ1NCTWV0YS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9DU0JSZWZlcmVuY2UuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9kb21haW4vRG9tYWluUmVmZXJlbmNlLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0VtYmVkZGVkRmlsZS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9GaWxlUmVmZXJlbmNlLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0tleS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9pbmRleC5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi90cmFuc2FjdGlvbnMuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9zd2FybXMvYWdlbnRzU3dhcm0uanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9zd2FybXMvZG9tYWluU3dhcm1zLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvc3dhcm1zL2luZGV4LmpzIiwibW9kdWxlcy9wc2tkYi9saWIvc3dhcm1zL3NoYXJlZFBoYXNlcy5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9CYWNrdXBFbmdpbmUuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvQ1NCQ2FjaGUuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvQ1NCSWRlbnRpZmllci5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9SYXdDU0IuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvUm9vdENTQi5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9iYWNrdXBSZXNvbHZlcnMvRVZGU1Jlc29sdmVyLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvbGlicmFyaWVzL2Zsb3dzL2FkZEJhY2t1cC5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9mbG93cy9hZGRDc2IuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvZmxvd3MvYXR0YWNoRmlsZS5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9mbG93cy9jcmVhdGVDc2IuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvZmxvd3MvZXh0cmFjdEZpbGUuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvZmxvd3MvaW5kZXguanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvZmxvd3MvbGlzdENTQnMuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvZmxvd3MvcmVjZWl2ZS5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9mbG93cy9yZXNldFBpbi5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9mbG93cy9yZXN0b3JlLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvbGlicmFyaWVzL2Zsb3dzL3NhdmVCYWNrdXAuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvZmxvd3Mvc2V0UGluLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvdXRpbHMvQXN5bmNEaXNwYXRjaGVyLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvdXRpbHMvRHNlZWRDYWdlLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvdXRpbHMvSGFzaENhZ2UuanMiLCJtb2R1bGVzL3Bza3dhbGxldC91dGlscy9mbG93c1V0aWxzLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvdXRpbHMvdXRpbHMuanMiLCJtb2R1bGVzL3Bza3dhbGxldC91dGlscy92YWxpZGF0b3IuanMiLCJtb2R1bGVzL3NpZ25zZW5zdXMvbGliL2NvbnNVdGlsLmpzIiwibW9kdWxlcy9idWZmZXItY3JjMzIvaW5kZXguanMiLCJtb2R1bGVzL2NzYi13aXphcmQvaW5kZXguanMiLCJtb2R1bGVzL2ZvbGRlcm1xL2luZGV4LmpzIiwibW9kdWxlcy9pbnRlcmFjdC9pbmRleC5qcyIsIm1vZHVsZXMvbm9kZS1mZC1zbGljZXIvaW5kZXguanMiLCJtb2R1bGVzL3Bzay1odHRwLWNsaWVudC9pbmRleC5qcyIsIm1vZHVsZXMvcHNrZGIvaW5kZXguanMiLCJtb2R1bGVzL3Bza3dhbGxldC9pbmRleC5qcyIsIm1vZHVsZXMvc2lnbnNlbnN1cy9saWIvaW5kZXguanMiLCJtb2R1bGVzL3lhdXpsL2luZGV4LmpzIiwibW9kdWxlcy95YXpsL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM5V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25hQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3hTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTs7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3p5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImdsb2JhbC5jb25zb2xlVG9vbHNMb2FkTW9kdWxlcyA9IGZ1bmN0aW9uKCl7IFxuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wieWF6bFwiXSA9IHJlcXVpcmUoXCJ5YXpsXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wieWF1emxcIl0gPSByZXF1aXJlKFwieWF1emxcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJwc2staHR0cC1jbGllbnRcIl0gPSByZXF1aXJlKFwicHNrLWh0dHAtY2xpZW50XCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wicHNrd2FsbGV0XCJdID0gcmVxdWlyZShcInBza3dhbGxldFwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcInBza2RiXCJdID0gcmVxdWlyZShcInBza2RiXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wiaW50ZXJhY3RcIl0gPSByZXF1aXJlKFwiaW50ZXJhY3RcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJmb2xkZXJtcVwiXSA9IHJlcXVpcmUoXCJmb2xkZXJtcVwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcInNpZ25zZW5zdXNcIl0gPSByZXF1aXJlKFwic2lnbnNlbnN1c1wiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImJ1ZmZlci1jcmMzMlwiXSA9IHJlcXVpcmUoXCJidWZmZXItY3JjMzJcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJub2RlLWZkLXNsaWNlclwiXSA9IHJlcXVpcmUoXCJub2RlLWZkLXNsaWNlclwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImNzYi13aXphcmRcIl0gPSByZXF1aXJlKFwiY3NiLXdpemFyZFwiKTtcbn1cbmlmIChmYWxzZSkge1xuXHRjb25zb2xlVG9vbHNMb2FkTW9kdWxlcygpO1xufTsgXG5nbG9iYWwuY29uc29sZVRvb2xzUmVxdWlyZSA9IHJlcXVpcmU7XG5pZiAodHlwZW9mICQkICE9PSBcInVuZGVmaW5lZFwiKSB7ICAgICAgICAgICAgXG4gICAgJCQucmVxdWlyZUJ1bmRsZShcImNvbnNvbGVUb29sc1wiKTtcbn07IiwiY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmNvbnN0IFZpcnR1YWxNUSA9IHJlcXVpcmUoJ3ZpcnR1YWxtcScpO1xuY29uc3QgaHR0cFdyYXBwZXIgPSBWaXJ0dWFsTVEuZ2V0SHR0cFdyYXBwZXIoKTtcbmNvbnN0IGh0dHBVdGlscyA9IGh0dHBXcmFwcGVyLmh0dHBVdGlscztcbmNvbnN0IFNlcnZlciA9IGh0dHBXcmFwcGVyLlNlcnZlcjtcbmNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ3Bza2NyeXB0bycpO1xuY29uc3QgaW50ZXJhY3QgPSByZXF1aXJlKCdpbnRlcmFjdCcpO1xuY29uc3Qgc2VydmVyQ29tbWFuZHMgPSByZXF1aXJlKCcuL3V0aWxzL3NlcnZlckNvbW1hbmRzJyk7XG5jb25zdCBleGVjdXRpb25lciA9IHJlcXVpcmUoJy4vdXRpbHMvZXhlY3V0aW9uZXInKTtcbmNvbnN0IHVybCA9IHJlcXVpcmUoJ3VybCcpO1xuXG5mdW5jdGlvbiBDU0JXaXphcmQoe2xpc3RlbmluZ1BvcnQsIHJvb3RGb2xkZXIsIHNzbENvbmZpZ30sIGNhbGxiYWNrKSB7XG5cdGNvbnN0IHBvcnQgPSBsaXN0ZW5pbmdQb3J0IHx8IDgwODE7XG5cdGNvbnN0IHNlcnZlciA9IG5ldyBTZXJ2ZXIoc3NsQ29uZmlnKS5saXN0ZW4ocG9ydCk7XG5cdGNvbnN0IHJhbmRTaXplID0gMzI7XG5cdHJvb3RGb2xkZXIgPSBwYXRoLmpvaW4ocm9vdEZvbGRlciwgJ0NTQl9UTVAnKTtcblxuXHRjb25zb2xlLmxvZyhcIkxpc3RlbmluZyBvbiBwb3J0OlwiLCBwb3J0KTtcblxuXHRmcy5ta2Rpcihyb290Rm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgKGVycikgPT4ge1xuXHRcdGlmKGVyciAmJiBlcnIuY29kZSAhPT0gXCJFRVhJU1RcIikge1xuXHRcdFx0dGhyb3cgZXJyO1xuXHRcdH1cblxuXHRcdGNvbnNvbGUubG9nKFwiTG9jYWwgZm9sZGVyOlwiLCByb290Rm9sZGVyKTtcblx0XHRyZWdpc3RlckVuZHBvaW50cygpO1xuXHRcdGlmKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0cmV0dXJuIGNhbGxiYWNrKCk7XG5cdFx0fVxuXHR9KTtcblxuXHRmdW5jdGlvbiByZWdpc3RlckVuZHBvaW50cygpIHtcblx0XHRzZXJ2ZXIudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuXHRcdFx0cmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBQVVQsIERFTEVURScpO1xuXHRcdFx0cmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicpO1xuXHRcdFx0cmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnLCB0cnVlKTtcblx0XHRcdG5leHQoKTtcblx0XHR9KTtcblxuXHRcdHNlcnZlci5wb3N0KCcvYmVnaW5DU0InLCAocmVxLCByZXMpID0+IHtcblx0XHRcdGNvbnN0IHRyYW5zYWN0aW9uSWQgPSBjcnlwdG8ucmFuZG9tQnl0ZXMocmFuZFNpemUpLnRvU3RyaW5nKCdoZXgnKTtcblx0XHRcdGZzLm1rZGlyKHBhdGguam9pbihyb290Rm9sZGVyLCB0cmFuc2FjdGlvbklkKSwge3JlY3Vyc2l2ZTogdHJ1ZX0sIChlcnIpID0+IHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdHJlcy5zdGF0dXNDb2RlID0gNTAwO1xuXHRcdFx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXMuZW5kKHRyYW5zYWN0aW9uSWQpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRzZXJ2ZXIucG9zdCgnL2F0dGFjaEZpbGUnLCAocmVxLCByZXMpID0+IHtcblx0XHRcdHJlcy5zdGF0dXNDb2RlID0gNDAwO1xuXHRcdFx0cmVzLmVuZCgnSWxsZWdhbCB1cmwsIG1pc3NpbmcgdHJhbnNhY3Rpb24gaWQnKTtcblx0XHR9KTtcblxuXHRcdHNlcnZlci5wb3N0KCcvYXR0YWNoRmlsZS86dHJhbnNhY3Rpb25JZC86ZmlsZUFsaWFzJywgKHJlcSwgcmVzKSA9PiB7XG5cdFx0XHRjb25zdCB0cmFuc2FjdGlvbklkID0gcmVxLnBhcmFtcy50cmFuc2FjdGlvbklkO1xuXHRcdFx0Y29uc3QgZmlsZU9iaiA9IHtcblx0XHRcdFx0ZmlsZU5hbWU6IHJlcS5wYXJhbXMuZmlsZUFsaWFzLFxuXHRcdFx0XHRzdHJlYW06IHJlcVxuXHRcdFx0fTtcblxuXHRcdFx0c2VydmVyQ29tbWFuZHMuYXR0YWNoRmlsZShwYXRoLmpvaW4ocm9vdEZvbGRlciwgdHJhbnNhY3Rpb25JZCksIGZpbGVPYmosIChlcnIpID0+IHtcblx0XHRcdFx0aWYoZXJyKSB7XG5cdFx0XHRcdFx0aWYoZXJyLmNvZGUgPT09ICdFRVhJU1QnKSB7XG5cdFx0XHRcdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDQwOTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSA1MDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRzZXJ2ZXIucG9zdCgnL2FkZEJhY2t1cCcsIChyZXEsIHJlcykgPT4ge1xuXHRcdFx0cmVzLnN0YXR1c0NvZGUgPSA0MDA7XG5cdFx0XHRyZXMuZW5kKCdJbGxlZ2FsIHVybCwgbWlzc2luZyB0cmFuc2FjdGlvbiBpZCcpO1xuXHRcdH0pO1xuXG5cdFx0c2VydmVyLnBvc3QoJy9hZGRCYWNrdXAvOnRyYW5zYWN0aW9uSWQnLCBodHRwVXRpbHMuYm9keVBhcnNlcik7XG5cblx0XHRzZXJ2ZXIucG9zdCgnL2FkZEJhY2t1cC86dHJhbnNhY3Rpb25JZCcsIChyZXEsIHJlcykgPT4ge1xuXHRcdFx0Y29uc3QgdHJhbnNhY3Rpb25JZCA9IHJlcS5wYXJhbXMudHJhbnNhY3Rpb25JZDtcblxuXHRcdFx0Y29uc3QgYmFja3VwT2JqID0ge1xuXHRcdFx0XHRlbmRwb2ludDogcmVxLmJvZHlcblx0XHRcdH07XG5cblx0XHRcdHNlcnZlckNvbW1hbmRzLmFkZEJhY2t1cChwYXRoLmpvaW4ocm9vdEZvbGRlciwgdHJhbnNhY3Rpb25JZCksIGJhY2t1cE9iaiwgKGVycikgPT4ge1xuXHRcdFx0XHRpZihlcnIpIHtcblx0XHRcdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDUwMDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0c2VydmVyLnBvc3QoJy9idWlsZENTQicsIChyZXEsIHJlcykgPT4ge1xuXHRcdFx0cmVzLnN0YXR1c0NvZGUgPSA0MDA7XG5cdFx0XHRyZXMuZW5kKCdJbGxlZ2FsIHVybCwgbWlzc2luZyB0cmFuc2FjdGlvbiBpZCcpO1xuXHRcdH0pO1xuXHRcdHNlcnZlci5wb3N0KCcvYnVpbGRDU0IvOnRyYW5zYWN0aW9uSWQnLCBodHRwVXRpbHMuYm9keVBhcnNlcik7XG5cdFx0c2VydmVyLnBvc3QoJy9idWlsZENTQi86dHJhbnNhY3Rpb25JZCcsIChyZXEsIHJlcykgPT4ge1xuXHRcdFx0Y29uc3QgdHJhbnNhY3Rpb25JZCA9IHJlcS5wYXJhbXMudHJhbnNhY3Rpb25JZDtcblx0XHRcdGV4ZWN1dGlvbmVyLmV4ZWN1dGlvbmVyKHBhdGguam9pbihyb290Rm9sZGVyLCB0cmFuc2FjdGlvbklkKSwgKGVyciwgc2VlZCkgPT4ge1xuXHRcdFx0XHRpZihlcnIpIHtcblx0XHRcdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDUwMDtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIkVycm9yXCIsIGVycik7XG5cdFx0XHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKHJlcS5ib2R5KXtcblx0XHRcdFx0XHRjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXEuYm9keSk7XG5cdFx0XHRcdFx0Y29uc3QgZW5kcG9pbnQgPSBuZXcgdXJsLlVSTChib2R5LnVybCkub3JpZ2luO1xuXHRcdFx0XHRcdGNvbnN0IGNoYW5uZWwgPSBib2R5LmNoYW5uZWw7XG5cdFx0XHRcdFx0Y29uc3QgcmlzID0gaW50ZXJhY3QuY3JlYXRlUmVtb3RlSW50ZXJhY3Rpb25TcGFjZSgncmVtb3RlJywgZW5kcG9pbnQsIGNoYW5uZWwpO1xuXHRcdFx0XHRcdHJpcy5zdGFydFN3YXJtKCdub3RpZmllcicsICdpbml0Jywgc2VlZC50b1N0cmluZygpKTtcblx0XHRcdFx0XHRyZXMuZW5kKHNlZWQudG9TdHJpbmcoKSk7XG5cdFx0XHRcdH1lbHNlIHtcblx0XHRcdFx0XHRyZXMuZW5kKHNlZWQudG9TdHJpbmcoKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0c2VydmVyLnVzZSgnL3dlYicsIChyZXEsIHJlcykgPT4ge1xuXHRcdFx0cmVzLnN0YXR1c0NvZGUgPSAzMDM7XG5cdFx0XHRsZXQgcmVkaXJlY3RMb2NhdGlvbiA9ICdpbmRleC5odG1sJztcblxuXHRcdFx0aWYoIXJlcS51cmwuZW5kc1dpdGgoJy8nKSkge1xuXHRcdFx0XHRyZWRpcmVjdExvY2F0aW9uID0gJy93ZWIvJyArIHJlZGlyZWN0TG9jYXRpb247XG5cdFx0XHR9XG5cblx0XHRcdHJlcy5zZXRIZWFkZXIoXCJMb2NhdGlvblwiLCByZWRpcmVjdExvY2F0aW9uKTtcblx0XHRcdHJlcy5lbmQoKTtcblx0XHR9KTtcblxuXHRcdHNlcnZlci51c2UoJy93ZWIvKicsIGh0dHBVdGlscy5zZXJ2ZVN0YXRpY0ZpbGUocGF0aC5qb2luKF9fZGlybmFtZSwgJ3dlYicpLCAnL3dlYicpKTtcblxuXHRcdHNlcnZlci51c2UoKHJlcSwgcmVzKSA9PiB7XG5cdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDQwNDtcblx0XHRcdHJlcy5lbmQoKTtcblx0XHR9KTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENTQldpemFyZDtcbiIsImNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbmZ1bmN0aW9uIENvbW1hbmRzQXNzaXN0YW50KGxvY2FsRm9sZGVyKSB7XG5cblx0Y29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4obG9jYWxGb2xkZXIsICdjb21tYW5kcy5qc29uJyk7XG5cblx0ZnVuY3Rpb24gbG9hZENvbW1hbmRzKGNhbGxiYWNrKSB7XG5cdFx0JCQuZW5zdXJlRm9sZGVyRXhpc3RzKGxvY2FsRm9sZGVyLCAoZXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXG5cdFx0XHRmcy5yZWFkRmlsZShmaWxlUGF0aCwgKGVyciwgY29tbWFuZHMpID0+IHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayh1bmRlZmluZWQsIFtdKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhbGxiYWNrKHVuZGVmaW5lZCwgSlNPTi5wYXJzZShjb21tYW5kcy50b1N0cmluZygpKSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNhdmVDb21tYW5kcyhjb21tYW5kc0FyciwgY2FsbGJhY2spIHtcblx0XHQkJC5lbnN1cmVGb2xkZXJFeGlzdHMobG9jYWxGb2xkZXIsIChlcnIpID0+IHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHR9XG5cblx0XHRcdGZzLndyaXRlRmlsZShmaWxlUGF0aCwgSlNPTi5zdHJpbmdpZnkoY29tbWFuZHNBcnIpLCBjYWxsYmFjayk7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBhZGRDb21tYW5kKGNvbW1hbmQsIGNhbGxiYWNrKSB7XG5cdFx0bG9hZENvbW1hbmRzKChlcnIsIGNvbW1hbmRzQXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb21tYW5kc0Fyci5wdXNoKGNvbW1hbmQpO1xuXG5cdFx0XHRzYXZlQ29tbWFuZHMoY29tbWFuZHNBcnIsIGNhbGxiYWNrKTtcblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0YWRkQ29tbWFuZCxcblx0XHRsb2FkQ29tbWFuZHNcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb21tYW5kc0Fzc2lzdGFudDtcbiIsImNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG4kJC5sb2FkTGlicmFyeShcImZsb3dzXCIsIHJlcXVpcmUoXCIuLi8uLi9wc2t3YWxsZXQvbGlicmFyaWVzL2Zsb3dzXCIpKTtcbmNvbnN0IGlzID0gcmVxdWlyZShcImludGVyYWN0XCIpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UoKTtcblxuXG5mdW5jdGlvbiBjcmVhdGVDU0Iod29ya2luZ0RpciwgYmFja3VwcywgY2FsbGJhY2spIHtcbiAgICBsZXQgc2F2ZWRTZWVkO1xuICAgIGlzLnN0YXJ0U3dhcm0oXCJjcmVhdGVDc2JcIiwgXCJ3aXRob3V0UGluXCIsIFwiXCIsIGJhY2t1cHMsIHdvcmtpbmdEaXIsIHVuZGVmaW5lZCwgZmFsc2UpLm9uKHtcbiAgICAgICAgcHJpbnRTZW5zaXRpdmVJbmZvOiBmdW5jdGlvbiAoc2VlZCwgZGVmYXVsdFBpbikge1xuICAgICAgICAgICAgc2F2ZWRTZWVkID0gc2VlZDtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlRXJyb3I6IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0sXG4gICAgICAgIF9fcmV0dXJuX186IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgc2F2ZWRTZWVkKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBhdHRhY2hGaWxlKHdvcmtpbmdEaXIsIGZpbGVOYW1lLCBzZWVkLCBjYWxsYmFjaykge1xuICAgIGlzLnN0YXJ0U3dhcm0oXCJhdHRhY2hGaWxlXCIsIFwid2l0aENTQklkZW50aWZpZXJcIiwgc2VlZCwgZmlsZU5hbWUsIHBhdGguam9pbih3b3JraW5nRGlyLCBmaWxlTmFtZSksIHdvcmtpbmdEaXIpLm9uKHtcbiAgICAgICAgaGFuZGxlRXJyb3I6IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX19yZXR1cm5fXzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzYXZlQmFja3VwKHdvcmtpbmdEaXIsIHNlZWQsIGNhbGxiYWNrKSB7XG4gICAgaXMuc3RhcnRTd2FybShcInNhdmVCYWNrdXBcIiwgXCJ3aXRoQ1NCSWRlbnRpZmllclwiLCBzZWVkLCB3b3JraW5nRGlyKS5vbih7XG4gICAgICAgIGhhbmRsZUVycm9yOiBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNzYkJhY2t1cFJlcG9ydDogZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzdWx0LmVycm9ycywgcmVzdWx0LnN1Y2Nlc3Nlcyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYXR0YWNoRmlsZSxcbiAgICBjcmVhdGVDU0IsXG4gICAgc2F2ZUJhY2t1cFxufTtcbiIsImNvbnN0IGNzYkludGVyYWN0aW9uID0gcmVxdWlyZSgnLi9jc2JJbnRlcmFjdGlvbnMnKTtcbmNvbnN0IENvbW1hbmRzQXNzaXN0YW50ID0gcmVxdWlyZSgnLi9Db21tYW5kc0Fzc2lzdGFudCcpO1xuXG5mdW5jdGlvbiBleGVjdXRpb25lcih3b3JraW5nRGlyLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IGZpbHRlcmVkQ29tbWFuZHMgPSBbXTtcbiAgICBjb25zdCBiYWNrdXBzID0gW107XG5cbiAgICBjb25zdCBjb21tYW5kc0Fzc2lzdGFudCA9IG5ldyBDb21tYW5kc0Fzc2lzdGFudCh3b3JraW5nRGlyKTtcbiAgICBjb21tYW5kc0Fzc2lzdGFudC5sb2FkQ29tbWFuZHMoKGVyciwgY29tbWFuZHMpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbW1hbmRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpZiAoY29tbWFuZHNbaV0ubmFtZSA9PT0gJ2FkZEJhY2t1cCcpIHtcbiAgICAgICAgICAgICAgICBiYWNrdXBzLnB1c2goY29tbWFuZHNbaV0ucGFyYW1zLmVuZHBvaW50KTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZmlsdGVyZWRDb21tYW5kcy5wdXNoKGNvbW1hbmRzW2ldKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgY3NiSW50ZXJhY3Rpb24uY3JlYXRlQ1NCKHdvcmtpbmdEaXIsIGJhY2t1cHMsIChlcnIsIHNlZWQpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXhlY3V0ZUNvbW1hbmQoZmlsdGVyZWRDb21tYW5kcywgc2VlZCwgd29ya2luZ0RpciwgMCwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY3NiSW50ZXJhY3Rpb24uc2F2ZUJhY2t1cCh3b3JraW5nRGlyLCBzZWVkLCAoZXJyb3JzLCBzdWNjZXNzZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycm9ycyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHNlZWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBleGVjdXRlQ29tbWFuZChjb21tYW5kcywgc2VlZCwgd29ya2luZ0RpciwgaW5kZXggPSAwLCBjYWxsYmFjaykge1xuICAgIGlmIChpbmRleCA9PT0gY29tbWFuZHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIGNvbnN0IG1hdGNoID0ganVkZ2UoY29tbWFuZHNbaW5kZXhdLCBzZWVkLCB3b3JraW5nRGlyLCAoZXJyKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXhlY3V0ZUNvbW1hbmQoY29tbWFuZHMsIHNlZWQsIHdvcmtpbmdEaXIsICsraW5kZXgsIGNhbGxiYWNrKTtcbiAgICB9KTtcblxuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignTm8gbWF0Y2ggZm9yIGNvbW1hbmQgZm91bmQnICsgY29tbWFuZHNbaW5kZXhdLm5hbWUpKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGp1ZGdlKGNvbW1hbmQsIHNlZWQsIHdvcmtpbmdEaXIsIGNhbGxiYWNrKSB7XG4gICAgc3dpdGNoIChjb21tYW5kLm5hbWUpIHtcbiAgICAgICAgY2FzZSAnYXR0YWNoRmlsZSc6XG4gICAgICAgICAgICBjc2JJbnRlcmFjdGlvbi5hdHRhY2hGaWxlKHdvcmtpbmdEaXIsIGNvbW1hbmQucGFyYW1zLmZpbGVOYW1lLCBzZWVkLCBjYWxsYmFjayk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZXhlY3V0aW9uZXJcbn07XG4iLCJjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IHVybCA9IHJlcXVpcmUoJ3VybCcpO1xuXG5jb25zdCBDb21tYW5kc0Fzc2lzdGFudCA9IHJlcXVpcmUoXCIuL0NvbW1hbmRzQXNzaXN0YW50XCIpO1xuXG5mdW5jdGlvbiBhdHRhY2hGaWxlKHdvcmtpbmdEaXIsIEZpbGVPYmosIGNhbGxiYWNrKSB7XG5cdGNvbnN0IGNtZCA9IHtcblx0XHRuYW1lOiAnYXR0YWNoRmlsZScsXG5cdFx0cGFyYW1zOiB7XG5cdFx0XHRmaWxlTmFtZTogRmlsZU9iai5maWxlTmFtZVxuXHRcdH1cblx0fTtcblxuXHRjb25zdCBjb21tYW5kc0Fzc2lzdGFudCA9IG5ldyBDb21tYW5kc0Fzc2lzdGFudCh3b3JraW5nRGlyKTtcblx0Y29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4od29ya2luZ0RpciwgRmlsZU9iai5maWxlTmFtZSk7XG5cdGZzLmFjY2VzcyhmaWxlUGF0aCwgKGVycikgPT4ge1xuXHRcdGlmICghZXJyKSB7XG5cdFx0XHRjb25zdCBlID0gbmV3IEVycm9yKCdGaWxlIGFscmVhZHkgZXhpc3RzJyk7XG5cdFx0XHRlLmNvZGUgPSAnRUVYSVNUJztcblx0XHRcdHJldHVybiBjYWxsYmFjayhlKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaWxlID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZVBhdGgpO1xuXG5cdFx0ZmlsZS5vbignY2xvc2UnLCAoKSA9PiB7XG5cdFx0XHRjb21tYW5kc0Fzc2lzdGFudC5hZGRDb21tYW5kKGNtZCwgY2FsbGJhY2spO1xuXHRcdH0pO1xuXG5cdFx0RmlsZU9iai5zdHJlYW0ucGlwZShmaWxlKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGFkZEJhY2t1cCh3b3JraW5nRGlyLCBiYWNrdXBPYmosIGNhbGxiYWNrKSB7XG5cdHRyeSB7XG5cdFx0Y29uc3QgZW5kcG9pbnQgPSBuZXcgdXJsLlVSTChiYWNrdXBPYmouZW5kcG9pbnQpLm9yaWdpbjtcblxuXHRcdGNvbnN0IGNtZCA9IHtcblx0XHRcdG5hbWU6ICdhZGRCYWNrdXAnLFxuXHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdGVuZHBvaW50OiBlbmRwb2ludFxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRjb25zdCBjb21tYW5kQXNzaXN0YW50ID0gbmV3IENvbW1hbmRzQXNzaXN0YW50KHdvcmtpbmdEaXIpO1xuXHRcdGNvbW1hbmRBc3Npc3RhbnQuYWRkQ29tbWFuZChjbWQsIGNhbGxiYWNrKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdHJldHVybiBjYWxsYmFjayhlKTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0YXR0YWNoRmlsZSxcblx0YWRkQmFja3VwXG59O1xuIiwiY29uc3QgdXRpbHMgPSByZXF1aXJlKFwic3dhcm11dGlsc1wiKTtcbmNvbnN0IE93TSA9IHV0aWxzLk93TTtcbnZhciBiZWVzSGVhbGVyID0gdXRpbHMuYmVlc0hlYWxlcjtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5cblxuLy9UT0RPOiBwcmV2ZW50IGEgY2xhc3Mgb2YgcmFjZSBjb25kaXRpb24gdHlwZSBvZiBlcnJvcnMgYnkgc2lnbmFsaW5nIHdpdGggZmlsZXMgbWV0YWRhdGEgdG8gdGhlIHdhdGNoZXIgd2hlbiBpdCBpcyBzYWZlIHRvIGNvbnN1bWVcblxuZnVuY3Rpb24gRm9sZGVyTVEoZm9sZGVyLCBjYWxsYmFjayA9ICgpID0+IHt9KXtcblxuXHRpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0fVxuXG5cdGZvbGRlciA9IHBhdGgubm9ybWFsaXplKGZvbGRlcik7XG5cblx0ZnMubWtkaXIoZm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgZnVuY3Rpb24oZXJyLCByZXMpe1xuXHRcdGZzLmV4aXN0cyhmb2xkZXIsIGZ1bmN0aW9uKGV4aXN0cykge1xuXHRcdFx0aWYgKGV4aXN0cykge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgZm9sZGVyKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHRmdW5jdGlvbiBta0ZpbGVOYW1lKHN3YXJtUmF3KXtcblx0XHRsZXQgbWV0YSA9IE93TS5wcm90b3R5cGUuZ2V0TWV0YUZyb20oc3dhcm1SYXcpO1xuXHRcdGxldCBuYW1lID0gYCR7Zm9sZGVyfSR7cGF0aC5zZXB9JHttZXRhLnN3YXJtSWR9LiR7bWV0YS5zd2FybVR5cGVOYW1lfWA7XG5cdFx0Y29uc3QgdW5pcXVlID0gbWV0YS5waGFzZUlkIHx8ICQkLnVpZEdlbmVyYXRvci5zYWZlX3V1aWQoKTtcblxuXHRcdG5hbWUgPSBuYW1lK2AuJHt1bmlxdWV9YDtcblx0XHRyZXR1cm4gcGF0aC5ub3JtYWxpemUobmFtZSk7XG5cdH1cblxuXHR0aGlzLmdldEhhbmRsZXIgPSBmdW5jdGlvbigpe1xuXHRcdGlmKHByb2R1Y2VyKXtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk9ubHkgb25lIGNvbnN1bWVyIGlzIGFsbG93ZWQhXCIpO1xuXHRcdH1cblx0XHRwcm9kdWNlciA9IHRydWU7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHNlbmRTd2FybVNlcmlhbGl6YXRpb246IGZ1bmN0aW9uKHNlcmlhbGl6YXRpb24sIGNhbGxiYWNrKXtcblx0XHRcdFx0aWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdFx0XHRcdH1cblx0XHRcdFx0d3JpdGVGaWxlKG1rRmlsZU5hbWUoSlNPTi5wYXJzZShzZXJpYWxpemF0aW9uKSksIHNlcmlhbGl6YXRpb24sIGNhbGxiYWNrKTtcblx0XHRcdH0sXG5cdFx0XHRhZGRTdHJlYW0gOiBmdW5jdGlvbihzdHJlYW0sIGNhbGxiYWNrKXtcblx0XHRcdFx0aWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZighc3RyZWFtIHx8ICFzdHJlYW0ucGlwZSB8fCB0eXBlb2Ygc3RyZWFtLnBpcGUgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcIlNvbWV0aGluZyB3cm9uZyBoYXBwZW5lZFwiKSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsZXQgc3dhcm0gPSBcIlwiO1xuXHRcdFx0XHRzdHJlYW0ub24oJ2RhdGEnLCAoY2h1bmspID0+e1xuXHRcdFx0XHRcdHN3YXJtICs9IGNodW5rO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRzdHJlYW0ub24oXCJlbmRcIiwgKCkgPT4ge1xuXHRcdFx0XHRcdHdyaXRlRmlsZShta0ZpbGVOYW1lKEpTT04ucGFyc2Uoc3dhcm0pKSwgc3dhcm0sIGNhbGxiYWNrKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0c3RyZWFtLm9uKFwiZXJyb3JcIiwgKGVycikgPT57XG5cdFx0XHRcdFx0Y2FsbGJhY2soZXJyKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdFx0YWRkU3dhcm0gOiBmdW5jdGlvbihzd2FybSwgY2FsbGJhY2spe1xuXHRcdFx0XHRpZighY2FsbGJhY2spe1xuXHRcdFx0XHRcdGNhbGxiYWNrID0gJCQuZGVmYXVsdEVycm9ySGFuZGxpbmdJbXBsZW1lbnRhdGlvbjtcblx0XHRcdFx0fWVsc2UgaWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRiZWVzSGVhbGVyLmFzSlNPTihzd2FybSxudWxsLCBudWxsLCBmdW5jdGlvbihlcnIsIHJlcyl7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0d3JpdGVGaWxlKG1rRmlsZU5hbWUocmVzKSwgSihyZXMpLCBjYWxsYmFjayk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdHNlbmRTd2FybUZvckV4ZWN1dGlvbjogZnVuY3Rpb24oc3dhcm0sIGNhbGxiYWNrKXtcblx0XHRcdFx0aWYoIWNhbGxiYWNrKXtcblx0XHRcdFx0XHRjYWxsYmFjayA9ICQkLmRlZmF1bHRFcnJvckhhbmRsaW5nSW1wbGVtZW50YXRpb247XG5cdFx0XHRcdH1lbHNlIGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YmVlc0hlYWxlci5hc0pTT04oc3dhcm0sIE93TS5wcm90b3R5cGUuZ2V0TWV0YUZyb20oc3dhcm0sIFwicGhhc2VOYW1lXCIpLCBPd00ucHJvdG90eXBlLmdldE1ldGFGcm9tKHN3YXJtLCBcImFyZ3NcIiksIGZ1bmN0aW9uKGVyciwgcmVzKXtcblx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR2YXIgZmlsZSA9IG1rRmlsZU5hbWUocmVzKTtcblx0XHRcdFx0XHR2YXIgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KHJlcyk7XG5cblx0XHRcdFx0XHQvL2lmIHRoZXJlIGFyZSBubyBtb3JlIEZEJ3MgZm9yIGZpbGVzIHRvIGJlIHdyaXR0ZW4gd2UgcmV0cnkuXG5cdFx0XHRcdFx0ZnVuY3Rpb24gd3JhcHBlcihlcnJvciwgcmVzdWx0KXtcblx0XHRcdFx0XHRcdGlmKGVycm9yKXtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coYENhdWdodCBhbiB3cml0ZSBlcnJvci4gUmV0cnkgdG8gd3JpdGUgZmlsZSBbJHtmaWxlfV1gKTtcblx0XHRcdFx0XHRcdFx0c2V0VGltZW91dCgoKT0+e1xuXHRcdFx0XHRcdFx0XHRcdHdyaXRlRmlsZShmaWxlLCBjb250ZW50LCB3cmFwcGVyKTtcblx0XHRcdFx0XHRcdFx0fSwgMTApO1xuXHRcdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnJvciwgcmVzdWx0KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR3cml0ZUZpbGUoZmlsZSwgY29udGVudCwgd3JhcHBlcik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH07XG5cdH07XG5cblx0dmFyIHJlY2lwaWVudDtcblx0dGhpcy5zZXRJUENDaGFubmVsID0gZnVuY3Rpb24ocHJvY2Vzc0NoYW5uZWwpe1xuXHRcdGlmKHByb2Nlc3NDaGFubmVsICYmICFwcm9jZXNzQ2hhbm5lbC5zZW5kIHx8ICh0eXBlb2YgcHJvY2Vzc0NoYW5uZWwuc2VuZCkgIT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlJlY2lwaWVudCBpcyBub3QgaW5zdGFuY2Ugb2YgcHJvY2Vzcy9jaGlsZF9wcm9jZXNzIG9yIGl0IHdhcyBub3Qgc3Bhd25lZCB3aXRoIElQQyBjaGFubmVsIVwiKTtcblx0XHR9XG5cdFx0cmVjaXBpZW50ID0gcHJvY2Vzc0NoYW5uZWw7XG5cdFx0aWYoY29uc3VtZXIpe1xuXHRcdFx0Y29uc29sZS5sb2coYENoYW5uZWwgdXBkYXRlZGApO1xuXHRcdFx0KHJlY2lwaWVudCB8fCBwcm9jZXNzKS5vbihcIm1lc3NhZ2VcIiwgcmVjZWl2ZUVudmVsb3BlKTtcblx0XHR9XG5cdH07XG5cblxuXHR2YXIgY29uc3VtZWRNZXNzYWdlcyA9IHt9O1xuXG5cdGZ1bmN0aW9uIGNoZWNrSWZDb25zdW1tZWQobmFtZSwgbWVzc2FnZSl7XG5cdFx0Y29uc3Qgc2hvcnROYW1lID0gcGF0aC5iYXNlbmFtZShuYW1lKTtcblx0XHRjb25zdCBwcmV2aW91c1NhdmVkID0gY29uc3VtZWRNZXNzYWdlc1tzaG9ydE5hbWVdO1xuXHRcdGxldCByZXN1bHQgPSBmYWxzZTtcblx0XHRpZihwcmV2aW91c1NhdmVkICYmICFwcmV2aW91c1NhdmVkLmxvY2FsZUNvbXBhcmUobWVzc2FnZSkpe1xuXHRcdFx0cmVzdWx0ID0gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdGZ1bmN0aW9uIHNhdmUySGlzdG9yeShlbnZlbG9wZSl7XG5cdFx0Y29uc3VtZWRNZXNzYWdlc1twYXRoLmJhc2VuYW1lKGVudmVsb3BlLm5hbWUpXSA9IGVudmVsb3BlLm1lc3NhZ2U7XG5cdH1cblxuXHRmdW5jdGlvbiBidWlsZEVudmVsb3BlQ29uZmlybWF0aW9uKGVudmVsb3BlLCBzYXZlSGlzdG9yeSl7XG5cdFx0aWYoc2F2ZUhpc3Rvcnkpe1xuXHRcdFx0c2F2ZTJIaXN0b3J5KGVudmVsb3BlKTtcblx0XHR9XG5cdFx0cmV0dXJuIGBDb25maXJtIGVudmVsb3BlICR7ZW52ZWxvcGUudGltZXN0YW1wfSBzZW50IHRvICR7ZW52ZWxvcGUuZGVzdH1gO1xuXHR9XG5cblx0ZnVuY3Rpb24gYnVpbGRFbnZlbG9wZShuYW1lLCBtZXNzYWdlKXtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZGVzdDogZm9sZGVyLFxuXHRcdFx0c3JjOiBwcm9jZXNzLnBpZCxcblx0XHRcdHRpbWVzdGFtcDogbmV3IERhdGUoKS5nZXRUaW1lKCksXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlLFxuXHRcdFx0bmFtZTogbmFtZVxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiByZWNlaXZlRW52ZWxvcGUoZW52ZWxvcGUpe1xuXHRcdGlmKCFlbnZlbG9wZSB8fCB0eXBlb2YgZW52ZWxvcGUgIT09IFwib2JqZWN0XCIpe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQvL2NvbnNvbGUubG9nKFwicmVjZWl2ZWQgZW52ZWxvcGVcIiwgZW52ZWxvcGUsIGZvbGRlcik7XG5cblx0XHRpZihlbnZlbG9wZS5kZXN0ICE9PSBmb2xkZXIgJiYgZm9sZGVyLmluZGV4T2YoZW52ZWxvcGUuZGVzdCkhPT0gLTEgJiYgZm9sZGVyLmxlbmd0aCA9PT0gZW52ZWxvcGUuZGVzdCsxKXtcblx0XHRcdGNvbnNvbGUubG9nKFwiVGhpcyBlbnZlbG9wZSBpcyBub3QgZm9yIG1lIVwiKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRsZXQgbWVzc2FnZSA9IGVudmVsb3BlLm1lc3NhZ2U7XG5cblx0XHRpZihjYWxsYmFjayl7XG5cdFx0XHQvL2NvbnNvbGUubG9nKFwiU2VuZGluZyBjb25maXJtYXRpb25cIiwgcHJvY2Vzcy5waWQpO1xuXHRcdFx0cmVjaXBpZW50LnNlbmQoYnVpbGRFbnZlbG9wZUNvbmZpcm1hdGlvbihlbnZlbG9wZSwgdHJ1ZSkpO1xuXHRcdFx0Y29uc3VtZXIobnVsbCwgSlNPTi5wYXJzZShtZXNzYWdlKSk7XG5cdFx0fVxuXHR9XG5cblx0dGhpcy5yZWdpc3RlckFzSVBDQ29uc3VtZXIgPSBmdW5jdGlvbihjYWxsYmFjayl7XG5cdFx0aWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhlIGFyZ3VtZW50IHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdH1cblx0XHRyZWdpc3RlcmVkQXNJUENDb25zdW1lciA9IHRydWU7XG5cdFx0Ly93aWxsIHJlZ2lzdGVyIGFzIG5vcm1hbCBjb25zdW1lciBpbiBvcmRlciB0byBjb25zdW1lIGFsbCBleGlzdGluZyBtZXNzYWdlcyBidXQgd2l0aG91dCBzZXR0aW5nIHRoZSB3YXRjaGVyXG5cdFx0dGhpcy5yZWdpc3RlckNvbnN1bWVyKGNhbGxiYWNrLCB0cnVlLCAod2F0Y2hlcikgPT4gIXdhdGNoZXIpO1xuXG5cdFx0Ly9jb25zb2xlLmxvZyhcIlJlZ2lzdGVyZWQgYXMgSVBDIENvbnN1bW1lclwiLCApO1xuXHRcdChyZWNpcGllbnQgfHwgcHJvY2Vzcykub24oXCJtZXNzYWdlXCIsIHJlY2VpdmVFbnZlbG9wZSk7XG5cdH07XG5cblx0dGhpcy5yZWdpc3RlckNvbnN1bWVyID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBzaG91bGREZWxldGVBZnRlclJlYWQgPSB0cnVlLCBzaG91bGRXYWl0Rm9yTW9yZSA9ICh3YXRjaGVyKSA9PiB0cnVlKSB7XG5cdFx0aWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdH1cblx0XHRpZiAoY29uc3VtZXIpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk9ubHkgb25lIGNvbnN1bWVyIGlzIGFsbG93ZWQhIFwiICsgZm9sZGVyKTtcblx0XHR9XG5cblx0XHRjb25zdW1lciA9IGNhbGxiYWNrO1xuXG5cdFx0ZnMubWtkaXIoZm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgZnVuY3Rpb24gKGVyciwgcmVzKSB7XG5cdFx0XHRpZiAoZXJyICYmIChlcnIuY29kZSAhPT0gJ0VFWElTVCcpKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHR9XG5cdFx0XHRjb25zdW1lQWxsRXhpc3Rpbmcoc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCBzaG91bGRXYWl0Rm9yTW9yZSk7XG5cdFx0fSk7XG5cdH07XG5cblx0dGhpcy53cml0ZU1lc3NhZ2UgPSB3cml0ZUZpbGU7XG5cblx0dGhpcy51bmxpbmtDb250ZW50ID0gZnVuY3Rpb24gKG1lc3NhZ2VJZCwgY2FsbGJhY2spIHtcblx0XHRjb25zdCBtZXNzYWdlUGF0aCA9IHBhdGguam9pbihmb2xkZXIsIG1lc3NhZ2VJZCk7XG5cblx0XHRmcy51bmxpbmsobWVzc2FnZVBhdGgsIChlcnIpID0+IHtcblx0XHRcdGNhbGxiYWNrKGVycik7XG5cdFx0fSk7XG5cdH07XG5cblx0dGhpcy5kaXNwb3NlID0gZnVuY3Rpb24oZm9yY2Upe1xuXHRcdGlmKHR5cGVvZiBmb2xkZXIgIT0gXCJ1bmRlZmluZWRcIil7XG5cdFx0XHR2YXIgZmlsZXM7XG5cdFx0XHR0cnl7XG5cdFx0XHRcdGZpbGVzID0gZnMucmVhZGRpclN5bmMoZm9sZGVyKTtcblx0XHRcdH1jYXRjaChlcnJvcil7XG5cdFx0XHRcdC8vLi5cblx0XHRcdH1cblxuXHRcdFx0aWYoZmlsZXMgJiYgZmlsZXMubGVuZ3RoID4gMCAmJiAhZm9yY2Upe1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIkRpc3Bvc2luZyBhIGNoYW5uZWwgdGhhdCBzdGlsbCBoYXMgbWVzc2FnZXMhIERpciB3aWxsIG5vdCBiZSByZW1vdmVkIVwiKTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRmcy5ybWRpclN5bmMoZm9sZGVyKTtcblx0XHRcdFx0fWNhdGNoKGVycil7XG5cdFx0XHRcdFx0Ly8uLlxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGZvbGRlciA9IG51bGw7XG5cdFx0fVxuXG5cdFx0aWYocHJvZHVjZXIpe1xuXHRcdFx0Ly9ubyBuZWVkIHRvIGRvIGFueXRoaW5nIGVsc2Vcblx0XHR9XG5cblx0XHRpZih0eXBlb2YgY29uc3VtZXIgIT0gXCJ1bmRlZmluZWRcIil7XG5cdFx0XHRjb25zdW1lciA9ICgpID0+IHt9O1xuXHRcdH1cblxuXHRcdGlmKHdhdGNoZXIpe1xuXHRcdFx0d2F0Y2hlci5jbG9zZSgpO1xuXHRcdFx0d2F0Y2hlciA9IG51bGw7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH07XG5cblxuXHQvKiAtLS0tLS0tLS0tLS0tLS0tIHByb3RlY3RlZCAgZnVuY3Rpb25zICovXG5cdHZhciBjb25zdW1lciA9IG51bGw7XG5cdHZhciByZWdpc3RlcmVkQXNJUENDb25zdW1lciA9IGZhbHNlO1xuXHR2YXIgcHJvZHVjZXIgPSBudWxsO1xuXG5cdGZ1bmN0aW9uIGJ1aWxkUGF0aEZvckZpbGUoZmlsZW5hbWUpe1xuXHRcdHJldHVybiBwYXRoLm5vcm1hbGl6ZShwYXRoLmpvaW4oZm9sZGVyLCBmaWxlbmFtZSkpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY29uc3VtZU1lc3NhZ2UoZmlsZW5hbWUsIHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgY2FsbGJhY2spIHtcblx0XHR2YXIgZnVsbFBhdGggPSBidWlsZFBhdGhGb3JGaWxlKGZpbGVuYW1lKTtcblxuXHRcdGZzLnJlYWRGaWxlKGZ1bGxQYXRoLCBcInV0ZjhcIiwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuXHRcdFx0aWYgKCFlcnIpIHtcblx0XHRcdFx0aWYgKGRhdGEgIT09IFwiXCIpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0dmFyIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGRhdGEpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIlBhcnNpbmcgZXJyb3JcIiwgZXJyb3IpO1xuXHRcdFx0XHRcdFx0ZXJyID0gZXJyb3I7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYoY2hlY2tJZkNvbnN1bW1lZChmdWxsUGF0aCwgZGF0YSkpe1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhgbWVzc2FnZSBhbHJlYWR5IGNvbnN1bWVkIFske2ZpbGVuYW1lfV1gKTtcblx0XHRcdFx0XHRcdHJldHVybiA7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHNob3VsZERlbGV0ZUFmdGVyUmVhZCkge1xuXG5cdFx0XHRcdFx0XHRmcy51bmxpbmsoZnVsbFBhdGgsIGZ1bmN0aW9uIChlcnIsIHJlcykge1xuXHRcdFx0XHRcdFx0XHRpZiAoZXJyKSB7dGhyb3cgZXJyO307XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyLCBtZXNzYWdlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJDb25zdW1lIGVycm9yXCIsIGVycik7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gY29uc3VtZUFsbEV4aXN0aW5nKHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgc2hvdWxkV2FpdEZvck1vcmUpIHtcblxuXHRcdGxldCBjdXJyZW50RmlsZXMgPSBbXTtcblxuXHRcdGZzLnJlYWRkaXIoZm9sZGVyLCAndXRmOCcsIGZ1bmN0aW9uIChlcnIsIGZpbGVzKSB7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdCQkLmVycm9ySGFuZGxlci5lcnJvcihlcnIpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50RmlsZXMgPSBmaWxlcztcblx0XHRcdGl0ZXJhdGVBbmRDb25zdW1lKGZpbGVzKTtcblxuXHRcdH0pO1xuXG5cdFx0ZnVuY3Rpb24gc3RhcnRXYXRjaGluZygpe1xuXHRcdFx0aWYgKHNob3VsZFdhaXRGb3JNb3JlKHRydWUpKSB7XG5cdFx0XHRcdHdhdGNoRm9sZGVyKHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgc2hvdWxkV2FpdEZvck1vcmUpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGl0ZXJhdGVBbmRDb25zdW1lKGZpbGVzLCBjdXJyZW50SW5kZXggPSAwKSB7XG5cdFx0XHRpZiAoY3VycmVudEluZGV4ID09PSBmaWxlcy5sZW5ndGgpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZyhcInN0YXJ0IHdhdGNoaW5nXCIsIG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcblx0XHRcdFx0c3RhcnRXYXRjaGluZygpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwYXRoLmV4dG5hbWUoZmlsZXNbY3VycmVudEluZGV4XSkgIT09IGluX3Byb2dyZXNzKSB7XG5cdFx0XHRcdGNvbnN1bWVNZXNzYWdlKGZpbGVzW2N1cnJlbnRJbmRleF0sIHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgKGVyciwgZGF0YSkgPT4ge1xuXHRcdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRcdGl0ZXJhdGVBbmRDb25zdW1lKGZpbGVzLCArK2N1cnJlbnRJbmRleCk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNvbnN1bWVyKG51bGwsIGRhdGEsIHBhdGguYmFzZW5hbWUoZmlsZXNbY3VycmVudEluZGV4XSkpO1xuXHRcdFx0XHRcdGlmIChzaG91bGRXYWl0Rm9yTW9yZSgpKSB7XG5cdFx0XHRcdFx0XHRpdGVyYXRlQW5kQ29uc3VtZShmaWxlcywgKytjdXJyZW50SW5kZXgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpdGVyYXRlQW5kQ29uc3VtZShmaWxlcywgKytjdXJyZW50SW5kZXgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHdyaXRlRmlsZShmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spe1xuXHRcdGlmKHJlY2lwaWVudCl7XG5cdFx0XHR2YXIgZW52ZWxvcGUgPSBidWlsZEVudmVsb3BlKGZpbGVuYW1lLCBjb250ZW50KTtcblx0XHRcdC8vY29uc29sZS5sb2coXCJTZW5kaW5nIHRvXCIsIHJlY2lwaWVudC5waWQsIHJlY2lwaWVudC5wcGlkLCBcImVudmVsb3BlXCIsIGVudmVsb3BlKTtcblx0XHRcdHJlY2lwaWVudC5zZW5kKGVudmVsb3BlKTtcblx0XHRcdHZhciBjb25maXJtYXRpb25SZWNlaXZlZCA9IGZhbHNlO1xuXG5cdFx0XHRmdW5jdGlvbiByZWNlaXZlQ29uZmlybWF0aW9uKG1lc3NhZ2Upe1xuXHRcdFx0XHRpZihtZXNzYWdlID09PSBidWlsZEVudmVsb3BlQ29uZmlybWF0aW9uKGVudmVsb3BlKSl7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhcIlJlY2VpdmVkIGNvbmZpcm1hdGlvblwiLCByZWNpcGllbnQucGlkKTtcblx0XHRcdFx0XHRjb25maXJtYXRpb25SZWNlaXZlZCA9IHRydWU7XG5cdFx0XHRcdFx0dHJ5e1xuXHRcdFx0XHRcdFx0cmVjaXBpZW50Lm9mZihcIm1lc3NhZ2VcIiwgcmVjZWl2ZUNvbmZpcm1hdGlvbik7XG5cdFx0XHRcdFx0fWNhdGNoKGVycil7XG5cdFx0XHRcdFx0XHQvLy4uLlxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJlY2lwaWVudC5vbihcIm1lc3NhZ2VcIiwgcmVjZWl2ZUNvbmZpcm1hdGlvbik7XG5cblx0XHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdFx0aWYoIWNvbmZpcm1hdGlvblJlY2VpdmVkKXtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKFwiTm8gY29uZmlybWF0aW9uLi4uXCIsIHByb2Nlc3MucGlkKTtcblx0XHRcdFx0XHRoaWRkZW5fd3JpdGVGaWxlKGZpbGVuYW1lLCBjb250ZW50LCBjYWxsYmFjayk7XG5cdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdGlmKGNhbGxiYWNrKXtcblx0XHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCBjb250ZW50KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sIDIwMCk7XG5cdFx0fWVsc2V7XG5cdFx0XHRoaWRkZW5fd3JpdGVGaWxlKGZpbGVuYW1lLCBjb250ZW50LCBjYWxsYmFjayk7XG5cdFx0fVxuXHR9XG5cblx0Y29uc3QgaW5fcHJvZ3Jlc3MgPSBcIi5pbl9wcm9ncmVzc1wiO1xuXHRmdW5jdGlvbiBoaWRkZW5fd3JpdGVGaWxlKGZpbGVuYW1lLCBjb250ZW50LCBjYWxsYmFjayl7XG5cdFx0dmFyIHRtcEZpbGVuYW1lID0gZmlsZW5hbWUraW5fcHJvZ3Jlc3M7XG5cdFx0dHJ5e1xuXHRcdFx0aWYoZnMuZXhpc3RzU3luYyh0bXBGaWxlbmFtZSkgfHwgZnMuZXhpc3RzU3luYyhmaWxlbmFtZSkpe1xuXHRcdFx0XHRjb25zb2xlLmxvZyhuZXcgRXJyb3IoYE92ZXJ3cml0aW5nIGZpbGUgJHtmaWxlbmFtZX1gKSk7XG5cdFx0XHR9XG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKHRtcEZpbGVuYW1lLCBjb250ZW50KTtcblx0XHRcdGZzLnJlbmFtZVN5bmModG1wRmlsZW5hbWUsIGZpbGVuYW1lKTtcblx0XHR9Y2F0Y2goZXJyKXtcblx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdH1cblx0XHRjYWxsYmFjayhudWxsLCBjb250ZW50KTtcblx0fVxuXG5cdHZhciBhbHJlYWR5S25vd25DaGFuZ2VzID0ge307XG5cblx0ZnVuY3Rpb24gYWxyZWFkeUZpcmVkQ2hhbmdlcyhmaWxlbmFtZSwgY2hhbmdlKXtcblx0XHR2YXIgcmVzID0gZmFsc2U7XG5cdFx0aWYoYWxyZWFkeUtub3duQ2hhbmdlc1tmaWxlbmFtZV0pe1xuXHRcdFx0cmVzID0gdHJ1ZTtcblx0XHR9ZWxzZXtcblx0XHRcdGFscmVhZHlLbm93bkNoYW5nZXNbZmlsZW5hbWVdID0gY2hhbmdlO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXM7XG5cdH1cblxuXHRmdW5jdGlvbiB3YXRjaEZvbGRlcihzaG91bGREZWxldGVBZnRlclJlYWQsIHNob3VsZFdhaXRGb3JNb3JlKXtcblxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdGZzLnJlYWRkaXIoZm9sZGVyLCAndXRmOCcsIGZ1bmN0aW9uIChlcnIsIGZpbGVzKSB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHQkJC5lcnJvckhhbmRsZXIuZXJyb3IoZXJyKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmb3IodmFyIGk9MDsgaTxmaWxlcy5sZW5ndGg7IGkrKyl7XG5cdFx0XHRcdFx0d2F0Y2hGaWxlc0hhbmRsZXIoXCJjaGFuZ2VcIiwgZmlsZXNbaV0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAxMDAwKTtcblxuXHRcdGZ1bmN0aW9uIHdhdGNoRmlsZXNIYW5kbGVyKGV2ZW50VHlwZSwgZmlsZW5hbWUpe1xuXHRcdFx0Ly9jb25zb2xlLmxvZyhgR290ICR7ZXZlbnRUeXBlfSBvbiAke2ZpbGVuYW1lfWApO1xuXG5cdFx0XHRpZighZmlsZW5hbWUgfHwgcGF0aC5leHRuYW1lKGZpbGVuYW1lKSA9PT0gaW5fcHJvZ3Jlc3Mpe1xuXHRcdFx0XHQvL2NhdWdodCBhIGRlbGV0ZSBldmVudCBvZiBhIGZpbGVcblx0XHRcdFx0Ly9vclxuXHRcdFx0XHQvL2ZpbGUgbm90IHJlYWR5IHRvIGJlIGNvbnN1bWVkIChpbiBwcm9ncmVzcylcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgZiA9IGJ1aWxkUGF0aEZvckZpbGUoZmlsZW5hbWUpO1xuXHRcdFx0aWYoIWZzLmV4aXN0c1N5bmMoZikpe1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKFwiRmlsZSBub3QgZm91bmRcIiwgZik7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly9jb25zb2xlLmxvZyhgUHJlcGFyaW5nIHRvIGNvbnN1bWUgJHtmaWxlbmFtZX1gKTtcblx0XHRcdGlmKCFhbHJlYWR5RmlyZWRDaGFuZ2VzKGZpbGVuYW1lLCBldmVudFR5cGUpKXtcblx0XHRcdFx0Y29uc3VtZU1lc3NhZ2UoZmlsZW5hbWUsIHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgKGVyciwgZGF0YSkgPT4ge1xuXHRcdFx0XHRcdC8vYWxsb3cgYSByZWFkIGEgdGhlIGZpbGVcblx0XHRcdFx0XHRhbHJlYWR5S25vd25DaGFuZ2VzW2ZpbGVuYW1lXSA9IHVuZGVmaW5lZDtcblxuXHRcdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRcdC8vID8/XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIlxcbkNhdWdodCBhbiBlcnJvclwiLCBlcnIpO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGNvbnN1bWVyKG51bGwsIGRhdGEsIGZpbGVuYW1lKTtcblxuXG5cdFx0XHRcdFx0aWYgKCFzaG91bGRXYWl0Rm9yTW9yZSgpKSB7XG5cdFx0XHRcdFx0XHR3YXRjaGVyLmNsb3NlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIlNvbWV0aGluZyBoYXBwZW5zLi4uXCIsIGZpbGVuYW1lKTtcblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdGNvbnN0IHdhdGNoZXIgPSBmcy53YXRjaChmb2xkZXIsIHdhdGNoRmlsZXNIYW5kbGVyKTtcblxuXHRcdGNvbnN0IGludGVydmFsVGltZXIgPSBzZXRJbnRlcnZhbCgoKT0+e1xuXHRcdFx0ZnMucmVhZGRpcihmb2xkZXIsICd1dGY4JywgZnVuY3Rpb24gKGVyciwgZmlsZXMpIHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdCQkLmVycm9ySGFuZGxlci5lcnJvcihlcnIpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKGZpbGVzLmxlbmd0aCA+IDApe1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKGBcXG5cXG5Gb3VuZCAke2ZpbGVzLmxlbmd0aH0gZmlsZXMgbm90IGNvbnN1bWVkIHlldCBpbiAke2ZvbGRlcn1gLCBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcIlxcblxcblwiKTtcblx0XHRcdFx0XHQvL2Zha2luZyBhIHJlbmFtZSBldmVudCB0cmlnZ2VyXG5cdFx0XHRcdFx0d2F0Y2hGaWxlc0hhbmRsZXIoXCJyZW5hbWVcIiwgZmlsZXNbMF0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCA1MDAwKTtcblx0fVxufVxuXG5leHBvcnRzLmdldEZvbGRlclF1ZXVlID0gZnVuY3Rpb24oZm9sZGVyLCBjYWxsYmFjayl7XG5cdHJldHVybiBuZXcgRm9sZGVyTVEoZm9sZGVyLCBjYWxsYmFjayk7XG59O1xuIiwiZnVuY3Rpb24gTWVtb3J5TVFJbnRlcmFjdGlvblNwYWNlKCkge1xuICAgIHZhciBzd2FybUludGVyYWN0ID0gcmVxdWlyZShcIi4vLi4vc3dhcm1JbnRlcmFjdGlvblwiKTtcbiAgICB2YXIgc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzID0ge307XG5cbiAgICBmdW5jdGlvbiBkaXNwYXRjaGluZ1N3YXJtcyhzd2FybSl7XG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHN1YnNMaXN0ID0gc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtLm1ldGEuc3dhcm1JZF07XG4gICAgICAgICAgICBpZihzdWJzTGlzdCl7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpPTA7IGk8c3Vic0xpc3QubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlciA9IHN1YnNMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKG51bGwsIHN3YXJtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDEpO1xuICAgIH1cblxuICAgIHZhciBpbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIGZ1bmN0aW9uIGluaXQoKXtcblx0XHRpZighaW5pdGlhbGl6ZWQpe1xuXHRcdFx0aW5pdGlhbGl6ZWQgPSB0cnVlO1xuXHRcdFx0JCQuUFNLX1B1YlN1Yi5zdWJzY3JpYmUoJCQuQ09OU1RBTlRTLlNXQVJNX0ZPUl9FWEVDVVRJT04sIGRpc3BhdGNoaW5nU3dhcm1zKTtcblx0XHR9XG4gICAgfVxuXG4gICAgdmFyIGNvbW0gPSB7XG4gICAgICAgIHN0YXJ0U3dhcm06IGZ1bmN0aW9uIChzd2FybU5hbWUsIGN0b3IsIGFyZ3MpIHtcblx0XHRcdGluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiAkJC5zd2FybS5zdGFydChzd2FybU5hbWUsIGN0b3IsIC4uLmFyZ3MpO1xuICAgICAgICB9LFxuICAgICAgICBjb250aW51ZVN3YXJtOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBzd2FybVNlcmlhbGlzYXRpb24sIGN0b3IsIGFyZ3MpIHtcblx0XHRcdGluaXQoKTtcbiAgICAgICAgICAgIHN3YXJtSGFuZGxlcltjdG9yXS5hcHBseShzd2FybUhhbmRsZXIsIGFyZ3MpO1xuICAgICAgICB9LFxuICAgICAgICBvbjogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgY2FsbGJhY2spIHtcblx0XHRcdGluaXQoKTtcbiAgICAgICAgICAgIGlmKCFzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm1IYW5kbGVyLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtSWRdKXtcblx0XHRcdFx0c3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXSA9IFsgY2FsbGJhY2sgXTtcbiAgICAgICAgICAgIH1lbHNle1xuXHRcdFx0XHRzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm1IYW5kbGVyLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtSWRdLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvZmY6IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIpIHtcblx0XHRcdGlmKHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybUhhbmRsZXIuZ2V0SW5uZXJWYWx1ZSgpLm1ldGEuc3dhcm1JZF0pe1xuXHRcdFx0XHRzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm1IYW5kbGVyLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtSWRdID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIHN3YXJtSW50ZXJhY3QubmV3SW50ZXJhY3Rpb25TcGFjZShjb21tKTtcblxufVxuXG52YXIgc3BhY2U7XG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVJbnRlcmFjdGlvblNwYWNlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmKCFzcGFjZSl7XG4gICAgICAgIHNwYWNlID0gbmV3IE1lbW9yeU1RSW50ZXJhY3Rpb25TcGFjZSgpO1xuICAgIH1lbHNle1xuICAgICAgICBjb25zb2xlLmxvZyhcIk1lbW9yeU1RSW50ZXJhY3Rpb25TcGFjZSBhbHJlYWR5IGNyZWF0ZWQhIFVzaW5nIHNhbWUgaW5zdGFuY2UuXCIpO1xuICAgIH1cbiAgICByZXR1cm4gc3BhY2U7XG59OyIsImZ1bmN0aW9uIFdpbmRvd01RSW50ZXJhY3Rpb25TcGFjZShjaGFubmVsTmFtZSwgY29tbXVuaWNhdGlvbldpbmRvdywgc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwpe1xuICAgIHZhciBzd2FybUludGVyYWN0ID0gcmVxdWlyZShcIi4vLi4vc3dhcm1JbnRlcmFjdGlvblwiKTtcbiAgICB2YXIgY2hpbGRNZXNzYWdlTVEgPSByZXF1aXJlKFwiLi9zcGVjaWZpY01RSW1wbC9DaGlsZFdlYlZpZXdNUVwiKS5jcmVhdGVNUShjaGFubmVsTmFtZSwgY29tbXVuaWNhdGlvbldpbmRvdywgc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwpO1xuICAgIHZhciBzd2FybUluc3RhbmNlcyA9IHt9O1xuXG4gICAgdmFyIGNvbW0gPSB7XG4gICAgICAgIHN0YXJ0U3dhcm06IGZ1bmN0aW9uIChzd2FybU5hbWUsIGN0b3IsIGFyZ3MpIHtcbiAgICAgICAgICAgIHZhciBzd2FybSA9IHttZXRhOntcbiAgICAgICAgICAgICAgICAgICAgc3dhcm1UeXBlTmFtZTpzd2FybU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGN0b3I6Y3RvcixcbiAgICAgICAgICAgICAgICAgICAgYXJnczphcmdzXG4gICAgICAgICAgICAgICAgfX07XG4gICAgICAgICAgICBjaGlsZE1lc3NhZ2VNUS5wcm9kdWNlKHN3YXJtKTtcbiAgICAgICAgICAgIHJldHVybiBzd2FybTtcbiAgICAgICAgfSxcbiAgICAgICAgY29udGludWVTd2FybTogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgc3dhcm1TZXJpYWxpc2F0aW9uLCBwaGFzZU5hbWUsIGFyZ3MpIHtcblxuICAgICAgICAgICAgdmFyIG5ld1NlcmlhbGl6YXRpb24gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHN3YXJtU2VyaWFsaXNhdGlvbikpO1xuICAgICAgICAgICAgbmV3U2VyaWFsaXphdGlvbi5tZXRhLmN0b3IgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uLm1ldGEucGhhc2VOYW1lID0gcGhhc2VOYW1lO1xuICAgICAgICAgICAgbmV3U2VyaWFsaXphdGlvbi5tZXRhLnRhcmdldCA9IFwiaWZyYW1lXCI7XG4gICAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uLm1ldGEuYXJncyA9IGFyZ3M7XG4gICAgICAgICAgICBjaGlsZE1lc3NhZ2VNUS5wcm9kdWNlKG5ld1NlcmlhbGl6YXRpb24pO1xuICAgICAgICB9LFxuICAgICAgICBvbjogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNoaWxkTWVzc2FnZU1RLnJlZ2lzdGVyQ29uc3VtZXIoY2FsbGJhY2spO1xuICAgICAgICB9LFxuICAgICAgICBvZmY6IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIpIHtcblxuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgdmFyIHNwYWNlID0gc3dhcm1JbnRlcmFjdC5uZXdJbnRlcmFjdGlvblNwYWNlKGNvbW0pO1xuICAgIHRoaXMuc3RhcnRTd2FybSA9IGZ1bmN0aW9uIChuYW1lLCBjdG9yLCAuLi5hcmdzKSB7XG4gICAgICAgIHJldHVybiBzcGFjZS5zdGFydFN3YXJtKG5hbWUsIGN0b3IsIC4uLmFyZ3MpO1xuICAgIH07XG5cbiAgICB0aGlzLmluaXQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgY2hpbGRNZXNzYWdlTVEucmVnaXN0ZXJDb25zdW1lcihmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBzd2FybTtcbiAgICAgICAgICAgICAgICBpZihkYXRhICYmIGRhdGEubWV0YSAmJiBkYXRhLm1ldGEuc3dhcm1JZCAmJiBzd2FybUluc3RhbmNlc1tkYXRhLm1ldGEuc3dhcm1JZF0pe1xuICAgICAgICAgICAgICAgICAgICBzd2FybSA9IHN3YXJtSW5zdGFuY2VzW2RhdGEubWV0YS5zd2FybUlkXTtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm0udXBkYXRlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBzd2FybVtkYXRhLm1ldGEucGhhc2VOYW1lXS5hcHBseShzd2FybSwgZGF0YS5tZXRhLmFyZ3MpO1xuICAgICAgICAgICAgICAgIH1lbHNle1xuXG4gICAgICAgICAgICAgICAgICAgIHN3YXJtID0gJCQuc3dhcm0uc3RhcnQoZGF0YS5tZXRhLnN3YXJtVHlwZU5hbWUsIGRhdGEubWV0YS5jdG9yLCAuLi5kYXRhLm1ldGEuYXJncyk7XG5cbiAgICAgICAgICAgICAgICAgICAgc3dhcm1JbnN0YW5jZXNbc3dhcm0uZ2V0SW5uZXJWYWx1ZSgpLm1ldGEuc3dhcm1JZF0gPSBzd2FybTtcblxuICAgICAgICAgICAgICAgICAgICBzd2FybS5vblJldHVybihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU3dhcm0gaXMgZmluaXNoZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgcmVhZHlFdnQgPSB7d2ViVmlld0lzUmVhZHk6IHRydWV9O1xuICAgICAgICBwYXJlbnQucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkocmVhZHlFdnQpLCBcIipcIik7XG5cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlcihtZXNzYWdlKXtcbiAgICAgICAgbG9nKFwic2VuZGluZyBzd2FybSBcIiwgbWVzc2FnZSk7XG4gICAgICAgIGNoaWxkTWVzc2FnZU1RLnByb2R1Y2UobWVzc2FnZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmlsdGVySW50ZXJhY3Rpb25zKG1lc3NhZ2Upe1xuICAgICAgICBsb2coXCJjaGVja2luZyBpZiBtZXNzYWdlIGlzICdpbnRlcmFjdGlvbicgXCIsIG1lc3NhZ2UpO1xuICAgICAgICByZXR1cm4gbWVzc2FnZSAmJiBtZXNzYWdlLm1ldGEgJiYgbWVzc2FnZS5tZXRhLnRhcmdldCAmJiBtZXNzYWdlLm1ldGEudGFyZ2V0ID09PSBcImludGVyYWN0aW9uXCI7XG4gICAgfVxuICAgIC8vVE9ETyBmaXggdGhpcyBmb3IgbmF0aXZlV2ViVmlld1xuXG4gICAgJCQuUFNLX1B1YlN1Yi5zdWJzY3JpYmUoJCQuQ09OU1RBTlRTLlNXQVJNX0ZPUl9FWEVDVVRJT04sIGhhbmRsZXIsIGZ1bmN0aW9uKCl7cmV0dXJuIHRydWU7fSwgZmlsdGVySW50ZXJhY3Rpb25zKTtcblxuICAgIGxvZyhcInJlZ2lzdGVyaW5nIGxpc3RlbmVyIGZvciBoYW5kbGluZyBpbnRlcmFjdGlvbnNcIik7XG5cbiAgICBmdW5jdGlvbiBsb2coLi4uYXJncyl7XG4gICAgICAgIGFyZ3MudW5zaGlmdChcIltXaW5kb3dNUUludGVyYWN0aW9uU3BhY2VcIisod2luZG93LmZyYW1lRWxlbWVudCA/IFwiKlwiOiBcIlwiKStcIl1cIiApO1xuICAgICAgICAvL2NvbnNvbGUubG9nLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZSA9IGZ1bmN0aW9uKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93LCBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCl7XG4gICAgcmV0dXJuIG5ldyBXaW5kb3dNUUludGVyYWN0aW9uU3BhY2UoY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3csIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsKTtcbn07IiwiLypUT0RPXG5Gb3IgdGhlIG1vbWVudCBJIGRvbid0IHNlZSBhbnkgcHJvYmxlbXMgaWYgaXQncyBub3QgY3J5cHRvZ3JhcGhpYyBzYWZlLlxuVGhpcyB2ZXJzaW9uIGtlZXBzICBjb21wYXRpYmlsaXR5IHdpdGggbW9iaWxlIGJyb3dzZXJzL3dlYnZpZXdzLlxuICovXG5mdW5jdGlvbiB1dWlkdjQoKSB7XG4gICAgcmV0dXJuICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgdmFyIHIgPSBNYXRoLnJhbmRvbSgpICogMTYgfCAwLCB2ID0gYyA9PT0gJ3gnID8gciA6IChyICYgMHgzIHwgMHg4KTtcbiAgICAgICAgcmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBXaW5kb3dNUUludGVyYWN0aW9uU3BhY2UoY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3cpIHtcbiAgICB2YXIgc3dhcm1JbnRlcmFjdCA9IHJlcXVpcmUoXCIuLy4uL3N3YXJtSW50ZXJhY3Rpb25cIik7XG4gICAgdmFyIGNoaWxkTWVzc2FnZU1RID0gcmVxdWlyZShcIi4vc3BlY2lmaWNNUUltcGwvQ2hpbGRXbmRNUVwiKS5jcmVhdGVNUShjaGFubmVsTmFtZSwgY29tbXVuaWNhdGlvbldpbmRvdyk7XG4gICAgdmFyIHN3YXJtSW5zdGFuY2VzID0ge307XG5cbiAgICB2YXIgY29tbSA9IHtcbiAgICAgICAgc3RhcnRTd2FybTogZnVuY3Rpb24gKHN3YXJtTmFtZSwgY3RvciwgYXJncykge1xuXG4gICAgICAgICAgICB2YXIgdW5pcXVlSWQgPSB1dWlkdjQoKTtcbiAgICAgICAgICAgIHZhciBzd2FybSA9IHtcbiAgICAgICAgICAgICAgICBtZXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtVHlwZU5hbWU6IHN3YXJtTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgY3RvcjogY3RvcixcbiAgICAgICAgICAgICAgICAgICAgYXJnczogYXJncyxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdElkOiB1bmlxdWVJZCxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY2hpbGRNZXNzYWdlTVEucHJvZHVjZShzd2FybSk7XG4gICAgICAgICAgICByZXR1cm4gc3dhcm07XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRpbnVlU3dhcm06IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIHN3YXJtU2VyaWFsaXNhdGlvbiwgcGhhc2VOYW1lLCBhcmdzKSB7XG5cbiAgICAgICAgICAgIHZhciBuZXdTZXJpYWxpemF0aW9uID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzd2FybVNlcmlhbGlzYXRpb24pKTtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS5jdG9yID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgbmV3U2VyaWFsaXphdGlvbi5tZXRhLnBoYXNlTmFtZSA9IHBoYXNlTmFtZTtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS50YXJnZXQgPSBcImlmcmFtZVwiO1xuICAgICAgICAgICAgbmV3U2VyaWFsaXphdGlvbi5tZXRhLmFyZ3MgPSBhcmdzO1xuICAgICAgICAgICAgY2hpbGRNZXNzYWdlTVEucHJvZHVjZShuZXdTZXJpYWxpemF0aW9uKTtcbiAgICAgICAgfSxcbiAgICAgICAgb246IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjaGlsZE1lc3NhZ2VNUS5yZWdpc3RlckNhbGxiYWNrKHN3YXJtSGFuZGxlci5tZXRhLnJlcXVlc3RJZCwgY2FsbGJhY2spO1xuICAgICAgICB9LFxuICAgICAgICBvZmY6IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRnVuY3Rpb24gbm90IGltcGxlbWVudGVkIVwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIHZhciBzcGFjZSA9IHN3YXJtSW50ZXJhY3QubmV3SW50ZXJhY3Rpb25TcGFjZShjb21tKTtcbiAgICB0aGlzLnN0YXJ0U3dhcm0gPSBmdW5jdGlvbiAobmFtZSwgY3RvciwgLi4uYXJncykge1xuICAgICAgICByZXR1cm4gc3BhY2Uuc3RhcnRTd2FybShuYW1lLCBjdG9yLCAuLi5hcmdzKTtcbiAgICB9O1xuXG4gICAgdGhpcy5pbml0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGNoaWxkTWVzc2FnZU1RLnJlZ2lzdGVyQ29uc3VtZXIoZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgc3dhcm07XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5tZXRhICYmIGRhdGEubWV0YS5zd2FybUlkICYmIHN3YXJtSW5zdGFuY2VzW2RhdGEubWV0YS5zd2FybUlkXSkge1xuICAgICAgICAgICAgICAgICAgICBzd2FybSA9IHN3YXJtSW5zdGFuY2VzW2RhdGEubWV0YS5zd2FybUlkXTtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm0udXBkYXRlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBzd2FybVtkYXRhLm1ldGEucGhhc2VOYW1lXS5hcHBseShzd2FybSwgZGF0YS5tZXRhLmFyZ3MpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgc3dhcm0gPSAkJC5zd2FybS5zdGFydChkYXRhLm1ldGEuc3dhcm1UeXBlTmFtZSwgZGF0YS5tZXRhLmN0b3IsIC4uLmRhdGEubWV0YS5hcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm0uc2V0TWV0YWRhdGEoXCJyZXF1ZXN0SWRcIiwgZGF0YS5tZXRhLnJlcXVlc3RJZCk7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtSW5zdGFuY2VzW3N3YXJtLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtSWRdID0gc3dhcm07XG5cbiAgICAgICAgICAgICAgICAgICAgc3dhcm0ub25SZXR1cm4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU3dhcm0gaXMgZmluaXNoZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcGFyZW50LnBvc3RNZXNzYWdlKHt3ZWJWaWV3SXNSZWFkeTogdHJ1ZX0sIFwiKlwiKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlcihtZXNzYWdlKSB7XG4gICAgICAgIGxvZyhcInNlbmRpbmcgc3dhcm0gXCIsIG1lc3NhZ2UpO1xuICAgICAgICBjaGlsZE1lc3NhZ2VNUS5wcm9kdWNlKG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlckludGVyYWN0aW9ucyhtZXNzYWdlKSB7XG4gICAgICAgIGxvZyhcImNoZWNraW5nIGlmIG1lc3NhZ2UgaXMgJ2ludGVyYWN0aW9uJyBcIiwgbWVzc2FnZSk7XG4gICAgICAgIHJldHVybiBtZXNzYWdlICYmIG1lc3NhZ2UubWV0YSAmJiBtZXNzYWdlLm1ldGEudGFyZ2V0ICYmIG1lc3NhZ2UubWV0YS50YXJnZXQgPT09IFwiaW50ZXJhY3Rpb25cIjtcbiAgICB9XG5cbiAgICAkJC5QU0tfUHViU3ViLnN1YnNjcmliZSgkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTiwgaGFuZGxlciwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LCBmaWx0ZXJJbnRlcmFjdGlvbnMpO1xuICAgIGxvZyhcInJlZ2lzdGVyaW5nIGxpc3RlbmVyIGZvciBoYW5kbGluZyBpbnRlcmFjdGlvbnNcIik7XG5cbiAgICBmdW5jdGlvbiBsb2coLi4uYXJncykge1xuICAgICAgICBhcmdzLnVuc2hpZnQoXCJbV2luZG93TVFJbnRlcmFjdGlvblNwYWNlXCIgKyAod2luZG93LmZyYW1lRWxlbWVudCA/IFwiKlwiIDogXCJcIikgKyBcIl1cIik7XG4gICAgICAgIC8vY29uc29sZS5sb2cuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVJbnRlcmFjdGlvblNwYWNlID0gZnVuY3Rpb24gKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93KSB7XG4gICAgcmV0dXJuIG5ldyBXaW5kb3dNUUludGVyYWN0aW9uU3BhY2UoY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3cpO1xufTtcbiIsInZhciBPd00gPSByZXF1aXJlKFwic3dhcm11dGlsc1wiKS5Pd007XG52YXIgc3dhcm1JbnRlcmFjdCA9IHJlcXVpcmUoXCIuLy4uL3N3YXJtSW50ZXJhY3Rpb25cIik7XG52YXIgZm9sZGVyTVEgPSByZXF1aXJlKFwiZm9sZGVybXFcIik7XG5cbmZ1bmN0aW9uIEZvbGRlck1RSW50ZXJhY3Rpb25TcGFjZShhZ2VudCwgdGFyZ2V0Rm9sZGVyLCByZXR1cm5Gb2xkZXIpIHtcbiAgICB2YXIgc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzID0ge307XG4gICAgdmFyIHF1ZXVlSGFuZGxlciA9IG51bGw7XG4gICAgdmFyIHJlc3BvbnNlUXVldWUgPSBudWxsO1xuXG4gICAgdmFyIHF1ZXVlID0gZm9sZGVyTVEuY3JlYXRlUXVlKHRhcmdldEZvbGRlciwgKGVyciAsIHJlc3VsdCkgPT4ge1xuICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVN3YXJtUGFjayhzd2FybU5hbWUsIHBoYXNlTmFtZSwgLi4uYXJncyl7XG4gICAgICAgIHZhciBzd2FybSA9IG5ldyBPd00oKTtcblxuICAgICAgICBzd2FybS5zZXRNZXRhKFwic3dhcm1JZFwiLCAkJC51aWRHZW5lcmF0b3Iuc2FmZV91dWlkKCkpO1xuXG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJyZXF1ZXN0SWRcIiwgc3dhcm0uZ2V0TWV0YShcInN3YXJtSWRcIikpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwic3dhcm1UeXBlTmFtZVwiLCBzd2FybU5hbWUpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwicGhhc2VOYW1lXCIsIHBoYXNlTmFtZSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJhcmdzXCIsIGFyZ3MpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiY29tbWFuZFwiLCBcImV4ZWN1dGVTd2FybVBoYXNlXCIpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwidGFyZ2V0XCIsIGFnZW50KTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImhvbWVTZWN1cml0eUNvbnRleHRcIiwgcmV0dXJuRm9sZGVyKTtcblxuICAgICAgICByZXR1cm4gc3dhcm07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlzcGF0Y2hpbmdTd2FybXMoZXJyLCBzd2FybSl7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgIH1cblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgc3Vic0xpc3QgPSBzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm0ubWV0YS5zd2FybUlkXTtcbiAgICAgICAgICAgIGlmKHN1YnNMaXN0KXtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGk9MDsgaTxzdWJzTGlzdC5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgICAgIGxldCBoYW5kbGVyID0gc3Vic0xpc3RbaV07XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXIobnVsbCwgc3dhcm0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5pdCgpe1xuICAgICAgICBpZighcXVldWVIYW5kbGVyKXtcbiAgICAgICAgICAgIHF1ZXVlSGFuZGxlciA9IHF1ZXVlLmdldEhhbmRsZXIoKTtcbiAgICAgICAgfVxuICAgIH1cblx0XG5cdGluaXQoKTtcblxuICAgIGZ1bmN0aW9uIHByZXBhcmVUb0NvbnN1bWUoKXtcbiAgICAgICAgaWYoIXJlc3BvbnNlUXVldWUpe1xuICAgICAgICAgICAgcmVzcG9uc2VRdWV1ZSA9IGZvbGRlck1RLmNyZWF0ZVF1ZShyZXR1cm5Gb2xkZXIpO1xuICAgICAgICAgICAgcmVzcG9uc2VRdWV1ZS5yZWdpc3RlckNvbnN1bWVyKGRpc3BhdGNoaW5nU3dhcm1zKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBjb21tdW5pY2F0aW9uID0ge1xuICAgICAgICBzdGFydFN3YXJtOiBmdW5jdGlvbiAoc3dhcm1OYW1lLCBjdG9yLCBhcmdzKSB7XG4gICAgICAgICAgICBwcmVwYXJlVG9Db25zdW1lKCk7XG4gICAgICAgICAgICB2YXIgc3dhcm0gPSBjcmVhdGVTd2FybVBhY2soc3dhcm1OYW1lLCBjdG9yLCAuLi5hcmdzKTtcbiAgICAgICAgICAgIHF1ZXVlSGFuZGxlci5zZW5kU3dhcm1Gb3JFeGVjdXRpb24oc3dhcm0pO1xuICAgICAgICAgICAgcmV0dXJuIHN3YXJtO1xuICAgICAgICB9LFxuICAgICAgICBjb250aW51ZVN3YXJtOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBzd2FybVNlcmlhbGlzYXRpb24sIGN0b3IsIC4uLmFyZ3MpIHtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBzd2FybUhhbmRsZXIudXBkYXRlKHN3YXJtU2VyaWFsaXNhdGlvbik7XG4gICAgICAgICAgICAgICAgc3dhcm1IYW5kbGVyW2N0b3JdLmFwcGx5KHN3YXJtSGFuZGxlciwgYXJncyk7XG4gICAgICAgICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvbjogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHByZXBhcmVUb0NvbnN1bWUoKTtcblxuICAgICAgICAgICAgaWYoIXN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybUhhbmRsZXIubWV0YS5zd2FybUlkXSl7XG4gICAgICAgICAgICAgICAgc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5tZXRhLnN3YXJtSWRdID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm1IYW5kbGVyLm1ldGEuc3dhcm1JZF0ucHVzaChjYWxsYmFjayk7XG5cbiAgICAgICAgfSxcbiAgICAgICAgb2ZmOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyKSB7XG4gICAgICAgICAgICBzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm1IYW5kbGVyLm1ldGEuc3dhcm1JZF0gPSBbXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gc3dhcm1JbnRlcmFjdC5uZXdJbnRlcmFjdGlvblNwYWNlKGNvbW11bmljYXRpb24pO1xufVxuXG52YXIgc3BhY2VzID0ge307XG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UgPSBmdW5jdGlvbiAoYWdlbnQsIHRhcmdldEZvbGRlciwgcmV0dXJuRm9sZGVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGFyZ2V0Rm9sZGVyK3JldHVybkZvbGRlcjtcbiAgICBpZighc3BhY2VzW2luZGV4XSl7XG4gICAgICAgIHNwYWNlc1tpbmRleF0gPSBuZXcgRm9sZGVyTVFJbnRlcmFjdGlvblNwYWNlKGFnZW50LCB0YXJnZXRGb2xkZXIsIHJldHVybkZvbGRlcik7XG4gICAgfWVsc2V7XG4gICAgICAgIGNvbnNvbGUubG9nKGBGb2xkZXJNUSBpbnRlcmFjdGlvbiBzcGFjZSBiYXNlZCBvbiBbJHt0YXJnZXRGb2xkZXJ9LCAke3JldHVybkZvbGRlcn1dIGFscmVhZHkgZXhpc3RzIWApO1xuICAgIH1cbiAgICByZXR1cm4gc3BhY2VzW2luZGV4XTtcbn07IiwicmVxdWlyZSgncHNrLWh0dHAtY2xpZW50Jyk7XG5cbmZ1bmN0aW9uIEhUVFBJbnRlcmFjdGlvblNwYWNlKGFsaWFzLCByZW1vdGVFbmRQb2ludCwgYWdlbnRVaWQsIGNyeXB0b0luZm8pIHtcbiAgICBjb25zdCBzd2FybUludGVyYWN0ID0gcmVxdWlyZShcIi4vLi4vc3dhcm1JbnRlcmFjdGlvblwiKTtcblxuICAgIGxldCBpbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIGZ1bmN0aW9uIGluaXQoKXtcbiAgICAgICAgaWYoIWluaXRpYWxpemVkKXtcbiAgICAgICAgICAgIGluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICQkLnJlbW90ZS5jcmVhdGVSZXF1ZXN0TWFuYWdlcigpO1xuICAgICAgICAgICAgJCQucmVtb3RlLm5ld0VuZFBvaW50KGFsaWFzLCByZW1vdGVFbmRQb2ludCwgYWdlbnRVaWQsIGNyeXB0b0luZm8pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgY29tbSA9IHtcbiAgICAgICAgc3RhcnRTd2FybTogZnVuY3Rpb24gKHN3YXJtTmFtZSwgY3RvciwgYXJncykge1xuICAgICAgICAgICAgaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuICQkLnJlbW90ZVthbGlhc10uc3RhcnRTd2FybShzd2FybU5hbWUsIGN0b3IsIC4uLmFyZ3MpO1xuICAgICAgICB9LFxuICAgICAgICBjb250aW51ZVN3YXJtOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBzd2FybVNlcmlhbGlzYXRpb24sIGN0b3IsIGFyZ3MpIHtcbiAgICAgICAgICAgIHJldHVybiAkJC5yZW1vdGVbYWxpYXNdLmNvbnRpbnVlU3dhcm0oc3dhcm1TZXJpYWxpc2F0aW9uLCBjdG9yLCBhcmdzKTtcbiAgICAgICAgfSxcbiAgICAgICAgb246IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBzd2FybUhhbmRsZXIub24oJyonLCBjYWxsYmFjayk7XG4gICAgICAgIH0sXG4gICAgICAgIG9mZjogZnVuY3Rpb24gKHN3YXJtSGFuZGxlcikge1xuICAgICAgICAgICAgc3dhcm1IYW5kbGVyLm9mZignKicpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBzd2FybUludGVyYWN0Lm5ld0ludGVyYWN0aW9uU3BhY2UoY29tbSk7XG59XG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UgPSBmdW5jdGlvbiAoYWxpYXMsIHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgY3J5cHRvSW5mbykge1xuICAgIC8vc2luZ2xldG9uXG4gICAgcmV0dXJuIG5ldyBIVFRQSW50ZXJhY3Rpb25TcGFjZShhbGlhcywgcmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKTtcbn07IiwidmFyIGNoYW5uZWxzUmVnaXN0cnkgPSB7fTsgLy9rZWVwcyBjYWxsYmFja3MgZm9yIGNvbnN1bWVycyBhbmQgd2luZG93cyByZWZlcmVuY2VzIGZvciBwcm9kdWNlcnNcbnZhciBjYWxsYmFja3NSZWdpc3RyeSA9IHt9O1xuXG5mdW5jdGlvbiBkaXNwYXRjaEV2ZW50KGV2ZW50KSB7XG4gICAgdmFyIHN3YXJtID0gSlNPTi5wYXJzZShldmVudC5kYXRhKTtcbiAgICBpZihzd2FybS5tZXRhKXtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gY2FsbGJhY2tzUmVnaXN0cnlbc3dhcm0ubWV0YS5jaGFubmVsTmFtZV07XG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHN3YXJtKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlwiKTtcbiAgICAgICAgfVxuICAgIH1cblxufVxuXG5cbmZ1bmN0aW9uIENoaWxkV25kTVEoY2hhbm5lbE5hbWUsIG1haW5XaW5kb3csIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsKSB7XG4gICAgLy9jaGFubmVsIG5hbWUgaXNcblxuICAgIGNoYW5uZWxzUmVnaXN0cnlbY2hhbm5lbE5hbWVdID0gbWFpbldpbmRvdztcblxuICAgIHRoaXMucHJvZHVjZSA9IGZ1bmN0aW9uIChzd2FybU1zZykge1xuICAgICAgICBzd2FybU1zZy5tZXRhLmNoYW5uZWxOYW1lID0gY2hhbm5lbE5hbWU7XG4gICAgICAgIHZhciBtZXNzYWdlID0ge1xuICAgICAgICAgICAgbWV0YTpzd2FybU1zZy5tZXRhLFxuICAgICAgICAgICAgcHVibGljVmFyczpzd2FybU1zZy5wdWJsaWNWYXJzLFxuICAgICAgICAgICAgcHJpdmF0ZVZhcnM6c3dhcm1Nc2cucHJpdmF0ZVZhcnNcbiAgICAgICAgfTtcblxuICAgICAgICBtZXNzYWdlLm1ldGEuYXJncyA9IG1lc3NhZ2UubWV0YS5hcmdzLm1hcChmdW5jdGlvbiAoYXJndW1lbnQpIHtcbiAgICAgICAgICAgIGlmIChhcmd1bWVudCBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0ge307XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50Lm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JbXCJtZXNzYWdlXCJdID0gYXJndW1lbnQubWVzc2FnZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50LmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JbXCJjb2RlXCJdID0gYXJndW1lbnQuY29kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50O1xuICAgICAgICB9KTtcbiAgICAgICAgbWFpbldpbmRvdy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeShtZXNzYWdlKSwgXCIqXCIpO1xuICAgIH07XG5cbiAgICB2YXIgY29uc3VtZXI7XG5cbiAgICB0aGlzLnJlZ2lzdGVyQ29uc3VtZXIgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIHNob3VsZERlbGV0ZUFmdGVyUmVhZCA9IHRydWUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnN1bWVyKSB7XG4gICAgICAgICAgIC8vIHRocm93IG5ldyBFcnJvcihcIk9ubHkgb25lIGNvbnN1bWVyIGlzIGFsbG93ZWQhXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZXIgPSBjYWxsYmFjaztcbiAgICAgICAgY2FsbGJhY2tzUmVnaXN0cnlbY2hhbm5lbE5hbWVdID0gY29uc3VtZXI7XG5cbiAgICAgICAgaWYgKHNlY29uZENvbW11bmljYXRpb25DaGFubmVsICYmIHR5cGVvZiBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbC5hZGRFdmVudExpc3RlbmVyICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBkaXNwYXRjaEV2ZW50KTtcbiAgICAgICAgfVxuICAgICAgfTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVNUSA9IGZ1bmN0aW9uIGNyZWF0ZU1RKGNoYW5uZWxOYW1lLCB3bmQsIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsKXtcbiAgICByZXR1cm4gbmV3IENoaWxkV25kTVEoY2hhbm5lbE5hbWUsIHduZCwgc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwpO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cy5pbml0Rm9yU3dhcm1pbmdJbkNoaWxkID0gZnVuY3Rpb24oZG9tYWluTmFtZSl7XG5cbiAgICB2YXIgcHViU3ViID0gJCQucmVxdWlyZShcInNvdW5kcHVic3ViXCIpLnNvdW5kUHViU3ViO1xuXG4gICAgdmFyIGluYm91bmQgPSBjcmVhdGVNUShkb21haW5OYW1lK1wiL2luYm91bmRcIik7XG4gICAgdmFyIG91dGJvdW5kID0gY3JlYXRlTVEoZG9tYWluTmFtZStcIi9vdXRib3VuZFwiKTtcblxuXG4gICAgaW5ib3VuZC5yZWdpc3RlckNvbnN1bWVyKGZ1bmN0aW9uKGVyciwgc3dhcm0pe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICB9XG4gICAgICAgIC8vcmVzdG9yZSBhbmQgZXhlY3V0ZSB0aGlzIHRhc3R5IHN3YXJtXG4gICAgICAgIGdsb2JhbC4kJC5zd2FybXNJbnN0YW5jZXNNYW5hZ2VyLnJldml2ZV9zd2FybShzd2FybSk7XG4gICAgfSk7XG5cbiAgICBwdWJTdWIuc3Vic2NyaWJlKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBmdW5jdGlvbihzd2FybSl7XG4gICAgICAgIG91dGJvdW5kLnNlbmRTd2FybUZvckV4ZWN1dGlvbihzd2FybSk7XG4gICAgfSk7XG59O1xuXG4iLCJ2YXIgY2hhbm5lbHNSZWdpc3RyeSA9IHt9OyAvL2tlZXBzIGNhbGxiYWNrcyBmb3IgY29uc3VtZXJzIGFuZCB3aW5kb3dzIHJlZmVyZW5jZXMgZm9yIHByb2R1Y2Vyc1xudmFyIGNhbGxiYWNrc1JlZ2lzdHJ5ID0ge307XG52YXIgc3dhcm1DYWxsYmFja3MgPSB7fTtcblxuZnVuY3Rpb24gZGlzcGF0Y2hFdmVudChldmVudCkge1xuXG4gICAgaWYgKGV2ZW50LnNvdXJjZSAhPT0gd2luZG93KSB7XG5cbiAgICAgICAgdmFyIHN3YXJtID0gZXZlbnQuZGF0YTtcblxuICAgICAgICBpZiAoc3dhcm0ubWV0YSkge1xuICAgICAgICAgICAgbGV0IGNhbGxiYWNrO1xuICAgICAgICAgICAgaWYgKCFzd2FybS5tZXRhLnJlcXVlc3RJZCB8fCAhc3dhcm1DYWxsYmFja3Nbc3dhcm0ubWV0YS5yZXF1ZXN0SWRdKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFja3NSZWdpc3RyeVtzd2FybS5tZXRhLmNoYW5uZWxOYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gc3dhcm1DYWxsYmFja3Nbc3dhcm0ubWV0YS5yZXF1ZXN0SWRdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgc3dhcm0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBDaGlsZFduZE1RKGNoYW5uZWxOYW1lLCBtYWluV2luZG93KSB7XG4gICAgLy9jaGFubmVsIG5hbWUgaXNcblxuICAgIGNoYW5uZWxzUmVnaXN0cnlbY2hhbm5lbE5hbWVdID0gbWFpbldpbmRvdztcblxuICAgIHRoaXMucHJvZHVjZSA9IGZ1bmN0aW9uIChzd2FybU1zZykge1xuICAgICAgICBzd2FybU1zZy5tZXRhLmNoYW5uZWxOYW1lID0gY2hhbm5lbE5hbWU7XG4gICAgICAgIHZhciBtZXNzYWdlID0ge1xuICAgICAgICAgICAgbWV0YTogc3dhcm1Nc2cubWV0YSxcbiAgICAgICAgICAgIHB1YmxpY1ZhcnM6IHN3YXJtTXNnLnB1YmxpY1ZhcnMsXG4gICAgICAgICAgICBwcml2YXRlVmFyczogc3dhcm1Nc2cucHJpdmF0ZVZhcnNcbiAgICAgICAgfTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhzd2FybU1zZy5nZXRKU09OKCkpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKHN3YXJtTXNnLnZhbHVlT2YoKSk7XG4gICAgICAgIG1lc3NhZ2UubWV0YS5hcmdzID0gbWVzc2FnZS5tZXRhLmFyZ3MubWFwKGZ1bmN0aW9uIChhcmd1bWVudCkge1xuICAgICAgICAgICAgaWYgKGFyZ3VtZW50IGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSB7fTtcbiAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnQubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcltcIm1lc3NhZ2VcIl0gPSBhcmd1bWVudC5tZXNzYWdlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnQuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcltcImNvZGVcIl0gPSBhcmd1bWVudC5jb2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXJndW1lbnQ7XG4gICAgICAgIH0pO1xuICAgICAgICBtYWluV2luZG93LnBvc3RNZXNzYWdlKG1lc3NhZ2UsIFwiKlwiKTtcbiAgICB9O1xuXG4gICAgdmFyIGNvbnN1bWVyO1xuXG4gICAgdGhpcy5yZWdpc3RlckNvbnN1bWVyID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBzaG91bGREZWxldGVBZnRlclJlYWQgPSB0cnVlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25zdW1lcikge1xuICAgICAgICAgICAgLy8gdGhyb3cgbmV3IEVycm9yKFwiT25seSBvbmUgY29uc3VtZXIgaXMgYWxsb3dlZCFcIik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdW1lciA9IGNhbGxiYWNrO1xuICAgICAgICBjYWxsYmFja3NSZWdpc3RyeVtjaGFubmVsTmFtZV0gPSBjb25zdW1lcjtcbiAgICAgICAgbWFpbldpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBkaXNwYXRjaEV2ZW50KTtcbiAgICB9O1xuXG4gICAgdGhpcy5yZWdpc3RlckNhbGxiYWNrID0gZnVuY3Rpb24gKHJlcXVlc3RJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgc3dhcm1DYWxsYmFja3NbcmVxdWVzdElkXSA9IGNhbGxiYWNrO1xuICAgICAgICBjYWxsYmFja3NSZWdpc3RyeVtjaGFubmVsTmFtZV0gPSBjYWxsYmFjaztcbiAgICAgICAgbWFpbldpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBkaXNwYXRjaEV2ZW50KTtcbiAgICB9O1xuXG59XG5cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlTVEgPSBmdW5jdGlvbiBjcmVhdGVNUShjaGFubmVsTmFtZSwgd25kKSB7XG4gICAgcmV0dXJuIG5ldyBDaGlsZFduZE1RKGNoYW5uZWxOYW1lLCB3bmQpO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cy5pbml0Rm9yU3dhcm1pbmdJbkNoaWxkID0gZnVuY3Rpb24gKGRvbWFpbk5hbWUpIHtcblxuICAgIHZhciBwdWJTdWIgPSAkJC5yZXF1aXJlKFwic291bmRwdWJzdWJcIikuc291bmRQdWJTdWI7XG5cbiAgICB2YXIgaW5ib3VuZCA9IGNyZWF0ZU1RKGRvbWFpbk5hbWUgKyBcIi9pbmJvdW5kXCIpO1xuICAgIHZhciBvdXRib3VuZCA9IGNyZWF0ZU1RKGRvbWFpbk5hbWUgKyBcIi9vdXRib3VuZFwiKTtcblxuXG4gICAgaW5ib3VuZC5yZWdpc3RlckNvbnN1bWVyKGZ1bmN0aW9uIChlcnIsIHN3YXJtKSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgLy9yZXN0b3JlIGFuZCBleGVjdXRlIHRoaXMgdGFzdHkgc3dhcm1cbiAgICAgICAgZ2xvYmFsLiQkLnN3YXJtc0luc3RhbmNlc01hbmFnZXIucmV2aXZlX3N3YXJtKHN3YXJtKTtcbiAgICB9KTtcblxuICAgIHB1YlN1Yi5zdWJzY3JpYmUoJCQuQ09OU1RBTlRTLlNXQVJNX0ZPUl9FWEVDVVRJT04sIGZ1bmN0aW9uIChzd2FybSkge1xuICAgICAgICBvdXRib3VuZC5zZW5kU3dhcm1Gb3JFeGVjdXRpb24oc3dhcm0pO1xuICAgIH0pO1xufTtcblxuIiwiaWYgKHR5cGVvZiAkJCA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgJCQgPSB7fTtcbn1cblxuZnVuY3Rpb24gVmlydHVhbFN3YXJtKGlubmVyT2JqLCBnbG9iYWxIYW5kbGVyKXtcbiAgICBsZXQga25vd25FeHRyYVByb3BzID0gWyBcInN3YXJtXCIgXTtcblxuICAgIGZ1bmN0aW9uIGJ1aWxkSGFuZGxlcigpIHtcbiAgICAgICAgdmFyIHV0aWxpdHkgPSB7fTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24gKHRhcmdldCwgcHJvcGVydHksIHZhbHVlLCByZWNlaXZlcikge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHRhcmdldC5wcml2YXRlVmFycyAmJiB0YXJnZXQucHJpdmF0ZVZhcnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnByaXZhdGVWYXJzW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdGFyZ2V0LnB1YmxpY1ZhcnMgJiYgdGFyZ2V0LnB1YmxpY1ZhcnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnB1YmxpY1ZhcnNbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0YXJnZXQuaGFzT3duUHJvcGVydHkocHJvcGVydHkpOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2Uga25vd25FeHRyYVByb3BzLmluZGV4T2YocHJvcGVydHkpID09PSAtMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZ2xvYmFsSGFuZGxlci5wcm90ZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxIYW5kbGVyLnByb3RlY3RlZCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsSGFuZGxlci5wcm90ZWN0ZWRbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxpdHlbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKHRhcmdldCwgcHJvcGVydHksIHJlY2VpdmVyKSB7XG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0YXJnZXQucHVibGljVmFycyAmJiB0YXJnZXQucHVibGljVmFycy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSk6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0LnB1YmxpY1ZhcnNbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHRhcmdldC5wcml2YXRlVmFycyAmJiB0YXJnZXQucHJpdmF0ZVZhcnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldC5wcml2YXRlVmFyc1twcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdGFyZ2V0Lmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIGdsb2JhbEhhbmRsZXIucHJvdGVjdGVkICYmIGdsb2JhbEhhbmRsZXIucHJvdGVjdGVkLmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBnbG9iYWxIYW5kbGVyLnByb3RlY3RlZFtwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdXRpbGl0eS5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSk6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXRpbGl0eVtwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb3h5KGlubmVyT2JqLCBidWlsZEhhbmRsZXIoKSk7XG59XG5cbmZ1bmN0aW9uIFN3YXJtSW50ZXJhY3Rpb24oY29tbXVuaWNhdGlvbkludGVyZmFjZSwgc3dhcm1OYW1lLCBjdG9yLCBhcmdzKSB7XG5cbiAgICB2YXIgc3dhcm1IYW5kbGVyID0gY29tbXVuaWNhdGlvbkludGVyZmFjZS5zdGFydFN3YXJtKHN3YXJtTmFtZSwgY3RvciwgYXJncyk7XG5cbiAgICB0aGlzLm9uID0gZnVuY3Rpb24oZGVzY3JpcHRpb24pe1xuICAgICAgICBjb21tdW5pY2F0aW9uSW50ZXJmYWNlLm9uKHN3YXJtSGFuZGxlciwgZnVuY3Rpb24oZXJyLCBzd2FybVNlcmlhbGlzYXRpb24pe1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgcGhhc2UgPSBkZXNjcmlwdGlvbltzd2FybVNlcmlhbGlzYXRpb24ubWV0YS5waGFzZU5hbWVdO1xuICAgICAgICAgICAgbGV0IHZpcnR1YWxTd2FybSA9IG5ldyBWaXJ0dWFsU3dhcm0oc3dhcm1TZXJpYWxpc2F0aW9uLCBzd2FybUhhbmRsZXIpO1xuXG4gICAgICAgICAgICBpZighcGhhc2Upe1xuICAgICAgICAgICAgICAgIC8vVE9ETyByZXZpZXcgYW5kIGZpeC4gRml4IGNhc2Ugd2hlbiBhbiBpbnRlcmFjdGlvbiBpcyBzdGFydGVkIGZyb20gYW5vdGhlciBpbnRlcmFjdGlvblxuICAgICAgICAgICAgICAgIGlmKHN3YXJtSGFuZGxlciAmJiAoIXN3YXJtSGFuZGxlci5UYXJnZXQgfHwgc3dhcm1IYW5kbGVyLlRhcmdldC5zd2FybUlkICE9PSBzd2FybVNlcmlhbGlzYXRpb24ubWV0YS5zd2FybUlkKSl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTm90IG15IHN3YXJtIVwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgaW50ZXJhY3RQaGFzZUVyciA9ICBuZXcgRXJyb3IoXCJJbnRlcmFjdCBtZXRob2QgXCIrc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEucGhhc2VOYW1lK1wiIHdhcyBub3QgZm91bmQuXCIpO1xuICAgICAgICAgICAgICAgIGlmKGRlc2NyaXB0aW9uW1wib25FcnJvclwiXSl7XG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uW1wib25FcnJvclwiXS5jYWxsKHZpcnR1YWxTd2FybSwgaW50ZXJhY3RQaGFzZUVycik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgaW50ZXJhY3RQaGFzZUVycjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZpcnR1YWxTd2FybS5zd2FybSA9IGZ1bmN0aW9uKHBoYXNlTmFtZSwgLi4uYXJncyl7XG4gICAgICAgICAgICAgICAgY29tbXVuaWNhdGlvbkludGVyZmFjZS5jb250aW51ZVN3YXJtKHN3YXJtSGFuZGxlciwgc3dhcm1TZXJpYWxpc2F0aW9uLCBwaGFzZU5hbWUsIGFyZ3MpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcGhhc2UuYXBwbHkodmlydHVhbFN3YXJtLCBzd2FybVNlcmlhbGlzYXRpb24ubWV0YS5hcmdzKTtcbiAgICAgICAgICAgIGlmKHZpcnR1YWxTd2FybS5tZXRhLmNvbW1hbmQgPT09IFwiYXN5bmNSZXR1cm5cIil7XG4gICAgICAgICAgICAgICAgY29tbXVuaWNhdGlvbkludGVyZmFjZS5vZmYoc3dhcm1IYW5kbGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMub25SZXR1cm4gPSBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgICAgIHRoaXMub24oe1xuICAgICAgICAgICAgX19yZXR1cm5fXzogY2FsbGJhY2tcbiAgICAgICAgfSk7XG4gICAgfTtcbn1cblxudmFyIGFic3RyYWN0SW50ZXJhY3Rpb25TcGFjZSA9IHtcbiAgICBzdGFydFN3YXJtOiBmdW5jdGlvbiAoc3dhcm1OYW1lLCBjdG9yLCBhcmdzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSAgU3dhcm1JbnRlcmFjdGlvbi5wcm90b3R5cGUuc3RhcnRTd2FybVwiKTtcbiAgICB9LFxuICAgIHJlc2VuZFN3YXJtOiBmdW5jdGlvbiAoc3dhcm1JbnN0YW5jZSwgc3dhcm1TZXJpYWxpc2F0aW9uLCBjdG9yLCBhcmdzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSAgU3dhcm1JbnRlcmFjdGlvbi5wcm90b3R5cGUuY29udGludWVTd2FybSBcIik7XG4gICAgfSxcbiAgICBvbjogZnVuY3Rpb24gKHN3YXJtSW5zdGFuY2UsIHBoYXNlTmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlICBTd2FybUludGVyYWN0aW9uLnByb3RvdHlwZS5vblN3YXJtXCIpO1xuICAgIH0sXG5vZmY6IGZ1bmN0aW9uIChzd2FybUluc3RhbmNlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSAgU3dhcm1JbnRlcmFjdGlvbi5wcm90b3R5cGUub25Td2FybVwiKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5uZXdJbnRlcmFjdGlvblNwYWNlID0gZnVuY3Rpb24gKGNvbW11bmljYXRpb25JbnRlcmZhY2UpIHtcblxuICAgIGlmKCFjb21tdW5pY2F0aW9uSW50ZXJmYWNlKSB7XG4gICAgICAgIGNvbW11bmljYXRpb25JbnRlcmZhY2UgPSBhYnN0cmFjdEludGVyYWN0aW9uU3BhY2UgO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBzdGFydFN3YXJtOiBmdW5jdGlvbiAoc3dhcm1OYW1lLCBjdG9yLCAuLi5hcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFN3YXJtSW50ZXJhY3Rpb24oY29tbXVuaWNhdGlvbkludGVyZmFjZSwgc3dhcm1OYW1lLCBjdG9yLCBhcmdzKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IFBlbmQ7XG5cbmZ1bmN0aW9uIFBlbmQoKSB7XG4gIHRoaXMucGVuZGluZyA9IDA7XG4gIHRoaXMubWF4ID0gSW5maW5pdHk7XG4gIHRoaXMubGlzdGVuZXJzID0gW107XG4gIHRoaXMud2FpdGluZyA9IFtdO1xuICB0aGlzLmVycm9yID0gbnVsbDtcbn1cblxuUGVuZC5wcm90b3R5cGUuZ28gPSBmdW5jdGlvbihmbikge1xuICBpZiAodGhpcy5wZW5kaW5nIDwgdGhpcy5tYXgpIHtcbiAgICBwZW5kR28odGhpcywgZm4pO1xuICB9IGVsc2Uge1xuICAgIHRoaXMud2FpdGluZy5wdXNoKGZuKTtcbiAgfVxufTtcblxuUGVuZC5wcm90b3R5cGUud2FpdCA9IGZ1bmN0aW9uKGNiKSB7XG4gIGlmICh0aGlzLnBlbmRpbmcgPT09IDApIHtcbiAgICBjYih0aGlzLmVycm9yKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmxpc3RlbmVycy5wdXNoKGNiKTtcbiAgfVxufTtcblxuUGVuZC5wcm90b3R5cGUuaG9sZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gcGVuZEhvbGQodGhpcyk7XG59O1xuXG5mdW5jdGlvbiBwZW5kSG9sZChzZWxmKSB7XG4gIHNlbGYucGVuZGluZyArPSAxO1xuICB2YXIgY2FsbGVkID0gZmFsc2U7XG4gIHJldHVybiBvbkNiO1xuICBmdW5jdGlvbiBvbkNiKGVycikge1xuICAgIGlmIChjYWxsZWQpIHRocm93IG5ldyBFcnJvcihcImNhbGxiYWNrIGNhbGxlZCB0d2ljZVwiKTtcbiAgICBjYWxsZWQgPSB0cnVlO1xuICAgIHNlbGYuZXJyb3IgPSBzZWxmLmVycm9yIHx8IGVycjtcbiAgICBzZWxmLnBlbmRpbmcgLT0gMTtcbiAgICBpZiAoc2VsZi53YWl0aW5nLmxlbmd0aCA+IDAgJiYgc2VsZi5wZW5kaW5nIDwgc2VsZi5tYXgpIHtcbiAgICAgIHBlbmRHbyhzZWxmLCBzZWxmLndhaXRpbmcuc2hpZnQoKSk7XG4gICAgfSBlbHNlIGlmIChzZWxmLnBlbmRpbmcgPT09IDApIHtcbiAgICAgIHZhciBsaXN0ZW5lcnMgPSBzZWxmLmxpc3RlbmVycztcbiAgICAgIHNlbGYubGlzdGVuZXJzID0gW107XG4gICAgICBsaXN0ZW5lcnMuZm9yRWFjaChjYkxpc3RlbmVyKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gY2JMaXN0ZW5lcihsaXN0ZW5lcikge1xuICAgIGxpc3RlbmVyKHNlbGYuZXJyb3IpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBlbmRHbyhzZWxmLCBmbikge1xuICBmbihwZW5kSG9sZChzZWxmKSk7XG59XG4iLCJcblxuLyoqKioqKioqKioqKioqKioqKioqKiogIHV0aWxpdHkgY2xhc3MgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbmZ1bmN0aW9uIFJlcXVlc3RNYW5hZ2VyKHBvbGxpbmdUaW1lT3V0KXtcbiAgICBpZighcG9sbGluZ1RpbWVPdXQpe1xuICAgICAgICBwb2xsaW5nVGltZU91dCA9IDEwMDA7IC8vMSBzZWNvbmQgYnkgZGVmYXVsdFxuICAgIH1cblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIFJlcXVlc3QoZW5kUG9pbnQsIGluaXRpYWxTd2FybSl7XG4gICAgICAgIHZhciBvblJldHVybkNhbGxiYWNrcyA9IFtdO1xuICAgICAgICB2YXIgb25FcnJvckNhbGxiYWNrcyA9IFtdO1xuICAgICAgICB2YXIgb25DYWxsYmFja3MgPSBbXTtcbiAgICAgICAgdmFyIHJlcXVlc3RJZCA9IGluaXRpYWxTd2FybS5tZXRhLnJlcXVlc3RJZDtcbiAgICAgICAgaW5pdGlhbFN3YXJtID0gbnVsbDtcblxuICAgICAgICB0aGlzLmdldFJlcXVlc3RJZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gcmVxdWVzdElkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub24gPSBmdW5jdGlvbihwaGFzZU5hbWUsIGNhbGxiYWNrKXtcbiAgICAgICAgICAgIGlmKHR5cGVvZiBwaGFzZU5hbWUgIT0gXCJzdHJpbmdcIiAgJiYgdHlwZW9mIGNhbGxiYWNrICE9IFwiZnVuY3Rpb25cIil7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIGZpcnN0IHBhcmFtZXRlciBzaG91bGQgYmUgYSBzdHJpbmcgYW5kIHRoZSBzZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvbkNhbGxiYWNrcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjazpjYWxsYmFjayxcbiAgICAgICAgICAgICAgICBwaGFzZTpwaGFzZU5hbWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2VsZi5wb2xsKGVuZFBvaW50LCB0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub25SZXR1cm4gPSBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgICAgICAgICBvblJldHVybkNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIHNlbGYucG9sbChlbmRQb2ludCwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLm9uRXJyb3IgPSBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgICAgICAgICBpZihvbkVycm9yQ2FsbGJhY2tzLmluZGV4T2YoY2FsbGJhY2spIT09LTEpe1xuICAgICAgICAgICAgICAgIG9uRXJyb3JDYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIGNhbGxiYWNrIGFscmVhZHkgcmVnaXN0ZXJlZCFcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaCA9IGZ1bmN0aW9uKGVyciwgcmVzdWx0KXtcbiAgICAgICAgICAgIHJlc3VsdCA9IHR5cGVvZiByZXN1bHQgPT0gXCJzdHJpbmdcIiA/IEpTT04ucGFyc2UocmVzdWx0KSA6IHJlc3VsdDtcbiAgICAgICAgICAgIHJlc3VsdCA9IE93TS5wcm90b3R5cGUuY29udmVydChyZXN1bHQpO1xuICAgICAgICAgICAgdmFyIHJlc3VsdFJlcUlkID0gcmVzdWx0LmdldE1ldGEoXCJyZXF1ZXN0SWRcIik7XG4gICAgICAgICAgICB2YXIgcGhhc2VOYW1lID0gcmVzdWx0LmdldE1ldGEoXCJwaGFzZU5hbWVcIik7XG4gICAgICAgICAgICB2YXIgb25SZXR1cm4gPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYocmVzdWx0UmVxSWQgPT09IHJlcXVlc3RJZCl7XG4gICAgICAgICAgICAgICAgb25SZXR1cm5DYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbihjKXtcbiAgICAgICAgICAgICAgICAgICAgYyhudWxsLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICBvblJldHVybiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYob25SZXR1cm4pe1xuICAgICAgICAgICAgICAgICAgICBvblJldHVybkNhbGxiYWNrcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yQ2FsbGJhY2tzID0gW107XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgb25DYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbihpKXtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIlhYWFhYWFhYOlwiLCBwaGFzZU5hbWUgLCBpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYocGhhc2VOYW1lID09PSBpLnBoYXNlIHx8IGkucGhhc2UgPT09ICcqJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaS5jYWxsYmFjayhlcnIsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYob25SZXR1cm5DYWxsYmFja3MubGVuZ3RoID09PSAwICYmIG9uQ2FsbGJhY2tzLmxlbmd0aCA9PT0gMCl7XG4gICAgICAgICAgICAgICAgc2VsZi51bnBvbGwoZW5kUG9pbnQsIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFcnJvciA9IGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICBmb3IodmFyIGk9MDsgaSA8IG9uRXJyb3JDYWxsYmFja3MubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgICAgIHZhciBlcnJDYiA9IG9uRXJyb3JDYWxsYmFja3NbaV07XG4gICAgICAgICAgICAgICAgZXJyQ2IoZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLm9mZiA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLnVucG9sbChlbmRQb2ludCwgdGhpcyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy5jcmVhdGVSZXF1ZXN0ID0gZnVuY3Rpb24ocmVtb3RlRW5kUG9pbnQsIHN3YXJtKXtcbiAgICAgICAgbGV0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdChyZW1vdGVFbmRQb2ludCwgc3dhcm0pO1xuICAgICAgICByZXR1cm4gcmVxdWVzdDtcbiAgICB9O1xuXG4gICAgLyogKioqKioqKioqKioqKioqKioqKioqKioqKioqIHBvbGxpbmcgem9uZSAqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgdmFyIHBvbGxTZXQgPSB7XG4gICAgfTtcblxuICAgIHZhciBhY3RpdmVDb25uZWN0aW9ucyA9IHtcbiAgICB9O1xuXG4gICAgdGhpcy5wb2xsID0gZnVuY3Rpb24ocmVtb3RlRW5kUG9pbnQsIHJlcXVlc3Qpe1xuICAgICAgICB2YXIgcmVxdWVzdHMgPSBwb2xsU2V0W3JlbW90ZUVuZFBvaW50XTtcbiAgICAgICAgaWYoIXJlcXVlc3RzKXtcbiAgICAgICAgICAgIHJlcXVlc3RzID0ge307XG4gICAgICAgICAgICBwb2xsU2V0W3JlbW90ZUVuZFBvaW50XSA9IHJlcXVlc3RzO1xuICAgICAgICB9XG4gICAgICAgIHJlcXVlc3RzW3JlcXVlc3QuZ2V0UmVxdWVzdElkKCldID0gcmVxdWVzdDtcbiAgICAgICAgcG9sbGluZ0hhbmRsZXIoKTtcbiAgICB9O1xuXG4gICAgdGhpcy51bnBvbGwgPSBmdW5jdGlvbihyZW1vdGVFbmRQb2ludCwgcmVxdWVzdCl7XG4gICAgICAgIHZhciByZXF1ZXN0cyA9IHBvbGxTZXRbcmVtb3RlRW5kUG9pbnRdO1xuICAgICAgICBpZihyZXF1ZXN0cyl7XG4gICAgICAgICAgICBkZWxldGUgcmVxdWVzdHNbcmVxdWVzdC5nZXRSZXF1ZXN0SWQoKV07XG4gICAgICAgICAgICBpZihPYmplY3Qua2V5cyhyZXF1ZXN0cykubGVuZ3RoID09PSAwKXtcbiAgICAgICAgICAgICAgICBkZWxldGUgcG9sbFNldFtyZW1vdGVFbmRQb2ludF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVucG9sbGluZyB3cm9uZyByZXF1ZXN0OlwiLHJlbW90ZUVuZFBvaW50LCByZXF1ZXN0KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVQb2xsVGhyZWFkKHJlbW90ZUVuZFBvaW50KXtcbiAgICAgICAgZnVuY3Rpb24gcmVBcm0oKXtcbiAgICAgICAgICAgICQkLnJlbW90ZS5kb0h0dHBHZXQocmVtb3RlRW5kUG9pbnQsIGZ1bmN0aW9uKGVyciwgcmVzKXtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdHMgPSBwb2xsU2V0W3JlbW90ZUVuZFBvaW50XTtcblxuICAgICAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGZvcihsZXQgcmVxX2lkIGluIHJlcXVlc3RzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlcnJfaGFuZGxlciA9IHJlcXVlc3RzW3JlcV9pZF0uZGlzcGF0Y2hFcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGVycl9oYW5kbGVyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJfaGFuZGxlcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUNvbm5lY3Rpb25zW3JlbW90ZUVuZFBvaW50XSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgayBpbiByZXF1ZXN0cyl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0c1trXS5kaXNwYXRjaChudWxsLCByZXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoT2JqZWN0LmtleXMocmVxdWVzdHMpLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVBcm0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVDb25uZWN0aW9uc1tyZW1vdGVFbmRQb2ludF07XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVuZGluZyBwb2xsaW5nIGZvciBcIiwgcmVtb3RlRW5kUG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVBcm0oKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwb2xsaW5nSGFuZGxlcigpe1xuICAgICAgICBsZXQgc2V0VGltZXIgPSBmYWxzZTtcbiAgICAgICAgZm9yKHZhciB2IGluIHBvbGxTZXQpe1xuICAgICAgICAgICAgaWYoIWFjdGl2ZUNvbm5lY3Rpb25zW3ZdKXtcbiAgICAgICAgICAgICAgICBjcmVhdGVQb2xsVGhyZWFkKHYpO1xuICAgICAgICAgICAgICAgIGFjdGl2ZUNvbm5lY3Rpb25zW3ZdID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFRpbWVyID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZihzZXRUaW1lcikge1xuICAgICAgICAgICAgc2V0VGltZW91dChwb2xsaW5nSGFuZGxlciwgcG9sbGluZ1RpbWVPdXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0VGltZW91dCggcG9sbGluZ0hhbmRsZXIsIHBvbGxpbmdUaW1lT3V0KTtcbn1cblxuXG5mdW5jdGlvbiBleHRyYWN0RG9tYWluQWdlbnREZXRhaWxzKHVybCl7XG4gICAgY29uc3QgdlJlZ2V4ID0gLyhbYS16QS1aMC05XSp8LikqXFwvYWdlbnRcXC8oW2EtekEtWjAtOV0rKFxcLykqKSsvZztcblxuICAgIGlmKCF1cmwubWF0Y2godlJlZ2V4KSl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgZm9ybWF0LiAoRWcuIGRvbWFpblsuc3ViZG9tYWluXSovYWdlbnQvW29yZ2FuaXNhdGlvbi9dKmFnZW50SWQpXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IGRldmlkZXIgPSBcIi9hZ2VudC9cIjtcbiAgICBsZXQgZG9tYWluO1xuICAgIGxldCBhZ2VudFVybDtcblxuICAgIGNvbnN0IHNwbGl0UG9pbnQgPSB1cmwuaW5kZXhPZihkZXZpZGVyKTtcbiAgICBpZihzcGxpdFBvaW50ICE9PSAtMSl7XG4gICAgICAgIGRvbWFpbiA9IHVybC5zbGljZSgwLCBzcGxpdFBvaW50KTtcbiAgICAgICAgYWdlbnRVcmwgPSB1cmwuc2xpY2Uoc3BsaXRQb2ludCtkZXZpZGVyLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtkb21haW4sIGFnZW50VXJsfTtcbn1cblxuZnVuY3Rpb24gdXJsRW5kV2l0aFNsYXNoKHVybCl7XG5cbiAgICBpZih1cmxbdXJsLmxlbmd0aCAtIDFdICE9PSBcIi9cIil7XG4gICAgICAgIHVybCArPSBcIi9cIjtcbiAgICB9XG5cbiAgICByZXR1cm4gdXJsO1xufVxuXG5jb25zdCBPd00gPSByZXF1aXJlKFwic3dhcm11dGlsc1wiKS5Pd007XG5cbi8qKioqKioqKioqKioqKioqKioqKioqIG1haW4gQVBJcyBvbiB3b3JraW5nIHdpdGggcmVtb3RlIGVuZCBwb2ludHMgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbmZ1bmN0aW9uIFBza0h0dHBDbGllbnQocmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBvcHRpb25zKXtcbiAgICB2YXIgYmFzZU9mUmVtb3RlRW5kUG9pbnQgPSByZW1vdGVFbmRQb2ludDsgLy9yZW1vdmUgbGFzdCBpZFxuXG4gICAgcmVtb3RlRW5kUG9pbnQgPSB1cmxFbmRXaXRoU2xhc2gocmVtb3RlRW5kUG9pbnQpO1xuXG4gICAgLy9kb21haW5JbmZvIGNvbnRhaW5zIDIgbWVtYmVyczogZG9tYWluIChwcml2YXRlU2t5IGRvbWFpbikgYW5kIGFnZW50VXJsXG4gICAgY29uc3QgZG9tYWluSW5mbyA9IGV4dHJhY3REb21haW5BZ2VudERldGFpbHMoYWdlbnRVaWQpO1xuICAgIGxldCBob21lU2VjdXJpdHlDb250ZXh0ID0gZG9tYWluSW5mby5hZ2VudFVybDtcbiAgICBsZXQgcmV0dXJuUmVtb3RlRW5kUG9pbnQgPSByZW1vdGVFbmRQb2ludDtcblxuICAgIGlmKG9wdGlvbnMgJiYgdHlwZW9mIG9wdGlvbnMucmV0dXJuUmVtb3RlICE9IFwidW5kZWZpbmVkXCIpe1xuICAgICAgICByZXR1cm5SZW1vdGVFbmRQb2ludCA9IG9wdGlvbnMucmV0dXJuUmVtb3RlO1xuICAgIH1cblxuICAgIGlmKCFvcHRpb25zIHx8IG9wdGlvbnMgJiYgKHR5cGVvZiBvcHRpb25zLnVuaXF1ZUlkID09IFwidW5kZWZpbmVkXCIgfHwgb3B0aW9ucy51bmlxdWVJZCkpe1xuICAgICAgICBob21lU2VjdXJpdHlDb250ZXh0ICs9IFwiX1wiK01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KTtcbiAgICB9XG5cbiAgICByZXR1cm5SZW1vdGVFbmRQb2ludCA9IHVybEVuZFdpdGhTbGFzaChyZXR1cm5SZW1vdGVFbmRQb2ludCk7XG5cbiAgICB0aGlzLnN0YXJ0U3dhcm0gPSBmdW5jdGlvbihzd2FybU5hbWUsIHBoYXNlTmFtZSwgLi4uYXJncyl7XG4gICAgICAgIHZhciBzd2FybSA9IG5ldyBPd00oKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInN3YXJtSWRcIiwgJCQudWlkR2VuZXJhdG9yLnNhZmVfdXVpZCgpKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInJlcXVlc3RJZFwiLCBzd2FybS5nZXRNZXRhKFwic3dhcm1JZFwiKSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJzd2FybVR5cGVOYW1lXCIsIHN3YXJtTmFtZSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJwaGFzZU5hbWVcIiwgcGhhc2VOYW1lKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImFyZ3NcIiwgYXJncyk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJjb21tYW5kXCIsIFwiZXhlY3V0ZVN3YXJtUGhhc2VcIik7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJ0YXJnZXRcIiwgZG9tYWluSW5mby5hZ2VudFVybCk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIsIHJldHVyblJlbW90ZUVuZFBvaW50KyQkLnJlbW90ZS5iYXNlNjRFbmNvZGUoaG9tZVNlY3VyaXR5Q29udGV4dCkpO1xuXG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KGdldFJlbW90ZShyZW1vdGVFbmRQb2ludCwgZG9tYWluSW5mby5kb21haW4pLCBzd2FybSwgZnVuY3Rpb24oZXJyLCByZXMpe1xuICAgICAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gJCQucmVtb3RlLnJlcXVlc3RNYW5hZ2VyLmNyZWF0ZVJlcXVlc3Qoc3dhcm0uZ2V0TWV0YShcImhvbWVTZWN1cml0eUNvbnRleHRcIiksIHN3YXJtKTtcbiAgICB9O1xuXG4gICAgdGhpcy5jb250aW51ZVN3YXJtID0gZnVuY3Rpb24oZXhpc3RpbmdTd2FybSwgcGhhc2VOYW1lLCAuLi5hcmdzKXtcbiAgICAgICAgdmFyIHN3YXJtID0gbmV3IE93TShleGlzdGluZ1N3YXJtKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInBoYXNlTmFtZVwiLCBwaGFzZU5hbWUpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiYXJnc1wiLCBhcmdzKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImNvbW1hbmRcIiwgXCJleGVjdXRlU3dhcm1QaGFzZVwiKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInRhcmdldFwiLCBkb21haW5JbmZvLmFnZW50VXJsKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImhvbWVTZWN1cml0eUNvbnRleHRcIiwgcmV0dXJuUmVtb3RlRW5kUG9pbnQrJCQucmVtb3RlLmJhc2U2NEVuY29kZShob21lU2VjdXJpdHlDb250ZXh0KSk7XG5cbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cFBvc3QoZ2V0UmVtb3RlKHJlbW90ZUVuZFBvaW50LCBkb21haW5JbmZvLmRvbWFpbiksIHN3YXJtLCBmdW5jdGlvbihlcnIsIHJlcyl7XG4gICAgICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvL3JldHVybiAkJC5yZW1vdGUucmVxdWVzdE1hbmFnZXIuY3JlYXRlUmVxdWVzdChzd2FybS5nZXRNZXRhKFwiaG9tZVNlY3VyaXR5Q29udGV4dFwiKSwgc3dhcm0pO1xuICAgIH07XG5cbiAgICB2YXIgYWxsQ2F0Y2hBbGxzID0gW107XG4gICAgdmFyIHJlcXVlc3RzQ291bnRlciA9IDA7XG4gICAgZnVuY3Rpb24gQ2F0Y2hBbGwoc3dhcm1OYW1lLCBwaGFzZU5hbWUsIGNhbGxiYWNrKXsgLy9zYW1lIGludGVyZmFjZSBhcyBSZXF1ZXN0XG4gICAgICAgIHZhciByZXF1ZXN0SWQgPSByZXF1ZXN0c0NvdW50ZXIrKztcbiAgICAgICAgdGhpcy5nZXRSZXF1ZXN0SWQgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgbGV0IHJlcUlkID0gXCJzd2FybU5hbWVcIiArIFwicGhhc2VOYW1lXCIgKyByZXF1ZXN0SWQ7XG4gICAgICAgICAgICByZXR1cm4gcmVxSWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaCA9IGZ1bmN0aW9uKGVyciwgcmVzdWx0KXtcbiAgICAgICAgICAgIHJlc3VsdCA9IE93TS5wcm90b3R5cGUuY29udmVydChKU09OLnBhcnNlKHJlc3VsdCkpO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRQaGFzZU5hbWUgPSByZXN1bHQuZ2V0TWV0YShcInBoYXNlTmFtZVwiKTtcbiAgICAgICAgICAgIHZhciBjdXJyZW50U3dhcm1OYW1lID0gcmVzdWx0LmdldE1ldGEoXCJzd2FybVR5cGVOYW1lXCIpO1xuICAgICAgICAgICAgaWYoKGN1cnJlbnRTd2FybU5hbWUgPT09IHN3YXJtTmFtZSB8fCBzd2FybU5hbWUgPT09ICcqJykgJiYgKGN1cnJlbnRQaGFzZU5hbWUgPT09IHBoYXNlTmFtZSB8fCBwaGFzZU5hbWUgPT09ICcqJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHRoaXMub24gPSBmdW5jdGlvbihzd2FybU5hbWUsIHBoYXNlTmFtZSwgY2FsbGJhY2spe1xuICAgICAgICB2YXIgYyA9IG5ldyBDYXRjaEFsbChzd2FybU5hbWUsIHBoYXNlTmFtZSwgY2FsbGJhY2spO1xuICAgICAgICBhbGxDYXRjaEFsbHMucHVzaCh7XG4gICAgICAgICAgICBzOnN3YXJtTmFtZSxcbiAgICAgICAgICAgIHA6cGhhc2VOYW1lLFxuICAgICAgICAgICAgYzpjXG4gICAgICAgIH0pO1xuXG4gICAgICAgICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlci5wb2xsKGdldFJlbW90ZShyZW1vdGVFbmRQb2ludCwgZG9tYWluSW5mby5kb21haW4pICwgYyk7XG4gICAgfTtcblxuICAgIHRoaXMub2ZmID0gZnVuY3Rpb24oc3dhcm1OYW1lLCBwaGFzZU5hbWUpe1xuICAgICAgICBhbGxDYXRjaEFsbHMuZm9yRWFjaChmdW5jdGlvbihjYSl7XG4gICAgICAgICAgICBpZigoY2EucyA9PT0gc3dhcm1OYW1lIHx8IHN3YXJtTmFtZSA9PT0gJyonKSAmJiAocGhhc2VOYW1lID09PSBjYS5wIHx8IHBoYXNlTmFtZSA9PT0gJyonKSl7XG4gICAgICAgICAgICAgICAgJCQucmVtb3RlLnJlcXVlc3RNYW5hZ2VyLnVucG9sbChnZXRSZW1vdGUocmVtb3RlRW5kUG9pbnQsIGRvbWFpbkluZm8uZG9tYWluKSwgY2EuYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLnVwbG9hZENTQiA9IGZ1bmN0aW9uKGNyeXB0b1VpZCwgYmluYXJ5RGF0YSwgY2FsbGJhY2spe1xuICAgICAgICAkJC5yZW1vdGUuZG9IdHRwUG9zdChiYXNlT2ZSZW1vdGVFbmRQb2ludCArIFwiL0NTQi9cIiArIGNyeXB0b1VpZCwgYmluYXJ5RGF0YSwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICB0aGlzLmRvd25sb2FkQ1NCID0gZnVuY3Rpb24oY3J5cHRvVWlkLCBjYWxsYmFjayl7XG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBHZXQoYmFzZU9mUmVtb3RlRW5kUG9pbnQgKyBcIi9DU0IvXCIgKyBjcnlwdG9VaWQsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZ2V0UmVtb3RlKGJhc2VVcmwsIGRvbWFpbikge1xuICAgICAgICByZXR1cm4gdXJsRW5kV2l0aFNsYXNoKGJhc2VVcmwpICsgJCQucmVtb3RlLmJhc2U2NEVuY29kZShkb21haW4pO1xuICAgIH1cbn1cblxuLyoqKioqKioqKioqKioqKioqKioqKiogaW5pdGlhbGlzYXRpb24gc3R1ZmYgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbmlmICh0eXBlb2YgJCQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAkJCA9IHt9O1xufVxuXG5pZiAodHlwZW9mICAkJC5yZW1vdGUgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAkJC5yZW1vdGUgPSB7fTtcbiAgICAkJC5yZW1vdGUuY3JlYXRlUmVxdWVzdE1hbmFnZXIgPSBmdW5jdGlvbih0aW1lT3V0KXtcbiAgICAgICAgJCQucmVtb3RlLnJlcXVlc3RNYW5hZ2VyID0gbmV3IFJlcXVlc3RNYW5hZ2VyKHRpbWVPdXQpO1xuICAgIH07XG5cblxuICAgICQkLnJlbW90ZS5jcnlwdG9Qcm92aWRlciA9IG51bGw7XG4gICAgJCQucmVtb3RlLm5ld0VuZFBvaW50ID0gZnVuY3Rpb24oYWxpYXMsIHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgY3J5cHRvSW5mbyl7XG4gICAgICAgIGlmKGFsaWFzID09PSBcIm5ld1JlbW90ZUVuZFBvaW50XCIgfHwgYWxpYXMgPT09IFwicmVxdWVzdE1hbmFnZXJcIiB8fCBhbGlhcyA9PT0gXCJjcnlwdG9Qcm92aWRlclwiKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUHNrSHR0cENsaWVudCBVbnNhZmUgYWxpYXMgbmFtZTpcIiwgYWxpYXMpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQkLnJlbW90ZVthbGlhc10gPSBuZXcgUHNrSHR0cENsaWVudChyZW1vdGVFbmRQb2ludCwgYWdlbnRVaWQsIGNyeXB0b0luZm8pO1xuICAgIH07XG5cblxuICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0ID0gZnVuY3Rpb24gKHVybCwgZGF0YSwgY2FsbGJhY2spe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgdGhpcyFcIik7XG4gICAgfTtcblxuICAgICQkLnJlbW90ZS5kb0h0dHBHZXQgPSBmdW5jdGlvbiBkb0h0dHBHZXQodXJsLCBjYWxsYmFjayl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSB0aGlzIVwiKTtcbiAgICB9O1xuXG4gICAgJCQucmVtb3RlLmJhc2U2NEVuY29kZSA9IGZ1bmN0aW9uIGJhc2U2NEVuY29kZShzdHJpbmdUb0VuY29kZSl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSB0aGlzIVwiKTtcbiAgICB9O1xuXG4gICAgJCQucmVtb3RlLmJhc2U2NERlY29kZSA9IGZ1bmN0aW9uIGJhc2U2NERlY29kZShlbmNvZGVkU3RyaW5nKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlIHRoaXMhXCIpO1xuICAgIH07XG59XG5cblxuXG4vKiAgaW50ZXJmYWNlXG5mdW5jdGlvbiBDcnlwdG9Qcm92aWRlcigpe1xuXG4gICAgdGhpcy5nZW5lcmF0ZVNhZmVVaWQgPSBmdW5jdGlvbigpe1xuXG4gICAgfVxuXG4gICAgdGhpcy5zaWduU3dhcm0gPSBmdW5jdGlvbihzd2FybSwgYWdlbnQpe1xuXG4gICAgfVxufSAqL1xuIiwiJCQucmVtb3RlLmRvSHR0cFBvc3QgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBjYWxsYmFjaykge1xuXG4gICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09IDQgJiYgeGhyLnN0YXR1cyA9PSBcIjIwMFwiKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHhoci5yZXNwb25zZTtcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYoeGhyLnN0YXR1cz49NDAwKXtcbiAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihcIkFuIGVycm9yIG9jY3VyZWQuIFN0YXR1c0NvZGU6IFwiICsgeGhyLnN0YXR1cykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHhoci5vcGVuKFwiUE9TVFwiLCB1cmwsIHRydWUpO1xuICAgIC8veGhyLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLThcIik7XG5cbiAgICBpZihkYXRhICYmIGRhdGEucGlwZSAmJiB0eXBlb2YgZGF0YS5waXBlID09PSBcImZ1bmN0aW9uXCIpe1xuICAgICAgICB2YXIgYnVmZmVycyA9IFtdO1xuICAgICAgICBkYXRhLm9uKFwiZGF0YVwiLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBidWZmZXJzLnB1c2goZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgICBkYXRhLm9uKFwiZW5kXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGFjdHVhbENvbnRlbnRzID0gQnVmZmVyLmNvbmNhdChidWZmZXJzKTtcbiAgICAgICAgICAgIHhoci5zZW5kKGFjdHVhbENvbnRlbnRzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIHhoci5zZW5kKGRhdGEpO1xuICAgIH1cbn07XG5cblxuJCQucmVtb3RlLmRvSHR0cEdldCA9IGZ1bmN0aW9uIGRvSHR0cEdldCh1cmwsIGNhbGxiYWNrKSB7XG5cbiAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvL2NoZWNrIGlmIGhlYWRlcnMgd2VyZSByZWNlaXZlZCBhbmQgaWYgYW55IGFjdGlvbiBzaG91bGQgYmUgcGVyZm9ybWVkIGJlZm9yZSByZWNlaXZpbmcgZGF0YVxuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDIpIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZSA9IHhoci5nZXRSZXNwb25zZUhlYWRlcihcIkNvbnRlbnQtVHlwZVwiKTtcbiAgICAgICAgICAgIGlmIChjb250ZW50VHlwZSA9PT0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIikge1xuICAgICAgICAgICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT0gNCAmJiB4aHIuc3RhdHVzID09IFwiMjAwXCIpIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZSA9IHhoci5nZXRSZXNwb25zZUhlYWRlcihcIkNvbnRlbnQtVHlwZVwiKTtcblxuICAgICAgICAgICAgaWYoY29udGVudFR5cGU9PT1cImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiKXtcbiAgICAgICAgICAgICAgICBsZXQgcmVzcG9uc2VCdWZmZXIgPSBCdWZmZXIuZnJvbSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZUJ1ZmZlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihcIkFuIGVycm9yIG9jY3VyZWQuIFN0YXR1c0NvZGU6IFwiICsgeGhyLnN0YXR1cykpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHhoci5vcGVuKFwiR0VUXCIsIHVybCk7XG4gICAgeGhyLnNlbmQoKTtcbn07XG5cblxuZnVuY3Rpb24gQ3J5cHRvUHJvdmlkZXIoKXtcblxuICAgIHRoaXMuZ2VuZXJhdGVTYWZlVWlkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgbGV0IHVpZCA9IFwiXCI7XG4gICAgICAgIHZhciBhcnJheSA9IG5ldyBVaW50MzJBcnJheSgxMCk7XG4gICAgICAgIHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKGFycmF5KTtcblxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHVpZCArPSBhcnJheVtpXS50b1N0cmluZygxNik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdWlkO1xuICAgIH1cblxuICAgIHRoaXMuc2lnblN3YXJtID0gZnVuY3Rpb24oc3dhcm0sIGFnZW50KXtcbiAgICAgICAgc3dhcm0ubWV0YS5zaWduYXR1cmUgPSBhZ2VudDtcbiAgICB9XG59XG5cblxuXG4kJC5yZW1vdGUuY3J5cHRvUHJvdmlkZXIgPSBuZXcgQ3J5cHRvUHJvdmlkZXIoKTtcblxuJCQucmVtb3RlLmJhc2U2NEVuY29kZSA9IGZ1bmN0aW9uIGJhc2U2NEVuY29kZShzdHJpbmdUb0VuY29kZSl7XG4gICAgcmV0dXJuIHdpbmRvdy5idG9hKHN0cmluZ1RvRW5jb2RlKTtcbn07XG5cbiQkLnJlbW90ZS5iYXNlNjREZWNvZGUgPSBmdW5jdGlvbiBiYXNlNjREZWNvZGUoZW5jb2RlZFN0cmluZyl7XG4gICAgcmV0dXJuIHdpbmRvdy5hdG9iKGVuY29kZWRTdHJpbmcpO1xufTtcbiIsInJlcXVpcmUoXCIuL3Bzay1hYnN0cmFjdC1jbGllbnRcIik7XG5cbmNvbnN0IGh0dHAgPSByZXF1aXJlKFwiaHR0cFwiKTtcbmNvbnN0IGh0dHBzID0gcmVxdWlyZShcImh0dHBzXCIpO1xuY29uc3QgVVJMID0gcmVxdWlyZShcInVybFwiKTtcbmNvbnN0IHVzZXJBZ2VudCA9ICdQU0sgTm9kZUFnZW50LzAuMC4xJztcblxuY29uc29sZS5sb2coXCJQU0sgbm9kZSBjbGllbnQgbG9hZGluZ1wiKTtcblxuZnVuY3Rpb24gZ2V0TmV0d29ya0Zvck9wdGlvbnMob3B0aW9ucykge1xuXHRpZihvcHRpb25zLnByb3RvY29sID09PSAnaHR0cDonKSB7XG5cdFx0cmV0dXJuIGh0dHA7XG5cdH0gZWxzZSBpZihvcHRpb25zLnByb3RvY29sID09PSAnaHR0cHM6Jykge1xuXHRcdHJldHVybiBodHRwcztcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYENhbid0IGhhbmRsZSBwcm90b2NvbCAke29wdGlvbnMucHJvdG9jb2x9YCk7XG5cdH1cblxufVxuXG4kJC5yZW1vdGUuZG9IdHRwUG9zdCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGNhbGxiYWNrKXtcblx0Y29uc3QgaW5uZXJVcmwgPSBVUkwucGFyc2UodXJsKTtcblxuXHRjb25zdCBvcHRpb25zID0ge1xuXHRcdGhvc3RuYW1lOiBpbm5lclVybC5ob3N0bmFtZSxcblx0XHRwYXRoOiBpbm5lclVybC5wYXRobmFtZSxcblx0XHRwb3J0OiBwYXJzZUludChpbm5lclVybC5wb3J0KSxcblx0XHRoZWFkZXJzOiB7XG5cdFx0XHQnVXNlci1BZ2VudCc6IHVzZXJBZ2VudFxuXHRcdH0sXG5cdFx0bWV0aG9kOiAnUE9TVCdcblx0fTtcblxuXHRjb25zdCBuZXR3b3JrID0gZ2V0TmV0d29ya0Zvck9wdGlvbnMoaW5uZXJVcmwpO1xuXG5cdGNvbnN0IHJlcSA9IG5ldHdvcmsucmVxdWVzdChvcHRpb25zLCAocmVzKSA9PiB7XG5cdFx0Y29uc3QgeyBzdGF0dXNDb2RlIH0gPSByZXM7XG5cblx0XHRsZXQgZXJyb3I7XG5cdFx0aWYgKHN0YXR1c0NvZGUgPj0gNDAwKSB7XG5cdFx0XHRlcnJvciA9IG5ldyBFcnJvcignUmVxdWVzdCBGYWlsZWQuXFxuJyArXG5cdFx0XHRcdGBTdGF0dXMgQ29kZTogJHtzdGF0dXNDb2RlfWApO1xuXHRcdH1cblxuXHRcdGlmIChlcnJvcikge1xuXHRcdFx0Y2FsbGJhY2soZXJyb3IpO1xuXHRcdFx0Ly8gZnJlZSB1cCBtZW1vcnlcblx0XHRcdHJlcy5yZXN1bWUoKTtcblx0XHRcdHJldHVybiA7XG5cdFx0fVxuXG5cdFx0bGV0IHJhd0RhdGEgPSAnJztcblx0XHRyZXMub24oJ2RhdGEnLCAoY2h1bmspID0+IHsgcmF3RGF0YSArPSBjaHVuazsgfSk7XG5cdFx0cmVzLm9uKCdlbmQnLCAoKSA9PiB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgcmF3RGF0YSk7XG5cdFx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pLm9uKFwiZXJyb3JcIiwgKGVycm9yKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUE9TVCBFcnJvclwiLCBlcnJvcik7XG5cdFx0Y2FsbGJhY2soZXJyb3IpO1xuXHR9KTtcblxuICAgIGlmKGRhdGEgJiYgZGF0YS5waXBlICYmIHR5cGVvZiBkYXRhLnBpcGUgPT09IFwiZnVuY3Rpb25cIil7XG4gICAgICAgIGRhdGEucGlwZShyZXEpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYodHlwZW9mIGRhdGEgIT09ICdzdHJpbmcnICYmICFCdWZmZXIuaXNCdWZmZXIoZGF0YSkpIHtcblx0XHRkYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG5cdH1cblxuXHRyZXEud3JpdGUoZGF0YSk7XG5cdHJlcS5lbmQoKTtcbn07XG5cbiQkLnJlbW90ZS5kb0h0dHBHZXQgPSBmdW5jdGlvbiBkb0h0dHBHZXQodXJsLCBjYWxsYmFjayl7XG4gICAgY29uc3QgaW5uZXJVcmwgPSBVUkwucGFyc2UodXJsKTtcblxuXHRjb25zdCBvcHRpb25zID0ge1xuXHRcdGhvc3RuYW1lOiBpbm5lclVybC5ob3N0bmFtZSxcblx0XHRwYXRoOiBpbm5lclVybC5wYXRobmFtZSArIChpbm5lclVybC5zZWFyY2ggfHwgJycpLFxuXHRcdHBvcnQ6IHBhcnNlSW50KGlubmVyVXJsLnBvcnQpLFxuXHRcdGhlYWRlcnM6IHtcblx0XHRcdCdVc2VyLUFnZW50JzogdXNlckFnZW50XG5cdFx0fSxcblx0XHRtZXRob2Q6ICdHRVQnXG5cdH07XG5cblx0Y29uc3QgbmV0d29yayA9IGdldE5ldHdvcmtGb3JPcHRpb25zKGlubmVyVXJsKTtcblxuXHRjb25zdCByZXEgPSBuZXR3b3JrLnJlcXVlc3Qob3B0aW9ucywgKHJlcykgPT4ge1xuXHRcdGNvbnN0IHsgc3RhdHVzQ29kZSB9ID0gcmVzO1xuXG5cdFx0bGV0IGVycm9yO1xuXHRcdGlmIChzdGF0dXNDb2RlICE9PSAyMDApIHtcblx0XHRcdGVycm9yID0gbmV3IEVycm9yKCdSZXF1ZXN0IEZhaWxlZC5cXG4nICtcblx0XHRcdFx0YFN0YXR1cyBDb2RlOiAke3N0YXR1c0NvZGV9YCk7XG5cdFx0XHRlcnJvci5jb2RlID0gc3RhdHVzQ29kZTtcblx0XHR9XG5cblx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdGNhbGxiYWNrKGVycm9yKTtcblx0XHRcdC8vIGZyZWUgdXAgbWVtb3J5XG5cdFx0XHRyZXMucmVzdW1lKCk7XG5cdFx0XHRyZXR1cm4gO1xuXHRcdH1cblxuXHRcdGxldCByYXdEYXRhO1xuXHRcdGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzLmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddO1xuXG5cdFx0aWYoY29udGVudFR5cGUgPT09IFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCIpe1xuXHRcdFx0cmF3RGF0YSA9IFtdO1xuXHRcdH1lbHNle1xuXHRcdFx0cmF3RGF0YSA9ICcnO1xuXHRcdH1cblxuXHRcdHJlcy5vbignZGF0YScsIChjaHVuaykgPT4ge1xuXHRcdFx0aWYoQXJyYXkuaXNBcnJheShyYXdEYXRhKSl7XG5cdFx0XHRcdHJhd0RhdGEucHVzaCguLi5jaHVuayk7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0cmF3RGF0YSArPSBjaHVuaztcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXMub24oJ2VuZCcsICgpID0+IHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmKEFycmF5LmlzQXJyYXkocmF3RGF0YSkpe1xuXHRcdFx0XHRcdHJhd0RhdGEgPSBCdWZmZXIuZnJvbShyYXdEYXRhKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgcmF3RGF0YSk7XG5cdFx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJDbGllbnQgZXJyb3I6XCIsIGVycik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xuXG5cdHJlcS5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuXHRcdGlmKGVycm9yICYmIGVycm9yLmNvZGUgIT09ICdFQ09OTlJFU0VUJyl7XG4gICAgICAgIFx0Y29uc29sZS5sb2coXCJHRVQgRXJyb3JcIiwgZXJyb3IpO1xuXHRcdH1cblxuXHRcdGNhbGxiYWNrKGVycm9yKTtcblx0fSk7XG5cblx0cmVxLmVuZCgpO1xufTtcblxuJCQucmVtb3RlLmJhc2U2NEVuY29kZSA9IGZ1bmN0aW9uIGJhc2U2NEVuY29kZShzdHJpbmdUb0VuY29kZSl7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKHN0cmluZ1RvRW5jb2RlKS50b1N0cmluZygnYmFzZTY0Jyk7XG59O1xuXG4kJC5yZW1vdGUuYmFzZTY0RGVjb2RlID0gZnVuY3Rpb24gYmFzZTY0RGVjb2RlKGVuY29kZWRTdHJpbmcpe1xuICAgIHJldHVybiBCdWZmZXIuZnJvbShlbmNvZGVkU3RyaW5nLCAnYmFzZTY0JykudG9TdHJpbmcoJ2FzY2lpJyk7XG59OyIsImNvbnN0IGNvbnNVdGlsID0gcmVxdWlyZSgnc2lnbnNlbnN1cycpLmNvbnNVdGlsO1xuY29uc3QgYmVlc0hlYWxlciA9IHJlcXVpcmUoXCJzd2FybXV0aWxzXCIpLmJlZXNIZWFsZXI7XG5cbmZ1bmN0aW9uIEJsb2NrY2hhaW4ocGRzKSB7XG4gICAgbGV0IHN3YXJtID0gbnVsbDtcblxuICAgIHRoaXMuYmVnaW5UcmFuc2FjdGlvbiA9IGZ1bmN0aW9uICh0cmFuc2FjdGlvblN3YXJtKSB7XG4gICAgICAgIGlmICghdHJhbnNhY3Rpb25Td2FybSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHN3YXJtJyk7XG4gICAgICAgIH1cblxuICAgICAgICBzd2FybSA9IHRyYW5zYWN0aW9uU3dhcm07XG4gICAgICAgIHJldHVybiBuZXcgVHJhbnNhY3Rpb24ocGRzLmdldEhhbmRsZXIoKSk7XG4gICAgfTtcblxuICAgIHRoaXMuY29tbWl0ID0gZnVuY3Rpb24gKHRyYW5zYWN0aW9uKSB7XG5cbiAgICAgICAgY29uc3QgZGlmZiA9IHBkcy5jb21wdXRlU3dhcm1UcmFuc2FjdGlvbkRpZmYoc3dhcm0sIHRyYW5zYWN0aW9uLmdldEhhbmRsZXIoKSk7XG4gICAgICAgIGNvbnN0IHQgPSBjb25zVXRpbC5jcmVhdGVUcmFuc2FjdGlvbigwLCBkaWZmKTtcbiAgICAgICAgY29uc3Qgc2V0ID0ge307XG4gICAgICAgIHNldFt0LmRpZ2VzdF0gPSB0O1xuICAgICAgICBwZHMuY29tbWl0KHNldCwgMSk7XG4gICAgfTtcbn1cblxuXG5mdW5jdGlvbiBUcmFuc2FjdGlvbihwZHNIYW5kbGVyKSB7XG4gICAgY29uc3QgQUxJQVNFUyA9ICcvYWxpYXNlcyc7XG5cblxuICAgIHRoaXMuYWRkID0gZnVuY3Rpb24gKGFzc2V0KSB7XG4gICAgICAgIGNvbnN0IHN3YXJtVHlwZU5hbWUgPSBhc3NldC5nZXRNZXRhZGF0YSgnc3dhcm1UeXBlTmFtZScpO1xuICAgICAgICBjb25zdCBzd2FybUlkID0gYXNzZXQuZ2V0TWV0YWRhdGEoJ3N3YXJtSWQnKTtcblxuICAgICAgICBjb25zdCBhbGlhc0luZGV4ID0gbmV3IEFsaWFzSW5kZXgoc3dhcm1UeXBlTmFtZSk7XG4gICAgICAgIGlmIChhc3NldC5hbGlhcyAmJiBhbGlhc0luZGV4LmdldFVpZChhc3NldC5hbGlhcykgIT09IHN3YXJtSWQpIHtcbiAgICAgICAgICAgIGFsaWFzSW5kZXguY3JlYXRlKGFzc2V0LmFsaWFzLCBzd2FybUlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFzc2V0LnNldE1ldGFkYXRhKCdwZXJzaXN0ZWQnLCB0cnVlKTtcbiAgICAgICAgY29uc3Qgc2VyaWFsaXplZFN3YXJtID0gYmVlc0hlYWxlci5hc0pTT04oYXNzZXQsIG51bGwsIG51bGwpO1xuXG4gICAgICAgIHBkc0hhbmRsZXIud3JpdGVLZXkoc3dhcm1UeXBlTmFtZSArICcvJyArIHN3YXJtSWQsIEooc2VyaWFsaXplZFN3YXJtKSk7XG4gICAgfTtcblxuICAgIHRoaXMubG9va3VwID0gZnVuY3Rpb24gKGFzc2V0VHlwZSwgYWlkKSB7IC8vIGFsaWFzIHNhdSBpZFxuICAgICAgICBsZXQgbG9jYWxVaWQgPSBhaWQ7XG5cbiAgICAgICAgaWYgKGhhc0FsaWFzZXMoYXNzZXRUeXBlKSkge1xuICAgICAgICAgICAgY29uc3QgYWxpYXNJbmRleCA9IG5ldyBBbGlhc0luZGV4KGFzc2V0VHlwZSk7XG4gICAgICAgICAgICBsb2NhbFVpZCA9IGFsaWFzSW5kZXguZ2V0VWlkKGFpZCkgfHwgYWlkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdmFsdWUgPSBwZHNIYW5kbGVyLnJlYWRLZXkoYXNzZXRUeXBlICsgJy8nICsgbG9jYWxVaWQpO1xuXG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiAkJC5hc3NldC5zdGFydChhc3NldFR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgc3dhcm0gPSAkJC5hc3NldC5jb250aW51ZShhc3NldFR5cGUsIEpTT04ucGFyc2UodmFsdWUpKTtcbiAgICAgICAgICAgIHN3YXJtLnNldE1ldGFkYXRhKFwicGVyc2lzdGVkXCIsIHRydWUpO1xuICAgICAgICAgICAgcmV0dXJuIHN3YXJtO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMubG9hZEFzc2V0cyA9IGZ1bmN0aW9uIChhc3NldFR5cGUpIHtcbiAgICAgICAgY29uc3QgYXNzZXRzID0gW107XG5cbiAgICAgICAgY29uc3QgYWxpYXNJbmRleCA9IG5ldyBBbGlhc0luZGV4KGFzc2V0VHlwZSk7XG4gICAgICAgIE9iamVjdC5rZXlzKGFsaWFzSW5kZXguZ2V0QWxpYXNlcygpKS5mb3JFYWNoKChhbGlhcykgPT4ge1xuICAgICAgICAgICAgYXNzZXRzLnB1c2godGhpcy5sb29rdXAoYXNzZXRUeXBlLCBhbGlhcykpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gYXNzZXRzO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEhhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBwZHNIYW5kbGVyO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNBbGlhc2VzKHNwYWNlTmFtZSkge1xuICAgICAgICByZXR1cm4gISFwZHNIYW5kbGVyLnJlYWRLZXkoc3BhY2VOYW1lICsgQUxJQVNFUyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gQWxpYXNJbmRleChhc3NldFR5cGUpIHtcbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoYWxpYXMsIHVpZCkge1xuICAgICAgICAgICAgY29uc3QgYXNzZXRBbGlhc2VzID0gdGhpcy5nZXRBbGlhc2VzKCk7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXNzZXRBbGlhc2VzW2FsaWFzXSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICQkLmVycm9ySGFuZGxlci50aHJvd0Vycm9yKG5ldyBFcnJvcihgQWxpYXMgJHthbGlhc30gZm9yIGFzc2V0cyBvZiB0eXBlICR7YXNzZXRUeXBlfSBhbHJlYWR5IGV4aXN0c2ApKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXNzZXRBbGlhc2VzW2FsaWFzXSA9IHVpZDtcblxuICAgICAgICAgICAgcGRzSGFuZGxlci53cml0ZUtleShhc3NldFR5cGUgKyBBTElBU0VTLCBKKGFzc2V0QWxpYXNlcykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0VWlkID0gZnVuY3Rpb24gKGFsaWFzKSB7XG4gICAgICAgICAgICBjb25zdCBhc3NldEFsaWFzZXMgPSB0aGlzLmdldEFsaWFzZXMoKTtcbiAgICAgICAgICAgIHJldHVybiBhc3NldEFsaWFzZXNbYWxpYXNdO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0QWxpYXNlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxldCBhbGlhc2VzID0gcGRzSGFuZGxlci5yZWFkS2V5KGFzc2V0VHlwZSArIEFMSUFTRVMpO1xuICAgICAgICAgICAgcmV0dXJuIGFsaWFzZXMgPyBKU09OLnBhcnNlKGFsaWFzZXMpIDoge307XG4gICAgICAgIH07XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJsb2NrY2hhaW47IiwidmFyIG1lbW9yeVBEUyA9IHJlcXVpcmUoXCIuL0luTWVtb3J5UERTXCIpO1xudmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xudmFyIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcblxuXG5mdW5jdGlvbiBGb2xkZXJQZXJzaXN0ZW50UERTKGZvbGRlcikge1xuICAgIHRoaXMubWVtQ2FjaGUgPSBtZW1vcnlQRFMubmV3UERTKHRoaXMpO1xuXG4gICAgZnVuY3Rpb24gbWtTaW5nbGVMaW5lKHN0cikge1xuICAgICAgICByZXR1cm4gc3RyLnJlcGxhY2UoL1tcXG5cXHJdL2csIFwiXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VDdXJyZW50VmFsdWVGaWxlbmFtZSgpIHtcbiAgICAgICAgcmV0dXJuIHBhdGgubm9ybWFsaXplKGZvbGRlciArICcvY3VycmVudFZlcnNpb24nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRDdXJyZW50VmFsdWUocGF0aCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYoIWZzLmV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhdGgpLnRvU3RyaW5nKCkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZXJyb3IgJywgZSk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucGVyc2lzdCA9IGZ1bmN0aW9uICh0cmFuc2FjdGlvbkxvZywgY3VycmVudFZhbHVlcywgY3VycmVudFB1bHNlKSB7XG5cbiAgICAgICAgdHJhbnNhY3Rpb25Mb2cuY3VycmVudFB1bHNlID0gY3VycmVudFB1bHNlO1xuICAgICAgICB0cmFuc2FjdGlvbkxvZyA9IG1rU2luZ2xlTGluZShKU09OLnN0cmluZ2lmeSh0cmFuc2FjdGlvbkxvZykpICsgXCJcXG5cIjtcblxuICAgICAgICBmcy5ta2Rpcihmb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCBmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgICAgICAgIGlmIChlcnIgJiYgZXJyLmNvZGUgIT09IFwiRUVYSVNUXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZzLmFwcGVuZEZpbGVTeW5jKGZvbGRlciArICcvdHJhbnNhY3Rpb25zTG9nJywgdHJhbnNhY3Rpb25Mb2csICd1dGY4Jyk7XG4gICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKG1ha2VDdXJyZW50VmFsdWVGaWxlbmFtZSgpLCBKU09OLnN0cmluZ2lmeShjdXJyZW50VmFsdWVzLCBudWxsLCAxKSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBjb25zdCBpbm5lclZhbHVlcyA9IGdldEN1cnJlbnRWYWx1ZShtYWtlQ3VycmVudFZhbHVlRmlsZW5hbWUoKSk7XG4gICAgdGhpcy5tZW1DYWNoZS5pbml0aWFsaXNlKGlubmVyVmFsdWVzKTtcbn1cblxuZXhwb3J0cy5uZXdQRFMgPSBmdW5jdGlvbiAoZm9sZGVyKSB7XG4gICAgY29uc3QgcGRzID0gbmV3IEZvbGRlclBlcnNpc3RlbnRQRFMoZm9sZGVyKTtcbiAgICByZXR1cm4gcGRzLm1lbUNhY2hlO1xufTtcbiIsIlxudmFyIGN1dGlsICAgPSByZXF1aXJlKFwiLi4vLi4vc2lnbnNlbnN1cy9saWIvY29uc1V0aWxcIik7XG52YXIgc3N1dGlsICA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5cblxuZnVuY3Rpb24gU3RvcmFnZShwYXJlbnRTdG9yYWdlKXtcbiAgICB2YXIgY3NldCAgICAgICAgICAgID0ge307ICAvLyBjb250YWluZXMgYWxsIGtleXMgaW4gcGFyZW50IHN0b3JhZ2UsIGNvbnRhaW5zIG9ubHkga2V5cyB0b3VjaGVkIGluIGhhbmRsZXJzXG4gICAgdmFyIHdyaXRlU2V0ICAgICAgICA9ICFwYXJlbnRTdG9yYWdlID8gY3NldCA6IHt9OyAgIC8vY29udGFpbnMgb25seSBrZXlzIG1vZGlmaWVkIGluIGhhbmRsZXJzXG5cbiAgICB2YXIgcmVhZFNldFZlcnNpb25zICA9IHt9OyAvL21lYW5pbmdmdWwgb25seSBpbiBoYW5kbGVyc1xuICAgIHZhciB3cml0ZVNldFZlcnNpb25zID0ge307IC8vd2lsbCBzdG9yZSBhbGwgdmVyc2lvbnMgZ2VuZXJhdGVkIGJ5IHdyaXRlS2V5XG5cbiAgICB2YXIgdnNkICAgICAgICAgICAgID0gXCJlbXB0eVwiOyAvL29ubHkgZm9yIHBhcmVudCBzdG9yYWdlXG4gICAgdmFyIHByZXZpb3VzVlNEICAgICA9IG51bGw7XG5cbiAgICB2YXIgbXlDdXJyZW50UHVsc2UgICAgPSAwO1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuXG4gICAgZnVuY3Rpb24gaGFzTG9jYWxLZXkobmFtZSl7XG4gICAgICAgIHJldHVybiBjc2V0Lmhhc093blByb3BlcnR5KG5hbWUpO1xuICAgIH1cblxuICAgIHRoaXMuaGFzS2V5ID0gZnVuY3Rpb24obmFtZSl7XG4gICAgICAgIHJldHVybiBwYXJlbnRTdG9yYWdlID8gcGFyZW50U3RvcmFnZS5oYXNLZXkobmFtZSkgOiBoYXNMb2NhbEtleShuYW1lKTtcbiAgICB9O1xuXG4gICAgdGhpcy5yZWFkS2V5ID0gZnVuY3Rpb24gcmVhZEtleShuYW1lKXtcbiAgICAgICAgdmFyIHZhbHVlO1xuICAgICAgICBpZihoYXNMb2NhbEtleShuYW1lKSl7XG4gICAgICAgICAgICB2YWx1ZSA9IGNzZXRbbmFtZV07XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgaWYodGhpcy5oYXNLZXkobmFtZSkpe1xuICAgICAgICAgICAgICAgIHZhbHVlID0gcGFyZW50U3RvcmFnZS5yZWFkS2V5KG5hbWUpO1xuICAgICAgICAgICAgICAgIGNzZXRbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICByZWFkU2V0VmVyc2lvbnNbbmFtZV0gPSBwYXJlbnRTdG9yYWdlLmdldFZlcnNpb24obmFtZSk7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBjc2V0W25hbWVdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJlYWRTZXRWZXJzaW9uc1tuYW1lXSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3cml0ZVNldFZlcnNpb25zW25hbWVdID0gcmVhZFNldFZlcnNpb25zW25hbWVdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRWZXJzaW9uID0gZnVuY3Rpb24obmFtZSwgcmVhbFZlcnNpb24pe1xuICAgICAgICB2YXIgdmVyc2lvbiA9IDA7XG4gICAgICAgIGlmKGhhc0xvY2FsS2V5KG5hbWUpKXtcbiAgICAgICAgICAgIHZlcnNpb24gPSByZWFkU2V0VmVyc2lvbnNbbmFtZV07XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgaWYodGhpcy5oYXNLZXkobmFtZSkpe1xuICAgICAgICAgICAgICAgIGNzZXRbbmFtZV0gPSBwYXJlbnRTdG9yYWdlLnJlYWRLZXkoKTtcbiAgICAgICAgICAgICAgICB2ZXJzaW9uID0gcmVhZFNldFZlcnNpb25zW25hbWVdID0gcGFyZW50U3RvcmFnZS5nZXRWZXJzaW9uKG5hbWUpO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgY3NldFtuYW1lXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZWFkU2V0VmVyc2lvbnNbbmFtZV0gPSB2ZXJzaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2ZXJzaW9uO1xuICAgIH07XG5cbiAgICB0aGlzLndyaXRlS2V5ID0gZnVuY3Rpb24gbW9kaWZ5S2V5KG5hbWUsIHZhbHVlKXtcbiAgICAgICAgdmFyIGsgPSB0aGlzLnJlYWRLZXkobmFtZSk7IC8vVE9ETzogdW51c2VkIHZhclxuXG4gICAgICAgIGNzZXQgW25hbWVdID0gdmFsdWU7XG4gICAgICAgIHdyaXRlU2V0VmVyc2lvbnNbbmFtZV0rKztcbiAgICAgICAgd3JpdGVTZXRbbmFtZV0gPSB2YWx1ZTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRJbnB1dE91dHB1dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlucHV0OiByZWFkU2V0VmVyc2lvbnMsXG4gICAgICAgICAgICBvdXRwdXQ6IHdyaXRlU2V0XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SW50ZXJuYWxWYWx1ZXMgPSBmdW5jdGlvbihjdXJyZW50UHVsc2UsIHVwZGF0ZVByZXZpb3VzVlNEKXtcbiAgICAgICAgaWYodXBkYXRlUHJldmlvdXNWU0Qpe1xuICAgICAgICAgICAgbXlDdXJyZW50UHVsc2UgPSBjdXJyZW50UHVsc2U7XG4gICAgICAgICAgICBwcmV2aW91c1ZTRCA9IHZzZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY3NldDpjc2V0LFxuICAgICAgICAgICAgd3JpdGVTZXRWZXJzaW9uczp3cml0ZVNldFZlcnNpb25zLFxuICAgICAgICAgICAgcHJldmlvdXNWU0Q6cHJldmlvdXNWU0QsXG4gICAgICAgICAgICB2c2Q6dnNkLFxuICAgICAgICAgICAgY3VycmVudFB1bHNlOmN1cnJlbnRQdWxzZVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB0aGlzLmluaXRpYWxpc2VJbnRlcm5hbFZhbHVlID0gZnVuY3Rpb24oc3RvcmVkVmFsdWVzKXtcbiAgICAgICAgaWYoIXN0b3JlZFZhbHVlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY3NldCA9IHN0b3JlZFZhbHVlcy5jc2V0O1xuICAgICAgICB3cml0ZVNldFZlcnNpb25zID0gc3RvcmVkVmFsdWVzLndyaXRlU2V0VmVyc2lvbnM7XG4gICAgICAgIHZzZCA9IHN0b3JlZFZhbHVlcy52c2Q7XG4gICAgICAgIHdyaXRlU2V0ID0gY3NldDtcbiAgICAgICAgbXlDdXJyZW50UHVsc2UgPSBzdG9yZWRWYWx1ZXMuY3VycmVudFB1bHNlO1xuICAgICAgICBwcmV2aW91c1ZTRCA9IHN0b3JlZFZhbHVlcy5wcmV2aW91c1ZTRDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gYXBwbHlUcmFuc2FjdGlvbih0KXtcbiAgICAgICAgZm9yKGxldCBrIGluIHQub3V0cHV0KXsgXG4gICAgICAgICAgICBpZighdC5pbnB1dC5oYXNPd25Qcm9wZXJ0eShrKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvcihsZXQgbCBpbiB0LmlucHV0KXtcbiAgICAgICAgICAgIHZhciB0cmFuc2FjdGlvblZlcnNpb24gPSB0LmlucHV0W2xdO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRWZXJzaW9uID0gc2VsZi5nZXRWZXJzaW9uKGwpO1xuICAgICAgICAgICAgaWYodHJhbnNhY3Rpb25WZXJzaW9uICE9PSBjdXJyZW50VmVyc2lvbil7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhsLCB0cmFuc2FjdGlvblZlcnNpb24gLCBjdXJyZW50VmVyc2lvbik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yKGxldCB2IGluIHQub3V0cHV0KXtcbiAgICAgICAgICAgIHNlbGYud3JpdGVLZXkodiwgdC5vdXRwdXRbdl0pO1xuICAgICAgICB9XG5cblx0XHR2YXIgYXJyID0gcHJvY2Vzcy5ocnRpbWUoKTtcblx0XHR2YXIgY3VycmVudF9zZWNvbmQgPSBhcnJbMF07XG5cdFx0dmFyIGRpZmYgPSBjdXJyZW50X3NlY29uZC10LnNlY29uZDtcblxuXHRcdGdsb2JhbFtcIlRyYW56YWN0aW9uc19UaW1lXCJdKz1kaWZmO1xuXG5cdFx0cmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5jb21wdXRlUFRCbG9jayA9IGZ1bmN0aW9uKG5leHRCbG9ja1NldCl7ICAgLy9tYWtlIGEgdHJhbnNhY3Rpb25zIGJsb2NrIGZyb20gbmV4dEJsb2NrU2V0IGJ5IHJlbW92aW5nIGludmFsaWQgdHJhbnNhY3Rpb25zIGZyb20gdGhlIGtleSB2ZXJzaW9ucyBwb2ludCBvZiB2aWV3XG4gICAgICAgIHZhciB2YWxpZEJsb2NrID0gW107XG4gICAgICAgIHZhciBvcmRlcmVkQnlUaW1lID0gY3V0aWwub3JkZXJUcmFuc2FjdGlvbnMobmV4dEJsb2NrU2V0KTtcbiAgICAgICAgdmFyIGkgPSAwO1xuXG4gICAgICAgIHdoaWxlKGkgPCBvcmRlcmVkQnlUaW1lLmxlbmd0aCl7XG4gICAgICAgICAgICB2YXIgdCA9IG9yZGVyZWRCeVRpbWVbaV07XG4gICAgICAgICAgICBpZihhcHBseVRyYW5zYWN0aW9uKHQpKXtcbiAgICAgICAgICAgICAgICB2YWxpZEJsb2NrLnB1c2godC5kaWdlc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWxpZEJsb2NrO1xuICAgIH07XG5cbiAgICB0aGlzLmNvbW1pdCA9IGZ1bmN0aW9uKGJsb2NrU2V0KXtcbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB2YXIgb3JkZXJlZEJ5VGltZSA9IGN1dGlsLm9yZGVyVHJhbnNhY3Rpb25zKGJsb2NrU2V0KTtcblxuICAgICAgICB3aGlsZShpIDwgb3JkZXJlZEJ5VGltZS5sZW5ndGgpe1xuICAgICAgICAgICAgdmFyIHQgPSBvcmRlcmVkQnlUaW1lW2ldO1xuICAgICAgICAgICAgaWYoIWFwcGx5VHJhbnNhY3Rpb24odCkpeyAvL3BhcmFub2lkIGNoZWNrLCAgZmFpbCB0byB3b3JrIGlmIGEgbWFqb3JpdHkgaXMgY29ycnVwdGVkXG4gICAgICAgICAgICAgICAgLy9wcmV0dHkgYmFkXG4gICAgICAgICAgICAgICAgLy90aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY29tbWl0IGFuIGludmFsaWQgYmxvY2suIFRoaXMgY291bGQgYmUgYSBuYXN0eSBidWcgb3IgdGhlIHN0YWtlaG9sZGVycyBtYWpvcml0eSBpcyBjb3JydXB0ZWQhIEl0IHNob3VsZCBuZXZlciBoYXBwZW4hXCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRmFpbGVkIHRvIGNvbW1pdCBhbiBpbnZhbGlkIGJsb2NrLiBUaGlzIGNvdWxkIGJlIGEgbmFzdHkgYnVnIG9yIHRoZSBzdGFrZWhvbGRlcnMgbWFqb3JpdHkgaXMgY29ycnVwdGVkISBJdCBzaG91bGQgbmV2ZXIgaGFwcGVuIVwiKTsgLy9UT0RPOiByZXBsYWNlIHdpdGggYmV0dGVyIGVycm9yIGhhbmRsaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5nZXRWU0QodHJ1ZSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VlNEID0gZnVuY3Rpb24oZm9yY2VDYWxjdWxhdGlvbil7XG4gICAgICAgIGlmKGZvcmNlQ2FsY3VsYXRpb24pe1xuICAgICAgICAgICAgdmFyIHRtcCA9IHRoaXMuZ2V0SW50ZXJuYWxWYWx1ZXMobXlDdXJyZW50UHVsc2UsIHRydWUpO1xuICAgICAgICAgICAgdnNkID0gc3N1dGlsLmhhc2hWYWx1ZXModG1wKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdnNkO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIEluTWVtb3J5UERTKHBlcm1hbmVudFBlcnNpc3RlbmNlKXtcblxuICAgIHZhciBtYWluU3RvcmFnZSA9IG5ldyBTdG9yYWdlKG51bGwpO1xuXG5cbiAgICB0aGlzLmdldEhhbmRsZXIgPSBmdW5jdGlvbigpeyAvLyBhIHdheSB0byB3b3JrIHdpdGggUERTXG4gICAgICAgIHZhciB0ZW1wU3RvcmFnZSA9IG5ldyBTdG9yYWdlKG1haW5TdG9yYWdlKTtcbiAgICAgICAgcmV0dXJuIHRlbXBTdG9yYWdlO1xuICAgIH07XG5cbiAgICB0aGlzLmNvbXB1dGVTd2FybVRyYW5zYWN0aW9uRGlmZiA9IGZ1bmN0aW9uKHN3YXJtLCBmb3JrZWRQZHMpe1xuICAgICAgICB2YXIgaW5wT3V0cCAgICAgPSBmb3JrZWRQZHMuZ2V0SW5wdXRPdXRwdXQoKTtcbiAgICAgICAgc3dhcm0uaW5wdXQgICAgID0gaW5wT3V0cC5pbnB1dDtcbiAgICAgICAgc3dhcm0ub3V0cHV0ICAgID0gaW5wT3V0cC5vdXRwdXQ7XG4gICAgICAgIHJldHVybiBzd2FybTtcbiAgICB9O1xuXG4gICAgdGhpcy5jb21wdXRlUFRCbG9jayA9IGZ1bmN0aW9uKG5leHRCbG9ja1NldCl7XG4gICAgICAgIHZhciB0ZW1wU3RvcmFnZSA9IG5ldyBTdG9yYWdlKG1haW5TdG9yYWdlKTtcbiAgICAgICAgcmV0dXJuIHRlbXBTdG9yYWdlLmNvbXB1dGVQVEJsb2NrKG5leHRCbG9ja1NldCk7XG5cbiAgICB9O1xuXG4gICAgdGhpcy5jb21taXQgPSBmdW5jdGlvbihibG9ja1NldCwgY3VycmVudFB1bHNlKXtcbiAgICAgICAgbWFpblN0b3JhZ2UuY29tbWl0KGJsb2NrU2V0KTtcbiAgICAgICAgaWYocGVybWFuZW50UGVyc2lzdGVuY2UpIHtcbiAgICAgICAgICAgIHBlcm1hbmVudFBlcnNpc3RlbmNlLnBlcnNpc3QoYmxvY2tTZXQsIG1haW5TdG9yYWdlLmdldEludGVybmFsVmFsdWVzKGN1cnJlbnRQdWxzZSwgZmFsc2UpLCBjdXJyZW50UHVsc2UpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VlNEID0gZnVuY3Rpb24gKCl7XG4gICAgICAgIHJldHVybiBtYWluU3RvcmFnZS5nZXRWU0QoZmFsc2UpO1xuICAgIH07XG5cbiAgICB0aGlzLmluaXRpYWxpc2UgPSBmdW5jdGlvbihzYXZlZEludGVybmFsVmFsdWVzKXtcbiAgICAgICAgbWFpblN0b3JhZ2UuaW5pdGlhbGlzZUludGVybmFsVmFsdWUoc2F2ZWRJbnRlcm5hbFZhbHVlcyk7XG4gICAgfTtcblxufVxuXG5cbmV4cG9ydHMubmV3UERTID0gZnVuY3Rpb24ocGVyc2lzdGVuY2Upe1xuICAgIHJldHVybiBuZXcgSW5NZW1vcnlQRFMocGVyc2lzdGVuY2UpO1xufTsiLCJjb25zdCBtZW1vcnlQRFMgPSByZXF1aXJlKFwiLi9Jbk1lbW9yeVBEU1wiKTtcblxuZnVuY3Rpb24gUGVyc2lzdGVudFBEUyh7Z2V0SW5pdFZhbHVlcywgcGVyc2lzdH0pIHtcblx0dGhpcy5tZW1DYWNoZSA9IG1lbW9yeVBEUy5uZXdQRFModGhpcyk7XG5cdHRoaXMucGVyc2lzdCA9IHBlcnNpc3Q7XG5cblx0Y29uc3QgaW5uZXJWYWx1ZXMgPSBnZXRJbml0VmFsdWVzKCkgfHwgbnVsbDtcblx0dGhpcy5tZW1DYWNoZS5pbml0aWFsaXNlKGlubmVyVmFsdWVzKTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cy5uZXdQRFMgPSBmdW5jdGlvbiAocmVhZGVyV3JpdGVyKSB7XG5cdGNvbnN0IHBkcyA9IG5ldyBQZXJzaXN0ZW50UERTKHJlYWRlcldyaXRlcik7XG5cdHJldHVybiBwZHMubWVtQ2FjaGU7XG59O1xuIiwiXG4kJC5hc3NldC5kZXNjcmliZShcIkFDTFNjb3BlXCIsIHtcbiAgICBwdWJsaWM6e1xuICAgICAgICBjb25jZXJuOlwic3RyaW5nOmtleVwiLFxuICAgICAgICBkYjpcImpzb25cIlxuICAgIH0sXG4gICAgaW5pdDpmdW5jdGlvbihjb25jZXJuKXtcbiAgICAgICAgdGhpcy5jb25jZXJuID0gY29uY2VybjtcbiAgICB9LFxuICAgIGFkZFJlc291cmNlUGFyZW50IDogZnVuY3Rpb24ocmVzb3VyY2VJZCwgcGFyZW50SWQpe1xuICAgICAgICAvL1RPRE86IGVtcHR5IGZ1bmN0aW9ucyFcbiAgICB9LFxuICAgIGFkZFpvbmVQYXJlbnQgOiBmdW5jdGlvbih6b25lSWQsIHBhcmVudElkKXtcbiAgICAgICAgLy9UT0RPOiBlbXB0eSBmdW5jdGlvbnMhXG4gICAgfSxcbiAgICBncmFudCA6ZnVuY3Rpb24oYWdlbnRJZCwgIHJlc291cmNlSWQpe1xuICAgICAgICAvL1RPRE86IGVtcHR5IGZ1bmN0aW9ucyFcbiAgICB9LFxuICAgIGFsbG93IDpmdW5jdGlvbihhZ2VudElkLCAgcmVzb3VyY2VJZCl7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn0pOyIsIlxuJCQuYXNzZXQuZGVzY3JpYmUoXCJBZ2VudFwiLCB7XG4gICAgcHVibGljOntcbiAgICAgICAgYWxpYXM6XCJzdHJpbmc6a2V5XCIsXG4gICAgICAgIHB1YmxpY0tleTpcInN0cmluZ1wiXG4gICAgfSxcbiAgICBpbml0OmZ1bmN0aW9uKGFsaWFzLCB2YWx1ZSl7XG4gICAgICAgIHRoaXMuYWxpYXMgICAgICA9IGFsaWFzO1xuICAgICAgICB0aGlzLnB1YmxpY0tleSAgPSB2YWx1ZTtcbiAgICB9LFxuICAgIHVwZGF0ZTpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHRoaXMucHVibGljS2V5ID0gdmFsdWU7XG4gICAgfSxcbiAgICBhZGRBZ2VudDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBJbXBsZW1lbnRlZCcpO1xuICAgIH0sXG4gICAgbGlzdEFnZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IEltcGxlbWVudGVkJyk7XG5cbiAgICB9LFxuICAgIHJlbW92ZUFnZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IEltcGxlbWVudGVkJyk7XG5cbiAgICB9XG59KTsiLCJcbiQkLmFzc2V0LmRlc2NyaWJlKFwiQmFja3VwXCIsIHtcbiAgICBwdWJsaWM6e1xuICAgICAgICBpZDogIFwic3RyaW5nXCIsXG4gICAgICAgIHVybDogXCJzdHJpbmdcIlxuICAgIH0sXG5cbiAgICBpbml0OmZ1bmN0aW9uKGlkLCB1cmwpe1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMudXJsID0gdXJsO1xuICAgIH1cbn0pO1xuIiwiXG4kJC5hc3NldC5kZXNjcmliZShcIkNTQk1ldGFcIiwge1xuXHRwdWJsaWM6e1xuXHRcdGlzTWFzdGVyOlwic3RyaW5nXCIsXG5cdFx0YWxpYXM6XCJzdHJpbmc6a2V5XCIsXG5cdFx0ZGVzY3JpcHRpb246IFwic3RyaW5nXCIsXG5cdFx0Y3JlYXRpb25EYXRlOiBcInN0cmluZ1wiLFxuXHRcdHVwZGF0ZWREYXRlIDogXCJzdHJpbmdcIixcblx0XHRpZDogXCJzdHJpbmdcIixcblx0XHRpY29uOiBcInN0cmluZ1wiXG5cdH0sXG5cdGluaXQ6ZnVuY3Rpb24oaWQpe1xuXHRcdHRoaXMuYWxpYXMgPSBcIm1ldGFcIjtcblx0XHR0aGlzLmlkID0gaWQ7XG5cdH0sXG5cblx0c2V0SXNNYXN0ZXI6IGZ1bmN0aW9uIChpc01hc3Rlcikge1xuXHRcdHRoaXMuaXNNYXN0ZXIgPSBpc01hc3Rlcjtcblx0fVxuXG59KTtcbiIsIlxuJCQuYXNzZXQuZGVzY3JpYmUoXCJDU0JSZWZlcmVuY2VcIiwge1xuICAgIHB1YmxpYzp7XG4gICAgICAgIGFsaWFzOlwic3RyaW5nOmtleVwiLFxuICAgICAgICBzZWVkIDpcInN0cmluZ1wiLFxuICAgICAgICBkc2VlZDpcInN0cmluZ1wiXG4gICAgfSxcbiAgICBpbml0OmZ1bmN0aW9uKGFsaWFzLCBzZWVkLCBkc2VlZCApe1xuICAgICAgICB0aGlzLmFsaWFzID0gYWxpYXM7XG4gICAgICAgIHRoaXMuc2VlZCAgPSBzZWVkO1xuICAgICAgICB0aGlzLmRzZWVkID0gZHNlZWQ7XG4gICAgfSxcbiAgICB1cGRhdGU6ZnVuY3Rpb24oZmluZ2VycHJpbnQpe1xuICAgICAgICB0aGlzLmZpbmdlcnByaW50ID0gZmluZ2VycHJpbnQ7XG4gICAgICAgIHRoaXMudmVyc2lvbisrO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJCYWNrdXBVcmw6ZnVuY3Rpb24oYmFja3VwVXJsKXtcbiAgICAgICAgdGhpcy5iYWNrdXBzLmFkZChiYWNrdXBVcmwpO1xuICAgIH1cbn0pO1xuIiwiXG4kJC5hc3NldC5kZXNjcmliZShcIkRvbWFpblJlZmVyZW5jZVwiLCB7XG4gICAgcHVibGljOntcbiAgICAgICAgcm9sZTpcInN0cmluZzppbmRleFwiLFxuICAgICAgICBhbGlhczpcInN0cmluZzprZXlcIixcbiAgICAgICAgYWRkcmVzc2VzOlwibWFwXCIsXG4gICAgICAgIGNvbnN0aXR1dGlvbjpcInN0cmluZ1wiLFxuICAgICAgICB3b3Jrc3BhY2U6XCJzdHJpbmdcIixcbiAgICAgICAgcmVtb3RlSW50ZXJmYWNlczpcIm1hcFwiLFxuICAgICAgICBsb2NhbEludGVyZmFjZXM6XCJtYXBcIlxuICAgIH0sXG4gICAgaW5pdDpmdW5jdGlvbihyb2xlLCBhbGlhcyl7XG4gICAgICAgIHRoaXMucm9sZSA9IHJvbGU7XG4gICAgICAgIHRoaXMuYWxpYXMgPSBhbGlhcztcbiAgICAgICAgdGhpcy5hZGRyZXNzZXMgPSB7fTtcbiAgICAgICAgdGhpcy5yZW1vdGVJbnRlcmZhY2VzID0ge307XG4gICAgICAgIHRoaXMubG9jYWxJbnRlcmZhY2VzID0ge307XG4gICAgfSxcbiAgICB1cGRhdGVEb21haW5BZGRyZXNzOmZ1bmN0aW9uKHJlcGxpY2F0aW9uQWdlbnQsIGFkZHJlc3Mpe1xuICAgICAgICBpZighdGhpcy5hZGRyZXNzZXMpe1xuICAgICAgICAgICAgdGhpcy5hZGRyZXNzZXMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFkZHJlc3Nlc1tyZXBsaWNhdGlvbkFnZW50XSA9IGFkZHJlc3M7XG4gICAgfSxcbiAgICByZW1vdmVEb21haW5BZGRyZXNzOmZ1bmN0aW9uKHJlcGxpY2F0aW9uQWdlbnQpe1xuICAgICAgICB0aGlzLmFkZHJlc3Nlc1tyZXBsaWNhdGlvbkFnZW50XSA9IHVuZGVmaW5lZDtcbiAgICAgICAgZGVsZXRlIHRoaXMuYWRkcmVzc2VzW3JlcGxpY2F0aW9uQWdlbnRdO1xuICAgIH0sXG4gICAgYWRkUmVtb3RlSW50ZXJmYWNlOmZ1bmN0aW9uKGFsaWFzLCByZW1vdGVFbmRQb2ludCl7XG4gICAgICAgIGlmKCF0aGlzLnJlbW90ZUludGVyZmFjZXMpe1xuICAgICAgICAgICAgdGhpcy5yZW1vdGVJbnRlcmZhY2VzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZW1vdGVJbnRlcmZhY2VzW2FsaWFzXSA9IHJlbW90ZUVuZFBvaW50O1xuICAgIH0sXG4gICAgcmVtb3ZlUmVtb3RlSW50ZXJmYWNlOmZ1bmN0aW9uKGFsaWFzKXtcbiAgICAgICAgaWYodGhpcy5yZW1vdGVJbnRlcmZhY2Upe1xuICAgICAgICAgICAgdGhpcy5yZW1vdGVJbnRlcmZhY2VzW2FsaWFzXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnJlbW90ZUludGVyZmFjZXNbYWxpYXNdO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBhZGRMb2NhbEludGVyZmFjZTpmdW5jdGlvbihhbGlhcywgcGF0aCl7XG4gICAgICAgIGlmKCF0aGlzLmxvY2FsSW50ZXJmYWNlcyl7XG4gICAgICAgICAgICB0aGlzLmxvY2FsSW50ZXJmYWNlcyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubG9jYWxJbnRlcmZhY2VzW2FsaWFzXSA9IHBhdGg7XG4gICAgfSxcbiAgICByZW1vdmVMb2NhbEludGVyZmFjZTpmdW5jdGlvbihhbGlhcyl7XG4gICAgICAgIGlmKHRoaXMubG9jYWxJbnRlcmZhY2VzKXtcbiAgICAgICAgICAgIHRoaXMubG9jYWxJbnRlcmZhY2VzW2FsaWFzXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmxvY2FsSW50ZXJmYWNlc1thbGlhc107XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHNldENvbnN0aXR1dGlvbjpmdW5jdGlvbihwYXRoT3JVcmxPckNTQil7XG4gICAgICAgIHRoaXMuY29uc3RpdHV0aW9uID0gcGF0aE9yVXJsT3JDU0I7XG4gICAgfSxcbiAgICBnZXRDb25zdGl0dXRpb246ZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RpdHV0aW9uO1xuICAgIH0sXG4gICAgc2V0V29ya3NwYWNlOmZ1bmN0aW9uKHBhdGgpe1xuICAgICAgICB0aGlzLndvcmtzcGFjZSA9IHBhdGg7XG4gICAgfSxcbiAgICBnZXRXb3Jrc3BhY2U6ZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHRoaXMud29ya3NwYWNlO1xuICAgIH1cbn0pOyIsIiQkLmFzc2V0LmRlc2NyaWJlKFwiRW1iZWRkZWRGaWxlXCIsIHtcblx0cHVibGljOntcblx0XHRhbGlhczpcInN0cmluZ1wiXG5cdH0sXG5cblx0aW5pdDpmdW5jdGlvbihhbGlhcyl7XG5cdFx0dGhpcy5hbGlhcyA9IGFsaWFzO1xuXHR9XG59KTsiLCIkJC5hc3NldC5kZXNjcmliZShcIkZpbGVSZWZlcmVuY2VcIiwge1xuXHRwdWJsaWM6e1xuXHRcdGFsaWFzOlwic3RyaW5nXCIsXG5cdFx0c2VlZCA6XCJzdHJpbmdcIixcblx0XHRkc2VlZDpcInN0cmluZ1wiXG5cdH0sXG5cdGluaXQ6ZnVuY3Rpb24oYWxpYXMsIHNlZWQsIGRzZWVkKXtcblx0XHR0aGlzLmFsaWFzID0gYWxpYXM7XG5cdFx0dGhpcy5zZWVkICA9IHNlZWQ7XG5cdFx0dGhpcy5kc2VlZCA9IGRzZWVkO1xuXHR9XG59KTsiLCJcbiQkLmFzc2V0LmRlc2NyaWJlKFwia2V5XCIsIHtcbiAgICBwdWJsaWM6e1xuICAgICAgICBhbGlhczpcInN0cmluZ1wiXG4gICAgfSxcbiAgICBpbml0OmZ1bmN0aW9uKGFsaWFzLCB2YWx1ZSl7XG4gICAgICAgIHRoaXMuYWxpYXMgPSBhbGlhcztcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgIH0sXG4gICAgdXBkYXRlOmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgIH1cbn0pOyIsIm1vZHVsZS5leHBvcnRzID0gJCQubGlicmFyeShmdW5jdGlvbigpe1xuICAgIHJlcXVpcmUoXCIuL0RvbWFpblJlZmVyZW5jZVwiKTtcbiAgICByZXF1aXJlKFwiLi9DU0JSZWZlcmVuY2VcIik7XG4gICAgcmVxdWlyZShcIi4vQWdlbnRcIik7XG4gICAgcmVxdWlyZShcIi4vQmFja3VwXCIpO1xuICAgIHJlcXVpcmUoXCIuL0FDTFNjb3BlXCIpO1xuICAgIHJlcXVpcmUoXCIuL0tleVwiKTtcbiAgICByZXF1aXJlKFwiLi90cmFuc2FjdGlvbnNcIik7XG4gICAgcmVxdWlyZShcIi4vRmlsZVJlZmVyZW5jZVwiKTtcbiAgICByZXF1aXJlKFwiLi9FbWJlZGRlZEZpbGVcIik7XG4gICAgcmVxdWlyZSgnLi9DU0JNZXRhJyk7XG59KTsiLCIkJC50cmFuc2FjdGlvbi5kZXNjcmliZShcInRyYW5zYWN0aW9uc1wiLCB7XG4gICAgdXBkYXRlS2V5OiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICB2YXIgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24odGhpcyk7XG4gICAgICAgIHZhciBrZXkgPSB0cmFuc2FjdGlvbi5sb29rdXAoXCJLZXlcIiwga2V5KTtcbiAgICAgICAgdmFyIGtleVBlcm1pc3Npb25zID0gdHJhbnNhY3Rpb24ubG9va3VwKFwiQUNMU2NvcGVcIiwgXCJLZXlzQ29uY2VyblwiKTtcbiAgICAgICAgaWYgKGtleVBlcm1pc3Npb25zLmFsbG93KHRoaXMuYWdlbnRJZCwga2V5KSkge1xuICAgICAgICAgICAga2V5LnVwZGF0ZSh2YWx1ZSk7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5hZGQoa2V5KTtcbiAgICAgICAgICAgICQkLmJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2VjdXJpdHlFcnJvcihcIkFnZW50IFwiICsgdGhpcy5hZ2VudElkICsgXCIgZGVuaWVkIHRvIGNoYW5nZSBrZXkgXCIgKyBrZXkpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBhZGRDaGlsZDogZnVuY3Rpb24gKGFsaWFzKSB7XG4gICAgICAgIHZhciB0cmFuc2FjdGlvbiA9ICQkLmJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbigpO1xuICAgICAgICB2YXIgcmVmZXJlbmNlID0gJCQuY29udHJhY3Quc3RhcnQoXCJEb21haW5SZWZlcmVuY2VcIiwgXCJpbml0XCIsIFwiY2hpbGRcIiwgYWxpYXMpO1xuICAgICAgICB0cmFuc2FjdGlvbi5hZGQocmVmZXJlbmNlKTtcbiAgICAgICAgJCQuYmxvY2tjaGFpbi5jb21taXQodHJhbnNhY3Rpb24pO1xuICAgIH0sXG4gICAgYWRkUGFyZW50OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHJlZmVyZW5jZSA9ICQkLmNvbnRyYWN0LnN0YXJ0KFwiRG9tYWluUmVmZXJlbmNlXCIsIFwiaW5pdFwiLCBcImNoaWxkXCIsIGFsaWFzKTtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbi5zYXZlKHJlZmVyZW5jZSk7XG4gICAgICAgICQkLmJsb2NrY2hhaW4ucGVyc2lzdCh0aGlzLnRyYW5zYWN0aW9uKTtcbiAgICB9LFxuICAgIGFkZEFnZW50OiBmdW5jdGlvbiAoYWxpYXMsIHB1YmxpY0tleSkge1xuICAgICAgICB2YXIgcmVmZXJlbmNlID0gJCQuY29udHJhY3Quc3RhcnQoXCJBZ2VudFwiLCBcImluaXRcIiwgYWxpYXMsIHB1YmxpY0tleSk7XG4gICAgICAgIHRoaXMudHJhbnNhY3Rpb24uc2F2ZShyZWZlcmVuY2UpO1xuICAgICAgICAkJC5ibG9ja2NoYWluLnBlcnNpc3QodGhpcy50cmFuc2FjdGlvbik7XG4gICAgfSxcbiAgICB1cGRhdGVBZ2VudDogZnVuY3Rpb24gKGFsaWFzLCBwdWJsaWNLZXkpIHtcbiAgICAgICAgdmFyIGFnZW50ID0gdGhpcy50cmFuc2FjdGlvbi5sb29rdXAoXCJBZ2VudFwiLCBhbGlhcyk7XG4gICAgICAgIGFnZW50LnVwZGF0ZShwdWJsaWNLZXkpO1xuICAgICAgICB0aGlzLnRyYW5zYWN0aW9uLnNhdmUocmVmZXJlbmNlKTtcbiAgICAgICAgJCQuYmxvY2tjaGFpbi5wZXJzaXN0KHRoaXMudHJhbnNhY3Rpb24pO1xuICAgIH1cbn0pO1xuXG5cbiQkLm5ld1RyYW5zYWN0aW9uID0gZnVuY3Rpb24odHJhbnNhY3Rpb25GbG93LGN0b3IsLi4uYXJncyl7XG4gICAgdmFyIHRyYW5zYWN0aW9uID0gJCQuc3dhcm0uc3RhcnQoIHRyYW5zYWN0aW9uRmxvdyk7XG4gICAgdHJhbnNhY3Rpb24ubWV0YShcImFnZW50SWRcIiwgJCQuY3VycmVudEFnZW50SWQpO1xuICAgIHRyYW5zYWN0aW9uLm1ldGEoXCJjb21tYW5kXCIsIFwicnVuRXZlcnlXaGVyZVwiKTtcbiAgICB0cmFuc2FjdGlvbi5tZXRhKFwiY3RvclwiLCBjdG9yKTtcbiAgICB0cmFuc2FjdGlvbi5tZXRhKFwiYXJnc1wiLCBhcmdzKTtcbiAgICB0cmFuc2FjdGlvbi5zaWduKCk7XG4gICAgLy8kJC5ibG9ja2NoYWluLnNlbmRGb3JDb25zZW50KHRyYW5zYWN0aW9uKTtcbiAgICAvL3RlbXBvcmFyeSB1bnRpbCBjb25zZW50IGxheWVyIGlzIGFjdGl2YXRlZFxuICAgIHRyYW5zYWN0aW9uW2N0b3JdLmFwcGx5KHRyYW5zYWN0aW9uLGFyZ3MpO1xufTtcblxuLypcbnVzYWdlczpcbiAgICAkJC5uZXdUcmFuc2FjdGlvbihcImRvbWFpbi50cmFuc2FjdGlvbnNcIiwgXCJ1cGRhdGVLZXlcIiwgXCJrZXlcIiwgXCJ2YWx1ZVwiKVxuXG4gKi9cbiIsIi8vIGNvbnN0IHNoYXJlZFBoYXNlcyA9IHJlcXVpcmUoJy4vc2hhcmVkUGhhc2VzJyk7XG4vLyBjb25zdCBiZWVzSGVhbGVyID0gcmVxdWlyZSgnc3dhcm11dGlscycpLmJlZXNIZWFsZXI7XG5cbiQkLnN3YXJtcy5kZXNjcmliZShcImFnZW50c1wiLCB7XG4gICAgYWRkOiBmdW5jdGlvbiAoYWxpYXMsIHB1YmxpY0tleSkge1xuICAgICAgICBjb25zdCB0cmFuc2FjdGlvbiA9ICQkLmJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG4gICAgICAgIGNvbnN0IGFnZW50QXNzZXQgPSB0cmFuc2FjdGlvbi5sb29rdXAoJ2dsb2JhbC5BZ2VudCcsIGFsaWFzKTtcblxuICAgICAgICBhZ2VudEFzc2V0LmluaXQoYWxpYXMsIHB1YmxpY0tleSk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5hZGQoYWdlbnRBc3NldCk7XG5cbiAgICAgICAgICAgICQkLmJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLnJldHVybihuZXcgRXJyb3IoXCJBZ2VudCBhbHJlYWR5IGV4aXN0c1wiKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJldHVybihudWxsLCBhbGlhcyk7XG4gICAgfSxcbn0pO1xuIiwiY29uc3Qgc2hhcmVkUGhhc2VzID0gcmVxdWlyZSgnLi9zaGFyZWRQaGFzZXMnKTtcbmNvbnN0IGJlZXNIZWFsZXIgPSByZXF1aXJlKCdzd2FybXV0aWxzJykuYmVlc0hlYWxlcjtcblxuJCQuc3dhcm1zLmRlc2NyaWJlKFwiZG9tYWluc1wiLCB7XG4gICAgYWRkOiBmdW5jdGlvbiAocm9sZSwgYWxpYXMpIHtcbiAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuICAgICAgICBjb25zdCBkb21haW5zU3dhcm0gPSB0cmFuc2FjdGlvbi5sb29rdXAoJ2dsb2JhbC5Eb21haW5SZWZlcmVuY2UnLCBhbGlhcyk7XG5cbiAgICAgICAgaWYgKCFkb21haW5zU3dhcm0pIHtcbiAgICAgICAgICAgIHRoaXMucmV0dXJuKG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgc3dhcm0gbmFtZWQgXCJnbG9iYWwuRG9tYWluUmVmZXJlbmNlXCInKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBkb21haW5zU3dhcm0uaW5pdChyb2xlLCBhbGlhcyk7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uLmFkZChkb21haW5zU3dhcm0pO1xuXG4gICAgICAgICAgICAkJC5ibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG4gICAgICAgIH1jYXRjaChlcnIpe1xuICAgICAgICAgICAgdGhpcy5yZXR1cm4obmV3IEVycm9yKFwiRG9tYWluIGFsbHJlYWR5IGV4aXN0cyFcIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXR1cm4obnVsbCwgYWxpYXMpO1xuICAgIH0sXG4gICAgZ2V0RG9tYWluRGV0YWlsczpmdW5jdGlvbihhbGlhcyl7XG4gICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gJCQuYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcbiAgICAgICAgY29uc3QgZG9tYWluID0gdHJhbnNhY3Rpb24ubG9va3VwKCdnbG9iYWwuRG9tYWluUmVmZXJlbmNlJywgYWxpYXMpO1xuXG4gICAgICAgIGlmICghZG9tYWluKSB7XG4gICAgICAgICAgICB0aGlzLnJldHVybihuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIHN3YXJtIG5hbWVkIFwiZ2xvYmFsLkRvbWFpblJlZmVyZW5jZVwiJykpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXR1cm4obnVsbCwgYmVlc0hlYWxlci5hc0pTT04oZG9tYWluKS5wdWJsaWNWYXJzKTtcbiAgICB9LFxuICAgIGNvbm5lY3REb21haW5Ub1JlbW90ZShkb21haW5OYW1lLCBhbGlhcywgcmVtb3RlRW5kUG9pbnQpe1xuICAgICAgICBjb25zdCB0cmFuc2FjdGlvbiA9ICQkLmJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG4gICAgICAgIGNvbnN0IGRvbWFpbiA9IHRyYW5zYWN0aW9uLmxvb2t1cCgnZ2xvYmFsLkRvbWFpblJlZmVyZW5jZScsIGRvbWFpbk5hbWUpO1xuXG4gICAgICAgIGlmICghZG9tYWluKSB7XG4gICAgICAgICAgICB0aGlzLnJldHVybihuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIHN3YXJtIG5hbWVkIFwiZ2xvYmFsLkRvbWFpblJlZmVyZW5jZVwiJykpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZG9tYWluLmFkZFJlbW90ZUludGVyZmFjZShhbGlhcywgcmVtb3RlRW5kUG9pbnQpO1xuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uLmFkZChkb21haW4pO1xuXG4gICAgICAgICAgICAkJC5ibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG4gICAgICAgIH1jYXRjaChlcnIpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIHRoaXMucmV0dXJuKG5ldyBFcnJvcihcIkRvbWFpbiB1cGRhdGUgZmFpbGVkIVwiKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJldHVybihudWxsLCBhbGlhcyk7XG4gICAgfSxcbiAgICAvLyBnZXREb21haW5EZXRhaWxzOiBzaGFyZWRQaGFzZXMuZ2V0QXNzZXRGYWN0b3J5KCdnbG9iYWwuRG9tYWluUmVmZXJlbmNlJyksXG4gICAgZ2V0RG9tYWluczogc2hhcmVkUGhhc2VzLmdldEFsbEFzc2V0c0ZhY3RvcnkoJ2dsb2JhbC5Eb21haW5SZWZlcmVuY2UnKVxufSk7XG4iLCJyZXF1aXJlKCcuL2RvbWFpblN3YXJtcycpO1xucmVxdWlyZSgnLi9hZ2VudHNTd2FybScpOyIsImNvbnN0IGJlZXNIZWFsZXIgPSByZXF1aXJlKFwic3dhcm11dGlsc1wiKS5iZWVzSGVhbGVyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnZXRBc3NldEZhY3Rvcnk6IGZ1bmN0aW9uKGFzc2V0VHlwZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oYWxpYXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gJCQuYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcbiAgICAgICAgICAgIGNvbnN0IGRvbWFpblJlZmVyZW5jZVN3YXJtID0gdHJhbnNhY3Rpb24ubG9va3VwKGFzc2V0VHlwZSwgYWxpYXMpO1xuXG4gICAgICAgICAgICBpZighZG9tYWluUmVmZXJlbmNlU3dhcm0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJldHVybihuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIHN3YXJtIG5hbWVkIFwiJHthc3NldFR5cGV9XCJgKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnJldHVybih1bmRlZmluZWQsIGJlZXNIZWFsZXIuYXNKU09OKGRvbWFpblJlZmVyZW5jZVN3YXJtKSk7XG4gICAgICAgIH07XG4gICAgfSxcbiAgICBnZXRBbGxBc3NldHNGYWN0b3J5OiBmdW5jdGlvbihhc3NldFR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuICAgICAgICAgICAgY29uc3QgZG9tYWlucyA9IHRyYW5zYWN0aW9uLmxvYWRBc3NldHMoYXNzZXRUeXBlKSB8fCBbXTtcblxuICAgICAgICAgICAgdGhpcy5yZXR1cm4odW5kZWZpbmVkLCBkb21haW5zLm1hcCgoZG9tYWluKSA9PiBiZWVzSGVhbGVyLmFzSlNPTihkb21haW4pKSk7XG4gICAgICAgIH07XG4gICAgfVxufTsiLCJjb25zdCBBc3luY0Rpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vdXRpbHMvQXN5bmNEaXNwYXRjaGVyXCIpO1xuY29uc3QgRVZGU1Jlc29sdmVyID0gcmVxdWlyZShcIi4vYmFja3VwUmVzb2x2ZXJzL0VWRlNSZXNvbHZlclwiKTtcbi8vIGNvbnN0IGNyeXB0byA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5cbmZ1bmN0aW9uIEJhY2t1cEVuZ2luZUJ1aWxkZXIoKSB7XG4gICAgY29uc3QgcmVzb2x2ZXJzID0ge307XG4gICAgdGhpcy5hZGRSZXNvbHZlciA9IGZ1bmN0aW9uIChuYW1lLCByZXNvbHZlcikge1xuICAgICAgICByZXNvbHZlcnNbbmFtZV0gPSByZXNvbHZlcjtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRCYWNrdXBFbmdpbmUgPSBmdW5jdGlvbih1cmxzKSB7XG4gICAgICAgIGlmICghdXJscyB8fCB1cmxzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gdXJsIHdhcyBwcm92aWRlZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgQmFja3VwRW5naW5lKHVybHMsIHJlc29sdmVycyk7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gQmFja3VwRW5naW5lKHVybHMsIHJlc29sdmVycykge1xuXG4gICAgdGhpcy5zYXZlID0gZnVuY3Rpb24gKGNzYklkZW50aWZpZXIsIGRhdGFTdHJlYW0sIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGFzeW5jRGlzcGF0Y2hlciA9IG5ldyBBc3luY0Rpc3BhdGNoZXIoY2FsbGJhY2spO1xuICAgICAgICBhc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eSh1cmxzLmxlbmd0aCk7XG4gICAgICAgIGZvciAoY29uc3QgdXJsIG9mIHVybHMpIHtcbiAgICAgICAgICAgIHJlc29sdmVyRm9yVXJsKHVybCwgKGVyciwgcmVzb2x2ZXIpID0+IHtcbiAgICAgICAgICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZXIuYXV0aCh1cmwsIHVuZGVmaW5lZCwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmVyLnNhdmUodXJsLCBjc2JJZGVudGlmaWVyLCBkYXRhU3RyZWFtLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKHVuZGVmaW5lZCwgdXJsKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmxvYWQgPSBmdW5jdGlvbiAoY3NiSWRlbnRpZmllciwgdmVyc2lvbiwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2ZXJzaW9uID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gdmVyc2lvbjtcbiAgICAgICAgICAgIHZlcnNpb24gPSBcIlwiO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5RG93bmxvYWQoY3NiSWRlbnRpZmllciwgdmVyc2lvbiwgMCwgKGVyciwgcmVzb3VyY2UpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCByZXNvdXJjZSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFZlcnNpb25zID0gZnVuY3Rpb24gKGNzYklkZW50aWZpZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRW1wdHkgZnVuY3Rpb25cIik7XG4gICAgfTtcblxuICAgIHRoaXMuY29tcGFyZVZlcnNpb25zID0gZnVuY3Rpb24gKGZpbGVMaXN0LCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCB1cmwgPSB1cmxzWzBdO1xuICAgICAgICByZXNvbHZlckZvclVybCh1cmwsIChlcnIsIHJlc29sdmVyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc29sdmVyLmF1dGgodXJsLCB1bmRlZmluZWQsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlc29sdmVyLmNvbXBhcmVWZXJzaW9ucyh1cmwsIGZpbGVMaXN0LCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIElOVEVSTkFMIE1FVEhPRFMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgICBmdW5jdGlvbiByZXNvbHZlckZvclVybCh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhyZXNvbHZlcnMpO1xuICAgICAgICBsZXQgcmVzb2x2ZXI7XG4gICAgICAgIGxldCBpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goa2V5c1tpXSwgdXJsKSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmVyID0gcmVzb2x2ZXJzW2tleXNbaV1dO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGkgPT09IGtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXNvbHZlciA9IHJlc29sdmVyc1snZXZmcyddO1xuICAgICAgICAgICAgaWYgKCFyZXNvbHZlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoYE5vIHJlc29sdmVyIG1hdGNoZXMgdGhlIHVybCAke3VybH1gKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHJlc29sdmVyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXRjaChzdHIxLCBzdHIyKSB7XG4gICAgICAgIHJldHVybiBzdHIxLmluY2x1ZGVzKHN0cjIpIHx8IHN0cjIuaW5jbHVkZXMoc3RyMSk7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiB0cnlEb3dubG9hZChjc2JJZGVudGlmaWVyLCB2ZXJzaW9uLCBpbmRleCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSB1cmxzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcIkZhaWxlZCB0byBkb3dubG9hZCByZXNvdXJjZVwiKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB1cmwgPSB1cmxzW2luZGV4XTtcbiAgICAgICAgcmVzb2x2ZXJGb3JVcmwodXJsLCAoZXJyLCByZXNvbHZlcikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXNvbHZlci5hdXRoKHVybCwgdW5kZWZpbmVkLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ5RG93bmxvYWQoY3NiSWRlbnRpZmllciwgdmVyc2lvbiwgKytpbmRleCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlc29sdmVyLmxvYWQodXJsLCBjc2JJZGVudGlmaWVyLCB2ZXJzaW9uLCAoZXJyLCByZXNvdXJjZSkgPT57XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnlEb3dubG9hZChjc2JJZGVudGlmaWVyLCB2ZXJzaW9uLCArK2luZGV4LCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHJlc291cmNlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuY29uc3QgZW5naW5lQnVpbGRlciA9IG5ldyBCYWNrdXBFbmdpbmVCdWlsZGVyKCk7XG5cbi8vIGVuZ2luZUJ1aWxkZXIuYWRkUmVzb2x2ZXIoJ2Ryb3Bib3gnLCBuZXcgRHJvcGJveFJlc29sdmVyKCkpO1xuLy8gZW5naW5lQnVpbGRlci5hZGRSZXNvbHZlcignZHJpdmUnLCBuZXcgRHJpdmVSZXNvbHZlcigpKTtcbmVuZ2luZUJ1aWxkZXIuYWRkUmVzb2x2ZXIoJ2V2ZnMnLCBuZXcgRVZGU1Jlc29sdmVyKCkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnZXRCYWNrdXBFbmdpbmU6IGZ1bmN0aW9uICh1cmxzKSB7XG4gICAgICAgIHJldHVybiBlbmdpbmVCdWlsZGVyLmdldEJhY2t1cEVuZ2luZSh1cmxzKTtcbiAgICB9XG59O1xuIiwiIGZ1bmN0aW9uIENTQkNhY2hlKG1heFNpemUpIHtcblxuICAgICBsZXQgY2FjaGUgPSB7fTtcbiAgICBsZXQgc2l6ZSA9IDA7XG4gICAgY29uc3QgY2xlYXJpbmdSYXRpbyA9IDAuNTtcblxuXG4gICAgdGhpcy5sb2FkID0gZnVuY3Rpb24gKHVpZCkge1xuICAgICAgICAvLyBpZiAoY2FjaGVbdWlkXSkge1xuICAgICAgICAvLyAgICAgY2FjaGVbdWlkXS5jb3VudCArPSAxO1xuICAgICAgICAvLyAgICAgcmV0dXJuIGNhY2hlW3VpZF0uaW5zdGFuY2U7XG4gICAgICAgIC8vIH1cblxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH07XG5cbiAgICB0aGlzLnB1dCA9IGZ1bmN0aW9uICh1aWQsIG9iaikge1xuICAgICAgICBpZiAoc2l6ZSA+IG1heFNpemUpIHtcbiAgICAgICAgICAgIGNsZWFyKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzaXplKys7XG4gICAgICAgICAgICBjYWNoZVt1aWRdID0ge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlOiBvYmosXG4gICAgICAgICAgICAgICAgY291bnQ6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1pbnRlcm5hbCBtZXRob2RzLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgICBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICAgICAgc2l6ZSA9IG1heFNpemUgLSBNYXRoLnJvdW5kKGNsZWFyaW5nUmF0aW8gKiBtYXhTaXplKTtcblxuICAgICAgICBjb25zdCBlbnRyaWVzID0gT2JqZWN0LmVudHJpZXMoY2FjaGUpO1xuICAgICAgICBjYWNoZSA9IGVudHJpZXNcbiAgICAgICAgICAgIC5zb3J0KChhcnIxLCBhcnIyKSA9PiBhcnIyWzFdLmNvdW50IC0gYXJyMVsxXS5jb3VudClcbiAgICAgICAgICAgIC5zbGljZSgwLCBzaXplKVxuICAgICAgICAgICAgLnJlZHVjZSgob2JqLCBbIGssIHYgXSkgPT4ge1xuICAgICAgICAgICAgICAgIG9ialtrXSA9IHY7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgICAgIH0sIHt9KTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ1NCQ2FjaGU7XG4iLCJjb25zdCBjcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuXG5cbmZ1bmN0aW9uIENTQklkZW50aWZpZXIoaWQsIGJhY2t1cFVybHMsIGtleUxlbiA9IDMyKSB7XG4gICAgbGV0IHNlZWQ7XG4gICAgbGV0IGRzZWVkO1xuICAgIGxldCB1aWQ7XG4gICAgbGV0IGVuY1NlZWQ7XG4gICAgLy8gbGV0IGVuY0RzZWVkO1xuXG4gICAgaW5pdCgpO1xuXG4gICAgdGhpcy5nZXRTZWVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZighc2VlZCl7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcmV0dXJuIHNlZWQuIEFjY2VzcyBpcyBkZW5pZWQuXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0oc2VlZCk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RHNlZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKGRzZWVkKXtcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKGRzZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHNlZWQpe1xuICAgICAgICAgICAgZHNlZWQgPSBkZXJpdmVTZWVkKHNlZWQpO1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0oZHNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJldHVybiBkZXJpdmVkIHNlZWQuIEFjY2VzcyBpcyBkZW5pZWQuXCIpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFVpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYodWlkKXtcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKHVpZCkudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKGRzZWVkKXtcbiAgICAgICAgICAgIHVpZCA9IGNvbXB1dGVVaWQoZHNlZWQpO1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0odWlkKS50b1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoc2VlZCl7XG4gICAgICAgICAgICBkc2VlZCA9IGRlcml2ZVNlZWQoc2VlZCk7XG4gICAgICAgICAgICB1aWQgPSBjb21wdXRlVWlkKGRzZWVkKTtcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKHVpZCkudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXR1cm4gdWlkXCIpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEVuY1NlZWQgPSBmdW5jdGlvbiAoZW5jcnlwdGlvbktleSkge1xuICAgICAgICBpZihlbmNTZWVkKXtcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKGVuY1NlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoIXNlZWQpe1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJldHVybiBlbmNTZWVkLiBBY2Nlc3MgaXMgZGVuaWVkXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFlbmNyeXB0aW9uS2V5KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcmV0dXJuIGVuY1NlZWQuIE5vIGVuY3J5cHRpb24ga2V5IHdhcyBwcm92aWRlZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vVE9ETzogZW5jcnlwdCBzZWVkIHVzaW5nIGVuY3J5cHRpb25LZXkuIEVuY3J5cHRpb24gYWxnb3JpdGhtIHJlbWFpbnMgdG8gYmUgY2hvc2VuXG4gICAgfTtcblxuXG5cbiAgICB0aGlzLmdldEJhY2t1cFVybHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKHNlZWQpe1xuICAgICAgICAgICAgcmV0dXJuIHNlZWQuYmFja3VwO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoZHNlZWQpe1xuICAgICAgICAgICAgcmV0dXJuIGRzZWVkLmJhY2t1cDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkJhY2t1cCBVUkxzIGNvdWxkIG5vdCBiZSByZXRyaWV2ZWQuIEFjY2VzcyBpcyBkZW5pZWRcIik7XG4gICAgfTtcblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGludGVybmFsIG1ldGhvZHMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgICAgaWYgKCFpZCkge1xuICAgICAgICAgICAgaWYgKCFiYWNrdXBVcmxzKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gYmFja3VwcyBwcm92aWRlZC5cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlZWQgPSBjcmVhdGUoKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBjbGFzc2lmeUlkKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGFzc2lmeUlkKCkge1xuICAgICAgICBpZiAodHlwZW9mIGlkICE9PSBcInN0cmluZ1wiICYmICFCdWZmZXIuaXNCdWZmZXIoaWQpICYmICEodHlwZW9mIGlkID09PSBcIm9iamVjdFwiICYmICFCdWZmZXIuaXNCdWZmZXIoaWQpKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJZCBtdXN0IGJlIGEgc3RyaW5nIG9yIGEgYnVmZmVyLiBUaGUgdHlwZSBwcm92aWRlZCB3YXMgJHt0eXBlb2YgaWR9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBleHBhbmRlZElkID0gbG9hZChpZCk7XG4gICAgICAgIHN3aXRjaChleHBhbmRlZElkLnRhZyl7XG4gICAgICAgICAgICBjYXNlICdzJzpcbiAgICAgICAgICAgICAgICBzZWVkID0gZXhwYW5kZWRJZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2QnOlxuICAgICAgICAgICAgICAgIGRzZWVkID0gZXhwYW5kZWRJZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3UnOlxuICAgICAgICAgICAgICAgIHVpZCA9IGV4cGFuZGVkSWQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlcyc6XG4gICAgICAgICAgICAgICAgZW5jU2VlZCA9IGV4cGFuZGVkSWQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlZCc6XG4gICAgICAgICAgICAgICAgZW5jRHNlZWQgPSBleHBhbmRlZElkO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdGFnJyk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG4gICAgZnVuY3Rpb24gY3JlYXRlKCkge1xuICAgICAgICBjb25zdCBsb2NhbFNlZWQgPSB7fTtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGJhY2t1cFVybHMpKSB7XG4gICAgICAgICAgICBiYWNrdXBVcmxzID0gWyBiYWNrdXBVcmxzIF07XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbFNlZWQudGFnICAgID0gJ3MnO1xuICAgICAgICBsb2NhbFNlZWQucmFuZG9tID0gY3J5cHRvLnJhbmRvbUJ5dGVzKGtleUxlbik7XG4gICAgICAgIGxvY2FsU2VlZC5iYWNrdXAgPSBiYWNrdXBVcmxzO1xuXG4gICAgICAgIHJldHVybiBsb2NhbFNlZWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVyaXZlU2VlZChzZWVkKSB7XG4gICAgICAgIGxldCBjb21wYWN0U2VlZCA9IHNlZWQ7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBzZWVkID09PSAnb2JqZWN0JyAmJiAhQnVmZmVyLmlzQnVmZmVyKHNlZWQpKSB7XG4gICAgICAgICAgICBjb21wYWN0U2VlZCA9IGdlbmVyYXRlQ29tcGFjdEZvcm0oc2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHNlZWQpKSB7XG4gICAgICAgICAgICBjb21wYWN0U2VlZCA9IHNlZWQudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb21wYWN0U2VlZFswXSA9PT0gJ2QnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RyaWVkIHRvIGRlcml2ZSBhbiBhbHJlYWR5IGRlcml2ZWQgc2VlZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRlY29kZWRDb21wYWN0U2VlZCA9IGRlY29kZVVSSUNvbXBvbmVudChjb21wYWN0U2VlZCk7XG4gICAgICAgIGNvbnN0IHNwbGl0Q29tcGFjdFNlZWQgPSBkZWNvZGVkQ29tcGFjdFNlZWQuc3Vic3RyaW5nKDEpLnNwbGl0KCd8Jyk7XG5cbiAgICAgICAgY29uc3Qgc3RyU2VlZCA9IEJ1ZmZlci5mcm9tKHNwbGl0Q29tcGFjdFNlZWRbMF0sICdiYXNlNjQnKS50b1N0cmluZygnaGV4Jyk7XG4gICAgICAgIGNvbnN0IGJhY2t1cFVybHMgPSBCdWZmZXIuZnJvbShzcGxpdENvbXBhY3RTZWVkWzFdLCAnYmFzZTY0JykudG9TdHJpbmcoKTtcbiAgICAgICAgY29uc3QgZHNlZWQgPSB7fTtcblxuICAgICAgICBkc2VlZC50YWcgPSAnZCc7XG4gICAgICAgIGRzZWVkLnJhbmRvbSA9IGNyeXB0by5kZXJpdmVLZXkoc3RyU2VlZCwgbnVsbCwga2V5TGVuKTtcbiAgICAgICAgZHNlZWQuYmFja3VwID0gSlNPTi5wYXJzZShiYWNrdXBVcmxzKTtcblxuICAgICAgICByZXR1cm4gZHNlZWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29tcHV0ZVVpZChkc2VlZCl7XG4gICAgICAgIGlmKCFkc2VlZCl7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEc2VlZCB3YXMgbm90IHByb3ZpZGVkXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkc2VlZCA9PT0gXCJvYmplY3RcIiAmJiAhQnVmZmVyLmlzQnVmZmVyKGRzZWVkKSkge1xuICAgICAgICAgICAgZHNlZWQgPSBnZW5lcmF0ZUNvbXBhY3RGb3JtKGRzZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVpZCA9IHt9O1xuICAgICAgICB1aWQudGFnID0gJ3UnO1xuICAgICAgICB1aWQucmFuZG9tID0gQnVmZmVyLmZyb20oY3J5cHRvLmdlbmVyYXRlU2FmZVVpZChkc2VlZCkpO1xuXG4gICAgICAgIHJldHVybiB1aWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVDb21wYWN0Rm9ybSh7dGFnLCByYW5kb20sIGJhY2t1cH0pIHtcbiAgICAgICAgbGV0IGNvbXBhY3RJZCA9IHRhZyArIHJhbmRvbS50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgICAgIGlmIChiYWNrdXApIHtcbiAgICAgICAgICAgIGNvbXBhY3RJZCArPSAnfCcgKyBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShiYWNrdXApKS50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEJ1ZmZlci5mcm9tKGVuY29kZVVSSUNvbXBvbmVudChjb21wYWN0SWQpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlbmNyeXB0KGlkLCBlbmNyeXB0aW9uS2V5KSB7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggIT09IDIpe1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBXcm9uZyBudW1iZXIgb2YgYXJndW1lbnRzLiBFeHBlY3RlZDogMjsgcHJvdmlkZWQgJHthcmd1bWVudHMubGVuZ3RofWApO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHRhZztcbiAgICAgICAgaWYgKHR5cGVvZiBpZCA9PT0gXCJvYmplY3RcIiAmJiAhQnVmZmVyLmlzQnVmZmVyKGlkKSkge1xuICAgICAgICAgICAgdGFnID0gaWQudGFnO1xuICAgICAgICAgICAgaWQgPSBnZW5lcmF0ZUNvbXBhY3RGb3JtKGlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0YWcgPT09ICdzJykge1xuICAgICAgICAgICAgLy9UT0RPIGVuY3J5cHQgc2VlZFxuICAgICAgICB9ZWxzZSBpZiAodGFnID09PSAnZCcpIHtcbiAgICAgICAgICAgIC8vVE9ETyBlbmNyeXB0IGRzZWVkXG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIHByb3ZpZGVkIGlkIGNhbm5vdCBiZSBlbmNyeXB0ZWRcIik7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxvYWQoY29tcGFjdElkKSB7XG4gICAgICAgIGlmKHR5cGVvZiBjb21wYWN0SWQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgdHlwZSBzdHJpbmcgb3IgQnVmZmVyLiBSZWNlaXZlZCB1bmRlZmluZWRgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHR5cGVvZiBjb21wYWN0SWQgIT09IFwic3RyaW5nXCIpe1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb21wYWN0SWQgPT09IFwib2JqZWN0XCIgJiYgIUJ1ZmZlci5pc0J1ZmZlcihjb21wYWN0SWQpKSB7XG4gICAgICAgICAgICAgICAgY29tcGFjdElkID0gQnVmZmVyLmZyb20oY29tcGFjdElkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29tcGFjdElkID0gY29tcGFjdElkLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkZWNvZGVkQ29tcGFjdElkID0gZGVjb2RlVVJJQ29tcG9uZW50KGNvbXBhY3RJZCk7XG4gICAgICAgIGNvbnN0IGlkID0ge307XG4gICAgICAgIGNvbnN0IHNwbGl0Q29tcGFjdElkID0gZGVjb2RlZENvbXBhY3RJZC5zdWJzdHJpbmcoMSkuc3BsaXQoJ3wnKTtcblxuICAgICAgICBpZC50YWcgPSBkZWNvZGVkQ29tcGFjdElkWzBdO1xuICAgICAgICBpZC5yYW5kb20gPSBCdWZmZXIuZnJvbShzcGxpdENvbXBhY3RJZFswXSwgJ2Jhc2U2NCcpO1xuXG4gICAgICAgIGlmKHNwbGl0Q29tcGFjdElkWzFdICYmIHNwbGl0Q29tcGFjdElkWzFdLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgaWQuYmFja3VwID0gSlNPTi5wYXJzZShCdWZmZXIuZnJvbShzcGxpdENvbXBhY3RJZFsxXSwgJ2Jhc2U2NCcpLnRvU3RyaW5nKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGlkO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDU0JJZGVudGlmaWVyO1xuIiwiY29uc3QgT3dNID0gcmVxdWlyZSgnc3dhcm11dGlscycpLk93TTtcbmNvbnN0IHBza2RiID0gcmVxdWlyZSgncHNrZGInKTtcblxuZnVuY3Rpb24gUmF3Q1NCKGluaXREYXRhKSB7XG5cdGNvbnN0IGRhdGEgPSBuZXcgT3dNKHtibG9ja2NoYWluOiBpbml0RGF0YX0pO1xuXHRjb25zdCBibG9ja2NoYWluID0gcHNrZGIuc3RhcnREYih7Z2V0SW5pdFZhbHVlcywgcGVyc2lzdH0pO1xuXG5cdGlmKCFkYXRhLmJsb2NrY2hhaW4pIHtcblx0XHRkYXRhLmJsb2NrY2hhaW4gPSB7XG5cdFx0XHR0cmFuc2FjdGlvbkxvZyA6ICcnLFxuXHRcdFx0ZW1iZWRkZWRGaWxlczoge31cblx0XHR9O1xuXHR9XG5cblx0ZGF0YS5lbWJlZEZpbGUgPSBmdW5jdGlvbiAoZmlsZUFsaWFzLCBmaWxlRGF0YSkge1xuXHRcdGNvbnN0IGVtYmVkZGVkQXNzZXQgPSBkYXRhLmdldEFzc2V0KFwiZ2xvYmFsLkVtYmVkZGVkRmlsZVwiLCBmaWxlQWxpYXMpO1xuXHRcdGlmKGVtYmVkZGVkQXNzZXQuaXNQZXJzaXN0ZWQoKSl7XG5cdFx0XHRjb25zb2xlLmxvZyhgRmlsZSB3aXRoIGFsaWFzICR7ZmlsZUFsaWFzfSBhbHJlYWR5IGV4aXN0c2ApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGRhdGEuYmxvY2tjaGFpbi5lbWJlZGRlZEZpbGVzW2ZpbGVBbGlhc10gPSBmaWxlRGF0YTtcblx0XHRkYXRhLnNhdmVBc3NldChlbWJlZGRlZEFzc2V0KTtcblx0fTtcblxuXHRkYXRhLmF0dGFjaEZpbGUgPSBmdW5jdGlvbiAoZmlsZUFsaWFzLCBwYXRoLCBzZWVkKSB7XG5cdFx0ZGF0YS5tb2RpZnlBc3NldChcImdsb2JhbC5GaWxlUmVmZXJlbmNlXCIsIGZpbGVBbGlhcywgKGZpbGUpID0+IHtcblx0XHRcdGlmICghZmlsZS5pc0VtcHR5KCkpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coYEZpbGUgd2l0aCBhbGlhcyAke2ZpbGVBbGlhc30gYWxyZWFkeSBleGlzdHNgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRmaWxlLmluaXQoZmlsZUFsaWFzLCBwYXRoLCBzZWVkKTtcblx0XHR9KTtcblx0fTtcblxuXHRkYXRhLnNhdmVBc3NldCA9IGZ1bmN0aW9uKGFzc2V0KSB7XG5cdFx0Y29uc3QgdHJhbnNhY3Rpb24gPSBibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuXHRcdHRyYW5zYWN0aW9uLmFkZChhc3NldCk7XG5cdFx0YmxvY2tjaGFpbi5jb21taXQodHJhbnNhY3Rpb24pO1xuXHR9O1xuXG5cdGRhdGEubW9kaWZ5QXNzZXQgPSBmdW5jdGlvbihhc3NldFR5cGUsIGFpZCwgYXNzZXRNb2RpZmllcikge1xuXHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcblx0XHRjb25zdCBhc3NldCA9IHRyYW5zYWN0aW9uLmxvb2t1cChhc3NldFR5cGUsIGFpZCk7XG5cdFx0YXNzZXRNb2RpZmllcihhc3NldCk7XG5cblx0XHR0cmFuc2FjdGlvbi5hZGQoYXNzZXQpO1xuXHRcdGJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcblx0fTtcblxuXHRkYXRhLmdldEFzc2V0ID0gZnVuY3Rpb24gKGFzc2V0VHlwZSwgYWlkKSB7XG5cdFx0Y29uc3QgdHJhbnNhY3Rpb24gPSBibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuXHRcdHJldHVybiB0cmFuc2FjdGlvbi5sb29rdXAoYXNzZXRUeXBlLCBhaWQpO1xuXHR9O1xuXG5cdGRhdGEuZ2V0QWxsQXNzZXRzID0gZnVuY3Rpb24oYXNzZXRUeXBlKSB7XG5cdFx0Y29uc3QgdHJhbnNhY3Rpb24gPSBibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuXHRcdHJldHVybiB0cmFuc2FjdGlvbi5sb2FkQXNzZXRzKGFzc2V0VHlwZSk7XG5cdH07XG5cblx0LyogaW50ZXJuYWwgZnVuY3Rpb25zICovXG5cblx0ZnVuY3Rpb24gcGVyc2lzdCh0cmFuc2FjdGlvbkxvZywgY3VycmVudFZhbHVlcywgY3VycmVudFB1bHNlKSB7XG5cdFx0dHJhbnNhY3Rpb25Mb2cuY3VycmVudFB1bHNlID0gY3VycmVudFB1bHNlO1xuXG5cdFx0ZGF0YS5ibG9ja2NoYWluLmN1cnJlbnRWYWx1ZXMgPSBjdXJyZW50VmFsdWVzO1xuXHRcdGRhdGEuYmxvY2tjaGFpbi50cmFuc2FjdGlvbkxvZyArPSBta1NpbmdsZUxpbmUoSlNPTi5zdHJpbmdpZnkodHJhbnNhY3Rpb25Mb2cpKSArIFwiXFxuXCI7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRJbml0VmFsdWVzICgpIHtcblx0XHRpZighZGF0YS5ibG9ja2NoYWluIHx8ICFkYXRhLmJsb2NrY2hhaW4uY3VycmVudFZhbHVlcykge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdHJldHVybiBkYXRhLmJsb2NrY2hhaW4uY3VycmVudFZhbHVlcztcblx0fVxuXG5cdGZ1bmN0aW9uIG1rU2luZ2xlTGluZShzdHIpIHtcblx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoL1xcbnxcXHIvZywgXCJcIik7XG5cdH1cblxuXHRyZXR1cm4gZGF0YTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSYXdDU0I7IiwiY29uc3QgUmF3Q1NCID0gcmVxdWlyZSgnLi9SYXdDU0InKTtcbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ3Bza2NyeXB0bycpO1xuY29uc3QgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy91dGlscycpO1xuY29uc3QgRHNlZWRDYWdlID0gcmVxdWlyZSgnLi4vdXRpbHMvRHNlZWRDYWdlJyk7XG5jb25zdCBIYXNoQ2FnZSA9IHJlcXVpcmUoJy4uL3V0aWxzL0hhc2hDYWdlJyk7XG5jb25zdCBDU0JDYWNoZSA9IHJlcXVpcmUoXCIuL0NTQkNhY2hlXCIpO1xuY29uc3QgQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoXCIuL0NTQklkZW50aWZpZXJcIik7XG5jb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKTtcblxuY29uc3QgcmF3Q1NCQ2FjaGUgPSBuZXcgQ1NCQ2FjaGUoMTApO1xuY29uc3QgaW5zdGFuY2VzID0ge307XG5cbi8qKlxuICpcbiAqIEBwYXJhbSBsb2NhbEZvbGRlciAgIC0gcmVxdWlyZWRcbiAqIEBwYXJhbSBjdXJyZW50UmF3Q1NCIC0gb3B0aW9uYWxcbiAqIEBwYXJhbSBjc2JJZGVudGlmaWVyIC0gcmVxdWlyZWRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBSb290Q1NCKGxvY2FsRm9sZGVyLCBjdXJyZW50UmF3Q1NCLCBjc2JJZGVudGlmaWVyKSB7XG4gICAgaWYgKCFsb2NhbEZvbGRlciB8fCAhY3NiSWRlbnRpZmllcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgcmVxdWlyZWQgcGFyYW1ldGVycycpO1xuICAgIH1cblxuXG4gICAgY29uc3QgaGFzaENhZ2UgPSBuZXcgSGFzaENhZ2UobG9jYWxGb2xkZXIpO1xuICAgIGNvbnN0IGV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICAgIHRoaXMub24gPSBldmVudC5vbjtcbiAgICB0aGlzLm9mZiA9IGV2ZW50LnJlbW92ZUxpc3RlbmVyO1xuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzID0gZXZlbnQucmVtb3ZlQWxsTGlzdGVuZXJzO1xuICAgIHRoaXMuZW1pdCA9IGV2ZW50LmVtaXQ7XG5cbiAgICB0aGlzLmdldE1pZFJvb3QgPSBmdW5jdGlvbiAoQ1NCUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcbiAgICB9O1xuXG4gICAgdGhpcy5sb2FkUmF3Q1NCID0gZnVuY3Rpb24gKENTQlBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghY3VycmVudFJhd0NTQikge1xuICAgICAgICAgICAgX19sb2FkUmF3Q1NCKGNzYklkZW50aWZpZXIsIChlcnIsIHJhd0NTQikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY3VycmVudFJhd0NTQiA9IHJhd0NTQjtcblxuICAgICAgICAgICAgICAgIGlmIChDU0JQYXRoIHx8IENTQlBhdGggIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFJhd0NTQihDU0JQYXRoLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGN1cnJlbnRSYXdDU0IpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFDU0JQYXRoIHx8IENTQlBhdGggPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgY3VycmVudFJhd0NTQik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmxvYWRBc3NldEZyb21QYXRoKENTQlBhdGgsIChlcnIsIGFzc2V0LCByYXdDU0IpID0+IHtcblxuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWFzc2V0IHx8ICFhc3NldC5kc2VlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoYFRoZSBDU0JQYXRoICR7Q1NCUGF0aH0gaXMgaW52YWxpZC5gKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9fbG9hZFJhd0NTQihuZXcgQ1NCSWRlbnRpZmllcihhc3NldC5kc2VlZCksIGNhbGxiYWNrKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuc2F2ZVJhd0NTQiA9IGZ1bmN0aW9uIChyYXdDU0IsIENTQlBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIHNhdmUgbWFzdGVyXG4gICAgICAgIGlmICghQ1NCUGF0aCB8fCBDU0JQYXRoID09PSAnJykge1xuICAgICAgICAgICAgaWYgKHJhd0NTQikge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRSYXdDU0IgPSByYXdDU0I7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9faW5pdGlhbGl6ZUFzc2V0cyhjdXJyZW50UmF3Q1NCKTtcbiAgICAgICAgICAgIHJldHVybiBfX3dyaXRlUmF3Q1NCKGN1cnJlbnRSYXdDU0IsIGNzYklkZW50aWZpZXIsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNhdmUgY3NiIGluIGhpZXJhcmNoeVxuICAgICAgICBjb25zdCBzcGxpdFBhdGggPSBfX3NwbGl0UGF0aChDU0JQYXRoKTtcbiAgICAgICAgdGhpcy5sb2FkQXNzZXRGcm9tUGF0aChDU0JQYXRoLCAoZXJyLCBjc2JSZWZlcmVuY2UpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghY3NiUmVmZXJlbmNlLmRzZWVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYmFja3VwcyA9IGNzYklkZW50aWZpZXIuZ2V0QmFja3VwVXJscygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0NTQklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcih1bmRlZmluZWQsIGJhY2t1cHMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsU2VlZCA9IG5ld0NTQklkZW50aWZpZXIuZ2V0U2VlZCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsRHNlZWQgPSBuZXdDU0JJZGVudGlmaWVyLmdldERzZWVkKCk7XG4gICAgICAgICAgICAgICAgY3NiUmVmZXJlbmNlLmluaXQoc3BsaXRQYXRoLmFzc2V0QWlkLCBsb2NhbFNlZWQsIGxvY2FsRHNlZWQpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5zYXZlQXNzZXRUb1BhdGgoQ1NCUGF0aCwgY3NiUmVmZXJlbmNlLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkQXNzZXRGcm9tUGF0aChDU0JQYXRoLCAoZXJyLCBjc2JSZWYpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgX19pbml0aWFsaXplQXNzZXRzKHJhd0NTQiwgY3NiUmVmLCBiYWNrdXBzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9fd3JpdGVSYXdDU0IocmF3Q1NCLCBuZXcgQ1NCSWRlbnRpZmllcihjc2JSZWZlcmVuY2UuZHNlZWQpLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2VuZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9fd3JpdGVSYXdDU0IocmF3Q1NCLCBuZXcgQ1NCSWRlbnRpZmllcihjc2JSZWZlcmVuY2UuZHNlZWQpLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLnNhdmVBc3NldFRvUGF0aCA9IGZ1bmN0aW9uIChDU0JQYXRoLCBhc3NldCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3Qgc3BsaXRQYXRoID0gX19zcGxpdFBhdGgoQ1NCUGF0aCwge2tlZXBBbGlhc2VzQXNTdHJpbmc6IHRydWV9KTtcbiAgICAgICAgdGhpcy5sb2FkUmF3Q1NCKHNwbGl0UGF0aC5DU0JBbGlhc2VzLCAoZXJyLCByYXdDU0IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmF3Q1NCLnNhdmVBc3NldChhc3NldCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zYXZlUmF3Q1NCKHJhd0NTQiwgc3BsaXRQYXRoLkNTQkFsaWFzZXMsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLmxvYWRBc3NldEZyb21QYXRoID0gZnVuY3Rpb24gKENTQlBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHByb2Nlc3NlZFBhdGggPSBfX3NwbGl0UGF0aChDU0JQYXRoKTtcbiAgICAgICAgaWYgKCFjdXJyZW50UmF3Q1NCKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdjdXJyZW50UmF3Q1NCIGRvZXMgbm90IGV4aXN0JykpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IENTQlJlZmVyZW5jZSA9IG51bGw7XG4gICAgICAgIGlmIChwcm9jZXNzZWRQYXRoLkNTQkFsaWFzZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgbmV4dEFsaWFzID0gcHJvY2Vzc2VkUGF0aC5DU0JBbGlhc2VzWzBdO1xuICAgICAgICAgICAgQ1NCUmVmZXJlbmNlID0gY3VycmVudFJhd0NTQi5nZXRBc3NldCgnZ2xvYmFsLkNTQlJlZmVyZW5jZScsIG5leHRBbGlhcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIXByb2Nlc3NlZFBhdGguYXNzZXRUeXBlIHx8ICFwcm9jZXNzZWRQYXRoLmFzc2V0QWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignTm90IGFzc2V0IHR5cGUgb3IgaWQgc3BlY2lmaWVkIGluIENTQlBhdGgnKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIENTQlJlZmVyZW5jZSA9IGN1cnJlbnRSYXdDU0IuZ2V0QXNzZXQocHJvY2Vzc2VkUGF0aC5hc3NldFR5cGUsIHByb2Nlc3NlZFBhdGguYXNzZXRBaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb2Nlc3NlZFBhdGguQ1NCQWxpYXNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBDU0JSZWZlcmVuY2UsIGN1cnJlbnRSYXdDU0IpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJvY2Vzc2VkUGF0aC5DU0JBbGlhc2VzLnNoaWZ0KCk7XG5cbiAgICAgICAgaWYoIUNTQlJlZmVyZW5jZSB8fCAhQ1NCUmVmZXJlbmNlLmRzZWVkKXtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoYFRoZSBDU0JQYXRoICR7Q1NCUGF0aH0gaXMgaW52YWxpZGApKTtcbiAgICAgICAgfVxuICAgICAgICBfX2xvYWRBc3NldEZyb21QYXRoKHByb2Nlc3NlZFBhdGgsIG5ldyBDU0JJZGVudGlmaWVyKENTQlJlZmVyZW5jZS5kc2VlZCksIDAsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG5cbiAgICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tIElOVEVSTkFMIE1FVEhPRFMgLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG4gICAgZnVuY3Rpb24gX19sb2FkUmF3Q1NCKGxvY2FsQ1NCSWRlbnRpZmllciwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgdWlkID0gbG9jYWxDU0JJZGVudGlmaWVyLmdldFVpZCgpO1xuICAgICAgICBjb25zdCBjYWNoZWRSYXdDU0IgPSByYXdDU0JDYWNoZS5sb2FkKHVpZCk7XG5cbiAgICAgICAgaWYgKGNhY2hlZFJhd0NTQikge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIGNhY2hlZFJhd0NTQik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByb290UGF0aCA9IHV0aWxzLmdlbmVyYXRlUGF0aChsb2NhbEZvbGRlciwgbG9jYWxDU0JJZGVudGlmaWVyKTtcbiAgICAgICAgZnMucmVhZEZpbGUocm9vdFBhdGgsIChlcnIsIGVuY3J5cHRlZENzYikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjcnlwdG8uZGVjcnlwdE9iamVjdChlbmNyeXB0ZWRDc2IsIGxvY2FsQ1NCSWRlbnRpZmllci5nZXREc2VlZCgpLCAoZXJyLCBjc2JEYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgY3NiID0gbmV3IFJhd0NTQihjc2JEYXRhKTtcbiAgICAgICAgICAgICAgICByYXdDU0JDYWNoZS5wdXQodWlkLCBjc2IpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGNzYik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gQ1NCUGF0aDogc3RyaW5nIC0gaW50ZXJuYWwgcGF0aCB0aGF0IGxvb2tzIGxpa2UgL3tDU0JOYW1lMX0ve0NTQk5hbWUyfTp7YXNzZXRUeXBlfTp7YXNzZXRBbGlhc09ySWR9XG4gICAgICogQHBhcmFtIG9wdGlvbnM6b2JqZWN0XG4gICAgICogQHJldHVybnMge3tDU0JBbGlhc2VzOiBbc3RyaW5nXSwgYXNzZXRBaWQ6ICgqfHVuZGVmaW5lZCksIGFzc2V0VHlwZTogKCp8dW5kZWZpbmVkKX19XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfX3NwbGl0UGF0aChDU0JQYXRoLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgY29uc3QgcGF0aFNlcGFyYXRvciA9ICcvJztcblxuICAgICAgICBpZiAoQ1NCUGF0aC5zdGFydHNXaXRoKHBhdGhTZXBhcmF0b3IpKSB7XG4gICAgICAgICAgICBDU0JQYXRoID0gQ1NCUGF0aC5zdWJzdHJpbmcoMSk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgQ1NCQWxpYXNlcyA9IENTQlBhdGguc3BsaXQocGF0aFNlcGFyYXRvcik7XG4gICAgICAgIGlmIChDU0JBbGlhc2VzLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ1NCUGF0aCB0b28gc2hvcnQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGxhc3RJbmRleCA9IENTQkFsaWFzZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgY29uc3Qgb3B0aW9uYWxBc3NldFNlbGVjdG9yID0gQ1NCQWxpYXNlc1tsYXN0SW5kZXhdLnNwbGl0KCc6Jyk7XG5cbiAgICAgICAgaWYgKG9wdGlvbmFsQXNzZXRTZWxlY3RvclswXSA9PT0gJycpIHtcbiAgICAgICAgICAgIENTQkFsaWFzZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIENTQkFsaWFzZXNbbGFzdEluZGV4XSA9IG9wdGlvbmFsQXNzZXRTZWxlY3RvclswXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghb3B0aW9uYWxBc3NldFNlbGVjdG9yWzFdICYmICFvcHRpb25hbEFzc2V0U2VsZWN0b3JbMl0pIHtcbiAgICAgICAgICAgIG9wdGlvbmFsQXNzZXRTZWxlY3RvclsxXSA9ICdnbG9iYWwuQ1NCUmVmZXJlbmNlJztcbiAgICAgICAgICAgIG9wdGlvbmFsQXNzZXRTZWxlY3RvclsyXSA9IENTQkFsaWFzZXNbbGFzdEluZGV4XTtcbiAgICAgICAgICAgIENTQkFsaWFzZXMucG9wKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5rZWVwQWxpYXNlc0FzU3RyaW5nID09PSB0cnVlKSB7XG4gICAgICAgICAgICBDU0JBbGlhc2VzID0gQ1NCQWxpYXNlcy5qb2luKCcvJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIENTQkFsaWFzZXM6IENTQkFsaWFzZXMsXG4gICAgICAgICAgICBhc3NldFR5cGU6IG9wdGlvbmFsQXNzZXRTZWxlY3RvclsxXSxcbiAgICAgICAgICAgIGFzc2V0QWlkOiBvcHRpb25hbEFzc2V0U2VsZWN0b3JbMl1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfX2xvYWRBc3NldEZyb21QYXRoKHByb2Nlc3NlZFBhdGgsIGxvY2FsQ1NCSWRlbnRpZmllciwgY3VycmVudEluZGV4LCBjYWxsYmFjaykge1xuICAgICAgICBfX2xvYWRSYXdDU0IobG9jYWxDU0JJZGVudGlmaWVyLCAoZXJyLCByYXdDU0IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRJbmRleCA8IHByb2Nlc3NlZFBhdGguQ1NCQWxpYXNlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXh0QWxpYXMgPSBwcm9jZXNzZWRQYXRoLkNTQkFsaWFzZXNbY3VycmVudEluZGV4XTtcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldCA9IHJhd0NTQi5nZXRBc3NldChcImdsb2JhbC5DU0JSZWZlcmVuY2VcIiwgbmV4dEFsaWFzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdDU0JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoYXNzZXQuZHNlZWQpO1xuXG4gICAgICAgICAgICAgICAgX19sb2FkQXNzZXRGcm9tUGF0aChwcm9jZXNzZWRQYXRoLCBuZXdDU0JJZGVudGlmaWVyLCArK2N1cnJlbnRJbmRleCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYXNzZXQgPSByYXdDU0IuZ2V0QXNzZXQocHJvY2Vzc2VkUGF0aC5hc3NldFR5cGUsIHByb2Nlc3NlZFBhdGguYXNzZXRBaWQpO1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgYXNzZXQsIHJhd0NTQik7XG5cbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfX3dyaXRlUmF3Q1NCKHJhd0NTQiwgbG9jYWxDU0JJZGVudGlmaWVyLCBjYWxsYmFjaykge1xuICAgICAgICBjcnlwdG8uZW5jcnlwdE9iamVjdChyYXdDU0IuYmxvY2tjaGFpbiwgbG9jYWxDU0JJZGVudGlmaWVyLmdldERzZWVkKCksIG51bGwsIChlcnIsIGVuY3J5cHRlZEJsb2NrY2hhaW4pID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaGFzaENhZ2UubG9hZEhhc2goKGVyciwgaGFzaE9iaikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gbG9jYWxDU0JJZGVudGlmaWVyLmdldFVpZCgpO1xuICAgICAgICAgICAgICAgIGhhc2hPYmpba2V5XSA9IGNyeXB0by5wc2tIYXNoKGVuY3J5cHRlZEJsb2NrY2hhaW4pLnRvU3RyaW5nKCdoZXgnKTtcblxuICAgICAgICAgICAgICAgIGhhc2hDYWdlLnNhdmVIYXNoKGhhc2hPYmosIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGUodXRpbHMuZ2VuZXJhdGVQYXRoKGxvY2FsRm9sZGVyLCBsb2NhbENTQklkZW50aWZpZXIpLCBlbmNyeXB0ZWRCbG9ja2NoYWluLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX19pbml0aWFsaXplQXNzZXRzKHJhd0NTQiwgY3NiUmVmLCBiYWNrdXBVcmxzKSB7XG5cbiAgICAgICAgbGV0IGlzTWFzdGVyO1xuXG4gICAgICAgIGNvbnN0IGNzYk1ldGEgPSByYXdDU0IuZ2V0QXNzZXQoJ2dsb2JhbC5DU0JNZXRhJywgJ21ldGEnKTtcbiAgICAgICAgaWYgKGN1cnJlbnRSYXdDU0IgPT09IHJhd0NTQikge1xuICAgICAgICAgICAgaXNNYXN0ZXIgPSB0eXBlb2YgY3NiTWV0YS5pc01hc3RlciA9PT0gJ3VuZGVmaW5lZCcgPyB0cnVlIDogY3NiTWV0YS5pc01hc3RlcjtcbiAgICAgICAgICAgIGlmICghY3NiTWV0YS5pZCkge1xuICAgICAgICAgICAgICAgIGNzYk1ldGEuaW5pdCgkJC51aWRHZW5lcmF0b3Iuc2FmZV91dWlkKCkpO1xuICAgICAgICAgICAgICAgIGNzYk1ldGEuc2V0SXNNYXN0ZXIoaXNNYXN0ZXIpO1xuICAgICAgICAgICAgICAgIHJhd0NTQi5zYXZlQXNzZXQoY3NiTWV0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBiYWNrdXBVcmxzLmZvckVhY2goKHVybCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVpZCA9ICQkLnVpZEdlbmVyYXRvci5zYWZlX3V1aWQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBiYWNrdXAgPSByYXdDU0IuZ2V0QXNzZXQoJ2dsb2JhbC5CYWNrdXAnLCB1aWQpO1xuICAgICAgICAgICAgICAgIGJhY2t1cC5pbml0KHVpZCwgdXJsKTtcbiAgICAgICAgICAgICAgICByYXdDU0Iuc2F2ZUFzc2V0KGJhY2t1cCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaXNNYXN0ZXIgPSB0eXBlb2YgY3NiTWV0YS5pc01hc3RlciA9PT0gJ3VuZGVmaW5lZCcgPyBmYWxzZSA6IGNzYk1ldGEuaXNNYXN0ZXI7XG4gICAgICAgICAgICBjc2JNZXRhLmluaXQoY3NiUmVmLmdldE1ldGFkYXRhKCdzd2FybUlkJykpO1xuICAgICAgICAgICAgY3NiTWV0YS5zZXRJc01hc3Rlcihpc01hc3Rlcik7XG4gICAgICAgICAgICByYXdDU0Iuc2F2ZUFzc2V0KGNzYk1ldGEpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGNyZWF0ZVJvb3RDU0IobG9jYWxGb2xkZXIsIG1hc3RlclJhd0NTQiwgY3NiSWRlbnRpZmllciwgcGluLCBjYWxsYmFjaykge1xuICAgIGxldCBtYXN0ZXJEc2VlZDtcblxuICAgIGlmIChjc2JJZGVudGlmaWVyKSB7XG4gICAgICAgIG1hc3RlckRzZWVkID0gY3NiSWRlbnRpZmllci5nZXREc2VlZCgpO1xuICAgICAgICBpZiAobWFzdGVyUmF3Q1NCKSB7XG4gICAgICAgICAgICBjb25zdCByb290Q1NCID0gbmV3IFJvb3RDU0IobG9jYWxGb2xkZXIsIG1hc3RlclJhd0NTQiwgbWFzdGVyRHNlZWQpO1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHJvb3RDU0IpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGxvYWRXaXRoSWRlbnRpZmllcihsb2NhbEZvbGRlciwgbWFzdGVyRHNlZWQsIGNhbGxiYWNrKTtcbiAgICB9IGVsc2UgaWYgKHBpbikge1xuXG4gICAgICAgIHJldHVybiBsb2FkV2l0aFBpbihsb2NhbEZvbGRlciwgcGluLCBjYWxsYmFjayk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignTWlzc2luZyBzZWVkLCBkc2VlZCBhbmQgcGluLCBhdCBsZWFzdCBvbmUgaXMgcmVxdWlyZWQnKSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBsb2FkV2l0aFBpbihsb2NhbEZvbGRlciwgcGluLCBjYWxsYmFjaykge1xuICAgIG5ldyBEc2VlZENhZ2UobG9jYWxGb2xkZXIpLmxvYWREc2VlZEJhY2t1cHMocGluLCAoZXJyLCBjc2JJZGVudGlmaWVyLCBiYWNrdXBzKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjc2JJZGVudGlmaWVyICYmICghYmFja3VwcyB8fCBiYWNrdXBzLmxlbmd0aCA9PT0gMCkpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjc2JJZGVudGlmaWVyKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sodW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgYmFja3Vwcyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkc2VlZCA9IGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKTtcbiAgICAgICAgY29uc3Qga2V5ID0gY3J5cHRvLmdlbmVyYXRlU2FmZVVpZChkc2VlZCwgbG9jYWxGb2xkZXIpO1xuICAgICAgICBpZiAoIWluc3RhbmNlc1trZXldKSB7XG4gICAgICAgICAgICBpbnN0YW5jZXNba2V5XSA9IG5ldyBSb290Q1NCKGxvY2FsRm9sZGVyLCBudWxsLCBjc2JJZGVudGlmaWVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJvb3RDU0IgPSBpbnN0YW5jZXNba2V5XTtcblxuICAgICAgICByb290Q1NCLmxvYWRSYXdDU0IoJycsIChlcnIpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgcm9vdENTQiwgY3NiSWRlbnRpZmllciwgYmFja3Vwcyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBsb2FkV2l0aElkZW50aWZpZXIobG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgbWFzdGVyRHNlZWQgPSBjc2JJZGVudGlmaWVyLmdldERzZWVkKCk7XG4gICAgY29uc3Qga2V5ID0gY3J5cHRvLmdlbmVyYXRlU2FmZVVpZChtYXN0ZXJEc2VlZCwgbG9jYWxGb2xkZXIpO1xuICAgIGlmICghaW5zdGFuY2VzW2tleV0pIHtcbiAgICAgICAgaW5zdGFuY2VzW2tleV0gPSBuZXcgUm9vdENTQihsb2NhbEZvbGRlciwgbnVsbCwgY3NiSWRlbnRpZmllcik7XG4gICAgfVxuXG4gICAgY29uc3Qgcm9vdENTQiA9IGluc3RhbmNlc1trZXldO1xuICAgIHJvb3RDU0IubG9hZFJhd0NTQignJywgKGVycikgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjayhudWxsLCByb290Q1NCKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTmV3KGxvY2FsRm9sZGVyLCBjc2JJZGVudGlmaWVyLCByYXdDU0IpIHtcbiAgICBpZiAoIWxvY2FsRm9sZGVyIHx8ICFjc2JJZGVudGlmaWVyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgcmVxdWlyZWQgYXJndW1lbnRzXCIpO1xuICAgIH1cblxuICAgIHJhd0NTQiA9IHJhd0NTQiB8fCBuZXcgUmF3Q1NCKCk7XG4gICAgY29uc3QgbWFzdGVyRHNlZWQgPSBjc2JJZGVudGlmaWVyLmdldERzZWVkKCk7XG4gICAgY29uc3Qga2V5ID0gY3J5cHRvLmdlbmVyYXRlU2FmZVVpZChtYXN0ZXJEc2VlZCwgbG9jYWxGb2xkZXIpO1xuICAgIGlmICghaW5zdGFuY2VzW2tleV0pIHtcbiAgICAgICAgaW5zdGFuY2VzW2tleV0gPSBuZXcgUm9vdENTQihsb2NhbEZvbGRlciwgcmF3Q1NCLCBjc2JJZGVudGlmaWVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaW5zdGFuY2VzW2tleV07XG59XG5cbmZ1bmN0aW9uIHdyaXRlTmV3TWFzdGVyQ1NCKGxvY2FsRm9sZGVyLCBjc2JJZGVudGlmaWVyLCBjYWxsYmFjaykge1xuICAgIGlmICghbG9jYWxGb2xkZXIgfHwgIWNzYklkZW50aWZpZXIpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignTWlzc2luZyByZXF1aXJlZCBhcmd1bWVudHMnKSk7XG4gICAgfVxuXG4gICAgY29uc3QgbWFzdGVyRHNlZWQgPSBjc2JJZGVudGlmaWVyLmdldERzZWVkKCk7XG4gICAgY29uc3Qga2V5ID0gY3J5cHRvLmdlbmVyYXRlU2FmZVVpZChtYXN0ZXJEc2VlZCwgbG9jYWxGb2xkZXIpO1xuICAgIGlmICghaW5zdGFuY2VzW2tleV0pIHtcbiAgICAgICAgaW5zdGFuY2VzW2tleV0gPSBuZXcgUm9vdENTQihsb2NhbEZvbGRlciwgbnVsbCwgY3NiSWRlbnRpZmllcik7XG4gICAgfVxuXG4gICAgY29uc3Qgcm9vdENTQiA9IGluc3RhbmNlc1trZXldO1xuICAgIHJvb3RDU0Iuc2F2ZVJhd0NTQihuZXcgUmF3Q1NCKCksICcnLCBjYWxsYmFjayk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNyZWF0ZU5ldyxcbiAgICBjcmVhdGVSb290Q1NCLFxuICAgIGxvYWRXaXRoSWRlbnRpZmllcixcbiAgICBsb2FkV2l0aFBpbixcbiAgICB3cml0ZU5ld01hc3RlckNTQlxufTsiLCJcbmZ1bmN0aW9uIEVWRlNSZXNvbHZlcigpIHtcbiAgICBsZXQgaXNBdXRoZW50aWNhdGVkID0gZmFsc2U7XG5cbiAgICB0aGlzLmF1dGggPSBmdW5jdGlvbiAodXJsLCBhdXRoT2JqLCBjYWxsYmFjaykge1xuICAgICAgICBpc0F1dGhlbnRpY2F0ZWQgPSB0cnVlO1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgIH07XG5cbiAgICB0aGlzLnNhdmUgPSBmdW5jdGlvbiAodXJsLCBjc2JJZGVudGlmaWVyLCBkYXRhU3RyZWFtLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIWlzQXV0aGVudGljYXRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignVW5hdXRoZW50aWNhdGVkJykpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cFBvc3QodXJsICsgXCIvQ1NCL1wiICsgY3NiSWRlbnRpZmllci5nZXRVaWQoKSwgZGF0YVN0cmVhbSwgKGVyciwgcmVzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgcmVzKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMubG9hZCA9IGZ1bmN0aW9uICh1cmwsIGNzYklkZW50aWZpZXIsIHZlcnNpb24sIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghaXNBdXRoZW50aWNhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdVbmF1dGhlbnRpY2F0ZWQnKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIHZlcnNpb24gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSB2ZXJzaW9uO1xuICAgICAgICAgICAgdmVyc2lvbiA9IFwiXCI7XG4gICAgICAgIH1cblxuICAgICAgICAkJC5yZW1vdGUuZG9IdHRwR2V0KHVybCArIFwiL0NTQi9cIiArIGNzYklkZW50aWZpZXIuZ2V0VWlkKCkgKyBcIi9cIiArIHZlcnNpb24sIChlcnIsIHJlc291cmNlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgcmVzb3VyY2UpO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbiAgICB0aGlzLmdldFZlcnNpb25zID0gZnVuY3Rpb24gKHVybCwgY3NiSWRlbnRpZmllciwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFpc0F1dGhlbnRpY2F0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ1VuYXV0aGVudGljYXRlZCcpKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBHZXQodXJsICsgXCIvQ1NCL1wiICsgY3NiSWRlbnRpZmllci5nZXRVaWQoKSArIFwiL3ZlcnNpb25zXCIsIChlcnIsIHZlcnNpb25zKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgSlNPTi5wYXJzZSh2ZXJzaW9ucykpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5jb21wYXJlVmVyc2lvbnMgPSBmdW5jdGlvbiAodXJsLCBmaWxlc0xpc3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghaXNBdXRoZW50aWNhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdVbmF1dGhlbnRpY2F0ZWQnKSk7XG4gICAgICAgIH1cblxuICAgICAgICAkJC5yZW1vdGUuZG9IdHRwUG9zdCh1cmwgKyBcIi9DU0IvY29tcGFyZVZlcnNpb25zXCIsIEpTT04uc3RyaW5naWZ5KGZpbGVzTGlzdCksIChlcnIsIG1vZGlmaWVkRmlsZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBtb2RpZmllZEZpbGVzKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFVkZTUmVzb2x2ZXI7IiwiY29uc3QgZmxvd3NVdGlscyA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9mbG93c1V0aWxzXCIpO1xuY29uc3QgdmFsaWRhdG9yID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL3ZhbGlkYXRvclwiKTtcbmNvbnN0IERzZWVkQ2FnZSA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9Ec2VlZENhZ2VcIik7XG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG4kJC5zd2FybS5kZXNjcmliZShcImFkZEJhY2t1cFwiLCB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uIChiYWNrdXBVcmwsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICBpZighYmFja3VwVXJsKXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBuZXcgRXJyb3IoXCJObyBiYWNrdXAgdXJsIHByb3ZpZGVkXCIpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5iYWNrdXBVcmwgPSBiYWNrdXBVcmw7XG4gICAgICAgIGZzLnN0YXQocGF0aC5qb2luKHRoaXMubG9jYWxGb2xkZXIsIFwiLnByaXZhdGVTa3lcIiwgJ2RzZWVkJyksIChlcnIsIHN0YXRzKT0+e1xuICAgICAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJjcmVhdGVQaW5cIiwgZmxvd3NVdGlscy5kZWZhdWx0UGluLCBmbG93c1V0aWxzLm5vVHJpZXMpO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFBpblwiLCBmbG93c1V0aWxzLm5vVHJpZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgdmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4pIHtcbiAgICAgICAgdmFsaWRhdG9yLnZhbGlkYXRlUGluKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMsIFwiYWRkQmFja3VwXCIsIHBpbiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICB9LFxuICAgIFxuICAgIGFkZEJhY2t1cDogZnVuY3Rpb24gKHBpbiA9IGZsb3dzVXRpbHMuZGVmYXVsdFBpbiwgYmFja3Vwcykge1xuICAgICAgICBiYWNrdXBzID0gYmFja3VwcyB8fCBbXTtcbiAgICAgICAgYmFja3Vwcy5wdXNoKHRoaXMuYmFja3VwVXJsKTtcbiAgICAgICAgY29uc3QgZHNlZWRDYWdlID0gbmV3IERzZWVkQ2FnZSh0aGlzLmxvY2FsRm9sZGVyKTtcbiAgICAgICAgZHNlZWRDYWdlLnNhdmVEc2VlZEJhY2t1cHMocGluLCB0aGlzLmNzYklkZW50aWZpZXIsIGJhY2t1cHMsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsICdmaW5pc2gnLCBcIkZhaWxlZCB0byBzYXZlIGJhY2t1cHNcIikpO1xuICAgIH0sXG5cbiAgICBmaW5pc2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsICdwcmludEluZm8nLCB0aGlzLmJhY2t1cFVybCArICcgaGFzIGJlZW4gc3VjY2Vzc2Z1bGx5IGFkZGVkIHRvIGJhY2t1cHMgbGlzdC4nKTtcbiAgICB9XG59KTsiLCIvLyB2YXIgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuXG5jb25zdCB1dGlscyA9IHJlcXVpcmUoXCIuLy4uLy4uL3V0aWxzL2Zsb3dzVXRpbHNcIik7XG4vLyBjb25zdCBjcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuLy8gdmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xuXG4kJC5zd2FybS5kZXNjcmliZShcImFkZENzYlwiLCB7XG5cdHN0YXJ0OiBmdW5jdGlvbiAoYWxpYXNDc2IsIGFsaWFzRGVzdENzYikge1xuXHRcdHRoaXMuYWxpYXNDc2IgPSBhbGlhc0NzYjtcblx0XHR0aGlzLmFsaWFzRGVzdENzYiA9IGFsaWFzRGVzdENzYjtcblx0XHR0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIDMpO1xuXHR9LFxuXHR2YWxpZGF0ZVBpbjogZnVuY3Rpb24gKHBpbiwgbm9Ucmllcykge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR1dGlscy5jaGVja1BpbklzVmFsaWQocGluLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRpZihlcnIpe1xuXHRcdFx0XHRzZWxmLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIG5vVHJpZXMtMSk7XG5cdFx0XHR9ZWxzZSB7XG5cdFx0XHRcdHNlbGYuYWRkQ3NiKHBpbiwgc2VsZi5hbGlhc0NzYik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdGFkZENzYjogZnVuY3Rpb24gKHBpbiwgYWxpYXNDU2IsIGFsaWFzRGVzdENzYiwgY2FsbGJhY2spIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dXRpbHMuZ2V0Q3NiKHBpbiwgYWxpYXNDU2IsIGZ1bmN0aW9uIChlcnIsIHBhcmVudENzYikge1xuXHRcdFx0aWYoZXJyKXtcblx0XHRcdFx0c2VsZi5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgZXJyLCBcIkZhaWxlZCB0byBnZXQgY3NiXCIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59KTsiLCJjb25zdCBmbG93c1V0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IHV0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvdXRpbHNcIik7XG5jb25zdCBjcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuY29uc3QgdmFsaWRhdG9yID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL3ZhbGlkYXRvclwiKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKFwiLi4vQ1NCSWRlbnRpZmllclwiKTtcbmNvbnN0IEhhc2hDYWdlID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMvSGFzaENhZ2UnKTtcbmNvbnN0IFJvb3RDU0IgPSByZXF1aXJlKFwiLi4vUm9vdENTQlwiKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJhdHRhY2hGaWxlXCIsIHsgLy91cmw6IENTQjEvQ1NCMi9hbGlhc0ZpbGVcbiAgICBzdGFydDogZnVuY3Rpb24gKHVybCwgZmlsZVBhdGgsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkgeyAvL2NzYjE6YXNzZXRUeXBlOmFsaWFzXG4gICAgICAgIGNvbnN0IHtDU0JQYXRoLCBhbGlhc30gPSB1dGlscy5wcm9jZXNzVXJsKHVybCwgJ0ZpbGVSZWZlcmVuY2UnKTtcbiAgICAgICAgdGhpcy5DU0JQYXRoID0gQ1NCUGF0aDtcbiAgICAgICAgdGhpcy5hbGlhcyA9IGFsaWFzO1xuICAgICAgICB0aGlzLmZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFBpblwiLCBmbG93c1V0aWxzLm5vVHJpZXMpO1xuICAgIH0sXG5cbiAgICB2YWxpZGF0ZVBpbjogZnVuY3Rpb24gKHBpbiwgbm9Ucmllcykge1xuICAgICAgICB2YWxpZGF0b3IudmFsaWRhdGVQaW4odGhpcy5sb2NhbEZvbGRlciwgdGhpcywgJ2xvYWRGaWxlUmVmZXJlbmNlJywgcGluLCBub1RyaWVzKTtcbiAgICB9LFxuXG4gICAgd2l0aENTQklkZW50aWZpZXI6IGZ1bmN0aW9uIChpZCwgdXJsLCBmaWxlUGF0aCwgbG9jYWxGb2xkZXIgPSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgICAgIGNvbnN0IHtDU0JQYXRoLCBhbGlhc30gPSB1dGlscy5wcm9jZXNzVXJsKHVybCwgJ0ZpbGVSZWZlcmVuY2UnKTtcbiAgICAgICAgdGhpcy5DU0JQYXRoID0gQ1NCUGF0aDtcbiAgICAgICAgdGhpcy5hbGlhcyA9IGFsaWFzO1xuICAgICAgICB0aGlzLmZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5jc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoaWQpO1xuICAgICAgICBSb290Q1NCLmxvYWRXaXRoSWRlbnRpZmllcih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLmNzYklkZW50aWZpZXIsIChlcnIsIHJvb3RDU0IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBlcnIsIFwiRmFpbGVkIHRvIGxvYWQgcm9vdENTQlwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMucm9vdENTQiA9IHJvb3RDU0I7XG4gICAgICAgICAgICB0aGlzLmxvYWRGaWxlUmVmZXJlbmNlKCk7XG5cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGxvYWRGaWxlUmVmZXJlbmNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucm9vdENTQi5sb2FkUmF3Q1NCKCcnLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnbG9hZEFzc2V0JywgJ0ZhaWxlZCB0byBsb2FkIG1hc3RlckNTQi4nKSk7XG4gICAgfSxcblxuICAgIGxvYWRBc3NldDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJvb3RDU0IubG9hZEFzc2V0RnJvbVBhdGgodGhpcy5DU0JQYXRoLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnc2F2ZUZpbGVUb0Rpc2snLCAnRmFpbGVkIHRvIGxvYWQgYXNzZXQnKSk7XG4gICAgfSxcblxuICAgIHNhdmVGaWxlVG9EaXNrOiBmdW5jdGlvbiAoZmlsZVJlZmVyZW5jZSkge1xuICAgICAgICBpZiAoZmlsZVJlZmVyZW5jZS5pc1BlcnNpc3RlZCgpKSB7XG4gICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBuZXcgRXJyb3IoXCJGaWxlIGlzIHBlcnNpc3RlZFwiKSwgXCJBIGZpbGUgd2l0aCB0aGUgc2FtZSBhbGlhcyBhbHJlYWR5IGV4aXN0cyBcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIodW5kZWZpbmVkLCB0aGlzLmNzYklkZW50aWZpZXIuZ2V0QmFja3VwVXJscygpKTtcbiAgICAgICAgdGhpcy5maWxlSUQgPSB1dGlscy5nZW5lcmF0ZVBhdGgodGhpcy5sb2NhbEZvbGRlciwgY3NiSWRlbnRpZmllcik7XG4gICAgICAgIGNyeXB0by5vbigncHJvZ3Jlc3MnLCAocHJvZ3Jlc3MpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ3JlcG9ydFByb2dyZXNzJywgcHJvZ3Jlc3MpO1xuICAgICAgICB9KTtcbiAgICAgICAgY3J5cHRvLmVuY3J5cHRTdHJlYW0odGhpcy5maWxlUGF0aCwgdGhpcy5maWxlSUQsIGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKSwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgJ3NhdmVGaWxlUmVmZXJlbmNlJywgXCJGYWlsZWQgYXQgZmlsZSBlbmNyeXB0aW9uLlwiLCBmaWxlUmVmZXJlbmNlLCBjc2JJZGVudGlmaWVyKSk7XG5cbiAgICB9LFxuXG5cbiAgICBzYXZlRmlsZVJlZmVyZW5jZTogZnVuY3Rpb24gKGZpbGVSZWZlcmVuY2UsIGNzYklkZW50aWZpZXIpIHtcbiAgICAgICAgY3J5cHRvLnJlbW92ZUFsbExpc3RlbmVycygncHJvZ3Jlc3MnKTtcbiAgICAgICAgZmlsZVJlZmVyZW5jZS5pbml0KHRoaXMuYWxpYXMsIGNzYklkZW50aWZpZXIuZ2V0U2VlZCgpLCBjc2JJZGVudGlmaWVyLmdldERzZWVkKCkpO1xuICAgICAgICB0aGlzLnJvb3RDU0Iuc2F2ZUFzc2V0VG9QYXRoKHRoaXMuQ1NCUGF0aCwgZmlsZVJlZmVyZW5jZSwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgJ2NvbXB1dGVIYXNoJywgXCJGYWlsZWQgdG8gc2F2ZSBmaWxlXCIsIHRoaXMuZmlsZUlEKSk7XG4gICAgfSxcblxuXG4gICAgY29tcHV0ZUhhc2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc3QgZmlsZVN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0odGhpcy5maWxlSUQpO1xuICAgICAgICBjcnlwdG8ucHNrSGFzaFN0cmVhbShmaWxlU3RyZWFtLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImxvYWRIYXNoT2JqXCIsIFwiRmFpbGVkIHRvIGNvbXB1dGUgaGFzaFwiKSk7XG4gICAgfSxcblxuICAgIGxvYWRIYXNoT2JqOiBmdW5jdGlvbiAoZGlnZXN0KSB7XG4gICAgICAgIHRoaXMuaGFzaENhZ2UgPSBuZXcgSGFzaENhZ2UodGhpcy5sb2NhbEZvbGRlcik7XG4gICAgICAgIHRoaXMuaGFzaENhZ2UubG9hZEhhc2godmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJhZGRUb0hhc2hPYmpcIiwgXCJGYWlsZWQgdG8gbG9hZCBoYXNoT2JqXCIsIGRpZ2VzdCkpO1xuICAgIH0sXG5cbiAgICBhZGRUb0hhc2hPYmo6IGZ1bmN0aW9uIChoYXNoT2JqLCBkaWdlc3QpIHtcbiAgICAgICAgaGFzaE9ialtwYXRoLmJhc2VuYW1lKHRoaXMuZmlsZUlEKV0gPSBkaWdlc3QudG9TdHJpbmcoXCJoZXhcIik7XG4gICAgICAgIHRoaXMuaGFzaENhZ2Uuc2F2ZUhhc2goaGFzaE9iaiwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJwcmludFN1Y2Nlc3NcIiwgXCJGYWlsZWQgdG8gc2F2ZSBoYXNoT2JqXCIpKTtcbiAgICB9LFxuXG4gICAgcHJpbnRTdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInByaW50SW5mb1wiLCB0aGlzLmZpbGVQYXRoICsgXCIgaGFzIGJlZW4gc3VjY2Vzc2Z1bGx5IGFkZGVkIHRvIFwiICsgdGhpcy5DU0JQYXRoKTtcbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiX19yZXR1cm5fX1wiKTtcbiAgICB9XG59KTtcbiIsImNvbnN0IGZsb3dzVXRpbHMgPSByZXF1aXJlKCcuLi8uLi91dGlscy9mbG93c1V0aWxzJyk7XG5jb25zdCBSb290Q1NCID0gcmVxdWlyZShcIi4uL1Jvb3RDU0JcIik7XG5jb25zdCBSYXdDU0IgPSByZXF1aXJlKFwiLi4vUmF3Q1NCXCIpO1xuY29uc3QgdmFsaWRhdG9yID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL3ZhbGlkYXRvclwiKTtcbmNvbnN0IERzZWVkQ2FnZSA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9Ec2VlZENhZ2VcIik7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZShcIi4uL0NTQklkZW50aWZpZXJcIik7XG5cbiQkLnN3YXJtLmRlc2NyaWJlKFwiY3JlYXRlQ3NiXCIsIHtcbiAgICBzdGFydDogZnVuY3Rpb24gKENTQlBhdGgsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuQ1NCUGF0aCA9IENTQlBhdGggfHwgJyc7XG4gICAgICAgIHZhbGlkYXRvci5jaGVja01hc3RlckNTQkV4aXN0cyhsb2NhbEZvbGRlciwgKGVyciwgc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiY3JlYXRlUGluXCIsIGZsb3dzVXRpbHMuZGVmYXVsdFBpbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHdpdGhvdXRQaW46IGZ1bmN0aW9uIChDU0JQYXRoLCBiYWNrdXBzLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCksIHNlZWQsIGlzTWFzdGVyID0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICB0aGlzLkNTQlBhdGggPSBDU0JQYXRoO1xuICAgICAgICB0aGlzLmlzTWFzdGVyID0gaXNNYXN0ZXI7XG4gICAgICAgIGlmICh0eXBlb2YgYmFja3VwcyA9PT0gJ3VuZGVmaW5lZCcgfHwgYmFja3Vwcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGJhY2t1cHMgPSBbIGZsb3dzVXRpbHMuZGVmYXVsdEJhY2t1cCBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFsaWRhdG9yLmNoZWNrTWFzdGVyQ1NCRXhpc3RzKGxvY2FsRm9sZGVyLCAoZXJyLCBzdGF0dXMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZU1hc3RlckNTQihiYWNrdXBzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKHNlZWQpO1xuICAgICAgICAgICAgICAgIHRoaXMud2l0aENTQklkZW50aWZpZXIoQ1NCUGF0aCwgY3NiSWRlbnRpZmllcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIHdpdGhDU0JJZGVudGlmaWVyOiBmdW5jdGlvbiAoQ1NCUGF0aCwgY3NiSWRlbnRpZmllcikge1xuICAgICAgICB0aGlzLkNTQlBhdGggPSBDU0JQYXRoO1xuICAgICAgICBSb290Q1NCLmxvYWRXaXRoSWRlbnRpZmllcih0aGlzLmxvY2FsRm9sZGVyLCBjc2JJZGVudGlmaWVyLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnY3JlYXRlQ1NCJywgJ0ZhaWxlZCB0byBsb2FkIG1hc3RlciB3aXRoIHByb3ZpZGVkIGRzZWVkJykpO1xuICAgIH0sXG5cbiAgICB2YWxpZGF0ZVBpbjogZnVuY3Rpb24gKHBpbiwgbm9Ucmllcykge1xuICAgICAgICB2YWxpZGF0b3IudmFsaWRhdGVQaW4odGhpcy5sb2NhbEZvbGRlciwgdGhpcywgXCJjcmVhdGVDU0JcIiwgcGluLCBub1RyaWVzKTtcbiAgICB9LFxuXG4gICAgbG9hZEJhY2t1cHM6IGZ1bmN0aW9uIChwaW4pIHtcbiAgICAgICAgdGhpcy5waW4gPSBwaW47XG4gICAgICAgIHRoaXMuZHNlZWRDYWdlID0gbmV3IERzZWVkQ2FnZSh0aGlzLmxvY2FsRm9sZGVyKTtcbiAgICAgICAgdGhpcy5kc2VlZENhZ2UubG9hZERzZWVkQmFja3Vwcyh0aGlzLnBpbiwgKGVyciwgY3NiSWRlbnRpZmllciwgYmFja3VwcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlTWFzdGVyQ1NCKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlTWFzdGVyQ1NCKGJhY2t1cHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgY3JlYXRlTWFzdGVyQ1NCOiBmdW5jdGlvbiAoYmFja3Vwcykge1xuICAgICAgICB0aGlzLmNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcih1bmRlZmluZWQsIGJhY2t1cHMgfHwgZmxvd3NVdGlscy5kZWZhdWx0QmFja3VwKTtcblxuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJwcmludFNlbnNpdGl2ZUluZm9cIiwgdGhpcy5jc2JJZGVudGlmaWVyLmdldFNlZWQoKSwgZmxvd3NVdGlscy5kZWZhdWx0UGluKTtcblxuICAgICAgICBjb25zdCByYXdDU0IgPSBuZXcgUmF3Q1NCKCk7XG4gICAgICAgIGNvbnN0IG1ldGEgPSByYXdDU0IuZ2V0QXNzZXQoJ2dsb2JhbC5DU0JNZXRhJywgJ21ldGEnKTtcbiAgICAgICAgbWV0YS5pbml0KCk7XG4gICAgICAgIG1ldGEuc2V0SXNNYXN0ZXIodHJ1ZSk7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5pc01hc3RlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIG1ldGEuc2V0SXNNYXN0ZXIodGhpcy5pc01hc3Rlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmF3Q1NCLnNhdmVBc3NldChtZXRhKTtcbiAgICAgICAgdGhpcy5yb290Q1NCID0gUm9vdENTQi5jcmVhdGVOZXcodGhpcy5sb2NhbEZvbGRlciwgdGhpcy5jc2JJZGVudGlmaWVyLCByYXdDU0IpO1xuICAgICAgICBjb25zdCBuZXh0UGhhc2UgPSAodGhpcy5DU0JQYXRoID09PSAnJyB8fCB0eXBlb2YgdGhpcy5DU0JQYXRoID09PSAndW5kZWZpbmVkJykgPyAnc2F2ZVJhd0NTQicgOiAnY3JlYXRlQ1NCJztcbiAgICAgICAgaWYgKHRoaXMucGluKSB7XG4gICAgICAgICAgICB0aGlzLmRzZWVkQ2FnZS5zYXZlRHNlZWRCYWNrdXBzKHRoaXMucGluLCB0aGlzLmNzYklkZW50aWZpZXIsIGJhY2t1cHMsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIG5leHRQaGFzZSwgXCJGYWlsZWQgdG8gc2F2ZSBkc2VlZCBcIikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpc1tuZXh0UGhhc2VdKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgY3JlYXRlQ1NCOiBmdW5jdGlvbiAocm9vdENTQikge1xuICAgICAgICB0aGlzLnJvb3RDU0IgPSB0aGlzLnJvb3RDU0IgfHwgcm9vdENTQjtcbiAgICAgICAgY29uc3QgcmF3Q1NCID0gbmV3IFJhd0NTQigpO1xuICAgICAgICBjb25zdCBtZXRhID0gcmF3Q1NCLmdldEFzc2V0KFwiZ2xvYmFsLkNTQk1ldGFcIiwgXCJtZXRhXCIpO1xuICAgICAgICBtZXRhLmluaXQoKTtcbiAgICAgICAgbWV0YS5zZXRJc01hc3RlcihmYWxzZSk7XG4gICAgICAgIHJhd0NTQi5zYXZlQXNzZXQobWV0YSk7XG4gICAgICAgIHRoaXMuc2F2ZVJhd0NTQihyYXdDU0IpO1xuICAgIH0sXG5cbiAgICBzYXZlUmF3Q1NCOiBmdW5jdGlvbiAocmF3Q1NCKSB7XG4gICAgICAgIHRoaXMucm9vdENTQi5zYXZlUmF3Q1NCKHJhd0NTQiwgdGhpcy5DU0JQYXRoLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcInByaW50U3VjY2Vzc1wiLCBcIkZhaWxlZCB0byBzYXZlIHJhdyBDU0JcIikpO1xuXG4gICAgfSxcblxuXG4gICAgcHJpbnRTdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBtZXNzYWdlID0gXCJTdWNjZXNzZnVsbHkgc2F2ZWQgQ1NCIGF0IHBhdGggXCIgKyB0aGlzLkNTQlBhdGg7XG4gICAgICAgIGlmICghdGhpcy5DU0JQYXRoIHx8IHRoaXMuQ1NCUGF0aCA9PT0gJycpIHtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSAnU3VjY2Vzc2Z1bGx5IHNhdmVkIENTQiByb290JztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJwcmludEluZm9cIiwgbWVzc2FnZSk7XG4gICAgICAgIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ19fcmV0dXJuX18nKTtcbiAgICB9XG59KTtcbiIsImNvbnN0IGZsb3dzVXRpbHMgPSByZXF1aXJlKFwiLi8uLi8uLi91dGlscy9mbG93c1V0aWxzXCIpO1xuY29uc3QgdXRpbHMgPSByZXF1aXJlKFwiLi8uLi8uLi91dGlscy91dGlsc1wiKTtcbmNvbnN0IGNyeXB0byA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5jb25zdCB2YWxpZGF0b3IgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvdmFsaWRhdG9yXCIpO1xuY29uc3QgQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoXCIuLi9DU0JJZGVudGlmaWVyXCIpO1xuXG4kJC5zd2FybS5kZXNjcmliZShcImV4dHJhY3RGaWxlXCIsIHtcblx0c3RhcnQ6IGZ1bmN0aW9uICh1cmwsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuXHRcdHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcblx0XHRjb25zdCB7Q1NCUGF0aCwgYWxpYXN9ID0gdXRpbHMucHJvY2Vzc1VybCh1cmwsICdnbG9iYWwuRmlsZVJlZmVyZW5jZScpO1xuXHRcdHRoaXMuQ1NCUGF0aCA9IENTQlBhdGg7XG5cdFx0dGhpcy5hbGlhcyA9IGFsaWFzO1xuXHRcdHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcblx0fSxcblxuXHR2YWxpZGF0ZVBpbjogZnVuY3Rpb24gKHBpbiwgbm9Ucmllcykge1xuXHRcdHZhbGlkYXRvci52YWxpZGF0ZVBpbih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLCBcImxvYWRGaWxlQXNzZXRcIiwgcGluLCBub1RyaWVzKTtcblx0fSxcblxuXHRsb2FkRmlsZUFzc2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5yb290Q1NCLmxvYWRBc3NldEZyb21QYXRoKHRoaXMuQ1NCUGF0aCwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJkZWNyeXB0RmlsZVwiLCBcIkZhaWxlZCB0byBsb2FkIGZpbGUgYXNzZXQgXCIgKyB0aGlzLmFsaWFzKSk7XG5cdH0sXG5cdFxuXHRkZWNyeXB0RmlsZTogZnVuY3Rpb24gKGZpbGVSZWZlcmVuY2UpIHtcblx0XHRjb25zdCBjc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoZmlsZVJlZmVyZW5jZS5kc2VlZCk7XG5cdFx0Y29uc3QgZmlsZVBhdGggPSB1dGlscy5nZW5lcmF0ZVBhdGgodGhpcy5sb2NhbEZvbGRlciwgY3NiSWRlbnRpZmllcik7XG5cblx0XHRjcnlwdG8ub24oJ3Byb2dyZXNzJywgKHByb2dyZXNzKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdyZXBvcnRQcm9ncmVzcycsIHByb2dyZXNzKTtcbiAgICAgICAgfSk7XG5cblx0XHRjcnlwdG8uZGVjcnlwdFN0cmVhbShmaWxlUGF0aCwgdGhpcy5sb2NhbEZvbGRlciwgY3NiSWRlbnRpZmllci5nZXREc2VlZCgpLCAoZXJyLCBmaWxlTmFtZXMpID0+IHtcblx0XHRcdGlmKGVycil7XG5cdFx0XHRcdHJldHVybiB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBlcnIsIFwiRmFpbGVkIHRvIGRlY3J5cHQgZmlsZVwiICsgZmlsZVBhdGgpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJwcmludEluZm9cIiwgdGhpcy5hbGlhcyArIFwiIHdhcyBzdWNjZXNzZnVsbHkgZXh0cmFjdGVkLiBcIik7XG5cdFx0XHR0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJfX3JldHVybl9fXCIsIGZpbGVOYW1lcyk7XG5cdFx0fSk7XG5cdH1cbn0pOyIsInJlcXVpcmUoXCJjYWxsZmxvd1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSAkJC5saWJyYXJ5KGZ1bmN0aW9uICgpIHtcbiAgICByZXF1aXJlKCcuL2FkZENzYicpO1xuICAgIHJlcXVpcmUoJy4vYWRkQmFja3VwJyk7XG4gICAgcmVxdWlyZSgnLi9hdHRhY2hGaWxlJyk7XG4gICAgcmVxdWlyZSgnLi9jcmVhdGVDc2InKTtcbiAgICByZXF1aXJlKCcuL2V4dHJhY3RGaWxlJyk7XG4gICAgcmVxdWlyZSgnLi9saXN0Q1NCcycpO1xuICAgIHJlcXVpcmUoJy4vcmVzZXRQaW4nKTtcbiAgICByZXF1aXJlKCcuL3Jlc3RvcmUnKTtcbiAgICByZXF1aXJlKCcuL3JlY2VpdmUnKTtcblx0cmVxdWlyZSgnLi9zYXZlQmFja3VwJyk7XG4gICAgcmVxdWlyZSgnLi9zZXRQaW4nKTtcbn0pO1xuXG5cbiIsImNvbnN0IGZsb3dzVXRpbHMgPSByZXF1aXJlKFwiLi8uLi8uLi91dGlscy9mbG93c1V0aWxzXCIpO1xuY29uc3QgdmFsaWRhdG9yID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL3ZhbGlkYXRvclwiKTtcbi8vIGNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgUm9vdENTQiA9IHJlcXVpcmUoXCIuLi9Sb290Q1NCXCIpO1xuY29uc3QgQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoXCIuLi9DU0JJZGVudGlmaWVyXCIpO1xuXG4kJC5zd2FybS5kZXNjcmliZShcImxpc3RDU0JzXCIsIHtcbiAgICBzdGFydDogZnVuY3Rpb24gKENTQlBhdGgsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuQ1NCUGF0aCA9IENTQlBhdGggfHwgJyc7XG4gICAgICAgIHZhbGlkYXRvci5jaGVja01hc3RlckNTQkV4aXN0cyhsb2NhbEZvbGRlciwgKGVyciwgc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwibm9NYXN0ZXJDU0JFeGlzdHNcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHdpdGhDU0JJZGVudGlmaWVyOiBmdW5jdGlvbiAoaWQsIENTQlBhdGggPSAnJywgbG9jYWxGb2xkZXIgPSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgICAgIHRoaXMuY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKGlkKTtcbiAgICAgICAgdGhpcy5DU0JQYXRoID0gQ1NCUGF0aDtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICB0aGlzLmxvYWRNYXN0ZXJSYXdDU0IoKTtcbiAgICB9LFxuXG4gICAgbG9hZE1hc3RlclJhd0NTQjogZnVuY3Rpb24gKCkge1xuICAgICAgICBSb290Q1NCLmxvYWRXaXRoSWRlbnRpZmllcih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLmNzYklkZW50aWZpZXIsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwibG9hZFJhd0NTQlwiLCBcIkZhaWxlZCB0byBjcmVhdGUgUm9vdENTQi5cIikpO1xuICAgIH0sXG5cbiAgICB2YWxpZGF0ZVBpbjogZnVuY3Rpb24gKHBpbiwgbm9Ucmllcykge1xuICAgICAgICB2YWxpZGF0b3IudmFsaWRhdGVQaW4odGhpcy5sb2NhbEZvbGRlciwgdGhpcywgJ2xvYWRSYXdDU0InLCBwaW4sIG5vVHJpZXMpO1xuICAgIH0sXG5cbiAgICBsb2FkUmF3Q1NCOiBmdW5jdGlvbiAocm9vdENTQikge1xuICAgICAgICBpZih0eXBlb2YgdGhpcy5yb290Q1NCID09PSBcInVuZGVmaW5lZFwiICYmIHJvb3RDU0Ipe1xuICAgICAgICAgICAgdGhpcy5yb290Q1NCID0gcm9vdENTQjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJvb3RDU0IubG9hZFJhd0NTQih0aGlzLkNTQlBhdGgsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsICdnZXRDU0JzJywgJ0ZhaWxlZCB0byBsb2FkIHJhd0NTQicpKTtcbiAgICB9LFxuXG4gICAgZ2V0Q1NCczogZnVuY3Rpb24gKHJhd0NTQikge1xuICAgICAgICBjb25zdCBjc2JSZWZlcmVuY2VzID0gcmF3Q1NCLmdldEFsbEFzc2V0cygnZ2xvYmFsLkNTQlJlZmVyZW5jZScpO1xuICAgICAgICBjb25zdCBjc2JzQWxpYXNlcyA9IGNzYlJlZmVyZW5jZXMubWFwKChyZWYpID0+IHJlZi5hbGlhcyk7XG5cbiAgICAgICAgY29uc3QgZmlsZVJlZmVyZW5jZXMgPSByYXdDU0IuZ2V0QWxsQXNzZXRzKCdnbG9iYWwuRmlsZVJlZmVyZW5jZScpO1xuICAgICAgICBjb25zdCBmaWxlc0FsaWFzZXMgPSBmaWxlUmVmZXJlbmNlcy5tYXAoKHJlZikgPT4gcmVmLmFsaWFzKTtcblxuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJfX3JldHVybl9fXCIsIHtcbiAgICAgICAgICAgIGNzYnM6IGNzYnNBbGlhc2VzLFxuICAgICAgICAgICAgZmlsZXM6IGZpbGVzQWxpYXNlc1xuICAgICAgICB9KTtcbiAgICB9XG5cbn0pO1xuIiwiXG4kJC5zd2FybS5kZXNjcmliZShcInJlY2VpdmVcIiwge1xuICAgIHN0YXJ0OiBmdW5jdGlvbiAoZW5kcG9pbnQsIGNoYW5uZWwpIHtcblxuICAgICAgICBjb25zdCBhbGlhcyA9ICdyZW1vdGUnO1xuICAgICAgICAkJC5yZW1vdGUuY3JlYXRlUmVxdWVzdE1hbmFnZXIoMTAwMCk7XG4gICAgICAgICQkLnJlbW90ZS5uZXdFbmRQb2ludChhbGlhcywgZW5kcG9pbnQsIGNoYW5uZWwpO1xuICAgICAgICAkJC5yZW1vdGVbYWxpYXNdLm9uKCcqJywgJyonLCAoZXJyLCBzd2FybSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIGVyciwgJ0ZhaWxlZCB0byBnZXQgZGF0YSBmcm9tIGNoYW5uZWwnICsgY2hhbm5lbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBzZWVkID0gc3dhcm0ubWV0YS5hcmdzWzBdO1xuICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicHJpbnRTZW5zaXRpdmVJbmZvXCIsIHNlZWQpO1xuXG4gICAgICAgICAgICAkJC5yZW1vdGVbYWxpYXNdLm9mZihcIipcIiwgXCIqXCIpO1xuICAgICAgICB9KTtcblxuICAgIH1cbn0pOyIsImNvbnN0IHV0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IFJvb3RDU0IgPSByZXF1aXJlKFwiLi4vUm9vdENTQlwiKTtcbmNvbnN0IERzZWVkQ2FnZSA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9Ec2VlZENhZ2VcIik7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZShcIi4uL0NTQklkZW50aWZpZXJcIik7XG5cbiQkLnN3YXJtLmRlc2NyaWJlKFwicmVzZXRQaW5cIiwge1xuICAgIHN0YXJ0OiBmdW5jdGlvbiAobG9jYWxGb2xkZXIgPSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFNlZWRcIiwgdXRpbHMubm9Ucmllcyk7XG4gICAgfSxcblxuICAgIHZhbGlkYXRlU2VlZDogZnVuY3Rpb24gKHNlZWQsIG5vVHJpZXMpIHtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgdGhpcy5jc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoc2VlZCk7XG4gICAgICAgICAgICBSb290Q1NCLmxvYWRXaXRoSWRlbnRpZmllcih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLmNzYklkZW50aWZpZXIsIChlcnIsIHJvb3RDU0IpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRTZWVkXCIsIG5vVHJpZXMgLSAxKTtcbiAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaW5zZXJ0UGluXCIsIHV0aWxzLm5vVHJpZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBuZXcgRXJyb3IoJ0ludmFsaWQgc2VlZCcpKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhY3R1YWxpemVQaW46IGZ1bmN0aW9uIChwaW4pIHtcbiAgICAgICAgY29uc3QgZHNlZWRDYWdlID0gbmV3IERzZWVkQ2FnZSh0aGlzLmxvY2FsRm9sZGVyKTtcbiAgICAgICAgZHNlZWRDYWdlLnNhdmVEc2VlZEJhY2t1cHMocGluLCB0aGlzLmNzYklkZW50aWZpZXIsIHVuZGVmaW5lZCwgKGVycik9PntcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImhhbmRsZUVycm9yXCIsIFwiRmFpbGVkIHRvIHNhdmUgZHNlZWQuXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJwcmludEluZm9cIiwgXCJUaGUgcGluIGhhcyBiZWVuIGNoYW5nZWQgc3VjY2Vzc2Z1bGx5LlwiKTtcbiAgICAgICAgfSk7XG4gICAgfVxufSk7XG4iLCJjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCBmbG93c1V0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IHV0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvdXRpbHNcIik7XG5jb25zdCBjcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jb25zdCB2YWxpZGF0b3IgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvdmFsaWRhdG9yXCIpO1xuY29uc3QgRHNlZWRDYWdlID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0RzZWVkQ2FnZVwiKTtcbmNvbnN0IFJvb3RDU0IgPSByZXF1aXJlKCcuLi9Sb290Q1NCJyk7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZSgnLi4vQ1NCSWRlbnRpZmllcicpO1xuY29uc3QgQmFja3VwRW5naW5lID0gcmVxdWlyZSgnLi4vQmFja3VwRW5naW5lJyk7XG5jb25zdCBIYXNoQ2FnZSA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzL0hhc2hDYWdlJyk7XG5jb25zdCBBc3luY0Rpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi8uLi91dGlscy9Bc3luY0Rpc3BhdGNoZXInKTtcblxuXG4kJC5zd2FybS5kZXNjcmliZShcInJlc3RvcmVcIiwge1xuICAgIHN0YXJ0OiBmdW5jdGlvbiAodXJsLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICBpZiAodXJsKSB7XG4gICAgICAgICAgICBjb25zdCB7Q1NCUGF0aCwgYWxpYXN9ID0gdXRpbHMucHJvY2Vzc1VybCh1cmwsICdnbG9iYWwuQ1NCUmVmZXJlbmNlJyk7XG4gICAgICAgICAgICB0aGlzLkNTQlBhdGggPSBDU0JQYXRoO1xuICAgICAgICAgICAgdGhpcy5DU0JBbGlhcyA9IGFsaWFzO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFNlZWRcIik7XG4gICAgfSxcblxuICAgIHdpdGhTZWVkOiBmdW5jdGlvbiAodXJsLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCksIHNlZWRSZXN0b3JlLCBsb2NhbFNlZWQpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICBpZiAodXJsKSB7XG4gICAgICAgICAgICBjb25zdCB7Q1NCUGF0aCwgYWxpYXN9ID0gdXRpbHMucHJvY2Vzc1VybCh1cmwsICdnbG9iYWwuQ1NCUmVmZXJlbmNlJyk7XG4gICAgICAgICAgICB0aGlzLkNTQlBhdGggPSBDU0JQYXRoO1xuICAgICAgICAgICAgdGhpcy5DU0JBbGlhcyA9IGFsaWFzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxvY2FsU2VlZCkge1xuICAgICAgICAgICAgdGhpcy5sb2NhbENTQklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihsb2NhbFNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXN0b3JlQ1NCKHNlZWRSZXN0b3JlKTtcbiAgICB9LFxuXG4gICAgcmVzdG9yZUNTQjogZnVuY3Rpb24gKHJlc3RvcmVTZWVkKSB7XG4gICAgICAgIHRoaXMuaGFzaENhZ2UgPSBuZXcgSGFzaENhZ2UodGhpcy5sb2NhbEZvbGRlcik7XG4gICAgICAgIHRoaXMuaGFzaE9iaiA9IHt9O1xuICAgICAgICB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIocmVzdG9yZVNlZWQpO1xuICAgICAgICBsZXQgYmFja3VwVXJscztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGJhY2t1cFVybHMgPSB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyLmdldEJhY2t1cFVybHMoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgbmV3IEVycm9yKCdJbnZhbGlkIHNlZWQnKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmJhY2t1cFVybHMgPSBiYWNrdXBVcmxzO1xuICAgICAgICB0aGlzLnJlc3RvcmVEc2VlZENhZ2UgPSBuZXcgRHNlZWRDYWdlKHRoaXMubG9jYWxGb2xkZXIpO1xuICAgICAgICBjb25zdCBiYWNrdXBFbmdpbmUgPSBuZXcgQmFja3VwRW5naW5lLmdldEJhY2t1cEVuZ2luZSh0aGlzLmJhY2t1cFVybHMpO1xuXG4gICAgICAgIGJhY2t1cEVuZ2luZS5sb2FkKHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIsIChlcnIsIGVuY3J5cHRlZENTQikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBlcnIsIFwiRmFpbGVkIHRvIHJlc3RvcmUgQ1NCXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9fYWRkQ1NCSGFzaCh0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyLCBlbmNyeXB0ZWRDU0IpO1xuICAgICAgICAgICAgdGhpcy5lbmNyeXB0ZWRDU0IgPSBlbmNyeXB0ZWRDU0I7XG5cbiAgICAgICAgICAgIHZhbGlkYXRvci5jaGVja01hc3RlckNTQkV4aXN0cyh0aGlzLmxvY2FsRm9sZGVyLCAoZXJyLCBzdGF0dXMpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzdGF0dXMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlQXV4Rm9sZGVyKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmxvY2FsQ1NCSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuQ1NCQWxpYXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxzLmRlbGV0ZVJlY3Vyc2l2ZWx5KHRoaXMubG9jYWxGb2xkZXIsIHRydWUsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBuZXcgRXJyb3IoXCJObyBDU0IgYWxpYXMgd2FzIHNwZWNpZmllZFwiKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVDU0IoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5DU0JBbGlhcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImhhbmRsZUVycm9yXCIsIG5ldyBFcnJvcihcIk5vIENTQiBhbGlhcyB3YXMgc3BlY2lmaWVkXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgdmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcbiAgICAgICAgdmFsaWRhdG9yLnZhbGlkYXRlUGluKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMsIFwid3JpdGVDU0JcIiwgcGluLCBub1RyaWVzKTtcbiAgICB9LFxuXG4gICAgY3JlYXRlQXV4Rm9sZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZzLm1rZGlyKHBhdGguam9pbih0aGlzLmxvY2FsRm9sZGVyLCBcIi5wcml2YXRlU2t5XCIpLCB7cmVjdXJzaXZlOiB0cnVlfSwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJ3cml0ZUNTQlwiLCBcIkZhaWxlZCB0byBjcmVhdGUgZm9sZGVyIC5wcml2YXRlU2t5XCIpKTtcbiAgICB9LFxuXG5cbiAgICB3cml0ZUNTQjogZnVuY3Rpb24gKCkge1xuICAgICAgICBmcy53cml0ZUZpbGUodXRpbHMuZ2VuZXJhdGVQYXRoKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIpLCB0aGlzLmVuY3J5cHRlZENTQiwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJjcmVhdGVSb290Q1NCXCIsIFwiRmFpbGVkIHRvIHdyaXRlIG1hc3RlckNTQiB0byBkaXNrXCIpKTtcbiAgICB9LFxuXG4gICAgY3JlYXRlUm9vdENTQjogZnVuY3Rpb24gKCkge1xuICAgICAgICBSb290Q1NCLmxvYWRXaXRoSWRlbnRpZmllcih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImxvYWRSYXdDU0JcIiwgXCJGYWlsZWQgdG8gY3JlYXRlIHJvb3RDU0Igd2l0aCBkc2VlZFwiKSk7XG4gICAgfSxcblxuICAgIGxvYWRSYXdDU0I6IGZ1bmN0aW9uIChyb290Q1NCKSB7XG5cbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIgPSBuZXcgQXN5bmNEaXNwYXRjaGVyKCggZXJycywgc3VjY3MpID0+IHtcbiAgICAgICAgICAgIHRoaXMuaGFzaENhZ2Uuc2F2ZUhhc2godGhpcy5oYXNoT2JqLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBlcnIsICdGYWlsZWQgdG8gc2F2ZSBoYXNoT2JqJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ3ByaW50SW5mbycsICdBbGwgQ1NCcyBoYXZlIGJlZW4gcmVzdG9yZWQuJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnX19yZXR1cm5fXycpO1xuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJvb3RDU0IubG9hZFJhd0NTQignJywgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJjaGVja0NTQlN0YXR1c1wiLCBcIkZhaWxlZCB0byBsb2FkIFJhd0NTQlwiLCByb290Q1NCKSk7XG4gICAgfSxcblxuICAgIGNoZWNrQ1NCU3RhdHVzOiBmdW5jdGlvbiAocmF3Q1NCLCByb290Q1NCKSB7XG4gICAgICAgIHRoaXMucmF3Q1NCID0gcmF3Q1NCO1xuICAgICAgICBjb25zdCBtZXRhID0gdGhpcy5yYXdDU0IuZ2V0QXNzZXQoJ2dsb2JhbC5DU0JNZXRhJywgJ21ldGEnKTtcbiAgICAgICAgaWYgKHRoaXMucm9vdENTQikge1xuICAgICAgICAgICAgdGhpcy5hdHRhY2hDU0IodGhpcy5yb290Q1NCLCB0aGlzLkNTQlBhdGgsIHRoaXMuQ1NCQWxpYXMsIHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG1ldGEuaXNNYXN0ZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJvb3RDU0IgPSByb290Q1NCO1xuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZURzZWVkKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlTWFzdGVyQ1NCKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgc2F2ZURzZWVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucmVzdG9yZURzZWVkQ2FnZS5zYXZlRHNlZWRCYWNrdXBzKGZsb3dzVXRpbHMuZGVmYXVsdFBpbiwgdGhpcy5jc2JSZXN0b3JlSWRlbnRpZmllciwgdW5kZWZpbmVkLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImNvbGxlY3RGaWxlc1wiLCBcIkZhaWxlZCB0byBzYXZlIGRzZWVkXCIsIHRoaXMucmF3Q1NCLCB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyLCAnJywgJ21hc3RlcicpKTtcbiAgICB9LFxuXG5cbiAgICBjcmVhdGVNYXN0ZXJDU0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc3QgY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKHVuZGVmaW5lZCwgdGhpcy5iYWNrdXBVcmxzKTtcbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicHJpbnRTZW5zaXRpdmVJbmZvXCIsIGNzYklkZW50aWZpZXIuZ2V0U2VlZCgpLCBmbG93c1V0aWxzLmRlZmF1bHRQaW4pO1xuICAgICAgICB0aGlzLnJvb3RDU0IgPSBSb290Q1NCLmNyZWF0ZU5ldyh0aGlzLmxvY2FsRm9sZGVyLCBjc2JJZGVudGlmaWVyKTtcbiAgICAgICAgdGhpcy5yZXN0b3JlRHNlZWRDYWdlLnNhdmVEc2VlZEJhY2t1cHMoZmxvd3NVdGlscy5kZWZhdWx0UGluLCBjc2JJZGVudGlmaWVyLCB1bmRlZmluZWQsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwiYXR0YWNoQ1NCXCIsIFwiRmFpbGVkIHRvIHNhdmUgbWFzdGVyIGRzZWVkIFwiLCB0aGlzLnJvb3RDU0IsIHRoaXMuQ1NCUGF0aCwgdGhpcy5DU0JBbGlhcywgdGhpcy5jc2JSZXN0b3JlSWRlbnRpZmllcikpO1xuICAgIH0sXG5cblxuICAgIGF0dGFjaENTQjogZnVuY3Rpb24gKHJvb3RDU0IsIENTQlBhdGgsIENTQkFsaWFzLCBjc2JJZGVudGlmaWVyKSB7XG4gICAgICAgIHRoaXMuX19hdHRhY2hDU0Iocm9vdENTQiwgQ1NCUGF0aCwgQ1NCQWxpYXMsIGNzYklkZW50aWZpZXIsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsICdsb2FkUmVzdG9yZWRSYXdDU0InLCAnRmFpbGVkIHRvIGF0dGFjaCByYXdDU0InKSk7XG5cbiAgICB9LFxuXG4gICAgbG9hZFJlc3RvcmVkUmF3Q1NCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuQ1NCUGF0aCA9IHRoaXMuQ1NCUGF0aC5zcGxpdCgnOicpWzBdICsgJy8nICsgdGhpcy5DU0JBbGlhcztcbiAgICAgICAgdGhpcy5yb290Q1NCLmxvYWRSYXdDU0IodGhpcy5DU0JQYXRoLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImNvbGxlY3RGaWxlc1wiLCBcIkZhaWxlZCB0byBsb2FkIHJlc3RvcmVkIFJhd0NTQlwiLCB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyLCB0aGlzLkNTQlBhdGgsIHRoaXMuQ1NCQWxpYXMpKTtcbiAgICB9LFxuXG4gICAgY29sbGVjdEZpbGVzOiBmdW5jdGlvbiAocmF3Q1NCLCBjc2JJZGVudGlmaWVyLCBjdXJyZW50UGF0aCwgYWxpYXMsIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgY29uc3QgbGlzdEZpbGVzID0gcmF3Q1NCLmdldEFsbEFzc2V0cygnZ2xvYmFsLkZpbGVSZWZlcmVuY2UnKTtcbiAgICAgICAgY29uc3QgYXN5bmNEaXNwYXRjaGVyID0gbmV3IEFzeW5jRGlzcGF0Y2hlcigoZXJycywgc3VjY3MpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY29sbGVjdENTQnMocmF3Q1NCLCBjc2JJZGVudGlmaWVyLCBjdXJyZW50UGF0aCwgYWxpYXMpO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycnMsIHN1Y2NzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGxpc3RGaWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGlzdEZpbGVzLmZvckVhY2goKGZpbGVSZWZlcmVuY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihmaWxlUmVmZXJlbmNlLmRzZWVkKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVBbGlhcyA9IGZpbGVSZWZlcmVuY2UuYWxpYXM7XG4gICAgICAgICAgICBjb25zdCB1cmxzID0gY3NiSWRlbnRpZmllci5nZXRCYWNrdXBVcmxzKCk7XG4gICAgICAgICAgICBjb25zdCBiYWNrdXBFbmdpbmUgPSBCYWNrdXBFbmdpbmUuZ2V0QmFja3VwRW5naW5lKHVybHMpO1xuICAgICAgICAgICAgYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkoKTtcbiAgICAgICAgICAgIGJhY2t1cEVuZ2luZS5sb2FkKGNzYklkZW50aWZpZXIsIChlcnIsIGVuY3J5cHRlZEZpbGUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIGVyciwgJ0NvdWxkIG5vdCBkb3dubG9hZCBmaWxlICcgKyBmaWxlQWxpYXMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuX19hZGRDU0JIYXNoKGNzYklkZW50aWZpZXIsIGVuY3J5cHRlZEZpbGUpO1xuXG4gICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlKHV0aWxzLmdlbmVyYXRlUGF0aCh0aGlzLmxvY2FsRm9sZGVyLCBjc2JJZGVudGlmaWVyKSwgZW5jcnlwdGVkRmlsZSwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBlcnIsICdDb3VsZCBub3Qgc2F2ZSBmaWxlICcgKyBmaWxlQWxpYXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKHVuZGVmaW5lZCwgZmlsZUFsaWFzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgY29sbGVjdENTQnM6IGZ1bmN0aW9uIChyYXdDU0IsIGNzYklkZW50aWZpZXIsIGN1cnJlbnRQYXRoLCBhbGlhcykge1xuXG4gICAgICAgIGNvbnN0IGxpc3RDU0JzID0gcmF3Q1NCLmdldEFsbEFzc2V0cygnZ2xvYmFsLkNTQlJlZmVyZW5jZScpO1xuICAgICAgICBjb25zdCBuZXh0QXJndW1lbnRzID0gW107XG4gICAgICAgIGxldCBjb3VudGVyID0gMDtcblxuICAgICAgICBpZiAobGlzdENTQnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KCk7XG4gICAgICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxpc3RDU0JzICYmIGxpc3RDU0JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGxpc3RDU0JzLmZvckVhY2goKENTQlJlZmVyZW5jZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5leHRQYXRoID0gY3VycmVudFBhdGggKyAnLycgKyBDU0JSZWZlcmVuY2UuYWxpYXM7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV4dENTQklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihDU0JSZWZlcmVuY2UuZHNlZWQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5leHRBbGlhcyA9IENTQlJlZmVyZW5jZS5hbGlhcztcbiAgICAgICAgICAgICAgICBjb25zdCBuZXh0VVJMcyA9IGNzYklkZW50aWZpZXIuZ2V0QmFja3VwVXJscygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJhY2t1cEVuZ2luZSA9IEJhY2t1cEVuZ2luZS5nZXRCYWNrdXBFbmdpbmUobmV4dFVSTHMpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkoKTtcbiAgICAgICAgICAgICAgICBiYWNrdXBFbmdpbmUubG9hZChuZXh0Q1NCSWRlbnRpZmllciwgKGVyciwgZW5jcnlwdGVkQ1NCKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIGVyciwgJ0NvdWxkIG5vdCBkb3dubG9hZCBDU0IgJyArIG5leHRBbGlhcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fYWRkQ1NCSGFzaChuZXh0Q1NCSWRlbnRpZmllciwgZW5jcnlwdGVkQ1NCKTtcblxuICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGUodXRpbHMuZ2VuZXJhdGVQYXRoKHRoaXMubG9jYWxGb2xkZXIsIG5leHRDU0JJZGVudGlmaWVyKSwgZW5jcnlwdGVkQ1NCLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgZXJyLCAnQ291bGQgbm90IHNhdmUgQ1NCICcgKyBuZXh0QWxpYXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb3RDU0IubG9hZFJhd0NTQihuZXh0UGF0aCwgKGVyciwgbmV4dFJhd0NTQikgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBlcnIsICdGYWlsZWQgdG8gbG9hZCBDU0IgJyArIG5leHRBbGlhcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRBcmd1bWVudHMucHVzaChbIG5leHRSYXdDU0IsIG5leHRDU0JJZGVudGlmaWVyLCBuZXh0UGF0aCwgbmV4dEFsaWFzIF0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCsrY291bnRlciA9PT0gbGlzdENTQnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRBcmd1bWVudHMuZm9yRWFjaCgoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsZWN0RmlsZXMoLi4uYXJncywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKHVuZGVmaW5lZCwgYWxpYXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIF9fdHJ5RG93bmxvYWQodXJscywgY3NiSWRlbnRpZmllciwgaW5kZXgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gdXJscy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ0NvdWxkIG5vdCBkb3dubG9hZCByZXNvdXJjZScpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVybCA9IHVybHNbaW5kZXhdO1xuICAgICAgICB0aGlzLmJhY2t1cEVuZ2luZS5sb2FkKHVybCwgY3NiSWRlbnRpZmllciwgKGVyciwgcmVzb3VyY2UpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fX3RyeURvd25sb2FkKHVybHMsIGNzYklkZW50aWZpZXIsICsraW5kZXgsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCByZXNvdXJjZSk7XG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIF9fYWRkQ1NCSGFzaDogZnVuY3Rpb24gKGNzYklkZW50aWZpZXIsIGVuY3J5cHRlZENTQikge1xuICAgICAgICBjb25zdCBwc2tIYXNoID0gbmV3IGNyeXB0by5Qc2tIYXNoKCk7XG4gICAgICAgIHBza0hhc2gudXBkYXRlKGVuY3J5cHRlZENTQik7XG4gICAgICAgIHRoaXMuaGFzaE9ialtjc2JJZGVudGlmaWVyLmdldFVpZCgpXSA9IHBza0hhc2guZGlnZXN0KCkudG9TdHJpbmcoJ2hleCcpO1xuXG4gICAgfSxcblxuICAgIF9fYXR0YWNoQ1NCOiBmdW5jdGlvbiAocm9vdENTQiwgQ1NCUGF0aCwgQ1NCQWxpYXMsIGNzYklkZW50aWZpZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghQ1NCQWxpYXMpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJObyBDU0IgYWxpYXMgd2FzIHNwZWNpZmllZFwiKSk7XG4gICAgICAgIH1cblxuICAgICAgICByb290Q1NCLmxvYWRSYXdDU0IoQ1NCUGF0aCwgKGVyciwgcmF3Q1NCKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcm9vdENTQi5sb2FkQXNzZXRGcm9tUGF0aChDU0JQYXRoLCAoZXJyLCBjc2JSZWYpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjc2JSZWYuaW5pdChDU0JBbGlhcywgY3NiSWRlbnRpZmllci5nZXRTZWVkKCksIGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKSk7XG4gICAgICAgICAgICAgICAgICAgIHJvb3RDU0Iuc2F2ZUFzc2V0VG9QYXRoKENTQlBhdGgsIGNzYlJlZiwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKGBBIENTQiBoYXZpbmcgdGhlIGFsaWFzICR7Q1NCQWxpYXN9IGFscmVhZHkgZXhpc3RzLmApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufSk7XG5cbiIsImNvbnN0IHV0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvdXRpbHNcIik7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy92YWxpZGF0b3JcIik7XG5jb25zdCBIYXNoQ2FnZSA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzL0hhc2hDYWdlJyk7XG5jb25zdCBBc3luY0Rpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvQXN5bmNEaXNwYXRjaGVyXCIpO1xuY29uc3QgUm9vdENTQiA9IHJlcXVpcmUoJy4uL1Jvb3RDU0InKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKCcuLi9DU0JJZGVudGlmaWVyJyk7XG5jb25zdCBCYWNrdXBFbmdpbmUgPSByZXF1aXJlKCcuLi9CYWNrdXBFbmdpbmUnKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJzYXZlQmFja3VwXCIsIHtcbiAgICBzdGFydDogZnVuY3Rpb24gKGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgMyk7XG4gICAgfSxcblxuICAgIHZhbGlkYXRlUGluOiBmdW5jdGlvbiAocGluLCBub1RyaWVzKSB7XG4gICAgICAgIHZhbGlkYXRvci52YWxpZGF0ZVBpbih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLCBcImxvYWRIYXNoRmlsZVwiLCBwaW4sIG5vVHJpZXMpO1xuICAgIH0sXG5cbiAgICB3aXRoQ1NCSWRlbnRpZmllcjogZnVuY3Rpb24gKGlkLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICB0aGlzLmNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihpZCk7XG4gICAgICAgIFJvb3RDU0IubG9hZFdpdGhJZGVudGlmaWVyKGxvY2FsRm9sZGVyLCB0aGlzLmNzYklkZW50aWZpZXIsIChlcnIsIHJvb3RDU0IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIGVyciwgJ0ZhaWxlZCB0byBsb2FkIHJvb3QgQ1NCJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnJvb3RDU0IgPSByb290Q1NCO1xuICAgICAgICAgICAgdGhpcy5sb2FkSGFzaEZpbGUoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGxvYWRIYXNoRmlsZTogZnVuY3Rpb24gKHBpbiwgYmFja3Vwcykge1xuICAgICAgICB0aGlzLmJhY2t1cHMgPSBiYWNrdXBzO1xuICAgICAgICB0aGlzLmhhc2hDYWdlID0gbmV3IEhhc2hDYWdlKHRoaXMubG9jYWxGb2xkZXIpO1xuICAgICAgICB0aGlzLmhhc2hDYWdlLmxvYWRIYXNoKHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsICdyZWFkRW5jcnlwdGVkTWFzdGVyJywgJ0ZhaWxlZCB0byBsb2FkIGhhc2ggZmlsZScpKTtcbiAgICB9LFxuXG4gICAgcmVhZEVuY3J5cHRlZE1hc3RlcjogZnVuY3Rpb24gKGhhc2hGaWxlKSB7XG4gICAgICAgIHRoaXMuaGFzaEZpbGUgPSBoYXNoRmlsZTtcbiAgICAgICAgdGhpcy5tYXN0ZXJJRCA9IHV0aWxzLmdlbmVyYXRlUGF0aCh0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLmNzYklkZW50aWZpZXIpO1xuICAgICAgICBmcy5yZWFkRmlsZSh0aGlzLm1hc3RlcklELCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnbG9hZE1hc3RlclJhd0NTQicsICdGYWlsZWQgdG8gcmVhZCBtYXN0ZXJDU0IuJykpO1xuICAgIH0sXG5cblxuICAgIGxvYWRNYXN0ZXJSYXdDU0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5yb290Q1NCLmxvYWRSYXdDU0IoJycsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwiZGlzcGF0Y2hlclwiLCBcIkZhaWxlZCB0byBsb2FkIG1hc3RlckNTQlwiKSk7XG4gICAgfSxcblxuICAgIGRpc3BhdGNoZXI6IGZ1bmN0aW9uIChyYXdDU0IpIHtcbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIgPSBuZXcgQXN5bmNEaXNwYXRjaGVyKChlcnJvcnMsIHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcnMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIEpTT04uc3RyaW5naWZ5KGVycm9ycywgbnVsbCwgJ1xcdCcpLCAnRmFpbGVkIHRvIGNvbGxlY3QgYWxsIENTQnMnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxlY3RGaWxlcyhyZXN1bHRzKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eSgpO1xuICAgICAgICB0aGlzLmNvbGxlY3RDU0JzKHJhd0NTQiwgdGhpcy5jc2JJZGVudGlmaWVyLCAnJywgJ21hc3RlcicpO1xuICAgIH0sXG5cbiAgICBjb2xsZWN0Q1NCczogZnVuY3Rpb24gKHJhd0NTQiwgY3NiSWRlbnRpZmllciwgY3VycmVudFBhdGgsIGFsaWFzKSB7XG4gICAgICAgIGNvbnN0IGxpc3RDU0JzID0gcmF3Q1NCLmdldEFsbEFzc2V0cygnZ2xvYmFsLkNTQlJlZmVyZW5jZScpO1xuXG4gICAgICAgIGNvbnN0IG5leHRBcmd1bWVudHMgPSBbXTtcbiAgICAgICAgbGV0IGNvdW50ZXIgPSAwO1xuXG4gICAgICAgIGxpc3RDU0JzLmZvckVhY2goKENTQlJlZmVyZW5jZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV4dFBhdGggPSBjdXJyZW50UGF0aCArICcvJyArIENTQlJlZmVyZW5jZS5hbGlhcztcbiAgICAgICAgICAgIGNvbnN0IG5leHRDU0JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoQ1NCUmVmZXJlbmNlLmRzZWVkKTtcbiAgICAgICAgICAgIGNvbnN0IG5leHRBbGlhcyA9IENTQlJlZmVyZW5jZS5hbGlhcztcbiAgICAgICAgICAgIHRoaXMucm9vdENTQi5sb2FkUmF3Q1NCKG5leHRQYXRoLCAoZXJyLCBuZXh0UmF3Q1NCKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBuZXh0QXJndW1lbnRzLnB1c2goWyBuZXh0UmF3Q1NCLCBuZXh0Q1NCSWRlbnRpZmllciwgbmV4dFBhdGgsIG5leHRBbGlhcyBdKTtcbiAgICAgICAgICAgICAgICBpZiAoKytjb3VudGVyID09PSBsaXN0Q1NCcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFyZ3VtZW50cy5mb3JFYWNoKChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxlY3RDU0JzKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQodW5kZWZpbmVkLCB7cmF3Q1NCLCBjc2JJZGVudGlmaWVyLCBhbGlhc30pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAobGlzdENTQnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCh1bmRlZmluZWQsIHtyYXdDU0IsIGNzYklkZW50aWZpZXIsIGFsaWFzfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgY29sbGVjdEZpbGVzOiBmdW5jdGlvbiAoY29sbGVjdGVkQ1NCcykge1xuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlciA9IG5ldyBBc3luY0Rpc3BhdGNoZXIoKGVycm9ycywgbmV3UmVzdWx0cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9ycykge1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgSlNPTi5zdHJpbmdpZnkoZXJyb3JzLCBudWxsLCAnXFx0JyksICdGYWlsZWQgdG8gY29sbGVjdCBmaWxlcyBhdHRhY2hlZCB0byBDU0JzJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghbmV3UmVzdWx0cykge1xuICAgICAgICAgICAgICAgIG5ld1Jlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX19jYXRlZ29yaXplKGNvbGxlY3RlZENTQnMuY29uY2F0KG5ld1Jlc3VsdHMpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eShjb2xsZWN0ZWRDU0JzLmxlbmd0aCk7XG4gICAgICAgIGNvbGxlY3RlZENTQnMuZm9yRWFjaCgoe3Jhd0NTQiwgY3NiSWRlbnRpZmllciwgYWxpYXN9KSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9fY29sbGVjdEZpbGVzKHJhd0NTQiwgYWxpYXMpO1xuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICBfX2NhdGVnb3JpemU6IGZ1bmN0aW9uIChmaWxlcykge1xuICAgICAgICBjb25zdCBjYXRlZ29yaWVzID0ge307XG4gICAgICAgIGxldCBiYWNrdXBzO1xuICAgICAgICBmaWxlcy5mb3JFYWNoKCh7Y3NiSWRlbnRpZmllciwgYWxpYXN9KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuYmFja3VwcyB8fCB0aGlzLmJhY2t1cHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYmFja3VwcyA9IGNzYklkZW50aWZpZXIuZ2V0QmFja3VwVXJscygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBiYWNrdXBzID0gdGhpcy5iYWNrdXBzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdWlkID0gY3NiSWRlbnRpZmllci5nZXRVaWQoKTtcbiAgICAgICAgICAgIGNhdGVnb3JpZXNbdWlkXSA9IHtiYWNrdXBzLCBhbGlhc307XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyID0gbmV3IEFzeW5jRGlzcGF0Y2hlcigoZXJyb3JzLCBzdWNjZXNzZXMpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2NzYkJhY2t1cFJlcG9ydCcsIHtlcnJvcnMsIHN1Y2Nlc3Nlc30pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmJhY2t1cEVuZ2luZSA9IEJhY2t1cEVuZ2luZS5nZXRCYWNrdXBFbmdpbmUoYmFja3Vwcyk7XG4gICAgICAgIHRoaXMuZmlsdGVyRmlsZXMoY2F0ZWdvcmllcyk7XG4gICAgICAgIC8vIE9iamVjdC5lbnRyaWVzKGNhdGVnb3JpZXMpLmZvckVhY2goKFt1aWQsIHthbGlhcywgYmFja3Vwc31dKSA9PiB7XG4gICAgICAgIC8vICAgICB0aGlzLmZpbHRlckZpbGVzKHVpZCwgYWxpYXMsIGJhY2t1cHMpO1xuICAgICAgICAvLyB9KTtcbiAgICB9LFxuXG4gICAgZmlsdGVyRmlsZXM6IGZ1bmN0aW9uIChmaWxlc0JhY2t1cHMpIHtcbiAgICAgICAgY29uc3QgZmlsZXNUb1VwZGF0ZSA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLmhhc2hGaWxlKS5mb3JFYWNoKCh1aWQpID0+IHtcbiAgICAgICAgICAgIGlmIChmaWxlc0JhY2t1cHNbdWlkXSkge1xuICAgICAgICAgICAgICAgIGZpbGVzVG9VcGRhdGVbdWlkXSA9IHRoaXMuaGFzaEZpbGVbdWlkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eSgpO1xuICAgICAgICB0aGlzLmJhY2t1cEVuZ2luZS5jb21wYXJlVmVyc2lvbnMoZmlsZXNUb1VwZGF0ZSwgKGVyciwgbW9kaWZpZWRGaWxlcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBlcnIsIFwiRmFpbGVkIHRvIHJldHJpZXZlIGxpc3Qgb2YgbW9kaWZpZWQgZmlsZXNcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX19iYWNrdXBGaWxlcyhKU09OLnBhcnNlKG1vZGlmaWVkRmlsZXMpLCBmaWxlc0JhY2t1cHMpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgX19iYWNrdXBGaWxlczogZnVuY3Rpb24gKGZpbGVzLCBmaWxlc0JhY2t1cHMpIHtcbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eShmaWxlcy5sZW5ndGgpO1xuICAgICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWxlU3RyZWFtID0gZnMuY3JlYXRlUmVhZFN0cmVhbShwYXRoLmpvaW4odGhpcy5sb2NhbEZvbGRlciwgZmlsZSkpO1xuICAgICAgICAgICAgY29uc3QgYmFja3VwVXJscyA9IGZpbGVzQmFja3Vwc1tmaWxlXS5iYWNrdXBzO1xuICAgICAgICAgICAgY29uc3QgYmFja3VwRW5naW5lID0gQmFja3VwRW5naW5lLmdldEJhY2t1cEVuZ2luZShiYWNrdXBVcmxzKTtcbiAgICAgICAgICAgIGJhY2t1cEVuZ2luZS5zYXZlKG5ldyBDU0JJZGVudGlmaWVyKGZpbGUpLCBmaWxlU3RyZWFtLCAoZXJyLCB1cmwpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAgdGhpcy5hc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQoe2FsaWFzOiBmaWxlc0JhY2t1cHNbZmlsZV0uYWxpYXMsIGJhY2t1cFVSTDogdXJsfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQodW5kZWZpbmVkLCB7YWxpYXM6IGZpbGVzQmFja3Vwc1tmaWxlXS5hbGlhcywgYmFja3VwVVJMOiB1cmx9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCgpOyAvLyBmb3IgaHR0cCByZXF1ZXN0IHRvIGNvbXBhcmVWZXJzaW9uc1xuICAgIH0sXG5cbiAgICBfX2NvbGxlY3RGaWxlczogZnVuY3Rpb24gKHJhd0NTQiwgY3NiQWxpYXMpIHtcbiAgICAgICAgY29uc3QgZmlsZXMgPSByYXdDU0IuZ2V0QWxsQXNzZXRzKCdnbG9iYWwuRmlsZVJlZmVyZW5jZScpO1xuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KGZpbGVzLmxlbmd0aCk7XG4gICAgICAgIGZpbGVzLmZvckVhY2goKEZpbGVSZWZlcmVuY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFsaWFzID0gRmlsZVJlZmVyZW5jZS5hbGlhcztcbiAgICAgICAgICAgIGNvbnN0IGNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihGaWxlUmVmZXJlbmNlLmRzZWVkKTtcbiAgICAgICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKHVuZGVmaW5lZCwge2NzYklkZW50aWZpZXIsIGFsaWFzfSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCgpO1xuICAgIH1cbn0pO1xuXG4iLCJjb25zdCB2YWxpZGF0b3IgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvdmFsaWRhdG9yXCIpO1xuY29uc3QgRHNlZWRDYWdlID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMvRHNlZWRDYWdlJyk7XG5cbiQkLnN3YXJtLmRlc2NyaWJlKFwic2V0UGluXCIsIHtcbiAgICBzdGFydDogZnVuY3Rpb24gKGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgMyk7XG4gICAgfSxcblxuICAgIHZhbGlkYXRlUGluOiBmdW5jdGlvbiAob2xkUGluLCBub1RyaWVzKSB7XG4gICAgICAgIHRoaXMub2xkUGluID0gb2xkUGluO1xuICAgICAgICB2YWxpZGF0b3IudmFsaWRhdGVQaW4odGhpcy5sb2NhbEZvbGRlciwgdGhpcywgXCJpbnRlcmFjdGlvbkp1bXBlclwiLCBvbGRQaW4sIG5vVHJpZXMpO1xuICAgIH0sXG5cbiAgICBpbnRlcmFjdGlvbkp1bXBlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJlbnRlck5ld1BpblwiKTtcbiAgICB9LFxuXG4gICAgYWN0dWFsaXplUGluOiBmdW5jdGlvbiAobmV3UGluKSB7XG4gICAgICAgIHRoaXMuZHNlZWRDYWdlID0gbmV3IERzZWVkQ2FnZSh0aGlzLmxvY2FsRm9sZGVyKTtcbiAgICAgICAgdGhpcy5kc2VlZENhZ2UubG9hZERzZWVkQmFja3Vwcyh0aGlzLm9sZFBpbiwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJzYXZlRHNlZWRcIiwgXCJGYWlsZWQgdG8gbG9hZCBkc2VlZC5cIiwgbmV3UGluKSk7XG4gICAgfSxcblxuICAgIHNhdmVEc2VlZDogZnVuY3Rpb24gKGNzYklkZW50aWZpZXIsIGJhY2t1cHMsIHBpbikge1xuICAgICAgICB0aGlzLmRzZWVkQ2FnZS5zYXZlRHNlZWRCYWNrdXBzKHBpbiwgY3NiSWRlbnRpZmllciwgYmFja3VwcywgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJzdWNjZXNzU3RhdGVcIiwgXCJGYWlsZWQgdG8gc2F2ZSBkc2VlZFwiKSk7XG4gICAgfSxcblxuICAgIHN1Y2Nlc3NTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJwcmludEluZm9cIiwgXCJUaGUgcGluIGhhcyBiZWVuIHN1Y2Nlc3NmdWxseSBjaGFuZ2VkLlwiKTtcbiAgICB9XG59KTsiLCJcbmZ1bmN0aW9uIEFzeW5jRGlzcGF0Y2hlcihmaW5hbENhbGxiYWNrKSB7XG5cdGxldCByZXN1bHRzID0gW107XG5cdGxldCBlcnJvcnMgPSBbXTtcblxuXHRsZXQgc3RhcnRlZCA9IDA7XG5cblx0ZnVuY3Rpb24gbWFya09uZUFzRmluaXNoZWQoZXJyLCByZXMpIHtcblx0XHRpZihlcnIpIHtcblx0XHRcdGVycm9ycy5wdXNoKGVycik7XG5cdFx0fVxuXG5cdFx0aWYoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcblx0XHRcdGFyZ3VtZW50c1swXSA9IHVuZGVmaW5lZDtcblx0XHRcdHJlcyA9IGFyZ3VtZW50cztcblx0XHR9XG5cblx0XHRpZih0eXBlb2YgcmVzICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdFx0XHRyZXN1bHRzLnB1c2gocmVzKTtcblx0XHR9XG5cblx0XHRpZigtLXN0YXJ0ZWQgPD0gMCkge1xuICAgICAgICAgICAgY2FsbENhbGxiYWNrKCk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gZGlzcGF0Y2hFbXB0eShhbW91bnQgPSAxKSB7XG5cdFx0c3RhcnRlZCArPSBhbW91bnQ7XG5cdH1cblxuXHRmdW5jdGlvbiBjYWxsQ2FsbGJhY2soKSB7XG5cdCAgICBpZihlcnJvcnMubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgZXJyb3JzID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cblx0ICAgIGlmKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgcmVzdWx0cyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZpbmFsQ2FsbGJhY2soZXJyb3JzLCByZXN1bHRzKTtcbiAgICB9XG5cblx0cmV0dXJuIHtcblx0XHRkaXNwYXRjaEVtcHR5LFxuXHRcdG1hcmtPbmVBc0ZpbmlzaGVkXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQXN5bmNEaXNwYXRjaGVyOyIsImNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ3Bza2NyeXB0bycpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoXCIuLi9saWJyYXJpZXMvQ1NCSWRlbnRpZmllclwiKTtcblxuZnVuY3Rpb24gRHNlZWRDYWdlKGxvY2FsRm9sZGVyKSB7XG5cdGNvbnN0IGRzZWVkRm9sZGVyID0gcGF0aC5qb2luKGxvY2FsRm9sZGVyLCAnLnByaXZhdGVTa3knKTtcblx0Y29uc3QgZHNlZWRQYXRoID0gcGF0aC5qb2luKGRzZWVkRm9sZGVyLCAnZHNlZWQnKTtcblxuXHRmdW5jdGlvbiBsb2FkRHNlZWRCYWNrdXBzKHBpbiwgY2FsbGJhY2spIHtcblx0XHRmcy5ta2Rpcihkc2VlZEZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIChlcnIpID0+IHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHR9XG5cblx0XHRcdGNyeXB0by5sb2FkRGF0YShwaW4sIGRzZWVkUGF0aCwgKGVyciwgZHNlZWRCYWNrdXBzKSA9PiB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0cnl7XG5cdFx0XHRcdFx0ZHNlZWRCYWNrdXBzID0gSlNPTi5wYXJzZShkc2VlZEJhY2t1cHMudG9TdHJpbmcoKSk7XG5cdFx0XHRcdH1jYXRjaCAoZSkge1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGxldCBjc2JJZGVudGlmaWVyO1xuXHRcdFx0XHRpZiAoZHNlZWRCYWNrdXBzLmRzZWVkICYmICFCdWZmZXIuaXNCdWZmZXIoZHNlZWRCYWNrdXBzLmRzZWVkKSkge1xuXHRcdFx0XHRcdGRzZWVkQmFja3Vwcy5kc2VlZCA9IEJ1ZmZlci5mcm9tKGRzZWVkQmFja3Vwcy5kc2VlZCk7XG5cdFx0XHRcdFx0Y3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKGRzZWVkQmFja3Vwcy5kc2VlZCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjYWxsYmFjayh1bmRlZmluZWQsIGNzYklkZW50aWZpZXIsIGRzZWVkQmFja3Vwcy5iYWNrdXBzKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2F2ZURzZWVkQmFja3VwcyhwaW4sIGNzYklkZW50aWZpZXIsIGJhY2t1cHMsIGNhbGxiYWNrKSB7XG5cdFx0ZnMubWtkaXIoZHNlZWRGb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCAoZXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgZHNlZWQ7XG5cdFx0XHRpZihjc2JJZGVudGlmaWVyKXtcblx0XHRcdFx0ZHNlZWQgPSBjc2JJZGVudGlmaWVyLmdldERzZWVkKCk7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBkc2VlZEJhY2t1cHMgPSBKU09OLnN0cmluZ2lmeSh7XG5cdFx0XHRcdGRzZWVkLFxuXHRcdFx0XHRiYWNrdXBzXG5cdFx0XHR9KTtcblxuXHRcdFx0Y3J5cHRvLnNhdmVEYXRhKEJ1ZmZlci5mcm9tKGRzZWVkQmFja3VwcyksIHBpbiwgZHNlZWRQYXRoLCBjYWxsYmFjayk7XG5cdFx0fSk7XG5cdH1cblxuXG5cdHJldHVybiB7XG5cdFx0bG9hZERzZWVkQmFja3Vwcyxcblx0XHRzYXZlRHNlZWRCYWNrdXBzLFxuXHR9O1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gRHNlZWRDYWdlOyIsImNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5cbmZ1bmN0aW9uIEhhc2hDYWdlKGxvY2FsRm9sZGVyKSB7XG5cdGNvbnN0IGhhc2hGb2xkZXIgPSBwYXRoLmpvaW4obG9jYWxGb2xkZXIsICcucHJpdmF0ZVNreScpO1xuXHRjb25zdCBoYXNoUGF0aCA9IHBhdGguam9pbihoYXNoRm9sZGVyLCAnaGFzaCcpO1xuXG5cdGZ1bmN0aW9uIGxvYWRIYXNoKGNhbGxiYWNrKSB7XG5cdFx0ZnMubWtkaXIoaGFzaEZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIChlcnIpID0+IHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHR9XG5cblx0XHRcdGZzLnJlYWRGaWxlKGhhc2hQYXRoLCAoZXJyLCBkYXRhKSA9PiB7XG5cdFx0XHRcdGlmKGVycil7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIHt9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhbGxiYWNrKG51bGwsIEpTT04ucGFyc2UoZGF0YSkpO1xuXHRcdFx0fSk7XG5cblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNhdmVIYXNoKGhhc2hPYmosIGNhbGxiYWNrKSB7XG5cdFx0ZnMubWtkaXIoaGFzaEZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIChlcnIpID0+IHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHR9XG5cblx0XHRcdGZzLndyaXRlRmlsZShoYXNoUGF0aCwgSlNPTi5zdHJpbmdpZnkoaGFzaE9iaiwgbnVsbCwgJ1xcdCcpLCAoZXJyKSA9PiB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdGxvYWRIYXNoLFxuXHRcdHNhdmVIYXNoXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSGFzaENhZ2U7XG4iLCIvLyBjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5cblxuZXhwb3J0cy5kZWZhdWx0QmFja3VwID0gXCJodHRwOi8vbG9jYWxob3N0OjgwODBcIjtcbmV4cG9ydHMuZGVmYXVsdFBpbiA9IFwiMTIzNDU2NzhcIjtcbmV4cG9ydHMubm9UcmllcyA9IDM7XG5cbiIsImNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbi8vIGNvbnN0IGNyeXB0byA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5cbmZ1bmN0aW9uIGdlbmVyYXRlUGF0aChsb2NhbEZvbGRlciwgY3NiSWRlbnRpZmllcikge1xuICAgIHJldHVybiBwYXRoLmpvaW4obG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIuZ2V0VWlkKCkpO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzVXJsKHVybCwgYXNzZXRUeXBlKSB7XG4gICAgY29uc3Qgc3BsaXRVcmwgPSB1cmwuc3BsaXQoJy8nKTtcbiAgICBjb25zdCBhbGlhc0Fzc2V0ID0gc3BsaXRVcmwucG9wKCk7XG4gICAgY29uc3QgQ1NCUGF0aCA9IHNwbGl0VXJsLmpvaW4oJy8nKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBDU0JQYXRoOiBDU0JQYXRoICsgJzonICsgYXNzZXRUeXBlICsgJzonICsgYWxpYXNBc3NldCxcbiAgICAgICAgYWxpYXM6IGFsaWFzQXNzZXRcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBkZWxldGVSZWN1cnNpdmVseShpbnB1dFBhdGgsIGlzUm9vdCA9IHRydWUsIGNhbGxiYWNrKSB7XG5cbiAgICBmcy5zdGF0KGlucHV0UGF0aCwgZnVuY3Rpb24gKGVyciwgc3RhdHMpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBzdGF0cyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgICAgICBmcy51bmxpbmsoaW5wdXRQYXRoLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyLCBudWxsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgZnMucmVhZGRpcihpbnB1dFBhdGgsIChlcnIsIGZpbGVzKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IGZfbGVuZ3RoID0gZmlsZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGxldCBmX2RlbGV0ZV9pbmRleCA9IDA7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjaGVja1N0YXR1cyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZfbGVuZ3RoID09PSBmX2RlbGV0ZV9pbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWlzUm9vdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLnJtZGlyKGlucHV0UGF0aCwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAoIWNoZWNrU3RhdHVzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGVtcFBhdGggPSBwYXRoLmpvaW4oaW5wdXRQYXRoLCBmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZVJlY3Vyc2l2ZWx5KHRlbXBQYXRoLCBmYWxzZSwoZXJyLCBzdGF0dXMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmX2RlbGV0ZV9pbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja1N0YXR1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnZW5lcmF0ZVBhdGgsXG4gICAgcHJvY2Vzc1VybCxcbiAgICBkZWxldGVSZWN1cnNpdmVseVxufTtcblxuIiwiY29uc3QgUm9vdENTQiA9IHJlcXVpcmUoXCIuLi9saWJyYXJpZXMvUm9vdENTQlwiKTtcbmNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuXG5cbm1vZHVsZS5leHBvcnRzLnZhbGlkYXRlUGluID0gZnVuY3Rpb24gKGxvY2FsRm9sZGVyLCBzd2FybSwgcGhhc2VOYW1lLCBwaW4sIG5vVHJpZXMsIC4uLmFyZ3MpIHtcblx0Um9vdENTQi5jcmVhdGVSb290Q1NCKGxvY2FsRm9sZGVyLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgcGluLCAoZXJyLCByb290Q1NCLCBjc2JJZGVudGlmaWVyLCBiYWNrdXBzKSA9Pntcblx0XHRpZihlcnIpe1xuXHRcdFx0c3dhcm0uc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgbm9UcmllcyAtIDEpO1xuXHRcdH1lbHNle1xuXHRcdFx0aWYoY3NiSWRlbnRpZmllcil7XG5cdFx0XHRcdHN3YXJtLnJvb3RDU0IgPSByb290Q1NCO1xuXHRcdFx0XHRzd2FybS5jc2JJZGVudGlmaWVyID0gY3NiSWRlbnRpZmllcjtcblx0XHRcdH1cblx0XHRcdGFyZ3MucHVzaChiYWNrdXBzKTtcblx0XHRcdHN3YXJtW3BoYXNlTmFtZV0ocGluLCAuLi5hcmdzKTtcblx0XHR9XG5cdH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMucmVwb3J0T3JDb250aW51ZSA9IGZ1bmN0aW9uKHN3YXJtLCBwaGFzZU5hbWUsIGVycm9yTWVzc2FnZSwgLi4uYXJncyl7XG5cdHJldHVybiBmdW5jdGlvbihlcnIsLi4ucmVzKSB7XG5cdFx0aWYgKGVycikge1xuXHRcdFx0c3dhcm0uc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImhhbmRsZUVycm9yXCIsIGVyciwgZXJyb3JNZXNzYWdlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKHBoYXNlTmFtZSkge1xuXHRcdFx0XHRcdHN3YXJtW3BoYXNlTmFtZV0oLi4ucmVzLCAuLi5hcmdzKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5jaGVja01hc3RlckNTQkV4aXN0cyA9IGZ1bmN0aW9uIChsb2NhbEZvbGRlciwgY2FsbGJhY2spIHtcblx0ZnMuc3RhdChwYXRoLmpvaW4obG9jYWxGb2xkZXIsIFwiLnByaXZhdGVTa3kvaGFzaFwiKSwgKGVyciwgc3RhdHMpPT57XG5cdFx0aWYoZXJyKXtcblx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIsIGZhbHNlKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gY2FsbGJhY2sodW5kZWZpbmVkLCB0cnVlKTtcblx0fSk7XG59OyIsIi8qXG5jb25zZW5zdXMgaGVscGVyIGZ1bmN0aW9uc1xuKi9cblxudmFyIHBza2NyeXB0byA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5cblxuZnVuY3Rpb24gUHVsc2Uoc2lnbmVyLCBjdXJyZW50UHVsc2VOdW1iZXIsIGJsb2NrLCBuZXdUcmFuc2FjdGlvbnMsIHZzZCwgdG9wLCBsYXN0KSB7XG4gICAgdGhpcy5zaWduZXIgICAgICAgICA9IHNpZ25lcjsgICAgICAgICAgICAgICAvL2Euay5hLiBkZWxlZ2F0ZWRBZ2VudE5hbWVcbiAgICB0aGlzLmN1cnJlbnRQdWxzZSAgID0gY3VycmVudFB1bHNlTnVtYmVyO1xuICAgIHRoaXMubHNldCAgICAgICAgICAgPSBuZXdUcmFuc2FjdGlvbnM7ICAgICAgLy9kaWdlc3QgLT4gdHJhbnNhY3Rpb25cbiAgICB0aGlzLnB0QmxvY2sgICAgICAgID0gYmxvY2s7ICAgICAgICAgICAgICAgIC8vYXJyYXkgb2YgZGlnZXN0c1xuICAgIHRoaXMudnNkICAgICAgICAgICAgPSB2c2Q7XG4gICAgdGhpcy50b3AgICAgICAgICAgICA9IHRvcDsgICAgICAgICAgICAgICAgICAvLyBhLmsuYS4gdG9wUHVsc2VDb25zZW5zdXNcbiAgICB0aGlzLmxhc3QgICAgICAgICAgID0gbGFzdDsgICAgICAgICAgICAgICAgIC8vIGEuay5hLiBsYXN0UHVsc2VBY2hpZXZlZENvbnNlbnN1c1xufVxuXG5mdW5jdGlvbiBUcmFuc2FjdGlvbihjdXJyZW50UHVsc2UsIHN3YXJtKSB7XG4gICAgdGhpcy5pbnB1dCAgICAgID0gc3dhcm0uaW5wdXQ7XG4gICAgdGhpcy5vdXRwdXQgICAgID0gc3dhcm0ub3V0cHV0O1xuICAgIHRoaXMuc3dhcm0gICAgICA9IHN3YXJtO1xuXG4gICAgdmFyIGFyciA9IHByb2Nlc3MuaHJ0aW1lKCk7XG4gICAgdGhpcy5zZWNvbmQgICAgID0gYXJyWzBdO1xuICAgIHRoaXMubmFub3NlY29kICA9IGFyclsxXTtcblxuICAgIHRoaXMuQ1AgICAgICAgICA9IGN1cnJlbnRQdWxzZTtcbiAgICB0aGlzLmRpZ2VzdCAgICAgPSBwc2tjcnlwdG8uaGFzaFZhbHVlcyh0aGlzKTtcbn1cblxuXG5leHBvcnRzLmNyZWF0ZVRyYW5zYWN0aW9uID0gZnVuY3Rpb24gKGN1cnJlbnRQdWxzZSwgc3dhcm0pIHtcbiAgICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uKGN1cnJlbnRQdWxzZSwgc3dhcm0pO1xufVxuXG5leHBvcnRzLmNyZWF0ZVB1bHNlID0gZnVuY3Rpb24gKHNpZ25lciwgY3VycmVudFB1bHNlTnVtYmVyLCBibG9jaywgbmV3VHJhbnNhY3Rpb25zLCB2c2QsIHRvcCwgbGFzdCkge1xuICAgIHJldHVybiBuZXcgUHVsc2Uoc2lnbmVyLCBjdXJyZW50UHVsc2VOdW1iZXIsIGJsb2NrLCBuZXdUcmFuc2FjdGlvbnMsIHZzZCwgdG9wLCBsYXN0KTtcbn1cblxuZXhwb3J0cy5vcmRlclRyYW5zYWN0aW9ucyA9IGZ1bmN0aW9uIChwc2V0KSB7IC8vb3JkZXIgaW4gcGxhY2UgdGhlIHBzZXQgYXJyYXlcbiAgICB2YXIgYXJyID0gW107XG4gICAgZm9yICh2YXIgZCBpbiBwc2V0KSB7XG4gICAgICAgIGFyci5wdXNoKHBzZXRbZF0pO1xuICAgIH1cblxuICAgIGFyci5zb3J0KGZ1bmN0aW9uICh0MSwgdDIpIHtcbiAgICAgICAgaWYgKHQxLkNQIDwgdDIuQ1ApIHJldHVybiAtMTtcbiAgICAgICAgaWYgKHQxLkNQID4gdDIuQ1ApIHJldHVybiAxO1xuICAgICAgICBpZiAodDEuc2Vjb25kIDwgdDIuc2Vjb25kKSByZXR1cm4gLTE7XG4gICAgICAgIGlmICh0MS5zZWNvbmQgPiB0Mi5zZWNvbmQpIHJldHVybiAxO1xuICAgICAgICBpZiAodDEubmFub3NlY29kIDwgdDIubmFub3NlY29kKSByZXR1cm4gLTE7XG4gICAgICAgIGlmICh0MS5uYW5vc2Vjb2QgPiB0Mi5uYW5vc2Vjb2QpIHJldHVybiAxO1xuICAgICAgICBpZiAodDEuZGlnZXN0IDwgdDIuZGlnZXN0KSByZXR1cm4gLTE7XG4gICAgICAgIGlmICh0MS5kaWdlc3QgPiB0Mi5kaWdlc3QpIHJldHVybiAxO1xuICAgICAgICByZXR1cm4gMDsgLy9vbmx5IGZvciBpZGVudGljYWwgdHJhbnNhY3Rpb25zLi4uXG4gICAgfSlcbiAgICByZXR1cm4gYXJyO1xufVxuXG5mdW5jdGlvbiBnZXRNYWpvcml0eUZpZWxkSW5QdWxzZXMoYWxsUHVsc2VzLCBmaWVsZE5hbWUsIGV4dHJhY3RGaWVsZE5hbWUsIHZvdGluZ0JveCkge1xuICAgIHZhciBjb3VudGVyRmllbGRzID0ge307XG4gICAgdmFyIG1ham9yaXR5VmFsdWU7XG4gICAgdmFyIHB1bHNlO1xuXG4gICAgZm9yICh2YXIgYWdlbnQgaW4gYWxsUHVsc2VzKSB7XG4gICAgICAgIHB1bHNlID0gYWxsUHVsc2VzW2FnZW50XTtcbiAgICAgICAgdmFyIHYgPSBwdWxzZVtmaWVsZE5hbWVdO1xuICAgICAgICBjb3VudGVyRmllbGRzW3ZdID0gdm90aW5nQm94LnZvdGUoY291bnRlckZpZWxkc1t2XSk7ICAgICAgICAvLyArK2NvdW50ZXJGaWVsZHNbdl1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpIGluIGNvdW50ZXJGaWVsZHMpIHtcbiAgICAgICAgaWYgKHZvdGluZ0JveC5pc01ham9yaXRhcmlhbihjb3VudGVyRmllbGRzW2ldKSkge1xuICAgICAgICAgICAgbWFqb3JpdHlWYWx1ZSA9IGk7XG4gICAgICAgICAgICBpZiAoZmllbGROYW1lID09IGV4dHJhY3RGaWVsZE5hbWUpIHsgICAgICAgICAgICAgICAgICAgIC8vPz8/IFwidnNkXCIsIFwidnNkXCJcbiAgICAgICAgICAgICAgICByZXR1cm4gbWFqb3JpdHlWYWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXCJibG9ja0RpZ2VzdFwiLCBcInB0QmxvY2tcIlxuICAgICAgICAgICAgICAgIGZvciAodmFyIGFnZW50IGluIGFsbFB1bHNlcykge1xuICAgICAgICAgICAgICAgICAgICBwdWxzZSA9IGFsbFB1bHNlc1thZ2VudF07XG4gICAgICAgICAgICAgICAgICAgIGlmIChwdWxzZVtmaWVsZE5hbWVdID09IG1ham9yaXR5VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwdWxzZVtleHRyYWN0RmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gXCJub25lXCI7IC8vdGhlcmUgaXMgbm8gbWFqb3JpdHlcbn1cblxuZXhwb3J0cy5kZXRlY3RNYWpvcml0YXJpYW5WU0QgPSBmdW5jdGlvbiAocHVsc2UsIHB1bHNlc0hpc3RvcnksIHZvdGluZ0JveCkge1xuICAgIGlmIChwdWxzZSA9PSAwKSByZXR1cm4gXCJub25lXCI7XG4gICAgdmFyIHB1bHNlcyA9IHB1bHNlc0hpc3RvcnlbcHVsc2VdO1xuICAgIHZhciBtYWpvcml0eVZhbHVlID0gZ2V0TWFqb3JpdHlGaWVsZEluUHVsc2VzKHB1bHNlcywgXCJ2c2RcIiwgXCJ2c2RcIiwgdm90aW5nQm94KTtcbiAgICByZXR1cm4gbWFqb3JpdHlWYWx1ZTtcbn1cblxuLypcbiAgICBkZXRlY3QgYSBjYW5kaWRhdGUgYmxvY2tcbiAqL1xuZXhwb3J0cy5kZXRlY3RNYWpvcml0YXJpYW5QVEJsb2NrID0gZnVuY3Rpb24gKHB1bHNlLCBwdWxzZXNIaXN0b3J5LCB2b3RpbmdCb3gpIHtcbiAgICBpZiAocHVsc2UgPT0gMCkgcmV0dXJuIFwibm9uZVwiO1xuICAgIHZhciBwdWxzZXMgPSBwdWxzZXNIaXN0b3J5W3B1bHNlXTtcbiAgICB2YXIgYnRCbG9jayA9IGdldE1ham9yaXR5RmllbGRJblB1bHNlcyhwdWxzZXMsIFwiYmxvY2tEaWdlc3RcIiwgXCJwdEJsb2NrXCIsIHZvdGluZ0JveCk7XG4gICAgcmV0dXJuIGJ0QmxvY2s7XG59XG5cbmV4cG9ydHMubWFrZVNldEZyb21CbG9jayA9IGZ1bmN0aW9uIChrbm93blRyYW5zYWN0aW9ucywgYmxvY2spIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBibG9jay5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaXRlbSA9IGJsb2NrW2ldO1xuICAgICAgICByZXN1bHRbaXRlbV0gPSBrbm93blRyYW5zYWN0aW9uc1tpdGVtXTtcbiAgICAgICAgaWYgKCFrbm93blRyYW5zYWN0aW9ucy5oYXNPd25Qcm9wZXJ0eShpdGVtKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2cobmV3IEVycm9yKFwiRG8gbm90IGdpdmUgdW5rbm93biB0cmFuc2FjdGlvbiBkaWdlc3RzIHRvIG1ha2VTZXRGcm9tQmxvY2sgXCIgKyBpdGVtKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0cy5zZXRzQ29uY2F0ID0gZnVuY3Rpb24gKHRhcmdldCwgZnJvbSkge1xuICAgIGZvciAodmFyIGQgaW4gZnJvbSkge1xuICAgICAgICB0YXJnZXRbZF0gPSBmcm9tW2RdO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG5leHBvcnRzLnNldHNSZW1vdmVBcnJheSA9IGZ1bmN0aW9uICh0YXJnZXQsIGFycikge1xuICAgIGFyci5mb3JFYWNoKGl0ZW0gPT4gZGVsZXRlIHRhcmdldFtpdGVtXSk7XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuZXhwb3J0cy5zZXRzUmVtb3ZlUHRCbG9ja0FuZFBhc3RUcmFuc2FjdGlvbnMgPSBmdW5jdGlvbiAodGFyZ2V0LCBhcnIsIG1heFB1bHNlKSB7XG4gICAgdmFyIHRvQmVSZW1vdmVkID0gW107XG4gICAgZm9yICh2YXIgZCBpbiB0YXJnZXQpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChhcnJbaV0gPT0gZCB8fCB0YXJnZXRbZF0uQ1AgPCBtYXhQdWxzZSkge1xuICAgICAgICAgICAgICAgIHRvQmVSZW1vdmVkLnB1c2goZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0b0JlUmVtb3ZlZC5mb3JFYWNoKGl0ZW0gPT4gZGVsZXRlIHRhcmdldFtpdGVtXSk7XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuZXhwb3J0cy5jcmVhdGVEZW1vY3JhdGljVm90aW5nQm94ID0gZnVuY3Rpb24gKHNoYXJlSG9sZGVyc0NvdW50ZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB2b3RlOiBmdW5jdGlvbiAocHJldmlvc1ZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoIXByZXZpb3NWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHByZXZpb3NWYWx1ZSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJldmlvc1ZhbHVlICsgMTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc01ham9yaXRhcmlhbjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKHZhbHVlICwgTWF0aC5mbG9vcihzaGFyZUhvbGRlcnNDb3VudGVyLzIpICsgMSk7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgPj0gTWF0aC5mbG9vcihzaGFyZUhvbGRlcnNDb3VudGVyIC8gMikgKyAxO1xuICAgICAgICB9XG4gICAgfTtcbn1cbiIsInZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXI7XG5cbnZhciBDUkNfVEFCTEUgPSBbXG4gIDB4MDAwMDAwMDAsIDB4NzcwNzMwOTYsIDB4ZWUwZTYxMmMsIDB4OTkwOTUxYmEsIDB4MDc2ZGM0MTksXG4gIDB4NzA2YWY0OGYsIDB4ZTk2M2E1MzUsIDB4OWU2NDk1YTMsIDB4MGVkYjg4MzIsIDB4NzlkY2I4YTQsXG4gIDB4ZTBkNWU5MWUsIDB4OTdkMmQ5ODgsIDB4MDliNjRjMmIsIDB4N2ViMTdjYmQsIDB4ZTdiODJkMDcsXG4gIDB4OTBiZjFkOTEsIDB4MWRiNzEwNjQsIDB4NmFiMDIwZjIsIDB4ZjNiOTcxNDgsIDB4ODRiZTQxZGUsXG4gIDB4MWFkYWQ0N2QsIDB4NmRkZGU0ZWIsIDB4ZjRkNGI1NTEsIDB4ODNkMzg1YzcsIDB4MTM2Yzk4NTYsXG4gIDB4NjQ2YmE4YzAsIDB4ZmQ2MmY5N2EsIDB4OGE2NWM5ZWMsIDB4MTQwMTVjNGYsIDB4NjMwNjZjZDksXG4gIDB4ZmEwZjNkNjMsIDB4OGQwODBkZjUsIDB4M2I2ZTIwYzgsIDB4NGM2OTEwNWUsIDB4ZDU2MDQxZTQsXG4gIDB4YTI2NzcxNzIsIDB4M2MwM2U0ZDEsIDB4NGIwNGQ0NDcsIDB4ZDIwZDg1ZmQsIDB4YTUwYWI1NmIsXG4gIDB4MzViNWE4ZmEsIDB4NDJiMjk4NmMsIDB4ZGJiYmM5ZDYsIDB4YWNiY2Y5NDAsIDB4MzJkODZjZTMsXG4gIDB4NDVkZjVjNzUsIDB4ZGNkNjBkY2YsIDB4YWJkMTNkNTksIDB4MjZkOTMwYWMsIDB4NTFkZTAwM2EsXG4gIDB4YzhkNzUxODAsIDB4YmZkMDYxMTYsIDB4MjFiNGY0YjUsIDB4NTZiM2M0MjMsIDB4Y2ZiYTk1OTksXG4gIDB4YjhiZGE1MGYsIDB4MjgwMmI4OWUsIDB4NWYwNTg4MDgsIDB4YzYwY2Q5YjIsIDB4YjEwYmU5MjQsXG4gIDB4MmY2ZjdjODcsIDB4NTg2ODRjMTEsIDB4YzE2MTFkYWIsIDB4YjY2NjJkM2QsIDB4NzZkYzQxOTAsXG4gIDB4MDFkYjcxMDYsIDB4OThkMjIwYmMsIDB4ZWZkNTEwMmEsIDB4NzFiMTg1ODksIDB4MDZiNmI1MWYsXG4gIDB4OWZiZmU0YTUsIDB4ZThiOGQ0MzMsIDB4NzgwN2M5YTIsIDB4MGYwMGY5MzQsIDB4OTYwOWE4OGUsXG4gIDB4ZTEwZTk4MTgsIDB4N2Y2YTBkYmIsIDB4MDg2ZDNkMmQsIDB4OTE2NDZjOTcsIDB4ZTY2MzVjMDEsXG4gIDB4NmI2YjUxZjQsIDB4MWM2YzYxNjIsIDB4ODU2NTMwZDgsIDB4ZjI2MjAwNGUsIDB4NmMwNjk1ZWQsXG4gIDB4MWIwMWE1N2IsIDB4ODIwOGY0YzEsIDB4ZjUwZmM0NTcsIDB4NjViMGQ5YzYsIDB4MTJiN2U5NTAsXG4gIDB4OGJiZWI4ZWEsIDB4ZmNiOTg4N2MsIDB4NjJkZDFkZGYsIDB4MTVkYTJkNDksIDB4OGNkMzdjZjMsXG4gIDB4ZmJkNDRjNjUsIDB4NGRiMjYxNTgsIDB4M2FiNTUxY2UsIDB4YTNiYzAwNzQsIDB4ZDRiYjMwZTIsXG4gIDB4NGFkZmE1NDEsIDB4M2RkODk1ZDcsIDB4YTRkMWM0NmQsIDB4ZDNkNmY0ZmIsIDB4NDM2OWU5NmEsXG4gIDB4MzQ2ZWQ5ZmMsIDB4YWQ2Nzg4NDYsIDB4ZGE2MGI4ZDAsIDB4NDQwNDJkNzMsIDB4MzMwMzFkZTUsXG4gIDB4YWEwYTRjNWYsIDB4ZGQwZDdjYzksIDB4NTAwNTcxM2MsIDB4MjcwMjQxYWEsIDB4YmUwYjEwMTAsXG4gIDB4YzkwYzIwODYsIDB4NTc2OGI1MjUsIDB4MjA2Zjg1YjMsIDB4Yjk2NmQ0MDksIDB4Y2U2MWU0OWYsXG4gIDB4NWVkZWY5MGUsIDB4MjlkOWM5OTgsIDB4YjBkMDk4MjIsIDB4YzdkN2E4YjQsIDB4NTliMzNkMTcsXG4gIDB4MmViNDBkODEsIDB4YjdiZDVjM2IsIDB4YzBiYTZjYWQsIDB4ZWRiODgzMjAsIDB4OWFiZmIzYjYsXG4gIDB4MDNiNmUyMGMsIDB4NzRiMWQyOWEsIDB4ZWFkNTQ3MzksIDB4OWRkMjc3YWYsIDB4MDRkYjI2MTUsXG4gIDB4NzNkYzE2ODMsIDB4ZTM2MzBiMTIsIDB4OTQ2NDNiODQsIDB4MGQ2ZDZhM2UsIDB4N2E2YTVhYTgsXG4gIDB4ZTQwZWNmMGIsIDB4OTMwOWZmOWQsIDB4MGEwMGFlMjcsIDB4N2QwNzllYjEsIDB4ZjAwZjkzNDQsXG4gIDB4ODcwOGEzZDIsIDB4MWUwMWYyNjgsIDB4NjkwNmMyZmUsIDB4Zjc2MjU3NWQsIDB4ODA2NTY3Y2IsXG4gIDB4MTk2YzM2NzEsIDB4NmU2YjA2ZTcsIDB4ZmVkNDFiNzYsIDB4ODlkMzJiZTAsIDB4MTBkYTdhNWEsXG4gIDB4NjdkZDRhY2MsIDB4ZjliOWRmNmYsIDB4OGViZWVmZjksIDB4MTdiN2JlNDMsIDB4NjBiMDhlZDUsXG4gIDB4ZDZkNmEzZTgsIDB4YTFkMTkzN2UsIDB4MzhkOGMyYzQsIDB4NGZkZmYyNTIsIDB4ZDFiYjY3ZjEsXG4gIDB4YTZiYzU3NjcsIDB4M2ZiNTA2ZGQsIDB4NDhiMjM2NGIsIDB4ZDgwZDJiZGEsIDB4YWYwYTFiNGMsXG4gIDB4MzYwMzRhZjYsIDB4NDEwNDdhNjAsIDB4ZGY2MGVmYzMsIDB4YTg2N2RmNTUsIDB4MzE2ZThlZWYsXG4gIDB4NDY2OWJlNzksIDB4Y2I2MWIzOGMsIDB4YmM2NjgzMWEsIDB4MjU2ZmQyYTAsIDB4NTI2OGUyMzYsXG4gIDB4Y2MwYzc3OTUsIDB4YmIwYjQ3MDMsIDB4MjIwMjE2YjksIDB4NTUwNTI2MmYsIDB4YzViYTNiYmUsXG4gIDB4YjJiZDBiMjgsIDB4MmJiNDVhOTIsIDB4NWNiMzZhMDQsIDB4YzJkN2ZmYTcsIDB4YjVkMGNmMzEsXG4gIDB4MmNkOTllOGIsIDB4NWJkZWFlMWQsIDB4OWI2NGMyYjAsIDB4ZWM2M2YyMjYsIDB4NzU2YWEzOWMsXG4gIDB4MDI2ZDkzMGEsIDB4OWMwOTA2YTksIDB4ZWIwZTM2M2YsIDB4NzIwNzY3ODUsIDB4MDUwMDU3MTMsXG4gIDB4OTViZjRhODIsIDB4ZTJiODdhMTQsIDB4N2JiMTJiYWUsIDB4MGNiNjFiMzgsIDB4OTJkMjhlOWIsXG4gIDB4ZTVkNWJlMGQsIDB4N2NkY2VmYjcsIDB4MGJkYmRmMjEsIDB4ODZkM2QyZDQsIDB4ZjFkNGUyNDIsXG4gIDB4NjhkZGIzZjgsIDB4MWZkYTgzNmUsIDB4ODFiZTE2Y2QsIDB4ZjZiOTI2NWIsIDB4NmZiMDc3ZTEsXG4gIDB4MThiNzQ3NzcsIDB4ODgwODVhZTYsIDB4ZmYwZjZhNzAsIDB4NjYwNjNiY2EsIDB4MTEwMTBiNWMsXG4gIDB4OGY2NTllZmYsIDB4Zjg2MmFlNjksIDB4NjE2YmZmZDMsIDB4MTY2Y2NmNDUsIDB4YTAwYWUyNzgsXG4gIDB4ZDcwZGQyZWUsIDB4NGUwNDgzNTQsIDB4MzkwM2IzYzIsIDB4YTc2NzI2NjEsIDB4ZDA2MDE2ZjcsXG4gIDB4NDk2OTQ3NGQsIDB4M2U2ZTc3ZGIsIDB4YWVkMTZhNGEsIDB4ZDlkNjVhZGMsIDB4NDBkZjBiNjYsXG4gIDB4MzdkODNiZjAsIDB4YTliY2FlNTMsIDB4ZGViYjllYzUsIDB4NDdiMmNmN2YsIDB4MzBiNWZmZTksXG4gIDB4YmRiZGYyMWMsIDB4Y2FiYWMyOGEsIDB4NTNiMzkzMzAsIDB4MjRiNGEzYTYsIDB4YmFkMDM2MDUsXG4gIDB4Y2RkNzA2OTMsIDB4NTRkZTU3MjksIDB4MjNkOTY3YmYsIDB4YjM2NjdhMmUsIDB4YzQ2MTRhYjgsXG4gIDB4NWQ2ODFiMDIsIDB4MmE2ZjJiOTQsIDB4YjQwYmJlMzcsIDB4YzMwYzhlYTEsIDB4NWEwNWRmMWIsXG4gIDB4MmQwMmVmOGRcbl07XG5cbmlmICh0eXBlb2YgSW50MzJBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgQ1JDX1RBQkxFID0gbmV3IEludDMyQXJyYXkoQ1JDX1RBQkxFKTtcbn1cblxuZnVuY3Rpb24gbmV3RW1wdHlCdWZmZXIobGVuZ3RoKSB7XG4gIHZhciBidWZmZXIgPSBuZXcgQnVmZmVyKGxlbmd0aCk7XG4gIGJ1ZmZlci5maWxsKDB4MDApO1xuICByZXR1cm4gYnVmZmVyO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVCdWZmZXIoaW5wdXQpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihpbnB1dCkpIHtcbiAgICByZXR1cm4gaW5wdXQ7XG4gIH1cblxuICB2YXIgaGFzTmV3QnVmZmVyQVBJID1cbiAgICAgIHR5cGVvZiBCdWZmZXIuYWxsb2MgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgdHlwZW9mIEJ1ZmZlci5mcm9tID09PSBcImZ1bmN0aW9uXCI7XG5cbiAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gXCJudW1iZXJcIikge1xuICAgIHJldHVybiBoYXNOZXdCdWZmZXJBUEkgPyBCdWZmZXIuYWxsb2MoaW5wdXQpIDogbmV3RW1wdHlCdWZmZXIoaW5wdXQpO1xuICB9XG4gIGVsc2UgaWYgKHR5cGVvZiBpbnB1dCA9PT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiBoYXNOZXdCdWZmZXJBUEkgPyBCdWZmZXIuZnJvbShpbnB1dCkgOiBuZXcgQnVmZmVyKGlucHV0KTtcbiAgfVxuICBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnB1dCBtdXN0IGJlIGJ1ZmZlciwgbnVtYmVyLCBvciBzdHJpbmcsIHJlY2VpdmVkIFwiICtcbiAgICAgICAgICAgICAgICAgICAgdHlwZW9mIGlucHV0KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBidWZmZXJpemVJbnQobnVtKSB7XG4gIHZhciB0bXAgPSBlbnN1cmVCdWZmZXIoNCk7XG4gIHRtcC53cml0ZUludDMyQkUobnVtLCAwKTtcbiAgcmV0dXJuIHRtcDtcbn1cblxuZnVuY3Rpb24gX2NyYzMyKGJ1ZiwgcHJldmlvdXMpIHtcbiAgYnVmID0gZW5zdXJlQnVmZmVyKGJ1Zik7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIocHJldmlvdXMpKSB7XG4gICAgcHJldmlvdXMgPSBwcmV2aW91cy5yZWFkVUludDMyQkUoMCk7XG4gIH1cbiAgdmFyIGNyYyA9IH5+cHJldmlvdXMgXiAtMTtcbiAgZm9yICh2YXIgbiA9IDA7IG4gPCBidWYubGVuZ3RoOyBuKyspIHtcbiAgICBjcmMgPSBDUkNfVEFCTEVbKGNyYyBeIGJ1ZltuXSkgJiAweGZmXSBeIChjcmMgPj4+IDgpO1xuICB9XG4gIHJldHVybiAoY3JjIF4gLTEpO1xufVxuXG5mdW5jdGlvbiBjcmMzMigpIHtcbiAgcmV0dXJuIGJ1ZmZlcml6ZUludChfY3JjMzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKSk7XG59XG5jcmMzMi5zaWduZWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBfY3JjMzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbn07XG5jcmMzMi51bnNpZ25lZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIF9jcmMzMi5hcHBseShudWxsLCBhcmd1bWVudHMpID4+PiAwO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBjcmMzMjtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9DU0JXaXphcmQnKTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRcdFx0XHRcdGNyZWF0ZVF1ZTogcmVxdWlyZShcIi4vbGliL2ZvbGRlck1RXCIpLmdldEZvbGRlclF1ZXVlXG5cdFx0XHRcdFx0Ly9mb2xkZXJNUTogcmVxdWlyZShcIi4vbGliL2ZvbGRlck1RXCIpXG59OyIsIi8qXG5Nb2R1bGUgdGhhdCBvZmZlcnMgQVBJcyB0byBpbnRlcmFjdCB3aXRoIFByaXZhdGVTa3kgd2ViIHNhbmRib3hlc1xuICovXG5cblxuY29uc3QgZXhwb3J0QnJvd3NlckludGVyYWN0ID0ge1xuICAgIGVuYWJsZUlmcmFtZUludGVyYWN0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVXaW5kb3dNUSA9IHJlcXVpcmUoXCIuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9zcGVjaWZpY01RSW1wbC9DaGlsZFduZE1RXCIpLmNyZWF0ZU1RO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVXaW5kb3dJbnRlcmFjdGlvblNwYWNlID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1dpbmRvd01RSW50ZXJhY3Rpb25TcGFjZVwiKS5jcmVhdGVJbnRlcmFjdGlvblNwYWNlO1xuICAgIH0sXG4gICAgZW5hYmxlUmVhY3RJbnRlcmFjdGlvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuY3JlYXRlV2luZG93TVEgPSByZXF1aXJlKFwiLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvc3BlY2lmaWNNUUltcGwvQ2hpbGRXbmRNUVwiKS5jcmVhdGVNUTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuY3JlYXRlV2luZG93SW50ZXJhY3Rpb25TcGFjZSA9IHJlcXVpcmUoXCIuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9XaW5kb3dNUUludGVyYWN0aW9uU3BhY2VcIikuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZTtcbiAgICB9LFxuICAgIGVuYWJsZVdlYlZpZXdJbnRlcmFjdGlvbnM6ZnVuY3Rpb24oKXtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuY3JlYXRlV2luZG93SW50ZXJhY3Rpb25TcGFjZSA9IHJlcXVpcmUoXCIuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9XZWJWaWV3TVFJbnRlcmFjdGlvblNwYWNlXCIpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2U7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmNyZWF0ZVdpbmRvd01RID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL3NwZWNpZmljTVFJbXBsL0NoaWxkV2ViVmlld01RXCIpLmNyZWF0ZU1RO1xuICAgIH0sXG4gICAgZW5hYmxlTG9jYWxJbnRlcmFjdGlvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZSA9IHJlcXVpcmUoXCIuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9Tb3VuZFB1YlN1Yk1RQmFzZWRJbnRlcmFjdGlvblNwYWNlXCIpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2U7XG4gICAgfSxcbiAgICBlbmFibGVSZW1vdGVJbnRlcmFjdGlvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuY3JlYXRlUmVtb3RlSW50ZXJhY3Rpb25TcGFjZSA9IHJlcXVpcmUoJy4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL2h0dHBJbnRlcmFjdGlvblNwYWNlJykuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZTtcbiAgICB9XG59O1xuXG5cbmlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBleHBvcnRCcm93c2VySW50ZXJhY3Q7XG59XG5lbHNlIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAgICAgY3JlYXRlTm9kZUludGVyYWN0aW9uU3BhY2U6IHJlcXVpcmUoXCIuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9mb2xkZXJNUUJhc2VkSW50ZXJhY3Rpb25TcGFjZVwiKS5jcmVhdGVJbnRlcmFjdGlvblNwYWNlLFxuICAgICAgICBjcmVhdGVJbnRlcmFjdGlvblNwYWNlOiByZXF1aXJlKFwiLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvU291bmRQdWJTdWJNUUJhc2VkSW50ZXJhY3Rpb25TcGFjZVwiKS5jcmVhdGVJbnRlcmFjdGlvblNwYWNlLFxuICAgICAgICBjcmVhdGVSZW1vdGVJbnRlcmFjdGlvblNwYWNlOiByZXF1aXJlKCcuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9odHRwSW50ZXJhY3Rpb25TcGFjZScpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2VcbiAgICB9O1xufSIsInZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcbnZhciBzdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKTtcbnZhciBSZWFkYWJsZSA9IHN0cmVhbS5SZWFkYWJsZTtcbnZhciBXcml0YWJsZSA9IHN0cmVhbS5Xcml0YWJsZTtcbnZhciBQYXNzVGhyb3VnaCA9IHN0cmVhbS5QYXNzVGhyb3VnaDtcbnZhciBQZW5kID0gcmVxdWlyZSgnLi9tb2R1bGVzL25vZGUtcGVuZCcpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxuZXhwb3J0cy5jcmVhdGVGcm9tQnVmZmVyID0gY3JlYXRlRnJvbUJ1ZmZlcjtcbmV4cG9ydHMuY3JlYXRlRnJvbUZkID0gY3JlYXRlRnJvbUZkO1xuZXhwb3J0cy5CdWZmZXJTbGljZXIgPSBCdWZmZXJTbGljZXI7XG5leHBvcnRzLkZkU2xpY2VyID0gRmRTbGljZXI7XG5cbnV0aWwuaW5oZXJpdHMoRmRTbGljZXIsIEV2ZW50RW1pdHRlcik7XG5mdW5jdGlvbiBGZFNsaWNlcihmZCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cbiAgdGhpcy5mZCA9IGZkO1xuICB0aGlzLnBlbmQgPSBuZXcgUGVuZCgpO1xuICB0aGlzLnBlbmQubWF4ID0gMTtcbiAgdGhpcy5yZWZDb3VudCA9IDA7XG4gIHRoaXMuYXV0b0Nsb3NlID0gISFvcHRpb25zLmF1dG9DbG9zZTtcbn1cblxuRmRTbGljZXIucHJvdG90eXBlLnJlYWQgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLnBlbmQuZ28oZnVuY3Rpb24oY2IpIHtcbiAgICBmcy5yZWFkKHNlbGYuZmQsIGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBmdW5jdGlvbihlcnIsIGJ5dGVzUmVhZCwgYnVmZmVyKSB7XG4gICAgICBjYigpO1xuICAgICAgY2FsbGJhY2soZXJyLCBieXRlc1JlYWQsIGJ1ZmZlcik7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuRmRTbGljZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5wZW5kLmdvKGZ1bmN0aW9uKGNiKSB7XG4gICAgZnMud3JpdGUoc2VsZi5mZCwgYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGZ1bmN0aW9uKGVyciwgd3JpdHRlbiwgYnVmZmVyKSB7XG4gICAgICBjYigpO1xuICAgICAgY2FsbGJhY2soZXJyLCB3cml0dGVuLCBidWZmZXIpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbkZkU2xpY2VyLnByb3RvdHlwZS5jcmVhdGVSZWFkU3RyZWFtID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICByZXR1cm4gbmV3IFJlYWRTdHJlYW0odGhpcywgb3B0aW9ucyk7XG59O1xuXG5GZFNsaWNlci5wcm90b3R5cGUuY3JlYXRlV3JpdGVTdHJlYW0gPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgV3JpdGVTdHJlYW0odGhpcywgb3B0aW9ucyk7XG59O1xuXG5GZFNsaWNlci5wcm90b3R5cGUucmVmID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMucmVmQ291bnQgKz0gMTtcbn07XG5cbkZkU2xpY2VyLnByb3RvdHlwZS51bnJlZiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYucmVmQ291bnQgLT0gMTtcblxuICBpZiAoc2VsZi5yZWZDb3VudCA+IDApIHJldHVybjtcbiAgaWYgKHNlbGYucmVmQ291bnQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIHVucmVmXCIpO1xuXG4gIGlmIChzZWxmLmF1dG9DbG9zZSkge1xuICAgIGZzLmNsb3NlKHNlbGYuZmQsIG9uQ2xvc2VEb25lKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2xvc2VEb25lKGVycikge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZWxmLmVtaXQoJ2Nsb3NlJyk7XG4gICAgfVxuICB9XG59O1xuXG51dGlsLmluaGVyaXRzKFJlYWRTdHJlYW0sIFJlYWRhYmxlKTtcbmZ1bmN0aW9uIFJlYWRTdHJlYW0oY29udGV4dCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgUmVhZGFibGUuY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLmNvbnRleHQucmVmKCk7XG5cbiAgdGhpcy5zdGFydCA9IG9wdGlvbnMuc3RhcnQgfHwgMDtcbiAgdGhpcy5lbmRPZmZzZXQgPSBvcHRpb25zLmVuZDtcbiAgdGhpcy5wb3MgPSB0aGlzLnN0YXJ0O1xuICB0aGlzLmRlc3Ryb3llZCA9IGZhbHNlO1xufVxuXG5SZWFkU3RyZWFtLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoc2VsZi5kZXN0cm95ZWQpIHJldHVybjtcblxuICB2YXIgdG9SZWFkID0gTWF0aC5taW4oc2VsZi5fcmVhZGFibGVTdGF0ZS5oaWdoV2F0ZXJNYXJrLCBuKTtcbiAgaWYgKHNlbGYuZW5kT2Zmc2V0ICE9IG51bGwpIHtcbiAgICB0b1JlYWQgPSBNYXRoLm1pbih0b1JlYWQsIHNlbGYuZW5kT2Zmc2V0IC0gc2VsZi5wb3MpO1xuICB9XG4gIGlmICh0b1JlYWQgPD0gMCkge1xuICAgIHNlbGYuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICBzZWxmLnB1c2gobnVsbCk7XG4gICAgc2VsZi5jb250ZXh0LnVucmVmKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHNlbGYuY29udGV4dC5wZW5kLmdvKGZ1bmN0aW9uKGNiKSB7XG4gICAgaWYgKHNlbGYuZGVzdHJveWVkKSByZXR1cm4gY2IoKTtcbiAgICB2YXIgYnVmZmVyID0gbmV3IEJ1ZmZlcih0b1JlYWQpO1xuICAgIGZzLnJlYWQoc2VsZi5jb250ZXh0LmZkLCBidWZmZXIsIDAsIHRvUmVhZCwgc2VsZi5wb3MsIGZ1bmN0aW9uKGVyciwgYnl0ZXNSZWFkKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHNlbGYuZGVzdHJveShlcnIpO1xuICAgICAgfSBlbHNlIGlmIChieXRlc1JlYWQgPT09IDApIHtcbiAgICAgICAgc2VsZi5kZXN0cm95ZWQgPSB0cnVlO1xuICAgICAgICBzZWxmLnB1c2gobnVsbCk7XG4gICAgICAgIHNlbGYuY29udGV4dC51bnJlZigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5wb3MgKz0gYnl0ZXNSZWFkO1xuICAgICAgICBzZWxmLnB1c2goYnVmZmVyLnNsaWNlKDAsIGJ5dGVzUmVhZCkpO1xuICAgICAgfVxuICAgICAgY2IoKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5SZWFkU3RyZWFtLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oZXJyKSB7XG4gIGlmICh0aGlzLmRlc3Ryb3llZCkgcmV0dXJuO1xuICBlcnIgPSBlcnIgfHwgbmV3IEVycm9yKFwic3RyZWFtIGRlc3Ryb3llZFwiKTtcbiAgdGhpcy5kZXN0cm95ZWQgPSB0cnVlO1xuICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgdGhpcy5jb250ZXh0LnVucmVmKCk7XG59O1xuXG51dGlsLmluaGVyaXRzKFdyaXRlU3RyZWFtLCBXcml0YWJsZSk7XG5mdW5jdGlvbiBXcml0ZVN0cmVhbShjb250ZXh0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBXcml0YWJsZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuY29udGV4dC5yZWYoKTtcblxuICB0aGlzLnN0YXJ0ID0gb3B0aW9ucy5zdGFydCB8fCAwO1xuICB0aGlzLmVuZE9mZnNldCA9IChvcHRpb25zLmVuZCA9PSBudWxsKSA/IEluZmluaXR5IDogK29wdGlvbnMuZW5kO1xuICB0aGlzLmJ5dGVzV3JpdHRlbiA9IDA7XG4gIHRoaXMucG9zID0gdGhpcy5zdGFydDtcbiAgdGhpcy5kZXN0cm95ZWQgPSBmYWxzZTtcblxuICB0aGlzLm9uKCdmaW5pc2gnLCB0aGlzLmRlc3Ryb3kuYmluZCh0aGlzKSk7XG59XG5cbldyaXRlU3RyZWFtLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIGVuY29kaW5nLCBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmIChzZWxmLmRlc3Ryb3llZCkgcmV0dXJuO1xuXG4gIGlmIChzZWxmLnBvcyArIGJ1ZmZlci5sZW5ndGggPiBzZWxmLmVuZE9mZnNldCkge1xuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoXCJtYXhpbXVtIGZpbGUgbGVuZ3RoIGV4Y2VlZGVkXCIpO1xuICAgIGVyci5jb2RlID0gJ0VUT09CSUcnO1xuICAgIHNlbGYuZGVzdHJveSgpO1xuICAgIGNhbGxiYWNrKGVycik7XG4gICAgcmV0dXJuO1xuICB9XG4gIHNlbGYuY29udGV4dC5wZW5kLmdvKGZ1bmN0aW9uKGNiKSB7XG4gICAgaWYgKHNlbGYuZGVzdHJveWVkKSByZXR1cm4gY2IoKTtcbiAgICBmcy53cml0ZShzZWxmLmNvbnRleHQuZmQsIGJ1ZmZlciwgMCwgYnVmZmVyLmxlbmd0aCwgc2VsZi5wb3MsIGZ1bmN0aW9uKGVyciwgYnl0ZXMpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIGNiKCk7XG4gICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLmJ5dGVzV3JpdHRlbiArPSBieXRlcztcbiAgICAgICAgc2VsZi5wb3MgKz0gYnl0ZXM7XG4gICAgICAgIHNlbGYuZW1pdCgncHJvZ3Jlc3MnKTtcbiAgICAgICAgY2IoKTtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59O1xuXG5Xcml0ZVN0cmVhbS5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5kZXN0cm95ZWQpIHJldHVybjtcbiAgdGhpcy5kZXN0cm95ZWQgPSB0cnVlO1xuICB0aGlzLmNvbnRleHQudW5yZWYoKTtcbn07XG5cbnV0aWwuaW5oZXJpdHMoQnVmZmVyU2xpY2VyLCBFdmVudEVtaXR0ZXIpO1xuZnVuY3Rpb24gQnVmZmVyU2xpY2VyKGJ1ZmZlciwgb3B0aW9ucykge1xuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5yZWZDb3VudCA9IDA7XG4gIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xuICB0aGlzLm1heENodW5rU2l6ZSA9IG9wdGlvbnMubWF4Q2h1bmtTaXplIHx8IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xufVxuXG5CdWZmZXJTbGljZXIucHJvdG90eXBlLnJlYWQgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgY2FsbGJhY2spIHtcbiAgdmFyIGVuZCA9IHBvc2l0aW9uICsgbGVuZ3RoO1xuICB2YXIgZGVsdGEgPSBlbmQgLSB0aGlzLmJ1ZmZlci5sZW5ndGg7XG4gIHZhciB3cml0dGVuID0gKGRlbHRhID4gMCkgPyBkZWx0YSA6IGxlbmd0aDtcbiAgdGhpcy5idWZmZXIuY29weShidWZmZXIsIG9mZnNldCwgcG9zaXRpb24sIGVuZCk7XG4gIHNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICBjYWxsYmFjayhudWxsLCB3cml0dGVuKTtcbiAgfSk7XG59O1xuXG5CdWZmZXJTbGljZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrKSB7XG4gIGJ1ZmZlci5jb3B5KHRoaXMuYnVmZmVyLCBwb3NpdGlvbiwgb2Zmc2V0LCBvZmZzZXQgKyBsZW5ndGgpO1xuICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgY2FsbGJhY2sobnVsbCwgbGVuZ3RoLCBidWZmZXIpO1xuICB9KTtcbn07XG5cbkJ1ZmZlclNsaWNlci5wcm90b3R5cGUuY3JlYXRlUmVhZFN0cmVhbSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciByZWFkU3RyZWFtID0gbmV3IFBhc3NUaHJvdWdoKG9wdGlvbnMpO1xuICByZWFkU3RyZWFtLmRlc3Ryb3llZCA9IGZhbHNlO1xuICByZWFkU3RyZWFtLnN0YXJ0ID0gb3B0aW9ucy5zdGFydCB8fCAwO1xuICByZWFkU3RyZWFtLmVuZE9mZnNldCA9IG9wdGlvbnMuZW5kO1xuICAvLyBieSB0aGUgdGltZSB0aGlzIGZ1bmN0aW9uIHJldHVybnMsIHdlJ2xsIGJlIGRvbmUuXG4gIHJlYWRTdHJlYW0ucG9zID0gcmVhZFN0cmVhbS5lbmRPZmZzZXQgfHwgdGhpcy5idWZmZXIubGVuZ3RoO1xuXG4gIC8vIHJlc3BlY3QgdGhlIG1heENodW5rU2l6ZSBvcHRpb24gdG8gc2xpY2UgdXAgdGhlIGNodW5rIGludG8gc21hbGxlciBwaWVjZXMuXG4gIHZhciBlbnRpcmVTbGljZSA9IHRoaXMuYnVmZmVyLnNsaWNlKHJlYWRTdHJlYW0uc3RhcnQsIHJlYWRTdHJlYW0ucG9zKTtcbiAgdmFyIG9mZnNldCA9IDA7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgdmFyIG5leHRPZmZzZXQgPSBvZmZzZXQgKyB0aGlzLm1heENodW5rU2l6ZTtcbiAgICBpZiAobmV4dE9mZnNldCA+PSBlbnRpcmVTbGljZS5sZW5ndGgpIHtcbiAgICAgIC8vIGxhc3QgY2h1bmtcbiAgICAgIGlmIChvZmZzZXQgPCBlbnRpcmVTbGljZS5sZW5ndGgpIHtcbiAgICAgICAgcmVhZFN0cmVhbS53cml0ZShlbnRpcmVTbGljZS5zbGljZShvZmZzZXQsIGVudGlyZVNsaWNlLmxlbmd0aCkpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJlYWRTdHJlYW0ud3JpdGUoZW50aXJlU2xpY2Uuc2xpY2Uob2Zmc2V0LCBuZXh0T2Zmc2V0KSk7XG4gICAgb2Zmc2V0ID0gbmV4dE9mZnNldDtcbiAgfVxuXG4gIHJlYWRTdHJlYW0uZW5kKCk7XG4gIHJlYWRTdHJlYW0uZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgIHJlYWRTdHJlYW0uZGVzdHJveWVkID0gdHJ1ZTtcbiAgfTtcbiAgcmV0dXJuIHJlYWRTdHJlYW07XG59O1xuXG5CdWZmZXJTbGljZXIucHJvdG90eXBlLmNyZWF0ZVdyaXRlU3RyZWFtID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICB2YXIgYnVmZmVyU2xpY2VyID0gdGhpcztcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciB3cml0ZVN0cmVhbSA9IG5ldyBXcml0YWJsZShvcHRpb25zKTtcbiAgd3JpdGVTdHJlYW0uc3RhcnQgPSBvcHRpb25zLnN0YXJ0IHx8IDA7XG4gIHdyaXRlU3RyZWFtLmVuZE9mZnNldCA9IChvcHRpb25zLmVuZCA9PSBudWxsKSA/IHRoaXMuYnVmZmVyLmxlbmd0aCA6ICtvcHRpb25zLmVuZDtcbiAgd3JpdGVTdHJlYW0uYnl0ZXNXcml0dGVuID0gMDtcbiAgd3JpdGVTdHJlYW0ucG9zID0gd3JpdGVTdHJlYW0uc3RhcnQ7XG4gIHdyaXRlU3RyZWFtLmRlc3Ryb3llZCA9IGZhbHNlO1xuICB3cml0ZVN0cmVhbS5fd3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIGVuY29kaW5nLCBjYWxsYmFjaykge1xuICAgIGlmICh3cml0ZVN0cmVhbS5kZXN0cm95ZWQpIHJldHVybjtcblxuICAgIHZhciBlbmQgPSB3cml0ZVN0cmVhbS5wb3MgKyBidWZmZXIubGVuZ3RoO1xuICAgIGlmIChlbmQgPiB3cml0ZVN0cmVhbS5lbmRPZmZzZXQpIHtcbiAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoXCJtYXhpbXVtIGZpbGUgbGVuZ3RoIGV4Y2VlZGVkXCIpO1xuICAgICAgZXJyLmNvZGUgPSAnRVRPT0JJRyc7XG4gICAgICB3cml0ZVN0cmVhbS5kZXN0cm95ZWQgPSB0cnVlO1xuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYnVmZmVyLmNvcHkoYnVmZmVyU2xpY2VyLmJ1ZmZlciwgd3JpdGVTdHJlYW0ucG9zLCAwLCBidWZmZXIubGVuZ3RoKTtcblxuICAgIHdyaXRlU3RyZWFtLmJ5dGVzV3JpdHRlbiArPSBidWZmZXIubGVuZ3RoO1xuICAgIHdyaXRlU3RyZWFtLnBvcyA9IGVuZDtcbiAgICB3cml0ZVN0cmVhbS5lbWl0KCdwcm9ncmVzcycpO1xuICAgIGNhbGxiYWNrKCk7XG4gIH07XG4gIHdyaXRlU3RyZWFtLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICB3cml0ZVN0cmVhbS5kZXN0cm95ZWQgPSB0cnVlO1xuICB9O1xuICByZXR1cm4gd3JpdGVTdHJlYW07XG59O1xuXG5CdWZmZXJTbGljZXIucHJvdG90eXBlLnJlZiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnJlZkNvdW50ICs9IDE7XG59O1xuXG5CdWZmZXJTbGljZXIucHJvdG90eXBlLnVucmVmID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMucmVmQ291bnQgLT0gMTtcblxuICBpZiAodGhpcy5yZWZDb3VudCA8IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIHVucmVmXCIpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVGcm9tQnVmZmVyKGJ1ZmZlciwgb3B0aW9ucykge1xuICByZXR1cm4gbmV3IEJ1ZmZlclNsaWNlcihidWZmZXIsIG9wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVGcm9tRmQoZmQsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBGZFNsaWNlcihmZCwgb3B0aW9ucyk7XG59XG4iLCIvL3RvIGxvb2sgbmljZSB0aGUgcmVxdWlyZU1vZHVsZSBvbiBOb2RlXG5yZXF1aXJlKFwiLi9saWIvcHNrLWFic3RyYWN0LWNsaWVudFwiKTtcbmlmKCEkJC5icm93c2VyUnVudGltZSl7XG5cdHJlcXVpcmUoXCIuL2xpYi9wc2stbm9kZS1jbGllbnRcIik7XG59ZWxzZXtcblx0cmVxdWlyZShcIi4vbGliL3Bzay1icm93c2VyLWNsaWVudFwiKTtcbn0iLCJjb25zdCBCbG9ja2NoYWluID0gcmVxdWlyZSgnLi9saWIvQmxvY2tjaGFpbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBzdGFydERCOiBmdW5jdGlvbiAoZm9sZGVyKSB7XG4gICAgICAgIGlmICgkJC5ibG9ja2NoYWluKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJyQkLmJsb2NrY2hhaW4gaXMgYWxyZWFkeSBkZWZpbmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgJCQuYmxvY2tjaGFpbiA9IHRoaXMuY3JlYXRlREJIYW5kbGVyKGZvbGRlcik7XG4gICAgICAgIHJldHVybiAkJC5ibG9ja2NoYWluO1xuICAgIH0sXG4gICAgY3JlYXRlREJIYW5kbGVyOiBmdW5jdGlvbihmb2xkZXIpe1xuICAgICAgICByZXF1aXJlKCcuL2xpYi9kb21haW4nKTtcbiAgICAgICAgcmVxdWlyZSgnLi9saWIvc3dhcm1zJyk7XG5cbiAgICAgICAgY29uc3QgZnBkcyA9IHJlcXVpcmUoXCIuL2xpYi9Gb2xkZXJQZXJzaXN0ZW50UERTXCIpO1xuICAgICAgICBjb25zdCBwZHMgPSBmcGRzLm5ld1BEUyhmb2xkZXIpO1xuXG4gICAgICAgIHJldHVybiBuZXcgQmxvY2tjaGFpbihwZHMpO1xuICAgIH0sXG4gICAgcGFyc2VEb21haW5Vcmw6IGZ1bmN0aW9uIChkb21haW5VcmwpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFbXB0eSBmdW5jdGlvblwiKTtcbiAgICB9LFxuICAgIGdldERvbWFpbkluZm86IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFbXB0eSBmdW5jdGlvblwiKTtcbiAgICB9LFxuICAgIHN0YXJ0SW5NZW1vcnlEQjogZnVuY3Rpb24oKSB7XG5cdFx0cmVxdWlyZSgnLi9saWIvZG9tYWluJyk7XG5cdFx0cmVxdWlyZSgnLi9saWIvc3dhcm1zJyk7XG5cblx0XHRjb25zdCBwZHMgPSByZXF1aXJlKCcuL2xpYi9Jbk1lbW9yeVBEUycpO1xuXG5cdFx0cmV0dXJuIG5ldyBCbG9ja2NoYWluKHBkcy5uZXdQRFMobnVsbCkpO1xuICAgIH0sXG4gICAgc3RhcnREYjogZnVuY3Rpb24ocmVhZGVyV3JpdGVyKSB7XG4gICAgICAgIHJlcXVpcmUoJy4vbGliL2RvbWFpbicpO1xuICAgICAgICByZXF1aXJlKCcuL2xpYi9zd2FybXMnKTtcblxuICAgICAgICBjb25zdCBwcGRzID0gcmVxdWlyZShcIi4vbGliL1BlcnNpc3RlbnRQRFNcIik7XG4gICAgICAgIGNvbnN0IHBkcyA9IHBwZHMubmV3UERTKHJlYWRlcldyaXRlcik7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBCbG9ja2NoYWluKHBkcyk7XG4gICAgfVxufTtcbiIsIm1vZHVsZS5leHBvcnRzLnV0aWxzICA9IHJlcXVpcmUoXCIuL3V0aWxzL2Zsb3dzVXRpbHNcIik7XG5jb25zdCBSb290Q1NCID0gcmVxdWlyZSgnLi9saWJyYXJpZXMvUm9vdENTQicpO1xubW9kdWxlLmV4cG9ydHMuY3JlYXRlUm9vdENTQiA9IFJvb3RDU0IuY3JlYXRlUm9vdENTQjtcbm1vZHVsZS5leHBvcnRzLmxvYWRXaXRoSWRlbnRpZmllciA9IFJvb3RDU0IubG9hZFdpdGhJZGVudGlmaWVyO1xubW9kdWxlLmV4cG9ydHMubG9hZFdpdGhQaW4gICA9IFJvb3RDU0IubG9hZFdpdGhQaW47XG5tb2R1bGUuZXhwb3J0cy53cml0ZU5ld01hc3RlckNTQiA9IFJvb3RDU0Iud3JpdGVOZXdNYXN0ZXJDU0I7XG5tb2R1bGUuZXhwb3J0cy5Sb290Q1NCID0gUm9vdENTQjtcbm1vZHVsZS5leHBvcnRzLlJhd0NTQiA9IHJlcXVpcmUoJy4vbGlicmFyaWVzL1Jhd0NTQicpO1xubW9kdWxlLmV4cG9ydHMuQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoJy4vbGlicmFyaWVzL0NTQklkZW50aWZpZXInKTtcbm1vZHVsZS5leHBvcnRzLmluaXQgPSBmdW5jdGlvbiAoKSB7XG5cdCQkLmxvYWRMaWJyYXJ5KFwicHNrd2FsbGV0XCIsIHJlcXVpcmUoXCIuL2xpYnJhcmllcy9mbG93cy9pbmRleFwiKSk7XG59O1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjb25zVXRpbDogcmVxdWlyZSgnLi9jb25zVXRpbCcpXG59OyIsInZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciB6bGliID0gcmVxdWlyZShcInpsaWJcIik7XG5jb25zdCBmZF9zbGljZXIgPSByZXF1aXJlKFwibm9kZS1mZC1zbGljZXJcIik7XG52YXIgY3JjMzIgPSByZXF1aXJlKFwiYnVmZmVyLWNyYzMyXCIpO1xudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKFwic3RyZWFtXCIpLlRyYW5zZm9ybTtcbnZhciBQYXNzVGhyb3VnaCA9IHJlcXVpcmUoXCJzdHJlYW1cIikuUGFzc1Rocm91Z2g7XG52YXIgV3JpdGFibGUgPSByZXF1aXJlKFwic3RyZWFtXCIpLldyaXRhYmxlO1xuXG5leHBvcnRzLm9wZW4gPSBvcGVuO1xuZXhwb3J0cy5mcm9tRmQgPSBmcm9tRmQ7XG5leHBvcnRzLmZyb21CdWZmZXIgPSBmcm9tQnVmZmVyO1xuZXhwb3J0cy5mcm9tUmFuZG9tQWNjZXNzUmVhZGVyID0gZnJvbVJhbmRvbUFjY2Vzc1JlYWRlcjtcbmV4cG9ydHMuZG9zRGF0ZVRpbWVUb0RhdGUgPSBkb3NEYXRlVGltZVRvRGF0ZTtcbmV4cG9ydHMudmFsaWRhdGVGaWxlTmFtZSA9IHZhbGlkYXRlRmlsZU5hbWU7XG5leHBvcnRzLlppcEZpbGUgPSBaaXBGaWxlO1xuZXhwb3J0cy5FbnRyeSA9IEVudHJ5O1xuZXhwb3J0cy5SYW5kb21BY2Nlc3NSZWFkZXIgPSBSYW5kb21BY2Nlc3NSZWFkZXI7XG5cbmZ1bmN0aW9uIG9wZW4ocGF0aCwgb3B0aW9ucywgY2FsbGJhY2spIHtcblx0aWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRjYWxsYmFjayA9IG9wdGlvbnM7XG5cdFx0b3B0aW9ucyA9IG51bGw7XG5cdH1cblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXHRpZiAob3B0aW9ucy5hdXRvQ2xvc2UgPT0gbnVsbCkgb3B0aW9ucy5hdXRvQ2xvc2UgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy5sYXp5RW50cmllcyA9PSBudWxsKSBvcHRpb25zLmxhenlFbnRyaWVzID0gZmFsc2U7XG5cdGlmIChvcHRpb25zLmRlY29kZVN0cmluZ3MgPT0gbnVsbCkgb3B0aW9ucy5kZWNvZGVTdHJpbmdzID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzID09IG51bGwpIG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzID09IG51bGwpIG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzID0gZmFsc2U7XG5cdGlmIChjYWxsYmFjayA9PSBudWxsKSBjYWxsYmFjayA9IGRlZmF1bHRDYWxsYmFjaztcblx0ZnMub3BlbihwYXRoLCBcInJcIiwgZnVuY3Rpb24gKGVyciwgZmQpIHtcblx0XHRpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRmcm9tRmQoZmQsIG9wdGlvbnMsIGZ1bmN0aW9uIChlcnIsIHppcGZpbGUpIHtcblx0XHRcdGlmIChlcnIpIGZzLmNsb3NlKGZkLCBkZWZhdWx0Q2FsbGJhY2spO1xuXHRcdFx0Y2FsbGJhY2soZXJyLCB6aXBmaWxlKTtcblx0XHR9KTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGZyb21GZChmZCwgb3B0aW9ucywgY2FsbGJhY2spIHtcblx0aWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRjYWxsYmFjayA9IG9wdGlvbnM7XG5cdFx0b3B0aW9ucyA9IG51bGw7XG5cdH1cblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXHRpZiAob3B0aW9ucy5hdXRvQ2xvc2UgPT0gbnVsbCkgb3B0aW9ucy5hdXRvQ2xvc2UgPSBmYWxzZTtcblx0aWYgKG9wdGlvbnMubGF6eUVudHJpZXMgPT0gbnVsbCkgb3B0aW9ucy5sYXp5RW50cmllcyA9IGZhbHNlO1xuXHRpZiAob3B0aW9ucy5kZWNvZGVTdHJpbmdzID09IG51bGwpIG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9IHRydWU7XG5cdGlmIChvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9PSBudWxsKSBvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9IHRydWU7XG5cdGlmIChvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9PSBudWxsKSBvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9IGZhbHNlO1xuXHRpZiAoY2FsbGJhY2sgPT0gbnVsbCkgY2FsbGJhY2sgPSBkZWZhdWx0Q2FsbGJhY2s7XG5cdGZzLmZzdGF0KGZkLCBmdW5jdGlvbiAoZXJyLCBzdGF0cykge1xuXHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdHZhciByZWFkZXIgPSBmZF9zbGljZXIuY3JlYXRlRnJvbUZkKGZkLCB7YXV0b0Nsb3NlOiB0cnVlfSk7XG5cdFx0ZnJvbVJhbmRvbUFjY2Vzc1JlYWRlcihyZWFkZXIsIHN0YXRzLnNpemUsIG9wdGlvbnMsIGNhbGxiYWNrKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGZyb21CdWZmZXIoYnVmZmVyLCBvcHRpb25zLCBjYWxsYmFjaykge1xuXHRpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdGNhbGxiYWNrID0gb3B0aW9ucztcblx0XHRvcHRpb25zID0gbnVsbDtcblx0fVxuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdG9wdGlvbnMuYXV0b0Nsb3NlID0gZmFsc2U7XG5cdGlmIChvcHRpb25zLmxhenlFbnRyaWVzID09IG51bGwpIG9wdGlvbnMubGF6eUVudHJpZXMgPSBmYWxzZTtcblx0aWYgKG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9PSBudWxsKSBvcHRpb25zLmRlY29kZVN0cmluZ3MgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPT0gbnVsbCkgb3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPT0gbnVsbCkgb3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPSBmYWxzZTtcblx0Ly8gbGltaXQgdGhlIG1heCBjaHVuayBzaXplLiBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3RoZWpvc2h3b2xmZS95YXV6bC9pc3N1ZXMvODdcblx0dmFyIHJlYWRlciA9IGZkX3NsaWNlci5jcmVhdGVGcm9tQnVmZmVyKGJ1ZmZlciwge21heENodW5rU2l6ZTogMHgxMDAwMH0pO1xuXHRmcm9tUmFuZG9tQWNjZXNzUmVhZGVyKHJlYWRlciwgYnVmZmVyLmxlbmd0aCwgb3B0aW9ucywgY2FsbGJhY2spO1xufVxuXG5mdW5jdGlvbiBmcm9tUmFuZG9tQWNjZXNzUmVhZGVyKHJlYWRlciwgdG90YWxTaXplLCBvcHRpb25zLCBjYWxsYmFjaykge1xuXHRpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdGNhbGxiYWNrID0gb3B0aW9ucztcblx0XHRvcHRpb25zID0gbnVsbDtcblx0fVxuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdGlmIChvcHRpb25zLmF1dG9DbG9zZSA9PSBudWxsKSBvcHRpb25zLmF1dG9DbG9zZSA9IHRydWU7XG5cdGlmIChvcHRpb25zLmxhenlFbnRyaWVzID09IG51bGwpIG9wdGlvbnMubGF6eUVudHJpZXMgPSBmYWxzZTtcblx0aWYgKG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9PSBudWxsKSBvcHRpb25zLmRlY29kZVN0cmluZ3MgPSB0cnVlO1xuXHR2YXIgZGVjb2RlU3RyaW5ncyA9ICEhb3B0aW9ucy5kZWNvZGVTdHJpbmdzO1xuXHRpZiAob3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPT0gbnVsbCkgb3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPT0gbnVsbCkgb3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPSBmYWxzZTtcblx0aWYgKGNhbGxiYWNrID09IG51bGwpIGNhbGxiYWNrID0gZGVmYXVsdENhbGxiYWNrO1xuXHRpZiAodHlwZW9mIHRvdGFsU2l6ZSAhPT0gXCJudW1iZXJcIikgdGhyb3cgbmV3IEVycm9yKFwiZXhwZWN0ZWQgdG90YWxTaXplIHBhcmFtZXRlciB0byBiZSBhIG51bWJlclwiKTtcblx0aWYgKHRvdGFsU2l6ZSA+IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiemlwIGZpbGUgdG9vIGxhcmdlLiBvbmx5IGZpbGUgc2l6ZXMgdXAgdG8gMl41MiBhcmUgc3VwcG9ydGVkIGR1ZSB0byBKYXZhU2NyaXB0J3MgTnVtYmVyIHR5cGUgYmVpbmcgYW4gSUVFRSA3NTQgZG91YmxlLlwiKTtcblx0fVxuXG5cdC8vIHRoZSBtYXRjaGluZyB1bnJlZigpIGNhbGwgaXMgaW4gemlwZmlsZS5jbG9zZSgpXG5cdHJlYWRlci5yZWYoKTtcblxuXHQvLyBlb2NkciBtZWFucyBFbmQgb2YgQ2VudHJhbCBEaXJlY3RvcnkgUmVjb3JkLlxuXHQvLyBzZWFyY2ggYmFja3dhcmRzIGZvciB0aGUgZW9jZHIgc2lnbmF0dXJlLlxuXHQvLyB0aGUgbGFzdCBmaWVsZCBvZiB0aGUgZW9jZHIgaXMgYSB2YXJpYWJsZS1sZW5ndGggY29tbWVudC5cblx0Ly8gdGhlIGNvbW1lbnQgc2l6ZSBpcyBlbmNvZGVkIGluIGEgMi1ieXRlIGZpZWxkIGluIHRoZSBlb2Nkciwgd2hpY2ggd2UgY2FuJ3QgZmluZCB3aXRob3V0IHRydWRnaW5nIGJhY2t3YXJkcyB0aHJvdWdoIHRoZSBjb21tZW50IHRvIGZpbmQgaXQuXG5cdC8vIGFzIGEgY29uc2VxdWVuY2Ugb2YgdGhpcyBkZXNpZ24gZGVjaXNpb24sIGl0J3MgcG9zc2libGUgdG8gaGF2ZSBhbWJpZ3VvdXMgemlwIGZpbGUgbWV0YWRhdGEgaWYgYSBjb2hlcmVudCBlb2NkciB3YXMgaW4gdGhlIGNvbW1lbnQuXG5cdC8vIHdlIHNlYXJjaCBiYWNrd2FyZHMgZm9yIGEgZW9jZHIgc2lnbmF0dXJlLCBhbmQgaG9wZSB0aGF0IHdob2V2ZXIgbWFkZSB0aGUgemlwIGZpbGUgd2FzIHNtYXJ0IGVub3VnaCB0byBmb3JiaWQgdGhlIGVvY2RyIHNpZ25hdHVyZSBpbiB0aGUgY29tbWVudC5cblx0dmFyIGVvY2RyV2l0aG91dENvbW1lbnRTaXplID0gMjI7XG5cdHZhciBtYXhDb21tZW50U2l6ZSA9IDB4ZmZmZjsgLy8gMi1ieXRlIHNpemVcblx0dmFyIGJ1ZmZlclNpemUgPSBNYXRoLm1pbihlb2NkcldpdGhvdXRDb21tZW50U2l6ZSArIG1heENvbW1lbnRTaXplLCB0b3RhbFNpemUpO1xuXHR2YXIgYnVmZmVyID0gbmV3QnVmZmVyKGJ1ZmZlclNpemUpO1xuXHR2YXIgYnVmZmVyUmVhZFN0YXJ0ID0gdG90YWxTaXplIC0gYnVmZmVyLmxlbmd0aDtcblx0cmVhZEFuZEFzc2VydE5vRW9mKHJlYWRlciwgYnVmZmVyLCAwLCBidWZmZXJTaXplLCBidWZmZXJSZWFkU3RhcnQsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRmb3IgKHZhciBpID0gYnVmZmVyU2l6ZSAtIGVvY2RyV2l0aG91dENvbW1lbnRTaXplOyBpID49IDA7IGkgLT0gMSkge1xuXHRcdFx0aWYgKGJ1ZmZlci5yZWFkVUludDMyTEUoaSkgIT09IDB4MDYwNTRiNTApIGNvbnRpbnVlO1xuXHRcdFx0Ly8gZm91bmQgZW9jZHJcblx0XHRcdHZhciBlb2NkckJ1ZmZlciA9IGJ1ZmZlci5zbGljZShpKTtcblxuXHRcdFx0Ly8gMCAtIEVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSBzaWduYXR1cmUgPSAweDA2MDU0YjUwXG5cdFx0XHQvLyA0IC0gTnVtYmVyIG9mIHRoaXMgZGlza1xuXHRcdFx0dmFyIGRpc2tOdW1iZXIgPSBlb2NkckJ1ZmZlci5yZWFkVUludDE2TEUoNCk7XG5cdFx0XHRpZiAoZGlza051bWJlciAhPT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwibXVsdGktZGlzayB6aXAgZmlsZXMgYXJlIG5vdCBzdXBwb3J0ZWQ6IGZvdW5kIGRpc2sgbnVtYmVyOiBcIiArIGRpc2tOdW1iZXIpKTtcblx0XHRcdH1cblx0XHRcdC8vIDYgLSBEaXNrIHdoZXJlIGNlbnRyYWwgZGlyZWN0b3J5IHN0YXJ0c1xuXHRcdFx0Ly8gOCAtIE51bWJlciBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmRzIG9uIHRoaXMgZGlza1xuXHRcdFx0Ly8gMTAgLSBUb3RhbCBudW1iZXIgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3Jkc1xuXHRcdFx0dmFyIGVudHJ5Q291bnQgPSBlb2NkckJ1ZmZlci5yZWFkVUludDE2TEUoMTApO1xuXHRcdFx0Ly8gMTIgLSBTaXplIG9mIGNlbnRyYWwgZGlyZWN0b3J5IChieXRlcylcblx0XHRcdC8vIDE2IC0gT2Zmc2V0IG9mIHN0YXJ0IG9mIGNlbnRyYWwgZGlyZWN0b3J5LCByZWxhdGl2ZSB0byBzdGFydCBvZiBhcmNoaXZlXG5cdFx0XHR2YXIgY2VudHJhbERpcmVjdG9yeU9mZnNldCA9IGVvY2RyQnVmZmVyLnJlYWRVSW50MzJMRSgxNik7XG5cdFx0XHQvLyAyMCAtIENvbW1lbnQgbGVuZ3RoXG5cdFx0XHR2YXIgY29tbWVudExlbmd0aCA9IGVvY2RyQnVmZmVyLnJlYWRVSW50MTZMRSgyMCk7XG5cdFx0XHR2YXIgZXhwZWN0ZWRDb21tZW50TGVuZ3RoID0gZW9jZHJCdWZmZXIubGVuZ3RoIC0gZW9jZHJXaXRob3V0Q29tbWVudFNpemU7XG5cdFx0XHRpZiAoY29tbWVudExlbmd0aCAhPT0gZXhwZWN0ZWRDb21tZW50TGVuZ3RoKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJpbnZhbGlkIGNvbW1lbnQgbGVuZ3RoLiBleHBlY3RlZDogXCIgKyBleHBlY3RlZENvbW1lbnRMZW5ndGggKyBcIi4gZm91bmQ6IFwiICsgY29tbWVudExlbmd0aCkpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gMjIgLSBDb21tZW50XG5cdFx0XHQvLyB0aGUgZW5jb2RpbmcgaXMgYWx3YXlzIGNwNDM3LlxuXHRcdFx0dmFyIGNvbW1lbnQgPSBkZWNvZGVTdHJpbmdzID8gZGVjb2RlQnVmZmVyKGVvY2RyQnVmZmVyLCAyMiwgZW9jZHJCdWZmZXIubGVuZ3RoLCBmYWxzZSlcblx0XHRcdFx0OiBlb2NkckJ1ZmZlci5zbGljZSgyMik7XG5cblx0XHRcdGlmICghKGVudHJ5Q291bnQgPT09IDB4ZmZmZiB8fCBjZW50cmFsRGlyZWN0b3J5T2Zmc2V0ID09PSAweGZmZmZmZmZmKSkge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgbmV3IFppcEZpbGUocmVhZGVyLCBjZW50cmFsRGlyZWN0b3J5T2Zmc2V0LCB0b3RhbFNpemUsIGVudHJ5Q291bnQsIGNvbW1lbnQsIG9wdGlvbnMuYXV0b0Nsb3NlLCBvcHRpb25zLmxhenlFbnRyaWVzLCBkZWNvZGVTdHJpbmdzLCBvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcywgb3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMpKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gWklQNjQgZm9ybWF0XG5cblx0XHRcdC8vIFpJUDY0IFppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSBsb2NhdG9yXG5cdFx0XHR2YXIgemlwNjRFb2NkbEJ1ZmZlciA9IG5ld0J1ZmZlcigyMCk7XG5cdFx0XHR2YXIgemlwNjRFb2NkbE9mZnNldCA9IGJ1ZmZlclJlYWRTdGFydCArIGkgLSB6aXA2NEVvY2RsQnVmZmVyLmxlbmd0aDtcblx0XHRcdHJlYWRBbmRBc3NlcnROb0VvZihyZWFkZXIsIHppcDY0RW9jZGxCdWZmZXIsIDAsIHppcDY0RW9jZGxCdWZmZXIubGVuZ3RoLCB6aXA2NEVvY2RsT2Zmc2V0LCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXG5cdFx0XHRcdC8vIDAgLSB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXIgbG9jYXRvciBzaWduYXR1cmUgPSAweDA3MDY0YjUwXG5cdFx0XHRcdGlmICh6aXA2NEVvY2RsQnVmZmVyLnJlYWRVSW50MzJMRSgwKSAhPT0gMHgwNzA2NGI1MCkge1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJpbnZhbGlkIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSBsb2NhdG9yIHNpZ25hdHVyZVwiKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gNCAtIG51bWJlciBvZiB0aGUgZGlzayB3aXRoIHRoZSBzdGFydCBvZiB0aGUgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5XG5cdFx0XHRcdC8vIDggLSByZWxhdGl2ZSBvZmZzZXQgb2YgdGhlIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmRcblx0XHRcdFx0dmFyIHppcDY0RW9jZHJPZmZzZXQgPSByZWFkVUludDY0TEUoemlwNjRFb2NkbEJ1ZmZlciwgOCk7XG5cdFx0XHRcdC8vIDE2IC0gdG90YWwgbnVtYmVyIG9mIGRpc2tzXG5cblx0XHRcdFx0Ly8gWklQNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZFxuXHRcdFx0XHR2YXIgemlwNjRFb2NkckJ1ZmZlciA9IG5ld0J1ZmZlcig1Nik7XG5cdFx0XHRcdHJlYWRBbmRBc3NlcnROb0VvZihyZWFkZXIsIHppcDY0RW9jZHJCdWZmZXIsIDAsIHppcDY0RW9jZHJCdWZmZXIubGVuZ3RoLCB6aXA2NEVvY2RyT2Zmc2V0LCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRcdFx0aWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cblx0XHRcdFx0XHQvLyAwIC0gemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyIHNpZ25hdHVyZSAgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXMgICgweDA2MDY0YjUwKVxuXHRcdFx0XHRcdGlmICh6aXA2NEVvY2RyQnVmZmVyLnJlYWRVSW50MzJMRSgwKSAhPT0gMHgwNjA2NGI1MCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImludmFsaWQgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZCBzaWduYXR1cmVcIikpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyA0IC0gc2l6ZSBvZiB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3JkICAgICAgICAgICAgICAgIDggYnl0ZXNcblx0XHRcdFx0XHQvLyAxMiAtIHZlcnNpb24gbWFkZSBieSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0XHRcdFx0XHQvLyAxNCAtIHZlcnNpb24gbmVlZGVkIHRvIGV4dHJhY3QgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0XHRcdFx0XHQvLyAxNiAtIG51bWJlciBvZiB0aGlzIGRpc2sgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0XHRcdFx0XHQvLyAyMCAtIG51bWJlciBvZiB0aGUgZGlzayB3aXRoIHRoZSBzdGFydCBvZiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgIDQgYnl0ZXNcblx0XHRcdFx0XHQvLyAyNCAtIHRvdGFsIG51bWJlciBvZiBlbnRyaWVzIGluIHRoZSBjZW50cmFsIGRpcmVjdG9yeSBvbiB0aGlzIGRpc2sgICAgICAgICA4IGJ5dGVzXG5cdFx0XHRcdFx0Ly8gMzIgLSB0b3RhbCBudW1iZXIgb2YgZW50cmllcyBpbiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgICAgICAgICAgICA4IGJ5dGVzXG5cdFx0XHRcdFx0ZW50cnlDb3VudCA9IHJlYWRVSW50NjRMRSh6aXA2NEVvY2RyQnVmZmVyLCAzMik7XG5cdFx0XHRcdFx0Ly8gNDAgLSBzaXplIG9mIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdFx0XHRcdFx0Ly8gNDggLSBvZmZzZXQgb2Ygc3RhcnQgb2YgY2VudHJhbCBkaXJlY3Rvcnkgd2l0aCByZXNwZWN0IHRvIHRoZSBzdGFydGluZyBkaXNrIG51bWJlciAgICAgOCBieXRlc1xuXHRcdFx0XHRcdGNlbnRyYWxEaXJlY3RvcnlPZmZzZXQgPSByZWFkVUludDY0TEUoemlwNjRFb2NkckJ1ZmZlciwgNDgpO1xuXHRcdFx0XHRcdC8vIDU2IC0gemlwNjQgZXh0ZW5zaWJsZSBkYXRhIHNlY3RvciAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHZhcmlhYmxlIHNpemUpXG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIG5ldyBaaXBGaWxlKHJlYWRlciwgY2VudHJhbERpcmVjdG9yeU9mZnNldCwgdG90YWxTaXplLCBlbnRyeUNvdW50LCBjb21tZW50LCBvcHRpb25zLmF1dG9DbG9zZSwgb3B0aW9ucy5sYXp5RW50cmllcywgZGVjb2RlU3RyaW5ncywgb3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMsIG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzKSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNhbGxiYWNrKG5ldyBFcnJvcihcImVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmQgc2lnbmF0dXJlIG5vdCBmb3VuZFwiKSk7XG5cdH0pO1xufVxuXG51dGlsLmluaGVyaXRzKFppcEZpbGUsIEV2ZW50RW1pdHRlcik7XG5cbmZ1bmN0aW9uIFppcEZpbGUocmVhZGVyLCBjZW50cmFsRGlyZWN0b3J5T2Zmc2V0LCBmaWxlU2l6ZSwgZW50cnlDb3VudCwgY29tbWVudCwgYXV0b0Nsb3NlLCBsYXp5RW50cmllcywgZGVjb2RlU3RyaW5ncywgdmFsaWRhdGVFbnRyeVNpemVzLCBzdHJpY3RGaWxlTmFtZXMpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRFdmVudEVtaXR0ZXIuY2FsbChzZWxmKTtcblx0c2VsZi5yZWFkZXIgPSByZWFkZXI7XG5cdC8vIGZvcndhcmQgY2xvc2UgZXZlbnRzXG5cdHNlbGYucmVhZGVyLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycikge1xuXHRcdC8vIGVycm9yIGNsb3NpbmcgdGhlIGZkXG5cdFx0ZW1pdEVycm9yKHNlbGYsIGVycik7XG5cdH0pO1xuXHRzZWxmLnJlYWRlci5vbmNlKFwiY2xvc2VcIiwgZnVuY3Rpb24gKCkge1xuXHRcdHNlbGYuZW1pdChcImNsb3NlXCIpO1xuXHR9KTtcblx0c2VsZi5yZWFkRW50cnlDdXJzb3IgPSBjZW50cmFsRGlyZWN0b3J5T2Zmc2V0O1xuXHRzZWxmLmZpbGVTaXplID0gZmlsZVNpemU7XG5cdHNlbGYuZW50cnlDb3VudCA9IGVudHJ5Q291bnQ7XG5cdHNlbGYuY29tbWVudCA9IGNvbW1lbnQ7XG5cdHNlbGYuZW50cmllc1JlYWQgPSAwO1xuXHRzZWxmLmF1dG9DbG9zZSA9ICEhYXV0b0Nsb3NlO1xuXHRzZWxmLmxhenlFbnRyaWVzID0gISFsYXp5RW50cmllcztcblx0c2VsZi5kZWNvZGVTdHJpbmdzID0gISFkZWNvZGVTdHJpbmdzO1xuXHRzZWxmLnZhbGlkYXRlRW50cnlTaXplcyA9ICEhdmFsaWRhdGVFbnRyeVNpemVzO1xuXHRzZWxmLnN0cmljdEZpbGVOYW1lcyA9ICEhc3RyaWN0RmlsZU5hbWVzO1xuXHRzZWxmLmlzT3BlbiA9IHRydWU7XG5cdHNlbGYuZW1pdHRlZEVycm9yID0gZmFsc2U7XG5cblx0aWYgKCFzZWxmLmxhenlFbnRyaWVzKSBzZWxmLl9yZWFkRW50cnkoKTtcbn1cblxuWmlwRmlsZS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICghdGhpcy5pc09wZW4pIHJldHVybjtcblx0dGhpcy5pc09wZW4gPSBmYWxzZTtcblx0dGhpcy5yZWFkZXIudW5yZWYoKTtcbn07XG5cbmZ1bmN0aW9uIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBlcnIpIHtcblx0aWYgKHNlbGYuYXV0b0Nsb3NlKSBzZWxmLmNsb3NlKCk7XG5cdGVtaXRFcnJvcihzZWxmLCBlcnIpO1xufVxuXG5mdW5jdGlvbiBlbWl0RXJyb3Ioc2VsZiwgZXJyKSB7XG5cdGlmIChzZWxmLmVtaXR0ZWRFcnJvcikgcmV0dXJuO1xuXHRzZWxmLmVtaXR0ZWRFcnJvciA9IHRydWU7XG5cdHNlbGYuZW1pdChcImVycm9yXCIsIGVycik7XG59XG5cblppcEZpbGUucHJvdG90eXBlLnJlYWRFbnRyeSA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKCF0aGlzLmxhenlFbnRyaWVzKSB0aHJvdyBuZXcgRXJyb3IoXCJyZWFkRW50cnkoKSBjYWxsZWQgd2l0aG91dCBsYXp5RW50cmllczp0cnVlXCIpO1xuXHR0aGlzLl9yZWFkRW50cnkoKTtcbn07XG5aaXBGaWxlLnByb3RvdHlwZS5fcmVhZEVudHJ5ID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmIChzZWxmLmVudHJ5Q291bnQgPT09IHNlbGYuZW50cmllc1JlYWQpIHtcblx0XHQvLyBkb25lIHdpdGggbWV0YWRhdGFcblx0XHRzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHNlbGYuYXV0b0Nsb3NlKSBzZWxmLmNsb3NlKCk7XG5cdFx0XHRpZiAoc2VsZi5lbWl0dGVkRXJyb3IpIHJldHVybjtcblx0XHRcdHNlbGYuZW1pdChcImVuZFwiKTtcblx0XHR9KTtcblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKHNlbGYuZW1pdHRlZEVycm9yKSByZXR1cm47XG5cdHZhciBidWZmZXIgPSBuZXdCdWZmZXIoNDYpO1xuXHRyZWFkQW5kQXNzZXJ0Tm9Fb2Yoc2VsZi5yZWFkZXIsIGJ1ZmZlciwgMCwgYnVmZmVyLmxlbmd0aCwgc2VsZi5yZWFkRW50cnlDdXJzb3IsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRpZiAoZXJyKSByZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIGVycik7XG5cdFx0aWYgKHNlbGYuZW1pdHRlZEVycm9yKSByZXR1cm47XG5cdFx0dmFyIGVudHJ5ID0gbmV3IEVudHJ5KCk7XG5cdFx0Ly8gMCAtIENlbnRyYWwgZGlyZWN0b3J5IGZpbGUgaGVhZGVyIHNpZ25hdHVyZVxuXHRcdHZhciBzaWduYXR1cmUgPSBidWZmZXIucmVhZFVJbnQzMkxFKDApO1xuXHRcdGlmIChzaWduYXR1cmUgIT09IDB4MDIwMTRiNTApIHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKFwiaW52YWxpZCBjZW50cmFsIGRpcmVjdG9yeSBmaWxlIGhlYWRlciBzaWduYXR1cmU6IDB4XCIgKyBzaWduYXR1cmUudG9TdHJpbmcoMTYpKSk7XG5cdFx0Ly8gNCAtIFZlcnNpb24gbWFkZSBieVxuXHRcdGVudHJ5LnZlcnNpb25NYWRlQnkgPSBidWZmZXIucmVhZFVJbnQxNkxFKDQpO1xuXHRcdC8vIDYgLSBWZXJzaW9uIG5lZWRlZCB0byBleHRyYWN0IChtaW5pbXVtKVxuXHRcdGVudHJ5LnZlcnNpb25OZWVkZWRUb0V4dHJhY3QgPSBidWZmZXIucmVhZFVJbnQxNkxFKDYpO1xuXHRcdC8vIDggLSBHZW5lcmFsIHB1cnBvc2UgYml0IGZsYWdcblx0XHRlbnRyeS5nZW5lcmFsUHVycG9zZUJpdEZsYWcgPSBidWZmZXIucmVhZFVJbnQxNkxFKDgpO1xuXHRcdC8vIDEwIC0gQ29tcHJlc3Npb24gbWV0aG9kXG5cdFx0ZW50cnkuY29tcHJlc3Npb25NZXRob2QgPSBidWZmZXIucmVhZFVJbnQxNkxFKDEwKTtcblx0XHQvLyAxMiAtIEZpbGUgbGFzdCBtb2RpZmljYXRpb24gdGltZVxuXHRcdGVudHJ5Lmxhc3RNb2RGaWxlVGltZSA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMTIpO1xuXHRcdC8vIDE0IC0gRmlsZSBsYXN0IG1vZGlmaWNhdGlvbiBkYXRlXG5cdFx0ZW50cnkubGFzdE1vZEZpbGVEYXRlID0gYnVmZmVyLnJlYWRVSW50MTZMRSgxNCk7XG5cdFx0Ly8gMTYgLSBDUkMtMzJcblx0XHRlbnRyeS5jcmMzMiA9IGJ1ZmZlci5yZWFkVUludDMyTEUoMTYpO1xuXHRcdC8vIDIwIC0gQ29tcHJlc3NlZCBzaXplXG5cdFx0ZW50cnkuY29tcHJlc3NlZFNpemUgPSBidWZmZXIucmVhZFVJbnQzMkxFKDIwKTtcblx0XHQvLyAyNCAtIFVuY29tcHJlc3NlZCBzaXplXG5cdFx0ZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9IGJ1ZmZlci5yZWFkVUludDMyTEUoMjQpO1xuXHRcdC8vIDI4IC0gRmlsZSBuYW1lIGxlbmd0aCAobilcblx0XHRlbnRyeS5maWxlTmFtZUxlbmd0aCA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMjgpO1xuXHRcdC8vIDMwIC0gRXh0cmEgZmllbGQgbGVuZ3RoIChtKVxuXHRcdGVudHJ5LmV4dHJhRmllbGRMZW5ndGggPSBidWZmZXIucmVhZFVJbnQxNkxFKDMwKTtcblx0XHQvLyAzMiAtIEZpbGUgY29tbWVudCBsZW5ndGggKGspXG5cdFx0ZW50cnkuZmlsZUNvbW1lbnRMZW5ndGggPSBidWZmZXIucmVhZFVJbnQxNkxFKDMyKTtcblx0XHQvLyAzNCAtIERpc2sgbnVtYmVyIHdoZXJlIGZpbGUgc3RhcnRzXG5cdFx0Ly8gMzYgLSBJbnRlcm5hbCBmaWxlIGF0dHJpYnV0ZXNcblx0XHRlbnRyeS5pbnRlcm5hbEZpbGVBdHRyaWJ1dGVzID0gYnVmZmVyLnJlYWRVSW50MTZMRSgzNik7XG5cdFx0Ly8gMzggLSBFeHRlcm5hbCBmaWxlIGF0dHJpYnV0ZXNcblx0XHRlbnRyeS5leHRlcm5hbEZpbGVBdHRyaWJ1dGVzID0gYnVmZmVyLnJlYWRVSW50MzJMRSgzOCk7XG5cdFx0Ly8gNDIgLSBSZWxhdGl2ZSBvZmZzZXQgb2YgbG9jYWwgZmlsZSBoZWFkZXJcblx0XHRlbnRyeS5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgPSBidWZmZXIucmVhZFVJbnQzMkxFKDQyKTtcblxuXHRcdGlmIChlbnRyeS5nZW5lcmFsUHVycG9zZUJpdEZsYWcgJiAweDQwKSByZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihcInN0cm9uZyBlbmNyeXB0aW9uIGlzIG5vdCBzdXBwb3J0ZWRcIikpO1xuXG5cdFx0c2VsZi5yZWFkRW50cnlDdXJzb3IgKz0gNDY7XG5cblx0XHRidWZmZXIgPSBuZXdCdWZmZXIoZW50cnkuZmlsZU5hbWVMZW5ndGggKyBlbnRyeS5leHRyYUZpZWxkTGVuZ3RoICsgZW50cnkuZmlsZUNvbW1lbnRMZW5ndGgpO1xuXHRcdHJlYWRBbmRBc3NlcnROb0VvZihzZWxmLnJlYWRlciwgYnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoLCBzZWxmLnJlYWRFbnRyeUN1cnNvciwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0aWYgKGVycikgcmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBlcnIpO1xuXHRcdFx0aWYgKHNlbGYuZW1pdHRlZEVycm9yKSByZXR1cm47XG5cdFx0XHQvLyA0NiAtIEZpbGUgbmFtZVxuXHRcdFx0dmFyIGlzVXRmOCA9IChlbnRyeS5nZW5lcmFsUHVycG9zZUJpdEZsYWcgJiAweDgwMCkgIT09IDA7XG5cdFx0XHRlbnRyeS5maWxlTmFtZSA9IHNlbGYuZGVjb2RlU3RyaW5ncyA/IGRlY29kZUJ1ZmZlcihidWZmZXIsIDAsIGVudHJ5LmZpbGVOYW1lTGVuZ3RoLCBpc1V0ZjgpXG5cdFx0XHRcdDogYnVmZmVyLnNsaWNlKDAsIGVudHJ5LmZpbGVOYW1lTGVuZ3RoKTtcblxuXHRcdFx0Ly8gNDYrbiAtIEV4dHJhIGZpZWxkXG5cdFx0XHR2YXIgZmlsZUNvbW1lbnRTdGFydCA9IGVudHJ5LmZpbGVOYW1lTGVuZ3RoICsgZW50cnkuZXh0cmFGaWVsZExlbmd0aDtcblx0XHRcdHZhciBleHRyYUZpZWxkQnVmZmVyID0gYnVmZmVyLnNsaWNlKGVudHJ5LmZpbGVOYW1lTGVuZ3RoLCBmaWxlQ29tbWVudFN0YXJ0KTtcblx0XHRcdGVudHJ5LmV4dHJhRmllbGRzID0gW107XG5cdFx0XHR2YXIgaSA9IDA7XG5cdFx0XHR3aGlsZSAoaSA8IGV4dHJhRmllbGRCdWZmZXIubGVuZ3RoIC0gMykge1xuXHRcdFx0XHR2YXIgaGVhZGVySWQgPSBleHRyYUZpZWxkQnVmZmVyLnJlYWRVSW50MTZMRShpICsgMCk7XG5cdFx0XHRcdHZhciBkYXRhU2l6ZSA9IGV4dHJhRmllbGRCdWZmZXIucmVhZFVJbnQxNkxFKGkgKyAyKTtcblx0XHRcdFx0dmFyIGRhdGFTdGFydCA9IGkgKyA0O1xuXHRcdFx0XHR2YXIgZGF0YUVuZCA9IGRhdGFTdGFydCArIGRhdGFTaXplO1xuXHRcdFx0XHRpZiAoZGF0YUVuZCA+IGV4dHJhRmllbGRCdWZmZXIubGVuZ3RoKSByZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihcImV4dHJhIGZpZWxkIGxlbmd0aCBleGNlZWRzIGV4dHJhIGZpZWxkIGJ1ZmZlciBzaXplXCIpKTtcblx0XHRcdFx0dmFyIGRhdGFCdWZmZXIgPSBuZXdCdWZmZXIoZGF0YVNpemUpO1xuXHRcdFx0XHRleHRyYUZpZWxkQnVmZmVyLmNvcHkoZGF0YUJ1ZmZlciwgMCwgZGF0YVN0YXJ0LCBkYXRhRW5kKTtcblx0XHRcdFx0ZW50cnkuZXh0cmFGaWVsZHMucHVzaCh7XG5cdFx0XHRcdFx0aWQ6IGhlYWRlcklkLFxuXHRcdFx0XHRcdGRhdGE6IGRhdGFCdWZmZXIsXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRpID0gZGF0YUVuZDtcblx0XHRcdH1cblxuXHRcdFx0Ly8gNDYrbittIC0gRmlsZSBjb21tZW50XG5cdFx0XHRlbnRyeS5maWxlQ29tbWVudCA9IHNlbGYuZGVjb2RlU3RyaW5ncyA/IGRlY29kZUJ1ZmZlcihidWZmZXIsIGZpbGVDb21tZW50U3RhcnQsIGZpbGVDb21tZW50U3RhcnQgKyBlbnRyeS5maWxlQ29tbWVudExlbmd0aCwgaXNVdGY4KVxuXHRcdFx0XHQ6IGJ1ZmZlci5zbGljZShmaWxlQ29tbWVudFN0YXJ0LCBmaWxlQ29tbWVudFN0YXJ0ICsgZW50cnkuZmlsZUNvbW1lbnRMZW5ndGgpO1xuXHRcdFx0Ly8gY29tcGF0aWJpbGl0eSBoYWNrIGZvciBodHRwczovL2dpdGh1Yi5jb20vdGhlam9zaHdvbGZlL3lhdXpsL2lzc3Vlcy80N1xuXHRcdFx0ZW50cnkuY29tbWVudCA9IGVudHJ5LmZpbGVDb21tZW50O1xuXG5cdFx0XHRzZWxmLnJlYWRFbnRyeUN1cnNvciArPSBidWZmZXIubGVuZ3RoO1xuXHRcdFx0c2VsZi5lbnRyaWVzUmVhZCArPSAxO1xuXG5cdFx0XHRpZiAoZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9PT0gMHhmZmZmZmZmZiB8fFxuXHRcdFx0XHRlbnRyeS5jb21wcmVzc2VkU2l6ZSA9PT0gMHhmZmZmZmZmZiB8fFxuXHRcdFx0XHRlbnRyeS5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgPT09IDB4ZmZmZmZmZmYpIHtcblx0XHRcdFx0Ly8gWklQNjQgZm9ybWF0XG5cdFx0XHRcdC8vIGZpbmQgdGhlIFppcDY0IEV4dGVuZGVkIEluZm9ybWF0aW9uIEV4dHJhIEZpZWxkXG5cdFx0XHRcdHZhciB6aXA2NEVpZWZCdWZmZXIgPSBudWxsO1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVudHJ5LmV4dHJhRmllbGRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dmFyIGV4dHJhRmllbGQgPSBlbnRyeS5leHRyYUZpZWxkc1tpXTtcblx0XHRcdFx0XHRpZiAoZXh0cmFGaWVsZC5pZCA9PT0gMHgwMDAxKSB7XG5cdFx0XHRcdFx0XHR6aXA2NEVpZWZCdWZmZXIgPSBleHRyYUZpZWxkLmRhdGE7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHppcDY0RWllZkJ1ZmZlciA9PSBudWxsKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IoXCJleHBlY3RlZCB6aXA2NCBleHRlbmRlZCBpbmZvcm1hdGlvbiBleHRyYSBmaWVsZFwiKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGluZGV4ID0gMDtcblx0XHRcdFx0Ly8gMCAtIE9yaWdpbmFsIFNpemUgICAgICAgICAgOCBieXRlc1xuXHRcdFx0XHRpZiAoZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9PT0gMHhmZmZmZmZmZikge1xuXHRcdFx0XHRcdGlmIChpbmRleCArIDggPiB6aXA2NEVpZWZCdWZmZXIubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihcInppcDY0IGV4dGVuZGVkIGluZm9ybWF0aW9uIGV4dHJhIGZpZWxkIGRvZXMgbm90IGluY2x1ZGUgdW5jb21wcmVzc2VkIHNpemVcIikpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbnRyeS51bmNvbXByZXNzZWRTaXplID0gcmVhZFVJbnQ2NExFKHppcDY0RWllZkJ1ZmZlciwgaW5kZXgpO1xuXHRcdFx0XHRcdGluZGV4ICs9IDg7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gOCAtIENvbXByZXNzZWQgU2l6ZSAgICAgICAgOCBieXRlc1xuXHRcdFx0XHRpZiAoZW50cnkuY29tcHJlc3NlZFNpemUgPT09IDB4ZmZmZmZmZmYpIHtcblx0XHRcdFx0XHRpZiAoaW5kZXggKyA4ID4gemlwNjRFaWVmQnVmZmVyLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IoXCJ6aXA2NCBleHRlbmRlZCBpbmZvcm1hdGlvbiBleHRyYSBmaWVsZCBkb2VzIG5vdCBpbmNsdWRlIGNvbXByZXNzZWQgc2l6ZVwiKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVudHJ5LmNvbXByZXNzZWRTaXplID0gcmVhZFVJbnQ2NExFKHppcDY0RWllZkJ1ZmZlciwgaW5kZXgpO1xuXHRcdFx0XHRcdGluZGV4ICs9IDg7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gMTYgLSBSZWxhdGl2ZSBIZWFkZXIgT2Zmc2V0IDggYnl0ZXNcblx0XHRcdFx0aWYgKGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9PT0gMHhmZmZmZmZmZikge1xuXHRcdFx0XHRcdGlmIChpbmRleCArIDggPiB6aXA2NEVpZWZCdWZmZXIubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihcInppcDY0IGV4dGVuZGVkIGluZm9ybWF0aW9uIGV4dHJhIGZpZWxkIGRvZXMgbm90IGluY2x1ZGUgcmVsYXRpdmUgaGVhZGVyIG9mZnNldFwiKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9IHJlYWRVSW50NjRMRSh6aXA2NEVpZWZCdWZmZXIsIGluZGV4KTtcblx0XHRcdFx0XHRpbmRleCArPSA4O1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIDI0IC0gRGlzayBTdGFydCBOdW1iZXIgICAgICA0IGJ5dGVzXG5cdFx0XHR9XG5cblx0XHRcdC8vIGNoZWNrIGZvciBJbmZvLVpJUCBVbmljb2RlIFBhdGggRXh0cmEgRmllbGQgKDB4NzA3NSlcblx0XHRcdC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vdGhlam9zaHdvbGZlL3lhdXpsL2lzc3Vlcy8zM1xuXHRcdFx0aWYgKHNlbGYuZGVjb2RlU3RyaW5ncykge1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVudHJ5LmV4dHJhRmllbGRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dmFyIGV4dHJhRmllbGQgPSBlbnRyeS5leHRyYUZpZWxkc1tpXTtcblx0XHRcdFx0XHRpZiAoZXh0cmFGaWVsZC5pZCA9PT0gMHg3MDc1KSB7XG5cdFx0XHRcdFx0XHRpZiAoZXh0cmFGaWVsZC5kYXRhLmxlbmd0aCA8IDYpIHtcblx0XHRcdFx0XHRcdFx0Ly8gdG9vIHNob3J0IHRvIGJlIG1lYW5pbmdmdWxcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyBWZXJzaW9uICAgICAgIDEgYnl0ZSAgICAgIHZlcnNpb24gb2YgdGhpcyBleHRyYSBmaWVsZCwgY3VycmVudGx5IDFcblx0XHRcdFx0XHRcdGlmIChleHRyYUZpZWxkLmRhdGEucmVhZFVJbnQ4KDApICE9PSAxKSB7XG5cdFx0XHRcdFx0XHRcdC8vID4gQ2hhbmdlcyBtYXkgbm90IGJlIGJhY2t3YXJkIGNvbXBhdGlibGUgc28gdGhpcyBleHRyYVxuXHRcdFx0XHRcdFx0XHQvLyA+IGZpZWxkIHNob3VsZCBub3QgYmUgdXNlZCBpZiB0aGUgdmVyc2lvbiBpcyBub3QgcmVjb2duaXplZC5cblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyBOYW1lQ1JDMzIgICAgIDQgYnl0ZXMgICAgIEZpbGUgTmFtZSBGaWVsZCBDUkMzMiBDaGVja3N1bVxuXHRcdFx0XHRcdFx0dmFyIG9sZE5hbWVDcmMzMiA9IGV4dHJhRmllbGQuZGF0YS5yZWFkVUludDMyTEUoMSk7XG5cdFx0XHRcdFx0XHRpZiAoY3JjMzIudW5zaWduZWQoYnVmZmVyLnNsaWNlKDAsIGVudHJ5LmZpbGVOYW1lTGVuZ3RoKSkgIT09IG9sZE5hbWVDcmMzMikge1xuXHRcdFx0XHRcdFx0XHQvLyA+IElmIHRoZSBDUkMgY2hlY2sgZmFpbHMsIHRoaXMgVVRGLTggUGF0aCBFeHRyYSBGaWVsZCBzaG91bGQgYmVcblx0XHRcdFx0XHRcdFx0Ly8gPiBpZ25vcmVkIGFuZCB0aGUgRmlsZSBOYW1lIGZpZWxkIGluIHRoZSBoZWFkZXIgc2hvdWxkIGJlIHVzZWQgaW5zdGVhZC5cblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyBVbmljb2RlTmFtZSAgIFZhcmlhYmxlICAgIFVURi04IHZlcnNpb24gb2YgdGhlIGVudHJ5IEZpbGUgTmFtZVxuXHRcdFx0XHRcdFx0ZW50cnkuZmlsZU5hbWUgPSBkZWNvZGVCdWZmZXIoZXh0cmFGaWVsZC5kYXRhLCA1LCBleHRyYUZpZWxkLmRhdGEubGVuZ3RoLCB0cnVlKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyB2YWxpZGF0ZSBmaWxlIHNpemVcblx0XHRcdGlmIChzZWxmLnZhbGlkYXRlRW50cnlTaXplcyAmJiBlbnRyeS5jb21wcmVzc2lvbk1ldGhvZCA9PT0gMCkge1xuXHRcdFx0XHR2YXIgZXhwZWN0ZWRDb21wcmVzc2VkU2l6ZSA9IGVudHJ5LnVuY29tcHJlc3NlZFNpemU7XG5cdFx0XHRcdGlmIChlbnRyeS5pc0VuY3J5cHRlZCgpKSB7XG5cdFx0XHRcdFx0Ly8gdHJhZGl0aW9uYWwgZW5jcnlwdGlvbiBwcmVmaXhlcyB0aGUgZmlsZSBkYXRhIHdpdGggYSBoZWFkZXJcblx0XHRcdFx0XHRleHBlY3RlZENvbXByZXNzZWRTaXplICs9IDEyO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChlbnRyeS5jb21wcmVzc2VkU2l6ZSAhPT0gZXhwZWN0ZWRDb21wcmVzc2VkU2l6ZSkge1xuXHRcdFx0XHRcdHZhciBtc2cgPSBcImNvbXByZXNzZWQvdW5jb21wcmVzc2VkIHNpemUgbWlzbWF0Y2ggZm9yIHN0b3JlZCBmaWxlOiBcIiArIGVudHJ5LmNvbXByZXNzZWRTaXplICsgXCIgIT0gXCIgKyBlbnRyeS51bmNvbXByZXNzZWRTaXplO1xuXHRcdFx0XHRcdHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKG1zZykpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChzZWxmLmRlY29kZVN0cmluZ3MpIHtcblx0XHRcdFx0aWYgKCFzZWxmLnN0cmljdEZpbGVOYW1lcykge1xuXHRcdFx0XHRcdC8vIGFsbG93IGJhY2tzbGFzaFxuXHRcdFx0XHRcdGVudHJ5LmZpbGVOYW1lID0gZW50cnkuZmlsZU5hbWUucmVwbGFjZSgvXFxcXC9nLCBcIi9cIik7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGVycm9yTWVzc2FnZSA9IHZhbGlkYXRlRmlsZU5hbWUoZW50cnkuZmlsZU5hbWUsIHNlbGYudmFsaWRhdGVGaWxlTmFtZU9wdGlvbnMpO1xuXHRcdFx0XHRpZiAoZXJyb3JNZXNzYWdlICE9IG51bGwpIHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKGVycm9yTWVzc2FnZSkpO1xuXHRcdFx0fVxuXHRcdFx0c2VsZi5lbWl0KFwiZW50cnlcIiwgZW50cnkpO1xuXG5cdFx0XHRpZiAoIXNlbGYubGF6eUVudHJpZXMpIHNlbGYuX3JlYWRFbnRyeSgpO1xuXHRcdH0pO1xuXHR9KTtcbn07XG5cblppcEZpbGUucHJvdG90eXBlLm9wZW5SZWFkU3RyZWFtID0gZnVuY3Rpb24gKGVudHJ5LCBvcHRpb25zLCBjYWxsYmFjaykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdC8vIHBhcmFtZXRlciB2YWxpZGF0aW9uXG5cdHZhciByZWxhdGl2ZVN0YXJ0ID0gMDtcblx0dmFyIHJlbGF0aXZlRW5kID0gZW50cnkuY29tcHJlc3NlZFNpemU7XG5cdGlmIChjYWxsYmFjayA9PSBudWxsKSB7XG5cdFx0Y2FsbGJhY2sgPSBvcHRpb25zO1xuXHRcdG9wdGlvbnMgPSB7fTtcblx0fSBlbHNlIHtcblx0XHQvLyB2YWxpZGF0ZSBvcHRpb25zIHRoYXQgdGhlIGNhbGxlciBoYXMgbm8gZXhjdXNlIHRvIGdldCB3cm9uZ1xuXHRcdGlmIChvcHRpb25zLmRlY3J5cHQgIT0gbnVsbCkge1xuXHRcdFx0aWYgKCFlbnRyeS5pc0VuY3J5cHRlZCgpKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuZGVjcnlwdCBjYW4gb25seSBiZSBzcGVjaWZpZWQgZm9yIGVuY3J5cHRlZCBlbnRyaWVzXCIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKG9wdGlvbnMuZGVjcnlwdCAhPT0gZmFsc2UpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgb3B0aW9ucy5kZWNyeXB0IHZhbHVlOiBcIiArIG9wdGlvbnMuZGVjcnlwdCk7XG5cdFx0XHRpZiAoZW50cnkuaXNDb21wcmVzc2VkKCkpIHtcblx0XHRcdFx0aWYgKG9wdGlvbnMuZGVjb21wcmVzcyAhPT0gZmFsc2UpIHRocm93IG5ldyBFcnJvcihcImVudHJ5IGlzIGVuY3J5cHRlZCBhbmQgY29tcHJlc3NlZCwgYW5kIG9wdGlvbnMuZGVjb21wcmVzcyAhPT0gZmFsc2VcIik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChvcHRpb25zLmRlY29tcHJlc3MgIT0gbnVsbCkge1xuXHRcdFx0aWYgKCFlbnRyeS5pc0NvbXByZXNzZWQoKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLmRlY29tcHJlc3MgY2FuIG9ubHkgYmUgc3BlY2lmaWVkIGZvciBjb21wcmVzc2VkIGVudHJpZXNcIik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIShvcHRpb25zLmRlY29tcHJlc3MgPT09IGZhbHNlIHx8IG9wdGlvbnMuZGVjb21wcmVzcyA9PT0gdHJ1ZSkpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBvcHRpb25zLmRlY29tcHJlc3MgdmFsdWU6IFwiICsgb3B0aW9ucy5kZWNvbXByZXNzKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMuc3RhcnQgIT0gbnVsbCB8fCBvcHRpb25zLmVuZCAhPSBudWxsKSB7XG5cdFx0XHRpZiAoZW50cnkuaXNDb21wcmVzc2VkKCkgJiYgb3B0aW9ucy5kZWNvbXByZXNzICE9PSBmYWxzZSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJzdGFydC9lbmQgcmFuZ2Ugbm90IGFsbG93ZWQgZm9yIGNvbXByZXNzZWQgZW50cnkgd2l0aG91dCBvcHRpb25zLmRlY29tcHJlc3MgPT09IGZhbHNlXCIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGVudHJ5LmlzRW5jcnlwdGVkKCkgJiYgb3B0aW9ucy5kZWNyeXB0ICE9PSBmYWxzZSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJzdGFydC9lbmQgcmFuZ2Ugbm90IGFsbG93ZWQgZm9yIGVuY3J5cHRlZCBlbnRyeSB3aXRob3V0IG9wdGlvbnMuZGVjcnlwdCA9PT0gZmFsc2VcIik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChvcHRpb25zLnN0YXJ0ICE9IG51bGwpIHtcblx0XHRcdHJlbGF0aXZlU3RhcnQgPSBvcHRpb25zLnN0YXJ0O1xuXHRcdFx0aWYgKHJlbGF0aXZlU3RhcnQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLnN0YXJ0IDwgMFwiKTtcblx0XHRcdGlmIChyZWxhdGl2ZVN0YXJ0ID4gZW50cnkuY29tcHJlc3NlZFNpemUpIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuc3RhcnQgPiBlbnRyeS5jb21wcmVzc2VkU2l6ZVwiKTtcblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMuZW5kICE9IG51bGwpIHtcblx0XHRcdHJlbGF0aXZlRW5kID0gb3B0aW9ucy5lbmQ7XG5cdFx0XHRpZiAocmVsYXRpdmVFbmQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLmVuZCA8IDBcIik7XG5cdFx0XHRpZiAocmVsYXRpdmVFbmQgPiBlbnRyeS5jb21wcmVzc2VkU2l6ZSkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5lbmQgPiBlbnRyeS5jb21wcmVzc2VkU2l6ZVwiKTtcblx0XHRcdGlmIChyZWxhdGl2ZUVuZCA8IHJlbGF0aXZlU3RhcnQpIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuZW5kIDwgb3B0aW9ucy5zdGFydFwiKTtcblx0XHR9XG5cdH1cblx0Ly8gYW55IGZ1cnRoZXIgZXJyb3JzIGNhbiBlaXRoZXIgYmUgY2F1c2VkIGJ5IHRoZSB6aXBmaWxlLFxuXHQvLyBvciB3ZXJlIGludHJvZHVjZWQgaW4gYSBtaW5vciB2ZXJzaW9uIG9mIHlhdXpsLFxuXHQvLyBzbyBzaG91bGQgYmUgcGFzc2VkIHRvIHRoZSBjbGllbnQgcmF0aGVyIHRoYW4gdGhyb3duLlxuXHRpZiAoIXNlbGYuaXNPcGVuKSByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiY2xvc2VkXCIpKTtcblx0aWYgKGVudHJ5LmlzRW5jcnlwdGVkKCkpIHtcblx0XHRpZiAob3B0aW9ucy5kZWNyeXB0ICE9PSBmYWxzZSkgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImVudHJ5IGlzIGVuY3J5cHRlZCwgYW5kIG9wdGlvbnMuZGVjcnlwdCAhPT0gZmFsc2VcIikpO1xuXHR9XG5cdC8vIG1ha2Ugc3VyZSB3ZSBkb24ndCBsb3NlIHRoZSBmZCBiZWZvcmUgd2Ugb3BlbiB0aGUgYWN0dWFsIHJlYWQgc3RyZWFtXG5cdHNlbGYucmVhZGVyLnJlZigpO1xuXHR2YXIgYnVmZmVyID0gbmV3QnVmZmVyKDMwKTtcblx0cmVhZEFuZEFzc2VydE5vRW9mKHNlbGYucmVhZGVyLCBidWZmZXIsIDAsIGJ1ZmZlci5sZW5ndGgsIGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciwgZnVuY3Rpb24gKGVycikge1xuXHRcdHRyeSB7XG5cdFx0XHRpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdC8vIDAgLSBMb2NhbCBmaWxlIGhlYWRlciBzaWduYXR1cmUgPSAweDA0MDM0YjUwXG5cdFx0XHR2YXIgc2lnbmF0dXJlID0gYnVmZmVyLnJlYWRVSW50MzJMRSgwKTtcblx0XHRcdGlmIChzaWduYXR1cmUgIT09IDB4MDQwMzRiNTApIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImludmFsaWQgbG9jYWwgZmlsZSBoZWFkZXIgc2lnbmF0dXJlOiAweFwiICsgc2lnbmF0dXJlLnRvU3RyaW5nKDE2KSkpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gYWxsIHRoaXMgc2hvdWxkIGJlIHJlZHVuZGFudFxuXHRcdFx0Ly8gNCAtIFZlcnNpb24gbmVlZGVkIHRvIGV4dHJhY3QgKG1pbmltdW0pXG5cdFx0XHQvLyA2IC0gR2VuZXJhbCBwdXJwb3NlIGJpdCBmbGFnXG5cdFx0XHQvLyA4IC0gQ29tcHJlc3Npb24gbWV0aG9kXG5cdFx0XHQvLyAxMCAtIEZpbGUgbGFzdCBtb2RpZmljYXRpb24gdGltZVxuXHRcdFx0Ly8gMTIgLSBGaWxlIGxhc3QgbW9kaWZpY2F0aW9uIGRhdGVcblx0XHRcdC8vIDE0IC0gQ1JDLTMyXG5cdFx0XHQvLyAxOCAtIENvbXByZXNzZWQgc2l6ZVxuXHRcdFx0Ly8gMjIgLSBVbmNvbXByZXNzZWQgc2l6ZVxuXHRcdFx0Ly8gMjYgLSBGaWxlIG5hbWUgbGVuZ3RoIChuKVxuXHRcdFx0dmFyIGZpbGVOYW1lTGVuZ3RoID0gYnVmZmVyLnJlYWRVSW50MTZMRSgyNik7XG5cdFx0XHQvLyAyOCAtIEV4dHJhIGZpZWxkIGxlbmd0aCAobSlcblx0XHRcdHZhciBleHRyYUZpZWxkTGVuZ3RoID0gYnVmZmVyLnJlYWRVSW50MTZMRSgyOCk7XG5cdFx0XHQvLyAzMCAtIEZpbGUgbmFtZVxuXHRcdFx0Ly8gMzArbiAtIEV4dHJhIGZpZWxkXG5cdFx0XHR2YXIgbG9jYWxGaWxlSGVhZGVyRW5kID0gZW50cnkucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyICsgYnVmZmVyLmxlbmd0aCArIGZpbGVOYW1lTGVuZ3RoICsgZXh0cmFGaWVsZExlbmd0aDtcblx0XHRcdHZhciBkZWNvbXByZXNzO1xuXHRcdFx0aWYgKGVudHJ5LmNvbXByZXNzaW9uTWV0aG9kID09PSAwKSB7XG5cdFx0XHRcdC8vIDAgLSBUaGUgZmlsZSBpcyBzdG9yZWQgKG5vIGNvbXByZXNzaW9uKVxuXHRcdFx0XHRkZWNvbXByZXNzID0gZmFsc2U7XG5cdFx0XHR9IGVsc2UgaWYgKGVudHJ5LmNvbXByZXNzaW9uTWV0aG9kID09PSA4KSB7XG5cdFx0XHRcdC8vIDggLSBUaGUgZmlsZSBpcyBEZWZsYXRlZFxuXHRcdFx0XHRkZWNvbXByZXNzID0gb3B0aW9ucy5kZWNvbXByZXNzICE9IG51bGwgPyBvcHRpb25zLmRlY29tcHJlc3MgOiB0cnVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcInVuc3VwcG9ydGVkIGNvbXByZXNzaW9uIG1ldGhvZDogXCIgKyBlbnRyeS5jb21wcmVzc2lvbk1ldGhvZCkpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGZpbGVEYXRhU3RhcnQgPSBsb2NhbEZpbGVIZWFkZXJFbmQ7XG5cdFx0XHR2YXIgZmlsZURhdGFFbmQgPSBmaWxlRGF0YVN0YXJ0ICsgZW50cnkuY29tcHJlc3NlZFNpemU7XG5cdFx0XHRpZiAoZW50cnkuY29tcHJlc3NlZFNpemUgIT09IDApIHtcblx0XHRcdFx0Ly8gYm91bmRzIGNoZWNrIG5vdywgYmVjYXVzZSB0aGUgcmVhZCBzdHJlYW1zIHdpbGwgcHJvYmFibHkgbm90IGNvbXBsYWluIGxvdWQgZW5vdWdoLlxuXHRcdFx0XHQvLyBzaW5jZSB3ZSdyZSBkZWFsaW5nIHdpdGggYW4gdW5zaWduZWQgb2Zmc2V0IHBsdXMgYW4gdW5zaWduZWQgc2l6ZSxcblx0XHRcdFx0Ly8gd2Ugb25seSBoYXZlIDEgdGhpbmcgdG8gY2hlY2sgZm9yLlxuXHRcdFx0XHRpZiAoZmlsZURhdGFFbmQgPiBzZWxmLmZpbGVTaXplKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImZpbGUgZGF0YSBvdmVyZmxvd3MgZmlsZSBib3VuZHM6IFwiICtcblx0XHRcdFx0XHRcdGZpbGVEYXRhU3RhcnQgKyBcIiArIFwiICsgZW50cnkuY29tcHJlc3NlZFNpemUgKyBcIiA+IFwiICsgc2VsZi5maWxlU2l6ZSkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHR2YXIgcmVhZFN0cmVhbSA9IHNlbGYucmVhZGVyLmNyZWF0ZVJlYWRTdHJlYW0oe1xuXHRcdFx0XHRzdGFydDogZmlsZURhdGFTdGFydCArIHJlbGF0aXZlU3RhcnQsXG5cdFx0XHRcdGVuZDogZmlsZURhdGFTdGFydCArIHJlbGF0aXZlRW5kLFxuXHRcdFx0fSk7XG5cdFx0XHR2YXIgZW5kcG9pbnRTdHJlYW0gPSByZWFkU3RyZWFtO1xuXHRcdFx0aWYgKGRlY29tcHJlc3MpIHtcblx0XHRcdFx0dmFyIGRlc3Ryb3llZCA9IGZhbHNlO1xuXHRcdFx0XHR2YXIgaW5mbGF0ZUZpbHRlciA9IHpsaWIuY3JlYXRlSW5mbGF0ZVJhdygpO1xuXHRcdFx0XHRyZWFkU3RyZWFtLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0XHRcdC8vIHNldEltbWVkaWF0ZSBoZXJlIGJlY2F1c2UgZXJyb3JzIGNhbiBiZSBlbWl0dGVkIGR1cmluZyB0aGUgZmlyc3QgY2FsbCB0byBwaXBlKClcblx0XHRcdFx0XHRzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKCFkZXN0cm95ZWQpIGluZmxhdGVGaWx0ZXIuZW1pdChcImVycm9yXCIsIGVycik7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZWFkU3RyZWFtLnBpcGUoaW5mbGF0ZUZpbHRlcik7XG5cblx0XHRcdFx0aWYgKHNlbGYudmFsaWRhdGVFbnRyeVNpemVzKSB7XG5cdFx0XHRcdFx0ZW5kcG9pbnRTdHJlYW0gPSBuZXcgQXNzZXJ0Qnl0ZUNvdW50U3RyZWFtKGVudHJ5LnVuY29tcHJlc3NlZFNpemUpO1xuXHRcdFx0XHRcdGluZmxhdGVGaWx0ZXIub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRcdFx0XHQvLyBmb3J3YXJkIHpsaWIgZXJyb3JzIHRvIHRoZSBjbGllbnQtdmlzaWJsZSBzdHJlYW1cblx0XHRcdFx0XHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdGlmICghZGVzdHJveWVkKSBlbmRwb2ludFN0cmVhbS5lbWl0KFwiZXJyb3JcIiwgZXJyKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGluZmxhdGVGaWx0ZXIucGlwZShlbmRwb2ludFN0cmVhbSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gdGhlIHpsaWIgZmlsdGVyIGlzIHRoZSBjbGllbnQtdmlzaWJsZSBzdHJlYW1cblx0XHRcdFx0XHRlbmRwb2ludFN0cmVhbSA9IGluZmxhdGVGaWx0ZXI7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gdGhpcyBpcyBwYXJ0IG9mIHlhdXpsJ3MgQVBJLCBzbyBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBvbiB0aGUgY2xpZW50LXZpc2libGUgc3RyZWFtXG5cdFx0XHRcdGVuZHBvaW50U3RyZWFtLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0ZGVzdHJveWVkID0gdHJ1ZTtcblx0XHRcdFx0XHRpZiAoaW5mbGF0ZUZpbHRlciAhPT0gZW5kcG9pbnRTdHJlYW0pIGluZmxhdGVGaWx0ZXIudW5waXBlKGVuZHBvaW50U3RyZWFtKTtcblx0XHRcdFx0XHRyZWFkU3RyZWFtLnVucGlwZShpbmZsYXRlRmlsdGVyKTtcblx0XHRcdFx0XHQvLyBUT0RPOiB0aGUgaW5mbGF0ZUZpbHRlciBtYXkgY2F1c2UgYSBtZW1vcnkgbGVhay4gc2VlIElzc3VlICMyNy5cblx0XHRcdFx0XHRyZWFkU3RyZWFtLmRlc3Ryb3koKTtcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHRcdGNhbGxiYWNrKG51bGwsIGVuZHBvaW50U3RyZWFtKTtcblx0XHR9IGZpbmFsbHkge1xuXHRcdFx0c2VsZi5yZWFkZXIudW5yZWYoKTtcblx0XHR9XG5cdH0pO1xufTtcblxuZnVuY3Rpb24gRW50cnkoKSB7XG59XG5cbkVudHJ5LnByb3RvdHlwZS5nZXRMYXN0TW9kRGF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIGRvc0RhdGVUaW1lVG9EYXRlKHRoaXMubGFzdE1vZEZpbGVEYXRlLCB0aGlzLmxhc3RNb2RGaWxlVGltZSk7XG59O1xuRW50cnkucHJvdG90eXBlLmlzRW5jcnlwdGVkID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gKHRoaXMuZ2VuZXJhbFB1cnBvc2VCaXRGbGFnICYgMHgxKSAhPT0gMDtcbn07XG5FbnRyeS5wcm90b3R5cGUuaXNDb21wcmVzc2VkID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy5jb21wcmVzc2lvbk1ldGhvZCA9PT0gODtcbn07XG5cbmZ1bmN0aW9uIGRvc0RhdGVUaW1lVG9EYXRlKGRhdGUsIHRpbWUpIHtcblx0dmFyIGRheSA9IGRhdGUgJiAweDFmOyAvLyAxLTMxXG5cdHZhciBtb250aCA9IChkYXRlID4+IDUgJiAweGYpIC0gMTsgLy8gMS0xMiwgMC0xMVxuXHR2YXIgeWVhciA9IChkYXRlID4+IDkgJiAweDdmKSArIDE5ODA7IC8vIDAtMTI4LCAxOTgwLTIxMDhcblxuXHR2YXIgbWlsbGlzZWNvbmQgPSAwO1xuXHR2YXIgc2Vjb25kID0gKHRpbWUgJiAweDFmKSAqIDI7IC8vIDAtMjksIDAtNTggKGV2ZW4gbnVtYmVycylcblx0dmFyIG1pbnV0ZSA9IHRpbWUgPj4gNSAmIDB4M2Y7IC8vIDAtNTlcblx0dmFyIGhvdXIgPSB0aW1lID4+IDExICYgMHgxZjsgLy8gMC0yM1xuXG5cdHJldHVybiBuZXcgRGF0ZSh5ZWFyLCBtb250aCwgZGF5LCBob3VyLCBtaW51dGUsIHNlY29uZCwgbWlsbGlzZWNvbmQpO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUZpbGVOYW1lKGZpbGVOYW1lKSB7XG5cdGlmIChmaWxlTmFtZS5pbmRleE9mKFwiXFxcXFwiKSAhPT0gLTEpIHtcblx0XHRyZXR1cm4gXCJpbnZhbGlkIGNoYXJhY3RlcnMgaW4gZmlsZU5hbWU6IFwiICsgZmlsZU5hbWU7XG5cdH1cblx0aWYgKC9eW2EtekEtWl06Ly50ZXN0KGZpbGVOYW1lKSB8fCAvXlxcLy8udGVzdChmaWxlTmFtZSkpIHtcblx0XHRyZXR1cm4gXCJhYnNvbHV0ZSBwYXRoOiBcIiArIGZpbGVOYW1lO1xuXHR9XG5cdGlmIChmaWxlTmFtZS5zcGxpdChcIi9cIikuaW5kZXhPZihcIi4uXCIpICE9PSAtMSkge1xuXHRcdHJldHVybiBcImludmFsaWQgcmVsYXRpdmUgcGF0aDogXCIgKyBmaWxlTmFtZTtcblx0fVxuXHQvLyBhbGwgZ29vZFxuXHRyZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gcmVhZEFuZEFzc2VydE5vRW9mKHJlYWRlciwgYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrKSB7XG5cdGlmIChsZW5ndGggPT09IDApIHtcblx0XHQvLyBmcy5yZWFkIHdpbGwgdGhyb3cgYW4gb3V0LW9mLWJvdW5kcyBlcnJvciBpZiB5b3UgdHJ5IHRvIHJlYWQgMCBieXRlcyBmcm9tIGEgMCBieXRlIGZpbGVcblx0XHRyZXR1cm4gc2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdGNhbGxiYWNrKG51bGwsIG5ld0J1ZmZlcigwKSk7XG5cdFx0fSk7XG5cdH1cblx0cmVhZGVyLnJlYWQoYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGZ1bmN0aW9uIChlcnIsIGJ5dGVzUmVhZCkge1xuXHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdGlmIChieXRlc1JlYWQgPCBsZW5ndGgpIHtcblx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJ1bmV4cGVjdGVkIEVPRlwiKSk7XG5cdFx0fVxuXHRcdGNhbGxiYWNrKCk7XG5cdH0pO1xufVxuXG51dGlsLmluaGVyaXRzKEFzc2VydEJ5dGVDb3VudFN0cmVhbSwgVHJhbnNmb3JtKTtcblxuZnVuY3Rpb24gQXNzZXJ0Qnl0ZUNvdW50U3RyZWFtKGJ5dGVDb3VudCkge1xuXHRUcmFuc2Zvcm0uY2FsbCh0aGlzKTtcblx0dGhpcy5hY3R1YWxCeXRlQ291bnQgPSAwO1xuXHR0aGlzLmV4cGVjdGVkQnl0ZUNvdW50ID0gYnl0ZUNvdW50O1xufVxuXG5Bc3NlcnRCeXRlQ291bnRTdHJlYW0ucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2h1bmssIGVuY29kaW5nLCBjYikge1xuXHR0aGlzLmFjdHVhbEJ5dGVDb3VudCArPSBjaHVuay5sZW5ndGg7XG5cdGlmICh0aGlzLmFjdHVhbEJ5dGVDb3VudCA+IHRoaXMuZXhwZWN0ZWRCeXRlQ291bnQpIHtcblx0XHR2YXIgbXNnID0gXCJ0b28gbWFueSBieXRlcyBpbiB0aGUgc3RyZWFtLiBleHBlY3RlZCBcIiArIHRoaXMuZXhwZWN0ZWRCeXRlQ291bnQgKyBcIi4gZ290IGF0IGxlYXN0IFwiICsgdGhpcy5hY3R1YWxCeXRlQ291bnQ7XG5cdFx0cmV0dXJuIGNiKG5ldyBFcnJvcihtc2cpKTtcblx0fVxuXHRjYihudWxsLCBjaHVuayk7XG59O1xuQXNzZXJ0Qnl0ZUNvdW50U3RyZWFtLnByb3RvdHlwZS5fZmx1c2ggPSBmdW5jdGlvbiAoY2IpIHtcblx0aWYgKHRoaXMuYWN0dWFsQnl0ZUNvdW50IDwgdGhpcy5leHBlY3RlZEJ5dGVDb3VudCkge1xuXHRcdHZhciBtc2cgPSBcIm5vdCBlbm91Z2ggYnl0ZXMgaW4gdGhlIHN0cmVhbS4gZXhwZWN0ZWQgXCIgKyB0aGlzLmV4cGVjdGVkQnl0ZUNvdW50ICsgXCIuIGdvdCBvbmx5IFwiICsgdGhpcy5hY3R1YWxCeXRlQ291bnQ7XG5cdFx0cmV0dXJuIGNiKG5ldyBFcnJvcihtc2cpKTtcblx0fVxuXHRjYigpO1xufTtcblxudXRpbC5pbmhlcml0cyhSYW5kb21BY2Nlc3NSZWFkZXIsIEV2ZW50RW1pdHRlcik7XG5cbmZ1bmN0aW9uIFJhbmRvbUFjY2Vzc1JlYWRlcigpIHtcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cdHRoaXMucmVmQ291bnQgPSAwO1xufVxuXG5SYW5kb21BY2Nlc3NSZWFkZXIucHJvdG90eXBlLnJlZiA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5yZWZDb3VudCArPSAxO1xufTtcblJhbmRvbUFjY2Vzc1JlYWRlci5wcm90b3R5cGUudW5yZWYgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0c2VsZi5yZWZDb3VudCAtPSAxO1xuXG5cdGlmIChzZWxmLnJlZkNvdW50ID4gMCkgcmV0dXJuO1xuXHRpZiAoc2VsZi5yZWZDb3VudCA8IDApIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgdW5yZWZcIik7XG5cblx0c2VsZi5jbG9zZShvbkNsb3NlRG9uZSk7XG5cblx0ZnVuY3Rpb24gb25DbG9zZURvbmUoZXJyKSB7XG5cdFx0aWYgKGVycikgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuXHRcdHNlbGYuZW1pdCgnY2xvc2UnKTtcblx0fVxufTtcblJhbmRvbUFjY2Vzc1JlYWRlci5wcm90b3R5cGUuY3JlYXRlUmVhZFN0cmVhbSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cdHZhciBzdGFydCA9IG9wdGlvbnMuc3RhcnQ7XG5cdHZhciBlbmQgPSBvcHRpb25zLmVuZDtcblx0aWYgKHN0YXJ0ID09PSBlbmQpIHtcblx0XHR2YXIgZW1wdHlTdHJlYW0gPSBuZXcgUGFzc1Rocm91Z2goKTtcblx0XHRzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0ZW1wdHlTdHJlYW0uZW5kKCk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGVtcHR5U3RyZWFtO1xuXHR9XG5cdHZhciBzdHJlYW0gPSB0aGlzLl9yZWFkU3RyZWFtRm9yUmFuZ2Uoc3RhcnQsIGVuZCk7XG5cblx0dmFyIGRlc3Ryb3llZCA9IGZhbHNlO1xuXHR2YXIgcmVmVW5yZWZGaWx0ZXIgPSBuZXcgUmVmVW5yZWZGaWx0ZXIodGhpcyk7XG5cdHN0cmVhbS5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCFkZXN0cm95ZWQpIHJlZlVucmVmRmlsdGVyLmVtaXQoXCJlcnJvclwiLCBlcnIpO1xuXHRcdH0pO1xuXHR9KTtcblx0cmVmVW5yZWZGaWx0ZXIuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcblx0XHRzdHJlYW0udW5waXBlKHJlZlVucmVmRmlsdGVyKTtcblx0XHRyZWZVbnJlZkZpbHRlci51bnJlZigpO1xuXHRcdHN0cmVhbS5kZXN0cm95KCk7XG5cdH07XG5cblx0dmFyIGJ5dGVDb3VudGVyID0gbmV3IEFzc2VydEJ5dGVDb3VudFN0cmVhbShlbmQgLSBzdGFydCk7XG5cdHJlZlVucmVmRmlsdGVyLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycikge1xuXHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoIWRlc3Ryb3llZCkgYnl0ZUNvdW50ZXIuZW1pdChcImVycm9yXCIsIGVycik7XG5cdFx0fSk7XG5cdH0pO1xuXHRieXRlQ291bnRlci5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuXHRcdGRlc3Ryb3llZCA9IHRydWU7XG5cdFx0cmVmVW5yZWZGaWx0ZXIudW5waXBlKGJ5dGVDb3VudGVyKTtcblx0XHRyZWZVbnJlZkZpbHRlci5kZXN0cm95KCk7XG5cdH07XG5cblx0cmV0dXJuIHN0cmVhbS5waXBlKHJlZlVucmVmRmlsdGVyKS5waXBlKGJ5dGVDb3VudGVyKTtcbn07XG5SYW5kb21BY2Nlc3NSZWFkZXIucHJvdG90eXBlLl9yZWFkU3RyZWFtRm9yUmFuZ2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuXHR0aHJvdyBuZXcgRXJyb3IoXCJub3QgaW1wbGVtZW50ZWRcIik7XG59O1xuUmFuZG9tQWNjZXNzUmVhZGVyLnByb3RvdHlwZS5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaykge1xuXHR2YXIgcmVhZFN0cmVhbSA9IHRoaXMuY3JlYXRlUmVhZFN0cmVhbSh7c3RhcnQ6IHBvc2l0aW9uLCBlbmQ6IHBvc2l0aW9uICsgbGVuZ3RofSk7XG5cdHZhciB3cml0ZVN0cmVhbSA9IG5ldyBXcml0YWJsZSgpO1xuXHR2YXIgd3JpdHRlbiA9IDA7XG5cdHdyaXRlU3RyZWFtLl93cml0ZSA9IGZ1bmN0aW9uIChjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG5cdFx0Y2h1bmsuY29weShidWZmZXIsIG9mZnNldCArIHdyaXR0ZW4sIDAsIGNodW5rLmxlbmd0aCk7XG5cdFx0d3JpdHRlbiArPSBjaHVuay5sZW5ndGg7XG5cdFx0Y2IoKTtcblx0fTtcblx0d3JpdGVTdHJlYW0ub24oXCJmaW5pc2hcIiwgY2FsbGJhY2spO1xuXHRyZWFkU3RyZWFtLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycm9yKSB7XG5cdFx0Y2FsbGJhY2soZXJyb3IpO1xuXHR9KTtcblx0cmVhZFN0cmVhbS5waXBlKHdyaXRlU3RyZWFtKTtcbn07XG5SYW5kb21BY2Nlc3NSZWFkZXIucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cdHNldEltbWVkaWF0ZShjYWxsYmFjayk7XG59O1xuXG51dGlsLmluaGVyaXRzKFJlZlVucmVmRmlsdGVyLCBQYXNzVGhyb3VnaCk7XG5cbmZ1bmN0aW9uIFJlZlVucmVmRmlsdGVyKGNvbnRleHQpIHtcblx0UGFzc1Rocm91Z2guY2FsbCh0aGlzKTtcblx0dGhpcy5jb250ZXh0ID0gY29udGV4dDtcblx0dGhpcy5jb250ZXh0LnJlZigpO1xuXHR0aGlzLnVucmVmZmVkWWV0ID0gZmFsc2U7XG59XG5cblJlZlVucmVmRmlsdGVyLnByb3RvdHlwZS5fZmx1c2ggPSBmdW5jdGlvbiAoY2IpIHtcblx0dGhpcy51bnJlZigpO1xuXHRjYigpO1xufTtcblJlZlVucmVmRmlsdGVyLnByb3RvdHlwZS51bnJlZiA9IGZ1bmN0aW9uIChjYikge1xuXHRpZiAodGhpcy51bnJlZmZlZFlldCkgcmV0dXJuO1xuXHR0aGlzLnVucmVmZmVkWWV0ID0gdHJ1ZTtcblx0dGhpcy5jb250ZXh0LnVucmVmKCk7XG59O1xuXG52YXIgY3A0MzcgPSAnXFx1MDAwMOKYuuKYu+KZpeKZpuKZo+KZoOKAouKXmOKXi+KXmeKZguKZgOKZquKZq+KYvOKWuuKXhOKGleKAvMK2wqfilqzihqjihpHihpPihpLihpDiiJ/ihpTilrLilrwgIVwiIyQlJlxcJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXFxcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fuKMgsOHw7zDqcOiw6TDoMOlw6fDqsOrw6jDr8Ouw6zDhMOFw4nDpsOGw7TDtsOyw7vDucO/w5bDnMKiwqPCpeKCp8aSw6HDrcOzw7rDscORwqrCusK/4oyQwqzCvcK8wqHCq8K74paR4paS4paT4pSC4pSk4pWh4pWi4pWW4pWV4pWj4pWR4pWX4pWd4pWc4pWb4pSQ4pSU4pS04pSs4pSc4pSA4pS84pWe4pWf4pWa4pWU4pWp4pWm4pWg4pWQ4pWs4pWn4pWo4pWk4pWl4pWZ4pWY4pWS4pWT4pWr4pWq4pSY4pSM4paI4paE4paM4paQ4paAzrHDn86Tz4DOo8+DwrXPhM6mzpjOqc604oiez4bOteKIqeKJocKx4oml4omk4oyg4oyhw7fiiYjCsOKImcK34oia4oG/wrLilqDCoCc7XG5cbmZ1bmN0aW9uIGRlY29kZUJ1ZmZlcihidWZmZXIsIHN0YXJ0LCBlbmQsIGlzVXRmOCkge1xuXHRpZiAoaXNVdGY4KSB7XG5cdFx0cmV0dXJuIGJ1ZmZlci50b1N0cmluZyhcInV0ZjhcIiwgc3RhcnQsIGVuZCk7XG5cdH0gZWxzZSB7XG5cdFx0dmFyIHJlc3VsdCA9IFwiXCI7XG5cdFx0Zm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcblx0XHRcdHJlc3VsdCArPSBjcDQzN1tidWZmZXJbaV1dO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJlYWRVSW50NjRMRShidWZmZXIsIG9mZnNldCkge1xuXHQvLyB0aGVyZSBpcyBubyBuYXRpdmUgZnVuY3Rpb24gZm9yIHRoaXMsIGJlY2F1c2Ugd2UgY2FuJ3QgYWN0dWFsbHkgc3RvcmUgNjQtYml0IGludGVnZXJzIHByZWNpc2VseS5cblx0Ly8gYWZ0ZXIgNTMgYml0cywgSmF2YVNjcmlwdCdzIE51bWJlciB0eXBlIChJRUVFIDc1NCBkb3VibGUpIGNhbid0IHN0b3JlIGluZGl2aWR1YWwgaW50ZWdlcnMgYW55bW9yZS5cblx0Ly8gYnV0IHNpbmNlIDUzIGJpdHMgaXMgYSB3aG9sZSBsb3QgbW9yZSB0aGFuIDMyIGJpdHMsIHdlIGRvIG91ciBiZXN0IGFueXdheS5cblx0dmFyIGxvd2VyMzIgPSBidWZmZXIucmVhZFVJbnQzMkxFKG9mZnNldCk7XG5cdHZhciB1cHBlcjMyID0gYnVmZmVyLnJlYWRVSW50MzJMRShvZmZzZXQgKyA0KTtcblx0Ly8gd2UgY2FuJ3QgdXNlIGJpdHNoaWZ0aW5nIGhlcmUsIGJlY2F1c2UgSmF2YVNjcmlwdCBiaXRzaGlmdGluZyBvbmx5IHdvcmtzIG9uIDMyLWJpdCBpbnRlZ2Vycy5cblx0cmV0dXJuIHVwcGVyMzIgKiAweDEwMDAwMDAwMCArIGxvd2VyMzI7XG5cdC8vIGFzIGxvbmcgYXMgd2UncmUgYm91bmRzIGNoZWNraW5nIHRoZSByZXN1bHQgb2YgdGhpcyBmdW5jdGlvbiBhZ2FpbnN0IHRoZSB0b3RhbCBmaWxlIHNpemUsXG5cdC8vIHdlJ2xsIGNhdGNoIGFueSBvdmVyZmxvdyBlcnJvcnMsIGJlY2F1c2Ugd2UgYWxyZWFkeSBtYWRlIHN1cmUgdGhlIHRvdGFsIGZpbGUgc2l6ZSB3YXMgd2l0aGluIHJlYXNvbi5cbn1cblxuLy8gTm9kZSAxMCBkZXByZWNhdGVkIG5ldyBCdWZmZXIoKS5cbnZhciBuZXdCdWZmZXI7XG5pZiAodHlwZW9mIEJ1ZmZlci5hbGxvY1Vuc2FmZSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdG5ld0J1ZmZlciA9IGZ1bmN0aW9uIChsZW4pIHtcblx0XHRyZXR1cm4gQnVmZmVyLmFsbG9jVW5zYWZlKGxlbik7XG5cdH07XG59IGVsc2Uge1xuXHRuZXdCdWZmZXIgPSBmdW5jdGlvbiAobGVuKSB7XG5cdFx0cmV0dXJuIG5ldyBCdWZmZXIobGVuKTtcblx0fTtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdENhbGxiYWNrKGVycikge1xuXHRpZiAoZXJyKSB0aHJvdyBlcnI7XG59XG4iLCJ2YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZShcInN0cmVhbVwiKS5UcmFuc2Zvcm07XG52YXIgUGFzc1Rocm91Z2ggPSByZXF1aXJlKFwic3RyZWFtXCIpLlBhc3NUaHJvdWdoO1xudmFyIHpsaWIgPSByZXF1aXJlKFwiemxpYlwiKTtcbnZhciB1dGlsID0gcmVxdWlyZShcInV0aWxcIik7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XG52YXIgY3JjMzIgPSByZXF1aXJlKFwiYnVmZmVyLWNyYzMyXCIpO1xuXG5leHBvcnRzLlppcEZpbGUgPSBaaXBGaWxlO1xuZXhwb3J0cy5kYXRlVG9Eb3NEYXRlVGltZSA9IGRhdGVUb0Rvc0RhdGVUaW1lO1xuXG51dGlsLmluaGVyaXRzKFppcEZpbGUsIEV2ZW50RW1pdHRlcik7XG5cbmZ1bmN0aW9uIFppcEZpbGUoKSB7XG5cdHRoaXMub3V0cHV0U3RyZWFtID0gbmV3IFBhc3NUaHJvdWdoKCk7XG5cdHRoaXMuZW50cmllcyA9IFtdO1xuXHR0aGlzLm91dHB1dFN0cmVhbUN1cnNvciA9IDA7XG5cdHRoaXMuZW5kZWQgPSBmYWxzZTsgLy8gLmVuZCgpIHNldHMgdGhpc1xuXHR0aGlzLmFsbERvbmUgPSBmYWxzZTsgLy8gc2V0IHdoZW4gd2UndmUgd3JpdHRlbiB0aGUgbGFzdCBieXRlc1xuXHR0aGlzLmZvcmNlWmlwNjRFb2NkID0gZmFsc2U7IC8vIGNvbmZpZ3VyYWJsZSBpbiAuZW5kKClcbn1cblxuWmlwRmlsZS5wcm90b3R5cGUuYWRkRmlsZSA9IGZ1bmN0aW9uIChyZWFsUGF0aCwgbWV0YWRhdGFQYXRoLCBvcHRpb25zKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0bWV0YWRhdGFQYXRoID0gdmFsaWRhdGVNZXRhZGF0YVBhdGgobWV0YWRhdGFQYXRoLCBmYWxzZSk7XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblxuXHR2YXIgZW50cnkgPSBuZXcgRW50cnkobWV0YWRhdGFQYXRoLCBmYWxzZSwgb3B0aW9ucyk7XG5cdHNlbGYuZW50cmllcy5wdXNoKGVudHJ5KTtcblx0ZnMuc3RhdChyZWFsUGF0aCwgZnVuY3Rpb24gKGVyciwgc3RhdHMpIHtcblx0XHRpZiAoZXJyKSByZXR1cm4gc2VsZi5lbWl0KFwiZXJyb3JcIiwgZXJyKTtcblx0XHRpZiAoIXN0YXRzLmlzRmlsZSgpKSByZXR1cm4gc2VsZi5lbWl0KFwiZXJyb3JcIiwgbmV3IEVycm9yKFwibm90IGEgZmlsZTogXCIgKyByZWFsUGF0aCkpO1xuXHRcdGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPSBzdGF0cy5zaXplO1xuXHRcdGlmIChvcHRpb25zLm10aW1lID09IG51bGwpIGVudHJ5LnNldExhc3RNb2REYXRlKHN0YXRzLm10aW1lKTtcblx0XHRpZiAob3B0aW9ucy5tb2RlID09IG51bGwpIGVudHJ5LnNldEZpbGVBdHRyaWJ1dGVzTW9kZShzdGF0cy5tb2RlKTtcblx0XHRlbnRyeS5zZXRGaWxlRGF0YVB1bXBGdW5jdGlvbihmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgcmVhZFN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0ocmVhbFBhdGgpO1xuXHRcdFx0ZW50cnkuc3RhdGUgPSBFbnRyeS5GSUxFX0RBVEFfSU5fUFJPR1JFU1M7XG5cdFx0XHRyZWFkU3RyZWFtLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0XHRzZWxmLmVtaXQoXCJlcnJvclwiLCBlcnIpO1xuXHRcdFx0fSk7XG5cdFx0XHRwdW1wRmlsZURhdGFSZWFkU3RyZWFtKHNlbGYsIGVudHJ5LCByZWFkU3RyZWFtKTtcblx0XHR9KTtcblx0XHRwdW1wRW50cmllcyhzZWxmKTtcblx0fSk7XG59O1xuXG5aaXBGaWxlLnByb3RvdHlwZS5hZGRSZWFkU3RyZWFtID0gZnVuY3Rpb24gKHJlYWRTdHJlYW0sIG1ldGFkYXRhUGF0aCwgb3B0aW9ucykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdG1ldGFkYXRhUGF0aCA9IHZhbGlkYXRlTWV0YWRhdGFQYXRoKG1ldGFkYXRhUGF0aCwgZmFsc2UpO1xuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdHZhciBlbnRyeSA9IG5ldyBFbnRyeShtZXRhZGF0YVBhdGgsIGZhbHNlLCBvcHRpb25zKTtcblx0c2VsZi5lbnRyaWVzLnB1c2goZW50cnkpO1xuXHRlbnRyeS5zZXRGaWxlRGF0YVB1bXBGdW5jdGlvbihmdW5jdGlvbiAoKSB7XG5cdFx0ZW50cnkuc3RhdGUgPSBFbnRyeS5GSUxFX0RBVEFfSU5fUFJPR1JFU1M7XG5cdFx0cHVtcEZpbGVEYXRhUmVhZFN0cmVhbShzZWxmLCBlbnRyeSwgcmVhZFN0cmVhbSk7XG5cdH0pO1xuXHRwdW1wRW50cmllcyhzZWxmKTtcbn07XG5cblppcEZpbGUucHJvdG90eXBlLmFkZEJ1ZmZlciA9IGZ1bmN0aW9uIChidWZmZXIsIG1ldGFkYXRhUGF0aCwgb3B0aW9ucykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdG1ldGFkYXRhUGF0aCA9IHZhbGlkYXRlTWV0YWRhdGFQYXRoKG1ldGFkYXRhUGF0aCwgZmFsc2UpO1xuXHRpZiAoYnVmZmVyLmxlbmd0aCA+IDB4M2ZmZmZmZmYpIHRocm93IG5ldyBFcnJvcihcImJ1ZmZlciB0b28gbGFyZ2U6IFwiICsgYnVmZmVyLmxlbmd0aCArIFwiID4gXCIgKyAweDNmZmZmZmZmKTtcblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXHRpZiAob3B0aW9ucy5zaXplICE9IG51bGwpIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuc2l6ZSBub3QgYWxsb3dlZFwiKTtcblx0dmFyIGVudHJ5ID0gbmV3IEVudHJ5KG1ldGFkYXRhUGF0aCwgZmFsc2UsIG9wdGlvbnMpO1xuXHRlbnRyeS51bmNvbXByZXNzZWRTaXplID0gYnVmZmVyLmxlbmd0aDtcblx0ZW50cnkuY3JjMzIgPSBjcmMzMi51bnNpZ25lZChidWZmZXIpO1xuXHRlbnRyeS5jcmNBbmRGaWxlU2l6ZUtub3duID0gdHJ1ZTtcblx0c2VsZi5lbnRyaWVzLnB1c2goZW50cnkpO1xuXHRpZiAoIWVudHJ5LmNvbXByZXNzKSB7XG5cdFx0c2V0Q29tcHJlc3NlZEJ1ZmZlcihidWZmZXIpO1xuXHR9IGVsc2Uge1xuXHRcdHpsaWIuZGVmbGF0ZVJhdyhidWZmZXIsIGZ1bmN0aW9uIChlcnIsIGNvbXByZXNzZWRCdWZmZXIpIHtcblx0XHRcdHNldENvbXByZXNzZWRCdWZmZXIoY29tcHJlc3NlZEJ1ZmZlcik7XG5cdFx0XHRcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNldENvbXByZXNzZWRCdWZmZXIoY29tcHJlc3NlZEJ1ZmZlcikge1xuXHRcdGVudHJ5LmNvbXByZXNzZWRTaXplID0gY29tcHJlc3NlZEJ1ZmZlci5sZW5ndGg7XG5cdFx0ZW50cnkuc2V0RmlsZURhdGFQdW1wRnVuY3Rpb24oZnVuY3Rpb24gKCkge1xuXHRcdFx0d3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBjb21wcmVzc2VkQnVmZmVyKTtcblx0XHRcdHdyaXRlVG9PdXRwdXRTdHJlYW0oc2VsZiwgZW50cnkuZ2V0RGF0YURlc2NyaXB0b3IoKSk7XG5cdFx0XHRlbnRyeS5zdGF0ZSA9IEVudHJ5LkZJTEVfREFUQV9ET05FO1xuXG5cdFx0XHQvLyBkb24ndCBjYWxsIHB1bXBFbnRyaWVzKCkgcmVjdXJzaXZlbHkuXG5cdFx0XHQvLyAoYWxzbywgZG9uJ3QgY2FsbCBwcm9jZXNzLm5leHRUaWNrIHJlY3Vyc2l2ZWx5Lilcblx0XHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHB1bXBFbnRyaWVzKHNlbGYpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0cHVtcEVudHJpZXMoc2VsZik7XG5cdH1cbn07XG5cblxuWmlwRmlsZS5wcm90b3R5cGUuYWRkRW1wdHlEaXJlY3RvcnkgPSBmdW5jdGlvbiAobWV0YWRhdGFQYXRoLCBvcHRpb25zKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0bWV0YWRhdGFQYXRoID0gdmFsaWRhdGVNZXRhZGF0YVBhdGgobWV0YWRhdGFQYXRoLCB0cnVlKTtcblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXHRpZiAob3B0aW9ucy5zaXplICE9IG51bGwpIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuc2l6ZSBub3QgYWxsb3dlZFwiKTtcblx0aWYgKG9wdGlvbnMuY29tcHJlc3MgIT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5jb21wcmVzcyBub3QgYWxsb3dlZFwiKTtcblx0dmFyIGVudHJ5ID0gbmV3IEVudHJ5KG1ldGFkYXRhUGF0aCwgdHJ1ZSwgb3B0aW9ucyk7XG5cdHNlbGYuZW50cmllcy5wdXNoKGVudHJ5KTtcblx0ZW50cnkuc2V0RmlsZURhdGFQdW1wRnVuY3Rpb24oZnVuY3Rpb24gKCkge1xuXHRcdHdyaXRlVG9PdXRwdXRTdHJlYW0oc2VsZiwgZW50cnkuZ2V0RGF0YURlc2NyaXB0b3IoKSk7XG5cdFx0ZW50cnkuc3RhdGUgPSBFbnRyeS5GSUxFX0RBVEFfRE9ORTtcblx0XHRwdW1wRW50cmllcyhzZWxmKTtcblx0fSk7XG5cdHB1bXBFbnRyaWVzKHNlbGYpO1xufTtcblxuWmlwRmlsZS5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKG9wdGlvbnMsIGZpbmFsU2l6ZUNhbGxiYWNrKSB7XG5cdGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0ZmluYWxTaXplQ2FsbGJhY2sgPSBvcHRpb25zO1xuXHRcdG9wdGlvbnMgPSBudWxsO1xuXHR9XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblx0aWYgKHRoaXMuZW5kZWQpIHJldHVybjtcblx0dGhpcy5lbmRlZCA9IHRydWU7XG5cdHRoaXMuZmluYWxTaXplQ2FsbGJhY2sgPSBmaW5hbFNpemVDYWxsYmFjaztcblx0dGhpcy5mb3JjZVppcDY0RW9jZCA9ICEhb3B0aW9ucy5mb3JjZVppcDY0Rm9ybWF0O1xuXHRwdW1wRW50cmllcyh0aGlzKTtcbn07XG5cbmZ1bmN0aW9uIHdyaXRlVG9PdXRwdXRTdHJlYW0oc2VsZiwgYnVmZmVyKSB7XG5cdHNlbGYub3V0cHV0U3RyZWFtLndyaXRlKGJ1ZmZlcik7XG5cdHNlbGYub3V0cHV0U3RyZWFtQ3Vyc29yICs9IGJ1ZmZlci5sZW5ndGg7XG59XG5cbmZ1bmN0aW9uIHB1bXBGaWxlRGF0YVJlYWRTdHJlYW0oc2VsZiwgZW50cnksIHJlYWRTdHJlYW0pIHtcblx0dmFyIGNyYzMyV2F0Y2hlciA9IG5ldyBDcmMzMldhdGNoZXIoKTtcblx0dmFyIHVuY29tcHJlc3NlZFNpemVDb3VudGVyID0gbmV3IEJ5dGVDb3VudGVyKCk7XG5cdHZhciBjb21wcmVzc29yID0gZW50cnkuY29tcHJlc3MgPyBuZXcgemxpYi5EZWZsYXRlUmF3KCkgOiBuZXcgUGFzc1Rocm91Z2goKTtcblx0dmFyIGNvbXByZXNzZWRTaXplQ291bnRlciA9IG5ldyBCeXRlQ291bnRlcigpO1xuXHRyZWFkU3RyZWFtLnBpcGUoY3JjMzJXYXRjaGVyKVxuXHRcdC5waXBlKHVuY29tcHJlc3NlZFNpemVDb3VudGVyKVxuXHRcdC5waXBlKGNvbXByZXNzb3IpXG5cdFx0LnBpcGUoY29tcHJlc3NlZFNpemVDb3VudGVyKVxuXHRcdC5waXBlKHNlbGYub3V0cHV0U3RyZWFtLCB7ZW5kOiBmYWxzZX0pO1xuXHRjb21wcmVzc2VkU2l6ZUNvdW50ZXIub24oXCJlbmRcIiwgZnVuY3Rpb24gKCkge1xuXHRcdGVudHJ5LmNyYzMyID0gY3JjMzJXYXRjaGVyLmNyYzMyO1xuXHRcdGlmIChlbnRyeS51bmNvbXByZXNzZWRTaXplID09IG51bGwpIHtcblx0XHRcdGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPSB1bmNvbXByZXNzZWRTaXplQ291bnRlci5ieXRlQ291bnQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChlbnRyeS51bmNvbXByZXNzZWRTaXplICE9PSB1bmNvbXByZXNzZWRTaXplQ291bnRlci5ieXRlQ291bnQpIHJldHVybiBzZWxmLmVtaXQoXCJlcnJvclwiLCBuZXcgRXJyb3IoXCJmaWxlIGRhdGEgc3RyZWFtIGhhcyB1bmV4cGVjdGVkIG51bWJlciBvZiBieXRlc1wiKSk7XG5cdFx0fVxuXHRcdGVudHJ5LmNvbXByZXNzZWRTaXplID0gY29tcHJlc3NlZFNpemVDb3VudGVyLmJ5dGVDb3VudDtcblx0XHRzZWxmLm91dHB1dFN0cmVhbUN1cnNvciArPSBlbnRyeS5jb21wcmVzc2VkU2l6ZTtcblx0XHR3cml0ZVRvT3V0cHV0U3RyZWFtKHNlbGYsIGVudHJ5LmdldERhdGFEZXNjcmlwdG9yKCkpO1xuXHRcdGVudHJ5LnN0YXRlID0gRW50cnkuRklMRV9EQVRBX0RPTkU7XG5cdFx0cHVtcEVudHJpZXMoc2VsZik7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBwdW1wRW50cmllcyhzZWxmKSB7XG5cdGlmIChzZWxmLmFsbERvbmUpIHJldHVybjtcblx0Ly8gZmlyc3QgY2hlY2sgaWYgZmluYWxTaXplIGlzIGZpbmFsbHkga25vd25cblx0aWYgKHNlbGYuZW5kZWQgJiYgc2VsZi5maW5hbFNpemVDYWxsYmFjayAhPSBudWxsKSB7XG5cdFx0dmFyIGZpbmFsU2l6ZSA9IGNhbGN1bGF0ZUZpbmFsU2l6ZShzZWxmKTtcblx0XHRpZiAoZmluYWxTaXplICE9IG51bGwpIHtcblx0XHRcdC8vIHdlIGhhdmUgYW4gYW5zd2VyXG5cdFx0XHRzZWxmLmZpbmFsU2l6ZUNhbGxiYWNrKGZpbmFsU2l6ZSk7XG5cdFx0XHRzZWxmLmZpbmFsU2l6ZUNhbGxiYWNrID0gbnVsbDtcblx0XHR9XG5cdH1cblxuXHQvLyBwdW1wIGVudHJpZXNcblx0dmFyIGVudHJ5ID0gZ2V0Rmlyc3ROb3REb25lRW50cnkoKTtcblxuXHRmdW5jdGlvbiBnZXRGaXJzdE5vdERvbmVFbnRyeSgpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuZW50cmllcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGVudHJ5ID0gc2VsZi5lbnRyaWVzW2ldO1xuXHRcdFx0aWYgKGVudHJ5LnN0YXRlIDwgRW50cnkuRklMRV9EQVRBX0RPTkUpIHJldHVybiBlbnRyeTtcblx0XHR9XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRpZiAoZW50cnkgIT0gbnVsbCkge1xuXHRcdC8vIHRoaXMgZW50cnkgaXMgbm90IGRvbmUgeWV0XG5cdFx0aWYgKGVudHJ5LnN0YXRlIDwgRW50cnkuUkVBRFlfVE9fUFVNUF9GSUxFX0RBVEEpIHJldHVybjsgLy8gaW5wdXQgZmlsZSBub3Qgb3BlbiB5ZXRcblx0XHRpZiAoZW50cnkuc3RhdGUgPT09IEVudHJ5LkZJTEVfREFUQV9JTl9QUk9HUkVTUykgcmV0dXJuOyAvLyB3ZSdsbCBnZXQgdGhlcmVcblx0XHQvLyBzdGFydCB3aXRoIGxvY2FsIGZpbGUgaGVhZGVyXG5cdFx0ZW50cnkucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID0gc2VsZi5vdXRwdXRTdHJlYW1DdXJzb3I7XG5cdFx0dmFyIGxvY2FsRmlsZUhlYWRlciA9IGVudHJ5LmdldExvY2FsRmlsZUhlYWRlcigpO1xuXHRcdHdyaXRlVG9PdXRwdXRTdHJlYW0oc2VsZiwgbG9jYWxGaWxlSGVhZGVyKTtcblx0XHRlbnRyeS5kb0ZpbGVEYXRhUHVtcCgpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIGFsbCBjb3VnaHQgdXAgb24gd3JpdGluZyBlbnRyaWVzXG5cdFx0aWYgKHNlbGYuZW5kZWQpIHtcblx0XHRcdC8vIGhlYWQgZm9yIHRoZSBleGl0XG5cdFx0XHRzZWxmLm9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3RvcnkgPSBzZWxmLm91dHB1dFN0cmVhbUN1cnNvcjtcblx0XHRcdHNlbGYuZW50cmllcy5mb3JFYWNoKGZ1bmN0aW9uIChlbnRyeSkge1xuXHRcdFx0XHR2YXIgY2VudHJhbERpcmVjdG9yeVJlY29yZCA9IGVudHJ5LmdldENlbnRyYWxEaXJlY3RvcnlSZWNvcmQoKTtcblx0XHRcdFx0d3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBjZW50cmFsRGlyZWN0b3J5UmVjb3JkKTtcblx0XHRcdH0pO1xuXHRcdFx0d3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBnZXRFbmRPZkNlbnRyYWxEaXJlY3RvcnlSZWNvcmQoc2VsZikpO1xuXHRcdFx0c2VsZi5vdXRwdXRTdHJlYW0uZW5kKCk7XG5cdFx0XHRzZWxmLmFsbERvbmUgPSB0cnVlO1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBjYWxjdWxhdGVGaW5hbFNpemUoc2VsZikge1xuXHR2YXIgcHJldGVuZE91dHB1dEN1cnNvciA9IDA7XG5cdHZhciBjZW50cmFsRGlyZWN0b3J5U2l6ZSA9IDA7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5lbnRyaWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGVudHJ5ID0gc2VsZi5lbnRyaWVzW2ldO1xuXHRcdC8vIGNvbXByZXNzaW9uIGlzIHRvbyBoYXJkIHRvIHByZWRpY3Rcblx0XHRpZiAoZW50cnkuY29tcHJlc3MpIHJldHVybiAtMTtcblx0XHRpZiAoZW50cnkuc3RhdGUgPj0gRW50cnkuUkVBRFlfVE9fUFVNUF9GSUxFX0RBVEEpIHtcblx0XHRcdC8vIGlmIGFkZFJlYWRTdHJlYW0gd2FzIGNhbGxlZCB3aXRob3V0IHByb3ZpZGluZyB0aGUgc2l6ZSwgd2UgY2FuJ3QgcHJlZGljdCB0aGUgZmluYWwgc2l6ZVxuXHRcdFx0aWYgKGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPT0gbnVsbCkgcmV0dXJuIC0xO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBpZiB3ZSdyZSBzdGlsbCB3YWl0aW5nIGZvciBmcy5zdGF0LCB3ZSBtaWdodCBsZWFybiB0aGUgc2l6ZSBzb21lZGF5XG5cdFx0XHRpZiAoZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9PSBudWxsKSByZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0Ly8gd2Uga25vdyB0aGlzIGZvciBzdXJlLCBhbmQgdGhpcyBpcyBpbXBvcnRhbnQgdG8ga25vdyBpZiB3ZSBuZWVkIFpJUDY0IGZvcm1hdC5cblx0XHRlbnRyeS5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgPSBwcmV0ZW5kT3V0cHV0Q3Vyc29yO1xuXHRcdHZhciB1c2VaaXA2NEZvcm1hdCA9IGVudHJ5LnVzZVppcDY0Rm9ybWF0KCk7XG5cblx0XHRwcmV0ZW5kT3V0cHV0Q3Vyc29yICs9IExPQ0FMX0ZJTEVfSEVBREVSX0ZJWEVEX1NJWkUgKyBlbnRyeS51dGY4RmlsZU5hbWUubGVuZ3RoO1xuXHRcdHByZXRlbmRPdXRwdXRDdXJzb3IgKz0gZW50cnkudW5jb21wcmVzc2VkU2l6ZTtcblx0XHRpZiAoIWVudHJ5LmNyY0FuZEZpbGVTaXplS25vd24pIHtcblx0XHRcdC8vIHVzZSBhIGRhdGEgZGVzY3JpcHRvclxuXHRcdFx0aWYgKHVzZVppcDY0Rm9ybWF0KSB7XG5cdFx0XHRcdHByZXRlbmRPdXRwdXRDdXJzb3IgKz0gWklQNjRfREFUQV9ERVNDUklQVE9SX1NJWkU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwcmV0ZW5kT3V0cHV0Q3Vyc29yICs9IERBVEFfREVTQ1JJUFRPUl9TSVpFO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNlbnRyYWxEaXJlY3RvcnlTaXplICs9IENFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9GSVhFRF9TSVpFICsgZW50cnkudXRmOEZpbGVOYW1lLmxlbmd0aDtcblx0XHRpZiAodXNlWmlwNjRGb3JtYXQpIHtcblx0XHRcdGNlbnRyYWxEaXJlY3RvcnlTaXplICs9IFpJUDY0X0VYVEVOREVEX0lORk9STUFUSU9OX0VYVFJBX0ZJRUxEX1NJWkU7XG5cdFx0fVxuXHR9XG5cblx0dmFyIGVuZE9mQ2VudHJhbERpcmVjdG9yeVNpemUgPSAwO1xuXHRpZiAoc2VsZi5mb3JjZVppcDY0RW9jZCB8fFxuXHRcdHNlbGYuZW50cmllcy5sZW5ndGggPj0gMHhmZmZmIHx8XG5cdFx0Y2VudHJhbERpcmVjdG9yeVNpemUgPj0gMHhmZmZmIHx8XG5cdFx0cHJldGVuZE91dHB1dEN1cnNvciA+PSAweGZmZmZmZmZmKSB7XG5cdFx0Ly8gdXNlIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSBzdHVmZlxuXHRcdGVuZE9mQ2VudHJhbERpcmVjdG9yeVNpemUgKz0gWklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFICsgWklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX0xPQ0FUT1JfU0laRTtcblx0fVxuXHRlbmRPZkNlbnRyYWxEaXJlY3RvcnlTaXplICs9IEVORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRTtcblx0cmV0dXJuIHByZXRlbmRPdXRwdXRDdXJzb3IgKyBjZW50cmFsRGlyZWN0b3J5U2l6ZSArIGVuZE9mQ2VudHJhbERpcmVjdG9yeVNpemU7XG59XG5cbnZhciBaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkUgPSA1NjtcbnZhciBaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfTE9DQVRPUl9TSVpFID0gMjA7XG52YXIgRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFID0gMjI7XG5cbmZ1bmN0aW9uIGdldEVuZE9mQ2VudHJhbERpcmVjdG9yeVJlY29yZChzZWxmLCBhY3R1YWxseUp1c3RUZWxsTWVIb3dMb25nSXRXb3VsZEJlKSB7XG5cdHZhciBuZWVkWmlwNjRGb3JtYXQgPSBmYWxzZTtcblx0dmFyIG5vcm1hbEVudHJpZXNMZW5ndGggPSBzZWxmLmVudHJpZXMubGVuZ3RoO1xuXHRpZiAoc2VsZi5mb3JjZVppcDY0RW9jZCB8fCBzZWxmLmVudHJpZXMubGVuZ3RoID49IDB4ZmZmZikge1xuXHRcdG5vcm1hbEVudHJpZXNMZW5ndGggPSAweGZmZmY7XG5cdFx0bmVlZFppcDY0Rm9ybWF0ID0gdHJ1ZTtcblx0fVxuXHR2YXIgc2l6ZU9mQ2VudHJhbERpcmVjdG9yeSA9IHNlbGYub3V0cHV0U3RyZWFtQ3Vyc29yIC0gc2VsZi5vZmZzZXRPZlN0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5O1xuXHR2YXIgbm9ybWFsU2l6ZU9mQ2VudHJhbERpcmVjdG9yeSA9IHNpemVPZkNlbnRyYWxEaXJlY3Rvcnk7XG5cdGlmIChzZWxmLmZvcmNlWmlwNjRFb2NkIHx8IHNpemVPZkNlbnRyYWxEaXJlY3RvcnkgPj0gMHhmZmZmZmZmZikge1xuXHRcdG5vcm1hbFNpemVPZkNlbnRyYWxEaXJlY3RvcnkgPSAweGZmZmZmZmZmO1xuXHRcdG5lZWRaaXA2NEZvcm1hdCA9IHRydWU7XG5cdH1cblx0dmFyIG5vcm1hbE9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3RvcnkgPSBzZWxmLm9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3Rvcnk7XG5cdGlmIChzZWxmLmZvcmNlWmlwNjRFb2NkIHx8IHNlbGYub2Zmc2V0T2ZTdGFydE9mQ2VudHJhbERpcmVjdG9yeSA+PSAweGZmZmZmZmZmKSB7XG5cdFx0bm9ybWFsT2Zmc2V0T2ZTdGFydE9mQ2VudHJhbERpcmVjdG9yeSA9IDB4ZmZmZmZmZmY7XG5cdFx0bmVlZFppcDY0Rm9ybWF0ID0gdHJ1ZTtcblx0fVxuXHRpZiAoYWN0dWFsbHlKdXN0VGVsbE1lSG93TG9uZ0l0V291bGRCZSkge1xuXHRcdGlmIChuZWVkWmlwNjRGb3JtYXQpIHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRSArXG5cdFx0XHRcdFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9MT0NBVE9SX1NJWkUgK1xuXHRcdFx0XHRFTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkVcblx0XHRcdCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBFTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkU7XG5cdFx0fVxuXHR9XG5cblx0dmFyIGVvY2RyQnVmZmVyID0gbmV3IEJ1ZmZlcihFTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkUpO1xuXHQvLyBlbmQgb2YgY2VudHJhbCBkaXIgc2lnbmF0dXJlICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzICAoMHgwNjA1NGI1MClcblx0ZW9jZHJCdWZmZXIud3JpdGVVSW50MzJMRSgweDA2MDU0YjUwLCAwKTtcblx0Ly8gbnVtYmVyIG9mIHRoaXMgZGlzayAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMiBieXRlc1xuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQxNkxFKDAsIDQpO1xuXHQvLyBudW1iZXIgb2YgdGhlIGRpc2sgd2l0aCB0aGUgc3RhcnQgb2YgdGhlIGNlbnRyYWwgZGlyZWN0b3J5ICAyIGJ5dGVzXG5cdGVvY2RyQnVmZmVyLndyaXRlVUludDE2TEUoMCwgNik7XG5cdC8vIHRvdGFsIG51bWJlciBvZiBlbnRyaWVzIGluIHRoZSBjZW50cmFsIGRpcmVjdG9yeSBvbiB0aGlzIGRpc2sgIDIgYnl0ZXNcblx0ZW9jZHJCdWZmZXIud3JpdGVVSW50MTZMRShub3JtYWxFbnRyaWVzTGVuZ3RoLCA4KTtcblx0Ly8gdG90YWwgbnVtYmVyIG9mIGVudHJpZXMgaW4gdGhlIGNlbnRyYWwgZGlyZWN0b3J5ICAgMiBieXRlc1xuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQxNkxFKG5vcm1hbEVudHJpZXNMZW5ndGgsIDEwKTtcblx0Ly8gc2l6ZSBvZiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQzMkxFKG5vcm1hbFNpemVPZkNlbnRyYWxEaXJlY3RvcnksIDEyKTtcblx0Ly8gb2Zmc2V0IG9mIHN0YXJ0IG9mIGNlbnRyYWwgZGlyZWN0b3J5IHdpdGggcmVzcGVjdCB0byB0aGUgc3RhcnRpbmcgZGlzayBudW1iZXIgIDQgYnl0ZXNcblx0ZW9jZHJCdWZmZXIud3JpdGVVSW50MzJMRShub3JtYWxPZmZzZXRPZlN0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5LCAxNik7XG5cdC8vIC5aSVAgZmlsZSBjb21tZW50IGxlbmd0aCAgICAgICAgICAgICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0ZW9jZHJCdWZmZXIud3JpdGVVSW50MTZMRSgwLCAyMCk7XG5cdC8vIC5aSVAgZmlsZSBjb21tZW50ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh2YXJpYWJsZSBzaXplKVxuXHQvLyBubyBjb21tZW50XG5cblx0aWYgKCFuZWVkWmlwNjRGb3JtYXQpIHJldHVybiBlb2NkckJ1ZmZlcjtcblxuXHQvLyBaSVA2NCBmb3JtYXRcblx0Ly8gWklQNjQgRW5kIG9mIENlbnRyYWwgRGlyZWN0b3J5IFJlY29yZFxuXHR2YXIgemlwNjRFb2NkckJ1ZmZlciA9IG5ldyBCdWZmZXIoWklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFKTtcblx0Ly8gemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyIHNpZ25hdHVyZSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXMgICgweDA2MDY0YjUwKVxuXHR6aXA2NEVvY2RyQnVmZmVyLndyaXRlVUludDMyTEUoMHgwNjA2NGI1MCwgMCk7XG5cdC8vIHNpemUgb2YgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdHdyaXRlVUludDY0TEUoemlwNjRFb2NkckJ1ZmZlciwgWklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFIC0gMTIsIDQpO1xuXHQvLyB2ZXJzaW9uIG1hZGUgYnkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMiBieXRlc1xuXHR6aXA2NEVvY2RyQnVmZmVyLndyaXRlVUludDE2TEUoVkVSU0lPTl9NQURFX0JZLCAxMik7XG5cdC8vIHZlcnNpb24gbmVlZGVkIHRvIGV4dHJhY3QgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdHppcDY0RW9jZHJCdWZmZXIud3JpdGVVSW50MTZMRShWRVJTSU9OX05FRURFRF9UT19FWFRSQUNUX1pJUDY0LCAxNCk7XG5cdC8vIG51bWJlciBvZiB0aGlzIGRpc2sgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdHppcDY0RW9jZHJCdWZmZXIud3JpdGVVSW50MzJMRSgwLCAxNik7XG5cdC8vIG51bWJlciBvZiB0aGUgZGlzayB3aXRoIHRoZSBzdGFydCBvZiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdHppcDY0RW9jZHJCdWZmZXIud3JpdGVVSW50MzJMRSgwLCAyMCk7XG5cdC8vIHRvdGFsIG51bWJlciBvZiBlbnRyaWVzIGluIHRoZSBjZW50cmFsIGRpcmVjdG9yeSBvbiB0aGlzIGRpc2sgICAgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdHdyaXRlVUludDY0TEUoemlwNjRFb2NkckJ1ZmZlciwgc2VsZi5lbnRyaWVzLmxlbmd0aCwgMjQpO1xuXHQvLyB0b3RhbCBudW1iZXIgb2YgZW50cmllcyBpbiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOCBieXRlc1xuXHR3cml0ZVVJbnQ2NExFKHppcDY0RW9jZHJCdWZmZXIsIHNlbGYuZW50cmllcy5sZW5ndGgsIDMyKTtcblx0Ly8gc2l6ZSBvZiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDggYnl0ZXNcblx0d3JpdGVVSW50NjRMRSh6aXA2NEVvY2RyQnVmZmVyLCBzaXplT2ZDZW50cmFsRGlyZWN0b3J5LCA0MCk7XG5cdC8vIG9mZnNldCBvZiBzdGFydCBvZiBjZW50cmFsIGRpcmVjdG9yeSB3aXRoIHJlc3BlY3QgdG8gdGhlIHN0YXJ0aW5nIGRpc2sgbnVtYmVyICA4IGJ5dGVzXG5cdHdyaXRlVUludDY0TEUoemlwNjRFb2NkckJ1ZmZlciwgc2VsZi5vZmZzZXRPZlN0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5LCA0OCk7XG5cdC8vIHppcDY0IGV4dGVuc2libGUgZGF0YSBzZWN0b3IgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodmFyaWFibGUgc2l6ZSlcblx0Ly8gbm90aGluZyBpbiB0aGUgemlwNjQgZXh0ZW5zaWJsZSBkYXRhIHNlY3RvclxuXG5cblx0Ly8gWklQNjQgRW5kIG9mIENlbnRyYWwgRGlyZWN0b3J5IExvY2F0b3Jcblx0dmFyIHppcDY0RW9jZGxCdWZmZXIgPSBuZXcgQnVmZmVyKFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9MT0NBVE9SX1NJWkUpO1xuXHQvLyB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXIgbG9jYXRvciBzaWduYXR1cmUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlcyAgKDB4MDcwNjRiNTApXG5cdHppcDY0RW9jZGxCdWZmZXIud3JpdGVVSW50MzJMRSgweDA3MDY0YjUwLCAwKTtcblx0Ly8gbnVtYmVyIG9mIHRoZSBkaXNrIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgIDQgYnl0ZXNcblx0emlwNjRFb2NkbEJ1ZmZlci53cml0ZVVJbnQzMkxFKDAsIDQpO1xuXHQvLyByZWxhdGl2ZSBvZmZzZXQgb2YgdGhlIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmQgICAgICAgICAgICAgOCBieXRlc1xuXHR3cml0ZVVJbnQ2NExFKHppcDY0RW9jZGxCdWZmZXIsIHNlbGYub3V0cHV0U3RyZWFtQ3Vyc29yLCA4KTtcblx0Ly8gdG90YWwgbnVtYmVyIG9mIGRpc2tzICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0emlwNjRFb2NkbEJ1ZmZlci53cml0ZVVJbnQzMkxFKDEsIDE2KTtcblxuXG5cdHJldHVybiBCdWZmZXIuY29uY2F0KFtcblx0XHR6aXA2NEVvY2RyQnVmZmVyLFxuXHRcdHppcDY0RW9jZGxCdWZmZXIsXG5cdFx0ZW9jZHJCdWZmZXIsXG5cdF0pO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZU1ldGFkYXRhUGF0aChtZXRhZGF0YVBhdGgsIGlzRGlyZWN0b3J5KSB7XG5cdGlmIChtZXRhZGF0YVBhdGggPT09IFwiXCIpIHRocm93IG5ldyBFcnJvcihcImVtcHR5IG1ldGFkYXRhUGF0aFwiKTtcblx0bWV0YWRhdGFQYXRoID0gbWV0YWRhdGFQYXRoLnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpO1xuXHRpZiAoL15bYS16QS1aXTovLnRlc3QobWV0YWRhdGFQYXRoKSB8fCAvXlxcLy8udGVzdChtZXRhZGF0YVBhdGgpKSB0aHJvdyBuZXcgRXJyb3IoXCJhYnNvbHV0ZSBwYXRoOiBcIiArIG1ldGFkYXRhUGF0aCk7XG5cdGlmIChtZXRhZGF0YVBhdGguc3BsaXQoXCIvXCIpLmluZGV4T2YoXCIuLlwiKSAhPT0gLTEpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgcmVsYXRpdmUgcGF0aDogXCIgKyBtZXRhZGF0YVBhdGgpO1xuXHR2YXIgbG9va3NMaWtlRGlyZWN0b3J5ID0gL1xcLyQvLnRlc3QobWV0YWRhdGFQYXRoKTtcblx0aWYgKGlzRGlyZWN0b3J5KSB7XG5cdFx0Ly8gYXBwZW5kIGEgdHJhaWxpbmcgJy8nIGlmIG5lY2Vzc2FyeS5cblx0XHRpZiAoIWxvb2tzTGlrZURpcmVjdG9yeSkgbWV0YWRhdGFQYXRoICs9IFwiL1wiO1xuXHR9IGVsc2Uge1xuXHRcdGlmIChsb29rc0xpa2VEaXJlY3RvcnkpIHRocm93IG5ldyBFcnJvcihcImZpbGUgcGF0aCBjYW5ub3QgZW5kIHdpdGggJy8nOiBcIiArIG1ldGFkYXRhUGF0aCk7XG5cdH1cblx0cmV0dXJuIG1ldGFkYXRhUGF0aDtcbn1cblxudmFyIGRlZmF1bHRGaWxlTW9kZSA9IHBhcnNlSW50KFwiMDEwMDY2NFwiLCA4KTtcbnZhciBkZWZhdWx0RGlyZWN0b3J5TW9kZSA9IHBhcnNlSW50KFwiMDQwNzc1XCIsIDgpO1xuXG4vLyB0aGlzIGNsYXNzIGlzIG5vdCBwYXJ0IG9mIHRoZSBwdWJsaWMgQVBJXG5mdW5jdGlvbiBFbnRyeShtZXRhZGF0YVBhdGgsIGlzRGlyZWN0b3J5LCBvcHRpb25zKSB7XG5cdHRoaXMudXRmOEZpbGVOYW1lID0gbmV3IEJ1ZmZlcihtZXRhZGF0YVBhdGgpO1xuXHRpZiAodGhpcy51dGY4RmlsZU5hbWUubGVuZ3RoID4gMHhmZmZmKSB0aHJvdyBuZXcgRXJyb3IoXCJ1dGY4IGZpbGUgbmFtZSB0b28gbG9uZy4gXCIgKyB1dGY4RmlsZU5hbWUubGVuZ3RoICsgXCIgPiBcIiArIDB4ZmZmZik7XG5cdHRoaXMuaXNEaXJlY3RvcnkgPSBpc0RpcmVjdG9yeTtcblx0dGhpcy5zdGF0ZSA9IEVudHJ5LldBSVRJTkdfRk9SX01FVEFEQVRBO1xuXHR0aGlzLnNldExhc3RNb2REYXRlKG9wdGlvbnMubXRpbWUgIT0gbnVsbCA/IG9wdGlvbnMubXRpbWUgOiBuZXcgRGF0ZSgpKTtcblx0aWYgKG9wdGlvbnMubW9kZSAhPSBudWxsKSB7XG5cdFx0dGhpcy5zZXRGaWxlQXR0cmlidXRlc01vZGUob3B0aW9ucy5tb2RlKTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLnNldEZpbGVBdHRyaWJ1dGVzTW9kZShpc0RpcmVjdG9yeSA/IGRlZmF1bHREaXJlY3RvcnlNb2RlIDogZGVmYXVsdEZpbGVNb2RlKTtcblx0fVxuXHRpZiAoaXNEaXJlY3RvcnkpIHtcblx0XHR0aGlzLmNyY0FuZEZpbGVTaXplS25vd24gPSB0cnVlO1xuXHRcdHRoaXMuY3JjMzIgPSAwO1xuXHRcdHRoaXMudW5jb21wcmVzc2VkU2l6ZSA9IDA7XG5cdFx0dGhpcy5jb21wcmVzc2VkU2l6ZSA9IDA7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gdW5rbm93biBzbyBmYXJcblx0XHR0aGlzLmNyY0FuZEZpbGVTaXplS25vd24gPSBmYWxzZTtcblx0XHR0aGlzLmNyYzMyID0gbnVsbDtcblx0XHR0aGlzLnVuY29tcHJlc3NlZFNpemUgPSBudWxsO1xuXHRcdHRoaXMuY29tcHJlc3NlZFNpemUgPSBudWxsO1xuXHRcdGlmIChvcHRpb25zLnNpemUgIT0gbnVsbCkgdGhpcy51bmNvbXByZXNzZWRTaXplID0gb3B0aW9ucy5zaXplO1xuXHR9XG5cdGlmIChpc0RpcmVjdG9yeSkge1xuXHRcdHRoaXMuY29tcHJlc3MgPSBmYWxzZTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLmNvbXByZXNzID0gdHJ1ZTsgLy8gZGVmYXVsdFxuXHRcdGlmIChvcHRpb25zLmNvbXByZXNzICE9IG51bGwpIHRoaXMuY29tcHJlc3MgPSAhIW9wdGlvbnMuY29tcHJlc3M7XG5cdH1cblx0dGhpcy5mb3JjZVppcDY0Rm9ybWF0ID0gISFvcHRpb25zLmZvcmNlWmlwNjRGb3JtYXQ7XG59XG5cbkVudHJ5LldBSVRJTkdfRk9SX01FVEFEQVRBID0gMDtcbkVudHJ5LlJFQURZX1RPX1BVTVBfRklMRV9EQVRBID0gMTtcbkVudHJ5LkZJTEVfREFUQV9JTl9QUk9HUkVTUyA9IDI7XG5FbnRyeS5GSUxFX0RBVEFfRE9ORSA9IDM7XG5FbnRyeS5wcm90b3R5cGUuc2V0TGFzdE1vZERhdGUgPSBmdW5jdGlvbiAoZGF0ZSkge1xuXHR2YXIgZG9zRGF0ZVRpbWUgPSBkYXRlVG9Eb3NEYXRlVGltZShkYXRlKTtcblx0dGhpcy5sYXN0TW9kRmlsZVRpbWUgPSBkb3NEYXRlVGltZS50aW1lO1xuXHR0aGlzLmxhc3RNb2RGaWxlRGF0ZSA9IGRvc0RhdGVUaW1lLmRhdGU7XG59O1xuRW50cnkucHJvdG90eXBlLnNldEZpbGVBdHRyaWJ1dGVzTW9kZSA9IGZ1bmN0aW9uIChtb2RlKSB7XG5cdGlmICgobW9kZSAmIDB4ZmZmZikgIT09IG1vZGUpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgbW9kZS4gZXhwZWN0ZWQ6IDAgPD0gXCIgKyBtb2RlICsgXCIgPD0gXCIgKyAweGZmZmYpO1xuXHQvLyBodHRwOi8vdW5peC5zdGFja2V4Y2hhbmdlLmNvbS9xdWVzdGlvbnMvMTQ3MDUvdGhlLXppcC1mb3JtYXRzLWV4dGVybmFsLWZpbGUtYXR0cmlidXRlLzE0NzI3IzE0NzI3XG5cdHRoaXMuZXh0ZXJuYWxGaWxlQXR0cmlidXRlcyA9IChtb2RlIDw8IDE2KSA+Pj4gMDtcbn07XG4vLyBkb0ZpbGVEYXRhUHVtcCgpIHNob3VsZCBub3QgY2FsbCBwdW1wRW50cmllcygpIGRpcmVjdGx5LiBzZWUgaXNzdWUgIzkuXG5FbnRyeS5wcm90b3R5cGUuc2V0RmlsZURhdGFQdW1wRnVuY3Rpb24gPSBmdW5jdGlvbiAoZG9GaWxlRGF0YVB1bXApIHtcblx0dGhpcy5kb0ZpbGVEYXRhUHVtcCA9IGRvRmlsZURhdGFQdW1wO1xuXHR0aGlzLnN0YXRlID0gRW50cnkuUkVBRFlfVE9fUFVNUF9GSUxFX0RBVEE7XG59O1xuRW50cnkucHJvdG90eXBlLnVzZVppcDY0Rm9ybWF0ID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gKFxuXHRcdCh0aGlzLmZvcmNlWmlwNjRGb3JtYXQpIHx8XG5cdFx0KHRoaXMudW5jb21wcmVzc2VkU2l6ZSAhPSBudWxsICYmIHRoaXMudW5jb21wcmVzc2VkU2l6ZSA+IDB4ZmZmZmZmZmUpIHx8XG5cdFx0KHRoaXMuY29tcHJlc3NlZFNpemUgIT0gbnVsbCAmJiB0aGlzLmNvbXByZXNzZWRTaXplID4gMHhmZmZmZmZmZSkgfHxcblx0XHQodGhpcy5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgIT0gbnVsbCAmJiB0aGlzLnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA+IDB4ZmZmZmZmZmUpXG5cdCk7XG59XG52YXIgTE9DQUxfRklMRV9IRUFERVJfRklYRURfU0laRSA9IDMwO1xudmFyIFZFUlNJT05fTkVFREVEX1RPX0VYVFJBQ1RfVVRGOCA9IDIwO1xudmFyIFZFUlNJT05fTkVFREVEX1RPX0VYVFJBQ1RfWklQNjQgPSA0NTtcbi8vIDMgPSB1bml4LiA2MyA9IHNwZWMgdmVyc2lvbiA2LjNcbnZhciBWRVJTSU9OX01BREVfQlkgPSAoMyA8PCA4KSB8IDYzO1xudmFyIEZJTEVfTkFNRV9JU19VVEY4ID0gMSA8PCAxMTtcbnZhciBVTktOT1dOX0NSQzMyX0FORF9GSUxFX1NJWkVTID0gMSA8PCAzO1xuRW50cnkucHJvdG90eXBlLmdldExvY2FsRmlsZUhlYWRlciA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGNyYzMyID0gMDtcblx0dmFyIGNvbXByZXNzZWRTaXplID0gMDtcblx0dmFyIHVuY29tcHJlc3NlZFNpemUgPSAwO1xuXHRpZiAodGhpcy5jcmNBbmRGaWxlU2l6ZUtub3duKSB7XG5cdFx0Y3JjMzIgPSB0aGlzLmNyYzMyO1xuXHRcdGNvbXByZXNzZWRTaXplID0gdGhpcy5jb21wcmVzc2VkU2l6ZTtcblx0XHR1bmNvbXByZXNzZWRTaXplID0gdGhpcy51bmNvbXByZXNzZWRTaXplO1xuXHR9XG5cblx0dmFyIGZpeGVkU2l6ZVN0dWZmID0gbmV3IEJ1ZmZlcihMT0NBTF9GSUxFX0hFQURFUl9GSVhFRF9TSVpFKTtcblx0dmFyIGdlbmVyYWxQdXJwb3NlQml0RmxhZyA9IEZJTEVfTkFNRV9JU19VVEY4O1xuXHRpZiAoIXRoaXMuY3JjQW5kRmlsZVNpemVLbm93bikgZ2VuZXJhbFB1cnBvc2VCaXRGbGFnIHw9IFVOS05PV05fQ1JDMzJfQU5EX0ZJTEVfU0laRVM7XG5cblx0Ly8gbG9jYWwgZmlsZSBoZWFkZXIgc2lnbmF0dXJlICAgICA0IGJ5dGVzICAoMHgwNDAzNGI1MClcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRSgweDA0MDM0YjUwLCAwKTtcblx0Ly8gdmVyc2lvbiBuZWVkZWQgdG8gZXh0cmFjdCAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoVkVSU0lPTl9ORUVERURfVE9fRVhUUkFDVF9VVEY4LCA0KTtcblx0Ly8gZ2VuZXJhbCBwdXJwb3NlIGJpdCBmbGFnICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoZ2VuZXJhbFB1cnBvc2VCaXRGbGFnLCA2KTtcblx0Ly8gY29tcHJlc3Npb24gbWV0aG9kICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodGhpcy5nZXRDb21wcmVzc2lvbk1ldGhvZCgpLCA4KTtcblx0Ly8gbGFzdCBtb2QgZmlsZSB0aW1lICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodGhpcy5sYXN0TW9kRmlsZVRpbWUsIDEwKTtcblx0Ly8gbGFzdCBtb2QgZmlsZSBkYXRlICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodGhpcy5sYXN0TW9kRmlsZURhdGUsIDEyKTtcblx0Ly8gY3JjLTMyICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUoY3JjMzIsIDE0KTtcblx0Ly8gY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUoY29tcHJlc3NlZFNpemUsIDE4KTtcblx0Ly8gdW5jb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUodW5jb21wcmVzc2VkU2l6ZSwgMjIpO1xuXHQvLyBmaWxlIG5hbWUgbGVuZ3RoICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLnV0ZjhGaWxlTmFtZS5sZW5ndGgsIDI2KTtcblx0Ly8gZXh0cmEgZmllbGQgbGVuZ3RoICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoMCwgMjgpO1xuXHRyZXR1cm4gQnVmZmVyLmNvbmNhdChbXG5cdFx0Zml4ZWRTaXplU3R1ZmYsXG5cdFx0Ly8gZmlsZSBuYW1lICh2YXJpYWJsZSBzaXplKVxuXHRcdHRoaXMudXRmOEZpbGVOYW1lLFxuXHRcdC8vIGV4dHJhIGZpZWxkICh2YXJpYWJsZSBzaXplKVxuXHRcdC8vIG5vIGV4dHJhIGZpZWxkc1xuXHRdKTtcbn07XG52YXIgREFUQV9ERVNDUklQVE9SX1NJWkUgPSAxNjtcbnZhciBaSVA2NF9EQVRBX0RFU0NSSVBUT1JfU0laRSA9IDI0O1xuRW50cnkucHJvdG90eXBlLmdldERhdGFEZXNjcmlwdG9yID0gZnVuY3Rpb24gKCkge1xuXHRpZiAodGhpcy5jcmNBbmRGaWxlU2l6ZUtub3duKSB7XG5cdFx0Ly8gdGhlIE1hYyBBcmNoaXZlIFV0aWxpdHkgcmVxdWlyZXMgdGhpcyBub3QgYmUgcHJlc2VudCB1bmxlc3Mgd2Ugc2V0IGdlbmVyYWwgcHVycG9zZSBiaXQgM1xuXHRcdHJldHVybiBuZXcgQnVmZmVyKDApO1xuXHR9XG5cdGlmICghdGhpcy51c2VaaXA2NEZvcm1hdCgpKSB7XG5cdFx0dmFyIGJ1ZmZlciA9IG5ldyBCdWZmZXIoREFUQV9ERVNDUklQVE9SX1NJWkUpO1xuXHRcdC8vIG9wdGlvbmFsIHNpZ25hdHVyZSAocmVxdWlyZWQgYWNjb3JkaW5nIHRvIEFyY2hpdmUgVXRpbGl0eSlcblx0XHRidWZmZXIud3JpdGVVSW50MzJMRSgweDA4MDc0YjUwLCAwKTtcblx0XHQvLyBjcmMtMzIgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0XHRidWZmZXIud3JpdGVVSW50MzJMRSh0aGlzLmNyYzMyLCA0KTtcblx0XHQvLyBjb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0XHRidWZmZXIud3JpdGVVSW50MzJMRSh0aGlzLmNvbXByZXNzZWRTaXplLCA4KTtcblx0XHQvLyB1bmNvbXByZXNzZWQgc2l6ZSAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0XHRidWZmZXIud3JpdGVVSW50MzJMRSh0aGlzLnVuY29tcHJlc3NlZFNpemUsIDEyKTtcblx0XHRyZXR1cm4gYnVmZmVyO1xuXHR9IGVsc2Uge1xuXHRcdC8vIFpJUDY0IGZvcm1hdFxuXHRcdHZhciBidWZmZXIgPSBuZXcgQnVmZmVyKFpJUDY0X0RBVEFfREVTQ1JJUFRPUl9TSVpFKTtcblx0XHQvLyBvcHRpb25hbCBzaWduYXR1cmUgKHVua25vd24gaWYgYW55b25lIGNhcmVzIGFib3V0IHRoaXMpXG5cdFx0YnVmZmVyLndyaXRlVUludDMyTEUoMHgwODA3NGI1MCwgMCk7XG5cdFx0Ly8gY3JjLTMyICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdFx0YnVmZmVyLndyaXRlVUludDMyTEUodGhpcy5jcmMzMiwgNCk7XG5cdFx0Ly8gY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdFx0d3JpdGVVSW50NjRMRShidWZmZXIsIHRoaXMuY29tcHJlc3NlZFNpemUsIDgpO1xuXHRcdC8vIHVuY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgOCBieXRlc1xuXHRcdHdyaXRlVUludDY0TEUoYnVmZmVyLCB0aGlzLnVuY29tcHJlc3NlZFNpemUsIDE2KTtcblx0XHRyZXR1cm4gYnVmZmVyO1xuXHR9XG59O1xudmFyIENFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9GSVhFRF9TSVpFID0gNDY7XG52YXIgWklQNjRfRVhURU5ERURfSU5GT1JNQVRJT05fRVhUUkFfRklFTERfU0laRSA9IDI4O1xuRW50cnkucHJvdG90eXBlLmdldENlbnRyYWxEaXJlY3RvcnlSZWNvcmQgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBmaXhlZFNpemVTdHVmZiA9IG5ldyBCdWZmZXIoQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX0ZJWEVEX1NJWkUpO1xuXHR2YXIgZ2VuZXJhbFB1cnBvc2VCaXRGbGFnID0gRklMRV9OQU1FX0lTX1VURjg7XG5cdGlmICghdGhpcy5jcmNBbmRGaWxlU2l6ZUtub3duKSBnZW5lcmFsUHVycG9zZUJpdEZsYWcgfD0gVU5LTk9XTl9DUkMzMl9BTkRfRklMRV9TSVpFUztcblxuXHR2YXIgbm9ybWFsQ29tcHJlc3NlZFNpemUgPSB0aGlzLmNvbXByZXNzZWRTaXplO1xuXHR2YXIgbm9ybWFsVW5jb21wcmVzc2VkU2l6ZSA9IHRoaXMudW5jb21wcmVzc2VkU2l6ZTtcblx0dmFyIG5vcm1hbFJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9IHRoaXMucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyO1xuXHR2YXIgdmVyc2lvbk5lZWRlZFRvRXh0cmFjdDtcblx0dmFyIHplaWVmQnVmZmVyO1xuXHRpZiAodGhpcy51c2VaaXA2NEZvcm1hdCgpKSB7XG5cdFx0bm9ybWFsQ29tcHJlc3NlZFNpemUgPSAweGZmZmZmZmZmO1xuXHRcdG5vcm1hbFVuY29tcHJlc3NlZFNpemUgPSAweGZmZmZmZmZmO1xuXHRcdG5vcm1hbFJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9IDB4ZmZmZmZmZmY7XG5cdFx0dmVyc2lvbk5lZWRlZFRvRXh0cmFjdCA9IFZFUlNJT05fTkVFREVEX1RPX0VYVFJBQ1RfWklQNjQ7XG5cblx0XHQvLyBaSVA2NCBleHRlbmRlZCBpbmZvcm1hdGlvbiBleHRyYSBmaWVsZFxuXHRcdHplaWVmQnVmZmVyID0gbmV3IEJ1ZmZlcihaSVA2NF9FWFRFTkRFRF9JTkZPUk1BVElPTl9FWFRSQV9GSUVMRF9TSVpFKTtcblx0XHQvLyAweDAwMDEgICAgICAgICAgICAgICAgICAyIGJ5dGVzICAgIFRhZyBmb3IgdGhpcyBcImV4dHJhXCIgYmxvY2sgdHlwZVxuXHRcdHplaWVmQnVmZmVyLndyaXRlVUludDE2TEUoMHgwMDAxLCAwKTtcblx0XHQvLyBTaXplICAgICAgICAgICAgICAgICAgICAyIGJ5dGVzICAgIFNpemUgb2YgdGhpcyBcImV4dHJhXCIgYmxvY2tcblx0XHR6ZWllZkJ1ZmZlci53cml0ZVVJbnQxNkxFKFpJUDY0X0VYVEVOREVEX0lORk9STUFUSU9OX0VYVFJBX0ZJRUxEX1NJWkUgLSA0LCAyKTtcblx0XHQvLyBPcmlnaW5hbCBTaXplICAgICAgICAgICA4IGJ5dGVzICAgIE9yaWdpbmFsIHVuY29tcHJlc3NlZCBmaWxlIHNpemVcblx0XHR3cml0ZVVJbnQ2NExFKHplaWVmQnVmZmVyLCB0aGlzLnVuY29tcHJlc3NlZFNpemUsIDQpO1xuXHRcdC8vIENvbXByZXNzZWQgU2l6ZSAgICAgICAgIDggYnl0ZXMgICAgU2l6ZSBvZiBjb21wcmVzc2VkIGRhdGFcblx0XHR3cml0ZVVJbnQ2NExFKHplaWVmQnVmZmVyLCB0aGlzLmNvbXByZXNzZWRTaXplLCAxMik7XG5cdFx0Ly8gUmVsYXRpdmUgSGVhZGVyIE9mZnNldCAgOCBieXRlcyAgICBPZmZzZXQgb2YgbG9jYWwgaGVhZGVyIHJlY29yZFxuXHRcdHdyaXRlVUludDY0TEUoemVpZWZCdWZmZXIsIHRoaXMucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyLCAyMCk7XG5cdFx0Ly8gRGlzayBTdGFydCBOdW1iZXIgICAgICAgNCBieXRlcyAgICBOdW1iZXIgb2YgdGhlIGRpc2sgb24gd2hpY2ggdGhpcyBmaWxlIHN0YXJ0c1xuXHRcdC8vIChvbWl0KVxuXHR9IGVsc2Uge1xuXHRcdHZlcnNpb25OZWVkZWRUb0V4dHJhY3QgPSBWRVJTSU9OX05FRURFRF9UT19FWFRSQUNUX1VURjg7XG5cdFx0emVpZWZCdWZmZXIgPSBuZXcgQnVmZmVyKDApO1xuXHR9XG5cblx0Ly8gY2VudHJhbCBmaWxlIGhlYWRlciBzaWduYXR1cmUgICA0IGJ5dGVzICAoMHgwMjAxNGI1MClcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRSgweDAyMDE0YjUwLCAwKTtcblx0Ly8gdmVyc2lvbiBtYWRlIGJ5ICAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoVkVSU0lPTl9NQURFX0JZLCA0KTtcblx0Ly8gdmVyc2lvbiBuZWVkZWQgdG8gZXh0cmFjdCAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodmVyc2lvbk5lZWRlZFRvRXh0cmFjdCwgNik7XG5cdC8vIGdlbmVyYWwgcHVycG9zZSBiaXQgZmxhZyAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKGdlbmVyYWxQdXJwb3NlQml0RmxhZywgOCk7XG5cdC8vIGNvbXByZXNzaW9uIG1ldGhvZCAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHRoaXMuZ2V0Q29tcHJlc3Npb25NZXRob2QoKSwgMTApO1xuXHQvLyBsYXN0IG1vZCBmaWxlIHRpbWUgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLmxhc3RNb2RGaWxlVGltZSwgMTIpO1xuXHQvLyBsYXN0IG1vZCBmaWxlIGRhdGUgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLmxhc3RNb2RGaWxlRGF0ZSwgMTQpO1xuXHQvLyBjcmMtMzIgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRSh0aGlzLmNyYzMyLCAxNik7XG5cdC8vIGNvbXByZXNzZWQgc2l6ZSAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKG5vcm1hbENvbXByZXNzZWRTaXplLCAyMCk7XG5cdC8vIHVuY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgNCBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKG5vcm1hbFVuY29tcHJlc3NlZFNpemUsIDI0KTtcblx0Ly8gZmlsZSBuYW1lIGxlbmd0aCAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodGhpcy51dGY4RmlsZU5hbWUubGVuZ3RoLCAyOCk7XG5cdC8vIGV4dHJhIGZpZWxkIGxlbmd0aCAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHplaWVmQnVmZmVyLmxlbmd0aCwgMzApO1xuXHQvLyBmaWxlIGNvbW1lbnQgbGVuZ3RoICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSgwLCAzMik7XG5cdC8vIGRpc2sgbnVtYmVyIHN0YXJ0ICAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKDAsIDM0KTtcblx0Ly8gaW50ZXJuYWwgZmlsZSBhdHRyaWJ1dGVzICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoMCwgMzYpO1xuXHQvLyBleHRlcm5hbCBmaWxlIGF0dHJpYnV0ZXMgICAgICAgIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRSh0aGlzLmV4dGVybmFsRmlsZUF0dHJpYnV0ZXMsIDM4KTtcblx0Ly8gcmVsYXRpdmUgb2Zmc2V0IG9mIGxvY2FsIGhlYWRlciA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUobm9ybWFsUmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyLCA0Mik7XG5cblx0cmV0dXJuIEJ1ZmZlci5jb25jYXQoW1xuXHRcdGZpeGVkU2l6ZVN0dWZmLFxuXHRcdC8vIGZpbGUgbmFtZSAodmFyaWFibGUgc2l6ZSlcblx0XHR0aGlzLnV0ZjhGaWxlTmFtZSxcblx0XHQvLyBleHRyYSBmaWVsZCAodmFyaWFibGUgc2l6ZSlcblx0XHR6ZWllZkJ1ZmZlcixcblx0XHQvLyBmaWxlIGNvbW1lbnQgKHZhcmlhYmxlIHNpemUpXG5cdFx0Ly8gZW1wdHkgY29tbWVudFxuXHRdKTtcbn07XG5FbnRyeS5wcm90b3R5cGUuZ2V0Q29tcHJlc3Npb25NZXRob2QgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBOT19DT01QUkVTU0lPTiA9IDA7XG5cdHZhciBERUZMQVRFX0NPTVBSRVNTSU9OID0gODtcblx0cmV0dXJuIHRoaXMuY29tcHJlc3MgPyBERUZMQVRFX0NPTVBSRVNTSU9OIDogTk9fQ09NUFJFU1NJT047XG59O1xuXG5mdW5jdGlvbiBkYXRlVG9Eb3NEYXRlVGltZShqc0RhdGUpIHtcblx0dmFyIGRhdGUgPSAwO1xuXHRkYXRlIHw9IGpzRGF0ZS5nZXREYXRlKCkgJiAweDFmOyAvLyAxLTMxXG5cdGRhdGUgfD0gKChqc0RhdGUuZ2V0TW9udGgoKSArIDEpICYgMHhmKSA8PCA1OyAvLyAwLTExLCAxLTEyXG5cdGRhdGUgfD0gKChqc0RhdGUuZ2V0RnVsbFllYXIoKSAtIDE5ODApICYgMHg3ZikgPDwgOTsgLy8gMC0xMjgsIDE5ODAtMjEwOFxuXG5cdHZhciB0aW1lID0gMDtcblx0dGltZSB8PSBNYXRoLmZsb29yKGpzRGF0ZS5nZXRTZWNvbmRzKCkgLyAyKTsgLy8gMC01OSwgMC0yOSAobG9zZSBvZGQgbnVtYmVycylcblx0dGltZSB8PSAoanNEYXRlLmdldE1pbnV0ZXMoKSAmIDB4M2YpIDw8IDU7IC8vIDAtNTlcblx0dGltZSB8PSAoanNEYXRlLmdldEhvdXJzKCkgJiAweDFmKSA8PCAxMTsgLy8gMC0yM1xuXG5cdHJldHVybiB7ZGF0ZTogZGF0ZSwgdGltZTogdGltZX07XG59XG5cbmZ1bmN0aW9uIHdyaXRlVUludDY0TEUoYnVmZmVyLCBuLCBvZmZzZXQpIHtcblx0Ly8gY2FuJ3QgdXNlIGJpdHNoaWZ0IGhlcmUsIGJlY2F1c2UgSmF2YVNjcmlwdCBvbmx5IGFsbG93cyBiaXRzaGl0aW5nIG9uIDMyLWJpdCBpbnRlZ2Vycy5cblx0dmFyIGhpZ2ggPSBNYXRoLmZsb29yKG4gLyAweDEwMDAwMDAwMCk7XG5cdHZhciBsb3cgPSBuICUgMHgxMDAwMDAwMDA7XG5cdGJ1ZmZlci53cml0ZVVJbnQzMkxFKGxvdywgb2Zmc2V0KTtcblx0YnVmZmVyLndyaXRlVUludDMyTEUoaGlnaCwgb2Zmc2V0ICsgNCk7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRDYWxsYmFjayhlcnIpIHtcblx0aWYgKGVycikgdGhyb3cgZXJyO1xufVxuXG51dGlsLmluaGVyaXRzKEJ5dGVDb3VudGVyLCBUcmFuc2Zvcm0pO1xuXG5mdW5jdGlvbiBCeXRlQ291bnRlcihvcHRpb25zKSB7XG5cdFRyYW5zZm9ybS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXHR0aGlzLmJ5dGVDb3VudCA9IDA7XG59XG5cbkJ5dGVDb3VudGVyLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24gKGNodW5rLCBlbmNvZGluZywgY2IpIHtcblx0dGhpcy5ieXRlQ291bnQgKz0gY2h1bmsubGVuZ3RoO1xuXHRjYihudWxsLCBjaHVuayk7XG59O1xuXG51dGlsLmluaGVyaXRzKENyYzMyV2F0Y2hlciwgVHJhbnNmb3JtKTtcblxuZnVuY3Rpb24gQ3JjMzJXYXRjaGVyKG9wdGlvbnMpIHtcblx0VHJhbnNmb3JtLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cdHRoaXMuY3JjMzIgPSAwO1xufVxuXG5DcmMzMldhdGNoZXIucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2h1bmssIGVuY29kaW5nLCBjYikge1xuXHR0aGlzLmNyYzMyID0gY3JjMzIudW5zaWduZWQoY2h1bmssIHRoaXMuY3JjMzIpO1xuXHRjYihudWxsLCBjaHVuayk7XG59OyJdfQ==
