httpinteractRequire=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/home/cosmin/Workspace/reorganizing/privatesky/builds/tmp/httpinteract_intermediar.js":[function(require,module,exports){
(function (global){
global.httpinteractLoadModules = function(){ 
	$$.__runtimeModules["interact"] = require("interact");
	$$.__runtimeModules["psk-http-client"] = require("psk-http-client");
}
if (false) {
	httpinteractLoadModules();
}; 
global.httpinteractRequire = require;
if (typeof $$ !== "undefined") {            
    $$.requireBundle("httpinteract");
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"interact":"interact","psk-http-client":"psk-http-client"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/SoundPubSubMQBasedInteractionSpace.js":[function(require,module,exports){
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
},{"./../swarmInteraction":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/swarmInteraction.js","foldermq":false,"swarmutils":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/httpInteractionSpace.js":[function(require,module,exports){
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


},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-abstract-client.js":[function(require,module,exports){
(function (Buffer){
const msgpack = require('@msgpack/msgpack');

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
            if(ArrayBuffer.isView(result) || Buffer.isBuffer(result)) {
                result = msgpack.decode(result);
            }

            result = typeof result === "string" ? JSON.parse(result) : result;

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
                    if(Buffer.isBuffer(res) || ArrayBuffer.isView(res)) {
                        res = msgpack.decode(res);
                    }

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
        const swarm = new OwM();
        swarm.setMeta("swarmId", $$.uidGenerator.safe_uuid());
        swarm.setMeta("requestId", swarm.getMeta("swarmId"));
        swarm.setMeta("swarmTypeName", swarmName);
        swarm.setMeta("phaseName", phaseName);
        swarm.setMeta("args", args);
        swarm.setMeta("command", "executeSwarmPhase");
        swarm.setMeta("target", domainInfo.agentUrl);
        swarm.setMeta("homeSecurityContext", returnRemoteEndPoint+$$.remote.base64Encode(homeSecurityContext));

        $$.remote.doHttpPost(getRemote(remoteEndPoint, domainInfo.domain), msgpack.encode(swarm), function(err, res){
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

        $$.remote.doHttpPost(getRemote(remoteEndPoint, domainInfo.domain), msgpack.encode(swarm), function(err, res){
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
            result = OwM.prototype.convert(result);
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

}).call(this,{"isBuffer":require("../../../node_modules/is-buffer/index.js")})

},{"../../../node_modules/is-buffer/index.js":"/home/cosmin/Workspace/reorganizing/privatesky/node_modules/is-buffer/index.js","@msgpack/msgpack":false,"swarmutils":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-browser-client.js":[function(require,module,exports){
(function (Buffer){
$$.remote.doHttpPost = function (url, data, callback) {
    const xhr = new XMLHttpRequest();

    xhr.onload = function () {
        if (xhr.readyState === 4 && (xhr.status >= 200 && xhr.status < 300)) {
            const data = xhr.response;
            callback(null, data);
        } else {
            if(xhr.status>=400){
                callback(new Error("An error occured. StatusCode: " + xhr.status));
            } else {
                console.log(`Status code ${xhr.status} received, response is ignored.`);
            }
        }
    };

    xhr.open("POST", url, true);
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
        if(ArrayBuffer.isView(data)) {
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        }

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

	if(ArrayBuffer.isView(data) || Buffer.isBuffer(data)) {
		if(!Buffer.isBuffer(data)) {
			data = Buffer.from(data);
		}

		options.headers['Content-Type'] = 'application/octet-stream';
		options.headers['Content-Length'] = data.length;
	}

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

    if(typeof data !== 'string' && !Buffer.isBuffer(data) && !ArrayBuffer.isView(data)) {
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

},{"./psk-abstract-client":"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-abstract-client.js","buffer":false,"http":false,"https":false,"url":false}],"/home/cosmin/Workspace/reorganizing/privatesky/node_modules/is-buffer/index.js":[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],"interact":[function(require,module,exports){
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
},{"./lib/interactionSpaceImpl/SoundPubSubMQBasedInteractionSpace":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/SoundPubSubMQBasedInteractionSpace.js","./lib/interactionSpaceImpl/WebViewMQInteractionSpace":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/WebViewMQInteractionSpace.js","./lib/interactionSpaceImpl/WindowMQInteractionSpace":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/WindowMQInteractionSpace.js","./lib/interactionSpaceImpl/folderMQBasedInteractionSpace":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/folderMQBasedInteractionSpace.js","./lib/interactionSpaceImpl/httpInteractionSpace":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/httpInteractionSpace.js","./lib/interactionSpaceImpl/specificMQImpl/ChildWebViewMQ":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWebViewMQ.js","./lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ":"/home/cosmin/Workspace/reorganizing/privatesky/modules/interact/lib/interactionSpaceImpl/specificMQImpl/ChildWndMQ.js"}],"psk-http-client":[function(require,module,exports){
//to look nice the requireModule on Node
require("./lib/psk-abstract-client");
if(!$$.browserRuntime){
	require("./lib/psk-node-client");
}else{
	require("./lib/psk-browser-client");
}
},{"./lib/psk-abstract-client":"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-abstract-client.js","./lib/psk-browser-client":"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-browser-client.js","./lib/psk-node-client":"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-node-client.js"}]},{},["/home/cosmin/Workspace/reorganizing/privatesky/builds/tmp/httpinteract_intermediar.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZHMvdG1wL2h0dHBpbnRlcmFjdF9pbnRlcm1lZGlhci5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1NvdW5kUHViU3ViTVFCYXNlZEludGVyYWN0aW9uU3BhY2UuanMiLCJtb2R1bGVzL2ludGVyYWN0L2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9XZWJWaWV3TVFJbnRlcmFjdGlvblNwYWNlLmpzIiwibW9kdWxlcy9pbnRlcmFjdC9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvV2luZG93TVFJbnRlcmFjdGlvblNwYWNlLmpzIiwibW9kdWxlcy9pbnRlcmFjdC9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvZm9sZGVyTVFCYXNlZEludGVyYWN0aW9uU3BhY2UuanMiLCJtb2R1bGVzL2ludGVyYWN0L2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9odHRwSW50ZXJhY3Rpb25TcGFjZS5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL3NwZWNpZmljTVFJbXBsL0NoaWxkV2ViVmlld01RLmpzIiwibW9kdWxlcy9pbnRlcmFjdC9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvc3BlY2lmaWNNUUltcGwvQ2hpbGRXbmRNUS5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL3N3YXJtSW50ZXJhY3Rpb24uanMiLCJtb2R1bGVzL3Bzay1odHRwLWNsaWVudC9saWIvcHNrLWFic3RyYWN0LWNsaWVudC5qcyIsIm1vZHVsZXMvcHNrLWh0dHAtY2xpZW50L2xpYi9wc2stYnJvd3Nlci1jbGllbnQuanMiLCJtb2R1bGVzL3Bzay1odHRwLWNsaWVudC9saWIvcHNrLW5vZGUtY2xpZW50LmpzIiwibm9kZV9tb2R1bGVzL2lzLWJ1ZmZlci9pbmRleC5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvaW5kZXguanMiLCJtb2R1bGVzL3Bzay1odHRwLWNsaWVudC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdlhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiZ2xvYmFsLmh0dHBpbnRlcmFjdExvYWRNb2R1bGVzID0gZnVuY3Rpb24oKXsgXG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJpbnRlcmFjdFwiXSA9IHJlcXVpcmUoXCJpbnRlcmFjdFwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcInBzay1odHRwLWNsaWVudFwiXSA9IHJlcXVpcmUoXCJwc2staHR0cC1jbGllbnRcIik7XG59XG5pZiAoZmFsc2UpIHtcblx0aHR0cGludGVyYWN0TG9hZE1vZHVsZXMoKTtcbn07IFxuZ2xvYmFsLmh0dHBpbnRlcmFjdFJlcXVpcmUgPSByZXF1aXJlO1xuaWYgKHR5cGVvZiAkJCAhPT0gXCJ1bmRlZmluZWRcIikgeyAgICAgICAgICAgIFxuICAgICQkLnJlcXVpcmVCdW5kbGUoXCJodHRwaW50ZXJhY3RcIik7XG59OyIsImZ1bmN0aW9uIE1lbW9yeU1RSW50ZXJhY3Rpb25TcGFjZSgpIHtcbiAgICB2YXIgc3dhcm1JbnRlcmFjdCA9IHJlcXVpcmUoXCIuLy4uL3N3YXJtSW50ZXJhY3Rpb25cIik7XG4gICAgdmFyIHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVycyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gZGlzcGF0Y2hpbmdTd2FybXMoc3dhcm0pe1xuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBzdWJzTGlzdCA9IHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybS5tZXRhLnN3YXJtSWRdO1xuICAgICAgICAgICAgaWYoc3Vic0xpc3Qpe1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpPHN1YnNMaXN0Lmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBzdWJzTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcihudWxsLCBzd2FybSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCAxKTtcbiAgICB9XG5cbiAgICB2YXIgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICBmdW5jdGlvbiBpbml0KCl7XG5cdFx0aWYoIWluaXRpYWxpemVkKXtcblx0XHRcdGluaXRpYWxpemVkID0gdHJ1ZTtcblx0XHRcdCQkLlBTS19QdWJTdWIuc3Vic2NyaWJlKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBkaXNwYXRjaGluZ1N3YXJtcyk7XG5cdFx0fVxuICAgIH1cblxuICAgIHZhciBjb21tID0ge1xuICAgICAgICBzdGFydFN3YXJtOiBmdW5jdGlvbiAoc3dhcm1OYW1lLCBjdG9yLCBhcmdzKSB7XG5cdFx0XHRpbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gJCQuc3dhcm0uc3RhcnQoc3dhcm1OYW1lLCBjdG9yLCAuLi5hcmdzKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29udGludWVTd2FybTogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgc3dhcm1TZXJpYWxpc2F0aW9uLCBjdG9yLCBhcmdzKSB7XG5cdFx0XHRpbml0KCk7XG4gICAgICAgICAgICBzd2FybUhhbmRsZXJbY3Rvcl0uYXBwbHkoc3dhcm1IYW5kbGVyLCBhcmdzKTtcbiAgICAgICAgfSxcbiAgICAgICAgb246IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIGNhbGxiYWNrKSB7XG5cdFx0XHRpbml0KCk7XG4gICAgICAgICAgICBpZighc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXSl7XG5cdFx0XHRcdHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybUhhbmRsZXIuZ2V0SW5uZXJWYWx1ZSgpLm1ldGEuc3dhcm1JZF0gPSBbIGNhbGxiYWNrIF07XG4gICAgICAgICAgICB9ZWxzZXtcblx0XHRcdFx0c3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb2ZmOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyKSB7XG5cdFx0XHRpZihzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm1IYW5kbGVyLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtSWRdKXtcblx0XHRcdFx0c3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBzd2FybUludGVyYWN0Lm5ld0ludGVyYWN0aW9uU3BhY2UoY29tbSk7XG5cbn1cblxudmFyIHNwYWNlO1xubW9kdWxlLmV4cG9ydHMuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZighc3BhY2Upe1xuICAgICAgICBzcGFjZSA9IG5ldyBNZW1vcnlNUUludGVyYWN0aW9uU3BhY2UoKTtcbiAgICB9ZWxzZXtcbiAgICAgICAgY29uc29sZS5sb2coXCJNZW1vcnlNUUludGVyYWN0aW9uU3BhY2UgYWxyZWFkeSBjcmVhdGVkISBVc2luZyBzYW1lIGluc3RhbmNlLlwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHNwYWNlO1xufTsiLCJmdW5jdGlvbiBXaW5kb3dNUUludGVyYWN0aW9uU3BhY2UoY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3csIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsKXtcbiAgICB2YXIgc3dhcm1JbnRlcmFjdCA9IHJlcXVpcmUoXCIuLy4uL3N3YXJtSW50ZXJhY3Rpb25cIik7XG4gICAgdmFyIGNoaWxkTWVzc2FnZU1RID0gcmVxdWlyZShcIi4vc3BlY2lmaWNNUUltcGwvQ2hpbGRXZWJWaWV3TVFcIikuY3JlYXRlTVEoY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3csIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsKTtcbiAgICB2YXIgc3dhcm1JbnN0YW5jZXMgPSB7fTtcblxuICAgIHZhciBjb21tID0ge1xuICAgICAgICBzdGFydFN3YXJtOiBmdW5jdGlvbiAoc3dhcm1OYW1lLCBjdG9yLCBhcmdzKSB7XG4gICAgICAgICAgICB2YXIgc3dhcm0gPSB7bWV0YTp7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtVHlwZU5hbWU6c3dhcm1OYW1lLFxuICAgICAgICAgICAgICAgICAgICBjdG9yOmN0b3IsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6YXJnc1xuICAgICAgICAgICAgICAgIH19O1xuICAgICAgICAgICAgY2hpbGRNZXNzYWdlTVEucHJvZHVjZShzd2FybSk7XG4gICAgICAgICAgICByZXR1cm4gc3dhcm07XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRpbnVlU3dhcm06IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIHN3YXJtU2VyaWFsaXNhdGlvbiwgcGhhc2VOYW1lLCBhcmdzKSB7XG5cbiAgICAgICAgICAgIHZhciBuZXdTZXJpYWxpemF0aW9uID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzd2FybVNlcmlhbGlzYXRpb24pKTtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS5jdG9yID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgbmV3U2VyaWFsaXphdGlvbi5tZXRhLnBoYXNlTmFtZSA9IHBoYXNlTmFtZTtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS50YXJnZXQgPSBcImlmcmFtZVwiO1xuICAgICAgICAgICAgbmV3U2VyaWFsaXphdGlvbi5tZXRhLmFyZ3MgPSBhcmdzO1xuICAgICAgICAgICAgY2hpbGRNZXNzYWdlTVEucHJvZHVjZShuZXdTZXJpYWxpemF0aW9uKTtcbiAgICAgICAgfSxcbiAgICAgICAgb246IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjaGlsZE1lc3NhZ2VNUS5yZWdpc3RlckNvbnN1bWVyKGNhbGxiYWNrKTtcbiAgICAgICAgfSxcbiAgICAgICAgb2ZmOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyKSB7XG5cbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIHZhciBzcGFjZSA9IHN3YXJtSW50ZXJhY3QubmV3SW50ZXJhY3Rpb25TcGFjZShjb21tKTtcbiAgICB0aGlzLnN0YXJ0U3dhcm0gPSBmdW5jdGlvbiAobmFtZSwgY3RvciwgLi4uYXJncykge1xuICAgICAgICByZXR1cm4gc3BhY2Uuc3RhcnRTd2FybShuYW1lLCBjdG9yLCAuLi5hcmdzKTtcbiAgICB9O1xuXG4gICAgdGhpcy5pbml0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGNoaWxkTWVzc2FnZU1RLnJlZ2lzdGVyQ29uc3VtZXIoZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgc3dhcm07XG4gICAgICAgICAgICAgICAgaWYoZGF0YSAmJiBkYXRhLm1ldGEgJiYgZGF0YS5tZXRhLnN3YXJtSWQgJiYgc3dhcm1JbnN0YW5jZXNbZGF0YS5tZXRhLnN3YXJtSWRdKXtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm0gPSBzd2FybUluc3RhbmNlc1tkYXRhLm1ldGEuc3dhcm1JZF07XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtLnVwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm1bZGF0YS5tZXRhLnBoYXNlTmFtZV0uYXBwbHkoc3dhcm0sIGRhdGEubWV0YS5hcmdzKTtcbiAgICAgICAgICAgICAgICB9ZWxzZXtcblxuICAgICAgICAgICAgICAgICAgICBzd2FybSA9ICQkLnN3YXJtLnN0YXJ0KGRhdGEubWV0YS5zd2FybVR5cGVOYW1lLCBkYXRhLm1ldGEuY3RvciwgLi4uZGF0YS5tZXRhLmFyZ3MpO1xuXG4gICAgICAgICAgICAgICAgICAgIHN3YXJtSW5zdGFuY2VzW3N3YXJtLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtSWRdID0gc3dhcm07XG5cbiAgICAgICAgICAgICAgICAgICAgc3dhcm0ub25SZXR1cm4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN3YXJtIGlzIGZpbmlzaGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IHJlYWR5RXZ0ID0ge3dlYlZpZXdJc1JlYWR5OiB0cnVlfTtcbiAgICAgICAgcGFyZW50LnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHJlYWR5RXZ0KSwgXCIqXCIpO1xuXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZXIobWVzc2FnZSl7XG4gICAgICAgIGxvZyhcInNlbmRpbmcgc3dhcm0gXCIsIG1lc3NhZ2UpO1xuICAgICAgICBjaGlsZE1lc3NhZ2VNUS5wcm9kdWNlKG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlckludGVyYWN0aW9ucyhtZXNzYWdlKXtcbiAgICAgICAgbG9nKFwiY2hlY2tpbmcgaWYgbWVzc2FnZSBpcyAnaW50ZXJhY3Rpb24nIFwiLCBtZXNzYWdlKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UgJiYgbWVzc2FnZS5tZXRhICYmIG1lc3NhZ2UubWV0YS50YXJnZXQgJiYgbWVzc2FnZS5tZXRhLnRhcmdldCA9PT0gXCJpbnRlcmFjdGlvblwiO1xuICAgIH1cbiAgICAvL1RPRE8gZml4IHRoaXMgZm9yIG5hdGl2ZVdlYlZpZXdcblxuICAgICQkLlBTS19QdWJTdWIuc3Vic2NyaWJlKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBoYW5kbGVyLCBmdW5jdGlvbigpe3JldHVybiB0cnVlO30sIGZpbHRlckludGVyYWN0aW9ucyk7XG5cbiAgICBsb2coXCJyZWdpc3RlcmluZyBsaXN0ZW5lciBmb3IgaGFuZGxpbmcgaW50ZXJhY3Rpb25zXCIpO1xuXG4gICAgZnVuY3Rpb24gbG9nKC4uLmFyZ3Mpe1xuICAgICAgICBhcmdzLnVuc2hpZnQoXCJbV2luZG93TVFJbnRlcmFjdGlvblNwYWNlXCIrKHdpbmRvdy5mcmFtZUVsZW1lbnQgPyBcIipcIjogXCJcIikrXCJdXCIgKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UgPSBmdW5jdGlvbihjaGFubmVsTmFtZSwgY29tbXVuaWNhdGlvbldpbmRvdywgc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwpe1xuICAgIHJldHVybiBuZXcgV2luZG93TVFJbnRlcmFjdGlvblNwYWNlKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93LCBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCk7XG59OyIsIi8qVE9ET1xuRm9yIHRoZSBtb21lbnQgSSBkb24ndCBzZWUgYW55IHByb2JsZW1zIGlmIGl0J3Mgbm90IGNyeXB0b2dyYXBoaWMgc2FmZS5cblRoaXMgdmVyc2lvbiBrZWVwcyAgY29tcGF0aWJpbGl0eSB3aXRoIG1vYmlsZSBicm93c2Vycy93ZWJ2aWV3cy5cbiAqL1xuZnVuY3Rpb24gdXVpZHY0KCkge1xuICAgIHJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uIChjKSB7XG4gICAgICAgIHZhciByID0gTWF0aC5yYW5kb20oKSAqIDE2IHwgMCwgdiA9IGMgPT09ICd4JyA/IHIgOiAociAmIDB4MyB8IDB4OCk7XG4gICAgICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gV2luZG93TVFJbnRlcmFjdGlvblNwYWNlKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93KSB7XG4gICAgdmFyIHN3YXJtSW50ZXJhY3QgPSByZXF1aXJlKFwiLi8uLi9zd2FybUludGVyYWN0aW9uXCIpO1xuICAgIHZhciBjaGlsZE1lc3NhZ2VNUSA9IHJlcXVpcmUoXCIuL3NwZWNpZmljTVFJbXBsL0NoaWxkV25kTVFcIikuY3JlYXRlTVEoY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3cpO1xuICAgIHZhciBzd2FybUluc3RhbmNlcyA9IHt9O1xuXG4gICAgdmFyIGNvbW0gPSB7XG4gICAgICAgIHN0YXJ0U3dhcm06IGZ1bmN0aW9uIChzd2FybU5hbWUsIGN0b3IsIGFyZ3MpIHtcblxuICAgICAgICAgICAgdmFyIHVuaXF1ZUlkID0gdXVpZHY0KCk7XG4gICAgICAgICAgICB2YXIgc3dhcm0gPSB7XG4gICAgICAgICAgICAgICAgbWV0YToge1xuICAgICAgICAgICAgICAgICAgICBzd2FybVR5cGVOYW1lOiBzd2FybU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGN0b3I6IGN0b3IsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IGFyZ3MsXG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3RJZDogdW5pcXVlSWQsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNoaWxkTWVzc2FnZU1RLnByb2R1Y2Uoc3dhcm0pO1xuICAgICAgICAgICAgcmV0dXJuIHN3YXJtO1xuICAgICAgICB9LFxuICAgICAgICBjb250aW51ZVN3YXJtOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBzd2FybVNlcmlhbGlzYXRpb24sIHBoYXNlTmFtZSwgYXJncykge1xuXG4gICAgICAgICAgICB2YXIgbmV3U2VyaWFsaXphdGlvbiA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc3dhcm1TZXJpYWxpc2F0aW9uKSk7XG4gICAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uLm1ldGEuY3RvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS5waGFzZU5hbWUgPSBwaGFzZU5hbWU7XG4gICAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uLm1ldGEudGFyZ2V0ID0gXCJpZnJhbWVcIjtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS5hcmdzID0gYXJncztcbiAgICAgICAgICAgIGNoaWxkTWVzc2FnZU1RLnByb2R1Y2UobmV3U2VyaWFsaXphdGlvbik7XG4gICAgICAgIH0sXG4gICAgICAgIG9uOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2hpbGRNZXNzYWdlTVEucmVnaXN0ZXJDYWxsYmFjayhzd2FybUhhbmRsZXIubWV0YS5yZXF1ZXN0SWQsIGNhbGxiYWNrKTtcbiAgICAgICAgfSxcbiAgICAgICAgb2ZmOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkZ1bmN0aW9uIG5vdCBpbXBsZW1lbnRlZCFcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICB2YXIgc3BhY2UgPSBzd2FybUludGVyYWN0Lm5ld0ludGVyYWN0aW9uU3BhY2UoY29tbSk7XG4gICAgdGhpcy5zdGFydFN3YXJtID0gZnVuY3Rpb24gKG5hbWUsIGN0b3IsIC4uLmFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIHNwYWNlLnN0YXJ0U3dhcm0obmFtZSwgY3RvciwgLi4uYXJncyk7XG4gICAgfTtcblxuICAgIHRoaXMuaW5pdCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBjaGlsZE1lc3NhZ2VNUS5yZWdpc3RlckNvbnN1bWVyKGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHN3YXJtO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEubWV0YSAmJiBkYXRhLm1ldGEuc3dhcm1JZCAmJiBzd2FybUluc3RhbmNlc1tkYXRhLm1ldGEuc3dhcm1JZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm0gPSBzd2FybUluc3RhbmNlc1tkYXRhLm1ldGEuc3dhcm1JZF07XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtLnVwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm1bZGF0YS5tZXRhLnBoYXNlTmFtZV0uYXBwbHkoc3dhcm0sIGRhdGEubWV0YS5hcmdzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgIHN3YXJtID0gJCQuc3dhcm0uc3RhcnQoZGF0YS5tZXRhLnN3YXJtVHlwZU5hbWUsIGRhdGEubWV0YS5jdG9yLCAuLi5kYXRhLm1ldGEuYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtLnNldE1ldGFkYXRhKFwicmVxdWVzdElkXCIsIGRhdGEubWV0YS5yZXF1ZXN0SWQpO1xuICAgICAgICAgICAgICAgICAgICBzd2FybUluc3RhbmNlc1tzd2FybS5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXSA9IHN3YXJtO1xuXG4gICAgICAgICAgICAgICAgICAgIHN3YXJtLm9uUmV0dXJuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN3YXJtIGlzIGZpbmlzaGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHBhcmVudC5wb3N0TWVzc2FnZSh7d2ViVmlld0lzUmVhZHk6IHRydWV9LCBcIipcIik7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZXIobWVzc2FnZSkge1xuICAgICAgICBsb2coXCJzZW5kaW5nIHN3YXJtIFwiLCBtZXNzYWdlKTtcbiAgICAgICAgY2hpbGRNZXNzYWdlTVEucHJvZHVjZShtZXNzYWdlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWx0ZXJJbnRlcmFjdGlvbnMobWVzc2FnZSkge1xuICAgICAgICBsb2coXCJjaGVja2luZyBpZiBtZXNzYWdlIGlzICdpbnRlcmFjdGlvbicgXCIsIG1lc3NhZ2UpO1xuICAgICAgICByZXR1cm4gbWVzc2FnZSAmJiBtZXNzYWdlLm1ldGEgJiYgbWVzc2FnZS5tZXRhLnRhcmdldCAmJiBtZXNzYWdlLm1ldGEudGFyZ2V0ID09PSBcImludGVyYWN0aW9uXCI7XG4gICAgfVxuXG4gICAgJCQuUFNLX1B1YlN1Yi5zdWJzY3JpYmUoJCQuQ09OU1RBTlRTLlNXQVJNX0ZPUl9FWEVDVVRJT04sIGhhbmRsZXIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSwgZmlsdGVySW50ZXJhY3Rpb25zKTtcbiAgICBsb2coXCJyZWdpc3RlcmluZyBsaXN0ZW5lciBmb3IgaGFuZGxpbmcgaW50ZXJhY3Rpb25zXCIpO1xuXG4gICAgZnVuY3Rpb24gbG9nKC4uLmFyZ3MpIHtcbiAgICAgICAgYXJncy51bnNoaWZ0KFwiW1dpbmRvd01RSW50ZXJhY3Rpb25TcGFjZVwiICsgKHdpbmRvdy5mcmFtZUVsZW1lbnQgPyBcIipcIiA6IFwiXCIpICsgXCJdXCIpO1xuICAgICAgICAvL2NvbnNvbGUubG9nLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZSA9IGZ1bmN0aW9uIChjaGFubmVsTmFtZSwgY29tbXVuaWNhdGlvbldpbmRvdykge1xuICAgIHJldHVybiBuZXcgV2luZG93TVFJbnRlcmFjdGlvblNwYWNlKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93KTtcbn07XG4iLCJ2YXIgT3dNID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIikuT3dNO1xudmFyIHN3YXJtSW50ZXJhY3QgPSByZXF1aXJlKFwiLi8uLi9zd2FybUludGVyYWN0aW9uXCIpO1xudmFyIGZvbGRlck1RID0gcmVxdWlyZShcImZvbGRlcm1xXCIpO1xuXG5mdW5jdGlvbiBGb2xkZXJNUUludGVyYWN0aW9uU3BhY2UoYWdlbnQsIHRhcmdldEZvbGRlciwgcmV0dXJuRm9sZGVyKSB7XG4gICAgdmFyIHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVycyA9IHt9O1xuICAgIHZhciBxdWV1ZUhhbmRsZXIgPSBudWxsO1xuICAgIHZhciByZXNwb25zZVF1ZXVlID0gbnVsbDtcblxuICAgIHZhciBxdWV1ZSA9IGZvbGRlck1RLmNyZWF0ZVF1ZSh0YXJnZXRGb2xkZXIsIChlcnIgLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVTd2FybVBhY2soc3dhcm1OYW1lLCBwaGFzZU5hbWUsIC4uLmFyZ3Mpe1xuICAgICAgICB2YXIgc3dhcm0gPSBuZXcgT3dNKCk7XG5cbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInN3YXJtSWRcIiwgJCQudWlkR2VuZXJhdG9yLnNhZmVfdXVpZCgpKTtcblxuICAgICAgICBzd2FybS5zZXRNZXRhKFwicmVxdWVzdElkXCIsIHN3YXJtLmdldE1ldGEoXCJzd2FybUlkXCIpKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInN3YXJtVHlwZU5hbWVcIiwgc3dhcm1OYW1lKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInBoYXNlTmFtZVwiLCBwaGFzZU5hbWUpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiYXJnc1wiLCBhcmdzKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImNvbW1hbmRcIiwgXCJleGVjdXRlU3dhcm1QaGFzZVwiKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInRhcmdldFwiLCBhZ2VudCk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIsIHJldHVybkZvbGRlcik7XG5cbiAgICAgICAgcmV0dXJuIHN3YXJtO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpc3BhdGNoaW5nU3dhcm1zKGVyciwgc3dhcm0pe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICB9XG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHN1YnNMaXN0ID0gc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtLm1ldGEuc3dhcm1JZF07XG4gICAgICAgICAgICBpZihzdWJzTGlzdCl7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpPTA7IGk8c3Vic0xpc3QubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgICAgICAgICBsZXQgaGFuZGxlciA9IHN1YnNMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKG51bGwsIHN3YXJtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluaXQoKXtcbiAgICAgICAgaWYoIXF1ZXVlSGFuZGxlcil7XG4gICAgICAgICAgICBxdWV1ZUhhbmRsZXIgPSBxdWV1ZS5nZXRIYW5kbGVyKCk7XG4gICAgICAgIH1cbiAgICB9XG5cdFxuXHRpbml0KCk7XG5cbiAgICBmdW5jdGlvbiBwcmVwYXJlVG9Db25zdW1lKCl7XG4gICAgICAgIGlmKCFyZXNwb25zZVF1ZXVlKXtcbiAgICAgICAgICAgIHJlc3BvbnNlUXVldWUgPSBmb2xkZXJNUS5jcmVhdGVRdWUocmV0dXJuRm9sZGVyKTtcbiAgICAgICAgICAgIHJlc3BvbnNlUXVldWUucmVnaXN0ZXJDb25zdW1lcihkaXNwYXRjaGluZ1N3YXJtcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgY29tbXVuaWNhdGlvbiA9IHtcbiAgICAgICAgc3RhcnRTd2FybTogZnVuY3Rpb24gKHN3YXJtTmFtZSwgY3RvciwgYXJncykge1xuICAgICAgICAgICAgcHJlcGFyZVRvQ29uc3VtZSgpO1xuICAgICAgICAgICAgdmFyIHN3YXJtID0gY3JlYXRlU3dhcm1QYWNrKHN3YXJtTmFtZSwgY3RvciwgLi4uYXJncyk7XG4gICAgICAgICAgICBxdWV1ZUhhbmRsZXIuc2VuZFN3YXJtRm9yRXhlY3V0aW9uKHN3YXJtKTtcbiAgICAgICAgICAgIHJldHVybiBzd2FybTtcbiAgICAgICAgfSxcbiAgICAgICAgY29udGludWVTd2FybTogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgc3dhcm1TZXJpYWxpc2F0aW9uLCBjdG9yLCAuLi5hcmdzKSB7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgc3dhcm1IYW5kbGVyLnVwZGF0ZShzd2FybVNlcmlhbGlzYXRpb24pO1xuICAgICAgICAgICAgICAgIHN3YXJtSGFuZGxlcltjdG9yXS5hcHBseShzd2FybUhhbmRsZXIsIGFyZ3MpO1xuICAgICAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb246IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBwcmVwYXJlVG9Db25zdW1lKCk7XG5cbiAgICAgICAgICAgIGlmKCFzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm1IYW5kbGVyLm1ldGEuc3dhcm1JZF0pe1xuICAgICAgICAgICAgICAgIHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybUhhbmRsZXIubWV0YS5zd2FybUlkXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5tZXRhLnN3YXJtSWRdLnB1c2goY2FsbGJhY2spO1xuXG4gICAgICAgIH0sXG4gICAgICAgIG9mZjogZnVuY3Rpb24gKHN3YXJtSGFuZGxlcikge1xuICAgICAgICAgICAgc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5tZXRhLnN3YXJtSWRdID0gW107XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIHN3YXJtSW50ZXJhY3QubmV3SW50ZXJhY3Rpb25TcGFjZShjb21tdW5pY2F0aW9uKTtcbn1cblxudmFyIHNwYWNlcyA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVJbnRlcmFjdGlvblNwYWNlID0gZnVuY3Rpb24gKGFnZW50LCB0YXJnZXRGb2xkZXIsIHJldHVybkZvbGRlcikge1xuICAgIHZhciBpbmRleCA9IHRhcmdldEZvbGRlcityZXR1cm5Gb2xkZXI7XG4gICAgaWYoIXNwYWNlc1tpbmRleF0pe1xuICAgICAgICBzcGFjZXNbaW5kZXhdID0gbmV3IEZvbGRlck1RSW50ZXJhY3Rpb25TcGFjZShhZ2VudCwgdGFyZ2V0Rm9sZGVyLCByZXR1cm5Gb2xkZXIpO1xuICAgIH1lbHNle1xuICAgICAgICBjb25zb2xlLmxvZyhgRm9sZGVyTVEgaW50ZXJhY3Rpb24gc3BhY2UgYmFzZWQgb24gWyR7dGFyZ2V0Rm9sZGVyfSwgJHtyZXR1cm5Gb2xkZXJ9XSBhbHJlYWR5IGV4aXN0cyFgKTtcbiAgICB9XG4gICAgcmV0dXJuIHNwYWNlc1tpbmRleF07XG59OyIsInJlcXVpcmUoJ3Bzay1odHRwLWNsaWVudCcpO1xuXG5mdW5jdGlvbiBIVFRQSW50ZXJhY3Rpb25TcGFjZShhbGlhcywgcmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKSB7XG4gICAgY29uc3Qgc3dhcm1JbnRlcmFjdCA9IHJlcXVpcmUoXCIuLy4uL3N3YXJtSW50ZXJhY3Rpb25cIik7XG5cbiAgICBsZXQgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICBmdW5jdGlvbiBpbml0KCl7XG4gICAgICAgIGlmKCFpbml0aWFsaXplZCl7XG4gICAgICAgICAgICBpbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgICAkJC5yZW1vdGUuY3JlYXRlUmVxdWVzdE1hbmFnZXIoKTtcbiAgICAgICAgICAgICQkLnJlbW90ZS5uZXdFbmRQb2ludChhbGlhcywgcmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbW0gPSB7XG4gICAgICAgIHN0YXJ0U3dhcm06IGZ1bmN0aW9uIChzd2FybU5hbWUsIGN0b3IsIGFyZ3MpIHtcbiAgICAgICAgICAgIGluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiAkJC5yZW1vdGVbYWxpYXNdLnN0YXJ0U3dhcm0oc3dhcm1OYW1lLCBjdG9yLCAuLi5hcmdzKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29udGludWVTd2FybTogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgc3dhcm1TZXJpYWxpc2F0aW9uLCBjdG9yLCBhcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gJCQucmVtb3RlW2FsaWFzXS5jb250aW51ZVN3YXJtKHN3YXJtU2VyaWFsaXNhdGlvbiwgY3RvciwgYXJncyk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgc3dhcm1IYW5kbGVyLm9uKCcqJywgY2FsbGJhY2spO1xuICAgICAgICB9LFxuICAgICAgICBvZmY6IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIpIHtcbiAgICAgICAgICAgIHN3YXJtSGFuZGxlci5vZmYoJyonKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gc3dhcm1JbnRlcmFjdC5uZXdJbnRlcmFjdGlvblNwYWNlKGNvbW0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVJbnRlcmFjdGlvblNwYWNlID0gZnVuY3Rpb24gKGFsaWFzLCByZW1vdGVFbmRQb2ludCwgYWdlbnRVaWQsIGNyeXB0b0luZm8pIHtcbiAgICAvL3NpbmdsZXRvblxuICAgIHJldHVybiBuZXcgSFRUUEludGVyYWN0aW9uU3BhY2UoYWxpYXMsIHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgY3J5cHRvSW5mbyk7XG59OyIsInZhciBjaGFubmVsc1JlZ2lzdHJ5ID0ge307IC8va2VlcHMgY2FsbGJhY2tzIGZvciBjb25zdW1lcnMgYW5kIHdpbmRvd3MgcmVmZXJlbmNlcyBmb3IgcHJvZHVjZXJzXG52YXIgY2FsbGJhY2tzUmVnaXN0cnkgPSB7fTtcblxuZnVuY3Rpb24gZGlzcGF0Y2hFdmVudChldmVudCkge1xuICAgIHZhciBzd2FybSA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSk7XG4gICAgaWYoc3dhcm0ubWV0YSl7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGNhbGxiYWNrc1JlZ2lzdHJ5W3N3YXJtLm1ldGEuY2hhbm5lbE5hbWVdO1xuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBzd2FybSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbn1cblxuXG5mdW5jdGlvbiBDaGlsZFduZE1RKGNoYW5uZWxOYW1lLCBtYWluV2luZG93LCBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCkge1xuICAgIC8vY2hhbm5lbCBuYW1lIGlzXG5cbiAgICBjaGFubmVsc1JlZ2lzdHJ5W2NoYW5uZWxOYW1lXSA9IG1haW5XaW5kb3c7XG5cbiAgICB0aGlzLnByb2R1Y2UgPSBmdW5jdGlvbiAoc3dhcm1Nc2cpIHtcbiAgICAgICAgc3dhcm1Nc2cubWV0YS5jaGFubmVsTmFtZSA9IGNoYW5uZWxOYW1lO1xuICAgICAgICB2YXIgbWVzc2FnZSA9IHtcbiAgICAgICAgICAgIG1ldGE6c3dhcm1Nc2cubWV0YSxcbiAgICAgICAgICAgIHB1YmxpY1ZhcnM6c3dhcm1Nc2cucHVibGljVmFycyxcbiAgICAgICAgICAgIHByaXZhdGVWYXJzOnN3YXJtTXNnLnByaXZhdGVWYXJzXG4gICAgICAgIH07XG5cbiAgICAgICAgbWVzc2FnZS5tZXRhLmFyZ3MgPSBtZXNzYWdlLm1ldGEuYXJncy5tYXAoZnVuY3Rpb24gKGFyZ3VtZW50KSB7XG4gICAgICAgICAgICBpZiAoYXJndW1lbnQgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9IHt9O1xuICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudC5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yW1wibWVzc2FnZVwiXSA9IGFyZ3VtZW50Lm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudC5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yW1wiY29kZVwiXSA9IGFyZ3VtZW50LmNvZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhcmd1bWVudDtcbiAgICAgICAgfSk7XG4gICAgICAgIG1haW5XaW5kb3cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSksIFwiKlwiKTtcbiAgICB9O1xuXG4gICAgdmFyIGNvbnN1bWVyO1xuXG4gICAgdGhpcy5yZWdpc3RlckNvbnN1bWVyID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBzaG91bGREZWxldGVBZnRlclJlYWQgPSB0cnVlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25zdW1lcikge1xuICAgICAgICAgICAvLyB0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IG9uZSBjb25zdW1lciBpcyBhbGxvd2VkIVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVyID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrc1JlZ2lzdHJ5W2NoYW5uZWxOYW1lXSA9IGNvbnN1bWVyO1xuXG4gICAgICAgIGlmIChzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCAmJiB0eXBlb2Ygc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwuYWRkRXZlbnRMaXN0ZW5lciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZGlzcGF0Y2hFdmVudCk7XG4gICAgICAgIH1cbiAgICAgIH07XG59XG5cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlTVEgPSBmdW5jdGlvbiBjcmVhdGVNUShjaGFubmVsTmFtZSwgd25kLCBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCl7XG4gICAgcmV0dXJuIG5ldyBDaGlsZFduZE1RKGNoYW5uZWxOYW1lLCB3bmQsIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMuaW5pdEZvclN3YXJtaW5nSW5DaGlsZCA9IGZ1bmN0aW9uKGRvbWFpbk5hbWUpe1xuXG4gICAgdmFyIHB1YlN1YiA9ICQkLnJlcXVpcmUoXCJzb3VuZHB1YnN1YlwiKS5zb3VuZFB1YlN1YjtcblxuICAgIHZhciBpbmJvdW5kID0gY3JlYXRlTVEoZG9tYWluTmFtZStcIi9pbmJvdW5kXCIpO1xuICAgIHZhciBvdXRib3VuZCA9IGNyZWF0ZU1RKGRvbWFpbk5hbWUrXCIvb3V0Ym91bmRcIik7XG5cblxuICAgIGluYm91bmQucmVnaXN0ZXJDb25zdW1lcihmdW5jdGlvbihlcnIsIHN3YXJtKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgfVxuICAgICAgICAvL3Jlc3RvcmUgYW5kIGV4ZWN1dGUgdGhpcyB0YXN0eSBzd2FybVxuICAgICAgICBnbG9iYWwuJCQuc3dhcm1zSW5zdGFuY2VzTWFuYWdlci5yZXZpdmVfc3dhcm0oc3dhcm0pO1xuICAgIH0pO1xuXG4gICAgcHViU3ViLnN1YnNjcmliZSgkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTiwgZnVuY3Rpb24oc3dhcm0pe1xuICAgICAgICBvdXRib3VuZC5zZW5kU3dhcm1Gb3JFeGVjdXRpb24oc3dhcm0pO1xuICAgIH0pO1xufTtcblxuIiwidmFyIGNoYW5uZWxzUmVnaXN0cnkgPSB7fTsgLy9rZWVwcyBjYWxsYmFja3MgZm9yIGNvbnN1bWVycyBhbmQgd2luZG93cyByZWZlcmVuY2VzIGZvciBwcm9kdWNlcnNcbnZhciBjYWxsYmFja3NSZWdpc3RyeSA9IHt9O1xudmFyIHN3YXJtQ2FsbGJhY2tzID0ge307XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRXZlbnQoZXZlbnQpIHtcblxuICAgIGlmIChldmVudC5zb3VyY2UgIT09IHdpbmRvdykge1xuXG4gICAgICAgIHZhciBzd2FybSA9IGV2ZW50LmRhdGE7XG5cbiAgICAgICAgaWYgKHN3YXJtLm1ldGEpIHtcbiAgICAgICAgICAgIGxldCBjYWxsYmFjaztcbiAgICAgICAgICAgIGlmICghc3dhcm0ubWV0YS5yZXF1ZXN0SWQgfHwgIXN3YXJtQ2FsbGJhY2tzW3N3YXJtLm1ldGEucmVxdWVzdElkXSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2tzUmVnaXN0cnlbc3dhcm0ubWV0YS5jaGFubmVsTmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayA9IHN3YXJtQ2FsbGJhY2tzW3N3YXJtLm1ldGEucmVxdWVzdElkXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHN3YXJtKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuZnVuY3Rpb24gQ2hpbGRXbmRNUShjaGFubmVsTmFtZSwgbWFpbldpbmRvdykge1xuICAgIC8vY2hhbm5lbCBuYW1lIGlzXG5cbiAgICBjaGFubmVsc1JlZ2lzdHJ5W2NoYW5uZWxOYW1lXSA9IG1haW5XaW5kb3c7XG5cbiAgICB0aGlzLnByb2R1Y2UgPSBmdW5jdGlvbiAoc3dhcm1Nc2cpIHtcbiAgICAgICAgc3dhcm1Nc2cubWV0YS5jaGFubmVsTmFtZSA9IGNoYW5uZWxOYW1lO1xuICAgICAgICB2YXIgbWVzc2FnZSA9IHtcbiAgICAgICAgICAgIG1ldGE6IHN3YXJtTXNnLm1ldGEsXG4gICAgICAgICAgICBwdWJsaWNWYXJzOiBzd2FybU1zZy5wdWJsaWNWYXJzLFxuICAgICAgICAgICAgcHJpdmF0ZVZhcnM6IHN3YXJtTXNnLnByaXZhdGVWYXJzXG4gICAgICAgIH07XG4gICAgICAgIC8vY29uc29sZS5sb2coc3dhcm1Nc2cuZ2V0SlNPTigpKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhzd2FybU1zZy52YWx1ZU9mKCkpO1xuICAgICAgICBtZXNzYWdlLm1ldGEuYXJncyA9IG1lc3NhZ2UubWV0YS5hcmdzLm1hcChmdW5jdGlvbiAoYXJndW1lbnQpIHtcbiAgICAgICAgICAgIGlmIChhcmd1bWVudCBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0ge307XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50Lm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JbXCJtZXNzYWdlXCJdID0gYXJndW1lbnQubWVzc2FnZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50LmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JbXCJjb2RlXCJdID0gYXJndW1lbnQuY29kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50O1xuICAgICAgICB9KTtcbiAgICAgICAgbWFpbldpbmRvdy5wb3N0TWVzc2FnZShtZXNzYWdlLCBcIipcIik7XG4gICAgfTtcblxuICAgIHZhciBjb25zdW1lcjtcblxuICAgIHRoaXMucmVnaXN0ZXJDb25zdW1lciA9IGZ1bmN0aW9uIChjYWxsYmFjaywgc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkID0gdHJ1ZSkge1xuICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uc3VtZXIpIHtcbiAgICAgICAgICAgIC8vIHRocm93IG5ldyBFcnJvcihcIk9ubHkgb25lIGNvbnN1bWVyIGlzIGFsbG93ZWQhXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZXIgPSBjYWxsYmFjaztcbiAgICAgICAgY2FsbGJhY2tzUmVnaXN0cnlbY2hhbm5lbE5hbWVdID0gY29uc3VtZXI7XG4gICAgICAgIG1haW5XaW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZGlzcGF0Y2hFdmVudCk7XG4gICAgfTtcblxuICAgIHRoaXMucmVnaXN0ZXJDYWxsYmFjayA9IGZ1bmN0aW9uIChyZXF1ZXN0SWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHN3YXJtQ2FsbGJhY2tzW3JlcXVlc3RJZF0gPSBjYWxsYmFjaztcbiAgICAgICAgY2FsbGJhY2tzUmVnaXN0cnlbY2hhbm5lbE5hbWVdID0gY2FsbGJhY2s7XG4gICAgICAgIG1haW5XaW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZGlzcGF0Y2hFdmVudCk7XG4gICAgfTtcblxufVxuXG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZU1RID0gZnVuY3Rpb24gY3JlYXRlTVEoY2hhbm5lbE5hbWUsIHduZCkge1xuICAgIHJldHVybiBuZXcgQ2hpbGRXbmRNUShjaGFubmVsTmFtZSwgd25kKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMuaW5pdEZvclN3YXJtaW5nSW5DaGlsZCA9IGZ1bmN0aW9uIChkb21haW5OYW1lKSB7XG5cbiAgICB2YXIgcHViU3ViID0gJCQucmVxdWlyZShcInNvdW5kcHVic3ViXCIpLnNvdW5kUHViU3ViO1xuXG4gICAgdmFyIGluYm91bmQgPSBjcmVhdGVNUShkb21haW5OYW1lICsgXCIvaW5ib3VuZFwiKTtcbiAgICB2YXIgb3V0Ym91bmQgPSBjcmVhdGVNUShkb21haW5OYW1lICsgXCIvb3V0Ym91bmRcIik7XG5cblxuICAgIGluYm91bmQucmVnaXN0ZXJDb25zdW1lcihmdW5jdGlvbiAoZXJyLCBzd2FybSkge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICB9XG4gICAgICAgIC8vcmVzdG9yZSBhbmQgZXhlY3V0ZSB0aGlzIHRhc3R5IHN3YXJtXG4gICAgICAgIGdsb2JhbC4kJC5zd2FybXNJbnN0YW5jZXNNYW5hZ2VyLnJldml2ZV9zd2FybShzd2FybSk7XG4gICAgfSk7XG5cbiAgICBwdWJTdWIuc3Vic2NyaWJlKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBmdW5jdGlvbiAoc3dhcm0pIHtcbiAgICAgICAgb3V0Ym91bmQuc2VuZFN3YXJtRm9yRXhlY3V0aW9uKHN3YXJtKTtcbiAgICB9KTtcbn07XG5cbiIsImlmICh0eXBlb2YgJCQgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICQkID0ge307XG59XG5cbmZ1bmN0aW9uIFZpcnR1YWxTd2FybShpbm5lck9iaiwgZ2xvYmFsSGFuZGxlcil7XG4gICAgbGV0IGtub3duRXh0cmFQcm9wcyA9IFsgXCJzd2FybVwiIF07XG5cbiAgICBmdW5jdGlvbiBidWlsZEhhbmRsZXIoKSB7XG4gICAgICAgIHZhciB1dGlsaXR5ID0ge307XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIHByb3BlcnR5LCB2YWx1ZSwgcmVjZWl2ZXIpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0YXJnZXQucHJpdmF0ZVZhcnMgJiYgdGFyZ2V0LnByaXZhdGVWYXJzLmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5wcml2YXRlVmFyc1twcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHRhcmdldC5wdWJsaWNWYXJzICYmIHRhcmdldC5wdWJsaWNWYXJzLmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5wdWJsaWNWYXJzW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdGFyZ2V0Lmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIGtub3duRXh0cmFQcm9wcy5pbmRleE9mKHByb3BlcnR5KSA9PT0gLTE6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWdsb2JhbEhhbmRsZXIucHJvdGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsSGFuZGxlci5wcm90ZWN0ZWQgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbEhhbmRsZXIucHJvdGVjdGVkW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlsaXR5W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIHByb3BlcnR5LCByZWNlaXZlcikge1xuXG4gICAgICAgICAgICAgICAgc3dpdGNoICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdGFyZ2V0LnB1YmxpY1ZhcnMgJiYgdGFyZ2V0LnB1YmxpY1ZhcnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldC5wdWJsaWNWYXJzW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0YXJnZXQucHJpdmF0ZVZhcnMgJiYgdGFyZ2V0LnByaXZhdGVWYXJzLmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXQucHJpdmF0ZVZhcnNbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHRhcmdldC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSk6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBnbG9iYWxIYW5kbGVyLnByb3RlY3RlZCAmJiBnbG9iYWxIYW5kbGVyLnByb3RlY3RlZC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSk6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsSGFuZGxlci5wcm90ZWN0ZWRbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHV0aWxpdHkuaGFzT3duUHJvcGVydHkocHJvcGVydHkpOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHV0aWxpdHlbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm94eShpbm5lck9iaiwgYnVpbGRIYW5kbGVyKCkpO1xufVxuXG5mdW5jdGlvbiBTd2FybUludGVyYWN0aW9uKGNvbW11bmljYXRpb25JbnRlcmZhY2UsIHN3YXJtTmFtZSwgY3RvciwgYXJncykge1xuXG4gICAgdmFyIHN3YXJtSGFuZGxlciA9IGNvbW11bmljYXRpb25JbnRlcmZhY2Uuc3RhcnRTd2FybShzd2FybU5hbWUsIGN0b3IsIGFyZ3MpO1xuXG4gICAgdGhpcy5vbiA9IGZ1bmN0aW9uKGRlc2NyaXB0aW9uKXtcbiAgICAgICAgY29tbXVuaWNhdGlvbkludGVyZmFjZS5vbihzd2FybUhhbmRsZXIsIGZ1bmN0aW9uKGVyciwgc3dhcm1TZXJpYWxpc2F0aW9uKXtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHBoYXNlID0gZGVzY3JpcHRpb25bc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEucGhhc2VOYW1lXTtcbiAgICAgICAgICAgIGxldCB2aXJ0dWFsU3dhcm0gPSBuZXcgVmlydHVhbFN3YXJtKHN3YXJtU2VyaWFsaXNhdGlvbiwgc3dhcm1IYW5kbGVyKTtcblxuICAgICAgICAgICAgaWYoIXBoYXNlKXtcbiAgICAgICAgICAgICAgICAvL1RPRE8gcmV2aWV3IGFuZCBmaXguIEZpeCBjYXNlIHdoZW4gYW4gaW50ZXJhY3Rpb24gaXMgc3RhcnRlZCBmcm9tIGFub3RoZXIgaW50ZXJhY3Rpb25cbiAgICAgICAgICAgICAgICBpZihzd2FybUhhbmRsZXIgJiYgKCFzd2FybUhhbmRsZXIuVGFyZ2V0IHx8IHN3YXJtSGFuZGxlci5UYXJnZXQuc3dhcm1JZCAhPT0gc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuc3dhcm1JZCkpe1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk5vdCBteSBzd2FybSFcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGludGVyYWN0UGhhc2VFcnIgPSAgbmV3IEVycm9yKFwiSW50ZXJhY3QgbWV0aG9kIFwiK3N3YXJtU2VyaWFsaXNhdGlvbi5tZXRhLnBoYXNlTmFtZStcIiB3YXMgbm90IGZvdW5kLlwiKTtcbiAgICAgICAgICAgICAgICBpZihkZXNjcmlwdGlvbltcIm9uRXJyb3JcIl0pe1xuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbltcIm9uRXJyb3JcIl0uY2FsbCh2aXJ0dWFsU3dhcm0sIGludGVyYWN0UGhhc2VFcnIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGludGVyYWN0UGhhc2VFcnI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2aXJ0dWFsU3dhcm0uc3dhcm0gPSBmdW5jdGlvbihwaGFzZU5hbWUsIC4uLmFyZ3Mpe1xuICAgICAgICAgICAgICAgIGNvbW11bmljYXRpb25JbnRlcmZhY2UuY29udGludWVTd2FybShzd2FybUhhbmRsZXIsIHN3YXJtU2VyaWFsaXNhdGlvbiwgcGhhc2VOYW1lLCBhcmdzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHBoYXNlLmFwcGx5KHZpcnR1YWxTd2FybSwgc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuYXJncyk7XG4gICAgICAgICAgICBpZih2aXJ0dWFsU3dhcm0ubWV0YS5jb21tYW5kID09PSBcImFzeW5jUmV0dXJuXCIpe1xuICAgICAgICAgICAgICAgIGNvbW11bmljYXRpb25JbnRlcmZhY2Uub2ZmKHN3YXJtSGFuZGxlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLm9uUmV0dXJuID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICB0aGlzLm9uKHtcbiAgICAgICAgICAgIF9fcmV0dXJuX186IGNhbGxiYWNrXG4gICAgICAgIH0pO1xuICAgIH07XG59XG5cbnZhciBhYnN0cmFjdEludGVyYWN0aW9uU3BhY2UgPSB7XG4gICAgc3RhcnRTd2FybTogZnVuY3Rpb24gKHN3YXJtTmFtZSwgY3RvciwgYXJncykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgIFN3YXJtSW50ZXJhY3Rpb24ucHJvdG90eXBlLnN0YXJ0U3dhcm1cIik7XG4gICAgfSxcbiAgICByZXNlbmRTd2FybTogZnVuY3Rpb24gKHN3YXJtSW5zdGFuY2UsIHN3YXJtU2VyaWFsaXNhdGlvbiwgY3RvciwgYXJncykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgIFN3YXJtSW50ZXJhY3Rpb24ucHJvdG90eXBlLmNvbnRpbnVlU3dhcm0gXCIpO1xuICAgIH0sXG4gICAgb246IGZ1bmN0aW9uIChzd2FybUluc3RhbmNlLCBwaGFzZU5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSAgU3dhcm1JbnRlcmFjdGlvbi5wcm90b3R5cGUub25Td2FybVwiKTtcbiAgICB9LFxub2ZmOiBmdW5jdGlvbiAoc3dhcm1JbnN0YW5jZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgIFN3YXJtSW50ZXJhY3Rpb24ucHJvdG90eXBlLm9uU3dhcm1cIik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMubmV3SW50ZXJhY3Rpb25TcGFjZSA9IGZ1bmN0aW9uIChjb21tdW5pY2F0aW9uSW50ZXJmYWNlKSB7XG5cbiAgICBpZighY29tbXVuaWNhdGlvbkludGVyZmFjZSkge1xuICAgICAgICBjb21tdW5pY2F0aW9uSW50ZXJmYWNlID0gYWJzdHJhY3RJbnRlcmFjdGlvblNwYWNlIDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc3RhcnRTd2FybTogZnVuY3Rpb24gKHN3YXJtTmFtZSwgY3RvciwgLi4uYXJncykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBTd2FybUludGVyYWN0aW9uKGNvbW11bmljYXRpb25JbnRlcmZhY2UsIHN3YXJtTmFtZSwgY3RvciwgYXJncyk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuIiwiY29uc3QgbXNncGFjayA9IHJlcXVpcmUoJ0Btc2dwYWNrL21zZ3BhY2snKTtcblxuLyoqKioqKioqKioqKioqKioqKioqKiogIHV0aWxpdHkgY2xhc3MgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbmZ1bmN0aW9uIFJlcXVlc3RNYW5hZ2VyKHBvbGxpbmdUaW1lT3V0KXtcbiAgICBpZighcG9sbGluZ1RpbWVPdXQpe1xuICAgICAgICBwb2xsaW5nVGltZU91dCA9IDEwMDA7IC8vMSBzZWNvbmQgYnkgZGVmYXVsdFxuICAgIH1cblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIFJlcXVlc3QoZW5kUG9pbnQsIGluaXRpYWxTd2FybSl7XG4gICAgICAgIHZhciBvblJldHVybkNhbGxiYWNrcyA9IFtdO1xuICAgICAgICB2YXIgb25FcnJvckNhbGxiYWNrcyA9IFtdO1xuICAgICAgICB2YXIgb25DYWxsYmFja3MgPSBbXTtcbiAgICAgICAgdmFyIHJlcXVlc3RJZCA9IGluaXRpYWxTd2FybS5tZXRhLnJlcXVlc3RJZDtcbiAgICAgICAgaW5pdGlhbFN3YXJtID0gbnVsbDtcblxuICAgICAgICB0aGlzLmdldFJlcXVlc3RJZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gcmVxdWVzdElkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub24gPSBmdW5jdGlvbihwaGFzZU5hbWUsIGNhbGxiYWNrKXtcbiAgICAgICAgICAgIGlmKHR5cGVvZiBwaGFzZU5hbWUgIT0gXCJzdHJpbmdcIiAgJiYgdHlwZW9mIGNhbGxiYWNrICE9IFwiZnVuY3Rpb25cIil7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIGZpcnN0IHBhcmFtZXRlciBzaG91bGQgYmUgYSBzdHJpbmcgYW5kIHRoZSBzZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvbkNhbGxiYWNrcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjazpjYWxsYmFjayxcbiAgICAgICAgICAgICAgICBwaGFzZTpwaGFzZU5hbWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2VsZi5wb2xsKGVuZFBvaW50LCB0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub25SZXR1cm4gPSBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgICAgICAgICBvblJldHVybkNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIHNlbGYucG9sbChlbmRQb2ludCwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLm9uRXJyb3IgPSBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgICAgICAgICBpZihvbkVycm9yQ2FsbGJhY2tzLmluZGV4T2YoY2FsbGJhY2spIT09LTEpe1xuICAgICAgICAgICAgICAgIG9uRXJyb3JDYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIGNhbGxiYWNrIGFscmVhZHkgcmVnaXN0ZXJlZCFcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaCA9IGZ1bmN0aW9uKGVyciwgcmVzdWx0KXtcbiAgICAgICAgICAgIGlmKEFycmF5QnVmZmVyLmlzVmlldyhyZXN1bHQpIHx8IEJ1ZmZlci5pc0J1ZmZlcihyZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbXNncGFjay5kZWNvZGUocmVzdWx0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzdWx0ID0gdHlwZW9mIHJlc3VsdCA9PT0gXCJzdHJpbmdcIiA/IEpTT04ucGFyc2UocmVzdWx0KSA6IHJlc3VsdDtcblxuICAgICAgICAgICAgcmVzdWx0ID0gT3dNLnByb3RvdHlwZS5jb252ZXJ0KHJlc3VsdCk7XG4gICAgICAgICAgICB2YXIgcmVzdWx0UmVxSWQgPSByZXN1bHQuZ2V0TWV0YShcInJlcXVlc3RJZFwiKTtcbiAgICAgICAgICAgIHZhciBwaGFzZU5hbWUgPSByZXN1bHQuZ2V0TWV0YShcInBoYXNlTmFtZVwiKTtcbiAgICAgICAgICAgIHZhciBvblJldHVybiA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZihyZXN1bHRSZXFJZCA9PT0gcmVxdWVzdElkKXtcbiAgICAgICAgICAgICAgICBvblJldHVybkNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGMpe1xuICAgICAgICAgICAgICAgICAgICBjKG51bGwsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIG9uUmV0dXJuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZihvblJldHVybil7XG4gICAgICAgICAgICAgICAgICAgIG9uUmV0dXJuQ2FsbGJhY2tzID0gW107XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3JDYWxsYmFja3MgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvbkNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGkpe1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiWFhYWFhYWFg6XCIsIHBoYXNlTmFtZSAsIGkpO1xuICAgICAgICAgICAgICAgICAgICBpZihwaGFzZU5hbWUgPT09IGkucGhhc2UgfHwgaS5waGFzZSA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpLmNhbGxiYWNrKGVyciwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZihvblJldHVybkNhbGxiYWNrcy5sZW5ndGggPT09IDAgJiYgb25DYWxsYmFja3MubGVuZ3RoID09PSAwKXtcbiAgICAgICAgICAgICAgICBzZWxmLnVucG9sbChlbmRQb2ludCwgdGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaEVycm9yID0gZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpIDwgb25FcnJvckNhbGxiYWNrcy5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgdmFyIGVyckNiID0gb25FcnJvckNhbGxiYWNrc1tpXTtcbiAgICAgICAgICAgICAgICBlcnJDYihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub2ZmID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYudW5wb2xsKGVuZFBvaW50LCB0aGlzKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLmNyZWF0ZVJlcXVlc3QgPSBmdW5jdGlvbihyZW1vdGVFbmRQb2ludCwgc3dhcm0pe1xuICAgICAgICBsZXQgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KHJlbW90ZUVuZFBvaW50LCBzd2FybSk7XG4gICAgICAgIHJldHVybiByZXF1ZXN0O1xuICAgIH07XG5cbiAgICAvKiAqKioqKioqKioqKioqKioqKioqKioqKioqKiogcG9sbGluZyB6b25lICoqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICB2YXIgcG9sbFNldCA9IHtcbiAgICB9O1xuXG4gICAgdmFyIGFjdGl2ZUNvbm5lY3Rpb25zID0ge1xuICAgIH07XG5cbiAgICB0aGlzLnBvbGwgPSBmdW5jdGlvbihyZW1vdGVFbmRQb2ludCwgcmVxdWVzdCl7XG4gICAgICAgIHZhciByZXF1ZXN0cyA9IHBvbGxTZXRbcmVtb3RlRW5kUG9pbnRdO1xuICAgICAgICBpZighcmVxdWVzdHMpe1xuICAgICAgICAgICAgcmVxdWVzdHMgPSB7fTtcbiAgICAgICAgICAgIHBvbGxTZXRbcmVtb3RlRW5kUG9pbnRdID0gcmVxdWVzdHM7XG4gICAgICAgIH1cbiAgICAgICAgcmVxdWVzdHNbcmVxdWVzdC5nZXRSZXF1ZXN0SWQoKV0gPSByZXF1ZXN0O1xuICAgICAgICBwb2xsaW5nSGFuZGxlcigpO1xuICAgIH07XG5cbiAgICB0aGlzLnVucG9sbCA9IGZ1bmN0aW9uKHJlbW90ZUVuZFBvaW50LCByZXF1ZXN0KXtcbiAgICAgICAgdmFyIHJlcXVlc3RzID0gcG9sbFNldFtyZW1vdGVFbmRQb2ludF07XG4gICAgICAgIGlmKHJlcXVlc3RzKXtcbiAgICAgICAgICAgIGRlbGV0ZSByZXF1ZXN0c1tyZXF1ZXN0LmdldFJlcXVlc3RJZCgpXTtcbiAgICAgICAgICAgIGlmKE9iamVjdC5rZXlzKHJlcXVlc3RzKS5sZW5ndGggPT09IDApe1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBwb2xsU2V0W3JlbW90ZUVuZFBvaW50XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5wb2xsaW5nIHdyb25nIHJlcXVlc3Q6XCIscmVtb3RlRW5kUG9pbnQsIHJlcXVlc3QpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVBvbGxUaHJlYWQocmVtb3RlRW5kUG9pbnQpe1xuICAgICAgICBmdW5jdGlvbiByZUFybSgpe1xuICAgICAgICAgICAgJCQucmVtb3RlLmRvSHR0cEdldChyZW1vdGVFbmRQb2ludCwgZnVuY3Rpb24oZXJyLCByZXMpe1xuICAgICAgICAgICAgICAgIGxldCByZXF1ZXN0cyA9IHBvbGxTZXRbcmVtb3RlRW5kUG9pbnRdO1xuXG4gICAgICAgICAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgZm9yKGxldCByZXFfaWQgaW4gcmVxdWVzdHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVycl9oYW5kbGVyID0gcmVxdWVzdHNbcmVxX2lkXS5kaXNwYXRjaEVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZXJyX2hhbmRsZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycl9oYW5kbGVyKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlQ29ubmVjdGlvbnNbcmVtb3RlRW5kUG9pbnRdID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoQnVmZmVyLmlzQnVmZmVyKHJlcykgfHwgQXJyYXlCdWZmZXIuaXNWaWV3KHJlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcyA9IG1zZ3BhY2suZGVjb2RlKHJlcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGsgaW4gcmVxdWVzdHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdHNba10uZGlzcGF0Y2gobnVsbCwgcmVzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKE9iamVjdC5rZXlzKHJlcXVlc3RzKS5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlQXJtKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgYWN0aXZlQ29ubmVjdGlvbnNbcmVtb3RlRW5kUG9pbnRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFbmRpbmcgcG9sbGluZyBmb3IgXCIsIHJlbW90ZUVuZFBvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJlQXJtKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcG9sbGluZ0hhbmRsZXIoKXtcbiAgICAgICAgbGV0IHNldFRpbWVyID0gZmFsc2U7XG4gICAgICAgIGZvcih2YXIgdiBpbiBwb2xsU2V0KXtcbiAgICAgICAgICAgIGlmKCFhY3RpdmVDb25uZWN0aW9uc1t2XSl7XG4gICAgICAgICAgICAgICAgY3JlYXRlUG9sbFRocmVhZCh2KTtcbiAgICAgICAgICAgICAgICBhY3RpdmVDb25uZWN0aW9uc1t2XSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRUaW1lciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYoc2V0VGltZXIpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQocG9sbGluZ0hhbmRsZXIsIHBvbGxpbmdUaW1lT3V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldFRpbWVvdXQoIHBvbGxpbmdIYW5kbGVyLCBwb2xsaW5nVGltZU91dCk7XG59XG5cblxuZnVuY3Rpb24gZXh0cmFjdERvbWFpbkFnZW50RGV0YWlscyh1cmwpe1xuICAgIGNvbnN0IHZSZWdleCA9IC8oW2EtekEtWjAtOV0qfC4pKlxcL2FnZW50XFwvKFthLXpBLVowLTldKyhcXC8pKikrL2c7XG5cbiAgICBpZighdXJsLm1hdGNoKHZSZWdleCkpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGZvcm1hdC4gKEVnLiBkb21haW5bLnN1YmRvbWFpbl0qL2FnZW50L1tvcmdhbmlzYXRpb24vXSphZ2VudElkKVwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBkZXZpZGVyID0gXCIvYWdlbnQvXCI7XG4gICAgbGV0IGRvbWFpbjtcbiAgICBsZXQgYWdlbnRVcmw7XG5cbiAgICBjb25zdCBzcGxpdFBvaW50ID0gdXJsLmluZGV4T2YoZGV2aWRlcik7XG4gICAgaWYoc3BsaXRQb2ludCAhPT0gLTEpe1xuICAgICAgICBkb21haW4gPSB1cmwuc2xpY2UoMCwgc3BsaXRQb2ludCk7XG4gICAgICAgIGFnZW50VXJsID0gdXJsLnNsaWNlKHNwbGl0UG9pbnQrZGV2aWRlci5sZW5ndGgpO1xuICAgIH1cblxuICAgIHJldHVybiB7ZG9tYWluLCBhZ2VudFVybH07XG59XG5cbmZ1bmN0aW9uIHVybEVuZFdpdGhTbGFzaCh1cmwpe1xuXG4gICAgaWYodXJsW3VybC5sZW5ndGggLSAxXSAhPT0gXCIvXCIpe1xuICAgICAgICB1cmwgKz0gXCIvXCI7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVybDtcbn1cblxuY29uc3QgT3dNID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIikuT3dNO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKiBtYWluIEFQSXMgb24gd29ya2luZyB3aXRoIHJlbW90ZSBlbmQgcG9pbnRzICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5mdW5jdGlvbiBQc2tIdHRwQ2xpZW50KHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgb3B0aW9ucyl7XG4gICAgdmFyIGJhc2VPZlJlbW90ZUVuZFBvaW50ID0gcmVtb3RlRW5kUG9pbnQ7IC8vcmVtb3ZlIGxhc3QgaWRcblxuICAgIHJlbW90ZUVuZFBvaW50ID0gdXJsRW5kV2l0aFNsYXNoKHJlbW90ZUVuZFBvaW50KTtcblxuICAgIC8vZG9tYWluSW5mbyBjb250YWlucyAyIG1lbWJlcnM6IGRvbWFpbiAocHJpdmF0ZVNreSBkb21haW4pIGFuZCBhZ2VudFVybFxuICAgIGNvbnN0IGRvbWFpbkluZm8gPSBleHRyYWN0RG9tYWluQWdlbnREZXRhaWxzKGFnZW50VWlkKTtcbiAgICBsZXQgaG9tZVNlY3VyaXR5Q29udGV4dCA9IGRvbWFpbkluZm8uYWdlbnRVcmw7XG4gICAgbGV0IHJldHVyblJlbW90ZUVuZFBvaW50ID0gcmVtb3RlRW5kUG9pbnQ7XG5cbiAgICBpZihvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zLnJldHVyblJlbW90ZSAhPSBcInVuZGVmaW5lZFwiKXtcbiAgICAgICAgcmV0dXJuUmVtb3RlRW5kUG9pbnQgPSBvcHRpb25zLnJldHVyblJlbW90ZTtcbiAgICB9XG5cbiAgICBpZighb3B0aW9ucyB8fCBvcHRpb25zICYmICh0eXBlb2Ygb3B0aW9ucy51bmlxdWVJZCA9PSBcInVuZGVmaW5lZFwiIHx8IG9wdGlvbnMudW5pcXVlSWQpKXtcbiAgICAgICAgaG9tZVNlY3VyaXR5Q29udGV4dCArPSBcIl9cIitNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSk7XG4gICAgfVxuXG4gICAgcmV0dXJuUmVtb3RlRW5kUG9pbnQgPSB1cmxFbmRXaXRoU2xhc2gocmV0dXJuUmVtb3RlRW5kUG9pbnQpO1xuXG4gICAgdGhpcy5zdGFydFN3YXJtID0gZnVuY3Rpb24oc3dhcm1OYW1lLCBwaGFzZU5hbWUsIC4uLmFyZ3Mpe1xuICAgICAgICBjb25zdCBzd2FybSA9IG5ldyBPd00oKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInN3YXJtSWRcIiwgJCQudWlkR2VuZXJhdG9yLnNhZmVfdXVpZCgpKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInJlcXVlc3RJZFwiLCBzd2FybS5nZXRNZXRhKFwic3dhcm1JZFwiKSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJzd2FybVR5cGVOYW1lXCIsIHN3YXJtTmFtZSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJwaGFzZU5hbWVcIiwgcGhhc2VOYW1lKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImFyZ3NcIiwgYXJncyk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJjb21tYW5kXCIsIFwiZXhlY3V0ZVN3YXJtUGhhc2VcIik7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJ0YXJnZXRcIiwgZG9tYWluSW5mby5hZ2VudFVybCk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIsIHJldHVyblJlbW90ZUVuZFBvaW50KyQkLnJlbW90ZS5iYXNlNjRFbmNvZGUoaG9tZVNlY3VyaXR5Q29udGV4dCkpO1xuXG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KGdldFJlbW90ZShyZW1vdGVFbmRQb2ludCwgZG9tYWluSW5mby5kb21haW4pLCBtc2dwYWNrLmVuY29kZShzd2FybSksIGZ1bmN0aW9uKGVyciwgcmVzKXtcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlci5jcmVhdGVSZXF1ZXN0KHN3YXJtLmdldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIpLCBzd2FybSk7XG4gICAgfTtcblxuICAgIHRoaXMuY29udGludWVTd2FybSA9IGZ1bmN0aW9uKGV4aXN0aW5nU3dhcm0sIHBoYXNlTmFtZSwgLi4uYXJncyl7XG4gICAgICAgIHZhciBzd2FybSA9IG5ldyBPd00oZXhpc3RpbmdTd2FybSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJwaGFzZU5hbWVcIiwgcGhhc2VOYW1lKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImFyZ3NcIiwgYXJncyk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJjb21tYW5kXCIsIFwiZXhlY3V0ZVN3YXJtUGhhc2VcIik7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJ0YXJnZXRcIiwgZG9tYWluSW5mby5hZ2VudFVybCk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIsIHJldHVyblJlbW90ZUVuZFBvaW50KyQkLnJlbW90ZS5iYXNlNjRFbmNvZGUoaG9tZVNlY3VyaXR5Q29udGV4dCkpO1xuXG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KGdldFJlbW90ZShyZW1vdGVFbmRQb2ludCwgZG9tYWluSW5mby5kb21haW4pLCBtc2dwYWNrLmVuY29kZShzd2FybSksIGZ1bmN0aW9uKGVyciwgcmVzKXtcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vcmV0dXJuICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlci5jcmVhdGVSZXF1ZXN0KHN3YXJtLmdldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIpLCBzd2FybSk7XG4gICAgfTtcblxuICAgIHZhciBhbGxDYXRjaEFsbHMgPSBbXTtcbiAgICB2YXIgcmVxdWVzdHNDb3VudGVyID0gMDtcbiAgICBmdW5jdGlvbiBDYXRjaEFsbChzd2FybU5hbWUsIHBoYXNlTmFtZSwgY2FsbGJhY2speyAvL3NhbWUgaW50ZXJmYWNlIGFzIFJlcXVlc3RcbiAgICAgICAgdmFyIHJlcXVlc3RJZCA9IHJlcXVlc3RzQ291bnRlcisrO1xuICAgICAgICB0aGlzLmdldFJlcXVlc3RJZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBsZXQgcmVxSWQgPSBcInN3YXJtTmFtZVwiICsgXCJwaGFzZU5hbWVcIiArIHJlcXVlc3RJZDtcbiAgICAgICAgICAgIHJldHVybiByZXFJZDtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoID0gZnVuY3Rpb24oZXJyLCByZXN1bHQpe1xuICAgICAgICAgICAgcmVzdWx0ID0gT3dNLnByb3RvdHlwZS5jb252ZXJ0KHJlc3VsdCk7XG4gICAgICAgICAgICB2YXIgY3VycmVudFBoYXNlTmFtZSA9IHJlc3VsdC5nZXRNZXRhKFwicGhhc2VOYW1lXCIpO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRTd2FybU5hbWUgPSByZXN1bHQuZ2V0TWV0YShcInN3YXJtVHlwZU5hbWVcIik7XG4gICAgICAgICAgICBpZigoY3VycmVudFN3YXJtTmFtZSA9PT0gc3dhcm1OYW1lIHx8IHN3YXJtTmFtZSA9PT0gJyonKSAmJiAoY3VycmVudFBoYXNlTmFtZSA9PT0gcGhhc2VOYW1lIHx8IHBoYXNlTmFtZSA9PT0gJyonKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIsIHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy5vbiA9IGZ1bmN0aW9uKHN3YXJtTmFtZSwgcGhhc2VOYW1lLCBjYWxsYmFjayl7XG4gICAgICAgIHZhciBjID0gbmV3IENhdGNoQWxsKHN3YXJtTmFtZSwgcGhhc2VOYW1lLCBjYWxsYmFjayk7XG4gICAgICAgIGFsbENhdGNoQWxscy5wdXNoKHtcbiAgICAgICAgICAgIHM6c3dhcm1OYW1lLFxuICAgICAgICAgICAgcDpwaGFzZU5hbWUsXG4gICAgICAgICAgICBjOmNcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCQucmVtb3RlLnJlcXVlc3RNYW5hZ2VyLnBvbGwoZ2V0UmVtb3RlKHJlbW90ZUVuZFBvaW50LCBkb21haW5JbmZvLmRvbWFpbikgLCBjKTtcbiAgICB9O1xuXG4gICAgdGhpcy5vZmYgPSBmdW5jdGlvbihzd2FybU5hbWUsIHBoYXNlTmFtZSl7XG4gICAgICAgIGFsbENhdGNoQWxscy5mb3JFYWNoKGZ1bmN0aW9uKGNhKXtcbiAgICAgICAgICAgIGlmKChjYS5zID09PSBzd2FybU5hbWUgfHwgc3dhcm1OYW1lID09PSAnKicpICYmIChwaGFzZU5hbWUgPT09IGNhLnAgfHwgcGhhc2VOYW1lID09PSAnKicpKXtcbiAgICAgICAgICAgICAgICAkJC5yZW1vdGUucmVxdWVzdE1hbmFnZXIudW5wb2xsKGdldFJlbW90ZShyZW1vdGVFbmRQb2ludCwgZG9tYWluSW5mby5kb21haW4pLCBjYS5jKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMudXBsb2FkQ1NCID0gZnVuY3Rpb24oY3J5cHRvVWlkLCBiaW5hcnlEYXRhLCBjYWxsYmFjayl7XG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KGJhc2VPZlJlbW90ZUVuZFBvaW50ICsgXCIvQ1NCL1wiICsgY3J5cHRvVWlkLCBiaW5hcnlEYXRhLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIHRoaXMuZG93bmxvYWRDU0IgPSBmdW5jdGlvbihjcnlwdG9VaWQsIGNhbGxiYWNrKXtcbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cEdldChiYXNlT2ZSZW1vdGVFbmRQb2ludCArIFwiL0NTQi9cIiArIGNyeXB0b1VpZCwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBnZXRSZW1vdGUoYmFzZVVybCwgZG9tYWluKSB7XG4gICAgICAgIHJldHVybiB1cmxFbmRXaXRoU2xhc2goYmFzZVVybCkgKyAkJC5yZW1vdGUuYmFzZTY0RW5jb2RlKGRvbWFpbik7XG4gICAgfVxufVxuXG4vKioqKioqKioqKioqKioqKioqKioqKiBpbml0aWFsaXNhdGlvbiBzdHVmZiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuaWYgKHR5cGVvZiAkJCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICQkID0ge307XG59XG5cbmlmICh0eXBlb2YgICQkLnJlbW90ZSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICQkLnJlbW90ZSA9IHt9O1xuICAgICQkLnJlbW90ZS5jcmVhdGVSZXF1ZXN0TWFuYWdlciA9IGZ1bmN0aW9uKHRpbWVPdXQpe1xuICAgICAgICAkJC5yZW1vdGUucmVxdWVzdE1hbmFnZXIgPSBuZXcgUmVxdWVzdE1hbmFnZXIodGltZU91dCk7XG4gICAgfTtcblxuXG4gICAgJCQucmVtb3RlLmNyeXB0b1Byb3ZpZGVyID0gbnVsbDtcbiAgICAkJC5yZW1vdGUubmV3RW5kUG9pbnQgPSBmdW5jdGlvbihhbGlhcywgcmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKXtcbiAgICAgICAgaWYoYWxpYXMgPT09IFwibmV3UmVtb3RlRW5kUG9pbnRcIiB8fCBhbGlhcyA9PT0gXCJyZXF1ZXN0TWFuYWdlclwiIHx8IGFsaWFzID09PSBcImNyeXB0b1Byb3ZpZGVyXCIpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJQc2tIdHRwQ2xpZW50IFVuc2FmZSBhbGlhcyBuYW1lOlwiLCBhbGlhcyk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCQucmVtb3RlW2FsaWFzXSA9IG5ldyBQc2tIdHRwQ2xpZW50KHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgY3J5cHRvSW5mbyk7XG4gICAgfTtcblxuXG4gICAgJCQucmVtb3RlLmRvSHR0cFBvc3QgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBjYWxsYmFjayl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSB0aGlzIVwiKTtcbiAgICB9O1xuXG4gICAgJCQucmVtb3RlLmRvSHR0cEdldCA9IGZ1bmN0aW9uIGRvSHR0cEdldCh1cmwsIGNhbGxiYWNrKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlIHRoaXMhXCIpO1xuICAgIH07XG5cbiAgICAkJC5yZW1vdGUuYmFzZTY0RW5jb2RlID0gZnVuY3Rpb24gYmFzZTY0RW5jb2RlKHN0cmluZ1RvRW5jb2RlKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlIHRoaXMhXCIpO1xuICAgIH07XG5cbiAgICAkJC5yZW1vdGUuYmFzZTY0RGVjb2RlID0gZnVuY3Rpb24gYmFzZTY0RGVjb2RlKGVuY29kZWRTdHJpbmcpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgdGhpcyFcIik7XG4gICAgfTtcbn1cblxuXG5cbi8qICBpbnRlcmZhY2VcbmZ1bmN0aW9uIENyeXB0b1Byb3ZpZGVyKCl7XG5cbiAgICB0aGlzLmdlbmVyYXRlU2FmZVVpZCA9IGZ1bmN0aW9uKCl7XG5cbiAgICB9XG5cbiAgICB0aGlzLnNpZ25Td2FybSA9IGZ1bmN0aW9uKHN3YXJtLCBhZ2VudCl7XG5cbiAgICB9XG59ICovXG4iLCIkJC5yZW1vdGUuZG9IdHRwUG9zdCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQgJiYgKHhoci5zdGF0dXMgPj0gMjAwICYmIHhoci5zdGF0dXMgPCAzMDApKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0geGhyLnJlc3BvbnNlO1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZih4aHIuc3RhdHVzPj00MDApe1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihcIkFuIGVycm9yIG9jY3VyZWQuIFN0YXR1c0NvZGU6IFwiICsgeGhyLnN0YXR1cykpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgU3RhdHVzIGNvZGUgJHt4aHIuc3RhdHVzfSByZWNlaXZlZCwgcmVzcG9uc2UgaXMgaWdub3JlZC5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB4aHIub3BlbihcIlBPU1RcIiwgdXJsLCB0cnVlKTtcbiAgICAvL3hoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04XCIpO1xuXG4gICAgaWYoZGF0YSAmJiBkYXRhLnBpcGUgJiYgdHlwZW9mIGRhdGEucGlwZSA9PT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgY29uc3QgYnVmZmVycyA9IFtdO1xuICAgICAgICBkYXRhLm9uKFwiZGF0YVwiLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBidWZmZXJzLnB1c2goZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgICBkYXRhLm9uKFwiZW5kXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgYWN0dWFsQ29udGVudHMgPSBCdWZmZXIuY29uY2F0KGJ1ZmZlcnMpO1xuICAgICAgICAgICAgeGhyLnNlbmQoYWN0dWFsQ29udGVudHMpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmKEFycmF5QnVmZmVyLmlzVmlldyhkYXRhKSkge1xuICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHhoci5zZW5kKGRhdGEpO1xuICAgIH1cbn07XG5cblxuJCQucmVtb3RlLmRvSHR0cEdldCA9IGZ1bmN0aW9uIGRvSHR0cEdldCh1cmwsIGNhbGxiYWNrKSB7XG5cbiAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvL2NoZWNrIGlmIGhlYWRlcnMgd2VyZSByZWNlaXZlZCBhbmQgaWYgYW55IGFjdGlvbiBzaG91bGQgYmUgcGVyZm9ybWVkIGJlZm9yZSByZWNlaXZpbmcgZGF0YVxuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDIpIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZSA9IHhoci5nZXRSZXNwb25zZUhlYWRlcihcIkNvbnRlbnQtVHlwZVwiKTtcbiAgICAgICAgICAgIGlmIChjb250ZW50VHlwZSA9PT0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIikge1xuICAgICAgICAgICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT0gNCAmJiB4aHIuc3RhdHVzID09IFwiMjAwXCIpIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZSA9IHhoci5nZXRSZXNwb25zZUhlYWRlcihcIkNvbnRlbnQtVHlwZVwiKTtcblxuICAgICAgICAgICAgaWYoY29udGVudFR5cGU9PT1cImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiKXtcbiAgICAgICAgICAgICAgICBsZXQgcmVzcG9uc2VCdWZmZXIgPSBCdWZmZXIuZnJvbSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZUJ1ZmZlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihcIkFuIGVycm9yIG9jY3VyZWQuIFN0YXR1c0NvZGU6IFwiICsgeGhyLnN0YXR1cykpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHhoci5vcGVuKFwiR0VUXCIsIHVybCk7XG4gICAgeGhyLnNlbmQoKTtcbn07XG5cblxuZnVuY3Rpb24gQ3J5cHRvUHJvdmlkZXIoKXtcblxuICAgIHRoaXMuZ2VuZXJhdGVTYWZlVWlkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgbGV0IHVpZCA9IFwiXCI7XG4gICAgICAgIHZhciBhcnJheSA9IG5ldyBVaW50MzJBcnJheSgxMCk7XG4gICAgICAgIHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKGFycmF5KTtcblxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHVpZCArPSBhcnJheVtpXS50b1N0cmluZygxNik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdWlkO1xuICAgIH1cblxuICAgIHRoaXMuc2lnblN3YXJtID0gZnVuY3Rpb24oc3dhcm0sIGFnZW50KXtcbiAgICAgICAgc3dhcm0ubWV0YS5zaWduYXR1cmUgPSBhZ2VudDtcbiAgICB9XG59XG5cblxuXG4kJC5yZW1vdGUuY3J5cHRvUHJvdmlkZXIgPSBuZXcgQ3J5cHRvUHJvdmlkZXIoKTtcblxuJCQucmVtb3RlLmJhc2U2NEVuY29kZSA9IGZ1bmN0aW9uIGJhc2U2NEVuY29kZShzdHJpbmdUb0VuY29kZSl7XG4gICAgcmV0dXJuIHdpbmRvdy5idG9hKHN0cmluZ1RvRW5jb2RlKTtcbn07XG5cbiQkLnJlbW90ZS5iYXNlNjREZWNvZGUgPSBmdW5jdGlvbiBiYXNlNjREZWNvZGUoZW5jb2RlZFN0cmluZyl7XG4gICAgcmV0dXJuIHdpbmRvdy5hdG9iKGVuY29kZWRTdHJpbmcpO1xufTtcbiIsInJlcXVpcmUoXCIuL3Bzay1hYnN0cmFjdC1jbGllbnRcIik7XG5cbmNvbnN0IGh0dHAgPSByZXF1aXJlKFwiaHR0cFwiKTtcbmNvbnN0IGh0dHBzID0gcmVxdWlyZShcImh0dHBzXCIpO1xuY29uc3QgVVJMID0gcmVxdWlyZShcInVybFwiKTtcbmNvbnN0IHVzZXJBZ2VudCA9ICdQU0sgTm9kZUFnZW50LzAuMC4xJztcblxuY29uc29sZS5sb2coXCJQU0sgbm9kZSBjbGllbnQgbG9hZGluZ1wiKTtcblxuZnVuY3Rpb24gZ2V0TmV0d29ya0Zvck9wdGlvbnMob3B0aW9ucykge1xuXHRpZihvcHRpb25zLnByb3RvY29sID09PSAnaHR0cDonKSB7XG5cdFx0cmV0dXJuIGh0dHA7XG5cdH0gZWxzZSBpZihvcHRpb25zLnByb3RvY29sID09PSAnaHR0cHM6Jykge1xuXHRcdHJldHVybiBodHRwcztcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYENhbid0IGhhbmRsZSBwcm90b2NvbCAke29wdGlvbnMucHJvdG9jb2x9YCk7XG5cdH1cblxufVxuXG4kJC5yZW1vdGUuZG9IdHRwUG9zdCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGNhbGxiYWNrKXtcblx0Y29uc3QgaW5uZXJVcmwgPSBVUkwucGFyc2UodXJsKTtcblxuXHRjb25zdCBvcHRpb25zID0ge1xuXHRcdGhvc3RuYW1lOiBpbm5lclVybC5ob3N0bmFtZSxcblx0XHRwYXRoOiBpbm5lclVybC5wYXRobmFtZSxcblx0XHRwb3J0OiBwYXJzZUludChpbm5lclVybC5wb3J0KSxcblx0XHRoZWFkZXJzOiB7XG5cdFx0XHQnVXNlci1BZ2VudCc6IHVzZXJBZ2VudFxuXHRcdH0sXG5cdFx0bWV0aG9kOiAnUE9TVCdcblx0fTtcblxuXHRjb25zdCBuZXR3b3JrID0gZ2V0TmV0d29ya0Zvck9wdGlvbnMoaW5uZXJVcmwpO1xuXG5cdGlmKEFycmF5QnVmZmVyLmlzVmlldyhkYXRhKSB8fCBCdWZmZXIuaXNCdWZmZXIoZGF0YSkpIHtcblx0XHRpZighQnVmZmVyLmlzQnVmZmVyKGRhdGEpKSB7XG5cdFx0XHRkYXRhID0gQnVmZmVyLmZyb20oZGF0YSk7XG5cdFx0fVxuXG5cdFx0b3B0aW9ucy5oZWFkZXJzWydDb250ZW50LVR5cGUnXSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nO1xuXHRcdG9wdGlvbnMuaGVhZGVyc1snQ29udGVudC1MZW5ndGgnXSA9IGRhdGEubGVuZ3RoO1xuXHR9XG5cblx0Y29uc3QgcmVxID0gbmV0d29yay5yZXF1ZXN0KG9wdGlvbnMsIChyZXMpID0+IHtcblx0XHRjb25zdCB7IHN0YXR1c0NvZGUgfSA9IHJlcztcblxuXHRcdGxldCBlcnJvcjtcblx0XHRpZiAoc3RhdHVzQ29kZSA+PSA0MDApIHtcblx0XHRcdGVycm9yID0gbmV3IEVycm9yKCdSZXF1ZXN0IEZhaWxlZC5cXG4nICtcblx0XHRcdFx0YFN0YXR1cyBDb2RlOiAke3N0YXR1c0NvZGV9YCk7XG5cdFx0fVxuXG5cdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRjYWxsYmFjayhlcnJvcik7XG5cdFx0XHQvLyBmcmVlIHVwIG1lbW9yeVxuXHRcdFx0cmVzLnJlc3VtZSgpO1xuXHRcdFx0cmV0dXJuIDtcblx0XHR9XG5cblx0XHRsZXQgcmF3RGF0YSA9ICcnO1xuXHRcdHJlcy5vbignZGF0YScsIChjaHVuaykgPT4geyByYXdEYXRhICs9IGNodW5rOyB9KTtcblx0XHRyZXMub24oJ2VuZCcsICgpID0+IHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCByYXdEYXRhKTtcblx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSkub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coXCJQT1NUIEVycm9yXCIsIGVycm9yKTtcblx0XHRjYWxsYmFjayhlcnJvcik7XG5cdH0pO1xuXG4gICAgaWYoZGF0YSAmJiBkYXRhLnBpcGUgJiYgdHlwZW9mIGRhdGEucGlwZSA9PT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgZGF0YS5waXBlKHJlcSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZih0eXBlb2YgZGF0YSAhPT0gJ3N0cmluZycgJiYgIUJ1ZmZlci5pc0J1ZmZlcihkYXRhKSAmJiAhQXJyYXlCdWZmZXIuaXNWaWV3KGRhdGEpKSB7XG5cdFx0ZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuXHR9XG5cblx0cmVxLndyaXRlKGRhdGEpO1xuXHRyZXEuZW5kKCk7XG59O1xuXG4kJC5yZW1vdGUuZG9IdHRwR2V0ID0gZnVuY3Rpb24gZG9IdHRwR2V0KHVybCwgY2FsbGJhY2spe1xuICAgIGNvbnN0IGlubmVyVXJsID0gVVJMLnBhcnNlKHVybCk7XG5cblx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRob3N0bmFtZTogaW5uZXJVcmwuaG9zdG5hbWUsXG5cdFx0cGF0aDogaW5uZXJVcmwucGF0aG5hbWUgKyAoaW5uZXJVcmwuc2VhcmNoIHx8ICcnKSxcblx0XHRwb3J0OiBwYXJzZUludChpbm5lclVybC5wb3J0KSxcblx0XHRoZWFkZXJzOiB7XG5cdFx0XHQnVXNlci1BZ2VudCc6IHVzZXJBZ2VudFxuXHRcdH0sXG5cdFx0bWV0aG9kOiAnR0VUJ1xuXHR9O1xuXG5cdGNvbnN0IG5ldHdvcmsgPSBnZXROZXR3b3JrRm9yT3B0aW9ucyhpbm5lclVybCk7XG5cblx0Y29uc3QgcmVxID0gbmV0d29yay5yZXF1ZXN0KG9wdGlvbnMsIChyZXMpID0+IHtcblx0XHRjb25zdCB7IHN0YXR1c0NvZGUgfSA9IHJlcztcblxuXHRcdGxldCBlcnJvcjtcblx0XHRpZiAoc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG5cdFx0XHRlcnJvciA9IG5ldyBFcnJvcignUmVxdWVzdCBGYWlsZWQuXFxuJyArXG5cdFx0XHRcdGBTdGF0dXMgQ29kZTogJHtzdGF0dXNDb2RlfWApO1xuXHRcdFx0ZXJyb3IuY29kZSA9IHN0YXR1c0NvZGU7XG5cdFx0fVxuXG5cdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRjYWxsYmFjayhlcnJvcik7XG5cdFx0XHQvLyBmcmVlIHVwIG1lbW9yeVxuXHRcdFx0cmVzLnJlc3VtZSgpO1xuXHRcdFx0cmV0dXJuIDtcblx0XHR9XG5cblx0XHRsZXQgcmF3RGF0YTtcblx0XHRjb25zdCBjb250ZW50VHlwZSA9IHJlcy5oZWFkZXJzWydjb250ZW50LXR5cGUnXTtcblxuXHRcdGlmKGNvbnRlbnRUeXBlID09PSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiKXtcblx0XHRcdHJhd0RhdGEgPSBbXTtcblx0XHR9ZWxzZXtcblx0XHRcdHJhd0RhdGEgPSAnJztcblx0XHR9XG5cblx0XHRyZXMub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcblx0XHRcdGlmKEFycmF5LmlzQXJyYXkocmF3RGF0YSkpe1xuXHRcdFx0XHRyYXdEYXRhLnB1c2goLi4uY2h1bmspO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHJhd0RhdGEgKz0gY2h1bms7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmVzLm9uKCdlbmQnLCAoKSA9PiB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZihBcnJheS5pc0FycmF5KHJhd0RhdGEpKXtcblx0XHRcdFx0XHRyYXdEYXRhID0gQnVmZmVyLmZyb20ocmF3RGF0YSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIHJhd0RhdGEpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ2xpZW50IGVycm9yOlwiLCBlcnIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHRyZXEub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcblx0XHRpZihlcnJvciAmJiBlcnJvci5jb2RlICE9PSAnRUNPTk5SRVNFVCcpe1xuICAgICAgICBcdGNvbnNvbGUubG9nKFwiR0VUIEVycm9yXCIsIGVycm9yKTtcblx0XHR9XG5cblx0XHRjYWxsYmFjayhlcnJvcik7XG5cdH0pO1xuXG5cdHJlcS5lbmQoKTtcbn07XG5cbiQkLnJlbW90ZS5iYXNlNjRFbmNvZGUgPSBmdW5jdGlvbiBiYXNlNjRFbmNvZGUoc3RyaW5nVG9FbmNvZGUpe1xuICAgIHJldHVybiBCdWZmZXIuZnJvbShzdHJpbmdUb0VuY29kZSkudG9TdHJpbmcoJ2Jhc2U2NCcpO1xufTtcblxuJCQucmVtb3RlLmJhc2U2NERlY29kZSA9IGZ1bmN0aW9uIGJhc2U2NERlY29kZShlbmNvZGVkU3RyaW5nKXtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20oZW5jb2RlZFN0cmluZywgJ2Jhc2U2NCcpLnRvU3RyaW5nKCdhc2NpaScpO1xufTtcbiIsIi8qIVxuICogRGV0ZXJtaW5lIGlmIGFuIG9iamVjdCBpcyBhIEJ1ZmZlclxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxuLy8gVGhlIF9pc0J1ZmZlciBjaGVjayBpcyBmb3IgU2FmYXJpIDUtNyBzdXBwb3J0LCBiZWNhdXNlIGl0J3MgbWlzc2luZ1xuLy8gT2JqZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvci4gUmVtb3ZlIHRoaXMgZXZlbnR1YWxseVxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiBvYmogIT0gbnVsbCAmJiAoaXNCdWZmZXIob2JqKSB8fCBpc1Nsb3dCdWZmZXIob2JqKSB8fCAhIW9iai5faXNCdWZmZXIpXG59XG5cbmZ1bmN0aW9uIGlzQnVmZmVyIChvYmopIHtcbiAgcmV0dXJuICEhb2JqLmNvbnN0cnVjdG9yICYmIHR5cGVvZiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iailcbn1cblxuLy8gRm9yIE5vZGUgdjAuMTAgc3VwcG9ydC4gUmVtb3ZlIHRoaXMgZXZlbnR1YWxseS5cbmZ1bmN0aW9uIGlzU2xvd0J1ZmZlciAob2JqKSB7XG4gIHJldHVybiB0eXBlb2Ygb2JqLnJlYWRGbG9hdExFID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBvYmouc2xpY2UgPT09ICdmdW5jdGlvbicgJiYgaXNCdWZmZXIob2JqLnNsaWNlKDAsIDApKVxufVxuIiwiLypcbk1vZHVsZSB0aGF0IG9mZmVycyBBUElzIHRvIGludGVyYWN0IHdpdGggUHJpdmF0ZVNreSB3ZWIgc2FuZGJveGVzXG4gKi9cblxuXG5jb25zdCBleHBvcnRCcm93c2VySW50ZXJhY3QgPSB7XG4gICAgZW5hYmxlSWZyYW1lSW50ZXJhY3Rpb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmNyZWF0ZVdpbmRvd01RID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL3NwZWNpZmljTVFJbXBsL0NoaWxkV25kTVFcIikuY3JlYXRlTVE7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmNyZWF0ZVdpbmRvd0ludGVyYWN0aW9uU3BhY2UgPSByZXF1aXJlKFwiLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvV2luZG93TVFJbnRlcmFjdGlvblNwYWNlXCIpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2U7XG4gICAgfSxcbiAgICBlbmFibGVSZWFjdEludGVyYWN0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVXaW5kb3dNUSA9IHJlcXVpcmUoXCIuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9zcGVjaWZpY01RSW1wbC9DaGlsZFduZE1RXCIpLmNyZWF0ZU1RO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVXaW5kb3dJbnRlcmFjdGlvblNwYWNlID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1dpbmRvd01RSW50ZXJhY3Rpb25TcGFjZVwiKS5jcmVhdGVJbnRlcmFjdGlvblNwYWNlO1xuICAgIH0sXG4gICAgZW5hYmxlV2ViVmlld0ludGVyYWN0aW9uczpmdW5jdGlvbigpe1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVXaW5kb3dJbnRlcmFjdGlvblNwYWNlID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1dlYlZpZXdNUUludGVyYWN0aW9uU3BhY2VcIikuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuY3JlYXRlV2luZG93TVEgPSByZXF1aXJlKFwiLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvc3BlY2lmaWNNUUltcGwvQ2hpbGRXZWJWaWV3TVFcIikuY3JlYXRlTVE7XG4gICAgfSxcbiAgICBlbmFibGVMb2NhbEludGVyYWN0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVJbnRlcmFjdGlvblNwYWNlID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1NvdW5kUHViU3ViTVFCYXNlZEludGVyYWN0aW9uU3BhY2VcIikuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZTtcbiAgICB9LFxuICAgIGVuYWJsZVJlbW90ZUludGVyYWN0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVSZW1vdGVJbnRlcmFjdGlvblNwYWNlID0gcmVxdWlyZSgnLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvaHR0cEludGVyYWN0aW9uU3BhY2UnKS5jcmVhdGVJbnRlcmFjdGlvblNwYWNlO1xuICAgIH1cbn07XG5cblxuaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydEJyb3dzZXJJbnRlcmFjdDtcbn1cbmVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICBjcmVhdGVOb2RlSW50ZXJhY3Rpb25TcGFjZTogcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL2ZvbGRlck1RQmFzZWRJbnRlcmFjdGlvblNwYWNlXCIpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UsXG4gICAgICAgIGNyZWF0ZUludGVyYWN0aW9uU3BhY2U6IHJlcXVpcmUoXCIuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9Tb3VuZFB1YlN1Yk1RQmFzZWRJbnRlcmFjdGlvblNwYWNlXCIpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UsXG4gICAgICAgIGNyZWF0ZVJlbW90ZUludGVyYWN0aW9uU3BhY2U6IHJlcXVpcmUoJy4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL2h0dHBJbnRlcmFjdGlvblNwYWNlJykuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZVxuICAgIH07XG59IiwiLy90byBsb29rIG5pY2UgdGhlIHJlcXVpcmVNb2R1bGUgb24gTm9kZVxucmVxdWlyZShcIi4vbGliL3Bzay1hYnN0cmFjdC1jbGllbnRcIik7XG5pZighJCQuYnJvd3NlclJ1bnRpbWUpe1xuXHRyZXF1aXJlKFwiLi9saWIvcHNrLW5vZGUtY2xpZW50XCIpO1xufWVsc2V7XG5cdHJlcXVpcmUoXCIuL2xpYi9wc2stYnJvd3Nlci1jbGllbnRcIik7XG59Il19
