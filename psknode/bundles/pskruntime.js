pskruntimeRequire=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/opt/new_swarm_engine_release/privatesky/builds/tmp/pskruntime.js":[function(require,module,exports){
require("../../modules/callflow/lib/overwriteRequire")

require("./pskruntime_intermediar");

require("./pskruntime_intermediar");

require("callflow");

console.log("Loading runtime: callflow module ready");
},{"../../modules/callflow/lib/overwriteRequire":"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/overwriteRequire.js","./pskruntime_intermediar":"/opt/new_swarm_engine_release/privatesky/builds/tmp/pskruntime_intermediar.js","callflow":"callflow"}],"/opt/new_swarm_engine_release/privatesky/builds/tmp/pskruntime_intermediar.js":[function(require,module,exports){
(function (global){
global.pskruntimeLoadModules = function(){ 
	$$.__runtimeModules["source-map-support"] = require("source-map-support");
	$$.__runtimeModules["source-map"] = require("source-map");
	$$.__runtimeModules["buffer-from"] = require("buffer-from");
	$$.__runtimeModules["callflow"] = require("callflow");
	$$.__runtimeModules["launcher"] = require("launcher");
	$$.__runtimeModules["pskcrypto"] = require("pskcrypto");
	$$.__runtimeModules["dicontainer"] = require("dicontainer");
	$$.__runtimeModules["swarmutils"] = require("swarmutils");
	$$.__runtimeModules["soundpubsub"] = require("soundpubsub");
	$$.__runtimeModules["pskbuffer"] = require("pskbuffer");
	$$.__runtimeModules["foldermq"] = require("foldermq");
	$$.__runtimeModules["utils"] = require("utils");
	$$.__runtimeModules["@msgpack/msgpack"] = require("@msgpack/msgpack");
	$$.__runtimeModules["psklogger"] = require("psklogger");
	$$.__runtimeModules["zmq_adapter"] = require("zmq_adapter");
	$$.__runtimeModules["psk-security-context"] = require("psk-security-context");
}
if (false) {
	pskruntimeLoadModules();
}; 
global.pskruntimeRequire = require;
if (typeof $$ !== "undefined") {            
    $$.requireBundle("pskruntime");
    };
    require('source-map-support').install({});
    
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"@msgpack/msgpack":"@msgpack/msgpack","buffer-from":"buffer-from","callflow":"callflow","dicontainer":"dicontainer","foldermq":"foldermq","launcher":"launcher","psk-security-context":"psk-security-context","pskbuffer":"pskbuffer","pskcrypto":"pskcrypto","psklogger":"psklogger","soundpubsub":"soundpubsub","source-map":"source-map","source-map-support":"source-map-support","swarmutils":"swarmutils","utils":"utils","zmq_adapter":"zmq_adapter"}],"/opt/new_swarm_engine_release/privatesky/libraries/launcher/components.js":[function(require,module,exports){
$$.DI_components = {
   swarmIsReady:"SwarmIsReady",
   configLoaded:"configLoaded",
   sandBoxReady:"SandBoxReady",
   localNodeAPIs:"localNodeAPIs"
}

},{}],"/opt/new_swarm_engine_release/privatesky/libraries/utils/FSExtension.js":[function(require,module,exports){
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
                log(error);
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
            log(`Directory ${dir} does not exist!`, false);
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
                    log(error);
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

},{"child_process":false,"crypto":"crypto","fs":false,"os":"os","path":"path"}],"/opt/new_swarm_engine_release/privatesky/modules/callflow/constants.js":[function(require,module,exports){
$$.CONSTANTS = {
    SWARM_FOR_EXECUTION:"swarm_for_execution",//TODO: remove
    INBOUND:"inbound",//TODO: remove
    OUTBOUND:"outbound",//TODO: remove
    PDS:"PrivateDataSystem", //TODO: remove
    CRL:"CommunicationReplicationLayer", //TODO: remove
    SWARM_RETURN: 'swarm_return', //TODO: remove
    BEFORE_INTERCEPTOR: 'before',//TODO: document
    AFTER_INTERCEPTOR: 'after'//TODO: document
};


$$.CONSTANTS.mixIn = function(otherConstants){
    for(let v in otherConstants){
        if($$.CONSTANTS[v] && $$.CONSTANTS[v] !== otherConstants[v]){
            $$.warn("Overwriting CONSTANT "+ v + " previous value " + $$.CONSTANTS[v] + "new value " + otherConstants[v]);
        }
        $$.CONSTANTS[v] = otherConstants[v];
    }
}

},{}],"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/InterceptorRegistry.js":[function(require,module,exports){
// related to: SwarmSpace.SwarmDescription.createPhase()

function InterceptorRegistry() {
    const rules = new Map();

     _CLASS_NAME = 'InterceptorRegistry';

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

},{}],"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/loadLibrary.js":[function(require,module,exports){
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
            $$.syntaxError("Reusing already loaded library " + prefixName + "could be an error!");
        }
        return existing;
    }
    //var absolutePath = path.resolve(folder);
    return new SwarmLibrary(prefixName, folder);
}


},{}],"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/overwriteRequire.js":[function(require,module,exports){
(function (global){
/*
 require and $$.require are overwriting the node.js defaults in loading modules for increasing security,speed and making it work to the privatesky runtime build with browserify.
 The privatesky code for domains should work in node and browsers.
 */

/**
 * @classdesc Interface for $$ object
 *
 * @name $$
 * @class
 *
 */

if (typeof(window) !== "undefined") {
    global = window;
}


if (typeof(global.$$) == "undefined") {
    /**
     *
     * @type {$$}
     */
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
                $$.err("Require encountered an error while loading ", request, "\nCause:\n", err.stack);
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
                        let pathOrName = request;
                        if(pathOrName.startsWith('/') || pathOrName.startsWith('./') || pathOrName.startsWith('../')){
                            pathOrName = path.join(process.cwd(), request);
                        }
                        res = moduleOriginalRequire.call(self, pathOrName);
                        request = pathOrName;
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

},{"./../standardGlobalSymbols":"/opt/new_swarm_engine_release/privatesky/modules/callflow/standardGlobalSymbols.js","crypto":"crypto","module":false,"path":"path","util":"util"}],"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/parallelJoinPoint.js":[function(require,module,exports){

var globalJoinCounter = 0;

function ParallelJoinPoint(swarm, callback, args){
    globalJoinCounter++;
    var channelId = "ParallelJoinPoint" + globalJoinCounter;
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
        $$.syntaxError("invalid join",swarm, "invalid function at join in swarm");
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
            $$.info(err);
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
},{}],"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/serialJoinPoint.js":[function(require,module,exports){

var joinCounter = 0;

function SerialJoinPoint(swarm, callback, args){

    joinCounter++;

    var self = this;
    var channelId = "SerialJoinPoint" + joinCounter;

    if(typeof callback !== "function"){
        $$.syntaxError("unknown", swarm, "invalid function given to serial in swarm");
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
},{}],"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/swarmDescription.js":[function(require,module,exports){
const OwM = require("swarmutils").OwM;

var swarmDescriptionsRegistry = {};
let currentInlineCounter = 0;

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


$$.fixSwarmName = function(shortName){
    let fullName;
    try{
        if(shortName && shortName.includes(".")) {
            fullName = shortName;
        } else {
            fullName = $$.libraryPrefix + "." + shortName;
        }

    } catch(err){
        $$.err(err);
    }
    return fullName;
}

function SwarmSpace(swarmType, utils) {

    let beesHealer = require("swarmutils").beesHealer;

    function getFullName(shortName){
        return $$.fixSwarmName(shortName);
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
                $$.syntaxError(" Undefined symbol " + property + " in swarm " + target.meta.swarmTypeName);
            }
            return undefined;
        }

        this.set = function(target, property, value, receiver){

            if(target.utilityFunctions.hasOwnProperty(property) || target.myFunctions.hasOwnProperty(property)) {
                $$.syntaxError(property);
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

        return function(serialisedValues, initialisationContext){
            var valueObject = self.initialise(serialisedValues);
            var result = new Proxy(valueObject,self);
            self.initialiseFunctions(valueObject,result);
			if(!serialisedValues){
				if(!valueObject.getMeta("swarmId")){
					valueObject.setMeta("swarmId", $$.uidGenerator.safe_uuid());  //do not overwrite!!!
				}
				valueObject.utilityFunctions.notify();
			}

			if(result.autoInit){
                result.autoInit(initialisationContext);
                $$.fixMe("Reinstate somehow the next comment")
                //result.autoInit = undefined;
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
            $$.warn("Duplicate swarm description "+ swarmTypeName);
        }

        //swarmDescriptionsRegistry[swarmTypeName] = description;
		$$.registerSwarmDescription(libraryName, shortName, swarmTypeName, description);

        return description;
    }


    var self = this;
    $$.fixMe("This could generate memory leaks. Fix it later");
    this.inline = function inline(description, ...args){
        currentInlineCounter++;
        var desc = self.describe("inlineSwarm" + currentInlineCounter, description);
        var flow = desc();
        flow.start(...args);
        return flow;
    }

    this.create = function(){
        $$.err("Create APIs for creation of swarms was  removed. Use describe!");
    }

    this.continue = function(swarmTypeName, initialValues){
        if(!initialValues){
            initialValues = swarmTypeName;
            swarmTypeName = initialValues.meta.swarmTypeName;
        }

        swarmTypeName = getFullName(swarmTypeName);
        let desc = swarmDescriptionsRegistry[swarmTypeName];
        if(desc){
            return desc(initialValues);
        } else {
            $$.err(swarmTypeName,initialValues,
                "Failed to restart a swarm with type " + swarmTypeName + "\n Maybe different swarm space (used flow instead of swarm!?)");
        }
    }

    this.start = function(swarmTypeName, ctor, ...params){
        let ret = this.startWithContext(undefined, swarmTypeName, ctor, ...params);
        return ret;
    }

    this.startWithContext = function(context, swarmTypeName, ctor, ...params){
        swarmTypeName = getFullName(swarmTypeName);
        var desc = swarmDescriptionsRegistry[swarmTypeName];
        if(!desc){
            $$.syntaxError(null, swarmTypeName);
            return null;
        }
        let res = desc(undefined, context);
        res.setMetadata("homeSecurityContext", $$.securityContext);

        if(ctor){
            res[ctor].apply(res, params);
        }

        return res;
    }
}

exports.createSwarmEngine = function(swarmType, utils){
    if(typeof utils == "undefined"){
        utils = require("./utilityFunctions/callflow");
    }
    return new SwarmSpace(swarmType, utils);
};


},{"./utilityFunctions/callflow":"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/utilityFunctions/callflow.js","swarmutils":"swarmutils"}],"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/utilityFunctions/SwarmDebug.js":[function(require,module,exports){
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


},{"fs":false,"util":"util"}],"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/utilityFunctions/base.js":[function(require,module,exports){
var beesHealer = require("swarmutils").beesHealer;
var swarmDebug = require("./SwarmDebug");

exports.createForObject = function(valueObject, thisObject, localId){
	let ret = {};


	function getInnerValue(){
		return valueObject;
	}

	function runPhase(functName, args){
		var func = valueObject.myFunctions[functName];
		if(func){
			func.apply(thisObject, args);
		} else {
			$$.syntaxError(functName, valueObject, "Function " + functName + " does not exist!");
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
		return require("../parallelJoinPoint").createJoinPoint(thisObject, callback, $$.__intern.mkArgs(arguments,1));
	}

	function createSerial(callback){
		return require("../serialJoinPoint").createSerialJoinPoint(thisObject, callback, $$.__intern.mkArgs(arguments,1));
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

	function observe(callback, waitForMore, messageIdentityFilter){
		if(!waitForMore){
			waitForMore = function (){
				return false;
			}
		}

		ensureLocalId();

		$$.PSK_PubSub.subscribe(valueObject.localId, callback, waitForMore, messageIdentityFilter);
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


	ret.getInnerValue   = getInnerValue;
	ret.toString        = toString;
	ret.constructor     = constructor;
	ret.setMetadata		= valueObject.setMeta.bind(valueObject);
	ret.getMetadata		= valueObject.getMeta.bind(valueObject);

	ret.autoInit		= null;
	return ret;

};

},{"../parallelJoinPoint":"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/parallelJoinPoint.js","../serialJoinPoint":"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/serialJoinPoint.js","./SwarmDebug":"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/utilityFunctions/SwarmDebug.js","swarmutils":"swarmutils"}],"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/utilityFunctions/callflow.js":[function(require,module,exports){
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
},{"./base":"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/utilityFunctions/base.js"}],"/opt/new_swarm_engine_release/privatesky/modules/callflow/standardGlobalSymbols.js":[function(require,module,exports){
let logger = console;

if (process.env.NO_LOGS !== 'true') {
    try {
        const PSKLoggerModule = require('psklogger');
        const PSKLogger = PSKLoggerModule.PSKLogger;

        logger = PSKLogger.getLogger();

        // TODO: remove this once $$ logger is used instead of console
        PSKLoggerModule.overwriteConsole();

        console.log('Logger init successful', process.pid);
    } catch (e) {
        console.log('Logger not available, using console');
        logger = console;
    }
} else {
    console.log('Environment flag NO_LOGS is set, logging to console');
}

$$.registerGlobalSymbol = function (newSymbol, value) {
    if (typeof $$[newSymbol] == "undefined") {
        Object.defineProperty($$, newSymbol, {
            value: value,
            writable: false
        });
    } else {
        logger.error("Refusing to overwrite $$." + newSymbol);
    }
};

console.warn = (...args)=>{
    console.log(...args);
};

/**
 * @method
 * @name $$#autoThrow
 * @param {Error} err
 * @throws {Error}
 */

$$.registerGlobalSymbol("autoThrow", function (err) {
    if (!err) {
        throw err;
    }
});

/**
 * @method
 * @name $$#propagateError
 * @param {Error} err
 * @param {function} callback
 */
$$.registerGlobalSymbol("propagateError", function (err, callback) {
    if (err) {
        callback(err);
        throw err; //stop execution
    }
});

/**
 * @method
 * @name $$#logError
 * @param {Error} err
 */
$$.registerGlobalSymbol("logError", function (err) {
    if (err) {
        console.log(err);
        $$.err(err);
    }
});

/**
 * @method
 * @name $$#fixMe
 * @param {...*} args
 */
console.log("Fix the fixMe to not display on console but put in logs");
$$.registerGlobalSymbol("fixMe", function (...args) {
    //$$.log(...args);
});

/**
 * @method - Throws an error
 * @name $$#exception
 * @param {string} message
 * @param {*} type
 */
$$.registerGlobalSymbol("exception", function (message, type) {
    throw new Error(message);
});

/**
 * @method - Throws an error
 * @name $$#throw
 * @param {string} message
 * @param {*} type
 */
$$.registerGlobalSymbol("throw", function (message, type) {
    throw new Error(message);
});


/**
 * @method - Warns that method is not implemented
 * @name $$#incomplete
 * @param {...*} args
 */
/* signal a  planned feature but not implemented yet (during development) but
also it could remain in production and should be flagged asap*/
$$.incomplete = function (...args) {
    args.unshift("Incomplete feature touched:");
    logger.warn(...args);
};

/**
 * @method - Warns that method is not implemented
 * @name $$#notImplemented
 * @param {...*} args
 */
$$.notImplemented = $$.incomplete;


/**
 * @method Throws if value is false
 * @name $$#assert
 * @param {boolean} value - Value to assert against
 * @param {string} explainWhy - Reason why assert failed (why value is false)
 */
/* used during development and when trying to discover elusive errors*/
$$.registerGlobalSymbol("assert", function (value, explainWhy) {
    if (!value) {
        throw new Error("Assert false " + explainWhy);
    }
});

/**
 * @method
 * @name $$#flags
 * @param {string} flagName
 * @param {*} value
 */
/* enable/disabale flags that control psk behaviour*/
$$.registerGlobalSymbol("flags", function (flagName, value) {
    $$.incomplete("flags handling not implemented");
});

/**
 * @method - Warns that a method is obsolete
 * @name $$#obsolete
 * @param {...*} args
 */
$$.registerGlobalSymbol("obsolete", function (...args) {
    args.unshift("Obsolete feature:");
    logger.log(...args);
    console.log(...args);
});

/**
 * @method - Uses the logger to log a message of level "log"
 * @name $$#log
 * @param {...*} args
 */
$$.registerGlobalSymbol("log", function (...args) {
    args.unshift("Log:");
    logger.log(...args);
});

/**
 * @method - Uses the logger to log a message of level "info"
 * @name $$#info
 * @param {...*} args
 */
$$.registerGlobalSymbol("info", function (...args) {
    args.unshift("Info:");
    logger.log(...args);
    console.log(...args);
});

/**
 * @method - Uses the logger to log a message of level "error"
 * @name $$#err
 * @param {...*} args
 */
$$.registerGlobalSymbol("err", function (...args) {
    args.unshift("Error:");
    logger.error(...args);
    console.error(...args);
});

/**
 * @method - Uses the logger to log a message of level "error"
 * @name $$#err
 * @param {...*} args
 */
$$.registerGlobalSymbol("error", function (...args) {
    args.unshift("Error:");
    logger.error(...args);
    console.error(...args);
});

/**
 * @method - Uses the logger to log a message of level "warning"
 * @name $$#warn
 * @param {...*} args
 */
$$.registerGlobalSymbol("warn", function (...args) {
    args.unshift("Warn:");
    logger.warn(...args);
    console.log(...args);
});

/**
 * @method - Uses the logger to log a message of level "syntexError"
 * @name $$#syntexError
 * @param {...*} args
 */
$$.registerGlobalSymbol("syntaxError", function (...args) {
    args.unshift("Syntax error:");
    logger.error(...args);
    try{
        throw new Error("Syntax error or misspelled symbol!");
    }catch(err){
        console.error(...args);
        console.error(err.stack);
    }

});

/**
 * @method - Logs an invalid member name for a swarm
 * @name $$#invalidMemberName
 * @param {string} name
 * @param {Object} swarm
 */
$$.invalidMemberName = function (name, swarm) {
    let swarmName = "unknown";
    if (swarm && swarm.meta) {
        swarmName = swarm.meta.swarmTypeName;
    }
    const text = "Invalid member name " + name + "in swarm " + swarmName;
    console.error(text);
    logger.err(text);
};

/**
 * @method - Logs an invalid swarm name
 * @name $$#invalidSwarmName
 * @param {string} name
 * @param {Object} swarm
 */
$$.registerGlobalSymbol("invalidSwarmName", function (swarmName) {
    const text = "Invalid swarm name " + swarmName;
    console.error(text);
    logger.err(text);
});

/**
 * @method - Logs unknown exceptions
 * @name $$#unknownException
 * @param {...*} args
 */
$$.registerGlobalSymbol("unknownException", function (...args) {
    args.unshift("unknownException:");
    logger.err(...args);
    console.error(...args);
});

/**
 * @method - PrivateSky event, used by monitoring and statistics
 * @name $$#event
 * @param {string} event
 * @param {...*} args
 */
$$.registerGlobalSymbol("event", function (event, ...args) {
    if (logger.hasOwnProperty('event')) {
        logger.event(event, ...args);
    } else {
        // console.log(event, ...args);
    }
});

/**
 * @method -
 * @name $$#redirectLog
 * @param {string} event
 * @param {...*} args
 */
$$.registerGlobalSymbol("redirectLog", function (logType, logObject) {
    if(logger.hasOwnProperty('redirect')) {
        logger.redirect(logType, logObject);
    }
});

/**
 * @method - log throttling event // it is just an event?
 * @name $$#throttlingEvent
 * @param {...*} args
 */
$$.registerGlobalSymbol("throttlingEvent", function (...args) {
    logger.log(...args);
});

},{"psklogger":"psklogger"}],"/opt/new_swarm_engine_release/privatesky/modules/choreo/index.js":[function(require,module,exports){
let cm = require("callflow");
let swarmUtils = require("./swarmTypes/swarm_template");
const SwarmEngine = require('../swarm-engine');

//$$.swarmInstanceManager = require("./swarmTypes/choreographies/swarmInstancesManager");

let nameService = SwarmEngine.createNameService("default");
let serialisationStrategy = SwarmEngine.createSerialisationStrategy("json");
let swarmCommunicationStrategy = SwarmEngine.createCommunicationStrategy("local", nameService, serialisationStrategy);
let securityContext = SwarmEngine.createSecurityContext();

SwarmEngine.initialiseSwarmEngine(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext);

$$.swarms           = cm.createSwarmEngine("swarm", swarmUtils);
$$.swarm            = $$.swarms;

},{"../swarm-engine":"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/index.js","./swarmTypes/swarm_template":"/opt/new_swarm_engine_release/privatesky/modules/choreo/swarmTypes/swarm_template.js","callflow":"callflow"}],"/opt/new_swarm_engine_release/privatesky/modules/choreo/moduleConstants.js":[function(require,module,exports){
let CNST =
 {
    EXECUTE_PHASE_COMMAND:"execute",
    HOME_PHASE_COMMAND:"home",
    RETURN_PHASE_COMMAND:"return",
    META_RETURN_CONTEXT:"returnContext",
    META_HOME_CONTEXT:"homeContext",
    META_WAITSTACK:"waitStack"
};

$$.CONSTANTS.mixIn(CNST);

module.exports = CNST;
},{}],"/opt/new_swarm_engine_release/privatesky/modules/choreo/swarmTypes/swarm_template.js":[function(require,module,exports){
let cm = require("callflow");
let CNST = require("../moduleConstants");

let beesHealer = require("swarmutils").beesHealer;

exports.createForObject = function(valueObject, thisObject, localId){

    function messageIdentityFilter (valueObject){
        return valueObject.meta.swarmId;
    }

    let swarmFunction = function(context, phaseName){
        let args =[];
        for(let i = 2; i < arguments.length; i++){
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
        },null,null);

        ret.notify();


        return thisObject;
    };

    let asyncReturn = function(err, result){
        let context = valueObject.protectedVars.context;

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
                $$.err(new Error("Asynchronous return inside of a swarm that does not wait for results"));
            } else {
                $$.PSK_PubSub.publish($$.CONSTANTS.SWARM_FOR_EXECUTION, jsMsg);
            }
        });
    };

    function home(err, result){
        beesHealer.asJSON(valueObject, "home", [err, result], function(err,jsMsg){
            let context = valueObject.meta.homeContext;
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
        $$.swarmEngine.waitForSwarm(callback, swarm, keepAliveCheck);
    }


    let ret = cm.createStandardAPIsForSwarms(valueObject, thisObject, localId);

    ret.swarm           = swarmFunction;
    ret.home            = home;
    ret.onReturn        = waitResults;
    ret.onResult        = waitResults;
    ret.asyncReturn     = asyncReturn;
    ret.return          = asyncReturn;


    ret.autoInit        = function(blockchain){

    };

    return ret;
};
},{"../moduleConstants":"/opt/new_swarm_engine_release/privatesky/modules/choreo/moduleConstants.js","callflow":"callflow","swarmutils":"swarmutils"}],"/opt/new_swarm_engine_release/privatesky/modules/foldermq/lib/folderMQ.js":[function(require,module,exports){
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

},{"fs":false,"path":"path","swarmutils":"swarmutils"}],"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/Agent.js":[function(require,module,exports){
function Agent(agentId, publicKey){
    this.agentId = agentId;
    this.publicKey = publicKey;
}

module.exports = Agent;
},{}],"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/EncryptedSecret.js":[function(require,module,exports){
function EncryptedSecret(encryptedData, agentId){
    this.encryptedData = encryptedData;
    this.agentId = agentId;
}

module.exports = EncryptedSecret;
},{}],"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/PSKSignature.js":[function(require,module,exports){
function PSKSignature(message, signature, type, agentId) {
    this.message = message;
    this.signature = signature;
    this.type = type;
    this.agentId = agentId;
}

module.exports = PSKSignature;
},{}],"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/RawCSBSecurityContext.js":[function(require,module,exports){
function RawCSBSecurityContext(parentSecurityContext) {
    this.generateIdentity = parentSecurityContext.generateIdentity;
    this.getCurrentAgentIdentity = parentSecurityContext.getCurrentAgentIdentity;
    this.generateSeed = parentSecurityContext.generateRandom;
    this.getSeed = parentSecurityContext.getSecret;
    this.shareSeed = parentSecurityContext.shareSecret;
    this.sign = parentSecurityContext.sign;
    this.verify = parentSecurityContext.verify;
}

module.exports = RawCSBSecurityContext;
},{}],"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/RootCSBSecurityContext.js":[function(require,module,exports){
const SecurityContext = require("./SecurityContext");

function RootCSBSecurityContext() {
    const securityContext = new SecurityContext();

    this.generateIdentity = securityContext.generateIdentity;
    this.getCurrentAgentIdentity = securityContext.getCurrentAgentIdentity;
    this.generateSeed = securityContext.generateRandom;
    this.getSeed = securityContext.getSecret;
    this.shareSeed = securityContext.shareSecret;
    this.sign = securityContext.sign;
    this.verify = securityContext.verify;
}

module.exports = RootCSBSecurityContext;
},{"./SecurityContext":"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/SecurityContext.js"}],"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/SecurityContext.js":[function(require,module,exports){
const crypto = require("pskcrypto");
const swarmUtils = require("swarmutils");
const PSKSignature = require("./PSKSignature");
const EncryptedSecret = require("./EncryptedSecret");
const Agent = require("./Agent");

function SecurityContext() {

    const knownAgents = []; // contains pairs (agentId, publicKey)
    const privateKeys = {};
    const signType = "sha256";

    this.generateIdentity = (callback) => {
        crypto.generateKeyPair((err, publicKey, privateKey) => {
            if (err) {
                return callback(err);
            }

            const agent = new Agent($$.uidGenerator.safe_uuid(), publicKey);
            knownAgents.push(agent);
            privateKeys[agent.agentId] = privateKey;

            return callback(undefined, agent.agentId);
        });
    };

    this.getCurrentAgentIdentity = () => {
        return knownAgents[0].agentId;
    };

    this.getSecret = (readList, callback) => {
        const encSecret = readList.find(secret => secret.agentId === this.getCurrentAgentIdentity());
        if (!encSecret) {
            return callback(Error("The current agent cannot get the secret"));
        }

        callback(undefined, crypto.privateDecrypt(privateKeys[this.getCurrentAgentIdentity()], encSecret));
    };

    this.shareSecret = (secret, list, callback) => {
        const readList = [];
        list.forEach(agentId => {
            const publicKey = getPublicKey(agentId);
            readList.push(new EncryptedSecret(crypto.publicEncrypt(publicKey, secret), agentId));
        });

        callback(undefined, readList);
    };

    this.sign = (digest, writeList, all, callback) => {
        if (typeof all === "function") {
            callback = all;
            all = false;
        }

        if (!listHasElement(writeList, this.getCurrentAgentIdentity())) {
            return callback(Error("The current agent does not have signing privileges"));
        }

        if (!all) {
            const agentId = this.getCurrentAgentIdentity();
            const signature = crypto.sign(privateKeys[agentId], digest);
            return callback(undefined, new PSKSignature(digest, signature, signType, agentId));
        }

        const pskSignatures = [];
        const asyncDispatcher = new swarmUtils.AsyncDispatcher(() => {
            callback(undefined, pskSignatures);
        });

        asyncDispatcher.dispatchEmpty(knownAgents.length);
        knownAgents.forEach(agent => {
            if (listHasElement(writeList, agent.agentId)) {
                const signature = crypto.sign(privateKeys[agent.agentId], digest);
                pskSignatures.push(new PSKSignature(digest, signature, signType, agent.agentId));
                asyncDispatcher.markOneAsFinished();
            }else{
                asyncDispatcher.markOneAsFinished();
            }
        })
    };

    this.verify = (pskSignature) => {
        return crypto.verify(getPublicKey(pskSignature.agentId), pskSignature.signature, pskSignature.message);
    };

    this.generateRandom = (len = 32) => {
        crypto.randomBytes(len);
    };

    //----------------------------- internal functions ------------------------------
    function listHasElement(list, element) {
        return !!list.find(el => element === el);
    }

    function getPublicKey(agentId) {
        const agent = knownAgents.find(ag => ag.agentId === agentId);
        if(!agent){
            return undefined;
        }

        return agent.publicKey;
    }

}

module.exports = SecurityContext;

},{"./Agent":"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/Agent.js","./EncryptedSecret":"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/EncryptedSecret.js","./PSKSignature":"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/PSKSignature.js","pskcrypto":"pskcrypto","swarmutils":"swarmutils"}],"/opt/new_swarm_engine_release/privatesky/modules/pskbuffer/lib/PSKBuffer.js":[function(require,module,exports){
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
},{}],"/opt/new_swarm_engine_release/privatesky/modules/pskcrypto/lib/PskCrypto.js":[function(require,module,exports){
(function (Buffer){
const crypto = require('crypto');
const utils = require("./utils/cryptoUtils");


function PskCrypto() {

    const PskEncryption = require("./PskEncryption");
    this.createPskEncryption = (algorithm) => {
        return new PskEncryption(algorithm);
    };

    this.sign = function (privateKey, digest) {
        if (typeof digest === "string") {
            digest = Buffer.from(digest, "hex");
        }

        return crypto.createSign("sha256").update(digest).sign(privateKey);
    };

    this.verify = function (publicKey, signature, digest) {
        if (typeof digest === "string") {
            digest = Buffer.from(digest, "hex");
        }

        if (typeof signature === "string") {
            signature = Buffer.from(signature, "hex");
        }
        return crypto.createVerify("sha256").update(digest).verify(publicKey, signature);
    };

    this.generateKeyPair = (callback) => {
        crypto.generateKeyPair('rsa', {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            }
        }, callback);
    };

    this.privateEncrypt = (privateKey, data) => {
        if (typeof data === "string") {
            data = Buffer.from(data);
        }

        return crypto.privateEncrypt(privateKey, data);
    };

    this.privateDecrypt = (privateKey, encryptedData) => {
        if (typeof encryptedData === "string") {
            encryptedData = Buffer.from(encryptedData);
        }

        return crypto.privateDecrypt(privateKey, encryptedData);
    };

    this.publicEncrypt = (publicKey, data) => {
        if (typeof data === "string") {
            data = Buffer.from(data);
        }

        return crypto.publicEncrypt(publicKey, data);
    };

    this.publicDecrypt = (publicKey, encryptedData) => {
        if (typeof encryptedData === "string") {
            encryptedData = Buffer.from(encryptedData);
        }

        return crypto.publicDecrypt(publicKey, encryptedData);
    };

    this.decrypt = (encryptedData, algorithm, key, iv, options) => {

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

    this.deriveKey = function deriveKey(algorithm, password) {
        const keylen = utils.getKeyLength(algorithm);
        const salt = utils.generateSalt(password, 32);
        return crypto.scryptSync(password, salt, keylen);
    };


    this.randomBytes = crypto.randomBytes;
    this.PskHash = utils.PskHash;
}

module.exports = new PskCrypto();

}).call(this,require("buffer").Buffer)

},{"./PskEncryption":"/opt/new_swarm_engine_release/privatesky/modules/pskcrypto/lib/PskEncryption.js","./utils/cryptoUtils":"/opt/new_swarm_engine_release/privatesky/modules/pskcrypto/lib/utils/cryptoUtils.js","buffer":"buffer","crypto":"crypto"}],"/opt/new_swarm_engine_release/privatesky/modules/pskcrypto/lib/PskEncryption.js":[function(require,module,exports){
(function (Buffer){
const crypto = require("crypto");
const utils = require("./utils/cryptoUtils");

function PskEncryption(algorithm) {
    if (!algorithm) {
        throw Error("No encryption algorithm was provided");
    }

    let iv;
    let aad;
    let tag;
    let data;
    let key;

    let keylen = utils.getKeyLength(algorithm);
    let encryptionIsAuthenticated = utils.encryptionIsAuthenticated(algorithm);

    this.encrypt = (plainData, encryptionKey, options) => {
        iv = iv || crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv, options);
        if (encryptionIsAuthenticated) {
            aad = crypto.randomBytes(encryptionKey.length);
            cipher.setAAD(aad);
        }

        const encData = Buffer.concat([cipher.update(plainData), cipher.final()]);
        if (encryptionIsAuthenticated) {
            tag = cipher.getAuthTag();
        }

        key = encryptionKey;
        return encData;
    };

    this.decrypt = (encryptedData, decryptionKey, authTagLength = 0, options) => {
        if (!iv) {
            this.getDecryptionParameters(encryptedData, authTagLength);
        }
        const decipher = crypto.createDecipheriv(algorithm, decryptionKey, iv, options);
        if (encryptionIsAuthenticated) {
            decipher.setAAD(aad);
            decipher.setAuthTag(tag);
        }

        return Buffer.concat([decipher.update(data), decipher.final()]);
    };

    this.getEncryptionParameters = () => {
        if (!iv) {
            return;
        }

        return {iv, aad, key, tag};
    };

    this.getDecryptionParameters = (encryptedData, authTagLength = 0) => {
        const aadLen = keylen;
        if (encryptionIsAuthenticated) {
            authTagLength = 16;
        }

        const tagOffset = encryptedData.length - authTagLength;
        tag = encryptedData.slice(tagOffset, encryptedData.length);

        const aadOffset = tagOffset - aadLen;
        aad = encryptedData.slice(aadOffset, tagOffset);

        iv = encryptedData.slice(aadOffset - 16, aadOffset);
        data = encryptedData.slice(0, aadOffset - 16);

        return {iv, aad, tag, data};
    };

    this.generateEncryptionKey = () => {
        keylen = utils.getKeyLength(algorithm);
        return crypto.randomBytes(keylen);
    };
}

module.exports = PskEncryption;
}).call(this,require("buffer").Buffer)

},{"./utils/cryptoUtils":"/opt/new_swarm_engine_release/privatesky/modules/pskcrypto/lib/utils/cryptoUtils.js","buffer":"buffer","crypto":"crypto"}],"/opt/new_swarm_engine_release/privatesky/modules/pskcrypto/lib/utils/DuplexStream.js":[function(require,module,exports){
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
},{"stream":"stream","util":"util"}],"/opt/new_swarm_engine_release/privatesky/modules/pskcrypto/lib/utils/cryptoUtils.js":[function(require,module,exports){
(function (Buffer){
const crypto = require('crypto');

const keySizes = [128, 192, 256];
const authenticationModes = ["ocb", "ccm", "gcm"];

function encode(buffer) {
	return buffer.toString('base64')
		.replace(/\+/g, '')
		.replace(/\//g, '')
		.replace(/=+$/, '');
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

function encryptionIsAuthenticated(algorithm) {
	for (const mode of authenticationModes) {
		if (algorithm.includes(mode)) {
			return true;
		}
	}

	return false;
}

function getKeyLength(algorithm) {
	for (const len of keySizes) {
		if (algorithm.includes(len.toString())) {
			return len / 8;
		}
	}

	throw new Error("Invalid encryption algorithm.");
}

module.exports = {
	createPskHash,
	encode,
	generateSalt,
	PskHash,
	getKeyLength,
	encryptionIsAuthenticated
};


}).call(this,require("buffer").Buffer)

},{"buffer":"buffer","crypto":"crypto"}],"/opt/new_swarm_engine_release/privatesky/modules/pskcrypto/lib/utils/isStream.js":[function(require,module,exports){
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
},{"stream":"stream"}],"/opt/new_swarm_engine_release/privatesky/modules/pskcrypto/signsensusDS/ssutil.js":[function(require,module,exports){
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
},{"crypto":"crypto"}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/LoggerClient/GenericLoggerClient.js":[function(require,module,exports){
const LogFactory = require('./LogFactory');

/**
 *
 * @param {TransportInterface} messagePublisher
 * @constructor
 */
function GenericLoggerClient(messagePublisher) {
    /**
     * This is to be used to send normal logs. They will be published in a subchannel of the "logs" channel.
     * It is easier to trace only user and platform logs if they are separated in this channel
     *
     * @param {{code: Number, name: string}} logLevel
     * @param {Object} meta
     * @param {Array<any>} messages
     *
     * @return {{level, meta, time, msTime, messages}}
     */
    function log(logLevel, meta, messages) {
        const log = LogFactory.createLog(logLevel, meta, messages);

        const logChannel = `logs.${logLevel.name}`;
        messagePublisher.send(logChannel, log);

        return log;
    }


    /**
     * This is to be used for sending custom events when messages don't happen in the normal flow of the platform
     * or they shouldn't interfere with the tracing of logs
     * For example, sending statistics about a node or a sandbox is happening periodically and not as a result of
     * users' running code, therefore this should not be merged with logs
     *
     * @param {string} channel
     * @param {Object} meta
     * @param {Array<any>} messages
     * @return {{meta, messages, time}}
     */
    function event(channel, meta, messages) {
        const event = LogFactory.createEvent(meta, messages);

        const logChannel = `events.${channel}`;
        messagePublisher.send(logChannel, event);

        return event;
    }

    function publish(channel, message) {
        messagePublisher.send(channel, message);

        return message;
    }

    this.event  = event;
    this.log    = log;
    this.publish = publish;
}

module.exports = GenericLoggerClient;

},{"./LogFactory":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/LoggerClient/LogFactory.js"}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/LoggerClient/LogFactory.js":[function(require,module,exports){
function getTime() {
    if(process.env.context === 'sandbox') {

        return Date.now()
    } else {
        const {performance} = require('perf_hooks');

        return performance.now() + performance.timeOrigin;
    }
}


function createLog(logLevel, meta, messages) {
    return {
        level: logLevel,
        messages: messages,
        meta: meta,
        time: getTime()
    }
}

function createEvent(meta, messages) {
    return {
        messages,
        meta,
        time: getTime()
    };
}

module.exports = {
    createLog,
    createEvent
};

},{"perf_hooks":false}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/LoggerClient/LoggerClient.js":[function(require,module,exports){
const GenericLoggerClient = require('./GenericLoggerClient');
const LogLevel = require('../utils/LogLevel');
const LoggerInterface = require('./LoggerInterface');

/**
 *
 * @param {TransportInterface} messagePublisher
 * @implements LoggerInterface
 * @constructor
 */
function LoggerClient(messagePublisher) {
    LoggerInterface.call(this);

    const genericLoggerClient = new GenericLoggerClient(messagePublisher);


    /************* PUBLIC METHODS *************/

    function debug(meta = {}, ...params) {
        const logLevel = _getLogLevel(LogLevel.debug);

        return genericLoggerClient.log(logLevel, meta, params);
    }

    function error(meta = {}, ...params) {
        const logLevel = _getLogLevel(LogLevel.error);

        return genericLoggerClient.log(logLevel, meta, params);
    }

    function info(meta = {}, ...params) {
        const logLevel = _getLogLevel(LogLevel.info);

        return genericLoggerClient.log(logLevel, meta, params);
    }

    function log(meta = {}, ...params) {
        const logLevel = _getLogLevel(LogLevel.log);

        return genericLoggerClient.log(logLevel, meta, params);
    }

    function warn(meta = {}, ...params) {
        const logLevel = _getLogLevel(LogLevel.warn);

        return genericLoggerClient.log(logLevel, meta, params);
    }

    function event(channel, meta = {}, ...params) {
        return genericLoggerClient.event(channel, meta, ...params);
    }
    
    function redirect(channel, logObject) {
        return genericLoggerClient.publish(channel, logObject)
    }


    /************* PRIVATE METHODS *************/

    function _getLogLevel(levelCode) {
        return {
            code: levelCode,
            name: LogLevel[levelCode]
        };
    }


    /************* EXPORTS *************/

    this.debug    = debug;
    this.error    = error;
    this.event    = event;
    this.info     = info;
    this.log      = log;
    this.redirect = redirect;
    this.warn     = warn;
}

module.exports = LoggerClient;

},{"../utils/LogLevel":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/LogLevel.js","./GenericLoggerClient":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/LoggerClient/GenericLoggerClient.js","./LoggerInterface":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/LoggerClient/LoggerInterface.js"}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/LoggerClient/LoggerInterface.js":[function(require,module,exports){
/**
 * @interface
 */
function LoggerInterface() {
    function genericMethod(channel, logObject) {
        throw new Error('Not implemented');
    }

    this.debug    = genericMethod;
    this.error    = genericMethod;
    this.event    = genericMethod;
    this.info     = genericMethod;
    this.log      = genericMethod;
    this.redirect = genericMethod;
    this.warn     = genericMethod;
}

module.exports = LoggerInterface;

},{}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/LoggerClient/index.js":[function(require,module,exports){
const GenericLoggerClient = require('./GenericLoggerClient');
const LogFactory          = require('./LogFactory');
const LoggerClient        = require('./LoggerClient');
const LoggerInterface     = require('./LoggerInterface');


module.exports = {
    GenericLoggerClient,
    LogFactory,
    LoggerClient,
    LoggerInterface
};

},{"./GenericLoggerClient":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/LoggerClient/GenericLoggerClient.js","./LogFactory":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/LoggerClient/LogFactory.js","./LoggerClient":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/LoggerClient/LoggerClient.js","./LoggerInterface":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/LoggerClient/LoggerInterface.js"}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessagePublisher/MessagePublisher.js":[function(require,module,exports){
const TransportInterface = require('./TransportInterface');
const utils = require('../utils');
const zeroMQ = require('zeromq');


/**
 * Creates a ZeroMQ Publisher Socket and connects to the specified address for a ZeroMQ Subscriber
 * @param {string!} address - Base address including protocol and port (ex: tcp://127.0.0.1:8080)
 * @implements TransportInterface
 * @constructor
 */
function MessagePublisher(address) {
    TransportInterface.call(this);

    const zmqSocket = zeroMQ.createSocket('pub');

    // uncomment next line if messages are lost
    // zmqSocket.setsockopt(zeroMQ.ZMQ_SNDHWM, 0);
    const socket = new utils.BufferedSocket(zmqSocket, utils.SocketType.connectable);


    /************* PUBLIC METHODS *************/

    /**
     *
     * @param {string} channel
     * @param {Object} logObject
     */
    this.send = function (channel, logObject) {
        try {
            const serializedLog = JSON.stringify(logObject);

            socket.send([channel, serializedLog]);
        } catch (e) {
            process.stderr.write('Error while sending or serializing message');
        }
    };


    /************* MONITOR SOCKET *************/

    zmqSocket.connect(address);
}

module.exports = MessagePublisher;

},{"../utils":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/index.js","./TransportInterface":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessagePublisher/TransportInterface.js","zeromq":false}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessagePublisher/MessagePublisherForSandbox.js":[function(require,module,exports){
(function (global){
const TransportInterface = require('./TransportInterface');

/**
 * This assumes it is executed inside a sandbox and that exists an object "logger" on "global" with a method "send".
 * Sandboxes can't connect directly to ZeroMQ therefore this just relays the message outside the sandbox.
 *
 * @implements TransportInterface
 * @constructor
 */
function MessagePublisherForSandbox() {

    TransportInterface.call(this);

    /************* PUBLIC METHODS *************/

    /**
     *
     * @param {string} channel
     * @param {Object} logObject
     */
    this.send = function (channel, logObject) {
        try {
            global.logger.send([channel, logObject]);
        } catch (e) {
            console.error('Error while sending or serializing message from sandbox', e);
        }
    };

}

module.exports = MessagePublisherForSandbox;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./TransportInterface":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessagePublisher/TransportInterface.js"}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessagePublisher/TransportInterface.js":[function(require,module,exports){
/**
 *
 * @interface
 */
function TransportInterface() {
    this.send = function (channel, logObject) {
        throw new Error('Not implemented');
    }
}

module.exports = TransportInterface;

},{}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessagePublisher/index.js":[function(require,module,exports){
const TransportInterface = require('./TransportInterface');

module.exports = {
    TransportInterface
};

if(process.env.context === 'sandbox') {
    module.exports.MessagePublisher = require('./MessagePublisherForSandbox');
} else {
    module.exports.MessagePublisher = require('./MessagePublisher');
}

},{"./MessagePublisher":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessagePublisher/MessagePublisher.js","./MessagePublisherForSandbox":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessagePublisher/MessagePublisherForSandbox.js","./TransportInterface":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessagePublisher/TransportInterface.js"}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessageSubscriber/MessageSubscriber.js":[function(require,module,exports){
const zeroMQ = require('zeromq');

/**
 * Creates a ZeroMQ Subscriber that listens for provided topics on the specified address for a publisher
 * @param {string!} address - Base address including protocol and port (ex: tcp://127.0.0.1:8080)
 * @param {Array<string>|function?} subscriptions - a list of subscription topics, if missing it will subscribe to everything
 * @param {function!} onMessageCallback
 * @constructor
 */
function MessageSubscriber(address, subscriptions, onMessageCallback) {
    const zmqSocket = zeroMQ.createSocket('sub');

    // uncomment next line if messages are lost
    // zmqSocket.setsockopt(zeroMQ.ZMQ_RCVHWM, 0);

    if(arguments.length === 2 && typeof subscriptions === 'function') {
        onMessageCallback = subscriptions;
        subscriptions = [''];
    }

    subscriptions.forEach(subscription => zmqSocket.subscribe(subscription));

    zmqSocket.connect(address);

    zmqSocket.on('message', onMessageCallback);

    const events = ["SIGINT", "SIGUSR1", "SIGUSR2", "uncaughtException", "SIGTERM", "SIGHUP"];

    events.forEach(event => {
        process.on(event, () => {
            zmqSocket.close();
        });
    });
}

module.exports = MessageSubscriber;

},{"zeromq":false}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessageSubscriber/index.js":[function(require,module,exports){
const MessageSubscriber = require('./MessageSubscriber');

module.exports = {MessageSubscriber};

},{"./MessageSubscriber":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessageSubscriber/MessageSubscriber.js"}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/PSKLoggerClient/GenericPSKLogger.js":[function(require,module,exports){
(function (global){
const LoggerClientModule = require('../LoggerClient');

const LoggerClient = LoggerClientModule.LoggerClient;
const LoggerInterface = LoggerClientModule.LoggerInterface;


/**
 *
 * @param messagePublisher
 * @implements LoggerInterface
 * @constructor
 */
function GenericPSKLogger(messagePublisher) {
    LoggerInterface.call(this);

    const logger = new LoggerClient(messagePublisher);

    function debug(...params) {
        const meta = prepareMeta();
        return logger.debug(meta, ...params);
    }

    function error(...params) {
        const meta = prepareMeta();
        return logger.error(meta, ...params);
    }

    function info(...params) {
        const meta = prepareMeta();
        return logger.info(meta, ...params);
    }

    function log(...params) {
        const meta = prepareMeta();
        return logger.log(meta, ...params);
    }

    function warn(...params) {
        const meta = prepareMeta();
        return logger.warn(meta, ...params);
    }

    function event(event, ...params) {
        const meta = prepareMeta();
        return logger.event(event, meta, params);
    }
    
    function redirect(logType, logObject) {
        const logMeta = logObject.meta;
        const meta = prepareMeta();
        
        Object.assign(meta, logMeta);

        logObject.meta = meta;

        return logger.redirect(logType, logObject);
    }

    function prepareMeta() {
        if (global.$$.getEnvironmentData) {
            return global.$$.getEnvironmentData();
        }
        
        return {};
    }


    this.debug    = debug;
    this.error    = error;
    this.event    = event;
    this.info     = info;
    this.log      = log;
    this.redirect = redirect;
    this.warn     = warn;

}

module.exports = GenericPSKLogger;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../LoggerClient":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/LoggerClient/index.js"}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/PSKLoggerClient/index.js":[function(require,module,exports){
const Configurator     = require('../utils/Configurator');
const GenericPSKLogger = require('./GenericPSKLogger');
const MessagePublisher = require('../MessagePublisher').MessagePublisher;

function getLogger() {
    let messagePublisher;

    if (process.env.context === 'sandbox') {

        messagePublisher = new MessagePublisher();
    } else {
        const config = Configurator.getConfig();
        messagePublisher = new MessagePublisher(config.addressForPublishers);
    }

    return new GenericPSKLogger(messagePublisher);
}

module.exports = {
    getLogger
};

},{"../MessagePublisher":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessagePublisher/index.js","../utils/Configurator":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/Configurator.js","./GenericPSKLogger":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/PSKLoggerClient/GenericPSKLogger.js"}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/PubSubProxy/PubSubProxy.js":[function(require,module,exports){
const zeroMQ = require('zeromq');
const utils = require('../utils');

/**
 * Proxy between publishers and subscribers to avoid star topology communication
 * Subscribers should connect first otherwise no subscription request will be sent to publishers and therefore they
 * won't even send the messages to the proxy. This is because the filtering is done on the publisher for tcp or ipc,
 * view http://zguide.zeromq.org/page:all#Getting-the-Message-Out for more info
 * @param {string!} addressForPublishers - Base address including protocol and port (ex: tcp://127.0.0.1:8080)
 * @param {string!} addressForSubscribers - Base address including protocol and port (ex: tcp://127.0.0.1:8080)
 * @constructor
 */
function PubSubProxy({addressForPublishers, addressForSubscribers}) {
    const frontend = zeroMQ.createSocket('xsub');
    const backend = zeroMQ.createSocket('xpub');
    const bufferedBackend = new utils.BufferedSocket(backend, utils.SocketType.bindable);

    // By default xpub only signals new subscriptions
    // Settings it to verbose = 1 , will signal on every new subscribe
    // uncomment next lines if messages are lost
    // backend.setsockopt(zeroMQ.ZMQ_XPUB_VERBOSE, 1);
    // backend.setsockopt(zeroMQ.ZMQ_SNDHWM, 0);
    // backend.setsockopt(zeroMQ.ZMQ_RCVHWM, 0);
    // frontend.setsockopt(zeroMQ.ZMQ_RCVHWM, 0);
    // frontend.setsockopt(zeroMQ.ZMQ_SNDHWM, 0);

    // When we receive data on frontend, it means someone is publishing
    frontend.on('message', (...args) => {
        // We just relay it to the backend, so subscribers can receive it
        bufferedBackend.send(args);
    });

    // When backend receives a message, it's subscribe requests
    backend.on('message', (data) => {
        // We send it to frontend, so it knows to what channels to listen to
        frontend.send(data);
    });

    /************* MONITOR SOCKET *************/

    frontend.bindSync(addressForPublishers);
    backend.bindSync(addressForSubscribers);

    const events = ["SIGINT", "SIGUSR1", "SIGUSR2", "uncaughtException", "SIGTERM", "SIGHUP"];

    events.forEach(event => {
        process.on(event, () => {
            frontend.close();
            backend.close();
        });
    });
}

module.exports = PubSubProxy;

},{"../utils":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/index.js","zeromq":false}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/PubSubProxy/index.js":[function(require,module,exports){
const PubSubProxy = require('./PubSubProxy');

module.exports = {PubSubProxy};

},{"./PubSubProxy":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/PubSubProxy/PubSubProxy.js"}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/BufferedSocket.js":[function(require,module,exports){
const SocketType = require('./SocketType');

/**
 * Wrapper for ZeroMQ socket that tries to prevent 'slow joiner', meaning it buffers the first messages until the
 * connection is established, otherwise the first messages would be lost
 * @param {Socket} socket - instance of ZeroMQ Socket
 * @param {SocketType<number>} type - used to determine if should listen for 'connect' or 'accept' event
 * @param {Number?} maxSize = 1000 - Max size for the internal buffer, if 0 the buffer is infinite but can cause memory leak
 * @constructor
 */
function BufferedSocket(socket, type, maxSize = 10000) {
    if(maxSize < 0) {
        maxSize = 1000;
    }

    let messageQueue = [];
    let isConnected = false;
    let currentBufferSize = 0;

    socket.monitor();
    const event = _getEventForType(type);

    socket.on(event, () => {
        isConnected = true;
        _flushQueue();
    });

    /************* PUBLIC METHODS *************/

    function send(message) {
        if (!isConnected) {
            if (maxSize !== 0 && currentBufferSize < maxSize) {
                currentBufferSize += 1;
                messageQueue.push(message);
            }
        } else {
            socket.send(message);
        }
    }

    /************* PRIVATE METHODS *************/

    function _flushQueue() {
        for (const message of messageQueue) {
            socket.send(message);
        }

        messageQueue = [];
        currentBufferSize = 0;
    }

    function _getEventForType(type) {
        if (type === SocketType.connectable) {
            return 'connect';
        } else if (type === SocketType.bindable) {
            return 'accept';
        }
    }

    /************* EXPORTS *************/

    this.send = send;
}


module.exports = BufferedSocket;

},{"./SocketType":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/SocketType.js"}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/Configurator.js":[function(require,module,exports){
const config = {
    addressForPublishers: process.env.PUBLISH_LOGS_ADDR || 'tcp://127.0.0.1:7000',
    addressForSubscribers: process.env.SUBSCRIBE_FOR_LOGS_ADDR || 'tcp://127.0.0.1:7001',
    addressToCollector: process.env.COLLECTOR_ADDR || 'tcp://127.0.0.1:5558'
};

module.exports = {
    getConfig () {
        return Object.freeze(config);
    }
};

},{}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/EnvironmentDataProvider.js":[function(require,module,exports){


function getEnvironmentData () {
    const path = require('path');
    const os = require('os');
    const platform = os.platform();

    const processPath = process.argv[1];
    const lastSep = processPath.lastIndexOf(path.sep);
    const processStartFile = processPath.substring(lastSep + 1);
    return {
        origin: 'node',
        processStartFile: processStartFile,
        platform: platform
    };
}

function getEnvironmentDataForDomain() {
    const os = require('os');
    const platform = os.platform();

    return {
        origin: 'domain',
        domain: process.env.PRIVATESKY_DOMAIN_NAME,
        platform: platform
    }
}

function getEnvironmentDataForAgent() {
    const os = require('os');
    const platform = os.platform();

    return {
        origin: 'agent',
        domain: process.env.PRIVATESKY_DOMAIN_NAME,
        agent: process.env.PRIVATESKY_AGENT_NAME,
        platform: platform
    }
}

function getEnvironmentDataForSandbox() {
    return {
        origin: 'sandbox'
    }
}

module.exports = {
    getEnvironmentData,
    getEnvironmentDataForAgent,
    getEnvironmentDataForDomain,
    getEnvironmentDataForSandbox
};

},{"os":"os","path":"path"}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/LogLevel.js":[function(require,module,exports){
const LogLevel = {};

LogLevel[LogLevel["error"] = 0] = "error";
LogLevel[LogLevel["warn"]  = 1] = "warn";
LogLevel[LogLevel["info"]  = 2] = "info";
LogLevel[LogLevel["debug"] = 3] = "debug";
LogLevel[LogLevel["log"]   = 4] = "log";

module.exports = Object.freeze(LogLevel);

},{}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/SocketType.js":[function(require,module,exports){
const SocketType = {};
SocketType[SocketType["connectable"] = 0] = "connectable"; // if .connect is called on socket
SocketType[SocketType["bindable"] = 1] = "bindable"; // if .bind is called on socket

module.exports = Object.freeze(SocketType);

},{}],"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/index.js":[function(require,module,exports){
const Configurator            = require('./Configurator');
const EnvironmentDataProvider = require('./EnvironmentDataProvider');
const LogLevel                = require('./LogLevel');
const BufferedSocket          = require('./BufferedSocket');
const SocketType              = require('./SocketType');

module.exports = {
    Configurator,
    EnvironmentDataProvider,
    LogLevel,
    BufferedSocket,
    SocketType
};

},{"./BufferedSocket":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/BufferedSocket.js","./Configurator":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/Configurator.js","./EnvironmentDataProvider":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/EnvironmentDataProvider.js","./LogLevel":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/LogLevel.js","./SocketType":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/SocketType.js"}],"/opt/new_swarm_engine_release/privatesky/modules/soundpubsub/lib/soundPubSub.js":[function(require,module,exports){
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
},{"swarmutils":"swarmutils"}],"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/SwarmEngine.js":[function(require,module,exports){
function SwarmEngine(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext){
    let _identity = "anonymous";
    let swarmInstancesCache = {

    };

    this.setNameService = function(ns){
        nameService = ns;
    };

    this.setSerialisationStrategy = function(ss){
        serialisationStrategy = ss;
    };

    this.setsecurityContext = function(sc){
        securityContext = sc;
    };

    this.init = function(identity){
        _identity = identity;
    };

    this.stop = function(){

    };

    /* ???
    swarmCommunicationStrategy.enableSwarmExecution(function(swarm){

    }); */


    this.sendSwarm = function(valueObject, command, destinationContext,  phaseName, args ){
        serialisationStrategy.cleanJSONSerialisation(valueObject, phaseName, args, function(err,jsMsg){
            jsMsg.meta.target = destinationContext;
            jsMsg.meta.command = command;
            swarmCommunicationStrategy.dispatch(jsMsg)
        });
    }

    this.waitForSwarm = function(callback, swarm, keepAliveCheck){

        function doLogic(){
            let  swarmId = swarm.getInnerValue().meta.swarmId;
            let  watcher = swarmInstancesCache[swarmId];
            if(!watcher){
                watcher = {
                    swarm:swarm,
                    callback:callback,
                    keepAliveCheck:keepAliveCheck
                };
                swarmInstancesCache[swarmId] = watcher;
            }
        }

        function filter(){
            return swarm.getInnerValue().meta.swarmId;
        }

        //$$.uidGenerator.wait_for_condition(condition,doLogic);
        swarm.observe(doLogic, null, filter);
    };

    function cleanSwarmWaiter(swarmSerialisation){ // TODO: add better mechanisms to prevent memory leaks
        let  swarmId = swarmSerialisation.meta.swarmId;
        let  watcher = swarmInstancesCache[swarmId];

        if(!watcher){
            $$.warn("Invalid swarm received: " + swarmId);
            return;
        }

        let  args = swarmSerialisation.meta.args;
        args.push(swarmSerialisation);

        watcher.callback.apply(null, args);
        if(!watcher.keepAliveCheck()){
            delete swarmInstancesCache[swarmId];
        }
    }

    this.revive_swarm = function(swarmSerialisation){

        let  swarmId     = swarmSerialisation.meta.swarmId;
        let  swarmType   = swarmSerialisation.meta.swarmTypeName;
        let  instance    = swarmInstancesCache[swarmId];

        let  swarm;

        if(instance){
            swarm = instance.swarm;
            swarm.update(swarmSerialisation);

        } else {
            if(typeof $$.blockchain !== "undefined") {
                swarm = $$.swarm.startWithContext($$.blockchain, swarmType);
            }else{
                swarm = $$.swarm.start(swarmType);
            }

            if(!swarm){
                throw new Error(`Unknown swarm with type <${swarmType}>. Check if this swarm is defined in the domain constitution!`);
            }else{
                swarm.update(swarmSerialisation);
            }

            /*swarm = $$.swarm.start(swarmType, swarmSerialisation);*/
        }

        if (swarmSerialisation.meta.command === "asyncReturn") {
            let  co = $$.PSK_PubSub.publish($$.CONSTANTS.SWARM_RETURN, swarmSerialisation);
            console.log("Subscribers listening on", $$.CONSTANTS.SWARM_RETURN, co);
            // cleanSwarmWaiter(swarmSerialisation);
        } else if (swarmSerialisation.meta.command === "executeSwarmPhase") {
            swarm.runPhase(swarmSerialisation.meta.phaseName, swarmSerialisation.meta.args);
        } else {
            console.log("Unknown command", swarmSerialisation.meta.command, "in swarmSerialisation.meta.command");
        }

        return swarm;
    }
}



module.exports.createSwarmEngine = function(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext){
    if(!swarmCommunicationStrategy){
        console.error("swarmCommunicationStrategy can't be undefined");
    }
    $$.swarmEngine = new SwarmEngine(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext);
    return $$.swarmEngine;
}
},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/bootScripts/CLIWorkerBootScript.js":[function(require,module,exports){

},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/bootScripts/isolateBootScript.js":[function(require,module,exports){
arguments[4]["/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/bootScripts/CLIWorkerBootScript.js"][0].apply(exports,arguments)
},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/bootScripts/serviceWorkerBootScript.js":[function(require,module,exports){
arguments[4]["/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/bootScripts/CLIWorkerBootScript.js"][0].apply(exports,arguments)
},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/bootScripts/singleProcessBootScript.js":[function(require,module,exports){
/*
    Useful for tests. Probably it is not a good idea to use in production in any way.
*/


},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/bootScripts/workerBootScript.js":[function(require,module,exports){
arguments[4]["/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/bootScripts/CLIWorkerBootScript.js"][0].apply(exports,arguments)
},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/index.js":[function(require,module,exports){



let psc = require("psk-security-context");

module.exports = {
    initialiseSwarmEngine:function(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext){
        return require("./SwarmEngine").createSwarmEngine(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext);
    },
    createSerialisationStrategy:function(strategyName, ...args){
        switch(strategyName){
            case "json":
            case "JSON":
                return require("./strategies/JSONSerialisationStrategy").createStrategy(args);
            default: console.error("Unknown strategy ", strategyName);
        }
        return undefined;
    },
    createCommunicationStrategy:function(strategyName, ...args){
        switch(strategyName){
            case "fake":
            case "local":
                return require("./strategies/fakeCommunicationStrategy").createStrategy(args);
            case "sandbox":
                return require("./strategies/fakeCommunicationStrategy").createStrategy(args);
            case "serviceWorkers":
                return require("./strategies/fakeCommunicationStrategy").createStrategy(args);
            default: console.error("Unknown strategy ", strategyName);
        }
        return undefined;
    },
    createNameService:function(strategyName, ...args){
        switch(strategyName){
            case "default":
                return require("./strategies/defaultNameService").createStrategy(args);
            default: console.error("Unknown strategy ", strategyName);
        }
        return undefined;
    },
    createSecurityContext:function(strategyName, ...args){
        return psc.createSecurityContext(strategyName,...args);
    },
    bootIsolate : function(){
        require("./bootScripts/isolateBootScript");
    },
    bootWorker : function(){
        require("./bootScripts/workerBootScript");
    },
    bootCLIWorker : function(){
        require("./bootScripts/CLIWorkerBootScript");
    },
    bootServiceWorker : function(){
        require("./bootScripts/serviceWorkerBootScript");
    },
    bootSwarmingInASingleProcess : function(){
    require("./bootScripts/singleProcessBootScript");
    }
}
},{"./SwarmEngine":"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/SwarmEngine.js","./bootScripts/CLIWorkerBootScript":"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/bootScripts/CLIWorkerBootScript.js","./bootScripts/isolateBootScript":"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/bootScripts/isolateBootScript.js","./bootScripts/serviceWorkerBootScript":"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/bootScripts/serviceWorkerBootScript.js","./bootScripts/singleProcessBootScript":"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/bootScripts/singleProcessBootScript.js","./bootScripts/workerBootScript":"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/bootScripts/workerBootScript.js","./strategies/JSONSerialisationStrategy":"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/strategies/JSONSerialisationStrategy.js","./strategies/defaultNameService":"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/strategies/defaultNameService.js","./strategies/fakeCommunicationStrategy":"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/strategies/fakeCommunicationStrategy.js","psk-security-context":"psk-security-context"}],"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/strategies/JSONSerialisationStrategy.js":[function(require,module,exports){
function JSONSerialisationStrategy(){
     this.serialise = function(swarmInstance){

     }

    this.deserialise = function(jsonSerialisation){

    }
}

module.exports.createStrategy = function(...args){
    return new JSONSerialisationStrategy(...args);
}
},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/strategies/defaultNameService.js":[function(require,module,exports){
const ALL = "all";

function NameService(){
    let registry = {};

    let groups = {ALL:{}};

    this.getLocation = function(identity){
        return registry[identity];
    }

    this.registerLocation = function(identity, localtionObject, group){
        if(!groups[group]){
            groups[group] = {};
        }
        groups[group][identity] = identity;
        groups["ALL"][identity] = identity;
        registry[identity] = localtionObject;
    }

    this.asyncEnumerateGroupMembers = function(group, callback){
        if(!groups[group]) return;
        for(let g in groups[group]){
            callback(g);
        }
    }
}

module.exports.createStrategy = function(...args){
    return new NameService(...args);
}
},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarm-engine/strategies/fakeCommunicationStrategy.js":[function(require,module,exports){
function fakeCommunicationStrategy(nameService, serialisationStrategy){
    let self = this;

    this.sendSwarmMessage = function(swarmInstance, toIdentity){

    }

    this.broadcastMessage = function(swarmInstance, toSpecificGroup){
        nameService.asyncEnumerateGroupMembers(toSpecificGroup, function(identity){
            self.sendSwarmMessage(swarmInstance, identity);
        })
    }

    this.onPhaseReceived = function(callback){

    }

    this.enableSwarmExecution = function(callback){

    }

}

module.exports.createStrategy = function(nameService, serialisationStrategy){
    return new fakeCommunicationStrategy(nameService, serialisationStrategy);
}
},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/AsyncDispatcher.js":[function(require,module,exports){

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
            return callCallback();
		}
	}

	function dispatchEmpty(amount = 1) {
		started += amount;
	}

	function callCallback() {
	    if(errors && errors.length === 0) {
	        errors = undefined;
        }

	    if(results && results.length === 0) {
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
},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/Combos.js":[function(require,module,exports){
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
},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/OwM.js":[function(require,module,exports){
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
},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/Queue.js":[function(require,module,exports){
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
},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/SwarmPacker.js":[function(require,module,exports){
const HEADER_SIZE_RESEARVED = 4;

const msgpack = require('@msgpack/msgpack');

function SwarmPacker(){
}

function copyStringtoArrayBuffer(str, buffer){
    if(typeof str !== "string"){
        throw new Error("Wrong param type received");
    }
    for(var i = 0; i < str.length; i++) {
        buffer[i] = str.charCodeAt(i);
    }
    return buffer;
}

function copyFromBuffer(target, source){
    for(let i=0; i<source.length; i++){
        target[i] = source[i];
    }
    return target;
}

let serializers = {};

SwarmPacker.registerSerializer = function(name, implementation){
    if(serializers[name]){
        throw new Error("Serializer name already exists");
    }
    serializers[name] = implementation;
};

function getSerializer(name){
    return serializers[name];
}

SwarmPacker.getSerializer = getSerializer;

SwarmPacker.registerSerializer("json", {
    serialize: JSON.stringify,
    deserialize: (serialization)=>{
        if(typeof serialization !== "string"){
            let textDecoder = new TextDecoder();
            serialization = textDecoder.decode(serialization);
        }
        return JSON.parse(serialization);
    },
    getType: ()=>{
        return "json";
    }
});

SwarmPacker.registerSerializer("msgpack", {
    serialize: msgpack.encode,
    deserialize: msgpack.decode,
    getType: ()=>{
        return "msgpack";
    }
});

SwarmPacker.pack = function(swarm, serializer){

    let jsonSerializer = getSerializer("json");
    if(typeof serializer === "undefined"){
        serializer = jsonSerializer;
    }

    let swarmSerialization = serializer.serialize(swarm);

    let header = {
        command: swarm.getMeta("command"),
        swarmId : swarm.getMeta("swarmId"),
        swarmTypeName: swarm.getMeta("swarmTypeName"),
        swarmTarget: swarm.getMeta("target"),
        serializationType: serializer.getType()
    };

    header = serializer.serialize(header);

    if(header.length >= Math.pow(2, 32)){
        throw new Error("Swarm serialization too big.");
    }

    //arraybuffer construction
    let size = HEADER_SIZE_RESEARVED + header.length + swarmSerialization.length;
    let pack = new ArrayBuffer(size);

    let sizeHeaderView = new DataView(pack, 0);
    sizeHeaderView.setUint32(0, header.length);

    let headerView = new Uint8Array(pack, HEADER_SIZE_RESEARVED);
    copyStringtoArrayBuffer(header, headerView);

    let serializationView = new Uint8Array(pack, HEADER_SIZE_RESEARVED+header.length);
    if(typeof swarmSerialization === "string"){
        copyStringtoArrayBuffer(swarmSerialization, serializationView);
    }else{
        copyFromBuffer(serializationView, swarmSerialization);
    }

    return pack;
};

SwarmPacker.unpack = function(pack){
    let jsonSerialiser = SwarmPacker.getSerializer("json");
    let headerSerialization = getHeaderSerializationFromPack(pack);
    let header = jsonSerialiser.deserialize(headerSerialization);

    let serializer = SwarmPacker.getSerializer(header.serializationType);
    let messageView = new Uint8Array(pack, HEADER_SIZE_RESEARVED+headerSerialization.length);

    let swarm = serializer.deserialize(messageView);
    return swarm;
};

function getHeaderSerializationFromPack(pack){
    let headerSize = new DataView(pack).getUint32(0);

    let headerView = new Uint8Array(pack, HEADER_SIZE_RESEARVED, headerSize);
    return headerView;
}

SwarmPacker.getHeader = function(pack){
    let jsonSerialiser = SwarmPacker.getSerializer("json");
    let header = jsonSerialiser.deserialize(getHeaderSerializationFromPack(pack));

    return header;
};
module.exports = SwarmPacker;
},{"@msgpack/msgpack":"@msgpack/msgpack"}],"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/beesHealer.js":[function(require,module,exports){
const OwM = require("./OwM");

/*
    Prepare the state of a swarm to be serialised
*/

exports.asJSON = function(valueObj, phaseName, args, callback){

        let valueObject = valueObj.valueOf();
        let res = new OwM();
        res.publicVars          = valueObject.publicVars;
        res.privateVars         = valueObject.privateVars;

        res.setMeta("COMMAND_ARGS",        OwM.prototype.getMetaFrom(valueObject, "COMMAND_ARGS"));
        res.setMeta("SecurityParadigm",        OwM.prototype.getMetaFrom(valueObject, "SecurityParadigm"));
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
},{"./OwM":"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/OwM.js"}],"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/pskconsole.js":[function(require,module,exports){
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


},{}],"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/safe-uuid.js":[function(require,module,exports){

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
},{"crypto":"crypto"}],"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/uidGenerator.js":[function(require,module,exports){
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

},{"./Queue":"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/Queue.js","buffer":"buffer","crypto":"crypto"}],"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/array-set.js":[function(require,module,exports){
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

},{}],"@msgpack/msgpack":[function(require,module,exports){
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.MessagePack=t():e.MessagePack=t()}(this,function(){return function(e){var t={};function r(n){if(t[n])return t[n].exports;var i=t[n]={i:n,l:!1,exports:{}};return e[n].call(i.exports,i,i.exports,r),i.l=!0,i.exports}return r.m=e,r.c=t,r.d=function(e,t,n){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)r.d(n,i,function(t){return e[t]}.bind(null,i));return n},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="",r(r.s=0)}([function(e,t,r){"use strict";r.r(t);var n=function(e,t){var r="function"==typeof Symbol&&e[Symbol.iterator];if(!r)return e;var n,i,o=r.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(n=o.next()).done;)s.push(n.value)}catch(e){i={error:e}}finally{try{n&&!n.done&&(r=o.return)&&r.call(o)}finally{if(i)throw i.error}}return s},i=function(){for(var e=[],t=0;t<arguments.length;t++)e=e.concat(n(arguments[t]));return e},o="undefined"!=typeof TextEncoder&&"undefined"!=typeof TextDecoder;function s(e){for(var t=e.length,r=0,n=0;n<t;){var i=e.charCodeAt(n++);if(0!=(4294967168&i))if(0==(4294965248&i))r+=2;else{if(i>=55296&&i<=56319&&n<t){var o=e.charCodeAt(n);56320==(64512&o)&&(++n,i=((1023&i)<<10)+(1023&o)+65536)}r+=0==(4294901760&i)?3:4}else r++}return r}var a=o?new TextEncoder:void 0;var h=a&&a.encodeInto?function(e,t,r){a.encodeInto(e,t.subarray(r))}:function(e,t,r){t.set(a.encode(e),r)},u=65536;function c(e,t,r){for(var n=t,o=n+r,s=[],a="";n<o;){var h=e[n++];if(0==(128&h))s.push(h);else if(192==(224&h)){var c=63&e[n++];s.push((31&h)<<6|c)}else if(224==(240&h)){c=63&e[n++];var f=63&e[n++];s.push((31&h)<<12|c<<6|f)}else if(240==(248&h)){var l=(7&h)<<18|(c=63&e[n++])<<12|(f=63&e[n++])<<6|63&e[n++];l>65535&&(l-=65536,s.push(l>>>10&1023|55296),l=56320|1023&l),s.push(l)}else s.push(h);s.length-4>=u&&(a+=String.fromCharCode.apply(String,i(s)),s.length=0)}return s.length>0&&(a+=String.fromCharCode.apply(String,i(s))),a}var f=o?new TextDecoder:null;var l=function(e,t){this.type=e,this.data=t};function p(e,t,r){var n=Math.floor(r/4294967296),i=r;e.setUint32(t,n),e.setUint32(t+4,i)}function d(e,t){return 4294967296*e.getInt32(t)+e.getUint32(t+4)}var y=4294967295,w=17179869183;function v(e){var t=e.sec,r=e.nsec;if(t>=0&&r>=0&&t<=w){if(0===r&&t<=y){var n=new Uint8Array(4);return(s=new DataView(n.buffer)).setUint32(0,t),n}var i=t/4294967296,o=4294967295&t;n=new Uint8Array(8);return(s=new DataView(n.buffer)).setUint32(0,r<<2|3&i),s.setUint32(4,o),n}var s;n=new Uint8Array(12);return(s=new DataView(n.buffer)).setUint32(0,r),p(s,4,t),n}function g(e){var t=e.getTime(),r=Math.floor(t/1e3),n=1e6*(t-1e3*r),i=Math.floor(n/1e9);return{sec:r+i,nsec:n-1e9*i}}function b(e){return e instanceof Date?v(g(e)):null}function m(e){var t=new DataView(e.buffer,e.byteOffset,e.byteLength);switch(e.byteLength){case 4:return{sec:t.getUint32(0),nsec:0};case 8:var r=t.getUint32(0);return{sec:4294967296*(3&r)+t.getUint32(4),nsec:r>>>2};case 12:return{sec:d(t,4),nsec:t.getUint32(0)};default:throw new Error("Unrecognized data size for timestamp: "+e.length)}}function U(e){var t=m(e);return new Date(1e3*t.sec+t.nsec/1e6)}var x={type:-1,encode:b,decode:U},S=function(){function e(){this.builtInEncoders=[],this.builtInDecoders=[],this.encoders=[],this.decoders=[],this.register(x)}return e.prototype.register=function(e){var t=e.type,r=e.encode,n=e.decode;if(t>=0)this.encoders[t]=r,this.decoders[t]=n;else{var i=1+t;this.builtInEncoders[i]=r,this.builtInDecoders[i]=n}},e.prototype.tryToEncode=function(e){for(var t=0;t<this.builtInEncoders.length;t++){if(null!=(r=this.builtInEncoders[t]))if(null!=(n=r(e)))return new l(-1-t,n)}for(t=0;t<this.encoders.length;t++){var r,n;if(null!=(r=this.encoders[t]))if(null!=(n=r(e)))return new l(t,n)}return e instanceof l?e:null},e.prototype.decode=function(e,t){var r=t<0?this.builtInDecoders[-1-t]:this.decoders[t];return r?r(e,t):new l(t,e)},e.defaultCodec=new e,e}();function E(e){return e instanceof Uint8Array?e:ArrayBuffer.isView(e)?new Uint8Array(e.buffer,e.byteOffset,e.byteLength):e instanceof ArrayBuffer?new Uint8Array(e):Uint8Array.from(e)}var B=null,A=!!B;function L(e,t,r){var n=e.length,i=2*n,o=B.malloc(i);!function(e,t,r,n){for(var i=new DataView(B.memory.buffer,e,t),o=0;o<n;o++)i.setUint16(2*o,r.charCodeAt(o))}(o,i,e,n);var s=B.malloc(5+4*n);try{var a=B.utf8EncodeUint16Array(s,o,n);return t.set(new Uint8Array(B.memory.buffer,s,a),r),a}finally{B.free(o),B.free(s)}}var I=65536;function T(e,t,r){var n,i,o,s=B.malloc(r),a=B.malloc(2*r);try{n=s,i=e.subarray(t,t+r),o=r,new Uint8Array(B.memory.buffer,n,o).set(i);var h=B.utf8DecodeToUint16Array(a,s,r);return function(e){if(e.length<=I)return String.fromCharCode.apply(String,e);for(var t="",r=0;r<e.length;r++){var n=e.subarray(r*I,(r+1)*I);t+=String.fromCharCode.apply(String,n)}return t}(new Uint16Array(B.memory.buffer,a,h))}finally{B.free(s),B.free(a)}}var k=function(e){var t="function"==typeof Symbol&&e[Symbol.iterator],r=0;return t?t.call(e):{next:function(){return e&&r>=e.length&&(e=void 0),{value:e&&e[r++],done:!e}}}},M=100,z=2048,C=function(){function e(e,t,r,n,i){void 0===e&&(e=S.defaultCodec),void 0===t&&(t=M),void 0===r&&(r=z),void 0===n&&(n=!1),void 0===i&&(i=!1),this.extensionCodec=e,this.maxDepth=t,this.initialBufferSize=r,this.sortKeys=n,this.forceFloat32=i,this.pos=0,this.view=new DataView(new ArrayBuffer(this.initialBufferSize)),this.bytes=new Uint8Array(this.view.buffer)}return e.prototype.encode=function(e,t){if(t>this.maxDepth)throw new Error("Too deep objects in depth "+t);null==e?this.encodeNil():"boolean"==typeof e?this.encodeBoolean(e):"number"==typeof e?this.encodeNumber(e):"string"==typeof e?this.encodeString(e):this.encodeObject(e,t)},e.prototype.getUint8Array=function(){return this.bytes.subarray(0,this.pos)},e.prototype.ensureBufferSizeToWrite=function(e){var t=this.pos+e;this.view.byteLength<t&&this.resizeBuffer(2*t)},e.prototype.resizeBuffer=function(e){var t=new ArrayBuffer(e),r=new Uint8Array(t),n=new DataView(t);r.set(this.bytes),this.view=n,this.bytes=r},e.prototype.encodeNil=function(){this.writeU8(192)},e.prototype.encodeBoolean=function(e){!1===e?this.writeU8(194):this.writeU8(195)},e.prototype.encodeNumber=function(e){Number.isSafeInteger(e)?e>=0?e<128?this.writeU8(e):e<256?(this.writeU8(204),this.writeU8(e)):e<65536?(this.writeU8(205),this.writeU16(e)):e<4294967296?(this.writeU8(206),this.writeU32(e)):(this.writeU8(207),this.writeU64(e)):e>=-32?this.writeU8(224|e+32):e>=-128?(this.writeU8(208),this.writeI8(e)):e>=-32768?(this.writeU8(209),this.writeI16(e)):e>=-2147483648?(this.writeU8(210),this.writeI32(e)):(this.writeU8(211),this.writeI64(e)):this.forceFloat32?(this.writeU8(202),this.writeF32(e)):(this.writeU8(203),this.writeF64(e))},e.prototype.writeStringHeader=function(e){if(e<32)this.writeU8(160+e);else if(e<256)this.writeU8(217),this.writeU8(e);else if(e<65536)this.writeU8(218),this.writeU16(e);else{if(!(e<4294967296))throw new Error("Too long string: "+e+" bytes in UTF-8");this.writeU8(219),this.writeU32(e)}},e.prototype.encodeString=function(e){var t=e.length;if(o&&t>200){var r=s(e);this.ensureBufferSizeToWrite(5+r),this.writeStringHeader(r),h(e,this.bytes,this.pos),this.pos+=r}else{if(A&&t>1024){var n=5+4*t;this.ensureBufferSizeToWrite(n);var i=L(e,this.bytes,this.pos);return void(this.pos+=i)}r=s(e);this.ensureBufferSizeToWrite(5+r),this.writeStringHeader(r),function(e,t,r){for(var n=e.length,i=r,o=0;o<n;){var s=e.charCodeAt(o++);if(0!=(4294967168&s)){if(0==(4294965248&s))t[i++]=s>>6&31|192;else{if(s>=55296&&s<=56319&&o<n){var a=e.charCodeAt(o);56320==(64512&a)&&(++o,s=((1023&s)<<10)+(1023&a)+65536)}0==(4294901760&s)?(t[i++]=s>>12&15|224,t[i++]=s>>6&63|128):(t[i++]=s>>18&7|240,t[i++]=s>>12&63|128,t[i++]=s>>6&63|128)}t[i++]=63&s|128}else t[i++]=s}}(e,this.bytes,this.pos),this.pos+=r}},e.prototype.encodeObject=function(e,t){var r=this.extensionCodec.tryToEncode(e);if(null!=r)this.encodeExtension(r);else if(Array.isArray(e))this.encodeArray(e,t);else if(ArrayBuffer.isView(e))this.encodeBinary(e);else{if("object"!=typeof e)throw new Error("Unrecognized object: "+Object.prototype.toString.apply(e));this.encodeMap(e,t)}},e.prototype.encodeBinary=function(e){var t=e.byteLength;if(t<256)this.writeU8(196),this.writeU8(t);else if(t<65536)this.writeU8(197),this.writeU16(t);else{if(!(t<4294967296))throw new Error("Too large binary: "+t);this.writeU8(198),this.writeU32(t)}var r=E(e);this.writeU8a(r)},e.prototype.encodeArray=function(e,t){var r,n,i=e.length;if(i<16)this.writeU8(144+i);else if(i<65536)this.writeU8(220),this.writeU16(i);else{if(!(i<4294967296))throw new Error("Too large array: "+i);this.writeU8(221),this.writeU32(i)}try{for(var o=k(e),s=o.next();!s.done;s=o.next()){var a=s.value;this.encode(a,t+1)}}catch(e){r={error:e}}finally{try{s&&!s.done&&(n=o.return)&&n.call(o)}finally{if(r)throw r.error}}},e.prototype.encodeMap=function(e,t){var r=Object.keys(e);this.sortKeys&&r.sort();var n=r.length;if(n<16)this.writeU8(128+n);else if(n<65536)this.writeU8(222),this.writeU16(n);else{if(!(n<4294967296))throw new Error("Too large map object: "+n);this.writeU8(223),this.writeU32(n)}for(var i=0;i<n;i++){var o=r[i];this.encodeString(o),this.encode(e[o],t+1)}},e.prototype.encodeExtension=function(e){var t=e.data.length;if(1===t)this.writeU8(212);else if(2===t)this.writeU8(213);else if(4===t)this.writeU8(214);else if(8===t)this.writeU8(215);else if(16===t)this.writeU8(216);else if(t<256)this.writeU8(199),this.writeU8(t);else if(t<65536)this.writeU8(200),this.writeU16(t);else{if(!(t<4294967296))throw new Error("Too large extension object: "+t);this.writeU8(201),this.writeU32(t)}this.writeI8(e.type),this.writeU8a(e.data)},e.prototype.writeU8=function(e){this.ensureBufferSizeToWrite(1),this.view.setUint8(this.pos,e),this.pos++},e.prototype.writeU8a=function(e){var t=e.length;this.ensureBufferSizeToWrite(t),this.bytes.set(e,this.pos),this.pos+=t},e.prototype.writeI8=function(e){this.ensureBufferSizeToWrite(1),this.view.setInt8(this.pos,e),this.pos++},e.prototype.writeU16=function(e){this.ensureBufferSizeToWrite(2),this.view.setUint16(this.pos,e),this.pos+=2},e.prototype.writeI16=function(e){this.ensureBufferSizeToWrite(2),this.view.setInt16(this.pos,e),this.pos+=2},e.prototype.writeU32=function(e){this.ensureBufferSizeToWrite(4),this.view.setUint32(this.pos,e),this.pos+=4},e.prototype.writeI32=function(e){this.ensureBufferSizeToWrite(4),this.view.setInt32(this.pos,e),this.pos+=4},e.prototype.writeF32=function(e){this.ensureBufferSizeToWrite(4),this.view.setFloat32(this.pos,e),this.pos+=4},e.prototype.writeF64=function(e){this.ensureBufferSizeToWrite(8),this.view.setFloat64(this.pos,e),this.pos+=8},e.prototype.writeU64=function(e){this.ensureBufferSizeToWrite(8),function(e,t,r){var n=r/4294967296,i=r;e.setUint32(t,n),e.setUint32(t+4,i)}(this.view,this.pos,e),this.pos+=8},e.prototype.writeI64=function(e){this.ensureBufferSizeToWrite(8),p(this.view,this.pos,e),this.pos+=8},e}(),D={};function P(e,t){void 0===t&&(t=D);var r=new C(t.extensionCodec,t.maxDepth,t.initialBufferSize,t.sortKeys,t.forceFloat32);return r.encode(e,1),r.getUint8Array()}function j(e){return(e<0?"-":"")+"0x"+Math.abs(e).toString(16).padStart(2,"0")}var F=16,W=16,O=function(){function e(e,t){void 0===e&&(e=F),void 0===t&&(t=W),this.maxKeyLength=e,this.maxLengthPerKey=t,this.caches=[];for(var r=0;r<this.maxKeyLength;r++)this.caches.push([])}return e.prototype.canBeCached=function(e){return e>0&&e<=this.maxKeyLength},e.prototype.get=function(e,t,r){var n=this.caches[r-1],i=n.length;e:for(var o=0;o<i;o++){for(var s=n[o],a=s.bytes,h=0;h<r;h++)if(a[h]!==e[t+h])continue e;return s.value}return null},e.prototype.store=function(e,t){var r=this.caches[e.length-1],n={bytes:e,value:t};r.length>=this.maxLengthPerKey?r[Math.random()*r.length|0]=n:r.push(n)},e.prototype.decode=function(e,t,r){var n=this.get(e,t,r);if(n)return n;var i=c(e,t,r),o=Uint8Array.prototype.slice.call(e,t,t+r);return this.store(o,i),i},e}(),_=function(e,t,r,n){return new(r||(r=Promise))(function(i,o){function s(e){try{h(n.next(e))}catch(e){o(e)}}function a(e){try{h(n.throw(e))}catch(e){o(e)}}function h(e){e.done?i(e.value):new r(function(t){t(e.value)}).then(s,a)}h((n=n.apply(e,t||[])).next())})},K=function(e,t){var r,n,i,o,s={label:0,sent:function(){if(1&i[0])throw i[1];return i[1]},trys:[],ops:[]};return o={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(o[Symbol.iterator]=function(){return this}),o;function a(o){return function(a){return function(o){if(r)throw new TypeError("Generator is already executing.");for(;s;)try{if(r=1,n&&(i=2&o[0]?n.return:o[0]?n.throw||((i=n.return)&&i.call(n),0):n.next)&&!(i=i.call(n,o[1])).done)return i;switch(n=0,i&&(o=[2&o[0],i.value]),o[0]){case 0:case 1:i=o;break;case 4:return s.label++,{value:o[1],done:!1};case 5:s.label++,n=o[1],o=[0];continue;case 7:o=s.ops.pop(),s.trys.pop();continue;default:if(!(i=(i=s.trys).length>0&&i[i.length-1])&&(6===o[0]||2===o[0])){s=0;continue}if(3===o[0]&&(!i||o[1]>i[0]&&o[1]<i[3])){s.label=o[1];break}if(6===o[0]&&s.label<i[1]){s.label=i[1],i=o;break}if(i&&s.label<i[2]){s.label=i[2],s.ops.push(o);break}i[2]&&s.ops.pop(),s.trys.pop();continue}o=t.call(e,s)}catch(e){o=[6,e],n=0}finally{r=i=0}if(5&o[0])throw o[1];return{value:o[0]?o[1]:void 0,done:!0}}([o,a])}}},V=function(e){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var t,r=e[Symbol.asyncIterator];return r?r.call(e):(e="function"==typeof __values?__values(e):e[Symbol.iterator](),t={},n("next"),n("throw"),n("return"),t[Symbol.asyncIterator]=function(){return this},t);function n(r){t[r]=e[r]&&function(t){return new Promise(function(n,i){(function(e,t,r,n){Promise.resolve(n).then(function(t){e({value:t,done:r})},t)})(n,i,(t=e[r](t)).done,t.value)})}}},N=function(e){return this instanceof N?(this.v=e,this):new N(e)},R=function(e,t,r){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var n,i=r.apply(e,t||[]),o=[];return n={},s("next"),s("throw"),s("return"),n[Symbol.asyncIterator]=function(){return this},n;function s(e){i[e]&&(n[e]=function(t){return new Promise(function(r,n){o.push([e,t,r,n])>1||a(e,t)})})}function a(e,t){try{(r=i[e](t)).value instanceof N?Promise.resolve(r.value.v).then(h,u):c(o[0][2],r)}catch(e){c(o[0][3],e)}var r}function h(e){a("next",e)}function u(e){a("throw",e)}function c(e,t){e(t),o.shift(),o.length&&a(o[0][0],o[0][1])}},H=-1,G=new DataView(new ArrayBuffer(0)),X=new Uint8Array(G.buffer),q=function(){try{G.getInt8(0)}catch(e){return e.constructor}throw new Error("never reached")}(),J=new q("Insufficient data"),Q=4294967295,Y=new O,Z=function(){function e(e,t,r,n,i,o){void 0===e&&(e=S.defaultCodec),void 0===t&&(t=Q),void 0===r&&(r=Q),void 0===n&&(n=Q),void 0===i&&(i=Q),void 0===o&&(o=Q),this.extensionCodec=e,this.maxStrLength=t,this.maxBinLength=r,this.maxArrayLength=n,this.maxMapLength=i,this.maxExtLength=o,this.totalPos=0,this.pos=0,this.view=G,this.bytes=X,this.headByte=H,this.stack=[],this.cachedKeyDecoder=Y}return e.prototype.setBuffer=function(e){this.bytes=E(e),this.view=function(e){if(e instanceof ArrayBuffer)return new DataView(e);var t=E(e);return new DataView(t.buffer,t.byteOffset,t.byteLength)}(this.bytes),this.pos=0},e.prototype.appendBuffer=function(e){if(this.headByte!==H||this.hasRemaining()){var t=this.bytes.subarray(this.pos),r=E(e),n=new Uint8Array(t.length+r.length);n.set(t),n.set(r,t.length),this.setBuffer(n)}else this.setBuffer(e)},e.prototype.hasRemaining=function(e){return void 0===e&&(e=1),this.view.byteLength-this.pos>=e},e.prototype.createNoExtraBytesError=function(e){var t=this.view,r=this.pos;return new RangeError("Extra "+(t.byteLength-r)+" byte(s) found at buffer["+e+"]")},e.prototype.decodeSingleSync=function(){var e=this.decodeSync();if(this.hasRemaining())throw this.createNoExtraBytesError(this.pos);return e},e.prototype.decodeSingleAsync=function(e){var t,r,n,i;return _(this,void 0,void 0,function(){var o,s,a,h,u,c,f,l;return K(this,function(p){switch(p.label){case 0:o=!1,p.label=1;case 1:p.trys.push([1,6,7,12]),t=V(e),p.label=2;case 2:return[4,t.next()];case 3:if((r=p.sent()).done)return[3,5];if(a=r.value,o)throw this.createNoExtraBytesError(this.totalPos);this.appendBuffer(a);try{s=this.decodeSync(),o=!0}catch(e){if(!(e instanceof q))throw e}this.totalPos+=this.pos,p.label=4;case 4:return[3,2];case 5:return[3,12];case 6:return h=p.sent(),n={error:h},[3,12];case 7:return p.trys.push([7,,10,11]),r&&!r.done&&(i=t.return)?[4,i.call(t)]:[3,9];case 8:p.sent(),p.label=9;case 9:return[3,11];case 10:if(n)throw n.error;return[7];case 11:return[7];case 12:if(o){if(this.hasRemaining())throw this.createNoExtraBytesError(this.totalPos);return[2,s]}throw c=(u=this).headByte,f=u.pos,l=u.totalPos,new RangeError("Insufficient data in parcing "+j(c)+" at "+l+" ("+f+" in the current buffer)")}})})},e.prototype.decodeArrayStream=function(e){return this.decodeMultiAsync(e,!0)},e.prototype.decodeStream=function(e){return this.decodeMultiAsync(e,!1)},e.prototype.decodeMultiAsync=function(e,t){return R(this,arguments,function(){var r,n,i,o,s,a,h,u,c;return K(this,function(f){switch(f.label){case 0:r=t,n=-1,f.label=1;case 1:f.trys.push([1,13,14,19]),i=V(e),f.label=2;case 2:return[4,N(i.next())];case 3:if((o=f.sent()).done)return[3,12];if(s=o.value,t&&0===n)throw this.createNoExtraBytesError(this.totalPos);this.appendBuffer(s),r&&(n=this.readArraySize(),r=!1,this.complete()),f.label=4;case 4:f.trys.push([4,9,,10]),f.label=5;case 5:return[4,N(this.decodeSync())];case 6:return[4,f.sent()];case 7:return f.sent(),0==--n?[3,8]:[3,5];case 8:return[3,10];case 9:if(!((a=f.sent())instanceof q))throw a;return[3,10];case 10:this.totalPos+=this.pos,f.label=11;case 11:return[3,2];case 12:return[3,19];case 13:return h=f.sent(),u={error:h},[3,19];case 14:return f.trys.push([14,,17,18]),o&&!o.done&&(c=i.return)?[4,N(c.call(i))]:[3,16];case 15:f.sent(),f.label=16;case 16:return[3,18];case 17:if(u)throw u.error;return[7];case 18:return[7];case 19:return[2]}})})},e.prototype.decodeSync=function(){e:for(;;){var e=this.readHeadByte(),t=void 0;if(e>=224)t=e-256;else if(e<192)if(e<128)t=e;else if(e<144){if(0!==(n=e-128)){this.pushMapState(n),this.complete();continue e}t={}}else if(e<160){if(0!==(n=e-144)){this.pushArrayState(n),this.complete();continue e}t=[]}else{var r=e-160;t=this.decodeUtf8String(r,0)}else if(192===e)t=null;else if(194===e)t=!1;else if(195===e)t=!0;else if(202===e)t=this.readF32();else if(203===e)t=this.readF64();else if(204===e)t=this.readU8();else if(205===e)t=this.readU16();else if(206===e)t=this.readU32();else if(207===e)t=this.readU64();else if(208===e)t=this.readI8();else if(209===e)t=this.readI16();else if(210===e)t=this.readI32();else if(211===e)t=this.readI64();else if(217===e){r=this.lookU8();t=this.decodeUtf8String(r,1)}else if(218===e){r=this.lookU16();t=this.decodeUtf8String(r,2)}else if(219===e){r=this.lookU32();t=this.decodeUtf8String(r,4)}else if(220===e){if(0!==(n=this.readU16())){this.pushArrayState(n),this.complete();continue e}t=[]}else if(221===e){if(0!==(n=this.readU32())){this.pushArrayState(n),this.complete();continue e}t=[]}else if(222===e){if(0!==(n=this.readU16())){this.pushMapState(n),this.complete();continue e}t={}}else if(223===e){if(0!==(n=this.readU32())){this.pushMapState(n),this.complete();continue e}t={}}else if(196===e){var n=this.lookU8();t=this.decodeBinary(n,1)}else if(197===e){n=this.lookU16();t=this.decodeBinary(n,2)}else if(198===e){n=this.lookU32();t=this.decodeBinary(n,4)}else if(212===e)t=this.decodeExtension(1,0);else if(213===e)t=this.decodeExtension(2,0);else if(214===e)t=this.decodeExtension(4,0);else if(215===e)t=this.decodeExtension(8,0);else if(216===e)t=this.decodeExtension(16,0);else if(199===e){n=this.lookU8();t=this.decodeExtension(n,1)}else if(200===e){n=this.lookU16();t=this.decodeExtension(n,2)}else{if(201!==e)throw new Error("Unrecognized type byte: "+j(e));n=this.lookU32();t=this.decodeExtension(n,4)}this.complete();for(var i=this.stack;i.length>0;){var o=i[i.length-1];if(0===o.type){if(o.array[o.position]=t,o.position++,o.position!==o.size)continue e;i.pop(),t=o.array}else{if(1===o.type){if("string"!=typeof t)throw new Error("The type of key must be string but "+typeof t);o.key=t,o.type=2;continue e}if(2===o.type){if(o.map[o.key]=t,o.readCount++,o.readCount!==o.size){o.key=null,o.type=1;continue e}i.pop(),t=o.map}}}return t}},e.prototype.readHeadByte=function(){return this.headByte===H&&(this.headByte=this.readU8()),this.headByte},e.prototype.complete=function(){this.headByte=H},e.prototype.readArraySize=function(){var e=this.readHeadByte();switch(e){case 220:return this.readU16();case 221:return this.readU32();default:if(e<160)return e-144;throw new Error("Unrecognized array type byte: "+j(e))}},e.prototype.pushMapState=function(e){if(e>this.maxMapLength)throw new Error("Max length exceeded: map length ("+e+") > maxMapLengthLength ("+this.maxMapLength+")");this.stack.push({type:1,size:e,key:null,readCount:0,map:{}})},e.prototype.pushArrayState=function(e){if(e>this.maxArrayLength)throw new Error("Max length exceeded: array length ("+e+") > maxArrayLength ("+this.maxArrayLength+")");this.stack.push({type:0,size:e,array:new Array(e),position:0})},e.prototype.decodeUtf8String=function(e,t){if(e>this.maxStrLength)throw new Error("Max length exceeded: UTF-8 byte length ("+e+") > maxStrLength ("+this.maxStrLength+")");if(this.bytes.byteLength<this.pos+t+e)throw J;var r,n=this.pos+t;return r=this.stateIsMapKey()&&this.cachedKeyDecoder.canBeCached(e)?this.cachedKeyDecoder.decode(this.bytes,n,e):o&&e>200?function(e,t,r){var n=e.subarray(t,t+r);return f.decode(n)}(this.bytes,n,e):A&&e>1024?T(this.bytes,n,e):c(this.bytes,n,e),this.pos+=t+e,r},e.prototype.stateIsMapKey=function(){return this.stack.length>0&&1===this.stack[this.stack.length-1].type},e.prototype.decodeBinary=function(e,t){if(e>this.maxBinLength)throw new Error("Max length exceeded: bin length ("+e+") > maxBinLength ("+this.maxBinLength+")");if(!this.hasRemaining(e+t))throw J;var r=this.pos+t,n=this.bytes.subarray(r,r+e);return this.pos+=t+e,n},e.prototype.decodeExtension=function(e,t){if(e>this.maxExtLength)throw new Error("Max length exceeded: ext length ("+e+") > maxExtLength ("+this.maxExtLength+")");var r=this.view.getInt8(this.pos+t),n=this.decodeBinary(e,t+1);return this.extensionCodec.decode(n,r)},e.prototype.lookU8=function(){return this.view.getUint8(this.pos)},e.prototype.lookU16=function(){return this.view.getUint16(this.pos)},e.prototype.lookU32=function(){return this.view.getUint32(this.pos)},e.prototype.readU8=function(){var e=this.view.getUint8(this.pos);return this.pos++,e},e.prototype.readI8=function(){var e=this.view.getInt8(this.pos);return this.pos++,e},e.prototype.readU16=function(){var e=this.view.getUint16(this.pos);return this.pos+=2,e},e.prototype.readI16=function(){var e=this.view.getInt16(this.pos);return this.pos+=2,e},e.prototype.readU32=function(){var e=this.view.getUint32(this.pos);return this.pos+=4,e},e.prototype.readI32=function(){var e=this.view.getInt32(this.pos);return this.pos+=4,e},e.prototype.readU64=function(){var e,t,r=(e=this.view,t=this.pos,4294967296*e.getUint32(t)+e.getUint32(t+4));return this.pos+=8,r},e.prototype.readI64=function(){var e=d(this.view,this.pos);return this.pos+=8,e},e.prototype.readF32=function(){var e=this.view.getFloat32(this.pos);return this.pos+=4,e},e.prototype.readF64=function(){var e=this.view.getFloat64(this.pos);return this.pos+=8,e},e}(),$={};function ee(e,t){void 0===t&&(t=$);var r=new Z(t.extensionCodec,t.maxStrLength,t.maxBinLength,t.maxArrayLength,t.maxMapLength,t.maxExtLength);return r.setBuffer(e),r.decodeSingleSync()}var te=function(e,t){var r,n,i,o,s={label:0,sent:function(){if(1&i[0])throw i[1];return i[1]},trys:[],ops:[]};return o={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(o[Symbol.iterator]=function(){return this}),o;function a(o){return function(a){return function(o){if(r)throw new TypeError("Generator is already executing.");for(;s;)try{if(r=1,n&&(i=2&o[0]?n.return:o[0]?n.throw||((i=n.return)&&i.call(n),0):n.next)&&!(i=i.call(n,o[1])).done)return i;switch(n=0,i&&(o=[2&o[0],i.value]),o[0]){case 0:case 1:i=o;break;case 4:return s.label++,{value:o[1],done:!1};case 5:s.label++,n=o[1],o=[0];continue;case 7:o=s.ops.pop(),s.trys.pop();continue;default:if(!(i=(i=s.trys).length>0&&i[i.length-1])&&(6===o[0]||2===o[0])){s=0;continue}if(3===o[0]&&(!i||o[1]>i[0]&&o[1]<i[3])){s.label=o[1];break}if(6===o[0]&&s.label<i[1]){s.label=i[1],i=o;break}if(i&&s.label<i[2]){s.label=i[2],s.ops.push(o);break}i[2]&&s.ops.pop(),s.trys.pop();continue}o=t.call(e,s)}catch(e){o=[6,e],n=0}finally{r=i=0}if(5&o[0])throw o[1];return{value:o[0]?o[1]:void 0,done:!0}}([o,a])}}},re=function(e){return this instanceof re?(this.v=e,this):new re(e)},ne=function(e,t,r){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var n,i=r.apply(e,t||[]),o=[];return n={},s("next"),s("throw"),s("return"),n[Symbol.asyncIterator]=function(){return this},n;function s(e){i[e]&&(n[e]=function(t){return new Promise(function(r,n){o.push([e,t,r,n])>1||a(e,t)})})}function a(e,t){try{(r=i[e](t)).value instanceof re?Promise.resolve(r.value.v).then(h,u):c(o[0][2],r)}catch(e){c(o[0][3],e)}var r}function h(e){a("next",e)}function u(e){a("throw",e)}function c(e,t){e(t),o.shift(),o.length&&a(o[0][0],o[0][1])}};function ie(e){return null!=e[Symbol.asyncIterator]?e:function(e){return ne(this,arguments,function(){var t,r,n,i;return te(this,function(o){switch(o.label){case 0:t=e.getReader(),o.label=1;case 1:o.trys.push([1,,9,10]),o.label=2;case 2:return[4,re(t.read())];case 3:return r=o.sent(),n=r.done,i=r.value,n?[4,re(void 0)]:[3,5];case 4:return[2,o.sent()];case 5:return[4,re(i)];case 6:return[4,o.sent()];case 7:return o.sent(),[3,2];case 8:return[3,10];case 9:return t.releaseLock(),[7];case 10:return[2]}})})}(e)}var oe=function(e,t,r,n){return new(r||(r=Promise))(function(i,o){function s(e){try{h(n.next(e))}catch(e){o(e)}}function a(e){try{h(n.throw(e))}catch(e){o(e)}}function h(e){e.done?i(e.value):new r(function(t){t(e.value)}).then(s,a)}h((n=n.apply(e,t||[])).next())})},se=function(e,t){var r,n,i,o,s={label:0,sent:function(){if(1&i[0])throw i[1];return i[1]},trys:[],ops:[]};return o={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(o[Symbol.iterator]=function(){return this}),o;function a(o){return function(a){return function(o){if(r)throw new TypeError("Generator is already executing.");for(;s;)try{if(r=1,n&&(i=2&o[0]?n.return:o[0]?n.throw||((i=n.return)&&i.call(n),0):n.next)&&!(i=i.call(n,o[1])).done)return i;switch(n=0,i&&(o=[2&o[0],i.value]),o[0]){case 0:case 1:i=o;break;case 4:return s.label++,{value:o[1],done:!1};case 5:s.label++,n=o[1],o=[0];continue;case 7:o=s.ops.pop(),s.trys.pop();continue;default:if(!(i=(i=s.trys).length>0&&i[i.length-1])&&(6===o[0]||2===o[0])){s=0;continue}if(3===o[0]&&(!i||o[1]>i[0]&&o[1]<i[3])){s.label=o[1];break}if(6===o[0]&&s.label<i[1]){s.label=i[1],i=o;break}if(i&&s.label<i[2]){s.label=i[2],s.ops.push(o);break}i[2]&&s.ops.pop(),s.trys.pop();continue}o=t.call(e,s)}catch(e){o=[6,e],n=0}finally{r=i=0}if(5&o[0])throw o[1];return{value:o[0]?o[1]:void 0,done:!0}}([o,a])}}};function ae(e,t){return void 0===t&&(t=$),oe(this,void 0,void 0,function(){var r;return se(this,function(n){return r=ie(e),[2,new Z(t.extensionCodec,t.maxStrLength,t.maxBinLength,t.maxArrayLength,t.maxMapLength,t.maxExtLength).decodeSingleAsync(r)]})})}function he(e,t){void 0===t&&(t=$);var r=ie(e);return new Z(t.extensionCodec,t.maxStrLength,t.maxBinLength,t.maxArrayLength,t.maxMapLength,t.maxExtLength).decodeArrayStream(r)}function ue(e,t){void 0===t&&(t=$);var r=ie(e);return new Z(t.extensionCodec,t.maxStrLength,t.maxBinLength,t.maxArrayLength,t.maxMapLength,t.maxExtLength).decodeStream(r)}r.d(t,"encode",function(){return P}),r.d(t,"decode",function(){return ee}),r.d(t,"decodeAsync",function(){return ae}),r.d(t,"decodeArrayStream",function(){return he}),r.d(t,"decodeStream",function(){return ue}),r.d(t,"Decoder",function(){return Z}),r.d(t,"Encoder",function(){return C}),r.d(t,"ExtensionCodec",function(){return S}),r.d(t,"ExtData",function(){return l}),r.d(t,"EXT_TIMESTAMP",function(){return-1}),r.d(t,"encodeDateToTimeSpec",function(){return g}),r.d(t,"encodeTimeSpecToTimestamp",function(){return v}),r.d(t,"decodeTimestampToTimeSpec",function(){return m}),r.d(t,"encodeTimestampExtension",function(){return b}),r.d(t,"decodeTimestampExtension",function(){return U}),r.d(t,"__WASM_AVAILABLE",function(){return A})}])});

},{}],"buffer-from":[function(require,module,exports){
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

},{"buffer":"buffer"}],"callflow":[function(require,module,exports){

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


$$.__intern = {
        mkArgs:function(args,pos){
            var argsArray = [];
            for(var i = pos; i < args.length; i++){
                argsArray.push(args[i]);
            }
            return argsArray;
        }
    };


$$.defaultErrorHandlingImplementation = defaultErrorHandlingImplementation;

var callflowModule = require("./lib/swarmDescription");
$$.callflows        = callflowModule.createSwarmEngine("callflow");
$$.callflow         = $$.callflows;
$$.flow             = $$.callflows;
$$.flows            = $$.callflows;


$$.PSK_PubSub = require("soundpubsub").soundPubSub;

$$.securityContext = null;
$$.HRN_securityContext = "unnamedSecurityContext"; /*HRN: Human Readable Name */
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


$$.pathNormalize = function (pathToNormalize) {
    const path = require("path");
    pathToNormalize = path.normalize(pathToNormalize);

    return pathToNormalize.replace(/[\/\\]/g, path.sep);
};

// add interceptors

const crypto = require('crypto');

$$.interceptor.register('*', '*', 'before', function () {
    const swarmTypeName = this.getMetadata('swarmTypeName');
    const phaseName = this.getMetadata('phaseName');
    const swarmId = this.getMetadata('swarmId');
    const executionId = crypto.randomBytes(16).toString('hex');

    this.setMetadata('executionId', executionId);

    $$.event('swarm.call', {swarmTypeName, phaseName, swarmId});
});


module.exports = {
    				createSwarmEngine: require("./lib/swarmDescription").createSwarmEngine,
                    createJoinPoint: require("./lib/parallelJoinPoint").createJoinPoint,
                    createSerialJoinPoint: require("./lib/serialJoinPoint").createSerialJoinPoint,
                    createStandardAPIsForSwarms:require("./lib/utilityFunctions/base").createForObject
				};


require("../choreo");
},{"../choreo":"/opt/new_swarm_engine_release/privatesky/modules/choreo/index.js","./constants":"/opt/new_swarm_engine_release/privatesky/modules/callflow/constants.js","./lib/InterceptorRegistry":"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/InterceptorRegistry.js","./lib/loadLibrary":"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/loadLibrary.js","./lib/overwriteRequire":"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/overwriteRequire.js","./lib/parallelJoinPoint":"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/parallelJoinPoint.js","./lib/serialJoinPoint":"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/serialJoinPoint.js","./lib/swarmDescription":"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/swarmDescription.js","./lib/utilityFunctions/base":"/opt/new_swarm_engine_release/privatesky/modules/callflow/lib/utilityFunctions/base.js","crypto":"crypto","path":"path","soundpubsub":"soundpubsub"}],"dicontainer":[function(require,module,exports){
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
},{}],"foldermq":[function(require,module,exports){
module.exports = {
					createQue: require("./lib/folderMQ").getFolderQueue
					//folderMQ: require("./lib/folderMQ")
};
},{"./lib/folderMQ":"/opt/new_swarm_engine_release/privatesky/modules/foldermq/lib/folderMQ.js"}],"launcher":[function(require,module,exports){
//console.log(require.resolve("./components.js"));
module.exports = $$.library(function(){
	require("./components.js");
	/*require("./mkDirRec.js");*/
})
},{"./components.js":"/opt/new_swarm_engine_release/privatesky/libraries/launcher/components.js"}],"psk-security-context":[function(require,module,exports){
const RawCSBSecurityContext = require("./lib/RawCSBSecurityContext");
const RootCSBSecurityContext = require("./lib/RootCSBSecurityContext");
const SecurityContext = require("./lib/SecurityContext");
const EncryptedSecret = require("./lib/EncryptedSecret");
const PSKSignature = require("./lib/PSKSignature");

module.exports.createSecurityContext = (securityContextType, ...args) => {
    switch (securityContextType) {
        case "RootCSBSecurityContext":
            return new RootCSBSecurityContext(...args);
        case "RawCSBSecurityContext":
            return new RawCSBSecurityContext(...args);
        default:
            return new SecurityContext(...args);
    }
};

module.exports.createEncryptedSecret = (serializedEncryptedSecret) => {
    return new EncryptedSecret(serializedEncryptedSecret);
};


module.exports.createPSKSignature = (serializedPSKSignature) => {
    return new PSKSignature(serializedPSKSignature);
};

},{"./lib/EncryptedSecret":"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/EncryptedSecret.js","./lib/PSKSignature":"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/PSKSignature.js","./lib/RawCSBSecurityContext":"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/RawCSBSecurityContext.js","./lib/RootCSBSecurityContext":"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/RootCSBSecurityContext.js","./lib/SecurityContext":"/opt/new_swarm_engine_release/privatesky/modules/psk-security-context/lib/SecurityContext.js"}],"pskbuffer":[function(require,module,exports){
const PSKBuffer = require('./lib/PSKBuffer');

module.exports = PSKBuffer;

},{"./lib/PSKBuffer":"/opt/new_swarm_engine_release/privatesky/modules/pskbuffer/lib/PSKBuffer.js"}],"pskcrypto":[function(require,module,exports){
const PskCrypto = require("./lib/PskCrypto");
const ssutil = require("./signsensusDS/ssutil");

module.exports = PskCrypto;

module.exports.hashValues = ssutil.hashValues;

module.exports.DuplexStream = require("./lib/utils/DuplexStream");

module.exports.isStream = require("./lib/utils/isStream");
},{"./lib/PskCrypto":"/opt/new_swarm_engine_release/privatesky/modules/pskcrypto/lib/PskCrypto.js","./lib/utils/DuplexStream":"/opt/new_swarm_engine_release/privatesky/modules/pskcrypto/lib/utils/DuplexStream.js","./lib/utils/isStream":"/opt/new_swarm_engine_release/privatesky/modules/pskcrypto/lib/utils/isStream.js","./signsensusDS/ssutil":"/opt/new_swarm_engine_release/privatesky/modules/pskcrypto/signsensusDS/ssutil.js"}],"psklogger":[function(require,module,exports){
(function (global){
const PSKLogger = require('./src/PSKLoggerClient/index');
const EnvironmentDataProvider = require('./src/utils').EnvironmentDataProvider;


if(!global.hasOwnProperty('$$')) {
    global.$$ = {};
}


/**
 * @deprecated
 * PSKLogger should be used as is without overwriting console.
 * The functionality should be added to PSKLogger to log to console the message and useful metadata
 */
function overwriteConsole() {
    if(process.env.context === 'sandbox') {
        console.log("Execution detected in sandbox, console won't be overwritten");
        return;
    }

    const logger = PSKLogger.getLogger();

    const originalConsole = {};
    Object.keys(console).forEach(key => originalConsole[key] = console[key]);

    Object.keys(logger).forEach(key => {
        if(key != "log") {
            console[key] = function () {

                const log = logger[key].apply(logger, arguments);

                const context = getContextForMeta(log.meta);

                if (originalConsole.hasOwnProperty(key)) {
                    originalConsole[key].apply(originalConsole, [`[${context}]`, ...log.messages]);
                }
            }
        } else {
            console.log = function(...args){
                if(args[0] == undefined) throw new Error("Printing an undefined throws this error");
                //logger.log(...args); ignore console logs... ;)
                const log = logger[key].apply(logger, arguments);
                /*const context = getContextForMeta(log.meta) + " log:\n\r";
                args.unshift(context) */
                originalConsole.log(...args);
            }
        }
    });


    /**
     * @return {string|*}
     */
    function getContextForMeta(meta) {
        const contexts = {
            node: (meta) => `node:${meta.context}`,
            domain: (meta) =>`domain:${meta.domain}`,
            agent: (meta) => `domain:${meta.domain}:agent:${meta.agent}`,
            sandbox: () => `sandbox`
        };

        if (contexts.hasOwnProperty(meta.origin)) {
            return contexts[meta.origin](meta);
        } else {
            return '';
        }
    }
}

if (process.env.context !== 'sandbox') {

    const MessagePublisher = require('./src/MessagePublisher');
    const MessageSubscriber = require('./src/MessageSubscriber');
    const PubSubProxy = require('./src/PubSubProxy');

    function enableEnvironmentDataDefault() {
        global.$$.getEnvironmentData = EnvironmentDataProvider.getEnvironmentData;
    }

    function enableEnvironmentDataForAgent() {
        global.$$.getEnvironmentData = EnvironmentDataProvider.getEnvironmentDataForAgent;
    }

    function enableEnvironmentDataForDomain() {
        global.$$.getEnvironmentData = EnvironmentDataProvider.getEnvironmentDataForDomain;
    }


    /**
     * Overwrite this to provide relevant information for other environments (ex: for domains, browser etc.)
     */
    if(process.env.hasOwnProperty('PRIVATESKY_AGENT_NAME')) {
        enableEnvironmentDataForAgent();
    } else if(process.env.hasOwnProperty('PRIVATESKY_DOMAIN_NAME')) {
        enableEnvironmentDataForDomain()
    } else if(!global.$$.hasOwnProperty('getEnvironmentData')) {
        enableEnvironmentDataDefault();
    }

    module.exports.MessagePublisherModule  = MessagePublisher;
    module.exports.MessageSubscriberModule = MessageSubscriber;
    module.exports.PubSubProxyModule       = PubSubProxy;
} else {
    global.$$.getEnvironmentData = EnvironmentDataProvider.getEnvironmentDataForSandbox;
}


module.exports.overwriteConsole = overwriteConsole;
module.exports.PSKLogger = PSKLogger;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./src/MessagePublisher":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessagePublisher/index.js","./src/MessageSubscriber":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/MessageSubscriber/index.js","./src/PSKLoggerClient/index":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/PSKLoggerClient/index.js","./src/PubSubProxy":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/PubSubProxy/index.js","./src/utils":"/opt/new_swarm_engine_release/privatesky/modules/psklogger/src/utils/index.js"}],"soundpubsub":[function(require,module,exports){
module.exports = {
					soundPubSub: require("./lib/soundPubSub").soundPubSub
};
},{"./lib/soundPubSub":"/opt/new_swarm_engine_release/privatesky/modules/soundpubsub/lib/soundPubSub.js"}],"source-map-support":[function(require,module,exports){
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

},{"buffer-from":"buffer-from","fs":false,"module":false,"path":"path","source-map":"source-map"}],"source-map":[function(require,module,exports){
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
exports.SourceMapGenerator = require('./lib/source-map-generator').SourceMapGenerator;
exports.SourceMapConsumer = require('./lib/source-map-consumer').SourceMapConsumer;
exports.SourceNode = require('./lib/source-node').SourceNode;

},{"./lib/source-map-consumer":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/source-map-consumer.js","./lib/source-map-generator":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/source-map-generator.js","./lib/source-node":"/opt/new_swarm_engine_release/privatesky/node_modules/source-map/lib/source-node.js"}],"swarmutils":[function(require,module,exports){
(function (global){
module.exports.OwM = require("./lib/OwM");
module.exports.beesHealer = require("./lib/beesHealer");

const uidGenerator = require("./lib/uidGenerator").createUidGenerator(200, 32);

module.exports.safe_uuid = require("./lib/safe-uuid").init(uidGenerator);

module.exports.Queue = require("./lib/Queue");
module.exports.combos = require("./lib/Combos");

module.exports.uidGenerator = uidGenerator;
module.exports.generateUid = uidGenerator.generateUid;
module.exports.AsyncDispatcher = require("./lib/AsyncDispatcher");
module.exports.SwarmPacker = require("./lib/SwarmPacker");

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

},{"./lib/AsyncDispatcher":"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/AsyncDispatcher.js","./lib/Combos":"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/Combos.js","./lib/OwM":"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/OwM.js","./lib/Queue":"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/Queue.js","./lib/SwarmPacker":"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/SwarmPacker.js","./lib/beesHealer":"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/beesHealer.js","./lib/pskconsole":"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/pskconsole.js","./lib/safe-uuid":"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/safe-uuid.js","./lib/uidGenerator":"/opt/new_swarm_engine_release/privatesky/modules/swarmutils/lib/uidGenerator.js"}],"utils":[function(require,module,exports){
exports.fsExt = require("./FSExtension").fsExt;
},{"./FSExtension":"/opt/new_swarm_engine_release/privatesky/libraries/utils/FSExtension.js"}],"zmq_adapter":[function(require,module,exports){
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

},{"buffer":"buffer","swarmutils":"swarmutils","zeromq":false}]},{},["/opt/new_swarm_engine_release/privatesky/builds/tmp/pskruntime.js"])
//# sourceMappingURL=pskruntime.js.map