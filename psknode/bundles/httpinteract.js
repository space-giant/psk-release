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

},{"./psk-abstract-client":"/home/cosmin/Workspace/reorganizing/privatesky/modules/psk-http-client/lib/psk-abstract-client.js","buffer":false,"http":false,"https":false,"url":false}],"interact":[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZHMvdG1wL2h0dHBpbnRlcmFjdF9pbnRlcm1lZGlhci5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1NvdW5kUHViU3ViTVFCYXNlZEludGVyYWN0aW9uU3BhY2UuanMiLCJtb2R1bGVzL2ludGVyYWN0L2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9XZWJWaWV3TVFJbnRlcmFjdGlvblNwYWNlLmpzIiwibW9kdWxlcy9pbnRlcmFjdC9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvV2luZG93TVFJbnRlcmFjdGlvblNwYWNlLmpzIiwibW9kdWxlcy9pbnRlcmFjdC9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvZm9sZGVyTVFCYXNlZEludGVyYWN0aW9uU3BhY2UuanMiLCJtb2R1bGVzL2ludGVyYWN0L2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9odHRwSW50ZXJhY3Rpb25TcGFjZS5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL3NwZWNpZmljTVFJbXBsL0NoaWxkV2ViVmlld01RLmpzIiwibW9kdWxlcy9pbnRlcmFjdC9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvc3BlY2lmaWNNUUltcGwvQ2hpbGRXbmRNUS5qcyIsIm1vZHVsZXMvaW50ZXJhY3QvbGliL3N3YXJtSW50ZXJhY3Rpb24uanMiLCJtb2R1bGVzL3Bzay1odHRwLWNsaWVudC9saWIvcHNrLWFic3RyYWN0LWNsaWVudC5qcyIsIm1vZHVsZXMvcHNrLWh0dHAtY2xpZW50L2xpYi9wc2stYnJvd3Nlci1jbGllbnQuanMiLCJtb2R1bGVzL3Bzay1odHRwLWNsaWVudC9saWIvcHNrLW5vZGUtY2xpZW50LmpzIiwibW9kdWxlcy9pbnRlcmFjdC9pbmRleC5qcyIsIm1vZHVsZXMvcHNrLWh0dHAtY2xpZW50L2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM5V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImdsb2JhbC5odHRwaW50ZXJhY3RMb2FkTW9kdWxlcyA9IGZ1bmN0aW9uKCl7IFxuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wiaW50ZXJhY3RcIl0gPSByZXF1aXJlKFwiaW50ZXJhY3RcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJwc2staHR0cC1jbGllbnRcIl0gPSByZXF1aXJlKFwicHNrLWh0dHAtY2xpZW50XCIpO1xufVxuaWYgKGZhbHNlKSB7XG5cdGh0dHBpbnRlcmFjdExvYWRNb2R1bGVzKCk7XG59OyBcbmdsb2JhbC5odHRwaW50ZXJhY3RSZXF1aXJlID0gcmVxdWlyZTtcbmlmICh0eXBlb2YgJCQgIT09IFwidW5kZWZpbmVkXCIpIHsgICAgICAgICAgICBcbiAgICAkJC5yZXF1aXJlQnVuZGxlKFwiaHR0cGludGVyYWN0XCIpO1xufTsiLCJmdW5jdGlvbiBNZW1vcnlNUUludGVyYWN0aW9uU3BhY2UoKSB7XG4gICAgdmFyIHN3YXJtSW50ZXJhY3QgPSByZXF1aXJlKFwiLi8uLi9zd2FybUludGVyYWN0aW9uXCIpO1xuICAgIHZhciBzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnMgPSB7fTtcblxuICAgIGZ1bmN0aW9uIGRpc3BhdGNoaW5nU3dhcm1zKHN3YXJtKXtcblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgc3Vic0xpc3QgPSBzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm0ubWV0YS5zd2FybUlkXTtcbiAgICAgICAgICAgIGlmKHN1YnNMaXN0KXtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGk9MDsgaTxzdWJzTGlzdC5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVyID0gc3Vic0xpc3RbaV07XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXIobnVsbCwgc3dhcm0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMSk7XG4gICAgfVxuXG4gICAgdmFyIGluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgZnVuY3Rpb24gaW5pdCgpe1xuXHRcdGlmKCFpbml0aWFsaXplZCl7XG5cdFx0XHRpbml0aWFsaXplZCA9IHRydWU7XG5cdFx0XHQkJC5QU0tfUHViU3ViLnN1YnNjcmliZSgkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTiwgZGlzcGF0Y2hpbmdTd2FybXMpO1xuXHRcdH1cbiAgICB9XG5cbiAgICB2YXIgY29tbSA9IHtcbiAgICAgICAgc3RhcnRTd2FybTogZnVuY3Rpb24gKHN3YXJtTmFtZSwgY3RvciwgYXJncykge1xuXHRcdFx0aW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuICQkLnN3YXJtLnN0YXJ0KHN3YXJtTmFtZSwgY3RvciwgLi4uYXJncyk7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRpbnVlU3dhcm06IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIHN3YXJtU2VyaWFsaXNhdGlvbiwgY3RvciwgYXJncykge1xuXHRcdFx0aW5pdCgpO1xuICAgICAgICAgICAgc3dhcm1IYW5kbGVyW2N0b3JdLmFwcGx5KHN3YXJtSGFuZGxlciwgYXJncyk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBjYWxsYmFjaykge1xuXHRcdFx0aW5pdCgpO1xuICAgICAgICAgICAgaWYoIXN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybUhhbmRsZXIuZ2V0SW5uZXJWYWx1ZSgpLm1ldGEuc3dhcm1JZF0pe1xuXHRcdFx0XHRzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm1IYW5kbGVyLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtSWRdID0gWyBjYWxsYmFjayBdO1xuICAgICAgICAgICAgfWVsc2V7XG5cdFx0XHRcdHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybUhhbmRsZXIuZ2V0SW5uZXJWYWx1ZSgpLm1ldGEuc3dhcm1JZF0ucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9mZjogZnVuY3Rpb24gKHN3YXJtSGFuZGxlcikge1xuXHRcdFx0aWYoc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXSl7XG5cdFx0XHRcdHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybUhhbmRsZXIuZ2V0SW5uZXJWYWx1ZSgpLm1ldGEuc3dhcm1JZF0gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gc3dhcm1JbnRlcmFjdC5uZXdJbnRlcmFjdGlvblNwYWNlKGNvbW0pO1xuXG59XG5cbnZhciBzcGFjZTtcbm1vZHVsZS5leHBvcnRzLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYoIXNwYWNlKXtcbiAgICAgICAgc3BhY2UgPSBuZXcgTWVtb3J5TVFJbnRlcmFjdGlvblNwYWNlKCk7XG4gICAgfWVsc2V7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTWVtb3J5TVFJbnRlcmFjdGlvblNwYWNlIGFscmVhZHkgY3JlYXRlZCEgVXNpbmcgc2FtZSBpbnN0YW5jZS5cIik7XG4gICAgfVxuICAgIHJldHVybiBzcGFjZTtcbn07IiwiZnVuY3Rpb24gV2luZG93TVFJbnRlcmFjdGlvblNwYWNlKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93LCBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCl7XG4gICAgdmFyIHN3YXJtSW50ZXJhY3QgPSByZXF1aXJlKFwiLi8uLi9zd2FybUludGVyYWN0aW9uXCIpO1xuICAgIHZhciBjaGlsZE1lc3NhZ2VNUSA9IHJlcXVpcmUoXCIuL3NwZWNpZmljTVFJbXBsL0NoaWxkV2ViVmlld01RXCIpLmNyZWF0ZU1RKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93LCBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCk7XG4gICAgdmFyIHN3YXJtSW5zdGFuY2VzID0ge307XG5cbiAgICB2YXIgY29tbSA9IHtcbiAgICAgICAgc3RhcnRTd2FybTogZnVuY3Rpb24gKHN3YXJtTmFtZSwgY3RvciwgYXJncykge1xuICAgICAgICAgICAgdmFyIHN3YXJtID0ge21ldGE6e1xuICAgICAgICAgICAgICAgICAgICBzd2FybVR5cGVOYW1lOnN3YXJtTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgY3RvcjpjdG9yLFxuICAgICAgICAgICAgICAgICAgICBhcmdzOmFyZ3NcbiAgICAgICAgICAgICAgICB9fTtcbiAgICAgICAgICAgIGNoaWxkTWVzc2FnZU1RLnByb2R1Y2Uoc3dhcm0pO1xuICAgICAgICAgICAgcmV0dXJuIHN3YXJtO1xuICAgICAgICB9LFxuICAgICAgICBjb250aW51ZVN3YXJtOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBzd2FybVNlcmlhbGlzYXRpb24sIHBoYXNlTmFtZSwgYXJncykge1xuXG4gICAgICAgICAgICB2YXIgbmV3U2VyaWFsaXphdGlvbiA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc3dhcm1TZXJpYWxpc2F0aW9uKSk7XG4gICAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uLm1ldGEuY3RvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS5waGFzZU5hbWUgPSBwaGFzZU5hbWU7XG4gICAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uLm1ldGEudGFyZ2V0ID0gXCJpZnJhbWVcIjtcbiAgICAgICAgICAgIG5ld1NlcmlhbGl6YXRpb24ubWV0YS5hcmdzID0gYXJncztcbiAgICAgICAgICAgIGNoaWxkTWVzc2FnZU1RLnByb2R1Y2UobmV3U2VyaWFsaXphdGlvbik7XG4gICAgICAgIH0sXG4gICAgICAgIG9uOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2hpbGRNZXNzYWdlTVEucmVnaXN0ZXJDb25zdW1lcihjYWxsYmFjayk7XG4gICAgICAgIH0sXG4gICAgICAgIG9mZjogZnVuY3Rpb24gKHN3YXJtSGFuZGxlcikge1xuXG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICB2YXIgc3BhY2UgPSBzd2FybUludGVyYWN0Lm5ld0ludGVyYWN0aW9uU3BhY2UoY29tbSk7XG4gICAgdGhpcy5zdGFydFN3YXJtID0gZnVuY3Rpb24gKG5hbWUsIGN0b3IsIC4uLmFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIHNwYWNlLnN0YXJ0U3dhcm0obmFtZSwgY3RvciwgLi4uYXJncyk7XG4gICAgfTtcblxuICAgIHRoaXMuaW5pdCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBjaGlsZE1lc3NhZ2VNUS5yZWdpc3RlckNvbnN1bWVyKGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHN3YXJtO1xuICAgICAgICAgICAgICAgIGlmKGRhdGEgJiYgZGF0YS5tZXRhICYmIGRhdGEubWV0YS5zd2FybUlkICYmIHN3YXJtSW5zdGFuY2VzW2RhdGEubWV0YS5zd2FybUlkXSl7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtID0gc3dhcm1JbnN0YW5jZXNbZGF0YS5tZXRhLnN3YXJtSWRdO1xuICAgICAgICAgICAgICAgICAgICBzd2FybS51cGRhdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtW2RhdGEubWV0YS5waGFzZU5hbWVdLmFwcGx5KHN3YXJtLCBkYXRhLm1ldGEuYXJncyk7XG4gICAgICAgICAgICAgICAgfWVsc2V7XG5cbiAgICAgICAgICAgICAgICAgICAgc3dhcm0gPSAkJC5zd2FybS5zdGFydChkYXRhLm1ldGEuc3dhcm1UeXBlTmFtZSwgZGF0YS5tZXRhLmN0b3IsIC4uLmRhdGEubWV0YS5hcmdzKTtcblxuICAgICAgICAgICAgICAgICAgICBzd2FybUluc3RhbmNlc1tzd2FybS5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkXSA9IHN3YXJtO1xuXG4gICAgICAgICAgICAgICAgICAgIHN3YXJtLm9uUmV0dXJuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTd2FybSBpcyBmaW5pc2hlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCByZWFkeUV2dCA9IHt3ZWJWaWV3SXNSZWFkeTogdHJ1ZX07XG4gICAgICAgIHBhcmVudC5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeShyZWFkeUV2dCksIFwiKlwiKTtcblxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVyKG1lc3NhZ2Upe1xuICAgICAgICBsb2coXCJzZW5kaW5nIHN3YXJtIFwiLCBtZXNzYWdlKTtcbiAgICAgICAgY2hpbGRNZXNzYWdlTVEucHJvZHVjZShtZXNzYWdlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWx0ZXJJbnRlcmFjdGlvbnMobWVzc2FnZSl7XG4gICAgICAgIGxvZyhcImNoZWNraW5nIGlmIG1lc3NhZ2UgaXMgJ2ludGVyYWN0aW9uJyBcIiwgbWVzc2FnZSk7XG4gICAgICAgIHJldHVybiBtZXNzYWdlICYmIG1lc3NhZ2UubWV0YSAmJiBtZXNzYWdlLm1ldGEudGFyZ2V0ICYmIG1lc3NhZ2UubWV0YS50YXJnZXQgPT09IFwiaW50ZXJhY3Rpb25cIjtcbiAgICB9XG4gICAgLy9UT0RPIGZpeCB0aGlzIGZvciBuYXRpdmVXZWJWaWV3XG5cbiAgICAkJC5QU0tfUHViU3ViLnN1YnNjcmliZSgkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTiwgaGFuZGxlciwgZnVuY3Rpb24oKXtyZXR1cm4gdHJ1ZTt9LCBmaWx0ZXJJbnRlcmFjdGlvbnMpO1xuXG4gICAgbG9nKFwicmVnaXN0ZXJpbmcgbGlzdGVuZXIgZm9yIGhhbmRsaW5nIGludGVyYWN0aW9uc1wiKTtcblxuICAgIGZ1bmN0aW9uIGxvZyguLi5hcmdzKXtcbiAgICAgICAgYXJncy51bnNoaWZ0KFwiW1dpbmRvd01RSW50ZXJhY3Rpb25TcGFjZVwiKyh3aW5kb3cuZnJhbWVFbGVtZW50ID8gXCIqXCI6IFwiXCIpK1wiXVwiICk7XG4gICAgICAgIC8vY29uc29sZS5sb2cuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVJbnRlcmFjdGlvblNwYWNlID0gZnVuY3Rpb24oY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3csIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsKXtcbiAgICByZXR1cm4gbmV3IFdpbmRvd01RSW50ZXJhY3Rpb25TcGFjZShjaGFubmVsTmFtZSwgY29tbXVuaWNhdGlvbldpbmRvdywgc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwpO1xufTsiLCIvKlRPRE9cbkZvciB0aGUgbW9tZW50IEkgZG9uJ3Qgc2VlIGFueSBwcm9ibGVtcyBpZiBpdCdzIG5vdCBjcnlwdG9ncmFwaGljIHNhZmUuXG5UaGlzIHZlcnNpb24ga2VlcHMgIGNvbXBhdGliaWxpdHkgd2l0aCBtb2JpbGUgYnJvd3NlcnMvd2Vidmlld3MuXG4gKi9cbmZ1bmN0aW9uIHV1aWR2NCgpIHtcbiAgICByZXR1cm4gJ3h4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eCcucmVwbGFjZSgvW3h5XS9nLCBmdW5jdGlvbiAoYykge1xuICAgICAgICB2YXIgciA9IE1hdGgucmFuZG9tKCkgKiAxNiB8IDAsIHYgPSBjID09PSAneCcgPyByIDogKHIgJiAweDMgfCAweDgpO1xuICAgICAgICByZXR1cm4gdi50b1N0cmluZygxNik7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIFdpbmRvd01RSW50ZXJhY3Rpb25TcGFjZShjaGFubmVsTmFtZSwgY29tbXVuaWNhdGlvbldpbmRvdykge1xuICAgIHZhciBzd2FybUludGVyYWN0ID0gcmVxdWlyZShcIi4vLi4vc3dhcm1JbnRlcmFjdGlvblwiKTtcbiAgICB2YXIgY2hpbGRNZXNzYWdlTVEgPSByZXF1aXJlKFwiLi9zcGVjaWZpY01RSW1wbC9DaGlsZFduZE1RXCIpLmNyZWF0ZU1RKGNoYW5uZWxOYW1lLCBjb21tdW5pY2F0aW9uV2luZG93KTtcbiAgICB2YXIgc3dhcm1JbnN0YW5jZXMgPSB7fTtcblxuICAgIHZhciBjb21tID0ge1xuICAgICAgICBzdGFydFN3YXJtOiBmdW5jdGlvbiAoc3dhcm1OYW1lLCBjdG9yLCBhcmdzKSB7XG5cbiAgICAgICAgICAgIHZhciB1bmlxdWVJZCA9IHV1aWR2NCgpO1xuICAgICAgICAgICAgdmFyIHN3YXJtID0ge1xuICAgICAgICAgICAgICAgIG1ldGE6IHtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm1UeXBlTmFtZTogc3dhcm1OYW1lLFxuICAgICAgICAgICAgICAgICAgICBjdG9yOiBjdG9yLFxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBhcmdzLFxuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0SWQ6IHVuaXF1ZUlkLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjaGlsZE1lc3NhZ2VNUS5wcm9kdWNlKHN3YXJtKTtcbiAgICAgICAgICAgIHJldHVybiBzd2FybTtcbiAgICAgICAgfSxcbiAgICAgICAgY29udGludWVTd2FybTogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgc3dhcm1TZXJpYWxpc2F0aW9uLCBwaGFzZU5hbWUsIGFyZ3MpIHtcblxuICAgICAgICAgICAgdmFyIG5ld1NlcmlhbGl6YXRpb24gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHN3YXJtU2VyaWFsaXNhdGlvbikpO1xuICAgICAgICAgICAgbmV3U2VyaWFsaXphdGlvbi5tZXRhLmN0b3IgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uLm1ldGEucGhhc2VOYW1lID0gcGhhc2VOYW1lO1xuICAgICAgICAgICAgbmV3U2VyaWFsaXphdGlvbi5tZXRhLnRhcmdldCA9IFwiaWZyYW1lXCI7XG4gICAgICAgICAgICBuZXdTZXJpYWxpemF0aW9uLm1ldGEuYXJncyA9IGFyZ3M7XG4gICAgICAgICAgICBjaGlsZE1lc3NhZ2VNUS5wcm9kdWNlKG5ld1NlcmlhbGl6YXRpb24pO1xuICAgICAgICB9LFxuICAgICAgICBvbjogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNoaWxkTWVzc2FnZU1RLnJlZ2lzdGVyQ2FsbGJhY2soc3dhcm1IYW5kbGVyLm1ldGEucmVxdWVzdElkLCBjYWxsYmFjayk7XG4gICAgICAgIH0sXG4gICAgICAgIG9mZjogZnVuY3Rpb24gKHN3YXJtSGFuZGxlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJGdW5jdGlvbiBub3QgaW1wbGVtZW50ZWQhXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgdmFyIHNwYWNlID0gc3dhcm1JbnRlcmFjdC5uZXdJbnRlcmFjdGlvblNwYWNlKGNvbW0pO1xuICAgIHRoaXMuc3RhcnRTd2FybSA9IGZ1bmN0aW9uIChuYW1lLCBjdG9yLCAuLi5hcmdzKSB7XG4gICAgICAgIHJldHVybiBzcGFjZS5zdGFydFN3YXJtKG5hbWUsIGN0b3IsIC4uLmFyZ3MpO1xuICAgIH07XG5cbiAgICB0aGlzLmluaXQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgY2hpbGRNZXNzYWdlTVEucmVnaXN0ZXJDb25zdW1lcihmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBzd2FybTtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLm1ldGEgJiYgZGF0YS5tZXRhLnN3YXJtSWQgJiYgc3dhcm1JbnN0YW5jZXNbZGF0YS5tZXRhLnN3YXJtSWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtID0gc3dhcm1JbnN0YW5jZXNbZGF0YS5tZXRhLnN3YXJtSWRdO1xuICAgICAgICAgICAgICAgICAgICBzd2FybS51cGRhdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtW2RhdGEubWV0YS5waGFzZU5hbWVdLmFwcGx5KHN3YXJtLCBkYXRhLm1ldGEuYXJncyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICBzd2FybSA9ICQkLnN3YXJtLnN0YXJ0KGRhdGEubWV0YS5zd2FybVR5cGVOYW1lLCBkYXRhLm1ldGEuY3RvciwgLi4uZGF0YS5tZXRhLmFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICBzd2FybS5zZXRNZXRhZGF0YShcInJlcXVlc3RJZFwiLCBkYXRhLm1ldGEucmVxdWVzdElkKTtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm1JbnN0YW5jZXNbc3dhcm0uZ2V0SW5uZXJWYWx1ZSgpLm1ldGEuc3dhcm1JZF0gPSBzd2FybTtcblxuICAgICAgICAgICAgICAgICAgICBzd2FybS5vblJldHVybihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTd2FybSBpcyBmaW5pc2hlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBwYXJlbnQucG9zdE1lc3NhZ2Uoe3dlYlZpZXdJc1JlYWR5OiB0cnVlfSwgXCIqXCIpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVyKG1lc3NhZ2UpIHtcbiAgICAgICAgbG9nKFwic2VuZGluZyBzd2FybSBcIiwgbWVzc2FnZSk7XG4gICAgICAgIGNoaWxkTWVzc2FnZU1RLnByb2R1Y2UobWVzc2FnZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmlsdGVySW50ZXJhY3Rpb25zKG1lc3NhZ2UpIHtcbiAgICAgICAgbG9nKFwiY2hlY2tpbmcgaWYgbWVzc2FnZSBpcyAnaW50ZXJhY3Rpb24nIFwiLCBtZXNzYWdlKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UgJiYgbWVzc2FnZS5tZXRhICYmIG1lc3NhZ2UubWV0YS50YXJnZXQgJiYgbWVzc2FnZS5tZXRhLnRhcmdldCA9PT0gXCJpbnRlcmFjdGlvblwiO1xuICAgIH1cblxuICAgICQkLlBTS19QdWJTdWIuc3Vic2NyaWJlKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBoYW5kbGVyLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sIGZpbHRlckludGVyYWN0aW9ucyk7XG4gICAgbG9nKFwicmVnaXN0ZXJpbmcgbGlzdGVuZXIgZm9yIGhhbmRsaW5nIGludGVyYWN0aW9uc1wiKTtcblxuICAgIGZ1bmN0aW9uIGxvZyguLi5hcmdzKSB7XG4gICAgICAgIGFyZ3MudW5zaGlmdChcIltXaW5kb3dNUUludGVyYWN0aW9uU3BhY2VcIiArICh3aW5kb3cuZnJhbWVFbGVtZW50ID8gXCIqXCIgOiBcIlwiKSArIFwiXVwiKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UgPSBmdW5jdGlvbiAoY2hhbm5lbE5hbWUsIGNvbW11bmljYXRpb25XaW5kb3cpIHtcbiAgICByZXR1cm4gbmV3IFdpbmRvd01RSW50ZXJhY3Rpb25TcGFjZShjaGFubmVsTmFtZSwgY29tbXVuaWNhdGlvbldpbmRvdyk7XG59O1xuIiwidmFyIE93TSA9IHJlcXVpcmUoXCJzd2FybXV0aWxzXCIpLk93TTtcbnZhciBzd2FybUludGVyYWN0ID0gcmVxdWlyZShcIi4vLi4vc3dhcm1JbnRlcmFjdGlvblwiKTtcbnZhciBmb2xkZXJNUSA9IHJlcXVpcmUoXCJmb2xkZXJtcVwiKTtcblxuZnVuY3Rpb24gRm9sZGVyTVFJbnRlcmFjdGlvblNwYWNlKGFnZW50LCB0YXJnZXRGb2xkZXIsIHJldHVybkZvbGRlcikge1xuICAgIHZhciBzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnMgPSB7fTtcbiAgICB2YXIgcXVldWVIYW5kbGVyID0gbnVsbDtcbiAgICB2YXIgcmVzcG9uc2VRdWV1ZSA9IG51bGw7XG5cbiAgICB2YXIgcXVldWUgPSBmb2xkZXJNUS5jcmVhdGVRdWUodGFyZ2V0Rm9sZGVyLCAoZXJyICwgcmVzdWx0KSA9PiB7XG4gICAgICAgIGlmKGVycil7XG4gICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlU3dhcm1QYWNrKHN3YXJtTmFtZSwgcGhhc2VOYW1lLCAuLi5hcmdzKXtcbiAgICAgICAgdmFyIHN3YXJtID0gbmV3IE93TSgpO1xuXG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJzd2FybUlkXCIsICQkLnVpZEdlbmVyYXRvci5zYWZlX3V1aWQoKSk7XG5cbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInJlcXVlc3RJZFwiLCBzd2FybS5nZXRNZXRhKFwic3dhcm1JZFwiKSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJzd2FybVR5cGVOYW1lXCIsIHN3YXJtTmFtZSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJwaGFzZU5hbWVcIiwgcGhhc2VOYW1lKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImFyZ3NcIiwgYXJncyk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJjb21tYW5kXCIsIFwiZXhlY3V0ZVN3YXJtUGhhc2VcIik7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJ0YXJnZXRcIiwgYWdlbnQpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiaG9tZVNlY3VyaXR5Q29udGV4dFwiLCByZXR1cm5Gb2xkZXIpO1xuXG4gICAgICAgIHJldHVybiBzd2FybTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXNwYXRjaGluZ1N3YXJtcyhlcnIsIHN3YXJtKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgfVxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBzdWJzTGlzdCA9IHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybS5tZXRhLnN3YXJtSWRdO1xuICAgICAgICAgICAgaWYoc3Vic0xpc3Qpe1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpPHN1YnNMaXN0Lmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGhhbmRsZXIgPSBzdWJzTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcihudWxsLCBzd2FybSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCAxKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbml0KCl7XG4gICAgICAgIGlmKCFxdWV1ZUhhbmRsZXIpe1xuICAgICAgICAgICAgcXVldWVIYW5kbGVyID0gcXVldWUuZ2V0SGFuZGxlcigpO1xuICAgICAgICB9XG4gICAgfVxuXHRcblx0aW5pdCgpO1xuXG4gICAgZnVuY3Rpb24gcHJlcGFyZVRvQ29uc3VtZSgpe1xuICAgICAgICBpZighcmVzcG9uc2VRdWV1ZSl7XG4gICAgICAgICAgICByZXNwb25zZVF1ZXVlID0gZm9sZGVyTVEuY3JlYXRlUXVlKHJldHVybkZvbGRlcik7XG4gICAgICAgICAgICByZXNwb25zZVF1ZXVlLnJlZ2lzdGVyQ29uc3VtZXIoZGlzcGF0Y2hpbmdTd2FybXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGNvbW11bmljYXRpb24gPSB7XG4gICAgICAgIHN0YXJ0U3dhcm06IGZ1bmN0aW9uIChzd2FybU5hbWUsIGN0b3IsIGFyZ3MpIHtcbiAgICAgICAgICAgIHByZXBhcmVUb0NvbnN1bWUoKTtcbiAgICAgICAgICAgIHZhciBzd2FybSA9IGNyZWF0ZVN3YXJtUGFjayhzd2FybU5hbWUsIGN0b3IsIC4uLmFyZ3MpO1xuICAgICAgICAgICAgcXVldWVIYW5kbGVyLnNlbmRTd2FybUZvckV4ZWN1dGlvbihzd2FybSk7XG4gICAgICAgICAgICByZXR1cm4gc3dhcm07XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRpbnVlU3dhcm06IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIHN3YXJtU2VyaWFsaXNhdGlvbiwgY3RvciwgLi4uYXJncykge1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIHN3YXJtSGFuZGxlci51cGRhdGUoc3dhcm1TZXJpYWxpc2F0aW9uKTtcbiAgICAgICAgICAgICAgICBzd2FybUhhbmRsZXJbY3Rvcl0uYXBwbHkoc3dhcm1IYW5kbGVyLCBhcmdzKTtcbiAgICAgICAgICAgIH1jYXRjaChlcnIpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9uOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgcHJlcGFyZVRvQ29uc3VtZSgpO1xuXG4gICAgICAgICAgICBpZighc3dhcm1IYW5kbGVyc1N1YnNjcmliZXJzW3N3YXJtSGFuZGxlci5tZXRhLnN3YXJtSWRdKXtcbiAgICAgICAgICAgICAgICBzd2FybUhhbmRsZXJzU3Vic2NyaWJlcnNbc3dhcm1IYW5kbGVyLm1ldGEuc3dhcm1JZF0gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybUhhbmRsZXIubWV0YS5zd2FybUlkXS5wdXNoKGNhbGxiYWNrKTtcblxuICAgICAgICB9LFxuICAgICAgICBvZmY6IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIpIHtcbiAgICAgICAgICAgIHN3YXJtSGFuZGxlcnNTdWJzY3JpYmVyc1tzd2FybUhhbmRsZXIubWV0YS5zd2FybUlkXSA9IFtdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBzd2FybUludGVyYWN0Lm5ld0ludGVyYWN0aW9uU3BhY2UoY29tbXVuaWNhdGlvbik7XG59XG5cbnZhciBzcGFjZXMgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZSA9IGZ1bmN0aW9uIChhZ2VudCwgdGFyZ2V0Rm9sZGVyLCByZXR1cm5Gb2xkZXIpIHtcbiAgICB2YXIgaW5kZXggPSB0YXJnZXRGb2xkZXIrcmV0dXJuRm9sZGVyO1xuICAgIGlmKCFzcGFjZXNbaW5kZXhdKXtcbiAgICAgICAgc3BhY2VzW2luZGV4XSA9IG5ldyBGb2xkZXJNUUludGVyYWN0aW9uU3BhY2UoYWdlbnQsIHRhcmdldEZvbGRlciwgcmV0dXJuRm9sZGVyKTtcbiAgICB9ZWxzZXtcbiAgICAgICAgY29uc29sZS5sb2coYEZvbGRlck1RIGludGVyYWN0aW9uIHNwYWNlIGJhc2VkIG9uIFske3RhcmdldEZvbGRlcn0sICR7cmV0dXJuRm9sZGVyfV0gYWxyZWFkeSBleGlzdHMhYCk7XG4gICAgfVxuICAgIHJldHVybiBzcGFjZXNbaW5kZXhdO1xufTsiLCJyZXF1aXJlKCdwc2staHR0cC1jbGllbnQnKTtcblxuZnVuY3Rpb24gSFRUUEludGVyYWN0aW9uU3BhY2UoYWxpYXMsIHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgY3J5cHRvSW5mbykge1xuICAgIGNvbnN0IHN3YXJtSW50ZXJhY3QgPSByZXF1aXJlKFwiLi8uLi9zd2FybUludGVyYWN0aW9uXCIpO1xuXG4gICAgbGV0IGluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgZnVuY3Rpb24gaW5pdCgpe1xuICAgICAgICBpZighaW5pdGlhbGl6ZWQpe1xuICAgICAgICAgICAgaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgJCQucmVtb3RlLmNyZWF0ZVJlcXVlc3RNYW5hZ2VyKCk7XG4gICAgICAgICAgICAkJC5yZW1vdGUubmV3RW5kUG9pbnQoYWxpYXMsIHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgY3J5cHRvSW5mbyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjb21tID0ge1xuICAgICAgICBzdGFydFN3YXJtOiBmdW5jdGlvbiAoc3dhcm1OYW1lLCBjdG9yLCBhcmdzKSB7XG4gICAgICAgICAgICBpbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gJCQucmVtb3RlW2FsaWFzXS5zdGFydFN3YXJtKHN3YXJtTmFtZSwgY3RvciwgLi4uYXJncyk7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRpbnVlU3dhcm06IGZ1bmN0aW9uIChzd2FybUhhbmRsZXIsIHN3YXJtU2VyaWFsaXNhdGlvbiwgY3RvciwgYXJncykge1xuICAgICAgICAgICAgcmV0dXJuICQkLnJlbW90ZVthbGlhc10uY29udGludWVTd2FybShzd2FybVNlcmlhbGlzYXRpb24sIGN0b3IsIGFyZ3MpO1xuICAgICAgICB9LFxuICAgICAgICBvbjogZnVuY3Rpb24gKHN3YXJtSGFuZGxlciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHN3YXJtSGFuZGxlci5vbignKicsIGNhbGxiYWNrKTtcbiAgICAgICAgfSxcbiAgICAgICAgb2ZmOiBmdW5jdGlvbiAoc3dhcm1IYW5kbGVyKSB7XG4gICAgICAgICAgICBzd2FybUhhbmRsZXIub2ZmKCcqJyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIHN3YXJtSW50ZXJhY3QubmV3SW50ZXJhY3Rpb25TcGFjZShjb21tKTtcbn1cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZSA9IGZ1bmN0aW9uIChhbGlhcywgcmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKSB7XG4gICAgLy9zaW5nbGV0b25cbiAgICByZXR1cm4gbmV3IEhUVFBJbnRlcmFjdGlvblNwYWNlKGFsaWFzLCByZW1vdGVFbmRQb2ludCwgYWdlbnRVaWQsIGNyeXB0b0luZm8pO1xufTsiLCJ2YXIgY2hhbm5lbHNSZWdpc3RyeSA9IHt9OyAvL2tlZXBzIGNhbGxiYWNrcyBmb3IgY29uc3VtZXJzIGFuZCB3aW5kb3dzIHJlZmVyZW5jZXMgZm9yIHByb2R1Y2Vyc1xudmFyIGNhbGxiYWNrc1JlZ2lzdHJ5ID0ge307XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRXZlbnQoZXZlbnQpIHtcbiAgICB2YXIgc3dhcm0gPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpO1xuICAgIGlmKHN3YXJtLm1ldGEpe1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSBjYWxsYmFja3NSZWdpc3RyeVtzd2FybS5tZXRhLmNoYW5uZWxOYW1lXTtcbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgc3dhcm0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG59XG5cblxuZnVuY3Rpb24gQ2hpbGRXbmRNUShjaGFubmVsTmFtZSwgbWFpbldpbmRvdywgc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwpIHtcbiAgICAvL2NoYW5uZWwgbmFtZSBpc1xuXG4gICAgY2hhbm5lbHNSZWdpc3RyeVtjaGFubmVsTmFtZV0gPSBtYWluV2luZG93O1xuXG4gICAgdGhpcy5wcm9kdWNlID0gZnVuY3Rpb24gKHN3YXJtTXNnKSB7XG4gICAgICAgIHN3YXJtTXNnLm1ldGEuY2hhbm5lbE5hbWUgPSBjaGFubmVsTmFtZTtcbiAgICAgICAgdmFyIG1lc3NhZ2UgPSB7XG4gICAgICAgICAgICBtZXRhOnN3YXJtTXNnLm1ldGEsXG4gICAgICAgICAgICBwdWJsaWNWYXJzOnN3YXJtTXNnLnB1YmxpY1ZhcnMsXG4gICAgICAgICAgICBwcml2YXRlVmFyczpzd2FybU1zZy5wcml2YXRlVmFyc1xuICAgICAgICB9O1xuXG4gICAgICAgIG1lc3NhZ2UubWV0YS5hcmdzID0gbWVzc2FnZS5tZXRhLmFyZ3MubWFwKGZ1bmN0aW9uIChhcmd1bWVudCkge1xuICAgICAgICAgICAgaWYgKGFyZ3VtZW50IGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSB7fTtcbiAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnQubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcltcIm1lc3NhZ2VcIl0gPSBhcmd1bWVudC5tZXNzYWdlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnQuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcltcImNvZGVcIl0gPSBhcmd1bWVudC5jb2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXJndW1lbnQ7XG4gICAgICAgIH0pO1xuICAgICAgICBtYWluV2luZG93LnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpLCBcIipcIik7XG4gICAgfTtcblxuICAgIHZhciBjb25zdW1lcjtcblxuICAgIHRoaXMucmVnaXN0ZXJDb25zdW1lciA9IGZ1bmN0aW9uIChjYWxsYmFjaywgc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkID0gdHJ1ZSkge1xuICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uc3VtZXIpIHtcbiAgICAgICAgICAgLy8gdGhyb3cgbmV3IEVycm9yKFwiT25seSBvbmUgY29uc3VtZXIgaXMgYWxsb3dlZCFcIik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdW1lciA9IGNhbGxiYWNrO1xuICAgICAgICBjYWxsYmFja3NSZWdpc3RyeVtjaGFubmVsTmFtZV0gPSBjb25zdW1lcjtcblxuICAgICAgICBpZiAoc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwgJiYgdHlwZW9mIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsLmFkZEV2ZW50TGlzdGVuZXIgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgIHNlY29uZENvbW11bmljYXRpb25DaGFubmVsLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGRpc3BhdGNoRXZlbnQpO1xuICAgICAgICB9XG4gICAgICB9O1xufVxuXG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZU1RID0gZnVuY3Rpb24gY3JlYXRlTVEoY2hhbm5lbE5hbWUsIHduZCwgc2Vjb25kQ29tbXVuaWNhdGlvbkNoYW5uZWwpe1xuICAgIHJldHVybiBuZXcgQ2hpbGRXbmRNUShjaGFubmVsTmFtZSwgd25kLCBzZWNvbmRDb21tdW5pY2F0aW9uQ2hhbm5lbCk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzLmluaXRGb3JTd2FybWluZ0luQ2hpbGQgPSBmdW5jdGlvbihkb21haW5OYW1lKXtcblxuICAgIHZhciBwdWJTdWIgPSAkJC5yZXF1aXJlKFwic291bmRwdWJzdWJcIikuc291bmRQdWJTdWI7XG5cbiAgICB2YXIgaW5ib3VuZCA9IGNyZWF0ZU1RKGRvbWFpbk5hbWUrXCIvaW5ib3VuZFwiKTtcbiAgICB2YXIgb3V0Ym91bmQgPSBjcmVhdGVNUShkb21haW5OYW1lK1wiL291dGJvdW5kXCIpO1xuXG5cbiAgICBpbmJvdW5kLnJlZ2lzdGVyQ29uc3VtZXIoZnVuY3Rpb24oZXJyLCBzd2FybSl7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgLy9yZXN0b3JlIGFuZCBleGVjdXRlIHRoaXMgdGFzdHkgc3dhcm1cbiAgICAgICAgZ2xvYmFsLiQkLnN3YXJtc0luc3RhbmNlc01hbmFnZXIucmV2aXZlX3N3YXJtKHN3YXJtKTtcbiAgICB9KTtcblxuICAgIHB1YlN1Yi5zdWJzY3JpYmUoJCQuQ09OU1RBTlRTLlNXQVJNX0ZPUl9FWEVDVVRJT04sIGZ1bmN0aW9uKHN3YXJtKXtcbiAgICAgICAgb3V0Ym91bmQuc2VuZFN3YXJtRm9yRXhlY3V0aW9uKHN3YXJtKTtcbiAgICB9KTtcbn07XG5cbiIsInZhciBjaGFubmVsc1JlZ2lzdHJ5ID0ge307IC8va2VlcHMgY2FsbGJhY2tzIGZvciBjb25zdW1lcnMgYW5kIHdpbmRvd3MgcmVmZXJlbmNlcyBmb3IgcHJvZHVjZXJzXG52YXIgY2FsbGJhY2tzUmVnaXN0cnkgPSB7fTtcbnZhciBzd2FybUNhbGxiYWNrcyA9IHt9O1xuXG5mdW5jdGlvbiBkaXNwYXRjaEV2ZW50KGV2ZW50KSB7XG5cbiAgICBpZiAoZXZlbnQuc291cmNlICE9PSB3aW5kb3cpIHtcblxuICAgICAgICB2YXIgc3dhcm0gPSBldmVudC5kYXRhO1xuXG4gICAgICAgIGlmIChzd2FybS5tZXRhKSB7XG4gICAgICAgICAgICBsZXQgY2FsbGJhY2s7XG4gICAgICAgICAgICBpZiAoIXN3YXJtLm1ldGEucmVxdWVzdElkIHx8ICFzd2FybUNhbGxiYWNrc1tzd2FybS5tZXRhLnJlcXVlc3RJZF0pIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrc1JlZ2lzdHJ5W3N3YXJtLm1ldGEuY2hhbm5lbE5hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBzd2FybUNhbGxiYWNrc1tzd2FybS5tZXRhLnJlcXVlc3RJZF07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBzd2FybSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIENoaWxkV25kTVEoY2hhbm5lbE5hbWUsIG1haW5XaW5kb3cpIHtcbiAgICAvL2NoYW5uZWwgbmFtZSBpc1xuXG4gICAgY2hhbm5lbHNSZWdpc3RyeVtjaGFubmVsTmFtZV0gPSBtYWluV2luZG93O1xuXG4gICAgdGhpcy5wcm9kdWNlID0gZnVuY3Rpb24gKHN3YXJtTXNnKSB7XG4gICAgICAgIHN3YXJtTXNnLm1ldGEuY2hhbm5lbE5hbWUgPSBjaGFubmVsTmFtZTtcbiAgICAgICAgdmFyIG1lc3NhZ2UgPSB7XG4gICAgICAgICAgICBtZXRhOiBzd2FybU1zZy5tZXRhLFxuICAgICAgICAgICAgcHVibGljVmFyczogc3dhcm1Nc2cucHVibGljVmFycyxcbiAgICAgICAgICAgIHByaXZhdGVWYXJzOiBzd2FybU1zZy5wcml2YXRlVmFyc1xuICAgICAgICB9O1xuICAgICAgICAvL2NvbnNvbGUubG9nKHN3YXJtTXNnLmdldEpTT04oKSk7XG4gICAgICAgIC8vY29uc29sZS5sb2coc3dhcm1Nc2cudmFsdWVPZigpKTtcbiAgICAgICAgbWVzc2FnZS5tZXRhLmFyZ3MgPSBtZXNzYWdlLm1ldGEuYXJncy5tYXAoZnVuY3Rpb24gKGFyZ3VtZW50KSB7XG4gICAgICAgICAgICBpZiAoYXJndW1lbnQgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9IHt9O1xuICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudC5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yW1wibWVzc2FnZVwiXSA9IGFyZ3VtZW50Lm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudC5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yW1wiY29kZVwiXSA9IGFyZ3VtZW50LmNvZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhcmd1bWVudDtcbiAgICAgICAgfSk7XG4gICAgICAgIG1haW5XaW5kb3cucG9zdE1lc3NhZ2UobWVzc2FnZSwgXCIqXCIpO1xuICAgIH07XG5cbiAgICB2YXIgY29uc3VtZXI7XG5cbiAgICB0aGlzLnJlZ2lzdGVyQ29uc3VtZXIgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIHNob3VsZERlbGV0ZUFmdGVyUmVhZCA9IHRydWUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnN1bWVyKSB7XG4gICAgICAgICAgICAvLyB0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IG9uZSBjb25zdW1lciBpcyBhbGxvd2VkIVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVyID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrc1JlZ2lzdHJ5W2NoYW5uZWxOYW1lXSA9IGNvbnN1bWVyO1xuICAgICAgICBtYWluV2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGRpc3BhdGNoRXZlbnQpO1xuICAgIH07XG5cbiAgICB0aGlzLnJlZ2lzdGVyQ2FsbGJhY2sgPSBmdW5jdGlvbiAocmVxdWVzdElkLCBjYWxsYmFjaykge1xuICAgICAgICBzd2FybUNhbGxiYWNrc1tyZXF1ZXN0SWRdID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrc1JlZ2lzdHJ5W2NoYW5uZWxOYW1lXSA9IGNhbGxiYWNrO1xuICAgICAgICBtYWluV2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGRpc3BhdGNoRXZlbnQpO1xuICAgIH07XG5cbn1cblxuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVNUSA9IGZ1bmN0aW9uIGNyZWF0ZU1RKGNoYW5uZWxOYW1lLCB3bmQpIHtcbiAgICByZXR1cm4gbmV3IENoaWxkV25kTVEoY2hhbm5lbE5hbWUsIHduZCk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzLmluaXRGb3JTd2FybWluZ0luQ2hpbGQgPSBmdW5jdGlvbiAoZG9tYWluTmFtZSkge1xuXG4gICAgdmFyIHB1YlN1YiA9ICQkLnJlcXVpcmUoXCJzb3VuZHB1YnN1YlwiKS5zb3VuZFB1YlN1YjtcblxuICAgIHZhciBpbmJvdW5kID0gY3JlYXRlTVEoZG9tYWluTmFtZSArIFwiL2luYm91bmRcIik7XG4gICAgdmFyIG91dGJvdW5kID0gY3JlYXRlTVEoZG9tYWluTmFtZSArIFwiL291dGJvdW5kXCIpO1xuXG5cbiAgICBpbmJvdW5kLnJlZ2lzdGVyQ29uc3VtZXIoZnVuY3Rpb24gKGVyciwgc3dhcm0pIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgfVxuICAgICAgICAvL3Jlc3RvcmUgYW5kIGV4ZWN1dGUgdGhpcyB0YXN0eSBzd2FybVxuICAgICAgICBnbG9iYWwuJCQuc3dhcm1zSW5zdGFuY2VzTWFuYWdlci5yZXZpdmVfc3dhcm0oc3dhcm0pO1xuICAgIH0pO1xuXG4gICAgcHViU3ViLnN1YnNjcmliZSgkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTiwgZnVuY3Rpb24gKHN3YXJtKSB7XG4gICAgICAgIG91dGJvdW5kLnNlbmRTd2FybUZvckV4ZWN1dGlvbihzd2FybSk7XG4gICAgfSk7XG59O1xuXG4iLCJpZiAodHlwZW9mICQkID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAkJCA9IHt9O1xufVxuXG5mdW5jdGlvbiBWaXJ0dWFsU3dhcm0oaW5uZXJPYmosIGdsb2JhbEhhbmRsZXIpe1xuICAgIGxldCBrbm93bkV4dHJhUHJvcHMgPSBbIFwic3dhcm1cIiBdO1xuXG4gICAgZnVuY3Rpb24gYnVpbGRIYW5kbGVyKCkge1xuICAgICAgICB2YXIgdXRpbGl0eSA9IHt9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBwcm9wZXJ0eSwgdmFsdWUsIHJlY2VpdmVyKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdGFyZ2V0LnByaXZhdGVWYXJzICYmIHRhcmdldC5wcml2YXRlVmFycy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSk6XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQucHJpdmF0ZVZhcnNbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0YXJnZXQucHVibGljVmFycyAmJiB0YXJnZXQucHVibGljVmFycy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSk6XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQucHVibGljVmFyc1twcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHRhcmdldC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSk6XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBrbm93bkV4dHJhUHJvcHMuaW5kZXhPZihwcm9wZXJ0eSkgPT09IC0xOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFnbG9iYWxIYW5kbGVyLnByb3RlY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbEhhbmRsZXIucHJvdGVjdGVkID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxIYW5kbGVyLnByb3RlY3RlZFtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdXRpbGl0eVtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAodGFyZ2V0LCBwcm9wZXJ0eSwgcmVjZWl2ZXIpIHtcblxuICAgICAgICAgICAgICAgIHN3aXRjaCAodHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHRhcmdldC5wdWJsaWNWYXJzICYmIHRhcmdldC5wdWJsaWNWYXJzLmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXQucHVibGljVmFyc1twcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdGFyZ2V0LnByaXZhdGVWYXJzICYmIHRhcmdldC5wcml2YXRlVmFycy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSk6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0LnByaXZhdGVWYXJzW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0YXJnZXQuaGFzT3duUHJvcGVydHkocHJvcGVydHkpOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgZ2xvYmFsSGFuZGxlci5wcm90ZWN0ZWQgJiYgZ2xvYmFsSGFuZGxlci5wcm90ZWN0ZWQuaGFzT3duUHJvcGVydHkocHJvcGVydHkpOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdsb2JhbEhhbmRsZXIucHJvdGVjdGVkW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB1dGlsaXR5Lmhhc093blByb3BlcnR5KHByb3BlcnR5KTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1dGlsaXR5W3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJveHkoaW5uZXJPYmosIGJ1aWxkSGFuZGxlcigpKTtcbn1cblxuZnVuY3Rpb24gU3dhcm1JbnRlcmFjdGlvbihjb21tdW5pY2F0aW9uSW50ZXJmYWNlLCBzd2FybU5hbWUsIGN0b3IsIGFyZ3MpIHtcblxuICAgIHZhciBzd2FybUhhbmRsZXIgPSBjb21tdW5pY2F0aW9uSW50ZXJmYWNlLnN0YXJ0U3dhcm0oc3dhcm1OYW1lLCBjdG9yLCBhcmdzKTtcblxuICAgIHRoaXMub24gPSBmdW5jdGlvbihkZXNjcmlwdGlvbil7XG4gICAgICAgIGNvbW11bmljYXRpb25JbnRlcmZhY2Uub24oc3dhcm1IYW5kbGVyLCBmdW5jdGlvbihlcnIsIHN3YXJtU2VyaWFsaXNhdGlvbil7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCBwaGFzZSA9IGRlc2NyaXB0aW9uW3N3YXJtU2VyaWFsaXNhdGlvbi5tZXRhLnBoYXNlTmFtZV07XG4gICAgICAgICAgICBsZXQgdmlydHVhbFN3YXJtID0gbmV3IFZpcnR1YWxTd2FybShzd2FybVNlcmlhbGlzYXRpb24sIHN3YXJtSGFuZGxlcik7XG5cbiAgICAgICAgICAgIGlmKCFwaGFzZSl7XG4gICAgICAgICAgICAgICAgLy9UT0RPIHJldmlldyBhbmQgZml4LiBGaXggY2FzZSB3aGVuIGFuIGludGVyYWN0aW9uIGlzIHN0YXJ0ZWQgZnJvbSBhbm90aGVyIGludGVyYWN0aW9uXG4gICAgICAgICAgICAgICAgaWYoc3dhcm1IYW5kbGVyICYmICghc3dhcm1IYW5kbGVyLlRhcmdldCB8fCBzd2FybUhhbmRsZXIuVGFyZ2V0LnN3YXJtSWQgIT09IHN3YXJtU2VyaWFsaXNhdGlvbi5tZXRhLnN3YXJtSWQpKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJOb3QgbXkgc3dhcm0hXCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBpbnRlcmFjdFBoYXNlRXJyID0gIG5ldyBFcnJvcihcIkludGVyYWN0IG1ldGhvZCBcIitzd2FybVNlcmlhbGlzYXRpb24ubWV0YS5waGFzZU5hbWUrXCIgd2FzIG5vdCBmb3VuZC5cIik7XG4gICAgICAgICAgICAgICAgaWYoZGVzY3JpcHRpb25bXCJvbkVycm9yXCJdKXtcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb25bXCJvbkVycm9yXCJdLmNhbGwodmlydHVhbFN3YXJtLCBpbnRlcmFjdFBoYXNlRXJyKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBpbnRlcmFjdFBoYXNlRXJyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmlydHVhbFN3YXJtLnN3YXJtID0gZnVuY3Rpb24ocGhhc2VOYW1lLCAuLi5hcmdzKXtcbiAgICAgICAgICAgICAgICBjb21tdW5pY2F0aW9uSW50ZXJmYWNlLmNvbnRpbnVlU3dhcm0oc3dhcm1IYW5kbGVyLCBzd2FybVNlcmlhbGlzYXRpb24sIHBoYXNlTmFtZSwgYXJncyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBwaGFzZS5hcHBseSh2aXJ0dWFsU3dhcm0sIHN3YXJtU2VyaWFsaXNhdGlvbi5tZXRhLmFyZ3MpO1xuICAgICAgICAgICAgaWYodmlydHVhbFN3YXJtLm1ldGEuY29tbWFuZCA9PT0gXCJhc3luY1JldHVyblwiKXtcbiAgICAgICAgICAgICAgICBjb21tdW5pY2F0aW9uSW50ZXJmYWNlLm9mZihzd2FybUhhbmRsZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5vblJldHVybiA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5vbih7XG4gICAgICAgICAgICBfX3JldHVybl9fOiBjYWxsYmFja1xuICAgICAgICB9KTtcbiAgICB9O1xufVxuXG52YXIgYWJzdHJhY3RJbnRlcmFjdGlvblNwYWNlID0ge1xuICAgIHN0YXJ0U3dhcm06IGZ1bmN0aW9uIChzd2FybU5hbWUsIGN0b3IsIGFyZ3MpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlICBTd2FybUludGVyYWN0aW9uLnByb3RvdHlwZS5zdGFydFN3YXJtXCIpO1xuICAgIH0sXG4gICAgcmVzZW5kU3dhcm06IGZ1bmN0aW9uIChzd2FybUluc3RhbmNlLCBzd2FybVNlcmlhbGlzYXRpb24sIGN0b3IsIGFyZ3MpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlICBTd2FybUludGVyYWN0aW9uLnByb3RvdHlwZS5jb250aW51ZVN3YXJtIFwiKTtcbiAgICB9LFxuICAgIG9uOiBmdW5jdGlvbiAoc3dhcm1JbnN0YW5jZSwgcGhhc2VOYW1lLCBjYWxsYmFjaykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgIFN3YXJtSW50ZXJhY3Rpb24ucHJvdG90eXBlLm9uU3dhcm1cIik7XG4gICAgfSxcbm9mZjogZnVuY3Rpb24gKHN3YXJtSW5zdGFuY2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlICBTd2FybUludGVyYWN0aW9uLnByb3RvdHlwZS5vblN3YXJtXCIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLm5ld0ludGVyYWN0aW9uU3BhY2UgPSBmdW5jdGlvbiAoY29tbXVuaWNhdGlvbkludGVyZmFjZSkge1xuXG4gICAgaWYoIWNvbW11bmljYXRpb25JbnRlcmZhY2UpIHtcbiAgICAgICAgY29tbXVuaWNhdGlvbkludGVyZmFjZSA9IGFic3RyYWN0SW50ZXJhY3Rpb25TcGFjZSA7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIHN0YXJ0U3dhcm06IGZ1bmN0aW9uIChzd2FybU5hbWUsIGN0b3IsIC4uLmFyZ3MpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgU3dhcm1JbnRlcmFjdGlvbihjb21tdW5pY2F0aW9uSW50ZXJmYWNlLCBzd2FybU5hbWUsIGN0b3IsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG5cbiIsIlxuXG4vKioqKioqKioqKioqKioqKioqKioqKiAgdXRpbGl0eSBjbGFzcyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuZnVuY3Rpb24gUmVxdWVzdE1hbmFnZXIocG9sbGluZ1RpbWVPdXQpe1xuICAgIGlmKCFwb2xsaW5nVGltZU91dCl7XG4gICAgICAgIHBvbGxpbmdUaW1lT3V0ID0gMTAwMDsgLy8xIHNlY29uZCBieSBkZWZhdWx0XG4gICAgfVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gUmVxdWVzdChlbmRQb2ludCwgaW5pdGlhbFN3YXJtKXtcbiAgICAgICAgdmFyIG9uUmV0dXJuQ2FsbGJhY2tzID0gW107XG4gICAgICAgIHZhciBvbkVycm9yQ2FsbGJhY2tzID0gW107XG4gICAgICAgIHZhciBvbkNhbGxiYWNrcyA9IFtdO1xuICAgICAgICB2YXIgcmVxdWVzdElkID0gaW5pdGlhbFN3YXJtLm1ldGEucmVxdWVzdElkO1xuICAgICAgICBpbml0aWFsU3dhcm0gPSBudWxsO1xuXG4gICAgICAgIHRoaXMuZ2V0UmVxdWVzdElkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0SWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vbiA9IGZ1bmN0aW9uKHBoYXNlTmFtZSwgY2FsbGJhY2spe1xuICAgICAgICAgICAgaWYodHlwZW9mIHBoYXNlTmFtZSAhPSBcInN0cmluZ1wiICAmJiB0eXBlb2YgY2FsbGJhY2sgIT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgZmlyc3QgcGFyYW1ldGVyIHNob3VsZCBiZSBhIHN0cmluZyBhbmQgdGhlIHNlY29uZCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG9uQ2FsbGJhY2tzLnB1c2goe1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrOmNhbGxiYWNrLFxuICAgICAgICAgICAgICAgIHBoYXNlOnBoYXNlTmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzZWxmLnBvbGwoZW5kUG9pbnQsIHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vblJldHVybiA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgICAgIG9uUmV0dXJuQ2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgc2VsZi5wb2xsKGVuZFBvaW50LCB0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub25FcnJvciA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgICAgIGlmKG9uRXJyb3JDYWxsYmFja3MuaW5kZXhPZihjYWxsYmFjaykhPT0tMSl7XG4gICAgICAgICAgICAgICAgb25FcnJvckNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgY2FsbGJhY2sgYWxyZWFkeSByZWdpc3RlcmVkIVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoID0gZnVuY3Rpb24oZXJyLCByZXN1bHQpe1xuICAgICAgICAgICAgcmVzdWx0ID0gdHlwZW9mIHJlc3VsdCA9PSBcInN0cmluZ1wiID8gSlNPTi5wYXJzZShyZXN1bHQpIDogcmVzdWx0O1xuICAgICAgICAgICAgcmVzdWx0ID0gT3dNLnByb3RvdHlwZS5jb252ZXJ0KHJlc3VsdCk7XG4gICAgICAgICAgICB2YXIgcmVzdWx0UmVxSWQgPSByZXN1bHQuZ2V0TWV0YShcInJlcXVlc3RJZFwiKTtcbiAgICAgICAgICAgIHZhciBwaGFzZU5hbWUgPSByZXN1bHQuZ2V0TWV0YShcInBoYXNlTmFtZVwiKTtcbiAgICAgICAgICAgIHZhciBvblJldHVybiA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZihyZXN1bHRSZXFJZCA9PT0gcmVxdWVzdElkKXtcbiAgICAgICAgICAgICAgICBvblJldHVybkNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGMpe1xuICAgICAgICAgICAgICAgICAgICBjKG51bGwsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIG9uUmV0dXJuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZihvblJldHVybil7XG4gICAgICAgICAgICAgICAgICAgIG9uUmV0dXJuQ2FsbGJhY2tzID0gW107XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3JDYWxsYmFja3MgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvbkNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGkpe1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiWFhYWFhYWFg6XCIsIHBoYXNlTmFtZSAsIGkpO1xuICAgICAgICAgICAgICAgICAgICBpZihwaGFzZU5hbWUgPT09IGkucGhhc2UgfHwgaS5waGFzZSA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpLmNhbGxiYWNrKGVyciwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZihvblJldHVybkNhbGxiYWNrcy5sZW5ndGggPT09IDAgJiYgb25DYWxsYmFja3MubGVuZ3RoID09PSAwKXtcbiAgICAgICAgICAgICAgICBzZWxmLnVucG9sbChlbmRQb2ludCwgdGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaEVycm9yID0gZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpIDwgb25FcnJvckNhbGxiYWNrcy5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgdmFyIGVyckNiID0gb25FcnJvckNhbGxiYWNrc1tpXTtcbiAgICAgICAgICAgICAgICBlcnJDYihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub2ZmID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYudW5wb2xsKGVuZFBvaW50LCB0aGlzKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLmNyZWF0ZVJlcXVlc3QgPSBmdW5jdGlvbihyZW1vdGVFbmRQb2ludCwgc3dhcm0pe1xuICAgICAgICBsZXQgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KHJlbW90ZUVuZFBvaW50LCBzd2FybSk7XG4gICAgICAgIHJldHVybiByZXF1ZXN0O1xuICAgIH07XG5cbiAgICAvKiAqKioqKioqKioqKioqKioqKioqKioqKioqKiogcG9sbGluZyB6b25lICoqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICB2YXIgcG9sbFNldCA9IHtcbiAgICB9O1xuXG4gICAgdmFyIGFjdGl2ZUNvbm5lY3Rpb25zID0ge1xuICAgIH07XG5cbiAgICB0aGlzLnBvbGwgPSBmdW5jdGlvbihyZW1vdGVFbmRQb2ludCwgcmVxdWVzdCl7XG4gICAgICAgIHZhciByZXF1ZXN0cyA9IHBvbGxTZXRbcmVtb3RlRW5kUG9pbnRdO1xuICAgICAgICBpZighcmVxdWVzdHMpe1xuICAgICAgICAgICAgcmVxdWVzdHMgPSB7fTtcbiAgICAgICAgICAgIHBvbGxTZXRbcmVtb3RlRW5kUG9pbnRdID0gcmVxdWVzdHM7XG4gICAgICAgIH1cbiAgICAgICAgcmVxdWVzdHNbcmVxdWVzdC5nZXRSZXF1ZXN0SWQoKV0gPSByZXF1ZXN0O1xuICAgICAgICBwb2xsaW5nSGFuZGxlcigpO1xuICAgIH07XG5cbiAgICB0aGlzLnVucG9sbCA9IGZ1bmN0aW9uKHJlbW90ZUVuZFBvaW50LCByZXF1ZXN0KXtcbiAgICAgICAgdmFyIHJlcXVlc3RzID0gcG9sbFNldFtyZW1vdGVFbmRQb2ludF07XG4gICAgICAgIGlmKHJlcXVlc3RzKXtcbiAgICAgICAgICAgIGRlbGV0ZSByZXF1ZXN0c1tyZXF1ZXN0LmdldFJlcXVlc3RJZCgpXTtcbiAgICAgICAgICAgIGlmKE9iamVjdC5rZXlzKHJlcXVlc3RzKS5sZW5ndGggPT09IDApe1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBwb2xsU2V0W3JlbW90ZUVuZFBvaW50XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5wb2xsaW5nIHdyb25nIHJlcXVlc3Q6XCIscmVtb3RlRW5kUG9pbnQsIHJlcXVlc3QpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVBvbGxUaHJlYWQocmVtb3RlRW5kUG9pbnQpe1xuICAgICAgICBmdW5jdGlvbiByZUFybSgpe1xuICAgICAgICAgICAgJCQucmVtb3RlLmRvSHR0cEdldChyZW1vdGVFbmRQb2ludCwgZnVuY3Rpb24oZXJyLCByZXMpe1xuICAgICAgICAgICAgICAgIGxldCByZXF1ZXN0cyA9IHBvbGxTZXRbcmVtb3RlRW5kUG9pbnRdO1xuXG4gICAgICAgICAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgZm9yKGxldCByZXFfaWQgaW4gcmVxdWVzdHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVycl9oYW5kbGVyID0gcmVxdWVzdHNbcmVxX2lkXS5kaXNwYXRjaEVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZXJyX2hhbmRsZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycl9oYW5kbGVyKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlQ29ubmVjdGlvbnNbcmVtb3RlRW5kUG9pbnRdID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBrIGluIHJlcXVlc3RzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3RzW2tdLmRpc3BhdGNoKG51bGwsIHJlcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZihPYmplY3Qua2V5cyhyZXF1ZXN0cykubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZUFybSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGFjdGl2ZUNvbm5lY3Rpb25zW3JlbW90ZUVuZFBvaW50XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRW5kaW5nIHBvbGxpbmcgZm9yIFwiLCByZW1vdGVFbmRQb2ludCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZUFybSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBvbGxpbmdIYW5kbGVyKCl7XG4gICAgICAgIGxldCBzZXRUaW1lciA9IGZhbHNlO1xuICAgICAgICBmb3IodmFyIHYgaW4gcG9sbFNldCl7XG4gICAgICAgICAgICBpZighYWN0aXZlQ29ubmVjdGlvbnNbdl0pe1xuICAgICAgICAgICAgICAgIGNyZWF0ZVBvbGxUaHJlYWQodik7XG4gICAgICAgICAgICAgICAgYWN0aXZlQ29ubmVjdGlvbnNbdl0gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2V0VGltZXIgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmKHNldFRpbWVyKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KHBvbGxpbmdIYW5kbGVyLCBwb2xsaW5nVGltZU91dCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRUaW1lb3V0KCBwb2xsaW5nSGFuZGxlciwgcG9sbGluZ1RpbWVPdXQpO1xufVxuXG5cbmZ1bmN0aW9uIGV4dHJhY3REb21haW5BZ2VudERldGFpbHModXJsKXtcbiAgICBjb25zdCB2UmVnZXggPSAvKFthLXpBLVowLTldKnwuKSpcXC9hZ2VudFxcLyhbYS16QS1aMC05XSsoXFwvKSopKy9nO1xuXG4gICAgaWYoIXVybC5tYXRjaCh2UmVnZXgpKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBmb3JtYXQuIChFZy4gZG9tYWluWy5zdWJkb21haW5dKi9hZ2VudC9bb3JnYW5pc2F0aW9uL10qYWdlbnRJZClcIik7XG4gICAgfVxuXG4gICAgY29uc3QgZGV2aWRlciA9IFwiL2FnZW50L1wiO1xuICAgIGxldCBkb21haW47XG4gICAgbGV0IGFnZW50VXJsO1xuXG4gICAgY29uc3Qgc3BsaXRQb2ludCA9IHVybC5pbmRleE9mKGRldmlkZXIpO1xuICAgIGlmKHNwbGl0UG9pbnQgIT09IC0xKXtcbiAgICAgICAgZG9tYWluID0gdXJsLnNsaWNlKDAsIHNwbGl0UG9pbnQpO1xuICAgICAgICBhZ2VudFVybCA9IHVybC5zbGljZShzcGxpdFBvaW50K2RldmlkZXIubGVuZ3RoKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge2RvbWFpbiwgYWdlbnRVcmx9O1xufVxuXG5mdW5jdGlvbiB1cmxFbmRXaXRoU2xhc2godXJsKXtcblxuICAgIGlmKHVybFt1cmwubGVuZ3RoIC0gMV0gIT09IFwiL1wiKXtcbiAgICAgICAgdXJsICs9IFwiL1wiO1xuICAgIH1cblxuICAgIHJldHVybiB1cmw7XG59XG5cbmNvbnN0IE93TSA9IHJlcXVpcmUoXCJzd2FybXV0aWxzXCIpLk93TTtcblxuLyoqKioqKioqKioqKioqKioqKioqKiogbWFpbiBBUElzIG9uIHdvcmtpbmcgd2l0aCByZW1vdGUgZW5kIHBvaW50cyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuZnVuY3Rpb24gUHNrSHR0cENsaWVudChyZW1vdGVFbmRQb2ludCwgYWdlbnRVaWQsIG9wdGlvbnMpe1xuICAgIHZhciBiYXNlT2ZSZW1vdGVFbmRQb2ludCA9IHJlbW90ZUVuZFBvaW50OyAvL3JlbW92ZSBsYXN0IGlkXG5cbiAgICByZW1vdGVFbmRQb2ludCA9IHVybEVuZFdpdGhTbGFzaChyZW1vdGVFbmRQb2ludCk7XG5cbiAgICAvL2RvbWFpbkluZm8gY29udGFpbnMgMiBtZW1iZXJzOiBkb21haW4gKHByaXZhdGVTa3kgZG9tYWluKSBhbmQgYWdlbnRVcmxcbiAgICBjb25zdCBkb21haW5JbmZvID0gZXh0cmFjdERvbWFpbkFnZW50RGV0YWlscyhhZ2VudFVpZCk7XG4gICAgbGV0IGhvbWVTZWN1cml0eUNvbnRleHQgPSBkb21haW5JbmZvLmFnZW50VXJsO1xuICAgIGxldCByZXR1cm5SZW1vdGVFbmRQb2ludCA9IHJlbW90ZUVuZFBvaW50O1xuXG4gICAgaWYob3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucy5yZXR1cm5SZW1vdGUgIT0gXCJ1bmRlZmluZWRcIil7XG4gICAgICAgIHJldHVyblJlbW90ZUVuZFBvaW50ID0gb3B0aW9ucy5yZXR1cm5SZW1vdGU7XG4gICAgfVxuXG4gICAgaWYoIW9wdGlvbnMgfHwgb3B0aW9ucyAmJiAodHlwZW9mIG9wdGlvbnMudW5pcXVlSWQgPT0gXCJ1bmRlZmluZWRcIiB8fCBvcHRpb25zLnVuaXF1ZUlkKSl7XG4gICAgICAgIGhvbWVTZWN1cml0eUNvbnRleHQgKz0gXCJfXCIrTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpO1xuICAgIH1cblxuICAgIHJldHVyblJlbW90ZUVuZFBvaW50ID0gdXJsRW5kV2l0aFNsYXNoKHJldHVyblJlbW90ZUVuZFBvaW50KTtcblxuICAgIHRoaXMuc3RhcnRTd2FybSA9IGZ1bmN0aW9uKHN3YXJtTmFtZSwgcGhhc2VOYW1lLCAuLi5hcmdzKXtcbiAgICAgICAgdmFyIHN3YXJtID0gbmV3IE93TSgpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwic3dhcm1JZFwiLCAkJC51aWRHZW5lcmF0b3Iuc2FmZV91dWlkKCkpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwicmVxdWVzdElkXCIsIHN3YXJtLmdldE1ldGEoXCJzd2FybUlkXCIpKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInN3YXJtVHlwZU5hbWVcIiwgc3dhcm1OYW1lKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInBoYXNlTmFtZVwiLCBwaGFzZU5hbWUpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiYXJnc1wiLCBhcmdzKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImNvbW1hbmRcIiwgXCJleGVjdXRlU3dhcm1QaGFzZVwiKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInRhcmdldFwiLCBkb21haW5JbmZvLmFnZW50VXJsKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImhvbWVTZWN1cml0eUNvbnRleHRcIiwgcmV0dXJuUmVtb3RlRW5kUG9pbnQrJCQucmVtb3RlLmJhc2U2NEVuY29kZShob21lU2VjdXJpdHlDb250ZXh0KSk7XG5cbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cFBvc3QoZ2V0UmVtb3RlKHJlbW90ZUVuZFBvaW50LCBkb21haW5JbmZvLmRvbWFpbiksIHN3YXJtLCBmdW5jdGlvbihlcnIsIHJlcyl7XG4gICAgICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiAkJC5yZW1vdGUucmVxdWVzdE1hbmFnZXIuY3JlYXRlUmVxdWVzdChzd2FybS5nZXRNZXRhKFwiaG9tZVNlY3VyaXR5Q29udGV4dFwiKSwgc3dhcm0pO1xuICAgIH07XG5cbiAgICB0aGlzLmNvbnRpbnVlU3dhcm0gPSBmdW5jdGlvbihleGlzdGluZ1N3YXJtLCBwaGFzZU5hbWUsIC4uLmFyZ3Mpe1xuICAgICAgICB2YXIgc3dhcm0gPSBuZXcgT3dNKGV4aXN0aW5nU3dhcm0pO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwicGhhc2VOYW1lXCIsIHBoYXNlTmFtZSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJhcmdzXCIsIGFyZ3MpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiY29tbWFuZFwiLCBcImV4ZWN1dGVTd2FybVBoYXNlXCIpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwidGFyZ2V0XCIsIGRvbWFpbkluZm8uYWdlbnRVcmwpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiaG9tZVNlY3VyaXR5Q29udGV4dFwiLCByZXR1cm5SZW1vdGVFbmRQb2ludCskJC5yZW1vdGUuYmFzZTY0RW5jb2RlKGhvbWVTZWN1cml0eUNvbnRleHQpKTtcblxuICAgICAgICAkJC5yZW1vdGUuZG9IdHRwUG9zdChnZXRSZW1vdGUocmVtb3RlRW5kUG9pbnQsIGRvbWFpbkluZm8uZG9tYWluKSwgc3dhcm0sIGZ1bmN0aW9uKGVyciwgcmVzKXtcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vcmV0dXJuICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlci5jcmVhdGVSZXF1ZXN0KHN3YXJtLmdldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIpLCBzd2FybSk7XG4gICAgfTtcblxuICAgIHZhciBhbGxDYXRjaEFsbHMgPSBbXTtcbiAgICB2YXIgcmVxdWVzdHNDb3VudGVyID0gMDtcbiAgICBmdW5jdGlvbiBDYXRjaEFsbChzd2FybU5hbWUsIHBoYXNlTmFtZSwgY2FsbGJhY2speyAvL3NhbWUgaW50ZXJmYWNlIGFzIFJlcXVlc3RcbiAgICAgICAgdmFyIHJlcXVlc3RJZCA9IHJlcXVlc3RzQ291bnRlcisrO1xuICAgICAgICB0aGlzLmdldFJlcXVlc3RJZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBsZXQgcmVxSWQgPSBcInN3YXJtTmFtZVwiICsgXCJwaGFzZU5hbWVcIiArIHJlcXVlc3RJZDtcbiAgICAgICAgICAgIHJldHVybiByZXFJZDtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoID0gZnVuY3Rpb24oZXJyLCByZXN1bHQpe1xuICAgICAgICAgICAgcmVzdWx0ID0gT3dNLnByb3RvdHlwZS5jb252ZXJ0KEpTT04ucGFyc2UocmVzdWx0KSk7XG4gICAgICAgICAgICB2YXIgY3VycmVudFBoYXNlTmFtZSA9IHJlc3VsdC5nZXRNZXRhKFwicGhhc2VOYW1lXCIpO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRTd2FybU5hbWUgPSByZXN1bHQuZ2V0TWV0YShcInN3YXJtVHlwZU5hbWVcIik7XG4gICAgICAgICAgICBpZigoY3VycmVudFN3YXJtTmFtZSA9PT0gc3dhcm1OYW1lIHx8IHN3YXJtTmFtZSA9PT0gJyonKSAmJiAoY3VycmVudFBoYXNlTmFtZSA9PT0gcGhhc2VOYW1lIHx8IHBoYXNlTmFtZSA9PT0gJyonKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIsIHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy5vbiA9IGZ1bmN0aW9uKHN3YXJtTmFtZSwgcGhhc2VOYW1lLCBjYWxsYmFjayl7XG4gICAgICAgIHZhciBjID0gbmV3IENhdGNoQWxsKHN3YXJtTmFtZSwgcGhhc2VOYW1lLCBjYWxsYmFjayk7XG4gICAgICAgIGFsbENhdGNoQWxscy5wdXNoKHtcbiAgICAgICAgICAgIHM6c3dhcm1OYW1lLFxuICAgICAgICAgICAgcDpwaGFzZU5hbWUsXG4gICAgICAgICAgICBjOmNcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCQucmVtb3RlLnJlcXVlc3RNYW5hZ2VyLnBvbGwoZ2V0UmVtb3RlKHJlbW90ZUVuZFBvaW50LCBkb21haW5JbmZvLmRvbWFpbikgLCBjKTtcbiAgICB9O1xuXG4gICAgdGhpcy5vZmYgPSBmdW5jdGlvbihzd2FybU5hbWUsIHBoYXNlTmFtZSl7XG4gICAgICAgIGFsbENhdGNoQWxscy5mb3JFYWNoKGZ1bmN0aW9uKGNhKXtcbiAgICAgICAgICAgIGlmKChjYS5zID09PSBzd2FybU5hbWUgfHwgc3dhcm1OYW1lID09PSAnKicpICYmIChwaGFzZU5hbWUgPT09IGNhLnAgfHwgcGhhc2VOYW1lID09PSAnKicpKXtcbiAgICAgICAgICAgICAgICAkJC5yZW1vdGUucmVxdWVzdE1hbmFnZXIudW5wb2xsKGdldFJlbW90ZShyZW1vdGVFbmRQb2ludCwgZG9tYWluSW5mby5kb21haW4pLCBjYS5jKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMudXBsb2FkQ1NCID0gZnVuY3Rpb24oY3J5cHRvVWlkLCBiaW5hcnlEYXRhLCBjYWxsYmFjayl7XG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KGJhc2VPZlJlbW90ZUVuZFBvaW50ICsgXCIvQ1NCL1wiICsgY3J5cHRvVWlkLCBiaW5hcnlEYXRhLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIHRoaXMuZG93bmxvYWRDU0IgPSBmdW5jdGlvbihjcnlwdG9VaWQsIGNhbGxiYWNrKXtcbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cEdldChiYXNlT2ZSZW1vdGVFbmRQb2ludCArIFwiL0NTQi9cIiArIGNyeXB0b1VpZCwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBnZXRSZW1vdGUoYmFzZVVybCwgZG9tYWluKSB7XG4gICAgICAgIHJldHVybiB1cmxFbmRXaXRoU2xhc2goYmFzZVVybCkgKyAkJC5yZW1vdGUuYmFzZTY0RW5jb2RlKGRvbWFpbik7XG4gICAgfVxufVxuXG4vKioqKioqKioqKioqKioqKioqKioqKiBpbml0aWFsaXNhdGlvbiBzdHVmZiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuaWYgKHR5cGVvZiAkJCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICQkID0ge307XG59XG5cbmlmICh0eXBlb2YgICQkLnJlbW90ZSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICQkLnJlbW90ZSA9IHt9O1xuICAgICQkLnJlbW90ZS5jcmVhdGVSZXF1ZXN0TWFuYWdlciA9IGZ1bmN0aW9uKHRpbWVPdXQpe1xuICAgICAgICAkJC5yZW1vdGUucmVxdWVzdE1hbmFnZXIgPSBuZXcgUmVxdWVzdE1hbmFnZXIodGltZU91dCk7XG4gICAgfTtcblxuXG4gICAgJCQucmVtb3RlLmNyeXB0b1Byb3ZpZGVyID0gbnVsbDtcbiAgICAkJC5yZW1vdGUubmV3RW5kUG9pbnQgPSBmdW5jdGlvbihhbGlhcywgcmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKXtcbiAgICAgICAgaWYoYWxpYXMgPT09IFwibmV3UmVtb3RlRW5kUG9pbnRcIiB8fCBhbGlhcyA9PT0gXCJyZXF1ZXN0TWFuYWdlclwiIHx8IGFsaWFzID09PSBcImNyeXB0b1Byb3ZpZGVyXCIpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJQc2tIdHRwQ2xpZW50IFVuc2FmZSBhbGlhcyBuYW1lOlwiLCBhbGlhcyk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCQucmVtb3RlW2FsaWFzXSA9IG5ldyBQc2tIdHRwQ2xpZW50KHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgY3J5cHRvSW5mbyk7XG4gICAgfTtcblxuXG4gICAgJCQucmVtb3RlLmRvSHR0cFBvc3QgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBjYWxsYmFjayl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSB0aGlzIVwiKTtcbiAgICB9O1xuXG4gICAgJCQucmVtb3RlLmRvSHR0cEdldCA9IGZ1bmN0aW9uIGRvSHR0cEdldCh1cmwsIGNhbGxiYWNrKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlIHRoaXMhXCIpO1xuICAgIH07XG5cbiAgICAkJC5yZW1vdGUuYmFzZTY0RW5jb2RlID0gZnVuY3Rpb24gYmFzZTY0RW5jb2RlKHN0cmluZ1RvRW5jb2RlKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlIHRoaXMhXCIpO1xuICAgIH07XG5cbiAgICAkJC5yZW1vdGUuYmFzZTY0RGVjb2RlID0gZnVuY3Rpb24gYmFzZTY0RGVjb2RlKGVuY29kZWRTdHJpbmcpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgdGhpcyFcIik7XG4gICAgfTtcbn1cblxuXG5cbi8qICBpbnRlcmZhY2VcbmZ1bmN0aW9uIENyeXB0b1Byb3ZpZGVyKCl7XG5cbiAgICB0aGlzLmdlbmVyYXRlU2FmZVVpZCA9IGZ1bmN0aW9uKCl7XG5cbiAgICB9XG5cbiAgICB0aGlzLnNpZ25Td2FybSA9IGZ1bmN0aW9uKHN3YXJtLCBhZ2VudCl7XG5cbiAgICB9XG59ICovXG4iLCIkJC5yZW1vdGUuZG9IdHRwUG9zdCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGNhbGxiYWNrKSB7XG5cbiAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT0gNCAmJiB4aHIuc3RhdHVzID09IFwiMjAwXCIpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0geGhyLnJlc3BvbnNlO1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZih4aHIuc3RhdHVzPj00MDApe1xuICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiQW4gZXJyb3Igb2NjdXJlZC4gU3RhdHVzQ29kZTogXCIgKyB4aHIuc3RhdHVzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgeGhyLm9wZW4oXCJQT1NUXCIsIHVybCwgdHJ1ZSk7XG4gICAgLy94aHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD1VVEYtOFwiKTtcblxuICAgIGlmKGRhdGEgJiYgZGF0YS5waXBlICYmIHR5cGVvZiBkYXRhLnBpcGUgPT09IFwiZnVuY3Rpb25cIil7XG4gICAgICAgIHZhciBidWZmZXJzID0gW107XG4gICAgICAgIGRhdGEub24oXCJkYXRhXCIsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGJ1ZmZlcnMucHVzaChkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGRhdGEub24oXCJlbmRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgYWN0dWFsQ29udGVudHMgPSBCdWZmZXIuY29uY2F0KGJ1ZmZlcnMpO1xuICAgICAgICAgICAgeGhyLnNlbmQoYWN0dWFsQ29udGVudHMpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgICAgeGhyLnNlbmQoZGF0YSk7XG4gICAgfVxufTtcblxuXG4kJC5yZW1vdGUuZG9IdHRwR2V0ID0gZnVuY3Rpb24gZG9IdHRwR2V0KHVybCwgY2FsbGJhY2spIHtcblxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgaGVhZGVycyB3ZXJlIHJlY2VpdmVkIGFuZCBpZiBhbnkgYWN0aW9uIHNob3VsZCBiZSBwZXJmb3JtZWQgYmVmb3JlIHJlY2VpdmluZyBkYXRhXG4gICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gMikge1xuICAgICAgICAgICAgdmFyIGNvbnRlbnRUeXBlID0geGhyLmdldFJlc3BvbnNlSGVhZGVyKFwiQ29udGVudC1UeXBlXCIpO1xuICAgICAgICAgICAgaWYgKGNvbnRlbnRUeXBlID09PSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiKSB7XG4gICAgICAgICAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PSA0ICYmIHhoci5zdGF0dXMgPT0gXCIyMDBcIikge1xuICAgICAgICAgICAgdmFyIGNvbnRlbnRUeXBlID0geGhyLmdldFJlc3BvbnNlSGVhZGVyKFwiQ29udGVudC1UeXBlXCIpO1xuXG4gICAgICAgICAgICBpZihjb250ZW50VHlwZT09PVwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCIpe1xuICAgICAgICAgICAgICAgIGxldCByZXNwb25zZUJ1ZmZlciA9IEJ1ZmZlci5mcm9tKHRoaXMucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlQnVmZmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiQW4gZXJyb3Igb2NjdXJlZC4gU3RhdHVzQ29kZTogXCIgKyB4aHIuc3RhdHVzKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgeGhyLm9wZW4oXCJHRVRcIiwgdXJsKTtcbiAgICB4aHIuc2VuZCgpO1xufTtcblxuXG5mdW5jdGlvbiBDcnlwdG9Qcm92aWRlcigpe1xuXG4gICAgdGhpcy5nZW5lcmF0ZVNhZmVVaWQgPSBmdW5jdGlvbigpe1xuICAgICAgICBsZXQgdWlkID0gXCJcIjtcbiAgICAgICAgdmFyIGFycmF5ID0gbmV3IFVpbnQzMkFycmF5KDEwKTtcbiAgICAgICAgd2luZG93LmNyeXB0by5nZXRSYW5kb21WYWx1ZXMoYXJyYXkpO1xuXG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdWlkICs9IGFycmF5W2ldLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB1aWQ7XG4gICAgfVxuXG4gICAgdGhpcy5zaWduU3dhcm0gPSBmdW5jdGlvbihzd2FybSwgYWdlbnQpe1xuICAgICAgICBzd2FybS5tZXRhLnNpZ25hdHVyZSA9IGFnZW50O1xuICAgIH1cbn1cblxuXG5cbiQkLnJlbW90ZS5jcnlwdG9Qcm92aWRlciA9IG5ldyBDcnlwdG9Qcm92aWRlcigpO1xuXG4kJC5yZW1vdGUuYmFzZTY0RW5jb2RlID0gZnVuY3Rpb24gYmFzZTY0RW5jb2RlKHN0cmluZ1RvRW5jb2RlKXtcbiAgICByZXR1cm4gd2luZG93LmJ0b2Eoc3RyaW5nVG9FbmNvZGUpO1xufTtcblxuJCQucmVtb3RlLmJhc2U2NERlY29kZSA9IGZ1bmN0aW9uIGJhc2U2NERlY29kZShlbmNvZGVkU3RyaW5nKXtcbiAgICByZXR1cm4gd2luZG93LmF0b2IoZW5jb2RlZFN0cmluZyk7XG59O1xuIiwicmVxdWlyZShcIi4vcHNrLWFic3RyYWN0LWNsaWVudFwiKTtcblxuY29uc3QgaHR0cCA9IHJlcXVpcmUoXCJodHRwXCIpO1xuY29uc3QgaHR0cHMgPSByZXF1aXJlKFwiaHR0cHNcIik7XG5jb25zdCBVUkwgPSByZXF1aXJlKFwidXJsXCIpO1xuY29uc3QgdXNlckFnZW50ID0gJ1BTSyBOb2RlQWdlbnQvMC4wLjEnO1xuXG5jb25zb2xlLmxvZyhcIlBTSyBub2RlIGNsaWVudCBsb2FkaW5nXCIpO1xuXG5mdW5jdGlvbiBnZXROZXR3b3JrRm9yT3B0aW9ucyhvcHRpb25zKSB7XG5cdGlmKG9wdGlvbnMucHJvdG9jb2wgPT09ICdodHRwOicpIHtcblx0XHRyZXR1cm4gaHR0cDtcblx0fSBlbHNlIGlmKG9wdGlvbnMucHJvdG9jb2wgPT09ICdodHRwczonKSB7XG5cdFx0cmV0dXJuIGh0dHBzO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgQ2FuJ3QgaGFuZGxlIHByb3RvY29sICR7b3B0aW9ucy5wcm90b2NvbH1gKTtcblx0fVxuXG59XG5cbiQkLnJlbW90ZS5kb0h0dHBQb3N0ID0gZnVuY3Rpb24gKHVybCwgZGF0YSwgY2FsbGJhY2spe1xuXHRjb25zdCBpbm5lclVybCA9IFVSTC5wYXJzZSh1cmwpO1xuXG5cdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0aG9zdG5hbWU6IGlubmVyVXJsLmhvc3RuYW1lLFxuXHRcdHBhdGg6IGlubmVyVXJsLnBhdGhuYW1lLFxuXHRcdHBvcnQ6IHBhcnNlSW50KGlubmVyVXJsLnBvcnQpLFxuXHRcdGhlYWRlcnM6IHtcblx0XHRcdCdVc2VyLUFnZW50JzogdXNlckFnZW50XG5cdFx0fSxcblx0XHRtZXRob2Q6ICdQT1NUJ1xuXHR9O1xuXG5cdGNvbnN0IG5ldHdvcmsgPSBnZXROZXR3b3JrRm9yT3B0aW9ucyhpbm5lclVybCk7XG5cblx0Y29uc3QgcmVxID0gbmV0d29yay5yZXF1ZXN0KG9wdGlvbnMsIChyZXMpID0+IHtcblx0XHRjb25zdCB7IHN0YXR1c0NvZGUgfSA9IHJlcztcblxuXHRcdGxldCBlcnJvcjtcblx0XHRpZiAoc3RhdHVzQ29kZSA+PSA0MDApIHtcblx0XHRcdGVycm9yID0gbmV3IEVycm9yKCdSZXF1ZXN0IEZhaWxlZC5cXG4nICtcblx0XHRcdFx0YFN0YXR1cyBDb2RlOiAke3N0YXR1c0NvZGV9YCk7XG5cdFx0fVxuXG5cdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRjYWxsYmFjayhlcnJvcik7XG5cdFx0XHQvLyBmcmVlIHVwIG1lbW9yeVxuXHRcdFx0cmVzLnJlc3VtZSgpO1xuXHRcdFx0cmV0dXJuIDtcblx0XHR9XG5cblx0XHRsZXQgcmF3RGF0YSA9ICcnO1xuXHRcdHJlcy5vbignZGF0YScsIChjaHVuaykgPT4geyByYXdEYXRhICs9IGNodW5rOyB9KTtcblx0XHRyZXMub24oJ2VuZCcsICgpID0+IHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCByYXdEYXRhKTtcblx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSkub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coXCJQT1NUIEVycm9yXCIsIGVycm9yKTtcblx0XHRjYWxsYmFjayhlcnJvcik7XG5cdH0pO1xuXG4gICAgaWYoZGF0YSAmJiBkYXRhLnBpcGUgJiYgdHlwZW9mIGRhdGEucGlwZSA9PT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgZGF0YS5waXBlKHJlcSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZih0eXBlb2YgZGF0YSAhPT0gJ3N0cmluZycgJiYgIUJ1ZmZlci5pc0J1ZmZlcihkYXRhKSkge1xuXHRcdGRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcblx0fVxuXG5cdHJlcS53cml0ZShkYXRhKTtcblx0cmVxLmVuZCgpO1xufTtcblxuJCQucmVtb3RlLmRvSHR0cEdldCA9IGZ1bmN0aW9uIGRvSHR0cEdldCh1cmwsIGNhbGxiYWNrKXtcbiAgICBjb25zdCBpbm5lclVybCA9IFVSTC5wYXJzZSh1cmwpO1xuXG5cdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0aG9zdG5hbWU6IGlubmVyVXJsLmhvc3RuYW1lLFxuXHRcdHBhdGg6IGlubmVyVXJsLnBhdGhuYW1lICsgKGlubmVyVXJsLnNlYXJjaCB8fCAnJyksXG5cdFx0cG9ydDogcGFyc2VJbnQoaW5uZXJVcmwucG9ydCksXG5cdFx0aGVhZGVyczoge1xuXHRcdFx0J1VzZXItQWdlbnQnOiB1c2VyQWdlbnRcblx0XHR9LFxuXHRcdG1ldGhvZDogJ0dFVCdcblx0fTtcblxuXHRjb25zdCBuZXR3b3JrID0gZ2V0TmV0d29ya0Zvck9wdGlvbnMoaW5uZXJVcmwpO1xuXG5cdGNvbnN0IHJlcSA9IG5ldHdvcmsucmVxdWVzdChvcHRpb25zLCAocmVzKSA9PiB7XG5cdFx0Y29uc3QgeyBzdGF0dXNDb2RlIH0gPSByZXM7XG5cblx0XHRsZXQgZXJyb3I7XG5cdFx0aWYgKHN0YXR1c0NvZGUgIT09IDIwMCkge1xuXHRcdFx0ZXJyb3IgPSBuZXcgRXJyb3IoJ1JlcXVlc3QgRmFpbGVkLlxcbicgK1xuXHRcdFx0XHRgU3RhdHVzIENvZGU6ICR7c3RhdHVzQ29kZX1gKTtcblx0XHRcdGVycm9yLmNvZGUgPSBzdGF0dXNDb2RlO1xuXHRcdH1cblxuXHRcdGlmIChlcnJvcikge1xuXHRcdFx0Y2FsbGJhY2soZXJyb3IpO1xuXHRcdFx0Ly8gZnJlZSB1cCBtZW1vcnlcblx0XHRcdHJlcy5yZXN1bWUoKTtcblx0XHRcdHJldHVybiA7XG5cdFx0fVxuXG5cdFx0bGV0IHJhd0RhdGE7XG5cdFx0Y29uc3QgY29udGVudFR5cGUgPSByZXMuaGVhZGVyc1snY29udGVudC10eXBlJ107XG5cblx0XHRpZihjb250ZW50VHlwZSA9PT0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIil7XG5cdFx0XHRyYXdEYXRhID0gW107XG5cdFx0fWVsc2V7XG5cdFx0XHRyYXdEYXRhID0gJyc7XG5cdFx0fVxuXG5cdFx0cmVzLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG5cdFx0XHRpZihBcnJheS5pc0FycmF5KHJhd0RhdGEpKXtcblx0XHRcdFx0cmF3RGF0YS5wdXNoKC4uLmNodW5rKTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHRyYXdEYXRhICs9IGNodW5rO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHJlcy5vbignZW5kJywgKCkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYoQXJyYXkuaXNBcnJheShyYXdEYXRhKSl7XG5cdFx0XHRcdFx0cmF3RGF0YSA9IEJ1ZmZlci5mcm9tKHJhd0RhdGEpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCByYXdEYXRhKTtcblx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIkNsaWVudCBlcnJvcjpcIiwgZXJyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cblx0cmVxLm9uKFwiZXJyb3JcIiwgKGVycm9yKSA9PiB7XG5cdFx0aWYoZXJyb3IgJiYgZXJyb3IuY29kZSAhPT0gJ0VDT05OUkVTRVQnKXtcbiAgICAgICAgXHRjb25zb2xlLmxvZyhcIkdFVCBFcnJvclwiLCBlcnJvcik7XG5cdFx0fVxuXG5cdFx0Y2FsbGJhY2soZXJyb3IpO1xuXHR9KTtcblxuXHRyZXEuZW5kKCk7XG59O1xuXG4kJC5yZW1vdGUuYmFzZTY0RW5jb2RlID0gZnVuY3Rpb24gYmFzZTY0RW5jb2RlKHN0cmluZ1RvRW5jb2RlKXtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20oc3RyaW5nVG9FbmNvZGUpLnRvU3RyaW5nKCdiYXNlNjQnKTtcbn07XG5cbiQkLnJlbW90ZS5iYXNlNjREZWNvZGUgPSBmdW5jdGlvbiBiYXNlNjREZWNvZGUoZW5jb2RlZFN0cmluZyl7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKGVuY29kZWRTdHJpbmcsICdiYXNlNjQnKS50b1N0cmluZygnYXNjaWknKTtcbn07IiwiLypcbk1vZHVsZSB0aGF0IG9mZmVycyBBUElzIHRvIGludGVyYWN0IHdpdGggUHJpdmF0ZVNreSB3ZWIgc2FuZGJveGVzXG4gKi9cblxuXG5jb25zdCBleHBvcnRCcm93c2VySW50ZXJhY3QgPSB7XG4gICAgZW5hYmxlSWZyYW1lSW50ZXJhY3Rpb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmNyZWF0ZVdpbmRvd01RID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL3NwZWNpZmljTVFJbXBsL0NoaWxkV25kTVFcIikuY3JlYXRlTVE7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmNyZWF0ZVdpbmRvd0ludGVyYWN0aW9uU3BhY2UgPSByZXF1aXJlKFwiLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvV2luZG93TVFJbnRlcmFjdGlvblNwYWNlXCIpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2U7XG4gICAgfSxcbiAgICBlbmFibGVSZWFjdEludGVyYWN0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVXaW5kb3dNUSA9IHJlcXVpcmUoXCIuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9zcGVjaWZpY01RSW1wbC9DaGlsZFduZE1RXCIpLmNyZWF0ZU1RO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVXaW5kb3dJbnRlcmFjdGlvblNwYWNlID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1dpbmRvd01RSW50ZXJhY3Rpb25TcGFjZVwiKS5jcmVhdGVJbnRlcmFjdGlvblNwYWNlO1xuICAgIH0sXG4gICAgZW5hYmxlV2ViVmlld0ludGVyYWN0aW9uczpmdW5jdGlvbigpe1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVXaW5kb3dJbnRlcmFjdGlvblNwYWNlID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1dlYlZpZXdNUUludGVyYWN0aW9uU3BhY2VcIikuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuY3JlYXRlV2luZG93TVEgPSByZXF1aXJlKFwiLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvc3BlY2lmaWNNUUltcGwvQ2hpbGRXZWJWaWV3TVFcIikuY3JlYXRlTVE7XG4gICAgfSxcbiAgICBlbmFibGVMb2NhbEludGVyYWN0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVJbnRlcmFjdGlvblNwYWNlID0gcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL1NvdW5kUHViU3ViTVFCYXNlZEludGVyYWN0aW9uU3BhY2VcIikuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZTtcbiAgICB9LFxuICAgIGVuYWJsZVJlbW90ZUludGVyYWN0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5jcmVhdGVSZW1vdGVJbnRlcmFjdGlvblNwYWNlID0gcmVxdWlyZSgnLi9saWIvaW50ZXJhY3Rpb25TcGFjZUltcGwvaHR0cEludGVyYWN0aW9uU3BhY2UnKS5jcmVhdGVJbnRlcmFjdGlvblNwYWNlO1xuICAgIH1cbn07XG5cblxuaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydEJyb3dzZXJJbnRlcmFjdDtcbn1cbmVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICBjcmVhdGVOb2RlSW50ZXJhY3Rpb25TcGFjZTogcmVxdWlyZShcIi4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL2ZvbGRlck1RQmFzZWRJbnRlcmFjdGlvblNwYWNlXCIpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UsXG4gICAgICAgIGNyZWF0ZUludGVyYWN0aW9uU3BhY2U6IHJlcXVpcmUoXCIuL2xpYi9pbnRlcmFjdGlvblNwYWNlSW1wbC9Tb3VuZFB1YlN1Yk1RQmFzZWRJbnRlcmFjdGlvblNwYWNlXCIpLmNyZWF0ZUludGVyYWN0aW9uU3BhY2UsXG4gICAgICAgIGNyZWF0ZVJlbW90ZUludGVyYWN0aW9uU3BhY2U6IHJlcXVpcmUoJy4vbGliL2ludGVyYWN0aW9uU3BhY2VJbXBsL2h0dHBJbnRlcmFjdGlvblNwYWNlJykuY3JlYXRlSW50ZXJhY3Rpb25TcGFjZVxuICAgIH07XG59IiwiLy90byBsb29rIG5pY2UgdGhlIHJlcXVpcmVNb2R1bGUgb24gTm9kZVxucmVxdWlyZShcIi4vbGliL3Bzay1hYnN0cmFjdC1jbGllbnRcIik7XG5pZighJCQuYnJvd3NlclJ1bnRpbWUpe1xuXHRyZXF1aXJlKFwiLi9saWIvcHNrLW5vZGUtY2xpZW50XCIpO1xufWVsc2V7XG5cdHJlcXVpcmUoXCIuL2xpYi9wc2stYnJvd3Nlci1jbGllbnRcIik7XG59Il19
