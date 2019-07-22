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
	$$.__runtimeModules["@msgpack/msgpack"] = require("@msgpack/msgpack");
}
if (false) {
	pskruntimeLoadModules();
}; 
global.pskruntimeRequire = require;
if (typeof $$ !== "undefined") {            
    $$.requireBundle("pskruntime");
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"@msgpack/msgpack":"@msgpack/msgpack","callflow":"callflow","dicontainer":"dicontainer","domainBase":"domainBase","double-check":"double-check","foldermq":"foldermq","launcher":"launcher","pskbuffer":"pskbuffer","pskcrypto":"pskcrypto","soundpubsub":"soundpubsub","swarmutils":"swarmutils","utils":"utils"}],"/home/cosmin/Workspace/reorganizing/privatesky/libraries/domainBase/domainPubSub.js":[function(require,module,exports){
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
            if(!swarm){
                throw new Error(`Unknown swarm type <${swarmType}>. Check if swarm type is present in domain constituion!`);
            }else{
                swarm.update(swarmSerialisation);
            }

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

require("./../standardGlobalSymbols");

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

},{"./../standardGlobalSymbols":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/standardGlobalSymbols.js","crypto":"crypto","module":false,"path":"path","util":"util"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/parallelJoinPoint.js":[function(require,module,exports){

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

},{"./choreographies/utilityFunctions/callflow":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/utilityFunctions/callflow.js","swarmutils":"swarmutils"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/standardGlobalSymbols.js":[function(require,module,exports){
$$.registerGlobalSymbol = function(newSymbol, value){
    if(typeof $$[newSymbol] == "undefined"){
        Object.defineProperty($$, newSymbol, {
            value: value,
            writable: false
        });
    } else{
        console.error("Refusing to overwrite $$." + newSymbol);
    }
}

$$.registerGlobalSymbol("autoThrow", function(err){
    if(!err){
        throw err;
    }
})

$$.registerGlobalSymbol("ignoreError", function(err){
    if(err){
        $$.error(err);
    }
})

$$.registerGlobalSymbol("exception", function(message, type){
    if(!err){
        throw new Error(message);
    }
})

$$.registerGlobalSymbol("err", function(...args){
    console.error(...args);
})

$$.registerGlobalSymbol("warn", function(...args){
    console.warn(...args);
})

/* a feature is planned but not implemented (during development) but
also it could remain in production and should be flagged asap*/
$$.registerGlobalSymbol("incomplete", function(...args){
    console.warn(...args);
})

/* used during development and when trying to discover elusive errors*/
$$.registerGlobalSymbol("assert", function(value, explainWhy){
    if(!value){
        throw new Error("Assert false " + explainWhy);
    }
})

/* enable/disabale flags that control psk behaviour*/
$$.registerGlobalSymbol("flags", function(flagName, value){
    $$.incomplete("flags handling not implemented");
})

$$.registerGlobalSymbol("obsolete", function(...args){
    console.log(...args);
})

$$.registerGlobalSymbol("log", function(...args){
    console.log(...args);
})

$$.registerGlobalSymbol("syntaxError", function(...args){
    console.log(...args);
})

/* log unknown exceptions*/
$$.registerGlobalSymbol("unknownException", function(...args){
    console.log(...args);
})

/* PrivateSky event, used by monitoring and statistics*/
$$.registerGlobalSymbol("event", function(...args){
    console.log(...args);
})

/* log throttling event // it is just an event?*/
$$.registerGlobalSymbol("throttlingEvent", function(...args){
    console.log(...args);
})


},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/double-check/lib/standardAsserts.js":[function(require,module,exports){

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
        const PskArchiver = require("./psk-archiver");
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
        const PskArchiver = require("./psk-archiver");
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
        const PskArchiver = require("./psk-archiver");
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
        const PskArchiver = require("./psk-archiver");
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
	const PskArchiver = require("../psk-archiver");
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
        task.folderShouldExist(path.join(this.folder, "bundles"),  task.progress);
        task.folderShouldExist(path.join(this.folder, "tmp"),   task.progress);
    },
    folderShouldExist:  function(path, progress){
        fs.mkdir(path, {recursive: true}, progress);
    },
    copyFolder: function(sourcePath, targetPath, callback){
        let fsExt = require("utils").fsExt;
        try{
            fsExt.copy(sourcePath, targetPath, {overwrite: true}, callback);
        }catch(err){
            console.log("Got something...", err);
        }
    },
    ensureFoldersExists: function(err, res){
        if(err){
            console.log(err);
        } else {
            var task = this.parallel(this.runCode);
            this.sandBox.inbound = mq.createQue(path.join(this.folder, "mq/inbound"), this.progress);
            this.sandBox.outbound = mq.createQue(path.join(this.folder, "mq/outbound"), this.progress);

            console.log("Preparing to copy", path.join(this.codeFolder, "bundles"), path.resolve(path.join(this.folder, "bundles")));
            this.copyFolder(path.join(this.codeFolder, "bundles"), path.resolve(path.join(this.folder, "bundles")), task.progress);
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
},{}],"@msgpack/msgpack":[function(require,module,exports){
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.MessagePack=t():e.MessagePack=t()}(this,function(){return function(e){var t={};function r(n){if(t[n])return t[n].exports;var i=t[n]={i:n,l:!1,exports:{}};return e[n].call(i.exports,i,i.exports,r),i.l=!0,i.exports}return r.m=e,r.c=t,r.d=function(e,t,n){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)r.d(n,i,function(t){return e[t]}.bind(null,i));return n},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="",r(r.s=0)}([function(e,t,r){"use strict";r.r(t);var n=function(e,t){var r="function"==typeof Symbol&&e[Symbol.iterator];if(!r)return e;var n,i,o=r.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(n=o.next()).done;)s.push(n.value)}catch(e){i={error:e}}finally{try{n&&!n.done&&(r=o.return)&&r.call(o)}finally{if(i)throw i.error}}return s},i=function(){for(var e=[],t=0;t<arguments.length;t++)e=e.concat(n(arguments[t]));return e},o="undefined"!=typeof TextEncoder&&"undefined"!=typeof TextDecoder;function s(e){for(var t=e.length,r=0,n=0;n<t;){var i=e.charCodeAt(n++);if(0!=(4294967168&i))if(0==(4294965248&i))r+=2;else{if(i>=55296&&i<=56319&&n<t){var o=e.charCodeAt(n);56320==(64512&o)&&(++n,i=((1023&i)<<10)+(1023&o)+65536)}r+=0==(4294901760&i)?3:4}else r++}return r}var a=o?new TextEncoder:void 0;var u=a&&a.encodeInto?function(e,t,r){a.encodeInto(e,t.subarray(r))}:function(e,t,r){t.set(a.encode(e),r)},h=65536;var c=o?new TextDecoder:null;var f=function(e,t){this.type=e,this.data=t};function l(e,t,r){var n=Math.floor(r/4294967296),i=r;e.setUint32(t,n),e.setUint32(t+4,i)}function p(e,t){return 4294967296*e.getInt32(t)+e.getUint32(t+4)}var d=4294967295,y=17179869183;function w(e){var t=e.sec,r=e.nsec;if(t>=0&&r>=0&&t<=y){if(0===r&&t<=d){var n=new Uint8Array(4);return(s=new DataView(n.buffer)).setUint32(0,t),n}var i=t/4294967296,o=4294967295&t;n=new Uint8Array(8);return(s=new DataView(n.buffer)).setUint32(0,r<<2|3&i),s.setUint32(4,o),n}var s;n=new Uint8Array(12);return(s=new DataView(n.buffer)).setUint32(0,r),l(s,4,t),n}function v(e){var t=e.getTime(),r=Math.floor(t/1e3),n=1e6*(t-1e3*r),i=Math.floor(n/1e9);return{sec:r+i,nsec:n-1e9*i}}function b(e){return e instanceof Date?w(v(e)):null}function g(e){var t=new DataView(e.buffer,e.byteOffset,e.byteLength);switch(e.byteLength){case 4:return{sec:t.getUint32(0),nsec:0};case 8:var r=t.getUint32(0);return{sec:4294967296*(3&r)+t.getUint32(4),nsec:r>>>2};case 12:return{sec:p(t,4),nsec:t.getUint32(0)};default:throw new Error("Unrecognized data size for timestamp: "+e.length)}}function U(e){var t=g(e);return new Date(1e3*t.sec+t.nsec/1e6)}var m={type:-1,encode:b,decode:U},x=function(){function e(){this.builtInEncoders=[],this.builtInDecoders=[],this.encoders=[],this.decoders=[],this.register(m)}return e.prototype.register=function(e){var t=e.type,r=e.encode,n=e.decode;if(t>=0)this.encoders[t]=r,this.decoders[t]=n;else{var i=1+t;this.builtInEncoders[i]=r,this.builtInDecoders[i]=n}},e.prototype.tryToEncode=function(e){for(var t=0;t<this.builtInEncoders.length;t++){if(null!=(r=this.builtInEncoders[t]))if(null!=(n=r(e)))return new f(-1-t,n)}for(t=0;t<this.encoders.length;t++){var r,n;if(null!=(r=this.encoders[t]))if(null!=(n=r(e)))return new f(t,n)}return e instanceof f?e:null},e.prototype.decode=function(e,t){var r=t<0?this.builtInDecoders[-1-t]:this.decoders[t];return r?r(e,t):new f(t,e)},e.defaultCodec=new e,e}();function S(e){return e instanceof Uint8Array?e:ArrayBuffer.isView(e)?new Uint8Array(e.buffer,e.byteOffset,e.byteLength):e instanceof ArrayBuffer?new Uint8Array(e):Uint8Array.from(e)}var A=null,E=!!A;function B(e,t,r){var n=e.length,i=2*n,o=A.malloc(i);!function(e,t,r,n){for(var i=new DataView(A.memory.buffer,e,t),o=0;o<n;o++)i.setUint16(2*o,r.charCodeAt(o))}(o,i,e,n);var s=A.malloc(5+4*n);try{var a=A.utf8EncodeUint16Array(s,o,n);return t.set(new Uint8Array(A.memory.buffer,s,a),r),a}finally{A.free(o),A.free(s)}}var L=65536;function T(e,t,r){var n,i,o,s=A.malloc(r),a=A.malloc(2*r);try{n=s,i=e.subarray(t,t+r),o=r,new Uint8Array(A.memory.buffer,n,o).set(i);var u=A.utf8DecodeToUint16Array(a,s,r);return function(e){if(e.length<=L)return String.fromCharCode.apply(String,e);for(var t="",r=0;r<e.length;r++){var n=e.subarray(r*L,(r+1)*L);t+=String.fromCharCode.apply(String,n)}return t}(new Uint16Array(A.memory.buffer,a,u))}finally{A.free(s),A.free(a)}}var I=function(e){var t="function"==typeof Symbol&&e[Symbol.iterator],r=0;return t?t.call(e):{next:function(){return e&&r>=e.length&&(e=void 0),{value:e&&e[r++],done:!e}}}},M=100,k=2048,P=function(){function e(e,t,r,n,i){void 0===e&&(e=x.defaultCodec),void 0===t&&(t=M),void 0===r&&(r=k),void 0===n&&(n=!1),void 0===i&&(i=!1),this.extensionCodec=e,this.maxDepth=t,this.initialBufferSize=r,this.sortKeys=n,this.forceFloat32=i,this.pos=0,this.view=new DataView(new ArrayBuffer(this.initialBufferSize)),this.bytes=new Uint8Array(this.view.buffer)}return e.prototype.encode=function(e,t){if(t>this.maxDepth)throw new Error("Too deep objects in depth "+t);null==e?this.encodeNil():"boolean"==typeof e?this.encodeBoolean(e):"number"==typeof e?this.encodeNumber(e):"string"==typeof e?this.encodeString(e):this.encodeObject(e,t)},e.prototype.getUint8Array=function(){return this.bytes.subarray(0,this.pos)},e.prototype.ensureBufferSizeToWrite=function(e){var t=this.pos+e;this.view.byteLength<t&&this.resizeBuffer(2*t)},e.prototype.resizeBuffer=function(e){var t=new ArrayBuffer(e),r=new Uint8Array(t),n=new DataView(t);r.set(this.bytes),this.view=n,this.bytes=r},e.prototype.encodeNil=function(){this.writeU8(192)},e.prototype.encodeBoolean=function(e){!1===e?this.writeU8(194):this.writeU8(195)},e.prototype.encodeNumber=function(e){Number.isSafeInteger(e)?e>=0?e<128?this.writeU8(e):e<256?(this.writeU8(204),this.writeU8(e)):e<65536?(this.writeU8(205),this.writeU16(e)):e<4294967296?(this.writeU8(206),this.writeU32(e)):(this.writeU8(207),this.writeU64(e)):e>=-32?this.writeU8(224|e+32):e>=-128?(this.writeU8(208),this.writeI8(e)):e>=-32768?(this.writeU8(209),this.writeI16(e)):e>=-2147483648?(this.writeU8(210),this.writeI32(e)):(this.writeU8(211),this.writeI64(e)):this.forceFloat32?(this.writeU8(202),this.writeF32(e)):(this.writeU8(203),this.writeF64(e))},e.prototype.writeStringHeader=function(e){if(e<32)this.writeU8(160+e);else if(e<256)this.writeU8(217),this.writeU8(e);else if(e<65536)this.writeU8(218),this.writeU16(e);else{if(!(e<4294967296))throw new Error("Too long string: "+e+" bytes in UTF-8");this.writeU8(219),this.writeU32(e)}},e.prototype.encodeString=function(e){var t=e.length;if(o&&t>200){var r=s(e);this.ensureBufferSizeToWrite(5+r),this.writeStringHeader(r),u(e,this.bytes,this.pos),this.pos+=r}else{if(E&&t>1024){var n=5+4*t;this.ensureBufferSizeToWrite(n);var i=B(e,this.bytes,this.pos);return void(this.pos+=i)}r=s(e);this.ensureBufferSizeToWrite(5+r),this.writeStringHeader(r),function(e,t,r){for(var n=e.length,i=r,o=0;o<n;){var s=e.charCodeAt(o++);if(0!=(4294967168&s)){if(0==(4294965248&s))t[i++]=s>>6&31|192;else{if(s>=55296&&s<=56319&&o<n){var a=e.charCodeAt(o);56320==(64512&a)&&(++o,s=((1023&s)<<10)+(1023&a)+65536)}0==(4294901760&s)?(t[i++]=s>>12&15|224,t[i++]=s>>6&63|128):(t[i++]=s>>18&7|240,t[i++]=s>>12&63|128,t[i++]=s>>6&63|128)}t[i++]=63&s|128}else t[i++]=s}}(e,this.bytes,this.pos),this.pos+=r}},e.prototype.encodeObject=function(e,t){var r=this.extensionCodec.tryToEncode(e);if(null!=r)this.encodeExtension(r);else if(Array.isArray(e))this.encodeArray(e,t);else if(ArrayBuffer.isView(e))this.encodeBinary(e);else{if("object"!=typeof e)throw new Error("Unrecognized object: "+Object.prototype.toString.apply(e));this.encodeMap(e,t)}},e.prototype.encodeBinary=function(e){var t=e.byteLength;if(t<256)this.writeU8(196),this.writeU8(t);else if(t<65536)this.writeU8(197),this.writeU16(t);else{if(!(t<4294967296))throw new Error("Too large binary: "+t);this.writeU8(198),this.writeU32(t)}var r=S(e);this.writeU8a(r)},e.prototype.encodeArray=function(e,t){var r,n,i=e.length;if(i<16)this.writeU8(144+i);else if(i<65536)this.writeU8(220),this.writeU16(i);else{if(!(i<4294967296))throw new Error("Too large array: "+i);this.writeU8(221),this.writeU32(i)}try{for(var o=I(e),s=o.next();!s.done;s=o.next()){var a=s.value;this.encode(a,t+1)}}catch(e){r={error:e}}finally{try{s&&!s.done&&(n=o.return)&&n.call(o)}finally{if(r)throw r.error}}},e.prototype.encodeMap=function(e,t){var r=Object.keys(e);this.sortKeys&&r.sort();var n=r.length;if(n<16)this.writeU8(128+n);else if(n<65536)this.writeU8(222),this.writeU16(n);else{if(!(n<4294967296))throw new Error("Too large map object: "+n);this.writeU8(223),this.writeU32(n)}for(var i=0;i<n;i++){var o=r[i];this.encodeString(o),this.encode(e[o],t+1)}},e.prototype.encodeExtension=function(e){var t=e.data.length;if(1===t)this.writeU8(212);else if(2===t)this.writeU8(213);else if(4===t)this.writeU8(214);else if(8===t)this.writeU8(215);else if(16===t)this.writeU8(216);else if(t<256)this.writeU8(199),this.writeU8(t);else if(t<65536)this.writeU8(200),this.writeU16(t);else{if(!(t<4294967296))throw new Error("Too large extension object: "+t);this.writeU8(201),this.writeU32(t)}this.writeI8(e.type),this.writeU8a(e.data)},e.prototype.writeU8=function(e){this.ensureBufferSizeToWrite(1),this.view.setUint8(this.pos,e),this.pos++},e.prototype.writeU8a=function(e){var t=e.length;this.ensureBufferSizeToWrite(t),this.bytes.set(e,this.pos),this.pos+=t},e.prototype.writeI8=function(e){this.ensureBufferSizeToWrite(1),this.view.setInt8(this.pos,e),this.pos++},e.prototype.writeU16=function(e){this.ensureBufferSizeToWrite(2),this.view.setUint16(this.pos,e),this.pos+=2},e.prototype.writeI16=function(e){this.ensureBufferSizeToWrite(2),this.view.setInt16(this.pos,e),this.pos+=2},e.prototype.writeU32=function(e){this.ensureBufferSizeToWrite(4),this.view.setUint32(this.pos,e),this.pos+=4},e.prototype.writeI32=function(e){this.ensureBufferSizeToWrite(4),this.view.setInt32(this.pos,e),this.pos+=4},e.prototype.writeF32=function(e){this.ensureBufferSizeToWrite(4),this.view.setFloat32(this.pos,e),this.pos+=4},e.prototype.writeF64=function(e){this.ensureBufferSizeToWrite(8),this.view.setFloat64(this.pos,e),this.pos+=8},e.prototype.writeU64=function(e){this.ensureBufferSizeToWrite(8),function(e,t,r){var n=r/4294967296,i=r;e.setUint32(t,n),e.setUint32(t+4,i)}(this.view,this.pos,e),this.pos+=8},e.prototype.writeI64=function(e){this.ensureBufferSizeToWrite(8),l(this.view,this.pos,e),this.pos+=8},e}(),z={};function C(e,t){void 0===t&&(t=z);var r=new P(t.extensionCodec,t.maxDepth,t.initialBufferSize,t.sortKeys,t.forceFloat32);return r.encode(e,1),r.getUint8Array()}function D(e){return(e<0?"-":"")+"0x"+Math.abs(e).toString(16).padStart(2,"0")}var _,j=function(e,t,r,n){return new(r||(r=Promise))(function(i,o){function s(e){try{u(n.next(e))}catch(e){o(e)}}function a(e){try{u(n.throw(e))}catch(e){o(e)}}function u(e){e.done?i(e.value):new r(function(t){t(e.value)}).then(s,a)}u((n=n.apply(e,t||[])).next())})},O=function(e,t){var r,n,i,o,s={label:0,sent:function(){if(1&i[0])throw i[1];return i[1]},trys:[],ops:[]};return o={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(o[Symbol.iterator]=function(){return this}),o;function a(o){return function(a){return function(o){if(r)throw new TypeError("Generator is already executing.");for(;s;)try{if(r=1,n&&(i=2&o[0]?n.return:o[0]?n.throw||((i=n.return)&&i.call(n),0):n.next)&&!(i=i.call(n,o[1])).done)return i;switch(n=0,i&&(o=[2&o[0],i.value]),o[0]){case 0:case 1:i=o;break;case 4:return s.label++,{value:o[1],done:!1};case 5:s.label++,n=o[1],o=[0];continue;case 7:o=s.ops.pop(),s.trys.pop();continue;default:if(!(i=(i=s.trys).length>0&&i[i.length-1])&&(6===o[0]||2===o[0])){s=0;continue}if(3===o[0]&&(!i||o[1]>i[0]&&o[1]<i[3])){s.label=o[1];break}if(6===o[0]&&s.label<i[1]){s.label=i[1],i=o;break}if(i&&s.label<i[2]){s.label=i[2],s.ops.push(o);break}i[2]&&s.ops.pop(),s.trys.pop();continue}o=t.call(e,s)}catch(e){o=[6,e],n=0}finally{r=i=0}if(5&o[0])throw o[1];return{value:o[0]?o[1]:void 0,done:!0}}([o,a])}}},F=function(e){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var t,r=e[Symbol.asyncIterator];return r?r.call(e):(e="function"==typeof __values?__values(e):e[Symbol.iterator](),t={},n("next"),n("throw"),n("return"),t[Symbol.asyncIterator]=function(){return this},t);function n(r){t[r]=e[r]&&function(t){return new Promise(function(n,i){(function(e,t,r,n){Promise.resolve(n).then(function(t){e({value:t,done:r})},t)})(n,i,(t=e[r](t)).done,t.value)})}}},V=function(e){return this instanceof V?(this.v=e,this):new V(e)},R=function(e,t,r){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var n,i=r.apply(e,t||[]),o=[];return n={},s("next"),s("throw"),s("return"),n[Symbol.asyncIterator]=function(){return this},n;function s(e){i[e]&&(n[e]=function(t){return new Promise(function(r,n){o.push([e,t,r,n])>1||a(e,t)})})}function a(e,t){try{(r=i[e](t)).value instanceof V?Promise.resolve(r.value.v).then(u,h):c(o[0][2],r)}catch(e){c(o[0][3],e)}var r}function u(e){a("next",e)}function h(e){a("throw",e)}function c(e,t){e(t),o.shift(),o.length&&a(o[0][0],o[0][1])}};!function(e){e[e.ARRAY=0]="ARRAY",e[e.MAP_KEY=1]="MAP_KEY",e[e.MAP_VALUE=2]="MAP_VALUE"}(_||(_={}));var W=-1,N=new DataView(new ArrayBuffer(0)),Y=new Uint8Array(N.buffer),K=function(){try{N.getInt8(0)}catch(e){return e.constructor}throw new Error("never reached")}(),H=new K("Insufficient data"),G=4294967295,X=function(){function e(e,t,r,n,i,o){void 0===e&&(e=x.defaultCodec),void 0===t&&(t=G),void 0===r&&(r=G),void 0===n&&(n=G),void 0===i&&(i=G),void 0===o&&(o=G),this.extensionCodec=e,this.maxStrLength=t,this.maxBinLength=r,this.maxArrayLength=n,this.maxMapLength=i,this.maxExtLength=o,this.totalPos=0,this.pos=0,this.view=N,this.bytes=Y,this.headByte=W,this.stack=[]}return e.prototype.setBuffer=function(e){this.bytes=S(e),this.view=function(e){if(e instanceof ArrayBuffer)return new DataView(e);var t=S(e);return new DataView(t.buffer,t.byteOffset,t.byteLength)}(this.bytes),this.pos=0},e.prototype.appendBuffer=function(e){if(this.headByte!==W||this.hasRemaining()){var t=this.bytes.subarray(this.pos),r=S(e),n=new Uint8Array(t.length+r.length);n.set(t),n.set(r,t.length),this.setBuffer(n)}else this.setBuffer(e)},e.prototype.hasRemaining=function(e){return void 0===e&&(e=1),this.view.byteLength-this.pos>=e},e.prototype.createNoExtraBytesError=function(e){var t=this.view,r=this.pos;return new RangeError("Extra "+(t.byteLength-r)+" byte(s) found at buffer["+e+"]")},e.prototype.decodeOneSync=function(){var e=this.decodeSync();if(this.hasRemaining())throw this.createNoExtraBytesError(this.pos);return e},e.prototype.decodeOneAsync=function(e){var t,r,n,i;return j(this,void 0,void 0,function(){var o,s,a,u,h,c,f,l;return O(this,function(p){switch(p.label){case 0:o=!1,p.label=1;case 1:p.trys.push([1,6,7,12]),t=F(e),p.label=2;case 2:return[4,t.next()];case 3:if((r=p.sent()).done)return[3,5];if(a=r.value,o)throw this.createNoExtraBytesError(this.totalPos);this.appendBuffer(a);try{s=this.decodeSync(),o=!0}catch(e){if(!(e instanceof K))throw e}this.totalPos+=this.pos,p.label=4;case 4:return[3,2];case 5:return[3,12];case 6:return u=p.sent(),n={error:u},[3,12];case 7:return p.trys.push([7,,10,11]),r&&!r.done&&(i=t.return)?[4,i.call(t)]:[3,9];case 8:p.sent(),p.label=9;case 9:return[3,11];case 10:if(n)throw n.error;return[7];case 11:return[7];case 12:if(o){if(this.hasRemaining())throw this.createNoExtraBytesError(this.totalPos);return[2,s]}throw c=(h=this).headByte,f=h.pos,l=h.totalPos,new RangeError("Insufficient data in parcing "+D(c)+" at "+l+" ("+f+" in the current buffer)")}})})},e.prototype.decodeStream=function(e){return R(this,arguments,function(){var t,r,n,i,o,s,a,u;return O(this,function(h){switch(h.label){case 0:h.trys.push([0,11,12,17]),t=F(e),h.label=1;case 1:return[4,V(t.next())];case 2:if((r=h.sent()).done)return[3,10];n=r.value,this.appendBuffer(n),h.label=3;case 3:h.trys.push([3,8,,9]),h.label=4;case 4:return i=this.decodeSync(),[4,V(i)];case 5:return[4,h.sent()];case 6:return h.sent(),[3,4];case 7:return[3,9];case 8:if(!((o=h.sent())instanceof K))throw o;return[3,9];case 9:return[3,1];case 10:return[3,17];case 11:return s=h.sent(),a={error:s},[3,17];case 12:return h.trys.push([12,,15,16]),r&&!r.done&&(u=t.return)?[4,V(u.call(t))]:[3,14];case 13:h.sent(),h.label=14;case 14:return[3,16];case 15:if(a)throw a.error;return[7];case 16:return[7];case 17:return[2]}})})},e.prototype.decodeArrayStream=function(e){return R(this,arguments,function(){var t,r,n,i,o,s,a,u,h,c,f;return O(this,function(l){switch(l.label){case 0:t=!1,r=!1,n=0,l.label=1;case 1:l.trys.push([1,13,14,19]),i=F(e),l.label=2;case 2:return[4,V(i.next())];case 3:if((o=l.sent()).done)return[3,12];if(s=o.value,r)throw this.createNoExtraBytesError(this.totalPos);this.appendBuffer(s),t||(n=this.readArraySize(),t=!0,this.complete()),l.label=4;case 4:l.trys.push([4,9,,10]),l.label=5;case 5:return a=this.decodeSync(),[4,V(a)];case 6:return[4,l.sent()];case 7:return l.sent(),0===--n?(r=!0,[3,8]):[3,5];case 8:return[3,10];case 9:if(!((u=l.sent())instanceof K))throw u;return[3,10];case 10:this.totalPos+=this.pos,l.label=11;case 11:return[3,2];case 12:return[3,19];case 13:return h=l.sent(),c={error:h},[3,19];case 14:return l.trys.push([14,,17,18]),o&&!o.done&&(f=i.return)?[4,V(f.call(i))]:[3,16];case 15:l.sent(),l.label=16;case 16:return[3,18];case 17:if(c)throw c.error;return[7];case 18:return[7];case 19:return[2]}})})},e.prototype.decodeSync=function(){e:for(;;){var e=this.readHeadByte(),t=void 0;if(e>=224)t=e-256;else if(e<192)if(e<128)t=e;else if(e<144){if(0!==(n=e-128)){this.pushMapState(n),this.complete();continue e}t={}}else if(e<160){if(0!==(n=e-144)){this.pushArrayState(n),this.complete();continue e}t=[]}else{var r=e-160;t=this.decodeUtf8String(r,0)}else if(192===e)t=null;else if(194===e)t=!1;else if(195===e)t=!0;else if(202===e)t=this.readF32();else if(203===e)t=this.readF64();else if(204===e)t=this.readU8();else if(205===e)t=this.readU16();else if(206===e)t=this.readU32();else if(207===e)t=this.readU64();else if(208===e)t=this.readI8();else if(209===e)t=this.readI16();else if(210===e)t=this.readI32();else if(211===e)t=this.readI64();else if(217===e){r=this.lookU8();t=this.decodeUtf8String(r,1)}else if(218===e){r=this.lookU16();t=this.decodeUtf8String(r,2)}else if(219===e){r=this.lookU32();t=this.decodeUtf8String(r,4)}else if(220===e){if(0!==(n=this.readU16())){this.pushArrayState(n),this.complete();continue e}t=[]}else if(221===e){if(0!==(n=this.readU32())){this.pushArrayState(n),this.complete();continue e}t=[]}else if(222===e){if(0!==(n=this.readU16())){this.pushMapState(n),this.complete();continue e}t={}}else if(223===e){if(0!==(n=this.readU32())){this.pushMapState(n),this.complete();continue e}t={}}else if(196===e){var n=this.lookU8();t=this.decodeBinary(n,1)}else if(197===e){n=this.lookU16();t=this.decodeBinary(n,2)}else if(198===e){n=this.lookU32();t=this.decodeBinary(n,4)}else if(212===e)t=this.decodeExtension(1,0);else if(213===e)t=this.decodeExtension(2,0);else if(214===e)t=this.decodeExtension(4,0);else if(215===e)t=this.decodeExtension(8,0);else if(216===e)t=this.decodeExtension(16,0);else if(199===e){n=this.lookU8();t=this.decodeExtension(n,1)}else if(200===e){n=this.lookU16();t=this.decodeExtension(n,2)}else{if(201!==e)throw new Error("Unrecognized type byte: "+D(e));n=this.lookU32();t=this.decodeExtension(n,4)}this.complete();for(var i=this.stack;i.length>0;){var o=i[i.length-1];if(o.type===_.ARRAY){if(o.array[o.position]=t,o.position++,o.position!==o.size)continue e;i.pop(),t=o.array}else{if(o.type===_.MAP_KEY){if("string"!=typeof t)throw new Error("The type of key must be string but "+typeof t);o.key=t,o.type=_.MAP_VALUE;continue e}if(o.type===_.MAP_VALUE){if(o.map[o.key]=t,o.readCount++,o.readCount!==o.size){o.key=null,o.type=_.MAP_KEY;continue e}i.pop(),t=o.map}}}return t}},e.prototype.readHeadByte=function(){return this.headByte===W&&(this.headByte=this.readU8()),this.headByte},e.prototype.complete=function(){this.headByte=W},e.prototype.readArraySize=function(){var e=this.readHeadByte();switch(e){case 220:return this.readU16();case 221:return this.readU32();default:if(e<160)return e-144;throw new Error("Unrecognized array type byte: "+D(e))}},e.prototype.pushMapState=function(e){if(e>this.maxMapLength)throw new Error("Max length exceeded: map length ("+e+") > maxMapLengthLength ("+this.maxMapLength+")");this.stack.push({type:_.MAP_KEY,size:e,key:null,readCount:0,map:{}})},e.prototype.pushArrayState=function(e){if(e>this.maxArrayLength)throw new Error("Max length exceeded: array length ("+e+") > maxArrayLength ("+this.maxArrayLength+")");this.stack.push({type:_.ARRAY,size:e,array:new Array(e),position:0})},e.prototype.decodeUtf8String=function(e,t){if(e>this.maxStrLength)throw new Error("Max length exceeded: UTF-8 byte length ("+e+") > maxStrLength ("+this.maxStrLength+")");if(this.bytes.byteLength<this.pos+t+e)throw H;var r,n=this.pos+t;return r=o&&e>200?function(e,t,r){var n=e.subarray(t,t+r);return c.decode(n)}(this.bytes,n,e):E&&e>1024?T(this.bytes,n,e):function(e,t,r){for(var n=t,o=n+r,s=[],a="";n<o;){var u=e[n++];if(0==(128&u))s.push(u);else if(192==(224&u)){var c=63&e[n++];s.push((31&u)<<6|c)}else if(224==(240&u)){c=63&e[n++];var f=63&e[n++];s.push((31&u)<<12|c<<6|f)}else if(240==(248&u)){var l=(7&u)<<18|(c=63&e[n++])<<12|(f=63&e[n++])<<6|63&e[n++];l>65535&&(l-=65536,s.push(l>>>10&1023|55296),l=56320|1023&l),s.push(l)}else s.push(u);s.length-4>=h&&(a+=String.fromCharCode.apply(String,i(s)),s.length=0)}return s.length>0&&(a+=String.fromCharCode.apply(String,i(s))),a}(this.bytes,n,e),this.pos+=t+e,r},e.prototype.decodeBinary=function(e,t){if(e>this.maxBinLength)throw new Error("Max length exceeded: bin length ("+e+") > maxBinLength ("+this.maxBinLength+")");if(!this.hasRemaining(e+t))throw H;var r=this.pos+t,n=this.bytes.subarray(r,r+e);return this.pos+=t+e,n},e.prototype.decodeExtension=function(e,t){if(e>this.maxExtLength)throw new Error("Max length exceeded: ext length ("+e+") > maxExtLength ("+this.maxExtLength+")");var r=this.view.getInt8(this.pos+t),n=this.decodeBinary(e,t+1);return this.extensionCodec.decode(n,r)},e.prototype.lookU8=function(){return this.view.getUint8(this.pos)},e.prototype.lookU16=function(){return this.view.getUint16(this.pos)},e.prototype.lookU32=function(){return this.view.getUint32(this.pos)},e.prototype.readU8=function(){var e=this.view.getUint8(this.pos);return this.pos++,e},e.prototype.readI8=function(){var e=this.view.getInt8(this.pos);return this.pos++,e},e.prototype.readU16=function(){var e=this.view.getUint16(this.pos);return this.pos+=2,e},e.prototype.readI16=function(){var e=this.view.getInt16(this.pos);return this.pos+=2,e},e.prototype.readU32=function(){var e=this.view.getUint32(this.pos);return this.pos+=4,e},e.prototype.readI32=function(){var e=this.view.getInt32(this.pos);return this.pos+=4,e},e.prototype.readU64=function(){var e,t,r=(e=this.view,t=this.pos,4294967296*e.getUint32(t)+e.getUint32(t+4));return this.pos+=8,r},e.prototype.readI64=function(){var e=p(this.view,this.pos);return this.pos+=8,e},e.prototype.readF32=function(){var e=this.view.getFloat32(this.pos);return this.pos+=4,e},e.prototype.readF64=function(){var e=this.view.getFloat64(this.pos);return this.pos+=8,e},e}(),q={};function J(e,t){void 0===t&&(t=q);var r=new X(t.extensionCodec,t.maxStrLength,t.maxBinLength,t.maxArrayLength,t.maxMapLength,t.maxExtLength);return r.setBuffer(e),r.decodeOneSync()}var Q=function(e,t){var r,n,i,o,s={label:0,sent:function(){if(1&i[0])throw i[1];return i[1]},trys:[],ops:[]};return o={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(o[Symbol.iterator]=function(){return this}),o;function a(o){return function(a){return function(o){if(r)throw new TypeError("Generator is already executing.");for(;s;)try{if(r=1,n&&(i=2&o[0]?n.return:o[0]?n.throw||((i=n.return)&&i.call(n),0):n.next)&&!(i=i.call(n,o[1])).done)return i;switch(n=0,i&&(o=[2&o[0],i.value]),o[0]){case 0:case 1:i=o;break;case 4:return s.label++,{value:o[1],done:!1};case 5:s.label++,n=o[1],o=[0];continue;case 7:o=s.ops.pop(),s.trys.pop();continue;default:if(!(i=(i=s.trys).length>0&&i[i.length-1])&&(6===o[0]||2===o[0])){s=0;continue}if(3===o[0]&&(!i||o[1]>i[0]&&o[1]<i[3])){s.label=o[1];break}if(6===o[0]&&s.label<i[1]){s.label=i[1],i=o;break}if(i&&s.label<i[2]){s.label=i[2],s.ops.push(o);break}i[2]&&s.ops.pop(),s.trys.pop();continue}o=t.call(e,s)}catch(e){o=[6,e],n=0}finally{r=i=0}if(5&o[0])throw o[1];return{value:o[0]?o[1]:void 0,done:!0}}([o,a])}}},Z=function(e){return this instanceof Z?(this.v=e,this):new Z(e)},$=function(e,t,r){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var n,i=r.apply(e,t||[]),o=[];return n={},s("next"),s("throw"),s("return"),n[Symbol.asyncIterator]=function(){return this},n;function s(e){i[e]&&(n[e]=function(t){return new Promise(function(r,n){o.push([e,t,r,n])>1||a(e,t)})})}function a(e,t){try{(r=i[e](t)).value instanceof Z?Promise.resolve(r.value.v).then(u,h):c(o[0][2],r)}catch(e){c(o[0][3],e)}var r}function u(e){a("next",e)}function h(e){a("throw",e)}function c(e,t){e(t),o.shift(),o.length&&a(o[0][0],o[0][1])}};function ee(e){return null!=e[Symbol.asyncIterator]?e:function(e){return $(this,arguments,function(){var t,r,n,i;return Q(this,function(o){switch(o.label){case 0:t=e.getReader(),o.label=1;case 1:o.trys.push([1,,9,10]),o.label=2;case 2:return[4,Z(t.read())];case 3:return r=o.sent(),n=r.done,i=r.value,n?[4,Z(void 0)]:[3,5];case 4:return[2,o.sent()];case 5:return[4,Z(i)];case 6:return[4,o.sent()];case 7:return o.sent(),[3,2];case 8:return[3,10];case 9:return t.releaseLock(),[7];case 10:return[2]}})})}(e)}var te=function(e,t,r,n){return new(r||(r=Promise))(function(i,o){function s(e){try{u(n.next(e))}catch(e){o(e)}}function a(e){try{u(n.throw(e))}catch(e){o(e)}}function u(e){e.done?i(e.value):new r(function(t){t(e.value)}).then(s,a)}u((n=n.apply(e,t||[])).next())})},re=function(e,t){var r,n,i,o,s={label:0,sent:function(){if(1&i[0])throw i[1];return i[1]},trys:[],ops:[]};return o={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(o[Symbol.iterator]=function(){return this}),o;function a(o){return function(a){return function(o){if(r)throw new TypeError("Generator is already executing.");for(;s;)try{if(r=1,n&&(i=2&o[0]?n.return:o[0]?n.throw||((i=n.return)&&i.call(n),0):n.next)&&!(i=i.call(n,o[1])).done)return i;switch(n=0,i&&(o=[2&o[0],i.value]),o[0]){case 0:case 1:i=o;break;case 4:return s.label++,{value:o[1],done:!1};case 5:s.label++,n=o[1],o=[0];continue;case 7:o=s.ops.pop(),s.trys.pop();continue;default:if(!(i=(i=s.trys).length>0&&i[i.length-1])&&(6===o[0]||2===o[0])){s=0;continue}if(3===o[0]&&(!i||o[1]>i[0]&&o[1]<i[3])){s.label=o[1];break}if(6===o[0]&&s.label<i[1]){s.label=i[1],i=o;break}if(i&&s.label<i[2]){s.label=i[2],s.ops.push(o);break}i[2]&&s.ops.pop(),s.trys.pop();continue}o=t.call(e,s)}catch(e){o=[6,e],n=0}finally{r=i=0}if(5&o[0])throw o[1];return{value:o[0]?o[1]:void 0,done:!0}}([o,a])}}};function ne(e,t){return void 0===t&&(t=q),te(this,void 0,void 0,function(){var r;return re(this,function(n){return r=ee(e),[2,new X(t.extensionCodec,t.maxStrLength,t.maxBinLength,t.maxArrayLength,t.maxMapLength,t.maxExtLength).decodeOneAsync(r)]})})}function ie(e,t){void 0===t&&(t=q);var r=ee(e);return new X(t.extensionCodec,t.maxStrLength,t.maxBinLength,t.maxArrayLength,t.maxMapLength,t.maxExtLength).decodeArrayStream(r)}function oe(e,t){void 0===t&&(t=q);var r=ee(e);return new X(t.extensionCodec,t.maxStrLength,t.maxBinLength,t.maxArrayLength,t.maxMapLength,t.maxExtLength).decodeStream(r)}r.d(t,"encode",function(){return C}),r.d(t,"decode",function(){return J}),r.d(t,"decodeAsync",function(){return ne}),r.d(t,"decodeArrayStream",function(){return ie}),r.d(t,"decodeStream",function(){return oe}),r.d(t,"Decoder",function(){return X}),r.d(t,"Encoder",function(){return P}),r.d(t,"ExtensionCodec",function(){return x}),r.d(t,"ExtData",function(){return f}),r.d(t,"EXT_TIMESTAMP",function(){return-1}),r.d(t,"encodeDateToTimeSpec",function(){return v}),r.d(t,"encodeTimeSpecToTimestamp",function(){return w}),r.d(t,"decodeTimestampToTimeSpec",function(){return g}),r.d(t,"encodeTimestampExtension",function(){return b}),r.d(t,"decodeTimestampExtension",function(){return U}),r.d(t,"__WASM_AVAILABLE",function(){return E})}])});

},{}],"callflow":[function(require,module,exports){

//var path = require("path");
function defaultErrorHandlingImplementation(err, res){
	//console.log(err.stack);
	if(err) throw err;
	return res;
}

require("./lib/overwriteRequire");
/*
const PSKBuffer = require('pskbuffer');
$$.PSKBuffer = PSKBuffer; */


$$.obsolete("Please remove $$.errorHandler  asap");
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


$$.obsolete("Please remove $$.safeErrorHandling asap");
$$.safeErrorHandling = function(callback){
        if(callback){
            return callback;
        } else{
            return defaultErrorHandlingImplementation;
        }
    };



$$.obsolete("Please remove $$.__intern asap");
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

},{"./constants":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/constants.js","./lib/InterceptorRegistry":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/InterceptorRegistry.js","./lib/choreographies/swarmInstancesManager":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/swarmInstancesManager.js","./lib/choreographies/utilityFunctions/asset":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/utilityFunctions/asset.js","./lib/choreographies/utilityFunctions/swarm":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/choreographies/utilityFunctions/swarm.js","./lib/loadLibrary":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/loadLibrary.js","./lib/overwriteRequire":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/overwriteRequire.js","./lib/parallelJoinPoint":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/parallelJoinPoint.js","./lib/serialJoinPoint":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/serialJoinPoint.js","./lib/swarmDescription":"/home/cosmin/Workspace/reorganizing/privatesky/modules/callflow/lib/swarmDescription.js","path":"path","soundpubsub":"soundpubsub"}],"dicontainer":[function(require,module,exports){
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

if(typeof(___DISABLE_OBSOLETE_ZIP_ARCHIVER_WAIT_FOR_BARS) === 'undefined'){
    module.exports.PskArchiver = require("./lib/psk-archiver");
}

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZHMvdG1wL3Bza3J1bnRpbWUuanMiLCJidWlsZHMvdG1wL3Bza3J1bnRpbWVfaW50ZXJtZWRpYXIuanMiLCJsaWJyYXJpZXMvZG9tYWluQmFzZS9kb21haW5QdWJTdWIuanMiLCJsaWJyYXJpZXMvbGF1bmNoZXIvY29tcG9uZW50cy5qcyIsImxpYnJhcmllcy91dGlscy9GU0V4dGVuc2lvbi5qcyIsIm1vZHVsZXMvY2FsbGZsb3cvY29uc3RhbnRzLmpzIiwibW9kdWxlcy9jYWxsZmxvdy9saWIvSW50ZXJjZXB0b3JSZWdpc3RyeS5qcyIsIm1vZHVsZXMvY2FsbGZsb3cvbGliL2Nob3Jlb2dyYXBoaWVzL1N3YXJtRGVidWcuanMiLCJtb2R1bGVzL2NhbGxmbG93L2xpYi9jaG9yZW9ncmFwaGllcy9zd2FybUluc3RhbmNlc01hbmFnZXIuanMiLCJtb2R1bGVzL2NhbGxmbG93L2xpYi9jaG9yZW9ncmFwaGllcy91dGlsaXR5RnVuY3Rpb25zL2Fzc2V0LmpzIiwibW9kdWxlcy9jYWxsZmxvdy9saWIvY2hvcmVvZ3JhcGhpZXMvdXRpbGl0eUZ1bmN0aW9ucy9iYXNlLmpzIiwibW9kdWxlcy9jYWxsZmxvdy9saWIvY2hvcmVvZ3JhcGhpZXMvdXRpbGl0eUZ1bmN0aW9ucy9jYWxsZmxvdy5qcyIsIm1vZHVsZXMvY2FsbGZsb3cvbGliL2Nob3Jlb2dyYXBoaWVzL3V0aWxpdHlGdW5jdGlvbnMvc3dhcm0uanMiLCJtb2R1bGVzL2NhbGxmbG93L2xpYi9sb2FkTGlicmFyeS5qcyIsIm1vZHVsZXMvY2FsbGZsb3cvbGliL292ZXJ3cml0ZVJlcXVpcmUuanMiLCJtb2R1bGVzL2NhbGxmbG93L2xpYi9wYXJhbGxlbEpvaW5Qb2ludC5qcyIsIm1vZHVsZXMvY2FsbGZsb3cvbGliL3NlcmlhbEpvaW5Qb2ludC5qcyIsIm1vZHVsZXMvY2FsbGZsb3cvbGliL3N3YXJtRGVzY3JpcHRpb24uanMiLCJtb2R1bGVzL2NhbGxmbG93L3N0YW5kYXJkR2xvYmFsU3ltYm9scy5qcyIsIm1vZHVsZXMvZG91YmxlLWNoZWNrL2xpYi9zdGFuZGFyZEFzc2VydHMuanMiLCJtb2R1bGVzL2RvdWJsZS1jaGVjay9saWIvc3RhbmRhcmRDaGVja3MuanMiLCJtb2R1bGVzL2RvdWJsZS1jaGVjay9saWIvc3RhbmRhcmRFeGNlcHRpb25zLmpzIiwibW9kdWxlcy9kb3VibGUtY2hlY2svbGliL3N0YW5kYXJkTG9ncy5qcyIsIm1vZHVsZXMvZG91YmxlLWNoZWNrL2xpYi90ZXN0UnVubmVyLmpzIiwibW9kdWxlcy9kb3VibGUtY2hlY2svbGliL3V0aWxzL2dsb2ItdG8tcmVnZXhwLmpzIiwibW9kdWxlcy9mb2xkZXJtcS9saWIvZm9sZGVyTVEuanMiLCJtb2R1bGVzL3Bza2J1ZmZlci9saWIvUFNLQnVmZmVyLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL0VDRFNBLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL1Bza0NyeXB0by5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9hc24xL2FwaS5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9hc24xL2FzbjEuanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvYXNuMS9iYXNlL2J1ZmZlci5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9hc24xL2Jhc2UvaW5kZXguanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvYXNuMS9iYXNlL25vZGUuanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvYXNuMS9iYXNlL3JlcG9ydGVyLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL2FzbjEvYmlnbnVtL2JuLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL2FzbjEvY29uc3RhbnRzL2Rlci5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9hc24xL2NvbnN0YW50cy9pbmRleC5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9hc24xL2RlY29kZXJzL2Rlci5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9hc24xL2RlY29kZXJzL2luZGV4LmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL2FzbjEvZGVjb2RlcnMvcGVtLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL2FzbjEvZW5jb2RlcnMvZGVyLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL2FzbjEvZW5jb2RlcnMvaW5kZXguanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvYXNuMS9lbmNvZGVycy9wZW0uanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIva2V5RW5jb2Rlci5qcyIsIm1vZHVsZXMvcHNrY3J5cHRvL2xpYi9wc2stYXJjaGl2ZXIuanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvdXRpbHMvRHVwbGV4U3RyZWFtLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL3V0aWxzL1Bhc3NUaHJvdWdoU3RyZWFtLmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vbGliL3V0aWxzL2NvdW50RmlsZXMuanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvdXRpbHMvY3J5cHRvVXRpbHMuanMiLCJtb2R1bGVzL3Bza2NyeXB0by9saWIvdXRpbHMvaXNTdHJlYW0uanMiLCJtb2R1bGVzL3Bza2NyeXB0by9zaWduc2Vuc3VzRFMvc3N1dGlsLmpzIiwibW9kdWxlcy9zb3VuZHB1YnN1Yi9saWIvc291bmRQdWJTdWIuanMiLCJtb2R1bGVzL3N3YXJtdXRpbHMvbGliL0NvbWJvcy5qcyIsIm1vZHVsZXMvc3dhcm11dGlscy9saWIvT3dNLmpzIiwibW9kdWxlcy9zd2FybXV0aWxzL2xpYi9RdWV1ZS5qcyIsIm1vZHVsZXMvc3dhcm11dGlscy9saWIvYmVlc0hlYWxlci5qcyIsIm1vZHVsZXMvc3dhcm11dGlscy9saWIvcHNrY29uc29sZS5qcyIsIm1vZHVsZXMvc3dhcm11dGlscy9saWIvc2FmZS11dWlkLmpzIiwibW9kdWxlcy9zd2FybXV0aWxzL2xpYi91aWRHZW5lcmF0b3IuanMiLCJwc2tub2RlL2NvcmUvc2FuZGJveGVzL3V0aWwvU2FuZEJveE1hbmFnZXIuanMiLCJwc2tub2RlL2NvcmUvdXRpbHMvZXhpdEhhbmRsZXIuanMiLCJub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNS9tc2dwYWNrLm1pbi5qcyIsIm1vZHVsZXMvY2FsbGZsb3cvaW5kZXguanMiLCJtb2R1bGVzL2RpY29udGFpbmVyL2xpYi9jb250YWluZXIuanMiLCJsaWJyYXJpZXMvZG9tYWluQmFzZS9pbmRleC5qcyIsIm1vZHVsZXMvZG91YmxlLWNoZWNrL2xpYi9jaGVja3NDb3JlLmpzIiwibW9kdWxlcy9mb2xkZXJtcS9pbmRleC5qcyIsImxpYnJhcmllcy9sYXVuY2hlci9pbmRleC5qcyIsIm1vZHVsZXMvcHNrYnVmZmVyL2luZGV4LmpzIiwibW9kdWxlcy9wc2tjcnlwdG8vaW5kZXguanMiLCJtb2R1bGVzL3NvdW5kcHVic3ViL2luZGV4LmpzIiwibW9kdWxlcy9zd2FybXV0aWxzL2luZGV4LmpzIiwibGlicmFyaWVzL3V0aWxzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDN2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNyUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDN09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDN3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM3VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOXdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcGFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTs7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pCQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsInJlcXVpcmUoXCIuLi8uLi9tb2R1bGVzL2NhbGxmbG93L2xpYi9vdmVyd3JpdGVSZXF1aXJlXCIpXG5cbnJlcXVpcmUoXCIuL3Bza3J1bnRpbWVfaW50ZXJtZWRpYXJcIik7XG5cbnJlcXVpcmUoXCJjYWxsZmxvd1wiKTtcblxuY29uc29sZS5sb2coXCJMb2FkaW5nIHJ1bnRpbWU6IGNhbGxmbG93IG1vZHVsZSByZWFkeVwiKTsiLCJnbG9iYWwucHNrcnVudGltZUxvYWRNb2R1bGVzID0gZnVuY3Rpb24oKXsgXG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJjYWxsZmxvd1wiXSA9IHJlcXVpcmUoXCJjYWxsZmxvd1wiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImxhdW5jaGVyXCJdID0gcmVxdWlyZShcImxhdW5jaGVyXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wiZG91YmxlLWNoZWNrXCJdID0gcmVxdWlyZShcImRvdWJsZS1jaGVja1wiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcInBza2NyeXB0b1wiXSA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJkaWNvbnRhaW5lclwiXSA9IHJlcXVpcmUoXCJkaWNvbnRhaW5lclwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcInN3YXJtdXRpbHNcIl0gPSByZXF1aXJlKFwic3dhcm11dGlsc1wiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcInNvdW5kcHVic3ViXCJdID0gcmVxdWlyZShcInNvdW5kcHVic3ViXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wicHNrYnVmZmVyXCJdID0gcmVxdWlyZShcInBza2J1ZmZlclwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImZvbGRlcm1xXCJdID0gcmVxdWlyZShcImZvbGRlcm1xXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wiZG9tYWluQmFzZVwiXSA9IHJlcXVpcmUoXCJkb21haW5CYXNlXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1widXRpbHNcIl0gPSByZXF1aXJlKFwidXRpbHNcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJAbXNncGFjay9tc2dwYWNrXCJdID0gcmVxdWlyZShcIkBtc2dwYWNrL21zZ3BhY2tcIik7XG59XG5pZiAoZmFsc2UpIHtcblx0cHNrcnVudGltZUxvYWRNb2R1bGVzKCk7XG59OyBcbmdsb2JhbC5wc2tydW50aW1lUmVxdWlyZSA9IHJlcXVpcmU7XG5pZiAodHlwZW9mICQkICE9PSBcInVuZGVmaW5lZFwiKSB7ICAgICAgICAgICAgXG4gICAgJCQucmVxdWlyZUJ1bmRsZShcInBza3J1bnRpbWVcIik7XG59OyIsInZhciBwdWJTdWIgPSAkJC5yZXF1aXJlKFwic291bmRwdWJzdWJcIikuc291bmRQdWJTdWI7XG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcblxuZXhwb3J0cy5jcmVhdGUgPSBmdW5jdGlvbihmb2xkZXIsIGNvZGVGb2xkZXIgKXtcblxuICAgICQkLlBTS19QdWJTdWIgPSBwdWJTdWI7XG4gICAgdmFyIHNhbmRCb3hlc1Jvb3QgPSBwYXRoLmpvaW4oZm9sZGVyLCBcInNhbmRib3hlc1wiKTtcblxuICAgIHRyeXtcbiAgICAgICAgZnMubWtkaXJTeW5jKHNhbmRCb3hlc1Jvb3QsIHtyZWN1cnNpdmU6IHRydWV9KTtcbiAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICAgY29uc29sZS5sb2coXCJGYWlsZWQgdG8gY3JlYXRlIHNhbmRib3hlcyBkaXIgc3RydWN0dXJlIVwiLCBlcnIpO1xuICAgICAgICAvL1RPRE86IG1heWJlIGl0IGlzIG9rIHRvIGNhbGwgcHJvY2Vzcy5leGl0ID8/P1xuICAgIH1cblxuICAgICQkLlNhbmRCb3hNYW5hZ2VyID0gcmVxdWlyZShcIi4uLy4uL3Bza25vZGUvY29yZS9zYW5kYm94ZXMvdXRpbC9TYW5kQm94TWFuYWdlclwiKS5jcmVhdGUoc2FuZEJveGVzUm9vdCwgY29kZUZvbGRlciwgZnVuY3Rpb24oZXJyLCByZXMpe1xuICAgICAgICBjb25zb2xlLmxvZygkJC5ESV9jb21wb25lbnRzLnNhbmRCb3hSZWFkeSwgZXJyLCByZXMpO1xuICAgICAgICAkJC5jb250YWluZXIucmVzb2x2ZSgkJC5ESV9jb21wb25lbnRzLnNhbmRCb3hSZWFkeSwgdHJ1ZSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcHViU3ViO1xufTtcbiIsIiQkLkRJX2NvbXBvbmVudHMgPSB7XG4gICBzd2FybUlzUmVhZHk6XCJTd2FybUlzUmVhZHlcIixcbiAgIGNvbmZpZ0xvYWRlZDpcImNvbmZpZ0xvYWRlZFwiLFxuICAgc2FuZEJveFJlYWR5OlwiU2FuZEJveFJlYWR5XCIsXG4gICBsb2NhbE5vZGVBUElzOlwibG9jYWxOb2RlQVBJc1wiXG59XG4iLCJjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IG9zID0gcmVxdWlyZShcIm9zXCIpO1xuY29uc3QgY2hpbGRfcHJvY2VzcyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKTtcbmNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpO1xuXG4vLyBpZiB0aGlzIGlzIHNldCB0byB0cnVlLCB0aGUgbG9ncyB3aWxsIGJlIGF2YWlsYWJsZS4gRGVmYXVsdCAoZmFsc2UpXG5jb25zdCBERUJVRyA9ICBwcm9jZXNzLmVudi5ERVBMT1lFUl9ERUJVRyB8fCBmYWxzZTtcblxuZnVuY3Rpb24gRlNFeHRlbnRpb24oKXtcblxuICAgIC8qKlxuICAgICAqIEJhc2UgcGF0aCB1c2VkIHRvIHJlc29sdmUgYWxsIHJlbGF0aXZlIHBhdGhzIGluIHRoZSBhY3Rpb25zIGJlbGxvdy5cbiAgICAgKiBEZWZhdWx0IGlzIHNldCB0byB0d28gbGV2ZWxzIHVwIGZyb20gdGhlIGN1cnJlbnQgZGlyZWN0b3J5LiBUaGlzIGNhbiBiZSBjaGFuZ2VkIHVzaW5nIF9fc2V0QmFzZVBhdGguXG4gICAgICogQHR5cGUgeyp8c3RyaW5nfVxuICAgICAqL1xuICAgIHZhciBiYXNlUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vLi4vXCIpO1xuXG4gICAgLyoqXG4gICAgICogU2V0IHRoZSBiYXNlIHBhdGggdG8gYSBkaWZmZXJlbnQgYWJzb2x1dGUgZGlyZWN0b3J5IHBhdGguXG4gICAgICogQHBhcmFtIHdkIHtTdHJpbmd9IGFic29sdXRlIGRpcmVjdG9yeSBwYXRoLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdmFyIF9fc2V0QmFzZVBhdGggPSBmdW5jdGlvbih3ZCkge1xuICAgICAgICBiYXNlUGF0aCA9IHBhdGgucmVzb2x2ZSh3ZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVzb2x2ZSBwYXRoIGludG8gYW4gYWJzb2x1dGUgcGF0aC4gSWYgZmlsZVBhdGggaXMgcmVsYXRpdmUsIHRoZSBwYXRoIGlzIHJlc29sdmVkIHVzaW5nIHRoZSBiYXNlUGF0aCBhcyBmaXJzdCBhcmd1bWVudC5cbiAgICAgKiBAcGFyYW0gZmlsZVBhdGgge1N0cmluZ30gcmVsYXRpdmUgb3IgYWJzb2x1dGUgZmlsZSBwYXRoLlxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IGFic29sdXRlIHBhdGhcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHZhciBfX3Jlc29sdmVQYXRoID0gZnVuY3Rpb24oZmlsZVBhdGgpIHtcbiAgICAgICAgaWYocGF0aC5pc0Fic29sdXRlKGZpbGVQYXRoKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZpbGVQYXRoO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBhdGgucmVzb2x2ZShiYXNlUGF0aCwgZmlsZVBhdGgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIElmIHRoZSBkaXJlY3Rvcnkgc3RydWN0dXJlIGRvZXMgbm90IGV4aXN0LCBpdCBpcyBjcmVhdGVkLiBMaWtlIG1rZGlyIC1wXG4gICAgICogQHBhcmFtIGRpciB7U3RyaW5nfSBkaXIgcGF0aFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdmFyIF9fY3JlYXRlRGlyID0gZnVuY3Rpb24oZGlyKSB7XG4gICAgICAgIGRpciA9IF9fcmVzb2x2ZVBhdGgoZGlyKTtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgICAgICAgbG9nKGRpciArIFwiIGFscmVhZHkgZXhpc3QhIENvbnRpbnVpbmcgLi4uXCIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaXNXaW4gPSAob3MucGxhdGZvcm0oKSA9PT0gJ3dpbjMyJyk7XG4gICAgICAgIHZhciBjbWQgPSBpc1dpbiA/IFwibWtkaXIgXCIgOiBcIm1rZGlyIC1wIFwiO1xuXG4gICAgICAgIGNoaWxkX3Byb2Nlc3MuZXhlY1N5bmMoY21kICsgXCJcXFwiXCIrZGlyK1wiXFxcIlwiLCB7c3RkaW86WzAsMSwyXX0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvcHkgYSBmaWxlIG9yIGRpcmVjdG9yeS4gVGhlIGRpcmVjdG9yeSBjYW4gaGF2ZSByZWN1cnNpdmUgY29udGVudHMuIExpa2UgY29weSAtci5cbiAgICAgKiBOT1RFOiBJZiBzcmMgaXMgYSBkaXJlY3RvcnkgaXQgd2lsbCBjb3B5IGV2ZXJ5dGhpbmcgaW5zaWRlIG9mIHRoZSBkaXJlY3RvcnksIG5vdCB0aGUgZW50aXJlIGRpcmVjdG9yeSBpdHNlbGYuXG4gICAgICogTk9URTogSWYgc3JjIGlzIGEgZmlsZSwgdGFyZ2V0IGNhbm5vdCBiZSBhIGRpcmVjdG9yeS5cbiAgICAgKiBOT1RFOiBJZiB0aGUgZGVzdGluYXRpb24gcGF0aCBzdHJ1Y3R1cmUgZG9lcyBub3QgZXhpc3RzLCBpdCB3aWxsIGJlIGNyZWF0ZWQuXG4gICAgICogQHBhcmFtIHNyYyB7U3RyaW5nfSBTb3VyY2UgZmlsZXxkaXJlY3RvcnkgcGF0aC5cbiAgICAgKiBAcGFyYW0gZGVzdCB7U3RyaW5nfSBEZXN0aW5hdGlvbiBmaWxlfGRpcmVjdG9yeSBwYXRoLlxuICAgICAqIEBwYXJhbSBvcHRpb25zIHtPYmplY3R9IE9wdGlvbmFsIHBhcmFtZXRlcnMgZm9yIGNvcHkgYWN0aW9uLiBBdmFpbGFibGUgb3B0aW9uczpcbiAgICAgKiAgLSBvdmVyd3JpdGUgPEJvb2xlYW4+OiBvdmVyd3JpdGUgZXhpc3RpbmcgZmlsZSBvciBkaXJlY3RvcnksIGRlZmF1bHQgaXMgdHJ1ZS5cbiAgICAgKiAgTm90ZSB0aGF0IHRoZSBjb3B5IG9wZXJhdGlvbiB3aWxsIHNpbGVudGx5IGZhaWwgaWYgdGhpcyBpcyBzZXQgdG8gZmFsc2UgYW5kIHRoZSBkZXN0aW5hdGlvbiBleGlzdHMuXG4gICAgICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHZhciBfX2NvcHkgPSBmdW5jdGlvbiAoc3JjLCBkZXN0LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICBzcmMgPSBfX3Jlc29sdmVQYXRoKHNyYyk7XG4gICAgICAgIGRlc3QgPSBfX3Jlc29sdmVQYXRoKGRlc3QpO1xuXG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24oKXt9O1xuICAgICAgICBsZXQgcmV0aHJvdyA9IGZhbHNlO1xuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzcmMpKSB7XG4gICAgICAgICAgICAgICAgcmV0aHJvdyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhyb3cgYFNvdXJjZSBkaXJlY3Rvcnkgb3IgZmlsZSBcIiR7c3JjfVwiIGRvZXMgbm90IGV4aXN0cyFgO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgc3JjU3RhdCA9IGZzLmxzdGF0U3luYyhzcmMpO1xuICAgICAgICAgICAgaWYoc3JjU3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgICAgX19jb3B5RGlyKHNyYywgZGVzdCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYoc3JjU3RhdC5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgICAgIC8vIGRlc3RpbmF0aW9uIG11c3QgYmUgYSBmaWxlIHRvb1xuICAgICAgICAgICAgICAgIF9fY29weUZpbGUoc3JjLCBkZXN0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBpZihyZXRocm93KXtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsb2coZXJyLCB0cnVlKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvcHkgYSBkaXJlY3RvcnkuIFRoZSBkaXJlY3RvcnkgY2FuIGhhdmUgcmVjdXJzaXZlIGNvbnRlbnRzLiBMaWtlIGNvcHkgLXIuXG4gICAgICogTk9URTogSXR0IHdpbGwgY29weSBldmVyeXRoaW5nIGluc2lkZSBvZiB0aGUgZGlyZWN0b3J5LCBub3QgdGhlIGVudGlyZSBkaXJlY3RvcnkgaXRzZWxmLlxuICAgICAqIE5PVEU6IElmIHRoZSBkZXN0aW5hdGlvbiBwYXRoIHN0cnVjdHVyZSBkb2VzIG5vdCBleGlzdHMsIGl0IHdpbGwgYmUgY3JlYXRlZC5cbiAgICAgKiBAcGFyYW0gc3JjIHtTdHJpbmd9IFNvdXJjZSBkaXJlY3RvcnkgcGF0aC5cbiAgICAgKiBAcGFyYW0gZGVzdCB7U3RyaW5nfSBEZXN0aW5hdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB7T2JqZWN0fSBPcHRpb25hbCBwYXJhbWV0ZXJzIGZvciBjb3B5IGFjdGlvbi4gQXZhaWxhYmxlIG9wdGlvbnM6XG4gICAgICogIC0gb3ZlcndyaXRlIDxCb29sZWFuPjogb3ZlcndyaXRlIGV4aXN0aW5nIGRpcmVjdG9yeSwgZGVmYXVsdCBpcyB0cnVlLlxuICAgICAqICBOb3RlIHRoYXQgdGhlIGNvcHkgb3BlcmF0aW9uIHdpbGwgc2lsZW50bHkgZmFpbCBpZiB0aGlzIGlzIHNldCB0byBmYWxzZSBhbmQgdGhlIGRlc3RpbmF0aW9uIGV4aXN0cy5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHZhciBfX2NvcHlEaXIgPSBmdW5jdGlvbihzcmMsIGRlc3QsIG9wdGlvbnMpIHtcbiAgICAgICAgc3JjID0gX19yZXNvbHZlUGF0aChzcmMpO1xuICAgICAgICBkZXN0ID0gX19yZXNvbHZlUGF0aChkZXN0KTtcblxuICAgICAgICBfX2NyZWF0ZURpcihkZXN0KTtcblxuICAgICAgICB2YXIgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhzcmMpO1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgZmlsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBjdXJyZW50ID0gZnMubHN0YXRTeW5jKHBhdGguam9pbihzcmMsIGZpbGVzW2ldKSk7XG4gICAgICAgICAgICBsZXQgbmV3U3JjID0gcGF0aC5qb2luKHNyYywgZmlsZXNbaV0pO1xuICAgICAgICAgICAgbGV0IG5ld0Rlc3QgPSBwYXRoLmpvaW4oZGVzdCwgZmlsZXNbaV0pO1xuXG4gICAgICAgICAgICBpZihjdXJyZW50LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICBfX2NvcHlEaXIobmV3U3JjLCBuZXdEZXN0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihjdXJyZW50LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3ltbGluayA9IGZzLnJlYWRsaW5rU3luYyhuZXdTcmMpO1xuICAgICAgICAgICAgICAgIGZzLnN5bWxpbmtTeW5jKHN5bWxpbmssIG5ld0Rlc3QpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfX2NvcHlGaWxlKG5ld1NyYywgbmV3RGVzdCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ29weSBhIGZpbGUuXG4gICAgICogTk9URTogSWYgc3JjIGlzIGEgZmlsZSwgdGFyZ2V0IGNhbm5vdCBiZSBhIGRpcmVjdG9yeS5cbiAgICAgKiBOT1RFOiBJZiB0aGUgZGVzdGluYXRpb24gcGF0aCBzdHJ1Y3R1cmUgZG9lcyBub3QgZXhpc3RzLCBpdCB3aWxsIGJlIGNyZWF0ZWQuXG4gICAgICogQHBhcmFtIHNyYyB7U3RyaW5nfSBTb3VyY2UgZmlsZSBwYXRoLlxuICAgICAqIEBwYXJhbSBkZXN0IHtTdHJpbmd9IERlc3RpbmF0aW9uIGZpbGUgcGF0aC5cbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB7T2JqZWN0fSBPcHRpb25hbCBwYXJhbWV0ZXJzIGZvciBjb3B5IGFjdGlvbi4gQXZhaWxhYmxlIG9wdGlvbnM6XG4gICAgICogIC0gb3ZlcndyaXRlIDxCb29sZWFuPjogb3ZlcndyaXRlIGV4aXN0aW5nIGZpbGUgb3IgZGlyZWN0b3J5LCBkZWZhdWx0IGlzIHRydWUuXG4gICAgICogIE5vdGUgdGhhdCB0aGUgY29weSBvcGVyYXRpb24gd2lsbCBzaWxlbnRseSBmYWlsIGlmIHRoaXMgaXMgc2V0IHRvIGZhbHNlIGFuZCB0aGUgZGVzdGluYXRpb24gZXhpc3RzLlxuICAgICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICB2YXIgX19jb3B5RmlsZSA9IGZ1bmN0aW9uKHNyYywgZGVzdCwgb3B0aW9ucykge1xuICAgICAgICBzcmMgPSBfX3Jlc29sdmVQYXRoKHNyYyk7XG4gICAgICAgIGRlc3QgPSBfX3Jlc29sdmVQYXRoKGRlc3QpO1xuXG4gICAgICAgIGlmKG9wdGlvbnMgJiYgb3B0aW9ucy5vdmVyd3JpdGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhkZXN0KSkge1xuICAgICAgICAgICAgICAgIC8vIHNpbGVudGx5IGZhaWwgaWYgb3ZlcndyaXRlIGlzIHNldCB0byBmYWxzZSBhbmQgdGhlIGRlc3RpbmF0aW9uIGV4aXN0cy5cbiAgICAgICAgICAgICAgICBsZXQgZXJyb3IgPSBgU2lsZW50IGZhaWwgLSBjYW5ub3QgY29weS4gRGVzdGluYXRpb24gZmlsZSAke2Rlc3R9IGFscmVhZHkgZXhpc3RzIGFuZCBvdmVyd3JpdGUgb3B0aW9uIGlzIHNldCB0byBmYWxzZSEgQ29udGludWluZy4uLmA7XG4gICAgICAgICAgICAgICAgbG9nKGVycm9yLCB0cnVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgX19jcmVhdGVEaXIocGF0aC5kaXJuYW1lKGRlc3QpKTtcblxuICAgICAgICB2YXIgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhzcmMsIFwidXRmOFwiKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhkZXN0LCBjb250ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGEgZmlsZSBvciBkaXJlY3RvcnkuIFRoZSBkaXJlY3RvcnkgY2FuIGhhdmUgcmVjdXJzaXZlIGNvbnRlbnRzLiBMaWtlIHJtIC1yZlxuICAgICAqIEBwYXJhbSBzcmMge1N0cmluZ30gUGF0aFxuICAgICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICB2YXIgX19yZW1vdmUgPSBmdW5jdGlvbihzcmMsIGNhbGxiYWNrKSB7XG4gICAgICAgIHNyYyA9IF9fcmVzb2x2ZVBhdGgoc3JjKTtcblxuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uKCl7fTtcblxuICAgICAgICBsb2coYFJlbW92aW5nICR7c3JjfWApO1xuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGxldCBjdXJyZW50ID0gZnMubHN0YXRTeW5jKHNyYyk7XG4gICAgICAgICAgICBpZihjdXJyZW50LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICBfX3JtRGlyKHNyYyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYoY3VycmVudC5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgICAgIF9fcm1GaWxlKHNyYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgaWYoZXJyLmNvZGUgJiYgZXJyLmNvZGUgPT09IFwiRU5PRU5UXCIpe1xuICAgICAgICAgICAgICAgIC8vaWdub3JpbmcgZXJyb3JzIGxpa2UgXCJmaWxlL2RpcmVjdG9yeSBkb2VzIG5vdCBleGlzdFwiXG4gICAgICAgICAgICAgICAgZXJyID0gbnVsbDtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGxvZyhlcnIsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhIGRpcmVjdG9yeS4gVGhlIGRpcmVjdG9yeSBjYW4gaGF2ZSByZWN1cnNpdmUgY29udGVudHMuIExpa2Ugcm0gLXJmXG4gICAgICogQHBhcmFtIGRpciB7U3RyaW5nfSBQYXRoXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICB2YXIgX19ybURpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICAgICAgZGlyID0gX19yZXNvbHZlUGF0aChkaXIpO1xuXG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgICAgICBsb2coYERpcmVjdG9yeSAke2Rpcn0gZG9lcyBub3QgZXhpc3QhYCwgdHJ1ZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGlzdCA9IGZzLnJlYWRkaXJTeW5jKGRpcik7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGZpbGVuYW1lID0gcGF0aC5qb2luKGRpciwgbGlzdFtpXSk7XG4gICAgICAgICAgICB2YXIgc3RhdCA9IGZzLmxzdGF0U3luYyhmaWxlbmFtZSk7XG5cbiAgICAgICAgICAgIGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICBfX3JtRGlyKGZpbGVuYW1lLCBudWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gcm0gZmlsZW5hbWVcbiAgICAgICAgICAgICAgICBmcy51bmxpbmtTeW5jKGZpbGVuYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZzLnJtZGlyU3luYyhkaXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBmaWxlLlxuICAgICAqIEBwYXJhbSBmaWxlIHtTdHJpbmd9IFBhdGhcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHZhciBfX3JtRmlsZSA9IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICAgICAgZmlsZSA9IF9fcmVzb2x2ZVBhdGgoZmlsZSk7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhmaWxlKSkge1xuICAgICAgICAgICAgbG9nKGBGaWxlICR7ZmlsZX0gZG9lcyBub3QgZXhpc3QhYCwgdHJ1ZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBmcy51bmxpbmtTeW5jKGZpbGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFdyaXRlcyBkYXRhIHRvIGEgZmlsZSwgcmVwbGFjaW5nIHRoZSBmaWxlIGlmIGl0IGFscmVhZHkgZXhpc3RzLlxuICAgICAqIEBwYXJhbSBmaWxlIHtTdHJpbmd9IFBhdGguXG4gICAgICogQHBhcmFtIGRhdGEge1N0cmluZ31cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHZhciBfX2NyZWF0ZUZpbGUgPSBmdW5jdGlvbihmaWxlLCBkYXRhLCBvcHRpb25zKSB7XG4gICAgICAgIGZpbGUgPSBfX3Jlc29sdmVQYXRoKGZpbGUpXG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMoZmlsZSwgZGF0YSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTW92ZXMgYSBmaWxlIG9yIGRpcmVjdG9yeS5cbiAgICAgKiBAcGFyYW0gc3JjIHtTdHJpbmd9IFNvdXJjZSBwYXRoLlxuICAgICAqIEBwYXJhbSBkZXN0IHtTdHJpbmd9IERlc3RpbmF0aW9uIHBhdGguXG4gICAgICogQHBhcmFtIG9wdGlvbnMge09iamVjdH0uIE9wdGlvbmFsIHBhcmFtZXRlcnMgZm9yIGNvcHkgYWN0aW9uLiBBdmFpbGFibGUgb3B0aW9uczpcbiAgICAgKiAgLSBvdmVyd3JpdGUgPGJvb2xlYW4+OiBvdmVyd3JpdGUgZXhpc3RpbmcgZmlsZSBvciBkaXJlY3RvcnksIGRlZmF1bHQgaXMgZmFsc2UuIE5vdGUgdGhhdCB0aGUgbW92ZSBvcGVyYXRpb24gd2lsbCBzaWxlbnRseSBmYWlsIGlmIHlvdSBzZXQgdGhpcyB0byB0cnVlIGFuZCB0aGUgZGVzdGluYXRpb24gZXhpc3RzLlxuICAgICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICB2YXIgX19tb3ZlID0gZnVuY3Rpb24oc3JjLCBkZXN0LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICBzcmMgPSBfX3Jlc29sdmVQYXRoKHNyYyk7XG4gICAgICAgIGRlc3QgPSBfX3Jlc29sdmVQYXRoKGRlc3QpO1xuXG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24oKXt9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZihvcHRpb25zICYmIG9wdGlvbnMub3ZlcndyaXRlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGRlc3QpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNpbGVudGx5IGZhaWwgaWYgb3ZlcndyaXRlIGlzIHNldCB0byBmYWxzZSBhbmQgdGhlIGRlc3RpbmF0aW9uIGV4aXN0cy5cbiAgICAgICAgICAgICAgICAgICAgbGV0IGVycm9yID0gYFNpbGVudCBmYWlsIC0gY2Fubm90IG1vdmUuIERlc3RpbmF0aW9uIGZpbGUgJHtkZXN0fSBhbHJlYWR5IGV4aXN0cyBhbmQgb3ZlcndyaXRlIG9wdGlvbiBpcyBzZXQgdG8gZmFsc2UhIENvbnRpbnVpbmcuLi5gO1xuICAgICAgICAgICAgICAgICAgICBsb2coZXJyb3IsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfX2NvcHkoc3JjLCBkZXN0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIF9fcmVtb3ZlKHNyYyk7XG4gICAgICAgIH1jYXRjaChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wdXRlcyBjaGVja3N1bSB0byBhIGZpbGUgb3IgYSBkaXJlY3RvcnkgYmFzZWQgb24gdGhlaXIgY29udGVudHMgb25seS5cbiAgICAgKiBJZiB0aGUgc291cmNlIGlzIGRpcmVjdG9yeSwgdGhlIGNoZWNrc3VtIGlzIGEgaGFzaCBvZiBhbGwgY29uY2F0ZW5hdGVkIGZpbGUgaGFzaGVzLlxuICAgICAqIEBwYXJhbSBzcmMge1N0cmluZ30gUGF0aCBvZiBhIGZpbGUgb3IgZGlyZWN0b3J5LlxuICAgICAqIEBwYXJhbSBhbGdvcml0aG0ge1N0cmluZ30gSGFzaGluZyBhbGdvcml0aG0oZGVmYXVsdDogbWQ1KS4gVGhlIGFsZ29yaXRobSBpcyBkZXBlbmRlbnQgb24gdGhlIGF2YWlsYWJsZSBhbGdvcml0aG1zXG4gICAgICogc3VwcG9ydGVkIGJ5IHRoZSB2ZXJzaW9uIG9mIE9wZW5TU0wgb24gdGhlIHBsYXRmb3JtLiBFLmcuICdtZDUnLCAnc2hhMjU2JywgJ3NoYTUxMicuXG4gICAgICogQHBhcmFtIGVuY29kaW5nIHtTdHJpbmd9IEhhc2hpbmcgZW5jb2RpbmcgKGRlZmF1bHQ6ICdoZXgnKS4gVGhlIGVuY29kaW5nIGlzIGRlcGVuZGVudCBvbiB0aGVcbiAgICAgKiBhdmFpbGFibGUgZGlnZXN0IGFsZ29yaXRobXMuIEUuZy4gJ2hleCcsICdsYXRpbjEnIG9yICdiYXNlNjQnLlxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IENoZWNrc3VtIG9mIHRoZSBmaWxlIG9yIGRpcmVjdG9yeS5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHZhciBfX2NoZWNrc3VtID0gZnVuY3Rpb24oc3JjLCBhbGdvcml0aG0sIGVuY29kaW5nKSB7XG4gICAgICAgIHNyYyA9IF9fcmVzb2x2ZVBhdGgoc3JjKTtcblxuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc3JjKSkge1xuICAgICAgICAgICAgdGhyb3cgYFBhdGggJHtzcmN9IGRvZXMgbm90IGV4aXN0cyFgO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNoZWNrc3VtID0gXCJcIjtcbiAgICAgICAgbGV0IGN1cnJlbnQgPSBmcy5sc3RhdFN5bmMoc3JjKTtcbiAgICAgICAgaWYoY3VycmVudC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICBsZXQgaGFzaERpciA9IF9faGFzaERpcihzcmMsIGFsZ29yaXRobSwgZW5jb2RpbmcpO1xuICAgICAgICAgICAgY2hlY2tzdW0gPSBoYXNoRGlyW1wiaGFzaFwiXTtcbiAgICAgICAgfSBlbHNlIGlmKGN1cnJlbnQuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgIGNoZWNrc3VtID0gX19oYXNoRmlsZShzcmMsIGFsZ29yaXRobSwgZW5jb2RpbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoZWNrc3VtO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbXB1dGVzIGhhc2ggb2YgYSBzdHJpbmcuXG4gICAgICogQHBhcmFtIHN0ciB7U3RyaW5nfVxuICAgICAqIEBwYXJhbSBhbGdvcml0aG0ge1N0cmluZ30gSGFzaGluZyBhbGdvcml0aG0oZGVmYXVsdDogbWQ1KS4gVGhlIGFsZ29yaXRobSBpcyBkZXBlbmRlbnQgb24gdGhlIGF2YWlsYWJsZSBhbGdvcml0aG1zXG4gICAgICogc3VwcG9ydGVkIGJ5IHRoZSB2ZXJzaW9uIG9mIE9wZW5TU0wgb24gdGhlIHBsYXRmb3JtLiBFLmcuICdtZDUnLCAnc2hhMjU2JywgJ3NoYTUxMicuXG4gICAgICogQHBhcmFtIGVuY29kaW5nIHtTdHJpbmd9IEhhc2hpbmcgZW5jb2RpbmcgKGRlZmF1bHQ6ICdoZXgnKS4gVGhlIGVuY29kaW5nIGlzIGRlcGVuZGVudCBvbiB0aGVcbiAgICAgKiBhdmFpbGFibGUgZGlnZXN0IGFsZ29yaXRobXMuIEUuZy4gJ2hleCcsICdsYXRpbjEnIG9yICdiYXNlNjQnLlxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IEhhc2ggb2YgdGhlIHN0cmluZy5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHZhciBfX2hhc2ggPSAgZnVuY3Rpb24oc3RyLCBhbGdvcml0aG0sIGVuY29kaW5nKSB7XG4gICAgICAgIHJldHVybiBjcnlwdG9cbiAgICAgICAgICAgIC5jcmVhdGVIYXNoKGFsZ29yaXRobSB8fCAnbWQ1JylcbiAgICAgICAgICAgIC51cGRhdGUoc3RyLCAndXRmOCcpXG4gICAgICAgICAgICAuZGlnZXN0KGVuY29kaW5nIHx8ICdoZXgnKVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbXB1dGVzIGhhc2ggb2YgYSBmaWxlIGJhc2VkIG9uIGl0cyBjb250ZW50IG9ubHkuXG4gICAgICogQHBhcmFtIHNyYyB7U3RyaW5nfSBQYXRoIG9mIGEgZmlsZS5cbiAgICAgKiBAcGFyYW0gYWxnb3JpdGhtIHtTdHJpbmd9IEhhc2hpbmcgYWxnb3JpdGhtKGRlZmF1bHQ6IG1kNSkuIFRoZSBhbGdvcml0aG0gaXMgZGVwZW5kZW50IG9uIHRoZSBhdmFpbGFibGUgYWxnb3JpdGhtc1xuICAgICAqIHN1cHBvcnRlZCBieSB0aGUgdmVyc2lvbiBvZiBPcGVuU1NMIG9uIHRoZSBwbGF0Zm9ybS4gRS5nLiAnbWQ1JywgJ3NoYTI1NicsICdzaGE1MTInLlxuICAgICAqIEBwYXJhbSBlbmNvZGluZyB7U3RyaW5nfSBIYXNoaW5nIGVuY29kaW5nIChkZWZhdWx0OiAnaGV4JykuIFRoZSBlbmNvZGluZyBpcyBkZXBlbmRlbnQgb24gdGhlXG4gICAgICogYXZhaWxhYmxlIGRpZ2VzdCBhbGdvcml0aG1zLiBFLmcuICdoZXgnLCAnbGF0aW4xJyBvciAnYmFzZTY0Jy5cbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBIYXNoIG9mIHRoZSBmaWxlLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdmFyIF9faGFzaEZpbGUgPSBmdW5jdGlvbihzcmMsIGFsZ29yaXRobSwgZW5jb2RpbmcpIHtcbiAgICAgICAgc3JjID0gX19yZXNvbHZlUGF0aChzcmMpO1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc3JjKSkge1xuICAgICAgICAgICAgdGhyb3cgYCR7c3JjfSBkb2VzIG5vdCBleGlzdCFgO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoc3JjLCBcInV0ZjhcIik7XG4gICAgICAgIHJldHVybiBfX2hhc2goY29udGVudCwgYWxnb3JpdGhtLCBlbmNvZGluZyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcHV0ZXMgaGFzaCBvZiBhIGRpcmVjdG9yeSBiYXNlZCBvbiBpdHMgY29udGVudCBvbmx5LlxuICAgICAqIElmIGRpcmVjdG9yeSBoYXMgbXVsdGlwbGUgZmlsZXMsIHRoZSByZXN1bHQgaXMgYSBoYXNoIG9mIGFsbCBjb25jYXRlbmF0ZWQgZmlsZSBoYXNoZXMuXG4gICAgICogQHBhcmFtIHNyYyB7U3RyaW5nfSBQYXRoIG9mIGEgZGlyZWN0b3J5LlxuICAgICAqIEBwYXJhbSBhbGdvcml0aG0ge1N0cmluZ30gSGFzaGluZyBhbGdvcml0aG0oZGVmYXVsdDogbWQ1KS4gVGhlIGFsZ29yaXRobSBpcyBkZXBlbmRlbnQgb24gdGhlIGF2YWlsYWJsZSBhbGdvcml0aG1zXG4gICAgICogc3VwcG9ydGVkIGJ5IHRoZSB2ZXJzaW9uIG9mIE9wZW5TU0wgb24gdGhlIHBsYXRmb3JtLiBFLmcuICdtZDUnLCAnc2hhMjU2JywgJ3NoYTUxMicuXG4gICAgICogQHBhcmFtIGVuY29kaW5nIHtTdHJpbmd9IEhhc2hpbmcgZW5jb2RpbmcgKGRlZmF1bHQ6ICdoZXgnKS4gVGhlIGVuY29kaW5nIGlzIGRlcGVuZGVudCBvbiB0aGVcbiAgICAgKiBhdmFpbGFibGUgZGlnZXN0IGFsZ29yaXRobXMuIEUuZy4gJ2hleCcsICdsYXRpbjEnIG9yICdiYXNlNjQnLlxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IEhhc2ggb2YgdGhlIGRpcmVjdG9yeS5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHZhciBfX2hhc2hEaXIgPSBmdW5jdGlvbihkaXIsIGFsZ29yaXRobSwgZW5jb2RpbmcpIHtcbiAgICAgICAgZGlyID0gX19yZXNvbHZlUGF0aChkaXIpO1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgICAgICAgdGhyb3cgYERpcmVjdG9yeSAke2Rpcn0gZG9lcyBub3QgZXhpc3QhYDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaGFzaGVzID0ge307XG4gICAgICAgIHZhciBsaXN0ID0gZnMucmVhZGRpclN5bmMoZGlyKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZmlsZW5hbWUgPSBwYXRoLmpvaW4oZGlyLCBsaXN0W2ldKTtcbiAgICAgICAgICAgIHZhciBzdGF0ID0gZnMubHN0YXRTeW5jKGZpbGVuYW1lKTtcblxuICAgICAgICAgICAgaWYgKHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgIGxldCB0ZW1wSGFzaGVzID0gX19oYXNoRGlyKGZpbGVuYW1lLCBhbGdvcml0aG0sIGVuY29kaW5nKTtcbiAgICAgICAgICAgICAgICBoYXNoZXMgPSBPYmplY3QuYXNzaWduKGhhc2hlcywgdGVtcEhhc2hlc1tcInN1Yi1oYXNoZXNcIl0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgdGVtcEhhc2ggPSBfX2hhc2hGaWxlKGZpbGVuYW1lLCBhbGdvcml0aG0sIGVuY29kaW5nKTtcbiAgICAgICAgICAgICAgICBoYXNoZXNbZmlsZW5hbWVdID0gdGVtcEhhc2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjb21wdXRlIGRpciBoYXNoXG4gICAgICAgIGxldCBkaXJDb250ZW50ID0gT2JqZWN0LmtleXMoaGFzaGVzKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXZpb3VzLCBrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2aW91cyArPSBoYXNoZXNba2V5XTtcbiAgICAgICAgfSwgXCJcIik7XG5cbiAgICAgICAgbGV0IGRpckhhc2ggPSBfX2hhc2goZGlyQ29udGVudCwgYWxnb3JpdGhtLCBlbmNvZGluZyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFwiaGFzaFwiOiBkaXJIYXNoLFxuICAgICAgICAgICAgXCJzdWItaGFzaGVzXCI6IGhhc2hlc1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGEgZ3VpZCAoZ2xvYmFsIHVuaXF1ZSBpZGVudGlmaWVyKS5cbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBHdWlkIGluIHRoZSBmb3JtYXQgeHh4eHh4eHgteHh4eC14eHh4LXh4eHgteHh4eHh4eHh4eHh4XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICB2YXIgX19ndWlkID0gZnVuY3Rpb24gZ3VpZCgpIHtcbiAgICAgICAgZnVuY3Rpb24gX21ha2VfZ3JvdXAocykge1xuICAgICAgICAgICAgdmFyIHAgPSAoTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikrXCIwMDAwMDAwMDBcIikuc3Vic3RyKDIsOCk7XG4gICAgICAgICAgICByZXR1cm4gcyA/IFwiLVwiICsgcC5zdWJzdHIoMCw0KSArIFwiLVwiICsgcC5zdWJzdHIoNCw0KSA6IHAgO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBfbWFrZV9ncm91cCgpICsgX21ha2VfZ3JvdXAodHJ1ZSkgKyBfbWFrZV9ncm91cCh0cnVlKSArIF9tYWtlX2dyb3VwKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9ncyB3cmFwcGVyLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIHtTdHJpbmd9XG4gICAgICogQHBhcmFtIGlzRXJyb3Ige0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9nKG1lc3NhZ2UsIGlzRXJyb3IpIHtcbiAgICAgICAgbGV0IGxvZ2dlciA9IGlzRXJyb3IgPyBjb25zb2xlLmVycm9yIDogY29uc29sZS5sb2c7XG5cbiAgICAgICAgaWYoREVCVUcpIHtcbiAgICAgICAgICAgIGxvZ2dlcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHNldEJhc2VQYXRoOiBfX3NldEJhc2VQYXRoLFxuICAgICAgICByZXNvbHZlUGF0aDogX19yZXNvbHZlUGF0aCxcbiAgICAgICAgY3JlYXRlRGlyOiBfX2NyZWF0ZURpcixcbiAgICAgICAgY29weURpcjogX19jb3B5RGlyLFxuICAgICAgICBybURpcjogX19ybURpcixcbiAgICAgICAgcm1GaWxlOiBfX3JtRmlsZSxcbiAgICAgICAgY3JlYXRlRmlsZTogX19jcmVhdGVGaWxlLFxuICAgICAgICBjb3B5OiBfX2NvcHksXG4gICAgICAgIG1vdmU6IF9fbW92ZSxcbiAgICAgICAgcmVtb3ZlOiBfX3JlbW92ZSxcbiAgICAgICAgY2hlY2tzdW06IF9fY2hlY2tzdW0sXG4gICAgICAgIGd1aWQ6IF9fZ3VpZFxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMuZnNFeHQgPSBuZXcgRlNFeHRlbnRpb24oKTsiLCIkJC5DT05TVEFOVFMgPSB7XG4gICAgU1dBUk1fRk9SX0VYRUNVVElPTjpcInN3YXJtX2Zvcl9leGVjdXRpb25cIixcbiAgICBJTkJPVU5EOlwiaW5ib3VuZFwiLFxuICAgIE9VVEJPVU5EOlwib3V0Ym91bmRcIixcbiAgICBQRFM6XCJQcml2YXRlRGF0YVN5c3RlbVwiLFxuICAgIENSTDpcIkNvbW11bmljYXRpb25SZXBsaWNhdGlvbkxheWVyXCIsXG4gICAgU1dBUk1fUkVUVVJOOiAnc3dhcm1fcmV0dXJuJyxcbiAgICBCRUZPUkVfSU5URVJDRVBUT1I6ICdiZWZvcmUnLFxuICAgIEFGVEVSX0lOVEVSQ0VQVE9SOiAnYWZ0ZXInLFxufTtcblxuIiwiLy8gcmVsYXRlZCB0bzogU3dhcm1TcGFjZS5Td2FybURlc2NyaXB0aW9uLmNyZWF0ZVBoYXNlKClcblxuZnVuY3Rpb24gSW50ZXJjZXB0b3JSZWdpc3RyeSgpIHtcbiAgICBjb25zdCBydWxlcyA9IG5ldyBNYXAoKTtcblxuICAgIC8vID8/PyAkJC5lcnJvckhhbmRsZXIgTGlicmFyeSA/Pz9cbiAgICBjb25zdCBfQ0xBU1NfTkFNRSA9ICdJbnRlcmNlcHRvclJlZ2lzdHJ5JztcblxuICAgIC8qKioqKioqKioqKioqIFBSSVZBVEUgTUVUSE9EUyAqKioqKioqKioqKioqL1xuXG4gICAgZnVuY3Rpb24gX3Rocm93RXJyb3IoZXJyLCBtc2cpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIubWVzc2FnZSwgYCR7X0NMQVNTX05BTUV9IGVycm9yIG1lc3NhZ2U6YCwgbXNnKTtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF93YXJuaW5nKG1zZykge1xuICAgICAgICBjb25zb2xlLndhcm4oYCR7X0NMQVNTX05BTUV9IHdhcm5pbmcgbWVzc2FnZTpgLCBtc2cpO1xuICAgIH1cblxuICAgIGNvbnN0IGdldFdoZW5PcHRpb25zID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IFdIRU5fT1BUSU9OUztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChXSEVOX09QVElPTlMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIFdIRU5fT1BUSU9OUyA9IE9iamVjdC5mcmVlemUoW1xuICAgICAgICAgICAgICAgICAgICAkJC5DT05TVEFOVFMuQkVGT1JFX0lOVEVSQ0VQVE9SLFxuICAgICAgICAgICAgICAgICAgICAkJC5DT05TVEFOVFMuQUZURVJfSU5URVJDRVBUT1JcbiAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBXSEVOX09QVElPTlM7XG4gICAgICAgIH07XG4gICAgfSkoKTtcblxuICAgIGZ1bmN0aW9uIHZlcmlmeVdoZW5PcHRpb24od2hlbikge1xuICAgICAgICBpZiAoIWdldFdoZW5PcHRpb25zKCkuaW5jbHVkZXMod2hlbikpIHtcbiAgICAgICAgICAgIF90aHJvd0Vycm9yKG5ldyBSYW5nZUVycm9yKGBPcHRpb24gJyR7d2hlbn0nIGlzIHdyb25nIWApLFxuICAgICAgICAgICAgICAgIGBpdCBzaG91bGQgYmUgb25lIG9mOiAke2dldFdoZW5PcHRpb25zKCl9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2ZXJpZnlJc0Z1bmN0aW9uVHlwZShmbikge1xuICAgICAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBfdGhyb3dFcnJvcihuZXcgVHlwZUVycm9yKGBQYXJhbWV0ZXIgJyR7Zm59JyBpcyB3cm9uZyFgKSxcbiAgICAgICAgICAgICAgICBgaXQgc2hvdWxkIGJlIGEgZnVuY3Rpb24sIG5vdCAke3R5cGVvZiBmbn0hYCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNvbHZlTmFtZXNwYWNlUmVzb2x1dGlvbihzd2FybVR5cGVOYW1lKSB7XG4gICAgICAgIGlmIChzd2FybVR5cGVOYW1lID09PSAnKicpIHtcbiAgICAgICAgICAgIHJldHVybiBzd2FybVR5cGVOYW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIChzd2FybVR5cGVOYW1lLmluY2x1ZGVzKFwiLlwiKSA/IHN3YXJtVHlwZU5hbWUgOiAoJCQubGlicmFyeVByZWZpeCArIFwiLlwiICsgc3dhcm1UeXBlTmFtZSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyYW5zZm9ybXMgYW4gYXJyYXkgaW50byBhIGdlbmVyYXRvciB3aXRoIHRoZSBwYXJ0aWN1bGFyaXR5IHRoYXQgZG9uZSBpcyBzZXQgdG8gdHJ1ZSBvbiB0aGUgbGFzdCBlbGVtZW50LFxuICAgICAqIG5vdCBhZnRlciBpdCBmaW5pc2hlZCBpdGVyYXRpbmcsIHRoaXMgaXMgaGVscGZ1bCBpbiBvcHRpbWl6aW5nIHNvbWUgb3RoZXIgZnVuY3Rpb25zXG4gICAgICogSXQgaXMgdXNlZnVsIGlmIHlvdSB3YW50IGNhbGwgYSByZWN1cnNpdmUgZnVuY3Rpb24gb3ZlciB0aGUgYXJyYXkgZWxlbWVudHMgYnV0IHdpdGhvdXQgcG9wcGluZyB0aGUgZmlyc3RcbiAgICAgKiBlbGVtZW50IG9mIHRoZSBBcnJheSBvciBzZW5kaW5nIHRoZSBpbmRleCBhcyBhbiBleHRyYSBwYXJhbWV0ZXJcbiAgICAgKiBAcGFyYW0ge0FycmF5PCo+fSBhcnJcbiAgICAgKiBAcmV0dXJuIHtJdGVyYWJsZUl0ZXJhdG9yPCo+fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uKiBjcmVhdGVBcnJheUdlbmVyYXRvcihhcnIpIHtcbiAgICAgICAgY29uc3QgbGVuID0gYXJyLmxlbmd0aDtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbiAtIDE7ICsraSkge1xuICAgICAgICAgICAgeWllbGQgYXJyW2ldO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGFycltsZW4gLSAxXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgYSB0cmVlIGxpa2Ugc3RydWN0dXJlIG92ZXIgdGltZSAoaWYgY2FsbGVkIG9uIHRoZSBzYW1lIHJvb3Qgbm9kZSkgd2hlcmUgaW50ZXJuYWwgbm9kZXMgYXJlIGluc3RhbmNlcyBvZlxuICAgICAqIE1hcCBjb250YWluaW5nIHRoZSBuYW1lIG9mIHRoZSBjaGlsZHJlbiBub2RlcyAoZWFjaCBjaGlsZCBuYW1lIGlzIHRoZSByZXN1bHQgb2YgY2FsbGluZyBuZXh0IG9uIGBrZXlzR2VuZXJhdG9yKVxuICAgICAqIGFuZCBhIHJlZmVyZW5jZSB0byB0aGVtIGFuZCBvbiBsZWFmcyBpdCBjb250YWlucyBhbiBpbnN0YW5jZSBvZiBTZXQgd2hlcmUgaXQgYWRkcyB0aGUgZnVuY3Rpb24gZ2l2ZW4gYXMgcGFyYW1ldGVyXG4gICAgICogKGV4OiBmb3IgYSBrZXlHZW5lcmF0b3IgdGhhdCByZXR1cm5zIGluIHRoaXMgb3JkZXIgKFwia2V5MVwiLCBcImtleTJcIikgdGhlIHJlc3VsdGluZyBzdHJ1Y3R1cmUgd2lsbCBiZTpcbiAgICAgKiB7XCJrZXkxXCI6IHtcImtleTFcIjogU2V0KFtmbl0pfX0gLSB1c2luZyBKU09OIGp1c3QgZm9yIGlsbHVzdHJhdGlvbiBwdXJwb3NlcyBiZWNhdXNlIGl0J3MgZWFzaWVyIHRvIHJlcHJlc2VudClcbiAgICAgKiBAcGFyYW0ge01hcH0gcnVsZXNNYXBcbiAgICAgKiBAcGFyYW0ge0l0ZXJhYmxlSXRlcmF0b3J9IGtleXNHZW5lcmF0b3IgLSBpdCBoYXMgdGhlIHBhcnRpY3VsYXJpdHkgdGhhdCBkb25lIGlzIHNldCBvbiBsYXN0IGVsZW1lbnQsIG5vdCBhZnRlciBpdFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZuXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVnaXN0ZXJSZWN1cnNpdmVSdWxlKHJ1bGVzTWFwLCBrZXlzR2VuZXJhdG9yLCBmbikge1xuICAgICAgICBjb25zdCB7dmFsdWUsIGRvbmV9ID0ga2V5c0dlbmVyYXRvci5uZXh0KCk7XG5cbiAgICAgICAgaWYgKCFkb25lKSB7IC8vIGludGVybmFsIG5vZGVcbiAgICAgICAgICAgIGNvbnN0IG5leHRLZXkgPSBydWxlc01hcC5nZXQodmFsdWUpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG5leHRLZXkgPT09ICd1bmRlZmluZWQnKSB7IC8vIGlmIHZhbHVlIG5vdCBmb3VuZCBpbiBydWxlc01hcFxuICAgICAgICAgICAgICAgIHJ1bGVzTWFwLnNldCh2YWx1ZSwgbmV3IE1hcCgpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVnaXN0ZXJSZWN1cnNpdmVSdWxlKHJ1bGVzTWFwLmdldCh2YWx1ZSksIGtleXNHZW5lcmF0b3IsIGZuKTtcbiAgICAgICAgfSBlbHNlIHsgLy8gcmVhY2hlZCBsZWFmIG5vZGVcbiAgICAgICAgICAgIGlmICghcnVsZXNNYXAuaGFzKHZhbHVlKSkge1xuXG4gICAgICAgICAgICAgICAgcnVsZXNNYXAuc2V0KHZhbHVlLCBuZXcgU2V0KFtmbl0pKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2V0ID0gcnVsZXNNYXAuZ2V0KHZhbHVlKTtcblxuICAgICAgICAgICAgICAgIGlmIChzZXQuaGFzKGZuKSkge1xuICAgICAgICAgICAgICAgICAgICBfd2FybmluZyhgRHVwbGljYXRlZCBpbnRlcmNlcHRvciBmb3IgJyR7a2V5fSdgKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzZXQuYWRkKGZuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGNvcnJlc3BvbmRpbmcgc2V0IG9mIGZ1bmN0aW9ucyBmb3IgdGhlIGdpdmVuIGtleSBpZiBmb3VuZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgLSBmb3JtYXR0ZWQgYXMgYSBwYXRoIHdpdGhvdXQgdGhlIGZpcnN0ICcvJyAoZXg6IHN3YXJtVHlwZS9zd2FybVBoYXNlL2JlZm9yZSlcbiAgICAgKiBAcmV0dXJuIHtBcnJheTxTZXQ8ZnVuY3Rpb24+Pn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRJbnRlcmNlcHRvcnNGb3JLZXkoa2V5KSB7XG4gICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICAgICAgICBfd2FybmluZyhgSW50ZXJjZXB0b3IgY2FsbGVkIG9uIGtleSAke2tleX0gc3RhcnRpbmcgd2l0aCAnLycsIGF1dG9tYXRpY2FsbHkgcmVtb3ZpbmcgaXRgKTtcbiAgICAgICAgICAgIGtleSA9IGtleS5zdWJzdHJpbmcoMSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBrZXlFbGVtZW50cyA9IGtleS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBrZXlzR2VuZXJhdG9yID0gY3JlYXRlQXJyYXlHZW5lcmF0b3Ioa2V5RWxlbWVudHMpO1xuXG4gICAgICAgIHJldHVybiBnZXRWYWx1ZVJlY3Vyc2l2ZWx5KFtydWxlc10sIGtleXNHZW5lcmF0b3IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEl0IHdvcmtzIGxpa2UgYSBCRlMgc2VhcmNoIHJldHVybmluZyB0aGUgbGVhZnMgcmVzdWx0aW5nIGZyb20gdHJhdmVyc2luZyB0aGUgaW50ZXJuYWwgbm9kZXMgd2l0aCBjb3JyZXNwb25kaW5nXG4gICAgICogbmFtZXMgZ2l2ZW4gZm9yIGVhY2ggbGV2ZWwgKGRlcHRoKSBieSBga2V5c0dlbmVyYXRvcmBcbiAgICAgKiBAcGFyYW0ge0FycmF5PE1hcD59IHNlYXJjaGFibGVOb2Rlc1xuICAgICAqIEBwYXJhbSB7SXRlcmFibGVJdGVyYXRvcn0ga2V5c0dlbmVyYXRvciAtIGl0IGhhcyB0aGUgcGFydGljdWxhcml0eSB0aGF0IGRvbmUgaXMgc2V0IG9uIGxhc3QgZWxlbWVudCwgbm90IGFmdGVyIGl0XG4gICAgICogQHJldHVybiB7QXJyYXk8U2V0PGZ1bmN0aW9uPj59XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0VmFsdWVSZWN1cnNpdmVseShzZWFyY2hhYmxlTm9kZXMsIGtleXNHZW5lcmF0b3IpIHtcbiAgICAgICAgY29uc3Qge3ZhbHVlOiBub2RlTmFtZSwgZG9uZX0gPSBrZXlzR2VuZXJhdG9yLm5leHQoKTtcblxuICAgICAgICBjb25zdCBuZXh0Tm9kZXMgPSBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IG5vZGVJblJ1bGVzIG9mIHNlYXJjaGFibGVOb2Rlcykge1xuICAgICAgICAgICAgY29uc3QgbmV4dE5vZGVGb3JBbGwgPSBub2RlSW5SdWxlcy5nZXQoJyonKTtcbiAgICAgICAgICAgIGNvbnN0IG5leHROb2RlID0gbm9kZUluUnVsZXMuZ2V0KG5vZGVOYW1lKTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBuZXh0Tm9kZSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIG5leHROb2Rlcy5wdXNoKG5leHROb2RlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBuZXh0Tm9kZUZvckFsbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIG5leHROb2Rlcy5wdXNoKG5leHROb2RlRm9yQWxsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXh0Tm9kZXM7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZ2V0VmFsdWVSZWN1cnNpdmVseShuZXh0Tm9kZXMsIGtleXNHZW5lcmF0b3IpO1xuICAgIH1cblxuXG4gICAgLyoqKioqKioqKioqKiogUFVCTElDIE1FVEhPRFMgKioqKioqKioqKioqKi9cblxuICAgIHRoaXMucmVnaXN0ZXIgPSBmdW5jdGlvbiAoc3dhcm1UeXBlTmFtZSwgcGhhc2VOYW1lLCB3aGVuLCBmbikge1xuICAgICAgICB2ZXJpZnlXaGVuT3B0aW9uKHdoZW4pO1xuICAgICAgICB2ZXJpZnlJc0Z1bmN0aW9uVHlwZShmbik7XG5cbiAgICAgICAgY29uc3QgcmVzb2x2ZWRTd2FybVR5cGVOYW1lID0gcmVzb2x2ZU5hbWVzcGFjZVJlc29sdXRpb24oc3dhcm1UeXBlTmFtZSk7XG4gICAgICAgIGNvbnN0IGtleXMgPSBjcmVhdGVBcnJheUdlbmVyYXRvcihbcmVzb2x2ZWRTd2FybVR5cGVOYW1lLCBwaGFzZU5hbWUsIHdoZW5dKTtcblxuICAgICAgICByZWdpc3RlclJlY3Vyc2l2ZVJ1bGUocnVsZXMsIGtleXMsIGZuKTtcbiAgICB9O1xuXG4gICAgLy8gdGhpcy51bnJlZ2lzdGVyID0gZnVuY3Rpb24gKCkgeyB9XG5cbiAgICB0aGlzLmNhbGxJbnRlcmNlcHRvcnMgPSBmdW5jdGlvbiAoa2V5LCB0YXJnZXRPYmplY3QsIGFyZ3MpIHtcbiAgICAgICAgY29uc3QgaW50ZXJjZXB0b3JzID0gZ2V0SW50ZXJjZXB0b3JzRm9yS2V5KGtleSk7XG5cbiAgICAgICAgaWYgKGludGVyY2VwdG9ycykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpbnRlcmNlcHRvclNldCBvZiBpbnRlcmNlcHRvcnMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGZuIG9mIGludGVyY2VwdG9yU2V0KSB7IC8vIGludGVyY2VwdG9ycyBvbiBrZXkgJyonIGFyZSBjYWxsZWQgYmVmb3JlIHRob3NlIHNwZWNpZmllZCBieSBuYW1lXG4gICAgICAgICAgICAgICAgICAgIGZuLmFwcGx5KHRhcmdldE9iamVjdCwgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbn1cblxuXG5leHBvcnRzLmNyZWF0ZUludGVyY2VwdG9yUmVnaXN0cnkgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBJbnRlcmNlcHRvclJlZ2lzdHJ5KCk7XG59O1xuIiwiLypcbiBJbml0aWFsIExpY2Vuc2U6IChjKSBBeGlvbG9naWMgUmVzZWFyY2ggJiBBbGJvYWllIFPDrm5pY8SDLlxuIENvbnRyaWJ1dG9yczogQXhpb2xvZ2ljIFJlc2VhcmNoICwgUHJpdmF0ZVNreSBwcm9qZWN0XG4gQ29kZSBMaWNlbnNlOiBMR1BMIG9yIE1JVC5cbiAqL1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoXCJ1dGlsXCIpO1xudmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xuY3ByaW50ID0gY29uc29sZS5sb2c7XG53cHJpbnQgPSBjb25zb2xlLndhcm47XG5kcHJpbnQgPSBjb25zb2xlLmRlYnVnO1xuZXByaW50ID0gY29uc29sZS5lcnJvcjtcblxuXG4vKipcbiAqIFNob3J0Y3V0IHRvIEpTT04uc3RyaW5naWZ5XG4gKiBAcGFyYW0gb2JqXG4gKi9cbkogPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG9iaik7XG59XG5cblxuLyoqXG4gKiBQcmludCBzd2FybSBjb250ZXh0cyAoTWVzc2FnZXMpIGFuZCBlYXNpZXIgdG8gcmVhZCBjb21wYXJlZCB3aXRoIEpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqL1xuZXhwb3J0cy5jbGVhbkR1bXAgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIG8gPSBvYmoudmFsdWVPZigpO1xuICAgIHZhciBtZXRhID0ge1xuICAgICAgICBzd2FybVR5cGVOYW1lOm8ubWV0YS5zd2FybVR5cGVOYW1lXG4gICAgfTtcbiAgICByZXR1cm4gXCJcXHQgc3dhcm1JZDogXCIgKyBvLm1ldGEuc3dhcm1JZCArIFwie1xcblxcdFxcdG1ldGE6IFwiICAgICsgSihtZXRhKSArXG4gICAgICAgIFwiXFxuXFx0XFx0cHVibGljOiBcIiAgICAgICAgKyBKKG8ucHVibGljVmFycykgK1xuICAgICAgICBcIlxcblxcdFxcdHByb3RlY3RlZDogXCIgICAgICsgSihvLnByb3RlY3RlZFZhcnMpICtcbiAgICAgICAgXCJcXG5cXHRcXHRwcml2YXRlOiBcIiAgICAgICArIEooby5wcml2YXRlVmFycykgKyBcIlxcblxcdH1cXG5cIjtcbn1cblxuLy9NID0gZXhwb3J0cy5jbGVhbkR1bXA7XG4vKipcbiAqIEV4cGVyaW1lbnRhbCBmdW5jdGlvbnNcbiAqL1xuXG5cbi8qXG5cbiBsb2dnZXIgICAgICA9IG1vbml0b3IubG9nZ2VyO1xuIGFzc2VydCAgICAgID0gbW9uaXRvci5hc3NlcnQ7XG4gdGhyb3dpbmcgICAgPSBtb25pdG9yLmV4Y2VwdGlvbnM7XG5cblxuIHZhciB0ZW1wb3JhcnlMb2dCdWZmZXIgPSBbXTtcblxuIHZhciBjdXJyZW50U3dhcm1Db21JbXBsID0gbnVsbDtcblxuIGxvZ2dlci5yZWNvcmQgPSBmdW5jdGlvbihyZWNvcmQpe1xuIGlmKGN1cnJlbnRTd2FybUNvbUltcGw9PT1udWxsKXtcbiB0ZW1wb3JhcnlMb2dCdWZmZXIucHVzaChyZWNvcmQpO1xuIH0gZWxzZSB7XG4gY3VycmVudFN3YXJtQ29tSW1wbC5yZWNvcmRMb2cocmVjb3JkKTtcbiB9XG4gfVxuXG4gdmFyIGNvbnRhaW5lciA9IHJlcXVpcmUoXCJkaWNvbnRhaW5lclwiKS5jb250YWluZXI7XG5cbiBjb250YWluZXIuc2VydmljZShcInN3YXJtTG9nZ2luZ01vbml0b3JcIiwgW1wic3dhcm1pbmdJc1dvcmtpbmdcIiwgXCJzd2FybUNvbUltcGxcIl0sIGZ1bmN0aW9uKG91dE9mU2VydmljZSxzd2FybWluZywgc3dhcm1Db21JbXBsKXtcblxuIGlmKG91dE9mU2VydmljZSl7XG4gaWYoIXRlbXBvcmFyeUxvZ0J1ZmZlcil7XG4gdGVtcG9yYXJ5TG9nQnVmZmVyID0gW107XG4gfVxuIH0gZWxzZSB7XG4gdmFyIHRtcCA9IHRlbXBvcmFyeUxvZ0J1ZmZlcjtcbiB0ZW1wb3JhcnlMb2dCdWZmZXIgPSBbXTtcbiBjdXJyZW50U3dhcm1Db21JbXBsID0gc3dhcm1Db21JbXBsO1xuIGxvZ2dlci5yZWNvcmQgPSBmdW5jdGlvbihyZWNvcmQpe1xuIGN1cnJlbnRTd2FybUNvbUltcGwucmVjb3JkTG9nKHJlY29yZCk7XG4gfVxuXG4gdG1wLmZvckVhY2goZnVuY3Rpb24ocmVjb3JkKXtcbiBsb2dnZXIucmVjb3JkKHJlY29yZCk7XG4gfSk7XG4gfVxuIH0pXG5cbiAqL1xudW5jYXVnaHRFeGNlcHRpb25TdHJpbmcgPSBcIlwiO1xudW5jYXVnaHRFeGNlcHRpb25FeGlzdHMgPSBmYWxzZTtcbmlmKHR5cGVvZiBnbG9iYWxWZXJib3NpdHkgPT0gJ3VuZGVmaW5lZCcpe1xuICAgIGdsb2JhbFZlcmJvc2l0eSA9IGZhbHNlO1xufVxuXG52YXIgREVCVUdfU1RBUlRfVElNRSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG5mdW5jdGlvbiBnZXREZWJ1Z0RlbHRhKCl7XG4gICAgdmFyIGN1cnJlbnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgcmV0dXJuIGN1cnJlbnRUaW1lIC0gREVCVUdfU1RBUlRfVElNRTtcbn1cblxuLyoqXG4gKiBEZWJ1ZyBmdW5jdGlvbnMsIGluZmx1ZW5jZWQgYnkgZ2xvYmFsVmVyYm9zaXR5IGdsb2JhbCB2YXJpYWJsZVxuICogQHBhcmFtIHR4dFxuICovXG5kcHJpbnQgPSBmdW5jdGlvbiAodHh0KSB7XG4gICAgaWYgKGdsb2JhbFZlcmJvc2l0eSA9PSB0cnVlKSB7XG4gICAgICAgIGlmICh0aGlzQWRhcHRlci5pbml0aWxpc2VkICkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJERUJVRzogW1wiICsgdGhpc0FkYXB0ZXIubm9kZU5hbWUgKyBcIl0oXCIgKyBnZXREZWJ1Z0RlbHRhKCkrIFwiKTpcIit0eHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJERUJVRzogKFwiICsgZ2V0RGVidWdEZWx0YSgpKyBcIik6XCIrdHh0KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiREVCVUc6IFwiICsgdHh0KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiBvYnNvbGV0ZSE/XG4gKiBAcGFyYW0gdHh0XG4gKi9cbmFwcmludCA9IGZ1bmN0aW9uICh0eHQpIHtcbiAgICBjb25zb2xlLmxvZyhcIkRFQlVHOiBbXCIgKyB0aGlzQWRhcHRlci5ub2RlTmFtZSArIFwiXTogXCIgKyB0eHQpO1xufVxuXG5cblxuLyoqXG4gKiBVdGlsaXR5IGZ1bmN0aW9uIHVzdWFsbHkgdXNlZCBpbiB0ZXN0cywgZXhpdCBjdXJyZW50IHByb2Nlc3MgYWZ0ZXIgYSB3aGlsZVxuICogQHBhcmFtIG1zZ1xuICogQHBhcmFtIHRpbWVvdXRcbiAqL1xuZGVsYXlFeGl0ID0gZnVuY3Rpb24gKG1zZywgcmV0Q29kZSx0aW1lb3V0KSB7XG4gICAgaWYocmV0Q29kZSA9PSB1bmRlZmluZWQpe1xuICAgICAgICByZXRDb2RlID0gRXhpdENvZGVzLlVua25vd25FcnJvcjtcbiAgICB9XG5cbiAgICBpZih0aW1lb3V0ID09IHVuZGVmaW5lZCl7XG4gICAgICAgIHRpbWVvdXQgPSAxMDA7XG4gICAgfVxuXG4gICAgaWYobXNnID09IHVuZGVmaW5lZCl7XG4gICAgICAgIG1zZyA9IFwiRGVsYXlpbmcgZXhpdCB3aXRoIFwiKyB0aW1lb3V0ICsgXCJtc1wiO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKG1zZyk7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHByb2Nlc3MuZXhpdChyZXRDb2RlKTtcbiAgICB9LCB0aW1lb3V0KTtcbn1cblxuXG5mdW5jdGlvbiBsb2NhbExvZyAobG9nVHlwZSwgbWVzc2FnZSwgZXJyKSB7XG4gICAgdmFyIHRpbWUgPSBuZXcgRGF0ZSgpO1xuICAgIHZhciBub3cgPSB0aW1lLmdldERhdGUoKSArIFwiLVwiICsgKHRpbWUuZ2V0TW9udGgoKSArIDEpICsgXCIsXCIgKyB0aW1lLmdldEhvdXJzKCkgKyBcIjpcIiArIHRpbWUuZ2V0TWludXRlcygpO1xuICAgIHZhciBtc2c7XG5cbiAgICBtc2cgPSAnWycgKyBub3cgKyAnXVsnICsgdGhpc0FkYXB0ZXIubm9kZU5hbWUgKyAnXSAnICsgbWVzc2FnZTtcblxuICAgIGlmIChlcnIgIT0gbnVsbCAmJiBlcnIgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG1zZyArPSAnXFxuICAgICBFcnI6ICcgKyBlcnIudG9TdHJpbmcoKTtcbiAgICAgICAgaWYgKGVyci5zdGFjayAmJiBlcnIuc3RhY2sgIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgbXNnICs9ICdcXG4gICAgIFN0YWNrOiAnICsgZXJyLnN0YWNrICsgJ1xcbic7XG4gICAgfVxuXG4gICAgY3ByaW50KG1zZyk7XG4gICAgaWYodGhpc0FkYXB0ZXIuaW5pdGlsaXNlZCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGZzLmFwcGVuZEZpbGVTeW5jKGdldFN3YXJtRmlsZVBhdGgodGhpc0FkYXB0ZXIuY29uZmlnLmxvZ3NQYXRoICsgXCIvXCIgKyBsb2dUeXBlKSwgbXNnKTtcbiAgICAgICAgfSBjYXRjaChlcnIpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJGYWlsaW5nIHRvIHdyaXRlIGxvZ3MgaW4gXCIsIHRoaXNBZGFwdGVyLmNvbmZpZy5sb2dzUGF0aCApO1xuICAgICAgICB9XG5cbiAgICB9XG59XG5cblxuLy8gcHJpbnRmID0gZnVuY3Rpb24gKC4uLnBhcmFtcykge1xuLy8gICAgIHZhciBhcmdzID0gW107IC8vIGVtcHR5IGFycmF5XG4vLyAgICAgLy8gY29weSBhbGwgb3RoZXIgYXJndW1lbnRzIHdlIHdhbnQgdG8gXCJwYXNzIHRocm91Z2hcIlxuLy8gICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4vLyAgICAgICAgIGFyZ3MucHVzaChwYXJhbXNbaV0pO1xuLy8gICAgIH1cbi8vICAgICB2YXIgb3V0ID0gdXRpbC5mb3JtYXQuYXBwbHkodGhpcywgYXJncyk7XG4vLyAgICAgY29uc29sZS5sb2cob3V0KTtcbi8vIH1cbi8vXG4vLyBzcHJpbnRmID0gZnVuY3Rpb24gKC4uLnBhcmFtcykge1xuLy8gICAgIHZhciBhcmdzID0gW107IC8vIGVtcHR5IGFycmF5XG4vLyAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJhbXMubGVuZ3RoOyBpKyspIHtcbi8vICAgICAgICAgYXJncy5wdXNoKHBhcmFtc1tpXSk7XG4vLyAgICAgfVxuLy8gICAgIHJldHVybiB1dGlsLmZvcm1hdC5hcHBseSh0aGlzLCBhcmdzKTtcbi8vIH1cblxuIiwiXG5cbmZ1bmN0aW9uIFN3YXJtc0luc3RhbmNlc01hbmFnZXIoKXtcbiAgICB2YXIgc3dhcm1BbGl2ZUluc3RhbmNlcyA9IHtcblxuICAgIH1cblxuICAgIHRoaXMud2FpdEZvclN3YXJtID0gZnVuY3Rpb24oY2FsbGJhY2ssIHN3YXJtLCBrZWVwQWxpdmVDaGVjayl7XG5cbiAgICAgICAgZnVuY3Rpb24gZG9Mb2dpYygpe1xuICAgICAgICAgICAgdmFyIHN3YXJtSWQgPSBzd2FybS5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkO1xuICAgICAgICAgICAgdmFyIHdhdGNoZXIgPSBzd2FybUFsaXZlSW5zdGFuY2VzW3N3YXJtSWRdO1xuICAgICAgICAgICAgaWYoIXdhdGNoZXIpe1xuICAgICAgICAgICAgICAgIHdhdGNoZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtOnN3YXJtLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazpjYWxsYmFjayxcbiAgICAgICAgICAgICAgICAgICAga2VlcEFsaXZlQ2hlY2s6a2VlcEFsaXZlQ2hlY2tcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3dhcm1BbGl2ZUluc3RhbmNlc1tzd2FybUlkXSA9IHdhdGNoZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmaWx0ZXIoKXtcbiAgICAgICAgICAgIHJldHVybiBzd2FybS5nZXRJbm5lclZhbHVlKCkubWV0YS5zd2FybUlkO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8kJC51aWRHZW5lcmF0b3Iud2FpdF9mb3JfY29uZGl0aW9uKGNvbmRpdGlvbixkb0xvZ2ljKTtcbiAgICAgICAgc3dhcm0ub2JzZXJ2ZShkb0xvZ2ljLCBudWxsLCBmaWx0ZXIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFuU3dhcm1XYWl0ZXIoc3dhcm1TZXJpYWxpc2F0aW9uKXsgLy8gVE9ETzogYWRkIGJldHRlciBtZWNoYW5pc21zIHRvIHByZXZlbnQgbWVtb3J5IGxlYWtzXG4gICAgICAgIHZhciBzd2FybUlkID0gc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuc3dhcm1JZDtcbiAgICAgICAgdmFyIHdhdGNoZXIgPSBzd2FybUFsaXZlSW5zdGFuY2VzW3N3YXJtSWRdO1xuXG4gICAgICAgIGlmKCF3YXRjaGVyKXtcbiAgICAgICAgICAgICQkLmVycm9ySGFuZGxlci53YXJuaW5nKFwiSW52YWxpZCBzd2FybSByZWNlaXZlZDogXCIgKyBzd2FybUlkKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhcmdzID0gc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuYXJncztcbiAgICAgICAgYXJncy5wdXNoKHN3YXJtU2VyaWFsaXNhdGlvbik7XG5cbiAgICAgICAgd2F0Y2hlci5jYWxsYmFjay5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgaWYoIXdhdGNoZXIua2VlcEFsaXZlQ2hlY2soKSl7XG4gICAgICAgICAgICBkZWxldGUgc3dhcm1BbGl2ZUluc3RhbmNlc1tzd2FybUlkXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucmV2aXZlX3N3YXJtID0gZnVuY3Rpb24oc3dhcm1TZXJpYWxpc2F0aW9uKXtcblxuXG4gICAgICAgIHZhciBzd2FybUlkICAgICA9IHN3YXJtU2VyaWFsaXNhdGlvbi5tZXRhLnN3YXJtSWQ7XG4gICAgICAgIHZhciBzd2FybVR5cGUgICA9IHN3YXJtU2VyaWFsaXNhdGlvbi5tZXRhLnN3YXJtVHlwZU5hbWU7XG4gICAgICAgIHZhciBpbnN0YW5jZSAgICA9IHN3YXJtQWxpdmVJbnN0YW5jZXNbc3dhcm1JZF07XG5cbiAgICAgICAgdmFyIHN3YXJtO1xuXG4gICAgICAgIGlmKGluc3RhbmNlKXtcbiAgICAgICAgICAgIHN3YXJtID0gaW5zdGFuY2Uuc3dhcm07XG4gICAgICAgICAgICBzd2FybS51cGRhdGUoc3dhcm1TZXJpYWxpc2F0aW9uKTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3dhcm0gPSAkJC5zd2FybS5zdGFydChzd2FybVR5cGUpO1xuICAgICAgICAgICAgaWYoIXN3YXJtKXtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gc3dhcm0gdHlwZSA8JHtzd2FybVR5cGV9Pi4gQ2hlY2sgaWYgc3dhcm0gdHlwZSBpcyBwcmVzZW50IGluIGRvbWFpbiBjb25zdGl0dWlvbiFgKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHN3YXJtLnVwZGF0ZShzd2FybVNlcmlhbGlzYXRpb24pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKnN3YXJtID0gJCQuc3dhcm0uc3RhcnQoc3dhcm1UeXBlLCBzd2FybVNlcmlhbGlzYXRpb24pOyovXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuY29tbWFuZCA9PSBcImFzeW5jUmV0dXJuXCIpIHtcbiAgICAgICAgICAgIHZhciBjbyA9ICQkLlBTS19QdWJTdWIucHVibGlzaCgkJC5DT05TVEFOVFMuU1dBUk1fUkVUVVJOLCBzd2FybVNlcmlhbGlzYXRpb24pO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTdWJzY3JpYmVycyBsaXN0ZW5pbmcgb25cIiwgJCQuQ09OU1RBTlRTLlNXQVJNX1JFVFVSTiwgY28pO1xuICAgICAgICAgICAgLy8gY2xlYW5Td2FybVdhaXRlcihzd2FybVNlcmlhbGlzYXRpb24pO1xuICAgICAgICB9IGVsc2UgaWYgKHN3YXJtU2VyaWFsaXNhdGlvbi5tZXRhLmNvbW1hbmQgPT0gXCJleGVjdXRlU3dhcm1QaGFzZVwiKSB7XG4gICAgICAgICAgICBzd2FybS5ydW5QaGFzZShzd2FybVNlcmlhbGlzYXRpb24ubWV0YS5waGFzZU5hbWUsIHN3YXJtU2VyaWFsaXNhdGlvbi5tZXRhLmFyZ3MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJVbmtub3duIGNvbW1hbmRcIiwgc3dhcm1TZXJpYWxpc2F0aW9uLm1ldGEuY29tbWFuZCwgXCJpbiBzd2FybVNlcmlhbGlzYXRpb24ubWV0YS5jb21tYW5kXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN3YXJtO1xuICAgIH1cbn1cblxuXG4kJC5zd2FybXNJbnN0YW5jZXNNYW5hZ2VyID0gbmV3IFN3YXJtc0luc3RhbmNlc01hbmFnZXIoKTtcblxuXG4iLCJleHBvcnRzLmNyZWF0ZUZvck9iamVjdCA9IGZ1bmN0aW9uKHZhbHVlT2JqZWN0LCB0aGlzT2JqZWN0LCBsb2NhbElkKXtcblx0dmFyIHJldCA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuY3JlYXRlRm9yT2JqZWN0KHZhbHVlT2JqZWN0LCB0aGlzT2JqZWN0LCBsb2NhbElkKTtcblxuXHRyZXQuc3dhcm0gICAgICAgICAgID0gbnVsbDtcblx0cmV0Lm9uUmV0dXJuICAgICAgICA9IG51bGw7XG5cdHJldC5vblJlc3VsdCAgICAgICAgPSBudWxsO1xuXHRyZXQuYXN5bmNSZXR1cm4gICAgID0gbnVsbDtcblx0cmV0LnJldHVybiAgICAgICAgICA9IG51bGw7XG5cdHJldC5ob21lICAgICAgICAgICAgPSBudWxsO1xuXHRyZXQuaXNQZXJzaXN0ZWQgIFx0PSBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXNPYmplY3QuZ2V0TWV0YWRhdGEoJ3BlcnNpc3RlZCcpID09PSB0cnVlO1xuXHR9O1xuXG5cdHJldHVybiByZXQ7XG59OyIsInZhciBiZWVzSGVhbGVyID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIikuYmVlc0hlYWxlcjtcbnZhciBzd2FybURlYnVnID0gcmVxdWlyZShcIi4uL1N3YXJtRGVidWdcIik7XG5cbmV4cG9ydHMuY3JlYXRlRm9yT2JqZWN0ID0gZnVuY3Rpb24odmFsdWVPYmplY3QsIHRoaXNPYmplY3QsIGxvY2FsSWQpe1xuXHR2YXIgcmV0ID0ge307XG5cblx0ZnVuY3Rpb24gZmlsdGVyRm9yU2VyaWFsaXNhYmxlICh2YWx1ZU9iamVjdCl7XG5cdFx0cmV0dXJuIHZhbHVlT2JqZWN0Lm1ldGEuc3dhcm1JZDtcblx0fVxuXG5cdHZhciBzd2FybUZ1bmN0aW9uID0gZnVuY3Rpb24oY29udGV4dCwgcGhhc2VOYW1lKXtcblx0XHR2YXIgYXJncyA9W107XG5cdFx0Zm9yKHZhciBpID0gMjsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKyl7XG5cdFx0XHRhcmdzLnB1c2goYXJndW1lbnRzW2ldKTtcblx0XHR9XG5cblx0XHQvL21ha2UgdGhlIGV4ZWN1dGlvbiBhdCBsZXZlbCAwICAoYWZ0ZXIgYWxsIHBlbmRpbmcgZXZlbnRzKSBhbmQgd2FpdCB0byBoYXZlIGEgc3dhcm1JZFxuXHRcdHJldC5vYnNlcnZlKGZ1bmN0aW9uKCl7XG5cdFx0XHRiZWVzSGVhbGVyLmFzSlNPTih2YWx1ZU9iamVjdCwgcGhhc2VOYW1lLCBhcmdzLCBmdW5jdGlvbihlcnIsanNNc2cpe1xuXHRcdFx0XHRqc01zZy5tZXRhLnRhcmdldCA9IGNvbnRleHQ7XG5cdFx0XHRcdHZhciBzdWJzY3JpYmVyc0NvdW50ID0gJCQuUFNLX1B1YlN1Yi5wdWJsaXNoKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBqc01zZyk7XG5cdFx0XHRcdGlmKCFzdWJzY3JpYmVyc0NvdW50KXtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhgTm9ib2R5IGxpc3RlbmluZyBmb3IgPCR7JCQuQ09OU1RBTlRTLlNXQVJNX0ZPUl9FWEVDVVRJT059PiFgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSxudWxsLGZpbHRlckZvclNlcmlhbGlzYWJsZSk7XG5cblx0XHRyZXQubm90aWZ5KCk7XG5cblxuXHRcdHJldHVybiB0aGlzT2JqZWN0O1xuXHR9O1xuXG5cdHZhciBhc3luY1JldHVybiA9IGZ1bmN0aW9uKGVyciwgcmVzdWx0KXtcblx0XHR2YXIgY29udGV4dCA9IHZhbHVlT2JqZWN0LnByb3RlY3RlZFZhcnMuY29udGV4dDtcblxuXHRcdGlmKCFjb250ZXh0ICYmIHZhbHVlT2JqZWN0Lm1ldGEud2FpdFN0YWNrKXtcblx0XHRcdGNvbnRleHQgPSB2YWx1ZU9iamVjdC5tZXRhLndhaXRTdGFjay5wb3AoKTtcblx0XHRcdHZhbHVlT2JqZWN0LnByb3RlY3RlZFZhcnMuY29udGV4dCA9IGNvbnRleHQ7XG5cdFx0fVxuXG5cdFx0YmVlc0hlYWxlci5hc0pTT04odmFsdWVPYmplY3QsIFwiX19yZXR1cm5fX1wiLCBbZXJyLCByZXN1bHRdLCBmdW5jdGlvbihlcnIsanNNc2cpe1xuXHRcdFx0anNNc2cubWV0YS5jb21tYW5kID0gXCJhc3luY1JldHVyblwiO1xuXHRcdFx0aWYoIWNvbnRleHQpe1xuXHRcdFx0XHRjb250ZXh0ID0gdmFsdWVPYmplY3QubWV0YS5ob21lU2VjdXJpdHlDb250ZXh0Oy8vVE9ETzogQ0hFQ0sgVEhJU1xuXG5cdFx0XHR9XG5cdFx0XHRqc01zZy5tZXRhLnRhcmdldCA9IGNvbnRleHQ7XG5cblx0XHRcdGlmKCFjb250ZXh0KXtcblx0XHRcdFx0JCQuZXJyb3JIYW5kbGVyLmVycm9yKG5ldyBFcnJvcihcIkFzeW5jaHJvbm91cyByZXR1cm4gaW5zaWRlIG9mIGEgc3dhcm0gdGhhdCBkb2VzIG5vdCB3YWl0IGZvciByZXN1bHRzXCIpKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQkLlBTS19QdWJTdWIucHVibGlzaCgkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTiwganNNc2cpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGhvbWUoZXJyLCByZXN1bHQpe1xuXHRcdGJlZXNIZWFsZXIuYXNKU09OKHZhbHVlT2JqZWN0LCBcImhvbWVcIiwgW2VyciwgcmVzdWx0XSwgZnVuY3Rpb24oZXJyLGpzTXNnKXtcblx0XHRcdHZhciBjb250ZXh0ID0gdmFsdWVPYmplY3QubWV0YS5ob21lQ29udGV4dDtcblx0XHRcdGpzTXNnLm1ldGEudGFyZ2V0ID0gY29udGV4dDtcblx0XHRcdCQkLlBTS19QdWJTdWIucHVibGlzaCgkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTiwganNNc2cpO1xuXHRcdH0pO1xuXHR9XG5cblxuXG5cdGZ1bmN0aW9uIHdhaXRSZXN1bHRzKGNhbGxiYWNrLCBrZWVwQWxpdmVDaGVjaywgc3dhcm0pe1xuXHRcdGlmKCFzd2FybSl7XG5cdFx0XHRzd2FybSA9IHRoaXM7XG5cdFx0fVxuXHRcdGlmKCFrZWVwQWxpdmVDaGVjayl7XG5cdFx0XHRrZWVwQWxpdmVDaGVjayA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFyIGlubmVyID0gc3dhcm0uZ2V0SW5uZXJWYWx1ZSgpO1xuXHRcdGlmKCFpbm5lci5tZXRhLndhaXRTdGFjayl7XG5cdFx0XHRpbm5lci5tZXRhLndhaXRTdGFjayA9IFtdO1xuXHRcdFx0aW5uZXIubWV0YS53YWl0U3RhY2sucHVzaCgkJC5zZWN1cml0eUNvbnRleHQpXG5cdFx0fVxuXHRcdCQkLnN3YXJtc0luc3RhbmNlc01hbmFnZXIud2FpdEZvclN3YXJtKGNhbGxiYWNrLCBzd2FybSwga2VlcEFsaXZlQ2hlY2spO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBnZXRJbm5lclZhbHVlKCl7XG5cdFx0cmV0dXJuIHZhbHVlT2JqZWN0O1xuXHR9XG5cblx0ZnVuY3Rpb24gcnVuUGhhc2UoZnVuY3ROYW1lLCBhcmdzKXtcblx0XHR2YXIgZnVuYyA9IHZhbHVlT2JqZWN0Lm15RnVuY3Rpb25zW2Z1bmN0TmFtZV07XG5cdFx0aWYoZnVuYyl7XG5cdFx0XHRmdW5jLmFwcGx5KHRoaXNPYmplY3QsIGFyZ3MpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkJC5lcnJvckhhbmRsZXIuc3ludGF4RXJyb3IoZnVuY3ROYW1lLCB2YWx1ZU9iamVjdCwgXCJGdW5jdGlvbiBcIiArIGZ1bmN0TmFtZSArIFwiIGRvZXMgbm90IGV4aXN0IVwiKTtcblx0XHR9XG5cblx0fVxuXG5cdGZ1bmN0aW9uIHVwZGF0ZShzZXJpYWxpc2F0aW9uKXtcblx0XHRiZWVzSGVhbGVyLmpzb25Ub05hdGl2ZShzZXJpYWxpc2F0aW9uLHZhbHVlT2JqZWN0KTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gdmFsdWVPZigpe1xuXHRcdHZhciByZXQgPSB7fTtcblx0XHRyZXQubWV0YSAgICAgICAgICAgICAgICA9IHZhbHVlT2JqZWN0Lm1ldGE7XG5cdFx0cmV0LnB1YmxpY1ZhcnMgICAgICAgICAgPSB2YWx1ZU9iamVjdC5wdWJsaWNWYXJzO1xuXHRcdHJldC5wcml2YXRlVmFycyAgICAgICAgID0gdmFsdWVPYmplY3QucHJpdmF0ZVZhcnM7XG5cdFx0cmV0LnByb3RlY3RlZFZhcnMgICAgICAgPSB2YWx1ZU9iamVjdC5wcm90ZWN0ZWRWYXJzO1xuXHRcdHJldHVybiByZXQ7XG5cdH1cblxuXHRmdW5jdGlvbiB0b1N0cmluZyAoKXtcblx0XHRyZXR1cm4gc3dhcm1EZWJ1Zy5jbGVhbkR1bXAodGhpc09iamVjdC52YWx1ZU9mKCkpO1xuXHR9XG5cblxuXHRmdW5jdGlvbiBjcmVhdGVQYXJhbGxlbChjYWxsYmFjayl7XG5cdFx0cmV0dXJuIHJlcXVpcmUoXCIuLi8uLi9wYXJhbGxlbEpvaW5Qb2ludFwiKS5jcmVhdGVKb2luUG9pbnQodGhpc09iamVjdCwgY2FsbGJhY2ssICQkLl9faW50ZXJuLm1rQXJncyhhcmd1bWVudHMsMSkpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlU2VyaWFsKGNhbGxiYWNrKXtcblx0XHRyZXR1cm4gcmVxdWlyZShcIi4uLy4uL3NlcmlhbEpvaW5Qb2ludFwiKS5jcmVhdGVTZXJpYWxKb2luUG9pbnQodGhpc09iamVjdCwgY2FsbGJhY2ssICQkLl9faW50ZXJuLm1rQXJncyhhcmd1bWVudHMsMSkpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5zcGVjdCgpe1xuXHRcdHJldHVybiBzd2FybURlYnVnLmNsZWFuRHVtcCh0aGlzT2JqZWN0LnZhbHVlT2YoKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjb25zdHJ1Y3Rvcigpe1xuXHRcdHJldHVybiBTd2FybURlc2NyaXB0aW9uO1xuXHR9XG5cblx0ZnVuY3Rpb24gZW5zdXJlTG9jYWxJZCgpe1xuXHRcdGlmKCF2YWx1ZU9iamVjdC5sb2NhbElkKXtcblx0XHRcdHZhbHVlT2JqZWN0LmxvY2FsSWQgPSB2YWx1ZU9iamVjdC5tZXRhLnN3YXJtVHlwZU5hbWUgKyBcIi1cIiArIGxvY2FsSWQ7XG5cdFx0XHRsb2NhbElkKys7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gb2JzZXJ2ZShjYWxsYmFjaywgd2FpdEZvck1vcmUsIGZpbHRlcil7XG5cdFx0aWYoIXdhaXRGb3JNb3JlKXtcblx0XHRcdHdhaXRGb3JNb3JlID0gZnVuY3Rpb24gKCl7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRlbnN1cmVMb2NhbElkKCk7XG5cblx0XHQkJC5QU0tfUHViU3ViLnN1YnNjcmliZSh2YWx1ZU9iamVjdC5sb2NhbElkLCBjYWxsYmFjaywgd2FpdEZvck1vcmUsIGZpbHRlcik7XG5cdH1cblxuXHRmdW5jdGlvbiB0b0pTT04ocHJvcCl7XG5cdFx0Ly9wcmV2ZW50aW5nIG1heCBjYWxsIHN0YWNrIHNpemUgZXhjZWVkaW5nIG9uIHByb3h5IGF1dG8gcmVmZXJlbmNpbmdcblx0XHQvL3JlcGxhY2Uge30gYXMgcmVzdWx0IG9mIEpTT04oUHJveHkpIHdpdGggdGhlIHN0cmluZyBbT2JqZWN0IHByb3RlY3RlZCBvYmplY3RdXG5cdFx0cmV0dXJuIFwiW09iamVjdCBwcm90ZWN0ZWQgb2JqZWN0XVwiO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0SlNPTihjYWxsYmFjayl7XG5cdFx0cmV0dXJuXHRiZWVzSGVhbGVyLmFzSlNPTih2YWx1ZU9iamVjdCwgbnVsbCwgbnVsbCxjYWxsYmFjayk7XG5cdH1cblxuXHRmdW5jdGlvbiBub3RpZnkoZXZlbnQpe1xuXHRcdGlmKCFldmVudCl7XG5cdFx0XHRldmVudCA9IHZhbHVlT2JqZWN0O1xuXHRcdH1cblx0XHRlbnN1cmVMb2NhbElkKCk7XG5cdFx0JCQuUFNLX1B1YlN1Yi5wdWJsaXNoKHZhbHVlT2JqZWN0LmxvY2FsSWQsIGV2ZW50KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldE1ldGEobmFtZSl7XG5cdFx0cmV0dXJuIHZhbHVlT2JqZWN0LmdldE1ldGEobmFtZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBzZXRNZXRhKG5hbWUsIHZhbHVlKXtcblx0XHRyZXR1cm4gdmFsdWVPYmplY3Quc2V0TWV0YShuYW1lLCB2YWx1ZSk7XG5cdH1cblxuXHRyZXQuc2V0TWV0YVx0XHRcdD0gc2V0TWV0YTtcblx0cmV0LmdldE1ldGFcdFx0XHQ9IGdldE1ldGE7XG5cdHJldC5zd2FybSAgICAgICAgICAgPSBzd2FybUZ1bmN0aW9uO1xuXHRyZXQubm90aWZ5ICAgICAgICAgID0gbm90aWZ5O1xuXHRyZXQuZ2V0SlNPTiAgICBcdCAgICA9IGdldEpTT047XG5cdHJldC50b0pTT04gICAgICAgICAgPSB0b0pTT047XG5cdHJldC5vYnNlcnZlICAgICAgICAgPSBvYnNlcnZlO1xuXHRyZXQuaW5zcGVjdCAgICAgICAgID0gaW5zcGVjdDtcblx0cmV0LmpvaW4gICAgICAgICAgICA9IGNyZWF0ZVBhcmFsbGVsO1xuXHRyZXQucGFyYWxsZWwgICAgICAgID0gY3JlYXRlUGFyYWxsZWw7XG5cdHJldC5zZXJpYWwgICAgICAgICAgPSBjcmVhdGVTZXJpYWw7XG5cdHJldC52YWx1ZU9mICAgICAgICAgPSB2YWx1ZU9mO1xuXHRyZXQudXBkYXRlICAgICAgICAgID0gdXBkYXRlO1xuXHRyZXQucnVuUGhhc2UgICAgICAgID0gcnVuUGhhc2U7XG5cdHJldC5vblJldHVybiAgICAgICAgPSB3YWl0UmVzdWx0cztcblx0cmV0Lm9uUmVzdWx0ICAgICAgICA9IHdhaXRSZXN1bHRzO1xuXHRyZXQuYXN5bmNSZXR1cm4gICAgID0gYXN5bmNSZXR1cm47XG5cdHJldC5yZXR1cm4gICAgICAgICAgPSBhc3luY1JldHVybjtcblx0cmV0LmdldElubmVyVmFsdWUgICA9IGdldElubmVyVmFsdWU7XG5cdHJldC5ob21lICAgICAgICAgICAgPSBob21lO1xuXHRyZXQudG9TdHJpbmcgICAgICAgID0gdG9TdHJpbmc7XG5cdHJldC5jb25zdHJ1Y3RvciAgICAgPSBjb25zdHJ1Y3Rvcjtcblx0cmV0LnNldE1ldGFkYXRhXHRcdD0gdmFsdWVPYmplY3Quc2V0TWV0YS5iaW5kKHZhbHVlT2JqZWN0KTtcblx0cmV0LmdldE1ldGFkYXRhXHRcdD0gdmFsdWVPYmplY3QuZ2V0TWV0YS5iaW5kKHZhbHVlT2JqZWN0KTtcblxuXHRyZXR1cm4gcmV0O1xuXG59O1xuIiwiZXhwb3J0cy5jcmVhdGVGb3JPYmplY3QgPSBmdW5jdGlvbih2YWx1ZU9iamVjdCwgdGhpc09iamVjdCwgbG9jYWxJZCl7XG5cdHZhciByZXQgPSByZXF1aXJlKFwiLi9iYXNlXCIpLmNyZWF0ZUZvck9iamVjdCh2YWx1ZU9iamVjdCwgdGhpc09iamVjdCwgbG9jYWxJZCk7XG5cblx0cmV0LnN3YXJtICAgICAgICAgICA9IG51bGw7XG5cdHJldC5vblJldHVybiAgICAgICAgPSBudWxsO1xuXHRyZXQub25SZXN1bHQgICAgICAgID0gbnVsbDtcblx0cmV0LmFzeW5jUmV0dXJuICAgICA9IG51bGw7XG5cdHJldC5yZXR1cm4gICAgICAgICAgPSBudWxsO1xuXHRyZXQuaG9tZSAgICAgICAgICAgID0gbnVsbDtcblxuXHRyZXR1cm4gcmV0O1xufTsiLCJleHBvcnRzLmNyZWF0ZUZvck9iamVjdCA9IGZ1bmN0aW9uKHZhbHVlT2JqZWN0LCB0aGlzT2JqZWN0LCBsb2NhbElkKXtcblx0cmV0dXJuIHJlcXVpcmUoXCIuL2Jhc2VcIikuY3JlYXRlRm9yT2JqZWN0KHZhbHVlT2JqZWN0LCB0aGlzT2JqZWN0LCBsb2NhbElkKTtcbn07IiwiLypcbkluaXRpYWwgTGljZW5zZTogKGMpIEF4aW9sb2dpYyBSZXNlYXJjaCAmIEFsYm9haWUgU8OubmljxIMuXG5Db250cmlidXRvcnM6IEF4aW9sb2dpYyBSZXNlYXJjaCAsIFByaXZhdGVTa3kgcHJvamVjdFxuQ29kZSBMaWNlbnNlOiBMR1BMIG9yIE1JVC5cbiovXG5cbi8vdmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xuLy92YXIgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuXG5cbmZ1bmN0aW9uIFN3YXJtTGlicmFyeShwcmVmaXhOYW1lLCBmb2xkZXIpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBmdW5jdGlvbiB3cmFwQ2FsbChvcmlnaW5hbCwgcHJlZml4TmFtZSl7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiguLi5hcmdzKXtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJwcmVmaXhOYW1lXCIsIHByZWZpeE5hbWUpXG4gICAgICAgICAgICB2YXIgcHJldmlvdXNQcmVmaXggPSAkJC5saWJyYXJ5UHJlZml4O1xuICAgICAgICAgICAgdmFyIHByZXZpb3VzTGlicmFyeSA9ICQkLl9fZ2xvYmFsLmN1cnJlbnRMaWJyYXJ5O1xuXG4gICAgICAgICAgICAkJC5saWJyYXJ5UHJlZml4ID0gcHJlZml4TmFtZTtcbiAgICAgICAgICAgICQkLl9fZ2xvYmFsLmN1cnJlbnRMaWJyYXJ5ID0gc2VsZjtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gb3JpZ2luYWwuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICAgICAgJCQubGlicmFyeVByZWZpeCA9IHByZXZpb3VzUHJlZml4IDtcbiAgICAgICAgICAgICAgICAkJC5fX2dsb2JhbC5jdXJyZW50TGlicmFyeSA9IHByZXZpb3VzTGlicmFyeTtcbiAgICAgICAgICAgIH1jYXRjaChlcnIpe1xuICAgICAgICAgICAgICAgICQkLmxpYnJhcnlQcmVmaXggPSBwcmV2aW91c1ByZWZpeCA7XG4gICAgICAgICAgICAgICAgJCQuX19nbG9iYWwuY3VycmVudExpYnJhcnkgPSBwcmV2aW91c0xpYnJhcnk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgICQkLmxpYnJhcmllc1twcmVmaXhOYW1lXSA9IHRoaXM7XG4gICAgdmFyIHByZWZpeGVkUmVxdWlyZSA9IHdyYXBDYWxsKGZ1bmN0aW9uKHBhdGgpe1xuICAgICAgICByZXR1cm4gcmVxdWlyZShwYXRoKTtcbiAgICB9LCBwcmVmaXhOYW1lKTtcblxuICAgIGZ1bmN0aW9uIGluY2x1ZGVBbGxJblJvb3QoZm9sZGVyKSB7XG4gICAgICAgIGlmKHR5cGVvZiBmb2xkZXIgIT0gXCJzdHJpbmdcIil7XG4gICAgICAgICAgICAvL3dlIGFzc3VtZSB0aGF0IGl0IGlzIGEgbGlicmFyeSBtb2R1bGUgcHJvcGVybHkgcmVxdWlyZWQgd2l0aCByZXF1aXJlIGFuZCBjb250YWluaW5nICQkLmxpYnJhcnlcbiAgICAgICAgICAgIGZvcih2YXIgdiBpbiBmb2xkZXIpe1xuICAgICAgICAgICAgICAgICQkLnJlZ2lzdGVyU3dhcm1EZXNjcmlwdGlvbihwcmVmaXhOYW1lLHYsIHByZWZpeE5hbWUgKyBcIi5cIiArIHYsICBmb2xkZXJbdl0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbmV3TmFtZXMgPSAkJC5fX2dsb2JhbC5yZXF1aXJlTGlicmFyaWVzTmFtZXNbcHJlZml4TmFtZV07XG4gICAgICAgICAgICBmb3IodmFyIHYgaW4gbmV3TmFtZXMpe1xuICAgICAgICAgICAgICAgIHNlbGZbdl0gPSAgbmV3TmFtZXNbdl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZm9sZGVyO1xuICAgICAgICB9XG5cblxuICAgICAgICB2YXIgcmVzID0gcHJlZml4ZWRSZXF1aXJlKGZvbGRlcik7IC8vIGEgbGlicmFyeSBpcyBqdXN0IGEgbW9kdWxlXG4gICAgICAgIGlmKHR5cGVvZiByZXMuX19hdXRvZ2VuZXJhdGVkX3ByaXZhdGVza3lfbGlicmFyeU5hbWUgIT0gXCJ1bmRlZmluZWRcIil7XG4gICAgICAgICAgICB2YXIgc3dhcm1zID0gJCQuX19nbG9iYWwucmVxdWlyZUxpYnJhcmllc05hbWVzW3Jlcy5fX2F1dG9nZW5lcmF0ZWRfcHJpdmF0ZXNreV9saWJyYXJ5TmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgc3dhcm1zID0gJCQuX19nbG9iYWwucmVxdWlyZUxpYnJhcmllc05hbWVzW2ZvbGRlcl07XG4gICAgICAgIH1cbiAgICAgICAgICAgIHZhciBleGlzdGluZ05hbWU7XG4gICAgICAgICAgICBmb3IodmFyIHYgaW4gc3dhcm1zKXtcbiAgICAgICAgICAgICAgICBleGlzdGluZ05hbWUgPSBzd2FybXNbdl07XG4gICAgICAgICAgICAgICAgc2VsZlt2XSA9IGV4aXN0aW5nTmFtZTtcbiAgICAgICAgICAgICAgICAkJC5yZWdpc3RlclN3YXJtRGVzY3JpcHRpb24ocHJlZml4TmFtZSx2LCBwcmVmaXhOYW1lICsgXCIuXCIgKyB2LCAgZXhpc3RpbmdOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB3cmFwU3dhcm1SZWxhdGVkRnVuY3Rpb25zKHNwYWNlLCBwcmVmaXhOYW1lKXtcbiAgICAgICAgdmFyIHJldCA9IHt9O1xuICAgICAgICB2YXIgbmFtZXMgPSBbXCJjcmVhdGVcIiwgXCJkZXNjcmliZVwiLCBcInN0YXJ0XCIsIFwicmVzdGFydFwiXTtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaTxuYW1lcy5sZW5ndGg7IGkrKyApe1xuICAgICAgICAgICAgcmV0W25hbWVzW2ldXSA9IHdyYXBDYWxsKHNwYWNlW25hbWVzW2ldXSwgcHJlZml4TmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICB0aGlzLmNhbGxmbG93cyAgICAgICAgPSB0aGlzLmNhbGxmbG93ICAgPSB3cmFwU3dhcm1SZWxhdGVkRnVuY3Rpb25zKCQkLmNhbGxmbG93cywgcHJlZml4TmFtZSk7XG4gICAgdGhpcy5zd2FybXMgICAgICAgICAgID0gdGhpcy5zd2FybSAgICAgID0gd3JhcFN3YXJtUmVsYXRlZEZ1bmN0aW9ucygkJC5zd2FybXMsIHByZWZpeE5hbWUpO1xuICAgIHRoaXMuY29udHJhY3RzICAgICAgICA9IHRoaXMuY29udHJhY3QgICA9IHdyYXBTd2FybVJlbGF0ZWRGdW5jdGlvbnMoJCQuY29udHJhY3RzLCBwcmVmaXhOYW1lKTtcbiAgICBpbmNsdWRlQWxsSW5Sb290KGZvbGRlciwgcHJlZml4TmFtZSk7XG59XG5cbmV4cG9ydHMubG9hZExpYnJhcnkgPSBmdW5jdGlvbihwcmVmaXhOYW1lLCBmb2xkZXIpe1xuICAgIHZhciBleGlzdGluZyA9ICQkLmxpYnJhcmllc1twcmVmaXhOYW1lXTtcbiAgICBpZihleGlzdGluZyApe1xuICAgICAgICBpZighKGV4aXN0aW5nIGluc3RhbmNlb2YgU3dhcm1MaWJyYXJ5KSl7XG4gICAgICAgICAgICB2YXIgc0wgPSBuZXcgU3dhcm1MaWJyYXJ5KHByZWZpeE5hbWUsIGZvbGRlcik7XG4gICAgICAgICAgICBmb3IodmFyIHByb3AgaW4gZXhpc3Rpbmcpe1xuICAgICAgICAgICAgICAgIHNMW3Byb3BdID0gZXhpc3RpbmdbcHJvcF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc0w7XG4gICAgICAgIH1cbiAgICAgICAgaWYoZm9sZGVyKSB7XG4gICAgICAgICAgICAkJC5lcnJvckhhbmRsZXIud2FybmluZyhcIlJldXNpbmcgYWxyZWFkeSBsb2FkZWQgbGlicmFyeSBcIiArIHByZWZpeE5hbWUgKyBcImNvdWxkIGJlIGFuIGVycm9yIVwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXhpc3Rpbmc7XG4gICAgfVxuICAgIC8vdmFyIGFic29sdXRlUGF0aCA9IHBhdGgucmVzb2x2ZShmb2xkZXIpO1xuICAgIHJldHVybiBuZXcgU3dhcm1MaWJyYXJ5KHByZWZpeE5hbWUsIGZvbGRlcik7XG59XG5cbiIsIi8qXG4gcmVxdWlyZSBhbmQgJCQucmVxdWlyZSBhcmUgb3ZlcndyaXRpbmcgdGhlIG5vZGUuanMgZGVmYXVsdHMgaW4gbG9hZGluZyBtb2R1bGVzIGZvciBpbmNyZWFzaW5nIHNlY3VyaXR5LHNwZWVkIGFuZCBtYWtpbmcgaXQgd29yayB0byB0aGUgcHJpdmF0ZXNreSBydW50aW1lIGJ1aWxkIHdpdGggYnJvd3NlcmlmeS5cbiBUaGUgcHJpdmF0ZXNreSBjb2RlIGZvciBkb21haW5zIHNob3VsZCB3b3JrIGluIG5vZGUgYW5kIGJyb3dzZXJzLlxuICovXG5cblxuaWYgKHR5cGVvZih3aW5kb3cpICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgZ2xvYmFsID0gd2luZG93O1xufVxuXG5cbmlmICh0eXBlb2YoZ2xvYmFsLiQkKSA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgZ2xvYmFsLiQkID0ge307XG4gICAgJCQuX19nbG9iYWwgPSB7fTtcbn1cblxuaWYgKHR5cGVvZigkJC5fX2dsb2JhbCkgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICQkLl9fZ2xvYmFsID0ge307XG59XG5cbmlmICh0eXBlb2YoJCQuX19nbG9iYWwucmVxdWlyZUxpYnJhcmllc05hbWVzKSA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgJCQuX19nbG9iYWwuY3VycmVudExpYnJhcnlOYW1lID0gbnVsbDtcbiAgICAkJC5fX2dsb2JhbC5yZXF1aXJlTGlicmFyaWVzTmFtZXMgPSB7fTtcbn1cblxuXG5pZiAodHlwZW9mKCQkLl9fcnVudGltZU1vZHVsZXMpID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAkJC5fX3J1bnRpbWVNb2R1bGVzID0ge307XG59XG5cbnJlcXVpcmUoXCIuLy4uL3N0YW5kYXJkR2xvYmFsU3ltYm9sc1wiKTtcblxuaWYgKHR5cGVvZihnbG9iYWwuZnVuY3Rpb25VbmRlZmluZWQpID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBnbG9iYWwuZnVuY3Rpb25VbmRlZmluZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ2FsbGVkIG9mIGFuIHVuZGVmaW5lZCBmdW5jdGlvbiEhISFcIik7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCBvZiBhbiB1bmRlZmluZWQgZnVuY3Rpb25cIik7XG4gICAgfTtcbiAgICBpZiAodHlwZW9mKGdsb2JhbC53ZWJzaGltc1JlcXVpcmUpID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgZ2xvYmFsLndlYnNoaW1zUmVxdWlyZSA9IGdsb2JhbC5mdW5jdGlvblVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mKGdsb2JhbC5kb21haW5SZXF1aXJlKSA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIGdsb2JhbC5kb21haW5SZXF1aXJlID0gZ2xvYmFsLmZ1bmN0aW9uVW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YoZ2xvYmFsLnBza3J1bnRpbWVSZXF1aXJlKSA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIGdsb2JhbC5wc2tydW50aW1lUmVxdWlyZSA9IGdsb2JhbC5mdW5jdGlvblVuZGVmaW5lZDtcbiAgICB9XG59XG5cbmNvbnN0IHdlQXJlSW5icm93c2VyID0gKHR5cGVvZiAoJCQuYnJvd3NlclJ1bnRpbWUpICE9IFwidW5kZWZpbmVkXCIpO1xuY29uc3Qgd2VBcmVJblNhbmRib3ggPSAodHlwZW9mIGdsb2JhbC5yZXF1aXJlICE9PSAndW5kZWZpbmVkJyk7XG5cblxuY29uc3QgcGFzdFJlcXVlc3RzID0ge307XG5cbmZ1bmN0aW9uIHByZXZlbnRSZWN1cnNpdmVSZXF1aXJlKHJlcXVlc3QpIHtcbiAgICBpZiAocGFzdFJlcXVlc3RzW3JlcXVlc3RdKSB7XG4gICAgICAgIGNvbnN0IGVyciA9IG5ldyBFcnJvcihcIlByZXZlbnRpbmcgcmVjdXJzaXZlIHJlcXVpcmUgZm9yIFwiICsgcmVxdWVzdCk7XG4gICAgICAgIGVyci50eXBlID0gXCJQU0tJZ25vcmFibGVFcnJvclwiO1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgfVxuXG59XG5cbmZ1bmN0aW9uIGRpc2FibGVSZXF1aXJlKHJlcXVlc3QpIHtcbiAgICBwYXN0UmVxdWVzdHNbcmVxdWVzdF0gPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBlbmFibGVSZXF1aXJlKHJlcXVlc3QpIHtcbiAgICBwYXN0UmVxdWVzdHNbcmVxdWVzdF0gPSBmYWxzZTtcbn1cblxuXG5mdW5jdGlvbiByZXF1aXJlRnJvbUNhY2hlKHJlcXVlc3QpIHtcbiAgICBjb25zdCBleGlzdGluZ01vZHVsZSA9ICQkLl9fcnVudGltZU1vZHVsZXNbcmVxdWVzdF07XG4gICAgcmV0dXJuIGV4aXN0aW5nTW9kdWxlO1xufVxuXG5mdW5jdGlvbiB3cmFwU3RlcChjYWxsYmFja05hbWUpIHtcbiAgICBjb25zdCBjYWxsYmFjayA9IGdsb2JhbFtjYWxsYmFja05hbWVdO1xuXG4gICAgaWYgKGNhbGxiYWNrID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGNhbGxiYWNrID09PSBnbG9iYWwuZnVuY3Rpb25VbmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGNhbGxiYWNrKHJlcXVlc3QpO1xuICAgICAgICAkJC5fX3J1bnRpbWVNb2R1bGVzW3JlcXVlc3RdID0gcmVzdWx0O1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdHJ5UmVxdWlyZVNlcXVlbmNlKG9yaWdpbmFsUmVxdWlyZSwgcmVxdWVzdCkge1xuICAgIGxldCBhcnI7XG4gICAgaWYgKG9yaWdpbmFsUmVxdWlyZSkge1xuICAgICAgICBhcnIgPSAkJC5fX3JlcXVpcmVGdW5jdGlvbnNDaGFpbi5zbGljZSgpO1xuICAgICAgICBhcnIucHVzaChvcmlnaW5hbFJlcXVpcmUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGFyciA9ICQkLl9fcmVxdWlyZUZ1bmN0aW9uc0NoYWluO1xuICAgIH1cblxuICAgIHByZXZlbnRSZWN1cnNpdmVSZXF1aXJlKHJlcXVlc3QpO1xuICAgIGRpc2FibGVSZXF1aXJlKHJlcXVlc3QpO1xuICAgIGxldCByZXN1bHQ7XG4gICAgY29uc3QgcHJldmlvdXNSZXF1aXJlID0gJCQuX19nbG9iYWwuY3VycmVudExpYnJhcnlOYW1lO1xuICAgIGxldCBwcmV2aW91c1JlcXVpcmVDaGFuZ2VkID0gZmFsc2U7XG5cbiAgICBpZiAoIXByZXZpb3VzUmVxdWlyZSkge1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkxvYWRpbmcgbGlicmFyeSBmb3IgcmVxdWlyZVwiLCByZXF1ZXN0KTtcbiAgICAgICAgJCQuX19nbG9iYWwuY3VycmVudExpYnJhcnlOYW1lID0gcmVxdWVzdDtcblxuICAgICAgICBpZiAodHlwZW9mICQkLl9fZ2xvYmFsLnJlcXVpcmVMaWJyYXJpZXNOYW1lc1tyZXF1ZXN0XSA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAkJC5fX2dsb2JhbC5yZXF1aXJlTGlicmFyaWVzTmFtZXNbcmVxdWVzdF0gPSB7fTtcbiAgICAgICAgICAgIC8vJCQuX19nbG9iYWwucmVxdWlyZUxpYnJhcmllc0Rlc2NyaXB0aW9uc1tyZXF1ZXN0XSAgID0ge307XG4gICAgICAgIH1cbiAgICAgICAgcHJldmlvdXNSZXF1aXJlQ2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGZ1bmMgPSBhcnJbaV07XG4gICAgICAgIHRyeSB7XG5cbiAgICAgICAgICAgIGlmIChmdW5jID09PSBnbG9iYWwuZnVuY3Rpb25VbmRlZmluZWQpIGNvbnRpbnVlO1xuICAgICAgICAgICAgcmVzdWx0ID0gZnVuYyhyZXF1ZXN0KTtcblxuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci50eXBlICE9PSBcIlBTS0lnbm9yYWJsZUVycm9yXCIpIHtcbiAgICAgICAgICAgICAgICAkJC5sb2coXCJSZXF1aXJlIGVuY291bnRlcmVkIGFuIGVycm9yIHdoaWxlIGxvYWRpbmcgXCIsIHJlcXVlc3QsIFwiXFxuQ2F1c2U6XFxuXCIsIGVyci5zdGFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICAkJC5sb2coXCJGYWlsZWQgdG8gbG9hZCBtb2R1bGUgXCIsIHJlcXVlc3QsIHJlc3VsdCk7XG4gICAgfVxuXG4gICAgZW5hYmxlUmVxdWlyZShyZXF1ZXN0KTtcbiAgICBpZiAocHJldmlvdXNSZXF1aXJlQ2hhbmdlZCkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiRW5kIGxvYWRpbmcgbGlicmFyeSBmb3IgcmVxdWlyZVwiLCByZXF1ZXN0LCAkJC5fX2dsb2JhbC5yZXF1aXJlTGlicmFyaWVzTmFtZXNbcmVxdWVzdF0pO1xuICAgICAgICAkJC5fX2dsb2JhbC5jdXJyZW50TGlicmFyeU5hbWUgPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5pZiAodHlwZW9mKCQkLnJlcXVpcmUpID09IFwidW5kZWZpbmVkXCIpIHtcblxuICAgICQkLl9fcmVxdWlyZUxpc3QgPSBbXCJ3ZWJzaGltc1JlcXVpcmVcIiwgXCJwc2tydW50aW1lUmVxdWlyZVwiXTtcbiAgICAkJC5fX3JlcXVpcmVGdW5jdGlvbnNDaGFpbiA9IFtdO1xuXG4gICAgJCQucmVxdWlyZUJ1bmRsZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIG5hbWUgKz0gXCJSZXF1aXJlXCI7XG4gICAgICAgICQkLl9fcmVxdWlyZUxpc3QucHVzaChuYW1lKTtcbiAgICAgICAgY29uc3QgYXJyID0gW3JlcXVpcmVGcm9tQ2FjaGVdO1xuICAgICAgICAkJC5fX3JlcXVpcmVMaXN0LmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIGNvbnN0IGNhbGxiYWNrID0gd3JhcFN0ZXAoaXRlbSk7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBhcnIucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQkLl9fcmVxdWlyZUZ1bmN0aW9uc0NoYWluID0gYXJyO1xuICAgIH07XG5cbiAgICAkJC5yZXF1aXJlQnVuZGxlKFwiaW5pdFwiKTtcblxuICAgIGlmICh3ZUFyZUluYnJvd3Nlcikge1xuICAgICAgICAkJC5sb2coXCJEZWZpbmluZyBnbG9iYWwgcmVxdWlyZSBpbiBicm93c2VyXCIpO1xuXG5cbiAgICAgICAgZ2xvYmFsLnJlcXVpcmUgPSBmdW5jdGlvbiAocmVxdWVzdCkge1xuXG4gICAgICAgICAgICAvLy8qW3JlcXVpcmVGcm9tQ2FjaGUsIHdyYXBTdGVwKHdlYnNoaW1zUmVxdWlyZSksICwgd3JhcFN0ZXAocHNrcnVudGltZVJlcXVpcmUpLCB3cmFwU3RlcChkb21haW5SZXF1aXJlKSpdXG4gICAgICAgICAgICByZXR1cm4gdHJ5UmVxdWlyZVNlcXVlbmNlKG51bGwsIHJlcXVlc3QpO1xuICAgICAgICB9XG4gICAgfSBlbHNlXG4gICAgICAgIGlmICh3ZUFyZUluU2FuZGJveCkge1xuICAgICAgICAvLyByZXF1aXJlIHNob3VsZCBiZSBwcm92aWRlZCB3aGVuIGNvZGUgaXMgbG9hZGVkIGluIGJyb3dzZXJpZnlcbiAgICAgICAgY29uc3QgYnVuZGxlUmVxdWlyZSA9IHJlcXVpcmU7XG5cbiAgICAgICAgJCQucmVxdWlyZUJ1bmRsZSgnc2FuZGJveEJhc2UnKTtcbiAgICAgICAgLy8gdGhpcyBzaG91bGQgYmUgc2V0IHVwIGJ5IHNhbmRib3ggcHJpb3IgdG9cbiAgICAgICAgY29uc3Qgc2FuZGJveFJlcXVpcmUgPSBnbG9iYWwucmVxdWlyZTtcbiAgICAgICAgZ2xvYmFsLmNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpO1xuXG4gICAgICAgIGZ1bmN0aW9uIG5ld0xvYWRlcihyZXF1ZXN0KSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIm5ld0xvYWRlcjpcIiwgcmVxdWVzdCk7XG4gICAgICAgICAgICAvL3ByZXZlbnRSZWN1cnNpdmVSZXF1aXJlKHJlcXVlc3QpO1xuICAgICAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCd0cnlpbmcgdG8gbG9hZCAnLCByZXF1ZXN0KTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gdHJ5QnVuZGxlUmVxdWlyZSguLi5hcmdzKSB7XG4gICAgICAgICAgICAgICAgLy9yZXR1cm4gJCQuX19vcmlnaW5hbFJlcXVpcmUuYXBwbHkoc2VsZixhcmdzKTtcbiAgICAgICAgICAgICAgICAvL3JldHVybiBNb2R1bGUuX2xvYWQuYXBwbHkoc2VsZixhcmdzKVxuICAgICAgICAgICAgICAgIGxldCByZXM7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzID0gc2FuZGJveFJlcXVpcmUuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIuY29kZSA9PT0gXCJNT0RVTEVfTk9UX0ZPVU5EXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHAgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgcmVxdWVzdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMgPSBzYW5kYm94UmVxdWlyZS5hcHBseShzZWxmLCBbcF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdCA9IHA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHJlcztcblxuXG4gICAgICAgICAgICByZXMgPSB0cnlSZXF1aXJlU2VxdWVuY2UodHJ5QnVuZGxlUmVxdWlyZSwgcmVxdWVzdCk7XG5cblxuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfVxuXG4gICAgICAgIGdsb2JhbC5yZXF1aXJlID0gbmV3TG9hZGVyO1xuXG4gICAgfSBlbHNlIHsgIC8vd2UgYXJlIGluIG5vZGVcbiAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuICAgICAgICAkJC5fX3J1bnRpbWVNb2R1bGVzW1wiY3J5cHRvXCJdID0gcmVxdWlyZShcImNyeXB0b1wiKTtcbiAgICAgICAgJCQuX19ydW50aW1lTW9kdWxlc1tcInV0aWxcIl0gPSByZXF1aXJlKFwidXRpbFwiKTtcblxuICAgICAgICBjb25zdCBNb2R1bGUgPSByZXF1aXJlKCdtb2R1bGUnKTtcbiAgICAgICAgJCQuX19ydW50aW1lTW9kdWxlc1tcIm1vZHVsZVwiXSA9IE1vZHVsZTtcblxuICAgICAgICAkJC5sb2coXCJSZWRlZmluaW5nIHJlcXVpcmUgZm9yIG5vZGVcIik7XG5cbiAgICAgICAgJCQuX19vcmlnaW5hbFJlcXVpcmUgPSBNb2R1bGUuX2xvYWQ7XG4gICAgICAgIGNvbnN0IG1vZHVsZU9yaWdpbmFsUmVxdWlyZSA9IE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZTtcblxuICAgICAgICBmdW5jdGlvbiBuZXdMb2FkZXIocmVxdWVzdCkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJuZXdMb2FkZXI6XCIsIHJlcXVlc3QpO1xuICAgICAgICAgICAgLy9wcmV2ZW50UmVjdXJzaXZlUmVxdWlyZShyZXF1ZXN0KTtcbiAgICAgICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBvcmlnaW5hbFJlcXVpcmUoLi4uYXJncykge1xuICAgICAgICAgICAgICAgIC8vcmV0dXJuICQkLl9fb3JpZ2luYWxSZXF1aXJlLmFwcGx5KHNlbGYsYXJncyk7XG4gICAgICAgICAgICAgICAgLy9yZXR1cm4gTW9kdWxlLl9sb2FkLmFwcGx5KHNlbGYsYXJncylcbiAgICAgICAgICAgICAgICBsZXQgcmVzO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcyA9IG1vZHVsZU9yaWdpbmFsUmVxdWlyZS5hcHBseShzZWxmLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVyci5jb2RlID09PSBcIk1PRFVMRV9OT1RfRk9VTkRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcCA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCByZXF1ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcyA9IG1vZHVsZU9yaWdpbmFsUmVxdWlyZS5hcHBseShzZWxmLCBbcF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdCA9IHA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gY3VycmVudEZvbGRlclJlcXVpcmUocmVxdWVzdCkge1xuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL1tyZXF1aXJlRnJvbUNhY2hlLCB3cmFwU3RlcChwc2tydW50aW1lUmVxdWlyZSksIHdyYXBTdGVwKGRvbWFpblJlcXVpcmUpLCBvcmlnaW5hbFJlcXVpcmVdXG4gICAgICAgICAgICByZXR1cm4gdHJ5UmVxdWlyZVNlcXVlbmNlKG9yaWdpbmFsUmVxdWlyZSwgcmVxdWVzdCk7XG4gICAgICAgIH1cblxuICAgICAgICBNb2R1bGUucHJvdG90eXBlLnJlcXVpcmUgPSBuZXdMb2FkZXI7XG4gICAgfVxuXG4gICAgJCQucmVxdWlyZSA9IHJlcXVpcmU7XG59XG4iLCJcbnZhciBqb2luQ291bnRlciA9IDA7XG5cbmZ1bmN0aW9uIFBhcmFsbGVsSm9pblBvaW50KHN3YXJtLCBjYWxsYmFjaywgYXJncyl7XG4gICAgam9pbkNvdW50ZXIrKztcbiAgICB2YXIgY2hhbm5lbElkID0gXCJQYXJhbGxlbEpvaW5Qb2ludFwiICsgam9pbkNvdW50ZXI7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBjb3VudGVyID0gMDtcbiAgICB2YXIgc3RvcE90aGVyRXhlY3V0aW9uICAgICA9IGZhbHNlO1xuXG4gICAgZnVuY3Rpb24gZXhlY3V0aW9uU3RlcChzdGVwRnVuYywgbG9jYWxBcmdzLCBzdG9wKXtcblxuICAgICAgICB0aGlzLmRvRXhlY3V0ZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZihzdG9wT3RoZXJFeGVjdXRpb24pe1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBzdGVwRnVuYy5hcHBseShzd2FybSwgbG9jYWxBcmdzKTtcbiAgICAgICAgICAgICAgICBpZihzdG9wKXtcbiAgICAgICAgICAgICAgICAgICAgc3RvcE90aGVyRXhlY3V0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTsgLy9ldmVyeXRpbmcgaXMgZmluZVxuICAgICAgICAgICAgfSBjYXRjaChlcnIpe1xuICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChlcnIpO1xuICAgICAgICAgICAgICAgIHNlbmRGb3JTb3VuZEV4ZWN1dGlvbihjYWxsYmFjaywgYXJncywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvL3N0b3AgaXQsIGRvIG5vdCBjYWxsIGFnYWluIGFueXRoaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG4gICAgICAgICQkLmVycm9ySGFuZGxlci5zeW50YXhFcnJvcihcImludmFsaWQgam9pblwiLHN3YXJtLCBcImludmFsaWQgZnVuY3Rpb24gYXQgam9pbiBpbiBzd2FybVwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgICQkLlBTS19QdWJTdWIuc3Vic2NyaWJlKGNoYW5uZWxJZCxmdW5jdGlvbihmb3JFeGVjdXRpb24pe1xuICAgICAgICBpZihzdG9wT3RoZXJFeGVjdXRpb24pe1xuICAgICAgICAgICAgcmV0dXJuIDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGlmKGZvckV4ZWN1dGlvbi5kb0V4ZWN1dGUoKSl7XG4gICAgICAgICAgICAgICAgZGVjQ291bnRlcigpO1xuICAgICAgICAgICAgfSAvLyBoYWQgYW4gZXJyb3IuLi5cbiAgICAgICAgfSBjYXRjaChlcnIpe1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgLy8kJC5lcnJvckhhbmRsZXIuc3ludGF4RXJyb3IoXCJfX2ludGVybmFsX19cIixzd2FybSwgXCJleGNlcHRpb24gaW4gdGhlIGV4ZWN1dGlvbiBvZiB0aGUgam9pbiBmdW5jdGlvbiBvZiBhIHBhcmFsbGVsIHRhc2tcIik7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGluY0NvdW50ZXIoKXtcbiAgICAgICAgaWYodGVzdElmVW5kZXJJbnNwZWN0aW9uKCkpe1xuICAgICAgICAgICAgLy9wcmV2ZW50aW5nIGluc3BlY3RvciBmcm9tIGluY3JlYXNpbmcgY291bnRlciB3aGVuIHJlYWRpbmcgdGhlIHZhbHVlcyBmb3IgZGVidWcgcmVhc29uXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwicHJldmVudGluZyBpbnNwZWN0aW9uXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvdW50ZXIrKztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0ZXN0SWZVbmRlckluc3BlY3Rpb24oKXtcbiAgICAgICAgdmFyIHJlcyA9IGZhbHNlO1xuICAgICAgICB2YXIgY29uc3RBcmd2ID0gcHJvY2Vzcy5leGVjQXJndi5qb2luKCk7XG4gICAgICAgIGlmKGNvbnN0QXJndi5pbmRleE9mKFwiaW5zcGVjdFwiKSE9PS0xIHx8IGNvbnN0QXJndi5pbmRleE9mKFwiZGVidWdcIikhPT0tMSl7XG4gICAgICAgICAgICAvL29ubHkgd2hlbiBydW5uaW5nIGluIGRlYnVnXG4gICAgICAgICAgICB2YXIgY2FsbHN0YWNrID0gbmV3IEVycm9yKCkuc3RhY2s7XG4gICAgICAgICAgICBpZihjYWxsc3RhY2suaW5kZXhPZihcIkRlYnVnQ29tbWFuZFByb2Nlc3NvclwiKSE9PS0xKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkRlYnVnQ29tbWFuZFByb2Nlc3NvciBkZXRlY3RlZCFcIik7XG4gICAgICAgICAgICAgICAgcmVzID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbmRGb3JTb3VuZEV4ZWN1dGlvbihmdW5jdCwgYXJncywgc3RvcCl7XG4gICAgICAgIHZhciBvYmogPSBuZXcgZXhlY3V0aW9uU3RlcChmdW5jdCwgYXJncywgc3RvcCk7XG4gICAgICAgICQkLlBTS19QdWJTdWIucHVibGlzaChjaGFubmVsSWQsIG9iaik7IC8vIGZvcmNlIGV4ZWN1dGlvbiB0byBiZSBcInNvdW5kXCJcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWNDb3VudGVyKCl7XG4gICAgICAgIGNvdW50ZXItLTtcbiAgICAgICAgaWYoY291bnRlciA9PSAwKSB7XG4gICAgICAgICAgICBhcmdzLnVuc2hpZnQobnVsbCk7XG4gICAgICAgICAgICBzZW5kRm9yU291bmRFeGVjdXRpb24oY2FsbGJhY2ssIGFyZ3MsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBpbm5lciA9IHN3YXJtLmdldElubmVyVmFsdWUoKTtcblxuICAgIGZ1bmN0aW9uIGRlZmF1bHRQcm9ncmVzc1JlcG9ydChlcnIsIHJlcyl7XG4gICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0ZXh0OlwiUGFyYWxsZWwgZXhlY3V0aW9uIHByb2dyZXNzIGV2ZW50XCIsXG4gICAgICAgICAgICBzd2FybTpzd2FybSxcbiAgICAgICAgICAgIGFyZ3M6YXJncyxcbiAgICAgICAgICAgIGN1cnJlbnRSZXN1bHQ6cmVzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWtGdW5jdGlvbihuYW1lKXtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKC4uLmFyZ3Mpe1xuICAgICAgICAgICAgdmFyIGYgPSBkZWZhdWx0UHJvZ3Jlc3NSZXBvcnQ7XG4gICAgICAgICAgICBpZihuYW1lICE9IFwicHJvZ3Jlc3NcIil7XG4gICAgICAgICAgICAgICAgZiA9IGlubmVyLm15RnVuY3Rpb25zW25hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGFyZ3MgPSAkJC5fX2ludGVybi5ta0FyZ3MoYXJncywgMCk7XG4gICAgICAgICAgICBzZW5kRm9yU291bmRFeGVjdXRpb24oZiwgYXJncywgZmFsc2UpO1xuICAgICAgICAgICAgcmV0dXJuIF9fcHJveHlPYmplY3Q7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIHRoaXMuZ2V0ID0gZnVuY3Rpb24odGFyZ2V0LCBwcm9wLCByZWNlaXZlcil7XG4gICAgICAgIGlmKGlubmVyLm15RnVuY3Rpb25zLmhhc093blByb3BlcnR5KHByb3ApIHx8IHByb3AgPT0gXCJwcm9ncmVzc1wiKXtcbiAgICAgICAgICAgIGluY0NvdW50ZXIoKTtcbiAgICAgICAgICAgIHJldHVybiBta0Z1bmN0aW9uKHByb3ApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzd2FybVtwcm9wXTtcbiAgICB9O1xuXG4gICAgdmFyIF9fcHJveHlPYmplY3Q7XG5cbiAgICB0aGlzLl9fc2V0UHJveHlPYmplY3QgPSBmdW5jdGlvbihwKXtcbiAgICAgICAgX19wcm94eU9iamVjdCA9IHA7XG4gICAgfVxufVxuXG5leHBvcnRzLmNyZWF0ZUpvaW5Qb2ludCA9IGZ1bmN0aW9uKHN3YXJtLCBjYWxsYmFjaywgYXJncyl7XG4gICAgdmFyIGpwID0gbmV3IFBhcmFsbGVsSm9pblBvaW50KHN3YXJtLCBjYWxsYmFjaywgYXJncyk7XG4gICAgdmFyIGlubmVyID0gc3dhcm0uZ2V0SW5uZXJWYWx1ZSgpO1xuICAgIHZhciBwID0gbmV3IFByb3h5KGlubmVyLCBqcCk7XG4gICAganAuX19zZXRQcm94eU9iamVjdChwKTtcbiAgICByZXR1cm4gcDtcbn07IiwiXG52YXIgam9pbkNvdW50ZXIgPSAwO1xuXG5mdW5jdGlvbiBTZXJpYWxKb2luUG9pbnQoc3dhcm0sIGNhbGxiYWNrLCBhcmdzKXtcblxuICAgIGpvaW5Db3VudGVyKys7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGNoYW5uZWxJZCA9IFwiU2VyaWFsSm9pblBvaW50XCIgKyBqb2luQ291bnRlcjtcblxuICAgIGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgJCQuZXJyb3JIYW5kbGVyLnN5bnRheEVycm9yKFwidW5rbm93blwiLCBzd2FybSwgXCJpbnZhbGlkIGZ1bmN0aW9uIGdpdmVuIHRvIHNlcmlhbCBpbiBzd2FybVwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBpbm5lciA9IHN3YXJtLmdldElubmVyVmFsdWUoKTtcblxuXG4gICAgZnVuY3Rpb24gZGVmYXVsdFByb2dyZXNzUmVwb3J0KGVyciwgcmVzKXtcbiAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cblxuICAgIHZhciBmdW5jdGlvbkNvdW50ZXIgICAgID0gMDtcbiAgICB2YXIgZXhlY3V0aW9uQ291bnRlciAgICA9IDA7XG5cbiAgICB2YXIgcGxhbm5lZEV4ZWN1dGlvbnMgICA9IFtdO1xuICAgIHZhciBwbGFubmVkQXJndW1lbnRzICAgID0ge307XG5cbiAgICBmdW5jdGlvbiBta0Z1bmN0aW9uKG5hbWUsIHBvcyl7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJDcmVhdGluZyBmdW5jdGlvbiBcIiwgbmFtZSwgcG9zKTtcbiAgICAgICAgcGxhbm5lZEFyZ3VtZW50c1twb3NdID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIGZ1bmN0aW9uIHRyaWdnZXROZXh0U3RlcCgpe1xuICAgICAgICAgICAgaWYocGxhbm5lZEV4ZWN1dGlvbnMubGVuZ3RoID09IGV4ZWN1dGlvbkNvdW50ZXIgfHwgcGxhbm5lZEFyZ3VtZW50c1tleGVjdXRpb25Db3VudGVyXSApICB7XG4gICAgICAgICAgICAgICAgJCQuUFNLX1B1YlN1Yi5wdWJsaXNoKGNoYW5uZWxJZCwgc2VsZik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZiA9IGZ1bmN0aW9uICguLi5hcmdzKXtcbiAgICAgICAgICAgIGlmKGV4ZWN1dGlvbkNvdW50ZXIgIT0gcG9zKSB7XG4gICAgICAgICAgICAgICAgcGxhbm5lZEFyZ3VtZW50c1twb3NdID0gYXJncztcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiRGVsYXlpbmcgZnVuY3Rpb246XCIsIGV4ZWN1dGlvbkNvdW50ZXIsIHBvcywgcGxhbm5lZEFyZ3VtZW50cywgYXJndW1lbnRzLCBmdW5jdGlvbkNvdW50ZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBfX3Byb3h5O1xuICAgICAgICAgICAgfSBlbHNle1xuICAgICAgICAgICAgICAgIGlmKHBsYW5uZWRBcmd1bWVudHNbcG9zXSl7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJFeGVjdXRpbmcgIGZ1bmN0aW9uOlwiLCBleGVjdXRpb25Db3VudGVyLCBwb3MsIHBsYW5uZWRBcmd1bWVudHMsIGFyZ3VtZW50cywgZnVuY3Rpb25Db3VudGVyKTtcblx0XHRcdFx0XHRhcmdzID0gcGxhbm5lZEFyZ3VtZW50c1twb3NdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBsYW5uZWRBcmd1bWVudHNbcG9zXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIHRyaWdnZXROZXh0U3RlcCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX19wcm94eTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmID0gZGVmYXVsdFByb2dyZXNzUmVwb3J0O1xuICAgICAgICAgICAgaWYobmFtZSAhPSBcInByb2dyZXNzXCIpe1xuICAgICAgICAgICAgICAgIGYgPSBpbm5lci5teUZ1bmN0aW9uc1tuYW1lXTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgZi5hcHBseShzZWxmLGFyZ3MpO1xuICAgICAgICAgICAgfSBjYXRjaChlcnIpe1xuICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkoc3dhcm0sYXJncyk7IC8vZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgJCQuUFNLX1B1YlN1Yi51bnN1YnNjcmliZShjaGFubmVsSWQscnVuTmV4dEZ1bmN0aW9uKTtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vdGVybWluYXRlIGV4ZWN1dGlvbiB3aXRoIGFuIGVycm9yLi4uIVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXhlY3V0aW9uQ291bnRlcisrO1xuXG4gICAgICAgICAgICB0cmlnZ2V0TmV4dFN0ZXAoKTtcblxuICAgICAgICAgICAgcmV0dXJuIF9fcHJveHk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcGxhbm5lZEV4ZWN1dGlvbnMucHVzaChmKTtcbiAgICAgICAgZnVuY3Rpb25Db3VudGVyKys7XG4gICAgICAgIHJldHVybiBmO1xuICAgIH1cblxuICAgICB2YXIgZmluaXNoZWQgPSBmYWxzZTtcblxuICAgIGZ1bmN0aW9uIHJ1bk5leHRGdW5jdGlvbigpe1xuICAgICAgICBpZihleGVjdXRpb25Db3VudGVyID09IHBsYW5uZWRFeGVjdXRpb25zLmxlbmd0aCApe1xuICAgICAgICAgICAgaWYoIWZpbmlzaGVkKXtcbiAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQobnVsbCk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkoc3dhcm0sYXJncyk7XG4gICAgICAgICAgICAgICAgZmluaXNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICQkLlBTS19QdWJTdWIudW5zdWJzY3JpYmUoY2hhbm5lbElkLHJ1bk5leHRGdW5jdGlvbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic2VyaWFsIGNvbnN0cnVjdCBpcyB1c2luZyBmdW5jdGlvbnMgdGhhdCBhcmUgY2FsbGVkIG11bHRpcGxlIHRpbWVzLi4uXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGxhbm5lZEV4ZWN1dGlvbnNbZXhlY3V0aW9uQ291bnRlcl0oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgICQkLlBTS19QdWJTdWIuc3Vic2NyaWJlKGNoYW5uZWxJZCxydW5OZXh0RnVuY3Rpb24pOyAvLyBmb3JjZSBpdCB0byBiZSBcInNvdW5kXCJcblxuXG4gICAgdGhpcy5nZXQgPSBmdW5jdGlvbih0YXJnZXQsIHByb3AsIHJlY2VpdmVyKXtcbiAgICAgICAgaWYocHJvcCA9PSBcInByb2dyZXNzXCIgfHwgaW5uZXIubXlGdW5jdGlvbnMuaGFzT3duUHJvcGVydHkocHJvcCkpe1xuICAgICAgICAgICAgcmV0dXJuIG1rRnVuY3Rpb24ocHJvcCwgZnVuY3Rpb25Db3VudGVyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3dhcm1bcHJvcF07XG4gICAgfVxuXG4gICAgdmFyIF9fcHJveHk7XG4gICAgdGhpcy5zZXRQcm94eU9iamVjdCA9IGZ1bmN0aW9uKHApe1xuICAgICAgICBfX3Byb3h5ID0gcDtcbiAgICB9XG59XG5cbmV4cG9ydHMuY3JlYXRlU2VyaWFsSm9pblBvaW50ID0gZnVuY3Rpb24oc3dhcm0sIGNhbGxiYWNrLCBhcmdzKXtcbiAgICB2YXIganAgPSBuZXcgU2VyaWFsSm9pblBvaW50KHN3YXJtLCBjYWxsYmFjaywgYXJncyk7XG4gICAgdmFyIGlubmVyID0gc3dhcm0uZ2V0SW5uZXJWYWx1ZSgpO1xuICAgIHZhciBwID0gbmV3IFByb3h5KGlubmVyLCBqcCk7XG4gICAganAuc2V0UHJveHlPYmplY3QocCk7XG4gICAgcmV0dXJuIHA7XG59IiwiY29uc3QgT3dNID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIikuT3dNO1xuXG52YXIgc3dhcm1EZXNjcmlwdGlvbnNSZWdpc3RyeSA9IHt9O1xuXG5cbiQkLnJlZ2lzdGVyU3dhcm1EZXNjcmlwdGlvbiA9ICBmdW5jdGlvbihsaWJyYXJ5TmFtZSwgc2hvcnROYW1lLCBzd2FybVR5cGVOYW1lLCBkZXNjcmlwdGlvbil7XG4gICAgaWYoISQkLmxpYnJhcmllc1tsaWJyYXJ5TmFtZV0pe1xuICAgICAgICAkJC5saWJyYXJpZXNbbGlicmFyeU5hbWVdID0ge307XG4gICAgfVxuXG4gICAgaWYoISQkLl9fZ2xvYmFsLnJlcXVpcmVMaWJyYXJpZXNOYW1lc1tsaWJyYXJ5TmFtZV0pe1xuICAgICAgICAkJC5fX2dsb2JhbC5yZXF1aXJlTGlicmFyaWVzTmFtZXNbbGlicmFyeU5hbWVdID0ge307XG4gICAgfVxuXG4gICAgJCQubGlicmFyaWVzW2xpYnJhcnlOYW1lXVtzaG9ydE5hbWVdID0gZGVzY3JpcHRpb247XG4gICAgLy9jb25zb2xlLmxvZyhcIlJlZ2lzdGVyaW5nIFwiLCBsaWJyYXJ5TmFtZSxzaG9ydE5hbWUsICQkLl9fZ2xvYmFsLmN1cnJlbnRMaWJyYXJ5TmFtZSk7XG4gICAgaWYoJCQuX19nbG9iYWwuY3VycmVudExpYnJhcnlOYW1lKXtcbiAgICAgICAgJCQuX19nbG9iYWwucmVxdWlyZUxpYnJhcmllc05hbWVzWyQkLl9fZ2xvYmFsLmN1cnJlbnRMaWJyYXJ5TmFtZV1bc2hvcnROYW1lXSA9IGxpYnJhcnlOYW1lICsgXCIuXCIgKyBzaG9ydE5hbWU7XG4gICAgfVxuXG4gICAgJCQuX19nbG9iYWwucmVxdWlyZUxpYnJhcmllc05hbWVzW2xpYnJhcnlOYW1lXVtzaG9ydE5hbWVdID0gc3dhcm1UeXBlTmFtZTtcblxuICAgIGlmKHR5cGVvZiBkZXNjcmlwdGlvbiA9PSBcInN0cmluZ1wiKXtcbiAgICAgICAgZGVzY3JpcHRpb24gPSBzd2FybURlc2NyaXB0aW9uc1JlZ2lzdHJ5W2Rlc2NyaXB0aW9uXTtcbiAgICB9XG4gICAgc3dhcm1EZXNjcmlwdGlvbnNSZWdpc3RyeVtzd2FybVR5cGVOYW1lXSA9IGRlc2NyaXB0aW9uO1xufVxuXG5cbnZhciBjdXJyZW50TGlicmFyeUNvdW50ZXIgPSAwO1xuJCQubGlicmFyeSA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICBjdXJyZW50TGlicmFyeUNvdW50ZXIrKztcbiAgICB2YXIgcHJldmlvdXNDdXJyZW50TGlicmFyeSA9ICQkLl9fZ2xvYmFsLmN1cnJlbnRMaWJyYXJ5TmFtZTtcbiAgICB2YXIgbGlicmFyeU5hbWUgPSBcIl9fX3ByaXZhdGVza3lfbGlicmFyeVwiK2N1cnJlbnRMaWJyYXJ5Q291bnRlcjtcbiAgICB2YXIgcmV0ID0gJCQuX19nbG9iYWwucmVxdWlyZUxpYnJhcmllc05hbWVzW2xpYnJhcnlOYW1lXSA9IHt9O1xuICAgICQkLl9fZ2xvYmFsLmN1cnJlbnRMaWJyYXJ5TmFtZSA9IGxpYnJhcnlOYW1lO1xuICAgIGNhbGxiYWNrKCk7XG4gICAgJCQuX19nbG9iYWwuY3VycmVudExpYnJhcnlOYW1lID0gcHJldmlvdXNDdXJyZW50TGlicmFyeTtcbiAgICByZXQuX19hdXRvZ2VuZXJhdGVkX3ByaXZhdGVza3lfbGlicmFyeU5hbWUgPSBsaWJyYXJ5TmFtZTtcbiAgICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBTd2FybVNwYWNlKHN3YXJtVHlwZSwgdXRpbHMpIHtcblxuICAgIHZhciBiZWVzSGVhbGVyID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIikuYmVlc0hlYWxlcjtcblxuICAgIGZ1bmN0aW9uIGdldEZ1bGxOYW1lKHNob3J0TmFtZSl7XG4gICAgICAgIHZhciBmdWxsTmFtZTtcbiAgICAgICAgaWYoc2hvcnROYW1lICYmIHNob3J0TmFtZS5pbmNsdWRlcyhcIi5cIikpIHtcbiAgICAgICAgICAgIGZ1bGxOYW1lID0gc2hvcnROYW1lO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnVsbE5hbWUgPSAkJC5saWJyYXJ5UHJlZml4ICsgXCIuXCIgKyBzaG9ydE5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZ1bGxOYW1lO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIFZhckRlc2NyaXB0aW9uKGRlc2Mpe1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaW5pdDpmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVzdG9yZTpmdW5jdGlvbihqc29uU3RyaW5nKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShqc29uU3RyaW5nKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0b0pzb25TdHJpbmc6ZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gU3dhcm1EZXNjcmlwdGlvbihzd2FybVR5cGVOYW1lLCBkZXNjcmlwdGlvbil7XG5cbiAgICAgICAgc3dhcm1UeXBlTmFtZSA9IGdldEZ1bGxOYW1lKHN3YXJtVHlwZU5hbWUpO1xuXG4gICAgICAgIHZhciBsb2NhbElkID0gMDsgIC8vIHVuaXF1ZSBmb3IgZWFjaCBzd2FybVxuXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZVZhcnMoZGVzY3Ipe1xuICAgICAgICAgICAgdmFyIG1lbWJlcnMgPSB7fTtcbiAgICAgICAgICAgIGZvcih2YXIgdiBpbiBkZXNjcil7XG4gICAgICAgICAgICAgICAgbWVtYmVyc1t2XSA9IG5ldyBWYXJEZXNjcmlwdGlvbihkZXNjclt2XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbWVtYmVycztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZU1lbWJlcnMoZGVzY3Ipe1xuICAgICAgICAgICAgdmFyIG1lbWJlcnMgPSB7fTtcbiAgICAgICAgICAgIGZvcih2YXIgdiBpbiBkZXNjcmlwdGlvbil7XG5cbiAgICAgICAgICAgICAgICBpZih2ICE9IFwicHVibGljXCIgJiYgdiAhPSBcInByaXZhdGVcIil7XG4gICAgICAgICAgICAgICAgICAgIG1lbWJlcnNbdl0gPSBkZXNjcmlwdGlvblt2XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbWVtYmVycztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwdWJsaWNWYXJzID0gY3JlYXRlVmFycyhkZXNjcmlwdGlvbi5wdWJsaWMpO1xuICAgICAgICB2YXIgcHJpdmF0ZVZhcnMgPSBjcmVhdGVWYXJzKGRlc2NyaXB0aW9uLnByaXZhdGUpO1xuICAgICAgICB2YXIgbXlGdW5jdGlvbnMgPSBjcmVhdGVNZW1iZXJzKGRlc2NyaXB0aW9uKTtcblxuICAgICAgICBmdW5jdGlvbiBjcmVhdGVQaGFzZSh0aGlzSW5zdGFuY2UsIGZ1bmMsIHBoYXNlTmFtZSl7XG4gICAgICAgICAgICB2YXIga2V5QmVmb3JlID0gYCR7c3dhcm1UeXBlTmFtZX0vJHtwaGFzZU5hbWV9LyR7JCQuQ09OU1RBTlRTLkJFRk9SRV9JTlRFUkNFUFRPUn1gO1xuICAgICAgICAgICAgdmFyIGtleUFmdGVyID0gYCR7c3dhcm1UeXBlTmFtZX0vJHtwaGFzZU5hbWV9LyR7JCQuQ09OU1RBTlRTLkFGVEVSX0lOVEVSQ0VQVE9SfWA7XG5cbiAgICAgICAgICAgIHZhciBwaGFzZSA9IGZ1bmN0aW9uKC4uLmFyZ3Mpe1xuICAgICAgICAgICAgICAgIHZhciByZXQ7XG4gICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgICAkJC5QU0tfUHViU3ViLmJsb2NrQ2FsbEJhY2tzKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNJbnN0YW5jZS5zZXRNZXRhZGF0YSgncGhhc2VOYW1lJywgcGhhc2VOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgJCQuaW50ZXJjZXB0b3IuY2FsbEludGVyY2VwdG9ycyhrZXlCZWZvcmUsIHRoaXNJbnN0YW5jZSwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIHJldCA9IGZ1bmMuYXBwbHkodGhpc0luc3RhbmNlLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgJCQuaW50ZXJjZXB0b3IuY2FsbEludGVyY2VwdG9ycyhrZXlBZnRlciwgdGhpc0luc3RhbmNlLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgJCQuUFNLX1B1YlN1Yi5yZWxlYXNlQ2FsbEJhY2tzKCk7XG4gICAgICAgICAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICAgICAgICAgICQkLlBTS19QdWJTdWIucmVsZWFzZUNhbGxCYWNrcygpO1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL2R5bmFtaWMgbmFtZWQgZnVuYyBpbiBvcmRlciB0byBpbXByb3ZlIGNhbGxzdGFja1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHBoYXNlLCBcIm5hbWVcIiwge2dldDogZnVuY3Rpb24oKXtyZXR1cm4gc3dhcm1UeXBlTmFtZStcIi5cIitmdW5jLm5hbWV9fSk7XG4gICAgICAgICAgICByZXR1cm4gcGhhc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmluaXRpYWxpc2UgPSBmdW5jdGlvbihzZXJpYWxpc2VkVmFsdWVzKXtcblxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBPd00oe1xuICAgICAgICAgICAgICAgIHB1YmxpY1ZhcnM6e1xuXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwcml2YXRlVmFyczp7XG5cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHByb3RlY3RlZFZhcnM6e1xuXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBteUZ1bmN0aW9uczp7XG5cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHV0aWxpdHlGdW5jdGlvbnM6e1xuXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtZXRhOntcbiAgICAgICAgICAgICAgICAgICAgc3dhcm1UeXBlTmFtZTpzd2FybVR5cGVOYW1lLFxuICAgICAgICAgICAgICAgICAgICBzd2FybURlc2NyaXB0aW9uOmRlc2NyaXB0aW9uXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgZm9yKHZhciB2IGluIHB1YmxpY1ZhcnMpe1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdWJsaWNWYXJzW3ZdID0gcHVibGljVmFyc1t2XS5pbml0KCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmb3IodmFyIHYgaW4gcHJpdmF0ZVZhcnMpe1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wcml2YXRlVmFyc1t2XSA9IHByaXZhdGVWYXJzW3ZdLmluaXQoKTtcbiAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgaWYoc2VyaWFsaXNlZFZhbHVlcyl7XG4gICAgICAgICAgICAgICAgYmVlc0hlYWxlci5qc29uVG9OYXRpdmUoc2VyaWFsaXNlZFZhbHVlcywgcmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5pbml0aWFsaXNlRnVuY3Rpb25zID0gZnVuY3Rpb24odmFsdWVPYmplY3QsIHRoaXNPYmplY3Qpe1xuXG4gICAgICAgICAgICBmb3IodmFyIHYgaW4gbXlGdW5jdGlvbnMpe1xuICAgICAgICAgICAgICAgIHZhbHVlT2JqZWN0Lm15RnVuY3Rpb25zW3ZdID0gY3JlYXRlUGhhc2UodGhpc09iamVjdCwgbXlGdW5jdGlvbnNbdl0sIHYpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgbG9jYWxJZCsrO1xuICAgICAgICAgICAgdmFsdWVPYmplY3QudXRpbGl0eUZ1bmN0aW9ucyA9IHV0aWxzLmNyZWF0ZUZvck9iamVjdCh2YWx1ZU9iamVjdCwgdGhpc09iamVjdCwgbG9jYWxJZCk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZ2V0ID0gZnVuY3Rpb24odGFyZ2V0LCBwcm9wZXJ0eSwgcmVjZWl2ZXIpe1xuXG5cbiAgICAgICAgICAgIGlmKHB1YmxpY1ZhcnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXQucHVibGljVmFyc1twcm9wZXJ0eV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHByaXZhdGVWYXJzLmhhc093blByb3BlcnR5KHByb3BlcnR5KSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0LnByaXZhdGVWYXJzW3Byb3BlcnR5XTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYodGFyZ2V0LnV0aWxpdHlGdW5jdGlvbnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKVxuICAgICAgICAgICAge1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldC51dGlsaXR5RnVuY3Rpb25zW3Byb3BlcnR5XTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICBpZihteUZ1bmN0aW9ucy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldC5teUZ1bmN0aW9uc1twcm9wZXJ0eV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHRhcmdldC5wcm90ZWN0ZWRWYXJzLmhhc093blByb3BlcnR5KHByb3BlcnR5KSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0LnByb3RlY3RlZFZhcnNbcHJvcGVydHldO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZih0eXBlb2YgcHJvcGVydHkgIT0gXCJzeW1ib2xcIikge1xuICAgICAgICAgICAgICAgICQkLmVycm9ySGFuZGxlci5zeW50YXhFcnJvcihwcm9wZXJ0eSwgdGFyZ2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNldCA9IGZ1bmN0aW9uKHRhcmdldCwgcHJvcGVydHksIHZhbHVlLCByZWNlaXZlcil7XG5cbiAgICAgICAgICAgIGlmKHRhcmdldC51dGlsaXR5RnVuY3Rpb25zLmhhc093blByb3BlcnR5KHByb3BlcnR5KSB8fCB0YXJnZXQubXlGdW5jdGlvbnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgJCQuZXJyb3JIYW5kbGVyLnN5bnRheEVycm9yKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUcnlpbmcgdG8gb3ZlcndyaXRlIGltbXV0YWJsZSBtZW1iZXJcIiArIHByb3BlcnR5KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYocHJpdmF0ZVZhcnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRhcmdldC5wcml2YXRlVmFyc1twcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgaWYocHVibGljVmFycy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LnB1YmxpY1ZhcnNbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRhcmdldC5wcm90ZWN0ZWRWYXJzW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmFwcGx5ID0gZnVuY3Rpb24odGFyZ2V0LCB0aGlzQXJnLCBhcmd1bWVudHNMaXN0KXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUHJveHkgYXBwbHlcIik7XG4gICAgICAgICAgICAvL3ZhciBmdW5jID0gdGFyZ2V0W11cbiAgICAgICAgICAgIC8vc3dhcm1HbG9iYWxzLmV4ZWN1dGlvblByb3ZpZGVyLmV4ZWN1dGUobnVsbCwgdGhpc0FyZywgZnVuYywgYXJndW1lbnRzTGlzdClcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB0aGlzLmlzRXh0ZW5zaWJsZSA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuaGFzID0gZnVuY3Rpb24odGFyZ2V0LCBwcm9wKSB7XG4gICAgICAgICAgICBpZih0YXJnZXQucHVibGljVmFyc1twcm9wXSB8fCB0YXJnZXQucHJvdGVjdGVkVmFyc1twcm9wXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub3duS2V5cyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3Qub3duS2V5cyh0YXJnZXQucHVibGljVmFycyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHNlcmlhbGlzZWRWYWx1ZXMpe1xuICAgICAgICAgICAgdmFyIHZhbHVlT2JqZWN0ID0gc2VsZi5pbml0aWFsaXNlKHNlcmlhbGlzZWRWYWx1ZXMpO1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBQcm94eSh2YWx1ZU9iamVjdCxzZWxmKTtcbiAgICAgICAgICAgIHNlbGYuaW5pdGlhbGlzZUZ1bmN0aW9ucyh2YWx1ZU9iamVjdCxyZXN1bHQpO1xuXHRcdFx0aWYoIXNlcmlhbGlzZWRWYWx1ZXMpe1xuXHRcdFx0XHRpZighdmFsdWVPYmplY3QuZ2V0TWV0YShcInN3YXJtSWRcIikpe1xuXHRcdFx0XHRcdHZhbHVlT2JqZWN0LnNldE1ldGEoXCJzd2FybUlkXCIsICQkLnVpZEdlbmVyYXRvci5zYWZlX3V1aWQoKSk7ICAvL2RvIG5vdCBvdmVyd3JpdGUhISFcblx0XHRcdFx0fVxuXHRcdFx0XHR2YWx1ZU9iamVjdC51dGlsaXR5RnVuY3Rpb25zLm5vdGlmeSgpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbiAgICB0aGlzLmRlc2NyaWJlID0gZnVuY3Rpb24gZGVzY3JpYmVTd2FybShzd2FybVR5cGVOYW1lLCBkZXNjcmlwdGlvbil7XG4gICAgICAgIHN3YXJtVHlwZU5hbWUgPSBnZXRGdWxsTmFtZShzd2FybVR5cGVOYW1lKTtcblxuICAgICAgICB2YXIgcG9pbnRQb3MgPSBzd2FybVR5cGVOYW1lLmxhc3RJbmRleE9mKCcuJyk7XG4gICAgICAgIHZhciBzaG9ydE5hbWUgPSBzd2FybVR5cGVOYW1lLnN1YnN0ciggcG9pbnRQb3MrIDEpO1xuICAgICAgICB2YXIgbGlicmFyeU5hbWUgPSBzd2FybVR5cGVOYW1lLnN1YnN0cigwLCBwb2ludFBvcyk7XG4gICAgICAgIGlmKCFsaWJyYXJ5TmFtZSl7XG4gICAgICAgICAgICBsaWJyYXJ5TmFtZSA9IFwiZ2xvYmFsXCI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSBuZXcgU3dhcm1EZXNjcmlwdGlvbihzd2FybVR5cGVOYW1lLCBkZXNjcmlwdGlvbik7XG4gICAgICAgIGlmKHN3YXJtRGVzY3JpcHRpb25zUmVnaXN0cnlbc3dhcm1UeXBlTmFtZV0gIT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICQkLmVycm9ySGFuZGxlci53YXJuaW5nKFwiRHVwbGljYXRlIHN3YXJtIGRlc2NyaXB0aW9uIFwiKyBzd2FybVR5cGVOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vc3dhcm1EZXNjcmlwdGlvbnNSZWdpc3RyeVtzd2FybVR5cGVOYW1lXSA9IGRlc2NyaXB0aW9uO1xuXHRcdCQkLnJlZ2lzdGVyU3dhcm1EZXNjcmlwdGlvbihsaWJyYXJ5TmFtZSwgc2hvcnROYW1lLCBzd2FybVR5cGVOYW1lLCBkZXNjcmlwdGlvbik7XG5cbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0aW9uO1xuICAgIH1cblxuICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgJCQuZXJyb3IoXCJjcmVhdGUgZnVuY3Rpb24gaXMgb2Jzb2xldGUuIHVzZSBkZXNjcmliZSFcIik7XG4gICAgfVxuICAgIC8qIC8vIGNvbmZ1c2luZyB2YXJpYW50XG4gICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGVTd2FybShzd2FybVR5cGVOYW1lLCBkZXNjcmlwdGlvbiwgaW5pdGlhbFZhbHVlcyl7XG4gICAgICAgIHN3YXJtVHlwZU5hbWUgPSBnZXRGdWxsTmFtZShzd2FybVR5cGVOYW1lKTtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgaWYodW5kZWZpbmVkID09IGRlc2NyaXB0aW9uKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3dhcm1EZXNjcmlwdGlvbnNSZWdpc3RyeVtzd2FybVR5cGVOYW1lXShpbml0aWFsVmFsdWVzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVzY3JpYmUoc3dhcm1UeXBlTmFtZSwgZGVzY3JpcHRpb24pKGluaXRpYWxWYWx1ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoKGVycil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNyZWF0ZVN3YXJtIGVycm9yXCIsIGVycik7XG4gICAgICAgICAgICAkJC5lcnJvckhhbmRsZXIuZXJyb3IoZXJyLCBhcmd1bWVudHMsIFwiV3JvbmcgbmFtZSBvciBkZXNjcmlwdGlvbnNcIik7XG4gICAgICAgIH1cbiAgICB9Ki9cblxuICAgIHRoaXMuY29udGludWUgPSBmdW5jdGlvbihzd2FybVR5cGVOYW1lLCBpbml0aWFsVmFsdWVzKXtcbiAgICAgICAgc3dhcm1UeXBlTmFtZSA9IGdldEZ1bGxOYW1lKHN3YXJtVHlwZU5hbWUpO1xuICAgICAgICB2YXIgZGVzYyA9IHN3YXJtRGVzY3JpcHRpb25zUmVnaXN0cnlbc3dhcm1UeXBlTmFtZV07XG5cbiAgICAgICAgaWYoZGVzYyl7XG4gICAgICAgICAgICByZXR1cm4gZGVzYyhpbml0aWFsVmFsdWVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQkLmVycm9ySGFuZGxlci5zeW50YXhFcnJvcihzd2FybVR5cGVOYW1lLGluaXRpYWxWYWx1ZXMsXG4gICAgICAgICAgICAgICAgXCJGYWlsZWQgdG8gcmVzdGFydCBhIHN3YXJtIHdpdGggdHlwZSBcIiArIHN3YXJtVHlwZU5hbWUgKyBcIlxcbiBNYXliZSBkaWZmZXJlbnQgc3dhcm0gc3BhY2UgKHVzZWQgZmxvdyBpbnN0ZWFkIG9mIHN3YXJtIT8pXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zdGFydCA9IGZ1bmN0aW9uKHN3YXJtVHlwZU5hbWUsIGN0b3IsIC4uLnBhcmFtcyl7XG4gICAgICAgIHN3YXJtVHlwZU5hbWUgPSBnZXRGdWxsTmFtZShzd2FybVR5cGVOYW1lKTtcbiAgICAgICAgdmFyIGRlc2MgPSBzd2FybURlc2NyaXB0aW9uc1JlZ2lzdHJ5W3N3YXJtVHlwZU5hbWVdO1xuICAgICAgICBpZighZGVzYyl7XG4gICAgICAgICAgICAkJC5lcnJvckhhbmRsZXIuc3ludGF4RXJyb3IobnVsbCwgc3dhcm1UeXBlTmFtZSk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVzID0gZGVzYygpO1xuICAgICAgICByZXMuc2V0TWV0YWRhdGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIsICQkLnNlY3VyaXR5Q29udGV4dCk7XG5cbiAgICAgICAgaWYoY3Rvcil7XG4gICAgICAgICAgICByZXNbY3Rvcl0uYXBwbHkocmVzLCBwYXJhbXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG59XG5cbmV4cG9ydHMuY3JlYXRlU3dhcm1FbmdpbmUgPSBmdW5jdGlvbihzd2FybVR5cGUsIHV0aWxzKXtcbiAgICBpZih0eXBlb2YgdXRpbHMgPT0gXCJ1bmRlZmluZWRcIil7XG4gICAgICAgIHV0aWxzID0gcmVxdWlyZShcIi4vY2hvcmVvZ3JhcGhpZXMvdXRpbGl0eUZ1bmN0aW9ucy9jYWxsZmxvd1wiKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBTd2FybVNwYWNlKHN3YXJtVHlwZSwgdXRpbHMpO1xufTtcbiIsIiQkLnJlZ2lzdGVyR2xvYmFsU3ltYm9sID0gZnVuY3Rpb24obmV3U3ltYm9sLCB2YWx1ZSl7XG4gICAgaWYodHlwZW9mICQkW25ld1N5bWJvbF0gPT0gXCJ1bmRlZmluZWRcIil7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkJCwgbmV3U3ltYm9sLCB7XG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICB3cml0YWJsZTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgfSBlbHNle1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiUmVmdXNpbmcgdG8gb3ZlcndyaXRlICQkLlwiICsgbmV3U3ltYm9sKTtcbiAgICB9XG59XG5cbiQkLnJlZ2lzdGVyR2xvYmFsU3ltYm9sKFwiYXV0b1Rocm93XCIsIGZ1bmN0aW9uKGVycil7XG4gICAgaWYoIWVycil7XG4gICAgICAgIHRocm93IGVycjtcbiAgICB9XG59KVxuXG4kJC5yZWdpc3Rlckdsb2JhbFN5bWJvbChcImlnbm9yZUVycm9yXCIsIGZ1bmN0aW9uKGVycil7XG4gICAgaWYoZXJyKXtcbiAgICAgICAgJCQuZXJyb3IoZXJyKTtcbiAgICB9XG59KVxuXG4kJC5yZWdpc3Rlckdsb2JhbFN5bWJvbChcImV4Y2VwdGlvblwiLCBmdW5jdGlvbihtZXNzYWdlLCB0eXBlKXtcbiAgICBpZighZXJyKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgIH1cbn0pXG5cbiQkLnJlZ2lzdGVyR2xvYmFsU3ltYm9sKFwiZXJyXCIsIGZ1bmN0aW9uKC4uLmFyZ3Mpe1xuICAgIGNvbnNvbGUuZXJyb3IoLi4uYXJncyk7XG59KVxuXG4kJC5yZWdpc3Rlckdsb2JhbFN5bWJvbChcIndhcm5cIiwgZnVuY3Rpb24oLi4uYXJncyl7XG4gICAgY29uc29sZS53YXJuKC4uLmFyZ3MpO1xufSlcblxuLyogYSBmZWF0dXJlIGlzIHBsYW5uZWQgYnV0IG5vdCBpbXBsZW1lbnRlZCAoZHVyaW5nIGRldmVsb3BtZW50KSBidXRcbmFsc28gaXQgY291bGQgcmVtYWluIGluIHByb2R1Y3Rpb24gYW5kIHNob3VsZCBiZSBmbGFnZ2VkIGFzYXAqL1xuJCQucmVnaXN0ZXJHbG9iYWxTeW1ib2woXCJpbmNvbXBsZXRlXCIsIGZ1bmN0aW9uKC4uLmFyZ3Mpe1xuICAgIGNvbnNvbGUud2FybiguLi5hcmdzKTtcbn0pXG5cbi8qIHVzZWQgZHVyaW5nIGRldmVsb3BtZW50IGFuZCB3aGVuIHRyeWluZyB0byBkaXNjb3ZlciBlbHVzaXZlIGVycm9ycyovXG4kJC5yZWdpc3Rlckdsb2JhbFN5bWJvbChcImFzc2VydFwiLCBmdW5jdGlvbih2YWx1ZSwgZXhwbGFpbldoeSl7XG4gICAgaWYoIXZhbHVlKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQXNzZXJ0IGZhbHNlIFwiICsgZXhwbGFpbldoeSk7XG4gICAgfVxufSlcblxuLyogZW5hYmxlL2Rpc2FiYWxlIGZsYWdzIHRoYXQgY29udHJvbCBwc2sgYmVoYXZpb3VyKi9cbiQkLnJlZ2lzdGVyR2xvYmFsU3ltYm9sKFwiZmxhZ3NcIiwgZnVuY3Rpb24oZmxhZ05hbWUsIHZhbHVlKXtcbiAgICAkJC5pbmNvbXBsZXRlKFwiZmxhZ3MgaGFuZGxpbmcgbm90IGltcGxlbWVudGVkXCIpO1xufSlcblxuJCQucmVnaXN0ZXJHbG9iYWxTeW1ib2woXCJvYnNvbGV0ZVwiLCBmdW5jdGlvbiguLi5hcmdzKXtcbiAgICBjb25zb2xlLmxvZyguLi5hcmdzKTtcbn0pXG5cbiQkLnJlZ2lzdGVyR2xvYmFsU3ltYm9sKFwibG9nXCIsIGZ1bmN0aW9uKC4uLmFyZ3Mpe1xuICAgIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xufSlcblxuJCQucmVnaXN0ZXJHbG9iYWxTeW1ib2woXCJzeW50YXhFcnJvclwiLCBmdW5jdGlvbiguLi5hcmdzKXtcbiAgICBjb25zb2xlLmxvZyguLi5hcmdzKTtcbn0pXG5cbi8qIGxvZyB1bmtub3duIGV4Y2VwdGlvbnMqL1xuJCQucmVnaXN0ZXJHbG9iYWxTeW1ib2woXCJ1bmtub3duRXhjZXB0aW9uXCIsIGZ1bmN0aW9uKC4uLmFyZ3Mpe1xuICAgIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xufSlcblxuLyogUHJpdmF0ZVNreSBldmVudCwgdXNlZCBieSBtb25pdG9yaW5nIGFuZCBzdGF0aXN0aWNzKi9cbiQkLnJlZ2lzdGVyR2xvYmFsU3ltYm9sKFwiZXZlbnRcIiwgZnVuY3Rpb24oLi4uYXJncyl7XG4gICAgY29uc29sZS5sb2coLi4uYXJncyk7XG59KVxuXG4vKiBsb2cgdGhyb3R0bGluZyBldmVudCAvLyBpdCBpcyBqdXN0IGFuIGV2ZW50PyovXG4kJC5yZWdpc3Rlckdsb2JhbFN5bWJvbChcInRocm90dGxpbmdFdmVudFwiLCBmdW5jdGlvbiguLi5hcmdzKXtcbiAgICBjb25zb2xlLmxvZyguLi5hcmdzKTtcbn0pXG5cbiIsIlxubW9kdWxlLmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uKHNmLCBsb2dnZXIpe1xuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIGhhbmRsZXIgZm9yIGZhaWxlZCBhc3NlcnRzLiBUaGUgaGFuZGxlciBpcyBkb2luZyBsb2dnaW5nIGFuZCBpcyB0aHJvd2luZyBhbiBlcnJvci5cbiAgICAgKiBAcGFyYW0gZXhwbGFuYXRpb24ge1N0cmluZ30gLSBmYWlsaW5nIHJlYXNvbiBtZXNzYWdlLlxuICAgICAqL1xuICAgIHNmLmV4Y2VwdGlvbnMucmVnaXN0ZXIoJ2Fzc2VydEZhaWwnLCBmdW5jdGlvbihleHBsYW5hdGlvbil7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBcIkFzc2VydCBvciBpbnZhcmlhbnQgaGFzIGZhaWxlZCBcIiArIChleHBsYW5hdGlvbiA/IGV4cGxhbmF0aW9uIDogXCJcIik7XG4gICAgICAgIGNvbnN0IGVyciA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgbG9nZ2VyLnJlY29yZEFzc2VydCgnW0ZhaWxdICcgKyBtZXNzYWdlLCBlcnIsIHRydWUpO1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmluZyBhc3NlcnQgZm9yIGVxdWFsaXR5LiBJZiBjaGVjayBmYWlscywgdGhlIGFzc2VydEZhaWwgaXMgaW52b2tlZC5cbiAgICAgKiBAcGFyYW0gdjEge1N0cmluZ3xOdW1iZXJ8T2JqZWN0fSAtIGZpcnN0IHZhbHVlXG4gICAgICogQHBhcmFtIHYxIHtTdHJpbmd8TnVtYmVyfE9iamVjdH0gLSBzZWNvbmQgdmFsdWVcbiAgICAgKiBAcGFyYW0gZXhwbGFuYXRpb24ge1N0cmluZ30gLSBmYWlsaW5nIHJlYXNvbiBtZXNzYWdlIGluIGNhc2UgdGhlIGFzc2VydCBmYWlscy5cbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWRkQ2hlY2soJ2VxdWFsJywgZnVuY3Rpb24odjEgLCB2MiwgZXhwbGFuYXRpb24pe1xuICAgICAgICBpZih2MSAhPT0gdjIpe1xuICAgICAgICAgICAgaWYoIWV4cGxhbmF0aW9uKXtcbiAgICAgICAgICAgICAgICBleHBsYW5hdGlvbiA9ICBcIkFzc2VydGlvbiBmYWlsZWQ6IFtcIiArIHYxICsgXCIgIT09IFwiICsgdjIgKyBcIl1cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNmLmV4Y2VwdGlvbnMuYXNzZXJ0RmFpbChleHBsYW5hdGlvbik7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIGFzc2VydCBmb3IgaW5lcXVhbGl0eS4gSWYgY2hlY2sgZmFpbHMsIHRoZSBhc3NlcnRGYWlsIGlzIGludm9rZWQuXG4gICAgICogQHBhcmFtIHYxIHtTdHJpbmd8TnVtYmVyfE9iamVjdH0gLSBmaXJzdCB2YWx1ZVxuICAgICAqIEBwYXJhbSB2MSB7U3RyaW5nfE51bWJlcnxPYmplY3R9IC0gc2Vjb25kIHZhbHVlXG4gICAgICogQHBhcmFtIGV4cGxhbmF0aW9uIHtTdHJpbmd9IC0gZmFpbGluZyByZWFzb24gbWVzc2FnZSBpbiBjYXNlIHRoZSBhc3NlcnQgZmFpbHNcbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWRkQ2hlY2soJ25vdEVxdWFsJywgZnVuY3Rpb24odjEsIHYyLCBleHBsYW5hdGlvbil7XG4gICAgICAgIGlmKHYxID09PSB2Mil7XG4gICAgICAgICAgICBpZighZXhwbGFuYXRpb24pe1xuICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uID0gIFwiIFtcIisgdjEgKyBcIiA9PSBcIiArIHYyICsgXCJdXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZi5leGNlcHRpb25zLmFzc2VydEZhaWwoZXhwbGFuYXRpb24pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmluZyBhc3NlcnQgZm9yIGV2YWx1YXRpbmcgYW4gZXhwcmVzc2lvbiB0byB0cnVlLiBJZiBjaGVjayBmYWlscywgdGhlIGFzc2VydEZhaWwgaXMgaW52b2tlZC5cbiAgICAgKiBAcGFyYW0gYiB7Qm9vbGVhbn0gLSByZXN1bHQgb2YgYW4gZXhwcmVzc2lvblxuICAgICAqIEBwYXJhbSBleHBsYW5hdGlvbiB7U3RyaW5nfSAtIGZhaWxpbmcgcmVhc29uIG1lc3NhZ2UgaW4gY2FzZSB0aGUgYXNzZXJ0IGZhaWxzXG4gICAgICovXG4gICAgc2YuYXNzZXJ0LmFkZENoZWNrKCd0cnVlJywgZnVuY3Rpb24oYiwgZXhwbGFuYXRpb24pe1xuICAgICAgICBpZighYil7XG4gICAgICAgICAgICBpZighZXhwbGFuYXRpb24pe1xuICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uID0gIFwiIGV4cHJlc3Npb24gaXMgZmFsc2UgYnV0IGlzIGV4cGVjdGVkIHRvIGJlIHRydWVcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNmLmV4Y2VwdGlvbnMuYXNzZXJ0RmFpbChleHBsYW5hdGlvbik7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIGFzc2VydCBmb3IgZXZhbHVhdGluZyBhbiBleHByZXNzaW9uIHRvIGZhbHNlLiBJZiBjaGVjayBmYWlscywgdGhlIGFzc2VydEZhaWwgaXMgaW52b2tlZC5cbiAgICAgKiBAcGFyYW0gYiB7Qm9vbGVhbn0gLSByZXN1bHQgb2YgYW4gZXhwcmVzc2lvblxuICAgICAqIEBwYXJhbSBleHBsYW5hdGlvbiB7U3RyaW5nfSAtIGZhaWxpbmcgcmVhc29uIG1lc3NhZ2UgaW4gY2FzZSB0aGUgYXNzZXJ0IGZhaWxzXG4gICAgICovXG4gICAgc2YuYXNzZXJ0LmFkZENoZWNrKCdmYWxzZScsIGZ1bmN0aW9uKGIsIGV4cGxhbmF0aW9uKXtcbiAgICAgICAgaWYoYil7XG4gICAgICAgICAgICBpZighZXhwbGFuYXRpb24pe1xuICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uID0gIFwiIGV4cHJlc3Npb24gaXMgdHJ1ZSBidXQgaXMgZXhwZWN0ZWQgdG8gYmUgZmFsc2VcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNmLmV4Y2VwdGlvbnMuYXNzZXJ0RmFpbChleHBsYW5hdGlvbik7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIGFzc2VydCBmb3IgZXZhbHVhdGluZyBhIHZhbHVlIHRvIG51bGwuIElmIGNoZWNrIGZhaWxzLCB0aGUgYXNzZXJ0RmFpbCBpcyBpbnZva2VkLlxuICAgICAqIEBwYXJhbSBiIHtCb29sZWFufSAtIHJlc3VsdCBvZiBhbiBleHByZXNzaW9uXG4gICAgICogQHBhcmFtIGV4cGxhbmF0aW9uIHtTdHJpbmd9IC0gZmFpbGluZyByZWFzb24gbWVzc2FnZSBpbiBjYXNlIHRoZSBhc3NlcnQgZmFpbHNcbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWRkQ2hlY2soJ2lzTnVsbCcsIGZ1bmN0aW9uKHYxLCBleHBsYW5hdGlvbil7XG4gICAgICAgIGlmKHYxICE9PSBudWxsKXtcbiAgICAgICAgICAgIHNmLmV4Y2VwdGlvbnMuYXNzZXJ0RmFpbChleHBsYW5hdGlvbik7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIGFzc2VydCBmb3IgZXZhbHVhdGluZyBhIHZhbHVlIHRvIGJlIG5vdCBudWxsLiBJZiBjaGVjayBmYWlscywgdGhlIGFzc2VydEZhaWwgaXMgaW52b2tlZC5cbiAgICAgKiBAcGFyYW0gYiB7Qm9vbGVhbn0gLSByZXN1bHQgb2YgYW4gZXhwcmVzc2lvblxuICAgICAqIEBwYXJhbSBleHBsYW5hdGlvbiB7U3RyaW5nfSAtIGZhaWxpbmcgcmVhc29uIG1lc3NhZ2UgaW4gY2FzZSB0aGUgYXNzZXJ0IGZhaWxzXG4gICAgICovXG4gICAgc2YuYXNzZXJ0LmFkZENoZWNrKCdub3ROdWxsJywgZnVuY3Rpb24odjEgLCBleHBsYW5hdGlvbil7XG4gICAgICAgIGlmKHYxID09PSBudWxsICYmIHR5cGVvZiB2MSA9PT0gXCJvYmplY3RcIil7XG4gICAgICAgICAgICBzZi5leGNlcHRpb25zLmFzc2VydEZhaWwoZXhwbGFuYXRpb24pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgYWxsIHByb3BlcnRpZXMgb2YgdGhlIHNlY29uZCBvYmplY3QgYXJlIG93biBwcm9wZXJ0aWVzIG9mIHRoZSBmaXJzdCBvYmplY3QuXG4gICAgICogQHBhcmFtIGZpcnN0T2JqIHtPYmplY3R9IC0gZmlyc3Qgb2JqZWN0XG4gICAgICogQHBhcmFtIHNlY29uZE9iantPYmplY3R9IC0gc2Vjb25kIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIHJldHVybnMgdHJ1ZSwgaWYgdGhlIGNoZWNrIGhhcyBwYXNzZWQgb3IgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9iamVjdEhhc0ZpZWxkcyhmaXJzdE9iaiwgc2Vjb25kT2JqKXtcbiAgICAgICAgZm9yKGxldCBmaWVsZCBpbiBzZWNvbmRPYmopIHtcbiAgICAgICAgICAgIGlmIChmaXJzdE9iai5oYXNPd25Qcm9wZXJ0eShmaWVsZCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmlyc3RPYmpbZmllbGRdICE9PSBzZWNvbmRPYmpbZmllbGRdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvYmplY3RzQXJlRXF1YWwoZmlyc3RPYmosIHNlY29uZE9iaikge1xuICAgICAgICBsZXQgYXJlRXF1YWwgPSB0cnVlO1xuICAgICAgICBpZihmaXJzdE9iaiAhPT0gc2Vjb25kT2JqKSB7XG4gICAgICAgICAgICBpZih0eXBlb2YgZmlyc3RPYmogIT09IHR5cGVvZiBzZWNvbmRPYmopIHtcbiAgICAgICAgICAgICAgICBhcmVFcXVhbCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGZpcnN0T2JqKSAmJiBBcnJheS5pc0FycmF5KHNlY29uZE9iaikpIHtcblx0ICAgICAgICAgICAgZmlyc3RPYmouc29ydCgpO1xuXHQgICAgICAgICAgICBzZWNvbmRPYmouc29ydCgpO1xuXHRcdCAgICAgICAgaWYgKGZpcnN0T2JqLmxlbmd0aCAhPT0gc2Vjb25kT2JqLmxlbmd0aCkge1xuXHRcdFx0ICAgICAgICBhcmVFcXVhbCA9IGZhbHNlO1xuXHRcdCAgICAgICAgfSBlbHNlIHtcblx0XHRcdCAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmaXJzdE9iai5sZW5ndGg7ICsraSkge1xuXHRcdFx0XHQgICAgICAgIGlmICghb2JqZWN0c0FyZUVxdWFsKGZpcnN0T2JqW2ldLCBzZWNvbmRPYmpbaV0pKSB7XG5cdFx0XHRcdFx0ICAgICAgICBhcmVFcXVhbCA9IGZhbHNlO1xuXHRcdFx0XHRcdCAgICAgICAgYnJlYWs7XG5cdFx0XHRcdCAgICAgICAgfVxuXHRcdFx0ICAgICAgICB9XG5cdFx0ICAgICAgICB9XG5cdCAgICAgICAgfSBlbHNlIGlmKCh0eXBlb2YgZmlyc3RPYmogPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHNlY29uZE9iaiA9PT0gJ2Z1bmN0aW9uJykgfHxcblx0XHQgICAgICAgIChmaXJzdE9iaiBpbnN0YW5jZW9mIERhdGUgJiYgc2Vjb25kT2JqIGluc3RhbmNlb2YgRGF0ZSkgfHxcblx0XHQgICAgICAgIChmaXJzdE9iaiBpbnN0YW5jZW9mIFJlZ0V4cCAmJiBzZWNvbmRPYmogaW5zdGFuY2VvZiBSZWdFeHApIHx8XG5cdFx0ICAgICAgICAoZmlyc3RPYmogaW5zdGFuY2VvZiBTdHJpbmcgJiYgc2Vjb25kT2JqIGluc3RhbmNlb2YgU3RyaW5nKSB8fFxuXHRcdCAgICAgICAgKGZpcnN0T2JqIGluc3RhbmNlb2YgTnVtYmVyICYmIHNlY29uZE9iaiBpbnN0YW5jZW9mIE51bWJlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJlRXF1YWwgPSBmaXJzdE9iai50b1N0cmluZygpID09PSBzZWNvbmRPYmoudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZih0eXBlb2YgZmlyc3RPYmogPT09ICdvYmplY3QnICYmIHR5cGVvZiBzZWNvbmRPYmogPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgYXJlRXF1YWwgPSBvYmplY3RIYXNGaWVsZHMoZmlyc3RPYmosIHNlY29uZE9iaik7XG4gICAgICAgICAgICAvLyBpc05hTih1bmRlZmluZWQpIHJldHVybnMgdHJ1ZVxuICAgICAgICAgICAgfSBlbHNlIGlmKGlzTmFOKGZpcnN0T2JqKSAmJiBpc05hTihzZWNvbmRPYmopICYmIHR5cGVvZiBmaXJzdE9iaiA9PT0gJ251bWJlcicgJiYgdHlwZW9mIHNlY29uZE9iaiA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICBhcmVFcXVhbCA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFyZUVxdWFsID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXJlRXF1YWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgYXNzZXJ0IGZvciBldmFsdWF0aW5nIGlmIGFsbCBwcm9wZXJ0aWVzIG9mIHRoZSBzZWNvbmQgb2JqZWN0IGFyZSBvd24gcHJvcGVydGllcyBvZiB0aGUgZmlyc3Qgb2JqZWN0LlxuICAgICAqIElmIGNoZWNrIGZhaWxzLCB0aGUgYXNzZXJ0RmFpbCBpcyBpbnZva2VkLlxuICAgICAqIEBwYXJhbSBmaXJzdE9iaiB7T2JqZWN0fSAtIGZpcnN0IG9iamVjdFxuICAgICAqIEBwYXJhbSBzZWNvbmRPYmp7T2JqZWN0fSAtIHNlY29uZCBvYmplY3RcbiAgICAgKiBAcGFyYW0gZXhwbGFuYXRpb24ge1N0cmluZ30gLSBmYWlsaW5nIHJlYXNvbiBtZXNzYWdlIGluIGNhc2UgdGhlIGFzc2VydCBmYWlsc1xuICAgICAqL1xuICAgIHNmLmFzc2VydC5hZGRDaGVjayhcIm9iamVjdEhhc0ZpZWxkc1wiLCBmdW5jdGlvbihmaXJzdE9iaiwgc2Vjb25kT2JqLCBleHBsYW5hdGlvbil7XG4gICAgICAgIGlmKCFvYmplY3RIYXNGaWVsZHMoZmlyc3RPYmosIHNlY29uZE9iaikpIHtcbiAgICAgICAgICAgIHNmLmV4Y2VwdGlvbnMuYXNzZXJ0RmFpbChleHBsYW5hdGlvbik7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIGFzc2VydCBmb3IgZXZhbHVhdGluZyBpZiBhbGwgZWxlbWVudCBmcm9tIHRoZSBzZWNvbmQgYXJyYXkgYXJlIHByZXNlbnQgaW4gdGhlIGZpcnN0IGFycmF5LlxuICAgICAqIERlZXAgY29tcGFyaXNvbiBiZXR3ZWVuIHRoZSBlbGVtZW50cyBvZiB0aGUgYXJyYXkgaXMgdXNlZC5cbiAgICAgKiBJZiBjaGVjayBmYWlscywgdGhlIGFzc2VydEZhaWwgaXMgaW52b2tlZC5cbiAgICAgKiBAcGFyYW0gZmlyc3RBcnJheSB7QXJyYXl9LSBmaXJzdCBhcnJheVxuICAgICAqIEBwYXJhbSBzZWNvbmRBcnJheSB7QXJyYXl9IC0gc2Vjb25kIGFycmF5XG4gICAgICogQHBhcmFtIGV4cGxhbmF0aW9uIHtTdHJpbmd9IC0gZmFpbGluZyByZWFzb24gbWVzc2FnZSBpbiBjYXNlIHRoZSBhc3NlcnQgZmFpbHNcbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWRkQ2hlY2soXCJhcnJheXNNYXRjaFwiLCBmdW5jdGlvbihmaXJzdEFycmF5LCBzZWNvbmRBcnJheSwgZXhwbGFuYXRpb24pe1xuICAgICAgICBpZihmaXJzdEFycmF5Lmxlbmd0aCAhPT0gc2Vjb25kQXJyYXkubGVuZ3RoKXtcbiAgICAgICAgICAgIHNmLmV4Y2VwdGlvbnMuYXNzZXJ0RmFpbChleHBsYW5hdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBvYmplY3RzQXJlRXF1YWwoZmlyc3RBcnJheSwgc2Vjb25kQXJyYXkpO1xuICAgICAgICAgICAgLy8gY29uc3QgYXJyYXlzRG9udE1hdGNoID0gc2Vjb25kQXJyYXkuZXZlcnkoZWxlbWVudCA9PiBmaXJzdEFycmF5LmluZGV4T2YoZWxlbWVudCkgIT09IC0xKTtcbiAgICAgICAgICAgIC8vIGxldCBhcnJheXNEb250TWF0Y2ggPSBzZWNvbmRBcnJheS5zb21lKGZ1bmN0aW9uIChleHBlY3RlZEVsZW1lbnQpIHtcbiAgICAgICAgICAgIC8vICAgICBsZXQgZm91bmQgPSBmaXJzdEFycmF5LnNvbWUoZnVuY3Rpb24ocmVzdWx0RWxlbWVudCl7XG4gICAgICAgICAgICAvLyAgICAgICAgIHJldHVybiBvYmplY3RIYXNGaWVsZHMocmVzdWx0RWxlbWVudCxleHBlY3RlZEVsZW1lbnQpO1xuICAgICAgICAgICAgLy8gICAgIH0pO1xuICAgICAgICAgICAgLy8gICAgIHJldHVybiBmb3VuZCA9PT0gZmFsc2U7XG4gICAgICAgICAgICAvLyB9KTtcblxuICAgICAgICAgICAgaWYoIXJlc3VsdCl7XG4gICAgICAgICAgICAgICAgc2YuZXhjZXB0aW9ucy5hc3NlcnRGYWlsKGV4cGxhbmF0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gYWRkZWQgbWFpbmx5IGZvciB0ZXN0IHB1cnBvc2VzLCBiZXR0ZXIgdGVzdCBmcmFtZXdvcmtzIGxpa2UgbW9jaGEgY291bGQgYmUgbXVjaCBiZXR0ZXJcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIGFzc2VydCBmb3IgY2hlY2tpbmcgaWYgYSBmdW5jdGlvbiBpcyBmYWlsaW5nLlxuICAgICAqIElmIHRoZSBmdW5jdGlvbiBpcyB0aHJvd2luZyBhbiBleGNlcHRpb24sIHRoZSB0ZXN0IGlzIHBhc3NlZCBvciBmYWlsZWQgb3RoZXJ3aXNlLlxuICAgICAqIEBwYXJhbSB0ZXN0TmFtZSB7U3RyaW5nfSAtIHRlc3QgbmFtZSBvciBkZXNjcmlwdGlvblxuICAgICAqIEBwYXJhbSBmdW5jIHtGdW5jdGlvbn0gLSBmdW5jdGlvbiB0byBiZSBpbnZva2VkXG4gICAgICovXG4gICAgc2YuYXNzZXJ0LmFkZENoZWNrKCdmYWlsJywgZnVuY3Rpb24odGVzdE5hbWUsIGZ1bmMpe1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBmdW5jKCk7XG4gICAgICAgICAgICBsb2dnZXIucmVjb3JkQXNzZXJ0KFwiW0ZhaWxdIFwiICsgdGVzdE5hbWUpO1xuICAgICAgICB9IGNhdGNoKGVycil7XG4gICAgICAgICAgICBsb2dnZXIucmVjb3JkQXNzZXJ0KFwiW1Bhc3NdIFwiICsgdGVzdE5hbWUpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmluZyBhc3NlcnQgZm9yIGNoZWNraW5nIGlmIGEgZnVuY3Rpb24gaXMgZXhlY3V0ZWQgd2l0aCBubyBleGNlcHRpb25zLlxuICAgICAqIElmIHRoZSBmdW5jdGlvbiBpcyBub3QgdGhyb3dpbmcgYW55IGV4Y2VwdGlvbiwgdGhlIHRlc3QgaXMgcGFzc2VkIG9yIGZhaWxlZCBvdGhlcndpc2UuXG4gICAgICogQHBhcmFtIHRlc3ROYW1lIHtTdHJpbmd9IC0gdGVzdCBuYW1lIG9yIGRlc2NyaXB0aW9uXG4gICAgICogQHBhcmFtIGZ1bmMge0Z1bmN0aW9ufSAtIGZ1bmN0aW9uIHRvIGJlIGludm9rZWRcbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWRkQ2hlY2soJ3Bhc3MnLCBmdW5jdGlvbih0ZXN0TmFtZSwgZnVuYyl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGZ1bmMoKTtcbiAgICAgICAgICAgIGxvZ2dlci5yZWNvcmRBc3NlcnQoXCJbUGFzc10gXCIgKyB0ZXN0TmFtZSk7XG4gICAgICAgIH0gY2F0Y2goZXJyKXtcbiAgICAgICAgICAgIGxvZ2dlci5yZWNvcmRBc3NlcnQoXCJbRmFpbF0gXCIgKyB0ZXN0TmFtZSwgZXJyLnN0YWNrKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogQWxpYXMgZm9yIHRoZSBwYXNzIGFzc2VydC5cbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWxpYXMoJ3Rlc3QnLCAncGFzcycpO1xuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgYXNzZXJ0IGZvciBjaGVja2luZyBpZiBhIGNhbGxiYWNrIGZ1bmN0aW9uIGlzIGV4ZWN1dGVkIGJlZm9yZSB0aW1lb3V0IGlzIHJlYWNoZWQgd2l0aG91dCBhbnkgZXhjZXB0aW9ucy5cbiAgICAgKiBJZiB0aGUgZnVuY3Rpb24gaXMgdGhyb3dpbmcgYW55IGV4Y2VwdGlvbiBvciB0aGUgdGltZW91dCBpcyByZWFjaGVkLCB0aGUgdGVzdCBpcyBmYWlsZWQgb3IgcGFzc2VkIG90aGVyd2lzZS5cbiAgICAgKiBAcGFyYW0gdGVzdE5hbWUge1N0cmluZ30gLSB0ZXN0IG5hbWUgb3IgZGVzY3JpcHRpb25cbiAgICAgKiBAcGFyYW0gZnVuYyB7RnVuY3Rpb259IC0gZnVuY3Rpb24gdG8gYmUgaW52b2tlZFxuICAgICAqIEBwYXJhbSB0aW1lb3V0IHtOdW1iZXJ9IC0gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBmb3IgdGhlIHRpbWVvdXQgY2hlY2suIERlZmF1bHQgdG8gNTAwbXMuXG4gICAgICovXG4gICAgc2YuYXNzZXJ0LmFkZENoZWNrKCdjYWxsYmFjaycsIGZ1bmN0aW9uKHRlc3ROYW1lLCBmdW5jLCB0aW1lb3V0KXtcblxuICAgICAgICBpZighZnVuYyB8fCB0eXBlb2YgZnVuYyAhPSBcImZ1bmN0aW9uXCIpe1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiV3JvbmcgdXNhZ2Ugb2YgYXNzZXJ0LmNhbGxiYWNrIVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCF0aW1lb3V0KXtcbiAgICAgICAgICAgIHRpbWVvdXQgPSA1MDA7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcGFzc2VkID0gZmFsc2U7XG4gICAgICAgIGZ1bmN0aW9uIGNhbGxiYWNrKCl7XG4gICAgICAgICAgICBpZighcGFzc2VkKXtcbiAgICAgICAgICAgICAgICBwYXNzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5yZWNvcmRBc3NlcnQoXCJbUGFzc10gXCIgKyB0ZXN0TmFtZSk7XG4gICAgICAgICAgICAgICAgc3VjY2Vzc1Rlc3QoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnJlY29yZEFzc2VydChcIltGYWlsIChtdWx0aXBsZSBjYWxscyldIFwiICsgdGVzdE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBmdW5jKGNhbGxiYWNrKTtcbiAgICAgICAgfSBjYXRjaChlcnIpe1xuICAgICAgICAgICAgbG9nZ2VyLnJlY29yZEFzc2VydChcIltGYWlsXSBcIiArIHRlc3ROYW1lLCAgZXJyLCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3NUZXN0KGZvcmNlKXtcbiAgICAgICAgICAgIGlmKCFwYXNzZWQpe1xuICAgICAgICAgICAgICAgIGxvZ2dlci5yZWNvcmRBc3NlcnQoXCJbRmFpbCBUaW1lb3V0XSBcIiArIHRlc3ROYW1lICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBzZXRUaW1lb3V0KHN1Y2Nlc3NUZXN0LCB0aW1lb3V0KTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIGFzc2VydCBmb3IgY2hlY2tpbmcgaWYgYW4gYXJyYXkgb2YgY2FsbGJhY2sgZnVuY3Rpb25zIGFyZSBleGVjdXRlZCBpbiBhIHdhdGVyZmFsbCBtYW5uZXIsXG4gICAgICogYmVmb3JlIHRpbWVvdXQgaXMgcmVhY2hlZCB3aXRob3V0IGFueSBleGNlcHRpb25zLlxuICAgICAqIElmIGFueSBvZiB0aGUgZnVuY3Rpb25zIGlzIHRocm93aW5nIGFueSBleGNlcHRpb24gb3IgdGhlIHRpbWVvdXQgaXMgcmVhY2hlZCwgdGhlIHRlc3QgaXMgZmFpbGVkIG9yIHBhc3NlZCBvdGhlcndpc2UuXG4gICAgICogQHBhcmFtIHRlc3ROYW1lIHtTdHJpbmd9IC0gdGVzdCBuYW1lIG9yIGRlc2NyaXB0aW9uXG4gICAgICogQHBhcmFtIGZ1bmMge0Z1bmN0aW9ufSAtIGZ1bmN0aW9uIHRvIGJlIGludm9rZWRcbiAgICAgKiBAcGFyYW0gdGltZW91dCB7TnVtYmVyfSAtIG51bWJlciBvZiBtaWxsaXNlY29uZHMgZm9yIHRoZSB0aW1lb3V0IGNoZWNrLiBEZWZhdWx0IHRvIDUwMG1zLlxuICAgICAqL1xuICAgIHNmLmFzc2VydC5hZGRDaGVjaygnc3RlcHMnLCBmdW5jdGlvbih0ZXN0TmFtZSwgYXJyLCB0aW1lb3V0KXtcbiAgICAgICAgaWYoIXRpbWVvdXQpe1xuICAgICAgICAgICAgdGltZW91dCA9IDUwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjdXJyZW50U3RlcCA9IDA7XG4gICAgICAgIHZhciBwYXNzZWQgPSBmYWxzZTtcblxuICAgICAgICBmdW5jdGlvbiBuZXh0KCl7XG4gICAgICAgICAgICBpZihjdXJyZW50U3RlcCA9PT0gYXJyLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgcGFzc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBsb2dnZXIucmVjb3JkQXNzZXJ0KFwiW1Bhc3NdIFwiICsgdGVzdE5hbWUgKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmdW5jID0gYXJyW2N1cnJlbnRTdGVwXTtcbiAgICAgICAgICAgIGN1cnJlbnRTdGVwKys7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgZnVuYyhuZXh0KTtcbiAgICAgICAgICAgIH0gY2F0Y2goZXJyKXtcbiAgICAgICAgICAgICAgICBsb2dnZXIucmVjb3JkQXNzZXJ0KFwiW0ZhaWxdIFwiICsgdGVzdE5hbWUgICsgXCIgW2F0IHN0ZXAgXCIgKyBjdXJyZW50U3RlcCArIFwiXVwiLCBlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc3VjY2Vzc1Rlc3QoZm9yY2Upe1xuICAgICAgICAgICAgaWYoIXBhc3NlZCl7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnJlY29yZEFzc2VydChcIltGYWlsIFRpbWVvdXRdIFwiICsgdGVzdE5hbWUgICsgXCIgW2F0IHN0ZXAgXCIgKyBjdXJyZW50U3RlcCArIFwiXVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHNldFRpbWVvdXQoc3VjY2Vzc1Rlc3QsIHRpbWVvdXQpO1xuICAgICAgICBuZXh0KCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBBbGlhcyBmb3IgdGhlIHN0ZXBzIGFzc2VydC5cbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWxpYXMoJ3dhdGVyZmFsbCcsICdzdGVwcycpO1xuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgYXNzZXJ0IGZvciBhc3luY2hyb25vdXNseSBwcmludGluZyBhbGwgZXhlY3V0aW9uIHN1bW1hcnkgZnJvbSBsb2dnZXIuZHVtcFdoeXMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2Uge1N0cmluZ30gLSBtZXNzYWdlIHRvIGJlIHJlY29yZGVkXG4gICAgICogQHBhcmFtIHRpbWVvdXQge051bWJlcn0gLSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGZvciB0aGUgdGltZW91dCBjaGVjay4gRGVmYXVsdCB0byA1MDBtcy5cbiAgICAgKi9cbiAgICBzZi5hc3NlcnQuYWRkQ2hlY2soJ2VuZCcsIGZ1bmN0aW9uKHRpbWVvdXQsIHNpbGVuY2Upe1xuICAgICAgICBpZighdGltZW91dCl7XG4gICAgICAgICAgICB0aW1lb3V0ID0gMTAwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZXIoKSB7XG4gICAgICAgICAgICBsb2dnZXIuZHVtcFdoeXMoKS5mb3JFYWNoKGZ1bmN0aW9uKGMpe1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4ZWN1dGlvblN1bW1hcnkgPSBjLmdldEV4ZWN1dGlvblN1bW1hcnkoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShleGVjdXRpb25TdW1tYXJ5LCBudWxsLCA0KSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYoIXNpbGVuY2Upe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRm9yY2luZyBleGl0IGFmdGVyXCIsIHRpbWVvdXQsIFwibXNcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gICAgICAgIH1cblxuICAgICAgICBzZXRUaW1lb3V0KGhhbmRsZXIsIHRpbWVvdXQpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgYXNzZXJ0IGZvciBwcmludGluZyBhIG1lc3NhZ2UgYW5kIGFzeW5jaHJvbm91c2x5IHByaW50aW5nIGFsbCBsb2dzIGZyb20gbG9nZ2VyLmR1bXBXaHlzLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIHtTdHJpbmd9IC0gbWVzc2FnZSB0byBiZSByZWNvcmRlZFxuICAgICAqIEBwYXJhbSB0aW1lb3V0IHtOdW1iZXJ9IC0gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBmb3IgdGhlIHRpbWVvdXQgY2hlY2suIERlZmF1bHQgdG8gNTAwbXMuXG4gICAgICovXG4gICAgc2YuYXNzZXJ0LmFkZENoZWNrKCdiZWdpbicsIGZ1bmN0aW9uKG1lc3NhZ2UsIHRpbWVvdXQpe1xuICAgICAgICBsb2dnZXIucmVjb3JkQXNzZXJ0KG1lc3NhZ2UpO1xuICAgICAgICBzZi5hc3NlcnQuZW5kKHRpbWVvdXQsIHRydWUpO1xuICAgIH0pO1xufTsiLCIvKlxuICAgIGNoZWNrcyBhcmUgbGlrZSBhc3NlcnRzIGJ1dCBhcmUgaW50ZW5kZWQgdG8gYmUgdXNlZCBpbiBwcm9kdWN0aW9uIGNvZGUgdG8gaGVscCBkZWJ1Z2dpbmcgYW5kIHNpZ25hbGluZyB3cm9uZyBiZWhhdmlvdXJzXG5cbiAqL1xuXG5leHBvcnRzLmluaXQgPSBmdW5jdGlvbihzZil7XG4gICAgc2YuZXhjZXB0aW9ucy5yZWdpc3RlcignY2hlY2tGYWlsJywgZnVuY3Rpb24oZXhwbGFuYXRpb24sIGVycil7XG4gICAgICAgIHZhciBzdGFjaztcbiAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgIHN0YWNrID0gZXJyLnN0YWNrO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ2hlY2sgZmFpbGVkIFwiLCBleHBsYW5hdGlvbiwgc3RhY2spO1xuICAgIH0pO1xuXG4gICAgc2YuY2hlY2suYWRkQ2hlY2soJ2VxdWFsJywgZnVuY3Rpb24odjEgLCB2MiwgZXhwbGFuYXRpb24pe1xuXG4gICAgICAgIGlmKHYxICE9PSB2Mil7XG4gICAgICAgICAgICBpZighZXhwbGFuYXRpb24pe1xuICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uID0gIFwiIFtcIisgdjEgKyBcIiAhPSBcIiArIHYyICsgXCJdXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNmLmV4Y2VwdGlvbnMuY2hlY2tGYWlsKGV4cGxhbmF0aW9uKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICBzZi5jaGVjay5hZGRDaGVjaygndHJ1ZScsIGZ1bmN0aW9uKGIsIGV4cGxhbmF0aW9uKXtcbiAgICAgICAgaWYoIWIpe1xuICAgICAgICAgICAgaWYoIWV4cGxhbmF0aW9uKXtcbiAgICAgICAgICAgICAgICBleHBsYW5hdGlvbiA9ICBcIiBleHByZXNzaW9uIGlzIGZhbHNlIGJ1dCBpcyBleHBlY3RlZCB0byBiZSB0cnVlXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNmLmV4Y2VwdGlvbnMuY2hlY2tGYWlsKGV4cGxhbmF0aW9uKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICBzZi5jaGVjay5hZGRDaGVjaygnZmFsc2UnLCBmdW5jdGlvbihiLCBleHBsYW5hdGlvbil7XG4gICAgICAgIGlmKGIpe1xuICAgICAgICAgICAgaWYoIWV4cGxhbmF0aW9uKXtcbiAgICAgICAgICAgICAgICBleHBsYW5hdGlvbiA9ICBcIiBleHByZXNzaW9uIGlzIHRydWUgYnV0IGlzIGV4cGVjdGVkIHRvIGJlIGZhbHNlXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNmLmV4Y2VwdGlvbnMuY2hlY2tGYWlsKGV4cGxhbmF0aW9uKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgc2YuY2hlY2suYWRkQ2hlY2soJ25vdGVxdWFsJywgZnVuY3Rpb24odjEgLCB2MiwgZXhwbGFuYXRpb24pe1xuICAgICAgICBpZih2MSA9PSB2Mil7XG4gICAgICAgICAgICBpZighZXhwbGFuYXRpb24pe1xuICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uID0gIFwiIFtcIisgdjEgKyBcIiA9PSBcIiArIHYyICsgXCJdXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZi5leGNlcHRpb25zLmNoZWNrRmFpbChleHBsYW5hdGlvbik7XG4gICAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgLypcbiAgICAgICAgYWRkZWQgbWFpbmx5IGZvciB0ZXN0IHB1cnBvc2VzLCBiZXR0ZXIgdGVzdCBmcmFtZXdvcmtzIGxpa2UgbW9jaGEgY291bGQgYmUgbXVjaCBiZXR0ZXIgOilcbiAgICAqL1xuICAgIHNmLmNoZWNrLmFkZENoZWNrKCdmYWlsJywgZnVuY3Rpb24odGVzdE5hbWUgLGZ1bmMpe1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBmdW5jKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIltGYWlsXSBcIiArIHRlc3ROYW1lICk7XG4gICAgICAgIH0gY2F0Y2goZXJyKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW1Bhc3NdIFwiICsgdGVzdE5hbWUgKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICBzZi5jaGVjay5hZGRDaGVjaygncGFzcycsIGZ1bmN0aW9uKHRlc3ROYW1lICxmdW5jKXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgZnVuYygpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJbUGFzc10gXCIgKyB0ZXN0TmFtZSApO1xuICAgICAgICB9IGNhdGNoKGVycil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIltGYWlsXSBcIiArIHRlc3ROYW1lICAsICBlcnIuc3RhY2spO1xuICAgICAgICB9XG4gICAgfSk7XG5cblxuICAgIHNmLmNoZWNrLmFsaWFzKCd0ZXN0JywncGFzcycpO1xuXG5cbiAgICBzZi5jaGVjay5hZGRDaGVjaygnY2FsbGJhY2snLCBmdW5jdGlvbih0ZXN0TmFtZSAsZnVuYywgdGltZW91dCl7XG4gICAgICAgIGlmKCF0aW1lb3V0KXtcbiAgICAgICAgICAgIHRpbWVvdXQgPSA1MDA7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhc3NlZCA9IGZhbHNlO1xuICAgICAgICBmdW5jdGlvbiBjYWxsYmFjaygpe1xuICAgICAgICAgICAgaWYoIXBhc3NlZCl7XG4gICAgICAgICAgICAgICAgcGFzc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltQYXNzXSBcIiArIHRlc3ROYW1lICk7XG4gICAgICAgICAgICAgICAgU3VjY2Vzc1Rlc3QoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJbRmFpbCAobXVsdGlwbGUgY2FsbHMpXSBcIiArIHRlc3ROYW1lICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgZnVuYyhjYWxsYmFjayk7XG4gICAgICAgIH0gY2F0Y2goZXJyKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0ZhaWxdIFwiICsgdGVzdE5hbWUgICwgIGVyci5zdGFjayk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBTdWNjZXNzVGVzdChmb3JjZSl7XG4gICAgICAgICAgICBpZighcGFzc2VkKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltGYWlsIFRpbWVvdXRdIFwiICsgdGVzdE5hbWUgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHNldFRpbWVvdXQoU3VjY2Vzc1Rlc3QsIHRpbWVvdXQpO1xuICAgIH0pO1xuXG5cbiAgICBzZi5jaGVjay5hZGRDaGVjaygnc3RlcHMnLCBmdW5jdGlvbih0ZXN0TmFtZSAsIGFyciwgdGltZW91dCl7XG4gICAgICAgIHZhciAgY3VycmVudFN0ZXAgPSAwO1xuICAgICAgICB2YXIgcGFzc2VkID0gZmFsc2U7XG4gICAgICAgIGlmKCF0aW1lb3V0KXtcbiAgICAgICAgICAgIHRpbWVvdXQgPSA1MDA7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBuZXh0KCl7XG4gICAgICAgICAgICBpZihjdXJyZW50U3RlcCA9PT0gYXJyLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgcGFzc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltQYXNzXSBcIiArIHRlc3ROYW1lICk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBmdW5jID0gYXJyW2N1cnJlbnRTdGVwXTtcbiAgICAgICAgICAgIGN1cnJlbnRTdGVwKys7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgZnVuYyhuZXh0KTtcbiAgICAgICAgICAgIH0gY2F0Y2goZXJyKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltGYWlsXSBcIiArIHRlc3ROYW1lICAsXCJcXG5cXHRcIiAsIGVyci5zdGFjayArIFwiXFxuXFx0XCIgLCBcIiBbYXQgc3RlcCBcIiwgY3VycmVudFN0ZXAgKyBcIl1cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBTdWNjZXNzVGVzdChmb3JjZSl7XG4gICAgICAgICAgICBpZighcGFzc2VkKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltGYWlsIFRpbWVvdXRdIFwiICsgdGVzdE5hbWUgKyBcIlxcblxcdFwiICwgXCIgW2F0IHN0ZXAgXCIsIGN1cnJlbnRTdGVwKyBcIl1cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBzZXRUaW1lb3V0KFN1Y2Nlc3NUZXN0LCB0aW1lb3V0KTtcbiAgICAgICAgbmV4dCgpO1xuICAgIH0pO1xuXG4gICAgc2YuY2hlY2suYWxpYXMoJ3dhdGVyZmFsbCcsJ3N0ZXBzJyk7XG4gICAgc2YuY2hlY2suYWxpYXMoJ25vdEVxdWFsJywnbm90ZXF1YWwnKTtcblxuICAgIHNmLmNoZWNrLmFkZENoZWNrKCdlbmQnLCBmdW5jdGlvbih0aW1lT3V0LCBzaWxlbmNlKXtcbiAgICAgICAgaWYoIXRpbWVPdXQpe1xuICAgICAgICAgICAgdGltZU91dCA9IDEwMDA7XG4gICAgICAgIH1cblxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZighc2lsZW5jZSl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJGb3JjaW5nIGV4aXQgYWZ0ZXJcIiwgdGltZU91dCwgXCJtc1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICAgICAgfSwgdGltZU91dCk7XG4gICAgfSk7XG5cblxuICAgIHNmLmNoZWNrLmFkZENoZWNrKCdiZWdpbicsIGZ1bmN0aW9uKG1lc3NhZ2UsIHRpbWVPdXQpe1xuICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgICAgICAgc2YuY2hlY2suZW5kKHRpbWVPdXQsIHRydWUpO1xuICAgIH0pO1xuXG5cbn07IiwiZXhwb3J0cy5pbml0ID0gZnVuY3Rpb24oc2Ype1xuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIHVua25vd24gZXhjZXB0aW9uIGhhbmRsZXIuXG4gICAgICovXG4gICAgc2YuZXhjZXB0aW9ucy5yZWdpc3RlcigndW5rbm93bicsIGZ1bmN0aW9uKGV4cGxhbmF0aW9uKXtcbiAgICAgICAgZXhwbGFuYXRpb24gPSBleHBsYW5hdGlvbiB8fCBcIlwiO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gXCJVbmtub3duIGV4Y2VwdGlvblwiICsgZXhwbGFuYXRpb247XG4gICAgICAgIHRocm93KG1lc3NhZ2UpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgcmVzZW5kIGV4Y2VwdGlvbiBoYW5kbGVyLlxuICAgICAqL1xuICAgIHNmLmV4Y2VwdGlvbnMucmVnaXN0ZXIoJ3Jlc2VuZCcsIGZ1bmN0aW9uKGV4Y2VwdGlvbnMpe1xuICAgICAgICB0aHJvdyhleGNlcHRpb25zKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyaW5nIG5vdEltcGxlbWVudGVkIGV4Y2VwdGlvbiBoYW5kbGVyLlxuICAgICAqL1xuICAgIHNmLmV4Y2VwdGlvbnMucmVnaXN0ZXIoJ25vdEltcGxlbWVudGVkJywgZnVuY3Rpb24oZXhwbGFuYXRpb24pe1xuICAgICAgICBleHBsYW5hdGlvbiA9IGV4cGxhbmF0aW9uIHx8IFwiXCI7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBcIm5vdEltcGxlbWVudGVkIGV4Y2VwdGlvblwiICsgZXhwbGFuYXRpb247XG4gICAgICAgIHRocm93KG1lc3NhZ2UpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJpbmcgc2VjdXJpdHkgZXhjZXB0aW9uIGhhbmRsZXIuXG4gICAgICovXG4gICAgc2YuZXhjZXB0aW9ucy5yZWdpc3Rlcignc2VjdXJpdHknLCBmdW5jdGlvbihleHBsYW5hdGlvbil7XG4gICAgICAgIGV4cGxhbmF0aW9uID0gZXhwbGFuYXRpb24gfHwgXCJcIjtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IFwic2VjdXJpdHkgZXhjZXB0aW9uXCIgKyBleHBsYW5hdGlvbjtcbiAgICAgICAgdGhyb3cobWVzc2FnZSk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmluZyBkdXBsaWNhdGVEZXBlbmRlbmN5IGV4Y2VwdGlvbiBoYW5kbGVyLlxuICAgICAqL1xuICAgIHNmLmV4Y2VwdGlvbnMucmVnaXN0ZXIoJ2R1cGxpY2F0ZURlcGVuZGVuY3knLCBmdW5jdGlvbih2YXJpYWJsZSl7XG4gICAgICAgIHZhcmlhYmxlID0gdmFyaWFibGUgfHwgXCJcIjtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IFwiZHVwbGljYXRlRGVwZW5kZW5jeSBleGNlcHRpb25cIiArIHZhcmlhYmxlO1xuICAgICAgICB0aHJvdyhtZXNzYWdlKTtcbiAgICB9KTtcbn07IiwiY29uc3QgTE9HX0xFVkVMUyA9IHtcbiAgICBIQVJEX0VSUk9SOiAgICAgMCwgIC8vIHN5c3RlbSBsZXZlbCBjcml0aWNhbCBlcnJvcjogaGFyZEVycm9yXG4gICAgRVJST1I6ICAgICAgICAgIDEsICAvLyBwb3RlbnRpYWxseSBjYXVzaW5nIHVzZXIncyBkYXRhIGxvb3NpbmcgZXJyb3I6IGVycm9yXG4gICAgTE9HX0VSUk9SOiAgICAgIDIsICAvLyBtaW5vciBhbm5veWFuY2UsIHJlY292ZXJhYmxlIGVycm9yOiAgIGxvZ0Vycm9yXG4gICAgVVhfRVJST1I6ICAgICAgIDMsICAvLyB1c2VyIGV4cGVyaWVuY2UgY2F1c2luZyBpc3N1ZXMgZXJyb3I6ICB1eEVycm9yXG4gICAgV0FSTjogICAgICAgICAgIDQsICAvLyB3YXJuaW5nLHBvc3NpYmxlIGlzdWVzIGJ1dCBzb21laG93IHVuY2xlYXIgYmVoYXZpb3VyOiB3YXJuXG4gICAgSU5GTzogICAgICAgICAgIDUsICAvLyBzdG9yZSBnZW5lcmFsIGluZm8gYWJvdXQgdGhlIHN5c3RlbSB3b3JraW5nOiBpbmZvXG4gICAgREVCVUc6ICAgICAgICAgIDYsICAvLyBzeXN0ZW0gbGV2ZWwgZGVidWc6IGRlYnVnXG4gICAgTE9DQUxfREVCVUc6ICAgIDcsICAvLyBsb2NhbCBub2RlL3NlcnZpY2UgZGVidWc6IGxkZWJ1Z1xuICAgIFVTRVJfREVCVUc6ICAgICA4LCAgLy8gdXNlciBsZXZlbCBkZWJ1ZzsgdWRlYnVnXG4gICAgREVWX0RFQlVHOiAgICAgIDksICAvLyBkZXZlbG9wbWVudCB0aW1lIGRlYnVnOiBkZGVidWdcbiAgICBXSFlTOiAgICAgICAgICAgIDEwLCAvLyB3aHlMb2cgZm9yIGNvZGUgcmVhc29uaW5nXG4gICAgVEVTVF9SRVNVTFQ6ICAgIDExLCAvLyB0ZXN0UmVzdWx0IHRvIGxvZyBydW5uaW5nIHRlc3RzXG59O1xuXG5leHBvcnRzLmluaXQgPSBmdW5jdGlvbihzZil7XG5cbiAgICAvKipcbiAgICAgKiBSZWNvcmRzIGxvZyBtZXNzYWdlcyBmcm9tIHZhcmlvdXMgdXNlIGNhc2VzLlxuICAgICAqIEBwYXJhbSByZWNvcmQge1N0cmluZ30gLSBsb2cgbWVzc2FnZS5cbiAgICAgKi9cbiAgICBzZi5sb2dnZXIucmVjb3JkID0gZnVuY3Rpb24ocmVjb3JkKXtcbiAgICAgICAgdmFyIGRpc3BsYXlPbkNvbnNvbGUgPSB0cnVlO1xuICAgICAgICBpZihwcm9jZXNzLnNlbmQpIHtcbiAgICAgICAgICAgIHByb2Nlc3Muc2VuZChyZWNvcmQpO1xuICAgICAgICAgICAgZGlzcGxheU9uQ29uc29sZSA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoZGlzcGxheU9uQ29uc29sZSkge1xuICAgICAgICAgICAgY29uc3QgcHJldHR5TG9nID0gSlNPTi5zdHJpbmdpZnkocmVjb3JkLCBudWxsLCAyKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHByZXR0eUxvZyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQWRkaW5nIGNhc2UgZm9yIGxvZ2dpbmcgc3lzdGVtIGxldmVsIGNyaXRpY2FsIGVycm9ycy5cbiAgICAgKi9cbiAgICBzZi5sb2dnZXIuYWRkQ2FzZSgnaGFyZEVycm9yJywgZnVuY3Rpb24obWVzc2FnZSwgZXhjZXB0aW9uLCBhcmdzLCBwb3MsIGRhdGEpe1xuICAgICAgICBzZi5sb2dnZXIucmVjb3JkKGNyZWF0ZURlYnVnUmVjb3JkKExPR19MRVZFTFMuSEFSRF9FUlJPUiwgJ3N5c3RlbUVycm9yJywgbWVzc2FnZSwgZXhjZXB0aW9uLCB0cnVlLCBhcmdzLCBwb3MsIGRhdGEpKTtcbiAgICB9LCBbXG4gICAgICAgIHtcbiAgICAgICAgICAgICdtZXNzYWdlJzonZXhwbGFuYXRpb24nXG4gICAgICAgIH1cbiAgICBdKTtcblxuICAgIC8qKlxuICAgICAqIEFkZGluZyBjYXNlIGZvciBsb2dnaW5nIHBvdGVudGlhbGx5IGNhdXNpbmcgdXNlcidzIGRhdGEgbG9vc2luZyBlcnJvcnMuXG4gICAgICovXG4gICAgc2YubG9nZ2VyLmFkZENhc2UoJ2Vycm9yJywgZnVuY3Rpb24obWVzc2FnZSwgZXhjZXB0aW9uLCBhcmdzLCBwb3MsIGRhdGEpe1xuICAgICAgICBzZi5sb2dnZXIucmVjb3JkKGNyZWF0ZURlYnVnUmVjb3JkKExPR19MRVZFTFMuRVJST1IsICdlcnJvcicsIG1lc3NhZ2UsIGV4Y2VwdGlvbiwgdHJ1ZSwgYXJncywgcG9zLCBkYXRhKSk7XG4gICAgfSwgW1xuICAgICAgICB7XG4gICAgICAgICAgICAnbWVzc2FnZSc6J2V4cGxhbmF0aW9uJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICAnZXhjZXB0aW9uJzonZXhjZXB0aW9uJ1xuICAgICAgICB9XG4gICAgXSk7XG5cbiAgICAvKipcbiAgICAgKiBBZGRpbmcgY2FzZSBmb3IgbG9nZ2luZyBtaW5vciBhbm5veWFuY2UsIHJlY292ZXJhYmxlIGVycm9ycy5cbiAgICAgKi9cbiAgICBzZi5sb2dnZXIuYWRkQ2FzZSgnbG9nRXJyb3InLCBmdW5jdGlvbihtZXNzYWdlLCBleGNlcHRpb24sIGFyZ3MsIHBvcywgZGF0YSl7XG4gICAgICAgIHNmLmxvZ2dlci5yZWNvcmQoY3JlYXRlRGVidWdSZWNvcmQoTE9HX0xFVkVMUy5MT0dfRVJST1IsICdsb2dFcnJvcicsIG1lc3NhZ2UsIGV4Y2VwdGlvbiwgdHJ1ZSwgYXJncywgcG9zLCBkYXRhKSk7XG4gICAgfSwgW1xuICAgICAgICB7XG4gICAgICAgICAgICAnbWVzc2FnZSc6J2V4cGxhbmF0aW9uJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICAnZXhjZXB0aW9uJzonZXhjZXB0aW9uJ1xuICAgICAgICB9XG4gICAgXSk7XG5cbiAgICAvKipcbiAgICAgKiBBZGRpbmcgY2FzZSBmb3IgbG9nZ2luZyB1c2VyIGV4cGVyaWVuY2UgY2F1c2luZyBpc3N1ZXMgZXJyb3JzLlxuICAgICAqL1xuICAgIHNmLmxvZ2dlci5hZGRDYXNlKCd1eEVycm9yJywgZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgIHNmLmxvZ2dlci5yZWNvcmQoY3JlYXRlRGVidWdSZWNvcmQoTE9HX0xFVkVMUy5VWF9FUlJPUiwgJ3V4RXJyb3InLCBtZXNzYWdlLCBudWxsLCBmYWxzZSkpO1xuICAgIH0sIFtcbiAgICAgICAge1xuICAgICAgICAgICAgJ21lc3NhZ2UnOidleHBsYW5hdGlvbidcbiAgICAgICAgfVxuICAgIF0pO1xuXG4gICAgLyoqXG4gICAgICogQWRkaW5nIGNhc2UgZm9yIGxvZ2dpbmcgdGhyb3R0bGluZyBtZXNzYWdlcy5cbiAgICAgKi9cbiAgICBzZi5sb2dnZXIuYWRkQ2FzZSgndGhyb3R0bGluZycsIGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgICBzZi5sb2dnZXIucmVjb3JkKGNyZWF0ZURlYnVnUmVjb3JkKExPR19MRVZFTFMuV0FSTiwgJ3Rocm90dGxpbmcnLCBtZXNzYWdlLCBudWxsLCBmYWxzZSkpO1xuICAgIH0sIFtcbiAgICAgICAge1xuICAgICAgICAgICAgJ21lc3NhZ2UnOidleHBsYW5hdGlvbidcbiAgICAgICAgfVxuICAgIF0pO1xuXG4gICAgLyoqXG4gICAgICogQWRkaW5nIGNhc2UgZm9yIGxvZ2dpbmcgd2FybmluZywgcG9zc2libGUgaXNzdWVzLCBidXQgc29tZWhvdyB1bmNsZWFyIGJlaGF2aW91cnMuXG4gICAgICovXG4gICAgc2YubG9nZ2VyLmFkZENhc2UoJ3dhcm5pbmcnLCBmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgc2YubG9nZ2VyLnJlY29yZChjcmVhdGVEZWJ1Z1JlY29yZChMT0dfTEVWRUxTLldBUk4sICd3YXJuaW5nJywgbWVzc2FnZSxudWxsLCBmYWxzZSwgYXJndW1lbnRzLCAwKSk7XG4gICAgfSwgW1xuICAgICAgICB7XG4gICAgICAgICAgICAnbWVzc2FnZSc6J2V4cGxhbmF0aW9uJ1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgXG4gICAgc2YubG9nZ2VyLmFsaWFzKCd3YXJuJywgJ3dhcm5pbmcnKTtcblxuICAgIC8qKlxuICAgICAqIEFkZGluZyBjYXNlIGZvciBsb2dnaW5nIGdlbmVyYWwgaW5mbyBhYm91dCB0aGUgc3lzdGVtIHdvcmtpbmcuXG4gICAgICovXG4gICAgc2YubG9nZ2VyLmFkZENhc2UoJ2luZm8nLCBmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgc2YubG9nZ2VyLnJlY29yZChjcmVhdGVEZWJ1Z1JlY29yZChMT0dfTEVWRUxTLklORk8sICdpbmZvJywgbWVzc2FnZSxudWxsLCBmYWxzZSwgYXJndW1lbnRzLCAwKSk7XG4gICAgfSwgW1xuICAgICAgICB7XG4gICAgICAgICAgICAnbWVzc2FnZSc6J2V4cGxhbmF0aW9uJ1xuICAgICAgICB9XG4gICAgXSk7XG5cbiAgICAvKipcbiAgICAgKiBBZGRpbmcgY2FzZSBmb3IgbG9nZ2luZyBzeXN0ZW0gbGV2ZWwgZGVidWcgbWVzc2FnZXMuXG4gICAgICovXG4gICAgc2YubG9nZ2VyLmFkZENhc2UoJ2RlYnVnJywgZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgIHNmLmxvZ2dlci5yZWNvcmQoY3JlYXRlRGVidWdSZWNvcmQoTE9HX0xFVkVMUy5ERUJVRywgJ2RlYnVnJywgbWVzc2FnZSxudWxsLCBmYWxzZSwgYXJndW1lbnRzLCAwKSk7XG4gICAgfSwgW1xuICAgICAgICB7XG4gICAgICAgICAgICAnbWVzc2FnZSc6J2V4cGxhbmF0aW9uJ1xuICAgICAgICB9XG4gICAgXSk7XG5cblxuICAgIC8qKlxuICAgICAqIEFkZGluZyBjYXNlIGZvciBsb2dnaW5nIGxvY2FsIG5vZGUvc2VydmljZSBkZWJ1ZyBtZXNzYWdlcy5cbiAgICAgKi9cbiAgICBzZi5sb2dnZXIuYWRkQ2FzZSgnbGRlYnVnJywgZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgIHNmLmxvZ2dlci5yZWNvcmQoY3JlYXRlRGVidWdSZWNvcmQoTE9HX0xFVkVMUy5MT0NBTF9ERUJVRywgJ2xkZWJ1ZycsIG1lc3NhZ2UsIG51bGwsIGZhbHNlLCBhcmd1bWVudHMsIDApKTtcbiAgICB9LCBbXG4gICAgICAgIHtcbiAgICAgICAgICAgICdtZXNzYWdlJzonZXhwbGFuYXRpb24nXG4gICAgICAgIH1cbiAgICBdKTtcblxuICAgIC8qKlxuICAgICAqIEFkZGluZyBjYXNlIGZvciBsb2dnaW5nIHVzZXIgbGV2ZWwgZGVidWcgbWVzc2FnZXMuXG4gICAgICovXG4gICAgc2YubG9nZ2VyLmFkZENhc2UoJ3VkZWJ1ZycsIGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgICBzZi5sb2dnZXIucmVjb3JkKGNyZWF0ZURlYnVnUmVjb3JkKExPR19MRVZFTFMuVVNFUl9ERUJVRywgJ3VkZWJ1ZycsIG1lc3NhZ2UgLG51bGwsIGZhbHNlLCBhcmd1bWVudHMsIDApKTtcbiAgICB9LCBbXG4gICAgICAgIHtcbiAgICAgICAgICAgICdtZXNzYWdlJzonZXhwbGFuYXRpb24nXG4gICAgICAgIH1cbiAgICBdKTtcblxuICAgIC8qKlxuICAgICAqIEFkZGluZyBjYXNlIGZvciBsb2dnaW5nIGRldmVsb3BtZW50IGRlYnVnIG1lc3NhZ2VzLlxuICAgICAqL1xuICAgIHNmLmxvZ2dlci5hZGRDYXNlKCdkZXZlbCcsIGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgICBzZi5sb2dnZXIucmVjb3JkKGNyZWF0ZURlYnVnUmVjb3JkKExPR19MRVZFTFMuREVWX0RFQlVHLCAnZGV2ZWwnLCBtZXNzYWdlLCBudWxsLCBmYWxzZSwgYXJndW1lbnRzLCAwKSk7XG4gICAgfSwgW1xuICAgICAgICB7XG4gICAgICAgICAgICAnbWVzc2FnZSc6J2V4cGxhbmF0aW9uJ1xuICAgICAgICB9XG4gICAgXSk7XG5cbiAgICAvKipcbiAgICAgKiBBZGRpbmcgY2FzZSBmb3IgbG9nZ2luZyBcIndoeXNcIiByZWFzb25pbmcgbWVzc2FnZXMuXG4gICAgICovXG4gICAgc2YubG9nZ2VyLmFkZENhc2UoXCJsb2dXaHlcIiwgZnVuY3Rpb24obG9nT25seUN1cnJlbnRXaHlDb250ZXh0KXtcbiAgICAgICAgc2YubG9nZ2VyLnJlY29yZChjcmVhdGVEZWJ1Z1JlY29yZChMT0dfTEVWRUxTLldIWVMsICdsb2d3aHknLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBsb2dPbmx5Q3VycmVudFdoeUNvbnRleHQpKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEFkZGluZyBjYXNlIGZvciBsb2dnaW5nIGFzc2VydHMgbWVzc2FnZXMgdG8gcnVubmluZyB0ZXN0cy5cbiAgICAgKi9cbiAgICBzZi5sb2dnZXIuYWRkQ2FzZShcInJlY29yZEFzc2VydFwiLCBmdW5jdGlvbiAobWVzc2FnZSwgZXJyb3Isc2hvd1N0YWNrKXtcbiAgICAgICAgc2YubG9nZ2VyLnJlY29yZChjcmVhdGVEZWJ1Z1JlY29yZChMT0dfTEVWRUxTLlRFU1RfUkVTVUxULCAnYXNzZXJ0JywgbWVzc2FnZSwgZXJyb3IsIHNob3dTdGFjaykpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogR2VuZXJpYyBtZXRob2QgdG8gY3JlYXRlIHN0cnVjdHVyZWQgZGVidWcgcmVjb3JkcyBiYXNlZCBvbiB0aGUgbG9nIGxldmVsLlxuICAgICAqIEBwYXJhbSBsZXZlbCB7TnVtYmVyfSAtIG51bWJlciBmcm9tIDEtMTEsIHVzZWQgdG8gaWRlbnRpZnkgdGhlIGxldmVsIG9mIGF0dGVudGlvbiB0aGF0IGEgbG9nIGVudHJ5IHNob3VsZCBnZXQgZnJvbSBvcGVyYXRpb25zIHBvaW50IG9mIHZpZXdcbiAgICAgKiBAcGFyYW0gdHlwZSB7U3RyaW5nfSAtIGlkZW50aWZpZXIgbmFtZSBmb3IgbG9nIHR5cGVcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSB7U3RyaW5nfSAtIGRlc2NyaXB0aW9uIG9mIHRoZSBkZWJ1ZyByZWNvcmRcbiAgICAgKiBAcGFyYW0gZXhjZXB0aW9uIHtTdHJpbmd9IC0gZXhjZXB0aW9uIGRldGFpbHMgaWYgYW55XG4gICAgICogQHBhcmFtIHNhdmVTdGFjayB7Qm9vbGVhbn0gLSBpZiBzZXQgdG8gdHJ1ZSwgdGhlIGV4Y2VwdGlvbiBjYWxsIHN0YWNrIHdpbGwgYmUgYWRkZWQgdG8gdGhlIGRlYnVnIHJlY29yZFxuICAgICAqIEBwYXJhbSBhcmdzIHtBcnJheX0gLSBhcmd1bWVudHMgb2YgdGhlIGNhbGxlciBmdW5jdGlvblxuICAgICAqIEBwYXJhbSBwb3Mge051bWJlcn0gLSBwb3NpdGlvblxuICAgICAqIEBwYXJhbSBkYXRhIHtTdHJpbmd8TnVtYmVyfEFycmF5fE9iamVjdH0gLSBwYXlsb2FkIGluZm9ybWF0aW9uXG4gICAgICogQHBhcmFtIGxvZ09ubHlDdXJyZW50V2h5Q29udGV4dCAtIGlmIHdoeXMgaXMgZW5hYmxlZCwgb25seSB0aGUgY3VycmVudCBjb250ZXh0IHdpbGwgYmUgbG9nZ2VkXG4gICAgICogQHJldHVybnMgRGVidWcgcmVjb3JkIG1vZGVsIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6XG4gICAgICogW3JlcXVpcmVkXTogbGV2ZWw6ICosIHR5cGU6ICosIHRpbWVzdGFtcDogbnVtYmVyLCBtZXNzYWdlOiAqLCBkYXRhOiAqIGFuZFxuICAgICAqIFtvcHRpb25hbF06IHN0YWNrOiAqLCBleGNlcHRpb246ICosIGFyZ3M6ICosIHdoeUxvZzogKlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZURlYnVnUmVjb3JkKGxldmVsLCB0eXBlLCBtZXNzYWdlLCBleGNlcHRpb24sIHNhdmVTdGFjaywgYXJncywgcG9zLCBkYXRhLCBsb2dPbmx5Q3VycmVudFdoeUNvbnRleHQpe1xuXG4gICAgICAgIHZhciByZXQgPSB7XG4gICAgICAgICAgICBsZXZlbDogbGV2ZWwsXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgdGltZXN0YW1wOiAobmV3IERhdGUoKSkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfTtcblxuICAgICAgICBpZihzYXZlU3RhY2spe1xuICAgICAgICAgICAgdmFyIHN0YWNrID0gJyc7XG4gICAgICAgICAgICBpZihleGNlcHRpb24pe1xuICAgICAgICAgICAgICAgIHN0YWNrID0gZXhjZXB0aW9uLnN0YWNrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdGFjayAgPSAobmV3IEVycm9yKCkpLnN0YWNrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0LnN0YWNrID0gc3RhY2s7XG4gICAgICAgIH1cblxuICAgICAgICBpZihleGNlcHRpb24pe1xuICAgICAgICAgICAgcmV0LmV4Y2VwdGlvbiA9IGV4Y2VwdGlvbi5tZXNzYWdlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoYXJncyl7XG4gICAgICAgICAgICByZXQuYXJncyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoYXJncykpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYocHJvY2Vzcy5lbnYuUlVOX1dJVEhfV0hZUyl7XG4gICAgICAgICAgICB2YXIgd2h5ID0gcmVxdWlyZSgnd2h5cycpO1xuICAgICAgICAgICAgaWYobG9nT25seUN1cnJlbnRXaHlDb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgcmV0Wyd3aHlMb2cnXSA9IHdoeS5nZXRHbG9iYWxDdXJyZW50Q29udGV4dCgpLmdldEV4ZWN1dGlvblN1bW1hcnkoKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHJldFsnd2h5TG9nJ10gPSB3aHkuZ2V0QWxsQ29udGV4dHMoKS5tYXAoZnVuY3Rpb24gKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0RXhlY3V0aW9uU3VtbWFyeSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbn07XG5cbiIsImNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuY29uc3QgZm9ya2VyID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpO1xuXG5jb25zdCBERUZBVUxUX1RJTUVPVVQgPSAyMDAwO1xuXG52YXIgZ2xvYlRvUmVnRXhwID0gIHJlcXVpcmUoXCIuL3V0aWxzL2dsb2ItdG8tcmVnZXhwXCIpO1xuXG52YXIgZGVmYXVsdENvbmZpZyA9IHtcbiAgICBjb25mRmlsZU5hbWU6IFwiZG91YmxlLWNoZWNrLmpzb25cIiwgICAgICAvLyBuYW1lIG9mIHRoZSBjb25mIGZpbGVcbiAgICBmaWxlRXh0OiBcIi5qc1wiLCAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0ZXN0IGZpbGUgc3VwcG9ydGVkIGJ5IGV4dGVuc2lvblxuICAgIG1hdGNoRGlyczogWyAndGVzdCcsICd0ZXN0cycgXSwgICAgICAgICAgIC8vIGRpcnMgbmFtZXMgZm9yIHRlc3RzIC0gY2FzZSBpbnNlbnNpdGl2ZSAodXNlZCBpbiBkaXNjb3ZlcnkgcHJvY2VzcylcbiAgICB0ZXN0c0RpcjogcHJvY2Vzcy5jd2QoKSwgICAgICAgICAgICAgICAgLy8gcGF0aCB0byB0aGUgcm9vdCB0ZXN0cyBsb2NhdGlvblxuICAgIHJlcG9ydHM6IHtcbiAgICAgICAgYmFzZVBhdGg6IHByb2Nlc3MuY3dkKCksICAgICAgICAgICAgLy8gcGF0aCB3aGVyZSB0aGUgcmVwb3J0cyB3aWxsIGJlIHNhdmVkXG4gICAgICAgIHByZWZpeDogXCJSZXBvcnQtXCIsICAgICAgICAgICAgICAgICAgLy8gcHJlZml4IGZvciByZXBvcnQgZmlsZXMsIGZpbGVuYW1lIHBhdHRlcm46IFtwcmVmaXhdLXt0aW1lc3RhbXB9e2V4dH1cbiAgICAgICAgZXh0OiBcIi50eHRcIiAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZXBvcnQgZmlsZSBleHRlbnNpb25cbiAgICB9XG59O1xuXG5jb25zdCBUQUcgPSBcIltURVNUX1JVTk5FUl1cIjtcbmNvbnN0IE1BWF9XT1JLRVJTID0gcHJvY2Vzcy5lbnZbJ0RPVUJMRV9DSEVDS19QT09MX1NJWkUnXSB8fCAxMDtcbmNvbnN0IERFQlVHID0gdHlwZW9mIHY4ZGVidWcgPT09ICdvYmplY3QnO1xuXG5jb25zdCBURVNUX1NUQVRFUyA9IHtcbiAgICBSRUFEWTogJ3JlYWR5JyxcbiAgICBSVU5OSU5HOiAncnVubmluZycsXG4gICAgRklOSVNIRUQ6ICdmaW5pc2hlZCcsXG4gICAgVElNRU9VVDogJ3RpbWVvdXQnXG59O1xuXG4vLyBTZXNzaW9uIG9iamVjdFxudmFyIGRlZmF1bHRTZXNzaW9uID0ge1xuICAgIHRlc3RDb3VudDogMCxcbiAgICBjdXJyZW50VGVzdEluZGV4OiAwLFxuICAgIGRlYnVnUG9ydDogcHJvY2Vzcy5kZWJ1Z1BvcnQsICAgLy8gY3VycmVudCBwcm9jZXNzIGRlYnVnIHBvcnQuIFRoZSBjaGlsZCBwcm9jZXNzIHdpbGwgYmUgaW5jcmVhc2VkIGZyb20gdGhpcyBwb3J0XG4gICAgd29ya2Vyczoge1xuICAgICAgICBydW5uaW5nOiAwLFxuICAgICAgICB0ZXJtaW5hdGVkOiAwXG4gICAgfVxufTtcblxuLy8gVGVtcGxhdGUgc3RydWN0dXJlIGZvciB0ZXN0IHJlcG9ydHMuXG52YXIgcmVwb3J0RmlsZVN0cnVjdHVyZSA9IHtcbiAgICBjb3VudDogMCxcbiAgICBzdWl0ZXM6IHtcbiAgICAgICAgY291bnQ6IDAsXG4gICAgICAgIGl0ZW1zOiBbXVxuICAgIH0sXG4gICAgcGFzc2VkOiB7XG4gICAgICAgIGNvdW50OiAwLFxuICAgICAgICBpdGVtczogW11cbiAgICB9LFxuICAgIGZhaWxlZDoge1xuICAgICAgICBjb3VudDogMCxcbiAgICAgICAgaXRlbXM6IFtdXG4gICAgfSxcbn07XG5cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uKHNmKXtcbiAgICBzZi50ZXN0UnVubmVyID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogSW5pdGlhbGl6YXRpb24gb2YgdGhlIHRlc3QgcnVubmVyLlxuICAgICAgICAgKiBAcGFyYW0gY29uZmlnIHtPYmplY3R9IC0gc2V0dGluZ3Mgb2JqZWN0IHRoYXQgd2lsbCBiZSBtZXJnZWQgd2l0aCB0aGUgZGVmYXVsdCBvbmVcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9faW5pdDogZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZyA9IHRoaXMuX19leHRlbmQoZGVmYXVsdENvbmZpZywgY29uZmlnKTtcbiAgICAgICAgICAgIHRoaXMudGVzdFRyZWUgPSB7fTtcbiAgICAgICAgICAgIHRoaXMudGVzdExpc3QgPSBbXTtcblxuICAgICAgICAgICAgdGhpcy5zZXNzaW9uID0gZGVmYXVsdFNlc3Npb247XG5cbiAgICAgICAgICAgIC8vIGNyZWF0ZSByZXBvcnRzIGRpcmVjdG9yeSBpZiBub3QgZXhpc3RcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyh0aGlzLmNvbmZpZy5yZXBvcnRzLmJhc2VQYXRoKSl7XG4gICAgICAgICAgICAgICAgZnMubWtkaXJTeW5jKHRoaXMuY29uZmlnLnJlcG9ydHMuYmFzZVBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogTWFpbiBlbnRyeSBwb2ludC4gSXQgd2lsbCBzdGFydCB0aGUgZmxvdyBydW5uZXIgZmxvdy5cbiAgICAgICAgICogQHBhcmFtIGNvbmZpZyB7T2JqZWN0fSAtIG9iamVjdCBjb250YWluaW5nIHNldHRpbmdzIHN1Y2ggYXMgY29uZiBmaWxlIG5hbWUsIHRlc3QgZGlyLlxuICAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2sge0Z1bmN0aW9ufSAtIGhhbmRsZXIoZXJyb3IsIHJlc3VsdCkgaW52b2tlZCB3aGVuIGFuIGVycm9yIG9jY3VycmVkIG9yIHRoZSBydW5uZXIgaGFzIGNvbXBsZXRlZCBhbGwgam9icy5cbiAgICAgICAgICovXG4gICAgICAgIHN0YXJ0OiBmdW5jdGlvbihjb25maWcsIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgICAgIC8vIHdyYXBwZXIgZm9yIHByb3ZpZGVkIGNhbGxiYWNrLCBpZiBhbnlcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2sgPSBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fZGVidWdJbmZvKGVyci5tZXNzYWdlIHx8IGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyciwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLl9faW5pdChjb25maWcpO1xuXG4gICAgICAgICAgICB0aGlzLl9fY29uc29sZUxvZyhcIkRpc2NvdmVyaW5nIHRlc3RzIC4uLlwiKTtcbiAgICAgICAgICAgIHRoaXMudGVzdFRyZWUgPSB0aGlzLl9fZGlzY292ZXJUZXN0RmlsZXModGhpcy5jb25maWcudGVzdHNEaXIsIGNvbmZpZyk7XG4gICAgICAgICAgICB0aGlzLnRlc3RMaXN0ID0gdGhpcy5fX3RvVGVzdFRyZWVUb0xpc3QodGhpcy50ZXN0VHJlZSk7XG4gICAgICAgICAgICB0aGlzLl9fbGF1bmNoVGVzdHMoKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlYWRzIGNvbmZpZ3VyYXRpb24gc2V0dGluZ3MgZnJvbSBhIGpzb24gZmlsZS5cbiAgICAgICAgICogQHBhcmFtIGNvbmZQYXRoIHtTdHJpbmd9IC0gYWJzb2x1dGUgcGF0aCB0byB0aGUgY29uZmlndXJhdGlvbiBmaWxlLlxuICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHt7fX1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9fcmVhZENvbmY6IGZ1bmN0aW9uKGNvbmZQYXRoKSB7XG4gICAgICAgICAgICB2YXIgY29uZmlnID0ge307XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgY29uZmlnID0gcmVxdWlyZShjb25mUGF0aCk7XG4gICAgICAgICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjb25maWc7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEaXNjb3ZlcnMgdGVzdCBmaWxlcyByZWN1cnNpdmVseSBzdGFydGluZyBmcm9tIGEgcGF0aC4gVGhlIGRpciBpcyB0aGUgcm9vdCBvZiB0aGUgdGVzdCBmaWxlcy4gSXQgY2FuIGNvbnRhaW5zXG4gICAgICAgICAqIHRlc3QgZmlsZXMgYW5kIHRlc3Qgc3ViIGRpcmVjdG9yaWVzLiBJdCB3aWxsIGNyZWF0ZSBhIHRyZWUgc3RydWN0dXJlIHdpdGggdGhlIHRlc3QgZmlsZXMgZGlzY292ZXJlZC5cbiAgICAgICAgICogTm90ZXM6IE9ubHkgdGhlIGNvbmZpZy5tYXRjaERpcnMgd2lsbCBiZSB0YWtlbiBpbnRvIGNvbnNpZGVyYXRpb24uIEFsc28sIGJhc2VkIG9uIHRoZSBjb25mIChkb3VibGUtY2hlY2suanNvbilcbiAgICAgICAgICogaXQgd2lsbCBpbmNsdWRlIHRoZSB0ZXN0IGZpbGVzIG9yIG5vdC5cbiAgICAgICAgICogQHBhcmFtIGRpciB7U3RyaW5nfSAtIHBhdGggd2hlcmUgdGhlIGRpc2NvdmVyeSBwcm9jZXNzIHN0YXJ0c1xuICAgICAgICAgKiBAcGFyYW0gcGFyZW50Q29uZiB7U3RyaW5nfSAtIGNvbmZpZ3VyYXRpb24gb2JqZWN0IChkb3VibGUtY2hlY2suanNvbikgZnJvbSB0aGUgcGFyZW50IGRpcmVjdG9yeVxuICAgICAgICAgKiBAcmV0dXJucyBUaGUgcm9vdCBub2RlIG9iamVjdCBvZiB0aGUgZmlsZSBzdHJ1Y3R1cmUgdHJlZS4gRS5nLiB7Knx7X19tZXRhLCBkYXRhLCByZXN1bHQsIGl0ZW1zfX1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9fZGlzY292ZXJUZXN0RmlsZXM6IGZ1bmN0aW9uKGRpciwgcGFyZW50Q29uZikge1xuICAgICAgICAgICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGRpcik7XG4gICAgICAgICAgICBpZighc3RhdC5pc0RpcmVjdG9yeSgpKXtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZGlyICsgXCIgaXMgbm90IGEgZGlyZWN0b3J5IVwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGN1cnJlbnRDb25mID0gcGFyZW50Q29uZjtcblxuICAgICAgICAgICAgbGV0IGN1cnJlbnROb2RlID0gdGhpcy5fX2dldERlZmF1bHROb2RlU3RydWN0dXJlKCk7XG4gICAgICAgICAgICBjdXJyZW50Tm9kZS5fX21ldGEucGFyZW50ID0gcGF0aC5kaXJuYW1lKGRpcik7XG4gICAgICAgICAgICBjdXJyZW50Tm9kZS5fX21ldGEuaXNEaXJlY3RvcnkgPSB0cnVlO1xuXG4gICAgICAgICAgICBsZXQgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhkaXIpO1xuICAgICAgICAgICAgLy8gZmlyc3QgbG9vayBmb3IgY29uZiBmaWxlXG4gICAgICAgICAgICBpZihmaWxlcy5pbmRleE9mKHRoaXMuY29uZmlnLmNvbmZGaWxlTmFtZSkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgbGV0IGZkID0gcGF0aC5qb2luKGRpciwgdGhpcy5jb25maWcuY29uZkZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICBsZXQgY29uZiA9IHRoaXMuX19yZWFkQ29uZihmZCk7XG4gICAgICAgICAgICAgICAgaWYoY29uZikge1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50Tm9kZS5fX21ldGEuY29uZiA9IGNvbmY7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRDb25mID0gY29uZjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN1cnJlbnROb2RlLmRhdGEubmFtZSA9IHBhdGguYmFzZW5hbWUoZGlyKTtcbiAgICAgICAgICAgIGN1cnJlbnROb2RlLmRhdGEucGF0aCA9IGRpcjtcbiAgICAgICAgICAgIGN1cnJlbnROb2RlLml0ZW1zID0gW107XG5cbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDAsIGxlbiA9IGZpbGVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBmaWxlc1tpXTtcblxuICAgICAgICAgICAgICAgIGxldCBmZCA9IHBhdGguam9pbihkaXIsIGl0ZW0pO1xuICAgICAgICAgICAgICAgIGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoZmQpO1xuICAgICAgICAgICAgICAgIGxldCBpc0RpciA9IHN0YXQuaXNEaXJlY3RvcnkoKTtcbiAgICAgICAgICAgICAgICBsZXQgaXNUZXN0RGlyID0gdGhpcy5fX2lzVGVzdERpcihmZCk7XG5cbiAgICAgICAgICAgICAgICBpZihpc0RpciAmJiAhaXNUZXN0RGlyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlOyAvLyBpZ25vcmUgZGlycyB0aGF0IGRvZXMgbm90IGZvbGxvdyB0aGUgbmFtaW5nIHJ1bGUgZm9yIHRlc3QgZGlyc1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmKCFpc0RpciAmJiBpdGVtLm1hdGNoKHRoaXMuY29uZmlnLmNvbmZGaWxlTmFtZSkpe1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTsgLy8gYWxyZWFkeSBwcm9jZXNzZWRcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBleGNsdWRlIGZpbGVzIGJhc2VkIG9uIGdsb2IgcGF0dGVybnNcbiAgICAgICAgICAgICAgICBpZihjdXJyZW50Q29uZikge1xuICAgICAgICAgICAgICAgICAgICAvLyBjdXJyZW50Q29uZlsnaWdub3JlJ10gLSBhcnJheSBvZiByZWdFeHBcbiAgICAgICAgICAgICAgICAgICAgaWYoY3VycmVudENvbmZbJ2lnbm9yZSddKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc01hdGNoID0gdGhpcy5fX2lzQW55TWF0Y2goY3VycmVudENvbmZbJ2lnbm9yZSddLCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzTWF0Y2gpIHtjb250aW51ZTt9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBsZXQgY2hpbGROb2RlID0gdGhpcy5fX2dldERlZmF1bHROb2RlU3RydWN0dXJlKCk7XG4gICAgICAgICAgICAgICAgY2hpbGROb2RlLl9fbWV0YS5jb25mID0ge307XG4gICAgICAgICAgICAgICAgY2hpbGROb2RlLl9fbWV0YS5pc0RpcmVjdG9yeSA9IGlzRGlyO1xuICAgICAgICAgICAgICAgIGNoaWxkTm9kZS5fX21ldGEucGFyZW50ID0gcGF0aC5kaXJuYW1lKGZkKTtcblxuICAgICAgICAgICAgICAgIGlmIChpc0Rpcikge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdGVtcENoaWxkTm9kZSA9IHRoaXMuX19kaXNjb3ZlclRlc3RGaWxlcyhmZCwgY3VycmVudENvbmYpO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZE5vZGUgPSBPYmplY3QuYXNzaWduKGNoaWxkTm9kZSwgdGVtcENoaWxkTm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnROb2RlLml0ZW1zLnB1c2goY2hpbGROb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZihwYXRoLmV4dG5hbWUoZmQpID09PSAgdGhpcy5jb25maWcuZmlsZUV4dCl7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkTm9kZS5fX21ldGEuY29uZi5ydW5zID0gY3VycmVudENvbmZbJ3J1bnMnXSB8fCAxO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZE5vZGUuX19tZXRhLmNvbmYuc2lsZW50ID0gY3VycmVudENvbmZbJ3NpbGVudCddO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZE5vZGUuX19tZXRhLmNvbmYudGltZW91dCA9IGN1cnJlbnRDb25mWyd0aW1lb3V0J10gfHwgREVGQVVMVF9USU1FT1VUO1xuXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkTm9kZS5kYXRhLm5hbWUgPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICBjaGlsZE5vZGUuZGF0YS5wYXRoID0gZmQ7XG5cbiAgICAgICAgICAgICAgICAgICAgY3VycmVudE5vZGUuaXRlbXMucHVzaChjaGlsZE5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnROb2RlO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogTGF1bmNoIGNvbGxlY3RlZCB0ZXN0cy4gSW5pdGlhbGlzZXMgc2Vzc2lvbiB2YXJpYWJsZXMsIHRoYXQgYXJlIHNwZWNpZmljIGZvciB0aGUgY3VycmVudCBsYXVuY2guXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfX2xhdW5jaFRlc3RzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMuX19jb25zb2xlTG9nKFwiTGF1bmNoaW5nIHRlc3RzIC4uLlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2Vzc2lvbi50ZXN0Q291bnQgPSB0aGlzLnRlc3RMaXN0Lmxlbmd0aDtcbiAgICAgICAgICAgIHRoaXMuc2Vzc2lvbi5wcm9jZXNzZWRUZXN0Q291bnQgPSAwO1xuICAgICAgICAgICAgdGhpcy5zZXNzaW9uLndvcmtlcnMucnVubmluZyA9IDA7XG4gICAgICAgICAgICB0aGlzLnNlc3Npb24ud29ya2Vycy50ZXJtaW5hdGVkID0gMDtcblxuICAgICAgICAgICAgaWYodGhpcy5zZXNzaW9uLnRlc3RDb3VudCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9fc2NoZWR1bGVXb3JrKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX19kb1Rlc3RSZXBvcnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTY2hlZHVsZXMgd29yayBiYXNlZCBvbiB0aGUgTUFYIGF2YWlsYWJsZSB3b3JrZXJzLCBhbmQgYmFzZWQgb24gdGhlIG51bWJlciBvZiBydW5zIG9mIGEgdGVzdC5cbiAgICAgICAgICogSWYgYSB0ZXN0IGhhcyBtdWx0aXBsZSBydW5zIGFzIGEgb3B0aW9uLCBpdCB3aWxsIGJlIHN0YXJ0ZWQgaW4gbXVsdGlwbGUgd29ya2Vycy4gT25jZSBhbGwgcnVucyBhcmUgY29tcGxldGVkLFxuICAgICAgICAgKiB0aGUgdGVzdCBpcyBjb25zaWRlcmVkIGFzIHByb2Nlc3NlZC5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9fc2NoZWR1bGVXb3JrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHdoaWxlKHRoaXMuc2Vzc2lvbi53b3JrZXJzLnJ1bm5pbmcgPCBNQVhfV09SS0VSUyAmJiB0aGlzLnNlc3Npb24uY3VycmVudFRlc3RJbmRleCA8IHRoaXMuc2Vzc2lvbi50ZXN0Q291bnQpe1xuICAgICAgICAgICAgICAgIGxldCB0ZXN0ID0gdGhpcy50ZXN0TGlzdFt0aGlzLnNlc3Npb24uY3VycmVudFRlc3RJbmRleF07XG4gICAgICAgICAgICAgICAgaWYodGVzdC5yZXN1bHQucnVucyA8IHRlc3QuX19tZXRhLmNvbmYucnVucykge1xuICAgICAgICAgICAgICAgICAgICB0ZXN0LnJlc3VsdC5ydW5zKys7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19sYXVuY2hUZXN0KHRlc3QpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2Vzc2lvbi5jdXJyZW50VGVzdEluZGV4Kys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogTGF1bmNoIGEgdGVzdCBpbnRvIGEgc2VwYXJhdGUgd29ya2VyIChjaGlsZCBwcm9jZXNzKS5cbiAgICAgICAgICogRWFjaCB3b3JrZXIgaGFzIGhhbmRsZXJzIGZvciBtZXNzYWdlLCBleGl0IGFuZCBlcnJvciBldmVudHMuIE9uY2UgdGhlIGV4aXQgb3IgZXJyb3IgZXZlbnQgaXMgaW52b2tlZCxcbiAgICAgICAgICogbmV3IHdvcmsgaXMgc2NoZWR1bGVkIGFuZCBzZXNzaW9uIG9iamVjdCBpcyB1cGRhdGVkLlxuICAgICAgICAgKiBOb3RlczogT24gZGVidWcgbW9kZSwgdGhlIHdvcmtlcnMgd2lsbCByZWNlaXZlIGEgZGVidWcgcG9ydCwgdGhhdCBpcyBpbmNyZWFzZWQgaW5jcmVtZW50YWxseS5cbiAgICAgICAgICogQHBhcmFtIHRlc3Qge09iamVjdH0gLSB0ZXN0IG9iamVjdFxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX19sYXVuY2hUZXN0OiBmdW5jdGlvbih0ZXN0KSB7XG4gICAgICAgICAgICB0aGlzLnNlc3Npb24ud29ya2Vycy5ydW5uaW5nKys7XG5cbiAgICAgICAgICAgIHRlc3QucmVzdWx0LnN0YXRlID0gVEVTVF9TVEFURVMuUlVOTklORztcbiAgICAgICAgICAgIHRlc3QucmVzdWx0LnBhc3MgPSB0cnVlO1xuICAgICAgICAgICAgdGVzdC5yZXN1bHQuYXNzZXJ0c1t0ZXN0LnJlc3VsdC5ydW5zXSA9IFtdO1xuICAgICAgICAgICAgdGVzdC5yZXN1bHQubWVzc2FnZXNbdGVzdC5yZXN1bHQucnVuc10gPSBbXTtcblxuICAgICAgICAgICAgbGV0IGVudiA9IHByb2Nlc3MuZW52O1xuXG4gICAgICAgICAgICBsZXQgZXhlY0FyZ3YgPSBbXTtcbiAgICAgICAgICAgIGlmKERFQlVHKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVidWdQb3J0ID0gKytkZWZhdWx0U2Vzc2lvbi5kZWJ1Z1BvcnQ7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVidWdGbGFnID0gJy0tZGVidWc9JyArIGRlYnVnUG9ydDtcbiAgICAgICAgICAgICAgICBleGVjQXJndi5wdXNoKGRlYnVnRmxhZyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGN3ZCA9IHRlc3QuX19tZXRhLnBhcmVudDtcblxuICAgICAgICAgICAgbGV0IHdvcmtlciA9IGZvcmtlci5mb3JrKHRlc3QuZGF0YS5wYXRoLCBbXSwgeydjd2QnOiBjd2QsICdlbnYnOiBlbnYsICdleGVjQXJndic6IGV4ZWNBcmd2LCBzdGRpbzogWyAnaW5oZXJpdCcsIFwicGlwZVwiLCAnaW5oZXJpdCcsICdpcGMnIF0sIHNpbGVudDpmYWxzZSB9KTtcblxuICAgICAgICAgICAgdGhpcy5fX2RlYnVnSW5mbyhgTGF1bmNoaW5nIHRlc3QgJHt0ZXN0LmRhdGEubmFtZX0sIHJ1blske3Rlc3QucmVzdWx0LnJ1bnN9XSwgb24gd29ya2VyIHBpZFske3dvcmtlci5waWR9XSBgK25ldyBEYXRlKCkuZ2V0VGltZSgpKTtcblxuICAgICAgICAgICAgd29ya2VyLm9uKFwibWVzc2FnZVwiLCBvbk1lc3NhZ2VFdmVudEhhbmRsZXJXcmFwcGVyKHRlc3QpKTtcbiAgICAgICAgICAgIHdvcmtlci5vbihcImV4aXRcIiwgb25FeGl0RXZlbnRIYW5kbGVyV3JhcHBlcih0ZXN0KSk7XG4gICAgICAgICAgICB3b3JrZXIub24oXCJlcnJvclwiLCBvbkVycm9yRXZlbnRIYW5kbGVyV3JhcHBlcih0ZXN0KSk7XG5cbiAgICAgICAgICAgIHdvcmtlci50ZXJtaW5hdGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgIHdvcmtlci5zdGRvdXQub24oJ2RhdGEnLCBmdW5jdGlvbiAoY2h1bmspIHtcbiAgICAgICAgICAgICAgICBsZXQgY29udGVudCA9IG5ldyBCdWZmZXIoY2h1bmspLnRvU3RyaW5nKCd1dGY4Jyk7IC8vVE9ETzogcmVwbGFjZSB3aXRoIFBTS0JVRkZFUlxuICAgICAgICAgICAgICAgIGlmKHRlc3QuX19tZXRhLmNvbmYuc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19jb25zb2xlTG9nKGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIGZ1bmN0aW9uIG9uTWVzc2FnZUV2ZW50SGFuZGxlcldyYXBwZXIodGVzdCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRSdW4gPSB0ZXN0LnJlc3VsdC5ydW5zO1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihsb2cpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobG9nLnR5cGUgPT09ICdhc3NlcnQnKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGxvZy5tZXNzYWdlLmluY2x1ZGVzKFwiW0ZhaWxcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXN0LnJlc3VsdC5wYXNzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXN0LnJlc3VsdC5hc3NlcnRzW2N1cnJlbnRSdW5dLnB1c2gobG9nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3QucmVzdWx0Lm1lc3NhZ2VzW2N1cnJlbnRSdW5dLnB1c2gobG9nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIG9uRXhpdEV2ZW50SGFuZGxlcldyYXBwZXIodGVzdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihjb2RlLCBzaWduYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHdvcmtlci50aW1lclZhcik7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX19kZWJ1Z0luZm8oYFdvcmtlciAke3dvcmtlci5waWR9IC0gZXhpdCBldmVudC4gQ29kZSAke2NvZGV9LCBzaWduYWwgJHtzaWduYWx9IGArbmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuXG4gICAgICAgICAgICAgICAgICAgIHdvcmtlci50ZXJtaW5hdGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICB0ZXN0LnJlc3VsdC5zdGF0ZSA9IFRFU1RfU1RBVEVTLkZJTklTSEVEO1xuICAgICAgICAgICAgICAgICAgICBpZihjb2RlICE9PSBudWxsICYmIGNvZGUhPT0wIC8qJiYgdHlwZW9mIHRlc3QucmVzdWx0LnBhc3MgPT09ICd1bmRlZmluZWQnKi8pe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdC5yZXN1bHQucGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdC5yZXN1bHQubWVzc2FnZXNbdGVzdC5yZXN1bHQucnVuc10ucHVzaCgge21lc3NhZ2U6IFwiUHJvY2VzcyBmaW5pc2hlZCB3aXRoIGVycm9ycyFcIiwgXCJFeGl0IGNvZGVcIjpjb2RlLCBcIlNpZ25hbFwiOnNpZ25hbH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgc2VsZi5zZXNzaW9uLndvcmtlcnMucnVubmluZy0tO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnNlc3Npb24ud29ya2Vycy50ZXJtaW5hdGVkKys7XG5cbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fX3NjaGVkdWxlV29yaygpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9fY2hlY2tXb3JrZXJzU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGhpcyBoYW5kbGVyIGNhbiBiZSB0cmlnZ2VyZWQgd2hlbjpcbiAgICAgICAgICAgIC8vIDEuIFRoZSBwcm9jZXNzIGNvdWxkIG5vdCBiZSBzcGF3bmVkLCBvclxuICAgICAgICAgICAgLy8gMi4gVGhlIHByb2Nlc3MgY291bGQgbm90IGJlIGtpbGxlZCwgb3JcbiAgICAgICAgICAgIC8vIDMuIFNlbmRpbmcgYSBtZXNzYWdlIHRvIHRoZSBjaGlsZCBwcm9jZXNzIGZhaWxlZC5cbiAgICAgICAgICAgIC8vIElNUE9SVEFOVDogVGhlICdleGl0JyBldmVudCBtYXkgb3IgbWF5IG5vdCBmaXJlIGFmdGVyIGFuIGVycm9yIGhhcyBvY2N1cnJlZCFcbiAgICAgICAgICAgIGZ1bmN0aW9uIG9uRXJyb3JFdmVudEhhbmRsZXJXcmFwcGVyKHRlc3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fX2RlYnVnSW5mbyhgV29ya2VyICR7d29ya2VyLnBpZH0gLSBlcnJvciBldmVudC5gLCB0ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fX2RlYnVnRXJyb3IoZXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuc2Vzc2lvbi53b3JrZXJzLnJ1bm5pbmctLTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5zZXNzaW9uLndvcmtlcnMudGVybWluYXRlZCsrO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5vdGU6IG9uIGRlYnVnLCB0aGUgdGltZW91dCBpcyByZWFjaGVkIGJlZm9yZSBleGl0IGV2ZW50IGlzIGNhbGxlZFxuICAgICAgICAgICAgLy8gd2hlbiBraWxsIGlzIGNhbGxlZCwgdGhlIGV4aXQgZXZlbnQgaXMgcmFpc2VkXG4gICAgICAgICAgICB3b3JrZXIudGltZXJWYXIgPSBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICAgICAgaWYoIXdvcmtlci50ZXJtaW5hdGVkKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2NvbnNvbGVMb2coYHdvcmtlciBwaWQgWyR7d29ya2VyLnBpZH1dIC0gdGltZW91dCBldmVudGAsbmV3IERhdGUoKS5nZXRUaW1lKCksICB0ZXN0KTtcblxuICAgICAgICAgICAgICAgICAgICBpZih0ZXN0LnJlc3VsdC5zdGF0ZSAhPT0gVEVTVF9TVEFURVMuRklOSVNIRUQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdC5yZXN1bHQucGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHdvcmtlci5raWxsKCk7XG4gICAgICAgICAgICAgICAgICAgIHRlc3QucmVzdWx0LnN0YXRlID0gVEVTVF9TVEFURVMuVElNRU9VVDtcbiAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJHb3Qgc29tZXRoaW5nLCBidXQgZG9uJ3Qga25vdyB3aGF0Li4uXCIsIHRlc3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRlc3QuX19tZXRhLmNvbmYudGltZW91dCk7XG5cbiAgICAgICAgICAgICAgICBzZWxmLl9fZGVidWdJbmZvKGBXb3JrZXIgJHt3b3JrZXIucGlkfSAtIHNldCB0aW1lb3V0IGV2ZW50IGF0IGArbmV3IERhdGUoKS5nZXRUaW1lKCkgKyBcIiBmb3IgXCIrdGVzdC5fX21ldGEuY29uZi50aW1lb3V0KTtcblxuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogQ2hlY2tzIGlmIGFsbCB3b3JrZXJzIGNvbXBsZXRlZCB0aGVpciBqb2IgKGZpbmlzaGVkIG9yIGhhdmUgYmVlbiB0ZXJtaW5hdGVkKS5cbiAgICAgICAgICogSWYgdHJ1ZSwgdGhlbiB0aGUgcmVwb3J0aW5nIHN0ZXBzIGNhbiBiZSBzdGFydGVkLlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX19jaGVja1dvcmtlcnNTdGF0dXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYodGhpcy5zZXNzaW9uLndvcmtlcnMucnVubmluZyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX19kb1Rlc3RSZXBvcnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIHRlc3QgcmVwb3J0cyBvYmplY3QgKEpTT04pIHRoYXQgd2lsbCBiZSBzYXZlZCBpbiB0aGUgdGVzdCByZXBvcnQuXG4gICAgICAgICAqIEZpbGVuYW1lIG9mIHRoZSByZXBvcnQgaXMgdXNpbmcgdGhlIGZvbGxvd2luZyBwYXR0ZXJuOiB7cHJlZml4fS17dGltZXN0YW1wfXtleHR9XG4gICAgICAgICAqIFRoZSBmaWxlIHdpbGwgYmUgc2F2ZWQgaW4gY29uZmlnLnJlcG9ydHMuYmFzZVBhdGguXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfX2RvVGVzdFJlcG9ydHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5fX2NvbnNvbGVMb2coXCJEb2luZyByZXBvcnRzIC4uLlwiKTtcbiAgICAgICAgICAgIHJlcG9ydEZpbGVTdHJ1Y3R1cmUuY291bnQgPSB0aGlzLnRlc3RMaXN0Lmxlbmd0aDtcblxuICAgICAgICAgICAgLy8gcGFzcy9mYWlsZWQgdGVzdHNcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDAsIGxlbiA9IHRoaXMudGVzdExpc3QubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgdGVzdCA9IHRoaXMudGVzdExpc3RbaV07XG5cbiAgICAgICAgICAgICAgICBsZXQgdGVzdFBhdGggPSB0aGlzLl9fdG9SZWxhdGl2ZVBhdGgodGVzdC5kYXRhLnBhdGgpO1xuICAgICAgICAgICAgICAgIGxldCBpdGVtID0ge3BhdGg6IHRlc3RQYXRofTtcbiAgICAgICAgICAgICAgICBpZih0ZXN0LnJlc3VsdC5wYXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0ucmVhc29uID0gdGhpcy5fX2dldEZpcnN0RmFpbFJlYXNvblBlclJ1bih0ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgcmVwb3J0RmlsZVN0cnVjdHVyZS5wYXNzZWQuaXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpdGVtLnJlYXNvbiA9IHRoaXMuX19nZXRGaXJzdEZhaWxSZWFzb25QZXJSdW4odGVzdCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcG9ydEZpbGVTdHJ1Y3R1cmUuZmFpbGVkLml0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVwb3J0RmlsZVN0cnVjdHVyZS5wYXNzZWQuY291bnQgPSByZXBvcnRGaWxlU3RydWN0dXJlLnBhc3NlZC5pdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICByZXBvcnRGaWxlU3RydWN0dXJlLmZhaWxlZC5jb3VudCA9IHJlcG9ydEZpbGVTdHJ1Y3R1cmUuZmFpbGVkLml0ZW1zLmxlbmd0aDtcblxuICAgICAgICAgICAgLy8gc3VpdGVzIChmaXJzdCBsZXZlbCBvZiBkaXJlY3RvcmllcylcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDAsIGxlbiA9IHRoaXMudGVzdFRyZWUuaXRlbXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IHRoaXMudGVzdFRyZWUuaXRlbXNbaV07XG4gICAgICAgICAgICAgICAgaWYoaXRlbS5fX21ldGEuaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN1aXRlUGF0aCA9IHRoaXMuX190b1JlbGF0aXZlUGF0aChpdGVtLmRhdGEucGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcG9ydEZpbGVTdHJ1Y3R1cmUuc3VpdGVzLml0ZW1zLnB1c2goc3VpdGVQYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXBvcnRGaWxlU3RydWN0dXJlLnN1aXRlcy5jb3VudCA9IHJlcG9ydEZpbGVTdHJ1Y3R1cmUuc3VpdGVzLml0ZW1zLmxlbmd0aDtcblxuICAgICAgICAgICAgbGV0IG51bWJlck9mUmVwb3J0cyA9IDI7XG5cbiAgICAgICAgICAgIGxldCBmaW5pc2hSZXBvcnRzID0gKGVyciwgcmVzKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYobnVtYmVyT2ZSZXBvcnRzID4gMSl7XG4gICAgICAgICAgICAgICAgICAgIG51bWJlck9mUmVwb3J0cyAtPSAxO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKHJlcG9ydEZpbGVTdHJ1Y3R1cmUuZmFpbGVkLmNvdW50ID09PSAwKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2NvbnNvbGVMb2coXCJcXG5FdmVyeXRoaW5nIHdlbnQgd2VsbCEgTm8gZmFpbGVkIHRlc3RzLlxcblxcblwiKTtcbiAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2NvbnNvbGVMb2coXCJcXG5Tb21lIHRlc3RzIGZhaWxlZC4gQ2hlY2sgcmVwb3J0IGZpbGVzIVxcblxcblwiKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLmNhbGxiYWNrKGVyciwgXCJEb25lXCIpO1xuICAgICAgICAgICAgfTtcblxuXG4gICAgICAgICAgICB0aGlzLl9fY29uc29sZUxvZyh0aGlzLmNvbmZpZy5yZXBvcnRzLnByZWZpeCk7XG4gICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IGAke3RoaXMuY29uZmlnLnJlcG9ydHMucHJlZml4fWxhdGVzdCR7dGhpcy5jb25maWcucmVwb3J0cy5leHR9YDtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKHRoaXMuY29uZmlnLnJlcG9ydHMuYmFzZVBhdGgsIGZpbGVOYW1lKTtcbiAgICAgICAgICAgIHRoaXMuX19zYXZlUmVwb3J0VG9GaWxlKHJlcG9ydEZpbGVTdHJ1Y3R1cmUsIGZpbGVQYXRoLCBmaW5pc2hSZXBvcnRzKTtcblxuICAgICAgICAgICAgY29uc3QgdGltZXN0YW1wID0gbmV3IERhdGUoKS5nZXRUaW1lKCkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbnN0IGh0bWxGaWxlTmFtZSA9IGAke3RoaXMuY29uZmlnLnJlcG9ydHMucHJlZml4fWxhdGVzdC5odG1sYDtcbiAgICAgICAgICAgIGNvbnN0IGh0bWxGaWxlUGF0aCA9IHBhdGguam9pbih0aGlzLmNvbmZpZy5yZXBvcnRzLmJhc2VQYXRoLCBodG1sRmlsZU5hbWUpO1xuICAgICAgICAgICAgdGhpcy5fX3NhdmVIdG1sUmVwb3J0VG9GaWxlKHJlcG9ydEZpbGVTdHJ1Y3R1cmUsIGh0bWxGaWxlUGF0aCwgdGltZXN0YW1wLCBmaW5pc2hSZXBvcnRzKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNhdmVzIHRlc3QgcmVwb3J0cyBvYmplY3QgKEpTT04pIGluIHRoZSBzcGVjaWZpZWQgcGF0aC5cbiAgICAgICAgICogQHBhcmFtIHJlcG9ydEZpbGVTdHJ1Y3R1cmUge09iamVjdH0gLSB0ZXN0IHJlcG9ydHMgb2JqZWN0IChKU09OKVxuICAgICAgICAgKiBAcGFyYW0gZGVzdGluYXRpb24ge1N0cmluZ30gLSBwYXRoIG9mIHRoZSBmaWxlIHJlcG9ydCAodGhlIGJhc2UgcGF0aCBNVVNUIGV4aXN0KVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX19zYXZlUmVwb3J0VG9GaWxlOiBmdW5jdGlvbihyZXBvcnRGaWxlU3RydWN0dXJlLCBkZXN0aW5hdGlvbiwgY2FsbGJhY2spIHtcblxuICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShyZXBvcnRGaWxlU3RydWN0dXJlLCBudWxsLCA0KTtcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZShkZXN0aW5hdGlvbiwgY29udGVudCwgJ3V0ZjgnLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gXCJBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSB3cml0aW5nIHRoZSByZXBvcnQgZmlsZSwgd2l0aCB0aGUgZm9sbG93aW5nIGVycm9yOiBcIiArIEpTT04uc3RyaW5naWZ5KGVycik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19kZWJ1Z0luZm8obWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgICAgICB9IGVsc2V7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgRmluaXNoZWQgd3JpdGluZyByZXBvcnQgdG8gJHtkZXN0aW5hdGlvbn1gO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fY29uc29sZUxvZyhtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTYXZlcyB0ZXN0IHJlcG9ydHMgYXMgSFRNTCBpbiB0aGUgc3BlY2lmaWVkIHBhdGguXG4gICAgICAgICAqIEBwYXJhbSByZXBvcnRGaWxlU3RydWN0dXJlIHtPYmplY3R9IC0gdGVzdCByZXBvcnRzIG9iamVjdCAoSlNPTilcbiAgICAgICAgICogQHBhcmFtIGRlc3RpbmF0aW9uIHtTdHJpbmd9IC0gcGF0aCBvZiB0aGUgZmlsZSByZXBvcnQgKHRoZSBiYXNlIHBhdGggTVVTVCBleGlzdClcbiAgICAgICAgICogQHBhcmFtIHRpbWVzdGFtcCB7U3RyaW5nfSAtIHRpbWVzdGFtcCB0byBiZSBpbmplY3RlZCBpbiBodG1sIHRlbXBsYXRlXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfX3NhdmVIdG1sUmVwb3J0VG9GaWxlOiBmdW5jdGlvbiAocmVwb3J0RmlsZVN0cnVjdHVyZSwgZGVzdGluYXRpb24sIHRpbWVzdGFtcCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBmb2xkZXJOYW1lID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSk7XG4gICAgICAgICAgICBmcy5yZWFkRmlsZShwYXRoLmpvaW4oZm9sZGVyTmFtZSwnL3V0aWxzL3JlcG9ydFRlbXBsYXRlLmh0bWwnKSwgJ3V0ZjgnLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSAnQW4gZXJyb3Igb2NjdXJyZWQgd2hpbGUgcmVhZGluZyB0aGUgaHRtbCByZXBvcnQgdGVtcGxhdGUgZmlsZSwgd2l0aCB0aGUgZm9sbG93aW5nIGVycm9yOiAnICsgSlNPTi5zdHJpbmdpZnkoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2RlYnVnSW5mbyhtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZShkZXN0aW5hdGlvbiwgcmVzICsgYDxzY3JpcHQ+aW5pdCgke0pTT04uc3RyaW5naWZ5KHJlcG9ydEZpbGVTdHJ1Y3R1cmUpfSwgJHt0aW1lc3RhbXB9KTs8L3NjcmlwdD5gLCAndXRmOCcsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9ICdBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSB3cml0aW5nIHRoZSBodG1sIHJlcG9ydCBmaWxlLCB3aXRoIHRoZSBmb2xsb3dpbmcgZXJyb3I6ICcgKyBKU09OLnN0cmluZ2lmeShlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fX2RlYnVnSW5mbyhtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgRmluaXNoZWQgd3JpdGluZyByZXBvcnQgdG8gJHtkZXN0aW5hdGlvbn1gO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fY29uc29sZUxvZyhtZXNzYWdlKTtcblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb252ZXJ0cyBhYnNvbHV0ZSBmaWxlIHBhdGggdG8gcmVsYXRpdmUgcGF0aC5cbiAgICAgICAgICogQHBhcmFtIGFic29sdXRlUGF0aCB7U3RyaW5nfSAtIGFic29sdXRlIHBhdGhcbiAgICAgICAgICogQHJldHVybnMge3N0cmluZyB8IHZvaWQgfCAqfSAtIHJlbGF0aXZlIHBhdGhcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9fdG9SZWxhdGl2ZVBhdGg6IGZ1bmN0aW9uKGFic29sdXRlUGF0aCkge1xuICAgICAgICAgICAgY29uc3QgYmFzZVBhdGggPSBwYXRoLmpvaW4odGhpcy5jb25maWcudGVzdHNEaXIsIFwiL1wiKTtcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IGFic29sdXRlUGF0aC5yZXBsYWNlKGJhc2VQYXRoLCBcIlwiKTtcbiAgICAgICAgICAgIHJldHVybiByZWxhdGl2ZVBhdGg7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDaGVja3MgaWYgYSBkaXJlY3RvcnkgaXMgYSB0ZXN0IGRpciwgYnkgbWF0Y2hpbmcgaXRzIG5hbWUgYWdhaW5zdCBjb25maWcubWF0Y2hEaXJzIGFycmF5LlxuICAgICAgICAgKiBAcGFyYW0gZGlyIHtTdHJpbmd9IC0gZGlyZWN0b3J5IG5hbWVcbiAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gcmV0dXJucyB0cnVlIGlmIHRoZXJlIGlzIGEgbWF0Y2ggYW5kIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9faXNUZXN0RGlyOiBmdW5jdGlvbihkaXIpIHtcbiAgICAgICAgICAgIGlmKCF0aGlzLmNvbmZpZyB8fCAhdGhpcy5jb25maWcubWF0Y2hEaXJzICkge1xuICAgICAgICAgICAgICAgIHRocm93IGBtYXRjaERpcnMgaXMgbm90IGRlZmluZWQgb24gY29uZmlnICR7SlNPTi5zdHJpbmdpZnkodGhpcy5jb25maWcpfSBkb2VzIG5vdCBleGlzdCFgO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaXNUZXN0RGlyID0gdGhpcy5jb25maWcubWF0Y2hEaXJzLnNvbWUoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkaXIudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhpdGVtLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBpc1Rlc3REaXI7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGb3IgYSBmYWlsZWQgdGVzdCwgaXQgcmV0dXJucyBvbmx5IHRoZSBmaXJzdCBmYWlsIHJlYXNvbiBwZXIgZWFjaCBydW4uXG4gICAgICAgICAqIEBwYXJhbSB0ZXN0IHtPYmplY3R9IC0gdGVzdCBvYmplY3RcbiAgICAgICAgICogQHJldHVybnMge0FycmF5fSAtIGFuIGFycmF5IG9mIHJlYXNvbnMgcGVyIGVhY2ggdGVzdCBydW4uXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfX2dldEZpcnN0RmFpbFJlYXNvblBlclJ1bjogZnVuY3Rpb24odGVzdCkge1xuICAgICAgICAgICAgY29uc3QgcmVhc29uID0gW107XG4gICAgICAgICAgICBmb3IobGV0IGkgPSAxOyBpIDw9IHRlc3QucmVzdWx0LnJ1bnM7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmKHRlc3QucmVzdWx0LmFzc2VydHNbaV0gJiYgdGVzdC5yZXN1bHQuYXNzZXJ0c1tpXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZFJlYXNvbihpLCB0ZXN0LnJlc3VsdC5hc3NlcnRzW2ldWzBdKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZih0ZXN0LnJlc3VsdC5tZXNzYWdlc1tpXSAmJiB0ZXN0LnJlc3VsdC5tZXNzYWdlc1tpXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZFJlYXNvbihpLCB0ZXN0LnJlc3VsdC5tZXNzYWdlc1tpXVswXSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gYWRkUmVhc29uKHJ1biwgbG9nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBydW46IHJ1bixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZzogbG9nXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgcmVhc29uLnB1c2gobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcmVhc29uO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogRGVzY3JpYmVkIGRlZmF1bHQgdHJlZSBub2RlIHN0cnVjdHVyZS5cbiAgICAgICAgICogQHJldHVybnMge3tfX21ldGE6IHtjb25mOiBudWxsLCBwYXJlbnQ6IG51bGwsIGlzRGlyZWN0b3J5OiBib29sZWFufSwgZGF0YToge25hbWU6IG51bGwsIHBhdGg6IG51bGx9LCByZXN1bHQ6IHtzdGF0ZTogc3RyaW5nLCBwYXNzOiBudWxsLCBleGVjdXRpb25UaW1lOiBudW1iZXIsIHJ1bnM6IG51bWJlciwgYXNzZXJ0czoge30sIG1lc3NhZ2VzOiB7fX0sIGl0ZW1zOiBudWxsfX1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9fZ2V0RGVmYXVsdE5vZGVTdHJ1Y3R1cmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICB7XG4gICAgICAgICAgICAgICAgX19tZXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmY6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgaXNEaXJlY3Rvcnk6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IG51bGwsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6IFRFU1RfU1RBVEVTLlJFQURZLCAvLyByZWFkeSB8IHJ1bm5pbmcgfCB0ZXJtaW5hdGVkIHwgdGltZW91dFxuICAgICAgICAgICAgICAgICAgICBwYXNzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBleGVjdXRpb25UaW1lOiAwLFxuICAgICAgICAgICAgICAgICAgICBydW5zOiAwLFxuICAgICAgICAgICAgICAgICAgICBhc3NlcnRzOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXM6IHt9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpdGVtczogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1hdGNoIGEgdGVzdCBmaWxlIHBhdGggdG8gYSBVTklYIGdsb2IgZXhwcmVzc2lvbiBhcnJheS4gSWYgaXRzIGFueSBtYXRjaCByZXR1cm5zIHRydWUsIG90aGVyd2lzZSByZXR1cm5zIGZhbHNlLlxuICAgICAgICAgKiBAcGFyYW0gZ2xvYkV4cEFycmF5IHtBcnJheX0gLSBhbiBhcnJheSB3aXRoIGdsb2IgZXhwcmVzc2lvbiAoVU5JWCBzdHlsZSlcbiAgICAgICAgICogQHBhcmFtIHN0ciB7U3RyaW5nfSAtIHRoZSBzdHJpbmcgdG8gYmUgbWF0Y2hlZFxuICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSByZXR1cm5zIHRydWUgaWYgdGhlcmUgaXMgYW55IG1hdGNoIGFuZCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfX2lzQW55TWF0Y2g6IGZ1bmN0aW9uKGdsb2JFeHBBcnJheSwgc3RyKSB7XG4gICAgICAgICAgICBjb25zdCBoYXNNYXRjaCA9IGZ1bmN0aW9uKGdsb2JFeHApIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWdleCA9IGdsb2JUb1JlZ0V4cChnbG9iRXhwKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVnZXgudGVzdChzdHIpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIGdsb2JFeHBBcnJheS5zb21lKGhhc01hdGNoKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnZlcnRzIGEgdHJlZSBzdHJ1Y3R1cmUgaW50byBhbiBhcnJheSBsaXN0IG9mIHRlc3Qgbm9kZXMuIFRoZSB0cmVlIHRyYXZlcnNhbCBpcyBERlMgKERlZXAtRmlyc3QtU2VhcmNoKS5cbiAgICAgICAgICogQHBhcmFtIHJvb3ROb2RlIHtPYmplY3R9IC0gcm9vdCBub2RlIG9mIHRoZSB0ZXN0IHRyZWUuXG4gICAgICAgICAqIEByZXR1cm5zIHtBcnJheX0gLSBMaXN0IG9mIHRlc3Qgbm9kZXMuXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfX3RvVGVzdFRyZWVUb0xpc3Q6IGZ1bmN0aW9uKHJvb3ROb2RlKSB7XG4gICAgICAgICAgICB2YXIgdGVzdExpc3QgPSBbXTtcblxuICAgICAgICAgICAgdHJhdmVyc2Uocm9vdE5vZGUpO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiB0cmF2ZXJzZShub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYoIW5vZGUuX19tZXRhLmlzRGlyZWN0b3J5IHx8ICFub2RlLml0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IobGV0IGkgPSAwLCBsZW4gPSBub2RlLml0ZW1zLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBub2RlLml0ZW1zW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZihpdGVtLl9fbWV0YS5pc0RpcmVjdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVyc2UoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXN0TGlzdC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGVzdExpc3Q7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMb2dnaW5nIHRvIGNvbnNvbGUgd3JhcHBlci5cbiAgICAgICAgICogQHBhcmFtIGxvZyB7U3RyaW5nfE9iamVjdHxOdW1iZXJ9IC0gbG9nIG1lc3NhZ2VcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9fY29uc29sZUxvZzogZnVuY3Rpb24obG9nKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhUQUcsIGxvZyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMb2dnaW5nIGRlYnVnZ2luZyBpbmZvIG1lc3NhZ2VzIHdyYXBwZXIuXG4gICAgICAgICAqIExvZ2dlcjogY29uc29sZS5pbmZvXG4gICAgICAgICAqIEBwYXJhbSBsb2cge1N0cmluZ3xPYmplY3R8TnVtYmVyfSAtIGxvZyBtZXNzYWdlXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfX2RlYnVnSW5mbzogZnVuY3Rpb24obG9nKSB7XG4gICAgICAgICAgICB0aGlzLl9fZGVidWcoY29uc29sZS5pbmZvLCBsb2cpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogTG9nZ2luZyBkZWJ1Z2dpbmcgZXJyb3IgbWVzc2FnZXMgd3JhcHBlci5cbiAgICAgICAgICogTG9nZ2VyOiBjb25zb2xlLmVycm9yXG4gICAgICAgICAqIEBwYXJhbSBsb2cge1N0cmluZ3xPYmplY3R8TnVtYmVyfSAtIGxvZyBtZXNzYWdlXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfX2RlYnVnRXJyb3I6IGZ1bmN0aW9uKGxvZykge1xuICAgICAgICAgICAgdGhpcy5fX2RlYnVnKGNvbnNvbGUuZXJyb3IsIGxvZyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiAgTG9nZ2luZyBkZWJ1Z2dpbmcgbWVzc2FnZXMgd3JhcHBlci4gT25lIGRlYnVnIG1vZGUsIHRoZSBsb2dnaW5nIGlzIHNpbGVudC5cbiAgICAgICAgICogQHBhcmFtIGxvZ2dlciB7RnVuY3Rpb259IC0gaGFuZGxlciBmb3IgbG9nZ2luZ1xuICAgICAgICAgKiBAcGFyYW0gbG9nIHtTdHJpbmd8T2JqZWN0fE51bWJlcn0gLSBsb2cgbWVzc2FnZVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX19kZWJ1ZzogZnVuY3Rpb24obG9nZ2VyLCBsb2cpIHtcbiAgICAgICAgICAgIGlmKCFERUJVRykge3JldHVybjt9XG5cbiAgICAgICAgICAgIC8vIGxldCBwcmV0dHlMb2cgPSBKU09OLnN0cmluZ2lmeShsb2csIG51bGwsIDIpO1xuICAgICAgICAgICAgbG9nZ2VyKFwiREVCVUdcIiwgbG9nKTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZXAgZXh0ZW5kIG9uZSBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIG9mIGFub3RoZXIgb2JqZWN0LlxuICAgICAgICAgKiBJZiB0aGUgcHJvcGVydHkgZXhpc3RzIGluIGJvdGggb2JqZWN0cyB0aGUgcHJvcGVydHkgZnJvbSB0aGUgZmlyc3Qgb2JqZWN0IGlzIG92ZXJyaWRkZW4uXG4gICAgICAgICAqIEBwYXJhbSBmaXJzdCB7T2JqZWN0fSAtIHRoZSBmaXJzdCBvYmplY3RcbiAgICAgICAgICogQHBhcmFtIHNlY29uZCB7T2JqZWN0fSAtIHRoZSBzZWNvbmQgb2JqZWN0XG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gYW4gb2JqZWN0IHdpdGggYm90aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGZpcnN0IGFuZCBzZWNvbmQgb2JqZWN0LlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX19leHRlbmQ6IGZ1bmN0aW9uIChmaXJzdCwgc2Vjb25kKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBzZWNvbmQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWZpcnN0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3Rba2V5XSA9IHNlY29uZFtrZXldO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWwgPSBzZWNvbmRba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIGZpcnN0W2tleV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSB0aGlzLl9fZXh0ZW5kKGZpcnN0W2tleV0sIHNlY29uZFtrZXldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGZpcnN0W2tleV0gPSB2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmlyc3Q7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbiIsIlxuLy8gZ2xvYlRvUmVnRXhwIHR1cm5zIGEgVU5JWCBnbG9iIGV4cHJlc3Npb24gaW50byBhIFJlZ0V4IGV4cHJlc3Npb24uXG4vLyAgU3VwcG9ydHMgYWxsIHNpbXBsZSBnbG9iIHBhdHRlcm5zLiBFeGFtcGxlczogKi5leHQsIC9mb28vKiwgLi4vLi4vcGF0aCwgXmZvby4qXG4vLyAtIHNpbmdsZSBjaGFyYWN0ZXIgbWF0Y2hpbmcsIG1hdGNoaW5nIHJhbmdlcyBvZiBjaGFyYWN0ZXJzIGV0Yy4gZ3JvdXAgbWF0Y2hpbmcgYXJlIG5vIHN1cHBvcnRlZFxuLy8gLSBmbGFncyBhcmUgbm90IHN1cHBvcnRlZFxudmFyIGdsb2JUb1JlZ0V4cCA9IGZ1bmN0aW9uIChnbG9iRXhwKSB7XG4gICAgaWYgKHR5cGVvZiBnbG9iRXhwICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdHbG9iIEV4cHJlc3Npb24gbXVzdCBiZSBhIHN0cmluZyEnKTtcbiAgICB9XG5cbiAgICB2YXIgcmVnRXhwID0gXCJcIjtcblxuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBnbG9iRXhwLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGxldCBjID0gZ2xvYkV4cFtpXTtcblxuICAgICAgICBzd2l0Y2ggKGMpIHtcbiAgICAgICAgICAgIGNhc2UgXCIvXCI6XG4gICAgICAgICAgICBjYXNlIFwiJFwiOlxuICAgICAgICAgICAgY2FzZSBcIl5cIjpcbiAgICAgICAgICAgIGNhc2UgXCIrXCI6XG4gICAgICAgICAgICBjYXNlIFwiLlwiOlxuICAgICAgICAgICAgY2FzZSBcIihcIjpcbiAgICAgICAgICAgIGNhc2UgXCIpXCI6XG4gICAgICAgICAgICBjYXNlIFwiPVwiOlxuICAgICAgICAgICAgY2FzZSBcIiFcIjpcbiAgICAgICAgICAgIGNhc2UgXCJ8XCI6XG4gICAgICAgICAgICAgICAgcmVnRXhwICs9IFwiXFxcXFwiICsgYztcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcIipcIjpcbiAgICAgICAgICAgICAgICAvLyB0cmVhdCBhbnkgbnVtYmVyIG9mIFwiKlwiIGFzIG9uZVxuICAgICAgICAgICAgICAgIHdoaWxlKGdsb2JFeHBbaSArIDFdID09PSBcIipcIikge1xuICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlZ0V4cCArPSBcIi4qXCI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmVnRXhwICs9IGM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzZXQgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB3aXRoIF4gJiAkXG4gICAgcmVnRXhwID0gXCJeXCIgKyByZWdFeHAgKyBcIiRcIjtcblxuICAgIHJldHVybiBuZXcgUmVnRXhwKHJlZ0V4cCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGdsb2JUb1JlZ0V4cDsiLCJjb25zdCB1dGlscyA9IHJlcXVpcmUoXCJzd2FybXV0aWxzXCIpO1xuY29uc3QgT3dNID0gdXRpbHMuT3dNO1xudmFyIGJlZXNIZWFsZXIgPSB1dGlscy5iZWVzSGVhbGVyO1xudmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xudmFyIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcblxuXG4vL1RPRE86IHByZXZlbnQgYSBjbGFzcyBvZiByYWNlIGNvbmRpdGlvbiB0eXBlIG9mIGVycm9ycyBieSBzaWduYWxpbmcgd2l0aCBmaWxlcyBtZXRhZGF0YSB0byB0aGUgd2F0Y2hlciB3aGVuIGl0IGlzIHNhZmUgdG8gY29uc3VtZVxuXG5mdW5jdGlvbiBGb2xkZXJNUShmb2xkZXIsIGNhbGxiYWNrID0gKCkgPT4ge30pe1xuXG5cdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHR9XG5cblx0Zm9sZGVyID0gcGF0aC5ub3JtYWxpemUoZm9sZGVyKTtcblxuXHRmcy5ta2Rpcihmb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCBmdW5jdGlvbihlcnIsIHJlcyl7XG5cdFx0ZnMuZXhpc3RzKGZvbGRlciwgZnVuY3Rpb24oZXhpc3RzKSB7XG5cdFx0XHRpZiAoZXhpc3RzKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCBmb2xkZXIpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIG1rRmlsZU5hbWUoc3dhcm1SYXcpe1xuXHRcdGxldCBtZXRhID0gT3dNLnByb3RvdHlwZS5nZXRNZXRhRnJvbShzd2FybVJhdyk7XG5cdFx0bGV0IG5hbWUgPSBgJHtmb2xkZXJ9JHtwYXRoLnNlcH0ke21ldGEuc3dhcm1JZH0uJHttZXRhLnN3YXJtVHlwZU5hbWV9YDtcblx0XHRjb25zdCB1bmlxdWUgPSBtZXRhLnBoYXNlSWQgfHwgJCQudWlkR2VuZXJhdG9yLnNhZmVfdXVpZCgpO1xuXG5cdFx0bmFtZSA9IG5hbWUrYC4ke3VuaXF1ZX1gO1xuXHRcdHJldHVybiBwYXRoLm5vcm1hbGl6ZShuYW1lKTtcblx0fVxuXG5cdHRoaXMuZ2V0SGFuZGxlciA9IGZ1bmN0aW9uKCl7XG5cdFx0aWYocHJvZHVjZXIpe1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiT25seSBvbmUgY29uc3VtZXIgaXMgYWxsb3dlZCFcIik7XG5cdFx0fVxuXHRcdHByb2R1Y2VyID0gdHJ1ZTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0c2VuZFN3YXJtU2VyaWFsaXphdGlvbjogZnVuY3Rpb24oc2VyaWFsaXphdGlvbiwgY2FsbGJhY2spe1xuXHRcdFx0XHRpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR3cml0ZUZpbGUobWtGaWxlTmFtZShKU09OLnBhcnNlKHNlcmlhbGl6YXRpb24pKSwgc2VyaWFsaXphdGlvbiwgY2FsbGJhY2spO1xuXHRcdFx0fSxcblx0XHRcdGFkZFN0cmVhbSA6IGZ1bmN0aW9uKHN0cmVhbSwgY2FsbGJhY2spe1xuXHRcdFx0XHRpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKCFzdHJlYW0gfHwgIXN0cmVhbS5waXBlIHx8IHR5cGVvZiBzdHJlYW0ucGlwZSAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiU29tZXRoaW5nIHdyb25nIGhhcHBlbmVkXCIpKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGxldCBzd2FybSA9IFwiXCI7XG5cdFx0XHRcdHN0cmVhbS5vbignZGF0YScsIChjaHVuaykgPT57XG5cdFx0XHRcdFx0c3dhcm0gKz0gY2h1bms7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHN0cmVhbS5vbihcImVuZFwiLCAoKSA9PiB7XG5cdFx0XHRcdFx0d3JpdGVGaWxlKG1rRmlsZU5hbWUoSlNPTi5wYXJzZShzd2FybSkpLCBzd2FybSwgY2FsbGJhY2spO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRzdHJlYW0ub24oXCJlcnJvclwiLCAoZXJyKSA9Pntcblx0XHRcdFx0XHRjYWxsYmFjayhlcnIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHRhZGRTd2FybSA6IGZ1bmN0aW9uKHN3YXJtLCBjYWxsYmFjayl7XG5cdFx0XHRcdGlmKCFjYWxsYmFjayl7XG5cdFx0XHRcdFx0Y2FsbGJhY2sgPSAkJC5kZWZhdWx0RXJyb3JIYW5kbGluZ0ltcGxlbWVudGF0aW9uO1xuXHRcdFx0XHR9ZWxzZSBpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJlZXNIZWFsZXIuYXNKU09OKHN3YXJtLG51bGwsIG51bGwsIGZ1bmN0aW9uKGVyciwgcmVzKXtcblx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR3cml0ZUZpbGUobWtGaWxlTmFtZShyZXMpLCBKKHJlcyksIGNhbGxiYWNrKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdFx0c2VuZFN3YXJtRm9yRXhlY3V0aW9uOiBmdW5jdGlvbihzd2FybSwgY2FsbGJhY2spe1xuXHRcdFx0XHRpZighY2FsbGJhY2spe1xuXHRcdFx0XHRcdGNhbGxiYWNrID0gJCQuZGVmYXVsdEVycm9ySGFuZGxpbmdJbXBsZW1lbnRhdGlvbjtcblx0XHRcdFx0fWVsc2UgaWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRiZWVzSGVhbGVyLmFzSlNPTihzd2FybSwgT3dNLnByb3RvdHlwZS5nZXRNZXRhRnJvbShzd2FybSwgXCJwaGFzZU5hbWVcIiksIE93TS5wcm90b3R5cGUuZ2V0TWV0YUZyb20oc3dhcm0sIFwiYXJnc1wiKSwgZnVuY3Rpb24oZXJyLCByZXMpe1xuXHRcdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHZhciBmaWxlID0gbWtGaWxlTmFtZShyZXMpO1xuXHRcdFx0XHRcdHZhciBjb250ZW50ID0gSlNPTi5zdHJpbmdpZnkocmVzKTtcblxuXHRcdFx0XHRcdC8vaWYgdGhlcmUgYXJlIG5vIG1vcmUgRkQncyBmb3IgZmlsZXMgdG8gYmUgd3JpdHRlbiB3ZSByZXRyeS5cblx0XHRcdFx0XHRmdW5jdGlvbiB3cmFwcGVyKGVycm9yLCByZXN1bHQpe1xuXHRcdFx0XHRcdFx0aWYoZXJyb3Ipe1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhgQ2F1Z2h0IGFuIHdyaXRlIGVycm9yLiBSZXRyeSB0byB3cml0ZSBmaWxlIFske2ZpbGV9XWApO1xuXHRcdFx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHRcdFx0XHRcdFx0d3JpdGVGaWxlKGZpbGUsIGNvbnRlbnQsIHdyYXBwZXIpO1xuXHRcdFx0XHRcdFx0XHR9LCAxMCk7XG5cdFx0XHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycm9yLCByZXN1bHQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHdyaXRlRmlsZShmaWxlLCBjb250ZW50LCB3cmFwcGVyKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fTtcblxuXHR2YXIgcmVjaXBpZW50O1xuXHR0aGlzLnNldElQQ0NoYW5uZWwgPSBmdW5jdGlvbihwcm9jZXNzQ2hhbm5lbCl7XG5cdFx0aWYocHJvY2Vzc0NoYW5uZWwgJiYgIXByb2Nlc3NDaGFubmVsLnNlbmQgfHwgKHR5cGVvZiBwcm9jZXNzQ2hhbm5lbC5zZW5kKSAhPSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiUmVjaXBpZW50IGlzIG5vdCBpbnN0YW5jZSBvZiBwcm9jZXNzL2NoaWxkX3Byb2Nlc3Mgb3IgaXQgd2FzIG5vdCBzcGF3bmVkIHdpdGggSVBDIGNoYW5uZWwhXCIpO1xuXHRcdH1cblx0XHRyZWNpcGllbnQgPSBwcm9jZXNzQ2hhbm5lbDtcblx0XHRpZihjb25zdW1lcil7XG5cdFx0XHRjb25zb2xlLmxvZyhgQ2hhbm5lbCB1cGRhdGVkYCk7XG5cdFx0XHQocmVjaXBpZW50IHx8IHByb2Nlc3MpLm9uKFwibWVzc2FnZVwiLCByZWNlaXZlRW52ZWxvcGUpO1xuXHRcdH1cblx0fTtcblxuXG5cdHZhciBjb25zdW1lZE1lc3NhZ2VzID0ge307XG5cblx0ZnVuY3Rpb24gY2hlY2tJZkNvbnN1bW1lZChuYW1lLCBtZXNzYWdlKXtcblx0XHRjb25zdCBzaG9ydE5hbWUgPSBwYXRoLmJhc2VuYW1lKG5hbWUpO1xuXHRcdGNvbnN0IHByZXZpb3VzU2F2ZWQgPSBjb25zdW1lZE1lc3NhZ2VzW3Nob3J0TmFtZV07XG5cdFx0bGV0IHJlc3VsdCA9IGZhbHNlO1xuXHRcdGlmKHByZXZpb3VzU2F2ZWQgJiYgIXByZXZpb3VzU2F2ZWQubG9jYWxlQ29tcGFyZShtZXNzYWdlKSl7XG5cdFx0XHRyZXN1bHQgPSB0cnVlO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gc2F2ZTJIaXN0b3J5KGVudmVsb3BlKXtcblx0XHRjb25zdW1lZE1lc3NhZ2VzW3BhdGguYmFzZW5hbWUoZW52ZWxvcGUubmFtZSldID0gZW52ZWxvcGUubWVzc2FnZTtcblx0fVxuXG5cdGZ1bmN0aW9uIGJ1aWxkRW52ZWxvcGVDb25maXJtYXRpb24oZW52ZWxvcGUsIHNhdmVIaXN0b3J5KXtcblx0XHRpZihzYXZlSGlzdG9yeSl7XG5cdFx0XHRzYXZlMkhpc3RvcnkoZW52ZWxvcGUpO1xuXHRcdH1cblx0XHRyZXR1cm4gYENvbmZpcm0gZW52ZWxvcGUgJHtlbnZlbG9wZS50aW1lc3RhbXB9IHNlbnQgdG8gJHtlbnZlbG9wZS5kZXN0fWA7XG5cdH1cblxuXHRmdW5jdGlvbiBidWlsZEVudmVsb3BlKG5hbWUsIG1lc3NhZ2Upe1xuXHRcdHJldHVybiB7XG5cdFx0XHRkZXN0OiBmb2xkZXIsXG5cdFx0XHRzcmM6IHByb2Nlc3MucGlkLFxuXHRcdFx0dGltZXN0YW1wOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2UsXG5cdFx0XHRuYW1lOiBuYW1lXG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlY2VpdmVFbnZlbG9wZShlbnZlbG9wZSl7XG5cdFx0aWYoIWVudmVsb3BlIHx8IHR5cGVvZiBlbnZlbG9wZSAhPT0gXCJvYmplY3RcIil7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdC8vY29uc29sZS5sb2coXCJyZWNlaXZlZCBlbnZlbG9wZVwiLCBlbnZlbG9wZSwgZm9sZGVyKTtcblxuXHRcdGlmKGVudmVsb3BlLmRlc3QgIT09IGZvbGRlciAmJiBmb2xkZXIuaW5kZXhPZihlbnZlbG9wZS5kZXN0KSE9PSAtMSAmJiBmb2xkZXIubGVuZ3RoID09PSBlbnZlbG9wZS5kZXN0KzEpe1xuXHRcdFx0Y29uc29sZS5sb2coXCJUaGlzIGVudmVsb3BlIGlzIG5vdCBmb3IgbWUhXCIpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGxldCBtZXNzYWdlID0gZW52ZWxvcGUubWVzc2FnZTtcblxuXHRcdGlmKGNhbGxiYWNrKXtcblx0XHRcdC8vY29uc29sZS5sb2coXCJTZW5kaW5nIGNvbmZpcm1hdGlvblwiLCBwcm9jZXNzLnBpZCk7XG5cdFx0XHRyZWNpcGllbnQuc2VuZChidWlsZEVudmVsb3BlQ29uZmlybWF0aW9uKGVudmVsb3BlLCB0cnVlKSk7XG5cdFx0XHRjb25zdW1lcihudWxsLCBKU09OLnBhcnNlKG1lc3NhZ2UpKTtcblx0XHR9XG5cdH1cblxuXHR0aGlzLnJlZ2lzdGVyQXNJUENDb25zdW1lciA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblx0XHRpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGUgYXJndW1lbnQgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdFx0fVxuXHRcdHJlZ2lzdGVyZWRBc0lQQ0NvbnN1bWVyID0gdHJ1ZTtcblx0XHQvL3dpbGwgcmVnaXN0ZXIgYXMgbm9ybWFsIGNvbnN1bWVyIGluIG9yZGVyIHRvIGNvbnN1bWUgYWxsIGV4aXN0aW5nIG1lc3NhZ2VzIGJ1dCB3aXRob3V0IHNldHRpbmcgdGhlIHdhdGNoZXJcblx0XHR0aGlzLnJlZ2lzdGVyQ29uc3VtZXIoY2FsbGJhY2ssIHRydWUsICh3YXRjaGVyKSA9PiAhd2F0Y2hlcik7XG5cblx0XHQvL2NvbnNvbGUubG9nKFwiUmVnaXN0ZXJlZCBhcyBJUEMgQ29uc3VtbWVyXCIsICk7XG5cdFx0KHJlY2lwaWVudCB8fCBwcm9jZXNzKS5vbihcIm1lc3NhZ2VcIiwgcmVjZWl2ZUVudmVsb3BlKTtcblx0fTtcblxuXHR0aGlzLnJlZ2lzdGVyQ29uc3VtZXIgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIHNob3VsZERlbGV0ZUFmdGVyUmVhZCA9IHRydWUsIHNob3VsZFdhaXRGb3JNb3JlID0gKHdhdGNoZXIpID0+IHRydWUpIHtcblx0XHRpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdFx0fVxuXHRcdGlmIChjb25zdW1lcikge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiT25seSBvbmUgY29uc3VtZXIgaXMgYWxsb3dlZCEgXCIgKyBmb2xkZXIpO1xuXHRcdH1cblxuXHRcdGNvbnN1bWVyID0gY2FsbGJhY2s7XG5cblx0XHRmcy5ta2Rpcihmb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCBmdW5jdGlvbiAoZXJyLCByZXMpIHtcblx0XHRcdGlmIChlcnIgJiYgKGVyci5jb2RlICE9PSAnRUVYSVNUJykpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHRcdH1cblx0XHRcdGNvbnN1bWVBbGxFeGlzdGluZyhzaG91bGREZWxldGVBZnRlclJlYWQsIHNob3VsZFdhaXRGb3JNb3JlKTtcblx0XHR9KTtcblx0fTtcblxuXHR0aGlzLndyaXRlTWVzc2FnZSA9IHdyaXRlRmlsZTtcblxuXHR0aGlzLnVubGlua0NvbnRlbnQgPSBmdW5jdGlvbiAobWVzc2FnZUlkLCBjYWxsYmFjaykge1xuXHRcdGNvbnN0IG1lc3NhZ2VQYXRoID0gcGF0aC5qb2luKGZvbGRlciwgbWVzc2FnZUlkKTtcblxuXHRcdGZzLnVubGluayhtZXNzYWdlUGF0aCwgKGVycikgPT4ge1xuXHRcdFx0Y2FsbGJhY2soZXJyKTtcblx0XHR9KTtcblx0fTtcblxuXHR0aGlzLmRpc3Bvc2UgPSBmdW5jdGlvbihmb3JjZSl7XG5cdFx0aWYodHlwZW9mIGZvbGRlciAhPSBcInVuZGVmaW5lZFwiKXtcblx0XHRcdHZhciBmaWxlcztcblx0XHRcdHRyeXtcblx0XHRcdFx0ZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhmb2xkZXIpO1xuXHRcdFx0fWNhdGNoKGVycm9yKXtcblx0XHRcdFx0Ly8uLlxuXHRcdFx0fVxuXG5cdFx0XHRpZihmaWxlcyAmJiBmaWxlcy5sZW5ndGggPiAwICYmICFmb3JjZSl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiRGlzcG9zaW5nIGEgY2hhbm5lbCB0aGF0IHN0aWxsIGhhcyBtZXNzYWdlcyEgRGlyIHdpbGwgbm90IGJlIHJlbW92ZWQhXCIpO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dHJ5e1xuXHRcdFx0XHRcdGZzLnJtZGlyU3luYyhmb2xkZXIpO1xuXHRcdFx0XHR9Y2F0Y2goZXJyKXtcblx0XHRcdFx0XHQvLy4uXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Zm9sZGVyID0gbnVsbDtcblx0XHR9XG5cblx0XHRpZihwcm9kdWNlcil7XG5cdFx0XHQvL25vIG5lZWQgdG8gZG8gYW55dGhpbmcgZWxzZVxuXHRcdH1cblxuXHRcdGlmKHR5cGVvZiBjb25zdW1lciAhPSBcInVuZGVmaW5lZFwiKXtcblx0XHRcdGNvbnN1bWVyID0gKCkgPT4ge307XG5cdFx0fVxuXG5cdFx0aWYod2F0Y2hlcil7XG5cdFx0XHR3YXRjaGVyLmNsb3NlKCk7XG5cdFx0XHR3YXRjaGVyID0gbnVsbDtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcblxuXG5cdC8qIC0tLS0tLS0tLS0tLS0tLS0gcHJvdGVjdGVkICBmdW5jdGlvbnMgKi9cblx0dmFyIGNvbnN1bWVyID0gbnVsbDtcblx0dmFyIHJlZ2lzdGVyZWRBc0lQQ0NvbnN1bWVyID0gZmFsc2U7XG5cdHZhciBwcm9kdWNlciA9IG51bGw7XG5cblx0ZnVuY3Rpb24gYnVpbGRQYXRoRm9yRmlsZShmaWxlbmFtZSl7XG5cdFx0cmV0dXJuIHBhdGgubm9ybWFsaXplKHBhdGguam9pbihmb2xkZXIsIGZpbGVuYW1lKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjb25zdW1lTWVzc2FnZShmaWxlbmFtZSwgc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCBjYWxsYmFjaykge1xuXHRcdHZhciBmdWxsUGF0aCA9IGJ1aWxkUGF0aEZvckZpbGUoZmlsZW5hbWUpO1xuXG5cdFx0ZnMucmVhZEZpbGUoZnVsbFBhdGgsIFwidXRmOFwiLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG5cdFx0XHRpZiAoIWVycikge1xuXHRcdFx0XHRpZiAoZGF0YSAhPT0gXCJcIikge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHR2YXIgbWVzc2FnZSA9IEpTT04ucGFyc2UoZGF0YSk7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiUGFyc2luZyBlcnJvclwiLCBlcnJvcik7XG5cdFx0XHRcdFx0XHRlcnIgPSBlcnJvcjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZihjaGVja0lmQ29uc3VtbWVkKGZ1bGxQYXRoLCBkYXRhKSl7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKGBtZXNzYWdlIGFscmVhZHkgY29uc3VtZWQgWyR7ZmlsZW5hbWV9XWApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkKSB7XG5cblx0XHRcdFx0XHRcdGZzLnVubGluayhmdWxsUGF0aCwgZnVuY3Rpb24gKGVyciwgcmVzKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChlcnIpIHt0aHJvdyBlcnI7fTtcblx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIsIG1lc3NhZ2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIkNvbnN1bWUgZXJyb3JcIiwgZXJyKTtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjb25zdW1lQWxsRXhpc3Rpbmcoc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCBzaG91bGRXYWl0Rm9yTW9yZSkge1xuXG5cdFx0bGV0IGN1cnJlbnRGaWxlcyA9IFtdO1xuXG5cdFx0ZnMucmVhZGRpcihmb2xkZXIsICd1dGY4JywgZnVuY3Rpb24gKGVyciwgZmlsZXMpIHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0JCQuZXJyb3JIYW5kbGVyLmVycm9yKGVycik7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGN1cnJlbnRGaWxlcyA9IGZpbGVzO1xuXHRcdFx0aXRlcmF0ZUFuZENvbnN1bWUoZmlsZXMpO1xuXG5cdFx0fSk7XG5cblx0XHRmdW5jdGlvbiBzdGFydFdhdGNoaW5nKCl7XG5cdFx0XHRpZiAoc2hvdWxkV2FpdEZvck1vcmUodHJ1ZSkpIHtcblx0XHRcdFx0d2F0Y2hGb2xkZXIoc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCBzaG91bGRXYWl0Rm9yTW9yZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaXRlcmF0ZUFuZENvbnN1bWUoZmlsZXMsIGN1cnJlbnRJbmRleCA9IDApIHtcblx0XHRcdGlmIChjdXJyZW50SW5kZXggPT09IGZpbGVzLmxlbmd0aCkge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKFwic3RhcnQgd2F0Y2hpbmdcIiwgbmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuXHRcdFx0XHRzdGFydFdhdGNoaW5nKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHBhdGguZXh0bmFtZShmaWxlc1tjdXJyZW50SW5kZXhdKSAhPT0gaW5fcHJvZ3Jlc3MpIHtcblx0XHRcdFx0Y29uc3VtZU1lc3NhZ2UoZmlsZXNbY3VycmVudEluZGV4XSwgc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCAoZXJyLCBkYXRhKSA9PiB7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0aXRlcmF0ZUFuZENvbnN1bWUoZmlsZXMsICsrY3VycmVudEluZGV4KTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y29uc3VtZXIobnVsbCwgZGF0YSwgcGF0aC5iYXNlbmFtZShmaWxlc1tjdXJyZW50SW5kZXhdKSk7XG5cdFx0XHRcdFx0aWYgKHNob3VsZFdhaXRGb3JNb3JlKCkpIHtcblx0XHRcdFx0XHRcdGl0ZXJhdGVBbmRDb25zdW1lKGZpbGVzLCArK2N1cnJlbnRJbmRleCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGl0ZXJhdGVBbmRDb25zdW1lKGZpbGVzLCArK2N1cnJlbnRJbmRleCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gd3JpdGVGaWxlKGZpbGVuYW1lLCBjb250ZW50LCBjYWxsYmFjayl7XG5cdFx0aWYocmVjaXBpZW50KXtcblx0XHRcdHZhciBlbnZlbG9wZSA9IGJ1aWxkRW52ZWxvcGUoZmlsZW5hbWUsIGNvbnRlbnQpO1xuXHRcdFx0Ly9jb25zb2xlLmxvZyhcIlNlbmRpbmcgdG9cIiwgcmVjaXBpZW50LnBpZCwgcmVjaXBpZW50LnBwaWQsIFwiZW52ZWxvcGVcIiwgZW52ZWxvcGUpO1xuXHRcdFx0cmVjaXBpZW50LnNlbmQoZW52ZWxvcGUpO1xuXHRcdFx0dmFyIGNvbmZpcm1hdGlvblJlY2VpdmVkID0gZmFsc2U7XG5cblx0XHRcdGZ1bmN0aW9uIHJlY2VpdmVDb25maXJtYXRpb24obWVzc2FnZSl7XG5cdFx0XHRcdGlmKG1lc3NhZ2UgPT09IGJ1aWxkRW52ZWxvcGVDb25maXJtYXRpb24oZW52ZWxvcGUpKXtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKFwiUmVjZWl2ZWQgY29uZmlybWF0aW9uXCIsIHJlY2lwaWVudC5waWQpO1xuXHRcdFx0XHRcdGNvbmZpcm1hdGlvblJlY2VpdmVkID0gdHJ1ZTtcblx0XHRcdFx0XHR0cnl7XG5cdFx0XHRcdFx0XHRyZWNpcGllbnQub2ZmKFwibWVzc2FnZVwiLCByZWNlaXZlQ29uZmlybWF0aW9uKTtcblx0XHRcdFx0XHR9Y2F0Y2goZXJyKXtcblx0XHRcdFx0XHRcdC8vLi4uXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmVjaXBpZW50Lm9uKFwibWVzc2FnZVwiLCByZWNlaXZlQ29uZmlybWF0aW9uKTtcblxuXHRcdFx0c2V0VGltZW91dCgoKT0+e1xuXHRcdFx0XHRpZighY29uZmlybWF0aW9uUmVjZWl2ZWQpe1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coXCJObyBjb25maXJtYXRpb24uLi5cIiwgcHJvY2Vzcy5waWQpO1xuXHRcdFx0XHRcdGhpZGRlbl93cml0ZUZpbGUoZmlsZW5hbWUsIGNvbnRlbnQsIGNhbGxiYWNrKTtcblx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0aWYoY2FsbGJhY2spe1xuXHRcdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIGNvbnRlbnQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSwgMjAwKTtcblx0XHR9ZWxzZXtcblx0XHRcdGhpZGRlbl93cml0ZUZpbGUoZmlsZW5hbWUsIGNvbnRlbnQsIGNhbGxiYWNrKTtcblx0XHR9XG5cdH1cblxuXHRjb25zdCBpbl9wcm9ncmVzcyA9IFwiLmluX3Byb2dyZXNzXCI7XG5cdGZ1bmN0aW9uIGhpZGRlbl93cml0ZUZpbGUoZmlsZW5hbWUsIGNvbnRlbnQsIGNhbGxiYWNrKXtcblx0XHR2YXIgdG1wRmlsZW5hbWUgPSBmaWxlbmFtZStpbl9wcm9ncmVzcztcblx0XHR0cnl7XG5cdFx0XHRpZihmcy5leGlzdHNTeW5jKHRtcEZpbGVuYW1lKSB8fCBmcy5leGlzdHNTeW5jKGZpbGVuYW1lKSl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKG5ldyBFcnJvcihgT3ZlcndyaXRpbmcgZmlsZSAke2ZpbGVuYW1lfWApKTtcblx0XHRcdH1cblx0XHRcdGZzLndyaXRlRmlsZVN5bmModG1wRmlsZW5hbWUsIGNvbnRlbnQpO1xuXHRcdFx0ZnMucmVuYW1lU3luYyh0bXBGaWxlbmFtZSwgZmlsZW5hbWUpO1xuXHRcdH1jYXRjaChlcnIpe1xuXHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0fVxuXHRcdGNhbGxiYWNrKG51bGwsIGNvbnRlbnQpO1xuXHR9XG5cblx0dmFyIGFscmVhZHlLbm93bkNoYW5nZXMgPSB7fTtcblxuXHRmdW5jdGlvbiBhbHJlYWR5RmlyZWRDaGFuZ2VzKGZpbGVuYW1lLCBjaGFuZ2Upe1xuXHRcdHZhciByZXMgPSBmYWxzZTtcblx0XHRpZihhbHJlYWR5S25vd25DaGFuZ2VzW2ZpbGVuYW1lXSl7XG5cdFx0XHRyZXMgPSB0cnVlO1xuXHRcdH1lbHNle1xuXHRcdFx0YWxyZWFkeUtub3duQ2hhbmdlc1tmaWxlbmFtZV0gPSBjaGFuZ2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlcztcblx0fVxuXG5cdGZ1bmN0aW9uIHdhdGNoRm9sZGVyKHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgc2hvdWxkV2FpdEZvck1vcmUpe1xuXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0ZnMucmVhZGRpcihmb2xkZXIsICd1dGY4JywgZnVuY3Rpb24gKGVyciwgZmlsZXMpIHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdCQkLmVycm9ySGFuZGxlci5lcnJvcihlcnIpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZvcih2YXIgaT0wOyBpPGZpbGVzLmxlbmd0aDsgaSsrKXtcblx0XHRcdFx0XHR3YXRjaEZpbGVzSGFuZGxlcihcImNoYW5nZVwiLCBmaWxlc1tpXSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIDEwMDApO1xuXG5cdFx0ZnVuY3Rpb24gd2F0Y2hGaWxlc0hhbmRsZXIoZXZlbnRUeXBlLCBmaWxlbmFtZSl7XG5cdFx0XHQvL2NvbnNvbGUubG9nKGBHb3QgJHtldmVudFR5cGV9IG9uICR7ZmlsZW5hbWV9YCk7XG5cblx0XHRcdGlmKCFmaWxlbmFtZSB8fCBwYXRoLmV4dG5hbWUoZmlsZW5hbWUpID09PSBpbl9wcm9ncmVzcyl7XG5cdFx0XHRcdC8vY2F1Z2h0IGEgZGVsZXRlIGV2ZW50IG9mIGEgZmlsZVxuXHRcdFx0XHQvL29yXG5cdFx0XHRcdC8vZmlsZSBub3QgcmVhZHkgdG8gYmUgY29uc3VtZWQgKGluIHByb2dyZXNzKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHZhciBmID0gYnVpbGRQYXRoRm9yRmlsZShmaWxlbmFtZSk7XG5cdFx0XHRpZighZnMuZXhpc3RzU3luYyhmKSl7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coXCJGaWxlIG5vdCBmb3VuZFwiLCBmKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvL2NvbnNvbGUubG9nKGBQcmVwYXJpbmcgdG8gY29uc3VtZSAke2ZpbGVuYW1lfWApO1xuXHRcdFx0aWYoIWFscmVhZHlGaXJlZENoYW5nZXMoZmlsZW5hbWUsIGV2ZW50VHlwZSkpe1xuXHRcdFx0XHRjb25zdW1lTWVzc2FnZShmaWxlbmFtZSwgc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCAoZXJyLCBkYXRhKSA9PiB7XG5cdFx0XHRcdFx0Ly9hbGxvdyBhIHJlYWQgYSB0aGUgZmlsZVxuXHRcdFx0XHRcdGFscmVhZHlLbm93bkNoYW5nZXNbZmlsZW5hbWVdID0gdW5kZWZpbmVkO1xuXG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0Ly8gPz9cblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiXFxuQ2F1Z2h0IGFuIGVycm9yXCIsIGVycik7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Y29uc3VtZXIobnVsbCwgZGF0YSwgZmlsZW5hbWUpO1xuXG5cblx0XHRcdFx0XHRpZiAoIXNob3VsZFdhaXRGb3JNb3JlKCkpIHtcblx0XHRcdFx0XHRcdHdhdGNoZXIuY2xvc2UoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiU29tZXRoaW5nIGhhcHBlbnMuLi5cIiwgZmlsZW5hbWUpO1xuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0Y29uc3Qgd2F0Y2hlciA9IGZzLndhdGNoKGZvbGRlciwgd2F0Y2hGaWxlc0hhbmRsZXIpO1xuXG5cdFx0Y29uc3QgaW50ZXJ2YWxUaW1lciA9IHNldEludGVydmFsKCgpPT57XG5cdFx0XHRmcy5yZWFkZGlyKGZvbGRlciwgJ3V0ZjgnLCBmdW5jdGlvbiAoZXJyLCBmaWxlcykge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0JCQuZXJyb3JIYW5kbGVyLmVycm9yKGVycik7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYoZmlsZXMubGVuZ3RoID4gMCl7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coYFxcblxcbkZvdW5kICR7ZmlsZXMubGVuZ3RofSBmaWxlcyBub3QgY29uc3VtZWQgeWV0IGluICR7Zm9sZGVyfWAsIG5ldyBEYXRlKCkuZ2V0VGltZSgpLFwiXFxuXFxuXCIpO1xuXHRcdFx0XHRcdC8vZmFraW5nIGEgcmVuYW1lIGV2ZW50IHRyaWdnZXJcblx0XHRcdFx0XHR3YXRjaEZpbGVzSGFuZGxlcihcInJlbmFtZVwiLCBmaWxlc1swXSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIDUwMDApO1xuXHR9XG59XG5cbmV4cG9ydHMuZ2V0Rm9sZGVyUXVldWUgPSBmdW5jdGlvbihmb2xkZXIsIGNhbGxiYWNrKXtcblx0cmV0dXJuIG5ldyBGb2xkZXJNUShmb2xkZXIsIGNhbGxiYWNrKTtcbn07XG4iLCJmdW5jdGlvbiBQU0tCdWZmZXIoKSB7fVxuXG5mdW5jdGlvbiBnZXRBcnJheUJ1ZmZlckludGVyZmFjZSAoKSB7XG4gICAgaWYodHlwZW9mIFNoYXJlZEFycmF5QnVmZmVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gQXJyYXlCdWZmZXI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFNoYXJlZEFycmF5QnVmZmVyO1xuICAgIH1cbn1cblxuUFNLQnVmZmVyLmZyb20gPSBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgY29uc3QgQXJyYXlCdWZmZXJJbnRlcmZhY2UgPSBnZXRBcnJheUJ1ZmZlckludGVyZmFjZSgpO1xuXG4gICAgY29uc3QgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkobmV3IEFycmF5QnVmZmVySW50ZXJmYWNlKHNvdXJjZS5sZW5ndGgpKTtcbiAgICBidWZmZXIuc2V0KHNvdXJjZSwgMCk7XG5cbiAgICByZXR1cm4gYnVmZmVyO1xufTtcblxuUFNLQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIChbIC4uLnBhcmFtcyBdLCB0b3RhbExlbmd0aCkge1xuICAgIGNvbnN0IEFycmF5QnVmZmVySW50ZXJmYWNlID0gZ2V0QXJyYXlCdWZmZXJJbnRlcmZhY2UoKTtcblxuICAgIGlmICghdG90YWxMZW5ndGggJiYgdG90YWxMZW5ndGggIT09IDApIHtcbiAgICAgICAgdG90YWxMZW5ndGggPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IGJ1ZmZlciBvZiBwYXJhbXMpIHtcbiAgICAgICAgICAgIHRvdGFsTGVuZ3RoICs9IGJ1ZmZlci5sZW5ndGg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBidWZmZXIgPSBuZXcgVWludDhBcnJheShuZXcgQXJyYXlCdWZmZXJJbnRlcmZhY2UodG90YWxMZW5ndGgpKTtcbiAgICBsZXQgb2Zmc2V0ID0gMDtcblxuICAgIGZvciAoY29uc3QgYnVmIG9mIHBhcmFtcykge1xuICAgICAgICBjb25zdCBsZW4gPSBidWYubGVuZ3RoO1xuXG4gICAgICAgIGNvbnN0IG5leHRPZmZzZXQgPSBvZmZzZXQgKyBsZW47XG4gICAgICAgIGlmIChuZXh0T2Zmc2V0ID4gdG90YWxMZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHJlbWFpbmluZ1NwYWNlID0gdG90YWxMZW5ndGggLSBvZmZzZXQ7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbWFpbmluZ1NwYWNlOyArK2kpIHtcbiAgICAgICAgICAgICAgICBidWZmZXJbb2Zmc2V0ICsgaV0gPSBidWZbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWZmZXIuc2V0KGJ1Ziwgb2Zmc2V0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9mZnNldCA9IG5leHRPZmZzZXQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJ1ZmZlcjtcbn07XG5cblBTS0J1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIChwc2tCdWZmZXIpIHtcbiAgICByZXR1cm4gISFBcnJheUJ1ZmZlci5pc1ZpZXcocHNrQnVmZmVyKTtcbn07XG5cblBTS0J1ZmZlci5hbGxvYyA9IGZ1bmN0aW9uKHNpemUpIHtcbiAgICBjb25zdCBBcnJheUJ1ZmZlckludGVyZmFjZSA9IGdldEFycmF5QnVmZmVySW50ZXJmYWNlKCk7XG5cbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkobmV3IEFycmF5QnVmZmVySW50ZXJmYWNlKHNpemUpKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUFNLQnVmZmVyOyIsImNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpO1xuY29uc3QgS2V5RW5jb2RlciA9IHJlcXVpcmUoJy4va2V5RW5jb2RlcicpO1xuXG5mdW5jdGlvbiBFQ0RTQShjdXJ2ZU5hbWUpe1xuICAgIHRoaXMuY3VydmUgPSBjdXJ2ZU5hbWUgfHwgJ3NlY3AyNTZrMSc7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICB0aGlzLmdlbmVyYXRlS2V5UGFpciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCByZXN1bHQgICAgID0ge307XG4gICAgICAgIGNvbnN0IGVjICAgICAgICAgPSBjcnlwdG8uY3JlYXRlRUNESChzZWxmLmN1cnZlKTtcbiAgICAgICAgcmVzdWx0LnB1YmxpYyAgPSBlYy5nZW5lcmF0ZUtleXMoJ2hleCcpO1xuICAgICAgICByZXN1bHQucHJpdmF0ZSA9IGVjLmdldFByaXZhdGVLZXkoJ2hleCcpO1xuICAgICAgICByZXR1cm4ga2V5c1RvUEVNKHJlc3VsdCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGtleXNUb1BFTShrZXlzKXtcbiAgICAgICAgY29uc3QgcmVzdWx0ICAgICAgICAgICAgICAgICAgPSB7fTtcbiAgICAgICAgY29uc3QgRUNQcml2YXRlS2V5QVNOICAgICAgICAgPSBLZXlFbmNvZGVyLkVDUHJpdmF0ZUtleUFTTjtcbiAgICAgICAgY29uc3QgU3ViamVjdFB1YmxpY0tleUluZm9BU04gPSBLZXlFbmNvZGVyLlN1YmplY3RQdWJsaWNLZXlJbmZvQVNOO1xuICAgICAgICBjb25zdCBrZXlFbmNvZGVyICAgICAgICAgICAgICA9IG5ldyBLZXlFbmNvZGVyKHNlbGYuY3VydmUpO1xuXG4gICAgICAgIGNvbnN0IHByaXZhdGVLZXlPYmplY3QgICAgICAgID0ga2V5RW5jb2Rlci5wcml2YXRlS2V5T2JqZWN0KGtleXMucHJpdmF0ZSxrZXlzLnB1YmxpYyk7XG4gICAgICAgIGNvbnN0IHB1YmxpY0tleU9iamVjdCAgICAgICAgID0ga2V5RW5jb2Rlci5wdWJsaWNLZXlPYmplY3Qoa2V5cy5wdWJsaWMpO1xuXG4gICAgICAgIHJlc3VsdC5wcml2YXRlICAgICAgICAgICAgICA9IEVDUHJpdmF0ZUtleUFTTi5lbmNvZGUocHJpdmF0ZUtleU9iamVjdCwgJ3BlbScsIHByaXZhdGVLZXlPYmplY3QucGVtT3B0aW9ucyk7XG4gICAgICAgIHJlc3VsdC5wdWJsaWMgICAgICAgICAgICAgICA9IFN1YmplY3RQdWJsaWNLZXlJbmZvQVNOLmVuY29kZShwdWJsaWNLZXlPYmplY3QsICdwZW0nLCBwdWJsaWNLZXlPYmplY3QucGVtT3B0aW9ucyk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcblxuICAgIH1cblxuICAgIHRoaXMuc2lnbiA9IGZ1bmN0aW9uIChwcml2YXRlS2V5LGRpZ2VzdCkge1xuICAgICAgICBjb25zdCBzaWduID0gY3J5cHRvLmNyZWF0ZVNpZ24oXCJzaGEyNTZcIik7XG4gICAgICAgIHNpZ24udXBkYXRlKGRpZ2VzdCk7XG5cbiAgICAgICAgcmV0dXJuIHNpZ24uc2lnbihwcml2YXRlS2V5LCdoZXgnKTtcbiAgICB9O1xuXG4gICAgdGhpcy52ZXJpZnkgPSBmdW5jdGlvbiAocHVibGljS2V5LHNpZ25hdHVyZSxkaWdlc3QpIHtcbiAgICAgICAgY29uc3QgdmVyaWZ5ID0gY3J5cHRvLmNyZWF0ZVZlcmlmeSgnc2hhMjU2Jyk7XG4gICAgICAgIHZlcmlmeS51cGRhdGUoZGlnZXN0KTtcblxuICAgICAgICByZXR1cm4gdmVyaWZ5LnZlcmlmeShwdWJsaWNLZXksc2lnbmF0dXJlLCdoZXgnKTtcbiAgICB9XG59XG5cbmV4cG9ydHMuY3JlYXRlRUNEU0EgPSBmdW5jdGlvbiAoY3VydmUpe1xuICAgIHJldHVybiBuZXcgRUNEU0EoY3VydmUpO1xufTsiLCJjb25zdCBjcnlwdG8gPSByZXF1aXJlKCdjcnlwdG8nKTtcbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5jb25zdCBvcyA9IHJlcXVpcmUoJ29zJyk7XG5cbmNvbnN0IHV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHMvY3J5cHRvVXRpbHNcIik7XG5cbmNvbnN0IFBhc3NUaHJvdWdoU3RyZWFtID0gcmVxdWlyZSgnLi91dGlscy9QYXNzVGhyb3VnaFN0cmVhbScpO1xuXG5jb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKTtcbmNvbnN0IHRlbXBGb2xkZXIgPSBvcy50bXBkaXIoKTtcblxuZnVuY3Rpb24gUHNrQ3J5cHRvKCkge1xuXG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICBjb25zdCBldmVudCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICAgIHRoaXMub24gPSBldmVudC5vbjtcbiAgICB0aGlzLm9mZiA9IGV2ZW50LnJlbW92ZUxpc3RlbmVyO1xuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzID0gZXZlbnQucmVtb3ZlQWxsTGlzdGVuZXJzO1xuICAgIHRoaXMuZW1pdCA9IGV2ZW50LmVtaXQ7XG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBFQ0RTQSBmdW5jdGlvbnMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cbiAgICBjb25zdCBlY2RzYSA9IHJlcXVpcmUoXCIuL0VDRFNBXCIpLmNyZWF0ZUVDRFNBKCk7XG4gICAgdGhpcy5nZW5lcmF0ZUVDRFNBS2V5UGFpciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGVjZHNhLmdlbmVyYXRlS2V5UGFpcigpO1xuICAgIH07XG5cbiAgICB0aGlzLnNpZ24gPSBmdW5jdGlvbiAocHJpdmF0ZUtleSwgZGlnZXN0KSB7XG4gICAgICAgIHJldHVybiBlY2RzYS5zaWduKHByaXZhdGVLZXksIGRpZ2VzdCk7XG4gICAgfTtcblxuICAgIHRoaXMudmVyaWZ5ID0gZnVuY3Rpb24gKHB1YmxpY0tleSwgc2lnbmF0dXJlLCBkaWdlc3QpIHtcbiAgICAgICAgcmV0dXJuIGVjZHNhLnZlcmlmeShwdWJsaWNLZXksIHNpZ25hdHVyZSwgZGlnZXN0KTtcbiAgICB9O1xuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1FbmNyeXB0aW9uIGZ1bmN0aW9ucyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIHRoaXMuZW5jcnlwdFN0cmVhbSA9IGZ1bmN0aW9uIChpbnB1dFBhdGgsIGRlc3RpbmF0aW9uUGF0aCwgcGFzc3dvcmQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IFBza0FyY2hpdmVyID0gcmVxdWlyZShcIi4vcHNrLWFyY2hpdmVyXCIpO1xuICAgICAgICBjb25zdCBhcmNoaXZlciA9IG5ldyBQc2tBcmNoaXZlcigpO1xuXG4gICAgICAgIGFyY2hpdmVyLm9uKCdwcm9ncmVzcycsIChwcm9ncmVzcykgPT4ge1xuICAgICAgICAgICAgc2VsZi5lbWl0KCdwcm9ncmVzcycsIHByb2dyZXNzKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnMub3BlbihkZXN0aW5hdGlvblBhdGgsIFwid3hcIiwgZnVuY3Rpb24gKGVyciwgZmQpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnMuY2xvc2UoZmQsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHdzID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oZGVzdGluYXRpb25QYXRoLCB7YXV0b0Nsb3NlOiBmYWxzZX0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleVNhbHQgPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBrZXlTYWx0LCB1dGlscy5pdGVyYXRpb25zX251bWJlciwgMzIsICdzaGE1MTInKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGFhZFNhbHQgPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFhZCA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBhYWRTYWx0LCB1dGlscy5pdGVyYXRpb25zX251bWJlciwgMzIsICdzaGE1MTInKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNhbHQgPSBCdWZmZXIuY29uY2F0KFtrZXlTYWx0LCBhYWRTYWx0XSk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXYgPSBjcnlwdG8ucGJrZGYyU3luYyhwYXNzd29yZCwgc2FsdCwgdXRpbHMuaXRlcmF0aW9uc19udW1iZXIsIDEyLCAnc2hhNTEyJyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjaXBoZXIgPSBjcnlwdG8uY3JlYXRlQ2lwaGVyaXYodXRpbHMuYWxnb3JpdGhtLCBrZXksIGl2KTtcbiAgICAgICAgICAgICAgICBjaXBoZXIuc2V0QUFEKGFhZCk7XG4gICAgICAgICAgICAgICAgYXJjaGl2ZXIuemlwU3RyZWFtKGlucHV0UGF0aCwgY2lwaGVyLCBmdW5jdGlvbiAoZXJyLCBjaXBoZXJTdHJlYW0pIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNpcGhlclN0cmVhbS5vbihcImRhdGFcIiwgZnVuY3Rpb24gKGNodW5rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3cy53cml0ZShjaHVuayk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjaXBoZXJTdHJlYW0ub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhZyA9IGNpcGhlci5nZXRBdXRoVGFnKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhVG9BcHBlbmQgPSBCdWZmZXIuY29uY2F0KFtzYWx0LCB0YWddKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdzLmVuZChkYXRhVG9BcHBlbmQsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5kZWNyeXB0U3RyZWFtID0gZnVuY3Rpb24gKGVuY3J5cHRlZElucHV0UGF0aCwgb3V0cHV0Rm9sZGVyLCBwYXNzd29yZCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgUHNrQXJjaGl2ZXIgPSByZXF1aXJlKFwiLi9wc2stYXJjaGl2ZXJcIik7XG4gICAgICAgIGNvbnN0IGFyY2hpdmVyID0gbmV3IFBza0FyY2hpdmVyKCk7XG5cbiAgICAgICAgZGVjcnlwdEZpbGUoZW5jcnlwdGVkSW5wdXRQYXRoLCB0ZW1wRm9sZGVyLCBwYXNzd29yZCwgZnVuY3Rpb24gKGVyciwgdGVtcEFyY2hpdmVQYXRoKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFyY2hpdmVyLm9uKCdwcm9ncmVzcycsIChwcm9ncmVzcykgPT4ge1xuICAgICAgICAgICAgICAgIHNlbGYuZW1pdCgncHJvZ3Jlc3MnLCAxMCArIDAuOSAqIHByb2dyZXNzKTtcbiAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgIGFyY2hpdmVyLnVuemlwU3RyZWFtKHRlbXBBcmNoaXZlUGF0aCwgb3V0cHV0Rm9sZGVyLCBmdW5jdGlvbiAoZXJyLCB1bnppcHBlZEZpbGVOYW1lcykge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdXRpbHMuZGVsZXRlUmVjdXJzaXZlbHkodGVtcEFyY2hpdmVQYXRoLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1bnppcHBlZEZpbGVOYW1lcyk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH07XG5cbiAgICB0aGlzLmVuY3J5cHRPYmplY3QgPSBmdW5jdGlvbiAoaW5wdXRPYmosIGRzZWVkLCBkZXB0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgUHNrQXJjaGl2ZXIgPSByZXF1aXJlKFwiLi9wc2stYXJjaGl2ZXJcIik7XG4gICAgICAgIGNvbnN0IGFyY2hpdmVyID0gbmV3IFBza0FyY2hpdmVyKCk7XG5cbiAgICAgICAgYXJjaGl2ZXIuemlwSW5NZW1vcnkoaW5wdXRPYmosIGRlcHRoLCBmdW5jdGlvbiAoZXJyLCB6aXBwZWRPYmopIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGNpcGhlclRleHQgPSB1dGlscy5lbmNyeXB0KHppcHBlZE9iaiwgZHNlZWQpO1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgY2lwaGVyVGV4dCk7XG4gICAgICAgIH0pXG4gICAgfTtcblxuICAgIHRoaXMuZGVjcnlwdE9iamVjdCA9IGZ1bmN0aW9uIChlbmNyeXB0ZWREYXRhLCBkc2VlZCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgUHNrQXJjaGl2ZXIgPSByZXF1aXJlKFwiLi9wc2stYXJjaGl2ZXJcIik7XG4gICAgICAgIGNvbnN0IGFyY2hpdmVyID0gbmV3IFBza0FyY2hpdmVyKCk7XG5cbiAgICAgICAgY29uc3QgemlwcGVkT2JqZWN0ID0gdXRpbHMuZGVjcnlwdChlbmNyeXB0ZWREYXRhLCBkc2VlZCk7XG4gICAgICAgIGFyY2hpdmVyLnVuemlwSW5NZW1vcnkoemlwcGVkT2JqZWN0LCBmdW5jdGlvbiAoZXJyLCBvYmopIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIG9iaik7XG4gICAgICAgIH0pXG4gICAgfTtcblxuICAgIHRoaXMucHNrSGFzaCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoZGF0YSkpIHtcbiAgICAgICAgICAgIHJldHVybiB1dGlscy5jcmVhdGVQc2tIYXNoKGRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gdXRpbHMuY3JlYXRlUHNrSGFzaChKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV0aWxzLmNyZWF0ZVBza0hhc2goZGF0YSk7XG4gICAgfTtcblxuICAgIHRoaXMucHNrSGFzaFN0cmVhbSA9IGZ1bmN0aW9uIChyZWFkU3RyZWFtLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBwc2tIYXNoID0gbmV3IHV0aWxzLlBza0hhc2goKTtcblxuICAgICAgICByZWFkU3RyZWFtLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICBwc2tIYXNoLnVwZGF0ZShjaHVuayk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgcmVhZFN0cmVhbS5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcHNrSGFzaC5kaWdlc3QoKSk7XG4gICAgICAgIH0pXG4gICAgfTtcblxuXG4gICAgdGhpcy5zYXZlRGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBwYXNzd29yZCwgcGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgZW5jcnlwdGlvbktleSA9IHRoaXMuZGVyaXZlS2V5KHBhc3N3b3JkLCBudWxsLCBudWxsKTtcbiAgICAgICAgY29uc3QgaXYgPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMTYpO1xuICAgICAgICBjb25zdCBjaXBoZXIgPSBjcnlwdG8uY3JlYXRlQ2lwaGVyaXYoJ2Flcy0yNTYtY2ZiJywgZW5jcnlwdGlvbktleSwgaXYpO1xuICAgICAgICBsZXQgZW5jcnlwdGVkRFNlZWQgPSBjaXBoZXIudXBkYXRlKGRhdGEsICdiaW5hcnknKTtcbiAgICAgICAgY29uc3QgZmluYWwgPSBCdWZmZXIuZnJvbShjaXBoZXIuZmluYWwoJ2JpbmFyeScpLCAnYmluYXJ5Jyk7XG4gICAgICAgIGVuY3J5cHRlZERTZWVkID0gQnVmZmVyLmNvbmNhdChbaXYsIGVuY3J5cHRlZERTZWVkLCBmaW5hbF0pO1xuICAgICAgICBmcy53cml0ZUZpbGUocGF0aCwgZW5jcnlwdGVkRFNlZWQsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0pO1xuICAgIH07XG5cblxuICAgIHRoaXMubG9hZERhdGEgPSBmdW5jdGlvbiAocGFzc3dvcmQsIHBhdGgsIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgZnMucmVhZEZpbGUocGF0aCwgbnVsbCwgKGVyciwgZW5jcnlwdGVkRGF0YSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl2ID0gZW5jcnlwdGVkRGF0YS5zbGljZSgwLCAxNik7XG4gICAgICAgICAgICAgICAgY29uc3QgZW5jcnlwdGVkRHNlZWQgPSBlbmNyeXB0ZWREYXRhLnNsaWNlKDE2KTtcbiAgICAgICAgICAgICAgICBjb25zdCBlbmNyeXB0aW9uS2V5ID0gdGhpcy5kZXJpdmVLZXkocGFzc3dvcmQsIG51bGwsIG51bGwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlY2lwaGVyID0gY3J5cHRvLmNyZWF0ZURlY2lwaGVyaXYoJ2Flcy0yNTYtY2ZiJywgZW5jcnlwdGlvbktleSwgaXYpO1xuICAgICAgICAgICAgICAgIGxldCBkc2VlZCA9IEJ1ZmZlci5mcm9tKGRlY2lwaGVyLnVwZGF0ZShlbmNyeXB0ZWREc2VlZCwgJ2JpbmFyeScpLCAnYmluYXJ5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZmluYWwgPSBCdWZmZXIuZnJvbShkZWNpcGhlci5maW5hbCgnYmluYXJ5JyksICdiaW5hcnknKTtcbiAgICAgICAgICAgICAgICBkc2VlZCA9IEJ1ZmZlci5jb25jYXQoW2RzZWVkLCBmaW5hbF0pO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGRzZWVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuXG4gICAgdGhpcy5nZW5lcmF0ZVNhZmVVaWQgPSBmdW5jdGlvbiAocGFzc3dvcmQsIGFkZGl0aW9uYWxEYXRhKSB7XG4gICAgICAgIHBhc3N3b3JkID0gcGFzc3dvcmQgfHwgQnVmZmVyLmFsbG9jKDApO1xuICAgICAgICBpZiAoIWFkZGl0aW9uYWxEYXRhKSB7XG4gICAgICAgICAgICBhZGRpdGlvbmFsRGF0YSA9IEJ1ZmZlci5hbGxvYygwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGFkZGl0aW9uYWxEYXRhKSkge1xuICAgICAgICAgICAgYWRkaXRpb25hbERhdGEgPSBCdWZmZXIuZnJvbShhZGRpdGlvbmFsRGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdXRpbHMuZW5jb2RlKHRoaXMucHNrSGFzaChCdWZmZXIuY29uY2F0KFtwYXNzd29yZCwgYWRkaXRpb25hbERhdGFdKSkpO1xuICAgIH07XG5cbiAgICB0aGlzLmRlcml2ZUtleSA9IGZ1bmN0aW9uIGRlcml2ZUtleShwYXNzd29yZCwgaXRlcmF0aW9ucywgZGtMZW4pIHtcbiAgICAgICAgaXRlcmF0aW9ucyA9IGl0ZXJhdGlvbnMgfHwgMTAwMDtcbiAgICAgICAgZGtMZW4gPSBka0xlbiB8fCAzMjtcbiAgICAgICAgY29uc3Qgc2FsdCA9IHV0aWxzLmdlbmVyYXRlU2FsdChwYXNzd29yZCwgMzIpO1xuICAgICAgICBjb25zdCBkayA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBzYWx0LCBpdGVyYXRpb25zLCBka0xlbiwgJ3NoYTUxMicpO1xuICAgICAgICByZXR1cm4gQnVmZmVyLmZyb20oZGspO1xuICAgIH07XG5cbiAgICB0aGlzLnJhbmRvbUJ5dGVzID0gY3J5cHRvLnJhbmRvbUJ5dGVzO1xuICAgIHRoaXMuUHNrSGFzaCA9IHV0aWxzLlBza0hhc2g7XG5cbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIEludGVybmFsIGZ1bmN0aW9ucyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGZ1bmN0aW9uIGRlY3J5cHRGaWxlKGVuY3J5cHRlZElucHV0UGF0aCwgdGVtcEZvbGRlciwgcGFzc3dvcmQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGZzLnN0YXQoZW5jcnlwdGVkSW5wdXRQYXRoLCBmdW5jdGlvbiAoZXJyLCBzdGF0cykge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIsIG51bGwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBmaWxlU2l6ZUluQnl0ZXMgPSBzdGF0cy5zaXplO1xuXG4gICAgICAgICAgICBmcy5vcGVuKGVuY3J5cHRlZElucHV0UGF0aCwgXCJyXCIsIGZ1bmN0aW9uIChlcnIsIGZkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIG51bGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuY3J5cHRlZEF1dGhEYXRhID0gQnVmZmVyLmFsbG9jKDgwKTtcblxuICAgICAgICAgICAgICAgICAgICBmcy5yZWFkKGZkLCBlbmNyeXB0ZWRBdXRoRGF0YSwgMCwgODAsIGZpbGVTaXplSW5CeXRlcyAtIDgwLCBmdW5jdGlvbiAoZXJyLCBieXRlc1JlYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhbHQgPSBlbmNyeXB0ZWRBdXRoRGF0YS5zbGljZSgwLCA2NCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXlTYWx0ID0gc2FsdC5zbGljZSgwLCAzMik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhYWRTYWx0ID0gc2FsdC5zbGljZSgtMzIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpdiA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBzYWx0LCB1dGlscy5pdGVyYXRpb25zX251bWJlciwgMTIsICdzaGE1MTInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBrZXlTYWx0LCB1dGlscy5pdGVyYXRpb25zX251bWJlciwgMzIsICdzaGE1MTInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFhZCA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBhYWRTYWx0LCB1dGlscy5pdGVyYXRpb25zX251bWJlciwgMzIsICdzaGE1MTInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhZyA9IGVuY3J5cHRlZEF1dGhEYXRhLnNsaWNlKC0xNik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY2lwaGVyID0gY3J5cHRvLmNyZWF0ZURlY2lwaGVyaXYodXRpbHMuYWxnb3JpdGhtLCBrZXksIGl2KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZGVjaXBoZXIuc2V0QUFEKGFhZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWNpcGhlci5zZXRBdXRoVGFnKHRhZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBycyA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0oZW5jcnlwdGVkSW5wdXRQYXRoLCB7c3RhcnQ6IDAsIGVuZDogZmlsZVNpemVJbkJ5dGVzIC0gODF9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZzLm1rZGlyKHRlbXBGb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCBmdW5jdGlvbiAoZXJyKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZW1wQXJjaGl2ZVBhdGggPSBwYXRoLmpvaW4odGVtcEZvbGRlciwgcGF0aC5iYXNlbmFtZShlbmNyeXB0ZWRJbnB1dFBhdGgpICsgXCIuemlwXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnMub3Blbih0ZW1wQXJjaGl2ZVBhdGgsIFwid1wiLCBmdW5jdGlvbiAoZXJyLCBmZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnMuY2xvc2UoZmQsIGZ1bmN0aW9uIChlcnIpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwdFN0cmVhbSA9IG5ldyBQYXNzVGhyb3VnaFN0cmVhbSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB3cyA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHRlbXBBcmNoaXZlUGF0aCwge2F1dG9DbG9zZTogZmFsc2V9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdzLm9uKFwiZmluaXNoXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB0ZW1wQXJjaGl2ZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByb2dyZXNzTGVuZ3RoID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0b3RhbExlbmd0aCA9IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogVE9ETyByZXZpZXcgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogSW4gYnJvd3NlciwgcGlwaW5nIHdpbGwgYmxvY2sgdGhlIGV2ZW50IGxvb3AgYW5kIHRoZSBzdGFjayBxdWV1ZSBpcyBub3QgY2FsbGVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBycy5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NMZW5ndGggKz0gY2h1bmsubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsTGVuZ3RoICs9IGNodW5rLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9ncmVzc0xlbmd0aCA+IDMwMDAwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmVzc0xlbmd0aCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVtaXRQcm9ncmVzcyhmaWxlU2l6ZUluQnl0ZXMsIHRvdGFsTGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBycy5waXBlKGRlY2lwaGVyKS5waXBlKHB0U3RyZWFtKS5waXBlKHdzKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVtaXRQcm9ncmVzcyh0b3RhbCwgcHJvY2Vzc2VkKSB7XG5cblxuICAgICAgICBpZiAocHJvY2Vzc2VkID4gdG90YWwpIHtcbiAgICAgICAgICAgIHByb2Nlc3NlZCA9IHRvdGFsO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSAoMTAwICogcHJvY2Vzc2VkKSAvIHRvdGFsO1xuICAgICAgICBzZWxmLmVtaXQoJ3Byb2dyZXNzJywgcGFyc2VJbnQocHJvZ3Jlc3MpKTtcbiAgICB9XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgUHNrQ3J5cHRvKCk7XG4iLCJ2YXIgYXNuMSA9IHJlcXVpcmUoJy4vYXNuMScpO1xudmFyIGluaGVyaXRzID0gcmVxdWlyZSgndXRpbCcpLmluaGVyaXRzO1xuXG52YXIgYXBpID0gZXhwb3J0cztcblxuYXBpLmRlZmluZSA9IGZ1bmN0aW9uIGRlZmluZShuYW1lLCBib2R5KSB7XG4gIHJldHVybiBuZXcgRW50aXR5KG5hbWUsIGJvZHkpO1xufTtcblxuZnVuY3Rpb24gRW50aXR5KG5hbWUsIGJvZHkpIHtcbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgdGhpcy5ib2R5ID0gYm9keTtcblxuICB0aGlzLmRlY29kZXJzID0ge307XG4gIHRoaXMuZW5jb2RlcnMgPSB7fTtcbn07XG5cbkVudGl0eS5wcm90b3R5cGUuX2NyZWF0ZU5hbWVkID0gZnVuY3Rpb24gY3JlYXRlTmFtZWQoYmFzZSkge1xuICB2YXIgbmFtZWQ7XG4gIHRyeSB7XG4gICAgbmFtZWQgPSByZXF1aXJlKCd2bScpLnJ1bkluVGhpc0NvbnRleHQoXG4gICAgICAnKGZ1bmN0aW9uICcgKyB0aGlzLm5hbWUgKyAnKGVudGl0eSkge1xcbicgK1xuICAgICAgJyAgdGhpcy5faW5pdE5hbWVkKGVudGl0eSk7XFxuJyArXG4gICAgICAnfSknXG4gICAgKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIG5hbWVkID0gZnVuY3Rpb24gKGVudGl0eSkge1xuICAgICAgdGhpcy5faW5pdE5hbWVkKGVudGl0eSk7XG4gICAgfTtcbiAgfVxuICBpbmhlcml0cyhuYW1lZCwgYmFzZSk7XG4gIG5hbWVkLnByb3RvdHlwZS5faW5pdE5hbWVkID0gZnVuY3Rpb24gaW5pdG5hbWVkKGVudGl0eSkge1xuICAgIGJhc2UuY2FsbCh0aGlzLCBlbnRpdHkpO1xuICB9O1xuXG4gIHJldHVybiBuZXcgbmFtZWQodGhpcyk7XG59O1xuXG5FbnRpdHkucHJvdG90eXBlLl9nZXREZWNvZGVyID0gZnVuY3Rpb24gX2dldERlY29kZXIoZW5jKSB7XG4gIC8vIExhemlseSBjcmVhdGUgZGVjb2RlclxuICBpZiAoIXRoaXMuZGVjb2RlcnMuaGFzT3duUHJvcGVydHkoZW5jKSlcbiAgICB0aGlzLmRlY29kZXJzW2VuY10gPSB0aGlzLl9jcmVhdGVOYW1lZChhc24xLmRlY29kZXJzW2VuY10pO1xuICByZXR1cm4gdGhpcy5kZWNvZGVyc1tlbmNdO1xufTtcblxuRW50aXR5LnByb3RvdHlwZS5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUoZGF0YSwgZW5jLCBvcHRpb25zKSB7XG4gIHJldHVybiB0aGlzLl9nZXREZWNvZGVyKGVuYykuZGVjb2RlKGRhdGEsIG9wdGlvbnMpO1xufTtcblxuRW50aXR5LnByb3RvdHlwZS5fZ2V0RW5jb2RlciA9IGZ1bmN0aW9uIF9nZXRFbmNvZGVyKGVuYykge1xuICAvLyBMYXppbHkgY3JlYXRlIGVuY29kZXJcbiAgaWYgKCF0aGlzLmVuY29kZXJzLmhhc093blByb3BlcnR5KGVuYykpXG4gICAgdGhpcy5lbmNvZGVyc1tlbmNdID0gdGhpcy5fY3JlYXRlTmFtZWQoYXNuMS5lbmNvZGVyc1tlbmNdKTtcbiAgcmV0dXJuIHRoaXMuZW5jb2RlcnNbZW5jXTtcbn07XG5cbkVudGl0eS5wcm90b3R5cGUuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKGRhdGEsIGVuYywgLyogaW50ZXJuYWwgKi8gcmVwb3J0ZXIpIHtcbiAgcmV0dXJuIHRoaXMuX2dldEVuY29kZXIoZW5jKS5lbmNvZGUoZGF0YSwgcmVwb3J0ZXIpO1xufTtcbiIsInZhciBhc24xID0gZXhwb3J0cztcblxuYXNuMS5iaWdudW0gPSByZXF1aXJlKCcuL2JpZ251bS9ibicpO1xuXG5hc24xLmRlZmluZSA9IHJlcXVpcmUoJy4vYXBpJykuZGVmaW5lO1xuYXNuMS5iYXNlID0gcmVxdWlyZSgnLi9iYXNlL2luZGV4Jyk7XG5hc24xLmNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzL2luZGV4Jyk7XG5hc24xLmRlY29kZXJzID0gcmVxdWlyZSgnLi9kZWNvZGVycy9pbmRleCcpO1xuYXNuMS5lbmNvZGVycyA9IHJlcXVpcmUoJy4vZW5jb2RlcnMvaW5kZXgnKTtcbiIsInZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ3V0aWwnKS5pbmhlcml0cztcbnZhciBSZXBvcnRlciA9IHJlcXVpcmUoJy4uL2Jhc2UnKS5SZXBvcnRlcjtcbnZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXI7XG5cbmZ1bmN0aW9uIERlY29kZXJCdWZmZXIoYmFzZSwgb3B0aW9ucykge1xuICBSZXBvcnRlci5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiYXNlKSkge1xuICAgIHRoaXMuZXJyb3IoJ0lucHV0IG5vdCBCdWZmZXInKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB0aGlzLmJhc2UgPSBiYXNlO1xuICB0aGlzLm9mZnNldCA9IDA7XG4gIHRoaXMubGVuZ3RoID0gYmFzZS5sZW5ndGg7XG59XG5pbmhlcml0cyhEZWNvZGVyQnVmZmVyLCBSZXBvcnRlcik7XG5leHBvcnRzLkRlY29kZXJCdWZmZXIgPSBEZWNvZGVyQnVmZmVyO1xuXG5EZWNvZGVyQnVmZmVyLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gc2F2ZSgpIHtcbiAgcmV0dXJuIHsgb2Zmc2V0OiB0aGlzLm9mZnNldCwgcmVwb3J0ZXI6IFJlcG9ydGVyLnByb3RvdHlwZS5zYXZlLmNhbGwodGhpcykgfTtcbn07XG5cbkRlY29kZXJCdWZmZXIucHJvdG90eXBlLnJlc3RvcmUgPSBmdW5jdGlvbiByZXN0b3JlKHNhdmUpIHtcbiAgLy8gUmV0dXJuIHNraXBwZWQgZGF0YVxuICB2YXIgcmVzID0gbmV3IERlY29kZXJCdWZmZXIodGhpcy5iYXNlKTtcbiAgcmVzLm9mZnNldCA9IHNhdmUub2Zmc2V0O1xuICByZXMubGVuZ3RoID0gdGhpcy5vZmZzZXQ7XG5cbiAgdGhpcy5vZmZzZXQgPSBzYXZlLm9mZnNldDtcbiAgUmVwb3J0ZXIucHJvdG90eXBlLnJlc3RvcmUuY2FsbCh0aGlzLCBzYXZlLnJlcG9ydGVyKTtcblxuICByZXR1cm4gcmVzO1xufTtcblxuRGVjb2RlckJ1ZmZlci5wcm90b3R5cGUuaXNFbXB0eSA9IGZ1bmN0aW9uIGlzRW1wdHkoKSB7XG4gIHJldHVybiB0aGlzLm9mZnNldCA9PT0gdGhpcy5sZW5ndGg7XG59O1xuXG5EZWNvZGVyQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDgoZmFpbCkge1xuICBpZiAodGhpcy5vZmZzZXQgKyAxIDw9IHRoaXMubGVuZ3RoKVxuICAgIHJldHVybiB0aGlzLmJhc2UucmVhZFVJbnQ4KHRoaXMub2Zmc2V0KyssIHRydWUpO1xuICBlbHNlXG4gICAgcmV0dXJuIHRoaXMuZXJyb3IoZmFpbCB8fCAnRGVjb2RlckJ1ZmZlciBvdmVycnVuJyk7XG59XG5cbkRlY29kZXJCdWZmZXIucHJvdG90eXBlLnNraXAgPSBmdW5jdGlvbiBza2lwKGJ5dGVzLCBmYWlsKSB7XG4gIGlmICghKHRoaXMub2Zmc2V0ICsgYnl0ZXMgPD0gdGhpcy5sZW5ndGgpKVxuICAgIHJldHVybiB0aGlzLmVycm9yKGZhaWwgfHwgJ0RlY29kZXJCdWZmZXIgb3ZlcnJ1bicpO1xuXG4gIHZhciByZXMgPSBuZXcgRGVjb2RlckJ1ZmZlcih0aGlzLmJhc2UpO1xuXG4gIC8vIFNoYXJlIHJlcG9ydGVyIHN0YXRlXG4gIHJlcy5fcmVwb3J0ZXJTdGF0ZSA9IHRoaXMuX3JlcG9ydGVyU3RhdGU7XG5cbiAgcmVzLm9mZnNldCA9IHRoaXMub2Zmc2V0O1xuICByZXMubGVuZ3RoID0gdGhpcy5vZmZzZXQgKyBieXRlcztcbiAgdGhpcy5vZmZzZXQgKz0gYnl0ZXM7XG4gIHJldHVybiByZXM7XG59XG5cbkRlY29kZXJCdWZmZXIucHJvdG90eXBlLnJhdyA9IGZ1bmN0aW9uIHJhdyhzYXZlKSB7XG4gIHJldHVybiB0aGlzLmJhc2Uuc2xpY2Uoc2F2ZSA/IHNhdmUub2Zmc2V0IDogdGhpcy5vZmZzZXQsIHRoaXMubGVuZ3RoKTtcbn1cblxuZnVuY3Rpb24gRW5jb2RlckJ1ZmZlcih2YWx1ZSwgcmVwb3J0ZXIpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZS5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgaWYgKCEoaXRlbSBpbnN0YW5jZW9mIEVuY29kZXJCdWZmZXIpKVxuICAgICAgICBpdGVtID0gbmV3IEVuY29kZXJCdWZmZXIoaXRlbSwgcmVwb3J0ZXIpO1xuICAgICAgdGhpcy5sZW5ndGggKz0gaXRlbS5sZW5ndGg7XG4gICAgICByZXR1cm4gaXRlbTtcbiAgICB9LCB0aGlzKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKCEoMCA8PSB2YWx1ZSAmJiB2YWx1ZSA8PSAweGZmKSlcbiAgICAgIHJldHVybiByZXBvcnRlci5lcnJvcignbm9uLWJ5dGUgRW5jb2RlckJ1ZmZlciB2YWx1ZScpO1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB0aGlzLmxlbmd0aCA9IDE7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB0aGlzLmxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHZhbHVlKTtcbiAgfSBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIodmFsdWUpKSB7XG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgIHRoaXMubGVuZ3RoID0gdmFsdWUubGVuZ3RoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByZXBvcnRlci5lcnJvcignVW5zdXBwb3J0ZWQgdHlwZTogJyArIHR5cGVvZiB2YWx1ZSk7XG4gIH1cbn1cbmV4cG9ydHMuRW5jb2RlckJ1ZmZlciA9IEVuY29kZXJCdWZmZXI7XG5cbkVuY29kZXJCdWZmZXIucHJvdG90eXBlLmpvaW4gPSBmdW5jdGlvbiBqb2luKG91dCwgb2Zmc2V0KSB7XG4gIGlmICghb3V0KVxuICAgIG91dCA9IG5ldyBCdWZmZXIodGhpcy5sZW5ndGgpO1xuICBpZiAoIW9mZnNldClcbiAgICBvZmZzZXQgPSAwO1xuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMClcbiAgICByZXR1cm4gb3V0O1xuXG4gIGlmIChBcnJheS5pc0FycmF5KHRoaXMudmFsdWUpKSB7XG4gICAgdGhpcy52YWx1ZS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIGl0ZW0uam9pbihvdXQsIG9mZnNldCk7XG4gICAgICBvZmZzZXQgKz0gaXRlbS5sZW5ndGg7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLnZhbHVlID09PSAnbnVtYmVyJylcbiAgICAgIG91dFtvZmZzZXRdID0gdGhpcy52YWx1ZTtcbiAgICBlbHNlIGlmICh0eXBlb2YgdGhpcy52YWx1ZSA9PT0gJ3N0cmluZycpXG4gICAgICBvdXQud3JpdGUodGhpcy52YWx1ZSwgb2Zmc2V0KTtcbiAgICBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIodGhpcy52YWx1ZSkpXG4gICAgICB0aGlzLnZhbHVlLmNvcHkob3V0LCBvZmZzZXQpO1xuICAgIG9mZnNldCArPSB0aGlzLmxlbmd0aDtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuIiwidmFyIGJhc2UgPSBleHBvcnRzO1xuXG5iYXNlLlJlcG9ydGVyID0gcmVxdWlyZSgnLi9yZXBvcnRlcicpLlJlcG9ydGVyO1xuYmFzZS5EZWNvZGVyQnVmZmVyID0gcmVxdWlyZSgnLi9idWZmZXInKS5EZWNvZGVyQnVmZmVyO1xuYmFzZS5FbmNvZGVyQnVmZmVyID0gcmVxdWlyZSgnLi9idWZmZXInKS5FbmNvZGVyQnVmZmVyO1xuYmFzZS5Ob2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XG4iLCJ2YXIgUmVwb3J0ZXIgPSByZXF1aXJlKCcuLi9iYXNlJykuUmVwb3J0ZXI7XG52YXIgRW5jb2RlckJ1ZmZlciA9IHJlcXVpcmUoJy4uL2Jhc2UnKS5FbmNvZGVyQnVmZmVyO1xuLy92YXIgYXNzZXJ0ID0gcmVxdWlyZSgnZG91YmxlLWNoZWNrJykuYXNzZXJ0O1xuXG4vLyBTdXBwb3J0ZWQgdGFnc1xudmFyIHRhZ3MgPSBbXG4gICdzZXEnLCAnc2Vxb2YnLCAnc2V0JywgJ3NldG9mJywgJ29jdHN0cicsICdiaXRzdHInLCAnb2JqaWQnLCAnYm9vbCcsXG4gICdnZW50aW1lJywgJ3V0Y3RpbWUnLCAnbnVsbF8nLCAnZW51bScsICdpbnQnLCAnaWE1c3RyJywgJ3V0ZjhzdHInXG5dO1xuXG4vLyBQdWJsaWMgbWV0aG9kcyBsaXN0XG52YXIgbWV0aG9kcyA9IFtcbiAgJ2tleScsICdvYmonLCAndXNlJywgJ29wdGlvbmFsJywgJ2V4cGxpY2l0JywgJ2ltcGxpY2l0JywgJ2RlZicsICdjaG9pY2UnLFxuICAnYW55J1xuXS5jb25jYXQodGFncyk7XG5cbi8vIE92ZXJyaWRlZCBtZXRob2RzIGxpc3RcbnZhciBvdmVycmlkZWQgPSBbXG4gICdfcGVla1RhZycsICdfZGVjb2RlVGFnJywgJ191c2UnLFxuICAnX2RlY29kZVN0cicsICdfZGVjb2RlT2JqaWQnLCAnX2RlY29kZVRpbWUnLFxuICAnX2RlY29kZU51bGwnLCAnX2RlY29kZUludCcsICdfZGVjb2RlQm9vbCcsICdfZGVjb2RlTGlzdCcsXG5cbiAgJ19lbmNvZGVDb21wb3NpdGUnLCAnX2VuY29kZVN0cicsICdfZW5jb2RlT2JqaWQnLCAnX2VuY29kZVRpbWUnLFxuICAnX2VuY29kZU51bGwnLCAnX2VuY29kZUludCcsICdfZW5jb2RlQm9vbCdcbl07XG5cbmZ1bmN0aW9uIE5vZGUoZW5jLCBwYXJlbnQpIHtcbiAgdmFyIHN0YXRlID0ge307XG4gIHRoaXMuX2Jhc2VTdGF0ZSA9IHN0YXRlO1xuXG4gIHN0YXRlLmVuYyA9IGVuYztcblxuICBzdGF0ZS5wYXJlbnQgPSBwYXJlbnQgfHwgbnVsbDtcbiAgc3RhdGUuY2hpbGRyZW4gPSBudWxsO1xuXG4gIC8vIFN0YXRlXG4gIHN0YXRlLnRhZyA9IG51bGw7XG4gIHN0YXRlLmFyZ3MgPSBudWxsO1xuICBzdGF0ZS5yZXZlcnNlQXJncyA9IG51bGw7XG4gIHN0YXRlLmNob2ljZSA9IG51bGw7XG4gIHN0YXRlLm9wdGlvbmFsID0gZmFsc2U7XG4gIHN0YXRlLmFueSA9IGZhbHNlO1xuICBzdGF0ZS5vYmogPSBmYWxzZTtcbiAgc3RhdGUudXNlID0gbnVsbDtcbiAgc3RhdGUudXNlRGVjb2RlciA9IG51bGw7XG4gIHN0YXRlLmtleSA9IG51bGw7XG4gIHN0YXRlWydkZWZhdWx0J10gPSBudWxsO1xuICBzdGF0ZS5leHBsaWNpdCA9IG51bGw7XG4gIHN0YXRlLmltcGxpY2l0ID0gbnVsbDtcblxuICAvLyBTaG91bGQgY3JlYXRlIG5ldyBpbnN0YW5jZSBvbiBlYWNoIG1ldGhvZFxuICBpZiAoIXN0YXRlLnBhcmVudCkge1xuICAgIHN0YXRlLmNoaWxkcmVuID0gW107XG4gICAgdGhpcy5fd3JhcCgpO1xuICB9XG59XG5tb2R1bGUuZXhwb3J0cyA9IE5vZGU7XG5cbnZhciBzdGF0ZVByb3BzID0gW1xuICAnZW5jJywgJ3BhcmVudCcsICdjaGlsZHJlbicsICd0YWcnLCAnYXJncycsICdyZXZlcnNlQXJncycsICdjaG9pY2UnLFxuICAnb3B0aW9uYWwnLCAnYW55JywgJ29iaicsICd1c2UnLCAnYWx0ZXJlZFVzZScsICdrZXknLCAnZGVmYXVsdCcsICdleHBsaWNpdCcsXG4gICdpbXBsaWNpdCdcbl07XG5cbk5vZGUucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gY2xvbmUoKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcbiAgdmFyIGNzdGF0ZSA9IHt9O1xuICBzdGF0ZVByb3BzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgIGNzdGF0ZVtwcm9wXSA9IHN0YXRlW3Byb3BdO1xuICB9KTtcbiAgdmFyIHJlcyA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKGNzdGF0ZS5wYXJlbnQpO1xuICByZXMuX2Jhc2VTdGF0ZSA9IGNzdGF0ZTtcbiAgcmV0dXJuIHJlcztcbn07XG5cbk5vZGUucHJvdG90eXBlLl93cmFwID0gZnVuY3Rpb24gd3JhcCgpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuICBtZXRob2RzLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgdGhpc1ttZXRob2RdID0gZnVuY3Rpb24gX3dyYXBwZWRNZXRob2QoKSB7XG4gICAgICB2YXIgY2xvbmUgPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcih0aGlzKTtcbiAgICAgIHN0YXRlLmNoaWxkcmVuLnB1c2goY2xvbmUpO1xuICAgICAgcmV0dXJuIGNsb25lW21ldGhvZF0uYXBwbHkoY2xvbmUsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfSwgdGhpcyk7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uIGluaXQoYm9keSkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cbiAgLy9hc3NlcnQuZXF1YWwoc3RhdGUucGFyZW50LG51bGwsJ3N0YXRlLnBhcmVudCBzaG91bGQgYmUgbnVsbCcpO1xuICBib2R5LmNhbGwodGhpcyk7XG5cbiAgLy8gRmlsdGVyIGNoaWxkcmVuXG4gIHN0YXRlLmNoaWxkcmVuID0gc3RhdGUuY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgcmV0dXJuIGNoaWxkLl9iYXNlU3RhdGUucGFyZW50ID09PSB0aGlzO1xuICB9LCB0aGlzKTtcbiAgLy8gYXNzZXJ0LmVxdWFsKHN0YXRlLmNoaWxkcmVuLmxlbmd0aCwgMSwgJ1Jvb3Qgbm9kZSBjYW4gaGF2ZSBvbmx5IG9uZSBjaGlsZCcpO1xufTtcblxuTm9kZS5wcm90b3R5cGUuX3VzZUFyZ3MgPSBmdW5jdGlvbiB1c2VBcmdzKGFyZ3MpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXG4gIC8vIEZpbHRlciBjaGlsZHJlbiBhbmQgYXJnc1xuICB2YXIgY2hpbGRyZW4gPSBhcmdzLmZpbHRlcihmdW5jdGlvbihhcmcpIHtcbiAgICByZXR1cm4gYXJnIGluc3RhbmNlb2YgdGhpcy5jb25zdHJ1Y3RvcjtcbiAgfSwgdGhpcyk7XG4gIGFyZ3MgPSBhcmdzLmZpbHRlcihmdW5jdGlvbihhcmcpIHtcbiAgICByZXR1cm4gIShhcmcgaW5zdGFuY2VvZiB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgfSwgdGhpcyk7XG5cbiAgaWYgKGNoaWxkcmVuLmxlbmd0aCAhPT0gMCkge1xuICAgIC8vIGFzc2VydC5lcXVhbChzdGF0ZS5jaGlsZHJlbiwgbnVsbCwgJ3N0YXRlLmNoaWxkcmVuIHNob3VsZCBiZSBudWxsJyk7XG4gICAgc3RhdGUuY2hpbGRyZW4gPSBjaGlsZHJlbjtcblxuICAgIC8vIFJlcGxhY2UgcGFyZW50IHRvIG1haW50YWluIGJhY2t3YXJkIGxpbmtcbiAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICBjaGlsZC5fYmFzZVN0YXRlLnBhcmVudCA9IHRoaXM7XG4gICAgfSwgdGhpcyk7XG4gIH1cbiAgaWYgKGFyZ3MubGVuZ3RoICE9PSAwKSB7XG4gICAgLy8gYXNzZXJ0LmVxdWFsKHN0YXRlLmFyZ3MsIG51bGwsICdzdGF0ZS5hcmdzIHNob3VsZCBiZSBudWxsJyk7XG4gICAgc3RhdGUuYXJncyA9IGFyZ3M7XG4gICAgc3RhdGUucmV2ZXJzZUFyZ3MgPSBhcmdzLm1hcChmdW5jdGlvbihhcmcpIHtcbiAgICAgIGlmICh0eXBlb2YgYXJnICE9PSAnb2JqZWN0JyB8fCBhcmcuY29uc3RydWN0b3IgIT09IE9iamVjdClcbiAgICAgICAgcmV0dXJuIGFyZztcblxuICAgICAgdmFyIHJlcyA9IHt9O1xuICAgICAgT2JqZWN0LmtleXMoYXJnKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAoa2V5ID09IChrZXkgfCAwKSlcbiAgICAgICAgICBrZXkgfD0gMDtcbiAgICAgICAgdmFyIHZhbHVlID0gYXJnW2tleV07XG4gICAgICAgIHJlc1t2YWx1ZV0gPSBrZXk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXM7XG4gICAgfSk7XG4gIH1cbn07XG5cbi8vXG4vLyBPdmVycmlkZWQgbWV0aG9kc1xuLy9cblxub3ZlcnJpZGVkLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gIE5vZGUucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbiBfb3ZlcnJpZGVkKCkge1xuICAgIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcbiAgICB0aHJvdyBuZXcgRXJyb3IobWV0aG9kICsgJyBub3QgaW1wbGVtZW50ZWQgZm9yIGVuY29kaW5nOiAnICsgc3RhdGUuZW5jKTtcbiAgfTtcbn0pO1xuXG4vL1xuLy8gUHVibGljIG1ldGhvZHNcbi8vXG5cbnRhZ3MuZm9yRWFjaChmdW5jdGlvbih0YWcpIHtcbiAgTm9kZS5wcm90b3R5cGVbdGFnXSA9IGZ1bmN0aW9uIF90YWdNZXRob2QoKSB7XG4gICAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgIC8vIGFzc2VydC5lcXVhbChzdGF0ZS50YWcsIG51bGwsICdzdGF0ZS50YWcgc2hvdWxkIGJlIG51bGwnKTtcbiAgICBzdGF0ZS50YWcgPSB0YWc7XG5cbiAgICB0aGlzLl91c2VBcmdzKGFyZ3MpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG59KTtcblxuTm9kZS5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24gdXNlKGl0ZW0pIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXG4gIC8vIGFzc2VydC5lcXVhbChzdGF0ZS51c2UsIG51bGwsICdzdGF0ZS51c2Ugc2hvdWxkIGJlIG51bGwnKTtcbiAgc3RhdGUudXNlID0gaXRlbTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbk5vZGUucHJvdG90eXBlLm9wdGlvbmFsID0gZnVuY3Rpb24gb3B0aW9uYWwoKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblxuICBzdGF0ZS5vcHRpb25hbCA9IHRydWU7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5kZWYgPSBmdW5jdGlvbiBkZWYodmFsKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblxuICAvLyBhc3NlcnQuZXF1YWwoc3RhdGVbJ2RlZmF1bHQnXSwgbnVsbCwgXCJzdGF0ZVsnZGVmYXVsdCddIHNob3VsZCBiZSBudWxsXCIpO1xuICBzdGF0ZVsnZGVmYXVsdCddID0gdmFsO1xuICBzdGF0ZS5vcHRpb25hbCA9IHRydWU7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5leHBsaWNpdCA9IGZ1bmN0aW9uIGV4cGxpY2l0KG51bSkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cbiAgLy8gYXNzZXJ0LmVxdWFsKHN0YXRlLmV4cGxpY2l0LG51bGwsICdzdGF0ZS5leHBsaWNpdCBzaG91bGQgYmUgbnVsbCcpO1xuICAvLyBhc3NlcnQuZXF1YWwoc3RhdGUuaW1wbGljaXQsbnVsbCwgJ3N0YXRlLmltcGxpY2l0IHNob3VsZCBiZSBudWxsJyk7XG5cbiAgc3RhdGUuZXhwbGljaXQgPSBudW07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5pbXBsaWNpdCA9IGZ1bmN0aW9uIGltcGxpY2l0KG51bSkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cbiAgICAvLyBhc3NlcnQuZXF1YWwoc3RhdGUuZXhwbGljaXQsbnVsbCwgJ3N0YXRlLmV4cGxpY2l0IHNob3VsZCBiZSBudWxsJyk7XG4gICAgLy8gYXNzZXJ0LmVxdWFsKHN0YXRlLmltcGxpY2l0LG51bGwsICdzdGF0ZS5pbXBsaWNpdCBzaG91bGQgYmUgbnVsbCcpO1xuXG4gICAgc3RhdGUuaW1wbGljaXQgPSBudW07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5vYmogPSBmdW5jdGlvbiBvYmooKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gIHN0YXRlLm9iaiA9IHRydWU7XG5cbiAgaWYgKGFyZ3MubGVuZ3RoICE9PSAwKVxuICAgIHRoaXMuX3VzZUFyZ3MoYXJncyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5rZXkgPSBmdW5jdGlvbiBrZXkobmV3S2V5KSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblxuICAvLyBhc3NlcnQuZXF1YWwoc3RhdGUua2V5LCBudWxsLCAnc3RhdGUua2V5IHNob3VsZCBiZSBudWxsJyk7XG4gIHN0YXRlLmtleSA9IG5ld0tleTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbk5vZGUucHJvdG90eXBlLmFueSA9IGZ1bmN0aW9uIGFueSgpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXG4gIHN0YXRlLmFueSA9IHRydWU7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5jaG9pY2UgPSBmdW5jdGlvbiBjaG9pY2Uob2JqKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblxuICAvLyBhc3NlcnQuZXF1YWwoc3RhdGUuY2hvaWNlLCBudWxsLCdzdGF0ZS5jaG9pY2Ugc2hvdWxkIGJlIG51bGwnKTtcbiAgc3RhdGUuY2hvaWNlID0gb2JqO1xuICB0aGlzLl91c2VBcmdzKE9iamVjdC5rZXlzKG9iaikubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBvYmpba2V5XTtcbiAgfSkpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy9cbi8vIERlY29kaW5nXG4vL1xuXG5Ob2RlLnByb3RvdHlwZS5fZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKGlucHV0KSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblxuICAvLyBEZWNvZGUgcm9vdCBub2RlXG4gIGlmIChzdGF0ZS5wYXJlbnQgPT09IG51bGwpXG4gICAgcmV0dXJuIGlucHV0LndyYXBSZXN1bHQoc3RhdGUuY2hpbGRyZW5bMF0uX2RlY29kZShpbnB1dCkpO1xuXG4gIHZhciByZXN1bHQgPSBzdGF0ZVsnZGVmYXVsdCddO1xuICB2YXIgcHJlc2VudCA9IHRydWU7XG5cbiAgdmFyIHByZXZLZXk7XG4gIGlmIChzdGF0ZS5rZXkgIT09IG51bGwpXG4gICAgcHJldktleSA9IGlucHV0LmVudGVyS2V5KHN0YXRlLmtleSk7XG5cbiAgLy8gQ2hlY2sgaWYgdGFnIGlzIHRoZXJlXG4gIGlmIChzdGF0ZS5vcHRpb25hbCkge1xuICAgIHZhciB0YWcgPSBudWxsO1xuICAgIGlmIChzdGF0ZS5leHBsaWNpdCAhPT0gbnVsbClcbiAgICAgIHRhZyA9IHN0YXRlLmV4cGxpY2l0O1xuICAgIGVsc2UgaWYgKHN0YXRlLmltcGxpY2l0ICE9PSBudWxsKVxuICAgICAgdGFnID0gc3RhdGUuaW1wbGljaXQ7XG4gICAgZWxzZSBpZiAoc3RhdGUudGFnICE9PSBudWxsKVxuICAgICAgdGFnID0gc3RhdGUudGFnO1xuXG4gICAgaWYgKHRhZyA9PT0gbnVsbCAmJiAhc3RhdGUuYW55KSB7XG4gICAgICAvLyBUcmlhbCBhbmQgRXJyb3JcbiAgICAgIHZhciBzYXZlID0gaW5wdXQuc2F2ZSgpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHN0YXRlLmNob2ljZSA9PT0gbnVsbClcbiAgICAgICAgICB0aGlzLl9kZWNvZGVHZW5lcmljKHN0YXRlLnRhZywgaW5wdXQpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgdGhpcy5fZGVjb2RlQ2hvaWNlKGlucHV0KTtcbiAgICAgICAgcHJlc2VudCA9IHRydWU7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHByZXNlbnQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlucHV0LnJlc3RvcmUoc2F2ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByZXNlbnQgPSB0aGlzLl9wZWVrVGFnKGlucHV0LCB0YWcsIHN0YXRlLmFueSk7XG5cbiAgICAgIGlmIChpbnB1dC5pc0Vycm9yKHByZXNlbnQpKVxuICAgICAgICByZXR1cm4gcHJlc2VudDtcbiAgICB9XG4gIH1cblxuICAvLyBQdXNoIG9iamVjdCBvbiBzdGFja1xuICB2YXIgcHJldk9iajtcbiAgaWYgKHN0YXRlLm9iaiAmJiBwcmVzZW50KVxuICAgIHByZXZPYmogPSBpbnB1dC5lbnRlck9iamVjdCgpO1xuXG4gIGlmIChwcmVzZW50KSB7XG4gICAgLy8gVW53cmFwIGV4cGxpY2l0IHZhbHVlc1xuICAgIGlmIChzdGF0ZS5leHBsaWNpdCAhPT0gbnVsbCkge1xuICAgICAgdmFyIGV4cGxpY2l0ID0gdGhpcy5fZGVjb2RlVGFnKGlucHV0LCBzdGF0ZS5leHBsaWNpdCk7XG4gICAgICBpZiAoaW5wdXQuaXNFcnJvcihleHBsaWNpdCkpXG4gICAgICAgIHJldHVybiBleHBsaWNpdDtcbiAgICAgIGlucHV0ID0gZXhwbGljaXQ7XG4gICAgfVxuXG4gICAgLy8gVW53cmFwIGltcGxpY2l0IGFuZCBub3JtYWwgdmFsdWVzXG4gICAgaWYgKHN0YXRlLnVzZSA9PT0gbnVsbCAmJiBzdGF0ZS5jaG9pY2UgPT09IG51bGwpIHtcbiAgICAgIGlmIChzdGF0ZS5hbnkpXG4gICAgICAgIHZhciBzYXZlID0gaW5wdXQuc2F2ZSgpO1xuICAgICAgdmFyIGJvZHkgPSB0aGlzLl9kZWNvZGVUYWcoXG4gICAgICAgIGlucHV0LFxuICAgICAgICBzdGF0ZS5pbXBsaWNpdCAhPT0gbnVsbCA/IHN0YXRlLmltcGxpY2l0IDogc3RhdGUudGFnLFxuICAgICAgICBzdGF0ZS5hbnlcbiAgICAgICk7XG4gICAgICBpZiAoaW5wdXQuaXNFcnJvcihib2R5KSlcbiAgICAgICAgcmV0dXJuIGJvZHk7XG5cbiAgICAgIGlmIChzdGF0ZS5hbnkpXG4gICAgICAgIHJlc3VsdCA9IGlucHV0LnJhdyhzYXZlKTtcbiAgICAgIGVsc2VcbiAgICAgICAgaW5wdXQgPSBib2R5O1xuICAgIH1cblxuICAgIC8vIFNlbGVjdCBwcm9wZXIgbWV0aG9kIGZvciB0YWdcbiAgICBpZiAoc3RhdGUuYW55KVxuICAgICAgcmVzdWx0ID0gcmVzdWx0O1xuICAgIGVsc2UgaWYgKHN0YXRlLmNob2ljZSA9PT0gbnVsbClcbiAgICAgIHJlc3VsdCA9IHRoaXMuX2RlY29kZUdlbmVyaWMoc3RhdGUudGFnLCBpbnB1dCk7XG4gICAgZWxzZVxuICAgICAgcmVzdWx0ID0gdGhpcy5fZGVjb2RlQ2hvaWNlKGlucHV0KTtcblxuICAgIGlmIChpbnB1dC5pc0Vycm9yKHJlc3VsdCkpXG4gICAgICByZXR1cm4gcmVzdWx0O1xuXG4gICAgLy8gRGVjb2RlIGNoaWxkcmVuXG4gICAgaWYgKCFzdGF0ZS5hbnkgJiYgc3RhdGUuY2hvaWNlID09PSBudWxsICYmIHN0YXRlLmNoaWxkcmVuICE9PSBudWxsKSB7XG4gICAgICB2YXIgZmFpbCA9IHN0YXRlLmNoaWxkcmVuLnNvbWUoZnVuY3Rpb24gZGVjb2RlQ2hpbGRyZW4oY2hpbGQpIHtcbiAgICAgICAgLy8gTk9URTogV2UgYXJlIGlnbm9yaW5nIGVycm9ycyBoZXJlLCB0byBsZXQgcGFyc2VyIGNvbnRpbnVlIHdpdGggb3RoZXJcbiAgICAgICAgLy8gcGFydHMgb2YgZW5jb2RlZCBkYXRhXG4gICAgICAgIGNoaWxkLl9kZWNvZGUoaW5wdXQpO1xuICAgICAgfSk7XG4gICAgICBpZiAoZmFpbClcbiAgICAgICAgcmV0dXJuIGVycjtcbiAgICB9XG4gIH1cblxuICAvLyBQb3Agb2JqZWN0XG4gIGlmIChzdGF0ZS5vYmogJiYgcHJlc2VudClcbiAgICByZXN1bHQgPSBpbnB1dC5sZWF2ZU9iamVjdChwcmV2T2JqKTtcblxuICAvLyBTZXQga2V5XG4gIGlmIChzdGF0ZS5rZXkgIT09IG51bGwgJiYgKHJlc3VsdCAhPT0gbnVsbCB8fCBwcmVzZW50ID09PSB0cnVlKSlcbiAgICBpbnB1dC5sZWF2ZUtleShwcmV2S2V5LCBzdGF0ZS5rZXksIHJlc3VsdCk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbk5vZGUucHJvdG90eXBlLl9kZWNvZGVHZW5lcmljID0gZnVuY3Rpb24gZGVjb2RlR2VuZXJpYyh0YWcsIGlucHV0KSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblxuICBpZiAodGFnID09PSAnc2VxJyB8fCB0YWcgPT09ICdzZXQnKVxuICAgIHJldHVybiBudWxsO1xuICBpZiAodGFnID09PSAnc2Vxb2YnIHx8IHRhZyA9PT0gJ3NldG9mJylcbiAgICByZXR1cm4gdGhpcy5fZGVjb2RlTGlzdChpbnB1dCwgdGFnLCBzdGF0ZS5hcmdzWzBdKTtcbiAgZWxzZSBpZiAodGFnID09PSAnb2N0c3RyJyB8fCB0YWcgPT09ICdiaXRzdHInKVxuICAgIHJldHVybiB0aGlzLl9kZWNvZGVTdHIoaW5wdXQsIHRhZyk7XG4gIGVsc2UgaWYgKHRhZyA9PT0gJ2lhNXN0cicgfHwgdGFnID09PSAndXRmOHN0cicpXG4gICAgcmV0dXJuIHRoaXMuX2RlY29kZVN0cihpbnB1dCwgdGFnKTtcbiAgZWxzZSBpZiAodGFnID09PSAnb2JqaWQnICYmIHN0YXRlLmFyZ3MpXG4gICAgcmV0dXJuIHRoaXMuX2RlY29kZU9iamlkKGlucHV0LCBzdGF0ZS5hcmdzWzBdLCBzdGF0ZS5hcmdzWzFdKTtcbiAgZWxzZSBpZiAodGFnID09PSAnb2JqaWQnKVxuICAgIHJldHVybiB0aGlzLl9kZWNvZGVPYmppZChpbnB1dCwgbnVsbCwgbnVsbCk7XG4gIGVsc2UgaWYgKHRhZyA9PT0gJ2dlbnRpbWUnIHx8IHRhZyA9PT0gJ3V0Y3RpbWUnKVxuICAgIHJldHVybiB0aGlzLl9kZWNvZGVUaW1lKGlucHV0LCB0YWcpO1xuICBlbHNlIGlmICh0YWcgPT09ICdudWxsXycpXG4gICAgcmV0dXJuIHRoaXMuX2RlY29kZU51bGwoaW5wdXQpO1xuICBlbHNlIGlmICh0YWcgPT09ICdib29sJylcbiAgICByZXR1cm4gdGhpcy5fZGVjb2RlQm9vbChpbnB1dCk7XG4gIGVsc2UgaWYgKHRhZyA9PT0gJ2ludCcgfHwgdGFnID09PSAnZW51bScpXG4gICAgcmV0dXJuIHRoaXMuX2RlY29kZUludChpbnB1dCwgc3RhdGUuYXJncyAmJiBzdGF0ZS5hcmdzWzBdKTtcbiAgZWxzZSBpZiAoc3RhdGUudXNlICE9PSBudWxsKVxuICAgIHJldHVybiB0aGlzLl9nZXRVc2Uoc3RhdGUudXNlLCBpbnB1dC5fcmVwb3J0ZXJTdGF0ZS5vYmopLl9kZWNvZGUoaW5wdXQpO1xuICBlbHNlXG4gICAgcmV0dXJuIGlucHV0LmVycm9yKCd1bmtub3duIHRhZzogJyArIHRhZyk7XG5cbiAgcmV0dXJuIG51bGw7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5fZ2V0VXNlID0gZnVuY3Rpb24gX2dldFVzZShlbnRpdHksIG9iaikge1xuXG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcbiAgLy8gQ3JlYXRlIGFsdGVyZWQgdXNlIGRlY29kZXIgaWYgaW1wbGljaXQgaXMgc2V0XG4gIHN0YXRlLnVzZURlY29kZXIgPSB0aGlzLl91c2UoZW50aXR5LCBvYmopO1xuICAvLyBhc3NlcnQuZXF1YWwoc3RhdGUudXNlRGVjb2Rlci5fYmFzZVN0YXRlLnBhcmVudCwgbnVsbCwgJ3N0YXRlLnVzZURlY29kZXIuX2Jhc2VTdGF0ZS5wYXJlbnQgc2hvdWxkIGJlIG51bGwnKTtcbiAgc3RhdGUudXNlRGVjb2RlciA9IHN0YXRlLnVzZURlY29kZXIuX2Jhc2VTdGF0ZS5jaGlsZHJlblswXTtcbiAgaWYgKHN0YXRlLmltcGxpY2l0ICE9PSBzdGF0ZS51c2VEZWNvZGVyLl9iYXNlU3RhdGUuaW1wbGljaXQpIHtcbiAgICBzdGF0ZS51c2VEZWNvZGVyID0gc3RhdGUudXNlRGVjb2Rlci5jbG9uZSgpO1xuICAgIHN0YXRlLnVzZURlY29kZXIuX2Jhc2VTdGF0ZS5pbXBsaWNpdCA9IHN0YXRlLmltcGxpY2l0O1xuICB9XG4gIHJldHVybiBzdGF0ZS51c2VEZWNvZGVyO1xufTtcblxuTm9kZS5wcm90b3R5cGUuX2RlY29kZUNob2ljZSA9IGZ1bmN0aW9uIGRlY29kZUNob2ljZShpbnB1dCkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG4gIHZhciByZXN1bHQgPSBudWxsO1xuICB2YXIgbWF0Y2ggPSBmYWxzZTtcblxuICBPYmplY3Qua2V5cyhzdGF0ZS5jaG9pY2UpLnNvbWUoZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIHNhdmUgPSBpbnB1dC5zYXZlKCk7XG4gICAgdmFyIG5vZGUgPSBzdGF0ZS5jaG9pY2Vba2V5XTtcbiAgICB0cnkge1xuICAgICAgdmFyIHZhbHVlID0gbm9kZS5fZGVjb2RlKGlucHV0KTtcbiAgICAgIGlmIChpbnB1dC5pc0Vycm9yKHZhbHVlKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgICByZXN1bHQgPSB7IHR5cGU6IGtleSwgdmFsdWU6IHZhbHVlIH07XG4gICAgICBtYXRjaCA9IHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaW5wdXQucmVzdG9yZShzYXZlKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sIHRoaXMpO1xuXG4gIGlmICghbWF0Y2gpXG4gICAgcmV0dXJuIGlucHV0LmVycm9yKCdDaG9pY2Ugbm90IG1hdGNoZWQnKTtcblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy9cbi8vIEVuY29kaW5nXG4vL1xuXG5Ob2RlLnByb3RvdHlwZS5fY3JlYXRlRW5jb2RlckJ1ZmZlciA9IGZ1bmN0aW9uIGNyZWF0ZUVuY29kZXJCdWZmZXIoZGF0YSkge1xuICByZXR1cm4gbmV3IEVuY29kZXJCdWZmZXIoZGF0YSwgdGhpcy5yZXBvcnRlcik7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5fZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKGRhdGEsIHJlcG9ydGVyLCBwYXJlbnQpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuICBpZiAoc3RhdGVbJ2RlZmF1bHQnXSAhPT0gbnVsbCAmJiBzdGF0ZVsnZGVmYXVsdCddID09PSBkYXRhKVxuICAgIHJldHVybjtcblxuICB2YXIgcmVzdWx0ID0gdGhpcy5fZW5jb2RlVmFsdWUoZGF0YSwgcmVwb3J0ZXIsIHBhcmVudCk7XG4gIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZClcbiAgICByZXR1cm47XG5cbiAgaWYgKHRoaXMuX3NraXBEZWZhdWx0KHJlc3VsdCwgcmVwb3J0ZXIsIHBhcmVudCkpXG4gICAgcmV0dXJuO1xuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5fZW5jb2RlVmFsdWUgPSBmdW5jdGlvbiBlbmNvZGUoZGF0YSwgcmVwb3J0ZXIsIHBhcmVudCkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cbiAgLy8gRGVjb2RlIHJvb3Qgbm9kZVxuICBpZiAoc3RhdGUucGFyZW50ID09PSBudWxsKVxuICAgIHJldHVybiBzdGF0ZS5jaGlsZHJlblswXS5fZW5jb2RlKGRhdGEsIHJlcG9ydGVyIHx8IG5ldyBSZXBvcnRlcigpKTtcblxuICB2YXIgcmVzdWx0ID0gbnVsbDtcbiAgdmFyIHByZXNlbnQgPSB0cnVlO1xuXG4gIC8vIFNldCByZXBvcnRlciB0byBzaGFyZSBpdCB3aXRoIGEgY2hpbGQgY2xhc3NcbiAgdGhpcy5yZXBvcnRlciA9IHJlcG9ydGVyO1xuXG4gIC8vIENoZWNrIGlmIGRhdGEgaXMgdGhlcmVcbiAgaWYgKHN0YXRlLm9wdGlvbmFsICYmIGRhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChzdGF0ZVsnZGVmYXVsdCddICE9PSBudWxsKVxuICAgICAgZGF0YSA9IHN0YXRlWydkZWZhdWx0J11cbiAgICBlbHNlXG4gICAgICByZXR1cm47XG4gIH1cblxuICAvLyBGb3IgZXJyb3IgcmVwb3J0aW5nXG4gIHZhciBwcmV2S2V5O1xuXG4gIC8vIEVuY29kZSBjaGlsZHJlbiBmaXJzdFxuICB2YXIgY29udGVudCA9IG51bGw7XG4gIHZhciBwcmltaXRpdmUgPSBmYWxzZTtcbiAgaWYgKHN0YXRlLmFueSkge1xuICAgIC8vIEFueXRoaW5nIHRoYXQgd2FzIGdpdmVuIGlzIHRyYW5zbGF0ZWQgdG8gYnVmZmVyXG4gICAgcmVzdWx0ID0gdGhpcy5fY3JlYXRlRW5jb2RlckJ1ZmZlcihkYXRhKTtcbiAgfSBlbHNlIGlmIChzdGF0ZS5jaG9pY2UpIHtcbiAgICByZXN1bHQgPSB0aGlzLl9lbmNvZGVDaG9pY2UoZGF0YSwgcmVwb3J0ZXIpO1xuICB9IGVsc2UgaWYgKHN0YXRlLmNoaWxkcmVuKSB7XG4gICAgY29udGVudCA9IHN0YXRlLmNoaWxkcmVuLm1hcChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgaWYgKGNoaWxkLl9iYXNlU3RhdGUudGFnID09PSAnbnVsbF8nKVxuICAgICAgICByZXR1cm4gY2hpbGQuX2VuY29kZShudWxsLCByZXBvcnRlciwgZGF0YSk7XG5cbiAgICAgIGlmIChjaGlsZC5fYmFzZVN0YXRlLmtleSA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuIHJlcG9ydGVyLmVycm9yKCdDaGlsZCBzaG91bGQgaGF2ZSBhIGtleScpO1xuICAgICAgdmFyIHByZXZLZXkgPSByZXBvcnRlci5lbnRlcktleShjaGlsZC5fYmFzZVN0YXRlLmtleSk7XG5cbiAgICAgIGlmICh0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpXG4gICAgICAgIHJldHVybiByZXBvcnRlci5lcnJvcignQ2hpbGQgZXhwZWN0ZWQsIGJ1dCBpbnB1dCBpcyBub3Qgb2JqZWN0Jyk7XG5cbiAgICAgIHZhciByZXMgPSBjaGlsZC5fZW5jb2RlKGRhdGFbY2hpbGQuX2Jhc2VTdGF0ZS5rZXldLCByZXBvcnRlciwgZGF0YSk7XG4gICAgICByZXBvcnRlci5sZWF2ZUtleShwcmV2S2V5KTtcblxuICAgICAgcmV0dXJuIHJlcztcbiAgICB9LCB0aGlzKS5maWx0ZXIoZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZDtcbiAgICB9KTtcblxuICAgIGNvbnRlbnQgPSB0aGlzLl9jcmVhdGVFbmNvZGVyQnVmZmVyKGNvbnRlbnQpO1xuICB9IGVsc2Uge1xuICAgIGlmIChzdGF0ZS50YWcgPT09ICdzZXFvZicgfHwgc3RhdGUudGFnID09PSAnc2V0b2YnKSB7XG4gICAgICAvLyBUT0RPKGluZHV0bnkpOiB0aGlzIHNob3VsZCBiZSB0aHJvd24gb24gRFNMIGxldmVsXG4gICAgICBpZiAoIShzdGF0ZS5hcmdzICYmIHN0YXRlLmFyZ3MubGVuZ3RoID09PSAxKSlcbiAgICAgICAgcmV0dXJuIHJlcG9ydGVyLmVycm9yKCdUb28gbWFueSBhcmdzIGZvciA6ICcgKyBzdGF0ZS50YWcpO1xuXG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YSkpXG4gICAgICAgIHJldHVybiByZXBvcnRlci5lcnJvcignc2Vxb2Yvc2V0b2YsIGJ1dCBkYXRhIGlzIG5vdCBBcnJheScpO1xuXG4gICAgICB2YXIgY2hpbGQgPSB0aGlzLmNsb25lKCk7XG4gICAgICBjaGlsZC5fYmFzZVN0YXRlLmltcGxpY2l0ID0gbnVsbDtcbiAgICAgIGNvbnRlbnQgPSB0aGlzLl9jcmVhdGVFbmNvZGVyQnVmZmVyKGRhdGEubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgdmFyIHN0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9nZXRVc2Uoc3RhdGUuYXJnc1swXSwgZGF0YSkuX2VuY29kZShpdGVtLCByZXBvcnRlcik7XG4gICAgICB9LCBjaGlsZCkpO1xuICAgIH0gZWxzZSBpZiAoc3RhdGUudXNlICE9PSBudWxsKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLl9nZXRVc2Uoc3RhdGUudXNlLCBwYXJlbnQpLl9lbmNvZGUoZGF0YSwgcmVwb3J0ZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb250ZW50ID0gdGhpcy5fZW5jb2RlUHJpbWl0aXZlKHN0YXRlLnRhZywgZGF0YSk7XG4gICAgICBwcmltaXRpdmUgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8vIEVuY29kZSBkYXRhIGl0c2VsZlxuICB2YXIgcmVzdWx0O1xuICBpZiAoIXN0YXRlLmFueSAmJiBzdGF0ZS5jaG9pY2UgPT09IG51bGwpIHtcbiAgICB2YXIgdGFnID0gc3RhdGUuaW1wbGljaXQgIT09IG51bGwgPyBzdGF0ZS5pbXBsaWNpdCA6IHN0YXRlLnRhZztcbiAgICB2YXIgY2xzID0gc3RhdGUuaW1wbGljaXQgPT09IG51bGwgPyAndW5pdmVyc2FsJyA6ICdjb250ZXh0JztcblxuICAgIGlmICh0YWcgPT09IG51bGwpIHtcbiAgICAgIGlmIChzdGF0ZS51c2UgPT09IG51bGwpXG4gICAgICAgIHJlcG9ydGVyLmVycm9yKCdUYWcgY291bGQgYmUgb21taXRlZCBvbmx5IGZvciAudXNlKCknKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHN0YXRlLnVzZSA9PT0gbnVsbClcbiAgICAgICAgcmVzdWx0ID0gdGhpcy5fZW5jb2RlQ29tcG9zaXRlKHRhZywgcHJpbWl0aXZlLCBjbHMsIGNvbnRlbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFdyYXAgaW4gZXhwbGljaXRcbiAgaWYgKHN0YXRlLmV4cGxpY2l0ICE9PSBudWxsKVxuICAgIHJlc3VsdCA9IHRoaXMuX2VuY29kZUNvbXBvc2l0ZShzdGF0ZS5leHBsaWNpdCwgZmFsc2UsICdjb250ZXh0JywgcmVzdWx0KTtcblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuTm9kZS5wcm90b3R5cGUuX2VuY29kZUNob2ljZSA9IGZ1bmN0aW9uIGVuY29kZUNob2ljZShkYXRhLCByZXBvcnRlcikge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cbiAgdmFyIG5vZGUgPSBzdGF0ZS5jaG9pY2VbZGF0YS50eXBlXTtcbiAgLy8gaWYgKCFub2RlKSB7XG4gIC8vICAgYXNzZXJ0KFxuICAvLyAgICAgICBmYWxzZSxcbiAgLy8gICAgICAgZGF0YS50eXBlICsgJyBub3QgZm91bmQgaW4gJyArXG4gIC8vICAgICAgICAgICBKU09OLnN0cmluZ2lmeShPYmplY3Qua2V5cyhzdGF0ZS5jaG9pY2UpKSk7XG4gIC8vIH1cbiAgcmV0dXJuIG5vZGUuX2VuY29kZShkYXRhLnZhbHVlLCByZXBvcnRlcik7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5fZW5jb2RlUHJpbWl0aXZlID0gZnVuY3Rpb24gZW5jb2RlUHJpbWl0aXZlKHRhZywgZGF0YSkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cbiAgaWYgKHRhZyA9PT0gJ29jdHN0cicgfHwgdGFnID09PSAnYml0c3RyJyB8fCB0YWcgPT09ICdpYTVzdHInKVxuICAgIHJldHVybiB0aGlzLl9lbmNvZGVTdHIoZGF0YSwgdGFnKTtcbiAgZWxzZSBpZiAodGFnID09PSAndXRmOHN0cicpXG4gICAgcmV0dXJuIHRoaXMuX2VuY29kZVN0cihkYXRhLCB0YWcpO1xuICBlbHNlIGlmICh0YWcgPT09ICdvYmppZCcgJiYgc3RhdGUuYXJncylcbiAgICByZXR1cm4gdGhpcy5fZW5jb2RlT2JqaWQoZGF0YSwgc3RhdGUucmV2ZXJzZUFyZ3NbMF0sIHN0YXRlLmFyZ3NbMV0pO1xuICBlbHNlIGlmICh0YWcgPT09ICdvYmppZCcpXG4gICAgcmV0dXJuIHRoaXMuX2VuY29kZU9iamlkKGRhdGEsIG51bGwsIG51bGwpO1xuICBlbHNlIGlmICh0YWcgPT09ICdnZW50aW1lJyB8fCB0YWcgPT09ICd1dGN0aW1lJylcbiAgICByZXR1cm4gdGhpcy5fZW5jb2RlVGltZShkYXRhLCB0YWcpO1xuICBlbHNlIGlmICh0YWcgPT09ICdudWxsXycpXG4gICAgcmV0dXJuIHRoaXMuX2VuY29kZU51bGwoKTtcbiAgZWxzZSBpZiAodGFnID09PSAnaW50JyB8fCB0YWcgPT09ICdlbnVtJylcbiAgICByZXR1cm4gdGhpcy5fZW5jb2RlSW50KGRhdGEsIHN0YXRlLmFyZ3MgJiYgc3RhdGUucmV2ZXJzZUFyZ3NbMF0pO1xuICBlbHNlIGlmICh0YWcgPT09ICdib29sJylcbiAgICByZXR1cm4gdGhpcy5fZW5jb2RlQm9vbChkYXRhKTtcbiAgZWxzZVxuICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgdGFnOiAnICsgdGFnKTtcbn07XG4iLCJ2YXIgaW5oZXJpdHMgPSByZXF1aXJlKCd1dGlsJykuaW5oZXJpdHM7XG5cbmZ1bmN0aW9uIFJlcG9ydGVyKG9wdGlvbnMpIHtcbiAgdGhpcy5fcmVwb3J0ZXJTdGF0ZSA9IHtcbiAgICBvYmo6IG51bGwsXG4gICAgcGF0aDogW10sXG4gICAgb3B0aW9uczogb3B0aW9ucyB8fCB7fSxcbiAgICBlcnJvcnM6IFtdXG4gIH07XG59XG5leHBvcnRzLlJlcG9ydGVyID0gUmVwb3J0ZXI7XG5cblJlcG9ydGVyLnByb3RvdHlwZS5pc0Vycm9yID0gZnVuY3Rpb24gaXNFcnJvcihvYmopIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIFJlcG9ydGVyRXJyb3I7XG59O1xuXG5SZXBvcnRlci5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIHNhdmUoKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlcG9ydGVyU3RhdGU7XG5cbiAgcmV0dXJuIHsgb2JqOiBzdGF0ZS5vYmosIHBhdGhMZW46IHN0YXRlLnBhdGgubGVuZ3RoIH07XG59O1xuXG5SZXBvcnRlci5wcm90b3R5cGUucmVzdG9yZSA9IGZ1bmN0aW9uIHJlc3RvcmUoZGF0YSkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZXBvcnRlclN0YXRlO1xuXG4gIHN0YXRlLm9iaiA9IGRhdGEub2JqO1xuICBzdGF0ZS5wYXRoID0gc3RhdGUucGF0aC5zbGljZSgwLCBkYXRhLnBhdGhMZW4pO1xufTtcblxuUmVwb3J0ZXIucHJvdG90eXBlLmVudGVyS2V5ID0gZnVuY3Rpb24gZW50ZXJLZXkoa2V5KSB7XG4gIHJldHVybiB0aGlzLl9yZXBvcnRlclN0YXRlLnBhdGgucHVzaChrZXkpO1xufTtcblxuUmVwb3J0ZXIucHJvdG90eXBlLmxlYXZlS2V5ID0gZnVuY3Rpb24gbGVhdmVLZXkoaW5kZXgsIGtleSwgdmFsdWUpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVwb3J0ZXJTdGF0ZTtcblxuICBzdGF0ZS5wYXRoID0gc3RhdGUucGF0aC5zbGljZSgwLCBpbmRleCAtIDEpO1xuICBpZiAoc3RhdGUub2JqICE9PSBudWxsKVxuICAgIHN0YXRlLm9ialtrZXldID0gdmFsdWU7XG59O1xuXG5SZXBvcnRlci5wcm90b3R5cGUuZW50ZXJPYmplY3QgPSBmdW5jdGlvbiBlbnRlck9iamVjdCgpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVwb3J0ZXJTdGF0ZTtcblxuICB2YXIgcHJldiA9IHN0YXRlLm9iajtcbiAgc3RhdGUub2JqID0ge307XG4gIHJldHVybiBwcmV2O1xufTtcblxuUmVwb3J0ZXIucHJvdG90eXBlLmxlYXZlT2JqZWN0ID0gZnVuY3Rpb24gbGVhdmVPYmplY3QocHJldikge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZXBvcnRlclN0YXRlO1xuXG4gIHZhciBub3cgPSBzdGF0ZS5vYmo7XG4gIHN0YXRlLm9iaiA9IHByZXY7XG4gIHJldHVybiBub3c7XG59O1xuXG5SZXBvcnRlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiBlcnJvcihtc2cpIHtcbiAgdmFyIGVycjtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVwb3J0ZXJTdGF0ZTtcblxuICB2YXIgaW5oZXJpdGVkID0gbXNnIGluc3RhbmNlb2YgUmVwb3J0ZXJFcnJvcjtcbiAgaWYgKGluaGVyaXRlZCkge1xuICAgIGVyciA9IG1zZztcbiAgfSBlbHNlIHtcbiAgICBlcnIgPSBuZXcgUmVwb3J0ZXJFcnJvcihzdGF0ZS5wYXRoLm1hcChmdW5jdGlvbihlbGVtKSB7XG4gICAgICByZXR1cm4gJ1snICsgSlNPTi5zdHJpbmdpZnkoZWxlbSkgKyAnXSc7XG4gICAgfSkuam9pbignJyksIG1zZy5tZXNzYWdlIHx8IG1zZywgbXNnLnN0YWNrKTtcbiAgfVxuXG4gIGlmICghc3RhdGUub3B0aW9ucy5wYXJ0aWFsKVxuICAgIHRocm93IGVycjtcblxuICBpZiAoIWluaGVyaXRlZClcbiAgICBzdGF0ZS5lcnJvcnMucHVzaChlcnIpO1xuXG4gIHJldHVybiBlcnI7XG59O1xuXG5SZXBvcnRlci5wcm90b3R5cGUud3JhcFJlc3VsdCA9IGZ1bmN0aW9uIHdyYXBSZXN1bHQocmVzdWx0KSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlcG9ydGVyU3RhdGU7XG4gIGlmICghc3RhdGUub3B0aW9ucy5wYXJ0aWFsKVxuICAgIHJldHVybiByZXN1bHQ7XG5cbiAgcmV0dXJuIHtcbiAgICByZXN1bHQ6IHRoaXMuaXNFcnJvcihyZXN1bHQpID8gbnVsbCA6IHJlc3VsdCxcbiAgICBlcnJvcnM6IHN0YXRlLmVycm9yc1xuICB9O1xufTtcblxuZnVuY3Rpb24gUmVwb3J0ZXJFcnJvcihwYXRoLCBtc2cpIHtcbiAgdGhpcy5wYXRoID0gcGF0aDtcbiAgdGhpcy5yZXRocm93KG1zZyk7XG59O1xuaW5oZXJpdHMoUmVwb3J0ZXJFcnJvciwgRXJyb3IpO1xuXG5SZXBvcnRlckVycm9yLnByb3RvdHlwZS5yZXRocm93ID0gZnVuY3Rpb24gcmV0aHJvdyhtc2cpIHtcbiAgdGhpcy5tZXNzYWdlID0gbXNnICsgJyBhdDogJyArICh0aGlzLnBhdGggfHwgJyhzaGFsbG93KScpO1xuICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBSZXBvcnRlckVycm9yKTtcblxuICByZXR1cm4gdGhpcztcbn07XG4iLCIoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuXG4ndXNlIHN0cmljdCc7XG5cbi8vIFV0aWxzXG5cbmZ1bmN0aW9uIGFzc2VydCh2YWwsIG1zZykge1xuICBpZiAoIXZhbClcbiAgICB0aHJvdyBuZXcgRXJyb3IobXNnIHx8ICdBc3NlcnRpb24gZmFpbGVkJyk7XG59XG5cbi8vIENvdWxkIHVzZSBgaW5oZXJpdHNgIG1vZHVsZSwgYnV0IGRvbid0IHdhbnQgdG8gbW92ZSBmcm9tIHNpbmdsZSBmaWxlXG4vLyBhcmNoaXRlY3R1cmUgeWV0LlxuZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yO1xuICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fTtcbiAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZTtcbiAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKTtcbiAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yO1xufVxuXG4vLyBCTlxuXG5mdW5jdGlvbiBCTihudW1iZXIsIGJhc2UsIGVuZGlhbikge1xuICAvLyBNYXkgYmUgYG5ldyBCTihibilgID9cbiAgaWYgKG51bWJlciAhPT0gbnVsbCAmJlxuICAgICAgdHlwZW9mIG51bWJlciA9PT0gJ29iamVjdCcgJiZcbiAgICAgIEFycmF5LmlzQXJyYXkobnVtYmVyLndvcmRzKSkge1xuICAgIHJldHVybiBudW1iZXI7XG4gIH1cblxuICB0aGlzLnNpZ24gPSBmYWxzZTtcbiAgdGhpcy53b3JkcyA9IG51bGw7XG4gIHRoaXMubGVuZ3RoID0gMDtcblxuICAvLyBSZWR1Y3Rpb24gY29udGV4dFxuICB0aGlzLnJlZCA9IG51bGw7XG5cbiAgaWYgKGJhc2UgPT09ICdsZScgfHwgYmFzZSA9PT0gJ2JlJykge1xuICAgIGVuZGlhbiA9IGJhc2U7XG4gICAgYmFzZSA9IDEwO1xuICB9XG5cbiAgaWYgKG51bWJlciAhPT0gbnVsbClcbiAgICB0aGlzLl9pbml0KG51bWJlciB8fCAwLCBiYXNlIHx8IDEwLCBlbmRpYW4gfHwgJ2JlJyk7XG59XG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG4gIG1vZHVsZS5leHBvcnRzID0gQk47XG5lbHNlXG4gIGV4cG9ydHMuQk4gPSBCTjtcblxuQk4uQk4gPSBCTjtcbkJOLndvcmRTaXplID0gMjY7XG5cbkJOLnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uIGluaXQobnVtYmVyLCBiYXNlLCBlbmRpYW4pIHtcbiAgaWYgKHR5cGVvZiBudW1iZXIgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIHRoaXMuX2luaXROdW1iZXIobnVtYmVyLCBiYXNlLCBlbmRpYW4pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBudW1iZXIgPT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIHRoaXMuX2luaXRBcnJheShudW1iZXIsIGJhc2UsIGVuZGlhbik7XG4gIH1cbiAgaWYgKGJhc2UgPT09ICdoZXgnKVxuICAgIGJhc2UgPSAxNjtcbiAgYXNzZXJ0KGJhc2UgPT09IChiYXNlIHwgMCkgJiYgYmFzZSA+PSAyICYmIGJhc2UgPD0gMzYpO1xuXG4gIG51bWJlciA9IG51bWJlci50b1N0cmluZygpLnJlcGxhY2UoL1xccysvZywgJycpO1xuICB2YXIgc3RhcnQgPSAwO1xuICBpZiAobnVtYmVyWzBdID09PSAnLScpXG4gICAgc3RhcnQrKztcblxuICBpZiAoYmFzZSA9PT0gMTYpXG4gICAgdGhpcy5fcGFyc2VIZXgobnVtYmVyLCBzdGFydCk7XG4gIGVsc2VcbiAgICB0aGlzLl9wYXJzZUJhc2UobnVtYmVyLCBiYXNlLCBzdGFydCk7XG5cbiAgaWYgKG51bWJlclswXSA9PT0gJy0nKVxuICAgIHRoaXMuc2lnbiA9IHRydWU7XG5cbiAgdGhpcy5zdHJpcCgpO1xuXG4gIGlmIChlbmRpYW4gIT09ICdsZScpXG4gICAgcmV0dXJuO1xuXG4gIHRoaXMuX2luaXRBcnJheSh0aGlzLnRvQXJyYXkoKSwgYmFzZSwgZW5kaWFuKTtcbn07XG5cbkJOLnByb3RvdHlwZS5faW5pdE51bWJlciA9IGZ1bmN0aW9uIF9pbml0TnVtYmVyKG51bWJlciwgYmFzZSwgZW5kaWFuKSB7XG4gIGlmIChudW1iZXIgPCAwKSB7XG4gICAgdGhpcy5zaWduID0gdHJ1ZTtcbiAgICBudW1iZXIgPSAtbnVtYmVyO1xuICB9XG4gIGlmIChudW1iZXIgPCAweDQwMDAwMDApIHtcbiAgICB0aGlzLndvcmRzID0gWyBudW1iZXIgJiAweDNmZmZmZmYgXTtcbiAgICB0aGlzLmxlbmd0aCA9IDE7XG4gIH0gZWxzZSBpZiAobnVtYmVyIDwgMHgxMDAwMDAwMDAwMDAwMCkge1xuICAgIHRoaXMud29yZHMgPSBbXG4gICAgICBudW1iZXIgJiAweDNmZmZmZmYsXG4gICAgICAobnVtYmVyIC8gMHg0MDAwMDAwKSAmIDB4M2ZmZmZmZlxuICAgIF07XG4gICAgdGhpcy5sZW5ndGggPSAyO1xuICB9IGVsc2Uge1xuICAgIGFzc2VydChudW1iZXIgPCAweDIwMDAwMDAwMDAwMDAwKTsgLy8gMiBeIDUzICh1bnNhZmUpXG4gICAgdGhpcy53b3JkcyA9IFtcbiAgICAgIG51bWJlciAmIDB4M2ZmZmZmZixcbiAgICAgIChudW1iZXIgLyAweDQwMDAwMDApICYgMHgzZmZmZmZmLFxuICAgICAgMVxuICAgIF07XG4gICAgdGhpcy5sZW5ndGggPSAzO1xuICB9XG5cbiAgaWYgKGVuZGlhbiAhPT0gJ2xlJylcbiAgICByZXR1cm47XG5cbiAgLy8gUmV2ZXJzZSB0aGUgYnl0ZXNcbiAgdGhpcy5faW5pdEFycmF5KHRoaXMudG9BcnJheSgpLCBiYXNlLCBlbmRpYW4pO1xufTtcblxuQk4ucHJvdG90eXBlLl9pbml0QXJyYXkgPSBmdW5jdGlvbiBfaW5pdEFycmF5KG51bWJlciwgYmFzZSwgZW5kaWFuKSB7XG4gIC8vIFBlcmhhcHMgYSBVaW50OEFycmF5XG4gIGFzc2VydCh0eXBlb2YgbnVtYmVyLmxlbmd0aCA9PT0gJ251bWJlcicpO1xuICBpZiAobnVtYmVyLmxlbmd0aCA8PSAwKSB7XG4gICAgdGhpcy53b3JkcyA9IFsgMCBdO1xuICAgIHRoaXMubGVuZ3RoID0gMTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHRoaXMubGVuZ3RoID0gTWF0aC5jZWlsKG51bWJlci5sZW5ndGggLyAzKTtcbiAgdGhpcy53b3JkcyA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKylcbiAgICB0aGlzLndvcmRzW2ldID0gMDtcblxuICB2YXIgb2ZmID0gMDtcbiAgaWYgKGVuZGlhbiA9PT0gJ2JlJykge1xuICAgIGZvciAodmFyIGkgPSBudW1iZXIubGVuZ3RoIC0gMSwgaiA9IDA7IGkgPj0gMDsgaSAtPSAzKSB7XG4gICAgICB2YXIgdyA9IG51bWJlcltpXSB8IChudW1iZXJbaSAtIDFdIDw8IDgpIHwgKG51bWJlcltpIC0gMl0gPDwgMTYpO1xuICAgICAgdGhpcy53b3Jkc1tqXSB8PSAodyA8PCBvZmYpICYgMHgzZmZmZmZmO1xuICAgICAgdGhpcy53b3Jkc1tqICsgMV0gPSAodyA+Pj4gKDI2IC0gb2ZmKSkgJiAweDNmZmZmZmY7XG4gICAgICBvZmYgKz0gMjQ7XG4gICAgICBpZiAob2ZmID49IDI2KSB7XG4gICAgICAgIG9mZiAtPSAyNjtcbiAgICAgICAgaisrO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmIChlbmRpYW4gPT09ICdsZScpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgaiA9IDA7IGkgPCBudW1iZXIubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgIHZhciB3ID0gbnVtYmVyW2ldIHwgKG51bWJlcltpICsgMV0gPDwgOCkgfCAobnVtYmVyW2kgKyAyXSA8PCAxNik7XG4gICAgICB0aGlzLndvcmRzW2pdIHw9ICh3IDw8IG9mZikgJiAweDNmZmZmZmY7XG4gICAgICB0aGlzLndvcmRzW2ogKyAxXSA9ICh3ID4+PiAoMjYgLSBvZmYpKSAmIDB4M2ZmZmZmZjtcbiAgICAgIG9mZiArPSAyNDtcbiAgICAgIGlmIChvZmYgPj0gMjYpIHtcbiAgICAgICAgb2ZmIC09IDI2O1xuICAgICAgICBqKys7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzLnN0cmlwKCk7XG59O1xuXG5mdW5jdGlvbiBwYXJzZUhleChzdHIsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHIgPSAwO1xuICB2YXIgbGVuID0gTWF0aC5taW4oc3RyLmxlbmd0aCwgZW5kKTtcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgbGVuOyBpKyspIHtcbiAgICB2YXIgYyA9IHN0ci5jaGFyQ29kZUF0KGkpIC0gNDg7XG5cbiAgICByIDw8PSA0O1xuXG4gICAgLy8gJ2EnIC0gJ2YnXG4gICAgaWYgKGMgPj0gNDkgJiYgYyA8PSA1NClcbiAgICAgIHIgfD0gYyAtIDQ5ICsgMHhhO1xuXG4gICAgLy8gJ0EnIC0gJ0YnXG4gICAgZWxzZSBpZiAoYyA+PSAxNyAmJiBjIDw9IDIyKVxuICAgICAgciB8PSBjIC0gMTcgKyAweGE7XG5cbiAgICAvLyAnMCcgLSAnOSdcbiAgICBlbHNlXG4gICAgICByIHw9IGMgJiAweGY7XG4gIH1cbiAgcmV0dXJuIHI7XG59XG5cbkJOLnByb3RvdHlwZS5fcGFyc2VIZXggPSBmdW5jdGlvbiBfcGFyc2VIZXgobnVtYmVyLCBzdGFydCkge1xuICAvLyBDcmVhdGUgcG9zc2libHkgYmlnZ2VyIGFycmF5IHRvIGVuc3VyZSB0aGF0IGl0IGZpdHMgdGhlIG51bWJlclxuICB0aGlzLmxlbmd0aCA9IE1hdGguY2VpbCgobnVtYmVyLmxlbmd0aCAtIHN0YXJ0KSAvIDYpO1xuICB0aGlzLndvcmRzID0gbmV3IEFycmF5KHRoaXMubGVuZ3RoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKVxuICAgIHRoaXMud29yZHNbaV0gPSAwO1xuXG4gIC8vIFNjYW4gMjQtYml0IGNodW5rcyBhbmQgYWRkIHRoZW0gdG8gdGhlIG51bWJlclxuICB2YXIgb2ZmID0gMDtcbiAgZm9yICh2YXIgaSA9IG51bWJlci5sZW5ndGggLSA2LCBqID0gMDsgaSA+PSBzdGFydDsgaSAtPSA2KSB7XG4gICAgdmFyIHcgPSBwYXJzZUhleChudW1iZXIsIGksIGkgKyA2KTtcbiAgICB0aGlzLndvcmRzW2pdIHw9ICh3IDw8IG9mZikgJiAweDNmZmZmZmY7XG4gICAgdGhpcy53b3Jkc1tqICsgMV0gfD0gdyA+Pj4gKDI2IC0gb2ZmKSAmIDB4M2ZmZmZmO1xuICAgIG9mZiArPSAyNDtcbiAgICBpZiAob2ZmID49IDI2KSB7XG4gICAgICBvZmYgLT0gMjY7XG4gICAgICBqKys7XG4gICAgfVxuICB9XG4gIGlmIChpICsgNiAhPT0gc3RhcnQpIHtcbiAgICB2YXIgdyA9IHBhcnNlSGV4KG51bWJlciwgc3RhcnQsIGkgKyA2KTtcbiAgICB0aGlzLndvcmRzW2pdIHw9ICh3IDw8IG9mZikgJiAweDNmZmZmZmY7XG4gICAgdGhpcy53b3Jkc1tqICsgMV0gfD0gdyA+Pj4gKDI2IC0gb2ZmKSAmIDB4M2ZmZmZmO1xuICB9XG4gIHRoaXMuc3RyaXAoKTtcbn07XG5cbmZ1bmN0aW9uIHBhcnNlQmFzZShzdHIsIHN0YXJ0LCBlbmQsIG11bCkge1xuICB2YXIgciA9IDA7XG4gIHZhciBsZW4gPSBNYXRoLm1pbihzdHIubGVuZ3RoLCBlbmQpO1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBsZW47IGkrKykge1xuICAgIHZhciBjID0gc3RyLmNoYXJDb2RlQXQoaSkgLSA0ODtcblxuICAgIHIgKj0gbXVsO1xuXG4gICAgLy8gJ2EnXG4gICAgaWYgKGMgPj0gNDkpXG4gICAgICByICs9IGMgLSA0OSArIDB4YTtcblxuICAgIC8vICdBJ1xuICAgIGVsc2UgaWYgKGMgPj0gMTcpXG4gICAgICByICs9IGMgLSAxNyArIDB4YTtcblxuICAgIC8vICcwJyAtICc5J1xuICAgIGVsc2VcbiAgICAgIHIgKz0gYztcbiAgfVxuICByZXR1cm4gcjtcbn1cblxuQk4ucHJvdG90eXBlLl9wYXJzZUJhc2UgPSBmdW5jdGlvbiBfcGFyc2VCYXNlKG51bWJlciwgYmFzZSwgc3RhcnQpIHtcbiAgLy8gSW5pdGlhbGl6ZSBhcyB6ZXJvXG4gIHRoaXMud29yZHMgPSBbIDAgXTtcbiAgdGhpcy5sZW5ndGggPSAxO1xuXG4gIC8vIEZpbmQgbGVuZ3RoIG9mIGxpbWIgaW4gYmFzZVxuICBmb3IgKHZhciBsaW1iTGVuID0gMCwgbGltYlBvdyA9IDE7IGxpbWJQb3cgPD0gMHgzZmZmZmZmOyBsaW1iUG93ICo9IGJhc2UpXG4gICAgbGltYkxlbisrO1xuICBsaW1iTGVuLS07XG4gIGxpbWJQb3cgPSAobGltYlBvdyAvIGJhc2UpIHwgMDtcblxuICB2YXIgdG90YWwgPSBudW1iZXIubGVuZ3RoIC0gc3RhcnQ7XG4gIHZhciBtb2QgPSB0b3RhbCAlIGxpbWJMZW47XG4gIHZhciBlbmQgPSBNYXRoLm1pbih0b3RhbCwgdG90YWwgLSBtb2QpICsgc3RhcnQ7XG5cbiAgdmFyIHdvcmQgPSAwO1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkgKz0gbGltYkxlbikge1xuICAgIHdvcmQgPSBwYXJzZUJhc2UobnVtYmVyLCBpLCBpICsgbGltYkxlbiwgYmFzZSk7XG5cbiAgICB0aGlzLmltdWxuKGxpbWJQb3cpO1xuICAgIGlmICh0aGlzLndvcmRzWzBdICsgd29yZCA8IDB4NDAwMDAwMClcbiAgICAgIHRoaXMud29yZHNbMF0gKz0gd29yZDtcbiAgICBlbHNlXG4gICAgICB0aGlzLl9pYWRkbih3b3JkKTtcbiAgfVxuXG4gIGlmIChtb2QgIT09IDApIHtcbiAgICB2YXIgcG93ID0gMTtcbiAgICB2YXIgd29yZCA9IHBhcnNlQmFzZShudW1iZXIsIGksIG51bWJlci5sZW5ndGgsIGJhc2UpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtb2Q7IGkrKylcbiAgICAgIHBvdyAqPSBiYXNlO1xuICAgIHRoaXMuaW11bG4ocG93KTtcbiAgICBpZiAodGhpcy53b3Jkc1swXSArIHdvcmQgPCAweDQwMDAwMDApXG4gICAgICB0aGlzLndvcmRzWzBdICs9IHdvcmQ7XG4gICAgZWxzZVxuICAgICAgdGhpcy5faWFkZG4od29yZCk7XG4gIH1cbn07XG5cbkJOLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weShkZXN0KSB7XG4gIGRlc3Qud29yZHMgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspXG4gICAgZGVzdC53b3Jkc1tpXSA9IHRoaXMud29yZHNbaV07XG4gIGRlc3QubGVuZ3RoID0gdGhpcy5sZW5ndGg7XG4gIGRlc3Quc2lnbiA9IHRoaXMuc2lnbjtcbiAgZGVzdC5yZWQgPSB0aGlzLnJlZDtcbn07XG5cbkJOLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lKCkge1xuICB2YXIgciA9IG5ldyBCTihudWxsKTtcbiAgdGhpcy5jb3B5KHIpO1xuICByZXR1cm4gcjtcbn07XG5cbi8vIFJlbW92ZSBsZWFkaW5nIGAwYCBmcm9tIGB0aGlzYFxuQk4ucHJvdG90eXBlLnN0cmlwID0gZnVuY3Rpb24gc3RyaXAoKSB7XG4gIHdoaWxlICh0aGlzLmxlbmd0aCA+IDEgJiYgdGhpcy53b3Jkc1t0aGlzLmxlbmd0aCAtIDFdID09PSAwKVxuICAgIHRoaXMubGVuZ3RoLS07XG4gIHJldHVybiB0aGlzLl9ub3JtU2lnbigpO1xufTtcblxuQk4ucHJvdG90eXBlLl9ub3JtU2lnbiA9IGZ1bmN0aW9uIF9ub3JtU2lnbigpIHtcbiAgLy8gLTAgPSAwXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMSAmJiB0aGlzLndvcmRzWzBdID09PSAwKVxuICAgIHRoaXMuc2lnbiA9IGZhbHNlO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkJOLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCgpIHtcbiAgcmV0dXJuICh0aGlzLnJlZCA/ICc8Qk4tUjogJyA6ICc8Qk46ICcpICsgdGhpcy50b1N0cmluZygxNikgKyAnPic7XG59O1xuXG4vKlxuXG52YXIgemVyb3MgPSBbXTtcbnZhciBncm91cFNpemVzID0gW107XG52YXIgZ3JvdXBCYXNlcyA9IFtdO1xuXG52YXIgcyA9ICcnO1xudmFyIGkgPSAtMTtcbndoaWxlICgrK2kgPCBCTi53b3JkU2l6ZSkge1xuICB6ZXJvc1tpXSA9IHM7XG4gIHMgKz0gJzAnO1xufVxuZ3JvdXBTaXplc1swXSA9IDA7XG5ncm91cFNpemVzWzFdID0gMDtcbmdyb3VwQmFzZXNbMF0gPSAwO1xuZ3JvdXBCYXNlc1sxXSA9IDA7XG52YXIgYmFzZSA9IDIgLSAxO1xud2hpbGUgKCsrYmFzZSA8IDM2ICsgMSkge1xuICB2YXIgZ3JvdXBTaXplID0gMDtcbiAgdmFyIGdyb3VwQmFzZSA9IDE7XG4gIHdoaWxlIChncm91cEJhc2UgPCAoMSA8PCBCTi53b3JkU2l6ZSkgLyBiYXNlKSB7XG4gICAgZ3JvdXBCYXNlICo9IGJhc2U7XG4gICAgZ3JvdXBTaXplICs9IDE7XG4gIH1cbiAgZ3JvdXBTaXplc1tiYXNlXSA9IGdyb3VwU2l6ZTtcbiAgZ3JvdXBCYXNlc1tiYXNlXSA9IGdyb3VwQmFzZTtcbn1cblxuKi9cblxudmFyIHplcm9zID0gW1xuICAnJyxcbiAgJzAnLFxuICAnMDAnLFxuICAnMDAwJyxcbiAgJzAwMDAnLFxuICAnMDAwMDAnLFxuICAnMDAwMDAwJyxcbiAgJzAwMDAwMDAnLFxuICAnMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwJyxcbiAgJzAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwJyxcbiAgJzAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwJyxcbiAgJzAwMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwMDAwJyxcbiAgJzAwMDAwMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwMDAwMDAwJyxcbiAgJzAwMDAwMDAwMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAnLFxuICAnMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwJyxcbiAgJzAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAnXG5dO1xuXG52YXIgZ3JvdXBTaXplcyA9IFtcbiAgMCwgMCxcbiAgMjUsIDE2LCAxMiwgMTEsIDEwLCA5LCA4LFxuICA4LCA3LCA3LCA3LCA3LCA2LCA2LFxuICA2LCA2LCA2LCA2LCA2LCA1LCA1LFxuICA1LCA1LCA1LCA1LCA1LCA1LCA1LFxuICA1LCA1LCA1LCA1LCA1LCA1LCA1XG5dO1xuXG52YXIgZ3JvdXBCYXNlcyA9IFtcbiAgMCwgMCxcbiAgMzM1NTQ0MzIsIDQzMDQ2NzIxLCAxNjc3NzIxNiwgNDg4MjgxMjUsIDYwNDY2MTc2LCA0MDM1MzYwNywgMTY3NzcyMTYsXG4gIDQzMDQ2NzIxLCAxMDAwMDAwMCwgMTk0ODcxNzEsIDM1ODMxODA4LCA2Mjc0ODUxNywgNzUyOTUzNiwgMTEzOTA2MjUsXG4gIDE2Nzc3MjE2LCAyNDEzNzU2OSwgMzQwMTIyMjQsIDQ3MDQ1ODgxLCA2NDAwMDAwMCwgNDA4NDEwMSwgNTE1MzYzMixcbiAgNjQzNjM0MywgNzk2MjYyNCwgOTc2NTYyNSwgMTE4ODEzNzYsIDE0MzQ4OTA3LCAxNzIxMDM2OCwgMjA1MTExNDksXG4gIDI0MzAwMDAwLCAyODYyOTE1MSwgMzM1NTQ0MzIsIDM5MTM1MzkzLCA0NTQzNTQyNCwgNTI1MjE4NzUsIDYwNDY2MTc2XG5dO1xuXG5CTi5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyhiYXNlLCBwYWRkaW5nKSB7XG4gIGJhc2UgPSBiYXNlIHx8IDEwO1xuICBpZiAoYmFzZSA9PT0gMTYgfHwgYmFzZSA9PT0gJ2hleCcpIHtcbiAgICB2YXIgb3V0ID0gJyc7XG4gICAgdmFyIG9mZiA9IDA7XG4gICAgdmFyIHBhZGRpbmcgPSBwYWRkaW5nIHwgMCB8fCAxO1xuICAgIHZhciBjYXJyeSA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdyA9IHRoaXMud29yZHNbaV07XG4gICAgICB2YXIgd29yZCA9ICgoKHcgPDwgb2ZmKSB8IGNhcnJ5KSAmIDB4ZmZmZmZmKS50b1N0cmluZygxNik7XG4gICAgICBjYXJyeSA9ICh3ID4+PiAoMjQgLSBvZmYpKSAmIDB4ZmZmZmZmO1xuICAgICAgaWYgKGNhcnJ5ICE9PSAwIHx8IGkgIT09IHRoaXMubGVuZ3RoIC0gMSlcbiAgICAgICAgb3V0ID0gemVyb3NbNiAtIHdvcmQubGVuZ3RoXSArIHdvcmQgKyBvdXQ7XG4gICAgICBlbHNlXG4gICAgICAgIG91dCA9IHdvcmQgKyBvdXQ7XG4gICAgICBvZmYgKz0gMjtcbiAgICAgIGlmIChvZmYgPj0gMjYpIHtcbiAgICAgICAgb2ZmIC09IDI2O1xuICAgICAgICBpLS07XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjYXJyeSAhPT0gMClcbiAgICAgIG91dCA9IGNhcnJ5LnRvU3RyaW5nKDE2KSArIG91dDtcbiAgICB3aGlsZSAob3V0Lmxlbmd0aCAlIHBhZGRpbmcgIT09IDApXG4gICAgICBvdXQgPSAnMCcgKyBvdXQ7XG4gICAgaWYgKHRoaXMuc2lnbilcbiAgICAgIG91dCA9ICctJyArIG91dDtcbiAgICByZXR1cm4gb3V0O1xuICB9IGVsc2UgaWYgKGJhc2UgPT09IChiYXNlIHwgMCkgJiYgYmFzZSA+PSAyICYmIGJhc2UgPD0gMzYpIHtcbiAgICAvLyB2YXIgZ3JvdXBTaXplID0gTWF0aC5mbG9vcihCTi53b3JkU2l6ZSAqIE1hdGguTE4yIC8gTWF0aC5sb2coYmFzZSkpO1xuICAgIHZhciBncm91cFNpemUgPSBncm91cFNpemVzW2Jhc2VdO1xuICAgIC8vIHZhciBncm91cEJhc2UgPSBNYXRoLnBvdyhiYXNlLCBncm91cFNpemUpO1xuICAgIHZhciBncm91cEJhc2UgPSBncm91cEJhc2VzW2Jhc2VdO1xuICAgIHZhciBvdXQgPSAnJztcbiAgICB2YXIgYyA9IHRoaXMuY2xvbmUoKTtcbiAgICBjLnNpZ24gPSBmYWxzZTtcbiAgICB3aGlsZSAoYy5jbXBuKDApICE9PSAwKSB7XG4gICAgICB2YXIgciA9IGMubW9kbihncm91cEJhc2UpLnRvU3RyaW5nKGJhc2UpO1xuICAgICAgYyA9IGMuaWRpdm4oZ3JvdXBCYXNlKTtcblxuICAgICAgaWYgKGMuY21wbigwKSAhPT0gMClcbiAgICAgICAgb3V0ID0gemVyb3NbZ3JvdXBTaXplIC0gci5sZW5ndGhdICsgciArIG91dDtcbiAgICAgIGVsc2VcbiAgICAgICAgb3V0ID0gciArIG91dDtcbiAgICB9XG4gICAgaWYgKHRoaXMuY21wbigwKSA9PT0gMClcbiAgICAgIG91dCA9ICcwJyArIG91dDtcbiAgICBpZiAodGhpcy5zaWduKVxuICAgICAgb3V0ID0gJy0nICsgb3V0O1xuICAgIHJldHVybiBvdXQ7XG4gIH0gZWxzZSB7XG4gICAgYXNzZXJ0KGZhbHNlLCAnQmFzZSBzaG91bGQgYmUgYmV0d2VlbiAyIGFuZCAzNicpO1xuICB9XG59O1xuXG5CTi5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICByZXR1cm4gdGhpcy50b1N0cmluZygxNik7XG59O1xuXG5CTi5wcm90b3R5cGUudG9BcnJheSA9IGZ1bmN0aW9uIHRvQXJyYXkoZW5kaWFuKSB7XG4gIHRoaXMuc3RyaXAoKTtcbiAgdmFyIHJlcyA9IG5ldyBBcnJheSh0aGlzLmJ5dGVMZW5ndGgoKSk7XG4gIHJlc1swXSA9IDA7XG5cbiAgdmFyIHEgPSB0aGlzLmNsb25lKCk7XG4gIGlmIChlbmRpYW4gIT09ICdsZScpIHtcbiAgICAvLyBBc3N1bWUgYmlnLWVuZGlhblxuICAgIGZvciAodmFyIGkgPSAwOyBxLmNtcG4oMCkgIT09IDA7IGkrKykge1xuICAgICAgdmFyIGIgPSBxLmFuZGxuKDB4ZmYpO1xuICAgICAgcS5pc2hybig4KTtcblxuICAgICAgcmVzW3Jlcy5sZW5ndGggLSBpIC0gMV0gPSBiO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBBc3N1bWUgbGl0dGxlLWVuZGlhblxuICAgIGZvciAodmFyIGkgPSAwOyBxLmNtcG4oMCkgIT09IDA7IGkrKykge1xuICAgICAgdmFyIGIgPSBxLmFuZGxuKDB4ZmYpO1xuICAgICAgcS5pc2hybig4KTtcblxuICAgICAgcmVzW2ldID0gYjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzO1xufTtcblxuaWYgKE1hdGguY2x6MzIpIHtcbiAgQk4ucHJvdG90eXBlLl9jb3VudEJpdHMgPSBmdW5jdGlvbiBfY291bnRCaXRzKHcpIHtcbiAgICByZXR1cm4gMzIgLSBNYXRoLmNsejMyKHcpO1xuICB9O1xufSBlbHNlIHtcbiAgQk4ucHJvdG90eXBlLl9jb3VudEJpdHMgPSBmdW5jdGlvbiBfY291bnRCaXRzKHcpIHtcbiAgICB2YXIgdCA9IHc7XG4gICAgdmFyIHIgPSAwO1xuICAgIGlmICh0ID49IDB4MTAwMCkge1xuICAgICAgciArPSAxMztcbiAgICAgIHQgPj4+PSAxMztcbiAgICB9XG4gICAgaWYgKHQgPj0gMHg0MCkge1xuICAgICAgciArPSA3O1xuICAgICAgdCA+Pj49IDc7XG4gICAgfVxuICAgIGlmICh0ID49IDB4OCkge1xuICAgICAgciArPSA0O1xuICAgICAgdCA+Pj49IDQ7XG4gICAgfVxuICAgIGlmICh0ID49IDB4MDIpIHtcbiAgICAgIHIgKz0gMjtcbiAgICAgIHQgPj4+PSAyO1xuICAgIH1cbiAgICByZXR1cm4gciArIHQ7XG4gIH07XG59XG5cbkJOLnByb3RvdHlwZS5femVyb0JpdHMgPSBmdW5jdGlvbiBfemVyb0JpdHModykge1xuICAvLyBTaG9ydC1jdXRcbiAgaWYgKHcgPT09IDApXG4gICAgcmV0dXJuIDI2O1xuXG4gIHZhciB0ID0gdztcbiAgdmFyIHIgPSAwO1xuICBpZiAoKHQgJiAweDFmZmYpID09PSAwKSB7XG4gICAgciArPSAxMztcbiAgICB0ID4+Pj0gMTM7XG4gIH1cbiAgaWYgKCh0ICYgMHg3ZikgPT09IDApIHtcbiAgICByICs9IDc7XG4gICAgdCA+Pj49IDc7XG4gIH1cbiAgaWYgKCh0ICYgMHhmKSA9PT0gMCkge1xuICAgIHIgKz0gNDtcbiAgICB0ID4+Pj0gNDtcbiAgfVxuICBpZiAoKHQgJiAweDMpID09PSAwKSB7XG4gICAgciArPSAyO1xuICAgIHQgPj4+PSAyO1xuICB9XG4gIGlmICgodCAmIDB4MSkgPT09IDApXG4gICAgcisrO1xuICByZXR1cm4gcjtcbn07XG5cbi8vIFJldHVybiBudW1iZXIgb2YgdXNlZCBiaXRzIGluIGEgQk5cbkJOLnByb3RvdHlwZS5iaXRMZW5ndGggPSBmdW5jdGlvbiBiaXRMZW5ndGgoKSB7XG4gIHZhciBoaSA9IDA7XG4gIHZhciB3ID0gdGhpcy53b3Jkc1t0aGlzLmxlbmd0aCAtIDFdO1xuICB2YXIgaGkgPSB0aGlzLl9jb3VudEJpdHModyk7XG4gIHJldHVybiAodGhpcy5sZW5ndGggLSAxKSAqIDI2ICsgaGk7XG59O1xuXG4vLyBOdW1iZXIgb2YgdHJhaWxpbmcgemVybyBiaXRzXG5CTi5wcm90b3R5cGUuemVyb0JpdHMgPSBmdW5jdGlvbiB6ZXJvQml0cygpIHtcbiAgaWYgKHRoaXMuY21wbigwKSA9PT0gMClcbiAgICByZXR1cm4gMDtcblxuICB2YXIgciA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gdGhpcy5femVyb0JpdHModGhpcy53b3Jkc1tpXSk7XG4gICAgciArPSBiO1xuICAgIGlmIChiICE9PSAyNilcbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiByO1xufTtcblxuQk4ucHJvdG90eXBlLmJ5dGVMZW5ndGggPSBmdW5jdGlvbiBieXRlTGVuZ3RoKCkge1xuICByZXR1cm4gTWF0aC5jZWlsKHRoaXMuYml0TGVuZ3RoKCkgLyA4KTtcbn07XG5cbi8vIFJldHVybiBuZWdhdGl2ZSBjbG9uZSBvZiBgdGhpc2BcbkJOLnByb3RvdHlwZS5uZWcgPSBmdW5jdGlvbiBuZWcoKSB7XG4gIGlmICh0aGlzLmNtcG4oMCkgPT09IDApXG4gICAgcmV0dXJuIHRoaXMuY2xvbmUoKTtcblxuICB2YXIgciA9IHRoaXMuY2xvbmUoKTtcbiAgci5zaWduID0gIXRoaXMuc2lnbjtcbiAgcmV0dXJuIHI7XG59O1xuXG5cbi8vIE9yIGBudW1gIHdpdGggYHRoaXNgIGluLXBsYWNlXG5CTi5wcm90b3R5cGUuaW9yID0gZnVuY3Rpb24gaW9yKG51bSkge1xuICB0aGlzLnNpZ24gPSB0aGlzLnNpZ24gfHwgbnVtLnNpZ247XG5cbiAgd2hpbGUgKHRoaXMubGVuZ3RoIDwgbnVtLmxlbmd0aClcbiAgICB0aGlzLndvcmRzW3RoaXMubGVuZ3RoKytdID0gMDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IG51bS5sZW5ndGg7IGkrKylcbiAgICB0aGlzLndvcmRzW2ldID0gdGhpcy53b3Jkc1tpXSB8IG51bS53b3Jkc1tpXTtcblxuICByZXR1cm4gdGhpcy5zdHJpcCgpO1xufTtcblxuXG4vLyBPciBgbnVtYCB3aXRoIGB0aGlzYFxuQk4ucHJvdG90eXBlLm9yID0gZnVuY3Rpb24gb3IobnVtKSB7XG4gIGlmICh0aGlzLmxlbmd0aCA+IG51bS5sZW5ndGgpXG4gICAgcmV0dXJuIHRoaXMuY2xvbmUoKS5pb3IobnVtKTtcbiAgZWxzZVxuICAgIHJldHVybiBudW0uY2xvbmUoKS5pb3IodGhpcyk7XG59O1xuXG5cbi8vIEFuZCBgbnVtYCB3aXRoIGB0aGlzYCBpbi1wbGFjZVxuQk4ucHJvdG90eXBlLmlhbmQgPSBmdW5jdGlvbiBpYW5kKG51bSkge1xuICB0aGlzLnNpZ24gPSB0aGlzLnNpZ24gJiYgbnVtLnNpZ247XG5cbiAgLy8gYiA9IG1pbi1sZW5ndGgobnVtLCB0aGlzKVxuICB2YXIgYjtcbiAgaWYgKHRoaXMubGVuZ3RoID4gbnVtLmxlbmd0aClcbiAgICBiID0gbnVtO1xuICBlbHNlXG4gICAgYiA9IHRoaXM7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSsrKVxuICAgIHRoaXMud29yZHNbaV0gPSB0aGlzLndvcmRzW2ldICYgbnVtLndvcmRzW2ldO1xuXG4gIHRoaXMubGVuZ3RoID0gYi5sZW5ndGg7XG5cbiAgcmV0dXJuIHRoaXMuc3RyaXAoKTtcbn07XG5cblxuLy8gQW5kIGBudW1gIHdpdGggYHRoaXNgXG5CTi5wcm90b3R5cGUuYW5kID0gZnVuY3Rpb24gYW5kKG51bSkge1xuICBpZiAodGhpcy5sZW5ndGggPiBudW0ubGVuZ3RoKVxuICAgIHJldHVybiB0aGlzLmNsb25lKCkuaWFuZChudW0pO1xuICBlbHNlXG4gICAgcmV0dXJuIG51bS5jbG9uZSgpLmlhbmQodGhpcyk7XG59O1xuXG5cbi8vIFhvciBgbnVtYCB3aXRoIGB0aGlzYCBpbi1wbGFjZVxuQk4ucHJvdG90eXBlLml4b3IgPSBmdW5jdGlvbiBpeG9yKG51bSkge1xuICB0aGlzLnNpZ24gPSB0aGlzLnNpZ24gfHwgbnVtLnNpZ247XG5cbiAgLy8gYS5sZW5ndGggPiBiLmxlbmd0aFxuICB2YXIgYTtcbiAgdmFyIGI7XG4gIGlmICh0aGlzLmxlbmd0aCA+IG51bS5sZW5ndGgpIHtcbiAgICBhID0gdGhpcztcbiAgICBiID0gbnVtO1xuICB9IGVsc2Uge1xuICAgIGEgPSBudW07XG4gICAgYiA9IHRoaXM7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGIubGVuZ3RoOyBpKyspXG4gICAgdGhpcy53b3Jkc1tpXSA9IGEud29yZHNbaV0gXiBiLndvcmRzW2ldO1xuXG4gIGlmICh0aGlzICE9PSBhKVxuICAgIGZvciAoOyBpIDwgYS5sZW5ndGg7IGkrKylcbiAgICAgIHRoaXMud29yZHNbaV0gPSBhLndvcmRzW2ldO1xuXG4gIHRoaXMubGVuZ3RoID0gYS5sZW5ndGg7XG5cbiAgcmV0dXJuIHRoaXMuc3RyaXAoKTtcbn07XG5cblxuLy8gWG9yIGBudW1gIHdpdGggYHRoaXNgXG5CTi5wcm90b3R5cGUueG9yID0gZnVuY3Rpb24geG9yKG51bSkge1xuICBpZiAodGhpcy5sZW5ndGggPiBudW0ubGVuZ3RoKVxuICAgIHJldHVybiB0aGlzLmNsb25lKCkuaXhvcihudW0pO1xuICBlbHNlXG4gICAgcmV0dXJuIG51bS5jbG9uZSgpLml4b3IodGhpcyk7XG59O1xuXG5cbi8vIFNldCBgYml0YCBvZiBgdGhpc2BcbkJOLnByb3RvdHlwZS5zZXRuID0gZnVuY3Rpb24gc2V0bihiaXQsIHZhbCkge1xuICBhc3NlcnQodHlwZW9mIGJpdCA9PT0gJ251bWJlcicgJiYgYml0ID49IDApO1xuXG4gIHZhciBvZmYgPSAoYml0IC8gMjYpIHwgMDtcbiAgdmFyIHdiaXQgPSBiaXQgJSAyNjtcblxuICB3aGlsZSAodGhpcy5sZW5ndGggPD0gb2ZmKVxuICAgIHRoaXMud29yZHNbdGhpcy5sZW5ndGgrK10gPSAwO1xuXG4gIGlmICh2YWwpXG4gICAgdGhpcy53b3Jkc1tvZmZdID0gdGhpcy53b3Jkc1tvZmZdIHwgKDEgPDwgd2JpdCk7XG4gIGVsc2VcbiAgICB0aGlzLndvcmRzW29mZl0gPSB0aGlzLndvcmRzW29mZl0gJiB+KDEgPDwgd2JpdCk7XG5cbiAgcmV0dXJuIHRoaXMuc3RyaXAoKTtcbn07XG5cblxuLy8gQWRkIGBudW1gIHRvIGB0aGlzYCBpbi1wbGFjZVxuQk4ucHJvdG90eXBlLmlhZGQgPSBmdW5jdGlvbiBpYWRkKG51bSkge1xuICAvLyBuZWdhdGl2ZSArIHBvc2l0aXZlXG4gIGlmICh0aGlzLnNpZ24gJiYgIW51bS5zaWduKSB7XG4gICAgdGhpcy5zaWduID0gZmFsc2U7XG4gICAgdmFyIHIgPSB0aGlzLmlzdWIobnVtKTtcbiAgICB0aGlzLnNpZ24gPSAhdGhpcy5zaWduO1xuICAgIHJldHVybiB0aGlzLl9ub3JtU2lnbigpO1xuXG4gIC8vIHBvc2l0aXZlICsgbmVnYXRpdmVcbiAgfSBlbHNlIGlmICghdGhpcy5zaWduICYmIG51bS5zaWduKSB7XG4gICAgbnVtLnNpZ24gPSBmYWxzZTtcbiAgICB2YXIgciA9IHRoaXMuaXN1YihudW0pO1xuICAgIG51bS5zaWduID0gdHJ1ZTtcbiAgICByZXR1cm4gci5fbm9ybVNpZ24oKTtcbiAgfVxuXG4gIC8vIGEubGVuZ3RoID4gYi5sZW5ndGhcbiAgdmFyIGE7XG4gIHZhciBiO1xuICBpZiAodGhpcy5sZW5ndGggPiBudW0ubGVuZ3RoKSB7XG4gICAgYSA9IHRoaXM7XG4gICAgYiA9IG51bTtcbiAgfSBlbHNlIHtcbiAgICBhID0gbnVtO1xuICAgIGIgPSB0aGlzO1xuICB9XG5cbiAgdmFyIGNhcnJ5ID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHIgPSBhLndvcmRzW2ldICsgYi53b3Jkc1tpXSArIGNhcnJ5O1xuICAgIHRoaXMud29yZHNbaV0gPSByICYgMHgzZmZmZmZmO1xuICAgIGNhcnJ5ID0gciA+Pj4gMjY7XG4gIH1cbiAgZm9yICg7IGNhcnJ5ICE9PSAwICYmIGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHIgPSBhLndvcmRzW2ldICsgY2Fycnk7XG4gICAgdGhpcy53b3Jkc1tpXSA9IHIgJiAweDNmZmZmZmY7XG4gICAgY2FycnkgPSByID4+PiAyNjtcbiAgfVxuXG4gIHRoaXMubGVuZ3RoID0gYS5sZW5ndGg7XG4gIGlmIChjYXJyeSAhPT0gMCkge1xuICAgIHRoaXMud29yZHNbdGhpcy5sZW5ndGhdID0gY2Fycnk7XG4gICAgdGhpcy5sZW5ndGgrKztcbiAgLy8gQ29weSB0aGUgcmVzdCBvZiB0aGUgd29yZHNcbiAgfSBlbHNlIGlmIChhICE9PSB0aGlzKSB7XG4gICAgZm9yICg7IGkgPCBhLmxlbmd0aDsgaSsrKVxuICAgICAgdGhpcy53b3Jkc1tpXSA9IGEud29yZHNbaV07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIEFkZCBgbnVtYCB0byBgdGhpc2BcbkJOLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiBhZGQobnVtKSB7XG4gIGlmIChudW0uc2lnbiAmJiAhdGhpcy5zaWduKSB7XG4gICAgbnVtLnNpZ24gPSBmYWxzZTtcbiAgICB2YXIgcmVzID0gdGhpcy5zdWIobnVtKTtcbiAgICBudW0uc2lnbiA9IHRydWU7XG4gICAgcmV0dXJuIHJlcztcbiAgfSBlbHNlIGlmICghbnVtLnNpZ24gJiYgdGhpcy5zaWduKSB7XG4gICAgdGhpcy5zaWduID0gZmFsc2U7XG4gICAgdmFyIHJlcyA9IG51bS5zdWIodGhpcyk7XG4gICAgdGhpcy5zaWduID0gdHJ1ZTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgaWYgKHRoaXMubGVuZ3RoID4gbnVtLmxlbmd0aClcbiAgICByZXR1cm4gdGhpcy5jbG9uZSgpLmlhZGQobnVtKTtcbiAgZWxzZVxuICAgIHJldHVybiBudW0uY2xvbmUoKS5pYWRkKHRoaXMpO1xufTtcblxuLy8gU3VidHJhY3QgYG51bWAgZnJvbSBgdGhpc2AgaW4tcGxhY2VcbkJOLnByb3RvdHlwZS5pc3ViID0gZnVuY3Rpb24gaXN1YihudW0pIHtcbiAgLy8gdGhpcyAtICgtbnVtKSA9IHRoaXMgKyBudW1cbiAgaWYgKG51bS5zaWduKSB7XG4gICAgbnVtLnNpZ24gPSBmYWxzZTtcbiAgICB2YXIgciA9IHRoaXMuaWFkZChudW0pO1xuICAgIG51bS5zaWduID0gdHJ1ZTtcbiAgICByZXR1cm4gci5fbm9ybVNpZ24oKTtcblxuICAvLyAtdGhpcyAtIG51bSA9IC0odGhpcyArIG51bSlcbiAgfSBlbHNlIGlmICh0aGlzLnNpZ24pIHtcbiAgICB0aGlzLnNpZ24gPSBmYWxzZTtcbiAgICB0aGlzLmlhZGQobnVtKTtcbiAgICB0aGlzLnNpZ24gPSB0cnVlO1xuICAgIHJldHVybiB0aGlzLl9ub3JtU2lnbigpO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCBib3RoIG51bWJlcnMgYXJlIHBvc2l0aXZlXG4gIHZhciBjbXAgPSB0aGlzLmNtcChudW0pO1xuXG4gIC8vIE9wdGltaXphdGlvbiAtIHplcm9pZnlcbiAgaWYgKGNtcCA9PT0gMCkge1xuICAgIHRoaXMuc2lnbiA9IGZhbHNlO1xuICAgIHRoaXMubGVuZ3RoID0gMTtcbiAgICB0aGlzLndvcmRzWzBdID0gMDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGEgPiBiXG4gIHZhciBhO1xuICB2YXIgYjtcbiAgaWYgKGNtcCA+IDApIHtcbiAgICBhID0gdGhpcztcbiAgICBiID0gbnVtO1xuICB9IGVsc2Uge1xuICAgIGEgPSBudW07XG4gICAgYiA9IHRoaXM7XG4gIH1cblxuICB2YXIgY2FycnkgPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGIubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgciA9IGEud29yZHNbaV0gLSBiLndvcmRzW2ldICsgY2Fycnk7XG4gICAgY2FycnkgPSByID4+IDI2O1xuICAgIHRoaXMud29yZHNbaV0gPSByICYgMHgzZmZmZmZmO1xuICB9XG4gIGZvciAoOyBjYXJyeSAhPT0gMCAmJiBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgIHZhciByID0gYS53b3Jkc1tpXSArIGNhcnJ5O1xuICAgIGNhcnJ5ID0gciA+PiAyNjtcbiAgICB0aGlzLndvcmRzW2ldID0gciAmIDB4M2ZmZmZmZjtcbiAgfVxuXG4gIC8vIENvcHkgcmVzdCBvZiB0aGUgd29yZHNcbiAgaWYgKGNhcnJ5ID09PSAwICYmIGkgPCBhLmxlbmd0aCAmJiBhICE9PSB0aGlzKVxuICAgIGZvciAoOyBpIDwgYS5sZW5ndGg7IGkrKylcbiAgICAgIHRoaXMud29yZHNbaV0gPSBhLndvcmRzW2ldO1xuICB0aGlzLmxlbmd0aCA9IE1hdGgubWF4KHRoaXMubGVuZ3RoLCBpKTtcblxuICBpZiAoYSAhPT0gdGhpcylcbiAgICB0aGlzLnNpZ24gPSB0cnVlO1xuXG4gIHJldHVybiB0aGlzLnN0cmlwKCk7XG59O1xuXG4vLyBTdWJ0cmFjdCBgbnVtYCBmcm9tIGB0aGlzYFxuQk4ucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uIHN1YihudW0pIHtcbiAgcmV0dXJuIHRoaXMuY2xvbmUoKS5pc3ViKG51bSk7XG59O1xuXG4vKlxuLy8gTk9URTogVGhpcyBjb3VsZCBiZSBwb3RlbnRpb25hbGx5IHVzZWQgdG8gZ2VuZXJhdGUgbG9vcC1sZXNzIG11bHRpcGxpY2F0aW9uc1xuZnVuY3Rpb24gX2dlbkNvbWJNdWxUbyhhbGVuLCBibGVuKSB7XG4gIHZhciBsZW4gPSBhbGVuICsgYmxlbiAtIDE7XG4gIHZhciBzcmMgPSBbXG4gICAgJ3ZhciBhID0gdGhpcy53b3JkcywgYiA9IG51bS53b3JkcywgbyA9IG91dC53b3JkcywgYyA9IDAsIHcsICcgK1xuICAgICAgICAnbWFzayA9IDB4M2ZmZmZmZiwgc2hpZnQgPSAweDQwMDAwMDA7JyxcbiAgICAnb3V0Lmxlbmd0aCA9ICcgKyBsZW4gKyAnOydcbiAgXTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBsZW47IGsrKykge1xuICAgIHZhciBtaW5KID0gTWF0aC5tYXgoMCwgayAtIGFsZW4gKyAxKTtcbiAgICB2YXIgbWF4SiA9IE1hdGgubWluKGssIGJsZW4gLSAxKTtcblxuICAgIGZvciAodmFyIGogPSBtaW5KOyBqIDw9IG1heEo7IGorKykge1xuICAgICAgdmFyIGkgPSBrIC0gajtcbiAgICAgIHZhciBtdWwgPSAnYVsnICsgaSArICddICogYlsnICsgaiArICddJztcblxuICAgICAgaWYgKGogPT09IG1pbkopIHtcbiAgICAgICAgc3JjLnB1c2goJ3cgPSAnICsgbXVsICsgJyArIGM7Jyk7XG4gICAgICAgIHNyYy5wdXNoKCdjID0gKHcgLyBzaGlmdCkgfCAwOycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3JjLnB1c2goJ3cgKz0gJyArIG11bCArICc7Jyk7XG4gICAgICAgIHNyYy5wdXNoKCdjICs9ICh3IC8gc2hpZnQpIHwgMDsnKTtcbiAgICAgIH1cbiAgICAgIHNyYy5wdXNoKCd3ICY9IG1hc2s7Jyk7XG4gICAgfVxuICAgIHNyYy5wdXNoKCdvWycgKyBrICsgJ10gPSB3OycpO1xuICB9XG4gIHNyYy5wdXNoKCdpZiAoYyAhPT0gMCkgeycsXG4gICAgICAgICAgICcgIG9bJyArIGsgKyAnXSA9IGM7JyxcbiAgICAgICAgICAgJyAgb3V0Lmxlbmd0aCsrOycsXG4gICAgICAgICAgICd9JyxcbiAgICAgICAgICAgJ3JldHVybiBvdXQ7Jyk7XG5cbiAgcmV0dXJuIHNyYy5qb2luKCdcXG4nKTtcbn1cbiovXG5cbkJOLnByb3RvdHlwZS5fc21hbGxNdWxUbyA9IGZ1bmN0aW9uIF9zbWFsbE11bFRvKG51bSwgb3V0KSB7XG4gIG91dC5zaWduID0gbnVtLnNpZ24gIT09IHRoaXMuc2lnbjtcbiAgb3V0Lmxlbmd0aCA9IHRoaXMubGVuZ3RoICsgbnVtLmxlbmd0aDtcblxuICB2YXIgY2FycnkgPSAwO1xuICBmb3IgKHZhciBrID0gMDsgayA8IG91dC5sZW5ndGggLSAxOyBrKyspIHtcbiAgICAvLyBTdW0gYWxsIHdvcmRzIHdpdGggdGhlIHNhbWUgYGkgKyBqID0ga2AgYW5kIGFjY3VtdWxhdGUgYG5jYXJyeWAsXG4gICAgLy8gbm90ZSB0aGF0IG5jYXJyeSBjb3VsZCBiZSA+PSAweDNmZmZmZmZcbiAgICB2YXIgbmNhcnJ5ID0gY2FycnkgPj4+IDI2O1xuICAgIHZhciByd29yZCA9IGNhcnJ5ICYgMHgzZmZmZmZmO1xuICAgIHZhciBtYXhKID0gTWF0aC5taW4oaywgbnVtLmxlbmd0aCAtIDEpO1xuICAgIGZvciAodmFyIGogPSBNYXRoLm1heCgwLCBrIC0gdGhpcy5sZW5ndGggKyAxKTsgaiA8PSBtYXhKOyBqKyspIHtcbiAgICAgIHZhciBpID0gayAtIGo7XG4gICAgICB2YXIgYSA9IHRoaXMud29yZHNbaV0gfCAwO1xuICAgICAgdmFyIGIgPSBudW0ud29yZHNbal0gfCAwO1xuICAgICAgdmFyIHIgPSBhICogYjtcblxuICAgICAgdmFyIGxvID0gciAmIDB4M2ZmZmZmZjtcbiAgICAgIG5jYXJyeSA9IChuY2FycnkgKyAoKHIgLyAweDQwMDAwMDApIHwgMCkpIHwgMDtcbiAgICAgIGxvID0gKGxvICsgcndvcmQpIHwgMDtcbiAgICAgIHJ3b3JkID0gbG8gJiAweDNmZmZmZmY7XG4gICAgICBuY2FycnkgPSAobmNhcnJ5ICsgKGxvID4+PiAyNikpIHwgMDtcbiAgICB9XG4gICAgb3V0LndvcmRzW2tdID0gcndvcmQ7XG4gICAgY2FycnkgPSBuY2Fycnk7XG4gIH1cbiAgaWYgKGNhcnJ5ICE9PSAwKSB7XG4gICAgb3V0LndvcmRzW2tdID0gY2Fycnk7XG4gIH0gZWxzZSB7XG4gICAgb3V0Lmxlbmd0aC0tO1xuICB9XG5cbiAgcmV0dXJuIG91dC5zdHJpcCgpO1xufTtcblxuQk4ucHJvdG90eXBlLl9iaWdNdWxUbyA9IGZ1bmN0aW9uIF9iaWdNdWxUbyhudW0sIG91dCkge1xuICBvdXQuc2lnbiA9IG51bS5zaWduICE9PSB0aGlzLnNpZ247XG4gIG91dC5sZW5ndGggPSB0aGlzLmxlbmd0aCArIG51bS5sZW5ndGg7XG5cbiAgdmFyIGNhcnJ5ID0gMDtcbiAgdmFyIGhuY2FycnkgPSAwO1xuICBmb3IgKHZhciBrID0gMDsgayA8IG91dC5sZW5ndGggLSAxOyBrKyspIHtcbiAgICAvLyBTdW0gYWxsIHdvcmRzIHdpdGggdGhlIHNhbWUgYGkgKyBqID0ga2AgYW5kIGFjY3VtdWxhdGUgYG5jYXJyeWAsXG4gICAgLy8gbm90ZSB0aGF0IG5jYXJyeSBjb3VsZCBiZSA+PSAweDNmZmZmZmZcbiAgICB2YXIgbmNhcnJ5ID0gaG5jYXJyeTtcbiAgICBobmNhcnJ5ID0gMDtcbiAgICB2YXIgcndvcmQgPSBjYXJyeSAmIDB4M2ZmZmZmZjtcbiAgICB2YXIgbWF4SiA9IE1hdGgubWluKGssIG51bS5sZW5ndGggLSAxKTtcbiAgICBmb3IgKHZhciBqID0gTWF0aC5tYXgoMCwgayAtIHRoaXMubGVuZ3RoICsgMSk7IGogPD0gbWF4SjsgaisrKSB7XG4gICAgICB2YXIgaSA9IGsgLSBqO1xuICAgICAgdmFyIGEgPSB0aGlzLndvcmRzW2ldIHwgMDtcbiAgICAgIHZhciBiID0gbnVtLndvcmRzW2pdIHwgMDtcbiAgICAgIHZhciByID0gYSAqIGI7XG5cbiAgICAgIHZhciBsbyA9IHIgJiAweDNmZmZmZmY7XG4gICAgICBuY2FycnkgPSAobmNhcnJ5ICsgKChyIC8gMHg0MDAwMDAwKSB8IDApKSB8IDA7XG4gICAgICBsbyA9IChsbyArIHJ3b3JkKSB8IDA7XG4gICAgICByd29yZCA9IGxvICYgMHgzZmZmZmZmO1xuICAgICAgbmNhcnJ5ID0gKG5jYXJyeSArIChsbyA+Pj4gMjYpKSB8IDA7XG5cbiAgICAgIGhuY2FycnkgKz0gbmNhcnJ5ID4+PiAyNjtcbiAgICAgIG5jYXJyeSAmPSAweDNmZmZmZmY7XG4gICAgfVxuICAgIG91dC53b3Jkc1trXSA9IHJ3b3JkO1xuICAgIGNhcnJ5ID0gbmNhcnJ5O1xuICAgIG5jYXJyeSA9IGhuY2Fycnk7XG4gIH1cbiAgaWYgKGNhcnJ5ICE9PSAwKSB7XG4gICAgb3V0LndvcmRzW2tdID0gY2Fycnk7XG4gIH0gZWxzZSB7XG4gICAgb3V0Lmxlbmd0aC0tO1xuICB9XG5cbiAgcmV0dXJuIG91dC5zdHJpcCgpO1xufTtcblxuQk4ucHJvdG90eXBlLm11bFRvID0gZnVuY3Rpb24gbXVsVG8obnVtLCBvdXQpIHtcbiAgdmFyIHJlcztcbiAgaWYgKHRoaXMubGVuZ3RoICsgbnVtLmxlbmd0aCA8IDYzKVxuICAgIHJlcyA9IHRoaXMuX3NtYWxsTXVsVG8obnVtLCBvdXQpO1xuICBlbHNlXG4gICAgcmVzID0gdGhpcy5fYmlnTXVsVG8obnVtLCBvdXQpO1xuICByZXR1cm4gcmVzO1xufTtcblxuLy8gTXVsdGlwbHkgYHRoaXNgIGJ5IGBudW1gXG5CTi5wcm90b3R5cGUubXVsID0gZnVuY3Rpb24gbXVsKG51bSkge1xuICB2YXIgb3V0ID0gbmV3IEJOKG51bGwpO1xuICBvdXQud29yZHMgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGggKyBudW0ubGVuZ3RoKTtcbiAgcmV0dXJuIHRoaXMubXVsVG8obnVtLCBvdXQpO1xufTtcblxuLy8gSW4tcGxhY2UgTXVsdGlwbGljYXRpb25cbkJOLnByb3RvdHlwZS5pbXVsID0gZnVuY3Rpb24gaW11bChudW0pIHtcbiAgaWYgKHRoaXMuY21wbigwKSA9PT0gMCB8fCBudW0uY21wbigwKSA9PT0gMCkge1xuICAgIHRoaXMud29yZHNbMF0gPSAwO1xuICAgIHRoaXMubGVuZ3RoID0gMTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciB0bGVuID0gdGhpcy5sZW5ndGg7XG4gIHZhciBubGVuID0gbnVtLmxlbmd0aDtcblxuICB0aGlzLnNpZ24gPSBudW0uc2lnbiAhPT0gdGhpcy5zaWduO1xuICB0aGlzLmxlbmd0aCA9IHRoaXMubGVuZ3RoICsgbnVtLmxlbmd0aDtcbiAgdGhpcy53b3Jkc1t0aGlzLmxlbmd0aCAtIDFdID0gMDtcblxuICBmb3IgKHZhciBrID0gdGhpcy5sZW5ndGggLSAyOyBrID49IDA7IGstLSkge1xuICAgIC8vIFN1bSBhbGwgd29yZHMgd2l0aCB0aGUgc2FtZSBgaSArIGogPSBrYCBhbmQgYWNjdW11bGF0ZSBgY2FycnlgLFxuICAgIC8vIG5vdGUgdGhhdCBjYXJyeSBjb3VsZCBiZSA+PSAweDNmZmZmZmZcbiAgICB2YXIgY2FycnkgPSAwO1xuICAgIHZhciByd29yZCA9IDA7XG4gICAgdmFyIG1heEogPSBNYXRoLm1pbihrLCBubGVuIC0gMSk7XG4gICAgZm9yICh2YXIgaiA9IE1hdGgubWF4KDAsIGsgLSB0bGVuICsgMSk7IGogPD0gbWF4SjsgaisrKSB7XG4gICAgICB2YXIgaSA9IGsgLSBqO1xuICAgICAgdmFyIGEgPSB0aGlzLndvcmRzW2ldO1xuICAgICAgdmFyIGIgPSBudW0ud29yZHNbal07XG4gICAgICB2YXIgciA9IGEgKiBiO1xuXG4gICAgICB2YXIgbG8gPSByICYgMHgzZmZmZmZmO1xuICAgICAgY2FycnkgKz0gKHIgLyAweDQwMDAwMDApIHwgMDtcbiAgICAgIGxvICs9IHJ3b3JkO1xuICAgICAgcndvcmQgPSBsbyAmIDB4M2ZmZmZmZjtcbiAgICAgIGNhcnJ5ICs9IGxvID4+PiAyNjtcbiAgICB9XG4gICAgdGhpcy53b3Jkc1trXSA9IHJ3b3JkO1xuICAgIHRoaXMud29yZHNbayArIDFdICs9IGNhcnJ5O1xuICAgIGNhcnJ5ID0gMDtcbiAgfVxuXG4gIC8vIFByb3BhZ2F0ZSBvdmVyZmxvd3NcbiAgdmFyIGNhcnJ5ID0gMDtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHcgPSB0aGlzLndvcmRzW2ldICsgY2Fycnk7XG4gICAgdGhpcy53b3Jkc1tpXSA9IHcgJiAweDNmZmZmZmY7XG4gICAgY2FycnkgPSB3ID4+PiAyNjtcbiAgfVxuXG4gIHJldHVybiB0aGlzLnN0cmlwKCk7XG59O1xuXG5CTi5wcm90b3R5cGUuaW11bG4gPSBmdW5jdGlvbiBpbXVsbihudW0pIHtcbiAgYXNzZXJ0KHR5cGVvZiBudW0gPT09ICdudW1iZXInKTtcblxuICAvLyBDYXJyeVxuICB2YXIgY2FycnkgPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgdyA9IHRoaXMud29yZHNbaV0gKiBudW07XG4gICAgdmFyIGxvID0gKHcgJiAweDNmZmZmZmYpICsgKGNhcnJ5ICYgMHgzZmZmZmZmKTtcbiAgICBjYXJyeSA+Pj0gMjY7XG4gICAgY2FycnkgKz0gKHcgLyAweDQwMDAwMDApIHwgMDtcbiAgICAvLyBOT1RFOiBsbyBpcyAyN2JpdCBtYXhpbXVtXG4gICAgY2FycnkgKz0gbG8gPj4+IDI2O1xuICAgIHRoaXMud29yZHNbaV0gPSBsbyAmIDB4M2ZmZmZmZjtcbiAgfVxuXG4gIGlmIChjYXJyeSAhPT0gMCkge1xuICAgIHRoaXMud29yZHNbaV0gPSBjYXJyeTtcbiAgICB0aGlzLmxlbmd0aCsrO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5CTi5wcm90b3R5cGUubXVsbiA9IGZ1bmN0aW9uIG11bG4obnVtKSB7XG4gIHJldHVybiB0aGlzLmNsb25lKCkuaW11bG4obnVtKTtcbn07XG5cbi8vIGB0aGlzYCAqIGB0aGlzYFxuQk4ucHJvdG90eXBlLnNxciA9IGZ1bmN0aW9uIHNxcigpIHtcbiAgcmV0dXJuIHRoaXMubXVsKHRoaXMpO1xufTtcblxuLy8gYHRoaXNgICogYHRoaXNgIGluLXBsYWNlXG5CTi5wcm90b3R5cGUuaXNxciA9IGZ1bmN0aW9uIGlzcXIoKSB7XG4gIHJldHVybiB0aGlzLm11bCh0aGlzKTtcbn07XG5cbi8vIFNoaWZ0LWxlZnQgaW4tcGxhY2VcbkJOLnByb3RvdHlwZS5pc2hsbiA9IGZ1bmN0aW9uIGlzaGxuKGJpdHMpIHtcbiAgYXNzZXJ0KHR5cGVvZiBiaXRzID09PSAnbnVtYmVyJyAmJiBiaXRzID49IDApO1xuICB2YXIgciA9IGJpdHMgJSAyNjtcbiAgdmFyIHMgPSAoYml0cyAtIHIpIC8gMjY7XG4gIHZhciBjYXJyeU1hc2sgPSAoMHgzZmZmZmZmID4+PiAoMjYgLSByKSkgPDwgKDI2IC0gcik7XG5cbiAgaWYgKHIgIT09IDApIHtcbiAgICB2YXIgY2FycnkgPSAwO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5ld0NhcnJ5ID0gdGhpcy53b3Jkc1tpXSAmIGNhcnJ5TWFzaztcbiAgICAgIHZhciBjID0gKHRoaXMud29yZHNbaV0gLSBuZXdDYXJyeSkgPDwgcjtcbiAgICAgIHRoaXMud29yZHNbaV0gPSBjIHwgY2Fycnk7XG4gICAgICBjYXJyeSA9IG5ld0NhcnJ5ID4+PiAoMjYgLSByKTtcbiAgICB9XG4gICAgaWYgKGNhcnJ5KSB7XG4gICAgICB0aGlzLndvcmRzW2ldID0gY2Fycnk7XG4gICAgICB0aGlzLmxlbmd0aCsrO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzICE9PSAwKSB7XG4gICAgZm9yICh2YXIgaSA9IHRoaXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pXG4gICAgICB0aGlzLndvcmRzW2kgKyBzXSA9IHRoaXMud29yZHNbaV07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXG4gICAgICB0aGlzLndvcmRzW2ldID0gMDtcbiAgICB0aGlzLmxlbmd0aCArPSBzO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuc3RyaXAoKTtcbn07XG5cbi8vIFNoaWZ0LXJpZ2h0IGluLXBsYWNlXG4vLyBOT1RFOiBgaGludGAgaXMgYSBsb3dlc3QgYml0IGJlZm9yZSB0cmFpbGluZyB6ZXJvZXNcbi8vIE5PVEU6IGlmIGBleHRlbmRlZGAgaXMgcHJlc2VudCAtIGl0IHdpbGwgYmUgZmlsbGVkIHdpdGggZGVzdHJveWVkIGJpdHNcbkJOLnByb3RvdHlwZS5pc2hybiA9IGZ1bmN0aW9uIGlzaHJuKGJpdHMsIGhpbnQsIGV4dGVuZGVkKSB7XG4gIGFzc2VydCh0eXBlb2YgYml0cyA9PT0gJ251bWJlcicgJiYgYml0cyA+PSAwKTtcbiAgdmFyIGg7XG4gIGlmIChoaW50KVxuICAgIGggPSAoaGludCAtIChoaW50ICUgMjYpKSAvIDI2O1xuICBlbHNlXG4gICAgaCA9IDA7XG5cbiAgdmFyIHIgPSBiaXRzICUgMjY7XG4gIHZhciBzID0gTWF0aC5taW4oKGJpdHMgLSByKSAvIDI2LCB0aGlzLmxlbmd0aCk7XG4gIHZhciBtYXNrID0gMHgzZmZmZmZmIF4gKCgweDNmZmZmZmYgPj4+IHIpIDw8IHIpO1xuICB2YXIgbWFza2VkV29yZHMgPSBleHRlbmRlZDtcblxuICBoIC09IHM7XG4gIGggPSBNYXRoLm1heCgwLCBoKTtcblxuICAvLyBFeHRlbmRlZCBtb2RlLCBjb3B5IG1hc2tlZCBwYXJ0XG4gIGlmIChtYXNrZWRXb3Jkcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxuICAgICAgbWFza2VkV29yZHMud29yZHNbaV0gPSB0aGlzLndvcmRzW2ldO1xuICAgIG1hc2tlZFdvcmRzLmxlbmd0aCA9IHM7XG4gIH1cblxuICBpZiAocyA9PT0gMCkge1xuICAgIC8vIE5vLW9wLCB3ZSBzaG91bGQgbm90IG1vdmUgYW55dGhpbmcgYXQgYWxsXG4gIH0gZWxzZSBpZiAodGhpcy5sZW5ndGggPiBzKSB7XG4gICAgdGhpcy5sZW5ndGggLT0gcztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspXG4gICAgICB0aGlzLndvcmRzW2ldID0gdGhpcy53b3Jkc1tpICsgc107XG4gIH0gZWxzZSB7XG4gICAgdGhpcy53b3Jkc1swXSA9IDA7XG4gICAgdGhpcy5sZW5ndGggPSAxO1xuICB9XG5cbiAgdmFyIGNhcnJ5ID0gMDtcbiAgZm9yICh2YXIgaSA9IHRoaXMubGVuZ3RoIC0gMTsgaSA+PSAwICYmIChjYXJyeSAhPT0gMCB8fCBpID49IGgpOyBpLS0pIHtcbiAgICB2YXIgd29yZCA9IHRoaXMud29yZHNbaV07XG4gICAgdGhpcy53b3Jkc1tpXSA9IChjYXJyeSA8PCAoMjYgLSByKSkgfCAod29yZCA+Pj4gcik7XG4gICAgY2FycnkgPSB3b3JkICYgbWFzaztcbiAgfVxuXG4gIC8vIFB1c2ggY2FycmllZCBiaXRzIGFzIGEgbWFza1xuICBpZiAobWFza2VkV29yZHMgJiYgY2FycnkgIT09IDApXG4gICAgbWFza2VkV29yZHMud29yZHNbbWFza2VkV29yZHMubGVuZ3RoKytdID0gY2Fycnk7XG5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhpcy53b3Jkc1swXSA9IDA7XG4gICAgdGhpcy5sZW5ndGggPSAxO1xuICB9XG5cbiAgdGhpcy5zdHJpcCgpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gU2hpZnQtbGVmdFxuQk4ucHJvdG90eXBlLnNobG4gPSBmdW5jdGlvbiBzaGxuKGJpdHMpIHtcbiAgcmV0dXJuIHRoaXMuY2xvbmUoKS5pc2hsbihiaXRzKTtcbn07XG5cbi8vIFNoaWZ0LXJpZ2h0XG5CTi5wcm90b3R5cGUuc2hybiA9IGZ1bmN0aW9uIHNocm4oYml0cykge1xuICByZXR1cm4gdGhpcy5jbG9uZSgpLmlzaHJuKGJpdHMpO1xufTtcblxuLy8gVGVzdCBpZiBuIGJpdCBpcyBzZXRcbkJOLnByb3RvdHlwZS50ZXN0biA9IGZ1bmN0aW9uIHRlc3RuKGJpdCkge1xuICBhc3NlcnQodHlwZW9mIGJpdCA9PT0gJ251bWJlcicgJiYgYml0ID49IDApO1xuICB2YXIgciA9IGJpdCAlIDI2O1xuICB2YXIgcyA9IChiaXQgLSByKSAvIDI2O1xuICB2YXIgcSA9IDEgPDwgcjtcblxuICAvLyBGYXN0IGNhc2U6IGJpdCBpcyBtdWNoIGhpZ2hlciB0aGFuIGFsbCBleGlzdGluZyB3b3Jkc1xuICBpZiAodGhpcy5sZW5ndGggPD0gcykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIENoZWNrIGJpdCBhbmQgcmV0dXJuXG4gIHZhciB3ID0gdGhpcy53b3Jkc1tzXTtcblxuICByZXR1cm4gISEodyAmIHEpO1xufTtcblxuLy8gUmV0dXJuIG9ubHkgbG93ZXJzIGJpdHMgb2YgbnVtYmVyIChpbi1wbGFjZSlcbkJOLnByb3RvdHlwZS5pbWFza24gPSBmdW5jdGlvbiBpbWFza24oYml0cykge1xuICBhc3NlcnQodHlwZW9mIGJpdHMgPT09ICdudW1iZXInICYmIGJpdHMgPj0gMCk7XG4gIHZhciByID0gYml0cyAlIDI2O1xuICB2YXIgcyA9IChiaXRzIC0gcikgLyAyNjtcblxuICBhc3NlcnQoIXRoaXMuc2lnbiwgJ2ltYXNrbiB3b3JrcyBvbmx5IHdpdGggcG9zaXRpdmUgbnVtYmVycycpO1xuXG4gIGlmIChyICE9PSAwKVxuICAgIHMrKztcbiAgdGhpcy5sZW5ndGggPSBNYXRoLm1pbihzLCB0aGlzLmxlbmd0aCk7XG5cbiAgaWYgKHIgIT09IDApIHtcbiAgICB2YXIgbWFzayA9IDB4M2ZmZmZmZiBeICgoMHgzZmZmZmZmID4+PiByKSA8PCByKTtcbiAgICB0aGlzLndvcmRzW3RoaXMubGVuZ3RoIC0gMV0gJj0gbWFzaztcbiAgfVxuXG4gIHJldHVybiB0aGlzLnN0cmlwKCk7XG59O1xuXG4vLyBSZXR1cm4gb25seSBsb3dlcnMgYml0cyBvZiBudW1iZXJcbkJOLnByb3RvdHlwZS5tYXNrbiA9IGZ1bmN0aW9uIG1hc2tuKGJpdHMpIHtcbiAgcmV0dXJuIHRoaXMuY2xvbmUoKS5pbWFza24oYml0cyk7XG59O1xuXG4vLyBBZGQgcGxhaW4gbnVtYmVyIGBudW1gIHRvIGB0aGlzYFxuQk4ucHJvdG90eXBlLmlhZGRuID0gZnVuY3Rpb24gaWFkZG4obnVtKSB7XG4gIGFzc2VydCh0eXBlb2YgbnVtID09PSAnbnVtYmVyJyk7XG4gIGlmIChudW0gPCAwKVxuICAgIHJldHVybiB0aGlzLmlzdWJuKC1udW0pO1xuXG4gIC8vIFBvc3NpYmxlIHNpZ24gY2hhbmdlXG4gIGlmICh0aGlzLnNpZ24pIHtcbiAgICBpZiAodGhpcy5sZW5ndGggPT09IDEgJiYgdGhpcy53b3Jkc1swXSA8IG51bSkge1xuICAgICAgdGhpcy53b3Jkc1swXSA9IG51bSAtIHRoaXMud29yZHNbMF07XG4gICAgICB0aGlzLnNpZ24gPSBmYWxzZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHRoaXMuc2lnbiA9IGZhbHNlO1xuICAgIHRoaXMuaXN1Ym4obnVtKTtcbiAgICB0aGlzLnNpZ24gPSB0cnVlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gQWRkIHdpdGhvdXQgY2hlY2tzXG4gIHJldHVybiB0aGlzLl9pYWRkbihudW0pO1xufTtcblxuQk4ucHJvdG90eXBlLl9pYWRkbiA9IGZ1bmN0aW9uIF9pYWRkbihudW0pIHtcbiAgdGhpcy53b3Jkc1swXSArPSBudW07XG5cbiAgLy8gQ2FycnlcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aCAmJiB0aGlzLndvcmRzW2ldID49IDB4NDAwMDAwMDsgaSsrKSB7XG4gICAgdGhpcy53b3Jkc1tpXSAtPSAweDQwMDAwMDA7XG4gICAgaWYgKGkgPT09IHRoaXMubGVuZ3RoIC0gMSlcbiAgICAgIHRoaXMud29yZHNbaSArIDFdID0gMTtcbiAgICBlbHNlXG4gICAgICB0aGlzLndvcmRzW2kgKyAxXSsrO1xuICB9XG4gIHRoaXMubGVuZ3RoID0gTWF0aC5tYXgodGhpcy5sZW5ndGgsIGkgKyAxKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIFN1YnRyYWN0IHBsYWluIG51bWJlciBgbnVtYCBmcm9tIGB0aGlzYFxuQk4ucHJvdG90eXBlLmlzdWJuID0gZnVuY3Rpb24gaXN1Ym4obnVtKSB7XG4gIGFzc2VydCh0eXBlb2YgbnVtID09PSAnbnVtYmVyJyk7XG4gIGlmIChudW0gPCAwKVxuICAgIHJldHVybiB0aGlzLmlhZGRuKC1udW0pO1xuXG4gIGlmICh0aGlzLnNpZ24pIHtcbiAgICB0aGlzLnNpZ24gPSBmYWxzZTtcbiAgICB0aGlzLmlhZGRuKG51bSk7XG4gICAgdGhpcy5zaWduID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHRoaXMud29yZHNbMF0gLT0gbnVtO1xuXG4gIC8vIENhcnJ5XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGggJiYgdGhpcy53b3Jkc1tpXSA8IDA7IGkrKykge1xuICAgIHRoaXMud29yZHNbaV0gKz0gMHg0MDAwMDAwO1xuICAgIHRoaXMud29yZHNbaSArIDFdIC09IDE7XG4gIH1cblxuICByZXR1cm4gdGhpcy5zdHJpcCgpO1xufTtcblxuQk4ucHJvdG90eXBlLmFkZG4gPSBmdW5jdGlvbiBhZGRuKG51bSkge1xuICByZXR1cm4gdGhpcy5jbG9uZSgpLmlhZGRuKG51bSk7XG59O1xuXG5CTi5wcm90b3R5cGUuc3VibiA9IGZ1bmN0aW9uIHN1Ym4obnVtKSB7XG4gIHJldHVybiB0aGlzLmNsb25lKCkuaXN1Ym4obnVtKTtcbn07XG5cbkJOLnByb3RvdHlwZS5pYWJzID0gZnVuY3Rpb24gaWFicygpIHtcbiAgdGhpcy5zaWduID0gZmFsc2U7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5CTi5wcm90b3R5cGUuYWJzID0gZnVuY3Rpb24gYWJzKCkge1xuICByZXR1cm4gdGhpcy5jbG9uZSgpLmlhYnMoKTtcbn07XG5cbkJOLnByb3RvdHlwZS5faXNobG5zdWJtdWwgPSBmdW5jdGlvbiBfaXNobG5zdWJtdWwobnVtLCBtdWwsIHNoaWZ0KSB7XG4gIC8vIEJpZ2dlciBzdG9yYWdlIGlzIG5lZWRlZFxuICB2YXIgbGVuID0gbnVtLmxlbmd0aCArIHNoaWZ0O1xuICB2YXIgaTtcbiAgaWYgKHRoaXMud29yZHMubGVuZ3RoIDwgbGVuKSB7XG4gICAgdmFyIHQgPSBuZXcgQXJyYXkobGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspXG4gICAgICB0W2ldID0gdGhpcy53b3Jkc1tpXTtcbiAgICB0aGlzLndvcmRzID0gdDtcbiAgfSBlbHNlIHtcbiAgICBpID0gdGhpcy5sZW5ndGg7XG4gIH1cblxuICAvLyBaZXJvaWZ5IHJlc3RcbiAgdGhpcy5sZW5ndGggPSBNYXRoLm1heCh0aGlzLmxlbmd0aCwgbGVuKTtcbiAgZm9yICg7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKVxuICAgIHRoaXMud29yZHNbaV0gPSAwO1xuXG4gIHZhciBjYXJyeSA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHcgPSB0aGlzLndvcmRzW2kgKyBzaGlmdF0gKyBjYXJyeTtcbiAgICB2YXIgcmlnaHQgPSBudW0ud29yZHNbaV0gKiBtdWw7XG4gICAgdyAtPSByaWdodCAmIDB4M2ZmZmZmZjtcbiAgICBjYXJyeSA9ICh3ID4+IDI2KSAtICgocmlnaHQgLyAweDQwMDAwMDApIHwgMCk7XG4gICAgdGhpcy53b3Jkc1tpICsgc2hpZnRdID0gdyAmIDB4M2ZmZmZmZjtcbiAgfVxuICBmb3IgKDsgaSA8IHRoaXMubGVuZ3RoIC0gc2hpZnQ7IGkrKykge1xuICAgIHZhciB3ID0gdGhpcy53b3Jkc1tpICsgc2hpZnRdICsgY2Fycnk7XG4gICAgY2FycnkgPSB3ID4+IDI2O1xuICAgIHRoaXMud29yZHNbaSArIHNoaWZ0XSA9IHcgJiAweDNmZmZmZmY7XG4gIH1cblxuICBpZiAoY2FycnkgPT09IDApXG4gICAgcmV0dXJuIHRoaXMuc3RyaXAoKTtcblxuICAvLyBTdWJ0cmFjdGlvbiBvdmVyZmxvd1xuICBhc3NlcnQoY2FycnkgPT09IC0xKTtcbiAgY2FycnkgPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgdyA9IC10aGlzLndvcmRzW2ldICsgY2Fycnk7XG4gICAgY2FycnkgPSB3ID4+IDI2O1xuICAgIHRoaXMud29yZHNbaV0gPSB3ICYgMHgzZmZmZmZmO1xuICB9XG4gIHRoaXMuc2lnbiA9IHRydWU7XG5cbiAgcmV0dXJuIHRoaXMuc3RyaXAoKTtcbn07XG5cbkJOLnByb3RvdHlwZS5fd29yZERpdiA9IGZ1bmN0aW9uIF93b3JkRGl2KG51bSwgbW9kZSkge1xuICB2YXIgc2hpZnQgPSB0aGlzLmxlbmd0aCAtIG51bS5sZW5ndGg7XG5cbiAgdmFyIGEgPSB0aGlzLmNsb25lKCk7XG4gIHZhciBiID0gbnVtO1xuXG4gIC8vIE5vcm1hbGl6ZVxuICB2YXIgYmhpID0gYi53b3Jkc1tiLmxlbmd0aCAtIDFdO1xuICB2YXIgYmhpQml0cyA9IHRoaXMuX2NvdW50Qml0cyhiaGkpO1xuICBzaGlmdCA9IDI2IC0gYmhpQml0cztcbiAgaWYgKHNoaWZ0ICE9PSAwKSB7XG4gICAgYiA9IGIuc2hsbihzaGlmdCk7XG4gICAgYS5pc2hsbihzaGlmdCk7XG4gICAgYmhpID0gYi53b3Jkc1tiLmxlbmd0aCAtIDFdO1xuICB9XG5cbiAgLy8gSW5pdGlhbGl6ZSBxdW90aWVudFxuICB2YXIgbSA9IGEubGVuZ3RoIC0gYi5sZW5ndGg7XG4gIHZhciBxO1xuXG4gIGlmIChtb2RlICE9PSAnbW9kJykge1xuICAgIHEgPSBuZXcgQk4obnVsbCk7XG4gICAgcS5sZW5ndGggPSBtICsgMTtcbiAgICBxLndvcmRzID0gbmV3IEFycmF5KHEubGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHEubGVuZ3RoOyBpKyspXG4gICAgICBxLndvcmRzW2ldID0gMDtcbiAgfVxuXG4gIHZhciBkaWZmID0gYS5jbG9uZSgpLl9pc2hsbnN1Ym11bChiLCAxLCBtKTtcbiAgaWYgKCFkaWZmLnNpZ24pIHtcbiAgICBhID0gZGlmZjtcbiAgICBpZiAocSlcbiAgICAgIHEud29yZHNbbV0gPSAxO1xuICB9XG5cbiAgZm9yICh2YXIgaiA9IG0gLSAxOyBqID49IDA7IGotLSkge1xuICAgIHZhciBxaiA9IGEud29yZHNbYi5sZW5ndGggKyBqXSAqIDB4NDAwMDAwMCArIGEud29yZHNbYi5sZW5ndGggKyBqIC0gMV07XG5cbiAgICAvLyBOT1RFOiAocWogLyBiaGkpIGlzICgweDNmZmZmZmYgKiAweDQwMDAwMDAgKyAweDNmZmZmZmYpIC8gMHgyMDAwMDAwIG1heFxuICAgIC8vICgweDdmZmZmZmYpXG4gICAgcWogPSBNYXRoLm1pbigocWogLyBiaGkpIHwgMCwgMHgzZmZmZmZmKTtcblxuICAgIGEuX2lzaGxuc3VibXVsKGIsIHFqLCBqKTtcbiAgICB3aGlsZSAoYS5zaWduKSB7XG4gICAgICBxai0tO1xuICAgICAgYS5zaWduID0gZmFsc2U7XG4gICAgICBhLl9pc2hsbnN1Ym11bChiLCAxLCBqKTtcbiAgICAgIGlmIChhLmNtcG4oMCkgIT09IDApXG4gICAgICAgIGEuc2lnbiA9ICFhLnNpZ247XG4gICAgfVxuICAgIGlmIChxKVxuICAgICAgcS53b3Jkc1tqXSA9IHFqO1xuICB9XG4gIGlmIChxKVxuICAgIHEuc3RyaXAoKTtcbiAgYS5zdHJpcCgpO1xuXG4gIC8vIERlbm9ybWFsaXplXG4gIGlmIChtb2RlICE9PSAnZGl2JyAmJiBzaGlmdCAhPT0gMClcbiAgICBhLmlzaHJuKHNoaWZ0KTtcbiAgcmV0dXJuIHsgZGl2OiBxID8gcSA6IG51bGwsIG1vZDogYSB9O1xufTtcblxuQk4ucHJvdG90eXBlLmRpdm1vZCA9IGZ1bmN0aW9uIGRpdm1vZChudW0sIG1vZGUpIHtcbiAgYXNzZXJ0KG51bS5jbXBuKDApICE9PSAwKTtcblxuICBpZiAodGhpcy5zaWduICYmICFudW0uc2lnbikge1xuICAgIHZhciByZXMgPSB0aGlzLm5lZygpLmRpdm1vZChudW0sIG1vZGUpO1xuICAgIHZhciBkaXY7XG4gICAgdmFyIG1vZDtcbiAgICBpZiAobW9kZSAhPT0gJ21vZCcpXG4gICAgICBkaXYgPSByZXMuZGl2Lm5lZygpO1xuICAgIGlmIChtb2RlICE9PSAnZGl2JylcbiAgICAgIG1vZCA9IHJlcy5tb2QuY21wbigwKSA9PT0gMCA/IHJlcy5tb2QgOiBudW0uc3ViKHJlcy5tb2QpO1xuICAgIHJldHVybiB7XG4gICAgICBkaXY6IGRpdixcbiAgICAgIG1vZDogbW9kXG4gICAgfTtcbiAgfSBlbHNlIGlmICghdGhpcy5zaWduICYmIG51bS5zaWduKSB7XG4gICAgdmFyIHJlcyA9IHRoaXMuZGl2bW9kKG51bS5uZWcoKSwgbW9kZSk7XG4gICAgdmFyIGRpdjtcbiAgICBpZiAobW9kZSAhPT0gJ21vZCcpXG4gICAgICBkaXYgPSByZXMuZGl2Lm5lZygpO1xuICAgIHJldHVybiB7IGRpdjogZGl2LCBtb2Q6IHJlcy5tb2QgfTtcbiAgfSBlbHNlIGlmICh0aGlzLnNpZ24gJiYgbnVtLnNpZ24pIHtcbiAgICByZXR1cm4gdGhpcy5uZWcoKS5kaXZtb2QobnVtLm5lZygpLCBtb2RlKTtcbiAgfVxuXG4gIC8vIEJvdGggbnVtYmVycyBhcmUgcG9zaXRpdmUgYXQgdGhpcyBwb2ludFxuXG4gIC8vIFN0cmlwIGJvdGggbnVtYmVycyB0byBhcHByb3hpbWF0ZSBzaGlmdCB2YWx1ZVxuICBpZiAobnVtLmxlbmd0aCA+IHRoaXMubGVuZ3RoIHx8IHRoaXMuY21wKG51bSkgPCAwKVxuICAgIHJldHVybiB7IGRpdjogbmV3IEJOKDApLCBtb2Q6IHRoaXMgfTtcblxuICAvLyBWZXJ5IHNob3J0IHJlZHVjdGlvblxuICBpZiAobnVtLmxlbmd0aCA9PT0gMSkge1xuICAgIGlmIChtb2RlID09PSAnZGl2JylcbiAgICAgIHJldHVybiB7IGRpdjogdGhpcy5kaXZuKG51bS53b3Jkc1swXSksIG1vZDogbnVsbCB9O1xuICAgIGVsc2UgaWYgKG1vZGUgPT09ICdtb2QnKVxuICAgICAgcmV0dXJuIHsgZGl2OiBudWxsLCBtb2Q6IG5ldyBCTih0aGlzLm1vZG4obnVtLndvcmRzWzBdKSkgfTtcbiAgICByZXR1cm4ge1xuICAgICAgZGl2OiB0aGlzLmRpdm4obnVtLndvcmRzWzBdKSxcbiAgICAgIG1vZDogbmV3IEJOKHRoaXMubW9kbihudW0ud29yZHNbMF0pKVxuICAgIH07XG4gIH1cblxuICByZXR1cm4gdGhpcy5fd29yZERpdihudW0sIG1vZGUpO1xufTtcblxuLy8gRmluZCBgdGhpc2AgLyBgbnVtYFxuQk4ucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uIGRpdihudW0pIHtcbiAgcmV0dXJuIHRoaXMuZGl2bW9kKG51bSwgJ2RpdicpLmRpdjtcbn07XG5cbi8vIEZpbmQgYHRoaXNgICUgYG51bWBcbkJOLnByb3RvdHlwZS5tb2QgPSBmdW5jdGlvbiBtb2QobnVtKSB7XG4gIHJldHVybiB0aGlzLmRpdm1vZChudW0sICdtb2QnKS5tb2Q7XG59O1xuXG4vLyBGaW5kIFJvdW5kKGB0aGlzYCAvIGBudW1gKVxuQk4ucHJvdG90eXBlLmRpdlJvdW5kID0gZnVuY3Rpb24gZGl2Um91bmQobnVtKSB7XG4gIHZhciBkbSA9IHRoaXMuZGl2bW9kKG51bSk7XG5cbiAgLy8gRmFzdCBjYXNlIC0gZXhhY3QgZGl2aXNpb25cbiAgaWYgKGRtLm1vZC5jbXBuKDApID09PSAwKVxuICAgIHJldHVybiBkbS5kaXY7XG5cbiAgdmFyIG1vZCA9IGRtLmRpdi5zaWduID8gZG0ubW9kLmlzdWIobnVtKSA6IGRtLm1vZDtcblxuICB2YXIgaGFsZiA9IG51bS5zaHJuKDEpO1xuICB2YXIgcjIgPSBudW0uYW5kbG4oMSk7XG4gIHZhciBjbXAgPSBtb2QuY21wKGhhbGYpO1xuXG4gIC8vIFJvdW5kIGRvd25cbiAgaWYgKGNtcCA8IDAgfHwgcjIgPT09IDEgJiYgY21wID09PSAwKVxuICAgIHJldHVybiBkbS5kaXY7XG5cbiAgLy8gUm91bmQgdXBcbiAgcmV0dXJuIGRtLmRpdi5zaWduID8gZG0uZGl2LmlzdWJuKDEpIDogZG0uZGl2LmlhZGRuKDEpO1xufTtcblxuQk4ucHJvdG90eXBlLm1vZG4gPSBmdW5jdGlvbiBtb2RuKG51bSkge1xuICBhc3NlcnQobnVtIDw9IDB4M2ZmZmZmZik7XG4gIHZhciBwID0gKDEgPDwgMjYpICUgbnVtO1xuXG4gIHZhciBhY2MgPSAwO1xuICBmb3IgKHZhciBpID0gdGhpcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSlcbiAgICBhY2MgPSAocCAqIGFjYyArIHRoaXMud29yZHNbaV0pICUgbnVtO1xuXG4gIHJldHVybiBhY2M7XG59O1xuXG4vLyBJbi1wbGFjZSBkaXZpc2lvbiBieSBudW1iZXJcbkJOLnByb3RvdHlwZS5pZGl2biA9IGZ1bmN0aW9uIGlkaXZuKG51bSkge1xuICBhc3NlcnQobnVtIDw9IDB4M2ZmZmZmZik7XG5cbiAgdmFyIGNhcnJ5ID0gMDtcbiAgZm9yICh2YXIgaSA9IHRoaXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgdyA9IHRoaXMud29yZHNbaV0gKyBjYXJyeSAqIDB4NDAwMDAwMDtcbiAgICB0aGlzLndvcmRzW2ldID0gKHcgLyBudW0pIHwgMDtcbiAgICBjYXJyeSA9IHcgJSBudW07XG4gIH1cblxuICByZXR1cm4gdGhpcy5zdHJpcCgpO1xufTtcblxuQk4ucHJvdG90eXBlLmRpdm4gPSBmdW5jdGlvbiBkaXZuKG51bSkge1xuICByZXR1cm4gdGhpcy5jbG9uZSgpLmlkaXZuKG51bSk7XG59O1xuXG5CTi5wcm90b3R5cGUuZWdjZCA9IGZ1bmN0aW9uIGVnY2QocCkge1xuICBhc3NlcnQoIXAuc2lnbik7XG4gIGFzc2VydChwLmNtcG4oMCkgIT09IDApO1xuXG4gIHZhciB4ID0gdGhpcztcbiAgdmFyIHkgPSBwLmNsb25lKCk7XG5cbiAgaWYgKHguc2lnbilcbiAgICB4ID0geC5tb2QocCk7XG4gIGVsc2VcbiAgICB4ID0geC5jbG9uZSgpO1xuXG4gIC8vIEEgKiB4ICsgQiAqIHkgPSB4XG4gIHZhciBBID0gbmV3IEJOKDEpO1xuICB2YXIgQiA9IG5ldyBCTigwKTtcblxuICAvLyBDICogeCArIEQgKiB5ID0geVxuICB2YXIgQyA9IG5ldyBCTigwKTtcbiAgdmFyIEQgPSBuZXcgQk4oMSk7XG5cbiAgdmFyIGcgPSAwO1xuXG4gIHdoaWxlICh4LmlzRXZlbigpICYmIHkuaXNFdmVuKCkpIHtcbiAgICB4LmlzaHJuKDEpO1xuICAgIHkuaXNocm4oMSk7XG4gICAgKytnO1xuICB9XG5cbiAgdmFyIHlwID0geS5jbG9uZSgpO1xuICB2YXIgeHAgPSB4LmNsb25lKCk7XG5cbiAgd2hpbGUgKHguY21wbigwKSAhPT0gMCkge1xuICAgIHdoaWxlICh4LmlzRXZlbigpKSB7XG4gICAgICB4LmlzaHJuKDEpO1xuICAgICAgaWYgKEEuaXNFdmVuKCkgJiYgQi5pc0V2ZW4oKSkge1xuICAgICAgICBBLmlzaHJuKDEpO1xuICAgICAgICBCLmlzaHJuKDEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgQS5pYWRkKHlwKS5pc2hybigxKTtcbiAgICAgICAgQi5pc3ViKHhwKS5pc2hybigxKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB3aGlsZSAoeS5pc0V2ZW4oKSkge1xuICAgICAgeS5pc2hybigxKTtcbiAgICAgIGlmIChDLmlzRXZlbigpICYmIEQuaXNFdmVuKCkpIHtcbiAgICAgICAgQy5pc2hybigxKTtcbiAgICAgICAgRC5pc2hybigxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIEMuaWFkZCh5cCkuaXNocm4oMSk7XG4gICAgICAgIEQuaXN1Yih4cCkuaXNocm4oMSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHguY21wKHkpID49IDApIHtcbiAgICAgIHguaXN1Yih5KTtcbiAgICAgIEEuaXN1YihDKTtcbiAgICAgIEIuaXN1YihEKTtcbiAgICB9IGVsc2Uge1xuICAgICAgeS5pc3ViKHgpO1xuICAgICAgQy5pc3ViKEEpO1xuICAgICAgRC5pc3ViKEIpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYTogQyxcbiAgICBiOiBELFxuICAgIGdjZDogeS5pc2hsbihnKVxuICB9O1xufTtcblxuLy8gVGhpcyBpcyByZWR1Y2VkIGluY2FybmF0aW9uIG9mIHRoZSBiaW5hcnkgRUVBXG4vLyBhYm92ZSwgZGVzaWduYXRlZCB0byBpbnZlcnQgbWVtYmVycyBvZiB0aGVcbi8vIF9wcmltZV8gZmllbGRzIEYocCkgYXQgYSBtYXhpbWFsIHNwZWVkXG5CTi5wcm90b3R5cGUuX2ludm1wID0gZnVuY3Rpb24gX2ludm1wKHApIHtcbiAgYXNzZXJ0KCFwLnNpZ24pO1xuICBhc3NlcnQocC5jbXBuKDApICE9PSAwKTtcblxuICB2YXIgYSA9IHRoaXM7XG4gIHZhciBiID0gcC5jbG9uZSgpO1xuXG4gIGlmIChhLnNpZ24pXG4gICAgYSA9IGEubW9kKHApO1xuICBlbHNlXG4gICAgYSA9IGEuY2xvbmUoKTtcblxuICB2YXIgeDEgPSBuZXcgQk4oMSk7XG4gIHZhciB4MiA9IG5ldyBCTigwKTtcblxuICB2YXIgZGVsdGEgPSBiLmNsb25lKCk7XG5cbiAgd2hpbGUgKGEuY21wbigxKSA+IDAgJiYgYi5jbXBuKDEpID4gMCkge1xuICAgIHdoaWxlIChhLmlzRXZlbigpKSB7XG4gICAgICBhLmlzaHJuKDEpO1xuICAgICAgaWYgKHgxLmlzRXZlbigpKVxuICAgICAgICB4MS5pc2hybigxKTtcbiAgICAgIGVsc2VcbiAgICAgICAgeDEuaWFkZChkZWx0YSkuaXNocm4oMSk7XG4gICAgfVxuICAgIHdoaWxlIChiLmlzRXZlbigpKSB7XG4gICAgICBiLmlzaHJuKDEpO1xuICAgICAgaWYgKHgyLmlzRXZlbigpKVxuICAgICAgICB4Mi5pc2hybigxKTtcbiAgICAgIGVsc2VcbiAgICAgICAgeDIuaWFkZChkZWx0YSkuaXNocm4oMSk7XG4gICAgfVxuICAgIGlmIChhLmNtcChiKSA+PSAwKSB7XG4gICAgICBhLmlzdWIoYik7XG4gICAgICB4MS5pc3ViKHgyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYi5pc3ViKGEpO1xuICAgICAgeDIuaXN1Yih4MSk7XG4gICAgfVxuICB9XG4gIGlmIChhLmNtcG4oMSkgPT09IDApXG4gICAgcmV0dXJuIHgxO1xuICBlbHNlXG4gICAgcmV0dXJuIHgyO1xufTtcblxuQk4ucHJvdG90eXBlLmdjZCA9IGZ1bmN0aW9uIGdjZChudW0pIHtcbiAgaWYgKHRoaXMuY21wbigwKSA9PT0gMClcbiAgICByZXR1cm4gbnVtLmNsb25lKCk7XG4gIGlmIChudW0uY21wbigwKSA9PT0gMClcbiAgICByZXR1cm4gdGhpcy5jbG9uZSgpO1xuXG4gIHZhciBhID0gdGhpcy5jbG9uZSgpO1xuICB2YXIgYiA9IG51bS5jbG9uZSgpO1xuICBhLnNpZ24gPSBmYWxzZTtcbiAgYi5zaWduID0gZmFsc2U7XG5cbiAgLy8gUmVtb3ZlIGNvbW1vbiBmYWN0b3Igb2YgdHdvXG4gIGZvciAodmFyIHNoaWZ0ID0gMDsgYS5pc0V2ZW4oKSAmJiBiLmlzRXZlbigpOyBzaGlmdCsrKSB7XG4gICAgYS5pc2hybigxKTtcbiAgICBiLmlzaHJuKDEpO1xuICB9XG5cbiAgZG8ge1xuICAgIHdoaWxlIChhLmlzRXZlbigpKVxuICAgICAgYS5pc2hybigxKTtcbiAgICB3aGlsZSAoYi5pc0V2ZW4oKSlcbiAgICAgIGIuaXNocm4oMSk7XG5cbiAgICB2YXIgciA9IGEuY21wKGIpO1xuICAgIGlmIChyIDwgMCkge1xuICAgICAgLy8gU3dhcCBgYWAgYW5kIGBiYCB0byBtYWtlIGBhYCBhbHdheXMgYmlnZ2VyIHRoYW4gYGJgXG4gICAgICB2YXIgdCA9IGE7XG4gICAgICBhID0gYjtcbiAgICAgIGIgPSB0O1xuICAgIH0gZWxzZSBpZiAociA9PT0gMCB8fCBiLmNtcG4oMSkgPT09IDApIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGEuaXN1YihiKTtcbiAgfSB3aGlsZSAodHJ1ZSk7XG5cbiAgcmV0dXJuIGIuaXNobG4oc2hpZnQpO1xufTtcblxuLy8gSW52ZXJ0IG51bWJlciBpbiB0aGUgZmllbGQgRihudW0pXG5CTi5wcm90b3R5cGUuaW52bSA9IGZ1bmN0aW9uIGludm0obnVtKSB7XG4gIHJldHVybiB0aGlzLmVnY2QobnVtKS5hLm1vZChudW0pO1xufTtcblxuQk4ucHJvdG90eXBlLmlzRXZlbiA9IGZ1bmN0aW9uIGlzRXZlbigpIHtcbiAgcmV0dXJuICh0aGlzLndvcmRzWzBdICYgMSkgPT09IDA7XG59O1xuXG5CTi5wcm90b3R5cGUuaXNPZGQgPSBmdW5jdGlvbiBpc09kZCgpIHtcbiAgcmV0dXJuICh0aGlzLndvcmRzWzBdICYgMSkgPT09IDE7XG59O1xuXG4vLyBBbmQgZmlyc3Qgd29yZCBhbmQgbnVtXG5CTi5wcm90b3R5cGUuYW5kbG4gPSBmdW5jdGlvbiBhbmRsbihudW0pIHtcbiAgcmV0dXJuIHRoaXMud29yZHNbMF0gJiBudW07XG59O1xuXG4vLyBJbmNyZW1lbnQgYXQgdGhlIGJpdCBwb3NpdGlvbiBpbi1saW5lXG5CTi5wcm90b3R5cGUuYmluY24gPSBmdW5jdGlvbiBiaW5jbihiaXQpIHtcbiAgYXNzZXJ0KHR5cGVvZiBiaXQgPT09ICdudW1iZXInKTtcbiAgdmFyIHIgPSBiaXQgJSAyNjtcbiAgdmFyIHMgPSAoYml0IC0gcikgLyAyNjtcbiAgdmFyIHEgPSAxIDw8IHI7XG5cbiAgLy8gRmFzdCBjYXNlOiBiaXQgaXMgbXVjaCBoaWdoZXIgdGhhbiBhbGwgZXhpc3Rpbmcgd29yZHNcbiAgaWYgKHRoaXMubGVuZ3RoIDw9IHMpIHtcbiAgICBmb3IgKHZhciBpID0gdGhpcy5sZW5ndGg7IGkgPCBzICsgMTsgaSsrKVxuICAgICAgdGhpcy53b3Jkc1tpXSA9IDA7XG4gICAgdGhpcy53b3Jkc1tzXSB8PSBxO1xuICAgIHRoaXMubGVuZ3RoID0gcyArIDE7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBBZGQgYml0IGFuZCBwcm9wYWdhdGUsIGlmIG5lZWRlZFxuICB2YXIgY2FycnkgPSBxO1xuICBmb3IgKHZhciBpID0gczsgY2FycnkgIT09IDAgJiYgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgdyA9IHRoaXMud29yZHNbaV07XG4gICAgdyArPSBjYXJyeTtcbiAgICBjYXJyeSA9IHcgPj4+IDI2O1xuICAgIHcgJj0gMHgzZmZmZmZmO1xuICAgIHRoaXMud29yZHNbaV0gPSB3O1xuICB9XG4gIGlmIChjYXJyeSAhPT0gMCkge1xuICAgIHRoaXMud29yZHNbaV0gPSBjYXJyeTtcbiAgICB0aGlzLmxlbmd0aCsrO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuQk4ucHJvdG90eXBlLmNtcG4gPSBmdW5jdGlvbiBjbXBuKG51bSkge1xuICB2YXIgc2lnbiA9IG51bSA8IDA7XG4gIGlmIChzaWduKVxuICAgIG51bSA9IC1udW07XG5cbiAgaWYgKHRoaXMuc2lnbiAmJiAhc2lnbilcbiAgICByZXR1cm4gLTE7XG4gIGVsc2UgaWYgKCF0aGlzLnNpZ24gJiYgc2lnbilcbiAgICByZXR1cm4gMTtcblxuICBudW0gJj0gMHgzZmZmZmZmO1xuICB0aGlzLnN0cmlwKCk7XG5cbiAgdmFyIHJlcztcbiAgaWYgKHRoaXMubGVuZ3RoID4gMSkge1xuICAgIHJlcyA9IDE7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHcgPSB0aGlzLndvcmRzWzBdO1xuICAgIHJlcyA9IHcgPT09IG51bSA/IDAgOiB3IDwgbnVtID8gLTEgOiAxO1xuICB9XG4gIGlmICh0aGlzLnNpZ24pXG4gICAgcmVzID0gLXJlcztcbiAgcmV0dXJuIHJlcztcbn07XG5cbi8vIENvbXBhcmUgdHdvIG51bWJlcnMgYW5kIHJldHVybjpcbi8vIDEgLSBpZiBgdGhpc2AgPiBgbnVtYFxuLy8gMCAtIGlmIGB0aGlzYCA9PSBgbnVtYFxuLy8gLTEgLSBpZiBgdGhpc2AgPCBgbnVtYFxuQk4ucHJvdG90eXBlLmNtcCA9IGZ1bmN0aW9uIGNtcChudW0pIHtcbiAgaWYgKHRoaXMuc2lnbiAmJiAhbnVtLnNpZ24pXG4gICAgcmV0dXJuIC0xO1xuICBlbHNlIGlmICghdGhpcy5zaWduICYmIG51bS5zaWduKVxuICAgIHJldHVybiAxO1xuXG4gIHZhciByZXMgPSB0aGlzLnVjbXAobnVtKTtcbiAgaWYgKHRoaXMuc2lnbilcbiAgICByZXR1cm4gLXJlcztcbiAgZWxzZVxuICAgIHJldHVybiByZXM7XG59O1xuXG4vLyBVbnNpZ25lZCBjb21wYXJpc29uXG5CTi5wcm90b3R5cGUudWNtcCA9IGZ1bmN0aW9uIHVjbXAobnVtKSB7XG4gIC8vIEF0IHRoaXMgcG9pbnQgYm90aCBudW1iZXJzIGhhdmUgdGhlIHNhbWUgc2lnblxuICBpZiAodGhpcy5sZW5ndGggPiBudW0ubGVuZ3RoKVxuICAgIHJldHVybiAxO1xuICBlbHNlIGlmICh0aGlzLmxlbmd0aCA8IG51bS5sZW5ndGgpXG4gICAgcmV0dXJuIC0xO1xuXG4gIHZhciByZXMgPSAwO1xuICBmb3IgKHZhciBpID0gdGhpcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBhID0gdGhpcy53b3Jkc1tpXTtcbiAgICB2YXIgYiA9IG51bS53b3Jkc1tpXTtcblxuICAgIGlmIChhID09PSBiKVxuICAgICAgY29udGludWU7XG4gICAgaWYgKGEgPCBiKVxuICAgICAgcmVzID0gLTE7XG4gICAgZWxzZSBpZiAoYSA+IGIpXG4gICAgICByZXMgPSAxO1xuICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuXG4vL1xuLy8gQSByZWR1Y2UgY29udGV4dCwgY291bGQgYmUgdXNpbmcgbW9udGdvbWVyeSBvciBzb21ldGhpbmcgYmV0dGVyLCBkZXBlbmRpbmdcbi8vIG9uIHRoZSBgbWAgaXRzZWxmLlxuLy9cbkJOLnJlZCA9IGZ1bmN0aW9uIHJlZChudW0pIHtcbiAgcmV0dXJuIG5ldyBSZWQobnVtKTtcbn07XG5cbkJOLnByb3RvdHlwZS50b1JlZCA9IGZ1bmN0aW9uIHRvUmVkKGN0eCkge1xuICBhc3NlcnQoIXRoaXMucmVkLCAnQWxyZWFkeSBhIG51bWJlciBpbiByZWR1Y3Rpb24gY29udGV4dCcpO1xuICBhc3NlcnQoIXRoaXMuc2lnbiwgJ3JlZCB3b3JrcyBvbmx5IHdpdGggcG9zaXRpdmVzJyk7XG4gIHJldHVybiBjdHguY29udmVydFRvKHRoaXMpLl9mb3JjZVJlZChjdHgpO1xufTtcblxuQk4ucHJvdG90eXBlLmZyb21SZWQgPSBmdW5jdGlvbiBmcm9tUmVkKCkge1xuICBhc3NlcnQodGhpcy5yZWQsICdmcm9tUmVkIHdvcmtzIG9ubHkgd2l0aCBudW1iZXJzIGluIHJlZHVjdGlvbiBjb250ZXh0Jyk7XG4gIHJldHVybiB0aGlzLnJlZC5jb252ZXJ0RnJvbSh0aGlzKTtcbn07XG5cbkJOLnByb3RvdHlwZS5fZm9yY2VSZWQgPSBmdW5jdGlvbiBfZm9yY2VSZWQoY3R4KSB7XG4gIHRoaXMucmVkID0gY3R4O1xuICByZXR1cm4gdGhpcztcbn07XG5cbkJOLnByb3RvdHlwZS5mb3JjZVJlZCA9IGZ1bmN0aW9uIGZvcmNlUmVkKGN0eCkge1xuICBhc3NlcnQoIXRoaXMucmVkLCAnQWxyZWFkeSBhIG51bWJlciBpbiByZWR1Y3Rpb24gY29udGV4dCcpO1xuICByZXR1cm4gdGhpcy5fZm9yY2VSZWQoY3R4KTtcbn07XG5cbkJOLnByb3RvdHlwZS5yZWRBZGQgPSBmdW5jdGlvbiByZWRBZGQobnVtKSB7XG4gIGFzc2VydCh0aGlzLnJlZCwgJ3JlZEFkZCB3b3JrcyBvbmx5IHdpdGggcmVkIG51bWJlcnMnKTtcbiAgcmV0dXJuIHRoaXMucmVkLmFkZCh0aGlzLCBudW0pO1xufTtcblxuQk4ucHJvdG90eXBlLnJlZElBZGQgPSBmdW5jdGlvbiByZWRJQWRkKG51bSkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWRJQWRkIHdvcmtzIG9ubHkgd2l0aCByZWQgbnVtYmVycycpO1xuICByZXR1cm4gdGhpcy5yZWQuaWFkZCh0aGlzLCBudW0pO1xufTtcblxuQk4ucHJvdG90eXBlLnJlZFN1YiA9IGZ1bmN0aW9uIHJlZFN1YihudW0pIHtcbiAgYXNzZXJ0KHRoaXMucmVkLCAncmVkU3ViIHdvcmtzIG9ubHkgd2l0aCByZWQgbnVtYmVycycpO1xuICByZXR1cm4gdGhpcy5yZWQuc3ViKHRoaXMsIG51bSk7XG59O1xuXG5CTi5wcm90b3R5cGUucmVkSVN1YiA9IGZ1bmN0aW9uIHJlZElTdWIobnVtKSB7XG4gIGFzc2VydCh0aGlzLnJlZCwgJ3JlZElTdWIgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG4gIHJldHVybiB0aGlzLnJlZC5pc3ViKHRoaXMsIG51bSk7XG59O1xuXG5CTi5wcm90b3R5cGUucmVkU2hsID0gZnVuY3Rpb24gcmVkU2hsKG51bSkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWRTaGwgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG4gIHJldHVybiB0aGlzLnJlZC5zaGwodGhpcywgbnVtKTtcbn07XG5cbkJOLnByb3RvdHlwZS5yZWRNdWwgPSBmdW5jdGlvbiByZWRNdWwobnVtKSB7XG4gIGFzc2VydCh0aGlzLnJlZCwgJ3JlZE11bCB3b3JrcyBvbmx5IHdpdGggcmVkIG51bWJlcnMnKTtcbiAgdGhpcy5yZWQuX3ZlcmlmeTIodGhpcywgbnVtKTtcbiAgcmV0dXJuIHRoaXMucmVkLm11bCh0aGlzLCBudW0pO1xufTtcblxuQk4ucHJvdG90eXBlLnJlZElNdWwgPSBmdW5jdGlvbiByZWRJTXVsKG51bSkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWRNdWwgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG4gIHRoaXMucmVkLl92ZXJpZnkyKHRoaXMsIG51bSk7XG4gIHJldHVybiB0aGlzLnJlZC5pbXVsKHRoaXMsIG51bSk7XG59O1xuXG5CTi5wcm90b3R5cGUucmVkU3FyID0gZnVuY3Rpb24gcmVkU3FyKCkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWRTcXIgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG4gIHRoaXMucmVkLl92ZXJpZnkxKHRoaXMpO1xuICByZXR1cm4gdGhpcy5yZWQuc3FyKHRoaXMpO1xufTtcblxuQk4ucHJvdG90eXBlLnJlZElTcXIgPSBmdW5jdGlvbiByZWRJU3FyKCkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWRJU3FyIHdvcmtzIG9ubHkgd2l0aCByZWQgbnVtYmVycycpO1xuICB0aGlzLnJlZC5fdmVyaWZ5MSh0aGlzKTtcbiAgcmV0dXJuIHRoaXMucmVkLmlzcXIodGhpcyk7XG59O1xuXG4vLyBTcXVhcmUgcm9vdCBvdmVyIHBcbkJOLnByb3RvdHlwZS5yZWRTcXJ0ID0gZnVuY3Rpb24gcmVkU3FydCgpIHtcbiAgYXNzZXJ0KHRoaXMucmVkLCAncmVkU3FydCB3b3JrcyBvbmx5IHdpdGggcmVkIG51bWJlcnMnKTtcbiAgdGhpcy5yZWQuX3ZlcmlmeTEodGhpcyk7XG4gIHJldHVybiB0aGlzLnJlZC5zcXJ0KHRoaXMpO1xufTtcblxuQk4ucHJvdG90eXBlLnJlZEludm0gPSBmdW5jdGlvbiByZWRJbnZtKCkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWRJbnZtIHdvcmtzIG9ubHkgd2l0aCByZWQgbnVtYmVycycpO1xuICB0aGlzLnJlZC5fdmVyaWZ5MSh0aGlzKTtcbiAgcmV0dXJuIHRoaXMucmVkLmludm0odGhpcyk7XG59O1xuXG4vLyBSZXR1cm4gbmVnYXRpdmUgY2xvbmUgb2YgYHRoaXNgICUgYHJlZCBtb2R1bG9gXG5CTi5wcm90b3R5cGUucmVkTmVnID0gZnVuY3Rpb24gcmVkTmVnKCkge1xuICBhc3NlcnQodGhpcy5yZWQsICdyZWROZWcgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG4gIHRoaXMucmVkLl92ZXJpZnkxKHRoaXMpO1xuICByZXR1cm4gdGhpcy5yZWQubmVnKHRoaXMpO1xufTtcblxuQk4ucHJvdG90eXBlLnJlZFBvdyA9IGZ1bmN0aW9uIHJlZFBvdyhudW0pIHtcbiAgYXNzZXJ0KHRoaXMucmVkICYmICFudW0ucmVkLCAncmVkUG93KG5vcm1hbE51bSknKTtcbiAgdGhpcy5yZWQuX3ZlcmlmeTEodGhpcyk7XG4gIHJldHVybiB0aGlzLnJlZC5wb3codGhpcywgbnVtKTtcbn07XG5cbi8vIFByaW1lIG51bWJlcnMgd2l0aCBlZmZpY2llbnQgcmVkdWN0aW9uXG52YXIgcHJpbWVzID0ge1xuICBrMjU2OiBudWxsLFxuICBwMjI0OiBudWxsLFxuICBwMTkyOiBudWxsLFxuICBwMjU1MTk6IG51bGxcbn07XG5cbi8vIFBzZXVkby1NZXJzZW5uZSBwcmltZVxuZnVuY3Rpb24gTVByaW1lKG5hbWUsIHApIHtcbiAgLy8gUCA9IDIgXiBOIC0gS1xuICB0aGlzLm5hbWUgPSBuYW1lO1xuICB0aGlzLnAgPSBuZXcgQk4ocCwgMTYpO1xuICB0aGlzLm4gPSB0aGlzLnAuYml0TGVuZ3RoKCk7XG4gIHRoaXMuayA9IG5ldyBCTigxKS5pc2hsbih0aGlzLm4pLmlzdWIodGhpcy5wKTtcblxuICB0aGlzLnRtcCA9IHRoaXMuX3RtcCgpO1xufVxuXG5NUHJpbWUucHJvdG90eXBlLl90bXAgPSBmdW5jdGlvbiBfdG1wKCkge1xuICB2YXIgdG1wID0gbmV3IEJOKG51bGwpO1xuICB0bXAud29yZHMgPSBuZXcgQXJyYXkoTWF0aC5jZWlsKHRoaXMubiAvIDEzKSk7XG4gIHJldHVybiB0bXA7XG59O1xuXG5NUHJpbWUucHJvdG90eXBlLmlyZWR1Y2UgPSBmdW5jdGlvbiBpcmVkdWNlKG51bSkge1xuICAvLyBBc3N1bWVzIHRoYXQgYG51bWAgaXMgbGVzcyB0aGFuIGBQXjJgXG4gIC8vIG51bSA9IEhJICogKDIgXiBOIC0gSykgKyBISSAqIEsgKyBMTyA9IEhJICogSyArIExPIChtb2QgUClcbiAgdmFyIHIgPSBudW07XG4gIHZhciBybGVuO1xuXG4gIGRvIHtcbiAgICB0aGlzLnNwbGl0KHIsIHRoaXMudG1wKTtcbiAgICByID0gdGhpcy5pbXVsSyhyKTtcbiAgICByID0gci5pYWRkKHRoaXMudG1wKTtcbiAgICBybGVuID0gci5iaXRMZW5ndGgoKTtcbiAgfSB3aGlsZSAocmxlbiA+IHRoaXMubik7XG5cbiAgdmFyIGNtcCA9IHJsZW4gPCB0aGlzLm4gPyAtMSA6IHIudWNtcCh0aGlzLnApO1xuICBpZiAoY21wID09PSAwKSB7XG4gICAgci53b3Jkc1swXSA9IDA7XG4gICAgci5sZW5ndGggPSAxO1xuICB9IGVsc2UgaWYgKGNtcCA+IDApIHtcbiAgICByLmlzdWIodGhpcy5wKTtcbiAgfSBlbHNlIHtcbiAgICByLnN0cmlwKCk7XG4gIH1cblxuICByZXR1cm4gcjtcbn07XG5cbk1QcmltZS5wcm90b3R5cGUuc3BsaXQgPSBmdW5jdGlvbiBzcGxpdChpbnB1dCwgb3V0KSB7XG4gIGlucHV0LmlzaHJuKHRoaXMubiwgMCwgb3V0KTtcbn07XG5cbk1QcmltZS5wcm90b3R5cGUuaW11bEsgPSBmdW5jdGlvbiBpbXVsSyhudW0pIHtcbiAgcmV0dXJuIG51bS5pbXVsKHRoaXMuayk7XG59O1xuXG5mdW5jdGlvbiBLMjU2KCkge1xuICBNUHJpbWUuY2FsbChcbiAgICB0aGlzLFxuICAgICdrMjU2JyxcbiAgICAnZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmUgZmZmZmZjMmYnKTtcbn1cbmluaGVyaXRzKEsyNTYsIE1QcmltZSk7XG5cbksyNTYucHJvdG90eXBlLnNwbGl0ID0gZnVuY3Rpb24gc3BsaXQoaW5wdXQsIG91dHB1dCkge1xuICAvLyAyNTYgPSA5ICogMjYgKyAyMlxuICB2YXIgbWFzayA9IDB4M2ZmZmZmO1xuXG4gIHZhciBvdXRMZW4gPSBNYXRoLm1pbihpbnB1dC5sZW5ndGgsIDkpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG91dExlbjsgaSsrKVxuICAgIG91dHB1dC53b3Jkc1tpXSA9IGlucHV0LndvcmRzW2ldO1xuICBvdXRwdXQubGVuZ3RoID0gb3V0TGVuO1xuXG4gIGlmIChpbnB1dC5sZW5ndGggPD0gOSkge1xuICAgIGlucHV0LndvcmRzWzBdID0gMDtcbiAgICBpbnB1dC5sZW5ndGggPSAxO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIFNoaWZ0IGJ5IDkgbGltYnNcbiAgdmFyIHByZXYgPSBpbnB1dC53b3Jkc1s5XTtcbiAgb3V0cHV0LndvcmRzW291dHB1dC5sZW5ndGgrK10gPSBwcmV2ICYgbWFzaztcblxuICBmb3IgKHZhciBpID0gMTA7IGkgPCBpbnB1dC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBuZXh0ID0gaW5wdXQud29yZHNbaV07XG4gICAgaW5wdXQud29yZHNbaSAtIDEwXSA9ICgobmV4dCAmIG1hc2spIDw8IDQpIHwgKHByZXYgPj4+IDIyKTtcbiAgICBwcmV2ID0gbmV4dDtcbiAgfVxuICBpbnB1dC53b3Jkc1tpIC0gMTBdID0gcHJldiA+Pj4gMjI7XG4gIGlucHV0Lmxlbmd0aCAtPSA5O1xufTtcblxuSzI1Ni5wcm90b3R5cGUuaW11bEsgPSBmdW5jdGlvbiBpbXVsSyhudW0pIHtcbiAgLy8gSyA9IDB4MTAwMDAwM2QxID0gWyAweDQwLCAweDNkMSBdXG4gIG51bS53b3Jkc1tudW0ubGVuZ3RoXSA9IDA7XG4gIG51bS53b3Jkc1tudW0ubGVuZ3RoICsgMV0gPSAwO1xuICBudW0ubGVuZ3RoICs9IDI7XG5cbiAgLy8gYm91bmRlZCBhdDogMHg0MCAqIDB4M2ZmZmZmZiArIDB4M2QwID0gMHgxMDAwMDAzOTBcbiAgdmFyIGhpO1xuICB2YXIgbG8gPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG51bS5sZW5ndGg7IGkrKykge1xuICAgIHZhciB3ID0gbnVtLndvcmRzW2ldO1xuICAgIGhpID0gdyAqIDB4NDA7XG4gICAgbG8gKz0gdyAqIDB4M2QxO1xuICAgIGhpICs9IChsbyAvIDB4NDAwMDAwMCkgfCAwO1xuICAgIGxvICY9IDB4M2ZmZmZmZjtcblxuICAgIG51bS53b3Jkc1tpXSA9IGxvO1xuXG4gICAgbG8gPSBoaTtcbiAgfVxuXG4gIC8vIEZhc3QgbGVuZ3RoIHJlZHVjdGlvblxuICBpZiAobnVtLndvcmRzW251bS5sZW5ndGggLSAxXSA9PT0gMCkge1xuICAgIG51bS5sZW5ndGgtLTtcbiAgICBpZiAobnVtLndvcmRzW251bS5sZW5ndGggLSAxXSA9PT0gMClcbiAgICAgIG51bS5sZW5ndGgtLTtcbiAgfVxuICByZXR1cm4gbnVtO1xufTtcblxuZnVuY3Rpb24gUDIyNCgpIHtcbiAgTVByaW1lLmNhbGwoXG4gICAgdGhpcyxcbiAgICAncDIyNCcsXG4gICAgJ2ZmZmZmZmZmIGZmZmZmZmZmIGZmZmZmZmZmIGZmZmZmZmZmIDAwMDAwMDAwIDAwMDAwMDAwIDAwMDAwMDAxJyk7XG59XG5pbmhlcml0cyhQMjI0LCBNUHJpbWUpO1xuXG5mdW5jdGlvbiBQMTkyKCkge1xuICBNUHJpbWUuY2FsbChcbiAgICB0aGlzLFxuICAgICdwMTkyJyxcbiAgICAnZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmYgZmZmZmZmZmUgZmZmZmZmZmYgZmZmZmZmZmYnKTtcbn1cbmluaGVyaXRzKFAxOTIsIE1QcmltZSk7XG5cbmZ1bmN0aW9uIFAyNTUxOSgpIHtcbiAgLy8gMiBeIDI1NSAtIDE5XG4gIE1QcmltZS5jYWxsKFxuICAgIHRoaXMsXG4gICAgJzI1NTE5JyxcbiAgICAnN2ZmZmZmZmZmZmZmZmZmZiBmZmZmZmZmZmZmZmZmZmZmIGZmZmZmZmZmZmZmZmZmZmYgZmZmZmZmZmZmZmZmZmZlZCcpO1xufVxuaW5oZXJpdHMoUDI1NTE5LCBNUHJpbWUpO1xuXG5QMjU1MTkucHJvdG90eXBlLmltdWxLID0gZnVuY3Rpb24gaW11bEsobnVtKSB7XG4gIC8vIEsgPSAweDEzXG4gIHZhciBjYXJyeSA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGhpID0gbnVtLndvcmRzW2ldICogMHgxMyArIGNhcnJ5O1xuICAgIHZhciBsbyA9IGhpICYgMHgzZmZmZmZmO1xuICAgIGhpID4+Pj0gMjY7XG5cbiAgICBudW0ud29yZHNbaV0gPSBsbztcbiAgICBjYXJyeSA9IGhpO1xuICB9XG4gIGlmIChjYXJyeSAhPT0gMClcbiAgICBudW0ud29yZHNbbnVtLmxlbmd0aCsrXSA9IGNhcnJ5O1xuICByZXR1cm4gbnVtO1xufTtcblxuLy8gRXhwb3J0ZWQgbW9zdGx5IGZvciB0ZXN0aW5nIHB1cnBvc2VzLCB1c2UgcGxhaW4gbmFtZSBpbnN0ZWFkXG5CTi5fcHJpbWUgPSBmdW5jdGlvbiBwcmltZShuYW1lKSB7XG4gIC8vIENhY2hlZCB2ZXJzaW9uIG9mIHByaW1lXG4gIGlmIChwcmltZXNbbmFtZV0pXG4gICAgcmV0dXJuIHByaW1lc1tuYW1lXTtcblxuICB2YXIgcHJpbWU7XG4gIGlmIChuYW1lID09PSAnazI1NicpXG4gICAgcHJpbWUgPSBuZXcgSzI1NigpO1xuICBlbHNlIGlmIChuYW1lID09PSAncDIyNCcpXG4gICAgcHJpbWUgPSBuZXcgUDIyNCgpO1xuICBlbHNlIGlmIChuYW1lID09PSAncDE5MicpXG4gICAgcHJpbWUgPSBuZXcgUDE5MigpO1xuICBlbHNlIGlmIChuYW1lID09PSAncDI1NTE5JylcbiAgICBwcmltZSA9IG5ldyBQMjU1MTkoKTtcbiAgZWxzZVxuICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBwcmltZSAnICsgbmFtZSk7XG4gIHByaW1lc1tuYW1lXSA9IHByaW1lO1xuXG4gIHJldHVybiBwcmltZTtcbn07XG5cbi8vXG4vLyBCYXNlIHJlZHVjdGlvbiBlbmdpbmVcbi8vXG5mdW5jdGlvbiBSZWQobSkge1xuICBpZiAodHlwZW9mIG0gPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIHByaW1lID0gQk4uX3ByaW1lKG0pO1xuICAgIHRoaXMubSA9IHByaW1lLnA7XG4gICAgdGhpcy5wcmltZSA9IHByaW1lO1xuICB9IGVsc2Uge1xuICAgIHRoaXMubSA9IG07XG4gICAgdGhpcy5wcmltZSA9IG51bGw7XG4gIH1cbn1cblxuUmVkLnByb3RvdHlwZS5fdmVyaWZ5MSA9IGZ1bmN0aW9uIF92ZXJpZnkxKGEpIHtcbiAgYXNzZXJ0KCFhLnNpZ24sICdyZWQgd29ya3Mgb25seSB3aXRoIHBvc2l0aXZlcycpO1xuICBhc3NlcnQoYS5yZWQsICdyZWQgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG59O1xuXG5SZWQucHJvdG90eXBlLl92ZXJpZnkyID0gZnVuY3Rpb24gX3ZlcmlmeTIoYSwgYikge1xuICBhc3NlcnQoIWEuc2lnbiAmJiAhYi5zaWduLCAncmVkIHdvcmtzIG9ubHkgd2l0aCBwb3NpdGl2ZXMnKTtcbiAgYXNzZXJ0KGEucmVkICYmIGEucmVkID09PSBiLnJlZCxcbiAgICAgICAgICdyZWQgd29ya3Mgb25seSB3aXRoIHJlZCBudW1iZXJzJyk7XG59O1xuXG5SZWQucHJvdG90eXBlLmltb2QgPSBmdW5jdGlvbiBpbW9kKGEpIHtcbiAgaWYgKHRoaXMucHJpbWUpXG4gICAgcmV0dXJuIHRoaXMucHJpbWUuaXJlZHVjZShhKS5fZm9yY2VSZWQodGhpcyk7XG4gIHJldHVybiBhLm1vZCh0aGlzLm0pLl9mb3JjZVJlZCh0aGlzKTtcbn07XG5cblJlZC5wcm90b3R5cGUubmVnID0gZnVuY3Rpb24gbmVnKGEpIHtcbiAgdmFyIHIgPSBhLmNsb25lKCk7XG4gIHIuc2lnbiA9ICFyLnNpZ247XG4gIHJldHVybiByLmlhZGQodGhpcy5tKS5fZm9yY2VSZWQodGhpcyk7XG59O1xuXG5SZWQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZChhLCBiKSB7XG4gIHRoaXMuX3ZlcmlmeTIoYSwgYik7XG5cbiAgdmFyIHJlcyA9IGEuYWRkKGIpO1xuICBpZiAocmVzLmNtcCh0aGlzLm0pID49IDApXG4gICAgcmVzLmlzdWIodGhpcy5tKTtcbiAgcmV0dXJuIHJlcy5fZm9yY2VSZWQodGhpcyk7XG59O1xuXG5SZWQucHJvdG90eXBlLmlhZGQgPSBmdW5jdGlvbiBpYWRkKGEsIGIpIHtcbiAgdGhpcy5fdmVyaWZ5MihhLCBiKTtcblxuICB2YXIgcmVzID0gYS5pYWRkKGIpO1xuICBpZiAocmVzLmNtcCh0aGlzLm0pID49IDApXG4gICAgcmVzLmlzdWIodGhpcy5tKTtcbiAgcmV0dXJuIHJlcztcbn07XG5cblJlZC5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24gc3ViKGEsIGIpIHtcbiAgdGhpcy5fdmVyaWZ5MihhLCBiKTtcblxuICB2YXIgcmVzID0gYS5zdWIoYik7XG4gIGlmIChyZXMuY21wbigwKSA8IDApXG4gICAgcmVzLmlhZGQodGhpcy5tKTtcbiAgcmV0dXJuIHJlcy5fZm9yY2VSZWQodGhpcyk7XG59O1xuXG5SZWQucHJvdG90eXBlLmlzdWIgPSBmdW5jdGlvbiBpc3ViKGEsIGIpIHtcbiAgdGhpcy5fdmVyaWZ5MihhLCBiKTtcblxuICB2YXIgcmVzID0gYS5pc3ViKGIpO1xuICBpZiAocmVzLmNtcG4oMCkgPCAwKVxuICAgIHJlcy5pYWRkKHRoaXMubSk7XG4gIHJldHVybiByZXM7XG59O1xuXG5SZWQucHJvdG90eXBlLnNobCA9IGZ1bmN0aW9uIHNobChhLCBudW0pIHtcbiAgdGhpcy5fdmVyaWZ5MShhKTtcbiAgcmV0dXJuIHRoaXMuaW1vZChhLnNobG4obnVtKSk7XG59O1xuXG5SZWQucHJvdG90eXBlLmltdWwgPSBmdW5jdGlvbiBpbXVsKGEsIGIpIHtcbiAgdGhpcy5fdmVyaWZ5MihhLCBiKTtcbiAgcmV0dXJuIHRoaXMuaW1vZChhLmltdWwoYikpO1xufTtcblxuUmVkLnByb3RvdHlwZS5tdWwgPSBmdW5jdGlvbiBtdWwoYSwgYikge1xuICB0aGlzLl92ZXJpZnkyKGEsIGIpO1xuICByZXR1cm4gdGhpcy5pbW9kKGEubXVsKGIpKTtcbn07XG5cblJlZC5wcm90b3R5cGUuaXNxciA9IGZ1bmN0aW9uIGlzcXIoYSkge1xuICByZXR1cm4gdGhpcy5pbXVsKGEsIGEpO1xufTtcblxuUmVkLnByb3RvdHlwZS5zcXIgPSBmdW5jdGlvbiBzcXIoYSkge1xuICByZXR1cm4gdGhpcy5tdWwoYSwgYSk7XG59O1xuXG5SZWQucHJvdG90eXBlLnNxcnQgPSBmdW5jdGlvbiBzcXJ0KGEpIHtcbiAgaWYgKGEuY21wbigwKSA9PT0gMClcbiAgICByZXR1cm4gYS5jbG9uZSgpO1xuXG4gIHZhciBtb2QzID0gdGhpcy5tLmFuZGxuKDMpO1xuICBhc3NlcnQobW9kMyAlIDIgPT09IDEpO1xuXG4gIC8vIEZhc3QgY2FzZVxuICBpZiAobW9kMyA9PT0gMykge1xuICAgIHZhciBwb3cgPSB0aGlzLm0uYWRkKG5ldyBCTigxKSkuaXNocm4oMik7XG4gICAgdmFyIHIgPSB0aGlzLnBvdyhhLCBwb3cpO1xuICAgIHJldHVybiByO1xuICB9XG5cbiAgLy8gVG9uZWxsaS1TaGFua3MgYWxnb3JpdGhtIChUb3RhbGx5IHVub3B0aW1pemVkIGFuZCBzbG93KVxuICAvL1xuICAvLyBGaW5kIFEgYW5kIFMsIHRoYXQgUSAqIDIgXiBTID0gKFAgLSAxKVxuICB2YXIgcSA9IHRoaXMubS5zdWJuKDEpO1xuICB2YXIgcyA9IDA7XG4gIHdoaWxlIChxLmNtcG4oMCkgIT09IDAgJiYgcS5hbmRsbigxKSA9PT0gMCkge1xuICAgIHMrKztcbiAgICBxLmlzaHJuKDEpO1xuICB9XG4gIGFzc2VydChxLmNtcG4oMCkgIT09IDApO1xuXG4gIHZhciBvbmUgPSBuZXcgQk4oMSkudG9SZWQodGhpcyk7XG4gIHZhciBuT25lID0gb25lLnJlZE5lZygpO1xuXG4gIC8vIEZpbmQgcXVhZHJhdGljIG5vbi1yZXNpZHVlXG4gIC8vIE5PVEU6IE1heCBpcyBzdWNoIGJlY2F1c2Ugb2YgZ2VuZXJhbGl6ZWQgUmllbWFubiBoeXBvdGhlc2lzLlxuICB2YXIgbHBvdyA9IHRoaXMubS5zdWJuKDEpLmlzaHJuKDEpO1xuICB2YXIgeiA9IHRoaXMubS5iaXRMZW5ndGgoKTtcbiAgeiA9IG5ldyBCTigyICogeiAqIHopLnRvUmVkKHRoaXMpO1xuICB3aGlsZSAodGhpcy5wb3coeiwgbHBvdykuY21wKG5PbmUpICE9PSAwKVxuICAgIHoucmVkSUFkZChuT25lKTtcblxuICB2YXIgYyA9IHRoaXMucG93KHosIHEpO1xuICB2YXIgciA9IHRoaXMucG93KGEsIHEuYWRkbigxKS5pc2hybigxKSk7XG4gIHZhciB0ID0gdGhpcy5wb3coYSwgcSk7XG4gIHZhciBtID0gcztcbiAgd2hpbGUgKHQuY21wKG9uZSkgIT09IDApIHtcbiAgICB2YXIgdG1wID0gdDtcbiAgICBmb3IgKHZhciBpID0gMDsgdG1wLmNtcChvbmUpICE9PSAwOyBpKyspXG4gICAgICB0bXAgPSB0bXAucmVkU3FyKCk7XG4gICAgYXNzZXJ0KGkgPCBtKTtcbiAgICB2YXIgYiA9IHRoaXMucG93KGMsIG5ldyBCTigxKS5pc2hsbihtIC0gaSAtIDEpKTtcblxuICAgIHIgPSByLnJlZE11bChiKTtcbiAgICBjID0gYi5yZWRTcXIoKTtcbiAgICB0ID0gdC5yZWRNdWwoYyk7XG4gICAgbSA9IGk7XG4gIH1cblxuICByZXR1cm4gcjtcbn07XG5cblJlZC5wcm90b3R5cGUuaW52bSA9IGZ1bmN0aW9uIGludm0oYSkge1xuICB2YXIgaW52ID0gYS5faW52bXAodGhpcy5tKTtcbiAgaWYgKGludi5zaWduKSB7XG4gICAgaW52LnNpZ24gPSBmYWxzZTtcbiAgICByZXR1cm4gdGhpcy5pbW9kKGludikucmVkTmVnKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuaW1vZChpbnYpO1xuICB9XG59O1xuXG5SZWQucHJvdG90eXBlLnBvdyA9IGZ1bmN0aW9uIHBvdyhhLCBudW0pIHtcbiAgdmFyIHcgPSBbXTtcblxuICBpZiAobnVtLmNtcG4oMCkgPT09IDApXG4gICAgcmV0dXJuIG5ldyBCTigxKTtcblxuICB2YXIgcSA9IG51bS5jbG9uZSgpO1xuXG4gIHdoaWxlIChxLmNtcG4oMCkgIT09IDApIHtcbiAgICB3LnB1c2gocS5hbmRsbigxKSk7XG4gICAgcS5pc2hybigxKTtcbiAgfVxuXG4gIC8vIFNraXAgbGVhZGluZyB6ZXJvZXNcbiAgdmFyIHJlcyA9IGE7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdy5sZW5ndGg7IGkrKywgcmVzID0gdGhpcy5zcXIocmVzKSlcbiAgICBpZiAod1tpXSAhPT0gMClcbiAgICAgIGJyZWFrO1xuXG4gIGlmICgrK2kgPCB3Lmxlbmd0aCkge1xuICAgIGZvciAodmFyIHEgPSB0aGlzLnNxcihyZXMpOyBpIDwgdy5sZW5ndGg7IGkrKywgcSA9IHRoaXMuc3FyKHEpKSB7XG4gICAgICBpZiAod1tpXSA9PT0gMClcbiAgICAgICAgY29udGludWU7XG4gICAgICByZXMgPSB0aGlzLm11bChyZXMsIHEpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXM7XG59O1xuXG5SZWQucHJvdG90eXBlLmNvbnZlcnRUbyA9IGZ1bmN0aW9uIGNvbnZlcnRUbyhudW0pIHtcbiAgdmFyIHIgPSBudW0ubW9kKHRoaXMubSk7XG4gIGlmIChyID09PSBudW0pXG4gICAgcmV0dXJuIHIuY2xvbmUoKTtcbiAgZWxzZVxuICAgIHJldHVybiByO1xufTtcblxuUmVkLnByb3RvdHlwZS5jb252ZXJ0RnJvbSA9IGZ1bmN0aW9uIGNvbnZlcnRGcm9tKG51bSkge1xuICB2YXIgcmVzID0gbnVtLmNsb25lKCk7XG4gIHJlcy5yZWQgPSBudWxsO1xuICByZXR1cm4gcmVzO1xufTtcblxuLy9cbi8vIE1vbnRnb21lcnkgbWV0aG9kIGVuZ2luZVxuLy9cblxuQk4ubW9udCA9IGZ1bmN0aW9uIG1vbnQobnVtKSB7XG4gIHJldHVybiBuZXcgTW9udChudW0pO1xufTtcblxuZnVuY3Rpb24gTW9udChtKSB7XG4gIFJlZC5jYWxsKHRoaXMsIG0pO1xuXG4gIHRoaXMuc2hpZnQgPSB0aGlzLm0uYml0TGVuZ3RoKCk7XG4gIGlmICh0aGlzLnNoaWZ0ICUgMjYgIT09IDApXG4gICAgdGhpcy5zaGlmdCArPSAyNiAtICh0aGlzLnNoaWZ0ICUgMjYpO1xuICB0aGlzLnIgPSBuZXcgQk4oMSkuaXNobG4odGhpcy5zaGlmdCk7XG4gIHRoaXMucjIgPSB0aGlzLmltb2QodGhpcy5yLnNxcigpKTtcbiAgdGhpcy5yaW52ID0gdGhpcy5yLl9pbnZtcCh0aGlzLm0pO1xuXG4gIHRoaXMubWludiA9IHRoaXMucmludi5tdWwodGhpcy5yKS5pc3VibigxKS5kaXYodGhpcy5tKTtcbiAgdGhpcy5taW52LnNpZ24gPSB0cnVlO1xuICB0aGlzLm1pbnYgPSB0aGlzLm1pbnYubW9kKHRoaXMucik7XG59XG5pbmhlcml0cyhNb250LCBSZWQpO1xuXG5Nb250LnByb3RvdHlwZS5jb252ZXJ0VG8gPSBmdW5jdGlvbiBjb252ZXJ0VG8obnVtKSB7XG4gIHJldHVybiB0aGlzLmltb2QobnVtLnNobG4odGhpcy5zaGlmdCkpO1xufTtcblxuTW9udC5wcm90b3R5cGUuY29udmVydEZyb20gPSBmdW5jdGlvbiBjb252ZXJ0RnJvbShudW0pIHtcbiAgdmFyIHIgPSB0aGlzLmltb2QobnVtLm11bCh0aGlzLnJpbnYpKTtcbiAgci5yZWQgPSBudWxsO1xuICByZXR1cm4gcjtcbn07XG5cbk1vbnQucHJvdG90eXBlLmltdWwgPSBmdW5jdGlvbiBpbXVsKGEsIGIpIHtcbiAgaWYgKGEuY21wbigwKSA9PT0gMCB8fCBiLmNtcG4oMCkgPT09IDApIHtcbiAgICBhLndvcmRzWzBdID0gMDtcbiAgICBhLmxlbmd0aCA9IDE7XG4gICAgcmV0dXJuIGE7XG4gIH1cblxuICB2YXIgdCA9IGEuaW11bChiKTtcbiAgdmFyIGMgPSB0Lm1hc2tuKHRoaXMuc2hpZnQpLm11bCh0aGlzLm1pbnYpLmltYXNrbih0aGlzLnNoaWZ0KS5tdWwodGhpcy5tKTtcbiAgdmFyIHUgPSB0LmlzdWIoYykuaXNocm4odGhpcy5zaGlmdCk7XG4gIHZhciByZXMgPSB1O1xuICBpZiAodS5jbXAodGhpcy5tKSA+PSAwKVxuICAgIHJlcyA9IHUuaXN1Yih0aGlzLm0pO1xuICBlbHNlIGlmICh1LmNtcG4oMCkgPCAwKVxuICAgIHJlcyA9IHUuaWFkZCh0aGlzLm0pO1xuXG4gIHJldHVybiByZXMuX2ZvcmNlUmVkKHRoaXMpO1xufTtcblxuTW9udC5wcm90b3R5cGUubXVsID0gZnVuY3Rpb24gbXVsKGEsIGIpIHtcbiAgaWYgKGEuY21wbigwKSA9PT0gMCB8fCBiLmNtcG4oMCkgPT09IDApXG4gICAgcmV0dXJuIG5ldyBCTigwKS5fZm9yY2VSZWQodGhpcyk7XG5cbiAgdmFyIHQgPSBhLm11bChiKTtcbiAgdmFyIGMgPSB0Lm1hc2tuKHRoaXMuc2hpZnQpLm11bCh0aGlzLm1pbnYpLmltYXNrbih0aGlzLnNoaWZ0KS5tdWwodGhpcy5tKTtcbiAgdmFyIHUgPSB0LmlzdWIoYykuaXNocm4odGhpcy5zaGlmdCk7XG4gIHZhciByZXMgPSB1O1xuICBpZiAodS5jbXAodGhpcy5tKSA+PSAwKVxuICAgIHJlcyA9IHUuaXN1Yih0aGlzLm0pO1xuICBlbHNlIGlmICh1LmNtcG4oMCkgPCAwKVxuICAgIHJlcyA9IHUuaWFkZCh0aGlzLm0pO1xuXG4gIHJldHVybiByZXMuX2ZvcmNlUmVkKHRoaXMpO1xufTtcblxuTW9udC5wcm90b3R5cGUuaW52bSA9IGZ1bmN0aW9uIGludm0oYSkge1xuICAvLyAoQVIpXi0xICogUl4yID0gKEFeLTEgKiBSXi0xKSAqIFJeMiA9IEFeLTEgKiBSXG4gIHZhciByZXMgPSB0aGlzLmltb2QoYS5faW52bXAodGhpcy5tKS5tdWwodGhpcy5yMikpO1xuICByZXR1cm4gcmVzLl9mb3JjZVJlZCh0aGlzKTtcbn07XG5cbn0pKHR5cGVvZiBtb2R1bGUgPT09ICd1bmRlZmluZWQnIHx8IG1vZHVsZSwgdGhpcyk7XG4iLCJ2YXIgY29uc3RhbnRzID0gcmVxdWlyZSgnLi4vY29uc3RhbnRzJyk7XG5cbmV4cG9ydHMudGFnQ2xhc3MgPSB7XG4gIDA6ICd1bml2ZXJzYWwnLFxuICAxOiAnYXBwbGljYXRpb24nLFxuICAyOiAnY29udGV4dCcsXG4gIDM6ICdwcml2YXRlJ1xufTtcbmV4cG9ydHMudGFnQ2xhc3NCeU5hbWUgPSBjb25zdGFudHMuX3JldmVyc2UoZXhwb3J0cy50YWdDbGFzcyk7XG5cbmV4cG9ydHMudGFnID0ge1xuICAweDAwOiAnZW5kJyxcbiAgMHgwMTogJ2Jvb2wnLFxuICAweDAyOiAnaW50JyxcbiAgMHgwMzogJ2JpdHN0cicsXG4gIDB4MDQ6ICdvY3RzdHInLFxuICAweDA1OiAnbnVsbF8nLFxuICAweDA2OiAnb2JqaWQnLFxuICAweDA3OiAnb2JqRGVzYycsXG4gIDB4MDg6ICdleHRlcm5hbCcsXG4gIDB4MDk6ICdyZWFsJyxcbiAgMHgwYTogJ2VudW0nLFxuICAweDBiOiAnZW1iZWQnLFxuICAweDBjOiAndXRmOHN0cicsXG4gIDB4MGQ6ICdyZWxhdGl2ZU9pZCcsXG4gIDB4MTA6ICdzZXEnLFxuICAweDExOiAnc2V0JyxcbiAgMHgxMjogJ251bXN0cicsXG4gIDB4MTM6ICdwcmludHN0cicsXG4gIDB4MTQ6ICd0NjFzdHInLFxuICAweDE1OiAndmlkZW9zdHInLFxuICAweDE2OiAnaWE1c3RyJyxcbiAgMHgxNzogJ3V0Y3RpbWUnLFxuICAweDE4OiAnZ2VudGltZScsXG4gIDB4MTk6ICdncmFwaHN0cicsXG4gIDB4MWE6ICdpc282NDZzdHInLFxuICAweDFiOiAnZ2Vuc3RyJyxcbiAgMHgxYzogJ3VuaXN0cicsXG4gIDB4MWQ6ICdjaGFyc3RyJyxcbiAgMHgxZTogJ2JtcHN0cidcbn07XG5leHBvcnRzLnRhZ0J5TmFtZSA9IGNvbnN0YW50cy5fcmV2ZXJzZShleHBvcnRzLnRhZyk7XG4iLCJ2YXIgY29uc3RhbnRzID0gZXhwb3J0cztcblxuLy8gSGVscGVyXG5jb25zdGFudHMuX3JldmVyc2UgPSBmdW5jdGlvbiByZXZlcnNlKG1hcCkge1xuICB2YXIgcmVzID0ge307XG5cbiAgT2JqZWN0LmtleXMobWFwKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIC8vIENvbnZlcnQga2V5IHRvIGludGVnZXIgaWYgaXQgaXMgc3RyaW5naWZpZWRcbiAgICBpZiAoKGtleSB8IDApID09IGtleSlcbiAgICAgIGtleSA9IGtleSB8IDA7XG5cbiAgICB2YXIgdmFsdWUgPSBtYXBba2V5XTtcbiAgICByZXNbdmFsdWVdID0ga2V5O1xuICB9KTtcblxuICByZXR1cm4gcmVzO1xufTtcblxuY29uc3RhbnRzLmRlciA9IHJlcXVpcmUoJy4vZGVyJyk7XG4iLCJ2YXIgaW5oZXJpdHMgPSByZXF1aXJlKCd1dGlsJykuaW5oZXJpdHM7XG5cbnZhciBhc24xID0gcmVxdWlyZSgnLi4vYXNuMScpO1xudmFyIGJhc2UgPSBhc24xLmJhc2U7XG52YXIgYmlnbnVtID0gYXNuMS5iaWdudW07XG5cbi8vIEltcG9ydCBERVIgY29uc3RhbnRzXG52YXIgZGVyID0gYXNuMS5jb25zdGFudHMuZGVyO1xuXG5mdW5jdGlvbiBERVJEZWNvZGVyKGVudGl0eSkge1xuICB0aGlzLmVuYyA9ICdkZXInO1xuICB0aGlzLm5hbWUgPSBlbnRpdHkubmFtZTtcbiAgdGhpcy5lbnRpdHkgPSBlbnRpdHk7XG5cbiAgLy8gQ29uc3RydWN0IGJhc2UgdHJlZVxuICB0aGlzLnRyZWUgPSBuZXcgREVSTm9kZSgpO1xuICB0aGlzLnRyZWUuX2luaXQoZW50aXR5LmJvZHkpO1xufTtcbm1vZHVsZS5leHBvcnRzID0gREVSRGVjb2RlcjtcblxuREVSRGVjb2Rlci5wcm90b3R5cGUuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKGRhdGEsIG9wdGlvbnMpIHtcbiAgaWYgKCEoZGF0YSBpbnN0YW5jZW9mIGJhc2UuRGVjb2RlckJ1ZmZlcikpXG4gICAgZGF0YSA9IG5ldyBiYXNlLkRlY29kZXJCdWZmZXIoZGF0YSwgb3B0aW9ucyk7XG5cbiAgcmV0dXJuIHRoaXMudHJlZS5fZGVjb2RlKGRhdGEsIG9wdGlvbnMpO1xufTtcblxuLy8gVHJlZSBtZXRob2RzXG5cbmZ1bmN0aW9uIERFUk5vZGUocGFyZW50KSB7XG4gIGJhc2UuTm9kZS5jYWxsKHRoaXMsICdkZXInLCBwYXJlbnQpO1xufVxuaW5oZXJpdHMoREVSTm9kZSwgYmFzZS5Ob2RlKTtcblxuREVSTm9kZS5wcm90b3R5cGUuX3BlZWtUYWcgPSBmdW5jdGlvbiBwZWVrVGFnKGJ1ZmZlciwgdGFnLCBhbnkpIHtcbiAgaWYgKGJ1ZmZlci5pc0VtcHR5KCkpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBzdGF0ZSA9IGJ1ZmZlci5zYXZlKCk7XG4gIHZhciBkZWNvZGVkVGFnID0gZGVyRGVjb2RlVGFnKGJ1ZmZlciwgJ0ZhaWxlZCB0byBwZWVrIHRhZzogXCInICsgdGFnICsgJ1wiJyk7XG4gIGlmIChidWZmZXIuaXNFcnJvcihkZWNvZGVkVGFnKSlcbiAgICByZXR1cm4gZGVjb2RlZFRhZztcblxuICBidWZmZXIucmVzdG9yZShzdGF0ZSk7XG5cbiAgcmV0dXJuIGRlY29kZWRUYWcudGFnID09PSB0YWcgfHwgZGVjb2RlZFRhZy50YWdTdHIgPT09IHRhZyB8fCBhbnk7XG59O1xuXG5ERVJOb2RlLnByb3RvdHlwZS5fZGVjb2RlVGFnID0gZnVuY3Rpb24gZGVjb2RlVGFnKGJ1ZmZlciwgdGFnLCBhbnkpIHtcbiAgdmFyIGRlY29kZWRUYWcgPSBkZXJEZWNvZGVUYWcoYnVmZmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGRlY29kZSB0YWcgb2YgXCInICsgdGFnICsgJ1wiJyk7XG4gIGlmIChidWZmZXIuaXNFcnJvcihkZWNvZGVkVGFnKSlcbiAgICByZXR1cm4gZGVjb2RlZFRhZztcblxuICB2YXIgbGVuID0gZGVyRGVjb2RlTGVuKGJ1ZmZlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICBkZWNvZGVkVGFnLnByaW1pdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGdldCBsZW5ndGggb2YgXCInICsgdGFnICsgJ1wiJyk7XG5cbiAgLy8gRmFpbHVyZVxuICBpZiAoYnVmZmVyLmlzRXJyb3IobGVuKSlcbiAgICByZXR1cm4gbGVuO1xuXG4gIGlmICghYW55ICYmXG4gICAgICBkZWNvZGVkVGFnLnRhZyAhPT0gdGFnICYmXG4gICAgICBkZWNvZGVkVGFnLnRhZ1N0ciAhPT0gdGFnICYmXG4gICAgICBkZWNvZGVkVGFnLnRhZ1N0ciArICdvZicgIT09IHRhZykge1xuICAgIHJldHVybiBidWZmZXIuZXJyb3IoJ0ZhaWxlZCB0byBtYXRjaCB0YWc6IFwiJyArIHRhZyArICdcIicpO1xuICB9XG5cbiAgaWYgKGRlY29kZWRUYWcucHJpbWl0aXZlIHx8IGxlbiAhPT0gbnVsbClcbiAgICByZXR1cm4gYnVmZmVyLnNraXAobGVuLCAnRmFpbGVkIHRvIG1hdGNoIGJvZHkgb2Y6IFwiJyArIHRhZyArICdcIicpO1xuXG4gIC8vIEluZGVmaW5pdGUgbGVuZ3RoLi4uIGZpbmQgRU5EIHRhZ1xuICB2YXIgc3RhdGUgPSBidWZmZXIuc2F2ZSgpO1xuICB2YXIgcmVzID0gdGhpcy5fc2tpcFVudGlsRW5kKFxuICAgICAgYnVmZmVyLFxuICAgICAgJ0ZhaWxlZCB0byBza2lwIGluZGVmaW5pdGUgbGVuZ3RoIGJvZHk6IFwiJyArIHRoaXMudGFnICsgJ1wiJyk7XG4gIGlmIChidWZmZXIuaXNFcnJvcihyZXMpKVxuICAgIHJldHVybiByZXM7XG5cbiAgbGVuID0gYnVmZmVyLm9mZnNldCAtIHN0YXRlLm9mZnNldDtcbiAgYnVmZmVyLnJlc3RvcmUoc3RhdGUpO1xuICByZXR1cm4gYnVmZmVyLnNraXAobGVuLCAnRmFpbGVkIHRvIG1hdGNoIGJvZHkgb2Y6IFwiJyArIHRhZyArICdcIicpO1xufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX3NraXBVbnRpbEVuZCA9IGZ1bmN0aW9uIHNraXBVbnRpbEVuZChidWZmZXIsIGZhaWwpIHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICB2YXIgdGFnID0gZGVyRGVjb2RlVGFnKGJ1ZmZlciwgZmFpbCk7XG4gICAgaWYgKGJ1ZmZlci5pc0Vycm9yKHRhZykpXG4gICAgICByZXR1cm4gdGFnO1xuICAgIHZhciBsZW4gPSBkZXJEZWNvZGVMZW4oYnVmZmVyLCB0YWcucHJpbWl0aXZlLCBmYWlsKTtcbiAgICBpZiAoYnVmZmVyLmlzRXJyb3IobGVuKSlcbiAgICAgIHJldHVybiBsZW47XG5cbiAgICB2YXIgcmVzO1xuICAgIGlmICh0YWcucHJpbWl0aXZlIHx8IGxlbiAhPT0gbnVsbClcbiAgICAgIHJlcyA9IGJ1ZmZlci5za2lwKGxlbilcbiAgICBlbHNlXG4gICAgICByZXMgPSB0aGlzLl9za2lwVW50aWxFbmQoYnVmZmVyLCBmYWlsKTtcblxuICAgIC8vIEZhaWx1cmVcbiAgICBpZiAoYnVmZmVyLmlzRXJyb3IocmVzKSlcbiAgICAgIHJldHVybiByZXM7XG5cbiAgICBpZiAodGFnLnRhZ1N0ciA9PT0gJ2VuZCcpXG4gICAgICBicmVhaztcbiAgfVxufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX2RlY29kZUxpc3QgPSBmdW5jdGlvbiBkZWNvZGVMaXN0KGJ1ZmZlciwgdGFnLCBkZWNvZGVyKSB7XG4gIHZhciByZXN1bHQgPSBbXTtcbiAgd2hpbGUgKCFidWZmZXIuaXNFbXB0eSgpKSB7XG4gICAgdmFyIHBvc3NpYmxlRW5kID0gdGhpcy5fcGVla1RhZyhidWZmZXIsICdlbmQnKTtcbiAgICBpZiAoYnVmZmVyLmlzRXJyb3IocG9zc2libGVFbmQpKVxuICAgICAgcmV0dXJuIHBvc3NpYmxlRW5kO1xuXG4gICAgdmFyIHJlcyA9IGRlY29kZXIuZGVjb2RlKGJ1ZmZlciwgJ2RlcicpO1xuICAgIGlmIChidWZmZXIuaXNFcnJvcihyZXMpICYmIHBvc3NpYmxlRW5kKVxuICAgICAgYnJlYWs7XG4gICAgcmVzdWx0LnB1c2gocmVzKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX2RlY29kZVN0ciA9IGZ1bmN0aW9uIGRlY29kZVN0cihidWZmZXIsIHRhZykge1xuICBpZiAodGFnID09PSAnb2N0c3RyJykge1xuICAgIHJldHVybiBidWZmZXIucmF3KCk7XG4gIH0gZWxzZSBpZiAodGFnID09PSAnYml0c3RyJykge1xuICAgIHZhciB1bnVzZWQgPSBidWZmZXIucmVhZFVJbnQ4KCk7XG4gICAgaWYgKGJ1ZmZlci5pc0Vycm9yKHVudXNlZCkpXG4gICAgICByZXR1cm4gdW51c2VkO1xuXG4gICAgcmV0dXJuIHsgdW51c2VkOiB1bnVzZWQsIGRhdGE6IGJ1ZmZlci5yYXcoKSB9O1xuICB9IGVsc2UgaWYgKHRhZyA9PT0gJ2lhNXN0cicgfHwgdGFnID09PSAndXRmOHN0cicpIHtcbiAgICByZXR1cm4gYnVmZmVyLnJhdygpLnRvU3RyaW5nKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuZXJyb3IoJ0RlY29kaW5nIG9mIHN0cmluZyB0eXBlOiAnICsgdGFnICsgJyB1bnN1cHBvcnRlZCcpO1xuICB9XG59O1xuXG5ERVJOb2RlLnByb3RvdHlwZS5fZGVjb2RlT2JqaWQgPSBmdW5jdGlvbiBkZWNvZGVPYmppZChidWZmZXIsIHZhbHVlcywgcmVsYXRpdmUpIHtcbiAgdmFyIGlkZW50aWZpZXJzID0gW107XG4gIHZhciBpZGVudCA9IDA7XG4gIHdoaWxlICghYnVmZmVyLmlzRW1wdHkoKSkge1xuICAgIHZhciBzdWJpZGVudCA9IGJ1ZmZlci5yZWFkVUludDgoKTtcbiAgICBpZGVudCA8PD0gNztcbiAgICBpZGVudCB8PSBzdWJpZGVudCAmIDB4N2Y7XG4gICAgaWYgKChzdWJpZGVudCAmIDB4ODApID09PSAwKSB7XG4gICAgICBpZGVudGlmaWVycy5wdXNoKGlkZW50KTtcbiAgICAgIGlkZW50ID0gMDtcbiAgICB9XG4gIH1cbiAgaWYgKHN1YmlkZW50ICYgMHg4MClcbiAgICBpZGVudGlmaWVycy5wdXNoKGlkZW50KTtcblxuICB2YXIgZmlyc3QgPSAoaWRlbnRpZmllcnNbMF0gLyA0MCkgfCAwO1xuICB2YXIgc2Vjb25kID0gaWRlbnRpZmllcnNbMF0gJSA0MDtcblxuICBpZiAocmVsYXRpdmUpXG4gICAgcmVzdWx0ID0gaWRlbnRpZmllcnM7XG4gIGVsc2VcbiAgICByZXN1bHQgPSBbZmlyc3QsIHNlY29uZF0uY29uY2F0KGlkZW50aWZpZXJzLnNsaWNlKDEpKTtcblxuICBpZiAodmFsdWVzKVxuICAgIHJlc3VsdCA9IHZhbHVlc1tyZXN1bHQuam9pbignICcpXTtcblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX2RlY29kZVRpbWUgPSBmdW5jdGlvbiBkZWNvZGVUaW1lKGJ1ZmZlciwgdGFnKSB7XG4gIHZhciBzdHIgPSBidWZmZXIucmF3KCkudG9TdHJpbmcoKTtcbiAgaWYgKHRhZyA9PT0gJ2dlbnRpbWUnKSB7XG4gICAgdmFyIHllYXIgPSBzdHIuc2xpY2UoMCwgNCkgfCAwO1xuICAgIHZhciBtb24gPSBzdHIuc2xpY2UoNCwgNikgfCAwO1xuICAgIHZhciBkYXkgPSBzdHIuc2xpY2UoNiwgOCkgfCAwO1xuICAgIHZhciBob3VyID0gc3RyLnNsaWNlKDgsIDEwKSB8IDA7XG4gICAgdmFyIG1pbiA9IHN0ci5zbGljZSgxMCwgMTIpIHwgMDtcbiAgICB2YXIgc2VjID0gc3RyLnNsaWNlKDEyLCAxNCkgfCAwO1xuICB9IGVsc2UgaWYgKHRhZyA9PT0gJ3V0Y3RpbWUnKSB7XG4gICAgdmFyIHllYXIgPSBzdHIuc2xpY2UoMCwgMikgfCAwO1xuICAgIHZhciBtb24gPSBzdHIuc2xpY2UoMiwgNCkgfCAwO1xuICAgIHZhciBkYXkgPSBzdHIuc2xpY2UoNCwgNikgfCAwO1xuICAgIHZhciBob3VyID0gc3RyLnNsaWNlKDYsIDgpIHwgMDtcbiAgICB2YXIgbWluID0gc3RyLnNsaWNlKDgsIDEwKSB8IDA7XG4gICAgdmFyIHNlYyA9IHN0ci5zbGljZSgxMCwgMTIpIHwgMDtcbiAgICBpZiAoeWVhciA8IDcwKVxuICAgICAgeWVhciA9IDIwMDAgKyB5ZWFyO1xuICAgIGVsc2VcbiAgICAgIHllYXIgPSAxOTAwICsgeWVhcjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5lcnJvcignRGVjb2RpbmcgJyArIHRhZyArICcgdGltZSBpcyBub3Qgc3VwcG9ydGVkIHlldCcpO1xuICB9XG5cbiAgcmV0dXJuIERhdGUuVVRDKHllYXIsIG1vbiAtIDEsIGRheSwgaG91ciwgbWluLCBzZWMsIDApO1xufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX2RlY29kZU51bGwgPSBmdW5jdGlvbiBkZWNvZGVOdWxsKGJ1ZmZlcikge1xuICByZXR1cm4gbnVsbDtcbn07XG5cbkRFUk5vZGUucHJvdG90eXBlLl9kZWNvZGVCb29sID0gZnVuY3Rpb24gZGVjb2RlQm9vbChidWZmZXIpIHtcbiAgdmFyIHJlcyA9IGJ1ZmZlci5yZWFkVUludDgoKTtcbiAgaWYgKGJ1ZmZlci5pc0Vycm9yKHJlcykpXG4gICAgcmV0dXJuIHJlcztcbiAgZWxzZVxuICAgIHJldHVybiByZXMgIT09IDA7XG59O1xuXG5ERVJOb2RlLnByb3RvdHlwZS5fZGVjb2RlSW50ID0gZnVuY3Rpb24gZGVjb2RlSW50KGJ1ZmZlciwgdmFsdWVzKSB7XG4gIC8vIEJpZ2ludCwgcmV0dXJuIGFzIGl0IGlzIChhc3N1bWUgYmlnIGVuZGlhbilcbiAgdmFyIHJhdyA9IGJ1ZmZlci5yYXcoKTtcbiAgdmFyIHJlcyA9IG5ldyBiaWdudW0ocmF3KTtcblxuICBpZiAodmFsdWVzKVxuICAgIHJlcyA9IHZhbHVlc1tyZXMudG9TdHJpbmcoMTApXSB8fCByZXM7XG5cbiAgcmV0dXJuIHJlcztcbn07XG5cbkRFUk5vZGUucHJvdG90eXBlLl91c2UgPSBmdW5jdGlvbiB1c2UoZW50aXR5LCBvYmopIHtcbiAgaWYgKHR5cGVvZiBlbnRpdHkgPT09ICdmdW5jdGlvbicpXG4gICAgZW50aXR5ID0gZW50aXR5KG9iaik7XG4gIHJldHVybiBlbnRpdHkuX2dldERlY29kZXIoJ2RlcicpLnRyZWU7XG59O1xuXG4vLyBVdGlsaXR5IG1ldGhvZHNcblxuZnVuY3Rpb24gZGVyRGVjb2RlVGFnKGJ1ZiwgZmFpbCkge1xuICB2YXIgdGFnID0gYnVmLnJlYWRVSW50OChmYWlsKTtcbiAgaWYgKGJ1Zi5pc0Vycm9yKHRhZykpXG4gICAgcmV0dXJuIHRhZztcblxuICB2YXIgY2xzID0gZGVyLnRhZ0NsYXNzW3RhZyA+PiA2XTtcbiAgdmFyIHByaW1pdGl2ZSA9ICh0YWcgJiAweDIwKSA9PT0gMDtcblxuICAvLyBNdWx0aS1vY3RldCB0YWcgLSBsb2FkXG4gIGlmICgodGFnICYgMHgxZikgPT09IDB4MWYpIHtcbiAgICB2YXIgb2N0ID0gdGFnO1xuICAgIHRhZyA9IDA7XG4gICAgd2hpbGUgKChvY3QgJiAweDgwKSA9PT0gMHg4MCkge1xuICAgICAgb2N0ID0gYnVmLnJlYWRVSW50OChmYWlsKTtcbiAgICAgIGlmIChidWYuaXNFcnJvcihvY3QpKVxuICAgICAgICByZXR1cm4gb2N0O1xuXG4gICAgICB0YWcgPDw9IDc7XG4gICAgICB0YWcgfD0gb2N0ICYgMHg3ZjtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGFnICY9IDB4MWY7XG4gIH1cbiAgdmFyIHRhZ1N0ciA9IGRlci50YWdbdGFnXTtcblxuICByZXR1cm4ge1xuICAgIGNsczogY2xzLFxuICAgIHByaW1pdGl2ZTogcHJpbWl0aXZlLFxuICAgIHRhZzogdGFnLFxuICAgIHRhZ1N0cjogdGFnU3RyXG4gIH07XG59XG5cbmZ1bmN0aW9uIGRlckRlY29kZUxlbihidWYsIHByaW1pdGl2ZSwgZmFpbCkge1xuICB2YXIgbGVuID0gYnVmLnJlYWRVSW50OChmYWlsKTtcbiAgaWYgKGJ1Zi5pc0Vycm9yKGxlbikpXG4gICAgcmV0dXJuIGxlbjtcblxuICAvLyBJbmRlZmluaXRlIGZvcm1cbiAgaWYgKCFwcmltaXRpdmUgJiYgbGVuID09PSAweDgwKVxuICAgIHJldHVybiBudWxsO1xuXG4gIC8vIERlZmluaXRlIGZvcm1cbiAgaWYgKChsZW4gJiAweDgwKSA9PT0gMCkge1xuICAgIC8vIFNob3J0IGZvcm1cbiAgICByZXR1cm4gbGVuO1xuICB9XG5cbiAgLy8gTG9uZyBmb3JtXG4gIHZhciBudW0gPSBsZW4gJiAweDdmO1xuICBpZiAobnVtID49IDQpXG4gICAgcmV0dXJuIGJ1Zi5lcnJvcignbGVuZ3RoIG9jdGVjdCBpcyB0b28gbG9uZycpO1xuXG4gIGxlbiA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtOyBpKyspIHtcbiAgICBsZW4gPDw9IDg7XG4gICAgdmFyIGogPSBidWYucmVhZFVJbnQ4KGZhaWwpO1xuICAgIGlmIChidWYuaXNFcnJvcihqKSlcbiAgICAgIHJldHVybiBqO1xuICAgIGxlbiB8PSBqO1xuICB9XG5cbiAgcmV0dXJuIGxlbjtcbn1cbiIsInZhciBkZWNvZGVycyA9IGV4cG9ydHM7XG5cbmRlY29kZXJzLmRlciA9IHJlcXVpcmUoJy4vZGVyJyk7XG5kZWNvZGVycy5wZW0gPSByZXF1aXJlKCcuL3BlbScpO1xuIiwidmFyIGluaGVyaXRzID0gcmVxdWlyZSgndXRpbCcpLmluaGVyaXRzO1xudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcblxudmFyIGFzbjEgPSByZXF1aXJlKCcuLi9hc24xJyk7XG52YXIgREVSRGVjb2RlciA9IHJlcXVpcmUoJy4vZGVyJyk7XG5cbmZ1bmN0aW9uIFBFTURlY29kZXIoZW50aXR5KSB7XG4gIERFUkRlY29kZXIuY2FsbCh0aGlzLCBlbnRpdHkpO1xuICB0aGlzLmVuYyA9ICdwZW0nO1xufTtcbmluaGVyaXRzKFBFTURlY29kZXIsIERFUkRlY29kZXIpO1xubW9kdWxlLmV4cG9ydHMgPSBQRU1EZWNvZGVyO1xuXG5QRU1EZWNvZGVyLnByb3RvdHlwZS5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUoZGF0YSwgb3B0aW9ucykge1xuICB2YXIgbGluZXMgPSBkYXRhLnRvU3RyaW5nKCkuc3BsaXQoL1tcXHJcXG5dKy9nKTtcblxuICB2YXIgbGFiZWwgPSBvcHRpb25zLmxhYmVsLnRvVXBwZXJDYXNlKCk7XG5cbiAgdmFyIHJlID0gL14tLS0tLShCRUdJTnxFTkQpIChbXi1dKyktLS0tLSQvO1xuICB2YXIgc3RhcnQgPSAtMTtcbiAgdmFyIGVuZCA9IC0xO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG1hdGNoID0gbGluZXNbaV0ubWF0Y2gocmUpO1xuICAgIGlmIChtYXRjaCA9PT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgaWYgKG1hdGNoWzJdICE9PSBsYWJlbClcbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgaWYgKHN0YXJ0ID09PSAtMSkge1xuICAgICAgaWYgKG1hdGNoWzFdICE9PSAnQkVHSU4nKVxuICAgICAgICBicmVhaztcbiAgICAgIHN0YXJ0ID0gaTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG1hdGNoWzFdICE9PSAnRU5EJylcbiAgICAgICAgYnJlYWs7XG4gICAgICBlbmQgPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIGlmIChzdGFydCA9PT0gLTEgfHwgZW5kID09PSAtMSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1BFTSBzZWN0aW9uIG5vdCBmb3VuZCBmb3I6ICcgKyBsYWJlbCk7XG5cbiAgdmFyIGJhc2U2NCA9IGxpbmVzLnNsaWNlKHN0YXJ0ICsgMSwgZW5kKS5qb2luKCcnKTtcbiAgLy8gUmVtb3ZlIGV4Y2Vzc2l2ZSBzeW1ib2xzXG4gIGJhc2U2NC5yZXBsYWNlKC9bXmEtejAtOVxcK1xcLz1dKy9naSwgJycpO1xuXG4gIHZhciBpbnB1dCA9IG5ldyBCdWZmZXIoYmFzZTY0LCAnYmFzZTY0Jyk7XG4gIHJldHVybiBERVJEZWNvZGVyLnByb3RvdHlwZS5kZWNvZGUuY2FsbCh0aGlzLCBpbnB1dCwgb3B0aW9ucyk7XG59O1xuIiwidmFyIGluaGVyaXRzID0gcmVxdWlyZSgndXRpbCcpLmluaGVyaXRzO1xudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcblxudmFyIGFzbjEgPSByZXF1aXJlKCcuLi9hc24xJyk7XG52YXIgYmFzZSA9IGFzbjEuYmFzZTtcbnZhciBiaWdudW0gPSBhc24xLmJpZ251bTtcblxuLy8gSW1wb3J0IERFUiBjb25zdGFudHNcbnZhciBkZXIgPSBhc24xLmNvbnN0YW50cy5kZXI7XG5cbmZ1bmN0aW9uIERFUkVuY29kZXIoZW50aXR5KSB7XG4gIHRoaXMuZW5jID0gJ2Rlcic7XG4gIHRoaXMubmFtZSA9IGVudGl0eS5uYW1lO1xuICB0aGlzLmVudGl0eSA9IGVudGl0eTtcblxuICAvLyBDb25zdHJ1Y3QgYmFzZSB0cmVlXG4gIHRoaXMudHJlZSA9IG5ldyBERVJOb2RlKCk7XG4gIHRoaXMudHJlZS5faW5pdChlbnRpdHkuYm9keSk7XG59O1xubW9kdWxlLmV4cG9ydHMgPSBERVJFbmNvZGVyO1xuXG5ERVJFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUoZGF0YSwgcmVwb3J0ZXIpIHtcbiAgcmV0dXJuIHRoaXMudHJlZS5fZW5jb2RlKGRhdGEsIHJlcG9ydGVyKS5qb2luKCk7XG59O1xuXG4vLyBUcmVlIG1ldGhvZHNcblxuZnVuY3Rpb24gREVSTm9kZShwYXJlbnQpIHtcbiAgYmFzZS5Ob2RlLmNhbGwodGhpcywgJ2RlcicsIHBhcmVudCk7XG59XG5pbmhlcml0cyhERVJOb2RlLCBiYXNlLk5vZGUpO1xuXG5ERVJOb2RlLnByb3RvdHlwZS5fZW5jb2RlQ29tcG9zaXRlID0gZnVuY3Rpb24gZW5jb2RlQ29tcG9zaXRlKHRhZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbWl0aXZlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQpIHtcbiAgdmFyIGVuY29kZWRUYWcgPSBlbmNvZGVUYWcodGFnLCBwcmltaXRpdmUsIGNscywgdGhpcy5yZXBvcnRlcik7XG5cbiAgLy8gU2hvcnQgZm9ybVxuICBpZiAoY29udGVudC5sZW5ndGggPCAweDgwKSB7XG4gICAgdmFyIGhlYWRlciA9IG5ldyBCdWZmZXIoMik7XG4gICAgaGVhZGVyWzBdID0gZW5jb2RlZFRhZztcbiAgICBoZWFkZXJbMV0gPSBjb250ZW50Lmxlbmd0aDtcbiAgICByZXR1cm4gdGhpcy5fY3JlYXRlRW5jb2RlckJ1ZmZlcihbIGhlYWRlciwgY29udGVudCBdKTtcbiAgfVxuXG4gIC8vIExvbmcgZm9ybVxuICAvLyBDb3VudCBvY3RldHMgcmVxdWlyZWQgdG8gc3RvcmUgbGVuZ3RoXG4gIHZhciBsZW5PY3RldHMgPSAxO1xuICBmb3IgKHZhciBpID0gY29udGVudC5sZW5ndGg7IGkgPj0gMHgxMDA7IGkgPj49IDgpXG4gICAgbGVuT2N0ZXRzKys7XG5cbiAgdmFyIGhlYWRlciA9IG5ldyBCdWZmZXIoMSArIDEgKyBsZW5PY3RldHMpO1xuICBoZWFkZXJbMF0gPSBlbmNvZGVkVGFnO1xuICBoZWFkZXJbMV0gPSAweDgwIHwgbGVuT2N0ZXRzO1xuXG4gIGZvciAodmFyIGkgPSAxICsgbGVuT2N0ZXRzLCBqID0gY29udGVudC5sZW5ndGg7IGogPiAwOyBpLS0sIGogPj49IDgpXG4gICAgaGVhZGVyW2ldID0gaiAmIDB4ZmY7XG5cbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUVuY29kZXJCdWZmZXIoWyBoZWFkZXIsIGNvbnRlbnQgXSk7XG59O1xuXG5ERVJOb2RlLnByb3RvdHlwZS5fZW5jb2RlU3RyID0gZnVuY3Rpb24gZW5jb2RlU3RyKHN0ciwgdGFnKSB7XG4gIGlmICh0YWcgPT09ICdvY3RzdHInKVxuICAgIHJldHVybiB0aGlzLl9jcmVhdGVFbmNvZGVyQnVmZmVyKHN0cik7XG4gIGVsc2UgaWYgKHRhZyA9PT0gJ2JpdHN0cicpXG4gICAgcmV0dXJuIHRoaXMuX2NyZWF0ZUVuY29kZXJCdWZmZXIoWyBzdHIudW51c2VkIHwgMCwgc3RyLmRhdGEgXSk7XG4gIGVsc2UgaWYgKHRhZyA9PT0gJ2lhNXN0cicgfHwgdGFnID09PSAndXRmOHN0cicpXG4gICAgcmV0dXJuIHRoaXMuX2NyZWF0ZUVuY29kZXJCdWZmZXIoc3RyKTtcbiAgcmV0dXJuIHRoaXMucmVwb3J0ZXIuZXJyb3IoJ0VuY29kaW5nIG9mIHN0cmluZyB0eXBlOiAnICsgdGFnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyB1bnN1cHBvcnRlZCcpO1xufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX2VuY29kZU9iamlkID0gZnVuY3Rpb24gZW5jb2RlT2JqaWQoaWQsIHZhbHVlcywgcmVsYXRpdmUpIHtcbiAgaWYgKHR5cGVvZiBpZCA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAoIXZhbHVlcylcbiAgICAgIHJldHVybiB0aGlzLnJlcG9ydGVyLmVycm9yKCdzdHJpbmcgb2JqaWQgZ2l2ZW4sIGJ1dCBubyB2YWx1ZXMgbWFwIGZvdW5kJyk7XG4gICAgaWYgKCF2YWx1ZXMuaGFzT3duUHJvcGVydHkoaWQpKVxuICAgICAgcmV0dXJuIHRoaXMucmVwb3J0ZXIuZXJyb3IoJ29iamlkIG5vdCBmb3VuZCBpbiB2YWx1ZXMgbWFwJyk7XG4gICAgaWQgPSB2YWx1ZXNbaWRdLnNwbGl0KC9bXFxzXFwuXSsvZyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpZC5sZW5ndGg7IGkrKylcbiAgICAgIGlkW2ldIHw9IDA7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShpZCkpIHtcbiAgICBpZCA9IGlkLnNsaWNlKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpZC5sZW5ndGg7IGkrKylcbiAgICAgIGlkW2ldIHw9IDA7XG4gIH1cblxuICBpZiAoIUFycmF5LmlzQXJyYXkoaWQpKSB7XG4gICAgcmV0dXJuIHRoaXMucmVwb3J0ZXIuZXJyb3IoJ29iamlkKCkgc2hvdWxkIGJlIGVpdGhlciBhcnJheSBvciBzdHJpbmcsICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdnb3Q6ICcgKyBKU09OLnN0cmluZ2lmeShpZCkpO1xuICB9XG5cbiAgaWYgKCFyZWxhdGl2ZSkge1xuICAgIGlmIChpZFsxXSA+PSA0MClcbiAgICAgIHJldHVybiB0aGlzLnJlcG9ydGVyLmVycm9yKCdTZWNvbmQgb2JqaWQgaWRlbnRpZmllciBPT0InKTtcbiAgICBpZC5zcGxpY2UoMCwgMiwgaWRbMF0gKiA0MCArIGlkWzFdKTtcbiAgfVxuXG4gIC8vIENvdW50IG51bWJlciBvZiBvY3RldHNcbiAgdmFyIHNpemUgPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGlkLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGlkZW50ID0gaWRbaV07XG4gICAgZm9yIChzaXplKys7IGlkZW50ID49IDB4ODA7IGlkZW50ID4+PSA3KVxuICAgICAgc2l6ZSsrO1xuICB9XG5cbiAgdmFyIG9iamlkID0gbmV3IEJ1ZmZlcihzaXplKTtcbiAgdmFyIG9mZnNldCA9IG9iamlkLmxlbmd0aCAtIDE7XG4gIGZvciAodmFyIGkgPSBpZC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBpZGVudCA9IGlkW2ldO1xuICAgIG9iamlkW29mZnNldC0tXSA9IGlkZW50ICYgMHg3ZjtcbiAgICB3aGlsZSAoKGlkZW50ID4+PSA3KSA+IDApXG4gICAgICBvYmppZFtvZmZzZXQtLV0gPSAweDgwIHwgKGlkZW50ICYgMHg3Zik7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fY3JlYXRlRW5jb2RlckJ1ZmZlcihvYmppZCk7XG59O1xuXG5mdW5jdGlvbiB0d28obnVtKSB7XG4gIGlmIChudW0gPCAxMClcbiAgICByZXR1cm4gJzAnICsgbnVtO1xuICBlbHNlXG4gICAgcmV0dXJuIG51bTtcbn1cblxuREVSTm9kZS5wcm90b3R5cGUuX2VuY29kZVRpbWUgPSBmdW5jdGlvbiBlbmNvZGVUaW1lKHRpbWUsIHRhZykge1xuICB2YXIgc3RyO1xuICB2YXIgZGF0ZSA9IG5ldyBEYXRlKHRpbWUpO1xuXG4gIGlmICh0YWcgPT09ICdnZW50aW1lJykge1xuICAgIHN0ciA9IFtcbiAgICAgIHR3byhkYXRlLmdldEZ1bGxZZWFyKCkpLFxuICAgICAgdHdvKGRhdGUuZ2V0VVRDTW9udGgoKSArIDEpLFxuICAgICAgdHdvKGRhdGUuZ2V0VVRDRGF0ZSgpKSxcbiAgICAgIHR3byhkYXRlLmdldFVUQ0hvdXJzKCkpLFxuICAgICAgdHdvKGRhdGUuZ2V0VVRDTWludXRlcygpKSxcbiAgICAgIHR3byhkYXRlLmdldFVUQ1NlY29uZHMoKSksXG4gICAgICAnWidcbiAgICBdLmpvaW4oJycpO1xuICB9IGVsc2UgaWYgKHRhZyA9PT0gJ3V0Y3RpbWUnKSB7XG4gICAgc3RyID0gW1xuICAgICAgdHdvKGRhdGUuZ2V0RnVsbFllYXIoKSAlIDEwMCksXG4gICAgICB0d28oZGF0ZS5nZXRVVENNb250aCgpICsgMSksXG4gICAgICB0d28oZGF0ZS5nZXRVVENEYXRlKCkpLFxuICAgICAgdHdvKGRhdGUuZ2V0VVRDSG91cnMoKSksXG4gICAgICB0d28oZGF0ZS5nZXRVVENNaW51dGVzKCkpLFxuICAgICAgdHdvKGRhdGUuZ2V0VVRDU2Vjb25kcygpKSxcbiAgICAgICdaJ1xuICAgIF0uam9pbignJyk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5yZXBvcnRlci5lcnJvcignRW5jb2RpbmcgJyArIHRhZyArICcgdGltZSBpcyBub3Qgc3VwcG9ydGVkIHlldCcpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX2VuY29kZVN0cihzdHIsICdvY3RzdHInKTtcbn07XG5cbkRFUk5vZGUucHJvdG90eXBlLl9lbmNvZGVOdWxsID0gZnVuY3Rpb24gZW5jb2RlTnVsbCgpIHtcbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUVuY29kZXJCdWZmZXIoJycpO1xufTtcblxuREVSTm9kZS5wcm90b3R5cGUuX2VuY29kZUludCA9IGZ1bmN0aW9uIGVuY29kZUludChudW0sIHZhbHVlcykge1xuICBpZiAodHlwZW9mIG51bSA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAoIXZhbHVlcylcbiAgICAgIHJldHVybiB0aGlzLnJlcG9ydGVyLmVycm9yKCdTdHJpbmcgaW50IG9yIGVudW0gZ2l2ZW4sIGJ1dCBubyB2YWx1ZXMgbWFwJyk7XG4gICAgaWYgKCF2YWx1ZXMuaGFzT3duUHJvcGVydHkobnVtKSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVwb3J0ZXIuZXJyb3IoJ1ZhbHVlcyBtYXAgZG9lc25cXCd0IGNvbnRhaW46ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkobnVtKSk7XG4gICAgfVxuICAgIG51bSA9IHZhbHVlc1tudW1dO1xuICB9XG5cbiAgLy8gQmlnbnVtLCBhc3N1bWUgYmlnIGVuZGlhblxuICBpZiAodHlwZW9mIG51bSAhPT0gJ251bWJlcicgJiYgIUJ1ZmZlci5pc0J1ZmZlcihudW0pKSB7XG4gICAgdmFyIG51bUFycmF5ID0gbnVtLnRvQXJyYXkoKTtcbiAgICBpZiAobnVtLnNpZ24gPT09IGZhbHNlICYmIG51bUFycmF5WzBdICYgMHg4MCkge1xuICAgICAgbnVtQXJyYXkudW5zaGlmdCgwKTtcbiAgICB9XG4gICAgbnVtID0gbmV3IEJ1ZmZlcihudW1BcnJheSk7XG4gIH1cblxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKG51bSkpIHtcbiAgICB2YXIgc2l6ZSA9IG51bS5sZW5ndGg7XG4gICAgaWYgKG51bS5sZW5ndGggPT09IDApXG4gICAgICBzaXplKys7XG5cbiAgICB2YXIgb3V0ID0gbmV3IEJ1ZmZlcihzaXplKTtcbiAgICBudW0uY29weShvdXQpO1xuICAgIGlmIChudW0ubGVuZ3RoID09PSAwKVxuICAgICAgb3V0WzBdID0gMFxuICAgIHJldHVybiB0aGlzLl9jcmVhdGVFbmNvZGVyQnVmZmVyKG91dCk7XG4gIH1cblxuICBpZiAobnVtIDwgMHg4MClcbiAgICByZXR1cm4gdGhpcy5fY3JlYXRlRW5jb2RlckJ1ZmZlcihudW0pO1xuXG4gIGlmIChudW0gPCAweDEwMClcbiAgICByZXR1cm4gdGhpcy5fY3JlYXRlRW5jb2RlckJ1ZmZlcihbMCwgbnVtXSk7XG5cbiAgdmFyIHNpemUgPSAxO1xuICBmb3IgKHZhciBpID0gbnVtOyBpID49IDB4MTAwOyBpID4+PSA4KVxuICAgIHNpemUrKztcblxuICB2YXIgb3V0ID0gbmV3IEFycmF5KHNpemUpO1xuICBmb3IgKHZhciBpID0gb3V0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgb3V0W2ldID0gbnVtICYgMHhmZjtcbiAgICBudW0gPj49IDg7XG4gIH1cbiAgaWYob3V0WzBdICYgMHg4MCkge1xuICAgIG91dC51bnNoaWZ0KDApO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUVuY29kZXJCdWZmZXIobmV3IEJ1ZmZlcihvdXQpKTtcbn07XG5cbkRFUk5vZGUucHJvdG90eXBlLl9lbmNvZGVCb29sID0gZnVuY3Rpb24gZW5jb2RlQm9vbCh2YWx1ZSkge1xuICByZXR1cm4gdGhpcy5fY3JlYXRlRW5jb2RlckJ1ZmZlcih2YWx1ZSA/IDB4ZmYgOiAwKTtcbn07XG5cbkRFUk5vZGUucHJvdG90eXBlLl91c2UgPSBmdW5jdGlvbiB1c2UoZW50aXR5LCBvYmopIHtcbiAgaWYgKHR5cGVvZiBlbnRpdHkgPT09ICdmdW5jdGlvbicpXG4gICAgZW50aXR5ID0gZW50aXR5KG9iaik7XG4gIHJldHVybiBlbnRpdHkuX2dldEVuY29kZXIoJ2RlcicpLnRyZWU7XG59O1xuXG5ERVJOb2RlLnByb3RvdHlwZS5fc2tpcERlZmF1bHQgPSBmdW5jdGlvbiBza2lwRGVmYXVsdChkYXRhQnVmZmVyLCByZXBvcnRlciwgcGFyZW50KSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcbiAgdmFyIGk7XG4gIGlmIChzdGF0ZVsnZGVmYXVsdCddID09PSBudWxsKVxuICAgIHJldHVybiBmYWxzZTtcblxuICB2YXIgZGF0YSA9IGRhdGFCdWZmZXIuam9pbigpO1xuICBpZiAoc3RhdGUuZGVmYXVsdEJ1ZmZlciA9PT0gdW5kZWZpbmVkKVxuICAgIHN0YXRlLmRlZmF1bHRCdWZmZXIgPSB0aGlzLl9lbmNvZGVWYWx1ZShzdGF0ZVsnZGVmYXVsdCddLCByZXBvcnRlciwgcGFyZW50KS5qb2luKCk7XG5cbiAgaWYgKGRhdGEubGVuZ3RoICE9PSBzdGF0ZS5kZWZhdWx0QnVmZmVyLmxlbmd0aClcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgZm9yIChpPTA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKVxuICAgIGlmIChkYXRhW2ldICE9PSBzdGF0ZS5kZWZhdWx0QnVmZmVyW2ldKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLy8gVXRpbGl0eSBtZXRob2RzXG5cbmZ1bmN0aW9uIGVuY29kZVRhZyh0YWcsIHByaW1pdGl2ZSwgY2xzLCByZXBvcnRlcikge1xuICB2YXIgcmVzO1xuXG4gIGlmICh0YWcgPT09ICdzZXFvZicpXG4gICAgdGFnID0gJ3NlcSc7XG4gIGVsc2UgaWYgKHRhZyA9PT0gJ3NldG9mJylcbiAgICB0YWcgPSAnc2V0JztcblxuICBpZiAoZGVyLnRhZ0J5TmFtZS5oYXNPd25Qcm9wZXJ0eSh0YWcpKVxuICAgIHJlcyA9IGRlci50YWdCeU5hbWVbdGFnXTtcbiAgZWxzZSBpZiAodHlwZW9mIHRhZyA9PT0gJ251bWJlcicgJiYgKHRhZyB8IDApID09PSB0YWcpXG4gICAgcmVzID0gdGFnO1xuICBlbHNlXG4gICAgcmV0dXJuIHJlcG9ydGVyLmVycm9yKCdVbmtub3duIHRhZzogJyArIHRhZyk7XG5cbiAgaWYgKHJlcyA+PSAweDFmKVxuICAgIHJldHVybiByZXBvcnRlci5lcnJvcignTXVsdGktb2N0ZXQgdGFnIGVuY29kaW5nIHVuc3VwcG9ydGVkJyk7XG5cbiAgaWYgKCFwcmltaXRpdmUpXG4gICAgcmVzIHw9IDB4MjA7XG5cbiAgcmVzIHw9IChkZXIudGFnQ2xhc3NCeU5hbWVbY2xzIHx8ICd1bml2ZXJzYWwnXSA8PCA2KTtcblxuICByZXR1cm4gcmVzO1xufVxuIiwidmFyIGVuY29kZXJzID0gZXhwb3J0cztcblxuZW5jb2RlcnMuZGVyID0gcmVxdWlyZSgnLi9kZXInKTtcbmVuY29kZXJzLnBlbSA9IHJlcXVpcmUoJy4vcGVtJyk7XG4iLCJ2YXIgaW5oZXJpdHMgPSByZXF1aXJlKCd1dGlsJykuaW5oZXJpdHM7XG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuXG52YXIgYXNuMSA9IHJlcXVpcmUoJy4uL2FzbjEnKTtcbnZhciBERVJFbmNvZGVyID0gcmVxdWlyZSgnLi9kZXInKTtcblxuZnVuY3Rpb24gUEVNRW5jb2RlcihlbnRpdHkpIHtcbiAgREVSRW5jb2Rlci5jYWxsKHRoaXMsIGVudGl0eSk7XG4gIHRoaXMuZW5jID0gJ3BlbSc7XG59O1xuaW5oZXJpdHMoUEVNRW5jb2RlciwgREVSRW5jb2Rlcik7XG5tb2R1bGUuZXhwb3J0cyA9IFBFTUVuY29kZXI7XG5cblBFTUVuY29kZXIucHJvdG90eXBlLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShkYXRhLCBvcHRpb25zKSB7XG4gIHZhciBidWYgPSBERVJFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGUuY2FsbCh0aGlzLCBkYXRhKTtcblxuICB2YXIgcCA9IGJ1Zi50b1N0cmluZygnYmFzZTY0Jyk7XG4gIHZhciBvdXQgPSBbICctLS0tLUJFR0lOICcgKyBvcHRpb25zLmxhYmVsICsgJy0tLS0tJyBdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHAubGVuZ3RoOyBpICs9IDY0KVxuICAgIG91dC5wdXNoKHAuc2xpY2UoaSwgaSArIDY0KSk7XG4gIG91dC5wdXNoKCctLS0tLUVORCAnICsgb3B0aW9ucy5sYWJlbCArICctLS0tLScpO1xuICByZXR1cm4gb3V0LmpvaW4oJ1xcbicpO1xufTtcbiIsIid1c2Ugc3RyaWN0J1xuXG52YXIgYXNuMSA9IHJlcXVpcmUoJy4vYXNuMS9hc24xJyk7XG52YXIgQk4gPSByZXF1aXJlKCcuL2FzbjEvYmlnbnVtL2JuJyk7XG5cbnZhciBFQ1ByaXZhdGVLZXlBU04gPSBhc24xLmRlZmluZSgnRUNQcml2YXRlS2V5JywgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXEoKS5vYmooXG4gICAgICAgIHRoaXMua2V5KCd2ZXJzaW9uJykuaW50KCksXG4gICAgICAgIHRoaXMua2V5KCdwcml2YXRlS2V5Jykub2N0c3RyKCksXG4gICAgICAgIHRoaXMua2V5KCdwYXJhbWV0ZXJzJykuZXhwbGljaXQoMCkub2JqaWQoKS5vcHRpb25hbCgpLFxuICAgICAgICB0aGlzLmtleSgncHVibGljS2V5JykuZXhwbGljaXQoMSkuYml0c3RyKCkub3B0aW9uYWwoKVxuICAgIClcbn0pXG5cbnZhciBTdWJqZWN0UHVibGljS2V5SW5mb0FTTiA9IGFzbjEuZGVmaW5lKCdTdWJqZWN0UHVibGljS2V5SW5mbycsIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2VxKCkub2JqKFxuICAgICAgICB0aGlzLmtleSgnYWxnb3JpdGhtJykuc2VxKCkub2JqKFxuICAgICAgICAgICAgdGhpcy5rZXkoXCJpZFwiKS5vYmppZCgpLFxuICAgICAgICAgICAgdGhpcy5rZXkoXCJjdXJ2ZVwiKS5vYmppZCgpXG4gICAgICAgICksXG4gICAgICAgIHRoaXMua2V5KCdwdWInKS5iaXRzdHIoKVxuICAgIClcbn0pXG5cbnZhciBjdXJ2ZXMgPSB7XG4gICAgc2VjcDI1NmsxOiB7XG4gICAgICAgIGN1cnZlUGFyYW1ldGVyczogWzEsIDMsIDEzMiwgMCwgMTBdLFxuICAgICAgICBwcml2YXRlUEVNT3B0aW9uczoge2xhYmVsOiAnRUMgUFJJVkFURSBLRVknfSxcbiAgICAgICAgcHVibGljUEVNT3B0aW9uczoge2xhYmVsOiAnUFVCTElDIEtFWSd9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhc3NlcnQodmFsLCBtc2cpIHtcbiAgICBpZiAoIXZhbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnIHx8ICdBc3NlcnRpb24gZmFpbGVkJylcbiAgICB9XG59XG5cbmZ1bmN0aW9uIEtleUVuY29kZXIob3B0aW9ucykge1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgYXNzZXJ0KGN1cnZlcy5oYXNPd25Qcm9wZXJ0eShvcHRpb25zKSwgJ1Vua25vd24gY3VydmUgJyArIG9wdGlvbnMpO1xuICAgICAgICBvcHRpb25zID0gY3VydmVzW29wdGlvbnNdXG4gICAgfVxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5hbGdvcml0aG1JRCA9IFsxLCAyLCA4NDAsIDEwMDQ1LCAyLCAxXVxufVxuXG5LZXlFbmNvZGVyLkVDUHJpdmF0ZUtleUFTTiA9IEVDUHJpdmF0ZUtleUFTTjtcbktleUVuY29kZXIuU3ViamVjdFB1YmxpY0tleUluZm9BU04gPSBTdWJqZWN0UHVibGljS2V5SW5mb0FTTjtcblxuS2V5RW5jb2Rlci5wcm90b3R5cGUucHJpdmF0ZUtleU9iamVjdCA9IGZ1bmN0aW9uKHJhd1ByaXZhdGVLZXksIHJhd1B1YmxpY0tleSkge1xuICAgIHZhciBwcml2YXRlS2V5T2JqZWN0ID0ge1xuICAgICAgICB2ZXJzaW9uOiBuZXcgQk4oMSksXG4gICAgICAgIHByaXZhdGVLZXk6IG5ldyBCdWZmZXIocmF3UHJpdmF0ZUtleSwgJ2hleCcpLFxuICAgICAgICBwYXJhbWV0ZXJzOiB0aGlzLm9wdGlvbnMuY3VydmVQYXJhbWV0ZXJzLFxuICAgICAgICBwZW1PcHRpb25zOiB7bGFiZWw6XCJFQyBQUklWQVRFIEtFWVwifVxuICAgIH07XG5cbiAgICBpZiAocmF3UHVibGljS2V5KSB7XG4gICAgICAgIHByaXZhdGVLZXlPYmplY3QucHVibGljS2V5ID0ge1xuICAgICAgICAgICAgdW51c2VkOiAwLFxuICAgICAgICAgICAgZGF0YTogbmV3IEJ1ZmZlcihyYXdQdWJsaWNLZXksICdoZXgnKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHByaXZhdGVLZXlPYmplY3Rcbn07XG5cbktleUVuY29kZXIucHJvdG90eXBlLnB1YmxpY0tleU9iamVjdCA9IGZ1bmN0aW9uKHJhd1B1YmxpY0tleSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGFsZ29yaXRobToge1xuICAgICAgICAgICAgaWQ6IHRoaXMuYWxnb3JpdGhtSUQsXG4gICAgICAgICAgICBjdXJ2ZTogdGhpcy5vcHRpb25zLmN1cnZlUGFyYW1ldGVyc1xuICAgICAgICB9LFxuICAgICAgICBwdWI6IHtcbiAgICAgICAgICAgIHVudXNlZDogMCxcbiAgICAgICAgICAgIGRhdGE6IG5ldyBCdWZmZXIocmF3UHVibGljS2V5LCAnaGV4JylcbiAgICAgICAgfSxcbiAgICAgICAgcGVtT3B0aW9uczogeyBsYWJlbCA6XCJQVUJMSUMgS0VZXCJ9XG4gICAgfVxufVxuXG5LZXlFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGVQcml2YXRlID0gZnVuY3Rpb24ocHJpdmF0ZUtleSwgb3JpZ2luYWxGb3JtYXQsIGRlc3RpbmF0aW9uRm9ybWF0KSB7XG4gICAgdmFyIHByaXZhdGVLZXlPYmplY3RcblxuICAgIC8qIFBhcnNlIHRoZSBpbmNvbWluZyBwcml2YXRlIGtleSBhbmQgY29udmVydCBpdCB0byBhIHByaXZhdGUga2V5IG9iamVjdCAqL1xuICAgIGlmIChvcmlnaW5hbEZvcm1hdCA9PT0gJ3JhdycpIHtcbiAgICAgICAgaWYgKCF0eXBlb2YgcHJpdmF0ZUtleSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93ICdwcml2YXRlIGtleSBtdXN0IGJlIGEgc3RyaW5nJ1xuICAgICAgICB9XG4gICAgICAgIHZhciBwcml2YXRlS2V5T2JqZWN0ID0gdGhpcy5vcHRpb25zLmN1cnZlLmtleUZyb21Qcml2YXRlKHByaXZhdGVLZXksICdoZXgnKSxcbiAgICAgICAgICAgIHJhd1B1YmxpY0tleSA9IHByaXZhdGVLZXlPYmplY3QuZ2V0UHVibGljKCdoZXgnKVxuICAgICAgICBwcml2YXRlS2V5T2JqZWN0ID0gdGhpcy5wcml2YXRlS2V5T2JqZWN0KHByaXZhdGVLZXksIHJhd1B1YmxpY0tleSlcbiAgICB9IGVsc2UgaWYgKG9yaWdpbmFsRm9ybWF0ID09PSAnZGVyJykge1xuICAgICAgICBpZiAodHlwZW9mIHByaXZhdGVLZXkgPT09ICdidWZmZXInKSB7XG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByaXZhdGVLZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBwcml2YXRlS2V5ID0gbmV3IEJ1ZmZlcihwcml2YXRlS2V5LCAnaGV4JylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93ICdwcml2YXRlIGtleSBtdXN0IGJlIGEgYnVmZmVyIG9yIGEgc3RyaW5nJ1xuICAgICAgICB9XG4gICAgICAgIHByaXZhdGVLZXlPYmplY3QgPSBFQ1ByaXZhdGVLZXlBU04uZGVjb2RlKHByaXZhdGVLZXksICdkZXInKVxuICAgIH0gZWxzZSBpZiAob3JpZ2luYWxGb3JtYXQgPT09ICdwZW0nKSB7XG4gICAgICAgIGlmICghdHlwZW9mIHByaXZhdGVLZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyAncHJpdmF0ZSBrZXkgbXVzdCBiZSBhIHN0cmluZydcbiAgICAgICAgfVxuICAgICAgICBwcml2YXRlS2V5T2JqZWN0ID0gRUNQcml2YXRlS2V5QVNOLmRlY29kZShwcml2YXRlS2V5LCAncGVtJywgdGhpcy5vcHRpb25zLnByaXZhdGVQRU1PcHRpb25zKVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93ICdpbnZhbGlkIHByaXZhdGUga2V5IGZvcm1hdCdcbiAgICB9XG5cbiAgICAvKiBFeHBvcnQgdGhlIHByaXZhdGUga2V5IG9iamVjdCB0byB0aGUgZGVzaXJlZCBmb3JtYXQgKi9cbiAgICBpZiAoZGVzdGluYXRpb25Gb3JtYXQgPT09ICdyYXcnKSB7XG4gICAgICAgIHJldHVybiBwcml2YXRlS2V5T2JqZWN0LnByaXZhdGVLZXkudG9TdHJpbmcoJ2hleCcpXG4gICAgfSBlbHNlIGlmIChkZXN0aW5hdGlvbkZvcm1hdCA9PT0gJ2RlcicpIHtcbiAgICAgICAgcmV0dXJuIEVDUHJpdmF0ZUtleUFTTi5lbmNvZGUocHJpdmF0ZUtleU9iamVjdCwgJ2RlcicpLnRvU3RyaW5nKCdoZXgnKVxuICAgIH0gZWxzZSBpZiAoZGVzdGluYXRpb25Gb3JtYXQgPT09ICdwZW0nKSB7XG4gICAgICAgIHJldHVybiBFQ1ByaXZhdGVLZXlBU04uZW5jb2RlKHByaXZhdGVLZXlPYmplY3QsICdwZW0nLCB0aGlzLm9wdGlvbnMucHJpdmF0ZVBFTU9wdGlvbnMpXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgJ2ludmFsaWQgZGVzdGluYXRpb24gZm9ybWF0IGZvciBwcml2YXRlIGtleSdcbiAgICB9XG59XG5cbktleUVuY29kZXIucHJvdG90eXBlLmVuY29kZVB1YmxpYyA9IGZ1bmN0aW9uKHB1YmxpY0tleSwgb3JpZ2luYWxGb3JtYXQsIGRlc3RpbmF0aW9uRm9ybWF0KSB7XG4gICAgdmFyIHB1YmxpY0tleU9iamVjdFxuXG4gICAgLyogUGFyc2UgdGhlIGluY29taW5nIHB1YmxpYyBrZXkgYW5kIGNvbnZlcnQgaXQgdG8gYSBwdWJsaWMga2V5IG9iamVjdCAqL1xuICAgIGlmIChvcmlnaW5hbEZvcm1hdCA9PT0gJ3JhdycpIHtcbiAgICAgICAgaWYgKCF0eXBlb2YgcHVibGljS2V5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgJ3B1YmxpYyBrZXkgbXVzdCBiZSBhIHN0cmluZydcbiAgICAgICAgfVxuICAgICAgICBwdWJsaWNLZXlPYmplY3QgPSB0aGlzLnB1YmxpY0tleU9iamVjdChwdWJsaWNLZXkpXG4gICAgfSBlbHNlIGlmIChvcmlnaW5hbEZvcm1hdCA9PT0gJ2RlcicpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwdWJsaWNLZXkgPT09ICdidWZmZXInKSB7XG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHB1YmxpY0tleSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHB1YmxpY0tleSA9IG5ldyBCdWZmZXIocHVibGljS2V5LCAnaGV4JylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93ICdwdWJsaWMga2V5IG11c3QgYmUgYSBidWZmZXIgb3IgYSBzdHJpbmcnXG4gICAgICAgIH1cbiAgICAgICAgcHVibGljS2V5T2JqZWN0ID0gU3ViamVjdFB1YmxpY0tleUluZm9BU04uZGVjb2RlKHB1YmxpY0tleSwgJ2RlcicpXG4gICAgfSBlbHNlIGlmIChvcmlnaW5hbEZvcm1hdCA9PT0gJ3BlbScpIHtcbiAgICAgICAgaWYgKCF0eXBlb2YgcHVibGljS2V5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgJ3B1YmxpYyBrZXkgbXVzdCBiZSBhIHN0cmluZydcbiAgICAgICAgfVxuICAgICAgICBwdWJsaWNLZXlPYmplY3QgPSBTdWJqZWN0UHVibGljS2V5SW5mb0FTTi5kZWNvZGUocHVibGljS2V5LCAncGVtJywgdGhpcy5vcHRpb25zLnB1YmxpY1BFTU9wdGlvbnMpXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgJ2ludmFsaWQgcHVibGljIGtleSBmb3JtYXQnXG4gICAgfVxuXG4gICAgLyogRXhwb3J0IHRoZSBwcml2YXRlIGtleSBvYmplY3QgdG8gdGhlIGRlc2lyZWQgZm9ybWF0ICovXG4gICAgaWYgKGRlc3RpbmF0aW9uRm9ybWF0ID09PSAncmF3Jykge1xuICAgICAgICByZXR1cm4gcHVibGljS2V5T2JqZWN0LnB1Yi5kYXRhLnRvU3RyaW5nKCdoZXgnKVxuICAgIH0gZWxzZSBpZiAoZGVzdGluYXRpb25Gb3JtYXQgPT09ICdkZXInKSB7XG4gICAgICAgIHJldHVybiBTdWJqZWN0UHVibGljS2V5SW5mb0FTTi5lbmNvZGUocHVibGljS2V5T2JqZWN0LCAnZGVyJykudG9TdHJpbmcoJ2hleCcpXG4gICAgfSBlbHNlIGlmIChkZXN0aW5hdGlvbkZvcm1hdCA9PT0gJ3BlbScpIHtcbiAgICAgICAgcmV0dXJuIFN1YmplY3RQdWJsaWNLZXlJbmZvQVNOLmVuY29kZShwdWJsaWNLZXlPYmplY3QsICdwZW0nLCB0aGlzLm9wdGlvbnMucHVibGljUEVNT3B0aW9ucylcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyAnaW52YWxpZCBkZXN0aW5hdGlvbiBmb3JtYXQgZm9yIHB1YmxpYyBrZXknXG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEtleUVuY29kZXI7IiwiY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuY29uc3QgeWF6bCA9IHJlcXVpcmUoXCJ5YXpsXCIpO1xuY29uc3QgeWF1emwgPSByZXF1aXJlKFwieWF1emxcIik7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IER1cGxleFN0cmVhbSA9IHJlcXVpcmUoXCIuL3V0aWxzL0R1cGxleFN0cmVhbVwiKTtcbmNvbnN0IFBhc3NUaHJvdWdoU3RyZWFtID0gcmVxdWlyZShcIi4vdXRpbHMvUGFzc1Rocm91Z2hTdHJlYW1cIik7XG5jb25zdCBpc1N0cmVhbSA9IHJlcXVpcmUoXCIuL3V0aWxzL2lzU3RyZWFtXCIpO1xuXG5jb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKTtcblxuY29uc3QgY291bnRGaWxlcyA9IHJlcXVpcmUoJy4vdXRpbHMvY291bnRGaWxlcycpO1xuXG5mdW5jdGlvbiBQc2tBcmNoaXZlcigpIHtcblxuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgY29uc3QgZXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgICB0aGlzLm9uID0gZXZlbnQub247XG4gICAgdGhpcy5vZmYgPSBldmVudC5vZmY7XG4gICAgdGhpcy5lbWl0ID0gZXZlbnQuZW1pdDtcblxuICAgIHRoaXMuemlwU3RyZWFtID0gZnVuY3Rpb24gKGlucHV0UGF0aCwgb3V0cHV0LCBjYWxsYmFjaykge1xuICAgICAgICBsZXQgZXh0ID0gXCJcIjtcbiAgICAgICAgY29uc3QgemlwRmlsZSA9IG5ldyB5YXpsLlppcEZpbGUoKTtcbiAgICAgICAgY29uc3QgcHRTdHJlYW0gPSBuZXcgUGFzc1Rocm91Z2hTdHJlYW0oKTtcblxuICAgICAgICBjb3VudEZpbGVzLmNvbXB1dGVTaXplKGlucHV0UGF0aCwgKGVyciwgdG90YWxTaXplKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9fYWRkVG9BcmNoaXZlUmVjdXJzaXZlbHkoemlwRmlsZSwgaW5wdXRQYXRoLCBcIlwiLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB6aXBGaWxlLmVuZCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lID0gcGF0aC5iYXNlbmFtZShpbnB1dFBhdGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNwbGl0RmlsZW5hbWUgPSBmaWxlbmFtZS5zcGxpdChcIi5cIik7XG4gICAgICAgICAgICAgICAgaWYgKHNwbGl0RmlsZW5hbWUubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ID0gXCIuXCIgKyBzcGxpdEZpbGVuYW1lW3NwbGl0RmlsZW5hbWUubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IG15U3RyZWFtID0gemlwRmlsZS5vdXRwdXRTdHJlYW0ucGlwZShwdFN0cmVhbSk7XG5cbiAgICAgICAgICAgICAgICBsZXQgcHJvZ3Jlc3NMZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgIGxldCB0b3RhbExlbmd0aCA9IDA7XG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUT0RPIHJldmlldyB0aGlzXG4gICAgICAgICAgICAgICAgICogSW4gYnJvd3NlciwgcGlwaW5nIHdpbGwgYmxvY2sgdGhlIGV2ZW50IGxvb3AgYW5kIHRoZSBzdGFjayBxdWV1ZSBpcyBub3QgY2FsbGVkLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIG15U3RyZWFtLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NMZW5ndGggKz0gY2h1bmsubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB0b3RhbExlbmd0aCArPSBjaHVuay5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb2dyZXNzTGVuZ3RoID4gMzAwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBteVN0cmVhbS5wYXVzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NMZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXlTdHJlYW0ucmVzdW1lKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbWl0UHJvZ3Jlc3ModG90YWxTaXplLCB0b3RhbExlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbXlTdHJlYW0ub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZW1pdFByb2dyZXNzKHRvdGFsU2l6ZSwgdG90YWxTaXplKTtcbiAgICAgICAgICAgICAgICAgICAgZW1pdFRvdGFsU2l6ZSh0b3RhbFNpemUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChpc1N0cmVhbS5pc1dyaXRhYmxlKG91dHB1dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgbXlTdHJlYW0ucGlwZShvdXRwdXQpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvdXRwdXQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICAgICBmcy5ta2RpcihvdXRwdXQsIHtyZWN1cnNpdmU6IHRydWV9LCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXN0aW5hdGlvblBhdGggPSBwYXRoLmpvaW4ob3V0cHV0LCBwYXRoLmJhc2VuYW1lKGlucHV0UGF0aCwgZXh0KSArIFwiLnppcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG15U3RyZWFtLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZGVzdGluYXRpb25QYXRoKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBfX2FkZFRvQXJjaGl2ZVJlY3Vyc2l2ZWx5KHppcEZpbGUsIGlucHV0UGF0aCwgcm9vdCA9ICcnLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHJvb3QgPSByb290IHx8ICcnO1xuICAgICAgICAgICAgICAgIGZzLnN0YXQoaW5wdXRQYXRoLCAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHppcEZpbGUuYWRkRmlsZShpbnB1dFBhdGgsIHBhdGguam9pbihyb290LCBwYXRoLmJhc2VuYW1lKGlucHV0UGF0aCkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcy5yZWFkZGlyKGlucHV0UGF0aCwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmX2xlbmd0aCA9IGZpbGVzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZl9hZGRfaW5kZXggPSAwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hlY2tTdGF0dXMgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmX2xlbmd0aCA9PT0gZl9hZGRfaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNoZWNrU3RhdHVzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXMuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBQYXRoID0gcGF0aC5qb2luKGlucHV0UGF0aCwgZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfX2FkZFRvQXJjaGl2ZVJlY3Vyc2l2ZWx5KHppcEZpbGUsIHRlbXBQYXRoLCBwYXRoLmpvaW4ocm9vdCwgcGF0aC5iYXNlbmFtZShpbnB1dFBhdGgpKSwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZfYWRkX2luZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgIH07XG5cbiAgICB0aGlzLnVuemlwU3RyZWFtID0gZnVuY3Rpb24gKGlucHV0LCBvdXRwdXRQYXRoLCBjYWxsYmFjaykge1xuXG4gICAgICAgIGxldCBzaXplID0gMDtcblxuICAgICAgICBmcy5zdGF0KGlucHV0LCAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgdG90YWxTaXplID0gc3RhdHMuc2l6ZTtcblxuXG4gICAgICAgICAgICB5YXV6bC5vcGVuKGlucHV0LCB7bGF6eUVudHJpZXM6IHRydWV9LCAoZXJyLCB6aXBGaWxlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBsZXQgcHJvZ3Jlc3NMZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgIGxldCB0b3RhbExlbmd0aCA9IDA7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlTmFtZXMgPSBbXTtcbiAgICAgICAgICAgICAgICB6aXBGaWxlLnJlYWRFbnRyeSgpO1xuICAgICAgICAgICAgICAgIHppcEZpbGUub25jZShcImVuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGVtaXRQcm9ncmVzcyh0b3RhbFNpemUsIHRvdGFsU2l6ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGZpbGVOYW1lcyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgemlwRmlsZS5vbihcImVudHJ5XCIsIChlbnRyeSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW50cnkuZmlsZU5hbWUuZW5kc1dpdGgocGF0aC5zZXApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB6aXBGaWxlLnJlYWRFbnRyeSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZvbGRlciA9IHBhdGguZGlybmFtZShlbnRyeS5maWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcy5ta2RpcihwYXRoLmpvaW4ob3V0cHV0UGF0aCwgZm9sZGVyKSwge3JlY3Vyc2l2ZTogdHJ1ZX0sICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB6aXBGaWxlLm9wZW5SZWFkU3RyZWFtKGVudHJ5LCAoZXJyLCByZWFkU3RyZWFtKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIFRPRE8gcmV2aWV3IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogSW4gYnJvd3NlciwgcGlwaW5nIHdpbGwgYmxvY2sgdGhlIGV2ZW50IGxvb3AgYW5kIHRoZSBzdGFjayBxdWV1ZSBpcyBub3QgY2FsbGVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkU3RyZWFtLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzTGVuZ3RoICs9IGNodW5rLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsTGVuZ3RoICs9IGNodW5rLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb2dyZXNzTGVuZ3RoID4gMzAwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZFN0cmVhbS5wYXVzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzTGVuZ3RoID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZFN0cmVhbS5yZXN1bWUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAzMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW1pdFByb2dyZXNzKHRvdGFsU2l6ZSwgdG90YWxMZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZFN0cmVhbS5vbihcImVuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6aXBGaWxlLnJlYWRFbnRyeSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHRTdHJlYW0gPSBuZXcgUGFzc1Rocm91Z2hTdHJlYW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZpbGVOYW1lID0gcGF0aC5qb2luKG91dHB1dFBhdGgsIGVudHJ5LmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZvbGRlciA9IHBhdGguZGlybmFtZShmaWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBTdHJlYW0gPSByZWFkU3RyZWFtLnBpcGUocHRTdHJlYW0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLm1rZGlyKGZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZSArPSBwdFN0cmVhbS5nZXRTaXplKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgb3V0cHV0ID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZU5hbWVzLnB1c2goZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcFN0cmVhbS5waXBlKG91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxuICAgIHRoaXMuemlwSW5NZW1vcnkgPSBmdW5jdGlvbiAoaW5wdXRPYmosIGRlcHRoLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCB6aXBGaWxlID0gbmV3IHlhemwuWmlwRmlsZSgpO1xuICAgICAgICBjb25zdCBkcyA9IG5ldyBEdXBsZXhTdHJlYW0oKTtcbiAgICAgICAgemlwUmVjdXJzaXZlbHkoemlwRmlsZSwgaW5wdXRPYmosIFwiXCIsIGRlcHRoLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB6aXBGaWxlLmVuZCgpO1xuICAgICAgICAgICAgbGV0IGJ1ZmZlciA9IEJ1ZmZlci5hbGxvYygwKTtcbiAgICAgICAgICAgIGRzLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICAgICAgYnVmZmVyID0gQnVmZmVyLmNvbmNhdChbYnVmZmVyLCBjaHVua10pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHppcEZpbGUub3V0cHV0U3RyZWFtLnBpcGUoZHMpLm9uKFwiZmluaXNoXCIsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBidWZmZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfTtcblxuICAgIHRoaXMudW56aXBJbk1lbW9yeSA9IGZ1bmN0aW9uIChpbnB1dFppcCwgY2FsbGJhY2spIHtcblxuICAgICAgICBmdW5jdGlvbiB1bnppcElucHV0KHppcEZpbGUpIHtcbiAgICAgICAgICAgIHppcEZpbGUucmVhZEVudHJ5KCk7XG4gICAgICAgICAgICBjb25zdCBvYmogPSB7fTtcbiAgICAgICAgICAgIHppcEZpbGUub25jZShcImVuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgb2JqKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB6aXBGaWxlLm9uKFwiZW50cnlcIiwgKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICAgICAgemlwRmlsZS5vcGVuUmVhZFN0cmVhbShlbnRyeSwgKGVyciwgcmVhZFN0cmVhbSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkcyA9IG5ldyBEdXBsZXhTdHJlYW0oKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0ciA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZWFkU3RyZWFtLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHppcEZpbGUucmVhZEVudHJ5KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBkcy5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gY2h1bmsudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVhZFN0cmVhbS5waXBlKGRzKS5vbihcImZpbmlzaFwiLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcGxpdEVudHJ5ID0gZW50cnkuZmlsZU5hbWUuc3BsaXQoXCIvXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZSA9IHNwbGl0RW50cnkucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRQcm9wc1JlY3Vyc2l2ZWx5KG9iaiwgc3BsaXRFbnRyeSwgdHlwZSwgbmV3IEJ1ZmZlcihzdHIpKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKGlucHV0WmlwKSkge1xuICAgICAgICAgICAgeWF1emwuZnJvbUJ1ZmZlcihpbnB1dFppcCwge2xhenlFbnRyaWVzOiB0cnVlfSwgKGVyciwgemlwRmlsZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHVuemlwSW5wdXQoemlwRmlsZSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImlucHV0IHNob3VsZCBiZSBhIGJ1ZmZlclwiKSk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBmdW5jdGlvbiB6aXBSZWN1cnNpdmVseSh6aXBGaWxlLCBvYmosIHJvb3QsIGRlcHRoLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoZGVwdGggPT09IDApIHtcbiAgICAgICAgICAgIHppcEZpbGUuYWRkQnVmZmVyKG5ldyBCdWZmZXIoSlNPTi5zdHJpbmdpZnkob2JqKSksIHJvb3QgKyBcIi9zdHJpbmdpZnlcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHppcEZpbGUuYWRkQnVmZmVyKEJ1ZmZlci5hbGxvYygwKSwgcm9vdCArIFwiL3VuZGVmaW5lZFwiKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygb2JqID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgemlwRmlsZS5hZGRCdWZmZXIobmV3IEJ1ZmZlcihvYmoudG9TdHJpbmcoKSksIHJvb3QgKyBcIi9udW1iZXJcIik7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHppcEZpbGUuYWRkQnVmZmVyKG5ldyBCdWZmZXIob2JqKSwgcm9vdCArIFwiL3N0cmluZ1wiKVxuICAgICAgICB9IGVsc2UgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgemlwRmlsZS5hZGRCdWZmZXIoQnVmZmVyLmFsbG9jKDApLCByb290ICsgXCIvbnVsbFwiKTtcbiAgICAgICAgfSBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqKSkge1xuICAgICAgICAgICAgemlwRmlsZS5hZGRCdWZmZXIob2JqLCByb290ICsgXCIvYnVmZmVyXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyZWFtLmlzUmVhZGFibGUob2JqKSkge1xuICAgICAgICAgICAgemlwRmlsZS5hZGRSZWFkU3RyZWFtKG9iaiwgcm9vdCArIFwiL3N0cmVhbVwiKTtcbiAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iai5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgemlwRmlsZS5hZGRCdWZmZXIoQnVmZmVyLmFsbG9jKDApLCByb290ICsgXCIvYXJyYXlcIilcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB6aXBSZWN1cnNpdmVseSh6aXBGaWxlLCBvYmpbaV0sIHJvb3QgKyBcIi9hcnJheS9cIiArIGksIGRlcHRoLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChvYmogJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGxldCBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiBvYmouY29uc3RydWN0b3IgPT09IE9iamVjdCkge1xuICAgICAgICAgICAgICAgIHppcEZpbGUuYWRkQnVmZmVyKEJ1ZmZlci5hbGxvYygwKSwgcm9vdCArIFwiL29iamVjdFwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZW5jb2RlZE9iaiA9IHt9O1xuICAgICAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKG9iaikuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGVuY29kZWRPYmpbZW5jb2RlVVJJQ29tcG9uZW50KGtleSldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgb2JqID0gZW5jb2RlZE9iajtcbiAgICAgICAgICAgICAgICBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICAgICAgICAgICAgICBrZXlzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVudHJ5TmFtZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJvb3QgPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudHJ5TmFtZSA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudHJ5TmFtZSA9IHJvb3QgKyBcIi9cIiArIGtleTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB6aXBSZWN1cnNpdmVseSh6aXBGaWxlLCBvYmpba2V5XSwgZW50cnlOYW1lLCBkZXB0aCAtIDEsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nob3VsZCBuZXZlciByZWFjaCB0aGlzJyk7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkUHJvcHNSZWN1cnNpdmVseShvYmosIHNwbGl0TmFtZSwgdHlwZSwgZGF0YSkge1xuICAgICAgICBpZiAoc3BsaXROYW1lLmxlbmd0aCA+PSAxKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wID0gZGVjb2RlVVJJQ29tcG9uZW50KHNwbGl0TmFtZS5zaGlmdCgpKTtcblxuICAgICAgICAgICAgaWYgKHNwbGl0TmFtZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndW5kZWZpbmVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdudWxsJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IHBhcnNlSW50KGRhdGEudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IGRhdGEudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHJlYW0nOlxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqW3Byb3BdID0gYnVmZmVyVG9TdHJlYW0oZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqW3Byb3BdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZ2lmeSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBvYmpbcHJvcF0gPSBKU09OLnBhcnNlKGRhdGEudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU2hvdWxkIG5ldmVyIHJlYWNoIHRoaXMnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChzcGxpdE5hbWVbMF0gPT09ICdhcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNwbGl0TmFtZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRQcm9wc1JlY3Vyc2l2ZWx5KG9ialtwcm9wXSwgc3BsaXROYW1lLCB0eXBlLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JqW3Byb3BdID0ge307XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYWRkUHJvcHNSZWN1cnNpdmVseShvYmpbcHJvcF0sIHNwbGl0TmFtZSwgdHlwZSwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBidWZmZXJUb1N0cmVhbShidWZmZXIpIHtcbiAgICAgICAgbGV0IHN0cmVhbSA9IG5ldyByZXF1aXJlKCdzdHJlYW0nKS5SZWFkYWJsZSgpO1xuICAgICAgICBzdHJlYW0ucHVzaChidWZmZXIpO1xuICAgICAgICBzdHJlYW0ucHVzaChudWxsKTtcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlbWl0UHJvZ3Jlc3ModG90YWwsIHByb2Nlc3NlZCkge1xuXG5cbiAgICAgICAgaWYgKHByb2Nlc3NlZCA+IHRvdGFsKSB7XG4gICAgICAgICAgICBwcm9jZXNzZWQgPSB0b3RhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gKDEwMCAqIHByb2Nlc3NlZCkgLyB0b3RhbDtcbiAgICAgICAgc2VsZi5lbWl0KCdwcm9ncmVzcycsIHByb2dyZXNzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlbWl0VG90YWxTaXplKHRvdGFsKSB7XG4gICAgICAgIHNlbGYuZW1pdCgndG90YWwnLCB0b3RhbCk7XG4gICAgfVxuXG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQc2tBcmNoaXZlcjsiLCJjb25zdCBzdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKTtcbmNvbnN0IHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5cbmNvbnN0IER1cGxleCA9IHN0cmVhbS5EdXBsZXg7XG5cbmZ1bmN0aW9uIER1cGxleFN0cmVhbShvcHRpb25zKSB7XG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBEdXBsZXhTdHJlYW0pKSB7XG5cdFx0cmV0dXJuIG5ldyBEdXBsZXhTdHJlYW0ob3B0aW9ucyk7XG5cdH1cblx0RHVwbGV4LmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG51dGlsLmluaGVyaXRzKER1cGxleFN0cmVhbSwgRHVwbGV4KTtcblxuRHVwbGV4U3RyZWFtLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbiAoY2h1bmssIGVuYywgY2IpIHtcblx0dGhpcy5wdXNoKGNodW5rKTtcblx0Y2IoKTtcbn07XG5cblxuRHVwbGV4U3RyZWFtLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uIChuKSB7XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRHVwbGV4U3RyZWFtOyIsImNvbnN0IHN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xuY29uc3QgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcblxuY29uc3QgUGFzc1Rocm91Z2ggPSBzdHJlYW0uUGFzc1Rocm91Z2g7XG5cbmZ1bmN0aW9uIFBhc3NUaHJvdWdoU3RyZWFtKG9wdGlvbnMpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUGFzc1Rocm91Z2hTdHJlYW0pKSB7XG4gICAgICAgIHJldHVybiBuZXcgUGFzc1Rocm91Z2hTdHJlYW0ob3B0aW9ucyk7XG4gICAgfVxuICAgIFBhc3NUaHJvdWdoLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgICBsZXQgc2l6ZSA9IDA7XG5cbiAgICB0aGlzLmFkZFRvU2l6ZSA9IGZ1bmN0aW9uIChhbW91bnQpIHtcbiAgICAgICAgc2l6ZSArPSBhbW91bnQ7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0U2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgfVxufVxuXG51dGlsLmluaGVyaXRzKFBhc3NUaHJvdWdoU3RyZWFtLCBQYXNzVGhyb3VnaCk7XG5cblBhc3NUaHJvdWdoU3RyZWFtLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbiAoY2h1bmssIGVuYywgY2IpIHtcbiAgICB0aGlzLmFkZFRvU2l6ZShjaHVuay5sZW5ndGgpO1xuICAgIHRoaXMucHVzaChjaHVuayk7XG4gICAgY2IoKTtcbn07XG5cblxuUGFzc1Rocm91Z2hTdHJlYW0ucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24gKG4pIHtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYXNzVGhyb3VnaFN0cmVhbTsiLCJjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuY29uc3QgeWF1emwgPSByZXF1aXJlKCd5YXV6bCcpO1xuXG5mdW5jdGlvbiBjb3VudEZpbGVzKGlucHV0UGF0aCwgY2FsbGJhY2spIHtcbiAgICBsZXQgdG90YWwgPSAwO1xuXG4gICAgZnMuc3RhdChpbnB1dFBhdGgsIChlcnIsIHN0YXRzKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sodW5kZWZpbmVkLCAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZzLnJlYWRkaXIoaW5wdXRQYXRoLCAoZXJyLCBmaWxlcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIHRvdGFsID0gZmlsZXMubGVuZ3RoO1xuICAgICAgICAgICAgbGV0IGNvdW50ID0gZmlsZXMubGVuZ3RoO1xuXG4gICAgICAgICAgICBpZiAodG90YWwgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sodW5kZWZpbmVkLCAwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZmlsZXMuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgICAgICAgICAgICBmcy5zdGF0KHBhdGguam9pbihpbnB1dFBhdGgsIGZpbGUpLCAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAtLXRvdGFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgY291bnRGaWxlcyhwYXRoLmpvaW4oaW5wdXRQYXRoLCBmaWxlKSwgKGVyciwgZmlsZXNOdW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsICs9IGZpbGVzTnVtYmVyO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoLS1jb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHRvdGFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLXRvdGFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoLS1jb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdG90YWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gY291bnRaaXBFbnRyaWVzKGlucHV0UGF0aCwgY2FsbGJhY2spIHtcbiAgICBsZXQgcHJvY2Vzc2VkID0gMDtcblxuICAgIHlhdXpsLm9wZW4oaW5wdXRQYXRoLCB7bGF6eUVudHJpZXM6IHRydWV9LCAoZXJyLCB6aXBGaWxlKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgemlwRmlsZS5yZWFkRW50cnkoKTtcbiAgICAgICAgemlwRmlsZS5vbmNlKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHByb2Nlc3NlZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHppcEZpbGUub24oXCJlbnRyeVwiLCAoZW50cnkpID0+IHtcbiAgICAgICAgICAgICsrcHJvY2Vzc2VkO1xuXG4gICAgICAgICAgICB6aXBGaWxlLnJlYWRFbnRyeSgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gY29tcHV0ZVNpemUoaW5wdXRQYXRoLCBjYWxsYmFjaykge1xuICAgIGxldCB0b3RhbFNpemUgPSAwO1xuICAgIGZzLnN0YXQoaW5wdXRQYXRoLCAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHVuZGVmaW5lZCwgc3RhdHMuc2l6ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmcy5yZWFkZGlyKGlucHV0UGF0aCwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICBsZXQgY291bnQgPSBmaWxlcy5sZW5ndGg7XG5cbiAgICAgICAgICAgIGlmIChjb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayh1bmRlZmluZWQsIDApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmaWxlcy5mb3JFYWNoKGZpbGUgPT4ge1xuICAgICAgICAgICAgICAgIGZzLnN0YXQocGF0aC5qb2luKGlucHV0UGF0aCwgZmlsZSksIChlcnIsIHN0YXRzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXB1dGVTaXplKHBhdGguam9pbihpbnB1dFBhdGgsIGZpbGUpLCAoZXJyLCBmaWxlc1NpemUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU2l6ZSArPSBmaWxlc1NpemU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoLS1jb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHRvdGFsU2l6ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU2l6ZSArPSBzdGF0cy5zaXplO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoLS1jb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdG90YWxTaXplKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNvdW50RmlsZXMsXG4gICAgY291bnRaaXBFbnRyaWVzLFxuICAgIGNvbXB1dGVTaXplXG59O1xuIiwiY29uc3QgY3J5cHRvID0gcmVxdWlyZSgnY3J5cHRvJyk7XG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5cbmNvbnN0IGFsZ29yaXRobSA9ICdhZXMtMjU2LWdjbSc7XG5cblxuY29uc3QgaXRlcmF0aW9uc19udW1iZXIgPSAxMDAwO1xuXG5mdW5jdGlvbiBlbmNvZGUoYnVmZmVyKSB7XG5cdHJldHVybiBidWZmZXIudG9TdHJpbmcoJ2Jhc2U2NCcpXG5cdFx0LnJlcGxhY2UoL1xcKy9nLCAnJylcblx0XHQucmVwbGFjZSgvXFwvL2csICcnKVxuXHRcdC5yZXBsYWNlKC89KyQvLCAnJyk7XG59XG5cbmZ1bmN0aW9uIGRlbGV0ZVJlY3Vyc2l2ZWx5KGlucHV0UGF0aCwgY2FsbGJhY2spIHtcblxuXHRmcy5zdGF0KGlucHV0UGF0aCwgZnVuY3Rpb24gKGVyciwgc3RhdHMpIHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHRjYWxsYmFjayhlcnIsIHN0YXRzKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKHN0YXRzLmlzRmlsZSgpKSB7XG5cdFx0XHRmcy51bmxpbmsoaW5wdXRQYXRoLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhlcnIsIG51bGwpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNhbGxiYWNrKG51bGwsIHRydWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9IGVsc2UgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcblx0XHRcdGZzLnJlYWRkaXIoaW5wdXRQYXRoLCBmdW5jdGlvbiAoZXJyLCBmaWxlcykge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZXJyLCBudWxsKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc3QgZl9sZW5ndGggPSBmaWxlcy5sZW5ndGg7XG5cdFx0XHRcdGxldCBmX2RlbGV0ZV9pbmRleCA9IDA7XG5cblx0XHRcdFx0Y29uc3QgY2hlY2tTdGF0dXMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0aWYgKGZfbGVuZ3RoID09PSBmX2RlbGV0ZV9pbmRleCkge1xuXHRcdFx0XHRcdFx0ZnMucm1kaXIoaW5wdXRQYXRoLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRcdFx0XHRjYWxsYmFjayhlcnIsIG51bGwpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdGNhbGxiYWNrKG51bGwsIHRydWUpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH07XG5cdFx0XHRcdGlmICghY2hlY2tTdGF0dXMoKSkge1xuXHRcdFx0XHRcdGZpbGVzLmZvckVhY2goZnVuY3Rpb24gKGZpbGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHRlbXBQYXRoID0gcGF0aC5qb2luKGlucHV0UGF0aCwgZmlsZSk7XG5cdFx0XHRcdFx0XHRkZWxldGVSZWN1cnNpdmVseSh0ZW1wUGF0aCwgZnVuY3Rpb24gcmVtb3ZlUmVjdXJzaXZlQ0IoZXJyLCBzdGF0dXMpIHtcblx0XHRcdFx0XHRcdFx0aWYgKCFlcnIpIHtcblx0XHRcdFx0XHRcdFx0XHRmX2RlbGV0ZV9pbmRleCsrO1xuXHRcdFx0XHRcdFx0XHRcdGNoZWNrU3RhdHVzKCk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0Y2FsbGJhY2soZXJyLCBudWxsKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0fSk7XG59XG5cblxuXG5cblxuZnVuY3Rpb24gY3JlYXRlUHNrSGFzaChkYXRhKSB7XG5cdGNvbnN0IHBza0hhc2ggPSBuZXcgUHNrSGFzaCgpO1xuXHRwc2tIYXNoLnVwZGF0ZShkYXRhKTtcblx0cmV0dXJuIHBza0hhc2guZGlnZXN0KCk7XG59XG5cbmZ1bmN0aW9uIFBza0hhc2goKSB7XG5cdGNvbnN0IHNoYTUxMiA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGE1MTInKTtcblx0Y29uc3Qgc2hhMjU2ID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpO1xuXG5cdGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG5cdFx0c2hhNTEyLnVwZGF0ZShkYXRhKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGRpZ2VzdCgpIHtcblx0XHRzaGEyNTYudXBkYXRlKHNoYTUxMi5kaWdlc3QoKSk7XG5cdFx0cmV0dXJuIHNoYTI1Ni5kaWdlc3QoKTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0dXBkYXRlLFxuXHRcdGRpZ2VzdFxuXHR9XG59XG5cblxuZnVuY3Rpb24gZ2VuZXJhdGVTYWx0KGlucHV0RGF0YSwgc2FsdExlbikge1xuXHRjb25zdCBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTUxMicpO1xuXHRoYXNoLnVwZGF0ZShpbnB1dERhdGEpO1xuXHRjb25zdCBkaWdlc3QgPSBCdWZmZXIuZnJvbShoYXNoLmRpZ2VzdCgnaGV4JyksICdiaW5hcnknKTtcblxuXHRyZXR1cm4gZGlnZXN0LnNsaWNlKDAsIHNhbHRMZW4pO1xufVxuXG5mdW5jdGlvbiBlbmNyeXB0KGRhdGEsIHBhc3N3b3JkKSB7XG5cdGNvbnN0IGtleVNhbHQgPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpO1xuXHRjb25zdCBrZXkgPSBjcnlwdG8ucGJrZGYyU3luYyhwYXNzd29yZCwga2V5U2FsdCwgaXRlcmF0aW9uc19udW1iZXIsIDMyLCAnc2hhNTEyJyk7XG5cblx0Y29uc3QgYWFkU2FsdCA9IGNyeXB0by5yYW5kb21CeXRlcygzMik7XG5cdGNvbnN0IGFhZCA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBhYWRTYWx0LCBpdGVyYXRpb25zX251bWJlciwgMzIsICdzaGE1MTInKTtcblxuXHRjb25zdCBzYWx0ID0gQnVmZmVyLmNvbmNhdChba2V5U2FsdCwgYWFkU2FsdF0pO1xuXHRjb25zdCBpdiA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBzYWx0LCBpdGVyYXRpb25zX251bWJlciwgMTIsICdzaGE1MTInKTtcblxuXHRjb25zdCBjaXBoZXIgPSBjcnlwdG8uY3JlYXRlQ2lwaGVyaXYoYWxnb3JpdGhtLCBrZXksIGl2KTtcblx0Y2lwaGVyLnNldEFBRChhYWQpO1xuXHRsZXQgZW5jcnlwdGVkVGV4dCA9IGNpcGhlci51cGRhdGUoZGF0YSwgJ2JpbmFyeScpO1xuXHRjb25zdCBmaW5hbCA9IEJ1ZmZlci5mcm9tKGNpcGhlci5maW5hbCgnYmluYXJ5JyksICdiaW5hcnknKTtcblx0Y29uc3QgdGFnID0gY2lwaGVyLmdldEF1dGhUYWcoKTtcblxuXHRlbmNyeXB0ZWRUZXh0ID0gQnVmZmVyLmNvbmNhdChbZW5jcnlwdGVkVGV4dCwgZmluYWxdKTtcblxuXHRyZXR1cm4gQnVmZmVyLmNvbmNhdChbc2FsdCwgZW5jcnlwdGVkVGV4dCwgdGFnXSk7XG59XG5cbmZ1bmN0aW9uIGRlY3J5cHQoZW5jcnlwdGVkRGF0YSwgcGFzc3dvcmQpIHtcblx0Y29uc3Qgc2FsdCA9IGVuY3J5cHRlZERhdGEuc2xpY2UoMCwgNjQpO1xuXHRjb25zdCBrZXlTYWx0ID0gc2FsdC5zbGljZSgwLCAzMik7XG5cdGNvbnN0IGFhZFNhbHQgPSBzYWx0LnNsaWNlKC0zMik7XG5cblx0Y29uc3QgaXYgPSBjcnlwdG8ucGJrZGYyU3luYyhwYXNzd29yZCwgc2FsdCwgaXRlcmF0aW9uc19udW1iZXIsIDEyLCAnc2hhNTEyJyk7XG5cdGNvbnN0IGtleSA9IGNyeXB0by5wYmtkZjJTeW5jKHBhc3N3b3JkLCBrZXlTYWx0LCBpdGVyYXRpb25zX251bWJlciwgMzIsICdzaGE1MTInKTtcblx0Y29uc3QgYWFkID0gY3J5cHRvLnBia2RmMlN5bmMocGFzc3dvcmQsIGFhZFNhbHQsIGl0ZXJhdGlvbnNfbnVtYmVyLCAzMiwgJ3NoYTUxMicpO1xuXG5cdGNvbnN0IGNpcGhlcnRleHQgPSBlbmNyeXB0ZWREYXRhLnNsaWNlKDY0LCBlbmNyeXB0ZWREYXRhLmxlbmd0aCAtIDE2KTtcblx0Y29uc3QgdGFnID0gZW5jcnlwdGVkRGF0YS5zbGljZSgtMTYpO1xuXG5cdGNvbnN0IGRlY2lwaGVyID0gY3J5cHRvLmNyZWF0ZURlY2lwaGVyaXYoYWxnb3JpdGhtLCBrZXksIGl2KTtcblx0ZGVjaXBoZXIuc2V0QXV0aFRhZyh0YWcpO1xuXHRkZWNpcGhlci5zZXRBQUQoYWFkKTtcblxuXHRsZXQgcGxhaW50ZXh0ID0gQnVmZmVyLmZyb20oZGVjaXBoZXIudXBkYXRlKGNpcGhlcnRleHQsICdiaW5hcnknKSwgJ2JpbmFyeScpO1xuXHRjb25zdCBmaW5hbCA9IEJ1ZmZlci5mcm9tKGRlY2lwaGVyLmZpbmFsKCdiaW5hcnknKSwgJ2JpbmFyeScpO1xuXHRwbGFpbnRleHQgPSBCdWZmZXIuY29uY2F0KFtwbGFpbnRleHQsIGZpbmFsXSk7XG5cdHJldHVybiBwbGFpbnRleHQ7XG59XG5cbmZ1bmN0aW9uIGVuY3J5cHRPYmplY3RJbk1lbW9yeShpbnB1dE9iaiwgcGFzc3dvcmQsIGRlcHRoLCBjYWxsYmFjaykge1xuXHRjb25zdCBQc2tBcmNoaXZlciA9IHJlcXVpcmUoXCIuLi9wc2stYXJjaGl2ZXJcIik7XG5cdGNvbnN0IGFyY2hpdmVyID0gbmV3IFBza0FyY2hpdmVyKCk7XG5cblx0YXJjaGl2ZXIuemlwSW5NZW1vcnkoaW5wdXRPYmosIGRlcHRoLCBmdW5jdGlvbiAoZXJyLCB6aXBwZWRPYmopIHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHR9XG5cdFx0Y29uc3QgY2lwaGVyVGV4dCA9IGVuY3J5cHQoemlwcGVkT2JqLCBwYXNzd29yZCk7XG5cdFx0Y2FsbGJhY2sobnVsbCwgY2lwaGVyVGV4dCk7XG5cdH0pXG59XG5cbmZ1bmN0aW9uIGRlY3J5cHRPYmplY3RJbk1lbW9yeShlbmNyeXB0ZWRPYmplY3QsIHBhc3N3b3JkLCBjYWxsYmFjaykge1xuXHRjb25zdCBhcmNoaXZlciA9IG5ldyBQc2tBcmNoaXZlcigpO1xuXG5cdGNvbnN0IHppcHBlZE9iamVjdCA9IGRlY3J5cHQoZW5jcnlwdGVkT2JqZWN0LCBwYXNzd29yZCk7XG5cdGFyY2hpdmVyLnVuemlwSW5NZW1vcnkoemlwcGVkT2JqZWN0LCBmdW5jdGlvbiAoZXJyLCBvYmopIHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHR9XG5cdFx0Y2FsbGJhY2sobnVsbCwgb2JqKTtcblx0fSlcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0Y3JlYXRlUHNrSGFzaCxcblx0ZW5jcnlwdCxcblx0ZW5jcnlwdE9iamVjdEluTWVtb3J5LFxuXHRkZWNyeXB0LFxuXHRkZWNyeXB0T2JqZWN0SW5NZW1vcnksXG5cdGRlbGV0ZVJlY3Vyc2l2ZWx5LFxuXHRlbmNvZGUsXG5cdGdlbmVyYXRlU2FsdCxcblx0aXRlcmF0aW9uc19udW1iZXIsXG5cdGFsZ29yaXRobSxcblx0UHNrSGFzaFxufTtcblxuIiwiY29uc3Qgc3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJyk7XG5cblxuZnVuY3Rpb24gaXNTdHJlYW0gKG9iaikge1xuXHRyZXR1cm4gb2JqIGluc3RhbmNlb2Ygc3RyZWFtLlN0cmVhbSB8fCBvYmogaW5zdGFuY2VvZiBzdHJlYW0uRHVwbGV4O1xufVxuXG5cbmZ1bmN0aW9uIGlzUmVhZGFibGUgKG9iaikge1xuXHRyZXR1cm4gaXNTdHJlYW0ob2JqKSAmJiB0eXBlb2Ygb2JqLl9yZWFkID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBvYmouX3JlYWRhYmxlU3RhdGUgPT09ICdvYmplY3QnXG59XG5cblxuZnVuY3Rpb24gaXNXcml0YWJsZSAob2JqKSB7XG5cdHJldHVybiBpc1N0cmVhbShvYmopICYmIHR5cGVvZiBvYmouX3dyaXRlID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBvYmouX3dyaXRhYmxlU3RhdGUgPT09ICdvYmplY3QnXG59XG5cblxuZnVuY3Rpb24gaXNEdXBsZXggKG9iaikge1xuXHRyZXR1cm4gaXNSZWFkYWJsZShvYmopICYmIGlzV3JpdGFibGUob2JqKVxufVxuXG5cbm1vZHVsZS5leHBvcnRzICAgICAgICAgICAgPSBpc1N0cmVhbTtcbm1vZHVsZS5leHBvcnRzLmlzUmVhZGFibGUgPSBpc1JlYWRhYmxlO1xubW9kdWxlLmV4cG9ydHMuaXNXcml0YWJsZSA9IGlzV3JpdGFibGU7XG5tb2R1bGUuZXhwb3J0cy5pc0R1cGxleCAgID0gaXNEdXBsZXg7IiwiLypcbiBTaWduU2VucyBoZWxwZXIgZnVuY3Rpb25zXG4gKi9cbmNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpO1xuXG5leHBvcnRzLndpcGVPdXRzaWRlUGF5bG9hZCA9IGZ1bmN0aW9uIHdpcGVPdXRzaWRlUGF5bG9hZChoYXNoU3RyaW5nSGV4YSwgcG9zLCBzaXplKXtcbiAgICB2YXIgcmVzdWx0O1xuICAgIHZhciBzeiA9IGhhc2hTdHJpbmdIZXhhLmxlbmd0aDtcblxuICAgIHZhciBlbmQgPSAocG9zICsgc2l6ZSkgJSBzejtcblxuICAgIGlmKHBvcyA8IGVuZCl7XG4gICAgICAgIHJlc3VsdCA9ICcwJy5yZXBlYXQocG9zKSArICBoYXNoU3RyaW5nSGV4YS5zdWJzdHJpbmcocG9zLCBlbmQpICsgJzAnLnJlcGVhdChzeiAtIGVuZCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXN1bHQgPSBoYXNoU3RyaW5nSGV4YS5zdWJzdHJpbmcoMCwgZW5kKSArICcwJy5yZXBlYXQocG9zIC0gZW5kKSArIGhhc2hTdHJpbmdIZXhhLnN1YnN0cmluZyhwb3MsIHN6KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuXG5cbmV4cG9ydHMuZXh0cmFjdFBheWxvYWQgPSBmdW5jdGlvbiBleHRyYWN0UGF5bG9hZChoYXNoU3RyaW5nSGV4YSwgcG9zLCBzaXplKXtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgdmFyIHN6ID0gaGFzaFN0cmluZ0hleGEubGVuZ3RoO1xuICAgIHZhciBlbmQgPSAocG9zICsgc2l6ZSkgJSBzejtcblxuICAgIGlmKCBwb3MgPCBlbmQpe1xuICAgICAgICByZXN1bHQgPSBoYXNoU3RyaW5nSGV4YS5zdWJzdHJpbmcocG9zLCBwb3MgKyBzaXplKTtcbiAgICB9IGVsc2V7XG5cbiAgICAgICAgaWYoMCAhPSBlbmQpe1xuICAgICAgICAgICAgcmVzdWx0ID0gaGFzaFN0cmluZ0hleGEuc3Vic3RyaW5nKDAsIGVuZClcbiAgICAgICAgfSAgZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQgPSBcIlwiO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCArPSBoYXNoU3RyaW5nSGV4YS5zdWJzdHJpbmcocG9zLCBzeik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cblxuXG5leHBvcnRzLmZpbGxQYXlsb2FkID0gZnVuY3Rpb24gZmlsbFBheWxvYWQocGF5bG9hZCwgcG9zLCBzaXplKXtcbiAgICB2YXIgc3ogPSA2NDtcbiAgICB2YXIgcmVzdWx0ID0gXCJcIjtcblxuICAgIHZhciBlbmQgPSAocG9zICsgc2l6ZSkgJSBzejtcblxuICAgIGlmKCBwb3MgPCBlbmQpe1xuICAgICAgICByZXN1bHQgPSAnMCcucmVwZWF0KHBvcykgKyBwYXlsb2FkICsgJzAnLnJlcGVhdChzeiAtIGVuZCk7XG4gICAgfSBlbHNle1xuICAgICAgICByZXN1bHQgPSBwYXlsb2FkLnN1YnN0cmluZygwLGVuZCk7XG4gICAgICAgIHJlc3VsdCArPSAnMCcucmVwZWF0KHBvcyAtIGVuZCk7XG4gICAgICAgIHJlc3VsdCArPSBwYXlsb2FkLnN1YnN0cmluZyhlbmQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5cblxuZXhwb3J0cy5nZW5lcmF0ZVBvc0hhc2hYVGltZXMgPSBmdW5jdGlvbiBnZW5lcmF0ZVBvc0hhc2hYVGltZXMoYnVmZmVyLCBwb3MsIHNpemUsIGNvdW50KXsgLy9nZW5lcmF0ZSBwb3NpdGlvbmFsIGhhc2hcbiAgICB2YXIgcmVzdWx0ICA9IGJ1ZmZlci50b1N0cmluZyhcImhleFwiKTtcblxuICAgIC8qaWYocG9zICE9IC0xIClcbiAgICAgICAgcmVzdWx0W3Bvc10gPSAwOyAqL1xuXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspe1xuICAgICAgICB2YXIgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKTtcbiAgICAgICAgcmVzdWx0ID0gZXhwb3J0cy53aXBlT3V0c2lkZVBheWxvYWQocmVzdWx0LCBwb3MsIHNpemUpO1xuICAgICAgICBoYXNoLnVwZGF0ZShyZXN1bHQpO1xuICAgICAgICByZXN1bHQgPSBoYXNoLmRpZ2VzdCgnaGV4Jyk7XG4gICAgfVxuICAgIHJldHVybiBleHBvcnRzLndpcGVPdXRzaWRlUGF5bG9hZChyZXN1bHQsIHBvcywgc2l6ZSk7XG59XG5cbmV4cG9ydHMuaGFzaFN0cmluZ0FycmF5ID0gZnVuY3Rpb24gKGNvdW50ZXIsIGFyciwgcGF5bG9hZFNpemUpe1xuXG4gICAgY29uc3QgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKTtcbiAgICB2YXIgcmVzdWx0ID0gY291bnRlci50b1N0cmluZygxNik7XG5cbiAgICBmb3IodmFyIGkgPSAwIDsgaSA8IDY0OyBpKyspe1xuICAgICAgICByZXN1bHQgKz0gZXhwb3J0cy5leHRyYWN0UGF5bG9hZChhcnJbaV0saSwgcGF5bG9hZFNpemUpO1xuICAgIH1cblxuICAgIGhhc2gudXBkYXRlKHJlc3VsdCk7XG4gICAgdmFyIHJlc3VsdCA9IGhhc2guZGlnZXN0KCdoZXgnKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5cblxuXG5cblxuZnVuY3Rpb24gZHVtcE1lbWJlcihvYmope1xuICAgIHZhciB0eXBlID0gQXJyYXkuaXNBcnJheShvYmopID8gXCJhcnJheVwiIDogdHlwZW9mIG9iajtcbiAgICBpZihvYmogPT09IG51bGwpe1xuICAgICAgICByZXR1cm4gXCJudWxsXCI7XG4gICAgfVxuICAgIGlmKG9iaiA9PT0gdW5kZWZpbmVkKXtcbiAgICAgICAgcmV0dXJuIFwidW5kZWZpbmVkXCI7XG4gICAgfVxuXG4gICAgc3dpdGNoKHR5cGUpe1xuICAgICAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgICAgIGNhc2UgXCJzdHJpbmdcIjpyZXR1cm4gb2JqLnRvU3RyaW5nKCk7IGJyZWFrO1xuICAgICAgICBjYXNlIFwib2JqZWN0XCI6IHJldHVybiBleHBvcnRzLmR1bXBPYmplY3RGb3JIYXNoaW5nKG9iaik7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiYm9vbGVhblwiOiByZXR1cm4gIG9iaj8gXCJ0cnVlXCI6IFwiZmFsc2VcIjsgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJhcnJheVwiOlxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IFwiXCI7XG4gICAgICAgICAgICBmb3IodmFyIGk9MDsgaSA8IG9iai5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGV4cG9ydHMuZHVtcE9iamVjdEZvckhhc2hpbmcob2JqW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlR5cGUgXCIgKyAgdHlwZSArIFwiIGNhbm5vdCBiZSBjcnlwdG9ncmFwaGljYWxseSBkaWdlc3RlZFwiKTtcbiAgICB9XG5cbn1cblxuXG5leHBvcnRzLmR1bXBPYmplY3RGb3JIYXNoaW5nID0gZnVuY3Rpb24ob2JqKXtcbiAgICB2YXIgcmVzdWx0ID0gXCJcIjtcblxuICAgIGlmKG9iaiA9PT0gbnVsbCl7XG4gICAgICAgIHJldHVybiBcIm51bGxcIjtcbiAgICB9XG4gICAgaWYob2JqID09PSB1bmRlZmluZWQpe1xuICAgICAgICByZXR1cm4gXCJ1bmRlZmluZWRcIjtcbiAgICB9XG5cbiAgICB2YXIgYmFzaWNUeXBlcyA9IHtcbiAgICAgICAgXCJhcnJheVwiICAgICA6IHRydWUsXG4gICAgICAgIFwibnVtYmVyXCIgICAgOiB0cnVlLFxuICAgICAgICBcImJvb2xlYW5cIiAgIDogdHJ1ZSxcbiAgICAgICAgXCJzdHJpbmdcIiAgICA6IHRydWUsXG4gICAgICAgIFwib2JqZWN0XCIgICAgOiBmYWxzZVxuICAgIH1cblxuICAgIHZhciB0eXBlID0gQXJyYXkuaXNBcnJheShvYmopID8gXCJhcnJheVwiIDogdHlwZW9mIG9iajtcbiAgICBpZiggYmFzaWNUeXBlc1t0eXBlXSl7XG4gICAgICAgIHJldHVybiBkdW1wTWVtYmVyKG9iaik7XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuICAgIGtleXMuc29ydCgpO1xuXG5cbiAgICBmb3IodmFyIGk9MDsgaSA8IGtleXMubGVuZ3RoOyBpKyspe1xuICAgICAgICByZXN1bHQgKz0gZHVtcE1lbWJlcihrZXlzW2ldKTtcbiAgICAgICAgcmVzdWx0ICs9IGR1bXBNZW1iZXIob2JqW2tleXNbaV1dKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5cbmV4cG9ydHMuaGFzaFZhbHVlcyAgPSBmdW5jdGlvbiAodmFsdWVzKXtcbiAgICBjb25zdCBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpO1xuICAgIHZhciByZXN1bHQgPSBleHBvcnRzLmR1bXBPYmplY3RGb3JIYXNoaW5nKHZhbHVlcyk7XG4gICAgaGFzaC51cGRhdGUocmVzdWx0KTtcbiAgICByZXR1cm4gaGFzaC5kaWdlc3QoJ2hleCcpO1xufTtcblxuZXhwb3J0cy5nZXRKU09ORnJvbVNpZ25hdHVyZSA9IGZ1bmN0aW9uIGdldEpTT05Gcm9tU2lnbmF0dXJlKHNpZ25hdHVyZSwgc2l6ZSl7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgcHJvb2Y6W11cbiAgICB9O1xuICAgIHZhciBhID0gc2lnbmF0dXJlLnNwbGl0KFwiOlwiKTtcbiAgICByZXN1bHQuYWdlbnQgICAgICAgID0gYVswXTtcbiAgICByZXN1bHQuY291bnRlciAgICAgID0gIHBhcnNlSW50KGFbMV0sIFwiaGV4XCIpO1xuICAgIHJlc3VsdC5uZXh0UHVibGljICAgPSAgYVsyXTtcblxuICAgIHZhciBwcm9vZiA9IGFbM11cblxuXG4gICAgaWYocHJvb2YubGVuZ3RoL3NpemUgIT0gNjQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBzaWduYXR1cmUgXCIgKyBwcm9vZik7XG4gICAgfVxuXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IDY0OyBpKyspe1xuICAgICAgICByZXN1bHQucHJvb2YucHVzaChleHBvcnRzLmZpbGxQYXlsb2FkKHByb29mLnN1YnN0cmluZyhpICogc2l6ZSwoaSsxKSAqIHNpemUgKSwgaSwgc2l6ZSkpXG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0cy5jcmVhdGVTaWduYXR1cmUgPSBmdW5jdGlvbiAoYWdlbnQsY291bnRlciwgbmV4dFB1YmxpYywgYXJyLCBzaXplKXtcbiAgICB2YXIgcmVzdWx0ID0gXCJcIjtcblxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspe1xuICAgICAgICByZXN1bHQgKz0gZXhwb3J0cy5leHRyYWN0UGF5bG9hZChhcnJbaV0sIGkgLCBzaXplKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYWdlbnQgKyBcIjpcIiArIGNvdW50ZXIgKyBcIjpcIiArIG5leHRQdWJsaWMgKyBcIjpcIiArIHJlc3VsdDtcbn0iLCIvKlxuSW5pdGlhbCBMaWNlbnNlOiAoYykgQXhpb2xvZ2ljIFJlc2VhcmNoICYgQWxib2FpZSBTw65uaWPEgy5cbkNvbnRyaWJ1dG9yczogQXhpb2xvZ2ljIFJlc2VhcmNoICwgUHJpdmF0ZVNreSBwcm9qZWN0XG5Db2RlIExpY2Vuc2U6IExHUEwgb3IgTUlULlxuKi9cblxuXG4vKipcbiAqICAgVXN1YWxseSBhbiBldmVudCBjb3VsZCBjYXVzZSBleGVjdXRpb24gb2Ygb3RoZXIgY2FsbGJhY2sgZXZlbnRzIC4gV2Ugc2F5IHRoYXQgaXMgYSBsZXZlbCAxIGV2ZW50IGlmIGlzIGNhdXNlZWQgYnkgYSBsZXZlbCAwIGV2ZW50IGFuZCBzbyBvblxuICpcbiAqICAgICAgU291bmRQdWJTdWIgcHJvdmlkZXMgaW50dWl0aXZlIHJlc3VsdHMgcmVnYXJkaW5nIHRvIGFzeW5jaHJvbm91cyBjYWxscyBvZiBjYWxsYmFja3MgYW5kIGNvbXB1dGVkIHZhbHVlcy9leHByZXNzaW9uczpcbiAqICAgd2UgcHJldmVudCBpbW1lZGlhdGUgZXhlY3V0aW9uIG9mIGV2ZW50IGNhbGxiYWNrcyB0byBlbnN1cmUgdGhlIGludHVpdGl2ZSBmaW5hbCByZXN1bHQgaXMgZ3VhcmFudGVlZCBhcyBsZXZlbCAwIGV4ZWN1dGlvblxuICogICB3ZSBndWFyYW50ZWUgdGhhdCBhbnkgY2FsbGJhY2sgZnVuY3Rpb24gaXMgXCJyZS1lbnRyYW50XCJcbiAqICAgd2UgYXJlIGFsc28gdHJ5aW5nIHRvIHJlZHVjZSB0aGUgbnVtYmVyIG9mIGNhbGxiYWNrIGV4ZWN1dGlvbiBieSBsb29raW5nIGluIHF1ZXVlcyBhdCBuZXcgbWVzc2FnZXMgcHVibGlzaGVkIGJ5XG4gKiAgIHRyeWluZyB0byBjb21wYWN0IHRob3NlIG1lc3NhZ2VzIChyZW1vdmluZyBkdXBsaWNhdGUgbWVzc2FnZXMsIG1vZGlmeWluZyBtZXNzYWdlcywgb3IgYWRkaW5nIGluIHRoZSBoaXN0b3J5IG9mIGFub3RoZXIgZXZlbnQgLGV0YylcbiAqXG4gKiAgICAgIEV4YW1wbGUgb2Ygd2hhdCBjYW4gYmUgd3Jvbmcgd2l0aG91dCBub24tc291bmQgYXN5bmNocm9ub3VzIGNhbGxzOlxuICpcbiAqICBTdGVwIDA6IEluaXRpYWwgc3RhdGU6XG4gKiAgIGEgPSAwO1xuICogICBiID0gMDtcbiAqXG4gKiAgU3RlcCAxOiBJbml0aWFsIG9wZXJhdGlvbnM6XG4gKiAgIGEgPSAxO1xuICogICBiID0gLTE7XG4gKlxuICogIC8vIGFuIG9ic2VydmVyIHJlYWN0cyB0byBjaGFuZ2VzIGluIGEgYW5kIGIgYW5kIGNvbXB1dGUgQ09SUkVDVCBsaWtlIHRoaXM6XG4gKiAgIGlmKCBhICsgYiA9PSAwKSB7XG4gKiAgICAgICBDT1JSRUNUID0gZmFsc2U7XG4gKiAgICAgICBub3RpZnkoLi4uKTsgLy8gYWN0IG9yIHNlbmQgYSBub3RpZmljYXRpb24gc29tZXdoZXJlLi5cbiAqICAgfSBlbHNlIHtcbiAqICAgICAgQ09SUkVDVCA9IGZhbHNlO1xuICogICB9XG4gKlxuICogICAgTm90aWNlIHRoYXQ6IENPUlJFQ1Qgd2lsbCBiZSB0cnVlIGluIHRoZSBlbmQgLCBidXQgbWVhbnRpbWUsIGFmdGVyIGEgbm90aWZpY2F0aW9uIHdhcyBzZW50IGFuZCBDT1JSRUNUIHdhcyB3cm9uZ2x5LCB0ZW1wb3JhcmlseSBmYWxzZSFcbiAqICAgIHNvdW5kUHViU3ViIGd1YXJhbnRlZSB0aGF0IHRoaXMgZG9lcyBub3QgaGFwcGVuIGJlY2F1c2UgdGhlIHN5bmNyb25vdXMgY2FsbCB3aWxsIGJlZm9yZSBhbnkgb2JzZXJ2ZXIgKGJvdCBhc2lnbmF0aW9uIG9uIGEgYW5kIGIpXG4gKlxuICogICBNb3JlOlxuICogICB5b3UgY2FuIHVzZSBibG9ja0NhbGxCYWNrcyBhbmQgcmVsZWFzZUNhbGxCYWNrcyBpbiBhIGZ1bmN0aW9uIHRoYXQgY2hhbmdlIGEgbG90IGEgY29sbGVjdGlvbiBvciBiaW5kYWJsZSBvYmplY3RzIGFuZCBhbGxcbiAqICAgdGhlIG5vdGlmaWNhdGlvbnMgd2lsbCBiZSBzZW50IGNvbXBhY3RlZCBhbmQgcHJvcGVybHlcbiAqL1xuXG4vLyBUT0RPOiBvcHRpbWlzYXRpb24hPyB1c2UgYSBtb3JlIGVmZmljaWVudCBxdWV1ZSBpbnN0ZWFkIG9mIGFycmF5cyB3aXRoIHB1c2ggYW5kIHNoaWZ0IT9cbi8vIFRPRE86IHNlZSBob3cgYmlnIHRob3NlIHF1ZXVlcyBjYW4gYmUgaW4gcmVhbCBhcHBsaWNhdGlvbnNcbi8vIGZvciBhIGZldyBodW5kcmVkcyBpdGVtcywgcXVldWVzIG1hZGUgZnJvbSBhcnJheSBzaG91bGQgYmUgZW5vdWdoXG4vLyogICBQb3RlbnRpYWwgVE9ET3M6XG4vLyAgICAqICAgICBwcmV2ZW50IGFueSBmb3JtIG9mIHByb2JsZW0gYnkgY2FsbGluZyBjYWxsYmFja3MgaW4gdGhlIGV4cGVjdGVkIG9yZGVyICE/XG4vLyogICAgIHByZXZlbnRpbmcgaW5maW5pdGUgbG9vcHMgZXhlY3V0aW9uIGNhdXNlIGJ5IGV2ZW50cyE/XG4vLypcbi8vKlxuLy8gVE9ETzogZGV0ZWN0IGluZmluaXRlIGxvb3BzIChvciB2ZXJ5IGRlZXAgcHJvcGFnYXRpb24pIEl0IGlzIHBvc3NpYmxlIT9cblxuY29uc3QgUXVldWUgPSByZXF1aXJlKCdzd2FybXV0aWxzJykuUXVldWU7XG5cbmZ1bmN0aW9uIFNvdW5kUHViU3ViKCl7XG5cblx0LyoqXG5cdCAqIHB1Ymxpc2hcblx0ICogICAgICBQdWJsaXNoIGEgbWVzc2FnZSB7T2JqZWN0fSB0byBhIGxpc3Qgb2Ygc3Vic2NyaWJlcnMgb24gYSBzcGVjaWZpYyB0b3BpY1xuXHQgKlxuXHQgKiBAcGFyYW1zIHtTdHJpbmd8TnVtYmVyfSB0YXJnZXQsICB7T2JqZWN0fSBtZXNzYWdlXG5cdCAqIEByZXR1cm4gbnVtYmVyIG9mIGNoYW5uZWwgc3Vic2NyaWJlcnMgdGhhdCB3aWxsIGJlIG5vdGlmaWVkXG5cdCAqL1xuXHR0aGlzLnB1Ymxpc2ggPSBmdW5jdGlvbih0YXJnZXQsIG1lc3NhZ2Upe1xuXHRcdGlmKCFpbnZhbGlkQ2hhbm5lbE5hbWUodGFyZ2V0KSAmJiAhaW52YWxpZE1lc3NhZ2VUeXBlKG1lc3NhZ2UpICYmICh0eXBlb2YgY2hhbm5lbFN1YnNjcmliZXJzW3RhcmdldF0gIT0gJ3VuZGVmaW5lZCcpKXtcblx0XHRcdGNvbXBhY3RBbmRTdG9yZSh0YXJnZXQsIG1lc3NhZ2UpO1xuXHRcdFx0c2V0VGltZW91dChkaXNwYXRjaE5leHQsIDApO1xuXHRcdFx0cmV0dXJuIGNoYW5uZWxTdWJzY3JpYmVyc1t0YXJnZXRdLmxlbmd0aDtcblx0XHR9IGVsc2V7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIHN1YnNjcmliZVxuXHQgKiAgICAgIFN1YnNjcmliZSAvIGFkZCBhIHtGdW5jdGlvbn0gY2FsbEJhY2sgb24gYSB7U3RyaW5nfE51bWJlcn10YXJnZXQgY2hhbm5lbCBzdWJzY3JpYmVycyBsaXN0IGluIG9yZGVyIHRvIHJlY2VpdmVcblx0ICogICAgICBtZXNzYWdlcyBwdWJsaXNoZWQgaWYgdGhlIGNvbmRpdGlvbnMgZGVmaW5lZCBieSB7RnVuY3Rpb259d2FpdEZvck1vcmUgYW5kIHtGdW5jdGlvbn1maWx0ZXIgYXJlIHBhc3NlZC5cblx0ICpcblx0ICogQHBhcmFtcyB7U3RyaW5nfE51bWJlcn10YXJnZXQsIHtGdW5jdGlvbn1jYWxsQmFjaywge0Z1bmN0aW9ufXdhaXRGb3JNb3JlLCB7RnVuY3Rpb259ZmlsdGVyXG5cdCAqXG5cdCAqICAgICAgICAgIHRhcmdldCAgICAgIC0gY2hhbm5lbCBuYW1lIHRvIHN1YnNjcmliZVxuXHQgKiAgICAgICAgICBjYWxsYmFjayAgICAtIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIGEgbWVzc2FnZSB3YXMgcHVibGlzaGVkIG9uIHRoZSBjaGFubmVsXG5cdCAqICAgICAgICAgIHdhaXRGb3JNb3JlIC0gYSBpbnRlcm1lZGlhcnkgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGNhbGxlZCBhZnRlciBhIHN1Y2Nlc3NmdWx5IG1lc3NhZ2UgZGVsaXZlcnkgaW4gb3JkZXJcblx0ICogICAgICAgICAgICAgICAgICAgICAgICAgIHRvIGRlY2lkZSBpZiBhIG5ldyBtZXNzYWdlcyBpcyBleHBlY3RlZC4uLlxuXHQgKiAgICAgICAgICBmaWx0ZXIgICAgICAtIGEgZnVuY3Rpb24gdGhhdCByZWNlaXZlcyB0aGUgbWVzc2FnZSBiZWZvcmUgaW52b2NhdGlvbiBvZiBjYWxsYmFjayBmdW5jdGlvbiBpbiBvcmRlciB0byBhbGxvd1xuXHQgKiAgICAgICAgICAgICAgICAgICAgICAgICAgcmVsZXZhbnQgbWVzc2FnZSBiZWZvcmUgZW50ZXJpbmcgaW4gbm9ybWFsIGNhbGxiYWNrIGZsb3dcblx0ICogQHJldHVyblxuXHQgKi9cblx0dGhpcy5zdWJzY3JpYmUgPSBmdW5jdGlvbih0YXJnZXQsIGNhbGxCYWNrLCB3YWl0Rm9yTW9yZSwgZmlsdGVyKXtcblx0XHRpZighaW52YWxpZENoYW5uZWxOYW1lKHRhcmdldCkgJiYgIWludmFsaWRGdW5jdGlvbihjYWxsQmFjaykpe1xuXHRcdFx0dmFyIHN1YnNjcmliZXIgPSB7XCJjYWxsQmFja1wiOmNhbGxCYWNrLCBcIndhaXRGb3JNb3JlXCI6d2FpdEZvck1vcmUsIFwiZmlsdGVyXCI6ZmlsdGVyfTtcblx0XHRcdHZhciBhcnIgPSBjaGFubmVsU3Vic2NyaWJlcnNbdGFyZ2V0XTtcblx0XHRcdGlmKHR5cGVvZiBhcnIgPT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0XHRhcnIgPSBbXTtcblx0XHRcdFx0Y2hhbm5lbFN1YnNjcmliZXJzW3RhcmdldF0gPSBhcnI7XG5cdFx0XHR9XG5cdFx0XHRhcnIucHVzaChzdWJzY3JpYmVyKTtcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIHVuc3Vic2NyaWJlXG5cdCAqICAgICAgVW5zdWJzY3JpYmUvcmVtb3ZlIHtGdW5jdGlvbn0gY2FsbEJhY2sgZnJvbSB0aGUgbGlzdCBvZiBzdWJzY3JpYmVycyBvZiB0aGUge1N0cmluZ3xOdW1iZXJ9IHRhcmdldCBjaGFubmVsXG5cdCAqXG5cdCAqIEBwYXJhbXMge1N0cmluZ3xOdW1iZXJ9IHRhcmdldCwge0Z1bmN0aW9ufSBjYWxsQmFjaywge0Z1bmN0aW9ufSBmaWx0ZXJcblx0ICpcblx0ICogICAgICAgICAgdGFyZ2V0ICAgICAgLSBjaGFubmVsIG5hbWUgdG8gdW5zdWJzY3JpYmVcblx0ICogICAgICAgICAgY2FsbGJhY2sgICAgLSByZWZlcmVuY2Ugb2YgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uIHRoYXQgd2FzIHVzZWQgYXMgc3Vic2NyaWJlXG5cdCAqICAgICAgICAgIGZpbHRlciAgICAgIC0gcmVmZXJlbmNlIG9mIHRoZSBvcmlnaW5hbCBmaWx0ZXIgZnVuY3Rpb25cblx0ICogQHJldHVyblxuXHQgKi9cblx0dGhpcy51bnN1YnNjcmliZSA9IGZ1bmN0aW9uKHRhcmdldCwgY2FsbEJhY2ssIGZpbHRlcil7XG5cdFx0aWYoIWludmFsaWRGdW5jdGlvbihjYWxsQmFjaykpe1xuXHRcdFx0dmFyIGdvdGl0ID0gZmFsc2U7XG5cdFx0XHRpZihjaGFubmVsU3Vic2NyaWJlcnNbdGFyZ2V0XSl7XG5cdFx0XHRcdGZvcih2YXIgaSA9IDA7IGkgPCBjaGFubmVsU3Vic2NyaWJlcnNbdGFyZ2V0XS5sZW5ndGg7aSsrKXtcblx0XHRcdFx0XHR2YXIgc3Vic2NyaWJlciA9ICBjaGFubmVsU3Vic2NyaWJlcnNbdGFyZ2V0XVtpXTtcblx0XHRcdFx0XHRpZihzdWJzY3JpYmVyLmNhbGxCYWNrID09PSBjYWxsQmFjayAmJiAoIHR5cGVvZiBmaWx0ZXIgPT09ICd1bmRlZmluZWQnIHx8IHN1YnNjcmliZXIuZmlsdGVyID09PSBmaWx0ZXIgKSl7XG5cdFx0XHRcdFx0XHRnb3RpdCA9IHRydWU7XG5cdFx0XHRcdFx0XHRzdWJzY3JpYmVyLmZvckRlbGV0ZSA9IHRydWU7XG5cdFx0XHRcdFx0XHRzdWJzY3JpYmVyLmNhbGxCYWNrID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRcdFx0c3Vic2NyaWJlci5maWx0ZXIgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZighZ290aXQpe1xuXHRcdFx0XHR3cHJpbnQoXCJVbmFibGUgdG8gdW5zdWJzY3JpYmUgYSBjYWxsYmFjayB0aGF0IHdhcyBub3Qgc3Vic2NyaWJlZCFcIik7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBibG9ja0NhbGxCYWNrc1xuXHQgKlxuXHQgKiBAcGFyYW1zXG5cdCAqIEByZXR1cm5cblx0ICovXG5cdHRoaXMuYmxvY2tDYWxsQmFja3MgPSBmdW5jdGlvbigpe1xuXHRcdGxldmVsKys7XG5cdH07XG5cblx0LyoqXG5cdCAqIHJlbGVhc2VDYWxsQmFja3Ncblx0ICpcblx0ICogQHBhcmFtc1xuXHQgKiBAcmV0dXJuXG5cdCAqL1xuXHR0aGlzLnJlbGVhc2VDYWxsQmFja3MgPSBmdW5jdGlvbigpe1xuXHRcdGxldmVsLS07XG5cdFx0Ly9oYWNrL29wdGltaXNhdGlvbiB0byBub3QgZmlsbCB0aGUgc3RhY2sgaW4gZXh0cmVtZSBjYXNlcyAobWFueSBldmVudHMgY2F1c2VkIGJ5IGxvb3BzIGluIGNvbGxlY3Rpb25zLGV0Yylcblx0XHR3aGlsZShsZXZlbCA9PT0gMCAmJiBkaXNwYXRjaE5leHQodHJ1ZSkpe1xuXHRcdFx0Ly9ub3RoaW5nXG5cdFx0fVxuXG5cdFx0d2hpbGUobGV2ZWwgPT09IDAgJiYgY2FsbEFmdGVyQWxsRXZlbnRzKCkpe1xuICAgICAgICAgICAgLy9ub3RoaW5nXG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBhZnRlckFsbEV2ZW50c1xuXHQgKlxuXHQgKiBAcGFyYW1zIHtGdW5jdGlvbn0gY2FsbGJhY2tcblx0ICpcblx0ICogICAgICAgICAgY2FsbGJhY2sgLSBmdW5jdGlvbiB0aGF0IG5lZWRzIHRvIGJlIGludm9rZWQgb25jZSBhbGwgZXZlbnRzIGFyZSBkZWxpdmVyZWRcblx0ICogQHJldHVyblxuXHQgKi9cblx0dGhpcy5hZnRlckFsbEV2ZW50cyA9IGZ1bmN0aW9uKGNhbGxCYWNrKXtcblx0XHRpZighaW52YWxpZEZ1bmN0aW9uKGNhbGxCYWNrKSl7XG5cdFx0XHRhZnRlckV2ZW50c0NhbGxzLnB1c2goY2FsbEJhY2spO1xuXHRcdH1cblx0XHR0aGlzLmJsb2NrQ2FsbEJhY2tzKCk7XG5cdFx0dGhpcy5yZWxlYXNlQ2FsbEJhY2tzKCk7XG5cdH07XG5cblx0LyoqXG5cdCAqIGhhc0NoYW5uZWxcblx0ICpcblx0ICogQHBhcmFtcyB7U3RyaW5nfE51bWJlcn0gY2hhbm5lbFxuXHQgKlxuXHQgKiAgICAgICAgICBjaGFubmVsIC0gbmFtZSBvZiB0aGUgY2hhbm5lbCB0aGF0IG5lZWQgdG8gYmUgdGVzdGVkIGlmIHByZXNlbnRcblx0ICogQHJldHVyblxuXHQgKi9cblx0dGhpcy5oYXNDaGFubmVsID0gZnVuY3Rpb24oY2hhbm5lbCl7XG5cdFx0cmV0dXJuICFpbnZhbGlkQ2hhbm5lbE5hbWUoY2hhbm5lbCkgJiYgKHR5cGVvZiBjaGFubmVsU3Vic2NyaWJlcnNbY2hhbm5lbF0gIT0gJ3VuZGVmaW5lZCcpID8gdHJ1ZSA6IGZhbHNlO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBhZGRDaGFubmVsXG5cdCAqXG5cdCAqIEBwYXJhbXMge1N0cmluZ30gY2hhbm5lbFxuXHQgKlxuXHQgKiAgICAgICAgICBjaGFubmVsIC0gbmFtZSBvZiBhIGNoYW5uZWwgdGhhdCBuZWVkcyB0byBiZSBjcmVhdGVkIGFuZCBhZGRlZCB0byBzb3VuZHB1YnN1YiByZXBvc2l0b3J5XG5cdCAqIEByZXR1cm5cblx0ICovXG5cdHRoaXMuYWRkQ2hhbm5lbCA9IGZ1bmN0aW9uKGNoYW5uZWwpe1xuXHRcdGlmKCFpbnZhbGlkQ2hhbm5lbE5hbWUoY2hhbm5lbCkgJiYgIXRoaXMuaGFzQ2hhbm5lbChjaGFubmVsKSl7XG5cdFx0XHRjaGFubmVsU3Vic2NyaWJlcnNbY2hhbm5lbF0gPSBbXTtcblx0XHR9XG5cdH07XG5cblx0LyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBwcm90ZWN0ZWQgc3R1ZmYgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdC8vIG1hcCBjaGFubmVsTmFtZSAob2JqZWN0IGxvY2FsIGlkKSAtPiBhcnJheSB3aXRoIHN1YnNjcmliZXJzXG5cdHZhciBjaGFubmVsU3Vic2NyaWJlcnMgPSB7fTtcblxuXHQvLyBtYXAgY2hhbm5lbE5hbWUgKG9iamVjdCBsb2NhbCBpZCkgLT4gcXVldWUgd2l0aCB3YWl0aW5nIG1lc3NhZ2VzXG5cdHZhciBjaGFubmVsc1N0b3JhZ2UgPSB7fTtcblxuXHQvLyBvYmplY3Rcblx0dmFyIHR5cGVDb21wYWN0b3IgPSB7fTtcblxuXHQvLyBjaGFubmVsIG5hbWVzXG5cdHZhciBleGVjdXRpb25RdWV1ZSA9IG5ldyBRdWV1ZSgpO1xuXHR2YXIgbGV2ZWwgPSAwO1xuXG5cblxuXHQvKipcblx0ICogcmVnaXN0ZXJDb21wYWN0b3Jcblx0ICpcblx0ICogICAgICAgQW4gY29tcGFjdG9yIHRha2VzIGEgbmV3RXZlbnQgYW5kIGFuZCBvbGRFdmVudCBhbmQgcmV0dXJuIHRoZSBvbmUgdGhhdCBzdXJ2aXZlcyAob2xkRXZlbnQgaWZcblx0ICogIGl0IGNhbiBjb21wYWN0IHRoZSBuZXcgb25lIG9yIHRoZSBuZXdFdmVudCBpZiBjYW4ndCBiZSBjb21wYWN0ZWQpXG5cdCAqXG5cdCAqIEBwYXJhbXMge1N0cmluZ30gdHlwZSwge0Z1bmN0aW9ufSBjYWxsQmFja1xuXHQgKlxuXHQgKiAgICAgICAgICB0eXBlICAgICAgICAtIGNoYW5uZWwgbmFtZSB0byB1bnN1YnNjcmliZVxuXHQgKiAgICAgICAgICBjYWxsQmFjayAgICAtIGhhbmRsZXIgZnVuY3Rpb24gZm9yIHRoYXQgc3BlY2lmaWMgZXZlbnQgdHlwZVxuXHQgKiBAcmV0dXJuXG5cdCAqL1xuXHR0aGlzLnJlZ2lzdGVyQ29tcGFjdG9yID0gZnVuY3Rpb24odHlwZSwgY2FsbEJhY2spIHtcblx0XHRpZighaW52YWxpZEZ1bmN0aW9uKGNhbGxCYWNrKSl7XG5cdFx0XHR0eXBlQ29tcGFjdG9yW3R5cGVdID0gY2FsbEJhY2s7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBkaXNwYXRjaE5leHRcblx0ICpcblx0ICogQHBhcmFtIGZyb21SZWxlYXNlQ2FsbEJhY2tzOiBoYWNrIHRvIHByZXZlbnQgdG9vIG1hbnkgcmVjdXJzaXZlIGNhbGxzIG9uIHJlbGVhc2VDYWxsQmFja3Ncblx0ICogQHJldHVybiB7Qm9vbGVhbn1cblx0ICovXG5cdGZ1bmN0aW9uIGRpc3BhdGNoTmV4dChmcm9tUmVsZWFzZUNhbGxCYWNrcyl7XG5cdFx0aWYobGV2ZWwgPiAwKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdGNvbnN0IGNoYW5uZWxOYW1lID0gZXhlY3V0aW9uUXVldWUuZnJvbnQoKTtcblx0XHRpZih0eXBlb2YgY2hhbm5lbE5hbWUgIT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0c2VsZi5ibG9ja0NhbGxCYWNrcygpO1xuXHRcdFx0dHJ5e1xuXHRcdFx0XHRsZXQgbWVzc2FnZTtcblx0XHRcdFx0aWYoIWNoYW5uZWxzU3RvcmFnZVtjaGFubmVsTmFtZV0uaXNFbXB0eSgpKSB7XG5cdFx0XHRcdFx0bWVzc2FnZSA9IGNoYW5uZWxzU3RvcmFnZVtjaGFubmVsTmFtZV0uZnJvbnQoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZih0eXBlb2YgbWVzc2FnZSA9PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdFx0aWYoIWNoYW5uZWxzU3RvcmFnZVtjaGFubmVsTmFtZV0uaXNFbXB0eSgpKXtcblx0XHRcdFx0XHRcdHdwcmludChcIkNhbid0IHVzZSBhcyBtZXNzYWdlIGluIGEgcHViL3N1YiBjaGFubmVsIHRoaXMgb2JqZWN0OiBcIiArIG1lc3NhZ2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRleGVjdXRpb25RdWV1ZS5wb3AoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpZih0eXBlb2YgbWVzc2FnZS5fX3RyYW5zbWlzaW9uSW5kZXggPT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0XHRcdFx0bWVzc2FnZS5fX3RyYW5zbWlzaW9uSW5kZXggPSAwO1xuXHRcdFx0XHRcdFx0Zm9yKHZhciBpID0gY2hhbm5lbFN1YnNjcmliZXJzW2NoYW5uZWxOYW1lXS5sZW5ndGgtMTsgaSA+PSAwIDsgaS0tKXtcblx0XHRcdFx0XHRcdFx0dmFyIHN1YnNjcmliZXIgPSAgY2hhbm5lbFN1YnNjcmliZXJzW2NoYW5uZWxOYW1lXVtpXTtcblx0XHRcdFx0XHRcdFx0aWYoc3Vic2NyaWJlci5mb3JEZWxldGUgPT09IHRydWUpe1xuXHRcdFx0XHRcdFx0XHRcdGNoYW5uZWxTdWJzY3JpYmVyc1tjaGFubmVsTmFtZV0uc3BsaWNlKGksMSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2V7XG5cdFx0XHRcdFx0XHRtZXNzYWdlLl9fdHJhbnNtaXNpb25JbmRleCsrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvL1RPRE86IGZvciBpbW11dGFibGUgb2JqZWN0cyBpdCB3aWxsIG5vdCB3b3JrIGFsc28sIGZpeCBmb3Igc2hhcGUgbW9kZWxzXG5cdFx0XHRcdFx0aWYodHlwZW9mIG1lc3NhZ2UuX190cmFuc21pc2lvbkluZGV4ID09ICd1bmRlZmluZWQnKXtcblx0XHRcdFx0XHRcdHdwcmludChcIkNhbid0IHVzZSBhcyBtZXNzYWdlIGluIGEgcHViL3N1YiBjaGFubmVsIHRoaXMgb2JqZWN0OiBcIiArIG1lc3NhZ2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRzdWJzY3JpYmVyID0gY2hhbm5lbFN1YnNjcmliZXJzW2NoYW5uZWxOYW1lXVttZXNzYWdlLl9fdHJhbnNtaXNpb25JbmRleF07XG5cdFx0XHRcdFx0aWYodHlwZW9mIHN1YnNjcmliZXIgPT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0XHRcdFx0ZGVsZXRlIG1lc3NhZ2UuX190cmFuc21pc2lvbkluZGV4O1xuXHRcdFx0XHRcdFx0Y2hhbm5lbHNTdG9yYWdlW2NoYW5uZWxOYW1lXS5wb3AoKTtcblx0XHRcdFx0XHR9IGVsc2V7XG5cdFx0XHRcdFx0XHRpZihzdWJzY3JpYmVyLmZpbHRlciA9PT0gbnVsbCB8fCB0eXBlb2Ygc3Vic2NyaWJlci5maWx0ZXIgPT09IFwidW5kZWZpbmVkXCIgfHwgKCFpbnZhbGlkRnVuY3Rpb24oc3Vic2NyaWJlci5maWx0ZXIpICYmIHN1YnNjcmliZXIuZmlsdGVyKG1lc3NhZ2UpKSl7XG5cdFx0XHRcdFx0XHRcdGlmKCFzdWJzY3JpYmVyLmZvckRlbGV0ZSl7XG5cdFx0XHRcdFx0XHRcdFx0c3Vic2NyaWJlci5jYWxsQmFjayhtZXNzYWdlKTtcblx0XHRcdFx0XHRcdFx0XHRpZihzdWJzY3JpYmVyLndhaXRGb3JNb3JlICYmICFpbnZhbGlkRnVuY3Rpb24oc3Vic2NyaWJlci53YWl0Rm9yTW9yZSkgJiYgIXN1YnNjcmliZXIud2FpdEZvck1vcmUobWVzc2FnZSkpe1xuXHRcdFx0XHRcdFx0XHRcdFx0c3Vic2NyaWJlci5mb3JEZWxldGUgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSBjYXRjaChlcnIpe1xuXHRcdFx0XHR3cHJpbnQoXCJFdmVudCBjYWxsYmFjayBmYWlsZWQ6IFwiKyBzdWJzY3JpYmVyLmNhbGxCYWNrICtcImVycm9yOiBcIiArIGVyci5zdGFjayk7XG5cdFx0XHR9XG5cdFx0XHQvL1xuXHRcdFx0aWYoZnJvbVJlbGVhc2VDYWxsQmFja3Mpe1xuXHRcdFx0XHRsZXZlbC0tO1xuXHRcdFx0fSBlbHNle1xuXHRcdFx0XHRzZWxmLnJlbGVhc2VDYWxsQmFja3MoKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gZWxzZXtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBjb21wYWN0QW5kU3RvcmUodGFyZ2V0LCBtZXNzYWdlKXtcblx0XHR2YXIgZ290Q29tcGFjdGVkID0gZmFsc2U7XG5cdFx0dmFyIGFyciA9IGNoYW5uZWxzU3RvcmFnZVt0YXJnZXRdO1xuXHRcdGlmKHR5cGVvZiBhcnIgPT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0YXJyID0gbmV3IFF1ZXVlKCk7XG5cdFx0XHRjaGFubmVsc1N0b3JhZ2VbdGFyZ2V0XSA9IGFycjtcblx0XHR9XG5cblx0XHRpZihtZXNzYWdlICYmIHR5cGVvZiBtZXNzYWdlLnR5cGUgIT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0dmFyIHR5cGVDb21wYWN0b3JDYWxsQmFjayA9IHR5cGVDb21wYWN0b3JbbWVzc2FnZS50eXBlXTtcblxuXHRcdFx0aWYodHlwZW9mIHR5cGVDb21wYWN0b3JDYWxsQmFjayAhPSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdGZvcihsZXQgY2hhbm5lbCBvZiBhcnIpIHtcblx0XHRcdFx0XHRpZih0eXBlQ29tcGFjdG9yQ2FsbEJhY2sobWVzc2FnZSwgY2hhbm5lbCkgPT09IGNoYW5uZWwpIHtcblx0XHRcdFx0XHRcdGlmKHR5cGVvZiBjaGFubmVsLl9fdHJhbnNtaXNpb25JbmRleCA9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdFx0XHRnb3RDb21wYWN0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZighZ290Q29tcGFjdGVkICYmIG1lc3NhZ2Upe1xuXHRcdFx0YXJyLnB1c2gobWVzc2FnZSk7XG5cdFx0XHRleGVjdXRpb25RdWV1ZS5wdXNoKHRhcmdldCk7XG5cdFx0fVxuXHR9XG5cblx0dmFyIGFmdGVyRXZlbnRzQ2FsbHMgPSBuZXcgUXVldWUoKTtcblx0ZnVuY3Rpb24gY2FsbEFmdGVyQWxsRXZlbnRzICgpe1xuXHRcdGlmKCFhZnRlckV2ZW50c0NhbGxzLmlzRW1wdHkoKSl7XG5cdFx0XHR2YXIgY2FsbEJhY2sgPSBhZnRlckV2ZW50c0NhbGxzLnBvcCgpO1xuXHRcdFx0Ly9kbyBub3QgY2F0Y2ggZXhjZXB0aW9ucyBoZXJlLi5cblx0XHRcdGNhbGxCYWNrKCk7XG5cdFx0fVxuXHRcdHJldHVybiAhYWZ0ZXJFdmVudHNDYWxscy5pc0VtcHR5KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnZhbGlkQ2hhbm5lbE5hbWUobmFtZSl7XG5cdFx0dmFyIHJlc3VsdCA9IGZhbHNlO1xuXHRcdGlmKCFuYW1lIHx8ICh0eXBlb2YgbmFtZSAhPSBcInN0cmluZ1wiICYmIHR5cGVvZiBuYW1lICE9IFwibnVtYmVyXCIpKXtcblx0XHRcdHJlc3VsdCA9IHRydWU7XG5cdFx0XHR3cHJpbnQoXCJJbnZhbGlkIGNoYW5uZWwgbmFtZTogXCIgKyBuYW1lKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gaW52YWxpZE1lc3NhZ2VUeXBlKG1lc3NhZ2Upe1xuXHRcdHZhciByZXN1bHQgPSBmYWxzZTtcblx0XHRpZighbWVzc2FnZSB8fCB0eXBlb2YgbWVzc2FnZSAhPSBcIm9iamVjdFwiKXtcblx0XHRcdHJlc3VsdCA9IHRydWU7XG5cdFx0XHR3cHJpbnQoXCJJbnZhbGlkIG1lc3NhZ2VzIHR5cGVzOiBcIiArIG1lc3NhZ2UpO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gaW52YWxpZEZ1bmN0aW9uKGNhbGxiYWNrKXtcblx0XHR2YXIgcmVzdWx0ID0gZmFsc2U7XG5cdFx0aWYoIWNhbGxiYWNrIHx8IHR5cGVvZiBjYWxsYmFjayAhPSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0cmVzdWx0ID0gdHJ1ZTtcblx0XHRcdHdwcmludChcIkV4cGVjdGVkIHRvIGJlIGZ1bmN0aW9uIGJ1dCBpczogXCIgKyBjYWxsYmFjayk7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cbn1cblxuZXhwb3J0cy5zb3VuZFB1YlN1YiA9IG5ldyBTb3VuZFB1YlN1YigpOyIsImZ1bmN0aW9uIHByb2R1Y3QoYXJncykge1xuICAgIGlmKCFhcmdzLmxlbmd0aCl7XG4gICAgICAgIHJldHVybiBbIFtdIF07XG4gICAgfVxuICAgIHZhciBwcm9kID0gcHJvZHVjdChhcmdzLnNsaWNlKDEpKSwgciA9IFtdO1xuICAgIGFyZ3NbMF0uZm9yRWFjaChmdW5jdGlvbih4KSB7XG4gICAgICAgIHByb2QuZm9yRWFjaChmdW5jdGlvbihwKSB7XG4gICAgICAgICAgICByLnB1c2goWyB4IF0uY29uY2F0KHApKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHI7XG59XG5cbmZ1bmN0aW9uIG9iamVjdFByb2R1Y3Qob2JqKSB7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopLFxuICAgICAgICB2YWx1ZXMgPSBrZXlzLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiBvYmpbeF07IH0pO1xuXG4gICAgcmV0dXJuIHByb2R1Y3QodmFsdWVzKS5tYXAoZnVuY3Rpb24ocCkge1xuICAgICAgICB2YXIgZSA9IHt9O1xuICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oaywgbikgeyBlW2tdID0gcFtuXTsgfSk7XG4gICAgICAgIHJldHVybiBlO1xuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG9iamVjdFByb2R1Y3Q7IiwidmFyIG1ldGEgPSBcIm1ldGFcIjtcblxuZnVuY3Rpb24gT3dNKHNlcmlhbGl6ZWQpe1xuXG4gICAgaWYoc2VyaWFsaXplZCl7XG4gICAgICAgIHJldHVybiBPd00ucHJvdG90eXBlLmNvbnZlcnQoc2VyaWFsaXplZCk7XG4gICAgfVxuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIG1ldGEsIHtcbiAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICB2YWx1ZToge31cbiAgICB9KTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInNldE1ldGFcIiwge1xuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICBjb25maWd1cmFibGU6ZmFsc2UsXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbihwcm9wLCB2YWx1ZSl7XG4gICAgICAgICAgICBpZih0eXBlb2YgcHJvcCA9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZSA9PSBcInVuZGVmaW5lZFwiKXtcbiAgICAgICAgICAgICAgICBmb3IodmFyIHAgaW4gcHJvcCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbbWV0YV1bcF0gPSBwcm9wW3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXNbbWV0YV1bcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwiZ2V0TWV0YVwiLCB7XG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKHByb3Ape1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbbWV0YV1bcHJvcF07XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gdGVzdE93TVNlcmlhbGl6YXRpb24ob2JqKXtcbiAgICBsZXQgcmVzID0gZmFsc2U7XG5cbiAgICBpZihvYmope1xuICAgICAgICByZXMgPSB0eXBlb2Ygb2JqW21ldGFdICE9IFwidW5kZWZpbmVkXCIgJiYgIShvYmogaW5zdGFuY2VvZiBPd00pO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG59XG5cbk93TS5wcm90b3R5cGUuY29udmVydCA9IGZ1bmN0aW9uKHNlcmlhbGl6ZWQpe1xuICAgIGNvbnN0IG93bSA9IG5ldyBPd00oKTtcblxuICAgIGZvcih2YXIgbWV0YVByb3AgaW4gc2VyaWFsaXplZC5tZXRhKXtcbiAgICAgICAgaWYoIXRlc3RPd01TZXJpYWxpemF0aW9uKHNlcmlhbGl6ZWRbbWV0YVByb3BdKSkge1xuICAgICAgICAgICAgb3dtLnNldE1ldGEobWV0YVByb3AsIHNlcmlhbGl6ZWQubWV0YVttZXRhUHJvcF0pO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIG93bS5zZXRNZXRhKG1ldGFQcm9wLCBPd00ucHJvdG90eXBlLmNvbnZlcnQoc2VyaWFsaXplZC5tZXRhW21ldGFQcm9wXSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yKHZhciBzaW1wbGVQcm9wIGluIHNlcmlhbGl6ZWQpe1xuICAgICAgICBpZihzaW1wbGVQcm9wID09PSBtZXRhKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCF0ZXN0T3dNU2VyaWFsaXphdGlvbihzZXJpYWxpemVkW3NpbXBsZVByb3BdKSl7XG4gICAgICAgICAgICBvd21bc2ltcGxlUHJvcF0gPSBzZXJpYWxpemVkW3NpbXBsZVByb3BdO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIG93bVtzaW1wbGVQcm9wXSA9IE93TS5wcm90b3R5cGUuY29udmVydChzZXJpYWxpemVkW3NpbXBsZVByb3BdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvd207XG59O1xuXG5Pd00ucHJvdG90eXBlLmdldE1ldGFGcm9tID0gZnVuY3Rpb24ob2JqLCBuYW1lKXtcbiAgICB2YXIgcmVzO1xuICAgIGlmKCFuYW1lKXtcbiAgICAgICAgcmVzID0gb2JqW21ldGFdO1xuICAgIH1lbHNle1xuICAgICAgICByZXMgPSBvYmpbbWV0YV1bbmFtZV07XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59O1xuXG5Pd00ucHJvdG90eXBlLnNldE1ldGFGb3IgPSBmdW5jdGlvbihvYmosIG5hbWUsIHZhbHVlKXtcbiAgICBvYmpbbWV0YV1bbmFtZV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gb2JqW21ldGFdW25hbWVdO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBPd007IiwiZnVuY3Rpb24gUXVldWVFbGVtZW50KGNvbnRlbnQpIHtcblx0dGhpcy5jb250ZW50ID0gY29udGVudDtcblx0dGhpcy5uZXh0ID0gbnVsbDtcbn1cblxuZnVuY3Rpb24gUXVldWUoKSB7XG5cdHRoaXMuaGVhZCA9IG51bGw7XG5cdHRoaXMudGFpbCA9IG51bGw7XG5cdHRoaXMubGVuZ3RoID0gMDtcblx0dGhpcy5wdXNoID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0Y29uc3QgbmV3RWxlbWVudCA9IG5ldyBRdWV1ZUVsZW1lbnQodmFsdWUpO1xuXHRcdGlmICghdGhpcy5oZWFkKSB7XG5cdFx0XHR0aGlzLmhlYWQgPSBuZXdFbGVtZW50O1xuXHRcdFx0dGhpcy50YWlsID0gbmV3RWxlbWVudDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy50YWlsLm5leHQgPSBuZXdFbGVtZW50O1xuXHRcdFx0dGhpcy50YWlsID0gbmV3RWxlbWVudDtcblx0XHR9XG5cdFx0dGhpcy5sZW5ndGgrKztcblx0fTtcblxuXHR0aGlzLnBvcCA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIXRoaXMuaGVhZCkge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdGNvbnN0IGhlYWRDb3B5ID0gdGhpcy5oZWFkO1xuXHRcdHRoaXMuaGVhZCA9IHRoaXMuaGVhZC5uZXh0O1xuXHRcdHRoaXMubGVuZ3RoLS07XG5cblx0XHQvL2ZpeD8/Pz8/Pz9cblx0XHRpZih0aGlzLmxlbmd0aCA9PT0gMCl7XG4gICAgICAgICAgICB0aGlzLnRhaWwgPSBudWxsO1xuXHRcdH1cblxuXHRcdHJldHVybiBoZWFkQ29weS5jb250ZW50O1xuXHR9O1xuXG5cdHRoaXMuZnJvbnQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuaGVhZCA/IHRoaXMuaGVhZC5jb250ZW50IDogdW5kZWZpbmVkO1xuXHR9O1xuXG5cdHRoaXMuaXNFbXB0eSA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5oZWFkID09PSBudWxsO1xuXHR9O1xuXG5cdHRoaXNbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKiAoKSB7XG5cdFx0bGV0IGhlYWQgPSB0aGlzLmhlYWQ7XG5cdFx0d2hpbGUoaGVhZCAhPT0gbnVsbCkge1xuXHRcdFx0eWllbGQgaGVhZC5jb250ZW50O1xuXHRcdFx0aGVhZCA9IGhlYWQubmV4dDtcblx0XHR9XG5cdH0uYmluZCh0aGlzKTtcbn1cblxuUXVldWUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuXHRsZXQgc3RyaW5naWZpZWRRdWV1ZSA9ICcnO1xuXHRsZXQgaXRlcmF0b3IgPSB0aGlzLmhlYWQ7XG5cdHdoaWxlIChpdGVyYXRvcikge1xuXHRcdHN0cmluZ2lmaWVkUXVldWUgKz0gYCR7SlNPTi5zdHJpbmdpZnkoaXRlcmF0b3IuY29udGVudCl9IGA7XG5cdFx0aXRlcmF0b3IgPSBpdGVyYXRvci5uZXh0O1xuXHR9XG5cdHJldHVybiBzdHJpbmdpZmllZFF1ZXVlO1xufTtcblxuUXVldWUucHJvdG90eXBlLmluc3BlY3QgPSBRdWV1ZS5wcm90b3R5cGUudG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gUXVldWU7IiwiY29uc3QgT3dNID0gcmVxdWlyZShcIi4vT3dNXCIpO1xuXG4vKlxuICAgIFByZXBhcmUgdGhlIHN0YXRlIG9mIGEgc3dhcm0gdG8gYmUgc2VyaWFsaXNlZFxuKi9cblxuZXhwb3J0cy5hc0pTT04gPSBmdW5jdGlvbih2YWx1ZU9iaiwgcGhhc2VOYW1lLCBhcmdzLCBjYWxsYmFjayl7XG5cbiAgICAgICAgbGV0IHZhbHVlT2JqZWN0ID0gdmFsdWVPYmoudmFsdWVPZigpO1xuICAgICAgICBsZXQgcmVzID0gbmV3IE93TSgpO1xuICAgICAgICByZXMucHVibGljVmFycyAgICAgICAgICA9IHZhbHVlT2JqZWN0LnB1YmxpY1ZhcnM7XG4gICAgICAgIHJlcy5wcml2YXRlVmFycyAgICAgICAgID0gdmFsdWVPYmplY3QucHJpdmF0ZVZhcnM7XG5cbiAgICAgICAgcmVzLnNldE1ldGEoXCJzd2FybVR5cGVOYW1lXCIsIE93TS5wcm90b3R5cGUuZ2V0TWV0YUZyb20odmFsdWVPYmplY3QsIFwic3dhcm1UeXBlTmFtZVwiKSk7XG4gICAgICAgIHJlcy5zZXRNZXRhKFwic3dhcm1JZFwiLCAgICAgICBPd00ucHJvdG90eXBlLmdldE1ldGFGcm9tKHZhbHVlT2JqZWN0LCBcInN3YXJtSWRcIikpO1xuICAgICAgICByZXMuc2V0TWV0YShcInRhcmdldFwiLCAgICAgICAgT3dNLnByb3RvdHlwZS5nZXRNZXRhRnJvbSh2YWx1ZU9iamVjdCwgXCJ0YXJnZXRcIikpO1xuICAgICAgICByZXMuc2V0TWV0YShcImhvbWVTZWN1cml0eUNvbnRleHRcIiwgICAgICAgIE93TS5wcm90b3R5cGUuZ2V0TWV0YUZyb20odmFsdWVPYmplY3QsIFwiaG9tZVNlY3VyaXR5Q29udGV4dFwiKSk7XG4gICAgICAgIHJlcy5zZXRNZXRhKFwicmVxdWVzdElkXCIsICAgICAgICBPd00ucHJvdG90eXBlLmdldE1ldGFGcm9tKHZhbHVlT2JqZWN0LCBcInJlcXVlc3RJZFwiKSk7XG5cbiAgICAgICAgaWYoIXBoYXNlTmFtZSl7XG4gICAgICAgICAgICByZXMuc2V0TWV0YShcImNvbW1hbmRcIiwgXCJzdG9yZWRcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXMuc2V0TWV0YShcInBoYXNlTmFtZVwiLCBwaGFzZU5hbWUpO1xuICAgICAgICAgICAgcmVzLnNldE1ldGEoXCJwaGFzZUlkXCIsICQkLnVpZEdlbmVyYXRvci5zYWZlX3V1aWQoKSk7XG4gICAgICAgICAgICByZXMuc2V0TWV0YShcImFyZ3NcIiwgYXJncyk7XG4gICAgICAgICAgICByZXMuc2V0TWV0YShcImNvbW1hbmRcIiwgT3dNLnByb3RvdHlwZS5nZXRNZXRhRnJvbSh2YWx1ZU9iamVjdCwgXCJjb21tYW5kXCIpIHx8IFwiZXhlY3V0ZVN3YXJtUGhhc2VcIik7XG4gICAgICAgIH1cblxuICAgICAgICByZXMuc2V0TWV0YShcIndhaXRTdGFja1wiLCB2YWx1ZU9iamVjdC5tZXRhLndhaXRTdGFjayk7IC8vVE9ETzogdGhpbmsgaWYgaXMgbm90IGJldHRlciB0byBiZSBkZWVwIGNsb25lZCBhbmQgbm90IHJlZmVyZW5jZWQhISFcblxuICAgICAgICBpZihjYWxsYmFjayl7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgcmVzKTtcbiAgICAgICAgfVxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiYXNKU09OOlwiLCByZXMsIHZhbHVlT2JqZWN0KTtcbiAgICAgICAgcmV0dXJuIHJlcztcbn07XG5cbmV4cG9ydHMuanNvblRvTmF0aXZlID0gZnVuY3Rpb24oc2VyaWFsaXNlZFZhbHVlcywgcmVzdWx0KXtcblxuICAgIGZvcihsZXQgdiBpbiBzZXJpYWxpc2VkVmFsdWVzLnB1YmxpY1ZhcnMpe1xuICAgICAgICByZXN1bHQucHVibGljVmFyc1t2XSA9IHNlcmlhbGlzZWRWYWx1ZXMucHVibGljVmFyc1t2XTtcblxuICAgIH07XG4gICAgZm9yKGxldCBsIGluIHNlcmlhbGlzZWRWYWx1ZXMucHJpdmF0ZVZhcnMpe1xuICAgICAgICByZXN1bHQucHJpdmF0ZVZhcnNbbF0gPSBzZXJpYWxpc2VkVmFsdWVzLnByaXZhdGVWYXJzW2xdO1xuICAgIH07XG5cbiAgICBmb3IobGV0IGkgaW4gT3dNLnByb3RvdHlwZS5nZXRNZXRhRnJvbShzZXJpYWxpc2VkVmFsdWVzKSl7XG4gICAgICAgIE93TS5wcm90b3R5cGUuc2V0TWV0YUZvcihyZXN1bHQsIGksIE93TS5wcm90b3R5cGUuZ2V0TWV0YUZyb20oc2VyaWFsaXNlZFZhbHVlcywgaSkpO1xuICAgIH07XG5cbn07IiwidmFyIGNvbW1hbmRzID0ge307XG52YXIgY29tbWFuZHNfaGVscCA9IHt9O1xuXG4vL2dsb2JhbCBmdW5jdGlvbiBhZGRDb21tYW5kXG5hZGRDb21tYW5kID0gZnVuY3Rpb24gYWRkQ29tbWFuZCh2ZXJiLCBhZHZlcmJlLCBmdW5jdCwgaGVscExpbmUpe1xuICAgIHZhciBjbWRJZDtcbiAgICBpZighaGVscExpbmUpe1xuICAgICAgICBoZWxwTGluZSA9IFwiIFwiO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGhlbHBMaW5lID0gXCIgXCIgKyBoZWxwTGluZTtcbiAgICB9XG4gICAgaWYoYWR2ZXJiZSl7XG4gICAgICAgIGNtZElkID0gdmVyYiArIFwiIFwiICsgIGFkdmVyYmU7XG4gICAgICAgIGhlbHBMaW5lID0gdmVyYiArIFwiIFwiICsgIGFkdmVyYmUgKyBoZWxwTGluZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjbWRJZCA9IHZlcmI7XG4gICAgICAgIGhlbHBMaW5lID0gdmVyYiArIGhlbHBMaW5lO1xuICAgIH1cbiAgICBjb21tYW5kc1tjbWRJZF0gPSBmdW5jdDtcbiAgICAgICAgY29tbWFuZHNfaGVscFtjbWRJZF0gPSBoZWxwTGluZTtcbn07XG5cbmZ1bmN0aW9uIGRvSGVscCgpe1xuICAgIGNvbnNvbGUubG9nKFwiTGlzdCBvZiBjb21tYW5kczpcIik7XG4gICAgZm9yKHZhciBsIGluIGNvbW1hbmRzX2hlbHApe1xuICAgICAgICBjb25zb2xlLmxvZyhcIlxcdFwiLCBjb21tYW5kc19oZWxwW2xdKTtcbiAgICB9XG59XG5cbmFkZENvbW1hbmQoXCItaFwiLCBudWxsLCBkb0hlbHAsIFwiXFx0XFx0XFx0XFx0XFx0XFx0IHxqdXN0IHByaW50IHRoZSBoZWxwXCIpO1xuYWRkQ29tbWFuZChcIi8/XCIsIG51bGwsIGRvSGVscCwgXCJcXHRcXHRcXHRcXHRcXHRcXHQgfGp1c3QgcHJpbnQgdGhlIGhlbHBcIik7XG5hZGRDb21tYW5kKFwiaGVscFwiLCBudWxsLCBkb0hlbHAsIFwiXFx0XFx0XFx0XFx0XFx0XFx0IHxqdXN0IHByaW50IHRoZSBoZWxwXCIpO1xuXG5cbmZ1bmN0aW9uIHJ1bkNvbW1hbmQoKXtcbiAgdmFyIGFyZ3YgPSBPYmplY3QuYXNzaWduKFtdLCBwcm9jZXNzLmFyZ3YpO1xuICB2YXIgY21kSWQgPSBudWxsO1xuICB2YXIgY21kID0gbnVsbDtcbiAgYXJndi5zaGlmdCgpO1xuICBhcmd2LnNoaWZ0KCk7XG5cbiAgaWYoYXJndi5sZW5ndGggPj0xKXtcbiAgICAgIGNtZElkID0gYXJndlswXTtcbiAgICAgIGNtZCA9IGNvbW1hbmRzW2NtZElkXTtcbiAgICAgIGFyZ3Yuc2hpZnQoKTtcbiAgfVxuXG5cbiAgaWYoIWNtZCAmJiBhcmd2Lmxlbmd0aCA+PTEpe1xuICAgICAgY21kSWQgPSBjbWRJZCArIFwiIFwiICsgYXJndlswXTtcbiAgICAgIGNtZCA9IGNvbW1hbmRzW2NtZElkXTtcbiAgICAgIGFyZ3Yuc2hpZnQoKTtcbiAgfVxuXG4gIGlmKCFjbWQpe1xuICAgIGlmKGNtZElkKXtcbiAgICAgICAgY29uc29sZS5sb2coXCJVbmtub3duIGNvbW1hbmQ6IFwiLCBjbWRJZCk7XG4gICAgfVxuICAgIGNtZCA9IGRvSGVscDtcbiAgfVxuXG4gIGNtZC5hcHBseShudWxsLGFyZ3YpO1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHJ1bkNvbW1hbmRcbn07XG5cbiIsIlxuZnVuY3Rpb24gZW5jb2RlKGJ1ZmZlcikge1xuICAgIHJldHVybiBidWZmZXIudG9TdHJpbmcoJ2Jhc2U2NCcpXG4gICAgICAgIC5yZXBsYWNlKC9cXCsvZywgJycpXG4gICAgICAgIC5yZXBsYWNlKC9cXC8vZywgJycpXG4gICAgICAgIC5yZXBsYWNlKC89KyQvLCAnJyk7XG59O1xuXG5mdW5jdGlvbiBzdGFtcFdpdGhUaW1lKGJ1Ziwgc2FsdCwgbXNhbHQpe1xuICAgIGlmKCFzYWx0KXtcbiAgICAgICAgc2FsdCA9IDE7XG4gICAgfVxuICAgIGlmKCFtc2FsdCl7XG4gICAgICAgIG1zYWx0ID0gMTtcbiAgICB9XG4gICAgdmFyIGRhdGUgPSBuZXcgRGF0ZTtcbiAgICB2YXIgY3QgPSBNYXRoLmZsb29yKGRhdGUuZ2V0VGltZSgpIC8gc2FsdCk7XG4gICAgdmFyIGNvdW50ZXIgPSAwO1xuICAgIHdoaWxlKGN0ID4gMCApe1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiQ291bnRlclwiLCBjb3VudGVyLCBjdCk7XG4gICAgICAgIGJ1Zltjb3VudGVyKm1zYWx0XSA9IE1hdGguZmxvb3IoY3QgJSAyNTYpO1xuICAgICAgICBjdCA9IE1hdGguZmxvb3IoY3QgLyAyNTYpO1xuICAgICAgICBjb3VudGVyKys7XG4gICAgfVxufVxuXG4vKlxuICAgIFRoZSB1aWQgY29udGFpbnMgYXJvdW5kIDI1NiBiaXRzIG9mIHJhbmRvbW5lc3MgYW5kIGFyZSB1bmlxdWUgYXQgdGhlIGxldmVsIG9mIHNlY29uZHMuIFRoaXMgVVVJRCBzaG91bGQgYnkgY3J5cHRvZ3JhcGhpY2FsbHkgc2FmZSAoY2FuIG5vdCBiZSBndWVzc2VkKVxuXG4gICAgV2UgZ2VuZXJhdGUgYSBzYWZlIFVJRCB0aGF0IGlzIGd1YXJhbnRlZWQgdW5pcXVlIChieSB1c2FnZSBvZiBhIFBSTkcgdG8gZ2VuZWF0ZSAyNTYgYml0cykgYW5kIHRpbWUgc3RhbXBpbmcgd2l0aCB0aGUgbnVtYmVyIG9mIHNlY29uZHMgYXQgdGhlIG1vbWVudCB3aGVuIGlzIGdlbmVyYXRlZFxuICAgIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBzYWZlIHRvIHVzZSBhdCB0aGUgbGV2ZWwgb2YgdmVyeSBsYXJnZSBkaXN0cmlidXRlZCBzeXN0ZW1zLlxuICAgIFRoZSBVVUlEIGlzIHN0YW1wZWQgd2l0aCB0aW1lIChzZWNvbmRzKTogZG9lcyBpdCBvcGVuIGEgd2F5IHRvIGd1ZXNzIHRoZSBVVUlEPyBJdCBkZXBlbmRzIGhvdyBzYWZlIGlzIFwiY3J5cHRvXCIgUFJORywgYnV0IGl0IHNob3VsZCBiZSBubyBwcm9ibGVtLi4uXG5cbiAqL1xuXG52YXIgZ2VuZXJhdGVVaWQgPSBudWxsO1xuXG5cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uKGV4dGVybmFsR2VuZXJhdG9yKXtcbiAgICBnZW5lcmF0ZVVpZCA9IGV4dGVybmFsR2VuZXJhdG9yLmdlbmVyYXRlVWlkO1xuICAgIHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn07XG5cbmV4cG9ydHMuc2FmZV91dWlkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGJ1ZiA9IGdlbmVyYXRlVWlkKDMyKTtcbiAgICBzdGFtcFdpdGhUaW1lKGJ1ZiwgMTAwMCwgMyk7XG4gICAgcmV0dXJuIGVuY29kZShidWYpO1xufTtcblxuXG5cbi8qXG4gICAgVHJ5IHRvIGdlbmVyYXRlIGEgc21hbGwgVUlEIHRoYXQgaXMgdW5pcXVlIGFnYWluc3QgY2hhbmNlIGluIHRoZSBzYW1lIG1pbGxpc2Vjb25kIHNlY29uZCBhbmQgaW4gYSBzcGVjaWZpYyBjb250ZXh0IChlZyBpbiB0aGUgc2FtZSBjaG9yZW9ncmFwaHkgZXhlY3V0aW9uKVxuICAgIFRoZSBpZCBjb250YWlucyBhcm91bmQgNio4ID0gNDggIGJpdHMgb2YgcmFuZG9tbmVzcyBhbmQgYXJlIHVuaXF1ZSBhdCB0aGUgbGV2ZWwgb2YgbWlsbGlzZWNvbmRzXG4gICAgVGhpcyBtZXRob2QgaXMgc2FmZSBvbiBhIHNpbmdsZSBjb21wdXRlciBidXQgc2hvdWxkIGJlIHVzZWQgd2l0aCBjYXJlIG90aGVyd2lzZVxuICAgIFRoaXMgVVVJRCBpcyBub3QgY3J5cHRvZ3JhcGhpY2FsbHkgc2FmZSAoY2FuIGJlIGd1ZXNzZWQpXG4gKi9cbmV4cG9ydHMuc2hvcnRfdXVpZCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmVxdWlyZSgnY3J5cHRvJykucmFuZG9tQnl0ZXMoMTIsIGZ1bmN0aW9uIChlcnIsIGJ1Zikge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHN0YW1wV2l0aFRpbWUoYnVmLDEsMik7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIGVuY29kZShidWYpKTtcbiAgICB9KTtcbn07IiwiY29uc3QgY3J5cHRvID0gcmVxdWlyZSgnY3J5cHRvJyk7XG5jb25zdCBRdWV1ZSA9IHJlcXVpcmUoXCIuL1F1ZXVlXCIpO1xudmFyIFBTS0J1ZmZlciA9IHR5cGVvZiAkJCAhPT0gXCJ1bmRlZmluZWRcIiAmJiAkJC5QU0tCdWZmZXIgPyAkJC5QU0tCdWZmZXIgOiBCdWZmZXI7XG5cbmZ1bmN0aW9uIFVpZEdlbmVyYXRvcihtaW5CdWZmZXJzLCBidWZmZXJzU2l6ZSkge1xuXHR2YXIgYnVmZmVycyA9IG5ldyBRdWV1ZSgpO1xuXHR2YXIgbG93TGltaXQgPSAuMjtcblxuXHRmdW5jdGlvbiBmaWxsQnVmZmVycyhzaXplKXtcblx0XHQvL25vdGlmeU9ic2VydmVyKCk7XG5cdFx0Y29uc3Qgc3ogPSBzaXplIHx8IG1pbkJ1ZmZlcnM7XG5cdFx0aWYoYnVmZmVycy5sZW5ndGggPCBNYXRoLmZsb29yKG1pbkJ1ZmZlcnMqbG93TGltaXQpKXtcblx0XHRcdGZvcih2YXIgaT0wK2J1ZmZlcnMubGVuZ3RoOyBpIDwgc3o7IGkrKyl7XG5cdFx0XHRcdGdlbmVyYXRlT25lQnVmZmVyKG51bGwpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGZpbGxCdWZmZXJzKCk7XG5cblx0ZnVuY3Rpb24gZ2VuZXJhdGVPbmVCdWZmZXIoYil7XG5cdFx0aWYoIWIpe1xuXHRcdFx0YiA9IFBTS0J1ZmZlci5hbGxvYygwKTtcblx0XHR9XG5cdFx0Y29uc3Qgc3ogPSBidWZmZXJzU2l6ZSAtIGIubGVuZ3RoO1xuXHRcdC8qY3J5cHRvLnJhbmRvbUJ5dGVzKHN6LCBmdW5jdGlvbiAoZXJyLCByZXMpIHtcblx0XHRcdGJ1ZmZlcnMucHVzaChCdWZmZXIuY29uY2F0KFtyZXMsIGJdKSk7XG5cdFx0XHRub3RpZnlPYnNlcnZlcigpO1xuXHRcdH0pOyovXG5cdFx0YnVmZmVycy5wdXNoKFBTS0J1ZmZlci5jb25jYXQoWyBjcnlwdG8ucmFuZG9tQnl0ZXMoc3opLCBiIF0pKTtcblx0XHRub3RpZnlPYnNlcnZlcigpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZXh0cmFjdE4obil7XG5cdFx0dmFyIHN6ID0gTWF0aC5mbG9vcihuIC8gYnVmZmVyc1NpemUpO1xuXHRcdHZhciByZXQgPSBbXTtcblxuXHRcdGZvcih2YXIgaT0wOyBpPHN6OyBpKyspe1xuXHRcdFx0cmV0LnB1c2goYnVmZmVycy5wb3AoKSk7XG5cdFx0XHRzZXRUaW1lb3V0KGdlbmVyYXRlT25lQnVmZmVyLCAxKTtcblx0XHR9XG5cblxuXG5cdFx0dmFyIHJlbWFpbmRlciA9IG4gJSBidWZmZXJzU2l6ZTtcblx0XHRpZihyZW1haW5kZXIgPiAwKXtcblx0XHRcdHZhciBmcm9udCA9IGJ1ZmZlcnMucG9wKCk7XG5cdFx0XHRyZXQucHVzaChmcm9udC5zbGljZSgwLHJlbWFpbmRlcikpO1xuXHRcdFx0Ly9nZW5lcmF0ZU9uZUJ1ZmZlcihmcm9udC5zbGljZShyZW1haW5kZXIpKTtcblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0Z2VuZXJhdGVPbmVCdWZmZXIoZnJvbnQuc2xpY2UocmVtYWluZGVyKSk7XG5cdFx0XHR9LDEpO1xuXHRcdH1cblxuXHRcdC8vc2V0VGltZW91dChmaWxsQnVmZmVycywgMSk7XG5cblx0XHRyZXR1cm4gQnVmZmVyLmNvbmNhdChyZXQpO1xuXHR9XG5cblx0dmFyIGZpbGxJblByb2dyZXNzID0gZmFsc2U7XG5cblx0dGhpcy5nZW5lcmF0ZVVpZCA9IGZ1bmN0aW9uKG4pe1xuXHRcdHZhciB0b3RhbFNpemUgPSBidWZmZXJzLmxlbmd0aCAqIGJ1ZmZlcnNTaXplO1xuXHRcdGlmKG4gPD0gdG90YWxTaXplKXtcblx0XHRcdHJldHVybiBleHRyYWN0TihuKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYoIWZpbGxJblByb2dyZXNzKXtcblx0XHRcdFx0ZmlsbEluUHJvZ3Jlc3MgPSB0cnVlO1xuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0ZmlsbEJ1ZmZlcnMoTWF0aC5mbG9vcihtaW5CdWZmZXJzKjIuNSkpO1xuXHRcdFx0XHRcdGZpbGxJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdH0sIDEpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGNyeXB0by5yYW5kb21CeXRlcyhuKTtcblx0XHR9XG5cdH07XG5cblx0dmFyIG9ic2VydmVyO1xuXHR0aGlzLnJlZ2lzdGVyT2JzZXJ2ZXIgPSBmdW5jdGlvbihvYnMpe1xuXHRcdGlmKG9ic2VydmVyKXtcblx0XHRcdGNvbnNvbGUuZXJyb3IobmV3IEVycm9yKFwiT25lIG9ic2VydmVyIGFsbG93ZWQhXCIpKTtcblx0XHR9ZWxzZXtcblx0XHRcdGlmKHR5cGVvZiBvYnMgPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0b2JzZXJ2ZXIgPSBvYnM7XG5cdFx0XHRcdC8vbm90aWZ5T2JzZXJ2ZXIoKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0ZnVuY3Rpb24gbm90aWZ5T2JzZXJ2ZXIoKXtcblx0XHRpZihvYnNlcnZlcil7XG5cdFx0XHR2YXIgdmFsdWVUb1JlcG9ydCA9IGJ1ZmZlcnMubGVuZ3RoKmJ1ZmZlcnNTaXplO1xuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRvYnNlcnZlcihudWxsLCB7XCJzaXplXCI6IHZhbHVlVG9SZXBvcnR9KTtcblx0XHRcdH0sIDEwKTtcblx0XHR9XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlVWlkR2VuZXJhdG9yID0gZnVuY3Rpb24gKG1pbkJ1ZmZlcnMsIGJ1ZmZlclNpemUpIHtcblx0cmV0dXJuIG5ldyBVaWRHZW5lcmF0b3IobWluQnVmZmVycywgYnVmZmVyU2l6ZSk7XG59O1xuIiwidmFyIG1xID0gJCQucmVxdWlyZShcImZvbGRlcm1xXCIpO1xuXG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuY29uc3QgY2hpbGRfcHJvY2VzcyA9IHJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuXG5jb25zdCBSRVNUQVJUX1RJTUVPVVQgPSA1MDA7XG5jb25zdCBSRVNUQVJUX1RJTUVPVVRfTElNSVQgPSA1MDAwMDtcblxudmFyIHNhbmRib3hlcyA9IHt9O1xudmFyIGV4aXRIYW5kbGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL2V4aXRIYW5kbGVyXCIpKHNhbmRib3hlcyk7XG5cbnZhciBib290U2FuZEJveCA9ICQkLmZsb3cuZGVzY3JpYmUoXCJQcml2YXRlU2t5LnN3YXJtLmVuZ2luZS5ib290SW5MYXVuY2hlclwiLCB7XG4gICAgYm9vdDpmdW5jdGlvbihzYW5kQm94LCBzcGFjZU5hbWUsIGZvbGRlciwgY29kZUZvbGRlciwgY2FsbGJhY2spe1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkJvb3RpbmcgaW4gXCIsIGZvbGRlciwgXCIgY29udGV4dCBcIiwgc3BhY2VOYW1lKTtcblxuICAgICAgICB0aGlzLmNhbGxiYWNrICAgPSBjYWxsYmFjaztcbiAgICAgICAgdGhpcy5mb2xkZXIgICAgID0gZm9sZGVyO1xuICAgICAgICB0aGlzLnNwYWNlTmFtZSAgPSBzcGFjZU5hbWU7XG4gICAgICAgIHRoaXMuc2FuZEJveCAgICA9IHNhbmRCb3g7XG4gICAgICAgIHRoaXMuY29kZUZvbGRlciAgICA9IGNvZGVGb2xkZXI7XG4gICAgICAgIHRoaXMudGltZW91dE11bHRpcGxpZXIgPSAxO1xuXG4gICAgICAgIHZhciB0YXNrID0gdGhpcy5zZXJpYWwodGhpcy5lbnN1cmVGb2xkZXJzRXhpc3RzKTtcblxuICAgICAgICB0YXNrLmZvbGRlclNob3VsZEV4aXN0KHBhdGguam9pbih0aGlzLmZvbGRlciwgXCJtcVwiKSwgICAgdGFzay5wcm9ncmVzcyk7XG4gICAgICAgIHRhc2suZm9sZGVyU2hvdWxkRXhpc3QocGF0aC5qb2luKHRoaXMuZm9sZGVyLCBcImJ1bmRsZXNcIiksICB0YXNrLnByb2dyZXNzKTtcbiAgICAgICAgdGFzay5mb2xkZXJTaG91bGRFeGlzdChwYXRoLmpvaW4odGhpcy5mb2xkZXIsIFwidG1wXCIpLCAgIHRhc2sucHJvZ3Jlc3MpO1xuICAgIH0sXG4gICAgZm9sZGVyU2hvdWxkRXhpc3Q6ICBmdW5jdGlvbihwYXRoLCBwcm9ncmVzcyl7XG4gICAgICAgIGZzLm1rZGlyKHBhdGgsIHtyZWN1cnNpdmU6IHRydWV9LCBwcm9ncmVzcyk7XG4gICAgfSxcbiAgICBjb3B5Rm9sZGVyOiBmdW5jdGlvbihzb3VyY2VQYXRoLCB0YXJnZXRQYXRoLCBjYWxsYmFjayl7XG4gICAgICAgIGxldCBmc0V4dCA9IHJlcXVpcmUoXCJ1dGlsc1wiKS5mc0V4dDtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgZnNFeHQuY29weShzb3VyY2VQYXRoLCB0YXJnZXRQYXRoLCB7b3ZlcndyaXRlOiB0cnVlfSwgY2FsbGJhY2spO1xuICAgICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR290IHNvbWV0aGluZy4uLlwiLCBlcnIpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBlbnN1cmVGb2xkZXJzRXhpc3RzOiBmdW5jdGlvbihlcnIsIHJlcyl7XG4gICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHRhc2sgPSB0aGlzLnBhcmFsbGVsKHRoaXMucnVuQ29kZSk7XG4gICAgICAgICAgICB0aGlzLnNhbmRCb3guaW5ib3VuZCA9IG1xLmNyZWF0ZVF1ZShwYXRoLmpvaW4odGhpcy5mb2xkZXIsIFwibXEvaW5ib3VuZFwiKSwgdGhpcy5wcm9ncmVzcyk7XG4gICAgICAgICAgICB0aGlzLnNhbmRCb3gub3V0Ym91bmQgPSBtcS5jcmVhdGVRdWUocGF0aC5qb2luKHRoaXMuZm9sZGVyLCBcIm1xL291dGJvdW5kXCIpLCB0aGlzLnByb2dyZXNzKTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJQcmVwYXJpbmcgdG8gY29weVwiLCBwYXRoLmpvaW4odGhpcy5jb2RlRm9sZGVyLCBcImJ1bmRsZXNcIiksIHBhdGgucmVzb2x2ZShwYXRoLmpvaW4odGhpcy5mb2xkZXIsIFwiYnVuZGxlc1wiKSkpO1xuICAgICAgICAgICAgdGhpcy5jb3B5Rm9sZGVyKHBhdGguam9pbih0aGlzLmNvZGVGb2xkZXIsIFwiYnVuZGxlc1wiKSwgcGF0aC5yZXNvbHZlKHBhdGguam9pbih0aGlzLmZvbGRlciwgXCJidW5kbGVzXCIpKSwgdGFzay5wcm9ncmVzcyk7XG4gICAgICAgIH1cblxuICAgIH0sXG4gICAgcnVuQ29kZTogZnVuY3Rpb24oZXJyLCByZXMpe1xuICAgICAgICBpZighZXJyKXtcbiAgICAgICAgICAgIHZhciBtYWluRmlsZSA9IHBhdGguam9pbihwcm9jZXNzLmVudi5QUklWQVRFU0tZX1JPT1RfRk9MREVSLCBcImNvcmVcIiwgXCJzYW5kYm94ZXNcIiwgXCJhZ2VudFNhbmRib3guanNcIik7XG4gICAgICAgICAgICB2YXIgYXJncyA9IFt0aGlzLnNwYWNlTmFtZSwgcHJvY2Vzcy5lbnYuUFJJVkFURVNLWV9ST09UX0ZPTERFUiwgcGF0aC5yZXNvbHZlKHByb2Nlc3MuZW52LlBSSVZBVEVTS1lfRE9NQUlOX0JVSUxEKV07XG4gICAgICAgICAgICB2YXIgb3B0cyA9IHtzdGRpbzogWzAsIDEsIDIsIFwiaXBjXCJdfTtcblxuICAgICAgICAgICAgdmFyIHN0YXJ0Q2hpbGQgPSAobWFpbkZpbGUsIGFyZ3MsIG9wdHMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJSdW5uaW5nOiBcIiwgbWFpbkZpbGUsIGFyZ3MsIG9wdHMpO1xuXHRcdFx0XHR2YXIgY2hpbGQgPSBjaGlsZF9wcm9jZXNzLmZvcmsobWFpbkZpbGUsIGFyZ3MpO1xuXHRcdFx0XHRzYW5kYm94ZXNbdGhpcy5zcGFjZU5hbWVdID0gY2hpbGQ7XG5cblx0XHRcdFx0dGhpcy5zYW5kQm94LmluYm91bmQuc2V0SVBDQ2hhbm5lbChjaGlsZCk7XG5cdFx0XHRcdHRoaXMuc2FuZEJveC5vdXRib3VuZC5zZXRJUENDaGFubmVsKGNoaWxkKTtcblxuXHRcdFx0XHRjaGlsZC5vbihcImV4aXRcIiwgKGNvZGUsIHNpZ25hbCk9Pntcblx0XHRcdFx0ICAgIGlmKGNvZGUgPT09IDApe1xuXHRcdFx0XHQgICAgICAgIGNvbnNvbGUubG9nKGBTYW5kYm94IDwke3RoaXMuc3BhY2VOYW1lfT4gc2h1dHRpbmcgZG93bi5gKTtcblx0XHRcdFx0ICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblx0XHRcdFx0ICAgIGxldCB0aW1lb3V0ID0gKHRoaXMudGltZW91dE11bHRpcGxpZXIqUkVTVEFSVF9USU1FT1VUKSAlIFJFU1RBUlRfVElNRU9VVF9MSU1JVDtcblx0XHRcdFx0ICAgIGNvbnNvbGUubG9nKGBTYW5kYm94IDwke3RoaXMuc3BhY2VOYW1lfT4gZXhpdHMgd2l0aCBjb2RlICR7Y29kZX0uIFJlc3RhcnRpbmcgaW4gJHt0aW1lb3V0fSBtcy5gKTtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHRcdFx0XHRzdGFydENoaWxkKG1haW5GaWxlLCBhcmdzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGltZW91dE11bHRpcGxpZXIgKj0gMS41O1xuICAgICAgICAgICAgICAgICAgICB9LCB0aW1lb3V0KTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0cmV0dXJuIGNoaWxkO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5jYWxsYmFjayhudWxsLCBzdGFydENoaWxkKG1haW5GaWxlLCBhcmdzLCBvcHRzKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIGV4ZWN1dGluZyBzYW5kYm94ITpcIiwgZXJyKTtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2soZXJyLCBudWxsKTtcbiAgICAgICAgfVxuICAgIH1cblxufSk7XG5cbmZ1bmN0aW9uIFNhbmRCb3hIYW5kbGVyKHNwYWNlTmFtZSwgZm9sZGVyLCBjb2RlRm9sZGVyLCByZXN1bHRDYWxsQmFjayl7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1xSGFuZGxlcjtcblxuXG4gICAgYm9vdFNhbmRCb3goKS5ib290KHRoaXMsIHNwYWNlTmFtZSxmb2xkZXIsIGNvZGVGb2xkZXIsIGZ1bmN0aW9uKGVyciwgY2hpbGRQcm9jZXNzKXtcbiAgICAgICAgaWYoIWVycil7XG4gICAgICAgICAgICBzZWxmLmNoaWxkUHJvY2VzcyA9IGNoaWxkUHJvY2VzcztcblxuXG4gICAgICAgICAgICAvKnNlbGYub3V0Ym91bmQucmVnaXN0ZXJDb25zdW1lcihmdW5jdGlvbihlcnIsIHN3YXJtKXtcbiAgICAgICAgICAgICAgICAkJC5QU0tfUHViU3ViLnB1Ymxpc2goJCQuQ09OU1RBTlRTLlNXQVJNX0ZPUl9FWEVDVVRJT04sIHN3YXJtKTtcbiAgICAgICAgICAgIH0pOyovXG5cbiAgICAgICAgICAgIHNlbGYub3V0Ym91bmQucmVnaXN0ZXJBc0lQQ0NvbnN1bWVyKGZ1bmN0aW9uKGVyciwgc3dhcm0pe1xuICAgICAgICAgICAgICAgICQkLlBTS19QdWJTdWIucHVibGlzaCgkJC5DT05TVEFOVFMuU1dBUk1fRk9SX0VYRUNVVElPTiwgc3dhcm0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIG1xSGFuZGxlciA9IHNlbGYuaW5ib3VuZC5nZXRIYW5kbGVyKCk7XG4gICAgICAgICAgICBpZihwZW5kaW5nTWVzc2FnZXMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICBwZW5kaW5nTWVzc2FnZXMubWFwKGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnNlbmQoaXRlbSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcGVuZGluZ01lc3NhZ2VzID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIHBlbmRpbmdNZXNzYWdlcyA9IFtdO1xuXG4gICAgdGhpcy5zZW5kID0gZnVuY3Rpb24gKHN3YXJtLCBjYWxsYmFjaykge1xuICAgICAgICBpZihtcUhhbmRsZXIpe1xuICAgICAgICAgICAgbXFIYW5kbGVyLnNlbmRTd2FybUZvckV4ZWN1dGlvbihzd2FybSwgY2FsbGJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVuZGluZ01lc3NhZ2VzLnB1c2goc3dhcm0pOyAvL1RPRE86IHdlbGwsIGEgZGVlcCBjbG9uZSB3aWxsIG5vdCBiZSBhIGJldHRlciBpZGVhP1xuICAgICAgICB9XG4gICAgfVxuXG59XG5cblxuZnVuY3Rpb24gU2FuZEJveE1hbmFnZXIoc2FuZGJveGVzRm9sZGVyLCBjb2RlRm9sZGVyLCBjYWxsYmFjayl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHNhbmRCb3hlcyA9IHtcblxuICAgIH07XG4gICAgZnVuY3Rpb24gYmVsb25nc1RvUmVwbGljYXRlZFNwYWNlKCl7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vY29uc29sZS5sb2coXCJTdWJzY3JpYmluZyB0bzpcIiwgJCQuQ09OU1RBTlRTLlNXQVJNX0ZPUl9FWEVDVVRJT04pO1xuICAgICQkLlBTS19QdWJTdWIuc3Vic2NyaWJlKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OLCBmdW5jdGlvbihzd2FybSl7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRXhlY3V0aW5nIGluIHNhbmRib3ggdG93YXJkczogXCIsIHN3YXJtLm1ldGEudGFyZ2V0KTtcblxuICAgICAgICBpZihzd2FybS5tZXRhLnRhcmdldCA9PSBcInN5c3RlbVwiIHx8IHN3YXJtLm1ldGEuY29tbWFuZCA9PSBcImFzeW5jUmV0dXJuXCIpe1xuICAgICAgICAgICAgJCQuc3dhcm1zSW5zdGFuY2VzTWFuYWdlci5yZXZpdmVfc3dhcm0oc3dhcm0pO1xuICAgICAgICAgICAgLy8kJC5zd2FybXMucmVzdGFydChzd2FybS5tZXRhLnN3YXJtVHlwZU5hbWUsIHN3YXJtKTtcbiAgICAgICAgfSBlbHNlXG4gICAgICAgIGlmKHN3YXJtLm1ldGEudGFyZ2V0ID09IFwicGRzXCIpe1xuICAgICAgICAgICAgLy9cbiAgICAgICAgfSBlbHNlXG4gICAgICAgIGlmKGJlbG9uZ3NUb1JlcGxpY2F0ZWRTcGFjZShzd2FybS5tZXRhLnRhcmdldCkpe1xuICAgICAgICAgICAgc2VsZi5wdXNoVG9TcGFjZUFTd2FybShzd2FybS5tZXRhLnRhcmdldCwgc3dhcm0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9UT0RPOiBzZW5kIHRvd2FyZHMgbmV0d29ya1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuXG4gICAgZnVuY3Rpb24gc3RhcnRTYW5kQm94KHNwYWNlTmFtZSl7XG4gICAgICAgIHZhciBzYW5kQm94ID0gbmV3IFNhbmRCb3hIYW5kbGVyKHNwYWNlTmFtZSwgcGF0aC5qb2luKHNhbmRib3hlc0ZvbGRlciwgc3BhY2VOYW1lKSwgY29kZUZvbGRlcik7XG4gICAgICAgIHNhbmRCb3hlc1tzcGFjZU5hbWVdID0gc2FuZEJveDtcbiAgICAgICAgcmV0dXJuIHNhbmRCb3g7XG4gICAgfVxuXG5cbiAgICB0aGlzLnB1c2hUb1NwYWNlQVN3YXJtID0gZnVuY3Rpb24oc3BhY2VOYW1lLCBzd2FybSwgY2FsbGJhY2spe1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwicHVzaFRvU3BhY2VBU3dhcm0gXCIgLCBzcGFjZU5hbWUpO1xuICAgICAgICB2YXIgc2FuZGJveCA9IHNhbmRCb3hlc1tzcGFjZU5hbWVdO1xuICAgICAgICBpZighc2FuZGJveCl7XG4gICAgICAgICAgICBzYW5kYm94ID0gc2FuZEJveGVzW3NwYWNlTmFtZV0gPSBzdGFydFNhbmRCb3goc3BhY2VOYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBzYW5kYm94LnNlbmQoc3dhcm0sIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICBjYWxsYmFjayhudWxsLCB0aGlzKTtcbn1cblxuXG5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uKGZvbGRlciwgY29kZUZvbGRlciwgY2FsbGJhY2spe1xuICAgIG5ldyBTYW5kQm94TWFuYWdlcihmb2xkZXIsIGNvZGVGb2xkZXIsIGNhbGxiYWNrKTtcbn07XG5cblxuIiwiY29uc3QgZXZlbnRzID0gW1wiZXhpdFwiLCBcIlNJR0lOVFwiLCBcIlNJR1VTUjFcIiwgXCJTSUdVU1IyXCIsIFwidW5jYXVnaHRFeGNlcHRpb25cIiwgXCJTSUdURVJNXCIsIFwiU0lHSFVQXCJdO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG1hbmFnZVNodXRkb3duUHJvY2VzcyhjaGlsZHJlbkxpc3Qpe1xuXG4gICAgbGV0IHNodXR0aW5nID0gZmFsc2U7XG4gICAgZnVuY3Rpb24gaGFuZGxlcigpe1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiSGFuZGxpbmcgZXhpdCBldmVudCBvblwiLCBwcm9jZXNzLnBpZCwgXCJhcmd1bWVudHM6XCIsIGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBjaGlsZHJlbk5hbWVzID0gT2JqZWN0LmtleXMoY2hpbGRyZW5MaXN0KTtcbiAgICAgICAgZm9yKGxldCBqPTA7IGo8Y2hpbGRyZW5OYW1lcy5sZW5ndGg7IGorKyl7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbkxpc3RbY2hpbGRyZW5OYW1lc1tqXV07XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKGBbJHtwcm9jZXNzLnBpZH1dYCwgXCJTZW5kaW5nIGtpbGwgc2lnbmFsIHRvIFBJRDpcIiwgY2hpbGQucGlkKTtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmtpbGwoY2hpbGQucGlkKTtcbiAgICAgICAgICAgIH1jYXRjaChlcnIpe1xuICAgICAgICAgICAgICAgIC8vLi4uXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZighc2h1dHRpbmcpe1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO1xuICAgICAgICAgICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKGBbUElEOiAke3Byb2Nlc3MucGlkfV0gW1RpbWVzdGFtcDogJHtuZXcgRGF0ZSgpLmdldFRpbWUoKX1dIFtQcm9jZXNzIGFyZ3Y6ICR7cHJvY2Vzcy5hcmd2fV0tIFNodXR0aW5nIGRvd24uLi5cXG5gKTtcbiAgICAgICAgICAgIH1jYXRjaChlcnIpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgLy8uLi5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNodXR0aW5nID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfVxuXG4gICAgcHJvY2Vzcy5zdGRpbi5yZXN1bWUoKTtcbiAgICBmb3IobGV0IGk9MDsgaTxldmVudHMubGVuZ3RoOyBpKyspe1xuICAgICAgICB2YXIgZXZlbnRUeXBlID0gZXZlbnRzW2ldO1xuICAgICAgICBwcm9jZXNzLm9uKGV2ZW50VHlwZSwgaGFuZGxlcik7XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2coXCJFeGl0IGhhbmRsZXIgc2V0dXAhXCIsIGBbJHtwcm9jZXNzLnBpZH1dYCk7XG59OyIsIiFmdW5jdGlvbihlLHQpe1wib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzJiZcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlP21vZHVsZS5leHBvcnRzPXQoKTpcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFtdLHQpOlwib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzP2V4cG9ydHMuTWVzc2FnZVBhY2s9dCgpOmUuTWVzc2FnZVBhY2s9dCgpfSh0aGlzLGZ1bmN0aW9uKCl7cmV0dXJuIGZ1bmN0aW9uKGUpe3ZhciB0PXt9O2Z1bmN0aW9uIHIobil7aWYodFtuXSlyZXR1cm4gdFtuXS5leHBvcnRzO3ZhciBpPXRbbl09e2k6bixsOiExLGV4cG9ydHM6e319O3JldHVybiBlW25dLmNhbGwoaS5leHBvcnRzLGksaS5leHBvcnRzLHIpLGkubD0hMCxpLmV4cG9ydHN9cmV0dXJuIHIubT1lLHIuYz10LHIuZD1mdW5jdGlvbihlLHQsbil7ci5vKGUsdCl8fE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLHQse2VudW1lcmFibGU6ITAsZ2V0Om59KX0sci5yPWZ1bmN0aW9uKGUpe1widW5kZWZpbmVkXCIhPXR5cGVvZiBTeW1ib2wmJlN5bWJvbC50b1N0cmluZ1RhZyYmT2JqZWN0LmRlZmluZVByb3BlcnR5KGUsU3ltYm9sLnRvU3RyaW5nVGFnLHt2YWx1ZTpcIk1vZHVsZVwifSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGUsXCJfX2VzTW9kdWxlXCIse3ZhbHVlOiEwfSl9LHIudD1mdW5jdGlvbihlLHQpe2lmKDEmdCYmKGU9cihlKSksOCZ0KXJldHVybiBlO2lmKDQmdCYmXCJvYmplY3RcIj09dHlwZW9mIGUmJmUmJmUuX19lc01vZHVsZSlyZXR1cm4gZTt2YXIgbj1PYmplY3QuY3JlYXRlKG51bGwpO2lmKHIucihuKSxPYmplY3QuZGVmaW5lUHJvcGVydHkobixcImRlZmF1bHRcIix7ZW51bWVyYWJsZTohMCx2YWx1ZTplfSksMiZ0JiZcInN0cmluZ1wiIT10eXBlb2YgZSlmb3IodmFyIGkgaW4gZSlyLmQobixpLGZ1bmN0aW9uKHQpe3JldHVybiBlW3RdfS5iaW5kKG51bGwsaSkpO3JldHVybiBufSxyLm49ZnVuY3Rpb24oZSl7dmFyIHQ9ZSYmZS5fX2VzTW9kdWxlP2Z1bmN0aW9uKCl7cmV0dXJuIGUuZGVmYXVsdH06ZnVuY3Rpb24oKXtyZXR1cm4gZX07cmV0dXJuIHIuZCh0LFwiYVwiLHQpLHR9LHIubz1mdW5jdGlvbihlLHQpe3JldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZSx0KX0sci5wPVwiXCIscihyLnM9MCl9KFtmdW5jdGlvbihlLHQscil7XCJ1c2Ugc3RyaWN0XCI7ci5yKHQpO3ZhciBuPWZ1bmN0aW9uKGUsdCl7dmFyIHI9XCJmdW5jdGlvblwiPT10eXBlb2YgU3ltYm9sJiZlW1N5bWJvbC5pdGVyYXRvcl07aWYoIXIpcmV0dXJuIGU7dmFyIG4saSxvPXIuY2FsbChlKSxzPVtdO3RyeXtmb3IoOyh2b2lkIDA9PT10fHx0LS0gPjApJiYhKG49by5uZXh0KCkpLmRvbmU7KXMucHVzaChuLnZhbHVlKX1jYXRjaChlKXtpPXtlcnJvcjplfX1maW5hbGx5e3RyeXtuJiYhbi5kb25lJiYocj1vLnJldHVybikmJnIuY2FsbChvKX1maW5hbGx5e2lmKGkpdGhyb3cgaS5lcnJvcn19cmV0dXJuIHN9LGk9ZnVuY3Rpb24oKXtmb3IodmFyIGU9W10sdD0wO3Q8YXJndW1lbnRzLmxlbmd0aDt0KyspZT1lLmNvbmNhdChuKGFyZ3VtZW50c1t0XSkpO3JldHVybiBlfSxvPVwidW5kZWZpbmVkXCIhPXR5cGVvZiBUZXh0RW5jb2RlciYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIFRleHREZWNvZGVyO2Z1bmN0aW9uIHMoZSl7Zm9yKHZhciB0PWUubGVuZ3RoLHI9MCxuPTA7bjx0Oyl7dmFyIGk9ZS5jaGFyQ29kZUF0KG4rKyk7aWYoMCE9KDQyOTQ5NjcxNjgmaSkpaWYoMD09KDQyOTQ5NjUyNDgmaSkpcis9MjtlbHNle2lmKGk+PTU1Mjk2JiZpPD01NjMxOSYmbjx0KXt2YXIgbz1lLmNoYXJDb2RlQXQobik7NTYzMjA9PSg2NDUxMiZvKSYmKCsrbixpPSgoMTAyMyZpKTw8MTApKygxMDIzJm8pKzY1NTM2KX1yKz0wPT0oNDI5NDkwMTc2MCZpKT8zOjR9ZWxzZSByKyt9cmV0dXJuIHJ9dmFyIGE9bz9uZXcgVGV4dEVuY29kZXI6dm9pZCAwO3ZhciB1PWEmJmEuZW5jb2RlSW50bz9mdW5jdGlvbihlLHQscil7YS5lbmNvZGVJbnRvKGUsdC5zdWJhcnJheShyKSl9OmZ1bmN0aW9uKGUsdCxyKXt0LnNldChhLmVuY29kZShlKSxyKX0saD02NTUzNjt2YXIgYz1vP25ldyBUZXh0RGVjb2RlcjpudWxsO3ZhciBmPWZ1bmN0aW9uKGUsdCl7dGhpcy50eXBlPWUsdGhpcy5kYXRhPXR9O2Z1bmN0aW9uIGwoZSx0LHIpe3ZhciBuPU1hdGguZmxvb3Ioci80Mjk0OTY3Mjk2KSxpPXI7ZS5zZXRVaW50MzIodCxuKSxlLnNldFVpbnQzMih0KzQsaSl9ZnVuY3Rpb24gcChlLHQpe3JldHVybiA0Mjk0OTY3Mjk2KmUuZ2V0SW50MzIodCkrZS5nZXRVaW50MzIodCs0KX12YXIgZD00Mjk0OTY3Mjk1LHk9MTcxNzk4NjkxODM7ZnVuY3Rpb24gdyhlKXt2YXIgdD1lLnNlYyxyPWUubnNlYztpZih0Pj0wJiZyPj0wJiZ0PD15KXtpZigwPT09ciYmdDw9ZCl7dmFyIG49bmV3IFVpbnQ4QXJyYXkoNCk7cmV0dXJuKHM9bmV3IERhdGFWaWV3KG4uYnVmZmVyKSkuc2V0VWludDMyKDAsdCksbn12YXIgaT10LzQyOTQ5NjcyOTYsbz00Mjk0OTY3Mjk1JnQ7bj1uZXcgVWludDhBcnJheSg4KTtyZXR1cm4ocz1uZXcgRGF0YVZpZXcobi5idWZmZXIpKS5zZXRVaW50MzIoMCxyPDwyfDMmaSkscy5zZXRVaW50MzIoNCxvKSxufXZhciBzO249bmV3IFVpbnQ4QXJyYXkoMTIpO3JldHVybihzPW5ldyBEYXRhVmlldyhuLmJ1ZmZlcikpLnNldFVpbnQzMigwLHIpLGwocyw0LHQpLG59ZnVuY3Rpb24gdihlKXt2YXIgdD1lLmdldFRpbWUoKSxyPU1hdGguZmxvb3IodC8xZTMpLG49MWU2Kih0LTFlMypyKSxpPU1hdGguZmxvb3Iobi8xZTkpO3JldHVybntzZWM6citpLG5zZWM6bi0xZTkqaX19ZnVuY3Rpb24gYihlKXtyZXR1cm4gZSBpbnN0YW5jZW9mIERhdGU/dyh2KGUpKTpudWxsfWZ1bmN0aW9uIGcoZSl7dmFyIHQ9bmV3IERhdGFWaWV3KGUuYnVmZmVyLGUuYnl0ZU9mZnNldCxlLmJ5dGVMZW5ndGgpO3N3aXRjaChlLmJ5dGVMZW5ndGgpe2Nhc2UgNDpyZXR1cm57c2VjOnQuZ2V0VWludDMyKDApLG5zZWM6MH07Y2FzZSA4OnZhciByPXQuZ2V0VWludDMyKDApO3JldHVybntzZWM6NDI5NDk2NzI5NiooMyZyKSt0LmdldFVpbnQzMig0KSxuc2VjOnI+Pj4yfTtjYXNlIDEyOnJldHVybntzZWM6cCh0LDQpLG5zZWM6dC5nZXRVaW50MzIoMCl9O2RlZmF1bHQ6dGhyb3cgbmV3IEVycm9yKFwiVW5yZWNvZ25pemVkIGRhdGEgc2l6ZSBmb3IgdGltZXN0YW1wOiBcIitlLmxlbmd0aCl9fWZ1bmN0aW9uIFUoZSl7dmFyIHQ9ZyhlKTtyZXR1cm4gbmV3IERhdGUoMWUzKnQuc2VjK3QubnNlYy8xZTYpfXZhciBtPXt0eXBlOi0xLGVuY29kZTpiLGRlY29kZTpVfSx4PWZ1bmN0aW9uKCl7ZnVuY3Rpb24gZSgpe3RoaXMuYnVpbHRJbkVuY29kZXJzPVtdLHRoaXMuYnVpbHRJbkRlY29kZXJzPVtdLHRoaXMuZW5jb2RlcnM9W10sdGhpcy5kZWNvZGVycz1bXSx0aGlzLnJlZ2lzdGVyKG0pfXJldHVybiBlLnByb3RvdHlwZS5yZWdpc3Rlcj1mdW5jdGlvbihlKXt2YXIgdD1lLnR5cGUscj1lLmVuY29kZSxuPWUuZGVjb2RlO2lmKHQ+PTApdGhpcy5lbmNvZGVyc1t0XT1yLHRoaXMuZGVjb2RlcnNbdF09bjtlbHNle3ZhciBpPTErdDt0aGlzLmJ1aWx0SW5FbmNvZGVyc1tpXT1yLHRoaXMuYnVpbHRJbkRlY29kZXJzW2ldPW59fSxlLnByb3RvdHlwZS50cnlUb0VuY29kZT1mdW5jdGlvbihlKXtmb3IodmFyIHQ9MDt0PHRoaXMuYnVpbHRJbkVuY29kZXJzLmxlbmd0aDt0Kyspe2lmKG51bGwhPShyPXRoaXMuYnVpbHRJbkVuY29kZXJzW3RdKSlpZihudWxsIT0obj1yKGUpKSlyZXR1cm4gbmV3IGYoLTEtdCxuKX1mb3IodD0wO3Q8dGhpcy5lbmNvZGVycy5sZW5ndGg7dCsrKXt2YXIgcixuO2lmKG51bGwhPShyPXRoaXMuZW5jb2RlcnNbdF0pKWlmKG51bGwhPShuPXIoZSkpKXJldHVybiBuZXcgZih0LG4pfXJldHVybiBlIGluc3RhbmNlb2YgZj9lOm51bGx9LGUucHJvdG90eXBlLmRlY29kZT1mdW5jdGlvbihlLHQpe3ZhciByPXQ8MD90aGlzLmJ1aWx0SW5EZWNvZGVyc1stMS10XTp0aGlzLmRlY29kZXJzW3RdO3JldHVybiByP3IoZSx0KTpuZXcgZih0LGUpfSxlLmRlZmF1bHRDb2RlYz1uZXcgZSxlfSgpO2Z1bmN0aW9uIFMoZSl7cmV0dXJuIGUgaW5zdGFuY2VvZiBVaW50OEFycmF5P2U6QXJyYXlCdWZmZXIuaXNWaWV3KGUpP25ldyBVaW50OEFycmF5KGUuYnVmZmVyLGUuYnl0ZU9mZnNldCxlLmJ5dGVMZW5ndGgpOmUgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcj9uZXcgVWludDhBcnJheShlKTpVaW50OEFycmF5LmZyb20oZSl9dmFyIEE9bnVsbCxFPSEhQTtmdW5jdGlvbiBCKGUsdCxyKXt2YXIgbj1lLmxlbmd0aCxpPTIqbixvPUEubWFsbG9jKGkpOyFmdW5jdGlvbihlLHQscixuKXtmb3IodmFyIGk9bmV3IERhdGFWaWV3KEEubWVtb3J5LmJ1ZmZlcixlLHQpLG89MDtvPG47bysrKWkuc2V0VWludDE2KDIqbyxyLmNoYXJDb2RlQXQobykpfShvLGksZSxuKTt2YXIgcz1BLm1hbGxvYyg1KzQqbik7dHJ5e3ZhciBhPUEudXRmOEVuY29kZVVpbnQxNkFycmF5KHMsbyxuKTtyZXR1cm4gdC5zZXQobmV3IFVpbnQ4QXJyYXkoQS5tZW1vcnkuYnVmZmVyLHMsYSksciksYX1maW5hbGx5e0EuZnJlZShvKSxBLmZyZWUocyl9fXZhciBMPTY1NTM2O2Z1bmN0aW9uIFQoZSx0LHIpe3ZhciBuLGksbyxzPUEubWFsbG9jKHIpLGE9QS5tYWxsb2MoMipyKTt0cnl7bj1zLGk9ZS5zdWJhcnJheSh0LHQrciksbz1yLG5ldyBVaW50OEFycmF5KEEubWVtb3J5LmJ1ZmZlcixuLG8pLnNldChpKTt2YXIgdT1BLnV0ZjhEZWNvZGVUb1VpbnQxNkFycmF5KGEscyxyKTtyZXR1cm4gZnVuY3Rpb24oZSl7aWYoZS5sZW5ndGg8PUwpcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLGUpO2Zvcih2YXIgdD1cIlwiLHI9MDtyPGUubGVuZ3RoO3IrKyl7dmFyIG49ZS5zdWJhcnJheShyKkwsKHIrMSkqTCk7dCs9U3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsbil9cmV0dXJuIHR9KG5ldyBVaW50MTZBcnJheShBLm1lbW9yeS5idWZmZXIsYSx1KSl9ZmluYWxseXtBLmZyZWUocyksQS5mcmVlKGEpfX12YXIgST1mdW5jdGlvbihlKXt2YXIgdD1cImZ1bmN0aW9uXCI9PXR5cGVvZiBTeW1ib2wmJmVbU3ltYm9sLml0ZXJhdG9yXSxyPTA7cmV0dXJuIHQ/dC5jYWxsKGUpOntuZXh0OmZ1bmN0aW9uKCl7cmV0dXJuIGUmJnI+PWUubGVuZ3RoJiYoZT12b2lkIDApLHt2YWx1ZTplJiZlW3IrK10sZG9uZTohZX19fX0sTT0xMDAsaz0yMDQ4LFA9ZnVuY3Rpb24oKXtmdW5jdGlvbiBlKGUsdCxyLG4saSl7dm9pZCAwPT09ZSYmKGU9eC5kZWZhdWx0Q29kZWMpLHZvaWQgMD09PXQmJih0PU0pLHZvaWQgMD09PXImJihyPWspLHZvaWQgMD09PW4mJihuPSExKSx2b2lkIDA9PT1pJiYoaT0hMSksdGhpcy5leHRlbnNpb25Db2RlYz1lLHRoaXMubWF4RGVwdGg9dCx0aGlzLmluaXRpYWxCdWZmZXJTaXplPXIsdGhpcy5zb3J0S2V5cz1uLHRoaXMuZm9yY2VGbG9hdDMyPWksdGhpcy5wb3M9MCx0aGlzLnZpZXc9bmV3IERhdGFWaWV3KG5ldyBBcnJheUJ1ZmZlcih0aGlzLmluaXRpYWxCdWZmZXJTaXplKSksdGhpcy5ieXRlcz1uZXcgVWludDhBcnJheSh0aGlzLnZpZXcuYnVmZmVyKX1yZXR1cm4gZS5wcm90b3R5cGUuZW5jb2RlPWZ1bmN0aW9uKGUsdCl7aWYodD50aGlzLm1heERlcHRoKXRocm93IG5ldyBFcnJvcihcIlRvbyBkZWVwIG9iamVjdHMgaW4gZGVwdGggXCIrdCk7bnVsbD09ZT90aGlzLmVuY29kZU5pbCgpOlwiYm9vbGVhblwiPT10eXBlb2YgZT90aGlzLmVuY29kZUJvb2xlYW4oZSk6XCJudW1iZXJcIj09dHlwZW9mIGU/dGhpcy5lbmNvZGVOdW1iZXIoZSk6XCJzdHJpbmdcIj09dHlwZW9mIGU/dGhpcy5lbmNvZGVTdHJpbmcoZSk6dGhpcy5lbmNvZGVPYmplY3QoZSx0KX0sZS5wcm90b3R5cGUuZ2V0VWludDhBcnJheT1mdW5jdGlvbigpe3JldHVybiB0aGlzLmJ5dGVzLnN1YmFycmF5KDAsdGhpcy5wb3MpfSxlLnByb3RvdHlwZS5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZT1mdW5jdGlvbihlKXt2YXIgdD10aGlzLnBvcytlO3RoaXMudmlldy5ieXRlTGVuZ3RoPHQmJnRoaXMucmVzaXplQnVmZmVyKDIqdCl9LGUucHJvdG90eXBlLnJlc2l6ZUJ1ZmZlcj1mdW5jdGlvbihlKXt2YXIgdD1uZXcgQXJyYXlCdWZmZXIoZSkscj1uZXcgVWludDhBcnJheSh0KSxuPW5ldyBEYXRhVmlldyh0KTtyLnNldCh0aGlzLmJ5dGVzKSx0aGlzLnZpZXc9bix0aGlzLmJ5dGVzPXJ9LGUucHJvdG90eXBlLmVuY29kZU5pbD1mdW5jdGlvbigpe3RoaXMud3JpdGVVOCgxOTIpfSxlLnByb3RvdHlwZS5lbmNvZGVCb29sZWFuPWZ1bmN0aW9uKGUpeyExPT09ZT90aGlzLndyaXRlVTgoMTk0KTp0aGlzLndyaXRlVTgoMTk1KX0sZS5wcm90b3R5cGUuZW5jb2RlTnVtYmVyPWZ1bmN0aW9uKGUpe051bWJlci5pc1NhZmVJbnRlZ2VyKGUpP2U+PTA/ZTwxMjg/dGhpcy53cml0ZVU4KGUpOmU8MjU2Pyh0aGlzLndyaXRlVTgoMjA0KSx0aGlzLndyaXRlVTgoZSkpOmU8NjU1MzY/KHRoaXMud3JpdGVVOCgyMDUpLHRoaXMud3JpdGVVMTYoZSkpOmU8NDI5NDk2NzI5Nj8odGhpcy53cml0ZVU4KDIwNiksdGhpcy53cml0ZVUzMihlKSk6KHRoaXMud3JpdGVVOCgyMDcpLHRoaXMud3JpdGVVNjQoZSkpOmU+PS0zMj90aGlzLndyaXRlVTgoMjI0fGUrMzIpOmU+PS0xMjg/KHRoaXMud3JpdGVVOCgyMDgpLHRoaXMud3JpdGVJOChlKSk6ZT49LTMyNzY4Pyh0aGlzLndyaXRlVTgoMjA5KSx0aGlzLndyaXRlSTE2KGUpKTplPj0tMjE0NzQ4MzY0OD8odGhpcy53cml0ZVU4KDIxMCksdGhpcy53cml0ZUkzMihlKSk6KHRoaXMud3JpdGVVOCgyMTEpLHRoaXMud3JpdGVJNjQoZSkpOnRoaXMuZm9yY2VGbG9hdDMyPyh0aGlzLndyaXRlVTgoMjAyKSx0aGlzLndyaXRlRjMyKGUpKToodGhpcy53cml0ZVU4KDIwMyksdGhpcy53cml0ZUY2NChlKSl9LGUucHJvdG90eXBlLndyaXRlU3RyaW5nSGVhZGVyPWZ1bmN0aW9uKGUpe2lmKGU8MzIpdGhpcy53cml0ZVU4KDE2MCtlKTtlbHNlIGlmKGU8MjU2KXRoaXMud3JpdGVVOCgyMTcpLHRoaXMud3JpdGVVOChlKTtlbHNlIGlmKGU8NjU1MzYpdGhpcy53cml0ZVU4KDIxOCksdGhpcy53cml0ZVUxNihlKTtlbHNle2lmKCEoZTw0Mjk0OTY3Mjk2KSl0aHJvdyBuZXcgRXJyb3IoXCJUb28gbG9uZyBzdHJpbmc6IFwiK2UrXCIgYnl0ZXMgaW4gVVRGLThcIik7dGhpcy53cml0ZVU4KDIxOSksdGhpcy53cml0ZVUzMihlKX19LGUucHJvdG90eXBlLmVuY29kZVN0cmluZz1mdW5jdGlvbihlKXt2YXIgdD1lLmxlbmd0aDtpZihvJiZ0PjIwMCl7dmFyIHI9cyhlKTt0aGlzLmVuc3VyZUJ1ZmZlclNpemVUb1dyaXRlKDUrciksdGhpcy53cml0ZVN0cmluZ0hlYWRlcihyKSx1KGUsdGhpcy5ieXRlcyx0aGlzLnBvcyksdGhpcy5wb3MrPXJ9ZWxzZXtpZihFJiZ0PjEwMjQpe3ZhciBuPTUrNCp0O3RoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUobik7dmFyIGk9QihlLHRoaXMuYnl0ZXMsdGhpcy5wb3MpO3JldHVybiB2b2lkKHRoaXMucG9zKz1pKX1yPXMoZSk7dGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZSg1K3IpLHRoaXMud3JpdGVTdHJpbmdIZWFkZXIociksZnVuY3Rpb24oZSx0LHIpe2Zvcih2YXIgbj1lLmxlbmd0aCxpPXIsbz0wO288bjspe3ZhciBzPWUuY2hhckNvZGVBdChvKyspO2lmKDAhPSg0Mjk0OTY3MTY4JnMpKXtpZigwPT0oNDI5NDk2NTI0OCZzKSl0W2krK109cz4+NiYzMXwxOTI7ZWxzZXtpZihzPj01NTI5NiYmczw9NTYzMTkmJm88bil7dmFyIGE9ZS5jaGFyQ29kZUF0KG8pOzU2MzIwPT0oNjQ1MTImYSkmJigrK28scz0oKDEwMjMmcyk8PDEwKSsoMTAyMyZhKSs2NTUzNil9MD09KDQyOTQ5MDE3NjAmcyk/KHRbaSsrXT1zPj4xMiYxNXwyMjQsdFtpKytdPXM+PjYmNjN8MTI4KToodFtpKytdPXM+PjE4Jjd8MjQwLHRbaSsrXT1zPj4xMiY2M3wxMjgsdFtpKytdPXM+PjYmNjN8MTI4KX10W2krK109NjMmc3wxMjh9ZWxzZSB0W2krK109c319KGUsdGhpcy5ieXRlcyx0aGlzLnBvcyksdGhpcy5wb3MrPXJ9fSxlLnByb3RvdHlwZS5lbmNvZGVPYmplY3Q9ZnVuY3Rpb24oZSx0KXt2YXIgcj10aGlzLmV4dGVuc2lvbkNvZGVjLnRyeVRvRW5jb2RlKGUpO2lmKG51bGwhPXIpdGhpcy5lbmNvZGVFeHRlbnNpb24ocik7ZWxzZSBpZihBcnJheS5pc0FycmF5KGUpKXRoaXMuZW5jb2RlQXJyYXkoZSx0KTtlbHNlIGlmKEFycmF5QnVmZmVyLmlzVmlldyhlKSl0aGlzLmVuY29kZUJpbmFyeShlKTtlbHNle2lmKFwib2JqZWN0XCIhPXR5cGVvZiBlKXRocm93IG5ldyBFcnJvcihcIlVucmVjb2duaXplZCBvYmplY3Q6IFwiK09iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkoZSkpO3RoaXMuZW5jb2RlTWFwKGUsdCl9fSxlLnByb3RvdHlwZS5lbmNvZGVCaW5hcnk9ZnVuY3Rpb24oZSl7dmFyIHQ9ZS5ieXRlTGVuZ3RoO2lmKHQ8MjU2KXRoaXMud3JpdGVVOCgxOTYpLHRoaXMud3JpdGVVOCh0KTtlbHNlIGlmKHQ8NjU1MzYpdGhpcy53cml0ZVU4KDE5NyksdGhpcy53cml0ZVUxNih0KTtlbHNle2lmKCEodDw0Mjk0OTY3Mjk2KSl0aHJvdyBuZXcgRXJyb3IoXCJUb28gbGFyZ2UgYmluYXJ5OiBcIit0KTt0aGlzLndyaXRlVTgoMTk4KSx0aGlzLndyaXRlVTMyKHQpfXZhciByPVMoZSk7dGhpcy53cml0ZVU4YShyKX0sZS5wcm90b3R5cGUuZW5jb2RlQXJyYXk9ZnVuY3Rpb24oZSx0KXt2YXIgcixuLGk9ZS5sZW5ndGg7aWYoaTwxNil0aGlzLndyaXRlVTgoMTQ0K2kpO2Vsc2UgaWYoaTw2NTUzNil0aGlzLndyaXRlVTgoMjIwKSx0aGlzLndyaXRlVTE2KGkpO2Vsc2V7aWYoIShpPDQyOTQ5NjcyOTYpKXRocm93IG5ldyBFcnJvcihcIlRvbyBsYXJnZSBhcnJheTogXCIraSk7dGhpcy53cml0ZVU4KDIyMSksdGhpcy53cml0ZVUzMihpKX10cnl7Zm9yKHZhciBvPUkoZSkscz1vLm5leHQoKTshcy5kb25lO3M9by5uZXh0KCkpe3ZhciBhPXMudmFsdWU7dGhpcy5lbmNvZGUoYSx0KzEpfX1jYXRjaChlKXtyPXtlcnJvcjplfX1maW5hbGx5e3RyeXtzJiYhcy5kb25lJiYobj1vLnJldHVybikmJm4uY2FsbChvKX1maW5hbGx5e2lmKHIpdGhyb3cgci5lcnJvcn19fSxlLnByb3RvdHlwZS5lbmNvZGVNYXA9ZnVuY3Rpb24oZSx0KXt2YXIgcj1PYmplY3Qua2V5cyhlKTt0aGlzLnNvcnRLZXlzJiZyLnNvcnQoKTt2YXIgbj1yLmxlbmd0aDtpZihuPDE2KXRoaXMud3JpdGVVOCgxMjgrbik7ZWxzZSBpZihuPDY1NTM2KXRoaXMud3JpdGVVOCgyMjIpLHRoaXMud3JpdGVVMTYobik7ZWxzZXtpZighKG48NDI5NDk2NzI5NikpdGhyb3cgbmV3IEVycm9yKFwiVG9vIGxhcmdlIG1hcCBvYmplY3Q6IFwiK24pO3RoaXMud3JpdGVVOCgyMjMpLHRoaXMud3JpdGVVMzIobil9Zm9yKHZhciBpPTA7aTxuO2krKyl7dmFyIG89cltpXTt0aGlzLmVuY29kZVN0cmluZyhvKSx0aGlzLmVuY29kZShlW29dLHQrMSl9fSxlLnByb3RvdHlwZS5lbmNvZGVFeHRlbnNpb249ZnVuY3Rpb24oZSl7dmFyIHQ9ZS5kYXRhLmxlbmd0aDtpZigxPT09dCl0aGlzLndyaXRlVTgoMjEyKTtlbHNlIGlmKDI9PT10KXRoaXMud3JpdGVVOCgyMTMpO2Vsc2UgaWYoND09PXQpdGhpcy53cml0ZVU4KDIxNCk7ZWxzZSBpZig4PT09dCl0aGlzLndyaXRlVTgoMjE1KTtlbHNlIGlmKDE2PT09dCl0aGlzLndyaXRlVTgoMjE2KTtlbHNlIGlmKHQ8MjU2KXRoaXMud3JpdGVVOCgxOTkpLHRoaXMud3JpdGVVOCh0KTtlbHNlIGlmKHQ8NjU1MzYpdGhpcy53cml0ZVU4KDIwMCksdGhpcy53cml0ZVUxNih0KTtlbHNle2lmKCEodDw0Mjk0OTY3Mjk2KSl0aHJvdyBuZXcgRXJyb3IoXCJUb28gbGFyZ2UgZXh0ZW5zaW9uIG9iamVjdDogXCIrdCk7dGhpcy53cml0ZVU4KDIwMSksdGhpcy53cml0ZVUzMih0KX10aGlzLndyaXRlSTgoZS50eXBlKSx0aGlzLndyaXRlVThhKGUuZGF0YSl9LGUucHJvdG90eXBlLndyaXRlVTg9ZnVuY3Rpb24oZSl7dGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZSgxKSx0aGlzLnZpZXcuc2V0VWludDgodGhpcy5wb3MsZSksdGhpcy5wb3MrK30sZS5wcm90b3R5cGUud3JpdGVVOGE9ZnVuY3Rpb24oZSl7dmFyIHQ9ZS5sZW5ndGg7dGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZSh0KSx0aGlzLmJ5dGVzLnNldChlLHRoaXMucG9zKSx0aGlzLnBvcys9dH0sZS5wcm90b3R5cGUud3JpdGVJOD1mdW5jdGlvbihlKXt0aGlzLmVuc3VyZUJ1ZmZlclNpemVUb1dyaXRlKDEpLHRoaXMudmlldy5zZXRJbnQ4KHRoaXMucG9zLGUpLHRoaXMucG9zKyt9LGUucHJvdG90eXBlLndyaXRlVTE2PWZ1bmN0aW9uKGUpe3RoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUoMiksdGhpcy52aWV3LnNldFVpbnQxNih0aGlzLnBvcyxlKSx0aGlzLnBvcys9Mn0sZS5wcm90b3R5cGUud3JpdGVJMTY9ZnVuY3Rpb24oZSl7dGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZSgyKSx0aGlzLnZpZXcuc2V0SW50MTYodGhpcy5wb3MsZSksdGhpcy5wb3MrPTJ9LGUucHJvdG90eXBlLndyaXRlVTMyPWZ1bmN0aW9uKGUpe3RoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUoNCksdGhpcy52aWV3LnNldFVpbnQzMih0aGlzLnBvcyxlKSx0aGlzLnBvcys9NH0sZS5wcm90b3R5cGUud3JpdGVJMzI9ZnVuY3Rpb24oZSl7dGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZSg0KSx0aGlzLnZpZXcuc2V0SW50MzIodGhpcy5wb3MsZSksdGhpcy5wb3MrPTR9LGUucHJvdG90eXBlLndyaXRlRjMyPWZ1bmN0aW9uKGUpe3RoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUoNCksdGhpcy52aWV3LnNldEZsb2F0MzIodGhpcy5wb3MsZSksdGhpcy5wb3MrPTR9LGUucHJvdG90eXBlLndyaXRlRjY0PWZ1bmN0aW9uKGUpe3RoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUoOCksdGhpcy52aWV3LnNldEZsb2F0NjQodGhpcy5wb3MsZSksdGhpcy5wb3MrPTh9LGUucHJvdG90eXBlLndyaXRlVTY0PWZ1bmN0aW9uKGUpe3RoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUoOCksZnVuY3Rpb24oZSx0LHIpe3ZhciBuPXIvNDI5NDk2NzI5NixpPXI7ZS5zZXRVaW50MzIodCxuKSxlLnNldFVpbnQzMih0KzQsaSl9KHRoaXMudmlldyx0aGlzLnBvcyxlKSx0aGlzLnBvcys9OH0sZS5wcm90b3R5cGUud3JpdGVJNjQ9ZnVuY3Rpb24oZSl7dGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZSg4KSxsKHRoaXMudmlldyx0aGlzLnBvcyxlKSx0aGlzLnBvcys9OH0sZX0oKSx6PXt9O2Z1bmN0aW9uIEMoZSx0KXt2b2lkIDA9PT10JiYodD16KTt2YXIgcj1uZXcgUCh0LmV4dGVuc2lvbkNvZGVjLHQubWF4RGVwdGgsdC5pbml0aWFsQnVmZmVyU2l6ZSx0LnNvcnRLZXlzLHQuZm9yY2VGbG9hdDMyKTtyZXR1cm4gci5lbmNvZGUoZSwxKSxyLmdldFVpbnQ4QXJyYXkoKX1mdW5jdGlvbiBEKGUpe3JldHVybihlPDA/XCItXCI6XCJcIikrXCIweFwiK01hdGguYWJzKGUpLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLFwiMFwiKX12YXIgXyxqPWZ1bmN0aW9uKGUsdCxyLG4pe3JldHVybiBuZXcocnx8KHI9UHJvbWlzZSkpKGZ1bmN0aW9uKGksbyl7ZnVuY3Rpb24gcyhlKXt0cnl7dShuLm5leHQoZSkpfWNhdGNoKGUpe28oZSl9fWZ1bmN0aW9uIGEoZSl7dHJ5e3Uobi50aHJvdyhlKSl9Y2F0Y2goZSl7byhlKX19ZnVuY3Rpb24gdShlKXtlLmRvbmU/aShlLnZhbHVlKTpuZXcgcihmdW5jdGlvbih0KXt0KGUudmFsdWUpfSkudGhlbihzLGEpfXUoKG49bi5hcHBseShlLHR8fFtdKSkubmV4dCgpKX0pfSxPPWZ1bmN0aW9uKGUsdCl7dmFyIHIsbixpLG8scz17bGFiZWw6MCxzZW50OmZ1bmN0aW9uKCl7aWYoMSZpWzBdKXRocm93IGlbMV07cmV0dXJuIGlbMV19LHRyeXM6W10sb3BzOltdfTtyZXR1cm4gbz17bmV4dDphKDApLHRocm93OmEoMSkscmV0dXJuOmEoMil9LFwiZnVuY3Rpb25cIj09dHlwZW9mIFN5bWJvbCYmKG9bU3ltYm9sLml0ZXJhdG9yXT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSksbztmdW5jdGlvbiBhKG8pe3JldHVybiBmdW5jdGlvbihhKXtyZXR1cm4gZnVuY3Rpb24obyl7aWYocil0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtmb3IoO3M7KXRyeXtpZihyPTEsbiYmKGk9MiZvWzBdP24ucmV0dXJuOm9bMF0/bi50aHJvd3x8KChpPW4ucmV0dXJuKSYmaS5jYWxsKG4pLDApOm4ubmV4dCkmJiEoaT1pLmNhbGwobixvWzFdKSkuZG9uZSlyZXR1cm4gaTtzd2l0Y2gobj0wLGkmJihvPVsyJm9bMF0saS52YWx1ZV0pLG9bMF0pe2Nhc2UgMDpjYXNlIDE6aT1vO2JyZWFrO2Nhc2UgNDpyZXR1cm4gcy5sYWJlbCsrLHt2YWx1ZTpvWzFdLGRvbmU6ITF9O2Nhc2UgNTpzLmxhYmVsKyssbj1vWzFdLG89WzBdO2NvbnRpbnVlO2Nhc2UgNzpvPXMub3BzLnBvcCgpLHMudHJ5cy5wb3AoKTtjb250aW51ZTtkZWZhdWx0OmlmKCEoaT0oaT1zLnRyeXMpLmxlbmd0aD4wJiZpW2kubGVuZ3RoLTFdKSYmKDY9PT1vWzBdfHwyPT09b1swXSkpe3M9MDtjb250aW51ZX1pZigzPT09b1swXSYmKCFpfHxvWzFdPmlbMF0mJm9bMV08aVszXSkpe3MubGFiZWw9b1sxXTticmVha31pZig2PT09b1swXSYmcy5sYWJlbDxpWzFdKXtzLmxhYmVsPWlbMV0saT1vO2JyZWFrfWlmKGkmJnMubGFiZWw8aVsyXSl7cy5sYWJlbD1pWzJdLHMub3BzLnB1c2gobyk7YnJlYWt9aVsyXSYmcy5vcHMucG9wKCkscy50cnlzLnBvcCgpO2NvbnRpbnVlfW89dC5jYWxsKGUscyl9Y2F0Y2goZSl7bz1bNixlXSxuPTB9ZmluYWxseXtyPWk9MH1pZig1Jm9bMF0pdGhyb3cgb1sxXTtyZXR1cm57dmFsdWU6b1swXT9vWzFdOnZvaWQgMCxkb25lOiEwfX0oW28sYV0pfX19LEY9ZnVuY3Rpb24oZSl7aWYoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKXRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7dmFyIHQscj1lW1N5bWJvbC5hc3luY0l0ZXJhdG9yXTtyZXR1cm4gcj9yLmNhbGwoZSk6KGU9XCJmdW5jdGlvblwiPT10eXBlb2YgX192YWx1ZXM/X192YWx1ZXMoZSk6ZVtTeW1ib2wuaXRlcmF0b3JdKCksdD17fSxuKFwibmV4dFwiKSxuKFwidGhyb3dcIiksbihcInJldHVyblwiKSx0W1N5bWJvbC5hc3luY0l0ZXJhdG9yXT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSx0KTtmdW5jdGlvbiBuKHIpe3Rbcl09ZVtyXSYmZnVuY3Rpb24odCl7cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKG4saSl7KGZ1bmN0aW9uKGUsdCxyLG4pe1Byb21pc2UucmVzb2x2ZShuKS50aGVuKGZ1bmN0aW9uKHQpe2Uoe3ZhbHVlOnQsZG9uZTpyfSl9LHQpfSkobixpLCh0PWVbcl0odCkpLmRvbmUsdC52YWx1ZSl9KX19fSxWPWZ1bmN0aW9uKGUpe3JldHVybiB0aGlzIGluc3RhbmNlb2YgVj8odGhpcy52PWUsdGhpcyk6bmV3IFYoZSl9LFI9ZnVuY3Rpb24oZSx0LHIpe2lmKCFTeW1ib2wuYXN5bmNJdGVyYXRvcil0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO3ZhciBuLGk9ci5hcHBseShlLHR8fFtdKSxvPVtdO3JldHVybiBuPXt9LHMoXCJuZXh0XCIpLHMoXCJ0aHJvd1wiKSxzKFwicmV0dXJuXCIpLG5bU3ltYm9sLmFzeW5jSXRlcmF0b3JdPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LG47ZnVuY3Rpb24gcyhlKXtpW2VdJiYobltlXT1mdW5jdGlvbih0KXtyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocixuKXtvLnB1c2goW2UsdCxyLG5dKT4xfHxhKGUsdCl9KX0pfWZ1bmN0aW9uIGEoZSx0KXt0cnl7KHI9aVtlXSh0KSkudmFsdWUgaW5zdGFuY2VvZiBWP1Byb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4odSxoKTpjKG9bMF1bMl0scil9Y2F0Y2goZSl7YyhvWzBdWzNdLGUpfXZhciByfWZ1bmN0aW9uIHUoZSl7YShcIm5leHRcIixlKX1mdW5jdGlvbiBoKGUpe2EoXCJ0aHJvd1wiLGUpfWZ1bmN0aW9uIGMoZSx0KXtlKHQpLG8uc2hpZnQoKSxvLmxlbmd0aCYmYShvWzBdWzBdLG9bMF1bMV0pfX07IWZ1bmN0aW9uKGUpe2VbZS5BUlJBWT0wXT1cIkFSUkFZXCIsZVtlLk1BUF9LRVk9MV09XCJNQVBfS0VZXCIsZVtlLk1BUF9WQUxVRT0yXT1cIk1BUF9WQUxVRVwifShffHwoXz17fSkpO3ZhciBXPS0xLE49bmV3IERhdGFWaWV3KG5ldyBBcnJheUJ1ZmZlcigwKSksWT1uZXcgVWludDhBcnJheShOLmJ1ZmZlciksSz1mdW5jdGlvbigpe3RyeXtOLmdldEludDgoMCl9Y2F0Y2goZSl7cmV0dXJuIGUuY29uc3RydWN0b3J9dGhyb3cgbmV3IEVycm9yKFwibmV2ZXIgcmVhY2hlZFwiKX0oKSxIPW5ldyBLKFwiSW5zdWZmaWNpZW50IGRhdGFcIiksRz00Mjk0OTY3Mjk1LFg9ZnVuY3Rpb24oKXtmdW5jdGlvbiBlKGUsdCxyLG4saSxvKXt2b2lkIDA9PT1lJiYoZT14LmRlZmF1bHRDb2RlYyksdm9pZCAwPT09dCYmKHQ9Ryksdm9pZCAwPT09ciYmKHI9Ryksdm9pZCAwPT09biYmKG49Ryksdm9pZCAwPT09aSYmKGk9Ryksdm9pZCAwPT09byYmKG89RyksdGhpcy5leHRlbnNpb25Db2RlYz1lLHRoaXMubWF4U3RyTGVuZ3RoPXQsdGhpcy5tYXhCaW5MZW5ndGg9cix0aGlzLm1heEFycmF5TGVuZ3RoPW4sdGhpcy5tYXhNYXBMZW5ndGg9aSx0aGlzLm1heEV4dExlbmd0aD1vLHRoaXMudG90YWxQb3M9MCx0aGlzLnBvcz0wLHRoaXMudmlldz1OLHRoaXMuYnl0ZXM9WSx0aGlzLmhlYWRCeXRlPVcsdGhpcy5zdGFjaz1bXX1yZXR1cm4gZS5wcm90b3R5cGUuc2V0QnVmZmVyPWZ1bmN0aW9uKGUpe3RoaXMuYnl0ZXM9UyhlKSx0aGlzLnZpZXc9ZnVuY3Rpb24oZSl7aWYoZSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKXJldHVybiBuZXcgRGF0YVZpZXcoZSk7dmFyIHQ9UyhlKTtyZXR1cm4gbmV3IERhdGFWaWV3KHQuYnVmZmVyLHQuYnl0ZU9mZnNldCx0LmJ5dGVMZW5ndGgpfSh0aGlzLmJ5dGVzKSx0aGlzLnBvcz0wfSxlLnByb3RvdHlwZS5hcHBlbmRCdWZmZXI9ZnVuY3Rpb24oZSl7aWYodGhpcy5oZWFkQnl0ZSE9PVd8fHRoaXMuaGFzUmVtYWluaW5nKCkpe3ZhciB0PXRoaXMuYnl0ZXMuc3ViYXJyYXkodGhpcy5wb3MpLHI9UyhlKSxuPW5ldyBVaW50OEFycmF5KHQubGVuZ3RoK3IubGVuZ3RoKTtuLnNldCh0KSxuLnNldChyLHQubGVuZ3RoKSx0aGlzLnNldEJ1ZmZlcihuKX1lbHNlIHRoaXMuc2V0QnVmZmVyKGUpfSxlLnByb3RvdHlwZS5oYXNSZW1haW5pbmc9ZnVuY3Rpb24oZSl7cmV0dXJuIHZvaWQgMD09PWUmJihlPTEpLHRoaXMudmlldy5ieXRlTGVuZ3RoLXRoaXMucG9zPj1lfSxlLnByb3RvdHlwZS5jcmVhdGVOb0V4dHJhQnl0ZXNFcnJvcj1mdW5jdGlvbihlKXt2YXIgdD10aGlzLnZpZXcscj10aGlzLnBvcztyZXR1cm4gbmV3IFJhbmdlRXJyb3IoXCJFeHRyYSBcIisodC5ieXRlTGVuZ3RoLXIpK1wiIGJ5dGUocykgZm91bmQgYXQgYnVmZmVyW1wiK2UrXCJdXCIpfSxlLnByb3RvdHlwZS5kZWNvZGVPbmVTeW5jPWZ1bmN0aW9uKCl7dmFyIGU9dGhpcy5kZWNvZGVTeW5jKCk7aWYodGhpcy5oYXNSZW1haW5pbmcoKSl0aHJvdyB0aGlzLmNyZWF0ZU5vRXh0cmFCeXRlc0Vycm9yKHRoaXMucG9zKTtyZXR1cm4gZX0sZS5wcm90b3R5cGUuZGVjb2RlT25lQXN5bmM9ZnVuY3Rpb24oZSl7dmFyIHQscixuLGk7cmV0dXJuIGoodGhpcyx2b2lkIDAsdm9pZCAwLGZ1bmN0aW9uKCl7dmFyIG8scyxhLHUsaCxjLGYsbDtyZXR1cm4gTyh0aGlzLGZ1bmN0aW9uKHApe3N3aXRjaChwLmxhYmVsKXtjYXNlIDA6bz0hMSxwLmxhYmVsPTE7Y2FzZSAxOnAudHJ5cy5wdXNoKFsxLDYsNywxMl0pLHQ9RihlKSxwLmxhYmVsPTI7Y2FzZSAyOnJldHVybls0LHQubmV4dCgpXTtjYXNlIDM6aWYoKHI9cC5zZW50KCkpLmRvbmUpcmV0dXJuWzMsNV07aWYoYT1yLnZhbHVlLG8pdGhyb3cgdGhpcy5jcmVhdGVOb0V4dHJhQnl0ZXNFcnJvcih0aGlzLnRvdGFsUG9zKTt0aGlzLmFwcGVuZEJ1ZmZlcihhKTt0cnl7cz10aGlzLmRlY29kZVN5bmMoKSxvPSEwfWNhdGNoKGUpe2lmKCEoZSBpbnN0YW5jZW9mIEspKXRocm93IGV9dGhpcy50b3RhbFBvcys9dGhpcy5wb3MscC5sYWJlbD00O2Nhc2UgNDpyZXR1cm5bMywyXTtjYXNlIDU6cmV0dXJuWzMsMTJdO2Nhc2UgNjpyZXR1cm4gdT1wLnNlbnQoKSxuPXtlcnJvcjp1fSxbMywxMl07Y2FzZSA3OnJldHVybiBwLnRyeXMucHVzaChbNywsMTAsMTFdKSxyJiYhci5kb25lJiYoaT10LnJldHVybik/WzQsaS5jYWxsKHQpXTpbMyw5XTtjYXNlIDg6cC5zZW50KCkscC5sYWJlbD05O2Nhc2UgOTpyZXR1cm5bMywxMV07Y2FzZSAxMDppZihuKXRocm93IG4uZXJyb3I7cmV0dXJuWzddO2Nhc2UgMTE6cmV0dXJuWzddO2Nhc2UgMTI6aWYobyl7aWYodGhpcy5oYXNSZW1haW5pbmcoKSl0aHJvdyB0aGlzLmNyZWF0ZU5vRXh0cmFCeXRlc0Vycm9yKHRoaXMudG90YWxQb3MpO3JldHVyblsyLHNdfXRocm93IGM9KGg9dGhpcykuaGVhZEJ5dGUsZj1oLnBvcyxsPWgudG90YWxQb3MsbmV3IFJhbmdlRXJyb3IoXCJJbnN1ZmZpY2llbnQgZGF0YSBpbiBwYXJjaW5nIFwiK0QoYykrXCIgYXQgXCIrbCtcIiAoXCIrZitcIiBpbiB0aGUgY3VycmVudCBidWZmZXIpXCIpfX0pfSl9LGUucHJvdG90eXBlLmRlY29kZVN0cmVhbT1mdW5jdGlvbihlKXtyZXR1cm4gUih0aGlzLGFyZ3VtZW50cyxmdW5jdGlvbigpe3ZhciB0LHIsbixpLG8scyxhLHU7cmV0dXJuIE8odGhpcyxmdW5jdGlvbihoKXtzd2l0Y2goaC5sYWJlbCl7Y2FzZSAwOmgudHJ5cy5wdXNoKFswLDExLDEyLDE3XSksdD1GKGUpLGgubGFiZWw9MTtjYXNlIDE6cmV0dXJuWzQsVih0Lm5leHQoKSldO2Nhc2UgMjppZigocj1oLnNlbnQoKSkuZG9uZSlyZXR1cm5bMywxMF07bj1yLnZhbHVlLHRoaXMuYXBwZW5kQnVmZmVyKG4pLGgubGFiZWw9MztjYXNlIDM6aC50cnlzLnB1c2goWzMsOCwsOV0pLGgubGFiZWw9NDtjYXNlIDQ6cmV0dXJuIGk9dGhpcy5kZWNvZGVTeW5jKCksWzQsVihpKV07Y2FzZSA1OnJldHVybls0LGguc2VudCgpXTtjYXNlIDY6cmV0dXJuIGguc2VudCgpLFszLDRdO2Nhc2UgNzpyZXR1cm5bMyw5XTtjYXNlIDg6aWYoISgobz1oLnNlbnQoKSlpbnN0YW5jZW9mIEspKXRocm93IG87cmV0dXJuWzMsOV07Y2FzZSA5OnJldHVyblszLDFdO2Nhc2UgMTA6cmV0dXJuWzMsMTddO2Nhc2UgMTE6cmV0dXJuIHM9aC5zZW50KCksYT17ZXJyb3I6c30sWzMsMTddO2Nhc2UgMTI6cmV0dXJuIGgudHJ5cy5wdXNoKFsxMiwsMTUsMTZdKSxyJiYhci5kb25lJiYodT10LnJldHVybik/WzQsVih1LmNhbGwodCkpXTpbMywxNF07Y2FzZSAxMzpoLnNlbnQoKSxoLmxhYmVsPTE0O2Nhc2UgMTQ6cmV0dXJuWzMsMTZdO2Nhc2UgMTU6aWYoYSl0aHJvdyBhLmVycm9yO3JldHVybls3XTtjYXNlIDE2OnJldHVybls3XTtjYXNlIDE3OnJldHVyblsyXX19KX0pfSxlLnByb3RvdHlwZS5kZWNvZGVBcnJheVN0cmVhbT1mdW5jdGlvbihlKXtyZXR1cm4gUih0aGlzLGFyZ3VtZW50cyxmdW5jdGlvbigpe3ZhciB0LHIsbixpLG8scyxhLHUsaCxjLGY7cmV0dXJuIE8odGhpcyxmdW5jdGlvbihsKXtzd2l0Y2gobC5sYWJlbCl7Y2FzZSAwOnQ9ITEscj0hMSxuPTAsbC5sYWJlbD0xO2Nhc2UgMTpsLnRyeXMucHVzaChbMSwxMywxNCwxOV0pLGk9RihlKSxsLmxhYmVsPTI7Y2FzZSAyOnJldHVybls0LFYoaS5uZXh0KCkpXTtjYXNlIDM6aWYoKG89bC5zZW50KCkpLmRvbmUpcmV0dXJuWzMsMTJdO2lmKHM9by52YWx1ZSxyKXRocm93IHRoaXMuY3JlYXRlTm9FeHRyYUJ5dGVzRXJyb3IodGhpcy50b3RhbFBvcyk7dGhpcy5hcHBlbmRCdWZmZXIocyksdHx8KG49dGhpcy5yZWFkQXJyYXlTaXplKCksdD0hMCx0aGlzLmNvbXBsZXRlKCkpLGwubGFiZWw9NDtjYXNlIDQ6bC50cnlzLnB1c2goWzQsOSwsMTBdKSxsLmxhYmVsPTU7Y2FzZSA1OnJldHVybiBhPXRoaXMuZGVjb2RlU3luYygpLFs0LFYoYSldO2Nhc2UgNjpyZXR1cm5bNCxsLnNlbnQoKV07Y2FzZSA3OnJldHVybiBsLnNlbnQoKSwwPT09LS1uPyhyPSEwLFszLDhdKTpbMyw1XTtjYXNlIDg6cmV0dXJuWzMsMTBdO2Nhc2UgOTppZighKCh1PWwuc2VudCgpKWluc3RhbmNlb2YgSykpdGhyb3cgdTtyZXR1cm5bMywxMF07Y2FzZSAxMDp0aGlzLnRvdGFsUG9zKz10aGlzLnBvcyxsLmxhYmVsPTExO2Nhc2UgMTE6cmV0dXJuWzMsMl07Y2FzZSAxMjpyZXR1cm5bMywxOV07Y2FzZSAxMzpyZXR1cm4gaD1sLnNlbnQoKSxjPXtlcnJvcjpofSxbMywxOV07Y2FzZSAxNDpyZXR1cm4gbC50cnlzLnB1c2goWzE0LCwxNywxOF0pLG8mJiFvLmRvbmUmJihmPWkucmV0dXJuKT9bNCxWKGYuY2FsbChpKSldOlszLDE2XTtjYXNlIDE1Omwuc2VudCgpLGwubGFiZWw9MTY7Y2FzZSAxNjpyZXR1cm5bMywxOF07Y2FzZSAxNzppZihjKXRocm93IGMuZXJyb3I7cmV0dXJuWzddO2Nhc2UgMTg6cmV0dXJuWzddO2Nhc2UgMTk6cmV0dXJuWzJdfX0pfSl9LGUucHJvdG90eXBlLmRlY29kZVN5bmM9ZnVuY3Rpb24oKXtlOmZvcig7Oyl7dmFyIGU9dGhpcy5yZWFkSGVhZEJ5dGUoKSx0PXZvaWQgMDtpZihlPj0yMjQpdD1lLTI1NjtlbHNlIGlmKGU8MTkyKWlmKGU8MTI4KXQ9ZTtlbHNlIGlmKGU8MTQ0KXtpZigwIT09KG49ZS0xMjgpKXt0aGlzLnB1c2hNYXBTdGF0ZShuKSx0aGlzLmNvbXBsZXRlKCk7Y29udGludWUgZX10PXt9fWVsc2UgaWYoZTwxNjApe2lmKDAhPT0obj1lLTE0NCkpe3RoaXMucHVzaEFycmF5U3RhdGUobiksdGhpcy5jb21wbGV0ZSgpO2NvbnRpbnVlIGV9dD1bXX1lbHNle3ZhciByPWUtMTYwO3Q9dGhpcy5kZWNvZGVVdGY4U3RyaW5nKHIsMCl9ZWxzZSBpZigxOTI9PT1lKXQ9bnVsbDtlbHNlIGlmKDE5ND09PWUpdD0hMTtlbHNlIGlmKDE5NT09PWUpdD0hMDtlbHNlIGlmKDIwMj09PWUpdD10aGlzLnJlYWRGMzIoKTtlbHNlIGlmKDIwMz09PWUpdD10aGlzLnJlYWRGNjQoKTtlbHNlIGlmKDIwND09PWUpdD10aGlzLnJlYWRVOCgpO2Vsc2UgaWYoMjA1PT09ZSl0PXRoaXMucmVhZFUxNigpO2Vsc2UgaWYoMjA2PT09ZSl0PXRoaXMucmVhZFUzMigpO2Vsc2UgaWYoMjA3PT09ZSl0PXRoaXMucmVhZFU2NCgpO2Vsc2UgaWYoMjA4PT09ZSl0PXRoaXMucmVhZEk4KCk7ZWxzZSBpZigyMDk9PT1lKXQ9dGhpcy5yZWFkSTE2KCk7ZWxzZSBpZigyMTA9PT1lKXQ9dGhpcy5yZWFkSTMyKCk7ZWxzZSBpZigyMTE9PT1lKXQ9dGhpcy5yZWFkSTY0KCk7ZWxzZSBpZigyMTc9PT1lKXtyPXRoaXMubG9va1U4KCk7dD10aGlzLmRlY29kZVV0ZjhTdHJpbmcociwxKX1lbHNlIGlmKDIxOD09PWUpe3I9dGhpcy5sb29rVTE2KCk7dD10aGlzLmRlY29kZVV0ZjhTdHJpbmcociwyKX1lbHNlIGlmKDIxOT09PWUpe3I9dGhpcy5sb29rVTMyKCk7dD10aGlzLmRlY29kZVV0ZjhTdHJpbmcociw0KX1lbHNlIGlmKDIyMD09PWUpe2lmKDAhPT0obj10aGlzLnJlYWRVMTYoKSkpe3RoaXMucHVzaEFycmF5U3RhdGUobiksdGhpcy5jb21wbGV0ZSgpO2NvbnRpbnVlIGV9dD1bXX1lbHNlIGlmKDIyMT09PWUpe2lmKDAhPT0obj10aGlzLnJlYWRVMzIoKSkpe3RoaXMucHVzaEFycmF5U3RhdGUobiksdGhpcy5jb21wbGV0ZSgpO2NvbnRpbnVlIGV9dD1bXX1lbHNlIGlmKDIyMj09PWUpe2lmKDAhPT0obj10aGlzLnJlYWRVMTYoKSkpe3RoaXMucHVzaE1hcFN0YXRlKG4pLHRoaXMuY29tcGxldGUoKTtjb250aW51ZSBlfXQ9e319ZWxzZSBpZigyMjM9PT1lKXtpZigwIT09KG49dGhpcy5yZWFkVTMyKCkpKXt0aGlzLnB1c2hNYXBTdGF0ZShuKSx0aGlzLmNvbXBsZXRlKCk7Y29udGludWUgZX10PXt9fWVsc2UgaWYoMTk2PT09ZSl7dmFyIG49dGhpcy5sb29rVTgoKTt0PXRoaXMuZGVjb2RlQmluYXJ5KG4sMSl9ZWxzZSBpZigxOTc9PT1lKXtuPXRoaXMubG9va1UxNigpO3Q9dGhpcy5kZWNvZGVCaW5hcnkobiwyKX1lbHNlIGlmKDE5OD09PWUpe249dGhpcy5sb29rVTMyKCk7dD10aGlzLmRlY29kZUJpbmFyeShuLDQpfWVsc2UgaWYoMjEyPT09ZSl0PXRoaXMuZGVjb2RlRXh0ZW5zaW9uKDEsMCk7ZWxzZSBpZigyMTM9PT1lKXQ9dGhpcy5kZWNvZGVFeHRlbnNpb24oMiwwKTtlbHNlIGlmKDIxND09PWUpdD10aGlzLmRlY29kZUV4dGVuc2lvbig0LDApO2Vsc2UgaWYoMjE1PT09ZSl0PXRoaXMuZGVjb2RlRXh0ZW5zaW9uKDgsMCk7ZWxzZSBpZigyMTY9PT1lKXQ9dGhpcy5kZWNvZGVFeHRlbnNpb24oMTYsMCk7ZWxzZSBpZigxOTk9PT1lKXtuPXRoaXMubG9va1U4KCk7dD10aGlzLmRlY29kZUV4dGVuc2lvbihuLDEpfWVsc2UgaWYoMjAwPT09ZSl7bj10aGlzLmxvb2tVMTYoKTt0PXRoaXMuZGVjb2RlRXh0ZW5zaW9uKG4sMil9ZWxzZXtpZigyMDEhPT1lKXRocm93IG5ldyBFcnJvcihcIlVucmVjb2duaXplZCB0eXBlIGJ5dGU6IFwiK0QoZSkpO249dGhpcy5sb29rVTMyKCk7dD10aGlzLmRlY29kZUV4dGVuc2lvbihuLDQpfXRoaXMuY29tcGxldGUoKTtmb3IodmFyIGk9dGhpcy5zdGFjaztpLmxlbmd0aD4wOyl7dmFyIG89aVtpLmxlbmd0aC0xXTtpZihvLnR5cGU9PT1fLkFSUkFZKXtpZihvLmFycmF5W28ucG9zaXRpb25dPXQsby5wb3NpdGlvbisrLG8ucG9zaXRpb24hPT1vLnNpemUpY29udGludWUgZTtpLnBvcCgpLHQ9by5hcnJheX1lbHNle2lmKG8udHlwZT09PV8uTUFQX0tFWSl7aWYoXCJzdHJpbmdcIiE9dHlwZW9mIHQpdGhyb3cgbmV3IEVycm9yKFwiVGhlIHR5cGUgb2Yga2V5IG11c3QgYmUgc3RyaW5nIGJ1dCBcIit0eXBlb2YgdCk7by5rZXk9dCxvLnR5cGU9Xy5NQVBfVkFMVUU7Y29udGludWUgZX1pZihvLnR5cGU9PT1fLk1BUF9WQUxVRSl7aWYoby5tYXBbby5rZXldPXQsby5yZWFkQ291bnQrKyxvLnJlYWRDb3VudCE9PW8uc2l6ZSl7by5rZXk9bnVsbCxvLnR5cGU9Xy5NQVBfS0VZO2NvbnRpbnVlIGV9aS5wb3AoKSx0PW8ubWFwfX19cmV0dXJuIHR9fSxlLnByb3RvdHlwZS5yZWFkSGVhZEJ5dGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5oZWFkQnl0ZT09PVcmJih0aGlzLmhlYWRCeXRlPXRoaXMucmVhZFU4KCkpLHRoaXMuaGVhZEJ5dGV9LGUucHJvdG90eXBlLmNvbXBsZXRlPWZ1bmN0aW9uKCl7dGhpcy5oZWFkQnl0ZT1XfSxlLnByb3RvdHlwZS5yZWFkQXJyYXlTaXplPWZ1bmN0aW9uKCl7dmFyIGU9dGhpcy5yZWFkSGVhZEJ5dGUoKTtzd2l0Y2goZSl7Y2FzZSAyMjA6cmV0dXJuIHRoaXMucmVhZFUxNigpO2Nhc2UgMjIxOnJldHVybiB0aGlzLnJlYWRVMzIoKTtkZWZhdWx0OmlmKGU8MTYwKXJldHVybiBlLTE0NDt0aHJvdyBuZXcgRXJyb3IoXCJVbnJlY29nbml6ZWQgYXJyYXkgdHlwZSBieXRlOiBcIitEKGUpKX19LGUucHJvdG90eXBlLnB1c2hNYXBTdGF0ZT1mdW5jdGlvbihlKXtpZihlPnRoaXMubWF4TWFwTGVuZ3RoKXRocm93IG5ldyBFcnJvcihcIk1heCBsZW5ndGggZXhjZWVkZWQ6IG1hcCBsZW5ndGggKFwiK2UrXCIpID4gbWF4TWFwTGVuZ3RoTGVuZ3RoIChcIit0aGlzLm1heE1hcExlbmd0aCtcIilcIik7dGhpcy5zdGFjay5wdXNoKHt0eXBlOl8uTUFQX0tFWSxzaXplOmUsa2V5Om51bGwscmVhZENvdW50OjAsbWFwOnt9fSl9LGUucHJvdG90eXBlLnB1c2hBcnJheVN0YXRlPWZ1bmN0aW9uKGUpe2lmKGU+dGhpcy5tYXhBcnJheUxlbmd0aCl0aHJvdyBuZXcgRXJyb3IoXCJNYXggbGVuZ3RoIGV4Y2VlZGVkOiBhcnJheSBsZW5ndGggKFwiK2UrXCIpID4gbWF4QXJyYXlMZW5ndGggKFwiK3RoaXMubWF4QXJyYXlMZW5ndGgrXCIpXCIpO3RoaXMuc3RhY2sucHVzaCh7dHlwZTpfLkFSUkFZLHNpemU6ZSxhcnJheTpuZXcgQXJyYXkoZSkscG9zaXRpb246MH0pfSxlLnByb3RvdHlwZS5kZWNvZGVVdGY4U3RyaW5nPWZ1bmN0aW9uKGUsdCl7aWYoZT50aGlzLm1heFN0ckxlbmd0aCl0aHJvdyBuZXcgRXJyb3IoXCJNYXggbGVuZ3RoIGV4Y2VlZGVkOiBVVEYtOCBieXRlIGxlbmd0aCAoXCIrZStcIikgPiBtYXhTdHJMZW5ndGggKFwiK3RoaXMubWF4U3RyTGVuZ3RoK1wiKVwiKTtpZih0aGlzLmJ5dGVzLmJ5dGVMZW5ndGg8dGhpcy5wb3MrdCtlKXRocm93IEg7dmFyIHIsbj10aGlzLnBvcyt0O3JldHVybiByPW8mJmU+MjAwP2Z1bmN0aW9uKGUsdCxyKXt2YXIgbj1lLnN1YmFycmF5KHQsdCtyKTtyZXR1cm4gYy5kZWNvZGUobil9KHRoaXMuYnl0ZXMsbixlKTpFJiZlPjEwMjQ/VCh0aGlzLmJ5dGVzLG4sZSk6ZnVuY3Rpb24oZSx0LHIpe2Zvcih2YXIgbj10LG89bityLHM9W10sYT1cIlwiO248bzspe3ZhciB1PWVbbisrXTtpZigwPT0oMTI4JnUpKXMucHVzaCh1KTtlbHNlIGlmKDE5Mj09KDIyNCZ1KSl7dmFyIGM9NjMmZVtuKytdO3MucHVzaCgoMzEmdSk8PDZ8Yyl9ZWxzZSBpZigyMjQ9PSgyNDAmdSkpe2M9NjMmZVtuKytdO3ZhciBmPTYzJmVbbisrXTtzLnB1c2goKDMxJnUpPDwxMnxjPDw2fGYpfWVsc2UgaWYoMjQwPT0oMjQ4JnUpKXt2YXIgbD0oNyZ1KTw8MTh8KGM9NjMmZVtuKytdKTw8MTJ8KGY9NjMmZVtuKytdKTw8Nnw2MyZlW24rK107bD42NTUzNSYmKGwtPTY1NTM2LHMucHVzaChsPj4+MTAmMTAyM3w1NTI5NiksbD01NjMyMHwxMDIzJmwpLHMucHVzaChsKX1lbHNlIHMucHVzaCh1KTtzLmxlbmd0aC00Pj1oJiYoYSs9U3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsaShzKSkscy5sZW5ndGg9MCl9cmV0dXJuIHMubGVuZ3RoPjAmJihhKz1TdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZyxpKHMpKSksYX0odGhpcy5ieXRlcyxuLGUpLHRoaXMucG9zKz10K2Uscn0sZS5wcm90b3R5cGUuZGVjb2RlQmluYXJ5PWZ1bmN0aW9uKGUsdCl7aWYoZT50aGlzLm1heEJpbkxlbmd0aCl0aHJvdyBuZXcgRXJyb3IoXCJNYXggbGVuZ3RoIGV4Y2VlZGVkOiBiaW4gbGVuZ3RoIChcIitlK1wiKSA+IG1heEJpbkxlbmd0aCAoXCIrdGhpcy5tYXhCaW5MZW5ndGgrXCIpXCIpO2lmKCF0aGlzLmhhc1JlbWFpbmluZyhlK3QpKXRocm93IEg7dmFyIHI9dGhpcy5wb3MrdCxuPXRoaXMuYnl0ZXMuc3ViYXJyYXkocixyK2UpO3JldHVybiB0aGlzLnBvcys9dCtlLG59LGUucHJvdG90eXBlLmRlY29kZUV4dGVuc2lvbj1mdW5jdGlvbihlLHQpe2lmKGU+dGhpcy5tYXhFeHRMZW5ndGgpdGhyb3cgbmV3IEVycm9yKFwiTWF4IGxlbmd0aCBleGNlZWRlZDogZXh0IGxlbmd0aCAoXCIrZStcIikgPiBtYXhFeHRMZW5ndGggKFwiK3RoaXMubWF4RXh0TGVuZ3RoK1wiKVwiKTt2YXIgcj10aGlzLnZpZXcuZ2V0SW50OCh0aGlzLnBvcyt0KSxuPXRoaXMuZGVjb2RlQmluYXJ5KGUsdCsxKTtyZXR1cm4gdGhpcy5leHRlbnNpb25Db2RlYy5kZWNvZGUobixyKX0sZS5wcm90b3R5cGUubG9va1U4PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudmlldy5nZXRVaW50OCh0aGlzLnBvcyl9LGUucHJvdG90eXBlLmxvb2tVMTY9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy52aWV3LmdldFVpbnQxNih0aGlzLnBvcyl9LGUucHJvdG90eXBlLmxvb2tVMzI9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy52aWV3LmdldFVpbnQzMih0aGlzLnBvcyl9LGUucHJvdG90eXBlLnJlYWRVOD1mdW5jdGlvbigpe3ZhciBlPXRoaXMudmlldy5nZXRVaW50OCh0aGlzLnBvcyk7cmV0dXJuIHRoaXMucG9zKyssZX0sZS5wcm90b3R5cGUucmVhZEk4PWZ1bmN0aW9uKCl7dmFyIGU9dGhpcy52aWV3LmdldEludDgodGhpcy5wb3MpO3JldHVybiB0aGlzLnBvcysrLGV9LGUucHJvdG90eXBlLnJlYWRVMTY9ZnVuY3Rpb24oKXt2YXIgZT10aGlzLnZpZXcuZ2V0VWludDE2KHRoaXMucG9zKTtyZXR1cm4gdGhpcy5wb3MrPTIsZX0sZS5wcm90b3R5cGUucmVhZEkxNj1mdW5jdGlvbigpe3ZhciBlPXRoaXMudmlldy5nZXRJbnQxNih0aGlzLnBvcyk7cmV0dXJuIHRoaXMucG9zKz0yLGV9LGUucHJvdG90eXBlLnJlYWRVMzI9ZnVuY3Rpb24oKXt2YXIgZT10aGlzLnZpZXcuZ2V0VWludDMyKHRoaXMucG9zKTtyZXR1cm4gdGhpcy5wb3MrPTQsZX0sZS5wcm90b3R5cGUucmVhZEkzMj1mdW5jdGlvbigpe3ZhciBlPXRoaXMudmlldy5nZXRJbnQzMih0aGlzLnBvcyk7cmV0dXJuIHRoaXMucG9zKz00LGV9LGUucHJvdG90eXBlLnJlYWRVNjQ9ZnVuY3Rpb24oKXt2YXIgZSx0LHI9KGU9dGhpcy52aWV3LHQ9dGhpcy5wb3MsNDI5NDk2NzI5NiplLmdldFVpbnQzMih0KStlLmdldFVpbnQzMih0KzQpKTtyZXR1cm4gdGhpcy5wb3MrPTgscn0sZS5wcm90b3R5cGUucmVhZEk2ND1mdW5jdGlvbigpe3ZhciBlPXAodGhpcy52aWV3LHRoaXMucG9zKTtyZXR1cm4gdGhpcy5wb3MrPTgsZX0sZS5wcm90b3R5cGUucmVhZEYzMj1mdW5jdGlvbigpe3ZhciBlPXRoaXMudmlldy5nZXRGbG9hdDMyKHRoaXMucG9zKTtyZXR1cm4gdGhpcy5wb3MrPTQsZX0sZS5wcm90b3R5cGUucmVhZEY2ND1mdW5jdGlvbigpe3ZhciBlPXRoaXMudmlldy5nZXRGbG9hdDY0KHRoaXMucG9zKTtyZXR1cm4gdGhpcy5wb3MrPTgsZX0sZX0oKSxxPXt9O2Z1bmN0aW9uIEooZSx0KXt2b2lkIDA9PT10JiYodD1xKTt2YXIgcj1uZXcgWCh0LmV4dGVuc2lvbkNvZGVjLHQubWF4U3RyTGVuZ3RoLHQubWF4QmluTGVuZ3RoLHQubWF4QXJyYXlMZW5ndGgsdC5tYXhNYXBMZW5ndGgsdC5tYXhFeHRMZW5ndGgpO3JldHVybiByLnNldEJ1ZmZlcihlKSxyLmRlY29kZU9uZVN5bmMoKX12YXIgUT1mdW5jdGlvbihlLHQpe3ZhciByLG4saSxvLHM9e2xhYmVsOjAsc2VudDpmdW5jdGlvbigpe2lmKDEmaVswXSl0aHJvdyBpWzFdO3JldHVybiBpWzFdfSx0cnlzOltdLG9wczpbXX07cmV0dXJuIG89e25leHQ6YSgwKSx0aHJvdzphKDEpLHJldHVybjphKDIpfSxcImZ1bmN0aW9uXCI9PXR5cGVvZiBTeW1ib2wmJihvW1N5bWJvbC5pdGVyYXRvcl09ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30pLG87ZnVuY3Rpb24gYShvKXtyZXR1cm4gZnVuY3Rpb24oYSl7cmV0dXJuIGZ1bmN0aW9uKG8pe2lmKHIpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7Zm9yKDtzOyl0cnl7aWYocj0xLG4mJihpPTImb1swXT9uLnJldHVybjpvWzBdP24udGhyb3d8fCgoaT1uLnJldHVybikmJmkuY2FsbChuKSwwKTpuLm5leHQpJiYhKGk9aS5jYWxsKG4sb1sxXSkpLmRvbmUpcmV0dXJuIGk7c3dpdGNoKG49MCxpJiYobz1bMiZvWzBdLGkudmFsdWVdKSxvWzBdKXtjYXNlIDA6Y2FzZSAxOmk9bzticmVhaztjYXNlIDQ6cmV0dXJuIHMubGFiZWwrKyx7dmFsdWU6b1sxXSxkb25lOiExfTtjYXNlIDU6cy5sYWJlbCsrLG49b1sxXSxvPVswXTtjb250aW51ZTtjYXNlIDc6bz1zLm9wcy5wb3AoKSxzLnRyeXMucG9wKCk7Y29udGludWU7ZGVmYXVsdDppZighKGk9KGk9cy50cnlzKS5sZW5ndGg+MCYmaVtpLmxlbmd0aC0xXSkmJig2PT09b1swXXx8Mj09PW9bMF0pKXtzPTA7Y29udGludWV9aWYoMz09PW9bMF0mJighaXx8b1sxXT5pWzBdJiZvWzFdPGlbM10pKXtzLmxhYmVsPW9bMV07YnJlYWt9aWYoNj09PW9bMF0mJnMubGFiZWw8aVsxXSl7cy5sYWJlbD1pWzFdLGk9bzticmVha31pZihpJiZzLmxhYmVsPGlbMl0pe3MubGFiZWw9aVsyXSxzLm9wcy5wdXNoKG8pO2JyZWFrfWlbMl0mJnMub3BzLnBvcCgpLHMudHJ5cy5wb3AoKTtjb250aW51ZX1vPXQuY2FsbChlLHMpfWNhdGNoKGUpe289WzYsZV0sbj0wfWZpbmFsbHl7cj1pPTB9aWYoNSZvWzBdKXRocm93IG9bMV07cmV0dXJue3ZhbHVlOm9bMF0/b1sxXTp2b2lkIDAsZG9uZTohMH19KFtvLGFdKX19fSxaPWZ1bmN0aW9uKGUpe3JldHVybiB0aGlzIGluc3RhbmNlb2YgWj8odGhpcy52PWUsdGhpcyk6bmV3IFooZSl9LCQ9ZnVuY3Rpb24oZSx0LHIpe2lmKCFTeW1ib2wuYXN5bmNJdGVyYXRvcil0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO3ZhciBuLGk9ci5hcHBseShlLHR8fFtdKSxvPVtdO3JldHVybiBuPXt9LHMoXCJuZXh0XCIpLHMoXCJ0aHJvd1wiKSxzKFwicmV0dXJuXCIpLG5bU3ltYm9sLmFzeW5jSXRlcmF0b3JdPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LG47ZnVuY3Rpb24gcyhlKXtpW2VdJiYobltlXT1mdW5jdGlvbih0KXtyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocixuKXtvLnB1c2goW2UsdCxyLG5dKT4xfHxhKGUsdCl9KX0pfWZ1bmN0aW9uIGEoZSx0KXt0cnl7KHI9aVtlXSh0KSkudmFsdWUgaW5zdGFuY2VvZiBaP1Byb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4odSxoKTpjKG9bMF1bMl0scil9Y2F0Y2goZSl7YyhvWzBdWzNdLGUpfXZhciByfWZ1bmN0aW9uIHUoZSl7YShcIm5leHRcIixlKX1mdW5jdGlvbiBoKGUpe2EoXCJ0aHJvd1wiLGUpfWZ1bmN0aW9uIGMoZSx0KXtlKHQpLG8uc2hpZnQoKSxvLmxlbmd0aCYmYShvWzBdWzBdLG9bMF1bMV0pfX07ZnVuY3Rpb24gZWUoZSl7cmV0dXJuIG51bGwhPWVbU3ltYm9sLmFzeW5jSXRlcmF0b3JdP2U6ZnVuY3Rpb24oZSl7cmV0dXJuICQodGhpcyxhcmd1bWVudHMsZnVuY3Rpb24oKXt2YXIgdCxyLG4saTtyZXR1cm4gUSh0aGlzLGZ1bmN0aW9uKG8pe3N3aXRjaChvLmxhYmVsKXtjYXNlIDA6dD1lLmdldFJlYWRlcigpLG8ubGFiZWw9MTtjYXNlIDE6by50cnlzLnB1c2goWzEsLDksMTBdKSxvLmxhYmVsPTI7Y2FzZSAyOnJldHVybls0LFoodC5yZWFkKCkpXTtjYXNlIDM6cmV0dXJuIHI9by5zZW50KCksbj1yLmRvbmUsaT1yLnZhbHVlLG4/WzQsWih2b2lkIDApXTpbMyw1XTtjYXNlIDQ6cmV0dXJuWzIsby5zZW50KCldO2Nhc2UgNTpyZXR1cm5bNCxaKGkpXTtjYXNlIDY6cmV0dXJuWzQsby5zZW50KCldO2Nhc2UgNzpyZXR1cm4gby5zZW50KCksWzMsMl07Y2FzZSA4OnJldHVyblszLDEwXTtjYXNlIDk6cmV0dXJuIHQucmVsZWFzZUxvY2soKSxbN107Y2FzZSAxMDpyZXR1cm5bMl19fSl9KX0oZSl9dmFyIHRlPWZ1bmN0aW9uKGUsdCxyLG4pe3JldHVybiBuZXcocnx8KHI9UHJvbWlzZSkpKGZ1bmN0aW9uKGksbyl7ZnVuY3Rpb24gcyhlKXt0cnl7dShuLm5leHQoZSkpfWNhdGNoKGUpe28oZSl9fWZ1bmN0aW9uIGEoZSl7dHJ5e3Uobi50aHJvdyhlKSl9Y2F0Y2goZSl7byhlKX19ZnVuY3Rpb24gdShlKXtlLmRvbmU/aShlLnZhbHVlKTpuZXcgcihmdW5jdGlvbih0KXt0KGUudmFsdWUpfSkudGhlbihzLGEpfXUoKG49bi5hcHBseShlLHR8fFtdKSkubmV4dCgpKX0pfSxyZT1mdW5jdGlvbihlLHQpe3ZhciByLG4saSxvLHM9e2xhYmVsOjAsc2VudDpmdW5jdGlvbigpe2lmKDEmaVswXSl0aHJvdyBpWzFdO3JldHVybiBpWzFdfSx0cnlzOltdLG9wczpbXX07cmV0dXJuIG89e25leHQ6YSgwKSx0aHJvdzphKDEpLHJldHVybjphKDIpfSxcImZ1bmN0aW9uXCI9PXR5cGVvZiBTeW1ib2wmJihvW1N5bWJvbC5pdGVyYXRvcl09ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30pLG87ZnVuY3Rpb24gYShvKXtyZXR1cm4gZnVuY3Rpb24oYSl7cmV0dXJuIGZ1bmN0aW9uKG8pe2lmKHIpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7Zm9yKDtzOyl0cnl7aWYocj0xLG4mJihpPTImb1swXT9uLnJldHVybjpvWzBdP24udGhyb3d8fCgoaT1uLnJldHVybikmJmkuY2FsbChuKSwwKTpuLm5leHQpJiYhKGk9aS5jYWxsKG4sb1sxXSkpLmRvbmUpcmV0dXJuIGk7c3dpdGNoKG49MCxpJiYobz1bMiZvWzBdLGkudmFsdWVdKSxvWzBdKXtjYXNlIDA6Y2FzZSAxOmk9bzticmVhaztjYXNlIDQ6cmV0dXJuIHMubGFiZWwrKyx7dmFsdWU6b1sxXSxkb25lOiExfTtjYXNlIDU6cy5sYWJlbCsrLG49b1sxXSxvPVswXTtjb250aW51ZTtjYXNlIDc6bz1zLm9wcy5wb3AoKSxzLnRyeXMucG9wKCk7Y29udGludWU7ZGVmYXVsdDppZighKGk9KGk9cy50cnlzKS5sZW5ndGg+MCYmaVtpLmxlbmd0aC0xXSkmJig2PT09b1swXXx8Mj09PW9bMF0pKXtzPTA7Y29udGludWV9aWYoMz09PW9bMF0mJighaXx8b1sxXT5pWzBdJiZvWzFdPGlbM10pKXtzLmxhYmVsPW9bMV07YnJlYWt9aWYoNj09PW9bMF0mJnMubGFiZWw8aVsxXSl7cy5sYWJlbD1pWzFdLGk9bzticmVha31pZihpJiZzLmxhYmVsPGlbMl0pe3MubGFiZWw9aVsyXSxzLm9wcy5wdXNoKG8pO2JyZWFrfWlbMl0mJnMub3BzLnBvcCgpLHMudHJ5cy5wb3AoKTtjb250aW51ZX1vPXQuY2FsbChlLHMpfWNhdGNoKGUpe289WzYsZV0sbj0wfWZpbmFsbHl7cj1pPTB9aWYoNSZvWzBdKXRocm93IG9bMV07cmV0dXJue3ZhbHVlOm9bMF0/b1sxXTp2b2lkIDAsZG9uZTohMH19KFtvLGFdKX19fTtmdW5jdGlvbiBuZShlLHQpe3JldHVybiB2b2lkIDA9PT10JiYodD1xKSx0ZSh0aGlzLHZvaWQgMCx2b2lkIDAsZnVuY3Rpb24oKXt2YXIgcjtyZXR1cm4gcmUodGhpcyxmdW5jdGlvbihuKXtyZXR1cm4gcj1lZShlKSxbMixuZXcgWCh0LmV4dGVuc2lvbkNvZGVjLHQubWF4U3RyTGVuZ3RoLHQubWF4QmluTGVuZ3RoLHQubWF4QXJyYXlMZW5ndGgsdC5tYXhNYXBMZW5ndGgsdC5tYXhFeHRMZW5ndGgpLmRlY29kZU9uZUFzeW5jKHIpXX0pfSl9ZnVuY3Rpb24gaWUoZSx0KXt2b2lkIDA9PT10JiYodD1xKTt2YXIgcj1lZShlKTtyZXR1cm4gbmV3IFgodC5leHRlbnNpb25Db2RlYyx0Lm1heFN0ckxlbmd0aCx0Lm1heEJpbkxlbmd0aCx0Lm1heEFycmF5TGVuZ3RoLHQubWF4TWFwTGVuZ3RoLHQubWF4RXh0TGVuZ3RoKS5kZWNvZGVBcnJheVN0cmVhbShyKX1mdW5jdGlvbiBvZShlLHQpe3ZvaWQgMD09PXQmJih0PXEpO3ZhciByPWVlKGUpO3JldHVybiBuZXcgWCh0LmV4dGVuc2lvbkNvZGVjLHQubWF4U3RyTGVuZ3RoLHQubWF4QmluTGVuZ3RoLHQubWF4QXJyYXlMZW5ndGgsdC5tYXhNYXBMZW5ndGgsdC5tYXhFeHRMZW5ndGgpLmRlY29kZVN0cmVhbShyKX1yLmQodCxcImVuY29kZVwiLGZ1bmN0aW9uKCl7cmV0dXJuIEN9KSxyLmQodCxcImRlY29kZVwiLGZ1bmN0aW9uKCl7cmV0dXJuIEp9KSxyLmQodCxcImRlY29kZUFzeW5jXCIsZnVuY3Rpb24oKXtyZXR1cm4gbmV9KSxyLmQodCxcImRlY29kZUFycmF5U3RyZWFtXCIsZnVuY3Rpb24oKXtyZXR1cm4gaWV9KSxyLmQodCxcImRlY29kZVN0cmVhbVwiLGZ1bmN0aW9uKCl7cmV0dXJuIG9lfSksci5kKHQsXCJEZWNvZGVyXCIsZnVuY3Rpb24oKXtyZXR1cm4gWH0pLHIuZCh0LFwiRW5jb2RlclwiLGZ1bmN0aW9uKCl7cmV0dXJuIFB9KSxyLmQodCxcIkV4dGVuc2lvbkNvZGVjXCIsZnVuY3Rpb24oKXtyZXR1cm4geH0pLHIuZCh0LFwiRXh0RGF0YVwiLGZ1bmN0aW9uKCl7cmV0dXJuIGZ9KSxyLmQodCxcIkVYVF9USU1FU1RBTVBcIixmdW5jdGlvbigpe3JldHVybi0xfSksci5kKHQsXCJlbmNvZGVEYXRlVG9UaW1lU3BlY1wiLGZ1bmN0aW9uKCl7cmV0dXJuIHZ9KSxyLmQodCxcImVuY29kZVRpbWVTcGVjVG9UaW1lc3RhbXBcIixmdW5jdGlvbigpe3JldHVybiB3fSksci5kKHQsXCJkZWNvZGVUaW1lc3RhbXBUb1RpbWVTcGVjXCIsZnVuY3Rpb24oKXtyZXR1cm4gZ30pLHIuZCh0LFwiZW5jb2RlVGltZXN0YW1wRXh0ZW5zaW9uXCIsZnVuY3Rpb24oKXtyZXR1cm4gYn0pLHIuZCh0LFwiZGVjb2RlVGltZXN0YW1wRXh0ZW5zaW9uXCIsZnVuY3Rpb24oKXtyZXR1cm4gVX0pLHIuZCh0LFwiX19XQVNNX0FWQUlMQUJMRVwiLGZ1bmN0aW9uKCl7cmV0dXJuIEV9KX1dKX0pO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bXNncGFjay5taW4uanMubWFwIiwiXG4vL3ZhciBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGluZ0ltcGxlbWVudGF0aW9uKGVyciwgcmVzKXtcblx0Ly9jb25zb2xlLmxvZyhlcnIuc3RhY2spO1xuXHRpZihlcnIpIHRocm93IGVycjtcblx0cmV0dXJuIHJlcztcbn1cblxucmVxdWlyZShcIi4vbGliL292ZXJ3cml0ZVJlcXVpcmVcIik7XG4vKlxuY29uc3QgUFNLQnVmZmVyID0gcmVxdWlyZSgncHNrYnVmZmVyJyk7XG4kJC5QU0tCdWZmZXIgPSBQU0tCdWZmZXI7ICovXG5cblxuJCQub2Jzb2xldGUoXCJQbGVhc2UgcmVtb3ZlICQkLmVycm9ySGFuZGxlciAgYXNhcFwiKTtcbiQkLmVycm9ySGFuZGxlciA9IHtcbiAgICAgICAgZXJyb3I6ZnVuY3Rpb24oZXJyLCBhcmdzLCBtc2cpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLCBcIlVua25vd24gZXJyb3IgZnJvbSBmdW5jdGlvbiBjYWxsIHdpdGggYXJndW1lbnRzOlwiLCBhcmdzLCBcIk1lc3NhZ2U6XCIsIG1zZyk7XG4gICAgICAgIH0sXG4gICAgICAgIHRocm93RXJyb3I6ZnVuY3Rpb24oZXJyLCBhcmdzLCBtc2cpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyLCBcIlVua25vd24gZXJyb3IgZnJvbSBmdW5jdGlvbiBjYWxsIHdpdGggYXJndW1lbnRzOlwiLCBhcmdzLCBcIk1lc3NhZ2U6XCIsIG1zZyk7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH0sXG4gICAgICAgIGlnbm9yZVBvc3NpYmxlRXJyb3I6IGZ1bmN0aW9uKG5hbWUpe1xuICAgICAgICAgICAgY29uc29sZS5sb2cobmFtZSk7XG4gICAgICAgIH0sXG4gICAgICAgIHN5bnRheEVycm9yOmZ1bmN0aW9uKHByb3BlcnR5LCBzd2FybSwgdGV4dCl7XG4gICAgICAgICAgICAvL3Rocm93IG5ldyBFcnJvcihcIk1pc3NwZWxsZWQgbWVtYmVyIG5hbWUgb3Igb3RoZXIgaW50ZXJuYWwgZXJyb3IhXCIpO1xuICAgICAgICAgICAgdmFyIHN3YXJtTmFtZTtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygc3dhcm0gPT0gXCJzdHJpbmdcIil7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtTmFtZSA9IHN3YXJtO1xuICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgIGlmKHN3YXJtICYmIHN3YXJtLm1ldGEpe1xuICAgICAgICAgICAgICAgICAgICBzd2FybU5hbWUgID0gc3dhcm0ubWV0YS5zd2FybVR5cGVOYW1lO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN3YXJtTmFtZSA9IHN3YXJtLmdldElubmVyVmFsdWUoKS5tZXRhLnN3YXJtVHlwZU5hbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaChlcnIpe1xuICAgICAgICAgICAgICAgIHN3YXJtTmFtZSA9IGVyci50b1N0cmluZygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYocHJvcGVydHkpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiV3JvbmcgbWVtYmVyIG5hbWUgXCIsIHByb3BlcnR5LCAgXCIgaW4gc3dhcm0gXCIsIHN3YXJtTmFtZSk7XG4gICAgICAgICAgICAgICAgaWYodGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5rbm93biBzd2FybVwiLCBzd2FybU5hbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0sXG4gICAgICAgIHdhcm5pbmc6ZnVuY3Rpb24obXNnKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1zZyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiQkLm9ic29sZXRlKFwiUGxlYXNlIHJlbW92ZSAkJC5zYWZlRXJyb3JIYW5kbGluZyBhc2FwXCIpO1xuJCQuc2FmZUVycm9ySGFuZGxpbmcgPSBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgICAgIGlmKGNhbGxiYWNrKXtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaztcbiAgICAgICAgfSBlbHNle1xuICAgICAgICAgICAgcmV0dXJuIGRlZmF1bHRFcnJvckhhbmRsaW5nSW1wbGVtZW50YXRpb247XG4gICAgICAgIH1cbiAgICB9O1xuXG5cblxuJCQub2Jzb2xldGUoXCJQbGVhc2UgcmVtb3ZlICQkLl9faW50ZXJuIGFzYXBcIik7XG4kJC5fX2ludGVybiA9IHtcbiAgICAgICAgbWtBcmdzOmZ1bmN0aW9uKGFyZ3MscG9zKXtcbiAgICAgICAgICAgIHZhciBhcmdzQXJyYXkgPSBbXTtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IHBvczsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgICAgIGFyZ3NBcnJheS5wdXNoKGFyZ3NbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFyZ3NBcnJheTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuXG52YXIgc3dhcm1VdGlscyA9IHJlcXVpcmUoXCIuL2xpYi9jaG9yZW9ncmFwaGllcy91dGlsaXR5RnVuY3Rpb25zL3N3YXJtXCIpO1xudmFyIGFzc2V0VXRpbHMgPSByZXF1aXJlKFwiLi9saWIvY2hvcmVvZ3JhcGhpZXMvdXRpbGl0eUZ1bmN0aW9ucy9hc3NldFwiKTtcbiQkLmRlZmF1bHRFcnJvckhhbmRsaW5nSW1wbGVtZW50YXRpb24gPSBkZWZhdWx0RXJyb3JIYW5kbGluZ0ltcGxlbWVudGF0aW9uO1xuXG52YXIgY2FsbGZsb3dNb2R1bGUgPSByZXF1aXJlKFwiLi9saWIvc3dhcm1EZXNjcmlwdGlvblwiKTtcbiQkLmNhbGxmbG93cyAgICAgICAgPSBjYWxsZmxvd01vZHVsZS5jcmVhdGVTd2FybUVuZ2luZShcImNhbGxmbG93XCIpO1xuJCQuY2FsbGZsb3cgICAgICAgICA9ICQkLmNhbGxmbG93cztcbiQkLmZsb3cgICAgICAgICAgICAgPSAkJC5jYWxsZmxvd3M7XG4kJC5mbG93cyAgICAgICAgICAgID0gJCQuY2FsbGZsb3dzO1xuXG4kJC5zd2FybXMgICAgICAgICAgID0gY2FsbGZsb3dNb2R1bGUuY3JlYXRlU3dhcm1FbmdpbmUoXCJzd2FybVwiLCBzd2FybVV0aWxzKTtcbiQkLnN3YXJtICAgICAgICAgICAgPSAkJC5zd2FybXM7XG4kJC5jb250cmFjdHMgICAgICAgID0gY2FsbGZsb3dNb2R1bGUuY3JlYXRlU3dhcm1FbmdpbmUoXCJjb250cmFjdFwiLCBzd2FybVV0aWxzKTtcbiQkLmNvbnRyYWN0ICAgICAgICAgPSAkJC5jb250cmFjdHM7XG4kJC5hc3NldHMgICAgICAgICAgID0gY2FsbGZsb3dNb2R1bGUuY3JlYXRlU3dhcm1FbmdpbmUoXCJhc3NldFwiLCBhc3NldFV0aWxzKTtcbiQkLmFzc2V0ICAgICAgICAgICAgPSAkJC5hc3NldHM7XG4kJC50cmFuc2FjdGlvbnMgICAgID0gY2FsbGZsb3dNb2R1bGUuY3JlYXRlU3dhcm1FbmdpbmUoXCJ0cmFuc2FjdGlvblwiLCBzd2FybVV0aWxzKTtcbiQkLnRyYW5zYWN0aW9uICAgICAgPSAkJC50cmFuc2FjdGlvbnM7XG5cblxuJCQuUFNLX1B1YlN1YiA9IHJlcXVpcmUoXCJzb3VuZHB1YnN1YlwiKS5zb3VuZFB1YlN1YjtcblxuJCQuc2VjdXJpdHlDb250ZXh0ID0gXCJzeXN0ZW1cIjtcbiQkLmxpYnJhcnlQcmVmaXggPSBcImdsb2JhbFwiO1xuJCQubGlicmFyaWVzID0ge1xuICAgIGdsb2JhbDp7XG5cbiAgICB9XG59O1xuXG4kJC5pbnRlcmNlcHRvciA9IHJlcXVpcmUoXCIuL2xpYi9JbnRlcmNlcHRvclJlZ2lzdHJ5XCIpLmNyZWF0ZUludGVyY2VwdG9yUmVnaXN0cnkoKTtcblxuJCQubG9hZExpYnJhcnkgPSByZXF1aXJlKFwiLi9saWIvbG9hZExpYnJhcnlcIikubG9hZExpYnJhcnk7XG5cbnJlcXVpcmVMaWJyYXJ5ID0gZnVuY3Rpb24obmFtZSl7XG4gICAgLy92YXIgYWJzb2x1dGVQYXRoID0gcGF0aC5yZXNvbHZlKCAgJCQuX19nbG9iYWwuX19sb2FkTGlicmFyeVJvb3QgKyBuYW1lKTtcbiAgICByZXR1cm4gJCQubG9hZExpYnJhcnkobmFtZSxuYW1lKTtcbn07XG5cbnJlcXVpcmUoXCIuL2NvbnN0YW50c1wiKTtcblxuLyovL1RPRE86IFNIT1VMRCBiZSBtb3ZlZCBpbiAkJC5fX2dsb2JhbHNcbiQkLmVuc3VyZUZvbGRlckV4aXN0cyA9IGZ1bmN0aW9uIChmb2xkZXIsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZmxvdyA9ICQkLmZsb3cuc3RhcnQoXCJ1dGlscy5ta0RpclJlY1wiKTtcbiAgICBmbG93Lm1ha2UoZm9sZGVyLCBjYWxsYmFjayk7XG59O1xuXG4kJC5lbnN1cmVMaW5rRXhpc3RzID0gZnVuY3Rpb24gKGV4aXN0aW5nUGF0aCwgbmV3UGF0aCwgY2FsbGJhY2spIHtcbiAgICBjb25zdCBmbG93ID0gJCQuZmxvdy5zdGFydChcInV0aWxzLm1rRGlyUmVjXCIpO1xuICAgIGZsb3cubWFrZUxpbmsoZXhpc3RpbmdQYXRoLCBuZXdQYXRoLCBjYWxsYmFjayk7XG59OyovXG5cbiQkLnBhdGhOb3JtYWxpemUgPSBmdW5jdGlvbiAocGF0aFRvTm9ybWFsaXplKSB7XG4gICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuICAgIHBhdGhUb05vcm1hbGl6ZSA9IHBhdGgubm9ybWFsaXplKHBhdGhUb05vcm1hbGl6ZSk7XG5cbiAgICByZXR1cm4gcGF0aFRvTm9ybWFsaXplLnJlcGxhY2UoL1tcXC9cXFxcXS9nLCBwYXRoLnNlcCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBcdFx0XHRcdGNyZWF0ZVN3YXJtRW5naW5lOiByZXF1aXJlKFwiLi9saWIvc3dhcm1EZXNjcmlwdGlvblwiKS5jcmVhdGVTd2FybUVuZ2luZSxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlSm9pblBvaW50OiByZXF1aXJlKFwiLi9saWIvcGFyYWxsZWxKb2luUG9pbnRcIikuY3JlYXRlSm9pblBvaW50LFxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVTZXJpYWxKb2luUG9pbnQ6IHJlcXVpcmUoXCIuL2xpYi9zZXJpYWxKb2luUG9pbnRcIikuY3JlYXRlU2VyaWFsSm9pblBvaW50LFxuICAgICAgICAgICAgICAgICAgICBzd2FybUluc3RhbmNlTWFuYWdlcjogcmVxdWlyZShcIi4vbGliL2Nob3Jlb2dyYXBoaWVzL3N3YXJtSW5zdGFuY2VzTWFuYWdlclwiKSxcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlSW50ZXJuYWxTd2FybVJvdXRpbmc6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBkdW1teVZNKG5hbWUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNvbHZlU3dhcm0oc3dhcm0pe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkJC5zd2FybXNJbnN0YW5jZXNNYW5hZ2VyLnJldml2ZV9zd2FybShzd2FybSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCQuUFNLX1B1YlN1Yi5zdWJzY3JpYmUobmFtZSwgc29sdmVTd2FybSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBhIGZha2UgZXhlY3V0aW9uIGNvbnRleHQuLi5cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1teVZNKCQkLkNPTlNUQU5UUy5TV0FSTV9GT1JfRVhFQ1VUSU9OKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXHRcdFx0XHR9O1xuIiwiaWYodHlwZW9mIHNpbmdsZXRvbl9jb250YWluZXJfbW9kdWxlX3dvcmthcm91bmRfZm9yX3dpcmVkX25vZGVfanNfY2FjaGluZyA9PSAndW5kZWZpbmVkJykge1xuICAgIHNpbmdsZXRvbl9jb250YWluZXJfbW9kdWxlX3dvcmthcm91bmRfZm9yX3dpcmVkX25vZGVfanNfY2FjaGluZyAgID0gbW9kdWxlO1xufSBlbHNlIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHNpbmdsZXRvbl9jb250YWluZXJfbW9kdWxlX3dvcmthcm91bmRfZm9yX3dpcmVkX25vZGVfanNfY2FjaGluZyAuZXhwb3J0cztcbiAgICByZXR1cm4gbW9kdWxlO1xufVxuXG4vKipcbiAqIENyZWF0ZWQgYnkgc2FsYm9haWUgb24gNC8yNy8xNS5cbiAqL1xuZnVuY3Rpb24gQ29udGFpbmVyKGVycm9ySGFuZGxlcil7XG4gICAgdmFyIHRoaW5ncyA9IHt9OyAgICAgICAgLy90aGUgYWN0dWFsIHZhbHVlcyBmb3Igb3VyIHNlcnZpY2VzLCB0aGluZ3NcbiAgICB2YXIgaW1tZWRpYXRlID0ge307ICAgICAvL2hvdyBkZXBlbmRlbmNpZXMgd2VyZSBkZWNsYXJlZFxuICAgIHZhciBjYWxsYmFja3MgPSB7fTsgICAgIC8vY2FsbGJhY2sgdGhhdCBzaG91bGQgYmUgY2FsbGVkIGZvciBlYWNoIGRlcGVuZGVuY3kgZGVjbGFyYXRpb25cbiAgICB2YXIgZGVwc0NvdW50ZXIgPSB7fTsgICAvL2NvdW50IGRlcGVuZGVuY2llc1xuICAgIHZhciByZXZlcnNlZFRyZWUgPSB7fTsgIC8vcmV2ZXJzZWQgZGVwZW5kZW5jaWVzLCBvcHBvc2l0ZSBvZiBpbW1lZGlhdGUgb2JqZWN0XG5cbiAgICAgdGhpcy5kdW1wID0gZnVuY3Rpb24oKXtcbiAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29uYXRpbmVyIGR1bXBcXG4gVGhpbmdzOlwiLCB0aGluZ3MsIFwiXFxuRGVwcyBjb3VudGVyOiBcIiwgZGVwc0NvdW50ZXIsIFwiXFxuU3RyaWdodDpcIiwgaW1tZWRpYXRlLCBcIlxcblJldmVyc2VkOlwiLCByZXZlcnNlZFRyZWUpO1xuICAgICB9O1xuXG4gICAgZnVuY3Rpb24gaW5jQ291bnRlcihuYW1lKXtcbiAgICAgICAgaWYoIWRlcHNDb3VudGVyW25hbWVdKXtcbiAgICAgICAgICAgIGRlcHNDb3VudGVyW25hbWVdID0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlcHNDb3VudGVyW25hbWVdKys7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnNlcnREZXBlbmRlbmN5aW5SVChub2RlTmFtZSwgZGVwZW5kZW5jaWVzKXtcbiAgICAgICAgZGVwZW5kZW5jaWVzLmZvckVhY2goZnVuY3Rpb24oaXRlbU5hbWUpe1xuICAgICAgICAgICAgdmFyIGwgPSByZXZlcnNlZFRyZWVbaXRlbU5hbWVdO1xuICAgICAgICAgICAgaWYoIWwpe1xuICAgICAgICAgICAgICAgIGwgPSByZXZlcnNlZFRyZWVbaXRlbU5hbWVdID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsW25vZGVOYW1lXSA9IG5vZGVOYW1lO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGRpc2NvdmVyVXBOb2Rlcyhub2RlTmFtZSl7XG4gICAgICAgIHZhciByZXMgPSB7fTtcblxuICAgICAgICBmdW5jdGlvbiBERlMobm4pe1xuICAgICAgICAgICAgdmFyIGwgPSByZXZlcnNlZFRyZWVbbm5dO1xuICAgICAgICAgICAgZm9yKHZhciBpIGluIGwpe1xuICAgICAgICAgICAgICAgIGlmKCFyZXNbaV0pe1xuICAgICAgICAgICAgICAgICAgICByZXNbaV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBERlMoaSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgREZTKG5vZGVOYW1lKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHJlcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzZXRDb3VudGVyKG5hbWUpe1xuICAgICAgICB2YXIgZGVwZW5kZW5jeUFycmF5ID0gaW1tZWRpYXRlW25hbWVdO1xuICAgICAgICB2YXIgY291bnRlciA9IDA7XG4gICAgICAgIGlmKGRlcGVuZGVuY3lBcnJheSl7XG4gICAgICAgICAgICBkZXBlbmRlbmN5QXJyYXkuZm9yRWFjaChmdW5jdGlvbihkZXApe1xuICAgICAgICAgICAgICAgIGlmKHRoaW5nc1tkZXBdID09IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICBpbmNDb3VudGVyKG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBjb3VudGVyKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVwc0NvdW50ZXJbbmFtZV0gPSBjb3VudGVyO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiQ291bnRlciBmb3IgXCIsIG5hbWUsICcgaXMgJywgY291bnRlcik7XG4gICAgICAgIHJldHVybiBjb3VudGVyO1xuICAgIH1cblxuICAgIC8qIHJldHVybnMgdGhvc2UgdGhhdCBhcmUgcmVhZHkgdG8gYmUgcmVzb2x2ZWQqL1xuICAgIGZ1bmN0aW9uIHJlc2V0VXBDb3VudGVycyhuYW1lKXtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAvL2NvbnNvbGUubG9nKCdSZXNldGluZyB1cCBjb3VudGVycyBmb3IgJywgbmFtZSwgXCJSZXZlcnNlOlwiLCByZXZlcnNlZFRyZWVbbmFtZV0pO1xuICAgICAgICB2YXIgdXBzID0gcmV2ZXJzZWRUcmVlW25hbWVdO1xuICAgICAgICBmb3IodmFyIHYgaW4gdXBzKXtcbiAgICAgICAgICAgIGlmKHJlc2V0Q291bnRlcih2KSA9PT0gMCl7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2godik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICAvKlxuICAgICAgICAgVGhlIGZpcnN0IGFyZ3VtZW50IGlzIGEgbmFtZSBmb3IgYSBzZXJ2aWNlLCB2YXJpYWJsZSxhICB0aGluZyB0aGF0IHNob3VsZCBiZSBpbml0aWFsaXNlZCwgcmVjcmVhdGVkLCBldGNcbiAgICAgICAgIFRoZSBzZWNvbmQgYXJndW1lbnQgaXMgYW4gYXJyYXkgd2l0aCBkZXBlbmRlbmNpZXNcbiAgICAgICAgIHRoZSBsYXN0IGFyZ3VtZW50IGlzIGEgZnVuY3Rpb24oZXJyLC4uLikgdGhhdCBpcyBjYWxsZWQgd2hlbiBkZXBlbmRlbmNpZXMgYXJlIHJlYWR5IG9yIHJlY2FsbGVkIHdoZW4gYXJlIG5vdCByZWFkeSAoc3RvcCB3YXMgY2FsbGVkKVxuICAgICAgICAgSWYgZXJyIGlzIG5vdCB1bmRlZmluZWQgaXQgbWVhbnMgdGhhdCBvbmUgb3IgYW55IHVuZGVmaW5lZCB2YXJpYWJsZXMgYXJlIG5vdCByZWFkeSBhbmQgdGhlIGNhbGxiYWNrIHdpbGwgYmUgY2FsbGVkIGFnYWluIGxhdGVyXG4gICAgICAgICBBbGwgdGhlIG90aGVyIGFyZ3VtZW50cyBhcmUgdGhlIGNvcnJlc3BvbmRpbmcgYXJndW1lbnRzIG9mIHRoZSBjYWxsYmFjayB3aWxsIGJlIHRoZSBhY3R1YWwgdmFsdWVzIG9mIHRoZSBjb3JyZXNwb25kaW5nIGRlcGVuZGVuY3lcbiAgICAgICAgIFRoZSBjYWxsYmFjayBmdW5jdGlvbnMgc2hvdWxkIHJldHVybiB0aGUgY3VycmVudCB2YWx1ZSAob3IgbnVsbClcbiAgICAgKi9cbiAgICB0aGlzLmRlY2xhcmVEZXBlbmRlbmN5ID0gZnVuY3Rpb24obmFtZSwgZGVwZW5kZW5jeUFycmF5LCBjYWxsYmFjayl7XG4gICAgICAgIGlmKGNhbGxiYWNrc1tuYW1lXSl7XG4gICAgICAgICAgICBlcnJvckhhbmRsZXIuaWdub3JlUG9zc2libGVFcnJvcihcIkR1cGxpY2F0ZSBkZXBlbmRlbmN5OlwiICsgbmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFja3NbbmFtZV0gPSBjYWxsYmFjaztcbiAgICAgICAgICAgIGltbWVkaWF0ZVtuYW1lXSAgID0gZGVwZW5kZW5jeUFycmF5O1xuICAgICAgICAgICAgaW5zZXJ0RGVwZW5kZW5jeWluUlQobmFtZSwgZGVwZW5kZW5jeUFycmF5KTtcbiAgICAgICAgICAgIHRoaW5nc1tuYW1lXSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdW5zYXRpc2ZpZWRDb3VudGVyID0gcmVzZXRDb3VudGVyKG5hbWUpO1xuICAgICAgICBpZih1bnNhdGlzZmllZENvdW50ZXIgPT09IDAgKXtcbiAgICAgICAgICAgIGNhbGxGb3JUaGluZyhuYW1lLCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsRm9yVGhpbmcobmFtZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICAvKlxuICAgICAgICBjcmVhdGUgYSBzZXJ2aWNlXG4gICAgICovXG4gICAgdGhpcy5zZXJ2aWNlID0gZnVuY3Rpb24obmFtZSwgZGVwZW5kZW5jeUFycmF5LCBjb25zdHJ1Y3Rvcil7XG4gICAgICAgIHRoaXMuZGVjbGFyZURlcGVuZGVuY3kobmFtZSwgZGVwZW5kZW5jeUFycmF5LCBjb25zdHJ1Y3Rvcik7XG4gICAgfTtcblxuXG4gICAgdmFyIHN1YnN5c3RlbUNvdW50ZXIgPSAwO1xuICAgIC8qXG4gICAgIGNyZWF0ZSBhIGFub255bW91cyBzdWJzeXN0ZW1cbiAgICAgKi9cbiAgICB0aGlzLnN1YnN5c3RlbSA9IGZ1bmN0aW9uKGRlcGVuZGVuY3lBcnJheSwgY29uc3RydWN0b3Ipe1xuICAgICAgICBzdWJzeXN0ZW1Db3VudGVyKys7XG4gICAgICAgIHRoaXMuZGVjbGFyZURlcGVuZGVuY3koXCJkaWNvbnRhaW5lcl9zdWJzeXN0ZW1fcGxhY2Vob2xkZXJcIiArIHN1YnN5c3RlbUNvdW50ZXIsIGRlcGVuZGVuY3lBcnJheSwgY29uc3RydWN0b3IpO1xuICAgIH07XG5cbiAgICAvKiBub3QgZG9jdW1lbnRlZC4uIGxpbWJvIHN0YXRlKi9cbiAgICB0aGlzLmZhY3RvcnkgPSBmdW5jdGlvbihuYW1lLCBkZXBlbmRlbmN5QXJyYXksIGNvbnN0cnVjdG9yKXtcbiAgICAgICAgdGhpcy5kZWNsYXJlRGVwZW5kZW5jeShuYW1lLCBkZXBlbmRlbmN5QXJyYXksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gbmV3IGNvbnN0cnVjdG9yKCk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjYWxsRm9yVGhpbmcobmFtZSwgb3V0T2ZTZXJ2aWNlKXtcbiAgICAgICAgdmFyIGFyZ3MgPSBpbW1lZGlhdGVbbmFtZV0ubWFwKGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICAgICAgcmV0dXJuIHRoaW5nc1tpdGVtXTtcbiAgICAgICAgfSk7XG4gICAgICAgIGFyZ3MudW5zaGlmdChvdXRPZlNlcnZpY2UpO1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBjYWxsYmFja3NbbmFtZV0uYXBwbHkoe30sYXJncyk7XG4gICAgICAgIH0gY2F0Y2goZXJyKXtcbiAgICAgICAgICAgIGVycm9ySGFuZGxlci50aHJvd0Vycm9yKGVycik7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmKG91dE9mU2VydmljZSB8fCB2YWx1ZT09PW51bGwpeyAgIC8vZW5hYmxlIHJldHVybmluZyBhIHRlbXBvcmFyeSBkZXBlbmRlbmN5IHJlc29sdXRpb24hXG4gICAgICAgICAgICBpZih0aGluZ3NbbmFtZV0pe1xuICAgICAgICAgICAgICAgIHRoaW5nc1tuYW1lXSA9IG51bGw7XG4gICAgICAgICAgICAgICAgcmVzZXRVcENvdW50ZXJzKG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIlN1Y2Nlc3MgcmVzb2x2aW5nIFwiLCBuYW1lLCBcIjpcIiwgdmFsdWUsIFwiT3RoZXIgcmVhZHk6XCIsIG90aGVyUmVhZHkpO1xuICAgICAgICAgICAgaWYoIXZhbHVlKXtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICB7XCJwbGFjZWhvbGRlclwiOiBuYW1lfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaW5nc1tuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgdmFyIG90aGVyUmVhZHkgPSByZXNldFVwQ291bnRlcnMobmFtZSk7XG4gICAgICAgICAgICBvdGhlclJlYWR5LmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgICAgICAgICAgY2FsbEZvclRoaW5nKGl0ZW0sIGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLypcbiAgICAgICAgRGVjbGFyZSB0aGF0IGEgbmFtZSBpcyByZWFkeSwgcmVzb2x2ZWQgYW5kIHNob3VsZCB0cnkgdG8gcmVzb2x2ZSBhbGwgb3RoZXIgd2FpdGluZyBmb3IgaXRcbiAgICAgKi9cbiAgICB0aGlzLnJlc29sdmUgICAgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSl7XG4gICAgICAgIHRoaW5nc1tuYW1lXSA9IHZhbHVlO1xuICAgICAgICB2YXIgb3RoZXJSZWFkeSA9IHJlc2V0VXBDb3VudGVycyhuYW1lKTtcblxuICAgICAgICBvdGhlclJlYWR5LmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgICAgICBjYWxsRm9yVGhpbmcoaXRlbSwgZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG5cblxuICAgIHRoaXMuaW5zdGFuY2VGYWN0b3J5ID0gZnVuY3Rpb24obmFtZSwgZGVwZW5kZW5jeUFycmF5LCBjb25zdHJ1Y3Rvcil7XG4gICAgICAgIGVycm9ySGFuZGxlci5ub3RJbXBsZW1lbnRlZChcImluc3RhbmNlRmFjdG9yeSBpcyBwbGFubmVkIGJ1dCBub3QgaW1wbGVtZW50ZWRcIik7XG4gICAgfTtcblxuICAgIC8qXG4gICAgICAgIERlY2xhcmUgdGhhdCBhIHNlcnZpY2Ugb3IgZmVhdHVyZSBpcyBub3Qgd29ya2luZyBwcm9wZXJseS4gQWxsIHNlcnZpY2VzIGRlcGVuZGluZyBvbiB0aGlzIHdpbGwgZ2V0IG5vdGlmaWVkXG4gICAgICovXG4gICAgdGhpcy5vdXRPZlNlcnZpY2UgICAgPSBmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgdGhpbmdzW25hbWVdID0gbnVsbDtcbiAgICAgICAgdmFyIHVwTm9kZXMgPSBkaXNjb3ZlclVwTm9kZXMobmFtZSk7XG4gICAgICAgIHVwTm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKXtcbiAgICAgICAgICAgIHRoaW5nc1tuYW1lXSA9IG51bGw7XG4gICAgICAgICAgICBjYWxsRm9yVGhpbmcobm9kZSwgdHJ1ZSk7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5cblxuZXhwb3J0cy5uZXdDb250YWluZXIgICAgPSBmdW5jdGlvbihjaGVja3NMaWJyYXJ5KXtcbiAgICByZXR1cm4gbmV3IENvbnRhaW5lcihjaGVja3NMaWJyYXJ5KTtcbn07XG5cbi8vZXhwb3J0cy5jb250YWluZXIgPSBuZXcgQ29udGFpbmVyKCQkLmVycm9ySGFuZGxlcik7IiwiZXhwb3J0cy5kb21haW5QdWJTdWIgPSByZXF1aXJlKFwiLi9kb21haW5QdWJTdWJcIik7IiwiXG4vKipcbiAqIEdlbmVyaWMgZnVuY3Rpb24gdXNlZCB0byByZWdpc3RlcnMgbWV0aG9kcyBzdWNoIGFzIGFzc2VydHMsIGxvZ2dpbmcsIGV0Yy4gb24gdGhlIGN1cnJlbnQgY29udGV4dC5cbiAqIEBwYXJhbSBuYW1lIHtTdHJpbmcpfSAtIG5hbWUgb2YgdGhlIG1ldGhvZCAodXNlIGNhc2UpIHRvIGJlIHJlZ2lzdGVyZWQuXG4gKiBAcGFyYW0gZnVuYyB7RnVuY3Rpb259IC0gaGFuZGxlciB0byBiZSBpbnZva2VkLlxuICogQHBhcmFtIHBhcmFtc0Rlc2NyaXB0aW9uIHtPYmplY3R9IC0gcGFyYW1ldGVycyBkZXNjcmlwdGlvbnNcbiAqIEBwYXJhbSBhZnRlciB7RnVuY3Rpb259IC0gY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmdW5jdGlvbiBoYXMgYmVlbiBleGVjdXRlZC5cbiAqL1xuZnVuY3Rpb24gYWRkVXNlQ2FzZShuYW1lLCBmdW5jLCBwYXJhbXNEZXNjcmlwdGlvbiwgYWZ0ZXIpe1xuICAgIHZhciBuZXdGdW5jID0gZnVuYztcbiAgICBpZih0eXBlb2YgYWZ0ZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBuZXdGdW5jID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBBcnJheS5mcm9tKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBmdW5jLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgYWZ0ZXIoKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBzb21lIHByb3BlcnRpZXMgc2hvdWxkIG5vdCBiZSBvdmVycmlkZGVuXG4gICAgY29uc3QgcHJvdGVjdGVkUHJvcGVydGllcyA9IFsgJ2FkZENoZWNrJywgJ2FkZENhc2UnLCAncmVnaXN0ZXInIF07XG4gICAgaWYocHJvdGVjdGVkUHJvcGVydGllcy5pbmRleE9mKG5hbWUpID09PSAtMSl7XG4gICAgICAgIHRoaXNbbmFtZV0gPSBuZXdGdW5jO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2FudCBvdmVyd3JpdGUgJyArIG5hbWUpO1xuICAgIH1cblxuICAgIGlmKHBhcmFtc0Rlc2NyaXB0aW9uKXtcbiAgICAgICAgdGhpcy5wYXJhbXNbbmFtZV0gPSBwYXJhbXNEZXNjcmlwdGlvbjtcbiAgICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhbGlhcyB0byBhbiBleGlzdGluZyBmdW5jdGlvbi5cbiAqIEBwYXJhbSBuYW1lMSB7U3RyaW5nfSAtIE5ldyBmdW5jdGlvbiBuYW1lLlxuICogQHBhcmFtIG5hbWUyIHtTdHJpbmd9IC0gRXhpc3RpbmcgZnVuY3Rpb24gbmFtZS5cbiAqL1xuZnVuY3Rpb24gYWxpYXMobmFtZTEsIG5hbWUyKXtcbiAgICB0aGlzW25hbWUxXSA9IHRoaXNbbmFtZTJdO1xufVxuXG4vKipcbiAqIFNpbmdsZXRvbiBmb3IgYWRkaW5nIHZhcmlvdXMgZnVuY3Rpb25zIGZvciB1c2UgY2FzZXMgcmVnYXJkaW5nIGxvZ2dpbmcuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gTG9nc0NvcmUoKXtcbiAgICB0aGlzLnBhcmFtcyA9IHt9O1xufVxuXG4vKipcbiAqIFNpbmdsZXRvbiBmb3IgYWRkaW5nIHlvdXIgdmFyaW91cyBmdW5jdGlvbnMgZm9yIGFzc2VydHMuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gQXNzZXJ0Q29yZSgpe1xuICAgIHRoaXMucGFyYW1zID0ge307XG59XG5cbi8qKlxuICogU2luZ2xldG9uIGZvciBhZGRpbmcgeW91ciB2YXJpb3VzIGZ1bmN0aW9ucyBmb3IgY2hlY2tzLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIENoZWNrQ29yZSgpe1xuICAgIHRoaXMucGFyYW1zID0ge307XG59XG5cbi8qKlxuICogU2luZ2xldG9uIGZvciBhZGRpbmcgeW91ciB2YXJpb3VzIGZ1bmN0aW9ucyBmb3IgZ2VuZXJhdGluZyBleGNlcHRpb25zLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEV4Y2VwdGlvbnNDb3JlKCl7XG4gICAgdGhpcy5wYXJhbXMgPSB7fTtcbn1cblxuLyoqXG4gKiBTaW5nbGV0b24gZm9yIGFkZGluZyB5b3VyIHZhcmlvdXMgZnVuY3Rpb25zIGZvciBydW5uaW5nIHRlc3RzLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFRlc3RSdW5uZXJDb3JlKCl7XG59XG5cbkxvZ3NDb3JlLnByb3RvdHlwZS5hZGRDYXNlICAgICAgICAgICA9IGFkZFVzZUNhc2U7XG5Bc3NlcnRDb3JlLnByb3RvdHlwZS5hZGRDaGVjayAgICAgICAgPSBhZGRVc2VDYXNlO1xuQ2hlY2tDb3JlLnByb3RvdHlwZS5hZGRDaGVjayAgICAgICAgID0gYWRkVXNlQ2FzZTtcbkV4Y2VwdGlvbnNDb3JlLnByb3RvdHlwZS5yZWdpc3RlciAgICA9IGFkZFVzZUNhc2U7XG5cbkxvZ3NDb3JlLnByb3RvdHlwZS5hbGlhcyAgICAgICAgICAgICA9IGFsaWFzO1xuQXNzZXJ0Q29yZS5wcm90b3R5cGUuYWxpYXMgICAgICAgICAgID0gYWxpYXM7XG5DaGVja0NvcmUucHJvdG90eXBlLmFsaWFzICAgICAgICAgICAgPSBhbGlhcztcbkV4Y2VwdGlvbnNDb3JlLnByb3RvdHlwZS5hbGlhcyAgICAgICA9IGFsaWFzO1xuXG4vLyBDcmVhdGUgbW9kdWxlc1xudmFyIGFzc2VydE9iaiAgICAgICA9IG5ldyBBc3NlcnRDb3JlKCk7XG52YXIgY2hlY2tPYmogICAgICAgID0gbmV3IENoZWNrQ29yZSgpO1xudmFyIGV4Y2VwdGlvbnNPYmogICA9IG5ldyBFeGNlcHRpb25zQ29yZSgpO1xudmFyIGxvZ2dlck9iaiAgICAgICA9IG5ldyBMb2dzQ29yZSgpO1xudmFyIHRlc3RSdW5uZXJPYmogICA9IG5ldyBUZXN0UnVubmVyQ29yZSgpO1xuXG4vLyBFeHBvcnQgbW9kdWxlc1xuZXhwb3J0cy5hc3NlcnQgICAgICA9IGFzc2VydE9iajtcbmV4cG9ydHMuY2hlY2sgICAgICAgPSBjaGVja09iajtcbmV4cG9ydHMuZXhjZXB0aW9ucyAgPSBleGNlcHRpb25zT2JqO1xuZXhwb3J0cy5sb2dnZXIgICAgICA9IGxvZ2dlck9iajtcbmV4cG9ydHMudGVzdFJ1bm5lciAgPSB0ZXN0UnVubmVyT2JqO1xuXG4vLyBJbml0aWFsaXNlIG1vZHVsZXNcbnJlcXVpcmUoXCIuL3N0YW5kYXJkQXNzZXJ0cy5qc1wiKS5pbml0KGV4cG9ydHMsIGxvZ2dlck9iaik7XG5yZXF1aXJlKFwiLi9zdGFuZGFyZExvZ3MuanNcIikuaW5pdChleHBvcnRzKTtcbnJlcXVpcmUoXCIuL3N0YW5kYXJkRXhjZXB0aW9ucy5qc1wiKS5pbml0KGV4cG9ydHMpO1xucmVxdWlyZShcIi4vc3RhbmRhcmRDaGVja3MuanNcIikuaW5pdChleHBvcnRzKTtcbnJlcXVpcmUoXCIuL3Rlc3RSdW5uZXIuanNcIikuaW5pdChleHBvcnRzKTtcblxuLy8gR2xvYmFsIFVuY2F1Z2h0IEV4Y2VwdGlvbiBoYW5kbGVyLlxuaWYocHJvY2Vzcy5vbilcbntcbiAgICBwcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRjb25zdCB0YWcgPSBcInVuY2F1Z2h0RXhjZXB0aW9uXCI7XG5cdFx0Y29uc29sZS5sb2codGFnLCBlcnIpO1xuXHRcdGNvbnNvbGUubG9nKHRhZywgZXJyLnN0YWNrKTtcblx0fSk7XG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdFx0XHRcdFx0Y3JlYXRlUXVlOiByZXF1aXJlKFwiLi9saWIvZm9sZGVyTVFcIikuZ2V0Rm9sZGVyUXVldWVcblx0XHRcdFx0XHQvL2ZvbGRlck1ROiByZXF1aXJlKFwiLi9saWIvZm9sZGVyTVFcIilcbn07IiwiLy9jb25zb2xlLmxvZyhyZXF1aXJlLnJlc29sdmUoXCIuL2NvbXBvbmVudHMuanNcIikpO1xubW9kdWxlLmV4cG9ydHMgPSAkJC5saWJyYXJ5KGZ1bmN0aW9uKCl7XG5cdHJlcXVpcmUoXCIuL2NvbXBvbmVudHMuanNcIik7XG5cdC8qcmVxdWlyZShcIi4vbWtEaXJSZWMuanNcIik7Ki9cbn0pIiwiY29uc3QgUFNLQnVmZmVyID0gcmVxdWlyZSgnLi9saWIvUFNLQnVmZmVyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUFNLQnVmZmVyO1xuIiwiY29uc3QgUHNrQ3J5cHRvID0gcmVxdWlyZShcIi4vbGliL1Bza0NyeXB0b1wiKTtcbmNvbnN0IHNzdXRpbCA9IHJlcXVpcmUoXCIuL3NpZ25zZW5zdXNEUy9zc3V0aWxcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gUHNrQ3J5cHRvO1xuXG5tb2R1bGUuZXhwb3J0cy5oYXNoVmFsdWVzID0gc3N1dGlsLmhhc2hWYWx1ZXM7XG5cbmlmKHR5cGVvZihfX19ESVNBQkxFX09CU09MRVRFX1pJUF9BUkNISVZFUl9XQUlUX0ZPUl9CQVJTKSA9PT0gJ3VuZGVmaW5lZCcpe1xuICAgIG1vZHVsZS5leHBvcnRzLlBza0FyY2hpdmVyID0gcmVxdWlyZShcIi4vbGliL3Bzay1hcmNoaXZlclwiKTtcbn1cblxubW9kdWxlLmV4cG9ydHMuRHVwbGV4U3RyZWFtID0gcmVxdWlyZShcIi4vbGliL3V0aWxzL0R1cGxleFN0cmVhbVwiKTtcblxubW9kdWxlLmV4cG9ydHMuaXNTdHJlYW0gPSByZXF1aXJlKFwiLi9saWIvdXRpbHMvaXNTdHJlYW1cIik7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdFx0XHRcdFx0c291bmRQdWJTdWI6IHJlcXVpcmUoXCIuL2xpYi9zb3VuZFB1YlN1YlwiKS5zb3VuZFB1YlN1YlxufTsiLCJtb2R1bGUuZXhwb3J0cy5Pd00gPSByZXF1aXJlKFwiLi9saWIvT3dNXCIpO1xubW9kdWxlLmV4cG9ydHMuYmVlc0hlYWxlciA9IHJlcXVpcmUoXCIuL2xpYi9iZWVzSGVhbGVyXCIpO1xuXG5jb25zdCB1aWRHZW5lcmF0b3IgPSByZXF1aXJlKFwiLi9saWIvdWlkR2VuZXJhdG9yXCIpLmNyZWF0ZVVpZEdlbmVyYXRvcigyMDAsIDMyKTtcblxubW9kdWxlLmV4cG9ydHMuc2FmZV91dWlkID0gcmVxdWlyZShcIi4vbGliL3NhZmUtdXVpZFwiKS5pbml0KHVpZEdlbmVyYXRvcik7XG5cbm1vZHVsZS5leHBvcnRzLlF1ZXVlID0gcmVxdWlyZShcIi4vbGliL1F1ZXVlXCIpO1xubW9kdWxlLmV4cG9ydHMuY29tYm9zID0gcmVxdWlyZShcIi4vbGliL0NvbWJvc1wiKTtcblxubW9kdWxlLmV4cG9ydHMudWlkR2VuZXJhdG9yID0gdWlkR2VuZXJhdG9yO1xubW9kdWxlLmV4cG9ydHMuZ2VuZXJhdGVVaWQgPSB1aWRHZW5lcmF0b3IuZ2VuZXJhdGVVaWQ7XG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZVBza0NvbnNvbGUgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiByZXF1aXJlKCcuL2xpYi9wc2tjb25zb2xlJyk7XG59O1xuXG5cbmlmKHR5cGVvZiBnbG9iYWwuJCQgPT0gXCJ1bmRlZmluZWRcIil7XG4gIGdsb2JhbC4kJCA9IHt9O1xufVxuXG5pZih0eXBlb2YgZ2xvYmFsLiQkLnVpZEdlbmVyYXRvciA9PSBcInVuZGVmaW5lZFwiKXtcbiAgICAkJC51aWRHZW5lcmF0b3IgPSBtb2R1bGUuZXhwb3J0cy5zYWZlX3V1aWQ7XG59XG4iLCJleHBvcnRzLmZzRXh0ID0gcmVxdWlyZShcIi4vRlNFeHRlbnNpb25cIikuZnNFeHQ7Il19
