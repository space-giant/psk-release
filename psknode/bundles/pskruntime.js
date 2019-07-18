pskruntimeRequire=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/home/cosmin/Workspace/reorganizing/privatesky/builds/tmp/pskruntime.js":[function(require,module,exports){
require("../../modules/callflow/lib/overwriteRequire")

require("./pskruntime_intermediar");

require("callflow");

console.log("Loading runtime: callflow module ready");
},{"../../modules/callflow/lib/overwriteRequire":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/overwriteRequire.js","./pskruntime_intermediar":"/home/cosmin/Workspace/reorganizing/privatesky/builds/tmp/pskruntime_intermediar.js","callflow":"callflow"}],"/home/cosmin/Workspace/reorganizing/privatesky/builds/tmp/pskruntime_intermediar.js":[function(require,module,exports){
(function (global){
global.pskruntimeLoadModules = function(){ 
	$$.__runtimeModules["callflow"] = require("callflow");
	$$.__runtimeModules["launcher"] = require("launcher");
	$$.__runtimeModules["double-check"] = require("double-check");
	$$.__runtimeModules["pskcrypto"] = require("pskcrypto");
	$$.__runtimeModules["dicontainer"] = require("dicontainer");
	$$.__runtimeModules["swarmutils"] = require("swarmutils");
	$$.__runtimeModules["soundpubsub"] = require("soundpubsub");
	$$.__runtimeModules["pskbuffer"] = require("pskbuffer");
	$$.__runtimeModules["foldermq"] = require("foldermq");
	$$.__runtimeModules["domainBase"] = require("domainBase");
	$$.__runtimeModules["utils"] = require("utils");
}
if (false) {
	pskruntimeLoadModules();
}; 
global.pskruntimeRequire = require;
if (typeof $$ !== "undefined") {            
    $$.requireBundle("pskruntime");
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"callflow":"callflow","dicontainer":"dicontainer","domainBase":"domainBase","double-check":"double-check","foldermq":"foldermq","launcher":"launcher","pskbuffer":"pskbuffer","pskcrypto":"pskcrypto","soundpubsub":"soundpubsub","swarmutils":"swarmutils","utils":"utils"}],"/home/cosmin/Workspace/reorganizing/privatesky/libraries/domainBase/domainPubSub.js":[function(require,module,exports){
var pubSub = $$.require("soundpubsub").soundPubSub;
const path = require("path");
const fs = require("fs");

exports.create = function(folder, codeFolder ){

    $$.PSK_PubSub = pubSub;
    var sandBoxesRoot = path.join(folder, "sandboxes");

    try{
        fs.mkdirSync(sandBoxesRoot, {recursive: true});
    }catch(err){
        console.log("Failed to create sandboxes dir structure!", err);
        //TODO: maybe it is ok to call process.exit ???
    }

    $$.SandBoxManager = require("../../psknode/core/sandboxes/util/SandBoxManager").create(sandBoxesRoot, codeFolder, function(err, res){
        console.log($$.DI_components.sandBoxReady, err, res);
        $$.container.resolve($$.DI_components.sandBoxReady, true);
    });

    return pubSub;
};

},{"../../psknode/core/sandboxes/util/SandBoxManager":"/home/cosmin/Workspace/reorganizing/privatesky/psknode/core/sandboxes/util/SandBoxManager.js","fs":false,"path":"path"}],"/home/cosmin/Workspace/reorganizing/privatesky/libraries/launcher/components.js":[function(require,module,exports){
$$.DI_components = {
   swarmIsReady:"SwarmIsReady",
   configLoaded:"configLoaded",
   sandBoxReady:"SandBoxReady",
   localNodeAPIs:"localNodeAPIs"
}

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/libraries/utils/FSExtension.js":[function(require,module,exports){
(function (__dirname){
const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require('child_process');
const crypto = require('crypto');

// if this is set to true, the logs will be available. Default (false)
const DEBUG =  process.env.DEPLOYER_DEBUG || false;

function FSExtention(){

    /**
     * Base path used to resolve all relative paths in the actions bellow.
     * Default is set to two levels up from the current directory. This can be changed using __setBasePath.
     * @type {*|string}
     */
    var basePath = path.join(__dirname, "../../");

    /**
     * Set the base path to a different absolute directory path.
     * @param wd {String} absolute directory path.
     * @private
     */
    var __setBasePath = function(wd) {
        basePath = path.resolve(wd);
    }

    /**
     * Resolve path into an absolute path. If filePath is relative, the path is resolved using the basePath as first argument.
     * @param filePath {String} relative or absolute file path.
     * @returns {String} absolute path
     * @private
     */
    var __resolvePath = function(filePath) {
        if(path.isAbsolute(filePath)) {
            return filePath;
        }

        return path.resolve(basePath, filePath);
    }

    /**
     * If the directory structure does not exist, it is created. Like mkdir -p
     * @param dir {String} dir path
     * @private
     */
    var __createDir = function(dir) {
        dir = __resolvePath(dir);
        if (fs.existsSync(dir)) {
            log(dir + " already exist! Continuing ...")
            return;
        }

        var isWin = (os.platform() === 'win32');
        var cmd = isWin ? "mkdir " : "mkdir -p ";

        child_process.execSync(cmd + "\""+dir+"\"", {stdio:[0,1,2]});
    }

    /**
     * Copy a file or directory. The directory can have recursive contents. Like copy -r.
     * NOTE: If src is a directory it will copy everything inside of the directory, not the entire directory itself.
     * NOTE: If src is a file, target cannot be a directory.
     * NOTE: If the destination path structure does not exists, it will be created.
     * @param src {String} Source file|directory path.
     * @param dest {String} Destination file|directory path.
     * @param options {Object} Optional parameters for copy action. Available options:
     *  - overwrite <Boolean>: overwrite existing file or directory, default is true.
     *  Note that the copy operation will silently fail if this is set to false and the destination exists.
     * @param callback {Function}
     * @private
     */
    var __copy = function (src, dest, options, callback) {
        src = __resolvePath(src);
        dest = __resolvePath(dest);

        callback = callback || function(){};
        let rethrow = false;

        try{
            if (!fs.existsSync(src)) {
                rethrow = true;
                throw `Source directory or file "${src}" does not exists!`;
            }

            let srcStat = fs.lstatSync(src);
            if(srcStat.isDirectory()) {
                __copyDir(src, dest, options);
            } else if(srcStat.isFile()) {
                // destination must be a file too
                __copyFile(src, dest, options);
            }
        } catch (err) {
            if(rethrow){
                throw err;
            }
            log(err, true);
            callback(err);
            return;
        }

        callback();
    }

    /**
     * Copy a directory. The directory can have recursive contents. Like copy -r.
     * NOTE: Itt will copy everything inside of the directory, not the entire directory itself.
     * NOTE: If the destination path structure does not exists, it will be created.
     * @param src {String} Source directory path.
     * @param dest {String} Destination directory path.
     * @param options {Object} Optional parameters for copy action. Available options:
     *  - overwrite <Boolean>: overwrite existing directory, default is true.
     *  Note that the copy operation will silently fail if this is set to false and the destination exists.
     * @private
     */
    var __copyDir = function(src, dest, options) {
        src = __resolvePath(src);
        dest = __resolvePath(dest);

        __createDir(dest);

        var files = fs.readdirSync(src);
        for(var i = 0; i < files.length; i++) {
            let current = fs.lstatSync(path.join(src, files[i]));
            let newSrc = path.join(src, files[i]);
            let newDest = path.join(dest, files[i]);

            if(current.isDirectory()) {
                __copyDir(newSrc, newDest, options);
            } else if(current.isSymbolicLink()) {
                var symlink = fs.readlinkSync(newSrc);
                fs.symlinkSync(symlink, newDest);
            } else {
                __copyFile(newSrc, newDest, options);
            }
        }
    };

    /**
     * Copy a file.
     * NOTE: If src is a file, target cannot be a directory.
     * NOTE: If the destination path structure does not exists, it will be created.
     * @param src {String} Source file path.
     * @param dest {String} Destination file path.
     * @param options {Object} Optional parameters for copy action. Available options:
     *  - overwrite <Boolean>: overwrite existing file or directory, default is true.
     *  Note that the copy operation will silently fail if this is set to false and the destination exists.
     * @param callback {Function}
     * @private
     */
    var __copyFile = function(src, dest, options) {
        src = __resolvePath(src);
        dest = __resolvePath(dest);

        if(options && options.overwrite === false) {
            if (fs.existsSync(dest)) {
                // silently fail if overwrite is set to false and the destination exists.
                let error = `Silent fail - cannot copy. Destination file ${dest} already exists and overwrite option is set to false! Continuing...`;
                log(error, true);
                return;
            }
        }
        __createDir(path.dirname(dest));

        var content = fs.readFileSync(src, "utf8");
        fs.writeFileSync(dest, content);
    }

    /**
     * Removes a file or directory. The directory can have recursive contents. Like rm -rf
     * @param src {String} Path
     * @param callback {Function}
     * @private
     */
    var __remove = function(src, callback) {
        src = __resolvePath(src);

        callback = callback || function(){};

        log(`Removing ${src}`);

        try{
            let current = fs.lstatSync(src);
            if(current.isDirectory()) {
                __rmDir(src);
            } else if(current.isFile()) {
                __rmFile(src);
            }
        } catch (err) {
            if(err.code && err.code === "ENOENT"){
                //ignoring errors like "file/directory does not exist"
                err = null;
            }else{
                log(err, true);
            }
            callback(err);
            return;
        }

        callback();
    }

    /**
     * Removes a directory. The directory can have recursive contents. Like rm -rf
     * @param dir {String} Path
     * @private
     */
    var __rmDir = function (dir) {
        dir = __resolvePath(dir);

        if (!fs.existsSync(dir)) {
            log(`Directory ${dir} does not exist!`, true);
            return;
        }

        var list = fs.readdirSync(dir);
        for (var i = 0; i < list.length; i++) {
            var filename = path.join(dir, list[i]);
            var stat = fs.lstatSync(filename);

            if (stat.isDirectory()) {
                __rmDir(filename, null);
            } else {
                // rm filename
                fs.unlinkSync(filename);
            }
        }

        fs.rmdirSync(dir);
    }

    /**
     * Removes a file.
     * @param file {String} Path
     * @private
     */
    var __rmFile = function(file) {
        file = __resolvePath(file);
        if (!fs.existsSync(file)) {
            log(`File ${file} does not exist!`, true);
            return;
        }

        fs.unlinkSync(file);
    }

    /**
     * Writes data to a file, replacing the file if it already exists.
     * @param file {String} Path.
     * @param data {String}
     * @private
     */
    var __createFile = function(file, data, options) {
        file = __resolvePath(file)
        fs.writeFileSync(file, data, options);
    }

    /**
     * Moves a file or directory.
     * @param src {String} Source path.
     * @param dest {String} Destination path.
     * @param options {Object}. Optional parameters for copy action. Available options:
     *  - overwrite <boolean>: overwrite existing file or directory, default is false. Note that the move operation will silently fail if you set this to true and the destination exists.
     * @param callback {Function}
     * @private
     */
    var __move = function(src, dest, options, callback) {
        src = __resolvePath(src);
        dest = __resolvePath(dest);

        callback = callback || function(){};

        try {
            if(options && options.overwrite === false) {
                if (fs.existsSync(dest)) {
                    // silently fail if overwrite is set to false and the destination exists.
                    let error = `Silent fail - cannot move. Destination file ${dest} already exists and overwrite option is set to false! Continuing...`;
                    log(error, true);
                    callback();
                    return;
                }
            }

            __copy(src, dest, options);
            __remove(src);
        }catch(err) {
            callback(err);
            return;
        }
        callback();
    }

    /**
     * Computes checksum to a file or a directory based on their contents only.
     * If the source is directory, the checksum is a hash of all concatenated file hashes.
     * @param src {String} Path of a file or directory.
     * @param algorithm {String} Hashing algorithm(default: md5). The algorithm is dependent on the available algorithms
     * supported by the version of OpenSSL on the platform. E.g. 'md5', 'sha256', 'sha512'.
     * @param encoding {String} Hashing encoding (default: 'hex'). The encoding is dependent on the
     * available digest algorithms. E.g. 'hex', 'latin1' or 'base64'.
     * @returns {String} Checksum of the file or directory.
     * @private
     */
    var __checksum = function(src, algorithm, encoding) {
        src = __resolvePath(src);

        if (!fs.existsSync(src)) {
            throw `Path ${src} does not exists!`;
        }

        var checksum = "";
        let current = fs.lstatSync(src);
        if(current.isDirectory()) {
            let hashDir = __hashDir(src, algorithm, encoding);
            checksum = hashDir["hash"];
        } else if(current.isFile()) {
            checksum = __hashFile(src, algorithm, encoding);
        }

        return checksum;
    }

    /**
     * Computes hash of a string.
     * @param str {String}
     * @param algorithm {String} Hashing algorithm(default: md5). The algorithm is dependent on the available algorithms
     * supported by the version of OpenSSL on the platform. E.g. 'md5', 'sha256', 'sha512'.
     * @param encoding {String} Hashing encoding (default: 'hex'). The encoding is dependent on the
     * available digest algorithms. E.g. 'hex', 'latin1' or 'base64'.
     * @returns {String} Hash of the string.
     * @private
     */
    var __hash =  function(str, algorithm, encoding) {
        return crypto
            .createHash(algorithm || 'md5')
            .update(str, 'utf8')
            .digest(encoding || 'hex')
    }

    /**
     * Computes hash of a file based on its content only.
     * @param src {String} Path of a file.
     * @param algorithm {String} Hashing algorithm(default: md5). The algorithm is dependent on the available algorithms
     * supported by the version of OpenSSL on the platform. E.g. 'md5', 'sha256', 'sha512'.
     * @param encoding {String} Hashing encoding (default: 'hex'). The encoding is dependent on the
     * available digest algorithms. E.g. 'hex', 'latin1' or 'base64'.
     * @returns {String} Hash of the file.
     * @private
     */
    var __hashFile = function(src, algorithm, encoding) {
        src = __resolvePath(src);
        if (!fs.existsSync(src)) {
            throw `${src} does not exist!`;
        }

        var content = fs.readFileSync(src, "utf8");
        return __hash(content, algorithm, encoding);
    }

    /**
     * Computes hash of a directory based on its content only.
     * If directory has multiple files, the result is a hash of all concatenated file hashes.
     * @param src {String} Path of a directory.
     * @param algorithm {String} Hashing algorithm(default: md5). The algorithm is dependent on the available algorithms
     * supported by the version of OpenSSL on the platform. E.g. 'md5', 'sha256', 'sha512'.
     * @param encoding {String} Hashing encoding (default: 'hex'). The encoding is dependent on the
     * available digest algorithms. E.g. 'hex', 'latin1' or 'base64'.
     * @returns {String} Hash of the directory.
     * @private
     */
    var __hashDir = function(dir, algorithm, encoding) {
        dir = __resolvePath(dir);
        if (!fs.existsSync(dir)) {
            throw `Directory ${dir} does not exist!`;
        }
        var hashes = {};
        var list = fs.readdirSync(dir);
        for (var i = 0; i < list.length; i++) {
            var filename = path.join(dir, list[i]);
            var stat = fs.lstatSync(filename);

            if (stat.isDirectory()) {
                let tempHashes = __hashDir(filename, algorithm, encoding);
                hashes = Object.assign(hashes, tempHashes["sub-hashes"]);
            } else {
                let tempHash = __hashFile(filename, algorithm, encoding);
                hashes[filename] = tempHash;
            }
        }

        // compute dir hash
        let dirContent = Object.keys(hashes).reduce(function (previous, key) {
            return previous += hashes[key];
        }, "");

        let dirHash = __hash(dirContent, algorithm, encoding);

        return {
            "hash": dirHash,
            "sub-hashes": hashes
        }
    }

    /**
     * Generates a guid (global unique identifier).
     * @returns {String} Guid in the format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
     * @private
     */
    var __guid = function guid() {
        function _make_group(s) {
            var p = (Math.random().toString(16)+"000000000").substr(2,8);
            return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
        }
        return _make_group() + _make_group(true) + _make_group(true) + _make_group();
    }

    /**
     * Logs wrapper.
     * @param message {String}
     * @param isError {Boolean}
     */
    function log(message, isError) {
        let logger = isError ? console.error : console.log;

        if(DEBUG) {
            logger(message);
        }
    }

    return {
        setBasePath: __setBasePath,
        resolvePath: __resolvePath,
        createDir: __createDir,
        copyDir: __copyDir,
        rmDir: __rmDir,
        rmFile: __rmFile,
        createFile: __createFile,
        copy: __copy,
        move: __move,
        remove: __remove,
        checksum: __checksum,
        guid: __guid
    }
}

module.exports.fsExt = new FSExtention();
}).call(this,"/libraries/utils")

},{"child_process":false,"crypto":"crypto","fs":false,"os":"os","path":"path"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/constants.js":[function(require,module,exports){
$$.CONSTANTS = {
    SWARM_FOR_EXECUTION:"swarm_for_execution",
    INBOUND:"inbound",
    OUTBOUND:"outbound",
    PDS:"PrivateDataSystem",
    CRL:"CommunicationReplicationLayer",
    SWARM_RETURN: 'swarm_return',
    BEFORE_INTERCEPTOR: 'before',
    AFTER_INTERCEPTOR: 'after',
};


},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/InterceptorRegistry.js":[function(require,module,exports){
// related to: SwarmSpace.SwarmDescription.createPhase()

function InterceptorRegistry() {
    const rules = new Map();

    // ??? $$.errorHandler Library ???
    const _CLASS_NAME = 'InterceptorRegistry';

    /************* PRIVATE METHODS *************/

    function _throwError(err, msg) {
        console.error(err.message, `${_CLASS_NAME} error message:`, msg);
        throw err;
    }

    function _warning(msg) {
        console.warn(`${_CLASS_NAME} warning message:`, msg);
    }

    const getWhenOptions = (function () {
        let WHEN_OPTIONS;
        return function () {
            if (WHEN_OPTIONS === undefined) {
                WHEN_OPTIONS = Object.freeze([
                    $$.CONSTANTS.BEFORE_INTERCEPTOR,
                    $$.CONSTANTS.AFTER_INTERCEPTOR
                ]);
            }
            return WHEN_OPTIONS;
        };
    })();

    function verifyWhenOption(when) {
        if (!getWhenOptions().includes(when)) {
            _throwError(new RangeError(`Option '${when}' is wrong!`),
                `it should be one of: ${getWhenOptions()}`);
        }
    }

    function verifyIsFunctionType(fn) {
        if (typeof fn !== 'function') {
            _throwError(new TypeError(`Parameter '${fn}' is wrong!`),
                `it should be a function, not ${typeof fn}!`);
        }
    }

    function resolveNamespaceResolution(swarmTypeName) {
        if (swarmTypeName === '*') {
            return swarmTypeName;
        }

        return (swarmTypeName.includes(".") ? swarmTypeName : ($$.libraryPrefix + "." + swarmTypeName));
    }

    /**
     * Transforms an array into a generator with the particularity that done is set to true on the last element,
     * not after it finished iterating, this is helpful in optimizing some other functions
     * It is useful if you want call a recursive function over the array elements but without popping the first
     * element of the Array or sending the index as an extra parameter
     * @param {Array<*>} arr
     * @return {IterableIterator<*>}
     */
    function* createArrayGenerator(arr) {
        const len = arr.length;

        for (let i = 0; i < len - 1; ++i) {
            yield arr[i];
        }

        return arr[len - 1];
    }

    /**
     * Builds a tree like structure over time (if called on the same root node) where internal nodes are instances of
     * Map containing the name of the children nodes (each child name is the result of calling next on `keysGenerator)
     * and a reference to them and on leafs it contains an instance of Set where it adds the function given as parameter
     * (ex: for a keyGenerator that returns in this order ("key1", "key2") the resulting structure will be:
     * {"key1": {"key1": Set([fn])}} - using JSON just for illustration purposes because it's easier to represent)
     * @param {Map} rulesMap
     * @param {IterableIterator} keysGenerator - it has the particularity that done is set on last element, not after it
     * @param {function} fn
     */
    function registerRecursiveRule(rulesMap, keysGenerator, fn) {
        const {value, done} = keysGenerator.next();

        if (!done) { // internal node
            const nextKey = rulesMap.get(value);

            if (typeof nextKey === 'undefined') { // if value not found in rulesMap
                rulesMap.set(value, new Map());
            }

            registerRecursiveRule(rulesMap.get(value), keysGenerator, fn);
        } else { // reached leaf node
            if (!rulesMap.has(value)) {

                rulesMap.set(value, new Set([fn]));
            } else {
                const set = rulesMap.get(value);

                if (set.has(fn)) {
                    _warning(`Duplicated interceptor for '${key}'`);
                }

                set.add(fn);
            }
        }
    }

    /**
     * Returns the corresponding set of functions for the given key if found
     * @param {string} key - formatted as a path without the first '/' (ex: swarmType/swarmPhase/before)
     * @return {Array<Set<function>>}
     */
    function getInterceptorsForKey(key) {
        if (key.startsWith('/')) {
            _warning(`Interceptor called on key ${key} starting with '/', automatically removing it`);
            key = key.substring(1);
        }

        const keyElements = key.split('/');
        const keysGenerator = createArrayGenerator(keyElements);

        return getValueRecursively([rules], keysGenerator);
    }

    /**
     * It works like a BFS search returning the leafs resulting from traversing the internal nodes with corresponding
     * names given for each level (depth) by `keysGenerator`
     * @param {Array<Map>} searchableNodes
     * @param {IterableIterator} keysGenerator - it has the particularity that done is set on last element, not after it
     * @return {Array<Set<function>>}
     */
    function getValueRecursively(searchableNodes, keysGenerator) {
        const {value: nodeName, done} = keysGenerator.next();

        const nextNodes = [];

        for (const nodeInRules of searchableNodes) {
            const nextNodeForAll = nodeInRules.get('*');
            const nextNode = nodeInRules.get(nodeName);

            if (typeof nextNode !== "undefined") {
                nextNodes.push(nextNode);
            }

            if (typeof nextNodeForAll !== "undefined") {
                nextNodes.push(nextNodeForAll);
            }

        }

        if (done) {
            return nextNodes;
        }

        return getValueRecursively(nextNodes, keysGenerator);
    }


    /************* PUBLIC METHODS *************/

    this.register = function (swarmTypeName, phaseName, when, fn) {
        verifyWhenOption(when);
        verifyIsFunctionType(fn);

        const resolvedSwarmTypeName = resolveNamespaceResolution(swarmTypeName);
        const keys = createArrayGenerator([resolvedSwarmTypeName, phaseName, when]);

        registerRecursiveRule(rules, keys, fn);
    };

    // this.unregister = function () { }

    this.callInterceptors = function (key, targetObject, args) {
        const interceptors = getInterceptorsForKey(key);

        if (interceptors) {
            for (const interceptorSet of interceptors) {
                for (const fn of interceptorSet) { // interceptors on key '*' are called before those specified by name
                    fn.apply(targetObject, args);
                }
            }
        }
    };
}


exports.createInterceptorRegistry = function () {
    return new InterceptorRegistry();
};

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/SwarmDebug.js":[function(require,module,exports){
/*
 Initial License: (c) Axiologic Research & Alboaie Sînică.
 Contributors: Axiologic Research , PrivateSky project
 Code License: LGPL or MIT.
 */

var util = require("util");
var fs = require("fs");
cprint = console.log;
wprint = console.warn;
dprint = console.debug;
eprint = console.error;


/**
 * Shortcut to JSON.stringify
 * @param obj
 */
J = function (obj) {
    return JSON.stringify(obj);
}


/**
 * Print swarm contexts (Messages) and easier to read compared with J
 * @param obj
 * @return {string}
 */
exports.cleanDump = function (obj) {
    var o = obj.valueOf();
    var meta = {
        swarmTypeName:o.meta.swarmTypeName
    };
    return "\t swarmId: " + o.meta.swarmId + "{\n\t\tmeta: "    + J(meta) +
        "\n\t\tpublic: "        + J(o.publicVars) +
        "\n\t\tprotected: "     + J(o.protectedVars) +
        "\n\t\tprivate: "       + J(o.privateVars) + "\n\t}\n";
}

//M = exports.cleanDump;
/**
 * Experimental functions
 */


/*

 logger      = monitor.logger;
 assert      = monitor.assert;
 throwing    = monitor.exceptions;


 var temporaryLogBuffer = [];

 var currentSwarmComImpl = null;

 logger.record = function(record){
 if(currentSwarmComImpl===null){
 temporaryLogBuffer.push(record);
 } else {
 currentSwarmComImpl.recordLog(record);
 }
 }

 var container = require("dicontainer").container;

 container.service("swarmLoggingMonitor", ["swarmingIsWorking", "swarmComImpl"], function(outOfService,swarming, swarmComImpl){

 if(outOfService){
 if(!temporaryLogBuffer){
 temporaryLogBuffer = [];
 }
 } else {
 var tmp = temporaryLogBuffer;
 temporaryLogBuffer = [];
 currentSwarmComImpl = swarmComImpl;
 logger.record = function(record){
 currentSwarmComImpl.recordLog(record);
 }

 tmp.forEach(function(record){
 logger.record(record);
 });
 }
 })

 */
uncaughtExceptionString = "";
uncaughtExceptionExists = false;
if(typeof globalVerbosity == 'undefined'){
    globalVerbosity = false;
}

var DEBUG_START_TIME = new Date().getTime();

function getDebugDelta(){
    var currentTime = new Date().getTime();
    return currentTime - DEBUG_START_TIME;
}

/**
 * Debug functions, influenced by globalVerbosity global variable
 * @param txt
 */
dprint = function (txt) {
    if (globalVerbosity == true) {
        if (thisAdapter.initilised ) {
            console.log("DEBUG: [" + thisAdapter.nodeName + "](" + getDebugDelta()+ "):"+txt);
        }
        else {
            console.log("DEBUG: (" + getDebugDelta()+ "):"+txt);
            console.log("DEBUG: " + txt);
        }
    }
}

/**
 * obsolete!?
 * @param txt
 */
aprint = function (txt) {
    console.log("DEBUG: [" + thisAdapter.nodeName + "]: " + txt);
}



/**
 * Utility function usually used in tests, exit current process after a while
 * @param msg
 * @param timeout
 */
delayExit = function (msg, retCode,timeout) {
    if(retCode == undefined){
        retCode = ExitCodes.UnknownError;
    }

    if(timeout == undefined){
        timeout = 100;
    }

    if(msg == undefined){
        msg = "Delaying exit with "+ timeout + "ms";
    }

    console.log(msg);
    setTimeout(function () {
        process.exit(retCode);
    }, timeout);
}


function localLog (logType, message, err) {
    var time = new Date();
    var now = time.getDate() + "-" + (time.getMonth() + 1) + "," + time.getHours() + ":" + time.getMinutes();
    var msg;

    msg = '[' + now + '][' + thisAdapter.nodeName + '] ' + message;

    if (err != null && err != undefined) {
        msg += '\n     Err: ' + err.toString();
        if (err.stack && err.stack != undefined)
            msg += '\n     Stack: ' + err.stack + '\n';
    }

    cprint(msg);
    if(thisAdapter.initilised){
        try{
            fs.appendFileSync(getSwarmFilePath(thisAdapter.config.logsPath + "/" + logType), msg);
        } catch(err){
            console.log("Failing to write logs in ", thisAdapter.config.logsPath );
        }

    }
}


// printf = function (...params) {
//     var args = []; // empty array
//     // copy all other arguments we want to "pass through"
//     for (var i = 0; i < params.length; i++) {
//         args.push(params[i]);
//     }
//     var out = util.format.apply(this, args);
//     console.log(out);
// }
//
// sprintf = function (...params) {
//     var args = []; // empty array
//     for (var i = 0; i < params.length; i++) {
//         args.push(params[i]);
//     }
//     return util.format.apply(this, args);
// }


},{"fs":false,"util":"util"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/swarmInstancesManager.js":[function(require,module,exports){


function SwarmsInstancesManager(){
    var swarmAliveInstances = {

    }

    this.waitForSwarm = function(callback, swarm, keepAliveCheck){

        function doLogic(){
            var swarmId = swarm.getInnerValue().meta.swarmId;
            var watcher = swarmAliveInstances[swarmId];
            if(!watcher){
                watcher = {
                    swarm:swarm,
                    callback:callback,
                    keepAliveCheck:keepAliveCheck
                }
                swarmAliveInstances[swarmId] = watcher;
            }
        }

        function filter(){
            return swarm.getInnerValue().meta.swarmId;
        }

        //$$.uidGenerator.wait_for_condition(condition,doLogic);
        swarm.observe(doLogic, null, filter);
    }

    function cleanSwarmWaiter(swarmSerialisation){ // TODO: add better mechanisms to prevent memory leaks
        var swarmId = swarmSerialisation.meta.swarmId;
        var watcher = swarmAliveInstances[swarmId];

        if(!watcher){
            $$.errorHandler.warning("Invalid swarm received: " + swarmId);
            return;
        }

        var args = swarmSerialisation.meta.args;
        args.push(swarmSerialisation);

        watcher.callback.apply(null, args);
        if(!watcher.keepAliveCheck()){
            delete swarmAliveInstances[swarmId];
        }
    }

    this.revive_swarm = function(swarmSerialisation){


        var swarmId     = swarmSerialisation.meta.swarmId;
        var swarmType   = swarmSerialisation.meta.swarmTypeName;
        var instance    = swarmAliveInstances[swarmId];

        var swarm;

        if(instance){
            swarm = instance.swarm;
            swarm.update(swarmSerialisation);

        } else {
            swarm = $$.swarm.start(swarmType);
            swarm.update(swarmSerialisation);
            /*swarm = $$.swarm.start(swarmType, swarmSerialisation);*/
        }

        if (swarmSerialisation.meta.command == "asyncReturn") {
            var co = $$.PSK_PubSub.publish($$.CONSTANTS.SWARM_RETURN, swarmSerialisation);
            console.log("Subscribers listening on", $$.CONSTANTS.SWARM_RETURN, co);
            // cleanSwarmWaiter(swarmSerialisation);
        } else if (swarmSerialisation.meta.command == "executeSwarmPhase") {
            swarm.runPhase(swarmSerialisation.meta.phaseName, swarmSerialisation.meta.args);
        } else {
            console.log("Unknown command", swarmSerialisation.meta.command, "in swarmSerialisation.meta.command");
        }

        return swarm;
    }
}


$$.swarmsInstancesManager = new SwarmsInstancesManager();



},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/utilityFunctions/asset.js":[function(require,module,exports){
exports.createForObject = function(valueObject, thisObject, localId){
	var ret = require("./base").createForObject(valueObject, thisObject, localId);

	ret.swarm           = null;
	ret.onReturn        = null;
	ret.onResult        = null;
	ret.asyncReturn     = null;
	ret.return          = null;
	ret.home            = null;
	ret.isPersisted  	= function () {
		return thisObject.getMetadata('persisted') === true;
	};

	return ret;
};
},{"./base":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/utilityFunctions/base.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/utilityFunctions/base.js":[function(require,module,exports){
var beesHealer = require("swarmutils").beesHealer;
var swarmDebug = require("../SwarmDebug");

exports.createForObject = function(valueObject, thisObject, localId){
	var ret = {};

	function filterForSerialisable (valueObject){
		return valueObject.meta.swarmId;
	}

	var swarmFunction = function(context, phaseName){
		var args =[];
		for(var i = 2; i < arguments.length; i++){
			args.push(arguments[i]);
		}

		//make the execution at level 0  (after all pending events) and wait to have a swarmId
		ret.observe(function(){
			beesHealer.asJSON(valueObject, phaseName, args, function(err,jsMsg){
				jsMsg.meta.target = context;
				var subscribersCount = $$.PSK_PubSub.publish($$.CONSTANTS.SWARM_FOR_EXECUTION, jsMsg);
				if(!subscribersCount){
					console.log(`Nobody listening for <${$$.CONSTANTS.SWARM_FOR_EXECUTION}>!`);
				}
			});
		},null,filterForSerialisable);

		ret.notify();


		return thisObject;
	};

	var asyncReturn = function(err, result){
		var context = valueObject.protectedVars.context;

		if(!context && valueObject.meta.waitStack){
			context = valueObject.meta.waitStack.pop();
			valueObject.protectedVars.context = context;
		}

		beesHealer.asJSON(valueObject, "__return__", [err, result], function(err,jsMsg){
			jsMsg.meta.command = "asyncReturn";
			if(!context){
				context = valueObject.meta.homeSecurityContext;//TODO: CHECK THIS

			}
			jsMsg.meta.target = context;

			if(!context){
				$$.errorHandler.error(new Error("Asynchronous return inside of a swarm that does not wait for results"));
			} else {
				$$.PSK_PubSub.publish($$.CONSTANTS.SWARM_FOR_EXECUTION, jsMsg);
			}
		});
	};

	function home(err, result){
		beesHealer.asJSON(valueObject, "home", [err, result], function(err,jsMsg){
			var context = valueObject.meta.homeContext;
			jsMsg.meta.target = context;
			$$.PSK_PubSub.publish($$.CONSTANTS.SWARM_FOR_EXECUTION, jsMsg);
		});
	}



	function waitResults(callback, keepAliveCheck, swarm){
		if(!swarm){
			swarm = this;
		}
		if(!keepAliveCheck){
			keepAliveCheck = function(){
				return false;
			}
		}
		var inner = swarm.getInnerValue();
		if(!inner.meta.waitStack){
			inner.meta.waitStack = [];
			inner.meta.waitStack.push($$.securityContext)
		}
		$$.swarmsInstancesManager.waitForSwarm(callback, swarm, keepAliveCheck);
	}


	function getInnerValue(){
		return valueObject;
	}

	function runPhase(functName, args){
		var func = valueObject.myFunctions[functName];
		if(func){
			func.apply(thisObject, args);
		} else {
			$$.errorHandler.syntaxError(functName, valueObject, "Function " + functName + " does not exist!");
		}

	}

	function update(serialisation){
		beesHealer.jsonToNative(serialisation,valueObject);
	}


	function valueOf(){
		var ret = {};
		ret.meta                = valueObject.meta;
		ret.publicVars          = valueObject.publicVars;
		ret.privateVars         = valueObject.privateVars;
		ret.protectedVars       = valueObject.protectedVars;
		return ret;
	}

	function toString (){
		return swarmDebug.cleanDump(thisObject.valueOf());
	}


	function createParallel(callback){
		return require("../../parallelJoinPoint").createJoinPoint(thisObject, callback, $$.__intern.mkArgs(arguments,1));
	}

	function createSerial(callback){
		return require("../../serialJoinPoint").createSerialJoinPoint(thisObject, callback, $$.__intern.mkArgs(arguments,1));
	}

	function inspect(){
		return swarmDebug.cleanDump(thisObject.valueOf());
	}

	function constructor(){
		return SwarmDescription;
	}

	function ensureLocalId(){
		if(!valueObject.localId){
			valueObject.localId = valueObject.meta.swarmTypeName + "-" + localId;
			localId++;
		}
	}

	function observe(callback, waitForMore, filter){
		if(!waitForMore){
			waitForMore = function (){
				return false;
			}
		}

		ensureLocalId();

		$$.PSK_PubSub.subscribe(valueObject.localId, callback, waitForMore, filter);
	}

	function toJSON(prop){
		//preventing max call stack size exceeding on proxy auto referencing
		//replace {} as result of JSON(Proxy) with the string [Object protected object]
		return "[Object protected object]";
	}

	function getJSON(callback){
		return	beesHealer.asJSON(valueObject, null, null,callback);
	}

	function notify(event){
		if(!event){
			event = valueObject;
		}
		ensureLocalId();
		$$.PSK_PubSub.publish(valueObject.localId, event);
	}

	function getMeta(name){
		return valueObject.getMeta(name);
	}

	function setMeta(name, value){
		return valueObject.setMeta(name, value);
	}

	ret.setMeta			= setMeta;
	ret.getMeta			= getMeta;
	ret.swarm           = swarmFunction;
	ret.notify          = notify;
	ret.getJSON    	    = getJSON;
	ret.toJSON          = toJSON;
	ret.observe         = observe;
	ret.inspect         = inspect;
	ret.join            = createParallel;
	ret.parallel        = createParallel;
	ret.serial          = createSerial;
	ret.valueOf         = valueOf;
	ret.update          = update;
	ret.runPhase        = runPhase;
	ret.onReturn        = waitResults;
	ret.onResult        = waitResults;
	ret.asyncReturn     = asyncReturn;
	ret.return          = asyncReturn;
	ret.getInnerValue   = getInnerValue;
	ret.home            = home;
	ret.toString        = toString;
	ret.constructor     = constructor;
	ret.setMetadata		= valueObject.setMeta.bind(valueObject);
	ret.getMetadata		= valueObject.getMeta.bind(valueObject);

	return ret;

};

},{"../../parallelJoinPoint":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/parallelJoinPoint.js","../../serialJoinPoint":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/serialJoinPoint.js","../SwarmDebug":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/SwarmDebug.js","swarmutils":"swarmutils"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/utilityFunctions/callflow.js":[function(require,module,exports){
exports.createForObject = function(valueObject, thisObject, localId){
	var ret = require("./base").createForObject(valueObject, thisObject, localId);

	ret.swarm           = null;
	ret.onReturn        = null;
	ret.onResult        = null;
	ret.asyncReturn     = null;
	ret.return          = null;
	ret.home            = null;

	return ret;
};
},{"./base":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/utilityFunctions/base.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/utilityFunctions/swarm.js":[function(require,module,exports){
exports.createForObject = function(valueObject, thisObject, localId){
	return require("./base").createForObject(valueObject, thisObject, localId);
};
},{"./base":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/utilityFunctions/base.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/loadLibrary.js":[function(require,module,exports){
/*
Initial License: (c) Axiologic Research & Alboaie Sînică.
Contributors: Axiologic Research , PrivateSky project
Code License: LGPL or MIT.
*/

//var fs = require("fs");
//var path = require("path");


function SwarmLibrary(prefixName, folder){
    var self = this;
    function wrapCall(original, prefixName){
        return function(...args){
            //console.log("prefixName", prefixName)
            var previousPrefix = $$.libraryPrefix;
            var previousLibrary = $$.__global.currentLibrary;

            $$.libraryPrefix = prefixName;
            $$.__global.currentLibrary = self;
            try{
                var ret = original.apply(this, args);
                $$.libraryPrefix = previousPrefix ;
                $$.__global.currentLibrary = previousLibrary;
            }catch(err){
                $$.libraryPrefix = previousPrefix ;
                $$.__global.currentLibrary = previousLibrary;
                throw err;
            }
            return ret;
        }
    }

    $$.libraries[prefixName] = this;
    var prefixedRequire = wrapCall(function(path){
        return require(path);
    }, prefixName);

    function includeAllInRoot(folder) {
        if(typeof folder != "string"){
            //we assume that it is a library module properly required with require and containing $$.library
            for(var v in folder){
                $$.registerSwarmDescription(prefixName,v, prefixName + "." + v,  folder[v]);
            }

            var newNames = $$.__global.requireLibrariesNames[prefixName];
            for(var v in newNames){
                self[v] =  newNames[v];
            }
            return folder;
        }


        var res = prefixedRequire(folder); // a library is just a module
        if(typeof res.__autogenerated_privatesky_libraryName != "undefined"){
            var swarms = $$.__global.requireLibrariesNames[res.__autogenerated_privatesky_libraryName];
        } else {
            var swarms = $$.__global.requireLibrariesNames[folder];
        }
            var existingName;
            for(var v in swarms){
                existingName = swarms[v];
                self[v] = existingName;
                $$.registerSwarmDescription(prefixName,v, prefixName + "." + v,  existingName);
            }
        return res;
    }

    function wrapSwarmRelatedFunctions(space, prefixName){
        var ret = {};
        var names = ["create", "describe", "start", "restart"];
        for(var i = 0; i<names.length; i++ ){
            ret[names[i]] = wrapCall(space[names[i]], prefixName);
        }
        return ret;
    }

    this.callflows        = this.callflow   = wrapSwarmRelatedFunctions($$.callflows, prefixName);
    this.swarms           = this.swarm      = wrapSwarmRelatedFunctions($$.swarms, prefixName);
    this.contracts        = this.contract   = wrapSwarmRelatedFunctions($$.contracts, prefixName);
    includeAllInRoot(folder, prefixName);
}

exports.loadLibrary = function(prefixName, folder){
    var existing = $$.libraries[prefixName];
    if(existing ){
        if(!(existing instanceof SwarmLibrary)){
            var sL = new SwarmLibrary(prefixName, folder);
            for(var prop in existing){
                sL[prop] = existing[prop];
            }
            return sL;
        }
        if(folder) {
            $$.errorHandler.warning("Reusing already loaded library " + prefixName + "could be an error!");
        }
        return existing;
    }
    //var absolutePath = path.resolve(folder);
    return new SwarmLibrary(prefixName, folder);
}


},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/overwriteRequire.js":[function(require,module,exports){
(function (global){
/*
 require and $$.require are overwriting the node.js defaults in loading modules for increasing security,speed and making it work to the privatesky runtime build with browserify.
 The privatesky code for domains should work in node and browsers.
 */


if (typeof(window) !== "undefined") {
    global = window;
}


if (typeof(global.$$) == "undefined") {
    global.$$ = {};
    $$.__global = {};
}

if (typeof($$.__global) == "undefined") {
    $$.__global = {};
}

if (typeof($$.__global.requireLibrariesNames) == "undefined") {
    $$.__global.currentLibraryName = null;
    $$.__global.requireLibrariesNames = {};
}


if (typeof($$.__runtimeModules) == "undefined") {
    $$.__runtimeModules = {};
}


if (typeof(global.functionUndefined) == "undefined") {
    global.functionUndefined = function () {
        console.log("Called of an undefined function!!!!");
        throw new Error("Called of an undefined function");
    };
    if (typeof(global.webshimsRequire) == "undefined") {
        global.webshimsRequire = global.functionUndefined;
    }

    if (typeof(global.domainRequire) == "undefined") {
        global.domainRequire = global.functionUndefined;
    }

    if (typeof(global.pskruntimeRequire) == "undefined") {
        global.pskruntimeRequire = global.functionUndefined;
    }
}

if (typeof($$.log) == "undefined") {
    $$.log = function (...args) {
        console.log(args.join(" "));
    }
}


const weAreInbrowser = (typeof ($$.browserRuntime) != "undefined");
const weAreInSandbox = (typeof global.require !== 'undefined');


const pastRequests = {};

function preventRecursiveRequire(request) {
    if (pastRequests[request]) {
        const err = new Error("Preventing recursive require for " + request);
        err.type = "PSKIgnorableError";
        throw err;
    }

}

function disableRequire(request) {
    pastRequests[request] = true;
}

function enableRequire(request) {
    pastRequests[request] = false;
}


function requireFromCache(request) {
    const existingModule = $$.__runtimeModules[request];
    return existingModule;
}

function wrapStep(callbackName) {
    const callback = global[callbackName];

    if (callback === undefined) {
        return null;
    }

    if (callback === global.functionUndefined) {
        return null;
    }

    return function (request) {
        const result = callback(request);
        $$.__runtimeModules[request] = result;
        return result;
    }
}

function tryRequireSequence(originalRequire, request) {
    let arr;
    if (originalRequire) {
        arr = $$.__requireFunctionsChain.slice();
        arr.push(originalRequire);
    } else {
        arr = $$.__requireFunctionsChain;
    }

    preventRecursiveRequire(request);
    disableRequire(request);
    let result;
    const previousRequire = $$.__global.currentLibraryName;
    let previousRequireChanged = false;

    if (!previousRequire) {
        // console.log("Loading library for require", request);
        $$.__global.currentLibraryName = request;

        if (typeof $$.__global.requireLibrariesNames[request] == "undefined") {
            $$.__global.requireLibrariesNames[request] = {};
            //$$.__global.requireLibrariesDescriptions[request]   = {};
        }
        previousRequireChanged = true;
    }
    for (let i = 0; i < arr.length; i++) {
        const func = arr[i];
        try {

            if (func === global.functionUndefined) continue;
            result = func(request);

            if (result) {
                break;
            }

        } catch (err) {
            if (err.type !== "PSKIgnorableError") {
                $$.log("Require encountered an error while loading ", request, "\nCause:\n", err.stack);
            }
        }
    }

    if (!result) {
        $$.log("Failed to load module ", request, result);
    }

    enableRequire(request);
    if (previousRequireChanged) {
        //console.log("End loading library for require", request, $$.__global.requireLibrariesNames[request]);
        $$.__global.currentLibraryName = null;
    }
    return result;
}

if (typeof($$.require) == "undefined") {

    $$.__requireList = ["webshimsRequire", "pskruntimeRequire"];
    $$.__requireFunctionsChain = [];

    $$.requireBundle = function (name) {
        name += "Require";
        $$.__requireList.push(name);
        const arr = [requireFromCache];
        $$.__requireList.forEach(function (item) {
            const callback = wrapStep(item);
            if (callback) {
                arr.push(callback);
            }
        });

        $$.__requireFunctionsChain = arr;
    };

    $$.requireBundle("init");

    if (weAreInbrowser) {
        $$.log("Defining global require in browser");


        global.require = function (request) {

            ///*[requireFromCache, wrapStep(webshimsRequire), , wrapStep(pskruntimeRequire), wrapStep(domainRequire)*]
            return tryRequireSequence(null, request);
        }
    } else
        if (weAreInSandbox) {
        // require should be provided when code is loaded in browserify
        const bundleRequire = require;

        $$.requireBundle('sandboxBase');
        // this should be set up by sandbox prior to
        const sandboxRequire = global.require;
        global.crypto = require('crypto');

        function newLoader(request) {
            // console.log("newLoader:", request);
            //preventRecursiveRequire(request);
            const self = this;

            // console.log('trying to load ', request);

            function tryBundleRequire(...args) {
                //return $$.__originalRequire.apply(self,args);
                //return Module._load.apply(self,args)
                let res;
                try {
                    res = sandboxRequire.apply(self, args);
                } catch (err) {
                    if (err.code === "MODULE_NOT_FOUND") {
                        const p = path.join(process.cwd(), request);
                        res = sandboxRequire.apply(self, [p]);
                        request = p;
                    } else {
                        throw err;
                    }
                }
                return res;
            }

            let res;


            res = tryRequireSequence(tryBundleRequire, request);


            return res;
        }

        global.require = newLoader;

    } else {  //we are in node
        const path = require("path");
        $$.__runtimeModules["crypto"] = require("crypto");
        $$.__runtimeModules["util"] = require("util");

        const Module = require('module');
        $$.__runtimeModules["module"] = Module;

        $$.log("Redefining require for node");

        $$.__originalRequire = Module._load;
        const moduleOriginalRequire = Module.prototype.require;

        function newLoader(request) {
            // console.log("newLoader:", request);
            //preventRecursiveRequire(request);
            const self = this;

            function originalRequire(...args) {
                //return $$.__originalRequire.apply(self,args);
                //return Module._load.apply(self,args)
                let res;
                try {
                    res = moduleOriginalRequire.apply(self, args);
                } catch (err) {
                    if (err.code === "MODULE_NOT_FOUND") {
                        const p = path.join(process.cwd(), request);
                        res = moduleOriginalRequire.apply(self, [p]);
                        request = p;
                    } else {
                        throw err;
                    }
                }
                return res;
            }

            function currentFolderRequire(request) {
                return
            }

            //[requireFromCache, wrapStep(pskruntimeRequire), wrapStep(domainRequire), originalRequire]
            return tryRequireSequence(originalRequire, request);
        }

        Module.prototype.require = newLoader;
    }

    $$.require = require;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"crypto":"crypto","module":false,"path":"path","util":"util"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/parallelJoinPoint.js":[function(require,module,exports){

var joinCounter = 0;

function ParallelJoinPoint(swarm, callback, args){
    joinCounter++;
    var channelId = "ParallelJoinPoint" + joinCounter;
    var self = this;
    var counter = 0;
    var stopOtherExecution     = false;

    function executionStep(stepFunc, localArgs, stop){

        this.doExecute = function(){
            if(stopOtherExecution){
                return false;
            }
            try{
                stepFunc.apply(swarm, localArgs);
                if(stop){
                    stopOtherExecution = true;
                    return false;
                }
                return true; //everyting is fine
            } catch(err){
                args.unshift(err);
                sendForSoundExecution(callback, args, true);
                return false; //stop it, do not call again anything
            }
        }
    }

    if(typeof callback !== "function"){
        $$.errorHandler.syntaxError("invalid join",swarm, "invalid function at join in swarm");
        return;
    }

    $$.PSK_PubSub.subscribe(channelId,function(forExecution){
        if(stopOtherExecution){
            return ;
        }

        try{
            if(forExecution.doExecute()){
                decCounter();
            } // had an error...
        } catch(err){
            //console.log(err);
            //$$.errorHandler.syntaxError("__internal__",swarm, "exception in the execution of the join function of a parallel task");
        }
    });

    function incCounter(){
        if(testIfUnderInspection()){
            //preventing inspector from increasing counter when reading the values for debug reason
            //console.log("preventing inspection");
            return;
        }
        counter++;
    }

    function testIfUnderInspection(){
        var res = false;
        var constArgv = process.execArgv.join();
        if(constArgv.indexOf("inspect")!==-1 || constArgv.indexOf("debug")!==-1){
            //only when running in debug
            var callstack = new Error().stack;
            if(callstack.indexOf("DebugCommandProcessor")!==-1){
                console.log("DebugCommandProcessor detected!");
                res = true;
            }
        }
        return res;
    }

    function sendForSoundExecution(funct, args, stop){
        var obj = new executionStep(funct, args, stop);
        $$.PSK_PubSub.publish(channelId, obj); // force execution to be "sound"
    }

    function decCounter(){
        counter--;
        if(counter == 0) {
            args.unshift(null);
            sendForSoundExecution(callback, args, false);
        }
    }

    var inner = swarm.getInnerValue();

    function defaultProgressReport(err, res){
        if(err) {
            throw err;
        }
        return {
            text:"Parallel execution progress event",
            swarm:swarm,
            args:args,
            currentResult:res
        };
    }

    function mkFunction(name){
        return function(...args){
            var f = defaultProgressReport;
            if(name != "progress"){
                f = inner.myFunctions[name];
            }
            var args = $$.__intern.mkArgs(args, 0);
            sendForSoundExecution(f, args, false);
            return __proxyObject;
        }
    }


    this.get = function(target, prop, receiver){
        if(inner.myFunctions.hasOwnProperty(prop) || prop == "progress"){
            incCounter();
            return mkFunction(prop);
        }
        return swarm[prop];
    };

    var __proxyObject;

    this.__setProxyObject = function(p){
        __proxyObject = p;
    }
}

exports.createJoinPoint = function(swarm, callback, args){
    var jp = new ParallelJoinPoint(swarm, callback, args);
    var inner = swarm.getInnerValue();
    var p = new Proxy(inner, jp);
    jp.__setProxyObject(p);
    return p;
};
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/serialJoinPoint.js":[function(require,module,exports){

var joinCounter = 0;

function SerialJoinPoint(swarm, callback, args){

    joinCounter++;

    var self = this;
    var channelId = "SerialJoinPoint" + joinCounter;

    if(typeof callback !== "function"){
        $$.errorHandler.syntaxError("unknown", swarm, "invalid function given to serial in swarm");
        return;
    }

    var inner = swarm.getInnerValue();


    function defaultProgressReport(err, res){
        if(err) {
            throw err;
        }
        return res;
    }


    var functionCounter     = 0;
    var executionCounter    = 0;

    var plannedExecutions   = [];
    var plannedArguments    = {};

    function mkFunction(name, pos){
        //console.log("Creating function ", name, pos);
        plannedArguments[pos] = undefined;

        function triggetNextStep(){
            if(plannedExecutions.length == executionCounter || plannedArguments[executionCounter] )  {
                $$.PSK_PubSub.publish(channelId, self);
            }
        }

        var f = function (...args){
            if(executionCounter != pos) {
                plannedArguments[pos] = args;
                //console.log("Delaying function:", executionCounter, pos, plannedArguments, arguments, functionCounter);
                return __proxy;
            } else{
                if(plannedArguments[pos]){
                    //console.log("Executing  function:", executionCounter, pos, plannedArguments, arguments, functionCounter);
					args = plannedArguments[pos];
                } else {
                    plannedArguments[pos] = args;
                    triggetNextStep();
                    return __proxy;
                }
            }

            var f = defaultProgressReport;
            if(name != "progress"){
                f = inner.myFunctions[name];
            }


            try{
                f.apply(self,args);
            } catch(err){
                    args.unshift(err);
                    callback.apply(swarm,args); //error
                    $$.PSK_PubSub.unsubscribe(channelId,runNextFunction);
                return; //terminate execution with an error...!
            }
            executionCounter++;

            triggetNextStep();

            return __proxy;
        };

        plannedExecutions.push(f);
        functionCounter++;
        return f;
    }

     var finished = false;

    function runNextFunction(){
        if(executionCounter == plannedExecutions.length ){
            if(!finished){
                args.unshift(null);
                callback.apply(swarm,args);
                finished = true;
                $$.PSK_PubSub.unsubscribe(channelId,runNextFunction);
            } else {
                console.log("serial construct is using functions that are called multiple times...");
            }
        } else {
            plannedExecutions[executionCounter]();
        }
    }

    $$.PSK_PubSub.subscribe(channelId,runNextFunction); // force it to be "sound"


    this.get = function(target, prop, receiver){
        if(prop == "progress" || inner.myFunctions.hasOwnProperty(prop)){
            return mkFunction(prop, functionCounter);
        }
        return swarm[prop];
    }

    var __proxy;
    this.setProxyObject = function(p){
        __proxy = p;
    }
}

exports.createSerialJoinPoint = function(swarm, callback, args){
    var jp = new SerialJoinPoint(swarm, callback, args);
    var inner = swarm.getInnerValue();
    var p = new Proxy(inner, jp);
    jp.setProxyObject(p);
    return p;
}
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/swarmDescription.js":[function(require,module,exports){
const OwM = require("swarmutils").OwM;

var swarmDescriptionsRegistry = {};


$$.registerSwarmDescription =  function(libraryName, shortName, swarmTypeName, description){
    if(!$$.libraries[libraryName]){
        $$.libraries[libraryName] = {};
    }

    if(!$$.__global.requireLibrariesNames[libraryName]){
        $$.__global.requireLibrariesNames[libraryName] = {};
    }

    $$.libraries[libraryName][shortName] = description;
    //console.log("Registering ", libraryName,shortName, $$.__global.currentLibraryName);
    if($$.__global.currentLibraryName){
        $$.__global.requireLibrariesNames[$$.__global.currentLibraryName][shortName] = libraryName + "." + shortName;
    }

    $$.__global.requireLibrariesNames[libraryName][shortName] = swarmTypeName;

    if(typeof description == "string"){
        description = swarmDescriptionsRegistry[description];
    }
    swarmDescriptionsRegistry[swarmTypeName] = description;
}


var currentLibraryCounter = 0;
$$.library = function(callback){
    currentLibraryCounter++;
    var previousCurrentLibrary = $$.__global.currentLibraryName;
    var libraryName = "___privatesky_library"+currentLibraryCounter;
    var ret = $$.__global.requireLibrariesNames[libraryName] = {};
    $$.__global.currentLibraryName = libraryName;
    callback();
    $$.__global.currentLibraryName = previousCurrentLibrary;
    ret.__autogenerated_privatesky_libraryName = libraryName;
    return ret;
}

function SwarmSpace(swarmType, utils) {

    var beesHealer = require("swarmutils").beesHealer;

    function getFullName(shortName){
        var fullName;
        if(shortName && shortName.includes(".")) {
            fullName = shortName;
        } else {
            fullName = $$.libraryPrefix + "." + shortName;
        }
        return fullName;
    }

    function VarDescription(desc){
        return {
            init:function(){
                return undefined;
            },
            restore:function(jsonString){
                return JSON.parse(jsonString);
            },
            toJsonString:function(x){
                return JSON.stringify();
            }
        };
    }

    function SwarmDescription(swarmTypeName, description){

        swarmTypeName = getFullName(swarmTypeName);

        var localId = 0;  // unique for each swarm

        function createVars(descr){
            var members = {};
            for(var v in descr){
                members[v] = new VarDescription(descr[v]);
            }
            return members;
        }

        function createMembers(descr){
            var members = {};
            for(var v in description){

                if(v != "public" && v != "private"){
                    members[v] = description[v];
                }
            }
            return members;
        }

        var publicVars = createVars(description.public);
        var privateVars = createVars(description.private);
        var myFunctions = createMembers(description);

        function createPhase(thisInstance, func, phaseName){
            var keyBefore = `${swarmTypeName}/${phaseName}/${$$.CONSTANTS.BEFORE_INTERCEPTOR}`;
            var keyAfter = `${swarmTypeName}/${phaseName}/${$$.CONSTANTS.AFTER_INTERCEPTOR}`;

            var phase = function(...args){
                var ret;
                try{
                    $$.PSK_PubSub.blockCallBacks();
                    thisInstance.setMetadata('phaseName', phaseName);
                    $$.interceptor.callInterceptors(keyBefore, thisInstance, args);
                    ret = func.apply(thisInstance, args);
                    $$.interceptor.callInterceptors(keyAfter, thisInstance, args);
                    $$.PSK_PubSub.releaseCallBacks();
                }catch(err){
                    $$.PSK_PubSub.releaseCallBacks();
                    throw err;
                }
                return ret;
            }
            //dynamic named func in order to improve callstack
            Object.defineProperty(phase, "name", {get: function(){return swarmTypeName+"."+func.name}});
            return phase;
        }

        this.initialise = function(serialisedValues){

            var result = new OwM({
                publicVars:{

                },
                privateVars:{

                },
                protectedVars:{

                },
                myFunctions:{

                },
                utilityFunctions:{

                },
                meta:{
                    swarmTypeName:swarmTypeName,
                    swarmDescription:description
                }
            });


            for(var v in publicVars){
                result.publicVars[v] = publicVars[v].init();
            };

            for(var v in privateVars){
                result.privateVars[v] = privateVars[v].init();
            };


            if(serialisedValues){
                beesHealer.jsonToNative(serialisedValues, result);
            }
            return result;
        };

        this.initialiseFunctions = function(valueObject, thisObject){

            for(var v in myFunctions){
                valueObject.myFunctions[v] = createPhase(thisObject, myFunctions[v], v);
            };

            localId++;
            valueObject.utilityFunctions = utils.createForObject(valueObject, thisObject, localId);

        }

        this.get = function(target, property, receiver){


            if(publicVars.hasOwnProperty(property))
            {
                return target.publicVars[property];
            }

            if(privateVars.hasOwnProperty(property))
            {
                return target.privateVars[property];
            }

            if(target.utilityFunctions.hasOwnProperty(property))
            {

                return target.utilityFunctions[property];
            }


            if(myFunctions.hasOwnProperty(property))
            {
                return target.myFunctions[property];
            }

            if(target.protectedVars.hasOwnProperty(property))
            {
                return target.protectedVars[property];
            }

            if(typeof property != "symbol") {
                $$.errorHandler.syntaxError(property, target);
            }
            return undefined;
        }

        this.set = function(target, property, value, receiver){

            if(target.utilityFunctions.hasOwnProperty(property) || target.myFunctions.hasOwnProperty(property)) {
                $$.errorHandler.syntaxError(property);
                throw new Error("Trying to overwrite immutable member" + property);
            }

            if(privateVars.hasOwnProperty(property))
            {
                target.privateVars[property] = value;
            } else
            if(publicVars.hasOwnProperty(property))
            {
                target.publicVars[property] = value;
            } else {
                target.protectedVars[property] = value;
            }
            return true;
        }

        this.apply = function(target, thisArg, argumentsList){
            console.log("Proxy apply");
            //var func = target[]
            //swarmGlobals.executionProvider.execute(null, thisArg, func, argumentsList)
        }

        var self = this;

        this.isExtensible = function(target) {
            return false;
        };

        this.has = function(target, prop) {
            if(target.publicVars[prop] || target.protectedVars[prop]) {
                return true;
            }
            return false;
        };

        this.ownKeys = function(target) {
            return Reflect.ownKeys(target.publicVars);
        };

        return function(serialisedValues){
            var valueObject = self.initialise(serialisedValues);
            var result = new Proxy(valueObject,self);
            self.initialiseFunctions(valueObject,result);
			if(!serialisedValues){
				if(!valueObject.getMeta("swarmId")){
					valueObject.setMeta("swarmId", $$.uidGenerator.safe_uuid());  //do not overwrite!!!
				}
				valueObject.utilityFunctions.notify();
			}
			return result;
        }
    }



    this.describe = function describeSwarm(swarmTypeName, description){
        swarmTypeName = getFullName(swarmTypeName);

        var pointPos = swarmTypeName.lastIndexOf('.');
        var shortName = swarmTypeName.substr( pointPos+ 1);
        var libraryName = swarmTypeName.substr(0, pointPos);
        if(!libraryName){
            libraryName = "global";
        }

        var description = new SwarmDescription(swarmTypeName, description);
        if(swarmDescriptionsRegistry[swarmTypeName] != undefined){
            $$.errorHandler.warning("Duplicate swarm description "+ swarmTypeName);
        }

        //swarmDescriptionsRegistry[swarmTypeName] = description;
		$$.registerSwarmDescription(libraryName, shortName, swarmTypeName, description);

        return description;
    }

    this.create = function(){
        $$.error("create function is obsolete. use describe!");
    }
    /* // confusing variant
    this.create = function createSwarm(swarmTypeName, description, initialValues){
        swarmTypeName = getFullName(swarmTypeName);
        try{
            if(undefined == description){
                return swarmDescriptionsRegistry[swarmTypeName](initialValues);
            } else {
                return this.describe(swarmTypeName, description)(initialValues);
            }
        } catch(err){
            console.log("CreateSwarm error", err);
            $$.errorHandler.error(err, arguments, "Wrong name or descriptions");
        }
    }*/

    this.continue = function(swarmTypeName, initialValues){
        swarmTypeName = getFullName(swarmTypeName);
        var desc = swarmDescriptionsRegistry[swarmTypeName];

        if(desc){
            return desc(initialValues);
        } else {
            $$.errorHandler.syntaxError(swarmTypeName,initialValues,
                "Failed to restart a swarm with type " + swarmTypeName + "\n Maybe different swarm space (used flow instead of swarm!?)");
        }
    }

    this.start = function(swarmTypeName, ctor, ...params){
        swarmTypeName = getFullName(swarmTypeName);
        var desc = swarmDescriptionsRegistry[swarmTypeName];
        if(!desc){
            $$.errorHandler.syntaxError(null, swarmTypeName);
            return null;
        }
        var res = desc();
        res.setMetadata("homeSecurityContext", $$.securityContext);

        if(ctor){
            res[ctor].apply(res, params);
        }

        return res;
    }
}

exports.createSwarmEngine = function(swarmType, utils){
    if(typeof utils == "undefined"){
        utils = require("./choreographies/utilityFunctions/callflow");
    }
    return new SwarmSpace(swarmType, utils);
};

},{"./choreographies/utilityFunctions/callflow":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/utilityFunctions/callflow.js","swarmutils":"swarmutils"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/double-check/lib/standardAsserts.js":[function(require,module,exports){

module.exports.init = function(sf, logger){
    /**
     * Registering handler for failed asserts. The handler is doing logging and is throwing an error.
     * @param explanation {String} - failing reason message.
     */
    sf.exceptions.register('assertFail', function(explanation){
        const message = "Assert or invariant has failed " + (explanation ? explanation : "");
        const err = new Error(message);
        logger.recordAssert('[Fail] ' + message, err, true);
        throw err;
    });

    /**
     * Registering assert for equality. If check fails, the assertFail is invoked.
     * @param v1 {String|Number|Object} - first value
     * @param v1 {String|Number|Object} - second value
     * @param explanation {String} - failing reason message in case the assert fails.
     */
    sf.assert.addCheck('equal', function(v1 , v2, explanation){
        if(v1 !== v2){
            if(!explanation){
                explanation =  "Assertion failed: [" + v1 + " !== " + v2 + "]";
            }
            sf.exceptions.assertFail(explanation);
        }
    });

    /**
     * Registering assert for inequality. If check fails, the assertFail is invoked.
     * @param v1 {String|Number|Object} - first value
     * @param v1 {String|Number|Object} - second value
     * @param explanation {String} - failing reason message in case the assert fails
     */
    sf.assert.addCheck('notEqual', function(v1, v2, explanation){
        if(v1 === v2){
            if(!explanation){
                explanation =  " ["+ v1 + " == " + v2 + "]";
            }
            sf.exceptions.assertFail(explanation);
        }
    });

    /**
     * Registering assert for evaluating an expression to true. If check fails, the assertFail is invoked.
     * @param b {Boolean} - result of an expression
     * @param explanation {String} - failing reason message in case the assert fails
     */
    sf.assert.addCheck('true', function(b, explanation){
        if(!b){
            if(!explanation){
                explanation =  " expression is false but is expected to be true";
            }
            sf.exceptions.assertFail(explanation);
        }
    });

    /**
     * Registering assert for evaluating an expression to false. If check fails, the assertFail is invoked.
     * @param b {Boolean} - result of an expression
     * @param explanation {String} - failing reason message in case the assert fails
     */
    sf.assert.addCheck('false', function(b, explanation){
        if(b){
            if(!explanation){
                explanation =  " expression is true but is expected to be false";
            }
            sf.exceptions.assertFail(explanation);
        }
    });

    /**
     * Registering assert for evaluating a value to null. If check fails, the assertFail is invoked.
     * @param b {Boolean} - result of an expression
     * @param explanation {String} - failing reason message in case the assert fails
     */
    sf.assert.addCheck('isNull', function(v1, explanation){
        if(v1 !== null){
            sf.exceptions.assertFail(explanation);
        }
    });

    /**
     * Registering assert for evaluating a value to be not null. If check fails, the assertFail is invoked.
     * @param b {Boolean} - result of an expression
     * @param explanation {String} - failing reason message in case the assert fails
     */
    sf.assert.addCheck('notNull', function(v1 , explanation){
        if(v1 === null && typeof v1 === "object"){
            sf.exceptions.assertFail(explanation);
        }
    });

    /**
     * Checks if all properties of the second object are own properties of the first object.
     * @param firstObj {Object} - first object
     * @param secondObj{Object} - second object
     * @returns {boolean} - returns true, if the check has passed or false otherwise.
     */
    function objectHasFields(firstObj, secondObj){
        for(let field in secondObj) {
            if (firstObj.hasOwnProperty(field)) {
                if (firstObj[field] !== secondObj[field]) {
                    return false;
                }
            }
            else{
                return false;
            }
        }
        return true;
    }

    function objectsAreEqual(firstObj, secondObj) {
        let areEqual = true;
        if(firstObj !== secondObj) {
            if(typeof firstObj !== typeof secondObj) {
                areEqual = false;
            } else if (Array.isArray(firstObj) && Array.isArray(secondObj)) {
	            firstObj.sort();
	            secondObj.sort();
		        if (firstObj.length !== secondObj.length) {
			        areEqual = false;
		        } else {
			        for (let i = 0; i < firstObj.length; ++i) {
				        if (!objectsAreEqual(firstObj[i], secondObj[i])) {
					        areEqual = false;
					        break;
				        }
			        }
		        }
	        } else if((typeof firstObj === 'function' && typeof secondObj === 'function') ||
		        (firstObj instanceof Date && secondObj instanceof Date) ||
		        (firstObj instanceof RegExp && secondObj instanceof RegExp) ||
		        (firstObj instanceof String && secondObj instanceof String) ||
		        (firstObj instanceof Number && secondObj instanceof Number)) {
                    areEqual = firstObj.toString() === secondObj.toString();
            } else if(typeof firstObj === 'object' && typeof secondObj === 'object') {
                areEqual = objectHasFields(firstObj, secondObj);
            // isNaN(undefined) returns true
            } else if(isNaN(firstObj) && isNaN(secondObj) && typeof firstObj === 'number' && typeof secondObj === 'number') {
                areEqual = true;
            } else {
                areEqual = false;
            }
        }

        return areEqual;
    }

    /**
     * Registering assert for evaluating if all properties of the second object are own properties of the first object.
     * If check fails, the assertFail is invoked.
     * @param firstObj {Object} - first object
     * @param secondObj{Object} - second object
     * @param explanation {String} - failing reason message in case the assert fails
     */
    sf.assert.addCheck("objectHasFields", function(firstObj, secondObj, explanation){
        if(!objectHasFields(firstObj, secondObj)) {
            sf.exceptions.assertFail(explanation);
        }
    });

    /**
     * Registering assert for evaluating if all element from the second array are present in the first array.
     * Deep comparison between the elements of the array is used.
     * If check fails, the assertFail is invoked.
     * @param firstArray {Array}- first array
     * @param secondArray {Array} - second array
     * @param explanation {String} - failing reason message in case the assert fails
     */
    sf.assert.addCheck("arraysMatch", function(firstArray, secondArray, explanation){
        if(firstArray.length !== secondArray.length){
            sf.exceptions.assertFail(explanation);
        }
        else {
            const result = objectsAreEqual(firstArray, secondArray);
            // const arraysDontMatch = secondArray.every(element => firstArray.indexOf(element) !== -1);
            // let arraysDontMatch = secondArray.some(function (expectedElement) {
            //     let found = firstArray.some(function(resultElement){
            //         return objectHasFields(resultElement,expectedElement);
            //     });
            //     return found === false;
            // });

            if(!result){
                sf.exceptions.assertFail(explanation);
            }
        }
    });

    // added mainly for test purposes, better test frameworks like mocha could be much better

    /**
     * Registering assert for checking if a function is failing.
     * If the function is throwing an exception, the test is passed or failed otherwise.
     * @param testName {String} - test name or description
     * @param func {Function} - function to be invoked
     */
    sf.assert.addCheck('fail', function(testName, func){
        try{
            func();
            logger.recordAssert("[Fail] " + testName);
        } catch(err){
            logger.recordAssert("[Pass] " + testName);
        }
    });

    /**
     * Registering assert for checking if a function is executed with no exceptions.
     * If the function is not throwing any exception, the test is passed or failed otherwise.
     * @param testName {String} - test name or description
     * @param func {Function} - function to be invoked
     */
    sf.assert.addCheck('pass', function(testName, func){
        try{
            func();
            logger.recordAssert("[Pass] " + testName);
        } catch(err){
            logger.recordAssert("[Fail] " + testName, err.stack);
        }
    });

    /**
     * Alias for the pass assert.
     */
    sf.assert.alias('test', 'pass');

    /**
     * Registering assert for checking if a callback function is executed before timeout is reached without any exceptions.
     * If the function is throwing any exception or the timeout is reached, the test is failed or passed otherwise.
     * @param testName {String} - test name or description
     * @param func {Function} - function to be invoked
     * @param timeout {Number} - number of milliseconds for the timeout check. Default to 500ms.
     */
    sf.assert.addCheck('callback', function(testName, func, timeout){

        if(!func || typeof func != "function"){
            throw new Error("Wrong usage of assert.callback!");
        }

        if(!timeout){
            timeout = 500;
        }

        var passed = false;
        function callback(){
            if(!passed){
                passed = true;
                logger.recordAssert("[Pass] " + testName);
                successTest();
            } else {
                logger.recordAssert("[Fail (multiple calls)] " + testName);
            }
        }
        
        try{
            func(callback);
        } catch(err){
            logger.recordAssert("[Fail] " + testName,  err, true);
        }

        function successTest(force){
            if(!passed){
                logger.recordAssert("[Fail Timeout] " + testName );
            }
        }

        setTimeout(successTest, timeout);
    });

    /**
     * Registering assert for checking if an array of callback functions are executed in a waterfall manner,
     * before timeout is reached without any exceptions.
     * If any of the functions is throwing any exception or the timeout is reached, the test is failed or passed otherwise.
     * @param testName {String} - test name or description
     * @param func {Function} - function to be invoked
     * @param timeout {Number} - number of milliseconds for the timeout check. Default to 500ms.
     */
    sf.assert.addCheck('steps', function(testName, arr, timeout){
        if(!timeout){
            timeout = 500;
        }

        var currentStep = 0;
        var passed = false;

        function next(){
            if(currentStep === arr.length){
                passed = true;
                logger.recordAssert("[Pass] " + testName );
                return;
            }

            var func = arr[currentStep];
            currentStep++;
            try{
                func(next);
            } catch(err){
                logger.recordAssert("[Fail] " + testName  + " [at step " + currentStep + "]", err);
            }
        }

        function successTest(force){
            if(!passed){
                logger.recordAssert("[Fail Timeout] " + testName  + " [at step " + currentStep + "]");
            }
        }

        setTimeout(successTest, timeout);
        next();
    });

    /**
     * Alias for the steps assert.
     */
    sf.assert.alias('waterfall', 'steps');

    /**
     * Registering assert for asynchronously printing all execution summary from logger.dumpWhys.
     * @param message {String} - message to be recorded
     * @param timeout {Number} - number of milliseconds for the timeout check. Default to 500ms.
     */
    sf.assert.addCheck('end', function(timeout, silence){
        if(!timeout){
            timeout = 1000;
        }

        function handler() {
            logger.dumpWhys().forEach(function(c){
                const executionSummary = c.getExecutionSummary();
                console.log(JSON.stringify(executionSummary, null, 4));
            });

            if(!silence){
                console.log("Forcing exit after", timeout, "ms");
            }
            process.exit(0);
        }

        setTimeout(handler, timeout);
    });

    /**
     * Registering assert for printing a message and asynchronously printing all logs from logger.dumpWhys.
     * @param message {String} - message to be recorded
     * @param timeout {Number} - number of milliseconds for the timeout check. Default to 500ms.
     */
    sf.assert.addCheck('begin', function(message, timeout){
        logger.recordAssert(message);
        sf.assert.end(timeout, true);
    });
};
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/double-check/lib/standardChecks.js":[function(require,module,exports){
/*
    checks are like asserts but are intended to be used in production code to help debugging and signaling wrong behaviours

 */

exports.init = function(sf){
    sf.exceptions.register('checkFail', function(explanation, err){
        var stack;
        if(err){
            stack = err.stack;
        }
        console.log("Check failed ", explanation, stack);
    });

    sf.check.addCheck('equal', function(v1 , v2, explanation){

        if(v1 !== v2){
            if(!explanation){
                explanation =  " ["+ v1 + " != " + v2 + "]";
            }

            sf.exceptions.checkFail(explanation);
        }
    });


    sf.check.addCheck('true', function(b, explanation){
        if(!b){
            if(!explanation){
                explanation =  " expression is false but is expected to be true";
            }

            sf.exceptions.checkFail(explanation);
        }
    });


    sf.check.addCheck('false', function(b, explanation){
        if(b){
            if(!explanation){
                explanation =  " expression is true but is expected to be false";
            }

            sf.exceptions.checkFail(explanation);
        }
    });

    sf.check.addCheck('notequal', function(v1 , v2, explanation){
        if(v1 == v2){
            if(!explanation){
                explanation =  " ["+ v1 + " == " + v2 + "]";
            }
            sf.exceptions.checkFail(explanation);
        }
    });


    /*
        added mainly for test purposes, better test frameworks like mocha could be much better :)
    */
    sf.check.addCheck('fail', function(testName ,func){
        try{
            func();
            console.log("[Fail] " + testName );
        } catch(err){
            console.log("[Pass] " + testName );
        }
    });


    sf.check.addCheck('pass', function(testName ,func){
        try{
            func();
            console.log("[Pass] " + testName );
        } catch(err){
            console.log("[Fail] " + testName  ,  err.stack);
        }
    });


    sf.check.alias('test','pass');


    sf.check.addCheck('callback', function(testName ,func, timeout){
        if(!timeout){
            timeout = 500;
        }
        var passed = false;
        function callback(){
            if(!passed){
                passed = true;
                console.log("[Pass] " + testName );
                SuccessTest();
            } else {
                console.log("[Fail (multiple calls)] " + testName );
            }
        }
        try{
            func(callback);
        } catch(err){
            console.log("[Fail] " + testName  ,  err.stack);
        }

        function SuccessTest(force){
            if(!passed){
                console.log("[Fail Timeout] " + testName );
            }
        }

        setTimeout(SuccessTest, timeout);
    });


    sf.check.addCheck('steps', function(testName , arr, timeout){
        var  currentStep = 0;
        var passed = false;
        if(!timeout){
            timeout = 500;
        }

        function next(){
            if(currentStep === arr.length){
                passed = true;
                console.log("[Pass] " + testName );
                return ;
            }
            var func = arr[currentStep];
            currentStep++;
            try{
                func(next);
            } catch(err){
                console.log("[Fail] " + testName  ,"\n\t" , err.stack + "\n\t" , " [at step ", currentStep + "]");
            }
        }

        function SuccessTest(force){
            if(!passed){
                console.log("[Fail Timeout] " + testName + "\n\t" , " [at step ", currentStep+ "]");
            }
        }

        setTimeout(SuccessTest, timeout);
        next();
    });

    sf.check.alias('waterfall','steps');
    sf.check.alias('notEqual','notequal');

    sf.check.addCheck('end', function(timeOut, silence){
        if(!timeOut){
            timeOut = 1000;
        }

        setTimeout(function(){
            if(!silence){
                console.log("Forcing exit after", timeOut, "ms");
            }
            process.exit(0);
        }, timeOut);
    });


    sf.check.addCheck('begin', function(message, timeOut){
        console.log(message);
        sf.check.end(timeOut, true);
    });


};
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/double-check/lib/standardExceptions.js":[function(require,module,exports){
exports.init = function(sf){
    /**
     * Registering unknown exception handler.
     */
    sf.exceptions.register('unknown', function(explanation){
        explanation = explanation || "";
        const message = "Unknown exception" + explanation;
        throw(message);
    });

    /**
     * Registering resend exception handler.
     */
    sf.exceptions.register('resend', function(exceptions){
        throw(exceptions);
    });

    /**
     * Registering notImplemented exception handler.
     */
    sf.exceptions.register('notImplemented', function(explanation){
        explanation = explanation || "";
        const message = "notImplemented exception" + explanation;
        throw(message);
    });

    /**
     * Registering security exception handler.
     */
    sf.exceptions.register('security', function(explanation){
        explanation = explanation || "";
        const message = "security exception" + explanation;
        throw(message);
    });

    /**
     * Registering duplicateDependency exception handler.
     */
    sf.exceptions.register('duplicateDependency', function(variable){
        variable = variable || "";
        const message = "duplicateDependency exception" + variable;
        throw(message);
    });
};
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/double-check/lib/standardLogs.js":[function(require,module,exports){
const LOG_LEVELS = {
    HARD_ERROR:     0,  // system level critical error: hardError
    ERROR:          1,  // potentially causing user's data loosing error: error
    LOG_ERROR:      2,  // minor annoyance, recoverable error:   logError
    UX_ERROR:       3,  // user experience causing issues error:  uxError
    WARN:           4,  // warning,possible isues but somehow unclear behaviour: warn
    INFO:           5,  // store general info about the system working: info
    DEBUG:          6,  // system level debug: debug
    LOCAL_DEBUG:    7,  // local node/service debug: ldebug
    USER_DEBUG:     8,  // user level debug; udebug
    DEV_DEBUG:      9,  // development time debug: ddebug
    WHYS:            10, // whyLog for code reasoning
    TEST_RESULT:    11, // testResult to log running tests
};

exports.init = function(sf){

    /**
     * Records log messages from various use cases.
     * @param record {String} - log message.
     */
    sf.logger.record = function(record){
        var displayOnConsole = true;
        if(process.send) {
            process.send(record);
            displayOnConsole = false;
        }

        if(displayOnConsole) {
            const prettyLog = JSON.stringify(record, null, 2);
            console.log(prettyLog);
        }
    };

    /**
     * Adding case for logging system level critical errors.
     */
    sf.logger.addCase('hardError', function(message, exception, args, pos, data){
        sf.logger.record(createDebugRecord(LOG_LEVELS.HARD_ERROR, 'systemError', message, exception, true, args, pos, data));
    }, [
        {
            'message':'explanation'
        }
    ]);

    /**
     * Adding case for logging potentially causing user's data loosing errors.
     */
    sf.logger.addCase('error', function(message, exception, args, pos, data){
        sf.logger.record(createDebugRecord(LOG_LEVELS.ERROR, 'error', message, exception, true, args, pos, data));
    }, [
        {
            'message':'explanation'
        },
        {
            'exception':'exception'
        }
    ]);

    /**
     * Adding case for logging minor annoyance, recoverable errors.
     */
    sf.logger.addCase('logError', function(message, exception, args, pos, data){
        sf.logger.record(createDebugRecord(LOG_LEVELS.LOG_ERROR, 'logError', message, exception, true, args, pos, data));
    }, [
        {
            'message':'explanation'
        },
        {
            'exception':'exception'
        }
    ]);

    /**
     * Adding case for logging user experience causing issues errors.
     */
    sf.logger.addCase('uxError', function(message){
        sf.logger.record(createDebugRecord(LOG_LEVELS.UX_ERROR, 'uxError', message, null, false));
    }, [
        {
            'message':'explanation'
        }
    ]);

    /**
     * Adding case for logging throttling messages.
     */
    sf.logger.addCase('throttling', function(message){
        sf.logger.record(createDebugRecord(LOG_LEVELS.WARN, 'throttling', message, null, false));
    }, [
        {
            'message':'explanation'
        }
    ]);

    /**
     * Adding case for logging warning, possible issues, but somehow unclear behaviours.
     */
    sf.logger.addCase('warning', function(message){
        sf.logger.record(createDebugRecord(LOG_LEVELS.WARN, 'warning', message,null, false, arguments, 0));
    }, [
        {
            'message':'explanation'
        }
    ]);
    
    sf.logger.alias('warn', 'warning');

    /**
     * Adding case for logging general info about the system working.
     */
    sf.logger.addCase('info', function(message){
        sf.logger.record(createDebugRecord(LOG_LEVELS.INFO, 'info', message,null, false, arguments, 0));
    }, [
        {
            'message':'explanation'
        }
    ]);

    /**
     * Adding case for logging system level debug messages.
     */
    sf.logger.addCase('debug', function(message){
        sf.logger.record(createDebugRecord(LOG_LEVELS.DEBUG, 'debug', message,null, false, arguments, 0));
    }, [
        {
            'message':'explanation'
        }
    ]);


    /**
     * Adding case for logging local node/service debug messages.
     */
    sf.logger.addCase('ldebug', function(message){
        sf.logger.record(createDebugRecord(LOG_LEVELS.LOCAL_DEBUG, 'ldebug', message, null, false, arguments, 0));
    }, [
        {
            'message':'explanation'
        }
    ]);

    /**
     * Adding case for logging user level debug messages.
     */
    sf.logger.addCase('udebug', function(message){
        sf.logger.record(createDebugRecord(LOG_LEVELS.USER_DEBUG, 'udebug', message ,null, false, arguments, 0));
    }, [
        {
            'message':'explanation'
        }
    ]);

    /**
     * Adding case for logging development debug messages.
     */
    sf.logger.addCase('devel', function(message){
        sf.logger.record(createDebugRecord(LOG_LEVELS.DEV_DEBUG, 'devel', message, null, false, arguments, 0));
    }, [
        {
            'message':'explanation'
        }
    ]);

    /**
     * Adding case for logging "whys" reasoning messages.
     */
    sf.logger.addCase("logWhy", function(logOnlyCurrentWhyContext){
        sf.logger.record(createDebugRecord(LOG_LEVELS.WHYS, 'logwhy', undefined, undefined, undefined, undefined, undefined, undefined, logOnlyCurrentWhyContext));
    });

    /**
     * Adding case for logging asserts messages to running tests.
     */
    sf.logger.addCase("recordAssert", function (message, error,showStack){
        sf.logger.record(createDebugRecord(LOG_LEVELS.TEST_RESULT, 'assert', message, error, showStack));
    });

    /**
     * Generic method to create structured debug records based on the log level.
     * @param level {Number} - number from 1-11, used to identify the level of attention that a log entry should get from operations point of view
     * @param type {String} - identifier name for log type
     * @param message {String} - description of the debug record
     * @param exception {String} - exception details if any
     * @param saveStack {Boolean} - if set to true, the exception call stack will be added to the debug record
     * @param args {Array} - arguments of the caller function
     * @param pos {Number} - position
     * @param data {String|Number|Array|Object} - payload information
     * @param logOnlyCurrentWhyContext - if whys is enabled, only the current context will be logged
     * @returns Debug record model {Object} with the following fields:
     * [required]: level: *, type: *, timestamp: number, message: *, data: * and
     * [optional]: stack: *, exception: *, args: *, whyLog: *
     */
    function createDebugRecord(level, type, message, exception, saveStack, args, pos, data, logOnlyCurrentWhyContext){

        var ret = {
            level: level,
            type: type,
            timestamp: (new Date()).getTime(),
            message: message,
            data: data
        };

        if(saveStack){
            var stack = '';
            if(exception){
                stack = exception.stack;
            } else {
                stack  = (new Error()).stack;
            }
            ret.stack = stack;
        }

        if(exception){
            ret.exception = exception.message;
        }

        if(args){
            ret.args = JSON.parse(JSON.stringify(args));
        }

        if(process.env.RUN_WITH_WHYS){
            var why = require('whys');
            if(logOnlyCurrentWhyContext) {
                ret['whyLog'] = why.getGlobalCurrentContext().getExecutionSummary();
            }else{
                ret['whyLog'] = why.getAllContexts().map(function (context) {
                    return context.getExecutionSummary();
                });
            }
        }

        return ret;
    }

};


},{"whys":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/double-check/lib/testRunner.js":[function(require,module,exports){
(function (Buffer,__dirname){
const fs = require("fs");
const path = require("path");
const forker = require('child_process');

const DEFAULT_TIMEOUT = 2000;

var globToRegExp =  require("./utils/glob-to-regexp");

var defaultConfig = {
    confFileName: "double-check.json",      // name of the conf file
    fileExt: ".js",                         // test file supported by extension
    matchDirs: [ 'test', 'tests' ],           // dirs names for tests - case insensitive (used in discovery process)
    testsDir: process.cwd(),                // path to the root tests location
    reports: {
        basePath: process.cwd(),            // path where the reports will be saved
        prefix: "Report-",                  // prefix for report files, filename pattern: [prefix]-{timestamp}{ext}
        ext: ".txt"                         // report file extension
    }
};

const TAG = "[TEST_RUNNER]";
const MAX_WORKERS = process.env['DOUBLE_CHECK_POOL_SIZE'] || 10;
const DEBUG = typeof v8debug === 'object';

const TEST_STATES = {
    READY: 'ready',
    RUNNING: 'running',
    FINISHED: 'finished',
    TIMEOUT: 'timeout'
};

// Session object
var defaultSession = {
    testCount: 0,
    currentTestIndex: 0,
    debugPort: process.debugPort,   // current process debug port. The child process will be increased from this port
    workers: {
        running: 0,
        terminated: 0
    }
};

// Template structure for test reports.
var reportFileStructure = {
    count: 0,
    suites: {
        count: 0,
        items: []
    },
    passed: {
        count: 0,
        items: []
    },
    failed: {
        count: 0,
        items: []
    },
};

exports.init = function(sf){
    sf.testRunner = {
        /**
         * Initialization of the test runner.
         * @param config {Object} - settings object that will be merged with the default one
         * @private
         */
        __init: function(config) {
            this.config = this.__extend(defaultConfig, config);
            this.testTree = {};
            this.testList = [];

            this.session = defaultSession;

            // create reports directory if not exist
            if (!fs.existsSync(this.config.reports.basePath)){
                fs.mkdirSync(this.config.reports.basePath);
            }
        },
        /**
         * Main entry point. It will start the flow runner flow.
         * @param config {Object} - object containing settings such as conf file name, test dir.
         * @param callback {Function} - handler(error, result) invoked when an error occurred or the runner has completed all jobs.
         */
        start: function(config, callback) {

            // wrapper for provided callback, if any
            this.callback = function(err, result) {
                if(err) {
                    this.__debugInfo(err.message || err);
                }

                if(callback) {
                    return callback(err, result);
                }
            };

            this.__init(config);

            this.__consoleLog("Discovering tests ...");
            this.testTree = this.__discoverTestFiles(this.config.testsDir, config);
            this.testList = this.__toTestTreeToList(this.testTree);
            this.__launchTests();
        },
        /**
         * Reads configuration settings from a json file.
         * @param confPath {String} - absolute path to the configuration file.
         * @returns {Object} - configuration object {{}}
         * @private
         */
        __readConf: function(confPath) {
            var config = {};
            try{
                config = require(confPath);
            } catch(error) {
                console.error(error);
            }

            return config;
        },
        /**
         * Discovers test files recursively starting from a path. The dir is the root of the test files. It can contains
         * test files and test sub directories. It will create a tree structure with the test files discovered.
         * Notes: Only the config.matchDirs will be taken into consideration. Also, based on the conf (double-check.json)
         * it will include the test files or not.
         * @param dir {String} - path where the discovery process starts
         * @param parentConf {String} - configuration object (double-check.json) from the parent directory
         * @returns The root node object of the file structure tree. E.g. {*|{__meta, data, result, items}}
         * @private
         */
        __discoverTestFiles: function(dir, parentConf) {
            const stat = fs.statSync(dir);
            if(!stat.isDirectory()){
                throw new Error(dir + " is not a directory!");
            }

            let currentConf = parentConf;

            let currentNode = this.__getDefaultNodeStructure();
            currentNode.__meta.parent = path.dirname(dir);
            currentNode.__meta.isDirectory = true;

            let files = fs.readdirSync(dir);
            // first look for conf file
            if(files.indexOf(this.config.confFileName) !== -1) {
                let fd = path.join(dir, this.config.confFileName);
                let conf = this.__readConf(fd);
                if(conf) {
                    currentNode.__meta.conf = conf;
                    currentConf = conf;
                }
            }

            currentNode.data.name = path.basename(dir);
            currentNode.data.path = dir;
            currentNode.items = [];

            for(let i = 0, len = files.length; i < len; i++) {
                let item = files[i];

                let fd = path.join(dir, item);
                let stat = fs.statSync(fd);
                let isDir = stat.isDirectory();
                let isTestDir = this.__isTestDir(fd);

                if(isDir && !isTestDir) {
                    continue; // ignore dirs that does not follow the naming rule for test dirs
                }

                if(!isDir && item.match(this.config.confFileName)){
                    continue; // already processed
                }

                // exclude files based on glob patterns
                if(currentConf) {
                    // currentConf['ignore'] - array of regExp
                    if(currentConf['ignore']) {
                        const isMatch = this.__isAnyMatch(currentConf['ignore'], item);
                        if(isMatch) {continue;}
                    }
                }

                let childNode = this.__getDefaultNodeStructure();
                childNode.__meta.conf = {};
                childNode.__meta.isDirectory = isDir;
                childNode.__meta.parent = path.dirname(fd);

                if (isDir) {
                    let tempChildNode = this.__discoverTestFiles(fd, currentConf);
                    childNode = Object.assign(childNode, tempChildNode);
                    currentNode.items.push(childNode);
                }
                else if(path.extname(fd) ===  this.config.fileExt){
                    childNode.__meta.conf.runs = currentConf['runs'] || 1;
                    childNode.__meta.conf.silent = currentConf['silent'];
                    childNode.__meta.conf.timeout = currentConf['timeout'] || DEFAULT_TIMEOUT;

                    childNode.data.name = item;
                    childNode.data.path = fd;

                    currentNode.items.push(childNode);
                }
            }

            return currentNode;
        },
        /**
         * Launch collected tests. Initialises session variables, that are specific for the current launch.
         * @private
         */
        __launchTests: function() {
            this.__consoleLog("Launching tests ...");
            this.session.testCount = this.testList.length;
            this.session.processedTestCount = 0;
            this.session.workers.running = 0;
            this.session.workers.terminated = 0;

            if(this.session.testCount > 0) {
                this.__scheduleWork();
            } else {
                this.__doTestReports();
            }
        },
        /**
         * Schedules work based on the MAX available workers, and based on the number of runs of a test.
         * If a test has multiple runs as a option, it will be started in multiple workers. Once all runs are completed,
         * the test is considered as processed.
         * @private
         */
        __scheduleWork: function() {
            while(this.session.workers.running < MAX_WORKERS && this.session.currentTestIndex < this.session.testCount){
                let test = this.testList[this.session.currentTestIndex];
                if(test.result.runs < test.__meta.conf.runs) {
                    test.result.runs++;
                    this.__launchTest(test);
                } else {
                    this.session.currentTestIndex++;
                }
            }
        },
        /**
         * Launch a test into a separate worker (child process).
         * Each worker has handlers for message, exit and error events. Once the exit or error event is invoked,
         * new work is scheduled and session object is updated.
         * Notes: On debug mode, the workers will receive a debug port, that is increased incrementally.
         * @param test {Object} - test object
         * @private
         */
        __launchTest: function(test) {
            this.session.workers.running++;

            test.result.state = TEST_STATES.RUNNING;
            test.result.pass = true;
            test.result.asserts[test.result.runs] = [];
            test.result.messages[test.result.runs] = [];

            let env = process.env;

            let execArgv = [];
            if(DEBUG) {
                const debugPort = ++defaultSession.debugPort;
                const debugFlag = '--debug=' + debugPort;
                execArgv.push(debugFlag);
            }

            const cwd = test.__meta.parent;

            let worker = forker.fork(test.data.path, [], {'cwd': cwd, 'env': env, 'execArgv': execArgv, stdio: [ 'inherit', "pipe", 'inherit', 'ipc' ], silent:false });

            this.__debugInfo(`Launching test ${test.data.name}, run[${test.result.runs}], on worker pid[${worker.pid}] `+new Date().getTime());

            worker.on("message", onMessageEventHandlerWrapper(test));
            worker.on("exit", onExitEventHandlerWrapper(test));
            worker.on("error", onErrorEventHandlerWrapper(test));

            worker.terminated = false;

            worker.stdout.on('data', function (chunk) {
                let content = new Buffer(chunk).toString('utf8'); //TODO: replace with PSKBUFFER
                if(test.__meta.conf.silent) {
                    this.__consoleLog(content);
                }
            }.bind(this));

            var self = this;
            function onMessageEventHandlerWrapper(test) {
                const currentRun = test.result.runs;
                return function(log) {
                    if(log.type === 'assert'){
                        if(log.message.includes("[Fail")) {
                            test.result.pass = false;
                        }
                        test.result.asserts[currentRun].push(log);
                    } else {
                        test.result.messages[currentRun].push(log);
                    }
                };
            }

            function onExitEventHandlerWrapper(test) {
                return function(code, signal) {
                    clearTimeout(worker.timerVar);
                    self.__debugInfo(`Worker ${worker.pid} - exit event. Code ${code}, signal ${signal} `+new Date().getTime());

                    worker.terminated = true;

                    test.result.state = TEST_STATES.FINISHED;
                    if(code !== null && code!==0 /*&& typeof test.result.pass === 'undefined'*/){
                        test.result.pass = false;
                        test.result.messages[test.result.runs].push( {message: "Process finished with errors!", "Exit code":code, "Signal":signal});
                    }

                    self.session.workers.running--;
                    self.session.workers.terminated++;

                    self.__scheduleWork();
                    self.__checkWorkersStatus();
                };
            }

            // this handler can be triggered when:
            // 1. The process could not be spawned, or
            // 2. The process could not be killed, or
            // 3. Sending a message to the child process failed.
            // IMPORTANT: The 'exit' event may or may not fire after an error has occurred!
            function onErrorEventHandlerWrapper(test) {
                return function(error) {
                    self.__debugInfo(`Worker ${worker.pid} - error event.`, test);
                    self.__debugError(error);

                    self.session.workers.running--;
                    self.session.workers.terminated++;
                };
            }

            // Note: on debug, the timeout is reached before exit event is called
            // when kill is called, the exit event is raised
            worker.timerVar = setTimeout(()=>{
                if(!worker.terminated){
                    this.__consoleLog(`worker pid [${worker.pid}] - timeout event`,new Date().getTime(),  test);

                    if(test.result.state !== TEST_STATES.FINISHED){
                        test.result.pass = false;
                    }
                    worker.kill();
                    test.result.state = TEST_STATES.TIMEOUT;
                }else{
                    console.log("Got something, but don't know what...", test);
                }
            }, test.__meta.conf.timeout);

                self.__debugInfo(`Worker ${worker.pid} - set timeout event at `+new Date().getTime() + " for "+test.__meta.conf.timeout);

        },
        /**
         * Checks if all workers completed their job (finished or have been terminated).
         * If true, then the reporting steps can be started.
         * @private
         */
        __checkWorkersStatus: function() {
            if(this.session.workers.running === 0) {
                this.__doTestReports();
            }
        },
        /**
         * Creates test reports object (JSON) that will be saved in the test report.
         * Filename of the report is using the following pattern: {prefix}-{timestamp}{ext}
         * The file will be saved in config.reports.basePath.
         * @private
         */
        __doTestReports: function() {
            this.__consoleLog("Doing reports ...");
            reportFileStructure.count = this.testList.length;

            // pass/failed tests
            for(let i = 0, len = this.testList.length; i < len; i++) {
                let test = this.testList[i];

                let testPath = this.__toRelativePath(test.data.path);
                let item = {path: testPath};
                if(test.result.pass) {
                    item.reason = this.__getFirstFailReasonPerRun(test);
                    reportFileStructure.passed.items.push(item);
                } else {
                    item.reason = this.__getFirstFailReasonPerRun(test);
                    reportFileStructure.failed.items.push(item);
                }
            }
            reportFileStructure.passed.count = reportFileStructure.passed.items.length;
            reportFileStructure.failed.count = reportFileStructure.failed.items.length;

            // suites (first level of directories)
            for(let i = 0, len = this.testTree.items.length; i < len; i++) {
                let item = this.testTree.items[i];
                if(item.__meta.isDirectory) {
                    let suitePath = this.__toRelativePath(item.data.path);
                    reportFileStructure.suites.items.push(suitePath);
                }
            }
            reportFileStructure.suites.count = reportFileStructure.suites.items.length;

            let numberOfReports = 2;

            let finishReports = (err, res) => {
                if(numberOfReports > 1){
                    numberOfReports -= 1;
                    return;
                }
                if(reportFileStructure.failed.count === 0){
                    this.__consoleLog("\nEverything went well! No failed tests.\n\n");
                }else{
                    this.__consoleLog("\nSome tests failed. Check report files!\n\n");
                }

                this.callback(err, "Done");
            };


            this.__consoleLog(this.config.reports.prefix);
            const fileName = `${this.config.reports.prefix}latest${this.config.reports.ext}`;
            const filePath = path.join(this.config.reports.basePath, fileName);
            this.__saveReportToFile(reportFileStructure, filePath, finishReports);

            const timestamp = new Date().getTime().toString();
            const htmlFileName = `${this.config.reports.prefix}latest.html`;
            const htmlFilePath = path.join(this.config.reports.basePath, htmlFileName);
            this.__saveHtmlReportToFile(reportFileStructure, htmlFilePath, timestamp, finishReports);
        },
        /**
         * Saves test reports object (JSON) in the specified path.
         * @param reportFileStructure {Object} - test reports object (JSON)
         * @param destination {String} - path of the file report (the base path MUST exist)
         * @private
         */
        __saveReportToFile: function(reportFileStructure, destination, callback) {

            var content = JSON.stringify(reportFileStructure, null, 4);
            fs.writeFile(destination, content, 'utf8', function (err) {
                if (err) {
                    const message = "An error occurred while writing the report file, with the following error: " + JSON.stringify(err);
                    this.__debugInfo(message);
                    throw err;
                } else{
                    const message = `Finished writing report to ${destination}`;
                    this.__consoleLog(message);
                }
                callback();
            }.bind(this));
        },
        /**
         * Saves test reports as HTML in the specified path.
         * @param reportFileStructure {Object} - test reports object (JSON)
         * @param destination {String} - path of the file report (the base path MUST exist)
         * @param timestamp {String} - timestamp to be injected in html template
         * @private
         */
        __saveHtmlReportToFile: function (reportFileStructure, destination, timestamp, callback) {
            var folderName = path.resolve(__dirname);
            fs.readFile(path.join(folderName,'/utils/reportTemplate.html'), 'utf8', (err, res) => {
                if (err) {
                    const message = 'An error occurred while reading the html report template file, with the following error: ' + JSON.stringify(err);
                    this.__debugInfo(message);
                    throw err;
                }

                fs.writeFile(destination, res + `<script>init(${JSON.stringify(reportFileStructure)}, ${timestamp});</script>`, 'utf8', (err) => {
                    if (err) {
                        const message = 'An error occurred while writing the html report file, with the following error: ' + JSON.stringify(err);
                        this.__debugInfo(message);
                        throw err;
                    }

                    const message = `Finished writing report to ${destination}`;
                    this.__consoleLog(message);

                    callback();
                });
            });
        },
        /**
         * Converts absolute file path to relative path.
         * @param absolutePath {String} - absolute path
         * @returns {string | void | *} - relative path
         * @private
         */
        __toRelativePath: function(absolutePath) {
            const basePath = path.join(this.config.testsDir, "/");
            const relativePath = absolutePath.replace(basePath, "");
            return relativePath;
        },
        /**
         * Checks if a directory is a test dir, by matching its name against config.matchDirs array.
         * @param dir {String} - directory name
         * @returns {boolean} - returns true if there is a match and false otherwise.
         * @private
         */
        __isTestDir: function(dir) {
            if(!this.config || !this.config.matchDirs ) {
                throw `matchDirs is not defined on config ${JSON.stringify(this.config)} does not exist!`;
            }

            var isTestDir = this.config.matchDirs.some(function(item) {
                return dir.toLowerCase().includes(item.toLowerCase());
            });

            return isTestDir;
        },
        /**
         * For a failed test, it returns only the first fail reason per each run.
         * @param test {Object} - test object
         * @returns {Array} - an array of reasons per each test run.
         * @private
         */
        __getFirstFailReasonPerRun: function(test) {
            const reason = [];
            for(let i = 1; i <= test.result.runs; i++) {
                if(test.result.asserts[i] && test.result.asserts[i].length > 0) {
                    addReason(i, test.result.asserts[i][0]);
                }

                if(test.result.messages[i] && test.result.messages[i].length > 0) {
                    addReason(i, test.result.messages[i][0]);
                }

                function addReason(run, log) {
                    const message = {
                        run: run,
                        log: log
                    };

                    reason.push(message);
                }
            }

            return reason;
        },
        /**
         * Described default tree node structure.
         * @returns {{__meta: {conf: null, parent: null, isDirectory: boolean}, data: {name: null, path: null}, result: {state: string, pass: null, executionTime: number, runs: number, asserts: {}, messages: {}}, items: null}}
         * @private
         */
        __getDefaultNodeStructure: function() {
            return  {
                __meta: {
                    conf: null,
                    parent: null,
                    isDirectory: false
                },
                data: {
                    name: null,
                    path: null,
                },
                result: {
                    state: TEST_STATES.READY, // ready | running | terminated | timeout
                    pass: null,
                    executionTime: 0,
                    runs: 0,
                    asserts: {},
                    messages: {}
                },
                items: null
            };
        },
        /**
         * Match a test file path to a UNIX glob expression array. If its any match returns true, otherwise returns false.
         * @param globExpArray {Array} - an array with glob expression (UNIX style)
         * @param str {String} - the string to be matched
         * @returns {boolean} - returns true if there is any match and false otherwise.
         * @private
         */
        __isAnyMatch: function(globExpArray, str) {
            const hasMatch = function(globExp) {
                const regex = globToRegExp(globExp);
                return regex.test(str);
            };

            return globExpArray.some(hasMatch);
        },
        /**
         * Converts a tree structure into an array list of test nodes. The tree traversal is DFS (Deep-First-Search).
         * @param rootNode {Object} - root node of the test tree.
         * @returns {Array} - List of test nodes.
         * @private
         */
        __toTestTreeToList: function(rootNode) {
            var testList = [];

            traverse(rootNode);

            function traverse(node) {
                if(!node.__meta.isDirectory || !node.items) {
                    return;
                }

                for(let i = 0, len = node.items.length; i < len; i++) {
                    const item = node.items[i];
                    if(item.__meta.isDirectory) {
                        traverse(item);
                    } else {
                        testList.push(item);
                    }
                }
            }

            return testList;
        },
        /**
         * Logging to console wrapper.
         * @param log {String|Object|Number} - log message
         * @private
         */
        __consoleLog: function(log) {
            console.log(TAG, log);
        },
        /**
         * Logging debugging info messages wrapper.
         * Logger: console.info
         * @param log {String|Object|Number} - log message
         * @private
         */
        __debugInfo: function(log) {
            this.__debug(console.info, log);
        },
        /**
         * Logging debugging error messages wrapper.
         * Logger: console.error
         * @param log {String|Object|Number} - log message
         * @private
         */
        __debugError: function(log) {
            this.__debug(console.error, log);
        },
        /**
         *  Logging debugging messages wrapper. One debug mode, the logging is silent.
         * @param logger {Function} - handler for logging
         * @param log {String|Object|Number} - log message
         * @private
         */
        __debug: function(logger, log) {
            if(!DEBUG) {return;}

            // let prettyLog = JSON.stringify(log, null, 2);
            logger("DEBUG", log);
        },
        /**
         * Deep extend one object with properties of another object.
         * If the property exists in both objects the property from the first object is overridden.
         * @param first {Object} - the first object
         * @param second {Object} - the second object
         * @returns {Object} - an object with both properties from the first and second object.
         * @private
         */
        __extend: function (first, second) {
            for (const key in second) {
                if (!first.hasOwnProperty(key)) {
                    first[key] = second[key];
                } else {
                    let val = second[key];
                    if(typeof first[key] === 'object') {
                        val = this.__extend(first[key], second[key]);
                    }

                    first[key] = val;
                }
            }

            return first;
        }
    };
};

}).call(this,require("buffer").Buffer,"/modules/double-check/lib")

},{"./utils/glob-to-regexp":"/home/cosmin/Workspace/reorganizing/privatesky/modules/double-check/lib/utils/glob-to-regexp.js","buffer":"buffer","child_process":false,"fs":false,"path":"path"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/double-check/lib/utils/glob-to-regexp.js":[function(require,module,exports){

// globToRegExp turns a UNIX glob expression into a RegEx expression.
//  Supports all simple glob patterns. Examples: *.ext, /foo/*, ../../path, ^foo.*
// - single character matching, matching ranges of characters etc. group matching are no supported
// - flags are not supported
var globToRegExp = function (globExp) {
    if (typeof globExp !== 'string') {
        throw new TypeError('Glob Expression must be a string!');
    }

    var regExp = "";

    for (let i = 0, len = globExp.length; i < len; i++) {
        let c = globExp[i];

        switch (c) {
            case "/":
            case "$":
            case "^":
            case "+":
            case ".":
            case "(":
            case ")":
            case "=":
            case "!":
            case "|":
                regExp += "\\" + c;
                break;

            case "*":
                // treat any number of "*" as one
                while(globExp[i + 1] === "*") {
                    i++;
                }
                regExp += ".*";
                break;

            default:
                regExp += c;
        }
    }

    // set the regular expression with ^ & $
    regExp = "^" + regExp + "$";

    return new RegExp(regExp);
};

module.exports = globToRegExp;
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/foldermq/lib/folderMQ.js":[function(require,module,exports){
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

},{"fs":false,"path":"path","swarmutils":"swarmutils"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskbuffer/lib/PSKBuffer.js":[function(require,module,exports){
function PSKBuffer() {}

function getArrayBufferInterface () {
    if(typeof SharedArrayBuffer === 'undefined') {
        return ArrayBuffer;
    } else {
        return SharedArrayBuffer;
    }
}

PSKBuffer.from = function (source) {
    const ArrayBufferInterface = getArrayBufferInterface();

    const buffer = new Uint8Array(new ArrayBufferInterface(source.length));
    buffer.set(source, 0);

    return buffer;
};

PSKBuffer.concat = function ([ ...params ], totalLength) {
    const ArrayBufferInterface = getArrayBufferInterface();

    if (!totalLength && totalLength !== 0) {
        totalLength = 0;
        for (const buffer of params) {
            totalLength += buffer.length;
        }
    }

    const buffer = new Uint8Array(new ArrayBufferInterface(totalLength));
    let offset = 0;

    for (const buf of params) {
        const len = buf.length;

        const nextOffset = offset + len;
        if (nextOffset > totalLength) {
            const remainingSpace = totalLength - offset;
            for (let i = 0; i < remainingSpace; ++i) {
                buffer[offset + i] = buf[i];
            }
        } else {
            buffer.set(buf, offset);
        }

        offset = nextOffset;
    }

    return buffer;
};

PSKBuffer.isBuffer = function (pskBuffer) {
    return !!ArrayBuffer.isView(pskBuffer);
};

PSKBuffer.alloc = function(size) {
    const ArrayBufferInterface = getArrayBufferInterface();

    return new Uint8Array(new ArrayBufferInterface(size));
};

module.exports = PSKBuffer;
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/ECDSA.js":[function(require,module,exports){
const crypto = require('crypto');
const KeyEncoder = require('./keyEncoder');

function ECDSA(curveName){
    this.curve = curveName || 'secp256k1';
    const self = this;

    this.generateKeyPair = function() {
        const result     = {};
        const ec         = crypto.createECDH(self.curve);
        result.public  = ec.generateKeys('hex');
        result.private = ec.getPrivateKey('hex');
        return keysToPEM(result);
    };

    function keysToPEM(keys){
        const result                  = {};
        const ECPrivateKeyASN         = KeyEncoder.ECPrivateKeyASN;
        const SubjectPublicKeyInfoASN = KeyEncoder.SubjectPublicKeyInfoASN;
        const keyEncoder              = new KeyEncoder(self.curve);

        const privateKeyObject        = keyEncoder.privateKeyObject(keys.private,keys.public);
        const publicKeyObject         = keyEncoder.publicKeyObject(keys.public);

        result.private              = ECPrivateKeyASN.encode(privateKeyObject, 'pem', privateKeyObject.pemOptions);
        result.public               = SubjectPublicKeyInfoASN.encode(publicKeyObject, 'pem', publicKeyObject.pemOptions);

        return result;

    }

    this.sign = function (privateKey,digest) {
        const sign = crypto.createSign("sha256");
        sign.update(digest);

        return sign.sign(privateKey,'hex');
    };

    this.verify = function (publicKey,signature,digest) {
        const verify = crypto.createVerify('sha256');
        verify.update(digest);

        return verify.verify(publicKey,signature,'hex');
    }
}

exports.createECDSA = function (curve){
    return new ECDSA(curve);
};
},{"./keyEncoder":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/keyEncoder.js","crypto":"crypto"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/PskCrypto.js":[function(require,module,exports){
(function (Buffer){
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const utils = require("./utils/cryptoUtils");
const PskArchiver = require("./psk-archiver");
const PassThroughStream = require('./utils/PassThroughStream');

const EventEmitter = require('events');
const tempFolder = os.tmpdir();

function PskCrypto() {

    const self = this;

    const event = new EventEmitter();

    this.on = event.on;
    this.off = event.removeListener;
    this.removeAllListeners = event.removeAllListeners;
    this.emit = event.emit;

    /*--------------------------------------------- ECDSA functions ------------------------------------------*/
    const ecdsa = require("./ECDSA").createECDSA();
    this.generateECDSAKeyPair = function () {
        return ecdsa.generateKeyPair();
    };

    this.sign = function (privateKey, digest) {
        return ecdsa.sign(privateKey, digest);
    };

    this.verify = function (publicKey, signature, digest) {
        return ecdsa.verify(publicKey, signature, digest);
    };

    /*---------------------------------------------Encryption functions -------------------------------------*/

    this.encryptStream = function (inputPath, destinationPath, password, callback) {
        const archiver = new PskArchiver();

        archiver.on('progress', (progress) => {
            self.emit('progress', progress);
        });

        fs.open(destinationPath, "wx", function (err, fd) {
            if (err) {
                callback(err);
                return;
            }

            fs.close(fd, function (err) {
                if (err) {
                    return callback(err);
                }

                const ws = fs.createWriteStream(destinationPath, {autoClose: false});
                const keySalt = crypto.randomBytes(32);
                const key = crypto.pbkdf2Sync(password, keySalt, utils.iterations_number, 32, 'sha512');

                const aadSalt = crypto.randomBytes(32);
                const aad = crypto.pbkdf2Sync(password, aadSalt, utils.iterations_number, 32, 'sha512');

                const salt = Buffer.concat([keySalt, aadSalt]);
                const iv = crypto.pbkdf2Sync(password, salt, utils.iterations_number, 12, 'sha512');

                const cipher = crypto.createCipheriv(utils.algorithm, key, iv);
                cipher.setAAD(aad);
                archiver.zipStream(inputPath, cipher, function (err, cipherStream) {

                    if (err) {
                        return callback(err);
                    }

                    cipherStream.on("data", function (chunk) {
                        ws.write(chunk);
                    });
                    cipherStream.on('end', function () {
                        const tag = cipher.getAuthTag();
                        const dataToAppend = Buffer.concat([salt, tag]);
                        ws.end(dataToAppend, function (err) {
                            if (err) {
                                return callback(err);
                            }

                            callback();
                        })
                    });
                });
            });
        });
    };

    this.decryptStream = function (encryptedInputPath, outputFolder, password, callback) {

        const archiver = new PskArchiver();

        decryptFile(encryptedInputPath, tempFolder, password, function (err, tempArchivePath) {
            if (err) {
                return callback(err);
            }

            archiver.on('progress', (progress) => {
                self.emit('progress', 10 + 0.9 * progress);
            });


            archiver.unzipStream(tempArchivePath, outputFolder, function (err, unzippedFileNames) {
                if (err) {
                    return callback(err);
                }

                utils.deleteRecursively(tempArchivePath, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(undefined, unzippedFileNames);
                });

            });
        })
    };

    this.encryptObject = function (inputObj, dseed, depth, callback) {
        const archiver = new PskArchiver();

        archiver.zipInMemory(inputObj, depth, function (err, zippedObj) {
            if (err) {
                return callback(err);
            }
            const cipherText = utils.encrypt(zippedObj, dseed);
            callback(null, cipherText);
        })
    };

    this.decryptObject = function (encryptedData, dseed, callback) {
        const archiver = new PskArchiver();

        const zippedObject = utils.decrypt(encryptedData, dseed);
        archiver.unzipInMemory(zippedObject, function (err, obj) {
            if (err) {
                return callback(err);
            }
            callback(null, obj);
        })
    };

    this.pskHash = function (data) {
        if (Buffer.isBuffer(data)) {
            return utils.createPskHash(data);
        }
        if (data instanceof Object) {
            return utils.createPskHash(JSON.stringify(data));
        }
        return utils.createPskHash(data);
    };

    this.pskHashStream = function (readStream, callback) {
        const pskHash = new utils.PskHash();

        readStream.on('data', (chunk) => {
            pskHash.update(chunk);
        });


        readStream.on('end', () => {
            callback(null, pskHash.digest());
        })
    };


    this.saveData = function (data, password, path, callback) {
        const encryptionKey = this.deriveKey(password, null, null);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cfb', encryptionKey, iv);
        let encryptedDSeed = cipher.update(data, 'binary');
        const final = Buffer.from(cipher.final('binary'), 'binary');
        encryptedDSeed = Buffer.concat([iv, encryptedDSeed, final]);
        fs.writeFile(path, encryptedDSeed, function (err) {
            callback(err);
        });
    };


    this.loadData = function (password, path, callback) {

        fs.readFile(path, null, (err, encryptedData) => {
            if (err) {
                callback(err);
            } else {
                const iv = encryptedData.slice(0, 16);
                const encryptedDseed = encryptedData.slice(16);
                const encryptionKey = this.deriveKey(password, null, null);
                const decipher = crypto.createDecipheriv('aes-256-cfb', encryptionKey, iv);
                let dseed = Buffer.from(decipher.update(encryptedDseed, 'binary'), 'binary');
                const final = Buffer.from(decipher.final('binary'), 'binary');
                dseed = Buffer.concat([dseed, final]);
                callback(null, dseed);
            }
        });
    };


    this.generateSafeUid = function (password, additionalData) {
        password = password || Buffer.alloc(0);
        if (!additionalData) {
            additionalData = Buffer.alloc(0);
        }

        if (!Buffer.isBuffer(additionalData)) {
            additionalData = Buffer.from(additionalData);
        }

        return utils.encode(this.pskHash(Buffer.concat([password, additionalData])));
    };

    this.deriveKey = function deriveKey(password, iterations, dkLen) {
        iterations = iterations || 1000;
        dkLen = dkLen || 32;
        const salt = utils.generateSalt(password, 32);
        const dk = crypto.pbkdf2Sync(password, salt, iterations, dkLen, 'sha512');
        return Buffer.from(dk);
    };

    this.randomBytes = crypto.randomBytes;
    this.PskHash = utils.PskHash;

    //-------------------------- Internal functions -----------------------------------
    function decryptFile(encryptedInputPath, tempFolder, password, callback) {
        fs.stat(encryptedInputPath, function (err, stats) {
            if (err) {
                return callback(err, null);
            }

            const fileSizeInBytes = stats.size;

            fs.open(encryptedInputPath, "r", function (err, fd) {
                if (err) {
                    callback(err, null);
                } else {
                    const encryptedAuthData = Buffer.alloc(80);

                    fs.read(fd, encryptedAuthData, 0, 80, fileSizeInBytes - 80, function (err, bytesRead) {
                        const salt = encryptedAuthData.slice(0, 64);
                        const keySalt = salt.slice(0, 32);
                        const aadSalt = salt.slice(-32);

                        const iv = crypto.pbkdf2Sync(password, salt, utils.iterations_number, 12, 'sha512');
                        const key = crypto.pbkdf2Sync(password, keySalt, utils.iterations_number, 32, 'sha512');
                        const aad = crypto.pbkdf2Sync(password, aadSalt, utils.iterations_number, 32, 'sha512');
                        const tag = encryptedAuthData.slice(-16);

                        const decipher = crypto.createDecipheriv(utils.algorithm, key, iv);

                        decipher.setAAD(aad);
                        decipher.setAuthTag(tag);
                        const rs = fs.createReadStream(encryptedInputPath, {start: 0, end: fileSizeInBytes - 81});
                        fs.mkdir(tempFolder, {recursive: true}, function (err) {

                            if (err) {
                                return callback(err);
                            }
                            const tempArchivePath = path.join(tempFolder, path.basename(encryptedInputPath) + ".zip");

                            fs.open(tempArchivePath, "w", function (err, fd) {
                                if (err) {
                                    callback(err);
                                    return;
                                }

                                fs.close(fd, function (err) {

                                    if (err) {
                                        return callback(err);
                                    }

                                    const ptStream = new PassThroughStream();

                                    const ws = fs.createWriteStream(tempArchivePath, {autoClose: false});
                                    ws.on("finish", function () {
                                        callback(null, tempArchivePath);
                                    });


                                    let progressLength = 0;
                                    let totalLength = 0;

                                    /**
                                     * TODO review this
                                     * In browser, piping will block the event loop and the stack queue is not called.
                                     */
                                    rs.on("data", (chunk) => {
                                        progressLength += chunk.length;
                                        totalLength += chunk.length;

                                        if (progressLength > 300000) {
                                            progressLength = 0;
                                            emitProgress(fileSizeInBytes, totalLength)
                                        }
                                    });

                                    rs.pipe(decipher).pipe(ptStream).pipe(ws);

                                });
                            });
                        });

                    });

                }
            });
        });
    }

    function emitProgress(total, processed) {


        if (processed > total) {
            processed = total;
        }

        const progress = (100 * processed) / total;
        self.emit('progress', parseInt(progress));
    }

}

module.exports = new PskCrypto();

}).call(this,require("buffer").Buffer)

},{"./ECDSA":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/ECDSA.js","./psk-archiver":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/psk-archiver.js","./utils/PassThroughStream":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/utils/PassThroughStream.js","./utils/cryptoUtils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/utils/cryptoUtils.js","buffer":"buffer","crypto":"crypto","events":"events","fs":false,"os":"os","path":"path"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/api.js":[function(require,module,exports){
var asn1 = require('./asn1');
var inherits = require('util').inherits;

var api = exports;

api.define = function define(name, body) {
  return new Entity(name, body);
};

function Entity(name, body) {
  this.name = name;
  this.body = body;

  this.decoders = {};
  this.encoders = {};
};

Entity.prototype._createNamed = function createNamed(base) {
  var named;
  try {
    named = require('vm').runInThisContext(
      '(function ' + this.name + '(entity) {\n' +
      '  this._initNamed(entity);\n' +
      '})'
    );
  } catch (e) {
    named = function (entity) {
      this._initNamed(entity);
    };
  }
  inherits(named, base);
  named.prototype._initNamed = function initnamed(entity) {
    base.call(this, entity);
  };

  return new named(this);
};

Entity.prototype._getDecoder = function _getDecoder(enc) {
  // Lazily create decoder
  if (!this.decoders.hasOwnProperty(enc))
    this.decoders[enc] = this._createNamed(asn1.decoders[enc]);
  return this.decoders[enc];
};

Entity.prototype.decode = function decode(data, enc, options) {
  return this._getDecoder(enc).decode(data, options);
};

Entity.prototype._getEncoder = function _getEncoder(enc) {
  // Lazily create encoder
  if (!this.encoders.hasOwnProperty(enc))
    this.encoders[enc] = this._createNamed(asn1.encoders[enc]);
  return this.encoders[enc];
};

Entity.prototype.encode = function encode(data, enc, /* internal */ reporter) {
  return this._getEncoder(enc).encode(data, reporter);
};

},{"./asn1":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/asn1.js","util":"util","vm":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/asn1.js":[function(require,module,exports){
var asn1 = exports;

asn1.bignum = require('./bignum/bn');

asn1.define = require('./api').define;
asn1.base = require('./base/index');
asn1.constants = require('./constants/index');
asn1.decoders = require('./decoders/index');
asn1.encoders = require('./encoders/index');

},{"./api":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/api.js","./base/index":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/base/index.js","./bignum/bn":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/bignum/bn.js","./constants/index":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/constants/index.js","./decoders/index":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/decoders/index.js","./encoders/index":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/encoders/index.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/base/buffer.js":[function(require,module,exports){
var inherits = require('util').inherits;
var Reporter = require('../base').Reporter;
var Buffer = require('buffer').Buffer;

function DecoderBuffer(base, options) {
  Reporter.call(this, options);
  if (!Buffer.isBuffer(base)) {
    this.error('Input not Buffer');
    return;
  }

  this.base = base;
  this.offset = 0;
  this.length = base.length;
}
inherits(DecoderBuffer, Reporter);
exports.DecoderBuffer = DecoderBuffer;

DecoderBuffer.prototype.save = function save() {
  return { offset: this.offset, reporter: Reporter.prototype.save.call(this) };
};

DecoderBuffer.prototype.restore = function restore(save) {
  // Return skipped data
  var res = new DecoderBuffer(this.base);
  res.offset = save.offset;
  res.length = this.offset;

  this.offset = save.offset;
  Reporter.prototype.restore.call(this, save.reporter);

  return res;
};

DecoderBuffer.prototype.isEmpty = function isEmpty() {
  return this.offset === this.length;
};

DecoderBuffer.prototype.readUInt8 = function readUInt8(fail) {
  if (this.offset + 1 <= this.length)
    return this.base.readUInt8(this.offset++, true);
  else
    return this.error(fail || 'DecoderBuffer overrun');
}

DecoderBuffer.prototype.skip = function skip(bytes, fail) {
  if (!(this.offset + bytes <= this.length))
    return this.error(fail || 'DecoderBuffer overrun');

  var res = new DecoderBuffer(this.base);

  // Share reporter state
  res._reporterState = this._reporterState;

  res.offset = this.offset;
  res.length = this.offset + bytes;
  this.offset += bytes;
  return res;
}

DecoderBuffer.prototype.raw = function raw(save) {
  return this.base.slice(save ? save.offset : this.offset, this.length);
}

function EncoderBuffer(value, reporter) {
  if (Array.isArray(value)) {
    this.length = 0;
    this.value = value.map(function(item) {
      if (!(item instanceof EncoderBuffer))
        item = new EncoderBuffer(item, reporter);
      this.length += item.length;
      return item;
    }, this);
  } else if (typeof value === 'number') {
    if (!(0 <= value && value <= 0xff))
      return reporter.error('non-byte EncoderBuffer value');
    this.value = value;
    this.length = 1;
  } else if (typeof value === 'string') {
    this.value = value;
    this.length = Buffer.byteLength(value);
  } else if (Buffer.isBuffer(value)) {
    this.value = value;
    this.length = value.length;
  } else {
    return reporter.error('Unsupported type: ' + typeof value);
  }
}
exports.EncoderBuffer = EncoderBuffer;

EncoderBuffer.prototype.join = function join(out, offset) {
  if (!out)
    out = new Buffer(this.length);
  if (!offset)
    offset = 0;

  if (this.length === 0)
    return out;

  if (Array.isArray(this.value)) {
    this.value.forEach(function(item) {
      item.join(out, offset);
      offset += item.length;
    });
  } else {
    if (typeof this.value === 'number')
      out[offset] = this.value;
    else if (typeof this.value === 'string')
      out.write(this.value, offset);
    else if (Buffer.isBuffer(this.value))
      this.value.copy(out, offset);
    offset += this.length;
  }

  return out;
};

},{"../base":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/base/index.js","buffer":"buffer","util":"util"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/base/index.js":[function(require,module,exports){
var base = exports;

base.Reporter = require('./reporter').Reporter;
base.DecoderBuffer = require('./buffer').DecoderBuffer;
base.EncoderBuffer = require('./buffer').EncoderBuffer;
base.Node = require('./node');

},{"./buffer":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/base/buffer.js","./node":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/base/node.js","./reporter":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/base/reporter.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/base/node.js":[function(require,module,exports){
var Reporter = require('../base').Reporter;
var EncoderBuffer = require('../base').EncoderBuffer;
//var assert = require('double-check').assert;

// Supported tags
var tags = [
  'seq', 'seqof', 'set', 'setof', 'octstr', 'bitstr', 'objid', 'bool',
  'gentime', 'utctime', 'null_', 'enum', 'int', 'ia5str', 'utf8str'
];

// Public methods list
var methods = [
  'key', 'obj', 'use', 'optional', 'explicit', 'implicit', 'def', 'choice',
  'any'
].concat(tags);

// Overrided methods list
var overrided = [
  '_peekTag', '_decodeTag', '_use',
  '_decodeStr', '_decodeObjid', '_decodeTime',
  '_decodeNull', '_decodeInt', '_decodeBool', '_decodeList',

  '_encodeComposite', '_encodeStr', '_encodeObjid', '_encodeTime',
  '_encodeNull', '_encodeInt', '_encodeBool'
];

function Node(enc, parent) {
  var state = {};
  this._baseState = state;

  state.enc = enc;

  state.parent = parent || null;
  state.children = null;

  // State
  state.tag = null;
  state.args = null;
  state.reverseArgs = null;
  state.choice = null;
  state.optional = false;
  state.any = false;
  state.obj = false;
  state.use = null;
  state.useDecoder = null;
  state.key = null;
  state['default'] = null;
  state.explicit = null;
  state.implicit = null;

  // Should create new instance on each method
  if (!state.parent) {
    state.children = [];
    this._wrap();
  }
}
module.exports = Node;

var stateProps = [
  'enc', 'parent', 'children', 'tag', 'args', 'reverseArgs', 'choice',
  'optional', 'any', 'obj', 'use', 'alteredUse', 'key', 'default', 'explicit',
  'implicit'
];

Node.prototype.clone = function clone() {
  var state = this._baseState;
  var cstate = {};
  stateProps.forEach(function(prop) {
    cstate[prop] = state[prop];
  });
  var res = new this.constructor(cstate.parent);
  res._baseState = cstate;
  return res;
};

Node.prototype._wrap = function wrap() {
  var state = this._baseState;
  methods.forEach(function(method) {
    this[method] = function _wrappedMethod() {
      var clone = new this.constructor(this);
      state.children.push(clone);
      return clone[method].apply(clone, arguments);
    };
  }, this);
};

Node.prototype._init = function init(body) {
  var state = this._baseState;

  //assert.equal(state.parent,null,'state.parent should be null');
  body.call(this);

  // Filter children
  state.children = state.children.filter(function(child) {
    return child._baseState.parent === this;
  }, this);
  // assert.equal(state.children.length, 1, 'Root node can have only one child');
};

Node.prototype._useArgs = function useArgs(args) {
  var state = this._baseState;

  // Filter children and args
  var children = args.filter(function(arg) {
    return arg instanceof this.constructor;
  }, this);
  args = args.filter(function(arg) {
    return !(arg instanceof this.constructor);
  }, this);

  if (children.length !== 0) {
    // assert.equal(state.children, null, 'state.children should be null');
    state.children = children;

    // Replace parent to maintain backward link
    children.forEach(function(child) {
      child._baseState.parent = this;
    }, this);
  }
  if (args.length !== 0) {
    // assert.equal(state.args, null, 'state.args should be null');
    state.args = args;
    state.reverseArgs = args.map(function(arg) {
      if (typeof arg !== 'object' || arg.constructor !== Object)
        return arg;

      var res = {};
      Object.keys(arg).forEach(function(key) {
        if (key == (key | 0))
          key |= 0;
        var value = arg[key];
        res[value] = key;
      });
      return res;
    });
  }
};

//
// Overrided methods
//

overrided.forEach(function(method) {
  Node.prototype[method] = function _overrided() {
    var state = this._baseState;
    throw new Error(method + ' not implemented for encoding: ' + state.enc);
  };
});

//
// Public methods
//

tags.forEach(function(tag) {
  Node.prototype[tag] = function _tagMethod() {
    var state = this._baseState;
    var args = Array.prototype.slice.call(arguments);

    // assert.equal(state.tag, null, 'state.tag should be null');
    state.tag = tag;

    this._useArgs(args);

    return this;
  };
});

Node.prototype.use = function use(item) {
  var state = this._baseState;

  // assert.equal(state.use, null, 'state.use should be null');
  state.use = item;

  return this;
};

Node.prototype.optional = function optional() {
  var state = this._baseState;

  state.optional = true;

  return this;
};

Node.prototype.def = function def(val) {
  var state = this._baseState;

  // assert.equal(state['default'], null, "state['default'] should be null");
  state['default'] = val;
  state.optional = true;

  return this;
};

Node.prototype.explicit = function explicit(num) {
  var state = this._baseState;

  // assert.equal(state.explicit,null, 'state.explicit should be null');
  // assert.equal(state.implicit,null, 'state.implicit should be null');

  state.explicit = num;

  return this;
};

Node.prototype.implicit = function implicit(num) {
  var state = this._baseState;

    // assert.equal(state.explicit,null, 'state.explicit should be null');
    // assert.equal(state.implicit,null, 'state.implicit should be null');

    state.implicit = num;

  return this;
};

Node.prototype.obj = function obj() {
  var state = this._baseState;
  var args = Array.prototype.slice.call(arguments);

  state.obj = true;

  if (args.length !== 0)
    this._useArgs(args);

  return this;
};

Node.prototype.key = function key(newKey) {
  var state = this._baseState;

  // assert.equal(state.key, null, 'state.key should be null');
  state.key = newKey;

  return this;
};

Node.prototype.any = function any() {
  var state = this._baseState;

  state.any = true;

  return this;
};

Node.prototype.choice = function choice(obj) {
  var state = this._baseState;

  // assert.equal(state.choice, null,'state.choice should be null');
  state.choice = obj;
  this._useArgs(Object.keys(obj).map(function(key) {
    return obj[key];
  }));

  return this;
};

//
// Decoding
//

Node.prototype._decode = function decode(input) {
  var state = this._baseState;

  // Decode root node
  if (state.parent === null)
    return input.wrapResult(state.children[0]._decode(input));

  var result = state['default'];
  var present = true;

  var prevKey;
  if (state.key !== null)
    prevKey = input.enterKey(state.key);

  // Check if tag is there
  if (state.optional) {
    var tag = null;
    if (state.explicit !== null)
      tag = state.explicit;
    else if (state.implicit !== null)
      tag = state.implicit;
    else if (state.tag !== null)
      tag = state.tag;

    if (tag === null && !state.any) {
      // Trial and Error
      var save = input.save();
      try {
        if (state.choice === null)
          this._decodeGeneric(state.tag, input);
        else
          this._decodeChoice(input);
        present = true;
      } catch (e) {
        present = false;
      }
      input.restore(save);
    } else {
      present = this._peekTag(input, tag, state.any);

      if (input.isError(present))
        return present;
    }
  }

  // Push object on stack
  var prevObj;
  if (state.obj && present)
    prevObj = input.enterObject();

  if (present) {
    // Unwrap explicit values
    if (state.explicit !== null) {
      var explicit = this._decodeTag(input, state.explicit);
      if (input.isError(explicit))
        return explicit;
      input = explicit;
    }

    // Unwrap implicit and normal values
    if (state.use === null && state.choice === null) {
      if (state.any)
        var save = input.save();
      var body = this._decodeTag(
        input,
        state.implicit !== null ? state.implicit : state.tag,
        state.any
      );
      if (input.isError(body))
        return body;

      if (state.any)
        result = input.raw(save);
      else
        input = body;
    }

    // Select proper method for tag
    if (state.any)
      result = result;
    else if (state.choice === null)
      result = this._decodeGeneric(state.tag, input);
    else
      result = this._decodeChoice(input);

    if (input.isError(result))
      return result;

    // Decode children
    if (!state.any && state.choice === null && state.children !== null) {
      var fail = state.children.some(function decodeChildren(child) {
        // NOTE: We are ignoring errors here, to let parser continue with other
        // parts of encoded data
        child._decode(input);
      });
      if (fail)
        return err;
    }
  }

  // Pop object
  if (state.obj && present)
    result = input.leaveObject(prevObj);

  // Set key
  if (state.key !== null && (result !== null || present === true))
    input.leaveKey(prevKey, state.key, result);

  return result;
};

Node.prototype._decodeGeneric = function decodeGeneric(tag, input) {
  var state = this._baseState;

  if (tag === 'seq' || tag === 'set')
    return null;
  if (tag === 'seqof' || tag === 'setof')
    return this._decodeList(input, tag, state.args[0]);
  else if (tag === 'octstr' || tag === 'bitstr')
    return this._decodeStr(input, tag);
  else if (tag === 'ia5str' || tag === 'utf8str')
    return this._decodeStr(input, tag);
  else if (tag === 'objid' && state.args)
    return this._decodeObjid(input, state.args[0], state.args[1]);
  else if (tag === 'objid')
    return this._decodeObjid(input, null, null);
  else if (tag === 'gentime' || tag === 'utctime')
    return this._decodeTime(input, tag);
  else if (tag === 'null_')
    return this._decodeNull(input);
  else if (tag === 'bool')
    return this._decodeBool(input);
  else if (tag === 'int' || tag === 'enum')
    return this._decodeInt(input, state.args && state.args[0]);
  else if (state.use !== null)
    return this._getUse(state.use, input._reporterState.obj)._decode(input);
  else
    return input.error('unknown tag: ' + tag);

  return null;
};

Node.prototype._getUse = function _getUse(entity, obj) {

  var state = this._baseState;
  // Create altered use decoder if implicit is set
  state.useDecoder = this._use(entity, obj);
  // assert.equal(state.useDecoder._baseState.parent, null, 'state.useDecoder._baseState.parent should be null');
  state.useDecoder = state.useDecoder._baseState.children[0];
  if (state.implicit !== state.useDecoder._baseState.implicit) {
    state.useDecoder = state.useDecoder.clone();
    state.useDecoder._baseState.implicit = state.implicit;
  }
  return state.useDecoder;
};

Node.prototype._decodeChoice = function decodeChoice(input) {
  var state = this._baseState;
  var result = null;
  var match = false;

  Object.keys(state.choice).some(function(key) {
    var save = input.save();
    var node = state.choice[key];
    try {
      var value = node._decode(input);
      if (input.isError(value))
        return false;

      result = { type: key, value: value };
      match = true;
    } catch (e) {
      input.restore(save);
      return false;
    }
    return true;
  }, this);

  if (!match)
    return input.error('Choice not matched');

  return result;
};

//
// Encoding
//

Node.prototype._createEncoderBuffer = function createEncoderBuffer(data) {
  return new EncoderBuffer(data, this.reporter);
};

Node.prototype._encode = function encode(data, reporter, parent) {
  var state = this._baseState;
  if (state['default'] !== null && state['default'] === data)
    return;

  var result = this._encodeValue(data, reporter, parent);
  if (result === undefined)
    return;

  if (this._skipDefault(result, reporter, parent))
    return;

  return result;
};

Node.prototype._encodeValue = function encode(data, reporter, parent) {
  var state = this._baseState;

  // Decode root node
  if (state.parent === null)
    return state.children[0]._encode(data, reporter || new Reporter());

  var result = null;
  var present = true;

  // Set reporter to share it with a child class
  this.reporter = reporter;

  // Check if data is there
  if (state.optional && data === undefined) {
    if (state['default'] !== null)
      data = state['default']
    else
      return;
  }

  // For error reporting
  var prevKey;

  // Encode children first
  var content = null;
  var primitive = false;
  if (state.any) {
    // Anything that was given is translated to buffer
    result = this._createEncoderBuffer(data);
  } else if (state.choice) {
    result = this._encodeChoice(data, reporter);
  } else if (state.children) {
    content = state.children.map(function(child) {
      if (child._baseState.tag === 'null_')
        return child._encode(null, reporter, data);

      if (child._baseState.key === null)
        return reporter.error('Child should have a key');
      var prevKey = reporter.enterKey(child._baseState.key);

      if (typeof data !== 'object')
        return reporter.error('Child expected, but input is not object');

      var res = child._encode(data[child._baseState.key], reporter, data);
      reporter.leaveKey(prevKey);

      return res;
    }, this).filter(function(child) {
      return child;
    });

    content = this._createEncoderBuffer(content);
  } else {
    if (state.tag === 'seqof' || state.tag === 'setof') {
      // TODO(indutny): this should be thrown on DSL level
      if (!(state.args && state.args.length === 1))
        return reporter.error('Too many args for : ' + state.tag);

      if (!Array.isArray(data))
        return reporter.error('seqof/setof, but data is not Array');

      var child = this.clone();
      child._baseState.implicit = null;
      content = this._createEncoderBuffer(data.map(function(item) {
        var state = this._baseState;

        return this._getUse(state.args[0], data)._encode(item, reporter);
      }, child));
    } else if (state.use !== null) {
      result = this._getUse(state.use, parent)._encode(data, reporter);
    } else {
      content = this._encodePrimitive(state.tag, data);
      primitive = true;
    }
  }

  // Encode data itself
  var result;
  if (!state.any && state.choice === null) {
    var tag = state.implicit !== null ? state.implicit : state.tag;
    var cls = state.implicit === null ? 'universal' : 'context';

    if (tag === null) {
      if (state.use === null)
        reporter.error('Tag could be ommited only for .use()');
    } else {
      if (state.use === null)
        result = this._encodeComposite(tag, primitive, cls, content);
    }
  }

  // Wrap in explicit
  if (state.explicit !== null)
    result = this._encodeComposite(state.explicit, false, 'context', result);

  return result;
};

Node.prototype._encodeChoice = function encodeChoice(data, reporter) {
  var state = this._baseState;

  var node = state.choice[data.type];
  // if (!node) {
  //   assert(
  //       false,
  //       data.type + ' not found in ' +
  //           JSON.stringify(Object.keys(state.choice)));
  // }
  return node._encode(data.value, reporter);
};

Node.prototype._encodePrimitive = function encodePrimitive(tag, data) {
  var state = this._baseState;

  if (tag === 'octstr' || tag === 'bitstr' || tag === 'ia5str')
    return this._encodeStr(data, tag);
  else if (tag === 'utf8str')
    return this._encodeStr(data, tag);
  else if (tag === 'objid' && state.args)
    return this._encodeObjid(data, state.reverseArgs[0], state.args[1]);
  else if (tag === 'objid')
    return this._encodeObjid(data, null, null);
  else if (tag === 'gentime' || tag === 'utctime')
    return this._encodeTime(data, tag);
  else if (tag === 'null_')
    return this._encodeNull();
  else if (tag === 'int' || tag === 'enum')
    return this._encodeInt(data, state.args && state.reverseArgs[0]);
  else if (tag === 'bool')
    return this._encodeBool(data);
  else
    throw new Error('Unsupported tag: ' + tag);
};

},{"../base":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/base/index.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/base/reporter.js":[function(require,module,exports){
var inherits = require('util').inherits;

function Reporter(options) {
  this._reporterState = {
    obj: null,
    path: [],
    options: options || {},
    errors: []
  };
}
exports.Reporter = Reporter;

Reporter.prototype.isError = function isError(obj) {
  return obj instanceof ReporterError;
};

Reporter.prototype.save = function save() {
  var state = this._reporterState;

  return { obj: state.obj, pathLen: state.path.length };
};

Reporter.prototype.restore = function restore(data) {
  var state = this._reporterState;

  state.obj = data.obj;
  state.path = state.path.slice(0, data.pathLen);
};

Reporter.prototype.enterKey = function enterKey(key) {
  return this._reporterState.path.push(key);
};

Reporter.prototype.leaveKey = function leaveKey(index, key, value) {
  var state = this._reporterState;

  state.path = state.path.slice(0, index - 1);
  if (state.obj !== null)
    state.obj[key] = value;
};

Reporter.prototype.enterObject = function enterObject() {
  var state = this._reporterState;

  var prev = state.obj;
  state.obj = {};
  return prev;
};

Reporter.prototype.leaveObject = function leaveObject(prev) {
  var state = this._reporterState;

  var now = state.obj;
  state.obj = prev;
  return now;
};

Reporter.prototype.error = function error(msg) {
  var err;
  var state = this._reporterState;

  var inherited = msg instanceof ReporterError;
  if (inherited) {
    err = msg;
  } else {
    err = new ReporterError(state.path.map(function(elem) {
      return '[' + JSON.stringify(elem) + ']';
    }).join(''), msg.message || msg, msg.stack);
  }

  if (!state.options.partial)
    throw err;

  if (!inherited)
    state.errors.push(err);

  return err;
};

Reporter.prototype.wrapResult = function wrapResult(result) {
  var state = this._reporterState;
  if (!state.options.partial)
    return result;

  return {
    result: this.isError(result) ? null : result,
    errors: state.errors
  };
};

function ReporterError(path, msg) {
  this.path = path;
  this.rethrow(msg);
};
inherits(ReporterError, Error);

ReporterError.prototype.rethrow = function rethrow(msg) {
  this.message = msg + ' at: ' + (this.path || '(shallow)');
  Error.captureStackTrace(this, ReporterError);

  return this;
};

},{"util":"util"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/bignum/bn.js":[function(require,module,exports){
(function (module, exports) {

'use strict';

// Utils

function assert(val, msg) {
  if (!val)
    throw new Error(msg || 'Assertion failed');
}

// Could use `inherits` module, but don't want to move from single file
// architecture yet.
function inherits(ctor, superCtor) {
  ctor.super_ = superCtor;
  var TempCtor = function () {};
  TempCtor.prototype = superCtor.prototype;
  ctor.prototype = new TempCtor();
  ctor.prototype.constructor = ctor;
}

// BN

function BN(number, base, endian) {
  // May be `new BN(bn)` ?
  if (number !== null &&
      typeof number === 'object' &&
      Array.isArray(number.words)) {
    return number;
  }

  this.sign = false;
  this.words = null;
  this.length = 0;

  // Reduction context
  this.red = null;

  if (base === 'le' || base === 'be') {
    endian = base;
    base = 10;
  }

  if (number !== null)
    this._init(number || 0, base || 10, endian || 'be');
}
if (typeof module === 'object')
  module.exports = BN;
else
  exports.BN = BN;

BN.BN = BN;
BN.wordSize = 26;

BN.prototype._init = function init(number, base, endian) {
  if (typeof number === 'number') {
    return this._initNumber(number, base, endian);
  } else if (typeof number === 'object') {
    return this._initArray(number, base, endian);
  }
  if (base === 'hex')
    base = 16;
  assert(base === (base | 0) && base >= 2 && base <= 36);

  number = number.toString().replace(/\s+/g, '');
  var start = 0;
  if (number[0] === '-')
    start++;

  if (base === 16)
    this._parseHex(number, start);
  else
    this._parseBase(number, base, start);

  if (number[0] === '-')
    this.sign = true;

  this.strip();

  if (endian !== 'le')
    return;

  this._initArray(this.toArray(), base, endian);
};

BN.prototype._initNumber = function _initNumber(number, base, endian) {
  if (number < 0) {
    this.sign = true;
    number = -number;
  }
  if (number < 0x4000000) {
    this.words = [ number & 0x3ffffff ];
    this.length = 1;
  } else if (number < 0x10000000000000) {
    this.words = [
      number & 0x3ffffff,
      (number / 0x4000000) & 0x3ffffff
    ];
    this.length = 2;
  } else {
    assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
    this.words = [
      number & 0x3ffffff,
      (number / 0x4000000) & 0x3ffffff,
      1
    ];
    this.length = 3;
  }

  if (endian !== 'le')
    return;

  // Reverse the bytes
  this._initArray(this.toArray(), base, endian);
};

BN.prototype._initArray = function _initArray(number, base, endian) {
  // Perhaps a Uint8Array
  assert(typeof number.length === 'number');
  if (number.length <= 0) {
    this.words = [ 0 ];
    this.length = 1;
    return this;
  }

  this.length = Math.ceil(number.length / 3);
  this.words = new Array(this.length);
  for (var i = 0; i < this.length; i++)
    this.words[i] = 0;

  var off = 0;
  if (endian === 'be') {
    for (var i = number.length - 1, j = 0; i >= 0; i -= 3) {
      var w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
      this.words[j] |= (w << off) & 0x3ffffff;
      this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
      off += 24;
      if (off >= 26) {
        off -= 26;
        j++;
      }
    }
  } else if (endian === 'le') {
    for (var i = 0, j = 0; i < number.length; i += 3) {
      var w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
      this.words[j] |= (w << off) & 0x3ffffff;
      this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
      off += 24;
      if (off >= 26) {
        off -= 26;
        j++;
      }
    }
  }
  return this.strip();
};

function parseHex(str, start, end) {
  var r = 0;
  var len = Math.min(str.length, end);
  for (var i = start; i < len; i++) {
    var c = str.charCodeAt(i) - 48;

    r <<= 4;

    // 'a' - 'f'
    if (c >= 49 && c <= 54)
      r |= c - 49 + 0xa;

    // 'A' - 'F'
    else if (c >= 17 && c <= 22)
      r |= c - 17 + 0xa;

    // '0' - '9'
    else
      r |= c & 0xf;
  }
  return r;
}

BN.prototype._parseHex = function _parseHex(number, start) {
  // Create possibly bigger array to ensure that it fits the number
  this.length = Math.ceil((number.length - start) / 6);
  this.words = new Array(this.length);
  for (var i = 0; i < this.length; i++)
    this.words[i] = 0;

  // Scan 24-bit chunks and add them to the number
  var off = 0;
  for (var i = number.length - 6, j = 0; i >= start; i -= 6) {
    var w = parseHex(number, i, i + 6);
    this.words[j] |= (w << off) & 0x3ffffff;
    this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
    off += 24;
    if (off >= 26) {
      off -= 26;
      j++;
    }
  }
  if (i + 6 !== start) {
    var w = parseHex(number, start, i + 6);
    this.words[j] |= (w << off) & 0x3ffffff;
    this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
  }
  this.strip();
};

function parseBase(str, start, end, mul) {
  var r = 0;
  var len = Math.min(str.length, end);
  for (var i = start; i < len; i++) {
    var c = str.charCodeAt(i) - 48;

    r *= mul;

    // 'a'
    if (c >= 49)
      r += c - 49 + 0xa;

    // 'A'
    else if (c >= 17)
      r += c - 17 + 0xa;

    // '0' - '9'
    else
      r += c;
  }
  return r;
}

BN.prototype._parseBase = function _parseBase(number, base, start) {
  // Initialize as zero
  this.words = [ 0 ];
  this.length = 1;

  // Find length of limb in base
  for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base)
    limbLen++;
  limbLen--;
  limbPow = (limbPow / base) | 0;

  var total = number.length - start;
  var mod = total % limbLen;
  var end = Math.min(total, total - mod) + start;

  var word = 0;
  for (var i = start; i < end; i += limbLen) {
    word = parseBase(number, i, i + limbLen, base);

    this.imuln(limbPow);
    if (this.words[0] + word < 0x4000000)
      this.words[0] += word;
    else
      this._iaddn(word);
  }

  if (mod !== 0) {
    var pow = 1;
    var word = parseBase(number, i, number.length, base);

    for (var i = 0; i < mod; i++)
      pow *= base;
    this.imuln(pow);
    if (this.words[0] + word < 0x4000000)
      this.words[0] += word;
    else
      this._iaddn(word);
  }
};

BN.prototype.copy = function copy(dest) {
  dest.words = new Array(this.length);
  for (var i = 0; i < this.length; i++)
    dest.words[i] = this.words[i];
  dest.length = this.length;
  dest.sign = this.sign;
  dest.red = this.red;
};

BN.prototype.clone = function clone() {
  var r = new BN(null);
  this.copy(r);
  return r;
};

// Remove leading `0` from `this`
BN.prototype.strip = function strip() {
  while (this.length > 1 && this.words[this.length - 1] === 0)
    this.length--;
  return this._normSign();
};

BN.prototype._normSign = function _normSign() {
  // -0 = 0
  if (this.length === 1 && this.words[0] === 0)
    this.sign = false;
  return this;
};

BN.prototype.inspect = function inspect() {
  return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
};

/*

var zeros = [];
var groupSizes = [];
var groupBases = [];

var s = '';
var i = -1;
while (++i < BN.wordSize) {
  zeros[i] = s;
  s += '0';
}
groupSizes[0] = 0;
groupSizes[1] = 0;
groupBases[0] = 0;
groupBases[1] = 0;
var base = 2 - 1;
while (++base < 36 + 1) {
  var groupSize = 0;
  var groupBase = 1;
  while (groupBase < (1 << BN.wordSize) / base) {
    groupBase *= base;
    groupSize += 1;
  }
  groupSizes[base] = groupSize;
  groupBases[base] = groupBase;
}

*/

var zeros = [
  '',
  '0',
  '00',
  '000',
  '0000',
  '00000',
  '000000',
  '0000000',
  '00000000',
  '000000000',
  '0000000000',
  '00000000000',
  '000000000000',
  '0000000000000',
  '00000000000000',
  '000000000000000',
  '0000000000000000',
  '00000000000000000',
  '000000000000000000',
  '0000000000000000000',
  '00000000000000000000',
  '000000000000000000000',
  '0000000000000000000000',
  '00000000000000000000000',
  '000000000000000000000000',
  '0000000000000000000000000'
];

var groupSizes = [
  0, 0,
  25, 16, 12, 11, 10, 9, 8,
  8, 7, 7, 7, 7, 6, 6,
  6, 6, 6, 6, 6, 5, 5,
  5, 5, 5, 5, 5, 5, 5,
  5, 5, 5, 5, 5, 5, 5
];

var groupBases = [
  0, 0,
  33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
  43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
  16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
  6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
  24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
];

BN.prototype.toString = function toString(base, padding) {
  base = base || 10;
  if (base === 16 || base === 'hex') {
    var out = '';
    var off = 0;
    var padding = padding | 0 || 1;
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var w = this.words[i];
      var word = (((w << off) | carry) & 0xffffff).toString(16);
      carry = (w >>> (24 - off)) & 0xffffff;
      if (carry !== 0 || i !== this.length - 1)
        out = zeros[6 - word.length] + word + out;
      else
        out = word + out;
      off += 2;
      if (off >= 26) {
        off -= 26;
        i--;
      }
    }
    if (carry !== 0)
      out = carry.toString(16) + out;
    while (out.length % padding !== 0)
      out = '0' + out;
    if (this.sign)
      out = '-' + out;
    return out;
  } else if (base === (base | 0) && base >= 2 && base <= 36) {
    // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
    var groupSize = groupSizes[base];
    // var groupBase = Math.pow(base, groupSize);
    var groupBase = groupBases[base];
    var out = '';
    var c = this.clone();
    c.sign = false;
    while (c.cmpn(0) !== 0) {
      var r = c.modn(groupBase).toString(base);
      c = c.idivn(groupBase);

      if (c.cmpn(0) !== 0)
        out = zeros[groupSize - r.length] + r + out;
      else
        out = r + out;
    }
    if (this.cmpn(0) === 0)
      out = '0' + out;
    if (this.sign)
      out = '-' + out;
    return out;
  } else {
    assert(false, 'Base should be between 2 and 36');
  }
};

BN.prototype.toJSON = function toJSON() {
  return this.toString(16);
};

BN.prototype.toArray = function toArray(endian) {
  this.strip();
  var res = new Array(this.byteLength());
  res[0] = 0;

  var q = this.clone();
  if (endian !== 'le') {
    // Assume big-endian
    for (var i = 0; q.cmpn(0) !== 0; i++) {
      var b = q.andln(0xff);
      q.ishrn(8);

      res[res.length - i - 1] = b;
    }
  } else {
    // Assume little-endian
    for (var i = 0; q.cmpn(0) !== 0; i++) {
      var b = q.andln(0xff);
      q.ishrn(8);

      res[i] = b;
    }
  }

  return res;
};

if (Math.clz32) {
  BN.prototype._countBits = function _countBits(w) {
    return 32 - Math.clz32(w);
  };
} else {
  BN.prototype._countBits = function _countBits(w) {
    var t = w;
    var r = 0;
    if (t >= 0x1000) {
      r += 13;
      t >>>= 13;
    }
    if (t >= 0x40) {
      r += 7;
      t >>>= 7;
    }
    if (t >= 0x8) {
      r += 4;
      t >>>= 4;
    }
    if (t >= 0x02) {
      r += 2;
      t >>>= 2;
    }
    return r + t;
  };
}

BN.prototype._zeroBits = function _zeroBits(w) {
  // Short-cut
  if (w === 0)
    return 26;

  var t = w;
  var r = 0;
  if ((t & 0x1fff) === 0) {
    r += 13;
    t >>>= 13;
  }
  if ((t & 0x7f) === 0) {
    r += 7;
    t >>>= 7;
  }
  if ((t & 0xf) === 0) {
    r += 4;
    t >>>= 4;
  }
  if ((t & 0x3) === 0) {
    r += 2;
    t >>>= 2;
  }
  if ((t & 0x1) === 0)
    r++;
  return r;
};

// Return number of used bits in a BN
BN.prototype.bitLength = function bitLength() {
  var hi = 0;
  var w = this.words[this.length - 1];
  var hi = this._countBits(w);
  return (this.length - 1) * 26 + hi;
};

// Number of trailing zero bits
BN.prototype.zeroBits = function zeroBits() {
  if (this.cmpn(0) === 0)
    return 0;

  var r = 0;
  for (var i = 0; i < this.length; i++) {
    var b = this._zeroBits(this.words[i]);
    r += b;
    if (b !== 26)
      break;
  }
  return r;
};

BN.prototype.byteLength = function byteLength() {
  return Math.ceil(this.bitLength() / 8);
};

// Return negative clone of `this`
BN.prototype.neg = function neg() {
  if (this.cmpn(0) === 0)
    return this.clone();

  var r = this.clone();
  r.sign = !this.sign;
  return r;
};


// Or `num` with `this` in-place
BN.prototype.ior = function ior(num) {
  this.sign = this.sign || num.sign;

  while (this.length < num.length)
    this.words[this.length++] = 0;

  for (var i = 0; i < num.length; i++)
    this.words[i] = this.words[i] | num.words[i];

  return this.strip();
};


// Or `num` with `this`
BN.prototype.or = function or(num) {
  if (this.length > num.length)
    return this.clone().ior(num);
  else
    return num.clone().ior(this);
};


// And `num` with `this` in-place
BN.prototype.iand = function iand(num) {
  this.sign = this.sign && num.sign;

  // b = min-length(num, this)
  var b;
  if (this.length > num.length)
    b = num;
  else
    b = this;

  for (var i = 0; i < b.length; i++)
    this.words[i] = this.words[i] & num.words[i];

  this.length = b.length;

  return this.strip();
};


// And `num` with `this`
BN.prototype.and = function and(num) {
  if (this.length > num.length)
    return this.clone().iand(num);
  else
    return num.clone().iand(this);
};


// Xor `num` with `this` in-place
BN.prototype.ixor = function ixor(num) {
  this.sign = this.sign || num.sign;

  // a.length > b.length
  var a;
  var b;
  if (this.length > num.length) {
    a = this;
    b = num;
  } else {
    a = num;
    b = this;
  }

  for (var i = 0; i < b.length; i++)
    this.words[i] = a.words[i] ^ b.words[i];

  if (this !== a)
    for (; i < a.length; i++)
      this.words[i] = a.words[i];

  this.length = a.length;

  return this.strip();
};


// Xor `num` with `this`
BN.prototype.xor = function xor(num) {
  if (this.length > num.length)
    return this.clone().ixor(num);
  else
    return num.clone().ixor(this);
};


// Set `bit` of `this`
BN.prototype.setn = function setn(bit, val) {
  assert(typeof bit === 'number' && bit >= 0);

  var off = (bit / 26) | 0;
  var wbit = bit % 26;

  while (this.length <= off)
    this.words[this.length++] = 0;

  if (val)
    this.words[off] = this.words[off] | (1 << wbit);
  else
    this.words[off] = this.words[off] & ~(1 << wbit);

  return this.strip();
};


// Add `num` to `this` in-place
BN.prototype.iadd = function iadd(num) {
  // negative + positive
  if (this.sign && !num.sign) {
    this.sign = false;
    var r = this.isub(num);
    this.sign = !this.sign;
    return this._normSign();

  // positive + negative
  } else if (!this.sign && num.sign) {
    num.sign = false;
    var r = this.isub(num);
    num.sign = true;
    return r._normSign();
  }

  // a.length > b.length
  var a;
  var b;
  if (this.length > num.length) {
    a = this;
    b = num;
  } else {
    a = num;
    b = this;
  }

  var carry = 0;
  for (var i = 0; i < b.length; i++) {
    var r = a.words[i] + b.words[i] + carry;
    this.words[i] = r & 0x3ffffff;
    carry = r >>> 26;
  }
  for (; carry !== 0 && i < a.length; i++) {
    var r = a.words[i] + carry;
    this.words[i] = r & 0x3ffffff;
    carry = r >>> 26;
  }

  this.length = a.length;
  if (carry !== 0) {
    this.words[this.length] = carry;
    this.length++;
  // Copy the rest of the words
  } else if (a !== this) {
    for (; i < a.length; i++)
      this.words[i] = a.words[i];
  }

  return this;
};

// Add `num` to `this`
BN.prototype.add = function add(num) {
  if (num.sign && !this.sign) {
    num.sign = false;
    var res = this.sub(num);
    num.sign = true;
    return res;
  } else if (!num.sign && this.sign) {
    this.sign = false;
    var res = num.sub(this);
    this.sign = true;
    return res;
  }

  if (this.length > num.length)
    return this.clone().iadd(num);
  else
    return num.clone().iadd(this);
};

// Subtract `num` from `this` in-place
BN.prototype.isub = function isub(num) {
  // this - (-num) = this + num
  if (num.sign) {
    num.sign = false;
    var r = this.iadd(num);
    num.sign = true;
    return r._normSign();

  // -this - num = -(this + num)
  } else if (this.sign) {
    this.sign = false;
    this.iadd(num);
    this.sign = true;
    return this._normSign();
  }

  // At this point both numbers are positive
  var cmp = this.cmp(num);

  // Optimization - zeroify
  if (cmp === 0) {
    this.sign = false;
    this.length = 1;
    this.words[0] = 0;
    return this;
  }

  // a > b
  var a;
  var b;
  if (cmp > 0) {
    a = this;
    b = num;
  } else {
    a = num;
    b = this;
  }

  var carry = 0;
  for (var i = 0; i < b.length; i++) {
    var r = a.words[i] - b.words[i] + carry;
    carry = r >> 26;
    this.words[i] = r & 0x3ffffff;
  }
  for (; carry !== 0 && i < a.length; i++) {
    var r = a.words[i] + carry;
    carry = r >> 26;
    this.words[i] = r & 0x3ffffff;
  }

  // Copy rest of the words
  if (carry === 0 && i < a.length && a !== this)
    for (; i < a.length; i++)
      this.words[i] = a.words[i];
  this.length = Math.max(this.length, i);

  if (a !== this)
    this.sign = true;

  return this.strip();
};

// Subtract `num` from `this`
BN.prototype.sub = function sub(num) {
  return this.clone().isub(num);
};

/*
// NOTE: This could be potentionally used to generate loop-less multiplications
function _genCombMulTo(alen, blen) {
  var len = alen + blen - 1;
  var src = [
    'var a = this.words, b = num.words, o = out.words, c = 0, w, ' +
        'mask = 0x3ffffff, shift = 0x4000000;',
    'out.length = ' + len + ';'
  ];
  for (var k = 0; k < len; k++) {
    var minJ = Math.max(0, k - alen + 1);
    var maxJ = Math.min(k, blen - 1);

    for (var j = minJ; j <= maxJ; j++) {
      var i = k - j;
      var mul = 'a[' + i + '] * b[' + j + ']';

      if (j === minJ) {
        src.push('w = ' + mul + ' + c;');
        src.push('c = (w / shift) | 0;');
      } else {
        src.push('w += ' + mul + ';');
        src.push('c += (w / shift) | 0;');
      }
      src.push('w &= mask;');
    }
    src.push('o[' + k + '] = w;');
  }
  src.push('if (c !== 0) {',
           '  o[' + k + '] = c;',
           '  out.length++;',
           '}',
           'return out;');

  return src.join('\n');
}
*/

BN.prototype._smallMulTo = function _smallMulTo(num, out) {
  out.sign = num.sign !== this.sign;
  out.length = this.length + num.length;

  var carry = 0;
  for (var k = 0; k < out.length - 1; k++) {
    // Sum all words with the same `i + j = k` and accumulate `ncarry`,
    // note that ncarry could be >= 0x3ffffff
    var ncarry = carry >>> 26;
    var rword = carry & 0x3ffffff;
    var maxJ = Math.min(k, num.length - 1);
    for (var j = Math.max(0, k - this.length + 1); j <= maxJ; j++) {
      var i = k - j;
      var a = this.words[i] | 0;
      var b = num.words[j] | 0;
      var r = a * b;

      var lo = r & 0x3ffffff;
      ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
      lo = (lo + rword) | 0;
      rword = lo & 0x3ffffff;
      ncarry = (ncarry + (lo >>> 26)) | 0;
    }
    out.words[k] = rword;
    carry = ncarry;
  }
  if (carry !== 0) {
    out.words[k] = carry;
  } else {
    out.length--;
  }

  return out.strip();
};

BN.prototype._bigMulTo = function _bigMulTo(num, out) {
  out.sign = num.sign !== this.sign;
  out.length = this.length + num.length;

  var carry = 0;
  var hncarry = 0;
  for (var k = 0; k < out.length - 1; k++) {
    // Sum all words with the same `i + j = k` and accumulate `ncarry`,
    // note that ncarry could be >= 0x3ffffff
    var ncarry = hncarry;
    hncarry = 0;
    var rword = carry & 0x3ffffff;
    var maxJ = Math.min(k, num.length - 1);
    for (var j = Math.max(0, k - this.length + 1); j <= maxJ; j++) {
      var i = k - j;
      var a = this.words[i] | 0;
      var b = num.words[j] | 0;
      var r = a * b;

      var lo = r & 0x3ffffff;
      ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
      lo = (lo + rword) | 0;
      rword = lo & 0x3ffffff;
      ncarry = (ncarry + (lo >>> 26)) | 0;

      hncarry += ncarry >>> 26;
      ncarry &= 0x3ffffff;
    }
    out.words[k] = rword;
    carry = ncarry;
    ncarry = hncarry;
  }
  if (carry !== 0) {
    out.words[k] = carry;
  } else {
    out.length--;
  }

  return out.strip();
};

BN.prototype.mulTo = function mulTo(num, out) {
  var res;
  if (this.length + num.length < 63)
    res = this._smallMulTo(num, out);
  else
    res = this._bigMulTo(num, out);
  return res;
};

// Multiply `this` by `num`
BN.prototype.mul = function mul(num) {
  var out = new BN(null);
  out.words = new Array(this.length + num.length);
  return this.mulTo(num, out);
};

// In-place Multiplication
BN.prototype.imul = function imul(num) {
  if (this.cmpn(0) === 0 || num.cmpn(0) === 0) {
    this.words[0] = 0;
    this.length = 1;
    return this;
  }

  var tlen = this.length;
  var nlen = num.length;

  this.sign = num.sign !== this.sign;
  this.length = this.length + num.length;
  this.words[this.length - 1] = 0;

  for (var k = this.length - 2; k >= 0; k--) {
    // Sum all words with the same `i + j = k` and accumulate `carry`,
    // note that carry could be >= 0x3ffffff
    var carry = 0;
    var rword = 0;
    var maxJ = Math.min(k, nlen - 1);
    for (var j = Math.max(0, k - tlen + 1); j <= maxJ; j++) {
      var i = k - j;
      var a = this.words[i];
      var b = num.words[j];
      var r = a * b;

      var lo = r & 0x3ffffff;
      carry += (r / 0x4000000) | 0;
      lo += rword;
      rword = lo & 0x3ffffff;
      carry += lo >>> 26;
    }
    this.words[k] = rword;
    this.words[k + 1] += carry;
    carry = 0;
  }

  // Propagate overflows
  var carry = 0;
  for (var i = 1; i < this.length; i++) {
    var w = this.words[i] + carry;
    this.words[i] = w & 0x3ffffff;
    carry = w >>> 26;
  }

  return this.strip();
};

BN.prototype.imuln = function imuln(num) {
  assert(typeof num === 'number');

  // Carry
  var carry = 0;
  for (var i = 0; i < this.length; i++) {
    var w = this.words[i] * num;
    var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
    carry >>= 26;
    carry += (w / 0x4000000) | 0;
    // NOTE: lo is 27bit maximum
    carry += lo >>> 26;
    this.words[i] = lo & 0x3ffffff;
  }

  if (carry !== 0) {
    this.words[i] = carry;
    this.length++;
  }

  return this;
};

BN.prototype.muln = function muln(num) {
  return this.clone().imuln(num);
};

// `this` * `this`
BN.prototype.sqr = function sqr() {
  return this.mul(this);
};

// `this` * `this` in-place
BN.prototype.isqr = function isqr() {
  return this.mul(this);
};

// Shift-left in-place
BN.prototype.ishln = function ishln(bits) {
  assert(typeof bits === 'number' && bits >= 0);
  var r = bits % 26;
  var s = (bits - r) / 26;
  var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);

  if (r !== 0) {
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var newCarry = this.words[i] & carryMask;
      var c = (this.words[i] - newCarry) << r;
      this.words[i] = c | carry;
      carry = newCarry >>> (26 - r);
    }
    if (carry) {
      this.words[i] = carry;
      this.length++;
    }
  }

  if (s !== 0) {
    for (var i = this.length - 1; i >= 0; i--)
      this.words[i + s] = this.words[i];
    for (var i = 0; i < s; i++)
      this.words[i] = 0;
    this.length += s;
  }

  return this.strip();
};

// Shift-right in-place
// NOTE: `hint` is a lowest bit before trailing zeroes
// NOTE: if `extended` is present - it will be filled with destroyed bits
BN.prototype.ishrn = function ishrn(bits, hint, extended) {
  assert(typeof bits === 'number' && bits >= 0);
  var h;
  if (hint)
    h = (hint - (hint % 26)) / 26;
  else
    h = 0;

  var r = bits % 26;
  var s = Math.min((bits - r) / 26, this.length);
  var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
  var maskedWords = extended;

  h -= s;
  h = Math.max(0, h);

  // Extended mode, copy masked part
  if (maskedWords) {
    for (var i = 0; i < s; i++)
      maskedWords.words[i] = this.words[i];
    maskedWords.length = s;
  }

  if (s === 0) {
    // No-op, we should not move anything at all
  } else if (this.length > s) {
    this.length -= s;
    for (var i = 0; i < this.length; i++)
      this.words[i] = this.words[i + s];
  } else {
    this.words[0] = 0;
    this.length = 1;
  }

  var carry = 0;
  for (var i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
    var word = this.words[i];
    this.words[i] = (carry << (26 - r)) | (word >>> r);
    carry = word & mask;
  }

  // Push carried bits as a mask
  if (maskedWords && carry !== 0)
    maskedWords.words[maskedWords.length++] = carry;

  if (this.length === 0) {
    this.words[0] = 0;
    this.length = 1;
  }

  this.strip();

  return this;
};

// Shift-left
BN.prototype.shln = function shln(bits) {
  return this.clone().ishln(bits);
};

// Shift-right
BN.prototype.shrn = function shrn(bits) {
  return this.clone().ishrn(bits);
};

// Test if n bit is set
BN.prototype.testn = function testn(bit) {
  assert(typeof bit === 'number' && bit >= 0);
  var r = bit % 26;
  var s = (bit - r) / 26;
  var q = 1 << r;

  // Fast case: bit is much higher than all existing words
  if (this.length <= s) {
    return false;
  }

  // Check bit and return
  var w = this.words[s];

  return !!(w & q);
};

// Return only lowers bits of number (in-place)
BN.prototype.imaskn = function imaskn(bits) {
  assert(typeof bits === 'number' && bits >= 0);
  var r = bits % 26;
  var s = (bits - r) / 26;

  assert(!this.sign, 'imaskn works only with positive numbers');

  if (r !== 0)
    s++;
  this.length = Math.min(s, this.length);

  if (r !== 0) {
    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
    this.words[this.length - 1] &= mask;
  }

  return this.strip();
};

// Return only lowers bits of number
BN.prototype.maskn = function maskn(bits) {
  return this.clone().imaskn(bits);
};

// Add plain number `num` to `this`
BN.prototype.iaddn = function iaddn(num) {
  assert(typeof num === 'number');
  if (num < 0)
    return this.isubn(-num);

  // Possible sign change
  if (this.sign) {
    if (this.length === 1 && this.words[0] < num) {
      this.words[0] = num - this.words[0];
      this.sign = false;
      return this;
    }

    this.sign = false;
    this.isubn(num);
    this.sign = true;
    return this;
  }

  // Add without checks
  return this._iaddn(num);
};

BN.prototype._iaddn = function _iaddn(num) {
  this.words[0] += num;

  // Carry
  for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
    this.words[i] -= 0x4000000;
    if (i === this.length - 1)
      this.words[i + 1] = 1;
    else
      this.words[i + 1]++;
  }
  this.length = Math.max(this.length, i + 1);

  return this;
};

// Subtract plain number `num` from `this`
BN.prototype.isubn = function isubn(num) {
  assert(typeof num === 'number');
  if (num < 0)
    return this.iaddn(-num);

  if (this.sign) {
    this.sign = false;
    this.iaddn(num);
    this.sign = true;
    return this;
  }

  this.words[0] -= num;

  // Carry
  for (var i = 0; i < this.length && this.words[i] < 0; i++) {
    this.words[i] += 0x4000000;
    this.words[i + 1] -= 1;
  }

  return this.strip();
};

BN.prototype.addn = function addn(num) {
  return this.clone().iaddn(num);
};

BN.prototype.subn = function subn(num) {
  return this.clone().isubn(num);
};

BN.prototype.iabs = function iabs() {
  this.sign = false;

  return this;
};

BN.prototype.abs = function abs() {
  return this.clone().iabs();
};

BN.prototype._ishlnsubmul = function _ishlnsubmul(num, mul, shift) {
  // Bigger storage is needed
  var len = num.length + shift;
  var i;
  if (this.words.length < len) {
    var t = new Array(len);
    for (var i = 0; i < this.length; i++)
      t[i] = this.words[i];
    this.words = t;
  } else {
    i = this.length;
  }

  // Zeroify rest
  this.length = Math.max(this.length, len);
  for (; i < this.length; i++)
    this.words[i] = 0;

  var carry = 0;
  for (var i = 0; i < num.length; i++) {
    var w = this.words[i + shift] + carry;
    var right = num.words[i] * mul;
    w -= right & 0x3ffffff;
    carry = (w >> 26) - ((right / 0x4000000) | 0);
    this.words[i + shift] = w & 0x3ffffff;
  }
  for (; i < this.length - shift; i++) {
    var w = this.words[i + shift] + carry;
    carry = w >> 26;
    this.words[i + shift] = w & 0x3ffffff;
  }

  if (carry === 0)
    return this.strip();

  // Subtraction overflow
  assert(carry === -1);
  carry = 0;
  for (var i = 0; i < this.length; i++) {
    var w = -this.words[i] + carry;
    carry = w >> 26;
    this.words[i] = w & 0x3ffffff;
  }
  this.sign = true;

  return this.strip();
};

BN.prototype._wordDiv = function _wordDiv(num, mode) {
  var shift = this.length - num.length;

  var a = this.clone();
  var b = num;

  // Normalize
  var bhi = b.words[b.length - 1];
  var bhiBits = this._countBits(bhi);
  shift = 26 - bhiBits;
  if (shift !== 0) {
    b = b.shln(shift);
    a.ishln(shift);
    bhi = b.words[b.length - 1];
  }

  // Initialize quotient
  var m = a.length - b.length;
  var q;

  if (mode !== 'mod') {
    q = new BN(null);
    q.length = m + 1;
    q.words = new Array(q.length);
    for (var i = 0; i < q.length; i++)
      q.words[i] = 0;
  }

  var diff = a.clone()._ishlnsubmul(b, 1, m);
  if (!diff.sign) {
    a = diff;
    if (q)
      q.words[m] = 1;
  }

  for (var j = m - 1; j >= 0; j--) {
    var qj = a.words[b.length + j] * 0x4000000 + a.words[b.length + j - 1];

    // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
    // (0x7ffffff)
    qj = Math.min((qj / bhi) | 0, 0x3ffffff);

    a._ishlnsubmul(b, qj, j);
    while (a.sign) {
      qj--;
      a.sign = false;
      a._ishlnsubmul(b, 1, j);
      if (a.cmpn(0) !== 0)
        a.sign = !a.sign;
    }
    if (q)
      q.words[j] = qj;
  }
  if (q)
    q.strip();
  a.strip();

  // Denormalize
  if (mode !== 'div' && shift !== 0)
    a.ishrn(shift);
  return { div: q ? q : null, mod: a };
};

BN.prototype.divmod = function divmod(num, mode) {
  assert(num.cmpn(0) !== 0);

  if (this.sign && !num.sign) {
    var res = this.neg().divmod(num, mode);
    var div;
    var mod;
    if (mode !== 'mod')
      div = res.div.neg();
    if (mode !== 'div')
      mod = res.mod.cmpn(0) === 0 ? res.mod : num.sub(res.mod);
    return {
      div: div,
      mod: mod
    };
  } else if (!this.sign && num.sign) {
    var res = this.divmod(num.neg(), mode);
    var div;
    if (mode !== 'mod')
      div = res.div.neg();
    return { div: div, mod: res.mod };
  } else if (this.sign && num.sign) {
    return this.neg().divmod(num.neg(), mode);
  }

  // Both numbers are positive at this point

  // Strip both numbers to approximate shift value
  if (num.length > this.length || this.cmp(num) < 0)
    return { div: new BN(0), mod: this };

  // Very short reduction
  if (num.length === 1) {
    if (mode === 'div')
      return { div: this.divn(num.words[0]), mod: null };
    else if (mode === 'mod')
      return { div: null, mod: new BN(this.modn(num.words[0])) };
    return {
      div: this.divn(num.words[0]),
      mod: new BN(this.modn(num.words[0]))
    };
  }

  return this._wordDiv(num, mode);
};

// Find `this` / `num`
BN.prototype.div = function div(num) {
  return this.divmod(num, 'div').div;
};

// Find `this` % `num`
BN.prototype.mod = function mod(num) {
  return this.divmod(num, 'mod').mod;
};

// Find Round(`this` / `num`)
BN.prototype.divRound = function divRound(num) {
  var dm = this.divmod(num);

  // Fast case - exact division
  if (dm.mod.cmpn(0) === 0)
    return dm.div;

  var mod = dm.div.sign ? dm.mod.isub(num) : dm.mod;

  var half = num.shrn(1);
  var r2 = num.andln(1);
  var cmp = mod.cmp(half);

  // Round down
  if (cmp < 0 || r2 === 1 && cmp === 0)
    return dm.div;

  // Round up
  return dm.div.sign ? dm.div.isubn(1) : dm.div.iaddn(1);
};

BN.prototype.modn = function modn(num) {
  assert(num <= 0x3ffffff);
  var p = (1 << 26) % num;

  var acc = 0;
  for (var i = this.length - 1; i >= 0; i--)
    acc = (p * acc + this.words[i]) % num;

  return acc;
};

// In-place division by number
BN.prototype.idivn = function idivn(num) {
  assert(num <= 0x3ffffff);

  var carry = 0;
  for (var i = this.length - 1; i >= 0; i--) {
    var w = this.words[i] + carry * 0x4000000;
    this.words[i] = (w / num) | 0;
    carry = w % num;
  }

  return this.strip();
};

BN.prototype.divn = function divn(num) {
  return this.clone().idivn(num);
};

BN.prototype.egcd = function egcd(p) {
  assert(!p.sign);
  assert(p.cmpn(0) !== 0);

  var x = this;
  var y = p.clone();

  if (x.sign)
    x = x.mod(p);
  else
    x = x.clone();

  // A * x + B * y = x
  var A = new BN(1);
  var B = new BN(0);

  // C * x + D * y = y
  var C = new BN(0);
  var D = new BN(1);

  var g = 0;

  while (x.isEven() && y.isEven()) {
    x.ishrn(1);
    y.ishrn(1);
    ++g;
  }

  var yp = y.clone();
  var xp = x.clone();

  while (x.cmpn(0) !== 0) {
    while (x.isEven()) {
      x.ishrn(1);
      if (A.isEven() && B.isEven()) {
        A.ishrn(1);
        B.ishrn(1);
      } else {
        A.iadd(yp).ishrn(1);
        B.isub(xp).ishrn(1);
      }
    }

    while (y.isEven()) {
      y.ishrn(1);
      if (C.isEven() && D.isEven()) {
        C.ishrn(1);
        D.ishrn(1);
      } else {
        C.iadd(yp).ishrn(1);
        D.isub(xp).ishrn(1);
      }
    }

    if (x.cmp(y) >= 0) {
      x.isub(y);
      A.isub(C);
      B.isub(D);
    } else {
      y.isub(x);
      C.isub(A);
      D.isub(B);
    }
  }

  return {
    a: C,
    b: D,
    gcd: y.ishln(g)
  };
};

// This is reduced incarnation of the binary EEA
// above, designated to invert members of the
// _prime_ fields F(p) at a maximal speed
BN.prototype._invmp = function _invmp(p) {
  assert(!p.sign);
  assert(p.cmpn(0) !== 0);

  var a = this;
  var b = p.clone();

  if (a.sign)
    a = a.mod(p);
  else
    a = a.clone();

  var x1 = new BN(1);
  var x2 = new BN(0);

  var delta = b.clone();

  while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
    while (a.isEven()) {
      a.ishrn(1);
      if (x1.isEven())
        x1.ishrn(1);
      else
        x1.iadd(delta).ishrn(1);
    }
    while (b.isEven()) {
      b.ishrn(1);
      if (x2.isEven())
        x2.ishrn(1);
      else
        x2.iadd(delta).ishrn(1);
    }
    if (a.cmp(b) >= 0) {
      a.isub(b);
      x1.isub(x2);
    } else {
      b.isub(a);
      x2.isub(x1);
    }
  }
  if (a.cmpn(1) === 0)
    return x1;
  else
    return x2;
};

BN.prototype.gcd = function gcd(num) {
  if (this.cmpn(0) === 0)
    return num.clone();
  if (num.cmpn(0) === 0)
    return this.clone();

  var a = this.clone();
  var b = num.clone();
  a.sign = false;
  b.sign = false;

  // Remove common factor of two
  for (var shift = 0; a.isEven() && b.isEven(); shift++) {
    a.ishrn(1);
    b.ishrn(1);
  }

  do {
    while (a.isEven())
      a.ishrn(1);
    while (b.isEven())
      b.ishrn(1);

    var r = a.cmp(b);
    if (r < 0) {
      // Swap `a` and `b` to make `a` always bigger than `b`
      var t = a;
      a = b;
      b = t;
    } else if (r === 0 || b.cmpn(1) === 0) {
      break;
    }

    a.isub(b);
  } while (true);

  return b.ishln(shift);
};

// Invert number in the field F(num)
BN.prototype.invm = function invm(num) {
  return this.egcd(num).a.mod(num);
};

BN.prototype.isEven = function isEven() {
  return (this.words[0] & 1) === 0;
};

BN.prototype.isOdd = function isOdd() {
  return (this.words[0] & 1) === 1;
};

// And first word and num
BN.prototype.andln = function andln(num) {
  return this.words[0] & num;
};

// Increment at the bit position in-line
BN.prototype.bincn = function bincn(bit) {
  assert(typeof bit === 'number');
  var r = bit % 26;
  var s = (bit - r) / 26;
  var q = 1 << r;

  // Fast case: bit is much higher than all existing words
  if (this.length <= s) {
    for (var i = this.length; i < s + 1; i++)
      this.words[i] = 0;
    this.words[s] |= q;
    this.length = s + 1;
    return this;
  }

  // Add bit and propagate, if needed
  var carry = q;
  for (var i = s; carry !== 0 && i < this.length; i++) {
    var w = this.words[i];
    w += carry;
    carry = w >>> 26;
    w &= 0x3ffffff;
    this.words[i] = w;
  }
  if (carry !== 0) {
    this.words[i] = carry;
    this.length++;
  }
  return this;
};

BN.prototype.cmpn = function cmpn(num) {
  var sign = num < 0;
  if (sign)
    num = -num;

  if (this.sign && !sign)
    return -1;
  else if (!this.sign && sign)
    return 1;

  num &= 0x3ffffff;
  this.strip();

  var res;
  if (this.length > 1) {
    res = 1;
  } else {
    var w = this.words[0];
    res = w === num ? 0 : w < num ? -1 : 1;
  }
  if (this.sign)
    res = -res;
  return res;
};

// Compare two numbers and return:
// 1 - if `this` > `num`
// 0 - if `this` == `num`
// -1 - if `this` < `num`
BN.prototype.cmp = function cmp(num) {
  if (this.sign && !num.sign)
    return -1;
  else if (!this.sign && num.sign)
    return 1;

  var res = this.ucmp(num);
  if (this.sign)
    return -res;
  else
    return res;
};

// Unsigned comparison
BN.prototype.ucmp = function ucmp(num) {
  // At this point both numbers have the same sign
  if (this.length > num.length)
    return 1;
  else if (this.length < num.length)
    return -1;

  var res = 0;
  for (var i = this.length - 1; i >= 0; i--) {
    var a = this.words[i];
    var b = num.words[i];

    if (a === b)
      continue;
    if (a < b)
      res = -1;
    else if (a > b)
      res = 1;
    break;
  }
  return res;
};

//
// A reduce context, could be using montgomery or something better, depending
// on the `m` itself.
//
BN.red = function red(num) {
  return new Red(num);
};

BN.prototype.toRed = function toRed(ctx) {
  assert(!this.red, 'Already a number in reduction context');
  assert(!this.sign, 'red works only with positives');
  return ctx.convertTo(this)._forceRed(ctx);
};

BN.prototype.fromRed = function fromRed() {
  assert(this.red, 'fromRed works only with numbers in reduction context');
  return this.red.convertFrom(this);
};

BN.prototype._forceRed = function _forceRed(ctx) {
  this.red = ctx;
  return this;
};

BN.prototype.forceRed = function forceRed(ctx) {
  assert(!this.red, 'Already a number in reduction context');
  return this._forceRed(ctx);
};

BN.prototype.redAdd = function redAdd(num) {
  assert(this.red, 'redAdd works only with red numbers');
  return this.red.add(this, num);
};

BN.prototype.redIAdd = function redIAdd(num) {
  assert(this.red, 'redIAdd works only with red numbers');
  return this.red.iadd(this, num);
};

BN.prototype.redSub = function redSub(num) {
  assert(this.red, 'redSub works only with red numbers');
  return this.red.sub(this, num);
};

BN.prototype.redISub = function redISub(num) {
  assert(this.red, 'redISub works only with red numbers');
  return this.red.isub(this, num);
};

BN.prototype.redShl = function redShl(num) {
  assert(this.red, 'redShl works only with red numbers');
  return this.red.shl(this, num);
};

BN.prototype.redMul = function redMul(num) {
  assert(this.red, 'redMul works only with red numbers');
  this.red._verify2(this, num);
  return this.red.mul(this, num);
};

BN.prototype.redIMul = function redIMul(num) {
  assert(this.red, 'redMul works only with red numbers');
  this.red._verify2(this, num);
  return this.red.imul(this, num);
};

BN.prototype.redSqr = function redSqr() {
  assert(this.red, 'redSqr works only with red numbers');
  this.red._verify1(this);
  return this.red.sqr(this);
};

BN.prototype.redISqr = function redISqr() {
  assert(this.red, 'redISqr works only with red numbers');
  this.red._verify1(this);
  return this.red.isqr(this);
};

// Square root over p
BN.prototype.redSqrt = function redSqrt() {
  assert(this.red, 'redSqrt works only with red numbers');
  this.red._verify1(this);
  return this.red.sqrt(this);
};

BN.prototype.redInvm = function redInvm() {
  assert(this.red, 'redInvm works only with red numbers');
  this.red._verify1(this);
  return this.red.invm(this);
};

// Return negative clone of `this` % `red modulo`
BN.prototype.redNeg = function redNeg() {
  assert(this.red, 'redNeg works only with red numbers');
  this.red._verify1(this);
  return this.red.neg(this);
};

BN.prototype.redPow = function redPow(num) {
  assert(this.red && !num.red, 'redPow(normalNum)');
  this.red._verify1(this);
  return this.red.pow(this, num);
};

// Prime numbers with efficient reduction
var primes = {
  k256: null,
  p224: null,
  p192: null,
  p25519: null
};

// Pseudo-Mersenne prime
function MPrime(name, p) {
  // P = 2 ^ N - K
  this.name = name;
  this.p = new BN(p, 16);
  this.n = this.p.bitLength();
  this.k = new BN(1).ishln(this.n).isub(this.p);

  this.tmp = this._tmp();
}

MPrime.prototype._tmp = function _tmp() {
  var tmp = new BN(null);
  tmp.words = new Array(Math.ceil(this.n / 13));
  return tmp;
};

MPrime.prototype.ireduce = function ireduce(num) {
  // Assumes that `num` is less than `P^2`
  // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
  var r = num;
  var rlen;

  do {
    this.split(r, this.tmp);
    r = this.imulK(r);
    r = r.iadd(this.tmp);
    rlen = r.bitLength();
  } while (rlen > this.n);

  var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
  if (cmp === 0) {
    r.words[0] = 0;
    r.length = 1;
  } else if (cmp > 0) {
    r.isub(this.p);
  } else {
    r.strip();
  }

  return r;
};

MPrime.prototype.split = function split(input, out) {
  input.ishrn(this.n, 0, out);
};

MPrime.prototype.imulK = function imulK(num) {
  return num.imul(this.k);
};

function K256() {
  MPrime.call(
    this,
    'k256',
    'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
}
inherits(K256, MPrime);

K256.prototype.split = function split(input, output) {
  // 256 = 9 * 26 + 22
  var mask = 0x3fffff;

  var outLen = Math.min(input.length, 9);
  for (var i = 0; i < outLen; i++)
    output.words[i] = input.words[i];
  output.length = outLen;

  if (input.length <= 9) {
    input.words[0] = 0;
    input.length = 1;
    return;
  }

  // Shift by 9 limbs
  var prev = input.words[9];
  output.words[output.length++] = prev & mask;

  for (var i = 10; i < input.length; i++) {
    var next = input.words[i];
    input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
    prev = next;
  }
  input.words[i - 10] = prev >>> 22;
  input.length -= 9;
};

K256.prototype.imulK = function imulK(num) {
  // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
  num.words[num.length] = 0;
  num.words[num.length + 1] = 0;
  num.length += 2;

  // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
  var hi;
  var lo = 0;
  for (var i = 0; i < num.length; i++) {
    var w = num.words[i];
    hi = w * 0x40;
    lo += w * 0x3d1;
    hi += (lo / 0x4000000) | 0;
    lo &= 0x3ffffff;

    num.words[i] = lo;

    lo = hi;
  }

  // Fast length reduction
  if (num.words[num.length - 1] === 0) {
    num.length--;
    if (num.words[num.length - 1] === 0)
      num.length--;
  }
  return num;
};

function P224() {
  MPrime.call(
    this,
    'p224',
    'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
}
inherits(P224, MPrime);

function P192() {
  MPrime.call(
    this,
    'p192',
    'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
}
inherits(P192, MPrime);

function P25519() {
  // 2 ^ 255 - 19
  MPrime.call(
    this,
    '25519',
    '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
}
inherits(P25519, MPrime);

P25519.prototype.imulK = function imulK(num) {
  // K = 0x13
  var carry = 0;
  for (var i = 0; i < num.length; i++) {
    var hi = num.words[i] * 0x13 + carry;
    var lo = hi & 0x3ffffff;
    hi >>>= 26;

    num.words[i] = lo;
    carry = hi;
  }
  if (carry !== 0)
    num.words[num.length++] = carry;
  return num;
};

// Exported mostly for testing purposes, use plain name instead
BN._prime = function prime(name) {
  // Cached version of prime
  if (primes[name])
    return primes[name];

  var prime;
  if (name === 'k256')
    prime = new K256();
  else if (name === 'p224')
    prime = new P224();
  else if (name === 'p192')
    prime = new P192();
  else if (name === 'p25519')
    prime = new P25519();
  else
    throw new Error('Unknown prime ' + name);
  primes[name] = prime;

  return prime;
};

//
// Base reduction engine
//
function Red(m) {
  if (typeof m === 'string') {
    var prime = BN._prime(m);
    this.m = prime.p;
    this.prime = prime;
  } else {
    this.m = m;
    this.prime = null;
  }
}

Red.prototype._verify1 = function _verify1(a) {
  assert(!a.sign, 'red works only with positives');
  assert(a.red, 'red works only with red numbers');
};

Red.prototype._verify2 = function _verify2(a, b) {
  assert(!a.sign && !b.sign, 'red works only with positives');
  assert(a.red && a.red === b.red,
         'red works only with red numbers');
};

Red.prototype.imod = function imod(a) {
  if (this.prime)
    return this.prime.ireduce(a)._forceRed(this);
  return a.mod(this.m)._forceRed(this);
};

Red.prototype.neg = function neg(a) {
  var r = a.clone();
  r.sign = !r.sign;
  return r.iadd(this.m)._forceRed(this);
};

Red.prototype.add = function add(a, b) {
  this._verify2(a, b);

  var res = a.add(b);
  if (res.cmp(this.m) >= 0)
    res.isub(this.m);
  return res._forceRed(this);
};

Red.prototype.iadd = function iadd(a, b) {
  this._verify2(a, b);

  var res = a.iadd(b);
  if (res.cmp(this.m) >= 0)
    res.isub(this.m);
  return res;
};

Red.prototype.sub = function sub(a, b) {
  this._verify2(a, b);

  var res = a.sub(b);
  if (res.cmpn(0) < 0)
    res.iadd(this.m);
  return res._forceRed(this);
};

Red.prototype.isub = function isub(a, b) {
  this._verify2(a, b);

  var res = a.isub(b);
  if (res.cmpn(0) < 0)
    res.iadd(this.m);
  return res;
};

Red.prototype.shl = function shl(a, num) {
  this._verify1(a);
  return this.imod(a.shln(num));
};

Red.prototype.imul = function imul(a, b) {
  this._verify2(a, b);
  return this.imod(a.imul(b));
};

Red.prototype.mul = function mul(a, b) {
  this._verify2(a, b);
  return this.imod(a.mul(b));
};

Red.prototype.isqr = function isqr(a) {
  return this.imul(a, a);
};

Red.prototype.sqr = function sqr(a) {
  return this.mul(a, a);
};

Red.prototype.sqrt = function sqrt(a) {
  if (a.cmpn(0) === 0)
    return a.clone();

  var mod3 = this.m.andln(3);
  assert(mod3 % 2 === 1);

  // Fast case
  if (mod3 === 3) {
    var pow = this.m.add(new BN(1)).ishrn(2);
    var r = this.pow(a, pow);
    return r;
  }

  // Tonelli-Shanks algorithm (Totally unoptimized and slow)
  //
  // Find Q and S, that Q * 2 ^ S = (P - 1)
  var q = this.m.subn(1);
  var s = 0;
  while (q.cmpn(0) !== 0 && q.andln(1) === 0) {
    s++;
    q.ishrn(1);
  }
  assert(q.cmpn(0) !== 0);

  var one = new BN(1).toRed(this);
  var nOne = one.redNeg();

  // Find quadratic non-residue
  // NOTE: Max is such because of generalized Riemann hypothesis.
  var lpow = this.m.subn(1).ishrn(1);
  var z = this.m.bitLength();
  z = new BN(2 * z * z).toRed(this);
  while (this.pow(z, lpow).cmp(nOne) !== 0)
    z.redIAdd(nOne);

  var c = this.pow(z, q);
  var r = this.pow(a, q.addn(1).ishrn(1));
  var t = this.pow(a, q);
  var m = s;
  while (t.cmp(one) !== 0) {
    var tmp = t;
    for (var i = 0; tmp.cmp(one) !== 0; i++)
      tmp = tmp.redSqr();
    assert(i < m);
    var b = this.pow(c, new BN(1).ishln(m - i - 1));

    r = r.redMul(b);
    c = b.redSqr();
    t = t.redMul(c);
    m = i;
  }

  return r;
};

Red.prototype.invm = function invm(a) {
  var inv = a._invmp(this.m);
  if (inv.sign) {
    inv.sign = false;
    return this.imod(inv).redNeg();
  } else {
    return this.imod(inv);
  }
};

Red.prototype.pow = function pow(a, num) {
  var w = [];

  if (num.cmpn(0) === 0)
    return new BN(1);

  var q = num.clone();

  while (q.cmpn(0) !== 0) {
    w.push(q.andln(1));
    q.ishrn(1);
  }

  // Skip leading zeroes
  var res = a;
  for (var i = 0; i < w.length; i++, res = this.sqr(res))
    if (w[i] !== 0)
      break;

  if (++i < w.length) {
    for (var q = this.sqr(res); i < w.length; i++, q = this.sqr(q)) {
      if (w[i] === 0)
        continue;
      res = this.mul(res, q);
    }
  }

  return res;
};

Red.prototype.convertTo = function convertTo(num) {
  var r = num.mod(this.m);
  if (r === num)
    return r.clone();
  else
    return r;
};

Red.prototype.convertFrom = function convertFrom(num) {
  var res = num.clone();
  res.red = null;
  return res;
};

//
// Montgomery method engine
//

BN.mont = function mont(num) {
  return new Mont(num);
};

function Mont(m) {
  Red.call(this, m);

  this.shift = this.m.bitLength();
  if (this.shift % 26 !== 0)
    this.shift += 26 - (this.shift % 26);
  this.r = new BN(1).ishln(this.shift);
  this.r2 = this.imod(this.r.sqr());
  this.rinv = this.r._invmp(this.m);

  this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
  this.minv.sign = true;
  this.minv = this.minv.mod(this.r);
}
inherits(Mont, Red);

Mont.prototype.convertTo = function convertTo(num) {
  return this.imod(num.shln(this.shift));
};

Mont.prototype.convertFrom = function convertFrom(num) {
  var r = this.imod(num.mul(this.rinv));
  r.red = null;
  return r;
};

Mont.prototype.imul = function imul(a, b) {
  if (a.cmpn(0) === 0 || b.cmpn(0) === 0) {
    a.words[0] = 0;
    a.length = 1;
    return a;
  }

  var t = a.imul(b);
  var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
  var u = t.isub(c).ishrn(this.shift);
  var res = u;
  if (u.cmp(this.m) >= 0)
    res = u.isub(this.m);
  else if (u.cmpn(0) < 0)
    res = u.iadd(this.m);

  return res._forceRed(this);
};

Mont.prototype.mul = function mul(a, b) {
  if (a.cmpn(0) === 0 || b.cmpn(0) === 0)
    return new BN(0)._forceRed(this);

  var t = a.mul(b);
  var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
  var u = t.isub(c).ishrn(this.shift);
  var res = u;
  if (u.cmp(this.m) >= 0)
    res = u.isub(this.m);
  else if (u.cmpn(0) < 0)
    res = u.iadd(this.m);

  return res._forceRed(this);
};

Mont.prototype.invm = function invm(a) {
  // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
  var res = this.imod(a._invmp(this.m).mul(this.r2));
  return res._forceRed(this);
};

})(typeof module === 'undefined' || module, this);

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/constants/der.js":[function(require,module,exports){
var constants = require('../constants');

exports.tagClass = {
  0: 'universal',
  1: 'application',
  2: 'context',
  3: 'private'
};
exports.tagClassByName = constants._reverse(exports.tagClass);

exports.tag = {
  0x00: 'end',
  0x01: 'bool',
  0x02: 'int',
  0x03: 'bitstr',
  0x04: 'octstr',
  0x05: 'null_',
  0x06: 'objid',
  0x07: 'objDesc',
  0x08: 'external',
  0x09: 'real',
  0x0a: 'enum',
  0x0b: 'embed',
  0x0c: 'utf8str',
  0x0d: 'relativeOid',
  0x10: 'seq',
  0x11: 'set',
  0x12: 'numstr',
  0x13: 'printstr',
  0x14: 't61str',
  0x15: 'videostr',
  0x16: 'ia5str',
  0x17: 'utctime',
  0x18: 'gentime',
  0x19: 'graphstr',
  0x1a: 'iso646str',
  0x1b: 'genstr',
  0x1c: 'unistr',
  0x1d: 'charstr',
  0x1e: 'bmpstr'
};
exports.tagByName = constants._reverse(exports.tag);

},{"../constants":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/constants/index.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/constants/index.js":[function(require,module,exports){
var constants = exports;

// Helper
constants._reverse = function reverse(map) {
  var res = {};

  Object.keys(map).forEach(function(key) {
    // Convert key to integer if it is stringified
    if ((key | 0) == key)
      key = key | 0;

    var value = map[key];
    res[value] = key;
  });

  return res;
};

constants.der = require('./der');

},{"./der":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/constants/der.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/decoders/der.js":[function(require,module,exports){
var inherits = require('util').inherits;

var asn1 = require('../asn1');
var base = asn1.base;
var bignum = asn1.bignum;

// Import DER constants
var der = asn1.constants.der;

function DERDecoder(entity) {
  this.enc = 'der';
  this.name = entity.name;
  this.entity = entity;

  // Construct base tree
  this.tree = new DERNode();
  this.tree._init(entity.body);
};
module.exports = DERDecoder;

DERDecoder.prototype.decode = function decode(data, options) {
  if (!(data instanceof base.DecoderBuffer))
    data = new base.DecoderBuffer(data, options);

  return this.tree._decode(data, options);
};

// Tree methods

function DERNode(parent) {
  base.Node.call(this, 'der', parent);
}
inherits(DERNode, base.Node);

DERNode.prototype._peekTag = function peekTag(buffer, tag, any) {
  if (buffer.isEmpty())
    return false;

  var state = buffer.save();
  var decodedTag = derDecodeTag(buffer, 'Failed to peek tag: "' + tag + '"');
  if (buffer.isError(decodedTag))
    return decodedTag;

  buffer.restore(state);

  return decodedTag.tag === tag || decodedTag.tagStr === tag || any;
};

DERNode.prototype._decodeTag = function decodeTag(buffer, tag, any) {
  var decodedTag = derDecodeTag(buffer,
                                'Failed to decode tag of "' + tag + '"');
  if (buffer.isError(decodedTag))
    return decodedTag;

  var len = derDecodeLen(buffer,
                         decodedTag.primitive,
                         'Failed to get length of "' + tag + '"');

  // Failure
  if (buffer.isError(len))
    return len;

  if (!any &&
      decodedTag.tag !== tag &&
      decodedTag.tagStr !== tag &&
      decodedTag.tagStr + 'of' !== tag) {
    return buffer.error('Failed to match tag: "' + tag + '"');
  }

  if (decodedTag.primitive || len !== null)
    return buffer.skip(len, 'Failed to match body of: "' + tag + '"');

  // Indefinite length... find END tag
  var state = buffer.save();
  var res = this._skipUntilEnd(
      buffer,
      'Failed to skip indefinite length body: "' + this.tag + '"');
  if (buffer.isError(res))
    return res;

  len = buffer.offset - state.offset;
  buffer.restore(state);
  return buffer.skip(len, 'Failed to match body of: "' + tag + '"');
};

DERNode.prototype._skipUntilEnd = function skipUntilEnd(buffer, fail) {
  while (true) {
    var tag = derDecodeTag(buffer, fail);
    if (buffer.isError(tag))
      return tag;
    var len = derDecodeLen(buffer, tag.primitive, fail);
    if (buffer.isError(len))
      return len;

    var res;
    if (tag.primitive || len !== null)
      res = buffer.skip(len)
    else
      res = this._skipUntilEnd(buffer, fail);

    // Failure
    if (buffer.isError(res))
      return res;

    if (tag.tagStr === 'end')
      break;
  }
};

DERNode.prototype._decodeList = function decodeList(buffer, tag, decoder) {
  var result = [];
  while (!buffer.isEmpty()) {
    var possibleEnd = this._peekTag(buffer, 'end');
    if (buffer.isError(possibleEnd))
      return possibleEnd;

    var res = decoder.decode(buffer, 'der');
    if (buffer.isError(res) && possibleEnd)
      break;
    result.push(res);
  }
  return result;
};

DERNode.prototype._decodeStr = function decodeStr(buffer, tag) {
  if (tag === 'octstr') {
    return buffer.raw();
  } else if (tag === 'bitstr') {
    var unused = buffer.readUInt8();
    if (buffer.isError(unused))
      return unused;

    return { unused: unused, data: buffer.raw() };
  } else if (tag === 'ia5str' || tag === 'utf8str') {
    return buffer.raw().toString();
  } else {
    return this.error('Decoding of string type: ' + tag + ' unsupported');
  }
};

DERNode.prototype._decodeObjid = function decodeObjid(buffer, values, relative) {
  var identifiers = [];
  var ident = 0;
  while (!buffer.isEmpty()) {
    var subident = buffer.readUInt8();
    ident <<= 7;
    ident |= subident & 0x7f;
    if ((subident & 0x80) === 0) {
      identifiers.push(ident);
      ident = 0;
    }
  }
  if (subident & 0x80)
    identifiers.push(ident);

  var first = (identifiers[0] / 40) | 0;
  var second = identifiers[0] % 40;

  if (relative)
    result = identifiers;
  else
    result = [first, second].concat(identifiers.slice(1));

  if (values)
    result = values[result.join(' ')];

  return result;
};

DERNode.prototype._decodeTime = function decodeTime(buffer, tag) {
  var str = buffer.raw().toString();
  if (tag === 'gentime') {
    var year = str.slice(0, 4) | 0;
    var mon = str.slice(4, 6) | 0;
    var day = str.slice(6, 8) | 0;
    var hour = str.slice(8, 10) | 0;
    var min = str.slice(10, 12) | 0;
    var sec = str.slice(12, 14) | 0;
  } else if (tag === 'utctime') {
    var year = str.slice(0, 2) | 0;
    var mon = str.slice(2, 4) | 0;
    var day = str.slice(4, 6) | 0;
    var hour = str.slice(6, 8) | 0;
    var min = str.slice(8, 10) | 0;
    var sec = str.slice(10, 12) | 0;
    if (year < 70)
      year = 2000 + year;
    else
      year = 1900 + year;
  } else {
    return this.error('Decoding ' + tag + ' time is not supported yet');
  }

  return Date.UTC(year, mon - 1, day, hour, min, sec, 0);
};

DERNode.prototype._decodeNull = function decodeNull(buffer) {
  return null;
};

DERNode.prototype._decodeBool = function decodeBool(buffer) {
  var res = buffer.readUInt8();
  if (buffer.isError(res))
    return res;
  else
    return res !== 0;
};

DERNode.prototype._decodeInt = function decodeInt(buffer, values) {
  // Bigint, return as it is (assume big endian)
  var raw = buffer.raw();
  var res = new bignum(raw);

  if (values)
    res = values[res.toString(10)] || res;

  return res;
};

DERNode.prototype._use = function use(entity, obj) {
  if (typeof entity === 'function')
    entity = entity(obj);
  return entity._getDecoder('der').tree;
};

// Utility methods

function derDecodeTag(buf, fail) {
  var tag = buf.readUInt8(fail);
  if (buf.isError(tag))
    return tag;

  var cls = der.tagClass[tag >> 6];
  var primitive = (tag & 0x20) === 0;

  // Multi-octet tag - load
  if ((tag & 0x1f) === 0x1f) {
    var oct = tag;
    tag = 0;
    while ((oct & 0x80) === 0x80) {
      oct = buf.readUInt8(fail);
      if (buf.isError(oct))
        return oct;

      tag <<= 7;
      tag |= oct & 0x7f;
    }
  } else {
    tag &= 0x1f;
  }
  var tagStr = der.tag[tag];

  return {
    cls: cls,
    primitive: primitive,
    tag: tag,
    tagStr: tagStr
  };
}

function derDecodeLen(buf, primitive, fail) {
  var len = buf.readUInt8(fail);
  if (buf.isError(len))
    return len;

  // Indefinite form
  if (!primitive && len === 0x80)
    return null;

  // Definite form
  if ((len & 0x80) === 0) {
    // Short form
    return len;
  }

  // Long form
  var num = len & 0x7f;
  if (num >= 4)
    return buf.error('length octect is too long');

  len = 0;
  for (var i = 0; i < num; i++) {
    len <<= 8;
    var j = buf.readUInt8(fail);
    if (buf.isError(j))
      return j;
    len |= j;
  }

  return len;
}

},{"../asn1":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/asn1.js","util":"util"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/decoders/index.js":[function(require,module,exports){
var decoders = exports;

decoders.der = require('./der');
decoders.pem = require('./pem');

},{"./der":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/decoders/der.js","./pem":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/decoders/pem.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/decoders/pem.js":[function(require,module,exports){
var inherits = require('util').inherits;
var Buffer = require('buffer').Buffer;

var asn1 = require('../asn1');
var DERDecoder = require('./der');

function PEMDecoder(entity) {
  DERDecoder.call(this, entity);
  this.enc = 'pem';
};
inherits(PEMDecoder, DERDecoder);
module.exports = PEMDecoder;

PEMDecoder.prototype.decode = function decode(data, options) {
  var lines = data.toString().split(/[\r\n]+/g);

  var label = options.label.toUpperCase();

  var re = /^-----(BEGIN|END) ([^-]+)-----$/;
  var start = -1;
  var end = -1;
  for (var i = 0; i < lines.length; i++) {
    var match = lines[i].match(re);
    if (match === null)
      continue;

    if (match[2] !== label)
      continue;

    if (start === -1) {
      if (match[1] !== 'BEGIN')
        break;
      start = i;
    } else {
      if (match[1] !== 'END')
        break;
      end = i;
      break;
    }
  }
  if (start === -1 || end === -1)
    throw new Error('PEM section not found for: ' + label);

  var base64 = lines.slice(start + 1, end).join('');
  // Remove excessive symbols
  base64.replace(/[^a-z0-9\+\/=]+/gi, '');

  var input = new Buffer(base64, 'base64');
  return DERDecoder.prototype.decode.call(this, input, options);
};

},{"../asn1":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/asn1.js","./der":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/decoders/der.js","buffer":"buffer","util":"util"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/encoders/der.js":[function(require,module,exports){
var inherits = require('util').inherits;
var Buffer = require('buffer').Buffer;

var asn1 = require('../asn1');
var base = asn1.base;
var bignum = asn1.bignum;

// Import DER constants
var der = asn1.constants.der;

function DEREncoder(entity) {
  this.enc = 'der';
  this.name = entity.name;
  this.entity = entity;

  // Construct base tree
  this.tree = new DERNode();
  this.tree._init(entity.body);
};
module.exports = DEREncoder;

DEREncoder.prototype.encode = function encode(data, reporter) {
  return this.tree._encode(data, reporter).join();
};

// Tree methods

function DERNode(parent) {
  base.Node.call(this, 'der', parent);
}
inherits(DERNode, base.Node);

DERNode.prototype._encodeComposite = function encodeComposite(tag,
                                                              primitive,
                                                              cls,
                                                              content) {
  var encodedTag = encodeTag(tag, primitive, cls, this.reporter);

  // Short form
  if (content.length < 0x80) {
    var header = new Buffer(2);
    header[0] = encodedTag;
    header[1] = content.length;
    return this._createEncoderBuffer([ header, content ]);
  }

  // Long form
  // Count octets required to store length
  var lenOctets = 1;
  for (var i = content.length; i >= 0x100; i >>= 8)
    lenOctets++;

  var header = new Buffer(1 + 1 + lenOctets);
  header[0] = encodedTag;
  header[1] = 0x80 | lenOctets;

  for (var i = 1 + lenOctets, j = content.length; j > 0; i--, j >>= 8)
    header[i] = j & 0xff;

  return this._createEncoderBuffer([ header, content ]);
};

DERNode.prototype._encodeStr = function encodeStr(str, tag) {
  if (tag === 'octstr')
    return this._createEncoderBuffer(str);
  else if (tag === 'bitstr')
    return this._createEncoderBuffer([ str.unused | 0, str.data ]);
  else if (tag === 'ia5str' || tag === 'utf8str')
    return this._createEncoderBuffer(str);
  return this.reporter.error('Encoding of string type: ' + tag +
                             ' unsupported');
};

DERNode.prototype._encodeObjid = function encodeObjid(id, values, relative) {
  if (typeof id === 'string') {
    if (!values)
      return this.reporter.error('string objid given, but no values map found');
    if (!values.hasOwnProperty(id))
      return this.reporter.error('objid not found in values map');
    id = values[id].split(/[\s\.]+/g);
    for (var i = 0; i < id.length; i++)
      id[i] |= 0;
  } else if (Array.isArray(id)) {
    id = id.slice();
    for (var i = 0; i < id.length; i++)
      id[i] |= 0;
  }

  if (!Array.isArray(id)) {
    return this.reporter.error('objid() should be either array or string, ' +
                               'got: ' + JSON.stringify(id));
  }

  if (!relative) {
    if (id[1] >= 40)
      return this.reporter.error('Second objid identifier OOB');
    id.splice(0, 2, id[0] * 40 + id[1]);
  }

  // Count number of octets
  var size = 0;
  for (var i = 0; i < id.length; i++) {
    var ident = id[i];
    for (size++; ident >= 0x80; ident >>= 7)
      size++;
  }

  var objid = new Buffer(size);
  var offset = objid.length - 1;
  for (var i = id.length - 1; i >= 0; i--) {
    var ident = id[i];
    objid[offset--] = ident & 0x7f;
    while ((ident >>= 7) > 0)
      objid[offset--] = 0x80 | (ident & 0x7f);
  }

  return this._createEncoderBuffer(objid);
};

function two(num) {
  if (num < 10)
    return '0' + num;
  else
    return num;
}

DERNode.prototype._encodeTime = function encodeTime(time, tag) {
  var str;
  var date = new Date(time);

  if (tag === 'gentime') {
    str = [
      two(date.getFullYear()),
      two(date.getUTCMonth() + 1),
      two(date.getUTCDate()),
      two(date.getUTCHours()),
      two(date.getUTCMinutes()),
      two(date.getUTCSeconds()),
      'Z'
    ].join('');
  } else if (tag === 'utctime') {
    str = [
      two(date.getFullYear() % 100),
      two(date.getUTCMonth() + 1),
      two(date.getUTCDate()),
      two(date.getUTCHours()),
      two(date.getUTCMinutes()),
      two(date.getUTCSeconds()),
      'Z'
    ].join('');
  } else {
    this.reporter.error('Encoding ' + tag + ' time is not supported yet');
  }

  return this._encodeStr(str, 'octstr');
};

DERNode.prototype._encodeNull = function encodeNull() {
  return this._createEncoderBuffer('');
};

DERNode.prototype._encodeInt = function encodeInt(num, values) {
  if (typeof num === 'string') {
    if (!values)
      return this.reporter.error('String int or enum given, but no values map');
    if (!values.hasOwnProperty(num)) {
      return this.reporter.error('Values map doesn\'t contain: ' +
                                 JSON.stringify(num));
    }
    num = values[num];
  }

  // Bignum, assume big endian
  if (typeof num !== 'number' && !Buffer.isBuffer(num)) {
    var numArray = num.toArray();
    if (num.sign === false && numArray[0] & 0x80) {
      numArray.unshift(0);
    }
    num = new Buffer(numArray);
  }

  if (Buffer.isBuffer(num)) {
    var size = num.length;
    if (num.length === 0)
      size++;

    var out = new Buffer(size);
    num.copy(out);
    if (num.length === 0)
      out[0] = 0
    return this._createEncoderBuffer(out);
  }

  if (num < 0x80)
    return this._createEncoderBuffer(num);

  if (num < 0x100)
    return this._createEncoderBuffer([0, num]);

  var size = 1;
  for (var i = num; i >= 0x100; i >>= 8)
    size++;

  var out = new Array(size);
  for (var i = out.length - 1; i >= 0; i--) {
    out[i] = num & 0xff;
    num >>= 8;
  }
  if(out[0] & 0x80) {
    out.unshift(0);
  }

  return this._createEncoderBuffer(new Buffer(out));
};

DERNode.prototype._encodeBool = function encodeBool(value) {
  return this._createEncoderBuffer(value ? 0xff : 0);
};

DERNode.prototype._use = function use(entity, obj) {
  if (typeof entity === 'function')
    entity = entity(obj);
  return entity._getEncoder('der').tree;
};

DERNode.prototype._skipDefault = function skipDefault(dataBuffer, reporter, parent) {
  var state = this._baseState;
  var i;
  if (state['default'] === null)
    return false;

  var data = dataBuffer.join();
  if (state.defaultBuffer === undefined)
    state.defaultBuffer = this._encodeValue(state['default'], reporter, parent).join();

  if (data.length !== state.defaultBuffer.length)
    return false;

  for (i=0; i < data.length; i++)
    if (data[i] !== state.defaultBuffer[i])
      return false;

  return true;
};

// Utility methods

function encodeTag(tag, primitive, cls, reporter) {
  var res;

  if (tag === 'seqof')
    tag = 'seq';
  else if (tag === 'setof')
    tag = 'set';

  if (der.tagByName.hasOwnProperty(tag))
    res = der.tagByName[tag];
  else if (typeof tag === 'number' && (tag | 0) === tag)
    res = tag;
  else
    return reporter.error('Unknown tag: ' + tag);

  if (res >= 0x1f)
    return reporter.error('Multi-octet tag encoding unsupported');

  if (!primitive)
    res |= 0x20;

  res |= (der.tagClassByName[cls || 'universal'] << 6);

  return res;
}

},{"../asn1":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/asn1.js","buffer":"buffer","util":"util"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/encoders/index.js":[function(require,module,exports){
var encoders = exports;

encoders.der = require('./der');
encoders.pem = require('./pem');

},{"./der":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/encoders/der.js","./pem":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/encoders/pem.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/encoders/pem.js":[function(require,module,exports){
var inherits = require('util').inherits;
var Buffer = require('buffer').Buffer;

var asn1 = require('../asn1');
var DEREncoder = require('./der');

function PEMEncoder(entity) {
  DEREncoder.call(this, entity);
  this.enc = 'pem';
};
inherits(PEMEncoder, DEREncoder);
module.exports = PEMEncoder;

PEMEncoder.prototype.encode = function encode(data, options) {
  var buf = DEREncoder.prototype.encode.call(this, data);

  var p = buf.toString('base64');
  var out = [ '-----BEGIN ' + options.label + '-----' ];
  for (var i = 0; i < p.length; i += 64)
    out.push(p.slice(i, i + 64));
  out.push('-----END ' + options.label + '-----');
  return out.join('\n');
};

},{"../asn1":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/asn1.js","./der":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/encoders/der.js","buffer":"buffer","util":"util"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/keyEncoder.js":[function(require,module,exports){
(function (Buffer){
'use strict'

var asn1 = require('./asn1/asn1');
var BN = require('./asn1/bignum/bn');

var ECPrivateKeyASN = asn1.define('ECPrivateKey', function() {
    this.seq().obj(
        this.key('version').int(),
        this.key('privateKey').octstr(),
        this.key('parameters').explicit(0).objid().optional(),
        this.key('publicKey').explicit(1).bitstr().optional()
    )
})

var SubjectPublicKeyInfoASN = asn1.define('SubjectPublicKeyInfo', function() {
    this.seq().obj(
        this.key('algorithm').seq().obj(
            this.key("id").objid(),
            this.key("curve").objid()
        ),
        this.key('pub').bitstr()
    )
})

var curves = {
    secp256k1: {
        curveParameters: [1, 3, 132, 0, 10],
        privatePEMOptions: {label: 'EC PRIVATE KEY'},
        publicPEMOptions: {label: 'PUBLIC KEY'}
    }
}

function assert(val, msg) {
    if (!val) {
        throw new Error(msg || 'Assertion failed')
    }
}

function KeyEncoder(options) {
    if (typeof options === 'string') {
        assert(curves.hasOwnProperty(options), 'Unknown curve ' + options);
        options = curves[options]
    }
    this.options = options;
    this.algorithmID = [1, 2, 840, 10045, 2, 1]
}

KeyEncoder.ECPrivateKeyASN = ECPrivateKeyASN;
KeyEncoder.SubjectPublicKeyInfoASN = SubjectPublicKeyInfoASN;

KeyEncoder.prototype.privateKeyObject = function(rawPrivateKey, rawPublicKey) {
    var privateKeyObject = {
        version: new BN(1),
        privateKey: new Buffer(rawPrivateKey, 'hex'),
        parameters: this.options.curveParameters,
        pemOptions: {label:"EC PRIVATE KEY"}
    };

    if (rawPublicKey) {
        privateKeyObject.publicKey = {
            unused: 0,
            data: new Buffer(rawPublicKey, 'hex')
        }
    }

    return privateKeyObject
};

KeyEncoder.prototype.publicKeyObject = function(rawPublicKey) {
    return {
        algorithm: {
            id: this.algorithmID,
            curve: this.options.curveParameters
        },
        pub: {
            unused: 0,
            data: new Buffer(rawPublicKey, 'hex')
        },
        pemOptions: { label :"PUBLIC KEY"}
    }
}

KeyEncoder.prototype.encodePrivate = function(privateKey, originalFormat, destinationFormat) {
    var privateKeyObject

    /* Parse the incoming private key and convert it to a private key object */
    if (originalFormat === 'raw') {
        if (!typeof privateKey === 'string') {
            throw 'private key must be a string'
        }
        var privateKeyObject = this.options.curve.keyFromPrivate(privateKey, 'hex'),
            rawPublicKey = privateKeyObject.getPublic('hex')
        privateKeyObject = this.privateKeyObject(privateKey, rawPublicKey)
    } else if (originalFormat === 'der') {
        if (typeof privateKey === 'buffer') {
            // do nothing
        } else if (typeof privateKey === 'string') {
            privateKey = new Buffer(privateKey, 'hex')
        } else {
            throw 'private key must be a buffer or a string'
        }
        privateKeyObject = ECPrivateKeyASN.decode(privateKey, 'der')
    } else if (originalFormat === 'pem') {
        if (!typeof privateKey === 'string') {
            throw 'private key must be a string'
        }
        privateKeyObject = ECPrivateKeyASN.decode(privateKey, 'pem', this.options.privatePEMOptions)
    } else {
        throw 'invalid private key format'
    }

    /* Export the private key object to the desired format */
    if (destinationFormat === 'raw') {
        return privateKeyObject.privateKey.toString('hex')
    } else if (destinationFormat === 'der') {
        return ECPrivateKeyASN.encode(privateKeyObject, 'der').toString('hex')
    } else if (destinationFormat === 'pem') {
        return ECPrivateKeyASN.encode(privateKeyObject, 'pem', this.options.privatePEMOptions)
    } else {
        throw 'invalid destination format for private key'
    }
}

KeyEncoder.prototype.encodePublic = function(publicKey, originalFormat, destinationFormat) {
    var publicKeyObject

    /* Parse the incoming public key and convert it to a public key object */
    if (originalFormat === 'raw') {
        if (!typeof publicKey === 'string') {
            throw 'public key must be a string'
        }
        publicKeyObject = this.publicKeyObject(publicKey)
    } else if (originalFormat === 'der') {
        if (typeof publicKey === 'buffer') {
            // do nothing
        } else if (typeof publicKey === 'string') {
            publicKey = new Buffer(publicKey, 'hex')
        } else {
            throw 'public key must be a buffer or a string'
        }
        publicKeyObject = SubjectPublicKeyInfoASN.decode(publicKey, 'der')
    } else if (originalFormat === 'pem') {
        if (!typeof publicKey === 'string') {
            throw 'public key must be a string'
        }
        publicKeyObject = SubjectPublicKeyInfoASN.decode(publicKey, 'pem', this.options.publicPEMOptions)
    } else {
        throw 'invalid public key format'
    }

    /* Export the private key object to the desired format */
    if (destinationFormat === 'raw') {
        return publicKeyObject.pub.data.toString('hex')
    } else if (destinationFormat === 'der') {
        return SubjectPublicKeyInfoASN.encode(publicKeyObject, 'der').toString('hex')
    } else if (destinationFormat === 'pem') {
        return SubjectPublicKeyInfoASN.encode(publicKeyObject, 'pem', this.options.publicPEMOptions)
    } else {
        throw 'invalid destination format for public key'
    }
}

module.exports = KeyEncoder;
}).call(this,require("buffer").Buffer)

},{"./asn1/asn1":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/asn1.js","./asn1/bignum/bn":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/asn1/bignum/bn.js","buffer":"buffer"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/psk-archiver.js":[function(require,module,exports){
(function (Buffer){
const path = require("path");
const yazl = require("yazl");
const yauzl = require("yauzl");
const fs = require("fs");
const DuplexStream = require("./utils/DuplexStream");
const PassThroughStream = require("./utils/PassThroughStream");
const isStream = require("./utils/isStream");

const EventEmitter = require('events');

const countFiles = require('./utils/countFiles');

function PskArchiver() {

    const self = this;

    const event = new EventEmitter();

    this.on = event.on;
    this.off = event.off;
    this.emit = event.emit;

    this.zipStream = function (inputPath, output, callback) {
        let ext = "";
        const zipFile = new yazl.ZipFile();
        const ptStream = new PassThroughStream();

        countFiles.computeSize(inputPath, (err, totalSize) => {
            if (err) {
                return callback(err);
            }

            __addToArchiveRecursively(zipFile, inputPath, "", (err) => {
                if (err) {
                    return callback(err);
                }

                zipFile.end();
                const filename = path.basename(inputPath);
                const splitFilename = filename.split(".");
                if (splitFilename.length >= 2) {
                    ext = "." + splitFilename[splitFilename.length - 1];
                }
                const myStream = zipFile.outputStream.pipe(ptStream);

                let progressLength = 0;
                let totalLength = 0;

                /**
                 * TODO review this
                 * In browser, piping will block the event loop and the stack queue is not called.
                 */
                myStream.on("data", (chunk) => {
                    progressLength += chunk.length;
                    totalLength += chunk.length;

                    if (progressLength > 300000) {
                        myStream.pause();
                        progressLength = 0;
                        setTimeout(function () {
                            myStream.resume();
                        }, 10);
                        emitProgress(totalSize, totalLength)
                    }
                });

                myStream.on('end', () => {
                    emitProgress(totalSize, totalSize);
                    emitTotalSize(totalSize);
                });
                if (isStream.isWritable(output)) {
                    callback(null, myStream.pipe(output));
                } else if (typeof output === "string") {
                   fs.mkdir(output, {recursive: true}, () => {
                        const destinationPath = path.join(output, path.basename(inputPath, ext) + ".zip");
                        myStream.pipe(fs.createWriteStream(destinationPath));
                    });
                }
            });

            function __addToArchiveRecursively(zipFile, inputPath, root = '', callback) {
                root = root || '';
                fs.stat(inputPath, (err, stats) => {
                    if (err) {
                        return callback(err);
                    }
                    if (stats.isFile()) {
                        zipFile.addFile(inputPath, path.join(root, path.basename(inputPath)));
                        callback(null);

                    } else {
                        fs.readdir(inputPath, (err, files) => {
                            if (err) {
                                return callback(err);
                            }
                            const f_length = files.length;
                            let f_add_index = 0;

                            const checkStatus = () => {
                                if (f_length === f_add_index) {
                                    callback(null);
                                    return true;
                                }
                                return false;
                            };

                            if (!checkStatus()) {
                                files.forEach(file => {
                                    const tempPath = path.join(inputPath, file);
                                    __addToArchiveRecursively(zipFile, tempPath, path.join(root, path.basename(inputPath)), (err) => {
                                        if (err) {
                                            return callback(err);
                                        }
                                        f_add_index++;
                                        checkStatus();
                                    })
                                });
                            }
                        })
                    }
                });
            }

        });

    };

    this.unzipStream = function (input, outputPath, callback) {

        let size = 0;

        fs.stat(input, (err, stats) => {
            if (err) {
                return callback(err);
            }

            let totalSize = stats.size;


            yauzl.open(input, {lazyEntries: true}, (err, zipFile) => {
                if (err) {
                    return callback(err);
                }

                let progressLength = 0;
                let totalLength = 0;

                const fileNames = [];
                zipFile.readEntry();
                zipFile.once("end", () => {
                    emitProgress(totalSize, totalSize);
                    callback(null, fileNames);
                });
                zipFile.on("entry", (entry) => {
                    if (entry.fileName.endsWith(path.sep)) {
                        zipFile.readEntry();
                    } else {
                        let folder = path.dirname(entry.fileName);
                        fs.mkdir(path.join(outputPath, folder), {recursive: true}, () => {
                            zipFile.openReadStream(entry, (err, readStream) => {
                                if (err) {
                                    return callback(err);
                                }

                                /**
                                 * TODO review this
                                 * In browser, piping will block the event loop and the stack queue is not called.
                                 */

                                readStream.on("data", (chunk) => {
                                    progressLength += chunk.length;
                                    totalLength += chunk.length;

                                    if (progressLength > 300000) {
                                        readStream.pause();
                                        progressLength = 0;
                                        setTimeout(function () {
                                            readStream.resume();
                                        }, 30);
                                        emitProgress(totalSize, totalLength)
                                    }
                                });


                                readStream.on("end", () => {
                                    zipFile.readEntry();
                                });
                                const ptStream = new PassThroughStream();
                                let fileName = path.join(outputPath, entry.fileName);
                                let folder = path.dirname(fileName);
                                const tempStream = readStream.pipe(ptStream);

                                fs.mkdir(folder, {recursive: true}, (err) => {
                                    if (err) {
                                        return callback(err);
                                    }

                                    size += ptStream.getSize();
                                    let output = fs.createWriteStream(fileName);
                                    fileNames.push(fileName);
                                    tempStream.pipe(output);
                                });
                            });
                        });
                    }
                });
            });

        });

    };

    this.zipInMemory = function (inputObj, depth, callback) {
        const zipFile = new yazl.ZipFile();
        const ds = new DuplexStream();
        zipRecursively(zipFile, inputObj, "", depth, (err) => {
            if (err) {
                return callback(err);
            }
            zipFile.end();
            let buffer = Buffer.alloc(0);
            ds.on('data', (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
            });

            zipFile.outputStream.pipe(ds).on("finish", (err) => {
                if (err) {
                    return callback(err);
                }
                callback(null, buffer);
            });
        })
    };

    this.unzipInMemory = function (inputZip, callback) {

        function unzipInput(zipFile) {
            zipFile.readEntry();
            const obj = {};
            zipFile.once("end", () => {
                callback(null, obj);
            });

            zipFile.on("entry", (entry) => {
                zipFile.openReadStream(entry, (err, readStream) => {
                    const ds = new DuplexStream();
                    let str = '';
                    if (err) {
                        return callback(err);
                    }
                    readStream.on("end", () => {
                        zipFile.readEntry();
                    });
                    ds.on("data", (chunk) => {
                        str += chunk.toString();
                    });

                    readStream.pipe(ds).on("finish", (err) => {
                        if (err) {
                            return callback(err);
                        }
                        const splitEntry = entry.fileName.split("/");
                        const type = splitEntry.pop();
                        addPropsRecursively(obj, splitEntry, type, new Buffer(str));
                    });

                });
            })
        }

        if (Buffer.isBuffer(inputZip)) {
            yauzl.fromBuffer(inputZip, {lazyEntries: true}, (err, zipFile) => {
                if (err) {
                    return callback(err);
                }
                unzipInput(zipFile)
            });
        } else {
            return callback(new Error("input should be a buffer"));
        }

    };

    function zipRecursively(zipFile, obj, root, depth, callback) {
        if (depth === 0) {
            zipFile.addBuffer(new Buffer(JSON.stringify(obj)), root + "/stringify");
            return;
        }

        if (typeof obj === 'undefined') {
            zipFile.addBuffer(Buffer.alloc(0), root + "/undefined");
        } else if (typeof obj === 'number') {
            zipFile.addBuffer(new Buffer(obj.toString()), root + "/number");
        } else if (typeof obj === 'string') {
            zipFile.addBuffer(new Buffer(obj), root + "/string")
        } else if (obj === null) {
            zipFile.addBuffer(Buffer.alloc(0), root + "/null");
        } else if (Buffer.isBuffer(obj)) {
            zipFile.addBuffer(obj, root + "/buffer");
        } else if (isStream.isReadable(obj)) {
            zipFile.addReadStream(obj, root + "/stream");
        } else if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                if (obj.length === 0) {
                    zipFile.addBuffer(Buffer.alloc(0), root + "/array")
                } else {
                    zipRecursively(zipFile, obj[i], root + "/array/" + i, depth, (err) => {
                        if (err) {
                            return callback(err);
                        }
                    });
                }
            }
        } else if (obj && typeof obj === 'object') {
            let keys = Object.keys(obj);
            if (keys.length === 0 && obj.constructor === Object) {
                zipFile.addBuffer(Buffer.alloc(0), root + "/object");
            } else {
                const encodedObj = {};
                Object.entries(obj).forEach(([key, value]) => {
                    encodedObj[encodeURIComponent(key)] = value;
                });
                obj = encodedObj;
                keys = Object.keys(obj);
                keys.forEach(key => {
                    let entryName;
                    if (root === "") {
                        entryName = key;
                    } else {
                        entryName = root + "/" + key;
                    }
                    zipRecursively(zipFile, obj[key], entryName, depth - 1, (err) => {
                        if (err) {
                            return callback(err);
                        }
                    });
                });
            }
        } else {
            throw new Error('Should never reach this');
        }
        callback(null);
    }

    function addPropsRecursively(obj, splitName, type, data) {
        if (splitName.length >= 1) {
            const prop = decodeURIComponent(splitName.shift());

            if (splitName.length === 0) {
                switch (type) {
                    case 'undefined':
                        obj[prop] = undefined;
                        break;
                    case 'null':
                        obj[prop] = null;
                        break;
                    case 'number':
                        obj[prop] = parseInt(data.toString());
                        break;
                    case 'string':
                        obj[prop] = data.toString();
                        break;
                    case 'stream':
                        obj[prop] = bufferToStream(data);
                        break;
                    case 'array':
                        obj[prop] = [];
                        break;
                    case 'object':
                        obj[prop] = {};
                        break;
                    case 'stringify':
                        obj[prop] = JSON.parse(data.toString());
                        break;
                    default:
                        throw new Error('Should never reach this');
                }
            } else {
                if (splitName[0] === 'array') {
                    if (!obj.hasOwnProperty(prop)) {
                        obj[prop] = [];
                    }
                    splitName.shift();
                    addPropsRecursively(obj[prop], splitName, type, data);
                } else {
                    if (!obj.hasOwnProperty(prop)) {
                        obj[prop] = {};
                    }
                    addPropsRecursively(obj[prop], splitName, type, data);
                }
            }
        }
    }


    function bufferToStream(buffer) {
        let stream = new require('stream').Readable();
        stream.push(buffer);
        stream.push(null);
        return stream;
    }

    function emitProgress(total, processed) {


        if (processed > total) {
            processed = total;
        }

        const progress = (100 * processed) / total;
        self.emit('progress', progress);
    }

    function emitTotalSize(total) {
        self.emit('total', total);
    }


}

module.exports = PskArchiver;
}).call(this,require("buffer").Buffer)

},{"./utils/DuplexStream":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/utils/DuplexStream.js","./utils/PassThroughStream":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/utils/PassThroughStream.js","./utils/countFiles":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/utils/countFiles.js","./utils/isStream":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/utils/isStream.js","buffer":"buffer","events":"events","fs":false,"path":"path","yauzl":false,"yazl":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/utils/DuplexStream.js":[function(require,module,exports){
const stream = require('stream');
const util = require('util');

const Duplex = stream.Duplex;

function DuplexStream(options) {
	if (!(this instanceof DuplexStream)) {
		return new DuplexStream(options);
	}
	Duplex.call(this, options);
}
util.inherits(DuplexStream, Duplex);

DuplexStream.prototype._write = function (chunk, enc, cb) {
	this.push(chunk);
	cb();
};


DuplexStream.prototype._read = function (n) {

};

module.exports = DuplexStream;
},{"stream":"stream","util":"util"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/utils/PassThroughStream.js":[function(require,module,exports){
const stream = require('stream');
const util = require('util');

const PassThrough = stream.PassThrough;

function PassThroughStream(options) {
    if (!(this instanceof PassThroughStream)) {
        return new PassThroughStream(options);
    }
    PassThrough.call(this, options);

    let size = 0;

    this.addToSize = function (amount) {
        size += amount;
    };

    this.getSize = function () {
        return size;
    }
}

util.inherits(PassThroughStream, PassThrough);

PassThroughStream.prototype._write = function (chunk, enc, cb) {
    this.addToSize(chunk.length);
    this.push(chunk);
    cb();
};


PassThroughStream.prototype._read = function (n) {

};

module.exports = PassThroughStream;
},{"stream":"stream","util":"util"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/utils/countFiles.js":[function(require,module,exports){
const fs = require('fs');
const path = require('path');
const yauzl = require('yauzl');

function countFiles(inputPath, callback) {
    let total = 0;

    fs.stat(inputPath, (err, stats) => {
        if (err) {
            return callback(err);
        }

        if (stats.isFile()) {
            return callback(undefined, 1);
        }

        fs.readdir(inputPath, (err, files) => {
            if (err) {
                return callback(err);
            }


            total = files.length;
            let count = files.length;

            if (total === 0) {
                return callback(undefined, 0);
            }

            files.forEach(file => {
                fs.stat(path.join(inputPath, file), (err, stats) => {
                    if (err) {
                        return callback(err);
                    }

                    if (stats.isDirectory()) {
                        --total;
                        countFiles(path.join(inputPath, file), (err, filesNumber) => {
                            if (err) {
                                return callback(err);
                            }

                            total += filesNumber;


                            if (--count === 0) {
                                callback(undefined, total);
                            }
                        });
                    } else {
                        if (!stats.isFile()) {
                            --total;
                        }

                        if (--count === 0) {
                            callback(undefined, total);
                        }
                    }
                });
            })
        });
    });
}

function countZipEntries(inputPath, callback) {
    let processed = 0;

    yauzl.open(inputPath, {lazyEntries: true}, (err, zipFile) => {
        if (err) {
            return callback(err);
        }

        zipFile.readEntry();
        zipFile.once("end", () => {
            callback(null, processed);
        });

        zipFile.on("entry", (entry) => {
            ++processed;

            zipFile.readEntry();
        });
    });
}

function computeSize(inputPath, callback) {
    let totalSize = 0;
    fs.stat(inputPath, (err, stats) => {
        if (err) {
            return callback(err);
        }

        if (stats.isFile()) {
            return callback(undefined, stats.size);
        }

        fs.readdir(inputPath, (err, files) => {
            if (err) {
                return callback(err);
            }


            let count = files.length;

            if (count === 0) {
                return callback(undefined, 0);
            }

            files.forEach(file => {
                fs.stat(path.join(inputPath, file), (err, stats) => {
                    if (err) {
                        return callback(err);
                    }

                    if (stats.isDirectory()) {
                        computeSize(path.join(inputPath, file), (err, filesSize) => {
                            if (err) {
                                return callback(err);
                            }

                            totalSize += filesSize;

                            if (--count === 0) {
                                callback(undefined, totalSize);
                            }
                        });
                    } else {

                        totalSize += stats.size;

                        if (--count === 0) {
                            callback(undefined, totalSize);
                        }
                    }
                });
            })
        });
    });
}

module.exports = {
    countFiles,
    countZipEntries,
    computeSize
};

},{"fs":false,"path":"path","yauzl":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/utils/cryptoUtils.js":[function(require,module,exports){
(function (Buffer){
const crypto = require('crypto');
const fs = require('fs');
const path = require("path");
const PskArchiver = require("../psk-archiver");
const algorithm = 'aes-256-gcm';


const iterations_number = 1000;

function encode(buffer) {
	return buffer.toString('base64')
		.replace(/\+/g, '')
		.replace(/\//g, '')
		.replace(/=+$/, '');
}

function deleteRecursively(inputPath, callback) {

	fs.stat(inputPath, function (err, stats) {
		if (err) {
			callback(err, stats);
			return;
		}
		if (stats.isFile()) {
			fs.unlink(inputPath, function (err) {
				if (err) {
					callback(err, null);
				} else {
					callback(null, true);
				}
			});
		} else if (stats.isDirectory()) {
			fs.readdir(inputPath, function (err, files) {
				if (err) {
					callback(err, null);
					return;
				}
				const f_length = files.length;
				let f_delete_index = 0;

				const checkStatus = function () {
					if (f_length === f_delete_index) {
						fs.rmdir(inputPath, function (err) {
							if (err) {
								callback(err, null);
							} else {
								callback(null, true);
							}
						});
						return true;
					}
					return false;
				};
				if (!checkStatus()) {
					files.forEach(function (file) {
						const tempPath = path.join(inputPath, file);
						deleteRecursively(tempPath, function removeRecursiveCB(err, status) {
							if (!err) {
								f_delete_index++;
								checkStatus();
							} else {
								callback(err, null);
							}
						});
					});
				}
			});
		}
	});
}





function createPskHash(data) {
	const pskHash = new PskHash();
	pskHash.update(data);
	return pskHash.digest();
}

function PskHash() {
	const sha512 = crypto.createHash('sha512');
	const sha256 = crypto.createHash('sha256');

	function update(data) {
		sha512.update(data);
	}

	function digest() {
		sha256.update(sha512.digest());
		return sha256.digest();
	}

	return {
		update,
		digest
	}
}


function generateSalt(inputData, saltLen) {
	const hash = crypto.createHash('sha512');
	hash.update(inputData);
	const digest = Buffer.from(hash.digest('hex'), 'binary');

	return digest.slice(0, saltLen);
}

function encrypt(data, password) {
	const keySalt = crypto.randomBytes(32);
	const key = crypto.pbkdf2Sync(password, keySalt, iterations_number, 32, 'sha512');

	const aadSalt = crypto.randomBytes(32);
	const aad = crypto.pbkdf2Sync(password, aadSalt, iterations_number, 32, 'sha512');

	const salt = Buffer.concat([keySalt, aadSalt]);
	const iv = crypto.pbkdf2Sync(password, salt, iterations_number, 12, 'sha512');

	const cipher = crypto.createCipheriv(algorithm, key, iv);
	cipher.setAAD(aad);
	let encryptedText = cipher.update(data, 'binary');
	const final = Buffer.from(cipher.final('binary'), 'binary');
	const tag = cipher.getAuthTag();

	encryptedText = Buffer.concat([encryptedText, final]);

	return Buffer.concat([salt, encryptedText, tag]);
}

function decrypt(encryptedData, password) {
	const salt = encryptedData.slice(0, 64);
	const keySalt = salt.slice(0, 32);
	const aadSalt = salt.slice(-32);

	const iv = crypto.pbkdf2Sync(password, salt, iterations_number, 12, 'sha512');
	const key = crypto.pbkdf2Sync(password, keySalt, iterations_number, 32, 'sha512');
	const aad = crypto.pbkdf2Sync(password, aadSalt, iterations_number, 32, 'sha512');

	const ciphertext = encryptedData.slice(64, encryptedData.length - 16);
	const tag = encryptedData.slice(-16);

	const decipher = crypto.createDecipheriv(algorithm, key, iv);
	decipher.setAuthTag(tag);
	decipher.setAAD(aad);

	let plaintext = Buffer.from(decipher.update(ciphertext, 'binary'), 'binary');
	const final = Buffer.from(decipher.final('binary'), 'binary');
	plaintext = Buffer.concat([plaintext, final]);
	return plaintext;
}

function encryptObjectInMemory(inputObj, password, depth, callback) {
	const archiver = new PskArchiver();

	archiver.zipInMemory(inputObj, depth, function (err, zippedObj) {
		if (err) {
			return callback(err);
		}
		const cipherText = encrypt(zippedObj, password);
		callback(null, cipherText);
	})
}

function decryptObjectInMemory(encryptedObject, password, callback) {
	const archiver = new PskArchiver();

	const zippedObject = decrypt(encryptedObject, password);
	archiver.unzipInMemory(zippedObject, function (err, obj) {
		if (err) {
			return callback(err);
		}
		callback(null, obj);
	})
}


module.exports = {
	createPskHash,
	encrypt,
	encryptObjectInMemory,
	decrypt,
	decryptObjectInMemory,
	deleteRecursively,
	encode,
	generateSalt,
	iterations_number,
	algorithm,
	PskHash
};


}).call(this,require("buffer").Buffer)

},{"../psk-archiver":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/psk-archiver.js","buffer":"buffer","crypto":"crypto","fs":false,"path":"path"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/utils/isStream.js":[function(require,module,exports){
const stream = require('stream');


function isStream (obj) {
	return obj instanceof stream.Stream || obj instanceof stream.Duplex;
}


function isReadable (obj) {
	return isStream(obj) && typeof obj._read === 'function' && typeof obj._readableState === 'object'
}


function isWritable (obj) {
	return isStream(obj) && typeof obj._write === 'function' && typeof obj._writableState === 'object'
}


function isDuplex (obj) {
	return isReadable(obj) && isWritable(obj)
}


module.exports            = isStream;
module.exports.isReadable = isReadable;
module.exports.isWritable = isWritable;
module.exports.isDuplex   = isDuplex;
},{"stream":"stream"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/signsensusDS/ssutil.js":[function(require,module,exports){
/*
 SignSens helper functions
 */
const crypto = require('crypto');

exports.wipeOutsidePayload = function wipeOutsidePayload(hashStringHexa, pos, size){
    var result;
    var sz = hashStringHexa.length;

    var end = (pos + size) % sz;

    if(pos < end){
        result = '0'.repeat(pos) +  hashStringHexa.substring(pos, end) + '0'.repeat(sz - end);
    }
    else {
        result = hashStringHexa.substring(0, end) + '0'.repeat(pos - end) + hashStringHexa.substring(pos, sz);
    }
    return result;
}



exports.extractPayload = function extractPayload(hashStringHexa, pos, size){
    var result;

    var sz = hashStringHexa.length;
    var end = (pos + size) % sz;

    if( pos < end){
        result = hashStringHexa.substring(pos, pos + size);
    } else{

        if(0 != end){
            result = hashStringHexa.substring(0, end)
        }  else {
            result = "";
        }
        result += hashStringHexa.substring(pos, sz);
    }
    return result;
}



exports.fillPayload = function fillPayload(payload, pos, size){
    var sz = 64;
    var result = "";

    var end = (pos + size) % sz;

    if( pos < end){
        result = '0'.repeat(pos) + payload + '0'.repeat(sz - end);
    } else{
        result = payload.substring(0,end);
        result += '0'.repeat(pos - end);
        result += payload.substring(end);
    }
    return result;
}



exports.generatePosHashXTimes = function generatePosHashXTimes(buffer, pos, size, count){ //generate positional hash
    var result  = buffer.toString("hex");

    /*if(pos != -1 )
        result[pos] = 0; */

    for(var i = 0; i < count; i++){
        var hash = crypto.createHash('sha256');
        result = exports.wipeOutsidePayload(result, pos, size);
        hash.update(result);
        result = hash.digest('hex');
    }
    return exports.wipeOutsidePayload(result, pos, size);
}

exports.hashStringArray = function (counter, arr, payloadSize){

    const hash = crypto.createHash('sha256');
    var result = counter.toString(16);

    for(var i = 0 ; i < 64; i++){
        result += exports.extractPayload(arr[i],i, payloadSize);
    }

    hash.update(result);
    var result = hash.digest('hex');
    return result;
}






function dumpMember(obj){
    var type = Array.isArray(obj) ? "array" : typeof obj;
    if(obj === null){
        return "null";
    }
    if(obj === undefined){
        return "undefined";
    }

    switch(type){
        case "number":
        case "string":return obj.toString(); break;
        case "object": return exports.dumpObjectForHashing(obj); break;
        case "boolean": return  obj? "true": "false"; break;
        case "array":
            var result = "";
            for(var i=0; i < obj.length; i++){
                result += exports.dumpObjectForHashing(obj[i]);
            }
            return result;
            break;
        default:
            throw new Error("Type " +  type + " cannot be cryptographically digested");
    }

}


exports.dumpObjectForHashing = function(obj){
    var result = "";

    if(obj === null){
        return "null";
    }
    if(obj === undefined){
        return "undefined";
    }

    var basicTypes = {
        "array"     : true,
        "number"    : true,
        "boolean"   : true,
        "string"    : true,
        "object"    : false
    }

    var type = Array.isArray(obj) ? "array" : typeof obj;
    if( basicTypes[type]){
        return dumpMember(obj);
    }

    var keys = Object.keys(obj);
    keys.sort();


    for(var i=0; i < keys.length; i++){
        result += dumpMember(keys[i]);
        result += dumpMember(obj[keys[i]]);
    }

    return result;
}


exports.hashValues  = function (values){
    const hash = crypto.createHash('sha256');
    var result = exports.dumpObjectForHashing(values);
    hash.update(result);
    return hash.digest('hex');
};

exports.getJSONFromSignature = function getJSONFromSignature(signature, size){
    var result = {
        proof:[]
    };
    var a = signature.split(":");
    result.agent        = a[0];
    result.counter      =  parseInt(a[1], "hex");
    result.nextPublic   =  a[2];

    var proof = a[3]


    if(proof.length/size != 64) {
        throw new Error("Invalid signature " + proof);
    }

    for(var i = 0; i < 64; i++){
        result.proof.push(exports.fillPayload(proof.substring(i * size,(i+1) * size ), i, size))
    }

    return result;
}

exports.createSignature = function (agent,counter, nextPublic, arr, size){
    var result = "";

    for(var i = 0; i < arr.length; i++){
        result += exports.extractPayload(arr[i], i , size);
    }

    return agent + ":" + counter + ":" + nextPublic + ":" + result;
}
},{"crypto":"crypto"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/soundpubsub/lib/soundPubSub.js":[function(require,module,exports){
/*
Initial License: (c) Axiologic Research & Alboaie Sînică.
Contributors: Axiologic Research , PrivateSky project
Code License: LGPL or MIT.
*/


/**
 *   Usually an event could cause execution of other callback events . We say that is a level 1 event if is causeed by a level 0 event and so on
 *
 *      SoundPubSub provides intuitive results regarding to asynchronous calls of callbacks and computed values/expressions:
 *   we prevent immediate execution of event callbacks to ensure the intuitive final result is guaranteed as level 0 execution
 *   we guarantee that any callback function is "re-entrant"
 *   we are also trying to reduce the number of callback execution by looking in queues at new messages published by
 *   trying to compact those messages (removing duplicate messages, modifying messages, or adding in the history of another event ,etc)
 *
 *      Example of what can be wrong without non-sound asynchronous calls:
 *
 *  Step 0: Initial state:
 *   a = 0;
 *   b = 0;
 *
 *  Step 1: Initial operations:
 *   a = 1;
 *   b = -1;
 *
 *  // an observer reacts to changes in a and b and compute CORRECT like this:
 *   if( a + b == 0) {
 *       CORRECT = false;
 *       notify(...); // act or send a notification somewhere..
 *   } else {
 *      CORRECT = false;
 *   }
 *
 *    Notice that: CORRECT will be true in the end , but meantime, after a notification was sent and CORRECT was wrongly, temporarily false!
 *    soundPubSub guarantee that this does not happen because the syncronous call will before any observer (bot asignation on a and b)
 *
 *   More:
 *   you can use blockCallBacks and releaseCallBacks in a function that change a lot a collection or bindable objects and all
 *   the notifications will be sent compacted and properly
 */

// TODO: optimisation!? use a more efficient queue instead of arrays with push and shift!?
// TODO: see how big those queues can be in real applications
// for a few hundreds items, queues made from array should be enough
//*   Potential TODOs:
//    *     prevent any form of problem by calling callbacks in the expected order !?
//*     preventing infinite loops execution cause by events!?
//*
//*
// TODO: detect infinite loops (or very deep propagation) It is possible!?

const Queue = require('swarmutils').Queue;

function SoundPubSub(){

	/**
	 * publish
	 *      Publish a message {Object} to a list of subscribers on a specific topic
	 *
	 * @params {String|Number} target,  {Object} message
	 * @return number of channel subscribers that will be notified
	 */
	this.publish = function(target, message){
		if(!invalidChannelName(target) && !invalidMessageType(message) && (typeof channelSubscribers[target] != 'undefined')){
			compactAndStore(target, message);
			setTimeout(dispatchNext, 0);
			return channelSubscribers[target].length;
		} else{
			return null;
		}
	};

	/**
	 * subscribe
	 *      Subscribe / add a {Function} callBack on a {String|Number}target channel subscribers list in order to receive
	 *      messages published if the conditions defined by {Function}waitForMore and {Function}filter are passed.
	 *
	 * @params {String|Number}target, {Function}callBack, {Function}waitForMore, {Function}filter
	 *
	 *          target      - channel name to subscribe
	 *          callback    - function to be called when a message was published on the channel
	 *          waitForMore - a intermediary function that will be called after a successfuly message delivery in order
	 *                          to decide if a new messages is expected...
	 *          filter      - a function that receives the message before invocation of callback function in order to allow
	 *                          relevant message before entering in normal callback flow
	 * @return
	 */
	this.subscribe = function(target, callBack, waitForMore, filter){
		if(!invalidChannelName(target) && !invalidFunction(callBack)){
			var subscriber = {"callBack":callBack, "waitForMore":waitForMore, "filter":filter};
			var arr = channelSubscribers[target];
			if(typeof arr == 'undefined'){
				arr = [];
				channelSubscribers[target] = arr;
			}
			arr.push(subscriber);
		}
	};

	/**
	 * unsubscribe
	 *      Unsubscribe/remove {Function} callBack from the list of subscribers of the {String|Number} target channel
	 *
	 * @params {String|Number} target, {Function} callBack, {Function} filter
	 *
	 *          target      - channel name to unsubscribe
	 *          callback    - reference of the original function that was used as subscribe
	 *          filter      - reference of the original filter function
	 * @return
	 */
	this.unsubscribe = function(target, callBack, filter){
		if(!invalidFunction(callBack)){
			var gotit = false;
			if(channelSubscribers[target]){
				for(var i = 0; i < channelSubscribers[target].length;i++){
					var subscriber =  channelSubscribers[target][i];
					if(subscriber.callBack === callBack && ( typeof filter === 'undefined' || subscriber.filter === filter )){
						gotit = true;
						subscriber.forDelete = true;
						subscriber.callBack = undefined;
						subscriber.filter = undefined;
					}
				}
			}
			if(!gotit){
				wprint("Unable to unsubscribe a callback that was not subscribed!");
			}
		}
	};

	/**
	 * blockCallBacks
	 *
	 * @params
	 * @return
	 */
	this.blockCallBacks = function(){
		level++;
	};

	/**
	 * releaseCallBacks
	 *
	 * @params
	 * @return
	 */
	this.releaseCallBacks = function(){
		level--;
		//hack/optimisation to not fill the stack in extreme cases (many events caused by loops in collections,etc)
		while(level === 0 && dispatchNext(true)){
			//nothing
		}

		while(level === 0 && callAfterAllEvents()){
            //nothing
		}
	};

	/**
	 * afterAllEvents
	 *
	 * @params {Function} callback
	 *
	 *          callback - function that needs to be invoked once all events are delivered
	 * @return
	 */
	this.afterAllEvents = function(callBack){
		if(!invalidFunction(callBack)){
			afterEventsCalls.push(callBack);
		}
		this.blockCallBacks();
		this.releaseCallBacks();
	};

	/**
	 * hasChannel
	 *
	 * @params {String|Number} channel
	 *
	 *          channel - name of the channel that need to be tested if present
	 * @return
	 */
	this.hasChannel = function(channel){
		return !invalidChannelName(channel) && (typeof channelSubscribers[channel] != 'undefined') ? true : false;
	};

	/**
	 * addChannel
	 *
	 * @params {String} channel
	 *
	 *          channel - name of a channel that needs to be created and added to soundpubsub repository
	 * @return
	 */
	this.addChannel = function(channel){
		if(!invalidChannelName(channel) && !this.hasChannel(channel)){
			channelSubscribers[channel] = [];
		}
	};

	/* ---------------------------------------- protected stuff ---------------------------------------- */
	var self = this;
	// map channelName (object local id) -> array with subscribers
	var channelSubscribers = {};

	// map channelName (object local id) -> queue with waiting messages
	var channelsStorage = {};

	// object
	var typeCompactor = {};

	// channel names
	var executionQueue = new Queue();
	var level = 0;



	/**
	 * registerCompactor
	 *
	 *       An compactor takes a newEvent and and oldEvent and return the one that survives (oldEvent if
	 *  it can compact the new one or the newEvent if can't be compacted)
	 *
	 * @params {String} type, {Function} callBack
	 *
	 *          type        - channel name to unsubscribe
	 *          callBack    - handler function for that specific event type
	 * @return
	 */
	this.registerCompactor = function(type, callBack) {
		if(!invalidFunction(callBack)){
			typeCompactor[type] = callBack;
		}
	};

	/**
	 * dispatchNext
	 *
	 * @param fromReleaseCallBacks: hack to prevent too many recursive calls on releaseCallBacks
	 * @return {Boolean}
	 */
	function dispatchNext(fromReleaseCallBacks){
		if(level > 0) {
			return false;
		}
		const channelName = executionQueue.front();
		if(typeof channelName != 'undefined'){
			self.blockCallBacks();
			try{
				let message;
				if(!channelsStorage[channelName].isEmpty()) {
					message = channelsStorage[channelName].front();
				}
				if(typeof message == 'undefined'){
					if(!channelsStorage[channelName].isEmpty()){
						wprint("Can't use as message in a pub/sub channel this object: " + message);
					}
					executionQueue.pop();
				} else {
					if(typeof message.__transmisionIndex == 'undefined'){
						message.__transmisionIndex = 0;
						for(var i = channelSubscribers[channelName].length-1; i >= 0 ; i--){
							var subscriber =  channelSubscribers[channelName][i];
							if(subscriber.forDelete === true){
								channelSubscribers[channelName].splice(i,1);
							}
						}
					} else{
						message.__transmisionIndex++;
					}
					//TODO: for immutable objects it will not work also, fix for shape models
					if(typeof message.__transmisionIndex == 'undefined'){
						wprint("Can't use as message in a pub/sub channel this object: " + message);
					}
					subscriber = channelSubscribers[channelName][message.__transmisionIndex];
					if(typeof subscriber == 'undefined'){
						delete message.__transmisionIndex;
						channelsStorage[channelName].pop();
					} else{
						if(subscriber.filter === null || typeof subscriber.filter === "undefined" || (!invalidFunction(subscriber.filter) && subscriber.filter(message))){
							if(!subscriber.forDelete){
								subscriber.callBack(message);
								if(subscriber.waitForMore && !invalidFunction(subscriber.waitForMore) && !subscriber.waitForMore(message)){
									subscriber.forDelete = true;
								}
							}
						}
					}
				}
			} catch(err){
				wprint("Event callback failed: "+ subscriber.callBack +"error: " + err.stack);
			}
			//
			if(fromReleaseCallBacks){
				level--;
			} else{
				self.releaseCallBacks();
			}
			return true;
		} else{
			return false;
		}
	}

	function compactAndStore(target, message){
		var gotCompacted = false;
		var arr = channelsStorage[target];
		if(typeof arr == 'undefined'){
			arr = new Queue();
			channelsStorage[target] = arr;
		}

		if(message && typeof message.type != 'undefined'){
			var typeCompactorCallBack = typeCompactor[message.type];

			if(typeof typeCompactorCallBack != 'undefined'){
				for(let channel of arr) {
					if(typeCompactorCallBack(message, channel) === channel) {
						if(typeof channel.__transmisionIndex == 'undefined') {
							gotCompacted = true;
							break;
						}
					}
				}
			}
		}

		if(!gotCompacted && message){
			arr.push(message);
			executionQueue.push(target);
		}
	}

	var afterEventsCalls = new Queue();
	function callAfterAllEvents (){
		if(!afterEventsCalls.isEmpty()){
			var callBack = afterEventsCalls.pop();
			//do not catch exceptions here..
			callBack();
		}
		return !afterEventsCalls.isEmpty();
	}

	function invalidChannelName(name){
		var result = false;
		if(!name || (typeof name != "string" && typeof name != "number")){
			result = true;
			wprint("Invalid channel name: " + name);
		}

		return result;
	}

	function invalidMessageType(message){
		var result = false;
		if(!message || typeof message != "object"){
			result = true;
			wprint("Invalid messages types: " + message);
		}
		return result;
	}

	function invalidFunction(callback){
		var result = false;
		if(!callback || typeof callback != "function"){
			result = true;
			wprint("Expected to be function but is: " + callback);
		}
		return result;
	}
}

exports.soundPubSub = new SoundPubSub();
},{"swarmutils":"swarmutils"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/Combos.js":[function(require,module,exports){
function product(args) {
    if(!args.length){
        return [ [] ];
    }
    var prod = product(args.slice(1)), r = [];
    args[0].forEach(function(x) {
        prod.forEach(function(p) {
            r.push([ x ].concat(p));
        });
    });
    return r;
}

function objectProduct(obj) {
    var keys = Object.keys(obj),
        values = keys.map(function(x) { return obj[x]; });

    return product(values).map(function(p) {
        var e = {};
        keys.forEach(function(k, n) { e[k] = p[n]; });
        return e;
    });
}

module.exports = objectProduct;
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/OwM.js":[function(require,module,exports){
var meta = "meta";

function OwM(serialized){

    if(serialized){
        return OwM.prototype.convert(serialized);
    }

    Object.defineProperty(this, meta, {
        writable: false,
        enumerable: true,
        value: {}
    });

    Object.defineProperty(this, "setMeta", {
        writable: false,
        enumerable: false,
        configurable:false,
        value: function(prop, value){
            if(typeof prop == "object" && typeof value == "undefined"){
                for(var p in prop){
                    this[meta][p] = prop[p];
                }
                return prop;
            }
            this[meta][prop] = value;
            return value;
        }
    });

    Object.defineProperty(this, "getMeta", {
        writable: false,
        value: function(prop){
            return this[meta][prop];
        }
    });
}

function testOwMSerialization(obj){
    let res = false;

    if(obj){
        res = typeof obj[meta] != "undefined" && !(obj instanceof OwM);
    }

    return res;
}

OwM.prototype.convert = function(serialized){
    const owm = new OwM();

    for(var metaProp in serialized.meta){
        if(!testOwMSerialization(serialized[metaProp])) {
            owm.setMeta(metaProp, serialized.meta[metaProp]);
        }else{
            owm.setMeta(metaProp, OwM.prototype.convert(serialized.meta[metaProp]));
        }
    }

    for(var simpleProp in serialized){
        if(simpleProp === meta) {
            continue;
        }

        if(!testOwMSerialization(serialized[simpleProp])){
            owm[simpleProp] = serialized[simpleProp];
        }else{
            owm[simpleProp] = OwM.prototype.convert(serialized[simpleProp]);
        }
    }

    return owm;
};

OwM.prototype.getMetaFrom = function(obj, name){
    var res;
    if(!name){
        res = obj[meta];
    }else{
        res = obj[meta][name];
    }
    return res;
};

OwM.prototype.setMetaFor = function(obj, name, value){
    obj[meta][name] = value;
    return obj[meta][name];
};

module.exports = OwM;
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/Queue.js":[function(require,module,exports){
function QueueElement(content) {
	this.content = content;
	this.next = null;
}

function Queue() {
	this.head = null;
	this.tail = null;
	this.length = 0;
	this.push = function (value) {
		const newElement = new QueueElement(value);
		if (!this.head) {
			this.head = newElement;
			this.tail = newElement;
		} else {
			this.tail.next = newElement;
			this.tail = newElement;
		}
		this.length++;
	};

	this.pop = function () {
		if (!this.head) {
			return null;
		}
		const headCopy = this.head;
		this.head = this.head.next;
		this.length--;

		//fix???????
		if(this.length === 0){
            this.tail = null;
		}

		return headCopy.content;
	};

	this.front = function () {
		return this.head ? this.head.content : undefined;
	};

	this.isEmpty = function () {
		return this.head === null;
	};

	this[Symbol.iterator] = function* () {
		let head = this.head;
		while(head !== null) {
			yield head.content;
			head = head.next;
		}
	}.bind(this);
}

Queue.prototype.toString = function () {
	let stringifiedQueue = '';
	let iterator = this.head;
	while (iterator) {
		stringifiedQueue += `${JSON.stringify(iterator.content)} `;
		iterator = iterator.next;
	}
	return stringifiedQueue;
};

Queue.prototype.inspect = Queue.prototype.toString;

module.exports = Queue;
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/beesHealer.js":[function(require,module,exports){
const OwM = require("./OwM");

/*
    Prepare the state of a swarm to be serialised
*/

exports.asJSON = function(valueObj, phaseName, args, callback){

        let valueObject = valueObj.valueOf();
        let res = new OwM();
        res.publicVars          = valueObject.publicVars;
        res.privateVars         = valueObject.privateVars;

        res.setMeta("swarmTypeName", OwM.prototype.getMetaFrom(valueObject, "swarmTypeName"));
        res.setMeta("swarmId",       OwM.prototype.getMetaFrom(valueObject, "swarmId"));
        res.setMeta("target",        OwM.prototype.getMetaFrom(valueObject, "target"));
        res.setMeta("homeSecurityContext",        OwM.prototype.getMetaFrom(valueObject, "homeSecurityContext"));
        res.setMeta("requestId",        OwM.prototype.getMetaFrom(valueObject, "requestId"));

        if(!phaseName){
            res.setMeta("command", "stored");
        } else {
            res.setMeta("phaseName", phaseName);
            res.setMeta("phaseId", $$.uidGenerator.safe_uuid());
            res.setMeta("args", args);
            res.setMeta("command", OwM.prototype.getMetaFrom(valueObject, "command") || "executeSwarmPhase");
        }

        res.setMeta("waitStack", valueObject.meta.waitStack); //TODO: think if is not better to be deep cloned and not referenced!!!

        if(callback){
            return callback(null, res);
        }
        //console.log("asJSON:", res, valueObject);
        return res;
};

exports.jsonToNative = function(serialisedValues, result){

    for(let v in serialisedValues.publicVars){
        result.publicVars[v] = serialisedValues.publicVars[v];

    };
    for(let l in serialisedValues.privateVars){
        result.privateVars[l] = serialisedValues.privateVars[l];
    };

    for(let i in OwM.prototype.getMetaFrom(serialisedValues)){
        OwM.prototype.setMetaFor(result, i, OwM.prototype.getMetaFrom(serialisedValues, i));
    };

};
},{"./OwM":"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/OwM.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/pskconsole.js":[function(require,module,exports){
var commands = {};
var commands_help = {};

//global function addCommand
addCommand = function addCommand(verb, adverbe, funct, helpLine){
    var cmdId;
    if(!helpLine){
        helpLine = " ";
    } else {
        helpLine = " " + helpLine;
    }
    if(adverbe){
        cmdId = verb + " " +  adverbe;
        helpLine = verb + " " +  adverbe + helpLine;
    } else {
        cmdId = verb;
        helpLine = verb + helpLine;
    }
    commands[cmdId] = funct;
        commands_help[cmdId] = helpLine;
};

function doHelp(){
    console.log("List of commands:");
    for(var l in commands_help){
        console.log("\t", commands_help[l]);
    }
}

addCommand("-h", null, doHelp, "\t\t\t\t\t\t |just print the help");
addCommand("/?", null, doHelp, "\t\t\t\t\t\t |just print the help");
addCommand("help", null, doHelp, "\t\t\t\t\t\t |just print the help");


function runCommand(){
  var argv = Object.assign([], process.argv);
  var cmdId = null;
  var cmd = null;
  argv.shift();
  argv.shift();

  if(argv.length >=1){
      cmdId = argv[0];
      cmd = commands[cmdId];
      argv.shift();
  }


  if(!cmd && argv.length >=1){
      cmdId = cmdId + " " + argv[0];
      cmd = commands[cmdId];
      argv.shift();
  }

  if(!cmd){
    if(cmdId){
        console.log("Unknown command: ", cmdId);
    }
    cmd = doHelp;
  }

  cmd.apply(null,argv);

}

module.exports = {
    runCommand
};


},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/safe-uuid.js":[function(require,module,exports){

function encode(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '')
        .replace(/\//g, '')
        .replace(/=+$/, '');
};

function stampWithTime(buf, salt, msalt){
    if(!salt){
        salt = 1;
    }
    if(!msalt){
        msalt = 1;
    }
    var date = new Date;
    var ct = Math.floor(date.getTime() / salt);
    var counter = 0;
    while(ct > 0 ){
        //console.log("Counter", counter, ct);
        buf[counter*msalt] = Math.floor(ct % 256);
        ct = Math.floor(ct / 256);
        counter++;
    }
}

/*
    The uid contains around 256 bits of randomness and are unique at the level of seconds. This UUID should by cryptographically safe (can not be guessed)

    We generate a safe UID that is guaranteed unique (by usage of a PRNG to geneate 256 bits) and time stamping with the number of seconds at the moment when is generated
    This method should be safe to use at the level of very large distributed systems.
    The UUID is stamped with time (seconds): does it open a way to guess the UUID? It depends how safe is "crypto" PRNG, but it should be no problem...

 */

var generateUid = null;


exports.init = function(externalGenerator){
    generateUid = externalGenerator.generateUid;
    return module.exports;
};

exports.safe_uuid = function() {
    var buf = generateUid(32);
    stampWithTime(buf, 1000, 3);
    return encode(buf);
};



/*
    Try to generate a small UID that is unique against chance in the same millisecond second and in a specific context (eg in the same choreography execution)
    The id contains around 6*8 = 48  bits of randomness and are unique at the level of milliseconds
    This method is safe on a single computer but should be used with care otherwise
    This UUID is not cryptographically safe (can be guessed)
 */
exports.short_uuid = function(callback) {
    require('crypto').randomBytes(12, function (err, buf) {
        if (err) {
            callback(err);
            return;
        }
        stampWithTime(buf,1,2);
        callback(null, encode(buf));
    });
};
},{"crypto":"crypto"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/uidGenerator.js":[function(require,module,exports){
(function (Buffer){
const crypto = require('crypto');
const Queue = require("./Queue");
var PSKBuffer = typeof $$ !== "undefined" && $$.PSKBuffer ? $$.PSKBuffer : Buffer;

function UidGenerator(minBuffers, buffersSize) {
	var buffers = new Queue();
	var lowLimit = .2;

	function fillBuffers(size){
		//notifyObserver();
		const sz = size || minBuffers;
		if(buffers.length < Math.floor(minBuffers*lowLimit)){
			for(var i=0+buffers.length; i < sz; i++){
				generateOneBuffer(null);
			}
		}
	}

	fillBuffers();

	function generateOneBuffer(b){
		if(!b){
			b = PSKBuffer.alloc(0);
		}
		const sz = buffersSize - b.length;
		/*crypto.randomBytes(sz, function (err, res) {
			buffers.push(Buffer.concat([res, b]));
			notifyObserver();
		});*/
		buffers.push(PSKBuffer.concat([ crypto.randomBytes(sz), b ]));
		notifyObserver();
	}

	function extractN(n){
		var sz = Math.floor(n / buffersSize);
		var ret = [];

		for(var i=0; i<sz; i++){
			ret.push(buffers.pop());
			setTimeout(generateOneBuffer, 1);
		}



		var remainder = n % buffersSize;
		if(remainder > 0){
			var front = buffers.pop();
			ret.push(front.slice(0,remainder));
			//generateOneBuffer(front.slice(remainder));
			setTimeout(function(){
				generateOneBuffer(front.slice(remainder));
			},1);
		}

		//setTimeout(fillBuffers, 1);

		return Buffer.concat(ret);
	}

	var fillInProgress = false;

	this.generateUid = function(n){
		var totalSize = buffers.length * buffersSize;
		if(n <= totalSize){
			return extractN(n);
		} else {
			if(!fillInProgress){
				fillInProgress = true;
				setTimeout(function(){
					fillBuffers(Math.floor(minBuffers*2.5));
					fillInProgress = false;
				}, 1);
			}
			return crypto.randomBytes(n);
		}
	};

	var observer;
	this.registerObserver = function(obs){
		if(observer){
			console.error(new Error("One observer allowed!"));
		}else{
			if(typeof obs == "function"){
				observer = obs;
				//notifyObserver();
			}
		}
	};

	function notifyObserver(){
		if(observer){
			var valueToReport = buffers.length*buffersSize;
			setTimeout(function(){
				observer(null, {"size": valueToReport});
			}, 10);
		}
	}
}

module.exports.createUidGenerator = function (minBuffers, bufferSize) {
	return new UidGenerator(minBuffers, bufferSize);
};

}).call(this,require("buffer").Buffer)

},{"./Queue":"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/Queue.js","buffer":"buffer","crypto":"crypto"}],"/home/cosmin/Workspace/reorganizing/privatesky/psknode/core/sandboxes/util/SandBoxManager.js":[function(require,module,exports){
var mq = $$.require("foldermq");

const path = require('path');
const child_process = require("child_process");
const fs = require('fs');

const RESTART_TIMEOUT = 500;
const RESTART_TIMEOUT_LIMIT = 50000;

var sandboxes = {};
var exitHandler = require("../../utils/exitHandler")(sandboxes);

var bootSandBox = $$.flow.describe("PrivateSky.swarm.engine.bootInLauncher", {
    boot:function(sandBox, spaceName, folder, codeFolder, callback){
        // console.log("Booting in ", folder, " context ", spaceName);

        this.callback   = callback;
        this.folder     = folder;
        this.spaceName  = spaceName;
        this.sandBox    = sandBox;
        this.codeFolder    = codeFolder;
        this.timeoutMultiplier = 1;

        var task = this.serial(this.ensureFoldersExists);

        task.folderShouldExist(path.join(this.folder, "mq"),    task.progress);
        task.folderShouldExist(path.join(this.folder, "code"),  task.progress);
        task.folderShouldExist(path.join(this.folder, "tmp"),   task.progress);
    },
    folderShouldExist:  function(path, progress){
        fs.mkdir(path, {recursive: true}, progress);
    },
    copyFolder: function(sourcePath, targetPath, callback){
        let fsExt = require("utils").fsExt;
        fsExt.copy(sourcePath, targetPath, {overwrite: true}, callback);
    },
    ensureFoldersExists: function(err, res){
        if(err){
            console.log(err);
        } else {
            var task = this.parallel(this.runCode);
            task.copyFolder(path.join(this.codeFolder, "bundles"), path.join(this.folder, "bundles"), task.progress);
            this.sandBox.inbound = mq.createQue(path.join(this.folder, "mq/inbound"), task.progress);
            this.sandBox.outbound = mq.createQue(path.join(this.folder, "mq/outbound"), task.progress);
        }

    },
    runCode: function(err, res){
        if(!err){
            var mainFile = path.join(process.env.PRIVATESKY_ROOT_FOLDER, "core", "sandboxes", "agentSandbox.js");
            var args = [this.spaceName, process.env.PRIVATESKY_ROOT_FOLDER, path.resolve(process.env.PRIVATESKY_DOMAIN_BUILD)];
            var opts = {stdio: [0, 1, 2, "ipc"]};

            var startChild = (mainFile, args, opts) => {
				console.log("Running: ", mainFile, args, opts);
				var child = child_process.fork(mainFile, args);
				sandboxes[this.spaceName] = child;

				this.sandBox.inbound.setIPCChannel(child);
				this.sandBox.outbound.setIPCChannel(child);

				child.on("exit", (code, signal)=>{
				    if(code === 0){
				        console.log(`Sandbox <${this.spaceName}> shutting down.`);
				        return;
                    }
				    let timeout = (this.timeoutMultiplier*RESTART_TIMEOUT) % RESTART_TIMEOUT_LIMIT;
				    console.log(`Sandbox <${this.spaceName}> exits with code ${code}. Restarting in ${timeout} ms.`);
					setTimeout(()=>{
						startChild(mainFile, args, opts);
                        this.timeoutMultiplier *= 1.5;
                    }, timeout);
				});

				return child;
            };

            this.callback(null, startChild(mainFile, args, opts));
        } else {
            console.log("Error executing sandbox!:", err);
            this.callback(err, null);
        }
    }

});

function SandBoxHandler(spaceName, folder, codeFolder, resultCallBack){

    var self = this;
    var mqHandler;


    bootSandBox().boot(this, spaceName,folder, codeFolder, function(err, childProcess){
        if(!err){
            self.childProcess = childProcess;


            /*self.outbound.registerConsumer(function(err, swarm){
                $$.PSK_PubSub.publish($$.CONSTANTS.SWARM_FOR_EXECUTION, swarm);
            });*/

            self.outbound.registerAsIPCConsumer(function(err, swarm){
                $$.PSK_PubSub.publish($$.CONSTANTS.SWARM_FOR_EXECUTION, swarm);
            });

            mqHandler = self.inbound.getHandler();
            if(pendingMessages.length){
                pendingMessages.map(function(item){
                    self.send(item);
                });
                pendingMessages = null;
            }
        }
    });

    var pendingMessages = [];

    this.send = function (swarm, callback) {
        if(mqHandler){
            mqHandler.sendSwarmForExecution(swarm, callback);
        } else {
            pendingMessages.push(swarm); //TODO: well, a deep clone will not be a better idea?
        }
    }

}


function SandBoxManager(sandboxesFolder, codeFolder, callback){
    var self = this;

    var sandBoxes = {

    };
    function belongsToReplicatedSpace(){
        return true;
    }

    //console.log("Subscribing to:", $$.CONSTANTS.SWARM_FOR_EXECUTION);
    $$.PSK_PubSub.subscribe($$.CONSTANTS.SWARM_FOR_EXECUTION, function(swarm){
        console.log("Executing in sandbox towards: ", swarm.meta.target);

        if(swarm.meta.target == "system" || swarm.meta.command == "asyncReturn"){
            $$.swarmsInstancesManager.revive_swarm(swarm);
            //$$.swarms.restart(swarm.meta.swarmTypeName, swarm);
        } else
        if(swarm.meta.target == "pds"){
            //
        } else
        if(belongsToReplicatedSpace(swarm.meta.target)){
            self.pushToSpaceASwarm(swarm.meta.target, swarm);
        } else {
            //TODO: send towards network
        }

    });


    function startSandBox(spaceName){
        var sandBox = new SandBoxHandler(spaceName, path.join(sandboxesFolder, spaceName), codeFolder);
        sandBoxes[spaceName] = sandBox;
        return sandBox;
    }


    this.pushToSpaceASwarm = function(spaceName, swarm, callback){

        console.log("pushToSpaceASwarm " , spaceName);
        var sandbox = sandBoxes[spaceName];
        if(!sandbox){
            sandbox = sandBoxes[spaceName] = startSandBox(spaceName);
        }
        sandbox.send(swarm, callback);
    }

    callback(null, this);
}


exports.create = function(folder, codeFolder, callback){
    new SandBoxManager(folder, codeFolder, callback);
};



},{"../../utils/exitHandler":"/home/cosmin/Workspace/reorganizing/privatesky/psknode/core/utils/exitHandler.js","child_process":false,"fs":false,"path":"path","utils":"utils"}],"/home/cosmin/Workspace/reorganizing/privatesky/psknode/core/utils/exitHandler.js":[function(require,module,exports){
const events = ["exit", "SIGINT", "SIGUSR1", "SIGUSR2", "uncaughtException", "SIGTERM", "SIGHUP"];

module.exports = function manageShutdownProcess(childrenList){

    let shutting = false;
    function handler(){
        //console.log("Handling exit event on", process.pid, "arguments:", arguments);
        var childrenNames = Object.keys(childrenList);
        for(let j=0; j<childrenNames.length; j++){
            var child = childrenList[childrenNames[j]];
            //console.log(`[${process.pid}]`, "Sending kill signal to PID:", child.pid);
            try{
                process.kill(child.pid);
            }catch(err){
                //...
            }
        }

        if(!shutting){
            try{
                process.stdout.cursorTo(0);
                process.stdout.write(`[PID: ${process.pid}] [Timestamp: ${new Date().getTime()}] [Process argv: ${process.argv}]- Shutting down...\n`);
            }catch(err)
            {
                //...
            }
            shutting = true;
        }

        setTimeout(()=>{
            process.exit(0);
        }, 0);
    }

    process.stdin.resume();
    for(let i=0; i<events.length; i++){
        var eventType = events[i];
        process.on(eventType, handler);
    }
    //console.log("Exit handler setup!", `[${process.pid}]`);
};
},{}],"callflow":[function(require,module,exports){

//var path = require("path");
function defaultErrorHandlingImplementation(err, res){
	//console.log(err.stack);
	if(err) throw err;
	return res;
}

require("./lib/overwriteRequire");
const PSKBuffer = require('pskbuffer');
$$.PSKBuffer = PSKBuffer;


$$.errorHandler = {
        error:function(err, args, msg){
            console.log(err, "Unknown error from function call with arguments:", args, "Message:", msg);
        },
        throwError:function(err, args, msg){
            console.log(err, "Unknown error from function call with arguments:", args, "Message:", msg);
            throw err;
        },
        ignorePossibleError: function(name){
            console.log(name);
        },
        syntaxError:function(property, swarm, text){
            //throw new Error("Misspelled member name or other internal error!");
            var swarmName;
            try{
                if(typeof swarm == "string"){
                    swarmName = swarm;
                } else
                if(swarm && swarm.meta){
                    swarmName  = swarm.meta.swarmTypeName;
                } else {
                    swarmName = swarm.getInnerValue().meta.swarmTypeName;
                }
            } catch(err){
                swarmName = err.toString();
            }
            if(property){
                console.log("Wrong member name ", property,  " in swarm ", swarmName);
                if(text) {
                    console.log(text);
                }
            } else {
                console.log("Unknown swarm", swarmName);
            }

        },
        warning:function(msg){
            console.log(msg);
        }
    };



$$.safeErrorHandling = function(callback){
        if(callback){
            return callback;
        } else{
            return defaultErrorHandlingImplementation;
        }
    };

$$.__intern = {
        mkArgs:function(args,pos){
            var argsArray = [];
            for(var i = pos; i < args.length; i++){
                argsArray.push(args[i]);
            }
            return argsArray;
        }
    };



var swarmUtils = require("./lib/choreographies/utilityFunctions/swarm");
var assetUtils = require("./lib/choreographies/utilityFunctions/asset");
$$.defaultErrorHandlingImplementation = defaultErrorHandlingImplementation;

var callflowModule = require("./lib/swarmDescription");
$$.callflows        = callflowModule.createSwarmEngine("callflow");
$$.callflow         = $$.callflows;
$$.flow             = $$.callflows;
$$.flows            = $$.callflows;

$$.swarms           = callflowModule.createSwarmEngine("swarm", swarmUtils);
$$.swarm            = $$.swarms;
$$.contracts        = callflowModule.createSwarmEngine("contract", swarmUtils);
$$.contract         = $$.contracts;
$$.assets           = callflowModule.createSwarmEngine("asset", assetUtils);
$$.asset            = $$.assets;
$$.transactions     = callflowModule.createSwarmEngine("transaction", swarmUtils);
$$.transaction      = $$.transactions;


$$.PSK_PubSub = require("soundpubsub").soundPubSub;

$$.securityContext = "system";
$$.libraryPrefix = "global";
$$.libraries = {
    global:{

    }
};

$$.interceptor = require("./lib/InterceptorRegistry").createInterceptorRegistry();

$$.loadLibrary = require("./lib/loadLibrary").loadLibrary;

requireLibrary = function(name){
    //var absolutePath = path.resolve(  $$.__global.__loadLibraryRoot + name);
    return $$.loadLibrary(name,name);
};

require("./constants");

/*//TODO: SHOULD be moved in $$.__globals
$$.ensureFolderExists = function (folder, callback) {
    const flow = $$.flow.start("utils.mkDirRec");
    flow.make(folder, callback);
};

$$.ensureLinkExists = function (existingPath, newPath, callback) {
    const flow = $$.flow.start("utils.mkDirRec");
    flow.makeLink(existingPath, newPath, callback);
};*/

$$.pathNormalize = function (pathToNormalize) {
    const path = require("path");
    pathToNormalize = path.normalize(pathToNormalize);

    return pathToNormalize.replace(/[\/\\]/g, path.sep);
};

module.exports = {
    				createSwarmEngine: require("./lib/swarmDescription").createSwarmEngine,
                    createJoinPoint: require("./lib/parallelJoinPoint").createJoinPoint,
                    createSerialJoinPoint: require("./lib/serialJoinPoint").createSerialJoinPoint,
                    swarmInstanceManager: require("./lib/choreographies/swarmInstancesManager"),
                    enableInternalSwarmRouting: function(){
                        function dummyVM(name){
                            function solveSwarm(swarm){
                                $$.swarmsInstancesManager.revive_swarm(swarm);
                            }

                            $$.PSK_PubSub.subscribe(name, solveSwarm);
                            console.log("Creating a fake execution context...");
                        }
                        dummyVM($$.CONSTANTS.SWARM_FOR_EXECUTION);
                    }
				};

},{"./constants":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/constants.js","./lib/InterceptorRegistry":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/InterceptorRegistry.js","./lib/choreographies/swarmInstancesManager":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/swarmInstancesManager.js","./lib/choreographies/utilityFunctions/asset":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/utilityFunctions/asset.js","./lib/choreographies/utilityFunctions/swarm":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/utilityFunctions/swarm.js","./lib/loadLibrary":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/loadLibrary.js","./lib/overwriteRequire":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/overwriteRequire.js","./lib/parallelJoinPoint":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/parallelJoinPoint.js","./lib/serialJoinPoint":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/serialJoinPoint.js","./lib/swarmDescription":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/swarmDescription.js","path":"path","pskbuffer":"pskbuffer","soundpubsub":"soundpubsub"}],"dicontainer":[function(require,module,exports){
if(typeof singleton_container_module_workaround_for_wired_node_js_caching == 'undefined') {
    singleton_container_module_workaround_for_wired_node_js_caching   = module;
} else {
    module.exports = singleton_container_module_workaround_for_wired_node_js_caching .exports;
    return module;
}

/**
 * Created by salboaie on 4/27/15.
 */
function Container(errorHandler){
    var things = {};        //the actual values for our services, things
    var immediate = {};     //how dependencies were declared
    var callbacks = {};     //callback that should be called for each dependency declaration
    var depsCounter = {};   //count dependencies
    var reversedTree = {};  //reversed dependencies, opposite of immediate object

     this.dump = function(){
         console.log("Conatiner dump\n Things:", things, "\nDeps counter: ", depsCounter, "\nStright:", immediate, "\nReversed:", reversedTree);
     };

    function incCounter(name){
        if(!depsCounter[name]){
            depsCounter[name] = 1;
        } else {
            depsCounter[name]++;
        }
    }

    function insertDependencyinRT(nodeName, dependencies){
        dependencies.forEach(function(itemName){
            var l = reversedTree[itemName];
            if(!l){
                l = reversedTree[itemName] = {};
            }
            l[nodeName] = nodeName;
        });
    }


    function discoverUpNodes(nodeName){
        var res = {};

        function DFS(nn){
            var l = reversedTree[nn];
            for(var i in l){
                if(!res[i]){
                    res[i] = true;
                    DFS(i);
                }
            }
        }

        DFS(nodeName);
        return Object.keys(res);
    }

    function resetCounter(name){
        var dependencyArray = immediate[name];
        var counter = 0;
        if(dependencyArray){
            dependencyArray.forEach(function(dep){
                if(things[dep] == null){
                    incCounter(name);
                    counter++;
                }
            });
        }
        depsCounter[name] = counter;
        //console.log("Counter for ", name, ' is ', counter);
        return counter;
    }

    /* returns those that are ready to be resolved*/
    function resetUpCounters(name){
        var ret = [];
        //console.log('Reseting up counters for ', name, "Reverse:", reversedTree[name]);
        var ups = reversedTree[name];
        for(var v in ups){
            if(resetCounter(v) === 0){
                ret.push(v);
            }
        }
        return ret;
    }

    /*
         The first argument is a name for a service, variable,a  thing that should be initialised, recreated, etc
         The second argument is an array with dependencies
         the last argument is a function(err,...) that is called when dependencies are ready or recalled when are not ready (stop was called)
         If err is not undefined it means that one or any undefined variables are not ready and the callback will be called again later
         All the other arguments are the corresponding arguments of the callback will be the actual values of the corresponding dependency
         The callback functions should return the current value (or null)
     */
    this.declareDependency = function(name, dependencyArray, callback){
        if(callbacks[name]){
            errorHandler.ignorePossibleError("Duplicate dependency:" + name);
        } else {
            callbacks[name] = callback;
            immediate[name]   = dependencyArray;
            insertDependencyinRT(name, dependencyArray);
            things[name] = null;
        }

        var unsatisfiedCounter = resetCounter(name);
        if(unsatisfiedCounter === 0 ){
            callForThing(name, false);
        } else {
            callForThing(name, true);
        }
    };


    /*
        create a service
     */
    this.service = function(name, dependencyArray, constructor){
        this.declareDependency(name, dependencyArray, constructor);
    };


    var subsystemCounter = 0;
    /*
     create a anonymous subsystem
     */
    this.subsystem = function(dependencyArray, constructor){
        subsystemCounter++;
        this.declareDependency("dicontainer_subsystem_placeholder" + subsystemCounter, dependencyArray, constructor);
    };

    /* not documented.. limbo state*/
    this.factory = function(name, dependencyArray, constructor){
        this.declareDependency(name, dependencyArray, function(){
            return new constructor();
        });
    };

    function callForThing(name, outOfService){
        var args = immediate[name].map(function(item){
            return things[item];
        });
        args.unshift(outOfService);
        try{
            var value = callbacks[name].apply({},args);
        } catch(err){
            errorHandler.throwError(err);
        }


        if(outOfService || value===null){   //enable returning a temporary dependency resolution!
            if(things[name]){
                things[name] = null;
                resetUpCounters(name);
            }
        } else {
            //console.log("Success resolving ", name, ":", value, "Other ready:", otherReady);
            if(!value){
                value =  {"placeholder": name};
            }
            things[name] = value;
            var otherReady = resetUpCounters(name);
            otherReady.forEach(function(item){
                callForThing(item, false);
            });
        }
    }

    /*
        Declare that a name is ready, resolved and should try to resolve all other waiting for it
     */
    this.resolve    = function(name, value){
        things[name] = value;
        var otherReady = resetUpCounters(name);

        otherReady.forEach(function(item){
            callForThing(item, false);
        });
    };



    this.instanceFactory = function(name, dependencyArray, constructor){
        errorHandler.notImplemented("instanceFactory is planned but not implemented");
    };

    /*
        Declare that a service or feature is not working properly. All services depending on this will get notified
     */
    this.outOfService    = function(name){
        things[name] = null;
        var upNodes = discoverUpNodes(name);
        upNodes.forEach(function(node){
            things[name] = null;
            callForThing(node, true);
        });
    };
}


exports.newContainer    = function(checksLibrary){
    return new Container(checksLibrary);
};

//exports.container = new Container($$.errorHandler);
},{}],"domainBase":[function(require,module,exports){
exports.domainPubSub = require("./domainPubSub");
},{"./domainPubSub":"/home/cosmin/Workspace/reorganizing/privatesky/libraries/domainBase/domainPubSub.js"}],"double-check":[function(require,module,exports){

/**
 * Generic function used to registers methods such as asserts, logging, etc. on the current context.
 * @param name {String)} - name of the method (use case) to be registered.
 * @param func {Function} - handler to be invoked.
 * @param paramsDescription {Object} - parameters descriptions
 * @param after {Function} - callback function to be called after the function has been executed.
 */
function addUseCase(name, func, paramsDescription, after){
    var newFunc = func;
    if(typeof after === "function") {
        newFunc = function(){
            const args = Array.from(arguments);
            func.apply(this, args);
            after();
        };
    }

    // some properties should not be overridden
    const protectedProperties = [ 'addCheck', 'addCase', 'register' ];
    if(protectedProperties.indexOf(name) === -1){
        this[name] = newFunc;
    } else {
        throw new Error('Cant overwrite ' + name);
    }

    if(paramsDescription){
        this.params[name] = paramsDescription;
    }
}

/**
 * Creates an alias to an existing function.
 * @param name1 {String} - New function name.
 * @param name2 {String} - Existing function name.
 */
function alias(name1, name2){
    this[name1] = this[name2];
}

/**
 * Singleton for adding various functions for use cases regarding logging.
 * @constructor
 */
function LogsCore(){
    this.params = {};
}

/**
 * Singleton for adding your various functions for asserts.
 * @constructor
 */
function AssertCore(){
    this.params = {};
}

/**
 * Singleton for adding your various functions for checks.
 * @constructor
 */
function CheckCore(){
    this.params = {};
}

/**
 * Singleton for adding your various functions for generating exceptions.
 * @constructor
 */
function ExceptionsCore(){
    this.params = {};
}

/**
 * Singleton for adding your various functions for running tests.
 * @constructor
 */
function TestRunnerCore(){
}

LogsCore.prototype.addCase           = addUseCase;
AssertCore.prototype.addCheck        = addUseCase;
CheckCore.prototype.addCheck         = addUseCase;
ExceptionsCore.prototype.register    = addUseCase;

LogsCore.prototype.alias             = alias;
AssertCore.prototype.alias           = alias;
CheckCore.prototype.alias            = alias;
ExceptionsCore.prototype.alias       = alias;

// Create modules
var assertObj       = new AssertCore();
var checkObj        = new CheckCore();
var exceptionsObj   = new ExceptionsCore();
var loggerObj       = new LogsCore();
var testRunnerObj   = new TestRunnerCore();

// Export modules
exports.assert      = assertObj;
exports.check       = checkObj;
exports.exceptions  = exceptionsObj;
exports.logger      = loggerObj;
exports.testRunner  = testRunnerObj;

// Initialise modules
require("./standardAsserts.js").init(exports, loggerObj);
require("./standardLogs.js").init(exports);
require("./standardExceptions.js").init(exports);
require("./standardChecks.js").init(exports);
require("./testRunner.js").init(exports);

// Global Uncaught Exception handler.
if(process.on)
{
    process.on('uncaughtException', function (err) {
		const tag = "uncaughtException";
		console.log(tag, err);
		console.log(tag, err.stack);
	});
}
},{"./standardAsserts.js":"/home/cosmin/Workspace/reorganizing/privatesky/modules/double-check/lib/standardAsserts.js","./standardChecks.js":"/home/cosmin/Workspace/reorganizing/privatesky/modules/double-check/lib/standardChecks.js","./standardExceptions.js":"/home/cosmin/Workspace/reorganizing/privatesky/modules/double-check/lib/standardExceptions.js","./standardLogs.js":"/home/cosmin/Workspace/reorganizing/privatesky/modules/double-check/lib/standardLogs.js","./testRunner.js":"/home/cosmin/Workspace/reorganizing/privatesky/modules/double-check/lib/testRunner.js"}],"foldermq":[function(require,module,exports){
module.exports = {
					createQue: require("./lib/folderMQ").getFolderQueue
					//folderMQ: require("./lib/folderMQ")
};
},{"./lib/folderMQ":"/home/cosmin/Workspace/reorganizing/privatesky/modules/foldermq/lib/folderMQ.js"}],"launcher":[function(require,module,exports){
//console.log(require.resolve("./components.js"));
module.exports = $$.library(function(){
	require("./components.js");
	/*require("./mkDirRec.js");*/
})
},{"./components.js":"/home/cosmin/Workspace/reorganizing/privatesky/libraries/launcher/components.js"}],"pskbuffer":[function(require,module,exports){
const PSKBuffer = require('./lib/PSKBuffer');

module.exports = PSKBuffer;

},{"./lib/PSKBuffer":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskbuffer/lib/PSKBuffer.js"}],"pskcrypto":[function(require,module,exports){
const PskCrypto = require("./lib/PskCrypto");
const ssutil = require("./signsensusDS/ssutil");

module.exports = PskCrypto;

module.exports.hashValues = ssutil.hashValues;

module.exports.PskArchiver = require("./lib/psk-archiver");

module.exports.DuplexStream = require("./lib/utils/DuplexStream");

module.exports.isStream = require("./lib/utils/isStream");
},{"./lib/PskCrypto":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/PskCrypto.js","./lib/psk-archiver":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/psk-archiver.js","./lib/utils/DuplexStream":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/utils/DuplexStream.js","./lib/utils/isStream":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/lib/utils/isStream.js","./signsensusDS/ssutil":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskcrypto/signsensusDS/ssutil.js"}],"soundpubsub":[function(require,module,exports){
module.exports = {
					soundPubSub: require("./lib/soundPubSub").soundPubSub
};
},{"./lib/soundPubSub":"/home/cosmin/Workspace/reorganizing/privatesky/modules/soundpubsub/lib/soundPubSub.js"}],"swarmutils":[function(require,module,exports){
(function (global){
module.exports.OwM = require("./lib/OwM");
module.exports.beesHealer = require("./lib/beesHealer");

const uidGenerator = require("./lib/uidGenerator").createUidGenerator(200, 32);

module.exports.safe_uuid = require("./lib/safe-uuid").init(uidGenerator);

module.exports.Queue = require("./lib/Queue");
module.exports.combos = require("./lib/Combos");

module.exports.uidGenerator = uidGenerator;
module.exports.generateUid = uidGenerator.generateUid;

module.exports.createPskConsole = function () {
  return require('./lib/pskconsole');
};


if(typeof global.$$ == "undefined"){
  global.$$ = {};
}

if(typeof global.$$.uidGenerator == "undefined"){
    $$.uidGenerator = module.exports.safe_uuid;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./lib/Combos":"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/Combos.js","./lib/OwM":"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/OwM.js","./lib/Queue":"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/Queue.js","./lib/beesHealer":"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/beesHealer.js","./lib/pskconsole":"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/pskconsole.js","./lib/safe-uuid":"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/safe-uuid.js","./lib/uidGenerator":"/home/cosmin/Workspace/reorganizing/privatesky/modules/swarmutils/lib/uidGenerator.js"}],"utils":[function(require,module,exports){
exports.fsExt = require("./FSExtension").fsExt;
},{"./FSExtension":"/home/cosmin/Workspace/reorganizing/privatesky/libraries/utils/FSExtension.js"}]},{},["/home/cosmin/Workspace/reorganizing/privatesky/builds/tmp/pskruntime.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZHMvdG1wL3Bza3J1bnRpbWUuanMiLCJidWlsZHMvdG1wL3Bza3J1bnRpbWVfaW50ZXJtZWRpYXIuanMiLCJsaWJyYXJpZXMvZG9tYWluQmFzZS9kb21haW5QdWJTdWIuanMiLCJsaWJyYXJpZXMvbGF1bmNoZXIvY29tcG9uZW50cy5qcyIsImxpYnJhcmllcy91dGlscy9GU0V4dGVuc2lvbi5qcyIsIm1vZHVsZXMvY2FsbGZsb3cvY29uc3RhbnRzLmpzIiwibW9kdWxlcy9jYWxsZmxvdy9saWIvSW50ZXJjZXB0b3JSZWdpc3RyeS5qcyIsIm1vZHVsZXMvY2FsbGZsb3cvbGliL2Nob3Jlb2dyYXBoaWVzL1N3YXJtRGVidWcuanMiLCJtb2R1bGVzL2NhbGxmbG93L2xpYi9jaG9yZW9ncmFwaGllcy9zd2FybUluc3RhbmNlc01hbmFnZXIuanMiLCJtb2R1bGVzL2NhbGxmbG93L2xpYi9jaG9yZW9ncmFwaGllcy91dGlsaXR5RnVuY3Rpb25zL2Fzc2V0LmpzIiwibW9kdWxlcy9jYWxsZmxvdy9saWIvY2hvcmVvZ3JhcGhpZXMvdXRpbGl0eUZ1bmN0aW9ucy9iYXNlLmpzIiwibW9kdWxlcy9jYWxsZmxvdy9saWIvY2hvcmVvZ3JhcGhpZXMvdXRpbGl0eUZ1bmN0aW9ucy9jYWxsZmxvdy5qcyIsIm1vZHVsZXMvY2FsbGZsb3cvbGliL2Nob3Jlb2dyYXBoaWVzL3V0aWxpdHlGdW5jdGlvbnMvc3dhcm0uanMiLCJtb2R1bGVzL2NhbGxmbG93L2xpYi9sb2FkTGlicmFyeS5qcyIsIm1vZHVsZXMvY2FsbGZsb3cvbGliL292ZXJ3cml0ZVJlcXVpcmUuanMiLCJtb2R1bGVzL2NhbGxmbG93L2xpYi9wYXJhbGxlbEpvaW5Qb2ludC5qcyIsIm1vZHVsZXMvY2FsbGZsb3cvbGliL3NlcmlhbEpvaW5Qb2ludC5qcyIsIm1vZHVsZXMvY2FsbGZsb3cvbGliL3N3YXJtRGVzY3JpcHRpb24uanMiLCJtb2R1bGVzL2RvdWJsZS1jaGVjay9saWIvc3RhbmRhcmRBc3NlcnRzLmpzIiwibW9kdWxlcy9kb3VibGUtY2hlY2svbGliL3N0YW5kYXJkQ2hlY2tzLmpzIiwibW9kdWxlcy9kb3VibGUtY2hlY2svbGliL3N0YW5kYXJkRXhjZXB0aW9ucy5qcyIsIm1vZHVsZXMvZG91YmxlLWNoZWNrL2xpYi9zdGFuZGFyZExvZ3MuanMiLCJtb2R1bGVzL2RvdWJsZS1jaGVjay9saWIvdGVzdFJ1bm5lci5qcyIsIm1vZHVsZXMvZG91YmxlLWNoZWNrL2xpYi91dGlscy9nbG9iLXRvLXJlZ2V4cC5qcyIsIm1vZHVsZXMvZm9sZGVybXEvbGliL2ZvbGRlck1RLmpzIiwibW9kdWxlcy9wc2tidWZmZXIvbGliL1BTS0J1ZmZlci5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9FQ0RTQS5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9Qc2tDcnlwdG8uanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvYXNuMS9hcGkuanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvYXNuMS9hc24xLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL2FzbjEvYmFzZS9idWZmZXIuanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvYXNuMS9iYXNlL2luZGV4LmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL2FzbjEvYmFzZS9ub2RlLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL2FzbjEvYmFzZS9yZXBvcnRlci5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9hc24xL2JpZ251bS9ibi5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9hc24xL2NvbnN0YW50cy9kZXIuanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvYXNuMS9jb25zdGFudHMvaW5kZXguanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvYXNuMS9kZWNvZGVycy9kZXIuanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvYXNuMS9kZWNvZGVycy9pbmRleC5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9hc24xL2RlY29kZXJzL3BlbS5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9hc24xL2VuY29kZXJzL2Rlci5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9hc24xL2VuY29kZXJzL2luZGV4LmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL2FzbjEvZW5jb2RlcnMvcGVtLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL2tleUVuY29kZXIuanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvcHNrLWFyY2hpdmVyLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL3V0aWxzL0R1cGxleFN0cmVhbS5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi91dGlscy9QYXNzVGhyb3VnaFN0cmVhbS5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi91dGlscy9jb3VudEZpbGVzLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL3V0aWxzL2NyeXB0b1V0aWxzLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL3V0aWxzL2lzU3RyZWFtLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vc2lnbnNlbnN1c0RTL3NzdXRpbC5qcyIsIm1vZHVsZXMvc291bmRwdWJzdWIvbGliL3NvdW5kUHViU3ViLmpzIiwibW9kdWxlcy9zd2FybXV0aWxzL2xpYi9Db21ib3MuanMiLCJtb2R1bGVzL3N3YXJtdXRpbHMvbGliL093TS5qcyIsIm1vZHVsZXMvc3dhcm11dGlscy9saWIvUXVldWUuanMiLCJtb2R1bGVzL3N3YXJtdXRpbHMvbGliL2JlZXNIZWFsZXIuanMiLCJtb2R1bGVzL3N3YXJtdXRpbHMvbGliL3Bza2NvbnNvbGUuanMiLCJtb2R1bGVzL3N3YXJtdXRpbHMvbGliL3NhZmUtdXVpZC5qcyIsIm1vZHVsZXMvc3dhcm11dGlscy9saWIvdWlkR2VuZXJhdG9yLmpzIiwicHNrbm9kZS9jb3JlL3NhbmRib3hlcy91dGlsL1NhbmRCb3hNYW5hZ2VyLmpzIiwicHNrbm9kZS9jb3JlL3V0aWxzL2V4aXRIYW5kbGVyLmpzIiwibW9kdWxlcy9jYWxsZmxvdy9pbmRleC5qcyIsIm1vZHVsZXMvZGljb250YWluZXIvbGliL2NvbnRhaW5lci5qcyIsImxpYnJhcmllcy9kb21haW5CYXNlL2luZGV4LmpzIiwibW9kdWxlcy9kb3VibGUtY2hlY2svbGliL2NoZWNrc0NvcmUuanMiLCJtb2R1bGVzL2ZvbGRlcm1xL2luZGV4LmpzIiwibGlicmFyaWVzL2xhdW5jaGVyL2luZGV4LmpzIiwibW9kdWxlcy9wc2tidWZmZXIvaW5kZXguanMiLCJtb2R1bGVzL3Bza2NyeXB0by9pbmRleC5qcyIsIm1vZHVsZXMvc291bmRwdWJzdWIvaW5kZXguanMiLCJtb2R1bGVzL3N3YXJtdXRpbHMvaW5kZXguanMiLCJsaWJyYXJpZXMvdXRpbHMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDN2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9NQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM3T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM3cEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1ZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5d0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNwYUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBOzs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDekJBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwicmVxdWlyZShcIi4uLy4uL21vZHVsZXMvY2FsbGZsb3cvbGliL292ZXJ3cml0ZVJlcXVpcmVcIilcblxucmVxdWlyZShcIi4vcHNrcnVudGltZV9pbnRlcm1lZGlhclwiKTtcblxucmVxdWlyZShcImNhbGxmbG93XCIpO1xuXG5jb25zb2xlLmxvZyhcIkxvYWRpbmcgcnVudGltZTogY2FsbGZsb3cgbW9kdWxlIHJlYWR5XCIpOyIsImdsb2JhbC5wc2tydW50aW1lTG9hZE1vZHVsZXMgPSBmdW5jdGlvbigpeyBcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImNhbGxmbG93XCJdID0gcmVxdWlyZShcImNhbGxmbG93XCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wibGF1bmNoZXJcIl0gPSByZXF1aXJlKFwibGF1bmNoZXJcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJkb3VibGUtY2hlY2tcIl0gPSByZXF1aXJlKFwiZG91YmxlLWNoZWNrXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wicHNrY3J5cHRvXCJdID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImRpY29udGFpbmVyXCJdID0gcmVxdWlyZShcImRpY29udGFpbmVyXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wic3dhcm11dGlsc1wiXSA9IHJlcXVpcmUoXCJzd2FybXV0aWxzXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wic291bmRwdWJzdWJcIl0gPSByZXF1aXJlKFwic291bmRwdWJzdWJcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJwc2tidWZmZXJcIl0gPSByZXF1aXJlKFwicHNrYnVmZmVyXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wiZm9sZGVybXFcIl0gPSByZXF1aXJlKFwiZm9sZGVybXFcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJkb21haW5CYXNlXCJdID0gcmVxdWlyZShcImRvbWFpbkJhc2VcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJ1dGlsc1wiXSA9IHJlcXVpcmUoXCJ1dGlsc1wiKTtcbn1cbmlmIChmYWxzZSkge1xuXHRwc2tydW50aW1lTG9hZE1vZHVsZXMoKTtcbn07IFxuZ2xvYmFsLnBza3J1bnRpbWVSZXF1aXJlID0gcmVxdWlyZTtcbmlmICh0eXBlb2YgJCQgIT09IFwidW5kZWZpbmVkXCIpIHsgICAgICAgICAgICBcbiAgICAkJC5yZXF1aXJlQnVuZGxlKFwicHNrcnVudGltZVwiKTtcbn07IiwidmFyIHB1YlN1YiA9ICQkLnJlcXVpcmUoXCJzb3VuZHB1YnN1YlwiKS5zb3VuZFB1YlN1YjtcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuXG5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uKGZvbGRlciwgY29kZUZvbGRlciApe1xuXG4gICAgJCQuUFNLX1B1YlN1YiA9IHB1YlN1YjtcbiAgICB2YXIgc2FuZEJveGVzUm9vdCA9IHBhdGguam9pbihmb2xkZXIsIFwic2FuZGJveGVzXCIpO1xuXG4gICAgdHJ5e1xuICAgICAgICBmcy5ta2RpclN5bmMoc2FuZEJveGVzUm9vdCwge3JlY3Vyc2l2ZTogdHJ1ZX0pO1xuICAgIH1jYXRjaChlcnIpe1xuICAgICAgICBjb25zb2xlLmxvZyhcIkZhaWxlZCB0byBjcmVhdGUgc2FuZGJveGVzIGRpciBzdHJ1Y3R1cmUhXCIsIGVycik7XG4gICAgICAgIC8vVE9ETzogbWF5YmUgaXQgaXMgb2sgdG8gY2FsbCBwcm9jZXNzLmV4aXQgPz8/XG4gICAgfVxuXG4gICAgJCQuU2FuZEJveE1hbmFnZXIgPSByZXF1aXJlKFwiLi4vLi4vcHNrbm9kZS9jb3JlL3NhbmRib3hlcy91dGlsL1NhbmRCb3hNYW5hZ2VyXCIpLmNyZWF0ZShzYW5kQm94ZXNSb290LCBjb2RlRm9sZGVyLCBmdW5jdGlvbihlcnIsIHJlcyl7XG4gICAgICAgIGNvbnNvbGUubG9nKCQkLkRJX2NvbXBvbmVudHMuc2FuZEJveFJlYWR5LCBlcnIsIHJlcyk7XG4gICAgICAgICQkLmNvbnRhaW5lci5yZXNvbHZlKCQkLkRJX2NvbXBvbmVudHMuc2FuZEJveFJlYWR5LCB0cnVlKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBwdWJTdWI7XG59O1xuIiwiJCQuRElfY29tcG9uZW50cyA9IHtcbiAgIHN3YXJtSXNSZWFkeTpcIlN3YXJtSXNSZWFkeVwiLFxuICAgY29uZmlnTG9hZGVkOlwiY29uZmlnTG9hZGVkXCIsXG4gICBzYW5kQm94UmVhZHk6XCJTYW5kQm94UmVhZHlcIixcbiAgIGxvY2FsTm9kZUFQSXM6XCJsb2NhbE5vZGVBUElzXCJcbn1cbiIsImNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuY29uc3Qgb3MgPSByZXF1aXJlKFwib3NcIik7XG5jb25zdCBjaGlsZF9wcm9jZXNzID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpO1xuY29uc3QgY3J5cHRvID0gcmVxdWlyZSgnY3J5cHRvJyk7XG5cbi8vIGlmIHRoaXMgaXMgc2V0IHRvIHRydWUsIHRoZSBsb2dzIHdpbGwgYmUgYXZhaWxhYmxlLiBEZWZhdWx0IChmYWxzZSlcbmNvbnN0IERFQlVHID0gIHByb2Nlc3MuZW52LkRFUExPWUVSX0RFQlVHIHx8IGZhbHNlO1xuXG5mdW5jdGlvbiBGU0V4dGVudGlvbigpe1xuXG4gICAgLyoqXG4gICAgICogQmFzZSBwYXRoIHVzZWQgdG8gcmVzb2x2ZSBhbGwgcmVsYXRpdmUgcGF0aHMgaW4gdGhlIGFjdGlvbnMgYmVsbG93LlxuICAgICAqIERlZmF1bHQgaXMgc2V0IHRvIHR3byBsZXZlbHMgdXAgZnJvbSB0aGUgY3VycmVudCBkaXJlY3RvcnkuIFRoaXMgY2FuIGJlIGNoYW5nZWQgdXNpbmcgX19zZXRCYXNlUGF0aC5cbiAgICAgKiBAdHlwZSB7KnxzdHJpbmd9XG4gICAgICovXG4gICAgdmFyIGJhc2VQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLi8uLi9cIik7XG5cbiAgICAvKipcbiAgICAgKiBTZXQgdGhlIGJhc2UgcGF0aCB0byBhIGRpZmZlcmVudCBhYnNvbHV0ZSBkaXJlY3RvcnkgcGF0aC5cbiAgICAgKiBAcGFyYW0gd2Qge1N0cmluZ30gYWJzb2x1dGUgZGlyZWN0b3J5IHBhdGguXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICB2YXIgX19zZXRCYXNlUGF0aCA9IGZ1bmN0aW9uKHdkKSB7XG4gICAgICAgIGJhc2VQYXRoID0gcGF0aC5yZXNvbHZlKHdkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNvbHZlIHBhdGggaW50byBhbiBhYnNvbHV0ZSBwYXRoLiBJZiBmaWxlUGF0aCBpcyByZWxhdGl2ZSwgdGhlIHBhdGggaXMgcmVzb2x2ZWQgdXNpbmcgdGhlIGJhc2VQYXRoIGFzIGZpcnN0IGFyZ3VtZW50LlxuICAgICAqIEBwYXJhbSBmaWxlUGF0aCB7U3RyaW5nfSByZWxhdGl2ZSBvciBhYnNvbHV0ZSBmaWxlIHBhdGguXG4gICAgICogQHJldHVybnMge1N0cmluZ30gYWJzb2x1dGUgcGF0aFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdmFyIF9fcmVzb2x2ZVBhdGggPSBmdW5jdGlvbihmaWxlUGF0aCkge1xuICAgICAgICBpZihwYXRoLmlzQWJzb2x1dGUoZmlsZVBhdGgpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmlsZVBhdGg7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcGF0aC5yZXNvbHZlKGJhc2VQYXRoLCBmaWxlUGF0aCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSWYgdGhlIGRpcmVjdG9yeSBzdHJ1Y3R1cmUgZG9lcyBub3QgZXhpc3QsIGl0IGlzIGNyZWF0ZWQuIExpa2UgbWtkaXIgLXBcbiAgICAgKiBAcGFyYW0gZGlyIHtTdHJpbmd9IGRpciBwYXRoXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICB2YXIgX19jcmVhdGVEaXIgPSBmdW5jdGlvbihkaXIpIHtcbiAgICAgICAgZGlyID0gX19yZXNvbHZlUGF0aChkaXIpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgICAgICBsb2coZGlyICsgXCIgYWxyZWFkeSBleGlzdCEgQ29udGludWluZyAuLi5cIilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpc1dpbiA9IChvcy5wbGF0Zm9ybSgpID09PSAnd2luMzInKTtcbiAgICAgICAgdmFyIGNtZCA9IGlzV2luID8gXCJta2RpciBcIiA6IFwibWtkaXIgLXAgXCI7XG5cbiAgICAgICAgY2hpbGRfcHJvY2Vzcy5leGVjU3luYyhjbWQgKyBcIlxcXCJcIitkaXIrXCJcXFwiXCIsIHtzdGRpbzpbMCwxLDJdfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29weSBhIGZpbGUgb3IgZGlyZWN0b3J5LiBUaGUgZGlyZWN0b3J5IGNhbiBoYXZlIHJlY3Vyc2l2ZSBjb250ZW50cy4gTGlrZSBjb3B5IC1yLlxuICAgICAqIE5PVEU6IElmIHNyYyBpcyBhIGRpcmVjdG9yeSBpdCB3aWxsIGNvcHkgZXZlcnl0aGluZyBpbnNpZGUgb2YgdGhlIGRpcmVjdG9yeSwgbm90IHRoZSBlbnRpcmUgZGlyZWN0b3J5IGl0c2VsZi5cbiAgICAgKiBOT1RFOiBJZiBzcmMgaXMgYSBmaWxlLCB0YXJnZXQgY2Fubm90IGJlIGEgZGlyZWN0b3J5LlxuICAgICAqIE5PVEU6IElmIHRoZSBkZXN0aW5hdGlvbiBwYXRoIHN0cnVjdHVyZSBkb2VzIG5vdCBleGlzdHMsIGl0IHdpbGwgYmUgY3JlYXRlZC5cbiAgICAgKiBAcGFyYW0gc3JjIHtTdHJpbmd9IFNvdXJjZSBmaWxlfGRpcmVjdG9yeSBwYXRoLlxuICAgICAqIEBwYXJhbSBkZXN0IHtTdHJpbmd9IERlc3RpbmF0aW9uIGZpbGV8ZGlyZWN0b3J5IHBhdGguXG4gICAgICogQHBhcmFtIG9wdGlvbnMge09iamVjdH0gT3B0aW9uYWwgcGFyYW1ldGVycyBmb3IgY29weSBhY3Rpb24uIEF2YWlsYWJsZSBvcHRpb25zOlxuICAgICAqICAtIG92ZXJ3cml0ZSA8Qm9vbGVhbj46IG92ZXJ3cml0ZSBleGlzdGluZyBmaWxlIG9yIGRpcmVjdG9yeSwgZGVmYXVsdCBpcyB0cnVlLlxuICAgICAqICBOb3RlIHRoYXQgdGhlIGNvcHkgb3BlcmF0aW9uIHdpbGwgc2lsZW50bHkgZmFpbCBpZiB0aGlzIGlzIHNldCB0byBmYWxzZSBhbmQgdGhlIGRlc3RpbmF0aW9uIGV4aXN0cy5cbiAgICAgKiBAcGFyYW0gY2FsbGJhY2sge0Z1bmN0aW9ufVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdmFyIF9fY29weSA9IGZ1bmN0aW9uIChzcmMsIGRlc3QsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIHNyYyA9IF9fcmVzb2x2ZVBhdGgoc3JjKTtcbiAgICAgICAgZGVzdCA9IF9fcmVzb2x2ZVBhdGgoZGVzdCk7XG5cbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbigpe307XG4gICAgICAgIGxldCByZXRocm93ID0gZmFsc2U7XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHNyYykpIHtcbiAgICAgICAgICAgICAgICByZXRocm93ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aHJvdyBgU291cmNlIGRpcmVjdG9yeSBvciBmaWxlIFwiJHtzcmN9XCIgZG9lcyBub3QgZXhpc3RzIWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBzcmNTdGF0ID0gZnMubHN0YXRTeW5jKHNyYyk7XG4gICAgICAgICAgICBpZihzcmNTdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICBfX2NvcHlEaXIoc3JjLCBkZXN0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihzcmNTdGF0LmlzRmlsZSgpKSB7XG4gICAgICAgICAgICAgICAgLy8gZGVzdGluYXRpb24gbXVzdCBiZSBhIGZpbGUgdG9vXG4gICAgICAgICAgICAgICAgX19jb3B5RmlsZShzcmMsIGRlc3QsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmKHJldGhyb3cpe1xuICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxvZyhlcnIsIHRydWUpO1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29weSBhIGRpcmVjdG9yeS4gVGhlIGRpcmVjdG9yeSBjYW4gaGF2ZSByZWN1cnNpdmUgY29udGVudHMuIExpa2UgY29weSAtci5cbiAgICAgKiBOT1RFOiBJdHQgd2lsbCBjb3B5IGV2ZXJ5dGhpbmcgaW5zaWRlIG9mIHRoZSBkaXJlY3RvcnksIG5vdCB0aGUgZW50aXJlIGRpcmVjdG9yeSBpdHNlbGYuXG4gICAgICogTk9URTogSWYgdGhlIGRlc3RpbmF0aW9uIHBhdGggc3RydWN0dXJlIGRvZXMgbm90IGV4aXN0cywgaXQgd2lsbCBiZSBjcmVhdGVkLlxuICAgICAqIEBwYXJhbSBzcmMge1N0cmluZ30gU291cmNlIGRpcmVjdG9yeSBwYXRoLlxuICAgICAqIEBwYXJhbSBkZXN0IHtTdHJpbmd9IERlc3RpbmF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICAgICAqIEBwYXJhbSBvcHRpb25zIHtPYmplY3R9IE9wdGlvbmFsIHBhcmFtZXRlcnMgZm9yIGNvcHkgYWN0aW9uLiBBdmFpbGFibGUgb3B0aW9uczpcbiAgICAgKiAgLSBvdmVyd3JpdGUgPEJvb2xlYW4+OiBvdmVyd3JpdGUgZXhpc3RpbmcgZGlyZWN0b3J5LCBkZWZhdWx0IGlzIHRydWUuXG4gICAgICogIE5vdGUgdGhhdCB0aGUgY29weSBvcGVyYXRpb24gd2lsbCBzaWxlbnRseSBmYWlsIGlmIHRoaXMgaXMgc2V0IHRvIGZhbHNlIGFuZCB0aGUgZGVzdGluYXRpb24gZXhpc3RzLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdmFyIF9fY29weURpciA9IGZ1bmN0aW9uKHNyYywgZGVzdCwgb3B0aW9ucykge1xuICAgICAgICBzcmMgPSBfX3Jlc29sdmVQYXRoKHNyYyk7XG4gICAgICAgIGRlc3QgPSBfX3Jlc29sdmVQYXRoKGRlc3QpO1xuXG4gICAgICAgIF9fY3JlYXRlRGlyKGRlc3QpO1xuXG4gICAgICAgIHZhciBmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKHNyYyk7XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBmaWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IGN1cnJlbnQgPSBmcy5sc3RhdFN5bmMocGF0aC5qb2luKHNyYywgZmlsZXNbaV0pKTtcbiAgICAgICAgICAgIGxldCBuZXdTcmMgPSBwYXRoLmpvaW4oc3JjLCBmaWxlc1tpXSk7XG4gICAgICAgICAgICBsZXQgbmV3RGVzdCA9IHBhdGguam9pbihkZXN0LCBmaWxlc1tpXSk7XG5cbiAgICAgICAgICAgIGlmKGN1cnJlbnQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgIF9fY29weURpcihuZXdTcmMsIG5ld0Rlc3QsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGN1cnJlbnQuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgICAgIHZhciBzeW1saW5rID0gZnMucmVhZGxpbmtTeW5jKG5ld1NyYyk7XG4gICAgICAgICAgICAgICAgZnMuc3ltbGlua1N5bmMoc3ltbGluaywgbmV3RGVzdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9fY29weUZpbGUobmV3U3JjLCBuZXdEZXN0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb3B5IGEgZmlsZS5cbiAgICAgKiBOT1RFOiBJZiBzcmMgaXMgYSBmaWxlLCB0YXJnZXQgY2Fubm90IGJlIGEgZGlyZWN0b3J5LlxuICAgICAqIE5PVEU6IElmIHRoZSBkZXN0aW5hdGlvbiBwYXRoIHN0cnVjdHVyZSBkb2VzIG5vdCBleGlzdHMsIGl0IHdpbGwgYmUgY3JlYXRlZC5cbiAgICAgKiBAcGFyYW0gc3JjIHtTdHJpbmd9IFNvdXJjZSBmaWxlIHBhdGguXG4gICAgICogQHBhcmFtIGRlc3Qge1N0cmluZ30gRGVzdGluYXRpb24gZmlsZSBwYXRoLlxuICAgICAqIEBwYXJhbSBvcHRpb25zIHtPYmplY3R9IE9wdGlvbmFsIHBhcmFtZXRlcnMgZm9yIGNvcHkgYWN0aW9uLiBBdmFpbGFibGUgb3B0aW9uczpcbiAgICAgKiAgLSBvdmVyd3JpdGUgPEJvb2xlYW4+OiBvdmVyd3JpdGUgZXhpc3RpbmcgZmlsZSBvciBkaXJlY3RvcnksIGRlZmF1bHQgaXMgdHJ1ZS5cbiAgICAgKiAgTm90ZSB0aGF0IHRoZSBjb3B5IG9wZXJhdGlvbiB3aWxsIHNpbGVudGx5IGZhaWwgaWYgdGhpcyBpcyBzZXQgdG8gZmFsc2UgYW5kIHRoZSBkZXN0aW5hdGlvbiBleGlzdHMuXG4gICAgICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHZhciBfX2NvcHlGaWxlID0gZnVuY3Rpb24oc3JjLCBkZXN0LCBvcHRpb25zKSB7XG4gICAgICAgIHNyYyA9IF9fcmVzb2x2ZVBhdGgoc3JjKTtcbiAgICAgICAgZGVzdCA9IF9fcmVzb2x2ZVBhdGgoZGVzdCk7XG5cbiAgICAgICAgaWYob3B0aW9ucyAmJiBvcHRpb25zLm92ZXJ3cml0ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGRlc3QpKSB7XG4gICAgICAgICAgICAgICAgLy8gc2lsZW50bHkgZmFpbCBpZiBvdmVyd3JpdGUgaXMgc2V0IHRvIGZhbHNlIGFuZCB0aGUgZGVzdGluYXRpb24gZXhpc3RzLlxuICAgICAgICAgICAgICAgIGxldCBlcnJvciA9IGBTaWxlbnQgZmFpbCAtIGNhbm5vdCBjb3B5LiBEZXN0aW5hdGlvbiBmaWxlICR7ZGVzdH0gYWxyZWFkeSBleGlzdHMgYW5kIG92ZXJ3cml0ZSBvcHRpb24gaXMgc2V0IHRvIGZhbHNlISBDb250aW51aW5nLi4uYDtcbiAgICAgICAgICAgICAgICBsb2coZXJyb3IsIHRydWUpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBfX2NyZWF0ZURpcihwYXRoLmRpcm5hbWUoZGVzdCkpO1xuXG4gICAgICAgIHZhciBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHNyYywgXCJ1dGY4XCIpO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGRlc3QsIGNvbnRlbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBmaWxlIG9yIGRpcmVjdG9yeS4gVGhlIGRpcmVjdG9yeSBjYW4gaGF2ZSByZWN1cnNpdmUgY29udGVudHMuIExpa2Ugcm0gLXJmXG4gICAgICogQHBhcmFtIHNyYyB7U3RyaW5nfSBQYXRoXG4gICAgICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHZhciBfX3JlbW92ZSA9IGZ1bmN0aW9uKHNyYywgY2FsbGJhY2spIHtcbiAgICAgICAgc3JjID0gX19yZXNvbHZlUGF0aChzcmMpO1xuXG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24oKXt9O1xuXG4gICAgICAgIGxvZyhgUmVtb3ZpbmcgJHtzcmN9YCk7XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgbGV0IGN1cnJlbnQgPSBmcy5sc3RhdFN5bmMoc3JjKTtcbiAgICAgICAgICAgIGlmKGN1cnJlbnQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgIF9fcm1EaXIoc3JjKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihjdXJyZW50LmlzRmlsZSgpKSB7XG4gICAgICAgICAgICAgICAgX19ybUZpbGUoc3JjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBpZihlcnIuY29kZSAmJiBlcnIuY29kZSA9PT0gXCJFTk9FTlRcIil7XG4gICAgICAgICAgICAgICAgLy9pZ25vcmluZyBlcnJvcnMgbGlrZSBcImZpbGUvZGlyZWN0b3J5IGRvZXMgbm90IGV4aXN0XCJcbiAgICAgICAgICAgICAgICBlcnIgPSBudWxsO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgbG9nKGVyciwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGEgZGlyZWN0b3J5LiBUaGUgZGlyZWN0b3J5IGNhbiBoYXZlIHJlY3Vyc2l2ZSBjb250ZW50cy4gTGlrZSBybSAtcmZcbiAgICAgKiBAcGFyYW0gZGlyIHtTdHJpbmd9IFBhdGhcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHZhciBfX3JtRGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgICAgICBkaXIgPSBfX3Jlc29sdmVQYXRoKGRpcik7XG5cbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGRpcikpIHtcbiAgICAgICAgICAgIGxvZyhgRGlyZWN0b3J5ICR7ZGlyfSBkb2VzIG5vdCBleGlzdCFgLCB0cnVlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsaXN0ID0gZnMucmVhZGRpclN5bmMoZGlyKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZmlsZW5hbWUgPSBwYXRoLmpvaW4oZGlyLCBsaXN0W2ldKTtcbiAgICAgICAgICAgIHZhciBzdGF0ID0gZnMubHN0YXRTeW5jKGZpbGVuYW1lKTtcblxuICAgICAgICAgICAgaWYgKHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgIF9fcm1EaXIoZmlsZW5hbWUsIG51bGwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBybSBmaWxlbmFtZVxuICAgICAgICAgICAgICAgIGZzLnVubGlua1N5bmMoZmlsZW5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnMucm1kaXJTeW5jKGRpcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhIGZpbGUuXG4gICAgICogQHBhcmFtIGZpbGUge1N0cmluZ30gUGF0aFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdmFyIF9fcm1GaWxlID0gZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICBmaWxlID0gX19yZXNvbHZlUGF0aChmaWxlKTtcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGZpbGUpKSB7XG4gICAgICAgICAgICBsb2coYEZpbGUgJHtmaWxlfSBkb2VzIG5vdCBleGlzdCFgLCB0cnVlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZzLnVubGlua1N5bmMoZmlsZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogV3JpdGVzIGRhdGEgdG8gYSBmaWxlLCByZXBsYWNpbmcgdGhlIGZpbGUgaWYgaXQgYWxyZWFkeSBleGlzdHMuXG4gICAgICogQHBhcmFtIGZpbGUge1N0cmluZ30gUGF0aC5cbiAgICAgKiBAcGFyYW0gZGF0YSB7U3RyaW5nfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdmFyIF9fY3JlYXRlRmlsZSA9IGZ1bmN0aW9uKGZpbGUsIGRhdGEsIG9wdGlvbnMpIHtcbiAgICAgICAgZmlsZSA9IF9fcmVzb2x2ZVBhdGgoZmlsZSlcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhmaWxlLCBkYXRhLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNb3ZlcyBhIGZpbGUgb3IgZGlyZWN0b3J5LlxuICAgICAqIEBwYXJhbSBzcmMge1N0cmluZ30gU291cmNlIHBhdGguXG4gICAgICogQHBhcmFtIGRlc3Qge1N0cmluZ30gRGVzdGluYXRpb24gcGF0aC5cbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB7T2JqZWN0fS4gT3B0aW9uYWwgcGFyYW1ldGVycyBmb3IgY29weSBhY3Rpb24uIEF2YWlsYWJsZSBvcHRpb25zOlxuICAgICAqICAtIG92ZXJ3cml0ZSA8Ym9vbGVhbj46IG92ZXJ3cml0ZSBleGlzdGluZyBmaWxlIG9yIGRpcmVjdG9yeSwgZGVmYXVsdCBpcyBmYWxzZS4gTm90ZSB0aGF0IHRoZSBtb3ZlIG9wZXJhdGlvbiB3aWxsIHNpbGVudGx5IGZhaWwgaWYgeW91IHNldCB0aGlzIHRvIHRydWUgYW5kIHRoZSBkZXN0aW5hdGlvbiBleGlzdHMuXG4gICAgICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHZhciBfX21vdmUgPSBmdW5jdGlvbihzcmMsIGRlc3QsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIHNyYyA9IF9fcmVzb2x2ZVBhdGgoc3JjKTtcbiAgICAgICAgZGVzdCA9IF9fcmVzb2x2ZVBhdGgoZGVzdCk7XG5cbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbigpe307XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmKG9wdGlvbnMgJiYgb3B0aW9ucy5vdmVyd3JpdGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZGVzdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2lsZW50bHkgZmFpbCBpZiBvdmVyd3JpdGUgaXMgc2V0IHRvIGZhbHNlIGFuZCB0aGUgZGVzdGluYXRpb24gZXhpc3RzLlxuICAgICAgICAgICAgICAgICAgICBsZXQgZXJyb3IgPSBgU2lsZW50IGZhaWwgLSBjYW5ub3QgbW92ZS4gRGVzdGluYXRpb24gZmlsZSAke2Rlc3R9IGFscmVhZHkgZXhpc3RzIGFuZCBvdmVyd3JpdGUgb3B0aW9uIGlzIHNldCB0byBmYWxzZSEgQ29udGludWluZy4uLmA7XG4gICAgICAgICAgICAgICAgICAgIGxvZyhlcnJvciwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9fY29weShzcmMsIGRlc3QsIG9wdGlvbnMpO1xuICAgICAgICAgICAgX19yZW1vdmUoc3JjKTtcbiAgICAgICAgfWNhdGNoKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbXB1dGVzIGNoZWNrc3VtIHRvIGEgZmlsZSBvciBhIGRpcmVjdG9yeSBiYXNlZCBvbiB0aGVpciBjb250ZW50cyBvbmx5LlxuICAgICAqIElmIHRoZSBzb3VyY2UgaXMgZGlyZWN0b3J5LCB0aGUgY2hlY2tzdW0gaXMgYSBoYXNoIG9mIGFsbCBjb25jYXRlbmF0ZWQgZmlsZSBoYXNoZXMuXG4gICAgICogQHBhcmFtIHNyYyB7U3RyaW5nfSBQYXRoIG9mIGEgZmlsZSBvciBkaXJlY3RvcnkuXG4gICAgICogQHBhcmFtIGFsZ29yaXRobSB7U3RyaW5nfSBIYXNoaW5nIGFsZ29yaXRobShkZWZhdWx0OiBtZDUpLiBUaGUgYWxnb3JpdGhtIGlzIGRlcGVuZGVudCBvbiB0aGUgYXZhaWxhYmxlIGFsZ29yaXRobXNcbiAgICAgKiBzdXBwb3J0ZWQgYnkgdGhlIHZlcnNpb24gb2YgT3BlblNTTCBvbiB0aGUgcGxhdGZvcm0uIEUuZy4gJ21kNScsICdzaGEyNTYnLCAnc2hhNTEyJy5cbiAgICAgKiBAcGFyYW0gZW5jb2Rpbmcge1N0cmluZ30gSGFzaGluZyBlbmNvZGluZyAoZGVmYXVsdDogJ2hleCcpLiBUaGUgZW5jb2RpbmcgaXMgZGVwZW5kZW50IG9uIHRoZVxuICAgICAqIGF2YWlsYWJsZSBkaWdlc3QgYWxnb3JpdGhtcy4gRS5nLiAnaGV4JywgJ2xhdGluMScgb3IgJ2Jhc2U2NCcuXG4gICAgICogQHJldHVybnMge1N0cmluZ30gQ2hlY2tzdW0gb2YgdGhlIGZpbGUgb3IgZGlyZWN0b3J5LlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdmFyIF9fY2hlY2tzdW0gPSBmdW5jdGlvbihzcmMsIGFsZ29yaXRobSwgZW5jb2RpbmcpIHtcbiAgICAgICAgc3JjID0gX19yZXNvbHZlUGF0aChzcmMpO1xuXG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzcmMpKSB7XG4gICAgICAgICAgICB0aHJvdyBgUGF0aCAke3NyY30gZG9lcyBub3QgZXhpc3RzIWA7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hlY2tzdW0gPSBcIlwiO1xuICAgICAgICBsZXQgY3VycmVudCA9IGZzLmxzdGF0U3luYyhzcmMpO1xuICAgICAgICBpZihjdXJyZW50LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgIGxldCBoYXNoRGlyID0gX19oYXNoRGlyKHNyYywgYWxnb3JpdGhtLCBlbmNvZGluZyk7XG4gICAgICAgICAgICBjaGVja3N1bSA9IGhhc2hEaXJbXCJoYXNoXCJdO1xuICAgICAgICB9IGVsc2UgaWYoY3VycmVudC5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgY2hlY2tzdW0gPSBfX2hhc2hGaWxlKHNyYywgYWxnb3JpdGhtLCBlbmNvZGluZyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hlY2tzdW07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcHV0ZXMgaGFzaCBvZiBhIHN0cmluZy5cbiAgICAgKiBAcGFyYW0gc3RyIHtTdHJpbmd9XG4gICAgICogQHBhcmFtIGFsZ29yaXRobSB7U3RyaW5nfSBIYXNoaW5nIGFsZ29yaXRobShkZWZhdWx0OiBtZDUpLiBUaGUgYWxnb3JpdGhtIGlzIGRlcGVuZGVudCBvbiB0aGUgYXZhaWxhYmxlIGFsZ29yaXRobXNcbiAgICAgKiBzdXBwb3J0ZWQgYnkgdGhlIHZlcnNpb24gb2YgT3BlblNTTCBvbiB0aGUgcGxhdGZvcm0uIEUuZy4gJ21kNScsICdzaGEyNTYnLCAnc2hhNTEyJy5cbiAgICAgKiBAcGFyYW0gZW5jb2Rpbmcge1N0cmluZ30gSGFzaGluZyBlbmNvZGluZyAoZGVmYXVsdDogJ2hleCcpLiBUaGUgZW5jb2RpbmcgaXMgZGVwZW5kZW50IG9uIHRoZVxuICAgICAqIGF2YWlsYWJsZSBkaWdlc3QgYWxnb3JpdGhtcy4gRS5nLiAnaGV4JywgJ2xhdGluMScgb3IgJ2Jhc2U2NCcuXG4gICAgICogQHJldHVybnMge1N0cmluZ30gSGFzaCBvZiB0aGUgc3RyaW5nLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdmFyIF9faGFzaCA9ICBmdW5jdGlvbihzdHIsIGFsZ29yaXRobSwgZW5jb2RpbmcpIHtcbiAgICAgICAgcmV0dXJuIGNyeXB0b1xuICAgICAgICAgICAgLmNyZWF0ZUhhc2goYWxnb3JpdGhtIHx8ICdtZDUnKVxuICAgICAgICAgICAgLnVwZGF0ZShzdHIsICd1dGY4JylcbiAgICAgICAgICAgIC5kaWdlc3QoZW5jb2RpbmcgfHwgJ2hleCcpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcHV0ZXMgaGFzaCBvZiBhIGZpbGUgYmFzZWQgb24gaXRzIGNvbnRlbnQgb25seS5cbiAgICAgKiBAcGFyYW0gc3JjIHtTdHJpbmd9IFBhdGggb2YgYSBmaWxlLlxuICAgICAqIEBwYXJhbSBhbGdvcml0aG0ge1N0cmluZ30gSGFzaGluZyBhbGdvcml0aG0oZGVmYXVsdDogbWQ1KS4gVGhlIGFsZ29yaXRobSBpcyBkZXBlbmRlbnQgb24gdGhlIGF2YWlsYWJsZSBhbGdvcml0aG1zXG4gICAgICogc3VwcG9ydGVkIGJ5IHRoZSB2ZXJzaW9uIG9mIE9wZW5TU0wgb24gdGhlIHBsYXRmb3JtLiBFLmcuICdtZDUnLCAnc2hhMjU2JywgJ3NoYTUxMicuXG4gICAgICogQHBhcmFtIGVuY29kaW5nIHtTdHJpbmd9IEhhc2hpbmcgZW5jb2RpbmcgKGRlZmF1bHQ6ICdoZXgnKS4gVGhlIGVuY29kaW5nIGlzIGRlcGVuZGVudCBvbiB0aGVcbiAgICAgKiBhdmFpbGFibGUgZGlnZXN0IGFsZ29yaXRobXMuIEUuZy4gJ2hleCcsICdsYXRpbjEnIG9yICdiYXNlNjQnLlxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IEhhc2ggb2YgdGhlIGZpbGUuXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICB2YXIgX19oYXNoRmlsZSA9IGZ1bmN0aW9uKHNyYywgYWxnb3JpdGhtLCBlbmNvZGluZykge1xuICAgICAgICBzcmMgPSBfX3Jlc29sdmVQYXRoKHNyYyk7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzcmMpKSB7XG4gICAgICAgICAgICB0aHJvdyBgJHtzcmN9IGRvZXMgbm90IGV4aXN0IWA7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhzcmMsIFwidXRmOFwiKTtcbiAgICAgICAgcmV0dXJuIF9faGFzaChjb250ZW50LCBhbGdvcml0aG0sIGVuY29kaW5nKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wdXRlcyBoYXNoIG9mIGEgZGlyZWN0b3J5IGJhc2VkIG9uIGl0cyBjb250ZW50IG9ubHkuXG4gICAgICogSWYgZGlyZWN0b3J5IGhhcyBtdWx0aXBsZSBmaWxlcywgdGhlIHJlc3VsdCBpcyBhIGhhc2ggb2YgYWxsIGNvbmNhdGVuYXRlZCBmaWxlIGhhc2hlcy5cbiAgICAgKiBAcGFyYW0gc3JjIHtTdHJpbmd9IFBhdGggb2YgYSBkaXJlY3RvcnkuXG4gICAgICogQHBhcmFtIGFsZ29yaXRobSB7U3RyaW5nfSBIYXNoaW5nIGFsZ29yaXRobShkZWZhdWx0OiBtZDUpLiBUaGUgYWxnb3JpdGhtIGlzIGRlcGVuZGVudCBvbiB0aGUgYXZhaWxhYmxlIGFsZ29yaXRobXNcbiAgICAgKiBzdXBwb3J0ZWQgYnkgdGhlIHZlcnNpb24gb2YgT3BlblNTTCBvbiB0aGUgcGxhdGZvcm0uIEUuZy4gJ21kNScsICdzaGEyNTYnLCAnc2hhNTEyJy5cbiAgICAgKiBAcGFyYW0gZW5jb2Rpbmcge1N0cmluZ30gSGFzaGluZyBlbmNvZGluZyAoZGVmYXVsdDogJ2hleCcpLiBUaGUgZW5jb2RpbmcgaXMgZGVwZW5kZW50IG9uIHRoZVxuICAgICAqIGF2YWlsYWJsZSBkaWdlc3QgYWxnb3JpdGhtcy4gRS5nLiAnaGV4JywgJ2xhdGluMScgb3IgJ2Jhc2U2NCcuXG4gICAgICogQHJldHVybnMge1N0cmluZ30gSGFzaCBvZiB0aGUgZGlyZWN0b3J5LlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdmFyIF9faGFzaERpciA9IGZ1bmN0aW9uKGRpciwgYWxnb3JpdGhtLCBlbmNvZGluZykge1xuICAgICAgICBkaXIgPSBfX3Jlc29sdmVQYXRoKGRpcik7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgICAgICB0aHJvdyBgRGlyZWN0b3J5ICR7ZGlyfSBkb2VzIG5vdCBleGlzdCFgO1xuICAgICAgICB9XG4gICAgICAgIHZhciBoYXNoZXMgPSB7fTtcbiAgICAgICAgdmFyIGxpc3QgPSBmcy5yZWFkZGlyU3luYyhkaXIpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBmaWxlbmFtZSA9IHBhdGguam9pbihkaXIsIGxpc3RbaV0pO1xuICAgICAgICAgICAgdmFyIHN0YXQgPSBmcy5sc3RhdFN5bmMoZmlsZW5hbWUpO1xuXG4gICAgICAgICAgICBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgICAgbGV0IHRlbXBIYXNoZXMgPSBfX2hhc2hEaXIoZmlsZW5hbWUsIGFsZ29yaXRobSwgZW5jb2RpbmcpO1xuICAgICAgICAgICAgICAgIGhhc2hlcyA9IE9iamVjdC5hc3NpZ24oaGFzaGVzLCB0ZW1wSGFzaGVzW1wic3ViLWhhc2hlc1wiXSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCB0ZW1wSGFzaCA9IF9faGFzaEZpbGUoZmlsZW5hbWUsIGFsZ29yaXRobSwgZW5jb2RpbmcpO1xuICAgICAgICAgICAgICAgIGhhc2hlc1tmaWxlbmFtZV0gPSB0ZW1wSGFzaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbXB1dGUgZGlyIGhhc2hcbiAgICAgICAgbGV0IGRpckNvbnRlbnQgPSBPYmplY3Qua2V5cyhoYXNoZXMpLnJlZHVjZShmdW5jdGlvbiAocHJldmlvdXMsIGtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHByZXZpb3VzICs9IGhhc2hlc1trZXldO1xuICAgICAgICB9LCBcIlwiKTtcblxuICAgICAgICBsZXQgZGlySGFzaCA9IF9faGFzaChkaXJDb250ZW50LCBhbGdvcml0aG0sIGVuY29kaW5nKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJoYXNoXCI6IGRpckhhc2gsXG4gICAgICAgICAgICBcInN1Yi1oYXNoZXNcIjogaGFzaGVzXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgYSBndWlkIChnbG9iYWwgdW5pcXVlIGlkZW50aWZpZXIpLlxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IEd1aWQgaW4gdGhlIGZvcm1hdCB4eHh4eHh4eC14eHh4LXh4eHgteHh4eC14eHh4eHh4eHh4eHhcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHZhciBfX2d1aWQgPSBmdW5jdGlvbiBndWlkKCkge1xuICAgICAgICBmdW5jdGlvbiBfbWFrZV9ncm91cChzKSB7XG4gICAgICAgICAgICB2YXIgcCA9IChNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KStcIjAwMDAwMDAwMFwiKS5zdWJzdHIoMiw4KTtcbiAgICAgICAgICAgIHJldHVybiBzID8gXCItXCIgKyBwLnN1YnN0cigwLDQpICsgXCItXCIgKyBwLnN1YnN0cig0LDQpIDogcCA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF9tYWtlX2dyb3VwKCkgKyBfbWFrZV9ncm91cCh0cnVlKSArIF9tYWtlX2dyb3VwKHRydWUpICsgX21ha2VfZ3JvdXAoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2dzIHdyYXBwZXIuXG4gICAgICogQHBhcmFtIG1lc3NhZ2Uge1N0cmluZ31cbiAgICAgKiBAcGFyYW0gaXNFcnJvciB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2cobWVzc2FnZSwgaXNFcnJvcikge1xuICAgICAgICBsZXQgbG9nZ2VyID0gaXNFcnJvciA/IGNvbnNvbGUuZXJyb3IgOiBjb25zb2xlLmxvZztcblxuICAgICAgICBpZihERUJVRykge1xuICAgICAgICAgICAgbG9nZ2VyKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2V0QmFzZVBhdGg6IF9fc2V0QmFzZVBhdGgsXG4gICAgICAgIHJlc29sdmVQYXRoOiBfX3Jlc29sdmVQYXRoLFxuICAgICAgICBjcmVhdGVEaXI6IF9fY3JlYXRlRGlyLFxuICAgICAgICBjb3B5RGlyOiBfX2NvcHlEaXIsXG4gICAgICAgIHJtRGlyOiBfX3JtRGlyLFxuICAgICAgICBybUZpbGU6IF9fcm1GaWxlLFxuICAgICAgICBjcmVhdGVGaWxlOiBfX2NyZWF0ZUZpbGUsXG4gICAgICAgIGNvcHk6IF9fY29weSxcbiAgICAgICAgbW92ZTogX19tb3ZlLFxuICAgICAgICByZW1vdmU6IF9fcmVtb3ZlLFxuICAgICAgICBjaGVja3N1bTogX19jaGVja3N1bSxcbiAgICAgICAgZ3VpZDogX19ndWlkXG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cy5mc0V4dCA9IG5ldyBGU0V4dGVudGlvbigpOyIsIiQkLkNPTlNUQU5UUyA9IHtcbiAgICBTV0FSTV9GT1JfRVhFQ1VUSU9OOlwic3dhcm1fZm9yX2V4ZWN1dGlvblwiLFxuICAgIElOQk9VTkQ6XCJpbmJvdW5kXCIsXG4gICAgT1VUQk9VTkQ6XCJvdXRib3VuZFwiLFxuICAgIFBEUzpcIlByaXZhdGVEYXRhU3lzdGVtXCIsXG4gICAgQ1JMOlwiQ29tbXVuaWNhdGlvblJlcGxpY2F0aW9uTGF5ZXJcIixcbiAgICBTV0FSTV9SRVRVUk46ICdzd2FybV9yZXR1cm4nLFxuICAgIEJFRk9SRV9JTlRFUkNFUFRPUjogJ2JlZm9yZScsXG4gICAgQUZURVJfSU5URVJDRVBUT1I6ICdhZnRlcicsXG59O1xuXG4iLCIvLyByZWxhdGVkIHRvOiBTd2FybVNwYWNlLlN3YXJtRGVzY3JpcHRpb24uY3JlYXRlUGhhc2UoKVxuXG5mdW5jdGlvbiBJbnRlcmNlcHRvclJlZ2lzdHJ5KCkge1xuICAgIGNvbnN0IHJ1bGVzID0gbmV3IE1hcCgpO1xuXG4gICAgLy8gPz8/ICQkLmVycm9ySGFuZGxlciBMaWJyYXJ5ID8/P1xuICAgIGNvbnN0IF9DTEFTU19OQU1FID0gJ0ludGVyY2VwdG9yUmVnaXN0cnknO1xuXG4gICAgLyoqKioqKioqKioqKiogUFJJVkFURSBNRVRIT0RTICoqKioqKioqKioqKiovXG5cbiAgICBmdW5jdGlvbiBfdGhyb3dFcnJvcihlcnIsIG1zZykge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVyci5tZXNzYWdlLCBgJHtfQ0xBU1NfTkFNRX0gZXJyb3IgbWVzc2FnZTpgLCBtc2cpO1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX3dhcm5pbmcobXNnKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgJHtfQ0xBU1NfTkFNRX0gd2FybmluZyBtZXNzYWdlOmAsIG1zZyk7XG4gICAgfVxuXG4gICAgY29uc3QgZ2V0V2hlbk9wdGlvbnMgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgV0hFTl9PUFRJT05TO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKFdIRU5fT1BUSU9OUyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgV0hFTl9PUFRJT05TID0gT2JqZWN0LmZyZWV6ZShbXG4gICAgICAgICAgICAgICAgICAgICQkLkNPTlNUQU5UUy5CRUZPUkVfSU5URVJDRVBUT1IsXG4gICAgICAgICAgICAgICAgICAgICQkLkNPTlNUQU5UUy5BRlRFUl9JTlRFUkNFUFRPUlxuICAgICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFdIRU5fT1BUSU9OUztcbiAgICAgICAgfTtcbiAgICB9KSgpO1xuXG4gICAgZnVuY3Rpb24gdmVyaWZ5V2hlbk9wdGlvbih3aGVuKSB7XG4gICAgICAgIGlmICghZ2V0V2hlbk9wdGlvbnMoKS5pbmNsdWRlcyh3aGVuKSkge1xuICAgICAgICAgICAgX3Rocm93RXJyb3IobmV3IFJhbmdlRXJyb3IoYE9wdGlvbiAnJHt3aGVufScgaXMgd3JvbmchYCksXG4gICAgICAgICAgICAgICAgYGl0IHNob3VsZCBiZSBvbmUgb2Y6ICR7Z2V0V2hlbk9wdGlvbnMoKX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZlcmlmeUlzRnVuY3Rpb25UeXBlKGZuKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIF90aHJvd0Vycm9yKG5ldyBUeXBlRXJyb3IoYFBhcmFtZXRlciAnJHtmbn0nIGlzIHdyb25nIWApLFxuICAgICAgICAgICAgICAgIGBpdCBzaG91bGQgYmUgYSBmdW5jdGlvbiwgbm90ICR7dHlwZW9mIGZufSFgKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc29sdmVOYW1lc3BhY2VSZXNvbHV0aW9uKHN3YXJtVHlwZU5hbWUpIHtcbiAgICAgICAgaWYgKHN3YXJtVHlwZU5hbWUgPT09ICcqJykge1xuICAgICAgICAgICAgcmV0dXJuIHN3YXJtVHlwZU5hbWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gKHN3YXJtVHlwZU5hbWUuaW5jbHVkZXMoXCIuXCIpID8gc3dhcm1UeXBlTmFtZSA6ICgkJC5saWJyYXJ5UHJlZml4ICsgXCIuXCIgKyBzd2FybVR5cGVOYW1lKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJhbnNmb3JtcyBhbiBhcnJheSBpbnRvIGEgZ2VuZXJhdG9yIHdpdGggdGhlIHBhcnRpY3VsYXJpdHkgdGhhdCBkb25lIGlzIHNldCB0byB0cnVlIG9uIHRoZSBsYXN0IGVsZW1lbnQsXG4gICAgICogbm90IGFmdGVyIGl0IGZpbmlzaGVkIGl0ZXJhdGluZywgdGhpcyBpcyBoZWxwZnVsIGluIG9wdGltaXppbmcgc29tZSBvdGhlciBmdW5jdGlvbnNcbiAgICAgKiBJdCBpcyB1c2VmdWwgaWYgeW91IHdhbnQgY2FsbCBhIHJlY3Vyc2l2ZSBmdW5jdGlvbiBvdmVyIHRoZSBhcnJheSBlbGVtZW50cyBidXQgd2l0aG91dCBwb3BwaW5nIHRoZSBmaXJzdFxuICAgICAqIGVsZW1lbnQgb2YgdGhlIEFycmF5IG9yIHNlbmRpbmcgdGhlIGluZGV4IGFzIGFuIGV4dHJhIHBhcmFtZXRlclxuICAgICAqIEBwYXJhbSB7QXJyYXk8Kj59IGFyclxuICAgICAqIEByZXR1cm4ge0l0ZXJhYmxlSXRlcmF0b3I8Kj59XG4gICAgICovXG4gICAgZnVuY3Rpb24qIGNyZWF0ZUFycmF5R2VuZXJhdG9yKGFycikge1xuICAgICAgICBjb25zdCBsZW4gPSBhcnIubGVuZ3RoO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuIC0gMTsgKytpKSB7XG4gICAgICAgICAgICB5aWVsZCBhcnJbaV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXJyW2xlbiAtIDFdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkcyBhIHRyZWUgbGlrZSBzdHJ1Y3R1cmUgb3ZlciB0aW1lIChpZiBjYWxsZWQgb24gdGhlIHNhbWUgcm9vdCBub2RlKSB3aGVyZSBpbnRlcm5hbCBub2RlcyBhcmUgaW5zdGFuY2VzIG9mXG4gICAgICogTWFwIGNvbnRhaW5pbmcgdGhlIG5hbWUgb2YgdGhlIGNoaWxkcmVuIG5vZGVzIChlYWNoIGNoaWxkIG5hbWUgaXMgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIG5leHQgb24gYGtleXNHZW5lcmF0b3IpXG4gICAgICogYW5kIGEgcmVmZXJlbmNlIHRvIHRoZW0gYW5kIG9uIGxlYWZzIGl0IGNvbnRhaW5zIGFuIGluc3RhbmNlIG9mIFNldCB3aGVyZSBpdCBhZGRzIHRoZSBmdW5jdGlvbiBnaXZlbiBhcyBwYXJhbWV0ZXJcbiAgICAgKiAoZXg6IGZvciBhIGtleUdlbmVyYXRvciB0aGF0IHJldHVybnMgaW4gdGhpcyBvcmRlciAoXCJrZXkxXCIsIFwia2V5MlwiKSB0aGUgcmVzdWx0aW5nIHN0cnVjdHVyZSB3aWxsIGJlOlxuICAgICAqIHtcImtleTFcIjoge1wia2V5MVwiOiBTZXQoW2ZuXSl9fSAtIHVzaW5nIEpTT04ganVzdCBmb3IgaWxsdXN0cmF0aW9uIHB1cnBvc2VzIGJlY2F1c2UgaXQncyBlYXNpZXIgdG8gcmVwcmVzZW50KVxuICAgICAqIEBwYXJhbSB7TWFwfSBydWxlc01hcFxuICAgICAqIEBwYXJhbSB7SXRlcmFibGVJdGVyYXRvcn0ga2V5c0dlbmVyYXRvciAtIGl0IGhhcyB0aGUgcGFydGljdWxhcml0eSB0aGF0IGRvbmUgaXMgc2V0IG9uIGxhc3QgZWxlbWVudCwgbm90IGFmdGVyIGl0XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gZm5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZWdpc3RlclJlY3Vyc2l2ZVJ1bGUocnVsZXNNYXAsIGtleXNHZW5lcmF0b3IsIGZuKSB7XG4gICAgICAgIGNvbnN0IHt2YWx1ZSwgZG9uZX0gPSBrZXlzR2VuZXJhdG9yLm5leHQoKTtcblxuICAgICAgICBpZiAoIWRvbmUpIHsgLy8gaW50ZXJuYWwgbm9kZVxuICAgICAgICAgICAgY29uc3QgbmV4dEtleSA9IHJ1bGVzTWFwLmdldCh2YWx1ZSk7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgbmV4dEtleSA9PT0gJ3VuZGVmaW5lZCcpIHsgLy8gaWYgdmFsdWUgbm90IGZvdW5kIGluIHJ1bGVzTWFwXG4gICAgICAgICAgICAgICAgcnVsZXNNYXAuc2V0KHZhbHVlLCBuZXcgTWFwKCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZWdpc3RlclJlY3Vyc2l2ZVJ1bGUocnVsZXNNYXAuZ2V0KHZhbHVlKSwga2V5c0dlbmVyYXRvciwgZm4pO1xuICAgICAgICB9IGVsc2UgeyAvLyByZWFjaGVkIGxlYWYgbm9kZVxuICAgICAgICAgICAgaWYgKCFydWxlc01hcC5oYXModmFsdWUpKSB7XG5cbiAgICAgICAgICAgICAgICBydWxlc01hcC5zZXQodmFsdWUsIG5ldyBTZXQoW2ZuXSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZXQgPSBydWxlc01hcC5nZXQodmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHNldC5oYXMoZm4pKSB7XG4gICAgICAgICAgICAgICAgICAgIF93YXJuaW5nKGBEdXBsaWNhdGVkIGludGVyY2VwdG9yIGZvciAnJHtrZXl9J2ApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNldC5hZGQoZm4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgY29ycmVzcG9uZGluZyBzZXQgb2YgZnVuY3Rpb25zIGZvciB0aGUgZ2l2ZW4ga2V5IGlmIGZvdW5kXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSAtIGZvcm1hdHRlZCBhcyBhIHBhdGggd2l0aG91dCB0aGUgZmlyc3QgJy8nIChleDogc3dhcm1UeXBlL3N3YXJtUGhhc2UvYmVmb3JlKVxuICAgICAqIEByZXR1cm4ge0FycmF5PFNldDxmdW5jdGlvbj4+fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldEludGVyY2VwdG9yc0ZvcktleShrZXkpIHtcbiAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgICAgICAgIF93YXJuaW5nKGBJbnRlcmNlcHRvciBjYWxsZWQgb24ga2V5ICR7a2V5fSBzdGFydGluZyB3aXRoICcvJywgYXV0b21hdGljYWxseSByZW1vdmluZyBpdGApO1xuICAgICAgICAgICAga2V5ID0ga2V5LnN1YnN0cmluZygxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGtleUVsZW1lbnRzID0ga2V5LnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IGtleXNHZW5lcmF0b3IgPSBjcmVhdGVBcnJheUdlbmVyYXRvcihrZXlFbGVtZW50cyk7XG5cbiAgICAgICAgcmV0dXJuIGdldFZhbHVlUmVjdXJzaXZlbHkoW3J1bGVzXSwga2V5c0dlbmVyYXRvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSXQgd29ya3MgbGlrZSBhIEJGUyBzZWFyY2ggcmV0dXJuaW5nIHRoZSBsZWFmcyByZXN1bHRpbmcgZnJvbSB0cmF2ZXJzaW5nIHRoZSBpbnRlcm5hbCBub2RlcyB3aXRoIGNvcnJlc3BvbmRpbmdcbiAgICAgKiBuYW1lcyBnaXZlbiBmb3IgZWFjaCBsZXZlbCAoZGVwdGgpIGJ5IGBrZXlzR2VuZXJhdG9yYFxuICAgICAqIEBwYXJhbSB7QXJyYXk8TWFwPn0gc2VhcmNoYWJsZU5vZGVzXG4gICAgICogQHBhcmFtIHtJdGVyYWJsZUl0ZXJhdG9yfSBrZXlzR2VuZXJhdG9yIC0gaXQgaGFzIHRoZSBwYXJ0aWN1bGFyaXR5IHRoYXQgZG9uZSBpcyBzZXQgb24gbGFzdCBlbGVtZW50LCBub3QgYWZ0ZXIgaXRcbiAgICAgKiBAcmV0dXJuIHtBcnJheTxTZXQ8ZnVuY3Rpb24+Pn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRWYWx1ZVJlY3Vyc2l2ZWx5KHNlYXJjaGFibGVOb2Rlcywga2V5c0dlbmVyYXRvcikge1xuICAgICAgICBjb25zdCB7dmFsdWU6IG5vZGVOYW1lLCBkb25lfSA9IGtleXNHZW5lcmF0b3IubmV4dCgpO1xuXG4gICAgICAgIGNvbnN0IG5leHROb2RlcyA9IFtdO1xuXG4gICAgICAgIGZvciAoY29uc3Qgbm9kZUluUnVsZXMgb2Ygc2VhcmNoYWJsZU5vZGVzKSB7XG4gICAgICAgICAgICBjb25zdCBuZXh0Tm9kZUZvckFsbCA9IG5vZGVJblJ1bGVzLmdldCgnKicpO1xuICAgICAgICAgICAgY29uc3QgbmV4dE5vZGUgPSBub2RlSW5SdWxlcy5nZXQobm9kZU5hbWUpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG5leHROb2RlICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgbmV4dE5vZGVzLnB1c2gobmV4dE5vZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG5leHROb2RlRm9yQWxsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgbmV4dE5vZGVzLnB1c2gobmV4dE5vZGVGb3JBbGwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZG9uZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5leHROb2RlcztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBnZXRWYWx1ZVJlY3Vyc2l2ZWx5KG5leHROb2Rlcywga2V5c0dlbmVyYXRvcik7XG4gICAgfVxuXG5cbiAgICAvKioqKioqKioqKioqKiBQVUJMSUMgTUVUSE9EUyAqKioqKioqKioqKioqL1xuXG4gICAgdGhpcy5yZWdpc3RlciA9IGZ1bmN0aW9uIChzd2FybVR5cGVOYW1lLCBwaGFzZU5hbWUsIHdoZW4sIGZuKSB7XG4gICAgICAgIHZlcmlmeVdoZW5PcHRpb24od2hlbik7XG4gICAgICAgIHZlcmlmeUlzRnVuY3Rpb25UeXBlKGZuKTtcblxuICAgICAgICBjb25zdCByZXNvbHZlZFN3YXJtVHlwZU5hbWUgPSByZXNvbHZlTmFtZXNwYWNlUmVzb2x1dGlvbihzd2FybVR5cGVOYW1lKTtcbiAgICAgICAgY29uc3Qga2V5cyA9IGNyZWF0ZUFycmF5R2VuZXJhdG9yKFtyZXNvbHZlZFN3YXJtVHlwZU5hbWUsIHBoYXNlTmFtZSwgd2hlbl0pO1xuXG4gICAgICAgIHJlZ2lzdGVyUmVjdXJzaXZlUnVsZShydWxlcywga2V5cywgZm4pO1xuICAgIH07XG5cbiAgICAvLyB0aGlzLnVucmVnaXN0ZXIgPSBmdW5jdGlvbiAoKSB7IH1cblxuICAgIHRoaXMuY2FsbEludGVyY2VwdG9ycyA9IGZ1bmN0aW9uIChrZXksIHRhcmdldE9iamVjdCwgYXJncykge1xuICAgICAgICBjb25zdCBpbnRlcmNlcHRvcnMgPSBnZXRJbnRlcmNlcHRvcnNGb3JLZXkoa2V5KTtcblxuICAgICAgICBpZiAoaW50ZXJjZXB0b3JzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGludGVyY2VwdG9yU2V0IG9mIGludGVyY2VwdG9ycykge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZm4gb2YgaW50ZXJjZXB0b3JTZXQpIHsgLy8gaW50ZXJjZXB0b3JzIG9uIGtleSAnKicgYXJlIGNhbGxlZCBiZWZvcmUgdGhvc2Ugc3BlY2lmaWVkIGJ5IG5hbWVcbiAgICAgICAgICAgICAgICAgICAgZm4uYXBwbHkodGFyZ2V0T2JqZWN0LCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5cbmV4cG9ydHMuY3JlYXRlSW50ZXJjZXB0b3JSZWdpc3RyeSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IEludGVyY2VwdG9yUmVnaXN0cnkoKTtcbn07XG4iLCIvKlxuIEluaXRpYWwgTGljZW5zZTogKGMpIEF4aW9sb2dpYyBSZXNlYXJjaCAmIEFsYm9haWUgU8OubmljxIMuXG4gQ29udHJpYnV0b3JzOiBBeGlvbG9naWMgUmVzZWFyY2ggLCBQcml2YXRlU2t5IHByb2plY3RcbiBDb2RlIExpY2Vuc2U6IExHUEwgb3IgTUlULlxuICovXG5cbnZhciB1dGlsID0gcmVxdWlyZShcInV0aWxcIik7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jcHJpbnQgPSBjb25zb2xlLmxvZztcbndwcmludCA9IGNvbnNvbGUud2FybjtcbmRwcmludCA9IGNvbnNvbGUuZGVidWc7XG5lcHJpbnQgPSBjb25zb2xlLmVycm9yO1xuXG5cbi8qKlxuICogU2hvcnRjdXQgdG8gSlNPTi5zdHJpbmdpZnlcbiAqIEBwYXJhbSBvYmpcbiAqL1xuSiA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkob2JqKTtcbn1cblxuXG4vKipcbiAqIFByaW50IHN3YXJtIGNvbnRleHRzIChNZXNzYWdlcykgYW5kIGVhc2llciB0byByZWFkIGNvbXBhcmVkIHdpdGggSlxuICogQHBhcmFtIG9ialxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG5leHBvcnRzLmNsZWFuRHVtcCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgbyA9IG9iai52YWx1ZU9mKCk7XG4gICAgdmFyIG1ldGEgPSB7XG4gICAgICAgIHN3YXJtVHlwZU5hbWU6by5tZXRhLnN3YXJtVHlwZU5hbWVcbiAgICB9O1xuICAgIHJldHVybiBcIlxcdCBzd2FybUlkOiBcIiArIG8ubWV0YS5zd2FybUlkICsgXCJ7XFxuXFx0XFx0bWV0YTogXCIgICAgKyBKKG1ldGEpICtcbiAgICAgICAgXCJcXG5cXHRcXHRwdWJsaWM6IFwiICAgICAgICArIEooby5wdWJsaWNWYXJzKSArXG4gICAgICAgIFwiXFxuXFx0XFx0cHJvdGVjdGVkOiBcIiAgICAgKyBKKG8ucHJvdGVjdGVkVmFycykgK1xuICAgICAgICBcIlxcblxcdFxcdHByaXZhdGU6IFwiICAgICAgICsgSihvLnByaXZhdGVWYXJzKSArIFwiXFxuXFx0fVxcblwiO1xufVxuXG4vL00gPSBleHBvcnRzLmNsZWFuRHVtcDtcbi8qKlxuICogRXhwZXJpbWVudGFsIGZ1bmN0aW9uc1xuICovXG5cblxuLypcblxuIGxvZ2dlciAgICAgID0gbW9uaXRvci5sb2dnZXI7XG4gYXNzZXJ0ICAgICAgPSBtb25pdG9yLmFzc2VydDtcbiB0aHJvd2luZyAgICA9IG1vbml0b3IuZXhjZXB0aW9ucztcblxuXG4gdmFyIHRlbXBvcmFyeUxvZ0J1ZmZlciA9IFtdO1xuXG4gdmFyIGN1cnJlbnRTd2FybUNvbUltcGwgPSBudWxsO1xuXG4gbG9nZ2VyLnJlY29yZCA9IGZ1bmN0aW9uKHJlY29yZCl7XG4gaWYoY3VycmVudFN3YXJtQ29tSW1wbD09PW51bGwpe1xuIHRlbXBvcmFyeUxvZ0J1ZmZlci5wdXNoKHJlY29yZCk7XG4gfSBlbHNlIHtcbiBjdXJyZW50U3dhcm1Db21JbXBsLnJlY29yZExvZyhyZWNvcmQpO1xuIH1cbiB9XG5cbiB2YXIgY29udGFpbmVyID0gcmVxdWlyZShcImRpY29udGFpbmVyXCIpLmNvbnRhaW5lcjtcblxuIGNvbnRhaW5lci5zZXJ2aWNlKFwic3dhcm1Mb2dnaW5nTW9uaXRvclwiLCBbXCJzd2FybWluZ0lzV29ya2luZ1wiLCBcInN3YXJtQ29tSW1wbFwiXSwgZnVuY3Rpb24ob3V0T2ZTZXJ2aWNlLHN3YXJtaW5nLCBzd2FybUNvbUltcGwpe1xuXG4gaWYob3V0T2ZTZXJ2aWNlKXtcbiBpZighdGVtcG9yYXJ5TG9nQnVmZmVyKXtcbiB0ZW1wb3JhcnlMb2dCdWZmZXIgPSBbXTtcbiB9XG4gfSBlbHNlIHtcbiB2YXIgdG1wID0gdGVtcG9yYXJ5TG9nQnVmZmVyO1xuIHRlbXBvcmFyeUxvZ0J1ZmZlciA9IFtdO1xuIGN1cnJlbnRTd2FybUNvbUltcGwgPSBzd2FybUNvbUltcGw7XG4gbG9nZ2VyLnJlY29yZCA9IGZ1bmN0aW9uKHJlY29yZCl7XG4gY3VycmVudFN3YXJtQ29tSW1wbC5yZWNvcmRMb2cocmVjb3JkKTtcbiB9XG5cbiB0bXAuZm9yRWFjaChmdW5jdGlvbihyZWNvcmQpe1xuIGxvZ2dlci5yZWNvcmQocmVjb3JkKTtcbiB9KTtcbiB9XG4gfSlcblxuICovXG51bmNhdWdodEV4Y2VwdGlvblN0cmluZyA9IFwiXCI7XG51bmNhdWdodEV4Y2VwdGlvbkV4aXN0cyA9IGZhbHNlO1xuaWYodHlwZW9mIGdsb2JhbFZlcmJvc2l0eSA9PSAndW5kZWZpbmVkJyl7XG4gICAgZ2xvYmFsVmVyYm9zaXR5ID0gZmFsc2U7XG59XG5cbnZhciBERUJVR19TVEFSVF9USU1FID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbmZ1bmN0aW9uIGdldERlYnVnRGVsdGEoKXtcbiAgICB2YXIgY3VycmVudFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICByZXR1cm4gY3VycmVudFRpbWUgLSBERUJVR19TVEFSVF9USU1FO1xufVxuXG4vKipcbiAqIERlYnVnIGZ1bmN0aW9ucywgaW5mbHVlbmNlZCBieSBnbG9iYWxWZXJib3NpdHkgZ2xvYmFsIHZhcmlhYmxlXG4gKiBAcGFyYW0gdHh0XG4gKi9cbmRwcmludCA9IGZ1bmN0aW9uICh0eHQpIHtcbiAgICBpZiAoZ2xvYmFsVmVyYm9zaXR5ID09IHRydWUpIHtcbiAgICAgICAgaWYgKHRoaXNBZGFwdGVyLmluaXRpbGlzZWQgKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkRFQlVHOiBbXCIgKyB0aGlzQWRhcHRlci5ub2RlTmFtZSArIFwiXShcIiArIGdldERlYnVnRGVsdGEoKSsgXCIpOlwiK3R4dCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkRFQlVHOiAoXCIgKyBnZXREZWJ1Z0RlbHRhKCkrIFwiKTpcIit0eHQpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJERUJVRzogXCIgKyB0eHQpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIG9ic29sZXRlIT9cbiAqIEBwYXJhbSB0eHRcbiAqL1xuYXByaW50ID0gZnVuY3Rpb24gKHR4dCkge1xuICAgIGNvbnNvbGUubG9nKFwiREVCVUc6IFtcIiArIHRoaXNBZGFwdGVyLm5vZGVOYW1lICsgXCJdOiBcIiArIHR4dCk7XG59XG5cblxuXG4vKipcbiAqIFV0aWxpdHkgZnVuY3Rpb24gdXN1YWxseSB1c2VkIGluIHRlc3RzLCBleGl0IGN1cnJlbnQgcHJvY2VzcyBhZnRlciBhIHdoaWxlXG4gKiBAcGFyYW0gbXNnXG4gKiBAcGFyYW0gdGltZW91dFxuICovXG5kZWxheUV4aXQgPSBmdW5jdGlvbiAobXNnLCByZXRDb2RlLHRpbWVvdXQpIHtcbiAgICBpZihyZXRDb2RlID09IHVuZGVmaW5lZCl7XG4gICAgICAgIHJldENvZGUgPSBFeGl0Q29kZXMuVW5rbm93bkVycm9yO1xuICAgIH1cblxuICAgIGlmKHRpbWVvdXQgPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgdGltZW91dCA9IDEwMDtcbiAgICB9XG5cbiAgICBpZihtc2cgPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgbXNnID0gXCJEZWxheWluZyBleGl0IHdpdGggXCIrIHRpbWVvdXQgKyBcIm1zXCI7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2cobXNnKTtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcHJvY2Vzcy5leGl0KHJldENvZGUpO1xuICAgIH0sIHRpbWVvdXQpO1xufVxuXG5cbmZ1bmN0aW9uIGxvY2FsTG9nIChsb2dUeXBlLCBtZXNzYWdlLCBlcnIpIHtcbiAgICB2YXIgdGltZSA9IG5ldyBEYXRlKCk7XG4gICAgdmFyIG5vdyA9IHRpbWUuZ2V0RGF0ZSgpICsgXCItXCIgKyAodGltZS5nZXRNb250aCgpICsgMSkgKyBcIixcIiArIHRpbWUuZ2V0SG91cnMoKSArIFwiOlwiICsgdGltZS5nZXRNaW51dGVzKCk7XG4gICAgdmFyIG1zZztcblxuICAgIG1zZyA9ICdbJyArIG5vdyArICddWycgKyB0aGlzQWRhcHRlci5ub2RlTmFtZSArICddICcgKyBtZXNzYWdlO1xuXG4gICAgaWYgKGVyciAhPSBudWxsICYmIGVyciAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgbXNnICs9ICdcXG4gICAgIEVycjogJyArIGVyci50b1N0cmluZygpO1xuICAgICAgICBpZiAoZXJyLnN0YWNrICYmIGVyci5zdGFjayAhPSB1bmRlZmluZWQpXG4gICAgICAgICAgICBtc2cgKz0gJ1xcbiAgICAgU3RhY2s6ICcgKyBlcnIuc3RhY2sgKyAnXFxuJztcbiAgICB9XG5cbiAgICBjcHJpbnQobXNnKTtcbiAgICBpZih0aGlzQWRhcHRlci5pbml0aWxpc2VkKXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgZnMuYXBwZW5kRmlsZVN5bmMoZ2V0U3dhcm1GaWxlUGF0aCh0aGlzQWRhcHRlci5jb25maWcubG9nc1BhdGggKyBcIi9cIiArIGxvZ1R5cGUpLCBtc2cpO1xuICAgICAgICB9IGNhdGNoKGVycil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkZhaWxpbmcgdG8gd3JpdGUgbG9ncyBpbiBcIiwgdGhpc0FkYXB0ZXIuY29uZmlnLmxvZ3NQYXRoICk7XG4gICAgICAgIH1cblxuICAgIH1cbn1cblxuXG4vLyBwcmludGYgPSBmdW5jdGlvbiAoLi4ucGFyYW1zKSB7XG4vLyAgICAgdmFyIGFyZ3MgPSBbXTsgLy8gZW1wdHkgYXJyYXlcbi8vICAgICAvLyBjb3B5IGFsbCBvdGhlciBhcmd1bWVudHMgd2Ugd2FudCB0byBcInBhc3MgdGhyb3VnaFwiXG4vLyAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJhbXMubGVuZ3RoOyBpKyspIHtcbi8vICAgICAgICAgYXJncy5wdXNoKHBhcmFtc1tpXSk7XG4vLyAgICAgfVxuLy8gICAgIHZhciBvdXQgPSB1dGlsLmZvcm1hdC5hcHBseSh0aGlzLCBhcmdzKTtcbi8vICAgICBjb25zb2xlLmxvZyhvdXQpO1xuLy8gfVxuLy9cbi8vIHNwcmludGYgPSBmdW5jdGlvbiAoLi4ucGFyYW1zKSB7XG4vLyAgICAgdmFyIGFyZ3MgPSBbXTsgLy8gZW1wdHkgYXJyYXlcbi8vICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcmFtcy5sZW5ndGg7IGkrKykge1xuLy8gICAgICAgICBhcmdzLnB1c2gocGFyYW1zW2ldKTtcbi8vICAgICB9XG4vLyAgICAgcmV0dXJuIHV0aWwuZm9ybWF0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuLy8gfVxuXG4iLCJcblxuZnVuY3Rpb24gU3dhcm1zSW5zdGFuY2VzTWFuYWdlcigpe1xuICAgIHZhciBzd2FybUFsaXZlSW5zdGFuY2VzID0ge1xuXG4gICAgfVxuXG4gICAgdGhpcy53YWl0Rm9yU3dhcm0gPSBmdW5jdGlvbihjYWxsYmFjaywgc3dhcm0sIGtlZXBBbGl2ZUNoZWNrKXtcblxuICAgICAgICBmdW5jdGlvbiBkb0xvZ2ljKCl7XG4gICAgICAgICAgICB2YXIgc3dhcm1JZCA9IHN3YXJtLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtSWQ7XG4gICAgICAgICAgICB2YXIgd2F0Y2hlciA9IHN3YXJtQWxpdmVJbnN0YW5jZXNbc3dhcm1JZF07XG4gICAgICAgICAgICBpZighd2F0Y2hlcil7XG4gICAgICAgICAgICAgICAgd2F0Y2hlciA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm06c3dhcm0sXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOmNhbGxiYWNrLFxuICAgICAgICAgICAgICAgICAgICBrZWVwQWxpdmVDaGVjazprZWVwQWxpdmVDaGVja1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzd2FybUFsaXZlSW5zdGFuY2VzW3N3YXJtSWRdID0gd2F0Y2hlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGZpbHRlcigpe1xuICAgICAgICAgICAgcmV0dXJuIHN3YXJtLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtSWQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyQkLnVpZEdlbmVyYXRvci53YWl0X2Zvcl9jb25kaXRpb24oY29uZGl0aW9uLGRvTG9naWMpO1xuICAgICAgICBzd2FybS5vYnNlcnZlKGRvTG9naWMsIG51bGwsIGZpbHRlcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYW5Td2FybVdhaXRlcihzd2FybVNlcmlhbGlzYXRpb24peyAvLyBUT0RPOiBhZGQgYmV0dGVyIG1lY2hhbmlzbXMgdG8gcHJldmVudCBtZW1vcnkgbGVha3NcbiAgICAgICAgdmFyIHN3YXJtSWQgPSBzd2FybVNlcmlhbGlzYXRpb24ubWV0YS5zd2FybUlkO1xuICAgICAgICB2YXIgd2F0Y2hlciA9IHN3YXJtQWxpdmVJbnN0YW5jZXNbc3dhcm1JZF07XG5cbiAgICAgICAgaWYoIXdhdGNoZXIpe1xuICAgICAgICAgICAgJCQuZXJyb3JIYW5kbGVyLndhcm5pbmcoXCJJbnZhbGlkIHN3YXJtIHJlY2VpdmVkOiBcIiArIHN3YXJtSWQpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFyZ3MgPSBzd2FybVNlcmlhbGlzYXRpb24ubWV0YS5hcmdzO1xuICAgICAgICBhcmdzLnB1c2goc3dhcm1TZXJpYWxpc2F0aW9uKTtcblxuICAgICAgICB3YXRjaGVyLmNhbGxiYWNrLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICBpZighd2F0Y2hlci5rZWVwQWxpdmVDaGVjaygpKXtcbiAgICAgICAgICAgIGRlbGV0ZSBzd2FybUFsaXZlSW5zdGFuY2VzW3N3YXJtSWRdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5yZXZpdmVfc3dhcm0gPSBmdW5jdGlvbihzd2FybVNlcmlhbGlzYXRpb24pe1xuXG5cbiAgICAgICAgdmFyIHN3YXJtSWQgICAgID0gc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuc3dhcm1JZDtcbiAgICAgICAgdmFyIHN3YXJtVHlwZSAgID0gc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuc3dhcm1UeXBlTmFtZTtcbiAgICAgICAgdmFyIGluc3RhbmNlICAgID0gc3dhcm1BbGl2ZUluc3RhbmNlc1tzd2FybUlkXTtcblxuICAgICAgICB2YXIgc3dhcm07XG5cbiAgICAgICAgaWYoaW5zdGFuY2Upe1xuICAgICAgICAgICAgc3dhcm0gPSBpbnN0YW5jZS5zd2FybTtcbiAgICAgICAgICAgIHN3YXJtLnVwZGF0ZShzd2FybVNlcmlhbGlzYXRpb24pO1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzd2FybSA9ICQkLnN3YXJtLnN0YXJ0KHN3YXJtVHlwZSk7XG4gICAgICAgICAgICBzd2FybS51cGRhdGUoc3dhcm1TZXJpYWxpc2F0aW9uKTtcbiAgICAgICAgICAgIC8qc3dhcm0gPSAkJC5zd2FybS5zdGFydChzd2FybVR5cGUsIHN3YXJtU2VyaWFsaXNhdGlvbik7Ki9cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzd2FybVNlcmlhbGlzYXRpb24ubWV0YS5jb21tYW5kID09IFwiYXN5bmNSZXR1cm5cIikge1xuICAgICAgICAgICAgdmFyIGNvID0gJCQuUFNLX1B1YlN1Yi5wdWJsaXNoKCQkLkNPTlNUQU5UUy5TV0FSTV9SRVRVUk4sIHN3YXJtU2VyaWFsaXNhdGlvbik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN1YnNjcmliZXJzIGxpc3RlbmluZyBvblwiLCAkJC5DT05TVEFOVFMuU1dBUk1fUkVUVVJOLCBjbyk7XG4gICAgICAgICAgICAvLyBjbGVhblN3YXJtV2FpdGVyKHN3YXJtU2VyaWFsaXNhdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAoc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuY29tbWFuZCA9PSBcImV4ZWN1dGVTd2FybVBoYXNlXCIpIHtcbiAgICAgICAgICAgIHN3YXJtLnJ1blBoYXNlKHN3YXJtU2VyaWFsaXNhdGlvbi5tZXRhLnBoYXNlTmFtZSwgc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuYXJncyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVua25vd24gY29tbWFuZFwiLCBzd2FybVNlcmlhbGlzYXRpb24ubWV0YS5jb21tYW5kLCBcImluIHN3YXJtU2VyaWFsaXNhdGlvbi5tZXRhLmNvbW1hbmRcIik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3dhcm07XG4gICAgfVxufVxuXG5cbiQkLnN3YXJtc0luc3RhbmNlc01hbmFnZXIgPSBuZXcgU3dhcm1zSW5zdGFuY2VzTWFuYWdlcigpO1xuXG5cbiIsImV4cG9ydHMuY3JlYXRlRm9yT2JqZWN0ID0gZnVuY3Rpb24odmFsdWVPYmplY3QsIHRoaXNPYmplY3QsIGxvY2FsSWQpe1xuXHR2YXIgcmV0ID0gcmVxdWlyZShcIi4vYmFzZVwiKS5jcmVhdGVGb3JPYmplY3QodmFsdWVPYmplY3QsIHRoaXNPYmplY3QsIGxvY2FsSWQpO1xuXG5cdHJldC5zd2FybSAgICAgICAgICAgPSBudWxsO1xuXHRyZXQub25SZXR1cm4gICAgICAgID0gbnVsbDtcblx0cmV0Lm9uUmVzdWx0ICAgICAgICA9IG51bGw7XG5cdHJldC5hc3luY1JldHVybiAgICAgPSBudWxsO1xuXHRyZXQucmV0dXJuICAgICAgICAgID0gbnVsbDtcblx0cmV0LmhvbWUgICAgICAgICAgICA9IG51bGw7XG5cdHJldC5pc1BlcnNpc3RlZCAgXHQ9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpc09iamVjdC5nZXRNZXRhZGF0YSgncGVyc2lzdGVkJykgPT09IHRydWU7XG5cdH07XG5cblx0cmV0dXJuIHJldDtcbn07IiwidmFyIGJlZXNIZWFsZXIgPSByZXF1aXJlKFwic3dhcm11dGlsc1wiKS5iZWVzSGVhbGVyO1xudmFyIHN3YXJtRGVidWcgPSByZXF1aXJlKFwiLi4vU3dhcm1EZWJ1Z1wiKTtcblxuZXhwb3J0cy5jcmVhdGVGb3JPYmplY3QgPSBmdW5jdGlvbih2YWx1ZU9iamVjdCwgdGhpc09iamVjdCwgbG9jYWxJZCl7XG5cdHZhciByZXQgPSB7fTtcblxuXHRmdW5jdGlvbiBmaWx0ZXJGb3JTZXJpYWxpc2FibGUgKHZhbHVlT2JqZWN0KXtcblx0XHRyZXR1cm4gdmFsdWVPYmplY3QubWV0YS5zd2FybUlkO1xuXHR9XG5cblx0dmFyIHN3YXJtRnVuY3Rpb24gPSBmdW5jdGlvbihjb250ZXh0LCBwaGFzZU5hbWUpe1xuXHRcdHZhciBhcmdzID1bXTtcblx0XHRmb3IodmFyIGkgPSAyOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKXtcblx0XHRcdGFyZ3MucHVzaChhcmd1bWVudHNbaV0pO1xuXHRcdH1cblxuXHRcdC8vbWFrZSB0aGUgZXhlY3V0aW9uIGF0IGxldmVsIDAgIChhZnRlciBhbGwgcGVuZGluZyBldmVudHMpIGFuZCB3YWl0IHRvIGhhdmUgYSBzd2FybUlkXG5cdFx0cmV0Lm9ic2VydmUoZnVuY3Rpb24oKXtcblx0XHRcdGJlZXNIZWFsZXIuYXNKU09OKHZhbHVlT2JqZWN0LCBwaGFzZU5hbWUsIGFyZ3MsIGZ1bmN0aW9uKGVycixqc01zZyl7XG5cdFx0XHRcdGpzTXNnLm1ldGEudGFyZ2V0ID0gY29udGV4dDtcblx0XHRcdFx0dmFyIHN1YnNjcmliZXJzQ291bnQgPSAkJC5QU0tfUHViU3ViLnB1Ymxpc2goJCQuQ09OU1RBTlRTLlNXQVJNX0ZPUl9FWEVDVVRJT04sIGpzTXNnKTtcblx0XHRcdFx0aWYoIXN1YnNjcmliZXJzQ291bnQpe1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKGBOb2JvZHkgbGlzdGVuaW5nIGZvciA8JHskJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTn0+IWApO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LG51bGwsZmlsdGVyRm9yU2VyaWFsaXNhYmxlKTtcblxuXHRcdHJldC5ub3RpZnkoKTtcblxuXG5cdFx0cmV0dXJuIHRoaXNPYmplY3Q7XG5cdH07XG5cblx0dmFyIGFzeW5jUmV0dXJuID0gZnVuY3Rpb24oZXJyLCByZXN1bHQpe1xuXHRcdHZhciBjb250ZXh0ID0gdmFsdWVPYmplY3QucHJvdGVjdGVkVmFycy5jb250ZXh0O1xuXG5cdFx0aWYoIWNvbnRleHQgJiYgdmFsdWVPYmplY3QubWV0YS53YWl0U3RhY2spe1xuXHRcdFx0Y29udGV4dCA9IHZhbHVlT2JqZWN0Lm1ldGEud2FpdFN0YWNrLnBvcCgpO1xuXHRcdFx0dmFsdWVPYmplY3QucHJvdGVjdGVkVmFycy5jb250ZXh0ID0gY29udGV4dDtcblx0XHR9XG5cblx0XHRiZWVzSGVhbGVyLmFzSlNPTih2YWx1ZU9iamVjdCwgXCJfX3JldHVybl9fXCIsIFtlcnIsIHJlc3VsdF0sIGZ1bmN0aW9uKGVycixqc01zZyl7XG5cdFx0XHRqc01zZy5tZXRhLmNvbW1hbmQgPSBcImFzeW5jUmV0dXJuXCI7XG5cdFx0XHRpZighY29udGV4dCl7XG5cdFx0XHRcdGNvbnRleHQgPSB2YWx1ZU9iamVjdC5tZXRhLmhvbWVTZWN1cml0eUNvbnRleHQ7Ly9UT0RPOiBDSEVDSyBUSElTXG5cblx0XHRcdH1cblx0XHRcdGpzTXNnLm1ldGEudGFyZ2V0ID0gY29udGV4dDtcblxuXHRcdFx0aWYoIWNvbnRleHQpe1xuXHRcdFx0XHQkJC5lcnJvckhhbmRsZXIuZXJyb3IobmV3IEVycm9yKFwiQXN5bmNocm9ub3VzIHJldHVybiBpbnNpZGUgb2YgYSBzd2FybSB0aGF0IGRvZXMgbm90IHdhaXQgZm9yIHJlc3VsdHNcIikpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCQuUFNLX1B1YlN1Yi5wdWJsaXNoKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBqc01zZyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cblx0ZnVuY3Rpb24gaG9tZShlcnIsIHJlc3VsdCl7XG5cdFx0YmVlc0hlYWxlci5hc0pTT04odmFsdWVPYmplY3QsIFwiaG9tZVwiLCBbZXJyLCByZXN1bHRdLCBmdW5jdGlvbihlcnIsanNNc2cpe1xuXHRcdFx0dmFyIGNvbnRleHQgPSB2YWx1ZU9iamVjdC5tZXRhLmhvbWVDb250ZXh0O1xuXHRcdFx0anNNc2cubWV0YS50YXJnZXQgPSBjb250ZXh0O1xuXHRcdFx0JCQuUFNLX1B1YlN1Yi5wdWJsaXNoKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBqc01zZyk7XG5cdFx0fSk7XG5cdH1cblxuXG5cblx0ZnVuY3Rpb24gd2FpdFJlc3VsdHMoY2FsbGJhY2ssIGtlZXBBbGl2ZUNoZWNrLCBzd2FybSl7XG5cdFx0aWYoIXN3YXJtKXtcblx0XHRcdHN3YXJtID0gdGhpcztcblx0XHR9XG5cdFx0aWYoIWtlZXBBbGl2ZUNoZWNrKXtcblx0XHRcdGtlZXBBbGl2ZUNoZWNrID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR2YXIgaW5uZXIgPSBzd2FybS5nZXRJbm5lclZhbHVlKCk7XG5cdFx0aWYoIWlubmVyLm1ldGEud2FpdFN0YWNrKXtcblx0XHRcdGlubmVyLm1ldGEud2FpdFN0YWNrID0gW107XG5cdFx0XHRpbm5lci5tZXRhLndhaXRTdGFjay5wdXNoKCQkLnNlY3VyaXR5Q29udGV4dClcblx0XHR9XG5cdFx0JCQuc3dhcm1zSW5zdGFuY2VzTWFuYWdlci53YWl0Rm9yU3dhcm0oY2FsbGJhY2ssIHN3YXJtLCBrZWVwQWxpdmVDaGVjayk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIGdldElubmVyVmFsdWUoKXtcblx0XHRyZXR1cm4gdmFsdWVPYmplY3Q7XG5cdH1cblxuXHRmdW5jdGlvbiBydW5QaGFzZShmdW5jdE5hbWUsIGFyZ3Mpe1xuXHRcdHZhciBmdW5jID0gdmFsdWVPYmplY3QubXlGdW5jdGlvbnNbZnVuY3ROYW1lXTtcblx0XHRpZihmdW5jKXtcblx0XHRcdGZ1bmMuYXBwbHkodGhpc09iamVjdCwgYXJncyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQkLmVycm9ySGFuZGxlci5zeW50YXhFcnJvcihmdW5jdE5hbWUsIHZhbHVlT2JqZWN0LCBcIkZ1bmN0aW9uIFwiICsgZnVuY3ROYW1lICsgXCIgZG9lcyBub3QgZXhpc3QhXCIpO1xuXHRcdH1cblxuXHR9XG5cblx0ZnVuY3Rpb24gdXBkYXRlKHNlcmlhbGlzYXRpb24pe1xuXHRcdGJlZXNIZWFsZXIuanNvblRvTmF0aXZlKHNlcmlhbGlzYXRpb24sdmFsdWVPYmplY3QpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiB2YWx1ZU9mKCl7XG5cdFx0dmFyIHJldCA9IHt9O1xuXHRcdHJldC5tZXRhICAgICAgICAgICAgICAgID0gdmFsdWVPYmplY3QubWV0YTtcblx0XHRyZXQucHVibGljVmFycyAgICAgICAgICA9IHZhbHVlT2JqZWN0LnB1YmxpY1ZhcnM7XG5cdFx0cmV0LnByaXZhdGVWYXJzICAgICAgICAgPSB2YWx1ZU9iamVjdC5wcml2YXRlVmFycztcblx0XHRyZXQucHJvdGVjdGVkVmFycyAgICAgICA9IHZhbHVlT2JqZWN0LnByb3RlY3RlZFZhcnM7XG5cdFx0cmV0dXJuIHJldDtcblx0fVxuXG5cdGZ1bmN0aW9uIHRvU3RyaW5nICgpe1xuXHRcdHJldHVybiBzd2FybURlYnVnLmNsZWFuRHVtcCh0aGlzT2JqZWN0LnZhbHVlT2YoKSk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVBhcmFsbGVsKGNhbGxiYWNrKXtcblx0XHRyZXR1cm4gcmVxdWlyZShcIi4uLy4uL3BhcmFsbGVsSm9pblBvaW50XCIpLmNyZWF0ZUpvaW5Qb2ludCh0aGlzT2JqZWN0LCBjYWxsYmFjaywgJCQuX19pbnRlcm4ubWtBcmdzKGFyZ3VtZW50cywxKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVTZXJpYWwoY2FsbGJhY2spe1xuXHRcdHJldHVybiByZXF1aXJlKFwiLi4vLi4vc2VyaWFsSm9pblBvaW50XCIpLmNyZWF0ZVNlcmlhbEpvaW5Qb2ludCh0aGlzT2JqZWN0LCBjYWxsYmFjaywgJCQuX19pbnRlcm4ubWtBcmdzKGFyZ3VtZW50cywxKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNwZWN0KCl7XG5cdFx0cmV0dXJuIHN3YXJtRGVidWcuY2xlYW5EdW1wKHRoaXNPYmplY3QudmFsdWVPZigpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNvbnN0cnVjdG9yKCl7XG5cdFx0cmV0dXJuIFN3YXJtRGVzY3JpcHRpb247XG5cdH1cblxuXHRmdW5jdGlvbiBlbnN1cmVMb2NhbElkKCl7XG5cdFx0aWYoIXZhbHVlT2JqZWN0LmxvY2FsSWQpe1xuXHRcdFx0dmFsdWVPYmplY3QubG9jYWxJZCA9IHZhbHVlT2JqZWN0Lm1ldGEuc3dhcm1UeXBlTmFtZSArIFwiLVwiICsgbG9jYWxJZDtcblx0XHRcdGxvY2FsSWQrKztcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBvYnNlcnZlKGNhbGxiYWNrLCB3YWl0Rm9yTW9yZSwgZmlsdGVyKXtcblx0XHRpZighd2FpdEZvck1vcmUpe1xuXHRcdFx0d2FpdEZvck1vcmUgPSBmdW5jdGlvbiAoKXtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGVuc3VyZUxvY2FsSWQoKTtcblxuXHRcdCQkLlBTS19QdWJTdWIuc3Vic2NyaWJlKHZhbHVlT2JqZWN0LmxvY2FsSWQsIGNhbGxiYWNrLCB3YWl0Rm9yTW9yZSwgZmlsdGVyKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHRvSlNPTihwcm9wKXtcblx0XHQvL3ByZXZlbnRpbmcgbWF4IGNhbGwgc3RhY2sgc2l6ZSBleGNlZWRpbmcgb24gcHJveHkgYXV0byByZWZlcmVuY2luZ1xuXHRcdC8vcmVwbGFjZSB7fSBhcyByZXN1bHQgb2YgSlNPTihQcm94eSkgd2l0aCB0aGUgc3RyaW5nIFtPYmplY3QgcHJvdGVjdGVkIG9iamVjdF1cblx0XHRyZXR1cm4gXCJbT2JqZWN0IHByb3RlY3RlZCBvYmplY3RdXCI7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRKU09OKGNhbGxiYWNrKXtcblx0XHRyZXR1cm5cdGJlZXNIZWFsZXIuYXNKU09OKHZhbHVlT2JqZWN0LCBudWxsLCBudWxsLGNhbGxiYWNrKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG5vdGlmeShldmVudCl7XG5cdFx0aWYoIWV2ZW50KXtcblx0XHRcdGV2ZW50ID0gdmFsdWVPYmplY3Q7XG5cdFx0fVxuXHRcdGVuc3VyZUxvY2FsSWQoKTtcblx0XHQkJC5QU0tfUHViU3ViLnB1Ymxpc2godmFsdWVPYmplY3QubG9jYWxJZCwgZXZlbnQpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0TWV0YShuYW1lKXtcblx0XHRyZXR1cm4gdmFsdWVPYmplY3QuZ2V0TWV0YShuYW1lKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNldE1ldGEobmFtZSwgdmFsdWUpe1xuXHRcdHJldHVybiB2YWx1ZU9iamVjdC5zZXRNZXRhKG5hbWUsIHZhbHVlKTtcblx0fVxuXG5cdHJldC5zZXRNZXRhXHRcdFx0PSBzZXRNZXRhO1xuXHRyZXQuZ2V0TWV0YVx0XHRcdD0gZ2V0TWV0YTtcblx0cmV0LnN3YXJtICAgICAgICAgICA9IHN3YXJtRnVuY3Rpb247XG5cdHJldC5ub3RpZnkgICAgICAgICAgPSBub3RpZnk7XG5cdHJldC5nZXRKU09OICAgIFx0ICAgID0gZ2V0SlNPTjtcblx0cmV0LnRvSlNPTiAgICAgICAgICA9IHRvSlNPTjtcblx0cmV0Lm9ic2VydmUgICAgICAgICA9IG9ic2VydmU7XG5cdHJldC5pbnNwZWN0ICAgICAgICAgPSBpbnNwZWN0O1xuXHRyZXQuam9pbiAgICAgICAgICAgID0gY3JlYXRlUGFyYWxsZWw7XG5cdHJldC5wYXJhbGxlbCAgICAgICAgPSBjcmVhdGVQYXJhbGxlbDtcblx0cmV0LnNlcmlhbCAgICAgICAgICA9IGNyZWF0ZVNlcmlhbDtcblx0cmV0LnZhbHVlT2YgICAgICAgICA9IHZhbHVlT2Y7XG5cdHJldC51cGRhdGUgICAgICAgICAgPSB1cGRhdGU7XG5cdHJldC5ydW5QaGFzZSAgICAgICAgPSBydW5QaGFzZTtcblx0cmV0Lm9uUmV0dXJuICAgICAgICA9IHdhaXRSZXN1bHRzO1xuXHRyZXQub25SZXN1bHQgICAgICAgID0gd2FpdFJlc3VsdHM7XG5cdHJldC5hc3luY1JldHVybiAgICAgPSBhc3luY1JldHVybjtcblx0cmV0LnJldHVybiAgICAgICAgICA9IGFzeW5jUmV0dXJuO1xuXHRyZXQuZ2V0SW5uZXJWYWx1ZSAgID0gZ2V0SW5uZXJWYWx1ZTtcblx0cmV0LmhvbWUgICAgICAgICAgICA9IGhvbWU7XG5cdHJldC50b1N0cmluZyAgICAgICAgPSB0b1N0cmluZztcblx0cmV0LmNvbnN0cnVjdG9yICAgICA9IGNvbnN0cnVjdG9yO1xuXHRyZXQuc2V0TWV0YWRhdGFcdFx0PSB2YWx1ZU9iamVjdC5zZXRNZXRhLmJpbmQodmFsdWVPYmplY3QpO1xuXHRyZXQuZ2V0TWV0YWRhdGFcdFx0PSB2YWx1ZU9iamVjdC5nZXRNZXRhLmJpbmQodmFsdWVPYmplY3QpO1xuXG5cdHJldHVybiByZXQ7XG5cbn07XG4iLCJleHBvcnRzLmNyZWF0ZUZvck9iamVjdCA9IGZ1bmN0aW9uKHZhbHVlT2JqZWN0LCB0aGlzT2JqZWN0LCBsb2NhbElkKXtcblx0dmFyIHJldCA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuY3JlYXRlRm9yT2JqZWN0KHZhbHVlT2JqZWN0LCB0aGlzT2JqZWN0LCBsb2NhbElkKTtcblxuXHRyZXQuc3dhcm0gICAgICAgICAgID0gbnVsbDtcblx0cmV0Lm9uUmV0dXJuICAgICAgICA9IG51bGw7XG5cdHJldC5vblJlc3VsdCAgICAgICAgPSBudWxsO1xuXHRyZXQuYXN5bmNSZXR1cm4gICAgID0gbnVsbDtcblx0cmV0LnJldHVybiAgICAgICAgICA9IG51bGw7XG5cdHJldC5ob21lICAgICAgICAgICAgPSBudWxsO1xuXG5cdHJldHVybiByZXQ7XG59OyIsImV4cG9ydHMuY3JlYXRlRm9yT2JqZWN0ID0gZnVuY3Rpb24odmFsdWVPYmplY3QsIHRoaXNPYmplY3QsIGxvY2FsSWQpe1xuXHRyZXR1cm4gcmVxdWlyZShcIi4vYmFzZVwiKS5jcmVhdGVGb3JPYmplY3QodmFsdWVPYmplY3QsIHRoaXNPYmplY3QsIGxvY2FsSWQpO1xufTsiLCIvKlxuSW5pdGlhbCBMaWNlbnNlOiAoYykgQXhpb2xvZ2ljIFJlc2VhcmNoICYgQWxib2FpZSBTw65uaWPEgy5cbkNvbnRyaWJ1dG9yczogQXhpb2xvZ2ljIFJlc2VhcmNoICwgUHJpdmF0ZVNreSBwcm9qZWN0XG5Db2RlIExpY2Vuc2U6IExHUEwgb3IgTUlULlxuKi9cblxuLy92YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG4vL3ZhciBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5cblxuZnVuY3Rpb24gU3dhcm1MaWJyYXJ5KHByZWZpeE5hbWUsIGZvbGRlcil7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGZ1bmN0aW9uIHdyYXBDYWxsKG9yaWdpbmFsLCBwcmVmaXhOYW1lKXtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKC4uLmFyZ3Mpe1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcInByZWZpeE5hbWVcIiwgcHJlZml4TmFtZSlcbiAgICAgICAgICAgIHZhciBwcmV2aW91c1ByZWZpeCA9ICQkLmxpYnJhcnlQcmVmaXg7XG4gICAgICAgICAgICB2YXIgcHJldmlvdXNMaWJyYXJ5ID0gJCQuX19nbG9iYWwuY3VycmVudExpYnJhcnk7XG5cbiAgICAgICAgICAgICQkLmxpYnJhcnlQcmVmaXggPSBwcmVmaXhOYW1lO1xuICAgICAgICAgICAgJCQuX19nbG9iYWwuY3VycmVudExpYnJhcnkgPSBzZWxmO1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBvcmlnaW5hbC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAkJC5saWJyYXJ5UHJlZml4ID0gcHJldmlvdXNQcmVmaXggO1xuICAgICAgICAgICAgICAgICQkLl9fZ2xvYmFsLmN1cnJlbnRMaWJyYXJ5ID0gcHJldmlvdXNMaWJyYXJ5O1xuICAgICAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICAgICAgJCQubGlicmFyeVByZWZpeCA9IHByZXZpb3VzUHJlZml4IDtcbiAgICAgICAgICAgICAgICAkJC5fX2dsb2JhbC5jdXJyZW50TGlicmFyeSA9IHByZXZpb3VzTGlicmFyeTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgJCQubGlicmFyaWVzW3ByZWZpeE5hbWVdID0gdGhpcztcbiAgICB2YXIgcHJlZml4ZWRSZXF1aXJlID0gd3JhcENhbGwoZnVuY3Rpb24ocGF0aCl7XG4gICAgICAgIHJldHVybiByZXF1aXJlKHBhdGgpO1xuICAgIH0sIHByZWZpeE5hbWUpO1xuXG4gICAgZnVuY3Rpb24gaW5jbHVkZUFsbEluUm9vdChmb2xkZXIpIHtcbiAgICAgICAgaWYodHlwZW9mIGZvbGRlciAhPSBcInN0cmluZ1wiKXtcbiAgICAgICAgICAgIC8vd2UgYXNzdW1lIHRoYXQgaXQgaXMgYSBsaWJyYXJ5IG1vZHVsZSBwcm9wZXJseSByZXF1aXJlZCB3aXRoIHJlcXVpcmUgYW5kIGNvbnRhaW5pbmcgJCQubGlicmFyeVxuICAgICAgICAgICAgZm9yKHZhciB2IGluIGZvbGRlcil7XG4gICAgICAgICAgICAgICAgJCQucmVnaXN0ZXJTd2FybURlc2NyaXB0aW9uKHByZWZpeE5hbWUsdiwgcHJlZml4TmFtZSArIFwiLlwiICsgdiwgIGZvbGRlclt2XSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBuZXdOYW1lcyA9ICQkLl9fZ2xvYmFsLnJlcXVpcmVMaWJyYXJpZXNOYW1lc1twcmVmaXhOYW1lXTtcbiAgICAgICAgICAgIGZvcih2YXIgdiBpbiBuZXdOYW1lcyl7XG4gICAgICAgICAgICAgICAgc2VsZlt2XSA9ICBuZXdOYW1lc1t2XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmb2xkZXI7XG4gICAgICAgIH1cblxuXG4gICAgICAgIHZhciByZXMgPSBwcmVmaXhlZFJlcXVpcmUoZm9sZGVyKTsgLy8gYSBsaWJyYXJ5IGlzIGp1c3QgYSBtb2R1bGVcbiAgICAgICAgaWYodHlwZW9mIHJlcy5fX2F1dG9nZW5lcmF0ZWRfcHJpdmF0ZXNreV9saWJyYXJ5TmFtZSAhPSBcInVuZGVmaW5lZFwiKXtcbiAgICAgICAgICAgIHZhciBzd2FybXMgPSAkJC5fX2dsb2JhbC5yZXF1aXJlTGlicmFyaWVzTmFtZXNbcmVzLl9fYXV0b2dlbmVyYXRlZF9wcml2YXRlc2t5X2xpYnJhcnlOYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzd2FybXMgPSAkJC5fX2dsb2JhbC5yZXF1aXJlTGlicmFyaWVzTmFtZXNbZm9sZGVyXTtcbiAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGV4aXN0aW5nTmFtZTtcbiAgICAgICAgICAgIGZvcih2YXIgdiBpbiBzd2FybXMpe1xuICAgICAgICAgICAgICAgIGV4aXN0aW5nTmFtZSA9IHN3YXJtc1t2XTtcbiAgICAgICAgICAgICAgICBzZWxmW3ZdID0gZXhpc3RpbmdOYW1lO1xuICAgICAgICAgICAgICAgICQkLnJlZ2lzdGVyU3dhcm1EZXNjcmlwdGlvbihwcmVmaXhOYW1lLHYsIHByZWZpeE5hbWUgKyBcIi5cIiArIHYsICBleGlzdGluZ05hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHdyYXBTd2FybVJlbGF0ZWRGdW5jdGlvbnMoc3BhY2UsIHByZWZpeE5hbWUpe1xuICAgICAgICB2YXIgcmV0ID0ge307XG4gICAgICAgIHZhciBuYW1lcyA9IFtcImNyZWF0ZVwiLCBcImRlc2NyaWJlXCIsIFwic3RhcnRcIiwgXCJyZXN0YXJ0XCJdO1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpPG5hbWVzLmxlbmd0aDsgaSsrICl7XG4gICAgICAgICAgICByZXRbbmFtZXNbaV1dID0gd3JhcENhbGwoc3BhY2VbbmFtZXNbaV1dLCBwcmVmaXhOYW1lKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIHRoaXMuY2FsbGZsb3dzICAgICAgICA9IHRoaXMuY2FsbGZsb3cgICA9IHdyYXBTd2FybVJlbGF0ZWRGdW5jdGlvbnMoJCQuY2FsbGZsb3dzLCBwcmVmaXhOYW1lKTtcbiAgICB0aGlzLnN3YXJtcyAgICAgICAgICAgPSB0aGlzLnN3YXJtICAgICAgPSB3cmFwU3dhcm1SZWxhdGVkRnVuY3Rpb25zKCQkLnN3YXJtcywgcHJlZml4TmFtZSk7XG4gICAgdGhpcy5jb250cmFjdHMgICAgICAgID0gdGhpcy5jb250cmFjdCAgID0gd3JhcFN3YXJtUmVsYXRlZEZ1bmN0aW9ucygkJC5jb250cmFjdHMsIHByZWZpeE5hbWUpO1xuICAgIGluY2x1ZGVBbGxJblJvb3QoZm9sZGVyLCBwcmVmaXhOYW1lKTtcbn1cblxuZXhwb3J0cy5sb2FkTGlicmFyeSA9IGZ1bmN0aW9uKHByZWZpeE5hbWUsIGZvbGRlcil7XG4gICAgdmFyIGV4aXN0aW5nID0gJCQubGlicmFyaWVzW3ByZWZpeE5hbWVdO1xuICAgIGlmKGV4aXN0aW5nICl7XG4gICAgICAgIGlmKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBTd2FybUxpYnJhcnkpKXtcbiAgICAgICAgICAgIHZhciBzTCA9IG5ldyBTd2FybUxpYnJhcnkocHJlZml4TmFtZSwgZm9sZGVyKTtcbiAgICAgICAgICAgIGZvcih2YXIgcHJvcCBpbiBleGlzdGluZyl7XG4gICAgICAgICAgICAgICAgc0xbcHJvcF0gPSBleGlzdGluZ1twcm9wXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzTDtcbiAgICAgICAgfVxuICAgICAgICBpZihmb2xkZXIpIHtcbiAgICAgICAgICAgICQkLmVycm9ySGFuZGxlci53YXJuaW5nKFwiUmV1c2luZyBhbHJlYWR5IGxvYWRlZCBsaWJyYXJ5IFwiICsgcHJlZml4TmFtZSArIFwiY291bGQgYmUgYW4gZXJyb3IhXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBleGlzdGluZztcbiAgICB9XG4gICAgLy92YXIgYWJzb2x1dGVQYXRoID0gcGF0aC5yZXNvbHZlKGZvbGRlcik7XG4gICAgcmV0dXJuIG5ldyBTd2FybUxpYnJhcnkocHJlZml4TmFtZSwgZm9sZGVyKTtcbn1cblxuIiwiLypcbiByZXF1aXJlIGFuZCAkJC5yZXF1aXJlIGFyZSBvdmVyd3JpdGluZyB0aGUgbm9kZS5qcyBkZWZhdWx0cyBpbiBsb2FkaW5nIG1vZHVsZXMgZm9yIGluY3JlYXNpbmcgc2VjdXJpdHksc3BlZWQgYW5kIG1ha2luZyBpdCB3b3JrIHRvIHRoZSBwcml2YXRlc2t5IHJ1bnRpbWUgYnVpbGQgd2l0aCBicm93c2VyaWZ5LlxuIFRoZSBwcml2YXRlc2t5IGNvZGUgZm9yIGRvbWFpbnMgc2hvdWxkIHdvcmsgaW4gbm9kZSBhbmQgYnJvd3NlcnMuXG4gKi9cblxuXG5pZiAodHlwZW9mKHdpbmRvdykgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBnbG9iYWwgPSB3aW5kb3c7XG59XG5cblxuaWYgKHR5cGVvZihnbG9iYWwuJCQpID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBnbG9iYWwuJCQgPSB7fTtcbiAgICAkJC5fX2dsb2JhbCA9IHt9O1xufVxuXG5pZiAodHlwZW9mKCQkLl9fZ2xvYmFsKSA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgJCQuX19nbG9iYWwgPSB7fTtcbn1cblxuaWYgKHR5cGVvZigkJC5fX2dsb2JhbC5yZXF1aXJlTGlicmFyaWVzTmFtZXMpID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAkJC5fX2dsb2JhbC5jdXJyZW50TGlicmFyeU5hbWUgPSBudWxsO1xuICAgICQkLl9fZ2xvYmFsLnJlcXVpcmVMaWJyYXJpZXNOYW1lcyA9IHt9O1xufVxuXG5cbmlmICh0eXBlb2YoJCQuX19ydW50aW1lTW9kdWxlcykgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICQkLl9fcnVudGltZU1vZHVsZXMgPSB7fTtcbn1cblxuXG5pZiAodHlwZW9mKGdsb2JhbC5mdW5jdGlvblVuZGVmaW5lZCkgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIGdsb2JhbC5mdW5jdGlvblVuZGVmaW5lZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJDYWxsZWQgb2YgYW4gdW5kZWZpbmVkIGZ1bmN0aW9uISEhIVwiKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIG9mIGFuIHVuZGVmaW5lZCBmdW5jdGlvblwiKTtcbiAgICB9O1xuICAgIGlmICh0eXBlb2YoZ2xvYmFsLndlYnNoaW1zUmVxdWlyZSkgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICBnbG9iYWwud2Vic2hpbXNSZXF1aXJlID0gZ2xvYmFsLmZ1bmN0aW9uVW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YoZ2xvYmFsLmRvbWFpblJlcXVpcmUpID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgZ2xvYmFsLmRvbWFpblJlcXVpcmUgPSBnbG9iYWwuZnVuY3Rpb25VbmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZihnbG9iYWwucHNrcnVudGltZVJlcXVpcmUpID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgZ2xvYmFsLnBza3J1bnRpbWVSZXF1aXJlID0gZ2xvYmFsLmZ1bmN0aW9uVW5kZWZpbmVkO1xuICAgIH1cbn1cblxuaWYgKHR5cGVvZigkJC5sb2cpID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAkJC5sb2cgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICBjb25zb2xlLmxvZyhhcmdzLmpvaW4oXCIgXCIpKTtcbiAgICB9XG59XG5cblxuY29uc3Qgd2VBcmVJbmJyb3dzZXIgPSAodHlwZW9mICgkJC5icm93c2VyUnVudGltZSkgIT0gXCJ1bmRlZmluZWRcIik7XG5jb25zdCB3ZUFyZUluU2FuZGJveCA9ICh0eXBlb2YgZ2xvYmFsLnJlcXVpcmUgIT09ICd1bmRlZmluZWQnKTtcblxuXG5jb25zdCBwYXN0UmVxdWVzdHMgPSB7fTtcblxuZnVuY3Rpb24gcHJldmVudFJlY3Vyc2l2ZVJlcXVpcmUocmVxdWVzdCkge1xuICAgIGlmIChwYXN0UmVxdWVzdHNbcmVxdWVzdF0pIHtcbiAgICAgICAgY29uc3QgZXJyID0gbmV3IEVycm9yKFwiUHJldmVudGluZyByZWN1cnNpdmUgcmVxdWlyZSBmb3IgXCIgKyByZXF1ZXN0KTtcbiAgICAgICAgZXJyLnR5cGUgPSBcIlBTS0lnbm9yYWJsZUVycm9yXCI7XG4gICAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbn1cblxuZnVuY3Rpb24gZGlzYWJsZVJlcXVpcmUocmVxdWVzdCkge1xuICAgIHBhc3RSZXF1ZXN0c1tyZXF1ZXN0XSA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIGVuYWJsZVJlcXVpcmUocmVxdWVzdCkge1xuICAgIHBhc3RSZXF1ZXN0c1tyZXF1ZXN0XSA9IGZhbHNlO1xufVxuXG5cbmZ1bmN0aW9uIHJlcXVpcmVGcm9tQ2FjaGUocmVxdWVzdCkge1xuICAgIGNvbnN0IGV4aXN0aW5nTW9kdWxlID0gJCQuX19ydW50aW1lTW9kdWxlc1tyZXF1ZXN0XTtcbiAgICByZXR1cm4gZXhpc3RpbmdNb2R1bGU7XG59XG5cbmZ1bmN0aW9uIHdyYXBTdGVwKGNhbGxiYWNrTmFtZSkge1xuICAgIGNvbnN0IGNhbGxiYWNrID0gZ2xvYmFsW2NhbGxiYWNrTmFtZV07XG5cbiAgICBpZiAoY2FsbGJhY2sgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2sgPT09IGdsb2JhbC5mdW5jdGlvblVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gY2FsbGJhY2socmVxdWVzdCk7XG4gICAgICAgICQkLl9fcnVudGltZU1vZHVsZXNbcmVxdWVzdF0gPSByZXN1bHQ7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0cnlSZXF1aXJlU2VxdWVuY2Uob3JpZ2luYWxSZXF1aXJlLCByZXF1ZXN0KSB7XG4gICAgbGV0IGFycjtcbiAgICBpZiAob3JpZ2luYWxSZXF1aXJlKSB7XG4gICAgICAgIGFyciA9ICQkLl9fcmVxdWlyZUZ1bmN0aW9uc0NoYWluLnNsaWNlKCk7XG4gICAgICAgIGFyci5wdXNoKG9yaWdpbmFsUmVxdWlyZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYXJyID0gJCQuX19yZXF1aXJlRnVuY3Rpb25zQ2hhaW47XG4gICAgfVxuXG4gICAgcHJldmVudFJlY3Vyc2l2ZVJlcXVpcmUocmVxdWVzdCk7XG4gICAgZGlzYWJsZVJlcXVpcmUocmVxdWVzdCk7XG4gICAgbGV0IHJlc3VsdDtcbiAgICBjb25zdCBwcmV2aW91c1JlcXVpcmUgPSAkJC5fX2dsb2JhbC5jdXJyZW50TGlicmFyeU5hbWU7XG4gICAgbGV0IHByZXZpb3VzUmVxdWlyZUNoYW5nZWQgPSBmYWxzZTtcblxuICAgIGlmICghcHJldmlvdXNSZXF1aXJlKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiTG9hZGluZyBsaWJyYXJ5IGZvciByZXF1aXJlXCIsIHJlcXVlc3QpO1xuICAgICAgICAkJC5fX2dsb2JhbC5jdXJyZW50TGlicmFyeU5hbWUgPSByZXF1ZXN0O1xuXG4gICAgICAgIGlmICh0eXBlb2YgJCQuX19nbG9iYWwucmVxdWlyZUxpYnJhcmllc05hbWVzW3JlcXVlc3RdID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICQkLl9fZ2xvYmFsLnJlcXVpcmVMaWJyYXJpZXNOYW1lc1tyZXF1ZXN0XSA9IHt9O1xuICAgICAgICAgICAgLy8kJC5fX2dsb2JhbC5yZXF1aXJlTGlicmFyaWVzRGVzY3JpcHRpb25zW3JlcXVlc3RdICAgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBwcmV2aW91c1JlcXVpcmVDaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgZnVuYyA9IGFycltpXTtcbiAgICAgICAgdHJ5IHtcblxuICAgICAgICAgICAgaWYgKGZ1bmMgPT09IGdsb2JhbC5mdW5jdGlvblVuZGVmaW5lZCkgY29udGludWU7XG4gICAgICAgICAgICByZXN1bHQgPSBmdW5jKHJlcXVlc3QpO1xuXG4gICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyLnR5cGUgIT09IFwiUFNLSWdub3JhYmxlRXJyb3JcIikge1xuICAgICAgICAgICAgICAgICQkLmxvZyhcIlJlcXVpcmUgZW5jb3VudGVyZWQgYW4gZXJyb3Igd2hpbGUgbG9hZGluZyBcIiwgcmVxdWVzdCwgXCJcXG5DYXVzZTpcXG5cIiwgZXJyLnN0YWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgICQkLmxvZyhcIkZhaWxlZCB0byBsb2FkIG1vZHVsZSBcIiwgcmVxdWVzdCwgcmVzdWx0KTtcbiAgICB9XG5cbiAgICBlbmFibGVSZXF1aXJlKHJlcXVlc3QpO1xuICAgIGlmIChwcmV2aW91c1JlcXVpcmVDaGFuZ2VkKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJFbmQgbG9hZGluZyBsaWJyYXJ5IGZvciByZXF1aXJlXCIsIHJlcXVlc3QsICQkLl9fZ2xvYmFsLnJlcXVpcmVMaWJyYXJpZXNOYW1lc1tyZXF1ZXN0XSk7XG4gICAgICAgICQkLl9fZ2xvYmFsLmN1cnJlbnRMaWJyYXJ5TmFtZSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmlmICh0eXBlb2YoJCQucmVxdWlyZSkgPT0gXCJ1bmRlZmluZWRcIikge1xuXG4gICAgJCQuX19yZXF1aXJlTGlzdCA9IFtcIndlYnNoaW1zUmVxdWlyZVwiLCBcInBza3J1bnRpbWVSZXF1aXJlXCJdO1xuICAgICQkLl9fcmVxdWlyZUZ1bmN0aW9uc0NoYWluID0gW107XG5cbiAgICAkJC5yZXF1aXJlQnVuZGxlID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgbmFtZSArPSBcIlJlcXVpcmVcIjtcbiAgICAgICAgJCQuX19yZXF1aXJlTGlzdC5wdXNoKG5hbWUpO1xuICAgICAgICBjb25zdCBhcnIgPSBbcmVxdWlyZUZyb21DYWNoZV07XG4gICAgICAgICQkLl9fcmVxdWlyZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgY29uc3QgY2FsbGJhY2sgPSB3cmFwU3RlcChpdGVtKTtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGFyci5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCQuX19yZXF1aXJlRnVuY3Rpb25zQ2hhaW4gPSBhcnI7XG4gICAgfTtcblxuICAgICQkLnJlcXVpcmVCdW5kbGUoXCJpbml0XCIpO1xuXG4gICAgaWYgKHdlQXJlSW5icm93c2VyKSB7XG4gICAgICAgICQkLmxvZyhcIkRlZmluaW5nIGdsb2JhbCByZXF1aXJlIGluIGJyb3dzZXJcIik7XG5cblxuICAgICAgICBnbG9iYWwucmVxdWlyZSA9IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG5cbiAgICAgICAgICAgIC8vLypbcmVxdWlyZUZyb21DYWNoZSwgd3JhcFN0ZXAod2Vic2hpbXNSZXF1aXJlKSwgLCB3cmFwU3RlcChwc2tydW50aW1lUmVxdWlyZSksIHdyYXBTdGVwKGRvbWFpblJlcXVpcmUpKl1cbiAgICAgICAgICAgIHJldHVybiB0cnlSZXF1aXJlU2VxdWVuY2UobnVsbCwgcmVxdWVzdCk7XG4gICAgICAgIH1cbiAgICB9IGVsc2VcbiAgICAgICAgaWYgKHdlQXJlSW5TYW5kYm94KSB7XG4gICAgICAgIC8vIHJlcXVpcmUgc2hvdWxkIGJlIHByb3ZpZGVkIHdoZW4gY29kZSBpcyBsb2FkZWQgaW4gYnJvd3NlcmlmeVxuICAgICAgICBjb25zdCBidW5kbGVSZXF1aXJlID0gcmVxdWlyZTtcblxuICAgICAgICAkJC5yZXF1aXJlQnVuZGxlKCdzYW5kYm94QmFzZScpO1xuICAgICAgICAvLyB0aGlzIHNob3VsZCBiZSBzZXQgdXAgYnkgc2FuZGJveCBwcmlvciB0b1xuICAgICAgICBjb25zdCBzYW5kYm94UmVxdWlyZSA9IGdsb2JhbC5yZXF1aXJlO1xuICAgICAgICBnbG9iYWwuY3J5cHRvID0gcmVxdWlyZSgnY3J5cHRvJyk7XG5cbiAgICAgICAgZnVuY3Rpb24gbmV3TG9hZGVyKHJlcXVlc3QpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwibmV3TG9hZGVyOlwiLCByZXF1ZXN0KTtcbiAgICAgICAgICAgIC8vcHJldmVudFJlY3Vyc2l2ZVJlcXVpcmUocmVxdWVzdCk7XG4gICAgICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3RyeWluZyB0byBsb2FkICcsIHJlcXVlc3QpO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiB0cnlCdW5kbGVSZXF1aXJlKC4uLmFyZ3MpIHtcbiAgICAgICAgICAgICAgICAvL3JldHVybiAkJC5fX29yaWdpbmFsUmVxdWlyZS5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgICAgICAgIC8vcmV0dXJuIE1vZHVsZS5fbG9hZC5hcHBseShzZWxmLGFyZ3MpXG4gICAgICAgICAgICAgICAgbGV0IHJlcztcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICByZXMgPSBzYW5kYm94UmVxdWlyZS5hcHBseShzZWxmLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVyci5jb2RlID09PSBcIk1PRFVMRV9OT1RfRk9VTkRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcCA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCByZXF1ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcyA9IHNhbmRib3hSZXF1aXJlLmFwcGx5KHNlbGYsIFtwXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0ID0gcDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgcmVzO1xuXG5cbiAgICAgICAgICAgIHJlcyA9IHRyeVJlcXVpcmVTZXF1ZW5jZSh0cnlCdW5kbGVSZXF1aXJlLCByZXF1ZXN0KTtcblxuXG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9XG5cbiAgICAgICAgZ2xvYmFsLnJlcXVpcmUgPSBuZXdMb2FkZXI7XG5cbiAgICB9IGVsc2UgeyAgLy93ZSBhcmUgaW4gbm9kZVxuICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG4gICAgICAgICQkLl9fcnVudGltZU1vZHVsZXNbXCJjcnlwdG9cIl0gPSByZXF1aXJlKFwiY3J5cHRvXCIpO1xuICAgICAgICAkJC5fX3J1bnRpbWVNb2R1bGVzW1widXRpbFwiXSA9IHJlcXVpcmUoXCJ1dGlsXCIpO1xuXG4gICAgICAgIGNvbnN0IE1vZHVsZSA9IHJlcXVpcmUoJ21vZHVsZScpO1xuICAgICAgICAkJC5fX3J1bnRpbWVNb2R1bGVzW1wibW9kdWxlXCJdID0gTW9kdWxlO1xuXG4gICAgICAgICQkLmxvZyhcIlJlZGVmaW5pbmcgcmVxdWlyZSBmb3Igbm9kZVwiKTtcblxuICAgICAgICAkJC5fX29yaWdpbmFsUmVxdWlyZSA9IE1vZHVsZS5fbG9hZDtcbiAgICAgICAgY29uc3QgbW9kdWxlT3JpZ2luYWxSZXF1aXJlID0gTW9kdWxlLnByb3RvdHlwZS5yZXF1aXJlO1xuXG4gICAgICAgIGZ1bmN0aW9uIG5ld0xvYWRlcihyZXF1ZXN0KSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIm5ld0xvYWRlcjpcIiwgcmVxdWVzdCk7XG4gICAgICAgICAgICAvL3ByZXZlbnRSZWN1cnNpdmVSZXF1aXJlKHJlcXVlc3QpO1xuICAgICAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIG9yaWdpbmFsUmVxdWlyZSguLi5hcmdzKSB7XG4gICAgICAgICAgICAgICAgLy9yZXR1cm4gJCQuX19vcmlnaW5hbFJlcXVpcmUuYXBwbHkoc2VsZixhcmdzKTtcbiAgICAgICAgICAgICAgICAvL3JldHVybiBNb2R1bGUuX2xvYWQuYXBwbHkoc2VsZixhcmdzKVxuICAgICAgICAgICAgICAgIGxldCByZXM7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzID0gbW9kdWxlT3JpZ2luYWxSZXF1aXJlLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyLmNvZGUgPT09IFwiTU9EVUxFX05PVF9GT1VORFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIHJlcXVlc3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzID0gbW9kdWxlT3JpZ2luYWxSZXF1aXJlLmFwcGx5KHNlbGYsIFtwXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0ID0gcDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBjdXJyZW50Rm9sZGVyUmVxdWlyZShyZXF1ZXN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vW3JlcXVpcmVGcm9tQ2FjaGUsIHdyYXBTdGVwKHBza3J1bnRpbWVSZXF1aXJlKSwgd3JhcFN0ZXAoZG9tYWluUmVxdWlyZSksIG9yaWdpbmFsUmVxdWlyZV1cbiAgICAgICAgICAgIHJldHVybiB0cnlSZXF1aXJlU2VxdWVuY2Uob3JpZ2luYWxSZXF1aXJlLCByZXF1ZXN0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZSA9IG5ld0xvYWRlcjtcbiAgICB9XG5cbiAgICAkJC5yZXF1aXJlID0gcmVxdWlyZTtcbn1cbiIsIlxudmFyIGpvaW5Db3VudGVyID0gMDtcblxuZnVuY3Rpb24gUGFyYWxsZWxKb2luUG9pbnQoc3dhcm0sIGNhbGxiYWNrLCBhcmdzKXtcbiAgICBqb2luQ291bnRlcisrO1xuICAgIHZhciBjaGFubmVsSWQgPSBcIlBhcmFsbGVsSm9pblBvaW50XCIgKyBqb2luQ291bnRlcjtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGNvdW50ZXIgPSAwO1xuICAgIHZhciBzdG9wT3RoZXJFeGVjdXRpb24gICAgID0gZmFsc2U7XG5cbiAgICBmdW5jdGlvbiBleGVjdXRpb25TdGVwKHN0ZXBGdW5jLCBsb2NhbEFyZ3MsIHN0b3Ape1xuXG4gICAgICAgIHRoaXMuZG9FeGVjdXRlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmKHN0b3BPdGhlckV4ZWN1dGlvbil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIHN0ZXBGdW5jLmFwcGx5KHN3YXJtLCBsb2NhbEFyZ3MpO1xuICAgICAgICAgICAgICAgIGlmKHN0b3Ape1xuICAgICAgICAgICAgICAgICAgICBzdG9wT3RoZXJFeGVjdXRpb24gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlOyAvL2V2ZXJ5dGluZyBpcyBmaW5lXG4gICAgICAgICAgICB9IGNhdGNoKGVycil7XG4gICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGVycik7XG4gICAgICAgICAgICAgICAgc2VuZEZvclNvdW5kRXhlY3V0aW9uKGNhbGxiYWNrLCBhcmdzLCB0cnVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vc3RvcCBpdCwgZG8gbm90IGNhbGwgYWdhaW4gYW55dGhpbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgJCQuZXJyb3JIYW5kbGVyLnN5bnRheEVycm9yKFwiaW52YWxpZCBqb2luXCIsc3dhcm0sIFwiaW52YWxpZCBmdW5jdGlvbiBhdCBqb2luIGluIHN3YXJtXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgJCQuUFNLX1B1YlN1Yi5zdWJzY3JpYmUoY2hhbm5lbElkLGZ1bmN0aW9uKGZvckV4ZWN1dGlvbil7XG4gICAgICAgIGlmKHN0b3BPdGhlckV4ZWN1dGlvbil7XG4gICAgICAgICAgICByZXR1cm4gO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgaWYoZm9yRXhlY3V0aW9uLmRvRXhlY3V0ZSgpKXtcbiAgICAgICAgICAgICAgICBkZWNDb3VudGVyKCk7XG4gICAgICAgICAgICB9IC8vIGhhZCBhbiBlcnJvci4uLlxuICAgICAgICB9IGNhdGNoKGVycil7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAvLyQkLmVycm9ySGFuZGxlci5zeW50YXhFcnJvcihcIl9faW50ZXJuYWxfX1wiLHN3YXJtLCBcImV4Y2VwdGlvbiBpbiB0aGUgZXhlY3V0aW9uIG9mIHRoZSBqb2luIGZ1bmN0aW9uIG9mIGEgcGFyYWxsZWwgdGFza1wiKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gaW5jQ291bnRlcigpe1xuICAgICAgICBpZih0ZXN0SWZVbmRlckluc3BlY3Rpb24oKSl7XG4gICAgICAgICAgICAvL3ByZXZlbnRpbmcgaW5zcGVjdG9yIGZyb20gaW5jcmVhc2luZyBjb3VudGVyIHdoZW4gcmVhZGluZyB0aGUgdmFsdWVzIGZvciBkZWJ1ZyByZWFzb25cbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJwcmV2ZW50aW5nIGluc3BlY3Rpb25cIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY291bnRlcisrO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRlc3RJZlVuZGVySW5zcGVjdGlvbigpe1xuICAgICAgICB2YXIgcmVzID0gZmFsc2U7XG4gICAgICAgIHZhciBjb25zdEFyZ3YgPSBwcm9jZXNzLmV4ZWNBcmd2LmpvaW4oKTtcbiAgICAgICAgaWYoY29uc3RBcmd2LmluZGV4T2YoXCJpbnNwZWN0XCIpIT09LTEgfHwgY29uc3RBcmd2LmluZGV4T2YoXCJkZWJ1Z1wiKSE9PS0xKXtcbiAgICAgICAgICAgIC8vb25seSB3aGVuIHJ1bm5pbmcgaW4gZGVidWdcbiAgICAgICAgICAgIHZhciBjYWxsc3RhY2sgPSBuZXcgRXJyb3IoKS5zdGFjaztcbiAgICAgICAgICAgIGlmKGNhbGxzdGFjay5pbmRleE9mKFwiRGVidWdDb21tYW5kUHJvY2Vzc29yXCIpIT09LTEpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRGVidWdDb21tYW5kUHJvY2Vzc29yIGRldGVjdGVkIVwiKTtcbiAgICAgICAgICAgICAgICByZXMgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2VuZEZvclNvdW5kRXhlY3V0aW9uKGZ1bmN0LCBhcmdzLCBzdG9wKXtcbiAgICAgICAgdmFyIG9iaiA9IG5ldyBleGVjdXRpb25TdGVwKGZ1bmN0LCBhcmdzLCBzdG9wKTtcbiAgICAgICAgJCQuUFNLX1B1YlN1Yi5wdWJsaXNoKGNoYW5uZWxJZCwgb2JqKTsgLy8gZm9yY2UgZXhlY3V0aW9uIHRvIGJlIFwic291bmRcIlxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlY0NvdW50ZXIoKXtcbiAgICAgICAgY291bnRlci0tO1xuICAgICAgICBpZihjb3VudGVyID09IDApIHtcbiAgICAgICAgICAgIGFyZ3MudW5zaGlmdChudWxsKTtcbiAgICAgICAgICAgIHNlbmRGb3JTb3VuZEV4ZWN1dGlvbihjYWxsYmFjaywgYXJncywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGlubmVyID0gc3dhcm0uZ2V0SW5uZXJWYWx1ZSgpO1xuXG4gICAgZnVuY3Rpb24gZGVmYXVsdFByb2dyZXNzUmVwb3J0KGVyciwgcmVzKXtcbiAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRleHQ6XCJQYXJhbGxlbCBleGVjdXRpb24gcHJvZ3Jlc3MgZXZlbnRcIixcbiAgICAgICAgICAgIHN3YXJtOnN3YXJtLFxuICAgICAgICAgICAgYXJnczphcmdzLFxuICAgICAgICAgICAgY3VycmVudFJlc3VsdDpyZXNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBta0Z1bmN0aW9uKG5hbWUpe1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oLi4uYXJncyl7XG4gICAgICAgICAgICB2YXIgZiA9IGRlZmF1bHRQcm9ncmVzc1JlcG9ydDtcbiAgICAgICAgICAgIGlmKG5hbWUgIT0gXCJwcm9ncmVzc1wiKXtcbiAgICAgICAgICAgICAgICBmID0gaW5uZXIubXlGdW5jdGlvbnNbbmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgYXJncyA9ICQkLl9faW50ZXJuLm1rQXJncyhhcmdzLCAwKTtcbiAgICAgICAgICAgIHNlbmRGb3JTb3VuZEV4ZWN1dGlvbihmLCBhcmdzLCBmYWxzZSk7XG4gICAgICAgICAgICByZXR1cm4gX19wcm94eU9iamVjdDtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgdGhpcy5nZXQgPSBmdW5jdGlvbih0YXJnZXQsIHByb3AsIHJlY2VpdmVyKXtcbiAgICAgICAgaWYoaW5uZXIubXlGdW5jdGlvbnMuaGFzT3duUHJvcGVydHkocHJvcCkgfHwgcHJvcCA9PSBcInByb2dyZXNzXCIpe1xuICAgICAgICAgICAgaW5jQ291bnRlcigpO1xuICAgICAgICAgICAgcmV0dXJuIG1rRnVuY3Rpb24ocHJvcCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN3YXJtW3Byb3BdO1xuICAgIH07XG5cbiAgICB2YXIgX19wcm94eU9iamVjdDtcblxuICAgIHRoaXMuX19zZXRQcm94eU9iamVjdCA9IGZ1bmN0aW9uKHApe1xuICAgICAgICBfX3Byb3h5T2JqZWN0ID0gcDtcbiAgICB9XG59XG5cbmV4cG9ydHMuY3JlYXRlSm9pblBvaW50ID0gZnVuY3Rpb24oc3dhcm0sIGNhbGxiYWNrLCBhcmdzKXtcbiAgICB2YXIganAgPSBuZXcgUGFyYWxsZWxKb2luUG9pbnQoc3dhcm0sIGNhbGxiYWNrLCBhcmdzKTtcbiAgICB2YXIgaW5uZXIgPSBzd2FybS5nZXRJbm5lclZhbHVlKCk7XG4gICAgdmFyIHAgPSBuZXcgUHJveHkoaW5uZXIsIGpwKTtcbiAgICBqcC5fX3NldFByb3h5T2JqZWN0KHApO1xuICAgIHJldHVybiBwO1xufTsiLCJcbnZhciBqb2luQ291bnRlciA9IDA7XG5cbmZ1bmN0aW9uIFNlcmlhbEpvaW5Qb2ludChzd2FybSwgY2FsbGJhY2ssIGFyZ3Mpe1xuXG4gICAgam9pbkNvdW50ZXIrKztcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgY2hhbm5lbElkID0gXCJTZXJpYWxKb2luUG9pbnRcIiArIGpvaW5Db3VudGVyO1xuXG4gICAgaWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuICAgICAgICAkJC5lcnJvckhhbmRsZXIuc3ludGF4RXJyb3IoXCJ1bmtub3duXCIsIHN3YXJtLCBcImludmFsaWQgZnVuY3Rpb24gZ2l2ZW4gdG8gc2VyaWFsIGluIHN3YXJtXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGlubmVyID0gc3dhcm0uZ2V0SW5uZXJWYWx1ZSgpO1xuXG5cbiAgICBmdW5jdGlvbiBkZWZhdWx0UHJvZ3Jlc3NSZXBvcnQoZXJyLCByZXMpe1xuICAgICAgICBpZihlcnIpIHtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuXG4gICAgdmFyIGZ1bmN0aW9uQ291bnRlciAgICAgPSAwO1xuICAgIHZhciBleGVjdXRpb25Db3VudGVyICAgID0gMDtcblxuICAgIHZhciBwbGFubmVkRXhlY3V0aW9ucyAgID0gW107XG4gICAgdmFyIHBsYW5uZWRBcmd1bWVudHMgICAgPSB7fTtcblxuICAgIGZ1bmN0aW9uIG1rRnVuY3Rpb24obmFtZSwgcG9zKXtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIkNyZWF0aW5nIGZ1bmN0aW9uIFwiLCBuYW1lLCBwb3MpO1xuICAgICAgICBwbGFubmVkQXJndW1lbnRzW3Bvc10gPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgZnVuY3Rpb24gdHJpZ2dldE5leHRTdGVwKCl7XG4gICAgICAgICAgICBpZihwbGFubmVkRXhlY3V0aW9ucy5sZW5ndGggPT0gZXhlY3V0aW9uQ291bnRlciB8fCBwbGFubmVkQXJndW1lbnRzW2V4ZWN1dGlvbkNvdW50ZXJdICkgIHtcbiAgICAgICAgICAgICAgICAkJC5QU0tfUHViU3ViLnB1Ymxpc2goY2hhbm5lbElkLCBzZWxmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBmID0gZnVuY3Rpb24gKC4uLmFyZ3Mpe1xuICAgICAgICAgICAgaWYoZXhlY3V0aW9uQ291bnRlciAhPSBwb3MpIHtcbiAgICAgICAgICAgICAgICBwbGFubmVkQXJndW1lbnRzW3Bvc10gPSBhcmdzO1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJEZWxheWluZyBmdW5jdGlvbjpcIiwgZXhlY3V0aW9uQ291bnRlciwgcG9zLCBwbGFubmVkQXJndW1lbnRzLCBhcmd1bWVudHMsIGZ1bmN0aW9uQ291bnRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9fcHJveHk7XG4gICAgICAgICAgICB9IGVsc2V7XG4gICAgICAgICAgICAgICAgaWYocGxhbm5lZEFyZ3VtZW50c1twb3NdKXtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkV4ZWN1dGluZyAgZnVuY3Rpb246XCIsIGV4ZWN1dGlvbkNvdW50ZXIsIHBvcywgcGxhbm5lZEFyZ3VtZW50cywgYXJndW1lbnRzLCBmdW5jdGlvbkNvdW50ZXIpO1xuXHRcdFx0XHRcdGFyZ3MgPSBwbGFubmVkQXJndW1lbnRzW3Bvc107XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGxhbm5lZEFyZ3VtZW50c1twb3NdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgdHJpZ2dldE5leHRTdGVwKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfX3Byb3h5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGYgPSBkZWZhdWx0UHJvZ3Jlc3NSZXBvcnQ7XG4gICAgICAgICAgICBpZihuYW1lICE9IFwicHJvZ3Jlc3NcIil7XG4gICAgICAgICAgICAgICAgZiA9IGlubmVyLm15RnVuY3Rpb25zW25hbWVdO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBmLmFwcGx5KHNlbGYsYXJncyk7XG4gICAgICAgICAgICB9IGNhdGNoKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShzd2FybSxhcmdzKTsgLy9lcnJvclxuICAgICAgICAgICAgICAgICAgICAkJC5QU0tfUHViU3ViLnVuc3Vic2NyaWJlKGNoYW5uZWxJZCxydW5OZXh0RnVuY3Rpb24pO1xuICAgICAgICAgICAgICAgIHJldHVybjsgLy90ZXJtaW5hdGUgZXhlY3V0aW9uIHdpdGggYW4gZXJyb3IuLi4hXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBleGVjdXRpb25Db3VudGVyKys7XG5cbiAgICAgICAgICAgIHRyaWdnZXROZXh0U3RlcCgpO1xuXG4gICAgICAgICAgICByZXR1cm4gX19wcm94eTtcbiAgICAgICAgfTtcblxuICAgICAgICBwbGFubmVkRXhlY3V0aW9ucy5wdXNoKGYpO1xuICAgICAgICBmdW5jdGlvbkNvdW50ZXIrKztcbiAgICAgICAgcmV0dXJuIGY7XG4gICAgfVxuXG4gICAgIHZhciBmaW5pc2hlZCA9IGZhbHNlO1xuXG4gICAgZnVuY3Rpb24gcnVuTmV4dEZ1bmN0aW9uKCl7XG4gICAgICAgIGlmKGV4ZWN1dGlvbkNvdW50ZXIgPT0gcGxhbm5lZEV4ZWN1dGlvbnMubGVuZ3RoICl7XG4gICAgICAgICAgICBpZighZmluaXNoZWQpe1xuICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChudWxsKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShzd2FybSxhcmdzKTtcbiAgICAgICAgICAgICAgICBmaW5pc2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgJCQuUFNLX1B1YlN1Yi51bnN1YnNjcmliZShjaGFubmVsSWQscnVuTmV4dEZ1bmN0aW9uKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJzZXJpYWwgY29uc3RydWN0IGlzIHVzaW5nIGZ1bmN0aW9ucyB0aGF0IGFyZSBjYWxsZWQgbXVsdGlwbGUgdGltZXMuLi5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwbGFubmVkRXhlY3V0aW9uc1tleGVjdXRpb25Db3VudGVyXSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgJCQuUFNLX1B1YlN1Yi5zdWJzY3JpYmUoY2hhbm5lbElkLHJ1bk5leHRGdW5jdGlvbik7IC8vIGZvcmNlIGl0IHRvIGJlIFwic291bmRcIlxuXG5cbiAgICB0aGlzLmdldCA9IGZ1bmN0aW9uKHRhcmdldCwgcHJvcCwgcmVjZWl2ZXIpe1xuICAgICAgICBpZihwcm9wID09IFwicHJvZ3Jlc3NcIiB8fCBpbm5lci5teUZ1bmN0aW9ucy5oYXNPd25Qcm9wZXJ0eShwcm9wKSl7XG4gICAgICAgICAgICByZXR1cm4gbWtGdW5jdGlvbihwcm9wLCBmdW5jdGlvbkNvdW50ZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzd2FybVtwcm9wXTtcbiAgICB9XG5cbiAgICB2YXIgX19wcm94eTtcbiAgICB0aGlzLnNldFByb3h5T2JqZWN0ID0gZnVuY3Rpb24ocCl7XG4gICAgICAgIF9fcHJveHkgPSBwO1xuICAgIH1cbn1cblxuZXhwb3J0cy5jcmVhdGVTZXJpYWxKb2luUG9pbnQgPSBmdW5jdGlvbihzd2FybSwgY2FsbGJhY2ssIGFyZ3Mpe1xuICAgIHZhciBqcCA9IG5ldyBTZXJpYWxKb2luUG9pbnQoc3dhcm0sIGNhbGxiYWNrLCBhcmdzKTtcbiAgICB2YXIgaW5uZXIgPSBzd2FybS5nZXRJbm5lclZhbHVlKCk7XG4gICAgdmFyIHAgPSBuZXcgUHJveHkoaW5uZXIsIGpwKTtcbiAgICBqcC5zZXRQcm94eU9iamVjdChwKTtcbiAgICByZXR1cm4gcDtcbn0iLCJjb25zdCBPd00gPSByZXF1aXJlKFwic3dhcm11dGlsc1wiKS5Pd007XG5cbnZhciBzd2FybURlc2NyaXB0aW9uc1JlZ2lzdHJ5ID0ge307XG5cblxuJCQucmVnaXN0ZXJTd2FybURlc2NyaXB0aW9uID0gIGZ1bmN0aW9uKGxpYnJhcnlOYW1lLCBzaG9ydE5hbWUsIHN3YXJtVHlwZU5hbWUsIGRlc2NyaXB0aW9uKXtcbiAgICBpZighJCQubGlicmFyaWVzW2xpYnJhcnlOYW1lXSl7XG4gICAgICAgICQkLmxpYnJhcmllc1tsaWJyYXJ5TmFtZV0gPSB7fTtcbiAgICB9XG5cbiAgICBpZighJCQuX19nbG9iYWwucmVxdWlyZUxpYnJhcmllc05hbWVzW2xpYnJhcnlOYW1lXSl7XG4gICAgICAgICQkLl9fZ2xvYmFsLnJlcXVpcmVMaWJyYXJpZXNOYW1lc1tsaWJyYXJ5TmFtZV0gPSB7fTtcbiAgICB9XG5cbiAgICAkJC5saWJyYXJpZXNbbGlicmFyeU5hbWVdW3Nob3J0TmFtZV0gPSBkZXNjcmlwdGlvbjtcbiAgICAvL2NvbnNvbGUubG9nKFwiUmVnaXN0ZXJpbmcgXCIsIGxpYnJhcnlOYW1lLHNob3J0TmFtZSwgJCQuX19nbG9iYWwuY3VycmVudExpYnJhcnlOYW1lKTtcbiAgICBpZigkJC5fX2dsb2JhbC5jdXJyZW50TGlicmFyeU5hbWUpe1xuICAgICAgICAkJC5fX2dsb2JhbC5yZXF1aXJlTGlicmFyaWVzTmFtZXNbJCQuX19nbG9iYWwuY3VycmVudExpYnJhcnlOYW1lXVtzaG9ydE5hbWVdID0gbGlicmFyeU5hbWUgKyBcIi5cIiArIHNob3J0TmFtZTtcbiAgICB9XG5cbiAgICAkJC5fX2dsb2JhbC5yZXF1aXJlTGlicmFyaWVzTmFtZXNbbGlicmFyeU5hbWVdW3Nob3J0TmFtZV0gPSBzd2FybVR5cGVOYW1lO1xuXG4gICAgaWYodHlwZW9mIGRlc2NyaXB0aW9uID09IFwic3RyaW5nXCIpe1xuICAgICAgICBkZXNjcmlwdGlvbiA9IHN3YXJtRGVzY3JpcHRpb25zUmVnaXN0cnlbZGVzY3JpcHRpb25dO1xuICAgIH1cbiAgICBzd2FybURlc2NyaXB0aW9uc1JlZ2lzdHJ5W3N3YXJtVHlwZU5hbWVdID0gZGVzY3JpcHRpb247XG59XG5cblxudmFyIGN1cnJlbnRMaWJyYXJ5Q291bnRlciA9IDA7XG4kJC5saWJyYXJ5ID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgIGN1cnJlbnRMaWJyYXJ5Q291bnRlcisrO1xuICAgIHZhciBwcmV2aW91c0N1cnJlbnRMaWJyYXJ5ID0gJCQuX19nbG9iYWwuY3VycmVudExpYnJhcnlOYW1lO1xuICAgIHZhciBsaWJyYXJ5TmFtZSA9IFwiX19fcHJpdmF0ZXNreV9saWJyYXJ5XCIrY3VycmVudExpYnJhcnlDb3VudGVyO1xuICAgIHZhciByZXQgPSAkJC5fX2dsb2JhbC5yZXF1aXJlTGlicmFyaWVzTmFtZXNbbGlicmFyeU5hbWVdID0ge307XG4gICAgJCQuX19nbG9iYWwuY3VycmVudExpYnJhcnlOYW1lID0gbGlicmFyeU5hbWU7XG4gICAgY2FsbGJhY2soKTtcbiAgICAkJC5fX2dsb2JhbC5jdXJyZW50TGlicmFyeU5hbWUgPSBwcmV2aW91c0N1cnJlbnRMaWJyYXJ5O1xuICAgIHJldC5fX2F1dG9nZW5lcmF0ZWRfcHJpdmF0ZXNreV9saWJyYXJ5TmFtZSA9IGxpYnJhcnlOYW1lO1xuICAgIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIFN3YXJtU3BhY2Uoc3dhcm1UeXBlLCB1dGlscykge1xuXG4gICAgdmFyIGJlZXNIZWFsZXIgPSByZXF1aXJlKFwic3dhcm11dGlsc1wiKS5iZWVzSGVhbGVyO1xuXG4gICAgZnVuY3Rpb24gZ2V0RnVsbE5hbWUoc2hvcnROYW1lKXtcbiAgICAgICAgdmFyIGZ1bGxOYW1lO1xuICAgICAgICBpZihzaG9ydE5hbWUgJiYgc2hvcnROYW1lLmluY2x1ZGVzKFwiLlwiKSkge1xuICAgICAgICAgICAgZnVsbE5hbWUgPSBzaG9ydE5hbWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmdWxsTmFtZSA9ICQkLmxpYnJhcnlQcmVmaXggKyBcIi5cIiArIHNob3J0TmFtZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnVsbE5hbWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gVmFyRGVzY3JpcHRpb24oZGVzYyl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZXN0b3JlOmZ1bmN0aW9uKGpzb25TdHJpbmcpe1xuICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKGpzb25TdHJpbmcpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRvSnNvblN0cmluZzpmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBTd2FybURlc2NyaXB0aW9uKHN3YXJtVHlwZU5hbWUsIGRlc2NyaXB0aW9uKXtcblxuICAgICAgICBzd2FybVR5cGVOYW1lID0gZ2V0RnVsbE5hbWUoc3dhcm1UeXBlTmFtZSk7XG5cbiAgICAgICAgdmFyIGxvY2FsSWQgPSAwOyAgLy8gdW5pcXVlIGZvciBlYWNoIHN3YXJtXG5cbiAgICAgICAgZnVuY3Rpb24gY3JlYXRlVmFycyhkZXNjcil7XG4gICAgICAgICAgICB2YXIgbWVtYmVycyA9IHt9O1xuICAgICAgICAgICAgZm9yKHZhciB2IGluIGRlc2NyKXtcbiAgICAgICAgICAgICAgICBtZW1iZXJzW3ZdID0gbmV3IFZhckRlc2NyaXB0aW9uKGRlc2NyW3ZdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtZW1iZXJzO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY3JlYXRlTWVtYmVycyhkZXNjcil7XG4gICAgICAgICAgICB2YXIgbWVtYmVycyA9IHt9O1xuICAgICAgICAgICAgZm9yKHZhciB2IGluIGRlc2NyaXB0aW9uKXtcblxuICAgICAgICAgICAgICAgIGlmKHYgIT0gXCJwdWJsaWNcIiAmJiB2ICE9IFwicHJpdmF0ZVwiKXtcbiAgICAgICAgICAgICAgICAgICAgbWVtYmVyc1t2XSA9IGRlc2NyaXB0aW9uW3ZdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtZW1iZXJzO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHB1YmxpY1ZhcnMgPSBjcmVhdGVWYXJzKGRlc2NyaXB0aW9uLnB1YmxpYyk7XG4gICAgICAgIHZhciBwcml2YXRlVmFycyA9IGNyZWF0ZVZhcnMoZGVzY3JpcHRpb24ucHJpdmF0ZSk7XG4gICAgICAgIHZhciBteUZ1bmN0aW9ucyA9IGNyZWF0ZU1lbWJlcnMoZGVzY3JpcHRpb24pO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZVBoYXNlKHRoaXNJbnN0YW5jZSwgZnVuYywgcGhhc2VOYW1lKXtcbiAgICAgICAgICAgIHZhciBrZXlCZWZvcmUgPSBgJHtzd2FybVR5cGVOYW1lfS8ke3BoYXNlTmFtZX0vJHskJC5DT05TVEFOVFMuQkVGT1JFX0lOVEVSQ0VQVE9SfWA7XG4gICAgICAgICAgICB2YXIga2V5QWZ0ZXIgPSBgJHtzd2FybVR5cGVOYW1lfS8ke3BoYXNlTmFtZX0vJHskJC5DT05TVEFOVFMuQUZURVJfSU5URVJDRVBUT1J9YDtcblxuICAgICAgICAgICAgdmFyIHBoYXNlID0gZnVuY3Rpb24oLi4uYXJncyl7XG4gICAgICAgICAgICAgICAgdmFyIHJldDtcbiAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgICQkLlBTS19QdWJTdWIuYmxvY2tDYWxsQmFja3MoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpc0luc3RhbmNlLnNldE1ldGFkYXRhKCdwaGFzZU5hbWUnLCBwaGFzZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAkJC5pbnRlcmNlcHRvci5jYWxsSW50ZXJjZXB0b3JzKGtleUJlZm9yZSwgdGhpc0luc3RhbmNlLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gZnVuYy5hcHBseSh0aGlzSW5zdGFuY2UsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICAkJC5pbnRlcmNlcHRvci5jYWxsSW50ZXJjZXB0b3JzKGtleUFmdGVyLCB0aGlzSW5zdGFuY2UsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICAkJC5QU0tfUHViU3ViLnJlbGVhc2VDYWxsQmFja3MoKTtcbiAgICAgICAgICAgICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgJCQuUFNLX1B1YlN1Yi5yZWxlYXNlQ2FsbEJhY2tzKCk7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vZHluYW1pYyBuYW1lZCBmdW5jIGluIG9yZGVyIHRvIGltcHJvdmUgY2FsbHN0YWNrXG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocGhhc2UsIFwibmFtZVwiLCB7Z2V0OiBmdW5jdGlvbigpe3JldHVybiBzd2FybVR5cGVOYW1lK1wiLlwiK2Z1bmMubmFtZX19KTtcbiAgICAgICAgICAgIHJldHVybiBwaGFzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaW5pdGlhbGlzZSA9IGZ1bmN0aW9uKHNlcmlhbGlzZWRWYWx1ZXMpe1xuXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IE93TSh7XG4gICAgICAgICAgICAgICAgcHVibGljVmFyczp7XG5cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHByaXZhdGVWYXJzOntcblxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcHJvdGVjdGVkVmFyczp7XG5cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG15RnVuY3Rpb25zOntcblxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdXRpbGl0eUZ1bmN0aW9uczp7XG5cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG1ldGE6e1xuICAgICAgICAgICAgICAgICAgICBzd2FybVR5cGVOYW1lOnN3YXJtVHlwZU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHN3YXJtRGVzY3JpcHRpb246ZGVzY3JpcHRpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICBmb3IodmFyIHYgaW4gcHVibGljVmFycyl7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1YmxpY1ZhcnNbdl0gPSBwdWJsaWNWYXJzW3ZdLmluaXQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGZvcih2YXIgdiBpbiBwcml2YXRlVmFycyl7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnByaXZhdGVWYXJzW3ZdID0gcHJpdmF0ZVZhcnNbdl0uaW5pdCgpO1xuICAgICAgICAgICAgfTtcblxuXG4gICAgICAgICAgICBpZihzZXJpYWxpc2VkVmFsdWVzKXtcbiAgICAgICAgICAgICAgICBiZWVzSGVhbGVyLmpzb25Ub05hdGl2ZShzZXJpYWxpc2VkVmFsdWVzLCByZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmluaXRpYWxpc2VGdW5jdGlvbnMgPSBmdW5jdGlvbih2YWx1ZU9iamVjdCwgdGhpc09iamVjdCl7XG5cbiAgICAgICAgICAgIGZvcih2YXIgdiBpbiBteUZ1bmN0aW9ucyl7XG4gICAgICAgICAgICAgICAgdmFsdWVPYmplY3QubXlGdW5jdGlvbnNbdl0gPSBjcmVhdGVQaGFzZSh0aGlzT2JqZWN0LCBteUZ1bmN0aW9uc1t2XSwgdik7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBsb2NhbElkKys7XG4gICAgICAgICAgICB2YWx1ZU9iamVjdC51dGlsaXR5RnVuY3Rpb25zID0gdXRpbHMuY3JlYXRlRm9yT2JqZWN0KHZhbHVlT2JqZWN0LCB0aGlzT2JqZWN0LCBsb2NhbElkKTtcblxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5nZXQgPSBmdW5jdGlvbih0YXJnZXQsIHByb3BlcnR5LCByZWNlaXZlcil7XG5cblxuICAgICAgICAgICAgaWYocHVibGljVmFycy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldC5wdWJsaWNWYXJzW3Byb3BlcnR5XTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYocHJpdmF0ZVZhcnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXQucHJpdmF0ZVZhcnNbcHJvcGVydHldO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZih0YXJnZXQudXRpbGl0eUZ1bmN0aW9ucy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpXG4gICAgICAgICAgICB7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0LnV0aWxpdHlGdW5jdGlvbnNbcHJvcGVydHldO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIGlmKG15RnVuY3Rpb25zLmhhc093blByb3BlcnR5KHByb3BlcnR5KSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0Lm15RnVuY3Rpb25zW3Byb3BlcnR5XTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYodGFyZ2V0LnByb3RlY3RlZFZhcnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXQucHJvdGVjdGVkVmFyc1twcm9wZXJ0eV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHR5cGVvZiBwcm9wZXJ0eSAhPSBcInN5bWJvbFwiKSB7XG4gICAgICAgICAgICAgICAgJCQuZXJyb3JIYW5kbGVyLnN5bnRheEVycm9yKHByb3BlcnR5LCB0YXJnZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0ID0gZnVuY3Rpb24odGFyZ2V0LCBwcm9wZXJ0eSwgdmFsdWUsIHJlY2VpdmVyKXtcblxuICAgICAgICAgICAgaWYodGFyZ2V0LnV0aWxpdHlGdW5jdGlvbnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpIHx8IHRhcmdldC5teUZ1bmN0aW9ucy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICAkJC5lcnJvckhhbmRsZXIuc3ludGF4RXJyb3IocHJvcGVydHkpO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRyeWluZyB0byBvdmVyd3JpdGUgaW1tdXRhYmxlIG1lbWJlclwiICsgcHJvcGVydHkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZihwcml2YXRlVmFycy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LnByaXZhdGVWYXJzW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICBpZihwdWJsaWNWYXJzLmhhc093blByb3BlcnR5KHByb3BlcnR5KSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQucHVibGljVmFyc1twcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LnByb3RlY3RlZFZhcnNbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYXBwbHkgPSBmdW5jdGlvbih0YXJnZXQsIHRoaXNBcmcsIGFyZ3VtZW50c0xpc3Qpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJQcm94eSBhcHBseVwiKTtcbiAgICAgICAgICAgIC8vdmFyIGZ1bmMgPSB0YXJnZXRbXVxuICAgICAgICAgICAgLy9zd2FybUdsb2JhbHMuZXhlY3V0aW9uUHJvdmlkZXIuZXhlY3V0ZShudWxsLCB0aGlzQXJnLCBmdW5jLCBhcmd1bWVudHNMaXN0KVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMuaXNFeHRlbnNpYmxlID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5oYXMgPSBmdW5jdGlvbih0YXJnZXQsIHByb3ApIHtcbiAgICAgICAgICAgIGlmKHRhcmdldC5wdWJsaWNWYXJzW3Byb3BdIHx8IHRhcmdldC5wcm90ZWN0ZWRWYXJzW3Byb3BdKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vd25LZXlzID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5vd25LZXlzKHRhcmdldC5wdWJsaWNWYXJzKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24oc2VyaWFsaXNlZFZhbHVlcyl7XG4gICAgICAgICAgICB2YXIgdmFsdWVPYmplY3QgPSBzZWxmLmluaXRpYWxpc2Uoc2VyaWFsaXNlZFZhbHVlcyk7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IFByb3h5KHZhbHVlT2JqZWN0LHNlbGYpO1xuICAgICAgICAgICAgc2VsZi5pbml0aWFsaXNlRnVuY3Rpb25zKHZhbHVlT2JqZWN0LHJlc3VsdCk7XG5cdFx0XHRpZighc2VyaWFsaXNlZFZhbHVlcyl7XG5cdFx0XHRcdGlmKCF2YWx1ZU9iamVjdC5nZXRNZXRhKFwic3dhcm1JZFwiKSl7XG5cdFx0XHRcdFx0dmFsdWVPYmplY3Quc2V0TWV0YShcInN3YXJtSWRcIiwgJCQudWlkR2VuZXJhdG9yLnNhZmVfdXVpZCgpKTsgIC8vZG8gbm90IG92ZXJ3cml0ZSEhIVxuXHRcdFx0XHR9XG5cdFx0XHRcdHZhbHVlT2JqZWN0LnV0aWxpdHlGdW5jdGlvbnMubm90aWZ5KCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgfVxuXG5cblxuICAgIHRoaXMuZGVzY3JpYmUgPSBmdW5jdGlvbiBkZXNjcmliZVN3YXJtKHN3YXJtVHlwZU5hbWUsIGRlc2NyaXB0aW9uKXtcbiAgICAgICAgc3dhcm1UeXBlTmFtZSA9IGdldEZ1bGxOYW1lKHN3YXJtVHlwZU5hbWUpO1xuXG4gICAgICAgIHZhciBwb2ludFBvcyA9IHN3YXJtVHlwZU5hbWUubGFzdEluZGV4T2YoJy4nKTtcbiAgICAgICAgdmFyIHNob3J0TmFtZSA9IHN3YXJtVHlwZU5hbWUuc3Vic3RyKCBwb2ludFBvcysgMSk7XG4gICAgICAgIHZhciBsaWJyYXJ5TmFtZSA9IHN3YXJtVHlwZU5hbWUuc3Vic3RyKDAsIHBvaW50UG9zKTtcbiAgICAgICAgaWYoIWxpYnJhcnlOYW1lKXtcbiAgICAgICAgICAgIGxpYnJhcnlOYW1lID0gXCJnbG9iYWxcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9IG5ldyBTd2FybURlc2NyaXB0aW9uKHN3YXJtVHlwZU5hbWUsIGRlc2NyaXB0aW9uKTtcbiAgICAgICAgaWYoc3dhcm1EZXNjcmlwdGlvbnNSZWdpc3RyeVtzd2FybVR5cGVOYW1lXSAhPSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgJCQuZXJyb3JIYW5kbGVyLndhcm5pbmcoXCJEdXBsaWNhdGUgc3dhcm0gZGVzY3JpcHRpb24gXCIrIHN3YXJtVHlwZU5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9zd2FybURlc2NyaXB0aW9uc1JlZ2lzdHJ5W3N3YXJtVHlwZU5hbWVdID0gZGVzY3JpcHRpb247XG5cdFx0JCQucmVnaXN0ZXJTd2FybURlc2NyaXB0aW9uKGxpYnJhcnlOYW1lLCBzaG9ydE5hbWUsIHN3YXJtVHlwZU5hbWUsIGRlc2NyaXB0aW9uKTtcblxuICAgICAgICByZXR1cm4gZGVzY3JpcHRpb247XG4gICAgfVxuXG4gICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbigpe1xuICAgICAgICAkJC5lcnJvcihcImNyZWF0ZSBmdW5jdGlvbiBpcyBvYnNvbGV0ZS4gdXNlIGRlc2NyaWJlIVwiKTtcbiAgICB9XG4gICAgLyogLy8gY29uZnVzaW5nIHZhcmlhbnRcbiAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZVN3YXJtKHN3YXJtVHlwZU5hbWUsIGRlc2NyaXB0aW9uLCBpbml0aWFsVmFsdWVzKXtcbiAgICAgICAgc3dhcm1UeXBlTmFtZSA9IGdldEZ1bGxOYW1lKHN3YXJtVHlwZU5hbWUpO1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBpZih1bmRlZmluZWQgPT0gZGVzY3JpcHRpb24pe1xuICAgICAgICAgICAgICAgIHJldHVybiBzd2FybURlc2NyaXB0aW9uc1JlZ2lzdHJ5W3N3YXJtVHlwZU5hbWVdKGluaXRpYWxWYWx1ZXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kZXNjcmliZShzd2FybVR5cGVOYW1lLCBkZXNjcmlwdGlvbikoaW5pdGlhbFZhbHVlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2goZXJyKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRlU3dhcm0gZXJyb3JcIiwgZXJyKTtcbiAgICAgICAgICAgICQkLmVycm9ySGFuZGxlci5lcnJvcihlcnIsIGFyZ3VtZW50cywgXCJXcm9uZyBuYW1lIG9yIGRlc2NyaXB0aW9uc1wiKTtcbiAgICAgICAgfVxuICAgIH0qL1xuXG4gICAgdGhpcy5jb250aW51ZSA9IGZ1bmN0aW9uKHN3YXJtVHlwZU5hbWUsIGluaXRpYWxWYWx1ZXMpe1xuICAgICAgICBzd2FybVR5cGVOYW1lID0gZ2V0RnVsbE5hbWUoc3dhcm1UeXBlTmFtZSk7XG4gICAgICAgIHZhciBkZXNjID0gc3dhcm1EZXNjcmlwdGlvbnNSZWdpc3RyeVtzd2FybVR5cGVOYW1lXTtcblxuICAgICAgICBpZihkZXNjKXtcbiAgICAgICAgICAgIHJldHVybiBkZXNjKGluaXRpYWxWYWx1ZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCQuZXJyb3JIYW5kbGVyLnN5bnRheEVycm9yKHN3YXJtVHlwZU5hbWUsaW5pdGlhbFZhbHVlcyxcbiAgICAgICAgICAgICAgICBcIkZhaWxlZCB0byByZXN0YXJ0IGEgc3dhcm0gd2l0aCB0eXBlIFwiICsgc3dhcm1UeXBlTmFtZSArIFwiXFxuIE1heWJlIGRpZmZlcmVudCBzd2FybSBzcGFjZSAodXNlZCBmbG93IGluc3RlYWQgb2Ygc3dhcm0hPylcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnN0YXJ0ID0gZnVuY3Rpb24oc3dhcm1UeXBlTmFtZSwgY3RvciwgLi4ucGFyYW1zKXtcbiAgICAgICAgc3dhcm1UeXBlTmFtZSA9IGdldEZ1bGxOYW1lKHN3YXJtVHlwZU5hbWUpO1xuICAgICAgICB2YXIgZGVzYyA9IHN3YXJtRGVzY3JpcHRpb25zUmVnaXN0cnlbc3dhcm1UeXBlTmFtZV07XG4gICAgICAgIGlmKCFkZXNjKXtcbiAgICAgICAgICAgICQkLmVycm9ySGFuZGxlci5zeW50YXhFcnJvcihudWxsLCBzd2FybVR5cGVOYW1lKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXMgPSBkZXNjKCk7XG4gICAgICAgIHJlcy5zZXRNZXRhZGF0YShcImhvbWVTZWN1cml0eUNvbnRleHRcIiwgJCQuc2VjdXJpdHlDb250ZXh0KTtcblxuICAgICAgICBpZihjdG9yKXtcbiAgICAgICAgICAgIHJlc1tjdG9yXS5hcHBseShyZXMsIHBhcmFtcyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbn1cblxuZXhwb3J0cy5jcmVhdGVTd2FybUVuZ2luZSA9IGZ1bmN0aW9uKHN3YXJtVHlwZSwgdXRpbHMpe1xuICAgIGlmKHR5cGVvZiB1dGlscyA9PSBcInVuZGVmaW5lZFwiKXtcbiAgICAgICAgdXRpbHMgPSByZXF1aXJlKFwiLi9jaG9yZW9ncmFwaGllcy91dGlsaXR5RnVuY3Rpb25zL2NhbGxmbG93XCIpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFN3YXJtU3BhY2Uoc3dhcm1UeXBlLCB1dGlscyk7XG59O1xuIiwiXG5tb2R1bGUuZXhwb3J0cy5pbml0ID0gZnVuY3Rpb24oc2YsIGxvZ2dlcil7XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgaGFuZGxlciBmb3IgZmFpbGVkIGFzc2VydHMuIFRoZSBoYW5kbGVyIGlzIGRvaW5nIGxvZ2dpbmcgYW5kIGlzIHRocm93aW5nIGFuIGVycm9yLlxuICAgICAqIEBwYXJhbSBleHBsYW5hdGlvbiB7U3RyaW5nfSAtIGZhaWxpbmcgcmVhc29uIG1lc3NhZ2UuXG4gICAgICovXG4gICAgc2YuZXhjZXB0aW9ucy5yZWdpc3RlcignYXNzZXJ0RmFpbCcsIGZ1bmN0aW9uKGV4cGxhbmF0aW9uKXtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IFwiQXNzZXJ0IG9yIGludmFyaWFudCBoYXMgZmFpbGVkIFwiICsgKGV4cGxhbmF0aW9uID8gZXhwbGFuYXRpb24gOiBcIlwiKTtcbiAgICAgICAgY29uc3QgZXJyID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICBsb2dnZXIucmVjb3JkQXNzZXJ0KCdbRmFpbF0gJyArIG1lc3NhZ2UsIGVyciwgdHJ1ZSk7XG4gICAgICAgIHRocm93IGVycjtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIGFzc2VydCBmb3IgZXF1YWxpdHkuIElmIGNoZWNrIGZhaWxzLCB0aGUgYXNzZXJ0RmFpbCBpcyBpbnZva2VkLlxuICAgICAqIEBwYXJhbSB2MSB7U3RyaW5nfE51bWJlcnxPYmplY3R9IC0gZmlyc3QgdmFsdWVcbiAgICAgKiBAcGFyYW0gdjEge1N0cmluZ3xOdW1iZXJ8T2JqZWN0fSAtIHNlY29uZCB2YWx1ZVxuICAgICAqIEBwYXJhbSBleHBsYW5hdGlvbiB7U3RyaW5nfSAtIGZhaWxpbmcgcmVhc29uIG1lc3NhZ2UgaW4gY2FzZSB0aGUgYXNzZXJ0IGZhaWxzLlxuICAgICAqL1xuICAgIHNmLmFzc2VydC5hZGRDaGVjaygnZXF1YWwnLCBmdW5jdGlvbih2MSAsIHYyLCBleHBsYW5hdGlvbil7XG4gICAgICAgIGlmKHYxICE9PSB2Mil7XG4gICAgICAgICAgICBpZighZXhwbGFuYXRpb24pe1xuICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uID0gIFwiQXNzZXJ0aW9uIGZhaWxlZDogW1wiICsgdjEgKyBcIiAhPT0gXCIgKyB2MiArIFwiXVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2YuZXhjZXB0aW9ucy5hc3NlcnRGYWlsKGV4cGxhbmF0aW9uKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgYXNzZXJ0IGZvciBpbmVxdWFsaXR5LiBJZiBjaGVjayBmYWlscywgdGhlIGFzc2VydEZhaWwgaXMgaW52b2tlZC5cbiAgICAgKiBAcGFyYW0gdjEge1N0cmluZ3xOdW1iZXJ8T2JqZWN0fSAtIGZpcnN0IHZhbHVlXG4gICAgICogQHBhcmFtIHYxIHtTdHJpbmd8TnVtYmVyfE9iamVjdH0gLSBzZWNvbmQgdmFsdWVcbiAgICAgKiBAcGFyYW0gZXhwbGFuYXRpb24ge1N0cmluZ30gLSBmYWlsaW5nIHJlYXNvbiBtZXNzYWdlIGluIGNhc2UgdGhlIGFzc2VydCBmYWlsc1xuICAgICAqL1xuICAgIHNmLmFzc2VydC5hZGRDaGVjaygnbm90RXF1YWwnLCBmdW5jdGlvbih2MSwgdjIsIGV4cGxhbmF0aW9uKXtcbiAgICAgICAgaWYodjEgPT09IHYyKXtcbiAgICAgICAgICAgIGlmKCFleHBsYW5hdGlvbil7XG4gICAgICAgICAgICAgICAgZXhwbGFuYXRpb24gPSAgXCIgW1wiKyB2MSArIFwiID09IFwiICsgdjIgKyBcIl1cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNmLmV4Y2VwdGlvbnMuYXNzZXJ0RmFpbChleHBsYW5hdGlvbik7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIGFzc2VydCBmb3IgZXZhbHVhdGluZyBhbiBleHByZXNzaW9uIHRvIHRydWUuIElmIGNoZWNrIGZhaWxzLCB0aGUgYXNzZXJ0RmFpbCBpcyBpbnZva2VkLlxuICAgICAqIEBwYXJhbSBiIHtCb29sZWFufSAtIHJlc3VsdCBvZiBhbiBleHByZXNzaW9uXG4gICAgICogQHBhcmFtIGV4cGxhbmF0aW9uIHtTdHJpbmd9IC0gZmFpbGluZyByZWFzb24gbWVzc2FnZSBpbiBjYXNlIHRoZSBhc3NlcnQgZmFpbHNcbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWRkQ2hlY2soJ3RydWUnLCBmdW5jdGlvbihiLCBleHBsYW5hdGlvbil7XG4gICAgICAgIGlmKCFiKXtcbiAgICAgICAgICAgIGlmKCFleHBsYW5hdGlvbil7XG4gICAgICAgICAgICAgICAgZXhwbGFuYXRpb24gPSAgXCIgZXhwcmVzc2lvbiBpcyBmYWxzZSBidXQgaXMgZXhwZWN0ZWQgdG8gYmUgdHJ1ZVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2YuZXhjZXB0aW9ucy5hc3NlcnRGYWlsKGV4cGxhbmF0aW9uKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgYXNzZXJ0IGZvciBldmFsdWF0aW5nIGFuIGV4cHJlc3Npb24gdG8gZmFsc2UuIElmIGNoZWNrIGZhaWxzLCB0aGUgYXNzZXJ0RmFpbCBpcyBpbnZva2VkLlxuICAgICAqIEBwYXJhbSBiIHtCb29sZWFufSAtIHJlc3VsdCBvZiBhbiBleHByZXNzaW9uXG4gICAgICogQHBhcmFtIGV4cGxhbmF0aW9uIHtTdHJpbmd9IC0gZmFpbGluZyByZWFzb24gbWVzc2FnZSBpbiBjYXNlIHRoZSBhc3NlcnQgZmFpbHNcbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWRkQ2hlY2soJ2ZhbHNlJywgZnVuY3Rpb24oYiwgZXhwbGFuYXRpb24pe1xuICAgICAgICBpZihiKXtcbiAgICAgICAgICAgIGlmKCFleHBsYW5hdGlvbil7XG4gICAgICAgICAgICAgICAgZXhwbGFuYXRpb24gPSAgXCIgZXhwcmVzc2lvbiBpcyB0cnVlIGJ1dCBpcyBleHBlY3RlZCB0byBiZSBmYWxzZVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2YuZXhjZXB0aW9ucy5hc3NlcnRGYWlsKGV4cGxhbmF0aW9uKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgYXNzZXJ0IGZvciBldmFsdWF0aW5nIGEgdmFsdWUgdG8gbnVsbC4gSWYgY2hlY2sgZmFpbHMsIHRoZSBhc3NlcnRGYWlsIGlzIGludm9rZWQuXG4gICAgICogQHBhcmFtIGIge0Jvb2xlYW59IC0gcmVzdWx0IG9mIGFuIGV4cHJlc3Npb25cbiAgICAgKiBAcGFyYW0gZXhwbGFuYXRpb24ge1N0cmluZ30gLSBmYWlsaW5nIHJlYXNvbiBtZXNzYWdlIGluIGNhc2UgdGhlIGFzc2VydCBmYWlsc1xuICAgICAqL1xuICAgIHNmLmFzc2VydC5hZGRDaGVjaygnaXNOdWxsJywgZnVuY3Rpb24odjEsIGV4cGxhbmF0aW9uKXtcbiAgICAgICAgaWYodjEgIT09IG51bGwpe1xuICAgICAgICAgICAgc2YuZXhjZXB0aW9ucy5hc3NlcnRGYWlsKGV4cGxhbmF0aW9uKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgYXNzZXJ0IGZvciBldmFsdWF0aW5nIGEgdmFsdWUgdG8gYmUgbm90IG51bGwuIElmIGNoZWNrIGZhaWxzLCB0aGUgYXNzZXJ0RmFpbCBpcyBpbnZva2VkLlxuICAgICAqIEBwYXJhbSBiIHtCb29sZWFufSAtIHJlc3VsdCBvZiBhbiBleHByZXNzaW9uXG4gICAgICogQHBhcmFtIGV4cGxhbmF0aW9uIHtTdHJpbmd9IC0gZmFpbGluZyByZWFzb24gbWVzc2FnZSBpbiBjYXNlIHRoZSBhc3NlcnQgZmFpbHNcbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWRkQ2hlY2soJ25vdE51bGwnLCBmdW5jdGlvbih2MSAsIGV4cGxhbmF0aW9uKXtcbiAgICAgICAgaWYodjEgPT09IG51bGwgJiYgdHlwZW9mIHYxID09PSBcIm9iamVjdFwiKXtcbiAgICAgICAgICAgIHNmLmV4Y2VwdGlvbnMuYXNzZXJ0RmFpbChleHBsYW5hdGlvbik7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBhbGwgcHJvcGVydGllcyBvZiB0aGUgc2Vjb25kIG9iamVjdCBhcmUgb3duIHByb3BlcnRpZXMgb2YgdGhlIGZpcnN0IG9iamVjdC5cbiAgICAgKiBAcGFyYW0gZmlyc3RPYmoge09iamVjdH0gLSBmaXJzdCBvYmplY3RcbiAgICAgKiBAcGFyYW0gc2Vjb25kT2Jqe09iamVjdH0gLSBzZWNvbmQgb2JqZWN0XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gcmV0dXJucyB0cnVlLCBpZiB0aGUgY2hlY2sgaGFzIHBhc3NlZCBvciBmYWxzZSBvdGhlcndpc2UuXG4gICAgICovXG4gICAgZnVuY3Rpb24gb2JqZWN0SGFzRmllbGRzKGZpcnN0T2JqLCBzZWNvbmRPYmope1xuICAgICAgICBmb3IobGV0IGZpZWxkIGluIHNlY29uZE9iaikge1xuICAgICAgICAgICAgaWYgKGZpcnN0T2JqLmhhc093blByb3BlcnR5KGZpZWxkKSkge1xuICAgICAgICAgICAgICAgIGlmIChmaXJzdE9ialtmaWVsZF0gIT09IHNlY29uZE9ialtmaWVsZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9iamVjdHNBcmVFcXVhbChmaXJzdE9iaiwgc2Vjb25kT2JqKSB7XG4gICAgICAgIGxldCBhcmVFcXVhbCA9IHRydWU7XG4gICAgICAgIGlmKGZpcnN0T2JqICE9PSBzZWNvbmRPYmopIHtcbiAgICAgICAgICAgIGlmKHR5cGVvZiBmaXJzdE9iaiAhPT0gdHlwZW9mIHNlY29uZE9iaikge1xuICAgICAgICAgICAgICAgIGFyZUVxdWFsID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZmlyc3RPYmopICYmIEFycmF5LmlzQXJyYXkoc2Vjb25kT2JqKSkge1xuXHQgICAgICAgICAgICBmaXJzdE9iai5zb3J0KCk7XG5cdCAgICAgICAgICAgIHNlY29uZE9iai5zb3J0KCk7XG5cdFx0ICAgICAgICBpZiAoZmlyc3RPYmoubGVuZ3RoICE9PSBzZWNvbmRPYmoubGVuZ3RoKSB7XG5cdFx0XHQgICAgICAgIGFyZUVxdWFsID0gZmFsc2U7XG5cdFx0ICAgICAgICB9IGVsc2Uge1xuXHRcdFx0ICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZpcnN0T2JqLmxlbmd0aDsgKytpKSB7XG5cdFx0XHRcdCAgICAgICAgaWYgKCFvYmplY3RzQXJlRXF1YWwoZmlyc3RPYmpbaV0sIHNlY29uZE9ialtpXSkpIHtcblx0XHRcdFx0XHQgICAgICAgIGFyZUVxdWFsID0gZmFsc2U7XG5cdFx0XHRcdFx0ICAgICAgICBicmVhaztcblx0XHRcdFx0ICAgICAgICB9XG5cdFx0XHQgICAgICAgIH1cblx0XHQgICAgICAgIH1cblx0ICAgICAgICB9IGVsc2UgaWYoKHR5cGVvZiBmaXJzdE9iaiA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2Ygc2Vjb25kT2JqID09PSAnZnVuY3Rpb24nKSB8fFxuXHRcdCAgICAgICAgKGZpcnN0T2JqIGluc3RhbmNlb2YgRGF0ZSAmJiBzZWNvbmRPYmogaW5zdGFuY2VvZiBEYXRlKSB8fFxuXHRcdCAgICAgICAgKGZpcnN0T2JqIGluc3RhbmNlb2YgUmVnRXhwICYmIHNlY29uZE9iaiBpbnN0YW5jZW9mIFJlZ0V4cCkgfHxcblx0XHQgICAgICAgIChmaXJzdE9iaiBpbnN0YW5jZW9mIFN0cmluZyAmJiBzZWNvbmRPYmogaW5zdGFuY2VvZiBTdHJpbmcpIHx8XG5cdFx0ICAgICAgICAoZmlyc3RPYmogaW5zdGFuY2VvZiBOdW1iZXIgJiYgc2Vjb25kT2JqIGluc3RhbmNlb2YgTnVtYmVyKSkge1xuICAgICAgICAgICAgICAgICAgICBhcmVFcXVhbCA9IGZpcnN0T2JqLnRvU3RyaW5nKCkgPT09IHNlY29uZE9iai50b1N0cmluZygpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKHR5cGVvZiBmaXJzdE9iaiA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHNlY29uZE9iaiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBhcmVFcXVhbCA9IG9iamVjdEhhc0ZpZWxkcyhmaXJzdE9iaiwgc2Vjb25kT2JqKTtcbiAgICAgICAgICAgIC8vIGlzTmFOKHVuZGVmaW5lZCkgcmV0dXJucyB0cnVlXG4gICAgICAgICAgICB9IGVsc2UgaWYoaXNOYU4oZmlyc3RPYmopICYmIGlzTmFOKHNlY29uZE9iaikgJiYgdHlwZW9mIGZpcnN0T2JqID09PSAnbnVtYmVyJyAmJiB0eXBlb2Ygc2Vjb25kT2JqID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIGFyZUVxdWFsID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXJlRXF1YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhcmVFcXVhbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmluZyBhc3NlcnQgZm9yIGV2YWx1YXRpbmcgaWYgYWxsIHByb3BlcnRpZXMgb2YgdGhlIHNlY29uZCBvYmplY3QgYXJlIG93biBwcm9wZXJ0aWVzIG9mIHRoZSBmaXJzdCBvYmplY3QuXG4gICAgICogSWYgY2hlY2sgZmFpbHMsIHRoZSBhc3NlcnRGYWlsIGlzIGludm9rZWQuXG4gICAgICogQHBhcmFtIGZpcnN0T2JqIHtPYmplY3R9IC0gZmlyc3Qgb2JqZWN0XG4gICAgICogQHBhcmFtIHNlY29uZE9iantPYmplY3R9IC0gc2Vjb25kIG9iamVjdFxuICAgICAqIEBwYXJhbSBleHBsYW5hdGlvbiB7U3RyaW5nfSAtIGZhaWxpbmcgcmVhc29uIG1lc3NhZ2UgaW4gY2FzZSB0aGUgYXNzZXJ0IGZhaWxzXG4gICAgICovXG4gICAgc2YuYXNzZXJ0LmFkZENoZWNrKFwib2JqZWN0SGFzRmllbGRzXCIsIGZ1bmN0aW9uKGZpcnN0T2JqLCBzZWNvbmRPYmosIGV4cGxhbmF0aW9uKXtcbiAgICAgICAgaWYoIW9iamVjdEhhc0ZpZWxkcyhmaXJzdE9iaiwgc2Vjb25kT2JqKSkge1xuICAgICAgICAgICAgc2YuZXhjZXB0aW9ucy5hc3NlcnRGYWlsKGV4cGxhbmF0aW9uKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgYXNzZXJ0IGZvciBldmFsdWF0aW5nIGlmIGFsbCBlbGVtZW50IGZyb20gdGhlIHNlY29uZCBhcnJheSBhcmUgcHJlc2VudCBpbiB0aGUgZmlyc3QgYXJyYXkuXG4gICAgICogRGVlcCBjb21wYXJpc29uIGJldHdlZW4gdGhlIGVsZW1lbnRzIG9mIHRoZSBhcnJheSBpcyB1c2VkLlxuICAgICAqIElmIGNoZWNrIGZhaWxzLCB0aGUgYXNzZXJ0RmFpbCBpcyBpbnZva2VkLlxuICAgICAqIEBwYXJhbSBmaXJzdEFycmF5IHtBcnJheX0tIGZpcnN0IGFycmF5XG4gICAgICogQHBhcmFtIHNlY29uZEFycmF5IHtBcnJheX0gLSBzZWNvbmQgYXJyYXlcbiAgICAgKiBAcGFyYW0gZXhwbGFuYXRpb24ge1N0cmluZ30gLSBmYWlsaW5nIHJlYXNvbiBtZXNzYWdlIGluIGNhc2UgdGhlIGFzc2VydCBmYWlsc1xuICAgICAqL1xuICAgIHNmLmFzc2VydC5hZGRDaGVjayhcImFycmF5c01hdGNoXCIsIGZ1bmN0aW9uKGZpcnN0QXJyYXksIHNlY29uZEFycmF5LCBleHBsYW5hdGlvbil7XG4gICAgICAgIGlmKGZpcnN0QXJyYXkubGVuZ3RoICE9PSBzZWNvbmRBcnJheS5sZW5ndGgpe1xuICAgICAgICAgICAgc2YuZXhjZXB0aW9ucy5hc3NlcnRGYWlsKGV4cGxhbmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG9iamVjdHNBcmVFcXVhbChmaXJzdEFycmF5LCBzZWNvbmRBcnJheSk7XG4gICAgICAgICAgICAvLyBjb25zdCBhcnJheXNEb250TWF0Y2ggPSBzZWNvbmRBcnJheS5ldmVyeShlbGVtZW50ID0+IGZpcnN0QXJyYXkuaW5kZXhPZihlbGVtZW50KSAhPT0gLTEpO1xuICAgICAgICAgICAgLy8gbGV0IGFycmF5c0RvbnRNYXRjaCA9IHNlY29uZEFycmF5LnNvbWUoZnVuY3Rpb24gKGV4cGVjdGVkRWxlbWVudCkge1xuICAgICAgICAgICAgLy8gICAgIGxldCBmb3VuZCA9IGZpcnN0QXJyYXkuc29tZShmdW5jdGlvbihyZXN1bHRFbGVtZW50KXtcbiAgICAgICAgICAgIC8vICAgICAgICAgcmV0dXJuIG9iamVjdEhhc0ZpZWxkcyhyZXN1bHRFbGVtZW50LGV4cGVjdGVkRWxlbWVudCk7XG4gICAgICAgICAgICAvLyAgICAgfSk7XG4gICAgICAgICAgICAvLyAgICAgcmV0dXJuIGZvdW5kID09PSBmYWxzZTtcbiAgICAgICAgICAgIC8vIH0pO1xuXG4gICAgICAgICAgICBpZighcmVzdWx0KXtcbiAgICAgICAgICAgICAgICBzZi5leGNlcHRpb25zLmFzc2VydEZhaWwoZXhwbGFuYXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBhZGRlZCBtYWlubHkgZm9yIHRlc3QgcHVycG9zZXMsIGJldHRlciB0ZXN0IGZyYW1ld29ya3MgbGlrZSBtb2NoYSBjb3VsZCBiZSBtdWNoIGJldHRlclxuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgYXNzZXJ0IGZvciBjaGVja2luZyBpZiBhIGZ1bmN0aW9uIGlzIGZhaWxpbmcuXG4gICAgICogSWYgdGhlIGZ1bmN0aW9uIGlzIHRocm93aW5nIGFuIGV4Y2VwdGlvbiwgdGhlIHRlc3QgaXMgcGFzc2VkIG9yIGZhaWxlZCBvdGhlcndpc2UuXG4gICAgICogQHBhcmFtIHRlc3ROYW1lIHtTdHJpbmd9IC0gdGVzdCBuYW1lIG9yIGRlc2NyaXB0aW9uXG4gICAgICogQHBhcmFtIGZ1bmMge0Z1bmN0aW9ufSAtIGZ1bmN0aW9uIHRvIGJlIGludm9rZWRcbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWRkQ2hlY2soJ2ZhaWwnLCBmdW5jdGlvbih0ZXN0TmFtZSwgZnVuYyl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGZ1bmMoKTtcbiAgICAgICAgICAgIGxvZ2dlci5yZWNvcmRBc3NlcnQoXCJbRmFpbF0gXCIgKyB0ZXN0TmFtZSk7XG4gICAgICAgIH0gY2F0Y2goZXJyKXtcbiAgICAgICAgICAgIGxvZ2dlci5yZWNvcmRBc3NlcnQoXCJbUGFzc10gXCIgKyB0ZXN0TmFtZSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIGFzc2VydCBmb3IgY2hlY2tpbmcgaWYgYSBmdW5jdGlvbiBpcyBleGVjdXRlZCB3aXRoIG5vIGV4Y2VwdGlvbnMuXG4gICAgICogSWYgdGhlIGZ1bmN0aW9uIGlzIG5vdCB0aHJvd2luZyBhbnkgZXhjZXB0aW9uLCB0aGUgdGVzdCBpcyBwYXNzZWQgb3IgZmFpbGVkIG90aGVyd2lzZS5cbiAgICAgKiBAcGFyYW0gdGVzdE5hbWUge1N0cmluZ30gLSB0ZXN0IG5hbWUgb3IgZGVzY3JpcHRpb25cbiAgICAgKiBAcGFyYW0gZnVuYyB7RnVuY3Rpb259IC0gZnVuY3Rpb24gdG8gYmUgaW52b2tlZFxuICAgICAqL1xuICAgIHNmLmFzc2VydC5hZGRDaGVjaygncGFzcycsIGZ1bmN0aW9uKHRlc3ROYW1lLCBmdW5jKXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgZnVuYygpO1xuICAgICAgICAgICAgbG9nZ2VyLnJlY29yZEFzc2VydChcIltQYXNzXSBcIiArIHRlc3ROYW1lKTtcbiAgICAgICAgfSBjYXRjaChlcnIpe1xuICAgICAgICAgICAgbG9nZ2VyLnJlY29yZEFzc2VydChcIltGYWlsXSBcIiArIHRlc3ROYW1lLCBlcnIuc3RhY2spO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBBbGlhcyBmb3IgdGhlIHBhc3MgYXNzZXJ0LlxuICAgICAqL1xuICAgIHNmLmFzc2VydC5hbGlhcygndGVzdCcsICdwYXNzJyk7XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmluZyBhc3NlcnQgZm9yIGNoZWNraW5nIGlmIGEgY2FsbGJhY2sgZnVuY3Rpb24gaXMgZXhlY3V0ZWQgYmVmb3JlIHRpbWVvdXQgaXMgcmVhY2hlZCB3aXRob3V0IGFueSBleGNlcHRpb25zLlxuICAgICAqIElmIHRoZSBmdW5jdGlvbiBpcyB0aHJvd2luZyBhbnkgZXhjZXB0aW9uIG9yIHRoZSB0aW1lb3V0IGlzIHJlYWNoZWQsIHRoZSB0ZXN0IGlzIGZhaWxlZCBvciBwYXNzZWQgb3RoZXJ3aXNlLlxuICAgICAqIEBwYXJhbSB0ZXN0TmFtZSB7U3RyaW5nfSAtIHRlc3QgbmFtZSBvciBkZXNjcmlwdGlvblxuICAgICAqIEBwYXJhbSBmdW5jIHtGdW5jdGlvbn0gLSBmdW5jdGlvbiB0byBiZSBpbnZva2VkXG4gICAgICogQHBhcmFtIHRpbWVvdXQge051bWJlcn0gLSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGZvciB0aGUgdGltZW91dCBjaGVjay4gRGVmYXVsdCB0byA1MDBtcy5cbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWRkQ2hlY2soJ2NhbGxiYWNrJywgZnVuY3Rpb24odGVzdE5hbWUsIGZ1bmMsIHRpbWVvdXQpe1xuXG4gICAgICAgIGlmKCFmdW5jIHx8IHR5cGVvZiBmdW5jICE9IFwiZnVuY3Rpb25cIil7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJXcm9uZyB1c2FnZSBvZiBhc3NlcnQuY2FsbGJhY2shXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoIXRpbWVvdXQpe1xuICAgICAgICAgICAgdGltZW91dCA9IDUwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgZnVuY3Rpb24gY2FsbGJhY2soKXtcbiAgICAgICAgICAgIGlmKCFwYXNzZWQpe1xuICAgICAgICAgICAgICAgIHBhc3NlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnJlY29yZEFzc2VydChcIltQYXNzXSBcIiArIHRlc3ROYW1lKTtcbiAgICAgICAgICAgICAgICBzdWNjZXNzVGVzdCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIucmVjb3JkQXNzZXJ0KFwiW0ZhaWwgKG11bHRpcGxlIGNhbGxzKV0gXCIgKyB0ZXN0TmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGZ1bmMoY2FsbGJhY2spO1xuICAgICAgICB9IGNhdGNoKGVycil7XG4gICAgICAgICAgICBsb2dnZXIucmVjb3JkQXNzZXJ0KFwiW0ZhaWxdIFwiICsgdGVzdE5hbWUsICBlcnIsIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc3VjY2Vzc1Rlc3QoZm9yY2Upe1xuICAgICAgICAgICAgaWYoIXBhc3NlZCl7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnJlY29yZEFzc2VydChcIltGYWlsIFRpbWVvdXRdIFwiICsgdGVzdE5hbWUgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHNldFRpbWVvdXQoc3VjY2Vzc1Rlc3QsIHRpbWVvdXQpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgYXNzZXJ0IGZvciBjaGVja2luZyBpZiBhbiBhcnJheSBvZiBjYWxsYmFjayBmdW5jdGlvbnMgYXJlIGV4ZWN1dGVkIGluIGEgd2F0ZXJmYWxsIG1hbm5lcixcbiAgICAgKiBiZWZvcmUgdGltZW91dCBpcyByZWFjaGVkIHdpdGhvdXQgYW55IGV4Y2VwdGlvbnMuXG4gICAgICogSWYgYW55IG9mIHRoZSBmdW5jdGlvbnMgaXMgdGhyb3dpbmcgYW55IGV4Y2VwdGlvbiBvciB0aGUgdGltZW91dCBpcyByZWFjaGVkLCB0aGUgdGVzdCBpcyBmYWlsZWQgb3IgcGFzc2VkIG90aGVyd2lzZS5cbiAgICAgKiBAcGFyYW0gdGVzdE5hbWUge1N0cmluZ30gLSB0ZXN0IG5hbWUgb3IgZGVzY3JpcHRpb25cbiAgICAgKiBAcGFyYW0gZnVuYyB7RnVuY3Rpb259IC0gZnVuY3Rpb24gdG8gYmUgaW52b2tlZFxuICAgICAqIEBwYXJhbSB0aW1lb3V0IHtOdW1iZXJ9IC0gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBmb3IgdGhlIHRpbWVvdXQgY2hlY2suIERlZmF1bHQgdG8gNTAwbXMuXG4gICAgICovXG4gICAgc2YuYXNzZXJ0LmFkZENoZWNrKCdzdGVwcycsIGZ1bmN0aW9uKHRlc3ROYW1lLCBhcnIsIHRpbWVvdXQpe1xuICAgICAgICBpZighdGltZW91dCl7XG4gICAgICAgICAgICB0aW1lb3V0ID0gNTAwO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGN1cnJlbnRTdGVwID0gMDtcbiAgICAgICAgdmFyIHBhc3NlZCA9IGZhbHNlO1xuXG4gICAgICAgIGZ1bmN0aW9uIG5leHQoKXtcbiAgICAgICAgICAgIGlmKGN1cnJlbnRTdGVwID09PSBhcnIubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICBwYXNzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5yZWNvcmRBc3NlcnQoXCJbUGFzc10gXCIgKyB0ZXN0TmFtZSApO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGZ1bmMgPSBhcnJbY3VycmVudFN0ZXBdO1xuICAgICAgICAgICAgY3VycmVudFN0ZXArKztcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBmdW5jKG5leHQpO1xuICAgICAgICAgICAgfSBjYXRjaChlcnIpe1xuICAgICAgICAgICAgICAgIGxvZ2dlci5yZWNvcmRBc3NlcnQoXCJbRmFpbF0gXCIgKyB0ZXN0TmFtZSAgKyBcIiBbYXQgc3RlcCBcIiArIGN1cnJlbnRTdGVwICsgXCJdXCIsIGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzdWNjZXNzVGVzdChmb3JjZSl7XG4gICAgICAgICAgICBpZighcGFzc2VkKXtcbiAgICAgICAgICAgICAgICBsb2dnZXIucmVjb3JkQXNzZXJ0KFwiW0ZhaWwgVGltZW91dF0gXCIgKyB0ZXN0TmFtZSAgKyBcIiBbYXQgc3RlcCBcIiArIGN1cnJlbnRTdGVwICsgXCJdXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc2V0VGltZW91dChzdWNjZXNzVGVzdCwgdGltZW91dCk7XG4gICAgICAgIG5leHQoKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEFsaWFzIGZvciB0aGUgc3RlcHMgYXNzZXJ0LlxuICAgICAqL1xuICAgIHNmLmFzc2VydC5hbGlhcygnd2F0ZXJmYWxsJywgJ3N0ZXBzJyk7XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmluZyBhc3NlcnQgZm9yIGFzeW5jaHJvbm91c2x5IHByaW50aW5nIGFsbCBleGVjdXRpb24gc3VtbWFyeSBmcm9tIGxvZ2dlci5kdW1wV2h5cy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSB7U3RyaW5nfSAtIG1lc3NhZ2UgdG8gYmUgcmVjb3JkZWRcbiAgICAgKiBAcGFyYW0gdGltZW91dCB7TnVtYmVyfSAtIG51bWJlciBvZiBtaWxsaXNlY29uZHMgZm9yIHRoZSB0aW1lb3V0IGNoZWNrLiBEZWZhdWx0IHRvIDUwMG1zLlxuICAgICAqL1xuICAgIHNmLmFzc2VydC5hZGRDaGVjaygnZW5kJywgZnVuY3Rpb24odGltZW91dCwgc2lsZW5jZSl7XG4gICAgICAgIGlmKCF0aW1lb3V0KXtcbiAgICAgICAgICAgIHRpbWVvdXQgPSAxMDAwO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlcigpIHtcbiAgICAgICAgICAgIGxvZ2dlci5kdW1wV2h5cygpLmZvckVhY2goZnVuY3Rpb24oYyl7XG4gICAgICAgICAgICAgICAgY29uc3QgZXhlY3V0aW9uU3VtbWFyeSA9IGMuZ2V0RXhlY3V0aW9uU3VtbWFyeSgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGV4ZWN1dGlvblN1bW1hcnksIG51bGwsIDQpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZighc2lsZW5jZSl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJGb3JjaW5nIGV4aXQgYWZ0ZXJcIiwgdGltZW91dCwgXCJtc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNldFRpbWVvdXQoaGFuZGxlciwgdGltZW91dCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmluZyBhc3NlcnQgZm9yIHByaW50aW5nIGEgbWVzc2FnZSBhbmQgYXN5bmNocm9ub3VzbHkgcHJpbnRpbmcgYWxsIGxvZ3MgZnJvbSBsb2dnZXIuZHVtcFdoeXMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2Uge1N0cmluZ30gLSBtZXNzYWdlIHRvIGJlIHJlY29yZGVkXG4gICAgICogQHBhcmFtIHRpbWVvdXQge051bWJlcn0gLSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGZvciB0aGUgdGltZW91dCBjaGVjay4gRGVmYXVsdCB0byA1MDBtcy5cbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWRkQ2hlY2soJ2JlZ2luJywgZnVuY3Rpb24obWVzc2FnZSwgdGltZW91dCl7XG4gICAgICAgIGxvZ2dlci5yZWNvcmRBc3NlcnQobWVzc2FnZSk7XG4gICAgICAgIHNmLmFzc2VydC5lbmQodGltZW91dCwgdHJ1ZSk7XG4gICAgfSk7XG59OyIsIi8qXG4gICAgY2hlY2tzIGFyZSBsaWtlIGFzc2VydHMgYnV0IGFyZSBpbnRlbmRlZCB0byBiZSB1c2VkIGluIHByb2R1Y3Rpb24gY29kZSB0byBoZWxwIGRlYnVnZ2luZyBhbmQgc2lnbmFsaW5nIHdyb25nIGJlaGF2aW91cnNcblxuICovXG5cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uKHNmKXtcbiAgICBzZi5leGNlcHRpb25zLnJlZ2lzdGVyKCdjaGVja0ZhaWwnLCBmdW5jdGlvbihleHBsYW5hdGlvbiwgZXJyKXtcbiAgICAgICAgdmFyIHN0YWNrO1xuICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICAgc3RhY2sgPSBlcnIuc3RhY2s7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coXCJDaGVjayBmYWlsZWQgXCIsIGV4cGxhbmF0aW9uLCBzdGFjayk7XG4gICAgfSk7XG5cbiAgICBzZi5jaGVjay5hZGRDaGVjaygnZXF1YWwnLCBmdW5jdGlvbih2MSAsIHYyLCBleHBsYW5hdGlvbil7XG5cbiAgICAgICAgaWYodjEgIT09IHYyKXtcbiAgICAgICAgICAgIGlmKCFleHBsYW5hdGlvbil7XG4gICAgICAgICAgICAgICAgZXhwbGFuYXRpb24gPSAgXCIgW1wiKyB2MSArIFwiICE9IFwiICsgdjIgKyBcIl1cIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2YuZXhjZXB0aW9ucy5jaGVja0ZhaWwoZXhwbGFuYXRpb24pO1xuICAgICAgICB9XG4gICAgfSk7XG5cblxuICAgIHNmLmNoZWNrLmFkZENoZWNrKCd0cnVlJywgZnVuY3Rpb24oYiwgZXhwbGFuYXRpb24pe1xuICAgICAgICBpZighYil7XG4gICAgICAgICAgICBpZighZXhwbGFuYXRpb24pe1xuICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uID0gIFwiIGV4cHJlc3Npb24gaXMgZmFsc2UgYnV0IGlzIGV4cGVjdGVkIHRvIGJlIHRydWVcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2YuZXhjZXB0aW9ucy5jaGVja0ZhaWwoZXhwbGFuYXRpb24pO1xuICAgICAgICB9XG4gICAgfSk7XG5cblxuICAgIHNmLmNoZWNrLmFkZENoZWNrKCdmYWxzZScsIGZ1bmN0aW9uKGIsIGV4cGxhbmF0aW9uKXtcbiAgICAgICAgaWYoYil7XG4gICAgICAgICAgICBpZighZXhwbGFuYXRpb24pe1xuICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uID0gIFwiIGV4cHJlc3Npb24gaXMgdHJ1ZSBidXQgaXMgZXhwZWN0ZWQgdG8gYmUgZmFsc2VcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2YuZXhjZXB0aW9ucy5jaGVja0ZhaWwoZXhwbGFuYXRpb24pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBzZi5jaGVjay5hZGRDaGVjaygnbm90ZXF1YWwnLCBmdW5jdGlvbih2MSAsIHYyLCBleHBsYW5hdGlvbil7XG4gICAgICAgIGlmKHYxID09IHYyKXtcbiAgICAgICAgICAgIGlmKCFleHBsYW5hdGlvbil7XG4gICAgICAgICAgICAgICAgZXhwbGFuYXRpb24gPSAgXCIgW1wiKyB2MSArIFwiID09IFwiICsgdjIgKyBcIl1cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNmLmV4Y2VwdGlvbnMuY2hlY2tGYWlsKGV4cGxhbmF0aW9uKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAvKlxuICAgICAgICBhZGRlZCBtYWlubHkgZm9yIHRlc3QgcHVycG9zZXMsIGJldHRlciB0ZXN0IGZyYW1ld29ya3MgbGlrZSBtb2NoYSBjb3VsZCBiZSBtdWNoIGJldHRlciA6KVxuICAgICovXG4gICAgc2YuY2hlY2suYWRkQ2hlY2soJ2ZhaWwnLCBmdW5jdGlvbih0ZXN0TmFtZSAsZnVuYyl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGZ1bmMoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0ZhaWxdIFwiICsgdGVzdE5hbWUgKTtcbiAgICAgICAgfSBjYXRjaChlcnIpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJbUGFzc10gXCIgKyB0ZXN0TmFtZSApO1xuICAgICAgICB9XG4gICAgfSk7XG5cblxuICAgIHNmLmNoZWNrLmFkZENoZWNrKCdwYXNzJywgZnVuY3Rpb24odGVzdE5hbWUgLGZ1bmMpe1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBmdW5jKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIltQYXNzXSBcIiArIHRlc3ROYW1lICk7XG4gICAgICAgIH0gY2F0Y2goZXJyKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0ZhaWxdIFwiICsgdGVzdE5hbWUgICwgIGVyci5zdGFjayk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgc2YuY2hlY2suYWxpYXMoJ3Rlc3QnLCdwYXNzJyk7XG5cblxuICAgIHNmLmNoZWNrLmFkZENoZWNrKCdjYWxsYmFjaycsIGZ1bmN0aW9uKHRlc3ROYW1lICxmdW5jLCB0aW1lb3V0KXtcbiAgICAgICAgaWYoIXRpbWVvdXQpe1xuICAgICAgICAgICAgdGltZW91dCA9IDUwMDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGFzc2VkID0gZmFsc2U7XG4gICAgICAgIGZ1bmN0aW9uIGNhbGxiYWNrKCl7XG4gICAgICAgICAgICBpZighcGFzc2VkKXtcbiAgICAgICAgICAgICAgICBwYXNzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW1Bhc3NdIFwiICsgdGVzdE5hbWUgKTtcbiAgICAgICAgICAgICAgICBTdWNjZXNzVGVzdCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltGYWlsIChtdWx0aXBsZSBjYWxscyldIFwiICsgdGVzdE5hbWUgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBmdW5jKGNhbGxiYWNrKTtcbiAgICAgICAgfSBjYXRjaChlcnIpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJbRmFpbF0gXCIgKyB0ZXN0TmFtZSAgLCAgZXJyLnN0YWNrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIFN1Y2Nlc3NUZXN0KGZvcmNlKXtcbiAgICAgICAgICAgIGlmKCFwYXNzZWQpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0ZhaWwgVGltZW91dF0gXCIgKyB0ZXN0TmFtZSApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc2V0VGltZW91dChTdWNjZXNzVGVzdCwgdGltZW91dCk7XG4gICAgfSk7XG5cblxuICAgIHNmLmNoZWNrLmFkZENoZWNrKCdzdGVwcycsIGZ1bmN0aW9uKHRlc3ROYW1lICwgYXJyLCB0aW1lb3V0KXtcbiAgICAgICAgdmFyICBjdXJyZW50U3RlcCA9IDA7XG4gICAgICAgIHZhciBwYXNzZWQgPSBmYWxzZTtcbiAgICAgICAgaWYoIXRpbWVvdXQpe1xuICAgICAgICAgICAgdGltZW91dCA9IDUwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG5leHQoKXtcbiAgICAgICAgICAgIGlmKGN1cnJlbnRTdGVwID09PSBhcnIubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICBwYXNzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW1Bhc3NdIFwiICsgdGVzdE5hbWUgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGZ1bmMgPSBhcnJbY3VycmVudFN0ZXBdO1xuICAgICAgICAgICAgY3VycmVudFN0ZXArKztcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBmdW5jKG5leHQpO1xuICAgICAgICAgICAgfSBjYXRjaChlcnIpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0ZhaWxdIFwiICsgdGVzdE5hbWUgICxcIlxcblxcdFwiICwgZXJyLnN0YWNrICsgXCJcXG5cXHRcIiAsIFwiIFthdCBzdGVwIFwiLCBjdXJyZW50U3RlcCArIFwiXVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIFN1Y2Nlc3NUZXN0KGZvcmNlKXtcbiAgICAgICAgICAgIGlmKCFwYXNzZWQpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0ZhaWwgVGltZW91dF0gXCIgKyB0ZXN0TmFtZSArIFwiXFxuXFx0XCIgLCBcIiBbYXQgc3RlcCBcIiwgY3VycmVudFN0ZXArIFwiXVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHNldFRpbWVvdXQoU3VjY2Vzc1Rlc3QsIHRpbWVvdXQpO1xuICAgICAgICBuZXh0KCk7XG4gICAgfSk7XG5cbiAgICBzZi5jaGVjay5hbGlhcygnd2F0ZXJmYWxsJywnc3RlcHMnKTtcbiAgICBzZi5jaGVjay5hbGlhcygnbm90RXF1YWwnLCdub3RlcXVhbCcpO1xuXG4gICAgc2YuY2hlY2suYWRkQ2hlY2soJ2VuZCcsIGZ1bmN0aW9uKHRpbWVPdXQsIHNpbGVuY2Upe1xuICAgICAgICBpZighdGltZU91dCl7XG4gICAgICAgICAgICB0aW1lT3V0ID0gMTAwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmKCFzaWxlbmNlKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkZvcmNpbmcgZXhpdCBhZnRlclwiLCB0aW1lT3V0LCBcIm1zXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDApO1xuICAgICAgICB9LCB0aW1lT3V0KTtcbiAgICB9KTtcblxuXG4gICAgc2YuY2hlY2suYWRkQ2hlY2soJ2JlZ2luJywgZnVuY3Rpb24obWVzc2FnZSwgdGltZU91dCl7XG4gICAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuICAgICAgICBzZi5jaGVjay5lbmQodGltZU91dCwgdHJ1ZSk7XG4gICAgfSk7XG5cblxufTsiLCJleHBvcnRzLmluaXQgPSBmdW5jdGlvbihzZil7XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgdW5rbm93biBleGNlcHRpb24gaGFuZGxlci5cbiAgICAgKi9cbiAgICBzZi5leGNlcHRpb25zLnJlZ2lzdGVyKCd1bmtub3duJywgZnVuY3Rpb24oZXhwbGFuYXRpb24pe1xuICAgICAgICBleHBsYW5hdGlvbiA9IGV4cGxhbmF0aW9uIHx8IFwiXCI7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBcIlVua25vd24gZXhjZXB0aW9uXCIgKyBleHBsYW5hdGlvbjtcbiAgICAgICAgdGhyb3cobWVzc2FnZSk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmluZyByZXNlbmQgZXhjZXB0aW9uIGhhbmRsZXIuXG4gICAgICovXG4gICAgc2YuZXhjZXB0aW9ucy5yZWdpc3RlcigncmVzZW5kJywgZnVuY3Rpb24oZXhjZXB0aW9ucyl7XG4gICAgICAgIHRocm93KGV4Y2VwdGlvbnMpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgbm90SW1wbGVtZW50ZWQgZXhjZXB0aW9uIGhhbmRsZXIuXG4gICAgICovXG4gICAgc2YuZXhjZXB0aW9ucy5yZWdpc3Rlcignbm90SW1wbGVtZW50ZWQnLCBmdW5jdGlvbihleHBsYW5hdGlvbil7XG4gICAgICAgIGV4cGxhbmF0aW9uID0gZXhwbGFuYXRpb24gfHwgXCJcIjtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IFwibm90SW1wbGVtZW50ZWQgZXhjZXB0aW9uXCIgKyBleHBsYW5hdGlvbjtcbiAgICAgICAgdGhyb3cobWVzc2FnZSk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmluZyBzZWN1cml0eSBleGNlcHRpb24gaGFuZGxlci5cbiAgICAgKi9cbiAgICBzZi5leGNlcHRpb25zLnJlZ2lzdGVyKCdzZWN1cml0eScsIGZ1bmN0aW9uKGV4cGxhbmF0aW9uKXtcbiAgICAgICAgZXhwbGFuYXRpb24gPSBleHBsYW5hdGlvbiB8fCBcIlwiO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gXCJzZWN1cml0eSBleGNlcHRpb25cIiArIGV4cGxhbmF0aW9uO1xuICAgICAgICB0aHJvdyhtZXNzYWdlKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIGR1cGxpY2F0ZURlcGVuZGVuY3kgZXhjZXB0aW9uIGhhbmRsZXIuXG4gICAgICovXG4gICAgc2YuZXhjZXB0aW9ucy5yZWdpc3RlcignZHVwbGljYXRlRGVwZW5kZW5jeScsIGZ1bmN0aW9uKHZhcmlhYmxlKXtcbiAgICAgICAgdmFyaWFibGUgPSB2YXJpYWJsZSB8fCBcIlwiO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gXCJkdXBsaWNhdGVEZXBlbmRlbmN5IGV4Y2VwdGlvblwiICsgdmFyaWFibGU7XG4gICAgICAgIHRocm93KG1lc3NhZ2UpO1xuICAgIH0pO1xufTsiLCJjb25zdCBMT0dfTEVWRUxTID0ge1xuICAgIEhBUkRfRVJST1I6ICAgICAwLCAgLy8gc3lzdGVtIGxldmVsIGNyaXRpY2FsIGVycm9yOiBoYXJkRXJyb3JcbiAgICBFUlJPUjogICAgICAgICAgMSwgIC8vIHBvdGVudGlhbGx5IGNhdXNpbmcgdXNlcidzIGRhdGEgbG9vc2luZyBlcnJvcjogZXJyb3JcbiAgICBMT0dfRVJST1I6ICAgICAgMiwgIC8vIG1pbm9yIGFubm95YW5jZSwgcmVjb3ZlcmFibGUgZXJyb3I6ICAgbG9nRXJyb3JcbiAgICBVWF9FUlJPUjogICAgICAgMywgIC8vIHVzZXIgZXhwZXJpZW5jZSBjYXVzaW5nIGlzc3VlcyBlcnJvcjogIHV4RXJyb3JcbiAgICBXQVJOOiAgICAgICAgICAgNCwgIC8vIHdhcm5pbmcscG9zc2libGUgaXN1ZXMgYnV0IHNvbWVob3cgdW5jbGVhciBiZWhhdmlvdXI6IHdhcm5cbiAgICBJTkZPOiAgICAgICAgICAgNSwgIC8vIHN0b3JlIGdlbmVyYWwgaW5mbyBhYm91dCB0aGUgc3lzdGVtIHdvcmtpbmc6IGluZm9cbiAgICBERUJVRzogICAgICAgICAgNiwgIC8vIHN5c3RlbSBsZXZlbCBkZWJ1ZzogZGVidWdcbiAgICBMT0NBTF9ERUJVRzogICAgNywgIC8vIGxvY2FsIG5vZGUvc2VydmljZSBkZWJ1ZzogbGRlYnVnXG4gICAgVVNFUl9ERUJVRzogICAgIDgsICAvLyB1c2VyIGxldmVsIGRlYnVnOyB1ZGVidWdcbiAgICBERVZfREVCVUc6ICAgICAgOSwgIC8vIGRldmVsb3BtZW50IHRpbWUgZGVidWc6IGRkZWJ1Z1xuICAgIFdIWVM6ICAgICAgICAgICAgMTAsIC8vIHdoeUxvZyBmb3IgY29kZSByZWFzb25pbmdcbiAgICBURVNUX1JFU1VMVDogICAgMTEsIC8vIHRlc3RSZXN1bHQgdG8gbG9nIHJ1bm5pbmcgdGVzdHNcbn07XG5cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uKHNmKXtcblxuICAgIC8qKlxuICAgICAqIFJlY29yZHMgbG9nIG1lc3NhZ2VzIGZyb20gdmFyaW91cyB1c2UgY2FzZXMuXG4gICAgICogQHBhcmFtIHJlY29yZCB7U3RyaW5nfSAtIGxvZyBtZXNzYWdlLlxuICAgICAqL1xuICAgIHNmLmxvZ2dlci5yZWNvcmQgPSBmdW5jdGlvbihyZWNvcmQpe1xuICAgICAgICB2YXIgZGlzcGxheU9uQ29uc29sZSA9IHRydWU7XG4gICAgICAgIGlmKHByb2Nlc3Muc2VuZCkge1xuICAgICAgICAgICAgcHJvY2Vzcy5zZW5kKHJlY29yZCk7XG4gICAgICAgICAgICBkaXNwbGF5T25Db25zb2xlID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZihkaXNwbGF5T25Db25zb2xlKSB7XG4gICAgICAgICAgICBjb25zdCBwcmV0dHlMb2cgPSBKU09OLnN0cmluZ2lmeShyZWNvcmQsIG51bGwsIDIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2cocHJldHR5TG9nKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBZGRpbmcgY2FzZSBmb3IgbG9nZ2luZyBzeXN0ZW0gbGV2ZWwgY3JpdGljYWwgZXJyb3JzLlxuICAgICAqL1xuICAgIHNmLmxvZ2dlci5hZGRDYXNlKCdoYXJkRXJyb3InLCBmdW5jdGlvbihtZXNzYWdlLCBleGNlcHRpb24sIGFyZ3MsIHBvcywgZGF0YSl7XG4gICAgICAgIHNmLmxvZ2dlci5yZWNvcmQoY3JlYXRlRGVidWdSZWNvcmQoTE9HX0xFVkVMUy5IQVJEX0VSUk9SLCAnc3lzdGVtRXJyb3InLCBtZXNzYWdlLCBleGNlcHRpb24sIHRydWUsIGFyZ3MsIHBvcywgZGF0YSkpO1xuICAgIH0sIFtcbiAgICAgICAge1xuICAgICAgICAgICAgJ21lc3NhZ2UnOidleHBsYW5hdGlvbidcbiAgICAgICAgfVxuICAgIF0pO1xuXG4gICAgLyoqXG4gICAgICogQWRkaW5nIGNhc2UgZm9yIGxvZ2dpbmcgcG90ZW50aWFsbHkgY2F1c2luZyB1c2VyJ3MgZGF0YSBsb29zaW5nIGVycm9ycy5cbiAgICAgKi9cbiAgICBzZi5sb2dnZXIuYWRkQ2FzZSgnZXJyb3InLCBmdW5jdGlvbihtZXNzYWdlLCBleGNlcHRpb24sIGFyZ3MsIHBvcywgZGF0YSl7XG4gICAgICAgIHNmLmxvZ2dlci5yZWNvcmQoY3JlYXRlRGVidWdSZWNvcmQoTE9HX0xFVkVMUy5FUlJPUiwgJ2Vycm9yJywgbWVzc2FnZSwgZXhjZXB0aW9uLCB0cnVlLCBhcmdzLCBwb3MsIGRhdGEpKTtcbiAgICB9LCBbXG4gICAgICAgIHtcbiAgICAgICAgICAgICdtZXNzYWdlJzonZXhwbGFuYXRpb24nXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgICdleGNlcHRpb24nOidleGNlcHRpb24nXG4gICAgICAgIH1cbiAgICBdKTtcblxuICAgIC8qKlxuICAgICAqIEFkZGluZyBjYXNlIGZvciBsb2dnaW5nIG1pbm9yIGFubm95YW5jZSwgcmVjb3ZlcmFibGUgZXJyb3JzLlxuICAgICAqL1xuICAgIHNmLmxvZ2dlci5hZGRDYXNlKCdsb2dFcnJvcicsIGZ1bmN0aW9uKG1lc3NhZ2UsIGV4Y2VwdGlvbiwgYXJncywgcG9zLCBkYXRhKXtcbiAgICAgICAgc2YubG9nZ2VyLnJlY29yZChjcmVhdGVEZWJ1Z1JlY29yZChMT0dfTEVWRUxTLkxPR19FUlJPUiwgJ2xvZ0Vycm9yJywgbWVzc2FnZSwgZXhjZXB0aW9uLCB0cnVlLCBhcmdzLCBwb3MsIGRhdGEpKTtcbiAgICB9LCBbXG4gICAgICAgIHtcbiAgICAgICAgICAgICdtZXNzYWdlJzonZXhwbGFuYXRpb24nXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgICdleGNlcHRpb24nOidleGNlcHRpb24nXG4gICAgICAgIH1cbiAgICBdKTtcblxuICAgIC8qKlxuICAgICAqIEFkZGluZyBjYXNlIGZvciBsb2dnaW5nIHVzZXIgZXhwZXJpZW5jZSBjYXVzaW5nIGlzc3VlcyBlcnJvcnMuXG4gICAgICovXG4gICAgc2YubG9nZ2VyLmFkZENhc2UoJ3V4RXJyb3InLCBmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgc2YubG9nZ2VyLnJlY29yZChjcmVhdGVEZWJ1Z1JlY29yZChMT0dfTEVWRUxTLlVYX0VSUk9SLCAndXhFcnJvcicsIG1lc3NhZ2UsIG51bGwsIGZhbHNlKSk7XG4gICAgfSwgW1xuICAgICAgICB7XG4gICAgICAgICAgICAnbWVzc2FnZSc6J2V4cGxhbmF0aW9uJ1xuICAgICAgICB9XG4gICAgXSk7XG5cbiAgICAvKipcbiAgICAgKiBBZGRpbmcgY2FzZSBmb3IgbG9nZ2luZyB0aHJvdHRsaW5nIG1lc3NhZ2VzLlxuICAgICAqL1xuICAgIHNmLmxvZ2dlci5hZGRDYXNlKCd0aHJvdHRsaW5nJywgZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgIHNmLmxvZ2dlci5yZWNvcmQoY3JlYXRlRGVidWdSZWNvcmQoTE9HX0xFVkVMUy5XQVJOLCAndGhyb3R0bGluZycsIG1lc3NhZ2UsIG51bGwsIGZhbHNlKSk7XG4gICAgfSwgW1xuICAgICAgICB7XG4gICAgICAgICAgICAnbWVzc2FnZSc6J2V4cGxhbmF0aW9uJ1xuICAgICAgICB9XG4gICAgXSk7XG5cbiAgICAvKipcbiAgICAgKiBBZGRpbmcgY2FzZSBmb3IgbG9nZ2luZyB3YXJuaW5nLCBwb3NzaWJsZSBpc3N1ZXMsIGJ1dCBzb21laG93IHVuY2xlYXIgYmVoYXZpb3Vycy5cbiAgICAgKi9cbiAgICBzZi5sb2dnZXIuYWRkQ2FzZSgnd2FybmluZycsIGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgICBzZi5sb2dnZXIucmVjb3JkKGNyZWF0ZURlYnVnUmVjb3JkKExPR19MRVZFTFMuV0FSTiwgJ3dhcm5pbmcnLCBtZXNzYWdlLG51bGwsIGZhbHNlLCBhcmd1bWVudHMsIDApKTtcbiAgICB9LCBbXG4gICAgICAgIHtcbiAgICAgICAgICAgICdtZXNzYWdlJzonZXhwbGFuYXRpb24nXG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBcbiAgICBzZi5sb2dnZXIuYWxpYXMoJ3dhcm4nLCAnd2FybmluZycpO1xuXG4gICAgLyoqXG4gICAgICogQWRkaW5nIGNhc2UgZm9yIGxvZ2dpbmcgZ2VuZXJhbCBpbmZvIGFib3V0IHRoZSBzeXN0ZW0gd29ya2luZy5cbiAgICAgKi9cbiAgICBzZi5sb2dnZXIuYWRkQ2FzZSgnaW5mbycsIGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgICBzZi5sb2dnZXIucmVjb3JkKGNyZWF0ZURlYnVnUmVjb3JkKExPR19MRVZFTFMuSU5GTywgJ2luZm8nLCBtZXNzYWdlLG51bGwsIGZhbHNlLCBhcmd1bWVudHMsIDApKTtcbiAgICB9LCBbXG4gICAgICAgIHtcbiAgICAgICAgICAgICdtZXNzYWdlJzonZXhwbGFuYXRpb24nXG4gICAgICAgIH1cbiAgICBdKTtcblxuICAgIC8qKlxuICAgICAqIEFkZGluZyBjYXNlIGZvciBsb2dnaW5nIHN5c3RlbSBsZXZlbCBkZWJ1ZyBtZXNzYWdlcy5cbiAgICAgKi9cbiAgICBzZi5sb2dnZXIuYWRkQ2FzZSgnZGVidWcnLCBmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgc2YubG9nZ2VyLnJlY29yZChjcmVhdGVEZWJ1Z1JlY29yZChMT0dfTEVWRUxTLkRFQlVHLCAnZGVidWcnLCBtZXNzYWdlLG51bGwsIGZhbHNlLCBhcmd1bWVudHMsIDApKTtcbiAgICB9LCBbXG4gICAgICAgIHtcbiAgICAgICAgICAgICdtZXNzYWdlJzonZXhwbGFuYXRpb24nXG4gICAgICAgIH1cbiAgICBdKTtcblxuXG4gICAgLyoqXG4gICAgICogQWRkaW5nIGNhc2UgZm9yIGxvZ2dpbmcgbG9jYWwgbm9kZS9zZXJ2aWNlIGRlYnVnIG1lc3NhZ2VzLlxuICAgICAqL1xuICAgIHNmLmxvZ2dlci5hZGRDYXNlKCdsZGVidWcnLCBmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgc2YubG9nZ2VyLnJlY29yZChjcmVhdGVEZWJ1Z1JlY29yZChMT0dfTEVWRUxTLkxPQ0FMX0RFQlVHLCAnbGRlYnVnJywgbWVzc2FnZSwgbnVsbCwgZmFsc2UsIGFyZ3VtZW50cywgMCkpO1xuICAgIH0sIFtcbiAgICAgICAge1xuICAgICAgICAgICAgJ21lc3NhZ2UnOidleHBsYW5hdGlvbidcbiAgICAgICAgfVxuICAgIF0pO1xuXG4gICAgLyoqXG4gICAgICogQWRkaW5nIGNhc2UgZm9yIGxvZ2dpbmcgdXNlciBsZXZlbCBkZWJ1ZyBtZXNzYWdlcy5cbiAgICAgKi9cbiAgICBzZi5sb2dnZXIuYWRkQ2FzZSgndWRlYnVnJywgZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgIHNmLmxvZ2dlci5yZWNvcmQoY3JlYXRlRGVidWdSZWNvcmQoTE9HX0xFVkVMUy5VU0VSX0RFQlVHLCAndWRlYnVnJywgbWVzc2FnZSAsbnVsbCwgZmFsc2UsIGFyZ3VtZW50cywgMCkpO1xuICAgIH0sIFtcbiAgICAgICAge1xuICAgICAgICAgICAgJ21lc3NhZ2UnOidleHBsYW5hdGlvbidcbiAgICAgICAgfVxuICAgIF0pO1xuXG4gICAgLyoqXG4gICAgICogQWRkaW5nIGNhc2UgZm9yIGxvZ2dpbmcgZGV2ZWxvcG1lbnQgZGVidWcgbWVzc2FnZXMuXG4gICAgICovXG4gICAgc2YubG9nZ2VyLmFkZENhc2UoJ2RldmVsJywgZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgIHNmLmxvZ2dlci5yZWNvcmQoY3JlYXRlRGVidWdSZWNvcmQoTE9HX0xFVkVMUy5ERVZfREVCVUcsICdkZXZlbCcsIG1lc3NhZ2UsIG51bGwsIGZhbHNlLCBhcmd1bWVudHMsIDApKTtcbiAgICB9LCBbXG4gICAgICAgIHtcbiAgICAgICAgICAgICdtZXNzYWdlJzonZXhwbGFuYXRpb24nXG4gICAgICAgIH1cbiAgICBdKTtcblxuICAgIC8qKlxuICAgICAqIEFkZGluZyBjYXNlIGZvciBsb2dnaW5nIFwid2h5c1wiIHJlYXNvbmluZyBtZXNzYWdlcy5cbiAgICAgKi9cbiAgICBzZi5sb2dnZXIuYWRkQ2FzZShcImxvZ1doeVwiLCBmdW5jdGlvbihsb2dPbmx5Q3VycmVudFdoeUNvbnRleHQpe1xuICAgICAgICBzZi5sb2dnZXIucmVjb3JkKGNyZWF0ZURlYnVnUmVjb3JkKExPR19MRVZFTFMuV0hZUywgJ2xvZ3doeScsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGxvZ09ubHlDdXJyZW50V2h5Q29udGV4dCkpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogQWRkaW5nIGNhc2UgZm9yIGxvZ2dpbmcgYXNzZXJ0cyBtZXNzYWdlcyB0byBydW5uaW5nIHRlc3RzLlxuICAgICAqL1xuICAgIHNmLmxvZ2dlci5hZGRDYXNlKFwicmVjb3JkQXNzZXJ0XCIsIGZ1bmN0aW9uIChtZXNzYWdlLCBlcnJvcixzaG93U3RhY2spe1xuICAgICAgICBzZi5sb2dnZXIucmVjb3JkKGNyZWF0ZURlYnVnUmVjb3JkKExPR19MRVZFTFMuVEVTVF9SRVNVTFQsICdhc3NlcnQnLCBtZXNzYWdlLCBlcnJvciwgc2hvd1N0YWNrKSk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmljIG1ldGhvZCB0byBjcmVhdGUgc3RydWN0dXJlZCBkZWJ1ZyByZWNvcmRzIGJhc2VkIG9uIHRoZSBsb2cgbGV2ZWwuXG4gICAgICogQHBhcmFtIGxldmVsIHtOdW1iZXJ9IC0gbnVtYmVyIGZyb20gMS0xMSwgdXNlZCB0byBpZGVudGlmeSB0aGUgbGV2ZWwgb2YgYXR0ZW50aW9uIHRoYXQgYSBsb2cgZW50cnkgc2hvdWxkIGdldCBmcm9tIG9wZXJhdGlvbnMgcG9pbnQgb2Ygdmlld1xuICAgICAqIEBwYXJhbSB0eXBlIHtTdHJpbmd9IC0gaWRlbnRpZmllciBuYW1lIGZvciBsb2cgdHlwZVxuICAgICAqIEBwYXJhbSBtZXNzYWdlIHtTdHJpbmd9IC0gZGVzY3JpcHRpb24gb2YgdGhlIGRlYnVnIHJlY29yZFxuICAgICAqIEBwYXJhbSBleGNlcHRpb24ge1N0cmluZ30gLSBleGNlcHRpb24gZGV0YWlscyBpZiBhbnlcbiAgICAgKiBAcGFyYW0gc2F2ZVN0YWNrIHtCb29sZWFufSAtIGlmIHNldCB0byB0cnVlLCB0aGUgZXhjZXB0aW9uIGNhbGwgc3RhY2sgd2lsbCBiZSBhZGRlZCB0byB0aGUgZGVidWcgcmVjb3JkXG4gICAgICogQHBhcmFtIGFyZ3Mge0FycmF5fSAtIGFyZ3VtZW50cyBvZiB0aGUgY2FsbGVyIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHBvcyB7TnVtYmVyfSAtIHBvc2l0aW9uXG4gICAgICogQHBhcmFtIGRhdGEge1N0cmluZ3xOdW1iZXJ8QXJyYXl8T2JqZWN0fSAtIHBheWxvYWQgaW5mb3JtYXRpb25cbiAgICAgKiBAcGFyYW0gbG9nT25seUN1cnJlbnRXaHlDb250ZXh0IC0gaWYgd2h5cyBpcyBlbmFibGVkLCBvbmx5IHRoZSBjdXJyZW50IGNvbnRleHQgd2lsbCBiZSBsb2dnZWRcbiAgICAgKiBAcmV0dXJucyBEZWJ1ZyByZWNvcmQgbW9kZWwge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGZpZWxkczpcbiAgICAgKiBbcmVxdWlyZWRdOiBsZXZlbDogKiwgdHlwZTogKiwgdGltZXN0YW1wOiBudW1iZXIsIG1lc3NhZ2U6ICosIGRhdGE6ICogYW5kXG4gICAgICogW29wdGlvbmFsXTogc3RhY2s6ICosIGV4Y2VwdGlvbjogKiwgYXJnczogKiwgd2h5TG9nOiAqXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRGVidWdSZWNvcmQobGV2ZWwsIHR5cGUsIG1lc3NhZ2UsIGV4Y2VwdGlvbiwgc2F2ZVN0YWNrLCBhcmdzLCBwb3MsIGRhdGEsIGxvZ09ubHlDdXJyZW50V2h5Q29udGV4dCl7XG5cbiAgICAgICAgdmFyIHJldCA9IHtcbiAgICAgICAgICAgIGxldmVsOiBsZXZlbCxcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCksXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmKHNhdmVTdGFjayl7XG4gICAgICAgICAgICB2YXIgc3RhY2sgPSAnJztcbiAgICAgICAgICAgIGlmKGV4Y2VwdGlvbil7XG4gICAgICAgICAgICAgICAgc3RhY2sgPSBleGNlcHRpb24uc3RhY2s7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0YWNrICA9IChuZXcgRXJyb3IoKSkuc3RhY2s7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXQuc3RhY2sgPSBzdGFjaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKGV4Y2VwdGlvbil7XG4gICAgICAgICAgICByZXQuZXhjZXB0aW9uID0gZXhjZXB0aW9uLm1lc3NhZ2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZihhcmdzKXtcbiAgICAgICAgICAgIHJldC5hcmdzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShhcmdzKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZihwcm9jZXNzLmVudi5SVU5fV0lUSF9XSFlTKXtcbiAgICAgICAgICAgIHZhciB3aHkgPSByZXF1aXJlKCd3aHlzJyk7XG4gICAgICAgICAgICBpZihsb2dPbmx5Q3VycmVudFdoeUNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICByZXRbJ3doeUxvZyddID0gd2h5LmdldEdsb2JhbEN1cnJlbnRDb250ZXh0KCkuZ2V0RXhlY3V0aW9uU3VtbWFyeSgpO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgcmV0Wyd3aHlMb2cnXSA9IHdoeS5nZXRBbGxDb250ZXh0cygpLm1hcChmdW5jdGlvbiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRFeGVjdXRpb25TdW1tYXJ5KCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxufTtcblxuIiwiY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCBmb3JrZXIgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XG5cbmNvbnN0IERFRkFVTFRfVElNRU9VVCA9IDIwMDA7XG5cbnZhciBnbG9iVG9SZWdFeHAgPSAgcmVxdWlyZShcIi4vdXRpbHMvZ2xvYi10by1yZWdleHBcIik7XG5cbnZhciBkZWZhdWx0Q29uZmlnID0ge1xuICAgIGNvbmZGaWxlTmFtZTogXCJkb3VibGUtY2hlY2suanNvblwiLCAgICAgIC8vIG5hbWUgb2YgdGhlIGNvbmYgZmlsZVxuICAgIGZpbGVFeHQ6IFwiLmpzXCIsICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRlc3QgZmlsZSBzdXBwb3J0ZWQgYnkgZXh0ZW5zaW9uXG4gICAgbWF0Y2hEaXJzOiBbICd0ZXN0JywgJ3Rlc3RzJyBdLCAgICAgICAgICAgLy8gZGlycyBuYW1lcyBmb3IgdGVzdHMgLSBjYXNlIGluc2Vuc2l0aXZlICh1c2VkIGluIGRpc2NvdmVyeSBwcm9jZXNzKVxuICAgIHRlc3RzRGlyOiBwcm9jZXNzLmN3ZCgpLCAgICAgICAgICAgICAgICAvLyBwYXRoIHRvIHRoZSByb290IHRlc3RzIGxvY2F0aW9uXG4gICAgcmVwb3J0czoge1xuICAgICAgICBiYXNlUGF0aDogcHJvY2Vzcy5jd2QoKSwgICAgICAgICAgICAvLyBwYXRoIHdoZXJlIHRoZSByZXBvcnRzIHdpbGwgYmUgc2F2ZWRcbiAgICAgICAgcHJlZml4OiBcIlJlcG9ydC1cIiwgICAgICAgICAgICAgICAgICAvLyBwcmVmaXggZm9yIHJlcG9ydCBmaWxlcywgZmlsZW5hbWUgcGF0dGVybjogW3ByZWZpeF0te3RpbWVzdGFtcH17ZXh0fVxuICAgICAgICBleHQ6IFwiLnR4dFwiICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlcG9ydCBmaWxlIGV4dGVuc2lvblxuICAgIH1cbn07XG5cbmNvbnN0IFRBRyA9IFwiW1RFU1RfUlVOTkVSXVwiO1xuY29uc3QgTUFYX1dPUktFUlMgPSBwcm9jZXNzLmVudlsnRE9VQkxFX0NIRUNLX1BPT0xfU0laRSddIHx8IDEwO1xuY29uc3QgREVCVUcgPSB0eXBlb2YgdjhkZWJ1ZyA9PT0gJ29iamVjdCc7XG5cbmNvbnN0IFRFU1RfU1RBVEVTID0ge1xuICAgIFJFQURZOiAncmVhZHknLFxuICAgIFJVTk5JTkc6ICdydW5uaW5nJyxcbiAgICBGSU5JU0hFRDogJ2ZpbmlzaGVkJyxcbiAgICBUSU1FT1VUOiAndGltZW91dCdcbn07XG5cbi8vIFNlc3Npb24gb2JqZWN0XG52YXIgZGVmYXVsdFNlc3Npb24gPSB7XG4gICAgdGVzdENvdW50OiAwLFxuICAgIGN1cnJlbnRUZXN0SW5kZXg6IDAsXG4gICAgZGVidWdQb3J0OiBwcm9jZXNzLmRlYnVnUG9ydCwgICAvLyBjdXJyZW50IHByb2Nlc3MgZGVidWcgcG9ydC4gVGhlIGNoaWxkIHByb2Nlc3Mgd2lsbCBiZSBpbmNyZWFzZWQgZnJvbSB0aGlzIHBvcnRcbiAgICB3b3JrZXJzOiB7XG4gICAgICAgIHJ1bm5pbmc6IDAsXG4gICAgICAgIHRlcm1pbmF0ZWQ6IDBcbiAgICB9XG59O1xuXG4vLyBUZW1wbGF0ZSBzdHJ1Y3R1cmUgZm9yIHRlc3QgcmVwb3J0cy5cbnZhciByZXBvcnRGaWxlU3RydWN0dXJlID0ge1xuICAgIGNvdW50OiAwLFxuICAgIHN1aXRlczoge1xuICAgICAgICBjb3VudDogMCxcbiAgICAgICAgaXRlbXM6IFtdXG4gICAgfSxcbiAgICBwYXNzZWQ6IHtcbiAgICAgICAgY291bnQ6IDAsXG4gICAgICAgIGl0ZW1zOiBbXVxuICAgIH0sXG4gICAgZmFpbGVkOiB7XG4gICAgICAgIGNvdW50OiAwLFxuICAgICAgICBpdGVtczogW11cbiAgICB9LFxufTtcblxuZXhwb3J0cy5pbml0ID0gZnVuY3Rpb24oc2Ype1xuICAgIHNmLnRlc3RSdW5uZXIgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbml0aWFsaXphdGlvbiBvZiB0aGUgdGVzdCBydW5uZXIuXG4gICAgICAgICAqIEBwYXJhbSBjb25maWcge09iamVjdH0gLSBzZXR0aW5ncyBvYmplY3QgdGhhdCB3aWxsIGJlIG1lcmdlZCB3aXRoIHRoZSBkZWZhdWx0IG9uZVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX19pbml0OiBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnID0gdGhpcy5fX2V4dGVuZChkZWZhdWx0Q29uZmlnLCBjb25maWcpO1xuICAgICAgICAgICAgdGhpcy50ZXN0VHJlZSA9IHt9O1xuICAgICAgICAgICAgdGhpcy50ZXN0TGlzdCA9IFtdO1xuXG4gICAgICAgICAgICB0aGlzLnNlc3Npb24gPSBkZWZhdWx0U2Vzc2lvbjtcblxuICAgICAgICAgICAgLy8gY3JlYXRlIHJlcG9ydHMgZGlyZWN0b3J5IGlmIG5vdCBleGlzdFxuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHRoaXMuY29uZmlnLnJlcG9ydHMuYmFzZVBhdGgpKXtcbiAgICAgICAgICAgICAgICBmcy5ta2RpclN5bmModGhpcy5jb25maWcucmVwb3J0cy5iYXNlUGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWluIGVudHJ5IHBvaW50LiBJdCB3aWxsIHN0YXJ0IHRoZSBmbG93IHJ1bm5lciBmbG93LlxuICAgICAgICAgKiBAcGFyYW0gY29uZmlnIHtPYmplY3R9IC0gb2JqZWN0IGNvbnRhaW5pbmcgc2V0dGluZ3Mgc3VjaCBhcyBjb25mIGZpbGUgbmFtZSwgdGVzdCBkaXIuXG4gICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259IC0gaGFuZGxlcihlcnJvciwgcmVzdWx0KSBpbnZva2VkIHdoZW4gYW4gZXJyb3Igb2NjdXJyZWQgb3IgdGhlIHJ1bm5lciBoYXMgY29tcGxldGVkIGFsbCBqb2JzLlxuICAgICAgICAgKi9cbiAgICAgICAgc3RhcnQ6IGZ1bmN0aW9uKGNvbmZpZywgY2FsbGJhY2spIHtcblxuICAgICAgICAgICAgLy8gd3JhcHBlciBmb3IgcHJvdmlkZWQgY2FsbGJhY2ssIGlmIGFueVxuICAgICAgICAgICAgdGhpcy5jYWxsYmFjayA9IGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19kZWJ1Z0luZm8oZXJyLm1lc3NhZ2UgfHwgZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuX19pbml0KGNvbmZpZyk7XG5cbiAgICAgICAgICAgIHRoaXMuX19jb25zb2xlTG9nKFwiRGlzY292ZXJpbmcgdGVzdHMgLi4uXCIpO1xuICAgICAgICAgICAgdGhpcy50ZXN0VHJlZSA9IHRoaXMuX19kaXNjb3ZlclRlc3RGaWxlcyh0aGlzLmNvbmZpZy50ZXN0c0RpciwgY29uZmlnKTtcbiAgICAgICAgICAgIHRoaXMudGVzdExpc3QgPSB0aGlzLl9fdG9UZXN0VHJlZVRvTGlzdCh0aGlzLnRlc3RUcmVlKTtcbiAgICAgICAgICAgIHRoaXMuX19sYXVuY2hUZXN0cygpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogUmVhZHMgY29uZmlndXJhdGlvbiBzZXR0aW5ncyBmcm9tIGEganNvbiBmaWxlLlxuICAgICAgICAgKiBAcGFyYW0gY29uZlBhdGgge1N0cmluZ30gLSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBjb25maWd1cmF0aW9uIGZpbGUuXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gY29uZmlndXJhdGlvbiBvYmplY3Qge3t9fVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX19yZWFkQ29uZjogZnVuY3Rpb24oY29uZlBhdGgpIHtcbiAgICAgICAgICAgIHZhciBjb25maWcgPSB7fTtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBjb25maWcgPSByZXF1aXJlKGNvbmZQYXRoKTtcbiAgICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERpc2NvdmVycyB0ZXN0IGZpbGVzIHJlY3Vyc2l2ZWx5IHN0YXJ0aW5nIGZyb20gYSBwYXRoLiBUaGUgZGlyIGlzIHRoZSByb290IG9mIHRoZSB0ZXN0IGZpbGVzLiBJdCBjYW4gY29udGFpbnNcbiAgICAgICAgICogdGVzdCBmaWxlcyBhbmQgdGVzdCBzdWIgZGlyZWN0b3JpZXMuIEl0IHdpbGwgY3JlYXRlIGEgdHJlZSBzdHJ1Y3R1cmUgd2l0aCB0aGUgdGVzdCBmaWxlcyBkaXNjb3ZlcmVkLlxuICAgICAgICAgKiBOb3RlczogT25seSB0aGUgY29uZmlnLm1hdGNoRGlycyB3aWxsIGJlIHRha2VuIGludG8gY29uc2lkZXJhdGlvbi4gQWxzbywgYmFzZWQgb24gdGhlIGNvbmYgKGRvdWJsZS1jaGVjay5qc29uKVxuICAgICAgICAgKiBpdCB3aWxsIGluY2x1ZGUgdGhlIHRlc3QgZmlsZXMgb3Igbm90LlxuICAgICAgICAgKiBAcGFyYW0gZGlyIHtTdHJpbmd9IC0gcGF0aCB3aGVyZSB0aGUgZGlzY292ZXJ5IHByb2Nlc3Mgc3RhcnRzXG4gICAgICAgICAqIEBwYXJhbSBwYXJlbnRDb25mIHtTdHJpbmd9IC0gY29uZmlndXJhdGlvbiBvYmplY3QgKGRvdWJsZS1jaGVjay5qc29uKSBmcm9tIHRoZSBwYXJlbnQgZGlyZWN0b3J5XG4gICAgICAgICAqIEByZXR1cm5zIFRoZSByb290IG5vZGUgb2JqZWN0IG9mIHRoZSBmaWxlIHN0cnVjdHVyZSB0cmVlLiBFLmcuIHsqfHtfX21ldGEsIGRhdGEsIHJlc3VsdCwgaXRlbXN9fVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX19kaXNjb3ZlclRlc3RGaWxlczogZnVuY3Rpb24oZGlyLCBwYXJlbnRDb25mKSB7XG4gICAgICAgICAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoZGlyKTtcbiAgICAgICAgICAgIGlmKCFzdGF0LmlzRGlyZWN0b3J5KCkpe1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihkaXIgKyBcIiBpcyBub3QgYSBkaXJlY3RvcnkhXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgY3VycmVudENvbmYgPSBwYXJlbnRDb25mO1xuXG4gICAgICAgICAgICBsZXQgY3VycmVudE5vZGUgPSB0aGlzLl9fZ2V0RGVmYXVsdE5vZGVTdHJ1Y3R1cmUoKTtcbiAgICAgICAgICAgIGN1cnJlbnROb2RlLl9fbWV0YS5wYXJlbnQgPSBwYXRoLmRpcm5hbWUoZGlyKTtcbiAgICAgICAgICAgIGN1cnJlbnROb2RlLl9fbWV0YS5pc0RpcmVjdG9yeSA9IHRydWU7XG5cbiAgICAgICAgICAgIGxldCBmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKGRpcik7XG4gICAgICAgICAgICAvLyBmaXJzdCBsb29rIGZvciBjb25mIGZpbGVcbiAgICAgICAgICAgIGlmKGZpbGVzLmluZGV4T2YodGhpcy5jb25maWcuY29uZkZpbGVOYW1lKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBsZXQgZmQgPSBwYXRoLmpvaW4oZGlyLCB0aGlzLmNvbmZpZy5jb25mRmlsZU5hbWUpO1xuICAgICAgICAgICAgICAgIGxldCBjb25mID0gdGhpcy5fX3JlYWRDb25mKGZkKTtcbiAgICAgICAgICAgICAgICBpZihjb25mKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnROb2RlLl9fbWV0YS5jb25mID0gY29uZjtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudENvbmYgPSBjb25mO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY3VycmVudE5vZGUuZGF0YS5uYW1lID0gcGF0aC5iYXNlbmFtZShkaXIpO1xuICAgICAgICAgICAgY3VycmVudE5vZGUuZGF0YS5wYXRoID0gZGlyO1xuICAgICAgICAgICAgY3VycmVudE5vZGUuaXRlbXMgPSBbXTtcblxuICAgICAgICAgICAgZm9yKGxldCBpID0gMCwgbGVuID0gZmlsZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IGZpbGVzW2ldO1xuXG4gICAgICAgICAgICAgICAgbGV0IGZkID0gcGF0aC5qb2luKGRpciwgaXRlbSk7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXQgPSBmcy5zdGF0U3luYyhmZCk7XG4gICAgICAgICAgICAgICAgbGV0IGlzRGlyID0gc3RhdC5pc0RpcmVjdG9yeSgpO1xuICAgICAgICAgICAgICAgIGxldCBpc1Rlc3REaXIgPSB0aGlzLl9faXNUZXN0RGlyKGZkKTtcblxuICAgICAgICAgICAgICAgIGlmKGlzRGlyICYmICFpc1Rlc3REaXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7IC8vIGlnbm9yZSBkaXJzIHRoYXQgZG9lcyBub3QgZm9sbG93IHRoZSBuYW1pbmcgcnVsZSBmb3IgdGVzdCBkaXJzXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYoIWlzRGlyICYmIGl0ZW0ubWF0Y2godGhpcy5jb25maWcuY29uZkZpbGVOYW1lKSl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlOyAvLyBhbHJlYWR5IHByb2Nlc3NlZFxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGV4Y2x1ZGUgZmlsZXMgYmFzZWQgb24gZ2xvYiBwYXR0ZXJuc1xuICAgICAgICAgICAgICAgIGlmKGN1cnJlbnRDb25mKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGN1cnJlbnRDb25mWydpZ25vcmUnXSAtIGFycmF5IG9mIHJlZ0V4cFxuICAgICAgICAgICAgICAgICAgICBpZihjdXJyZW50Q29uZlsnaWdub3JlJ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzTWF0Y2ggPSB0aGlzLl9faXNBbnlNYXRjaChjdXJyZW50Q29uZlsnaWdub3JlJ10sIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNNYXRjaCkge2NvbnRpbnVlO31cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGxldCBjaGlsZE5vZGUgPSB0aGlzLl9fZ2V0RGVmYXVsdE5vZGVTdHJ1Y3R1cmUoKTtcbiAgICAgICAgICAgICAgICBjaGlsZE5vZGUuX19tZXRhLmNvbmYgPSB7fTtcbiAgICAgICAgICAgICAgICBjaGlsZE5vZGUuX19tZXRhLmlzRGlyZWN0b3J5ID0gaXNEaXI7XG4gICAgICAgICAgICAgICAgY2hpbGROb2RlLl9fbWV0YS5wYXJlbnQgPSBwYXRoLmRpcm5hbWUoZmQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzRGlyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0ZW1wQ2hpbGROb2RlID0gdGhpcy5fX2Rpc2NvdmVyVGVzdEZpbGVzKGZkLCBjdXJyZW50Q29uZik7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkTm9kZSA9IE9iamVjdC5hc3NpZ24oY2hpbGROb2RlLCB0ZW1wQ2hpbGROb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudE5vZGUuaXRlbXMucHVzaChjaGlsZE5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHBhdGguZXh0bmFtZShmZCkgPT09ICB0aGlzLmNvbmZpZy5maWxlRXh0KXtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGROb2RlLl9fbWV0YS5jb25mLnJ1bnMgPSBjdXJyZW50Q29uZlsncnVucyddIHx8IDE7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkTm9kZS5fX21ldGEuY29uZi5zaWxlbnQgPSBjdXJyZW50Q29uZlsnc2lsZW50J107XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkTm9kZS5fX21ldGEuY29uZi50aW1lb3V0ID0gY3VycmVudENvbmZbJ3RpbWVvdXQnXSB8fCBERUZBVUxUX1RJTUVPVVQ7XG5cbiAgICAgICAgICAgICAgICAgICAgY2hpbGROb2RlLmRhdGEubmFtZSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkTm9kZS5kYXRhLnBhdGggPSBmZDtcblxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50Tm9kZS5pdGVtcy5wdXNoKGNoaWxkTm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY3VycmVudE5vZGU7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMYXVuY2ggY29sbGVjdGVkIHRlc3RzLiBJbml0aWFsaXNlcyBzZXNzaW9uIHZhcmlhYmxlcywgdGhhdCBhcmUgc3BlY2lmaWMgZm9yIHRoZSBjdXJyZW50IGxhdW5jaC5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9fbGF1bmNoVGVzdHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5fX2NvbnNvbGVMb2coXCJMYXVuY2hpbmcgdGVzdHMgLi4uXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXNzaW9uLnRlc3RDb3VudCA9IHRoaXMudGVzdExpc3QubGVuZ3RoO1xuICAgICAgICAgICAgdGhpcy5zZXNzaW9uLnByb2Nlc3NlZFRlc3RDb3VudCA9IDA7XG4gICAgICAgICAgICB0aGlzLnNlc3Npb24ud29ya2Vycy5ydW5uaW5nID0gMDtcbiAgICAgICAgICAgIHRoaXMuc2Vzc2lvbi53b3JrZXJzLnRlcm1pbmF0ZWQgPSAwO1xuXG4gICAgICAgICAgICBpZih0aGlzLnNlc3Npb24udGVzdENvdW50ID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX19zY2hlZHVsZVdvcmsoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fX2RvVGVzdFJlcG9ydHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNjaGVkdWxlcyB3b3JrIGJhc2VkIG9uIHRoZSBNQVggYXZhaWxhYmxlIHdvcmtlcnMsIGFuZCBiYXNlZCBvbiB0aGUgbnVtYmVyIG9mIHJ1bnMgb2YgYSB0ZXN0LlxuICAgICAgICAgKiBJZiBhIHRlc3QgaGFzIG11bHRpcGxlIHJ1bnMgYXMgYSBvcHRpb24sIGl0IHdpbGwgYmUgc3RhcnRlZCBpbiBtdWx0aXBsZSB3b3JrZXJzLiBPbmNlIGFsbCBydW5zIGFyZSBjb21wbGV0ZWQsXG4gICAgICAgICAqIHRoZSB0ZXN0IGlzIGNvbnNpZGVyZWQgYXMgcHJvY2Vzc2VkLlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX19zY2hlZHVsZVdvcms6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgd2hpbGUodGhpcy5zZXNzaW9uLndvcmtlcnMucnVubmluZyA8IE1BWF9XT1JLRVJTICYmIHRoaXMuc2Vzc2lvbi5jdXJyZW50VGVzdEluZGV4IDwgdGhpcy5zZXNzaW9uLnRlc3RDb3VudCl7XG4gICAgICAgICAgICAgICAgbGV0IHRlc3QgPSB0aGlzLnRlc3RMaXN0W3RoaXMuc2Vzc2lvbi5jdXJyZW50VGVzdEluZGV4XTtcbiAgICAgICAgICAgICAgICBpZih0ZXN0LnJlc3VsdC5ydW5zIDwgdGVzdC5fX21ldGEuY29uZi5ydW5zKSB7XG4gICAgICAgICAgICAgICAgICAgIHRlc3QucmVzdWx0LnJ1bnMrKztcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2xhdW5jaFRlc3QodGVzdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uLmN1cnJlbnRUZXN0SW5kZXgrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMYXVuY2ggYSB0ZXN0IGludG8gYSBzZXBhcmF0ZSB3b3JrZXIgKGNoaWxkIHByb2Nlc3MpLlxuICAgICAgICAgKiBFYWNoIHdvcmtlciBoYXMgaGFuZGxlcnMgZm9yIG1lc3NhZ2UsIGV4aXQgYW5kIGVycm9yIGV2ZW50cy4gT25jZSB0aGUgZXhpdCBvciBlcnJvciBldmVudCBpcyBpbnZva2VkLFxuICAgICAgICAgKiBuZXcgd29yayBpcyBzY2hlZHVsZWQgYW5kIHNlc3Npb24gb2JqZWN0IGlzIHVwZGF0ZWQuXG4gICAgICAgICAqIE5vdGVzOiBPbiBkZWJ1ZyBtb2RlLCB0aGUgd29ya2VycyB3aWxsIHJlY2VpdmUgYSBkZWJ1ZyBwb3J0LCB0aGF0IGlzIGluY3JlYXNlZCBpbmNyZW1lbnRhbGx5LlxuICAgICAgICAgKiBAcGFyYW0gdGVzdCB7T2JqZWN0fSAtIHRlc3Qgb2JqZWN0XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfX2xhdW5jaFRlc3Q6IGZ1bmN0aW9uKHRlc3QpIHtcbiAgICAgICAgICAgIHRoaXMuc2Vzc2lvbi53b3JrZXJzLnJ1bm5pbmcrKztcblxuICAgICAgICAgICAgdGVzdC5yZXN1bHQuc3RhdGUgPSBURVNUX1NUQVRFUy5SVU5OSU5HO1xuICAgICAgICAgICAgdGVzdC5yZXN1bHQucGFzcyA9IHRydWU7XG4gICAgICAgICAgICB0ZXN0LnJlc3VsdC5hc3NlcnRzW3Rlc3QucmVzdWx0LnJ1bnNdID0gW107XG4gICAgICAgICAgICB0ZXN0LnJlc3VsdC5tZXNzYWdlc1t0ZXN0LnJlc3VsdC5ydW5zXSA9IFtdO1xuXG4gICAgICAgICAgICBsZXQgZW52ID0gcHJvY2Vzcy5lbnY7XG5cbiAgICAgICAgICAgIGxldCBleGVjQXJndiA9IFtdO1xuICAgICAgICAgICAgaWYoREVCVUcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWJ1Z1BvcnQgPSArK2RlZmF1bHRTZXNzaW9uLmRlYnVnUG9ydDtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWJ1Z0ZsYWcgPSAnLS1kZWJ1Zz0nICsgZGVidWdQb3J0O1xuICAgICAgICAgICAgICAgIGV4ZWNBcmd2LnB1c2goZGVidWdGbGFnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgY3dkID0gdGVzdC5fX21ldGEucGFyZW50O1xuXG4gICAgICAgICAgICBsZXQgd29ya2VyID0gZm9ya2VyLmZvcmsodGVzdC5kYXRhLnBhdGgsIFtdLCB7J2N3ZCc6IGN3ZCwgJ2Vudic6IGVudiwgJ2V4ZWNBcmd2JzogZXhlY0FyZ3YsIHN0ZGlvOiBbICdpbmhlcml0JywgXCJwaXBlXCIsICdpbmhlcml0JywgJ2lwYycgXSwgc2lsZW50OmZhbHNlIH0pO1xuXG4gICAgICAgICAgICB0aGlzLl9fZGVidWdJbmZvKGBMYXVuY2hpbmcgdGVzdCAke3Rlc3QuZGF0YS5uYW1lfSwgcnVuWyR7dGVzdC5yZXN1bHQucnVuc31dLCBvbiB3b3JrZXIgcGlkWyR7d29ya2VyLnBpZH1dIGArbmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuXG4gICAgICAgICAgICB3b3JrZXIub24oXCJtZXNzYWdlXCIsIG9uTWVzc2FnZUV2ZW50SGFuZGxlcldyYXBwZXIodGVzdCkpO1xuICAgICAgICAgICAgd29ya2VyLm9uKFwiZXhpdFwiLCBvbkV4aXRFdmVudEhhbmRsZXJXcmFwcGVyKHRlc3QpKTtcbiAgICAgICAgICAgIHdvcmtlci5vbihcImVycm9yXCIsIG9uRXJyb3JFdmVudEhhbmRsZXJXcmFwcGVyKHRlc3QpKTtcblxuICAgICAgICAgICAgd29ya2VyLnRlcm1pbmF0ZWQgPSBmYWxzZTtcblxuICAgICAgICAgICAgd29ya2VyLnN0ZG91dC5vbignZGF0YScsIGZ1bmN0aW9uIChjaHVuaykge1xuICAgICAgICAgICAgICAgIGxldCBjb250ZW50ID0gbmV3IEJ1ZmZlcihjaHVuaykudG9TdHJpbmcoJ3V0ZjgnKTsgLy9UT0RPOiByZXBsYWNlIHdpdGggUFNLQlVGRkVSXG4gICAgICAgICAgICAgICAgaWYodGVzdC5fX21ldGEuY29uZi5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2NvbnNvbGVMb2coY29udGVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgZnVuY3Rpb24gb25NZXNzYWdlRXZlbnRIYW5kbGVyV3JhcHBlcih0ZXN0KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFJ1biA9IHRlc3QucmVzdWx0LnJ1bnM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGxvZykge1xuICAgICAgICAgICAgICAgICAgICBpZihsb2cudHlwZSA9PT0gJ2Fzc2VydCcpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobG9nLm1lc3NhZ2UuaW5jbHVkZXMoXCJbRmFpbFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlc3QucmVzdWx0LnBhc3MgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3QucmVzdWx0LmFzc2VydHNbY3VycmVudFJ1bl0ucHVzaChsb2cpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdC5yZXN1bHQubWVzc2FnZXNbY3VycmVudFJ1bl0ucHVzaChsb2cpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gb25FeGl0RXZlbnRIYW5kbGVyV3JhcHBlcih0ZXN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGNvZGUsIHNpZ25hbCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQod29ya2VyLnRpbWVyVmFyKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fX2RlYnVnSW5mbyhgV29ya2VyICR7d29ya2VyLnBpZH0gLSBleGl0IGV2ZW50LiBDb2RlICR7Y29kZX0sIHNpZ25hbCAke3NpZ25hbH0gYCtuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgd29ya2VyLnRlcm1pbmF0ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIHRlc3QucmVzdWx0LnN0YXRlID0gVEVTVF9TVEFURVMuRklOSVNIRUQ7XG4gICAgICAgICAgICAgICAgICAgIGlmKGNvZGUgIT09IG51bGwgJiYgY29kZSE9PTAgLyomJiB0eXBlb2YgdGVzdC5yZXN1bHQucGFzcyA9PT0gJ3VuZGVmaW5lZCcqLyl7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXN0LnJlc3VsdC5wYXNzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXN0LnJlc3VsdC5tZXNzYWdlc1t0ZXN0LnJlc3VsdC5ydW5zXS5wdXNoKCB7bWVzc2FnZTogXCJQcm9jZXNzIGZpbmlzaGVkIHdpdGggZXJyb3JzIVwiLCBcIkV4aXQgY29kZVwiOmNvZGUsIFwiU2lnbmFsXCI6c2lnbmFsfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzZWxmLnNlc3Npb24ud29ya2Vycy5ydW5uaW5nLS07XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuc2Vzc2lvbi53b3JrZXJzLnRlcm1pbmF0ZWQrKztcblxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9fc2NoZWR1bGVXb3JrKCk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX19jaGVja1dvcmtlcnNTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB0aGlzIGhhbmRsZXIgY2FuIGJlIHRyaWdnZXJlZCB3aGVuOlxuICAgICAgICAgICAgLy8gMS4gVGhlIHByb2Nlc3MgY291bGQgbm90IGJlIHNwYXduZWQsIG9yXG4gICAgICAgICAgICAvLyAyLiBUaGUgcHJvY2VzcyBjb3VsZCBub3QgYmUga2lsbGVkLCBvclxuICAgICAgICAgICAgLy8gMy4gU2VuZGluZyBhIG1lc3NhZ2UgdG8gdGhlIGNoaWxkIHByb2Nlc3MgZmFpbGVkLlxuICAgICAgICAgICAgLy8gSU1QT1JUQU5UOiBUaGUgJ2V4aXQnIGV2ZW50IG1heSBvciBtYXkgbm90IGZpcmUgYWZ0ZXIgYW4gZXJyb3IgaGFzIG9jY3VycmVkIVxuICAgICAgICAgICAgZnVuY3Rpb24gb25FcnJvckV2ZW50SGFuZGxlcldyYXBwZXIodGVzdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9fZGVidWdJbmZvKGBXb3JrZXIgJHt3b3JrZXIucGlkfSAtIGVycm9yIGV2ZW50LmAsIHRlc3QpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9fZGVidWdFcnJvcihlcnJvcik7XG5cbiAgICAgICAgICAgICAgICAgICAgc2VsZi5zZXNzaW9uLndvcmtlcnMucnVubmluZy0tO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnNlc3Npb24ud29ya2Vycy50ZXJtaW5hdGVkKys7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTm90ZTogb24gZGVidWcsIHRoZSB0aW1lb3V0IGlzIHJlYWNoZWQgYmVmb3JlIGV4aXQgZXZlbnQgaXMgY2FsbGVkXG4gICAgICAgICAgICAvLyB3aGVuIGtpbGwgaXMgY2FsbGVkLCB0aGUgZXhpdCBldmVudCBpcyByYWlzZWRcbiAgICAgICAgICAgIHdvcmtlci50aW1lclZhciA9IHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICBpZighd29ya2VyLnRlcm1pbmF0ZWQpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fY29uc29sZUxvZyhgd29ya2VyIHBpZCBbJHt3b3JrZXIucGlkfV0gLSB0aW1lb3V0IGV2ZW50YCxuZXcgRGF0ZSgpLmdldFRpbWUoKSwgIHRlc3QpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHRlc3QucmVzdWx0LnN0YXRlICE9PSBURVNUX1NUQVRFUy5GSU5JU0hFRCl7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXN0LnJlc3VsdC5wYXNzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgd29ya2VyLmtpbGwoKTtcbiAgICAgICAgICAgICAgICAgICAgdGVzdC5yZXN1bHQuc3RhdGUgPSBURVNUX1NUQVRFUy5USU1FT1VUO1xuICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkdvdCBzb21ldGhpbmcsIGJ1dCBkb24ndCBrbm93IHdoYXQuLi5cIiwgdGVzdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdGVzdC5fX21ldGEuY29uZi50aW1lb3V0KTtcblxuICAgICAgICAgICAgICAgIHNlbGYuX19kZWJ1Z0luZm8oYFdvcmtlciAke3dvcmtlci5waWR9IC0gc2V0IHRpbWVvdXQgZXZlbnQgYXQgYCtuZXcgRGF0ZSgpLmdldFRpbWUoKSArIFwiIGZvciBcIit0ZXN0Ll9fbWV0YS5jb25mLnRpbWVvdXQpO1xuXG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDaGVja3MgaWYgYWxsIHdvcmtlcnMgY29tcGxldGVkIHRoZWlyIGpvYiAoZmluaXNoZWQgb3IgaGF2ZSBiZWVuIHRlcm1pbmF0ZWQpLlxuICAgICAgICAgKiBJZiB0cnVlLCB0aGVuIHRoZSByZXBvcnRpbmcgc3RlcHMgY2FuIGJlIHN0YXJ0ZWQuXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfX2NoZWNrV29ya2Vyc1N0YXR1czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZih0aGlzLnNlc3Npb24ud29ya2Vycy5ydW5uaW5nID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fX2RvVGVzdFJlcG9ydHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgdGVzdCByZXBvcnRzIG9iamVjdCAoSlNPTikgdGhhdCB3aWxsIGJlIHNhdmVkIGluIHRoZSB0ZXN0IHJlcG9ydC5cbiAgICAgICAgICogRmlsZW5hbWUgb2YgdGhlIHJlcG9ydCBpcyB1c2luZyB0aGUgZm9sbG93aW5nIHBhdHRlcm46IHtwcmVmaXh9LXt0aW1lc3RhbXB9e2V4dH1cbiAgICAgICAgICogVGhlIGZpbGUgd2lsbCBiZSBzYXZlZCBpbiBjb25maWcucmVwb3J0cy5iYXNlUGF0aC5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9fZG9UZXN0UmVwb3J0czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLl9fY29uc29sZUxvZyhcIkRvaW5nIHJlcG9ydHMgLi4uXCIpO1xuICAgICAgICAgICAgcmVwb3J0RmlsZVN0cnVjdHVyZS5jb3VudCA9IHRoaXMudGVzdExpc3QubGVuZ3RoO1xuXG4gICAgICAgICAgICAvLyBwYXNzL2ZhaWxlZCB0ZXN0c1xuICAgICAgICAgICAgZm9yKGxldCBpID0gMCwgbGVuID0gdGhpcy50ZXN0TGlzdC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIGxldCB0ZXN0ID0gdGhpcy50ZXN0TGlzdFtpXTtcblxuICAgICAgICAgICAgICAgIGxldCB0ZXN0UGF0aCA9IHRoaXMuX190b1JlbGF0aXZlUGF0aCh0ZXN0LmRhdGEucGF0aCk7XG4gICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSB7cGF0aDogdGVzdFBhdGh9O1xuICAgICAgICAgICAgICAgIGlmKHRlc3QucmVzdWx0LnBhc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5yZWFzb24gPSB0aGlzLl9fZ2V0Rmlyc3RGYWlsUmVhc29uUGVyUnVuKHRlc3QpO1xuICAgICAgICAgICAgICAgICAgICByZXBvcnRGaWxlU3RydWN0dXJlLnBhc3NlZC5pdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0ucmVhc29uID0gdGhpcy5fX2dldEZpcnN0RmFpbFJlYXNvblBlclJ1bih0ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgcmVwb3J0RmlsZVN0cnVjdHVyZS5mYWlsZWQuaXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXBvcnRGaWxlU3RydWN0dXJlLnBhc3NlZC5jb3VudCA9IHJlcG9ydEZpbGVTdHJ1Y3R1cmUucGFzc2VkLml0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgIHJlcG9ydEZpbGVTdHJ1Y3R1cmUuZmFpbGVkLmNvdW50ID0gcmVwb3J0RmlsZVN0cnVjdHVyZS5mYWlsZWQuaXRlbXMubGVuZ3RoO1xuXG4gICAgICAgICAgICAvLyBzdWl0ZXMgKGZpcnN0IGxldmVsIG9mIGRpcmVjdG9yaWVzKVxuICAgICAgICAgICAgZm9yKGxldCBpID0gMCwgbGVuID0gdGhpcy50ZXN0VHJlZS5pdGVtcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIGxldCBpdGVtID0gdGhpcy50ZXN0VHJlZS5pdGVtc1tpXTtcbiAgICAgICAgICAgICAgICBpZihpdGVtLl9fbWV0YS5pc0RpcmVjdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgc3VpdGVQYXRoID0gdGhpcy5fX3RvUmVsYXRpdmVQYXRoKGl0ZW0uZGF0YS5wYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVwb3J0RmlsZVN0cnVjdHVyZS5zdWl0ZXMuaXRlbXMucHVzaChzdWl0ZVBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcG9ydEZpbGVTdHJ1Y3R1cmUuc3VpdGVzLmNvdW50ID0gcmVwb3J0RmlsZVN0cnVjdHVyZS5zdWl0ZXMuaXRlbXMubGVuZ3RoO1xuXG4gICAgICAgICAgICBsZXQgbnVtYmVyT2ZSZXBvcnRzID0gMjtcblxuICAgICAgICAgICAgbGV0IGZpbmlzaFJlcG9ydHMgPSAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgICAgICAgICBpZihudW1iZXJPZlJlcG9ydHMgPiAxKXtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyT2ZSZXBvcnRzIC09IDE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYocmVwb3J0RmlsZVN0cnVjdHVyZS5mYWlsZWQuY291bnQgPT09IDApe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fY29uc29sZUxvZyhcIlxcbkV2ZXJ5dGhpbmcgd2VudCB3ZWxsISBObyBmYWlsZWQgdGVzdHMuXFxuXFxuXCIpO1xuICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fY29uc29sZUxvZyhcIlxcblNvbWUgdGVzdHMgZmFpbGVkLiBDaGVjayByZXBvcnQgZmlsZXMhXFxuXFxuXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2soZXJyLCBcIkRvbmVcIik7XG4gICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgICAgIHRoaXMuX19jb25zb2xlTG9nKHRoaXMuY29uZmlnLnJlcG9ydHMucHJlZml4KTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gYCR7dGhpcy5jb25maWcucmVwb3J0cy5wcmVmaXh9bGF0ZXN0JHt0aGlzLmNvbmZpZy5yZXBvcnRzLmV4dH1gO1xuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4odGhpcy5jb25maWcucmVwb3J0cy5iYXNlUGF0aCwgZmlsZU5hbWUpO1xuICAgICAgICAgICAgdGhpcy5fX3NhdmVSZXBvcnRUb0ZpbGUocmVwb3J0RmlsZVN0cnVjdHVyZSwgZmlsZVBhdGgsIGZpbmlzaFJlcG9ydHMpO1xuXG4gICAgICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKS50b1N0cmluZygpO1xuICAgICAgICAgICAgY29uc3QgaHRtbEZpbGVOYW1lID0gYCR7dGhpcy5jb25maWcucmVwb3J0cy5wcmVmaXh9bGF0ZXN0Lmh0bWxgO1xuICAgICAgICAgICAgY29uc3QgaHRtbEZpbGVQYXRoID0gcGF0aC5qb2luKHRoaXMuY29uZmlnLnJlcG9ydHMuYmFzZVBhdGgsIGh0bWxGaWxlTmFtZSk7XG4gICAgICAgICAgICB0aGlzLl9fc2F2ZUh0bWxSZXBvcnRUb0ZpbGUocmVwb3J0RmlsZVN0cnVjdHVyZSwgaHRtbEZpbGVQYXRoLCB0aW1lc3RhbXAsIGZpbmlzaFJlcG9ydHMpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogU2F2ZXMgdGVzdCByZXBvcnRzIG9iamVjdCAoSlNPTikgaW4gdGhlIHNwZWNpZmllZCBwYXRoLlxuICAgICAgICAgKiBAcGFyYW0gcmVwb3J0RmlsZVN0cnVjdHVyZSB7T2JqZWN0fSAtIHRlc3QgcmVwb3J0cyBvYmplY3QgKEpTT04pXG4gICAgICAgICAqIEBwYXJhbSBkZXN0aW5hdGlvbiB7U3RyaW5nfSAtIHBhdGggb2YgdGhlIGZpbGUgcmVwb3J0ICh0aGUgYmFzZSBwYXRoIE1VU1QgZXhpc3QpXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfX3NhdmVSZXBvcnRUb0ZpbGU6IGZ1bmN0aW9uKHJlcG9ydEZpbGVTdHJ1Y3R1cmUsIGRlc3RpbmF0aW9uLCBjYWxsYmFjaykge1xuXG4gICAgICAgICAgICB2YXIgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KHJlcG9ydEZpbGVTdHJ1Y3R1cmUsIG51bGwsIDQpO1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlKGRlc3RpbmF0aW9uLCBjb250ZW50LCAndXRmOCcsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBcIkFuIGVycm9yIG9jY3VycmVkIHdoaWxlIHdyaXRpbmcgdGhlIHJlcG9ydCBmaWxlLCB3aXRoIHRoZSBmb2xsb3dpbmcgZXJyb3I6IFwiICsgSlNPTi5zdHJpbmdpZnkoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2RlYnVnSW5mbyhtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgICAgIH0gZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGBGaW5pc2hlZCB3cml0aW5nIHJlcG9ydCB0byAke2Rlc3RpbmF0aW9ufWA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19jb25zb2xlTG9nKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNhdmVzIHRlc3QgcmVwb3J0cyBhcyBIVE1MIGluIHRoZSBzcGVjaWZpZWQgcGF0aC5cbiAgICAgICAgICogQHBhcmFtIHJlcG9ydEZpbGVTdHJ1Y3R1cmUge09iamVjdH0gLSB0ZXN0IHJlcG9ydHMgb2JqZWN0IChKU09OKVxuICAgICAgICAgKiBAcGFyYW0gZGVzdGluYXRpb24ge1N0cmluZ30gLSBwYXRoIG9mIHRoZSBmaWxlIHJlcG9ydCAodGhlIGJhc2UgcGF0aCBNVVNUIGV4aXN0KVxuICAgICAgICAgKiBAcGFyYW0gdGltZXN0YW1wIHtTdHJpbmd9IC0gdGltZXN0YW1wIHRvIGJlIGluamVjdGVkIGluIGh0bWwgdGVtcGxhdGVcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9fc2F2ZUh0bWxSZXBvcnRUb0ZpbGU6IGZ1bmN0aW9uIChyZXBvcnRGaWxlU3RydWN0dXJlLCBkZXN0aW5hdGlvbiwgdGltZXN0YW1wLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGZvbGRlck5hbWUgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lKTtcbiAgICAgICAgICAgIGZzLnJlYWRGaWxlKHBhdGguam9pbihmb2xkZXJOYW1lLCcvdXRpbHMvcmVwb3J0VGVtcGxhdGUuaHRtbCcpLCAndXRmOCcsIChlcnIsIHJlcykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9ICdBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSByZWFkaW5nIHRoZSBodG1sIHJlcG9ydCB0ZW1wbGF0ZSBmaWxlLCB3aXRoIHRoZSBmb2xsb3dpbmcgZXJyb3I6ICcgKyBKU09OLnN0cmluZ2lmeShlcnIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fZGVidWdJbmZvKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlKGRlc3RpbmF0aW9uLCByZXMgKyBgPHNjcmlwdD5pbml0KCR7SlNPTi5zdHJpbmdpZnkocmVwb3J0RmlsZVN0cnVjdHVyZSl9LCAke3RpbWVzdGFtcH0pOzwvc2NyaXB0PmAsICd1dGY4JywgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIHdyaXRpbmcgdGhlIGh0bWwgcmVwb3J0IGZpbGUsIHdpdGggdGhlIGZvbGxvd2luZyBlcnJvcjogJyArIEpTT04uc3RyaW5naWZ5KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9fZGVidWdJbmZvKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGBGaW5pc2hlZCB3cml0aW5nIHJlcG9ydCB0byAke2Rlc3RpbmF0aW9ufWA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19jb25zb2xlTG9nKG1lc3NhZ2UpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnZlcnRzIGFic29sdXRlIGZpbGUgcGF0aCB0byByZWxhdGl2ZSBwYXRoLlxuICAgICAgICAgKiBAcGFyYW0gYWJzb2x1dGVQYXRoIHtTdHJpbmd9IC0gYWJzb2x1dGUgcGF0aFxuICAgICAgICAgKiBAcmV0dXJucyB7c3RyaW5nIHwgdm9pZCB8ICp9IC0gcmVsYXRpdmUgcGF0aFxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX190b1JlbGF0aXZlUGF0aDogZnVuY3Rpb24oYWJzb2x1dGVQYXRoKSB7XG4gICAgICAgICAgICBjb25zdCBiYXNlUGF0aCA9IHBhdGguam9pbih0aGlzLmNvbmZpZy50ZXN0c0RpciwgXCIvXCIpO1xuICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVQYXRoID0gYWJzb2x1dGVQYXRoLnJlcGxhY2UoYmFzZVBhdGgsIFwiXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHJlbGF0aXZlUGF0aDtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENoZWNrcyBpZiBhIGRpcmVjdG9yeSBpcyBhIHRlc3QgZGlyLCBieSBtYXRjaGluZyBpdHMgbmFtZSBhZ2FpbnN0IGNvbmZpZy5tYXRjaERpcnMgYXJyYXkuXG4gICAgICAgICAqIEBwYXJhbSBkaXIge1N0cmluZ30gLSBkaXJlY3RvcnkgbmFtZVxuICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSByZXR1cm5zIHRydWUgaWYgdGhlcmUgaXMgYSBtYXRjaCBhbmQgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX19pc1Rlc3REaXI6IGZ1bmN0aW9uKGRpcikge1xuICAgICAgICAgICAgaWYoIXRoaXMuY29uZmlnIHx8ICF0aGlzLmNvbmZpZy5tYXRjaERpcnMgKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgYG1hdGNoRGlycyBpcyBub3QgZGVmaW5lZCBvbiBjb25maWcgJHtKU09OLnN0cmluZ2lmeSh0aGlzLmNvbmZpZyl9IGRvZXMgbm90IGV4aXN0IWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpc1Rlc3REaXIgPSB0aGlzLmNvbmZpZy5tYXRjaERpcnMuc29tZShmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRpci50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGl0ZW0udG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIGlzVGVzdERpcjtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZvciBhIGZhaWxlZCB0ZXN0LCBpdCByZXR1cm5zIG9ubHkgdGhlIGZpcnN0IGZhaWwgcmVhc29uIHBlciBlYWNoIHJ1bi5cbiAgICAgICAgICogQHBhcmFtIHRlc3Qge09iamVjdH0gLSB0ZXN0IG9iamVjdFxuICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXl9IC0gYW4gYXJyYXkgb2YgcmVhc29ucyBwZXIgZWFjaCB0ZXN0IHJ1bi5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9fZ2V0Rmlyc3RGYWlsUmVhc29uUGVyUnVuOiBmdW5jdGlvbih0ZXN0KSB7XG4gICAgICAgICAgICBjb25zdCByZWFzb24gPSBbXTtcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDE7IGkgPD0gdGVzdC5yZXN1bHQucnVuczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYodGVzdC5yZXN1bHQuYXNzZXJ0c1tpXSAmJiB0ZXN0LnJlc3VsdC5hc3NlcnRzW2ldLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkUmVhc29uKGksIHRlc3QucmVzdWx0LmFzc2VydHNbaV1bMF0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmKHRlc3QucmVzdWx0Lm1lc3NhZ2VzW2ldICYmIHRlc3QucmVzdWx0Lm1lc3NhZ2VzW2ldLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkUmVhc29uKGksIHRlc3QucmVzdWx0Lm1lc3NhZ2VzW2ldWzBdKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBhZGRSZWFzb24ocnVuLCBsb2cpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bjogcnVuLFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nOiBsb2dcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICByZWFzb24ucHVzaChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiByZWFzb247XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZXNjcmliZWQgZGVmYXVsdCB0cmVlIG5vZGUgc3RydWN0dXJlLlxuICAgICAgICAgKiBAcmV0dXJucyB7e19fbWV0YToge2NvbmY6IG51bGwsIHBhcmVudDogbnVsbCwgaXNEaXJlY3Rvcnk6IGJvb2xlYW59LCBkYXRhOiB7bmFtZTogbnVsbCwgcGF0aDogbnVsbH0sIHJlc3VsdDoge3N0YXRlOiBzdHJpbmcsIHBhc3M6IG51bGwsIGV4ZWN1dGlvblRpbWU6IG51bWJlciwgcnVuczogbnVtYmVyLCBhc3NlcnRzOiB7fSwgbWVzc2FnZXM6IHt9fSwgaXRlbXM6IG51bGx9fVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX19nZXREZWZhdWx0Tm9kZVN0cnVjdHVyZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gIHtcbiAgICAgICAgICAgICAgICBfX21ldGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29uZjogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBpc0RpcmVjdG9yeTogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogbnVsbCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZTogVEVTVF9TVEFURVMuUkVBRFksIC8vIHJlYWR5IHwgcnVubmluZyB8IHRlcm1pbmF0ZWQgfCB0aW1lb3V0XG4gICAgICAgICAgICAgICAgICAgIHBhc3M6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGV4ZWN1dGlvblRpbWU6IDAsXG4gICAgICAgICAgICAgICAgICAgIHJ1bnM6IDAsXG4gICAgICAgICAgICAgICAgICAgIGFzc2VydHM6IHt9LFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczoge31cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGl0ZW1zOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogTWF0Y2ggYSB0ZXN0IGZpbGUgcGF0aCB0byBhIFVOSVggZ2xvYiBleHByZXNzaW9uIGFycmF5LiBJZiBpdHMgYW55IG1hdGNoIHJldHVybnMgdHJ1ZSwgb3RoZXJ3aXNlIHJldHVybnMgZmFsc2UuXG4gICAgICAgICAqIEBwYXJhbSBnbG9iRXhwQXJyYXkge0FycmF5fSAtIGFuIGFycmF5IHdpdGggZ2xvYiBleHByZXNzaW9uIChVTklYIHN0eWxlKVxuICAgICAgICAgKiBAcGFyYW0gc3RyIHtTdHJpbmd9IC0gdGhlIHN0cmluZyB0byBiZSBtYXRjaGVkXG4gICAgICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIHJldHVybnMgdHJ1ZSBpZiB0aGVyZSBpcyBhbnkgbWF0Y2ggYW5kIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9faXNBbnlNYXRjaDogZnVuY3Rpb24oZ2xvYkV4cEFycmF5LCBzdHIpIHtcbiAgICAgICAgICAgIGNvbnN0IGhhc01hdGNoID0gZnVuY3Rpb24oZ2xvYkV4cCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlZ2V4ID0gZ2xvYlRvUmVnRXhwKGdsb2JFeHApO1xuICAgICAgICAgICAgICAgIHJldHVybiByZWdleC50ZXN0KHN0cik7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gZ2xvYkV4cEFycmF5LnNvbWUoaGFzTWF0Y2gpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogQ29udmVydHMgYSB0cmVlIHN0cnVjdHVyZSBpbnRvIGFuIGFycmF5IGxpc3Qgb2YgdGVzdCBub2Rlcy4gVGhlIHRyZWUgdHJhdmVyc2FsIGlzIERGUyAoRGVlcC1GaXJzdC1TZWFyY2gpLlxuICAgICAgICAgKiBAcGFyYW0gcm9vdE5vZGUge09iamVjdH0gLSByb290IG5vZGUgb2YgdGhlIHRlc3QgdHJlZS5cbiAgICAgICAgICogQHJldHVybnMge0FycmF5fSAtIExpc3Qgb2YgdGVzdCBub2Rlcy5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9fdG9UZXN0VHJlZVRvTGlzdDogZnVuY3Rpb24ocm9vdE5vZGUpIHtcbiAgICAgICAgICAgIHZhciB0ZXN0TGlzdCA9IFtdO1xuXG4gICAgICAgICAgICB0cmF2ZXJzZShyb290Tm9kZSk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHRyYXZlcnNlKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZighbm9kZS5fX21ldGEuaXNEaXJlY3RvcnkgfHwgIW5vZGUuaXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZvcihsZXQgaSA9IDAsIGxlbiA9IG5vZGUuaXRlbXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IG5vZGUuaXRlbXNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmKGl0ZW0uX19tZXRhLmlzRGlyZWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZXJzZShpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RMaXN0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0ZXN0TGlzdDtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIExvZ2dpbmcgdG8gY29uc29sZSB3cmFwcGVyLlxuICAgICAgICAgKiBAcGFyYW0gbG9nIHtTdHJpbmd8T2JqZWN0fE51bWJlcn0gLSBsb2cgbWVzc2FnZVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX19jb25zb2xlTG9nOiBmdW5jdGlvbihsb2cpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFRBRywgbG9nKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIExvZ2dpbmcgZGVidWdnaW5nIGluZm8gbWVzc2FnZXMgd3JhcHBlci5cbiAgICAgICAgICogTG9nZ2VyOiBjb25zb2xlLmluZm9cbiAgICAgICAgICogQHBhcmFtIGxvZyB7U3RyaW5nfE9iamVjdHxOdW1iZXJ9IC0gbG9nIG1lc3NhZ2VcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9fZGVidWdJbmZvOiBmdW5jdGlvbihsb2cpIHtcbiAgICAgICAgICAgIHRoaXMuX19kZWJ1Zyhjb25zb2xlLmluZm8sIGxvZyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMb2dnaW5nIGRlYnVnZ2luZyBlcnJvciBtZXNzYWdlcyB3cmFwcGVyLlxuICAgICAgICAgKiBMb2dnZXI6IGNvbnNvbGUuZXJyb3JcbiAgICAgICAgICogQHBhcmFtIGxvZyB7U3RyaW5nfE9iamVjdHxOdW1iZXJ9IC0gbG9nIG1lc3NhZ2VcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9fZGVidWdFcnJvcjogZnVuY3Rpb24obG9nKSB7XG4gICAgICAgICAgICB0aGlzLl9fZGVidWcoY29uc29sZS5lcnJvciwgbG9nKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqICBMb2dnaW5nIGRlYnVnZ2luZyBtZXNzYWdlcyB3cmFwcGVyLiBPbmUgZGVidWcgbW9kZSwgdGhlIGxvZ2dpbmcgaXMgc2lsZW50LlxuICAgICAgICAgKiBAcGFyYW0gbG9nZ2VyIHtGdW5jdGlvbn0gLSBoYW5kbGVyIGZvciBsb2dnaW5nXG4gICAgICAgICAqIEBwYXJhbSBsb2cge1N0cmluZ3xPYmplY3R8TnVtYmVyfSAtIGxvZyBtZXNzYWdlXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfX2RlYnVnOiBmdW5jdGlvbihsb2dnZXIsIGxvZykge1xuICAgICAgICAgICAgaWYoIURFQlVHKSB7cmV0dXJuO31cblxuICAgICAgICAgICAgLy8gbGV0IHByZXR0eUxvZyA9IEpTT04uc3RyaW5naWZ5KGxvZywgbnVsbCwgMik7XG4gICAgICAgICAgICBsb2dnZXIoXCJERUJVR1wiLCBsb2cpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRGVlcCBleHRlbmQgb25lIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgb2YgYW5vdGhlciBvYmplY3QuXG4gICAgICAgICAqIElmIHRoZSBwcm9wZXJ0eSBleGlzdHMgaW4gYm90aCBvYmplY3RzIHRoZSBwcm9wZXJ0eSBmcm9tIHRoZSBmaXJzdCBvYmplY3QgaXMgb3ZlcnJpZGRlbi5cbiAgICAgICAgICogQHBhcmFtIGZpcnN0IHtPYmplY3R9IC0gdGhlIGZpcnN0IG9iamVjdFxuICAgICAgICAgKiBAcGFyYW0gc2Vjb25kIHtPYmplY3R9IC0gdGhlIHNlY29uZCBvYmplY3RcbiAgICAgICAgICogQHJldHVybnMge09iamVjdH0gLSBhbiBvYmplY3Qgd2l0aCBib3RoIHByb3BlcnRpZXMgZnJvbSB0aGUgZmlyc3QgYW5kIHNlY29uZCBvYmplY3QuXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfX2V4dGVuZDogZnVuY3Rpb24gKGZpcnN0LCBzZWNvbmQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIHNlY29uZCkge1xuICAgICAgICAgICAgICAgIGlmICghZmlyc3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdFtrZXldID0gc2Vjb25kW2tleV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhbCA9IHNlY29uZFtrZXldO1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgZmlyc3Rba2V5XSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IHRoaXMuX19leHRlbmQoZmlyc3Rba2V5XSwgc2Vjb25kW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZmlyc3Rba2V5XSA9IHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmaXJzdDtcbiAgICAgICAgfVxuICAgIH07XG59O1xuIiwiXG4vLyBnbG9iVG9SZWdFeHAgdHVybnMgYSBVTklYIGdsb2IgZXhwcmVzc2lvbiBpbnRvIGEgUmVnRXggZXhwcmVzc2lvbi5cbi8vICBTdXBwb3J0cyBhbGwgc2ltcGxlIGdsb2IgcGF0dGVybnMuIEV4YW1wbGVzOiAqLmV4dCwgL2Zvby8qLCAuLi8uLi9wYXRoLCBeZm9vLipcbi8vIC0gc2luZ2xlIGNoYXJhY3RlciBtYXRjaGluZywgbWF0Y2hpbmcgcmFuZ2VzIG9mIGNoYXJhY3RlcnMgZXRjLiBncm91cCBtYXRjaGluZyBhcmUgbm8gc3VwcG9ydGVkXG4vLyAtIGZsYWdzIGFyZSBub3Qgc3VwcG9ydGVkXG52YXIgZ2xvYlRvUmVnRXhwID0gZnVuY3Rpb24gKGdsb2JFeHApIHtcbiAgICBpZiAodHlwZW9mIGdsb2JFeHAgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0dsb2IgRXhwcmVzc2lvbiBtdXN0IGJlIGEgc3RyaW5nIScpO1xuICAgIH1cblxuICAgIHZhciByZWdFeHAgPSBcIlwiO1xuXG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IGdsb2JFeHAubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgbGV0IGMgPSBnbG9iRXhwW2ldO1xuXG4gICAgICAgIHN3aXRjaCAoYykge1xuICAgICAgICAgICAgY2FzZSBcIi9cIjpcbiAgICAgICAgICAgIGNhc2UgXCIkXCI6XG4gICAgICAgICAgICBjYXNlIFwiXlwiOlxuICAgICAgICAgICAgY2FzZSBcIitcIjpcbiAgICAgICAgICAgIGNhc2UgXCIuXCI6XG4gICAgICAgICAgICBjYXNlIFwiKFwiOlxuICAgICAgICAgICAgY2FzZSBcIilcIjpcbiAgICAgICAgICAgIGNhc2UgXCI9XCI6XG4gICAgICAgICAgICBjYXNlIFwiIVwiOlxuICAgICAgICAgICAgY2FzZSBcInxcIjpcbiAgICAgICAgICAgICAgICByZWdFeHAgKz0gXCJcXFxcXCIgKyBjO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwiKlwiOlxuICAgICAgICAgICAgICAgIC8vIHRyZWF0IGFueSBudW1iZXIgb2YgXCIqXCIgYXMgb25lXG4gICAgICAgICAgICAgICAgd2hpbGUoZ2xvYkV4cFtpICsgMV0gPT09IFwiKlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVnRXhwICs9IFwiLipcIjtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZWdFeHAgKz0gYztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIHNldCB0aGUgcmVndWxhciBleHByZXNzaW9uIHdpdGggXiAmICRcbiAgICByZWdFeHAgPSBcIl5cIiArIHJlZ0V4cCArIFwiJFwiO1xuXG4gICAgcmV0dXJuIG5ldyBSZWdFeHAocmVnRXhwKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZ2xvYlRvUmVnRXhwOyIsImNvbnN0IHV0aWxzID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIik7XG5jb25zdCBPd00gPSB1dGlscy5Pd007XG52YXIgYmVlc0hlYWxlciA9IHV0aWxzLmJlZXNIZWFsZXI7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuXG5cbi8vVE9ETzogcHJldmVudCBhIGNsYXNzIG9mIHJhY2UgY29uZGl0aW9uIHR5cGUgb2YgZXJyb3JzIGJ5IHNpZ25hbGluZyB3aXRoIGZpbGVzIG1ldGFkYXRhIHRvIHRoZSB3YXRjaGVyIHdoZW4gaXQgaXMgc2FmZSB0byBjb25zdW1lXG5cbmZ1bmN0aW9uIEZvbGRlck1RKGZvbGRlciwgY2FsbGJhY2sgPSAoKSA9PiB7fSl7XG5cblx0aWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdH1cblxuXHRmb2xkZXIgPSBwYXRoLm5vcm1hbGl6ZShmb2xkZXIpO1xuXG5cdGZzLm1rZGlyKGZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIGZ1bmN0aW9uKGVyciwgcmVzKXtcblx0XHRmcy5leGlzdHMoZm9sZGVyLCBmdW5jdGlvbihleGlzdHMpIHtcblx0XHRcdGlmIChleGlzdHMpIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIGZvbGRlcik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cblx0ZnVuY3Rpb24gbWtGaWxlTmFtZShzd2FybVJhdyl7XG5cdFx0bGV0IG1ldGEgPSBPd00ucHJvdG90eXBlLmdldE1ldGFGcm9tKHN3YXJtUmF3KTtcblx0XHRsZXQgbmFtZSA9IGAke2ZvbGRlcn0ke3BhdGguc2VwfSR7bWV0YS5zd2FybUlkfS4ke21ldGEuc3dhcm1UeXBlTmFtZX1gO1xuXHRcdGNvbnN0IHVuaXF1ZSA9IG1ldGEucGhhc2VJZCB8fCAkJC51aWRHZW5lcmF0b3Iuc2FmZV91dWlkKCk7XG5cblx0XHRuYW1lID0gbmFtZStgLiR7dW5pcXVlfWA7XG5cdFx0cmV0dXJuIHBhdGgubm9ybWFsaXplKG5hbWUpO1xuXHR9XG5cblx0dGhpcy5nZXRIYW5kbGVyID0gZnVuY3Rpb24oKXtcblx0XHRpZihwcm9kdWNlcil7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IG9uZSBjb25zdW1lciBpcyBhbGxvd2VkIVwiKTtcblx0XHR9XG5cdFx0cHJvZHVjZXIgPSB0cnVlO1xuXHRcdHJldHVybiB7XG5cdFx0XHRzZW5kU3dhcm1TZXJpYWxpemF0aW9uOiBmdW5jdGlvbihzZXJpYWxpemF0aW9uLCBjYWxsYmFjayl7XG5cdFx0XHRcdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHdyaXRlRmlsZShta0ZpbGVOYW1lKEpTT04ucGFyc2Uoc2VyaWFsaXphdGlvbikpLCBzZXJpYWxpemF0aW9uLCBjYWxsYmFjayk7XG5cdFx0XHR9LFxuXHRcdFx0YWRkU3RyZWFtIDogZnVuY3Rpb24oc3RyZWFtLCBjYWxsYmFjayl7XG5cdFx0XHRcdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYoIXN0cmVhbSB8fCAhc3RyZWFtLnBpcGUgfHwgdHlwZW9mIHN0cmVhbS5waXBlICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJTb21ldGhpbmcgd3JvbmcgaGFwcGVuZWRcIikpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0bGV0IHN3YXJtID0gXCJcIjtcblx0XHRcdFx0c3RyZWFtLm9uKCdkYXRhJywgKGNodW5rKSA9Pntcblx0XHRcdFx0XHRzd2FybSArPSBjaHVuaztcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0c3RyZWFtLm9uKFwiZW5kXCIsICgpID0+IHtcblx0XHRcdFx0XHR3cml0ZUZpbGUobWtGaWxlTmFtZShKU09OLnBhcnNlKHN3YXJtKSksIHN3YXJtLCBjYWxsYmFjayk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHN0cmVhbS5vbihcImVycm9yXCIsIChlcnIpID0+e1xuXHRcdFx0XHRcdGNhbGxiYWNrKGVycik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdGFkZFN3YXJtIDogZnVuY3Rpb24oc3dhcm0sIGNhbGxiYWNrKXtcblx0XHRcdFx0aWYoIWNhbGxiYWNrKXtcblx0XHRcdFx0XHRjYWxsYmFjayA9ICQkLmRlZmF1bHRFcnJvckhhbmRsaW5nSW1wbGVtZW50YXRpb247XG5cdFx0XHRcdH1lbHNlIGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YmVlc0hlYWxlci5hc0pTT04oc3dhcm0sbnVsbCwgbnVsbCwgZnVuY3Rpb24oZXJyLCByZXMpe1xuXHRcdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHdyaXRlRmlsZShta0ZpbGVOYW1lKHJlcyksIEoocmVzKSwgY2FsbGJhY2spO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHRzZW5kU3dhcm1Gb3JFeGVjdXRpb246IGZ1bmN0aW9uKHN3YXJtLCBjYWxsYmFjayl7XG5cdFx0XHRcdGlmKCFjYWxsYmFjayl7XG5cdFx0XHRcdFx0Y2FsbGJhY2sgPSAkJC5kZWZhdWx0RXJyb3JIYW5kbGluZ0ltcGxlbWVudGF0aW9uO1xuXHRcdFx0XHR9ZWxzZSBpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJlZXNIZWFsZXIuYXNKU09OKHN3YXJtLCBPd00ucHJvdG90eXBlLmdldE1ldGFGcm9tKHN3YXJtLCBcInBoYXNlTmFtZVwiKSwgT3dNLnByb3RvdHlwZS5nZXRNZXRhRnJvbShzd2FybSwgXCJhcmdzXCIpLCBmdW5jdGlvbihlcnIsIHJlcyl7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dmFyIGZpbGUgPSBta0ZpbGVOYW1lKHJlcyk7XG5cdFx0XHRcdFx0dmFyIGNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShyZXMpO1xuXG5cdFx0XHRcdFx0Ly9pZiB0aGVyZSBhcmUgbm8gbW9yZSBGRCdzIGZvciBmaWxlcyB0byBiZSB3cml0dGVuIHdlIHJldHJ5LlxuXHRcdFx0XHRcdGZ1bmN0aW9uIHdyYXBwZXIoZXJyb3IsIHJlc3VsdCl7XG5cdFx0XHRcdFx0XHRpZihlcnJvcil7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGBDYXVnaHQgYW4gd3JpdGUgZXJyb3IuIFJldHJ5IHRvIHdyaXRlIGZpbGUgWyR7ZmlsZX1dYCk7XG5cdFx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdFx0XHRcdFx0XHR3cml0ZUZpbGUoZmlsZSwgY29udGVudCwgd3JhcHBlcik7XG5cdFx0XHRcdFx0XHRcdH0sIDEwKTtcblx0XHRcdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyb3IsIHJlc3VsdCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0d3JpdGVGaWxlKGZpbGUsIGNvbnRlbnQsIHdyYXBwZXIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9O1xuXHR9O1xuXG5cdHZhciByZWNpcGllbnQ7XG5cdHRoaXMuc2V0SVBDQ2hhbm5lbCA9IGZ1bmN0aW9uKHByb2Nlc3NDaGFubmVsKXtcblx0XHRpZihwcm9jZXNzQ2hhbm5lbCAmJiAhcHJvY2Vzc0NoYW5uZWwuc2VuZCB8fCAodHlwZW9mIHByb2Nlc3NDaGFubmVsLnNlbmQpICE9IFwiZnVuY3Rpb25cIil7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJSZWNpcGllbnQgaXMgbm90IGluc3RhbmNlIG9mIHByb2Nlc3MvY2hpbGRfcHJvY2VzcyBvciBpdCB3YXMgbm90IHNwYXduZWQgd2l0aCBJUEMgY2hhbm5lbCFcIik7XG5cdFx0fVxuXHRcdHJlY2lwaWVudCA9IHByb2Nlc3NDaGFubmVsO1xuXHRcdGlmKGNvbnN1bWVyKXtcblx0XHRcdGNvbnNvbGUubG9nKGBDaGFubmVsIHVwZGF0ZWRgKTtcblx0XHRcdChyZWNpcGllbnQgfHwgcHJvY2Vzcykub24oXCJtZXNzYWdlXCIsIHJlY2VpdmVFbnZlbG9wZSk7XG5cdFx0fVxuXHR9O1xuXG5cblx0dmFyIGNvbnN1bWVkTWVzc2FnZXMgPSB7fTtcblxuXHRmdW5jdGlvbiBjaGVja0lmQ29uc3VtbWVkKG5hbWUsIG1lc3NhZ2Upe1xuXHRcdGNvbnN0IHNob3J0TmFtZSA9IHBhdGguYmFzZW5hbWUobmFtZSk7XG5cdFx0Y29uc3QgcHJldmlvdXNTYXZlZCA9IGNvbnN1bWVkTWVzc2FnZXNbc2hvcnROYW1lXTtcblx0XHRsZXQgcmVzdWx0ID0gZmFsc2U7XG5cdFx0aWYocHJldmlvdXNTYXZlZCAmJiAhcHJldmlvdXNTYXZlZC5sb2NhbGVDb21wYXJlKG1lc3NhZ2UpKXtcblx0XHRcdHJlc3VsdCA9IHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBzYXZlMkhpc3RvcnkoZW52ZWxvcGUpe1xuXHRcdGNvbnN1bWVkTWVzc2FnZXNbcGF0aC5iYXNlbmFtZShlbnZlbG9wZS5uYW1lKV0gPSBlbnZlbG9wZS5tZXNzYWdlO1xuXHR9XG5cblx0ZnVuY3Rpb24gYnVpbGRFbnZlbG9wZUNvbmZpcm1hdGlvbihlbnZlbG9wZSwgc2F2ZUhpc3Rvcnkpe1xuXHRcdGlmKHNhdmVIaXN0b3J5KXtcblx0XHRcdHNhdmUySGlzdG9yeShlbnZlbG9wZSk7XG5cdFx0fVxuXHRcdHJldHVybiBgQ29uZmlybSBlbnZlbG9wZSAke2VudmVsb3BlLnRpbWVzdGFtcH0gc2VudCB0byAke2VudmVsb3BlLmRlc3R9YDtcblx0fVxuXG5cdGZ1bmN0aW9uIGJ1aWxkRW52ZWxvcGUobmFtZSwgbWVzc2FnZSl7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGRlc3Q6IGZvbGRlcixcblx0XHRcdHNyYzogcHJvY2Vzcy5waWQsXG5cdFx0XHR0aW1lc3RhbXA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZSxcblx0XHRcdG5hbWU6IG5hbWVcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gcmVjZWl2ZUVudmVsb3BlKGVudmVsb3BlKXtcblx0XHRpZighZW52ZWxvcGUgfHwgdHlwZW9mIGVudmVsb3BlICE9PSBcIm9iamVjdFwiKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Ly9jb25zb2xlLmxvZyhcInJlY2VpdmVkIGVudmVsb3BlXCIsIGVudmVsb3BlLCBmb2xkZXIpO1xuXG5cdFx0aWYoZW52ZWxvcGUuZGVzdCAhPT0gZm9sZGVyICYmIGZvbGRlci5pbmRleE9mKGVudmVsb3BlLmRlc3QpIT09IC0xICYmIGZvbGRlci5sZW5ndGggPT09IGVudmVsb3BlLmRlc3QrMSl7XG5cdFx0XHRjb25zb2xlLmxvZyhcIlRoaXMgZW52ZWxvcGUgaXMgbm90IGZvciBtZSFcIik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0bGV0IG1lc3NhZ2UgPSBlbnZlbG9wZS5tZXNzYWdlO1xuXG5cdFx0aWYoY2FsbGJhY2spe1xuXHRcdFx0Ly9jb25zb2xlLmxvZyhcIlNlbmRpbmcgY29uZmlybWF0aW9uXCIsIHByb2Nlc3MucGlkKTtcblx0XHRcdHJlY2lwaWVudC5zZW5kKGJ1aWxkRW52ZWxvcGVDb25maXJtYXRpb24oZW52ZWxvcGUsIHRydWUpKTtcblx0XHRcdGNvbnN1bWVyKG51bGwsIEpTT04ucGFyc2UobWVzc2FnZSkpO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMucmVnaXN0ZXJBc0lQQ0NvbnN1bWVyID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuXHRcdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlRoZSBhcmd1bWVudCBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHR9XG5cdFx0cmVnaXN0ZXJlZEFzSVBDQ29uc3VtZXIgPSB0cnVlO1xuXHRcdC8vd2lsbCByZWdpc3RlciBhcyBub3JtYWwgY29uc3VtZXIgaW4gb3JkZXIgdG8gY29uc3VtZSBhbGwgZXhpc3RpbmcgbWVzc2FnZXMgYnV0IHdpdGhvdXQgc2V0dGluZyB0aGUgd2F0Y2hlclxuXHRcdHRoaXMucmVnaXN0ZXJDb25zdW1lcihjYWxsYmFjaywgdHJ1ZSwgKHdhdGNoZXIpID0+ICF3YXRjaGVyKTtcblxuXHRcdC8vY29uc29sZS5sb2coXCJSZWdpc3RlcmVkIGFzIElQQyBDb25zdW1tZXJcIiwgKTtcblx0XHQocmVjaXBpZW50IHx8IHByb2Nlc3MpLm9uKFwibWVzc2FnZVwiLCByZWNlaXZlRW52ZWxvcGUpO1xuXHR9O1xuXG5cdHRoaXMucmVnaXN0ZXJDb25zdW1lciA9IGZ1bmN0aW9uIChjYWxsYmFjaywgc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkID0gdHJ1ZSwgc2hvdWxkV2FpdEZvck1vcmUgPSAod2F0Y2hlcikgPT4gdHJ1ZSkge1xuXHRcdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkZpcnN0IHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHR9XG5cdFx0aWYgKGNvbnN1bWVyKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IG9uZSBjb25zdW1lciBpcyBhbGxvd2VkISBcIiArIGZvbGRlcik7XG5cdFx0fVxuXG5cdFx0Y29uc3VtZXIgPSBjYWxsYmFjaztcblxuXHRcdGZzLm1rZGlyKGZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIGZ1bmN0aW9uIChlcnIsIHJlcykge1xuXHRcdFx0aWYgKGVyciAmJiAoZXJyLmNvZGUgIT09ICdFRVhJU1QnKSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3VtZUFsbEV4aXN0aW5nKHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgc2hvdWxkV2FpdEZvck1vcmUpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMud3JpdGVNZXNzYWdlID0gd3JpdGVGaWxlO1xuXG5cdHRoaXMudW5saW5rQ29udGVudCA9IGZ1bmN0aW9uIChtZXNzYWdlSWQsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgbWVzc2FnZVBhdGggPSBwYXRoLmpvaW4oZm9sZGVyLCBtZXNzYWdlSWQpO1xuXG5cdFx0ZnMudW5saW5rKG1lc3NhZ2VQYXRoLCAoZXJyKSA9PiB7XG5cdFx0XHRjYWxsYmFjayhlcnIpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMuZGlzcG9zZSA9IGZ1bmN0aW9uKGZvcmNlKXtcblx0XHRpZih0eXBlb2YgZm9sZGVyICE9IFwidW5kZWZpbmVkXCIpe1xuXHRcdFx0dmFyIGZpbGVzO1xuXHRcdFx0dHJ5e1xuXHRcdFx0XHRmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKGZvbGRlcik7XG5cdFx0XHR9Y2F0Y2goZXJyb3Ipe1xuXHRcdFx0XHQvLy4uXG5cdFx0XHR9XG5cblx0XHRcdGlmKGZpbGVzICYmIGZpbGVzLmxlbmd0aCA+IDAgJiYgIWZvcmNlKXtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJEaXNwb3NpbmcgYSBjaGFubmVsIHRoYXQgc3RpbGwgaGFzIG1lc3NhZ2VzISBEaXIgd2lsbCBub3QgYmUgcmVtb3ZlZCFcIik7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR0cnl7XG5cdFx0XHRcdFx0ZnMucm1kaXJTeW5jKGZvbGRlcik7XG5cdFx0XHRcdH1jYXRjaChlcnIpe1xuXHRcdFx0XHRcdC8vLi5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRmb2xkZXIgPSBudWxsO1xuXHRcdH1cblxuXHRcdGlmKHByb2R1Y2VyKXtcblx0XHRcdC8vbm8gbmVlZCB0byBkbyBhbnl0aGluZyBlbHNlXG5cdFx0fVxuXG5cdFx0aWYodHlwZW9mIGNvbnN1bWVyICE9IFwidW5kZWZpbmVkXCIpe1xuXHRcdFx0Y29uc3VtZXIgPSAoKSA9PiB7fTtcblx0XHR9XG5cblx0XHRpZih3YXRjaGVyKXtcblx0XHRcdHdhdGNoZXIuY2xvc2UoKTtcblx0XHRcdHdhdGNoZXIgPSBudWxsO1xuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xuXG5cblx0LyogLS0tLS0tLS0tLS0tLS0tLSBwcm90ZWN0ZWQgIGZ1bmN0aW9ucyAqL1xuXHR2YXIgY29uc3VtZXIgPSBudWxsO1xuXHR2YXIgcmVnaXN0ZXJlZEFzSVBDQ29uc3VtZXIgPSBmYWxzZTtcblx0dmFyIHByb2R1Y2VyID0gbnVsbDtcblxuXHRmdW5jdGlvbiBidWlsZFBhdGhGb3JGaWxlKGZpbGVuYW1lKXtcblx0XHRyZXR1cm4gcGF0aC5ub3JtYWxpemUocGF0aC5qb2luKGZvbGRlciwgZmlsZW5hbWUpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNvbnN1bWVNZXNzYWdlKGZpbGVuYW1lLCBzaG91bGREZWxldGVBZnRlclJlYWQsIGNhbGxiYWNrKSB7XG5cdFx0dmFyIGZ1bGxQYXRoID0gYnVpbGRQYXRoRm9yRmlsZShmaWxlbmFtZSk7XG5cblx0XHRmcy5yZWFkRmlsZShmdWxsUGF0aCwgXCJ1dGY4XCIsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcblx0XHRcdGlmICghZXJyKSB7XG5cdFx0XHRcdGlmIChkYXRhICE9PSBcIlwiKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdHZhciBtZXNzYWdlID0gSlNPTi5wYXJzZShkYXRhKTtcblx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJQYXJzaW5nIGVycm9yXCIsIGVycm9yKTtcblx0XHRcdFx0XHRcdGVyciA9IGVycm9yO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmKGNoZWNrSWZDb25zdW1tZWQoZnVsbFBhdGgsIGRhdGEpKXtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coYG1lc3NhZ2UgYWxyZWFkeSBjb25zdW1lZCBbJHtmaWxlbmFtZX1dYCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChzaG91bGREZWxldGVBZnRlclJlYWQpIHtcblxuXHRcdFx0XHRcdFx0ZnMudW5saW5rKGZ1bGxQYXRoLCBmdW5jdGlvbiAoZXJyLCByZXMpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGVycikge3Rocm93IGVycjt9O1xuXHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVyciwgbWVzc2FnZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ29uc3VtZSBlcnJvclwiLCBlcnIpO1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNvbnN1bWVBbGxFeGlzdGluZyhzaG91bGREZWxldGVBZnRlclJlYWQsIHNob3VsZFdhaXRGb3JNb3JlKSB7XG5cblx0XHRsZXQgY3VycmVudEZpbGVzID0gW107XG5cblx0XHRmcy5yZWFkZGlyKGZvbGRlciwgJ3V0ZjgnLCBmdW5jdGlvbiAoZXJyLCBmaWxlcykge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHQkJC5lcnJvckhhbmRsZXIuZXJyb3IoZXJyKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y3VycmVudEZpbGVzID0gZmlsZXM7XG5cdFx0XHRpdGVyYXRlQW5kQ29uc3VtZShmaWxlcyk7XG5cblx0XHR9KTtcblxuXHRcdGZ1bmN0aW9uIHN0YXJ0V2F0Y2hpbmcoKXtcblx0XHRcdGlmIChzaG91bGRXYWl0Rm9yTW9yZSh0cnVlKSkge1xuXHRcdFx0XHR3YXRjaEZvbGRlcihzaG91bGREZWxldGVBZnRlclJlYWQsIHNob3VsZFdhaXRGb3JNb3JlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpdGVyYXRlQW5kQ29uc3VtZShmaWxlcywgY3VycmVudEluZGV4ID0gMCkge1xuXHRcdFx0aWYgKGN1cnJlbnRJbmRleCA9PT0gZmlsZXMubGVuZ3RoKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coXCJzdGFydCB3YXRjaGluZ1wiLCBuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XG5cdFx0XHRcdHN0YXJ0V2F0Y2hpbmcoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocGF0aC5leHRuYW1lKGZpbGVzW2N1cnJlbnRJbmRleF0pICE9PSBpbl9wcm9ncmVzcykge1xuXHRcdFx0XHRjb25zdW1lTWVzc2FnZShmaWxlc1tjdXJyZW50SW5kZXhdLCBzaG91bGREZWxldGVBZnRlclJlYWQsIChlcnIsIGRhdGEpID0+IHtcblx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHRpdGVyYXRlQW5kQ29uc3VtZShmaWxlcywgKytjdXJyZW50SW5kZXgpO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjb25zdW1lcihudWxsLCBkYXRhLCBwYXRoLmJhc2VuYW1lKGZpbGVzW2N1cnJlbnRJbmRleF0pKTtcblx0XHRcdFx0XHRpZiAoc2hvdWxkV2FpdEZvck1vcmUoKSkge1xuXHRcdFx0XHRcdFx0aXRlcmF0ZUFuZENvbnN1bWUoZmlsZXMsICsrY3VycmVudEluZGV4KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aXRlcmF0ZUFuZENvbnN1bWUoZmlsZXMsICsrY3VycmVudEluZGV4KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiB3cml0ZUZpbGUoZmlsZW5hbWUsIGNvbnRlbnQsIGNhbGxiYWNrKXtcblx0XHRpZihyZWNpcGllbnQpe1xuXHRcdFx0dmFyIGVudmVsb3BlID0gYnVpbGRFbnZlbG9wZShmaWxlbmFtZSwgY29udGVudCk7XG5cdFx0XHQvL2NvbnNvbGUubG9nKFwiU2VuZGluZyB0b1wiLCByZWNpcGllbnQucGlkLCByZWNpcGllbnQucHBpZCwgXCJlbnZlbG9wZVwiLCBlbnZlbG9wZSk7XG5cdFx0XHRyZWNpcGllbnQuc2VuZChlbnZlbG9wZSk7XG5cdFx0XHR2YXIgY29uZmlybWF0aW9uUmVjZWl2ZWQgPSBmYWxzZTtcblxuXHRcdFx0ZnVuY3Rpb24gcmVjZWl2ZUNvbmZpcm1hdGlvbihtZXNzYWdlKXtcblx0XHRcdFx0aWYobWVzc2FnZSA9PT0gYnVpbGRFbnZlbG9wZUNvbmZpcm1hdGlvbihlbnZlbG9wZSkpe1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coXCJSZWNlaXZlZCBjb25maXJtYXRpb25cIiwgcmVjaXBpZW50LnBpZCk7XG5cdFx0XHRcdFx0Y29uZmlybWF0aW9uUmVjZWl2ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRcdHJlY2lwaWVudC5vZmYoXCJtZXNzYWdlXCIsIHJlY2VpdmVDb25maXJtYXRpb24pO1xuXHRcdFx0XHRcdH1jYXRjaChlcnIpe1xuXHRcdFx0XHRcdFx0Ly8uLi5cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZWNpcGllbnQub24oXCJtZXNzYWdlXCIsIHJlY2VpdmVDb25maXJtYXRpb24pO1xuXG5cdFx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHRcdGlmKCFjb25maXJtYXRpb25SZWNlaXZlZCl7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhcIk5vIGNvbmZpcm1hdGlvbi4uLlwiLCBwcm9jZXNzLnBpZCk7XG5cdFx0XHRcdFx0aGlkZGVuX3dyaXRlRmlsZShmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spO1xuXHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHRpZihjYWxsYmFjayl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgY29udGVudCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LCAyMDApO1xuXHRcdH1lbHNle1xuXHRcdFx0aGlkZGVuX3dyaXRlRmlsZShmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spO1xuXHRcdH1cblx0fVxuXG5cdGNvbnN0IGluX3Byb2dyZXNzID0gXCIuaW5fcHJvZ3Jlc3NcIjtcblx0ZnVuY3Rpb24gaGlkZGVuX3dyaXRlRmlsZShmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spe1xuXHRcdHZhciB0bXBGaWxlbmFtZSA9IGZpbGVuYW1lK2luX3Byb2dyZXNzO1xuXHRcdHRyeXtcblx0XHRcdGlmKGZzLmV4aXN0c1N5bmModG1wRmlsZW5hbWUpIHx8IGZzLmV4aXN0c1N5bmMoZmlsZW5hbWUpKXtcblx0XHRcdFx0Y29uc29sZS5sb2cobmV3IEVycm9yKGBPdmVyd3JpdGluZyBmaWxlICR7ZmlsZW5hbWV9YCkpO1xuXHRcdFx0fVxuXHRcdFx0ZnMud3JpdGVGaWxlU3luYyh0bXBGaWxlbmFtZSwgY29udGVudCk7XG5cdFx0XHRmcy5yZW5hbWVTeW5jKHRtcEZpbGVuYW1lLCBmaWxlbmFtZSk7XG5cdFx0fWNhdGNoKGVycil7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHR9XG5cdFx0Y2FsbGJhY2sobnVsbCwgY29udGVudCk7XG5cdH1cblxuXHR2YXIgYWxyZWFkeUtub3duQ2hhbmdlcyA9IHt9O1xuXG5cdGZ1bmN0aW9uIGFscmVhZHlGaXJlZENoYW5nZXMoZmlsZW5hbWUsIGNoYW5nZSl7XG5cdFx0dmFyIHJlcyA9IGZhbHNlO1xuXHRcdGlmKGFscmVhZHlLbm93bkNoYW5nZXNbZmlsZW5hbWVdKXtcblx0XHRcdHJlcyA9IHRydWU7XG5cdFx0fWVsc2V7XG5cdFx0XHRhbHJlYWR5S25vd25DaGFuZ2VzW2ZpbGVuYW1lXSA9IGNoYW5nZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzO1xuXHR9XG5cblx0ZnVuY3Rpb24gd2F0Y2hGb2xkZXIoc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCBzaG91bGRXYWl0Rm9yTW9yZSl7XG5cblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRmcy5yZWFkZGlyKGZvbGRlciwgJ3V0ZjgnLCBmdW5jdGlvbiAoZXJyLCBmaWxlcykge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0JCQuZXJyb3JIYW5kbGVyLmVycm9yKGVycik7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yKHZhciBpPTA7IGk8ZmlsZXMubGVuZ3RoOyBpKyspe1xuXHRcdFx0XHRcdHdhdGNoRmlsZXNIYW5kbGVyKFwiY2hhbmdlXCIsIGZpbGVzW2ldKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgMTAwMCk7XG5cblx0XHRmdW5jdGlvbiB3YXRjaEZpbGVzSGFuZGxlcihldmVudFR5cGUsIGZpbGVuYW1lKXtcblx0XHRcdC8vY29uc29sZS5sb2coYEdvdCAke2V2ZW50VHlwZX0gb24gJHtmaWxlbmFtZX1gKTtcblxuXHRcdFx0aWYoIWZpbGVuYW1lIHx8IHBhdGguZXh0bmFtZShmaWxlbmFtZSkgPT09IGluX3Byb2dyZXNzKXtcblx0XHRcdFx0Ly9jYXVnaHQgYSBkZWxldGUgZXZlbnQgb2YgYSBmaWxlXG5cdFx0XHRcdC8vb3Jcblx0XHRcdFx0Ly9maWxlIG5vdCByZWFkeSB0byBiZSBjb25zdW1lZCAoaW4gcHJvZ3Jlc3MpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGYgPSBidWlsZFBhdGhGb3JGaWxlKGZpbGVuYW1lKTtcblx0XHRcdGlmKCFmcy5leGlzdHNTeW5jKGYpKXtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZyhcIkZpbGUgbm90IGZvdW5kXCIsIGYpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vY29uc29sZS5sb2coYFByZXBhcmluZyB0byBjb25zdW1lICR7ZmlsZW5hbWV9YCk7XG5cdFx0XHRpZighYWxyZWFkeUZpcmVkQ2hhbmdlcyhmaWxlbmFtZSwgZXZlbnRUeXBlKSl7XG5cdFx0XHRcdGNvbnN1bWVNZXNzYWdlKGZpbGVuYW1lLCBzaG91bGREZWxldGVBZnRlclJlYWQsIChlcnIsIGRhdGEpID0+IHtcblx0XHRcdFx0XHQvL2FsbG93IGEgcmVhZCBhIHRoZSBmaWxlXG5cdFx0XHRcdFx0YWxyZWFkeUtub3duQ2hhbmdlc1tmaWxlbmFtZV0gPSB1bmRlZmluZWQ7XG5cblx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHQvLyA/P1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJcXG5DYXVnaHQgYW4gZXJyb3JcIiwgZXJyKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zdW1lcihudWxsLCBkYXRhLCBmaWxlbmFtZSk7XG5cblxuXHRcdFx0XHRcdGlmICghc2hvdWxkV2FpdEZvck1vcmUoKSkge1xuXHRcdFx0XHRcdFx0d2F0Y2hlci5jbG9zZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJTb21ldGhpbmcgaGFwcGVucy4uLlwiLCBmaWxlbmFtZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0XHRjb25zdCB3YXRjaGVyID0gZnMud2F0Y2goZm9sZGVyLCB3YXRjaEZpbGVzSGFuZGxlcik7XG5cblx0XHRjb25zdCBpbnRlcnZhbFRpbWVyID0gc2V0SW50ZXJ2YWwoKCk9Pntcblx0XHRcdGZzLnJlYWRkaXIoZm9sZGVyLCAndXRmOCcsIGZ1bmN0aW9uIChlcnIsIGZpbGVzKSB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHQkJC5lcnJvckhhbmRsZXIuZXJyb3IoZXJyKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZihmaWxlcy5sZW5ndGggPiAwKXtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhgXFxuXFxuRm91bmQgJHtmaWxlcy5sZW5ndGh9IGZpbGVzIG5vdCBjb25zdW1lZCB5ZXQgaW4gJHtmb2xkZXJ9YCwgbmV3IERhdGUoKS5nZXRUaW1lKCksXCJcXG5cXG5cIik7XG5cdFx0XHRcdFx0Ly9mYWtpbmcgYSByZW5hbWUgZXZlbnQgdHJpZ2dlclxuXHRcdFx0XHRcdHdhdGNoRmlsZXNIYW5kbGVyKFwicmVuYW1lXCIsIGZpbGVzWzBdKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgNTAwMCk7XG5cdH1cbn1cblxuZXhwb3J0cy5nZXRGb2xkZXJRdWV1ZSA9IGZ1bmN0aW9uKGZvbGRlciwgY2FsbGJhY2spe1xuXHRyZXR1cm4gbmV3IEZvbGRlck1RKGZvbGRlciwgY2FsbGJhY2spO1xufTtcbiIsImZ1bmN0aW9uIFBTS0J1ZmZlcigpIHt9XG5cbmZ1bmN0aW9uIGdldEFycmF5QnVmZmVySW50ZXJmYWNlICgpIHtcbiAgICBpZih0eXBlb2YgU2hhcmVkQXJyYXlCdWZmZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBBcnJheUJ1ZmZlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gU2hhcmVkQXJyYXlCdWZmZXI7XG4gICAgfVxufVxuXG5QU0tCdWZmZXIuZnJvbSA9IGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICBjb25zdCBBcnJheUJ1ZmZlckludGVyZmFjZSA9IGdldEFycmF5QnVmZmVySW50ZXJmYWNlKCk7XG5cbiAgICBjb25zdCBidWZmZXIgPSBuZXcgVWludDhBcnJheShuZXcgQXJyYXlCdWZmZXJJbnRlcmZhY2Uoc291cmNlLmxlbmd0aCkpO1xuICAgIGJ1ZmZlci5zZXQoc291cmNlLCAwKTtcblxuICAgIHJldHVybiBidWZmZXI7XG59O1xuXG5QU0tCdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gKFsgLi4ucGFyYW1zIF0sIHRvdGFsTGVuZ3RoKSB7XG4gICAgY29uc3QgQXJyYXlCdWZmZXJJbnRlcmZhY2UgPSBnZXRBcnJheUJ1ZmZlckludGVyZmFjZSgpO1xuXG4gICAgaWYgKCF0b3RhbExlbmd0aCAmJiB0b3RhbExlbmd0aCAhPT0gMCkge1xuICAgICAgICB0b3RhbExlbmd0aCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgYnVmZmVyIG9mIHBhcmFtcykge1xuICAgICAgICAgICAgdG90YWxMZW5ndGggKz0gYnVmZmVyLmxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KG5ldyBBcnJheUJ1ZmZlckludGVyZmFjZSh0b3RhbExlbmd0aCkpO1xuICAgIGxldCBvZmZzZXQgPSAwO1xuXG4gICAgZm9yIChjb25zdCBidWYgb2YgcGFyYW1zKSB7XG4gICAgICAgIGNvbnN0IGxlbiA9IGJ1Zi5sZW5ndGg7XG5cbiAgICAgICAgY29uc3QgbmV4dE9mZnNldCA9IG9mZnNldCArIGxlbjtcbiAgICAgICAgaWYgKG5leHRPZmZzZXQgPiB0b3RhbExlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgcmVtYWluaW5nU3BhY2UgPSB0b3RhbExlbmd0aCAtIG9mZnNldDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVtYWluaW5nU3BhY2U7ICsraSkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGJ1ZltpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1ZmZlci5zZXQoYnVmLCBvZmZzZXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgb2Zmc2V0ID0gbmV4dE9mZnNldDtcbiAgICB9XG5cbiAgICByZXR1cm4gYnVmZmVyO1xufTtcblxuUFNLQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKHBza0J1ZmZlcikge1xuICAgIHJldHVybiAhIUFycmF5QnVmZmVyLmlzVmlldyhwc2tCdWZmZXIpO1xufTtcblxuUFNLQnVmZmVyLmFsbG9jID0gZnVuY3Rpb24oc2l6ZSkge1xuICAgIGNvbnN0IEFycmF5QnVmZmVySW50ZXJmYWNlID0gZ2V0QXJyYXlCdWZmZXJJbnRlcmZhY2UoKTtcblxuICAgIHJldHVybiBuZXcgVWludDhBcnJheShuZXcgQXJyYXlCdWZmZXJJbnRlcmZhY2Uoc2l6ZSkpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQU0tCdWZmZXI7IiwiY29uc3QgY3J5cHRvID0gcmVxdWlyZSgnY3J5cHRvJyk7XG5jb25zdCBLZXlFbmNvZGVyID0gcmVxdWlyZSgnLi9rZXlFbmNvZGVyJyk7XG5cbmZ1bmN0aW9uIEVDRFNBKGN1cnZlTmFtZSl7XG4gICAgdGhpcy5jdXJ2ZSA9IGN1cnZlTmFtZSB8fCAnc2VjcDI1NmsxJztcbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIHRoaXMuZ2VuZXJhdGVLZXlQYWlyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCAgICAgPSB7fTtcbiAgICAgICAgY29uc3QgZWMgICAgICAgICA9IGNyeXB0by5jcmVhdGVFQ0RIKHNlbGYuY3VydmUpO1xuICAgICAgICByZXN1bHQucHVibGljICA9IGVjLmdlbmVyYXRlS2V5cygnaGV4Jyk7XG4gICAgICAgIHJlc3VsdC5wcml2YXRlID0gZWMuZ2V0UHJpdmF0ZUtleSgnaGV4Jyk7XG4gICAgICAgIHJldHVybiBrZXlzVG9QRU0ocmVzdWx0KTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24ga2V5c1RvUEVNKGtleXMpe1xuICAgICAgICBjb25zdCByZXN1bHQgICAgICAgICAgICAgICAgICA9IHt9O1xuICAgICAgICBjb25zdCBFQ1ByaXZhdGVLZXlBU04gICAgICAgICA9IEtleUVuY29kZXIuRUNQcml2YXRlS2V5QVNOO1xuICAgICAgICBjb25zdCBTdWJqZWN0UHVibGljS2V5SW5mb0FTTiA9IEtleUVuY29kZXIuU3ViamVjdFB1YmxpY0tleUluZm9BU047XG4gICAgICAgIGNvbnN0IGtleUVuY29kZXIgICAgICAgICAgICAgID0gbmV3IEtleUVuY29kZXIoc2VsZi5jdXJ2ZSk7XG5cbiAgICAgICAgY29uc3QgcHJpdmF0ZUtleU9iamVjdCAgICAgICAgPSBrZXlFbmNvZGVyLnByaXZhdGVLZXlPYmplY3Qoa2V5cy5wcml2YXRlLGtleXMucHVibGljKTtcbiAgICAgICAgY29uc3QgcHVibGljS2V5T2JqZWN0ICAgICAgICAgPSBrZXlFbmNvZGVyLnB1YmxpY0tleU9iamVjdChrZXlzLnB1YmxpYyk7XG5cbiAgICAgICAgcmVzdWx0LnByaXZhdGUgICAgICAgICAgICAgID0gRUNQcml2YXRlS2V5QVNOLmVuY29kZShwcml2YXRlS2V5T2JqZWN0LCAncGVtJywgcHJpdmF0ZUtleU9iamVjdC5wZW1PcHRpb25zKTtcbiAgICAgICAgcmVzdWx0LnB1YmxpYyAgICAgICAgICAgICAgID0gU3ViamVjdFB1YmxpY0tleUluZm9BU04uZW5jb2RlKHB1YmxpY0tleU9iamVjdCwgJ3BlbScsIHB1YmxpY0tleU9iamVjdC5wZW1PcHRpb25zKTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuXG4gICAgfVxuXG4gICAgdGhpcy5zaWduID0gZnVuY3Rpb24gKHByaXZhdGVLZXksZGlnZXN0KSB7XG4gICAgICAgIGNvbnN0IHNpZ24gPSBjcnlwdG8uY3JlYXRlU2lnbihcInNoYTI1NlwiKTtcbiAgICAgICAgc2lnbi51cGRhdGUoZGlnZXN0KTtcblxuICAgICAgICByZXR1cm4gc2lnbi5zaWduKHByaXZhdGVLZXksJ2hleCcpO1xuICAgIH07XG5cbiAgICB0aGlzLnZlcmlmeSA9IGZ1bmN0aW9uIChwdWJsaWNLZXksc2lnbmF0dXJlLGRpZ2VzdCkge1xuICAgICAgICBjb25zdCB2ZXJpZnkgPSBjcnlwdG8uY3JlYXRlVmVyaWZ5KCdzaGEyNTYnKTtcbiAgICAgICAgdmVyaWZ5LnVwZGF0ZShkaWdlc3QpO1xuXG4gICAgICAgIHJldHVybiB2ZXJpZnkudmVyaWZ5KHB1YmxpY0tleSxzaWduYXR1cmUsJ2hleCcpO1xuICAgIH1cbn1cblxuZXhwb3J0cy5jcmVhdGVFQ0RTQSA9IGZ1bmN0aW9uIChjdXJ2ZSl7XG4gICAgcmV0dXJuIG5ldyBFQ0RTQShjdXJ2ZSk7XG59OyIsImNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpO1xuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IG9zID0gcmVxdWlyZSgnb3MnKTtcblxuY29uc3QgdXRpbHMgPSByZXF1aXJlKFwiLi91dGlscy9jcnlwdG9VdGlsc1wiKTtcbmNvbnN0IFBza0FyY2hpdmVyID0gcmVxdWlyZShcIi4vcHNrLWFyY2hpdmVyXCIpO1xuY29uc3QgUGFzc1Rocm91Z2hTdHJlYW0gPSByZXF1aXJlKCcuL3V0aWxzL1Bhc3NUaHJvdWdoU3RyZWFtJyk7XG5cbmNvbnN0IEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpO1xuY29uc3QgdGVtcEZvbGRlciA9IG9zLnRtcGRpcigpO1xuXG5mdW5jdGlvbiBQc2tDcnlwdG8oKSB7XG5cbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIGNvbnN0IGV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gICAgdGhpcy5vbiA9IGV2ZW50Lm9uO1xuICAgIHRoaXMub2ZmID0gZXZlbnQucmVtb3ZlTGlzdGVuZXI7XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBldmVudC5yZW1vdmVBbGxMaXN0ZW5lcnM7XG4gICAgdGhpcy5lbWl0ID0gZXZlbnQuZW1pdDtcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIEVDRFNBIGZ1bmN0aW9ucyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuICAgIGNvbnN0IGVjZHNhID0gcmVxdWlyZShcIi4vRUNEU0FcIikuY3JlYXRlRUNEU0EoKTtcbiAgICB0aGlzLmdlbmVyYXRlRUNEU0FLZXlQYWlyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZWNkc2EuZ2VuZXJhdGVLZXlQYWlyKCk7XG4gICAgfTtcblxuICAgIHRoaXMuc2lnbiA9IGZ1bmN0aW9uIChwcml2YXRlS2V5LCBkaWdlc3QpIHtcbiAgICAgICAgcmV0dXJuIGVjZHNhLnNpZ24ocHJpdmF0ZUtleSwgZGlnZXN0KTtcbiAgICB9O1xuXG4gICAgdGhpcy52ZXJpZnkgPSBmdW5jdGlvbiAocHVibGljS2V5LCBzaWduYXR1cmUsIGRpZ2VzdCkge1xuICAgICAgICByZXR1cm4gZWNkc2EudmVyaWZ5KHB1YmxpY0tleSwgc2lnbmF0dXJlLCBkaWdlc3QpO1xuICAgIH07XG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLUVuY3J5cHRpb24gZnVuY3Rpb25zIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgdGhpcy5lbmNyeXB0U3RyZWFtID0gZnVuY3Rpb24gKGlucHV0UGF0aCwgZGVzdGluYXRpb25QYXRoLCBwYXNzd29yZCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgYXJjaGl2ZXIgPSBuZXcgUHNrQXJjaGl2ZXIoKTtcblxuICAgICAgICBhcmNoaXZlci5vbigncHJvZ3Jlc3MnLCAocHJvZ3Jlc3MpID0+IHtcbiAgICAgICAgICAgIHNlbGYuZW1pdCgncHJvZ3Jlc3MnLCBwcm9ncmVzcyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZzLm9wZW4oZGVzdGluYXRpb25QYXRoLCBcInd4XCIsIGZ1bmN0aW9uIChlcnIsIGZkKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZzLmNsb3NlKGZkLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCB3cyA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGRlc3RpbmF0aW9uUGF0aCwge2F1dG9DbG9zZTogZmFsc2V9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXlTYWx0ID0gY3J5cHRvLnJhbmRvbUJ5dGVzKDMyKTtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBjcnlwdG8ucGJrZGYyU3luYyhwYXNzd29yZCwga2V5U2FsdCwgdXRpbHMuaXRlcmF0aW9uc19udW1iZXIsIDMyLCAnc2hhNTEyJyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhYWRTYWx0ID0gY3J5cHRvLnJhbmRvbUJ5dGVzKDMyKTtcbiAgICAgICAgICAgICAgICBjb25zdCBhYWQgPSBjcnlwdG8ucGJrZGYyU3luYyhwYXNzd29yZCwgYWFkU2FsdCwgdXRpbHMuaXRlcmF0aW9uc19udW1iZXIsIDMyLCAnc2hhNTEyJyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzYWx0ID0gQnVmZmVyLmNvbmNhdChba2V5U2FsdCwgYWFkU2FsdF0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGl2ID0gY3J5cHRvLnBia2RmMlN5bmMocGFzc3dvcmQsIHNhbHQsIHV0aWxzLml0ZXJhdGlvbnNfbnVtYmVyLCAxMiwgJ3NoYTUxMicpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY2lwaGVyID0gY3J5cHRvLmNyZWF0ZUNpcGhlcml2KHV0aWxzLmFsZ29yaXRobSwga2V5LCBpdik7XG4gICAgICAgICAgICAgICAgY2lwaGVyLnNldEFBRChhYWQpO1xuICAgICAgICAgICAgICAgIGFyY2hpdmVyLnppcFN0cmVhbShpbnB1dFBhdGgsIGNpcGhlciwgZnVuY3Rpb24gKGVyciwgY2lwaGVyU3RyZWFtKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjaXBoZXJTdHJlYW0ub24oXCJkYXRhXCIsIGZ1bmN0aW9uIChjaHVuaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgd3Mud3JpdGUoY2h1bmspO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2lwaGVyU3RyZWFtLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YWcgPSBjaXBoZXIuZ2V0QXV0aFRhZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YVRvQXBwZW5kID0gQnVmZmVyLmNvbmNhdChbc2FsdCwgdGFnXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB3cy5lbmQoZGF0YVRvQXBwZW5kLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZGVjcnlwdFN0cmVhbSA9IGZ1bmN0aW9uIChlbmNyeXB0ZWRJbnB1dFBhdGgsIG91dHB1dEZvbGRlciwgcGFzc3dvcmQsIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgY29uc3QgYXJjaGl2ZXIgPSBuZXcgUHNrQXJjaGl2ZXIoKTtcblxuICAgICAgICBkZWNyeXB0RmlsZShlbmNyeXB0ZWRJbnB1dFBhdGgsIHRlbXBGb2xkZXIsIHBhc3N3b3JkLCBmdW5jdGlvbiAoZXJyLCB0ZW1wQXJjaGl2ZVBhdGgpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXJjaGl2ZXIub24oJ3Byb2dyZXNzJywgKHByb2dyZXNzKSA9PiB7XG4gICAgICAgICAgICAgICAgc2VsZi5lbWl0KCdwcm9ncmVzcycsIDEwICsgMC45ICogcHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgYXJjaGl2ZXIudW56aXBTdHJlYW0odGVtcEFyY2hpdmVQYXRoLCBvdXRwdXRGb2xkZXIsIGZ1bmN0aW9uIChlcnIsIHVuemlwcGVkRmlsZU5hbWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB1dGlscy5kZWxldGVSZWN1cnNpdmVseSh0ZW1wQXJjaGl2ZVBhdGgsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHVuemlwcGVkRmlsZU5hbWVzKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfTtcblxuICAgIHRoaXMuZW5jcnlwdE9iamVjdCA9IGZ1bmN0aW9uIChpbnB1dE9iaiwgZHNlZWQsIGRlcHRoLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBhcmNoaXZlciA9IG5ldyBQc2tBcmNoaXZlcigpO1xuXG4gICAgICAgIGFyY2hpdmVyLnppcEluTWVtb3J5KGlucHV0T2JqLCBkZXB0aCwgZnVuY3Rpb24gKGVyciwgemlwcGVkT2JqKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBjaXBoZXJUZXh0ID0gdXRpbHMuZW5jcnlwdCh6aXBwZWRPYmosIGRzZWVkKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGNpcGhlclRleHQpO1xuICAgICAgICB9KVxuICAgIH07XG5cbiAgICB0aGlzLmRlY3J5cHRPYmplY3QgPSBmdW5jdGlvbiAoZW5jcnlwdGVkRGF0YSwgZHNlZWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGFyY2hpdmVyID0gbmV3IFBza0FyY2hpdmVyKCk7XG5cbiAgICAgICAgY29uc3QgemlwcGVkT2JqZWN0ID0gdXRpbHMuZGVjcnlwdChlbmNyeXB0ZWREYXRhLCBkc2VlZCk7XG4gICAgICAgIGFyY2hpdmVyLnVuemlwSW5NZW1vcnkoemlwcGVkT2JqZWN0LCBmdW5jdGlvbiAoZXJyLCBvYmopIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIG9iaik7XG4gICAgICAgIH0pXG4gICAgfTtcblxuICAgIHRoaXMucHNrSGFzaCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoZGF0YSkpIHtcbiAgICAgICAgICAgIHJldHVybiB1dGlscy5jcmVhdGVQc2tIYXNoKGRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gdXRpbHMuY3JlYXRlUHNrSGFzaChKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV0aWxzLmNyZWF0ZVBza0hhc2goZGF0YSk7XG4gICAgfTtcblxuICAgIHRoaXMucHNrSGFzaFN0cmVhbSA9IGZ1bmN0aW9uIChyZWFkU3RyZWFtLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBwc2tIYXNoID0gbmV3IHV0aWxzLlBza0hhc2goKTtcblxuICAgICAgICByZWFkU3RyZWFtLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICBwc2tIYXNoLnVwZGF0ZShjaHVuayk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgcmVhZFN0cmVhbS5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcHNrSGFzaC5kaWdlc3QoKSk7XG4gICAgICAgIH0pXG4gICAgfTtcblxuXG4gICAgdGhpcy5zYXZlRGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBwYXNzd29yZCwgcGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgZW5jcnlwdGlvbktleSA9IHRoaXMuZGVyaXZlS2V5KHBhc3N3b3JkLCBudWxsLCBudWxsKTtcbiAgICAgICAgY29uc3QgaXYgPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMTYpO1xuICAgICAgICBjb25zdCBjaXBoZXIgPSBjcnlwdG8uY3JlYXRlQ2lwaGVyaXYoJ2Flcy0yNTYtY2ZiJywgZW5jcnlwdGlvbktleSwgaXYpO1xuICAgICAgICBsZXQgZW5jcnlwdGVkRFNlZWQgPSBjaXBoZXIudXBkYXRlKGRhdGEsICdiaW5hcnknKTtcbiAgICAgICAgY29uc3QgZmluYWwgPSBCdWZmZXIuZnJvbShjaXBoZXIuZmluYWwoJ2JpbmFyeScpLCAnYmluYXJ5Jyk7XG4gICAgICAgIGVuY3J5cHRlZERTZWVkID0gQnVmZmVyLmNvbmNhdChbaXYsIGVuY3J5cHRlZERTZWVkLCBmaW5hbF0pO1xuICAgICAgICBmcy53cml0ZUZpbGUocGF0aCwgZW5jcnlwdGVkRFNlZWQsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0pO1xuICAgIH07XG5cblxuICAgIHRoaXMubG9hZERhdGEgPSBmdW5jdGlvbiAocGFzc3dvcmQsIHBhdGgsIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgZnMucmVhZEZpbGUocGF0aCwgbnVsbCwgKGVyciwgZW5jcnlwdGVkRGF0YSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl2ID0gZW5jcnlwdGVkRGF0YS5zbGljZSgwLCAxNik7XG4gICAgICAgICAgICAgICAgY29uc3QgZW5jcnlwdGVkRHNlZWQgPSBlbmNyeXB0ZWREYXRhLnNsaWNlKDE2KTtcbiAgICAgICAgICAgICAgICBjb25zdCBlbmNyeXB0aW9uS2V5ID0gdGhpcy5kZXJpdmVLZXkocGFzc3dvcmQsIG51bGwsIG51bGwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlY2lwaGVyID0gY3J5cHRvLmNyZWF0ZURlY2lwaGVyaXYoJ2Flcy0yNTYtY2ZiJywgZW5jcnlwdGlvbktleSwgaXYpO1xuICAgICAgICAgICAgICAgIGxldCBkc2VlZCA9IEJ1ZmZlci5mcm9tKGRlY2lwaGVyLnVwZGF0ZShlbmNyeXB0ZWREc2VlZCwgJ2JpbmFyeScpLCAnYmluYXJ5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZmluYWwgPSBCdWZmZXIuZnJvbShkZWNpcGhlci5maW5hbCgnYmluYXJ5JyksICdiaW5hcnknKTtcbiAgICAgICAgICAgICAgICBkc2VlZCA9IEJ1ZmZlci5jb25jYXQoW2RzZWVkLCBmaW5hbF0pO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGRzZWVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuXG4gICAgdGhpcy5nZW5lcmF0ZVNhZmVVaWQgPSBmdW5jdGlvbiAocGFzc3dvcmQsIGFkZGl0aW9uYWxEYXRhKSB7XG4gICAgICAgIHBhc3N3b3JkID0gcGFzc3dvcmQgfHwgQnVmZmVyLmFsbG9jKDApO1xuICAgICAgICBpZiAoIWFkZGl0aW9uYWxEYXRhKSB7XG4gICAgICAgICAgICBhZGRpdGlvbmFsRGF0YSA9IEJ1ZmZlci5hbGxvYygwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGFkZGl0aW9uYWxEYXRhKSkge1xuICAgICAgICAgICAgYWRkaXRpb25hbERhdGEgPSBCdWZmZXIuZnJvbShhZGRpdGlvbmFsRGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdXRpbHMuZW5jb2RlKHRoaXMucHNrSGFzaChCdWZmZXIuY29uY2F0KFtwYXNzd29yZCwgYWRkaXRpb25hbERhdGFdKSkpO1xuICAgIH07XG5cbiAgICB0aGlzLmRlcml2ZUtleSA9IGZ1bmN0aW9uIGRlcml2ZUtleShwYXNzd29yZCwgaXRlcmF0aW9ucywgZGtMZW4pIHtcbiAgICAgICAgaXRlcmF0aW9ucyA9IGl0ZXJhdGlvbnMgfHwgMTAwMDtcbiAgICAgICAgZGtMZW4gPSBka0xlbiB8fCAzMjtcbiAgICAgICAgY29uc3Qgc2FsdCA9IHV0aWxzLmdlbmVyYXRlU2FsdChwYXNzd29yZCwgMzIpO1xuICAgICAgICBjb25zdCBkayA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBzYWx0LCBpdGVyYXRpb25zLCBka0xlbiwgJ3NoYTUxMicpO1xuICAgICAgICByZXR1cm4gQnVmZmVyLmZyb20oZGspO1xuICAgIH07XG5cbiAgICB0aGlzLnJhbmRvbUJ5dGVzID0gY3J5cHRvLnJhbmRvbUJ5dGVzO1xuICAgIHRoaXMuUHNrSGFzaCA9IHV0aWxzLlBza0hhc2g7XG5cbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIEludGVybmFsIGZ1bmN0aW9ucyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGZ1bmN0aW9uIGRlY3J5cHRGaWxlKGVuY3J5cHRlZElucHV0UGF0aCwgdGVtcEZvbGRlciwgcGFzc3dvcmQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGZzLnN0YXQoZW5jcnlwdGVkSW5wdXRQYXRoLCBmdW5jdGlvbiAoZXJyLCBzdGF0cykge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIsIG51bGwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBmaWxlU2l6ZUluQnl0ZXMgPSBzdGF0cy5zaXplO1xuXG4gICAgICAgICAgICBmcy5vcGVuKGVuY3J5cHRlZElucHV0UGF0aCwgXCJyXCIsIGZ1bmN0aW9uIChlcnIsIGZkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIG51bGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuY3J5cHRlZEF1dGhEYXRhID0gQnVmZmVyLmFsbG9jKDgwKTtcblxuICAgICAgICAgICAgICAgICAgICBmcy5yZWFkKGZkLCBlbmNyeXB0ZWRBdXRoRGF0YSwgMCwgODAsIGZpbGVTaXplSW5CeXRlcyAtIDgwLCBmdW5jdGlvbiAoZXJyLCBieXRlc1JlYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhbHQgPSBlbmNyeXB0ZWRBdXRoRGF0YS5zbGljZSgwLCA2NCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXlTYWx0ID0gc2FsdC5zbGljZSgwLCAzMik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhYWRTYWx0ID0gc2FsdC5zbGljZSgtMzIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpdiA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBzYWx0LCB1dGlscy5pdGVyYXRpb25zX251bWJlciwgMTIsICdzaGE1MTInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBrZXlTYWx0LCB1dGlscy5pdGVyYXRpb25zX251bWJlciwgMzIsICdzaGE1MTInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFhZCA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBhYWRTYWx0LCB1dGlscy5pdGVyYXRpb25zX251bWJlciwgMzIsICdzaGE1MTInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhZyA9IGVuY3J5cHRlZEF1dGhEYXRhLnNsaWNlKC0xNik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY2lwaGVyID0gY3J5cHRvLmNyZWF0ZURlY2lwaGVyaXYodXRpbHMuYWxnb3JpdGhtLCBrZXksIGl2KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZGVjaXBoZXIuc2V0QUFEKGFhZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWNpcGhlci5zZXRBdXRoVGFnKHRhZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBycyA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0oZW5jcnlwdGVkSW5wdXRQYXRoLCB7c3RhcnQ6IDAsIGVuZDogZmlsZVNpemVJbkJ5dGVzIC0gODF9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZzLm1rZGlyKHRlbXBGb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCBmdW5jdGlvbiAoZXJyKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZW1wQXJjaGl2ZVBhdGggPSBwYXRoLmpvaW4odGVtcEZvbGRlciwgcGF0aC5iYXNlbmFtZShlbmNyeXB0ZWRJbnB1dFBhdGgpICsgXCIuemlwXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnMub3Blbih0ZW1wQXJjaGl2ZVBhdGgsIFwid1wiLCBmdW5jdGlvbiAoZXJyLCBmZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnMuY2xvc2UoZmQsIGZ1bmN0aW9uIChlcnIpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwdFN0cmVhbSA9IG5ldyBQYXNzVGhyb3VnaFN0cmVhbSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB3cyA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHRlbXBBcmNoaXZlUGF0aCwge2F1dG9DbG9zZTogZmFsc2V9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdzLm9uKFwiZmluaXNoXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB0ZW1wQXJjaGl2ZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByb2dyZXNzTGVuZ3RoID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0b3RhbExlbmd0aCA9IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogVE9ETyByZXZpZXcgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogSW4gYnJvd3NlciwgcGlwaW5nIHdpbGwgYmxvY2sgdGhlIGV2ZW50IGxvb3AgYW5kIHRoZSBzdGFjayBxdWV1ZSBpcyBub3QgY2FsbGVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBycy5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NMZW5ndGggKz0gY2h1bmsubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsTGVuZ3RoICs9IGNodW5rLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9ncmVzc0xlbmd0aCA+IDMwMDAwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmVzc0xlbmd0aCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVtaXRQcm9ncmVzcyhmaWxlU2l6ZUluQnl0ZXMsIHRvdGFsTGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBycy5waXBlKGRlY2lwaGVyKS5waXBlKHB0U3RyZWFtKS5waXBlKHdzKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVtaXRQcm9ncmVzcyh0b3RhbCwgcHJvY2Vzc2VkKSB7XG5cblxuICAgICAgICBpZiAocHJvY2Vzc2VkID4gdG90YWwpIHtcbiAgICAgICAgICAgIHByb2Nlc3NlZCA9IHRvdGFsO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSAoMTAwICogcHJvY2Vzc2VkKSAvIHRvdGFsO1xuICAgICAgICBzZWxmLmVtaXQoJ3Byb2dyZXNzJywgcGFyc2VJbnQocHJvZ3Jlc3MpKTtcbiAgICB9XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgUHNrQ3J5cHRvKCk7XG4iLCJ2YXIgYXNuMSA9IHJlcXVpcmUoJy4vYXNuMScpO1xudmFyIGluaGVyaXRzID0gcmVxdWlyZSgndXRpbCcpLmluaGVyaXRzO1xuXG52YXIgYXBpID0gZXhwb3J0cztcblxuYXBpLmRlZmluZSA9IGZ1bmN0aW9uIGRlZmluZShuYW1lLCBib2R5KSB7XG4gIHJldHVybiBuZXcgRW50aXR5KG5hbWUsIGJvZHkpO1xufTtcblxuZnVuY3Rpb24gRW50aXR5KG5hbWUsIGJvZHkpIHtcbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgdGhpcy5ib2R5ID0gYm9keTtcblxuICB0aGlzLmRlY29kZXJzID0ge307XG4gIHRoaXMuZW5jb2RlcnMgPSB7fTtcbn07XG5cbkVudGl0eS5wcm90b3R5cGUuX2NyZWF0ZU5hbWVkID0gZnVuY3Rpb24gY3JlYXRlTmFtZWQoYmFzZSkge1xuICB2YXIgbmFtZWQ7XG4gIHRyeSB7XG4gICAgbmFtZWQgPSByZXF1aXJlKCd2bScpLnJ1bkluVGhpc0NvbnRleHQoXG4gICAgICAnKGZ1bmN0aW9uICcgKyB0aGlzLm5hbWUgKyAnKGVudGl0eSkge1xcbicgK1xuICAgICAgJyAgdGhpcy5faW5pdE5hbWVkKGVudGl0eSk7XFxuJyArXG4gICAgICAnfSknXG4gICAgKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIG5hbWVkID0gZnVuY3Rpb24gKGVudGl0eSkge1xuICAgICAgdGhpcy5faW5pdE5hbWVkKGVudGl0eSk7XG4gICAgfTtcbiAgfVxuICBpbmhlcml0cyhuYW1lZCwgYmFzZSk7XG4gIG5hbWVkLnByb3RvdHlwZS5faW5pdE5hbWVkID0gZnVuY3Rpb24gaW5pdG5hbWVkKGVudGl0eSkge1xuICAgIGJhc2UuY2FsbCh0aGlzLCBlbnRpdHkpO1xuICB9O1xuXG4gIHJldHVybiBuZXcgbmFtZWQodGhpcyk7XG59O1xuXG5FbnRpdHkucHJvdG90eXBlLl9nZXREZWNvZGVyID0gZnVuY3Rpb24gX2dldERlY29kZXIoZW5jKSB7XG4gIC8vIExhemlseSBjcmVhdGUgZGVjb2RlclxuICBpZiAoIXRoaXMuZGVjb2RlcnMuaGFzT3duUHJvcGVydHkoZW5jKSlcbiAgICB0aGlzLmRlY29kZXJzW2VuY10gPSB0aGlzLl9jcmVhdGVOYW1lZChhc24xLmRlY29kZXJzW2VuY10pO1xuICByZXR1cm4gdGhpcy5kZWNvZGVyc1tlbmNdO1xufTtcblxuRW50aXR5LnByb3RvdHlwZS5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUoZGF0YSwgZW5jLCBvcHRpb25zKSB7XG4gIHJldHVybiB0aGlzLl9nZXREZWNvZGVyKGVuYykuZGVjb2RlKGRhdGEsIG9wdGlvbnMpO1xufTtcblxuRW50aXR5LnByb3RvdHlwZS5fZ2V0RW5jb2RlciA9IGZ1bmN0aW9uIF9nZXRFbmNvZGVyKGVuYykge1xuICAvLyBMYXppbHkgY3JlYXRlIGVuY29kZXJcbiAgaWYgKCF0aGlzLmVuY29kZXJzLmhhc093blByb3BlcnR5KGVuYykpXG4gICAgdGhpcy5lbmNvZGVyc1tlbmNdID0gdGhpcy5fY3JlYXRlTmFtZWQoYXNuMS5lbmNvZGVyc1tlbmNdKTtcbiAgcmV0dXJuIHRoaXMuZW5jb2RlcnNbZW5jXTtcbn07XG5cbkVudGl0eS5wcm90b3R5cGUuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKGRhdGEsIGVuYywgLyogaW50ZXJuYWwgKi8gcmVwb3J0ZXIpIHtcbiAgcmV0dXJuIHRoaXMuX2dldEVuY29kZXIoZW5jKS5lbmNvZGUoZGF0YSwgcmVwb3J0ZXIpO1xufTtcbiIsInZhciBhc24xID0gZXhwb3J0cztcblxuYXNuMS5iaWdudW0gPSByZXF1aXJlKCcuL2JpZ251bS9ibicpO1xuXG5hc24xLmRlZmluZSA9IHJlcXVpcmUoJy4vYXBpJykuZGVmaW5lO1xuYXNuMS5iYXNlID0gcmVxdWlyZSgnLi9iYXNlL2luZGV4Jyk7XG5hc24xLmNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzL2luZGV4Jyk7XG5hc24xLmRlY29kZXJzID0gcmVxdWlyZSgnLi9kZWNvZGVycy9pbmRleCcpO1xuYXNuMS5lbmNvZGVycyA9IHJlcXVpcmUoJy4vZW5jb2RlcnMvaW5kZXgnKTtcbiIsInZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ3V0aWwnKS5pbmhlcml0cztcbnZhciBSZXBvcnRlciA9IHJlcXVpcmUoJy4uL2Jhc2UnKS5SZXBvcnRlcjtcbnZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXI7XG5cbmZ1bmN0aW9uIERlY29kZXJCdWZmZXIoYmFzZSwgb3B0aW9ucykge1xuICBSZXBvcnRlci5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiYXNlKSkge1xuICAgIHRoaXMuZXJyb3IoJ0lucHV0IG5vdCBCdWZmZXInKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB0aGlzLmJhc2UgPSBiYXNlO1xuICB0aGlzLm9mZnNldCA9IDA7XG4gIHRoaXMubGVuZ3RoID0gYmFzZS5sZW5ndGg7XG59XG5pbmhlcml0cyhEZWNvZGVyQnVmZmVyLCBSZXBvcnRlcik7XG5leHBvcnRzLkRlY29kZXJCdWZmZXIgPSBEZWNvZGVyQnVmZmVyO1xuXG5EZWNvZGVyQnVmZmVyLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gc2F2ZSgpIHtcbiAgcmV0dXJuIHsgb2Zmc2V0OiB0aGlzLm9mZnNldCwgcmVwb3J0ZXI6IFJlcG9ydGVyLnByb3RvdHlwZS5zYXZlLmNhbGwodGhpcykgfTtcbn07XG5cbkRlY29kZXJCdWZmZXIucHJvdG90eXBlLnJlc3RvcmUgPSBmdW5jdGlvbiByZXN0b3JlKHNhdmUpIHtcbiAgLy8gUmV0dXJuIHNraXBwZWQgZGF0YVxuICB2YXIgcmVzID0gbmV3IERlY29kZXJCdWZmZXIodGhpcy5iYXNlKTtcbiAgcmVzLm9mZnNldCA9IHNhdmUub2Zmc2V0O1xuICByZXMubGVuZ3RoID0gdGhpcy5vZmZzZXQ7XG5cbiAgdGhpcy5vZmZzZXQgPSBzYXZlLm9mZnNldDtcbiAgUmVwb3J0ZXIucHJvdG90eXBlLnJlc3RvcmUuY2FsbCh0aGlzLCBzYXZlLnJlcG9ydGVyKTtcblxuICByZXR1cm4gcmVzO1xufTtcblxuRGVjb2RlckJ1ZmZlci5wcm90b3R5cGUuaXNFbXB0eSA9IGZ1bmN0aW9uIGlzRW1wdHkoKSB7XG4gIHJldHVybiB0aGlzLm9mZnNldCA9PT0gdGhpcy5sZW5ndGg7XG59O1xuXG5EZWNvZGVyQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDgoZmFpbCkge1xuICBpZiAodGhpcy5vZmZzZXQgKyAxIDw9IHRoaXMubGVuZ3RoKVxuICAgIHJldHVybiB0aGlzLmJhc2UucmVhZFVJbnQ4KHRoaXMub2Zmc2V0KyssIHRydWUpO1xuICBlbHNlXG4gICAgcmV0dXJuIHRoaXMuZXJyb3IoZmFpbCB8fCAnRGVjb2RlckJ1ZmZlciBvdmVycnVuJyk7XG59XG5cbkRlY29kZXJCdWZmZXIucHJvdG90eXBlLnNraXAgPSBmdW5jdGlvbiBza2lwKGJ5dGVzLCBmYWlsKSB7XG4gIGlmICghKHRoaXMub2Zmc2V0ICsgYnl0ZXMgPD0gdGhpcy5sZW5ndGgpKVxuICAgIHJldHVybiB0aGlzLmVycm9yKGZhaWwgfHwgJ0RlY29kZXJCdWZmZXIgb3ZlcnJ1bicpO1xuXG4gIHZhciByZXMgPSBuZXcgRGVjb2RlckJ1ZmZlcih0aGlzLmJhc2UpO1xuXG4gIC8vIFNoYXJlIHJlcG9ydGVyIHN0YXRlXG4gIHJlcy5fcmVwb3J0ZXJTdGF0ZSA9IHRoaXMuX3JlcG9ydGVyU3RhdGU7XG5cbiAgcmVzLm9mZnNldCA9IHRoaXMub2Zmc2V0O1xuICByZXMubGVuZ3RoID0gdGhpcy5vZmZzZXQgKyBieXRlcztcbiAgdGhpcy5vZmZzZXQgKz0gYnl0ZXM7XG4gIHJldHVybiByZXM7XG59XG5cbkRlY29kZXJCdWZmZXIucHJvdG90eXBlLnJhdyA9IGZ1bmN0aW9uIHJhdyhzYXZlKSB7XG4gIHJldHVybiB0aGlzLmJhc2Uuc2xpY2Uoc2F2ZSA/IHNhdmUub2Zmc2V0IDogdGhpcy5vZmZzZXQsIHRoaXMubGVuZ3RoKTtcbn1cblxuZnVuY3Rpb24gRW5jb2RlckJ1ZmZlcih2YWx1ZSwgcmVwb3J0ZXIpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZS5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgaWYgKCEoaXRlbSBpbnN0YW5jZW9mIEVuY29kZXJCdWZmZXIpKVxuICAgICAgICBpdGVtID0gbmV3IEVuY29kZXJCdWZmZXIoaXRlbSwgcmVwb3J0ZXIpO1xuICAgICAgdGhpcy5sZW5ndGggKz0gaXRlbS5sZW5ndGg7XG4gICAgICByZXR1cm4gaXRlbTtcbiAgICB9LCB0aGlzKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKCEoMCA8PSB2YWx1ZSAmJiB2YWx1ZSA8PSAweGZmKSlcbiAgICAgIHJldHVybiByZXBvcnRlci5lcnJvcignbm9uLWJ5dGUgRW5jb2RlckJ1ZmZlciB2YWx1ZScpO1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB0aGlzLmxlbmd0aCA9IDE7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB0aGlzLmxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHZhbHVlKTtcbiAgfSBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIodmFsdWUpKSB7XG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgIHRoaXMubGVuZ3RoID0gdmFsdWUubGVuZ3RoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByZXBvcnRlci5lcnJvcignVW5zdXBwb3J0ZWQgdHlwZTogJyArIHR5cGVvZiB2YWx1ZSk7XG4gIH1cbn1cbmV4cG9ydHMuRW5jb2RlckJ1ZmZlciA9IEVuY29kZXJCdWZmZXI7XG5cbkVuY29kZXJCdWZmZXIucHJvdG90eXBlLmpvaW4gPSBmdW5jdGlvbiBqb2luKG91dCwgb2Zmc2V0KSB7XG4gIGlmICghb3V0KVxuICAgIG91dCA9IG5ldyBCdWZmZXIodGhpcy5sZW5ndGgpO1xuICBpZiAoIW9mZnNldClcbiAgICBvZmZzZXQgPSAwO1xuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMClcbiAgICByZXR1cm4gb3V0O1xuXG4gIGlmIChBcnJheS5pc0FycmF5KHRoaXMudmFsdWUpKSB7XG4gICAgdGhpcy52YWx1ZS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIGl0ZW0uam9pbihvdXQsIG9mZnNldCk7XG4gICAgICBvZmZzZXQgKz0gaXRlbS5sZW5ndGg7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLnZhbHVlID09PSAnbnVtYmVyJylcbiAgICAgIG91dFtvZmZzZXRdID0gdGhpcy52YWx1ZTtcbiAgICBlbHNlIGlmICh0eXBlb2YgdGhpcy52YWx1ZSA9PT0gJ3N0cmluZycpXG4gICAgICBvdXQud3JpdGUodGhpcy52YWx1ZSwgb2Zmc2V0KTtcbiAgICBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIodGhpcy52YWx1ZSkpXG4gICAgICB0aGlzLnZhbHVlLmNvcHkob3V0LCBvZmZzZXQpO1xuICAgIG9mZnNldCArPSB0aGlzLmxlbmd0aDtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuIiwidmFyIGJhc2UgPSBleHBvcnRzO1xuXG5iYXNlLlJlcG9ydGVyID0gcmVxdWlyZSgnLi9yZXBvcnRlcicpLlJlcG9ydGVyO1xuYmFzZS5EZWNvZGVyQnVmZmVyID0gcmVxdWlyZSgnLi9idWZmZXInKS5EZWNvZGVyQnVmZmVyO1xuYmFzZS5FbmNvZGVyQnVmZmVyID0gcmVxdWlyZSgnLi9idWZmZXInKS5FbmNvZGVyQnVmZmVyO1xuYmFzZS5Ob2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XG4iLCJ2YXIgUmVwb3J0ZXIgPSByZXF1aXJlKCcuLi9iYXNlJykuUmVwb3J0ZXI7XG52YXIgRW5jb2RlckJ1ZmZlciA9IHJlcXVpcmUoJy4uL2Jhc2UnKS5FbmNvZGVyQnVmZmVyO1xuLy92YXIgYXNzZXJ0ID0gcmVxdWlyZSgnZG91YmxlLWNoZWNrJykuYXNzZXJ0O1xuXG4vLyBTdXBwb3J0ZWQgdGFnc1xudmFyIHRhZ3MgPSBbXG4gICdzZXEnLCAnc2Vxb2YnLCAnc2V0JywgJ3NldG9mJywgJ29jdHN0cicsICdiaXRzdHInLCAnb2JqaWQnLCAnYm9vbCcsXG4gICdnZW50aW1lJywgJ3V0Y3RpbWUnLCAnbnVsbF8nLCAnZW51bScsICdpbnQnLCAnaWE1c3RyJywgJ3V0ZjhzdHInXG5dO1xuXG4vLyBQdWJsaWMgbWV0aG9kcyBsaXN0XG52YXIgbWV0aG9kcyA9IFtcbiAgJ2tleScsICdvYmonLCAndXNlJywgJ29wdGlvbmFsJywgJ2V4cGxpY2l0JywgJ2ltcGxpY2l0JywgJ2RlZicsICdjaG9pY2UnLFxuICAnYW55J1xuXS5jb25jYXQodGFncyk7XG5cbi8vIE92ZXJyaWRlZCBtZXRob2RzIGxpc3RcbnZhciBvdmVycmlkZWQgPSBbXG4gICdfcGVla1RhZycsICdfZGVjb2RlVGFnJywgJ191c2UnLFxuICAnX2RlY29kZVN0cicsICdfZGVjb2RlT2JqaWQnLCAnX2RlY29kZVRpbWUnLFxuICAnX2RlY29kZU51bGwnLCAnX2RlY29kZUludCcsICdfZGVjb2RlQm9vbCcsICdfZGVjb2RlTGlzdCcsXG5cbiAgJ19lbmNvZGVDb21wb3NpdGUnLCAnX2VuY29kZVN0cicsICdfZW5jb2RlT2JqaWQnLCAnX2VuY29kZVRpbWUnLFxuICAnX2VuY29kZU51bGwnLCAnX2VuY29kZUludCcsICdfZW5jb2RlQm9vbCdcbl07XG5cbmZ1bmN0aW9uIE5vZGUoZW5jLCBwYXJlbnQpIHtcbiAgdmFyIHN0YXRlID0ge307XG4gIHRoaXMuX2Jhc2VTdGF0ZSA9IHN0YXRlO1xuXG4gIHN0YXRlLmVuYyA9IGVuYztcblxuICBzdGF0ZS5wYXJlbnQgPSBwYXJlbnQgfHwgbnVsbDtcbiAgc3RhdGUuY2hpbGRyZW4gPSBudWxsO1xuXG4gIC8vIFN0YXRlXG4gIHN0YXRlLnRhZyA9IG51bGw7XG4gIHN0YXRlLmFyZ3MgPSBudWxsO1xuICBzdGF0ZS5yZXZlcnNlQXJncyA9IG51bGw7XG4gIHN0YXRlLmNob2ljZSA9IG51bGw7XG4gIHN0YXRlLm9wdGlvbmFsID0gZmFsc2U7XG4gIHN0YXRlLmFueSA9IGZhbHNlO1xuICBzdGF0ZS5vYmogPSBmYWxzZTtcbiAgc3RhdGUudXNlID0gbnVsbDtcbiAgc3RhdGUudXNlRGVjb2RlciA9IG51bGw7XG4gIHN0YXRlLmtleSA9IG51bGw7XG4gIHN0YXRlWydkZWZhdWx0J10gPSBudWxsO1xuICBzdGF0ZS5leHBsaWNpdCA9IG51bGw7XG4gIHN0YXRlLmltcGxpY2l0ID0gbnVsbDtcblxuICAvLyBTaG91bGQgY3JlYXRlIG5ldyBpbnN0YW5jZSBvbiBlYWNoIG1ldGhvZFxuICBpZiAoIXN0YXRlLnBhcmVudCkge1xuICAgIHN0YXRlLmNoaWxkcmVuID0gW107XG4gICAgdGhpcy5fd3JhcCgpO1xuICB9XG59XG5tb2R1bGUuZXhwb3J0cyA9IE5vZGU7XG5cbnZhciBzdGF0ZVByb3BzID0gW1xuICAnZW5jJywgJ3BhcmVudCcsICdjaGlsZHJlbicsICd0YWcnLCAnYXJncycsICdyZXZlcnNlQXJncycsICdjaG9pY2UnLFxuICAnb3B0aW9uYWwnLCAnYW55JywgJ29iaicsICd1c2UnLCAnYWx0ZXJlZFVzZScsICdrZXknLCAnZGVmYXVsdCcsICdleHBsaWNpdCcsXG4gICdpbXBsaWNpdCdcbl07XG5cbk5vZGUucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gY2xvbmUoKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcbiAgdmFyIGNzdGF0ZSA9IHt9O1xuICBzdGF0ZVByb3BzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgIGNzdGF0ZVtwcm9wXSA9IHN0YXRlW3Byb3BdO1xuICB9KTtcbiAgdmFyIHJlcyA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKGNzdGF0ZS5wYXJlbnQpO1xuICByZXMuX2Jhc2VTdGF0ZSA9IGNzdGF0ZTtcbiAgcmV0dXJuIHJlcztcbn07XG5cbk5vZGUucHJvdG90eXBlLl93cmFwID0gZnVuY3Rpb24gd3JhcCgpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuICBtZXRob2RzLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgdGhpc1ttZXRob2RdID0gZnVuY3Rpb24gX3dyYXBwZWRNZXRob2QoKSB7XG4gICAgICB2YXIgY2xvbmUgPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcih0aGlzKTtcbiAgICAgIHN0YXRlLmNoaWxkcmVuLnB1c2goY2xvbmUpO1xuICAgICAgcmV0dXJuIGNsb25lW21ldGhvZF0uYXBwbHkoY2xvbmUsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfSwgdGhpcyk7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uIGluaXQoYm9keSkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cbiAgLy9hc3NlcnQuZXF1YWwoc3RhdGUucGFyZW50LG51bGwsJ3N0YXRlLnBhcmVudCBzaG91bGQgYmUgbnVsbCcpO1xuICBib2R5LmNhbGwodGhpcyk7XG5cbiAgLy8gRmlsdGVyIGNoaWxkcmVuXG4gIHN0YXRlLmNoaWxkcmVuID0gc3RhdGUuY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgcmV0dXJuIGNoaWxkLl9iYXNlU3RhdGUucGFyZW50ID09PSB0aGlzO1xuICB9LCB0aGlzKTtcbiAgLy8gYXNzZXJ0LmVxdWFsKHN0YXRlLmNoaWxkcmVuLmxlbmd0aCwgMSwgJ1Jvb3Qgbm9kZSBjYW4gaGF2ZSBvbmx5IG9uZSBjaGlsZCcpO1xufTtcblxuTm9kZS5wcm90b3R5cGUuX3VzZUFyZ3MgPSBmdW5jdGlvbiB1c2VBcmdzKGFyZ3MpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXG4gIC8vIEZpbHRlciBjaGlsZHJlbiBhbmQgYXJnc1xuICB2YXIgY2hpbGRyZW4gPSBhcmdzLmZpbHRlcihmdW5jdGlvbihhcmcpIHtcbiAgICByZXR1cm4gYXJnIGluc3RhbmNlb2YgdGhpcy5jb25zdHJ1Y3RvcjtcbiAgfSwgdGhpcyk7XG4gIGFyZ3MgPSBhcmdzLmZpbHRlcihmdW5jdGlvbihhcmcpIHtcbiAgICByZXR1cm4gIShhcmcgaW5zdGFuY2VvZiB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgfSwgdGhpcyk7XG5cbiAgaWYgKGNoaWxkcmVuLmxlbmd0aCAhPT0gMCkge1xuICAgIC8vIGFzc2VydC5lcXVhbChzdGF0ZS5jaGlsZHJlbiwgbnVsbCwgJ3N0YXRlLmNoaWxkcmVuIHNob3VsZCBiZSBudWxsJyk7XG4gICAgc3RhdGUuY2hpbGRyZW4gPSBjaGlsZHJlbjtcblxuICAgIC8vIFJlcGxhY2UgcGFyZW50IHRvIG1haW50YWluIGJhY2t3YXJkIGxpbmtcbiAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICBjaGlsZC5fYmFzZVN0YXRlLnBhcmVudCA9IHRoaXM7XG4gICAgfSwgdGhpcyk7XG4gIH1cbiAgaWYgKGFyZ3MubGVuZ3RoICE9PSAwKSB7XG4gICAgLy8gYXNzZXJ0LmVxdWFsKHN0YXRlLmFyZ3MsIG51bGwsICdzdGF0ZS5hcmdzIHNob3VsZCBiZSBudWxsJyk7XG4gICAgc3RhdGUuYXJncyA9IGFyZ3M7XG4gICAgc3RhdGUucmV2ZXJzZUFyZ3MgPSBhcmdzLm1hcChmdW5jdGlvbihhcmcpIHtcbiAgICAgIGlmICh0eXBlb2YgYXJnICE9PSAnb2JqZWN0JyB8fCBhcmcuY29uc3RydWN0b3IgIT09IE9iamVjdClcbiAgICAgICAgcmV0dXJuIGFyZztcblxuICAgICAgdmFyIHJlcyA9IHt9O1xuICAgICAgT2JqZWN0LmtleXMoYXJnKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAoa2V5ID09IChrZXkgfCAwKSlcbiAgICAgICAgICBrZXkgfD0gMDtcbiAgICAgICAgdmFyIHZhbHVlID0gYXJnW2tleV07XG4gICAgICAgIHJlc1t2YWx1ZV0gPSBrZXk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXM7XG4gICAgfSk7XG4gIH1cbn07XG5cbi8vXG4vLyBPdmVycmlkZWQgbWV0aG9kc1xuLy9cblxub3ZlcnJpZGVkLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gIE5vZGUucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbiBfb3ZlcnJpZGVkKCkge1xuICAgIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcbiAgICB0aHJvdyBuZXcgRXJyb3IobWV0aG9kICsgJyBub3QgaW1wbGVtZW50ZWQgZm9yIGVuY29kaW5nOiAnICsgc3RhdGUuZW5jKTtcbiAgfTtcbn0pO1xuXG4vL1xuLy8gUHVibGljIG1ldGhvZHNcbi8vXG5cbnRhZ3MuZm9yRWFjaChmdW5jdGlvbih0YWcpIHtcbiAgTm9kZS5wcm90b3R5cGVbdGFnXSA9IGZ1bmN0aW9uIF90YWdNZXRob2QoKSB7XG4gICAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgIC8vIGFzc2VydC5lcXVhbChzdGF0ZS50YWcsIG51bGwsICdzdGF0ZS50YWcgc2hvdWxkIGJlIG51bGwnKTtcbiAgICBzdGF0ZS50YWcgPSB0YWc7XG5cbiAgICB0aGlzLl91c2VBcmdzKGFyZ3MpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG59KTtcblxuTm9kZS5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24gdXNlKGl0ZW0pIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXG4gIC8vIGFzc2VydC5lcXVhbChzdGF0ZS51c2UsIG51bGwsICdzdGF0ZS51c2Ugc2hvdWxkIGJlIG51bGwnKTtcbiAgc3RhdGUudXNlID0gaXRlbTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbk5vZGUucHJvdG90eXBlLm9wdGlvbmFsID0gZnVuY3Rpb24gb3B0aW9uYWwoKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblxuICBzdGF0ZS5vcHRpb25hbCA9IHRydWU7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5kZWYgPSBmdW5jdGlvbiBkZWYodmFsKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblxuICAvLyBhc3NlcnQuZXF1YWwoc3RhdGVbJ2RlZmF1bHQnXSwgbnVsbCwgXCJzdGF0ZVsnZGVmYXVsdCddIHNob3VsZCBiZSBudWxsXCIpO1xuICBzdGF0ZVsnZGVmYXVsdCddID0gdmFsO1xuICBzdGF0ZS5vcHRpb25hbCA9IHRydWU7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5leHBsaWNpdCA9IGZ1bmN0aW9uIGV4cGxpY2l0KG51bSkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cbiAgLy8gYXNzZXJ0LmVxdWFsKHN0YXRlLmV4cGxpY2l0LG51bGwsICdzdGF0ZS5leHBsaWNpdCBzaG91bGQgYmUgbnVsbCcpO1xuICAvLyBhc3NlcnQuZXF1YWwoc3RhdGUuaW1wbGljaXQsbnVsbCwgJ3N0YXRlLmltcGxpY2l0IHNob3VsZCBiZSBudWxsJyk7XG5cbiAgc3RhdGUuZXhwbGljaXQgPSBudW07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5pbXBsaWNpdCA9IGZ1bmN0aW9uIGltcGxpY2l0KG51bSkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cbiAgICAvLyBhc3NlcnQuZXF1YWwoc3RhdGUuZXhwbGljaXQsbnVsbCwgJ3N0YXRlLmV4cGxpY2l0IHNob3VsZCBiZSBudWxsJyk7XG4gICAgLy8gYXNzZXJ0LmVxdWFsKHN0YXRlLmltcGxpY2l0LG51bGwsICdzdGF0ZS5pbXBsaWNpdCBzaG91bGQgYmUgbnVsbCcpO1xuXG4gICAgc3RhdGUuaW1wbGljaXQgPSBudW07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5vYmogPSBmdW5jdGlvbiBvYmooKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gIHN0YXRlLm9iaiA9IHRydWU7XG5cbiAgaWYgKGFyZ3MubGVuZ3RoICE9PSAwKVxuICAgIHRoaXMuX3VzZUFyZ3MoYXJncyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5rZXkgPSBmdW5jdGlvbiBrZXkobmV3S2V5KSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblxuICAvLyBhc3NlcnQuZXF1YWwoc3RhdGUua2V5LCBudWxsLCAnc3RhdGUua2V5IHNob3VsZCBiZSBudWxsJyk7XG4gIHN0YXRlLmtleSA9IG5ld0tleTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbk5vZGUucHJvdG90eXBlLmFueSA9IGZ1bmN0aW9uIGFueSgpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXG4gIHN0YXRlLmFueSA9IHRydWU7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5jaG9pY2UgPSBmdW5jdGlvbiBjaG9pY2Uob2JqKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblxuICAvLyBhc3NlcnQuZXF1YWwoc3RhdGUuY2hvaWNlLCBudWxsLCdzdGF0ZS5jaG9pY2Ugc2hvdWxkIGJlIG51bGwnKTtcbiAgc3RhdGUuY2hvaWNlID0gb2JqO1xuICB0aGlzLl91c2VBcmdzKE9iamVjdC5rZXlzKG9iaikubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBvYmpba2V5XTtcbiAgfSkpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy9cbi8vIERlY29kaW5nXG4vL1xuXG5Ob2RlLnByb3RvdHlwZS5fZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKGlucHV0KSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblxuICAvLyBEZWNvZGUgcm9vdCBub2RlXG4gIGlmIChzdGF0ZS5wYXJlbnQgPT09IG51bGwpXG4gICAgcmV0dXJuIGlucHV0LndyYXBSZXN1bHQoc3RhdGUuY2hpbGRyZW5bMF0uX2RlY29kZShpbnB1dCkpO1xuXG4gIHZhciByZXN1bHQgPSBzdGF0ZVsnZGVmYXVsdCddO1xuICB2YXIgcHJlc2VudCA9IHRydWU7XG5cbiAgdmFyIHByZXZLZXk7XG4gIGlmIChzdGF0ZS5rZXkgIT09IG51bGwpXG4gICAgcHJldktleSA9IGlucHV0LmVudGVyS2V5KHN0YXRlLmtleSk7XG5cbiAgLy8gQ2hlY2sgaWYgdGFnIGlzIHRoZXJlXG4gIGlmIChzdGF0ZS5vcHRpb25hbCkge1xuICAgIHZhciB0YWcgPSBudWxsO1xuICAgIGlmIChzdGF0ZS5leHBsaWNpdCAhPT0gbnVsbClcbiAgICAgIHRhZyA9IHN0YXRlLmV4cGxpY2l0O1xuICAgIGVsc2UgaWYgKHN0YXRlLmltcGxpY2l0ICE9PSBudWxsKVxuICAgICAgdGFnID0gc3RhdGUuaW1wbGljaXQ7XG4gICAgZWxzZSBpZiAoc3RhdGUudGFnICE9PSBudWxsKVxuICAgICAgdGFnID0gc3RhdGUudGFnO1xuXG4gICAgaWYgKHRhZyA9PT0gbnVsbCAmJiAhc3RhdGUuYW55KSB7XG4gICAgICAvLyBUcmlhbCBhbmQgRXJyb3JcbiAgICAgIHZhciBzYXZlID0gaW5wdXQuc2F2ZSgpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHN0YXRlLmNob2ljZSA9PT0gbnVsbClcbiAgICAgICAgICB0aGlzLl9kZWNvZGVHZW5lcmljKHN0YXRlLnRhZywgaW5wdXQpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgdGhpcy5fZGVjb2RlQ2hvaWNlKGlucHV0KTtcbiAgICAgICAgcHJlc2VudCA9IHRydWU7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHByZXNlbnQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlucHV0LnJlc3RvcmUoc2F2ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByZXNlbnQgPSB0aGlzLl9wZWVrVGFnKGlucHV0LCB0YWcsIHN0YXRlLmFueSk7XG5cbiAgICAgIGlmIChpbnB1dC5pc0Vycm9yKHByZXNlbnQpKVxuICAgICAgICByZXR1cm4gcHJlc2VudDtcbiAgICB9XG4gIH1cblxuICAvLyBQdXNoIG9iamVjdCBvbiBzdGFja1xuICB2YXIgcHJldk9iajtcbiAgaWYgKHN0YXRlLm9iaiAmJiBwcmVzZW50KVxuICAgIHByZXZPYmogPSBpbnB1dC5lbnRlck9iamVjdCgpO1xuXG4gIGlmIChwcmVzZW50KSB7XG4gICAgLy8gVW53cmFwIGV4cGxpY2l0IHZhbHVlc1xuICAgIGlmIChzdGF0ZS5leHBsaWNpdCAhPT0gbnVsbCkge1xuICAgICAgdmFyIGV4cGxpY2l0ID0gdGhpcy5fZGVjb2RlVGFnKGlucHV0LCBzdGF0ZS5leHBsaWNpdCk7XG4gICAgICBpZiAoaW5wdXQuaXNFcnJvcihleHBsaWNpdCkpXG4gICAgICAgIHJldHVybiBleHBsaWNpdDtcbiAgICAgIGlucHV0ID0gZXhwbGljaXQ7XG4gICAgfVxuXG4gICAgLy8gVW53cmFwIGltcGxpY2l0IGFuZCBub3JtYWwgdmFsdWVzXG4gICAgaWYgKHN0YXRlLnVzZSA9PT0gbnVsbCAmJiBzdGF0ZS5jaG9pY2UgPT09IG51bGwpIHtcbiAgICAgIGlmIChzdGF0ZS5hbnkpXG4gICAgICAgIHZhciBzYXZlID0gaW5wdXQuc2F2ZSgpO1xuICAgICAgdmFyIGJvZHkgPSB0aGlzLl9kZWNvZGVUYWcoXG4gICAgICAgIGlucHV0LFxuICAgICAgICBzdGF0ZS5pbXBsaWNpdCAhPT0gbnVsbCA/IHN0YXRlLmltcGxpY2l0IDogc3RhdGUudGFnLFxuICAgICAgICBzdGF0ZS5hbnlcbiAgICAgICk7XG4gICAgICBpZiAoaW5wdXQuaXNFcnJvcihib2R5KSlcbiAgICAgICAgcmV0dXJuIGJvZHk7XG5cbiAgICAgIGlmIChzdGF0ZS5hbnkpXG4gICAgICAgIHJlc3VsdCA9IGlucHV0LnJhdyhzYXZlKTtcbiAgICAgIGVsc2VcbiAgICAgICAgaW5wdXQgPSBib2R5O1xuICAgIH1cblxuICAgIC8vIFNlbGVjdCBwcm9wZXIgbWV0aG9kIGZvciB0YWdcbiAgICBpZiAoc3RhdGUuYW55KVxuICAgICAgcmVzdWx0ID0gcmVzdWx0O1xuICAgIGVsc2UgaWYgKHN0YXRlLmNob2ljZSA9PT0gbnVsbClcbiAgICAgIHJlc3VsdCA9IHRoaXMuX2RlY29kZUdlbmVyaWMoc3RhdGUudGFnLCBpbnB1dCk7XG4gICAgZWxzZVxuICAgICAgcmVzdWx0ID0gdGhpcy5fZGVjb2RlQ2hvaWNlKGlucHV0KTtcblxuICAgIGlmIChpbnB1dC5pc0Vycm9yKHJlc3VsdCkpXG4gICAgICByZXR1cm4gcmVzdWx0O1xuXG4gICAgLy8gRGVjb2RlIGNoaWxkcmVuXG4gICAgaWYgKCFzdGF0ZS5hbnkgJiYgc3RhdGUuY2hvaWNlID09PSBudWxsICYmIHN0YXRlLmNoaWxkcmVuICE9PSBudWxsKSB7XG4gICAgICB2YXIgZmFpbCA9IHN0YXRlLmNoaWxkcmVuLnNvbWUoZnVuY3Rpb24gZGVjb2RlQ2hpbGRyZW4oY2hpbGQpIHtcbiAgICAgICAgLy8gTk9URTogV2UgYXJlIGlnbm9yaW5nIGVycm9ycyBoZXJlLCB0byBsZXQgcGFyc2VyIGNvbnRpbnVlIHdpdGggb3RoZXJcbiAgICAgICAgLy8gcGFydHMgb2YgZW5jb2RlZCBkYXRhXG4gICAgICAgIGNoaWxkLl9kZWNvZGUoaW5wdXQpO1xuICAgICAgfSk7XG4gICAgICBpZiAoZmFpbClcbiAgICAgICAgcmV0dXJuIGVycjtcbiAgICB9XG4gIH1cblxuICAvLyBQb3Agb2JqZWN0XG4gIGlmIChzdGF0ZS5vYmogJiYgcHJlc2VudClcbiAgICByZXN1bHQgPSBpbnB1dC5sZWF2ZU9iamVjdChwcmV2T2JqKTtcblxuICAvLyBTZXQga2V5XG4gIGlmIChzdGF0ZS5rZXkgIT09IG51bGwgJiYgKHJlc3VsdCAhPT0gbnVsbCB8fCBwcmVzZW50ID09PSB0cnVlKSlcbiAgICBpbnB1dC5sZWF2ZUtleShwcmV2S2V5LCBzdGF0ZS5rZXksIHJlc3VsdCk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbk5vZGUucHJvdG90eXBlLl9kZWNvZGVHZW5lcmljID0gZnVuY3Rpb24gZGVjb2RlR2VuZXJpYyh0YWcsIGlucHV0KSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblxuICBpZiAodGFnID09PSAnc2VxJyB8fCB0YWcgPT09ICdzZXQnKVxuICAgIHJldHVybiBudWxsO1xuICBpZiAodGFnID09PSAnc2Vxb2YnIHx8IHRhZyA9PT0gJ3NldG9mJylcbiAgICByZXR1cm4gdGhpcy5fZGVjb2RlTGlzdChpbnB1dCwgdGFnLCBzdGF0ZS5hcmdzWzBdKTtcbiAgZWxzZSBpZiAodGFnID09PSAnb2N0c3RyJyB8fCB0YWcgPT09ICdiaXRzdHInKVxuICAgIHJldHVybiB0aGlzLl9kZWNvZGVTdHIoaW5wdXQsIHRhZyk7XG4gIGVsc2UgaWYgKHRhZyA9PT0gJ2lhNXN0cicgfHwgdGFnID09PSAndXRmOHN0cicpXG4gICAgcmV0dXJuIHRoaXMuX2RlY29kZVN0cihpbnB1dCwgdGFnKTtcbiAgZWxzZSBpZiAodGFnID09PSAnb2JqaWQnICYmIHN0YXRlLmFyZ3MpXG4gICAgcmV0dXJuIHRoaXMuX2RlY29kZU9iamlkKGlucHV0LCBzdGF0ZS5hcmdzWzBdLCBzdGF0ZS5hcmdzWzFdKTtcbiAgZWxzZSBpZiAodGFnID09PSAnb2JqaWQnKVxuICAgIHJldHVybiB0aGlzLl9kZWNvZGVPYmppZChpbnB1dCwgbnVsbCwgbnVsbCk7XG4gIGVsc2UgaWYgKHRhZyA9PT0gJ2dlbnRpbWUnIHx8IHRhZyA9PT0gJ3V0Y3RpbWUnKVxuICAgIHJldHVybiB0aGlzLl9kZWNvZGVUaW1lKGlucHV0LCB0YWcpO1xuICBlbHNlIGlmICh0YWcgPT09ICdudWxsXycpXG4gICAgcmV0dXJuIHRoaXMuX2RlY29kZU51bGwoaW5wdXQpO1xuICBlbHNlIGlmICh0YWcgPT09ICdib29sJylcbiAgICByZXR1cm4gdGhpcy5fZGVjb2RlQm9vbChpbnB1dCk7XG4gIGVsc2UgaWYgKHRhZyA9PT0gJ2ludCcgfHwgdGFnID09PSAnZW51bScpXG4gICAgcmV0dXJuIHRoaXMuX2RlY29kZUludChpbnB1dCwgc3RhdGUuYXJncyAmJiBzdGF0ZS5hcmdzWzBdKTtcbiAgZWxzZSBpZiAoc3RhdGUudXNlICE9PSBudWxsKVxuICAgIHJldHVybiB0aGlzLl9nZXRVc2Uoc3RhdGUudXNlLCBpbnB1dC5fcmVwb3J0ZXJTdGF0ZS5vYmopLl9kZWNvZGUoaW5wdXQpO1xuICBlbHNlXG4gICAgcmV0dXJuIGlucHV0LmVycm9yKCd1bmtub3duIHRhZzogJyArIHRhZyk7XG5cbiAgcmV0dXJuIG51bGw7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5fZ2V0VXNlID0gZnVuY3Rpb24gX2dldFVzZShlbnRpdHksIG9iaikge1xuXG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcbiAgLy8gQ3JlYXRlIGFsdGVyZWQgdXNlIGRlY29kZXIgaWYgaW1wbGljaXQgaXMgc2V0XG4gIHN0YXRlLnVzZURlY29kZXIgPSB0aGlzLl91c2UoZW50aXR5LCBvYmopO1xuICAvLyBhc3NlcnQuZXF1YWwoc3RhdGUudXNlRGVjb2Rlci5fYmFzZVN0YXRlLnBhcmVudCwgbnVsbCwgJ3N0YXRlLnVzZURlY29kZXIuX2Jhc2VTdGF0ZS5wYXJlbnQgc2hvdWxkIGJlIG51bGwnKTtcbiAgc3RhdGUudXNlRGVjb2RlciA9IHN0YXRlLnVzZURlY29kZXIuX2Jhc2VTdGF0ZS5jaGlsZHJlblswXTtcbiAgaWYgKHN0YXRlLmltcGxpY2l0ICE9PSBzdGF0ZS51c2VEZWNvZGVyLl9iYXNlU3RhdGUuaW1wbGljaXQpIHtcbiAgICBzdGF0ZS51c2VEZWNvZGVyID0gc3RhdGUudXNlRGVjb2Rlci5jbG9uZSgpO1xuICAgIHN0YXRlLnVzZURlY29kZXIuX2Jhc2VTdGF0ZS5pbXBsaWNpdCA9IHN0YXRlLmltcGxpY2l0O1xuICB9XG4gIHJldHVybiBzdGF0ZS51c2VEZWNvZGVyO1xufTtcblxuTm9kZS5wcm90b3R5cGUuX2RlY29kZUNob2ljZSA9IGZ1bmN0aW9uIGRlY29kZUNob2ljZShpbnB1dCkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG4gIHZhciByZXN1bHQgPSBudWxsO1xuICB2YXIgbWF0Y2ggPSBmYWxzZTtcblxuICBPYmplY3Qua2V5cyhzdGF0ZS5jaG9pY2UpLnNvbWUoZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIHNhdmUgPSBpbnB1dC5zYXZlKCk7XG4gICAgdmFyIG5vZGUgPSBzdGF0ZS5jaG9pY2Vba2V5XTtcbiAgICB0cnkge1xuICAgICAgdmFyIHZhbHVlID0gbm9kZS5fZGVjb2RlKGlucHV0KTtcbiAgICAgIGlmIChpbnB1dC5pc0Vycm9yKHZhbHVlKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgICByZXN1bHQgPSB7IHR5cGU6IGtleSwgdmFsdWU6IHZhbHVlIH07XG4gICAgICBtYXRjaCA9IHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaW5wdXQucmVzdG9yZShzYXZlKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sIHRoaXMpO1xuXG4gIGlmICghbWF0Y2gpXG4gICAgcmV0dXJuIGlucHV0LmVycm9yKCdDaG9pY2Ugbm90IG1hdGNoZWQnKTtcblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy9cbi8vIEVuY29kaW5nXG4vL1xuXG5Ob2RlLnByb3RvdHlwZS5fY3JlYXRlRW5jb2RlckJ1ZmZlciA9IGZ1bmN0aW9uIGNyZWF0ZUVuY29kZXJCdWZmZXIoZGF0YSkge1xuICByZXR1cm4gbmV3IEVuY29kZXJCdWZmZXIoZGF0YSwgdGhpcy5yZXBvcnRlcik7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5fZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKGRhdGEsIHJlcG9ydGVyLCBwYXJlbnQpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuICBpZiAoc3RhdGVbJ2RlZmF1bHQnXSAhPT0gbnVsbCAmJiBzdGF0ZVsnZGVmYXVsdCddID09PSBkYXRhKVxuICAgIHJldHVybjtcblxuICB2YXIgcmVzdWx0ID0gdGhpcy5fZW5jb2RlVmFsdWUoZGF0YSwgcmVwb3J0ZXIsIHBhcmVudCk7XG4gIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZClcbiAgICByZXR1cm47XG5cbiAgaWYgKHRoaXMuX3NraXBEZWZhdWx0KHJlc3VsdCwgcmVwb3J0ZXIsIHBhcmVudCkpXG4gICAgcmV0dXJuO1xuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5fZW5jb2RlVmFsdWUgPSBmdW5jdGlvbiBlbmNvZGUoZGF0YSwgcmVwb3J0ZXIsIHBhcmVudCkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cbiAgLy8gRGVjb2RlIHJvb3Qgbm9kZVxuICBpZiAoc3RhdGUucGFyZW50ID09PSBudWxsKVxuICAgIHJldHVybiBzdGF0ZS5jaGlsZHJlblswXS5fZW5jb2RlKGRhdGEsIHJlcG9ydGVyIHx8IG5ldyBSZXBvcnRlcigpKTtcblxuICB2YXIgcmVzdWx0ID0gbnVsbDtcbiAgdmFyIHByZXNlbnQgPSB0cnVlO1xuXG4gIC8vIFNldCByZXBvcnRlciB0byBzaGFyZSBpdCB3aXRoIGEgY2hpbGQgY2xhc3NcbiAgdGhpcy5yZXBvcnRlciA9IHJlcG9ydGVyO1xuXG4gIC8vIENoZWNrIGlmIGRhdGEgaXMgdGhlcmVcbiAgaWYgKHN0YXRlLm9wdGlvbmFsICYmIGRhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChzdGF0ZVsnZGVmYXVsdCddICE9PSBudWxsKVxuICAgICAgZGF0YSA9IHN0YXRlWydkZWZhdWx0J11cbiAgICBlbHNlXG4gICAgICByZXR1cm47XG4gIH1cblxuICAvLyBGb3IgZXJyb3IgcmVwb3J0aW5nXG4gIHZhciBwcmV2S2V5O1xuXG4gIC8vIEVuY29kZSBjaGlsZHJlbiBmaXJzdFxuICB2YXIgY29udGVudCA9IG51bGw7XG4gIHZhciBwcmltaXRpdmUgPSBmYWxzZTtcbiAgaWYgKHN0YXRlLmFueSkge1xuICAgIC8vIEFueXRoaW5nIHRoYXQgd2FzIGdpdmVuIGlzIHRyYW5zbGF0ZWQgdG8gYnVmZmVyXG4gICAgcmVzdWx0ID0gdGhpcy5fY3JlYXRlRW5jb2RlckJ1ZmZlcihkYXRhKTtcbiAgfSBlbHNlIGlmIChzdGF0ZS5jaG9pY2UpIHtcbiAgICByZXN1bHQgPSB0aGlzLl9lbmNvZGVDaG9pY2UoZGF0YSwgcmVwb3J0ZXIpO1xuICB9IGVsc2UgaWYgKHN0YXRlLmNoaWxkcmVuKSB7XG4gICAgY29udGVudCA9IHN0YXRlLmNoaWxkcmVuLm1hcChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgaWYgKGNoaWxkLl9iYXNlU3RhdGUudGFnID09PSAnbnVsbF8nKVxuICAgICAgICByZXR1cm4gY2hpbGQuX2VuY29kZShudWxsLCByZXBvcnRlciwgZGF0YSk7XG5cbiAgICAgIGlmIChjaGlsZC5fYmFzZVN0YXRlLmtleSA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuIHJlcG9ydGVyLmVycm9yKCdDaGlsZCBzaG91bGQgaGF2ZSBhIGtleScpO1xuICAgICAgdmFyIHByZXZLZXkgPSByZXBvcnRlci5lbnRlcktleShjaGlsZC5fYmFzZVN0YXRlLmtleSk7XG5cbiAgICAgIGlmICh0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpXG4gICAgICAgIHJldHVybiByZXBvcnRlci5lcnJvcignQ2hpbGQgZXhwZWN0ZWQsIGJ1dCBpbnB1dCBpcyBub3Qgb2JqZWN0Jyk7XG5cbiAgICAgIHZhciByZXMgPSBjaGlsZC5fZW5jb2RlKGRhdGFbY2hpbGQuX2Jhc2VTdGF0ZS5rZXldLCByZXBvcnRlciwgZGF0YSk7XG4gICAgICByZXBvcnRlci5sZWF2ZUtleShwcmV2S2V5KTtcblxuICAgICAgcmV0dXJuIHJlcztcbiAgICB9LCB0aGlzKS5maWx0ZXIoZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZDtcbiAgICB9KTtcblxuICAgIGNvbnRlbnQgPSB0aGlzLl9jcmVhdGVFbmNvZGVyQnVmZmVyKGNvbnRlbnQpO1xuICB9IGVsc2Uge1xuICAgIGlmIChzdGF0ZS50YWcgPT09ICdzZXFvZicgfHwgc3RhdGUudGFnID09PSAnc2V0b2YnKSB7XG4gICAgICAvLyBUT0RPKGluZHV0bnkpOiB0aGlzIHNob3VsZCBiZSB0aHJvd24gb24gRFNMIGxldmVsXG4gICAgICBpZiAoIShzdGF0ZS5hcmdzICYmIHN0YXRlLmFyZ3MubGVuZ3RoID09PSAxKSlcbiAgICAgICAgcmV0dXJuIHJlcG9ydGVyLmVycm9yKCdUb28gbWFueSBhcmdzIGZvciA6ICcgKyBzdGF0ZS50YWcpO1xuXG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YSkpXG4gICAgICAgIHJldHVybiByZXBvcnRlci5lcnJvcignc2Vxb2Yvc2V0b2YsIGJ1dCBkYXRhIGlzIG5vdCBBcnJheScpO1xuXG4gICAgICB2YXIgY2hpbGQgPSB0aGlzLmNsb25lKCk7XG4gICAgICBjaGlsZC5fYmFzZVN0YXRlLmltcGxpY2l0ID0gbnVsbDtcbiAgICAgIGNvbnRlbnQgPSB0aGlzLl9jcmVhdGVFbmNvZGVyQnVmZmVyKGRhdGEubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9nZXRVc2Uoc3RhdGUuYXJnc1swXSwgZGF0YSkuX2VuY29kZShpdGVtLCByZXBvcnRlcik7XG4gICAgICB9LCBjaGlsZCkpO1xuICAgIH0gZWxzZSBpZiAoc3RhdGUudXNlICE9PSBudWxsKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLl9nZXRVc2Uoc3RhdGUudXNlLCBwYXJlbnQpLl9lbmNvZGUoZGF0YSwgcmVwb3J0ZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb250ZW50ID0gdGhpcy5fZW5jb2RlUHJpbWl0aXZlKHN0YXRlLnRhZywgZGF0YSk7XG4gICAgICBwcmltaXRpdmUgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8vIEVuY29kZSBkYXRhIGl0c2VsZlxuICB2YXIgcmVzdWx0O1xuICBpZiAoIXN0YXRlLmFueSAmJiBzdGF0ZS5jaG9pY2UgPT09IG51bGwpIHtcbiAgICB2YXIgdGFnID0gc3RhdGUuaW1wbGljaXQgIT09IG51bGwgPyBzdGF0ZS5pbXBsaWNpdCA6IHN0YXRlLnRhZztcbiAgICB2YXIgY2xzID0gc3RhdGUuaW1wbGljaXQgPT09IG51bGwgPyAndW5pdmVyc2FsJyA6ICdjb250ZXh0JztcblxuICAgIGlmICh0YWcgPT09IG51bGwpIHtcbiAgICAgIGlmIChzdGF0ZS51c2UgPT09IG51bGwpXG4gICAgICAgIHJlcG9ydGVyLmVycm9yKCdUYWcgY291bGQgYmUgb21taXRlZCBvbmx5IGZvciAudXNlKCknKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHN0YXRlLnVzZSA9PT0gbnVsbClcbiAgICAgICAgcmVzdWx0ID0gdGhpcy5fZW5jb2RlQ29tcG9zaXRlKHRhZywgcHJpbWl0aXZlLCBjbHMsIGNvbnRlbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFdyYXAgaW4gZXhwbGljaXRcbiAgaWYgKHN0YXRlLmV4cGxpY2l0ICE9PSBudWxsKVxuICAgIHJlc3VsdCA9IHRoaXMuX2VuY29kZUNvbXBvc2l0ZShzdGF0ZS5leHBsaWNpdCwgZmFsc2UsICdjb250ZXh0JywgcmVzdWx0KTtcblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuTm9kZS5wcm90b3R5cGUuX2VuY29kZUNob2ljZSA9IGZ1bmN0aW9uIGVuY29kZUNob2ljZShkYXRhLCByZXBvcnRlcikge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cbiAgdmFyIG5vZGUgPSBzdGF0ZS5jaG9pY2VbZGF0YS50eXBlXTtcbiAgLy8gaWYgKCFub2RlKSB7XG4gIC8vICAgYXNzZXJ0KFxuICAvLyAgICAgICBmYWxzZSxcbiAgLy8gICAgICAgZGF0YS50eXBlICsgJyBub3QgZm91bmQgaW4gJyArXG4gIC8vICAgICAgICAgICBKU09OLnN0cmluZ2lmeShPYmplY3Qua2V5cyhzdGF0ZS5jaG9pY2UpKSk7XG4gIC8vIH1cbiAgcmV0dXJuIG5vZGUuX2VuY29kZShkYXRhLnZhbHVlLCByZXBvcnRlcik7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5fZW5jb2RlUHJpbWl0aXZlID0gZnVuY3Rpb24gZW5jb2RlUHJpbWl0aXZlKHRhZywgZGF0YSkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cbiAgaWYgKHRhZyA9PT0gJ29jdHN0cicgfHwgdGFnID09PSAnYml0c3RyJyB8fCB0YWcgPT09ICdpYTVzdHInKVxuICAgIHJldHVybiB0aGlzLl9lbmNvZGVTdHIoZGF0YSwgdGFnKTtcbiAgZWxzZSBpZiAodGFnID09PSAndXRmOHN0cicpXG4gICAgcmV0dXJuIHRoaXMuX2VuY29kZVN0cihkYXRhLCB0YWcpO1xuICBlbHNlIGlmICh0YWcgPT09ICdvYmppZCcgJiYgc3RhdGUuYXJncylcbiAgICByZXR1cm4gdGhpcy5fZW5jb2RlT2JqaWQoZGF0YSwgc3RhdGUucmV2ZXJzZUFyZ3NbMF0sIHN0YXRlLmFyZ3NbMV0pO1xuICBlbHNlIGlmICh0YWcgPT09ICdvYmppZCcpXG4gICAgcmV0dXJuIHRoaXMuX2VuY29kZU9iamlkKGRhdGEsIG51bGwsIG51bGwpO1xuICBlbHNlIGlmICh0YWcgPT09ICdnZW50aW1lJyB8fCB0YWcgPT09ICd1dGN0aW1lJylcbiAgICByZXR1cm4gdGhpcy5fZW5jb2RlVGltZShkYXRhLCB0YWcpO1xuICBlbHNlIGlmICh0YWcgPT09ICdudWxsXycpXG4gICAgcmV0dXJuIHRoaXMuX2VuY29kZU51bGwoKTtcbiAgZWxzZSBpZiAodGFnID09PSAnaW50JyB8fCB0YWcgPT09ICdlbnVtJylcbiAgICByZXR1cm4gdGhpcy5fZW5jb2RlSW50KGRhdGEsIHN0YXRlLmFyZ3MgJiYgc3RhdGUucmV2ZXJzZUFyZ3NbMF0pO1xuICBlbHNlIGlmICh0YWcgPT09ICdib29sJylcbiAgICByZXR1cm4gdGhpcy5fZW5jb2RlQm9vbChkYXRhKTtcbiAgZWxzZVxuICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgdGFnOiAnICsgdGFnKTtcbn07XG4iLCJ2YXIgaW5oZXJpdHMgPSByZXF1aXJlKCd1dGlsJykuaW5oZXJpdHM7XG5cbmZ1bmN0aW9uIFJlcG9ydGVyKG9wdGlvbnMpIHtcbiAgdGhpcy5fcmVwb3J0ZXJTdGF0ZSA9IHtcbiAgICBvYmo6IG51bGwsXG4gICAgcGF0aDogW10sXG4gICAgb3B0aW9uczogb3B0aW9ucyB8fCB7fSxcbiAgICBlcnJvcnM6IFtdXG4gIH07XG59XG5leHBvcnRzLlJlcG9ydGVyID0gUmVwb3J0ZXI7XG5cblJlcG9ydGVyLnByb3RvdHlwZS5pc0Vycm9yID0gZnVuY3Rpb24gaXNFcnJvcihvYmopIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIFJlcG9ydGVyRXJyb3I7XG59O1xuXG5SZXBvcnRlci5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIHNhdmUoKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlcG9ydGVyU3RhdGU7XG5cbiAgcmV0dXJuIHsgb2JqOiBzdGF0ZS5vYmosIHBhdGhMZW46IHN0YXRlLnBhdGgubGVuZ3RoIH07XG59O1xuXG5SZXBvcnRlci5wcm90b3R5cGUucmVzdG9yZSA9IGZ1bmN0aW9uIHJlc3RvcmUoZGF0YSkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZXBvcnRlclN0YXRlO1xuXG4gIHN0YXRlLm9iaiA9IGRhdGEub2JqO1xuICBzdGF0ZS5wYXRoID0gc3RhdGUucGF0aC5zbGljZSgwLCBkYXRhLnBhdGhMZW4pO1xufTtcblxuUmVwb3J0ZXIucHJvdG90eXBlLmVudGVyS2V5ID0gZnVuY3Rpb24gZW50ZXJLZXkoa2V5KSB7XG4gIHJldHVybiB0aGlzLl9yZXBvcnRlclN0YXRlLnBhdGgucHVzaChrZXkpO1xufTtcblxuUmVwb3J0ZXIucHJvdG90eXBlLmxlYXZlS2V5ID0gZnVuY3Rpb24gbGVhdmVLZXkoaW5kZXgsIGtleSwgdmFsdWUpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVwb3J0ZXJTdGF0ZTtcblxuICBzdGF0ZS5wYXRoID0gc3RhdGUucGF0aC5zbGljZSgwLCBpbmRleCAtIDEpO1xuICBpZiAoc3RhdGUub2JqICE9PSBudWxsKVxuICAgIHN0YXRlLm9ialtrZXldID0gdmFsdWU7XG59O1xuXG5SZXBvcnRlci5wcm90b3R5cGUuZW50ZXJPYmplY3QgPSBmdW5jdGlvbiBlbnRlck9iamVjdCgpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVwb3J0ZXJTdGF0ZTtcblxuICB2YXIgcHJldiA9IHN0YXRlLm9iajtcbiAgc3RhdGUub2JqID0ge307XG4gIHJldHVybiBwcmV2O1xufTtcblxuUmVwb3J0ZXIucHJvdG90eXBlLmxlYXZlT2JqZWN0ID0gZnVuY3Rpb24gbGVhdmVPYmplY3QocHJldikge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZXBvcnRlclN0YXRlO1xuXG4gIHZhciBub3cgPSBzdGF0ZS5vYmo7XG4gIHN0YXRlLm9iaiA9IHByZXY7XG4gIHJldHVybiBub3c7XG59O1xuXG5SZXBvcnRlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiBlcnJvcihtc2cpIHtcbiAgdmFyIGVycjtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVwb3J0ZXJTdGF0ZTtcblxuICB2YXIgaW5oZXJpdGVkID0gbXNnIGluc3RhbmNlb2YgUmVwb3J0ZXJFcnJvcjtcbiAgaWYgKGluaGVyaXRlZCkge1xuICAgIGVyciA9IG1zZztcbiAgfSBlbHNlIHtcbiAgICBlcnIgPSBuZXcgUmVwb3J0ZXJFcnJvcihzdGF0ZS5wYXRoLm1hcChmdW5jdGlvbihlbGVtKSB7XG4gICAgICByZXR1cm4gJ1snICsgSlNPTi5zdHJpbmdpZnkoZWxlbSkgKyAnXSc7XG4gICAgfSkuam9pbignJyksIG1zZy5tZXNzYWdlIHx8IG1zZywgbXNnLnN0YWNrKTtcbiAgfVxuXG4gIGlmICghc3RhdGUub3B0aW9ucy5wYXJ0aWFsKVxuICAgIHRocm93IGVycjtcblxuICBpZiAoIWluaGVyaXRlZClcbiAgICBzdGF0ZS5lcnJvcnMucHVzaChlcnIpO1xuXG4gIHJldHVybiBlcnI7XG59O1xuXG5SZXBvcnRlci5wcm90b3R5cGUud3JhcFJlc3VsdCA9IGZ1bmN0aW9uIHdyYXBSZXN1bHQocmVzdWx0KSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlcG9ydGVyU3RhdGU7XG4gIGlmICghc3RhdGUub3B0aW9ucy5wYXJ0aWFsKVxuICAgIHJldHVybiByZXN1bHQ7XG5cbiAgcmV0dXJuIHtcbiAgICByZXN1bHQ6IHRoaXMuaXNFcnJvcihyZXN1bHQpID8gbnVsbCA6IHJlc3VsdCxcbiAgICBlcnJvcnM6IHN0YXRlLmVycm9yc1xuICB9O1xufTtcblxuZnVuY3Rpb24gUmVwb3J0ZXJFcnJvcihwYXRoLCBtc2cpIHtcbiAgdGhpcy5wYXRoID0gcGF0aDtcbiAgdGhpcy5yZXRocm93KG1zZyk7XG59O1xuaW5oZXJpdHMoUmVwb3J0ZXJFcnJvciwgRXJyb3IpO1xuXG5SZXBvcnRlckVycm9yLnByb3RvdHlwZS5yZXRocm93ID0gZnVuY3Rpb24gcmV0aHJvdyhtc2cpIHtcbiAgdGhpcy5tZXNzYWdlID0gbXNnICsgJyBhdDogJyArICh0aGlzLnBhdGggfHwgJyhzaGFsbG93KScpO1xuICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBSZXBvcnRlckVycm9yKTtcblxuICByZXR1cm4gdGhpcztcbn07XG4iLCIoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuXG4ndXNlIHN0cmljdCc7XG5cbi8vIFV0aWxzXG5cbmZ1bmN0aW9uIGFzc2VydCh2YWwsIG1zZykge1xuICBpZiAoIXZhbClcbiAgICB0aHJvdyBuZXcgRXJyb3IobXNnIHx8ICdBc3NlcnRpb24gZmFpbGVkJyk7XG59XG5cbi8vIENvdWxkIHVzZSBgaW5oZXJpdHNgIG1vZHVsZSwgYnV0IGRvbid0IHdhbnQgdG8gbW92ZSBmcm9tIHNpbmdsZSBmaWxlXG4vLyBhcmNoaXRlY3R1cmUgeWV0LlxuZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yO1xuICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fTtcbiAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZTtcbiAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKTtcbiAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yO1xufVxuXG4vLyBCTlxuXG5mdW5jdGlvbiBCTihudW1iZXIsIGJhc2UsIGVuZGlhbikge1xuICAvLyBNYXkgYmUgYG5ldyBCTihibilgID9cbiAgaWYgKG51bWJlciAhPT0gbnVsbCAmJlxuICAgICAgdHlwZW9mIG51bWJlciA9PT0gJ29iamVjdCcgJiZcbiAgICAgIEFycmF5LmlzQXJyYXkobnVtYmVyLndvcmRzKSkge1xuICAgIHJldHVybiBudW1iZXI7XG4gIH1cblxuICB0aGlzLnNpZ24gPSBmYWxzZTtcbiAgdGhpcy53b3JkcyA9IG51bGw7XG4gIHRoaXMubGVuZ3RoID0gMDtcblxuICAvLyBSZWR1Y3Rpb24gY29udGV4dFxuICB0aGlzLnJlZCA9IG51bGw7XG5cbiAgaWYgKGJhc2UgPT09ICdsZScgfHwgYmFzZSA9PT0gJ2JlJykge1xuICAgIGVuZGlhbiA9IGJhc2U7XG4gICAgYmFzZSA9IDEwO1xuICB9XG5cbiAgaWYgKG51bWJlciAhPT0gbnVsbClcbiAgICB0aGlzLl9pbml0KG51bWJlciB8fCAwLCBiYXNlIHx8IDEwLCBlbmRpYW4gfHwgJ2JlJyk7XG59XG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG4gIG1vZHVsZS5leHBvcnRzID0gQk47XG5lbHNlXG4gIGV4cG9ydHMuQk4gPSBCTjtcblxuQk4uQk4gPSBCTjtcbkJOLndvcmRTaXplID0gMjY7XG5cbkJOLnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uIGluaXQobnVtYmVyLCBiYXNlLCBlbmRpYW4pIHtcbiAgaWYgKHR5cGVvZiBudW1iZXIgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIHRoaXMuX2luaXROdW1iZXIobnVtYmVyLCBiYXNlLCBlbmRpYW4pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBudW1iZXIgPT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIHRoaXMuX2luaXRBcnJheShudW1iZXIsIGJhc2UsIGVuZGlhbik7XG4gIH1cbiAgaWYgKGJhc2UgPT09ICdoZXgnKVxuICAgIGJhc2UgPSAxNjtcbiAgYXNzZXJ0KGJhc2UgPT09IChiYXNlIHwgMCkgJiYgYmFzZSA+PSAyICYmIGJhc2UgPD0gMzYpO1xuXG4gIG51bWJlciA9IG51bWJlci50b1N0cmluZygpLnJlcGxhY2UoL1xccysvZywgJycpO1xuICB2YXIgc3RhcnQgPSAwO1xuICBpZiAobnVtYmVyWzBdID09PSAnLScpXG4gICAgc3RhcnQrKztcblxuICBpZiAoYmFzZSA9PT0gMTYpXG4gICAgdGhpcy5fcGFyc2VIZXgobnVtYmVyLCBzdGFydCk7XG4gIGVsc2VcbiAgICB0aGlzLl9wYXJzZUJhc2UobnVtYmVyLCBiYXNlLCBzdGFydCk7XG5cbiAgaWYgKG51bWJlclswXSA9PT0gJy0nKVxuICAgIHRoaXMuc2lnbiA9IHRydWU7XG5cbiAgdGhpcy5zdHJpcCgpO1xuXG4gIGlmIChlbmRpYW4gIT09ICdsZScpXG4gICAgcmV0dXJuO1xuXG4gIHRoaXMuX2luaXRBcnJheSh0aGlzLnRvQXJyYXkoKSwgYmFzZSwgZW5kaWFuKTtcbn07XG5cbkJOLnByb3RvdHlwZS5faW5pdE51bWJlciA9IGZ1bmN0aW9uIF9pbml0TnVtYmVyKG51bWJlciwgYmFzZSwgZW5kaWFuKSB7XG4gIGlmIChudW1iZXIgPCAwKSB7XG4gICAgdGhpcy5zaWduID0gdHJ1ZTtcbiAgICBudW1iZXIgPSAtbnVtYmVyO1xuICB9XG4gIGlmIChudW1iZXIgPCAweDQwMDAwMDApIHtcbiAgICB0aGlzLndvcmRzID0gWyBudW1iZXIgJiAweDNmZmZmZmYgXTtcbiAgICB0aGlzLmxlbmd0aCA9IDE7XG4gIH0gZWxzZSBpZiAobnVtYmVyIDwgMHgxMDAwMDAwMDAwMDAwMCkge1xuICAgIHRoaXMud29yZHMgPSBbXG4gICAgICBudW1iZXIgJiAweDNmZmZmZmYsXG4gICAgICAobnVtYmVyIC8gMHg0MDAwMDAwKSAmIDB4M2ZmZmZmZlxuICAgIF07XG4gICAgdGhpcy5sZW5ndGggPSAyO1xuICB9IGVsc2Uge1xuICAgIGFzc2VydChudW1iZXIgPCAweDIwMDAwMDAwMDAwMDAwKTsgLy8gMiBeIDUzICh1bnNhZmUpXG4gICAgdGhpcy53b3JkcyA9IFtcbiAgICAgIG51bWJlciAmIDB4M2ZmZmZmZixcbiAgICAgIChudW1iZXIgLyAweDQwMDAwMDApICYgMHgzZmZmZmZmLFxuICAgICAgMVxuICAgIF07XG4gICAgdGhpcy5sZW5ndGggPSAzO1xuICB9XG5cbiAgaWYgKGVuZGlhbiAhPT0gJ2xlJylcbiAgICByZXR1cm47XG5cbiAgLy8gUmV2ZXJzZSB0aGUgYnl0ZXNcbiAgdGhpcy5faW5pdEFycmF5KHRoaXMudG9BcnJheSgpLCBiYXNlLCBlbmRpYW4pO1xufTtcblxuQk4ucHJvdG90eXBlLl9pbml0QXJyYXkgPSBmdW5jdGlvbiBfaW5pdEFycmF5KG51bWJlciwgYmFzZSwgZW5kaWFuKSB7XG4gIC8vIFBlcmhhcHMgYSBVaW50OEFycmF5XG4gIGFzc2VydCh0eXBlb2YgbnVtYmVyLmxlbmd0aCA9PT0gJ251bWJlcicpO1xuICBpZiAobnVtYmVyLmxlbmd0aCA8PSAwKSB7XG4gICAgdGhpcy53b3JkcyA9IFsgMCBdO1xuICAgIHRoaXMubGVuZ3RoID0gMTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHRoaXMubGVuZ3RoID0gTWF0aC5jZWlsKG51bWJlci5sZW5ndGggLyAzKTtcbiAgdGhpcy53b3JkcyA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKylcbiAgICB0aGlzLndvcmRzW2ldID0gMDtcblxuICB2YXIgb2ZmID0gMDtcbiAgaWYgKGVuZGlhbiA9PT0gJ2JlJykge1xuICAgIGZvciAodmFyIGkgPSBudW1iZXIubGVuZ3RoIC0gMSwgaiA9IDA7IGkgPj0gMDsgaSAtPSAzKSB7XG4gICAgICB2YXIgdyA9IG51bWJlcltpXSB8IChudW1iZXJbaSAtIDFdIDw8IDgpIHwgKG51bWJlcltpIC0gMl0gPDwgMTYpO1xuICAgICAgdGhpcy53b3Jkc1tqXSB8PSAodyA8PCBvZmYpICYgMHgzZmZmZmZmO1xuICAgICAgdGhpcy53b3Jkc1tqICsgMV0gPSAodyA+Pj4gKDI2IC0gb2ZmKSkgJiAweDNmZmZmZmY7XG4gICAgICBvZmYgKz0gMjQ7XG4gICAgICBpZiAob2ZmID49IDI2KSB7XG4gICAgICAgIG9mZiAtPSAyNjtcbiAgICAgICAgaisrO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmIChlbmRpYW4gPT09ICdsZScpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgaiA9IDA7IGkgPCBudW1iZXIubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgIHZhciB3ID0gbnVtYmVyW2ldIHwgKG51bWJlcltpICsgMV0gPDwgOCkgfCAobnVtYmVyW2kgKyAyXSA8PCAxNik7XG4gICAgICB0aGlzLndvcmRzW2pdIHw9ICh3IDw8IG9mZikgJiAweDNmZmZmZmY7XG4gICAgICB0aGlzLndvcmRzW2ogKyAxXSA9ICh3ID4+PiAoMjYgLSBvZmYpKSAmIDB4M2ZmZmZmZjtcbiAgICAgIG9mZiArPSAyNDtcbiAgICAgIGlmIChvZmYgPj0gMjYpIHtcbiAgICAgICAgb2ZmIC09IDI2O1xuICAgICAgICBqKys7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzLnN0cmlwKCk7XG59O1xuXG5mdW5jdGlvbiBwYXJzZUhleChzdHIsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHIgPSAwO1xuICB2YXIgbGVuID0gTWF0aC5taW4oc3RyLmxlbmd0aCwgZW5kKTtcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgbGVuOyBpKyspIHtcbiAgICB2YXIgYyA9IHN0ci5jaGFyQ29kZUF0KGkpIC0gNDg7XG5cbiAgICByIDw8PSA0O1xuXG4gICAgLy8gJ2EnIC0gJ2YnXG4gICAgaWYgKGMgPj0gNDkgJiYgYyA8PSA1NClcbiAgICAgIHIgfD0gYyAtIDQ5ICsgMHhhO1xuXG4gICAgLy8gJ0EnIC0gJ0YnXG4gICAgZWxzZSBpZiAoYyA+PSAxNyAmJiBjIDw9IDIyKVxuICAgICAgciB8PSBjIC0gMTcgKyAweGE7XG5cbiAgICAvLyAnMCcgLSAnOSdcbiAgICBlbHNlXG4gICAgICByIHw9IGMgJiAweGY7XG4gIH1cbiAgcmV0dXJuIHI7XG59XG5cbkJOLnByb3RvdHlwZS5fcGFyc2VIZXggPSBmdW5jdGlvbiBfcGFyc2VIZXgobnVtYmVyLCBzdGFydCkge1xuICAvLyBDcmVhdGUgcG9zc2libHkgYmlnZ2VyIGFycmF5IHRvIGVuc3VyZSB0aGF0IGl0IGZpdHMgdGhlIG51bWJlclxuICB0aGlzLmxlbmd0aCA9IE1hdGguY2VpbCgobnVtYmVyLmxlbmd0aCAtIHN0YXJ0KSAvIDYpO1xuICB0aGlzLndvcmRzID0gbmV3IEFycmF5KHRoaXMubGVuZ3RoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKVxuICAgIHRoaXMud29yZHNbaV0gPSAwO1xuXG4gIC8vIFNjYW4gMjQtYml0IGNodW5rcyBhbmQgYWRkIHRoZW0gdG8gdGhlIG51bWJlclxuICB2YXIgb2ZmID0gMDtcbiAgZm9yICh2YXIgaSA9IG51bWJlci5sZW5ndGggLSA2LCBqID0gMDsgaSA+PSBzdGFydDsgaSAtPSA2KSB7XG4gICAgdmFyIHcgPSBwYXJzZUhleChudW1iZXIsIGksIGkgKyA2KTtcbiAgICB0aGlzLndvcmRzW2pdIHw9ICh3IDw8IG9mZikgJiAweDNmZmZmZmY7XG4gICAgdGhpcy53b3Jkc1tqICsgMV0gfD0gdyA+Pj4gKDI2IC0gb2ZmKSAmIDB4M2ZmZmZmO1xuICAgIG9mZiArPSAyNDtcbiAgICBpZiAob2ZmID49IDI2KSB7XG4gICAgICBvZmYgLT0gMjY7XG4gICAgICBqKys7XG4gICAgfVxuICB9XG4gIGlmIChpICsgNiAhPT0gc3RhcnQpIHtcbiAgICB2YXIgdyA9IHBhcnNlSGV4KG51bWJlciwgc3RhcnQsIGkgKyA2KTtcbiAgICB0aGlzLndvcmRzW2pdIHw9ICh3IDw8IG9mZikgJiAweDNmZmZmZmY7XG4gICAgdGhpcy53b3Jkc1tqICsgMV0gfD0gdyA+Pj4gKDI2IC0gb2ZmKSAmIDB4M2ZmZmZmO1xuICB9XG4gIHRoaXMuc3RyaXAoKTtcbn07XG5cbmZ1bmN0aW9uIHBhcnNlQmFzZShzdHIsIHN0YXJ0LCBlbmQsIG11bCkge1xuICB2YXIgciA9IDA7XG4gIHZhciBsZW4gPSBNYXRoLm1pbihzdHIubGVuZ3RoLCBlbmQpO1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBsZW47IGkrKykge1xuICAgIHZhciBjID0gc3RyLmNoYXJDb2RlQXQoaSkgLSA0ODtcblxuICAgIHIgKj0gbXVsO1xuXG4gICAgLy8gJ2EnXG4gICAgaWYgKGMgPj0gNDkpXG4gICAgICByICs9IGMgLSA0OSArIDB4YTtcblxuICAgIC8vICdBJ1xuICAgIGVsc2UgaWYgKGMgPj0gMTcpXG4gICAgICByICs9IGMgLSAxNyArIDB4YTtcblxuICAgIC8vICcwJyAtICc5J1xuICAgIGVsc2VcbiAgICAgIHIgKz0gYztcbiAgfVxuICByZXR1cm4gcjtcbn1cblxuQk4ucHJvdG90eXBlLl9wYXJzZUJhc2UgPSBmdW5jdGlvbiBfcGFyc2VCYXNlKG51bWJlciwgYmFzZSwgc3RhcnQpIHtcbiAgLy8gSW5pdGlhbGl6ZSBhcyB6ZXJvXG4gIHRoaXMud29yZHMgPSBbIDAgXTtcbiAgdGhpcy5sZW5ndGggPSAxO1xuXG4gIC8vIEZpbmQgbGVuZ3RoIG9mIGxpbWIgaW4gYmFzZVxuICBmb3IgKHZhciBsaW1iTGVuID0gMCwgbGltYlBvdyA9IDE7IGxpbWJQb3cgPD0gMHgzZmZmZmZmOyBsaW1iUG93ICo9IGJhc2UpXG4gICAgbGltYkxlbisrO1xuICBsaW1iTGVuLS07XG4gIGxpbWJQb3cgPSAobGltYlBvdyAvIGJhc2UpIHwgMDtcblxuICB2YXIgdG90YWwgPSBudW1iZXIubGVuZ3RoIC0gc3RhcnQ7XG4gIHZhciBtb2QgPSB0b3RhbCAlIGxpbWJMZW47XG4gIHZhciBlbmQgPSBNYXRoLm1pbih0b3RhbCwgdG90YWwgLSBtb2QpICsgc3RhcnQ7XG5cbiAgdmFyIHdvcmQgPSAwO1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkgKz0gbGltYkxlbikge1xuICAgIHdvcmQgPSBwYXJzZUJhc2UobnVtYmVyLCBpLCBpICsgbGltYkxlbiwgYmFzZSk7XG5cbiAgICB0aGlzLmltdWxuKGxpbWJQb3cpO1xuICAgIGlmICh0aGlzLndvcmRzWzBdICsgd29yZCA8IDB4NDAwMDAwMClcbiAgICAgIHRoaXMud29yZHNbMF0gKz0gd29yZDtcbiAgICBlbHNlXG4gICAgICB0aGlzLl9pYWRkbih3b3JkKTtcbiAgfVxuXG4gIGlmIChtb2QgIT09IDApIHtcbiAgICB2YXIgcG93ID0gMTtcbiAgICB2YXIgd29yZCA9IHBhcnNlQmFzZShudW1iZXIsIGksIG51bWJlci5sZW5ndGgsIGJhc2UpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtb2Q7IGkrKylcbiAgICAgIHBvdyAqPSBiYXNlO1xuICAgIHRoaXMuaW11bG4ocG93KTtcbiAgICBpZiAodGhpcy53b3Jkc1swXSArIHdvcmQgPCAweDQwMDAwMDApXG4gICAgICB0aGlzLndvcmRzWzBdICs9IHdvcmQ7XG4gICAgZWxzZVxuICAgICAgdGhpcy5faWFkZG4od29yZCk7XG4gIH1cbn07XG5cbkJOLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weShkZXN0KSB7XG4gIGRlc3Qud29yZHMgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspXG4gICAgZGVzdC53b3Jkc1tpXSA9IHRoaXMud29yZHNbaV07XG4gIGRlc3QubGVuZ3RoID0gdGhpcy5sZW5ndGg7XG4gIGRlc3Quc2lnbiA9IHRoaXMuc2lnbjtcbiAgZGVzdC5yZWQgPSB0aGlzLnJlZDtcbn07XG5cbkJOLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lKCkge1xuICB2YXIgciA9IG5ldyBCTihudWxsKTtcbiAgdGhpcy5jb3B5KHIpO1xuICByZXR1cm4gcjtcbn07XG5cbi8vIFJlbW92ZSBsZWFkaW5nIGAwYCBmcm9tIGB0aGlzYFxuQk4ucHJvdG90eXBlLnN0cmlwID0gZnVuY3Rpb24gc3RyaXAoKSB7XG4gIHdoaWxlICh0aGlzLmxlbmd0aCA+IDEgJiYgdGhpcy53b3Jkc1t0aGlzLmxlbmd0aCAtIDFdID09PSAwKVxuICAgIHRoaXMubGVuZ3RoLS07XG4gIHJldHVybiB0aGlzLl9ub3JtU2lnbigpO1xufTtcblxuQk4ucHJvdG90eXBlLl9ub3JtU2lnbiA9IGZ1bmN0aW9uIF9ub3JtU2lnbigpIHtcbiAgLy8gLTAgPSAwXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMSAmJiB0aGlzLndvcmRzWzBdID09PSAwKVxuICAgIHRoaXMuc2lnbiA9IGZhbHNlO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkJOLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCgpIHtcbiAgcmV0dXJuICh0aGlzLnJlZCA/ICc8Qk4tUjogJyA6ICc8Qk46ICcpICsgdGhpcy50b1N0cmluZygxNikgKyAnPic7XG59O1xuXG4vKlxuXG52YXIgemVyb3MgPSBbXTtcbnZhciBncm91cFNpemVzID0gW107XG52YXIgZ3JvdXBCYXNlcyA9IFtdO1xuXG52YXIgcyA9ICcnO1xudmFyIGkgPSAtMTtcbndoaWxlICgrK2kgPCBCTi53b3JkU2l6ZSkge1xuICB6ZXJvc1tpXSA9IHM7XG4gIHMgKz0gJzAnO1xufVxuZ3JvdXBTaXplc1swXSA9IDA7XG5ncm91cFNpemVzWzFdID0gMDtcbmdyb3VwQmFzZXNbMF0gPSAwO1xuZ3JvdXBCYXNlc1sxXSA9IDA7XG52YXIgYmFzZSA9IDIgLSAxO1xud2hpbGUgKCsrYmFzZSA8IDM2ICsgMSkge1xuICB2YXIgZ3JvdXBTaXplID0gMDtcbiAgdmFyIGdyb3VwQmFzZSA9IDE7XG4gIHdoaWxlIChncm91cEJhc2UgPCAoMSA8PCBCTi53b3JkU2l6ZSkgLyBiYXNlKSB7XG4gICAgZ3JvdXBCYXNlICo9IGJhc2U7XG4gICAgZ3JvdXBTaXplICs9IDE7XG4gIH1cbiAgZ3JvdXBTaXplc1tiYXNlXSA9IGdyb3VwU2l6ZTtcbiAgZ3JvdXBCYXNlc1tiYXNlXSA9IGdyb3VwQmFzZTtcbn1cblxuKi9cblxudmFyIHplcm9zID0gW1xuICAnJyxcbiAgJzAnLFxuICAnMDAnLFxuICAnMDAwJyxcbiAgJzAwMDAnLFxuICAnMDAwMDAnLFxuICAnMDAwMDAwJyxcbiAgJzAwMDAwMDAnLFxuICAnMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwJyxcbiAgJzAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwJyxcbiAgJzAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwJyxcbiAgJzAwMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwMDAwJyxcbiAgJzAwMDAwMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwMDAwMDAwJyxcbiAgJzAwMDAwMDAwMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwJyxcbiAgJzAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAnXG5dO1xuXG52YXIgZ3JvdXBTaXplcyA9IFtcbiAgMCwgMCxcbiAgMjUsIDE2LCAxMiwgMTEsIDEwLCA5LCA4LFxuICA4LCA3LCA3LCA3LCA3LCA2LCA2LFxuICA2LCA2LCA2LCA2LCA2LCA1LCA1LFxuICA1LCA1LCA1LCA1LCA1LCA1LCA1LFxuICA1LCA1LCA1LCA1LCA1LCA1LCA1XG5dO1xuXG52YXIgZ3JvdXBCYXNlcyA9IFtcbiAgMCwgMCxcbiAgMzM1NTQ0MzIsIDQzMDQ2NzIxLCAxNjc3NzIxNiwgNDg4MjgxMjUsIDYwNDY2MTc2LCA0MDM1MzYwNywgMTY3NzcyMTYsXG4gIDQzMDQ2NzIxLCAxMDAwMDAwMCwgMTk0ODcxNzEsIDM1ODMxODA4LCA2Mjc0ODUxNywgNzUyOTUzNiwgMTEzOTA2MjUsXG4gIDE2Nzc3MjE2LCAyNDEzNzU2OSwgMzQwMTIyMjQsIDQ3MDQ1ODgxLCA2NDAwMDAwMCwgNDA4NDEwMSwgNTE1MzYzMixcbiAgNjQzNjM0MywgNzk2MjYyNCwgOTc2NTYyNSwgMTE4ODEzNzYsIDE0MzQ4OTA3LCAxNzIxMDM2OCwgMjA1MTExNDksXG4gIDI0MzAwMDAwLCAyODYyOTE1MSwgMzM1NTQ0MzIsIDM5MTM1MzkzLCA0NTQzNTQyNCwgNTI1MjE4NzUsIDYwNDY2MTc2XG5dO1xuXG5CTi5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyhiYXNlLCBwYWRkaW5nKSB7XG4gIGJhc2UgPSBiYXNlIHx8IDEwO1xuICBpZiAoYmFzZSA9PT0gMTYgfHwgYmFzZSA9PT0gJ2hleCcpIHtcbiAgICB2YXIgb3V0ID0gJyc7XG4gICAgdmFyIG9mZiA9IDA7XG4gICAgdmFyIHBhZGRpbmcgPSBwYWRkaW5nIHwgMCB8fCAxO1xuICAgIHZhciBjYXJyeSA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdyA9IHRoaXMud29yZHNbaV07XG4gICAgICB2YXIgd29yZCA9ICgoKHcgPDwgb2ZmKSB8IGNhcnJ5KSAmIDB4ZmZmZmZmKS50b1N0cmluZygxNik7XG4gICAgICBjYXJyeSA9ICh3ID4+PiAoMjQgLSBvZmYpKSAmIDB4ZmZmZmZmO1xuICAgICAgaWYgKGNhcnJ5ICE9PSAwIHx8IGkgIT09IHRoaXMubGVuZ3RoIC0gMSlcbiAgICAgICAgb3V0ID0gemVyb3NbNiAtIHdvcmQubGVuZ3RoXSArIHdvcmQgKyBvdXQ7XG4gICAgICBlbHNlXG4gICAgICAgIG91dCA9IHdvcmQgKyBvdXQ7XG4gICAgICBvZmYgKz0gMjtcbiAgICAgIGlmIChvZmYgPj0gMjYpIHtcbiAgICAgICAgb2ZmIC09IDI2O1xuICAgICAgICBpLS07XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjYXJyeSAhPT0gMClcbiAgICAgIG91dCA9IGNhcnJ5LnRvU3RyaW5nKDE2KSArIG91dDtcbiAgICB3aGlsZSAob3V0Lmxlbmd0aCAlIHBhZGRpbmcgIT09IDApXG4gICAgICBvdXQgPSAnMCcgKyBvdXQ7XG4gICAgaWYgKHRoaXMuc2lnbilcbiAgICAgIG91dCA9ICctJyArIG91dDtcbiAgICByZXR1cm4gb3V0O1xuICB9IGVsc2UgaWYgKGJhc2UgPT09IChiYXNlIHwgMCkgJiYgYmFzZSA+PSAyICYmIGJhc2UgPD0gMzYpIHtcbiAgICAvLyB2YXIgZ3JvdXBTaXplID0gTWF0aC5mbG9vcihCTi53b3JkU2l6ZSAqIE1hdGguTE4yIC8gTWF0aC5sb2coYmFzZSkpO1xuICAgIHZhciBncm91cFNpemUgPSBncm91cFNpemVzW2Jhc2VdO1xuICAgIC8vIHZhciBncm91cEJhc2UgPSBNYXRoLnBvdyhiYXNlLCBncm91cFNpemUpO1xuICAgIHZhciBncm91cEJhc2UgPSBncm91cEJhc2VzW2Jhc2VdO1xuICAgIHZhciBvdXQgPSAnJztcbiAgICB2YXIgYyA9IHRoaXMuY2xvbmUoKTtcbiAgICBjLnNpZ24gPSBmYWxzZTtcbiAgICB3aGlsZSAoYy5jbXBuKDApICE9PSAwKSB7XG4gICAgICB2YXIgciA9IGMubW9kbihncm91cEJhc2UpLnRvU3RyaW5nKGJhc2UpO1xuICAgICAgYyA9IGMuaWRpdm4oZ3JvdXBCYXNlKTtcblxuICAgICAgaWYgKGMuY21wbigwKSAhPT0gMClcbiAgICAgICAgb3V0ID0gemVyb3NbZ3JvdXBTaXplIC0gci5sZW5ndGhdICsgciArIG91dDtcbiAgICAgIGVsc2VcbiAgICAgICAgb3V0ID0gciArIG91dDtcbiAgICB9XG4gICAgaWYgKHRoaXMuY21wbigwKSA9PT0gMClcbiAgICAgIG91dCA9ICcwJyArIG91dDtcbiAgICBpZiAodGhpcy5zaWduKVxuICAgICAgb3V0ID0gJy0nICsgb3V0O1xuICAgIHJldHVybiBvdXQ7XG4gIH0gZWxzZSB7XG4gICAgYXNzZXJ0KGZhbHNlLCAnQmFzZSBzaG91bGQgYmUgYmV0d2VlbiAyIGFuZCAzNicpO1xuICB9XG59O1xuXG5CTi5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICByZXR1cm4gdGhpcy50b1N0cmluZygxNik7XG59O1xuXG5CTi5wcm90b3R5cGUudG9BcnJheSA9IGZ1bmN0aW9uIHRvQXJyYXkoZW5kaWFuKSB7XG4gIHRoaXMuc3RyaXAoKTtcbiAgdmFyIHJlcyA9IG5ldyBBcnJheSh0aGlzLmJ5dGVMZW5ndGgoKSk7XG4gIHJlc1swXSA9IDA7XG5cbiAgdmFyIHEgPSB0aGlzLmNsb25lKCk7XG4gIGlmIChlbmRpYW4gIT09ICdsZScpIHtcbiAgICAvLyBBc3N1bWUgYmlnLWVuZGlhblxuICAgIGZvciAodmFyIGkgPSAwOyBxLmNtcG4oMCkgIT09IDA7IGkrKykge1xuICAgICAgdmFyIGIgPSBxLmFuZGxuKDB4ZmYpO1xuICAgICAgcS5pc2hybig4KTtcblxuICAgICAgcmVzW3Jlcy5sZW5ndGggLSBpIC0gMV0gPSBiO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBBc3N1bWUgbGl0dGxlLWVuZGlhblxuICAgIGZvciAodmFyIGkgPSAwOyBxLmNtcG4oMCkgIT09IDA7IGkrKykge1xuICAgICAgdmFyIGIgPSBxLmFuZGxuKDB4ZmYpO1xuICAgICAgcS5pc2hybig4KTtcblxuICAgICAgcmVzW2ldID0gYjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzO1xufTtcblxuaWYgKE1hdGguY2x6MzIpIHtcbiAgQk4ucHJvdG90eXBlLl9jb3VudEJpdHMgPSBmdW5jdGlvbiBfY291bnRCaXRzKHcpIHtcbiAgICByZXR1cm4gMzIgLSBNYXRoLmNsejMyKHcpO1xuICB9O1xufSBlbHNlIHtcbiAgQk4ucHJvdG90eXBlLl9jb3VudEJpdHMgPSBmdW5jdGlvbiBfY291bnRCaXRzKHcpIHtcbiAgICB2YXIgdCA9IHc7XG4gICAgdmFyIHIgPSAwO1xuICAgIGlmICh0ID49IDB4MTAwMCkge1xuICAgICAgciArPSAxMztcbiAgICAgIHQgPj4+PSAxMztcbiAgICB9XG4gICAgaWYgKHQgPj0gMHg0MCkge1xuICAgICAgciArPSA3O1xuICAgICAgdCA+Pj49IDc7XG4gICAgfVxuICAgIGlmICh0ID49IDB4OCkge1xuICAgICAgciArPSA0O1xuICAgICAgdCA+Pj49IDQ7XG4gICAgfVxuICAgIGlmICh0ID49IDB4MDIpIHtcbiAgICAgIHIgKz0gMjtcbiAgICAgIHQgPj4+PSAyO1xuICAgIH1cbiAgICByZXR1cm4gciArIHQ7XG4gIH07XG59XG5cbkJOLnByb3RvdHlwZS5femVyb0JpdHMgPSBmdW5jdGlvbiBfemVyb0JpdHModykge1xuICAvLyBTaG9ydC1jdXRcbiAgaWYgKHcgPT09IDApXG4gICAgcmV0dXJuIDI2O1xuXG4gIHZhciB0ID0gdztcbiAgdmFyIHIgPSAwO1xuICBpZiAoKHQgJiAweDFmZmYpID09PSAwKSB7XG4gICAgciArPSAxMztcbiAgICB0ID4+Pj0gMTM7XG4gIH1cbiAgaWYgKCh0ICYgMHg3ZikgPT09IDApIHtcbiAgICByICs9IDc7XG4gICAgdCA+Pj49IDc7XG4gIH1cbiAgaWYgKCh0ICYgMHhmKSA9PT0gMCkge1xuICAgIHIgKz0gNDtcbiAgICB0ID4+Pj0gNDtcbiAgfVxuICBpZiAoKHQgJiAweDMpID09PSAwKSB7XG4gICAgciArPSAyO1xuICAgIHQgPj4+PSAyO1xuICB9XG4gIGlmICgodCAmIDB4MSkgPT09IDApXG4gICAgcisrO1xuICByZXR1cm4gcjtcbn07XG5cbi8vIFJldHVybiBudW1iZXIgb2YgdXNlZCBiaXRzIGluIGEgQk5cbkJOLnByb3RvdHlwZS5iaXRMZW5ndGggPSBmdW5jdGlvbiBiaXRMZW5ndGgoKSB7XG4gIHZhciBoaSA9IDA7XG4gIHZhciB3ID0gdGhpcy53b3Jkc1t0aGlzLmxlbmd0aCAtIDFdO1xuICB2YXIgaGkgPSB0aGlzLl9jb3VudEJpdHModyk7XG4gIHJldHVybiAodGhpcy5sZW5ndGggLSAxKSAqIDI2ICsgaGk7XG59O1xuXG4vLyBOdW1iZXIgb2YgdHJhaWxpbmcgemVybyBiaXRzXG5CTi5wcm90b3R5cGUuemVyb0JpdHMgPSBmdW5jdGlvbiB6ZXJvQml0cygpIHtcbiAgaWYgKHRoaXMuY21wbigwKSA9PT0gMClcbiAgICByZXR1cm4gMDtcblxuICB2YXIgciA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gdGhpcy5femVyb0JpdHModGhpcy53b3Jkc1tpXSk7XG4gICAgciArPSBiO1xuICAgIGlmIChiICE9PSAyNilcbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiByO1xufTtcblxuQk4ucHJvdG90eXBlLmJ5dGVMZW5ndGggPSBmdW5jdGlvbiBieXRlTGVuZ3RoKCkge1xuICByZXR1cm4gTWF0aC5jZWlsKHRoaXMuYml0TGVuZ3RoKCkgLyA4KTtcbn07XG5cbi8vIFJldHVybiBuZWdhdGl2ZSBjbG9uZSBvZiBgdGhpc2BcbkJOLnByb3RvdHlwZS5uZWcgPSBmdW5jdGlvbiBuZWcoKSB7XG4gIGlmICh0aGlzLmNtcG4oMCkgPT09IDApXG4gICAgcmV0dXJuIHRoaXMuY2xvbmUoKTtcblxuICB2YXIgciA9IHRoaXMuY2xvbmUoKTtcbiAgci5zaWduID0gIXRoaXMuc2lnbjtcbiAgcmV0dXJuIHI7XG59O1xuXG5cbi8vIE9yIGBudW1gIHdpdGggYHRoaXNgIGluLXBsYWNlXG5CTi5wcm90b3R5cGUuaW9yID0gZnVuY3Rpb24gaW9yKG51bSkge1xuICB0aGlzLnNpZ24gPSB0aGlzLnNpZ24gfHwgbnVtLnNpZ247XG5cbiAgd2hpbGUgKHRoaXMubGVuZ3RoIDwgbnVtLmxlbmd0aClcbiAgICB0aGlzLndvcmRzW3RoaXMubGVuZ3RoKytdID0gMDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IG51bS5sZW5ndGg7IGkrKylcbiAgICB0aGlzLndvcmRzW2ldID0gdGhpcy53b3Jkc1tpXSB8IG51bS53b3Jkc1tpXTtcblxuICByZXR1cm4gdGhpcy5zdHJpcCgpO1xufTtcblxuXG4vLyBPciBgbnVtYCB3aXRoIGB0aGlzYFxuQk4ucHJvdG90eXBlLm9yID0gZnVuY3Rpb24gb3IobnVtKSB7XG4gIGlmICh0aGlzLmxlbmd0aCA+IG51bS5sZW5ndGgpXG4gICAgcmV0dXJuIHRoaXMuY2xvbmUoKS5pb3IobnVtKTtcbiAgZWxzZVxuICAgIHJldHVybiBudW0uY2xvbmUoKS5pb3IodGhpcyk7XG59O1xuXG5cbi8vIEFuZCBgbnVtYCB3aXRoIGB0aGlzYCBpbi1wbGFjZVxuQk4ucHJvdG90eXBlLmlhbmQgPSBmdW5jdGlvbiBpYW5kKG51bSkge1xuICB0aGlzLnNpZ24gPSB0aGlzLnNpZ24gJiYgbnVtLnNpZ247XG5cbiAgLy8gYiA9IG1pbi1sZW5ndGgobnVtLCB0aGlzKVxuICB2YXIgYjtcbiAgaWYgKHRoaXMubGVuZ3RoID4gbnVtLmxlbmd0aClcbiAgICBiID0gbnVtO1xuICBlbHNlXG4gICAgYiA9IHRoaXM7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSsrKVxuICAgIHRoaXMud29yZHNbaV0gPSB0aGlzLndvcmRzW2ldICYgbnVtLndvcmRzW2ldO1xuXG4gIHRoaXMubGVuZ3RoID0gYi5sZW5ndGg7XG5cbiAgcmV0dXJuIHRoaXMuc3RyaXAoKTtcbn07XG5cblxuLy8gQW5kIGBudW1gIHdpdGggYHRoaXNgXG5CTi5wcm90b3R5cGUuYW5kID0gZnVuY3Rpb24gYW5kKG51bSkge1xuICBpZiAodGhpcy5sZW5ndGggPiBudW0ubGVuZ3RoKVxuICAgIHJldHVybiB0aGlzLmNsb25lKCkuaWFuZChudW0pO1xuICBlbHNlXG4gICAgcmV0dXJuIG51bS5jbG9uZSgpLmlhbmQodGhpcyk7XG59O1xuXG5cbi8vIFhvciBgbnVtYCB3aXRoIGB0aGlzYCBpbi1wbGFjZVxuQk4ucHJvdG90eXBlLml4b3IgPSBmdW5jdGlvbiBpeG9yKG51bSkge1xuICB0aGlzLnNpZ24gPSB0aGlzLnNpZ24gfHwgbnVtLnNpZ247XG5cbiAgLy8gYS5sZW5ndGggPiBiLmxlbmd0aFxuICB2YXIgYTtcbiAgdmFyIGI7XG4gIGlmICh0aGlzLmxlbmd0aCA+IG51bS5sZW5ndGgpIHtcbiAgICBhID0gdGhpcztcbiAgICBiID0gbnVtO1xuICB9IGVsc2Uge1xuICAgIGEgPSBudW07XG4gICAgYiA9IHRoaXM7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGIubGVuZ3RoOyBpKyspXG4gICAgdGhpcy53b3Jkc1tpXSA9IGEud29yZHNbaV0gXiBiLndvcmRzW2ldO1xuXG4gIGlmICh0aGlzICE9PSBhKVxuICAgIGZvciAoOyBpIDwgYS5sZW5ndGg7IGkrKylcbiAgICAgIHRoaXMud29yZHNbaV0gPSBhLndvcmRzW2ldO1xuXG4gIHRoaXMubGVuZ3RoID0gYS5sZW5ndGg7XG5cbiAgcmV0dXJuIHRoaXMuc3RyaXAoKTtcbn07XG5cblxuLy8gWG9yIGBudW1gIHdpdGggYHRoaXNgXG5CTi5wcm90b3R5cGUueG9yID0gZnVuY3Rpb24geG9yKG51bSkge1xuICBpZiAodGhpcy5sZW5ndGggPiBudW0ubGVuZ3RoKVxuICAgIHJldHVybiB0aGlzLmNsb25lKCkuaXhvcihudW0pO1xuICBlbHNlXG4gICAgcmV0dXJuIG51bS5jbG9uZSgpLml4b3IodGhpcyk7XG59O1xuXG5cbi8vIFNldCBgYml0YCBvZiBgdGhpc2BcbkJOLnByb3RvdHlwZS5zZXRuID0gZnVuY3Rpb24gc2V0bihiaXQsIHZhbCkge1xuICBhc3NlcnQodHlwZW9mIGJpdCA9PT0gJ251bWJlcicgJiYgYml0ID49IDApO1xuXG4gIHZhciBvZmYgPSAoYml0IC8gMjYpIHwgMDtcbiAgdmFyIHdiaXQgPSBiaXQgJSAyNjtcblxuICB3aGlsZSAodGhpcy5sZW5ndGggPD0gb2ZmKVxuICAgIHRoaXMud29yZHNbdGhpcy5sZW5ndGgrK10gPSAwO1xuXG4gIGlmICh2YWwpXG4gICAgdGhpcy53b3Jkc1tvZmZdID0gdGhpcy53b3Jkc1tvZmZdIHwgKDEgPDwgd2JpdCk7XG4gIGVsc2VcbiAgICB0aGlzLndvcmRzW29mZl0gPSB0aGlzLndvcmRzW29mZl0gJiB+KDEgPDwgd2JpdCk7XG5cbiAgcmV0dXJuIHRoaXMuc3RyaXAoKTtcbn07XG5cblxuLy8gQWRkIGBudW1gIHRvIGB0aGlzYCBpbi1wbGFjZVxuQk4ucHJvdG90eXBlLmlhZGQgPSBmdW5jdGlvbiBpYWRkKG51bSkge1xuICAvLyBuZWdhdGl2ZSArIHBvc2l0aXZlXG4gIGlmICh0aGlzLnNpZ24gJiYgIW51bS5zaWduKSB7XG4gICAgdGhpcy5zaWduID0gZmFsc2U7XG4gICAgdmFyIHIgPSB0aGlzLmlzdWIobnVtKTtcbiAgICB0aGlzLnNpZ24gPSAhdGhpcy5zaWduO1xuICAgIHJldHVybiB0aGlzLl9ub3JtU2lnbigpO1xuXG4gIC8vIHBvc2l0aXZlICsgbmVnYXRpdmVcbiAgfSBlbHNlIGlmICghdGhpcy5zaWduICYmIG51bS5zaWduKSB7XG4gICAgbnVtLnNpZ24gPSBmYWxzZTtcbiAgICB2YXIgciA9IHRoaXMuaXN1YihudW0pO1xuICAgIG51bS5zaWduID0gdHJ1ZTtcbiAgICByZXR1cm4gci5fbm9ybVNpZ24oKTtcbiAgfVxuXG4gIC8vIGEubGVuZ3RoID4gYi5sZW5ndGhcbiAgdmFyIGE7XG4gIHZhciBiO1xuICBpZiAodGhpcy5sZW5ndGggPiBudW0ubGVuZ3RoKSB7XG4gICAgYSA9IHRoaXM7XG4gICAgYiA9IG51bTtcbiAgfSBlbHNlIHtcbiAgICBhID0gbnVtO1xuICAgIGIgPSB0aGlzO1xuICB9XG5cbiAgdmFyIGNhcnJ5ID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHIgPSBhLndvcmRzW2ldICsgYi53b3Jkc1tpXSArIGNhcnJ5O1xuICAgIHRoaXMud29yZHNbaV0gPSByICYgMHgzZmZmZmZmO1xuICAgIGNhcnJ5ID0gciA+Pj4gMjY7XG4gIH1cbiAgZm9yICg7IGNhcnJ5ICE9PSAwICYmIGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHIgPSBhLndvcmRzW2ldICsgY2Fycnk7XG4gICAgdGhpcy53b3Jkc1tpXSA9IHIgJiAweDNmZmZmZmY7XG4gICAgY2FycnkgPSByID4+PiAyNjtcbiAgfVxuXG4gIHRoaXMubGVuZ3RoID0gYS5sZW5ndGg7XG4gIGlmIChjYXJyeSAhPT0gMCkge1xuICAgIHRoaXMud29yZHNbdGhpcy5sZW5ndGhdID0gY2Fycnk7XG4gICAgdGhpcy5sZW5ndGgrKztcbiAgLy8gQ29weSB0aGUgcmVzdCBvZiB0aGUgd29yZHNcbiAgfSBlbHNlIGlmIChhICE9PSB0aGlzKSB7XG4gICAgZm9yICg7IGkgPCBhLmxlbmd0aDsgaSsrKVxuICAgICAgdGhpcy53b3Jkc1tpXSA9IGEud29yZHNbaV07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIEFkZCBgbnVtYCB0byBgdGhpc2BcbkJOLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiBhZGQobnVtKSB7XG4gIGlmIChudW0uc2lnbiAmJiAhdGhpcy5zaWduKSB7XG4gICAgbnVtLnNpZ24gPSBmYWxzZTtcbiAgICB2YXIgcmVzID0gdGhpcy5zdWIobnVtKTtcbiAgICBudW0uc2lnbiA9IHRydWU7XG4gICAgcmV0dXJuIHJlcztcbiAgfSBlbHNlIGlmICghbnVtLnNpZ24gJiYgdGhpcy5zaWduKSB7XG4gICAgdGhpcy5zaWduID0gZmFsc2U7XG4gICAgdmFyIHJlcyA9IG51bS5zdWIodGhpcyk7XG4gICAgdGhpcy5zaWduID0gdHJ1ZTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgaWYgKHRoaXMubGVuZ3RoID4gbnVtLmxlbmd0aClcbiAgICByZXR1cm4gdGhpcy5jbG9uZSgpLmlhZGQobnVtKTtcbiAgZWxzZVxuICAgIHJldHVybiBudW0uY2xvbmUoKS5pYWRkKHRoaXMpO1xufTtcblxuLy8gU3VidHJhY3QgYG51bWAgZnJvbSBgdGhpc2AgaW4tcGxhY2VcbkJOLnByb3RvdHlwZS5pc3ViID0gZnVuY3Rpb24gaXN1YihudW0pIHtcbiAgLy8gdGhpcyAtICgtbnVtKSA9IHRoaXMgKyBudW1cbiAgaWYgKG51bS5zaWduKSB7XG4gICAgbnVtLnNpZ24gPSBmYWxzZTtcbiAgICB2YXIgciA9IHRoaXMuaWFkZChudW0pO1xuICAgIG51bS5zaWduID0gdHJ1ZTtcbiAgICByZXR1cm4gci5fbm9ybVNpZ24oKTtcblxuICAvLyAtdGhpcyAtIG51bSA9IC0odGhpcyArIG51bSlcbiAgfSBlbHNlIGlmICh0aGlzLnNpZ24pIHtcbiAgICB0aGlzLnNpZ24gPSBmYWxzZTtcbiAgICB0aGlzLmlhZGQobnVtKTtcbiAgICB0aGlzLnNpZ24gPSB0cnVlO1xuICAgIHJldHVybiB0aGlzLl9ub3JtU2lnbigpO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCBib3RoIG51bWJlcnMgYXJlIHBvc2l0aXZlXG4gIHZhciBjbXAgPSB0aGlzLmNtcChudW0pO1xuXG4gIC8vIE9wdGltaXphdGlvbiAtIHplcm9pZnlcbiAgaWYgKGNtcCA9PT0gMCkge1xuICAgIHRoaXMuc2lnbiA9IGZhbHNlO1xuICAgIHRoaXMubGVuZ3RoID0gMTtcbiAgICB0aGlzLndvcmRzWzBdID0gMDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGEgPiBiXG4gIHZhciBhO1xuICB2YXIgYjtcbiAgaWYgKGNtcCA+IDApIHtcbiAgICBhID0gdGhpcztcbiAgICBiID0gbnVtO1xuICB9IGVsc2Uge1xuICAgIGEgPSBudW07XG4gICAgYiA9IHRoaXM7XG4gIH1cblxuICB2YXIgY2FycnkgPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGIubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgciA9IGEud29yZHNbaV0gLSBiLndvcmRzW2ldICsgY2Fycnk7XG4gICAgY2FycnkgPSByID4+IDI2O1xuICAgIHRoaXMud29yZHNbaV0gPSByICYgMHgzZmZmZmZmO1xuICB9XG4gIGZvciAoOyBjYXJyeSAhPT0gMCAmJiBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgIHZhciByID0gYS53b3Jkc1tpXSArIGNhcnJ5O1xuICAgIGNhcnJ5ID0gciA+PiAyNjtcbiAgICB0aGlzLndvcmRzW2ldID0gciAmIDB4M2ZmZmZmZjtcbiAgfVxuXG4gIC8vIENvcHkgcmVzdCBvZiB0aGUgd29yZHNcbiAgaWYgKGNhcnJ5ID09PSAwICYmIGkgPCBhLmxlbmd0aCAmJiBhICE9PSB0aGlzKVxuICAgIGZvciAoOyBpIDwgYS5sZW5ndGg7IGkrKylcbiAgICAgIHRoaXMud29yZHNbaV0gPSBhLndvcmRzW2ldO1xuICB0aGlzLmxlbmd0aCA9IE1hdGgubWF4KHRoaXMubGVuZ3RoLCBpKTtcblxuICBpZiAoYSAhPT0gdGhpcylcbiAgICB0aGlzLnNpZ24gPSB0cnVlO1xuXG4gIHJldHVybiB0aGlzLnN0cmlwKCk7XG59O1xuXG4vLyBTdWJ0cmFjdCBgbnVtYCBmcm9tIGB0aGlzYFxuQk4ucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uIHN1YihudW0pIHtcbiAgcmV0dXJuIHRoaXMuY2xvbmUoKS5pc3ViKG51bSk7XG59O1xuXG4vKlxuLy8gTk9URTogVGhpcyBjb3VsZCBiZSBwb3RlbnRpb25hbGx5IHVzZWQgdG8gZ2VuZXJhdGUgbG9vcC1sZXNzIG11bHRpcGxpY2F0aW9uc1xuZnVuY3Rpb24gX2dlbkNvbWJNdWxUbyhhbGVuLCBibGVuKSB7XG4gIHZhciBsZW4gPSBhbGVuICsgYmxlbiAtIDE7XG4gIHZhciBzcmMgPSBbXG4gICAgJ3ZhciBhID0gdGhpcy53b3JkcywgYiA9IG51bS53b3JkcywgbyA9IG91dC53b3JkcywgYyA9IDAsIHcsICcgK1xuICAgICAgICAnbWFzayA9IDB4M2ZmZmZmZiwgc2hpZnQgPSAweDQwMDAwMDA7JyxcbiAgICAnb3V0Lmxlbmd0aCA9ICcgKyBsZW4gKyAnOydcbiAgXTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBsZW47IGsrKykge1xuICAgIHZhciBtaW5KID0gTWF0aC5tYXgoMCwgayAtIGFsZW4gKyAxKTtcbiAgICB2YXIgbWF4SiA9IE1hdGgubWluKGssIGJsZW4gLSAxKTtcblxuICAgIGZvciAodmFyIGogPSBtaW5KOyBqIDw9IG1heEo7IGorKykge1xuICAgICAgdmFyIGkgPSBrIC0gajtcbiAgICAgIHZhciBtdWwgPSAnYVsnICsgaSArICddICogYlsnICsgaiArICddJztcblxuICAgICAgaWYgKGogPT09IG1pbkopIHtcbiAgICAgICAgc3JjLnB1c2goJ3cgPSAnICsgbXVsICsgJyArIGM7Jyk7XG4gICAgICAgIHNyYy5wdXNoKCdjID0gKHcgLyBzaGlmdCkgfCAwOycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3JjLnB1c2goJ3cgKz0gJyArIG11bCArICc7Jyk7XG4gICAgICAgIHNyYy5wdXNoKCdjICs9ICh3IC8gc2hpZnQpIHwgMDsnKTtcbiAgICAgIH1cbiAgICAgIHNyYy5wdXNoKCd3ICY9IG1hc2s7Jyk7XG4gICAgfVxuICAgIHNyYy5wdXNoKCdvWycgKyBrICsgJ10gPSB3OycpO1xuICB9XG4gIHNyYy5wdXNoKCdpZiAoYyAhPT0gMCkgeycsXG4gICAgICAgICAgICcgIG9bJyArIGsgKyAnXSA9IGM7JyxcbiAgICAgICAgICAgJyAgb3V0Lmxlbmd0aCsrOycsXG4gICAgICAgICAgICd9JyxcbiAgICAgICAgICAgJ3JldHVybiBvdXQ7Jyk7XG5cbiAgcmV0dXJuIHNyYy5qb2luKCdcXG4nKTtcbn1cbiovXG5cbkJOLnByb3RvdHlwZS5fc21hbGxNdWxUbyA9IGZ1bmN0aW9uIF9zbWFsbE11bFRvKG51bSwgb3V0KSB7XG4gIG91dC5zaWduID0gbnVtLnNpZ24gIT09IHRoaXMuc2lnbjtcbiAgb3V0Lmxlbmd0aCA9IHRoaXMubGVuZ3RoICsgbnVtLmxlbmd0aDtcblxuICB2YXIgY2FycnkgPSAwO1xuICBmb3IgKHZhciBrID0gMDsgayA8IG91dC5sZW5ndGggLSAxOyBrKyspIHtcbiAgICAvLyBTdW0gYWxsIHdvcmRzIHdpdGggdGhlIHNhbWUgYGkgKyBqID0ga2AgYW5kIGFjY3VtdWxhdGUgYG5jYXJyeWAsXG4gICAgLy8gbm90ZSB0aGF0IG5jYXJyeSBjb3VsZCBiZSA+PSAweDNmZmZmZmZcbiAgICB2YXIgbmNhcnJ5ID0gY2FycnkgPj4+IDI2O1xuICAgIHZhciByd29yZCA9IGNhcnJ5ICYgMHgzZmZmZmZmO1xuICAgIHZhciBtYXhKID0gTWF0aC5taW4oaywgbnVtLmxlbmd0aCAtIDEpO1xuICAgIGZvciAodmFyIGogPSBNYXRoLm1heCgwLCBrIC0gdGhpcy5sZW5ndGggKyAxKTsgaiA8PSBtYXhKOyBqKyspIHtcbiAgICAgIHZhciBpID0gayAtIGo7XG4gICAgICB2YXIgYSA9IHRoaXMud29yZHNbaV0gfCAwO1xuICAgICAgdmFyIGIgPSBudW0ud29yZHNbal0gfCAwO1xuICAgICAgdmFyIHIgPSBhICogYjtcblxuICAgICAgdmFyIGxvID0gciAmIDB4M2ZmZmZmZjtcbiAgICAgIG5jYXJyeSA9IChuY2FycnkgKyAoKHIgLyAweDQwMDAwMDApIHwgMCkpIHwgMDtcbiAgICAgIGxvID0gKGxvICsgcndvcmQpIHwgMDtcbiAgICAgIHJ3b3JkID0gbG8gJiAweDNmZmZmZmY7XG4gICAgICBuY2FycnkgPSAobmNhcnJ5ICsgKGxvID4+PiAyNikpIHwgMDtcbiAgICB9XG4gICAgb3V0LndvcmRzW2tdID0gcndvcmQ7XG4gICAgY2FycnkgPSBuY2Fycnk7XG4gIH1cbiAgaWYgKGNhcnJ5ICE9PSAwKSB7XG4gICAgb3V0LndvcmRzW2tdID0gY2Fycnk7XG4gIH0gZWxzZSB7XG4gICAgb3V0Lmxlbmd0aC0tO1xuICB9XG5cbiAgcmV0dXJuIG91dC5zdHJpcCgpO1xufTtcblxuQk4ucHJvdG90eXBlLl9iaWdNdWxUbyA9IGZ1bmN0aW9uIF9iaWdNdWxUbyhudW0sIG91dCkge1xuICBvdXQuc2lnbiA9IG51bS5zaWduICE9PSB0aGlzLnNpZ247XG4gIG91dC5sZW5ndGggPSB0aGlzLmxlbmd0aCArIG51bS5sZW5ndGg7XG5cbiAgdmFyIGNhcnJ5ID0gMDtcbiAgdmFyIGhuY2FycnkgPSAwO1xuICBmb3IgKHZhciBrID0gMDsgayA8IG91dC5sZW5ndGggLSAxOyBrKyspIHtcbiAgICAvLyBTdW0gYWxsIHdvcmRzIHdpdGggdGhlIHNhbWUgYGkgKyBqID0ga2AgYW5kIGFjY3VtdWxhdGUgYG5jYXJyeWAsXG4gICAgLy8gbm90ZSB0aGF0IG5jYXJyeSBjb3VsZCBiZSA+PSAweDNmZmZmZmZcbiAgICB2YXIgbmNhcnJ5ID0gaG5jYXJyeTtcbiAgICBobmNhcnJ5ID0gMDtcbiAgICB2YXIgcndvcmQgPSBjYXJyeSAmIDB4M2ZmZmZmZjtcbiAgICB2YXIgbWF4SiA9IE1hdGgubWluKGssIG51bS5sZW5ndGggLSAxKTtcbiAgICBmb3IgKHZhciBqID0gTWF0aC5tYXgoMCwgayAtIHRoaXMubGVuZ3RoICsgMSk7IGogPD0gbWF4SjsgaisrKSB7XG4gICAgICB2YXIgaSA9IGsgLSBqO1xuICAgICAgdmFyIGEgPSB0aGlzLndvcmRzW2ldIHwgMDtcbiAgICAgIHZhciBiID0gbnVtLndvcmRzW2pdIHwgMDtcbiAgICAgIHZhciByID0gYSAqIGI7XG5cbiAgICAgIHZhciBsbyA9IHIgJiAweDNmZmZmZmY7XG4gICAgICBuY2FycnkgPSAobmNhcnJ5ICsgKChyIC8gMHg0MDAwMDAwKSB8IDApKSB8IDA7XG4gICAgICBsbyA9IChsbyArIHJ3b3JkKSB8IDA7XG4gICAgICByd29yZCA9IGxvICYgMHgzZmZmZmZmO1xuICAgICAgbmNhcnJ5ID0gKG5jYXJyeSArIChsbyA+Pj4gMjYpKSB8IDA7XG5cbiAgICAgIGhuY2FycnkgKz0gbmNhcnJ5ID4+PiAyNjtcbiAgICAgIG5jYXJyeSAmPSAweDNmZmZmZmY7XG4gICAgfVxuICAgIG91dC53b3Jkc1trXSA9IHJ3b3JkO1xuICAgIGNhcnJ5ID0gbmNhcnJ5O1xuICAgIG5jYXJyeSA9IGhuY2Fycnk7XG4gIH1cbiAgaWYgKGNhcnJ5ICE9PSAwKSB7XG4gICAgb3V0LndvcmRzW2tdID0gY2Fycnk7XG4gIH0gZWxzZSB7XG4gICAgb3V0Lmxlbmd0aC0tO1xuICB9XG5cbiAgcmV0dXJuIG91dC5zdHJpcCgpO1xufTtcblxuQk4ucHJvdG90eXBlLm11bFRvID0gZnVuY3Rpb24gbXVsVG8obnVtLCBvdXQpIHtcbiAgdmFyIHJlcztcbiAgaWYgKHRoaXMubGVuZ3RoICsgbnVtLmxlbmd0aCA8IDYzKVxuICAgIHJlcyA9IHRoaXMuX3NtYWxsTXVsVG8obnVtLCBvdXQpO1xuICBlbHNlXG4gICAgcmVzID0gdGhpcy5fYmlnTXVsVG8obnVtLCBvdXQpO1xuICByZXR1cm4gcmVzO1xufTtcblxuLy8gTXVsdGlwbHkgYHRoaXNgIGJ5IGBudW1gXG5CTi5wcm90b3R5cGUubXVsID0gZnVuY3Rpb24gbXVsKG51bSkge1xuICB2YXIgb3V0ID0gbmV3IEJOKG51bGwpO1xuICBvdXQud29yZHMgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGggKyBudW0ubGVuZ3RoKTtcbiAgcmV0dXJuIHRoaXMubXVsVG8obnVtLCBvdXQpO1xufTtcblxuLy8gSW4tcGxhY2UgTXVsdGlwbGljYXRpb25cbkJOLnByb3RvdHlwZS5pbXVsID0gZnVuY3Rpb24gaW11bChudW0pIHtcbiAgaWYgKHRoaXMuY21wbigwKSA9PT0gMCB8fCBudW0uY21wbigwKSA9PT0gMCkge1xuICAgIHRoaXMud29yZHNbMF0gPSAwO1xuICAgIHRoaXMubGVuZ3RoID0gMTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciB0bGVuID0gdGhpcy5sZW5ndGg7XG4gIHZhciBubGVuID0gbnVtLmxlbmd0aDtcblxuICB0aGlzLnNpZ24gPSBudW0uc2lnbiAhPT0gdGhpcy5zaWduO1xuICB0aGlzLmxlbmd0aCA9IHRoaXMubGVuZ3RoICsgbnVtLmxlbmd0aDtcbiAgdGhpcy53b3Jkc1t0aGlzLmxlbmd0aCAtIDFdID0gMDtcblxuICBmb3IgKHZhciBrID0gdGhpcy5sZW5ndGggLSAyOyBrID49IDA7IGstLSkge1xuICAgIC8vIFN1bSBhbGwgd29yZHMgd2l0aCB0aGUgc2FtZSBgaSArIGogPSBrYCBhbmQgYWNjdW11bGF0ZSBgY2FycnlgLFxuICAgIC8vIG5vdGUgdGhhdCBjYXJyeSBjb3VsZCBiZSA+PSAweDNmZmZmZmZcbiAgICB2YXIgY2FycnkgPSAwO1xuICAgIHZhciByd29yZCA9IDA7XG4gICAgdmFyIG1heEogPSBNYXRoLm1pbihrLCBubGVuIC0gMSk7XG4gICAgZm9yICh2YXIgaiA9IE1hdGgubWF4KDAsIGsgLSB0bGVuICsgMSk7IGogPD0gbWF4SjsgaisrKSB7XG4gICAgICB2YXIgaSA9IGsgLSBqO1xuICAgICAgdmFyIGEgPSB0aGlzLndvcmRzW2ldO1xuICAgICAgdmFyIGIgPSBudW0ud29yZHNbal07XG4gICAgICB2YXIgciA9IGEgKiBiO1xuXG4gICAgICB2YXIgbG8gPSByICYgMHgzZmZmZmZmO1xuICAgICAgY2FycnkgKz0gKHIgLyAweDQwMDAwMDApIHwgMDtcbiAgICAgIGxvICs9IHJ3b3JkO1xuICAgICAgcndvcmQgPSBsbyAmIDB4M2ZmZmZmZjtcbiAgICAgIGNhcnJ5ICs9IGxvID4+PiAyNjtcbiAgICB9XG4gICAgdGhpcy53b3Jkc1trXSA9IHJ3b3JkO1xuICAgIHRoaXMud29yZHNbayArIDFdICs9IGNhcnJ5O1xuICAgIGNhcnJ5ID0gMDtcbiAgfVxuXG4gIC8vIFByb3BhZ2F0ZSBvdmVyZmxvd3NcbiAgdmFyIGNhcnJ5ID0gMDtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHcgPSB0aGlzLndvcmRzW2ldICsgY2Fycnk7XG4gICAgdGhpcy53b3Jkc1tpXSA9IHcgJiAweDNmZmZmZmY7XG4gICAgY2FycnkgPSB3ID4+PiAyNjtcbiAgfVxuXG4gIHJldHVybiB0aGlzLnN0cmlwKCk7XG59O1xuXG5CTi5wcm90b3R5cGUuaW11bG4gPSBmdW5jdGlvbiBpbXVsbihudW0pIHtcbiAgYXNzZXJ0KHR5cGVvZiBudW0gPT09ICdudW1iZXInKTtcblxuICAvLyBDYXJyeVxuICB2YXIgY2FycnkgPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgdyA9IHRoaXMud29yZHNbaV0gKiBudW07XG4gICAgdmFyIGxvID0gKHcgJiAweDNmZmZmZmYpICsgKGNhcnJ5ICYgMHgzZmZmZmZmKTtcbiAgICBjYXJyeSA+Pj0gMjY7XG4gICAgY2FycnkgKz0gKHcgLyAweDQwMDAwMDApIHwgMDtcbiAgICAvLyBOT1RFOiBsbyBpcyAyN2JpdCBtYXhpbXVtXG4gICAgY2FycnkgKz0gbG8gPj4+IDI2O1xuICAgIHRoaXMud29yZHNbaV0gPSBsbyAmIDB4M2ZmZmZmZjtcbiAgfVxuXG4gIGlmIChjYXJyeSAhPT0gMCkge1xuICAgIHRoaXMud29yZHNbaV0gPSBjYXJyeTtcbiAgICB0aGlzLmxlbmd0aCsrO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5CTi5wcm90b3R5cGUubXVsbiA9IGZ1bmN0aW9uIG11bG4obnVtKSB7XG4gIHJldHVybiB0aGlzLmNsb25lKCkuaW11bG4obnVtKTtcbn07XG5cbi8vIGB0aGlzYCAqIGB0aGlzYFxuQk4ucHJvdG90eXBlLnNxciA9IGZ1bmN0aW9uIHNxcigpIHtcbiAgcmV0dXJuIHRoaXMubXVsKHRoaXMpO1xufTtcblxuLy8gYHRoaXNgICogYHRoaXNgIGluLXBsYWNlXG5CTi5wcm90b3R5cGUuaXNxciA9IGZ1bmN0aW9uIGlzcXIoKSB7XG4gIHJldHVybiB0aGlzLm11bCh0aGlzKTtcbn07XG5cbi8vIFNoaWZ0LWxlZnQgaW4tcGxhY2VcbkJOLnByb3RvdHlwZS5pc2hsbiA9IGZ1bmN0aW9uIGlzaGxuKGJpdHMpIHtcbiAgYXNzZXJ0KHR5cGVvZiBiaXRzID09PSAnbnVtYmVyJyAmJiBiaXRzID49IDApO1xuICB2YXIgciA9IGJpdHMgJSAyNjtcbiAgdmFyIHMgPSAoYml0cyAtIHIpIC8gMjY7XG4gIHZhciBjYXJyeU1hc2sgPSAoMHgzZmZmZmZmID4+PiAoMjYgLSByKSkgPDwgKDI2IC0gcik7XG5cbiAgaWYgKHIgIT09IDApIHtcbiAgICB2YXIgY2FycnkgPSAwO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5ld0NhcnJ5ID0gdGhpcy53b3Jkc1tpXSAmIGNhcnJ5TWFzaztcbiAgICAgIHZhciBjID0gKHRoaXMud29yZHNbaV0gLSBuZXdDYXJyeSkgPDwgcjtcbiAgICAgIHRoaXMud29yZHNbaV0gPSBjIHwgY2Fycnk7XG4gICAgICBjYXJyeSA9IG5ld0NhcnJ5ID4+PiAoMjYgLSByKTtcbiAgICB9XG4gICAgaWYgKGNhcnJ5KSB7XG4gICAgICB0aGlzLndvcmRzW2ldID0gY2Fycnk7XG4gICAgICB0aGlzLmxlbmd0aCsrO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzICE9PSAwKSB7XG4gICAgZm9yICh2YXIgaSA9IHRoaXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pXG4gICAgICB0aGlzLndvcmRzW2kgKyBzXSA9IHRoaXMud29yZHNbaV07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXG4gICAgICB0aGlzLndvcmRzW2ldID0gMDtcbiAgICB0aGlzLmxlbmd0aCArPSBzO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuc3RyaXAoKTtcbn07XG5cbi8vIFNoaWZ0LXJpZ2h0IGluLXBsYWNlXG4vLyBOT1RFOiBgaGludGAgaXMgYSBsb3dlc3QgYml0IGJlZm9yZSB0cmFpbGluZyB6ZXJvZXNcbi8vIE5PVEU6IGlmIGBleHRlbmRlZGAgaXMgcHJlc2VudCAtIGl0IHdpbGwgYmUgZmlsbGVkIHdpdGggZGVzdHJveWVkIGJpdHNcbkJOLnByb3RvdHlwZS5pc2hybiA9IGZ1bmN0aW9uIGlzaHJuKGJpdHMsIGhpbnQsIGV4dGVuZGVkKSB7XG4gIGFzc2VydCh0eXBlb2YgYml0cyA9PT0gJ251bWJlcicgJiYgYml0cyA+PSAwKTtcbiAgdmFyIGg7XG4gIGlmIChoaW50KVxuICAgIGggPSAoaGludCAtIChoaW50ICUgMjYpKSAvIDI2O1xuICBlbHNlXG4gICAgaCA9IDA7XG5cbiAgdmFyIHIgPSBiaXRzICUgMjY7XG4gIHZhciBzID0gTWF0aC5taW4oKGJpdHMgLSByKSAvIDI2LCB0aGlzLmxlbmd0aCk7XG4gIHZhciBtYXNrID0gMHgzZmZmZmZmIF4gKCgweDNmZmZmZmYgPj4+IHIpIDw8IHIpO1xuICB2YXIgbWFza2VkV29yZHMgPSBleHRlbmRlZDtcblxuICBoIC09IHM7XG4gIGggPSBNYXRoLm1heCgwLCBoKTtcblxuICAvLyBFeHRlbmRlZCBtb2RlLCBjb3B5IG1hc2tlZCBwYXJ0XG4gIGlmIChtYXNrZWRXb3Jkcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxuICAgICAgbWFza2VkV29yZHMud29yZHNbaV0gPSB0aGlzLndvcmRzW2ldO1xuICAgIG1hc2tlZFdvcmRzLmxlbmd0aCA9IHM7XG4gIH1cblxuICBpZiAocyA9PT0gMCkge1xuICAgIC8vIE5vLW9wLCB3ZSBzaG91bGQgbm90IG1vdmUgYW55dGhpbmcgYXQgYWxsXG4gIH0gZWxzZSBpZiAodGhpcy5sZW5ndGggPiBzKSB7XG4gICAgdGhpcy5sZW5ndGggLT0gcztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspXG4gICAgICB0aGlzLndvcmRzW2ldID0gdGhpcy53b3Jkc1tpICsgc107XG4gIH0gZWxzZSB7XG4gICAgdGhpcy53b3Jkc1swXSA9IDA7XG4gICAgdGhpcy5sZW5ndGggPSAxO1xuICB9XG5cbiAgdmFyIGNhcnJ5ID0gMDtcbiAgZm9yICh2YXIgaSA9IHRoaXMubGVuZ3RoIC0gMTsgaSA+PSAwICYmIChjYXJyeSAhPT0gMCB8fCBpID49IGgpOyBpLS0pIHtcbiAgICB2YXIgd29yZCA9IHRoaXMud29yZHNbaV07XG4gICAgdGhpcy53b3Jkc1tpXSA9IChjYXJyeSA8PCAoMjYgLSByKSkgfCAod29yZCA+Pj4gcik7XG4gICAgY2FycnkgPSB3b3JkICYgbWFzaztcbiAgfVxuXG4gIC8vIFB1c2ggY2FycmllZCBiaXRzIGFzIGEgbWFza1xuICBpZiAobWFza2VkV29yZHMgJiYgY2FycnkgIT09IDApXG4gICAgbWFza2VkV29yZHMud29yZHNbbWFza2VkV29yZHMubGVuZ3RoKytdID0gY2Fycnk7XG5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhpcy53b3Jkc1swXSA9IDA7XG4gICAgdGhpcy5sZW5ndGggPSAxO1xuICB9XG5cbiAgdGhpcy5zdHJpcCgpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gU2hpZnQtbGVmdFxuQk4ucHJvdG90eXBlLnNobG4gPSBmdW5jdGlvbiBzaGxuKGJpdHMpIHtcbiAgcmV0dXJuIHRoaXMuY2xvbmUoKS5pc2hsbihiaXRzKTtcbn07XG5cbi8vIFNoaWZ0LXJpZ2h0XG5CTi5wcm90b3R5cGUuc2hybiA9IGZ1bmN0aW9uIHNocm4oYml0cykge1xuICByZXR1cm4gdGhpcy5jbG9uZSgpLmlzaHJuKGJpdHMpO1xufTtcblxuLy8gVGVzdCBpZiBuIGJpdCBpcyBzZXRcbkJOLnByb3RvdHlwZS50ZXN0biA9IGZ1bmN0aW9uIHRlc3RuKGJpdCkge1xuICBhc3NlcnQodHlwZW9mIGJpdCA9PT0gJ251bWJlcicgJiYgYml0ID49IDApO1xuICB2YXIgciA9IGJpdCAlIDI2O1xuICB2YXIgcyA9IChiaXQgLSByKSAvIDI2O1xuICB2YXIgcSA9IDEgPDwgcjtcblxuICAvLyBGYXN0IGNhc2U6IGJpdCBpcyBtdWNoIGhpZ2hlciB0aGFuIGFsbCBleGlzdGluZyB3b3Jkc1xuICBpZiAodGhpcy5sZW5ndGggPD0gcykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIENoZWNrIGJpdCBhbmQgcmV0dXJuXG4gIHZhciB3ID0gdGhpcy53b3Jkc1tzXTtcblxuICByZXR1cm4gISEodyAmIHEpO1xufTtcblxuLy8gUmV0dXJuIG9ubHkgbG93ZXJzIGJpdHMgb2YgbnVtYmVyIChpbi1wbGFjZSlcbkJOLnByb3RvdHlwZS5pbWFza24gPSBmdW5jdGlvbiBpbWFza24oYml0cykge1xuICBhc3NlcnQodHlwZW9mIGJpdHMgPT09ICdudW1iZXInICYmIGJpdHMgPj0gMCk7XG4gIHZhciByID0gYml0cyAlIDI2O1xuICB2YXIgcyA9IChiaXRzIC0gcikgLyAyNjtcblxuICBhc3NlcnQoIXRoaXMuc2lnbiwgJ2ltYXNrbiB3b3JrcyBvbmx5IHdpdGggcG9zaXRpdmUgbnVtYmVycycpO1xuXG4gIGlmIChyICE9PSAwKVxuICAgIHMrKztcbiAgdGhpcy5sZW5ndGggPSBNYXRoLm1pbihzLCB0aGlzLmxlbmd0aCk7XG5cbiAgaWYgKHIgIT09IDApIHtcbiAgICB2YXIgbWFzayA9IDB4M2ZmZmZmZiBeICgoMHgzZmZmZmZmID4+PiByKSA8PCByKTtcbiAgICB0aGlzLndvcmRzW3RoaXMubGVuZ3RoIC0gMV0gJj0gbWFzaztcbiAgfVxuXG4gIHJldHVybiB0aGlzLnN0cmlwKCk7XG59O1xuXG4vLyBSZXR1cm4gb25seSBsb3dlcnMgYml0cyBvZiBudW1iZXJcbkJOLnByb3RvdHlwZS5tYXNrbiA9IGZ1bmN0aW9uIG1hc2tuKGJpdHMpIHtcbiAgcmV0dXJuIHRoaXMuY2xvbmUoKS5pbWFza24oYml0cyk7XG59O1xuXG4vLyBBZGQgcGxhaW4gbnVtYmVyIGBudW1gIHRvIGB0aGlzYFxuQk4ucHJvdG90eXBlLmlhZGRuID0gZnVuY3Rpb24gaWFkZG4obnVtKSB7XG4gIGFzc2VydCh0eXBlb2YgbnVtID09PSAnbnVtYmVyJyk7XG4gIGlmIChudW0gPCAwKVxuICAgIHJldHVybiB0aGlzLmlzdWJuKC1udW0pO1xuXG4gIC8vIFBvc3NpYmxlIHNpZ24gY2hhbmdlXG4gIGlmICh0aGlzLnNpZ24pIHtcbiAgICBpZiAodGhpcy5sZW5ndGggPT09IDEgJiYgdGhpcy53b3Jkc1swXSA8IG51bSkge1xuICAgICAgdGhpcy53b3Jkc1swXSA9IG51bSAtIHRoaXMud29yZHNbMF07XG4gICAgICB0aGlzLnNpZ24gPSBmYWxzZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHRoaXMuc2lnbiA9IGZhbHNlO1xuICAgIHRoaXMuaXN1Ym4obnVtKTtcbiAgICB0aGlzLnNpZ24gPSB0cnVlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gQWRkIHdpdGhvdXQgY2hlY2tzXG4gIHJldHVybiB0aGlzLl9pYWRkbihudW0pO1xufTtcblxuQk4ucHJvdG90eXBlLl9pYWRkbiA9IGZ1bmN0aW9uIF9pYWRkbihudW0pIHtcbiAgdGhpcy53b3Jkc1swXSArPSBudW07XG5cbiAgLy8gQ2FycnlcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aCAmJiB0aGlzLndvcmRzW2ldID49IDB4NDAwMDAwMDsgaSsrKSB7XG4gICAgdGhpcy53b3Jkc1tpXSAtPSAweDQwMDAwMDA7XG4gICAgaWYgKGkgPT09IHRoaXMubGVuZ3RoIC0gMSlcbiAgICAgIHRoaXMud29yZHNbaSArIDFdID0gMTtcbiAgICBlbHNlXG4gICAgICB0aGlzLndvcmRzW2kgKyAxXSsrO1xuICB9XG4gIHRoaXMubGVuZ3RoID0gTWF0aC5tYXgodGhpcy5sZW5ndGgsIGkgKyAxKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIFN1YnRyYWN0IHBsYWluIG51bWJlciBgbnVtYCBmcm9tIGB0aGlzYFxuQk4ucHJvdG90eXBlLmlzdWJuID0gZnVuY3Rpb24gaXN1Ym4obnVtKSB7XG4gIGFzc2VydCh0eXBlb2YgbnVtID09PSAnbnVtYmVyJyk7XG4gIGlmIChudW0gPCAwKVxuICAgIHJldHVybiB0aGlzLmlhZGRuKC1udW0pO1xuXG4gIGlmICh0aGlzLnNpZ24pIHtcbiAgICB0aGlzLnNpZ24gPSBmYWxzZTtcbiAgICB0aGlzLmlhZGRuKG51bSk7XG4gICAgdGhpcy5zaWduID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHRoaXMud29yZHNbMF0gLT0gbnVtO1xuXG4gIC8vIENhcnJ5XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGggJiYgdGhpcy53b3Jkc1tpXSA8IDA7IGkrKykge1xuICAgIHRoaXMud29yZHNbaV0gKz0gMHg0MDAwMDAwO1xuICAgIHRoaXMud29yZHNbaSArIDFdIC09IDE7XG4gIH1cblxuICByZXR1cm4gdGhpcy5zdHJpcCgpO1xufTtcblxuQk4ucHJvdG90eXBlLmFkZG4gPSBmdW5jdGlvbiBhZGRuKG51bSkge1xuICByZXR1cm4gdGhpcy5jbG9uZSgpLmlhZGRuKG51bSk7XG59O1xuXG5CTi5wcm90b3R5cGUuc3VibiA9IGZ1bmN0aW9uIHN1Ym4obnVtKSB7XG4gIHJldHVybiB0aGlzLmNsb25lKCkuaXN1Ym4obnVtKTtcbn07XG5cbkJOLnByb3RvdHlwZS5pYWJzID0gZnVuY3Rpb24gaWFicygpIHtcbiAgdGhpcy5zaWduID0gZmFsc2U7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5CTi5wcm90b3R5cGUuYWJzID0gZnVuY3Rpb24gYWJzKCkge1xuICByZXR1cm4gdGhpcy5jbG9uZSgpLmlhYnMoKTtcbn07XG5cbkJOLnByb3RvdHlwZS5faXNobG5zdWJtdWwgPSBmdW5jdGlvbiBfaXNobG5zdWJtdWwobnVtLCBtdWwsIHNoaWZ0KSB7XG4gIC8vIEJpZ2dlciBzdG9yYWdlIGlzIG5lZWRlZFxuICB2YXIgbGVuID0gbnVtLmxlbmd0aCArIHNoaWZ0O1xuICB2YXIgaTtcbiAgaWYgKHRoaXMud29yZHMubGVuZ3RoIDwgbGVuKSB7XG4gICAgdmFyIHQgPSBuZXcgQXJyYXkobGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspXG4gICAgICB0W2ldID0gdGhpcy53b3Jkc1tpXTtcbiAgICB0aGlzLndvcmRzID0gdDtcbiAgfSBlbHNlIHtcbiAgICBpID0gdGhpcy5sZW5ndGg7XG4gIH1cblxuICAvLyBaZXJvaWZ5IHJlc3RcbiAgdGhpcy5sZW5ndGggPSBNYXRoLm1heCh0aGlzLmxlbmd0aCwgbGVuKTtcbiAgZm9yICg7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKVxuICAgIHRoaXMud29yZHNbaV0gPSAwO1xuXG4gIHZhciBjYXJyeSA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHcgPSB0aGlzLndvcmRzW2kgKyBzaGlmdF0gKyBjYXJyeTtcbiAgICB2YXIgcmlnaHQgPSBudW0ud29yZHNbaV0gKiBtdWw7XG4gICAgdyAtPSByaWdodCAmIDB4M2ZmZmZmZjtcbiAgICBjYXJyeSA9ICh3ID4+IDI2KSAtICgocmlnaHQgLyAweDQwMDAwMDApIHwgMCk7XG4gICAgdGhpcy53b3Jkc1tpICsgc2hpZnRdID0gdyAmIDB4M2ZmZmZmZjtcbiAgfVxuICBmb3IgKDsgaSA8IHRoaXMubGVuZ3RoIC0gc2hpZnQ7IGkrKykge1xuICAgIHZhciB3ID0gdGhpcy53b3Jkc1tpICsgc2hpZnRdICsgY2Fycnk7XG4gICAgY2FycnkgPSB3ID4+IDI2O1xuICAgIHRoaXMud29yZHNbaSArIHNoaWZ0XSA9IHcgJiAweDNmZmZmZmY7XG4gIH1cblxuICBpZiAoY2FycnkgPT09IDApXG4gICAgcmV0dXJuIHRoaXMuc3RyaXAoKTtcblxuICAvLyBTdWJ0cmFjdGlvbiBvdmVyZmxvd1xuICBhc3NlcnQoY2FycnkgPT09IC0xKTtcbiAgY2FycnkgPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgdyA9IC10aGlzLndvcmRzW2ldICsgY2Fycnk7XG4gICAgY2FycnkgPSB3ID4+IDI2O1xuICAgIHRoaXMud29yZHNbaV0gPSB3ICYgMHgzZmZmZmZmO1xuICB9XG4gIHRoaXMuc2lnbiA9IHRydWU7XG5cbiAgcmV0dXJuIHRoaXMuc3RyaXAoKTtcbn07XG5cbkJOLnByb3RvdHlwZS5fd29yZERpdiA9IGZ1bmN0aW9uIF93b3JkRGl2KG51bSwgbW9kZSkge1xuICB2YXIgc2hpZnQgPSB0aGlzLmxlbmd0aCAtIG51bS5sZW5ndGg7XG5cbiAgdmFyIGEgPSB0aGlzLmNsb25lKCk7XG4gIHZhciBiID0gbnVtO1xuXG4gIC8vIE5vcm1hbGl6ZVxuICB2YXIgYmhpID0gYi53b3Jkc1tiLmxlbmd0aCAtIDFdO1xuICB2YXIgYmhpQml0cyA9IHRoaXMuX2NvdW50Qml0cyhiaGkpO1xuICBzaGlmdCA9IDI2IC0gYmhpQml0cztcbiAgaWYgKHNoaWZ0ICE9PSAwKSB7XG4gICAgYiA9IGIuc2hsbihzaGlmdCk7XG4gICAgYS5pc2hsbihzaGlmdCk7XG4gICAgYmhpID0gYi53b3Jkc1tiLmxlbmd0aCAtIDFdO1xuICB9XG5cbiAgLy8gSW5pdGlhbGl6ZSBxdW90aWVudFxuICB2YXIgbSA9IGEubGVuZ3RoIC0gYi5sZW5ndGg7XG4gIHZhciBxO1xuXG4gIGlmIChtb2RlICE9PSAnbW9kJykge1xuICAgIHEgPSBuZXcgQk4obnVsbCk7XG4gICAgcS5sZW5ndGggPSBtICsgMTtcbiAgICBxLndvcmRzID0gbmV3IEFycmF5KHEubGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHEubGVuZ3RoOyBpKyspXG4gICAgICBxLndvcmRzW2ldID0gMDtcbiAgfVxuXG4gIHZhciBkaWZmID0gYS5jbG9uZSgpLl9pc2hsbnN1Ym11bChiLCAxLCBtKTtcbiAgaWYgKCFkaWZmLnNpZ24pIHtcbiAgICBhID0gZGlmZjtcbiAgICBpZiAocSlcbiAgICAgIHEud29yZHNbbV0gPSAxO1xuICB9XG5cbiAgZm9yICh2YXIgaiA9IG0gLSAxOyBqID49IDA7IGotLSkge1xuICAgIHZhciBxaiA9IGEud29yZHNbYi5sZW5ndGggKyBqXSAqIDB4NDAwMDAwMCArIGEud29yZHNbYi5sZW5ndGggKyBqIC0gMV07XG5cbiAgICAvLyBOT1RFOiAocWogLyBiaGkpIGlzICgweDNmZmZmZmYgKiAweDQwMDAwMDAgKyAweDNmZmZmZmYpIC8gMHgyMDAwMDAwIG1heFxuICAgIC8vICgweDdmZmZmZmYpXG4gICAgcWogPSBNYXRoLm1pbigocWogLyBiaGkpIHwgMCwgMHgzZmZmZmZmKTtcblxuICAgIGEuX2lzaGxuc3VibXVsKGIsIHFqLCBqKTtcbiAgICB3aGlsZSAoYS5zaWduKSB7XG4gICAgICBxai0tO1xuICAgICAgYS5zaWduID0gZmFsc2U7XG4gICAgICBhLl9pc2hsbnN1Ym11bChiLCAxLCBqKTtcbiAgICAgIGlmIChhLmNtcG4oMCkgIT09IDApXG4gICAgICAgIGEuc2lnbiA9ICFhLnNpZ247XG4gICAgfVxuICAgIGlmIChxKVxuICAgICAgcS53b3Jkc1tqXSA9IHFqO1xuICB9XG4gIGlmIChxKVxuICAgIHEuc3RyaXAoKTtcbiAgYS5zdHJpcCgpO1xuXG4gIC8vIERlbm9ybWFsaXplXG4gIGlmIChtb2RlICE9PSAnZGl2JyAmJiBzaGlmdCAhPT0gMClcbiAgICBhLmlzaHJuKHNoaWZ0KTtcbiAgcmV0dXJuIHsgZGl2OiBxID8gcSA6IG51bGwsIG1vZDogYSB9O1xufTtcblxuQk4ucHJvdG90eXBlLmRpdm1vZCA9IGZ1bmN0aW9uIGRpdm1vZChudW0sIG1vZGUpIHtcbiAgYXNzZXJ0KG51bS5jbXBuKDApICE9PSAwKTtcblxuICBpZiAodGhpcy5zaWduICYmICFudW0uc2lnbikge1xuICAgIHZhciByZXMgPSB0aGlzLm5lZygpLmRpdm1vZChudW0sIG1vZGUpO1xuICAgIHZhciBkaXY7XG4gICAgdmFyIG1vZDtcbiAgICBpZiAobW9kZSAhPT0gJ21vZCcpXG4gICAgICBkaXYgPSByZXMuZGl2Lm5lZygpO1xuICAgIGlmIChtb2RlICE9PSAnZGl2JylcbiAgICAgIG1vZCA9IHJlcy5tb2QuY21wbigwKSA9PT0gMCA/IHJlcy5tb2QgOiBudW0uc3ViKHJlcy5tb2QpO1xuICAgIHJldHVybiB7XG4gICAgICBkaXY6IGRpdixcbiAgICAgIG1vZDogbW9kXG4gICAgfTtcbiAgfSBlbHNlIGlmICghdGhpcy5zaWduICYmIG51bS5zaWduKSB7XG4gICAgdmFyIHJlcyA9IHRoaXMuZGl2bW9kKG51bS5uZWcoKSwgbW9kZSk7XG4gICAgdmFyIGRpdjtcbiAgICBpZiAobW9kZSAhPT0gJ21vZCcpXG4gICAgICBkaXYgPSByZXMuZGl2Lm5lZygpO1xuICAgIHJldHVybiB7IGRpdjogZGl2LCBtb2Q6IHJlcy5tb2QgfTtcbiAgfSBlbHNlIGlmICh0aGlzLnNpZ24gJiYgbnVtLnNpZ24pIHtcbiAgICByZXR1cm4gdGhpcy5uZWcoKS5kaXZtb2QobnVtLm5lZygpLCBtb2RlKTtcbiAgfVxuXG4gIC8vIEJvdGggbnVtYmVycyBhcmUgcG9zaXRpdmUgYXQgdGhpcyBwb2ludFxuXG4gIC8vIFN0cmlwIGJvdGggbnVtYmVycyB0byBhcHByb3hpbWF0ZSBzaGlmdCB2YWx1ZVxuICBpZiAobnVtLmxlbmd0aCA+IHRoaXMubGVuZ3RoIHx8IHRoaXMuY21wKG51bSkgPCAwKVxuICAgIHJldHVybiB7IGRpdjogbmV3IEJOKDApLCBtb2Q6IHRoaXMgfTtcblxuICAvLyBWZXJ5IHNob3J0IHJlZHVjdGlvblxuICBpZiAobnVtLmxlbmd0aCA9PT0gMSkge1xuICAgIGlmIChtb2RlID09PSAnZGl2JylcbiAgICAgIHJldHVybiB7IGRpdjogdGhpcy5kaXZuKG51bS53b3Jkc1swXSksIG1vZDogbnVsbCB9O1xuICAgIGVsc2UgaWYgKG1vZGUgPT09ICdtb2QnKVxuICAgICAgcmV0dXJuIHsgZGl2OiBudWxsLCBtb2Q6IG5ldyBCTih0aGlzLm1vZG4obnVtLndvcmRzWzBdKSkgfTtcbiAgICByZXR1cm4ge1xuICAgICAgZGl2OiB0aGlzLmRpdm4obnVtLndvcmRzWzBdKSxcbiAgICAgIG1vZDogbmV3IEJOKHRoaXMubW9kbihudW0ud29yZHNbMF0pKVxuICAgIH07XG4gIH1cblxuICByZXR1cm4gdGhpcy5fd29yZERpdihudW0sIG1vZGUpO1xufTtcblxuLy8gRmluZCBgdGhpc2AgLyBgbnVtYFxuQk4ucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uIGRpdihudW0pIHtcbiAgcmV0dXJuIHRoaXMuZGl2bW9kKG51bSwgJ2RpdicpLmRpdjtcbn07XG5cbi8vIEZpbmQgYHRoaXNgICUgYG51bWBcbkJOLnByb3RvdHlwZS5tb2QgPSBmdW5jdGlvbiBtb2QobnVtKSB7XG4gIHJldHVybiB0aGlzLmRpdm1vZChudW0sICdtb2QnKS5tb2Q7XG59O1xuXG4vLyBGaW5kIFJvdW5kKGB0aGlzYCAvIGBudW1gKVxuQk4ucHJvdG90eXBlLmRpdlJvdW5kID0gZnVuY3Rpb24gZGl2Um91bmQobnVtKSB7XG4gIHZhciBkbSA9IHRoaXMuZGl2bW9kKG51bSk7XG5cbiAgLy8gRmFzdCBjYXNlIC0gZXhhY3QgZGl2aXNpb25cbiAgaWYgKGRtLm1vZC5jbXBuKDApID09PSAwKVxuICAgIHJldHVybiBkbS5kaXY7XG5cbiAgdmFyIG1vZCA9IGRtLmRpdi5zaWduID8gZG0ubW9kLmlzdWIobnVtKSA6IGRtLm1vZDtcblxuICB2YXIgaGFsZiA9IG51bS5zaHJuKDEpO1xuICB2YXIgcjIgPSBudW0uYW5kbG4oMSk7XG4gIHZhciBjbXAgPSBtb2QuY21wKGhhbGYpO1xuXG4gIC8vIFJvdW5kIGRvd25cbiAgaWYgKGNtcCA8IDAgfHwgcjIgPT09IDEgJiYgY21wID09PSAwKVxuICAgIHJldHVybiBkbS5kaXY7XG5cbiAgLy8gUm91bmQgdXBcbiAgcmV0dXJuIGRtLmRpdi5zaWduID8gZG0uZGl2LmlzdWJuKDEpIDogZG0uZGl2LmlhZGRuKDEpO1xufTtcblxuQk4ucHJvdG90eXBlLm1vZG4gPSBmdW5jdGlvbiBtb2RuKG51bSkge1xuICBhc3NlcnQobnVtIDw9IDB4M2ZmZmZmZik7XG4gIHZhciBwID0gKDEgPDwgMjYpICUgbnVtO1xuXG4gIHZhciBhY2MgPSAwO1xuICBmb3IgKHZhciBpID0gdGhpcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSlcbiAgICBhY2MgPSAocCAqIGFjYyArIHRoaXMud29yZHNbaV0pICUgbnVtO1xuXG4gIHJldHVybiBhY2M7XG59O1xuXG4vLyBJbi1wbGFjZSBkaXZpc2lvbiBieSBudW1iZXJcbkJOLnByb3RvdHlwZS5pZGl2biA9IGZ1bmN0aW9uIGlkaXZuKG51bSkge1xuICBhc3NlcnQobnVtIDw9IDB4M2ZmZmZmZik7XG5cbiAgdmFyIGNhcnJ5ID0gMDtcbiAgZm9yICh2YXIgaSA9IHRoaXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgdyA9IHRoaXMud29yZHNbaV0gKyBjYXJyeSAqIDB4NDAwMDAwMDtcbiAgICB0aGlzLndvcmRzW2ldID0gKHcgLyBudW0pIHwgMDtcbiAgICBjYXJyeSA9IHcgJSBudW07XG4gIH1cblxuICByZXR1cm4gdGhpcy5zdHJpcCgpO1xufTtcblxuQk4ucHJvdG90eXBlLmRpdm4gPSBmdW5jdGlvbiBkaXZuKG51bSkge1xuICByZXR1cm4gdGhpcy5jbG9uZSgpLmlkaXZuKG51bSk7XG59O1xuXG5CTi5wcm90b3R5cGUuZWdjZCA9IGZ1bmN0aW9uIGVnY2QocCkge1xuICBhc3NlcnQoIXAuc2lnbik7XG4gIGFzc2VydChwLmNtcG4oMCkgIT09IDApO1xuXG4gIHZhciB4ID0gdGhpcztcbiAgdmFyIHkgPSBwLmNsb25lKCk7XG5cbiAgaWYgKHguc2lnbilcbiAgICB4ID0geC5tb2QocCk7XG4gIGVsc2VcbiAgICB4ID0geC5jbG9uZSgpO1xuXG4gIC8vIEEgKiB4ICsgQiAqIHkgPSB4XG4gIHZhciBBID0gbmV3IEJOKDEpO1xuICB2YXIgQiA9IG5ldyBCTigwKTtcblxuICAvLyBDICogeCArIEQgKiB5ID0geVxuICB2YXIgQyA9IG5ldyBCTigwKTtcbiAgdmFyIEQgPSBuZXcgQk4oMSk7XG5cbiAgdmFyIGcgPSAwO1xuXG4gIHdoaWxlICh4LmlzRXZlbigpICYmIHkuaXNFdmVuKCkpIHtcbiAgICB4LmlzaHJuKDEpO1xuICAgIHkuaXNocm4oMSk7XG4gICAgKytnO1xuICB9XG5cbiAgdmFyIHlwID0geS5jbG9uZSgpO1xuICB2YXIgeHAgPSB4LmNsb25lKCk7XG5cbiAgd2hpbGUgKHguY21wbigwKSAhPT0gMCkge1xuICAgIHdoaWxlICh4LmlzRXZlbigpKSB7XG4gICAgICB4LmlzaHJuKDEpO1xuICAgICAgaWYgKEEuaXNFdmVuKCkgJiYgQi5pc0V2ZW4oKSkge1xuICAgICAgICBBLmlzaHJuKDEpO1xuICAgICAgICBCLmlzaHJuKDEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgQS5pYWRkKHlwKS5pc2hybigxKTtcbiAgICAgICAgQi5pc3ViKHhwKS5pc2hybigxKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB3aGlsZSAoeS5pc0V2ZW4oKSkge1xuICAgICAgeS5pc2hybigxKTtcbiAgICAgIGlmIChDLmlzRXZlbigpICYmIEQuaXNFdmVuKCkpIHtcbiAgICAgICAgQy5pc2hybigxKTtcbiAgICAgICAgRC5pc2hybigxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIEMuaWFkZCh5cCkuaXNocm4oMSk7XG4gICAgICAgIEQuaXN1Yih4cCkuaXNocm4oMSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHguY21wKHkpID49IDApIHtcbiAgICAgIHguaXN1Yih5KTtcbiAgICAgIEEuaXN1YihDKTtcbiAgICAgIEIuaXN1YihEKTtcbiAgICB9IGVsc2Uge1xuICAgICAgeS5pc3ViKHgpO1xuICAgICAgQy5pc3ViKEEpO1xuICAgICAgRC5pc3ViKEIpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYTogQyxcbiAgICBiOiBELFxuICAgIGdjZDogeS5pc2hsbihnKVxuICB9O1xufTtcblxuLy8gVGhpcyBpcyByZWR1Y2VkIGluY2FybmF0aW9uIG9mIHRoZSBiaW5hcnkgRUVBXG4vLyBhYm92ZSwgZGVzaWduYXRlZCB0byBpbnZlcnQgbWVtYmVycyBvZiB0aGVcbi8vIF9wcmltZV8gZmllbGRzIEYocCkgYXQgYSBtYXhpbWFsIHNwZWVkXG5CTi5wcm90b3R5cGUuX2ludm1wID0gZnVuY3Rpb24gX2ludm1wKHApIHtcbiAgYXNzZXJ0KCFwLnNpZ24pO1xuICBhc3NlcnQocC5jbXBuKDApICE9PSAwKTtcblxuICB2YXIgYSA9IHRoaXM7XG4gIHZhciBiID0gcC5jbG9uZSgpO1xuXG4gIGlmIChhLnNpZ24pXG4gICAgYSA9IGEubW9kKHApO1xuICBlbHNlXG4gICAgYSA9IGEuY2xvbmUoKTtcblxuICB2YXIgeDEgPSBuZXcgQk4oMSk7XG4gIHZhciB4MiA9IG5ldyBCTigwKTtcblxuICB2YXIgZGVsdGEgPSBiLmNsb25lKCk7XG5cbiAgd2hpbGUgKGEuY21wbigxKSA+IDAgJiYgYi5jbXBuKDEpID4gMCkge1xuICAgIHdoaWxlIChhLmlzRXZlbigpKSB7XG4gICAgICBhLmlzaHJuKDEpO1xuICAgICAgaWYgKHgxLmlzRXZlbigpKVxuICAgICAgICB4MS5pc2hybigxKTtcbiAgICAgIGVsc2VcbiAgICAgICAgeDEuaWFkZChkZWx0YSkuaXNocm4oMSk7XG4gICAgfVxuICAgIHdoaWxlIChiLmlzRXZlbigpKSB7XG4gICAgICBiLmlzaHJuKDEpO1xuICAgICAgaWYgKHgyLmlzRXZlbigpKVxuICAgICAgICB4Mi5pc2hybigxKTtcbiAgICAgIGVsc2VcbiAgICAgICAgeDIuaWFkZChkZWx0YSkuaXNocm4oMSk7XG4gICAgfVxuICAgIGlmIChhLmNtcChiKSA+PSAwKSB7XG4gICAgICBhLmlzdWIoYik7XG4gICAgICB4MS5pc3ViKHgyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYi5pc3ViKGEpO1xuICAgICAgeDIuaXN1Yih4MSk7XG4gICAgfVxuICB9XG4gIGlmIChhLmNtcG4oMSkgPT09IDApXG4gICAgcmV0dXJuIHgxO1xuICBlbHNlXG4gICAgcmV0dXJuIHgyO1xufTtcblxuQk4ucHJvdG90eXBlLmdjZCA9IGZ1bmN0aW9uIGdjZChudW0pIHtcbiAgaWYgKHRoaXMuY21wbigwKSA9PT0gMClcbiAgICByZXR1cm4gbnVtLmNsb25lKCk7XG4gIGlmIChudW0uY21wbigwKSA9PT0gMClcbiAgICByZXR1cm4gdGhpcy5jbG9uZSgpO1xuXG4gIHZhciBhID0gdGhpcy5jbG9uZSgpO1xuICB2YXIgYiA9IG51bS5jbG9uZSgpO1xuICBhLnNpZ24gPSBmYWxzZTtcbiAgYi5zaWduID0gZmFsc2U7XG5cbiAgLy8gUmVtb3ZlIGNvbW1vbiBmYWN0b3Igb2YgdHdvXG4gIGZvciAodmFyIHNoaWZ0ID0gMDsgYS5pc0V2ZW4oKSAmJiBiLmlzRXZlbigpOyBzaGlmdCsrKSB7XG4gICAgYS5pc2hybigxKTtcbiAgICBiLmlzaHJuKDEpO1xuICB9XG5cbiAgZG8ge1xuICAgIHdoaWxlIChhLmlzRXZlbigpKVxuICAgICAgYS5pc2hybigxKTtcbiAgICB3aGlsZSAoYi5pc0V2ZW4oKSlcbiAgICAgIGIuaXNocm4oMSk7XG5cbiAgICB2YXIgciA9IGEuY21wKGIpO1xuICAgIGlmIChyIDwgMCkge1xuICAgICAgLy8gU3dhcCBgYWAgYW5kIGBiYCB0byBtYWtlIGBhYCBhbHdheXMgYmlnZ2VyIHRoYW4gYGJgXG4gICAgICB2YXIgdCA9IGE7XG4gICAgICBhID0gYjtcbiAgICAgIGIgPSB0O1xuICAgIH0gZWxzZSBpZiAociA9PT0gMCB8fCBiLmNtcG4oMSkgPT09IDApIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGEuaXN1YihiKTtcbiAgfSB3aGlsZSAodHJ1ZSk7XG5cbiAgcmV0dXJuIGIuaXNobG4oc2hpZnQpO1xufTtcblxuLy8gSW52ZXJ0IG51bWJlciBpbiB0aGUgZmllbGQgRihudW0pXG5CTi5wcm90b3R5cGUuaW52bSA9IGZ1bmN0aW9uIGludm0obnVtKSB7XG4gIHJldHVybiB0aGlzLmVnY2QobnVtKS5hLm1vZChudW0pO1xufTtcblxuQk4ucHJvdG90eXBlLmlzRXZlbiA9IGZ1bmN0aW9uIGlzRXZlbigpIHtcbiAgcmV0dXJuICh0aGlzLndvcmRzWzBdICYgMSkgPT09IDA7XG59O1xuXG5CTi5wcm90b3R5cGUuaXNPZGQgPSBmdW5jdGlvbiBpc09kZCgpIHtcbiAgcmV0dXJuICh0aGlzLndvcmRzWzBdICYgMSkgPT09IDE7XG59O1xuXG4vLyBBbmQgZmlyc3Qgd29yZCBhbmQgbnVtXG5CTi5wcm90b3R5cGUuYW5kbG4gPSBmdW5jdGlvbiBhbmRsbihudW0pIHtcbiAgcmV0dXJuIHRoaXMud29yZHNbMF0gJiBudW07XG59O1xuXG4vLyBJbmNyZW1lbnQgYXQgdGhlIGJpdCBwb3NpdGlvbiBpbi1saW5lXG5CTi5wcm90b3R5cGUuYmluY24gPSBmdW5jdGlvbiBiaW5jbihiaXQpIHtcbiAgYXNzZXJ0KHR5cGVvZiBiaXQgPT09ICdudW1iZXInKTtcbiAgdmFyIHIgPSBiaXQgJSAyNjtcbiAgdmFyIHMgPSAoYml0IC0gcikgLyAyNjtcbiAgdmFyIHEgPSAxIDw8IHI7XG5cbiAgLy8gRmFzdCBjYXNlOiBiaXQgaXMgbXVjaCBoaWdoZXIgdGhhbiBhbGwgZXhpc3Rpbmcgd29yZHNcbiAgaWYgKHRoaXMubGVuZ3RoIDw9IHMpIHtcbiAgICBmb3IgKHZhciBpID0gdGhpcy5sZW5ndGg7IGkgPCBzICsgMTsgaSsrKVxuICAgICAgdGhpcy53b3Jkc1tpXSA9IDA7XG4gICAgdGhpcy53b3Jkc1tzXSB8PSBxO1xuICAgIHRoaXMubGVuZ3RoID0gcyArIDE7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBBZGQgYml0IGFuZCBwcm9wYWdhdGUsIGlmIG5lZWRlZFxuICB2YXIgY2FycnkgPSBxO1xuICBmb3IgKHZhciBpID0gczsgY2FycnkgIT09IDAgJiYgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgdyA9IHRoaXMud29yZHNbaV07XG4gICAgdyArPSBjYXJyeTtcbiAgICBjYXJyeSA9IHcgPj4+IDI2O1xuICAgIHcgJj0gMHgzZmZmZmZmO1xuICAgIHRoaXMud29yZHNbaV0gPSB3O1xuICB9XG4gIGlmIChjYXJyeSAhPT0gMCkge1xuICAgIHRoaXMud29yZHNbaV0gPSBjYXJyeTtcbiAgICB0aGlzLmxlbmd0aCsrO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuQk4ucHJvdG90eXBlLmNtcG4gPSBmdW5jdGlvbiBjbXBuKG51bSkge1xuICB2YXIgc2lnbiA9IG51bSA8IDA7XG4gIGlmIChzaWduKVxuICAgIG51bSA9IC1udW07XG5cbiAgaWYgKHRoaXMuc2lnbiAmJiAhc2lnbilcbiAgICByZXR1cm4gLTE7XG4gIGVsc2UgaWYgKCF0aGlzLnNpZ24gJiYgc2lnbilcbiAgICByZXR1cm4gMTtcblxuICBudW0gJj0gMHgzZmZmZmZmO1xuICB0aGlzLnN0cmlwKCk7XG5cbiAgdmFyIHJlcztcbiAgaWYgKHRoaXMubGVuZ3RoID4gMSkge1xuICAgIHJlcyA9IDE7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHcgPSB0aGlzLndvcmRzWzBdO1xuICAgIHJlcyA9IHcgPT09IG51bSA/IDAgOiB3IDwgbnVtID8gLTEgOiAxO1xuICB9XG4gIGlmICh0aGlzLnNpZ24pXG4gICAgcmVzID0gLXJlcztcbiAgcmV0dXJuIHJlcztcbn07XG5cbi8vIENvbXBhcmUgdHdvIG51bWJlcnMgYW5kIHJldHVybjpcbi8vIDEgLSBpZiBgdGhpc2AgPiBgbnVtYFxuLy8gMCAtIGlmIGB0aGlzYCA9PSBgbnVtYFxuLy8gLTEgLSBpZiBgdGhpc2AgPCBgbnVtYFxuQk4ucHJvdG90eXBlLmNtcCA9IGZ1bmN0aW9uIGNtcChudW0pIHtcbiAgaWYgKHRoaXMuc2lnbiAmJiAhbnVtLnNpZ24pXG4gICAgcmV0dXJuIC0xO1xuICBlbHNlIGlmICghdGhpcy5zaWduICYmIG51bS5zaWduKVxuICAgIHJldHVybiAxO1xuXG4gIHZhciByZXMgPSB0aGlzLnVjbXAobnVtKTtcbiAgaWYgKHRoaXMuc2lnbilcbiAgICByZXR1cm4gLXJlcztcbiAgZWxzZVxuICAgIHJldHVybiByZXM7XG59O1xuXG4vLyBVbnNpZ25lZCBjb21wYXJpc29uXG5CTi5wcm90b3R5cGUudWNtcCA9IGZ1bmN0aW9uIHVjbXAobnVtKSB7XG4gIC8vIEF0IHRoaXMgcG9pbnQgYm90aCBudW1iZXJzIGhhdmUgdGhlIHNhbWUgc2lnblxuICBpZiAodGhpcy5sZW5ndGggPiBudW0ubGVuZ3RoKVxuICAgIHJldHVybiAxO1xuICBlbHNlIGlmICh0aGlzLmxlbmd0aCA8IG51bS5sZW5ndGgpXG4gICAgcmV0dXJuIC0xO1xuXG4gIHZhciByZXMgPSAwO1xuICBmb3IgKHZhciBpID0gdGhpcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBhID0gdGhpcy53b3Jkc1tpXTtcbiAgICB2YXIgYiA9IG51bS53b3Jkc1tpXTtcblxuICAgIGlmIChhID09PSBiKVxuICAgICAgY29udGludWU7XG4gICAgaWYgKGEgPCBiKVxuICAgICAgcmVzID0gLTE7XG4gICAgZWxzZSBpZiAoYSA+IGIpXG4gICAgICByZXMgPSAxO1xuICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuXG4vL1xuLy8gQSByZWR1Y2UgY29udGV4dCwgY291bGQgYmUgdXNpbmcgbW9udGdvbWVyeSBvciBzb21ldGhpbmcgYmV0dGVyLCBkZXBlbmRpbmdcbi8vIG9uIHRoZSBgbWAgaXRzZWxmLlxuLy9cbkJOLnJlZCA9IGZ1bmN0aW9uIHJlZChudW0pIHtcbiAgcmV0dXJuIG5ldyBSZWQobnVtKTtcbn07XG5cbkJOLnByb3RvdHlwZS50b1JlZCA9IGZ1bmN0aW9uIHRvUmVkKGN0eCkge1xuICBhc3NlcnQoIXRoaXMucmVkLCAnQWxyZWFkeSBhIG51bWJlciBpbiByZWR1Y3Rpb24gY29udGV4dCcpO1xuICBhc3NlcnQoIXRoaXMuc2lnbiwgJ3JlZCB3b3JrcyBvbmx5IHdpdGggcG9zaXRpdmVzJyk7XG4gIHJldHVybiBjdHguY29udmVydFRvKHRoaXMpLl9mb3JjZVJlZChjdHgpO1xufTtcblxuQk4ucHJvdG90eXBlLmZyb21SZWQgPSBmdW5jdGlvbiBmcm9tUmVkKCkge1xuICBhc3NlcnQodGhpcy5yZWQsICdmcm9tUmVkIHdvcmtzIG9ubHkgd2l0aCBudW1iZXJzIGluIHJlZHVjdGlvbiBjb250ZXh0Jyk7XG4gIHJldHVybiB0aGlzLnJlZC5jb252ZXJ0RnJvbSh0aGlzKTtcbn07XG5cbkJOLnByb3RvdHlwZS5fZm9yY2VSZWQgPSBmdW5jdGlvbiBfZm9yY2VSZWQoY3R4KSB7XG4gIHRoaXMucmVkID0gY3R4O1xuICByZXR1cm4gdGhpcztcbn07XG5cbkJOLnByb3RvdHlwZS5mb3JjZVJlZCA9IGZ1bmN0aW9uIGZvcmNlUmVkKGN0eCkge1xuICBhc3NlcnQoIXRoaXMucmVkLCAnQWxyZWFkeSBhIG51bWJlciBpbiByZWR1Y3Rpb24gY29udGV4dCcpO1xuICByZXR1cm4gdGhpcy5fZm9yY2VSZWQoY3R4KTtcbn07XG5cbkJOLnByb3RvdHlwZS5yZWRBZGQgPSBmdW5jdGlvbiByZWRBZGQobnVtKSB7XG4gIGFzc2VydCh0aGlzLnJlZCwgJ3JlZEFkZCB3b3JrcyBvbmx5IHdpdGggcmVkIG51bWJlcnMnKTtcbiAgcmV0dXJuIHRoaXMucmVkLmFkZCh0aGlzLCBudW0pO1xufTtcblxuQk4ucHJvdG90eXBlLnJlZElBZGQgPSBmdW5jdGlvbiByZWRJQWRkKG51bSkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWRJQWRkIHdvcmtzIG9ubHkgd2l0aCByZWQgbnVtYmVycycpO1xuICByZXR1cm4gdGhpcy5yZWQuaWFkZCh0aGlzLCBudW0pO1xufTtcblxuQk4ucHJvdG90eXBlLnJlZFN1YiA9IGZ1bmN0aW9uIHJlZFN1YihudW0pIHtcbiAgYXNzZXJ0KHRoaXMucmVkLCAncmVkU3ViIHdvcmtzIG9ubHkgd2l0aCByZWQgbnVtYmVycycpO1xuICByZXR1cm4gdGhpcy5yZWQuc3ViKHRoaXMsIG51bSk7XG59O1xuXG5CTi5wcm90b3R5cGUucmVkSVN1YiA9IGZ1bmN0aW9uIHJlZElTdWIobnVtKSB7XG4gIGFzc2VydCh0aGlzLnJlZCwgJ3JlZElTdWIgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG4gIHJldHVybiB0aGlzLnJlZC5pc3ViKHRoaXMsIG51bSk7XG59O1xuXG5CTi5wcm90b3R5cGUucmVkU2hsID0gZnVuY3Rpb24gcmVkU2hsKG51bSkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWRTaGwgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG4gIHJldHVybiB0aGlzLnJlZC5zaGwodGhpcywgbnVtKTtcbn07XG5cbkJOLnByb3RvdHlwZS5yZWRNdWwgPSBmdW5jdGlvbiByZWRNdWwobnVtKSB7XG4gIGFzc2VydCh0aGlzLnJlZCwgJ3JlZE11bCB3b3JrcyBvbmx5IHdpdGggcmVkIG51bWJlcnMnKTtcbiAgdGhpcy5yZWQuX3ZlcmlmeTIodGhpcywgbnVtKTtcbiAgcmV0dXJuIHRoaXMucmVkLm11bCh0aGlzLCBudW0pO1xufTtcblxuQk4ucHJvdG90eXBlLnJlZElNdWwgPSBmdW5jdGlvbiByZWRJTXVsKG51bSkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWRNdWwgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG4gIHRoaXMucmVkLl92ZXJpZnkyKHRoaXMsIG51bSk7XG4gIHJldHVybiB0aGlzLnJlZC5pbXVsKHRoaXMsIG51bSk7XG59O1xuXG5CTi5wcm90b3R5cGUucmVkU3FyID0gZnVuY3Rpb24gcmVkU3FyKCkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWRTcXIgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG4gIHRoaXMucmVkLl92ZXJpZnkxKHRoaXMpO1xuICByZXR1cm4gdGhpcy5yZWQuc3FyKHRoaXMpO1xufTtcblxuQk4ucHJvdG90eXBlLnJlZElTcXIgPSBmdW5jdGlvbiByZWRJU3FyKCkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWRJU3FyIHdvcmtzIG9ubHkgd2l0aCByZWQgbnVtYmVycycpO1xuICB0aGlzLnJlZC5fdmVyaWZ5MSh0aGlzKTtcbiAgcmV0dXJuIHRoaXMucmVkLmlzcXIodGhpcyk7XG59O1xuXG4vLyBTcXVhcmUgcm9vdCBvdmVyIHBcbkJOLnByb3RvdHlwZS5yZWRTcXJ0ID0gZnVuY3Rpb24gcmVkU3FydCgpIHtcbiAgYXNzZXJ0KHRoaXMucmVkLCAncmVkU3FydCB3b3JrcyBvbmx5IHdpdGggcmVkIG51bWJlcnMnKTtcbiAgdGhpcy5yZWQuX3ZlcmlmeTEodGhpcyk7XG4gIHJldHVybiB0aGlzLnJlZC5zcXJ0KHRoaXMpO1xufTtcblxuQk4ucHJvdG90eXBlLnJlZEludm0gPSBmdW5jdGlvbiByZWRJbnZtKCkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWRJbnZtIHdvcmtzIG9ubHkgd2l0aCByZWQgbnVtYmVycycpO1xuICB0aGlzLnJlZC5fdmVyaWZ5MSh0aGlzKTtcbiAgcmV0dXJuIHRoaXMucmVkLmludm0odGhpcyk7XG59O1xuXG4vLyBSZXR1cm4gbmVnYXRpdmUgY2xvbmUgb2YgYHRoaXNgICUgYHJlZCBtb2R1bG9gXG5CTi5wcm90b3R5cGUucmVkTmVnID0gZnVuY3Rpb24gcmVkTmVnKCkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWROZWcgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG4gIHRoaXMucmVkLl92ZXJpZnkxKHRoaXMpO1xuICByZXR1cm4gdGhpcy5yZWQubmVnKHRoaXMpO1xufTtcblxuQk4ucHJvdG90eXBlLnJlZFBvdyA9IGZ1bmN0aW9uIHJlZFBvdyhudW0pIHtcbiAgYXNzZXJ0KHRoaXMucmVkICYmICFudW0ucmVkLCAncmVkUG93KG5vcm1hbE51bSknKTtcbiAgdGhpcy5yZWQuX3ZlcmlmeTEodGhpcyk7XG4gIHJldHVybiB0aGlzLnJlZC5wb3codGhpcywgbnVtKTtcbn07XG5cbi8vIFByaW1lIG51bWJlcnMgd2l0aCBlZmZpY2llbnQgcmVkdWN0aW9uXG52YXIgcHJpbWVzID0ge1xuICBrMjU2OiBudWxsLFxuICBwMjI0OiBudWxsLFxuICBwMTkyOiBudWxsLFxuICBwMjU1MTk6IG51bGxcbn07XG5cbi8vIFBzZXVkby1NZXJzZW5uZSBwcmltZVxuZnVuY3Rpb24gTVByaW1lKG5hbWUsIHApIHtcbiAgLy8gUCA9IDIgXiBOIC0gS1xuICB0aGlzLm5hbWUgPSBuYW1lO1xuICB0aGlzLnAgPSBuZXcgQk4ocCwgMTYpO1xuICB0aGlzLm4gPSB0aGlzLnAuYml0TGVuZ3RoKCk7XG4gIHRoaXMuayA9IG5ldyBCTigxKS5pc2hsbih0aGlzLm4pLmlzdWIodGhpcy5wKTtcblxuICB0aGlzLnRtcCA9IHRoaXMuX3RtcCgpO1xufVxuXG5NUHJpbWUucHJvdG90eXBlLl90bXAgPSBmdW5jdGlvbiBfdG1wKCkge1xuICB2YXIgdG1wID0gbmV3IEJOKG51bGwpO1xuICB0bXAud29yZHMgPSBuZXcgQXJyYXkoTWF0aC5jZWlsKHRoaXMubiAvIDEzKSk7XG4gIHJldHVybiB0bXA7XG59O1xuXG5NUHJpbWUucHJvdG90eXBlLmlyZWR1Y2UgPSBmdW5jdGlvbiBpcmVkdWNlKG51bSkge1xuICAvLyBBc3N1bWVzIHRoYXQgYG51bWAgaXMgbGVzcyB0aGFuIGBQXjJgXG4gIC8vIG51bSA9IEhJICogKDIgXiBOIC0gSykgKyBISSAqIEsgKyBMTyA9IEhJICogSyArIExPIChtb2QgUClcbiAgdmFyIHIgPSBudW07XG4gIHZhciBybGVuO1xuXG4gIGRvIHtcbiAgICB0aGlzLnNwbGl0KHIsIHRoaXMudG1wKTtcbiAgICByID0gdGhpcy5pbXVsSyhyKTtcbiAgICByID0gci5pYWRkKHRoaXMudG1wKTtcbiAgICBybGVuID0gci5iaXRMZW5ndGgoKTtcbiAgfSB3aGlsZSAocmxlbiA+IHRoaXMubik7XG5cbiAgdmFyIGNtcCA9IHJsZW4gPCB0aGlzLm4gPyAtMSA6IHIudWNtcCh0aGlzLnApO1xuICBpZiAoY21wID09PSAwKSB7XG4gICAgci53b3Jkc1swXSA9IDA7XG4gICAgci5sZW5ndGggPSAxO1xuICB9IGVsc2UgaWYgKGNtcCA+IDApIHtcbiAgICByLmlzdWIodGhpcy5wKTtcbiAgfSBlbHNlIHtcbiAgICByLnN0cmlwKCk7XG4gIH1cblxuICByZXR1cm4gcjtcbn07XG5cbk1QcmltZS5wcm90b3R5cGUuc3BsaXQgPSBmdW5jdGlvbiBzcGxpdChpbnB1dCwgb3V0KSB7XG4gIGlucHV0LmlzaHJuKHRoaXMubiwgMCwgb3V0KTtcbn07XG5cbk1QcmltZS5wcm90b3R5cGUuaW11bEsgPSBmdW5jdGlvbiBpbXVsSyhudW0pIHtcbiAgcmV0dXJuIG51bS5pbXVsKHRoaXMuayk7XG59O1xuXG5mdW5jdGlvbiBLMjU2KCkge1xuICBNUHJpbWUuY2FsbChcbiAgICB0aGlzLFxuICAgICdrMjU2JyxcbiAgICAnZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmUgZmZmZmZjMmYnKTtcbn1cbmluaGVyaXRzKEsyNTYsIE1QcmltZSk7XG5cbksyNTYucHJvdG90eXBlLnNwbGl0ID0gZnVuY3Rpb24gc3BsaXQoaW5wdXQsIG91dHB1dCkge1xuICAvLyAyNTYgPSA5ICogMjYgKyAyMlxuICB2YXIgbWFzayA9IDB4M2ZmZmZmO1xuXG4gIHZhciBvdXRMZW4gPSBNYXRoLm1pbihpbnB1dC5sZW5ndGgsIDkpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG91dExlbjsgaSsrKVxuICAgIG91dHB1dC53b3Jkc1tpXSA9IGlucHV0LndvcmRzW2ldO1xuICBvdXRwdXQubGVuZ3RoID0gb3V0TGVuO1xuXG4gIGlmIChpbnB1dC5sZW5ndGggPD0gOSkge1xuICAgIGlucHV0LndvcmRzWzBdID0gMDtcbiAgICBpbnB1dC5sZW5ndGggPSAxO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIFNoaWZ0IGJ5IDkgbGltYnNcbiAgdmFyIHByZXYgPSBpbnB1dC53b3Jkc1s5XTtcbiAgb3V0cHV0LndvcmRzW291dHB1dC5sZW5ndGgrK10gPSBwcmV2ICYgbWFzaztcblxuICBmb3IgKHZhciBpID0gMTA7IGkgPCBpbnB1dC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBuZXh0ID0gaW5wdXQud29yZHNbaV07XG4gICAgaW5wdXQud29yZHNbaSAtIDEwXSA9ICgobmV4dCAmIG1hc2spIDw8IDQpIHwgKHByZXYgPj4+IDIyKTtcbiAgICBwcmV2ID0gbmV4dDtcbiAgfVxuICBpbnB1dC53b3Jkc1tpIC0gMTBdID0gcHJldiA+Pj4gMjI7XG4gIGlucHV0Lmxlbmd0aCAtPSA5O1xufTtcblxuSzI1Ni5wcm90b3R5cGUuaW11bEsgPSBmdW5jdGlvbiBpbXVsSyhudW0pIHtcbiAgLy8gSyA9IDB4MTAwMDAwM2QxID0gWyAweDQwLCAweDNkMSBdXG4gIG51bS53b3Jkc1tudW0ubGVuZ3RoXSA9IDA7XG4gIG51bS53b3Jkc1tudW0ubGVuZ3RoICsgMV0gPSAwO1xuICBudW0ubGVuZ3RoICs9IDI7XG5cbiAgLy8gYm91bmRlZCBhdDogMHg0MCAqIDB4M2ZmZmZmZiArIDB4M2QwID0gMHgxMDAwMDAzOTBcbiAgdmFyIGhpO1xuICB2YXIgbG8gPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG51bS5sZW5ndGg7IGkrKykge1xuICAgIHZhciB3ID0gbnVtLndvcmRzW2ldO1xuICAgIGhpID0gdyAqIDB4NDA7XG4gICAgbG8gKz0gdyAqIDB4M2QxO1xuICAgIGhpICs9IChsbyAvIDB4NDAwMDAwMCkgfCAwO1xuICAgIGxvICY9IDB4M2ZmZmZmZjtcblxuICAgIG51bS53b3Jkc1tpXSA9IGxvO1xuXG4gICAgbG8gPSBoaTtcbiAgfVxuXG4gIC8vIEZhc3QgbGVuZ3RoIHJlZHVjdGlvblxuICBpZiAobnVtLndvcmRzW251bS5sZW5ndGggLSAxXSA9PT0gMCkge1xuICAgIG51bS5sZW5ndGgtLTtcbiAgICBpZiAobnVtLndvcmRzW251bS5sZW5ndGggLSAxXSA9PT0gMClcbiAgICAgIG51bS5sZW5ndGgtLTtcbiAgfVxuICByZXR1cm4gbnVtO1xufTtcblxuZnVuY3Rpb24gUDIyNCgpIHtcbiAgTVByaW1lLmNhbGwoXG4gICAgdGhpcyxcbiAgICAncDIyNCcsXG4gICAgJ2ZmZmZmZmZmIGZmZmZmZmZmIGZmZmZmZmZmIGZmZmZmZmZmIDAwMDAwMDAwIDAwMDAwMDAwIDAwMDAwMDAxJyk7XG59XG5pbmhlcml0cyhQMjI0LCBNUHJpbWUpO1xuXG5mdW5jdGlvbiBQMTkyKCkge1xuICBNUHJpbWUuY2FsbChcbiAgICB0aGlzLFxuICAgICdwMTkyJyxcbiAgICAnZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmUgZmZmZmZmZmYgZmZmZmZmZmYnKTtcbn1cbmluaGVyaXRzKFAxOTIsIE1QcmltZSk7XG5cbmZ1bmN0aW9uIFAyNTUxOSgpIHtcbiAgLy8gMiBeIDI1NSAtIDE5XG4gIE1QcmltZS5jYWxsKFxuICAgIHRoaXMsXG4gICAgJzI1NTE5JyxcbiAgICAnN2ZmZmZmZmZmZmZmZmZmZiBmZmZmZmZmZmZmZmZmZmZmIGZmZmZmZmZmZmZmZmZmZmYgZmZmZmZmZmZmZmZmZmZlZCcpO1xufVxuaW5oZXJpdHMoUDI1NTE5LCBNUHJpbWUpO1xuXG5QMjU1MTkucHJvdG90eXBlLmltdWxLID0gZnVuY3Rpb24gaW11bEsobnVtKSB7XG4gIC8vIEsgPSAweDEzXG4gIHZhciBjYXJyeSA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGhpID0gbnVtLndvcmRzW2ldICogMHgxMyArIGNhcnJ5O1xuICAgIHZhciBsbyA9IGhpICYgMHgzZmZmZmZmO1xuICAgIGhpID4+Pj0gMjY7XG5cbiAgICBudW0ud29yZHNbaV0gPSBsbztcbiAgICBjYXJyeSA9IGhpO1xuICB9XG4gIGlmIChjYXJyeSAhPT0gMClcbiAgICBudW0ud29yZHNbbnVtLmxlbmd0aCsrXSA9IGNhcnJ5O1xuICByZXR1cm4gbnVtO1xufTtcblxuLy8gRXhwb3J0ZWQgbW9zdGx5IGZvciB0ZXN0aW5nIHB1cnBvc2VzLCB1c2UgcGxhaW4gbmFtZSBpbnN0ZWFkXG5CTi5fcHJpbWUgPSBmdW5jdGlvbiBwcmltZShuYW1lKSB7XG4gIC8vIENhY2hlZCB2ZXJzaW9uIG9mIHByaW1lXG4gIGlmIChwcmltZXNbbmFtZV0pXG4gICAgcmV0dXJuIHByaW1lc1tuYW1lXTtcblxuICB2YXIgcHJpbWU7XG4gIGlmIChuYW1lID09PSAnazI1NicpXG4gICAgcHJpbWUgPSBuZXcgSzI1NigpO1xuICBlbHNlIGlmIChuYW1lID09PSAncDIyNCcpXG4gICAgcHJpbWUgPSBuZXcgUDIyNCgpO1xuICBlbHNlIGlmIChuYW1lID09PSAncDE5MicpXG4gICAgcHJpbWUgPSBuZXcgUDE5MigpO1xuICBlbHNlIGlmIChuYW1lID09PSAncDI1NTE5JylcbiAgICBwcmltZSA9IG5ldyBQMjU1MTkoKTtcbiAgZWxzZVxuICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBwcmltZSAnICsgbmFtZSk7XG4gIHByaW1lc1tuYW1lXSA9IHByaW1lO1xuXG4gIHJldHVybiBwcmltZTtcbn07XG5cbi8vXG4vLyBCYXNlIHJlZHVjdGlvbiBlbmdpbmVcbi8vXG5mdW5jdGlvbiBSZWQobSkge1xuICBpZiAodHlwZW9mIG0gPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIHByaW1lID0gQk4uX3ByaW1lKG0pO1xuICAgIHRoaXMubSA9IHByaW1lLnA7XG4gICAgdGhpcy5wcmltZSA9IHByaW1lO1xuICB9IGVsc2Uge1xuICAgIHRoaXMubSA9IG07XG4gICAgdGhpcy5wcmltZSA9IG51bGw7XG4gIH1cbn1cblxuUmVkLnByb3RvdHlwZS5fdmVyaWZ5MSA9IGZ1bmN0aW9uIF92ZXJpZnkxKGEpIHtcbiAgYXNzZXJ0KCFhLnNpZ24sICdyZWQgd29ya3Mgb25seSB3aXRoIHBvc2l0aXZlcycpO1xuICBhc3NlcnQoYS5yZWQsICdyZWQgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG59O1xuXG5SZWQucHJvdG90eXBlLl92ZXJpZnkyID0gZnVuY3Rpb24gX3ZlcmlmeTIoYSwgYikge1xuICBhc3NlcnQoIWEuc2lnbiAmJiAhYi5zaWduLCAncmVkIHdvcmtzIG9ubHkgd2l0aCBwb3NpdGl2ZXMnKTtcbiAgYXNzZXJ0KGEucmVkICYmIGEucmVkID09PSBiLnJlZCxcbiAgICAgICAgICdyZWQgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG59O1xuXG5SZWQucHJvdG90eXBlLmltb2QgPSBmdW5jdGlvbiBpbW9kKGEpIHtcbiAgaWYgKHRoaXMucHJpbWUpXG4gICAgcmV0dXJuIHRoaXMucHJpbWUuaXJlZHVjZShhKS5fZm9yY2VSZWQodGhpcyk7XG4gIHJldHVybiBhLm1vZCh0aGlzLm0pLl9mb3JjZVJlZCh0aGlzKTtcbn07XG5cblJlZC5wcm90b3R5cGUubmVnID0gZnVuY3Rpb24gbmVnKGEpIHtcbiAgdmFyIHIgPSBhLmNsb25lKCk7XG4gIHIuc2lnbiA9ICFyLnNpZ247XG4gIHJldHVybiByLmlhZGQodGhpcy5tKS5fZm9yY2VSZWQodGhpcyk7XG59O1xuXG5SZWQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZChhLCBiKSB7XG4gIHRoaXMuX3ZlcmlmeTIoYSwgYik7XG5cbiAgdmFyIHJlcyA9IGEuYWRkKGIpO1xuICBpZiAocmVzLmNtcCh0aGlzLm0pID49IDApXG4gICAgcmVzLmlzdWIodGhpcy5tKTtcbiAgcmV0dXJuIHJlcy5fZm9yY2VSZWQodGhpcyk7XG59O1xuXG5SZWQucHJvdG90eXBlLmlhZGQgPSBmdW5jdGlvbiBpYWRkKGEsIGIpIHtcbiAgdGhpcy5fdmVyaWZ5MihhLCBiKTtcblxuICB2YXIgcmVzID0gYS5pYWRkKGIpO1xuICBpZiAocmVzLmNtcCh0aGlzLm0pID49IDApXG4gICAgcmVzLmlzdWIodGhpcy5tKTtcbiAgcmV0dXJuIHJlcztcbn07XG5cblJlZC5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24gc3ViKGEsIGIpIHtcbiAgdGhpcy5fdmVyaWZ5MihhLCBiKTtcblxuICB2YXIgcmVzID0gYS5zdWIoYik7XG4gIGlmIChyZXMuY21wbigwKSA8IDApXG4gICAgcmVzLmlhZGQodGhpcy5tKTtcbiAgcmV0dXJuIHJlcy5fZm9yY2VSZWQodGhpcyk7XG59O1xuXG5SZWQucHJvdG90eXBlLmlzdWIgPSBmdW5jdGlvbiBpc3ViKGEsIGIpIHtcbiAgdGhpcy5fdmVyaWZ5MihhLCBiKTtcblxuICB2YXIgcmVzID0gYS5pc3ViKGIpO1xuICBpZiAocmVzLmNtcG4oMCkgPCAwKVxuICAgIHJlcy5pYWRkKHRoaXMubSk7XG4gIHJldHVybiByZXM7XG59O1xuXG5SZWQucHJvdG90eXBlLnNobCA9IGZ1bmN0aW9uIHNobChhLCBudW0pIHtcbiAgdGhpcy5fdmVyaWZ5MShhKTtcbiAgcmV0dXJuIHRoaXMuaW1vZChhLnNobG4obnVtKSk7XG59O1xuXG5SZWQucHJvdG90eXBlLmltdWwgPSBmdW5jdGlvbiBpbXVsKGEsIGIpIHtcbiAgdGhpcy5fdmVyaWZ5MihhLCBiKTtcbiAgcmV0dXJuIHRoaXMuaW1vZChhLmltdWwoYikpO1xufTtcblxuUmVkLnByb3RvdHlwZS5tdWwgPSBmdW5jdGlvbiBtdWwoYSwgYikge1xuICB0aGlzLl92ZXJpZnkyKGEsIGIpO1xuICByZXR1cm4gdGhpcy5pbW9kKGEubXVsKGIpKTtcbn07XG5cblJlZC5wcm90b3R5cGUuaXNxciA9IGZ1bmN0aW9uIGlzcXIoYSkge1xuICByZXR1cm4gdGhpcy5pbXVsKGEsIGEpO1xufTtcblxuUmVkLnByb3RvdHlwZS5zcXIgPSBmdW5jdGlvbiBzcXIoYSkge1xuICByZXR1cm4gdGhpcy5tdWwoYSwgYSk7XG59O1xuXG5SZWQucHJvdG90eXBlLnNxcnQgPSBmdW5jdGlvbiBzcXJ0KGEpIHtcbiAgaWYgKGEuY21wbigwKSA9PT0gMClcbiAgICByZXR1cm4gYS5jbG9uZSgpO1xuXG4gIHZhciBtb2QzID0gdGhpcy5tLmFuZGxuKDMpO1xuICBhc3NlcnQobW9kMyAlIDIgPT09IDEpO1xuXG4gIC8vIEZhc3QgY2FzZVxuICBpZiAobW9kMyA9PT0gMykge1xuICAgIHZhciBwb3cgPSB0aGlzLm0uYWRkKG5ldyBCTigxKSkuaXNocm4oMik7XG4gICAgdmFyIHIgPSB0aGlzLnBvdyhhLCBwb3cpO1xuICAgIHJldHVybiByO1xuICB9XG5cbiAgLy8gVG9uZWxsaS1TaGFua3MgYWxnb3JpdGhtIChUb3RhbGx5IHVub3B0aW1pemVkIGFuZCBzbG93KVxuICAvL1xuICAvLyBGaW5kIFEgYW5kIFMsIHRoYXQgUSAqIDIgXiBTID0gKFAgLSAxKVxuICB2YXIgcSA9IHRoaXMubS5zdWJuKDEpO1xuICB2YXIgcyA9IDA7XG4gIHdoaWxlIChxLmNtcG4oMCkgIT09IDAgJiYgcS5hbmRsbigxKSA9PT0gMCkge1xuICAgIHMrKztcbiAgICBxLmlzaHJuKDEpO1xuICB9XG4gIGFzc2VydChxLmNtcG4oMCkgIT09IDApO1xuXG4gIHZhciBvbmUgPSBuZXcgQk4oMSkudG9SZWQodGhpcyk7XG4gIHZhciBuT25lID0gb25lLnJlZE5lZygpO1xuXG4gIC8vIEZpbmQgcXVhZHJhdGljIG5vbi1yZXNpZHVlXG4gIC8vIE5PVEU6IE1heCBpcyBzdWNoIGJlY2F1c2Ugb2YgZ2VuZXJhbGl6ZWQgUmllbWFubiBoeXBvdGhlc2lzLlxuICB2YXIgbHBvdyA9IHRoaXMubS5zdWJuKDEpLmlzaHJuKDEpO1xuICB2YXIgeiA9IHRoaXMubS5iaXRMZW5ndGgoKTtcbiAgeiA9IG5ldyBCTigyICogeiAqIHopLnRvUmVkKHRoaXMpO1xuICB3aGlsZSAodGhpcy5wb3coeiwgbHBvdykuY21wKG5PbmUpICE9PSAwKVxuICAgIHoucmVkSUFkZChuT25lKTtcblxuICB2YXIgYyA9IHRoaXMucG93KHosIHEpO1xuICB2YXIgciA9IHRoaXMucG93KGEsIHEuYWRkbigxKS5pc2hybigxKSk7XG4gIHZhciB0ID0gdGhpcy5wb3coYSwgcSk7XG4gIHZhciBtID0gcztcbiAgd2hpbGUgKHQuY21wKG9uZSkgIT09IDApIHtcbiAgICB2YXIgdG1wID0gdDtcbiAgICBmb3IgKHZhciBpID0gMDsgdG1wLmNtcChvbmUpICE9PSAwOyBpKyspXG4gICAgICB0bXAgPSB0bXAucmVkU3FyKCk7XG4gICAgYXNzZXJ0KGkgPCBtKTtcbiAgICB2YXIgYiA9IHRoaXMucG93KGMsIG5ldyBCTigxKS5pc2hsbihtIC0gaSAtIDEpKTtcblxuICAgIHIgPSByLnJlZE11bChiKTtcbiAgICBjID0gYi5yZWRTcXIoKTtcbiAgICB0ID0gdC5yZWRNdWwoYyk7XG4gICAgbSA9IGk7XG4gIH1cblxuICByZXR1cm4gcjtcbn07XG5cblJlZC5wcm90b3R5cGUuaW52bSA9IGZ1bmN0aW9uIGludm0oYSkge1xuICB2YXIgaW52ID0gYS5faW52bXAodGhpcy5tKTtcbiAgaWYgKGludi5zaWduKSB7XG4gICAgaW52LnNpZ24gPSBmYWxzZTtcbiAgICByZXR1cm4gdGhpcy5pbW9kKGludikucmVkTmVnKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuaW1vZChpbnYpO1xuICB9XG59O1xuXG5SZWQucHJvdG90eXBlLnBvdyA9IGZ1bmN0aW9uIHBvdyhhLCBudW0pIHtcbiAgdmFyIHcgPSBbXTtcblxuICBpZiAobnVtLmNtcG4oMCkgPT09IDApXG4gICAgcmV0dXJuIG5ldyBCTigxKTtcblxuICB2YXIgcSA9IG51bS5jbG9uZSgpO1xuXG4gIHdoaWxlIChxLmNtcG4oMCkgIT09IDApIHtcbiAgICB3LnB1c2gocS5hbmRsbigxKSk7XG4gICAgcS5pc2hybigxKTtcbiAgfVxuXG4gIC8vIFNraXAgbGVhZGluZyB6ZXJvZXNcbiAgdmFyIHJlcyA9IGE7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdy5sZW5ndGg7IGkrKywgcmVzID0gdGhpcy5zcXIocmVzKSlcbiAgICBpZiAod1tpXSAhPT0gMClcbiAgICAgIGJyZWFrO1xuXG4gIGlmICgrK2kgPCB3Lmxlbmd0aCkge1xuICAgIGZvciAodmFyIHEgPSB0aGlzLnNxcihyZXMpOyBpIDwgdy5sZW5ndGg7IGkrKywgcSA9IHRoaXMuc3FyKHEpKSB7XG4gICAgICBpZiAod1tpXSA9PT0gMClcbiAgICAgICAgY29udGludWU7XG4gICAgICByZXMgPSB0aGlzLm11bChyZXMsIHEpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXM7XG59O1xuXG5SZWQucHJvdG90eXBlLmNvbnZlcnRUbyA9IGZ1bmN0aW9uIGNvbnZlcnRUbyhudW0pIHtcbiAgdmFyIHIgPSBudW0ubW9kKHRoaXMubSk7XG4gIGlmIChyID09PSBudW0pXG4gICAgcmV0dXJuIHIuY2xvbmUoKTtcbiAgZWxzZVxuICAgIHJldHVybiByO1xufTtcblxuUmVkLnByb3RvdHlwZS5jb252ZXJ0RnJvbSA9IGZ1bmN0aW9uIGNvbnZlcnRGcm9tKG51bSkge1xuICB2YXIgcmVzID0gbnVtLmNsb25lKCk7XG4gIHJlcy5yZWQgPSBudWxsO1xuICByZXR1cm4gcmVzO1xufTtcblxuLy9cbi8vIE1vbnRnb21lcnkgbWV0aG9kIGVuZ2luZVxuLy9cblxuQk4ubW9udCA9IGZ1bmN0aW9uIG1vbnQobnVtKSB7XG4gIHJldHVybiBuZXcgTW9udChudW0pO1xufTtcblxuZnVuY3Rpb24gTW9udChtKSB7XG4gIFJlZC5jYWxsKHRoaXMsIG0pO1xuXG4gIHRoaXMuc2hpZnQgPSB0aGlzLm0uYml0TGVuZ3RoKCk7XG4gIGlmICh0aGlzLnNoaWZ0ICUgMjYgIT09IDApXG4gICAgdGhpcy5zaGlmdCArPSAyNiAtICh0aGlzLnNoaWZ0ICUgMjYpO1xuICB0aGlzLnIgPSBuZXcgQk4oMSkuaXNobG4odGhpcy5zaGlmdCk7XG4gIHRoaXMucjIgPSB0aGlzLmltb2QodGhpcy5yLnNxcigpKTtcbiAgdGhpcy5yaW52ID0gdGhpcy5yLl9pbnZtcCh0aGlzLm0pO1xuXG4gIHRoaXMubWludiA9IHRoaXMucmludi5tdWwodGhpcy5yKS5pc3VibigxKS5kaXYodGhpcy5tKTtcbiAgdGhpcy5taW52LnNpZ24gPSB0cnVlO1xuICB0aGlzLm1pbnYgPSB0aGlzLm1pbnYubW9kKHRoaXMucik7XG59XG5pbmhlcml0cyhNb250LCBSZWQpO1xuXG5Nb250LnByb3RvdHlwZS5jb252ZXJ0VG8gPSBmdW5jdGlvbiBjb252ZXJ0VG8obnVtKSB7XG4gIHJldHVybiB0aGlzLmltb2QobnVtLnNobG4odGhpcy5zaGlmdCkpO1xufTtcblxuTW9udC5wcm90b3R5cGUuY29udmVydEZyb20gPSBmdW5jdGlvbiBjb252ZXJ0RnJvbShudW0pIHtcbiAgdmFyIHIgPSB0aGlzLmltb2QobnVtLm11bCh0aGlzLnJpbnYpKTtcbiAgci5yZWQgPSBudWxsO1xuICByZXR1cm4gcjtcbn07XG5cbk1vbnQucHJvdG90eXBlLmltdWwgPSBmdW5jdGlvbiBpbXVsKGEsIGIpIHtcbiAgaWYgKGEuY21wbigwKSA9PT0gMCB8fCBiLmNtcG4oMCkgPT09IDApIHtcbiAgICBhLndvcmRzWzBdID0gMDtcbiAgICBhLmxlbmd0aCA9IDE7XG4gICAgcmV0dXJuIGE7XG4gIH1cblxuICB2YXIgdCA9IGEuaW11bChiKTtcbiAgdmFyIGMgPSB0Lm1hc2tuKHRoaXMuc2hpZnQpLm11bCh0aGlzLm1pbnYpLmltYXNrbih0aGlzLnNoaWZ0KS5tdWwodGhpcy5tKTtcbiAgdmFyIHUgPSB0LmlzdWIoYykuaXNocm4odGhpcy5zaGlmdCk7XG4gIHZhciByZXMgPSB1O1xuICBpZiAodS5jbXAodGhpcy5tKSA+PSAwKVxuICAgIHJlcyA9IHUuaXN1Yih0aGlzLm0pO1xuICBlbHNlIGlmICh1LmNtcG4oMCkgPCAwKVxuICAgIHJlcyA9IHUuaWFkZCh0aGlzLm0pO1xuXG4gIHJldHVybiByZXMuX2ZvcmNlUmVkKHRoaXMpO1xufTtcblxuTW9udC5wcm90b3R5cGUubXVsID0gZnVuY3Rpb24gbXVsKGEsIGIpIHtcbiAgaWYgKGEuY21wbigwKSA9PT0gMCB8fCBiLmNtcG4oMCkgPT09IDApXG4gICAgcmV0dXJuIG5ldyBCTigwKS5fZm9yY2VSZWQodGhpcyk7XG5cbiAgdmFyIHQgPSBhLm11bChiKTtcbiAgdmFyIGMgPSB0Lm1hc2tuKHRoaXMuc2hpZnQpLm11bCh0aGlzLm1pbnYpLmltYXNrbih0aGlzLnNoaWZ0KS5tdWwodGhpcy5tKTtcbiAgdmFyIHUgPSB0LmlzdWIoYykuaXNocm4odGhpcy5zaGlmdCk7XG4gIHZhciByZXMgPSB1O1xuICBpZiAodS5jbXAodGhpcy5tKSA+PSAwKVxuICAgIHJlcyA9IHUuaXN1Yih0aGlzLm0pO1xuICBlbHNlIGlmICh1LmNtcG4oMCkgPCAwKVxuICAgIHJlcyA9IHUuaWFkZCh0aGlzLm0pO1xuXG4gIHJldHVybiByZXMuX2ZvcmNlUmVkKHRoaXMpO1xufTtcblxuTW9udC5wcm90b3R5cGUuaW52bSA9IGZ1bmN0aW9uIGludm0oYSkge1xuICAvLyAoQVIpXi0xICogUl4yID0gKEFeLTEgKiBSXi0xKSAqIFJeMiA9IEFeLTEgKiBSXG4gIHZhciByZXMgPSB0aGlzLmltb2QoYS5faW52bXAodGhpcy5tKS5tdWwodGhpcy5yMikpO1xuICByZXR1cm4gcmVzLl9mb3JjZVJlZCh0aGlzKTtcbn07XG5cbn0pKHR5cGVvZiBtb2R1bGUgPT09ICd1bmRlZmluZWQnIHx8IG1vZHVsZSwgdGhpcyk7XG4iLCJ2YXIgY29uc3RhbnRzID0gcmVxdWlyZSgnLi4vY29uc3RhbnRzJyk7XG5cbmV4cG9ydHMudGFnQ2xhc3MgPSB7XG4gIDA6ICd1bml2ZXJzYWwnLFxuICAxOiAnYXBwbGljYXRpb24nLFxuICAyOiAnY29udGV4dCcsXG4gIDM6ICdwcml2YXRlJ1xufTtcbmV4cG9ydHMudGFnQ2xhc3NCeU5hbWUgPSBjb25zdGFudHMuX3JldmVyc2UoZXhwb3J0cy50YWdDbGFzcyk7XG5cbmV4cG9ydHMudGFnID0ge1xuICAweDAwOiAnZW5kJyxcbiAgMHgwMTogJ2Jvb2wnLFxuICAweDAyOiAnaW50JyxcbiAgMHgwMzogJ2JpdHN0cicsXG4gIDB4MDQ6ICdvY3RzdHInLFxuICAweDA1OiAnbnVsbF8nLFxuICAweDA2OiAnb2JqaWQnLFxuICAweDA3OiAnb2JqRGVzYycsXG4gIDB4MDg6ICdleHRlcm5hbCcsXG4gIDB4MDk6ICdyZWFsJyxcbiAgMHgwYTogJ2VudW0nLFxuICAweDBiOiAnZW1iZWQnLFxuICAweDBjOiAndXRmOHN0cicsXG4gIDB4MGQ6ICdyZWxhdGl2ZU9pZCcsXG4gIDB4MTA6ICdzZXEnLFxuICAweDExOiAnc2V0JyxcbiAgMHgxMjogJ251bXN0cicsXG4gIDB4MTM6ICdwcmludHN0cicsXG4gIDB4MTQ6ICd0NjFzdHInLFxuICAweDE1OiAndmlkZW9zdHInLFxuICAweDE2OiAnaWE1c3RyJyxcbiAgMHgxNzogJ3V0Y3RpbWUnLFxuICAweDE4OiAnZ2VudGltZScsXG4gIDB4MTk6ICdncmFwaHN0cicsXG4gIDB4MWE6ICdpc282NDZzdHInLFxuICAweDFiOiAnZ2Vuc3RyJyxcbiAgMHgxYzogJ3VuaXN0cicsXG4gIDB4MWQ6ICdjaGFyc3RyJyxcbiAgMHgxZTogJ2JtcHN0cidcbn07XG5leHBvcnRzLnRhZ0J5TmFtZSA9IGNvbnN0YW50cy5fcmV2ZXJzZShleHBvcnRzLnRhZyk7XG4iLCJ2YXIgY29uc3RhbnRzID0gZXhwb3J0cztcblxuLy8gSGVscGVyXG5jb25zdGFudHMuX3JldmVyc2UgPSBmdW5jdGlvbiByZXZlcnNlKG1hcCkge1xuICB2YXIgcmVzID0ge307XG5cbiAgT2JqZWN0LmtleXMobWFwKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIC8vIENvbnZlcnQga2V5IHRvIGludGVnZXIgaWYgaXQgaXMgc3RyaW5naWZpZWRcbiAgICBpZiAoKGtleSB8IDApID09IGtleSlcbiAgICAgIGtleSA9IGtleSB8IDA7XG5cbiAgICB2YXIgdmFsdWUgPSBtYXBba2V5XTtcbiAgICByZXNbdmFsdWVdID0ga2V5O1xuICB9KTtcblxuICByZXR1cm4gcmVzO1xufTtcblxuY29uc3RhbnRzLmRlciA9IHJlcXVpcmUoJy4vZGVyJyk7XG4iLCJ2YXIgaW5oZXJpdHMgPSByZXF1aXJlKCd1dGlsJykuaW5oZXJpdHM7XG5cbnZhciBhc24xID0gcmVxdWlyZSgnLi4vYXNuMScpO1xudmFyIGJhc2UgPSBhc24xLmJhc2U7XG52YXIgYmlnbnVtID0gYXNuMS5iaWdudW07XG5cbi8vIEltcG9ydCBERVIgY29uc3RhbnRzXG52YXIgZGVyID0gYXNuMS5jb25zdGFudHMuZGVyO1xuXG5mdW5jdGlvbiBERVJEZWNvZGVyKGVudGl0eSkge1xuICB0aGlzLmVuYyA9ICdkZXInO1xuICB0aGlzLm5hbWUgPSBlbnRpdHkubmFtZTtcbiAgdGhpcy5lbnRpdHkgPSBlbnRpdHk7XG5cbiAgLy8gQ29uc3RydWN0IGJhc2UgdHJlZVxuICB0aGlzLnRyZWUgPSBuZXcgREVSTm9kZSgpO1xuICB0aGlzLnRyZWUuX2luaXQoZW50aXR5LmJvZHkpO1xufTtcbm1vZHVsZS5leHBvcnRzID0gREVSRGVjb2RlcjtcblxuREVSRGVjb2Rlci5wcm90b3R5cGUuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKGRhdGEsIG9wdGlvbnMpIHtcbiAgaWYgKCEoZGF0YSBpbnN0YW5jZW9mIGJhc2UuRGVjb2RlckJ1ZmZlcikpXG4gICAgZGF0YSA9IG5ldyBiYXNlLkRlY29kZXJCdWZmZXIoZGF0YSwgb3B0aW9ucyk7XG5cbiAgcmV0dXJuIHRoaXMudHJlZS5fZGVjb2RlKGRhdGEsIG9wdGlvbnMpO1xufTtcblxuLy8gVHJlZSBtZXRob2RzXG5cbmZ1bmN0aW9uIERFUk5vZGUocGFyZW50KSB7XG4gIGJhc2UuTm9kZS5jYWxsKHRoaXMsICdkZXInLCBwYXJlbnQpO1xufVxuaW5oZXJpdHMoREVSTm9kZSwgYmFzZS5Ob2RlKTtcblxuREVSTm9kZS5wcm90b3R5cGUuX3BlZWtUYWcgPSBmdW5jdGlvbiBwZWVrVGFnKGJ1ZmZlciwgdGFnLCBhbnkpIHtcbiAgaWYgKGJ1ZmZlci5pc0VtcHR5KCkpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBzdGF0ZSA9IGJ1ZmZlci5zYXZlKCk7XG4gIHZhciBkZWNvZGVkVGFnID0gZGVyRGVjb2RlVGFnKGJ1ZmZlciwgJ0ZhaWxlZCB0byBwZWVrIHRhZzogXCInICsgdGFnICsgJ1wiJyk7XG4gIGlmIChidWZmZXIuaXNFcnJvcihkZWNvZGVkVGFnKSlcbiAgICByZXR1cm4gZGVjb2RlZFRhZztcblxuICBidWZmZXIucmVzdG9yZShzdGF0ZSk7XG5cbiAgcmV0dXJuIGRlY29kZWRUYWcudGFnID09PSB0YWcgfHwgZGVjb2RlZFRhZy50YWdTdHIgPT09IHRhZyB8fCBhbnk7XG59O1xuXG5ERVJOb2RlLnByb3RvdHlwZS5fZGVjb2RlVGFnID0gZnVuY3Rpb24gZGVjb2RlVGFnKGJ1ZmZlciwgdGFnLCBhbnkpIHtcbiAgdmFyIGRlY29kZWRUYWcgPSBkZXJEZWNvZGVUYWcoYnVmZmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGRlY29kZSB0YWcgb2YgXCInICsgdGFnICsgJ1wiJyk7XG4gIGlmIChidWZmZXIuaXNFcnJvcihkZWNvZGVkVGFnKSlcbiAgICByZXR1cm4gZGVjb2RlZFRhZztcblxuICB2YXIgbGVuID0gZGVyRGVjb2RlTGVuKGJ1ZmZlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICBkZWNvZGVkVGFnLnByaW1pdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGdldCBsZW5ndGggb2YgXCInICsgdGFnICsgJ1wiJyk7XG5cbiAgLy8gRmFpbHVyZVxuICBpZiAoYnVmZmVyLmlzRXJyb3IobGVuKSlcbiAgICByZXR1cm4gbGVuO1xuXG4gIGlmICghYW55ICYmXG4gICAgICBkZWNvZGVkVGFnLnRhZyAhPT0gdGFnICYmXG4gICAgICBkZWNvZGVkVGFnLnRhZ1N0ciAhPT0gdGFnICYmXG4gICAgICBkZWNvZGVkVGFnLnRhZ1N0ciArICdvZicgIT09IHRhZykge1xuICAgIHJldHVybiBidWZmZXIuZXJyb3IoJ0ZhaWxlZCB0byBtYXRjaCB0YWc6IFwiJyArIHRhZyArICdcIicpO1xuICB9XG5cbiAgaWYgKGRlY29kZWRUYWcucHJpbWl0aXZlIHx8IGxlbiAhPT0gbnVsbClcbiAgICByZXR1cm4gYnVmZmVyLnNraXAobGVuLCAnRmFpbGVkIHRvIG1hdGNoIGJvZHkgb2Y6IFwiJyArIHRhZyArICdcIicpO1xuXG4gIC8vIEluZGVmaW5pdGUgbGVuZ3RoLi4uIGZpbmQgRU5EIHRhZ1xuICB2YXIgc3RhdGUgPSBidWZmZXIuc2F2ZSgpO1xuICB2YXIgcmVzID0gdGhpcy5fc2tpcFVudGlsRW5kKFxuICAgICAgYnVmZmVyLFxuICAgICAgJ0ZhaWxlZCB0byBza2lwIGluZGVmaW5pdGUgbGVuZ3RoIGJvZHk6IFwiJyArIHRoaXMudGFnICsgJ1wiJyk7XG4gIGlmIChidWZmZXIuaXNFcnJvcihyZXMpKVxuICAgIHJldHVybiByZXM7XG5cbiAgbGVuID0gYnVmZmVyLm9mZnNldCAtIHN0YXRlLm9mZnNldDtcbiAgYnVmZmVyLnJlc3RvcmUoc3RhdGUpO1xuICByZXR1cm4gYnVmZmVyLnNraXAobGVuLCAnRmFpbGVkIHRvIG1hdGNoIGJvZHkgb2Y6IFwiJyArIHRhZyArICdcIicpO1xufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX3NraXBVbnRpbEVuZCA9IGZ1bmN0aW9uIHNraXBVbnRpbEVuZChidWZmZXIsIGZhaWwpIHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICB2YXIgdGFnID0gZGVyRGVjb2RlVGFnKGJ1ZmZlciwgZmFpbCk7XG4gICAgaWYgKGJ1ZmZlci5pc0Vycm9yKHRhZykpXG4gICAgICByZXR1cm4gdGFnO1xuICAgIHZhciBsZW4gPSBkZXJEZWNvZGVMZW4oYnVmZmVyLCB0YWcucHJpbWl0aXZlLCBmYWlsKTtcbiAgICBpZiAoYnVmZmVyLmlzRXJyb3IobGVuKSlcbiAgICAgIHJldHVybiBsZW47XG5cbiAgICB2YXIgcmVzO1xuICAgIGlmICh0YWcucHJpbWl0aXZlIHx8IGxlbiAhPT0gbnVsbClcbiAgICAgIHJlcyA9IGJ1ZmZlci5za2lwKGxlbilcbiAgICBlbHNlXG4gICAgICByZXMgPSB0aGlzLl9za2lwVW50aWxFbmQoYnVmZmVyLCBmYWlsKTtcblxuICAgIC8vIEZhaWx1cmVcbiAgICBpZiAoYnVmZmVyLmlzRXJyb3IocmVzKSlcbiAgICAgIHJldHVybiByZXM7XG5cbiAgICBpZiAodGFnLnRhZ1N0ciA9PT0gJ2VuZCcpXG4gICAgICBicmVhaztcbiAgfVxufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX2RlY29kZUxpc3QgPSBmdW5jdGlvbiBkZWNvZGVMaXN0KGJ1ZmZlciwgdGFnLCBkZWNvZGVyKSB7XG4gIHZhciByZXN1bHQgPSBbXTtcbiAgd2hpbGUgKCFidWZmZXIuaXNFbXB0eSgpKSB7XG4gICAgdmFyIHBvc3NpYmxlRW5kID0gdGhpcy5fcGVla1RhZyhidWZmZXIsICdlbmQnKTtcbiAgICBpZiAoYnVmZmVyLmlzRXJyb3IocG9zc2libGVFbmQpKVxuICAgICAgcmV0dXJuIHBvc3NpYmxlRW5kO1xuXG4gICAgdmFyIHJlcyA9IGRlY29kZXIuZGVjb2RlKGJ1ZmZlciwgJ2RlcicpO1xuICAgIGlmIChidWZmZXIuaXNFcnJvcihyZXMpICYmIHBvc3NpYmxlRW5kKVxuICAgICAgYnJlYWs7XG4gICAgcmVzdWx0LnB1c2gocmVzKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX2RlY29kZVN0ciA9IGZ1bmN0aW9uIGRlY29kZVN0cihidWZmZXIsIHRhZykge1xuICBpZiAodGFnID09PSAnb2N0c3RyJykge1xuICAgIHJldHVybiBidWZmZXIucmF3KCk7XG4gIH0gZWxzZSBpZiAodGFnID09PSAnYml0c3RyJykge1xuICAgIHZhciB1bnVzZWQgPSBidWZmZXIucmVhZFVJbnQ4KCk7XG4gICAgaWYgKGJ1ZmZlci5pc0Vycm9yKHVudXNlZCkpXG4gICAgICByZXR1cm4gdW51c2VkO1xuXG4gICAgcmV0dXJuIHsgdW51c2VkOiB1bnVzZWQsIGRhdGE6IGJ1ZmZlci5yYXcoKSB9O1xuICB9IGVsc2UgaWYgKHRhZyA9PT0gJ2lhNXN0cicgfHwgdGFnID09PSAndXRmOHN0cicpIHtcbiAgICByZXR1cm4gYnVmZmVyLnJhdygpLnRvU3RyaW5nKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuZXJyb3IoJ0RlY29kaW5nIG9mIHN0cmluZyB0eXBlOiAnICsgdGFnICsgJyB1bnN1cHBvcnRlZCcpO1xuICB9XG59O1xuXG5ERVJOb2RlLnByb3RvdHlwZS5fZGVjb2RlT2JqaWQgPSBmdW5jdGlvbiBkZWNvZGVPYmppZChidWZmZXIsIHZhbHVlcywgcmVsYXRpdmUpIHtcbiAgdmFyIGlkZW50aWZpZXJzID0gW107XG4gIHZhciBpZGVudCA9IDA7XG4gIHdoaWxlICghYnVmZmVyLmlzRW1wdHkoKSkge1xuICAgIHZhciBzdWJpZGVudCA9IGJ1ZmZlci5yZWFkVUludDgoKTtcbiAgICBpZGVudCA8PD0gNztcbiAgICBpZGVudCB8PSBzdWJpZGVudCAmIDB4N2Y7XG4gICAgaWYgKChzdWJpZGVudCAmIDB4ODApID09PSAwKSB7XG4gICAgICBpZGVudGlmaWVycy5wdXNoKGlkZW50KTtcbiAgICAgIGlkZW50ID0gMDtcbiAgICB9XG4gIH1cbiAgaWYgKHN1YmlkZW50ICYgMHg4MClcbiAgICBpZGVudGlmaWVycy5wdXNoKGlkZW50KTtcblxuICB2YXIgZmlyc3QgPSAoaWRlbnRpZmllcnNbMF0gLyA0MCkgfCAwO1xuICB2YXIgc2Vjb25kID0gaWRlbnRpZmllcnNbMF0gJSA0MDtcblxuICBpZiAocmVsYXRpdmUpXG4gICAgcmVzdWx0ID0gaWRlbnRpZmllcnM7XG4gIGVsc2VcbiAgICByZXN1bHQgPSBbZmlyc3QsIHNlY29uZF0uY29uY2F0KGlkZW50aWZpZXJzLnNsaWNlKDEpKTtcblxuICBpZiAodmFsdWVzKVxuICAgIHJlc3VsdCA9IHZhbHVlc1tyZXN1bHQuam9pbignICcpXTtcblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX2RlY29kZVRpbWUgPSBmdW5jdGlvbiBkZWNvZGVUaW1lKGJ1ZmZlciwgdGFnKSB7XG4gIHZhciBzdHIgPSBidWZmZXIucmF3KCkudG9TdHJpbmcoKTtcbiAgaWYgKHRhZyA9PT0gJ2dlbnRpbWUnKSB7XG4gICAgdmFyIHllYXIgPSBzdHIuc2xpY2UoMCwgNCkgfCAwO1xuICAgIHZhciBtb24gPSBzdHIuc2xpY2UoNCwgNikgfCAwO1xuICAgIHZhciBkYXkgPSBzdHIuc2xpY2UoNiwgOCkgfCAwO1xuICAgIHZhciBob3VyID0gc3RyLnNsaWNlKDgsIDEwKSB8IDA7XG4gICAgdmFyIG1pbiA9IHN0ci5zbGljZSgxMCwgMTIpIHwgMDtcbiAgICB2YXIgc2VjID0gc3RyLnNsaWNlKDEyLCAxNCkgfCAwO1xuICB9IGVsc2UgaWYgKHRhZyA9PT0gJ3V0Y3RpbWUnKSB7XG4gICAgdmFyIHllYXIgPSBzdHIuc2xpY2UoMCwgMikgfCAwO1xuICAgIHZhciBtb24gPSBzdHIuc2xpY2UoMiwgNCkgfCAwO1xuICAgIHZhciBkYXkgPSBzdHIuc2xpY2UoNCwgNikgfCAwO1xuICAgIHZhciBob3VyID0gc3RyLnNsaWNlKDYsIDgpIHwgMDtcbiAgICB2YXIgbWluID0gc3RyLnNsaWNlKDgsIDEwKSB8IDA7XG4gICAgdmFyIHNlYyA9IHN0ci5zbGljZSgxMCwgMTIpIHwgMDtcbiAgICBpZiAoeWVhciA8IDcwKVxuICAgICAgeWVhciA9IDIwMDAgKyB5ZWFyO1xuICAgIGVsc2VcbiAgICAgIHllYXIgPSAxOTAwICsgeWVhcjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5lcnJvcignRGVjb2RpbmcgJyArIHRhZyArICcgdGltZSBpcyBub3Qgc3VwcG9ydGVkIHlldCcpO1xuICB9XG5cbiAgcmV0dXJuIERhdGUuVVRDKHllYXIsIG1vbiAtIDEsIGRheSwgaG91ciwgbWluLCBzZWMsIDApO1xufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX2RlY29kZU51bGwgPSBmdW5jdGlvbiBkZWNvZGVOdWxsKGJ1ZmZlcikge1xuICByZXR1cm4gbnVsbDtcbn07XG5cbkRFUk5vZGUucHJvdG90eXBlLl9kZWNvZGVCb29sID0gZnVuY3Rpb24gZGVjb2RlQm9vbChidWZmZXIpIHtcbiAgdmFyIHJlcyA9IGJ1ZmZlci5yZWFkVUludDgoKTtcbiAgaWYgKGJ1ZmZlci5pc0Vycm9yKHJlcykpXG4gICAgcmV0dXJuIHJlcztcbiAgZWxzZVxuICAgIHJldHVybiByZXMgIT09IDA7XG59O1xuXG5ERVJOb2RlLnByb3RvdHlwZS5fZGVjb2RlSW50ID0gZnVuY3Rpb24gZGVjb2RlSW50KGJ1ZmZlciwgdmFsdWVzKSB7XG4gIC8vIEJpZ2ludCwgcmV0dXJuIGFzIGl0IGlzIChhc3N1bWUgYmlnIGVuZGlhbilcbiAgdmFyIHJhdyA9IGJ1ZmZlci5yYXcoKTtcbiAgdmFyIHJlcyA9IG5ldyBiaWdudW0ocmF3KTtcblxuICBpZiAodmFsdWVzKVxuICAgIHJlcyA9IHZhbHVlc1tyZXMudG9TdHJpbmcoMTApXSB8fCByZXM7XG5cbiAgcmV0dXJuIHJlcztcbn07XG5cbkRFUk5vZGUucHJvdG90eXBlLl91c2UgPSBmdW5jdGlvbiB1c2UoZW50aXR5LCBvYmopIHtcbiAgaWYgKHR5cGVvZiBlbnRpdHkgPT09ICdmdW5jdGlvbicpXG4gICAgZW50aXR5ID0gZW50aXR5KG9iaik7XG4gIHJldHVybiBlbnRpdHkuX2dldERlY29kZXIoJ2RlcicpLnRyZWU7XG59O1xuXG4vLyBVdGlsaXR5IG1ldGhvZHNcblxuZnVuY3Rpb24gZGVyRGVjb2RlVGFnKGJ1ZiwgZmFpbCkge1xuICB2YXIgdGFnID0gYnVmLnJlYWRVSW50OChmYWlsKTtcbiAgaWYgKGJ1Zi5pc0Vycm9yKHRhZykpXG4gICAgcmV0dXJuIHRhZztcblxuICB2YXIgY2xzID0gZGVyLnRhZ0NsYXNzW3RhZyA+PiA2XTtcbiAgdmFyIHByaW1pdGl2ZSA9ICh0YWcgJiAweDIwKSA9PT0gMDtcblxuICAvLyBNdWx0aS1vY3RldCB0YWcgLSBsb2FkXG4gIGlmICgodGFnICYgMHgxZikgPT09IDB4MWYpIHtcbiAgICB2YXIgb2N0ID0gdGFnO1xuICAgIHRhZyA9IDA7XG4gICAgd2hpbGUgKChvY3QgJiAweDgwKSA9PT0gMHg4MCkge1xuICAgICAgb2N0ID0gYnVmLnJlYWRVSW50OChmYWlsKTtcbiAgICAgIGlmIChidWYuaXNFcnJvcihvY3QpKVxuICAgICAgICByZXR1cm4gb2N0O1xuXG4gICAgICB0YWcgPDw9IDc7XG4gICAgICB0YWcgfD0gb2N0ICYgMHg3ZjtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGFnICY9IDB4MWY7XG4gIH1cbiAgdmFyIHRhZ1N0ciA9IGRlci50YWdbdGFnXTtcblxuICByZXR1cm4ge1xuICAgIGNsczogY2xzLFxuICAgIHByaW1pdGl2ZTogcHJpbWl0aXZlLFxuICAgIHRhZzogdGFnLFxuICAgIHRhZ1N0cjogdGFnU3RyXG4gIH07XG59XG5cbmZ1bmN0aW9uIGRlckRlY29kZUxlbihidWYsIHByaW1pdGl2ZSwgZmFpbCkge1xuICB2YXIgbGVuID0gYnVmLnJlYWRVSW50OChmYWlsKTtcbiAgaWYgKGJ1Zi5pc0Vycm9yKGxlbikpXG4gICAgcmV0dXJuIGxlbjtcblxuICAvLyBJbmRlZmluaXRlIGZvcm1cbiAgaWYgKCFwcmltaXRpdmUgJiYgbGVuID09PSAweDgwKVxuICAgIHJldHVybiBudWxsO1xuXG4gIC8vIERlZmluaXRlIGZvcm1cbiAgaWYgKChsZW4gJiAweDgwKSA9PT0gMCkge1xuICAgIC8vIFNob3J0IGZvcm1cbiAgICByZXR1cm4gbGVuO1xuICB9XG5cbiAgLy8gTG9uZyBmb3JtXG4gIHZhciBudW0gPSBsZW4gJiAweDdmO1xuICBpZiAobnVtID49IDQpXG4gICAgcmV0dXJuIGJ1Zi5lcnJvcignbGVuZ3RoIG9jdGVjdCBpcyB0b28gbG9uZycpO1xuXG4gIGxlbiA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtOyBpKyspIHtcbiAgICBsZW4gPDw9IDg7XG4gICAgdmFyIGogPSBidWYucmVhZFVJbnQ4KGZhaWwpO1xuICAgIGlmIChidWYuaXNFcnJvcihqKSlcbiAgICAgIHJldHVybiBqO1xuICAgIGxlbiB8PSBqO1xuICB9XG5cbiAgcmV0dXJuIGxlbjtcbn1cbiIsInZhciBkZWNvZGVycyA9IGV4cG9ydHM7XG5cbmRlY29kZXJzLmRlciA9IHJlcXVpcmUoJy4vZGVyJyk7XG5kZWNvZGVycy5wZW0gPSByZXF1aXJlKCcuL3BlbScpO1xuIiwidmFyIGluaGVyaXRzID0gcmVxdWlyZSgndXRpbCcpLmluaGVyaXRzO1xudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcblxudmFyIGFzbjEgPSByZXF1aXJlKCcuLi9hc24xJyk7XG52YXIgREVSRGVjb2RlciA9IHJlcXVpcmUoJy4vZGVyJyk7XG5cbmZ1bmN0aW9uIFBFTURlY29kZXIoZW50aXR5KSB7XG4gIERFUkRlY29kZXIuY2FsbCh0aGlzLCBlbnRpdHkpO1xuICB0aGlzLmVuYyA9ICdwZW0nO1xufTtcbmluaGVyaXRzKFBFTURlY29kZXIsIERFUkRlY29kZXIpO1xubW9kdWxlLmV4cG9ydHMgPSBQRU1EZWNvZGVyO1xuXG5QRU1EZWNvZGVyLnByb3RvdHlwZS5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUoZGF0YSwgb3B0aW9ucykge1xuICB2YXIgbGluZXMgPSBkYXRhLnRvU3RyaW5nKCkuc3BsaXQoL1tcXHJcXG5dKy9nKTtcblxuICB2YXIgbGFiZWwgPSBvcHRpb25zLmxhYmVsLnRvVXBwZXJDYXNlKCk7XG5cbiAgdmFyIHJlID0gL14tLS0tLShCRUdJTnxFTkQpIChbXi1dKyktLS0tLSQvO1xuICB2YXIgc3RhcnQgPSAtMTtcbiAgdmFyIGVuZCA9IC0xO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG1hdGNoID0gbGluZXNbaV0ubWF0Y2gocmUpO1xuICAgIGlmIChtYXRjaCA9PT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgaWYgKG1hdGNoWzJdICE9PSBsYWJlbClcbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgaWYgKHN0YXJ0ID09PSAtMSkge1xuICAgICAgaWYgKG1hdGNoWzFdICE9PSAnQkVHSU4nKVxuICAgICAgICBicmVhaztcbiAgICAgIHN0YXJ0ID0gaTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG1hdGNoWzFdICE9PSAnRU5EJylcbiAgICAgICAgYnJlYWs7XG4gICAgICBlbmQgPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIGlmIChzdGFydCA9PT0gLTEgfHwgZW5kID09PSAtMSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1BFTSBzZWN0aW9uIG5vdCBmb3VuZCBmb3I6ICcgKyBsYWJlbCk7XG5cbiAgdmFyIGJhc2U2NCA9IGxpbmVzLnNsaWNlKHN0YXJ0ICsgMSwgZW5kKS5qb2luKCcnKTtcbiAgLy8gUmVtb3ZlIGV4Y2Vzc2l2ZSBzeW1ib2xzXG4gIGJhc2U2NC5yZXBsYWNlKC9bXmEtejAtOVxcK1xcLz1dKy9naSwgJycpO1xuXG4gIHZhciBpbnB1dCA9IG5ldyBCdWZmZXIoYmFzZTY0LCAnYmFzZTY0Jyk7XG4gIHJldHVybiBERVJEZWNvZGVyLnByb3RvdHlwZS5kZWNvZGUuY2FsbCh0aGlzLCBpbnB1dCwgb3B0aW9ucyk7XG59O1xuIiwidmFyIGluaGVyaXRzID0gcmVxdWlyZSgndXRpbCcpLmluaGVyaXRzO1xudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcblxudmFyIGFzbjEgPSByZXF1aXJlKCcuLi9hc24xJyk7XG52YXIgYmFzZSA9IGFzbjEuYmFzZTtcbnZhciBiaWdudW0gPSBhc24xLmJpZ251bTtcblxuLy8gSW1wb3J0IERFUiBjb25zdGFudHNcbnZhciBkZXIgPSBhc24xLmNvbnN0YW50cy5kZXI7XG5cbmZ1bmN0aW9uIERFUkVuY29kZXIoZW50aXR5KSB7XG4gIHRoaXMuZW5jID0gJ2Rlcic7XG4gIHRoaXMubmFtZSA9IGVudGl0eS5uYW1lO1xuICB0aGlzLmVudGl0eSA9IGVudGl0eTtcblxuICAvLyBDb25zdHJ1Y3QgYmFzZSB0cmVlXG4gIHRoaXMudHJlZSA9IG5ldyBERVJOb2RlKCk7XG4gIHRoaXMudHJlZS5faW5pdChlbnRpdHkuYm9keSk7XG59O1xubW9kdWxlLmV4cG9ydHMgPSBERVJFbmNvZGVyO1xuXG5ERVJFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUoZGF0YSwgcmVwb3J0ZXIpIHtcbiAgcmV0dXJuIHRoaXMudHJlZS5fZW5jb2RlKGRhdGEsIHJlcG9ydGVyKS5qb2luKCk7XG59O1xuXG4vLyBUcmVlIG1ldGhvZHNcblxuZnVuY3Rpb24gREVSTm9kZShwYXJlbnQpIHtcbiAgYmFzZS5Ob2RlLmNhbGwodGhpcywgJ2RlcicsIHBhcmVudCk7XG59XG5pbmhlcml0cyhERVJOb2RlLCBiYXNlLk5vZGUpO1xuXG5ERVJOb2RlLnByb3RvdHlwZS5fZW5jb2RlQ29tcG9zaXRlID0gZnVuY3Rpb24gZW5jb2RlQ29tcG9zaXRlKHRhZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbWl0aXZlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQpIHtcbiAgdmFyIGVuY29kZWRUYWcgPSBlbmNvZGVUYWcodGFnLCBwcmltaXRpdmUsIGNscywgdGhpcy5yZXBvcnRlcik7XG5cbiAgLy8gU2hvcnQgZm9ybVxuICBpZiAoY29udGVudC5sZW5ndGggPCAweDgwKSB7XG4gICAgdmFyIGhlYWRlciA9IG5ldyBCdWZmZXIoMik7XG4gICAgaGVhZGVyWzBdID0gZW5jb2RlZFRhZztcbiAgICBoZWFkZXJbMV0gPSBjb250ZW50Lmxlbmd0aDtcbiAgICByZXR1cm4gdGhpcy5fY3JlYXRlRW5jb2RlckJ1ZmZlcihbIGhlYWRlciwgY29udGVudCBdKTtcbiAgfVxuXG4gIC8vIExvbmcgZm9ybVxuICAvLyBDb3VudCBvY3RldHMgcmVxdWlyZWQgdG8gc3RvcmUgbGVuZ3RoXG4gIHZhciBsZW5PY3RldHMgPSAxO1xuICBmb3IgKHZhciBpID0gY29udGVudC5sZW5ndGg7IGkgPj0gMHgxMDA7IGkgPj49IDgpXG4gICAgbGVuT2N0ZXRzKys7XG5cbiAgdmFyIGhlYWRlciA9IG5ldyBCdWZmZXIoMSArIDEgKyBsZW5PY3RldHMpO1xuICBoZWFkZXJbMF0gPSBlbmNvZGVkVGFnO1xuICBoZWFkZXJbMV0gPSAweDgwIHwgbGVuT2N0ZXRzO1xuXG4gIGZvciAodmFyIGkgPSAxICsgbGVuT2N0ZXRzLCBqID0gY29udGVudC5sZW5ndGg7IGogPiAwOyBpLS0sIGogPj49IDgpXG4gICAgaGVhZGVyW2ldID0gaiAmIDB4ZmY7XG5cbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUVuY29kZXJCdWZmZXIoWyBoZWFkZXIsIGNvbnRlbnQgXSk7XG59O1xuXG5ERVJOb2RlLnByb3RvdHlwZS5fZW5jb2RlU3RyID0gZnVuY3Rpb24gZW5jb2RlU3RyKHN0ciwgdGFnKSB7XG4gIGlmICh0YWcgPT09ICdvY3RzdHInKVxuICAgIHJldHVybiB0aGlzLl9jcmVhdGVFbmNvZGVyQnVmZmVyKHN0cik7XG4gIGVsc2UgaWYgKHRhZyA9PT0gJ2JpdHN0cicpXG4gICAgcmV0dXJuIHRoaXMuX2NyZWF0ZUVuY29kZXJCdWZmZXIoWyBzdHIudW51c2VkIHwgMCwgc3RyLmRhdGEgXSk7XG4gIGVsc2UgaWYgKHRhZyA9PT0gJ2lhNXN0cicgfHwgdGFnID09PSAndXRmOHN0cicpXG4gICAgcmV0dXJuIHRoaXMuX2NyZWF0ZUVuY29kZXJCdWZmZXIoc3RyKTtcbiAgcmV0dXJuIHRoaXMucmVwb3J0ZXIuZXJyb3IoJ0VuY29kaW5nIG9mIHN0cmluZyB0eXBlOiAnICsgdGFnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyB1bnN1cHBvcnRlZCcpO1xufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX2VuY29kZU9iamlkID0gZnVuY3Rpb24gZW5jb2RlT2JqaWQoaWQsIHZhbHVlcywgcmVsYXRpdmUpIHtcbiAgaWYgKHR5cGVvZiBpZCA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAoIXZhbHVlcylcbiAgICAgIHJldHVybiB0aGlzLnJlcG9ydGVyLmVycm9yKCdzdHJpbmcgb2JqaWQgZ2l2ZW4sIGJ1dCBubyB2YWx1ZXMgbWFwIGZvdW5kJyk7XG4gICAgaWYgKCF2YWx1ZXMuaGFzT3duUHJvcGVydHkoaWQpKVxuICAgICAgcmV0dXJuIHRoaXMucmVwb3J0ZXIuZXJyb3IoJ29iamlkIG5vdCBmb3VuZCBpbiB2YWx1ZXMgbWFwJyk7XG4gICAgaWQgPSB2YWx1ZXNbaWRdLnNwbGl0KC9bXFxzXFwuXSsvZyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpZC5sZW5ndGg7IGkrKylcbiAgICAgIGlkW2ldIHw9IDA7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShpZCkpIHtcbiAgICBpZCA9IGlkLnNsaWNlKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpZC5sZW5ndGg7IGkrKylcbiAgICAgIGlkW2ldIHw9IDA7XG4gIH1cblxuICBpZiAoIUFycmF5LmlzQXJyYXkoaWQpKSB7XG4gICAgcmV0dXJuIHRoaXMucmVwb3J0ZXIuZXJyb3IoJ29iamlkKCkgc2hvdWxkIGJlIGVpdGhlciBhcnJheSBvciBzdHJpbmcsICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdnb3Q6ICcgKyBKU09OLnN0cmluZ2lmeShpZCkpO1xuICB9XG5cbiAgaWYgKCFyZWxhdGl2ZSkge1xuICAgIGlmIChpZFsxXSA+PSA0MClcbiAgICAgIHJldHVybiB0aGlzLnJlcG9ydGVyLmVycm9yKCdTZWNvbmQgb2JqaWQgaWRlbnRpZmllciBPT0InKTtcbiAgICBpZC5zcGxpY2UoMCwgMiwgaWRbMF0gKiA0MCArIGlkWzFdKTtcbiAgfVxuXG4gIC8vIENvdW50IG51bWJlciBvZiBvY3RldHNcbiAgdmFyIHNpemUgPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGlkLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGlkZW50ID0gaWRbaV07XG4gICAgZm9yIChzaXplKys7IGlkZW50ID49IDB4ODA7IGlkZW50ID4+PSA3KVxuICAgICAgc2l6ZSsrO1xuICB9XG5cbiAgdmFyIG9iamlkID0gbmV3IEJ1ZmZlcihzaXplKTtcbiAgdmFyIG9mZnNldCA9IG9iamlkLmxlbmd0aCAtIDE7XG4gIGZvciAodmFyIGkgPSBpZC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBpZGVudCA9IGlkW2ldO1xuICAgIG9iamlkW29mZnNldC0tXSA9IGlkZW50ICYgMHg3ZjtcbiAgICB3aGlsZSAoKGlkZW50ID4+PSA3KSA+IDApXG4gICAgICBvYmppZFtvZmZzZXQtLV0gPSAweDgwIHwgKGlkZW50ICYgMHg3Zik7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fY3JlYXRlRW5jb2RlckJ1ZmZlcihvYmppZCk7XG59O1xuXG5mdW5jdGlvbiB0d28obnVtKSB7XG4gIGlmIChudW0gPCAxMClcbiAgICByZXR1cm4gJzAnICsgbnVtO1xuICBlbHNlXG4gICAgcmV0dXJuIG51bTtcbn1cblxuREVSTm9kZS5wcm90b3R5cGUuX2VuY29kZVRpbWUgPSBmdW5jdGlvbiBlbmNvZGVUaW1lKHRpbWUsIHRhZykge1xuICB2YXIgc3RyO1xuICB2YXIgZGF0ZSA9IG5ldyBEYXRlKHRpbWUpO1xuXG4gIGlmICh0YWcgPT09ICdnZW50aW1lJykge1xuICAgIHN0ciA9IFtcbiAgICAgIHR3byhkYXRlLmdldEZ1bGxZZWFyKCkpLFxuICAgICAgdHdvKGRhdGUuZ2V0VVRDTW9udGgoKSArIDEpLFxuICAgICAgdHdvKGRhdGUuZ2V0VVRDRGF0ZSgpKSxcbiAgICAgIHR3byhkYXRlLmdldFVUQ0hvdXJzKCkpLFxuICAgICAgdHdvKGRhdGUuZ2V0VVRDTWludXRlcygpKSxcbiAgICAgIHR3byhkYXRlLmdldFVUQ1NlY29uZHMoKSksXG4gICAgICAnWidcbiAgICBdLmpvaW4oJycpO1xuICB9IGVsc2UgaWYgKHRhZyA9PT0gJ3V0Y3RpbWUnKSB7XG4gICAgc3RyID0gW1xuICAgICAgdHdvKGRhdGUuZ2V0RnVsbFllYXIoKSAlIDEwMCksXG4gICAgICB0d28oZGF0ZS5nZXRVVENNb250aCgpICsgMSksXG4gICAgICB0d28oZGF0ZS5nZXRVVENEYXRlKCkpLFxuICAgICAgdHdvKGRhdGUuZ2V0VVRDSG91cnMoKSksXG4gICAgICB0d28oZGF0ZS5nZXRVVENNaW51dGVzKCkpLFxuICAgICAgdHdvKGRhdGUuZ2V0VVRDU2Vjb25kcygpKSxcbiAgICAgICdaJ1xuICAgIF0uam9pbignJyk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5yZXBvcnRlci5lcnJvcignRW5jb2RpbmcgJyArIHRhZyArICcgdGltZSBpcyBub3Qgc3VwcG9ydGVkIHlldCcpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX2VuY29kZVN0cihzdHIsICdvY3RzdHInKTtcbn07XG5cbkRFUk5vZGUucHJvdG90eXBlLl9lbmNvZGVOdWxsID0gZnVuY3Rpb24gZW5jb2RlTnVsbCgpIHtcbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUVuY29kZXJCdWZmZXIoJycpO1xufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX2VuY29kZUludCA9IGZ1bmN0aW9uIGVuY29kZUludChudW0sIHZhbHVlcykge1xuICBpZiAodHlwZW9mIG51bSA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAoIXZhbHVlcylcbiAgICAgIHJldHVybiB0aGlzLnJlcG9ydGVyLmVycm9yKCdTdHJpbmcgaW50IG9yIGVudW0gZ2l2ZW4sIGJ1dCBubyB2YWx1ZXMgbWFwJyk7XG4gICAgaWYgKCF2YWx1ZXMuaGFzT3duUHJvcGVydHkobnVtKSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVwb3J0ZXIuZXJyb3IoJ1ZhbHVlcyBtYXAgZG9lc25cXCd0IGNvbnRhaW46ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkobnVtKSk7XG4gICAgfVxuICAgIG51bSA9IHZhbHVlc1tudW1dO1xuICB9XG5cbiAgLy8gQmlnbnVtLCBhc3N1bWUgYmlnIGVuZGlhblxuICBpZiAodHlwZW9mIG51bSAhPT0gJ251bWJlcicgJiYgIUJ1ZmZlci5pc0J1ZmZlcihudW0pKSB7XG4gICAgdmFyIG51bUFycmF5ID0gbnVtLnRvQXJyYXkoKTtcbiAgICBpZiAobnVtLnNpZ24gPT09IGZhbHNlICYmIG51bUFycmF5WzBdICYgMHg4MCkge1xuICAgICAgbnVtQXJyYXkudW5zaGlmdCgwKTtcbiAgICB9XG4gICAgbnVtID0gbmV3IEJ1ZmZlcihudW1BcnJheSk7XG4gIH1cblxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKG51bSkpIHtcbiAgICB2YXIgc2l6ZSA9IG51bS5sZW5ndGg7XG4gICAgaWYgKG51bS5sZW5ndGggPT09IDApXG4gICAgICBzaXplKys7XG5cbiAgICB2YXIgb3V0ID0gbmV3IEJ1ZmZlcihzaXplKTtcbiAgICBudW0uY29weShvdXQpO1xuICAgIGlmIChudW0ubGVuZ3RoID09PSAwKVxuICAgICAgb3V0WzBdID0gMFxuICAgIHJldHVybiB0aGlzLl9jcmVhdGVFbmNvZGVyQnVmZmVyKG91dCk7XG4gIH1cblxuICBpZiAobnVtIDwgMHg4MClcbiAgICByZXR1cm4gdGhpcy5fY3JlYXRlRW5jb2RlckJ1ZmZlcihudW0pO1xuXG4gIGlmIChudW0gPCAweDEwMClcbiAgICByZXR1cm4gdGhpcy5fY3JlYXRlRW5jb2RlckJ1ZmZlcihbMCwgbnVtXSk7XG5cbiAgdmFyIHNpemUgPSAxO1xuICBmb3IgKHZhciBpID0gbnVtOyBpID49IDB4MTAwOyBpID4+PSA4KVxuICAgIHNpemUrKztcblxuICB2YXIgb3V0ID0gbmV3IEFycmF5KHNpemUpO1xuICBmb3IgKHZhciBpID0gb3V0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgb3V0W2ldID0gbnVtICYgMHhmZjtcbiAgICBudW0gPj49IDg7XG4gIH1cbiAgaWYob3V0WzBdICYgMHg4MCkge1xuICAgIG91dC51bnNoaWZ0KDApO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUVuY29kZXJCdWZmZXIobmV3IEJ1ZmZlcihvdXQpKTtcbn07XG5cbkRFUk5vZGUucHJvdG90eXBlLl9lbmNvZGVCb29sID0gZnVuY3Rpb24gZW5jb2RlQm9vbCh2YWx1ZSkge1xuICByZXR1cm4gdGhpcy5fY3JlYXRlRW5jb2RlckJ1ZmZlcih2YWx1ZSA/IDB4ZmYgOiAwKTtcbn07XG5cbkRFUk5vZGUucHJvdG90eXBlLl91c2UgPSBmdW5jdGlvbiB1c2UoZW50aXR5LCBvYmopIHtcbiAgaWYgKHR5cGVvZiBlbnRpdHkgPT09ICdmdW5jdGlvbicpXG4gICAgZW50aXR5ID0gZW50aXR5KG9iaik7XG4gIHJldHVybiBlbnRpdHkuX2dldEVuY29kZXIoJ2RlcicpLnRyZWU7XG59O1xuXG5ERVJOb2RlLnByb3RvdHlwZS5fc2tpcERlZmF1bHQgPSBmdW5jdGlvbiBza2lwRGVmYXVsdChkYXRhQnVmZmVyLCByZXBvcnRlciwgcGFyZW50KSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcbiAgdmFyIGk7XG4gIGlmIChzdGF0ZVsnZGVmYXVsdCddID09PSBudWxsKVxuICAgIHJldHVybiBmYWxzZTtcblxuICB2YXIgZGF0YSA9IGRhdGFCdWZmZXIuam9pbigpO1xuICBpZiAoc3RhdGUuZGVmYXVsdEJ1ZmZlciA9PT0gdW5kZWZpbmVkKVxuICAgIHN0YXRlLmRlZmF1bHRCdWZmZXIgPSB0aGlzLl9lbmNvZGVWYWx1ZShzdGF0ZVsnZGVmYXVsdCddLCByZXBvcnRlciwgcGFyZW50KS5qb2luKCk7XG5cbiAgaWYgKGRhdGEubGVuZ3RoICE9PSBzdGF0ZS5kZWZhdWx0QnVmZmVyLmxlbmd0aClcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgZm9yIChpPTA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKVxuICAgIGlmIChkYXRhW2ldICE9PSBzdGF0ZS5kZWZhdWx0QnVmZmVyW2ldKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLy8gVXRpbGl0eSBtZXRob2RzXG5cbmZ1bmN0aW9uIGVuY29kZVRhZyh0YWcsIHByaW1pdGl2ZSwgY2xzLCByZXBvcnRlcikge1xuICB2YXIgcmVzO1xuXG4gIGlmICh0YWcgPT09ICdzZXFvZicpXG4gICAgdGFnID0gJ3NlcSc7XG4gIGVsc2UgaWYgKHRhZyA9PT0gJ3NldG9mJylcbiAgICB0YWcgPSAnc2V0JztcblxuICBpZiAoZGVyLnRhZ0J5TmFtZS5oYXNPd25Qcm9wZXJ0eSh0YWcpKVxuICAgIHJlcyA9IGRlci50YWdCeU5hbWVbdGFnXTtcbiAgZWxzZSBpZiAodHlwZW9mIHRhZyA9PT0gJ251bWJlcicgJiYgKHRhZyB8IDApID09PSB0YWcpXG4gICAgcmVzID0gdGFnO1xuICBlbHNlXG4gICAgcmV0dXJuIHJlcG9ydGVyLmVycm9yKCdVbmtub3duIHRhZzogJyArIHRhZyk7XG5cbiAgaWYgKHJlcyA+PSAweDFmKVxuICAgIHJldHVybiByZXBvcnRlci5lcnJvcignTXVsdGktb2N0ZXQgdGFnIGVuY29kaW5nIHVuc3VwcG9ydGVkJyk7XG5cbiAgaWYgKCFwcmltaXRpdmUpXG4gICAgcmVzIHw9IDB4MjA7XG5cbiAgcmVzIHw9IChkZXIudGFnQ2xhc3NCeU5hbWVbY2xzIHx8ICd1bml2ZXJzYWwnXSA8PCA2KTtcblxuICByZXR1cm4gcmVzO1xufVxuIiwidmFyIGVuY29kZXJzID0gZXhwb3J0cztcblxuZW5jb2RlcnMuZGVyID0gcmVxdWlyZSgnLi9kZXInKTtcbmVuY29kZXJzLnBlbSA9IHJlcXVpcmUoJy4vcGVtJyk7XG4iLCJ2YXIgaW5oZXJpdHMgPSByZXF1aXJlKCd1dGlsJykuaW5oZXJpdHM7XG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuXG52YXIgYXNuMSA9IHJlcXVpcmUoJy4uL2FzbjEnKTtcbnZhciBERVJFbmNvZGVyID0gcmVxdWlyZSgnLi9kZXInKTtcblxuZnVuY3Rpb24gUEVNRW5jb2RlcihlbnRpdHkpIHtcbiAgREVSRW5jb2Rlci5jYWxsKHRoaXMsIGVudGl0eSk7XG4gIHRoaXMuZW5jID0gJ3BlbSc7XG59O1xuaW5oZXJpdHMoUEVNRW5jb2RlciwgREVSRW5jb2Rlcik7XG5tb2R1bGUuZXhwb3J0cyA9IFBFTUVuY29kZXI7XG5cblBFTUVuY29kZXIucHJvdG90eXBlLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShkYXRhLCBvcHRpb25zKSB7XG4gIHZhciBidWYgPSBERVJFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGUuY2FsbCh0aGlzLCBkYXRhKTtcblxuICB2YXIgcCA9IGJ1Zi50b1N0cmluZygnYmFzZTY0Jyk7XG4gIHZhciBvdXQgPSBbICctLS0tLUJFR0lOICcgKyBvcHRpb25zLmxhYmVsICsgJy0tLS0tJyBdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHAubGVuZ3RoOyBpICs9IDY0KVxuICAgIG91dC5wdXNoKHAuc2xpY2UoaSwgaSArIDY0KSk7XG4gIG91dC5wdXNoKCctLS0tLUVORCAnICsgb3B0aW9ucy5sYWJlbCArICctLS0tLScpO1xuICByZXR1cm4gb3V0LmpvaW4oJ1xcbicpO1xufTtcbiIsIid1c2Ugc3RyaWN0J1xuXG52YXIgYXNuMSA9IHJlcXVpcmUoJy4vYXNuMS9hc24xJyk7XG52YXIgQk4gPSByZXF1aXJlKCcuL2FzbjEvYmlnbnVtL2JuJyk7XG5cbnZhciBFQ1ByaXZhdGVLZXlBU04gPSBhc24xLmRlZmluZSgnRUNQcml2YXRlS2V5JywgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXEoKS5vYmooXG4gICAgICAgIHRoaXMua2V5KCd2ZXJzaW9uJykuaW50KCksXG4gICAgICAgIHRoaXMua2V5KCdwcml2YXRlS2V5Jykub2N0c3RyKCksXG4gICAgICAgIHRoaXMua2V5KCdwYXJhbWV0ZXJzJykuZXhwbGljaXQoMCkub2JqaWQoKS5vcHRpb25hbCgpLFxuICAgICAgICB0aGlzLmtleSgncHVibGljS2V5JykuZXhwbGljaXQoMSkuYml0c3RyKCkub3B0aW9uYWwoKVxuICAgIClcbn0pXG5cbnZhciBTdWJqZWN0UHVibGljS2V5SW5mb0FTTiA9IGFzbjEuZGVmaW5lKCdTdWJqZWN0UHVibGljS2V5SW5mbycsIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2VxKCkub2JqKFxuICAgICAgICB0aGlzLmtleSgnYWxnb3JpdGhtJykuc2VxKCkub2JqKFxuICAgICAgICAgICAgdGhpcy5rZXkoXCJpZFwiKS5vYmppZCgpLFxuICAgICAgICAgICAgdGhpcy5rZXkoXCJjdXJ2ZVwiKS5vYmppZCgpXG4gICAgICAgICksXG4gICAgICAgIHRoaXMua2V5KCdwdWInKS5iaXRzdHIoKVxuICAgIClcbn0pXG5cbnZhciBjdXJ2ZXMgPSB7XG4gICAgc2VjcDI1NmsxOiB7XG4gICAgICAgIGN1cnZlUGFyYW1ldGVyczogWzEsIDMsIDEzMiwgMCwgMTBdLFxuICAgICAgICBwcml2YXRlUEVNT3B0aW9uczoge2xhYmVsOiAnRUMgUFJJVkFURSBLRVknfSxcbiAgICAgICAgcHVibGljUEVNT3B0aW9uczoge2xhYmVsOiAnUFVCTElDIEtFWSd9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhc3NlcnQodmFsLCBtc2cpIHtcbiAgICBpZiAoIXZhbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnIHx8ICdBc3NlcnRpb24gZmFpbGVkJylcbiAgICB9XG59XG5cbmZ1bmN0aW9uIEtleUVuY29kZXIob3B0aW9ucykge1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgYXNzZXJ0KGN1cnZlcy5oYXNPd25Qcm9wZXJ0eShvcHRpb25zKSwgJ1Vua25vd24gY3VydmUgJyArIG9wdGlvbnMpO1xuICAgICAgICBvcHRpb25zID0gY3VydmVzW29wdGlvbnNdXG4gICAgfVxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5hbGdvcml0aG1JRCA9IFsxLCAyLCA4NDAsIDEwMDQ1LCAyLCAxXVxufVxuXG5LZXlFbmNvZGVyLkVDUHJpdmF0ZUtleUFTTiA9IEVDUHJpdmF0ZUtleUFTTjtcbktleUVuY29kZXIuU3ViamVjdFB1YmxpY0tleUluZm9BU04gPSBTdWJqZWN0UHVibGljS2V5SW5mb0FTTjtcblxuS2V5RW5jb2Rlci5wcm90b3R5cGUucHJpdmF0ZUtleU9iamVjdCA9IGZ1bmN0aW9uKHJhd1ByaXZhdGVLZXksIHJhd1B1YmxpY0tleSkge1xuICAgIHZhciBwcml2YXRlS2V5T2JqZWN0ID0ge1xuICAgICAgICB2ZXJzaW9uOiBuZXcgQk4oMSksXG4gICAgICAgIHByaXZhdGVLZXk6IG5ldyBCdWZmZXIocmF3UHJpdmF0ZUtleSwgJ2hleCcpLFxuICAgICAgICBwYXJhbWV0ZXJzOiB0aGlzLm9wdGlvbnMuY3VydmVQYXJhbWV0ZXJzLFxuICAgICAgICBwZW1PcHRpb25zOiB7bGFiZWw6XCJFQyBQUklWQVRFIEtFWVwifVxuICAgIH07XG5cbiAgICBpZiAocmF3UHVibGljS2V5KSB7XG4gICAgICAgIHByaXZhdGVLZXlPYmplY3QucHVibGljS2V5ID0ge1xuICAgICAgICAgICAgdW51c2VkOiAwLFxuICAgICAgICAgICAgZGF0YTogbmV3IEJ1ZmZlcihyYXdQdWJsaWNLZXksICdoZXgnKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHByaXZhdGVLZXlPYmplY3Rcbn07XG5cbktleUVuY29kZXIucHJvdG90eXBlLnB1YmxpY0tleU9iamVjdCA9IGZ1bmN0aW9uKHJhd1B1YmxpY0tleSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGFsZ29yaXRobToge1xuICAgICAgICAgICAgaWQ6IHRoaXMuYWxnb3JpdGhtSUQsXG4gICAgICAgICAgICBjdXJ2ZTogdGhpcy5vcHRpb25zLmN1cnZlUGFyYW1ldGVyc1xuICAgICAgICB9LFxuICAgICAgICBwdWI6IHtcbiAgICAgICAgICAgIHVudXNlZDogMCxcbiAgICAgICAgICAgIGRhdGE6IG5ldyBCdWZmZXIocmF3UHVibGljS2V5LCAnaGV4JylcbiAgICAgICAgfSxcbiAgICAgICAgcGVtT3B0aW9uczogeyBsYWJlbCA6XCJQVUJMSUMgS0VZXCJ9XG4gICAgfVxufVxuXG5LZXlFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGVQcml2YXRlID0gZnVuY3Rpb24ocHJpdmF0ZUtleSwgb3JpZ2luYWxGb3JtYXQsIGRlc3RpbmF0aW9uRm9ybWF0KSB7XG4gICAgdmFyIHByaXZhdGVLZXlPYmplY3RcblxuICAgIC8qIFBhcnNlIHRoZSBpbmNvbWluZyBwcml2YXRlIGtleSBhbmQgY29udmVydCBpdCB0byBhIHByaXZhdGUga2V5IG9iamVjdCAqL1xuICAgIGlmIChvcmlnaW5hbEZvcm1hdCA9PT0gJ3JhdycpIHtcbiAgICAgICAgaWYgKCF0eXBlb2YgcHJpdmF0ZUtleSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93ICdwcml2YXRlIGtleSBtdXN0IGJlIGEgc3RyaW5nJ1xuICAgICAgICB9XG4gICAgICAgIHZhciBwcml2YXRlS2V5T2JqZWN0ID0gdGhpcy5vcHRpb25zLmN1cnZlLmtleUZyb21Qcml2YXRlKHByaXZhdGVLZXksICdoZXgnKSxcbiAgICAgICAgICAgIHJhd1B1YmxpY0tleSA9IHByaXZhdGVLZXlPYmplY3QuZ2V0UHVibGljKCdoZXgnKVxuICAgICAgICBwcml2YXRlS2V5T2JqZWN0ID0gdGhpcy5wcml2YXRlS2V5T2JqZWN0KHByaXZhdGVLZXksIHJhd1B1YmxpY0tleSlcbiAgICB9IGVsc2UgaWYgKG9yaWdpbmFsRm9ybWF0ID09PSAnZGVyJykge1xuICAgICAgICBpZiAodHlwZW9mIHByaXZhdGVLZXkgPT09ICdidWZmZXInKSB7XG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByaXZhdGVLZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBwcml2YXRlS2V5ID0gbmV3IEJ1ZmZlcihwcml2YXRlS2V5LCAnaGV4JylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93ICdwcml2YXRlIGtleSBtdXN0IGJlIGEgYnVmZmVyIG9yIGEgc3RyaW5nJ1xuICAgICAgICB9XG4gICAgICAgIHByaXZhdGVLZXlPYmplY3QgPSBFQ1ByaXZhdGVLZXlBU04uZGVjb2RlKHByaXZhdGVLZXksICdkZXInKVxuICAgIH0gZWxzZSBpZiAob3JpZ2luYWxGb3JtYXQgPT09ICdwZW0nKSB7XG4gICAgICAgIGlmICghdHlwZW9mIHByaXZhdGVLZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyAncHJpdmF0ZSBrZXkgbXVzdCBiZSBhIHN0cmluZydcbiAgICAgICAgfVxuICAgICAgICBwcml2YXRlS2V5T2JqZWN0ID0gRUNQcml2YXRlS2V5QVNOLmRlY29kZShwcml2YXRlS2V5LCAncGVtJywgdGhpcy5vcHRpb25zLnByaXZhdGVQRU1PcHRpb25zKVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93ICdpbnZhbGlkIHByaXZhdGUga2V5IGZvcm1hdCdcbiAgICB9XG5cbiAgICAvKiBFeHBvcnQgdGhlIHByaXZhdGUga2V5IG9iamVjdCB0byB0aGUgZGVzaXJlZCBmb3JtYXQgKi9cbiAgICBpZiAoZGVzdGluYXRpb25Gb3JtYXQgPT09ICdyYXcnKSB7XG4gICAgICAgIHJldHVybiBwcml2YXRlS2V5T2JqZWN0LnByaXZhdGVLZXkudG9TdHJpbmcoJ2hleCcpXG4gICAgfSBlbHNlIGlmIChkZXN0aW5hdGlvbkZvcm1hdCA9PT0gJ2RlcicpIHtcbiAgICAgICAgcmV0dXJuIEVDUHJpdmF0ZUtleUFTTi5lbmNvZGUocHJpdmF0ZUtleU9iamVjdCwgJ2RlcicpLnRvU3RyaW5nKCdoZXgnKVxuICAgIH0gZWxzZSBpZiAoZGVzdGluYXRpb25Gb3JtYXQgPT09ICdwZW0nKSB7XG4gICAgICAgIHJldHVybiBFQ1ByaXZhdGVLZXlBU04uZW5jb2RlKHByaXZhdGVLZXlPYmplY3QsICdwZW0nLCB0aGlzLm9wdGlvbnMucHJpdmF0ZVBFTU9wdGlvbnMpXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgJ2ludmFsaWQgZGVzdGluYXRpb24gZm9ybWF0IGZvciBwcml2YXRlIGtleSdcbiAgICB9XG59XG5cbktleUVuY29kZXIucHJvdG90eXBlLmVuY29kZVB1YmxpYyA9IGZ1bmN0aW9uKHB1YmxpY0tleSwgb3JpZ2luYWxGb3JtYXQsIGRlc3RpbmF0aW9uRm9ybWF0KSB7XG4gICAgdmFyIHB1YmxpY0tleU9iamVjdFxuXG4gICAgLyogUGFyc2UgdGhlIGluY29taW5nIHB1YmxpYyBrZXkgYW5kIGNvbnZlcnQgaXQgdG8gYSBwdWJsaWMga2V5IG9iamVjdCAqL1xuICAgIGlmIChvcmlnaW5hbEZvcm1hdCA9PT0gJ3JhdycpIHtcbiAgICAgICAgaWYgKCF0eXBlb2YgcHVibGljS2V5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgJ3B1YmxpYyBrZXkgbXVzdCBiZSBhIHN0cmluZydcbiAgICAgICAgfVxuICAgICAgICBwdWJsaWNLZXlPYmplY3QgPSB0aGlzLnB1YmxpY0tleU9iamVjdChwdWJsaWNLZXkpXG4gICAgfSBlbHNlIGlmIChvcmlnaW5hbEZvcm1hdCA9PT0gJ2RlcicpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwdWJsaWNLZXkgPT09ICdidWZmZXInKSB7XG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHB1YmxpY0tleSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHB1YmxpY0tleSA9IG5ldyBCdWZmZXIocHVibGljS2V5LCAnaGV4JylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93ICdwdWJsaWMga2V5IG11c3QgYmUgYSBidWZmZXIgb3IgYSBzdHJpbmcnXG4gICAgICAgIH1cbiAgICAgICAgcHVibGljS2V5T2JqZWN0ID0gU3ViamVjdFB1YmxpY0tleUluZm9BU04uZGVjb2RlKHB1YmxpY0tleSwgJ2RlcicpXG4gICAgfSBlbHNlIGlmIChvcmlnaW5hbEZvcm1hdCA9PT0gJ3BlbScpIHtcbiAgICAgICAgaWYgKCF0eXBlb2YgcHVibGljS2V5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgJ3B1YmxpYyBrZXkgbXVzdCBiZSBhIHN0cmluZydcbiAgICAgICAgfVxuICAgICAgICBwdWJsaWNLZXlPYmplY3QgPSBTdWJqZWN0UHVibGljS2V5SW5mb0FTTi5kZWNvZGUocHVibGljS2V5LCAncGVtJywgdGhpcy5vcHRpb25zLnB1YmxpY1BFTU9wdGlvbnMpXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgJ2ludmFsaWQgcHVibGljIGtleSBmb3JtYXQnXG4gICAgfVxuXG4gICAgLyogRXhwb3J0IHRoZSBwcml2YXRlIGtleSBvYmplY3QgdG8gdGhlIGRlc2lyZWQgZm9ybWF0ICovXG4gICAgaWYgKGRlc3RpbmF0aW9uRm9ybWF0ID09PSAncmF3Jykge1xuICAgICAgICByZXR1cm4gcHVibGljS2V5T2JqZWN0LnB1Yi5kYXRhLnRvU3RyaW5nKCdoZXgnKVxuICAgIH0gZWxzZSBpZiAoZGVzdGluYXRpb25Gb3JtYXQgPT09ICdkZXInKSB7XG4gICAgICAgIHJldHVybiBTdWJqZWN0UHVibGljS2V5SW5mb0FTTi5lbmNvZGUocHVibGljS2V5T2JqZWN0LCAnZGVyJykudG9TdHJpbmcoJ2hleCcpXG4gICAgfSBlbHNlIGlmIChkZXN0aW5hdGlvbkZvcm1hdCA9PT0gJ3BlbScpIHtcbiAgICAgICAgcmV0dXJuIFN1YmplY3RQdWJsaWNLZXlJbmZvQVNOLmVuY29kZShwdWJsaWNLZXlPYmplY3QsICdwZW0nLCB0aGlzLm9wdGlvbnMucHVibGljUEVNT3B0aW9ucylcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyAnaW52YWxpZCBkZXN0aW5hdGlvbiBmb3JtYXQgZm9yIHB1YmxpYyBrZXknXG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEtleUVuY29kZXI7IiwiY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuY29uc3QgeWF6bCA9IHJlcXVpcmUoXCJ5YXpsXCIpO1xuY29uc3QgeWF1emwgPSByZXF1aXJlKFwieWF1emxcIik7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IER1cGxleFN0cmVhbSA9IHJlcXVpcmUoXCIuL3V0aWxzL0R1cGxleFN0cmVhbVwiKTtcbmNvbnN0IFBhc3NUaHJvdWdoU3RyZWFtID0gcmVxdWlyZShcIi4vdXRpbHMvUGFzc1Rocm91Z2hTdHJlYW1cIik7XG5jb25zdCBpc1N0cmVhbSA9IHJlcXVpcmUoXCIuL3V0aWxzL2lzU3RyZWFtXCIpO1xuXG5jb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKTtcblxuY29uc3QgY291bnRGaWxlcyA9IHJlcXVpcmUoJy4vdXRpbHMvY291bnRGaWxlcycpO1xuXG5mdW5jdGlvbiBQc2tBcmNoaXZlcigpIHtcblxuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgY29uc3QgZXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgICB0aGlzLm9uID0gZXZlbnQub247XG4gICAgdGhpcy5vZmYgPSBldmVudC5vZmY7XG4gICAgdGhpcy5lbWl0ID0gZXZlbnQuZW1pdDtcblxuICAgIHRoaXMuemlwU3RyZWFtID0gZnVuY3Rpb24gKGlucHV0UGF0aCwgb3V0cHV0LCBjYWxsYmFjaykge1xuICAgICAgICBsZXQgZXh0ID0gXCJcIjtcbiAgICAgICAgY29uc3QgemlwRmlsZSA9IG5ldyB5YXpsLlppcEZpbGUoKTtcbiAgICAgICAgY29uc3QgcHRTdHJlYW0gPSBuZXcgUGFzc1Rocm91Z2hTdHJlYW0oKTtcblxuICAgICAgICBjb3VudEZpbGVzLmNvbXB1dGVTaXplKGlucHV0UGF0aCwgKGVyciwgdG90YWxTaXplKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9fYWRkVG9BcmNoaXZlUmVjdXJzaXZlbHkoemlwRmlsZSwgaW5wdXRQYXRoLCBcIlwiLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB6aXBGaWxlLmVuZCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lID0gcGF0aC5iYXNlbmFtZShpbnB1dFBhdGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNwbGl0RmlsZW5hbWUgPSBmaWxlbmFtZS5zcGxpdChcIi5cIik7XG4gICAgICAgICAgICAgICAgaWYgKHNwbGl0RmlsZW5hbWUubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ID0gXCIuXCIgKyBzcGxpdEZpbGVuYW1lW3NwbGl0RmlsZW5hbWUubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IG15U3RyZWFtID0gemlwRmlsZS5vdXRwdXRTdHJlYW0ucGlwZShwdFN0cmVhbSk7XG5cbiAgICAgICAgICAgICAgICBsZXQgcHJvZ3Jlc3NMZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgIGxldCB0b3RhbExlbmd0aCA9IDA7XG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUT0RPIHJldmlldyB0aGlzXG4gICAgICAgICAgICAgICAgICogSW4gYnJvd3NlciwgcGlwaW5nIHdpbGwgYmxvY2sgdGhlIGV2ZW50IGxvb3AgYW5kIHRoZSBzdGFjayBxdWV1ZSBpcyBub3QgY2FsbGVkLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIG15U3RyZWFtLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NMZW5ndGggKz0gY2h1bmsubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB0b3RhbExlbmd0aCArPSBjaHVuay5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb2dyZXNzTGVuZ3RoID4gMzAwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBteVN0cmVhbS5wYXVzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NMZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXlTdHJlYW0ucmVzdW1lKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbWl0UHJvZ3Jlc3ModG90YWxTaXplLCB0b3RhbExlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbXlTdHJlYW0ub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZW1pdFByb2dyZXNzKHRvdGFsU2l6ZSwgdG90YWxTaXplKTtcbiAgICAgICAgICAgICAgICAgICAgZW1pdFRvdGFsU2l6ZSh0b3RhbFNpemUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChpc1N0cmVhbS5pc1dyaXRhYmxlKG91dHB1dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgbXlTdHJlYW0ucGlwZShvdXRwdXQpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvdXRwdXQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICAgICBmcy5ta2RpcihvdXRwdXQsIHtyZWN1cnNpdmU6IHRydWV9LCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXN0aW5hdGlvblBhdGggPSBwYXRoLmpvaW4ob3V0cHV0LCBwYXRoLmJhc2VuYW1lKGlucHV0UGF0aCwgZXh0KSArIFwiLnppcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG15U3RyZWFtLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZGVzdGluYXRpb25QYXRoKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBfX2FkZFRvQXJjaGl2ZVJlY3Vyc2l2ZWx5KHppcEZpbGUsIGlucHV0UGF0aCwgcm9vdCA9ICcnLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHJvb3QgPSByb290IHx8ICcnO1xuICAgICAgICAgICAgICAgIGZzLnN0YXQoaW5wdXRQYXRoLCAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHppcEZpbGUuYWRkRmlsZShpbnB1dFBhdGgsIHBhdGguam9pbihyb290LCBwYXRoLmJhc2VuYW1lKGlucHV0UGF0aCkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcy5yZWFkZGlyKGlucHV0UGF0aCwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmX2xlbmd0aCA9IGZpbGVzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZl9hZGRfaW5kZXggPSAwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hlY2tTdGF0dXMgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmX2xlbmd0aCA9PT0gZl9hZGRfaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNoZWNrU3RhdHVzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXMuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBQYXRoID0gcGF0aC5qb2luKGlucHV0UGF0aCwgZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfX2FkZFRvQXJjaGl2ZVJlY3Vyc2l2ZWx5KHppcEZpbGUsIHRlbXBQYXRoLCBwYXRoLmpvaW4ocm9vdCwgcGF0aC5iYXNlbmFtZShpbnB1dFBhdGgpKSwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZfYWRkX2luZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgIH07XG5cbiAgICB0aGlzLnVuemlwU3RyZWFtID0gZnVuY3Rpb24gKGlucHV0LCBvdXRwdXRQYXRoLCBjYWxsYmFjaykge1xuXG4gICAgICAgIGxldCBzaXplID0gMDtcblxuICAgICAgICBmcy5zdGF0KGlucHV0LCAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgdG90YWxTaXplID0gc3RhdHMuc2l6ZTtcblxuXG4gICAgICAgICAgICB5YXV6bC5vcGVuKGlucHV0LCB7bGF6eUVudHJpZXM6IHRydWV9LCAoZXJyLCB6aXBGaWxlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBsZXQgcHJvZ3Jlc3NMZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgIGxldCB0b3RhbExlbmd0aCA9IDA7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlTmFtZXMgPSBbXTtcbiAgICAgICAgICAgICAgICB6aXBGaWxlLnJlYWRFbnRyeSgpO1xuICAgICAgICAgICAgICAgIHppcEZpbGUub25jZShcImVuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGVtaXRQcm9ncmVzcyh0b3RhbFNpemUsIHRvdGFsU2l6ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGZpbGVOYW1lcyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgemlwRmlsZS5vbihcImVudHJ5XCIsIChlbnRyeSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW50cnkuZmlsZU5hbWUuZW5kc1dpdGgocGF0aC5zZXApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB6aXBGaWxlLnJlYWRFbnRyeSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZvbGRlciA9IHBhdGguZGlybmFtZShlbnRyeS5maWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcy5ta2RpcihwYXRoLmpvaW4ob3V0cHV0UGF0aCwgZm9sZGVyKSwge3JlY3Vyc2l2ZTogdHJ1ZX0sICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB6aXBGaWxlLm9wZW5SZWFkU3RyZWFtKGVudHJ5LCAoZXJyLCByZWFkU3RyZWFtKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIFRPRE8gcmV2aWV3IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogSW4gYnJvd3NlciwgcGlwaW5nIHdpbGwgYmxvY2sgdGhlIGV2ZW50IGxvb3AgYW5kIHRoZSBzdGFjayBxdWV1ZSBpcyBub3QgY2FsbGVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkU3RyZWFtLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzTGVuZ3RoICs9IGNodW5rLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsTGVuZ3RoICs9IGNodW5rLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb2dyZXNzTGVuZ3RoID4gMzAwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZFN0cmVhbS5wYXVzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzTGVuZ3RoID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZFN0cmVhbS5yZXN1bWUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAzMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW1pdFByb2dyZXNzKHRvdGFsU2l6ZSwgdG90YWxMZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZFN0cmVhbS5vbihcImVuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6aXBGaWxlLnJlYWRFbnRyeSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHRTdHJlYW0gPSBuZXcgUGFzc1Rocm91Z2hTdHJlYW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZpbGVOYW1lID0gcGF0aC5qb2luKG91dHB1dFBhdGgsIGVudHJ5LmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZvbGRlciA9IHBhdGguZGlybmFtZShmaWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBTdHJlYW0gPSByZWFkU3RyZWFtLnBpcGUocHRTdHJlYW0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLm1rZGlyKGZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZSArPSBwdFN0cmVhbS5nZXRTaXplKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgb3V0cHV0ID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZU5hbWVzLnB1c2goZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcFN0cmVhbS5waXBlKG91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxuICAgIHRoaXMuemlwSW5NZW1vcnkgPSBmdW5jdGlvbiAoaW5wdXRPYmosIGRlcHRoLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCB6aXBGaWxlID0gbmV3IHlhemwuWmlwRmlsZSgpO1xuICAgICAgICBjb25zdCBkcyA9IG5ldyBEdXBsZXhTdHJlYW0oKTtcbiAgICAgICAgemlwUmVjdXJzaXZlbHkoemlwRmlsZSwgaW5wdXRPYmosIFwiXCIsIGRlcHRoLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB6aXBGaWxlLmVuZCgpO1xuICAgICAgICAgICAgbGV0IGJ1ZmZlciA9IEJ1ZmZlci5hbGxvYygwKTtcbiAgICAgICAgICAgIGRzLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICAgICAgYnVmZmVyID0gQnVmZmVyLmNvbmNhdChbYnVmZmVyLCBjaHVua10pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHppcEZpbGUub3V0cHV0U3RyZWFtLnBpcGUoZHMpLm9uKFwiZmluaXNoXCIsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBidWZmZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfTtcblxuICAgIHRoaXMudW56aXBJbk1lbW9yeSA9IGZ1bmN0aW9uIChpbnB1dFppcCwgY2FsbGJhY2spIHtcblxuICAgICAgICBmdW5jdGlvbiB1bnppcElucHV0KHppcEZpbGUpIHtcbiAgICAgICAgICAgIHppcEZpbGUucmVhZEVudHJ5KCk7XG4gICAgICAgICAgICBjb25zdCBvYmogPSB7fTtcbiAgICAgICAgICAgIHppcEZpbGUub25jZShcImVuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgb2JqKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB6aXBGaWxlLm9uKFwiZW50cnlcIiwgKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICAgICAgemlwRmlsZS5vcGVuUmVhZFN0cmVhbShlbnRyeSwgKGVyciwgcmVhZFN0cmVhbSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkcyA9IG5ldyBEdXBsZXhTdHJlYW0oKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0ciA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZWFkU3RyZWFtLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHppcEZpbGUucmVhZEVudHJ5KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBkcy5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gY2h1bmsudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVhZFN0cmVhbS5waXBlKGRzKS5vbihcImZpbmlzaFwiLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcGxpdEVudHJ5ID0gZW50cnkuZmlsZU5hbWUuc3BsaXQoXCIvXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZSA9IHNwbGl0RW50cnkucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRQcm9wc1JlY3Vyc2l2ZWx5KG9iaiwgc3BsaXRFbnRyeSwgdHlwZSwgbmV3IEJ1ZmZlcihzdHIpKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKGlucHV0WmlwKSkge1xuICAgICAgICAgICAgeWF1emwuZnJvbUJ1ZmZlcihpbnB1dFppcCwge2xhenlFbnRyaWVzOiB0cnVlfSwgKGVyciwgemlwRmlsZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHVuemlwSW5wdXQoemlwRmlsZSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImlucHV0IHNob3VsZCBiZSBhIGJ1ZmZlclwiKSk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBmdW5jdGlvbiB6aXBSZWN1cnNpdmVseSh6aXBGaWxlLCBvYmosIHJvb3QsIGRlcHRoLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoZGVwdGggPT09IDApIHtcbiAgICAgICAgICAgIHppcEZpbGUuYWRkQnVmZmVyKG5ldyBCdWZmZXIoSlNPTi5zdHJpbmdpZnkob2JqKSksIHJvb3QgKyBcIi9zdHJpbmdpZnlcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHppcEZpbGUuYWRkQnVmZmVyKEJ1ZmZlci5hbGxvYygwKSwgcm9vdCArIFwiL3VuZGVmaW5lZFwiKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygb2JqID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgemlwRmlsZS5hZGRCdWZmZXIobmV3IEJ1ZmZlcihvYmoudG9TdHJpbmcoKSksIHJvb3QgKyBcIi9udW1iZXJcIik7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHppcEZpbGUuYWRkQnVmZmVyKG5ldyBCdWZmZXIob2JqKSwgcm9vdCArIFwiL3N0cmluZ1wiKVxuICAgICAgICB9IGVsc2UgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgemlwRmlsZS5hZGRCdWZmZXIoQnVmZmVyLmFsbG9jKDApLCByb290ICsgXCIvbnVsbFwiKTtcbiAgICAgICAgfSBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqKSkge1xuICAgICAgICAgICAgemlwRmlsZS5hZGRCdWZmZXIob2JqLCByb290ICsgXCIvYnVmZmVyXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyZWFtLmlzUmVhZGFibGUob2JqKSkge1xuICAgICAgICAgICAgemlwRmlsZS5hZGRSZWFkU3RyZWFtKG9iaiwgcm9vdCArIFwiL3N0cmVhbVwiKTtcbiAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iai5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgemlwRmlsZS5hZGRCdWZmZXIoQnVmZmVyLmFsbG9jKDApLCByb290ICsgXCIvYXJyYXlcIilcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB6aXBSZWN1cnNpdmVseSh6aXBGaWxlLCBvYmpbaV0sIHJvb3QgKyBcIi9hcnJheS9cIiArIGksIGRlcHRoLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChvYmogJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGxldCBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiBvYmouY29uc3RydWN0b3IgPT09IE9iamVjdCkge1xuICAgICAgICAgICAgICAgIHppcEZpbGUuYWRkQnVmZmVyKEJ1ZmZlci5hbGxvYygwKSwgcm9vdCArIFwiL29iamVjdFwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZW5jb2RlZE9iaiA9IHt9O1xuICAgICAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKG9iaikuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGVuY29kZWRPYmpbZW5jb2RlVVJJQ29tcG9uZW50KGtleSldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgb2JqID0gZW5jb2RlZE9iajtcbiAgICAgICAgICAgICAgICBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICAgICAgICAgICAgICBrZXlzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVudHJ5TmFtZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJvb3QgPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudHJ5TmFtZSA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudHJ5TmFtZSA9IHJvb3QgKyBcIi9cIiArIGtleTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB6aXBSZWN1cnNpdmVseSh6aXBGaWxlLCBvYmpba2V5XSwgZW50cnlOYW1lLCBkZXB0aCAtIDEsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nob3VsZCBuZXZlciByZWFjaCB0aGlzJyk7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkUHJvcHNSZWN1cnNpdmVseShvYmosIHNwbGl0TmFtZSwgdHlwZSwgZGF0YSkge1xuICAgICAgICBpZiAoc3BsaXROYW1lLmxlbmd0aCA+PSAxKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wID0gZGVjb2RlVVJJQ29tcG9uZW50KHNwbGl0TmFtZS5zaGlmdCgpKTtcblxuICAgICAgICAgICAgaWYgKHNwbGl0TmFtZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndW5kZWZpbmVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdudWxsJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IHBhcnNlSW50KGRhdGEudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IGRhdGEudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHJlYW0nOlxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqW3Byb3BdID0gYnVmZmVyVG9TdHJlYW0oZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqW3Byb3BdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZ2lmeSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBvYmpbcHJvcF0gPSBKU09OLnBhcnNlKGRhdGEudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU2hvdWxkIG5ldmVyIHJlYWNoIHRoaXMnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChzcGxpdE5hbWVbMF0gPT09ICdhcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNwbGl0TmFtZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRQcm9wc1JlY3Vyc2l2ZWx5KG9ialtwcm9wXSwgc3BsaXROYW1lLCB0eXBlLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JqW3Byb3BdID0ge307XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYWRkUHJvcHNSZWN1cnNpdmVseShvYmpbcHJvcF0sIHNwbGl0TmFtZSwgdHlwZSwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBidWZmZXJUb1N0cmVhbShidWZmZXIpIHtcbiAgICAgICAgbGV0IHN0cmVhbSA9IG5ldyByZXF1aXJlKCdzdHJlYW0nKS5SZWFkYWJsZSgpO1xuICAgICAgICBzdHJlYW0ucHVzaChidWZmZXIpO1xuICAgICAgICBzdHJlYW0ucHVzaChudWxsKTtcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlbWl0UHJvZ3Jlc3ModG90YWwsIHByb2Nlc3NlZCkge1xuXG5cbiAgICAgICAgaWYgKHByb2Nlc3NlZCA+IHRvdGFsKSB7XG4gICAgICAgICAgICBwcm9jZXNzZWQgPSB0b3RhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gKDEwMCAqIHByb2Nlc3NlZCkgLyB0b3RhbDtcbiAgICAgICAgc2VsZi5lbWl0KCdwcm9ncmVzcycsIHByb2dyZXNzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlbWl0VG90YWxTaXplKHRvdGFsKSB7XG4gICAgICAgIHNlbGYuZW1pdCgndG90YWwnLCB0b3RhbCk7XG4gICAgfVxuXG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQc2tBcmNoaXZlcjsiLCJjb25zdCBzdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKTtcbmNvbnN0IHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5cbmNvbnN0IER1cGxleCA9IHN0cmVhbS5EdXBsZXg7XG5cbmZ1bmN0aW9uIER1cGxleFN0cmVhbShvcHRpb25zKSB7XG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBEdXBsZXhTdHJlYW0pKSB7XG5cdFx0cmV0dXJuIG5ldyBEdXBsZXhTdHJlYW0ob3B0aW9ucyk7XG5cdH1cblx0RHVwbGV4LmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG51dGlsLmluaGVyaXRzKER1cGxleFN0cmVhbSwgRHVwbGV4KTtcblxuRHVwbGV4U3RyZWFtLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbiAoY2h1bmssIGVuYywgY2IpIHtcblx0dGhpcy5wdXNoKGNodW5rKTtcblx0Y2IoKTtcbn07XG5cblxuRHVwbGV4U3RyZWFtLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uIChuKSB7XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRHVwbGV4U3RyZWFtOyIsImNvbnN0IHN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xuY29uc3QgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcblxuY29uc3QgUGFzc1Rocm91Z2ggPSBzdHJlYW0uUGFzc1Rocm91Z2g7XG5cbmZ1bmN0aW9uIFBhc3NUaHJvdWdoU3RyZWFtKG9wdGlvbnMpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUGFzc1Rocm91Z2hTdHJlYW0pKSB7XG4gICAgICAgIHJldHVybiBuZXcgUGFzc1Rocm91Z2hTdHJlYW0ob3B0aW9ucyk7XG4gICAgfVxuICAgIFBhc3NUaHJvdWdoLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgICBsZXQgc2l6ZSA9IDA7XG5cbiAgICB0aGlzLmFkZFRvU2l6ZSA9IGZ1bmN0aW9uIChhbW91bnQpIHtcbiAgICAgICAgc2l6ZSArPSBhbW91bnQ7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0U2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgfVxufVxuXG51dGlsLmluaGVyaXRzKFBhc3NUaHJvdWdoU3RyZWFtLCBQYXNzVGhyb3VnaCk7XG5cblBhc3NUaHJvdWdoU3RyZWFtLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbiAoY2h1bmssIGVuYywgY2IpIHtcbiAgICB0aGlzLmFkZFRvU2l6ZShjaHVuay5sZW5ndGgpO1xuICAgIHRoaXMucHVzaChjaHVuayk7XG4gICAgY2IoKTtcbn07XG5cblxuUGFzc1Rocm91Z2hTdHJlYW0ucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24gKG4pIHtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYXNzVGhyb3VnaFN0cmVhbTsiLCJjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuY29uc3QgeWF1emwgPSByZXF1aXJlKCd5YXV6bCcpO1xuXG5mdW5jdGlvbiBjb3VudEZpbGVzKGlucHV0UGF0aCwgY2FsbGJhY2spIHtcbiAgICBsZXQgdG90YWwgPSAwO1xuXG4gICAgZnMuc3RhdChpbnB1dFBhdGgsIChlcnIsIHN0YXRzKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sodW5kZWZpbmVkLCAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZzLnJlYWRkaXIoaW5wdXRQYXRoLCAoZXJyLCBmaWxlcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIHRvdGFsID0gZmlsZXMubGVuZ3RoO1xuICAgICAgICAgICAgbGV0IGNvdW50ID0gZmlsZXMubGVuZ3RoO1xuXG4gICAgICAgICAgICBpZiAodG90YWwgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sodW5kZWZpbmVkLCAwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZmlsZXMuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgICAgICAgICAgICBmcy5zdGF0KHBhdGguam9pbihpbnB1dFBhdGgsIGZpbGUpLCAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAtLXRvdGFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgY291bnRGaWxlcyhwYXRoLmpvaW4oaW5wdXRQYXRoLCBmaWxlKSwgKGVyciwgZmlsZXNOdW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsICs9IGZpbGVzTnVtYmVyO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoLS1jb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHRvdGFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLXRvdGFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoLS1jb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdG90YWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gY291bnRaaXBFbnRyaWVzKGlucHV0UGF0aCwgY2FsbGJhY2spIHtcbiAgICBsZXQgcHJvY2Vzc2VkID0gMDtcblxuICAgIHlhdXpsLm9wZW4oaW5wdXRQYXRoLCB7bGF6eUVudHJpZXM6IHRydWV9LCAoZXJyLCB6aXBGaWxlKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgemlwRmlsZS5yZWFkRW50cnkoKTtcbiAgICAgICAgemlwRmlsZS5vbmNlKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHByb2Nlc3NlZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHppcEZpbGUub24oXCJlbnRyeVwiLCAoZW50cnkpID0+IHtcbiAgICAgICAgICAgICsrcHJvY2Vzc2VkO1xuXG4gICAgICAgICAgICB6aXBGaWxlLnJlYWRFbnRyeSgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gY29tcHV0ZVNpemUoaW5wdXRQYXRoLCBjYWxsYmFjaykge1xuICAgIGxldCB0b3RhbFNpemUgPSAwO1xuICAgIGZzLnN0YXQoaW5wdXRQYXRoLCAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHVuZGVmaW5lZCwgc3RhdHMuc2l6ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmcy5yZWFkZGlyKGlucHV0UGF0aCwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICBsZXQgY291bnQgPSBmaWxlcy5sZW5ndGg7XG5cbiAgICAgICAgICAgIGlmIChjb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayh1bmRlZmluZWQsIDApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmaWxlcy5mb3JFYWNoKGZpbGUgPT4ge1xuICAgICAgICAgICAgICAgIGZzLnN0YXQocGF0aC5qb2luKGlucHV0UGF0aCwgZmlsZSksIChlcnIsIHN0YXRzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXB1dGVTaXplKHBhdGguam9pbihpbnB1dFBhdGgsIGZpbGUpLCAoZXJyLCBmaWxlc1NpemUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU2l6ZSArPSBmaWxlc1NpemU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoLS1jb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHRvdGFsU2l6ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU2l6ZSArPSBzdGF0cy5zaXplO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoLS1jb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdG90YWxTaXplKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNvdW50RmlsZXMsXG4gICAgY291bnRaaXBFbnRyaWVzLFxuICAgIGNvbXB1dGVTaXplXG59O1xuIiwiY29uc3QgY3J5cHRvID0gcmVxdWlyZSgnY3J5cHRvJyk7XG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCBQc2tBcmNoaXZlciA9IHJlcXVpcmUoXCIuLi9wc2stYXJjaGl2ZXJcIik7XG5jb25zdCBhbGdvcml0aG0gPSAnYWVzLTI1Ni1nY20nO1xuXG5cbmNvbnN0IGl0ZXJhdGlvbnNfbnVtYmVyID0gMTAwMDtcblxuZnVuY3Rpb24gZW5jb2RlKGJ1ZmZlcikge1xuXHRyZXR1cm4gYnVmZmVyLnRvU3RyaW5nKCdiYXNlNjQnKVxuXHRcdC5yZXBsYWNlKC9cXCsvZywgJycpXG5cdFx0LnJlcGxhY2UoL1xcLy9nLCAnJylcblx0XHQucmVwbGFjZSgvPSskLywgJycpO1xufVxuXG5mdW5jdGlvbiBkZWxldGVSZWN1cnNpdmVseShpbnB1dFBhdGgsIGNhbGxiYWNrKSB7XG5cblx0ZnMuc3RhdChpbnB1dFBhdGgsIGZ1bmN0aW9uIChlcnIsIHN0YXRzKSB7XG5cdFx0aWYgKGVycikge1xuXHRcdFx0Y2FsbGJhY2soZXJyLCBzdGF0cyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuXHRcdFx0ZnMudW5saW5rKGlucHV0UGF0aCwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZXJyLCBudWxsKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhudWxsLCB0cnVlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG5cdFx0XHRmcy5yZWFkZGlyKGlucHV0UGF0aCwgZnVuY3Rpb24gKGVyciwgZmlsZXMpIHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdGNhbGxiYWNrKGVyciwgbnVsbCk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IGZfbGVuZ3RoID0gZmlsZXMubGVuZ3RoO1xuXHRcdFx0XHRsZXQgZl9kZWxldGVfaW5kZXggPSAwO1xuXG5cdFx0XHRcdGNvbnN0IGNoZWNrU3RhdHVzID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGlmIChmX2xlbmd0aCA9PT0gZl9kZWxldGVfaW5kZXgpIHtcblx0XHRcdFx0XHRcdGZzLnJtZGlyKGlucHV0UGF0aCwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y2FsbGJhY2soZXJyLCBudWxsKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRjYWxsYmFjayhudWxsLCB0cnVlKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRpZiAoIWNoZWNrU3RhdHVzKCkpIHtcblx0XHRcdFx0XHRmaWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChmaWxlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB0ZW1wUGF0aCA9IHBhdGguam9pbihpbnB1dFBhdGgsIGZpbGUpO1xuXHRcdFx0XHRcdFx0ZGVsZXRlUmVjdXJzaXZlbHkodGVtcFBhdGgsIGZ1bmN0aW9uIHJlbW92ZVJlY3Vyc2l2ZUNCKGVyciwgc3RhdHVzKSB7XG5cdFx0XHRcdFx0XHRcdGlmICghZXJyKSB7XG5cdFx0XHRcdFx0XHRcdFx0Zl9kZWxldGVfaW5kZXgrKztcblx0XHRcdFx0XHRcdFx0XHRjaGVja1N0YXR1cygpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdGNhbGxiYWNrKGVyciwgbnVsbCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0pO1xufVxuXG5cblxuXG5cbmZ1bmN0aW9uIGNyZWF0ZVBza0hhc2goZGF0YSkge1xuXHRjb25zdCBwc2tIYXNoID0gbmV3IFBza0hhc2goKTtcblx0cHNrSGFzaC51cGRhdGUoZGF0YSk7XG5cdHJldHVybiBwc2tIYXNoLmRpZ2VzdCgpO1xufVxuXG5mdW5jdGlvbiBQc2tIYXNoKCkge1xuXHRjb25zdCBzaGE1MTIgPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhNTEyJyk7XG5cdGNvbnN0IHNoYTI1NiA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKTtcblxuXHRmdW5jdGlvbiB1cGRhdGUoZGF0YSkge1xuXHRcdHNoYTUxMi51cGRhdGUoZGF0YSk7XG5cdH1cblxuXHRmdW5jdGlvbiBkaWdlc3QoKSB7XG5cdFx0c2hhMjU2LnVwZGF0ZShzaGE1MTIuZGlnZXN0KCkpO1xuXHRcdHJldHVybiBzaGEyNTYuZGlnZXN0KCk7XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdHVwZGF0ZSxcblx0XHRkaWdlc3Rcblx0fVxufVxuXG5cbmZ1bmN0aW9uIGdlbmVyYXRlU2FsdChpbnB1dERhdGEsIHNhbHRMZW4pIHtcblx0Y29uc3QgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGE1MTInKTtcblx0aGFzaC51cGRhdGUoaW5wdXREYXRhKTtcblx0Y29uc3QgZGlnZXN0ID0gQnVmZmVyLmZyb20oaGFzaC5kaWdlc3QoJ2hleCcpLCAnYmluYXJ5Jyk7XG5cblx0cmV0dXJuIGRpZ2VzdC5zbGljZSgwLCBzYWx0TGVuKTtcbn1cblxuZnVuY3Rpb24gZW5jcnlwdChkYXRhLCBwYXNzd29yZCkge1xuXHRjb25zdCBrZXlTYWx0ID0gY3J5cHRvLnJhbmRvbUJ5dGVzKDMyKTtcblx0Y29uc3Qga2V5ID0gY3J5cHRvLnBia2RmMlN5bmMocGFzc3dvcmQsIGtleVNhbHQsIGl0ZXJhdGlvbnNfbnVtYmVyLCAzMiwgJ3NoYTUxMicpO1xuXG5cdGNvbnN0IGFhZFNhbHQgPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpO1xuXHRjb25zdCBhYWQgPSBjcnlwdG8ucGJrZGYyU3luYyhwYXNzd29yZCwgYWFkU2FsdCwgaXRlcmF0aW9uc19udW1iZXIsIDMyLCAnc2hhNTEyJyk7XG5cblx0Y29uc3Qgc2FsdCA9IEJ1ZmZlci5jb25jYXQoW2tleVNhbHQsIGFhZFNhbHRdKTtcblx0Y29uc3QgaXYgPSBjcnlwdG8ucGJrZGYyU3luYyhwYXNzd29yZCwgc2FsdCwgaXRlcmF0aW9uc19udW1iZXIsIDEyLCAnc2hhNTEyJyk7XG5cblx0Y29uc3QgY2lwaGVyID0gY3J5cHRvLmNyZWF0ZUNpcGhlcml2KGFsZ29yaXRobSwga2V5LCBpdik7XG5cdGNpcGhlci5zZXRBQUQoYWFkKTtcblx0bGV0IGVuY3J5cHRlZFRleHQgPSBjaXBoZXIudXBkYXRlKGRhdGEsICdiaW5hcnknKTtcblx0Y29uc3QgZmluYWwgPSBCdWZmZXIuZnJvbShjaXBoZXIuZmluYWwoJ2JpbmFyeScpLCAnYmluYXJ5Jyk7XG5cdGNvbnN0IHRhZyA9IGNpcGhlci5nZXRBdXRoVGFnKCk7XG5cblx0ZW5jcnlwdGVkVGV4dCA9IEJ1ZmZlci5jb25jYXQoW2VuY3J5cHRlZFRleHQsIGZpbmFsXSk7XG5cblx0cmV0dXJuIEJ1ZmZlci5jb25jYXQoW3NhbHQsIGVuY3J5cHRlZFRleHQsIHRhZ10pO1xufVxuXG5mdW5jdGlvbiBkZWNyeXB0KGVuY3J5cHRlZERhdGEsIHBhc3N3b3JkKSB7XG5cdGNvbnN0IHNhbHQgPSBlbmNyeXB0ZWREYXRhLnNsaWNlKDAsIDY0KTtcblx0Y29uc3Qga2V5U2FsdCA9IHNhbHQuc2xpY2UoMCwgMzIpO1xuXHRjb25zdCBhYWRTYWx0ID0gc2FsdC5zbGljZSgtMzIpO1xuXG5cdGNvbnN0IGl2ID0gY3J5cHRvLnBia2RmMlN5bmMocGFzc3dvcmQsIHNhbHQsIGl0ZXJhdGlvbnNfbnVtYmVyLCAxMiwgJ3NoYTUxMicpO1xuXHRjb25zdCBrZXkgPSBjcnlwdG8ucGJrZGYyU3luYyhwYXNzd29yZCwga2V5U2FsdCwgaXRlcmF0aW9uc19udW1iZXIsIDMyLCAnc2hhNTEyJyk7XG5cdGNvbnN0IGFhZCA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBhYWRTYWx0LCBpdGVyYXRpb25zX251bWJlciwgMzIsICdzaGE1MTInKTtcblxuXHRjb25zdCBjaXBoZXJ0ZXh0ID0gZW5jcnlwdGVkRGF0YS5zbGljZSg2NCwgZW5jcnlwdGVkRGF0YS5sZW5ndGggLSAxNik7XG5cdGNvbnN0IHRhZyA9IGVuY3J5cHRlZERhdGEuc2xpY2UoLTE2KTtcblxuXHRjb25zdCBkZWNpcGhlciA9IGNyeXB0by5jcmVhdGVEZWNpcGhlcml2KGFsZ29yaXRobSwga2V5LCBpdik7XG5cdGRlY2lwaGVyLnNldEF1dGhUYWcodGFnKTtcblx0ZGVjaXBoZXIuc2V0QUFEKGFhZCk7XG5cblx0bGV0IHBsYWludGV4dCA9IEJ1ZmZlci5mcm9tKGRlY2lwaGVyLnVwZGF0ZShjaXBoZXJ0ZXh0LCAnYmluYXJ5JyksICdiaW5hcnknKTtcblx0Y29uc3QgZmluYWwgPSBCdWZmZXIuZnJvbShkZWNpcGhlci5maW5hbCgnYmluYXJ5JyksICdiaW5hcnknKTtcblx0cGxhaW50ZXh0ID0gQnVmZmVyLmNvbmNhdChbcGxhaW50ZXh0LCBmaW5hbF0pO1xuXHRyZXR1cm4gcGxhaW50ZXh0O1xufVxuXG5mdW5jdGlvbiBlbmNyeXB0T2JqZWN0SW5NZW1vcnkoaW5wdXRPYmosIHBhc3N3b3JkLCBkZXB0aCwgY2FsbGJhY2spIHtcblx0Y29uc3QgYXJjaGl2ZXIgPSBuZXcgUHNrQXJjaGl2ZXIoKTtcblxuXHRhcmNoaXZlci56aXBJbk1lbW9yeShpbnB1dE9iaiwgZGVwdGgsIGZ1bmN0aW9uIChlcnIsIHppcHBlZE9iaikge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdH1cblx0XHRjb25zdCBjaXBoZXJUZXh0ID0gZW5jcnlwdCh6aXBwZWRPYmosIHBhc3N3b3JkKTtcblx0XHRjYWxsYmFjayhudWxsLCBjaXBoZXJUZXh0KTtcblx0fSlcbn1cblxuZnVuY3Rpb24gZGVjcnlwdE9iamVjdEluTWVtb3J5KGVuY3J5cHRlZE9iamVjdCwgcGFzc3dvcmQsIGNhbGxiYWNrKSB7XG5cdGNvbnN0IGFyY2hpdmVyID0gbmV3IFBza0FyY2hpdmVyKCk7XG5cblx0Y29uc3QgemlwcGVkT2JqZWN0ID0gZGVjcnlwdChlbmNyeXB0ZWRPYmplY3QsIHBhc3N3b3JkKTtcblx0YXJjaGl2ZXIudW56aXBJbk1lbW9yeSh6aXBwZWRPYmplY3QsIGZ1bmN0aW9uIChlcnIsIG9iaikge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdH1cblx0XHRjYWxsYmFjayhudWxsLCBvYmopO1xuXHR9KVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRjcmVhdGVQc2tIYXNoLFxuXHRlbmNyeXB0LFxuXHRlbmNyeXB0T2JqZWN0SW5NZW1vcnksXG5cdGRlY3J5cHQsXG5cdGRlY3J5cHRPYmplY3RJbk1lbW9yeSxcblx0ZGVsZXRlUmVjdXJzaXZlbHksXG5cdGVuY29kZSxcblx0Z2VuZXJhdGVTYWx0LFxuXHRpdGVyYXRpb25zX251bWJlcixcblx0YWxnb3JpdGhtLFxuXHRQc2tIYXNoXG59O1xuXG4iLCJjb25zdCBzdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKTtcblxuXG5mdW5jdGlvbiBpc1N0cmVhbSAob2JqKSB7XG5cdHJldHVybiBvYmogaW5zdGFuY2VvZiBzdHJlYW0uU3RyZWFtIHx8IG9iaiBpbnN0YW5jZW9mIHN0cmVhbS5EdXBsZXg7XG59XG5cblxuZnVuY3Rpb24gaXNSZWFkYWJsZSAob2JqKSB7XG5cdHJldHVybiBpc1N0cmVhbShvYmopICYmIHR5cGVvZiBvYmouX3JlYWQgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIG9iai5fcmVhZGFibGVTdGF0ZSA9PT0gJ29iamVjdCdcbn1cblxuXG5mdW5jdGlvbiBpc1dyaXRhYmxlIChvYmopIHtcblx0cmV0dXJuIGlzU3RyZWFtKG9iaikgJiYgdHlwZW9mIG9iai5fd3JpdGUgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIG9iai5fd3JpdGFibGVTdGF0ZSA9PT0gJ29iamVjdCdcbn1cblxuXG5mdW5jdGlvbiBpc0R1cGxleCAob2JqKSB7XG5cdHJldHVybiBpc1JlYWRhYmxlKG9iaikgJiYgaXNXcml0YWJsZShvYmopXG59XG5cblxubW9kdWxlLmV4cG9ydHMgICAgICAgICAgICA9IGlzU3RyZWFtO1xubW9kdWxlLmV4cG9ydHMuaXNSZWFkYWJsZSA9IGlzUmVhZGFibGU7XG5tb2R1bGUuZXhwb3J0cy5pc1dyaXRhYmxlID0gaXNXcml0YWJsZTtcbm1vZHVsZS5leHBvcnRzLmlzRHVwbGV4ICAgPSBpc0R1cGxleDsiLCIvKlxuIFNpZ25TZW5zIGhlbHBlciBmdW5jdGlvbnNcbiAqL1xuY29uc3QgY3J5cHRvID0gcmVxdWlyZSgnY3J5cHRvJyk7XG5cbmV4cG9ydHMud2lwZU91dHNpZGVQYXlsb2FkID0gZnVuY3Rpb24gd2lwZU91dHNpZGVQYXlsb2FkKGhhc2hTdHJpbmdIZXhhLCBwb3MsIHNpemUpe1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHN6ID0gaGFzaFN0cmluZ0hleGEubGVuZ3RoO1xuXG4gICAgdmFyIGVuZCA9IChwb3MgKyBzaXplKSAlIHN6O1xuXG4gICAgaWYocG9zIDwgZW5kKXtcbiAgICAgICAgcmVzdWx0ID0gJzAnLnJlcGVhdChwb3MpICsgIGhhc2hTdHJpbmdIZXhhLnN1YnN0cmluZyhwb3MsIGVuZCkgKyAnMCcucmVwZWF0KHN6IC0gZW5kKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IGhhc2hTdHJpbmdIZXhhLnN1YnN0cmluZygwLCBlbmQpICsgJzAnLnJlcGVhdChwb3MgLSBlbmQpICsgaGFzaFN0cmluZ0hleGEuc3Vic3RyaW5nKHBvcywgc3opO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5cblxuZXhwb3J0cy5leHRyYWN0UGF5bG9hZCA9IGZ1bmN0aW9uIGV4dHJhY3RQYXlsb2FkKGhhc2hTdHJpbmdIZXhhLCBwb3MsIHNpemUpe1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICB2YXIgc3ogPSBoYXNoU3RyaW5nSGV4YS5sZW5ndGg7XG4gICAgdmFyIGVuZCA9IChwb3MgKyBzaXplKSAlIHN6O1xuXG4gICAgaWYoIHBvcyA8IGVuZCl7XG4gICAgICAgIHJlc3VsdCA9IGhhc2hTdHJpbmdIZXhhLnN1YnN0cmluZyhwb3MsIHBvcyArIHNpemUpO1xuICAgIH0gZWxzZXtcblxuICAgICAgICBpZigwICE9IGVuZCl7XG4gICAgICAgICAgICByZXN1bHQgPSBoYXNoU3RyaW5nSGV4YS5zdWJzdHJpbmcoMCwgZW5kKVxuICAgICAgICB9ICBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ICs9IGhhc2hTdHJpbmdIZXhhLnN1YnN0cmluZyhwb3MsIHN6KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuXG5cbmV4cG9ydHMuZmlsbFBheWxvYWQgPSBmdW5jdGlvbiBmaWxsUGF5bG9hZChwYXlsb2FkLCBwb3MsIHNpemUpe1xuICAgIHZhciBzeiA9IDY0O1xuICAgIHZhciByZXN1bHQgPSBcIlwiO1xuXG4gICAgdmFyIGVuZCA9IChwb3MgKyBzaXplKSAlIHN6O1xuXG4gICAgaWYoIHBvcyA8IGVuZCl7XG4gICAgICAgIHJlc3VsdCA9ICcwJy5yZXBlYXQocG9zKSArIHBheWxvYWQgKyAnMCcucmVwZWF0KHN6IC0gZW5kKTtcbiAgICB9IGVsc2V7XG4gICAgICAgIHJlc3VsdCA9IHBheWxvYWQuc3Vic3RyaW5nKDAsZW5kKTtcbiAgICAgICAgcmVzdWx0ICs9ICcwJy5yZXBlYXQocG9zIC0gZW5kKTtcbiAgICAgICAgcmVzdWx0ICs9IHBheWxvYWQuc3Vic3RyaW5nKGVuZCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cblxuXG5leHBvcnRzLmdlbmVyYXRlUG9zSGFzaFhUaW1lcyA9IGZ1bmN0aW9uIGdlbmVyYXRlUG9zSGFzaFhUaW1lcyhidWZmZXIsIHBvcywgc2l6ZSwgY291bnQpeyAvL2dlbmVyYXRlIHBvc2l0aW9uYWwgaGFzaFxuICAgIHZhciByZXN1bHQgID0gYnVmZmVyLnRvU3RyaW5nKFwiaGV4XCIpO1xuXG4gICAgLyppZihwb3MgIT0gLTEgKVxuICAgICAgICByZXN1bHRbcG9zXSA9IDA7ICovXG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKyl7XG4gICAgICAgIHZhciBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpO1xuICAgICAgICByZXN1bHQgPSBleHBvcnRzLndpcGVPdXRzaWRlUGF5bG9hZChyZXN1bHQsIHBvcywgc2l6ZSk7XG4gICAgICAgIGhhc2gudXBkYXRlKHJlc3VsdCk7XG4gICAgICAgIHJlc3VsdCA9IGhhc2guZGlnZXN0KCdoZXgnKTtcbiAgICB9XG4gICAgcmV0dXJuIGV4cG9ydHMud2lwZU91dHNpZGVQYXlsb2FkKHJlc3VsdCwgcG9zLCBzaXplKTtcbn1cblxuZXhwb3J0cy5oYXNoU3RyaW5nQXJyYXkgPSBmdW5jdGlvbiAoY291bnRlciwgYXJyLCBwYXlsb2FkU2l6ZSl7XG5cbiAgICBjb25zdCBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpO1xuICAgIHZhciByZXN1bHQgPSBjb3VudGVyLnRvU3RyaW5nKDE2KTtcblxuICAgIGZvcih2YXIgaSA9IDAgOyBpIDwgNjQ7IGkrKyl7XG4gICAgICAgIHJlc3VsdCArPSBleHBvcnRzLmV4dHJhY3RQYXlsb2FkKGFycltpXSxpLCBwYXlsb2FkU2l6ZSk7XG4gICAgfVxuXG4gICAgaGFzaC51cGRhdGUocmVzdWx0KTtcbiAgICB2YXIgcmVzdWx0ID0gaGFzaC5kaWdlc3QoJ2hleCcpO1xuICAgIHJldHVybiByZXN1bHQ7XG59XG5cblxuXG5cblxuXG5mdW5jdGlvbiBkdW1wTWVtYmVyKG9iail7XG4gICAgdmFyIHR5cGUgPSBBcnJheS5pc0FycmF5KG9iaikgPyBcImFycmF5XCIgOiB0eXBlb2Ygb2JqO1xuICAgIGlmKG9iaiA9PT0gbnVsbCl7XG4gICAgICAgIHJldHVybiBcIm51bGxcIjtcbiAgICB9XG4gICAgaWYob2JqID09PSB1bmRlZmluZWQpe1xuICAgICAgICByZXR1cm4gXCJ1bmRlZmluZWRcIjtcbiAgICB9XG5cbiAgICBzd2l0Y2godHlwZSl7XG4gICAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgICAgY2FzZSBcInN0cmluZ1wiOnJldHVybiBvYmoudG9TdHJpbmcoKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJvYmplY3RcIjogcmV0dXJuIGV4cG9ydHMuZHVtcE9iamVjdEZvckhhc2hpbmcob2JqKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJib29sZWFuXCI6IHJldHVybiAgb2JqPyBcInRydWVcIjogXCJmYWxzZVwiOyBicmVhaztcbiAgICAgICAgY2FzZSBcImFycmF5XCI6XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gXCJcIjtcbiAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpIDwgb2JqLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gZXhwb3J0cy5kdW1wT2JqZWN0Rm9ySGFzaGluZyhvYmpbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVHlwZSBcIiArICB0eXBlICsgXCIgY2Fubm90IGJlIGNyeXB0b2dyYXBoaWNhbGx5IGRpZ2VzdGVkXCIpO1xuICAgIH1cblxufVxuXG5cbmV4cG9ydHMuZHVtcE9iamVjdEZvckhhc2hpbmcgPSBmdW5jdGlvbihvYmope1xuICAgIHZhciByZXN1bHQgPSBcIlwiO1xuXG4gICAgaWYob2JqID09PSBudWxsKXtcbiAgICAgICAgcmV0dXJuIFwibnVsbFwiO1xuICAgIH1cbiAgICBpZihvYmogPT09IHVuZGVmaW5lZCl7XG4gICAgICAgIHJldHVybiBcInVuZGVmaW5lZFwiO1xuICAgIH1cblxuICAgIHZhciBiYXNpY1R5cGVzID0ge1xuICAgICAgICBcImFycmF5XCIgICAgIDogdHJ1ZSxcbiAgICAgICAgXCJudW1iZXJcIiAgICA6IHRydWUsXG4gICAgICAgIFwiYm9vbGVhblwiICAgOiB0cnVlLFxuICAgICAgICBcInN0cmluZ1wiICAgIDogdHJ1ZSxcbiAgICAgICAgXCJvYmplY3RcIiAgICA6IGZhbHNlXG4gICAgfVxuXG4gICAgdmFyIHR5cGUgPSBBcnJheS5pc0FycmF5KG9iaikgPyBcImFycmF5XCIgOiB0eXBlb2Ygb2JqO1xuICAgIGlmKCBiYXNpY1R5cGVzW3R5cGVdKXtcbiAgICAgICAgcmV0dXJuIGR1bXBNZW1iZXIob2JqKTtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG4gICAga2V5cy5zb3J0KCk7XG5cblxuICAgIGZvcih2YXIgaT0wOyBpIDwga2V5cy5sZW5ndGg7IGkrKyl7XG4gICAgICAgIHJlc3VsdCArPSBkdW1wTWVtYmVyKGtleXNbaV0pO1xuICAgICAgICByZXN1bHQgKz0gZHVtcE1lbWJlcihvYmpba2V5c1tpXV0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cblxuZXhwb3J0cy5oYXNoVmFsdWVzICA9IGZ1bmN0aW9uICh2YWx1ZXMpe1xuICAgIGNvbnN0IGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMjU2Jyk7XG4gICAgdmFyIHJlc3VsdCA9IGV4cG9ydHMuZHVtcE9iamVjdEZvckhhc2hpbmcodmFsdWVzKTtcbiAgICBoYXNoLnVwZGF0ZShyZXN1bHQpO1xuICAgIHJldHVybiBoYXNoLmRpZ2VzdCgnaGV4Jyk7XG59O1xuXG5leHBvcnRzLmdldEpTT05Gcm9tU2lnbmF0dXJlID0gZnVuY3Rpb24gZ2V0SlNPTkZyb21TaWduYXR1cmUoc2lnbmF0dXJlLCBzaXplKXtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBwcm9vZjpbXVxuICAgIH07XG4gICAgdmFyIGEgPSBzaWduYXR1cmUuc3BsaXQoXCI6XCIpO1xuICAgIHJlc3VsdC5hZ2VudCAgICAgICAgPSBhWzBdO1xuICAgIHJlc3VsdC5jb3VudGVyICAgICAgPSAgcGFyc2VJbnQoYVsxXSwgXCJoZXhcIik7XG4gICAgcmVzdWx0Lm5leHRQdWJsaWMgICA9ICBhWzJdO1xuXG4gICAgdmFyIHByb29mID0gYVszXVxuXG5cbiAgICBpZihwcm9vZi5sZW5ndGgvc2l6ZSAhPSA2NCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHNpZ25hdHVyZSBcIiArIHByb29mKTtcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgNjQ7IGkrKyl7XG4gICAgICAgIHJlc3VsdC5wcm9vZi5wdXNoKGV4cG9ydHMuZmlsbFBheWxvYWQocHJvb2Yuc3Vic3RyaW5nKGkgKiBzaXplLChpKzEpICogc2l6ZSApLCBpLCBzaXplKSlcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnRzLmNyZWF0ZVNpZ25hdHVyZSA9IGZ1bmN0aW9uIChhZ2VudCxjb3VudGVyLCBuZXh0UHVibGljLCBhcnIsIHNpemUpe1xuICAgIHZhciByZXN1bHQgPSBcIlwiO1xuXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKyl7XG4gICAgICAgIHJlc3VsdCArPSBleHBvcnRzLmV4dHJhY3RQYXlsb2FkKGFycltpXSwgaSAsIHNpemUpO1xuICAgIH1cblxuICAgIHJldHVybiBhZ2VudCArIFwiOlwiICsgY291bnRlciArIFwiOlwiICsgbmV4dFB1YmxpYyArIFwiOlwiICsgcmVzdWx0O1xufSIsIi8qXG5Jbml0aWFsIExpY2Vuc2U6IChjKSBBeGlvbG9naWMgUmVzZWFyY2ggJiBBbGJvYWllIFPDrm5pY8SDLlxuQ29udHJpYnV0b3JzOiBBeGlvbG9naWMgUmVzZWFyY2ggLCBQcml2YXRlU2t5IHByb2plY3RcbkNvZGUgTGljZW5zZTogTEdQTCBvciBNSVQuXG4qL1xuXG5cbi8qKlxuICogICBVc3VhbGx5IGFuIGV2ZW50IGNvdWxkIGNhdXNlIGV4ZWN1dGlvbiBvZiBvdGhlciBjYWxsYmFjayBldmVudHMgLiBXZSBzYXkgdGhhdCBpcyBhIGxldmVsIDEgZXZlbnQgaWYgaXMgY2F1c2VlZCBieSBhIGxldmVsIDAgZXZlbnQgYW5kIHNvIG9uXG4gKlxuICogICAgICBTb3VuZFB1YlN1YiBwcm92aWRlcyBpbnR1aXRpdmUgcmVzdWx0cyByZWdhcmRpbmcgdG8gYXN5bmNocm9ub3VzIGNhbGxzIG9mIGNhbGxiYWNrcyBhbmQgY29tcHV0ZWQgdmFsdWVzL2V4cHJlc3Npb25zOlxuICogICB3ZSBwcmV2ZW50IGltbWVkaWF0ZSBleGVjdXRpb24gb2YgZXZlbnQgY2FsbGJhY2tzIHRvIGVuc3VyZSB0aGUgaW50dWl0aXZlIGZpbmFsIHJlc3VsdCBpcyBndWFyYW50ZWVkIGFzIGxldmVsIDAgZXhlY3V0aW9uXG4gKiAgIHdlIGd1YXJhbnRlZSB0aGF0IGFueSBjYWxsYmFjayBmdW5jdGlvbiBpcyBcInJlLWVudHJhbnRcIlxuICogICB3ZSBhcmUgYWxzbyB0cnlpbmcgdG8gcmVkdWNlIHRoZSBudW1iZXIgb2YgY2FsbGJhY2sgZXhlY3V0aW9uIGJ5IGxvb2tpbmcgaW4gcXVldWVzIGF0IG5ldyBtZXNzYWdlcyBwdWJsaXNoZWQgYnlcbiAqICAgdHJ5aW5nIHRvIGNvbXBhY3QgdGhvc2UgbWVzc2FnZXMgKHJlbW92aW5nIGR1cGxpY2F0ZSBtZXNzYWdlcywgbW9kaWZ5aW5nIG1lc3NhZ2VzLCBvciBhZGRpbmcgaW4gdGhlIGhpc3Rvcnkgb2YgYW5vdGhlciBldmVudCAsZXRjKVxuICpcbiAqICAgICAgRXhhbXBsZSBvZiB3aGF0IGNhbiBiZSB3cm9uZyB3aXRob3V0IG5vbi1zb3VuZCBhc3luY2hyb25vdXMgY2FsbHM6XG4gKlxuICogIFN0ZXAgMDogSW5pdGlhbCBzdGF0ZTpcbiAqICAgYSA9IDA7XG4gKiAgIGIgPSAwO1xuICpcbiAqICBTdGVwIDE6IEluaXRpYWwgb3BlcmF0aW9uczpcbiAqICAgYSA9IDE7XG4gKiAgIGIgPSAtMTtcbiAqXG4gKiAgLy8gYW4gb2JzZXJ2ZXIgcmVhY3RzIHRvIGNoYW5nZXMgaW4gYSBhbmQgYiBhbmQgY29tcHV0ZSBDT1JSRUNUIGxpa2UgdGhpczpcbiAqICAgaWYoIGEgKyBiID09IDApIHtcbiAqICAgICAgIENPUlJFQ1QgPSBmYWxzZTtcbiAqICAgICAgIG5vdGlmeSguLi4pOyAvLyBhY3Qgb3Igc2VuZCBhIG5vdGlmaWNhdGlvbiBzb21ld2hlcmUuLlxuICogICB9IGVsc2Uge1xuICogICAgICBDT1JSRUNUID0gZmFsc2U7XG4gKiAgIH1cbiAqXG4gKiAgICBOb3RpY2UgdGhhdDogQ09SUkVDVCB3aWxsIGJlIHRydWUgaW4gdGhlIGVuZCAsIGJ1dCBtZWFudGltZSwgYWZ0ZXIgYSBub3RpZmljYXRpb24gd2FzIHNlbnQgYW5kIENPUlJFQ1Qgd2FzIHdyb25nbHksIHRlbXBvcmFyaWx5IGZhbHNlIVxuICogICAgc291bmRQdWJTdWIgZ3VhcmFudGVlIHRoYXQgdGhpcyBkb2VzIG5vdCBoYXBwZW4gYmVjYXVzZSB0aGUgc3luY3Jvbm91cyBjYWxsIHdpbGwgYmVmb3JlIGFueSBvYnNlcnZlciAoYm90IGFzaWduYXRpb24gb24gYSBhbmQgYilcbiAqXG4gKiAgIE1vcmU6XG4gKiAgIHlvdSBjYW4gdXNlIGJsb2NrQ2FsbEJhY2tzIGFuZCByZWxlYXNlQ2FsbEJhY2tzIGluIGEgZnVuY3Rpb24gdGhhdCBjaGFuZ2UgYSBsb3QgYSBjb2xsZWN0aW9uIG9yIGJpbmRhYmxlIG9iamVjdHMgYW5kIGFsbFxuICogICB0aGUgbm90aWZpY2F0aW9ucyB3aWxsIGJlIHNlbnQgY29tcGFjdGVkIGFuZCBwcm9wZXJseVxuICovXG5cbi8vIFRPRE86IG9wdGltaXNhdGlvbiE/IHVzZSBhIG1vcmUgZWZmaWNpZW50IHF1ZXVlIGluc3RlYWQgb2YgYXJyYXlzIHdpdGggcHVzaCBhbmQgc2hpZnQhP1xuLy8gVE9ETzogc2VlIGhvdyBiaWcgdGhvc2UgcXVldWVzIGNhbiBiZSBpbiByZWFsIGFwcGxpY2F0aW9uc1xuLy8gZm9yIGEgZmV3IGh1bmRyZWRzIGl0ZW1zLCBxdWV1ZXMgbWFkZSBmcm9tIGFycmF5IHNob3VsZCBiZSBlbm91Z2hcbi8vKiAgIFBvdGVudGlhbCBUT0RPczpcbi8vICAgICogICAgIHByZXZlbnQgYW55IGZvcm0gb2YgcHJvYmxlbSBieSBjYWxsaW5nIGNhbGxiYWNrcyBpbiB0aGUgZXhwZWN0ZWQgb3JkZXIgIT9cbi8vKiAgICAgcHJldmVudGluZyBpbmZpbml0ZSBsb29wcyBleGVjdXRpb24gY2F1c2UgYnkgZXZlbnRzIT9cbi8vKlxuLy8qXG4vLyBUT0RPOiBkZXRlY3QgaW5maW5pdGUgbG9vcHMgKG9yIHZlcnkgZGVlcCBwcm9wYWdhdGlvbikgSXQgaXMgcG9zc2libGUhP1xuXG5jb25zdCBRdWV1ZSA9IHJlcXVpcmUoJ3N3YXJtdXRpbHMnKS5RdWV1ZTtcblxuZnVuY3Rpb24gU291bmRQdWJTdWIoKXtcblxuXHQvKipcblx0ICogcHVibGlzaFxuXHQgKiAgICAgIFB1Ymxpc2ggYSBtZXNzYWdlIHtPYmplY3R9IHRvIGEgbGlzdCBvZiBzdWJzY3JpYmVycyBvbiBhIHNwZWNpZmljIHRvcGljXG5cdCAqXG5cdCAqIEBwYXJhbXMge1N0cmluZ3xOdW1iZXJ9IHRhcmdldCwgIHtPYmplY3R9IG1lc3NhZ2Vcblx0ICogQHJldHVybiBudW1iZXIgb2YgY2hhbm5lbCBzdWJzY3JpYmVycyB0aGF0IHdpbGwgYmUgbm90aWZpZWRcblx0ICovXG5cdHRoaXMucHVibGlzaCA9IGZ1bmN0aW9uKHRhcmdldCwgbWVzc2FnZSl7XG5cdFx0aWYoIWludmFsaWRDaGFubmVsTmFtZSh0YXJnZXQpICYmICFpbnZhbGlkTWVzc2FnZVR5cGUobWVzc2FnZSkgJiYgKHR5cGVvZiBjaGFubmVsU3Vic2NyaWJlcnNbdGFyZ2V0XSAhPSAndW5kZWZpbmVkJykpe1xuXHRcdFx0Y29tcGFjdEFuZFN0b3JlKHRhcmdldCwgbWVzc2FnZSk7XG5cdFx0XHRzZXRUaW1lb3V0KGRpc3BhdGNoTmV4dCwgMCk7XG5cdFx0XHRyZXR1cm4gY2hhbm5lbFN1YnNjcmliZXJzW3RhcmdldF0ubGVuZ3RoO1xuXHRcdH0gZWxzZXtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogc3Vic2NyaWJlXG5cdCAqICAgICAgU3Vic2NyaWJlIC8gYWRkIGEge0Z1bmN0aW9ufSBjYWxsQmFjayBvbiBhIHtTdHJpbmd8TnVtYmVyfXRhcmdldCBjaGFubmVsIHN1YnNjcmliZXJzIGxpc3QgaW4gb3JkZXIgdG8gcmVjZWl2ZVxuXHQgKiAgICAgIG1lc3NhZ2VzIHB1Ymxpc2hlZCBpZiB0aGUgY29uZGl0aW9ucyBkZWZpbmVkIGJ5IHtGdW5jdGlvbn13YWl0Rm9yTW9yZSBhbmQge0Z1bmN0aW9ufWZpbHRlciBhcmUgcGFzc2VkLlxuXHQgKlxuXHQgKiBAcGFyYW1zIHtTdHJpbmd8TnVtYmVyfXRhcmdldCwge0Z1bmN0aW9ufWNhbGxCYWNrLCB7RnVuY3Rpb259d2FpdEZvck1vcmUsIHtGdW5jdGlvbn1maWx0ZXJcblx0ICpcblx0ICogICAgICAgICAgdGFyZ2V0ICAgICAgLSBjaGFubmVsIG5hbWUgdG8gc3Vic2NyaWJlXG5cdCAqICAgICAgICAgIGNhbGxiYWNrICAgIC0gZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdoZW4gYSBtZXNzYWdlIHdhcyBwdWJsaXNoZWQgb24gdGhlIGNoYW5uZWxcblx0ICogICAgICAgICAgd2FpdEZvck1vcmUgLSBhIGludGVybWVkaWFyeSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgY2FsbGVkIGFmdGVyIGEgc3VjY2Vzc2Z1bHkgbWVzc2FnZSBkZWxpdmVyeSBpbiBvcmRlclxuXHQgKiAgICAgICAgICAgICAgICAgICAgICAgICAgdG8gZGVjaWRlIGlmIGEgbmV3IG1lc3NhZ2VzIGlzIGV4cGVjdGVkLi4uXG5cdCAqICAgICAgICAgIGZpbHRlciAgICAgIC0gYSBmdW5jdGlvbiB0aGF0IHJlY2VpdmVzIHRoZSBtZXNzYWdlIGJlZm9yZSBpbnZvY2F0aW9uIG9mIGNhbGxiYWNrIGZ1bmN0aW9uIGluIG9yZGVyIHRvIGFsbG93XG5cdCAqICAgICAgICAgICAgICAgICAgICAgICAgICByZWxldmFudCBtZXNzYWdlIGJlZm9yZSBlbnRlcmluZyBpbiBub3JtYWwgY2FsbGJhY2sgZmxvd1xuXHQgKiBAcmV0dXJuXG5cdCAqL1xuXHR0aGlzLnN1YnNjcmliZSA9IGZ1bmN0aW9uKHRhcmdldCwgY2FsbEJhY2ssIHdhaXRGb3JNb3JlLCBmaWx0ZXIpe1xuXHRcdGlmKCFpbnZhbGlkQ2hhbm5lbE5hbWUodGFyZ2V0KSAmJiAhaW52YWxpZEZ1bmN0aW9uKGNhbGxCYWNrKSl7XG5cdFx0XHR2YXIgc3Vic2NyaWJlciA9IHtcImNhbGxCYWNrXCI6Y2FsbEJhY2ssIFwid2FpdEZvck1vcmVcIjp3YWl0Rm9yTW9yZSwgXCJmaWx0ZXJcIjpmaWx0ZXJ9O1xuXHRcdFx0dmFyIGFyciA9IGNoYW5uZWxTdWJzY3JpYmVyc1t0YXJnZXRdO1xuXHRcdFx0aWYodHlwZW9mIGFyciA9PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdGFyciA9IFtdO1xuXHRcdFx0XHRjaGFubmVsU3Vic2NyaWJlcnNbdGFyZ2V0XSA9IGFycjtcblx0XHRcdH1cblx0XHRcdGFyci5wdXNoKHN1YnNjcmliZXIpO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogdW5zdWJzY3JpYmVcblx0ICogICAgICBVbnN1YnNjcmliZS9yZW1vdmUge0Z1bmN0aW9ufSBjYWxsQmFjayBmcm9tIHRoZSBsaXN0IG9mIHN1YnNjcmliZXJzIG9mIHRoZSB7U3RyaW5nfE51bWJlcn0gdGFyZ2V0IGNoYW5uZWxcblx0ICpcblx0ICogQHBhcmFtcyB7U3RyaW5nfE51bWJlcn0gdGFyZ2V0LCB7RnVuY3Rpb259IGNhbGxCYWNrLCB7RnVuY3Rpb259IGZpbHRlclxuXHQgKlxuXHQgKiAgICAgICAgICB0YXJnZXQgICAgICAtIGNoYW5uZWwgbmFtZSB0byB1bnN1YnNjcmliZVxuXHQgKiAgICAgICAgICBjYWxsYmFjayAgICAtIHJlZmVyZW5jZSBvZiB0aGUgb3JpZ2luYWwgZnVuY3Rpb24gdGhhdCB3YXMgdXNlZCBhcyBzdWJzY3JpYmVcblx0ICogICAgICAgICAgZmlsdGVyICAgICAgLSByZWZlcmVuY2Ugb2YgdGhlIG9yaWdpbmFsIGZpbHRlciBmdW5jdGlvblxuXHQgKiBAcmV0dXJuXG5cdCAqL1xuXHR0aGlzLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24odGFyZ2V0LCBjYWxsQmFjaywgZmlsdGVyKXtcblx0XHRpZighaW52YWxpZEZ1bmN0aW9uKGNhbGxCYWNrKSl7XG5cdFx0XHR2YXIgZ290aXQgPSBmYWxzZTtcblx0XHRcdGlmKGNoYW5uZWxTdWJzY3JpYmVyc1t0YXJnZXRdKXtcblx0XHRcdFx0Zm9yKHZhciBpID0gMDsgaSA8IGNoYW5uZWxTdWJzY3JpYmVyc1t0YXJnZXRdLmxlbmd0aDtpKyspe1xuXHRcdFx0XHRcdHZhciBzdWJzY3JpYmVyID0gIGNoYW5uZWxTdWJzY3JpYmVyc1t0YXJnZXRdW2ldO1xuXHRcdFx0XHRcdGlmKHN1YnNjcmliZXIuY2FsbEJhY2sgPT09IGNhbGxCYWNrICYmICggdHlwZW9mIGZpbHRlciA9PT0gJ3VuZGVmaW5lZCcgfHwgc3Vic2NyaWJlci5maWx0ZXIgPT09IGZpbHRlciApKXtcblx0XHRcdFx0XHRcdGdvdGl0ID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHN1YnNjcmliZXIuZm9yRGVsZXRlID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHN1YnNjcmliZXIuY2FsbEJhY2sgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0XHRzdWJzY3JpYmVyLmZpbHRlciA9IHVuZGVmaW5lZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmKCFnb3RpdCl7XG5cdFx0XHRcdHdwcmludChcIlVuYWJsZSB0byB1bnN1YnNjcmliZSBhIGNhbGxiYWNrIHRoYXQgd2FzIG5vdCBzdWJzY3JpYmVkIVwiKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIGJsb2NrQ2FsbEJhY2tzXG5cdCAqXG5cdCAqIEBwYXJhbXNcblx0ICogQHJldHVyblxuXHQgKi9cblx0dGhpcy5ibG9ja0NhbGxCYWNrcyA9IGZ1bmN0aW9uKCl7XG5cdFx0bGV2ZWwrKztcblx0fTtcblxuXHQvKipcblx0ICogcmVsZWFzZUNhbGxCYWNrc1xuXHQgKlxuXHQgKiBAcGFyYW1zXG5cdCAqIEByZXR1cm5cblx0ICovXG5cdHRoaXMucmVsZWFzZUNhbGxCYWNrcyA9IGZ1bmN0aW9uKCl7XG5cdFx0bGV2ZWwtLTtcblx0XHQvL2hhY2svb3B0aW1pc2F0aW9uIHRvIG5vdCBmaWxsIHRoZSBzdGFjayBpbiBleHRyZW1lIGNhc2VzIChtYW55IGV2ZW50cyBjYXVzZWQgYnkgbG9vcHMgaW4gY29sbGVjdGlvbnMsZXRjKVxuXHRcdHdoaWxlKGxldmVsID09PSAwICYmIGRpc3BhdGNoTmV4dCh0cnVlKSl7XG5cdFx0XHQvL25vdGhpbmdcblx0XHR9XG5cblx0XHR3aGlsZShsZXZlbCA9PT0gMCAmJiBjYWxsQWZ0ZXJBbGxFdmVudHMoKSl7XG4gICAgICAgICAgICAvL25vdGhpbmdcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIGFmdGVyQWxsRXZlbnRzXG5cdCAqXG5cdCAqIEBwYXJhbXMge0Z1bmN0aW9ufSBjYWxsYmFja1xuXHQgKlxuXHQgKiAgICAgICAgICBjYWxsYmFjayAtIGZ1bmN0aW9uIHRoYXQgbmVlZHMgdG8gYmUgaW52b2tlZCBvbmNlIGFsbCBldmVudHMgYXJlIGRlbGl2ZXJlZFxuXHQgKiBAcmV0dXJuXG5cdCAqL1xuXHR0aGlzLmFmdGVyQWxsRXZlbnRzID0gZnVuY3Rpb24oY2FsbEJhY2spe1xuXHRcdGlmKCFpbnZhbGlkRnVuY3Rpb24oY2FsbEJhY2spKXtcblx0XHRcdGFmdGVyRXZlbnRzQ2FsbHMucHVzaChjYWxsQmFjayk7XG5cdFx0fVxuXHRcdHRoaXMuYmxvY2tDYWxsQmFja3MoKTtcblx0XHR0aGlzLnJlbGVhc2VDYWxsQmFja3MoKTtcblx0fTtcblxuXHQvKipcblx0ICogaGFzQ2hhbm5lbFxuXHQgKlxuXHQgKiBAcGFyYW1zIHtTdHJpbmd8TnVtYmVyfSBjaGFubmVsXG5cdCAqXG5cdCAqICAgICAgICAgIGNoYW5uZWwgLSBuYW1lIG9mIHRoZSBjaGFubmVsIHRoYXQgbmVlZCB0byBiZSB0ZXN0ZWQgaWYgcHJlc2VudFxuXHQgKiBAcmV0dXJuXG5cdCAqL1xuXHR0aGlzLmhhc0NoYW5uZWwgPSBmdW5jdGlvbihjaGFubmVsKXtcblx0XHRyZXR1cm4gIWludmFsaWRDaGFubmVsTmFtZShjaGFubmVsKSAmJiAodHlwZW9mIGNoYW5uZWxTdWJzY3JpYmVyc1tjaGFubmVsXSAhPSAndW5kZWZpbmVkJykgPyB0cnVlIDogZmFsc2U7XG5cdH07XG5cblx0LyoqXG5cdCAqIGFkZENoYW5uZWxcblx0ICpcblx0ICogQHBhcmFtcyB7U3RyaW5nfSBjaGFubmVsXG5cdCAqXG5cdCAqICAgICAgICAgIGNoYW5uZWwgLSBuYW1lIG9mIGEgY2hhbm5lbCB0aGF0IG5lZWRzIHRvIGJlIGNyZWF0ZWQgYW5kIGFkZGVkIHRvIHNvdW5kcHVic3ViIHJlcG9zaXRvcnlcblx0ICogQHJldHVyblxuXHQgKi9cblx0dGhpcy5hZGRDaGFubmVsID0gZnVuY3Rpb24oY2hhbm5lbCl7XG5cdFx0aWYoIWludmFsaWRDaGFubmVsTmFtZShjaGFubmVsKSAmJiAhdGhpcy5oYXNDaGFubmVsKGNoYW5uZWwpKXtcblx0XHRcdGNoYW5uZWxTdWJzY3JpYmVyc1tjaGFubmVsXSA9IFtdO1xuXHRcdH1cblx0fTtcblxuXHQvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIHByb3RlY3RlZCBzdHVmZiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cdHZhciBzZWxmID0gdGhpcztcblx0Ly8gbWFwIGNoYW5uZWxOYW1lIChvYmplY3QgbG9jYWwgaWQpIC0+IGFycmF5IHdpdGggc3Vic2NyaWJlcnNcblx0dmFyIGNoYW5uZWxTdWJzY3JpYmVycyA9IHt9O1xuXG5cdC8vIG1hcCBjaGFubmVsTmFtZSAob2JqZWN0IGxvY2FsIGlkKSAtPiBxdWV1ZSB3aXRoIHdhaXRpbmcgbWVzc2FnZXNcblx0dmFyIGNoYW5uZWxzU3RvcmFnZSA9IHt9O1xuXG5cdC8vIG9iamVjdFxuXHR2YXIgdHlwZUNvbXBhY3RvciA9IHt9O1xuXG5cdC8vIGNoYW5uZWwgbmFtZXNcblx0dmFyIGV4ZWN1dGlvblF1ZXVlID0gbmV3IFF1ZXVlKCk7XG5cdHZhciBsZXZlbCA9IDA7XG5cblxuXG5cdC8qKlxuXHQgKiByZWdpc3RlckNvbXBhY3RvclxuXHQgKlxuXHQgKiAgICAgICBBbiBjb21wYWN0b3IgdGFrZXMgYSBuZXdFdmVudCBhbmQgYW5kIG9sZEV2ZW50IGFuZCByZXR1cm4gdGhlIG9uZSB0aGF0IHN1cnZpdmVzIChvbGRFdmVudCBpZlxuXHQgKiAgaXQgY2FuIGNvbXBhY3QgdGhlIG5ldyBvbmUgb3IgdGhlIG5ld0V2ZW50IGlmIGNhbid0IGJlIGNvbXBhY3RlZClcblx0ICpcblx0ICogQHBhcmFtcyB7U3RyaW5nfSB0eXBlLCB7RnVuY3Rpb259IGNhbGxCYWNrXG5cdCAqXG5cdCAqICAgICAgICAgIHR5cGUgICAgICAgIC0gY2hhbm5lbCBuYW1lIHRvIHVuc3Vic2NyaWJlXG5cdCAqICAgICAgICAgIGNhbGxCYWNrICAgIC0gaGFuZGxlciBmdW5jdGlvbiBmb3IgdGhhdCBzcGVjaWZpYyBldmVudCB0eXBlXG5cdCAqIEByZXR1cm5cblx0ICovXG5cdHRoaXMucmVnaXN0ZXJDb21wYWN0b3IgPSBmdW5jdGlvbih0eXBlLCBjYWxsQmFjaykge1xuXHRcdGlmKCFpbnZhbGlkRnVuY3Rpb24oY2FsbEJhY2spKXtcblx0XHRcdHR5cGVDb21wYWN0b3JbdHlwZV0gPSBjYWxsQmFjaztcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIGRpc3BhdGNoTmV4dFxuXHQgKlxuXHQgKiBAcGFyYW0gZnJvbVJlbGVhc2VDYWxsQmFja3M6IGhhY2sgdG8gcHJldmVudCB0b28gbWFueSByZWN1cnNpdmUgY2FsbHMgb24gcmVsZWFzZUNhbGxCYWNrc1xuXHQgKiBAcmV0dXJuIHtCb29sZWFufVxuXHQgKi9cblx0ZnVuY3Rpb24gZGlzcGF0Y2hOZXh0KGZyb21SZWxlYXNlQ2FsbEJhY2tzKXtcblx0XHRpZihsZXZlbCA+IDApIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0Y29uc3QgY2hhbm5lbE5hbWUgPSBleGVjdXRpb25RdWV1ZS5mcm9udCgpO1xuXHRcdGlmKHR5cGVvZiBjaGFubmVsTmFtZSAhPSAndW5kZWZpbmVkJyl7XG5cdFx0XHRzZWxmLmJsb2NrQ2FsbEJhY2tzKCk7XG5cdFx0XHR0cnl7XG5cdFx0XHRcdGxldCBtZXNzYWdlO1xuXHRcdFx0XHRpZighY2hhbm5lbHNTdG9yYWdlW2NoYW5uZWxOYW1lXS5pc0VtcHR5KCkpIHtcblx0XHRcdFx0XHRtZXNzYWdlID0gY2hhbm5lbHNTdG9yYWdlW2NoYW5uZWxOYW1lXS5mcm9udCgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmKHR5cGVvZiBtZXNzYWdlID09ICd1bmRlZmluZWQnKXtcblx0XHRcdFx0XHRpZighY2hhbm5lbHNTdG9yYWdlW2NoYW5uZWxOYW1lXS5pc0VtcHR5KCkpe1xuXHRcdFx0XHRcdFx0d3ByaW50KFwiQ2FuJ3QgdXNlIGFzIG1lc3NhZ2UgaW4gYSBwdWIvc3ViIGNoYW5uZWwgdGhpcyBvYmplY3Q6IFwiICsgbWVzc2FnZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGV4ZWN1dGlvblF1ZXVlLnBvcCgpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmKHR5cGVvZiBtZXNzYWdlLl9fdHJhbnNtaXNpb25JbmRleCA9PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdFx0XHRtZXNzYWdlLl9fdHJhbnNtaXNpb25JbmRleCA9IDA7XG5cdFx0XHRcdFx0XHRmb3IodmFyIGkgPSBjaGFubmVsU3Vic2NyaWJlcnNbY2hhbm5lbE5hbWVdLmxlbmd0aC0xOyBpID49IDAgOyBpLS0pe1xuXHRcdFx0XHRcdFx0XHR2YXIgc3Vic2NyaWJlciA9ICBjaGFubmVsU3Vic2NyaWJlcnNbY2hhbm5lbE5hbWVdW2ldO1xuXHRcdFx0XHRcdFx0XHRpZihzdWJzY3JpYmVyLmZvckRlbGV0ZSA9PT0gdHJ1ZSl7XG5cdFx0XHRcdFx0XHRcdFx0Y2hhbm5lbFN1YnNjcmliZXJzW2NoYW5uZWxOYW1lXS5zcGxpY2UoaSwxKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZXtcblx0XHRcdFx0XHRcdG1lc3NhZ2UuX190cmFuc21pc2lvbkluZGV4Kys7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vVE9ETzogZm9yIGltbXV0YWJsZSBvYmplY3RzIGl0IHdpbGwgbm90IHdvcmsgYWxzbywgZml4IGZvciBzaGFwZSBtb2RlbHNcblx0XHRcdFx0XHRpZih0eXBlb2YgbWVzc2FnZS5fX3RyYW5zbWlzaW9uSW5kZXggPT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0XHRcdFx0d3ByaW50KFwiQ2FuJ3QgdXNlIGFzIG1lc3NhZ2UgaW4gYSBwdWIvc3ViIGNoYW5uZWwgdGhpcyBvYmplY3Q6IFwiICsgbWVzc2FnZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHN1YnNjcmliZXIgPSBjaGFubmVsU3Vic2NyaWJlcnNbY2hhbm5lbE5hbWVdW21lc3NhZ2UuX190cmFuc21pc2lvbkluZGV4XTtcblx0XHRcdFx0XHRpZih0eXBlb2Ygc3Vic2NyaWJlciA9PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdFx0XHRkZWxldGUgbWVzc2FnZS5fX3RyYW5zbWlzaW9uSW5kZXg7XG5cdFx0XHRcdFx0XHRjaGFubmVsc1N0b3JhZ2VbY2hhbm5lbE5hbWVdLnBvcCgpO1xuXHRcdFx0XHRcdH0gZWxzZXtcblx0XHRcdFx0XHRcdGlmKHN1YnNjcmliZXIuZmlsdGVyID09PSBudWxsIHx8IHR5cGVvZiBzdWJzY3JpYmVyLmZpbHRlciA9PT0gXCJ1bmRlZmluZWRcIiB8fCAoIWludmFsaWRGdW5jdGlvbihzdWJzY3JpYmVyLmZpbHRlcikgJiYgc3Vic2NyaWJlci5maWx0ZXIobWVzc2FnZSkpKXtcblx0XHRcdFx0XHRcdFx0aWYoIXN1YnNjcmliZXIuZm9yRGVsZXRlKXtcblx0XHRcdFx0XHRcdFx0XHRzdWJzY3JpYmVyLmNhbGxCYWNrKG1lc3NhZ2UpO1xuXHRcdFx0XHRcdFx0XHRcdGlmKHN1YnNjcmliZXIud2FpdEZvck1vcmUgJiYgIWludmFsaWRGdW5jdGlvbihzdWJzY3JpYmVyLndhaXRGb3JNb3JlKSAmJiAhc3Vic2NyaWJlci53YWl0Rm9yTW9yZShtZXNzYWdlKSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRzdWJzY3JpYmVyLmZvckRlbGV0ZSA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGNhdGNoKGVycil7XG5cdFx0XHRcdHdwcmludChcIkV2ZW50IGNhbGxiYWNrIGZhaWxlZDogXCIrIHN1YnNjcmliZXIuY2FsbEJhY2sgK1wiZXJyb3I6IFwiICsgZXJyLnN0YWNrKTtcblx0XHRcdH1cblx0XHRcdC8vXG5cdFx0XHRpZihmcm9tUmVsZWFzZUNhbGxCYWNrcyl7XG5cdFx0XHRcdGxldmVsLS07XG5cdFx0XHR9IGVsc2V7XG5cdFx0XHRcdHNlbGYucmVsZWFzZUNhbGxCYWNrcygpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNle1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGNvbXBhY3RBbmRTdG9yZSh0YXJnZXQsIG1lc3NhZ2Upe1xuXHRcdHZhciBnb3RDb21wYWN0ZWQgPSBmYWxzZTtcblx0XHR2YXIgYXJyID0gY2hhbm5lbHNTdG9yYWdlW3RhcmdldF07XG5cdFx0aWYodHlwZW9mIGFyciA9PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRhcnIgPSBuZXcgUXVldWUoKTtcblx0XHRcdGNoYW5uZWxzU3RvcmFnZVt0YXJnZXRdID0gYXJyO1xuXHRcdH1cblxuXHRcdGlmKG1lc3NhZ2UgJiYgdHlwZW9mIG1lc3NhZ2UudHlwZSAhPSAndW5kZWZpbmVkJyl7XG5cdFx0XHR2YXIgdHlwZUNvbXBhY3RvckNhbGxCYWNrID0gdHlwZUNvbXBhY3RvclttZXNzYWdlLnR5cGVdO1xuXG5cdFx0XHRpZih0eXBlb2YgdHlwZUNvbXBhY3RvckNhbGxCYWNrICE9ICd1bmRlZmluZWQnKXtcblx0XHRcdFx0Zm9yKGxldCBjaGFubmVsIG9mIGFycikge1xuXHRcdFx0XHRcdGlmKHR5cGVDb21wYWN0b3JDYWxsQmFjayhtZXNzYWdlLCBjaGFubmVsKSA9PT0gY2hhbm5lbCkge1xuXHRcdFx0XHRcdFx0aWYodHlwZW9mIGNoYW5uZWwuX190cmFuc21pc2lvbkluZGV4ID09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdFx0XHRcdGdvdENvbXBhY3RlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmKCFnb3RDb21wYWN0ZWQgJiYgbWVzc2FnZSl7XG5cdFx0XHRhcnIucHVzaChtZXNzYWdlKTtcblx0XHRcdGV4ZWN1dGlvblF1ZXVlLnB1c2godGFyZ2V0KTtcblx0XHR9XG5cdH1cblxuXHR2YXIgYWZ0ZXJFdmVudHNDYWxscyA9IG5ldyBRdWV1ZSgpO1xuXHRmdW5jdGlvbiBjYWxsQWZ0ZXJBbGxFdmVudHMgKCl7XG5cdFx0aWYoIWFmdGVyRXZlbnRzQ2FsbHMuaXNFbXB0eSgpKXtcblx0XHRcdHZhciBjYWxsQmFjayA9IGFmdGVyRXZlbnRzQ2FsbHMucG9wKCk7XG5cdFx0XHQvL2RvIG5vdCBjYXRjaCBleGNlcHRpb25zIGhlcmUuLlxuXHRcdFx0Y2FsbEJhY2soKTtcblx0XHR9XG5cdFx0cmV0dXJuICFhZnRlckV2ZW50c0NhbGxzLmlzRW1wdHkoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGludmFsaWRDaGFubmVsTmFtZShuYW1lKXtcblx0XHR2YXIgcmVzdWx0ID0gZmFsc2U7XG5cdFx0aWYoIW5hbWUgfHwgKHR5cGVvZiBuYW1lICE9IFwic3RyaW5nXCIgJiYgdHlwZW9mIG5hbWUgIT0gXCJudW1iZXJcIikpe1xuXHRcdFx0cmVzdWx0ID0gdHJ1ZTtcblx0XHRcdHdwcmludChcIkludmFsaWQgY2hhbm5lbCBuYW1lOiBcIiArIG5hbWUpO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnZhbGlkTWVzc2FnZVR5cGUobWVzc2FnZSl7XG5cdFx0dmFyIHJlc3VsdCA9IGZhbHNlO1xuXHRcdGlmKCFtZXNzYWdlIHx8IHR5cGVvZiBtZXNzYWdlICE9IFwib2JqZWN0XCIpe1xuXHRcdFx0cmVzdWx0ID0gdHJ1ZTtcblx0XHRcdHdwcmludChcIkludmFsaWQgbWVzc2FnZXMgdHlwZXM6IFwiICsgbWVzc2FnZSk7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnZhbGlkRnVuY3Rpb24oY2FsbGJhY2spe1xuXHRcdHZhciByZXN1bHQgPSBmYWxzZTtcblx0XHRpZighY2FsbGJhY2sgfHwgdHlwZW9mIGNhbGxiYWNrICE9IFwiZnVuY3Rpb25cIil7XG5cdFx0XHRyZXN1bHQgPSB0cnVlO1xuXHRcdFx0d3ByaW50KFwiRXhwZWN0ZWQgdG8gYmUgZnVuY3Rpb24gYnV0IGlzOiBcIiArIGNhbGxiYWNrKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxufVxuXG5leHBvcnRzLnNvdW5kUHViU3ViID0gbmV3IFNvdW5kUHViU3ViKCk7IiwiZnVuY3Rpb24gcHJvZHVjdChhcmdzKSB7XG4gICAgaWYoIWFyZ3MubGVuZ3RoKXtcbiAgICAgICAgcmV0dXJuIFsgW10gXTtcbiAgICB9XG4gICAgdmFyIHByb2QgPSBwcm9kdWN0KGFyZ3Muc2xpY2UoMSkpLCByID0gW107XG4gICAgYXJnc1swXS5mb3JFYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcHJvZC5mb3JFYWNoKGZ1bmN0aW9uKHApIHtcbiAgICAgICAgICAgIHIucHVzaChbIHggXS5jb25jYXQocCkpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcjtcbn1cblxuZnVuY3Rpb24gb2JqZWN0UHJvZHVjdChvYmopIHtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaiksXG4gICAgICAgIHZhbHVlcyA9IGtleXMubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG9ialt4XTsgfSk7XG5cbiAgICByZXR1cm4gcHJvZHVjdCh2YWx1ZXMpLm1hcChmdW5jdGlvbihwKSB7XG4gICAgICAgIHZhciBlID0ge307XG4gICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrLCBuKSB7IGVba10gPSBwW25dOyB9KTtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gb2JqZWN0UHJvZHVjdDsiLCJ2YXIgbWV0YSA9IFwibWV0YVwiO1xuXG5mdW5jdGlvbiBPd00oc2VyaWFsaXplZCl7XG5cbiAgICBpZihzZXJpYWxpemVkKXtcbiAgICAgICAgcmV0dXJuIE93TS5wcm90b3R5cGUuY29udmVydChzZXJpYWxpemVkKTtcbiAgICB9XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgbWV0YSwge1xuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIHZhbHVlOiB7fVxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwic2V0TWV0YVwiLCB7XG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTpmYWxzZSxcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKHByb3AsIHZhbHVlKXtcbiAgICAgICAgICAgIGlmKHR5cGVvZiBwcm9wID09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHZhbHVlID09IFwidW5kZWZpbmVkXCIpe1xuICAgICAgICAgICAgICAgIGZvcih2YXIgcCBpbiBwcm9wKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1ttZXRhXVtwXSA9IHByb3BbcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpc1ttZXRhXVtwcm9wXSA9IHZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJnZXRNZXRhXCIsIHtcbiAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24ocHJvcCl7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1ttZXRhXVtwcm9wXTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiB0ZXN0T3dNU2VyaWFsaXphdGlvbihvYmope1xuICAgIGxldCByZXMgPSBmYWxzZTtcblxuICAgIGlmKG9iail7XG4gICAgICAgIHJlcyA9IHR5cGVvZiBvYmpbbWV0YV0gIT0gXCJ1bmRlZmluZWRcIiAmJiAhKG9iaiBpbnN0YW5jZW9mIE93TSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbn1cblxuT3dNLnByb3RvdHlwZS5jb252ZXJ0ID0gZnVuY3Rpb24oc2VyaWFsaXplZCl7XG4gICAgY29uc3Qgb3dtID0gbmV3IE93TSgpO1xuXG4gICAgZm9yKHZhciBtZXRhUHJvcCBpbiBzZXJpYWxpemVkLm1ldGEpe1xuICAgICAgICBpZighdGVzdE93TVNlcmlhbGl6YXRpb24oc2VyaWFsaXplZFttZXRhUHJvcF0pKSB7XG4gICAgICAgICAgICBvd20uc2V0TWV0YShtZXRhUHJvcCwgc2VyaWFsaXplZC5tZXRhW21ldGFQcm9wXSk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgb3dtLnNldE1ldGEobWV0YVByb3AsIE93TS5wcm90b3R5cGUuY29udmVydChzZXJpYWxpemVkLm1ldGFbbWV0YVByb3BdKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IodmFyIHNpbXBsZVByb3AgaW4gc2VyaWFsaXplZCl7XG4gICAgICAgIGlmKHNpbXBsZVByb3AgPT09IG1ldGEpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoIXRlc3RPd01TZXJpYWxpemF0aW9uKHNlcmlhbGl6ZWRbc2ltcGxlUHJvcF0pKXtcbiAgICAgICAgICAgIG93bVtzaW1wbGVQcm9wXSA9IHNlcmlhbGl6ZWRbc2ltcGxlUHJvcF07XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgb3dtW3NpbXBsZVByb3BdID0gT3dNLnByb3RvdHlwZS5jb252ZXJ0KHNlcmlhbGl6ZWRbc2ltcGxlUHJvcF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG93bTtcbn07XG5cbk93TS5wcm90b3R5cGUuZ2V0TWV0YUZyb20gPSBmdW5jdGlvbihvYmosIG5hbWUpe1xuICAgIHZhciByZXM7XG4gICAgaWYoIW5hbWUpe1xuICAgICAgICByZXMgPSBvYmpbbWV0YV07XG4gICAgfWVsc2V7XG4gICAgICAgIHJlcyA9IG9ialttZXRhXVtuYW1lXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn07XG5cbk93TS5wcm90b3R5cGUuc2V0TWV0YUZvciA9IGZ1bmN0aW9uKG9iaiwgbmFtZSwgdmFsdWUpe1xuICAgIG9ialttZXRhXVtuYW1lXSA9IHZhbHVlO1xuICAgIHJldHVybiBvYmpbbWV0YV1bbmFtZV07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE93TTsiLCJmdW5jdGlvbiBRdWV1ZUVsZW1lbnQoY29udGVudCkge1xuXHR0aGlzLmNvbnRlbnQgPSBjb250ZW50O1xuXHR0aGlzLm5leHQgPSBudWxsO1xufVxuXG5mdW5jdGlvbiBRdWV1ZSgpIHtcblx0dGhpcy5oZWFkID0gbnVsbDtcblx0dGhpcy50YWlsID0gbnVsbDtcblx0dGhpcy5sZW5ndGggPSAwO1xuXHR0aGlzLnB1c2ggPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRjb25zdCBuZXdFbGVtZW50ID0gbmV3IFF1ZXVlRWxlbWVudCh2YWx1ZSk7XG5cdFx0aWYgKCF0aGlzLmhlYWQpIHtcblx0XHRcdHRoaXMuaGVhZCA9IG5ld0VsZW1lbnQ7XG5cdFx0XHR0aGlzLnRhaWwgPSBuZXdFbGVtZW50O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnRhaWwubmV4dCA9IG5ld0VsZW1lbnQ7XG5cdFx0XHR0aGlzLnRhaWwgPSBuZXdFbGVtZW50O1xuXHRcdH1cblx0XHR0aGlzLmxlbmd0aCsrO1xuXHR9O1xuXG5cdHRoaXMucG9wID0gZnVuY3Rpb24gKCkge1xuXHRcdGlmICghdGhpcy5oZWFkKSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0Y29uc3QgaGVhZENvcHkgPSB0aGlzLmhlYWQ7XG5cdFx0dGhpcy5oZWFkID0gdGhpcy5oZWFkLm5leHQ7XG5cdFx0dGhpcy5sZW5ndGgtLTtcblxuXHRcdC8vZml4Pz8/Pz8/P1xuXHRcdGlmKHRoaXMubGVuZ3RoID09PSAwKXtcbiAgICAgICAgICAgIHRoaXMudGFpbCA9IG51bGw7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGhlYWRDb3B5LmNvbnRlbnQ7XG5cdH07XG5cblx0dGhpcy5mcm9udCA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5oZWFkID8gdGhpcy5oZWFkLmNvbnRlbnQgOiB1bmRlZmluZWQ7XG5cdH07XG5cblx0dGhpcy5pc0VtcHR5ID0gZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLmhlYWQgPT09IG51bGw7XG5cdH07XG5cblx0dGhpc1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24qICgpIHtcblx0XHRsZXQgaGVhZCA9IHRoaXMuaGVhZDtcblx0XHR3aGlsZShoZWFkICE9PSBudWxsKSB7XG5cdFx0XHR5aWVsZCBoZWFkLmNvbnRlbnQ7XG5cdFx0XHRoZWFkID0gaGVhZC5uZXh0O1xuXHRcdH1cblx0fS5iaW5kKHRoaXMpO1xufVxuXG5RdWV1ZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG5cdGxldCBzdHJpbmdpZmllZFF1ZXVlID0gJyc7XG5cdGxldCBpdGVyYXRvciA9IHRoaXMuaGVhZDtcblx0d2hpbGUgKGl0ZXJhdG9yKSB7XG5cdFx0c3RyaW5naWZpZWRRdWV1ZSArPSBgJHtKU09OLnN0cmluZ2lmeShpdGVyYXRvci5jb250ZW50KX0gYDtcblx0XHRpdGVyYXRvciA9IGl0ZXJhdG9yLm5leHQ7XG5cdH1cblx0cmV0dXJuIHN0cmluZ2lmaWVkUXVldWU7XG59O1xuXG5RdWV1ZS5wcm90b3R5cGUuaW5zcGVjdCA9IFF1ZXVlLnByb3RvdHlwZS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBRdWV1ZTsiLCJjb25zdCBPd00gPSByZXF1aXJlKFwiLi9Pd01cIik7XG5cbi8qXG4gICAgUHJlcGFyZSB0aGUgc3RhdGUgb2YgYSBzd2FybSB0byBiZSBzZXJpYWxpc2VkXG4qL1xuXG5leHBvcnRzLmFzSlNPTiA9IGZ1bmN0aW9uKHZhbHVlT2JqLCBwaGFzZU5hbWUsIGFyZ3MsIGNhbGxiYWNrKXtcblxuICAgICAgICBsZXQgdmFsdWVPYmplY3QgPSB2YWx1ZU9iai52YWx1ZU9mKCk7XG4gICAgICAgIGxldCByZXMgPSBuZXcgT3dNKCk7XG4gICAgICAgIHJlcy5wdWJsaWNWYXJzICAgICAgICAgID0gdmFsdWVPYmplY3QucHVibGljVmFycztcbiAgICAgICAgcmVzLnByaXZhdGVWYXJzICAgICAgICAgPSB2YWx1ZU9iamVjdC5wcml2YXRlVmFycztcblxuICAgICAgICByZXMuc2V0TWV0YShcInN3YXJtVHlwZU5hbWVcIiwgT3dNLnByb3RvdHlwZS5nZXRNZXRhRnJvbSh2YWx1ZU9iamVjdCwgXCJzd2FybVR5cGVOYW1lXCIpKTtcbiAgICAgICAgcmVzLnNldE1ldGEoXCJzd2FybUlkXCIsICAgICAgIE93TS5wcm90b3R5cGUuZ2V0TWV0YUZyb20odmFsdWVPYmplY3QsIFwic3dhcm1JZFwiKSk7XG4gICAgICAgIHJlcy5zZXRNZXRhKFwidGFyZ2V0XCIsICAgICAgICBPd00ucHJvdG90eXBlLmdldE1ldGFGcm9tKHZhbHVlT2JqZWN0LCBcInRhcmdldFwiKSk7XG4gICAgICAgIHJlcy5zZXRNZXRhKFwiaG9tZVNlY3VyaXR5Q29udGV4dFwiLCAgICAgICAgT3dNLnByb3RvdHlwZS5nZXRNZXRhRnJvbSh2YWx1ZU9iamVjdCwgXCJob21lU2VjdXJpdHlDb250ZXh0XCIpKTtcbiAgICAgICAgcmVzLnNldE1ldGEoXCJyZXF1ZXN0SWRcIiwgICAgICAgIE93TS5wcm90b3R5cGUuZ2V0TWV0YUZyb20odmFsdWVPYmplY3QsIFwicmVxdWVzdElkXCIpKTtcblxuICAgICAgICBpZighcGhhc2VOYW1lKXtcbiAgICAgICAgICAgIHJlcy5zZXRNZXRhKFwiY29tbWFuZFwiLCBcInN0b3JlZFwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlcy5zZXRNZXRhKFwicGhhc2VOYW1lXCIsIHBoYXNlTmFtZSk7XG4gICAgICAgICAgICByZXMuc2V0TWV0YShcInBoYXNlSWRcIiwgJCQudWlkR2VuZXJhdG9yLnNhZmVfdXVpZCgpKTtcbiAgICAgICAgICAgIHJlcy5zZXRNZXRhKFwiYXJnc1wiLCBhcmdzKTtcbiAgICAgICAgICAgIHJlcy5zZXRNZXRhKFwiY29tbWFuZFwiLCBPd00ucHJvdG90eXBlLmdldE1ldGFGcm9tKHZhbHVlT2JqZWN0LCBcImNvbW1hbmRcIikgfHwgXCJleGVjdXRlU3dhcm1QaGFzZVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcy5zZXRNZXRhKFwid2FpdFN0YWNrXCIsIHZhbHVlT2JqZWN0Lm1ldGEud2FpdFN0YWNrKTsgLy9UT0RPOiB0aGluayBpZiBpcyBub3QgYmV0dGVyIHRvIGJlIGRlZXAgY2xvbmVkIGFuZCBub3QgcmVmZXJlbmNlZCEhIVxuXG4gICAgICAgIGlmKGNhbGxiYWNrKXtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgICAgICB9XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJhc0pTT046XCIsIHJlcywgdmFsdWVPYmplY3QpO1xuICAgICAgICByZXR1cm4gcmVzO1xufTtcblxuZXhwb3J0cy5qc29uVG9OYXRpdmUgPSBmdW5jdGlvbihzZXJpYWxpc2VkVmFsdWVzLCByZXN1bHQpe1xuXG4gICAgZm9yKGxldCB2IGluIHNlcmlhbGlzZWRWYWx1ZXMucHVibGljVmFycyl7XG4gICAgICAgIHJlc3VsdC5wdWJsaWNWYXJzW3ZdID0gc2VyaWFsaXNlZFZhbHVlcy5wdWJsaWNWYXJzW3ZdO1xuXG4gICAgfTtcbiAgICBmb3IobGV0IGwgaW4gc2VyaWFsaXNlZFZhbHVlcy5wcml2YXRlVmFycyl7XG4gICAgICAgIHJlc3VsdC5wcml2YXRlVmFyc1tsXSA9IHNlcmlhbGlzZWRWYWx1ZXMucHJpdmF0ZVZhcnNbbF07XG4gICAgfTtcblxuICAgIGZvcihsZXQgaSBpbiBPd00ucHJvdG90eXBlLmdldE1ldGFGcm9tKHNlcmlhbGlzZWRWYWx1ZXMpKXtcbiAgICAgICAgT3dNLnByb3RvdHlwZS5zZXRNZXRhRm9yKHJlc3VsdCwgaSwgT3dNLnByb3RvdHlwZS5nZXRNZXRhRnJvbShzZXJpYWxpc2VkVmFsdWVzLCBpKSk7XG4gICAgfTtcblxufTsiLCJ2YXIgY29tbWFuZHMgPSB7fTtcbnZhciBjb21tYW5kc19oZWxwID0ge307XG5cbi8vZ2xvYmFsIGZ1bmN0aW9uIGFkZENvbW1hbmRcbmFkZENvbW1hbmQgPSBmdW5jdGlvbiBhZGRDb21tYW5kKHZlcmIsIGFkdmVyYmUsIGZ1bmN0LCBoZWxwTGluZSl7XG4gICAgdmFyIGNtZElkO1xuICAgIGlmKCFoZWxwTGluZSl7XG4gICAgICAgIGhlbHBMaW5lID0gXCIgXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaGVscExpbmUgPSBcIiBcIiArIGhlbHBMaW5lO1xuICAgIH1cbiAgICBpZihhZHZlcmJlKXtcbiAgICAgICAgY21kSWQgPSB2ZXJiICsgXCIgXCIgKyAgYWR2ZXJiZTtcbiAgICAgICAgaGVscExpbmUgPSB2ZXJiICsgXCIgXCIgKyAgYWR2ZXJiZSArIGhlbHBMaW5lO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNtZElkID0gdmVyYjtcbiAgICAgICAgaGVscExpbmUgPSB2ZXJiICsgaGVscExpbmU7XG4gICAgfVxuICAgIGNvbW1hbmRzW2NtZElkXSA9IGZ1bmN0O1xuICAgICAgICBjb21tYW5kc19oZWxwW2NtZElkXSA9IGhlbHBMaW5lO1xufTtcblxuZnVuY3Rpb24gZG9IZWxwKCl7XG4gICAgY29uc29sZS5sb2coXCJMaXN0IG9mIGNvbW1hbmRzOlwiKTtcbiAgICBmb3IodmFyIGwgaW4gY29tbWFuZHNfaGVscCl7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiXFx0XCIsIGNvbW1hbmRzX2hlbHBbbF0pO1xuICAgIH1cbn1cblxuYWRkQ29tbWFuZChcIi1oXCIsIG51bGwsIGRvSGVscCwgXCJcXHRcXHRcXHRcXHRcXHRcXHQgfGp1c3QgcHJpbnQgdGhlIGhlbHBcIik7XG5hZGRDb21tYW5kKFwiLz9cIiwgbnVsbCwgZG9IZWxwLCBcIlxcdFxcdFxcdFxcdFxcdFxcdCB8anVzdCBwcmludCB0aGUgaGVscFwiKTtcbmFkZENvbW1hbmQoXCJoZWxwXCIsIG51bGwsIGRvSGVscCwgXCJcXHRcXHRcXHRcXHRcXHRcXHQgfGp1c3QgcHJpbnQgdGhlIGhlbHBcIik7XG5cblxuZnVuY3Rpb24gcnVuQ29tbWFuZCgpe1xuICB2YXIgYXJndiA9IE9iamVjdC5hc3NpZ24oW10sIHByb2Nlc3MuYXJndik7XG4gIHZhciBjbWRJZCA9IG51bGw7XG4gIHZhciBjbWQgPSBudWxsO1xuICBhcmd2LnNoaWZ0KCk7XG4gIGFyZ3Yuc2hpZnQoKTtcblxuICBpZihhcmd2Lmxlbmd0aCA+PTEpe1xuICAgICAgY21kSWQgPSBhcmd2WzBdO1xuICAgICAgY21kID0gY29tbWFuZHNbY21kSWRdO1xuICAgICAgYXJndi5zaGlmdCgpO1xuICB9XG5cblxuICBpZighY21kICYmIGFyZ3YubGVuZ3RoID49MSl7XG4gICAgICBjbWRJZCA9IGNtZElkICsgXCIgXCIgKyBhcmd2WzBdO1xuICAgICAgY21kID0gY29tbWFuZHNbY21kSWRdO1xuICAgICAgYXJndi5zaGlmdCgpO1xuICB9XG5cbiAgaWYoIWNtZCl7XG4gICAgaWYoY21kSWQpe1xuICAgICAgICBjb25zb2xlLmxvZyhcIlVua25vd24gY29tbWFuZDogXCIsIGNtZElkKTtcbiAgICB9XG4gICAgY21kID0gZG9IZWxwO1xuICB9XG5cbiAgY21kLmFwcGx5KG51bGwsYXJndik7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcnVuQ29tbWFuZFxufTtcblxuIiwiXG5mdW5jdGlvbiBlbmNvZGUoYnVmZmVyKSB7XG4gICAgcmV0dXJuIGJ1ZmZlci50b1N0cmluZygnYmFzZTY0JylcbiAgICAgICAgLnJlcGxhY2UoL1xcKy9nLCAnJylcbiAgICAgICAgLnJlcGxhY2UoL1xcLy9nLCAnJylcbiAgICAgICAgLnJlcGxhY2UoLz0rJC8sICcnKTtcbn07XG5cbmZ1bmN0aW9uIHN0YW1wV2l0aFRpbWUoYnVmLCBzYWx0LCBtc2FsdCl7XG4gICAgaWYoIXNhbHQpe1xuICAgICAgICBzYWx0ID0gMTtcbiAgICB9XG4gICAgaWYoIW1zYWx0KXtcbiAgICAgICAgbXNhbHQgPSAxO1xuICAgIH1cbiAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlO1xuICAgIHZhciBjdCA9IE1hdGguZmxvb3IoZGF0ZS5nZXRUaW1lKCkgLyBzYWx0KTtcbiAgICB2YXIgY291bnRlciA9IDA7XG4gICAgd2hpbGUoY3QgPiAwICl7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJDb3VudGVyXCIsIGNvdW50ZXIsIGN0KTtcbiAgICAgICAgYnVmW2NvdW50ZXIqbXNhbHRdID0gTWF0aC5mbG9vcihjdCAlIDI1Nik7XG4gICAgICAgIGN0ID0gTWF0aC5mbG9vcihjdCAvIDI1Nik7XG4gICAgICAgIGNvdW50ZXIrKztcbiAgICB9XG59XG5cbi8qXG4gICAgVGhlIHVpZCBjb250YWlucyBhcm91bmQgMjU2IGJpdHMgb2YgcmFuZG9tbmVzcyBhbmQgYXJlIHVuaXF1ZSBhdCB0aGUgbGV2ZWwgb2Ygc2Vjb25kcy4gVGhpcyBVVUlEIHNob3VsZCBieSBjcnlwdG9ncmFwaGljYWxseSBzYWZlIChjYW4gbm90IGJlIGd1ZXNzZWQpXG5cbiAgICBXZSBnZW5lcmF0ZSBhIHNhZmUgVUlEIHRoYXQgaXMgZ3VhcmFudGVlZCB1bmlxdWUgKGJ5IHVzYWdlIG9mIGEgUFJORyB0byBnZW5lYXRlIDI1NiBiaXRzKSBhbmQgdGltZSBzdGFtcGluZyB3aXRoIHRoZSBudW1iZXIgb2Ygc2Vjb25kcyBhdCB0aGUgbW9tZW50IHdoZW4gaXMgZ2VuZXJhdGVkXG4gICAgVGhpcyBtZXRob2Qgc2hvdWxkIGJlIHNhZmUgdG8gdXNlIGF0IHRoZSBsZXZlbCBvZiB2ZXJ5IGxhcmdlIGRpc3RyaWJ1dGVkIHN5c3RlbXMuXG4gICAgVGhlIFVVSUQgaXMgc3RhbXBlZCB3aXRoIHRpbWUgKHNlY29uZHMpOiBkb2VzIGl0IG9wZW4gYSB3YXkgdG8gZ3Vlc3MgdGhlIFVVSUQ/IEl0IGRlcGVuZHMgaG93IHNhZmUgaXMgXCJjcnlwdG9cIiBQUk5HLCBidXQgaXQgc2hvdWxkIGJlIG5vIHByb2JsZW0uLi5cblxuICovXG5cbnZhciBnZW5lcmF0ZVVpZCA9IG51bGw7XG5cblxuZXhwb3J0cy5pbml0ID0gZnVuY3Rpb24oZXh0ZXJuYWxHZW5lcmF0b3Ipe1xuICAgIGdlbmVyYXRlVWlkID0gZXh0ZXJuYWxHZW5lcmF0b3IuZ2VuZXJhdGVVaWQ7XG4gICAgcmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufTtcblxuZXhwb3J0cy5zYWZlX3V1aWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYnVmID0gZ2VuZXJhdGVVaWQoMzIpO1xuICAgIHN0YW1wV2l0aFRpbWUoYnVmLCAxMDAwLCAzKTtcbiAgICByZXR1cm4gZW5jb2RlKGJ1Zik7XG59O1xuXG5cblxuLypcbiAgICBUcnkgdG8gZ2VuZXJhdGUgYSBzbWFsbCBVSUQgdGhhdCBpcyB1bmlxdWUgYWdhaW5zdCBjaGFuY2UgaW4gdGhlIHNhbWUgbWlsbGlzZWNvbmQgc2Vjb25kIGFuZCBpbiBhIHNwZWNpZmljIGNvbnRleHQgKGVnIGluIHRoZSBzYW1lIGNob3Jlb2dyYXBoeSBleGVjdXRpb24pXG4gICAgVGhlIGlkIGNvbnRhaW5zIGFyb3VuZCA2KjggPSA0OCAgYml0cyBvZiByYW5kb21uZXNzIGFuZCBhcmUgdW5pcXVlIGF0IHRoZSBsZXZlbCBvZiBtaWxsaXNlY29uZHNcbiAgICBUaGlzIG1ldGhvZCBpcyBzYWZlIG9uIGEgc2luZ2xlIGNvbXB1dGVyIGJ1dCBzaG91bGQgYmUgdXNlZCB3aXRoIGNhcmUgb3RoZXJ3aXNlXG4gICAgVGhpcyBVVUlEIGlzIG5vdCBjcnlwdG9ncmFwaGljYWxseSBzYWZlIChjYW4gYmUgZ3Vlc3NlZClcbiAqL1xuZXhwb3J0cy5zaG9ydF91dWlkID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICByZXF1aXJlKCdjcnlwdG8nKS5yYW5kb21CeXRlcygxMiwgZnVuY3Rpb24gKGVyciwgYnVmKSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3RhbXBXaXRoVGltZShidWYsMSwyKTtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgZW5jb2RlKGJ1ZikpO1xuICAgIH0pO1xufTsiLCJjb25zdCBjcnlwdG8gPSByZXF1aXJlKCdjcnlwdG8nKTtcbmNvbnN0IFF1ZXVlID0gcmVxdWlyZShcIi4vUXVldWVcIik7XG52YXIgUFNLQnVmZmVyID0gdHlwZW9mICQkICE9PSBcInVuZGVmaW5lZFwiICYmICQkLlBTS0J1ZmZlciA/ICQkLlBTS0J1ZmZlciA6IEJ1ZmZlcjtcblxuZnVuY3Rpb24gVWlkR2VuZXJhdG9yKG1pbkJ1ZmZlcnMsIGJ1ZmZlcnNTaXplKSB7XG5cdHZhciBidWZmZXJzID0gbmV3IFF1ZXVlKCk7XG5cdHZhciBsb3dMaW1pdCA9IC4yO1xuXG5cdGZ1bmN0aW9uIGZpbGxCdWZmZXJzKHNpemUpe1xuXHRcdC8vbm90aWZ5T2JzZXJ2ZXIoKTtcblx0XHRjb25zdCBzeiA9IHNpemUgfHwgbWluQnVmZmVycztcblx0XHRpZihidWZmZXJzLmxlbmd0aCA8IE1hdGguZmxvb3IobWluQnVmZmVycypsb3dMaW1pdCkpe1xuXHRcdFx0Zm9yKHZhciBpPTArYnVmZmVycy5sZW5ndGg7IGkgPCBzejsgaSsrKXtcblx0XHRcdFx0Z2VuZXJhdGVPbmVCdWZmZXIobnVsbCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZmlsbEJ1ZmZlcnMoKTtcblxuXHRmdW5jdGlvbiBnZW5lcmF0ZU9uZUJ1ZmZlcihiKXtcblx0XHRpZighYil7XG5cdFx0XHRiID0gUFNLQnVmZmVyLmFsbG9jKDApO1xuXHRcdH1cblx0XHRjb25zdCBzeiA9IGJ1ZmZlcnNTaXplIC0gYi5sZW5ndGg7XG5cdFx0LypjcnlwdG8ucmFuZG9tQnl0ZXMoc3osIGZ1bmN0aW9uIChlcnIsIHJlcykge1xuXHRcdFx0YnVmZmVycy5wdXNoKEJ1ZmZlci5jb25jYXQoW3JlcywgYl0pKTtcblx0XHRcdG5vdGlmeU9ic2VydmVyKCk7XG5cdFx0fSk7Ki9cblx0XHRidWZmZXJzLnB1c2goUFNLQnVmZmVyLmNvbmNhdChbIGNyeXB0by5yYW5kb21CeXRlcyhzeiksIGIgXSkpO1xuXHRcdG5vdGlmeU9ic2VydmVyKCk7XG5cdH1cblxuXHRmdW5jdGlvbiBleHRyYWN0TihuKXtcblx0XHR2YXIgc3ogPSBNYXRoLmZsb29yKG4gLyBidWZmZXJzU2l6ZSk7XG5cdFx0dmFyIHJldCA9IFtdO1xuXG5cdFx0Zm9yKHZhciBpPTA7IGk8c3o7IGkrKyl7XG5cdFx0XHRyZXQucHVzaChidWZmZXJzLnBvcCgpKTtcblx0XHRcdHNldFRpbWVvdXQoZ2VuZXJhdGVPbmVCdWZmZXIsIDEpO1xuXHRcdH1cblxuXG5cblx0XHR2YXIgcmVtYWluZGVyID0gbiAlIGJ1ZmZlcnNTaXplO1xuXHRcdGlmKHJlbWFpbmRlciA+IDApe1xuXHRcdFx0dmFyIGZyb250ID0gYnVmZmVycy5wb3AoKTtcblx0XHRcdHJldC5wdXNoKGZyb250LnNsaWNlKDAscmVtYWluZGVyKSk7XG5cdFx0XHQvL2dlbmVyYXRlT25lQnVmZmVyKGZyb250LnNsaWNlKHJlbWFpbmRlcikpO1xuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRnZW5lcmF0ZU9uZUJ1ZmZlcihmcm9udC5zbGljZShyZW1haW5kZXIpKTtcblx0XHRcdH0sMSk7XG5cdFx0fVxuXG5cdFx0Ly9zZXRUaW1lb3V0KGZpbGxCdWZmZXJzLCAxKTtcblxuXHRcdHJldHVybiBCdWZmZXIuY29uY2F0KHJldCk7XG5cdH1cblxuXHR2YXIgZmlsbEluUHJvZ3Jlc3MgPSBmYWxzZTtcblxuXHR0aGlzLmdlbmVyYXRlVWlkID0gZnVuY3Rpb24obil7XG5cdFx0dmFyIHRvdGFsU2l6ZSA9IGJ1ZmZlcnMubGVuZ3RoICogYnVmZmVyc1NpemU7XG5cdFx0aWYobiA8PSB0b3RhbFNpemUpe1xuXHRcdFx0cmV0dXJuIGV4dHJhY3ROKG4pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZighZmlsbEluUHJvZ3Jlc3Mpe1xuXHRcdFx0XHRmaWxsSW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRmaWxsQnVmZmVycyhNYXRoLmZsb29yKG1pbkJ1ZmZlcnMqMi41KSk7XG5cdFx0XHRcdFx0ZmlsbEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0fSwgMSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gY3J5cHRvLnJhbmRvbUJ5dGVzKG4pO1xuXHRcdH1cblx0fTtcblxuXHR2YXIgb2JzZXJ2ZXI7XG5cdHRoaXMucmVnaXN0ZXJPYnNlcnZlciA9IGZ1bmN0aW9uKG9icyl7XG5cdFx0aWYob2JzZXJ2ZXIpe1xuXHRcdFx0Y29uc29sZS5lcnJvcihuZXcgRXJyb3IoXCJPbmUgb2JzZXJ2ZXIgYWxsb3dlZCFcIikpO1xuXHRcdH1lbHNle1xuXHRcdFx0aWYodHlwZW9mIG9icyA9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0XHRvYnNlcnZlciA9IG9icztcblx0XHRcdFx0Ly9ub3RpZnlPYnNlcnZlcigpO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHRmdW5jdGlvbiBub3RpZnlPYnNlcnZlcigpe1xuXHRcdGlmKG9ic2VydmVyKXtcblx0XHRcdHZhciB2YWx1ZVRvUmVwb3J0ID0gYnVmZmVycy5sZW5ndGgqYnVmZmVyc1NpemU7XG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdG9ic2VydmVyKG51bGwsIHtcInNpemVcIjogdmFsdWVUb1JlcG9ydH0pO1xuXHRcdFx0fSwgMTApO1xuXHRcdH1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVVaWRHZW5lcmF0b3IgPSBmdW5jdGlvbiAobWluQnVmZmVycywgYnVmZmVyU2l6ZSkge1xuXHRyZXR1cm4gbmV3IFVpZEdlbmVyYXRvcihtaW5CdWZmZXJzLCBidWZmZXJTaXplKTtcbn07XG4iLCJ2YXIgbXEgPSAkJC5yZXF1aXJlKFwiZm9sZGVybXFcIik7XG5cbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5jb25zdCBjaGlsZF9wcm9jZXNzID0gcmVxdWlyZShcImNoaWxkX3Byb2Nlc3NcIik7XG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5cbmNvbnN0IFJFU1RBUlRfVElNRU9VVCA9IDUwMDtcbmNvbnN0IFJFU1RBUlRfVElNRU9VVF9MSU1JVCA9IDUwMDAwO1xuXG52YXIgc2FuZGJveGVzID0ge307XG52YXIgZXhpdEhhbmRsZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvZXhpdEhhbmRsZXJcIikoc2FuZGJveGVzKTtcblxudmFyIGJvb3RTYW5kQm94ID0gJCQuZmxvdy5kZXNjcmliZShcIlByaXZhdGVTa3kuc3dhcm0uZW5naW5lLmJvb3RJbkxhdW5jaGVyXCIsIHtcbiAgICBib290OmZ1bmN0aW9uKHNhbmRCb3gsIHNwYWNlTmFtZSwgZm9sZGVyLCBjb2RlRm9sZGVyLCBjYWxsYmFjayl7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiQm9vdGluZyBpbiBcIiwgZm9sZGVyLCBcIiBjb250ZXh0IFwiLCBzcGFjZU5hbWUpO1xuXG4gICAgICAgIHRoaXMuY2FsbGJhY2sgICA9IGNhbGxiYWNrO1xuICAgICAgICB0aGlzLmZvbGRlciAgICAgPSBmb2xkZXI7XG4gICAgICAgIHRoaXMuc3BhY2VOYW1lICA9IHNwYWNlTmFtZTtcbiAgICAgICAgdGhpcy5zYW5kQm94ICAgID0gc2FuZEJveDtcbiAgICAgICAgdGhpcy5jb2RlRm9sZGVyICAgID0gY29kZUZvbGRlcjtcbiAgICAgICAgdGhpcy50aW1lb3V0TXVsdGlwbGllciA9IDE7XG5cbiAgICAgICAgdmFyIHRhc2sgPSB0aGlzLnNlcmlhbCh0aGlzLmVuc3VyZUZvbGRlcnNFeGlzdHMpO1xuXG4gICAgICAgIHRhc2suZm9sZGVyU2hvdWxkRXhpc3QocGF0aC5qb2luKHRoaXMuZm9sZGVyLCBcIm1xXCIpLCAgICB0YXNrLnByb2dyZXNzKTtcbiAgICAgICAgdGFzay5mb2xkZXJTaG91bGRFeGlzdChwYXRoLmpvaW4odGhpcy5mb2xkZXIsIFwiY29kZVwiKSwgIHRhc2sucHJvZ3Jlc3MpO1xuICAgICAgICB0YXNrLmZvbGRlclNob3VsZEV4aXN0KHBhdGguam9pbih0aGlzLmZvbGRlciwgXCJ0bXBcIiksICAgdGFzay5wcm9ncmVzcyk7XG4gICAgfSxcbiAgICBmb2xkZXJTaG91bGRFeGlzdDogIGZ1bmN0aW9uKHBhdGgsIHByb2dyZXNzKXtcbiAgICAgICAgZnMubWtkaXIocGF0aCwge3JlY3Vyc2l2ZTogdHJ1ZX0sIHByb2dyZXNzKTtcbiAgICB9LFxuICAgIGNvcHlGb2xkZXI6IGZ1bmN0aW9uKHNvdXJjZVBhdGgsIHRhcmdldFBhdGgsIGNhbGxiYWNrKXtcbiAgICAgICAgbGV0IGZzRXh0ID0gcmVxdWlyZShcInV0aWxzXCIpLmZzRXh0O1xuICAgICAgICBmc0V4dC5jb3B5KHNvdXJjZVBhdGgsIHRhcmdldFBhdGgsIHtvdmVyd3JpdGU6IHRydWV9LCBjYWxsYmFjayk7XG4gICAgfSxcbiAgICBlbnN1cmVGb2xkZXJzRXhpc3RzOiBmdW5jdGlvbihlcnIsIHJlcyl7XG4gICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHRhc2sgPSB0aGlzLnBhcmFsbGVsKHRoaXMucnVuQ29kZSk7XG4gICAgICAgICAgICB0YXNrLmNvcHlGb2xkZXIocGF0aC5qb2luKHRoaXMuY29kZUZvbGRlciwgXCJidW5kbGVzXCIpLCBwYXRoLmpvaW4odGhpcy5mb2xkZXIsIFwiYnVuZGxlc1wiKSwgdGFzay5wcm9ncmVzcyk7XG4gICAgICAgICAgICB0aGlzLnNhbmRCb3guaW5ib3VuZCA9IG1xLmNyZWF0ZVF1ZShwYXRoLmpvaW4odGhpcy5mb2xkZXIsIFwibXEvaW5ib3VuZFwiKSwgdGFzay5wcm9ncmVzcyk7XG4gICAgICAgICAgICB0aGlzLnNhbmRCb3gub3V0Ym91bmQgPSBtcS5jcmVhdGVRdWUocGF0aC5qb2luKHRoaXMuZm9sZGVyLCBcIm1xL291dGJvdW5kXCIpLCB0YXNrLnByb2dyZXNzKTtcbiAgICAgICAgfVxuXG4gICAgfSxcbiAgICBydW5Db2RlOiBmdW5jdGlvbihlcnIsIHJlcyl7XG4gICAgICAgIGlmKCFlcnIpe1xuICAgICAgICAgICAgdmFyIG1haW5GaWxlID0gcGF0aC5qb2luKHByb2Nlc3MuZW52LlBSSVZBVEVTS1lfUk9PVF9GT0xERVIsIFwiY29yZVwiLCBcInNhbmRib3hlc1wiLCBcImFnZW50U2FuZGJveC5qc1wiKTtcbiAgICAgICAgICAgIHZhciBhcmdzID0gW3RoaXMuc3BhY2VOYW1lLCBwcm9jZXNzLmVudi5QUklWQVRFU0tZX1JPT1RfRk9MREVSLCBwYXRoLnJlc29sdmUocHJvY2Vzcy5lbnYuUFJJVkFURVNLWV9ET01BSU5fQlVJTEQpXTtcbiAgICAgICAgICAgIHZhciBvcHRzID0ge3N0ZGlvOiBbMCwgMSwgMiwgXCJpcGNcIl19O1xuXG4gICAgICAgICAgICB2YXIgc3RhcnRDaGlsZCA9IChtYWluRmlsZSwgYXJncywgb3B0cykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIlJ1bm5pbmc6IFwiLCBtYWluRmlsZSwgYXJncywgb3B0cyk7XG5cdFx0XHRcdHZhciBjaGlsZCA9IGNoaWxkX3Byb2Nlc3MuZm9yayhtYWluRmlsZSwgYXJncyk7XG5cdFx0XHRcdHNhbmRib3hlc1t0aGlzLnNwYWNlTmFtZV0gPSBjaGlsZDtcblxuXHRcdFx0XHR0aGlzLnNhbmRCb3guaW5ib3VuZC5zZXRJUENDaGFubmVsKGNoaWxkKTtcblx0XHRcdFx0dGhpcy5zYW5kQm94Lm91dGJvdW5kLnNldElQQ0NoYW5uZWwoY2hpbGQpO1xuXG5cdFx0XHRcdGNoaWxkLm9uKFwiZXhpdFwiLCAoY29kZSwgc2lnbmFsKT0+e1xuXHRcdFx0XHQgICAgaWYoY29kZSA9PT0gMCl7XG5cdFx0XHRcdCAgICAgICAgY29uc29sZS5sb2coYFNhbmRib3ggPCR7dGhpcy5zcGFjZU5hbWV9PiBzaHV0dGluZyBkb3duLmApO1xuXHRcdFx0XHQgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXHRcdFx0XHQgICAgbGV0IHRpbWVvdXQgPSAodGhpcy50aW1lb3V0TXVsdGlwbGllcipSRVNUQVJUX1RJTUVPVVQpICUgUkVTVEFSVF9USU1FT1VUX0xJTUlUO1xuXHRcdFx0XHQgICAgY29uc29sZS5sb2coYFNhbmRib3ggPCR7dGhpcy5zcGFjZU5hbWV9PiBleGl0cyB3aXRoIGNvZGUgJHtjb2RlfS4gUmVzdGFydGluZyBpbiAke3RpbWVvdXR9IG1zLmApO1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdFx0XHRcdHN0YXJ0Q2hpbGQobWFpbkZpbGUsIGFyZ3MsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lb3V0TXVsdGlwbGllciAqPSAxLjU7XG4gICAgICAgICAgICAgICAgICAgIH0sIHRpbWVvdXQpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRyZXR1cm4gY2hpbGQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrKG51bGwsIHN0YXJ0Q2hpbGQobWFpbkZpbGUsIGFyZ3MsIG9wdHMpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgZXhlY3V0aW5nIHNhbmRib3ghOlwiLCBlcnIpO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFjayhlcnIsIG51bGwpO1xuICAgICAgICB9XG4gICAgfVxuXG59KTtcblxuZnVuY3Rpb24gU2FuZEJveEhhbmRsZXIoc3BhY2VOYW1lLCBmb2xkZXIsIGNvZGVGb2xkZXIsIHJlc3VsdENhbGxCYWNrKXtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbXFIYW5kbGVyO1xuXG5cbiAgICBib290U2FuZEJveCgpLmJvb3QodGhpcywgc3BhY2VOYW1lLGZvbGRlciwgY29kZUZvbGRlciwgZnVuY3Rpb24oZXJyLCBjaGlsZFByb2Nlc3Mpe1xuICAgICAgICBpZighZXJyKXtcbiAgICAgICAgICAgIHNlbGYuY2hpbGRQcm9jZXNzID0gY2hpbGRQcm9jZXNzO1xuXG5cbiAgICAgICAgICAgIC8qc2VsZi5vdXRib3VuZC5yZWdpc3RlckNvbnN1bWVyKGZ1bmN0aW9uKGVyciwgc3dhcm0pe1xuICAgICAgICAgICAgICAgICQkLlBTS19QdWJTdWIucHVibGlzaCgkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTiwgc3dhcm0pO1xuICAgICAgICAgICAgfSk7Ki9cblxuICAgICAgICAgICAgc2VsZi5vdXRib3VuZC5yZWdpc3RlckFzSVBDQ29uc3VtZXIoZnVuY3Rpb24oZXJyLCBzd2FybSl7XG4gICAgICAgICAgICAgICAgJCQuUFNLX1B1YlN1Yi5wdWJsaXNoKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBzd2FybSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbXFIYW5kbGVyID0gc2VsZi5pbmJvdW5kLmdldEhhbmRsZXIoKTtcbiAgICAgICAgICAgIGlmKHBlbmRpbmdNZXNzYWdlcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIHBlbmRpbmdNZXNzYWdlcy5tYXAoZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuc2VuZChpdGVtKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBwZW5kaW5nTWVzc2FnZXMgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgcGVuZGluZ01lc3NhZ2VzID0gW107XG5cbiAgICB0aGlzLnNlbmQgPSBmdW5jdGlvbiAoc3dhcm0sIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmKG1xSGFuZGxlcil7XG4gICAgICAgICAgICBtcUhhbmRsZXIuc2VuZFN3YXJtRm9yRXhlY3V0aW9uKHN3YXJtLCBjYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZW5kaW5nTWVzc2FnZXMucHVzaChzd2FybSk7IC8vVE9ETzogd2VsbCwgYSBkZWVwIGNsb25lIHdpbGwgbm90IGJlIGEgYmV0dGVyIGlkZWE/XG4gICAgICAgIH1cbiAgICB9XG5cbn1cblxuXG5mdW5jdGlvbiBTYW5kQm94TWFuYWdlcihzYW5kYm94ZXNGb2xkZXIsIGNvZGVGb2xkZXIsIGNhbGxiYWNrKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgc2FuZEJveGVzID0ge1xuXG4gICAgfTtcbiAgICBmdW5jdGlvbiBiZWxvbmdzVG9SZXBsaWNhdGVkU3BhY2UoKXtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy9jb25zb2xlLmxvZyhcIlN1YnNjcmliaW5nIHRvOlwiLCAkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTik7XG4gICAgJCQuUFNLX1B1YlN1Yi5zdWJzY3JpYmUoJCQuQ09OU1RBTlRTLlNXQVJNX0ZPUl9FWEVDVVRJT04sIGZ1bmN0aW9uKHN3YXJtKXtcbiAgICAgICAgY29uc29sZS5sb2coXCJFeGVjdXRpbmcgaW4gc2FuZGJveCB0b3dhcmRzOiBcIiwgc3dhcm0ubWV0YS50YXJnZXQpO1xuXG4gICAgICAgIGlmKHN3YXJtLm1ldGEudGFyZ2V0ID09IFwic3lzdGVtXCIgfHwgc3dhcm0ubWV0YS5jb21tYW5kID09IFwiYXN5bmNSZXR1cm5cIil7XG4gICAgICAgICAgICAkJC5zd2FybXNJbnN0YW5jZXNNYW5hZ2VyLnJldml2ZV9zd2FybShzd2FybSk7XG4gICAgICAgICAgICAvLyQkLnN3YXJtcy5yZXN0YXJ0KHN3YXJtLm1ldGEuc3dhcm1UeXBlTmFtZSwgc3dhcm0pO1xuICAgICAgICB9IGVsc2VcbiAgICAgICAgaWYoc3dhcm0ubWV0YS50YXJnZXQgPT0gXCJwZHNcIil7XG4gICAgICAgICAgICAvL1xuICAgICAgICB9IGVsc2VcbiAgICAgICAgaWYoYmVsb25nc1RvUmVwbGljYXRlZFNwYWNlKHN3YXJtLm1ldGEudGFyZ2V0KSl7XG4gICAgICAgICAgICBzZWxmLnB1c2hUb1NwYWNlQVN3YXJtKHN3YXJtLm1ldGEudGFyZ2V0LCBzd2FybSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL1RPRE86IHNlbmQgdG93YXJkcyBuZXR3b3JrXG4gICAgICAgIH1cblxuICAgIH0pO1xuXG5cbiAgICBmdW5jdGlvbiBzdGFydFNhbmRCb3goc3BhY2VOYW1lKXtcbiAgICAgICAgdmFyIHNhbmRCb3ggPSBuZXcgU2FuZEJveEhhbmRsZXIoc3BhY2VOYW1lLCBwYXRoLmpvaW4oc2FuZGJveGVzRm9sZGVyLCBzcGFjZU5hbWUpLCBjb2RlRm9sZGVyKTtcbiAgICAgICAgc2FuZEJveGVzW3NwYWNlTmFtZV0gPSBzYW5kQm94O1xuICAgICAgICByZXR1cm4gc2FuZEJveDtcbiAgICB9XG5cblxuICAgIHRoaXMucHVzaFRvU3BhY2VBU3dhcm0gPSBmdW5jdGlvbihzcGFjZU5hbWUsIHN3YXJtLCBjYWxsYmFjayl7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJwdXNoVG9TcGFjZUFTd2FybSBcIiAsIHNwYWNlTmFtZSk7XG4gICAgICAgIHZhciBzYW5kYm94ID0gc2FuZEJveGVzW3NwYWNlTmFtZV07XG4gICAgICAgIGlmKCFzYW5kYm94KXtcbiAgICAgICAgICAgIHNhbmRib3ggPSBzYW5kQm94ZXNbc3BhY2VOYW1lXSA9IHN0YXJ0U2FuZEJveChzcGFjZU5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHNhbmRib3guc2VuZChzd2FybSwgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIGNhbGxiYWNrKG51bGwsIHRoaXMpO1xufVxuXG5cbmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24oZm9sZGVyLCBjb2RlRm9sZGVyLCBjYWxsYmFjayl7XG4gICAgbmV3IFNhbmRCb3hNYW5hZ2VyKGZvbGRlciwgY29kZUZvbGRlciwgY2FsbGJhY2spO1xufTtcblxuXG4iLCJjb25zdCBldmVudHMgPSBbXCJleGl0XCIsIFwiU0lHSU5UXCIsIFwiU0lHVVNSMVwiLCBcIlNJR1VTUjJcIiwgXCJ1bmNhdWdodEV4Y2VwdGlvblwiLCBcIlNJR1RFUk1cIiwgXCJTSUdIVVBcIl07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbWFuYWdlU2h1dGRvd25Qcm9jZXNzKGNoaWxkcmVuTGlzdCl7XG5cbiAgICBsZXQgc2h1dHRpbmcgPSBmYWxzZTtcbiAgICBmdW5jdGlvbiBoYW5kbGVyKCl7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJIYW5kbGluZyBleGl0IGV2ZW50IG9uXCIsIHByb2Nlc3MucGlkLCBcImFyZ3VtZW50czpcIiwgYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIGNoaWxkcmVuTmFtZXMgPSBPYmplY3Qua2V5cyhjaGlsZHJlbkxpc3QpO1xuICAgICAgICBmb3IobGV0IGo9MDsgajxjaGlsZHJlbk5hbWVzLmxlbmd0aDsgaisrKXtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuTGlzdFtjaGlsZHJlbk5hbWVzW2pdXTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coYFske3Byb2Nlc3MucGlkfV1gLCBcIlNlbmRpbmcga2lsbCBzaWduYWwgdG8gUElEOlwiLCBjaGlsZC5waWQpO1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIHByb2Nlc3Mua2lsbChjaGlsZC5waWQpO1xuICAgICAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICAgICAgLy8uLi5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCFzaHV0dGluZyl7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7XG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoYFtQSUQ6ICR7cHJvY2Vzcy5waWR9XSBbVGltZXN0YW1wOiAke25ldyBEYXRlKCkuZ2V0VGltZSgpfV0gW1Byb2Nlc3MgYXJndjogJHtwcm9jZXNzLmFyZ3Z9XS0gU2h1dHRpbmcgZG93bi4uLlxcbmApO1xuICAgICAgICAgICAgfWNhdGNoKGVycilcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAvLy4uLlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2h1dHRpbmcgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDApO1xuICAgICAgICB9LCAwKTtcbiAgICB9XG5cbiAgICBwcm9jZXNzLnN0ZGluLnJlc3VtZSgpO1xuICAgIGZvcihsZXQgaT0wOyBpPGV2ZW50cy5sZW5ndGg7IGkrKyl7XG4gICAgICAgIHZhciBldmVudFR5cGUgPSBldmVudHNbaV07XG4gICAgICAgIHByb2Nlc3Mub24oZXZlbnRUeXBlLCBoYW5kbGVyKTtcbiAgICB9XG4gICAgLy9jb25zb2xlLmxvZyhcIkV4aXQgaGFuZGxlciBzZXR1cCFcIiwgYFske3Byb2Nlc3MucGlkfV1gKTtcbn07IiwiXG4vL3ZhciBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGluZ0ltcGxlbWVudGF0aW9uKGVyciwgcmVzKXtcblx0Ly9jb25zb2xlLmxvZyhlcnIuc3RhY2spO1xuXHRpZihlcnIpIHRocm93IGVycjtcblx0cmV0dXJuIHJlcztcbn1cblxucmVxdWlyZShcIi4vbGliL292ZXJ3cml0ZVJlcXVpcmVcIik7XG5jb25zdCBQU0tCdWZmZXIgPSByZXF1aXJlKCdwc2tidWZmZXInKTtcbiQkLlBTS0J1ZmZlciA9IFBTS0J1ZmZlcjtcblxuXG4kJC5lcnJvckhhbmRsZXIgPSB7XG4gICAgICAgIGVycm9yOmZ1bmN0aW9uKGVyciwgYXJncywgbXNnKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyciwgXCJVbmtub3duIGVycm9yIGZyb20gZnVuY3Rpb24gY2FsbCB3aXRoIGFyZ3VtZW50czpcIiwgYXJncywgXCJNZXNzYWdlOlwiLCBtc2cpO1xuICAgICAgICB9LFxuICAgICAgICB0aHJvd0Vycm9yOmZ1bmN0aW9uKGVyciwgYXJncywgbXNnKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVyciwgXCJVbmtub3duIGVycm9yIGZyb20gZnVuY3Rpb24gY2FsbCB3aXRoIGFyZ3VtZW50czpcIiwgYXJncywgXCJNZXNzYWdlOlwiLCBtc2cpO1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9LFxuICAgICAgICBpZ25vcmVQb3NzaWJsZUVycm9yOiBmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG5hbWUpO1xuICAgICAgICB9LFxuICAgICAgICBzeW50YXhFcnJvcjpmdW5jdGlvbihwcm9wZXJ0eSwgc3dhcm0sIHRleHQpe1xuICAgICAgICAgICAgLy90aHJvdyBuZXcgRXJyb3IoXCJNaXNzcGVsbGVkIG1lbWJlciBuYW1lIG9yIG90aGVyIGludGVybmFsIGVycm9yIVwiKTtcbiAgICAgICAgICAgIHZhciBzd2FybU5hbWU7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIHN3YXJtID09IFwic3RyaW5nXCIpe1xuICAgICAgICAgICAgICAgICAgICBzd2FybU5hbWUgPSBzd2FybTtcbiAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICBpZihzd2FybSAmJiBzd2FybS5tZXRhKXtcbiAgICAgICAgICAgICAgICAgICAgc3dhcm1OYW1lICA9IHN3YXJtLm1ldGEuc3dhcm1UeXBlTmFtZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzd2FybU5hbWUgPSBzd2FybS5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybVR5cGVOYW1lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2goZXJyKXtcbiAgICAgICAgICAgICAgICBzd2FybU5hbWUgPSBlcnIudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKHByb3BlcnR5KXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIldyb25nIG1lbWJlciBuYW1lIFwiLCBwcm9wZXJ0eSwgIFwiIGluIHN3YXJtIFwiLCBzd2FybU5hbWUpO1xuICAgICAgICAgICAgICAgIGlmKHRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVua25vd24gc3dhcm1cIiwgc3dhcm1OYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9LFxuICAgICAgICB3YXJuaW5nOmZ1bmN0aW9uKG1zZyl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtc2cpO1xuICAgICAgICB9XG4gICAgfTtcblxuXG5cbiQkLnNhZmVFcnJvckhhbmRsaW5nID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICBpZihjYWxsYmFjayl7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2s7XG4gICAgICAgIH0gZWxzZXtcbiAgICAgICAgICAgIHJldHVybiBkZWZhdWx0RXJyb3JIYW5kbGluZ0ltcGxlbWVudGF0aW9uO1xuICAgICAgICB9XG4gICAgfTtcblxuJCQuX19pbnRlcm4gPSB7XG4gICAgICAgIG1rQXJnczpmdW5jdGlvbihhcmdzLHBvcyl7XG4gICAgICAgICAgICB2YXIgYXJnc0FycmF5ID0gW107XG4gICAgICAgICAgICBmb3IodmFyIGkgPSBwb3M7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICBhcmdzQXJyYXkucHVzaChhcmdzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhcmdzQXJyYXk7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cblxudmFyIHN3YXJtVXRpbHMgPSByZXF1aXJlKFwiLi9saWIvY2hvcmVvZ3JhcGhpZXMvdXRpbGl0eUZ1bmN0aW9ucy9zd2FybVwiKTtcbnZhciBhc3NldFV0aWxzID0gcmVxdWlyZShcIi4vbGliL2Nob3Jlb2dyYXBoaWVzL3V0aWxpdHlGdW5jdGlvbnMvYXNzZXRcIik7XG4kJC5kZWZhdWx0RXJyb3JIYW5kbGluZ0ltcGxlbWVudGF0aW9uID0gZGVmYXVsdEVycm9ySGFuZGxpbmdJbXBsZW1lbnRhdGlvbjtcblxudmFyIGNhbGxmbG93TW9kdWxlID0gcmVxdWlyZShcIi4vbGliL3N3YXJtRGVzY3JpcHRpb25cIik7XG4kJC5jYWxsZmxvd3MgICAgICAgID0gY2FsbGZsb3dNb2R1bGUuY3JlYXRlU3dhcm1FbmdpbmUoXCJjYWxsZmxvd1wiKTtcbiQkLmNhbGxmbG93ICAgICAgICAgPSAkJC5jYWxsZmxvd3M7XG4kJC5mbG93ICAgICAgICAgICAgID0gJCQuY2FsbGZsb3dzO1xuJCQuZmxvd3MgICAgICAgICAgICA9ICQkLmNhbGxmbG93cztcblxuJCQuc3dhcm1zICAgICAgICAgICA9IGNhbGxmbG93TW9kdWxlLmNyZWF0ZVN3YXJtRW5naW5lKFwic3dhcm1cIiwgc3dhcm1VdGlscyk7XG4kJC5zd2FybSAgICAgICAgICAgID0gJCQuc3dhcm1zO1xuJCQuY29udHJhY3RzICAgICAgICA9IGNhbGxmbG93TW9kdWxlLmNyZWF0ZVN3YXJtRW5naW5lKFwiY29udHJhY3RcIiwgc3dhcm1VdGlscyk7XG4kJC5jb250cmFjdCAgICAgICAgID0gJCQuY29udHJhY3RzO1xuJCQuYXNzZXRzICAgICAgICAgICA9IGNhbGxmbG93TW9kdWxlLmNyZWF0ZVN3YXJtRW5naW5lKFwiYXNzZXRcIiwgYXNzZXRVdGlscyk7XG4kJC5hc3NldCAgICAgICAgICAgID0gJCQuYXNzZXRzO1xuJCQudHJhbnNhY3Rpb25zICAgICA9IGNhbGxmbG93TW9kdWxlLmNyZWF0ZVN3YXJtRW5naW5lKFwidHJhbnNhY3Rpb25cIiwgc3dhcm1VdGlscyk7XG4kJC50cmFuc2FjdGlvbiAgICAgID0gJCQudHJhbnNhY3Rpb25zO1xuXG5cbiQkLlBTS19QdWJTdWIgPSByZXF1aXJlKFwic291bmRwdWJzdWJcIikuc291bmRQdWJTdWI7XG5cbiQkLnNlY3VyaXR5Q29udGV4dCA9IFwic3lzdGVtXCI7XG4kJC5saWJyYXJ5UHJlZml4ID0gXCJnbG9iYWxcIjtcbiQkLmxpYnJhcmllcyA9IHtcbiAgICBnbG9iYWw6e1xuXG4gICAgfVxufTtcblxuJCQuaW50ZXJjZXB0b3IgPSByZXF1aXJlKFwiLi9saWIvSW50ZXJjZXB0b3JSZWdpc3RyeVwiKS5jcmVhdGVJbnRlcmNlcHRvclJlZ2lzdHJ5KCk7XG5cbiQkLmxvYWRMaWJyYXJ5ID0gcmVxdWlyZShcIi4vbGliL2xvYWRMaWJyYXJ5XCIpLmxvYWRMaWJyYXJ5O1xuXG5yZXF1aXJlTGlicmFyeSA9IGZ1bmN0aW9uKG5hbWUpe1xuICAgIC8vdmFyIGFic29sdXRlUGF0aCA9IHBhdGgucmVzb2x2ZSggICQkLl9fZ2xvYmFsLl9fbG9hZExpYnJhcnlSb290ICsgbmFtZSk7XG4gICAgcmV0dXJuICQkLmxvYWRMaWJyYXJ5KG5hbWUsbmFtZSk7XG59O1xuXG5yZXF1aXJlKFwiLi9jb25zdGFudHNcIik7XG5cbi8qLy9UT0RPOiBTSE9VTEQgYmUgbW92ZWQgaW4gJCQuX19nbG9iYWxzXG4kJC5lbnN1cmVGb2xkZXJFeGlzdHMgPSBmdW5jdGlvbiAoZm9sZGVyLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IGZsb3cgPSAkJC5mbG93LnN0YXJ0KFwidXRpbHMubWtEaXJSZWNcIik7XG4gICAgZmxvdy5tYWtlKGZvbGRlciwgY2FsbGJhY2spO1xufTtcblxuJCQuZW5zdXJlTGlua0V4aXN0cyA9IGZ1bmN0aW9uIChleGlzdGluZ1BhdGgsIG5ld1BhdGgsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZmxvdyA9ICQkLmZsb3cuc3RhcnQoXCJ1dGlscy5ta0RpclJlY1wiKTtcbiAgICBmbG93Lm1ha2VMaW5rKGV4aXN0aW5nUGF0aCwgbmV3UGF0aCwgY2FsbGJhY2spO1xufTsqL1xuXG4kJC5wYXRoTm9ybWFsaXplID0gZnVuY3Rpb24gKHBhdGhUb05vcm1hbGl6ZSkge1xuICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbiAgICBwYXRoVG9Ob3JtYWxpemUgPSBwYXRoLm5vcm1hbGl6ZShwYXRoVG9Ob3JtYWxpemUpO1xuXG4gICAgcmV0dXJuIHBhdGhUb05vcm1hbGl6ZS5yZXBsYWNlKC9bXFwvXFxcXF0vZywgcGF0aC5zZXApO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgXHRcdFx0XHRjcmVhdGVTd2FybUVuZ2luZTogcmVxdWlyZShcIi4vbGliL3N3YXJtRGVzY3JpcHRpb25cIikuY3JlYXRlU3dhcm1FbmdpbmUsXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUpvaW5Qb2ludDogcmVxdWlyZShcIi4vbGliL3BhcmFsbGVsSm9pblBvaW50XCIpLmNyZWF0ZUpvaW5Qb2ludCxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlU2VyaWFsSm9pblBvaW50OiByZXF1aXJlKFwiLi9saWIvc2VyaWFsSm9pblBvaW50XCIpLmNyZWF0ZVNlcmlhbEpvaW5Qb2ludCxcbiAgICAgICAgICAgICAgICAgICAgc3dhcm1JbnN0YW5jZU1hbmFnZXI6IHJlcXVpcmUoXCIuL2xpYi9jaG9yZW9ncmFwaGllcy9zd2FybUluc3RhbmNlc01hbmFnZXJcIiksXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZUludGVybmFsU3dhcm1Sb3V0aW5nOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gZHVtbXlWTShuYW1lKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBzb2x2ZVN3YXJtKHN3YXJtKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCQuc3dhcm1zSW5zdGFuY2VzTWFuYWdlci5yZXZpdmVfc3dhcm0oc3dhcm0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQkLlBTS19QdWJTdWIuc3Vic2NyaWJlKG5hbWUsIHNvbHZlU3dhcm0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgYSBmYWtlIGV4ZWN1dGlvbiBjb250ZXh0Li4uXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtbXlWTSgkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTik7XG4gICAgICAgICAgICAgICAgICAgIH1cblx0XHRcdFx0fTtcbiIsImlmKHR5cGVvZiBzaW5nbGV0b25fY29udGFpbmVyX21vZHVsZV93b3JrYXJvdW5kX2Zvcl93aXJlZF9ub2RlX2pzX2NhY2hpbmcgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBzaW5nbGV0b25fY29udGFpbmVyX21vZHVsZV93b3JrYXJvdW5kX2Zvcl93aXJlZF9ub2RlX2pzX2NhY2hpbmcgICA9IG1vZHVsZTtcbn0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBzaW5nbGV0b25fY29udGFpbmVyX21vZHVsZV93b3JrYXJvdW5kX2Zvcl93aXJlZF9ub2RlX2pzX2NhY2hpbmcgLmV4cG9ydHM7XG4gICAgcmV0dXJuIG1vZHVsZTtcbn1cblxuLyoqXG4gKiBDcmVhdGVkIGJ5IHNhbGJvYWllIG9uIDQvMjcvMTUuXG4gKi9cbmZ1bmN0aW9uIENvbnRhaW5lcihlcnJvckhhbmRsZXIpe1xuICAgIHZhciB0aGluZ3MgPSB7fTsgICAgICAgIC8vdGhlIGFjdHVhbCB2YWx1ZXMgZm9yIG91ciBzZXJ2aWNlcywgdGhpbmdzXG4gICAgdmFyIGltbWVkaWF0ZSA9IHt9OyAgICAgLy9ob3cgZGVwZW5kZW5jaWVzIHdlcmUgZGVjbGFyZWRcbiAgICB2YXIgY2FsbGJhY2tzID0ge307ICAgICAvL2NhbGxiYWNrIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCBmb3IgZWFjaCBkZXBlbmRlbmN5IGRlY2xhcmF0aW9uXG4gICAgdmFyIGRlcHNDb3VudGVyID0ge307ICAgLy9jb3VudCBkZXBlbmRlbmNpZXNcbiAgICB2YXIgcmV2ZXJzZWRUcmVlID0ge307ICAvL3JldmVyc2VkIGRlcGVuZGVuY2llcywgb3Bwb3NpdGUgb2YgaW1tZWRpYXRlIG9iamVjdFxuXG4gICAgIHRoaXMuZHVtcCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICBjb25zb2xlLmxvZyhcIkNvbmF0aW5lciBkdW1wXFxuIFRoaW5nczpcIiwgdGhpbmdzLCBcIlxcbkRlcHMgY291bnRlcjogXCIsIGRlcHNDb3VudGVyLCBcIlxcblN0cmlnaHQ6XCIsIGltbWVkaWF0ZSwgXCJcXG5SZXZlcnNlZDpcIiwgcmV2ZXJzZWRUcmVlKTtcbiAgICAgfTtcblxuICAgIGZ1bmN0aW9uIGluY0NvdW50ZXIobmFtZSl7XG4gICAgICAgIGlmKCFkZXBzQ291bnRlcltuYW1lXSl7XG4gICAgICAgICAgICBkZXBzQ291bnRlcltuYW1lXSA9IDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZXBzQ291bnRlcltuYW1lXSsrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zZXJ0RGVwZW5kZW5jeWluUlQobm9kZU5hbWUsIGRlcGVuZGVuY2llcyl7XG4gICAgICAgIGRlcGVuZGVuY2llcy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW1OYW1lKXtcbiAgICAgICAgICAgIHZhciBsID0gcmV2ZXJzZWRUcmVlW2l0ZW1OYW1lXTtcbiAgICAgICAgICAgIGlmKCFsKXtcbiAgICAgICAgICAgICAgICBsID0gcmV2ZXJzZWRUcmVlW2l0ZW1OYW1lXSA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbFtub2RlTmFtZV0gPSBub2RlTmFtZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBkaXNjb3ZlclVwTm9kZXMobm9kZU5hbWUpe1xuICAgICAgICB2YXIgcmVzID0ge307XG5cbiAgICAgICAgZnVuY3Rpb24gREZTKG5uKXtcbiAgICAgICAgICAgIHZhciBsID0gcmV2ZXJzZWRUcmVlW25uXTtcbiAgICAgICAgICAgIGZvcih2YXIgaSBpbiBsKXtcbiAgICAgICAgICAgICAgICBpZighcmVzW2ldKXtcbiAgICAgICAgICAgICAgICAgICAgcmVzW2ldID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgREZTKGkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIERGUyhub2RlTmFtZSk7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhyZXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2V0Q291bnRlcihuYW1lKXtcbiAgICAgICAgdmFyIGRlcGVuZGVuY3lBcnJheSA9IGltbWVkaWF0ZVtuYW1lXTtcbiAgICAgICAgdmFyIGNvdW50ZXIgPSAwO1xuICAgICAgICBpZihkZXBlbmRlbmN5QXJyYXkpe1xuICAgICAgICAgICAgZGVwZW5kZW5jeUFycmF5LmZvckVhY2goZnVuY3Rpb24oZGVwKXtcbiAgICAgICAgICAgICAgICBpZih0aGluZ3NbZGVwXSA9PSBudWxsKXtcbiAgICAgICAgICAgICAgICAgICAgaW5jQ291bnRlcihuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgY291bnRlcisrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGRlcHNDb3VudGVyW25hbWVdID0gY291bnRlcjtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIkNvdW50ZXIgZm9yIFwiLCBuYW1lLCAnIGlzICcsIGNvdW50ZXIpO1xuICAgICAgICByZXR1cm4gY291bnRlcjtcbiAgICB9XG5cbiAgICAvKiByZXR1cm5zIHRob3NlIHRoYXQgYXJlIHJlYWR5IHRvIGJlIHJlc29sdmVkKi9cbiAgICBmdW5jdGlvbiByZXNldFVwQ291bnRlcnMobmFtZSl7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgLy9jb25zb2xlLmxvZygnUmVzZXRpbmcgdXAgY291bnRlcnMgZm9yICcsIG5hbWUsIFwiUmV2ZXJzZTpcIiwgcmV2ZXJzZWRUcmVlW25hbWVdKTtcbiAgICAgICAgdmFyIHVwcyA9IHJldmVyc2VkVHJlZVtuYW1lXTtcbiAgICAgICAgZm9yKHZhciB2IGluIHVwcyl7XG4gICAgICAgICAgICBpZihyZXNldENvdW50ZXIodikgPT09IDApe1xuICAgICAgICAgICAgICAgIHJldC5wdXNoKHYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG4gICAgLypcbiAgICAgICAgIFRoZSBmaXJzdCBhcmd1bWVudCBpcyBhIG5hbWUgZm9yIGEgc2VydmljZSwgdmFyaWFibGUsYSAgdGhpbmcgdGhhdCBzaG91bGQgYmUgaW5pdGlhbGlzZWQsIHJlY3JlYXRlZCwgZXRjXG4gICAgICAgICBUaGUgc2Vjb25kIGFyZ3VtZW50IGlzIGFuIGFycmF5IHdpdGggZGVwZW5kZW5jaWVzXG4gICAgICAgICB0aGUgbGFzdCBhcmd1bWVudCBpcyBhIGZ1bmN0aW9uKGVyciwuLi4pIHRoYXQgaXMgY2FsbGVkIHdoZW4gZGVwZW5kZW5jaWVzIGFyZSByZWFkeSBvciByZWNhbGxlZCB3aGVuIGFyZSBub3QgcmVhZHkgKHN0b3Agd2FzIGNhbGxlZClcbiAgICAgICAgIElmIGVyciBpcyBub3QgdW5kZWZpbmVkIGl0IG1lYW5zIHRoYXQgb25lIG9yIGFueSB1bmRlZmluZWQgdmFyaWFibGVzIGFyZSBub3QgcmVhZHkgYW5kIHRoZSBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCBhZ2FpbiBsYXRlclxuICAgICAgICAgQWxsIHRoZSBvdGhlciBhcmd1bWVudHMgYXJlIHRoZSBjb3JyZXNwb25kaW5nIGFyZ3VtZW50cyBvZiB0aGUgY2FsbGJhY2sgd2lsbCBiZSB0aGUgYWN0dWFsIHZhbHVlcyBvZiB0aGUgY29ycmVzcG9uZGluZyBkZXBlbmRlbmN5XG4gICAgICAgICBUaGUgY2FsbGJhY2sgZnVuY3Rpb25zIHNob3VsZCByZXR1cm4gdGhlIGN1cnJlbnQgdmFsdWUgKG9yIG51bGwpXG4gICAgICovXG4gICAgdGhpcy5kZWNsYXJlRGVwZW5kZW5jeSA9IGZ1bmN0aW9uKG5hbWUsIGRlcGVuZGVuY3lBcnJheSwgY2FsbGJhY2spe1xuICAgICAgICBpZihjYWxsYmFja3NbbmFtZV0pe1xuICAgICAgICAgICAgZXJyb3JIYW5kbGVyLmlnbm9yZVBvc3NpYmxlRXJyb3IoXCJEdXBsaWNhdGUgZGVwZW5kZW5jeTpcIiArIG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2tzW25hbWVdID0gY2FsbGJhY2s7XG4gICAgICAgICAgICBpbW1lZGlhdGVbbmFtZV0gICA9IGRlcGVuZGVuY3lBcnJheTtcbiAgICAgICAgICAgIGluc2VydERlcGVuZGVuY3lpblJUKG5hbWUsIGRlcGVuZGVuY3lBcnJheSk7XG4gICAgICAgICAgICB0aGluZ3NbbmFtZV0gPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHVuc2F0aXNmaWVkQ291bnRlciA9IHJlc2V0Q291bnRlcihuYW1lKTtcbiAgICAgICAgaWYodW5zYXRpc2ZpZWRDb3VudGVyID09PSAwICl7XG4gICAgICAgICAgICBjYWxsRm9yVGhpbmcobmFtZSwgZmFsc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbEZvclRoaW5nKG5hbWUsIHRydWUpO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgLypcbiAgICAgICAgY3JlYXRlIGEgc2VydmljZVxuICAgICAqL1xuICAgIHRoaXMuc2VydmljZSA9IGZ1bmN0aW9uKG5hbWUsIGRlcGVuZGVuY3lBcnJheSwgY29uc3RydWN0b3Ipe1xuICAgICAgICB0aGlzLmRlY2xhcmVEZXBlbmRlbmN5KG5hbWUsIGRlcGVuZGVuY3lBcnJheSwgY29uc3RydWN0b3IpO1xuICAgIH07XG5cblxuICAgIHZhciBzdWJzeXN0ZW1Db3VudGVyID0gMDtcbiAgICAvKlxuICAgICBjcmVhdGUgYSBhbm9ueW1vdXMgc3Vic3lzdGVtXG4gICAgICovXG4gICAgdGhpcy5zdWJzeXN0ZW0gPSBmdW5jdGlvbihkZXBlbmRlbmN5QXJyYXksIGNvbnN0cnVjdG9yKXtcbiAgICAgICAgc3Vic3lzdGVtQ291bnRlcisrO1xuICAgICAgICB0aGlzLmRlY2xhcmVEZXBlbmRlbmN5KFwiZGljb250YWluZXJfc3Vic3lzdGVtX3BsYWNlaG9sZGVyXCIgKyBzdWJzeXN0ZW1Db3VudGVyLCBkZXBlbmRlbmN5QXJyYXksIGNvbnN0cnVjdG9yKTtcbiAgICB9O1xuXG4gICAgLyogbm90IGRvY3VtZW50ZWQuLiBsaW1ibyBzdGF0ZSovXG4gICAgdGhpcy5mYWN0b3J5ID0gZnVuY3Rpb24obmFtZSwgZGVwZW5kZW5jeUFycmF5LCBjb25zdHJ1Y3Rvcil7XG4gICAgICAgIHRoaXMuZGVjbGFyZURlcGVuZGVuY3kobmFtZSwgZGVwZW5kZW5jeUFycmF5LCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBjb25zdHJ1Y3RvcigpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY2FsbEZvclRoaW5nKG5hbWUsIG91dE9mU2VydmljZSl7XG4gICAgICAgIHZhciBhcmdzID0gaW1tZWRpYXRlW25hbWVdLm1hcChmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgICAgIHJldHVybiB0aGluZ3NbaXRlbV07XG4gICAgICAgIH0pO1xuICAgICAgICBhcmdzLnVuc2hpZnQob3V0T2ZTZXJ2aWNlKTtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gY2FsbGJhY2tzW25hbWVdLmFwcGx5KHt9LGFyZ3MpO1xuICAgICAgICB9IGNhdGNoKGVycil7XG4gICAgICAgICAgICBlcnJvckhhbmRsZXIudGhyb3dFcnJvcihlcnIpO1xuICAgICAgICB9XG5cblxuICAgICAgICBpZihvdXRPZlNlcnZpY2UgfHwgdmFsdWU9PT1udWxsKXsgICAvL2VuYWJsZSByZXR1cm5pbmcgYSB0ZW1wb3JhcnkgZGVwZW5kZW5jeSByZXNvbHV0aW9uIVxuICAgICAgICAgICAgaWYodGhpbmdzW25hbWVdKXtcbiAgICAgICAgICAgICAgICB0aGluZ3NbbmFtZV0gPSBudWxsO1xuICAgICAgICAgICAgICAgIHJlc2V0VXBDb3VudGVycyhuYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJTdWNjZXNzIHJlc29sdmluZyBcIiwgbmFtZSwgXCI6XCIsIHZhbHVlLCBcIk90aGVyIHJlYWR5OlwiLCBvdGhlclJlYWR5KTtcbiAgICAgICAgICAgIGlmKCF2YWx1ZSl7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSAge1wicGxhY2Vob2xkZXJcIjogbmFtZX07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGluZ3NbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIHZhciBvdGhlclJlYWR5ID0gcmVzZXRVcENvdW50ZXJzKG5hbWUpO1xuICAgICAgICAgICAgb3RoZXJSZWFkeS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICAgICAgICAgIGNhbGxGb3JUaGluZyhpdGVtLCBmYWxzZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qXG4gICAgICAgIERlY2xhcmUgdGhhdCBhIG5hbWUgaXMgcmVhZHksIHJlc29sdmVkIGFuZCBzaG91bGQgdHJ5IHRvIHJlc29sdmUgYWxsIG90aGVyIHdhaXRpbmcgZm9yIGl0XG4gICAgICovXG4gICAgdGhpcy5yZXNvbHZlICAgID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpe1xuICAgICAgICB0aGluZ3NbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgdmFyIG90aGVyUmVhZHkgPSByZXNldFVwQ291bnRlcnMobmFtZSk7XG5cbiAgICAgICAgb3RoZXJSZWFkeS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICAgICAgY2FsbEZvclRoaW5nKGl0ZW0sIGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuXG5cbiAgICB0aGlzLmluc3RhbmNlRmFjdG9yeSA9IGZ1bmN0aW9uKG5hbWUsIGRlcGVuZGVuY3lBcnJheSwgY29uc3RydWN0b3Ipe1xuICAgICAgICBlcnJvckhhbmRsZXIubm90SW1wbGVtZW50ZWQoXCJpbnN0YW5jZUZhY3RvcnkgaXMgcGxhbm5lZCBidXQgbm90IGltcGxlbWVudGVkXCIpO1xuICAgIH07XG5cbiAgICAvKlxuICAgICAgICBEZWNsYXJlIHRoYXQgYSBzZXJ2aWNlIG9yIGZlYXR1cmUgaXMgbm90IHdvcmtpbmcgcHJvcGVybHkuIEFsbCBzZXJ2aWNlcyBkZXBlbmRpbmcgb24gdGhpcyB3aWxsIGdldCBub3RpZmllZFxuICAgICAqL1xuICAgIHRoaXMub3V0T2ZTZXJ2aWNlICAgID0gZnVuY3Rpb24obmFtZSl7XG4gICAgICAgIHRoaW5nc1tuYW1lXSA9IG51bGw7XG4gICAgICAgIHZhciB1cE5vZGVzID0gZGlzY292ZXJVcE5vZGVzKG5hbWUpO1xuICAgICAgICB1cE5vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSl7XG4gICAgICAgICAgICB0aGluZ3NbbmFtZV0gPSBudWxsO1xuICAgICAgICAgICAgY2FsbEZvclRoaW5nKG5vZGUsIHRydWUpO1xuICAgICAgICB9KTtcbiAgICB9O1xufVxuXG5cbmV4cG9ydHMubmV3Q29udGFpbmVyICAgID0gZnVuY3Rpb24oY2hlY2tzTGlicmFyeSl7XG4gICAgcmV0dXJuIG5ldyBDb250YWluZXIoY2hlY2tzTGlicmFyeSk7XG59O1xuXG4vL2V4cG9ydHMuY29udGFpbmVyID0gbmV3IENvbnRhaW5lcigkJC5lcnJvckhhbmRsZXIpOyIsImV4cG9ydHMuZG9tYWluUHViU3ViID0gcmVxdWlyZShcIi4vZG9tYWluUHViU3ViXCIpOyIsIlxuLyoqXG4gKiBHZW5lcmljIGZ1bmN0aW9uIHVzZWQgdG8gcmVnaXN0ZXJzIG1ldGhvZHMgc3VjaCBhcyBhc3NlcnRzLCBsb2dnaW5nLCBldGMuIG9uIHRoZSBjdXJyZW50IGNvbnRleHQuXG4gKiBAcGFyYW0gbmFtZSB7U3RyaW5nKX0gLSBuYW1lIG9mIHRoZSBtZXRob2QgKHVzZSBjYXNlKSB0byBiZSByZWdpc3RlcmVkLlxuICogQHBhcmFtIGZ1bmMge0Z1bmN0aW9ufSAtIGhhbmRsZXIgdG8gYmUgaW52b2tlZC5cbiAqIEBwYXJhbSBwYXJhbXNEZXNjcmlwdGlvbiB7T2JqZWN0fSAtIHBhcmFtZXRlcnMgZGVzY3JpcHRpb25zXG4gKiBAcGFyYW0gYWZ0ZXIge0Z1bmN0aW9ufSAtIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZnVuY3Rpb24gaGFzIGJlZW4gZXhlY3V0ZWQuXG4gKi9cbmZ1bmN0aW9uIGFkZFVzZUNhc2UobmFtZSwgZnVuYywgcGFyYW1zRGVzY3JpcHRpb24sIGFmdGVyKXtcbiAgICB2YXIgbmV3RnVuYyA9IGZ1bmM7XG4gICAgaWYodHlwZW9mIGFmdGVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgbmV3RnVuYyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBjb25zdCBhcmdzID0gQXJyYXkuZnJvbShhcmd1bWVudHMpO1xuICAgICAgICAgICAgZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgIGFmdGVyKCk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gc29tZSBwcm9wZXJ0aWVzIHNob3VsZCBub3QgYmUgb3ZlcnJpZGRlblxuICAgIGNvbnN0IHByb3RlY3RlZFByb3BlcnRpZXMgPSBbICdhZGRDaGVjaycsICdhZGRDYXNlJywgJ3JlZ2lzdGVyJyBdO1xuICAgIGlmKHByb3RlY3RlZFByb3BlcnRpZXMuaW5kZXhPZihuYW1lKSA9PT0gLTEpe1xuICAgICAgICB0aGlzW25hbWVdID0gbmV3RnVuYztcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbnQgb3ZlcndyaXRlICcgKyBuYW1lKTtcbiAgICB9XG5cbiAgICBpZihwYXJhbXNEZXNjcmlwdGlvbil7XG4gICAgICAgIHRoaXMucGFyYW1zW25hbWVdID0gcGFyYW1zRGVzY3JpcHRpb247XG4gICAgfVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gYWxpYXMgdG8gYW4gZXhpc3RpbmcgZnVuY3Rpb24uXG4gKiBAcGFyYW0gbmFtZTEge1N0cmluZ30gLSBOZXcgZnVuY3Rpb24gbmFtZS5cbiAqIEBwYXJhbSBuYW1lMiB7U3RyaW5nfSAtIEV4aXN0aW5nIGZ1bmN0aW9uIG5hbWUuXG4gKi9cbmZ1bmN0aW9uIGFsaWFzKG5hbWUxLCBuYW1lMil7XG4gICAgdGhpc1tuYW1lMV0gPSB0aGlzW25hbWUyXTtcbn1cblxuLyoqXG4gKiBTaW5nbGV0b24gZm9yIGFkZGluZyB2YXJpb3VzIGZ1bmN0aW9ucyBmb3IgdXNlIGNhc2VzIHJlZ2FyZGluZyBsb2dnaW5nLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIExvZ3NDb3JlKCl7XG4gICAgdGhpcy5wYXJhbXMgPSB7fTtcbn1cblxuLyoqXG4gKiBTaW5nbGV0b24gZm9yIGFkZGluZyB5b3VyIHZhcmlvdXMgZnVuY3Rpb25zIGZvciBhc3NlcnRzLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEFzc2VydENvcmUoKXtcbiAgICB0aGlzLnBhcmFtcyA9IHt9O1xufVxuXG4vKipcbiAqIFNpbmdsZXRvbiBmb3IgYWRkaW5nIHlvdXIgdmFyaW91cyBmdW5jdGlvbnMgZm9yIGNoZWNrcy5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBDaGVja0NvcmUoKXtcbiAgICB0aGlzLnBhcmFtcyA9IHt9O1xufVxuXG4vKipcbiAqIFNpbmdsZXRvbiBmb3IgYWRkaW5nIHlvdXIgdmFyaW91cyBmdW5jdGlvbnMgZm9yIGdlbmVyYXRpbmcgZXhjZXB0aW9ucy5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBFeGNlcHRpb25zQ29yZSgpe1xuICAgIHRoaXMucGFyYW1zID0ge307XG59XG5cbi8qKlxuICogU2luZ2xldG9uIGZvciBhZGRpbmcgeW91ciB2YXJpb3VzIGZ1bmN0aW9ucyBmb3IgcnVubmluZyB0ZXN0cy5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBUZXN0UnVubmVyQ29yZSgpe1xufVxuXG5Mb2dzQ29yZS5wcm90b3R5cGUuYWRkQ2FzZSAgICAgICAgICAgPSBhZGRVc2VDYXNlO1xuQXNzZXJ0Q29yZS5wcm90b3R5cGUuYWRkQ2hlY2sgICAgICAgID0gYWRkVXNlQ2FzZTtcbkNoZWNrQ29yZS5wcm90b3R5cGUuYWRkQ2hlY2sgICAgICAgICA9IGFkZFVzZUNhc2U7XG5FeGNlcHRpb25zQ29yZS5wcm90b3R5cGUucmVnaXN0ZXIgICAgPSBhZGRVc2VDYXNlO1xuXG5Mb2dzQ29yZS5wcm90b3R5cGUuYWxpYXMgICAgICAgICAgICAgPSBhbGlhcztcbkFzc2VydENvcmUucHJvdG90eXBlLmFsaWFzICAgICAgICAgICA9IGFsaWFzO1xuQ2hlY2tDb3JlLnByb3RvdHlwZS5hbGlhcyAgICAgICAgICAgID0gYWxpYXM7XG5FeGNlcHRpb25zQ29yZS5wcm90b3R5cGUuYWxpYXMgICAgICAgPSBhbGlhcztcblxuLy8gQ3JlYXRlIG1vZHVsZXNcbnZhciBhc3NlcnRPYmogICAgICAgPSBuZXcgQXNzZXJ0Q29yZSgpO1xudmFyIGNoZWNrT2JqICAgICAgICA9IG5ldyBDaGVja0NvcmUoKTtcbnZhciBleGNlcHRpb25zT2JqICAgPSBuZXcgRXhjZXB0aW9uc0NvcmUoKTtcbnZhciBsb2dnZXJPYmogICAgICAgPSBuZXcgTG9nc0NvcmUoKTtcbnZhciB0ZXN0UnVubmVyT2JqICAgPSBuZXcgVGVzdFJ1bm5lckNvcmUoKTtcblxuLy8gRXhwb3J0IG1vZHVsZXNcbmV4cG9ydHMuYXNzZXJ0ICAgICAgPSBhc3NlcnRPYmo7XG5leHBvcnRzLmNoZWNrICAgICAgID0gY2hlY2tPYmo7XG5leHBvcnRzLmV4Y2VwdGlvbnMgID0gZXhjZXB0aW9uc09iajtcbmV4cG9ydHMubG9nZ2VyICAgICAgPSBsb2dnZXJPYmo7XG5leHBvcnRzLnRlc3RSdW5uZXIgID0gdGVzdFJ1bm5lck9iajtcblxuLy8gSW5pdGlhbGlzZSBtb2R1bGVzXG5yZXF1aXJlKFwiLi9zdGFuZGFyZEFzc2VydHMuanNcIikuaW5pdChleHBvcnRzLCBsb2dnZXJPYmopO1xucmVxdWlyZShcIi4vc3RhbmRhcmRMb2dzLmpzXCIpLmluaXQoZXhwb3J0cyk7XG5yZXF1aXJlKFwiLi9zdGFuZGFyZEV4Y2VwdGlvbnMuanNcIikuaW5pdChleHBvcnRzKTtcbnJlcXVpcmUoXCIuL3N0YW5kYXJkQ2hlY2tzLmpzXCIpLmluaXQoZXhwb3J0cyk7XG5yZXF1aXJlKFwiLi90ZXN0UnVubmVyLmpzXCIpLmluaXQoZXhwb3J0cyk7XG5cbi8vIEdsb2JhbCBVbmNhdWdodCBFeGNlcHRpb24gaGFuZGxlci5cbmlmKHByb2Nlc3Mub24pXG57XG4gICAgcHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0Y29uc3QgdGFnID0gXCJ1bmNhdWdodEV4Y2VwdGlvblwiO1xuXHRcdGNvbnNvbGUubG9nKHRhZywgZXJyKTtcblx0XHRjb25zb2xlLmxvZyh0YWcsIGVyci5zdGFjayk7XG5cdH0pO1xufSIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRcdFx0XHRcdGNyZWF0ZVF1ZTogcmVxdWlyZShcIi4vbGliL2ZvbGRlck1RXCIpLmdldEZvbGRlclF1ZXVlXG5cdFx0XHRcdFx0Ly9mb2xkZXJNUTogcmVxdWlyZShcIi4vbGliL2ZvbGRlck1RXCIpXG59OyIsIi8vY29uc29sZS5sb2cocmVxdWlyZS5yZXNvbHZlKFwiLi9jb21wb25lbnRzLmpzXCIpKTtcbm1vZHVsZS5leHBvcnRzID0gJCQubGlicmFyeShmdW5jdGlvbigpe1xuXHRyZXF1aXJlKFwiLi9jb21wb25lbnRzLmpzXCIpO1xuXHQvKnJlcXVpcmUoXCIuL21rRGlyUmVjLmpzXCIpOyovXG59KSIsImNvbnN0IFBTS0J1ZmZlciA9IHJlcXVpcmUoJy4vbGliL1BTS0J1ZmZlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBTS0J1ZmZlcjtcbiIsImNvbnN0IFBza0NyeXB0byA9IHJlcXVpcmUoXCIuL2xpYi9Qc2tDcnlwdG9cIik7XG5jb25zdCBzc3V0aWwgPSByZXF1aXJlKFwiLi9zaWduc2Vuc3VzRFMvc3N1dGlsXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBza0NyeXB0bztcblxubW9kdWxlLmV4cG9ydHMuaGFzaFZhbHVlcyA9IHNzdXRpbC5oYXNoVmFsdWVzO1xuXG5tb2R1bGUuZXhwb3J0cy5Qc2tBcmNoaXZlciA9IHJlcXVpcmUoXCIuL2xpYi9wc2stYXJjaGl2ZXJcIik7XG5cbm1vZHVsZS5leHBvcnRzLkR1cGxleFN0cmVhbSA9IHJlcXVpcmUoXCIuL2xpYi91dGlscy9EdXBsZXhTdHJlYW1cIik7XG5cbm1vZHVsZS5leHBvcnRzLmlzU3RyZWFtID0gcmVxdWlyZShcIi4vbGliL3V0aWxzL2lzU3RyZWFtXCIpOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRcdFx0XHRcdHNvdW5kUHViU3ViOiByZXF1aXJlKFwiLi9saWIvc291bmRQdWJTdWJcIikuc291bmRQdWJTdWJcbn07IiwibW9kdWxlLmV4cG9ydHMuT3dNID0gcmVxdWlyZShcIi4vbGliL093TVwiKTtcbm1vZHVsZS5leHBvcnRzLmJlZXNIZWFsZXIgPSByZXF1aXJlKFwiLi9saWIvYmVlc0hlYWxlclwiKTtcblxuY29uc3QgdWlkR2VuZXJhdG9yID0gcmVxdWlyZShcIi4vbGliL3VpZEdlbmVyYXRvclwiKS5jcmVhdGVVaWRHZW5lcmF0b3IoMjAwLCAzMik7XG5cbm1vZHVsZS5leHBvcnRzLnNhZmVfdXVpZCA9IHJlcXVpcmUoXCIuL2xpYi9zYWZlLXV1aWRcIikuaW5pdCh1aWRHZW5lcmF0b3IpO1xuXG5tb2R1bGUuZXhwb3J0cy5RdWV1ZSA9IHJlcXVpcmUoXCIuL2xpYi9RdWV1ZVwiKTtcbm1vZHVsZS5leHBvcnRzLmNvbWJvcyA9IHJlcXVpcmUoXCIuL2xpYi9Db21ib3NcIik7XG5cbm1vZHVsZS5leHBvcnRzLnVpZEdlbmVyYXRvciA9IHVpZEdlbmVyYXRvcjtcbm1vZHVsZS5leHBvcnRzLmdlbmVyYXRlVWlkID0gdWlkR2VuZXJhdG9yLmdlbmVyYXRlVWlkO1xuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVQc2tDb25zb2xlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gcmVxdWlyZSgnLi9saWIvcHNrY29uc29sZScpO1xufTtcblxuXG5pZih0eXBlb2YgZ2xvYmFsLiQkID09IFwidW5kZWZpbmVkXCIpe1xuICBnbG9iYWwuJCQgPSB7fTtcbn1cblxuaWYodHlwZW9mIGdsb2JhbC4kJC51aWRHZW5lcmF0b3IgPT0gXCJ1bmRlZmluZWRcIil7XG4gICAgJCQudWlkR2VuZXJhdG9yID0gbW9kdWxlLmV4cG9ydHMuc2FmZV91dWlkO1xufVxuIiwiZXhwb3J0cy5mc0V4dCA9IHJlcXVpcmUoXCIuL0ZTRXh0ZW5zaW9uXCIpLmZzRXh0OyJdfQ==
