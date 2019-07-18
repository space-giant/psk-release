psknodeRequire=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/home/cosmin/Workspace/reorganizing/privatesky/builds/tmp/psknode_intermediar.js":[function(require,module,exports){
(function (global){
global.psknodeLoadModules = function(){ 
	$$.__runtimeModules["yazl"] = require("yazl");
	$$.__runtimeModules["yauzl"] = require("yauzl");
	$$.__runtimeModules["pskwallet"] = require("pskwallet");
	$$.__runtimeModules["signsensus"] = require("signsensus");
	$$.__runtimeModules["foldermq"] = require("foldermq");
	$$.__runtimeModules["pskdb"] = require("pskdb");
	$$.__runtimeModules["buffer-crc32"] = require("buffer-crc32");
	$$.__runtimeModules["node-fd-slicer"] = require("node-fd-slicer");
	$$.__runtimeModules["interact"] = require("interact");
	$$.__runtimeModules["psk-http-client"] = require("psk-http-client");
}
if (false) {
	psknodeLoadModules();
}; 
global.psknodeRequire = require;
if (typeof $$ !== "undefined") {            
    $$.requireBundle("psknode");
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"buffer-crc32":"buffer-crc32","foldermq":"foldermq","interact":"interact","node-fd-slicer":"node-fd-slicer","psk-http-client":"psk-http-client","pskdb":"pskdb","pskwallet":"pskwallet","signsensus":"signsensus","yauzl":"yauzl","yazl":"yazl"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/foldermq/lib/folderMQ.js":[function(require,module,exports){
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

},{"buffer":false}],"foldermq":[function(require,module,exports){
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

},{"buffer":false,"buffer-crc32":"buffer-crc32","events":false,"fs":false,"stream":false,"timers":false,"util":false,"zlib":false}]},{},["/home/cosmin/Workspace/reorganizing/privatesky/builds/tmp/psknode_intermediar.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZHMvdG1wL3Bza25vZGVfaW50ZXJtZWRpYXIuanMiLCJtb2R1bGVzL2ZvbGRlcm1xL2xpYi9mb2xkZXJNUS5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1NvdW5kUHViU3ViTVFCYXNlZEludGVyYWN0aW9uU3BhY2UuanMiLCJtb2R1bGVzL2ludGVyYWN0L2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9XZWJWaWV3TVFJbnRlcmFjdGlvblNwYWNlLmpzIiwibW9kdWxlcy9pbnRlcmFjdC9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvV2luZG93TVFJbnRlcmFjdGlvblNwYWNlLmpzIiwibW9kdWxlcy9pbnRlcmFjdC9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvZm9sZGVyTVFCYXNlZEludGVyYWN0aW9uU3BhY2UuanMiLCJtb2R1bGVzL2ludGVyYWN0L2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9odHRwSW50ZXJhY3Rpb25TcGFjZS5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL3NwZWNpZmljTVFJbXBsL0NoaWxkV2ViVmlld01RLmpzIiwibW9kdWxlcy9pbnRlcmFjdC9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvc3BlY2lmaWNNUUltcGwvQ2hpbGRXbmRNUS5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL3N3YXJtSW50ZXJhY3Rpb24uanMiLCJtb2R1bGVzL25vZGUtZmQtc2xpY2VyL21vZHVsZXMvbm9kZS1wZW5kL2luZGV4LmpzIiwibW9kdWxlcy9wc2staHR0cC1jbGllbnQvbGliL3Bzay1hYnN0cmFjdC1jbGllbnQuanMiLCJtb2R1bGVzL3Bzay1odHRwLWNsaWVudC9saWIvcHNrLWJyb3dzZXItY2xpZW50LmpzIiwibW9kdWxlcy9wc2staHR0cC1jbGllbnQvbGliL3Bzay1ub2RlLWNsaWVudC5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL0Jsb2NrY2hhaW4uanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9Gb2xkZXJQZXJzaXN0ZW50UERTLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvSW5NZW1vcnlQRFMuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9QZXJzaXN0ZW50UERTLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0FDTFNjb3BlLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0FnZW50LmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0JhY2t1cC5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9DU0JNZXRhLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0NTQlJlZmVyZW5jZS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9Eb21haW5SZWZlcmVuY2UuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9kb21haW4vRW1iZWRkZWRGaWxlLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0ZpbGVSZWZlcmVuY2UuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9kb21haW4vS2V5LmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL2luZGV4LmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL3RyYW5zYWN0aW9ucy5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL3N3YXJtcy9hZ2VudHNTd2FybS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL3N3YXJtcy9kb21haW5Td2FybXMuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9zd2FybXMvaW5kZXguanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9zd2FybXMvc2hhcmVkUGhhc2VzLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvbGlicmFyaWVzL0JhY2t1cEVuZ2luZS5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9DU0JDYWNoZS5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9DU0JJZGVudGlmaWVyLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvbGlicmFyaWVzL1Jhd0NTQi5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9Sb290Q1NCLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvbGlicmFyaWVzL2JhY2t1cFJlc29sdmVycy9FVkZTUmVzb2x2ZXIuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvZmxvd3MvYWRkQmFja3VwLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvbGlicmFyaWVzL2Zsb3dzL2FkZENzYi5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9mbG93cy9hdHRhY2hGaWxlLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvbGlicmFyaWVzL2Zsb3dzL2NyZWF0ZUNzYi5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9mbG93cy9leHRyYWN0RmlsZS5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9mbG93cy9pbmRleC5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9mbG93cy9saXN0Q1NCcy5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9mbG93cy9yZWNlaXZlLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvbGlicmFyaWVzL2Zsb3dzL3Jlc2V0UGluLmpzIiwibW9kdWxlcy9wc2t3YWxsZXQvbGlicmFyaWVzL2Zsb3dzL3Jlc3RvcmUuanMiLCJtb2R1bGVzL3Bza3dhbGxldC9saWJyYXJpZXMvZmxvd3Mvc2F2ZUJhY2t1cC5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2xpYnJhcmllcy9mbG93cy9zZXRQaW4uanMiLCJtb2R1bGVzL3Bza3dhbGxldC91dGlscy9Bc3luY0Rpc3BhdGNoZXIuanMiLCJtb2R1bGVzL3Bza3dhbGxldC91dGlscy9Ec2VlZENhZ2UuanMiLCJtb2R1bGVzL3Bza3dhbGxldC91dGlscy9IYXNoQ2FnZS5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L3V0aWxzL2Zsb3dzVXRpbHMuanMiLCJtb2R1bGVzL3Bza3dhbGxldC91dGlscy91dGlscy5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L3V0aWxzL3ZhbGlkYXRvci5qcyIsIm1vZHVsZXMvc2lnbnNlbnN1cy9saWIvY29uc1V0aWwuanMiLCJtb2R1bGVzL2J1ZmZlci1jcmMzMi9pbmRleC5qcyIsIm1vZHVsZXMvZm9sZGVybXEvaW5kZXguanMiLCJtb2R1bGVzL2ludGVyYWN0L2luZGV4LmpzIiwibW9kdWxlcy9ub2RlLWZkLXNsaWNlci9pbmRleC5qcyIsIm1vZHVsZXMvcHNrLWh0dHAtY2xpZW50L2luZGV4LmpzIiwibW9kdWxlcy9wc2tkYi9pbmRleC5qcyIsIm1vZHVsZXMvcHNrd2FsbGV0L2luZGV4LmpzIiwibW9kdWxlcy9zaWduc2Vuc3VzL2xpYi9pbmRleC5qcyIsIm1vZHVsZXMveWF1emwvaW5kZXguanMiLCJtb2R1bGVzL3lhemwvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzlXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbmFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3hTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTs7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3p5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImdsb2JhbC5wc2tub2RlTG9hZE1vZHVsZXMgPSBmdW5jdGlvbigpeyBcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcInlhemxcIl0gPSByZXF1aXJlKFwieWF6bFwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcInlhdXpsXCJdID0gcmVxdWlyZShcInlhdXpsXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wicHNrd2FsbGV0XCJdID0gcmVxdWlyZShcInBza3dhbGxldFwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcInNpZ25zZW5zdXNcIl0gPSByZXF1aXJlKFwic2lnbnNlbnN1c1wiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImZvbGRlcm1xXCJdID0gcmVxdWlyZShcImZvbGRlcm1xXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wicHNrZGJcIl0gPSByZXF1aXJlKFwicHNrZGJcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJidWZmZXItY3JjMzJcIl0gPSByZXF1aXJlKFwiYnVmZmVyLWNyYzMyXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wibm9kZS1mZC1zbGljZXJcIl0gPSByZXF1aXJlKFwibm9kZS1mZC1zbGljZXJcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJpbnRlcmFjdFwiXSA9IHJlcXVpcmUoXCJpbnRlcmFjdFwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcInBzay1odHRwLWNsaWVudFwiXSA9IHJlcXVpcmUoXCJwc2staHR0cC1jbGllbnRcIik7XG59XG5pZiAoZmFsc2UpIHtcblx0cHNrbm9kZUxvYWRNb2R1bGVzKCk7XG59OyBcbmdsb2JhbC5wc2tub2RlUmVxdWlyZSA9IHJlcXVpcmU7XG5pZiAodHlwZW9mICQkICE9PSBcInVuZGVmaW5lZFwiKSB7ICAgICAgICAgICAgXG4gICAgJCQucmVxdWlyZUJ1bmRsZShcInBza25vZGVcIik7XG59OyIsImNvbnN0IHV0aWxzID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIik7XG5jb25zdCBPd00gPSB1dGlscy5Pd007XG52YXIgYmVlc0hlYWxlciA9IHV0aWxzLmJlZXNIZWFsZXI7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuXG5cbi8vVE9ETzogcHJldmVudCBhIGNsYXNzIG9mIHJhY2UgY29uZGl0aW9uIHR5cGUgb2YgZXJyb3JzIGJ5IHNpZ25hbGluZyB3aXRoIGZpbGVzIG1ldGFkYXRhIHRvIHRoZSB3YXRjaGVyIHdoZW4gaXQgaXMgc2FmZSB0byBjb25zdW1lXG5cbmZ1bmN0aW9uIEZvbGRlck1RKGZvbGRlciwgY2FsbGJhY2sgPSAoKSA9PiB7fSl7XG5cblx0aWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdH1cblxuXHRmb2xkZXIgPSBwYXRoLm5vcm1hbGl6ZShmb2xkZXIpO1xuXG5cdGZzLm1rZGlyKGZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIGZ1bmN0aW9uKGVyciwgcmVzKXtcblx0XHRmcy5leGlzdHMoZm9sZGVyLCBmdW5jdGlvbihleGlzdHMpIHtcblx0XHRcdGlmIChleGlzdHMpIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIGZvbGRlcik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cblx0ZnVuY3Rpb24gbWtGaWxlTmFtZShzd2FybVJhdyl7XG5cdFx0bGV0IG1ldGEgPSBPd00ucHJvdG90eXBlLmdldE1ldGFGcm9tKHN3YXJtUmF3KTtcblx0XHRsZXQgbmFtZSA9IGAke2ZvbGRlcn0ke3BhdGguc2VwfSR7bWV0YS5zd2FybUlkfS4ke21ldGEuc3dhcm1UeXBlTmFtZX1gO1xuXHRcdGNvbnN0IHVuaXF1ZSA9IG1ldGEucGhhc2VJZCB8fCAkJC51aWRHZW5lcmF0b3Iuc2FmZV91dWlkKCk7XG5cblx0XHRuYW1lID0gbmFtZStgLiR7dW5pcXVlfWA7XG5cdFx0cmV0dXJuIHBhdGgubm9ybWFsaXplKG5hbWUpO1xuXHR9XG5cblx0dGhpcy5nZXRIYW5kbGVyID0gZnVuY3Rpb24oKXtcblx0XHRpZihwcm9kdWNlcil7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IG9uZSBjb25zdW1lciBpcyBhbGxvd2VkIVwiKTtcblx0XHR9XG5cdFx0cHJvZHVjZXIgPSB0cnVlO1xuXHRcdHJldHVybiB7XG5cdFx0XHRzZW5kU3dhcm1TZXJpYWxpemF0aW9uOiBmdW5jdGlvbihzZXJpYWxpemF0aW9uLCBjYWxsYmFjayl7XG5cdFx0XHRcdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHdyaXRlRmlsZShta0ZpbGVOYW1lKEpTT04ucGFyc2Uoc2VyaWFsaXphdGlvbikpLCBzZXJpYWxpemF0aW9uLCBjYWxsYmFjayk7XG5cdFx0XHR9LFxuXHRcdFx0YWRkU3RyZWFtIDogZnVuY3Rpb24oc3RyZWFtLCBjYWxsYmFjayl7XG5cdFx0XHRcdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYoIXN0cmVhbSB8fCAhc3RyZWFtLnBpcGUgfHwgdHlwZW9mIHN0cmVhbS5waXBlICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJTb21ldGhpbmcgd3JvbmcgaGFwcGVuZWRcIikpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0bGV0IHN3YXJtID0gXCJcIjtcblx0XHRcdFx0c3RyZWFtLm9uKCdkYXRhJywgKGNodW5rKSA9Pntcblx0XHRcdFx0XHRzd2FybSArPSBjaHVuaztcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0c3RyZWFtLm9uKFwiZW5kXCIsICgpID0+IHtcblx0XHRcdFx0XHR3cml0ZUZpbGUobWtGaWxlTmFtZShKU09OLnBhcnNlKHN3YXJtKSksIHN3YXJtLCBjYWxsYmFjayk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHN0cmVhbS5vbihcImVycm9yXCIsIChlcnIpID0+e1xuXHRcdFx0XHRcdGNhbGxiYWNrKGVycik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdGFkZFN3YXJtIDogZnVuY3Rpb24oc3dhcm0sIGNhbGxiYWNrKXtcblx0XHRcdFx0aWYoIWNhbGxiYWNrKXtcblx0XHRcdFx0XHRjYWxsYmFjayA9ICQkLmRlZmF1bHRFcnJvckhhbmRsaW5nSW1wbGVtZW50YXRpb247XG5cdFx0XHRcdH1lbHNlIGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YmVlc0hlYWxlci5hc0pTT04oc3dhcm0sbnVsbCwgbnVsbCwgZnVuY3Rpb24oZXJyLCByZXMpe1xuXHRcdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHdyaXRlRmlsZShta0ZpbGVOYW1lKHJlcyksIEoocmVzKSwgY2FsbGJhY2spO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHRzZW5kU3dhcm1Gb3JFeGVjdXRpb246IGZ1bmN0aW9uKHN3YXJtLCBjYWxsYmFjayl7XG5cdFx0XHRcdGlmKCFjYWxsYmFjayl7XG5cdFx0XHRcdFx0Y2FsbGJhY2sgPSAkJC5kZWZhdWx0RXJyb3JIYW5kbGluZ0ltcGxlbWVudGF0aW9uO1xuXHRcdFx0XHR9ZWxzZSBpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJlZXNIZWFsZXIuYXNKU09OKHN3YXJtLCBPd00ucHJvdG90eXBlLmdldE1ldGFGcm9tKHN3YXJtLCBcInBoYXNlTmFtZVwiKSwgT3dNLnByb3RvdHlwZS5nZXRNZXRhRnJvbShzd2FybSwgXCJhcmdzXCIpLCBmdW5jdGlvbihlcnIsIHJlcyl7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dmFyIGZpbGUgPSBta0ZpbGVOYW1lKHJlcyk7XG5cdFx0XHRcdFx0dmFyIGNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShyZXMpO1xuXG5cdFx0XHRcdFx0Ly9pZiB0aGVyZSBhcmUgbm8gbW9yZSBGRCdzIGZvciBmaWxlcyB0byBiZSB3cml0dGVuIHdlIHJldHJ5LlxuXHRcdFx0XHRcdGZ1bmN0aW9uIHdyYXBwZXIoZXJyb3IsIHJlc3VsdCl7XG5cdFx0XHRcdFx0XHRpZihlcnJvcil7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGBDYXVnaHQgYW4gd3JpdGUgZXJyb3IuIFJldHJ5IHRvIHdyaXRlIGZpbGUgWyR7ZmlsZX1dYCk7XG5cdFx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdFx0XHRcdFx0XHR3cml0ZUZpbGUoZmlsZSwgY29udGVudCwgd3JhcHBlcik7XG5cdFx0XHRcdFx0XHRcdH0sIDEwKTtcblx0XHRcdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyb3IsIHJlc3VsdCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0d3JpdGVGaWxlKGZpbGUsIGNvbnRlbnQsIHdyYXBwZXIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9O1xuXHR9O1xuXG5cdHZhciByZWNpcGllbnQ7XG5cdHRoaXMuc2V0SVBDQ2hhbm5lbCA9IGZ1bmN0aW9uKHByb2Nlc3NDaGFubmVsKXtcblx0XHRpZihwcm9jZXNzQ2hhbm5lbCAmJiAhcHJvY2Vzc0NoYW5uZWwuc2VuZCB8fCAodHlwZW9mIHByb2Nlc3NDaGFubmVsLnNlbmQpICE9IFwiZnVuY3Rpb25cIil7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJSZWNpcGllbnQgaXMgbm90IGluc3RhbmNlIG9mIHByb2Nlc3MvY2hpbGRfcHJvY2VzcyBvciBpdCB3YXMgbm90IHNwYXduZWQgd2l0aCBJUEMgY2hhbm5lbCFcIik7XG5cdFx0fVxuXHRcdHJlY2lwaWVudCA9IHByb2Nlc3NDaGFubmVsO1xuXHRcdGlmKGNvbnN1bWVyKXtcblx0XHRcdGNvbnNvbGUubG9nKGBDaGFubmVsIHVwZGF0ZWRgKTtcblx0XHRcdChyZWNpcGllbnQgfHwgcHJvY2Vzcykub24oXCJtZXNzYWdlXCIsIHJlY2VpdmVFbnZlbG9wZSk7XG5cdFx0fVxuXHR9O1xuXG5cblx0dmFyIGNvbnN1bWVkTWVzc2FnZXMgPSB7fTtcblxuXHRmdW5jdGlvbiBjaGVja0lmQ29uc3VtbWVkKG5hbWUsIG1lc3NhZ2Upe1xuXHRcdGNvbnN0IHNob3J0TmFtZSA9IHBhdGguYmFzZW5hbWUobmFtZSk7XG5cdFx0Y29uc3QgcHJldmlvdXNTYXZlZCA9IGNvbnN1bWVkTWVzc2FnZXNbc2hvcnROYW1lXTtcblx0XHRsZXQgcmVzdWx0ID0gZmFsc2U7XG5cdFx0aWYocHJldmlvdXNTYXZlZCAmJiAhcHJldmlvdXNTYXZlZC5sb2NhbGVDb21wYXJlKG1lc3NhZ2UpKXtcblx0XHRcdHJlc3VsdCA9IHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBzYXZlMkhpc3RvcnkoZW52ZWxvcGUpe1xuXHRcdGNvbnN1bWVkTWVzc2FnZXNbcGF0aC5iYXNlbmFtZShlbnZlbG9wZS5uYW1lKV0gPSBlbnZlbG9wZS5tZXNzYWdlO1xuXHR9XG5cblx0ZnVuY3Rpb24gYnVpbGRFbnZlbG9wZUNvbmZpcm1hdGlvbihlbnZlbG9wZSwgc2F2ZUhpc3Rvcnkpe1xuXHRcdGlmKHNhdmVIaXN0b3J5KXtcblx0XHRcdHNhdmUySGlzdG9yeShlbnZlbG9wZSk7XG5cdFx0fVxuXHRcdHJldHVybiBgQ29uZmlybSBlbnZlbG9wZSAke2VudmVsb3BlLnRpbWVzdGFtcH0gc2VudCB0byAke2VudmVsb3BlLmRlc3R9YDtcblx0fVxuXG5cdGZ1bmN0aW9uIGJ1aWxkRW52ZWxvcGUobmFtZSwgbWVzc2FnZSl7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGRlc3Q6IGZvbGRlcixcblx0XHRcdHNyYzogcHJvY2Vzcy5waWQsXG5cdFx0XHR0aW1lc3RhbXA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZSxcblx0XHRcdG5hbWU6IG5hbWVcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gcmVjZWl2ZUVudmVsb3BlKGVudmVsb3BlKXtcblx0XHRpZighZW52ZWxvcGUgfHwgdHlwZW9mIGVudmVsb3BlICE9PSBcIm9iamVjdFwiKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Ly9jb25zb2xlLmxvZyhcInJlY2VpdmVkIGVudmVsb3BlXCIsIGVudmVsb3BlLCBmb2xkZXIpO1xuXG5cdFx0aWYoZW52ZWxvcGUuZGVzdCAhPT0gZm9sZGVyICYmIGZvbGRlci5pbmRleE9mKGVudmVsb3BlLmRlc3QpIT09IC0xICYmIGZvbGRlci5sZW5ndGggPT09IGVudmVsb3BlLmRlc3QrMSl7XG5cdFx0XHRjb25zb2xlLmxvZyhcIlRoaXMgZW52ZWxvcGUgaXMgbm90IGZvciBtZSFcIik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0bGV0IG1lc3NhZ2UgPSBlbnZlbG9wZS5tZXNzYWdlO1xuXG5cdFx0aWYoY2FsbGJhY2spe1xuXHRcdFx0Ly9jb25zb2xlLmxvZyhcIlNlbmRpbmcgY29uZmlybWF0aW9uXCIsIHByb2Nlc3MucGlkKTtcblx0XHRcdHJlY2lwaWVudC5zZW5kKGJ1aWxkRW52ZWxvcGVDb25maXJtYXRpb24oZW52ZWxvcGUsIHRydWUpKTtcblx0XHRcdGNvbnN1bWVyKG51bGwsIEpTT04ucGFyc2UobWVzc2FnZSkpO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMucmVnaXN0ZXJBc0lQQ0NvbnN1bWVyID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuXHRcdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlRoZSBhcmd1bWVudCBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHR9XG5cdFx0cmVnaXN0ZXJlZEFzSVBDQ29uc3VtZXIgPSB0cnVlO1xuXHRcdC8vd2lsbCByZWdpc3RlciBhcyBub3JtYWwgY29uc3VtZXIgaW4gb3JkZXIgdG8gY29uc3VtZSBhbGwgZXhpc3RpbmcgbWVzc2FnZXMgYnV0IHdpdGhvdXQgc2V0dGluZyB0aGUgd2F0Y2hlclxuXHRcdHRoaXMucmVnaXN0ZXJDb25zdW1lcihjYWxsYmFjaywgdHJ1ZSwgKHdhdGNoZXIpID0+ICF3YXRjaGVyKTtcblxuXHRcdC8vY29uc29sZS5sb2coXCJSZWdpc3RlcmVkIGFzIElQQyBDb25zdW1tZXJcIiwgKTtcblx0XHQocmVjaXBpZW50IHx8IHByb2Nlc3MpLm9uKFwibWVzc2FnZVwiLCByZWNlaXZlRW52ZWxvcGUpO1xuXHR9O1xuXG5cdHRoaXMucmVnaXN0ZXJDb25zdW1lciA9IGZ1bmN0aW9uIChjYWxsYmFjaywgc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkID0gdHJ1ZSwgc2hvdWxkV2FpdEZvck1vcmUgPSAod2F0Y2hlcikgPT4gdHJ1ZSkge1xuXHRcdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkZpcnN0IHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHR9XG5cdFx0aWYgKGNvbnN1bWVyKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IG9uZSBjb25zdW1lciBpcyBhbGxvd2VkISBcIiArIGZvbGRlcik7XG5cdFx0fVxuXG5cdFx0Y29uc3VtZXIgPSBjYWxsYmFjaztcblxuXHRcdGZzLm1rZGlyKGZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIGZ1bmN0aW9uIChlcnIsIHJlcykge1xuXHRcdFx0aWYgKGVyciAmJiAoZXJyLmNvZGUgIT09ICdFRVhJU1QnKSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3VtZUFsbEV4aXN0aW5nKHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgc2hvdWxkV2FpdEZvck1vcmUpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMud3JpdGVNZXNzYWdlID0gd3JpdGVGaWxlO1xuXG5cdHRoaXMudW5saW5rQ29udGVudCA9IGZ1bmN0aW9uIChtZXNzYWdlSWQsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgbWVzc2FnZVBhdGggPSBwYXRoLmpvaW4oZm9sZGVyLCBtZXNzYWdlSWQpO1xuXG5cdFx0ZnMudW5saW5rKG1lc3NhZ2VQYXRoLCAoZXJyKSA9PiB7XG5cdFx0XHRjYWxsYmFjayhlcnIpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMuZGlzcG9zZSA9IGZ1bmN0aW9uKGZvcmNlKXtcblx0XHRpZih0eXBlb2YgZm9sZGVyICE9IFwidW5kZWZpbmVkXCIpe1xuXHRcdFx0dmFyIGZpbGVzO1xuXHRcdFx0dHJ5e1xuXHRcdFx0XHRmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKGZvbGRlcik7XG5cdFx0XHR9Y2F0Y2goZXJyb3Ipe1xuXHRcdFx0XHQvLy4uXG5cdFx0XHR9XG5cblx0XHRcdGlmKGZpbGVzICYmIGZpbGVzLmxlbmd0aCA+IDAgJiYgIWZvcmNlKXtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJEaXNwb3NpbmcgYSBjaGFubmVsIHRoYXQgc3RpbGwgaGFzIG1lc3NhZ2VzISBEaXIgd2lsbCBub3QgYmUgcmVtb3ZlZCFcIik7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR0cnl7XG5cdFx0XHRcdFx0ZnMucm1kaXJTeW5jKGZvbGRlcik7XG5cdFx0XHRcdH1jYXRjaChlcnIpe1xuXHRcdFx0XHRcdC8vLi5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRmb2xkZXIgPSBudWxsO1xuXHRcdH1cblxuXHRcdGlmKHByb2R1Y2VyKXtcblx0XHRcdC8vbm8gbmVlZCB0byBkbyBhbnl0aGluZyBlbHNlXG5cdFx0fVxuXG5cdFx0aWYodHlwZW9mIGNvbnN1bWVyICE9IFwidW5kZWZpbmVkXCIpe1xuXHRcdFx0Y29uc3VtZXIgPSAoKSA9PiB7fTtcblx0XHR9XG5cblx0XHRpZih3YXRjaGVyKXtcblx0XHRcdHdhdGNoZXIuY2xvc2UoKTtcblx0XHRcdHdhdGNoZXIgPSBudWxsO1xuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xuXG5cblx0LyogLS0tLS0tLS0tLS0tLS0tLSBwcm90ZWN0ZWQgIGZ1bmN0aW9ucyAqL1xuXHR2YXIgY29uc3VtZXIgPSBudWxsO1xuXHR2YXIgcmVnaXN0ZXJlZEFzSVBDQ29uc3VtZXIgPSBmYWxzZTtcblx0dmFyIHByb2R1Y2VyID0gbnVsbDtcblxuXHRmdW5jdGlvbiBidWlsZFBhdGhGb3JGaWxlKGZpbGVuYW1lKXtcblx0XHRyZXR1cm4gcGF0aC5ub3JtYWxpemUocGF0aC5qb2luKGZvbGRlciwgZmlsZW5hbWUpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNvbnN1bWVNZXNzYWdlKGZpbGVuYW1lLCBzaG91bGREZWxldGVBZnRlclJlYWQsIGNhbGxiYWNrKSB7XG5cdFx0dmFyIGZ1bGxQYXRoID0gYnVpbGRQYXRoRm9yRmlsZShmaWxlbmFtZSk7XG5cblx0XHRmcy5yZWFkRmlsZShmdWxsUGF0aCwgXCJ1dGY4XCIsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcblx0XHRcdGlmICghZXJyKSB7XG5cdFx0XHRcdGlmIChkYXRhICE9PSBcIlwiKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdHZhciBtZXNzYWdlID0gSlNPTi5wYXJzZShkYXRhKTtcblx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJQYXJzaW5nIGVycm9yXCIsIGVycm9yKTtcblx0XHRcdFx0XHRcdGVyciA9IGVycm9yO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmKGNoZWNrSWZDb25zdW1tZWQoZnVsbFBhdGgsIGRhdGEpKXtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coYG1lc3NhZ2UgYWxyZWFkeSBjb25zdW1lZCBbJHtmaWxlbmFtZX1dYCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChzaG91bGREZWxldGVBZnRlclJlYWQpIHtcblxuXHRcdFx0XHRcdFx0ZnMudW5saW5rKGZ1bGxQYXRoLCBmdW5jdGlvbiAoZXJyLCByZXMpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGVycikge3Rocm93IGVycjt9O1xuXHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVyciwgbWVzc2FnZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ29uc3VtZSBlcnJvclwiLCBlcnIpO1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNvbnN1bWVBbGxFeGlzdGluZyhzaG91bGREZWxldGVBZnRlclJlYWQsIHNob3VsZFdhaXRGb3JNb3JlKSB7XG5cblx0XHRsZXQgY3VycmVudEZpbGVzID0gW107XG5cblx0XHRmcy5yZWFkZGlyKGZvbGRlciwgJ3V0ZjgnLCBmdW5jdGlvbiAoZXJyLCBmaWxlcykge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHQkJC5lcnJvckhhbmRsZXIuZXJyb3IoZXJyKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y3VycmVudEZpbGVzID0gZmlsZXM7XG5cdFx0XHRpdGVyYXRlQW5kQ29uc3VtZShmaWxlcyk7XG5cblx0XHR9KTtcblxuXHRcdGZ1bmN0aW9uIHN0YXJ0V2F0Y2hpbmcoKXtcblx0XHRcdGlmIChzaG91bGRXYWl0Rm9yTW9yZSh0cnVlKSkge1xuXHRcdFx0XHR3YXRjaEZvbGRlcihzaG91bGREZWxldGVBZnRlclJlYWQsIHNob3VsZFdhaXRGb3JNb3JlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpdGVyYXRlQW5kQ29uc3VtZShmaWxlcywgY3VycmVudEluZGV4ID0gMCkge1xuXHRcdFx0aWYgKGN1cnJlbnRJbmRleCA9PT0gZmlsZXMubGVuZ3RoKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coXCJzdGFydCB3YXRjaGluZ1wiLCBuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XG5cdFx0XHRcdHN0YXJ0V2F0Y2hpbmcoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocGF0aC5leHRuYW1lKGZpbGVzW2N1cnJlbnRJbmRleF0pICE9PSBpbl9wcm9ncmVzcykge1xuXHRcdFx0XHRjb25zdW1lTWVzc2FnZShmaWxlc1tjdXJyZW50SW5kZXhdLCBzaG91bGREZWxldGVBZnRlclJlYWQsIChlcnIsIGRhdGEpID0+IHtcblx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHRpdGVyYXRlQW5kQ29uc3VtZShmaWxlcywgKytjdXJyZW50SW5kZXgpO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjb25zdW1lcihudWxsLCBkYXRhLCBwYXRoLmJhc2VuYW1lKGZpbGVzW2N1cnJlbnRJbmRleF0pKTtcblx0XHRcdFx0XHRpZiAoc2hvdWxkV2FpdEZvck1vcmUoKSkge1xuXHRcdFx0XHRcdFx0aXRlcmF0ZUFuZENvbnN1bWUoZmlsZXMsICsrY3VycmVudEluZGV4KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aXRlcmF0ZUFuZENvbnN1bWUoZmlsZXMsICsrY3VycmVudEluZGV4KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiB3cml0ZUZpbGUoZmlsZW5hbWUsIGNvbnRlbnQsIGNhbGxiYWNrKXtcblx0XHRpZihyZWNpcGllbnQpe1xuXHRcdFx0dmFyIGVudmVsb3BlID0gYnVpbGRFbnZlbG9wZShmaWxlbmFtZSwgY29udGVudCk7XG5cdFx0XHQvL2NvbnNvbGUubG9nKFwiU2VuZGluZyB0b1wiLCByZWNpcGllbnQucGlkLCByZWNpcGllbnQucHBpZCwgXCJlbnZlbG9wZVwiLCBlbnZlbG9wZSk7XG5cdFx0XHRyZWNpcGllbnQuc2VuZChlbnZlbG9wZSk7XG5cdFx0XHR2YXIgY29uZmlybWF0aW9uUmVjZWl2ZWQgPSBmYWxzZTtcblxuXHRcdFx0ZnVuY3Rpb24gcmVjZWl2ZUNvbmZpcm1hdGlvbihtZXNzYWdlKXtcblx0XHRcdFx0aWYobWVzc2FnZSA9PT0gYnVpbGRFbnZlbG9wZUNvbmZpcm1hdGlvbihlbnZlbG9wZSkpe1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coXCJSZWNlaXZlZCBjb25maXJtYXRpb25cIiwgcmVjaXBpZW50LnBpZCk7XG5cdFx0XHRcdFx0Y29uZmlybWF0aW9uUmVjZWl2ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRcdHJlY2lwaWVudC5vZmYoXCJtZXNzYWdlXCIsIHJlY2VpdmVDb25maXJtYXRpb24pO1xuXHRcdFx0XHRcdH1jYXRjaChlcnIpe1xuXHRcdFx0XHRcdFx0Ly8uLi5cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZWNpcGllbnQub24oXCJtZXNzYWdlXCIsIHJlY2VpdmVDb25maXJtYXRpb24pO1xuXG5cdFx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHRcdGlmKCFjb25maXJtYXRpb25SZWNlaXZlZCl7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhcIk5vIGNvbmZpcm1hdGlvbi4uLlwiLCBwcm9jZXNzLnBpZCk7XG5cdFx0XHRcdFx0aGlkZGVuX3dyaXRlRmlsZShmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spO1xuXHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHRpZihjYWxsYmFjayl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgY29udGVudCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LCAyMDApO1xuXHRcdH1lbHNle1xuXHRcdFx0aGlkZGVuX3dyaXRlRmlsZShmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spO1xuXHRcdH1cblx0fVxuXG5cdGNvbnN0IGluX3Byb2dyZXNzID0gXCIuaW5fcHJvZ3Jlc3NcIjtcblx0ZnVuY3Rpb24gaGlkZGVuX3dyaXRlRmlsZShmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spe1xuXHRcdHZhciB0bXBGaWxlbmFtZSA9IGZpbGVuYW1lK2luX3Byb2dyZXNzO1xuXHRcdHRyeXtcblx0XHRcdGlmKGZzLmV4aXN0c1N5bmModG1wRmlsZW5hbWUpIHx8IGZzLmV4aXN0c1N5bmMoZmlsZW5hbWUpKXtcblx0XHRcdFx0Y29uc29sZS5sb2cobmV3IEVycm9yKGBPdmVyd3JpdGluZyBmaWxlICR7ZmlsZW5hbWV9YCkpO1xuXHRcdFx0fVxuXHRcdFx0ZnMud3JpdGVGaWxlU3luYyh0bXBGaWxlbmFtZSwgY29udGVudCk7XG5cdFx0XHRmcy5yZW5hbWVTeW5jKHRtcEZpbGVuYW1lLCBmaWxlbmFtZSk7XG5cdFx0fWNhdGNoKGVycil7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHR9XG5cdFx0Y2FsbGJhY2sobnVsbCwgY29udGVudCk7XG5cdH1cblxuXHR2YXIgYWxyZWFkeUtub3duQ2hhbmdlcyA9IHt9O1xuXG5cdGZ1bmN0aW9uIGFscmVhZHlGaXJlZENoYW5nZXMoZmlsZW5hbWUsIGNoYW5nZSl7XG5cdFx0dmFyIHJlcyA9IGZhbHNlO1xuXHRcdGlmKGFscmVhZHlLbm93bkNoYW5nZXNbZmlsZW5hbWVdKXtcblx0XHRcdHJlcyA9IHRydWU7XG5cdFx0fWVsc2V7XG5cdFx0XHRhbHJlYWR5S25vd25DaGFuZ2VzW2ZpbGVuYW1lXSA9IGNoYW5nZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzO1xuXHR9XG5cblx0ZnVuY3Rpb24gd2F0Y2hGb2xkZXIoc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCBzaG91bGRXYWl0Rm9yTW9yZSl7XG5cblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRmcy5yZWFkZGlyKGZvbGRlciwgJ3V0ZjgnLCBmdW5jdGlvbiAoZXJyLCBmaWxlcykge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0JCQuZXJyb3JIYW5kbGVyLmVycm9yKGVycik7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yKHZhciBpPTA7IGk8ZmlsZXMubGVuZ3RoOyBpKyspe1xuXHRcdFx0XHRcdHdhdGNoRmlsZXNIYW5kbGVyKFwiY2hhbmdlXCIsIGZpbGVzW2ldKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgMTAwMCk7XG5cblx0XHRmdW5jdGlvbiB3YXRjaEZpbGVzSGFuZGxlcihldmVudFR5cGUsIGZpbGVuYW1lKXtcblx0XHRcdC8vY29uc29sZS5sb2coYEdvdCAke2V2ZW50VHlwZX0gb24gJHtmaWxlbmFtZX1gKTtcblxuXHRcdFx0aWYoIWZpbGVuYW1lIHx8IHBhdGguZXh0bmFtZShmaWxlbmFtZSkgPT09IGluX3Byb2dyZXNzKXtcblx0XHRcdFx0Ly9jYXVnaHQgYSBkZWxldGUgZXZlbnQgb2YgYSBmaWxlXG5cdFx0XHRcdC8vb3Jcblx0XHRcdFx0Ly9maWxlIG5vdCByZWFkeSB0byBiZSBjb25zdW1lZCAoaW4gcHJvZ3Jlc3MpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGYgPSBidWlsZFBhdGhGb3JGaWxlKGZpbGVuYW1lKTtcblx0XHRcdGlmKCFmcy5leGlzdHNTeW5jKGYpKXtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZyhcIkZpbGUgbm90IGZvdW5kXCIsIGYpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vY29uc29sZS5sb2coYFByZXBhcmluZyB0byBjb25zdW1lICR7ZmlsZW5hbWV9YCk7XG5cdFx0XHRpZighYWxyZWFkeUZpcmVkQ2hhbmdlcyhmaWxlbmFtZSwgZXZlbnRUeXBlKSl7XG5cdFx0XHRcdGNvbnN1bWVNZXNzYWdlKGZpbGVuYW1lLCBzaG91bGREZWxldGVBZnRlclJlYWQsIChlcnIsIGRhdGEpID0+IHtcblx0XHRcdFx0XHQvL2FsbG93IGEgcmVhZCBhIHRoZSBmaWxlXG5cdFx0XHRcdFx0YWxyZWFkeUtub3duQ2hhbmdlc1tmaWxlbmFtZV0gPSB1bmRlZmluZWQ7XG5cblx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHQvLyA/P1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJcXG5DYXVnaHQgYW4gZXJyb3JcIiwgZXJyKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zdW1lcihudWxsLCBkYXRhLCBmaWxlbmFtZSk7XG5cblxuXHRcdFx0XHRcdGlmICghc2hvdWxkV2FpdEZvck1vcmUoKSkge1xuXHRcdFx0XHRcdFx0d2F0Y2hlci5jbG9zZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJTb21ldGhpbmcgaGFwcGVucy4uLlwiLCBmaWxlbmFtZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0XHRjb25zdCB3YXRjaGVyID0gZnMud2F0Y2goZm9sZGVyLCB3YXRjaEZpbGVzSGFuZGxlcik7XG5cblx0XHRjb25zdCBpbnRlcnZhbFRpbWVyID0gc2V0SW50ZXJ2YWwoKCk9Pntcblx0XHRcdGZzLnJlYWRkaXIoZm9sZGVyLCAndXRmOCcsIGZ1bmN0aW9uIChlcnIsIGZpbGVzKSB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHQkJC5lcnJvckhhbmRsZXIuZXJyb3IoZXJyKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZihmaWxlcy5sZW5ndGggPiAwKXtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhgXFxuXFxuRm91bmQgJHtmaWxlcy5sZW5ndGh9IGZpbGVzIG5vdCBjb25zdW1lZCB5ZXQgaW4gJHtmb2xkZXJ9YCwgbmV3IERhdGUoKS5nZXRUaW1lKCksXCJcXG5cXG5cIik7XG5cdFx0XHRcdFx0Ly9mYWtpbmcgYSByZW5hbWUgZXZlbnQgdHJpZ2dlclxuXHRcdFx0XHRcdHdhdGNoRmlsZXNIYW5kbGVyKFwicmVuYW1lXCIsIGZpbGVzWzBdKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgNTAwMCk7XG5cdH1cbn1cblxuZXhwb3J0cy5nZXRGb2xkZXJRdWV1ZSA9IGZ1bmN0aW9uKGZvbGRlciwgY2FsbGJhY2spe1xuXHRyZXR1cm4gbmV3IEZvbGRlck1RKGZvbGRlciwgY2FsbGJhY2spO1xufTtcbiIsImZ1bmN0aW9uIE1lbW9yeU1RSW50ZXJhY3Rpb25TcGFjZSgpIHtcbiAgICB2YXIgc3dhcm1JbnRlcmFjdCA9IHJlcXVpcmUoXCIuLy4uL3N3YXJtSW50ZXJhY3Rpb25cIik7XG4gICAgdmFyIHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVycyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gZGlzcGF0Y2hpbmdTd2FybXMoc3dhcm0pe1xuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBzdWJzTGlzdCA9IHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybS5tZXRhLnN3YXJtSWRdO1xuICAgICAgICAgICAgaWYoc3Vic0xpc3Qpe1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpPHN1YnNMaXN0Lmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBzdWJzTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcihudWxsLCBzd2FybSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCAxKTtcbiAgICB9XG5cbiAgICB2YXIgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICBmdW5jdGlvbiBpbml0KCl7XG5cdFx0aWYoIWluaXRpYWxpemVkKXtcblx0XHRcdGluaXRpYWxpemVkID0gdHJ1ZTtcblx0XHRcdCQkLlBTS19QdWJTdWIuc3Vic2NyaWJlKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBkaXNwYXRjaGluZ1N3YXJtcyk7XG5cdFx0fVxuICAgIH1cblxuICAgIHZhciBjb21tID0ge1xuICAgICAgICBzdGFydFN3YXJtOiBmdW5jdGlvbiAoc3dhcm1OYW1lLCBjdG9yLCBhcmdzKSB7XG5cdFx0XHRpbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gJCQuc3dhcm0uc3RhcnQoc3dhcm1OYW1lLCBjdG9yLCAuLi5hcmdzKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29udGludWVTd2FybTogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgc3dhcm1TZXJpYWxpc2F0aW9uLCBjdG9yLCBhcmdzKSB7XG5cdFx0XHRpbml0KCk7XG4gICAgICAgICAgICBzd2FybUhhbmRsZXJbY3Rvcl0uYXBwbHkoc3dhcm1IYW5kbGVyLCBhcmdzKTtcbiAgICAgICAgfSxcbiAgICAgICAgb246IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIGNhbGxiYWNrKSB7XG5cdFx0XHRpbml0KCk7XG4gICAgICAgICAgICBpZighc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXSl7XG5cdFx0XHRcdHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybUhhbmRsZXIuZ2V0SW5uZXJWYWx1ZSgpLm1ldGEuc3dhcm1JZF0gPSBbIGNhbGxiYWNrIF07XG4gICAgICAgICAgICB9ZWxzZXtcblx0XHRcdFx0c3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb2ZmOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyKSB7XG5cdFx0XHRpZihzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm1IYW5kbGVyLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtSWRdKXtcblx0XHRcdFx0c3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBzd2FybUludGVyYWN0Lm5ld0ludGVyYWN0aW9uU3BhY2UoY29tbSk7XG5cbn1cblxudmFyIHNwYWNlO1xubW9kdWxlLmV4cG9ydHMuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZighc3BhY2Upe1xuICAgICAgICBzcGFjZSA9IG5ldyBNZW1vcnlNUUludGVyYWN0aW9uU3BhY2UoKTtcbiAgICB9ZWxzZXtcbiAgICAgICAgY29uc29sZS5sb2coXCJNZW1vcnlNUUludGVyYWN0aW9uU3BhY2UgYWxyZWFkeSBjcmVhdGVkISBVc2luZyBzYW1lIGluc3RhbmNlLlwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHNwYWNlO1xufTsiLCJmdW5jdGlvbiBXaW5kb3dNUUludGVyYWN0aW9uU3BhY2UoY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3csIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsKXtcbiAgICB2YXIgc3dhcm1JbnRlcmFjdCA9IHJlcXVpcmUoXCIuLy4uL3N3YXJtSW50ZXJhY3Rpb25cIik7XG4gICAgdmFyIGNoaWxkTWVzc2FnZU1RID0gcmVxdWlyZShcIi4vc3BlY2lmaWNNUUltcGwvQ2hpbGRXZWJWaWV3TVFcIikuY3JlYXRlTVEoY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3csIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsKTtcbiAgICB2YXIgc3dhcm1JbnN0YW5jZXMgPSB7fTtcblxuICAgIHZhciBjb21tID0ge1xuICAgICAgICBzdGFydFN3YXJtOiBmdW5jdGlvbiAoc3dhcm1OYW1lLCBjdG9yLCBhcmdzKSB7XG4gICAgICAgICAgICB2YXIgc3dhcm0gPSB7bWV0YTp7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtVHlwZU5hbWU6c3dhcm1OYW1lLFxuICAgICAgICAgICAgICAgICAgICBjdG9yOmN0b3IsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6YXJnc1xuICAgICAgICAgICAgICAgIH19O1xuICAgICAgICAgICAgY2hpbGRNZXNzYWdlTVEucHJvZHVjZShzd2FybSk7XG4gICAgICAgICAgICByZXR1cm4gc3dhcm07XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRpbnVlU3dhcm06IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIHN3YXJtU2VyaWFsaXNhdGlvbiwgcGhhc2VOYW1lLCBhcmdzKSB7XG5cbiAgICAgICAgICAgIHZhciBuZXdTZXJpYWxpemF0aW9uID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzd2FybVNlcmlhbGlzYXRpb24pKTtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS5jdG9yID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgbmV3U2VyaWFsaXphdGlvbi5tZXRhLnBoYXNlTmFtZSA9IHBoYXNlTmFtZTtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS50YXJnZXQgPSBcImlmcmFtZVwiO1xuICAgICAgICAgICAgbmV3U2VyaWFsaXphdGlvbi5tZXRhLmFyZ3MgPSBhcmdzO1xuICAgICAgICAgICAgY2hpbGRNZXNzYWdlTVEucHJvZHVjZShuZXdTZXJpYWxpemF0aW9uKTtcbiAgICAgICAgfSxcbiAgICAgICAgb246IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjaGlsZE1lc3NhZ2VNUS5yZWdpc3RlckNvbnN1bWVyKGNhbGxiYWNrKTtcbiAgICAgICAgfSxcbiAgICAgICAgb2ZmOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyKSB7XG5cbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIHZhciBzcGFjZSA9IHN3YXJtSW50ZXJhY3QubmV3SW50ZXJhY3Rpb25TcGFjZShjb21tKTtcbiAgICB0aGlzLnN0YXJ0U3dhcm0gPSBmdW5jdGlvbiAobmFtZSwgY3RvciwgLi4uYXJncykge1xuICAgICAgICByZXR1cm4gc3BhY2Uuc3RhcnRTd2FybShuYW1lLCBjdG9yLCAuLi5hcmdzKTtcbiAgICB9O1xuXG4gICAgdGhpcy5pbml0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGNoaWxkTWVzc2FnZU1RLnJlZ2lzdGVyQ29uc3VtZXIoZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgc3dhcm07XG4gICAgICAgICAgICAgICAgaWYoZGF0YSAmJiBkYXRhLm1ldGEgJiYgZGF0YS5tZXRhLnN3YXJtSWQgJiYgc3dhcm1JbnN0YW5jZXNbZGF0YS5tZXRhLnN3YXJtSWRdKXtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm0gPSBzd2FybUluc3RhbmNlc1tkYXRhLm1ldGEuc3dhcm1JZF07XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtLnVwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm1bZGF0YS5tZXRhLnBoYXNlTmFtZV0uYXBwbHkoc3dhcm0sIGRhdGEubWV0YS5hcmdzKTtcbiAgICAgICAgICAgICAgICB9ZWxzZXtcblxuICAgICAgICAgICAgICAgICAgICBzd2FybSA9ICQkLnN3YXJtLnN0YXJ0KGRhdGEubWV0YS5zd2FybVR5cGVOYW1lLCBkYXRhLm1ldGEuY3RvciwgLi4uZGF0YS5tZXRhLmFyZ3MpO1xuXG4gICAgICAgICAgICAgICAgICAgIHN3YXJtSW5zdGFuY2VzW3N3YXJtLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtSWRdID0gc3dhcm07XG5cbiAgICAgICAgICAgICAgICAgICAgc3dhcm0ub25SZXR1cm4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN3YXJtIGlzIGZpbmlzaGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IHJlYWR5RXZ0ID0ge3dlYlZpZXdJc1JlYWR5OiB0cnVlfTtcbiAgICAgICAgcGFyZW50LnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHJlYWR5RXZ0KSwgXCIqXCIpO1xuXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZXIobWVzc2FnZSl7XG4gICAgICAgIGxvZyhcInNlbmRpbmcgc3dhcm0gXCIsIG1lc3NhZ2UpO1xuICAgICAgICBjaGlsZE1lc3NhZ2VNUS5wcm9kdWNlKG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlckludGVyYWN0aW9ucyhtZXNzYWdlKXtcbiAgICAgICAgbG9nKFwiY2hlY2tpbmcgaWYgbWVzc2FnZSBpcyAnaW50ZXJhY3Rpb24nIFwiLCBtZXNzYWdlKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UgJiYgbWVzc2FnZS5tZXRhICYmIG1lc3NhZ2UubWV0YS50YXJnZXQgJiYgbWVzc2FnZS5tZXRhLnRhcmdldCA9PT0gXCJpbnRlcmFjdGlvblwiO1xuICAgIH1cbiAgICAvL1RPRE8gZml4IHRoaXMgZm9yIG5hdGl2ZVdlYlZpZXdcblxuICAgICQkLlBTS19QdWJTdWIuc3Vic2NyaWJlKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBoYW5kbGVyLCBmdW5jdGlvbigpe3JldHVybiB0cnVlO30sIGZpbHRlckludGVyYWN0aW9ucyk7XG5cbiAgICBsb2coXCJyZWdpc3RlcmluZyBsaXN0ZW5lciBmb3IgaGFuZGxpbmcgaW50ZXJhY3Rpb25zXCIpO1xuXG4gICAgZnVuY3Rpb24gbG9nKC4uLmFyZ3Mpe1xuICAgICAgICBhcmdzLnVuc2hpZnQoXCJbV2luZG93TVFJbnRlcmFjdGlvblNwYWNlXCIrKHdpbmRvdy5mcmFtZUVsZW1lbnQgPyBcIipcIjogXCJcIikrXCJdXCIgKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UgPSBmdW5jdGlvbihjaGFubmVsTmFtZSwgY29tbXVuaWNhdGlvbldpbmRvdywgc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwpe1xuICAgIHJldHVybiBuZXcgV2luZG93TVFJbnRlcmFjdGlvblNwYWNlKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93LCBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCk7XG59OyIsIi8qVE9ET1xuRm9yIHRoZSBtb21lbnQgSSBkb24ndCBzZWUgYW55IHByb2JsZW1zIGlmIGl0J3Mgbm90IGNyeXB0b2dyYXBoaWMgc2FmZS5cblRoaXMgdmVyc2lvbiBrZWVwcyAgY29tcGF0aWJpbGl0eSB3aXRoIG1vYmlsZSBicm93c2Vycy93ZWJ2aWV3cy5cbiAqL1xuZnVuY3Rpb24gdXVpZHY0KCkge1xuICAgIHJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uIChjKSB7XG4gICAgICAgIHZhciByID0gTWF0aC5yYW5kb20oKSAqIDE2IHwgMCwgdiA9IGMgPT09ICd4JyA/IHIgOiAociAmIDB4MyB8IDB4OCk7XG4gICAgICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gV2luZG93TVFJbnRlcmFjdGlvblNwYWNlKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93KSB7XG4gICAgdmFyIHN3YXJtSW50ZXJhY3QgPSByZXF1aXJlKFwiLi8uLi9zd2FybUludGVyYWN0aW9uXCIpO1xuICAgIHZhciBjaGlsZE1lc3NhZ2VNUSA9IHJlcXVpcmUoXCIuL3NwZWNpZmljTVFJbXBsL0NoaWxkV25kTVFcIikuY3JlYXRlTVEoY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3cpO1xuICAgIHZhciBzd2FybUluc3RhbmNlcyA9IHt9O1xuXG4gICAgdmFyIGNvbW0gPSB7XG4gICAgICAgIHN0YXJ0U3dhcm06IGZ1bmN0aW9uIChzd2FybU5hbWUsIGN0b3IsIGFyZ3MpIHtcblxuICAgICAgICAgICAgdmFyIHVuaXF1ZUlkID0gdXVpZHY0KCk7XG4gICAgICAgICAgICB2YXIgc3dhcm0gPSB7XG4gICAgICAgICAgICAgICAgbWV0YToge1xuICAgICAgICAgICAgICAgICAgICBzd2FybVR5cGVOYW1lOiBzd2FybU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGN0b3I6IGN0b3IsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IGFyZ3MsXG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3RJZDogdW5pcXVlSWQsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNoaWxkTWVzc2FnZU1RLnByb2R1Y2Uoc3dhcm0pO1xuICAgICAgICAgICAgcmV0dXJuIHN3YXJtO1xuICAgICAgICB9LFxuICAgICAgICBjb250aW51ZVN3YXJtOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBzd2FybVNlcmlhbGlzYXRpb24sIHBoYXNlTmFtZSwgYXJncykge1xuXG4gICAgICAgICAgICB2YXIgbmV3U2VyaWFsaXphdGlvbiA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc3dhcm1TZXJpYWxpc2F0aW9uKSk7XG4gICAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uLm1ldGEuY3RvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS5waGFzZU5hbWUgPSBwaGFzZU5hbWU7XG4gICAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uLm1ldGEudGFyZ2V0ID0gXCJpZnJhbWVcIjtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS5hcmdzID0gYXJncztcbiAgICAgICAgICAgIGNoaWxkTWVzc2FnZU1RLnByb2R1Y2UobmV3U2VyaWFsaXphdGlvbik7XG4gICAgICAgIH0sXG4gICAgICAgIG9uOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2hpbGRNZXNzYWdlTVEucmVnaXN0ZXJDYWxsYmFjayhzd2FybUhhbmRsZXIubWV0YS5yZXF1ZXN0SWQsIGNhbGxiYWNrKTtcbiAgICAgICAgfSxcbiAgICAgICAgb2ZmOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkZ1bmN0aW9uIG5vdCBpbXBsZW1lbnRlZCFcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICB2YXIgc3BhY2UgPSBzd2FybUludGVyYWN0Lm5ld0ludGVyYWN0aW9uU3BhY2UoY29tbSk7XG4gICAgdGhpcy5zdGFydFN3YXJtID0gZnVuY3Rpb24gKG5hbWUsIGN0b3IsIC4uLmFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIHNwYWNlLnN0YXJ0U3dhcm0obmFtZSwgY3RvciwgLi4uYXJncyk7XG4gICAgfTtcblxuICAgIHRoaXMuaW5pdCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBjaGlsZE1lc3NhZ2VNUS5yZWdpc3RlckNvbnN1bWVyKGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHN3YXJtO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEubWV0YSAmJiBkYXRhLm1ldGEuc3dhcm1JZCAmJiBzd2FybUluc3RhbmNlc1tkYXRhLm1ldGEuc3dhcm1JZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm0gPSBzd2FybUluc3RhbmNlc1tkYXRhLm1ldGEuc3dhcm1JZF07XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtLnVwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm1bZGF0YS5tZXRhLnBoYXNlTmFtZV0uYXBwbHkoc3dhcm0sIGRhdGEubWV0YS5hcmdzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgIHN3YXJtID0gJCQuc3dhcm0uc3RhcnQoZGF0YS5tZXRhLnN3YXJtVHlwZU5hbWUsIGRhdGEubWV0YS5jdG9yLCAuLi5kYXRhLm1ldGEuYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtLnNldE1ldGFkYXRhKFwicmVxdWVzdElkXCIsIGRhdGEubWV0YS5yZXF1ZXN0SWQpO1xuICAgICAgICAgICAgICAgICAgICBzd2FybUluc3RhbmNlc1tzd2FybS5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXSA9IHN3YXJtO1xuXG4gICAgICAgICAgICAgICAgICAgIHN3YXJtLm9uUmV0dXJuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN3YXJtIGlzIGZpbmlzaGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHBhcmVudC5wb3N0TWVzc2FnZSh7d2ViVmlld0lzUmVhZHk6IHRydWV9LCBcIipcIik7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZXIobWVzc2FnZSkge1xuICAgICAgICBsb2coXCJzZW5kaW5nIHN3YXJtIFwiLCBtZXNzYWdlKTtcbiAgICAgICAgY2hpbGRNZXNzYWdlTVEucHJvZHVjZShtZXNzYWdlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWx0ZXJJbnRlcmFjdGlvbnMobWVzc2FnZSkge1xuICAgICAgICBsb2coXCJjaGVja2luZyBpZiBtZXNzYWdlIGlzICdpbnRlcmFjdGlvbicgXCIsIG1lc3NhZ2UpO1xuICAgICAgICByZXR1cm4gbWVzc2FnZSAmJiBtZXNzYWdlLm1ldGEgJiYgbWVzc2FnZS5tZXRhLnRhcmdldCAmJiBtZXNzYWdlLm1ldGEudGFyZ2V0ID09PSBcImludGVyYWN0aW9uXCI7XG4gICAgfVxuXG4gICAgJCQuUFNLX1B1YlN1Yi5zdWJzY3JpYmUoJCQuQ09OU1RBTlRTLlNXQVJNX0ZPUl9FWEVDVVRJT04sIGhhbmRsZXIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSwgZmlsdGVySW50ZXJhY3Rpb25zKTtcbiAgICBsb2coXCJyZWdpc3RlcmluZyBsaXN0ZW5lciBmb3IgaGFuZGxpbmcgaW50ZXJhY3Rpb25zXCIpO1xuXG4gICAgZnVuY3Rpb24gbG9nKC4uLmFyZ3MpIHtcbiAgICAgICAgYXJncy51bnNoaWZ0KFwiW1dpbmRvd01RSW50ZXJhY3Rpb25TcGFjZVwiICsgKHdpbmRvdy5mcmFtZUVsZW1lbnQgPyBcIipcIiA6IFwiXCIpICsgXCJdXCIpO1xuICAgICAgICAvL2NvbnNvbGUubG9nLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZSA9IGZ1bmN0aW9uIChjaGFubmVsTmFtZSwgY29tbXVuaWNhdGlvbldpbmRvdykge1xuICAgIHJldHVybiBuZXcgV2luZG93TVFJbnRlcmFjdGlvblNwYWNlKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93KTtcbn07XG4iLCJ2YXIgT3dNID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIikuT3dNO1xudmFyIHN3YXJtSW50ZXJhY3QgPSByZXF1aXJlKFwiLi8uLi9zd2FybUludGVyYWN0aW9uXCIpO1xudmFyIGZvbGRlck1RID0gcmVxdWlyZShcImZvbGRlcm1xXCIpO1xuXG5mdW5jdGlvbiBGb2xkZXJNUUludGVyYWN0aW9uU3BhY2UoYWdlbnQsIHRhcmdldEZvbGRlciwgcmV0dXJuRm9sZGVyKSB7XG4gICAgdmFyIHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVycyA9IHt9O1xuICAgIHZhciBxdWV1ZUhhbmRsZXIgPSBudWxsO1xuICAgIHZhciByZXNwb25zZVF1ZXVlID0gbnVsbDtcblxuICAgIHZhciBxdWV1ZSA9IGZvbGRlck1RLmNyZWF0ZVF1ZSh0YXJnZXRGb2xkZXIsIChlcnIgLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVTd2FybVBhY2soc3dhcm1OYW1lLCBwaGFzZU5hbWUsIC4uLmFyZ3Mpe1xuICAgICAgICB2YXIgc3dhcm0gPSBuZXcgT3dNKCk7XG5cbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInN3YXJtSWRcIiwgJCQudWlkR2VuZXJhdG9yLnNhZmVfdXVpZCgpKTtcblxuICAgICAgICBzd2FybS5zZXRNZXRhKFwicmVxdWVzdElkXCIsIHN3YXJtLmdldE1ldGEoXCJzd2FybUlkXCIpKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInN3YXJtVHlwZU5hbWVcIiwgc3dhcm1OYW1lKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInBoYXNlTmFtZVwiLCBwaGFzZU5hbWUpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiYXJnc1wiLCBhcmdzKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImNvbW1hbmRcIiwgXCJleGVjdXRlU3dhcm1QaGFzZVwiKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInRhcmdldFwiLCBhZ2VudCk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIsIHJldHVybkZvbGRlcik7XG5cbiAgICAgICAgcmV0dXJuIHN3YXJtO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpc3BhdGNoaW5nU3dhcm1zKGVyciwgc3dhcm0pe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICB9XG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHN1YnNMaXN0ID0gc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtLm1ldGEuc3dhcm1JZF07XG4gICAgICAgICAgICBpZihzdWJzTGlzdCl7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpPTA7IGk8c3Vic0xpc3QubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgICAgICAgICBsZXQgaGFuZGxlciA9IHN1YnNMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKG51bGwsIHN3YXJtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluaXQoKXtcbiAgICAgICAgaWYoIXF1ZXVlSGFuZGxlcil7XG4gICAgICAgICAgICBxdWV1ZUhhbmRsZXIgPSBxdWV1ZS5nZXRIYW5kbGVyKCk7XG4gICAgICAgIH1cbiAgICB9XG5cdFxuXHRpbml0KCk7XG5cbiAgICBmdW5jdGlvbiBwcmVwYXJlVG9Db25zdW1lKCl7XG4gICAgICAgIGlmKCFyZXNwb25zZVF1ZXVlKXtcbiAgICAgICAgICAgIHJlc3BvbnNlUXVldWUgPSBmb2xkZXJNUS5jcmVhdGVRdWUocmV0dXJuRm9sZGVyKTtcbiAgICAgICAgICAgIHJlc3BvbnNlUXVldWUucmVnaXN0ZXJDb25zdW1lcihkaXNwYXRjaGluZ1N3YXJtcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgY29tbXVuaWNhdGlvbiA9IHtcbiAgICAgICAgc3RhcnRTd2FybTogZnVuY3Rpb24gKHN3YXJtTmFtZSwgY3RvciwgYXJncykge1xuICAgICAgICAgICAgcHJlcGFyZVRvQ29uc3VtZSgpO1xuICAgICAgICAgICAgdmFyIHN3YXJtID0gY3JlYXRlU3dhcm1QYWNrKHN3YXJtTmFtZSwgY3RvciwgLi4uYXJncyk7XG4gICAgICAgICAgICBxdWV1ZUhhbmRsZXIuc2VuZFN3YXJtRm9yRXhlY3V0aW9uKHN3YXJtKTtcbiAgICAgICAgICAgIHJldHVybiBzd2FybTtcbiAgICAgICAgfSxcbiAgICAgICAgY29udGludWVTd2FybTogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgc3dhcm1TZXJpYWxpc2F0aW9uLCBjdG9yLCAuLi5hcmdzKSB7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgc3dhcm1IYW5kbGVyLnVwZGF0ZShzd2FybVNlcmlhbGlzYXRpb24pO1xuICAgICAgICAgICAgICAgIHN3YXJtSGFuZGxlcltjdG9yXS5hcHBseShzd2FybUhhbmRsZXIsIGFyZ3MpO1xuICAgICAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb246IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBwcmVwYXJlVG9Db25zdW1lKCk7XG5cbiAgICAgICAgICAgIGlmKCFzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm1IYW5kbGVyLm1ldGEuc3dhcm1JZF0pe1xuICAgICAgICAgICAgICAgIHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybUhhbmRsZXIubWV0YS5zd2FybUlkXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5tZXRhLnN3YXJtSWRdLnB1c2goY2FsbGJhY2spO1xuXG4gICAgICAgIH0sXG4gICAgICAgIG9mZjogZnVuY3Rpb24gKHN3YXJtSGFuZGxlcikge1xuICAgICAgICAgICAgc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5tZXRhLnN3YXJtSWRdID0gW107XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIHN3YXJtSW50ZXJhY3QubmV3SW50ZXJhY3Rpb25TcGFjZShjb21tdW5pY2F0aW9uKTtcbn1cblxudmFyIHNwYWNlcyA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVJbnRlcmFjdGlvblNwYWNlID0gZnVuY3Rpb24gKGFnZW50LCB0YXJnZXRGb2xkZXIsIHJldHVybkZvbGRlcikge1xuICAgIHZhciBpbmRleCA9IHRhcmdldEZvbGRlcityZXR1cm5Gb2xkZXI7XG4gICAgaWYoIXNwYWNlc1tpbmRleF0pe1xuICAgICAgICBzcGFjZXNbaW5kZXhdID0gbmV3IEZvbGRlck1RSW50ZXJhY3Rpb25TcGFjZShhZ2VudCwgdGFyZ2V0Rm9sZGVyLCByZXR1cm5Gb2xkZXIpO1xuICAgIH1lbHNle1xuICAgICAgICBjb25zb2xlLmxvZyhgRm9sZGVyTVEgaW50ZXJhY3Rpb24gc3BhY2UgYmFzZWQgb24gWyR7dGFyZ2V0Rm9sZGVyfSwgJHtyZXR1cm5Gb2xkZXJ9XSBhbHJlYWR5IGV4aXN0cyFgKTtcbiAgICB9XG4gICAgcmV0dXJuIHNwYWNlc1tpbmRleF07XG59OyIsInJlcXVpcmUoJ3Bzay1odHRwLWNsaWVudCcpO1xuXG5mdW5jdGlvbiBIVFRQSW50ZXJhY3Rpb25TcGFjZShhbGlhcywgcmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKSB7XG4gICAgY29uc3Qgc3dhcm1JbnRlcmFjdCA9IHJlcXVpcmUoXCIuLy4uL3N3YXJtSW50ZXJhY3Rpb25cIik7XG5cbiAgICBsZXQgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICBmdW5jdGlvbiBpbml0KCl7XG4gICAgICAgIGlmKCFpbml0aWFsaXplZCl7XG4gICAgICAgICAgICBpbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgICAkJC5yZW1vdGUuY3JlYXRlUmVxdWVzdE1hbmFnZXIoKTtcbiAgICAgICAgICAgICQkLnJlbW90ZS5uZXdFbmRQb2ludChhbGlhcywgcmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbW0gPSB7XG4gICAgICAgIHN0YXJ0U3dhcm06IGZ1bmN0aW9uIChzd2FybU5hbWUsIGN0b3IsIGFyZ3MpIHtcbiAgICAgICAgICAgIGluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiAkJC5yZW1vdGVbYWxpYXNdLnN0YXJ0U3dhcm0oc3dhcm1OYW1lLCBjdG9yLCAuLi5hcmdzKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29udGludWVTd2FybTogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgc3dhcm1TZXJpYWxpc2F0aW9uLCBjdG9yLCBhcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gJCQucmVtb3RlW2FsaWFzXS5jb250aW51ZVN3YXJtKHN3YXJtU2VyaWFsaXNhdGlvbiwgY3RvciwgYXJncyk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgc3dhcm1IYW5kbGVyLm9uKCcqJywgY2FsbGJhY2spO1xuICAgICAgICB9LFxuICAgICAgICBvZmY6IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIpIHtcbiAgICAgICAgICAgIHN3YXJtSGFuZGxlci5vZmYoJyonKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gc3dhcm1JbnRlcmFjdC5uZXdJbnRlcmFjdGlvblNwYWNlKGNvbW0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVJbnRlcmFjdGlvblNwYWNlID0gZnVuY3Rpb24gKGFsaWFzLCByZW1vdGVFbmRQb2ludCwgYWdlbnRVaWQsIGNyeXB0b0luZm8pIHtcbiAgICAvL3NpbmdsZXRvblxuICAgIHJldHVybiBuZXcgSFRUUEludGVyYWN0aW9uU3BhY2UoYWxpYXMsIHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgY3J5cHRvSW5mbyk7XG59OyIsInZhciBjaGFubmVsc1JlZ2lzdHJ5ID0ge307IC8va2VlcHMgY2FsbGJhY2tzIGZvciBjb25zdW1lcnMgYW5kIHdpbmRvd3MgcmVmZXJlbmNlcyBmb3IgcHJvZHVjZXJzXG52YXIgY2FsbGJhY2tzUmVnaXN0cnkgPSB7fTtcblxuZnVuY3Rpb24gZGlzcGF0Y2hFdmVudChldmVudCkge1xuICAgIHZhciBzd2FybSA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSk7XG4gICAgaWYoc3dhcm0ubWV0YSl7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGNhbGxiYWNrc1JlZ2lzdHJ5W3N3YXJtLm1ldGEuY2hhbm5lbE5hbWVdO1xuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBzd2FybSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbn1cblxuXG5mdW5jdGlvbiBDaGlsZFduZE1RKGNoYW5uZWxOYW1lLCBtYWluV2luZG93LCBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCkge1xuICAgIC8vY2hhbm5lbCBuYW1lIGlzXG5cbiAgICBjaGFubmVsc1JlZ2lzdHJ5W2NoYW5uZWxOYW1lXSA9IG1haW5XaW5kb3c7XG5cbiAgICB0aGlzLnByb2R1Y2UgPSBmdW5jdGlvbiAoc3dhcm1Nc2cpIHtcbiAgICAgICAgc3dhcm1Nc2cubWV0YS5jaGFubmVsTmFtZSA9IGNoYW5uZWxOYW1lO1xuICAgICAgICB2YXIgbWVzc2FnZSA9IHtcbiAgICAgICAgICAgIG1ldGE6c3dhcm1Nc2cubWV0YSxcbiAgICAgICAgICAgIHB1YmxpY1ZhcnM6c3dhcm1Nc2cucHVibGljVmFycyxcbiAgICAgICAgICAgIHByaXZhdGVWYXJzOnN3YXJtTXNnLnByaXZhdGVWYXJzXG4gICAgICAgIH07XG5cbiAgICAgICAgbWVzc2FnZS5tZXRhLmFyZ3MgPSBtZXNzYWdlLm1ldGEuYXJncy5tYXAoZnVuY3Rpb24gKGFyZ3VtZW50KSB7XG4gICAgICAgICAgICBpZiAoYXJndW1lbnQgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9IHt9O1xuICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudC5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yW1wibWVzc2FnZVwiXSA9IGFyZ3VtZW50Lm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudC5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yW1wiY29kZVwiXSA9IGFyZ3VtZW50LmNvZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhcmd1bWVudDtcbiAgICAgICAgfSk7XG4gICAgICAgIG1haW5XaW5kb3cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSksIFwiKlwiKTtcbiAgICB9O1xuXG4gICAgdmFyIGNvbnN1bWVyO1xuXG4gICAgdGhpcy5yZWdpc3RlckNvbnN1bWVyID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBzaG91bGREZWxldGVBZnRlclJlYWQgPSB0cnVlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25zdW1lcikge1xuICAgICAgICAgICAvLyB0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IG9uZSBjb25zdW1lciBpcyBhbGxvd2VkIVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVyID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrc1JlZ2lzdHJ5W2NoYW5uZWxOYW1lXSA9IGNvbnN1bWVyO1xuXG4gICAgICAgIGlmIChzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCAmJiB0eXBlb2Ygc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwuYWRkRXZlbnRMaXN0ZW5lciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZGlzcGF0Y2hFdmVudCk7XG4gICAgICAgIH1cbiAgICAgIH07XG59XG5cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlTVEgPSBmdW5jdGlvbiBjcmVhdGVNUShjaGFubmVsTmFtZSwgd25kLCBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCl7XG4gICAgcmV0dXJuIG5ldyBDaGlsZFduZE1RKGNoYW5uZWxOYW1lLCB3bmQsIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMuaW5pdEZvclN3YXJtaW5nSW5DaGlsZCA9IGZ1bmN0aW9uKGRvbWFpbk5hbWUpe1xuXG4gICAgdmFyIHB1YlN1YiA9ICQkLnJlcXVpcmUoXCJzb3VuZHB1YnN1YlwiKS5zb3VuZFB1YlN1YjtcblxuICAgIHZhciBpbmJvdW5kID0gY3JlYXRlTVEoZG9tYWluTmFtZStcIi9pbmJvdW5kXCIpO1xuICAgIHZhciBvdXRib3VuZCA9IGNyZWF0ZU1RKGRvbWFpbk5hbWUrXCIvb3V0Ym91bmRcIik7XG5cblxuICAgIGluYm91bmQucmVnaXN0ZXJDb25zdW1lcihmdW5jdGlvbihlcnIsIHN3YXJtKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgfVxuICAgICAgICAvL3Jlc3RvcmUgYW5kIGV4ZWN1dGUgdGhpcyB0YXN0eSBzd2FybVxuICAgICAgICBnbG9iYWwuJCQuc3dhcm1zSW5zdGFuY2VzTWFuYWdlci5yZXZpdmVfc3dhcm0oc3dhcm0pO1xuICAgIH0pO1xuXG4gICAgcHViU3ViLnN1YnNjcmliZSgkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTiwgZnVuY3Rpb24oc3dhcm0pe1xuICAgICAgICBvdXRib3VuZC5zZW5kU3dhcm1Gb3JFeGVjdXRpb24oc3dhcm0pO1xuICAgIH0pO1xufTtcblxuIiwidmFyIGNoYW5uZWxzUmVnaXN0cnkgPSB7fTsgLy9rZWVwcyBjYWxsYmFja3MgZm9yIGNvbnN1bWVycyBhbmQgd2luZG93cyByZWZlcmVuY2VzIGZvciBwcm9kdWNlcnNcbnZhciBjYWxsYmFja3NSZWdpc3RyeSA9IHt9O1xudmFyIHN3YXJtQ2FsbGJhY2tzID0ge307XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRXZlbnQoZXZlbnQpIHtcblxuICAgIGlmIChldmVudC5zb3VyY2UgIT09IHdpbmRvdykge1xuXG4gICAgICAgIHZhciBzd2FybSA9IGV2ZW50LmRhdGE7XG5cbiAgICAgICAgaWYgKHN3YXJtLm1ldGEpIHtcbiAgICAgICAgICAgIGxldCBjYWxsYmFjaztcbiAgICAgICAgICAgIGlmICghc3dhcm0ubWV0YS5yZXF1ZXN0SWQgfHwgIXN3YXJtQ2FsbGJhY2tzW3N3YXJtLm1ldGEucmVxdWVzdElkXSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2tzUmVnaXN0cnlbc3dhcm0ubWV0YS5jaGFubmVsTmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayA9IHN3YXJtQ2FsbGJhY2tzW3N3YXJtLm1ldGEucmVxdWVzdElkXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHN3YXJtKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuZnVuY3Rpb24gQ2hpbGRXbmRNUShjaGFubmVsTmFtZSwgbWFpbldpbmRvdykge1xuICAgIC8vY2hhbm5lbCBuYW1lIGlzXG5cbiAgICBjaGFubmVsc1JlZ2lzdHJ5W2NoYW5uZWxOYW1lXSA9IG1haW5XaW5kb3c7XG5cbiAgICB0aGlzLnByb2R1Y2UgPSBmdW5jdGlvbiAoc3dhcm1Nc2cpIHtcbiAgICAgICAgc3dhcm1Nc2cubWV0YS5jaGFubmVsTmFtZSA9IGNoYW5uZWxOYW1lO1xuICAgICAgICB2YXIgbWVzc2FnZSA9IHtcbiAgICAgICAgICAgIG1ldGE6IHN3YXJtTXNnLm1ldGEsXG4gICAgICAgICAgICBwdWJsaWNWYXJzOiBzd2FybU1zZy5wdWJsaWNWYXJzLFxuICAgICAgICAgICAgcHJpdmF0ZVZhcnM6IHN3YXJtTXNnLnByaXZhdGVWYXJzXG4gICAgICAgIH07XG4gICAgICAgIC8vY29uc29sZS5sb2coc3dhcm1Nc2cuZ2V0SlNPTigpKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhzd2FybU1zZy52YWx1ZU9mKCkpO1xuICAgICAgICBtZXNzYWdlLm1ldGEuYXJncyA9IG1lc3NhZ2UubWV0YS5hcmdzLm1hcChmdW5jdGlvbiAoYXJndW1lbnQpIHtcbiAgICAgICAgICAgIGlmIChhcmd1bWVudCBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0ge307XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50Lm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JbXCJtZXNzYWdlXCJdID0gYXJndW1lbnQubWVzc2FnZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50LmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JbXCJjb2RlXCJdID0gYXJndW1lbnQuY29kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50O1xuICAgICAgICB9KTtcbiAgICAgICAgbWFpbldpbmRvdy5wb3N0TWVzc2FnZShtZXNzYWdlLCBcIipcIik7XG4gICAgfTtcblxuICAgIHZhciBjb25zdW1lcjtcblxuICAgIHRoaXMucmVnaXN0ZXJDb25zdW1lciA9IGZ1bmN0aW9uIChjYWxsYmFjaywgc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkID0gdHJ1ZSkge1xuICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uc3VtZXIpIHtcbiAgICAgICAgICAgIC8vIHRocm93IG5ldyBFcnJvcihcIk9ubHkgb25lIGNvbnN1bWVyIGlzIGFsbG93ZWQhXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZXIgPSBjYWxsYmFjaztcbiAgICAgICAgY2FsbGJhY2tzUmVnaXN0cnlbY2hhbm5lbE5hbWVdID0gY29uc3VtZXI7XG4gICAgICAgIG1haW5XaW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZGlzcGF0Y2hFdmVudCk7XG4gICAgfTtcblxuICAgIHRoaXMucmVnaXN0ZXJDYWxsYmFjayA9IGZ1bmN0aW9uIChyZXF1ZXN0SWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHN3YXJtQ2FsbGJhY2tzW3JlcXVlc3RJZF0gPSBjYWxsYmFjaztcbiAgICAgICAgY2FsbGJhY2tzUmVnaXN0cnlbY2hhbm5lbE5hbWVdID0gY2FsbGJhY2s7XG4gICAgICAgIG1haW5XaW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZGlzcGF0Y2hFdmVudCk7XG4gICAgfTtcblxufVxuXG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZU1RID0gZnVuY3Rpb24gY3JlYXRlTVEoY2hhbm5lbE5hbWUsIHduZCkge1xuICAgIHJldHVybiBuZXcgQ2hpbGRXbmRNUShjaGFubmVsTmFtZSwgd25kKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMuaW5pdEZvclN3YXJtaW5nSW5DaGlsZCA9IGZ1bmN0aW9uIChkb21haW5OYW1lKSB7XG5cbiAgICB2YXIgcHViU3ViID0gJCQucmVxdWlyZShcInNvdW5kcHVic3ViXCIpLnNvdW5kUHViU3ViO1xuXG4gICAgdmFyIGluYm91bmQgPSBjcmVhdGVNUShkb21haW5OYW1lICsgXCIvaW5ib3VuZFwiKTtcbiAgICB2YXIgb3V0Ym91bmQgPSBjcmVhdGVNUShkb21haW5OYW1lICsgXCIvb3V0Ym91bmRcIik7XG5cblxuICAgIGluYm91bmQucmVnaXN0ZXJDb25zdW1lcihmdW5jdGlvbiAoZXJyLCBzd2FybSkge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICB9XG4gICAgICAgIC8vcmVzdG9yZSBhbmQgZXhlY3V0ZSB0aGlzIHRhc3R5IHN3YXJtXG4gICAgICAgIGdsb2JhbC4kJC5zd2FybXNJbnN0YW5jZXNNYW5hZ2VyLnJldml2ZV9zd2FybShzd2FybSk7XG4gICAgfSk7XG5cbiAgICBwdWJTdWIuc3Vic2NyaWJlKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBmdW5jdGlvbiAoc3dhcm0pIHtcbiAgICAgICAgb3V0Ym91bmQuc2VuZFN3YXJtRm9yRXhlY3V0aW9uKHN3YXJtKTtcbiAgICB9KTtcbn07XG5cbiIsImlmICh0eXBlb2YgJCQgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICQkID0ge307XG59XG5cbmZ1bmN0aW9uIFZpcnR1YWxTd2FybShpbm5lck9iaiwgZ2xvYmFsSGFuZGxlcil7XG4gICAgbGV0IGtub3duRXh0cmFQcm9wcyA9IFsgXCJzd2FybVwiIF07XG5cbiAgICBmdW5jdGlvbiBidWlsZEhhbmRsZXIoKSB7XG4gICAgICAgIHZhciB1dGlsaXR5ID0ge307XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIHByb3BlcnR5LCB2YWx1ZSwgcmVjZWl2ZXIpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0YXJnZXQucHJpdmF0ZVZhcnMgJiYgdGFyZ2V0LnByaXZhdGVWYXJzLmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5wcml2YXRlVmFyc1twcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHRhcmdldC5wdWJsaWNWYXJzICYmIHRhcmdldC5wdWJsaWNWYXJzLmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5wdWJsaWNWYXJzW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdGFyZ2V0Lmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIGtub3duRXh0cmFQcm9wcy5pbmRleE9mKHByb3BlcnR5KSA9PT0gLTE6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWdsb2JhbEhhbmRsZXIucHJvdGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsSGFuZGxlci5wcm90ZWN0ZWQgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbEhhbmRsZXIucHJvdGVjdGVkW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlsaXR5W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIHByb3BlcnR5LCByZWNlaXZlcikge1xuXG4gICAgICAgICAgICAgICAgc3dpdGNoICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdGFyZ2V0LnB1YmxpY1ZhcnMgJiYgdGFyZ2V0LnB1YmxpY1ZhcnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldC5wdWJsaWNWYXJzW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0YXJnZXQucHJpdmF0ZVZhcnMgJiYgdGFyZ2V0LnByaXZhdGVWYXJzLmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXQucHJpdmF0ZVZhcnNbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHRhcmdldC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSk6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBnbG9iYWxIYW5kbGVyLnByb3RlY3RlZCAmJiBnbG9iYWxIYW5kbGVyLnByb3RlY3RlZC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSk6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsSGFuZGxlci5wcm90ZWN0ZWRbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHV0aWxpdHkuaGFzT3duUHJvcGVydHkocHJvcGVydHkpOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHV0aWxpdHlbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm94eShpbm5lck9iaiwgYnVpbGRIYW5kbGVyKCkpO1xufVxuXG5mdW5jdGlvbiBTd2FybUludGVyYWN0aW9uKGNvbW11bmljYXRpb25JbnRlcmZhY2UsIHN3YXJtTmFtZSwgY3RvciwgYXJncykge1xuXG4gICAgdmFyIHN3YXJtSGFuZGxlciA9IGNvbW11bmljYXRpb25JbnRlcmZhY2Uuc3RhcnRTd2FybShzd2FybU5hbWUsIGN0b3IsIGFyZ3MpO1xuXG4gICAgdGhpcy5vbiA9IGZ1bmN0aW9uKGRlc2NyaXB0aW9uKXtcbiAgICAgICAgY29tbXVuaWNhdGlvbkludGVyZmFjZS5vbihzd2FybUhhbmRsZXIsIGZ1bmN0aW9uKGVyciwgc3dhcm1TZXJpYWxpc2F0aW9uKXtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHBoYXNlID0gZGVzY3JpcHRpb25bc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEucGhhc2VOYW1lXTtcbiAgICAgICAgICAgIGxldCB2aXJ0dWFsU3dhcm0gPSBuZXcgVmlydHVhbFN3YXJtKHN3YXJtU2VyaWFsaXNhdGlvbiwgc3dhcm1IYW5kbGVyKTtcblxuICAgICAgICAgICAgaWYoIXBoYXNlKXtcbiAgICAgICAgICAgICAgICAvL1RPRE8gcmV2aWV3IGFuZCBmaXguIEZpeCBjYXNlIHdoZW4gYW4gaW50ZXJhY3Rpb24gaXMgc3RhcnRlZCBmcm9tIGFub3RoZXIgaW50ZXJhY3Rpb25cbiAgICAgICAgICAgICAgICBpZihzd2FybUhhbmRsZXIgJiYgKCFzd2FybUhhbmRsZXIuVGFyZ2V0IHx8IHN3YXJtSGFuZGxlci5UYXJnZXQuc3dhcm1JZCAhPT0gc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuc3dhcm1JZCkpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk5vdCBteSBzd2FybSFcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGludGVyYWN0UGhhc2VFcnIgPSAgbmV3IEVycm9yKFwiSW50ZXJhY3QgbWV0aG9kIFwiK3N3YXJtU2VyaWFsaXNhdGlvbi5tZXRhLnBoYXNlTmFtZStcIiB3YXMgbm90IGZvdW5kLlwiKTtcbiAgICAgICAgICAgICAgICBpZihkZXNjcmlwdGlvbltcIm9uRXJyb3JcIl0pe1xuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbltcIm9uRXJyb3JcIl0uY2FsbCh2aXJ0dWFsU3dhcm0sIGludGVyYWN0UGhhc2VFcnIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGludGVyYWN0UGhhc2VFcnI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2aXJ0dWFsU3dhcm0uc3dhcm0gPSBmdW5jdGlvbihwaGFzZU5hbWUsIC4uLmFyZ3Mpe1xuICAgICAgICAgICAgICAgIGNvbW11bmljYXRpb25JbnRlcmZhY2UuY29udGludWVTd2FybShzd2FybUhhbmRsZXIsIHN3YXJtU2VyaWFsaXNhdGlvbiwgcGhhc2VOYW1lLCBhcmdzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHBoYXNlLmFwcGx5KHZpcnR1YWxTd2FybSwgc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuYXJncyk7XG4gICAgICAgICAgICBpZih2aXJ0dWFsU3dhcm0ubWV0YS5jb21tYW5kID09PSBcImFzeW5jUmV0dXJuXCIpe1xuICAgICAgICAgICAgICAgIGNvbW11bmljYXRpb25JbnRlcmZhY2Uub2ZmKHN3YXJtSGFuZGxlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLm9uUmV0dXJuID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICB0aGlzLm9uKHtcbiAgICAgICAgICAgIF9fcmV0dXJuX186IGNhbGxiYWNrXG4gICAgICAgIH0pO1xuICAgIH07XG59XG5cbnZhciBhYnN0cmFjdEludGVyYWN0aW9uU3BhY2UgPSB7XG4gICAgc3RhcnRTd2FybTogZnVuY3Rpb24gKHN3YXJtTmFtZSwgY3RvciwgYXJncykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgIFN3YXJtSW50ZXJhY3Rpb24ucHJvdG90eXBlLnN0YXJ0U3dhcm1cIik7XG4gICAgfSxcbiAgICByZXNlbmRTd2FybTogZnVuY3Rpb24gKHN3YXJtSW5zdGFuY2UsIHN3YXJtU2VyaWFsaXNhdGlvbiwgY3RvciwgYXJncykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgIFN3YXJtSW50ZXJhY3Rpb24ucHJvdG90eXBlLmNvbnRpbnVlU3dhcm0gXCIpO1xuICAgIH0sXG4gICAgb246IGZ1bmN0aW9uIChzd2FybUluc3RhbmNlLCBwaGFzZU5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSAgU3dhcm1JbnRlcmFjdGlvbi5wcm90b3R5cGUub25Td2FybVwiKTtcbiAgICB9LFxub2ZmOiBmdW5jdGlvbiAoc3dhcm1JbnN0YW5jZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgIFN3YXJtSW50ZXJhY3Rpb24ucHJvdG90eXBlLm9uU3dhcm1cIik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMubmV3SW50ZXJhY3Rpb25TcGFjZSA9IGZ1bmN0aW9uIChjb21tdW5pY2F0aW9uSW50ZXJmYWNlKSB7XG5cbiAgICBpZighY29tbXVuaWNhdGlvbkludGVyZmFjZSkge1xuICAgICAgICBjb21tdW5pY2F0aW9uSW50ZXJmYWNlID0gYWJzdHJhY3RJbnRlcmFjdGlvblNwYWNlIDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc3RhcnRTd2FybTogZnVuY3Rpb24gKHN3YXJtTmFtZSwgY3RvciwgLi4uYXJncykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBTd2FybUludGVyYWN0aW9uKGNvbW11bmljYXRpb25JbnRlcmZhY2UsIHN3YXJtTmFtZSwgY3RvciwgYXJncyk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuIiwibW9kdWxlLmV4cG9ydHMgPSBQZW5kO1xuXG5mdW5jdGlvbiBQZW5kKCkge1xuICB0aGlzLnBlbmRpbmcgPSAwO1xuICB0aGlzLm1heCA9IEluZmluaXR5O1xuICB0aGlzLmxpc3RlbmVycyA9IFtdO1xuICB0aGlzLndhaXRpbmcgPSBbXTtcbiAgdGhpcy5lcnJvciA9IG51bGw7XG59XG5cblBlbmQucHJvdG90eXBlLmdvID0gZnVuY3Rpb24oZm4pIHtcbiAgaWYgKHRoaXMucGVuZGluZyA8IHRoaXMubWF4KSB7XG4gICAgcGVuZEdvKHRoaXMsIGZuKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLndhaXRpbmcucHVzaChmbik7XG4gIH1cbn07XG5cblBlbmQucHJvdG90eXBlLndhaXQgPSBmdW5jdGlvbihjYikge1xuICBpZiAodGhpcy5wZW5kaW5nID09PSAwKSB7XG4gICAgY2IodGhpcy5lcnJvcik7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5saXN0ZW5lcnMucHVzaChjYik7XG4gIH1cbn07XG5cblBlbmQucHJvdG90eXBlLmhvbGQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHBlbmRIb2xkKHRoaXMpO1xufTtcblxuZnVuY3Rpb24gcGVuZEhvbGQoc2VsZikge1xuICBzZWxmLnBlbmRpbmcgKz0gMTtcbiAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICByZXR1cm4gb25DYjtcbiAgZnVuY3Rpb24gb25DYihlcnIpIHtcbiAgICBpZiAoY2FsbGVkKSB0aHJvdyBuZXcgRXJyb3IoXCJjYWxsYmFjayBjYWxsZWQgdHdpY2VcIik7XG4gICAgY2FsbGVkID0gdHJ1ZTtcbiAgICBzZWxmLmVycm9yID0gc2VsZi5lcnJvciB8fCBlcnI7XG4gICAgc2VsZi5wZW5kaW5nIC09IDE7XG4gICAgaWYgKHNlbGYud2FpdGluZy5sZW5ndGggPiAwICYmIHNlbGYucGVuZGluZyA8IHNlbGYubWF4KSB7XG4gICAgICBwZW5kR28oc2VsZiwgc2VsZi53YWl0aW5nLnNoaWZ0KCkpO1xuICAgIH0gZWxzZSBpZiAoc2VsZi5wZW5kaW5nID09PSAwKSB7XG4gICAgICB2YXIgbGlzdGVuZXJzID0gc2VsZi5saXN0ZW5lcnM7XG4gICAgICBzZWxmLmxpc3RlbmVycyA9IFtdO1xuICAgICAgbGlzdGVuZXJzLmZvckVhY2goY2JMaXN0ZW5lcik7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGNiTGlzdGVuZXIobGlzdGVuZXIpIHtcbiAgICBsaXN0ZW5lcihzZWxmLmVycm9yKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwZW5kR28oc2VsZiwgZm4pIHtcbiAgZm4ocGVuZEhvbGQoc2VsZikpO1xufVxuIiwiXG5cbi8qKioqKioqKioqKioqKioqKioqKioqICB1dGlsaXR5IGNsYXNzICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5mdW5jdGlvbiBSZXF1ZXN0TWFuYWdlcihwb2xsaW5nVGltZU91dCl7XG4gICAgaWYoIXBvbGxpbmdUaW1lT3V0KXtcbiAgICAgICAgcG9sbGluZ1RpbWVPdXQgPSAxMDAwOyAvLzEgc2Vjb25kIGJ5IGRlZmF1bHRcbiAgICB9XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBSZXF1ZXN0KGVuZFBvaW50LCBpbml0aWFsU3dhcm0pe1xuICAgICAgICB2YXIgb25SZXR1cm5DYWxsYmFja3MgPSBbXTtcbiAgICAgICAgdmFyIG9uRXJyb3JDYWxsYmFja3MgPSBbXTtcbiAgICAgICAgdmFyIG9uQ2FsbGJhY2tzID0gW107XG4gICAgICAgIHZhciByZXF1ZXN0SWQgPSBpbml0aWFsU3dhcm0ubWV0YS5yZXF1ZXN0SWQ7XG4gICAgICAgIGluaXRpYWxTd2FybSA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5nZXRSZXF1ZXN0SWQgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RJZDtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLm9uID0gZnVuY3Rpb24ocGhhc2VOYW1lLCBjYWxsYmFjayl7XG4gICAgICAgICAgICBpZih0eXBlb2YgcGhhc2VOYW1lICE9IFwic3RyaW5nXCIgICYmIHR5cGVvZiBjYWxsYmFjayAhPSBcImZ1bmN0aW9uXCIpe1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBmaXJzdCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgc3RyaW5nIGFuZCB0aGUgc2Vjb25kIHBhcmFtZXRlciBzaG91bGQgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb25DYWxsYmFja3MucHVzaCh7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6Y2FsbGJhY2ssXG4gICAgICAgICAgICAgICAgcGhhc2U6cGhhc2VOYW1lXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNlbGYucG9sbChlbmRQb2ludCwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLm9uUmV0dXJuID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICAgICAgb25SZXR1cm5DYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICBzZWxmLnBvbGwoZW5kUG9pbnQsIHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vbkVycm9yID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICAgICAgaWYob25FcnJvckNhbGxiYWNrcy5pbmRleE9mKGNhbGxiYWNrKSE9PS0xKXtcbiAgICAgICAgICAgICAgICBvbkVycm9yQ2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciBjYWxsYmFjayBhbHJlYWR5IHJlZ2lzdGVyZWQhXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2ggPSBmdW5jdGlvbihlcnIsIHJlc3VsdCl7XG4gICAgICAgICAgICByZXN1bHQgPSB0eXBlb2YgcmVzdWx0ID09IFwic3RyaW5nXCIgPyBKU09OLnBhcnNlKHJlc3VsdCkgOiByZXN1bHQ7XG4gICAgICAgICAgICByZXN1bHQgPSBPd00ucHJvdG90eXBlLmNvbnZlcnQocmVzdWx0KTtcbiAgICAgICAgICAgIHZhciByZXN1bHRSZXFJZCA9IHJlc3VsdC5nZXRNZXRhKFwicmVxdWVzdElkXCIpO1xuICAgICAgICAgICAgdmFyIHBoYXNlTmFtZSA9IHJlc3VsdC5nZXRNZXRhKFwicGhhc2VOYW1lXCIpO1xuICAgICAgICAgICAgdmFyIG9uUmV0dXJuID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmKHJlc3VsdFJlcUlkID09PSByZXF1ZXN0SWQpe1xuICAgICAgICAgICAgICAgIG9uUmV0dXJuQ2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oYyl7XG4gICAgICAgICAgICAgICAgICAgIGMobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgb25SZXR1cm4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmKG9uUmV0dXJuKXtcbiAgICAgICAgICAgICAgICAgICAgb25SZXR1cm5DYWxsYmFja3MgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvckNhbGxiYWNrcyA9IFtdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG9uQ2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oaSl7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJYWFhYWFhYWDpcIiwgcGhhc2VOYW1lICwgaSk7XG4gICAgICAgICAgICAgICAgICAgIGlmKHBoYXNlTmFtZSA9PT0gaS5waGFzZSB8fCBpLnBoYXNlID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkuY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKG9uUmV0dXJuQ2FsbGJhY2tzLmxlbmd0aCA9PT0gMCAmJiBvbkNhbGxiYWNrcy5sZW5ndGggPT09IDApe1xuICAgICAgICAgICAgICAgIHNlbGYudW5wb2xsKGVuZFBvaW50LCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoRXJyb3IgPSBmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgZm9yKHZhciBpPTA7IGkgPCBvbkVycm9yQ2FsbGJhY2tzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICB2YXIgZXJyQ2IgPSBvbkVycm9yQ2FsbGJhY2tzW2ldO1xuICAgICAgICAgICAgICAgIGVyckNiKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vZmYgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi51bnBvbGwoZW5kUG9pbnQsIHRoaXMpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHRoaXMuY3JlYXRlUmVxdWVzdCA9IGZ1bmN0aW9uKHJlbW90ZUVuZFBvaW50LCBzd2FybSl7XG4gICAgICAgIGxldCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QocmVtb3RlRW5kUG9pbnQsIHN3YXJtKTtcbiAgICAgICAgcmV0dXJuIHJlcXVlc3Q7XG4gICAgfTtcblxuICAgIC8qICoqKioqKioqKioqKioqKioqKioqKioqKioqKiBwb2xsaW5nIHpvbmUgKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgIHZhciBwb2xsU2V0ID0ge1xuICAgIH07XG5cbiAgICB2YXIgYWN0aXZlQ29ubmVjdGlvbnMgPSB7XG4gICAgfTtcblxuICAgIHRoaXMucG9sbCA9IGZ1bmN0aW9uKHJlbW90ZUVuZFBvaW50LCByZXF1ZXN0KXtcbiAgICAgICAgdmFyIHJlcXVlc3RzID0gcG9sbFNldFtyZW1vdGVFbmRQb2ludF07XG4gICAgICAgIGlmKCFyZXF1ZXN0cyl7XG4gICAgICAgICAgICByZXF1ZXN0cyA9IHt9O1xuICAgICAgICAgICAgcG9sbFNldFtyZW1vdGVFbmRQb2ludF0gPSByZXF1ZXN0cztcbiAgICAgICAgfVxuICAgICAgICByZXF1ZXN0c1tyZXF1ZXN0LmdldFJlcXVlc3RJZCgpXSA9IHJlcXVlc3Q7XG4gICAgICAgIHBvbGxpbmdIYW5kbGVyKCk7XG4gICAgfTtcblxuICAgIHRoaXMudW5wb2xsID0gZnVuY3Rpb24ocmVtb3RlRW5kUG9pbnQsIHJlcXVlc3Qpe1xuICAgICAgICB2YXIgcmVxdWVzdHMgPSBwb2xsU2V0W3JlbW90ZUVuZFBvaW50XTtcbiAgICAgICAgaWYocmVxdWVzdHMpe1xuICAgICAgICAgICAgZGVsZXRlIHJlcXVlc3RzW3JlcXVlc3QuZ2V0UmVxdWVzdElkKCldO1xuICAgICAgICAgICAgaWYoT2JqZWN0LmtleXMocmVxdWVzdHMpLmxlbmd0aCA9PT0gMCl7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHBvbGxTZXRbcmVtb3RlRW5kUG9pbnRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJVbnBvbGxpbmcgd3JvbmcgcmVxdWVzdDpcIixyZW1vdGVFbmRQb2ludCwgcmVxdWVzdCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlUG9sbFRocmVhZChyZW1vdGVFbmRQb2ludCl7XG4gICAgICAgIGZ1bmN0aW9uIHJlQXJtKCl7XG4gICAgICAgICAgICAkJC5yZW1vdGUuZG9IdHRwR2V0KHJlbW90ZUVuZFBvaW50LCBmdW5jdGlvbihlcnIsIHJlcyl7XG4gICAgICAgICAgICAgICAgbGV0IHJlcXVlc3RzID0gcG9sbFNldFtyZW1vdGVFbmRQb2ludF07XG5cbiAgICAgICAgICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICAgICAgICAgICBmb3IobGV0IHJlcV9pZCBpbiByZXF1ZXN0cyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZXJyX2hhbmRsZXIgPSByZXF1ZXN0c1tyZXFfaWRdLmRpc3BhdGNoRXJyb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihlcnJfaGFuZGxlcil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyX2hhbmRsZXIoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVDb25uZWN0aW9uc1tyZW1vdGVFbmRQb2ludF0gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGsgaW4gcmVxdWVzdHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdHNba10uZGlzcGF0Y2gobnVsbCwgcmVzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKE9iamVjdC5rZXlzKHJlcXVlc3RzKS5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlQXJtKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgYWN0aXZlQ29ubmVjdGlvbnNbcmVtb3RlRW5kUG9pbnRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFbmRpbmcgcG9sbGluZyBmb3IgXCIsIHJlbW90ZUVuZFBvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJlQXJtKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcG9sbGluZ0hhbmRsZXIoKXtcbiAgICAgICAgbGV0IHNldFRpbWVyID0gZmFsc2U7XG4gICAgICAgIGZvcih2YXIgdiBpbiBwb2xsU2V0KXtcbiAgICAgICAgICAgIGlmKCFhY3RpdmVDb25uZWN0aW9uc1t2XSl7XG4gICAgICAgICAgICAgICAgY3JlYXRlUG9sbFRocmVhZCh2KTtcbiAgICAgICAgICAgICAgICBhY3RpdmVDb25uZWN0aW9uc1t2XSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRUaW1lciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYoc2V0VGltZXIpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQocG9sbGluZ0hhbmRsZXIsIHBvbGxpbmdUaW1lT3V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldFRpbWVvdXQoIHBvbGxpbmdIYW5kbGVyLCBwb2xsaW5nVGltZU91dCk7XG59XG5cblxuZnVuY3Rpb24gZXh0cmFjdERvbWFpbkFnZW50RGV0YWlscyh1cmwpe1xuICAgIGNvbnN0IHZSZWdleCA9IC8oW2EtekEtWjAtOV0qfC4pKlxcL2FnZW50XFwvKFthLXpBLVowLTldKyhcXC8pKikrL2c7XG5cbiAgICBpZighdXJsLm1hdGNoKHZSZWdleCkpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGZvcm1hdC4gKEVnLiBkb21haW5bLnN1YmRvbWFpbl0qL2FnZW50L1tvcmdhbmlzYXRpb24vXSphZ2VudElkKVwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBkZXZpZGVyID0gXCIvYWdlbnQvXCI7XG4gICAgbGV0IGRvbWFpbjtcbiAgICBsZXQgYWdlbnRVcmw7XG5cbiAgICBjb25zdCBzcGxpdFBvaW50ID0gdXJsLmluZGV4T2YoZGV2aWRlcik7XG4gICAgaWYoc3BsaXRQb2ludCAhPT0gLTEpe1xuICAgICAgICBkb21haW4gPSB1cmwuc2xpY2UoMCwgc3BsaXRQb2ludCk7XG4gICAgICAgIGFnZW50VXJsID0gdXJsLnNsaWNlKHNwbGl0UG9pbnQrZGV2aWRlci5sZW5ndGgpO1xuICAgIH1cblxuICAgIHJldHVybiB7ZG9tYWluLCBhZ2VudFVybH07XG59XG5cbmZ1bmN0aW9uIHVybEVuZFdpdGhTbGFzaCh1cmwpe1xuXG4gICAgaWYodXJsW3VybC5sZW5ndGggLSAxXSAhPT0gXCIvXCIpe1xuICAgICAgICB1cmwgKz0gXCIvXCI7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVybDtcbn1cblxuY29uc3QgT3dNID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIikuT3dNO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKiBtYWluIEFQSXMgb24gd29ya2luZyB3aXRoIHJlbW90ZSBlbmQgcG9pbnRzICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5mdW5jdGlvbiBQc2tIdHRwQ2xpZW50KHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgb3B0aW9ucyl7XG4gICAgdmFyIGJhc2VPZlJlbW90ZUVuZFBvaW50ID0gcmVtb3RlRW5kUG9pbnQ7IC8vcmVtb3ZlIGxhc3QgaWRcblxuICAgIHJlbW90ZUVuZFBvaW50ID0gdXJsRW5kV2l0aFNsYXNoKHJlbW90ZUVuZFBvaW50KTtcblxuICAgIC8vZG9tYWluSW5mbyBjb250YWlucyAyIG1lbWJlcnM6IGRvbWFpbiAocHJpdmF0ZVNreSBkb21haW4pIGFuZCBhZ2VudFVybFxuICAgIGNvbnN0IGRvbWFpbkluZm8gPSBleHRyYWN0RG9tYWluQWdlbnREZXRhaWxzKGFnZW50VWlkKTtcbiAgICBsZXQgaG9tZVNlY3VyaXR5Q29udGV4dCA9IGRvbWFpbkluZm8uYWdlbnRVcmw7XG4gICAgbGV0IHJldHVyblJlbW90ZUVuZFBvaW50ID0gcmVtb3RlRW5kUG9pbnQ7XG5cbiAgICBpZihvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zLnJldHVyblJlbW90ZSAhPSBcInVuZGVmaW5lZFwiKXtcbiAgICAgICAgcmV0dXJuUmVtb3RlRW5kUG9pbnQgPSBvcHRpb25zLnJldHVyblJlbW90ZTtcbiAgICB9XG5cbiAgICBpZighb3B0aW9ucyB8fCBvcHRpb25zICYmICh0eXBlb2Ygb3B0aW9ucy51bmlxdWVJZCA9PSBcInVuZGVmaW5lZFwiIHx8IG9wdGlvbnMudW5pcXVlSWQpKXtcbiAgICAgICAgaG9tZVNlY3VyaXR5Q29udGV4dCArPSBcIl9cIitNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSk7XG4gICAgfVxuXG4gICAgcmV0dXJuUmVtb3RlRW5kUG9pbnQgPSB1cmxFbmRXaXRoU2xhc2gocmV0dXJuUmVtb3RlRW5kUG9pbnQpO1xuXG4gICAgdGhpcy5zdGFydFN3YXJtID0gZnVuY3Rpb24oc3dhcm1OYW1lLCBwaGFzZU5hbWUsIC4uLmFyZ3Mpe1xuICAgICAgICB2YXIgc3dhcm0gPSBuZXcgT3dNKCk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJzd2FybUlkXCIsICQkLnVpZEdlbmVyYXRvci5zYWZlX3V1aWQoKSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJyZXF1ZXN0SWRcIiwgc3dhcm0uZ2V0TWV0YShcInN3YXJtSWRcIikpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwic3dhcm1UeXBlTmFtZVwiLCBzd2FybU5hbWUpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwicGhhc2VOYW1lXCIsIHBoYXNlTmFtZSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJhcmdzXCIsIGFyZ3MpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiY29tbWFuZFwiLCBcImV4ZWN1dGVTd2FybVBoYXNlXCIpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwidGFyZ2V0XCIsIGRvbWFpbkluZm8uYWdlbnRVcmwpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiaG9tZVNlY3VyaXR5Q29udGV4dFwiLCByZXR1cm5SZW1vdGVFbmRQb2ludCskJC5yZW1vdGUuYmFzZTY0RW5jb2RlKGhvbWVTZWN1cml0eUNvbnRleHQpKTtcblxuICAgICAgICAkJC5yZW1vdGUuZG9IdHRwUG9zdChnZXRSZW1vdGUocmVtb3RlRW5kUG9pbnQsIGRvbWFpbkluZm8uZG9tYWluKSwgc3dhcm0sIGZ1bmN0aW9uKGVyciwgcmVzKXtcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlci5jcmVhdGVSZXF1ZXN0KHN3YXJtLmdldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIpLCBzd2FybSk7XG4gICAgfTtcblxuICAgIHRoaXMuY29udGludWVTd2FybSA9IGZ1bmN0aW9uKGV4aXN0aW5nU3dhcm0sIHBoYXNlTmFtZSwgLi4uYXJncyl7XG4gICAgICAgIHZhciBzd2FybSA9IG5ldyBPd00oZXhpc3RpbmdTd2FybSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJwaGFzZU5hbWVcIiwgcGhhc2VOYW1lKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImFyZ3NcIiwgYXJncyk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJjb21tYW5kXCIsIFwiZXhlY3V0ZVN3YXJtUGhhc2VcIik7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJ0YXJnZXRcIiwgZG9tYWluSW5mby5hZ2VudFVybCk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIsIHJldHVyblJlbW90ZUVuZFBvaW50KyQkLnJlbW90ZS5iYXNlNjRFbmNvZGUoaG9tZVNlY3VyaXR5Q29udGV4dCkpO1xuXG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KGdldFJlbW90ZShyZW1vdGVFbmRQb2ludCwgZG9tYWluSW5mby5kb21haW4pLCBzd2FybSwgZnVuY3Rpb24oZXJyLCByZXMpe1xuICAgICAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy9yZXR1cm4gJCQucmVtb3RlLnJlcXVlc3RNYW5hZ2VyLmNyZWF0ZVJlcXVlc3Qoc3dhcm0uZ2V0TWV0YShcImhvbWVTZWN1cml0eUNvbnRleHRcIiksIHN3YXJtKTtcbiAgICB9O1xuXG4gICAgdmFyIGFsbENhdGNoQWxscyA9IFtdO1xuICAgIHZhciByZXF1ZXN0c0NvdW50ZXIgPSAwO1xuICAgIGZ1bmN0aW9uIENhdGNoQWxsKHN3YXJtTmFtZSwgcGhhc2VOYW1lLCBjYWxsYmFjayl7IC8vc2FtZSBpbnRlcmZhY2UgYXMgUmVxdWVzdFxuICAgICAgICB2YXIgcmVxdWVzdElkID0gcmVxdWVzdHNDb3VudGVyKys7XG4gICAgICAgIHRoaXMuZ2V0UmVxdWVzdElkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGxldCByZXFJZCA9IFwic3dhcm1OYW1lXCIgKyBcInBoYXNlTmFtZVwiICsgcmVxdWVzdElkO1xuICAgICAgICAgICAgcmV0dXJuIHJlcUlkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2ggPSBmdW5jdGlvbihlcnIsIHJlc3VsdCl7XG4gICAgICAgICAgICByZXN1bHQgPSBPd00ucHJvdG90eXBlLmNvbnZlcnQoSlNPTi5wYXJzZShyZXN1bHQpKTtcbiAgICAgICAgICAgIHZhciBjdXJyZW50UGhhc2VOYW1lID0gcmVzdWx0LmdldE1ldGEoXCJwaGFzZU5hbWVcIik7XG4gICAgICAgICAgICB2YXIgY3VycmVudFN3YXJtTmFtZSA9IHJlc3VsdC5nZXRNZXRhKFwic3dhcm1UeXBlTmFtZVwiKTtcbiAgICAgICAgICAgIGlmKChjdXJyZW50U3dhcm1OYW1lID09PSBzd2FybU5hbWUgfHwgc3dhcm1OYW1lID09PSAnKicpICYmIChjdXJyZW50UGhhc2VOYW1lID09PSBwaGFzZU5hbWUgfHwgcGhhc2VOYW1lID09PSAnKicpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyciwgcmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLm9uID0gZnVuY3Rpb24oc3dhcm1OYW1lLCBwaGFzZU5hbWUsIGNhbGxiYWNrKXtcbiAgICAgICAgdmFyIGMgPSBuZXcgQ2F0Y2hBbGwoc3dhcm1OYW1lLCBwaGFzZU5hbWUsIGNhbGxiYWNrKTtcbiAgICAgICAgYWxsQ2F0Y2hBbGxzLnB1c2goe1xuICAgICAgICAgICAgczpzd2FybU5hbWUsXG4gICAgICAgICAgICBwOnBoYXNlTmFtZSxcbiAgICAgICAgICAgIGM6Y1xuICAgICAgICB9KTtcblxuICAgICAgICAkJC5yZW1vdGUucmVxdWVzdE1hbmFnZXIucG9sbChnZXRSZW1vdGUocmVtb3RlRW5kUG9pbnQsIGRvbWFpbkluZm8uZG9tYWluKSAsIGMpO1xuICAgIH07XG5cbiAgICB0aGlzLm9mZiA9IGZ1bmN0aW9uKHN3YXJtTmFtZSwgcGhhc2VOYW1lKXtcbiAgICAgICAgYWxsQ2F0Y2hBbGxzLmZvckVhY2goZnVuY3Rpb24oY2Epe1xuICAgICAgICAgICAgaWYoKGNhLnMgPT09IHN3YXJtTmFtZSB8fCBzd2FybU5hbWUgPT09ICcqJykgJiYgKHBoYXNlTmFtZSA9PT0gY2EucCB8fCBwaGFzZU5hbWUgPT09ICcqJykpe1xuICAgICAgICAgICAgICAgICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlci51bnBvbGwoZ2V0UmVtb3RlKHJlbW90ZUVuZFBvaW50LCBkb21haW5JbmZvLmRvbWFpbiksIGNhLmMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy51cGxvYWRDU0IgPSBmdW5jdGlvbihjcnlwdG9VaWQsIGJpbmFyeURhdGEsIGNhbGxiYWNrKXtcbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cFBvc3QoYmFzZU9mUmVtb3RlRW5kUG9pbnQgKyBcIi9DU0IvXCIgKyBjcnlwdG9VaWQsIGJpbmFyeURhdGEsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgdGhpcy5kb3dubG9hZENTQiA9IGZ1bmN0aW9uKGNyeXB0b1VpZCwgY2FsbGJhY2spe1xuICAgICAgICAkJC5yZW1vdGUuZG9IdHRwR2V0KGJhc2VPZlJlbW90ZUVuZFBvaW50ICsgXCIvQ1NCL1wiICsgY3J5cHRvVWlkLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGdldFJlbW90ZShiYXNlVXJsLCBkb21haW4pIHtcbiAgICAgICAgcmV0dXJuIHVybEVuZFdpdGhTbGFzaChiYXNlVXJsKSArICQkLnJlbW90ZS5iYXNlNjRFbmNvZGUoZG9tYWluKTtcbiAgICB9XG59XG5cbi8qKioqKioqKioqKioqKioqKioqKioqIGluaXRpYWxpc2F0aW9uIHN0dWZmICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5pZiAodHlwZW9mICQkID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgJCQgPSB7fTtcbn1cblxuaWYgKHR5cGVvZiAgJCQucmVtb3RlID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgJCQucmVtb3RlID0ge307XG4gICAgJCQucmVtb3RlLmNyZWF0ZVJlcXVlc3RNYW5hZ2VyID0gZnVuY3Rpb24odGltZU91dCl7XG4gICAgICAgICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlciA9IG5ldyBSZXF1ZXN0TWFuYWdlcih0aW1lT3V0KTtcbiAgICB9O1xuXG5cbiAgICAkJC5yZW1vdGUuY3J5cHRvUHJvdmlkZXIgPSBudWxsO1xuICAgICQkLnJlbW90ZS5uZXdFbmRQb2ludCA9IGZ1bmN0aW9uKGFsaWFzLCByZW1vdGVFbmRQb2ludCwgYWdlbnRVaWQsIGNyeXB0b0luZm8pe1xuICAgICAgICBpZihhbGlhcyA9PT0gXCJuZXdSZW1vdGVFbmRQb2ludFwiIHx8IGFsaWFzID09PSBcInJlcXVlc3RNYW5hZ2VyXCIgfHwgYWxpYXMgPT09IFwiY3J5cHRvUHJvdmlkZXJcIil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlBza0h0dHBDbGllbnQgVW5zYWZlIGFsaWFzIG5hbWU6XCIsIGFsaWFzKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkJC5yZW1vdGVbYWxpYXNdID0gbmV3IFBza0h0dHBDbGllbnQocmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKTtcbiAgICB9O1xuXG5cbiAgICAkJC5yZW1vdGUuZG9IdHRwUG9zdCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGNhbGxiYWNrKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlIHRoaXMhXCIpO1xuICAgIH07XG5cbiAgICAkJC5yZW1vdGUuZG9IdHRwR2V0ID0gZnVuY3Rpb24gZG9IdHRwR2V0KHVybCwgY2FsbGJhY2spe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgdGhpcyFcIik7XG4gICAgfTtcblxuICAgICQkLnJlbW90ZS5iYXNlNjRFbmNvZGUgPSBmdW5jdGlvbiBiYXNlNjRFbmNvZGUoc3RyaW5nVG9FbmNvZGUpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgdGhpcyFcIik7XG4gICAgfTtcblxuICAgICQkLnJlbW90ZS5iYXNlNjREZWNvZGUgPSBmdW5jdGlvbiBiYXNlNjREZWNvZGUoZW5jb2RlZFN0cmluZyl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSB0aGlzIVwiKTtcbiAgICB9O1xufVxuXG5cblxuLyogIGludGVyZmFjZVxuZnVuY3Rpb24gQ3J5cHRvUHJvdmlkZXIoKXtcblxuICAgIHRoaXMuZ2VuZXJhdGVTYWZlVWlkID0gZnVuY3Rpb24oKXtcblxuICAgIH1cblxuICAgIHRoaXMuc2lnblN3YXJtID0gZnVuY3Rpb24oc3dhcm0sIGFnZW50KXtcblxuICAgIH1cbn0gKi9cbiIsIiQkLnJlbW90ZS5kb0h0dHBQb3N0ID0gZnVuY3Rpb24gKHVybCwgZGF0YSwgY2FsbGJhY2spIHtcblxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PSA0ICYmIHhoci5zdGF0dXMgPT0gXCIyMDBcIikge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB4aHIucmVzcG9uc2U7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCBkYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmKHhoci5zdGF0dXM+PTQwMCl7XG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJBbiBlcnJvciBvY2N1cmVkLiBTdGF0dXNDb2RlOiBcIiArIHhoci5zdGF0dXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB4aHIub3BlbihcIlBPU1RcIiwgdXJsLCB0cnVlKTtcbiAgICAvL3hoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04XCIpO1xuXG4gICAgaWYoZGF0YSAmJiBkYXRhLnBpcGUgJiYgdHlwZW9mIGRhdGEucGlwZSA9PT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgdmFyIGJ1ZmZlcnMgPSBbXTtcbiAgICAgICAgZGF0YS5vbihcImRhdGFcIiwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgYnVmZmVycy5wdXNoKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgZGF0YS5vbihcImVuZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBhY3R1YWxDb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoYnVmZmVycyk7XG4gICAgICAgICAgICB4aHIuc2VuZChhY3R1YWxDb250ZW50cyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgICB4aHIuc2VuZChkYXRhKTtcbiAgICB9XG59O1xuXG5cbiQkLnJlbW90ZS5kb0h0dHBHZXQgPSBmdW5jdGlvbiBkb0h0dHBHZXQodXJsLCBjYWxsYmFjaykge1xuXG4gICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy9jaGVjayBpZiBoZWFkZXJzIHdlcmUgcmVjZWl2ZWQgYW5kIGlmIGFueSBhY3Rpb24gc2hvdWxkIGJlIHBlcmZvcm1lZCBiZWZvcmUgcmVjZWl2aW5nIGRhdGFcbiAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSAyKSB7XG4gICAgICAgICAgICB2YXIgY29udGVudFR5cGUgPSB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoXCJDb250ZW50LVR5cGVcIik7XG4gICAgICAgICAgICBpZiAoY29udGVudFR5cGUgPT09IFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCIpIHtcbiAgICAgICAgICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09IDQgJiYgeGhyLnN0YXR1cyA9PSBcIjIwMFwiKSB7XG4gICAgICAgICAgICB2YXIgY29udGVudFR5cGUgPSB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoXCJDb250ZW50LVR5cGVcIik7XG5cbiAgICAgICAgICAgIGlmKGNvbnRlbnRUeXBlPT09XCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIil7XG4gICAgICAgICAgICAgICAgbGV0IHJlc3BvbnNlQnVmZmVyID0gQnVmZmVyLmZyb20odGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzcG9uc2VCdWZmZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB4aHIucmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJBbiBlcnJvciBvY2N1cmVkLiBTdGF0dXNDb2RlOiBcIiArIHhoci5zdGF0dXMpKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB4aHIub3BlbihcIkdFVFwiLCB1cmwpO1xuICAgIHhoci5zZW5kKCk7XG59O1xuXG5cbmZ1bmN0aW9uIENyeXB0b1Byb3ZpZGVyKCl7XG5cbiAgICB0aGlzLmdlbmVyYXRlU2FmZVVpZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGxldCB1aWQgPSBcIlwiO1xuICAgICAgICB2YXIgYXJyYXkgPSBuZXcgVWludDMyQXJyYXkoMTApO1xuICAgICAgICB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhhcnJheSk7XG5cblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB1aWQgKz0gYXJyYXlbaV0udG9TdHJpbmcoMTYpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHVpZDtcbiAgICB9XG5cbiAgICB0aGlzLnNpZ25Td2FybSA9IGZ1bmN0aW9uKHN3YXJtLCBhZ2VudCl7XG4gICAgICAgIHN3YXJtLm1ldGEuc2lnbmF0dXJlID0gYWdlbnQ7XG4gICAgfVxufVxuXG5cblxuJCQucmVtb3RlLmNyeXB0b1Byb3ZpZGVyID0gbmV3IENyeXB0b1Byb3ZpZGVyKCk7XG5cbiQkLnJlbW90ZS5iYXNlNjRFbmNvZGUgPSBmdW5jdGlvbiBiYXNlNjRFbmNvZGUoc3RyaW5nVG9FbmNvZGUpe1xuICAgIHJldHVybiB3aW5kb3cuYnRvYShzdHJpbmdUb0VuY29kZSk7XG59O1xuXG4kJC5yZW1vdGUuYmFzZTY0RGVjb2RlID0gZnVuY3Rpb24gYmFzZTY0RGVjb2RlKGVuY29kZWRTdHJpbmcpe1xuICAgIHJldHVybiB3aW5kb3cuYXRvYihlbmNvZGVkU3RyaW5nKTtcbn07XG4iLCJyZXF1aXJlKFwiLi9wc2stYWJzdHJhY3QtY2xpZW50XCIpO1xuXG5jb25zdCBodHRwID0gcmVxdWlyZShcImh0dHBcIik7XG5jb25zdCBodHRwcyA9IHJlcXVpcmUoXCJodHRwc1wiKTtcbmNvbnN0IFVSTCA9IHJlcXVpcmUoXCJ1cmxcIik7XG5jb25zdCB1c2VyQWdlbnQgPSAnUFNLIE5vZGVBZ2VudC8wLjAuMSc7XG5cbmNvbnNvbGUubG9nKFwiUFNLIG5vZGUgY2xpZW50IGxvYWRpbmdcIik7XG5cbmZ1bmN0aW9uIGdldE5ldHdvcmtGb3JPcHRpb25zKG9wdGlvbnMpIHtcblx0aWYob3B0aW9ucy5wcm90b2NvbCA9PT0gJ2h0dHA6Jykge1xuXHRcdHJldHVybiBodHRwO1xuXHR9IGVsc2UgaWYob3B0aW9ucy5wcm90b2NvbCA9PT0gJ2h0dHBzOicpIHtcblx0XHRyZXR1cm4gaHR0cHM7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBDYW4ndCBoYW5kbGUgcHJvdG9jb2wgJHtvcHRpb25zLnByb3RvY29sfWApO1xuXHR9XG5cbn1cblxuJCQucmVtb3RlLmRvSHR0cFBvc3QgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBjYWxsYmFjayl7XG5cdGNvbnN0IGlubmVyVXJsID0gVVJMLnBhcnNlKHVybCk7XG5cblx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRob3N0bmFtZTogaW5uZXJVcmwuaG9zdG5hbWUsXG5cdFx0cGF0aDogaW5uZXJVcmwucGF0aG5hbWUsXG5cdFx0cG9ydDogcGFyc2VJbnQoaW5uZXJVcmwucG9ydCksXG5cdFx0aGVhZGVyczoge1xuXHRcdFx0J1VzZXItQWdlbnQnOiB1c2VyQWdlbnRcblx0XHR9LFxuXHRcdG1ldGhvZDogJ1BPU1QnXG5cdH07XG5cblx0Y29uc3QgbmV0d29yayA9IGdldE5ldHdvcmtGb3JPcHRpb25zKGlubmVyVXJsKTtcblxuXHRjb25zdCByZXEgPSBuZXR3b3JrLnJlcXVlc3Qob3B0aW9ucywgKHJlcykgPT4ge1xuXHRcdGNvbnN0IHsgc3RhdHVzQ29kZSB9ID0gcmVzO1xuXG5cdFx0bGV0IGVycm9yO1xuXHRcdGlmIChzdGF0dXNDb2RlID49IDQwMCkge1xuXHRcdFx0ZXJyb3IgPSBuZXcgRXJyb3IoJ1JlcXVlc3QgRmFpbGVkLlxcbicgK1xuXHRcdFx0XHRgU3RhdHVzIENvZGU6ICR7c3RhdHVzQ29kZX1gKTtcblx0XHR9XG5cblx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdGNhbGxiYWNrKGVycm9yKTtcblx0XHRcdC8vIGZyZWUgdXAgbWVtb3J5XG5cdFx0XHRyZXMucmVzdW1lKCk7XG5cdFx0XHRyZXR1cm4gO1xuXHRcdH1cblxuXHRcdGxldCByYXdEYXRhID0gJyc7XG5cdFx0cmVzLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7IHJhd0RhdGEgKz0gY2h1bms7IH0pO1xuXHRcdHJlcy5vbignZW5kJywgKCkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIHJhd0RhdGEpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KS5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlBPU1QgRXJyb3JcIiwgZXJyb3IpO1xuXHRcdGNhbGxiYWNrKGVycm9yKTtcblx0fSk7XG5cbiAgICBpZihkYXRhICYmIGRhdGEucGlwZSAmJiB0eXBlb2YgZGF0YS5waXBlID09PSBcImZ1bmN0aW9uXCIpe1xuICAgICAgICBkYXRhLnBpcGUocmVxKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmKHR5cGVvZiBkYXRhICE9PSAnc3RyaW5nJyAmJiAhQnVmZmVyLmlzQnVmZmVyKGRhdGEpKSB7XG5cdFx0ZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuXHR9XG5cblx0cmVxLndyaXRlKGRhdGEpO1xuXHRyZXEuZW5kKCk7XG59O1xuXG4kJC5yZW1vdGUuZG9IdHRwR2V0ID0gZnVuY3Rpb24gZG9IdHRwR2V0KHVybCwgY2FsbGJhY2spe1xuICAgIGNvbnN0IGlubmVyVXJsID0gVVJMLnBhcnNlKHVybCk7XG5cblx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRob3N0bmFtZTogaW5uZXJVcmwuaG9zdG5hbWUsXG5cdFx0cGF0aDogaW5uZXJVcmwucGF0aG5hbWUgKyAoaW5uZXJVcmwuc2VhcmNoIHx8ICcnKSxcblx0XHRwb3J0OiBwYXJzZUludChpbm5lclVybC5wb3J0KSxcblx0XHRoZWFkZXJzOiB7XG5cdFx0XHQnVXNlci1BZ2VudCc6IHVzZXJBZ2VudFxuXHRcdH0sXG5cdFx0bWV0aG9kOiAnR0VUJ1xuXHR9O1xuXG5cdGNvbnN0IG5ldHdvcmsgPSBnZXROZXR3b3JrRm9yT3B0aW9ucyhpbm5lclVybCk7XG5cblx0Y29uc3QgcmVxID0gbmV0d29yay5yZXF1ZXN0KG9wdGlvbnMsIChyZXMpID0+IHtcblx0XHRjb25zdCB7IHN0YXR1c0NvZGUgfSA9IHJlcztcblxuXHRcdGxldCBlcnJvcjtcblx0XHRpZiAoc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG5cdFx0XHRlcnJvciA9IG5ldyBFcnJvcignUmVxdWVzdCBGYWlsZWQuXFxuJyArXG5cdFx0XHRcdGBTdGF0dXMgQ29kZTogJHtzdGF0dXNDb2RlfWApO1xuXHRcdFx0ZXJyb3IuY29kZSA9IHN0YXR1c0NvZGU7XG5cdFx0fVxuXG5cdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRjYWxsYmFjayhlcnJvcik7XG5cdFx0XHQvLyBmcmVlIHVwIG1lbW9yeVxuXHRcdFx0cmVzLnJlc3VtZSgpO1xuXHRcdFx0cmV0dXJuIDtcblx0XHR9XG5cblx0XHRsZXQgcmF3RGF0YTtcblx0XHRjb25zdCBjb250ZW50VHlwZSA9IHJlcy5oZWFkZXJzWydjb250ZW50LXR5cGUnXTtcblxuXHRcdGlmKGNvbnRlbnRUeXBlID09PSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiKXtcblx0XHRcdHJhd0RhdGEgPSBbXTtcblx0XHR9ZWxzZXtcblx0XHRcdHJhd0RhdGEgPSAnJztcblx0XHR9XG5cblx0XHRyZXMub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcblx0XHRcdGlmKEFycmF5LmlzQXJyYXkocmF3RGF0YSkpe1xuXHRcdFx0XHRyYXdEYXRhLnB1c2goLi4uY2h1bmspO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHJhd0RhdGEgKz0gY2h1bms7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmVzLm9uKCdlbmQnLCAoKSA9PiB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZihBcnJheS5pc0FycmF5KHJhd0RhdGEpKXtcblx0XHRcdFx0XHRyYXdEYXRhID0gQnVmZmVyLmZyb20ocmF3RGF0YSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIHJhd0RhdGEpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ2xpZW50IGVycm9yOlwiLCBlcnIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHRyZXEub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcblx0XHRpZihlcnJvciAmJiBlcnJvci5jb2RlICE9PSAnRUNPTk5SRVNFVCcpe1xuICAgICAgICBcdGNvbnNvbGUubG9nKFwiR0VUIEVycm9yXCIsIGVycm9yKTtcblx0XHR9XG5cblx0XHRjYWxsYmFjayhlcnJvcik7XG5cdH0pO1xuXG5cdHJlcS5lbmQoKTtcbn07XG5cbiQkLnJlbW90ZS5iYXNlNjRFbmNvZGUgPSBmdW5jdGlvbiBiYXNlNjRFbmNvZGUoc3RyaW5nVG9FbmNvZGUpe1xuICAgIHJldHVybiBCdWZmZXIuZnJvbShzdHJpbmdUb0VuY29kZSkudG9TdHJpbmcoJ2Jhc2U2NCcpO1xufTtcblxuJCQucmVtb3RlLmJhc2U2NERlY29kZSA9IGZ1bmN0aW9uIGJhc2U2NERlY29kZShlbmNvZGVkU3RyaW5nKXtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20oZW5jb2RlZFN0cmluZywgJ2Jhc2U2NCcpLnRvU3RyaW5nKCdhc2NpaScpO1xufTsiLCJjb25zdCBjb25zVXRpbCA9IHJlcXVpcmUoJ3NpZ25zZW5zdXMnKS5jb25zVXRpbDtcbmNvbnN0IGJlZXNIZWFsZXIgPSByZXF1aXJlKFwic3dhcm11dGlsc1wiKS5iZWVzSGVhbGVyO1xuXG5mdW5jdGlvbiBCbG9ja2NoYWluKHBkcykge1xuICAgIGxldCBzd2FybSA9IG51bGw7XG5cbiAgICB0aGlzLmJlZ2luVHJhbnNhY3Rpb24gPSBmdW5jdGlvbiAodHJhbnNhY3Rpb25Td2FybSkge1xuICAgICAgICBpZiAoIXRyYW5zYWN0aW9uU3dhcm0pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBzd2FybScpO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dhcm0gPSB0cmFuc2FjdGlvblN3YXJtO1xuICAgICAgICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uKHBkcy5nZXRIYW5kbGVyKCkpO1xuICAgIH07XG5cbiAgICB0aGlzLmNvbW1pdCA9IGZ1bmN0aW9uICh0cmFuc2FjdGlvbikge1xuXG4gICAgICAgIGNvbnN0IGRpZmYgPSBwZHMuY29tcHV0ZVN3YXJtVHJhbnNhY3Rpb25EaWZmKHN3YXJtLCB0cmFuc2FjdGlvbi5nZXRIYW5kbGVyKCkpO1xuICAgICAgICBjb25zdCB0ID0gY29uc1V0aWwuY3JlYXRlVHJhbnNhY3Rpb24oMCwgZGlmZik7XG4gICAgICAgIGNvbnN0IHNldCA9IHt9O1xuICAgICAgICBzZXRbdC5kaWdlc3RdID0gdDtcbiAgICAgICAgcGRzLmNvbW1pdChzZXQsIDEpO1xuICAgIH07XG59XG5cblxuZnVuY3Rpb24gVHJhbnNhY3Rpb24ocGRzSGFuZGxlcikge1xuICAgIGNvbnN0IEFMSUFTRVMgPSAnL2FsaWFzZXMnO1xuXG5cbiAgICB0aGlzLmFkZCA9IGZ1bmN0aW9uIChhc3NldCkge1xuICAgICAgICBjb25zdCBzd2FybVR5cGVOYW1lID0gYXNzZXQuZ2V0TWV0YWRhdGEoJ3N3YXJtVHlwZU5hbWUnKTtcbiAgICAgICAgY29uc3Qgc3dhcm1JZCA9IGFzc2V0LmdldE1ldGFkYXRhKCdzd2FybUlkJyk7XG5cbiAgICAgICAgY29uc3QgYWxpYXNJbmRleCA9IG5ldyBBbGlhc0luZGV4KHN3YXJtVHlwZU5hbWUpO1xuICAgICAgICBpZiAoYXNzZXQuYWxpYXMgJiYgYWxpYXNJbmRleC5nZXRVaWQoYXNzZXQuYWxpYXMpICE9PSBzd2FybUlkKSB7XG4gICAgICAgICAgICBhbGlhc0luZGV4LmNyZWF0ZShhc3NldC5hbGlhcywgc3dhcm1JZCk7XG4gICAgICAgIH1cblxuICAgICAgICBhc3NldC5zZXRNZXRhZGF0YSgncGVyc2lzdGVkJywgdHJ1ZSk7XG4gICAgICAgIGNvbnN0IHNlcmlhbGl6ZWRTd2FybSA9IGJlZXNIZWFsZXIuYXNKU09OKGFzc2V0LCBudWxsLCBudWxsKTtcblxuICAgICAgICBwZHNIYW5kbGVyLndyaXRlS2V5KHN3YXJtVHlwZU5hbWUgKyAnLycgKyBzd2FybUlkLCBKKHNlcmlhbGl6ZWRTd2FybSkpO1xuICAgIH07XG5cbiAgICB0aGlzLmxvb2t1cCA9IGZ1bmN0aW9uIChhc3NldFR5cGUsIGFpZCkgeyAvLyBhbGlhcyBzYXUgaWRcbiAgICAgICAgbGV0IGxvY2FsVWlkID0gYWlkO1xuXG4gICAgICAgIGlmIChoYXNBbGlhc2VzKGFzc2V0VHlwZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGFsaWFzSW5kZXggPSBuZXcgQWxpYXNJbmRleChhc3NldFR5cGUpO1xuICAgICAgICAgICAgbG9jYWxVaWQgPSBhbGlhc0luZGV4LmdldFVpZChhaWQpIHx8IGFpZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHZhbHVlID0gcGRzSGFuZGxlci5yZWFkS2V5KGFzc2V0VHlwZSArICcvJyArIGxvY2FsVWlkKTtcblxuICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gJCQuYXNzZXQuc3RhcnQoYXNzZXRUeXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHN3YXJtID0gJCQuYXNzZXQuY29udGludWUoYXNzZXRUeXBlLCBKU09OLnBhcnNlKHZhbHVlKSk7XG4gICAgICAgICAgICBzd2FybS5zZXRNZXRhZGF0YShcInBlcnNpc3RlZFwiLCB0cnVlKTtcbiAgICAgICAgICAgIHJldHVybiBzd2FybTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmxvYWRBc3NldHMgPSBmdW5jdGlvbiAoYXNzZXRUeXBlKSB7XG4gICAgICAgIGNvbnN0IGFzc2V0cyA9IFtdO1xuXG4gICAgICAgIGNvbnN0IGFsaWFzSW5kZXggPSBuZXcgQWxpYXNJbmRleChhc3NldFR5cGUpO1xuICAgICAgICBPYmplY3Qua2V5cyhhbGlhc0luZGV4LmdldEFsaWFzZXMoKSkuZm9yRWFjaCgoYWxpYXMpID0+IHtcbiAgICAgICAgICAgIGFzc2V0cy5wdXNoKHRoaXMubG9va3VwKGFzc2V0VHlwZSwgYWxpYXMpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGFzc2V0cztcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRIYW5kbGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gcGRzSGFuZGxlcjtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFzQWxpYXNlcyhzcGFjZU5hbWUpIHtcbiAgICAgICAgcmV0dXJuICEhcGRzSGFuZGxlci5yZWFkS2V5KHNwYWNlTmFtZSArIEFMSUFTRVMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIEFsaWFzSW5kZXgoYXNzZXRUeXBlKSB7XG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKGFsaWFzLCB1aWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0QWxpYXNlcyA9IHRoaXMuZ2V0QWxpYXNlcygpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGFzc2V0QWxpYXNlc1thbGlhc10gIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAkJC5lcnJvckhhbmRsZXIudGhyb3dFcnJvcihuZXcgRXJyb3IoYEFsaWFzICR7YWxpYXN9IGZvciBhc3NldHMgb2YgdHlwZSAke2Fzc2V0VHlwZX0gYWxyZWFkeSBleGlzdHNgKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFzc2V0QWxpYXNlc1thbGlhc10gPSB1aWQ7XG5cbiAgICAgICAgICAgIHBkc0hhbmRsZXIud3JpdGVLZXkoYXNzZXRUeXBlICsgQUxJQVNFUywgSihhc3NldEFsaWFzZXMpKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldFVpZCA9IGZ1bmN0aW9uIChhbGlhcykge1xuICAgICAgICAgICAgY29uc3QgYXNzZXRBbGlhc2VzID0gdGhpcy5nZXRBbGlhc2VzKCk7XG4gICAgICAgICAgICByZXR1cm4gYXNzZXRBbGlhc2VzW2FsaWFzXTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldEFsaWFzZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsZXQgYWxpYXNlcyA9IHBkc0hhbmRsZXIucmVhZEtleShhc3NldFR5cGUgKyBBTElBU0VTKTtcbiAgICAgICAgICAgIHJldHVybiBhbGlhc2VzID8gSlNPTi5wYXJzZShhbGlhc2VzKSA6IHt9O1xuICAgICAgICB9O1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCbG9ja2NoYWluOyIsInZhciBtZW1vcnlQRFMgPSByZXF1aXJlKFwiLi9Jbk1lbW9yeVBEU1wiKTtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5cblxuZnVuY3Rpb24gRm9sZGVyUGVyc2lzdGVudFBEUyhmb2xkZXIpIHtcbiAgICB0aGlzLm1lbUNhY2hlID0gbWVtb3J5UERTLm5ld1BEUyh0aGlzKTtcblxuICAgIGZ1bmN0aW9uIG1rU2luZ2xlTGluZShzdHIpIHtcbiAgICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bXFxuXFxyXS9nLCBcIlwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlQ3VycmVudFZhbHVlRmlsZW5hbWUoKSB7XG4gICAgICAgIHJldHVybiBwYXRoLm5vcm1hbGl6ZShmb2xkZXIgKyAnL2N1cnJlbnRWZXJzaW9uJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Q3VycmVudFZhbHVlKHBhdGgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmKCFmcy5leGlzdHNTeW5jKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYXRoKS50b1N0cmluZygpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Vycm9yICcsIGUpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnBlcnNpc3QgPSBmdW5jdGlvbiAodHJhbnNhY3Rpb25Mb2csIGN1cnJlbnRWYWx1ZXMsIGN1cnJlbnRQdWxzZSkge1xuXG4gICAgICAgIHRyYW5zYWN0aW9uTG9nLmN1cnJlbnRQdWxzZSA9IGN1cnJlbnRQdWxzZTtcbiAgICAgICAgdHJhbnNhY3Rpb25Mb2cgPSBta1NpbmdsZUxpbmUoSlNPTi5zdHJpbmdpZnkodHJhbnNhY3Rpb25Mb2cpKSArIFwiXFxuXCI7XG5cbiAgICAgICAgZnMubWtkaXIoZm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgZnVuY3Rpb24gKGVyciwgcmVzKSB7XG4gICAgICAgICAgICBpZiAoZXJyICYmIGVyci5jb2RlICE9PSBcIkVFWElTVFwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmcy5hcHBlbmRGaWxlU3luYyhmb2xkZXIgKyAnL3RyYW5zYWN0aW9uc0xvZycsIHRyYW5zYWN0aW9uTG9nLCAndXRmOCcpO1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhtYWtlQ3VycmVudFZhbHVlRmlsZW5hbWUoKSwgSlNPTi5zdHJpbmdpZnkoY3VycmVudFZhbHVlcywgbnVsbCwgMSkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgY29uc3QgaW5uZXJWYWx1ZXMgPSBnZXRDdXJyZW50VmFsdWUobWFrZUN1cnJlbnRWYWx1ZUZpbGVuYW1lKCkpO1xuICAgIHRoaXMubWVtQ2FjaGUuaW5pdGlhbGlzZShpbm5lclZhbHVlcyk7XG59XG5cbmV4cG9ydHMubmV3UERTID0gZnVuY3Rpb24gKGZvbGRlcikge1xuICAgIGNvbnN0IHBkcyA9IG5ldyBGb2xkZXJQZXJzaXN0ZW50UERTKGZvbGRlcik7XG4gICAgcmV0dXJuIHBkcy5tZW1DYWNoZTtcbn07XG4iLCJcbnZhciBjdXRpbCAgID0gcmVxdWlyZShcIi4uLy4uL3NpZ25zZW5zdXMvbGliL2NvbnNVdGlsXCIpO1xudmFyIHNzdXRpbCAgPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuXG5cbmZ1bmN0aW9uIFN0b3JhZ2UocGFyZW50U3RvcmFnZSl7XG4gICAgdmFyIGNzZXQgICAgICAgICAgICA9IHt9OyAgLy8gY29udGFpbmVzIGFsbCBrZXlzIGluIHBhcmVudCBzdG9yYWdlLCBjb250YWlucyBvbmx5IGtleXMgdG91Y2hlZCBpbiBoYW5kbGVyc1xuICAgIHZhciB3cml0ZVNldCAgICAgICAgPSAhcGFyZW50U3RvcmFnZSA/IGNzZXQgOiB7fTsgICAvL2NvbnRhaW5zIG9ubHkga2V5cyBtb2RpZmllZCBpbiBoYW5kbGVyc1xuXG4gICAgdmFyIHJlYWRTZXRWZXJzaW9ucyAgPSB7fTsgLy9tZWFuaW5nZnVsIG9ubHkgaW4gaGFuZGxlcnNcbiAgICB2YXIgd3JpdGVTZXRWZXJzaW9ucyA9IHt9OyAvL3dpbGwgc3RvcmUgYWxsIHZlcnNpb25zIGdlbmVyYXRlZCBieSB3cml0ZUtleVxuXG4gICAgdmFyIHZzZCAgICAgICAgICAgICA9IFwiZW1wdHlcIjsgLy9vbmx5IGZvciBwYXJlbnQgc3RvcmFnZVxuICAgIHZhciBwcmV2aW91c1ZTRCAgICAgPSBudWxsO1xuXG4gICAgdmFyIG15Q3VycmVudFB1bHNlICAgID0gMDtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cblxuICAgIGZ1bmN0aW9uIGhhc0xvY2FsS2V5KG5hbWUpe1xuICAgICAgICByZXR1cm4gY3NldC5oYXNPd25Qcm9wZXJ0eShuYW1lKTtcbiAgICB9XG5cbiAgICB0aGlzLmhhc0tleSA9IGZ1bmN0aW9uKG5hbWUpe1xuICAgICAgICByZXR1cm4gcGFyZW50U3RvcmFnZSA/IHBhcmVudFN0b3JhZ2UuaGFzS2V5KG5hbWUpIDogaGFzTG9jYWxLZXkobmFtZSk7XG4gICAgfTtcblxuICAgIHRoaXMucmVhZEtleSA9IGZ1bmN0aW9uIHJlYWRLZXkobmFtZSl7XG4gICAgICAgIHZhciB2YWx1ZTtcbiAgICAgICAgaWYoaGFzTG9jYWxLZXkobmFtZSkpe1xuICAgICAgICAgICAgdmFsdWUgPSBjc2V0W25hbWVdO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGlmKHRoaXMuaGFzS2V5KG5hbWUpKXtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHBhcmVudFN0b3JhZ2UucmVhZEtleShuYW1lKTtcbiAgICAgICAgICAgICAgICBjc2V0W25hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcmVhZFNldFZlcnNpb25zW25hbWVdID0gcGFyZW50U3RvcmFnZS5nZXRWZXJzaW9uKG5hbWUpO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgY3NldFtuYW1lXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZWFkU2V0VmVyc2lvbnNbbmFtZV0gPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd3JpdGVTZXRWZXJzaW9uc1tuYW1lXSA9IHJlYWRTZXRWZXJzaW9uc1tuYW1lXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VmVyc2lvbiA9IGZ1bmN0aW9uKG5hbWUsIHJlYWxWZXJzaW9uKXtcbiAgICAgICAgdmFyIHZlcnNpb24gPSAwO1xuICAgICAgICBpZihoYXNMb2NhbEtleShuYW1lKSl7XG4gICAgICAgICAgICB2ZXJzaW9uID0gcmVhZFNldFZlcnNpb25zW25hbWVdO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGlmKHRoaXMuaGFzS2V5KG5hbWUpKXtcbiAgICAgICAgICAgICAgICBjc2V0W25hbWVdID0gcGFyZW50U3RvcmFnZS5yZWFkS2V5KCk7XG4gICAgICAgICAgICAgICAgdmVyc2lvbiA9IHJlYWRTZXRWZXJzaW9uc1tuYW1lXSA9IHBhcmVudFN0b3JhZ2UuZ2V0VmVyc2lvbihuYW1lKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGNzZXRbbmFtZV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmVhZFNldFZlcnNpb25zW25hbWVdID0gdmVyc2lvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmVyc2lvbjtcbiAgICB9O1xuXG4gICAgdGhpcy53cml0ZUtleSA9IGZ1bmN0aW9uIG1vZGlmeUtleShuYW1lLCB2YWx1ZSl7XG4gICAgICAgIHZhciBrID0gdGhpcy5yZWFkS2V5KG5hbWUpOyAvL1RPRE86IHVudXNlZCB2YXJcblxuICAgICAgICBjc2V0IFtuYW1lXSA9IHZhbHVlO1xuICAgICAgICB3cml0ZVNldFZlcnNpb25zW25hbWVdKys7XG4gICAgICAgIHdyaXRlU2V0W25hbWVdID0gdmFsdWU7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SW5wdXRPdXRwdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpbnB1dDogcmVhZFNldFZlcnNpb25zLFxuICAgICAgICAgICAgb3V0cHV0OiB3cml0ZVNldFxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB0aGlzLmdldEludGVybmFsVmFsdWVzID0gZnVuY3Rpb24oY3VycmVudFB1bHNlLCB1cGRhdGVQcmV2aW91c1ZTRCl7XG4gICAgICAgIGlmKHVwZGF0ZVByZXZpb3VzVlNEKXtcbiAgICAgICAgICAgIG15Q3VycmVudFB1bHNlID0gY3VycmVudFB1bHNlO1xuICAgICAgICAgICAgcHJldmlvdXNWU0QgPSB2c2Q7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNzZXQ6Y3NldCxcbiAgICAgICAgICAgIHdyaXRlU2V0VmVyc2lvbnM6d3JpdGVTZXRWZXJzaW9ucyxcbiAgICAgICAgICAgIHByZXZpb3VzVlNEOnByZXZpb3VzVlNELFxuICAgICAgICAgICAgdnNkOnZzZCxcbiAgICAgICAgICAgIGN1cnJlbnRQdWxzZTpjdXJyZW50UHVsc2VcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdGhpcy5pbml0aWFsaXNlSW50ZXJuYWxWYWx1ZSA9IGZ1bmN0aW9uKHN0b3JlZFZhbHVlcyl7XG4gICAgICAgIGlmKCFzdG9yZWRWYWx1ZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNzZXQgPSBzdG9yZWRWYWx1ZXMuY3NldDtcbiAgICAgICAgd3JpdGVTZXRWZXJzaW9ucyA9IHN0b3JlZFZhbHVlcy53cml0ZVNldFZlcnNpb25zO1xuICAgICAgICB2c2QgPSBzdG9yZWRWYWx1ZXMudnNkO1xuICAgICAgICB3cml0ZVNldCA9IGNzZXQ7XG4gICAgICAgIG15Q3VycmVudFB1bHNlID0gc3RvcmVkVmFsdWVzLmN1cnJlbnRQdWxzZTtcbiAgICAgICAgcHJldmlvdXNWU0QgPSBzdG9yZWRWYWx1ZXMucHJldmlvdXNWU0Q7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGFwcGx5VHJhbnNhY3Rpb24odCl7XG4gICAgICAgIGZvcihsZXQgayBpbiB0Lm91dHB1dCl7IFxuICAgICAgICAgICAgaWYoIXQuaW5wdXQuaGFzT3duUHJvcGVydHkoaykpe1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IobGV0IGwgaW4gdC5pbnB1dCl7XG4gICAgICAgICAgICB2YXIgdHJhbnNhY3Rpb25WZXJzaW9uID0gdC5pbnB1dFtsXTtcbiAgICAgICAgICAgIHZhciBjdXJyZW50VmVyc2lvbiA9IHNlbGYuZ2V0VmVyc2lvbihsKTtcbiAgICAgICAgICAgIGlmKHRyYW5zYWN0aW9uVmVyc2lvbiAhPT0gY3VycmVudFZlcnNpb24pe1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobCwgdHJhbnNhY3Rpb25WZXJzaW9uICwgY3VycmVudFZlcnNpb24pO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvcihsZXQgdiBpbiB0Lm91dHB1dCl7XG4gICAgICAgICAgICBzZWxmLndyaXRlS2V5KHYsIHQub3V0cHV0W3ZdKTtcbiAgICAgICAgfVxuXG5cdFx0dmFyIGFyciA9IHByb2Nlc3MuaHJ0aW1lKCk7XG5cdFx0dmFyIGN1cnJlbnRfc2Vjb25kID0gYXJyWzBdO1xuXHRcdHZhciBkaWZmID0gY3VycmVudF9zZWNvbmQtdC5zZWNvbmQ7XG5cblx0XHRnbG9iYWxbXCJUcmFuemFjdGlvbnNfVGltZVwiXSs9ZGlmZjtcblxuXHRcdHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuY29tcHV0ZVBUQmxvY2sgPSBmdW5jdGlvbihuZXh0QmxvY2tTZXQpeyAgIC8vbWFrZSBhIHRyYW5zYWN0aW9ucyBibG9jayBmcm9tIG5leHRCbG9ja1NldCBieSByZW1vdmluZyBpbnZhbGlkIHRyYW5zYWN0aW9ucyBmcm9tIHRoZSBrZXkgdmVyc2lvbnMgcG9pbnQgb2Ygdmlld1xuICAgICAgICB2YXIgdmFsaWRCbG9jayA9IFtdO1xuICAgICAgICB2YXIgb3JkZXJlZEJ5VGltZSA9IGN1dGlsLm9yZGVyVHJhbnNhY3Rpb25zKG5leHRCbG9ja1NldCk7XG4gICAgICAgIHZhciBpID0gMDtcblxuICAgICAgICB3aGlsZShpIDwgb3JkZXJlZEJ5VGltZS5sZW5ndGgpe1xuICAgICAgICAgICAgdmFyIHQgPSBvcmRlcmVkQnlUaW1lW2ldO1xuICAgICAgICAgICAgaWYoYXBwbHlUcmFuc2FjdGlvbih0KSl7XG4gICAgICAgICAgICAgICAgdmFsaWRCbG9jay5wdXNoKHQuZGlnZXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsaWRCbG9jaztcbiAgICB9O1xuXG4gICAgdGhpcy5jb21taXQgPSBmdW5jdGlvbihibG9ja1NldCl7XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgdmFyIG9yZGVyZWRCeVRpbWUgPSBjdXRpbC5vcmRlclRyYW5zYWN0aW9ucyhibG9ja1NldCk7XG5cbiAgICAgICAgd2hpbGUoaSA8IG9yZGVyZWRCeVRpbWUubGVuZ3RoKXtcbiAgICAgICAgICAgIHZhciB0ID0gb3JkZXJlZEJ5VGltZVtpXTtcbiAgICAgICAgICAgIGlmKCFhcHBseVRyYW5zYWN0aW9uKHQpKXsgLy9wYXJhbm9pZCBjaGVjaywgIGZhaWwgdG8gd29yayBpZiBhIG1ham9yaXR5IGlzIGNvcnJ1cHRlZFxuICAgICAgICAgICAgICAgIC8vcHJldHR5IGJhZFxuICAgICAgICAgICAgICAgIC8vdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGNvbW1pdCBhbiBpbnZhbGlkIGJsb2NrLiBUaGlzIGNvdWxkIGJlIGEgbmFzdHkgYnVnIG9yIHRoZSBzdGFrZWhvbGRlcnMgbWFqb3JpdHkgaXMgY29ycnVwdGVkISBJdCBzaG91bGQgbmV2ZXIgaGFwcGVuIVwiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkZhaWxlZCB0byBjb21taXQgYW4gaW52YWxpZCBibG9jay4gVGhpcyBjb3VsZCBiZSBhIG5hc3R5IGJ1ZyBvciB0aGUgc3Rha2Vob2xkZXJzIG1ham9yaXR5IGlzIGNvcnJ1cHRlZCEgSXQgc2hvdWxkIG5ldmVyIGhhcHBlbiFcIik7IC8vVE9ETzogcmVwbGFjZSB3aXRoIGJldHRlciBlcnJvciBoYW5kbGluZ1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZ2V0VlNEKHRydWUpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFZTRCA9IGZ1bmN0aW9uKGZvcmNlQ2FsY3VsYXRpb24pe1xuICAgICAgICBpZihmb3JjZUNhbGN1bGF0aW9uKXtcbiAgICAgICAgICAgIHZhciB0bXAgPSB0aGlzLmdldEludGVybmFsVmFsdWVzKG15Q3VycmVudFB1bHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHZzZCA9IHNzdXRpbC5oYXNoVmFsdWVzKHRtcCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZzZDtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBJbk1lbW9yeVBEUyhwZXJtYW5lbnRQZXJzaXN0ZW5jZSl7XG5cbiAgICB2YXIgbWFpblN0b3JhZ2UgPSBuZXcgU3RvcmFnZShudWxsKTtcblxuXG4gICAgdGhpcy5nZXRIYW5kbGVyID0gZnVuY3Rpb24oKXsgLy8gYSB3YXkgdG8gd29yayB3aXRoIFBEU1xuICAgICAgICB2YXIgdGVtcFN0b3JhZ2UgPSBuZXcgU3RvcmFnZShtYWluU3RvcmFnZSk7XG4gICAgICAgIHJldHVybiB0ZW1wU3RvcmFnZTtcbiAgICB9O1xuXG4gICAgdGhpcy5jb21wdXRlU3dhcm1UcmFuc2FjdGlvbkRpZmYgPSBmdW5jdGlvbihzd2FybSwgZm9ya2VkUGRzKXtcbiAgICAgICAgdmFyIGlucE91dHAgICAgID0gZm9ya2VkUGRzLmdldElucHV0T3V0cHV0KCk7XG4gICAgICAgIHN3YXJtLmlucHV0ICAgICA9IGlucE91dHAuaW5wdXQ7XG4gICAgICAgIHN3YXJtLm91dHB1dCAgICA9IGlucE91dHAub3V0cHV0O1xuICAgICAgICByZXR1cm4gc3dhcm07XG4gICAgfTtcblxuICAgIHRoaXMuY29tcHV0ZVBUQmxvY2sgPSBmdW5jdGlvbihuZXh0QmxvY2tTZXQpe1xuICAgICAgICB2YXIgdGVtcFN0b3JhZ2UgPSBuZXcgU3RvcmFnZShtYWluU3RvcmFnZSk7XG4gICAgICAgIHJldHVybiB0ZW1wU3RvcmFnZS5jb21wdXRlUFRCbG9jayhuZXh0QmxvY2tTZXQpO1xuXG4gICAgfTtcblxuICAgIHRoaXMuY29tbWl0ID0gZnVuY3Rpb24oYmxvY2tTZXQsIGN1cnJlbnRQdWxzZSl7XG4gICAgICAgIG1haW5TdG9yYWdlLmNvbW1pdChibG9ja1NldCk7XG4gICAgICAgIGlmKHBlcm1hbmVudFBlcnNpc3RlbmNlKSB7XG4gICAgICAgICAgICBwZXJtYW5lbnRQZXJzaXN0ZW5jZS5wZXJzaXN0KGJsb2NrU2V0LCBtYWluU3RvcmFnZS5nZXRJbnRlcm5hbFZhbHVlcyhjdXJyZW50UHVsc2UsIGZhbHNlKSwgY3VycmVudFB1bHNlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmdldFZTRCA9IGZ1bmN0aW9uICgpe1xuICAgICAgICByZXR1cm4gbWFpblN0b3JhZ2UuZ2V0VlNEKGZhbHNlKTtcbiAgICB9O1xuXG4gICAgdGhpcy5pbml0aWFsaXNlID0gZnVuY3Rpb24oc2F2ZWRJbnRlcm5hbFZhbHVlcyl7XG4gICAgICAgIG1haW5TdG9yYWdlLmluaXRpYWxpc2VJbnRlcm5hbFZhbHVlKHNhdmVkSW50ZXJuYWxWYWx1ZXMpO1xuICAgIH07XG5cbn1cblxuXG5leHBvcnRzLm5ld1BEUyA9IGZ1bmN0aW9uKHBlcnNpc3RlbmNlKXtcbiAgICByZXR1cm4gbmV3IEluTWVtb3J5UERTKHBlcnNpc3RlbmNlKTtcbn07IiwiY29uc3QgbWVtb3J5UERTID0gcmVxdWlyZShcIi4vSW5NZW1vcnlQRFNcIik7XG5cbmZ1bmN0aW9uIFBlcnNpc3RlbnRQRFMoe2dldEluaXRWYWx1ZXMsIHBlcnNpc3R9KSB7XG5cdHRoaXMubWVtQ2FjaGUgPSBtZW1vcnlQRFMubmV3UERTKHRoaXMpO1xuXHR0aGlzLnBlcnNpc3QgPSBwZXJzaXN0O1xuXG5cdGNvbnN0IGlubmVyVmFsdWVzID0gZ2V0SW5pdFZhbHVlcygpIHx8IG51bGw7XG5cdHRoaXMubWVtQ2FjaGUuaW5pdGlhbGlzZShpbm5lclZhbHVlcyk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMubmV3UERTID0gZnVuY3Rpb24gKHJlYWRlcldyaXRlcikge1xuXHRjb25zdCBwZHMgPSBuZXcgUGVyc2lzdGVudFBEUyhyZWFkZXJXcml0ZXIpO1xuXHRyZXR1cm4gcGRzLm1lbUNhY2hlO1xufTtcbiIsIlxuJCQuYXNzZXQuZGVzY3JpYmUoXCJBQ0xTY29wZVwiLCB7XG4gICAgcHVibGljOntcbiAgICAgICAgY29uY2VybjpcInN0cmluZzprZXlcIixcbiAgICAgICAgZGI6XCJqc29uXCJcbiAgICB9LFxuICAgIGluaXQ6ZnVuY3Rpb24oY29uY2Vybil7XG4gICAgICAgIHRoaXMuY29uY2VybiA9IGNvbmNlcm47XG4gICAgfSxcbiAgICBhZGRSZXNvdXJjZVBhcmVudCA6IGZ1bmN0aW9uKHJlc291cmNlSWQsIHBhcmVudElkKXtcbiAgICAgICAgLy9UT0RPOiBlbXB0eSBmdW5jdGlvbnMhXG4gICAgfSxcbiAgICBhZGRab25lUGFyZW50IDogZnVuY3Rpb24oem9uZUlkLCBwYXJlbnRJZCl7XG4gICAgICAgIC8vVE9ETzogZW1wdHkgZnVuY3Rpb25zIVxuICAgIH0sXG4gICAgZ3JhbnQgOmZ1bmN0aW9uKGFnZW50SWQsICByZXNvdXJjZUlkKXtcbiAgICAgICAgLy9UT0RPOiBlbXB0eSBmdW5jdGlvbnMhXG4gICAgfSxcbiAgICBhbGxvdyA6ZnVuY3Rpb24oYWdlbnRJZCwgIHJlc291cmNlSWQpe1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59KTsiLCJcbiQkLmFzc2V0LmRlc2NyaWJlKFwiQWdlbnRcIiwge1xuICAgIHB1YmxpYzp7XG4gICAgICAgIGFsaWFzOlwic3RyaW5nOmtleVwiLFxuICAgICAgICBwdWJsaWNLZXk6XCJzdHJpbmdcIlxuICAgIH0sXG4gICAgaW5pdDpmdW5jdGlvbihhbGlhcywgdmFsdWUpe1xuICAgICAgICB0aGlzLmFsaWFzICAgICAgPSBhbGlhcztcbiAgICAgICAgdGhpcy5wdWJsaWNLZXkgID0gdmFsdWU7XG4gICAgfSxcbiAgICB1cGRhdGU6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICB0aGlzLnB1YmxpY0tleSA9IHZhbHVlO1xuICAgIH0sXG4gICAgYWRkQWdlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgSW1wbGVtZW50ZWQnKTtcbiAgICB9LFxuICAgIGxpc3RBZ2VudDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBJbXBsZW1lbnRlZCcpO1xuXG4gICAgfSxcbiAgICByZW1vdmVBZ2VudDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBJbXBsZW1lbnRlZCcpO1xuXG4gICAgfVxufSk7IiwiXG4kJC5hc3NldC5kZXNjcmliZShcIkJhY2t1cFwiLCB7XG4gICAgcHVibGljOntcbiAgICAgICAgaWQ6ICBcInN0cmluZ1wiLFxuICAgICAgICB1cmw6IFwic3RyaW5nXCJcbiAgICB9LFxuXG4gICAgaW5pdDpmdW5jdGlvbihpZCwgdXJsKXtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB0aGlzLnVybCA9IHVybDtcbiAgICB9XG59KTtcbiIsIlxuJCQuYXNzZXQuZGVzY3JpYmUoXCJDU0JNZXRhXCIsIHtcblx0cHVibGljOntcblx0XHRpc01hc3RlcjpcInN0cmluZ1wiLFxuXHRcdGFsaWFzOlwic3RyaW5nOmtleVwiLFxuXHRcdGRlc2NyaXB0aW9uOiBcInN0cmluZ1wiLFxuXHRcdGNyZWF0aW9uRGF0ZTogXCJzdHJpbmdcIixcblx0XHR1cGRhdGVkRGF0ZSA6IFwic3RyaW5nXCIsXG5cdFx0aWQ6IFwic3RyaW5nXCIsXG5cdFx0aWNvbjogXCJzdHJpbmdcIlxuXHR9LFxuXHRpbml0OmZ1bmN0aW9uKGlkKXtcblx0XHR0aGlzLmFsaWFzID0gXCJtZXRhXCI7XG5cdFx0dGhpcy5pZCA9IGlkO1xuXHR9LFxuXG5cdHNldElzTWFzdGVyOiBmdW5jdGlvbiAoaXNNYXN0ZXIpIHtcblx0XHR0aGlzLmlzTWFzdGVyID0gaXNNYXN0ZXI7XG5cdH1cblxufSk7XG4iLCJcbiQkLmFzc2V0LmRlc2NyaWJlKFwiQ1NCUmVmZXJlbmNlXCIsIHtcbiAgICBwdWJsaWM6e1xuICAgICAgICBhbGlhczpcInN0cmluZzprZXlcIixcbiAgICAgICAgc2VlZCA6XCJzdHJpbmdcIixcbiAgICAgICAgZHNlZWQ6XCJzdHJpbmdcIlxuICAgIH0sXG4gICAgaW5pdDpmdW5jdGlvbihhbGlhcywgc2VlZCwgZHNlZWQgKXtcbiAgICAgICAgdGhpcy5hbGlhcyA9IGFsaWFzO1xuICAgICAgICB0aGlzLnNlZWQgID0gc2VlZDtcbiAgICAgICAgdGhpcy5kc2VlZCA9IGRzZWVkO1xuICAgIH0sXG4gICAgdXBkYXRlOmZ1bmN0aW9uKGZpbmdlcnByaW50KXtcbiAgICAgICAgdGhpcy5maW5nZXJwcmludCA9IGZpbmdlcnByaW50O1xuICAgICAgICB0aGlzLnZlcnNpb24rKztcbiAgICB9LFxuICAgIHJlZ2lzdGVyQmFja3VwVXJsOmZ1bmN0aW9uKGJhY2t1cFVybCl7XG4gICAgICAgIHRoaXMuYmFja3Vwcy5hZGQoYmFja3VwVXJsKTtcbiAgICB9XG59KTtcbiIsIlxuJCQuYXNzZXQuZGVzY3JpYmUoXCJEb21haW5SZWZlcmVuY2VcIiwge1xuICAgIHB1YmxpYzp7XG4gICAgICAgIHJvbGU6XCJzdHJpbmc6aW5kZXhcIixcbiAgICAgICAgYWxpYXM6XCJzdHJpbmc6a2V5XCIsXG4gICAgICAgIGFkZHJlc3NlczpcIm1hcFwiLFxuICAgICAgICBjb25zdGl0dXRpb246XCJzdHJpbmdcIixcbiAgICAgICAgd29ya3NwYWNlOlwic3RyaW5nXCIsXG4gICAgICAgIHJlbW90ZUludGVyZmFjZXM6XCJtYXBcIixcbiAgICAgICAgbG9jYWxJbnRlcmZhY2VzOlwibWFwXCJcbiAgICB9LFxuICAgIGluaXQ6ZnVuY3Rpb24ocm9sZSwgYWxpYXMpe1xuICAgICAgICB0aGlzLnJvbGUgPSByb2xlO1xuICAgICAgICB0aGlzLmFsaWFzID0gYWxpYXM7XG4gICAgICAgIHRoaXMuYWRkcmVzc2VzID0ge307XG4gICAgICAgIHRoaXMucmVtb3RlSW50ZXJmYWNlcyA9IHt9O1xuICAgICAgICB0aGlzLmxvY2FsSW50ZXJmYWNlcyA9IHt9O1xuICAgIH0sXG4gICAgdXBkYXRlRG9tYWluQWRkcmVzczpmdW5jdGlvbihyZXBsaWNhdGlvbkFnZW50LCBhZGRyZXNzKXtcbiAgICAgICAgaWYoIXRoaXMuYWRkcmVzc2VzKXtcbiAgICAgICAgICAgIHRoaXMuYWRkcmVzc2VzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRyZXNzZXNbcmVwbGljYXRpb25BZ2VudF0gPSBhZGRyZXNzO1xuICAgIH0sXG4gICAgcmVtb3ZlRG9tYWluQWRkcmVzczpmdW5jdGlvbihyZXBsaWNhdGlvbkFnZW50KXtcbiAgICAgICAgdGhpcy5hZGRyZXNzZXNbcmVwbGljYXRpb25BZ2VudF0gPSB1bmRlZmluZWQ7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmFkZHJlc3Nlc1tyZXBsaWNhdGlvbkFnZW50XTtcbiAgICB9LFxuICAgIGFkZFJlbW90ZUludGVyZmFjZTpmdW5jdGlvbihhbGlhcywgcmVtb3RlRW5kUG9pbnQpe1xuICAgICAgICBpZighdGhpcy5yZW1vdGVJbnRlcmZhY2VzKXtcbiAgICAgICAgICAgIHRoaXMucmVtb3RlSW50ZXJmYWNlcyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3RlSW50ZXJmYWNlc1thbGlhc10gPSByZW1vdGVFbmRQb2ludDtcbiAgICB9LFxuICAgIHJlbW92ZVJlbW90ZUludGVyZmFjZTpmdW5jdGlvbihhbGlhcyl7XG4gICAgICAgIGlmKHRoaXMucmVtb3RlSW50ZXJmYWNlKXtcbiAgICAgICAgICAgIHRoaXMucmVtb3RlSW50ZXJmYWNlc1thbGlhc10gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5yZW1vdGVJbnRlcmZhY2VzW2FsaWFzXTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgYWRkTG9jYWxJbnRlcmZhY2U6ZnVuY3Rpb24oYWxpYXMsIHBhdGgpe1xuICAgICAgICBpZighdGhpcy5sb2NhbEludGVyZmFjZXMpe1xuICAgICAgICAgICAgdGhpcy5sb2NhbEludGVyZmFjZXMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvY2FsSW50ZXJmYWNlc1thbGlhc10gPSBwYXRoO1xuICAgIH0sXG4gICAgcmVtb3ZlTG9jYWxJbnRlcmZhY2U6ZnVuY3Rpb24oYWxpYXMpe1xuICAgICAgICBpZih0aGlzLmxvY2FsSW50ZXJmYWNlcyl7XG4gICAgICAgICAgICB0aGlzLmxvY2FsSW50ZXJmYWNlc1thbGlhc10gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5sb2NhbEludGVyZmFjZXNbYWxpYXNdO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBzZXRDb25zdGl0dXRpb246ZnVuY3Rpb24ocGF0aE9yVXJsT3JDU0Ipe1xuICAgICAgICB0aGlzLmNvbnN0aXR1dGlvbiA9IHBhdGhPclVybE9yQ1NCO1xuICAgIH0sXG4gICAgZ2V0Q29uc3RpdHV0aW9uOmZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbnN0aXR1dGlvbjtcbiAgICB9LFxuICAgIHNldFdvcmtzcGFjZTpmdW5jdGlvbihwYXRoKXtcbiAgICAgICAgdGhpcy53b3Jrc3BhY2UgPSBwYXRoO1xuICAgIH0sXG4gICAgZ2V0V29ya3NwYWNlOmZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB0aGlzLndvcmtzcGFjZTtcbiAgICB9XG59KTsiLCIkJC5hc3NldC5kZXNjcmliZShcIkVtYmVkZGVkRmlsZVwiLCB7XG5cdHB1YmxpYzp7XG5cdFx0YWxpYXM6XCJzdHJpbmdcIlxuXHR9LFxuXG5cdGluaXQ6ZnVuY3Rpb24oYWxpYXMpe1xuXHRcdHRoaXMuYWxpYXMgPSBhbGlhcztcblx0fVxufSk7IiwiJCQuYXNzZXQuZGVzY3JpYmUoXCJGaWxlUmVmZXJlbmNlXCIsIHtcblx0cHVibGljOntcblx0XHRhbGlhczpcInN0cmluZ1wiLFxuXHRcdHNlZWQgOlwic3RyaW5nXCIsXG5cdFx0ZHNlZWQ6XCJzdHJpbmdcIlxuXHR9LFxuXHRpbml0OmZ1bmN0aW9uKGFsaWFzLCBzZWVkLCBkc2VlZCl7XG5cdFx0dGhpcy5hbGlhcyA9IGFsaWFzO1xuXHRcdHRoaXMuc2VlZCAgPSBzZWVkO1xuXHRcdHRoaXMuZHNlZWQgPSBkc2VlZDtcblx0fVxufSk7IiwiXG4kJC5hc3NldC5kZXNjcmliZShcImtleVwiLCB7XG4gICAgcHVibGljOntcbiAgICAgICAgYWxpYXM6XCJzdHJpbmdcIlxuICAgIH0sXG4gICAgaW5pdDpmdW5jdGlvbihhbGlhcywgdmFsdWUpe1xuICAgICAgICB0aGlzLmFsaWFzID0gYWxpYXM7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB9LFxuICAgIHVwZGF0ZTpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB9XG59KTsiLCJtb2R1bGUuZXhwb3J0cyA9ICQkLmxpYnJhcnkoZnVuY3Rpb24oKXtcbiAgICByZXF1aXJlKFwiLi9Eb21haW5SZWZlcmVuY2VcIik7XG4gICAgcmVxdWlyZShcIi4vQ1NCUmVmZXJlbmNlXCIpO1xuICAgIHJlcXVpcmUoXCIuL0FnZW50XCIpO1xuICAgIHJlcXVpcmUoXCIuL0JhY2t1cFwiKTtcbiAgICByZXF1aXJlKFwiLi9BQ0xTY29wZVwiKTtcbiAgICByZXF1aXJlKFwiLi9LZXlcIik7XG4gICAgcmVxdWlyZShcIi4vdHJhbnNhY3Rpb25zXCIpO1xuICAgIHJlcXVpcmUoXCIuL0ZpbGVSZWZlcmVuY2VcIik7XG4gICAgcmVxdWlyZShcIi4vRW1iZWRkZWRGaWxlXCIpO1xuICAgIHJlcXVpcmUoJy4vQ1NCTWV0YScpO1xufSk7IiwiJCQudHJhbnNhY3Rpb24uZGVzY3JpYmUoXCJ0cmFuc2FjdGlvbnNcIiwge1xuICAgIHVwZGF0ZUtleTogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIHRyYW5zYWN0aW9uID0gJCQuYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHRoaXMpO1xuICAgICAgICB2YXIga2V5ID0gdHJhbnNhY3Rpb24ubG9va3VwKFwiS2V5XCIsIGtleSk7XG4gICAgICAgIHZhciBrZXlQZXJtaXNzaW9ucyA9IHRyYW5zYWN0aW9uLmxvb2t1cChcIkFDTFNjb3BlXCIsIFwiS2V5c0NvbmNlcm5cIik7XG4gICAgICAgIGlmIChrZXlQZXJtaXNzaW9ucy5hbGxvdyh0aGlzLmFnZW50SWQsIGtleSkpIHtcbiAgICAgICAgICAgIGtleS51cGRhdGUodmFsdWUpO1xuICAgICAgICAgICAgdHJhbnNhY3Rpb24uYWRkKGtleSk7XG4gICAgICAgICAgICAkJC5ibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNlY3VyaXR5RXJyb3IoXCJBZ2VudCBcIiArIHRoaXMuYWdlbnRJZCArIFwiIGRlbmllZCB0byBjaGFuZ2Uga2V5IFwiICsga2V5KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgYWRkQ2hpbGQ6IGZ1bmN0aW9uIChhbGlhcykge1xuICAgICAgICB2YXIgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oKTtcbiAgICAgICAgdmFyIHJlZmVyZW5jZSA9ICQkLmNvbnRyYWN0LnN0YXJ0KFwiRG9tYWluUmVmZXJlbmNlXCIsIFwiaW5pdFwiLCBcImNoaWxkXCIsIGFsaWFzKTtcbiAgICAgICAgdHJhbnNhY3Rpb24uYWRkKHJlZmVyZW5jZSk7XG4gICAgICAgICQkLmJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcbiAgICB9LFxuICAgIGFkZFBhcmVudDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciByZWZlcmVuY2UgPSAkJC5jb250cmFjdC5zdGFydChcIkRvbWFpblJlZmVyZW5jZVwiLCBcImluaXRcIiwgXCJjaGlsZFwiLCBhbGlhcyk7XG4gICAgICAgIHRoaXMudHJhbnNhY3Rpb24uc2F2ZShyZWZlcmVuY2UpO1xuICAgICAgICAkJC5ibG9ja2NoYWluLnBlcnNpc3QodGhpcy50cmFuc2FjdGlvbik7XG4gICAgfSxcbiAgICBhZGRBZ2VudDogZnVuY3Rpb24gKGFsaWFzLCBwdWJsaWNLZXkpIHtcbiAgICAgICAgdmFyIHJlZmVyZW5jZSA9ICQkLmNvbnRyYWN0LnN0YXJ0KFwiQWdlbnRcIiwgXCJpbml0XCIsIGFsaWFzLCBwdWJsaWNLZXkpO1xuICAgICAgICB0aGlzLnRyYW5zYWN0aW9uLnNhdmUocmVmZXJlbmNlKTtcbiAgICAgICAgJCQuYmxvY2tjaGFpbi5wZXJzaXN0KHRoaXMudHJhbnNhY3Rpb24pO1xuICAgIH0sXG4gICAgdXBkYXRlQWdlbnQ6IGZ1bmN0aW9uIChhbGlhcywgcHVibGljS2V5KSB7XG4gICAgICAgIHZhciBhZ2VudCA9IHRoaXMudHJhbnNhY3Rpb24ubG9va3VwKFwiQWdlbnRcIiwgYWxpYXMpO1xuICAgICAgICBhZ2VudC51cGRhdGUocHVibGljS2V5KTtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbi5zYXZlKHJlZmVyZW5jZSk7XG4gICAgICAgICQkLmJsb2NrY2hhaW4ucGVyc2lzdCh0aGlzLnRyYW5zYWN0aW9uKTtcbiAgICB9XG59KTtcblxuXG4kJC5uZXdUcmFuc2FjdGlvbiA9IGZ1bmN0aW9uKHRyYW5zYWN0aW9uRmxvdyxjdG9yLC4uLmFyZ3Mpe1xuICAgIHZhciB0cmFuc2FjdGlvbiA9ICQkLnN3YXJtLnN0YXJ0KCB0cmFuc2FjdGlvbkZsb3cpO1xuICAgIHRyYW5zYWN0aW9uLm1ldGEoXCJhZ2VudElkXCIsICQkLmN1cnJlbnRBZ2VudElkKTtcbiAgICB0cmFuc2FjdGlvbi5tZXRhKFwiY29tbWFuZFwiLCBcInJ1bkV2ZXJ5V2hlcmVcIik7XG4gICAgdHJhbnNhY3Rpb24ubWV0YShcImN0b3JcIiwgY3Rvcik7XG4gICAgdHJhbnNhY3Rpb24ubWV0YShcImFyZ3NcIiwgYXJncyk7XG4gICAgdHJhbnNhY3Rpb24uc2lnbigpO1xuICAgIC8vJCQuYmxvY2tjaGFpbi5zZW5kRm9yQ29uc2VudCh0cmFuc2FjdGlvbik7XG4gICAgLy90ZW1wb3JhcnkgdW50aWwgY29uc2VudCBsYXllciBpcyBhY3RpdmF0ZWRcbiAgICB0cmFuc2FjdGlvbltjdG9yXS5hcHBseSh0cmFuc2FjdGlvbixhcmdzKTtcbn07XG5cbi8qXG51c2FnZXM6XG4gICAgJCQubmV3VHJhbnNhY3Rpb24oXCJkb21haW4udHJhbnNhY3Rpb25zXCIsIFwidXBkYXRlS2V5XCIsIFwia2V5XCIsIFwidmFsdWVcIilcblxuICovXG4iLCIvLyBjb25zdCBzaGFyZWRQaGFzZXMgPSByZXF1aXJlKCcuL3NoYXJlZFBoYXNlcycpO1xuLy8gY29uc3QgYmVlc0hlYWxlciA9IHJlcXVpcmUoJ3N3YXJtdXRpbHMnKS5iZWVzSGVhbGVyO1xuXG4kJC5zd2FybXMuZGVzY3JpYmUoXCJhZ2VudHNcIiwge1xuICAgIGFkZDogZnVuY3Rpb24gKGFsaWFzLCBwdWJsaWNLZXkpIHtcbiAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuICAgICAgICBjb25zdCBhZ2VudEFzc2V0ID0gdHJhbnNhY3Rpb24ubG9va3VwKCdnbG9iYWwuQWdlbnQnLCBhbGlhcyk7XG5cbiAgICAgICAgYWdlbnRBc3NldC5pbml0KGFsaWFzLCBwdWJsaWNLZXkpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdHJhbnNhY3Rpb24uYWRkKGFnZW50QXNzZXQpO1xuXG4gICAgICAgICAgICAkJC5ibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgdGhpcy5yZXR1cm4obmV3IEVycm9yKFwiQWdlbnQgYWxyZWFkeSBleGlzdHNcIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXR1cm4obnVsbCwgYWxpYXMpO1xuICAgIH0sXG59KTtcbiIsImNvbnN0IHNoYXJlZFBoYXNlcyA9IHJlcXVpcmUoJy4vc2hhcmVkUGhhc2VzJyk7XG5jb25zdCBiZWVzSGVhbGVyID0gcmVxdWlyZSgnc3dhcm11dGlscycpLmJlZXNIZWFsZXI7XG5cbiQkLnN3YXJtcy5kZXNjcmliZShcImRvbWFpbnNcIiwge1xuICAgIGFkZDogZnVuY3Rpb24gKHJvbGUsIGFsaWFzKSB7XG4gICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gJCQuYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcbiAgICAgICAgY29uc3QgZG9tYWluc1N3YXJtID0gdHJhbnNhY3Rpb24ubG9va3VwKCdnbG9iYWwuRG9tYWluUmVmZXJlbmNlJywgYWxpYXMpO1xuXG4gICAgICAgIGlmICghZG9tYWluc1N3YXJtKSB7XG4gICAgICAgICAgICB0aGlzLnJldHVybihuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIHN3YXJtIG5hbWVkIFwiZ2xvYmFsLkRvbWFpblJlZmVyZW5jZVwiJykpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZG9tYWluc1N3YXJtLmluaXQocm9sZSwgYWxpYXMpO1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5hZGQoZG9tYWluc1N3YXJtKTtcblxuICAgICAgICAgICAgJCQuYmxvY2tjaGFpbi5jb21taXQodHJhbnNhY3Rpb24pO1xuICAgICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICAgICAgIHRoaXMucmV0dXJuKG5ldyBFcnJvcihcIkRvbWFpbiBhbGxyZWFkeSBleGlzdHMhXCIpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmV0dXJuKG51bGwsIGFsaWFzKTtcbiAgICB9LFxuICAgIGdldERvbWFpbkRldGFpbHM6ZnVuY3Rpb24oYWxpYXMpe1xuICAgICAgICBjb25zdCB0cmFuc2FjdGlvbiA9ICQkLmJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG4gICAgICAgIGNvbnN0IGRvbWFpbiA9IHRyYW5zYWN0aW9uLmxvb2t1cCgnZ2xvYmFsLkRvbWFpblJlZmVyZW5jZScsIGFsaWFzKTtcblxuICAgICAgICBpZiAoIWRvbWFpbikge1xuICAgICAgICAgICAgdGhpcy5yZXR1cm4obmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBzd2FybSBuYW1lZCBcImdsb2JhbC5Eb21haW5SZWZlcmVuY2VcIicpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmV0dXJuKG51bGwsIGJlZXNIZWFsZXIuYXNKU09OKGRvbWFpbikucHVibGljVmFycyk7XG4gICAgfSxcbiAgICBjb25uZWN0RG9tYWluVG9SZW1vdGUoZG9tYWluTmFtZSwgYWxpYXMsIHJlbW90ZUVuZFBvaW50KXtcbiAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuICAgICAgICBjb25zdCBkb21haW4gPSB0cmFuc2FjdGlvbi5sb29rdXAoJ2dsb2JhbC5Eb21haW5SZWZlcmVuY2UnLCBkb21haW5OYW1lKTtcblxuICAgICAgICBpZiAoIWRvbWFpbikge1xuICAgICAgICAgICAgdGhpcy5yZXR1cm4obmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBzd2FybSBuYW1lZCBcImdsb2JhbC5Eb21haW5SZWZlcmVuY2VcIicpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvbWFpbi5hZGRSZW1vdGVJbnRlcmZhY2UoYWxpYXMsIHJlbW90ZUVuZFBvaW50KTtcblxuICAgICAgICB0cnl7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5hZGQoZG9tYWluKTtcblxuICAgICAgICAgICAgJCQuYmxvY2tjaGFpbi5jb21taXQodHJhbnNhY3Rpb24pO1xuICAgICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB0aGlzLnJldHVybihuZXcgRXJyb3IoXCJEb21haW4gdXBkYXRlIGZhaWxlZCFcIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXR1cm4obnVsbCwgYWxpYXMpO1xuICAgIH0sXG4gICAgLy8gZ2V0RG9tYWluRGV0YWlsczogc2hhcmVkUGhhc2VzLmdldEFzc2V0RmFjdG9yeSgnZ2xvYmFsLkRvbWFpblJlZmVyZW5jZScpLFxuICAgIGdldERvbWFpbnM6IHNoYXJlZFBoYXNlcy5nZXRBbGxBc3NldHNGYWN0b3J5KCdnbG9iYWwuRG9tYWluUmVmZXJlbmNlJylcbn0pO1xuIiwicmVxdWlyZSgnLi9kb21haW5Td2FybXMnKTtcbnJlcXVpcmUoJy4vYWdlbnRzU3dhcm0nKTsiLCJjb25zdCBiZWVzSGVhbGVyID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIikuYmVlc0hlYWxlcjtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZ2V0QXNzZXRGYWN0b3J5OiBmdW5jdGlvbihhc3NldFR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGFsaWFzKSB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2FjdGlvbiA9ICQkLmJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG4gICAgICAgICAgICBjb25zdCBkb21haW5SZWZlcmVuY2VTd2FybSA9IHRyYW5zYWN0aW9uLmxvb2t1cChhc3NldFR5cGUsIGFsaWFzKTtcblxuICAgICAgICAgICAgaWYoIWRvbWFpblJlZmVyZW5jZVN3YXJtKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXR1cm4obmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBzd2FybSBuYW1lZCBcIiR7YXNzZXRUeXBlfVwiYCkpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5yZXR1cm4odW5kZWZpbmVkLCBiZWVzSGVhbGVyLmFzSlNPTihkb21haW5SZWZlcmVuY2VTd2FybSkpO1xuICAgICAgICB9O1xuICAgIH0sXG4gICAgZ2V0QWxsQXNzZXRzRmFjdG9yeTogZnVuY3Rpb24oYXNzZXRUeXBlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gJCQuYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcbiAgICAgICAgICAgIGNvbnN0IGRvbWFpbnMgPSB0cmFuc2FjdGlvbi5sb2FkQXNzZXRzKGFzc2V0VHlwZSkgfHwgW107XG5cbiAgICAgICAgICAgIHRoaXMucmV0dXJuKHVuZGVmaW5lZCwgZG9tYWlucy5tYXAoKGRvbWFpbikgPT4gYmVlc0hlYWxlci5hc0pTT04oZG9tYWluKSkpO1xuICAgICAgICB9O1xuICAgIH1cbn07IiwiY29uc3QgQXN5bmNEaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uL3V0aWxzL0FzeW5jRGlzcGF0Y2hlclwiKTtcbmNvbnN0IEVWRlNSZXNvbHZlciA9IHJlcXVpcmUoXCIuL2JhY2t1cFJlc29sdmVycy9FVkZTUmVzb2x2ZXJcIik7XG4vLyBjb25zdCBjcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuXG5mdW5jdGlvbiBCYWNrdXBFbmdpbmVCdWlsZGVyKCkge1xuICAgIGNvbnN0IHJlc29sdmVycyA9IHt9O1xuICAgIHRoaXMuYWRkUmVzb2x2ZXIgPSBmdW5jdGlvbiAobmFtZSwgcmVzb2x2ZXIpIHtcbiAgICAgICAgcmVzb2x2ZXJzW25hbWVdID0gcmVzb2x2ZXI7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0QmFja3VwRW5naW5lID0gZnVuY3Rpb24odXJscykge1xuICAgICAgICBpZiAoIXVybHMgfHwgdXJscy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIHVybCB3YXMgcHJvdmlkZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IEJhY2t1cEVuZ2luZSh1cmxzLCByZXNvbHZlcnMpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIEJhY2t1cEVuZ2luZSh1cmxzLCByZXNvbHZlcnMpIHtcblxuICAgIHRoaXMuc2F2ZSA9IGZ1bmN0aW9uIChjc2JJZGVudGlmaWVyLCBkYXRhU3RyZWFtLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBhc3luY0Rpc3BhdGNoZXIgPSBuZXcgQXN5bmNEaXNwYXRjaGVyKGNhbGxiYWNrKTtcbiAgICAgICAgYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkodXJscy5sZW5ndGgpO1xuICAgICAgICBmb3IgKGNvbnN0IHVybCBvZiB1cmxzKSB7XG4gICAgICAgICAgICByZXNvbHZlckZvclVybCh1cmwsIChlcnIsIHJlc29sdmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmVyLmF1dGgodXJsLCB1bmRlZmluZWQsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlci5zYXZlKHVybCwgY3NiSWRlbnRpZmllciwgZGF0YVN0cmVhbSwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCh1bmRlZmluZWQsIHVybCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5sb2FkID0gZnVuY3Rpb24gKGNzYklkZW50aWZpZXIsIHZlcnNpb24sIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdmVyc2lvbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHZlcnNpb247XG4gICAgICAgICAgICB2ZXJzaW9uID0gXCJcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeURvd25sb2FkKGNzYklkZW50aWZpZXIsIHZlcnNpb24sIDAsIChlcnIsIHJlc291cmNlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgcmVzb3VyY2UpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRWZXJzaW9ucyA9IGZ1bmN0aW9uIChjc2JJZGVudGlmaWVyLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkVtcHR5IGZ1bmN0aW9uXCIpO1xuICAgIH07XG5cbiAgICB0aGlzLmNvbXBhcmVWZXJzaW9ucyA9IGZ1bmN0aW9uIChmaWxlTGlzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgdXJsID0gdXJsc1swXTtcbiAgICAgICAgcmVzb2x2ZXJGb3JVcmwodXJsLCAoZXJyLCByZXNvbHZlcikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXNvbHZlci5hdXRoKHVybCwgdW5kZWZpbmVkLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXNvbHZlci5jb21wYXJlVmVyc2lvbnModXJsLCBmaWxlTGlzdCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBJTlRFUk5BTCBNRVRIT0RTIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICAgZnVuY3Rpb24gcmVzb2x2ZXJGb3JVcmwodXJsLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocmVzb2x2ZXJzKTtcbiAgICAgICAgbGV0IHJlc29sdmVyO1xuICAgICAgICBsZXQgaTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKGtleXNbaV0sIHVybCkpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlciA9IHJlc29sdmVyc1trZXlzW2ldXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpID09PSBrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmVzb2x2ZXIgPSByZXNvbHZlcnNbJ2V2ZnMnXTtcbiAgICAgICAgICAgIGlmICghcmVzb2x2ZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKGBObyByZXNvbHZlciBtYXRjaGVzIHRoZSB1cmwgJHt1cmx9YCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCByZXNvbHZlcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWF0Y2goc3RyMSwgc3RyMikge1xuICAgICAgICByZXR1cm4gc3RyMS5pbmNsdWRlcyhzdHIyKSB8fCBzdHIyLmluY2x1ZGVzKHN0cjEpO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gdHJ5RG93bmxvYWQoY3NiSWRlbnRpZmllciwgdmVyc2lvbiwgaW5kZXgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gdXJscy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJGYWlsZWQgdG8gZG93bmxvYWQgcmVzb3VyY2VcIikpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXJsID0gdXJsc1tpbmRleF07XG4gICAgICAgIHJlc29sdmVyRm9yVXJsKHVybCwgKGVyciwgcmVzb2x2ZXIpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzb2x2ZXIuYXV0aCh1cmwsIHVuZGVmaW5lZCwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRyeURvd25sb2FkKGNzYklkZW50aWZpZXIsIHZlcnNpb24sICsraW5kZXgsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXNvbHZlci5sb2FkKHVybCwgY3NiSWRlbnRpZmllciwgdmVyc2lvbiwgKGVyciwgcmVzb3VyY2UpID0+e1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ5RG93bmxvYWQoY3NiSWRlbnRpZmllciwgdmVyc2lvbiwgKytpbmRleCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCByZXNvdXJjZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbmNvbnN0IGVuZ2luZUJ1aWxkZXIgPSBuZXcgQmFja3VwRW5naW5lQnVpbGRlcigpO1xuXG4vLyBlbmdpbmVCdWlsZGVyLmFkZFJlc29sdmVyKCdkcm9wYm94JywgbmV3IERyb3Bib3hSZXNvbHZlcigpKTtcbi8vIGVuZ2luZUJ1aWxkZXIuYWRkUmVzb2x2ZXIoJ2RyaXZlJywgbmV3IERyaXZlUmVzb2x2ZXIoKSk7XG5lbmdpbmVCdWlsZGVyLmFkZFJlc29sdmVyKCdldmZzJywgbmV3IEVWRlNSZXNvbHZlcigpKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZ2V0QmFja3VwRW5naW5lOiBmdW5jdGlvbiAodXJscykge1xuICAgICAgICByZXR1cm4gZW5naW5lQnVpbGRlci5nZXRCYWNrdXBFbmdpbmUodXJscyk7XG4gICAgfVxufTtcbiIsIiBmdW5jdGlvbiBDU0JDYWNoZShtYXhTaXplKSB7XG5cbiAgICAgbGV0IGNhY2hlID0ge307XG4gICAgbGV0IHNpemUgPSAwO1xuICAgIGNvbnN0IGNsZWFyaW5nUmF0aW8gPSAwLjU7XG5cblxuICAgIHRoaXMubG9hZCA9IGZ1bmN0aW9uICh1aWQpIHtcbiAgICAgICAgLy8gaWYgKGNhY2hlW3VpZF0pIHtcbiAgICAgICAgLy8gICAgIGNhY2hlW3VpZF0uY291bnQgKz0gMTtcbiAgICAgICAgLy8gICAgIHJldHVybiBjYWNoZVt1aWRdLmluc3RhbmNlO1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgdGhpcy5wdXQgPSBmdW5jdGlvbiAodWlkLCBvYmopIHtcbiAgICAgICAgaWYgKHNpemUgPiBtYXhTaXplKSB7XG4gICAgICAgICAgICBjbGVhcigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgICAgY2FjaGVbdWlkXSA9IHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZTogb2JqLFxuICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0taW50ZXJuYWwgbWV0aG9kcy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICAgZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgICAgIHNpemUgPSBtYXhTaXplIC0gTWF0aC5yb3VuZChjbGVhcmluZ1JhdGlvICogbWF4U2l6ZSk7XG5cbiAgICAgICAgY29uc3QgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKGNhY2hlKTtcbiAgICAgICAgY2FjaGUgPSBlbnRyaWVzXG4gICAgICAgICAgICAuc29ydCgoYXJyMSwgYXJyMikgPT4gYXJyMlsxXS5jb3VudCAtIGFycjFbMV0uY291bnQpXG4gICAgICAgICAgICAuc2xpY2UoMCwgc2l6ZSlcbiAgICAgICAgICAgIC5yZWR1Y2UoKG9iaiwgWyBrLCB2IF0pID0+IHtcbiAgICAgICAgICAgICAgICBvYmpba10gPSB2O1xuICAgICAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgICAgICB9LCB7fSk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENTQkNhY2hlO1xuIiwiY29uc3QgY3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcblxuXG5mdW5jdGlvbiBDU0JJZGVudGlmaWVyKGlkLCBiYWNrdXBVcmxzLCBrZXlMZW4gPSAzMikge1xuICAgIGxldCBzZWVkO1xuICAgIGxldCBkc2VlZDtcbiAgICBsZXQgdWlkO1xuICAgIGxldCBlbmNTZWVkO1xuICAgIC8vIGxldCBlbmNEc2VlZDtcblxuICAgIGluaXQoKTtcblxuICAgIHRoaXMuZ2V0U2VlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYoIXNlZWQpe1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJldHVybiBzZWVkLiBBY2Nlc3MgaXMgZGVuaWVkLlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKHNlZWQpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldERzZWVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZihkc2VlZCl7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybShkc2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZihzZWVkKXtcbiAgICAgICAgICAgIGRzZWVkID0gZGVyaXZlU2VlZChzZWVkKTtcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKGRzZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXR1cm4gZGVyaXZlZCBzZWVkLiBBY2Nlc3MgaXMgZGVuaWVkLlwiKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRVaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKHVpZCl7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybSh1aWQpLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZihkc2VlZCl7XG4gICAgICAgICAgICB1aWQgPSBjb21wdXRlVWlkKGRzZWVkKTtcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKHVpZCkudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHNlZWQpe1xuICAgICAgICAgICAgZHNlZWQgPSBkZXJpdmVTZWVkKHNlZWQpO1xuICAgICAgICAgICAgdWlkID0gY29tcHV0ZVVpZChkc2VlZCk7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybSh1aWQpLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcmV0dXJuIHVpZFwiKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRFbmNTZWVkID0gZnVuY3Rpb24gKGVuY3J5cHRpb25LZXkpIHtcbiAgICAgICAgaWYoZW5jU2VlZCl7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybShlbmNTZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCFzZWVkKXtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXR1cm4gZW5jU2VlZC4gQWNjZXNzIGlzIGRlbmllZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZW5jcnlwdGlvbktleSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJldHVybiBlbmNTZWVkLiBObyBlbmNyeXB0aW9uIGtleSB3YXMgcHJvdmlkZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvL1RPRE86IGVuY3J5cHQgc2VlZCB1c2luZyBlbmNyeXB0aW9uS2V5LiBFbmNyeXB0aW9uIGFsZ29yaXRobSByZW1haW5zIHRvIGJlIGNob3NlblxuICAgIH07XG5cblxuXG4gICAgdGhpcy5nZXRCYWNrdXBVcmxzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZihzZWVkKXtcbiAgICAgICAgICAgIHJldHVybiBzZWVkLmJhY2t1cDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKGRzZWVkKXtcbiAgICAgICAgICAgIHJldHVybiBkc2VlZC5iYWNrdXA7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCYWNrdXAgVVJMcyBjb3VsZCBub3QgYmUgcmV0cmlldmVkLiBBY2Nlc3MgaXMgZGVuaWVkXCIpO1xuICAgIH07XG5cbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBpbnRlcm5hbCBtZXRob2RzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICAgIGlmICghaWQpIHtcbiAgICAgICAgICAgIGlmICghYmFja3VwVXJscykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIGJhY2t1cHMgcHJvdmlkZWQuXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZWVkID0gY3JlYXRlKCk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgY2xhc3NpZnlJZCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xhc3NpZnlJZCgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpZCAhPT0gXCJzdHJpbmdcIiAmJiAhQnVmZmVyLmlzQnVmZmVyKGlkKSAmJiAhKHR5cGVvZiBpZCA9PT0gXCJvYmplY3RcIiAmJiAhQnVmZmVyLmlzQnVmZmVyKGlkKSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSWQgbXVzdCBiZSBhIHN0cmluZyBvciBhIGJ1ZmZlci4gVGhlIHR5cGUgcHJvdmlkZWQgd2FzICR7dHlwZW9mIGlkfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXhwYW5kZWRJZCA9IGxvYWQoaWQpO1xuICAgICAgICBzd2l0Y2goZXhwYW5kZWRJZC50YWcpe1xuICAgICAgICAgICAgY2FzZSAncyc6XG4gICAgICAgICAgICAgICAgc2VlZCA9IGV4cGFuZGVkSWQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdkJzpcbiAgICAgICAgICAgICAgICBkc2VlZCA9IGV4cGFuZGVkSWQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1JzpcbiAgICAgICAgICAgICAgICB1aWQgPSBleHBhbmRlZElkO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZXMnOlxuICAgICAgICAgICAgICAgIGVuY1NlZWQgPSBleHBhbmRlZElkO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZWQnOlxuICAgICAgICAgICAgICAgIGVuY0RzZWVkID0gZXhwYW5kZWRJZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHRhZycpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgICAgICAgY29uc3QgbG9jYWxTZWVkID0ge307XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShiYWNrdXBVcmxzKSkge1xuICAgICAgICAgICAgYmFja3VwVXJscyA9IFsgYmFja3VwVXJscyBdO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9jYWxTZWVkLnRhZyAgICA9ICdzJztcbiAgICAgICAgbG9jYWxTZWVkLnJhbmRvbSA9IGNyeXB0by5yYW5kb21CeXRlcyhrZXlMZW4pO1xuICAgICAgICBsb2NhbFNlZWQuYmFja3VwID0gYmFja3VwVXJscztcblxuICAgICAgICByZXR1cm4gbG9jYWxTZWVkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlcml2ZVNlZWQoc2VlZCkge1xuICAgICAgICBsZXQgY29tcGFjdFNlZWQgPSBzZWVkO1xuXG4gICAgICAgIGlmICh0eXBlb2Ygc2VlZCA9PT0gJ29iamVjdCcgJiYgIUJ1ZmZlci5pc0J1ZmZlcihzZWVkKSkge1xuICAgICAgICAgICAgY29tcGFjdFNlZWQgPSBnZW5lcmF0ZUNvbXBhY3RGb3JtKHNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzZWVkKSkge1xuICAgICAgICAgICAgY29tcGFjdFNlZWQgPSBzZWVkLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29tcGFjdFNlZWRbMF0gPT09ICdkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUcmllZCB0byBkZXJpdmUgYW4gYWxyZWFkeSBkZXJpdmVkIHNlZWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkZWNvZGVkQ29tcGFjdFNlZWQgPSBkZWNvZGVVUklDb21wb25lbnQoY29tcGFjdFNlZWQpO1xuICAgICAgICBjb25zdCBzcGxpdENvbXBhY3RTZWVkID0gZGVjb2RlZENvbXBhY3RTZWVkLnN1YnN0cmluZygxKS5zcGxpdCgnfCcpO1xuXG4gICAgICAgIGNvbnN0IHN0clNlZWQgPSBCdWZmZXIuZnJvbShzcGxpdENvbXBhY3RTZWVkWzBdLCAnYmFzZTY0JykudG9TdHJpbmcoJ2hleCcpO1xuICAgICAgICBjb25zdCBiYWNrdXBVcmxzID0gQnVmZmVyLmZyb20oc3BsaXRDb21wYWN0U2VlZFsxXSwgJ2Jhc2U2NCcpLnRvU3RyaW5nKCk7XG4gICAgICAgIGNvbnN0IGRzZWVkID0ge307XG5cbiAgICAgICAgZHNlZWQudGFnID0gJ2QnO1xuICAgICAgICBkc2VlZC5yYW5kb20gPSBjcnlwdG8uZGVyaXZlS2V5KHN0clNlZWQsIG51bGwsIGtleUxlbik7XG4gICAgICAgIGRzZWVkLmJhY2t1cCA9IEpTT04ucGFyc2UoYmFja3VwVXJscyk7XG5cbiAgICAgICAgcmV0dXJuIGRzZWVkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbXB1dGVVaWQoZHNlZWQpe1xuICAgICAgICBpZighZHNlZWQpe1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRHNlZWQgd2FzIG5vdCBwcm92aWRlZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgZHNlZWQgPT09IFwib2JqZWN0XCIgJiYgIUJ1ZmZlci5pc0J1ZmZlcihkc2VlZCkpIHtcbiAgICAgICAgICAgIGRzZWVkID0gZ2VuZXJhdGVDb21wYWN0Rm9ybShkc2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB1aWQgPSB7fTtcbiAgICAgICAgdWlkLnRhZyA9ICd1JztcbiAgICAgICAgdWlkLnJhbmRvbSA9IEJ1ZmZlci5mcm9tKGNyeXB0by5nZW5lcmF0ZVNhZmVVaWQoZHNlZWQpKTtcblxuICAgICAgICByZXR1cm4gdWlkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlQ29tcGFjdEZvcm0oe3RhZywgcmFuZG9tLCBiYWNrdXB9KSB7XG4gICAgICAgIGxldCBjb21wYWN0SWQgPSB0YWcgKyByYW5kb20udG9TdHJpbmcoJ2Jhc2U2NCcpO1xuICAgICAgICBpZiAoYmFja3VwKSB7XG4gICAgICAgICAgICBjb21wYWN0SWQgKz0gJ3wnICsgQnVmZmVyLmZyb20oSlNPTi5zdHJpbmdpZnkoYmFja3VwKSkudG9TdHJpbmcoJ2Jhc2U2NCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBCdWZmZXIuZnJvbShlbmNvZGVVUklDb21wb25lbnQoY29tcGFjdElkKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZW5jcnlwdChpZCwgZW5jcnlwdGlvbktleSkge1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoICE9PSAyKXtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgV3JvbmcgbnVtYmVyIG9mIGFyZ3VtZW50cy4gRXhwZWN0ZWQ6IDI7IHByb3ZpZGVkICR7YXJndW1lbnRzLmxlbmd0aH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB0YWc7XG4gICAgICAgIGlmICh0eXBlb2YgaWQgPT09IFwib2JqZWN0XCIgJiYgIUJ1ZmZlci5pc0J1ZmZlcihpZCkpIHtcbiAgICAgICAgICAgIHRhZyA9IGlkLnRhZztcbiAgICAgICAgICAgIGlkID0gZ2VuZXJhdGVDb21wYWN0Rm9ybShpZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGFnID09PSAncycpIHtcbiAgICAgICAgICAgIC8vVE9ETyBlbmNyeXB0IHNlZWRcbiAgICAgICAgfWVsc2UgaWYgKHRhZyA9PT0gJ2QnKSB7XG4gICAgICAgICAgICAvL1RPRE8gZW5jcnlwdCBkc2VlZFxuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBwcm92aWRlZCBpZCBjYW5ub3QgYmUgZW5jcnlwdGVkXCIpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsb2FkKGNvbXBhY3RJZCkge1xuICAgICAgICBpZih0eXBlb2YgY29tcGFjdElkID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIHR5cGUgc3RyaW5nIG9yIEJ1ZmZlci4gUmVjZWl2ZWQgdW5kZWZpbmVkYCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0eXBlb2YgY29tcGFjdElkICE9PSBcInN0cmluZ1wiKXtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29tcGFjdElkID09PSBcIm9iamVjdFwiICYmICFCdWZmZXIuaXNCdWZmZXIoY29tcGFjdElkKSkge1xuICAgICAgICAgICAgICAgIGNvbXBhY3RJZCA9IEJ1ZmZlci5mcm9tKGNvbXBhY3RJZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbXBhY3RJZCA9IGNvbXBhY3RJZC50b1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGVjb2RlZENvbXBhY3RJZCA9IGRlY29kZVVSSUNvbXBvbmVudChjb21wYWN0SWQpO1xuICAgICAgICBjb25zdCBpZCA9IHt9O1xuICAgICAgICBjb25zdCBzcGxpdENvbXBhY3RJZCA9IGRlY29kZWRDb21wYWN0SWQuc3Vic3RyaW5nKDEpLnNwbGl0KCd8Jyk7XG5cbiAgICAgICAgaWQudGFnID0gZGVjb2RlZENvbXBhY3RJZFswXTtcbiAgICAgICAgaWQucmFuZG9tID0gQnVmZmVyLmZyb20oc3BsaXRDb21wYWN0SWRbMF0sICdiYXNlNjQnKTtcblxuICAgICAgICBpZihzcGxpdENvbXBhY3RJZFsxXSAmJiBzcGxpdENvbXBhY3RJZFsxXS5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgIGlkLmJhY2t1cCA9IEpTT04ucGFyc2UoQnVmZmVyLmZyb20oc3BsaXRDb21wYWN0SWRbMV0sICdiYXNlNjQnKS50b1N0cmluZygpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ1NCSWRlbnRpZmllcjtcbiIsImNvbnN0IE93TSA9IHJlcXVpcmUoJ3N3YXJtdXRpbHMnKS5Pd007XG5jb25zdCBwc2tkYiA9IHJlcXVpcmUoJ3Bza2RiJyk7XG5cbmZ1bmN0aW9uIFJhd0NTQihpbml0RGF0YSkge1xuXHRjb25zdCBkYXRhID0gbmV3IE93TSh7YmxvY2tjaGFpbjogaW5pdERhdGF9KTtcblx0Y29uc3QgYmxvY2tjaGFpbiA9IHBza2RiLnN0YXJ0RGIoe2dldEluaXRWYWx1ZXMsIHBlcnNpc3R9KTtcblxuXHRpZighZGF0YS5ibG9ja2NoYWluKSB7XG5cdFx0ZGF0YS5ibG9ja2NoYWluID0ge1xuXHRcdFx0dHJhbnNhY3Rpb25Mb2cgOiAnJyxcblx0XHRcdGVtYmVkZGVkRmlsZXM6IHt9XG5cdFx0fTtcblx0fVxuXG5cdGRhdGEuZW1iZWRGaWxlID0gZnVuY3Rpb24gKGZpbGVBbGlhcywgZmlsZURhdGEpIHtcblx0XHRjb25zdCBlbWJlZGRlZEFzc2V0ID0gZGF0YS5nZXRBc3NldChcImdsb2JhbC5FbWJlZGRlZEZpbGVcIiwgZmlsZUFsaWFzKTtcblx0XHRpZihlbWJlZGRlZEFzc2V0LmlzUGVyc2lzdGVkKCkpe1xuXHRcdFx0Y29uc29sZS5sb2coYEZpbGUgd2l0aCBhbGlhcyAke2ZpbGVBbGlhc30gYWxyZWFkeSBleGlzdHNgKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRkYXRhLmJsb2NrY2hhaW4uZW1iZWRkZWRGaWxlc1tmaWxlQWxpYXNdID0gZmlsZURhdGE7XG5cdFx0ZGF0YS5zYXZlQXNzZXQoZW1iZWRkZWRBc3NldCk7XG5cdH07XG5cblx0ZGF0YS5hdHRhY2hGaWxlID0gZnVuY3Rpb24gKGZpbGVBbGlhcywgcGF0aCwgc2VlZCkge1xuXHRcdGRhdGEubW9kaWZ5QXNzZXQoXCJnbG9iYWwuRmlsZVJlZmVyZW5jZVwiLCBmaWxlQWxpYXMsIChmaWxlKSA9PiB7XG5cdFx0XHRpZiAoIWZpbGUuaXNFbXB0eSgpKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBGaWxlIHdpdGggYWxpYXMgJHtmaWxlQWxpYXN9IGFscmVhZHkgZXhpc3RzYCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0ZmlsZS5pbml0KGZpbGVBbGlhcywgcGF0aCwgc2VlZCk7XG5cdFx0fSk7XG5cdH07XG5cblx0ZGF0YS5zYXZlQXNzZXQgPSBmdW5jdGlvbihhc3NldCkge1xuXHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcblx0XHR0cmFuc2FjdGlvbi5hZGQoYXNzZXQpO1xuXHRcdGJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcblx0fTtcblxuXHRkYXRhLm1vZGlmeUFzc2V0ID0gZnVuY3Rpb24oYXNzZXRUeXBlLCBhaWQsIGFzc2V0TW9kaWZpZXIpIHtcblx0XHRjb25zdCB0cmFuc2FjdGlvbiA9IGJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG5cdFx0Y29uc3QgYXNzZXQgPSB0cmFuc2FjdGlvbi5sb29rdXAoYXNzZXRUeXBlLCBhaWQpO1xuXHRcdGFzc2V0TW9kaWZpZXIoYXNzZXQpO1xuXG5cdFx0dHJhbnNhY3Rpb24uYWRkKGFzc2V0KTtcblx0XHRibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG5cdH07XG5cblx0ZGF0YS5nZXRBc3NldCA9IGZ1bmN0aW9uIChhc3NldFR5cGUsIGFpZCkge1xuXHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcblx0XHRyZXR1cm4gdHJhbnNhY3Rpb24ubG9va3VwKGFzc2V0VHlwZSwgYWlkKTtcblx0fTtcblxuXHRkYXRhLmdldEFsbEFzc2V0cyA9IGZ1bmN0aW9uKGFzc2V0VHlwZSkge1xuXHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcblx0XHRyZXR1cm4gdHJhbnNhY3Rpb24ubG9hZEFzc2V0cyhhc3NldFR5cGUpO1xuXHR9O1xuXG5cdC8qIGludGVybmFsIGZ1bmN0aW9ucyAqL1xuXG5cdGZ1bmN0aW9uIHBlcnNpc3QodHJhbnNhY3Rpb25Mb2csIGN1cnJlbnRWYWx1ZXMsIGN1cnJlbnRQdWxzZSkge1xuXHRcdHRyYW5zYWN0aW9uTG9nLmN1cnJlbnRQdWxzZSA9IGN1cnJlbnRQdWxzZTtcblxuXHRcdGRhdGEuYmxvY2tjaGFpbi5jdXJyZW50VmFsdWVzID0gY3VycmVudFZhbHVlcztcblx0XHRkYXRhLmJsb2NrY2hhaW4udHJhbnNhY3Rpb25Mb2cgKz0gbWtTaW5nbGVMaW5lKEpTT04uc3RyaW5naWZ5KHRyYW5zYWN0aW9uTG9nKSkgKyBcIlxcblwiO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0SW5pdFZhbHVlcyAoKSB7XG5cdFx0aWYoIWRhdGEuYmxvY2tjaGFpbiB8fCAhZGF0YS5ibG9ja2NoYWluLmN1cnJlbnRWYWx1ZXMpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRyZXR1cm4gZGF0YS5ibG9ja2NoYWluLmN1cnJlbnRWYWx1ZXM7XG5cdH1cblxuXHRmdW5jdGlvbiBta1NpbmdsZUxpbmUoc3RyKSB7XG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlKC9cXG58XFxyL2csIFwiXCIpO1xuXHR9XG5cblx0cmV0dXJuIGRhdGE7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmF3Q1NCOyIsImNvbnN0IFJhd0NTQiA9IHJlcXVpcmUoJy4vUmF3Q1NCJyk7XG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCBjcnlwdG8gPSByZXF1aXJlKCdwc2tjcnlwdG8nKTtcbmNvbnN0IHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvdXRpbHMnKTtcbmNvbnN0IERzZWVkQ2FnZSA9IHJlcXVpcmUoJy4uL3V0aWxzL0RzZWVkQ2FnZScpO1xuY29uc3QgSGFzaENhZ2UgPSByZXF1aXJlKCcuLi91dGlscy9IYXNoQ2FnZScpO1xuY29uc3QgQ1NCQ2FjaGUgPSByZXF1aXJlKFwiLi9DU0JDYWNoZVwiKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKFwiLi9DU0JJZGVudGlmaWVyXCIpO1xuY29uc3QgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJyk7XG5cbmNvbnN0IHJhd0NTQkNhY2hlID0gbmV3IENTQkNhY2hlKDEwKTtcbmNvbnN0IGluc3RhbmNlcyA9IHt9O1xuXG4vKipcbiAqXG4gKiBAcGFyYW0gbG9jYWxGb2xkZXIgICAtIHJlcXVpcmVkXG4gKiBAcGFyYW0gY3VycmVudFJhd0NTQiAtIG9wdGlvbmFsXG4gKiBAcGFyYW0gY3NiSWRlbnRpZmllciAtIHJlcXVpcmVkXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUm9vdENTQihsb2NhbEZvbGRlciwgY3VycmVudFJhd0NTQiwgY3NiSWRlbnRpZmllcikge1xuICAgIGlmICghbG9jYWxGb2xkZXIgfHwgIWNzYklkZW50aWZpZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlcnMnKTtcbiAgICB9XG5cblxuICAgIGNvbnN0IGhhc2hDYWdlID0gbmV3IEhhc2hDYWdlKGxvY2FsRm9sZGVyKTtcbiAgICBjb25zdCBldmVudCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgICB0aGlzLm9uID0gZXZlbnQub247XG4gICAgdGhpcy5vZmYgPSBldmVudC5yZW1vdmVMaXN0ZW5lcjtcbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyA9IGV2ZW50LnJlbW92ZUFsbExpc3RlbmVycztcbiAgICB0aGlzLmVtaXQgPSBldmVudC5lbWl0O1xuXG4gICAgdGhpcy5nZXRNaWRSb290ID0gZnVuY3Rpb24gKENTQlBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG4gICAgfTtcblxuICAgIHRoaXMubG9hZFJhd0NTQiA9IGZ1bmN0aW9uIChDU0JQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIWN1cnJlbnRSYXdDU0IpIHtcbiAgICAgICAgICAgIF9fbG9hZFJhd0NTQihjc2JJZGVudGlmaWVyLCAoZXJyLCByYXdDU0IpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGN1cnJlbnRSYXdDU0IgPSByYXdDU0I7XG5cbiAgICAgICAgICAgICAgICBpZiAoQ1NCUGF0aCB8fCBDU0JQYXRoICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRSYXdDU0IoQ1NCUGF0aCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBjdXJyZW50UmF3Q1NCKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghQ1NCUGF0aCB8fCBDU0JQYXRoID09PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIGN1cnJlbnRSYXdDU0IpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sb2FkQXNzZXRGcm9tUGF0aChDU0JQYXRoLCAoZXJyLCBhc3NldCwgcmF3Q1NCKSA9PiB7XG5cbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFhc3NldCB8fCAhYXNzZXQuZHNlZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKGBUaGUgQ1NCUGF0aCAke0NTQlBhdGh9IGlzIGludmFsaWQuYCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfX2xvYWRSYXdDU0IobmV3IENTQklkZW50aWZpZXIoYXNzZXQuZHNlZWQpLCBjYWxsYmFjayk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLnNhdmVSYXdDU0IgPSBmdW5jdGlvbiAocmF3Q1NCLCBDU0JQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBzYXZlIG1hc3RlclxuICAgICAgICBpZiAoIUNTQlBhdGggfHwgQ1NCUGF0aCA9PT0gJycpIHtcbiAgICAgICAgICAgIGlmIChyYXdDU0IpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UmF3Q1NCID0gcmF3Q1NCO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfX2luaXRpYWxpemVBc3NldHMoY3VycmVudFJhd0NTQik7XG4gICAgICAgICAgICByZXR1cm4gX193cml0ZVJhd0NTQihjdXJyZW50UmF3Q1NCLCBjc2JJZGVudGlmaWVyLCBjYWxsYmFjayk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzYXZlIGNzYiBpbiBoaWVyYXJjaHlcbiAgICAgICAgY29uc3Qgc3BsaXRQYXRoID0gX19zcGxpdFBhdGgoQ1NCUGF0aCk7XG4gICAgICAgIHRoaXMubG9hZEFzc2V0RnJvbVBhdGgoQ1NCUGF0aCwgKGVyciwgY3NiUmVmZXJlbmNlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWNzYlJlZmVyZW5jZS5kc2VlZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJhY2t1cHMgPSBjc2JJZGVudGlmaWVyLmdldEJhY2t1cFVybHMoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdDU0JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIodW5kZWZpbmVkLCBiYWNrdXBzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBsb2NhbFNlZWQgPSBuZXdDU0JJZGVudGlmaWVyLmdldFNlZWQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBsb2NhbERzZWVkID0gbmV3Q1NCSWRlbnRpZmllci5nZXREc2VlZCgpO1xuICAgICAgICAgICAgICAgIGNzYlJlZmVyZW5jZS5pbml0KHNwbGl0UGF0aC5hc3NldEFpZCwgbG9jYWxTZWVkLCBsb2NhbERzZWVkKTtcblxuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZUFzc2V0VG9QYXRoKENTQlBhdGgsIGNzYlJlZmVyZW5jZSwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZEFzc2V0RnJvbVBhdGgoQ1NCUGF0aCwgKGVyciwgY3NiUmVmKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIF9faW5pdGlhbGl6ZUFzc2V0cyhyYXdDU0IsIGNzYlJlZiwgYmFja3Vwcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBfX3dyaXRlUmF3Q1NCKHJhd0NTQiwgbmV3IENTQklkZW50aWZpZXIoY3NiUmVmZXJlbmNlLmRzZWVkKSwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdlbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfX3dyaXRlUmF3Q1NCKHJhd0NTQiwgbmV3IENTQklkZW50aWZpZXIoY3NiUmVmZXJlbmNlLmRzZWVkKSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5zYXZlQXNzZXRUb1BhdGggPSBmdW5jdGlvbiAoQ1NCUGF0aCwgYXNzZXQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHNwbGl0UGF0aCA9IF9fc3BsaXRQYXRoKENTQlBhdGgsIHtrZWVwQWxpYXNlc0FzU3RyaW5nOiB0cnVlfSk7XG4gICAgICAgIHRoaXMubG9hZFJhd0NTQihzcGxpdFBhdGguQ1NCQWxpYXNlcywgKGVyciwgcmF3Q1NCKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJhd0NTQi5zYXZlQXNzZXQoYXNzZXQpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZVJhd0NTQihyYXdDU0IsIHNwbGl0UGF0aC5DU0JBbGlhc2VzLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5sb2FkQXNzZXRGcm9tUGF0aCA9IGZ1bmN0aW9uIChDU0JQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBwcm9jZXNzZWRQYXRoID0gX19zcGxpdFBhdGgoQ1NCUGF0aCk7XG4gICAgICAgIGlmICghY3VycmVudFJhd0NTQikge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignY3VycmVudFJhd0NTQiBkb2VzIG5vdCBleGlzdCcpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBDU0JSZWZlcmVuY2UgPSBudWxsO1xuICAgICAgICBpZiAocHJvY2Vzc2VkUGF0aC5DU0JBbGlhc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRBbGlhcyA9IHByb2Nlc3NlZFBhdGguQ1NCQWxpYXNlc1swXTtcbiAgICAgICAgICAgIENTQlJlZmVyZW5jZSA9IGN1cnJlbnRSYXdDU0IuZ2V0QXNzZXQoJ2dsb2JhbC5DU0JSZWZlcmVuY2UnLCBuZXh0QWxpYXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFwcm9jZXNzZWRQYXRoLmFzc2V0VHlwZSB8fCAhcHJvY2Vzc2VkUGF0aC5hc3NldEFpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ05vdCBhc3NldCB0eXBlIG9yIGlkIHNwZWNpZmllZCBpbiBDU0JQYXRoJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBDU0JSZWZlcmVuY2UgPSBjdXJyZW50UmF3Q1NCLmdldEFzc2V0KHByb2Nlc3NlZFBhdGguYXNzZXRUeXBlLCBwcm9jZXNzZWRQYXRoLmFzc2V0QWlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9jZXNzZWRQYXRoLkNTQkFsaWFzZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgQ1NCUmVmZXJlbmNlLCBjdXJyZW50UmF3Q1NCKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb2Nlc3NlZFBhdGguQ1NCQWxpYXNlcy5zaGlmdCgpO1xuXG4gICAgICAgIGlmKCFDU0JSZWZlcmVuY2UgfHwgIUNTQlJlZmVyZW5jZS5kc2VlZCl7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKGBUaGUgQ1NCUGF0aCAke0NTQlBhdGh9IGlzIGludmFsaWRgKSk7XG4gICAgICAgIH1cbiAgICAgICAgX19sb2FkQXNzZXRGcm9tUGF0aChwcm9jZXNzZWRQYXRoLCBuZXcgQ1NCSWRlbnRpZmllcihDU0JSZWZlcmVuY2UuZHNlZWQpLCAwLCBjYWxsYmFjayk7XG4gICAgfTtcblxuXG4gICAgLyogLS0tLS0tLS0tLS0tLS0tLS0tLSBJTlRFUk5BTCBNRVRIT0RTIC0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuICAgIGZ1bmN0aW9uIF9fbG9hZFJhd0NTQihsb2NhbENTQklkZW50aWZpZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHVpZCA9IGxvY2FsQ1NCSWRlbnRpZmllci5nZXRVaWQoKTtcbiAgICAgICAgY29uc3QgY2FjaGVkUmF3Q1NCID0gcmF3Q1NCQ2FjaGUubG9hZCh1aWQpO1xuXG4gICAgICAgIGlmIChjYWNoZWRSYXdDU0IpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBjYWNoZWRSYXdDU0IpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgcm9vdFBhdGggPSB1dGlscy5nZW5lcmF0ZVBhdGgobG9jYWxGb2xkZXIsIGxvY2FsQ1NCSWRlbnRpZmllcik7XG4gICAgICAgIGZzLnJlYWRGaWxlKHJvb3RQYXRoLCAoZXJyLCBlbmNyeXB0ZWRDc2IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY3J5cHRvLmRlY3J5cHRPYmplY3QoZW5jcnlwdGVkQ3NiLCBsb2NhbENTQklkZW50aWZpZXIuZ2V0RHNlZWQoKSwgKGVyciwgY3NiRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IGNzYiA9IG5ldyBSYXdDU0IoY3NiRGF0YSk7XG4gICAgICAgICAgICAgICAgcmF3Q1NCQ2FjaGUucHV0KHVpZCwgY3NiKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBjc2IpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIENTQlBhdGg6IHN0cmluZyAtIGludGVybmFsIHBhdGggdGhhdCBsb29rcyBsaWtlIC97Q1NCTmFtZTF9L3tDU0JOYW1lMn06e2Fzc2V0VHlwZX06e2Fzc2V0QWxpYXNPcklkfVxuICAgICAqIEBwYXJhbSBvcHRpb25zOm9iamVjdFxuICAgICAqIEByZXR1cm5zIHt7Q1NCQWxpYXNlczogW3N0cmluZ10sIGFzc2V0QWlkOiAoKnx1bmRlZmluZWQpLCBhc3NldFR5cGU6ICgqfHVuZGVmaW5lZCl9fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX19zcGxpdFBhdGgoQ1NCUGF0aCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGNvbnN0IHBhdGhTZXBhcmF0b3IgPSAnLyc7XG5cbiAgICAgICAgaWYgKENTQlBhdGguc3RhcnRzV2l0aChwYXRoU2VwYXJhdG9yKSkge1xuICAgICAgICAgICAgQ1NCUGF0aCA9IENTQlBhdGguc3Vic3RyaW5nKDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IENTQkFsaWFzZXMgPSBDU0JQYXRoLnNwbGl0KHBhdGhTZXBhcmF0b3IpO1xuICAgICAgICBpZiAoQ1NCQWxpYXNlcy5sZW5ndGggPCAxKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NTQlBhdGggdG9vIHNob3J0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBsYXN0SW5kZXggPSBDU0JBbGlhc2VzLmxlbmd0aCAtIDE7XG4gICAgICAgIGNvbnN0IG9wdGlvbmFsQXNzZXRTZWxlY3RvciA9IENTQkFsaWFzZXNbbGFzdEluZGV4XS5zcGxpdCgnOicpO1xuXG4gICAgICAgIGlmIChvcHRpb25hbEFzc2V0U2VsZWN0b3JbMF0gPT09ICcnKSB7XG4gICAgICAgICAgICBDU0JBbGlhc2VzID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBDU0JBbGlhc2VzW2xhc3RJbmRleF0gPSBvcHRpb25hbEFzc2V0U2VsZWN0b3JbMF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW9wdGlvbmFsQXNzZXRTZWxlY3RvclsxXSAmJiAhb3B0aW9uYWxBc3NldFNlbGVjdG9yWzJdKSB7XG4gICAgICAgICAgICBvcHRpb25hbEFzc2V0U2VsZWN0b3JbMV0gPSAnZ2xvYmFsLkNTQlJlZmVyZW5jZSc7XG4gICAgICAgICAgICBvcHRpb25hbEFzc2V0U2VsZWN0b3JbMl0gPSBDU0JBbGlhc2VzW2xhc3RJbmRleF07XG4gICAgICAgICAgICBDU0JBbGlhc2VzLnBvcCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMua2VlcEFsaWFzZXNBc1N0cmluZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgQ1NCQWxpYXNlcyA9IENTQkFsaWFzZXMuam9pbignLycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBDU0JBbGlhc2VzOiBDU0JBbGlhc2VzLFxuICAgICAgICAgICAgYXNzZXRUeXBlOiBvcHRpb25hbEFzc2V0U2VsZWN0b3JbMV0sXG4gICAgICAgICAgICBhc3NldEFpZDogb3B0aW9uYWxBc3NldFNlbGVjdG9yWzJdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX19sb2FkQXNzZXRGcm9tUGF0aChwcm9jZXNzZWRQYXRoLCBsb2NhbENTQklkZW50aWZpZXIsIGN1cnJlbnRJbmRleCwgY2FsbGJhY2spIHtcbiAgICAgICAgX19sb2FkUmF3Q1NCKGxvY2FsQ1NCSWRlbnRpZmllciwgKGVyciwgcmF3Q1NCKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50SW5kZXggPCBwcm9jZXNzZWRQYXRoLkNTQkFsaWFzZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV4dEFsaWFzID0gcHJvY2Vzc2VkUGF0aC5DU0JBbGlhc2VzW2N1cnJlbnRJbmRleF07XG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXQgPSByYXdDU0IuZ2V0QXNzZXQoXCJnbG9iYWwuQ1NCUmVmZXJlbmNlXCIsIG5leHRBbGlhcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Q1NCSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKGFzc2V0LmRzZWVkKTtcblxuICAgICAgICAgICAgICAgIF9fbG9hZEFzc2V0RnJvbVBhdGgocHJvY2Vzc2VkUGF0aCwgbmV3Q1NCSWRlbnRpZmllciwgKytjdXJyZW50SW5kZXgsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFzc2V0ID0gcmF3Q1NCLmdldEFzc2V0KHByb2Nlc3NlZFBhdGguYXNzZXRUeXBlLCBwcm9jZXNzZWRQYXRoLmFzc2V0QWlkKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGFzc2V0LCByYXdDU0IpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX193cml0ZVJhd0NTQihyYXdDU0IsIGxvY2FsQ1NCSWRlbnRpZmllciwgY2FsbGJhY2spIHtcbiAgICAgICAgY3J5cHRvLmVuY3J5cHRPYmplY3QocmF3Q1NCLmJsb2NrY2hhaW4sIGxvY2FsQ1NCSWRlbnRpZmllci5nZXREc2VlZCgpLCBudWxsLCAoZXJyLCBlbmNyeXB0ZWRCbG9ja2NoYWluKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGhhc2hDYWdlLmxvYWRIYXNoKChlcnIsIGhhc2hPYmopID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGxvY2FsQ1NCSWRlbnRpZmllci5nZXRVaWQoKTtcbiAgICAgICAgICAgICAgICBoYXNoT2JqW2tleV0gPSBjcnlwdG8ucHNrSGFzaChlbmNyeXB0ZWRCbG9ja2NoYWluKS50b1N0cmluZygnaGV4Jyk7XG5cbiAgICAgICAgICAgICAgICBoYXNoQ2FnZS5zYXZlSGFzaChoYXNoT2JqLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlKHV0aWxzLmdlbmVyYXRlUGF0aChsb2NhbEZvbGRlciwgbG9jYWxDU0JJZGVudGlmaWVyKSwgZW5jcnlwdGVkQmxvY2tjaGFpbiwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9faW5pdGlhbGl6ZUFzc2V0cyhyYXdDU0IsIGNzYlJlZiwgYmFja3VwVXJscykge1xuXG4gICAgICAgIGxldCBpc01hc3RlcjtcblxuICAgICAgICBjb25zdCBjc2JNZXRhID0gcmF3Q1NCLmdldEFzc2V0KCdnbG9iYWwuQ1NCTWV0YScsICdtZXRhJyk7XG4gICAgICAgIGlmIChjdXJyZW50UmF3Q1NCID09PSByYXdDU0IpIHtcbiAgICAgICAgICAgIGlzTWFzdGVyID0gdHlwZW9mIGNzYk1ldGEuaXNNYXN0ZXIgPT09ICd1bmRlZmluZWQnID8gdHJ1ZSA6IGNzYk1ldGEuaXNNYXN0ZXI7XG4gICAgICAgICAgICBpZiAoIWNzYk1ldGEuaWQpIHtcbiAgICAgICAgICAgICAgICBjc2JNZXRhLmluaXQoJCQudWlkR2VuZXJhdG9yLnNhZmVfdXVpZCgpKTtcbiAgICAgICAgICAgICAgICBjc2JNZXRhLnNldElzTWFzdGVyKGlzTWFzdGVyKTtcbiAgICAgICAgICAgICAgICByYXdDU0Iuc2F2ZUFzc2V0KGNzYk1ldGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYmFja3VwVXJscy5mb3JFYWNoKCh1cmwpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB1aWQgPSAkJC51aWRHZW5lcmF0b3Iuc2FmZV91dWlkKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYmFja3VwID0gcmF3Q1NCLmdldEFzc2V0KCdnbG9iYWwuQmFja3VwJywgdWlkKTtcbiAgICAgICAgICAgICAgICBiYWNrdXAuaW5pdCh1aWQsIHVybCk7XG4gICAgICAgICAgICAgICAgcmF3Q1NCLnNhdmVBc3NldChiYWNrdXApO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlzTWFzdGVyID0gdHlwZW9mIGNzYk1ldGEuaXNNYXN0ZXIgPT09ICd1bmRlZmluZWQnID8gZmFsc2UgOiBjc2JNZXRhLmlzTWFzdGVyO1xuICAgICAgICAgICAgY3NiTWV0YS5pbml0KGNzYlJlZi5nZXRNZXRhZGF0YSgnc3dhcm1JZCcpKTtcbiAgICAgICAgICAgIGNzYk1ldGEuc2V0SXNNYXN0ZXIoaXNNYXN0ZXIpO1xuICAgICAgICAgICAgcmF3Q1NCLnNhdmVBc3NldChjc2JNZXRhKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVSb290Q1NCKGxvY2FsRm9sZGVyLCBtYXN0ZXJSYXdDU0IsIGNzYklkZW50aWZpZXIsIHBpbiwgY2FsbGJhY2spIHtcbiAgICBsZXQgbWFzdGVyRHNlZWQ7XG5cbiAgICBpZiAoY3NiSWRlbnRpZmllcikge1xuICAgICAgICBtYXN0ZXJEc2VlZCA9IGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKTtcbiAgICAgICAgaWYgKG1hc3RlclJhd0NTQikge1xuICAgICAgICAgICAgY29uc3Qgcm9vdENTQiA9IG5ldyBSb290Q1NCKGxvY2FsRm9sZGVyLCBtYXN0ZXJSYXdDU0IsIG1hc3RlckRzZWVkKTtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCByb290Q1NCKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBsb2FkV2l0aElkZW50aWZpZXIobG9jYWxGb2xkZXIsIG1hc3RlckRzZWVkLCBjYWxsYmFjayk7XG4gICAgfSBlbHNlIGlmIChwaW4pIHtcblxuICAgICAgICByZXR1cm4gbG9hZFdpdGhQaW4obG9jYWxGb2xkZXIsIHBpbiwgY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ01pc3Npbmcgc2VlZCwgZHNlZWQgYW5kIHBpbiwgYXQgbGVhc3Qgb25lIGlzIHJlcXVpcmVkJykpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gbG9hZFdpdGhQaW4obG9jYWxGb2xkZXIsIHBpbiwgY2FsbGJhY2spIHtcbiAgICBuZXcgRHNlZWRDYWdlKGxvY2FsRm9sZGVyKS5sb2FkRHNlZWRCYWNrdXBzKHBpbiwgKGVyciwgY3NiSWRlbnRpZmllciwgYmFja3VwcykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY3NiSWRlbnRpZmllciAmJiAoIWJhY2t1cHMgfHwgYmFja3Vwcy5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY3NiSWRlbnRpZmllcikge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGJhY2t1cHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZHNlZWQgPSBjc2JJZGVudGlmaWVyLmdldERzZWVkKCk7XG4gICAgICAgIGNvbnN0IGtleSA9IGNyeXB0by5nZW5lcmF0ZVNhZmVVaWQoZHNlZWQsIGxvY2FsRm9sZGVyKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZXNba2V5XSkge1xuICAgICAgICAgICAgaW5zdGFuY2VzW2tleV0gPSBuZXcgUm9vdENTQihsb2NhbEZvbGRlciwgbnVsbCwgY3NiSWRlbnRpZmllcik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByb290Q1NCID0gaW5zdGFuY2VzW2tleV07XG5cbiAgICAgICAgcm9vdENTQi5sb2FkUmF3Q1NCKCcnLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHJvb3RDU0IsIGNzYklkZW50aWZpZXIsIGJhY2t1cHMpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gbG9hZFdpdGhJZGVudGlmaWVyKGxvY2FsRm9sZGVyLCBjc2JJZGVudGlmaWVyLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IG1hc3RlckRzZWVkID0gY3NiSWRlbnRpZmllci5nZXREc2VlZCgpO1xuICAgIGNvbnN0IGtleSA9IGNyeXB0by5nZW5lcmF0ZVNhZmVVaWQobWFzdGVyRHNlZWQsIGxvY2FsRm9sZGVyKTtcbiAgICBpZiAoIWluc3RhbmNlc1trZXldKSB7XG4gICAgICAgIGluc3RhbmNlc1trZXldID0gbmV3IFJvb3RDU0IobG9jYWxGb2xkZXIsIG51bGwsIGNzYklkZW50aWZpZXIpO1xuICAgIH1cblxuICAgIGNvbnN0IHJvb3RDU0IgPSBpbnN0YW5jZXNba2V5XTtcbiAgICByb290Q1NCLmxvYWRSYXdDU0IoJycsIChlcnIpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcm9vdENTQik7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU5ldyhsb2NhbEZvbGRlciwgY3NiSWRlbnRpZmllciwgcmF3Q1NCKSB7XG4gICAgaWYgKCFsb2NhbEZvbGRlciB8fCAhY3NiSWRlbnRpZmllcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHJlcXVpcmVkIGFyZ3VtZW50c1wiKTtcbiAgICB9XG5cbiAgICByYXdDU0IgPSByYXdDU0IgfHwgbmV3IFJhd0NTQigpO1xuICAgIGNvbnN0IG1hc3RlckRzZWVkID0gY3NiSWRlbnRpZmllci5nZXREc2VlZCgpO1xuICAgIGNvbnN0IGtleSA9IGNyeXB0by5nZW5lcmF0ZVNhZmVVaWQobWFzdGVyRHNlZWQsIGxvY2FsRm9sZGVyKTtcbiAgICBpZiAoIWluc3RhbmNlc1trZXldKSB7XG4gICAgICAgIGluc3RhbmNlc1trZXldID0gbmV3IFJvb3RDU0IobG9jYWxGb2xkZXIsIHJhd0NTQiwgY3NiSWRlbnRpZmllcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGluc3RhbmNlc1trZXldO1xufVxuXG5mdW5jdGlvbiB3cml0ZU5ld01hc3RlckNTQihsb2NhbEZvbGRlciwgY3NiSWRlbnRpZmllciwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWxvY2FsRm9sZGVyIHx8ICFjc2JJZGVudGlmaWVyKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ01pc3NpbmcgcmVxdWlyZWQgYXJndW1lbnRzJykpO1xuICAgIH1cblxuICAgIGNvbnN0IG1hc3RlckRzZWVkID0gY3NiSWRlbnRpZmllci5nZXREc2VlZCgpO1xuICAgIGNvbnN0IGtleSA9IGNyeXB0by5nZW5lcmF0ZVNhZmVVaWQobWFzdGVyRHNlZWQsIGxvY2FsRm9sZGVyKTtcbiAgICBpZiAoIWluc3RhbmNlc1trZXldKSB7XG4gICAgICAgIGluc3RhbmNlc1trZXldID0gbmV3IFJvb3RDU0IobG9jYWxGb2xkZXIsIG51bGwsIGNzYklkZW50aWZpZXIpO1xuICAgIH1cblxuICAgIGNvbnN0IHJvb3RDU0IgPSBpbnN0YW5jZXNba2V5XTtcbiAgICByb290Q1NCLnNhdmVSYXdDU0IobmV3IFJhd0NTQigpLCAnJywgY2FsbGJhY2spO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjcmVhdGVOZXcsXG4gICAgY3JlYXRlUm9vdENTQixcbiAgICBsb2FkV2l0aElkZW50aWZpZXIsXG4gICAgbG9hZFdpdGhQaW4sXG4gICAgd3JpdGVOZXdNYXN0ZXJDU0Jcbn07IiwiXG5mdW5jdGlvbiBFVkZTUmVzb2x2ZXIoKSB7XG4gICAgbGV0IGlzQXV0aGVudGljYXRlZCA9IGZhbHNlO1xuXG4gICAgdGhpcy5hdXRoID0gZnVuY3Rpb24gKHVybCwgYXV0aE9iaiwgY2FsbGJhY2spIHtcbiAgICAgICAgaXNBdXRoZW50aWNhdGVkID0gdHJ1ZTtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9O1xuXG4gICAgdGhpcy5zYXZlID0gZnVuY3Rpb24gKHVybCwgY3NiSWRlbnRpZmllciwgZGF0YVN0cmVhbSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFpc0F1dGhlbnRpY2F0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ1VuYXV0aGVudGljYXRlZCcpKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KHVybCArIFwiL0NTQi9cIiArIGNzYklkZW50aWZpZXIuZ2V0VWlkKCksIGRhdGFTdHJlYW0sIChlcnIsIHJlcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHJlcyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLmxvYWQgPSBmdW5jdGlvbiAodXJsLCBjc2JJZGVudGlmaWVyLCB2ZXJzaW9uLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIWlzQXV0aGVudGljYXRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignVW5hdXRoZW50aWNhdGVkJykpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiB2ZXJzaW9uID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gdmVyc2lvbjtcbiAgICAgICAgICAgIHZlcnNpb24gPSBcIlwiO1xuICAgICAgICB9XG5cbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cEdldCh1cmwgKyBcIi9DU0IvXCIgKyBjc2JJZGVudGlmaWVyLmdldFVpZCgpICsgXCIvXCIgKyB2ZXJzaW9uLCAoZXJyLCByZXNvdXJjZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHJlc291cmNlKTtcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG4gICAgdGhpcy5nZXRWZXJzaW9ucyA9IGZ1bmN0aW9uICh1cmwsIGNzYklkZW50aWZpZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghaXNBdXRoZW50aWNhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdVbmF1dGhlbnRpY2F0ZWQnKSk7XG4gICAgICAgIH1cblxuICAgICAgICAkJC5yZW1vdGUuZG9IdHRwR2V0KHVybCArIFwiL0NTQi9cIiArIGNzYklkZW50aWZpZXIuZ2V0VWlkKCkgKyBcIi92ZXJzaW9uc1wiLCAoZXJyLCB2ZXJzaW9ucykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIEpTT04ucGFyc2UodmVyc2lvbnMpKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuY29tcGFyZVZlcnNpb25zID0gZnVuY3Rpb24gKHVybCwgZmlsZXNMaXN0LCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIWlzQXV0aGVudGljYXRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignVW5hdXRoZW50aWNhdGVkJykpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cFBvc3QodXJsICsgXCIvQ1NCL2NvbXBhcmVWZXJzaW9uc1wiLCBKU09OLnN0cmluZ2lmeShmaWxlc0xpc3QpLCAoZXJyLCBtb2RpZmllZEZpbGVzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgbW9kaWZpZWRGaWxlcyk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRVZGU1Jlc29sdmVyOyIsImNvbnN0IGZsb3dzVXRpbHMgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy92YWxpZGF0b3JcIik7XG5jb25zdCBEc2VlZENhZ2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRHNlZWRDYWdlXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJhZGRCYWNrdXBcIiwge1xuICAgIHN0YXJ0OiBmdW5jdGlvbiAoYmFja3VwVXJsLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgaWYoIWJhY2t1cFVybCl7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgbmV3IEVycm9yKFwiTm8gYmFja3VwIHVybCBwcm92aWRlZFwiKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuYmFja3VwVXJsID0gYmFja3VwVXJsO1xuICAgICAgICBmcy5zdGF0KHBhdGguam9pbih0aGlzLmxvY2FsRm9sZGVyLCBcIi5wcml2YXRlU2t5XCIsICdkc2VlZCcpLCAoZXJyLCBzdGF0cyk9PntcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiY3JlYXRlUGluXCIsIGZsb3dzVXRpbHMuZGVmYXVsdFBpbiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHZhbGlkYXRlUGluOiBmdW5jdGlvbiAocGluKSB7XG4gICAgICAgIHZhbGlkYXRvci52YWxpZGF0ZVBpbih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLCBcImFkZEJhY2t1cFwiLCBwaW4sIGZsb3dzVXRpbHMubm9Ucmllcyk7XG4gICAgfSxcbiAgICBcbiAgICBhZGRCYWNrdXA6IGZ1bmN0aW9uIChwaW4gPSBmbG93c1V0aWxzLmRlZmF1bHRQaW4sIGJhY2t1cHMpIHtcbiAgICAgICAgYmFja3VwcyA9IGJhY2t1cHMgfHwgW107XG4gICAgICAgIGJhY2t1cHMucHVzaCh0aGlzLmJhY2t1cFVybCk7XG4gICAgICAgIGNvbnN0IGRzZWVkQ2FnZSA9IG5ldyBEc2VlZENhZ2UodGhpcy5sb2NhbEZvbGRlcik7XG4gICAgICAgIGRzZWVkQ2FnZS5zYXZlRHNlZWRCYWNrdXBzKHBpbiwgdGhpcy5jc2JJZGVudGlmaWVyLCBiYWNrdXBzLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnZmluaXNoJywgXCJGYWlsZWQgdG8gc2F2ZSBiYWNrdXBzXCIpKTtcbiAgICB9LFxuXG4gICAgZmluaXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCAncHJpbnRJbmZvJywgdGhpcy5iYWNrdXBVcmwgKyAnIGhhcyBiZWVuIHN1Y2Nlc3NmdWxseSBhZGRlZCB0byBiYWNrdXBzIGxpc3QuJyk7XG4gICAgfVxufSk7IiwiLy8gdmFyIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcblxuY29uc3QgdXRpbHMgPSByZXF1aXJlKFwiLi8uLi8uLi91dGlscy9mbG93c1V0aWxzXCIpO1xuLy8gY29uc3QgY3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcbi8vIHZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJhZGRDc2JcIiwge1xuXHRzdGFydDogZnVuY3Rpb24gKGFsaWFzQ3NiLCBhbGlhc0Rlc3RDc2IpIHtcblx0XHR0aGlzLmFsaWFzQ3NiID0gYWxpYXNDc2I7XG5cdFx0dGhpcy5hbGlhc0Rlc3RDc2IgPSBhbGlhc0Rlc3RDc2I7XG5cdFx0dGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFBpblwiLCAzKTtcblx0fSxcblx0dmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dXRpbHMuY2hlY2tQaW5Jc1ZhbGlkKHBpbiwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0aWYoZXJyKXtcblx0XHRcdFx0c2VsZi5zd2FybShcImludGVyYWN0aW9uXCIsIFwicmVhZFBpblwiLCBub1RyaWVzLTEpO1xuXHRcdFx0fWVsc2Uge1xuXHRcdFx0XHRzZWxmLmFkZENzYihwaW4sIHNlbGYuYWxpYXNDc2IpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHRhZGRDc2I6IGZ1bmN0aW9uIChwaW4sIGFsaWFzQ1NiLCBhbGlhc0Rlc3RDc2IsIGNhbGxiYWNrKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHV0aWxzLmdldENzYihwaW4sIGFsaWFzQ1NiLCBmdW5jdGlvbiAoZXJyLCBwYXJlbnRDc2IpIHtcblx0XHRcdGlmKGVycil7XG5cdFx0XHRcdHNlbGYuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImhhbmRsZUVycm9yXCIsIGVyciwgXCJGYWlsZWQgdG8gZ2V0IGNzYlwiKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSk7IiwiY29uc3QgZmxvd3NVdGlscyA9IHJlcXVpcmUoXCIuLy4uLy4uL3V0aWxzL2Zsb3dzVXRpbHNcIik7XG5jb25zdCB1dGlscyA9IHJlcXVpcmUoXCIuLy4uLy4uL3V0aWxzL3V0aWxzXCIpO1xuY29uc3QgY3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcbmNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy92YWxpZGF0b3JcIik7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZShcIi4uL0NTQklkZW50aWZpZXJcIik7XG5jb25zdCBIYXNoQ2FnZSA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzL0hhc2hDYWdlJyk7XG5jb25zdCBSb290Q1NCID0gcmVxdWlyZShcIi4uL1Jvb3RDU0JcIik7XG5cbiQkLnN3YXJtLmRlc2NyaWJlKFwiYXR0YWNoRmlsZVwiLCB7IC8vdXJsOiBDU0IxL0NTQjIvYWxpYXNGaWxlXG4gICAgc3RhcnQ6IGZ1bmN0aW9uICh1cmwsIGZpbGVQYXRoLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHsgLy9jc2IxOmFzc2V0VHlwZTphbGlhc1xuICAgICAgICBjb25zdCB7Q1NCUGF0aCwgYWxpYXN9ID0gdXRpbHMucHJvY2Vzc1VybCh1cmwsICdGaWxlUmVmZXJlbmNlJyk7XG4gICAgICAgIHRoaXMuQ1NCUGF0aCA9IENTQlBhdGg7XG4gICAgICAgIHRoaXMuYWxpYXMgPSBhbGlhcztcbiAgICAgICAgdGhpcy5maWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRQaW5cIiwgZmxvd3NVdGlscy5ub1RyaWVzKTtcbiAgICB9LFxuXG4gICAgdmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcbiAgICAgICAgdmFsaWRhdG9yLnZhbGlkYXRlUGluKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMsICdsb2FkRmlsZVJlZmVyZW5jZScsIHBpbiwgbm9Ucmllcyk7XG4gICAgfSxcblxuICAgIHdpdGhDU0JJZGVudGlmaWVyOiBmdW5jdGlvbiAoaWQsIHVybCwgZmlsZVBhdGgsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICBjb25zdCB7Q1NCUGF0aCwgYWxpYXN9ID0gdXRpbHMucHJvY2Vzc1VybCh1cmwsICdGaWxlUmVmZXJlbmNlJyk7XG4gICAgICAgIHRoaXMuQ1NCUGF0aCA9IENTQlBhdGg7XG4gICAgICAgIHRoaXMuYWxpYXMgPSBhbGlhcztcbiAgICAgICAgdGhpcy5maWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKGlkKTtcbiAgICAgICAgUm9vdENTQi5sb2FkV2l0aElkZW50aWZpZXIodGhpcy5sb2NhbEZvbGRlciwgdGhpcy5jc2JJZGVudGlmaWVyLCAoZXJyLCByb290Q1NCKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgZXJyLCBcIkZhaWxlZCB0byBsb2FkIHJvb3RDU0JcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnJvb3RDU0IgPSByb290Q1NCO1xuICAgICAgICAgICAgdGhpcy5sb2FkRmlsZVJlZmVyZW5jZSgpO1xuXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBsb2FkRmlsZVJlZmVyZW5jZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJvb3RDU0IubG9hZFJhd0NTQignJywgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgJ2xvYWRBc3NldCcsICdGYWlsZWQgdG8gbG9hZCBtYXN0ZXJDU0IuJykpO1xuICAgIH0sXG5cbiAgICBsb2FkQXNzZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5yb290Q1NCLmxvYWRBc3NldEZyb21QYXRoKHRoaXMuQ1NCUGF0aCwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgJ3NhdmVGaWxlVG9EaXNrJywgJ0ZhaWxlZCB0byBsb2FkIGFzc2V0JykpO1xuICAgIH0sXG5cbiAgICBzYXZlRmlsZVRvRGlzazogZnVuY3Rpb24gKGZpbGVSZWZlcmVuY2UpIHtcbiAgICAgICAgaWYgKGZpbGVSZWZlcmVuY2UuaXNQZXJzaXN0ZWQoKSkge1xuICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgbmV3IEVycm9yKFwiRmlsZSBpcyBwZXJzaXN0ZWRcIiksIFwiQSBmaWxlIHdpdGggdGhlIHNhbWUgYWxpYXMgYWxyZWFkeSBleGlzdHMgXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKHVuZGVmaW5lZCwgdGhpcy5jc2JJZGVudGlmaWVyLmdldEJhY2t1cFVybHMoKSk7XG4gICAgICAgIHRoaXMuZmlsZUlEID0gdXRpbHMuZ2VuZXJhdGVQYXRoKHRoaXMubG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIpO1xuICAgICAgICBjcnlwdG8ub24oJ3Byb2dyZXNzJywgKHByb2dyZXNzKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdyZXBvcnRQcm9ncmVzcycsIHByb2dyZXNzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNyeXB0by5lbmNyeXB0U3RyZWFtKHRoaXMuZmlsZVBhdGgsIHRoaXMuZmlsZUlELCBjc2JJZGVudGlmaWVyLmdldERzZWVkKCksIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsICdzYXZlRmlsZVJlZmVyZW5jZScsIFwiRmFpbGVkIGF0IGZpbGUgZW5jcnlwdGlvbi5cIiwgZmlsZVJlZmVyZW5jZSwgY3NiSWRlbnRpZmllcikpO1xuXG4gICAgfSxcblxuXG4gICAgc2F2ZUZpbGVSZWZlcmVuY2U6IGZ1bmN0aW9uIChmaWxlUmVmZXJlbmNlLCBjc2JJZGVudGlmaWVyKSB7XG4gICAgICAgIGNyeXB0by5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3Byb2dyZXNzJyk7XG4gICAgICAgIGZpbGVSZWZlcmVuY2UuaW5pdCh0aGlzLmFsaWFzLCBjc2JJZGVudGlmaWVyLmdldFNlZWQoKSwgY3NiSWRlbnRpZmllci5nZXREc2VlZCgpKTtcbiAgICAgICAgdGhpcy5yb290Q1NCLnNhdmVBc3NldFRvUGF0aCh0aGlzLkNTQlBhdGgsIGZpbGVSZWZlcmVuY2UsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsICdjb21wdXRlSGFzaCcsIFwiRmFpbGVkIHRvIHNhdmUgZmlsZVwiLCB0aGlzLmZpbGVJRCkpO1xuICAgIH0sXG5cblxuICAgIGNvbXB1dGVIYXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnN0IGZpbGVTdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKHRoaXMuZmlsZUlEKTtcbiAgICAgICAgY3J5cHRvLnBza0hhc2hTdHJlYW0oZmlsZVN0cmVhbSwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJsb2FkSGFzaE9ialwiLCBcIkZhaWxlZCB0byBjb21wdXRlIGhhc2hcIikpO1xuICAgIH0sXG5cbiAgICBsb2FkSGFzaE9iajogZnVuY3Rpb24gKGRpZ2VzdCkge1xuICAgICAgICB0aGlzLmhhc2hDYWdlID0gbmV3IEhhc2hDYWdlKHRoaXMubG9jYWxGb2xkZXIpO1xuICAgICAgICB0aGlzLmhhc2hDYWdlLmxvYWRIYXNoKHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwiYWRkVG9IYXNoT2JqXCIsIFwiRmFpbGVkIHRvIGxvYWQgaGFzaE9ialwiLCBkaWdlc3QpKTtcbiAgICB9LFxuXG4gICAgYWRkVG9IYXNoT2JqOiBmdW5jdGlvbiAoaGFzaE9iaiwgZGlnZXN0KSB7XG4gICAgICAgIGhhc2hPYmpbcGF0aC5iYXNlbmFtZSh0aGlzLmZpbGVJRCldID0gZGlnZXN0LnRvU3RyaW5nKFwiaGV4XCIpO1xuICAgICAgICB0aGlzLmhhc2hDYWdlLnNhdmVIYXNoKGhhc2hPYmosIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwicHJpbnRTdWNjZXNzXCIsIFwiRmFpbGVkIHRvIHNhdmUgaGFzaE9ialwiKSk7XG4gICAgfSxcblxuICAgIHByaW50U3VjY2VzczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJwcmludEluZm9cIiwgdGhpcy5maWxlUGF0aCArIFwiIGhhcyBiZWVuIHN1Y2Nlc3NmdWxseSBhZGRlZCB0byBcIiArIHRoaXMuQ1NCUGF0aCk7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcIl9fcmV0dXJuX19cIik7XG4gICAgfVxufSk7XG4iLCJjb25zdCBmbG93c1V0aWxzID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMvZmxvd3NVdGlscycpO1xuY29uc3QgUm9vdENTQiA9IHJlcXVpcmUoXCIuLi9Sb290Q1NCXCIpO1xuY29uc3QgUmF3Q1NCID0gcmVxdWlyZShcIi4uL1Jhd0NTQlwiKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy92YWxpZGF0b3JcIik7XG5jb25zdCBEc2VlZENhZ2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRHNlZWRDYWdlXCIpO1xuY29uc3QgQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoXCIuLi9DU0JJZGVudGlmaWVyXCIpO1xuXG4kJC5zd2FybS5kZXNjcmliZShcImNyZWF0ZUNzYlwiLCB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uIChDU0JQYXRoLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICB0aGlzLkNTQlBhdGggPSBDU0JQYXRoIHx8ICcnO1xuICAgICAgICB2YWxpZGF0b3IuY2hlY2tNYXN0ZXJDU0JFeGlzdHMobG9jYWxGb2xkZXIsIChlcnIsIHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImNyZWF0ZVBpblwiLCBmbG93c1V0aWxzLmRlZmF1bHRQaW4pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIGZsb3dzVXRpbHMubm9Ucmllcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICB3aXRob3V0UGluOiBmdW5jdGlvbiAoQ1NCUGF0aCwgYmFja3VwcywgbG9jYWxGb2xkZXIgPSBwcm9jZXNzLmN3ZCgpLCBzZWVkLCBpc01hc3RlciA9IGZhbHNlKSB7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5DU0JQYXRoID0gQ1NCUGF0aDtcbiAgICAgICAgdGhpcy5pc01hc3RlciA9IGlzTWFzdGVyO1xuICAgICAgICBpZiAodHlwZW9mIGJhY2t1cHMgPT09ICd1bmRlZmluZWQnIHx8IGJhY2t1cHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBiYWNrdXBzID0gWyBmbG93c1V0aWxzLmRlZmF1bHRCYWNrdXAgXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhbGlkYXRvci5jaGVja01hc3RlckNTQkV4aXN0cyhsb2NhbEZvbGRlciwgKGVyciwgc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVNYXN0ZXJDU0IoYmFja3Vwcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihzZWVkKTtcbiAgICAgICAgICAgICAgICB0aGlzLndpdGhDU0JJZGVudGlmaWVyKENTQlBhdGgsIGNzYklkZW50aWZpZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICB3aXRoQ1NCSWRlbnRpZmllcjogZnVuY3Rpb24gKENTQlBhdGgsIGNzYklkZW50aWZpZXIpIHtcbiAgICAgICAgdGhpcy5DU0JQYXRoID0gQ1NCUGF0aDtcbiAgICAgICAgUm9vdENTQi5sb2FkV2l0aElkZW50aWZpZXIodGhpcy5sb2NhbEZvbGRlciwgY3NiSWRlbnRpZmllciwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgJ2NyZWF0ZUNTQicsICdGYWlsZWQgdG8gbG9hZCBtYXN0ZXIgd2l0aCBwcm92aWRlZCBkc2VlZCcpKTtcbiAgICB9LFxuXG4gICAgdmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcbiAgICAgICAgdmFsaWRhdG9yLnZhbGlkYXRlUGluKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMsIFwiY3JlYXRlQ1NCXCIsIHBpbiwgbm9Ucmllcyk7XG4gICAgfSxcblxuICAgIGxvYWRCYWNrdXBzOiBmdW5jdGlvbiAocGluKSB7XG4gICAgICAgIHRoaXMucGluID0gcGluO1xuICAgICAgICB0aGlzLmRzZWVkQ2FnZSA9IG5ldyBEc2VlZENhZ2UodGhpcy5sb2NhbEZvbGRlcik7XG4gICAgICAgIHRoaXMuZHNlZWRDYWdlLmxvYWREc2VlZEJhY2t1cHModGhpcy5waW4sIChlcnIsIGNzYklkZW50aWZpZXIsIGJhY2t1cHMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZU1hc3RlckNTQigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZU1hc3RlckNTQihiYWNrdXBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGNyZWF0ZU1hc3RlckNTQjogZnVuY3Rpb24gKGJhY2t1cHMpIHtcbiAgICAgICAgdGhpcy5jc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIodW5kZWZpbmVkLCBiYWNrdXBzIHx8IGZsb3dzVXRpbHMuZGVmYXVsdEJhY2t1cCk7XG5cbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicHJpbnRTZW5zaXRpdmVJbmZvXCIsIHRoaXMuY3NiSWRlbnRpZmllci5nZXRTZWVkKCksIGZsb3dzVXRpbHMuZGVmYXVsdFBpbik7XG5cbiAgICAgICAgY29uc3QgcmF3Q1NCID0gbmV3IFJhd0NTQigpO1xuICAgICAgICBjb25zdCBtZXRhID0gcmF3Q1NCLmdldEFzc2V0KCdnbG9iYWwuQ1NCTWV0YScsICdtZXRhJyk7XG4gICAgICAgIG1ldGEuaW5pdCgpO1xuICAgICAgICBtZXRhLnNldElzTWFzdGVyKHRydWUpO1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMuaXNNYXN0ZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBtZXRhLnNldElzTWFzdGVyKHRoaXMuaXNNYXN0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJhd0NTQi5zYXZlQXNzZXQobWV0YSk7XG4gICAgICAgIHRoaXMucm9vdENTQiA9IFJvb3RDU0IuY3JlYXRlTmV3KHRoaXMubG9jYWxGb2xkZXIsIHRoaXMuY3NiSWRlbnRpZmllciwgcmF3Q1NCKTtcbiAgICAgICAgY29uc3QgbmV4dFBoYXNlID0gKHRoaXMuQ1NCUGF0aCA9PT0gJycgfHwgdHlwZW9mIHRoaXMuQ1NCUGF0aCA9PT0gJ3VuZGVmaW5lZCcpID8gJ3NhdmVSYXdDU0InIDogJ2NyZWF0ZUNTQic7XG4gICAgICAgIGlmICh0aGlzLnBpbikge1xuICAgICAgICAgICAgdGhpcy5kc2VlZENhZ2Uuc2F2ZURzZWVkQmFja3Vwcyh0aGlzLnBpbiwgdGhpcy5jc2JJZGVudGlmaWVyLCBiYWNrdXBzLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBuZXh0UGhhc2UsIFwiRmFpbGVkIHRvIHNhdmUgZHNlZWQgXCIpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXNbbmV4dFBoYXNlXSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZUNTQjogZnVuY3Rpb24gKHJvb3RDU0IpIHtcbiAgICAgICAgdGhpcy5yb290Q1NCID0gdGhpcy5yb290Q1NCIHx8IHJvb3RDU0I7XG4gICAgICAgIGNvbnN0IHJhd0NTQiA9IG5ldyBSYXdDU0IoKTtcbiAgICAgICAgY29uc3QgbWV0YSA9IHJhd0NTQi5nZXRBc3NldChcImdsb2JhbC5DU0JNZXRhXCIsIFwibWV0YVwiKTtcbiAgICAgICAgbWV0YS5pbml0KCk7XG4gICAgICAgIG1ldGEuc2V0SXNNYXN0ZXIoZmFsc2UpO1xuICAgICAgICByYXdDU0Iuc2F2ZUFzc2V0KG1ldGEpO1xuICAgICAgICB0aGlzLnNhdmVSYXdDU0IocmF3Q1NCKTtcbiAgICB9LFxuXG4gICAgc2F2ZVJhd0NTQjogZnVuY3Rpb24gKHJhd0NTQikge1xuICAgICAgICB0aGlzLnJvb3RDU0Iuc2F2ZVJhd0NTQihyYXdDU0IsIHRoaXMuQ1NCUGF0aCwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJwcmludFN1Y2Nlc3NcIiwgXCJGYWlsZWQgdG8gc2F2ZSByYXcgQ1NCXCIpKTtcblxuICAgIH0sXG5cblxuICAgIHByaW50U3VjY2VzczogZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgbWVzc2FnZSA9IFwiU3VjY2Vzc2Z1bGx5IHNhdmVkIENTQiBhdCBwYXRoIFwiICsgdGhpcy5DU0JQYXRoO1xuICAgICAgICBpZiAoIXRoaXMuQ1NCUGF0aCB8fCB0aGlzLkNTQlBhdGggPT09ICcnKSB7XG4gICAgICAgICAgICBtZXNzYWdlID0gJ1N1Y2Nlc3NmdWxseSBzYXZlZCBDU0Igcm9vdCc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicHJpbnRJbmZvXCIsIG1lc3NhZ2UpO1xuICAgICAgICB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdfX3JldHVybl9fJyk7XG4gICAgfVxufSk7XG4iLCJjb25zdCBmbG93c1V0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IHV0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvdXRpbHNcIik7XG5jb25zdCBjcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuY29uc3QgdmFsaWRhdG9yID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL3ZhbGlkYXRvclwiKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKFwiLi4vQ1NCSWRlbnRpZmllclwiKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJleHRyYWN0RmlsZVwiLCB7XG5cdHN0YXJ0OiBmdW5jdGlvbiAodXJsLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcblx0XHR0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG5cdFx0Y29uc3Qge0NTQlBhdGgsIGFsaWFzfSA9IHV0aWxzLnByb2Nlc3NVcmwodXJsLCAnZ2xvYmFsLkZpbGVSZWZlcmVuY2UnKTtcblx0XHR0aGlzLkNTQlBhdGggPSBDU0JQYXRoO1xuXHRcdHRoaXMuYWxpYXMgPSBhbGlhcztcblx0XHR0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIGZsb3dzVXRpbHMubm9Ucmllcyk7XG5cdH0sXG5cblx0dmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcblx0XHR2YWxpZGF0b3IudmFsaWRhdGVQaW4odGhpcy5sb2NhbEZvbGRlciwgdGhpcywgXCJsb2FkRmlsZUFzc2V0XCIsIHBpbiwgbm9Ucmllcyk7XG5cdH0sXG5cblx0bG9hZEZpbGVBc3NldDogZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMucm9vdENTQi5sb2FkQXNzZXRGcm9tUGF0aCh0aGlzLkNTQlBhdGgsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwiZGVjcnlwdEZpbGVcIiwgXCJGYWlsZWQgdG8gbG9hZCBmaWxlIGFzc2V0IFwiICsgdGhpcy5hbGlhcykpO1xuXHR9LFxuXHRcblx0ZGVjcnlwdEZpbGU6IGZ1bmN0aW9uIChmaWxlUmVmZXJlbmNlKSB7XG5cdFx0Y29uc3QgY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKGZpbGVSZWZlcmVuY2UuZHNlZWQpO1xuXHRcdGNvbnN0IGZpbGVQYXRoID0gdXRpbHMuZ2VuZXJhdGVQYXRoKHRoaXMubG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIpO1xuXG5cdFx0Y3J5cHRvLm9uKCdwcm9ncmVzcycsIChwcm9ncmVzcykgPT4ge1xuICAgICAgICAgICAgdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAncmVwb3J0UHJvZ3Jlc3MnLCBwcm9ncmVzcyk7XG4gICAgICAgIH0pO1xuXG5cdFx0Y3J5cHRvLmRlY3J5cHRTdHJlYW0oZmlsZVBhdGgsIHRoaXMubG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKSwgKGVyciwgZmlsZU5hbWVzKSA9PiB7XG5cdFx0XHRpZihlcnIpe1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgZXJyLCBcIkZhaWxlZCB0byBkZWNyeXB0IGZpbGVcIiArIGZpbGVQYXRoKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicHJpbnRJbmZvXCIsIHRoaXMuYWxpYXMgKyBcIiB3YXMgc3VjY2Vzc2Z1bGx5IGV4dHJhY3RlZC4gXCIpO1xuXHRcdFx0dGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiX19yZXR1cm5fX1wiLCBmaWxlTmFtZXMpO1xuXHRcdH0pO1xuXHR9XG59KTsiLCJyZXF1aXJlKFwiY2FsbGZsb3dcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gJCQubGlicmFyeShmdW5jdGlvbiAoKSB7XG4gICAgcmVxdWlyZSgnLi9hZGRDc2InKTtcbiAgICByZXF1aXJlKCcuL2FkZEJhY2t1cCcpO1xuICAgIHJlcXVpcmUoJy4vYXR0YWNoRmlsZScpO1xuICAgIHJlcXVpcmUoJy4vY3JlYXRlQ3NiJyk7XG4gICAgcmVxdWlyZSgnLi9leHRyYWN0RmlsZScpO1xuICAgIHJlcXVpcmUoJy4vbGlzdENTQnMnKTtcbiAgICByZXF1aXJlKCcuL3Jlc2V0UGluJyk7XG4gICAgcmVxdWlyZSgnLi9yZXN0b3JlJyk7XG4gICAgcmVxdWlyZSgnLi9yZWNlaXZlJyk7XG5cdHJlcXVpcmUoJy4vc2F2ZUJhY2t1cCcpO1xuICAgIHJlcXVpcmUoJy4vc2V0UGluJyk7XG59KTtcblxuXG4iLCJjb25zdCBmbG93c1V0aWxzID0gcmVxdWlyZShcIi4vLi4vLi4vdXRpbHMvZmxvd3NVdGlsc1wiKTtcbmNvbnN0IHZhbGlkYXRvciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy92YWxpZGF0b3JcIik7XG4vLyBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IFJvb3RDU0IgPSByZXF1aXJlKFwiLi4vUm9vdENTQlwiKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKFwiLi4vQ1NCSWRlbnRpZmllclwiKTtcblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJsaXN0Q1NCc1wiLCB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uIChDU0JQYXRoLCBsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICB0aGlzLkNTQlBhdGggPSBDU0JQYXRoIHx8ICcnO1xuICAgICAgICB2YWxpZGF0b3IuY2hlY2tNYXN0ZXJDU0JFeGlzdHMobG9jYWxGb2xkZXIsIChlcnIsIHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcIm5vTWFzdGVyQ1NCRXhpc3RzXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIGZsb3dzVXRpbHMubm9Ucmllcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICB3aXRoQ1NCSWRlbnRpZmllcjogZnVuY3Rpb24gKGlkLCBDU0JQYXRoID0gJycsIGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICB0aGlzLmNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihpZCk7XG4gICAgICAgIHRoaXMuQ1NCUGF0aCA9IENTQlBhdGg7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5sb2FkTWFzdGVyUmF3Q1NCKCk7XG4gICAgfSxcblxuICAgIGxvYWRNYXN0ZXJSYXdDU0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgUm9vdENTQi5sb2FkV2l0aElkZW50aWZpZXIodGhpcy5sb2NhbEZvbGRlciwgdGhpcy5jc2JJZGVudGlmaWVyLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImxvYWRSYXdDU0JcIiwgXCJGYWlsZWQgdG8gY3JlYXRlIFJvb3RDU0IuXCIpKTtcbiAgICB9LFxuXG4gICAgdmFsaWRhdGVQaW46IGZ1bmN0aW9uIChwaW4sIG5vVHJpZXMpIHtcbiAgICAgICAgdmFsaWRhdG9yLnZhbGlkYXRlUGluKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMsICdsb2FkUmF3Q1NCJywgcGluLCBub1RyaWVzKTtcbiAgICB9LFxuXG4gICAgbG9hZFJhd0NTQjogZnVuY3Rpb24gKHJvb3RDU0IpIHtcbiAgICAgICAgaWYodHlwZW9mIHRoaXMucm9vdENTQiA9PT0gXCJ1bmRlZmluZWRcIiAmJiByb290Q1NCKXtcbiAgICAgICAgICAgIHRoaXMucm9vdENTQiA9IHJvb3RDU0I7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yb290Q1NCLmxvYWRSYXdDU0IodGhpcy5DU0JQYXRoLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnZ2V0Q1NCcycsICdGYWlsZWQgdG8gbG9hZCByYXdDU0InKSk7XG4gICAgfSxcblxuICAgIGdldENTQnM6IGZ1bmN0aW9uIChyYXdDU0IpIHtcbiAgICAgICAgY29uc3QgY3NiUmVmZXJlbmNlcyA9IHJhd0NTQi5nZXRBbGxBc3NldHMoJ2dsb2JhbC5DU0JSZWZlcmVuY2UnKTtcbiAgICAgICAgY29uc3QgY3Nic0FsaWFzZXMgPSBjc2JSZWZlcmVuY2VzLm1hcCgocmVmKSA9PiByZWYuYWxpYXMpO1xuXG4gICAgICAgIGNvbnN0IGZpbGVSZWZlcmVuY2VzID0gcmF3Q1NCLmdldEFsbEFzc2V0cygnZ2xvYmFsLkZpbGVSZWZlcmVuY2UnKTtcbiAgICAgICAgY29uc3QgZmlsZXNBbGlhc2VzID0gZmlsZVJlZmVyZW5jZXMubWFwKChyZWYpID0+IHJlZi5hbGlhcyk7XG5cbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiX19yZXR1cm5fX1wiLCB7XG4gICAgICAgICAgICBjc2JzOiBjc2JzQWxpYXNlcyxcbiAgICAgICAgICAgIGZpbGVzOiBmaWxlc0FsaWFzZXNcbiAgICAgICAgfSk7XG4gICAgfVxuXG59KTtcbiIsIlxuJCQuc3dhcm0uZGVzY3JpYmUoXCJyZWNlaXZlXCIsIHtcbiAgICBzdGFydDogZnVuY3Rpb24gKGVuZHBvaW50LCBjaGFubmVsKSB7XG5cbiAgICAgICAgY29uc3QgYWxpYXMgPSAncmVtb3RlJztcbiAgICAgICAgJCQucmVtb3RlLmNyZWF0ZVJlcXVlc3RNYW5hZ2VyKDEwMDApO1xuICAgICAgICAkJC5yZW1vdGUubmV3RW5kUG9pbnQoYWxpYXMsIGVuZHBvaW50LCBjaGFubmVsKTtcbiAgICAgICAgJCQucmVtb3RlW2FsaWFzXS5vbignKicsICcqJywgKGVyciwgc3dhcm0pID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBlcnIsICdGYWlsZWQgdG8gZ2V0IGRhdGEgZnJvbSBjaGFubmVsJyArIGNoYW5uZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgc2VlZCA9IHN3YXJtLm1ldGEuYXJnc1swXTtcbiAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInByaW50U2Vuc2l0aXZlSW5mb1wiLCBzZWVkKTtcblxuICAgICAgICAgICAgJCQucmVtb3RlW2FsaWFzXS5vZmYoXCIqXCIsIFwiKlwiKTtcbiAgICAgICAgfSk7XG5cbiAgICB9XG59KTsiLCJjb25zdCB1dGlscyA9IHJlcXVpcmUoXCIuLy4uLy4uL3V0aWxzL2Zsb3dzVXRpbHNcIik7XG5jb25zdCBSb290Q1NCID0gcmVxdWlyZShcIi4uL1Jvb3RDU0JcIik7XG5jb25zdCBEc2VlZENhZ2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRHNlZWRDYWdlXCIpO1xuY29uc3QgQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoXCIuLi9DU0JJZGVudGlmaWVyXCIpO1xuXG4kJC5zd2FybS5kZXNjcmliZShcInJlc2V0UGluXCIsIHtcbiAgICBzdGFydDogZnVuY3Rpb24gKGxvY2FsRm9sZGVyID0gcHJvY2Vzcy5jd2QoKSkge1xuICAgICAgICB0aGlzLmxvY2FsRm9sZGVyID0gbG9jYWxGb2xkZXI7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRTZWVkXCIsIHV0aWxzLm5vVHJpZXMpO1xuICAgIH0sXG5cbiAgICB2YWxpZGF0ZVNlZWQ6IGZ1bmN0aW9uIChzZWVkLCBub1RyaWVzKSB7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHRoaXMuY3NiSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKHNlZWQpO1xuICAgICAgICAgICAgUm9vdENTQi5sb2FkV2l0aElkZW50aWZpZXIodGhpcy5sb2NhbEZvbGRlciwgdGhpcy5jc2JJZGVudGlmaWVyLCAoZXJyLCByb290Q1NCKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkU2VlZFwiLCBub1RyaWVzIC0gMSk7XG4gICAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcImluc2VydFBpblwiLCB1dGlscy5ub1RyaWVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgbmV3IEVycm9yKCdJbnZhbGlkIHNlZWQnKSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgYWN0dWFsaXplUGluOiBmdW5jdGlvbiAocGluKSB7XG4gICAgICAgIGNvbnN0IGRzZWVkQ2FnZSA9IG5ldyBEc2VlZENhZ2UodGhpcy5sb2NhbEZvbGRlcik7XG4gICAgICAgIGRzZWVkQ2FnZS5zYXZlRHNlZWRCYWNrdXBzKHBpbiwgdGhpcy5jc2JJZGVudGlmaWVyLCB1bmRlZmluZWQsIChlcnIpPT57XG4gICAgICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBcIkZhaWxlZCB0byBzYXZlIGRzZWVkLlwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicHJpbnRJbmZvXCIsIFwiVGhlIHBpbiBoYXMgYmVlbiBjaGFuZ2VkIHN1Y2Nlc3NmdWxseS5cIik7XG4gICAgICAgIH0pO1xuICAgIH1cbn0pO1xuIiwiY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuY29uc3QgZmxvd3NVdGlscyA9IHJlcXVpcmUoXCIuLy4uLy4uL3V0aWxzL2Zsb3dzVXRpbHNcIik7XG5jb25zdCB1dGlscyA9IHJlcXVpcmUoXCIuLy4uLy4uL3V0aWxzL3V0aWxzXCIpO1xuY29uc3QgY3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcbmNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgdmFsaWRhdG9yID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL3ZhbGlkYXRvclwiKTtcbmNvbnN0IERzZWVkQ2FnZSA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9Ec2VlZENhZ2VcIik7XG5jb25zdCBSb290Q1NCID0gcmVxdWlyZSgnLi4vUm9vdENTQicpO1xuY29uc3QgQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoJy4uL0NTQklkZW50aWZpZXInKTtcbmNvbnN0IEJhY2t1cEVuZ2luZSA9IHJlcXVpcmUoJy4uL0JhY2t1cEVuZ2luZScpO1xuY29uc3QgSGFzaENhZ2UgPSByZXF1aXJlKCcuLi8uLi91dGlscy9IYXNoQ2FnZScpO1xuY29uc3QgQXN5bmNEaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMvQXN5bmNEaXNwYXRjaGVyJyk7XG5cblxuJCQuc3dhcm0uZGVzY3JpYmUoXCJyZXN0b3JlXCIsIHtcbiAgICBzdGFydDogZnVuY3Rpb24gKHVybCwgbG9jYWxGb2xkZXIgPSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgaWYgKHVybCkge1xuICAgICAgICAgICAgY29uc3Qge0NTQlBhdGgsIGFsaWFzfSA9IHV0aWxzLnByb2Nlc3NVcmwodXJsLCAnZ2xvYmFsLkNTQlJlZmVyZW5jZScpO1xuICAgICAgICAgICAgdGhpcy5DU0JQYXRoID0gQ1NCUGF0aDtcbiAgICAgICAgICAgIHRoaXMuQ1NCQWxpYXMgPSBhbGlhcztcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInJlYWRTZWVkXCIpO1xuICAgIH0sXG5cbiAgICB3aXRoU2VlZDogZnVuY3Rpb24gKHVybCwgbG9jYWxGb2xkZXIgPSBwcm9jZXNzLmN3ZCgpLCBzZWVkUmVzdG9yZSwgbG9jYWxTZWVkKSB7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgaWYgKHVybCkge1xuICAgICAgICAgICAgY29uc3Qge0NTQlBhdGgsIGFsaWFzfSA9IHV0aWxzLnByb2Nlc3NVcmwodXJsLCAnZ2xvYmFsLkNTQlJlZmVyZW5jZScpO1xuICAgICAgICAgICAgdGhpcy5DU0JQYXRoID0gQ1NCUGF0aDtcbiAgICAgICAgICAgIHRoaXMuQ1NCQWxpYXMgPSBhbGlhcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsb2NhbFNlZWQpIHtcbiAgICAgICAgICAgIHRoaXMubG9jYWxDU0JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIobG9jYWxTZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmVzdG9yZUNTQihzZWVkUmVzdG9yZSk7XG4gICAgfSxcblxuICAgIHJlc3RvcmVDU0I6IGZ1bmN0aW9uIChyZXN0b3JlU2VlZCkge1xuICAgICAgICB0aGlzLmhhc2hDYWdlID0gbmV3IEhhc2hDYWdlKHRoaXMubG9jYWxGb2xkZXIpO1xuICAgICAgICB0aGlzLmhhc2hPYmogPSB7fTtcbiAgICAgICAgdGhpcy5jc2JSZXN0b3JlSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKHJlc3RvcmVTZWVkKTtcbiAgICAgICAgbGV0IGJhY2t1cFVybHM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBiYWNrdXBVcmxzID0gdGhpcy5jc2JSZXN0b3JlSWRlbnRpZmllci5nZXRCYWNrdXBVcmxzKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIG5ldyBFcnJvcignSW52YWxpZCBzZWVkJykpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5iYWNrdXBVcmxzID0gYmFja3VwVXJscztcbiAgICAgICAgdGhpcy5yZXN0b3JlRHNlZWRDYWdlID0gbmV3IERzZWVkQ2FnZSh0aGlzLmxvY2FsRm9sZGVyKTtcbiAgICAgICAgY29uc3QgYmFja3VwRW5naW5lID0gbmV3IEJhY2t1cEVuZ2luZS5nZXRCYWNrdXBFbmdpbmUodGhpcy5iYWNrdXBVcmxzKTtcblxuICAgICAgICBiYWNrdXBFbmdpbmUubG9hZCh0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyLCAoZXJyLCBlbmNyeXB0ZWRDU0IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgZXJyLCBcIkZhaWxlZCB0byByZXN0b3JlIENTQlwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fX2FkZENTQkhhc2godGhpcy5jc2JSZXN0b3JlSWRlbnRpZmllciwgZW5jcnlwdGVkQ1NCKTtcbiAgICAgICAgICAgIHRoaXMuZW5jcnlwdGVkQ1NCID0gZW5jcnlwdGVkQ1NCO1xuXG4gICAgICAgICAgICB2YWxpZGF0b3IuY2hlY2tNYXN0ZXJDU0JFeGlzdHModGhpcy5sb2NhbEZvbGRlciwgKGVyciwgc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZUF1eEZvbGRlcigpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5sb2NhbENTQklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLkNTQkFsaWFzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5kZWxldGVSZWN1cnNpdmVseSh0aGlzLmxvY2FsRm9sZGVyLCB0cnVlLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgbmV3IEVycm9yKFwiTm8gQ1NCIGFsaWFzIHdhcyBzcGVjaWZpZWRcIikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlQ1NCKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuQ1NCQWxpYXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBuZXcgRXJyb3IoXCJObyBDU0IgYWxpYXMgd2FzIHNwZWNpZmllZFwiKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIGZsb3dzVXRpbHMubm9Ucmllcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHZhbGlkYXRlUGluOiBmdW5jdGlvbiAocGluLCBub1RyaWVzKSB7XG4gICAgICAgIHZhbGlkYXRvci52YWxpZGF0ZVBpbih0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLCBcIndyaXRlQ1NCXCIsIHBpbiwgbm9Ucmllcyk7XG4gICAgfSxcblxuICAgIGNyZWF0ZUF1eEZvbGRlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICBmcy5ta2RpcihwYXRoLmpvaW4odGhpcy5sb2NhbEZvbGRlciwgXCIucHJpdmF0ZVNreVwiKSwge3JlY3Vyc2l2ZTogdHJ1ZX0sIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwid3JpdGVDU0JcIiwgXCJGYWlsZWQgdG8gY3JlYXRlIGZvbGRlciAucHJpdmF0ZVNreVwiKSk7XG4gICAgfSxcblxuXG4gICAgd3JpdGVDU0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZnMud3JpdGVGaWxlKHV0aWxzLmdlbmVyYXRlUGF0aCh0aGlzLmxvY2FsRm9sZGVyLCB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyKSwgdGhpcy5lbmNyeXB0ZWRDU0IsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwiY3JlYXRlUm9vdENTQlwiLCBcIkZhaWxlZCB0byB3cml0ZSBtYXN0ZXJDU0IgdG8gZGlza1wiKSk7XG4gICAgfSxcblxuICAgIGNyZWF0ZVJvb3RDU0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgUm9vdENTQi5sb2FkV2l0aElkZW50aWZpZXIodGhpcy5sb2NhbEZvbGRlciwgdGhpcy5jc2JSZXN0b3JlSWRlbnRpZmllciwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJsb2FkUmF3Q1NCXCIsIFwiRmFpbGVkIHRvIGNyZWF0ZSByb290Q1NCIHdpdGggZHNlZWRcIikpO1xuICAgIH0sXG5cbiAgICBsb2FkUmF3Q1NCOiBmdW5jdGlvbiAocm9vdENTQikge1xuXG4gICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyID0gbmV3IEFzeW5jRGlzcGF0Y2hlcigoIGVycnMsIHN1Y2NzKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmhhc2hDYWdlLnNhdmVIYXNoKHRoaXMuaGFzaE9iaiwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgZXJyLCAnRmFpbGVkIHRvIHNhdmUgaGFzaE9iaicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdwcmludEluZm8nLCAnQWxsIENTQnMgaGF2ZSBiZWVuIHJlc3RvcmVkLicpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ19fcmV0dXJuX18nKTtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByb290Q1NCLmxvYWRSYXdDU0IoJycsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwiY2hlY2tDU0JTdGF0dXNcIiwgXCJGYWlsZWQgdG8gbG9hZCBSYXdDU0JcIiwgcm9vdENTQikpO1xuICAgIH0sXG5cbiAgICBjaGVja0NTQlN0YXR1czogZnVuY3Rpb24gKHJhd0NTQiwgcm9vdENTQikge1xuICAgICAgICB0aGlzLnJhd0NTQiA9IHJhd0NTQjtcbiAgICAgICAgY29uc3QgbWV0YSA9IHRoaXMucmF3Q1NCLmdldEFzc2V0KCdnbG9iYWwuQ1NCTWV0YScsICdtZXRhJyk7XG4gICAgICAgIGlmICh0aGlzLnJvb3RDU0IpIHtcbiAgICAgICAgICAgIHRoaXMuYXR0YWNoQ1NCKHRoaXMucm9vdENTQiwgdGhpcy5DU0JQYXRoLCB0aGlzLkNTQkFsaWFzLCB0aGlzLmNzYlJlc3RvcmVJZGVudGlmaWVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChtZXRhLmlzTWFzdGVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yb290Q1NCID0gcm9vdENTQjtcbiAgICAgICAgICAgICAgICB0aGlzLnNhdmVEc2VlZCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZU1hc3RlckNTQigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIHNhdmVEc2VlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJlc3RvcmVEc2VlZENhZ2Uuc2F2ZURzZWVkQmFja3VwcyhmbG93c1V0aWxzLmRlZmF1bHRQaW4sIHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIsIHVuZGVmaW5lZCwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJjb2xsZWN0RmlsZXNcIiwgXCJGYWlsZWQgdG8gc2F2ZSBkc2VlZFwiLCB0aGlzLnJhd0NTQiwgdGhpcy5jc2JSZXN0b3JlSWRlbnRpZmllciwgJycsICdtYXN0ZXInKSk7XG4gICAgfSxcblxuXG4gICAgY3JlYXRlTWFzdGVyQ1NCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnN0IGNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcih1bmRlZmluZWQsIHRoaXMuYmFja3VwVXJscyk7XG4gICAgICAgIHRoaXMuc3dhcm0oXCJpbnRlcmFjdGlvblwiLCBcInByaW50U2Vuc2l0aXZlSW5mb1wiLCBjc2JJZGVudGlmaWVyLmdldFNlZWQoKSwgZmxvd3NVdGlscy5kZWZhdWx0UGluKTtcbiAgICAgICAgdGhpcy5yb290Q1NCID0gUm9vdENTQi5jcmVhdGVOZXcodGhpcy5sb2NhbEZvbGRlciwgY3NiSWRlbnRpZmllcik7XG4gICAgICAgIHRoaXMucmVzdG9yZURzZWVkQ2FnZS5zYXZlRHNlZWRCYWNrdXBzKGZsb3dzVXRpbHMuZGVmYXVsdFBpbiwgY3NiSWRlbnRpZmllciwgdW5kZWZpbmVkLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImF0dGFjaENTQlwiLCBcIkZhaWxlZCB0byBzYXZlIG1hc3RlciBkc2VlZCBcIiwgdGhpcy5yb290Q1NCLCB0aGlzLkNTQlBhdGgsIHRoaXMuQ1NCQWxpYXMsIHRoaXMuY3NiUmVzdG9yZUlkZW50aWZpZXIpKTtcbiAgICB9LFxuXG5cbiAgICBhdHRhY2hDU0I6IGZ1bmN0aW9uIChyb290Q1NCLCBDU0JQYXRoLCBDU0JBbGlhcywgY3NiSWRlbnRpZmllcikge1xuICAgICAgICB0aGlzLl9fYXR0YWNoQ1NCKHJvb3RDU0IsIENTQlBhdGgsIENTQkFsaWFzLCBjc2JJZGVudGlmaWVyLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAnbG9hZFJlc3RvcmVkUmF3Q1NCJywgJ0ZhaWxlZCB0byBhdHRhY2ggcmF3Q1NCJykpO1xuXG4gICAgfSxcblxuICAgIGxvYWRSZXN0b3JlZFJhd0NTQjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLkNTQlBhdGggPSB0aGlzLkNTQlBhdGguc3BsaXQoJzonKVswXSArICcvJyArIHRoaXMuQ1NCQWxpYXM7XG4gICAgICAgIHRoaXMucm9vdENTQi5sb2FkUmF3Q1NCKHRoaXMuQ1NCUGF0aCwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgXCJjb2xsZWN0RmlsZXNcIiwgXCJGYWlsZWQgdG8gbG9hZCByZXN0b3JlZCBSYXdDU0JcIiwgdGhpcy5jc2JSZXN0b3JlSWRlbnRpZmllciwgdGhpcy5DU0JQYXRoLCB0aGlzLkNTQkFsaWFzKSk7XG4gICAgfSxcblxuICAgIGNvbGxlY3RGaWxlczogZnVuY3Rpb24gKHJhd0NTQiwgY3NiSWRlbnRpZmllciwgY3VycmVudFBhdGgsIGFsaWFzLCBjYWxsYmFjaykge1xuXG4gICAgICAgIGNvbnN0IGxpc3RGaWxlcyA9IHJhd0NTQi5nZXRBbGxBc3NldHMoJ2dsb2JhbC5GaWxlUmVmZXJlbmNlJyk7XG4gICAgICAgIGNvbnN0IGFzeW5jRGlzcGF0Y2hlciA9IG5ldyBBc3luY0Rpc3BhdGNoZXIoKGVycnMsIHN1Y2NzKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNvbGxlY3RDU0JzKHJhd0NTQiwgY3NiSWRlbnRpZmllciwgY3VycmVudFBhdGgsIGFsaWFzKTtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnJzLCBzdWNjcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChsaXN0RmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBhc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxpc3RGaWxlcy5mb3JFYWNoKChmaWxlUmVmZXJlbmNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoZmlsZVJlZmVyZW5jZS5kc2VlZCk7XG4gICAgICAgICAgICBjb25zdCBmaWxlQWxpYXMgPSBmaWxlUmVmZXJlbmNlLmFsaWFzO1xuICAgICAgICAgICAgY29uc3QgdXJscyA9IGNzYklkZW50aWZpZXIuZ2V0QmFja3VwVXJscygpO1xuICAgICAgICAgICAgY29uc3QgYmFja3VwRW5naW5lID0gQmFja3VwRW5naW5lLmdldEJhY2t1cEVuZ2luZSh1cmxzKTtcbiAgICAgICAgICAgIGFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KCk7XG4gICAgICAgICAgICBiYWNrdXBFbmdpbmUubG9hZChjc2JJZGVudGlmaWVyLCAoZXJyLCBlbmNyeXB0ZWRGaWxlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBlcnIsICdDb3VsZCBub3QgZG93bmxvYWQgZmlsZSAnICsgZmlsZUFsaWFzKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9fYWRkQ1NCSGFzaChjc2JJZGVudGlmaWVyLCBlbmNyeXB0ZWRGaWxlKTtcblxuICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZSh1dGlscy5nZW5lcmF0ZVBhdGgodGhpcy5sb2NhbEZvbGRlciwgY3NiSWRlbnRpZmllciksIGVuY3J5cHRlZEZpbGUsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgZXJyLCAnQ291bGQgbm90IHNhdmUgZmlsZSAnICsgZmlsZUFsaWFzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCh1bmRlZmluZWQsIGZpbGVBbGlhcyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGNvbGxlY3RDU0JzOiBmdW5jdGlvbiAocmF3Q1NCLCBjc2JJZGVudGlmaWVyLCBjdXJyZW50UGF0aCwgYWxpYXMpIHtcblxuICAgICAgICBjb25zdCBsaXN0Q1NCcyA9IHJhd0NTQi5nZXRBbGxBc3NldHMoJ2dsb2JhbC5DU0JSZWZlcmVuY2UnKTtcbiAgICAgICAgY29uc3QgbmV4dEFyZ3VtZW50cyA9IFtdO1xuICAgICAgICBsZXQgY291bnRlciA9IDA7XG5cbiAgICAgICAgaWYgKGxpc3RDU0JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eSgpO1xuICAgICAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsaXN0Q1NCcyAmJiBsaXN0Q1NCcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBsaXN0Q1NCcy5mb3JFYWNoKChDU0JSZWZlcmVuY2UpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXh0UGF0aCA9IGN1cnJlbnRQYXRoICsgJy8nICsgQ1NCUmVmZXJlbmNlLmFsaWFzO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5leHRDU0JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoQ1NCUmVmZXJlbmNlLmRzZWVkKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXh0QWxpYXMgPSBDU0JSZWZlcmVuY2UuYWxpYXM7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV4dFVSTHMgPSBjc2JJZGVudGlmaWVyLmdldEJhY2t1cFVybHMoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBiYWNrdXBFbmdpbmUgPSBCYWNrdXBFbmdpbmUuZ2V0QmFja3VwRW5naW5lKG5leHRVUkxzKTtcbiAgICAgICAgICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KCk7XG4gICAgICAgICAgICAgICAgYmFja3VwRW5naW5lLmxvYWQobmV4dENTQklkZW50aWZpZXIsIChlcnIsIGVuY3J5cHRlZENTQikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBlcnIsICdDb3VsZCBub3QgZG93bmxvYWQgQ1NCICcgKyBuZXh0QWxpYXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2FkZENTQkhhc2gobmV4dENTQklkZW50aWZpZXIsIGVuY3J5cHRlZENTQik7XG5cbiAgICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlKHV0aWxzLmdlbmVyYXRlUGF0aCh0aGlzLmxvY2FsRm9sZGVyLCBuZXh0Q1NCSWRlbnRpZmllciksIGVuY3J5cHRlZENTQiwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIGVyciwgJ0NvdWxkIG5vdCBzYXZlIENTQiAnICsgbmV4dEFsaWFzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb290Q1NCLmxvYWRSYXdDU0IobmV4dFBhdGgsIChlcnIsIG5leHRSYXdDU0IpID0+IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dhcm0oJ2ludGVyYWN0aW9uJywgJ2hhbmRsZUVycm9yJywgZXJyLCAnRmFpbGVkIHRvIGxvYWQgQ1NCICcgKyBuZXh0QWxpYXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0QXJndW1lbnRzLnB1c2goWyBuZXh0UmF3Q1NCLCBuZXh0Q1NCSWRlbnRpZmllciwgbmV4dFBhdGgsIG5leHRBbGlhcyBdKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgrK2NvdW50ZXIgPT09IGxpc3RDU0JzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0QXJndW1lbnRzLmZvckVhY2goKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGVjdEZpbGVzKC4uLmFyZ3MsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCh1bmRlZmluZWQsIGFsaWFzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBfX3RyeURvd25sb2FkKHVybHMsIGNzYklkZW50aWZpZXIsIGluZGV4LCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoaW5kZXggPT09IHVybHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdDb3VsZCBub3QgZG93bmxvYWQgcmVzb3VyY2UnKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB1cmwgPSB1cmxzW2luZGV4XTtcbiAgICAgICAgdGhpcy5iYWNrdXBFbmdpbmUubG9hZCh1cmwsIGNzYklkZW50aWZpZXIsIChlcnIsIHJlc291cmNlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX190cnlEb3dubG9hZCh1cmxzLCBjc2JJZGVudGlmaWVyLCArK2luZGV4LCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgcmVzb3VyY2UpO1xuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICBfX2FkZENTQkhhc2g6IGZ1bmN0aW9uIChjc2JJZGVudGlmaWVyLCBlbmNyeXB0ZWRDU0IpIHtcbiAgICAgICAgY29uc3QgcHNrSGFzaCA9IG5ldyBjcnlwdG8uUHNrSGFzaCgpO1xuICAgICAgICBwc2tIYXNoLnVwZGF0ZShlbmNyeXB0ZWRDU0IpO1xuICAgICAgICB0aGlzLmhhc2hPYmpbY3NiSWRlbnRpZmllci5nZXRVaWQoKV0gPSBwc2tIYXNoLmRpZ2VzdCgpLnRvU3RyaW5nKCdoZXgnKTtcblxuICAgIH0sXG5cbiAgICBfX2F0dGFjaENTQjogZnVuY3Rpb24gKHJvb3RDU0IsIENTQlBhdGgsIENTQkFsaWFzLCBjc2JJZGVudGlmaWVyLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIUNTQkFsaWFzKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiTm8gQ1NCIGFsaWFzIHdhcyBzcGVjaWZpZWRcIikpO1xuICAgICAgICB9XG5cbiAgICAgICAgcm9vdENTQi5sb2FkUmF3Q1NCKENTQlBhdGgsIChlcnIsIHJhd0NTQikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJvb3RDU0IubG9hZEFzc2V0RnJvbVBhdGgoQ1NCUGF0aCwgKGVyciwgY3NiUmVmKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY3NiUmVmLmluaXQoQ1NCQWxpYXMsIGNzYklkZW50aWZpZXIuZ2V0U2VlZCgpLCBjc2JJZGVudGlmaWVyLmdldERzZWVkKCkpO1xuICAgICAgICAgICAgICAgICAgICByb290Q1NCLnNhdmVBc3NldFRvUGF0aChDU0JQYXRoLCBjc2JSZWYsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihgQSBDU0IgaGF2aW5nIHRoZSBhbGlhcyAke0NTQkFsaWFzfSBhbHJlYWR5IGV4aXN0cy5gKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn0pO1xuXG4iLCJjb25zdCB1dGlscyA9IHJlcXVpcmUoXCIuLy4uLy4uL3V0aWxzL3V0aWxzXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jb25zdCB2YWxpZGF0b3IgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvdmFsaWRhdG9yXCIpO1xuY29uc3QgSGFzaENhZ2UgPSByZXF1aXJlKCcuLi8uLi91dGlscy9IYXNoQ2FnZScpO1xuY29uc3QgQXN5bmNEaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0FzeW5jRGlzcGF0Y2hlclwiKTtcbmNvbnN0IFJvb3RDU0IgPSByZXF1aXJlKCcuLi9Sb290Q1NCJyk7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZSgnLi4vQ1NCSWRlbnRpZmllcicpO1xuY29uc3QgQmFja3VwRW5naW5lID0gcmVxdWlyZSgnLi4vQmFja3VwRW5naW5lJyk7XG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG5cbiQkLnN3YXJtLmRlc2NyaWJlKFwic2F2ZUJhY2t1cFwiLCB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uIChsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIDMpO1xuICAgIH0sXG5cbiAgICB2YWxpZGF0ZVBpbjogZnVuY3Rpb24gKHBpbiwgbm9Ucmllcykge1xuICAgICAgICB2YWxpZGF0b3IudmFsaWRhdGVQaW4odGhpcy5sb2NhbEZvbGRlciwgdGhpcywgXCJsb2FkSGFzaEZpbGVcIiwgcGluLCBub1RyaWVzKTtcbiAgICB9LFxuXG4gICAgd2l0aENTQklkZW50aWZpZXI6IGZ1bmN0aW9uIChpZCwgbG9jYWxGb2xkZXIgPSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgICAgIHRoaXMubG9jYWxGb2xkZXIgPSBsb2NhbEZvbGRlcjtcbiAgICAgICAgdGhpcy5jc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoaWQpO1xuICAgICAgICBSb290Q1NCLmxvYWRXaXRoSWRlbnRpZmllcihsb2NhbEZvbGRlciwgdGhpcy5jc2JJZGVudGlmaWVyLCAoZXJyLCByb290Q1NCKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBlcnIsICdGYWlsZWQgdG8gbG9hZCByb290IENTQicpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5yb290Q1NCID0gcm9vdENTQjtcbiAgICAgICAgICAgIHRoaXMubG9hZEhhc2hGaWxlKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBsb2FkSGFzaEZpbGU6IGZ1bmN0aW9uIChwaW4sIGJhY2t1cHMpIHtcbiAgICAgICAgdGhpcy5iYWNrdXBzID0gYmFja3VwcztcbiAgICAgICAgdGhpcy5oYXNoQ2FnZSA9IG5ldyBIYXNoQ2FnZSh0aGlzLmxvY2FsRm9sZGVyKTtcbiAgICAgICAgdGhpcy5oYXNoQ2FnZS5sb2FkSGFzaCh2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCAncmVhZEVuY3J5cHRlZE1hc3RlcicsICdGYWlsZWQgdG8gbG9hZCBoYXNoIGZpbGUnKSk7XG4gICAgfSxcblxuICAgIHJlYWRFbmNyeXB0ZWRNYXN0ZXI6IGZ1bmN0aW9uIChoYXNoRmlsZSkge1xuICAgICAgICB0aGlzLmhhc2hGaWxlID0gaGFzaEZpbGU7XG4gICAgICAgIHRoaXMubWFzdGVySUQgPSB1dGlscy5nZW5lcmF0ZVBhdGgodGhpcy5sb2NhbEZvbGRlciwgdGhpcy5jc2JJZGVudGlmaWVyKTtcbiAgICAgICAgZnMucmVhZEZpbGUodGhpcy5tYXN0ZXJJRCwgdmFsaWRhdG9yLnJlcG9ydE9yQ29udGludWUodGhpcywgJ2xvYWRNYXN0ZXJSYXdDU0InLCAnRmFpbGVkIHRvIHJlYWQgbWFzdGVyQ1NCLicpKTtcbiAgICB9LFxuXG5cbiAgICBsb2FkTWFzdGVyUmF3Q1NCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucm9vdENTQi5sb2FkUmF3Q1NCKCcnLCB2YWxpZGF0b3IucmVwb3J0T3JDb250aW51ZSh0aGlzLCBcImRpc3BhdGNoZXJcIiwgXCJGYWlsZWQgdG8gbG9hZCBtYXN0ZXJDU0JcIikpO1xuICAgIH0sXG5cbiAgICBkaXNwYXRjaGVyOiBmdW5jdGlvbiAocmF3Q1NCKSB7XG4gICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyID0gbmV3IEFzeW5jRGlzcGF0Y2hlcigoZXJyb3JzLCByZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3JzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zd2FybSgnaW50ZXJhY3Rpb24nLCAnaGFuZGxlRXJyb3InLCBKU09OLnN0cmluZ2lmeShlcnJvcnMsIG51bGwsICdcXHQnKSwgJ0ZhaWxlZCB0byBjb2xsZWN0IGFsbCBDU0JzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jb2xsZWN0RmlsZXMocmVzdWx0cyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkoKTtcbiAgICAgICAgdGhpcy5jb2xsZWN0Q1NCcyhyYXdDU0IsIHRoaXMuY3NiSWRlbnRpZmllciwgJycsICdtYXN0ZXInKTtcbiAgICB9LFxuXG4gICAgY29sbGVjdENTQnM6IGZ1bmN0aW9uIChyYXdDU0IsIGNzYklkZW50aWZpZXIsIGN1cnJlbnRQYXRoLCBhbGlhcykge1xuICAgICAgICBjb25zdCBsaXN0Q1NCcyA9IHJhd0NTQi5nZXRBbGxBc3NldHMoJ2dsb2JhbC5DU0JSZWZlcmVuY2UnKTtcblxuICAgICAgICBjb25zdCBuZXh0QXJndW1lbnRzID0gW107XG4gICAgICAgIGxldCBjb3VudGVyID0gMDtcblxuICAgICAgICBsaXN0Q1NCcy5mb3JFYWNoKChDU0JSZWZlcmVuY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRQYXRoID0gY3VycmVudFBhdGggKyAnLycgKyBDU0JSZWZlcmVuY2UuYWxpYXM7XG4gICAgICAgICAgICBjb25zdCBuZXh0Q1NCSWRlbnRpZmllciA9IG5ldyBDU0JJZGVudGlmaWVyKENTQlJlZmVyZW5jZS5kc2VlZCk7XG4gICAgICAgICAgICBjb25zdCBuZXh0QWxpYXMgPSBDU0JSZWZlcmVuY2UuYWxpYXM7XG4gICAgICAgICAgICB0aGlzLnJvb3RDU0IubG9hZFJhd0NTQihuZXh0UGF0aCwgKGVyciwgbmV4dFJhd0NTQikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbmV4dEFyZ3VtZW50cy5wdXNoKFsgbmV4dFJhd0NTQiwgbmV4dENTQklkZW50aWZpZXIsIG5leHRQYXRoLCBuZXh0QWxpYXMgXSk7XG4gICAgICAgICAgICAgICAgaWYgKCsrY291bnRlciA9PT0gbGlzdENTQnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRBcmd1bWVudHMuZm9yRWFjaCgoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsZWN0Q1NCcyguLi5hcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKHVuZGVmaW5lZCwge3Jhd0NTQiwgY3NiSWRlbnRpZmllciwgYWxpYXN9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGxpc3RDU0JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQodW5kZWZpbmVkLCB7cmF3Q1NCLCBjc2JJZGVudGlmaWVyLCBhbGlhc30pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGNvbGxlY3RGaWxlczogZnVuY3Rpb24gKGNvbGxlY3RlZENTQnMpIHtcbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIgPSBuZXcgQXN5bmNEaXNwYXRjaGVyKChlcnJvcnMsIG5ld1Jlc3VsdHMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcnMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdoYW5kbGVFcnJvcicsIEpTT04uc3RyaW5naWZ5KGVycm9ycywgbnVsbCwgJ1xcdCcpLCAnRmFpbGVkIHRvIGNvbGxlY3QgZmlsZXMgYXR0YWNoZWQgdG8gQ1NCcycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIW5ld1Jlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICBuZXdSZXN1bHRzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9fY2F0ZWdvcml6ZShjb2xsZWN0ZWRDU0JzLmNvbmNhdChuZXdSZXN1bHRzKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkoY29sbGVjdGVkQ1NCcy5sZW5ndGgpO1xuICAgICAgICBjb2xsZWN0ZWRDU0JzLmZvckVhY2goKHtyYXdDU0IsIGNzYklkZW50aWZpZXIsIGFsaWFzfSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fX2NvbGxlY3RGaWxlcyhyYXdDU0IsIGFsaWFzKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgX19jYXRlZ29yaXplOiBmdW5jdGlvbiAoZmlsZXMpIHtcbiAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IHt9O1xuICAgICAgICBsZXQgYmFja3VwcztcbiAgICAgICAgZmlsZXMuZm9yRWFjaCgoe2NzYklkZW50aWZpZXIsIGFsaWFzfSkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmJhY2t1cHMgfHwgdGhpcy5iYWNrdXBzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGJhY2t1cHMgPSBjc2JJZGVudGlmaWVyLmdldEJhY2t1cFVybHMoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYmFja3VwcyA9IHRoaXMuYmFja3VwcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHVpZCA9IGNzYklkZW50aWZpZXIuZ2V0VWlkKCk7XG4gICAgICAgICAgICBjYXRlZ29yaWVzW3VpZF0gPSB7YmFja3VwcywgYWxpYXN9O1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlciA9IG5ldyBBc3luY0Rpc3BhdGNoZXIoKGVycm9ycywgc3VjY2Vzc2VzKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnN3YXJtKCdpbnRlcmFjdGlvbicsICdjc2JCYWNrdXBSZXBvcnQnLCB7ZXJyb3JzLCBzdWNjZXNzZXN9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5iYWNrdXBFbmdpbmUgPSBCYWNrdXBFbmdpbmUuZ2V0QmFja3VwRW5naW5lKGJhY2t1cHMpO1xuICAgICAgICB0aGlzLmZpbHRlckZpbGVzKGNhdGVnb3JpZXMpO1xuICAgICAgICAvLyBPYmplY3QuZW50cmllcyhjYXRlZ29yaWVzKS5mb3JFYWNoKChbdWlkLCB7YWxpYXMsIGJhY2t1cHN9XSkgPT4ge1xuICAgICAgICAvLyAgICAgdGhpcy5maWx0ZXJGaWxlcyh1aWQsIGFsaWFzLCBiYWNrdXBzKTtcbiAgICAgICAgLy8gfSk7XG4gICAgfSxcblxuICAgIGZpbHRlckZpbGVzOiBmdW5jdGlvbiAoZmlsZXNCYWNrdXBzKSB7XG4gICAgICAgIGNvbnN0IGZpbGVzVG9VcGRhdGUgPSB7fTtcbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5oYXNoRmlsZSkuZm9yRWFjaCgodWlkKSA9PiB7XG4gICAgICAgICAgICBpZiAoZmlsZXNCYWNrdXBzW3VpZF0pIHtcbiAgICAgICAgICAgICAgICBmaWxlc1RvVXBkYXRlW3VpZF0gPSB0aGlzLmhhc2hGaWxlW3VpZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkoKTtcbiAgICAgICAgdGhpcy5iYWNrdXBFbmdpbmUuY29tcGFyZVZlcnNpb25zKGZpbGVzVG9VcGRhdGUsIChlcnIsIG1vZGlmaWVkRmlsZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiaGFuZGxlRXJyb3JcIiwgZXJyLCBcIkZhaWxlZCB0byByZXRyaWV2ZSBsaXN0IG9mIG1vZGlmaWVkIGZpbGVzXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9fYmFja3VwRmlsZXMoSlNPTi5wYXJzZShtb2RpZmllZEZpbGVzKSwgZmlsZXNCYWNrdXBzKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIF9fYmFja3VwRmlsZXM6IGZ1bmN0aW9uIChmaWxlcywgZmlsZXNCYWNrdXBzKSB7XG4gICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkoZmlsZXMubGVuZ3RoKTtcbiAgICAgICAgZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmlsZVN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0ocGF0aC5qb2luKHRoaXMubG9jYWxGb2xkZXIsIGZpbGUpKTtcbiAgICAgICAgICAgIGNvbnN0IGJhY2t1cFVybHMgPSBmaWxlc0JhY2t1cHNbZmlsZV0uYmFja3VwcztcbiAgICAgICAgICAgIGNvbnN0IGJhY2t1cEVuZ2luZSA9IEJhY2t1cEVuZ2luZS5nZXRCYWNrdXBFbmdpbmUoYmFja3VwVXJscyk7XG4gICAgICAgICAgICBiYWNrdXBFbmdpbmUuc2F2ZShuZXcgQ1NCSWRlbnRpZmllcihmaWxlKSwgZmlsZVN0cmVhbSwgKGVyciwgdXJsKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIHRoaXMuYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKHthbGlhczogZmlsZXNCYWNrdXBzW2ZpbGVdLmFsaWFzLCBiYWNrdXBVUkw6IHVybH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKHVuZGVmaW5lZCwge2FsaWFzOiBmaWxlc0JhY2t1cHNbZmlsZV0uYWxpYXMsIGJhY2t1cFVSTDogdXJsfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQoKTsgLy8gZm9yIGh0dHAgcmVxdWVzdCB0byBjb21wYXJlVmVyc2lvbnNcbiAgICB9LFxuXG4gICAgX19jb2xsZWN0RmlsZXM6IGZ1bmN0aW9uIChyYXdDU0IsIGNzYkFsaWFzKSB7XG4gICAgICAgIGNvbnN0IGZpbGVzID0gcmF3Q1NCLmdldEFsbEFzc2V0cygnZ2xvYmFsLkZpbGVSZWZlcmVuY2UnKTtcbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eShmaWxlcy5sZW5ndGgpO1xuICAgICAgICBmaWxlcy5mb3JFYWNoKChGaWxlUmVmZXJlbmNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhbGlhcyA9IEZpbGVSZWZlcmVuY2UuYWxpYXM7XG4gICAgICAgICAgICBjb25zdCBjc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoRmlsZVJlZmVyZW5jZS5kc2VlZCk7XG4gICAgICAgICAgICB0aGlzLmFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCh1bmRlZmluZWQsIHtjc2JJZGVudGlmaWVyLCBhbGlhc30pO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQoKTtcbiAgICB9XG59KTtcblxuIiwiY29uc3QgdmFsaWRhdG9yID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL3ZhbGlkYXRvclwiKTtcbmNvbnN0IERzZWVkQ2FnZSA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzL0RzZWVkQ2FnZScpO1xuXG4kJC5zd2FybS5kZXNjcmliZShcInNldFBpblwiLCB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uIChsb2NhbEZvbGRlciA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgICAgICAgdGhpcy5sb2NhbEZvbGRlciA9IGxvY2FsRm9sZGVyO1xuICAgICAgICB0aGlzLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIDMpO1xuICAgIH0sXG5cbiAgICB2YWxpZGF0ZVBpbjogZnVuY3Rpb24gKG9sZFBpbiwgbm9Ucmllcykge1xuICAgICAgICB0aGlzLm9sZFBpbiA9IG9sZFBpbjtcbiAgICAgICAgdmFsaWRhdG9yLnZhbGlkYXRlUGluKHRoaXMubG9jYWxGb2xkZXIsIHRoaXMsIFwiaW50ZXJhY3Rpb25KdW1wZXJcIiwgb2xkUGluLCBub1RyaWVzKTtcbiAgICB9LFxuXG4gICAgaW50ZXJhY3Rpb25KdW1wZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwiZW50ZXJOZXdQaW5cIik7XG4gICAgfSxcblxuICAgIGFjdHVhbGl6ZVBpbjogZnVuY3Rpb24gKG5ld1Bpbikge1xuICAgICAgICB0aGlzLmRzZWVkQ2FnZSA9IG5ldyBEc2VlZENhZ2UodGhpcy5sb2NhbEZvbGRlcik7XG4gICAgICAgIHRoaXMuZHNlZWRDYWdlLmxvYWREc2VlZEJhY2t1cHModGhpcy5vbGRQaW4sIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwic2F2ZURzZWVkXCIsIFwiRmFpbGVkIHRvIGxvYWQgZHNlZWQuXCIsIG5ld1BpbikpO1xuICAgIH0sXG5cbiAgICBzYXZlRHNlZWQ6IGZ1bmN0aW9uIChjc2JJZGVudGlmaWVyLCBiYWNrdXBzLCBwaW4pIHtcbiAgICAgICAgdGhpcy5kc2VlZENhZ2Uuc2F2ZURzZWVkQmFja3VwcyhwaW4sIGNzYklkZW50aWZpZXIsIGJhY2t1cHMsIHZhbGlkYXRvci5yZXBvcnRPckNvbnRpbnVlKHRoaXMsIFwic3VjY2Vzc1N0YXRlXCIsIFwiRmFpbGVkIHRvIHNhdmUgZHNlZWRcIikpO1xuICAgIH0sXG5cbiAgICBzdWNjZXNzU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5zd2FybShcImludGVyYWN0aW9uXCIsIFwicHJpbnRJbmZvXCIsIFwiVGhlIHBpbiBoYXMgYmVlbiBzdWNjZXNzZnVsbHkgY2hhbmdlZC5cIik7XG4gICAgfVxufSk7IiwiXG5mdW5jdGlvbiBBc3luY0Rpc3BhdGNoZXIoZmluYWxDYWxsYmFjaykge1xuXHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRsZXQgZXJyb3JzID0gW107XG5cblx0bGV0IHN0YXJ0ZWQgPSAwO1xuXG5cdGZ1bmN0aW9uIG1hcmtPbmVBc0ZpbmlzaGVkKGVyciwgcmVzKSB7XG5cdFx0aWYoZXJyKSB7XG5cdFx0XHRlcnJvcnMucHVzaChlcnIpO1xuXHRcdH1cblxuXHRcdGlmKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG5cdFx0XHRhcmd1bWVudHNbMF0gPSB1bmRlZmluZWQ7XG5cdFx0XHRyZXMgPSBhcmd1bWVudHM7XG5cdFx0fVxuXG5cdFx0aWYodHlwZW9mIHJlcyAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHRcdFx0cmVzdWx0cy5wdXNoKHJlcyk7XG5cdFx0fVxuXG5cdFx0aWYoLS1zdGFydGVkIDw9IDApIHtcbiAgICAgICAgICAgIGNhbGxDYWxsYmFjaygpO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGRpc3BhdGNoRW1wdHkoYW1vdW50ID0gMSkge1xuXHRcdHN0YXJ0ZWQgKz0gYW1vdW50O1xuXHR9XG5cblx0ZnVuY3Rpb24gY2FsbENhbGxiYWNrKCkge1xuXHQgICAgaWYoZXJyb3JzLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgICAgIGVycm9ycyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG5cdCAgICBpZihyZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgICAgIHJlc3VsdHMgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBmaW5hbENhbGxiYWNrKGVycm9ycywgcmVzdWx0cyk7XG4gICAgfVxuXG5cdHJldHVybiB7XG5cdFx0ZGlzcGF0Y2hFbXB0eSxcblx0XHRtYXJrT25lQXNGaW5pc2hlZFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFzeW5jRGlzcGF0Y2hlcjsiLCJjb25zdCBjcnlwdG8gPSByZXF1aXJlKCdwc2tjcnlwdG8nKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKFwiLi4vbGlicmFyaWVzL0NTQklkZW50aWZpZXJcIik7XG5cbmZ1bmN0aW9uIERzZWVkQ2FnZShsb2NhbEZvbGRlcikge1xuXHRjb25zdCBkc2VlZEZvbGRlciA9IHBhdGguam9pbihsb2NhbEZvbGRlciwgJy5wcml2YXRlU2t5Jyk7XG5cdGNvbnN0IGRzZWVkUGF0aCA9IHBhdGguam9pbihkc2VlZEZvbGRlciwgJ2RzZWVkJyk7XG5cblx0ZnVuY3Rpb24gbG9hZERzZWVkQmFja3VwcyhwaW4sIGNhbGxiYWNrKSB7XG5cdFx0ZnMubWtkaXIoZHNlZWRGb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCAoZXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXG5cdFx0XHRjcnlwdG8ubG9hZERhdGEocGluLCBkc2VlZFBhdGgsIChlcnIsIGRzZWVkQmFja3VwcykgPT4ge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHRcdH1cblx0XHRcdFx0dHJ5e1xuXHRcdFx0XHRcdGRzZWVkQmFja3VwcyA9IEpTT04ucGFyc2UoZHNlZWRCYWNrdXBzLnRvU3RyaW5nKCkpO1xuXHRcdFx0XHR9Y2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsZXQgY3NiSWRlbnRpZmllcjtcblx0XHRcdFx0aWYgKGRzZWVkQmFja3Vwcy5kc2VlZCAmJiAhQnVmZmVyLmlzQnVmZmVyKGRzZWVkQmFja3Vwcy5kc2VlZCkpIHtcblx0XHRcdFx0XHRkc2VlZEJhY2t1cHMuZHNlZWQgPSBCdWZmZXIuZnJvbShkc2VlZEJhY2t1cHMuZHNlZWQpO1xuXHRcdFx0XHRcdGNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihkc2VlZEJhY2t1cHMuZHNlZWQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2FsbGJhY2sodW5kZWZpbmVkLCBjc2JJZGVudGlmaWVyLCBkc2VlZEJhY2t1cHMuYmFja3Vwcyk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNhdmVEc2VlZEJhY2t1cHMocGluLCBjc2JJZGVudGlmaWVyLCBiYWNrdXBzLCBjYWxsYmFjaykge1xuXHRcdGZzLm1rZGlyKGRzZWVkRm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgKGVycikgPT4ge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblxuXHRcdFx0bGV0IGRzZWVkO1xuXHRcdFx0aWYoY3NiSWRlbnRpZmllcil7XG5cdFx0XHRcdGRzZWVkID0gY3NiSWRlbnRpZmllci5nZXREc2VlZCgpO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZHNlZWRCYWNrdXBzID0gSlNPTi5zdHJpbmdpZnkoe1xuXHRcdFx0XHRkc2VlZCxcblx0XHRcdFx0YmFja3Vwc1xuXHRcdFx0fSk7XG5cblx0XHRcdGNyeXB0by5zYXZlRGF0YShCdWZmZXIuZnJvbShkc2VlZEJhY2t1cHMpLCBwaW4sIGRzZWVkUGF0aCwgY2FsbGJhY2spO1xuXHRcdH0pO1xuXHR9XG5cblxuXHRyZXR1cm4ge1xuXHRcdGxvYWREc2VlZEJhY2t1cHMsXG5cdFx0c2F2ZURzZWVkQmFja3Vwcyxcblx0fTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IERzZWVkQ2FnZTsiLCJjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuXG5mdW5jdGlvbiBIYXNoQ2FnZShsb2NhbEZvbGRlcikge1xuXHRjb25zdCBoYXNoRm9sZGVyID0gcGF0aC5qb2luKGxvY2FsRm9sZGVyLCAnLnByaXZhdGVTa3knKTtcblx0Y29uc3QgaGFzaFBhdGggPSBwYXRoLmpvaW4oaGFzaEZvbGRlciwgJ2hhc2gnKTtcblxuXHRmdW5jdGlvbiBsb2FkSGFzaChjYWxsYmFjaykge1xuXHRcdGZzLm1rZGlyKGhhc2hGb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCAoZXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXG5cdFx0XHRmcy5yZWFkRmlsZShoYXNoUGF0aCwgKGVyciwgZGF0YSkgPT4ge1xuXHRcdFx0XHRpZihlcnIpe1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCB7fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjYWxsYmFjayhudWxsLCBKU09OLnBhcnNlKGRhdGEpKTtcblx0XHRcdH0pO1xuXG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBzYXZlSGFzaChoYXNoT2JqLCBjYWxsYmFjaykge1xuXHRcdGZzLm1rZGlyKGhhc2hGb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCAoZXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXG5cdFx0XHRmcy53cml0ZUZpbGUoaGFzaFBhdGgsIEpTT04uc3RyaW5naWZ5KGhhc2hPYmosIG51bGwsICdcXHQnKSwgKGVycikgPT4ge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRsb2FkSGFzaCxcblx0XHRzYXZlSGFzaFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEhhc2hDYWdlO1xuIiwiLy8gY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuXG5cbmV4cG9ydHMuZGVmYXVsdEJhY2t1cCA9IFwiaHR0cDovL2xvY2FsaG9zdDo4MDgwXCI7XG5leHBvcnRzLmRlZmF1bHRQaW4gPSBcIjEyMzQ1Njc4XCI7XG5leHBvcnRzLm5vVHJpZXMgPSAzO1xuXG4iLCJjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG4vLyBjb25zdCBjcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuXG5mdW5jdGlvbiBnZW5lcmF0ZVBhdGgobG9jYWxGb2xkZXIsIGNzYklkZW50aWZpZXIpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKGxvY2FsRm9sZGVyLCBjc2JJZGVudGlmaWVyLmdldFVpZCgpKTtcbn1cblxuZnVuY3Rpb24gcHJvY2Vzc1VybCh1cmwsIGFzc2V0VHlwZSkge1xuICAgIGNvbnN0IHNwbGl0VXJsID0gdXJsLnNwbGl0KCcvJyk7XG4gICAgY29uc3QgYWxpYXNBc3NldCA9IHNwbGl0VXJsLnBvcCgpO1xuICAgIGNvbnN0IENTQlBhdGggPSBzcGxpdFVybC5qb2luKCcvJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgQ1NCUGF0aDogQ1NCUGF0aCArICc6JyArIGFzc2V0VHlwZSArICc6JyArIGFsaWFzQXNzZXQsXG4gICAgICAgIGFsaWFzOiBhbGlhc0Fzc2V0XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gZGVsZXRlUmVjdXJzaXZlbHkoaW5wdXRQYXRoLCBpc1Jvb3QgPSB0cnVlLCBjYWxsYmFjaykge1xuXG4gICAgZnMuc3RhdChpbnB1dFBhdGgsIGZ1bmN0aW9uIChlcnIsIHN0YXRzKSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgc3RhdHMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgZnMudW5saW5rKGlucHV0UGF0aCwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyciwgbnVsbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgIGZzLnJlYWRkaXIoaW5wdXRQYXRoLCAoZXJyLCBmaWxlcykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBmX2xlbmd0aCA9IGZpbGVzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBsZXQgZl9kZWxldGVfaW5kZXggPSAwO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY2hlY2tTdGF0dXMgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmX2xlbmd0aCA9PT0gZl9kZWxldGVfaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFpc1Jvb3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcy5ybWRpcihpbnB1dFBhdGgsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyciwgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKCFjaGVja1N0YXR1cygpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBQYXRoID0gcGF0aC5qb2luKGlucHV0UGF0aCwgZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGVSZWN1cnNpdmVseSh0ZW1wUGF0aCwgZmFsc2UsKGVyciwgc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZl9kZWxldGVfaW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZ2VuZXJhdGVQYXRoLFxuICAgIHByb2Nlc3NVcmwsXG4gICAgZGVsZXRlUmVjdXJzaXZlbHlcbn07XG5cbiIsImNvbnN0IFJvb3RDU0IgPSByZXF1aXJlKFwiLi4vbGlicmFyaWVzL1Jvb3RDU0JcIik7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcblxuXG5tb2R1bGUuZXhwb3J0cy52YWxpZGF0ZVBpbiA9IGZ1bmN0aW9uIChsb2NhbEZvbGRlciwgc3dhcm0sIHBoYXNlTmFtZSwgcGluLCBub1RyaWVzLCAuLi5hcmdzKSB7XG5cdFJvb3RDU0IuY3JlYXRlUm9vdENTQihsb2NhbEZvbGRlciwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHBpbiwgKGVyciwgcm9vdENTQiwgY3NiSWRlbnRpZmllciwgYmFja3VwcykgPT57XG5cdFx0aWYoZXJyKXtcblx0XHRcdHN3YXJtLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJyZWFkUGluXCIsIG5vVHJpZXMgLSAxKTtcblx0XHR9ZWxzZXtcblx0XHRcdGlmKGNzYklkZW50aWZpZXIpe1xuXHRcdFx0XHRzd2FybS5yb290Q1NCID0gcm9vdENTQjtcblx0XHRcdFx0c3dhcm0uY3NiSWRlbnRpZmllciA9IGNzYklkZW50aWZpZXI7XG5cdFx0XHR9XG5cdFx0XHRhcmdzLnB1c2goYmFja3Vwcyk7XG5cdFx0XHRzd2FybVtwaGFzZU5hbWVdKHBpbiwgLi4uYXJncyk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnJlcG9ydE9yQ29udGludWUgPSBmdW5jdGlvbihzd2FybSwgcGhhc2VOYW1lLCBlcnJvck1lc3NhZ2UsIC4uLmFyZ3Mpe1xuXHRyZXR1cm4gZnVuY3Rpb24oZXJyLC4uLnJlcykge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdHN3YXJtLnN3YXJtKFwiaW50ZXJhY3Rpb25cIiwgXCJoYW5kbGVFcnJvclwiLCBlcnIsIGVycm9yTWVzc2FnZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChwaGFzZU5hbWUpIHtcblx0XHRcdFx0XHRzd2FybVtwaGFzZU5hbWVdKC4uLnJlcywgLi4uYXJncyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufTtcblxubW9kdWxlLmV4cG9ydHMuY2hlY2tNYXN0ZXJDU0JFeGlzdHMgPSBmdW5jdGlvbiAobG9jYWxGb2xkZXIsIGNhbGxiYWNrKSB7XG5cdGZzLnN0YXQocGF0aC5qb2luKGxvY2FsRm9sZGVyLCBcIi5wcml2YXRlU2t5L2hhc2hcIiksIChlcnIsIHN0YXRzKT0+e1xuXHRcdGlmKGVycil7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyLCBmYWxzZSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGNhbGxiYWNrKHVuZGVmaW5lZCwgdHJ1ZSk7XG5cdH0pO1xufTsiLCIvKlxuY29uc2Vuc3VzIGhlbHBlciBmdW5jdGlvbnNcbiovXG5cbnZhciBwc2tjcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuXG5cbmZ1bmN0aW9uIFB1bHNlKHNpZ25lciwgY3VycmVudFB1bHNlTnVtYmVyLCBibG9jaywgbmV3VHJhbnNhY3Rpb25zLCB2c2QsIHRvcCwgbGFzdCkge1xuICAgIHRoaXMuc2lnbmVyICAgICAgICAgPSBzaWduZXI7ICAgICAgICAgICAgICAgLy9hLmsuYS4gZGVsZWdhdGVkQWdlbnROYW1lXG4gICAgdGhpcy5jdXJyZW50UHVsc2UgICA9IGN1cnJlbnRQdWxzZU51bWJlcjtcbiAgICB0aGlzLmxzZXQgICAgICAgICAgID0gbmV3VHJhbnNhY3Rpb25zOyAgICAgIC8vZGlnZXN0IC0+IHRyYW5zYWN0aW9uXG4gICAgdGhpcy5wdEJsb2NrICAgICAgICA9IGJsb2NrOyAgICAgICAgICAgICAgICAvL2FycmF5IG9mIGRpZ2VzdHNcbiAgICB0aGlzLnZzZCAgICAgICAgICAgID0gdnNkO1xuICAgIHRoaXMudG9wICAgICAgICAgICAgPSB0b3A7ICAgICAgICAgICAgICAgICAgLy8gYS5rLmEuIHRvcFB1bHNlQ29uc2Vuc3VzXG4gICAgdGhpcy5sYXN0ICAgICAgICAgICA9IGxhc3Q7ICAgICAgICAgICAgICAgICAvLyBhLmsuYS4gbGFzdFB1bHNlQWNoaWV2ZWRDb25zZW5zdXNcbn1cblxuZnVuY3Rpb24gVHJhbnNhY3Rpb24oY3VycmVudFB1bHNlLCBzd2FybSkge1xuICAgIHRoaXMuaW5wdXQgICAgICA9IHN3YXJtLmlucHV0O1xuICAgIHRoaXMub3V0cHV0ICAgICA9IHN3YXJtLm91dHB1dDtcbiAgICB0aGlzLnN3YXJtICAgICAgPSBzd2FybTtcblxuICAgIHZhciBhcnIgPSBwcm9jZXNzLmhydGltZSgpO1xuICAgIHRoaXMuc2Vjb25kICAgICA9IGFyclswXTtcbiAgICB0aGlzLm5hbm9zZWNvZCAgPSBhcnJbMV07XG5cbiAgICB0aGlzLkNQICAgICAgICAgPSBjdXJyZW50UHVsc2U7XG4gICAgdGhpcy5kaWdlc3QgICAgID0gcHNrY3J5cHRvLmhhc2hWYWx1ZXModGhpcyk7XG59XG5cblxuZXhwb3J0cy5jcmVhdGVUcmFuc2FjdGlvbiA9IGZ1bmN0aW9uIChjdXJyZW50UHVsc2UsIHN3YXJtKSB7XG4gICAgcmV0dXJuIG5ldyBUcmFuc2FjdGlvbihjdXJyZW50UHVsc2UsIHN3YXJtKTtcbn1cblxuZXhwb3J0cy5jcmVhdGVQdWxzZSA9IGZ1bmN0aW9uIChzaWduZXIsIGN1cnJlbnRQdWxzZU51bWJlciwgYmxvY2ssIG5ld1RyYW5zYWN0aW9ucywgdnNkLCB0b3AsIGxhc3QpIHtcbiAgICByZXR1cm4gbmV3IFB1bHNlKHNpZ25lciwgY3VycmVudFB1bHNlTnVtYmVyLCBibG9jaywgbmV3VHJhbnNhY3Rpb25zLCB2c2QsIHRvcCwgbGFzdCk7XG59XG5cbmV4cG9ydHMub3JkZXJUcmFuc2FjdGlvbnMgPSBmdW5jdGlvbiAocHNldCkgeyAvL29yZGVyIGluIHBsYWNlIHRoZSBwc2V0IGFycmF5XG4gICAgdmFyIGFyciA9IFtdO1xuICAgIGZvciAodmFyIGQgaW4gcHNldCkge1xuICAgICAgICBhcnIucHVzaChwc2V0W2RdKTtcbiAgICB9XG5cbiAgICBhcnIuc29ydChmdW5jdGlvbiAodDEsIHQyKSB7XG4gICAgICAgIGlmICh0MS5DUCA8IHQyLkNQKSByZXR1cm4gLTE7XG4gICAgICAgIGlmICh0MS5DUCA+IHQyLkNQKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKHQxLnNlY29uZCA8IHQyLnNlY29uZCkgcmV0dXJuIC0xO1xuICAgICAgICBpZiAodDEuc2Vjb25kID4gdDIuc2Vjb25kKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKHQxLm5hbm9zZWNvZCA8IHQyLm5hbm9zZWNvZCkgcmV0dXJuIC0xO1xuICAgICAgICBpZiAodDEubmFub3NlY29kID4gdDIubmFub3NlY29kKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKHQxLmRpZ2VzdCA8IHQyLmRpZ2VzdCkgcmV0dXJuIC0xO1xuICAgICAgICBpZiAodDEuZGlnZXN0ID4gdDIuZGlnZXN0KSByZXR1cm4gMTtcbiAgICAgICAgcmV0dXJuIDA7IC8vb25seSBmb3IgaWRlbnRpY2FsIHRyYW5zYWN0aW9ucy4uLlxuICAgIH0pXG4gICAgcmV0dXJuIGFycjtcbn1cblxuZnVuY3Rpb24gZ2V0TWFqb3JpdHlGaWVsZEluUHVsc2VzKGFsbFB1bHNlcywgZmllbGROYW1lLCBleHRyYWN0RmllbGROYW1lLCB2b3RpbmdCb3gpIHtcbiAgICB2YXIgY291bnRlckZpZWxkcyA9IHt9O1xuICAgIHZhciBtYWpvcml0eVZhbHVlO1xuICAgIHZhciBwdWxzZTtcblxuICAgIGZvciAodmFyIGFnZW50IGluIGFsbFB1bHNlcykge1xuICAgICAgICBwdWxzZSA9IGFsbFB1bHNlc1thZ2VudF07XG4gICAgICAgIHZhciB2ID0gcHVsc2VbZmllbGROYW1lXTtcbiAgICAgICAgY291bnRlckZpZWxkc1t2XSA9IHZvdGluZ0JveC52b3RlKGNvdW50ZXJGaWVsZHNbdl0pOyAgICAgICAgLy8gKytjb3VudGVyRmllbGRzW3ZdXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSBpbiBjb3VudGVyRmllbGRzKSB7XG4gICAgICAgIGlmICh2b3RpbmdCb3guaXNNYWpvcml0YXJpYW4oY291bnRlckZpZWxkc1tpXSkpIHtcbiAgICAgICAgICAgIG1ham9yaXR5VmFsdWUgPSBpO1xuICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSA9PSBleHRyYWN0RmllbGROYW1lKSB7ICAgICAgICAgICAgICAgICAgICAvLz8/PyBcInZzZFwiLCBcInZzZFwiXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1ham9yaXR5VmFsdWU7XG4gICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFwiYmxvY2tEaWdlc3RcIiwgXCJwdEJsb2NrXCJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBhZ2VudCBpbiBhbGxQdWxzZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcHVsc2UgPSBhbGxQdWxzZXNbYWdlbnRdO1xuICAgICAgICAgICAgICAgICAgICBpZiAocHVsc2VbZmllbGROYW1lXSA9PSBtYWpvcml0eVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHVsc2VbZXh0cmFjdEZpZWxkTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFwibm9uZVwiOyAvL3RoZXJlIGlzIG5vIG1ham9yaXR5XG59XG5cbmV4cG9ydHMuZGV0ZWN0TWFqb3JpdGFyaWFuVlNEID0gZnVuY3Rpb24gKHB1bHNlLCBwdWxzZXNIaXN0b3J5LCB2b3RpbmdCb3gpIHtcbiAgICBpZiAocHVsc2UgPT0gMCkgcmV0dXJuIFwibm9uZVwiO1xuICAgIHZhciBwdWxzZXMgPSBwdWxzZXNIaXN0b3J5W3B1bHNlXTtcbiAgICB2YXIgbWFqb3JpdHlWYWx1ZSA9IGdldE1ham9yaXR5RmllbGRJblB1bHNlcyhwdWxzZXMsIFwidnNkXCIsIFwidnNkXCIsIHZvdGluZ0JveCk7XG4gICAgcmV0dXJuIG1ham9yaXR5VmFsdWU7XG59XG5cbi8qXG4gICAgZGV0ZWN0IGEgY2FuZGlkYXRlIGJsb2NrXG4gKi9cbmV4cG9ydHMuZGV0ZWN0TWFqb3JpdGFyaWFuUFRCbG9jayA9IGZ1bmN0aW9uIChwdWxzZSwgcHVsc2VzSGlzdG9yeSwgdm90aW5nQm94KSB7XG4gICAgaWYgKHB1bHNlID09IDApIHJldHVybiBcIm5vbmVcIjtcbiAgICB2YXIgcHVsc2VzID0gcHVsc2VzSGlzdG9yeVtwdWxzZV07XG4gICAgdmFyIGJ0QmxvY2sgPSBnZXRNYWpvcml0eUZpZWxkSW5QdWxzZXMocHVsc2VzLCBcImJsb2NrRGlnZXN0XCIsIFwicHRCbG9ja1wiLCB2b3RpbmdCb3gpO1xuICAgIHJldHVybiBidEJsb2NrO1xufVxuXG5leHBvcnRzLm1ha2VTZXRGcm9tQmxvY2sgPSBmdW5jdGlvbiAoa25vd25UcmFuc2FjdGlvbnMsIGJsb2NrKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYmxvY2subGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGl0ZW0gPSBibG9ja1tpXTtcbiAgICAgICAgcmVzdWx0W2l0ZW1dID0ga25vd25UcmFuc2FjdGlvbnNbaXRlbV07XG4gICAgICAgIGlmICgha25vd25UcmFuc2FjdGlvbnMuaGFzT3duUHJvcGVydHkoaXRlbSkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG5ldyBFcnJvcihcIkRvIG5vdCBnaXZlIHVua25vd24gdHJhbnNhY3Rpb24gZGlnZXN0cyB0byBtYWtlU2V0RnJvbUJsb2NrIFwiICsgaXRlbSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydHMuc2V0c0NvbmNhdCA9IGZ1bmN0aW9uICh0YXJnZXQsIGZyb20pIHtcbiAgICBmb3IgKHZhciBkIGluIGZyb20pIHtcbiAgICAgICAgdGFyZ2V0W2RdID0gZnJvbVtkXTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuZXhwb3J0cy5zZXRzUmVtb3ZlQXJyYXkgPSBmdW5jdGlvbiAodGFyZ2V0LCBhcnIpIHtcbiAgICBhcnIuZm9yRWFjaChpdGVtID0+IGRlbGV0ZSB0YXJnZXRbaXRlbV0pO1xuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbmV4cG9ydHMuc2V0c1JlbW92ZVB0QmxvY2tBbmRQYXN0VHJhbnNhY3Rpb25zID0gZnVuY3Rpb24gKHRhcmdldCwgYXJyLCBtYXhQdWxzZSkge1xuICAgIHZhciB0b0JlUmVtb3ZlZCA9IFtdO1xuICAgIGZvciAodmFyIGQgaW4gdGFyZ2V0KSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXJyW2ldID09IGQgfHwgdGFyZ2V0W2RdLkNQIDwgbWF4UHVsc2UpIHtcbiAgICAgICAgICAgICAgICB0b0JlUmVtb3ZlZC5wdXNoKGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdG9CZVJlbW92ZWQuZm9yRWFjaChpdGVtID0+IGRlbGV0ZSB0YXJnZXRbaXRlbV0pO1xuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbmV4cG9ydHMuY3JlYXRlRGVtb2NyYXRpY1ZvdGluZ0JveCA9IGZ1bmN0aW9uIChzaGFyZUhvbGRlcnNDb3VudGVyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdm90ZTogZnVuY3Rpb24gKHByZXZpb3NWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKCFwcmV2aW9zVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBwcmV2aW9zVmFsdWUgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByZXZpb3NWYWx1ZSArIDE7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNNYWpvcml0YXJpYW46IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyh2YWx1ZSAsIE1hdGguZmxvb3Ioc2hhcmVIb2xkZXJzQ291bnRlci8yKSArIDEpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlID49IE1hdGguZmxvb3Ioc2hhcmVIb2xkZXJzQ291bnRlciAvIDIpICsgMTtcbiAgICAgICAgfVxuICAgIH07XG59XG4iLCJ2YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuXG52YXIgQ1JDX1RBQkxFID0gW1xuICAweDAwMDAwMDAwLCAweDc3MDczMDk2LCAweGVlMGU2MTJjLCAweDk5MDk1MWJhLCAweDA3NmRjNDE5LFxuICAweDcwNmFmNDhmLCAweGU5NjNhNTM1LCAweDllNjQ5NWEzLCAweDBlZGI4ODMyLCAweDc5ZGNiOGE0LFxuICAweGUwZDVlOTFlLCAweDk3ZDJkOTg4LCAweDA5YjY0YzJiLCAweDdlYjE3Y2JkLCAweGU3YjgyZDA3LFxuICAweDkwYmYxZDkxLCAweDFkYjcxMDY0LCAweDZhYjAyMGYyLCAweGYzYjk3MTQ4LCAweDg0YmU0MWRlLFxuICAweDFhZGFkNDdkLCAweDZkZGRlNGViLCAweGY0ZDRiNTUxLCAweDgzZDM4NWM3LCAweDEzNmM5ODU2LFxuICAweDY0NmJhOGMwLCAweGZkNjJmOTdhLCAweDhhNjVjOWVjLCAweDE0MDE1YzRmLCAweDYzMDY2Y2Q5LFxuICAweGZhMGYzZDYzLCAweDhkMDgwZGY1LCAweDNiNmUyMGM4LCAweDRjNjkxMDVlLCAweGQ1NjA0MWU0LFxuICAweGEyNjc3MTcyLCAweDNjMDNlNGQxLCAweDRiMDRkNDQ3LCAweGQyMGQ4NWZkLCAweGE1MGFiNTZiLFxuICAweDM1YjVhOGZhLCAweDQyYjI5ODZjLCAweGRiYmJjOWQ2LCAweGFjYmNmOTQwLCAweDMyZDg2Y2UzLFxuICAweDQ1ZGY1Yzc1LCAweGRjZDYwZGNmLCAweGFiZDEzZDU5LCAweDI2ZDkzMGFjLCAweDUxZGUwMDNhLFxuICAweGM4ZDc1MTgwLCAweGJmZDA2MTE2LCAweDIxYjRmNGI1LCAweDU2YjNjNDIzLCAweGNmYmE5NTk5LFxuICAweGI4YmRhNTBmLCAweDI4MDJiODllLCAweDVmMDU4ODA4LCAweGM2MGNkOWIyLCAweGIxMGJlOTI0LFxuICAweDJmNmY3Yzg3LCAweDU4Njg0YzExLCAweGMxNjExZGFiLCAweGI2NjYyZDNkLCAweDc2ZGM0MTkwLFxuICAweDAxZGI3MTA2LCAweDk4ZDIyMGJjLCAweGVmZDUxMDJhLCAweDcxYjE4NTg5LCAweDA2YjZiNTFmLFxuICAweDlmYmZlNGE1LCAweGU4YjhkNDMzLCAweDc4MDdjOWEyLCAweDBmMDBmOTM0LCAweDk2MDlhODhlLFxuICAweGUxMGU5ODE4LCAweDdmNmEwZGJiLCAweDA4NmQzZDJkLCAweDkxNjQ2Yzk3LCAweGU2NjM1YzAxLFxuICAweDZiNmI1MWY0LCAweDFjNmM2MTYyLCAweDg1NjUzMGQ4LCAweGYyNjIwMDRlLCAweDZjMDY5NWVkLFxuICAweDFiMDFhNTdiLCAweDgyMDhmNGMxLCAweGY1MGZjNDU3LCAweDY1YjBkOWM2LCAweDEyYjdlOTUwLFxuICAweDhiYmViOGVhLCAweGZjYjk4ODdjLCAweDYyZGQxZGRmLCAweDE1ZGEyZDQ5LCAweDhjZDM3Y2YzLFxuICAweGZiZDQ0YzY1LCAweDRkYjI2MTU4LCAweDNhYjU1MWNlLCAweGEzYmMwMDc0LCAweGQ0YmIzMGUyLFxuICAweDRhZGZhNTQxLCAweDNkZDg5NWQ3LCAweGE0ZDFjNDZkLCAweGQzZDZmNGZiLCAweDQzNjllOTZhLFxuICAweDM0NmVkOWZjLCAweGFkNjc4ODQ2LCAweGRhNjBiOGQwLCAweDQ0MDQyZDczLCAweDMzMDMxZGU1LFxuICAweGFhMGE0YzVmLCAweGRkMGQ3Y2M5LCAweDUwMDU3MTNjLCAweDI3MDI0MWFhLCAweGJlMGIxMDEwLFxuICAweGM5MGMyMDg2LCAweDU3NjhiNTI1LCAweDIwNmY4NWIzLCAweGI5NjZkNDA5LCAweGNlNjFlNDlmLFxuICAweDVlZGVmOTBlLCAweDI5ZDljOTk4LCAweGIwZDA5ODIyLCAweGM3ZDdhOGI0LCAweDU5YjMzZDE3LFxuICAweDJlYjQwZDgxLCAweGI3YmQ1YzNiLCAweGMwYmE2Y2FkLCAweGVkYjg4MzIwLCAweDlhYmZiM2I2LFxuICAweDAzYjZlMjBjLCAweDc0YjFkMjlhLCAweGVhZDU0NzM5LCAweDlkZDI3N2FmLCAweDA0ZGIyNjE1LFxuICAweDczZGMxNjgzLCAweGUzNjMwYjEyLCAweDk0NjQzYjg0LCAweDBkNmQ2YTNlLCAweDdhNmE1YWE4LFxuICAweGU0MGVjZjBiLCAweDkzMDlmZjlkLCAweDBhMDBhZTI3LCAweDdkMDc5ZWIxLCAweGYwMGY5MzQ0LFxuICAweDg3MDhhM2QyLCAweDFlMDFmMjY4LCAweDY5MDZjMmZlLCAweGY3NjI1NzVkLCAweDgwNjU2N2NiLFxuICAweDE5NmMzNjcxLCAweDZlNmIwNmU3LCAweGZlZDQxYjc2LCAweDg5ZDMyYmUwLCAweDEwZGE3YTVhLFxuICAweDY3ZGQ0YWNjLCAweGY5YjlkZjZmLCAweDhlYmVlZmY5LCAweDE3YjdiZTQzLCAweDYwYjA4ZWQ1LFxuICAweGQ2ZDZhM2U4LCAweGExZDE5MzdlLCAweDM4ZDhjMmM0LCAweDRmZGZmMjUyLCAweGQxYmI2N2YxLFxuICAweGE2YmM1NzY3LCAweDNmYjUwNmRkLCAweDQ4YjIzNjRiLCAweGQ4MGQyYmRhLCAweGFmMGExYjRjLFxuICAweDM2MDM0YWY2LCAweDQxMDQ3YTYwLCAweGRmNjBlZmMzLCAweGE4NjdkZjU1LCAweDMxNmU4ZWVmLFxuICAweDQ2NjliZTc5LCAweGNiNjFiMzhjLCAweGJjNjY4MzFhLCAweDI1NmZkMmEwLCAweDUyNjhlMjM2LFxuICAweGNjMGM3Nzk1LCAweGJiMGI0NzAzLCAweDIyMDIxNmI5LCAweDU1MDUyNjJmLCAweGM1YmEzYmJlLFxuICAweGIyYmQwYjI4LCAweDJiYjQ1YTkyLCAweDVjYjM2YTA0LCAweGMyZDdmZmE3LCAweGI1ZDBjZjMxLFxuICAweDJjZDk5ZThiLCAweDViZGVhZTFkLCAweDliNjRjMmIwLCAweGVjNjNmMjI2LCAweDc1NmFhMzljLFxuICAweDAyNmQ5MzBhLCAweDljMDkwNmE5LCAweGViMGUzNjNmLCAweDcyMDc2Nzg1LCAweDA1MDA1NzEzLFxuICAweDk1YmY0YTgyLCAweGUyYjg3YTE0LCAweDdiYjEyYmFlLCAweDBjYjYxYjM4LCAweDkyZDI4ZTliLFxuICAweGU1ZDViZTBkLCAweDdjZGNlZmI3LCAweDBiZGJkZjIxLCAweDg2ZDNkMmQ0LCAweGYxZDRlMjQyLFxuICAweDY4ZGRiM2Y4LCAweDFmZGE4MzZlLCAweDgxYmUxNmNkLCAweGY2YjkyNjViLCAweDZmYjA3N2UxLFxuICAweDE4Yjc0Nzc3LCAweDg4MDg1YWU2LCAweGZmMGY2YTcwLCAweDY2MDYzYmNhLCAweDExMDEwYjVjLFxuICAweDhmNjU5ZWZmLCAweGY4NjJhZTY5LCAweDYxNmJmZmQzLCAweDE2NmNjZjQ1LCAweGEwMGFlMjc4LFxuICAweGQ3MGRkMmVlLCAweDRlMDQ4MzU0LCAweDM5MDNiM2MyLCAweGE3NjcyNjYxLCAweGQwNjAxNmY3LFxuICAweDQ5Njk0NzRkLCAweDNlNmU3N2RiLCAweGFlZDE2YTRhLCAweGQ5ZDY1YWRjLCAweDQwZGYwYjY2LFxuICAweDM3ZDgzYmYwLCAweGE5YmNhZTUzLCAweGRlYmI5ZWM1LCAweDQ3YjJjZjdmLCAweDMwYjVmZmU5LFxuICAweGJkYmRmMjFjLCAweGNhYmFjMjhhLCAweDUzYjM5MzMwLCAweDI0YjRhM2E2LCAweGJhZDAzNjA1LFxuICAweGNkZDcwNjkzLCAweDU0ZGU1NzI5LCAweDIzZDk2N2JmLCAweGIzNjY3YTJlLCAweGM0NjE0YWI4LFxuICAweDVkNjgxYjAyLCAweDJhNmYyYjk0LCAweGI0MGJiZTM3LCAweGMzMGM4ZWExLCAweDVhMDVkZjFiLFxuICAweDJkMDJlZjhkXG5dO1xuXG5pZiAodHlwZW9mIEludDMyQXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gIENSQ19UQUJMRSA9IG5ldyBJbnQzMkFycmF5KENSQ19UQUJMRSk7XG59XG5cbmZ1bmN0aW9uIG5ld0VtcHR5QnVmZmVyKGxlbmd0aCkge1xuICB2YXIgYnVmZmVyID0gbmV3IEJ1ZmZlcihsZW5ndGgpO1xuICBidWZmZXIuZmlsbCgweDAwKTtcbiAgcmV0dXJuIGJ1ZmZlcjtcbn1cblxuZnVuY3Rpb24gZW5zdXJlQnVmZmVyKGlucHV0KSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoaW5wdXQpKSB7XG4gICAgcmV0dXJuIGlucHV0O1xuICB9XG5cbiAgdmFyIGhhc05ld0J1ZmZlckFQSSA9XG4gICAgICB0eXBlb2YgQnVmZmVyLmFsbG9jID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgIHR5cGVvZiBCdWZmZXIuZnJvbSA9PT0gXCJmdW5jdGlvblwiO1xuXG4gIGlmICh0eXBlb2YgaW5wdXQgPT09IFwibnVtYmVyXCIpIHtcbiAgICByZXR1cm4gaGFzTmV3QnVmZmVyQVBJID8gQnVmZmVyLmFsbG9jKGlucHV0KSA6IG5ld0VtcHR5QnVmZmVyKGlucHV0KTtcbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4gaGFzTmV3QnVmZmVyQVBJID8gQnVmZmVyLmZyb20oaW5wdXQpIDogbmV3IEJ1ZmZlcihpbnB1dCk7XG4gIH1cbiAgZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaW5wdXQgbXVzdCBiZSBidWZmZXIsIG51bWJlciwgb3Igc3RyaW5nLCByZWNlaXZlZCBcIiArXG4gICAgICAgICAgICAgICAgICAgIHR5cGVvZiBpbnB1dCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYnVmZmVyaXplSW50KG51bSkge1xuICB2YXIgdG1wID0gZW5zdXJlQnVmZmVyKDQpO1xuICB0bXAud3JpdGVJbnQzMkJFKG51bSwgMCk7XG4gIHJldHVybiB0bXA7XG59XG5cbmZ1bmN0aW9uIF9jcmMzMihidWYsIHByZXZpb3VzKSB7XG4gIGJ1ZiA9IGVuc3VyZUJ1ZmZlcihidWYpO1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHByZXZpb3VzKSkge1xuICAgIHByZXZpb3VzID0gcHJldmlvdXMucmVhZFVJbnQzMkJFKDApO1xuICB9XG4gIHZhciBjcmMgPSB+fnByZXZpb3VzIF4gLTE7XG4gIGZvciAodmFyIG4gPSAwOyBuIDwgYnVmLmxlbmd0aDsgbisrKSB7XG4gICAgY3JjID0gQ1JDX1RBQkxFWyhjcmMgXiBidWZbbl0pICYgMHhmZl0gXiAoY3JjID4+PiA4KTtcbiAgfVxuICByZXR1cm4gKGNyYyBeIC0xKTtcbn1cblxuZnVuY3Rpb24gY3JjMzIoKSB7XG4gIHJldHVybiBidWZmZXJpemVJbnQoX2NyYzMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cykpO1xufVxuY3JjMzIuc2lnbmVkID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gX2NyYzMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG59O1xuY3JjMzIudW5zaWduZWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBfY3JjMzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKSA+Pj4gMDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY3JjMzI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0XHRcdFx0XHRjcmVhdGVRdWU6IHJlcXVpcmUoXCIuL2xpYi9mb2xkZXJNUVwiKS5nZXRGb2xkZXJRdWV1ZVxuXHRcdFx0XHRcdC8vZm9sZGVyTVE6IHJlcXVpcmUoXCIuL2xpYi9mb2xkZXJNUVwiKVxufTsiLCIvKlxuTW9kdWxlIHRoYXQgb2ZmZXJzIEFQSXMgdG8gaW50ZXJhY3Qgd2l0aCBQcml2YXRlU2t5IHdlYiBzYW5kYm94ZXNcbiAqL1xuXG5cbmNvbnN0IGV4cG9ydEJyb3dzZXJJbnRlcmFjdCA9IHtcbiAgICBlbmFibGVJZnJhbWVJbnRlcmFjdGlvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuY3JlYXRlV2luZG93TVEgPSByZXF1aXJlKFwiLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvc3BlY2lmaWNNUUltcGwvQ2hpbGRXbmRNUVwiKS5jcmVhdGVNUTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuY3JlYXRlV2luZG93SW50ZXJhY3Rpb25TcGFjZSA9IHJlcXVpcmUoXCIuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9XaW5kb3dNUUludGVyYWN0aW9uU3BhY2VcIikuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZTtcbiAgICB9LFxuICAgIGVuYWJsZVJlYWN0SW50ZXJhY3Rpb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmNyZWF0ZVdpbmRvd01RID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL3NwZWNpZmljTVFJbXBsL0NoaWxkV25kTVFcIikuY3JlYXRlTVE7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmNyZWF0ZVdpbmRvd0ludGVyYWN0aW9uU3BhY2UgPSByZXF1aXJlKFwiLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvV2luZG93TVFJbnRlcmFjdGlvblNwYWNlXCIpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2U7XG4gICAgfSxcbiAgICBlbmFibGVXZWJWaWV3SW50ZXJhY3Rpb25zOmZ1bmN0aW9uKCl7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmNyZWF0ZVdpbmRvd0ludGVyYWN0aW9uU3BhY2UgPSByZXF1aXJlKFwiLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvV2ViVmlld01RSW50ZXJhY3Rpb25TcGFjZVwiKS5jcmVhdGVJbnRlcmFjdGlvblNwYWNlO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVXaW5kb3dNUSA9IHJlcXVpcmUoXCIuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9zcGVjaWZpY01RSW1wbC9DaGlsZFdlYlZpZXdNUVwiKS5jcmVhdGVNUTtcbiAgICB9LFxuICAgIGVuYWJsZUxvY2FsSW50ZXJhY3Rpb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UgPSByZXF1aXJlKFwiLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvU291bmRQdWJTdWJNUUJhc2VkSW50ZXJhY3Rpb25TcGFjZVwiKS5jcmVhdGVJbnRlcmFjdGlvblNwYWNlO1xuICAgIH0sXG4gICAgZW5hYmxlUmVtb3RlSW50ZXJhY3Rpb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmNyZWF0ZVJlbW90ZUludGVyYWN0aW9uU3BhY2UgPSByZXF1aXJlKCcuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9odHRwSW50ZXJhY3Rpb25TcGFjZScpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2U7XG4gICAgfVxufTtcblxuXG5pZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZXhwb3J0QnJvd3NlckludGVyYWN0O1xufVxuZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgIGNyZWF0ZU5vZGVJbnRlcmFjdGlvblNwYWNlOiByZXF1aXJlKFwiLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvZm9sZGVyTVFCYXNlZEludGVyYWN0aW9uU3BhY2VcIikuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZSxcbiAgICAgICAgY3JlYXRlSW50ZXJhY3Rpb25TcGFjZTogcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1NvdW5kUHViU3ViTVFCYXNlZEludGVyYWN0aW9uU3BhY2VcIikuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZSxcbiAgICAgICAgY3JlYXRlUmVtb3RlSW50ZXJhY3Rpb25TcGFjZTogcmVxdWlyZSgnLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvaHR0cEludGVyYWN0aW9uU3BhY2UnKS5jcmVhdGVJbnRlcmFjdGlvblNwYWNlXG4gICAgfTtcbn0iLCJ2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG52YXIgc3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJyk7XG52YXIgUmVhZGFibGUgPSBzdHJlYW0uUmVhZGFibGU7XG52YXIgV3JpdGFibGUgPSBzdHJlYW0uV3JpdGFibGU7XG52YXIgUGFzc1Rocm91Z2ggPSBzdHJlYW0uUGFzc1Rocm91Z2g7XG52YXIgUGVuZCA9IHJlcXVpcmUoJy4vbW9kdWxlcy9ub2RlLXBlbmQnKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbmV4cG9ydHMuY3JlYXRlRnJvbUJ1ZmZlciA9IGNyZWF0ZUZyb21CdWZmZXI7XG5leHBvcnRzLmNyZWF0ZUZyb21GZCA9IGNyZWF0ZUZyb21GZDtcbmV4cG9ydHMuQnVmZmVyU2xpY2VyID0gQnVmZmVyU2xpY2VyO1xuZXhwb3J0cy5GZFNsaWNlciA9IEZkU2xpY2VyO1xuXG51dGlsLmluaGVyaXRzKEZkU2xpY2VyLCBFdmVudEVtaXR0ZXIpO1xuZnVuY3Rpb24gRmRTbGljZXIoZmQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuXG4gIHRoaXMuZmQgPSBmZDtcbiAgdGhpcy5wZW5kID0gbmV3IFBlbmQoKTtcbiAgdGhpcy5wZW5kLm1heCA9IDE7XG4gIHRoaXMucmVmQ291bnQgPSAwO1xuICB0aGlzLmF1dG9DbG9zZSA9ICEhb3B0aW9ucy5hdXRvQ2xvc2U7XG59XG5cbkZkU2xpY2VyLnByb3RvdHlwZS5yZWFkID0gZnVuY3Rpb24oYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5wZW5kLmdvKGZ1bmN0aW9uKGNiKSB7XG4gICAgZnMucmVhZChzZWxmLmZkLCBidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgZnVuY3Rpb24oZXJyLCBieXRlc1JlYWQsIGJ1ZmZlcikge1xuICAgICAgY2IoKTtcbiAgICAgIGNhbGxiYWNrKGVyciwgYnl0ZXNSZWFkLCBidWZmZXIpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbkZkU2xpY2VyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYucGVuZC5nbyhmdW5jdGlvbihjYikge1xuICAgIGZzLndyaXRlKHNlbGYuZmQsIGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBmdW5jdGlvbihlcnIsIHdyaXR0ZW4sIGJ1ZmZlcikge1xuICAgICAgY2IoKTtcbiAgICAgIGNhbGxiYWNrKGVyciwgd3JpdHRlbiwgYnVmZmVyKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5GZFNsaWNlci5wcm90b3R5cGUuY3JlYXRlUmVhZFN0cmVhbSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBSZWFkU3RyZWFtKHRoaXMsIG9wdGlvbnMpO1xufTtcblxuRmRTbGljZXIucHJvdG90eXBlLmNyZWF0ZVdyaXRlU3RyZWFtID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICByZXR1cm4gbmV3IFdyaXRlU3RyZWFtKHRoaXMsIG9wdGlvbnMpO1xufTtcblxuRmRTbGljZXIucHJvdG90eXBlLnJlZiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnJlZkNvdW50ICs9IDE7XG59O1xuXG5GZFNsaWNlci5wcm90b3R5cGUudW5yZWYgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLnJlZkNvdW50IC09IDE7XG5cbiAgaWYgKHNlbGYucmVmQ291bnQgPiAwKSByZXR1cm47XG4gIGlmIChzZWxmLnJlZkNvdW50IDwgMCkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCB1bnJlZlwiKTtcblxuICBpZiAoc2VsZi5hdXRvQ2xvc2UpIHtcbiAgICBmcy5jbG9zZShzZWxmLmZkLCBvbkNsb3NlRG9uZSk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkNsb3NlRG9uZShlcnIpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5lbWl0KCdjbG9zZScpO1xuICAgIH1cbiAgfVxufTtcblxudXRpbC5pbmhlcml0cyhSZWFkU3RyZWFtLCBSZWFkYWJsZSk7XG5mdW5jdGlvbiBSZWFkU3RyZWFtKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIFJlYWRhYmxlLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5jb250ZXh0LnJlZigpO1xuXG4gIHRoaXMuc3RhcnQgPSBvcHRpb25zLnN0YXJ0IHx8IDA7XG4gIHRoaXMuZW5kT2Zmc2V0ID0gb3B0aW9ucy5lbmQ7XG4gIHRoaXMucG9zID0gdGhpcy5zdGFydDtcbiAgdGhpcy5kZXN0cm95ZWQgPSBmYWxzZTtcbn1cblxuUmVhZFN0cmVhbS5wcm90b3R5cGUuX3JlYWQgPSBmdW5jdGlvbihuKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYuZGVzdHJveWVkKSByZXR1cm47XG5cbiAgdmFyIHRvUmVhZCA9IE1hdGgubWluKHNlbGYuX3JlYWRhYmxlU3RhdGUuaGlnaFdhdGVyTWFyaywgbik7XG4gIGlmIChzZWxmLmVuZE9mZnNldCAhPSBudWxsKSB7XG4gICAgdG9SZWFkID0gTWF0aC5taW4odG9SZWFkLCBzZWxmLmVuZE9mZnNldCAtIHNlbGYucG9zKTtcbiAgfVxuICBpZiAodG9SZWFkIDw9IDApIHtcbiAgICBzZWxmLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgc2VsZi5wdXNoKG51bGwpO1xuICAgIHNlbGYuY29udGV4dC51bnJlZigpO1xuICAgIHJldHVybjtcbiAgfVxuICBzZWxmLmNvbnRleHQucGVuZC5nbyhmdW5jdGlvbihjYikge1xuICAgIGlmIChzZWxmLmRlc3Ryb3llZCkgcmV0dXJuIGNiKCk7XG4gICAgdmFyIGJ1ZmZlciA9IG5ldyBCdWZmZXIodG9SZWFkKTtcbiAgICBmcy5yZWFkKHNlbGYuY29udGV4dC5mZCwgYnVmZmVyLCAwLCB0b1JlYWQsIHNlbGYucG9zLCBmdW5jdGlvbihlcnIsIGJ5dGVzUmVhZCkge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBzZWxmLmRlc3Ryb3koZXJyKTtcbiAgICAgIH0gZWxzZSBpZiAoYnl0ZXNSZWFkID09PSAwKSB7XG4gICAgICAgIHNlbGYuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICAgICAgc2VsZi5wdXNoKG51bGwpO1xuICAgICAgICBzZWxmLmNvbnRleHQudW5yZWYoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYucG9zICs9IGJ5dGVzUmVhZDtcbiAgICAgICAgc2VsZi5wdXNoKGJ1ZmZlci5zbGljZSgwLCBieXRlc1JlYWQpKTtcbiAgICAgIH1cbiAgICAgIGNiKCk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuUmVhZFN0cmVhbS5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKGVycikge1xuICBpZiAodGhpcy5kZXN0cm95ZWQpIHJldHVybjtcbiAgZXJyID0gZXJyIHx8IG5ldyBFcnJvcihcInN0cmVhbSBkZXN0cm95ZWRcIik7XG4gIHRoaXMuZGVzdHJveWVkID0gdHJ1ZTtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG4gIHRoaXMuY29udGV4dC51bnJlZigpO1xufTtcblxudXRpbC5pbmhlcml0cyhXcml0ZVN0cmVhbSwgV3JpdGFibGUpO1xuZnVuY3Rpb24gV3JpdGVTdHJlYW0oY29udGV4dCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgV3JpdGFibGUuY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLmNvbnRleHQucmVmKCk7XG5cbiAgdGhpcy5zdGFydCA9IG9wdGlvbnMuc3RhcnQgfHwgMDtcbiAgdGhpcy5lbmRPZmZzZXQgPSAob3B0aW9ucy5lbmQgPT0gbnVsbCkgPyBJbmZpbml0eSA6ICtvcHRpb25zLmVuZDtcbiAgdGhpcy5ieXRlc1dyaXR0ZW4gPSAwO1xuICB0aGlzLnBvcyA9IHRoaXMuc3RhcnQ7XG4gIHRoaXMuZGVzdHJveWVkID0gZmFsc2U7XG5cbiAgdGhpcy5vbignZmluaXNoJywgdGhpcy5kZXN0cm95LmJpbmQodGhpcykpO1xufVxuXG5Xcml0ZVN0cmVhbS5wcm90b3R5cGUuX3dyaXRlID0gZnVuY3Rpb24oYnVmZmVyLCBlbmNvZGluZywgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoc2VsZi5kZXN0cm95ZWQpIHJldHVybjtcblxuICBpZiAoc2VsZi5wb3MgKyBidWZmZXIubGVuZ3RoID4gc2VsZi5lbmRPZmZzZXQpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKFwibWF4aW11bSBmaWxlIGxlbmd0aCBleGNlZWRlZFwiKTtcbiAgICBlcnIuY29kZSA9ICdFVE9PQklHJztcbiAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICBjYWxsYmFjayhlcnIpO1xuICAgIHJldHVybjtcbiAgfVxuICBzZWxmLmNvbnRleHQucGVuZC5nbyhmdW5jdGlvbihjYikge1xuICAgIGlmIChzZWxmLmRlc3Ryb3llZCkgcmV0dXJuIGNiKCk7XG4gICAgZnMud3JpdGUoc2VsZi5jb250ZXh0LmZkLCBidWZmZXIsIDAsIGJ1ZmZlci5sZW5ndGgsIHNlbGYucG9zLCBmdW5jdGlvbihlcnIsIGJ5dGVzKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICBjYigpO1xuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5ieXRlc1dyaXR0ZW4gKz0gYnl0ZXM7XG4gICAgICAgIHNlbGYucG9zICs9IGJ5dGVzO1xuICAgICAgICBzZWxmLmVtaXQoJ3Byb2dyZXNzJyk7XG4gICAgICAgIGNiKCk7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufTtcblxuV3JpdGVTdHJlYW0ucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuZGVzdHJveWVkKSByZXR1cm47XG4gIHRoaXMuZGVzdHJveWVkID0gdHJ1ZTtcbiAgdGhpcy5jb250ZXh0LnVucmVmKCk7XG59O1xuXG51dGlsLmluaGVyaXRzKEJ1ZmZlclNsaWNlciwgRXZlbnRFbWl0dGVyKTtcbmZ1bmN0aW9uIEJ1ZmZlclNsaWNlcihidWZmZXIsIG9wdGlvbnMpIHtcbiAgRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHRoaXMucmVmQ291bnQgPSAwO1xuICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgdGhpcy5tYXhDaHVua1NpemUgPSBvcHRpb25zLm1heENodW5rU2l6ZSB8fCBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjtcbn1cblxuQnVmZmVyU2xpY2VyLnByb3RvdHlwZS5yZWFkID0gZnVuY3Rpb24oYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrKSB7XG4gIHZhciBlbmQgPSBwb3NpdGlvbiArIGxlbmd0aDtcbiAgdmFyIGRlbHRhID0gZW5kIC0gdGhpcy5idWZmZXIubGVuZ3RoO1xuICB2YXIgd3JpdHRlbiA9IChkZWx0YSA+IDApID8gZGVsdGEgOiBsZW5ndGg7XG4gIHRoaXMuYnVmZmVyLmNvcHkoYnVmZmVyLCBvZmZzZXQsIHBvc2l0aW9uLCBlbmQpO1xuICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgY2FsbGJhY2sobnVsbCwgd3JpdHRlbik7XG4gIH0pO1xufTtcblxuQnVmZmVyU2xpY2VyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaykge1xuICBidWZmZXIuY29weSh0aGlzLmJ1ZmZlciwgcG9zaXRpb24sIG9mZnNldCwgb2Zmc2V0ICsgbGVuZ3RoKTtcbiAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgIGNhbGxiYWNrKG51bGwsIGxlbmd0aCwgYnVmZmVyKTtcbiAgfSk7XG59O1xuXG5CdWZmZXJTbGljZXIucHJvdG90eXBlLmNyZWF0ZVJlYWRTdHJlYW0gPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgcmVhZFN0cmVhbSA9IG5ldyBQYXNzVGhyb3VnaChvcHRpb25zKTtcbiAgcmVhZFN0cmVhbS5kZXN0cm95ZWQgPSBmYWxzZTtcbiAgcmVhZFN0cmVhbS5zdGFydCA9IG9wdGlvbnMuc3RhcnQgfHwgMDtcbiAgcmVhZFN0cmVhbS5lbmRPZmZzZXQgPSBvcHRpb25zLmVuZDtcbiAgLy8gYnkgdGhlIHRpbWUgdGhpcyBmdW5jdGlvbiByZXR1cm5zLCB3ZSdsbCBiZSBkb25lLlxuICByZWFkU3RyZWFtLnBvcyA9IHJlYWRTdHJlYW0uZW5kT2Zmc2V0IHx8IHRoaXMuYnVmZmVyLmxlbmd0aDtcblxuICAvLyByZXNwZWN0IHRoZSBtYXhDaHVua1NpemUgb3B0aW9uIHRvIHNsaWNlIHVwIHRoZSBjaHVuayBpbnRvIHNtYWxsZXIgcGllY2VzLlxuICB2YXIgZW50aXJlU2xpY2UgPSB0aGlzLmJ1ZmZlci5zbGljZShyZWFkU3RyZWFtLnN0YXJ0LCByZWFkU3RyZWFtLnBvcyk7XG4gIHZhciBvZmZzZXQgPSAwO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIHZhciBuZXh0T2Zmc2V0ID0gb2Zmc2V0ICsgdGhpcy5tYXhDaHVua1NpemU7XG4gICAgaWYgKG5leHRPZmZzZXQgPj0gZW50aXJlU2xpY2UubGVuZ3RoKSB7XG4gICAgICAvLyBsYXN0IGNodW5rXG4gICAgICBpZiAob2Zmc2V0IDwgZW50aXJlU2xpY2UubGVuZ3RoKSB7XG4gICAgICAgIHJlYWRTdHJlYW0ud3JpdGUoZW50aXJlU2xpY2Uuc2xpY2Uob2Zmc2V0LCBlbnRpcmVTbGljZS5sZW5ndGgpKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZWFkU3RyZWFtLndyaXRlKGVudGlyZVNsaWNlLnNsaWNlKG9mZnNldCwgbmV4dE9mZnNldCkpO1xuICAgIG9mZnNldCA9IG5leHRPZmZzZXQ7XG4gIH1cblxuICByZWFkU3RyZWFtLmVuZCgpO1xuICByZWFkU3RyZWFtLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICByZWFkU3RyZWFtLmRlc3Ryb3llZCA9IHRydWU7XG4gIH07XG4gIHJldHVybiByZWFkU3RyZWFtO1xufTtcblxuQnVmZmVyU2xpY2VyLnByb3RvdHlwZS5jcmVhdGVXcml0ZVN0cmVhbSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgdmFyIGJ1ZmZlclNsaWNlciA9IHRoaXM7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgd3JpdGVTdHJlYW0gPSBuZXcgV3JpdGFibGUob3B0aW9ucyk7XG4gIHdyaXRlU3RyZWFtLnN0YXJ0ID0gb3B0aW9ucy5zdGFydCB8fCAwO1xuICB3cml0ZVN0cmVhbS5lbmRPZmZzZXQgPSAob3B0aW9ucy5lbmQgPT0gbnVsbCkgPyB0aGlzLmJ1ZmZlci5sZW5ndGggOiArb3B0aW9ucy5lbmQ7XG4gIHdyaXRlU3RyZWFtLmJ5dGVzV3JpdHRlbiA9IDA7XG4gIHdyaXRlU3RyZWFtLnBvcyA9IHdyaXRlU3RyZWFtLnN0YXJ0O1xuICB3cml0ZVN0cmVhbS5kZXN0cm95ZWQgPSBmYWxzZTtcbiAgd3JpdGVTdHJlYW0uX3dyaXRlID0gZnVuY3Rpb24oYnVmZmVyLCBlbmNvZGluZywgY2FsbGJhY2spIHtcbiAgICBpZiAod3JpdGVTdHJlYW0uZGVzdHJveWVkKSByZXR1cm47XG5cbiAgICB2YXIgZW5kID0gd3JpdGVTdHJlYW0ucG9zICsgYnVmZmVyLmxlbmd0aDtcbiAgICBpZiAoZW5kID4gd3JpdGVTdHJlYW0uZW5kT2Zmc2V0KSB7XG4gICAgICB2YXIgZXJyID0gbmV3IEVycm9yKFwibWF4aW11bSBmaWxlIGxlbmd0aCBleGNlZWRlZFwiKTtcbiAgICAgIGVyci5jb2RlID0gJ0VUT09CSUcnO1xuICAgICAgd3JpdGVTdHJlYW0uZGVzdHJveWVkID0gdHJ1ZTtcbiAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGJ1ZmZlci5jb3B5KGJ1ZmZlclNsaWNlci5idWZmZXIsIHdyaXRlU3RyZWFtLnBvcywgMCwgYnVmZmVyLmxlbmd0aCk7XG5cbiAgICB3cml0ZVN0cmVhbS5ieXRlc1dyaXR0ZW4gKz0gYnVmZmVyLmxlbmd0aDtcbiAgICB3cml0ZVN0cmVhbS5wb3MgPSBlbmQ7XG4gICAgd3JpdGVTdHJlYW0uZW1pdCgncHJvZ3Jlc3MnKTtcbiAgICBjYWxsYmFjaygpO1xuICB9O1xuICB3cml0ZVN0cmVhbS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgd3JpdGVTdHJlYW0uZGVzdHJveWVkID0gdHJ1ZTtcbiAgfTtcbiAgcmV0dXJuIHdyaXRlU3RyZWFtO1xufTtcblxuQnVmZmVyU2xpY2VyLnByb3RvdHlwZS5yZWYgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5yZWZDb3VudCArPSAxO1xufTtcblxuQnVmZmVyU2xpY2VyLnByb3RvdHlwZS51bnJlZiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnJlZkNvdW50IC09IDE7XG5cbiAgaWYgKHRoaXMucmVmQ291bnQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCB1bnJlZlwiKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gY3JlYXRlRnJvbUJ1ZmZlcihidWZmZXIsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBCdWZmZXJTbGljZXIoYnVmZmVyLCBvcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRnJvbUZkKGZkLCBvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgRmRTbGljZXIoZmQsIG9wdGlvbnMpO1xufVxuIiwiLy90byBsb29rIG5pY2UgdGhlIHJlcXVpcmVNb2R1bGUgb24gTm9kZVxucmVxdWlyZShcIi4vbGliL3Bzay1hYnN0cmFjdC1jbGllbnRcIik7XG5pZighJCQuYnJvd3NlclJ1bnRpbWUpe1xuXHRyZXF1aXJlKFwiLi9saWIvcHNrLW5vZGUtY2xpZW50XCIpO1xufWVsc2V7XG5cdHJlcXVpcmUoXCIuL2xpYi9wc2stYnJvd3Nlci1jbGllbnRcIik7XG59IiwiY29uc3QgQmxvY2tjaGFpbiA9IHJlcXVpcmUoJy4vbGliL0Jsb2NrY2hhaW4nKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc3RhcnREQjogZnVuY3Rpb24gKGZvbGRlcikge1xuICAgICAgICBpZiAoJCQuYmxvY2tjaGFpbikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCckJC5ibG9ja2NoYWluIGlzIGFscmVhZHkgZGVmaW5lZCcpO1xuICAgICAgICB9XG4gICAgICAgICQkLmJsb2NrY2hhaW4gPSB0aGlzLmNyZWF0ZURCSGFuZGxlcihmb2xkZXIpO1xuICAgICAgICByZXR1cm4gJCQuYmxvY2tjaGFpbjtcbiAgICB9LFxuICAgIGNyZWF0ZURCSGFuZGxlcjogZnVuY3Rpb24oZm9sZGVyKXtcbiAgICAgICAgcmVxdWlyZSgnLi9saWIvZG9tYWluJyk7XG4gICAgICAgIHJlcXVpcmUoJy4vbGliL3N3YXJtcycpO1xuXG4gICAgICAgIGNvbnN0IGZwZHMgPSByZXF1aXJlKFwiLi9saWIvRm9sZGVyUGVyc2lzdGVudFBEU1wiKTtcbiAgICAgICAgY29uc3QgcGRzID0gZnBkcy5uZXdQRFMoZm9sZGVyKTtcblxuICAgICAgICByZXR1cm4gbmV3IEJsb2NrY2hhaW4ocGRzKTtcbiAgICB9LFxuICAgIHBhcnNlRG9tYWluVXJsOiBmdW5jdGlvbiAoZG9tYWluVXJsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRW1wdHkgZnVuY3Rpb25cIik7XG4gICAgfSxcbiAgICBnZXREb21haW5JbmZvOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRW1wdHkgZnVuY3Rpb25cIik7XG4gICAgfSxcbiAgICBzdGFydEluTWVtb3J5REI6IGZ1bmN0aW9uKCkge1xuXHRcdHJlcXVpcmUoJy4vbGliL2RvbWFpbicpO1xuXHRcdHJlcXVpcmUoJy4vbGliL3N3YXJtcycpO1xuXG5cdFx0Y29uc3QgcGRzID0gcmVxdWlyZSgnLi9saWIvSW5NZW1vcnlQRFMnKTtcblxuXHRcdHJldHVybiBuZXcgQmxvY2tjaGFpbihwZHMubmV3UERTKG51bGwpKTtcbiAgICB9LFxuICAgIHN0YXJ0RGI6IGZ1bmN0aW9uKHJlYWRlcldyaXRlcikge1xuICAgICAgICByZXF1aXJlKCcuL2xpYi9kb21haW4nKTtcbiAgICAgICAgcmVxdWlyZSgnLi9saWIvc3dhcm1zJyk7XG5cbiAgICAgICAgY29uc3QgcHBkcyA9IHJlcXVpcmUoXCIuL2xpYi9QZXJzaXN0ZW50UERTXCIpO1xuICAgICAgICBjb25zdCBwZHMgPSBwcGRzLm5ld1BEUyhyZWFkZXJXcml0ZXIpO1xuXG4gICAgICAgIHJldHVybiBuZXcgQmxvY2tjaGFpbihwZHMpO1xuICAgIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cy51dGlscyAgPSByZXF1aXJlKFwiLi91dGlscy9mbG93c1V0aWxzXCIpO1xuY29uc3QgUm9vdENTQiA9IHJlcXVpcmUoJy4vbGlicmFyaWVzL1Jvb3RDU0InKTtcbm1vZHVsZS5leHBvcnRzLmNyZWF0ZVJvb3RDU0IgPSBSb290Q1NCLmNyZWF0ZVJvb3RDU0I7XG5tb2R1bGUuZXhwb3J0cy5sb2FkV2l0aElkZW50aWZpZXIgPSBSb290Q1NCLmxvYWRXaXRoSWRlbnRpZmllcjtcbm1vZHVsZS5leHBvcnRzLmxvYWRXaXRoUGluICAgPSBSb290Q1NCLmxvYWRXaXRoUGluO1xubW9kdWxlLmV4cG9ydHMud3JpdGVOZXdNYXN0ZXJDU0IgPSBSb290Q1NCLndyaXRlTmV3TWFzdGVyQ1NCO1xubW9kdWxlLmV4cG9ydHMuUm9vdENTQiA9IFJvb3RDU0I7XG5tb2R1bGUuZXhwb3J0cy5SYXdDU0IgPSByZXF1aXJlKCcuL2xpYnJhcmllcy9SYXdDU0InKTtcbm1vZHVsZS5leHBvcnRzLkNTQklkZW50aWZpZXIgPSByZXF1aXJlKCcuL2xpYnJhcmllcy9DU0JJZGVudGlmaWVyJyk7XG5tb2R1bGUuZXhwb3J0cy5pbml0ID0gZnVuY3Rpb24gKCkge1xuXHQkJC5sb2FkTGlicmFyeShcInBza3dhbGxldFwiLCByZXF1aXJlKFwiLi9saWJyYXJpZXMvZmxvd3MvaW5kZXhcIikpO1xufTtcblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY29uc1V0aWw6IHJlcXVpcmUoJy4vY29uc1V0aWwnKVxufTsiLCJ2YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgemxpYiA9IHJlcXVpcmUoXCJ6bGliXCIpO1xuY29uc3QgZmRfc2xpY2VyID0gcmVxdWlyZShcIm5vZGUtZmQtc2xpY2VyXCIpO1xudmFyIGNyYzMyID0gcmVxdWlyZShcImJ1ZmZlci1jcmMzMlwiKTtcbnZhciB1dGlsID0gcmVxdWlyZShcInV0aWxcIik7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZShcInN0cmVhbVwiKS5UcmFuc2Zvcm07XG52YXIgUGFzc1Rocm91Z2ggPSByZXF1aXJlKFwic3RyZWFtXCIpLlBhc3NUaHJvdWdoO1xudmFyIFdyaXRhYmxlID0gcmVxdWlyZShcInN0cmVhbVwiKS5Xcml0YWJsZTtcblxuZXhwb3J0cy5vcGVuID0gb3BlbjtcbmV4cG9ydHMuZnJvbUZkID0gZnJvbUZkO1xuZXhwb3J0cy5mcm9tQnVmZmVyID0gZnJvbUJ1ZmZlcjtcbmV4cG9ydHMuZnJvbVJhbmRvbUFjY2Vzc1JlYWRlciA9IGZyb21SYW5kb21BY2Nlc3NSZWFkZXI7XG5leHBvcnRzLmRvc0RhdGVUaW1lVG9EYXRlID0gZG9zRGF0ZVRpbWVUb0RhdGU7XG5leHBvcnRzLnZhbGlkYXRlRmlsZU5hbWUgPSB2YWxpZGF0ZUZpbGVOYW1lO1xuZXhwb3J0cy5aaXBGaWxlID0gWmlwRmlsZTtcbmV4cG9ydHMuRW50cnkgPSBFbnRyeTtcbmV4cG9ydHMuUmFuZG9tQWNjZXNzUmVhZGVyID0gUmFuZG9tQWNjZXNzUmVhZGVyO1xuXG5mdW5jdGlvbiBvcGVuKHBhdGgsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG5cdGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0Y2FsbGJhY2sgPSBvcHRpb25zO1xuXHRcdG9wdGlvbnMgPSBudWxsO1xuXHR9XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblx0aWYgKG9wdGlvbnMuYXV0b0Nsb3NlID09IG51bGwpIG9wdGlvbnMuYXV0b0Nsb3NlID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMubGF6eUVudHJpZXMgPT0gbnVsbCkgb3B0aW9ucy5sYXp5RW50cmllcyA9IGZhbHNlO1xuXHRpZiAob3B0aW9ucy5kZWNvZGVTdHJpbmdzID09IG51bGwpIG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9IHRydWU7XG5cdGlmIChvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9PSBudWxsKSBvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9IHRydWU7XG5cdGlmIChvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9PSBudWxsKSBvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9IGZhbHNlO1xuXHRpZiAoY2FsbGJhY2sgPT0gbnVsbCkgY2FsbGJhY2sgPSBkZWZhdWx0Q2FsbGJhY2s7XG5cdGZzLm9wZW4ocGF0aCwgXCJyXCIsIGZ1bmN0aW9uIChlcnIsIGZkKSB7XG5cdFx0aWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0ZnJvbUZkKGZkLCBvcHRpb25zLCBmdW5jdGlvbiAoZXJyLCB6aXBmaWxlKSB7XG5cdFx0XHRpZiAoZXJyKSBmcy5jbG9zZShmZCwgZGVmYXVsdENhbGxiYWNrKTtcblx0XHRcdGNhbGxiYWNrKGVyciwgemlwZmlsZSk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBmcm9tRmQoZmQsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG5cdGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0Y2FsbGJhY2sgPSBvcHRpb25zO1xuXHRcdG9wdGlvbnMgPSBudWxsO1xuXHR9XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblx0aWYgKG9wdGlvbnMuYXV0b0Nsb3NlID09IG51bGwpIG9wdGlvbnMuYXV0b0Nsb3NlID0gZmFsc2U7XG5cdGlmIChvcHRpb25zLmxhenlFbnRyaWVzID09IG51bGwpIG9wdGlvbnMubGF6eUVudHJpZXMgPSBmYWxzZTtcblx0aWYgKG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9PSBudWxsKSBvcHRpb25zLmRlY29kZVN0cmluZ3MgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPT0gbnVsbCkgb3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPT0gbnVsbCkgb3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPSBmYWxzZTtcblx0aWYgKGNhbGxiYWNrID09IG51bGwpIGNhbGxiYWNrID0gZGVmYXVsdENhbGxiYWNrO1xuXHRmcy5mc3RhdChmZCwgZnVuY3Rpb24gKGVyciwgc3RhdHMpIHtcblx0XHRpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHR2YXIgcmVhZGVyID0gZmRfc2xpY2VyLmNyZWF0ZUZyb21GZChmZCwge2F1dG9DbG9zZTogdHJ1ZX0pO1xuXHRcdGZyb21SYW5kb21BY2Nlc3NSZWFkZXIocmVhZGVyLCBzdGF0cy5zaXplLCBvcHRpb25zLCBjYWxsYmFjayk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBmcm9tQnVmZmVyKGJ1ZmZlciwgb3B0aW9ucywgY2FsbGJhY2spIHtcblx0aWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRjYWxsYmFjayA9IG9wdGlvbnM7XG5cdFx0b3B0aW9ucyA9IG51bGw7XG5cdH1cblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXHRvcHRpb25zLmF1dG9DbG9zZSA9IGZhbHNlO1xuXHRpZiAob3B0aW9ucy5sYXp5RW50cmllcyA9PSBudWxsKSBvcHRpb25zLmxhenlFbnRyaWVzID0gZmFsc2U7XG5cdGlmIChvcHRpb25zLmRlY29kZVN0cmluZ3MgPT0gbnVsbCkgb3B0aW9ucy5kZWNvZGVTdHJpbmdzID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzID09IG51bGwpIG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzID09IG51bGwpIG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzID0gZmFsc2U7XG5cdC8vIGxpbWl0IHRoZSBtYXggY2h1bmsgc2l6ZS4gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVqb3Nod29sZmUveWF1emwvaXNzdWVzLzg3XG5cdHZhciByZWFkZXIgPSBmZF9zbGljZXIuY3JlYXRlRnJvbUJ1ZmZlcihidWZmZXIsIHttYXhDaHVua1NpemU6IDB4MTAwMDB9KTtcblx0ZnJvbVJhbmRvbUFjY2Vzc1JlYWRlcihyZWFkZXIsIGJ1ZmZlci5sZW5ndGgsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbn1cblxuZnVuY3Rpb24gZnJvbVJhbmRvbUFjY2Vzc1JlYWRlcihyZWFkZXIsIHRvdGFsU2l6ZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcblx0aWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRjYWxsYmFjayA9IG9wdGlvbnM7XG5cdFx0b3B0aW9ucyA9IG51bGw7XG5cdH1cblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXHRpZiAob3B0aW9ucy5hdXRvQ2xvc2UgPT0gbnVsbCkgb3B0aW9ucy5hdXRvQ2xvc2UgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy5sYXp5RW50cmllcyA9PSBudWxsKSBvcHRpb25zLmxhenlFbnRyaWVzID0gZmFsc2U7XG5cdGlmIChvcHRpb25zLmRlY29kZVN0cmluZ3MgPT0gbnVsbCkgb3B0aW9ucy5kZWNvZGVTdHJpbmdzID0gdHJ1ZTtcblx0dmFyIGRlY29kZVN0cmluZ3MgPSAhIW9wdGlvbnMuZGVjb2RlU3RyaW5ncztcblx0aWYgKG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzID09IG51bGwpIG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzID09IG51bGwpIG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzID0gZmFsc2U7XG5cdGlmIChjYWxsYmFjayA9PSBudWxsKSBjYWxsYmFjayA9IGRlZmF1bHRDYWxsYmFjaztcblx0aWYgKHR5cGVvZiB0b3RhbFNpemUgIT09IFwibnVtYmVyXCIpIHRocm93IG5ldyBFcnJvcihcImV4cGVjdGVkIHRvdGFsU2l6ZSBwYXJhbWV0ZXIgdG8gYmUgYSBudW1iZXJcIik7XG5cdGlmICh0b3RhbFNpemUgPiBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUikge1xuXHRcdHRocm93IG5ldyBFcnJvcihcInppcCBmaWxlIHRvbyBsYXJnZS4gb25seSBmaWxlIHNpemVzIHVwIHRvIDJeNTIgYXJlIHN1cHBvcnRlZCBkdWUgdG8gSmF2YVNjcmlwdCdzIE51bWJlciB0eXBlIGJlaW5nIGFuIElFRUUgNzU0IGRvdWJsZS5cIik7XG5cdH1cblxuXHQvLyB0aGUgbWF0Y2hpbmcgdW5yZWYoKSBjYWxsIGlzIGluIHppcGZpbGUuY2xvc2UoKVxuXHRyZWFkZXIucmVmKCk7XG5cblx0Ly8gZW9jZHIgbWVhbnMgRW5kIG9mIENlbnRyYWwgRGlyZWN0b3J5IFJlY29yZC5cblx0Ly8gc2VhcmNoIGJhY2t3YXJkcyBmb3IgdGhlIGVvY2RyIHNpZ25hdHVyZS5cblx0Ly8gdGhlIGxhc3QgZmllbGQgb2YgdGhlIGVvY2RyIGlzIGEgdmFyaWFibGUtbGVuZ3RoIGNvbW1lbnQuXG5cdC8vIHRoZSBjb21tZW50IHNpemUgaXMgZW5jb2RlZCBpbiBhIDItYnl0ZSBmaWVsZCBpbiB0aGUgZW9jZHIsIHdoaWNoIHdlIGNhbid0IGZpbmQgd2l0aG91dCB0cnVkZ2luZyBiYWNrd2FyZHMgdGhyb3VnaCB0aGUgY29tbWVudCB0byBmaW5kIGl0LlxuXHQvLyBhcyBhIGNvbnNlcXVlbmNlIG9mIHRoaXMgZGVzaWduIGRlY2lzaW9uLCBpdCdzIHBvc3NpYmxlIHRvIGhhdmUgYW1iaWd1b3VzIHppcCBmaWxlIG1ldGFkYXRhIGlmIGEgY29oZXJlbnQgZW9jZHIgd2FzIGluIHRoZSBjb21tZW50LlxuXHQvLyB3ZSBzZWFyY2ggYmFja3dhcmRzIGZvciBhIGVvY2RyIHNpZ25hdHVyZSwgYW5kIGhvcGUgdGhhdCB3aG9ldmVyIG1hZGUgdGhlIHppcCBmaWxlIHdhcyBzbWFydCBlbm91Z2ggdG8gZm9yYmlkIHRoZSBlb2NkciBzaWduYXR1cmUgaW4gdGhlIGNvbW1lbnQuXG5cdHZhciBlb2NkcldpdGhvdXRDb21tZW50U2l6ZSA9IDIyO1xuXHR2YXIgbWF4Q29tbWVudFNpemUgPSAweGZmZmY7IC8vIDItYnl0ZSBzaXplXG5cdHZhciBidWZmZXJTaXplID0gTWF0aC5taW4oZW9jZHJXaXRob3V0Q29tbWVudFNpemUgKyBtYXhDb21tZW50U2l6ZSwgdG90YWxTaXplKTtcblx0dmFyIGJ1ZmZlciA9IG5ld0J1ZmZlcihidWZmZXJTaXplKTtcblx0dmFyIGJ1ZmZlclJlYWRTdGFydCA9IHRvdGFsU2l6ZSAtIGJ1ZmZlci5sZW5ndGg7XG5cdHJlYWRBbmRBc3NlcnROb0VvZihyZWFkZXIsIGJ1ZmZlciwgMCwgYnVmZmVyU2l6ZSwgYnVmZmVyUmVhZFN0YXJ0LCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0aWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0Zm9yICh2YXIgaSA9IGJ1ZmZlclNpemUgLSBlb2NkcldpdGhvdXRDb21tZW50U2l6ZTsgaSA+PSAwOyBpIC09IDEpIHtcblx0XHRcdGlmIChidWZmZXIucmVhZFVJbnQzMkxFKGkpICE9PSAweDA2MDU0YjUwKSBjb250aW51ZTtcblx0XHRcdC8vIGZvdW5kIGVvY2RyXG5cdFx0XHR2YXIgZW9jZHJCdWZmZXIgPSBidWZmZXIuc2xpY2UoaSk7XG5cblx0XHRcdC8vIDAgLSBFbmQgb2YgY2VudHJhbCBkaXJlY3Rvcnkgc2lnbmF0dXJlID0gMHgwNjA1NGI1MFxuXHRcdFx0Ly8gNCAtIE51bWJlciBvZiB0aGlzIGRpc2tcblx0XHRcdHZhciBkaXNrTnVtYmVyID0gZW9jZHJCdWZmZXIucmVhZFVJbnQxNkxFKDQpO1xuXHRcdFx0aWYgKGRpc2tOdW1iZXIgIT09IDApIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcIm11bHRpLWRpc2sgemlwIGZpbGVzIGFyZSBub3Qgc3VwcG9ydGVkOiBmb3VuZCBkaXNrIG51bWJlcjogXCIgKyBkaXNrTnVtYmVyKSk7XG5cdFx0XHR9XG5cdFx0XHQvLyA2IC0gRGlzayB3aGVyZSBjZW50cmFsIGRpcmVjdG9yeSBzdGFydHNcblx0XHRcdC8vIDggLSBOdW1iZXIgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3JkcyBvbiB0aGlzIGRpc2tcblx0XHRcdC8vIDEwIC0gVG90YWwgbnVtYmVyIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZHNcblx0XHRcdHZhciBlbnRyeUNvdW50ID0gZW9jZHJCdWZmZXIucmVhZFVJbnQxNkxFKDEwKTtcblx0XHRcdC8vIDEyIC0gU2l6ZSBvZiBjZW50cmFsIGRpcmVjdG9yeSAoYnl0ZXMpXG5cdFx0XHQvLyAxNiAtIE9mZnNldCBvZiBzdGFydCBvZiBjZW50cmFsIGRpcmVjdG9yeSwgcmVsYXRpdmUgdG8gc3RhcnQgb2YgYXJjaGl2ZVxuXHRcdFx0dmFyIGNlbnRyYWxEaXJlY3RvcnlPZmZzZXQgPSBlb2NkckJ1ZmZlci5yZWFkVUludDMyTEUoMTYpO1xuXHRcdFx0Ly8gMjAgLSBDb21tZW50IGxlbmd0aFxuXHRcdFx0dmFyIGNvbW1lbnRMZW5ndGggPSBlb2NkckJ1ZmZlci5yZWFkVUludDE2TEUoMjApO1xuXHRcdFx0dmFyIGV4cGVjdGVkQ29tbWVudExlbmd0aCA9IGVvY2RyQnVmZmVyLmxlbmd0aCAtIGVvY2RyV2l0aG91dENvbW1lbnRTaXplO1xuXHRcdFx0aWYgKGNvbW1lbnRMZW5ndGggIT09IGV4cGVjdGVkQ29tbWVudExlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiaW52YWxpZCBjb21tZW50IGxlbmd0aC4gZXhwZWN0ZWQ6IFwiICsgZXhwZWN0ZWRDb21tZW50TGVuZ3RoICsgXCIuIGZvdW5kOiBcIiArIGNvbW1lbnRMZW5ndGgpKTtcblx0XHRcdH1cblx0XHRcdC8vIDIyIC0gQ29tbWVudFxuXHRcdFx0Ly8gdGhlIGVuY29kaW5nIGlzIGFsd2F5cyBjcDQzNy5cblx0XHRcdHZhciBjb21tZW50ID0gZGVjb2RlU3RyaW5ncyA/IGRlY29kZUJ1ZmZlcihlb2NkckJ1ZmZlciwgMjIsIGVvY2RyQnVmZmVyLmxlbmd0aCwgZmFsc2UpXG5cdFx0XHRcdDogZW9jZHJCdWZmZXIuc2xpY2UoMjIpO1xuXG5cdFx0XHRpZiAoIShlbnRyeUNvdW50ID09PSAweGZmZmYgfHwgY2VudHJhbERpcmVjdG9yeU9mZnNldCA9PT0gMHhmZmZmZmZmZikpIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIG5ldyBaaXBGaWxlKHJlYWRlciwgY2VudHJhbERpcmVjdG9yeU9mZnNldCwgdG90YWxTaXplLCBlbnRyeUNvdW50LCBjb21tZW50LCBvcHRpb25zLmF1dG9DbG9zZSwgb3B0aW9ucy5sYXp5RW50cmllcywgZGVjb2RlU3RyaW5ncywgb3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMsIG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzKSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFpJUDY0IGZvcm1hdFxuXG5cdFx0XHQvLyBaSVA2NCBaaXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgbG9jYXRvclxuXHRcdFx0dmFyIHppcDY0RW9jZGxCdWZmZXIgPSBuZXdCdWZmZXIoMjApO1xuXHRcdFx0dmFyIHppcDY0RW9jZGxPZmZzZXQgPSBidWZmZXJSZWFkU3RhcnQgKyBpIC0gemlwNjRFb2NkbEJ1ZmZlci5sZW5ndGg7XG5cdFx0XHRyZWFkQW5kQXNzZXJ0Tm9Fb2YocmVhZGVyLCB6aXA2NEVvY2RsQnVmZmVyLCAwLCB6aXA2NEVvY2RsQnVmZmVyLmxlbmd0aCwgemlwNjRFb2NkbE9mZnNldCwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0XHRpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblxuXHRcdFx0XHQvLyAwIC0gemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyIGxvY2F0b3Igc2lnbmF0dXJlID0gMHgwNzA2NGI1MFxuXHRcdFx0XHRpZiAoemlwNjRFb2NkbEJ1ZmZlci5yZWFkVUludDMyTEUoMCkgIT09IDB4MDcwNjRiNTApIHtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiaW52YWxpZCB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgbG9jYXRvciBzaWduYXR1cmVcIikpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIDQgLSBudW1iZXIgb2YgdGhlIGRpc2sgd2l0aCB0aGUgc3RhcnQgb2YgdGhlIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeVxuXHRcdFx0XHQvLyA4IC0gcmVsYXRpdmUgb2Zmc2V0IG9mIHRoZSB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3JkXG5cdFx0XHRcdHZhciB6aXA2NEVvY2RyT2Zmc2V0ID0gcmVhZFVJbnQ2NExFKHppcDY0RW9jZGxCdWZmZXIsIDgpO1xuXHRcdFx0XHQvLyAxNiAtIHRvdGFsIG51bWJlciBvZiBkaXNrc1xuXG5cdFx0XHRcdC8vIFpJUDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmRcblx0XHRcdFx0dmFyIHppcDY0RW9jZHJCdWZmZXIgPSBuZXdCdWZmZXIoNTYpO1xuXHRcdFx0XHRyZWFkQW5kQXNzZXJ0Tm9Fb2YocmVhZGVyLCB6aXA2NEVvY2RyQnVmZmVyLCAwLCB6aXA2NEVvY2RyQnVmZmVyLmxlbmd0aCwgemlwNjRFb2Nkck9mZnNldCwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0XHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXG5cdFx0XHRcdFx0Ly8gMCAtIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpciBzaWduYXR1cmUgICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzICAoMHgwNjA2NGI1MClcblx0XHRcdFx0XHRpZiAoemlwNjRFb2NkckJ1ZmZlci5yZWFkVUludDMyTEUoMCkgIT09IDB4MDYwNjRiNTApIHtcblx0XHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJpbnZhbGlkIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmQgc2lnbmF0dXJlXCIpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gNCAtIHNpemUgb2YgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZCAgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdFx0XHRcdFx0Ly8gMTIgLSB2ZXJzaW9uIG1hZGUgYnkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdFx0XHRcdFx0Ly8gMTQgLSB2ZXJzaW9uIG5lZWRlZCB0byBleHRyYWN0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdFx0XHRcdFx0Ly8gMTYgLSBudW1iZXIgb2YgdGhpcyBkaXNrICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdFx0XHRcdFx0Ly8gMjAgLSBudW1iZXIgb2YgdGhlIGRpc2sgd2l0aCB0aGUgc3RhcnQgb2YgdGhlIGNlbnRyYWwgZGlyZWN0b3J5ICA0IGJ5dGVzXG5cdFx0XHRcdFx0Ly8gMjQgLSB0b3RhbCBudW1iZXIgb2YgZW50cmllcyBpbiB0aGUgY2VudHJhbCBkaXJlY3Rvcnkgb24gdGhpcyBkaXNrICAgICAgICAgOCBieXRlc1xuXHRcdFx0XHRcdC8vIDMyIC0gdG90YWwgbnVtYmVyIG9mIGVudHJpZXMgaW4gdGhlIGNlbnRyYWwgZGlyZWN0b3J5ICAgICAgICAgICAgOCBieXRlc1xuXHRcdFx0XHRcdGVudHJ5Q291bnQgPSByZWFkVUludDY0TEUoemlwNjRFb2NkckJ1ZmZlciwgMzIpO1xuXHRcdFx0XHRcdC8vIDQwIC0gc2l6ZSBvZiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOCBieXRlc1xuXHRcdFx0XHRcdC8vIDQ4IC0gb2Zmc2V0IG9mIHN0YXJ0IG9mIGNlbnRyYWwgZGlyZWN0b3J5IHdpdGggcmVzcGVjdCB0byB0aGUgc3RhcnRpbmcgZGlzayBudW1iZXIgICAgIDggYnl0ZXNcblx0XHRcdFx0XHRjZW50cmFsRGlyZWN0b3J5T2Zmc2V0ID0gcmVhZFVJbnQ2NExFKHppcDY0RW9jZHJCdWZmZXIsIDQ4KTtcblx0XHRcdFx0XHQvLyA1NiAtIHppcDY0IGV4dGVuc2libGUgZGF0YSBzZWN0b3IgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh2YXJpYWJsZSBzaXplKVxuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCBuZXcgWmlwRmlsZShyZWFkZXIsIGNlbnRyYWxEaXJlY3RvcnlPZmZzZXQsIHRvdGFsU2l6ZSwgZW50cnlDb3VudCwgY29tbWVudCwgb3B0aW9ucy5hdXRvQ2xvc2UsIG9wdGlvbnMubGF6eUVudHJpZXMsIGRlY29kZVN0cmluZ3MsIG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzLCBvcHRpb25zLnN0cmljdEZpbGVOYW1lcykpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjYWxsYmFjayhuZXcgRXJyb3IoXCJlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3JkIHNpZ25hdHVyZSBub3QgZm91bmRcIikpO1xuXHR9KTtcbn1cblxudXRpbC5pbmhlcml0cyhaaXBGaWxlLCBFdmVudEVtaXR0ZXIpO1xuXG5mdW5jdGlvbiBaaXBGaWxlKHJlYWRlciwgY2VudHJhbERpcmVjdG9yeU9mZnNldCwgZmlsZVNpemUsIGVudHJ5Q291bnQsIGNvbW1lbnQsIGF1dG9DbG9zZSwgbGF6eUVudHJpZXMsIGRlY29kZVN0cmluZ3MsIHZhbGlkYXRlRW50cnlTaXplcywgc3RyaWN0RmlsZU5hbWVzKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0RXZlbnRFbWl0dGVyLmNhbGwoc2VsZik7XG5cdHNlbGYucmVhZGVyID0gcmVhZGVyO1xuXHQvLyBmb3J3YXJkIGNsb3NlIGV2ZW50c1xuXHRzZWxmLnJlYWRlci5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHQvLyBlcnJvciBjbG9zaW5nIHRoZSBmZFxuXHRcdGVtaXRFcnJvcihzZWxmLCBlcnIpO1xuXHR9KTtcblx0c2VsZi5yZWFkZXIub25jZShcImNsb3NlXCIsIGZ1bmN0aW9uICgpIHtcblx0XHRzZWxmLmVtaXQoXCJjbG9zZVwiKTtcblx0fSk7XG5cdHNlbGYucmVhZEVudHJ5Q3Vyc29yID0gY2VudHJhbERpcmVjdG9yeU9mZnNldDtcblx0c2VsZi5maWxlU2l6ZSA9IGZpbGVTaXplO1xuXHRzZWxmLmVudHJ5Q291bnQgPSBlbnRyeUNvdW50O1xuXHRzZWxmLmNvbW1lbnQgPSBjb21tZW50O1xuXHRzZWxmLmVudHJpZXNSZWFkID0gMDtcblx0c2VsZi5hdXRvQ2xvc2UgPSAhIWF1dG9DbG9zZTtcblx0c2VsZi5sYXp5RW50cmllcyA9ICEhbGF6eUVudHJpZXM7XG5cdHNlbGYuZGVjb2RlU3RyaW5ncyA9ICEhZGVjb2RlU3RyaW5ncztcblx0c2VsZi52YWxpZGF0ZUVudHJ5U2l6ZXMgPSAhIXZhbGlkYXRlRW50cnlTaXplcztcblx0c2VsZi5zdHJpY3RGaWxlTmFtZXMgPSAhIXN0cmljdEZpbGVOYW1lcztcblx0c2VsZi5pc09wZW4gPSB0cnVlO1xuXHRzZWxmLmVtaXR0ZWRFcnJvciA9IGZhbHNlO1xuXG5cdGlmICghc2VsZi5sYXp5RW50cmllcykgc2VsZi5fcmVhZEVudHJ5KCk7XG59XG5cblppcEZpbGUucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xuXHRpZiAoIXRoaXMuaXNPcGVuKSByZXR1cm47XG5cdHRoaXMuaXNPcGVuID0gZmFsc2U7XG5cdHRoaXMucmVhZGVyLnVucmVmKCk7XG59O1xuXG5mdW5jdGlvbiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgZXJyKSB7XG5cdGlmIChzZWxmLmF1dG9DbG9zZSkgc2VsZi5jbG9zZSgpO1xuXHRlbWl0RXJyb3Ioc2VsZiwgZXJyKTtcbn1cblxuZnVuY3Rpb24gZW1pdEVycm9yKHNlbGYsIGVycikge1xuXHRpZiAoc2VsZi5lbWl0dGVkRXJyb3IpIHJldHVybjtcblx0c2VsZi5lbWl0dGVkRXJyb3IgPSB0cnVlO1xuXHRzZWxmLmVtaXQoXCJlcnJvclwiLCBlcnIpO1xufVxuXG5aaXBGaWxlLnByb3RvdHlwZS5yZWFkRW50cnkgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICghdGhpcy5sYXp5RW50cmllcykgdGhyb3cgbmV3IEVycm9yKFwicmVhZEVudHJ5KCkgY2FsbGVkIHdpdGhvdXQgbGF6eUVudHJpZXM6dHJ1ZVwiKTtcblx0dGhpcy5fcmVhZEVudHJ5KCk7XG59O1xuWmlwRmlsZS5wcm90b3R5cGUuX3JlYWRFbnRyeSA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRpZiAoc2VsZi5lbnRyeUNvdW50ID09PSBzZWxmLmVudHJpZXNSZWFkKSB7XG5cdFx0Ly8gZG9uZSB3aXRoIG1ldGFkYXRhXG5cdFx0c2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmIChzZWxmLmF1dG9DbG9zZSkgc2VsZi5jbG9zZSgpO1xuXHRcdFx0aWYgKHNlbGYuZW1pdHRlZEVycm9yKSByZXR1cm47XG5cdFx0XHRzZWxmLmVtaXQoXCJlbmRcIik7XG5cdFx0fSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGlmIChzZWxmLmVtaXR0ZWRFcnJvcikgcmV0dXJuO1xuXHR2YXIgYnVmZmVyID0gbmV3QnVmZmVyKDQ2KTtcblx0cmVhZEFuZEFzc2VydE5vRW9mKHNlbGYucmVhZGVyLCBidWZmZXIsIDAsIGJ1ZmZlci5sZW5ndGgsIHNlbGYucmVhZEVudHJ5Q3Vyc29yLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0aWYgKGVycikgcmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBlcnIpO1xuXHRcdGlmIChzZWxmLmVtaXR0ZWRFcnJvcikgcmV0dXJuO1xuXHRcdHZhciBlbnRyeSA9IG5ldyBFbnRyeSgpO1xuXHRcdC8vIDAgLSBDZW50cmFsIGRpcmVjdG9yeSBmaWxlIGhlYWRlciBzaWduYXR1cmVcblx0XHR2YXIgc2lnbmF0dXJlID0gYnVmZmVyLnJlYWRVSW50MzJMRSgwKTtcblx0XHRpZiAoc2lnbmF0dXJlICE9PSAweDAyMDE0YjUwKSByZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihcImludmFsaWQgY2VudHJhbCBkaXJlY3RvcnkgZmlsZSBoZWFkZXIgc2lnbmF0dXJlOiAweFwiICsgc2lnbmF0dXJlLnRvU3RyaW5nKDE2KSkpO1xuXHRcdC8vIDQgLSBWZXJzaW9uIG1hZGUgYnlcblx0XHRlbnRyeS52ZXJzaW9uTWFkZUJ5ID0gYnVmZmVyLnJlYWRVSW50MTZMRSg0KTtcblx0XHQvLyA2IC0gVmVyc2lvbiBuZWVkZWQgdG8gZXh0cmFjdCAobWluaW11bSlcblx0XHRlbnRyeS52ZXJzaW9uTmVlZGVkVG9FeHRyYWN0ID0gYnVmZmVyLnJlYWRVSW50MTZMRSg2KTtcblx0XHQvLyA4IC0gR2VuZXJhbCBwdXJwb3NlIGJpdCBmbGFnXG5cdFx0ZW50cnkuZ2VuZXJhbFB1cnBvc2VCaXRGbGFnID0gYnVmZmVyLnJlYWRVSW50MTZMRSg4KTtcblx0XHQvLyAxMCAtIENvbXByZXNzaW9uIG1ldGhvZFxuXHRcdGVudHJ5LmNvbXByZXNzaW9uTWV0aG9kID0gYnVmZmVyLnJlYWRVSW50MTZMRSgxMCk7XG5cdFx0Ly8gMTIgLSBGaWxlIGxhc3QgbW9kaWZpY2F0aW9uIHRpbWVcblx0XHRlbnRyeS5sYXN0TW9kRmlsZVRpbWUgPSBidWZmZXIucmVhZFVJbnQxNkxFKDEyKTtcblx0XHQvLyAxNCAtIEZpbGUgbGFzdCBtb2RpZmljYXRpb24gZGF0ZVxuXHRcdGVudHJ5Lmxhc3RNb2RGaWxlRGF0ZSA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMTQpO1xuXHRcdC8vIDE2IC0gQ1JDLTMyXG5cdFx0ZW50cnkuY3JjMzIgPSBidWZmZXIucmVhZFVJbnQzMkxFKDE2KTtcblx0XHQvLyAyMCAtIENvbXByZXNzZWQgc2l6ZVxuXHRcdGVudHJ5LmNvbXByZXNzZWRTaXplID0gYnVmZmVyLnJlYWRVSW50MzJMRSgyMCk7XG5cdFx0Ly8gMjQgLSBVbmNvbXByZXNzZWQgc2l6ZVxuXHRcdGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPSBidWZmZXIucmVhZFVJbnQzMkxFKDI0KTtcblx0XHQvLyAyOCAtIEZpbGUgbmFtZSBsZW5ndGggKG4pXG5cdFx0ZW50cnkuZmlsZU5hbWVMZW5ndGggPSBidWZmZXIucmVhZFVJbnQxNkxFKDI4KTtcblx0XHQvLyAzMCAtIEV4dHJhIGZpZWxkIGxlbmd0aCAobSlcblx0XHRlbnRyeS5leHRyYUZpZWxkTGVuZ3RoID0gYnVmZmVyLnJlYWRVSW50MTZMRSgzMCk7XG5cdFx0Ly8gMzIgLSBGaWxlIGNvbW1lbnQgbGVuZ3RoIChrKVxuXHRcdGVudHJ5LmZpbGVDb21tZW50TGVuZ3RoID0gYnVmZmVyLnJlYWRVSW50MTZMRSgzMik7XG5cdFx0Ly8gMzQgLSBEaXNrIG51bWJlciB3aGVyZSBmaWxlIHN0YXJ0c1xuXHRcdC8vIDM2IC0gSW50ZXJuYWwgZmlsZSBhdHRyaWJ1dGVzXG5cdFx0ZW50cnkuaW50ZXJuYWxGaWxlQXR0cmlidXRlcyA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMzYpO1xuXHRcdC8vIDM4IC0gRXh0ZXJuYWwgZmlsZSBhdHRyaWJ1dGVzXG5cdFx0ZW50cnkuZXh0ZXJuYWxGaWxlQXR0cmlidXRlcyA9IGJ1ZmZlci5yZWFkVUludDMyTEUoMzgpO1xuXHRcdC8vIDQyIC0gUmVsYXRpdmUgb2Zmc2V0IG9mIGxvY2FsIGZpbGUgaGVhZGVyXG5cdFx0ZW50cnkucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID0gYnVmZmVyLnJlYWRVSW50MzJMRSg0Mik7XG5cblx0XHRpZiAoZW50cnkuZ2VuZXJhbFB1cnBvc2VCaXRGbGFnICYgMHg0MCkgcmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IoXCJzdHJvbmcgZW5jcnlwdGlvbiBpcyBub3Qgc3VwcG9ydGVkXCIpKTtcblxuXHRcdHNlbGYucmVhZEVudHJ5Q3Vyc29yICs9IDQ2O1xuXG5cdFx0YnVmZmVyID0gbmV3QnVmZmVyKGVudHJ5LmZpbGVOYW1lTGVuZ3RoICsgZW50cnkuZXh0cmFGaWVsZExlbmd0aCArIGVudHJ5LmZpbGVDb21tZW50TGVuZ3RoKTtcblx0XHRyZWFkQW5kQXNzZXJ0Tm9Fb2Yoc2VsZi5yZWFkZXIsIGJ1ZmZlciwgMCwgYnVmZmVyLmxlbmd0aCwgc2VsZi5yZWFkRW50cnlDdXJzb3IsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRcdGlmIChlcnIpIHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgZXJyKTtcblx0XHRcdGlmIChzZWxmLmVtaXR0ZWRFcnJvcikgcmV0dXJuO1xuXHRcdFx0Ly8gNDYgLSBGaWxlIG5hbWVcblx0XHRcdHZhciBpc1V0ZjggPSAoZW50cnkuZ2VuZXJhbFB1cnBvc2VCaXRGbGFnICYgMHg4MDApICE9PSAwO1xuXHRcdFx0ZW50cnkuZmlsZU5hbWUgPSBzZWxmLmRlY29kZVN0cmluZ3MgPyBkZWNvZGVCdWZmZXIoYnVmZmVyLCAwLCBlbnRyeS5maWxlTmFtZUxlbmd0aCwgaXNVdGY4KVxuXHRcdFx0XHQ6IGJ1ZmZlci5zbGljZSgwLCBlbnRyeS5maWxlTmFtZUxlbmd0aCk7XG5cblx0XHRcdC8vIDQ2K24gLSBFeHRyYSBmaWVsZFxuXHRcdFx0dmFyIGZpbGVDb21tZW50U3RhcnQgPSBlbnRyeS5maWxlTmFtZUxlbmd0aCArIGVudHJ5LmV4dHJhRmllbGRMZW5ndGg7XG5cdFx0XHR2YXIgZXh0cmFGaWVsZEJ1ZmZlciA9IGJ1ZmZlci5zbGljZShlbnRyeS5maWxlTmFtZUxlbmd0aCwgZmlsZUNvbW1lbnRTdGFydCk7XG5cdFx0XHRlbnRyeS5leHRyYUZpZWxkcyA9IFtdO1xuXHRcdFx0dmFyIGkgPSAwO1xuXHRcdFx0d2hpbGUgKGkgPCBleHRyYUZpZWxkQnVmZmVyLmxlbmd0aCAtIDMpIHtcblx0XHRcdFx0dmFyIGhlYWRlcklkID0gZXh0cmFGaWVsZEJ1ZmZlci5yZWFkVUludDE2TEUoaSArIDApO1xuXHRcdFx0XHR2YXIgZGF0YVNpemUgPSBleHRyYUZpZWxkQnVmZmVyLnJlYWRVSW50MTZMRShpICsgMik7XG5cdFx0XHRcdHZhciBkYXRhU3RhcnQgPSBpICsgNDtcblx0XHRcdFx0dmFyIGRhdGFFbmQgPSBkYXRhU3RhcnQgKyBkYXRhU2l6ZTtcblx0XHRcdFx0aWYgKGRhdGFFbmQgPiBleHRyYUZpZWxkQnVmZmVyLmxlbmd0aCkgcmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IoXCJleHRyYSBmaWVsZCBsZW5ndGggZXhjZWVkcyBleHRyYSBmaWVsZCBidWZmZXIgc2l6ZVwiKSk7XG5cdFx0XHRcdHZhciBkYXRhQnVmZmVyID0gbmV3QnVmZmVyKGRhdGFTaXplKTtcblx0XHRcdFx0ZXh0cmFGaWVsZEJ1ZmZlci5jb3B5KGRhdGFCdWZmZXIsIDAsIGRhdGFTdGFydCwgZGF0YUVuZCk7XG5cdFx0XHRcdGVudHJ5LmV4dHJhRmllbGRzLnB1c2goe1xuXHRcdFx0XHRcdGlkOiBoZWFkZXJJZCxcblx0XHRcdFx0XHRkYXRhOiBkYXRhQnVmZmVyLFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0aSA9IGRhdGFFbmQ7XG5cdFx0XHR9XG5cblx0XHRcdC8vIDQ2K24rbSAtIEZpbGUgY29tbWVudFxuXHRcdFx0ZW50cnkuZmlsZUNvbW1lbnQgPSBzZWxmLmRlY29kZVN0cmluZ3MgPyBkZWNvZGVCdWZmZXIoYnVmZmVyLCBmaWxlQ29tbWVudFN0YXJ0LCBmaWxlQ29tbWVudFN0YXJ0ICsgZW50cnkuZmlsZUNvbW1lbnRMZW5ndGgsIGlzVXRmOClcblx0XHRcdFx0OiBidWZmZXIuc2xpY2UoZmlsZUNvbW1lbnRTdGFydCwgZmlsZUNvbW1lbnRTdGFydCArIGVudHJ5LmZpbGVDb21tZW50TGVuZ3RoKTtcblx0XHRcdC8vIGNvbXBhdGliaWxpdHkgaGFjayBmb3IgaHR0cHM6Ly9naXRodWIuY29tL3RoZWpvc2h3b2xmZS95YXV6bC9pc3N1ZXMvNDdcblx0XHRcdGVudHJ5LmNvbW1lbnQgPSBlbnRyeS5maWxlQ29tbWVudDtcblxuXHRcdFx0c2VsZi5yZWFkRW50cnlDdXJzb3IgKz0gYnVmZmVyLmxlbmd0aDtcblx0XHRcdHNlbGYuZW50cmllc1JlYWQgKz0gMTtcblxuXHRcdFx0aWYgKGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPT09IDB4ZmZmZmZmZmYgfHxcblx0XHRcdFx0ZW50cnkuY29tcHJlc3NlZFNpemUgPT09IDB4ZmZmZmZmZmYgfHxcblx0XHRcdFx0ZW50cnkucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID09PSAweGZmZmZmZmZmKSB7XG5cdFx0XHRcdC8vIFpJUDY0IGZvcm1hdFxuXHRcdFx0XHQvLyBmaW5kIHRoZSBaaXA2NCBFeHRlbmRlZCBJbmZvcm1hdGlvbiBFeHRyYSBGaWVsZFxuXHRcdFx0XHR2YXIgemlwNjRFaWVmQnVmZmVyID0gbnVsbDtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbnRyeS5leHRyYUZpZWxkcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdHZhciBleHRyYUZpZWxkID0gZW50cnkuZXh0cmFGaWVsZHNbaV07XG5cdFx0XHRcdFx0aWYgKGV4dHJhRmllbGQuaWQgPT09IDB4MDAwMSkge1xuXHRcdFx0XHRcdFx0emlwNjRFaWVmQnVmZmVyID0gZXh0cmFGaWVsZC5kYXRhO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh6aXA2NEVpZWZCdWZmZXIgPT0gbnVsbCkge1xuXHRcdFx0XHRcdHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKFwiZXhwZWN0ZWQgemlwNjQgZXh0ZW5kZWQgaW5mb3JtYXRpb24gZXh0cmEgZmllbGRcIikpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBpbmRleCA9IDA7XG5cdFx0XHRcdC8vIDAgLSBPcmlnaW5hbCBTaXplICAgICAgICAgIDggYnl0ZXNcblx0XHRcdFx0aWYgKGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPT09IDB4ZmZmZmZmZmYpIHtcblx0XHRcdFx0XHRpZiAoaW5kZXggKyA4ID4gemlwNjRFaWVmQnVmZmVyLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IoXCJ6aXA2NCBleHRlbmRlZCBpbmZvcm1hdGlvbiBleHRyYSBmaWVsZCBkb2VzIG5vdCBpbmNsdWRlIHVuY29tcHJlc3NlZCBzaXplXCIpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9IHJlYWRVSW50NjRMRSh6aXA2NEVpZWZCdWZmZXIsIGluZGV4KTtcblx0XHRcdFx0XHRpbmRleCArPSA4O1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIDggLSBDb21wcmVzc2VkIFNpemUgICAgICAgIDggYnl0ZXNcblx0XHRcdFx0aWYgKGVudHJ5LmNvbXByZXNzZWRTaXplID09PSAweGZmZmZmZmZmKSB7XG5cdFx0XHRcdFx0aWYgKGluZGV4ICsgOCA+IHppcDY0RWllZkJ1ZmZlci5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKFwiemlwNjQgZXh0ZW5kZWQgaW5mb3JtYXRpb24gZXh0cmEgZmllbGQgZG9lcyBub3QgaW5jbHVkZSBjb21wcmVzc2VkIHNpemVcIikpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbnRyeS5jb21wcmVzc2VkU2l6ZSA9IHJlYWRVSW50NjRMRSh6aXA2NEVpZWZCdWZmZXIsIGluZGV4KTtcblx0XHRcdFx0XHRpbmRleCArPSA4O1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIDE2IC0gUmVsYXRpdmUgSGVhZGVyIE9mZnNldCA4IGJ5dGVzXG5cdFx0XHRcdGlmIChlbnRyeS5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgPT09IDB4ZmZmZmZmZmYpIHtcblx0XHRcdFx0XHRpZiAoaW5kZXggKyA4ID4gemlwNjRFaWVmQnVmZmVyLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IoXCJ6aXA2NCBleHRlbmRlZCBpbmZvcm1hdGlvbiBleHRyYSBmaWVsZCBkb2VzIG5vdCBpbmNsdWRlIHJlbGF0aXZlIGhlYWRlciBvZmZzZXRcIikpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbnRyeS5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgPSByZWFkVUludDY0TEUoemlwNjRFaWVmQnVmZmVyLCBpbmRleCk7XG5cdFx0XHRcdFx0aW5kZXggKz0gODtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyAyNCAtIERpc2sgU3RhcnQgTnVtYmVyICAgICAgNCBieXRlc1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBjaGVjayBmb3IgSW5mby1aSVAgVW5pY29kZSBQYXRoIEV4dHJhIEZpZWxkICgweDcwNzUpXG5cdFx0XHQvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3RoZWpvc2h3b2xmZS95YXV6bC9pc3N1ZXMvMzNcblx0XHRcdGlmIChzZWxmLmRlY29kZVN0cmluZ3MpIHtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbnRyeS5leHRyYUZpZWxkcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdHZhciBleHRyYUZpZWxkID0gZW50cnkuZXh0cmFGaWVsZHNbaV07XG5cdFx0XHRcdFx0aWYgKGV4dHJhRmllbGQuaWQgPT09IDB4NzA3NSkge1xuXHRcdFx0XHRcdFx0aWYgKGV4dHJhRmllbGQuZGF0YS5sZW5ndGggPCA2KSB7XG5cdFx0XHRcdFx0XHRcdC8vIHRvbyBzaG9ydCB0byBiZSBtZWFuaW5nZnVsXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly8gVmVyc2lvbiAgICAgICAxIGJ5dGUgICAgICB2ZXJzaW9uIG9mIHRoaXMgZXh0cmEgZmllbGQsIGN1cnJlbnRseSAxXG5cdFx0XHRcdFx0XHRpZiAoZXh0cmFGaWVsZC5kYXRhLnJlYWRVSW50OCgwKSAhPT0gMSkge1xuXHRcdFx0XHRcdFx0XHQvLyA+IENoYW5nZXMgbWF5IG5vdCBiZSBiYWNrd2FyZCBjb21wYXRpYmxlIHNvIHRoaXMgZXh0cmFcblx0XHRcdFx0XHRcdFx0Ly8gPiBmaWVsZCBzaG91bGQgbm90IGJlIHVzZWQgaWYgdGhlIHZlcnNpb24gaXMgbm90IHJlY29nbml6ZWQuXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly8gTmFtZUNSQzMyICAgICA0IGJ5dGVzICAgICBGaWxlIE5hbWUgRmllbGQgQ1JDMzIgQ2hlY2tzdW1cblx0XHRcdFx0XHRcdHZhciBvbGROYW1lQ3JjMzIgPSBleHRyYUZpZWxkLmRhdGEucmVhZFVJbnQzMkxFKDEpO1xuXHRcdFx0XHRcdFx0aWYgKGNyYzMyLnVuc2lnbmVkKGJ1ZmZlci5zbGljZSgwLCBlbnRyeS5maWxlTmFtZUxlbmd0aCkpICE9PSBvbGROYW1lQ3JjMzIpIHtcblx0XHRcdFx0XHRcdFx0Ly8gPiBJZiB0aGUgQ1JDIGNoZWNrIGZhaWxzLCB0aGlzIFVURi04IFBhdGggRXh0cmEgRmllbGQgc2hvdWxkIGJlXG5cdFx0XHRcdFx0XHRcdC8vID4gaWdub3JlZCBhbmQgdGhlIEZpbGUgTmFtZSBmaWVsZCBpbiB0aGUgaGVhZGVyIHNob3VsZCBiZSB1c2VkIGluc3RlYWQuXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly8gVW5pY29kZU5hbWUgICBWYXJpYWJsZSAgICBVVEYtOCB2ZXJzaW9uIG9mIHRoZSBlbnRyeSBGaWxlIE5hbWVcblx0XHRcdFx0XHRcdGVudHJ5LmZpbGVOYW1lID0gZGVjb2RlQnVmZmVyKGV4dHJhRmllbGQuZGF0YSwgNSwgZXh0cmFGaWVsZC5kYXRhLmxlbmd0aCwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gdmFsaWRhdGUgZmlsZSBzaXplXG5cdFx0XHRpZiAoc2VsZi52YWxpZGF0ZUVudHJ5U2l6ZXMgJiYgZW50cnkuY29tcHJlc3Npb25NZXRob2QgPT09IDApIHtcblx0XHRcdFx0dmFyIGV4cGVjdGVkQ29tcHJlc3NlZFNpemUgPSBlbnRyeS51bmNvbXByZXNzZWRTaXplO1xuXHRcdFx0XHRpZiAoZW50cnkuaXNFbmNyeXB0ZWQoKSkge1xuXHRcdFx0XHRcdC8vIHRyYWRpdGlvbmFsIGVuY3J5cHRpb24gcHJlZml4ZXMgdGhlIGZpbGUgZGF0YSB3aXRoIGEgaGVhZGVyXG5cdFx0XHRcdFx0ZXhwZWN0ZWRDb21wcmVzc2VkU2l6ZSArPSAxMjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZW50cnkuY29tcHJlc3NlZFNpemUgIT09IGV4cGVjdGVkQ29tcHJlc3NlZFNpemUpIHtcblx0XHRcdFx0XHR2YXIgbXNnID0gXCJjb21wcmVzc2VkL3VuY29tcHJlc3NlZCBzaXplIG1pc21hdGNoIGZvciBzdG9yZWQgZmlsZTogXCIgKyBlbnRyeS5jb21wcmVzc2VkU2l6ZSArIFwiICE9IFwiICsgZW50cnkudW5jb21wcmVzc2VkU2l6ZTtcblx0XHRcdFx0XHRyZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihtc2cpKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoc2VsZi5kZWNvZGVTdHJpbmdzKSB7XG5cdFx0XHRcdGlmICghc2VsZi5zdHJpY3RGaWxlTmFtZXMpIHtcblx0XHRcdFx0XHQvLyBhbGxvdyBiYWNrc2xhc2hcblx0XHRcdFx0XHRlbnRyeS5maWxlTmFtZSA9IGVudHJ5LmZpbGVOYW1lLnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBlcnJvck1lc3NhZ2UgPSB2YWxpZGF0ZUZpbGVOYW1lKGVudHJ5LmZpbGVOYW1lLCBzZWxmLnZhbGlkYXRlRmlsZU5hbWVPcHRpb25zKTtcblx0XHRcdFx0aWYgKGVycm9yTWVzc2FnZSAhPSBudWxsKSByZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihlcnJvck1lc3NhZ2UpKTtcblx0XHRcdH1cblx0XHRcdHNlbGYuZW1pdChcImVudHJ5XCIsIGVudHJ5KTtcblxuXHRcdFx0aWYgKCFzZWxmLmxhenlFbnRyaWVzKSBzZWxmLl9yZWFkRW50cnkoKTtcblx0XHR9KTtcblx0fSk7XG59O1xuXG5aaXBGaWxlLnByb3RvdHlwZS5vcGVuUmVhZFN0cmVhbSA9IGZ1bmN0aW9uIChlbnRyeSwgb3B0aW9ucywgY2FsbGJhY2spIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHQvLyBwYXJhbWV0ZXIgdmFsaWRhdGlvblxuXHR2YXIgcmVsYXRpdmVTdGFydCA9IDA7XG5cdHZhciByZWxhdGl2ZUVuZCA9IGVudHJ5LmNvbXByZXNzZWRTaXplO1xuXHRpZiAoY2FsbGJhY2sgPT0gbnVsbCkge1xuXHRcdGNhbGxiYWNrID0gb3B0aW9ucztcblx0XHRvcHRpb25zID0ge307XG5cdH0gZWxzZSB7XG5cdFx0Ly8gdmFsaWRhdGUgb3B0aW9ucyB0aGF0IHRoZSBjYWxsZXIgaGFzIG5vIGV4Y3VzZSB0byBnZXQgd3Jvbmdcblx0XHRpZiAob3B0aW9ucy5kZWNyeXB0ICE9IG51bGwpIHtcblx0XHRcdGlmICghZW50cnkuaXNFbmNyeXB0ZWQoKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLmRlY3J5cHQgY2FuIG9ubHkgYmUgc3BlY2lmaWVkIGZvciBlbmNyeXB0ZWQgZW50cmllc1wiKTtcblx0XHRcdH1cblx0XHRcdGlmIChvcHRpb25zLmRlY3J5cHQgIT09IGZhbHNlKSB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIG9wdGlvbnMuZGVjcnlwdCB2YWx1ZTogXCIgKyBvcHRpb25zLmRlY3J5cHQpO1xuXHRcdFx0aWYgKGVudHJ5LmlzQ29tcHJlc3NlZCgpKSB7XG5cdFx0XHRcdGlmIChvcHRpb25zLmRlY29tcHJlc3MgIT09IGZhbHNlKSB0aHJvdyBuZXcgRXJyb3IoXCJlbnRyeSBpcyBlbmNyeXB0ZWQgYW5kIGNvbXByZXNzZWQsIGFuZCBvcHRpb25zLmRlY29tcHJlc3MgIT09IGZhbHNlXCIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAob3B0aW9ucy5kZWNvbXByZXNzICE9IG51bGwpIHtcblx0XHRcdGlmICghZW50cnkuaXNDb21wcmVzc2VkKCkpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5kZWNvbXByZXNzIGNhbiBvbmx5IGJlIHNwZWNpZmllZCBmb3IgY29tcHJlc3NlZCBlbnRyaWVzXCIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCEob3B0aW9ucy5kZWNvbXByZXNzID09PSBmYWxzZSB8fCBvcHRpb25zLmRlY29tcHJlc3MgPT09IHRydWUpKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcImludmFsaWQgb3B0aW9ucy5kZWNvbXByZXNzIHZhbHVlOiBcIiArIG9wdGlvbnMuZGVjb21wcmVzcyk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChvcHRpb25zLnN0YXJ0ICE9IG51bGwgfHwgb3B0aW9ucy5lbmQgIT0gbnVsbCkge1xuXHRcdFx0aWYgKGVudHJ5LmlzQ29tcHJlc3NlZCgpICYmIG9wdGlvbnMuZGVjb21wcmVzcyAhPT0gZmFsc2UpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwic3RhcnQvZW5kIHJhbmdlIG5vdCBhbGxvd2VkIGZvciBjb21wcmVzc2VkIGVudHJ5IHdpdGhvdXQgb3B0aW9ucy5kZWNvbXByZXNzID09PSBmYWxzZVwiKTtcblx0XHRcdH1cblx0XHRcdGlmIChlbnRyeS5pc0VuY3J5cHRlZCgpICYmIG9wdGlvbnMuZGVjcnlwdCAhPT0gZmFsc2UpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwic3RhcnQvZW5kIHJhbmdlIG5vdCBhbGxvd2VkIGZvciBlbmNyeXB0ZWQgZW50cnkgd2l0aG91dCBvcHRpb25zLmRlY3J5cHQgPT09IGZhbHNlXCIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAob3B0aW9ucy5zdGFydCAhPSBudWxsKSB7XG5cdFx0XHRyZWxhdGl2ZVN0YXJ0ID0gb3B0aW9ucy5zdGFydDtcblx0XHRcdGlmIChyZWxhdGl2ZVN0YXJ0IDwgMCkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5zdGFydCA8IDBcIik7XG5cdFx0XHRpZiAocmVsYXRpdmVTdGFydCA+IGVudHJ5LmNvbXByZXNzZWRTaXplKSB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLnN0YXJ0ID4gZW50cnkuY29tcHJlc3NlZFNpemVcIik7XG5cdFx0fVxuXHRcdGlmIChvcHRpb25zLmVuZCAhPSBudWxsKSB7XG5cdFx0XHRyZWxhdGl2ZUVuZCA9IG9wdGlvbnMuZW5kO1xuXHRcdFx0aWYgKHJlbGF0aXZlRW5kIDwgMCkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5lbmQgPCAwXCIpO1xuXHRcdFx0aWYgKHJlbGF0aXZlRW5kID4gZW50cnkuY29tcHJlc3NlZFNpemUpIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuZW5kID4gZW50cnkuY29tcHJlc3NlZFNpemVcIik7XG5cdFx0XHRpZiAocmVsYXRpdmVFbmQgPCByZWxhdGl2ZVN0YXJ0KSB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLmVuZCA8IG9wdGlvbnMuc3RhcnRcIik7XG5cdFx0fVxuXHR9XG5cdC8vIGFueSBmdXJ0aGVyIGVycm9ycyBjYW4gZWl0aGVyIGJlIGNhdXNlZCBieSB0aGUgemlwZmlsZSxcblx0Ly8gb3Igd2VyZSBpbnRyb2R1Y2VkIGluIGEgbWlub3IgdmVyc2lvbiBvZiB5YXV6bCxcblx0Ly8gc28gc2hvdWxkIGJlIHBhc3NlZCB0byB0aGUgY2xpZW50IHJhdGhlciB0aGFuIHRocm93bi5cblx0aWYgKCFzZWxmLmlzT3BlbikgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImNsb3NlZFwiKSk7XG5cdGlmIChlbnRyeS5pc0VuY3J5cHRlZCgpKSB7XG5cdFx0aWYgKG9wdGlvbnMuZGVjcnlwdCAhPT0gZmFsc2UpIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJlbnRyeSBpcyBlbmNyeXB0ZWQsIGFuZCBvcHRpb25zLmRlY3J5cHQgIT09IGZhbHNlXCIpKTtcblx0fVxuXHQvLyBtYWtlIHN1cmUgd2UgZG9uJ3QgbG9zZSB0aGUgZmQgYmVmb3JlIHdlIG9wZW4gdGhlIGFjdHVhbCByZWFkIHN0cmVhbVxuXHRzZWxmLnJlYWRlci5yZWYoKTtcblx0dmFyIGJ1ZmZlciA9IG5ld0J1ZmZlcigzMCk7XG5cdHJlYWRBbmRBc3NlcnROb0VvZihzZWxmLnJlYWRlciwgYnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoLCBlbnRyeS5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHR0cnkge1xuXHRcdFx0aWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHQvLyAwIC0gTG9jYWwgZmlsZSBoZWFkZXIgc2lnbmF0dXJlID0gMHgwNDAzNGI1MFxuXHRcdFx0dmFyIHNpZ25hdHVyZSA9IGJ1ZmZlci5yZWFkVUludDMyTEUoMCk7XG5cdFx0XHRpZiAoc2lnbmF0dXJlICE9PSAweDA0MDM0YjUwKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJpbnZhbGlkIGxvY2FsIGZpbGUgaGVhZGVyIHNpZ25hdHVyZTogMHhcIiArIHNpZ25hdHVyZS50b1N0cmluZygxNikpKTtcblx0XHRcdH1cblx0XHRcdC8vIGFsbCB0aGlzIHNob3VsZCBiZSByZWR1bmRhbnRcblx0XHRcdC8vIDQgLSBWZXJzaW9uIG5lZWRlZCB0byBleHRyYWN0IChtaW5pbXVtKVxuXHRcdFx0Ly8gNiAtIEdlbmVyYWwgcHVycG9zZSBiaXQgZmxhZ1xuXHRcdFx0Ly8gOCAtIENvbXByZXNzaW9uIG1ldGhvZFxuXHRcdFx0Ly8gMTAgLSBGaWxlIGxhc3QgbW9kaWZpY2F0aW9uIHRpbWVcblx0XHRcdC8vIDEyIC0gRmlsZSBsYXN0IG1vZGlmaWNhdGlvbiBkYXRlXG5cdFx0XHQvLyAxNCAtIENSQy0zMlxuXHRcdFx0Ly8gMTggLSBDb21wcmVzc2VkIHNpemVcblx0XHRcdC8vIDIyIC0gVW5jb21wcmVzc2VkIHNpemVcblx0XHRcdC8vIDI2IC0gRmlsZSBuYW1lIGxlbmd0aCAobilcblx0XHRcdHZhciBmaWxlTmFtZUxlbmd0aCA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMjYpO1xuXHRcdFx0Ly8gMjggLSBFeHRyYSBmaWVsZCBsZW5ndGggKG0pXG5cdFx0XHR2YXIgZXh0cmFGaWVsZExlbmd0aCA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMjgpO1xuXHRcdFx0Ly8gMzAgLSBGaWxlIG5hbWVcblx0XHRcdC8vIDMwK24gLSBFeHRyYSBmaWVsZFxuXHRcdFx0dmFyIGxvY2FsRmlsZUhlYWRlckVuZCA9IGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciArIGJ1ZmZlci5sZW5ndGggKyBmaWxlTmFtZUxlbmd0aCArIGV4dHJhRmllbGRMZW5ndGg7XG5cdFx0XHR2YXIgZGVjb21wcmVzcztcblx0XHRcdGlmIChlbnRyeS5jb21wcmVzc2lvbk1ldGhvZCA9PT0gMCkge1xuXHRcdFx0XHQvLyAwIC0gVGhlIGZpbGUgaXMgc3RvcmVkIChubyBjb21wcmVzc2lvbilcblx0XHRcdFx0ZGVjb21wcmVzcyA9IGZhbHNlO1xuXHRcdFx0fSBlbHNlIGlmIChlbnRyeS5jb21wcmVzc2lvbk1ldGhvZCA9PT0gOCkge1xuXHRcdFx0XHQvLyA4IC0gVGhlIGZpbGUgaXMgRGVmbGF0ZWRcblx0XHRcdFx0ZGVjb21wcmVzcyA9IG9wdGlvbnMuZGVjb21wcmVzcyAhPSBudWxsID8gb3B0aW9ucy5kZWNvbXByZXNzIDogdHJ1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJ1bnN1cHBvcnRlZCBjb21wcmVzc2lvbiBtZXRob2Q6IFwiICsgZW50cnkuY29tcHJlc3Npb25NZXRob2QpKTtcblx0XHRcdH1cblx0XHRcdHZhciBmaWxlRGF0YVN0YXJ0ID0gbG9jYWxGaWxlSGVhZGVyRW5kO1xuXHRcdFx0dmFyIGZpbGVEYXRhRW5kID0gZmlsZURhdGFTdGFydCArIGVudHJ5LmNvbXByZXNzZWRTaXplO1xuXHRcdFx0aWYgKGVudHJ5LmNvbXByZXNzZWRTaXplICE9PSAwKSB7XG5cdFx0XHRcdC8vIGJvdW5kcyBjaGVjayBub3csIGJlY2F1c2UgdGhlIHJlYWQgc3RyZWFtcyB3aWxsIHByb2JhYmx5IG5vdCBjb21wbGFpbiBsb3VkIGVub3VnaC5cblx0XHRcdFx0Ly8gc2luY2Ugd2UncmUgZGVhbGluZyB3aXRoIGFuIHVuc2lnbmVkIG9mZnNldCBwbHVzIGFuIHVuc2lnbmVkIHNpemUsXG5cdFx0XHRcdC8vIHdlIG9ubHkgaGF2ZSAxIHRoaW5nIHRvIGNoZWNrIGZvci5cblx0XHRcdFx0aWYgKGZpbGVEYXRhRW5kID4gc2VsZi5maWxlU2l6ZSkge1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJmaWxlIGRhdGEgb3ZlcmZsb3dzIGZpbGUgYm91bmRzOiBcIiArXG5cdFx0XHRcdFx0XHRmaWxlRGF0YVN0YXJ0ICsgXCIgKyBcIiArIGVudHJ5LmNvbXByZXNzZWRTaXplICsgXCIgPiBcIiArIHNlbGYuZmlsZVNpemUpKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0dmFyIHJlYWRTdHJlYW0gPSBzZWxmLnJlYWRlci5jcmVhdGVSZWFkU3RyZWFtKHtcblx0XHRcdFx0c3RhcnQ6IGZpbGVEYXRhU3RhcnQgKyByZWxhdGl2ZVN0YXJ0LFxuXHRcdFx0XHRlbmQ6IGZpbGVEYXRhU3RhcnQgKyByZWxhdGl2ZUVuZCxcblx0XHRcdH0pO1xuXHRcdFx0dmFyIGVuZHBvaW50U3RyZWFtID0gcmVhZFN0cmVhbTtcblx0XHRcdGlmIChkZWNvbXByZXNzKSB7XG5cdFx0XHRcdHZhciBkZXN0cm95ZWQgPSBmYWxzZTtcblx0XHRcdFx0dmFyIGluZmxhdGVGaWx0ZXIgPSB6bGliLmNyZWF0ZUluZmxhdGVSYXcoKTtcblx0XHRcdFx0cmVhZFN0cmVhbS5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRcdFx0XHQvLyBzZXRJbW1lZGlhdGUgaGVyZSBiZWNhdXNlIGVycm9ycyBjYW4gYmUgZW1pdHRlZCBkdXJpbmcgdGhlIGZpcnN0IGNhbGwgdG8gcGlwZSgpXG5cdFx0XHRcdFx0c2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGlmICghZGVzdHJveWVkKSBpbmZsYXRlRmlsdGVyLmVtaXQoXCJlcnJvclwiLCBlcnIpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmVhZFN0cmVhbS5waXBlKGluZmxhdGVGaWx0ZXIpO1xuXG5cdFx0XHRcdGlmIChzZWxmLnZhbGlkYXRlRW50cnlTaXplcykge1xuXHRcdFx0XHRcdGVuZHBvaW50U3RyZWFtID0gbmV3IEFzc2VydEJ5dGVDb3VudFN0cmVhbShlbnRyeS51bmNvbXByZXNzZWRTaXplKTtcblx0XHRcdFx0XHRpbmZsYXRlRmlsdGVyLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0XHRcdFx0Ly8gZm9yd2FyZCB6bGliIGVycm9ycyB0byB0aGUgY2xpZW50LXZpc2libGUgc3RyZWFtXG5cdFx0XHRcdFx0XHRzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRpZiAoIWRlc3Ryb3llZCkgZW5kcG9pbnRTdHJlYW0uZW1pdChcImVycm9yXCIsIGVycik7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRpbmZsYXRlRmlsdGVyLnBpcGUoZW5kcG9pbnRTdHJlYW0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHRoZSB6bGliIGZpbHRlciBpcyB0aGUgY2xpZW50LXZpc2libGUgc3RyZWFtXG5cdFx0XHRcdFx0ZW5kcG9pbnRTdHJlYW0gPSBpbmZsYXRlRmlsdGVyO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIHRoaXMgaXMgcGFydCBvZiB5YXV6bCdzIEFQSSwgc28gaW1wbGVtZW50IHRoaXMgZnVuY3Rpb24gb24gdGhlIGNsaWVudC12aXNpYmxlIHN0cmVhbVxuXHRcdFx0XHRlbmRwb2ludFN0cmVhbS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGRlc3Ryb3llZCA9IHRydWU7XG5cdFx0XHRcdFx0aWYgKGluZmxhdGVGaWx0ZXIgIT09IGVuZHBvaW50U3RyZWFtKSBpbmZsYXRlRmlsdGVyLnVucGlwZShlbmRwb2ludFN0cmVhbSk7XG5cdFx0XHRcdFx0cmVhZFN0cmVhbS51bnBpcGUoaW5mbGF0ZUZpbHRlcik7XG5cdFx0XHRcdFx0Ly8gVE9ETzogdGhlIGluZmxhdGVGaWx0ZXIgbWF5IGNhdXNlIGEgbWVtb3J5IGxlYWsuIHNlZSBJc3N1ZSAjMjcuXG5cdFx0XHRcdFx0cmVhZFN0cmVhbS5kZXN0cm95KCk7XG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0XHRjYWxsYmFjayhudWxsLCBlbmRwb2ludFN0cmVhbSk7XG5cdFx0fSBmaW5hbGx5IHtcblx0XHRcdHNlbGYucmVhZGVyLnVucmVmKCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmZ1bmN0aW9uIEVudHJ5KCkge1xufVxuXG5FbnRyeS5wcm90b3R5cGUuZ2V0TGFzdE1vZERhdGUgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiBkb3NEYXRlVGltZVRvRGF0ZSh0aGlzLmxhc3RNb2RGaWxlRGF0ZSwgdGhpcy5sYXN0TW9kRmlsZVRpbWUpO1xufTtcbkVudHJ5LnByb3RvdHlwZS5pc0VuY3J5cHRlZCA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuICh0aGlzLmdlbmVyYWxQdXJwb3NlQml0RmxhZyAmIDB4MSkgIT09IDA7XG59O1xuRW50cnkucHJvdG90eXBlLmlzQ29tcHJlc3NlZCA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuY29tcHJlc3Npb25NZXRob2QgPT09IDg7XG59O1xuXG5mdW5jdGlvbiBkb3NEYXRlVGltZVRvRGF0ZShkYXRlLCB0aW1lKSB7XG5cdHZhciBkYXkgPSBkYXRlICYgMHgxZjsgLy8gMS0zMVxuXHR2YXIgbW9udGggPSAoZGF0ZSA+PiA1ICYgMHhmKSAtIDE7IC8vIDEtMTIsIDAtMTFcblx0dmFyIHllYXIgPSAoZGF0ZSA+PiA5ICYgMHg3ZikgKyAxOTgwOyAvLyAwLTEyOCwgMTk4MC0yMTA4XG5cblx0dmFyIG1pbGxpc2Vjb25kID0gMDtcblx0dmFyIHNlY29uZCA9ICh0aW1lICYgMHgxZikgKiAyOyAvLyAwLTI5LCAwLTU4IChldmVuIG51bWJlcnMpXG5cdHZhciBtaW51dGUgPSB0aW1lID4+IDUgJiAweDNmOyAvLyAwLTU5XG5cdHZhciBob3VyID0gdGltZSA+PiAxMSAmIDB4MWY7IC8vIDAtMjNcblxuXHRyZXR1cm4gbmV3IERhdGUoeWVhciwgbW9udGgsIGRheSwgaG91ciwgbWludXRlLCBzZWNvbmQsIG1pbGxpc2Vjb25kKTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVGaWxlTmFtZShmaWxlTmFtZSkge1xuXHRpZiAoZmlsZU5hbWUuaW5kZXhPZihcIlxcXFxcIikgIT09IC0xKSB7XG5cdFx0cmV0dXJuIFwiaW52YWxpZCBjaGFyYWN0ZXJzIGluIGZpbGVOYW1lOiBcIiArIGZpbGVOYW1lO1xuXHR9XG5cdGlmICgvXlthLXpBLVpdOi8udGVzdChmaWxlTmFtZSkgfHwgL15cXC8vLnRlc3QoZmlsZU5hbWUpKSB7XG5cdFx0cmV0dXJuIFwiYWJzb2x1dGUgcGF0aDogXCIgKyBmaWxlTmFtZTtcblx0fVxuXHRpZiAoZmlsZU5hbWUuc3BsaXQoXCIvXCIpLmluZGV4T2YoXCIuLlwiKSAhPT0gLTEpIHtcblx0XHRyZXR1cm4gXCJpbnZhbGlkIHJlbGF0aXZlIHBhdGg6IFwiICsgZmlsZU5hbWU7XG5cdH1cblx0Ly8gYWxsIGdvb2Rcblx0cmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHJlYWRBbmRBc3NlcnROb0VvZihyZWFkZXIsIGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaykge1xuXHRpZiAobGVuZ3RoID09PSAwKSB7XG5cdFx0Ly8gZnMucmVhZCB3aWxsIHRocm93IGFuIG91dC1vZi1ib3VuZHMgZXJyb3IgaWYgeW91IHRyeSB0byByZWFkIDAgYnl0ZXMgZnJvbSBhIDAgYnl0ZSBmaWxlXG5cdFx0cmV0dXJuIHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRjYWxsYmFjayhudWxsLCBuZXdCdWZmZXIoMCkpO1xuXHRcdH0pO1xuXHR9XG5cdHJlYWRlci5yZWFkKGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBmdW5jdGlvbiAoZXJyLCBieXRlc1JlYWQpIHtcblx0XHRpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRpZiAoYnl0ZXNSZWFkIDwgbGVuZ3RoKSB7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwidW5leHBlY3RlZCBFT0ZcIikpO1xuXHRcdH1cblx0XHRjYWxsYmFjaygpO1xuXHR9KTtcbn1cblxudXRpbC5pbmhlcml0cyhBc3NlcnRCeXRlQ291bnRTdHJlYW0sIFRyYW5zZm9ybSk7XG5cbmZ1bmN0aW9uIEFzc2VydEJ5dGVDb3VudFN0cmVhbShieXRlQ291bnQpIHtcblx0VHJhbnNmb3JtLmNhbGwodGhpcyk7XG5cdHRoaXMuYWN0dWFsQnl0ZUNvdW50ID0gMDtcblx0dGhpcy5leHBlY3RlZEJ5dGVDb3VudCA9IGJ5dGVDb3VudDtcbn1cblxuQXNzZXJ0Qnl0ZUNvdW50U3RyZWFtLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24gKGNodW5rLCBlbmNvZGluZywgY2IpIHtcblx0dGhpcy5hY3R1YWxCeXRlQ291bnQgKz0gY2h1bmsubGVuZ3RoO1xuXHRpZiAodGhpcy5hY3R1YWxCeXRlQ291bnQgPiB0aGlzLmV4cGVjdGVkQnl0ZUNvdW50KSB7XG5cdFx0dmFyIG1zZyA9IFwidG9vIG1hbnkgYnl0ZXMgaW4gdGhlIHN0cmVhbS4gZXhwZWN0ZWQgXCIgKyB0aGlzLmV4cGVjdGVkQnl0ZUNvdW50ICsgXCIuIGdvdCBhdCBsZWFzdCBcIiArIHRoaXMuYWN0dWFsQnl0ZUNvdW50O1xuXHRcdHJldHVybiBjYihuZXcgRXJyb3IobXNnKSk7XG5cdH1cblx0Y2IobnVsbCwgY2h1bmspO1xufTtcbkFzc2VydEJ5dGVDb3VudFN0cmVhbS5wcm90b3R5cGUuX2ZsdXNoID0gZnVuY3Rpb24gKGNiKSB7XG5cdGlmICh0aGlzLmFjdHVhbEJ5dGVDb3VudCA8IHRoaXMuZXhwZWN0ZWRCeXRlQ291bnQpIHtcblx0XHR2YXIgbXNnID0gXCJub3QgZW5vdWdoIGJ5dGVzIGluIHRoZSBzdHJlYW0uIGV4cGVjdGVkIFwiICsgdGhpcy5leHBlY3RlZEJ5dGVDb3VudCArIFwiLiBnb3Qgb25seSBcIiArIHRoaXMuYWN0dWFsQnl0ZUNvdW50O1xuXHRcdHJldHVybiBjYihuZXcgRXJyb3IobXNnKSk7XG5cdH1cblx0Y2IoKTtcbn07XG5cbnV0aWwuaW5oZXJpdHMoUmFuZG9tQWNjZXNzUmVhZGVyLCBFdmVudEVtaXR0ZXIpO1xuXG5mdW5jdGlvbiBSYW5kb21BY2Nlc3NSZWFkZXIoKSB7XG5cdEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuXHR0aGlzLnJlZkNvdW50ID0gMDtcbn1cblxuUmFuZG9tQWNjZXNzUmVhZGVyLnByb3RvdHlwZS5yZWYgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMucmVmQ291bnQgKz0gMTtcbn07XG5SYW5kb21BY2Nlc3NSZWFkZXIucHJvdG90eXBlLnVucmVmID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdHNlbGYucmVmQ291bnQgLT0gMTtcblxuXHRpZiAoc2VsZi5yZWZDb3VudCA+IDApIHJldHVybjtcblx0aWYgKHNlbGYucmVmQ291bnQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIHVucmVmXCIpO1xuXG5cdHNlbGYuY2xvc2Uob25DbG9zZURvbmUpO1xuXG5cdGZ1bmN0aW9uIG9uQ2xvc2VEb25lKGVycikge1xuXHRcdGlmIChlcnIpIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcblx0XHRzZWxmLmVtaXQoJ2Nsb3NlJyk7XG5cdH1cbn07XG5SYW5kb21BY2Nlc3NSZWFkZXIucHJvdG90eXBlLmNyZWF0ZVJlYWRTdHJlYW0gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuXHR2YXIgc3RhcnQgPSBvcHRpb25zLnN0YXJ0O1xuXHR2YXIgZW5kID0gb3B0aW9ucy5lbmQ7XG5cdGlmIChzdGFydCA9PT0gZW5kKSB7XG5cdFx0dmFyIGVtcHR5U3RyZWFtID0gbmV3IFBhc3NUaHJvdWdoKCk7XG5cdFx0c2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdGVtcHR5U3RyZWFtLmVuZCgpO1xuXHRcdH0pO1xuXHRcdHJldHVybiBlbXB0eVN0cmVhbTtcblx0fVxuXHR2YXIgc3RyZWFtID0gdGhpcy5fcmVhZFN0cmVhbUZvclJhbmdlKHN0YXJ0LCBlbmQpO1xuXG5cdHZhciBkZXN0cm95ZWQgPSBmYWxzZTtcblx0dmFyIHJlZlVucmVmRmlsdGVyID0gbmV3IFJlZlVucmVmRmlsdGVyKHRoaXMpO1xuXHRzdHJlYW0ub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0c2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICghZGVzdHJveWVkKSByZWZVbnJlZkZpbHRlci5lbWl0KFwiZXJyb3JcIiwgZXJyKTtcblx0XHR9KTtcblx0fSk7XG5cdHJlZlVucmVmRmlsdGVyLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG5cdFx0c3RyZWFtLnVucGlwZShyZWZVbnJlZkZpbHRlcik7XG5cdFx0cmVmVW5yZWZGaWx0ZXIudW5yZWYoKTtcblx0XHRzdHJlYW0uZGVzdHJveSgpO1xuXHR9O1xuXG5cdHZhciBieXRlQ291bnRlciA9IG5ldyBBc3NlcnRCeXRlQ291bnRTdHJlYW0oZW5kIC0gc3RhcnQpO1xuXHRyZWZVbnJlZkZpbHRlci5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCFkZXN0cm95ZWQpIGJ5dGVDb3VudGVyLmVtaXQoXCJlcnJvclwiLCBlcnIpO1xuXHRcdH0pO1xuXHR9KTtcblx0Ynl0ZUNvdW50ZXIuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcblx0XHRkZXN0cm95ZWQgPSB0cnVlO1xuXHRcdHJlZlVucmVmRmlsdGVyLnVucGlwZShieXRlQ291bnRlcik7XG5cdFx0cmVmVW5yZWZGaWx0ZXIuZGVzdHJveSgpO1xuXHR9O1xuXG5cdHJldHVybiBzdHJlYW0ucGlwZShyZWZVbnJlZkZpbHRlcikucGlwZShieXRlQ291bnRlcik7XG59O1xuUmFuZG9tQWNjZXNzUmVhZGVyLnByb3RvdHlwZS5fcmVhZFN0cmVhbUZvclJhbmdlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcblx0dGhyb3cgbmV3IEVycm9yKFwibm90IGltcGxlbWVudGVkXCIpO1xufTtcblJhbmRvbUFjY2Vzc1JlYWRlci5wcm90b3R5cGUucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgY2FsbGJhY2spIHtcblx0dmFyIHJlYWRTdHJlYW0gPSB0aGlzLmNyZWF0ZVJlYWRTdHJlYW0oe3N0YXJ0OiBwb3NpdGlvbiwgZW5kOiBwb3NpdGlvbiArIGxlbmd0aH0pO1xuXHR2YXIgd3JpdGVTdHJlYW0gPSBuZXcgV3JpdGFibGUoKTtcblx0dmFyIHdyaXR0ZW4gPSAwO1xuXHR3cml0ZVN0cmVhbS5fd3JpdGUgPSBmdW5jdGlvbiAoY2h1bmssIGVuY29kaW5nLCBjYikge1xuXHRcdGNodW5rLmNvcHkoYnVmZmVyLCBvZmZzZXQgKyB3cml0dGVuLCAwLCBjaHVuay5sZW5ndGgpO1xuXHRcdHdyaXR0ZW4gKz0gY2h1bmsubGVuZ3RoO1xuXHRcdGNiKCk7XG5cdH07XG5cdHdyaXRlU3RyZWFtLm9uKFwiZmluaXNoXCIsIGNhbGxiYWNrKTtcblx0cmVhZFN0cmVhbS5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChlcnJvcikge1xuXHRcdGNhbGxiYWNrKGVycm9yKTtcblx0fSk7XG5cdHJlYWRTdHJlYW0ucGlwZSh3cml0ZVN0cmVhbSk7XG59O1xuUmFuZG9tQWNjZXNzUmVhZGVyLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXHRzZXRJbW1lZGlhdGUoY2FsbGJhY2spO1xufTtcblxudXRpbC5pbmhlcml0cyhSZWZVbnJlZkZpbHRlciwgUGFzc1Rocm91Z2gpO1xuXG5mdW5jdGlvbiBSZWZVbnJlZkZpbHRlcihjb250ZXh0KSB7XG5cdFBhc3NUaHJvdWdoLmNhbGwodGhpcyk7XG5cdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG5cdHRoaXMuY29udGV4dC5yZWYoKTtcblx0dGhpcy51bnJlZmZlZFlldCA9IGZhbHNlO1xufVxuXG5SZWZVbnJlZkZpbHRlci5wcm90b3R5cGUuX2ZsdXNoID0gZnVuY3Rpb24gKGNiKSB7XG5cdHRoaXMudW5yZWYoKTtcblx0Y2IoKTtcbn07XG5SZWZVbnJlZkZpbHRlci5wcm90b3R5cGUudW5yZWYgPSBmdW5jdGlvbiAoY2IpIHtcblx0aWYgKHRoaXMudW5yZWZmZWRZZXQpIHJldHVybjtcblx0dGhpcy51bnJlZmZlZFlldCA9IHRydWU7XG5cdHRoaXMuY29udGV4dC51bnJlZigpO1xufTtcblxudmFyIGNwNDM3ID0gJ1xcdTAwMDDimLrimLvimaXimabimaPimaDigKLil5jil4vil5nimYLimYDimarimavimLzilrril4TihpXigLzCtsKn4pas4oao4oaR4oaT4oaS4oaQ4oif4oaU4pay4pa8ICFcIiMkJSZcXCcoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXFxcXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX7ijILDh8O8w6nDosOkw6DDpcOnw6rDq8Oow6/DrsOsw4TDhcOJw6bDhsO0w7bDssO7w7nDv8OWw5zCosKjwqXigqfGksOhw63Ds8O6w7HDkcKqwrrCv+KMkMKswr3CvMKhwqvCu+KWkeKWkuKWk+KUguKUpOKVoeKVouKVluKVleKVo+KVkeKVl+KVneKVnOKVm+KUkOKUlOKUtOKUrOKUnOKUgOKUvOKVnuKVn+KVmuKVlOKVqeKVpuKVoOKVkOKVrOKVp+KVqOKVpOKVpeKVmeKVmOKVkuKVk+KVq+KVquKUmOKUjOKWiOKWhOKWjOKWkOKWgM6xw5/Ok8+AzqPPg8K1z4TOps6YzqnOtOKIns+GzrXiiKniiaHCseKJpeKJpOKMoOKMocO34omIwrDiiJnCt+KImuKBv8Ky4pagwqAnO1xuXG5mdW5jdGlvbiBkZWNvZGVCdWZmZXIoYnVmZmVyLCBzdGFydCwgZW5kLCBpc1V0ZjgpIHtcblx0aWYgKGlzVXRmOCkge1xuXHRcdHJldHVybiBidWZmZXIudG9TdHJpbmcoXCJ1dGY4XCIsIHN0YXJ0LCBlbmQpO1xuXHR9IGVsc2Uge1xuXHRcdHZhciByZXN1bHQgPSBcIlwiO1xuXHRcdGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG5cdFx0XHRyZXN1bHQgKz0gY3A0MzdbYnVmZmVyW2ldXTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxufVxuXG5mdW5jdGlvbiByZWFkVUludDY0TEUoYnVmZmVyLCBvZmZzZXQpIHtcblx0Ly8gdGhlcmUgaXMgbm8gbmF0aXZlIGZ1bmN0aW9uIGZvciB0aGlzLCBiZWNhdXNlIHdlIGNhbid0IGFjdHVhbGx5IHN0b3JlIDY0LWJpdCBpbnRlZ2VycyBwcmVjaXNlbHkuXG5cdC8vIGFmdGVyIDUzIGJpdHMsIEphdmFTY3JpcHQncyBOdW1iZXIgdHlwZSAoSUVFRSA3NTQgZG91YmxlKSBjYW4ndCBzdG9yZSBpbmRpdmlkdWFsIGludGVnZXJzIGFueW1vcmUuXG5cdC8vIGJ1dCBzaW5jZSA1MyBiaXRzIGlzIGEgd2hvbGUgbG90IG1vcmUgdGhhbiAzMiBiaXRzLCB3ZSBkbyBvdXIgYmVzdCBhbnl3YXkuXG5cdHZhciBsb3dlcjMyID0gYnVmZmVyLnJlYWRVSW50MzJMRShvZmZzZXQpO1xuXHR2YXIgdXBwZXIzMiA9IGJ1ZmZlci5yZWFkVUludDMyTEUob2Zmc2V0ICsgNCk7XG5cdC8vIHdlIGNhbid0IHVzZSBiaXRzaGlmdGluZyBoZXJlLCBiZWNhdXNlIEphdmFTY3JpcHQgYml0c2hpZnRpbmcgb25seSB3b3JrcyBvbiAzMi1iaXQgaW50ZWdlcnMuXG5cdHJldHVybiB1cHBlcjMyICogMHgxMDAwMDAwMDAgKyBsb3dlcjMyO1xuXHQvLyBhcyBsb25nIGFzIHdlJ3JlIGJvdW5kcyBjaGVja2luZyB0aGUgcmVzdWx0IG9mIHRoaXMgZnVuY3Rpb24gYWdhaW5zdCB0aGUgdG90YWwgZmlsZSBzaXplLFxuXHQvLyB3ZSdsbCBjYXRjaCBhbnkgb3ZlcmZsb3cgZXJyb3JzLCBiZWNhdXNlIHdlIGFscmVhZHkgbWFkZSBzdXJlIHRoZSB0b3RhbCBmaWxlIHNpemUgd2FzIHdpdGhpbiByZWFzb24uXG59XG5cbi8vIE5vZGUgMTAgZGVwcmVjYXRlZCBuZXcgQnVmZmVyKCkuXG52YXIgbmV3QnVmZmVyO1xuaWYgKHR5cGVvZiBCdWZmZXIuYWxsb2NVbnNhZmUgPT09IFwiZnVuY3Rpb25cIikge1xuXHRuZXdCdWZmZXIgPSBmdW5jdGlvbiAobGVuKSB7XG5cdFx0cmV0dXJuIEJ1ZmZlci5hbGxvY1Vuc2FmZShsZW4pO1xuXHR9O1xufSBlbHNlIHtcblx0bmV3QnVmZmVyID0gZnVuY3Rpb24gKGxlbikge1xuXHRcdHJldHVybiBuZXcgQnVmZmVyKGxlbik7XG5cdH07XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRDYWxsYmFjayhlcnIpIHtcblx0aWYgKGVycikgdGhyb3cgZXJyO1xufVxuIiwidmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuVHJhbnNmb3JtO1xudmFyIFBhc3NUaHJvdWdoID0gcmVxdWlyZShcInN0cmVhbVwiKS5QYXNzVGhyb3VnaDtcbnZhciB6bGliID0gcmVxdWlyZShcInpsaWJcIik7XG52YXIgdXRpbCA9IHJlcXVpcmUoXCJ1dGlsXCIpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xudmFyIGNyYzMyID0gcmVxdWlyZShcImJ1ZmZlci1jcmMzMlwiKTtcblxuZXhwb3J0cy5aaXBGaWxlID0gWmlwRmlsZTtcbmV4cG9ydHMuZGF0ZVRvRG9zRGF0ZVRpbWUgPSBkYXRlVG9Eb3NEYXRlVGltZTtcblxudXRpbC5pbmhlcml0cyhaaXBGaWxlLCBFdmVudEVtaXR0ZXIpO1xuXG5mdW5jdGlvbiBaaXBGaWxlKCkge1xuXHR0aGlzLm91dHB1dFN0cmVhbSA9IG5ldyBQYXNzVGhyb3VnaCgpO1xuXHR0aGlzLmVudHJpZXMgPSBbXTtcblx0dGhpcy5vdXRwdXRTdHJlYW1DdXJzb3IgPSAwO1xuXHR0aGlzLmVuZGVkID0gZmFsc2U7IC8vIC5lbmQoKSBzZXRzIHRoaXNcblx0dGhpcy5hbGxEb25lID0gZmFsc2U7IC8vIHNldCB3aGVuIHdlJ3ZlIHdyaXR0ZW4gdGhlIGxhc3QgYnl0ZXNcblx0dGhpcy5mb3JjZVppcDY0RW9jZCA9IGZhbHNlOyAvLyBjb25maWd1cmFibGUgaW4gLmVuZCgpXG59XG5cblppcEZpbGUucHJvdG90eXBlLmFkZEZpbGUgPSBmdW5jdGlvbiAocmVhbFBhdGgsIG1ldGFkYXRhUGF0aCwgb3B0aW9ucykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdG1ldGFkYXRhUGF0aCA9IHZhbGlkYXRlTWV0YWRhdGFQYXRoKG1ldGFkYXRhUGF0aCwgZmFsc2UpO1xuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cblx0dmFyIGVudHJ5ID0gbmV3IEVudHJ5KG1ldGFkYXRhUGF0aCwgZmFsc2UsIG9wdGlvbnMpO1xuXHRzZWxmLmVudHJpZXMucHVzaChlbnRyeSk7XG5cdGZzLnN0YXQocmVhbFBhdGgsIGZ1bmN0aW9uIChlcnIsIHN0YXRzKSB7XG5cdFx0aWYgKGVycikgcmV0dXJuIHNlbGYuZW1pdChcImVycm9yXCIsIGVycik7XG5cdFx0aWYgKCFzdGF0cy5pc0ZpbGUoKSkgcmV0dXJuIHNlbGYuZW1pdChcImVycm9yXCIsIG5ldyBFcnJvcihcIm5vdCBhIGZpbGU6IFwiICsgcmVhbFBhdGgpKTtcblx0XHRlbnRyeS51bmNvbXByZXNzZWRTaXplID0gc3RhdHMuc2l6ZTtcblx0XHRpZiAob3B0aW9ucy5tdGltZSA9PSBudWxsKSBlbnRyeS5zZXRMYXN0TW9kRGF0ZShzdGF0cy5tdGltZSk7XG5cdFx0aWYgKG9wdGlvbnMubW9kZSA9PSBudWxsKSBlbnRyeS5zZXRGaWxlQXR0cmlidXRlc01vZGUoc3RhdHMubW9kZSk7XG5cdFx0ZW50cnkuc2V0RmlsZURhdGFQdW1wRnVuY3Rpb24oZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIHJlYWRTdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKHJlYWxQYXRoKTtcblx0XHRcdGVudHJ5LnN0YXRlID0gRW50cnkuRklMRV9EQVRBX0lOX1BST0dSRVNTO1xuXHRcdFx0cmVhZFN0cmVhbS5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRcdFx0c2VsZi5lbWl0KFwiZXJyb3JcIiwgZXJyKTtcblx0XHRcdH0pO1xuXHRcdFx0cHVtcEZpbGVEYXRhUmVhZFN0cmVhbShzZWxmLCBlbnRyeSwgcmVhZFN0cmVhbSk7XG5cdFx0fSk7XG5cdFx0cHVtcEVudHJpZXMoc2VsZik7XG5cdH0pO1xufTtcblxuWmlwRmlsZS5wcm90b3R5cGUuYWRkUmVhZFN0cmVhbSA9IGZ1bmN0aW9uIChyZWFkU3RyZWFtLCBtZXRhZGF0YVBhdGgsIG9wdGlvbnMpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRtZXRhZGF0YVBhdGggPSB2YWxpZGF0ZU1ldGFkYXRhUGF0aChtZXRhZGF0YVBhdGgsIGZhbHNlKTtcblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXHR2YXIgZW50cnkgPSBuZXcgRW50cnkobWV0YWRhdGFQYXRoLCBmYWxzZSwgb3B0aW9ucyk7XG5cdHNlbGYuZW50cmllcy5wdXNoKGVudHJ5KTtcblx0ZW50cnkuc2V0RmlsZURhdGFQdW1wRnVuY3Rpb24oZnVuY3Rpb24gKCkge1xuXHRcdGVudHJ5LnN0YXRlID0gRW50cnkuRklMRV9EQVRBX0lOX1BST0dSRVNTO1xuXHRcdHB1bXBGaWxlRGF0YVJlYWRTdHJlYW0oc2VsZiwgZW50cnksIHJlYWRTdHJlYW0pO1xuXHR9KTtcblx0cHVtcEVudHJpZXMoc2VsZik7XG59O1xuXG5aaXBGaWxlLnByb3RvdHlwZS5hZGRCdWZmZXIgPSBmdW5jdGlvbiAoYnVmZmVyLCBtZXRhZGF0YVBhdGgsIG9wdGlvbnMpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRtZXRhZGF0YVBhdGggPSB2YWxpZGF0ZU1ldGFkYXRhUGF0aChtZXRhZGF0YVBhdGgsIGZhbHNlKTtcblx0aWYgKGJ1ZmZlci5sZW5ndGggPiAweDNmZmZmZmZmKSB0aHJvdyBuZXcgRXJyb3IoXCJidWZmZXIgdG9vIGxhcmdlOiBcIiArIGJ1ZmZlci5sZW5ndGggKyBcIiA+IFwiICsgMHgzZmZmZmZmZik7XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblx0aWYgKG9wdGlvbnMuc2l6ZSAhPSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLnNpemUgbm90IGFsbG93ZWRcIik7XG5cdHZhciBlbnRyeSA9IG5ldyBFbnRyeShtZXRhZGF0YVBhdGgsIGZhbHNlLCBvcHRpb25zKTtcblx0ZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9IGJ1ZmZlci5sZW5ndGg7XG5cdGVudHJ5LmNyYzMyID0gY3JjMzIudW5zaWduZWQoYnVmZmVyKTtcblx0ZW50cnkuY3JjQW5kRmlsZVNpemVLbm93biA9IHRydWU7XG5cdHNlbGYuZW50cmllcy5wdXNoKGVudHJ5KTtcblx0aWYgKCFlbnRyeS5jb21wcmVzcykge1xuXHRcdHNldENvbXByZXNzZWRCdWZmZXIoYnVmZmVyKTtcblx0fSBlbHNlIHtcblx0XHR6bGliLmRlZmxhdGVSYXcoYnVmZmVyLCBmdW5jdGlvbiAoZXJyLCBjb21wcmVzc2VkQnVmZmVyKSB7XG5cdFx0XHRzZXRDb21wcmVzc2VkQnVmZmVyKGNvbXByZXNzZWRCdWZmZXIpO1xuXHRcdFx0XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBzZXRDb21wcmVzc2VkQnVmZmVyKGNvbXByZXNzZWRCdWZmZXIpIHtcblx0XHRlbnRyeS5jb21wcmVzc2VkU2l6ZSA9IGNvbXByZXNzZWRCdWZmZXIubGVuZ3RoO1xuXHRcdGVudHJ5LnNldEZpbGVEYXRhUHVtcEZ1bmN0aW9uKGZ1bmN0aW9uICgpIHtcblx0XHRcdHdyaXRlVG9PdXRwdXRTdHJlYW0oc2VsZiwgY29tcHJlc3NlZEJ1ZmZlcik7XG5cdFx0XHR3cml0ZVRvT3V0cHV0U3RyZWFtKHNlbGYsIGVudHJ5LmdldERhdGFEZXNjcmlwdG9yKCkpO1xuXHRcdFx0ZW50cnkuc3RhdGUgPSBFbnRyeS5GSUxFX0RBVEFfRE9ORTtcblxuXHRcdFx0Ly8gZG9uJ3QgY2FsbCBwdW1wRW50cmllcygpIHJlY3Vyc2l2ZWx5LlxuXHRcdFx0Ly8gKGFsc28sIGRvbid0IGNhbGwgcHJvY2Vzcy5uZXh0VGljayByZWN1cnNpdmVseS4pXG5cdFx0XHRzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRwdW1wRW50cmllcyhzZWxmKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdHB1bXBFbnRyaWVzKHNlbGYpO1xuXHR9XG59O1xuXG5cblppcEZpbGUucHJvdG90eXBlLmFkZEVtcHR5RGlyZWN0b3J5ID0gZnVuY3Rpb24gKG1ldGFkYXRhUGF0aCwgb3B0aW9ucykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdG1ldGFkYXRhUGF0aCA9IHZhbGlkYXRlTWV0YWRhdGFQYXRoKG1ldGFkYXRhUGF0aCwgdHJ1ZSk7XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblx0aWYgKG9wdGlvbnMuc2l6ZSAhPSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLnNpemUgbm90IGFsbG93ZWRcIik7XG5cdGlmIChvcHRpb25zLmNvbXByZXNzICE9IG51bGwpIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuY29tcHJlc3Mgbm90IGFsbG93ZWRcIik7XG5cdHZhciBlbnRyeSA9IG5ldyBFbnRyeShtZXRhZGF0YVBhdGgsIHRydWUsIG9wdGlvbnMpO1xuXHRzZWxmLmVudHJpZXMucHVzaChlbnRyeSk7XG5cdGVudHJ5LnNldEZpbGVEYXRhUHVtcEZ1bmN0aW9uKGZ1bmN0aW9uICgpIHtcblx0XHR3cml0ZVRvT3V0cHV0U3RyZWFtKHNlbGYsIGVudHJ5LmdldERhdGFEZXNjcmlwdG9yKCkpO1xuXHRcdGVudHJ5LnN0YXRlID0gRW50cnkuRklMRV9EQVRBX0RPTkU7XG5cdFx0cHVtcEVudHJpZXMoc2VsZik7XG5cdH0pO1xuXHRwdW1wRW50cmllcyhzZWxmKTtcbn07XG5cblppcEZpbGUucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIChvcHRpb25zLCBmaW5hbFNpemVDYWxsYmFjaykge1xuXHRpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdGZpbmFsU2l6ZUNhbGxiYWNrID0gb3B0aW9ucztcblx0XHRvcHRpb25zID0gbnVsbDtcblx0fVxuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdGlmICh0aGlzLmVuZGVkKSByZXR1cm47XG5cdHRoaXMuZW5kZWQgPSB0cnVlO1xuXHR0aGlzLmZpbmFsU2l6ZUNhbGxiYWNrID0gZmluYWxTaXplQ2FsbGJhY2s7XG5cdHRoaXMuZm9yY2VaaXA2NEVvY2QgPSAhIW9wdGlvbnMuZm9yY2VaaXA2NEZvcm1hdDtcblx0cHVtcEVudHJpZXModGhpcyk7XG59O1xuXG5mdW5jdGlvbiB3cml0ZVRvT3V0cHV0U3RyZWFtKHNlbGYsIGJ1ZmZlcikge1xuXHRzZWxmLm91dHB1dFN0cmVhbS53cml0ZShidWZmZXIpO1xuXHRzZWxmLm91dHB1dFN0cmVhbUN1cnNvciArPSBidWZmZXIubGVuZ3RoO1xufVxuXG5mdW5jdGlvbiBwdW1wRmlsZURhdGFSZWFkU3RyZWFtKHNlbGYsIGVudHJ5LCByZWFkU3RyZWFtKSB7XG5cdHZhciBjcmMzMldhdGNoZXIgPSBuZXcgQ3JjMzJXYXRjaGVyKCk7XG5cdHZhciB1bmNvbXByZXNzZWRTaXplQ291bnRlciA9IG5ldyBCeXRlQ291bnRlcigpO1xuXHR2YXIgY29tcHJlc3NvciA9IGVudHJ5LmNvbXByZXNzID8gbmV3IHpsaWIuRGVmbGF0ZVJhdygpIDogbmV3IFBhc3NUaHJvdWdoKCk7XG5cdHZhciBjb21wcmVzc2VkU2l6ZUNvdW50ZXIgPSBuZXcgQnl0ZUNvdW50ZXIoKTtcblx0cmVhZFN0cmVhbS5waXBlKGNyYzMyV2F0Y2hlcilcblx0XHQucGlwZSh1bmNvbXByZXNzZWRTaXplQ291bnRlcilcblx0XHQucGlwZShjb21wcmVzc29yKVxuXHRcdC5waXBlKGNvbXByZXNzZWRTaXplQ291bnRlcilcblx0XHQucGlwZShzZWxmLm91dHB1dFN0cmVhbSwge2VuZDogZmFsc2V9KTtcblx0Y29tcHJlc3NlZFNpemVDb3VudGVyLm9uKFwiZW5kXCIsIGZ1bmN0aW9uICgpIHtcblx0XHRlbnRyeS5jcmMzMiA9IGNyYzMyV2F0Y2hlci5jcmMzMjtcblx0XHRpZiAoZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9PSBudWxsKSB7XG5cdFx0XHRlbnRyeS51bmNvbXByZXNzZWRTaXplID0gdW5jb21wcmVzc2VkU2l6ZUNvdW50ZXIuYnl0ZUNvdW50O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoZW50cnkudW5jb21wcmVzc2VkU2l6ZSAhPT0gdW5jb21wcmVzc2VkU2l6ZUNvdW50ZXIuYnl0ZUNvdW50KSByZXR1cm4gc2VsZi5lbWl0KFwiZXJyb3JcIiwgbmV3IEVycm9yKFwiZmlsZSBkYXRhIHN0cmVhbSBoYXMgdW5leHBlY3RlZCBudW1iZXIgb2YgYnl0ZXNcIikpO1xuXHRcdH1cblx0XHRlbnRyeS5jb21wcmVzc2VkU2l6ZSA9IGNvbXByZXNzZWRTaXplQ291bnRlci5ieXRlQ291bnQ7XG5cdFx0c2VsZi5vdXRwdXRTdHJlYW1DdXJzb3IgKz0gZW50cnkuY29tcHJlc3NlZFNpemU7XG5cdFx0d3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBlbnRyeS5nZXREYXRhRGVzY3JpcHRvcigpKTtcblx0XHRlbnRyeS5zdGF0ZSA9IEVudHJ5LkZJTEVfREFUQV9ET05FO1xuXHRcdHB1bXBFbnRyaWVzKHNlbGYpO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gcHVtcEVudHJpZXMoc2VsZikge1xuXHRpZiAoc2VsZi5hbGxEb25lKSByZXR1cm47XG5cdC8vIGZpcnN0IGNoZWNrIGlmIGZpbmFsU2l6ZSBpcyBmaW5hbGx5IGtub3duXG5cdGlmIChzZWxmLmVuZGVkICYmIHNlbGYuZmluYWxTaXplQ2FsbGJhY2sgIT0gbnVsbCkge1xuXHRcdHZhciBmaW5hbFNpemUgPSBjYWxjdWxhdGVGaW5hbFNpemUoc2VsZik7XG5cdFx0aWYgKGZpbmFsU2l6ZSAhPSBudWxsKSB7XG5cdFx0XHQvLyB3ZSBoYXZlIGFuIGFuc3dlclxuXHRcdFx0c2VsZi5maW5hbFNpemVDYWxsYmFjayhmaW5hbFNpemUpO1xuXHRcdFx0c2VsZi5maW5hbFNpemVDYWxsYmFjayA9IG51bGw7XG5cdFx0fVxuXHR9XG5cblx0Ly8gcHVtcCBlbnRyaWVzXG5cdHZhciBlbnRyeSA9IGdldEZpcnN0Tm90RG9uZUVudHJ5KCk7XG5cblx0ZnVuY3Rpb24gZ2V0Rmlyc3ROb3REb25lRW50cnkoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLmVudHJpZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBlbnRyeSA9IHNlbGYuZW50cmllc1tpXTtcblx0XHRcdGlmIChlbnRyeS5zdGF0ZSA8IEVudHJ5LkZJTEVfREFUQV9ET05FKSByZXR1cm4gZW50cnk7XG5cdFx0fVxuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0aWYgKGVudHJ5ICE9IG51bGwpIHtcblx0XHQvLyB0aGlzIGVudHJ5IGlzIG5vdCBkb25lIHlldFxuXHRcdGlmIChlbnRyeS5zdGF0ZSA8IEVudHJ5LlJFQURZX1RPX1BVTVBfRklMRV9EQVRBKSByZXR1cm47IC8vIGlucHV0IGZpbGUgbm90IG9wZW4geWV0XG5cdFx0aWYgKGVudHJ5LnN0YXRlID09PSBFbnRyeS5GSUxFX0RBVEFfSU5fUFJPR1JFU1MpIHJldHVybjsgLy8gd2UnbGwgZ2V0IHRoZXJlXG5cdFx0Ly8gc3RhcnQgd2l0aCBsb2NhbCBmaWxlIGhlYWRlclxuXHRcdGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9IHNlbGYub3V0cHV0U3RyZWFtQ3Vyc29yO1xuXHRcdHZhciBsb2NhbEZpbGVIZWFkZXIgPSBlbnRyeS5nZXRMb2NhbEZpbGVIZWFkZXIoKTtcblx0XHR3cml0ZVRvT3V0cHV0U3RyZWFtKHNlbGYsIGxvY2FsRmlsZUhlYWRlcik7XG5cdFx0ZW50cnkuZG9GaWxlRGF0YVB1bXAoKTtcblx0fSBlbHNlIHtcblx0XHQvLyBhbGwgY291Z2h0IHVwIG9uIHdyaXRpbmcgZW50cmllc1xuXHRcdGlmIChzZWxmLmVuZGVkKSB7XG5cdFx0XHQvLyBoZWFkIGZvciB0aGUgZXhpdFxuXHRcdFx0c2VsZi5vZmZzZXRPZlN0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5ID0gc2VsZi5vdXRwdXRTdHJlYW1DdXJzb3I7XG5cdFx0XHRzZWxmLmVudHJpZXMuZm9yRWFjaChmdW5jdGlvbiAoZW50cnkpIHtcblx0XHRcdFx0dmFyIGNlbnRyYWxEaXJlY3RvcnlSZWNvcmQgPSBlbnRyeS5nZXRDZW50cmFsRGlyZWN0b3J5UmVjb3JkKCk7XG5cdFx0XHRcdHdyaXRlVG9PdXRwdXRTdHJlYW0oc2VsZiwgY2VudHJhbERpcmVjdG9yeVJlY29yZCk7XG5cdFx0XHR9KTtcblx0XHRcdHdyaXRlVG9PdXRwdXRTdHJlYW0oc2VsZiwgZ2V0RW5kT2ZDZW50cmFsRGlyZWN0b3J5UmVjb3JkKHNlbGYpKTtcblx0XHRcdHNlbGYub3V0cHV0U3RyZWFtLmVuZCgpO1xuXHRcdFx0c2VsZi5hbGxEb25lID0gdHJ1ZTtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gY2FsY3VsYXRlRmluYWxTaXplKHNlbGYpIHtcblx0dmFyIHByZXRlbmRPdXRwdXRDdXJzb3IgPSAwO1xuXHR2YXIgY2VudHJhbERpcmVjdG9yeVNpemUgPSAwO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuZW50cmllcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBlbnRyeSA9IHNlbGYuZW50cmllc1tpXTtcblx0XHQvLyBjb21wcmVzc2lvbiBpcyB0b28gaGFyZCB0byBwcmVkaWN0XG5cdFx0aWYgKGVudHJ5LmNvbXByZXNzKSByZXR1cm4gLTE7XG5cdFx0aWYgKGVudHJ5LnN0YXRlID49IEVudHJ5LlJFQURZX1RPX1BVTVBfRklMRV9EQVRBKSB7XG5cdFx0XHQvLyBpZiBhZGRSZWFkU3RyZWFtIHdhcyBjYWxsZWQgd2l0aG91dCBwcm92aWRpbmcgdGhlIHNpemUsIHdlIGNhbid0IHByZWRpY3QgdGhlIGZpbmFsIHNpemVcblx0XHRcdGlmIChlbnRyeS51bmNvbXByZXNzZWRTaXplID09IG51bGwpIHJldHVybiAtMTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gaWYgd2UncmUgc3RpbGwgd2FpdGluZyBmb3IgZnMuc3RhdCwgd2UgbWlnaHQgbGVhcm4gdGhlIHNpemUgc29tZWRheVxuXHRcdFx0aWYgKGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPT0gbnVsbCkgcmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdC8vIHdlIGtub3cgdGhpcyBmb3Igc3VyZSwgYW5kIHRoaXMgaXMgaW1wb3J0YW50IHRvIGtub3cgaWYgd2UgbmVlZCBaSVA2NCBmb3JtYXQuXG5cdFx0ZW50cnkucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID0gcHJldGVuZE91dHB1dEN1cnNvcjtcblx0XHR2YXIgdXNlWmlwNjRGb3JtYXQgPSBlbnRyeS51c2VaaXA2NEZvcm1hdCgpO1xuXG5cdFx0cHJldGVuZE91dHB1dEN1cnNvciArPSBMT0NBTF9GSUxFX0hFQURFUl9GSVhFRF9TSVpFICsgZW50cnkudXRmOEZpbGVOYW1lLmxlbmd0aDtcblx0XHRwcmV0ZW5kT3V0cHV0Q3Vyc29yICs9IGVudHJ5LnVuY29tcHJlc3NlZFNpemU7XG5cdFx0aWYgKCFlbnRyeS5jcmNBbmRGaWxlU2l6ZUtub3duKSB7XG5cdFx0XHQvLyB1c2UgYSBkYXRhIGRlc2NyaXB0b3Jcblx0XHRcdGlmICh1c2VaaXA2NEZvcm1hdCkge1xuXHRcdFx0XHRwcmV0ZW5kT3V0cHV0Q3Vyc29yICs9IFpJUDY0X0RBVEFfREVTQ1JJUFRPUl9TSVpFO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cHJldGVuZE91dHB1dEN1cnNvciArPSBEQVRBX0RFU0NSSVBUT1JfU0laRTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjZW50cmFsRGlyZWN0b3J5U2l6ZSArPSBDRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfRklYRURfU0laRSArIGVudHJ5LnV0ZjhGaWxlTmFtZS5sZW5ndGg7XG5cdFx0aWYgKHVzZVppcDY0Rm9ybWF0KSB7XG5cdFx0XHRjZW50cmFsRGlyZWN0b3J5U2l6ZSArPSBaSVA2NF9FWFRFTkRFRF9JTkZPUk1BVElPTl9FWFRSQV9GSUVMRF9TSVpFO1xuXHRcdH1cblx0fVxuXG5cdHZhciBlbmRPZkNlbnRyYWxEaXJlY3RvcnlTaXplID0gMDtcblx0aWYgKHNlbGYuZm9yY2VaaXA2NEVvY2QgfHxcblx0XHRzZWxmLmVudHJpZXMubGVuZ3RoID49IDB4ZmZmZiB8fFxuXHRcdGNlbnRyYWxEaXJlY3RvcnlTaXplID49IDB4ZmZmZiB8fFxuXHRcdHByZXRlbmRPdXRwdXRDdXJzb3IgPj0gMHhmZmZmZmZmZikge1xuXHRcdC8vIHVzZSB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3Rvcnkgc3R1ZmZcblx0XHRlbmRPZkNlbnRyYWxEaXJlY3RvcnlTaXplICs9IFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRSArIFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9MT0NBVE9SX1NJWkU7XG5cdH1cblx0ZW5kT2ZDZW50cmFsRGlyZWN0b3J5U2l6ZSArPSBFTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkU7XG5cdHJldHVybiBwcmV0ZW5kT3V0cHV0Q3Vyc29yICsgY2VudHJhbERpcmVjdG9yeVNpemUgKyBlbmRPZkNlbnRyYWxEaXJlY3RvcnlTaXplO1xufVxuXG52YXIgWklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFID0gNTY7XG52YXIgWklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX0xPQ0FUT1JfU0laRSA9IDIwO1xudmFyIEVORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRSA9IDIyO1xuXG5mdW5jdGlvbiBnZXRFbmRPZkNlbnRyYWxEaXJlY3RvcnlSZWNvcmQoc2VsZiwgYWN0dWFsbHlKdXN0VGVsbE1lSG93TG9uZ0l0V291bGRCZSkge1xuXHR2YXIgbmVlZFppcDY0Rm9ybWF0ID0gZmFsc2U7XG5cdHZhciBub3JtYWxFbnRyaWVzTGVuZ3RoID0gc2VsZi5lbnRyaWVzLmxlbmd0aDtcblx0aWYgKHNlbGYuZm9yY2VaaXA2NEVvY2QgfHwgc2VsZi5lbnRyaWVzLmxlbmd0aCA+PSAweGZmZmYpIHtcblx0XHRub3JtYWxFbnRyaWVzTGVuZ3RoID0gMHhmZmZmO1xuXHRcdG5lZWRaaXA2NEZvcm1hdCA9IHRydWU7XG5cdH1cblx0dmFyIHNpemVPZkNlbnRyYWxEaXJlY3RvcnkgPSBzZWxmLm91dHB1dFN0cmVhbUN1cnNvciAtIHNlbGYub2Zmc2V0T2ZTdGFydE9mQ2VudHJhbERpcmVjdG9yeTtcblx0dmFyIG5vcm1hbFNpemVPZkNlbnRyYWxEaXJlY3RvcnkgPSBzaXplT2ZDZW50cmFsRGlyZWN0b3J5O1xuXHRpZiAoc2VsZi5mb3JjZVppcDY0RW9jZCB8fCBzaXplT2ZDZW50cmFsRGlyZWN0b3J5ID49IDB4ZmZmZmZmZmYpIHtcblx0XHRub3JtYWxTaXplT2ZDZW50cmFsRGlyZWN0b3J5ID0gMHhmZmZmZmZmZjtcblx0XHRuZWVkWmlwNjRGb3JtYXQgPSB0cnVlO1xuXHR9XG5cdHZhciBub3JtYWxPZmZzZXRPZlN0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5ID0gc2VsZi5vZmZzZXRPZlN0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5O1xuXHRpZiAoc2VsZi5mb3JjZVppcDY0RW9jZCB8fCBzZWxmLm9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3RvcnkgPj0gMHhmZmZmZmZmZikge1xuXHRcdG5vcm1hbE9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3RvcnkgPSAweGZmZmZmZmZmO1xuXHRcdG5lZWRaaXA2NEZvcm1hdCA9IHRydWU7XG5cdH1cblx0aWYgKGFjdHVhbGx5SnVzdFRlbGxNZUhvd0xvbmdJdFdvdWxkQmUpIHtcblx0XHRpZiAobmVlZFppcDY0Rm9ybWF0KSB7XG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHRaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkUgK1xuXHRcdFx0XHRaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfTE9DQVRPUl9TSVpFICtcblx0XHRcdFx0RU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFXG5cdFx0XHQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFO1xuXHRcdH1cblx0fVxuXG5cdHZhciBlb2NkckJ1ZmZlciA9IG5ldyBCdWZmZXIoRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFKTtcblx0Ly8gZW5kIG9mIGNlbnRyYWwgZGlyIHNpZ25hdHVyZSAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlcyAgKDB4MDYwNTRiNTApXG5cdGVvY2RyQnVmZmVyLndyaXRlVUludDMyTEUoMHgwNjA1NGI1MCwgMCk7XG5cdC8vIG51bWJlciBvZiB0aGlzIGRpc2sgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0ZW9jZHJCdWZmZXIud3JpdGVVSW50MTZMRSgwLCA0KTtcblx0Ly8gbnVtYmVyIG9mIHRoZSBkaXNrIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgMiBieXRlc1xuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQxNkxFKDAsIDYpO1xuXHQvLyB0b3RhbCBudW1iZXIgb2YgZW50cmllcyBpbiB0aGUgY2VudHJhbCBkaXJlY3Rvcnkgb24gdGhpcyBkaXNrICAyIGJ5dGVzXG5cdGVvY2RyQnVmZmVyLndyaXRlVUludDE2TEUobm9ybWFsRW50cmllc0xlbmd0aCwgOCk7XG5cdC8vIHRvdGFsIG51bWJlciBvZiBlbnRyaWVzIGluIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgIDIgYnl0ZXNcblx0ZW9jZHJCdWZmZXIud3JpdGVVSW50MTZMRShub3JtYWxFbnRyaWVzTGVuZ3RoLCAxMCk7XG5cdC8vIHNpemUgb2YgdGhlIGNlbnRyYWwgZGlyZWN0b3J5ICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0ZW9jZHJCdWZmZXIud3JpdGVVSW50MzJMRShub3JtYWxTaXplT2ZDZW50cmFsRGlyZWN0b3J5LCAxMik7XG5cdC8vIG9mZnNldCBvZiBzdGFydCBvZiBjZW50cmFsIGRpcmVjdG9yeSB3aXRoIHJlc3BlY3QgdG8gdGhlIHN0YXJ0aW5nIGRpc2sgbnVtYmVyICA0IGJ5dGVzXG5cdGVvY2RyQnVmZmVyLndyaXRlVUludDMyTEUobm9ybWFsT2Zmc2V0T2ZTdGFydE9mQ2VudHJhbERpcmVjdG9yeSwgMTYpO1xuXHQvLyAuWklQIGZpbGUgY29tbWVudCBsZW5ndGggICAgICAgICAgICAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGVvY2RyQnVmZmVyLndyaXRlVUludDE2TEUoMCwgMjApO1xuXHQvLyAuWklQIGZpbGUgY29tbWVudCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodmFyaWFibGUgc2l6ZSlcblx0Ly8gbm8gY29tbWVudFxuXG5cdGlmICghbmVlZFppcDY0Rm9ybWF0KSByZXR1cm4gZW9jZHJCdWZmZXI7XG5cblx0Ly8gWklQNjQgZm9ybWF0XG5cdC8vIFpJUDY0IEVuZCBvZiBDZW50cmFsIERpcmVjdG9yeSBSZWNvcmRcblx0dmFyIHppcDY0RW9jZHJCdWZmZXIgPSBuZXcgQnVmZmVyKFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRSk7XG5cdC8vIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpciBzaWduYXR1cmUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzICAoMHgwNjA2NGI1MClcblx0emlwNjRFb2NkckJ1ZmZlci53cml0ZVVJbnQzMkxFKDB4MDYwNjRiNTAsIDApO1xuXHQvLyBzaXplIG9mIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOCBieXRlc1xuXHR3cml0ZVVJbnQ2NExFKHppcDY0RW9jZHJCdWZmZXIsIFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRSAtIDEyLCA0KTtcblx0Ly8gdmVyc2lvbiBtYWRlIGJ5ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0emlwNjRFb2NkckJ1ZmZlci53cml0ZVVJbnQxNkxFKFZFUlNJT05fTUFERV9CWSwgMTIpO1xuXHQvLyB2ZXJzaW9uIG5lZWRlZCB0byBleHRyYWN0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMiBieXRlc1xuXHR6aXA2NEVvY2RyQnVmZmVyLndyaXRlVUludDE2TEUoVkVSU0lPTl9ORUVERURfVE9fRVhUUkFDVF9aSVA2NCwgMTQpO1xuXHQvLyBudW1iZXIgb2YgdGhpcyBkaXNrICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHR6aXA2NEVvY2RyQnVmZmVyLndyaXRlVUludDMyTEUoMCwgMTYpO1xuXHQvLyBudW1iZXIgb2YgdGhlIGRpc2sgd2l0aCB0aGUgc3RhcnQgb2YgdGhlIGNlbnRyYWwgZGlyZWN0b3J5ICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHR6aXA2NEVvY2RyQnVmZmVyLndyaXRlVUludDMyTEUoMCwgMjApO1xuXHQvLyB0b3RhbCBudW1iZXIgb2YgZW50cmllcyBpbiB0aGUgY2VudHJhbCBkaXJlY3Rvcnkgb24gdGhpcyBkaXNrICAgICAgICAgICAgICAgICAgOCBieXRlc1xuXHR3cml0ZVVJbnQ2NExFKHppcDY0RW9jZHJCdWZmZXIsIHNlbGYuZW50cmllcy5sZW5ndGgsIDI0KTtcblx0Ly8gdG90YWwgbnVtYmVyIG9mIGVudHJpZXMgaW4gdGhlIGNlbnRyYWwgZGlyZWN0b3J5ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDggYnl0ZXNcblx0d3JpdGVVSW50NjRMRSh6aXA2NEVvY2RyQnVmZmVyLCBzZWxmLmVudHJpZXMubGVuZ3RoLCAzMik7XG5cdC8vIHNpemUgb2YgdGhlIGNlbnRyYWwgZGlyZWN0b3J5ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdHdyaXRlVUludDY0TEUoemlwNjRFb2NkckJ1ZmZlciwgc2l6ZU9mQ2VudHJhbERpcmVjdG9yeSwgNDApO1xuXHQvLyBvZmZzZXQgb2Ygc3RhcnQgb2YgY2VudHJhbCBkaXJlY3Rvcnkgd2l0aCByZXNwZWN0IHRvIHRoZSBzdGFydGluZyBkaXNrIG51bWJlciAgOCBieXRlc1xuXHR3cml0ZVVJbnQ2NExFKHppcDY0RW9jZHJCdWZmZXIsIHNlbGYub2Zmc2V0T2ZTdGFydE9mQ2VudHJhbERpcmVjdG9yeSwgNDgpO1xuXHQvLyB6aXA2NCBleHRlbnNpYmxlIGRhdGEgc2VjdG9yICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHZhcmlhYmxlIHNpemUpXG5cdC8vIG5vdGhpbmcgaW4gdGhlIHppcDY0IGV4dGVuc2libGUgZGF0YSBzZWN0b3JcblxuXG5cdC8vIFpJUDY0IEVuZCBvZiBDZW50cmFsIERpcmVjdG9yeSBMb2NhdG9yXG5cdHZhciB6aXA2NEVvY2RsQnVmZmVyID0gbmV3IEJ1ZmZlcihaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfTE9DQVRPUl9TSVpFKTtcblx0Ly8gemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyIGxvY2F0b3Igc2lnbmF0dXJlICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXMgICgweDA3MDY0YjUwKVxuXHR6aXA2NEVvY2RsQnVmZmVyLndyaXRlVUludDMyTEUoMHgwNzA2NGI1MCwgMCk7XG5cdC8vIG51bWJlciBvZiB0aGUgZGlzayB3aXRoIHRoZSBzdGFydCBvZiB0aGUgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5ICA0IGJ5dGVzXG5cdHppcDY0RW9jZGxCdWZmZXIud3JpdGVVSW50MzJMRSgwLCA0KTtcblx0Ly8gcmVsYXRpdmUgb2Zmc2V0IG9mIHRoZSB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3JkICAgICAgICAgICAgIDggYnl0ZXNcblx0d3JpdGVVSW50NjRMRSh6aXA2NEVvY2RsQnVmZmVyLCBzZWxmLm91dHB1dFN0cmVhbUN1cnNvciwgOCk7XG5cdC8vIHRvdGFsIG51bWJlciBvZiBkaXNrcyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdHppcDY0RW9jZGxCdWZmZXIud3JpdGVVSW50MzJMRSgxLCAxNik7XG5cblxuXHRyZXR1cm4gQnVmZmVyLmNvbmNhdChbXG5cdFx0emlwNjRFb2NkckJ1ZmZlcixcblx0XHR6aXA2NEVvY2RsQnVmZmVyLFxuXHRcdGVvY2RyQnVmZmVyLFxuXHRdKTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVNZXRhZGF0YVBhdGgobWV0YWRhdGFQYXRoLCBpc0RpcmVjdG9yeSkge1xuXHRpZiAobWV0YWRhdGFQYXRoID09PSBcIlwiKSB0aHJvdyBuZXcgRXJyb3IoXCJlbXB0eSBtZXRhZGF0YVBhdGhcIik7XG5cdG1ldGFkYXRhUGF0aCA9IG1ldGFkYXRhUGF0aC5yZXBsYWNlKC9cXFxcL2csIFwiL1wiKTtcblx0aWYgKC9eW2EtekEtWl06Ly50ZXN0KG1ldGFkYXRhUGF0aCkgfHwgL15cXC8vLnRlc3QobWV0YWRhdGFQYXRoKSkgdGhyb3cgbmV3IEVycm9yKFwiYWJzb2x1dGUgcGF0aDogXCIgKyBtZXRhZGF0YVBhdGgpO1xuXHRpZiAobWV0YWRhdGFQYXRoLnNwbGl0KFwiL1wiKS5pbmRleE9mKFwiLi5cIikgIT09IC0xKSB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIHJlbGF0aXZlIHBhdGg6IFwiICsgbWV0YWRhdGFQYXRoKTtcblx0dmFyIGxvb2tzTGlrZURpcmVjdG9yeSA9IC9cXC8kLy50ZXN0KG1ldGFkYXRhUGF0aCk7XG5cdGlmIChpc0RpcmVjdG9yeSkge1xuXHRcdC8vIGFwcGVuZCBhIHRyYWlsaW5nICcvJyBpZiBuZWNlc3NhcnkuXG5cdFx0aWYgKCFsb29rc0xpa2VEaXJlY3RvcnkpIG1ldGFkYXRhUGF0aCArPSBcIi9cIjtcblx0fSBlbHNlIHtcblx0XHRpZiAobG9va3NMaWtlRGlyZWN0b3J5KSB0aHJvdyBuZXcgRXJyb3IoXCJmaWxlIHBhdGggY2Fubm90IGVuZCB3aXRoICcvJzogXCIgKyBtZXRhZGF0YVBhdGgpO1xuXHR9XG5cdHJldHVybiBtZXRhZGF0YVBhdGg7XG59XG5cbnZhciBkZWZhdWx0RmlsZU1vZGUgPSBwYXJzZUludChcIjAxMDA2NjRcIiwgOCk7XG52YXIgZGVmYXVsdERpcmVjdG9yeU1vZGUgPSBwYXJzZUludChcIjA0MDc3NVwiLCA4KTtcblxuLy8gdGhpcyBjbGFzcyBpcyBub3QgcGFydCBvZiB0aGUgcHVibGljIEFQSVxuZnVuY3Rpb24gRW50cnkobWV0YWRhdGFQYXRoLCBpc0RpcmVjdG9yeSwgb3B0aW9ucykge1xuXHR0aGlzLnV0ZjhGaWxlTmFtZSA9IG5ldyBCdWZmZXIobWV0YWRhdGFQYXRoKTtcblx0aWYgKHRoaXMudXRmOEZpbGVOYW1lLmxlbmd0aCA+IDB4ZmZmZikgdGhyb3cgbmV3IEVycm9yKFwidXRmOCBmaWxlIG5hbWUgdG9vIGxvbmcuIFwiICsgdXRmOEZpbGVOYW1lLmxlbmd0aCArIFwiID4gXCIgKyAweGZmZmYpO1xuXHR0aGlzLmlzRGlyZWN0b3J5ID0gaXNEaXJlY3Rvcnk7XG5cdHRoaXMuc3RhdGUgPSBFbnRyeS5XQUlUSU5HX0ZPUl9NRVRBREFUQTtcblx0dGhpcy5zZXRMYXN0TW9kRGF0ZShvcHRpb25zLm10aW1lICE9IG51bGwgPyBvcHRpb25zLm10aW1lIDogbmV3IERhdGUoKSk7XG5cdGlmIChvcHRpb25zLm1vZGUgIT0gbnVsbCkge1xuXHRcdHRoaXMuc2V0RmlsZUF0dHJpYnV0ZXNNb2RlKG9wdGlvbnMubW9kZSk7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5zZXRGaWxlQXR0cmlidXRlc01vZGUoaXNEaXJlY3RvcnkgPyBkZWZhdWx0RGlyZWN0b3J5TW9kZSA6IGRlZmF1bHRGaWxlTW9kZSk7XG5cdH1cblx0aWYgKGlzRGlyZWN0b3J5KSB7XG5cdFx0dGhpcy5jcmNBbmRGaWxlU2l6ZUtub3duID0gdHJ1ZTtcblx0XHR0aGlzLmNyYzMyID0gMDtcblx0XHR0aGlzLnVuY29tcHJlc3NlZFNpemUgPSAwO1xuXHRcdHRoaXMuY29tcHJlc3NlZFNpemUgPSAwO1xuXHR9IGVsc2Uge1xuXHRcdC8vIHVua25vd24gc28gZmFyXG5cdFx0dGhpcy5jcmNBbmRGaWxlU2l6ZUtub3duID0gZmFsc2U7XG5cdFx0dGhpcy5jcmMzMiA9IG51bGw7XG5cdFx0dGhpcy51bmNvbXByZXNzZWRTaXplID0gbnVsbDtcblx0XHR0aGlzLmNvbXByZXNzZWRTaXplID0gbnVsbDtcblx0XHRpZiAob3B0aW9ucy5zaXplICE9IG51bGwpIHRoaXMudW5jb21wcmVzc2VkU2l6ZSA9IG9wdGlvbnMuc2l6ZTtcblx0fVxuXHRpZiAoaXNEaXJlY3RvcnkpIHtcblx0XHR0aGlzLmNvbXByZXNzID0gZmFsc2U7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5jb21wcmVzcyA9IHRydWU7IC8vIGRlZmF1bHRcblx0XHRpZiAob3B0aW9ucy5jb21wcmVzcyAhPSBudWxsKSB0aGlzLmNvbXByZXNzID0gISFvcHRpb25zLmNvbXByZXNzO1xuXHR9XG5cdHRoaXMuZm9yY2VaaXA2NEZvcm1hdCA9ICEhb3B0aW9ucy5mb3JjZVppcDY0Rm9ybWF0O1xufVxuXG5FbnRyeS5XQUlUSU5HX0ZPUl9NRVRBREFUQSA9IDA7XG5FbnRyeS5SRUFEWV9UT19QVU1QX0ZJTEVfREFUQSA9IDE7XG5FbnRyeS5GSUxFX0RBVEFfSU5fUFJPR1JFU1MgPSAyO1xuRW50cnkuRklMRV9EQVRBX0RPTkUgPSAzO1xuRW50cnkucHJvdG90eXBlLnNldExhc3RNb2REYXRlID0gZnVuY3Rpb24gKGRhdGUpIHtcblx0dmFyIGRvc0RhdGVUaW1lID0gZGF0ZVRvRG9zRGF0ZVRpbWUoZGF0ZSk7XG5cdHRoaXMubGFzdE1vZEZpbGVUaW1lID0gZG9zRGF0ZVRpbWUudGltZTtcblx0dGhpcy5sYXN0TW9kRmlsZURhdGUgPSBkb3NEYXRlVGltZS5kYXRlO1xufTtcbkVudHJ5LnByb3RvdHlwZS5zZXRGaWxlQXR0cmlidXRlc01vZGUgPSBmdW5jdGlvbiAobW9kZSkge1xuXHRpZiAoKG1vZGUgJiAweGZmZmYpICE9PSBtb2RlKSB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIG1vZGUuIGV4cGVjdGVkOiAwIDw9IFwiICsgbW9kZSArIFwiIDw9IFwiICsgMHhmZmZmKTtcblx0Ly8gaHR0cDovL3VuaXguc3RhY2tleGNoYW5nZS5jb20vcXVlc3Rpb25zLzE0NzA1L3RoZS16aXAtZm9ybWF0cy1leHRlcm5hbC1maWxlLWF0dHJpYnV0ZS8xNDcyNyMxNDcyN1xuXHR0aGlzLmV4dGVybmFsRmlsZUF0dHJpYnV0ZXMgPSAobW9kZSA8PCAxNikgPj4+IDA7XG59O1xuLy8gZG9GaWxlRGF0YVB1bXAoKSBzaG91bGQgbm90IGNhbGwgcHVtcEVudHJpZXMoKSBkaXJlY3RseS4gc2VlIGlzc3VlICM5LlxuRW50cnkucHJvdG90eXBlLnNldEZpbGVEYXRhUHVtcEZ1bmN0aW9uID0gZnVuY3Rpb24gKGRvRmlsZURhdGFQdW1wKSB7XG5cdHRoaXMuZG9GaWxlRGF0YVB1bXAgPSBkb0ZpbGVEYXRhUHVtcDtcblx0dGhpcy5zdGF0ZSA9IEVudHJ5LlJFQURZX1RPX1BVTVBfRklMRV9EQVRBO1xufTtcbkVudHJ5LnByb3RvdHlwZS51c2VaaXA2NEZvcm1hdCA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIChcblx0XHQodGhpcy5mb3JjZVppcDY0Rm9ybWF0KSB8fFxuXHRcdCh0aGlzLnVuY29tcHJlc3NlZFNpemUgIT0gbnVsbCAmJiB0aGlzLnVuY29tcHJlc3NlZFNpemUgPiAweGZmZmZmZmZlKSB8fFxuXHRcdCh0aGlzLmNvbXByZXNzZWRTaXplICE9IG51bGwgJiYgdGhpcy5jb21wcmVzc2VkU2l6ZSA+IDB4ZmZmZmZmZmUpIHx8XG5cdFx0KHRoaXMucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyICE9IG51bGwgJiYgdGhpcy5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgPiAweGZmZmZmZmZlKVxuXHQpO1xufVxudmFyIExPQ0FMX0ZJTEVfSEVBREVSX0ZJWEVEX1NJWkUgPSAzMDtcbnZhciBWRVJTSU9OX05FRURFRF9UT19FWFRSQUNUX1VURjggPSAyMDtcbnZhciBWRVJTSU9OX05FRURFRF9UT19FWFRSQUNUX1pJUDY0ID0gNDU7XG4vLyAzID0gdW5peC4gNjMgPSBzcGVjIHZlcnNpb24gNi4zXG52YXIgVkVSU0lPTl9NQURFX0JZID0gKDMgPDwgOCkgfCA2MztcbnZhciBGSUxFX05BTUVfSVNfVVRGOCA9IDEgPDwgMTE7XG52YXIgVU5LTk9XTl9DUkMzMl9BTkRfRklMRV9TSVpFUyA9IDEgPDwgMztcbkVudHJ5LnByb3RvdHlwZS5nZXRMb2NhbEZpbGVIZWFkZXIgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBjcmMzMiA9IDA7XG5cdHZhciBjb21wcmVzc2VkU2l6ZSA9IDA7XG5cdHZhciB1bmNvbXByZXNzZWRTaXplID0gMDtcblx0aWYgKHRoaXMuY3JjQW5kRmlsZVNpemVLbm93bikge1xuXHRcdGNyYzMyID0gdGhpcy5jcmMzMjtcblx0XHRjb21wcmVzc2VkU2l6ZSA9IHRoaXMuY29tcHJlc3NlZFNpemU7XG5cdFx0dW5jb21wcmVzc2VkU2l6ZSA9IHRoaXMudW5jb21wcmVzc2VkU2l6ZTtcblx0fVxuXG5cdHZhciBmaXhlZFNpemVTdHVmZiA9IG5ldyBCdWZmZXIoTE9DQUxfRklMRV9IRUFERVJfRklYRURfU0laRSk7XG5cdHZhciBnZW5lcmFsUHVycG9zZUJpdEZsYWcgPSBGSUxFX05BTUVfSVNfVVRGODtcblx0aWYgKCF0aGlzLmNyY0FuZEZpbGVTaXplS25vd24pIGdlbmVyYWxQdXJwb3NlQml0RmxhZyB8PSBVTktOT1dOX0NSQzMyX0FORF9GSUxFX1NJWkVTO1xuXG5cdC8vIGxvY2FsIGZpbGUgaGVhZGVyIHNpZ25hdHVyZSAgICAgNCBieXRlcyAgKDB4MDQwMzRiNTApXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUoMHgwNDAzNGI1MCwgMCk7XG5cdC8vIHZlcnNpb24gbmVlZGVkIHRvIGV4dHJhY3QgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKFZFUlNJT05fTkVFREVEX1RPX0VYVFJBQ1RfVVRGOCwgNCk7XG5cdC8vIGdlbmVyYWwgcHVycG9zZSBiaXQgZmxhZyAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKGdlbmVyYWxQdXJwb3NlQml0RmxhZywgNik7XG5cdC8vIGNvbXByZXNzaW9uIG1ldGhvZCAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHRoaXMuZ2V0Q29tcHJlc3Npb25NZXRob2QoKSwgOCk7XG5cdC8vIGxhc3QgbW9kIGZpbGUgdGltZSAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHRoaXMubGFzdE1vZEZpbGVUaW1lLCAxMCk7XG5cdC8vIGxhc3QgbW9kIGZpbGUgZGF0ZSAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHRoaXMubGFzdE1vZEZpbGVEYXRlLCAxMik7XG5cdC8vIGNyYy0zMiAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKGNyYzMyLCAxNCk7XG5cdC8vIGNvbXByZXNzZWQgc2l6ZSAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKGNvbXByZXNzZWRTaXplLCAxOCk7XG5cdC8vIHVuY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgNCBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKHVuY29tcHJlc3NlZFNpemUsIDIyKTtcblx0Ly8gZmlsZSBuYW1lIGxlbmd0aCAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodGhpcy51dGY4RmlsZU5hbWUubGVuZ3RoLCAyNik7XG5cdC8vIGV4dHJhIGZpZWxkIGxlbmd0aCAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKDAsIDI4KTtcblx0cmV0dXJuIEJ1ZmZlci5jb25jYXQoW1xuXHRcdGZpeGVkU2l6ZVN0dWZmLFxuXHRcdC8vIGZpbGUgbmFtZSAodmFyaWFibGUgc2l6ZSlcblx0XHR0aGlzLnV0ZjhGaWxlTmFtZSxcblx0XHQvLyBleHRyYSBmaWVsZCAodmFyaWFibGUgc2l6ZSlcblx0XHQvLyBubyBleHRyYSBmaWVsZHNcblx0XSk7XG59O1xudmFyIERBVEFfREVTQ1JJUFRPUl9TSVpFID0gMTY7XG52YXIgWklQNjRfREFUQV9ERVNDUklQVE9SX1NJWkUgPSAyNDtcbkVudHJ5LnByb3RvdHlwZS5nZXREYXRhRGVzY3JpcHRvciA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKHRoaXMuY3JjQW5kRmlsZVNpemVLbm93bikge1xuXHRcdC8vIHRoZSBNYWMgQXJjaGl2ZSBVdGlsaXR5IHJlcXVpcmVzIHRoaXMgbm90IGJlIHByZXNlbnQgdW5sZXNzIHdlIHNldCBnZW5lcmFsIHB1cnBvc2UgYml0IDNcblx0XHRyZXR1cm4gbmV3IEJ1ZmZlcigwKTtcblx0fVxuXHRpZiAoIXRoaXMudXNlWmlwNjRGb3JtYXQoKSkge1xuXHRcdHZhciBidWZmZXIgPSBuZXcgQnVmZmVyKERBVEFfREVTQ1JJUFRPUl9TSVpFKTtcblx0XHQvLyBvcHRpb25hbCBzaWduYXR1cmUgKHJlcXVpcmVkIGFjY29yZGluZyB0byBBcmNoaXZlIFV0aWxpdHkpXG5cdFx0YnVmZmVyLndyaXRlVUludDMyTEUoMHgwODA3NGI1MCwgMCk7XG5cdFx0Ly8gY3JjLTMyICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdFx0YnVmZmVyLndyaXRlVUludDMyTEUodGhpcy5jcmMzMiwgNCk7XG5cdFx0Ly8gY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdFx0YnVmZmVyLndyaXRlVUludDMyTEUodGhpcy5jb21wcmVzc2VkU2l6ZSwgOCk7XG5cdFx0Ly8gdW5jb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdFx0YnVmZmVyLndyaXRlVUludDMyTEUodGhpcy51bmNvbXByZXNzZWRTaXplLCAxMik7XG5cdFx0cmV0dXJuIGJ1ZmZlcjtcblx0fSBlbHNlIHtcblx0XHQvLyBaSVA2NCBmb3JtYXRcblx0XHR2YXIgYnVmZmVyID0gbmV3IEJ1ZmZlcihaSVA2NF9EQVRBX0RFU0NSSVBUT1JfU0laRSk7XG5cdFx0Ly8gb3B0aW9uYWwgc2lnbmF0dXJlICh1bmtub3duIGlmIGFueW9uZSBjYXJlcyBhYm91dCB0aGlzKVxuXHRcdGJ1ZmZlci53cml0ZVVJbnQzMkxFKDB4MDgwNzRiNTAsIDApO1xuXHRcdC8vIGNyYy0zMiAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRcdGJ1ZmZlci53cml0ZVVJbnQzMkxFKHRoaXMuY3JjMzIsIDQpO1xuXHRcdC8vIGNvbXByZXNzZWQgc2l6ZSAgICAgICAgICAgICAgICAgOCBieXRlc1xuXHRcdHdyaXRlVUludDY0TEUoYnVmZmVyLCB0aGlzLmNvbXByZXNzZWRTaXplLCA4KTtcblx0XHQvLyB1bmNvbXByZXNzZWQgc2l6ZSAgICAgICAgICAgICAgIDggYnl0ZXNcblx0XHR3cml0ZVVJbnQ2NExFKGJ1ZmZlciwgdGhpcy51bmNvbXByZXNzZWRTaXplLCAxNik7XG5cdFx0cmV0dXJuIGJ1ZmZlcjtcblx0fVxufTtcbnZhciBDRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfRklYRURfU0laRSA9IDQ2O1xudmFyIFpJUDY0X0VYVEVOREVEX0lORk9STUFUSU9OX0VYVFJBX0ZJRUxEX1NJWkUgPSAyODtcbkVudHJ5LnByb3RvdHlwZS5nZXRDZW50cmFsRGlyZWN0b3J5UmVjb3JkID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgZml4ZWRTaXplU3R1ZmYgPSBuZXcgQnVmZmVyKENFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9GSVhFRF9TSVpFKTtcblx0dmFyIGdlbmVyYWxQdXJwb3NlQml0RmxhZyA9IEZJTEVfTkFNRV9JU19VVEY4O1xuXHRpZiAoIXRoaXMuY3JjQW5kRmlsZVNpemVLbm93bikgZ2VuZXJhbFB1cnBvc2VCaXRGbGFnIHw9IFVOS05PV05fQ1JDMzJfQU5EX0ZJTEVfU0laRVM7XG5cblx0dmFyIG5vcm1hbENvbXByZXNzZWRTaXplID0gdGhpcy5jb21wcmVzc2VkU2l6ZTtcblx0dmFyIG5vcm1hbFVuY29tcHJlc3NlZFNpemUgPSB0aGlzLnVuY29tcHJlc3NlZFNpemU7XG5cdHZhciBub3JtYWxSZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgPSB0aGlzLnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlcjtcblx0dmFyIHZlcnNpb25OZWVkZWRUb0V4dHJhY3Q7XG5cdHZhciB6ZWllZkJ1ZmZlcjtcblx0aWYgKHRoaXMudXNlWmlwNjRGb3JtYXQoKSkge1xuXHRcdG5vcm1hbENvbXByZXNzZWRTaXplID0gMHhmZmZmZmZmZjtcblx0XHRub3JtYWxVbmNvbXByZXNzZWRTaXplID0gMHhmZmZmZmZmZjtcblx0XHRub3JtYWxSZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgPSAweGZmZmZmZmZmO1xuXHRcdHZlcnNpb25OZWVkZWRUb0V4dHJhY3QgPSBWRVJTSU9OX05FRURFRF9UT19FWFRSQUNUX1pJUDY0O1xuXG5cdFx0Ly8gWklQNjQgZXh0ZW5kZWQgaW5mb3JtYXRpb24gZXh0cmEgZmllbGRcblx0XHR6ZWllZkJ1ZmZlciA9IG5ldyBCdWZmZXIoWklQNjRfRVhURU5ERURfSU5GT1JNQVRJT05fRVhUUkFfRklFTERfU0laRSk7XG5cdFx0Ly8gMHgwMDAxICAgICAgICAgICAgICAgICAgMiBieXRlcyAgICBUYWcgZm9yIHRoaXMgXCJleHRyYVwiIGJsb2NrIHR5cGVcblx0XHR6ZWllZkJ1ZmZlci53cml0ZVVJbnQxNkxFKDB4MDAwMSwgMCk7XG5cdFx0Ly8gU2l6ZSAgICAgICAgICAgICAgICAgICAgMiBieXRlcyAgICBTaXplIG9mIHRoaXMgXCJleHRyYVwiIGJsb2NrXG5cdFx0emVpZWZCdWZmZXIud3JpdGVVSW50MTZMRShaSVA2NF9FWFRFTkRFRF9JTkZPUk1BVElPTl9FWFRSQV9GSUVMRF9TSVpFIC0gNCwgMik7XG5cdFx0Ly8gT3JpZ2luYWwgU2l6ZSAgICAgICAgICAgOCBieXRlcyAgICBPcmlnaW5hbCB1bmNvbXByZXNzZWQgZmlsZSBzaXplXG5cdFx0d3JpdGVVSW50NjRMRSh6ZWllZkJ1ZmZlciwgdGhpcy51bmNvbXByZXNzZWRTaXplLCA0KTtcblx0XHQvLyBDb21wcmVzc2VkIFNpemUgICAgICAgICA4IGJ5dGVzICAgIFNpemUgb2YgY29tcHJlc3NlZCBkYXRhXG5cdFx0d3JpdGVVSW50NjRMRSh6ZWllZkJ1ZmZlciwgdGhpcy5jb21wcmVzc2VkU2l6ZSwgMTIpO1xuXHRcdC8vIFJlbGF0aXZlIEhlYWRlciBPZmZzZXQgIDggYnl0ZXMgICAgT2Zmc2V0IG9mIGxvY2FsIGhlYWRlciByZWNvcmRcblx0XHR3cml0ZVVJbnQ2NExFKHplaWVmQnVmZmVyLCB0aGlzLnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciwgMjApO1xuXHRcdC8vIERpc2sgU3RhcnQgTnVtYmVyICAgICAgIDQgYnl0ZXMgICAgTnVtYmVyIG9mIHRoZSBkaXNrIG9uIHdoaWNoIHRoaXMgZmlsZSBzdGFydHNcblx0XHQvLyAob21pdClcblx0fSBlbHNlIHtcblx0XHR2ZXJzaW9uTmVlZGVkVG9FeHRyYWN0ID0gVkVSU0lPTl9ORUVERURfVE9fRVhUUkFDVF9VVEY4O1xuXHRcdHplaWVmQnVmZmVyID0gbmV3IEJ1ZmZlcigwKTtcblx0fVxuXG5cdC8vIGNlbnRyYWwgZmlsZSBoZWFkZXIgc2lnbmF0dXJlICAgNCBieXRlcyAgKDB4MDIwMTRiNTApXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUoMHgwMjAxNGI1MCwgMCk7XG5cdC8vIHZlcnNpb24gbWFkZSBieSAgICAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKFZFUlNJT05fTUFERV9CWSwgNCk7XG5cdC8vIHZlcnNpb24gbmVlZGVkIHRvIGV4dHJhY3QgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHZlcnNpb25OZWVkZWRUb0V4dHJhY3QsIDYpO1xuXHQvLyBnZW5lcmFsIHB1cnBvc2UgYml0IGZsYWcgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRShnZW5lcmFsUHVycG9zZUJpdEZsYWcsIDgpO1xuXHQvLyBjb21wcmVzc2lvbiBtZXRob2QgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLmdldENvbXByZXNzaW9uTWV0aG9kKCksIDEwKTtcblx0Ly8gbGFzdCBtb2QgZmlsZSB0aW1lICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodGhpcy5sYXN0TW9kRmlsZVRpbWUsIDEyKTtcblx0Ly8gbGFzdCBtb2QgZmlsZSBkYXRlICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodGhpcy5sYXN0TW9kRmlsZURhdGUsIDE0KTtcblx0Ly8gY3JjLTMyICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUodGhpcy5jcmMzMiwgMTYpO1xuXHQvLyBjb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRShub3JtYWxDb21wcmVzc2VkU2l6ZSwgMjApO1xuXHQvLyB1bmNvbXByZXNzZWQgc2l6ZSAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRShub3JtYWxVbmNvbXByZXNzZWRTaXplLCAyNCk7XG5cdC8vIGZpbGUgbmFtZSBsZW5ndGggICAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHRoaXMudXRmOEZpbGVOYW1lLmxlbmd0aCwgMjgpO1xuXHQvLyBleHRyYSBmaWVsZCBsZW5ndGggICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh6ZWllZkJ1ZmZlci5sZW5ndGgsIDMwKTtcblx0Ly8gZmlsZSBjb21tZW50IGxlbmd0aCAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoMCwgMzIpO1xuXHQvLyBkaXNrIG51bWJlciBzdGFydCAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSgwLCAzNCk7XG5cdC8vIGludGVybmFsIGZpbGUgYXR0cmlidXRlcyAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKDAsIDM2KTtcblx0Ly8gZXh0ZXJuYWwgZmlsZSBhdHRyaWJ1dGVzICAgICAgICA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUodGhpcy5leHRlcm5hbEZpbGVBdHRyaWJ1dGVzLCAzOCk7XG5cdC8vIHJlbGF0aXZlIG9mZnNldCBvZiBsb2NhbCBoZWFkZXIgNCBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKG5vcm1hbFJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciwgNDIpO1xuXG5cdHJldHVybiBCdWZmZXIuY29uY2F0KFtcblx0XHRmaXhlZFNpemVTdHVmZixcblx0XHQvLyBmaWxlIG5hbWUgKHZhcmlhYmxlIHNpemUpXG5cdFx0dGhpcy51dGY4RmlsZU5hbWUsXG5cdFx0Ly8gZXh0cmEgZmllbGQgKHZhcmlhYmxlIHNpemUpXG5cdFx0emVpZWZCdWZmZXIsXG5cdFx0Ly8gZmlsZSBjb21tZW50ICh2YXJpYWJsZSBzaXplKVxuXHRcdC8vIGVtcHR5IGNvbW1lbnRcblx0XSk7XG59O1xuRW50cnkucHJvdG90eXBlLmdldENvbXByZXNzaW9uTWV0aG9kID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgTk9fQ09NUFJFU1NJT04gPSAwO1xuXHR2YXIgREVGTEFURV9DT01QUkVTU0lPTiA9IDg7XG5cdHJldHVybiB0aGlzLmNvbXByZXNzID8gREVGTEFURV9DT01QUkVTU0lPTiA6IE5PX0NPTVBSRVNTSU9OO1xufTtcblxuZnVuY3Rpb24gZGF0ZVRvRG9zRGF0ZVRpbWUoanNEYXRlKSB7XG5cdHZhciBkYXRlID0gMDtcblx0ZGF0ZSB8PSBqc0RhdGUuZ2V0RGF0ZSgpICYgMHgxZjsgLy8gMS0zMVxuXHRkYXRlIHw9ICgoanNEYXRlLmdldE1vbnRoKCkgKyAxKSAmIDB4ZikgPDwgNTsgLy8gMC0xMSwgMS0xMlxuXHRkYXRlIHw9ICgoanNEYXRlLmdldEZ1bGxZZWFyKCkgLSAxOTgwKSAmIDB4N2YpIDw8IDk7IC8vIDAtMTI4LCAxOTgwLTIxMDhcblxuXHR2YXIgdGltZSA9IDA7XG5cdHRpbWUgfD0gTWF0aC5mbG9vcihqc0RhdGUuZ2V0U2Vjb25kcygpIC8gMik7IC8vIDAtNTksIDAtMjkgKGxvc2Ugb2RkIG51bWJlcnMpXG5cdHRpbWUgfD0gKGpzRGF0ZS5nZXRNaW51dGVzKCkgJiAweDNmKSA8PCA1OyAvLyAwLTU5XG5cdHRpbWUgfD0gKGpzRGF0ZS5nZXRIb3VycygpICYgMHgxZikgPDwgMTE7IC8vIDAtMjNcblxuXHRyZXR1cm4ge2RhdGU6IGRhdGUsIHRpbWU6IHRpbWV9O1xufVxuXG5mdW5jdGlvbiB3cml0ZVVJbnQ2NExFKGJ1ZmZlciwgbiwgb2Zmc2V0KSB7XG5cdC8vIGNhbid0IHVzZSBiaXRzaGlmdCBoZXJlLCBiZWNhdXNlIEphdmFTY3JpcHQgb25seSBhbGxvd3MgYml0c2hpdGluZyBvbiAzMi1iaXQgaW50ZWdlcnMuXG5cdHZhciBoaWdoID0gTWF0aC5mbG9vcihuIC8gMHgxMDAwMDAwMDApO1xuXHR2YXIgbG93ID0gbiAlIDB4MTAwMDAwMDAwO1xuXHRidWZmZXIud3JpdGVVSW50MzJMRShsb3csIG9mZnNldCk7XG5cdGJ1ZmZlci53cml0ZVVJbnQzMkxFKGhpZ2gsIG9mZnNldCArIDQpO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0Q2FsbGJhY2soZXJyKSB7XG5cdGlmIChlcnIpIHRocm93IGVycjtcbn1cblxudXRpbC5pbmhlcml0cyhCeXRlQ291bnRlciwgVHJhbnNmb3JtKTtcblxuZnVuY3Rpb24gQnl0ZUNvdW50ZXIob3B0aW9ucykge1xuXHRUcmFuc2Zvcm0uY2FsbCh0aGlzLCBvcHRpb25zKTtcblx0dGhpcy5ieXRlQ291bnQgPSAwO1xufVxuXG5CeXRlQ291bnRlci5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uIChjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG5cdHRoaXMuYnl0ZUNvdW50ICs9IGNodW5rLmxlbmd0aDtcblx0Y2IobnVsbCwgY2h1bmspO1xufTtcblxudXRpbC5pbmhlcml0cyhDcmMzMldhdGNoZXIsIFRyYW5zZm9ybSk7XG5cbmZ1bmN0aW9uIENyYzMyV2F0Y2hlcihvcHRpb25zKSB7XG5cdFRyYW5zZm9ybS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXHR0aGlzLmNyYzMyID0gMDtcbn1cblxuQ3JjMzJXYXRjaGVyLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24gKGNodW5rLCBlbmNvZGluZywgY2IpIHtcblx0dGhpcy5jcmMzMiA9IGNyYzMyLnVuc2lnbmVkKGNodW5rLCB0aGlzLmNyYzMyKTtcblx0Y2IobnVsbCwgY2h1bmspO1xufTsiXX0=
