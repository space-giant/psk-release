virtualMQRequire=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/home/cosmin/Workspace/reorganizing/privatesky/builds/tmp/virtualMQ_intermediar.js":[function(require,module,exports){
(function (global){
global.virtualMQLoadModules = function(){ 
	$$.__runtimeModules["virtualmq"] = require("virtualmq");
	$$.__runtimeModules["foldermq"] = require("foldermq");
	$$.__runtimeModules["yazl"] = require("yazl");
	$$.__runtimeModules["yauzl"] = require("yauzl");
	$$.__runtimeModules["buffer-crc32"] = require("buffer-crc32");
	$$.__runtimeModules["node-fd-slicer"] = require("node-fd-slicer");
	$$.__runtimeModules["edfs"] = require("edfs");
	$$.__runtimeModules["pskdb"] = require("pskdb");
	$$.__runtimeModules["psk-http-client"] = require("psk-http-client");
	$$.__runtimeModules["signsensus"] = require("signsensus");
}
if (false) {
	virtualMQLoadModules();
}; 
global.virtualMQRequire = require;
if (typeof $$ !== "undefined") {            
    $$.requireBundle("virtualMQ");
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"buffer-crc32":"buffer-crc32","edfs":"edfs","foldermq":"foldermq","node-fd-slicer":"node-fd-slicer","psk-http-client":"psk-http-client","pskdb":"pskdb","signsensus":"signsensus","virtualmq":"virtualmq","yauzl":"yauzl","yazl":"yazl"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/EDFSMiddleware.js":[function(require,module,exports){
require("./flows/BricksManager");

function EDFSMiddleware(server) {
    server.post('/EDFS', (req, res) => {
        //preventing illegal characters passing as fileId
        res.statusCode = 400;
        res.end();
    });

    server.post('/:fileId', (req, res) => {
        $$.flow.start("BricksManager").write(req.params.fileId, req, function (err, result) {
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
        $$.flow.start("BricksManager").read(req.params.fileId, res, function (err, result) {
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
},{"./flows/BricksManager":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/flows/BricksManager.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/flows/BricksManager.js":[function(require,module,exports){
const path = require("path");
const fs = require("fs");
const PskHash = require('pskcrypto').PskHash;

const folderNameSize = process.env.FOLDER_NAME_SIZE || 5;
const FILE_SEPARATOR = '-';
let rootfolder;

$$.flow.describe("BricksManager", {
    init: function(rootFolder, callback){
        if(!rootFolder){
            callback(new Error("No root folder specified!"));
            return;
        }
        rootFolder = path.resolve(rootFolder);
        this.__ensureFolderStructure(rootFolder, function(err, path){
            rootfolder = rootFolder;
            callback(err, rootFolder);
        });
    },
    write: function(fileName, readFileStream, callback){
        if(!this.__verifyFileName(fileName, callback)){
            return;
        }

        if(!readFileStream || !readFileStream.pipe || typeof readFileStream.pipe !== "function"){
            callback(new Error("Something wrong happened"));
            return;
        }

        const folderName = path.join(rootfolder, fileName.substr(0, folderNameSize), fileName);

        const serial = this.serial(() => {});

        serial.__ensureFolderStructure(folderName, serial.__progress);
        serial.__writeFile(readFileStream, folderName, fileName, callback);
    },
    read: function(fileName, writeFileStream, callback){
        if(!this.__verifyFileName(fileName, callback)){
            return;
        }

        const folderPath = path.join(rootfolder, fileName.substr(0, folderNameSize));
        const filePath = path.join(folderPath, fileName);
        this.__verifyFileExistence(filePath, (err, result) => {
            if(!err){
                this.__getLatestVersionNameOfFile(filePath, (err, fileVersion) => {
                    if(err) {
                        return callback(err);
                    }
                    this.__readFile(writeFileStream, path.join(filePath, fileVersion.fullVersion), callback);
                });
            }else{
                callback(new Error("No file found."));
            }
        });
    },
    readVersion: function(fileName, fileVersion, writeFileStream, callback) {
        if(!this.__verifyFileName(fileName, callback)){
            return;
        }

        const folderPath = path.join(rootfolder, fileName.substr(0, folderNameSize));
        const filePath = path.join(folderPath, fileName, fileVersion);
        this.__verifyFileExistence(filePath, (err, result) => {
            if(!err){
                this.__readFile(writeFileStream, path.join(filePath), callback);
            }else{
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

                    filesData.push({version: files[i], creationTime: stats.birthtime, creationTimeMs: stats.birthtimeMs});

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
    compareVersions: function(bodyStream, callback) {
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
    __verifyFileName: function(fileName, callback){
        if(!fileName || typeof fileName != "string"){
            callback(new Error("No fileId specified."));
            return;
        }

        if(fileName.length < folderNameSize){
            callback(new Error("FileId too small. "+fileName));
            return;
        }

        return true;
    },
    __ensureFolderStructure: function(folder, callback){
        fs.mkdir(folder, {recursive: true}, callback);
    },
    __writeFile: function(readStream, folderPath, fileName, callback){
        const hash = new PskHash();
        const filePath = path.join(folderPath, fileName);
        fs.access(filePath, (err) => {
            if (err) {
                if (err.code === "ENOENT") {
                    readStream.on('data', (data) => {
                        hash.update(data);
                    });


                    const writeStream = fs.createWriteStream(filePath, {mode: 0o444});

                    writeStream.on("finish", () => {
                        const hashDigest = hash.digest().toString('hex');
                        if(hashDigest !== fileName){
                            fs.unlink(filePath, (err) => {
                                if (err) {
                                    return callback(err);
                                }else{
                                    return callback(new Error("Content hash and filename are not the same"));
                                }
                            });
                        }
                    });

                    writeStream.on("error", function () {
                        writeStream.close();
                        readStream.close();
                        callback(...arguments);
                    });

                    readStream.pipe(writeStream);
                }else{
                    return callback(err);
                }
            }

            callback();
        });
    },
    __getNextVersionFileName: function (folderPath, fileName, callback) {
        this.__getLatestVersionNameOfFile(folderPath, (err, fileVersion) => {
            if(err) {
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

            if(files.length > 0) {
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

        for(let i = 1; i < numbers.length; ++i) {
            max = Math.max(max, numbers[i]);
        }

        if(isNaN(max)) {
            throw new Error('Invalid element found');
        }

        return max;
    },
    __compareVersions: function (files, callback) {
        const filesWithChanges = [];
        const entries = Object.entries(files);
        let remaining = entries.length;

        if(entries.length === 0) {
            callback(undefined, filesWithChanges);
            return;
        }

        entries.forEach(([fileName, fileHash]) => {
            this.getVersionsForFile(fileName, (err, versions) => {
                if (err) {
                    if(err.code === 'ENOENT') {
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
    __readFile: function(writeFileStream, filePath, callback){
        const readStream = fs.createReadStream(filePath);

        writeFileStream.on("finish", callback);
        writeFileStream.on("error", callback);

        readStream.pipe(writeFileStream);
    },
    __progress: function(err, result){
        if(err){
            console.error(err);
        }
    },
    __verifyFileExistence: function(filePath, callback){
        fs.stat(filePath, callback);
    }
});
},{"fs":false,"path":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/Brick.js":[function(require,module,exports){
(function (Buffer){
const pskCrypto = require("pskcrypto");

function Brick(data) {
    if (typeof data === "string") {
        data = Buffer.from(data);
    }

    this.generateHash = function () {
        return pskCrypto.pskHash(data).toString("hex");
    };

    this.getData = function () {
        return data;
    };
}

module.exports = Brick;
}).call(this,require("buffer").Buffer)

},{"buffer":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/CSBIdentifier.js":[function(require,module,exports){
(function (Buffer){
const crypto = require("pskcrypto");


function CSBIdentifier(id, domain, keyLen = 32) {
    let seed;
    let dseed;
    let uid;
    let encSeed;
    //TODO: eliminate unused var
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



    this.getDomain = function () {
        if(seed){
            return seed.domain;
        }

        if(dseed){
            return dseed.domain;
        }

        throw new Error("Backup URLs could not be retrieved. Access is denied");
    };

    //------------------------------ internal methods ------------------------------
    function init() {
        if (!id) {
            if (!domain) {
                throw new Error("No domains provided.");
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
        if (!Array.isArray(domain)) {
            domain = [ domain ];
        }

        localSeed.tag    = 's';
        localSeed.random = crypto.randomBytes(keyLen);
        localSeed.domain = domain;

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
        const domain = Buffer.from(splitCompactSeed[1], 'base64').toString();
        const dseed = {};

        dseed.tag = 'd';
        dseed.random = crypto.deriveKey(strSeed, null, keyLen);
        dseed.domain = JSON.parse(domain);

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

    function generateCompactForm({tag, random, domain}) {
        let compactId = tag + random.toString('base64');
        if (domain) {
            compactId += '|' + Buffer.from(JSON.stringify(domain)).toString('base64');
        }
        return Buffer.from(encodeURIComponent(compactId));
    }

    // TODO: unused function!!!
    // function encrypt(id, encryptionKey) {
    //     if(arguments.length !== 2){
    //         throw new Error(`Wrong number of arguments. Expected: 2; provided ${arguments.length}`);
    //     }

    //     let tag;
    //     if (typeof id === "object" && !Buffer.isBuffer(id)) {
    //         tag = id.tag;
    //         id = generateCompactForm(id);
    //     }

    //     if (tag === 's') {
    //         //TODO encrypt seed
    //     }else if (tag === 'd') {
    //         //TODO encrypt dseed
    //     }else{
    //         throw new Error("The provided id cannot be encrypted");
    //     }

    // }

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
            id.domain = JSON.parse(Buffer.from(splitCompactId[1], 'base64').toString());
        }

        return id;
    }
}

module.exports = CSBIdentifier;

}).call(this,require("buffer").Buffer)

},{"buffer":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/EDFS.js":[function(require,module,exports){
const DSeedCage = require("../utils/DseedCage");
const RootCSB = require("./RootCSB");

function EDFS(){

    this.getDseedCage = function (localFolder) {
        return new DSeedCage(localFolder);
    };

    this.getRootCSB = function (csbIdentifier) {
        return new RootCSB(undefined, undefined, csbIdentifier);
    };
}

module.exports = EDFS;
},{"../utils/DseedCage":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/utils/DseedCage.js","./RootCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/RootCSB.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/EDFSBlockchainProxy.js":[function(require,module,exports){
const pskdb = require("pskdb");

function EDFSBlockchainProxy() {

	const blockchain = pskdb.startInMemoryDB();

	this.getCSBAnchor = function (csbIdentifier, callback) {
		const transaction = blockchain.beginTransaction({});
		const asset = transaction.lookup("global.CSBAnchor", csbIdentifier.getUid());
		callback(undefined, asset);
	};

	this.setCSBAnchor = function (csbAnchor, callback) {
		const transaction = blockchain.beginTransaction({});
		transaction.add(csbAnchor);
		blockchain.commit(transaction);
		callback();
	};
}

module.exports = EDFSBlockchainProxy;
},{"pskdb":"pskdb"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/EDFSServiceProxy.js":[function(require,module,exports){
require("psk-http-client");

function EDFSServiceProxy(url) {

    function addBrick(brick, callback) {
        $$.remote.doHttpPost(url + "/EDFS/" + brick.generateHash(), brick.getData(), (err) => {
            if (err) {
                return callback(err);
            }

            callback();
        });
    }

    function getBrick(brickHash, callback) {
        $$.remote.doHttpGet(url + "/EDFS/" + brickHash, (err, data) =>{
            if (err) {
                return callback(err);
            }

            callback(undefined, data);
        });
    }

    function deleteBrick(brickHash) {
        throw new Error("Not implemented");
    }

    return {
        addBrick,
        getBrick,
        deleteBrick
    };
}

module.exports = EDFSServiceProxy;

},{"psk-http-client":"psk-http-client"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/FileHandler.js":[function(require,module,exports){
(function (Buffer){
const fs = require("fs");
const EDFSServiceProxy = require("./EDFSServiceProxy");
const Brick = require("./Brick");
const pskCrypto = require("pskcrypto");
const AsyncDispatcher = require("../utils/AsyncDispatcher");
const url = "http://localhost:8080";

function FileHandler(filePath, brickSize, fileBricksHashes, lastBrickSize) {

    const edfsServiceProxy = new EDFSServiceProxy(url);


    this.getFileBricksHashes = function () {
        return fileBricksHashes;

    };

    this.saveFile = function (callback) {
        __initialSaving(callback);
    };

    function __initialSaving(callback) {
        fs.stat(filePath, (err, stats) => {
            if (err) {
                return callback((err));
            }

            lastBrickSize = stats.size % brickSize;
            const fileSize = stats.size;

            fs.open(filePath, "r", (err, fd) => {
                if (err) {
                    return callback(err);
                }

                const asyncDispatcher = new AsyncDispatcher((errors, results) => {
                    callback();
                });

                const noBricks = Math.round(fileSize / brickSize + 1);
                asyncDispatcher.dispatchEmpty(noBricks);

                for (let i = 0; i < noBricks; i++) {
                    let brickData = Buffer.alloc(brickSize);
                    fs.read(fd, brickData, 0, brickSize, i * brickSize, (err, bytesRead, buffer) => {
                        if (err) {
                            return callback(err);
                        }

                        const brick = new Brick(buffer);
                        edfsServiceProxy.addBrick(brick, (err) => {

                            if (err) {
                                return callback(err);
                            }

                            asyncDispatcher.markOneAsFinished();
                        });
                    });
                }
            });
        });
    }

    function __readFileFromStart(fd, brickSize, fileSize, position, bricksHashes = [], callback) {
        let brickData = Buffer.alloc(brickSize);
        fs.read(fd, brickData, 0, brickSize, position, (err, bytesRead, buffer) => {
            if (err) {
                return callback(err);
            }

            position += brickSize;
            bricksHashes.push(pskCrypto.pskHash(buffer));
            if (position <= fileSize) {
                __readFileFromStart(fd, brickSize, fileSize, position, bricksHashes, callback);
            }else{
                lastBrickSize = bytesRead;
                callback(undefined, bricksHashes);
            }
        });
    }

    function __readFileBackwards(fd, brickSize, fileSize, position = lastBrickSize, bricksHashes = [], callback) {

        let brickData = Buffer.alloc(brickSize);
        fs.read(fd, brickData, 0, brickSize, fileSize - position, (err, bytesRead, buffer) => {
            if (err) {
                return callback(err);
            }

            bricksHashes.push(pskCrypto.pskHash(buffer));
            if (position <= fileSize) {
                position += brickSize;
                __readFileBackwards(fd, brickSize, fileSize, position, callback)
            } else {
                callback();
            }
        });
    }
}

module.exports = FileHandler;

//rdiff algorithm
//

}).call(this,require("buffer").Buffer)

},{"../utils/AsyncDispatcher":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/utils/AsyncDispatcher.js","./Brick":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/Brick.js","./EDFSServiceProxy":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/EDFSServiceProxy.js","buffer":false,"fs":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/Header.js":[function(require,module,exports){
const Brick = require("./Brick");
const pskCrypto = require("pskcrypto");

function Header(previousHeaderHash, files, transactions){
    previousHeaderHash = previousHeaderHash || "";
    files = files || {};
    transactions = transactions || [];

    this.toBrick = function (encryptionKey) {
        const headerObj = {previousHeaderHash, files, transactions};
        const encryptedHeaderObj = pskCrypto.encrypt(headerObj, encryptionKey);
        return new Brick(encryptedHeaderObj);
    };

    this.fromBrick = function (brick, decryptionKey) {
        const headerObj = JSON.parse(pskCrypto.decrypt(brick, decryptionKey));
        previousHeaderHash = headerObj.previousHeaderHash;
        files = headerObj.files;
        transactions = headerObj.transactions;
    };

    this.setPreviousHeaderHash = function (hash) {
        previousHeaderHash = hash;
    };

    this.getPreviousHeaderHash = function () {
        return previousHeaderHash;
    };

    this.addTransactions = function (newTransactions) {
        if (!Array.isArray(newTransactions)) {
            newTransactions = [ newTransactions ];
        }

        transactions = transactions.concat(newTransactions);
    };

    this.getTransactions = function () {
        return transactions;
    };

    this.addFiles = function (newFiles) {
        if (typeof newFiles !== "object" || Array.isArray(newFiles)) {
            throw new Error('Invalid type. Expected non-array object');
        }

        const newFilesKeys = Object.keys(newFiles);
        newFilesKeys.forEach((fileAlias) => {
            files[fileAlias] = newFiles[fileAlias];
        });
    };

    this.getFiles = function () {
        return files;
    };

    this.getHeaderObject = function () {

        return {
            previousHeaderHash,
            files,
            transactions
        };
    };

}

module.exports = Header;
},{"./Brick":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/Brick.js","pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/HeadersHistory.js":[function(require,module,exports){
const Brick = require("./Brick");
const pskCrypto = require("pskcrypto");

function HeadersHistory(initHeaders) {

    let headers = initHeaders || [];
    this.addHeader = function (headerBrick, encryptionKey) {
        const headerEntry = {};
        const headerHash = headerBrick.generateHash();
        headerEntry[headerHash] = encryptionKey;
        headers.push(headerEntry);
    };

    this.getHeaders = function () {
        return headers;
    };

    this.getLastHeaderHash = function () {
        if (headers.length > 0) {
            const headerEntry = headers[headers.length - 1];
            return Object.keys(headerEntry)[0];
        }
    };

    this.toBrick = function (encryptionKey) {
        return new Brick(pskCrypto.encrypt(headers, encryptionKey));
    };

    this.fromBrick = function (brick, decryptionKey) {
        headers = JSON.parse(pskCrypto.decrypt(brick, decryptionKey).toString());
    };

}

module.exports = HeadersHistory;
},{"./Brick":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/Brick.js","pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/RawCSB.js":[function(require,module,exports){
const OwM = require('swarmutils').OwM;
const pskdb = require('pskdb');

function RawCSB(initData) {
	const data = new OwM({blockchain: initData});
	const blockchain = pskdb.startDb({getInitValues, persist});

	if(!data.blockchain) {
		data.blockchain = {
			transactionLog: []
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

//
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

	data.applyTransaction = function (transactionSwarm) {
		// const transaction = blockchain.beginTransaction(transactionSwarm);
		blockchain.commitSwarm(transactionSwarm);
		// blockchain.commit(transaction);
	};

	data.getTransactionLog = function () {
		return data.blockchain.transactionLog;
	};
	/* internal functions */

	function persist(transactionLog, currentValues, currentPulse) {
		transactionLog.currentPulse = currentPulse;

		data.blockchain.currentValues = currentValues;
		data.blockchain.transactionLog.push(transactionLog);
	}

	function getInitValues () {
		if(!data.blockchain || !data.blockchain.currentValues) {
			return null;
		}
		return data.blockchain.currentValues;
	}

	// TODO: unused function
    // function mkSingleLine(str) {
	// 	return str.replace(/\n|\r/g, "");
	// }

	return data;
}

module.exports = RawCSB;
},{"pskdb":"pskdb","swarmutils":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/RootCSB.js":[function(require,module,exports){
const RawCSB = require('./RawCSB');
const crypto = require('pskcrypto');
//TODO: unused var
// const CSBCache = require("./CSBCache");
const CSBIdentifier = require("./CSBIdentifier");
const Header = require("./Header");
const HeadersHistory = require("./HeadersHistory");
const EventEmitter = require('events');
const EDFSServiceProxy = require("./EDFSServiceProxy");
const EDFSBlockchainProxy = require("./EDFSBlockchainProxy");
const AsyncDispatcher = require("../utils/AsyncDispatcher");

const Brick = require("./Brick");
const url = "http://localhost:8080";
const edfsServiceProxy = new EDFSServiceProxy(url);
/**
 *
 * @param localFolder   - required
 * @param currentRawCSB - optional
 * @param csbIdentifier - required
 * @constructor
 */
function RootCSB(localFolder, currentRawCSB, csbIdentifier) {
    // if (!localFolder || !csbIdentifier) {
    //     throw new Error('Missing required parameters');
    // }


    const event = new EventEmitter();
    const edfsBlockchainProxy = new EDFSBlockchainProxy(csbIdentifier.getDomain());
    this.on = event.on;
    this.off = event.removeListener;
    this.removeAllListeners = event.removeAllListeners;
    this.emit = event.emit;

    this.getMidRoot = function (CSBPath, callback) {
        throw new Error('Not implemented');
    };

    this.createRawCSB = function () {
        return new RawCSB();
    };

    this.loadRawCSB = function (CSBPath, callback) {
        if (!currentRawCSB) {
            edfsBlockchainProxy.getCSBAnchor(csbIdentifier, (err, csbAnchor) => {
                if (err) {
                    return callback(err);
                }

                __loadRawCSB(csbIdentifier, csbAnchor.headerHistoryHash,(err, rawCSB) => {
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

            __loadRawCSB(new CSBIdentifier(asset.dseed), asset.headerHistoryHash, callback);
        });
    };

    this.loadAssetFromPath = function (CSBPath, callback) {
        let processedPath = __splitPath(CSBPath);
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
        __loadAssetFromPath(processedPath, new CSBIdentifier(CSBReference.dseed), CSBReference.headerHistoryHash, 0, callback);
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

    this.saveRawCSB = function (rawCSB, CSBPath, callback) {
        if (!CSBPath || CSBPath === '') {
            if (rawCSB) {
                currentRawCSB = rawCSB;
            }
        }

        const transactions = rawCSB.getTransactionLog();
        const headersHistory = new HeadersHistory();
        const header = new Header();
        edfsBlockchainProxy.getCSBAnchor(csbIdentifier, (err, csbAnchor) => {
            if (err) {
                console.log(err); //TODO: better handling
            }
            if (csbAnchor && typeof csbAnchor.headerHistoryHash !== "undefined") {
                edfsServiceProxy.getBrick(csbAnchor.headerHistoryHash, (err, headersHistoryBrick) => {
                    if (err) {
                        return callback(err);
                    }

                    headersHistory.fromBrick(headersHistoryBrick, csbIdentifier.getDseed());
                    header.setPreviousHeaderHash(headersHistory.getLastHeaderHash());
                    return __saveRawCSB(csbAnchor, headersHistory, header, transactions, callback);
                });
            }
            csbAnchor.init(csbIdentifier.getUid(), csbIdentifier.getUid());
            __saveRawCSB(csbAnchor, headersHistory, header, transactions, callback);
        });
    };


    /* ------------------- INTERNAL METHODS ------------------- */


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

    /* function __initializeAssets(rawCSB, csbRef, backupUrls) {

         let csbMeta;
         let isMaster;

         csbMeta = rawCSB.getAsset('global.CSBMeta', 'meta');
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
     } */

    function __saveRawCSB(csbAnchor, headersHistory, header, transactions, callback) {
        const asyncDispatcher = new AsyncDispatcher(() => {
            const headerEncryptionKey = crypto.randomBytes(32);
            const headerBrick = header.toBrick(headerEncryptionKey);
            edfsServiceProxy.addBrick(headerBrick, (err) => {
                if (err) {
                    return callback(err);
                }

                headersHistory.addHeader(headerBrick, headerEncryptionKey);
                const historyBrick = headersHistory.toBrick(csbIdentifier.getDseed());
                edfsServiceProxy.addBrick(historyBrick, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    csbAnchor.updateHeaderHistoryHash(historyBrick.generateHash());
                    edfsBlockchainProxy.setCSBAnchor(csbAnchor, (err) => {
                        if (err) {
                            return callback(err);
                        }

                        callback();
                    });
                });
            });

        });

        asyncDispatcher.dispatchEmpty(transactions.length);
        transactions.forEach((transaction) => {
            const encryptionKey = crypto.randomBytes(32);
            const transactionBrick = new Brick(crypto.encrypt(transaction, encryptionKey));
            const transactionEntry = {};
            const transactionHash = transactionBrick.generateHash();
            transactionEntry[transactionHash] = encryptionKey;
            header.addTransactions(transactionEntry);
            edfsServiceProxy.addBrick(transactionBrick, (err) => {
                if (err) {
                    return callback(err);
                }

                asyncDispatcher.markOneAsFinished();
            });
        });
    }



    function __loadRawCSB(localCSBIdentifier, localHeaderHistoryHash, callback) {
        if(typeof localHeaderHistoryHash === "function"){
            callback = localHeaderHistoryHash;
        }

        const rawCSB = new RawCSB();
        edfsServiceProxy.getBrick(localHeaderHistoryHash, (err, headersHistoryBrickData) => {
            if (err) {
                return callback(err);
            }

            const headersHistory = new HeadersHistory();
            headersHistory.fromBrick(headersHistoryBrickData, localCSBIdentifier.getDseed());
            const headersAsyncDispatcher = new AsyncDispatcher((errors, results) => {
                callback(undefined, rawCSB);
            });

            const headers = headersHistory.getHeaders();
            headersAsyncDispatcher.dispatchEmpty(headers.length);
            headers.forEach((headerEntry) => {
                const headerHash = Object.keys(headerEntry)[0];
                edfsServiceProxy.getBrick(headerHash, (err, headerBrick) => {
                    if (err) {
                        return callback(err);
                    }
                    const header = new Header();
                    header.fromBrick(headerBrick, headerEntry[headerHash]);
                    const transactionsEntries = header.getTransactions();
                    const transactionsAsyncDispatcher = new AsyncDispatcher((errors, results) => {
                        const resultsObj = {};
                        results.forEach((result) => {
                            const key = Object.keys(result)[0];
                            resultsObj[key] = Object.values(result[key])[0];
                        });

                        transactionsEntries.forEach((transactionEntry) => {
                            const transactionHash = Object.keys(transactionEntry)[0];
                            rawCSB.applyTransaction(resultsObj[transactionHash].swarm);
                        });

                        headersAsyncDispatcher.markOneAsFinished();
                    });
                    transactionsAsyncDispatcher.dispatchEmpty(transactionsEntries.length);
                    transactionsEntries.forEach((transactionEntry) => {
                        const transactionHash = Object.keys(transactionEntry)[0];
                        edfsServiceProxy.getBrick(transactionHash, (err, transactionBrick) => {
                            if (err) {
                                return callback(err);
                            }

                            const transactionObj = {};
                            transactionObj[transactionHash] = crypto.decryptObject(transactionBrick, transactionEntry[transactionHash]);
                            transactionsAsyncDispatcher.markOneAsFinished(undefined, transactionObj);

                        });
                    });
                });
            });
        });
    }

    function __loadAssetFromPath(processedPath, localCSBIdentifier, localHeaderHistoryHash, currentIndex, callback) {
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

}


module.exports = RootCSB;

},{"../utils/AsyncDispatcher":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/utils/AsyncDispatcher.js","./Brick":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/Brick.js","./CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/CSBIdentifier.js","./EDFSBlockchainProxy":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/EDFSBlockchainProxy.js","./EDFSServiceProxy":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/EDFSServiceProxy.js","./Header":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/Header.js","./HeadersHistory":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/HeadersHistory.js","./RawCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/RawCSB.js","events":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/utils/AsyncDispatcher.js":[function(require,module,exports){

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
},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/utils/DseedCage.js":[function(require,module,exports){
(function (Buffer){
const crypto = require('pskcrypto');
const path = require('path');
const fs = require('fs');
const CSBIdentifier = require("../lib/CSBIdentifier");

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

},{"../lib/CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/CSBIdentifier.js","buffer":false,"fs":false,"path":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/foldermq/lib/folderMQ.js":[function(require,module,exports){
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

},{"fs":false,"path":false,"swarmutils":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/node-fd-slicer/modules/node-pend/index.js":[function(require,module,exports){
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
},{"swarmutils":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/signsensus/lib/consUtil.js":[function(require,module,exports){
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

},{"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/VirtualMQ.js":[function(require,module,exports){
// require("./flows/CSBmanager");
require("./flows/remoteSwarming");
const path = require("path");
const httpWrapper = require('./libs/http-wrapper');
const edfs = require("edfs");
const EDFSMiddleware = edfs.EDFSMiddleware;
const Server = httpWrapper.Server;
const Router = httpWrapper.Router;
const TokenBucket = require('./libs/TokenBucket');


function VirtualMQ({listeningPort, rootFolder, sslConfig}, callback) {
	const port = listeningPort || 8080;
	const server = new Server(sslConfig).listen(port);
	const tokenBucket = new TokenBucket(600000,1,10);
	const CSB_storage_folder = "uploads";
	const SWARM_storage_folder = "swarms";
	console.log("Listening on port:", port);

	this.close = server.close;
	$$.flow.start("BricksManager").init(path.join(rootFolder, CSB_storage_folder), function (err, result) {
		if (err) {
			throw err;
		} else {
			console.log("CSBManager is using folder", result);
			$$.flow.start("RemoteSwarming").init(path.join(rootFolder, SWARM_storage_folder), function(err, result){
				registerEndpoints();
				if (callback) {
					callback();
				}
			});
		}
	});

	function registerEndpoints() {
		const router = new Router(server);
		router.use("/EDFS", (newServer) => {
			new EDFSMiddleware(newServer);
		});

		server.use(function (req, res, next) {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Origin');
			res.setHeader('Access-Control-Allow-Credentials', true);
			next();
		});

		server.use(function (req, res, next) {
			const ip = res.socket.remoteAddress;

			tokenBucket.takeToken(ip, tokenBucket.COST_MEDIUM, function(err, remainedTokens) {
				res.setHeader('X-RateLimit-Limit', tokenBucket.getLimitByCost(tokenBucket.COST_MEDIUM));
				res.setHeader('X-RateLimit-Remaining', tokenBucket.getRemainingTokenByCost(remainedTokens, tokenBucket.COST_MEDIUM));

				if(err) {
					switch (err) {
						case TokenBucket.ERROR_LIMIT_EXCEEDED:
							res.statusCode = 429;
							break;
						default:
							res.statusCode = 500;

					}

					res.end();
					return;
				}

				next();
			});
		});

		server.post('/:channelId', function (req, res) {

			$$.flow.start("RemoteSwarming").startSwarm(req.params.channelId, req, function (err, result) {
				res.statusCode = 201;
				if (err) {
					console.log(err);
					res.statusCode = 500;
				}
				res.end();
			});
		});

		server.get('/:channelId', function (req, res) {
			$$.flow.start("RemoteSwarming").waitForSwarm(req.params.channelId, res, function (err, result, confirmationId) {
				if (err) {
					console.log(err);
					res.statusCode = 500;
				}

				let responseMessage = result;

				if((req.query.waitConfirmation || 'false')  === 'false') {
					res.on('finish', () => {
						$$.flow.start('RemoteSwarming').confirmSwarm(req.params.channelId, confirmationId, (err) => {});
					});
				} else {
					responseMessage = {result, confirmationId};
				}

				res.write(JSON.stringify(responseMessage));
				res.end();
			});
		});

		server.delete("/:channelId/:confirmationId", function(req, res){
			$$.flow.start("RemoteSwarming").confirmSwarm(req.params.channelId, req.params.confirmationId, function (err, result) {
				if (err) {
					console.log(err);
					res.statusCode = 500;
				}
				res.end();
			});
		});

		server.options('/*', function (req, res) {
			var headers = {};
			// IE8 does not allow domains to be specified, just the *
			// headers["Access-Control-Allow-Origin"] = req.headers.origin;
			headers["Access-Control-Allow-Origin"] = "*";
			headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
			headers["Access-Control-Allow-Credentials"] = true;
			headers["Access-Control-Max-Age"] = '3600'; //one hour
			headers["Access-Control-Allow-Headers"] = "Content-Type, Access-Control-Allow-Origin, User-Agent";
			res.writeHead(200, headers);
			res.end();
		});

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

module.exports.VirtualMQ = VirtualMQ;

module.exports.getHttpWrapper = function() {
	return require('./libs/http-wrapper');
};

},{"./flows/remoteSwarming":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/flows/remoteSwarming.js","./libs/TokenBucket":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/TokenBucket.js","./libs/http-wrapper":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/index.js","edfs":"edfs","path":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/flows/remoteSwarming.js":[function(require,module,exports){
const path = require("path");
const fs = require("fs");
const folderMQ = require("foldermq");

let rootfolder;
const channels = {

};

function storeChannel(id, channel, clientConsumer){
	var storedChannel = {
		channel: channel,
		handler: channel.getHandler(),
		mqConsumer: null,
		consumers:[]
	};

	if(!channels[id]){
		channels[id] = storedChannel;
	}

	if(clientConsumer){
		storedChannel = channels[id];
		channels[id].consumers.push(clientConsumer);
	}

	return storedChannel;
}


function registerConsumer(id, consumer){
	const storedChannel = channels[id];
	if(storedChannel){
		storedChannel.consumers.push(consumer);
		return true;
	}
	return false;
}

function deliverToConsumers(consumers, err, result, confirmationId){
	if(!consumers){
		return false;
	}
    let deliveredMessages = 0;
    while(consumers.length>0){
        //we iterate through the consumers list in case that we have a ref. of a request that time-outed meanwhile
        //and in this case we expect to have more then one consumer...
        const consumer = consumers.pop();
        try{
            consumer(err, result, confirmationId);
            deliveredMessages++;
        }catch(error){
            //just some small error ignored
            console.log("Error catched", error);
        }
    }
    return !!deliveredMessages;
}

function registerMainConsumer(id){
	const storedChannel = channels[id];
	if(storedChannel && !storedChannel.mqConsumer){
		storedChannel.mqConsumer = (err, result, confirmationId) => {
			channels[id] = null;
			deliverToConsumers(storedChannel.consumers, err, result, confirmationId);
			/*while(storedChannel.consumers.length>0){
				//we iterate through the consumers list in case that we have a ref. of a request that time-outed meanwhile
				//and in this case we expect to have more then one consumer...
				let consumer = storedChannel.consumers.pop();
				try{
					consumer(err, result, confirmationId);
				}catch(error){
					//just some small error ignored
					console.log("Error catched", error);
				}
			}*/
		};

		storedChannel.channel.registerConsumer(storedChannel.mqConsumer, false, () => !!channels[id]);
		return true;
	}
	return false;
}

function readSwarmFromStream(stream, callback){
    let swarm = "";
    stream.on('data', (chunk) =>{
        swarm += chunk;
	});

    stream.on("end", () => {
       callback(null, swarm);
	});

    stream.on("error", (err) =>{
        callback(err);
	});
}

$$.flow.describe("RemoteSwarming", {
	init: function(rootFolder, callback){
		if(!rootFolder){
			callback(new Error("No root folder specified!"));
			return;
		}
		rootFolder = path.resolve(rootFolder);
		fs.mkdir(rootFolder, {recursive: true}, function(err, path){
			rootfolder = rootFolder;

			if(!err){
				fs.readdir(rootfolder, (cleanErr, files) => {
					while(files && files.length > 0){
						console.log("Root folder found to have some dirs. Start cleaning empty dirs.");
						let dir = files.pop();
						try{
							const path = require("path");
							dir = path.join(rootFolder, dir);
							var content = fs.readdirSync(dir);
							if(content && content.length === 0){
								console.log("Removing empty dir", dir);
								fs.rmdirSync(dir);
							}
						}catch(err){
							//console.log(err);
						}
					}
					callback(cleanErr, rootFolder);
				});
			}else{
				return callback(err, rootFolder);
			}
		});
	},
	startSwarm: function (channelId, readSwarmStream, callback) {
		let channel = channels[channelId];
		if (!channel) {
			const channelFolder = path.join(rootfolder, channelId);
			let storedChannel;
			channel = folderMQ.createQue(channelFolder, (err, result) => {
				if (err) {
					//we delete the channel in order to try again next time
					channels[channelId] = null;
					callback(new Error("Channel initialization failed"));
					return;
				}

                readSwarmFromStream(readSwarmStream, (err, swarmSerialization) => {
					if(err){
						return callback(err);
					}else{
                        let sent = false;
                        try{
                            sent = deliverToConsumers(channel.consumers, null, JSON.parse(swarmSerialization));
                        }catch(err){
                            console.log(err);
                        }

                        if(!sent){
                            storedChannel.handler.sendSwarmSerialization(swarmSerialization, callback);
                        }else{
                        	return callback(null, swarmSerialization);
						}
					}
				});
				
			});
			storedChannel = storeChannel(channelId, channel);
		} else {
            readSwarmFromStream(readSwarmStream, (err, swarmSerialization) => {
            	if(err){
            		return callback(err);
				}else{
            		let sent = false;
            		try{
                        sent = deliverToConsumers(channel.consumers, null, JSON.parse(swarmSerialization));
					}catch(err){
						console.log(err);
					}

                    if(!sent){
						channel.handler.sendSwarmSerialization(swarmSerialization, callback);
					}else{
                        return callback(null, swarmSerialization);
                    }
				}
			});
		}
	},
	confirmSwarm: function(channelId, confirmationId, callback){
		if(!confirmationId){
			callback();
			return;
		}
		const storedChannel = channels[channelId];
		if(!storedChannel){
			const channelFolder = path.join(rootfolder, channelId);
			const channel = folderMQ.createQue(channelFolder, (err, result) => {
				if(err){
					//we delete the channel in order to try again next time
					channels[channelId] = null;
					callback(new Error("Channel initialization failed"));
					return;
				}
				channel.unlinkContent(confirmationId, callback);
			});
		}else{
			storedChannel.channel.unlinkContent(confirmationId, callback);
		}
	},
	waitForSwarm: function(channelId, writeSwarmStream, callback){
		let channel = channels[channelId];
		if(!channel){
			const channelFolder = path.join(rootfolder, channelId);
			channel = folderMQ.createQue(channelFolder, (err, result) => {
				if(err){
					//we delete the channel in order to try again next time
					channels[channelId] = null;
					callback(new Error("Channel initialization failed"), {});
					return;
				}
				if(!registerConsumer(channelId, callback)){
					callback(new Error("Registering consumer failed!"), {});
				}
				registerMainConsumer(channelId);
			});
			storeChannel(channelId, channel);
		}else{
			//channel.channel.registerConsumer(callback);
            if(!registerConsumer(channelId, callback)){
                callback(new Error("Registering consumer failed!"), {});
            }
            registerMainConsumer(channelId);
		}
	}
});
},{"foldermq":"foldermq","fs":false,"path":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/TokenBucket.js":[function(require,module,exports){
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

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Client.js":[function(require,module,exports){
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

},{"buffer":false,"http":false,"stream":false,"url":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Middleware.js":[function(require,module,exports){
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
                console.warn('You called next multiple time, only the first one will be executed');
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

},{"querystring":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Router.js":[function(require,module,exports){
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

},{}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Server.js":[function(require,module,exports){
const Middleware = require('./Middleware');
const http = require('http');
const https = require('https');

function Server(sslOptions) {
    const middleware = new Middleware();
    const server = _initServer(sslOptions);


    this.listen = function listen(port) {
        server.listen(port);
        return this;
    };

    this.use = function use(url, callback) {
        //TODO: find a better way
        if (arguments.length >= 2) {
            middleware.use(url, callback);
        } else if (arguments.length === 1) {
            callback = url;
            middleware.use(callback);
        }

    };

    this.close = function (callback) {
        server.close(callback);
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
}

module.exports = Server;
},{"./Middleware":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Middleware.js","http":false,"https":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/httpUtils.js":[function(require,module,exports){
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

},{"fs":false,"path":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/index.js":[function(require,module,exports){
const Client = require('./classes/Client');
const Server = require('./classes/Server');
const httpUtils = require('./httpUtils');
const Router = require('./classes/Router');

module.exports = {Server, Client, httpUtils, Router};


},{"./classes/Client":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Client.js","./classes/Router":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Router.js","./classes/Server":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Server.js","./httpUtils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/httpUtils.js"}],"buffer-crc32":[function(require,module,exports){
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

},{"buffer":false}],"edfs":[function(require,module,exports){
const EDFS = require('./lib/EDFS');
const CSBIdentifier = require("./lib/CSBIdentifier");
const FileHandler = require("./lib/FileHandler");
module.exports.EDFS = EDFS;
module.exports.CSBIdentifier = CSBIdentifier;
module.exports.FileHandler = FileHandler;
module.exports.EDFSMiddleware = require("./EDFSMiddleware");
},{"./EDFSMiddleware":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/EDFSMiddleware.js","./lib/CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/CSBIdentifier.js","./lib/EDFS":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/EDFS.js","./lib/FileHandler":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/FileHandler.js"}],"foldermq":[function(require,module,exports){
module.exports = {
					createQue: require("./lib/folderMQ").getFolderQueue
					//folderMQ: require("./lib/folderMQ")
};
},{"./lib/folderMQ":"/home/cosmin/Workspace/reorganizing/privatesky/modules/foldermq/lib/folderMQ.js"}],"node-fd-slicer":[function(require,module,exports){
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

},{"./lib/Blockchain":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/Blockchain.js","./lib/FolderPersistentPDS":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/FolderPersistentPDS.js","./lib/InMemoryPDS":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/InMemoryPDS.js","./lib/PersistentPDS":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/PersistentPDS.js","./lib/domain":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/domain/index.js","./lib/swarms":"/home/cosmin/Workspace/reorganizing/privatesky/modules/pskdb/lib/swarms/index.js"}],"signsensus":[function(require,module,exports){
module.exports = {
    consUtil: require('./consUtil')
};
},{"./consUtil":"/home/cosmin/Workspace/reorganizing/privatesky/modules/signsensus/lib/consUtil.js"}],"virtualmq":[function(require,module,exports){
const Server = require('./VirtualMQ.js');

module.exports = Server;

},{"./VirtualMQ.js":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/VirtualMQ.js"}],"yauzl":[function(require,module,exports){
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

},{"buffer":false,"buffer-crc32":"buffer-crc32","events":false,"fs":false,"stream":false,"timers":false,"util":false,"zlib":false}]},{},["/home/cosmin/Workspace/reorganizing/privatesky/builds/tmp/virtualMQ_intermediar.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZHMvdG1wL3ZpcnR1YWxNUV9pbnRlcm1lZGlhci5qcyIsIm1vZHVsZXMvZWRmcy9FREZTTWlkZGxld2FyZS5qcyIsIm1vZHVsZXMvZWRmcy9mbG93cy9Ccmlja3NNYW5hZ2VyLmpzIiwibW9kdWxlcy9lZGZzL2xpYi9Ccmljay5qcyIsIm1vZHVsZXMvZWRmcy9saWIvQ1NCSWRlbnRpZmllci5qcyIsIm1vZHVsZXMvZWRmcy9saWIvRURGUy5qcyIsIm1vZHVsZXMvZWRmcy9saWIvRURGU0Jsb2NrY2hhaW5Qcm94eS5qcyIsIm1vZHVsZXMvZWRmcy9saWIvRURGU1NlcnZpY2VQcm94eS5qcyIsIm1vZHVsZXMvZWRmcy9saWIvRmlsZUhhbmRsZXIuanMiLCJtb2R1bGVzL2VkZnMvbGliL0hlYWRlci5qcyIsIm1vZHVsZXMvZWRmcy9saWIvSGVhZGVyc0hpc3RvcnkuanMiLCJtb2R1bGVzL2VkZnMvbGliL1Jhd0NTQi5qcyIsIm1vZHVsZXMvZWRmcy9saWIvUm9vdENTQi5qcyIsIm1vZHVsZXMvZWRmcy91dGlscy9Bc3luY0Rpc3BhdGNoZXIuanMiLCJtb2R1bGVzL2VkZnMvdXRpbHMvRHNlZWRDYWdlLmpzIiwibW9kdWxlcy9mb2xkZXJtcS9saWIvZm9sZGVyTVEuanMiLCJtb2R1bGVzL25vZGUtZmQtc2xpY2VyL21vZHVsZXMvbm9kZS1wZW5kL2luZGV4LmpzIiwibW9kdWxlcy9wc2staHR0cC1jbGllbnQvbGliL3Bzay1hYnN0cmFjdC1jbGllbnQuanMiLCJtb2R1bGVzL3Bzay1odHRwLWNsaWVudC9saWIvcHNrLWJyb3dzZXItY2xpZW50LmpzIiwibW9kdWxlcy9wc2staHR0cC1jbGllbnQvbGliL3Bzay1ub2RlLWNsaWVudC5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL0Jsb2NrY2hhaW4uanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9Gb2xkZXJQZXJzaXN0ZW50UERTLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvSW5NZW1vcnlQRFMuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9QZXJzaXN0ZW50UERTLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0FDTFNjb3BlLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0FnZW50LmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0JhY2t1cC5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9DU0JNZXRhLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0NTQlJlZmVyZW5jZS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9Eb21haW5SZWZlcmVuY2UuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9kb21haW4vRW1iZWRkZWRGaWxlLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0ZpbGVSZWZlcmVuY2UuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9kb21haW4vS2V5LmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL2luZGV4LmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL3RyYW5zYWN0aW9ucy5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL3N3YXJtcy9hZ2VudHNTd2FybS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL3N3YXJtcy9kb21haW5Td2FybXMuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9zd2FybXMvaW5kZXguanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9zd2FybXMvc2hhcmVkUGhhc2VzLmpzIiwibW9kdWxlcy9zaWduc2Vuc3VzL2xpYi9jb25zVXRpbC5qcyIsIm1vZHVsZXMvdmlydHVhbG1xL1ZpcnR1YWxNUS5qcyIsIm1vZHVsZXMvdmlydHVhbG1xL2Zsb3dzL3JlbW90ZVN3YXJtaW5nLmpzIiwibW9kdWxlcy92aXJ0dWFsbXEvbGlicy9Ub2tlbkJ1Y2tldC5qcyIsIm1vZHVsZXMvdmlydHVhbG1xL2xpYnMvaHR0cC13cmFwcGVyL3NyYy9jbGFzc2VzL0NsaWVudC5qcyIsIm1vZHVsZXMvdmlydHVhbG1xL2xpYnMvaHR0cC13cmFwcGVyL3NyYy9jbGFzc2VzL01pZGRsZXdhcmUuanMiLCJtb2R1bGVzL3ZpcnR1YWxtcS9saWJzL2h0dHAtd3JhcHBlci9zcmMvY2xhc3Nlcy9Sb3V0ZXIuanMiLCJtb2R1bGVzL3ZpcnR1YWxtcS9saWJzL2h0dHAtd3JhcHBlci9zcmMvY2xhc3Nlcy9TZXJ2ZXIuanMiLCJtb2R1bGVzL3ZpcnR1YWxtcS9saWJzL2h0dHAtd3JhcHBlci9zcmMvaHR0cFV0aWxzLmpzIiwibW9kdWxlcy92aXJ0dWFsbXEvbGlicy9odHRwLXdyYXBwZXIvc3JjL2luZGV4LmpzIiwibW9kdWxlcy9idWZmZXItY3JjMzIvaW5kZXguanMiLCJtb2R1bGVzL2VkZnMvaW5kZXguanMiLCJtb2R1bGVzL2ZvbGRlcm1xL2luZGV4LmpzIiwibW9kdWxlcy9ub2RlLWZkLXNsaWNlci9pbmRleC5qcyIsIm1vZHVsZXMvcHNrLWh0dHAtY2xpZW50L2luZGV4LmpzIiwibW9kdWxlcy9wc2tkYi9pbmRleC5qcyIsIm1vZHVsZXMvc2lnbnNlbnN1cy9saWIvaW5kZXguanMiLCJtb2R1bGVzL3ZpcnR1YWxtcS9pbmRleC5qcyIsIm1vZHVsZXMveWF1emwvaW5kZXguanMiLCJtb2R1bGVzL3lhemwvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy9PQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDOVdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN0TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNqTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3p5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImdsb2JhbC52aXJ0dWFsTVFMb2FkTW9kdWxlcyA9IGZ1bmN0aW9uKCl7IFxuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1widmlydHVhbG1xXCJdID0gcmVxdWlyZShcInZpcnR1YWxtcVwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImZvbGRlcm1xXCJdID0gcmVxdWlyZShcImZvbGRlcm1xXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wieWF6bFwiXSA9IHJlcXVpcmUoXCJ5YXpsXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wieWF1emxcIl0gPSByZXF1aXJlKFwieWF1emxcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJidWZmZXItY3JjMzJcIl0gPSByZXF1aXJlKFwiYnVmZmVyLWNyYzMyXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wibm9kZS1mZC1zbGljZXJcIl0gPSByZXF1aXJlKFwibm9kZS1mZC1zbGljZXJcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJlZGZzXCJdID0gcmVxdWlyZShcImVkZnNcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJwc2tkYlwiXSA9IHJlcXVpcmUoXCJwc2tkYlwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcInBzay1odHRwLWNsaWVudFwiXSA9IHJlcXVpcmUoXCJwc2staHR0cC1jbGllbnRcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJzaWduc2Vuc3VzXCJdID0gcmVxdWlyZShcInNpZ25zZW5zdXNcIik7XG59XG5pZiAoZmFsc2UpIHtcblx0dmlydHVhbE1RTG9hZE1vZHVsZXMoKTtcbn07IFxuZ2xvYmFsLnZpcnR1YWxNUVJlcXVpcmUgPSByZXF1aXJlO1xuaWYgKHR5cGVvZiAkJCAhPT0gXCJ1bmRlZmluZWRcIikgeyAgICAgICAgICAgIFxuICAgICQkLnJlcXVpcmVCdW5kbGUoXCJ2aXJ0dWFsTVFcIik7XG59OyIsInJlcXVpcmUoXCIuL2Zsb3dzL0JyaWNrc01hbmFnZXJcIik7XG5cbmZ1bmN0aW9uIEVERlNNaWRkbGV3YXJlKHNlcnZlcikge1xuICAgIHNlcnZlci5wb3N0KCcvRURGUycsIChyZXEsIHJlcykgPT4ge1xuICAgICAgICAvL3ByZXZlbnRpbmcgaWxsZWdhbCBjaGFyYWN0ZXJzIHBhc3NpbmcgYXMgZmlsZUlkXG4gICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwO1xuICAgICAgICByZXMuZW5kKCk7XG4gICAgfSk7XG5cbiAgICBzZXJ2ZXIucG9zdCgnLzpmaWxlSWQnLCAocmVxLCByZXMpID0+IHtcbiAgICAgICAgJCQuZmxvdy5zdGFydChcIkJyaWNrc01hbmFnZXJcIikud3JpdGUocmVxLnBhcmFtcy5maWxlSWQsIHJlcSwgZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMTtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcblxuICAgICAgICAgICAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VBQ0NFUycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG4gICAgc2VydmVyLmdldCgnLzpmaWxlSWQnLCAocmVxLCByZXMpID0+IHtcbiAgICAgICAgcmVzLnNldEhlYWRlcihcImNvbnRlbnQtdHlwZVwiLCBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiKTtcbiAgICAgICAgJCQuZmxvdy5zdGFydChcIkJyaWNrc01hbmFnZXJcIikucmVhZChyZXEucGFyYW1zLmZpbGVJZCwgcmVzLCBmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwO1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gRURGU01pZGRsZXdhcmU7IiwiY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jb25zdCBQc2tIYXNoID0gcmVxdWlyZSgncHNrY3J5cHRvJykuUHNrSGFzaDtcblxuY29uc3QgZm9sZGVyTmFtZVNpemUgPSBwcm9jZXNzLmVudi5GT0xERVJfTkFNRV9TSVpFIHx8IDU7XG5jb25zdCBGSUxFX1NFUEFSQVRPUiA9ICctJztcbmxldCByb290Zm9sZGVyO1xuXG4kJC5mbG93LmRlc2NyaWJlKFwiQnJpY2tzTWFuYWdlclwiLCB7XG4gICAgaW5pdDogZnVuY3Rpb24ocm9vdEZvbGRlciwgY2FsbGJhY2spe1xuICAgICAgICBpZighcm9vdEZvbGRlcil7XG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJObyByb290IGZvbGRlciBzcGVjaWZpZWQhXCIpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByb290Rm9sZGVyID0gcGF0aC5yZXNvbHZlKHJvb3RGb2xkZXIpO1xuICAgICAgICB0aGlzLl9fZW5zdXJlRm9sZGVyU3RydWN0dXJlKHJvb3RGb2xkZXIsIGZ1bmN0aW9uKGVyciwgcGF0aCl7XG4gICAgICAgICAgICByb290Zm9sZGVyID0gcm9vdEZvbGRlcjtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcm9vdEZvbGRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgd3JpdGU6IGZ1bmN0aW9uKGZpbGVOYW1lLCByZWFkRmlsZVN0cmVhbSwgY2FsbGJhY2spe1xuICAgICAgICBpZighdGhpcy5fX3ZlcmlmeUZpbGVOYW1lKGZpbGVOYW1lLCBjYWxsYmFjaykpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoIXJlYWRGaWxlU3RyZWFtIHx8ICFyZWFkRmlsZVN0cmVhbS5waXBlIHx8IHR5cGVvZiByZWFkRmlsZVN0cmVhbS5waXBlICE9PSBcImZ1bmN0aW9uXCIpe1xuICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiU29tZXRoaW5nIHdyb25nIGhhcHBlbmVkXCIpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZvbGRlck5hbWUgPSBwYXRoLmpvaW4ocm9vdGZvbGRlciwgZmlsZU5hbWUuc3Vic3RyKDAsIGZvbGRlck5hbWVTaXplKSwgZmlsZU5hbWUpO1xuXG4gICAgICAgIGNvbnN0IHNlcmlhbCA9IHRoaXMuc2VyaWFsKCgpID0+IHt9KTtcblxuICAgICAgICBzZXJpYWwuX19lbnN1cmVGb2xkZXJTdHJ1Y3R1cmUoZm9sZGVyTmFtZSwgc2VyaWFsLl9fcHJvZ3Jlc3MpO1xuICAgICAgICBzZXJpYWwuX193cml0ZUZpbGUocmVhZEZpbGVTdHJlYW0sIGZvbGRlck5hbWUsIGZpbGVOYW1lLCBjYWxsYmFjayk7XG4gICAgfSxcbiAgICByZWFkOiBmdW5jdGlvbihmaWxlTmFtZSwgd3JpdGVGaWxlU3RyZWFtLCBjYWxsYmFjayl7XG4gICAgICAgIGlmKCF0aGlzLl9fdmVyaWZ5RmlsZU5hbWUoZmlsZU5hbWUsIGNhbGxiYWNrKSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmb2xkZXJQYXRoID0gcGF0aC5qb2luKHJvb3Rmb2xkZXIsIGZpbGVOYW1lLnN1YnN0cigwLCBmb2xkZXJOYW1lU2l6ZSkpO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBmaWxlTmFtZSk7XG4gICAgICAgIHRoaXMuX192ZXJpZnlGaWxlRXhpc3RlbmNlKGZpbGVQYXRoLCAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGlmKCFlcnIpe1xuICAgICAgICAgICAgICAgIHRoaXMuX19nZXRMYXRlc3RWZXJzaW9uTmFtZU9mRmlsZShmaWxlUGF0aCwgKGVyciwgZmlsZVZlcnNpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9fcmVhZEZpbGUod3JpdGVGaWxlU3RyZWFtLCBwYXRoLmpvaW4oZmlsZVBhdGgsIGZpbGVWZXJzaW9uLmZ1bGxWZXJzaW9uKSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiTm8gZmlsZSBmb3VuZC5cIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHJlYWRWZXJzaW9uOiBmdW5jdGlvbihmaWxlTmFtZSwgZmlsZVZlcnNpb24sIHdyaXRlRmlsZVN0cmVhbSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYoIXRoaXMuX192ZXJpZnlGaWxlTmFtZShmaWxlTmFtZSwgY2FsbGJhY2spKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZvbGRlclBhdGggPSBwYXRoLmpvaW4ocm9vdGZvbGRlciwgZmlsZU5hbWUuc3Vic3RyKDAsIGZvbGRlck5hbWVTaXplKSk7XG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGVOYW1lLCBmaWxlVmVyc2lvbik7XG4gICAgICAgIHRoaXMuX192ZXJpZnlGaWxlRXhpc3RlbmNlKGZpbGVQYXRoLCAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGlmKCFlcnIpe1xuICAgICAgICAgICAgICAgIHRoaXMuX19yZWFkRmlsZSh3cml0ZUZpbGVTdHJlYW0sIHBhdGguam9pbihmaWxlUGF0aCksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihcIk5vIGZpbGUgZm91bmQuXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBnZXRWZXJzaW9uc0ZvckZpbGU6IGZ1bmN0aW9uIChmaWxlTmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0aGlzLl9fdmVyaWZ5RmlsZU5hbWUoZmlsZU5hbWUsIGNhbGxiYWNrKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IHBhdGguam9pbihyb290Zm9sZGVyLCBmaWxlTmFtZS5zdWJzdHIoMCwgZm9sZGVyTmFtZVNpemUpLCBmaWxlTmFtZSk7XG4gICAgICAgIGZzLnJlYWRkaXIoZm9sZGVyUGF0aCwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgdG90YWxOdW1iZXJPZkZpbGVzID0gZmlsZXMubGVuZ3RoO1xuICAgICAgICAgICAgY29uc3QgZmlsZXNEYXRhID0gW107XG5cbiAgICAgICAgICAgIGxldCByZXNvbHZlZEZpbGVzID0gMDtcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3RhbE51bWJlck9mRmlsZXM7ICsraSkge1xuICAgICAgICAgICAgICAgIGZzLnN0YXQocGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGVzW2ldKSwgKGVyciwgc3RhdHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXNEYXRhLnB1c2goe3ZlcnNpb246IGZpbGVzW2ldLCBjcmVhdGlvblRpbWU6IG51bGwsIGNyZWF0aW9uVGltZU1zOiBudWxsfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmaWxlc0RhdGEucHVzaCh7dmVyc2lvbjogZmlsZXNbaV0sIGNyZWF0aW9uVGltZTogc3RhdHMuYmlydGh0aW1lLCBjcmVhdGlvblRpbWVNczogc3RhdHMuYmlydGh0aW1lTXN9KTtcblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlZEZpbGVzICs9IDE7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc29sdmVkRmlsZXMgPj0gdG90YWxOdW1iZXJPZkZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlc0RhdGEuc29ydCgoZmlyc3QsIHNlY29uZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0Q29tcGFyZURhdGEgPSBmaXJzdC5jcmVhdGlvblRpbWVNcyB8fCBmaXJzdC52ZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlY29uZENvbXBhcmVEYXRhID0gc2Vjb25kLmNyZWF0aW9uVGltZU1zIHx8IHNlY29uZC52ZXJzaW9uO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpcnN0Q29tcGFyZURhdGEgLSBzZWNvbmRDb21wYXJlRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBmaWxlc0RhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgY29tcGFyZVZlcnNpb25zOiBmdW5jdGlvbihib2R5U3RyZWFtLCBjYWxsYmFjaykge1xuICAgICAgICBsZXQgYm9keSA9ICcnO1xuXG4gICAgICAgIGJvZHlTdHJlYW0ub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgYm9keSArPSBkYXRhO1xuICAgICAgICB9KTtcblxuICAgICAgICBib2R5U3RyZWFtLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICBib2R5ID0gSlNPTi5wYXJzZShib2R5KTtcbiAgICAgICAgICAgICAgIHRoaXMuX19jb21wYXJlVmVyc2lvbnMoYm9keSwgY2FsbGJhY2spO1xuICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBfX3ZlcmlmeUZpbGVOYW1lOiBmdW5jdGlvbihmaWxlTmFtZSwgY2FsbGJhY2spe1xuICAgICAgICBpZighZmlsZU5hbWUgfHwgdHlwZW9mIGZpbGVOYW1lICE9IFwic3RyaW5nXCIpe1xuICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiTm8gZmlsZUlkIHNwZWNpZmllZC5cIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoZmlsZU5hbWUubGVuZ3RoIDwgZm9sZGVyTmFtZVNpemUpe1xuICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiRmlsZUlkIHRvbyBzbWFsbC4gXCIrZmlsZU5hbWUpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgX19lbnN1cmVGb2xkZXJTdHJ1Y3R1cmU6IGZ1bmN0aW9uKGZvbGRlciwgY2FsbGJhY2spe1xuICAgICAgICBmcy5ta2Rpcihmb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCBjYWxsYmFjayk7XG4gICAgfSxcbiAgICBfX3dyaXRlRmlsZTogZnVuY3Rpb24ocmVhZFN0cmVhbSwgZm9sZGVyUGF0aCwgZmlsZU5hbWUsIGNhbGxiYWNrKXtcbiAgICAgICAgY29uc3QgaGFzaCA9IG5ldyBQc2tIYXNoKCk7XG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGVOYW1lKTtcbiAgICAgICAgZnMuYWNjZXNzKGZpbGVQYXRoLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVyci5jb2RlID09PSBcIkVOT0VOVFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlYWRTdHJlYW0ub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzaC51cGRhdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlUGF0aCwge21vZGU6IDBvNDQ0fSk7XG5cbiAgICAgICAgICAgICAgICAgICAgd3JpdGVTdHJlYW0ub24oXCJmaW5pc2hcIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFzaERpZ2VzdCA9IGhhc2guZGlnZXN0KCkudG9TdHJpbmcoJ2hleCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaGFzaERpZ2VzdCAhPT0gZmlsZU5hbWUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLnVubGluayhmaWxlUGF0aCwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiQ29udGVudCBoYXNoIGFuZCBmaWxlbmFtZSBhcmUgbm90IHRoZSBzYW1lXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICB3cml0ZVN0cmVhbS5vbihcImVycm9yXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlU3RyZWFtLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkU3RyZWFtLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayguLi5hcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICByZWFkU3RyZWFtLnBpcGUod3JpdGVTdHJlYW0pO1xuICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgX19nZXROZXh0VmVyc2lvbkZpbGVOYW1lOiBmdW5jdGlvbiAoZm9sZGVyUGF0aCwgZmlsZU5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuX19nZXRMYXRlc3RWZXJzaW9uTmFtZU9mRmlsZShmb2xkZXJQYXRoLCAoZXJyLCBmaWxlVmVyc2lvbikgPT4ge1xuICAgICAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGZpbGVWZXJzaW9uLm51bWVyaWNWZXJzaW9uICsgMSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgX19nZXRMYXRlc3RWZXJzaW9uTmFtZU9mRmlsZTogZnVuY3Rpb24gKGZvbGRlclBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGZzLnJlYWRkaXIoZm9sZGVyUGF0aCwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBmaWxlVmVyc2lvbiA9IHtudW1lcmljVmVyc2lvbjogMCwgZnVsbFZlcnNpb246ICcwJyArIEZJTEVfU0VQQVJBVE9SfTtcblxuICAgICAgICAgICAgaWYoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFsbFZlcnNpb25zID0gZmlsZXMubWFwKGZpbGUgPT4gZmlsZS5zcGxpdChGSUxFX1NFUEFSQVRPUilbMF0pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsYXRlc3RGaWxlID0gdGhpcy5fX21heEVsZW1lbnQoYWxsVmVyc2lvbnMpO1xuICAgICAgICAgICAgICAgICAgICBmaWxlVmVyc2lvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWVyaWNWZXJzaW9uOiBwYXJzZUludChsYXRlc3RGaWxlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bGxWZXJzaW9uOiBmaWxlcy5maWx0ZXIoZmlsZSA9PiBmaWxlLnNwbGl0KEZJTEVfU0VQQVJBVE9SKVswXSA9PT0gbGF0ZXN0RmlsZS50b1N0cmluZygpKVswXVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBlLmNvZGUgPSAnaW52YWxpZF9maWxlX25hbWVfZm91bmQnO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgZmlsZVZlcnNpb24pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIF9fbWF4RWxlbWVudDogZnVuY3Rpb24gKG51bWJlcnMpIHtcbiAgICAgICAgbGV0IG1heCA9IG51bWJlcnNbMF07XG5cbiAgICAgICAgZm9yKGxldCBpID0gMTsgaSA8IG51bWJlcnMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIG1heCA9IE1hdGgubWF4KG1heCwgbnVtYmVyc1tpXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZihpc05hTihtYXgpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZWxlbWVudCBmb3VuZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1heDtcbiAgICB9LFxuICAgIF9fY29tcGFyZVZlcnNpb25zOiBmdW5jdGlvbiAoZmlsZXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGZpbGVzV2l0aENoYW5nZXMgPSBbXTtcbiAgICAgICAgY29uc3QgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKGZpbGVzKTtcbiAgICAgICAgbGV0IHJlbWFpbmluZyA9IGVudHJpZXMubGVuZ3RoO1xuXG4gICAgICAgIGlmKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGZpbGVzV2l0aENoYW5nZXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZW50cmllcy5mb3JFYWNoKChbZmlsZU5hbWUsIGZpbGVIYXNoXSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5nZXRWZXJzaW9uc0ZvckZpbGUoZmlsZU5hbWUsIChlcnIsIHZlcnNpb25zKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBpZihlcnIuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb25zID0gW107XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaCA9IHZlcnNpb25zLnNvbWUodmVyc2lvbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhc2ggPSB2ZXJzaW9uLnZlcnNpb24uc3BsaXQoRklMRV9TRVBBUkFUT1IpWzFdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFzaCA9PT0gZmlsZUhhc2g7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVzV2l0aENoYW5nZXMucHVzaChmaWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKC0tcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgZmlsZXNXaXRoQ2hhbmdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBfX3JlYWRGaWxlOiBmdW5jdGlvbih3cml0ZUZpbGVTdHJlYW0sIGZpbGVQYXRoLCBjYWxsYmFjayl7XG4gICAgICAgIGNvbnN0IHJlYWRTdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKGZpbGVQYXRoKTtcblxuICAgICAgICB3cml0ZUZpbGVTdHJlYW0ub24oXCJmaW5pc2hcIiwgY2FsbGJhY2spO1xuICAgICAgICB3cml0ZUZpbGVTdHJlYW0ub24oXCJlcnJvclwiLCBjYWxsYmFjayk7XG5cbiAgICAgICAgcmVhZFN0cmVhbS5waXBlKHdyaXRlRmlsZVN0cmVhbSk7XG4gICAgfSxcbiAgICBfX3Byb2dyZXNzOiBmdW5jdGlvbihlcnIsIHJlc3VsdCl7XG4gICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIF9fdmVyaWZ5RmlsZUV4aXN0ZW5jZTogZnVuY3Rpb24oZmlsZVBhdGgsIGNhbGxiYWNrKXtcbiAgICAgICAgZnMuc3RhdChmaWxlUGF0aCwgY2FsbGJhY2spO1xuICAgIH1cbn0pOyIsImNvbnN0IHBza0NyeXB0byA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5cbmZ1bmN0aW9uIEJyaWNrKGRhdGEpIHtcbiAgICBpZiAodHlwZW9mIGRhdGEgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgZGF0YSA9IEJ1ZmZlci5mcm9tKGRhdGEpO1xuICAgIH1cblxuICAgIHRoaXMuZ2VuZXJhdGVIYXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gcHNrQ3J5cHRvLnBza0hhc2goZGF0YSkudG9TdHJpbmcoXCJoZXhcIik7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RGF0YSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCcmljazsiLCJjb25zdCBjcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuXG5cbmZ1bmN0aW9uIENTQklkZW50aWZpZXIoaWQsIGRvbWFpbiwga2V5TGVuID0gMzIpIHtcbiAgICBsZXQgc2VlZDtcbiAgICBsZXQgZHNlZWQ7XG4gICAgbGV0IHVpZDtcbiAgICBsZXQgZW5jU2VlZDtcbiAgICAvL1RPRE86IGVsaW1pbmF0ZSB1bnVzZWQgdmFyXG4gICAgLy8gbGV0IGVuY0RzZWVkO1xuXG4gICAgaW5pdCgpO1xuXG4gICAgdGhpcy5nZXRTZWVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZighc2VlZCl7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcmV0dXJuIHNlZWQuIEFjY2VzcyBpcyBkZW5pZWQuXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0oc2VlZCk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RHNlZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKGRzZWVkKXtcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKGRzZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHNlZWQpe1xuICAgICAgICAgICAgZHNlZWQgPSBkZXJpdmVTZWVkKHNlZWQpO1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0oZHNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJldHVybiBkZXJpdmVkIHNlZWQuIEFjY2VzcyBpcyBkZW5pZWQuXCIpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFVpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYodWlkKXtcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKHVpZCkudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKGRzZWVkKXtcbiAgICAgICAgICAgIHVpZCA9IGNvbXB1dGVVaWQoZHNlZWQpO1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlQ29tcGFjdEZvcm0odWlkKS50b1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoc2VlZCl7XG4gICAgICAgICAgICBkc2VlZCA9IGRlcml2ZVNlZWQoc2VlZCk7XG4gICAgICAgICAgICB1aWQgPSBjb21wdXRlVWlkKGRzZWVkKTtcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKHVpZCkudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXR1cm4gdWlkXCIpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEVuY1NlZWQgPSBmdW5jdGlvbiAoZW5jcnlwdGlvbktleSkge1xuICAgICAgICBpZihlbmNTZWVkKXtcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKGVuY1NlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoIXNlZWQpe1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJldHVybiBlbmNTZWVkLiBBY2Nlc3MgaXMgZGVuaWVkXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFlbmNyeXB0aW9uS2V5KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcmV0dXJuIGVuY1NlZWQuIE5vIGVuY3J5cHRpb24ga2V5IHdhcyBwcm92aWRlZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vVE9ETzogZW5jcnlwdCBzZWVkIHVzaW5nIGVuY3J5cHRpb25LZXkuIEVuY3J5cHRpb24gYWxnb3JpdGhtIHJlbWFpbnMgdG8gYmUgY2hvc2VuXG4gICAgfTtcblxuXG5cbiAgICB0aGlzLmdldERvbWFpbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYoc2VlZCl7XG4gICAgICAgICAgICByZXR1cm4gc2VlZC5kb21haW47XG4gICAgICAgIH1cblxuICAgICAgICBpZihkc2VlZCl7XG4gICAgICAgICAgICByZXR1cm4gZHNlZWQuZG9tYWluO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQmFja3VwIFVSTHMgY291bGQgbm90IGJlIHJldHJpZXZlZC4gQWNjZXNzIGlzIGRlbmllZFwiKTtcbiAgICB9O1xuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gaW50ZXJuYWwgbWV0aG9kcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBmdW5jdGlvbiBpbml0KCkge1xuICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgICBpZiAoIWRvbWFpbikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIGRvbWFpbnMgcHJvdmlkZWQuXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZWVkID0gY3JlYXRlKCk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgY2xhc3NpZnlJZCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xhc3NpZnlJZCgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpZCAhPT0gXCJzdHJpbmdcIiAmJiAhQnVmZmVyLmlzQnVmZmVyKGlkKSAmJiAhKHR5cGVvZiBpZCA9PT0gXCJvYmplY3RcIiAmJiAhQnVmZmVyLmlzQnVmZmVyKGlkKSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSWQgbXVzdCBiZSBhIHN0cmluZyBvciBhIGJ1ZmZlci4gVGhlIHR5cGUgcHJvdmlkZWQgd2FzICR7dHlwZW9mIGlkfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXhwYW5kZWRJZCA9IGxvYWQoaWQpO1xuICAgICAgICBzd2l0Y2goZXhwYW5kZWRJZC50YWcpe1xuICAgICAgICAgICAgY2FzZSAncyc6XG4gICAgICAgICAgICAgICAgc2VlZCA9IGV4cGFuZGVkSWQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdkJzpcbiAgICAgICAgICAgICAgICBkc2VlZCA9IGV4cGFuZGVkSWQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1JzpcbiAgICAgICAgICAgICAgICB1aWQgPSBleHBhbmRlZElkO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZXMnOlxuICAgICAgICAgICAgICAgIGVuY1NlZWQgPSBleHBhbmRlZElkO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZWQnOlxuICAgICAgICAgICAgICAgIGVuY0RzZWVkID0gZXhwYW5kZWRJZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHRhZycpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlKCkge1xuICAgICAgICBjb25zdCBsb2NhbFNlZWQgPSB7fTtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGRvbWFpbikpIHtcbiAgICAgICAgICAgIGRvbWFpbiA9IFsgZG9tYWluIF07XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbFNlZWQudGFnICAgID0gJ3MnO1xuICAgICAgICBsb2NhbFNlZWQucmFuZG9tID0gY3J5cHRvLnJhbmRvbUJ5dGVzKGtleUxlbik7XG4gICAgICAgIGxvY2FsU2VlZC5kb21haW4gPSBkb21haW47XG5cbiAgICAgICAgcmV0dXJuIGxvY2FsU2VlZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXJpdmVTZWVkKHNlZWQpIHtcbiAgICAgICAgbGV0IGNvbXBhY3RTZWVkID0gc2VlZDtcblxuICAgICAgICBpZiAodHlwZW9mIHNlZWQgPT09ICdvYmplY3QnICYmICFCdWZmZXIuaXNCdWZmZXIoc2VlZCkpIHtcbiAgICAgICAgICAgIGNvbXBhY3RTZWVkID0gZ2VuZXJhdGVDb21wYWN0Rm9ybShzZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoc2VlZCkpIHtcbiAgICAgICAgICAgIGNvbXBhY3RTZWVkID0gc2VlZC50b1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbXBhY3RTZWVkWzBdID09PSAnZCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVHJpZWQgdG8gZGVyaXZlIGFuIGFscmVhZHkgZGVyaXZlZCBzZWVkLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGVjb2RlZENvbXBhY3RTZWVkID0gZGVjb2RlVVJJQ29tcG9uZW50KGNvbXBhY3RTZWVkKTtcbiAgICAgICAgY29uc3Qgc3BsaXRDb21wYWN0U2VlZCA9IGRlY29kZWRDb21wYWN0U2VlZC5zdWJzdHJpbmcoMSkuc3BsaXQoJ3wnKTtcbiAgICAgICAgY29uc3Qgc3RyU2VlZCA9IEJ1ZmZlci5mcm9tKHNwbGl0Q29tcGFjdFNlZWRbMF0sICdiYXNlNjQnKS50b1N0cmluZygnaGV4Jyk7XG4gICAgICAgIGNvbnN0IGRvbWFpbiA9IEJ1ZmZlci5mcm9tKHNwbGl0Q29tcGFjdFNlZWRbMV0sICdiYXNlNjQnKS50b1N0cmluZygpO1xuICAgICAgICBjb25zdCBkc2VlZCA9IHt9O1xuXG4gICAgICAgIGRzZWVkLnRhZyA9ICdkJztcbiAgICAgICAgZHNlZWQucmFuZG9tID0gY3J5cHRvLmRlcml2ZUtleShzdHJTZWVkLCBudWxsLCBrZXlMZW4pO1xuICAgICAgICBkc2VlZC5kb21haW4gPSBKU09OLnBhcnNlKGRvbWFpbik7XG5cbiAgICAgICAgcmV0dXJuIGRzZWVkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbXB1dGVVaWQoZHNlZWQpe1xuICAgICAgICBpZighZHNlZWQpe1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRHNlZWQgd2FzIG5vdCBwcm92aWRlZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgZHNlZWQgPT09IFwib2JqZWN0XCIgJiYgIUJ1ZmZlci5pc0J1ZmZlcihkc2VlZCkpIHtcbiAgICAgICAgICAgIGRzZWVkID0gZ2VuZXJhdGVDb21wYWN0Rm9ybShkc2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB1aWQgPSB7fTtcbiAgICAgICAgdWlkLnRhZyA9ICd1JztcbiAgICAgICAgdWlkLnJhbmRvbSA9IEJ1ZmZlci5mcm9tKGNyeXB0by5nZW5lcmF0ZVNhZmVVaWQoZHNlZWQpKTtcblxuICAgICAgICByZXR1cm4gdWlkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlQ29tcGFjdEZvcm0oe3RhZywgcmFuZG9tLCBkb21haW59KSB7XG4gICAgICAgIGxldCBjb21wYWN0SWQgPSB0YWcgKyByYW5kb20udG9TdHJpbmcoJ2Jhc2U2NCcpO1xuICAgICAgICBpZiAoZG9tYWluKSB7XG4gICAgICAgICAgICBjb21wYWN0SWQgKz0gJ3wnICsgQnVmZmVyLmZyb20oSlNPTi5zdHJpbmdpZnkoZG9tYWluKSkudG9TdHJpbmcoJ2Jhc2U2NCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBCdWZmZXIuZnJvbShlbmNvZGVVUklDb21wb25lbnQoY29tcGFjdElkKSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogdW51c2VkIGZ1bmN0aW9uISEhXG4gICAgLy8gZnVuY3Rpb24gZW5jcnlwdChpZCwgZW5jcnlwdGlvbktleSkge1xuICAgIC8vICAgICBpZihhcmd1bWVudHMubGVuZ3RoICE9PSAyKXtcbiAgICAvLyAgICAgICAgIHRocm93IG5ldyBFcnJvcihgV3JvbmcgbnVtYmVyIG9mIGFyZ3VtZW50cy4gRXhwZWN0ZWQ6IDI7IHByb3ZpZGVkICR7YXJndW1lbnRzLmxlbmd0aH1gKTtcbiAgICAvLyAgICAgfVxuXG4gICAgLy8gICAgIGxldCB0YWc7XG4gICAgLy8gICAgIGlmICh0eXBlb2YgaWQgPT09IFwib2JqZWN0XCIgJiYgIUJ1ZmZlci5pc0J1ZmZlcihpZCkpIHtcbiAgICAvLyAgICAgICAgIHRhZyA9IGlkLnRhZztcbiAgICAvLyAgICAgICAgIGlkID0gZ2VuZXJhdGVDb21wYWN0Rm9ybShpZCk7XG4gICAgLy8gICAgIH1cblxuICAgIC8vICAgICBpZiAodGFnID09PSAncycpIHtcbiAgICAvLyAgICAgICAgIC8vVE9ETyBlbmNyeXB0IHNlZWRcbiAgICAvLyAgICAgfWVsc2UgaWYgKHRhZyA9PT0gJ2QnKSB7XG4gICAgLy8gICAgICAgICAvL1RPRE8gZW5jcnlwdCBkc2VlZFxuICAgIC8vICAgICB9ZWxzZXtcbiAgICAvLyAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBwcm92aWRlZCBpZCBjYW5ub3QgYmUgZW5jcnlwdGVkXCIpO1xuICAgIC8vICAgICB9XG5cbiAgICAvLyB9XG5cbiAgICBmdW5jdGlvbiBsb2FkKGNvbXBhY3RJZCkge1xuICAgICAgICBpZih0eXBlb2YgY29tcGFjdElkID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIHR5cGUgc3RyaW5nIG9yIEJ1ZmZlci4gUmVjZWl2ZWQgdW5kZWZpbmVkYCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0eXBlb2YgY29tcGFjdElkICE9PSBcInN0cmluZ1wiKXtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29tcGFjdElkID09PSBcIm9iamVjdFwiICYmICFCdWZmZXIuaXNCdWZmZXIoY29tcGFjdElkKSkge1xuICAgICAgICAgICAgICAgIGNvbXBhY3RJZCA9IEJ1ZmZlci5mcm9tKGNvbXBhY3RJZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbXBhY3RJZCA9IGNvbXBhY3RJZC50b1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGVjb2RlZENvbXBhY3RJZCA9IGRlY29kZVVSSUNvbXBvbmVudChjb21wYWN0SWQpO1xuICAgICAgICBjb25zdCBpZCA9IHt9O1xuICAgICAgICBjb25zdCBzcGxpdENvbXBhY3RJZCA9IGRlY29kZWRDb21wYWN0SWQuc3Vic3RyaW5nKDEpLnNwbGl0KCd8Jyk7XG5cbiAgICAgICAgaWQudGFnID0gZGVjb2RlZENvbXBhY3RJZFswXTtcbiAgICAgICAgaWQucmFuZG9tID0gQnVmZmVyLmZyb20oc3BsaXRDb21wYWN0SWRbMF0sICdiYXNlNjQnKTtcblxuICAgICAgICBpZihzcGxpdENvbXBhY3RJZFsxXSAmJiBzcGxpdENvbXBhY3RJZFsxXS5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgIGlkLmRvbWFpbiA9IEpTT04ucGFyc2UoQnVmZmVyLmZyb20oc3BsaXRDb21wYWN0SWRbMV0sICdiYXNlNjQnKS50b1N0cmluZygpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ1NCSWRlbnRpZmllcjtcbiIsImNvbnN0IERTZWVkQ2FnZSA9IHJlcXVpcmUoXCIuLi91dGlscy9Ec2VlZENhZ2VcIik7XG5jb25zdCBSb290Q1NCID0gcmVxdWlyZShcIi4vUm9vdENTQlwiKTtcblxuZnVuY3Rpb24gRURGUygpe1xuXG4gICAgdGhpcy5nZXREc2VlZENhZ2UgPSBmdW5jdGlvbiAobG9jYWxGb2xkZXIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEU2VlZENhZ2UobG9jYWxGb2xkZXIpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFJvb3RDU0IgPSBmdW5jdGlvbiAoY3NiSWRlbnRpZmllcikge1xuICAgICAgICByZXR1cm4gbmV3IFJvb3RDU0IodW5kZWZpbmVkLCB1bmRlZmluZWQsIGNzYklkZW50aWZpZXIpO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRURGUzsiLCJjb25zdCBwc2tkYiA9IHJlcXVpcmUoXCJwc2tkYlwiKTtcblxuZnVuY3Rpb24gRURGU0Jsb2NrY2hhaW5Qcm94eSgpIHtcblxuXHRjb25zdCBibG9ja2NoYWluID0gcHNrZGIuc3RhcnRJbk1lbW9yeURCKCk7XG5cblx0dGhpcy5nZXRDU0JBbmNob3IgPSBmdW5jdGlvbiAoY3NiSWRlbnRpZmllciwgY2FsbGJhY2spIHtcblx0XHRjb25zdCB0cmFuc2FjdGlvbiA9IGJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG5cdFx0Y29uc3QgYXNzZXQgPSB0cmFuc2FjdGlvbi5sb29rdXAoXCJnbG9iYWwuQ1NCQW5jaG9yXCIsIGNzYklkZW50aWZpZXIuZ2V0VWlkKCkpO1xuXHRcdGNhbGxiYWNrKHVuZGVmaW5lZCwgYXNzZXQpO1xuXHR9O1xuXG5cdHRoaXMuc2V0Q1NCQW5jaG9yID0gZnVuY3Rpb24gKGNzYkFuY2hvciwgY2FsbGJhY2spIHtcblx0XHRjb25zdCB0cmFuc2FjdGlvbiA9IGJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG5cdFx0dHJhbnNhY3Rpb24uYWRkKGNzYkFuY2hvcik7XG5cdFx0YmxvY2tjaGFpbi5jb21taXQodHJhbnNhY3Rpb24pO1xuXHRcdGNhbGxiYWNrKCk7XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRURGU0Jsb2NrY2hhaW5Qcm94eTsiLCJyZXF1aXJlKFwicHNrLWh0dHAtY2xpZW50XCIpO1xuXG5mdW5jdGlvbiBFREZTU2VydmljZVByb3h5KHVybCkge1xuXG4gICAgZnVuY3Rpb24gYWRkQnJpY2soYnJpY2ssIGNhbGxiYWNrKSB7XG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KHVybCArIFwiL0VERlMvXCIgKyBicmljay5nZW5lcmF0ZUhhc2goKSwgYnJpY2suZ2V0RGF0YSgpLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEJyaWNrKGJyaWNrSGFzaCwgY2FsbGJhY2spIHtcbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cEdldCh1cmwgKyBcIi9FREZTL1wiICsgYnJpY2tIYXNoLCAoZXJyLCBkYXRhKSA9PntcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVsZXRlQnJpY2soYnJpY2tIYXNoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBhZGRCcmljayxcbiAgICAgICAgZ2V0QnJpY2ssXG4gICAgICAgIGRlbGV0ZUJyaWNrXG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFREZTU2VydmljZVByb3h5O1xuIiwiY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jb25zdCBFREZTU2VydmljZVByb3h5ID0gcmVxdWlyZShcIi4vRURGU1NlcnZpY2VQcm94eVwiKTtcbmNvbnN0IEJyaWNrID0gcmVxdWlyZShcIi4vQnJpY2tcIik7XG5jb25zdCBwc2tDcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuY29uc3QgQXN5bmNEaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uL3V0aWxzL0FzeW5jRGlzcGF0Y2hlclwiKTtcbmNvbnN0IHVybCA9IFwiaHR0cDovL2xvY2FsaG9zdDo4MDgwXCI7XG5cbmZ1bmN0aW9uIEZpbGVIYW5kbGVyKGZpbGVQYXRoLCBicmlja1NpemUsIGZpbGVCcmlja3NIYXNoZXMsIGxhc3RCcmlja1NpemUpIHtcblxuICAgIGNvbnN0IGVkZnNTZXJ2aWNlUHJveHkgPSBuZXcgRURGU1NlcnZpY2VQcm94eSh1cmwpO1xuXG5cbiAgICB0aGlzLmdldEZpbGVCcmlja3NIYXNoZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmaWxlQnJpY2tzSGFzaGVzO1xuXG4gICAgfTtcblxuICAgIHRoaXMuc2F2ZUZpbGUgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgX19pbml0aWFsU2F2aW5nKGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX19pbml0aWFsU2F2aW5nKGNhbGxiYWNrKSB7XG4gICAgICAgIGZzLnN0YXQoZmlsZVBhdGgsIChlcnIsIHN0YXRzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKChlcnIpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGFzdEJyaWNrU2l6ZSA9IHN0YXRzLnNpemUgJSBicmlja1NpemU7XG4gICAgICAgICAgICBjb25zdCBmaWxlU2l6ZSA9IHN0YXRzLnNpemU7XG5cbiAgICAgICAgICAgIGZzLm9wZW4oZmlsZVBhdGgsIFwiclwiLCAoZXJyLCBmZCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgYXN5bmNEaXNwYXRjaGVyID0gbmV3IEFzeW5jRGlzcGF0Y2hlcigoZXJyb3JzLCByZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBub0JyaWNrcyA9IE1hdGgucm91bmQoZmlsZVNpemUgLyBicmlja1NpemUgKyAxKTtcbiAgICAgICAgICAgICAgICBhc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eShub0JyaWNrcyk7XG5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vQnJpY2tzOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJyaWNrRGF0YSA9IEJ1ZmZlci5hbGxvYyhicmlja1NpemUpO1xuICAgICAgICAgICAgICAgICAgICBmcy5yZWFkKGZkLCBicmlja0RhdGEsIDAsIGJyaWNrU2l6ZSwgaSAqIGJyaWNrU2l6ZSwgKGVyciwgYnl0ZXNSZWFkLCBidWZmZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYnJpY2sgPSBuZXcgQnJpY2soYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkZnNTZXJ2aWNlUHJveHkuYWRkQnJpY2soYnJpY2ssIChlcnIpID0+IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9fcmVhZEZpbGVGcm9tU3RhcnQoZmQsIGJyaWNrU2l6ZSwgZmlsZVNpemUsIHBvc2l0aW9uLCBicmlja3NIYXNoZXMgPSBbXSwgY2FsbGJhY2spIHtcbiAgICAgICAgbGV0IGJyaWNrRGF0YSA9IEJ1ZmZlci5hbGxvYyhicmlja1NpemUpO1xuICAgICAgICBmcy5yZWFkKGZkLCBicmlja0RhdGEsIDAsIGJyaWNrU2l6ZSwgcG9zaXRpb24sIChlcnIsIGJ5dGVzUmVhZCwgYnVmZmVyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHBvc2l0aW9uICs9IGJyaWNrU2l6ZTtcbiAgICAgICAgICAgIGJyaWNrc0hhc2hlcy5wdXNoKHBza0NyeXB0by5wc2tIYXNoKGJ1ZmZlcikpO1xuICAgICAgICAgICAgaWYgKHBvc2l0aW9uIDw9IGZpbGVTaXplKSB7XG4gICAgICAgICAgICAgICAgX19yZWFkRmlsZUZyb21TdGFydChmZCwgYnJpY2tTaXplLCBmaWxlU2l6ZSwgcG9zaXRpb24sIGJyaWNrc0hhc2hlcywgY2FsbGJhY2spO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgbGFzdEJyaWNrU2l6ZSA9IGJ5dGVzUmVhZDtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGJyaWNrc0hhc2hlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9fcmVhZEZpbGVCYWNrd2FyZHMoZmQsIGJyaWNrU2l6ZSwgZmlsZVNpemUsIHBvc2l0aW9uID0gbGFzdEJyaWNrU2l6ZSwgYnJpY2tzSGFzaGVzID0gW10sIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgbGV0IGJyaWNrRGF0YSA9IEJ1ZmZlci5hbGxvYyhicmlja1NpemUpO1xuICAgICAgICBmcy5yZWFkKGZkLCBicmlja0RhdGEsIDAsIGJyaWNrU2l6ZSwgZmlsZVNpemUgLSBwb3NpdGlvbiwgKGVyciwgYnl0ZXNSZWFkLCBidWZmZXIpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJpY2tzSGFzaGVzLnB1c2gocHNrQ3J5cHRvLnBza0hhc2goYnVmZmVyKSk7XG4gICAgICAgICAgICBpZiAocG9zaXRpb24gPD0gZmlsZVNpemUpIHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbiArPSBicmlja1NpemU7XG4gICAgICAgICAgICAgICAgX19yZWFkRmlsZUJhY2t3YXJkcyhmZCwgYnJpY2tTaXplLCBmaWxlU2l6ZSwgcG9zaXRpb24sIGNhbGxiYWNrKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsZUhhbmRsZXI7XG5cbi8vcmRpZmYgYWxnb3JpdGhtXG4vL1xuIiwiY29uc3QgQnJpY2sgPSByZXF1aXJlKFwiLi9Ccmlja1wiKTtcbmNvbnN0IHBza0NyeXB0byA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5cbmZ1bmN0aW9uIEhlYWRlcihwcmV2aW91c0hlYWRlckhhc2gsIGZpbGVzLCB0cmFuc2FjdGlvbnMpe1xuICAgIHByZXZpb3VzSGVhZGVySGFzaCA9IHByZXZpb3VzSGVhZGVySGFzaCB8fCBcIlwiO1xuICAgIGZpbGVzID0gZmlsZXMgfHwge307XG4gICAgdHJhbnNhY3Rpb25zID0gdHJhbnNhY3Rpb25zIHx8IFtdO1xuXG4gICAgdGhpcy50b0JyaWNrID0gZnVuY3Rpb24gKGVuY3J5cHRpb25LZXkpIHtcbiAgICAgICAgY29uc3QgaGVhZGVyT2JqID0ge3ByZXZpb3VzSGVhZGVySGFzaCwgZmlsZXMsIHRyYW5zYWN0aW9uc307XG4gICAgICAgIGNvbnN0IGVuY3J5cHRlZEhlYWRlck9iaiA9IHBza0NyeXB0by5lbmNyeXB0KGhlYWRlck9iaiwgZW5jcnlwdGlvbktleSk7XG4gICAgICAgIHJldHVybiBuZXcgQnJpY2soZW5jcnlwdGVkSGVhZGVyT2JqKTtcbiAgICB9O1xuXG4gICAgdGhpcy5mcm9tQnJpY2sgPSBmdW5jdGlvbiAoYnJpY2ssIGRlY3J5cHRpb25LZXkpIHtcbiAgICAgICAgY29uc3QgaGVhZGVyT2JqID0gSlNPTi5wYXJzZShwc2tDcnlwdG8uZGVjcnlwdChicmljaywgZGVjcnlwdGlvbktleSkpO1xuICAgICAgICBwcmV2aW91c0hlYWRlckhhc2ggPSBoZWFkZXJPYmoucHJldmlvdXNIZWFkZXJIYXNoO1xuICAgICAgICBmaWxlcyA9IGhlYWRlck9iai5maWxlcztcbiAgICAgICAgdHJhbnNhY3Rpb25zID0gaGVhZGVyT2JqLnRyYW5zYWN0aW9ucztcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRQcmV2aW91c0hlYWRlckhhc2ggPSBmdW5jdGlvbiAoaGFzaCkge1xuICAgICAgICBwcmV2aW91c0hlYWRlckhhc2ggPSBoYXNoO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFByZXZpb3VzSGVhZGVySGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzSGVhZGVySGFzaDtcbiAgICB9O1xuXG4gICAgdGhpcy5hZGRUcmFuc2FjdGlvbnMgPSBmdW5jdGlvbiAobmV3VHJhbnNhY3Rpb25zKSB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShuZXdUcmFuc2FjdGlvbnMpKSB7XG4gICAgICAgICAgICBuZXdUcmFuc2FjdGlvbnMgPSBbIG5ld1RyYW5zYWN0aW9ucyBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJhbnNhY3Rpb25zID0gdHJhbnNhY3Rpb25zLmNvbmNhdChuZXdUcmFuc2FjdGlvbnMpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFRyYW5zYWN0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRyYW5zYWN0aW9ucztcbiAgICB9O1xuXG4gICAgdGhpcy5hZGRGaWxlcyA9IGZ1bmN0aW9uIChuZXdGaWxlcykge1xuICAgICAgICBpZiAodHlwZW9mIG5ld0ZpbGVzICE9PSBcIm9iamVjdFwiIHx8IEFycmF5LmlzQXJyYXkobmV3RmlsZXMpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdHlwZS4gRXhwZWN0ZWQgbm9uLWFycmF5IG9iamVjdCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV3RmlsZXNLZXlzID0gT2JqZWN0LmtleXMobmV3RmlsZXMpO1xuICAgICAgICBuZXdGaWxlc0tleXMuZm9yRWFjaCgoZmlsZUFsaWFzKSA9PiB7XG4gICAgICAgICAgICBmaWxlc1tmaWxlQWxpYXNdID0gbmV3RmlsZXNbZmlsZUFsaWFzXTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RmlsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmaWxlcztcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRIZWFkZXJPYmplY3QgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHByZXZpb3VzSGVhZGVySGFzaCxcbiAgICAgICAgICAgIGZpbGVzLFxuICAgICAgICAgICAgdHJhbnNhY3Rpb25zXG4gICAgICAgIH07XG4gICAgfTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEhlYWRlcjsiLCJjb25zdCBCcmljayA9IHJlcXVpcmUoXCIuL0JyaWNrXCIpO1xuY29uc3QgcHNrQ3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcblxuZnVuY3Rpb24gSGVhZGVyc0hpc3RvcnkoaW5pdEhlYWRlcnMpIHtcblxuICAgIGxldCBoZWFkZXJzID0gaW5pdEhlYWRlcnMgfHwgW107XG4gICAgdGhpcy5hZGRIZWFkZXIgPSBmdW5jdGlvbiAoaGVhZGVyQnJpY2ssIGVuY3J5cHRpb25LZXkpIHtcbiAgICAgICAgY29uc3QgaGVhZGVyRW50cnkgPSB7fTtcbiAgICAgICAgY29uc3QgaGVhZGVySGFzaCA9IGhlYWRlckJyaWNrLmdlbmVyYXRlSGFzaCgpO1xuICAgICAgICBoZWFkZXJFbnRyeVtoZWFkZXJIYXNoXSA9IGVuY3J5cHRpb25LZXk7XG4gICAgICAgIGhlYWRlcnMucHVzaChoZWFkZXJFbnRyeSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SGVhZGVycyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGhlYWRlcnM7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0TGFzdEhlYWRlckhhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChoZWFkZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGhlYWRlckVudHJ5ID0gaGVhZGVyc1toZWFkZXJzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGhlYWRlckVudHJ5KVswXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnRvQnJpY2sgPSBmdW5jdGlvbiAoZW5jcnlwdGlvbktleSkge1xuICAgICAgICByZXR1cm4gbmV3IEJyaWNrKHBza0NyeXB0by5lbmNyeXB0KGhlYWRlcnMsIGVuY3J5cHRpb25LZXkpKTtcbiAgICB9O1xuXG4gICAgdGhpcy5mcm9tQnJpY2sgPSBmdW5jdGlvbiAoYnJpY2ssIGRlY3J5cHRpb25LZXkpIHtcbiAgICAgICAgaGVhZGVycyA9IEpTT04ucGFyc2UocHNrQ3J5cHRvLmRlY3J5cHQoYnJpY2ssIGRlY3J5cHRpb25LZXkpLnRvU3RyaW5nKCkpO1xuICAgIH07XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBIZWFkZXJzSGlzdG9yeTsiLCJjb25zdCBPd00gPSByZXF1aXJlKCdzd2FybXV0aWxzJykuT3dNO1xuY29uc3QgcHNrZGIgPSByZXF1aXJlKCdwc2tkYicpO1xuXG5mdW5jdGlvbiBSYXdDU0IoaW5pdERhdGEpIHtcblx0Y29uc3QgZGF0YSA9IG5ldyBPd00oe2Jsb2NrY2hhaW46IGluaXREYXRhfSk7XG5cdGNvbnN0IGJsb2NrY2hhaW4gPSBwc2tkYi5zdGFydERiKHtnZXRJbml0VmFsdWVzLCBwZXJzaXN0fSk7XG5cblx0aWYoIWRhdGEuYmxvY2tjaGFpbikge1xuXHRcdGRhdGEuYmxvY2tjaGFpbiA9IHtcblx0XHRcdHRyYW5zYWN0aW9uTG9nOiBbXVxuXHRcdH07XG5cdH1cblxuXHRkYXRhLmVtYmVkRmlsZSA9IGZ1bmN0aW9uIChmaWxlQWxpYXMsIGZpbGVEYXRhKSB7XG5cdFx0Y29uc3QgZW1iZWRkZWRBc3NldCA9IGRhdGEuZ2V0QXNzZXQoXCJnbG9iYWwuRW1iZWRkZWRGaWxlXCIsIGZpbGVBbGlhcyk7XG5cdFx0aWYoZW1iZWRkZWRBc3NldC5pc1BlcnNpc3RlZCgpKXtcblx0XHRcdGNvbnNvbGUubG9nKGBGaWxlIHdpdGggYWxpYXMgJHtmaWxlQWxpYXN9IGFscmVhZHkgZXhpc3RzYCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0ZGF0YS5ibG9ja2NoYWluLmVtYmVkZGVkRmlsZXNbZmlsZUFsaWFzXSA9IGZpbGVEYXRhO1xuXHRcdGRhdGEuc2F2ZUFzc2V0KGVtYmVkZGVkQXNzZXQpO1xuXHR9O1xuXG5cdGRhdGEuYXR0YWNoRmlsZSA9IGZ1bmN0aW9uIChmaWxlQWxpYXMsIHBhdGgsIHNlZWQpIHtcblx0XHRkYXRhLm1vZGlmeUFzc2V0KFwiZ2xvYmFsLkZpbGVSZWZlcmVuY2VcIiwgZmlsZUFsaWFzLCAoZmlsZSkgPT4ge1xuXHRcdFx0aWYgKCFmaWxlLmlzRW1wdHkoKSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhgRmlsZSB3aXRoIGFsaWFzICR7ZmlsZUFsaWFzfSBhbHJlYWR5IGV4aXN0c2ApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cbi8vXG5cdFx0XHRmaWxlLmluaXQoZmlsZUFsaWFzLCBwYXRoLCBzZWVkKTtcblx0XHR9KTtcblx0fTtcblxuXHRkYXRhLnNhdmVBc3NldCA9IGZ1bmN0aW9uKGFzc2V0KSB7XG5cdFx0Y29uc3QgdHJhbnNhY3Rpb24gPSBibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuXHRcdHRyYW5zYWN0aW9uLmFkZChhc3NldCk7XG5cdFx0YmxvY2tjaGFpbi5jb21taXQodHJhbnNhY3Rpb24pO1xuXHR9O1xuXG5cdGRhdGEubW9kaWZ5QXNzZXQgPSBmdW5jdGlvbihhc3NldFR5cGUsIGFpZCwgYXNzZXRNb2RpZmllcikge1xuXHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcblx0XHRjb25zdCBhc3NldCA9IHRyYW5zYWN0aW9uLmxvb2t1cChhc3NldFR5cGUsIGFpZCk7XG5cdFx0YXNzZXRNb2RpZmllcihhc3NldCk7XG5cblx0XHR0cmFuc2FjdGlvbi5hZGQoYXNzZXQpO1xuXHRcdGJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcblx0fTtcblxuXHRkYXRhLmdldEFzc2V0ID0gZnVuY3Rpb24gKGFzc2V0VHlwZSwgYWlkKSB7XG5cdFx0Y29uc3QgdHJhbnNhY3Rpb24gPSBibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuXHRcdHJldHVybiB0cmFuc2FjdGlvbi5sb29rdXAoYXNzZXRUeXBlLCBhaWQpO1xuXHR9O1xuXG5cdGRhdGEuZ2V0QWxsQXNzZXRzID0gZnVuY3Rpb24oYXNzZXRUeXBlKSB7XG5cdFx0Y29uc3QgdHJhbnNhY3Rpb24gPSBibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuXHRcdHJldHVybiB0cmFuc2FjdGlvbi5sb2FkQXNzZXRzKGFzc2V0VHlwZSk7XG5cdH07XG5cblx0ZGF0YS5hcHBseVRyYW5zYWN0aW9uID0gZnVuY3Rpb24gKHRyYW5zYWN0aW9uU3dhcm0pIHtcblx0XHQvLyBjb25zdCB0cmFuc2FjdGlvbiA9IGJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih0cmFuc2FjdGlvblN3YXJtKTtcblx0XHRibG9ja2NoYWluLmNvbW1pdFN3YXJtKHRyYW5zYWN0aW9uU3dhcm0pO1xuXHRcdC8vIGJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcblx0fTtcblxuXHRkYXRhLmdldFRyYW5zYWN0aW9uTG9nID0gZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiBkYXRhLmJsb2NrY2hhaW4udHJhbnNhY3Rpb25Mb2c7XG5cdH07XG5cdC8qIGludGVybmFsIGZ1bmN0aW9ucyAqL1xuXG5cdGZ1bmN0aW9uIHBlcnNpc3QodHJhbnNhY3Rpb25Mb2csIGN1cnJlbnRWYWx1ZXMsIGN1cnJlbnRQdWxzZSkge1xuXHRcdHRyYW5zYWN0aW9uTG9nLmN1cnJlbnRQdWxzZSA9IGN1cnJlbnRQdWxzZTtcblxuXHRcdGRhdGEuYmxvY2tjaGFpbi5jdXJyZW50VmFsdWVzID0gY3VycmVudFZhbHVlcztcblx0XHRkYXRhLmJsb2NrY2hhaW4udHJhbnNhY3Rpb25Mb2cucHVzaCh0cmFuc2FjdGlvbkxvZyk7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRJbml0VmFsdWVzICgpIHtcblx0XHRpZighZGF0YS5ibG9ja2NoYWluIHx8ICFkYXRhLmJsb2NrY2hhaW4uY3VycmVudFZhbHVlcykge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdHJldHVybiBkYXRhLmJsb2NrY2hhaW4uY3VycmVudFZhbHVlcztcblx0fVxuXG5cdC8vIFRPRE86IHVudXNlZCBmdW5jdGlvblxuICAgIC8vIGZ1bmN0aW9uIG1rU2luZ2xlTGluZShzdHIpIHtcblx0Ly8gXHRyZXR1cm4gc3RyLnJlcGxhY2UoL1xcbnxcXHIvZywgXCJcIik7XG5cdC8vIH1cblxuXHRyZXR1cm4gZGF0YTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSYXdDU0I7IiwiY29uc3QgUmF3Q1NCID0gcmVxdWlyZSgnLi9SYXdDU0InKTtcbmNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ3Bza2NyeXB0bycpO1xuLy9UT0RPOiB1bnVzZWQgdmFyXG4vLyBjb25zdCBDU0JDYWNoZSA9IHJlcXVpcmUoXCIuL0NTQkNhY2hlXCIpO1xuY29uc3QgQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoXCIuL0NTQklkZW50aWZpZXJcIik7XG5jb25zdCBIZWFkZXIgPSByZXF1aXJlKFwiLi9IZWFkZXJcIik7XG5jb25zdCBIZWFkZXJzSGlzdG9yeSA9IHJlcXVpcmUoXCIuL0hlYWRlcnNIaXN0b3J5XCIpO1xuY29uc3QgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJyk7XG5jb25zdCBFREZTU2VydmljZVByb3h5ID0gcmVxdWlyZShcIi4vRURGU1NlcnZpY2VQcm94eVwiKTtcbmNvbnN0IEVERlNCbG9ja2NoYWluUHJveHkgPSByZXF1aXJlKFwiLi9FREZTQmxvY2tjaGFpblByb3h5XCIpO1xuY29uc3QgQXN5bmNEaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uL3V0aWxzL0FzeW5jRGlzcGF0Y2hlclwiKTtcblxuY29uc3QgQnJpY2sgPSByZXF1aXJlKFwiLi9Ccmlja1wiKTtcbmNvbnN0IHVybCA9IFwiaHR0cDovL2xvY2FsaG9zdDo4MDgwXCI7XG5jb25zdCBlZGZzU2VydmljZVByb3h5ID0gbmV3IEVERlNTZXJ2aWNlUHJveHkodXJsKTtcbi8qKlxuICpcbiAqIEBwYXJhbSBsb2NhbEZvbGRlciAgIC0gcmVxdWlyZWRcbiAqIEBwYXJhbSBjdXJyZW50UmF3Q1NCIC0gb3B0aW9uYWxcbiAqIEBwYXJhbSBjc2JJZGVudGlmaWVyIC0gcmVxdWlyZWRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBSb290Q1NCKGxvY2FsRm9sZGVyLCBjdXJyZW50UmF3Q1NCLCBjc2JJZGVudGlmaWVyKSB7XG4gICAgLy8gaWYgKCFsb2NhbEZvbGRlciB8fCAhY3NiSWRlbnRpZmllcikge1xuICAgIC8vICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgcmVxdWlyZWQgcGFyYW1ldGVycycpO1xuICAgIC8vIH1cblxuXG4gICAgY29uc3QgZXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgY29uc3QgZWRmc0Jsb2NrY2hhaW5Qcm94eSA9IG5ldyBFREZTQmxvY2tjaGFpblByb3h5KGNzYklkZW50aWZpZXIuZ2V0RG9tYWluKCkpO1xuICAgIHRoaXMub24gPSBldmVudC5vbjtcbiAgICB0aGlzLm9mZiA9IGV2ZW50LnJlbW92ZUxpc3RlbmVyO1xuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzID0gZXZlbnQucmVtb3ZlQWxsTGlzdGVuZXJzO1xuICAgIHRoaXMuZW1pdCA9IGV2ZW50LmVtaXQ7XG5cbiAgICB0aGlzLmdldE1pZFJvb3QgPSBmdW5jdGlvbiAoQ1NCUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcbiAgICB9O1xuXG4gICAgdGhpcy5jcmVhdGVSYXdDU0IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmF3Q1NCKCk7XG4gICAgfTtcblxuICAgIHRoaXMubG9hZFJhd0NTQiA9IGZ1bmN0aW9uIChDU0JQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIWN1cnJlbnRSYXdDU0IpIHtcbiAgICAgICAgICAgIGVkZnNCbG9ja2NoYWluUHJveHkuZ2V0Q1NCQW5jaG9yKGNzYklkZW50aWZpZXIsIChlcnIsIGNzYkFuY2hvcikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgX19sb2FkUmF3Q1NCKGNzYklkZW50aWZpZXIsIGNzYkFuY2hvci5oZWFkZXJIaXN0b3J5SGFzaCwoZXJyLCByYXdDU0IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50UmF3Q1NCID0gcmF3Q1NCO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChDU0JQYXRoIHx8IENTQlBhdGggIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRSYXdDU0IoQ1NCUGF0aCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBjdXJyZW50UmF3Q1NCKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghQ1NCUGF0aCB8fCBDU0JQYXRoID09PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIGN1cnJlbnRSYXdDU0IpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sb2FkQXNzZXRGcm9tUGF0aChDU0JQYXRoLCAoZXJyLCBhc3NldCwgcmF3Q1NCKSA9PiB7XG5cbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFhc3NldCB8fCAhYXNzZXQuZHNlZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKGBUaGUgQ1NCUGF0aCAke0NTQlBhdGh9IGlzIGludmFsaWQuYCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfX2xvYWRSYXdDU0IobmV3IENTQklkZW50aWZpZXIoYXNzZXQuZHNlZWQpLCBhc3NldC5oZWFkZXJIaXN0b3J5SGFzaCwgY2FsbGJhY2spO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5sb2FkQXNzZXRGcm9tUGF0aCA9IGZ1bmN0aW9uIChDU0JQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICBsZXQgcHJvY2Vzc2VkUGF0aCA9IF9fc3BsaXRQYXRoKENTQlBhdGgpO1xuICAgICAgICBpZiAoIWN1cnJlbnRSYXdDU0IpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ2N1cnJlbnRSYXdDU0IgZG9lcyBub3QgZXhpc3QnKSk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgQ1NCUmVmZXJlbmNlID0gbnVsbDtcbiAgICAgICAgaWYgKHByb2Nlc3NlZFBhdGguQ1NCQWxpYXNlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBuZXh0QWxpYXMgPSBwcm9jZXNzZWRQYXRoLkNTQkFsaWFzZXNbMF07XG4gICAgICAgICAgICBDU0JSZWZlcmVuY2UgPSBjdXJyZW50UmF3Q1NCLmdldEFzc2V0KCdnbG9iYWwuQ1NCUmVmZXJlbmNlJywgbmV4dEFsaWFzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghcHJvY2Vzc2VkUGF0aC5hc3NldFR5cGUgfHwgIXByb2Nlc3NlZFBhdGguYXNzZXRBaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdOb3QgYXNzZXQgdHlwZSBvciBpZCBzcGVjaWZpZWQgaW4gQ1NCUGF0aCcpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgQ1NCUmVmZXJlbmNlID0gY3VycmVudFJhd0NTQi5nZXRBc3NldChwcm9jZXNzZWRQYXRoLmFzc2V0VHlwZSwgcHJvY2Vzc2VkUGF0aC5hc3NldEFpZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvY2Vzc2VkUGF0aC5DU0JBbGlhc2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIENTQlJlZmVyZW5jZSwgY3VycmVudFJhd0NTQik7XG4gICAgICAgIH1cblxuICAgICAgICBwcm9jZXNzZWRQYXRoLkNTQkFsaWFzZXMuc2hpZnQoKTtcblxuICAgICAgICBpZighQ1NCUmVmZXJlbmNlIHx8ICFDU0JSZWZlcmVuY2UuZHNlZWQpe1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihgVGhlIENTQlBhdGggJHtDU0JQYXRofSBpcyBpbnZhbGlkYCkpO1xuICAgICAgICB9XG4gICAgICAgIF9fbG9hZEFzc2V0RnJvbVBhdGgocHJvY2Vzc2VkUGF0aCwgbmV3IENTQklkZW50aWZpZXIoQ1NCUmVmZXJlbmNlLmRzZWVkKSwgQ1NCUmVmZXJlbmNlLmhlYWRlckhpc3RvcnlIYXNoLCAwLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIHRoaXMuc2F2ZUFzc2V0VG9QYXRoID0gZnVuY3Rpb24gKENTQlBhdGgsIGFzc2V0LCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBzcGxpdFBhdGggPSBfX3NwbGl0UGF0aChDU0JQYXRoLCB7a2VlcEFsaWFzZXNBc1N0cmluZzogdHJ1ZX0pO1xuICAgICAgICB0aGlzLmxvYWRSYXdDU0Ioc3BsaXRQYXRoLkNTQkFsaWFzZXMsIChlcnIsIHJhd0NTQikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByYXdDU0Iuc2F2ZUFzc2V0KGFzc2V0KTtcbiAgICAgICAgICAgICAgICB0aGlzLnNhdmVSYXdDU0IocmF3Q1NCLCBzcGxpdFBhdGguQ1NCQWxpYXNlcywgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuc2F2ZVJhd0NTQiA9IGZ1bmN0aW9uIChyYXdDU0IsIENTQlBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghQ1NCUGF0aCB8fCBDU0JQYXRoID09PSAnJykge1xuICAgICAgICAgICAgaWYgKHJhd0NTQikge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRSYXdDU0IgPSByYXdDU0I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0cmFuc2FjdGlvbnMgPSByYXdDU0IuZ2V0VHJhbnNhY3Rpb25Mb2coKTtcbiAgICAgICAgY29uc3QgaGVhZGVyc0hpc3RvcnkgPSBuZXcgSGVhZGVyc0hpc3RvcnkoKTtcbiAgICAgICAgY29uc3QgaGVhZGVyID0gbmV3IEhlYWRlcigpO1xuICAgICAgICBlZGZzQmxvY2tjaGFpblByb3h5LmdldENTQkFuY2hvcihjc2JJZGVudGlmaWVyLCAoZXJyLCBjc2JBbmNob3IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpOyAvL1RPRE86IGJldHRlciBoYW5kbGluZ1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNzYkFuY2hvciAmJiB0eXBlb2YgY3NiQW5jaG9yLmhlYWRlckhpc3RvcnlIYXNoICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgZWRmc1NlcnZpY2VQcm94eS5nZXRCcmljayhjc2JBbmNob3IuaGVhZGVySGlzdG9yeUhhc2gsIChlcnIsIGhlYWRlcnNIaXN0b3J5QnJpY2spID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzSGlzdG9yeS5mcm9tQnJpY2soaGVhZGVyc0hpc3RvcnlCcmljaywgY3NiSWRlbnRpZmllci5nZXREc2VlZCgpKTtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyLnNldFByZXZpb3VzSGVhZGVySGFzaChoZWFkZXJzSGlzdG9yeS5nZXRMYXN0SGVhZGVySGFzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9fc2F2ZVJhd0NTQihjc2JBbmNob3IsIGhlYWRlcnNIaXN0b3J5LCBoZWFkZXIsIHRyYW5zYWN0aW9ucywgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3NiQW5jaG9yLmluaXQoY3NiSWRlbnRpZmllci5nZXRVaWQoKSwgY3NiSWRlbnRpZmllci5nZXRVaWQoKSk7XG4gICAgICAgICAgICBfX3NhdmVSYXdDU0IoY3NiQW5jaG9yLCBoZWFkZXJzSGlzdG9yeSwgaGVhZGVyLCB0cmFuc2FjdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuXG4gICAgLyogLS0tLS0tLS0tLS0tLS0tLS0tLSBJTlRFUk5BTCBNRVRIT0RTIC0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gQ1NCUGF0aDogc3RyaW5nIC0gaW50ZXJuYWwgcGF0aCB0aGF0IGxvb2tzIGxpa2UgL3tDU0JOYW1lMX0ve0NTQk5hbWUyfTp7YXNzZXRUeXBlfTp7YXNzZXRBbGlhc09ySWR9XG4gICAgICogQHBhcmFtIG9wdGlvbnM6b2JqZWN0XG4gICAgICogQHJldHVybnMge3tDU0JBbGlhc2VzOiBbc3RyaW5nXSwgYXNzZXRBaWQ6ICgqfHVuZGVmaW5lZCksIGFzc2V0VHlwZTogKCp8dW5kZWZpbmVkKX19XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfX3NwbGl0UGF0aChDU0JQYXRoLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgY29uc3QgcGF0aFNlcGFyYXRvciA9ICcvJztcblxuICAgICAgICBpZiAoQ1NCUGF0aC5zdGFydHNXaXRoKHBhdGhTZXBhcmF0b3IpKSB7XG4gICAgICAgICAgICBDU0JQYXRoID0gQ1NCUGF0aC5zdWJzdHJpbmcoMSk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgQ1NCQWxpYXNlcyA9IENTQlBhdGguc3BsaXQocGF0aFNlcGFyYXRvcik7XG4gICAgICAgIGlmIChDU0JBbGlhc2VzLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ1NCUGF0aCB0b28gc2hvcnQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGxhc3RJbmRleCA9IENTQkFsaWFzZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgY29uc3Qgb3B0aW9uYWxBc3NldFNlbGVjdG9yID0gQ1NCQWxpYXNlc1tsYXN0SW5kZXhdLnNwbGl0KCc6Jyk7XG5cbiAgICAgICAgaWYgKG9wdGlvbmFsQXNzZXRTZWxlY3RvclswXSA9PT0gJycpIHtcbiAgICAgICAgICAgIENTQkFsaWFzZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIENTQkFsaWFzZXNbbGFzdEluZGV4XSA9IG9wdGlvbmFsQXNzZXRTZWxlY3RvclswXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghb3B0aW9uYWxBc3NldFNlbGVjdG9yWzFdICYmICFvcHRpb25hbEFzc2V0U2VsZWN0b3JbMl0pIHtcbiAgICAgICAgICAgIG9wdGlvbmFsQXNzZXRTZWxlY3RvclsxXSA9ICdnbG9iYWwuQ1NCUmVmZXJlbmNlJztcbiAgICAgICAgICAgIG9wdGlvbmFsQXNzZXRTZWxlY3RvclsyXSA9IENTQkFsaWFzZXNbbGFzdEluZGV4XTtcbiAgICAgICAgICAgIENTQkFsaWFzZXMucG9wKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5rZWVwQWxpYXNlc0FzU3RyaW5nID09PSB0cnVlKSB7XG4gICAgICAgICAgICBDU0JBbGlhc2VzID0gQ1NCQWxpYXNlcy5qb2luKCcvJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIENTQkFsaWFzZXM6IENTQkFsaWFzZXMsXG4gICAgICAgICAgICBhc3NldFR5cGU6IG9wdGlvbmFsQXNzZXRTZWxlY3RvclsxXSxcbiAgICAgICAgICAgIGFzc2V0QWlkOiBvcHRpb25hbEFzc2V0U2VsZWN0b3JbMl1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKiBmdW5jdGlvbiBfX2luaXRpYWxpemVBc3NldHMocmF3Q1NCLCBjc2JSZWYsIGJhY2t1cFVybHMpIHtcblxuICAgICAgICAgbGV0IGNzYk1ldGE7XG4gICAgICAgICBsZXQgaXNNYXN0ZXI7XG5cbiAgICAgICAgIGNzYk1ldGEgPSByYXdDU0IuZ2V0QXNzZXQoJ2dsb2JhbC5DU0JNZXRhJywgJ21ldGEnKTtcbiAgICAgICAgIGlmIChjdXJyZW50UmF3Q1NCID09PSByYXdDU0IpIHtcbiAgICAgICAgICAgICBpc01hc3RlciA9IHR5cGVvZiBjc2JNZXRhLmlzTWFzdGVyID09PSAndW5kZWZpbmVkJyA/IHRydWUgOiBjc2JNZXRhLmlzTWFzdGVyO1xuICAgICAgICAgICAgIGlmICghY3NiTWV0YS5pZCkge1xuICAgICAgICAgICAgICAgICBjc2JNZXRhLmluaXQoJCQudWlkR2VuZXJhdG9yLnNhZmVfdXVpZCgpKTtcbiAgICAgICAgICAgICAgICAgY3NiTWV0YS5zZXRJc01hc3Rlcihpc01hc3Rlcik7XG4gICAgICAgICAgICAgICAgIHJhd0NTQi5zYXZlQXNzZXQoY3NiTWV0YSk7XG4gICAgICAgICAgICAgfVxuICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICBiYWNrdXBVcmxzLmZvckVhY2goKHVybCkgPT4ge1xuICAgICAgICAgICAgICAgICBjb25zdCB1aWQgPSAkJC51aWRHZW5lcmF0b3Iuc2FmZV91dWlkKCk7XG4gICAgICAgICAgICAgICAgIGNvbnN0IGJhY2t1cCA9IHJhd0NTQi5nZXRBc3NldCgnZ2xvYmFsLkJhY2t1cCcsIHVpZCk7XG4gICAgICAgICAgICAgICAgIGJhY2t1cC5pbml0KHVpZCwgdXJsKTtcbiAgICAgICAgICAgICAgICAgcmF3Q1NCLnNhdmVBc3NldChiYWNrdXApO1xuICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgaXNNYXN0ZXIgPSB0eXBlb2YgY3NiTWV0YS5pc01hc3RlciA9PT0gJ3VuZGVmaW5lZCcgPyBmYWxzZSA6IGNzYk1ldGEuaXNNYXN0ZXI7XG4gICAgICAgICAgICAgY3NiTWV0YS5pbml0KGNzYlJlZi5nZXRNZXRhZGF0YSgnc3dhcm1JZCcpKTtcbiAgICAgICAgICAgICBjc2JNZXRhLnNldElzTWFzdGVyKGlzTWFzdGVyKTtcbiAgICAgICAgICAgICByYXdDU0Iuc2F2ZUFzc2V0KGNzYk1ldGEpO1xuICAgICAgICAgfVxuICAgICB9ICovXG5cbiAgICBmdW5jdGlvbiBfX3NhdmVSYXdDU0IoY3NiQW5jaG9yLCBoZWFkZXJzSGlzdG9yeSwgaGVhZGVyLCB0cmFuc2FjdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGFzeW5jRGlzcGF0Y2hlciA9IG5ldyBBc3luY0Rpc3BhdGNoZXIoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaGVhZGVyRW5jcnlwdGlvbktleSA9IGNyeXB0by5yYW5kb21CeXRlcygzMik7XG4gICAgICAgICAgICBjb25zdCBoZWFkZXJCcmljayA9IGhlYWRlci50b0JyaWNrKGhlYWRlckVuY3J5cHRpb25LZXkpO1xuICAgICAgICAgICAgZWRmc1NlcnZpY2VQcm94eS5hZGRCcmljayhoZWFkZXJCcmljaywgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaGVhZGVyc0hpc3RvcnkuYWRkSGVhZGVyKGhlYWRlckJyaWNrLCBoZWFkZXJFbmNyeXB0aW9uS2V5KTtcbiAgICAgICAgICAgICAgICBjb25zdCBoaXN0b3J5QnJpY2sgPSBoZWFkZXJzSGlzdG9yeS50b0JyaWNrKGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKSk7XG4gICAgICAgICAgICAgICAgZWRmc1NlcnZpY2VQcm94eS5hZGRCcmljayhoaXN0b3J5QnJpY2ssIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjc2JBbmNob3IudXBkYXRlSGVhZGVySGlzdG9yeUhhc2goaGlzdG9yeUJyaWNrLmdlbmVyYXRlSGFzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgZWRmc0Jsb2NrY2hhaW5Qcm94eS5zZXRDU0JBbmNob3IoY3NiQW5jaG9yLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkodHJhbnNhY3Rpb25zLmxlbmd0aCk7XG4gICAgICAgIHRyYW5zYWN0aW9ucy5mb3JFYWNoKCh0cmFuc2FjdGlvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgZW5jcnlwdGlvbktleSA9IGNyeXB0by5yYW5kb21CeXRlcygzMik7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2FjdGlvbkJyaWNrID0gbmV3IEJyaWNrKGNyeXB0by5lbmNyeXB0KHRyYW5zYWN0aW9uLCBlbmNyeXB0aW9uS2V5KSk7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2FjdGlvbkVudHJ5ID0ge307XG4gICAgICAgICAgICBjb25zdCB0cmFuc2FjdGlvbkhhc2ggPSB0cmFuc2FjdGlvbkJyaWNrLmdlbmVyYXRlSGFzaCgpO1xuICAgICAgICAgICAgdHJhbnNhY3Rpb25FbnRyeVt0cmFuc2FjdGlvbkhhc2hdID0gZW5jcnlwdGlvbktleTtcbiAgICAgICAgICAgIGhlYWRlci5hZGRUcmFuc2FjdGlvbnModHJhbnNhY3Rpb25FbnRyeSk7XG4gICAgICAgICAgICBlZGZzU2VydmljZVByb3h5LmFkZEJyaWNrKHRyYW5zYWN0aW9uQnJpY2ssIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG5cbiAgICBmdW5jdGlvbiBfX2xvYWRSYXdDU0IobG9jYWxDU0JJZGVudGlmaWVyLCBsb2NhbEhlYWRlckhpc3RvcnlIYXNoLCBjYWxsYmFjaykge1xuICAgICAgICBpZih0eXBlb2YgbG9jYWxIZWFkZXJIaXN0b3J5SGFzaCA9PT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gbG9jYWxIZWFkZXJIaXN0b3J5SGFzaDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJhd0NTQiA9IG5ldyBSYXdDU0IoKTtcbiAgICAgICAgZWRmc1NlcnZpY2VQcm94eS5nZXRCcmljayhsb2NhbEhlYWRlckhpc3RvcnlIYXNoLCAoZXJyLCBoZWFkZXJzSGlzdG9yeUJyaWNrRGF0YSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBoZWFkZXJzSGlzdG9yeSA9IG5ldyBIZWFkZXJzSGlzdG9yeSgpO1xuICAgICAgICAgICAgaGVhZGVyc0hpc3RvcnkuZnJvbUJyaWNrKGhlYWRlcnNIaXN0b3J5QnJpY2tEYXRhLCBsb2NhbENTQklkZW50aWZpZXIuZ2V0RHNlZWQoKSk7XG4gICAgICAgICAgICBjb25zdCBoZWFkZXJzQXN5bmNEaXNwYXRjaGVyID0gbmV3IEFzeW5jRGlzcGF0Y2hlcigoZXJyb3JzLCByZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCByYXdDU0IpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGhlYWRlcnMgPSBoZWFkZXJzSGlzdG9yeS5nZXRIZWFkZXJzKCk7XG4gICAgICAgICAgICBoZWFkZXJzQXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkoaGVhZGVycy5sZW5ndGgpO1xuICAgICAgICAgICAgaGVhZGVycy5mb3JFYWNoKChoZWFkZXJFbnRyeSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlckhhc2ggPSBPYmplY3Qua2V5cyhoZWFkZXJFbnRyeSlbMF07XG4gICAgICAgICAgICAgICAgZWRmc1NlcnZpY2VQcm94eS5nZXRCcmljayhoZWFkZXJIYXNoLCAoZXJyLCBoZWFkZXJCcmljaykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBuZXcgSGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlci5mcm9tQnJpY2soaGVhZGVyQnJpY2ssIGhlYWRlckVudHJ5W2hlYWRlckhhc2hdKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNhY3Rpb25zRW50cmllcyA9IGhlYWRlci5nZXRUcmFuc2FjdGlvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNhY3Rpb25zQXN5bmNEaXNwYXRjaGVyID0gbmV3IEFzeW5jRGlzcGF0Y2hlcigoZXJyb3JzLCByZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHRzT2JqID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzLmZvckVhY2goKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IE9iamVjdC5rZXlzKHJlc3VsdClbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0c09ialtrZXldID0gT2JqZWN0LnZhbHVlcyhyZXN1bHRba2V5XSlbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb25zRW50cmllcy5mb3JFYWNoKCh0cmFuc2FjdGlvbkVudHJ5KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNhY3Rpb25IYXNoID0gT2JqZWN0LmtleXModHJhbnNhY3Rpb25FbnRyeSlbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmF3Q1NCLmFwcGx5VHJhbnNhY3Rpb24ocmVzdWx0c09ialt0cmFuc2FjdGlvbkhhc2hdLnN3YXJtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzQXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbnNBc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eSh0cmFuc2FjdGlvbnNFbnRyaWVzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uc0VudHJpZXMuZm9yRWFjaCgodHJhbnNhY3Rpb25FbnRyeSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNhY3Rpb25IYXNoID0gT2JqZWN0LmtleXModHJhbnNhY3Rpb25FbnRyeSlbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBlZGZzU2VydmljZVByb3h5LmdldEJyaWNrKHRyYW5zYWN0aW9uSGFzaCwgKGVyciwgdHJhbnNhY3Rpb25CcmljaykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNhY3Rpb25PYmogPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbk9ialt0cmFuc2FjdGlvbkhhc2hdID0gY3J5cHRvLmRlY3J5cHRPYmplY3QodHJhbnNhY3Rpb25CcmljaywgdHJhbnNhY3Rpb25FbnRyeVt0cmFuc2FjdGlvbkhhc2hdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbnNBc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQodW5kZWZpbmVkLCB0cmFuc2FjdGlvbk9iaik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfX2xvYWRBc3NldEZyb21QYXRoKHByb2Nlc3NlZFBhdGgsIGxvY2FsQ1NCSWRlbnRpZmllciwgbG9jYWxIZWFkZXJIaXN0b3J5SGFzaCwgY3VycmVudEluZGV4LCBjYWxsYmFjaykge1xuICAgICAgICBfX2xvYWRSYXdDU0IobG9jYWxDU0JJZGVudGlmaWVyLCAoZXJyLCByYXdDU0IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRJbmRleCA8IHByb2Nlc3NlZFBhdGguQ1NCQWxpYXNlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXh0QWxpYXMgPSBwcm9jZXNzZWRQYXRoLkNTQkFsaWFzZXNbY3VycmVudEluZGV4XTtcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldCA9IHJhd0NTQi5nZXRBc3NldChcImdsb2JhbC5DU0JSZWZlcmVuY2VcIiwgbmV4dEFsaWFzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdDU0JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoYXNzZXQuZHNlZWQpO1xuXG4gICAgICAgICAgICAgICAgX19sb2FkQXNzZXRGcm9tUGF0aChwcm9jZXNzZWRQYXRoLCBuZXdDU0JJZGVudGlmaWVyLCArK2N1cnJlbnRJbmRleCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYXNzZXQgPSByYXdDU0IuZ2V0QXNzZXQocHJvY2Vzc2VkUGF0aC5hc3NldFR5cGUsIHByb2Nlc3NlZFBhdGguYXNzZXRBaWQpO1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgYXNzZXQsIHJhd0NTQik7XG5cbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFJvb3RDU0I7XG4iLCJcbmZ1bmN0aW9uIEFzeW5jRGlzcGF0Y2hlcihmaW5hbENhbGxiYWNrKSB7XG5cdGxldCByZXN1bHRzID0gW107XG5cdGxldCBlcnJvcnMgPSBbXTtcblxuXHRsZXQgc3RhcnRlZCA9IDA7XG5cblx0ZnVuY3Rpb24gbWFya09uZUFzRmluaXNoZWQoZXJyLCByZXMpIHtcblx0XHRpZihlcnIpIHtcblx0XHRcdGVycm9ycy5wdXNoKGVycik7XG5cdFx0fVxuXG5cdFx0aWYoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcblx0XHRcdGFyZ3VtZW50c1swXSA9IHVuZGVmaW5lZDtcblx0XHRcdHJlcyA9IGFyZ3VtZW50cztcblx0XHR9XG5cblx0XHRpZih0eXBlb2YgcmVzICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdFx0XHRyZXN1bHRzLnB1c2gocmVzKTtcblx0XHR9XG5cblx0XHRpZigtLXN0YXJ0ZWQgPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxDYWxsYmFjaygpO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGRpc3BhdGNoRW1wdHkoYW1vdW50ID0gMSkge1xuXHRcdHN0YXJ0ZWQgKz0gYW1vdW50O1xuXHR9XG5cblx0ZnVuY3Rpb24gY2FsbENhbGxiYWNrKCkge1xuXHQgICAgaWYoZXJyb3JzLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgICAgIGVycm9ycyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG5cdCAgICBpZihyZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgICAgIHJlc3VsdHMgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBmaW5hbENhbGxiYWNrKGVycm9ycywgcmVzdWx0cyk7XG4gICAgfVxuXG5cdHJldHVybiB7XG5cdFx0ZGlzcGF0Y2hFbXB0eSxcblx0XHRtYXJrT25lQXNGaW5pc2hlZFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFzeW5jRGlzcGF0Y2hlcjsiLCJjb25zdCBjcnlwdG8gPSByZXF1aXJlKCdwc2tjcnlwdG8nKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZShcIi4uL2xpYi9DU0JJZGVudGlmaWVyXCIpO1xuXG5mdW5jdGlvbiBEc2VlZENhZ2UobG9jYWxGb2xkZXIpIHtcblx0Y29uc3QgZHNlZWRGb2xkZXIgPSBwYXRoLmpvaW4obG9jYWxGb2xkZXIsICcucHJpdmF0ZVNreScpO1xuXHRjb25zdCBkc2VlZFBhdGggPSBwYXRoLmpvaW4oZHNlZWRGb2xkZXIsICdkc2VlZCcpO1xuXG5cdGZ1bmN0aW9uIGxvYWREc2VlZEJhY2t1cHMocGluLCBjYWxsYmFjaykge1xuXHRcdGZzLm1rZGlyKGRzZWVkRm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgKGVycikgPT4ge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblxuXHRcdFx0Y3J5cHRvLmxvYWREYXRhKHBpbiwgZHNlZWRQYXRoLCAoZXJyLCBkc2VlZEJhY2t1cHMpID0+IHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRkc2VlZEJhY2t1cHMgPSBKU09OLnBhcnNlKGRzZWVkQmFja3Vwcy50b1N0cmluZygpKTtcblx0XHRcdFx0fWNhdGNoIChlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGUpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0bGV0IGNzYklkZW50aWZpZXI7XG5cdFx0XHRcdGlmIChkc2VlZEJhY2t1cHMuZHNlZWQgJiYgIUJ1ZmZlci5pc0J1ZmZlcihkc2VlZEJhY2t1cHMuZHNlZWQpKSB7XG5cdFx0XHRcdFx0ZHNlZWRCYWNrdXBzLmRzZWVkID0gQnVmZmVyLmZyb20oZHNlZWRCYWNrdXBzLmRzZWVkKTtcblx0XHRcdFx0XHRjc2JJZGVudGlmaWVyID0gbmV3IENTQklkZW50aWZpZXIoZHNlZWRCYWNrdXBzLmRzZWVkKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhbGxiYWNrKHVuZGVmaW5lZCwgY3NiSWRlbnRpZmllciwgZHNlZWRCYWNrdXBzLmJhY2t1cHMpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBzYXZlRHNlZWRCYWNrdXBzKHBpbiwgY3NiSWRlbnRpZmllciwgYmFja3VwcywgY2FsbGJhY2spIHtcblx0XHRmcy5ta2Rpcihkc2VlZEZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIChlcnIpID0+IHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHR9XG5cblx0XHRcdGxldCBkc2VlZDtcblx0XHRcdGlmKGNzYklkZW50aWZpZXIpe1xuXHRcdFx0XHRkc2VlZCA9IGNzYklkZW50aWZpZXIuZ2V0RHNlZWQoKTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGRzZWVkQmFja3VwcyA9IEpTT04uc3RyaW5naWZ5KHtcblx0XHRcdFx0ZHNlZWQsXG5cdFx0XHRcdGJhY2t1cHNcblx0XHRcdH0pO1xuXG5cdFx0XHRjcnlwdG8uc2F2ZURhdGEoQnVmZmVyLmZyb20oZHNlZWRCYWNrdXBzKSwgcGluLCBkc2VlZFBhdGgsIGNhbGxiYWNrKTtcblx0XHR9KTtcblx0fVxuXG5cblx0cmV0dXJuIHtcblx0XHRsb2FkRHNlZWRCYWNrdXBzLFxuXHRcdHNhdmVEc2VlZEJhY2t1cHMsXG5cdH07XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBEc2VlZENhZ2U7IiwiY29uc3QgdXRpbHMgPSByZXF1aXJlKFwic3dhcm11dGlsc1wiKTtcbmNvbnN0IE93TSA9IHV0aWxzLk93TTtcbnZhciBiZWVzSGVhbGVyID0gdXRpbHMuYmVlc0hlYWxlcjtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5cblxuLy9UT0RPOiBwcmV2ZW50IGEgY2xhc3Mgb2YgcmFjZSBjb25kaXRpb24gdHlwZSBvZiBlcnJvcnMgYnkgc2lnbmFsaW5nIHdpdGggZmlsZXMgbWV0YWRhdGEgdG8gdGhlIHdhdGNoZXIgd2hlbiBpdCBpcyBzYWZlIHRvIGNvbnN1bWVcblxuZnVuY3Rpb24gRm9sZGVyTVEoZm9sZGVyLCBjYWxsYmFjayA9ICgpID0+IHt9KXtcblxuXHRpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0fVxuXG5cdGZvbGRlciA9IHBhdGgubm9ybWFsaXplKGZvbGRlcik7XG5cblx0ZnMubWtkaXIoZm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgZnVuY3Rpb24oZXJyLCByZXMpe1xuXHRcdGZzLmV4aXN0cyhmb2xkZXIsIGZ1bmN0aW9uKGV4aXN0cykge1xuXHRcdFx0aWYgKGV4aXN0cykge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgZm9sZGVyKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHRmdW5jdGlvbiBta0ZpbGVOYW1lKHN3YXJtUmF3KXtcblx0XHRsZXQgbWV0YSA9IE93TS5wcm90b3R5cGUuZ2V0TWV0YUZyb20oc3dhcm1SYXcpO1xuXHRcdGxldCBuYW1lID0gYCR7Zm9sZGVyfSR7cGF0aC5zZXB9JHttZXRhLnN3YXJtSWR9LiR7bWV0YS5zd2FybVR5cGVOYW1lfWA7XG5cdFx0Y29uc3QgdW5pcXVlID0gbWV0YS5waGFzZUlkIHx8ICQkLnVpZEdlbmVyYXRvci5zYWZlX3V1aWQoKTtcblxuXHRcdG5hbWUgPSBuYW1lK2AuJHt1bmlxdWV9YDtcblx0XHRyZXR1cm4gcGF0aC5ub3JtYWxpemUobmFtZSk7XG5cdH1cblxuXHR0aGlzLmdldEhhbmRsZXIgPSBmdW5jdGlvbigpe1xuXHRcdGlmKHByb2R1Y2VyKXtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk9ubHkgb25lIGNvbnN1bWVyIGlzIGFsbG93ZWQhXCIpO1xuXHRcdH1cblx0XHRwcm9kdWNlciA9IHRydWU7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHNlbmRTd2FybVNlcmlhbGl6YXRpb246IGZ1bmN0aW9uKHNlcmlhbGl6YXRpb24sIGNhbGxiYWNrKXtcblx0XHRcdFx0aWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdFx0XHRcdH1cblx0XHRcdFx0d3JpdGVGaWxlKG1rRmlsZU5hbWUoSlNPTi5wYXJzZShzZXJpYWxpemF0aW9uKSksIHNlcmlhbGl6YXRpb24sIGNhbGxiYWNrKTtcblx0XHRcdH0sXG5cdFx0XHRhZGRTdHJlYW0gOiBmdW5jdGlvbihzdHJlYW0sIGNhbGxiYWNrKXtcblx0XHRcdFx0aWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZighc3RyZWFtIHx8ICFzdHJlYW0ucGlwZSB8fCB0eXBlb2Ygc3RyZWFtLnBpcGUgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcIlNvbWV0aGluZyB3cm9uZyBoYXBwZW5lZFwiKSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsZXQgc3dhcm0gPSBcIlwiO1xuXHRcdFx0XHRzdHJlYW0ub24oJ2RhdGEnLCAoY2h1bmspID0+e1xuXHRcdFx0XHRcdHN3YXJtICs9IGNodW5rO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRzdHJlYW0ub24oXCJlbmRcIiwgKCkgPT4ge1xuXHRcdFx0XHRcdHdyaXRlRmlsZShta0ZpbGVOYW1lKEpTT04ucGFyc2Uoc3dhcm0pKSwgc3dhcm0sIGNhbGxiYWNrKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0c3RyZWFtLm9uKFwiZXJyb3JcIiwgKGVycikgPT57XG5cdFx0XHRcdFx0Y2FsbGJhY2soZXJyKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdFx0YWRkU3dhcm0gOiBmdW5jdGlvbihzd2FybSwgY2FsbGJhY2spe1xuXHRcdFx0XHRpZighY2FsbGJhY2spe1xuXHRcdFx0XHRcdGNhbGxiYWNrID0gJCQuZGVmYXVsdEVycm9ySGFuZGxpbmdJbXBsZW1lbnRhdGlvbjtcblx0XHRcdFx0fWVsc2UgaWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRiZWVzSGVhbGVyLmFzSlNPTihzd2FybSxudWxsLCBudWxsLCBmdW5jdGlvbihlcnIsIHJlcyl7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0d3JpdGVGaWxlKG1rRmlsZU5hbWUocmVzKSwgSihyZXMpLCBjYWxsYmFjayk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdHNlbmRTd2FybUZvckV4ZWN1dGlvbjogZnVuY3Rpb24oc3dhcm0sIGNhbGxiYWNrKXtcblx0XHRcdFx0aWYoIWNhbGxiYWNrKXtcblx0XHRcdFx0XHRjYWxsYmFjayA9ICQkLmRlZmF1bHRFcnJvckhhbmRsaW5nSW1wbGVtZW50YXRpb247XG5cdFx0XHRcdH1lbHNlIGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YmVlc0hlYWxlci5hc0pTT04oc3dhcm0sIE93TS5wcm90b3R5cGUuZ2V0TWV0YUZyb20oc3dhcm0sIFwicGhhc2VOYW1lXCIpLCBPd00ucHJvdG90eXBlLmdldE1ldGFGcm9tKHN3YXJtLCBcImFyZ3NcIiksIGZ1bmN0aW9uKGVyciwgcmVzKXtcblx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR2YXIgZmlsZSA9IG1rRmlsZU5hbWUocmVzKTtcblx0XHRcdFx0XHR2YXIgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KHJlcyk7XG5cblx0XHRcdFx0XHQvL2lmIHRoZXJlIGFyZSBubyBtb3JlIEZEJ3MgZm9yIGZpbGVzIHRvIGJlIHdyaXR0ZW4gd2UgcmV0cnkuXG5cdFx0XHRcdFx0ZnVuY3Rpb24gd3JhcHBlcihlcnJvciwgcmVzdWx0KXtcblx0XHRcdFx0XHRcdGlmKGVycm9yKXtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coYENhdWdodCBhbiB3cml0ZSBlcnJvci4gUmV0cnkgdG8gd3JpdGUgZmlsZSBbJHtmaWxlfV1gKTtcblx0XHRcdFx0XHRcdFx0c2V0VGltZW91dCgoKT0+e1xuXHRcdFx0XHRcdFx0XHRcdHdyaXRlRmlsZShmaWxlLCBjb250ZW50LCB3cmFwcGVyKTtcblx0XHRcdFx0XHRcdFx0fSwgMTApO1xuXHRcdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnJvciwgcmVzdWx0KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR3cml0ZUZpbGUoZmlsZSwgY29udGVudCwgd3JhcHBlcik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH07XG5cdH07XG5cblx0dmFyIHJlY2lwaWVudDtcblx0dGhpcy5zZXRJUENDaGFubmVsID0gZnVuY3Rpb24ocHJvY2Vzc0NoYW5uZWwpe1xuXHRcdGlmKHByb2Nlc3NDaGFubmVsICYmICFwcm9jZXNzQ2hhbm5lbC5zZW5kIHx8ICh0eXBlb2YgcHJvY2Vzc0NoYW5uZWwuc2VuZCkgIT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlJlY2lwaWVudCBpcyBub3QgaW5zdGFuY2Ugb2YgcHJvY2Vzcy9jaGlsZF9wcm9jZXNzIG9yIGl0IHdhcyBub3Qgc3Bhd25lZCB3aXRoIElQQyBjaGFubmVsIVwiKTtcblx0XHR9XG5cdFx0cmVjaXBpZW50ID0gcHJvY2Vzc0NoYW5uZWw7XG5cdFx0aWYoY29uc3VtZXIpe1xuXHRcdFx0Y29uc29sZS5sb2coYENoYW5uZWwgdXBkYXRlZGApO1xuXHRcdFx0KHJlY2lwaWVudCB8fCBwcm9jZXNzKS5vbihcIm1lc3NhZ2VcIiwgcmVjZWl2ZUVudmVsb3BlKTtcblx0XHR9XG5cdH07XG5cblxuXHR2YXIgY29uc3VtZWRNZXNzYWdlcyA9IHt9O1xuXG5cdGZ1bmN0aW9uIGNoZWNrSWZDb25zdW1tZWQobmFtZSwgbWVzc2FnZSl7XG5cdFx0Y29uc3Qgc2hvcnROYW1lID0gcGF0aC5iYXNlbmFtZShuYW1lKTtcblx0XHRjb25zdCBwcmV2aW91c1NhdmVkID0gY29uc3VtZWRNZXNzYWdlc1tzaG9ydE5hbWVdO1xuXHRcdGxldCByZXN1bHQgPSBmYWxzZTtcblx0XHRpZihwcmV2aW91c1NhdmVkICYmICFwcmV2aW91c1NhdmVkLmxvY2FsZUNvbXBhcmUobWVzc2FnZSkpe1xuXHRcdFx0cmVzdWx0ID0gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdGZ1bmN0aW9uIHNhdmUySGlzdG9yeShlbnZlbG9wZSl7XG5cdFx0Y29uc3VtZWRNZXNzYWdlc1twYXRoLmJhc2VuYW1lKGVudmVsb3BlLm5hbWUpXSA9IGVudmVsb3BlLm1lc3NhZ2U7XG5cdH1cblxuXHRmdW5jdGlvbiBidWlsZEVudmVsb3BlQ29uZmlybWF0aW9uKGVudmVsb3BlLCBzYXZlSGlzdG9yeSl7XG5cdFx0aWYoc2F2ZUhpc3Rvcnkpe1xuXHRcdFx0c2F2ZTJIaXN0b3J5KGVudmVsb3BlKTtcblx0XHR9XG5cdFx0cmV0dXJuIGBDb25maXJtIGVudmVsb3BlICR7ZW52ZWxvcGUudGltZXN0YW1wfSBzZW50IHRvICR7ZW52ZWxvcGUuZGVzdH1gO1xuXHR9XG5cblx0ZnVuY3Rpb24gYnVpbGRFbnZlbG9wZShuYW1lLCBtZXNzYWdlKXtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZGVzdDogZm9sZGVyLFxuXHRcdFx0c3JjOiBwcm9jZXNzLnBpZCxcblx0XHRcdHRpbWVzdGFtcDogbmV3IERhdGUoKS5nZXRUaW1lKCksXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlLFxuXHRcdFx0bmFtZTogbmFtZVxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiByZWNlaXZlRW52ZWxvcGUoZW52ZWxvcGUpe1xuXHRcdGlmKCFlbnZlbG9wZSB8fCB0eXBlb2YgZW52ZWxvcGUgIT09IFwib2JqZWN0XCIpe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQvL2NvbnNvbGUubG9nKFwicmVjZWl2ZWQgZW52ZWxvcGVcIiwgZW52ZWxvcGUsIGZvbGRlcik7XG5cblx0XHRpZihlbnZlbG9wZS5kZXN0ICE9PSBmb2xkZXIgJiYgZm9sZGVyLmluZGV4T2YoZW52ZWxvcGUuZGVzdCkhPT0gLTEgJiYgZm9sZGVyLmxlbmd0aCA9PT0gZW52ZWxvcGUuZGVzdCsxKXtcblx0XHRcdGNvbnNvbGUubG9nKFwiVGhpcyBlbnZlbG9wZSBpcyBub3QgZm9yIG1lIVwiKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRsZXQgbWVzc2FnZSA9IGVudmVsb3BlLm1lc3NhZ2U7XG5cblx0XHRpZihjYWxsYmFjayl7XG5cdFx0XHQvL2NvbnNvbGUubG9nKFwiU2VuZGluZyBjb25maXJtYXRpb25cIiwgcHJvY2Vzcy5waWQpO1xuXHRcdFx0cmVjaXBpZW50LnNlbmQoYnVpbGRFbnZlbG9wZUNvbmZpcm1hdGlvbihlbnZlbG9wZSwgdHJ1ZSkpO1xuXHRcdFx0Y29uc3VtZXIobnVsbCwgSlNPTi5wYXJzZShtZXNzYWdlKSk7XG5cdFx0fVxuXHR9XG5cblx0dGhpcy5yZWdpc3RlckFzSVBDQ29uc3VtZXIgPSBmdW5jdGlvbihjYWxsYmFjayl7XG5cdFx0aWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhlIGFyZ3VtZW50IHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdH1cblx0XHRyZWdpc3RlcmVkQXNJUENDb25zdW1lciA9IHRydWU7XG5cdFx0Ly93aWxsIHJlZ2lzdGVyIGFzIG5vcm1hbCBjb25zdW1lciBpbiBvcmRlciB0byBjb25zdW1lIGFsbCBleGlzdGluZyBtZXNzYWdlcyBidXQgd2l0aG91dCBzZXR0aW5nIHRoZSB3YXRjaGVyXG5cdFx0dGhpcy5yZWdpc3RlckNvbnN1bWVyKGNhbGxiYWNrLCB0cnVlLCAod2F0Y2hlcikgPT4gIXdhdGNoZXIpO1xuXG5cdFx0Ly9jb25zb2xlLmxvZyhcIlJlZ2lzdGVyZWQgYXMgSVBDIENvbnN1bW1lclwiLCApO1xuXHRcdChyZWNpcGllbnQgfHwgcHJvY2Vzcykub24oXCJtZXNzYWdlXCIsIHJlY2VpdmVFbnZlbG9wZSk7XG5cdH07XG5cblx0dGhpcy5yZWdpc3RlckNvbnN1bWVyID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBzaG91bGREZWxldGVBZnRlclJlYWQgPSB0cnVlLCBzaG91bGRXYWl0Rm9yTW9yZSA9ICh3YXRjaGVyKSA9PiB0cnVlKSB7XG5cdFx0aWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHRcdH1cblx0XHRpZiAoY29uc3VtZXIpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk9ubHkgb25lIGNvbnN1bWVyIGlzIGFsbG93ZWQhIFwiICsgZm9sZGVyKTtcblx0XHR9XG5cblx0XHRjb25zdW1lciA9IGNhbGxiYWNrO1xuXG5cdFx0ZnMubWtkaXIoZm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgZnVuY3Rpb24gKGVyciwgcmVzKSB7XG5cdFx0XHRpZiAoZXJyICYmIChlcnIuY29kZSAhPT0gJ0VFWElTVCcpKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHR9XG5cdFx0XHRjb25zdW1lQWxsRXhpc3Rpbmcoc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCBzaG91bGRXYWl0Rm9yTW9yZSk7XG5cdFx0fSk7XG5cdH07XG5cblx0dGhpcy53cml0ZU1lc3NhZ2UgPSB3cml0ZUZpbGU7XG5cblx0dGhpcy51bmxpbmtDb250ZW50ID0gZnVuY3Rpb24gKG1lc3NhZ2VJZCwgY2FsbGJhY2spIHtcblx0XHRjb25zdCBtZXNzYWdlUGF0aCA9IHBhdGguam9pbihmb2xkZXIsIG1lc3NhZ2VJZCk7XG5cblx0XHRmcy51bmxpbmsobWVzc2FnZVBhdGgsIChlcnIpID0+IHtcblx0XHRcdGNhbGxiYWNrKGVycik7XG5cdFx0fSk7XG5cdH07XG5cblx0dGhpcy5kaXNwb3NlID0gZnVuY3Rpb24oZm9yY2Upe1xuXHRcdGlmKHR5cGVvZiBmb2xkZXIgIT0gXCJ1bmRlZmluZWRcIil7XG5cdFx0XHR2YXIgZmlsZXM7XG5cdFx0XHR0cnl7XG5cdFx0XHRcdGZpbGVzID0gZnMucmVhZGRpclN5bmMoZm9sZGVyKTtcblx0XHRcdH1jYXRjaChlcnJvcil7XG5cdFx0XHRcdC8vLi5cblx0XHRcdH1cblxuXHRcdFx0aWYoZmlsZXMgJiYgZmlsZXMubGVuZ3RoID4gMCAmJiAhZm9yY2Upe1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIkRpc3Bvc2luZyBhIGNoYW5uZWwgdGhhdCBzdGlsbCBoYXMgbWVzc2FnZXMhIERpciB3aWxsIG5vdCBiZSByZW1vdmVkIVwiKTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRmcy5ybWRpclN5bmMoZm9sZGVyKTtcblx0XHRcdFx0fWNhdGNoKGVycil7XG5cdFx0XHRcdFx0Ly8uLlxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGZvbGRlciA9IG51bGw7XG5cdFx0fVxuXG5cdFx0aWYocHJvZHVjZXIpe1xuXHRcdFx0Ly9ubyBuZWVkIHRvIGRvIGFueXRoaW5nIGVsc2Vcblx0XHR9XG5cblx0XHRpZih0eXBlb2YgY29uc3VtZXIgIT0gXCJ1bmRlZmluZWRcIil7XG5cdFx0XHRjb25zdW1lciA9ICgpID0+IHt9O1xuXHRcdH1cblxuXHRcdGlmKHdhdGNoZXIpe1xuXHRcdFx0d2F0Y2hlci5jbG9zZSgpO1xuXHRcdFx0d2F0Y2hlciA9IG51bGw7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH07XG5cblxuXHQvKiAtLS0tLS0tLS0tLS0tLS0tIHByb3RlY3RlZCAgZnVuY3Rpb25zICovXG5cdHZhciBjb25zdW1lciA9IG51bGw7XG5cdHZhciByZWdpc3RlcmVkQXNJUENDb25zdW1lciA9IGZhbHNlO1xuXHR2YXIgcHJvZHVjZXIgPSBudWxsO1xuXG5cdGZ1bmN0aW9uIGJ1aWxkUGF0aEZvckZpbGUoZmlsZW5hbWUpe1xuXHRcdHJldHVybiBwYXRoLm5vcm1hbGl6ZShwYXRoLmpvaW4oZm9sZGVyLCBmaWxlbmFtZSkpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY29uc3VtZU1lc3NhZ2UoZmlsZW5hbWUsIHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgY2FsbGJhY2spIHtcblx0XHR2YXIgZnVsbFBhdGggPSBidWlsZFBhdGhGb3JGaWxlKGZpbGVuYW1lKTtcblxuXHRcdGZzLnJlYWRGaWxlKGZ1bGxQYXRoLCBcInV0ZjhcIiwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuXHRcdFx0aWYgKCFlcnIpIHtcblx0XHRcdFx0aWYgKGRhdGEgIT09IFwiXCIpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0dmFyIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGRhdGEpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIlBhcnNpbmcgZXJyb3JcIiwgZXJyb3IpO1xuXHRcdFx0XHRcdFx0ZXJyID0gZXJyb3I7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYoY2hlY2tJZkNvbnN1bW1lZChmdWxsUGF0aCwgZGF0YSkpe1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhgbWVzc2FnZSBhbHJlYWR5IGNvbnN1bWVkIFske2ZpbGVuYW1lfV1gKTtcblx0XHRcdFx0XHRcdHJldHVybiA7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHNob3VsZERlbGV0ZUFmdGVyUmVhZCkge1xuXG5cdFx0XHRcdFx0XHRmcy51bmxpbmsoZnVsbFBhdGgsIGZ1bmN0aW9uIChlcnIsIHJlcykge1xuXHRcdFx0XHRcdFx0XHRpZiAoZXJyKSB7dGhyb3cgZXJyO307XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyLCBtZXNzYWdlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJDb25zdW1lIGVycm9yXCIsIGVycik7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gY29uc3VtZUFsbEV4aXN0aW5nKHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgc2hvdWxkV2FpdEZvck1vcmUpIHtcblxuXHRcdGxldCBjdXJyZW50RmlsZXMgPSBbXTtcblxuXHRcdGZzLnJlYWRkaXIoZm9sZGVyLCAndXRmOCcsIGZ1bmN0aW9uIChlcnIsIGZpbGVzKSB7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdCQkLmVycm9ySGFuZGxlci5lcnJvcihlcnIpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50RmlsZXMgPSBmaWxlcztcblx0XHRcdGl0ZXJhdGVBbmRDb25zdW1lKGZpbGVzKTtcblxuXHRcdH0pO1xuXG5cdFx0ZnVuY3Rpb24gc3RhcnRXYXRjaGluZygpe1xuXHRcdFx0aWYgKHNob3VsZFdhaXRGb3JNb3JlKHRydWUpKSB7XG5cdFx0XHRcdHdhdGNoRm9sZGVyKHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgc2hvdWxkV2FpdEZvck1vcmUpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGl0ZXJhdGVBbmRDb25zdW1lKGZpbGVzLCBjdXJyZW50SW5kZXggPSAwKSB7XG5cdFx0XHRpZiAoY3VycmVudEluZGV4ID09PSBmaWxlcy5sZW5ndGgpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZyhcInN0YXJ0IHdhdGNoaW5nXCIsIG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcblx0XHRcdFx0c3RhcnRXYXRjaGluZygpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwYXRoLmV4dG5hbWUoZmlsZXNbY3VycmVudEluZGV4XSkgIT09IGluX3Byb2dyZXNzKSB7XG5cdFx0XHRcdGNvbnN1bWVNZXNzYWdlKGZpbGVzW2N1cnJlbnRJbmRleF0sIHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgKGVyciwgZGF0YSkgPT4ge1xuXHRcdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRcdGl0ZXJhdGVBbmRDb25zdW1lKGZpbGVzLCArK2N1cnJlbnRJbmRleCk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNvbnN1bWVyKG51bGwsIGRhdGEsIHBhdGguYmFzZW5hbWUoZmlsZXNbY3VycmVudEluZGV4XSkpO1xuXHRcdFx0XHRcdGlmIChzaG91bGRXYWl0Rm9yTW9yZSgpKSB7XG5cdFx0XHRcdFx0XHRpdGVyYXRlQW5kQ29uc3VtZShmaWxlcywgKytjdXJyZW50SW5kZXgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpdGVyYXRlQW5kQ29uc3VtZShmaWxlcywgKytjdXJyZW50SW5kZXgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHdyaXRlRmlsZShmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spe1xuXHRcdGlmKHJlY2lwaWVudCl7XG5cdFx0XHR2YXIgZW52ZWxvcGUgPSBidWlsZEVudmVsb3BlKGZpbGVuYW1lLCBjb250ZW50KTtcblx0XHRcdC8vY29uc29sZS5sb2coXCJTZW5kaW5nIHRvXCIsIHJlY2lwaWVudC5waWQsIHJlY2lwaWVudC5wcGlkLCBcImVudmVsb3BlXCIsIGVudmVsb3BlKTtcblx0XHRcdHJlY2lwaWVudC5zZW5kKGVudmVsb3BlKTtcblx0XHRcdHZhciBjb25maXJtYXRpb25SZWNlaXZlZCA9IGZhbHNlO1xuXG5cdFx0XHRmdW5jdGlvbiByZWNlaXZlQ29uZmlybWF0aW9uKG1lc3NhZ2Upe1xuXHRcdFx0XHRpZihtZXNzYWdlID09PSBidWlsZEVudmVsb3BlQ29uZmlybWF0aW9uKGVudmVsb3BlKSl7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhcIlJlY2VpdmVkIGNvbmZpcm1hdGlvblwiLCByZWNpcGllbnQucGlkKTtcblx0XHRcdFx0XHRjb25maXJtYXRpb25SZWNlaXZlZCA9IHRydWU7XG5cdFx0XHRcdFx0dHJ5e1xuXHRcdFx0XHRcdFx0cmVjaXBpZW50Lm9mZihcIm1lc3NhZ2VcIiwgcmVjZWl2ZUNvbmZpcm1hdGlvbik7XG5cdFx0XHRcdFx0fWNhdGNoKGVycil7XG5cdFx0XHRcdFx0XHQvLy4uLlxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJlY2lwaWVudC5vbihcIm1lc3NhZ2VcIiwgcmVjZWl2ZUNvbmZpcm1hdGlvbik7XG5cblx0XHRcdHNldFRpbWVvdXQoKCk9Pntcblx0XHRcdFx0aWYoIWNvbmZpcm1hdGlvblJlY2VpdmVkKXtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKFwiTm8gY29uZmlybWF0aW9uLi4uXCIsIHByb2Nlc3MucGlkKTtcblx0XHRcdFx0XHRoaWRkZW5fd3JpdGVGaWxlKGZpbGVuYW1lLCBjb250ZW50LCBjYWxsYmFjayk7XG5cdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdGlmKGNhbGxiYWNrKXtcblx0XHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCBjb250ZW50KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sIDIwMCk7XG5cdFx0fWVsc2V7XG5cdFx0XHRoaWRkZW5fd3JpdGVGaWxlKGZpbGVuYW1lLCBjb250ZW50LCBjYWxsYmFjayk7XG5cdFx0fVxuXHR9XG5cblx0Y29uc3QgaW5fcHJvZ3Jlc3MgPSBcIi5pbl9wcm9ncmVzc1wiO1xuXHRmdW5jdGlvbiBoaWRkZW5fd3JpdGVGaWxlKGZpbGVuYW1lLCBjb250ZW50LCBjYWxsYmFjayl7XG5cdFx0dmFyIHRtcEZpbGVuYW1lID0gZmlsZW5hbWUraW5fcHJvZ3Jlc3M7XG5cdFx0dHJ5e1xuXHRcdFx0aWYoZnMuZXhpc3RzU3luYyh0bXBGaWxlbmFtZSkgfHwgZnMuZXhpc3RzU3luYyhmaWxlbmFtZSkpe1xuXHRcdFx0XHRjb25zb2xlLmxvZyhuZXcgRXJyb3IoYE92ZXJ3cml0aW5nIGZpbGUgJHtmaWxlbmFtZX1gKSk7XG5cdFx0XHR9XG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKHRtcEZpbGVuYW1lLCBjb250ZW50KTtcblx0XHRcdGZzLnJlbmFtZVN5bmModG1wRmlsZW5hbWUsIGZpbGVuYW1lKTtcblx0XHR9Y2F0Y2goZXJyKXtcblx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdH1cblx0XHRjYWxsYmFjayhudWxsLCBjb250ZW50KTtcblx0fVxuXG5cdHZhciBhbHJlYWR5S25vd25DaGFuZ2VzID0ge307XG5cblx0ZnVuY3Rpb24gYWxyZWFkeUZpcmVkQ2hhbmdlcyhmaWxlbmFtZSwgY2hhbmdlKXtcblx0XHR2YXIgcmVzID0gZmFsc2U7XG5cdFx0aWYoYWxyZWFkeUtub3duQ2hhbmdlc1tmaWxlbmFtZV0pe1xuXHRcdFx0cmVzID0gdHJ1ZTtcblx0XHR9ZWxzZXtcblx0XHRcdGFscmVhZHlLbm93bkNoYW5nZXNbZmlsZW5hbWVdID0gY2hhbmdlO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXM7XG5cdH1cblxuXHRmdW5jdGlvbiB3YXRjaEZvbGRlcihzaG91bGREZWxldGVBZnRlclJlYWQsIHNob3VsZFdhaXRGb3JNb3JlKXtcblxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdGZzLnJlYWRkaXIoZm9sZGVyLCAndXRmOCcsIGZ1bmN0aW9uIChlcnIsIGZpbGVzKSB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHQkJC5lcnJvckhhbmRsZXIuZXJyb3IoZXJyKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmb3IodmFyIGk9MDsgaTxmaWxlcy5sZW5ndGg7IGkrKyl7XG5cdFx0XHRcdFx0d2F0Y2hGaWxlc0hhbmRsZXIoXCJjaGFuZ2VcIiwgZmlsZXNbaV0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAxMDAwKTtcblxuXHRcdGZ1bmN0aW9uIHdhdGNoRmlsZXNIYW5kbGVyKGV2ZW50VHlwZSwgZmlsZW5hbWUpe1xuXHRcdFx0Ly9jb25zb2xlLmxvZyhgR290ICR7ZXZlbnRUeXBlfSBvbiAke2ZpbGVuYW1lfWApO1xuXG5cdFx0XHRpZighZmlsZW5hbWUgfHwgcGF0aC5leHRuYW1lKGZpbGVuYW1lKSA9PT0gaW5fcHJvZ3Jlc3Mpe1xuXHRcdFx0XHQvL2NhdWdodCBhIGRlbGV0ZSBldmVudCBvZiBhIGZpbGVcblx0XHRcdFx0Ly9vclxuXHRcdFx0XHQvL2ZpbGUgbm90IHJlYWR5IHRvIGJlIGNvbnN1bWVkIChpbiBwcm9ncmVzcylcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgZiA9IGJ1aWxkUGF0aEZvckZpbGUoZmlsZW5hbWUpO1xuXHRcdFx0aWYoIWZzLmV4aXN0c1N5bmMoZikpe1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKFwiRmlsZSBub3QgZm91bmRcIiwgZik7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly9jb25zb2xlLmxvZyhgUHJlcGFyaW5nIHRvIGNvbnN1bWUgJHtmaWxlbmFtZX1gKTtcblx0XHRcdGlmKCFhbHJlYWR5RmlyZWRDaGFuZ2VzKGZpbGVuYW1lLCBldmVudFR5cGUpKXtcblx0XHRcdFx0Y29uc3VtZU1lc3NhZ2UoZmlsZW5hbWUsIHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgKGVyciwgZGF0YSkgPT4ge1xuXHRcdFx0XHRcdC8vYWxsb3cgYSByZWFkIGEgdGhlIGZpbGVcblx0XHRcdFx0XHRhbHJlYWR5S25vd25DaGFuZ2VzW2ZpbGVuYW1lXSA9IHVuZGVmaW5lZDtcblxuXHRcdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRcdC8vID8/XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIlxcbkNhdWdodCBhbiBlcnJvclwiLCBlcnIpO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGNvbnN1bWVyKG51bGwsIGRhdGEsIGZpbGVuYW1lKTtcblxuXG5cdFx0XHRcdFx0aWYgKCFzaG91bGRXYWl0Rm9yTW9yZSgpKSB7XG5cdFx0XHRcdFx0XHR3YXRjaGVyLmNsb3NlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIlNvbWV0aGluZyBoYXBwZW5zLi4uXCIsIGZpbGVuYW1lKTtcblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdGNvbnN0IHdhdGNoZXIgPSBmcy53YXRjaChmb2xkZXIsIHdhdGNoRmlsZXNIYW5kbGVyKTtcblxuXHRcdGNvbnN0IGludGVydmFsVGltZXIgPSBzZXRJbnRlcnZhbCgoKT0+e1xuXHRcdFx0ZnMucmVhZGRpcihmb2xkZXIsICd1dGY4JywgZnVuY3Rpb24gKGVyciwgZmlsZXMpIHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdCQkLmVycm9ySGFuZGxlci5lcnJvcihlcnIpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKGZpbGVzLmxlbmd0aCA+IDApe1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKGBcXG5cXG5Gb3VuZCAke2ZpbGVzLmxlbmd0aH0gZmlsZXMgbm90IGNvbnN1bWVkIHlldCBpbiAke2ZvbGRlcn1gLCBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcIlxcblxcblwiKTtcblx0XHRcdFx0XHQvL2Zha2luZyBhIHJlbmFtZSBldmVudCB0cmlnZ2VyXG5cdFx0XHRcdFx0d2F0Y2hGaWxlc0hhbmRsZXIoXCJyZW5hbWVcIiwgZmlsZXNbMF0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCA1MDAwKTtcblx0fVxufVxuXG5leHBvcnRzLmdldEZvbGRlclF1ZXVlID0gZnVuY3Rpb24oZm9sZGVyLCBjYWxsYmFjayl7XG5cdHJldHVybiBuZXcgRm9sZGVyTVEoZm9sZGVyLCBjYWxsYmFjayk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBQZW5kO1xuXG5mdW5jdGlvbiBQZW5kKCkge1xuICB0aGlzLnBlbmRpbmcgPSAwO1xuICB0aGlzLm1heCA9IEluZmluaXR5O1xuICB0aGlzLmxpc3RlbmVycyA9IFtdO1xuICB0aGlzLndhaXRpbmcgPSBbXTtcbiAgdGhpcy5lcnJvciA9IG51bGw7XG59XG5cblBlbmQucHJvdG90eXBlLmdvID0gZnVuY3Rpb24oZm4pIHtcbiAgaWYgKHRoaXMucGVuZGluZyA8IHRoaXMubWF4KSB7XG4gICAgcGVuZEdvKHRoaXMsIGZuKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLndhaXRpbmcucHVzaChmbik7XG4gIH1cbn07XG5cblBlbmQucHJvdG90eXBlLndhaXQgPSBmdW5jdGlvbihjYikge1xuICBpZiAodGhpcy5wZW5kaW5nID09PSAwKSB7XG4gICAgY2IodGhpcy5lcnJvcik7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5saXN0ZW5lcnMucHVzaChjYik7XG4gIH1cbn07XG5cblBlbmQucHJvdG90eXBlLmhvbGQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHBlbmRIb2xkKHRoaXMpO1xufTtcblxuZnVuY3Rpb24gcGVuZEhvbGQoc2VsZikge1xuICBzZWxmLnBlbmRpbmcgKz0gMTtcbiAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICByZXR1cm4gb25DYjtcbiAgZnVuY3Rpb24gb25DYihlcnIpIHtcbiAgICBpZiAoY2FsbGVkKSB0aHJvdyBuZXcgRXJyb3IoXCJjYWxsYmFjayBjYWxsZWQgdHdpY2VcIik7XG4gICAgY2FsbGVkID0gdHJ1ZTtcbiAgICBzZWxmLmVycm9yID0gc2VsZi5lcnJvciB8fCBlcnI7XG4gICAgc2VsZi5wZW5kaW5nIC09IDE7XG4gICAgaWYgKHNlbGYud2FpdGluZy5sZW5ndGggPiAwICYmIHNlbGYucGVuZGluZyA8IHNlbGYubWF4KSB7XG4gICAgICBwZW5kR28oc2VsZiwgc2VsZi53YWl0aW5nLnNoaWZ0KCkpO1xuICAgIH0gZWxzZSBpZiAoc2VsZi5wZW5kaW5nID09PSAwKSB7XG4gICAgICB2YXIgbGlzdGVuZXJzID0gc2VsZi5saXN0ZW5lcnM7XG4gICAgICBzZWxmLmxpc3RlbmVycyA9IFtdO1xuICAgICAgbGlzdGVuZXJzLmZvckVhY2goY2JMaXN0ZW5lcik7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGNiTGlzdGVuZXIobGlzdGVuZXIpIHtcbiAgICBsaXN0ZW5lcihzZWxmLmVycm9yKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwZW5kR28oc2VsZiwgZm4pIHtcbiAgZm4ocGVuZEhvbGQoc2VsZikpO1xufVxuIiwiXG5cbi8qKioqKioqKioqKioqKioqKioqKioqICB1dGlsaXR5IGNsYXNzICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5mdW5jdGlvbiBSZXF1ZXN0TWFuYWdlcihwb2xsaW5nVGltZU91dCl7XG4gICAgaWYoIXBvbGxpbmdUaW1lT3V0KXtcbiAgICAgICAgcG9sbGluZ1RpbWVPdXQgPSAxMDAwOyAvLzEgc2Vjb25kIGJ5IGRlZmF1bHRcbiAgICB9XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBSZXF1ZXN0KGVuZFBvaW50LCBpbml0aWFsU3dhcm0pe1xuICAgICAgICB2YXIgb25SZXR1cm5DYWxsYmFja3MgPSBbXTtcbiAgICAgICAgdmFyIG9uRXJyb3JDYWxsYmFja3MgPSBbXTtcbiAgICAgICAgdmFyIG9uQ2FsbGJhY2tzID0gW107XG4gICAgICAgIHZhciByZXF1ZXN0SWQgPSBpbml0aWFsU3dhcm0ubWV0YS5yZXF1ZXN0SWQ7XG4gICAgICAgIGluaXRpYWxTd2FybSA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5nZXRSZXF1ZXN0SWQgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RJZDtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLm9uID0gZnVuY3Rpb24ocGhhc2VOYW1lLCBjYWxsYmFjayl7XG4gICAgICAgICAgICBpZih0eXBlb2YgcGhhc2VOYW1lICE9IFwic3RyaW5nXCIgICYmIHR5cGVvZiBjYWxsYmFjayAhPSBcImZ1bmN0aW9uXCIpe1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBmaXJzdCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgc3RyaW5nIGFuZCB0aGUgc2Vjb25kIHBhcmFtZXRlciBzaG91bGQgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb25DYWxsYmFja3MucHVzaCh7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6Y2FsbGJhY2ssXG4gICAgICAgICAgICAgICAgcGhhc2U6cGhhc2VOYW1lXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNlbGYucG9sbChlbmRQb2ludCwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLm9uUmV0dXJuID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICAgICAgb25SZXR1cm5DYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICBzZWxmLnBvbGwoZW5kUG9pbnQsIHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vbkVycm9yID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICAgICAgaWYob25FcnJvckNhbGxiYWNrcy5pbmRleE9mKGNhbGxiYWNrKSE9PS0xKXtcbiAgICAgICAgICAgICAgICBvbkVycm9yQ2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciBjYWxsYmFjayBhbHJlYWR5IHJlZ2lzdGVyZWQhXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2ggPSBmdW5jdGlvbihlcnIsIHJlc3VsdCl7XG4gICAgICAgICAgICByZXN1bHQgPSB0eXBlb2YgcmVzdWx0ID09IFwic3RyaW5nXCIgPyBKU09OLnBhcnNlKHJlc3VsdCkgOiByZXN1bHQ7XG4gICAgICAgICAgICByZXN1bHQgPSBPd00ucHJvdG90eXBlLmNvbnZlcnQocmVzdWx0KTtcbiAgICAgICAgICAgIHZhciByZXN1bHRSZXFJZCA9IHJlc3VsdC5nZXRNZXRhKFwicmVxdWVzdElkXCIpO1xuICAgICAgICAgICAgdmFyIHBoYXNlTmFtZSA9IHJlc3VsdC5nZXRNZXRhKFwicGhhc2VOYW1lXCIpO1xuICAgICAgICAgICAgdmFyIG9uUmV0dXJuID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmKHJlc3VsdFJlcUlkID09PSByZXF1ZXN0SWQpe1xuICAgICAgICAgICAgICAgIG9uUmV0dXJuQ2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oYyl7XG4gICAgICAgICAgICAgICAgICAgIGMobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgb25SZXR1cm4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmKG9uUmV0dXJuKXtcbiAgICAgICAgICAgICAgICAgICAgb25SZXR1cm5DYWxsYmFja3MgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvckNhbGxiYWNrcyA9IFtdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG9uQ2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oaSl7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJYWFhYWFhYWDpcIiwgcGhhc2VOYW1lICwgaSk7XG4gICAgICAgICAgICAgICAgICAgIGlmKHBoYXNlTmFtZSA9PT0gaS5waGFzZSB8fCBpLnBoYXNlID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkuY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKG9uUmV0dXJuQ2FsbGJhY2tzLmxlbmd0aCA9PT0gMCAmJiBvbkNhbGxiYWNrcy5sZW5ndGggPT09IDApe1xuICAgICAgICAgICAgICAgIHNlbGYudW5wb2xsKGVuZFBvaW50LCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoRXJyb3IgPSBmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgZm9yKHZhciBpPTA7IGkgPCBvbkVycm9yQ2FsbGJhY2tzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICB2YXIgZXJyQ2IgPSBvbkVycm9yQ2FsbGJhY2tzW2ldO1xuICAgICAgICAgICAgICAgIGVyckNiKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vZmYgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi51bnBvbGwoZW5kUG9pbnQsIHRoaXMpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHRoaXMuY3JlYXRlUmVxdWVzdCA9IGZ1bmN0aW9uKHJlbW90ZUVuZFBvaW50LCBzd2FybSl7XG4gICAgICAgIGxldCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QocmVtb3RlRW5kUG9pbnQsIHN3YXJtKTtcbiAgICAgICAgcmV0dXJuIHJlcXVlc3Q7XG4gICAgfTtcblxuICAgIC8qICoqKioqKioqKioqKioqKioqKioqKioqKioqKiBwb2xsaW5nIHpvbmUgKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgIHZhciBwb2xsU2V0ID0ge1xuICAgIH07XG5cbiAgICB2YXIgYWN0aXZlQ29ubmVjdGlvbnMgPSB7XG4gICAgfTtcblxuICAgIHRoaXMucG9sbCA9IGZ1bmN0aW9uKHJlbW90ZUVuZFBvaW50LCByZXF1ZXN0KXtcbiAgICAgICAgdmFyIHJlcXVlc3RzID0gcG9sbFNldFtyZW1vdGVFbmRQb2ludF07XG4gICAgICAgIGlmKCFyZXF1ZXN0cyl7XG4gICAgICAgICAgICByZXF1ZXN0cyA9IHt9O1xuICAgICAgICAgICAgcG9sbFNldFtyZW1vdGVFbmRQb2ludF0gPSByZXF1ZXN0cztcbiAgICAgICAgfVxuICAgICAgICByZXF1ZXN0c1tyZXF1ZXN0LmdldFJlcXVlc3RJZCgpXSA9IHJlcXVlc3Q7XG4gICAgICAgIHBvbGxpbmdIYW5kbGVyKCk7XG4gICAgfTtcblxuICAgIHRoaXMudW5wb2xsID0gZnVuY3Rpb24ocmVtb3RlRW5kUG9pbnQsIHJlcXVlc3Qpe1xuICAgICAgICB2YXIgcmVxdWVzdHMgPSBwb2xsU2V0W3JlbW90ZUVuZFBvaW50XTtcbiAgICAgICAgaWYocmVxdWVzdHMpe1xuICAgICAgICAgICAgZGVsZXRlIHJlcXVlc3RzW3JlcXVlc3QuZ2V0UmVxdWVzdElkKCldO1xuICAgICAgICAgICAgaWYoT2JqZWN0LmtleXMocmVxdWVzdHMpLmxlbmd0aCA9PT0gMCl7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHBvbGxTZXRbcmVtb3RlRW5kUG9pbnRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJVbnBvbGxpbmcgd3JvbmcgcmVxdWVzdDpcIixyZW1vdGVFbmRQb2ludCwgcmVxdWVzdCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlUG9sbFRocmVhZChyZW1vdGVFbmRQb2ludCl7XG4gICAgICAgIGZ1bmN0aW9uIHJlQXJtKCl7XG4gICAgICAgICAgICAkJC5yZW1vdGUuZG9IdHRwR2V0KHJlbW90ZUVuZFBvaW50LCBmdW5jdGlvbihlcnIsIHJlcyl7XG4gICAgICAgICAgICAgICAgbGV0IHJlcXVlc3RzID0gcG9sbFNldFtyZW1vdGVFbmRQb2ludF07XG5cbiAgICAgICAgICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICAgICAgICAgICBmb3IobGV0IHJlcV9pZCBpbiByZXF1ZXN0cyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZXJyX2hhbmRsZXIgPSByZXF1ZXN0c1tyZXFfaWRdLmRpc3BhdGNoRXJyb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihlcnJfaGFuZGxlcil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyX2hhbmRsZXIoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVDb25uZWN0aW9uc1tyZW1vdGVFbmRQb2ludF0gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGsgaW4gcmVxdWVzdHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdHNba10uZGlzcGF0Y2gobnVsbCwgcmVzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKE9iamVjdC5rZXlzKHJlcXVlc3RzKS5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlQXJtKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgYWN0aXZlQ29ubmVjdGlvbnNbcmVtb3RlRW5kUG9pbnRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFbmRpbmcgcG9sbGluZyBmb3IgXCIsIHJlbW90ZUVuZFBvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJlQXJtKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcG9sbGluZ0hhbmRsZXIoKXtcbiAgICAgICAgbGV0IHNldFRpbWVyID0gZmFsc2U7XG4gICAgICAgIGZvcih2YXIgdiBpbiBwb2xsU2V0KXtcbiAgICAgICAgICAgIGlmKCFhY3RpdmVDb25uZWN0aW9uc1t2XSl7XG4gICAgICAgICAgICAgICAgY3JlYXRlUG9sbFRocmVhZCh2KTtcbiAgICAgICAgICAgICAgICBhY3RpdmVDb25uZWN0aW9uc1t2XSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRUaW1lciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYoc2V0VGltZXIpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQocG9sbGluZ0hhbmRsZXIsIHBvbGxpbmdUaW1lT3V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldFRpbWVvdXQoIHBvbGxpbmdIYW5kbGVyLCBwb2xsaW5nVGltZU91dCk7XG59XG5cblxuZnVuY3Rpb24gZXh0cmFjdERvbWFpbkFnZW50RGV0YWlscyh1cmwpe1xuICAgIGNvbnN0IHZSZWdleCA9IC8oW2EtekEtWjAtOV0qfC4pKlxcL2FnZW50XFwvKFthLXpBLVowLTldKyhcXC8pKikrL2c7XG5cbiAgICBpZighdXJsLm1hdGNoKHZSZWdleCkpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGZvcm1hdC4gKEVnLiBkb21haW5bLnN1YmRvbWFpbl0qL2FnZW50L1tvcmdhbmlzYXRpb24vXSphZ2VudElkKVwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBkZXZpZGVyID0gXCIvYWdlbnQvXCI7XG4gICAgbGV0IGRvbWFpbjtcbiAgICBsZXQgYWdlbnRVcmw7XG5cbiAgICBjb25zdCBzcGxpdFBvaW50ID0gdXJsLmluZGV4T2YoZGV2aWRlcik7XG4gICAgaWYoc3BsaXRQb2ludCAhPT0gLTEpe1xuICAgICAgICBkb21haW4gPSB1cmwuc2xpY2UoMCwgc3BsaXRQb2ludCk7XG4gICAgICAgIGFnZW50VXJsID0gdXJsLnNsaWNlKHNwbGl0UG9pbnQrZGV2aWRlci5sZW5ndGgpO1xuICAgIH1cblxuICAgIHJldHVybiB7ZG9tYWluLCBhZ2VudFVybH07XG59XG5cbmZ1bmN0aW9uIHVybEVuZFdpdGhTbGFzaCh1cmwpe1xuXG4gICAgaWYodXJsW3VybC5sZW5ndGggLSAxXSAhPT0gXCIvXCIpe1xuICAgICAgICB1cmwgKz0gXCIvXCI7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVybDtcbn1cblxuY29uc3QgT3dNID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIikuT3dNO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKiBtYWluIEFQSXMgb24gd29ya2luZyB3aXRoIHJlbW90ZSBlbmQgcG9pbnRzICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5mdW5jdGlvbiBQc2tIdHRwQ2xpZW50KHJlbW90ZUVuZFBvaW50LCBhZ2VudFVpZCwgb3B0aW9ucyl7XG4gICAgdmFyIGJhc2VPZlJlbW90ZUVuZFBvaW50ID0gcmVtb3RlRW5kUG9pbnQ7IC8vcmVtb3ZlIGxhc3QgaWRcblxuICAgIHJlbW90ZUVuZFBvaW50ID0gdXJsRW5kV2l0aFNsYXNoKHJlbW90ZUVuZFBvaW50KTtcblxuICAgIC8vZG9tYWluSW5mbyBjb250YWlucyAyIG1lbWJlcnM6IGRvbWFpbiAocHJpdmF0ZVNreSBkb21haW4pIGFuZCBhZ2VudFVybFxuICAgIGNvbnN0IGRvbWFpbkluZm8gPSBleHRyYWN0RG9tYWluQWdlbnREZXRhaWxzKGFnZW50VWlkKTtcbiAgICBsZXQgaG9tZVNlY3VyaXR5Q29udGV4dCA9IGRvbWFpbkluZm8uYWdlbnRVcmw7XG4gICAgbGV0IHJldHVyblJlbW90ZUVuZFBvaW50ID0gcmVtb3RlRW5kUG9pbnQ7XG5cbiAgICBpZihvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zLnJldHVyblJlbW90ZSAhPSBcInVuZGVmaW5lZFwiKXtcbiAgICAgICAgcmV0dXJuUmVtb3RlRW5kUG9pbnQgPSBvcHRpb25zLnJldHVyblJlbW90ZTtcbiAgICB9XG5cbiAgICBpZighb3B0aW9ucyB8fCBvcHRpb25zICYmICh0eXBlb2Ygb3B0aW9ucy51bmlxdWVJZCA9PSBcInVuZGVmaW5lZFwiIHx8IG9wdGlvbnMudW5pcXVlSWQpKXtcbiAgICAgICAgaG9tZVNlY3VyaXR5Q29udGV4dCArPSBcIl9cIitNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSk7XG4gICAgfVxuXG4gICAgcmV0dXJuUmVtb3RlRW5kUG9pbnQgPSB1cmxFbmRXaXRoU2xhc2gocmV0dXJuUmVtb3RlRW5kUG9pbnQpO1xuXG4gICAgdGhpcy5zdGFydFN3YXJtID0gZnVuY3Rpb24oc3dhcm1OYW1lLCBwaGFzZU5hbWUsIC4uLmFyZ3Mpe1xuICAgICAgICB2YXIgc3dhcm0gPSBuZXcgT3dNKCk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJzd2FybUlkXCIsICQkLnVpZEdlbmVyYXRvci5zYWZlX3V1aWQoKSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJyZXF1ZXN0SWRcIiwgc3dhcm0uZ2V0TWV0YShcInN3YXJtSWRcIikpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwic3dhcm1UeXBlTmFtZVwiLCBzd2FybU5hbWUpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwicGhhc2VOYW1lXCIsIHBoYXNlTmFtZSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJhcmdzXCIsIGFyZ3MpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiY29tbWFuZFwiLCBcImV4ZWN1dGVTd2FybVBoYXNlXCIpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwidGFyZ2V0XCIsIGRvbWFpbkluZm8uYWdlbnRVcmwpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiaG9tZVNlY3VyaXR5Q29udGV4dFwiLCByZXR1cm5SZW1vdGVFbmRQb2ludCskJC5yZW1vdGUuYmFzZTY0RW5jb2RlKGhvbWVTZWN1cml0eUNvbnRleHQpKTtcblxuICAgICAgICAkJC5yZW1vdGUuZG9IdHRwUG9zdChnZXRSZW1vdGUocmVtb3RlRW5kUG9pbnQsIGRvbWFpbkluZm8uZG9tYWluKSwgc3dhcm0sIGZ1bmN0aW9uKGVyciwgcmVzKXtcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlci5jcmVhdGVSZXF1ZXN0KHN3YXJtLmdldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIpLCBzd2FybSk7XG4gICAgfTtcblxuICAgIHRoaXMuY29udGludWVTd2FybSA9IGZ1bmN0aW9uKGV4aXN0aW5nU3dhcm0sIHBoYXNlTmFtZSwgLi4uYXJncyl7XG4gICAgICAgIHZhciBzd2FybSA9IG5ldyBPd00oZXhpc3RpbmdTd2FybSk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJwaGFzZU5hbWVcIiwgcGhhc2VOYW1lKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImFyZ3NcIiwgYXJncyk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJjb21tYW5kXCIsIFwiZXhlY3V0ZVN3YXJtUGhhc2VcIik7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJ0YXJnZXRcIiwgZG9tYWluSW5mby5hZ2VudFVybCk7XG4gICAgICAgIHN3YXJtLnNldE1ldGEoXCJob21lU2VjdXJpdHlDb250ZXh0XCIsIHJldHVyblJlbW90ZUVuZFBvaW50KyQkLnJlbW90ZS5iYXNlNjRFbmNvZGUoaG9tZVNlY3VyaXR5Q29udGV4dCkpO1xuXG4gICAgICAgICQkLnJlbW90ZS5kb0h0dHBQb3N0KGdldFJlbW90ZShyZW1vdGVFbmRQb2ludCwgZG9tYWluSW5mby5kb21haW4pLCBzd2FybSwgZnVuY3Rpb24oZXJyLCByZXMpe1xuICAgICAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy9yZXR1cm4gJCQucmVtb3RlLnJlcXVlc3RNYW5hZ2VyLmNyZWF0ZVJlcXVlc3Qoc3dhcm0uZ2V0TWV0YShcImhvbWVTZWN1cml0eUNvbnRleHRcIiksIHN3YXJtKTtcbiAgICB9O1xuXG4gICAgdmFyIGFsbENhdGNoQWxscyA9IFtdO1xuICAgIHZhciByZXF1ZXN0c0NvdW50ZXIgPSAwO1xuICAgIGZ1bmN0aW9uIENhdGNoQWxsKHN3YXJtTmFtZSwgcGhhc2VOYW1lLCBjYWxsYmFjayl7IC8vc2FtZSBpbnRlcmZhY2UgYXMgUmVxdWVzdFxuICAgICAgICB2YXIgcmVxdWVzdElkID0gcmVxdWVzdHNDb3VudGVyKys7XG4gICAgICAgIHRoaXMuZ2V0UmVxdWVzdElkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGxldCByZXFJZCA9IFwic3dhcm1OYW1lXCIgKyBcInBoYXNlTmFtZVwiICsgcmVxdWVzdElkO1xuICAgICAgICAgICAgcmV0dXJuIHJlcUlkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2ggPSBmdW5jdGlvbihlcnIsIHJlc3VsdCl7XG4gICAgICAgICAgICByZXN1bHQgPSBPd00ucHJvdG90eXBlLmNvbnZlcnQoSlNPTi5wYXJzZShyZXN1bHQpKTtcbiAgICAgICAgICAgIHZhciBjdXJyZW50UGhhc2VOYW1lID0gcmVzdWx0LmdldE1ldGEoXCJwaGFzZU5hbWVcIik7XG4gICAgICAgICAgICB2YXIgY3VycmVudFN3YXJtTmFtZSA9IHJlc3VsdC5nZXRNZXRhKFwic3dhcm1UeXBlTmFtZVwiKTtcbiAgICAgICAgICAgIGlmKChjdXJyZW50U3dhcm1OYW1lID09PSBzd2FybU5hbWUgfHwgc3dhcm1OYW1lID09PSAnKicpICYmIChjdXJyZW50UGhhc2VOYW1lID09PSBwaGFzZU5hbWUgfHwgcGhhc2VOYW1lID09PSAnKicpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyciwgcmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLm9uID0gZnVuY3Rpb24oc3dhcm1OYW1lLCBwaGFzZU5hbWUsIGNhbGxiYWNrKXtcbiAgICAgICAgdmFyIGMgPSBuZXcgQ2F0Y2hBbGwoc3dhcm1OYW1lLCBwaGFzZU5hbWUsIGNhbGxiYWNrKTtcbiAgICAgICAgYWxsQ2F0Y2hBbGxzLnB1c2goe1xuICAgICAgICAgICAgczpzd2FybU5hbWUsXG4gICAgICAgICAgICBwOnBoYXNlTmFtZSxcbiAgICAgICAgICAgIGM6Y1xuICAgICAgICB9KTtcblxuICAgICAgICAkJC5yZW1vdGUucmVxdWVzdE1hbmFnZXIucG9sbChnZXRSZW1vdGUocmVtb3RlRW5kUG9pbnQsIGRvbWFpbkluZm8uZG9tYWluKSAsIGMpO1xuICAgIH07XG5cbiAgICB0aGlzLm9mZiA9IGZ1bmN0aW9uKHN3YXJtTmFtZSwgcGhhc2VOYW1lKXtcbiAgICAgICAgYWxsQ2F0Y2hBbGxzLmZvckVhY2goZnVuY3Rpb24oY2Epe1xuICAgICAgICAgICAgaWYoKGNhLnMgPT09IHN3YXJtTmFtZSB8fCBzd2FybU5hbWUgPT09ICcqJykgJiYgKHBoYXNlTmFtZSA9PT0gY2EucCB8fCBwaGFzZU5hbWUgPT09ICcqJykpe1xuICAgICAgICAgICAgICAgICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlci51bnBvbGwoZ2V0UmVtb3RlKHJlbW90ZUVuZFBvaW50LCBkb21haW5JbmZvLmRvbWFpbiksIGNhLmMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy51cGxvYWRDU0IgPSBmdW5jdGlvbihjcnlwdG9VaWQsIGJpbmFyeURhdGEsIGNhbGxiYWNrKXtcbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cFBvc3QoYmFzZU9mUmVtb3RlRW5kUG9pbnQgKyBcIi9DU0IvXCIgKyBjcnlwdG9VaWQsIGJpbmFyeURhdGEsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgdGhpcy5kb3dubG9hZENTQiA9IGZ1bmN0aW9uKGNyeXB0b1VpZCwgY2FsbGJhY2spe1xuICAgICAgICAkJC5yZW1vdGUuZG9IdHRwR2V0KGJhc2VPZlJlbW90ZUVuZFBvaW50ICsgXCIvQ1NCL1wiICsgY3J5cHRvVWlkLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGdldFJlbW90ZShiYXNlVXJsLCBkb21haW4pIHtcbiAgICAgICAgcmV0dXJuIHVybEVuZFdpdGhTbGFzaChiYXNlVXJsKSArICQkLnJlbW90ZS5iYXNlNjRFbmNvZGUoZG9tYWluKTtcbiAgICB9XG59XG5cbi8qKioqKioqKioqKioqKioqKioqKioqIGluaXRpYWxpc2F0aW9uIHN0dWZmICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5pZiAodHlwZW9mICQkID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgJCQgPSB7fTtcbn1cblxuaWYgKHR5cGVvZiAgJCQucmVtb3RlID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgJCQucmVtb3RlID0ge307XG4gICAgJCQucmVtb3RlLmNyZWF0ZVJlcXVlc3RNYW5hZ2VyID0gZnVuY3Rpb24odGltZU91dCl7XG4gICAgICAgICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlciA9IG5ldyBSZXF1ZXN0TWFuYWdlcih0aW1lT3V0KTtcbiAgICB9O1xuXG5cbiAgICAkJC5yZW1vdGUuY3J5cHRvUHJvdmlkZXIgPSBudWxsO1xuICAgICQkLnJlbW90ZS5uZXdFbmRQb2ludCA9IGZ1bmN0aW9uKGFsaWFzLCByZW1vdGVFbmRQb2ludCwgYWdlbnRVaWQsIGNyeXB0b0luZm8pe1xuICAgICAgICBpZihhbGlhcyA9PT0gXCJuZXdSZW1vdGVFbmRQb2ludFwiIHx8IGFsaWFzID09PSBcInJlcXVlc3RNYW5hZ2VyXCIgfHwgYWxpYXMgPT09IFwiY3J5cHRvUHJvdmlkZXJcIil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlBza0h0dHBDbGllbnQgVW5zYWZlIGFsaWFzIG5hbWU6XCIsIGFsaWFzKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkJC5yZW1vdGVbYWxpYXNdID0gbmV3IFBza0h0dHBDbGllbnQocmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKTtcbiAgICB9O1xuXG5cbiAgICAkJC5yZW1vdGUuZG9IdHRwUG9zdCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGNhbGxiYWNrKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlIHRoaXMhXCIpO1xuICAgIH07XG5cbiAgICAkJC5yZW1vdGUuZG9IdHRwR2V0ID0gZnVuY3Rpb24gZG9IdHRwR2V0KHVybCwgY2FsbGJhY2spe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgdGhpcyFcIik7XG4gICAgfTtcblxuICAgICQkLnJlbW90ZS5iYXNlNjRFbmNvZGUgPSBmdW5jdGlvbiBiYXNlNjRFbmNvZGUoc3RyaW5nVG9FbmNvZGUpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgdGhpcyFcIik7XG4gICAgfTtcblxuICAgICQkLnJlbW90ZS5iYXNlNjREZWNvZGUgPSBmdW5jdGlvbiBiYXNlNjREZWNvZGUoZW5jb2RlZFN0cmluZyl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSB0aGlzIVwiKTtcbiAgICB9O1xufVxuXG5cblxuLyogIGludGVyZmFjZVxuZnVuY3Rpb24gQ3J5cHRvUHJvdmlkZXIoKXtcblxuICAgIHRoaXMuZ2VuZXJhdGVTYWZlVWlkID0gZnVuY3Rpb24oKXtcblxuICAgIH1cblxuICAgIHRoaXMuc2lnblN3YXJtID0gZnVuY3Rpb24oc3dhcm0sIGFnZW50KXtcblxuICAgIH1cbn0gKi9cbiIsIiQkLnJlbW90ZS5kb0h0dHBQb3N0ID0gZnVuY3Rpb24gKHVybCwgZGF0YSwgY2FsbGJhY2spIHtcblxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PSA0ICYmIHhoci5zdGF0dXMgPT0gXCIyMDBcIikge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB4aHIucmVzcG9uc2U7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCBkYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmKHhoci5zdGF0dXM+PTQwMCl7XG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJBbiBlcnJvciBvY2N1cmVkLiBTdGF0dXNDb2RlOiBcIiArIHhoci5zdGF0dXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB4aHIub3BlbihcIlBPU1RcIiwgdXJsLCB0cnVlKTtcbiAgICAvL3hoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PVVURi04XCIpO1xuXG4gICAgaWYoZGF0YSAmJiBkYXRhLnBpcGUgJiYgdHlwZW9mIGRhdGEucGlwZSA9PT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgdmFyIGJ1ZmZlcnMgPSBbXTtcbiAgICAgICAgZGF0YS5vbihcImRhdGFcIiwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgYnVmZmVycy5wdXNoKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgZGF0YS5vbihcImVuZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBhY3R1YWxDb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoYnVmZmVycyk7XG4gICAgICAgICAgICB4aHIuc2VuZChhY3R1YWxDb250ZW50cyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgICB4aHIuc2VuZChkYXRhKTtcbiAgICB9XG59O1xuXG5cbiQkLnJlbW90ZS5kb0h0dHBHZXQgPSBmdW5jdGlvbiBkb0h0dHBHZXQodXJsLCBjYWxsYmFjaykge1xuXG4gICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy9jaGVjayBpZiBoZWFkZXJzIHdlcmUgcmVjZWl2ZWQgYW5kIGlmIGFueSBhY3Rpb24gc2hvdWxkIGJlIHBlcmZvcm1lZCBiZWZvcmUgcmVjZWl2aW5nIGRhdGFcbiAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSAyKSB7XG4gICAgICAgICAgICB2YXIgY29udGVudFR5cGUgPSB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoXCJDb250ZW50LVR5cGVcIik7XG4gICAgICAgICAgICBpZiAoY29udGVudFR5cGUgPT09IFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCIpIHtcbiAgICAgICAgICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09IDQgJiYgeGhyLnN0YXR1cyA9PSBcIjIwMFwiKSB7XG4gICAgICAgICAgICB2YXIgY29udGVudFR5cGUgPSB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoXCJDb250ZW50LVR5cGVcIik7XG5cbiAgICAgICAgICAgIGlmKGNvbnRlbnRUeXBlPT09XCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIil7XG4gICAgICAgICAgICAgICAgbGV0IHJlc3BvbnNlQnVmZmVyID0gQnVmZmVyLmZyb20odGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzcG9uc2VCdWZmZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB4aHIucmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJBbiBlcnJvciBvY2N1cmVkLiBTdGF0dXNDb2RlOiBcIiArIHhoci5zdGF0dXMpKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB4aHIub3BlbihcIkdFVFwiLCB1cmwpO1xuICAgIHhoci5zZW5kKCk7XG59O1xuXG5cbmZ1bmN0aW9uIENyeXB0b1Byb3ZpZGVyKCl7XG5cbiAgICB0aGlzLmdlbmVyYXRlU2FmZVVpZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGxldCB1aWQgPSBcIlwiO1xuICAgICAgICB2YXIgYXJyYXkgPSBuZXcgVWludDMyQXJyYXkoMTApO1xuICAgICAgICB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhhcnJheSk7XG5cblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB1aWQgKz0gYXJyYXlbaV0udG9TdHJpbmcoMTYpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHVpZDtcbiAgICB9XG5cbiAgICB0aGlzLnNpZ25Td2FybSA9IGZ1bmN0aW9uKHN3YXJtLCBhZ2VudCl7XG4gICAgICAgIHN3YXJtLm1ldGEuc2lnbmF0dXJlID0gYWdlbnQ7XG4gICAgfVxufVxuXG5cblxuJCQucmVtb3RlLmNyeXB0b1Byb3ZpZGVyID0gbmV3IENyeXB0b1Byb3ZpZGVyKCk7XG5cbiQkLnJlbW90ZS5iYXNlNjRFbmNvZGUgPSBmdW5jdGlvbiBiYXNlNjRFbmNvZGUoc3RyaW5nVG9FbmNvZGUpe1xuICAgIHJldHVybiB3aW5kb3cuYnRvYShzdHJpbmdUb0VuY29kZSk7XG59O1xuXG4kJC5yZW1vdGUuYmFzZTY0RGVjb2RlID0gZnVuY3Rpb24gYmFzZTY0RGVjb2RlKGVuY29kZWRTdHJpbmcpe1xuICAgIHJldHVybiB3aW5kb3cuYXRvYihlbmNvZGVkU3RyaW5nKTtcbn07XG4iLCJyZXF1aXJlKFwiLi9wc2stYWJzdHJhY3QtY2xpZW50XCIpO1xuXG5jb25zdCBodHRwID0gcmVxdWlyZShcImh0dHBcIik7XG5jb25zdCBodHRwcyA9IHJlcXVpcmUoXCJodHRwc1wiKTtcbmNvbnN0IFVSTCA9IHJlcXVpcmUoXCJ1cmxcIik7XG5jb25zdCB1c2VyQWdlbnQgPSAnUFNLIE5vZGVBZ2VudC8wLjAuMSc7XG5cbmNvbnNvbGUubG9nKFwiUFNLIG5vZGUgY2xpZW50IGxvYWRpbmdcIik7XG5cbmZ1bmN0aW9uIGdldE5ldHdvcmtGb3JPcHRpb25zKG9wdGlvbnMpIHtcblx0aWYob3B0aW9ucy5wcm90b2NvbCA9PT0gJ2h0dHA6Jykge1xuXHRcdHJldHVybiBodHRwO1xuXHR9IGVsc2UgaWYob3B0aW9ucy5wcm90b2NvbCA9PT0gJ2h0dHBzOicpIHtcblx0XHRyZXR1cm4gaHR0cHM7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBDYW4ndCBoYW5kbGUgcHJvdG9jb2wgJHtvcHRpb25zLnByb3RvY29sfWApO1xuXHR9XG5cbn1cblxuJCQucmVtb3RlLmRvSHR0cFBvc3QgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBjYWxsYmFjayl7XG5cdGNvbnN0IGlubmVyVXJsID0gVVJMLnBhcnNlKHVybCk7XG5cblx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRob3N0bmFtZTogaW5uZXJVcmwuaG9zdG5hbWUsXG5cdFx0cGF0aDogaW5uZXJVcmwucGF0aG5hbWUsXG5cdFx0cG9ydDogcGFyc2VJbnQoaW5uZXJVcmwucG9ydCksXG5cdFx0aGVhZGVyczoge1xuXHRcdFx0J1VzZXItQWdlbnQnOiB1c2VyQWdlbnRcblx0XHR9LFxuXHRcdG1ldGhvZDogJ1BPU1QnXG5cdH07XG5cblx0Y29uc3QgbmV0d29yayA9IGdldE5ldHdvcmtGb3JPcHRpb25zKGlubmVyVXJsKTtcblxuXHRjb25zdCByZXEgPSBuZXR3b3JrLnJlcXVlc3Qob3B0aW9ucywgKHJlcykgPT4ge1xuXHRcdGNvbnN0IHsgc3RhdHVzQ29kZSB9ID0gcmVzO1xuXG5cdFx0bGV0IGVycm9yO1xuXHRcdGlmIChzdGF0dXNDb2RlID49IDQwMCkge1xuXHRcdFx0ZXJyb3IgPSBuZXcgRXJyb3IoJ1JlcXVlc3QgRmFpbGVkLlxcbicgK1xuXHRcdFx0XHRgU3RhdHVzIENvZGU6ICR7c3RhdHVzQ29kZX1gKTtcblx0XHR9XG5cblx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdGNhbGxiYWNrKGVycm9yKTtcblx0XHRcdC8vIGZyZWUgdXAgbWVtb3J5XG5cdFx0XHRyZXMucmVzdW1lKCk7XG5cdFx0XHRyZXR1cm4gO1xuXHRcdH1cblxuXHRcdGxldCByYXdEYXRhID0gJyc7XG5cdFx0cmVzLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7IHJhd0RhdGEgKz0gY2h1bms7IH0pO1xuXHRcdHJlcy5vbignZW5kJywgKCkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIHJhd0RhdGEpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KS5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlBPU1QgRXJyb3JcIiwgZXJyb3IpO1xuXHRcdGNhbGxiYWNrKGVycm9yKTtcblx0fSk7XG5cbiAgICBpZihkYXRhICYmIGRhdGEucGlwZSAmJiB0eXBlb2YgZGF0YS5waXBlID09PSBcImZ1bmN0aW9uXCIpe1xuICAgICAgICBkYXRhLnBpcGUocmVxKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmKHR5cGVvZiBkYXRhICE9PSAnc3RyaW5nJyAmJiAhQnVmZmVyLmlzQnVmZmVyKGRhdGEpKSB7XG5cdFx0ZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuXHR9XG5cblx0cmVxLndyaXRlKGRhdGEpO1xuXHRyZXEuZW5kKCk7XG59O1xuXG4kJC5yZW1vdGUuZG9IdHRwR2V0ID0gZnVuY3Rpb24gZG9IdHRwR2V0KHVybCwgY2FsbGJhY2spe1xuICAgIGNvbnN0IGlubmVyVXJsID0gVVJMLnBhcnNlKHVybCk7XG5cblx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRob3N0bmFtZTogaW5uZXJVcmwuaG9zdG5hbWUsXG5cdFx0cGF0aDogaW5uZXJVcmwucGF0aG5hbWUgKyAoaW5uZXJVcmwuc2VhcmNoIHx8ICcnKSxcblx0XHRwb3J0OiBwYXJzZUludChpbm5lclVybC5wb3J0KSxcblx0XHRoZWFkZXJzOiB7XG5cdFx0XHQnVXNlci1BZ2VudCc6IHVzZXJBZ2VudFxuXHRcdH0sXG5cdFx0bWV0aG9kOiAnR0VUJ1xuXHR9O1xuXG5cdGNvbnN0IG5ldHdvcmsgPSBnZXROZXR3b3JrRm9yT3B0aW9ucyhpbm5lclVybCk7XG5cblx0Y29uc3QgcmVxID0gbmV0d29yay5yZXF1ZXN0KG9wdGlvbnMsIChyZXMpID0+IHtcblx0XHRjb25zdCB7IHN0YXR1c0NvZGUgfSA9IHJlcztcblxuXHRcdGxldCBlcnJvcjtcblx0XHRpZiAoc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG5cdFx0XHRlcnJvciA9IG5ldyBFcnJvcignUmVxdWVzdCBGYWlsZWQuXFxuJyArXG5cdFx0XHRcdGBTdGF0dXMgQ29kZTogJHtzdGF0dXNDb2RlfWApO1xuXHRcdFx0ZXJyb3IuY29kZSA9IHN0YXR1c0NvZGU7XG5cdFx0fVxuXG5cdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRjYWxsYmFjayhlcnJvcik7XG5cdFx0XHQvLyBmcmVlIHVwIG1lbW9yeVxuXHRcdFx0cmVzLnJlc3VtZSgpO1xuXHRcdFx0cmV0dXJuIDtcblx0XHR9XG5cblx0XHRsZXQgcmF3RGF0YTtcblx0XHRjb25zdCBjb250ZW50VHlwZSA9IHJlcy5oZWFkZXJzWydjb250ZW50LXR5cGUnXTtcblxuXHRcdGlmKGNvbnRlbnRUeXBlID09PSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiKXtcblx0XHRcdHJhd0RhdGEgPSBbXTtcblx0XHR9ZWxzZXtcblx0XHRcdHJhd0RhdGEgPSAnJztcblx0XHR9XG5cblx0XHRyZXMub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcblx0XHRcdGlmKEFycmF5LmlzQXJyYXkocmF3RGF0YSkpe1xuXHRcdFx0XHRyYXdEYXRhLnB1c2goLi4uY2h1bmspO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHJhd0RhdGEgKz0gY2h1bms7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmVzLm9uKCdlbmQnLCAoKSA9PiB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZihBcnJheS5pc0FycmF5KHJhd0RhdGEpKXtcblx0XHRcdFx0XHRyYXdEYXRhID0gQnVmZmVyLmZyb20ocmF3RGF0YSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIHJhd0RhdGEpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiQ2xpZW50IGVycm9yOlwiLCBlcnIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHRyZXEub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcblx0XHRpZihlcnJvciAmJiBlcnJvci5jb2RlICE9PSAnRUNPTk5SRVNFVCcpe1xuICAgICAgICBcdGNvbnNvbGUubG9nKFwiR0VUIEVycm9yXCIsIGVycm9yKTtcblx0XHR9XG5cblx0XHRjYWxsYmFjayhlcnJvcik7XG5cdH0pO1xuXG5cdHJlcS5lbmQoKTtcbn07XG5cbiQkLnJlbW90ZS5iYXNlNjRFbmNvZGUgPSBmdW5jdGlvbiBiYXNlNjRFbmNvZGUoc3RyaW5nVG9FbmNvZGUpe1xuICAgIHJldHVybiBCdWZmZXIuZnJvbShzdHJpbmdUb0VuY29kZSkudG9TdHJpbmcoJ2Jhc2U2NCcpO1xufTtcblxuJCQucmVtb3RlLmJhc2U2NERlY29kZSA9IGZ1bmN0aW9uIGJhc2U2NERlY29kZShlbmNvZGVkU3RyaW5nKXtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20oZW5jb2RlZFN0cmluZywgJ2Jhc2U2NCcpLnRvU3RyaW5nKCdhc2NpaScpO1xufTsiLCJjb25zdCBjb25zVXRpbCA9IHJlcXVpcmUoJ3NpZ25zZW5zdXMnKS5jb25zVXRpbDtcbmNvbnN0IGJlZXNIZWFsZXIgPSByZXF1aXJlKFwic3dhcm11dGlsc1wiKS5iZWVzSGVhbGVyO1xuXG5mdW5jdGlvbiBCbG9ja2NoYWluKHBkcykge1xuICAgIGxldCBzd2FybSA9IG51bGw7XG5cbiAgICB0aGlzLmJlZ2luVHJhbnNhY3Rpb24gPSBmdW5jdGlvbiAodHJhbnNhY3Rpb25Td2FybSkge1xuICAgICAgICBpZiAoIXRyYW5zYWN0aW9uU3dhcm0pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBzd2FybScpO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dhcm0gPSB0cmFuc2FjdGlvblN3YXJtO1xuICAgICAgICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uKHBkcy5nZXRIYW5kbGVyKCkpO1xuICAgIH07XG5cbiAgICB0aGlzLmNvbW1pdCA9IGZ1bmN0aW9uICh0cmFuc2FjdGlvbikge1xuXG4gICAgICAgIGNvbnN0IGRpZmYgPSBwZHMuY29tcHV0ZVN3YXJtVHJhbnNhY3Rpb25EaWZmKHN3YXJtLCB0cmFuc2FjdGlvbi5nZXRIYW5kbGVyKCkpO1xuICAgICAgICBjb25zdCB0ID0gY29uc1V0aWwuY3JlYXRlVHJhbnNhY3Rpb24oMCwgZGlmZik7XG4gICAgICAgIGNvbnN0IHNldCA9IHt9O1xuICAgICAgICBzZXRbdC5kaWdlc3RdID0gdDtcbiAgICAgICAgcGRzLmNvbW1pdChzZXQsIDEpO1xuICAgIH07XG59XG5cblxuZnVuY3Rpb24gVHJhbnNhY3Rpb24ocGRzSGFuZGxlcikge1xuICAgIGNvbnN0IEFMSUFTRVMgPSAnL2FsaWFzZXMnO1xuXG5cbiAgICB0aGlzLmFkZCA9IGZ1bmN0aW9uIChhc3NldCkge1xuICAgICAgICBjb25zdCBzd2FybVR5cGVOYW1lID0gYXNzZXQuZ2V0TWV0YWRhdGEoJ3N3YXJtVHlwZU5hbWUnKTtcbiAgICAgICAgY29uc3Qgc3dhcm1JZCA9IGFzc2V0LmdldE1ldGFkYXRhKCdzd2FybUlkJyk7XG5cbiAgICAgICAgY29uc3QgYWxpYXNJbmRleCA9IG5ldyBBbGlhc0luZGV4KHN3YXJtVHlwZU5hbWUpO1xuICAgICAgICBpZiAoYXNzZXQuYWxpYXMgJiYgYWxpYXNJbmRleC5nZXRVaWQoYXNzZXQuYWxpYXMpICE9PSBzd2FybUlkKSB7XG4gICAgICAgICAgICBhbGlhc0luZGV4LmNyZWF0ZShhc3NldC5hbGlhcywgc3dhcm1JZCk7XG4gICAgICAgIH1cblxuICAgICAgICBhc3NldC5zZXRNZXRhZGF0YSgncGVyc2lzdGVkJywgdHJ1ZSk7XG4gICAgICAgIGNvbnN0IHNlcmlhbGl6ZWRTd2FybSA9IGJlZXNIZWFsZXIuYXNKU09OKGFzc2V0LCBudWxsLCBudWxsKTtcblxuICAgICAgICBwZHNIYW5kbGVyLndyaXRlS2V5KHN3YXJtVHlwZU5hbWUgKyAnLycgKyBzd2FybUlkLCBKKHNlcmlhbGl6ZWRTd2FybSkpO1xuICAgIH07XG5cbiAgICB0aGlzLmxvb2t1cCA9IGZ1bmN0aW9uIChhc3NldFR5cGUsIGFpZCkgeyAvLyBhbGlhcyBzYXUgaWRcbiAgICAgICAgbGV0IGxvY2FsVWlkID0gYWlkO1xuXG4gICAgICAgIGlmIChoYXNBbGlhc2VzKGFzc2V0VHlwZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGFsaWFzSW5kZXggPSBuZXcgQWxpYXNJbmRleChhc3NldFR5cGUpO1xuICAgICAgICAgICAgbG9jYWxVaWQgPSBhbGlhc0luZGV4LmdldFVpZChhaWQpIHx8IGFpZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHZhbHVlID0gcGRzSGFuZGxlci5yZWFkS2V5KGFzc2V0VHlwZSArICcvJyArIGxvY2FsVWlkKTtcblxuICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gJCQuYXNzZXQuc3RhcnQoYXNzZXRUeXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHN3YXJtID0gJCQuYXNzZXQuY29udGludWUoYXNzZXRUeXBlLCBKU09OLnBhcnNlKHZhbHVlKSk7XG4gICAgICAgICAgICBzd2FybS5zZXRNZXRhZGF0YShcInBlcnNpc3RlZFwiLCB0cnVlKTtcbiAgICAgICAgICAgIHJldHVybiBzd2FybTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmxvYWRBc3NldHMgPSBmdW5jdGlvbiAoYXNzZXRUeXBlKSB7XG4gICAgICAgIGNvbnN0IGFzc2V0cyA9IFtdO1xuXG4gICAgICAgIGNvbnN0IGFsaWFzSW5kZXggPSBuZXcgQWxpYXNJbmRleChhc3NldFR5cGUpO1xuICAgICAgICBPYmplY3Qua2V5cyhhbGlhc0luZGV4LmdldEFsaWFzZXMoKSkuZm9yRWFjaCgoYWxpYXMpID0+IHtcbiAgICAgICAgICAgIGFzc2V0cy5wdXNoKHRoaXMubG9va3VwKGFzc2V0VHlwZSwgYWxpYXMpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGFzc2V0cztcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRIYW5kbGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gcGRzSGFuZGxlcjtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFzQWxpYXNlcyhzcGFjZU5hbWUpIHtcbiAgICAgICAgcmV0dXJuICEhcGRzSGFuZGxlci5yZWFkS2V5KHNwYWNlTmFtZSArIEFMSUFTRVMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIEFsaWFzSW5kZXgoYXNzZXRUeXBlKSB7XG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKGFsaWFzLCB1aWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0QWxpYXNlcyA9IHRoaXMuZ2V0QWxpYXNlcygpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGFzc2V0QWxpYXNlc1thbGlhc10gIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAkJC5lcnJvckhhbmRsZXIudGhyb3dFcnJvcihuZXcgRXJyb3IoYEFsaWFzICR7YWxpYXN9IGZvciBhc3NldHMgb2YgdHlwZSAke2Fzc2V0VHlwZX0gYWxyZWFkeSBleGlzdHNgKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFzc2V0QWxpYXNlc1thbGlhc10gPSB1aWQ7XG5cbiAgICAgICAgICAgIHBkc0hhbmRsZXIud3JpdGVLZXkoYXNzZXRUeXBlICsgQUxJQVNFUywgSihhc3NldEFsaWFzZXMpKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldFVpZCA9IGZ1bmN0aW9uIChhbGlhcykge1xuICAgICAgICAgICAgY29uc3QgYXNzZXRBbGlhc2VzID0gdGhpcy5nZXRBbGlhc2VzKCk7XG4gICAgICAgICAgICByZXR1cm4gYXNzZXRBbGlhc2VzW2FsaWFzXTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldEFsaWFzZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsZXQgYWxpYXNlcyA9IHBkc0hhbmRsZXIucmVhZEtleShhc3NldFR5cGUgKyBBTElBU0VTKTtcbiAgICAgICAgICAgIHJldHVybiBhbGlhc2VzID8gSlNPTi5wYXJzZShhbGlhc2VzKSA6IHt9O1xuICAgICAgICB9O1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCbG9ja2NoYWluOyIsInZhciBtZW1vcnlQRFMgPSByZXF1aXJlKFwiLi9Jbk1lbW9yeVBEU1wiKTtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5cblxuZnVuY3Rpb24gRm9sZGVyUGVyc2lzdGVudFBEUyhmb2xkZXIpIHtcbiAgICB0aGlzLm1lbUNhY2hlID0gbWVtb3J5UERTLm5ld1BEUyh0aGlzKTtcblxuICAgIGZ1bmN0aW9uIG1rU2luZ2xlTGluZShzdHIpIHtcbiAgICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bXFxuXFxyXS9nLCBcIlwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlQ3VycmVudFZhbHVlRmlsZW5hbWUoKSB7XG4gICAgICAgIHJldHVybiBwYXRoLm5vcm1hbGl6ZShmb2xkZXIgKyAnL2N1cnJlbnRWZXJzaW9uJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Q3VycmVudFZhbHVlKHBhdGgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmKCFmcy5leGlzdHNTeW5jKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYXRoKS50b1N0cmluZygpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Vycm9yICcsIGUpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnBlcnNpc3QgPSBmdW5jdGlvbiAodHJhbnNhY3Rpb25Mb2csIGN1cnJlbnRWYWx1ZXMsIGN1cnJlbnRQdWxzZSkge1xuXG4gICAgICAgIHRyYW5zYWN0aW9uTG9nLmN1cnJlbnRQdWxzZSA9IGN1cnJlbnRQdWxzZTtcbiAgICAgICAgdHJhbnNhY3Rpb25Mb2cgPSBta1NpbmdsZUxpbmUoSlNPTi5zdHJpbmdpZnkodHJhbnNhY3Rpb25Mb2cpKSArIFwiXFxuXCI7XG5cbiAgICAgICAgZnMubWtkaXIoZm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgZnVuY3Rpb24gKGVyciwgcmVzKSB7XG4gICAgICAgICAgICBpZiAoZXJyICYmIGVyci5jb2RlICE9PSBcIkVFWElTVFwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmcy5hcHBlbmRGaWxlU3luYyhmb2xkZXIgKyAnL3RyYW5zYWN0aW9uc0xvZycsIHRyYW5zYWN0aW9uTG9nLCAndXRmOCcpO1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhtYWtlQ3VycmVudFZhbHVlRmlsZW5hbWUoKSwgSlNPTi5zdHJpbmdpZnkoY3VycmVudFZhbHVlcywgbnVsbCwgMSkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgY29uc3QgaW5uZXJWYWx1ZXMgPSBnZXRDdXJyZW50VmFsdWUobWFrZUN1cnJlbnRWYWx1ZUZpbGVuYW1lKCkpO1xuICAgIHRoaXMubWVtQ2FjaGUuaW5pdGlhbGlzZShpbm5lclZhbHVlcyk7XG59XG5cbmV4cG9ydHMubmV3UERTID0gZnVuY3Rpb24gKGZvbGRlcikge1xuICAgIGNvbnN0IHBkcyA9IG5ldyBGb2xkZXJQZXJzaXN0ZW50UERTKGZvbGRlcik7XG4gICAgcmV0dXJuIHBkcy5tZW1DYWNoZTtcbn07XG4iLCJcbnZhciBjdXRpbCAgID0gcmVxdWlyZShcIi4uLy4uL3NpZ25zZW5zdXMvbGliL2NvbnNVdGlsXCIpO1xudmFyIHNzdXRpbCAgPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuXG5cbmZ1bmN0aW9uIFN0b3JhZ2UocGFyZW50U3RvcmFnZSl7XG4gICAgdmFyIGNzZXQgICAgICAgICAgICA9IHt9OyAgLy8gY29udGFpbmVzIGFsbCBrZXlzIGluIHBhcmVudCBzdG9yYWdlLCBjb250YWlucyBvbmx5IGtleXMgdG91Y2hlZCBpbiBoYW5kbGVyc1xuICAgIHZhciB3cml0ZVNldCAgICAgICAgPSAhcGFyZW50U3RvcmFnZSA/IGNzZXQgOiB7fTsgICAvL2NvbnRhaW5zIG9ubHkga2V5cyBtb2RpZmllZCBpbiBoYW5kbGVyc1xuXG4gICAgdmFyIHJlYWRTZXRWZXJzaW9ucyAgPSB7fTsgLy9tZWFuaW5nZnVsIG9ubHkgaW4gaGFuZGxlcnNcbiAgICB2YXIgd3JpdGVTZXRWZXJzaW9ucyA9IHt9OyAvL3dpbGwgc3RvcmUgYWxsIHZlcnNpb25zIGdlbmVyYXRlZCBieSB3cml0ZUtleVxuXG4gICAgdmFyIHZzZCAgICAgICAgICAgICA9IFwiZW1wdHlcIjsgLy9vbmx5IGZvciBwYXJlbnQgc3RvcmFnZVxuICAgIHZhciBwcmV2aW91c1ZTRCAgICAgPSBudWxsO1xuXG4gICAgdmFyIG15Q3VycmVudFB1bHNlICAgID0gMDtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cblxuICAgIGZ1bmN0aW9uIGhhc0xvY2FsS2V5KG5hbWUpe1xuICAgICAgICByZXR1cm4gY3NldC5oYXNPd25Qcm9wZXJ0eShuYW1lKTtcbiAgICB9XG5cbiAgICB0aGlzLmhhc0tleSA9IGZ1bmN0aW9uKG5hbWUpe1xuICAgICAgICByZXR1cm4gcGFyZW50U3RvcmFnZSA/IHBhcmVudFN0b3JhZ2UuaGFzS2V5KG5hbWUpIDogaGFzTG9jYWxLZXkobmFtZSk7XG4gICAgfTtcblxuICAgIHRoaXMucmVhZEtleSA9IGZ1bmN0aW9uIHJlYWRLZXkobmFtZSl7XG4gICAgICAgIHZhciB2YWx1ZTtcbiAgICAgICAgaWYoaGFzTG9jYWxLZXkobmFtZSkpe1xuICAgICAgICAgICAgdmFsdWUgPSBjc2V0W25hbWVdO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGlmKHRoaXMuaGFzS2V5KG5hbWUpKXtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHBhcmVudFN0b3JhZ2UucmVhZEtleShuYW1lKTtcbiAgICAgICAgICAgICAgICBjc2V0W25hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcmVhZFNldFZlcnNpb25zW25hbWVdID0gcGFyZW50U3RvcmFnZS5nZXRWZXJzaW9uKG5hbWUpO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgY3NldFtuYW1lXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZWFkU2V0VmVyc2lvbnNbbmFtZV0gPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd3JpdGVTZXRWZXJzaW9uc1tuYW1lXSA9IHJlYWRTZXRWZXJzaW9uc1tuYW1lXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VmVyc2lvbiA9IGZ1bmN0aW9uKG5hbWUsIHJlYWxWZXJzaW9uKXtcbiAgICAgICAgdmFyIHZlcnNpb24gPSAwO1xuICAgICAgICBpZihoYXNMb2NhbEtleShuYW1lKSl7XG4gICAgICAgICAgICB2ZXJzaW9uID0gcmVhZFNldFZlcnNpb25zW25hbWVdO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGlmKHRoaXMuaGFzS2V5KG5hbWUpKXtcbiAgICAgICAgICAgICAgICBjc2V0W25hbWVdID0gcGFyZW50U3RvcmFnZS5yZWFkS2V5KCk7XG4gICAgICAgICAgICAgICAgdmVyc2lvbiA9IHJlYWRTZXRWZXJzaW9uc1tuYW1lXSA9IHBhcmVudFN0b3JhZ2UuZ2V0VmVyc2lvbihuYW1lKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGNzZXRbbmFtZV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmVhZFNldFZlcnNpb25zW25hbWVdID0gdmVyc2lvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmVyc2lvbjtcbiAgICB9O1xuXG4gICAgdGhpcy53cml0ZUtleSA9IGZ1bmN0aW9uIG1vZGlmeUtleShuYW1lLCB2YWx1ZSl7XG4gICAgICAgIHZhciBrID0gdGhpcy5yZWFkS2V5KG5hbWUpOyAvL1RPRE86IHVudXNlZCB2YXJcblxuICAgICAgICBjc2V0IFtuYW1lXSA9IHZhbHVlO1xuICAgICAgICB3cml0ZVNldFZlcnNpb25zW25hbWVdKys7XG4gICAgICAgIHdyaXRlU2V0W25hbWVdID0gdmFsdWU7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SW5wdXRPdXRwdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpbnB1dDogcmVhZFNldFZlcnNpb25zLFxuICAgICAgICAgICAgb3V0cHV0OiB3cml0ZVNldFxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB0aGlzLmdldEludGVybmFsVmFsdWVzID0gZnVuY3Rpb24oY3VycmVudFB1bHNlLCB1cGRhdGVQcmV2aW91c1ZTRCl7XG4gICAgICAgIGlmKHVwZGF0ZVByZXZpb3VzVlNEKXtcbiAgICAgICAgICAgIG15Q3VycmVudFB1bHNlID0gY3VycmVudFB1bHNlO1xuICAgICAgICAgICAgcHJldmlvdXNWU0QgPSB2c2Q7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNzZXQ6Y3NldCxcbiAgICAgICAgICAgIHdyaXRlU2V0VmVyc2lvbnM6d3JpdGVTZXRWZXJzaW9ucyxcbiAgICAgICAgICAgIHByZXZpb3VzVlNEOnByZXZpb3VzVlNELFxuICAgICAgICAgICAgdnNkOnZzZCxcbiAgICAgICAgICAgIGN1cnJlbnRQdWxzZTpjdXJyZW50UHVsc2VcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdGhpcy5pbml0aWFsaXNlSW50ZXJuYWxWYWx1ZSA9IGZ1bmN0aW9uKHN0b3JlZFZhbHVlcyl7XG4gICAgICAgIGlmKCFzdG9yZWRWYWx1ZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNzZXQgPSBzdG9yZWRWYWx1ZXMuY3NldDtcbiAgICAgICAgd3JpdGVTZXRWZXJzaW9ucyA9IHN0b3JlZFZhbHVlcy53cml0ZVNldFZlcnNpb25zO1xuICAgICAgICB2c2QgPSBzdG9yZWRWYWx1ZXMudnNkO1xuICAgICAgICB3cml0ZVNldCA9IGNzZXQ7XG4gICAgICAgIG15Q3VycmVudFB1bHNlID0gc3RvcmVkVmFsdWVzLmN1cnJlbnRQdWxzZTtcbiAgICAgICAgcHJldmlvdXNWU0QgPSBzdG9yZWRWYWx1ZXMucHJldmlvdXNWU0Q7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGFwcGx5VHJhbnNhY3Rpb24odCl7XG4gICAgICAgIGZvcihsZXQgayBpbiB0Lm91dHB1dCl7IFxuICAgICAgICAgICAgaWYoIXQuaW5wdXQuaGFzT3duUHJvcGVydHkoaykpe1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IobGV0IGwgaW4gdC5pbnB1dCl7XG4gICAgICAgICAgICB2YXIgdHJhbnNhY3Rpb25WZXJzaW9uID0gdC5pbnB1dFtsXTtcbiAgICAgICAgICAgIHZhciBjdXJyZW50VmVyc2lvbiA9IHNlbGYuZ2V0VmVyc2lvbihsKTtcbiAgICAgICAgICAgIGlmKHRyYW5zYWN0aW9uVmVyc2lvbiAhPT0gY3VycmVudFZlcnNpb24pe1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobCwgdHJhbnNhY3Rpb25WZXJzaW9uICwgY3VycmVudFZlcnNpb24pO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvcihsZXQgdiBpbiB0Lm91dHB1dCl7XG4gICAgICAgICAgICBzZWxmLndyaXRlS2V5KHYsIHQub3V0cHV0W3ZdKTtcbiAgICAgICAgfVxuXG5cdFx0dmFyIGFyciA9IHByb2Nlc3MuaHJ0aW1lKCk7XG5cdFx0dmFyIGN1cnJlbnRfc2Vjb25kID0gYXJyWzBdO1xuXHRcdHZhciBkaWZmID0gY3VycmVudF9zZWNvbmQtdC5zZWNvbmQ7XG5cblx0XHRnbG9iYWxbXCJUcmFuemFjdGlvbnNfVGltZVwiXSs9ZGlmZjtcblxuXHRcdHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuY29tcHV0ZVBUQmxvY2sgPSBmdW5jdGlvbihuZXh0QmxvY2tTZXQpeyAgIC8vbWFrZSBhIHRyYW5zYWN0aW9ucyBibG9jayBmcm9tIG5leHRCbG9ja1NldCBieSByZW1vdmluZyBpbnZhbGlkIHRyYW5zYWN0aW9ucyBmcm9tIHRoZSBrZXkgdmVyc2lvbnMgcG9pbnQgb2Ygdmlld1xuICAgICAgICB2YXIgdmFsaWRCbG9jayA9IFtdO1xuICAgICAgICB2YXIgb3JkZXJlZEJ5VGltZSA9IGN1dGlsLm9yZGVyVHJhbnNhY3Rpb25zKG5leHRCbG9ja1NldCk7XG4gICAgICAgIHZhciBpID0gMDtcblxuICAgICAgICB3aGlsZShpIDwgb3JkZXJlZEJ5VGltZS5sZW5ndGgpe1xuICAgICAgICAgICAgdmFyIHQgPSBvcmRlcmVkQnlUaW1lW2ldO1xuICAgICAgICAgICAgaWYoYXBwbHlUcmFuc2FjdGlvbih0KSl7XG4gICAgICAgICAgICAgICAgdmFsaWRCbG9jay5wdXNoKHQuZGlnZXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsaWRCbG9jaztcbiAgICB9O1xuXG4gICAgdGhpcy5jb21taXQgPSBmdW5jdGlvbihibG9ja1NldCl7XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgdmFyIG9yZGVyZWRCeVRpbWUgPSBjdXRpbC5vcmRlclRyYW5zYWN0aW9ucyhibG9ja1NldCk7XG5cbiAgICAgICAgd2hpbGUoaSA8IG9yZGVyZWRCeVRpbWUubGVuZ3RoKXtcbiAgICAgICAgICAgIHZhciB0ID0gb3JkZXJlZEJ5VGltZVtpXTtcbiAgICAgICAgICAgIGlmKCFhcHBseVRyYW5zYWN0aW9uKHQpKXsgLy9wYXJhbm9pZCBjaGVjaywgIGZhaWwgdG8gd29yayBpZiBhIG1ham9yaXR5IGlzIGNvcnJ1cHRlZFxuICAgICAgICAgICAgICAgIC8vcHJldHR5IGJhZFxuICAgICAgICAgICAgICAgIC8vdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGNvbW1pdCBhbiBpbnZhbGlkIGJsb2NrLiBUaGlzIGNvdWxkIGJlIGEgbmFzdHkgYnVnIG9yIHRoZSBzdGFrZWhvbGRlcnMgbWFqb3JpdHkgaXMgY29ycnVwdGVkISBJdCBzaG91bGQgbmV2ZXIgaGFwcGVuIVwiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkZhaWxlZCB0byBjb21taXQgYW4gaW52YWxpZCBibG9jay4gVGhpcyBjb3VsZCBiZSBhIG5hc3R5IGJ1ZyBvciB0aGUgc3Rha2Vob2xkZXJzIG1ham9yaXR5IGlzIGNvcnJ1cHRlZCEgSXQgc2hvdWxkIG5ldmVyIGhhcHBlbiFcIik7IC8vVE9ETzogcmVwbGFjZSB3aXRoIGJldHRlciBlcnJvciBoYW5kbGluZ1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZ2V0VlNEKHRydWUpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFZTRCA9IGZ1bmN0aW9uKGZvcmNlQ2FsY3VsYXRpb24pe1xuICAgICAgICBpZihmb3JjZUNhbGN1bGF0aW9uKXtcbiAgICAgICAgICAgIHZhciB0bXAgPSB0aGlzLmdldEludGVybmFsVmFsdWVzKG15Q3VycmVudFB1bHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHZzZCA9IHNzdXRpbC5oYXNoVmFsdWVzKHRtcCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZzZDtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBJbk1lbW9yeVBEUyhwZXJtYW5lbnRQZXJzaXN0ZW5jZSl7XG5cbiAgICB2YXIgbWFpblN0b3JhZ2UgPSBuZXcgU3RvcmFnZShudWxsKTtcblxuXG4gICAgdGhpcy5nZXRIYW5kbGVyID0gZnVuY3Rpb24oKXsgLy8gYSB3YXkgdG8gd29yayB3aXRoIFBEU1xuICAgICAgICB2YXIgdGVtcFN0b3JhZ2UgPSBuZXcgU3RvcmFnZShtYWluU3RvcmFnZSk7XG4gICAgICAgIHJldHVybiB0ZW1wU3RvcmFnZTtcbiAgICB9O1xuXG4gICAgdGhpcy5jb21wdXRlU3dhcm1UcmFuc2FjdGlvbkRpZmYgPSBmdW5jdGlvbihzd2FybSwgZm9ya2VkUGRzKXtcbiAgICAgICAgdmFyIGlucE91dHAgICAgID0gZm9ya2VkUGRzLmdldElucHV0T3V0cHV0KCk7XG4gICAgICAgIHN3YXJtLmlucHV0ICAgICA9IGlucE91dHAuaW5wdXQ7XG4gICAgICAgIHN3YXJtLm91dHB1dCAgICA9IGlucE91dHAub3V0cHV0O1xuICAgICAgICByZXR1cm4gc3dhcm07XG4gICAgfTtcblxuICAgIHRoaXMuY29tcHV0ZVBUQmxvY2sgPSBmdW5jdGlvbihuZXh0QmxvY2tTZXQpe1xuICAgICAgICB2YXIgdGVtcFN0b3JhZ2UgPSBuZXcgU3RvcmFnZShtYWluU3RvcmFnZSk7XG4gICAgICAgIHJldHVybiB0ZW1wU3RvcmFnZS5jb21wdXRlUFRCbG9jayhuZXh0QmxvY2tTZXQpO1xuXG4gICAgfTtcblxuICAgIHRoaXMuY29tbWl0ID0gZnVuY3Rpb24oYmxvY2tTZXQsIGN1cnJlbnRQdWxzZSl7XG4gICAgICAgIG1haW5TdG9yYWdlLmNvbW1pdChibG9ja1NldCk7XG4gICAgICAgIGlmKHBlcm1hbmVudFBlcnNpc3RlbmNlKSB7XG4gICAgICAgICAgICBwZXJtYW5lbnRQZXJzaXN0ZW5jZS5wZXJzaXN0KGJsb2NrU2V0LCBtYWluU3RvcmFnZS5nZXRJbnRlcm5hbFZhbHVlcyhjdXJyZW50UHVsc2UsIGZhbHNlKSwgY3VycmVudFB1bHNlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmdldFZTRCA9IGZ1bmN0aW9uICgpe1xuICAgICAgICByZXR1cm4gbWFpblN0b3JhZ2UuZ2V0VlNEKGZhbHNlKTtcbiAgICB9O1xuXG4gICAgdGhpcy5pbml0aWFsaXNlID0gZnVuY3Rpb24oc2F2ZWRJbnRlcm5hbFZhbHVlcyl7XG4gICAgICAgIG1haW5TdG9yYWdlLmluaXRpYWxpc2VJbnRlcm5hbFZhbHVlKHNhdmVkSW50ZXJuYWxWYWx1ZXMpO1xuICAgIH07XG5cbn1cblxuXG5leHBvcnRzLm5ld1BEUyA9IGZ1bmN0aW9uKHBlcnNpc3RlbmNlKXtcbiAgICByZXR1cm4gbmV3IEluTWVtb3J5UERTKHBlcnNpc3RlbmNlKTtcbn07IiwiY29uc3QgbWVtb3J5UERTID0gcmVxdWlyZShcIi4vSW5NZW1vcnlQRFNcIik7XG5cbmZ1bmN0aW9uIFBlcnNpc3RlbnRQRFMoe2dldEluaXRWYWx1ZXMsIHBlcnNpc3R9KSB7XG5cdHRoaXMubWVtQ2FjaGUgPSBtZW1vcnlQRFMubmV3UERTKHRoaXMpO1xuXHR0aGlzLnBlcnNpc3QgPSBwZXJzaXN0O1xuXG5cdGNvbnN0IGlubmVyVmFsdWVzID0gZ2V0SW5pdFZhbHVlcygpIHx8IG51bGw7XG5cdHRoaXMubWVtQ2FjaGUuaW5pdGlhbGlzZShpbm5lclZhbHVlcyk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMubmV3UERTID0gZnVuY3Rpb24gKHJlYWRlcldyaXRlcikge1xuXHRjb25zdCBwZHMgPSBuZXcgUGVyc2lzdGVudFBEUyhyZWFkZXJXcml0ZXIpO1xuXHRyZXR1cm4gcGRzLm1lbUNhY2hlO1xufTtcbiIsIlxuJCQuYXNzZXQuZGVzY3JpYmUoXCJBQ0xTY29wZVwiLCB7XG4gICAgcHVibGljOntcbiAgICAgICAgY29uY2VybjpcInN0cmluZzprZXlcIixcbiAgICAgICAgZGI6XCJqc29uXCJcbiAgICB9LFxuICAgIGluaXQ6ZnVuY3Rpb24oY29uY2Vybil7XG4gICAgICAgIHRoaXMuY29uY2VybiA9IGNvbmNlcm47XG4gICAgfSxcbiAgICBhZGRSZXNvdXJjZVBhcmVudCA6IGZ1bmN0aW9uKHJlc291cmNlSWQsIHBhcmVudElkKXtcbiAgICAgICAgLy9UT0RPOiBlbXB0eSBmdW5jdGlvbnMhXG4gICAgfSxcbiAgICBhZGRab25lUGFyZW50IDogZnVuY3Rpb24oem9uZUlkLCBwYXJlbnRJZCl7XG4gICAgICAgIC8vVE9ETzogZW1wdHkgZnVuY3Rpb25zIVxuICAgIH0sXG4gICAgZ3JhbnQgOmZ1bmN0aW9uKGFnZW50SWQsICByZXNvdXJjZUlkKXtcbiAgICAgICAgLy9UT0RPOiBlbXB0eSBmdW5jdGlvbnMhXG4gICAgfSxcbiAgICBhbGxvdyA6ZnVuY3Rpb24oYWdlbnRJZCwgIHJlc291cmNlSWQpe1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59KTsiLCJcbiQkLmFzc2V0LmRlc2NyaWJlKFwiQWdlbnRcIiwge1xuICAgIHB1YmxpYzp7XG4gICAgICAgIGFsaWFzOlwic3RyaW5nOmtleVwiLFxuICAgICAgICBwdWJsaWNLZXk6XCJzdHJpbmdcIlxuICAgIH0sXG4gICAgaW5pdDpmdW5jdGlvbihhbGlhcywgdmFsdWUpe1xuICAgICAgICB0aGlzLmFsaWFzICAgICAgPSBhbGlhcztcbiAgICAgICAgdGhpcy5wdWJsaWNLZXkgID0gdmFsdWU7XG4gICAgfSxcbiAgICB1cGRhdGU6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICB0aGlzLnB1YmxpY0tleSA9IHZhbHVlO1xuICAgIH0sXG4gICAgYWRkQWdlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgSW1wbGVtZW50ZWQnKTtcbiAgICB9LFxuICAgIGxpc3RBZ2VudDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBJbXBsZW1lbnRlZCcpO1xuXG4gICAgfSxcbiAgICByZW1vdmVBZ2VudDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBJbXBsZW1lbnRlZCcpO1xuXG4gICAgfVxufSk7IiwiXG4kJC5hc3NldC5kZXNjcmliZShcIkJhY2t1cFwiLCB7XG4gICAgcHVibGljOntcbiAgICAgICAgaWQ6ICBcInN0cmluZ1wiLFxuICAgICAgICB1cmw6IFwic3RyaW5nXCJcbiAgICB9LFxuXG4gICAgaW5pdDpmdW5jdGlvbihpZCwgdXJsKXtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB0aGlzLnVybCA9IHVybDtcbiAgICB9XG59KTtcbiIsIlxuJCQuYXNzZXQuZGVzY3JpYmUoXCJDU0JNZXRhXCIsIHtcblx0cHVibGljOntcblx0XHRpc01hc3RlcjpcInN0cmluZ1wiLFxuXHRcdGFsaWFzOlwic3RyaW5nOmtleVwiLFxuXHRcdGRlc2NyaXB0aW9uOiBcInN0cmluZ1wiLFxuXHRcdGNyZWF0aW9uRGF0ZTogXCJzdHJpbmdcIixcblx0XHR1cGRhdGVkRGF0ZSA6IFwic3RyaW5nXCIsXG5cdFx0aWQ6IFwic3RyaW5nXCIsXG5cdFx0aWNvbjogXCJzdHJpbmdcIlxuXHR9LFxuXHRpbml0OmZ1bmN0aW9uKGlkKXtcblx0XHR0aGlzLmFsaWFzID0gXCJtZXRhXCI7XG5cdFx0dGhpcy5pZCA9IGlkO1xuXHR9LFxuXG5cdHNldElzTWFzdGVyOiBmdW5jdGlvbiAoaXNNYXN0ZXIpIHtcblx0XHR0aGlzLmlzTWFzdGVyID0gaXNNYXN0ZXI7XG5cdH1cblxufSk7XG4iLCJcbiQkLmFzc2V0LmRlc2NyaWJlKFwiQ1NCUmVmZXJlbmNlXCIsIHtcbiAgICBwdWJsaWM6e1xuICAgICAgICBhbGlhczpcInN0cmluZzprZXlcIixcbiAgICAgICAgc2VlZCA6XCJzdHJpbmdcIixcbiAgICAgICAgZHNlZWQ6XCJzdHJpbmdcIlxuICAgIH0sXG4gICAgaW5pdDpmdW5jdGlvbihhbGlhcywgc2VlZCwgZHNlZWQgKXtcbiAgICAgICAgdGhpcy5hbGlhcyA9IGFsaWFzO1xuICAgICAgICB0aGlzLnNlZWQgID0gc2VlZDtcbiAgICAgICAgdGhpcy5kc2VlZCA9IGRzZWVkO1xuICAgIH0sXG4gICAgdXBkYXRlOmZ1bmN0aW9uKGZpbmdlcnByaW50KXtcbiAgICAgICAgdGhpcy5maW5nZXJwcmludCA9IGZpbmdlcnByaW50O1xuICAgICAgICB0aGlzLnZlcnNpb24rKztcbiAgICB9LFxuICAgIHJlZ2lzdGVyQmFja3VwVXJsOmZ1bmN0aW9uKGJhY2t1cFVybCl7XG4gICAgICAgIHRoaXMuYmFja3Vwcy5hZGQoYmFja3VwVXJsKTtcbiAgICB9XG59KTtcbiIsIlxuJCQuYXNzZXQuZGVzY3JpYmUoXCJEb21haW5SZWZlcmVuY2VcIiwge1xuICAgIHB1YmxpYzp7XG4gICAgICAgIHJvbGU6XCJzdHJpbmc6aW5kZXhcIixcbiAgICAgICAgYWxpYXM6XCJzdHJpbmc6a2V5XCIsXG4gICAgICAgIGFkZHJlc3NlczpcIm1hcFwiLFxuICAgICAgICBjb25zdGl0dXRpb246XCJzdHJpbmdcIixcbiAgICAgICAgd29ya3NwYWNlOlwic3RyaW5nXCIsXG4gICAgICAgIHJlbW90ZUludGVyZmFjZXM6XCJtYXBcIixcbiAgICAgICAgbG9jYWxJbnRlcmZhY2VzOlwibWFwXCJcbiAgICB9LFxuICAgIGluaXQ6ZnVuY3Rpb24ocm9sZSwgYWxpYXMpe1xuICAgICAgICB0aGlzLnJvbGUgPSByb2xlO1xuICAgICAgICB0aGlzLmFsaWFzID0gYWxpYXM7XG4gICAgICAgIHRoaXMuYWRkcmVzc2VzID0ge307XG4gICAgICAgIHRoaXMucmVtb3RlSW50ZXJmYWNlcyA9IHt9O1xuICAgICAgICB0aGlzLmxvY2FsSW50ZXJmYWNlcyA9IHt9O1xuICAgIH0sXG4gICAgdXBkYXRlRG9tYWluQWRkcmVzczpmdW5jdGlvbihyZXBsaWNhdGlvbkFnZW50LCBhZGRyZXNzKXtcbiAgICAgICAgaWYoIXRoaXMuYWRkcmVzc2VzKXtcbiAgICAgICAgICAgIHRoaXMuYWRkcmVzc2VzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRyZXNzZXNbcmVwbGljYXRpb25BZ2VudF0gPSBhZGRyZXNzO1xuICAgIH0sXG4gICAgcmVtb3ZlRG9tYWluQWRkcmVzczpmdW5jdGlvbihyZXBsaWNhdGlvbkFnZW50KXtcbiAgICAgICAgdGhpcy5hZGRyZXNzZXNbcmVwbGljYXRpb25BZ2VudF0gPSB1bmRlZmluZWQ7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmFkZHJlc3Nlc1tyZXBsaWNhdGlvbkFnZW50XTtcbiAgICB9LFxuICAgIGFkZFJlbW90ZUludGVyZmFjZTpmdW5jdGlvbihhbGlhcywgcmVtb3RlRW5kUG9pbnQpe1xuICAgICAgICBpZighdGhpcy5yZW1vdGVJbnRlcmZhY2VzKXtcbiAgICAgICAgICAgIHRoaXMucmVtb3RlSW50ZXJmYWNlcyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3RlSW50ZXJmYWNlc1thbGlhc10gPSByZW1vdGVFbmRQb2ludDtcbiAgICB9LFxuICAgIHJlbW92ZVJlbW90ZUludGVyZmFjZTpmdW5jdGlvbihhbGlhcyl7XG4gICAgICAgIGlmKHRoaXMucmVtb3RlSW50ZXJmYWNlKXtcbiAgICAgICAgICAgIHRoaXMucmVtb3RlSW50ZXJmYWNlc1thbGlhc10gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5yZW1vdGVJbnRlcmZhY2VzW2FsaWFzXTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgYWRkTG9jYWxJbnRlcmZhY2U6ZnVuY3Rpb24oYWxpYXMsIHBhdGgpe1xuICAgICAgICBpZighdGhpcy5sb2NhbEludGVyZmFjZXMpe1xuICAgICAgICAgICAgdGhpcy5sb2NhbEludGVyZmFjZXMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvY2FsSW50ZXJmYWNlc1thbGlhc10gPSBwYXRoO1xuICAgIH0sXG4gICAgcmVtb3ZlTG9jYWxJbnRlcmZhY2U6ZnVuY3Rpb24oYWxpYXMpe1xuICAgICAgICBpZih0aGlzLmxvY2FsSW50ZXJmYWNlcyl7XG4gICAgICAgICAgICB0aGlzLmxvY2FsSW50ZXJmYWNlc1thbGlhc10gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5sb2NhbEludGVyZmFjZXNbYWxpYXNdO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBzZXRDb25zdGl0dXRpb246ZnVuY3Rpb24ocGF0aE9yVXJsT3JDU0Ipe1xuICAgICAgICB0aGlzLmNvbnN0aXR1dGlvbiA9IHBhdGhPclVybE9yQ1NCO1xuICAgIH0sXG4gICAgZ2V0Q29uc3RpdHV0aW9uOmZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbnN0aXR1dGlvbjtcbiAgICB9LFxuICAgIHNldFdvcmtzcGFjZTpmdW5jdGlvbihwYXRoKXtcbiAgICAgICAgdGhpcy53b3Jrc3BhY2UgPSBwYXRoO1xuICAgIH0sXG4gICAgZ2V0V29ya3NwYWNlOmZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB0aGlzLndvcmtzcGFjZTtcbiAgICB9XG59KTsiLCIkJC5hc3NldC5kZXNjcmliZShcIkVtYmVkZGVkRmlsZVwiLCB7XG5cdHB1YmxpYzp7XG5cdFx0YWxpYXM6XCJzdHJpbmdcIlxuXHR9LFxuXG5cdGluaXQ6ZnVuY3Rpb24oYWxpYXMpe1xuXHRcdHRoaXMuYWxpYXMgPSBhbGlhcztcblx0fVxufSk7IiwiJCQuYXNzZXQuZGVzY3JpYmUoXCJGaWxlUmVmZXJlbmNlXCIsIHtcblx0cHVibGljOntcblx0XHRhbGlhczpcInN0cmluZ1wiLFxuXHRcdHNlZWQgOlwic3RyaW5nXCIsXG5cdFx0ZHNlZWQ6XCJzdHJpbmdcIlxuXHR9LFxuXHRpbml0OmZ1bmN0aW9uKGFsaWFzLCBzZWVkLCBkc2VlZCl7XG5cdFx0dGhpcy5hbGlhcyA9IGFsaWFzO1xuXHRcdHRoaXMuc2VlZCAgPSBzZWVkO1xuXHRcdHRoaXMuZHNlZWQgPSBkc2VlZDtcblx0fVxufSk7IiwiXG4kJC5hc3NldC5kZXNjcmliZShcImtleVwiLCB7XG4gICAgcHVibGljOntcbiAgICAgICAgYWxpYXM6XCJzdHJpbmdcIlxuICAgIH0sXG4gICAgaW5pdDpmdW5jdGlvbihhbGlhcywgdmFsdWUpe1xuICAgICAgICB0aGlzLmFsaWFzID0gYWxpYXM7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB9LFxuICAgIHVwZGF0ZTpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB9XG59KTsiLCJtb2R1bGUuZXhwb3J0cyA9ICQkLmxpYnJhcnkoZnVuY3Rpb24oKXtcbiAgICByZXF1aXJlKFwiLi9Eb21haW5SZWZlcmVuY2VcIik7XG4gICAgcmVxdWlyZShcIi4vQ1NCUmVmZXJlbmNlXCIpO1xuICAgIHJlcXVpcmUoXCIuL0FnZW50XCIpO1xuICAgIHJlcXVpcmUoXCIuL0JhY2t1cFwiKTtcbiAgICByZXF1aXJlKFwiLi9BQ0xTY29wZVwiKTtcbiAgICByZXF1aXJlKFwiLi9LZXlcIik7XG4gICAgcmVxdWlyZShcIi4vdHJhbnNhY3Rpb25zXCIpO1xuICAgIHJlcXVpcmUoXCIuL0ZpbGVSZWZlcmVuY2VcIik7XG4gICAgcmVxdWlyZShcIi4vRW1iZWRkZWRGaWxlXCIpO1xuICAgIHJlcXVpcmUoJy4vQ1NCTWV0YScpO1xufSk7IiwiJCQudHJhbnNhY3Rpb24uZGVzY3JpYmUoXCJ0cmFuc2FjdGlvbnNcIiwge1xuICAgIHVwZGF0ZUtleTogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIHRyYW5zYWN0aW9uID0gJCQuYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHRoaXMpO1xuICAgICAgICB2YXIga2V5ID0gdHJhbnNhY3Rpb24ubG9va3VwKFwiS2V5XCIsIGtleSk7XG4gICAgICAgIHZhciBrZXlQZXJtaXNzaW9ucyA9IHRyYW5zYWN0aW9uLmxvb2t1cChcIkFDTFNjb3BlXCIsIFwiS2V5c0NvbmNlcm5cIik7XG4gICAgICAgIGlmIChrZXlQZXJtaXNzaW9ucy5hbGxvdyh0aGlzLmFnZW50SWQsIGtleSkpIHtcbiAgICAgICAgICAgIGtleS51cGRhdGUodmFsdWUpO1xuICAgICAgICAgICAgdHJhbnNhY3Rpb24uYWRkKGtleSk7XG4gICAgICAgICAgICAkJC5ibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNlY3VyaXR5RXJyb3IoXCJBZ2VudCBcIiArIHRoaXMuYWdlbnRJZCArIFwiIGRlbmllZCB0byBjaGFuZ2Uga2V5IFwiICsga2V5KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgYWRkQ2hpbGQ6IGZ1bmN0aW9uIChhbGlhcykge1xuICAgICAgICB2YXIgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oKTtcbiAgICAgICAgdmFyIHJlZmVyZW5jZSA9ICQkLmNvbnRyYWN0LnN0YXJ0KFwiRG9tYWluUmVmZXJlbmNlXCIsIFwiaW5pdFwiLCBcImNoaWxkXCIsIGFsaWFzKTtcbiAgICAgICAgdHJhbnNhY3Rpb24uYWRkKHJlZmVyZW5jZSk7XG4gICAgICAgICQkLmJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcbiAgICB9LFxuICAgIGFkZFBhcmVudDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciByZWZlcmVuY2UgPSAkJC5jb250cmFjdC5zdGFydChcIkRvbWFpblJlZmVyZW5jZVwiLCBcImluaXRcIiwgXCJjaGlsZFwiLCBhbGlhcyk7XG4gICAgICAgIHRoaXMudHJhbnNhY3Rpb24uc2F2ZShyZWZlcmVuY2UpO1xuICAgICAgICAkJC5ibG9ja2NoYWluLnBlcnNpc3QodGhpcy50cmFuc2FjdGlvbik7XG4gICAgfSxcbiAgICBhZGRBZ2VudDogZnVuY3Rpb24gKGFsaWFzLCBwdWJsaWNLZXkpIHtcbiAgICAgICAgdmFyIHJlZmVyZW5jZSA9ICQkLmNvbnRyYWN0LnN0YXJ0KFwiQWdlbnRcIiwgXCJpbml0XCIsIGFsaWFzLCBwdWJsaWNLZXkpO1xuICAgICAgICB0aGlzLnRyYW5zYWN0aW9uLnNhdmUocmVmZXJlbmNlKTtcbiAgICAgICAgJCQuYmxvY2tjaGFpbi5wZXJzaXN0KHRoaXMudHJhbnNhY3Rpb24pO1xuICAgIH0sXG4gICAgdXBkYXRlQWdlbnQ6IGZ1bmN0aW9uIChhbGlhcywgcHVibGljS2V5KSB7XG4gICAgICAgIHZhciBhZ2VudCA9IHRoaXMudHJhbnNhY3Rpb24ubG9va3VwKFwiQWdlbnRcIiwgYWxpYXMpO1xuICAgICAgICBhZ2VudC51cGRhdGUocHVibGljS2V5KTtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbi5zYXZlKHJlZmVyZW5jZSk7XG4gICAgICAgICQkLmJsb2NrY2hhaW4ucGVyc2lzdCh0aGlzLnRyYW5zYWN0aW9uKTtcbiAgICB9XG59KTtcblxuXG4kJC5uZXdUcmFuc2FjdGlvbiA9IGZ1bmN0aW9uKHRyYW5zYWN0aW9uRmxvdyxjdG9yLC4uLmFyZ3Mpe1xuICAgIHZhciB0cmFuc2FjdGlvbiA9ICQkLnN3YXJtLnN0YXJ0KCB0cmFuc2FjdGlvbkZsb3cpO1xuICAgIHRyYW5zYWN0aW9uLm1ldGEoXCJhZ2VudElkXCIsICQkLmN1cnJlbnRBZ2VudElkKTtcbiAgICB0cmFuc2FjdGlvbi5tZXRhKFwiY29tbWFuZFwiLCBcInJ1bkV2ZXJ5V2hlcmVcIik7XG4gICAgdHJhbnNhY3Rpb24ubWV0YShcImN0b3JcIiwgY3Rvcik7XG4gICAgdHJhbnNhY3Rpb24ubWV0YShcImFyZ3NcIiwgYXJncyk7XG4gICAgdHJhbnNhY3Rpb24uc2lnbigpO1xuICAgIC8vJCQuYmxvY2tjaGFpbi5zZW5kRm9yQ29uc2VudCh0cmFuc2FjdGlvbik7XG4gICAgLy90ZW1wb3JhcnkgdW50aWwgY29uc2VudCBsYXllciBpcyBhY3RpdmF0ZWRcbiAgICB0cmFuc2FjdGlvbltjdG9yXS5hcHBseSh0cmFuc2FjdGlvbixhcmdzKTtcbn07XG5cbi8qXG51c2FnZXM6XG4gICAgJCQubmV3VHJhbnNhY3Rpb24oXCJkb21haW4udHJhbnNhY3Rpb25zXCIsIFwidXBkYXRlS2V5XCIsIFwia2V5XCIsIFwidmFsdWVcIilcblxuICovXG4iLCIvLyBjb25zdCBzaGFyZWRQaGFzZXMgPSByZXF1aXJlKCcuL3NoYXJlZFBoYXNlcycpO1xuLy8gY29uc3QgYmVlc0hlYWxlciA9IHJlcXVpcmUoJ3N3YXJtdXRpbHMnKS5iZWVzSGVhbGVyO1xuXG4kJC5zd2FybXMuZGVzY3JpYmUoXCJhZ2VudHNcIiwge1xuICAgIGFkZDogZnVuY3Rpb24gKGFsaWFzLCBwdWJsaWNLZXkpIHtcbiAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuICAgICAgICBjb25zdCBhZ2VudEFzc2V0ID0gdHJhbnNhY3Rpb24ubG9va3VwKCdnbG9iYWwuQWdlbnQnLCBhbGlhcyk7XG5cbiAgICAgICAgYWdlbnRBc3NldC5pbml0KGFsaWFzLCBwdWJsaWNLZXkpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdHJhbnNhY3Rpb24uYWRkKGFnZW50QXNzZXQpO1xuXG4gICAgICAgICAgICAkJC5ibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgdGhpcy5yZXR1cm4obmV3IEVycm9yKFwiQWdlbnQgYWxyZWFkeSBleGlzdHNcIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXR1cm4obnVsbCwgYWxpYXMpO1xuICAgIH0sXG59KTtcbiIsImNvbnN0IHNoYXJlZFBoYXNlcyA9IHJlcXVpcmUoJy4vc2hhcmVkUGhhc2VzJyk7XG5jb25zdCBiZWVzSGVhbGVyID0gcmVxdWlyZSgnc3dhcm11dGlscycpLmJlZXNIZWFsZXI7XG5cbiQkLnN3YXJtcy5kZXNjcmliZShcImRvbWFpbnNcIiwge1xuICAgIGFkZDogZnVuY3Rpb24gKHJvbGUsIGFsaWFzKSB7XG4gICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gJCQuYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcbiAgICAgICAgY29uc3QgZG9tYWluc1N3YXJtID0gdHJhbnNhY3Rpb24ubG9va3VwKCdnbG9iYWwuRG9tYWluUmVmZXJlbmNlJywgYWxpYXMpO1xuXG4gICAgICAgIGlmICghZG9tYWluc1N3YXJtKSB7XG4gICAgICAgICAgICB0aGlzLnJldHVybihuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIHN3YXJtIG5hbWVkIFwiZ2xvYmFsLkRvbWFpblJlZmVyZW5jZVwiJykpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZG9tYWluc1N3YXJtLmluaXQocm9sZSwgYWxpYXMpO1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5hZGQoZG9tYWluc1N3YXJtKTtcblxuICAgICAgICAgICAgJCQuYmxvY2tjaGFpbi5jb21taXQodHJhbnNhY3Rpb24pO1xuICAgICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICAgICAgIHRoaXMucmV0dXJuKG5ldyBFcnJvcihcIkRvbWFpbiBhbGxyZWFkeSBleGlzdHMhXCIpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmV0dXJuKG51bGwsIGFsaWFzKTtcbiAgICB9LFxuICAgIGdldERvbWFpbkRldGFpbHM6ZnVuY3Rpb24oYWxpYXMpe1xuICAgICAgICBjb25zdCB0cmFuc2FjdGlvbiA9ICQkLmJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG4gICAgICAgIGNvbnN0IGRvbWFpbiA9IHRyYW5zYWN0aW9uLmxvb2t1cCgnZ2xvYmFsLkRvbWFpblJlZmVyZW5jZScsIGFsaWFzKTtcblxuICAgICAgICBpZiAoIWRvbWFpbikge1xuICAgICAgICAgICAgdGhpcy5yZXR1cm4obmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBzd2FybSBuYW1lZCBcImdsb2JhbC5Eb21haW5SZWZlcmVuY2VcIicpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmV0dXJuKG51bGwsIGJlZXNIZWFsZXIuYXNKU09OKGRvbWFpbikucHVibGljVmFycyk7XG4gICAgfSxcbiAgICBjb25uZWN0RG9tYWluVG9SZW1vdGUoZG9tYWluTmFtZSwgYWxpYXMsIHJlbW90ZUVuZFBvaW50KXtcbiAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuICAgICAgICBjb25zdCBkb21haW4gPSB0cmFuc2FjdGlvbi5sb29rdXAoJ2dsb2JhbC5Eb21haW5SZWZlcmVuY2UnLCBkb21haW5OYW1lKTtcblxuICAgICAgICBpZiAoIWRvbWFpbikge1xuICAgICAgICAgICAgdGhpcy5yZXR1cm4obmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBzd2FybSBuYW1lZCBcImdsb2JhbC5Eb21haW5SZWZlcmVuY2VcIicpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvbWFpbi5hZGRSZW1vdGVJbnRlcmZhY2UoYWxpYXMsIHJlbW90ZUVuZFBvaW50KTtcblxuICAgICAgICB0cnl7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5hZGQoZG9tYWluKTtcblxuICAgICAgICAgICAgJCQuYmxvY2tjaGFpbi5jb21taXQodHJhbnNhY3Rpb24pO1xuICAgICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB0aGlzLnJldHVybihuZXcgRXJyb3IoXCJEb21haW4gdXBkYXRlIGZhaWxlZCFcIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXR1cm4obnVsbCwgYWxpYXMpO1xuICAgIH0sXG4gICAgLy8gZ2V0RG9tYWluRGV0YWlsczogc2hhcmVkUGhhc2VzLmdldEFzc2V0RmFjdG9yeSgnZ2xvYmFsLkRvbWFpblJlZmVyZW5jZScpLFxuICAgIGdldERvbWFpbnM6IHNoYXJlZFBoYXNlcy5nZXRBbGxBc3NldHNGYWN0b3J5KCdnbG9iYWwuRG9tYWluUmVmZXJlbmNlJylcbn0pO1xuIiwicmVxdWlyZSgnLi9kb21haW5Td2FybXMnKTtcbnJlcXVpcmUoJy4vYWdlbnRzU3dhcm0nKTsiLCJjb25zdCBiZWVzSGVhbGVyID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIikuYmVlc0hlYWxlcjtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZ2V0QXNzZXRGYWN0b3J5OiBmdW5jdGlvbihhc3NldFR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGFsaWFzKSB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2FjdGlvbiA9ICQkLmJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG4gICAgICAgICAgICBjb25zdCBkb21haW5SZWZlcmVuY2VTd2FybSA9IHRyYW5zYWN0aW9uLmxvb2t1cChhc3NldFR5cGUsIGFsaWFzKTtcblxuICAgICAgICAgICAgaWYoIWRvbWFpblJlZmVyZW5jZVN3YXJtKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXR1cm4obmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBzd2FybSBuYW1lZCBcIiR7YXNzZXRUeXBlfVwiYCkpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5yZXR1cm4odW5kZWZpbmVkLCBiZWVzSGVhbGVyLmFzSlNPTihkb21haW5SZWZlcmVuY2VTd2FybSkpO1xuICAgICAgICB9O1xuICAgIH0sXG4gICAgZ2V0QWxsQXNzZXRzRmFjdG9yeTogZnVuY3Rpb24oYXNzZXRUeXBlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gJCQuYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcbiAgICAgICAgICAgIGNvbnN0IGRvbWFpbnMgPSB0cmFuc2FjdGlvbi5sb2FkQXNzZXRzKGFzc2V0VHlwZSkgfHwgW107XG5cbiAgICAgICAgICAgIHRoaXMucmV0dXJuKHVuZGVmaW5lZCwgZG9tYWlucy5tYXAoKGRvbWFpbikgPT4gYmVlc0hlYWxlci5hc0pTT04oZG9tYWluKSkpO1xuICAgICAgICB9O1xuICAgIH1cbn07IiwiLypcbmNvbnNlbnN1cyBoZWxwZXIgZnVuY3Rpb25zXG4qL1xuXG52YXIgcHNrY3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcblxuXG5mdW5jdGlvbiBQdWxzZShzaWduZXIsIGN1cnJlbnRQdWxzZU51bWJlciwgYmxvY2ssIG5ld1RyYW5zYWN0aW9ucywgdnNkLCB0b3AsIGxhc3QpIHtcbiAgICB0aGlzLnNpZ25lciAgICAgICAgID0gc2lnbmVyOyAgICAgICAgICAgICAgIC8vYS5rLmEuIGRlbGVnYXRlZEFnZW50TmFtZVxuICAgIHRoaXMuY3VycmVudFB1bHNlICAgPSBjdXJyZW50UHVsc2VOdW1iZXI7XG4gICAgdGhpcy5sc2V0ICAgICAgICAgICA9IG5ld1RyYW5zYWN0aW9uczsgICAgICAvL2RpZ2VzdCAtPiB0cmFuc2FjdGlvblxuICAgIHRoaXMucHRCbG9jayAgICAgICAgPSBibG9jazsgICAgICAgICAgICAgICAgLy9hcnJheSBvZiBkaWdlc3RzXG4gICAgdGhpcy52c2QgICAgICAgICAgICA9IHZzZDtcbiAgICB0aGlzLnRvcCAgICAgICAgICAgID0gdG9wOyAgICAgICAgICAgICAgICAgIC8vIGEuay5hLiB0b3BQdWxzZUNvbnNlbnN1c1xuICAgIHRoaXMubGFzdCAgICAgICAgICAgPSBsYXN0OyAgICAgICAgICAgICAgICAgLy8gYS5rLmEuIGxhc3RQdWxzZUFjaGlldmVkQ29uc2Vuc3VzXG59XG5cbmZ1bmN0aW9uIFRyYW5zYWN0aW9uKGN1cnJlbnRQdWxzZSwgc3dhcm0pIHtcbiAgICB0aGlzLmlucHV0ICAgICAgPSBzd2FybS5pbnB1dDtcbiAgICB0aGlzLm91dHB1dCAgICAgPSBzd2FybS5vdXRwdXQ7XG4gICAgdGhpcy5zd2FybSAgICAgID0gc3dhcm07XG5cbiAgICB2YXIgYXJyID0gcHJvY2Vzcy5ocnRpbWUoKTtcbiAgICB0aGlzLnNlY29uZCAgICAgPSBhcnJbMF07XG4gICAgdGhpcy5uYW5vc2Vjb2QgID0gYXJyWzFdO1xuXG4gICAgdGhpcy5DUCAgICAgICAgID0gY3VycmVudFB1bHNlO1xuICAgIHRoaXMuZGlnZXN0ICAgICA9IHBza2NyeXB0by5oYXNoVmFsdWVzKHRoaXMpO1xufVxuXG5cbmV4cG9ydHMuY3JlYXRlVHJhbnNhY3Rpb24gPSBmdW5jdGlvbiAoY3VycmVudFB1bHNlLCBzd2FybSkge1xuICAgIHJldHVybiBuZXcgVHJhbnNhY3Rpb24oY3VycmVudFB1bHNlLCBzd2FybSk7XG59XG5cbmV4cG9ydHMuY3JlYXRlUHVsc2UgPSBmdW5jdGlvbiAoc2lnbmVyLCBjdXJyZW50UHVsc2VOdW1iZXIsIGJsb2NrLCBuZXdUcmFuc2FjdGlvbnMsIHZzZCwgdG9wLCBsYXN0KSB7XG4gICAgcmV0dXJuIG5ldyBQdWxzZShzaWduZXIsIGN1cnJlbnRQdWxzZU51bWJlciwgYmxvY2ssIG5ld1RyYW5zYWN0aW9ucywgdnNkLCB0b3AsIGxhc3QpO1xufVxuXG5leHBvcnRzLm9yZGVyVHJhbnNhY3Rpb25zID0gZnVuY3Rpb24gKHBzZXQpIHsgLy9vcmRlciBpbiBwbGFjZSB0aGUgcHNldCBhcnJheVxuICAgIHZhciBhcnIgPSBbXTtcbiAgICBmb3IgKHZhciBkIGluIHBzZXQpIHtcbiAgICAgICAgYXJyLnB1c2gocHNldFtkXSk7XG4gICAgfVxuXG4gICAgYXJyLnNvcnQoZnVuY3Rpb24gKHQxLCB0Mikge1xuICAgICAgICBpZiAodDEuQ1AgPCB0Mi5DUCkgcmV0dXJuIC0xO1xuICAgICAgICBpZiAodDEuQ1AgPiB0Mi5DUCkgcmV0dXJuIDE7XG4gICAgICAgIGlmICh0MS5zZWNvbmQgPCB0Mi5zZWNvbmQpIHJldHVybiAtMTtcbiAgICAgICAgaWYgKHQxLnNlY29uZCA+IHQyLnNlY29uZCkgcmV0dXJuIDE7XG4gICAgICAgIGlmICh0MS5uYW5vc2Vjb2QgPCB0Mi5uYW5vc2Vjb2QpIHJldHVybiAtMTtcbiAgICAgICAgaWYgKHQxLm5hbm9zZWNvZCA+IHQyLm5hbm9zZWNvZCkgcmV0dXJuIDE7XG4gICAgICAgIGlmICh0MS5kaWdlc3QgPCB0Mi5kaWdlc3QpIHJldHVybiAtMTtcbiAgICAgICAgaWYgKHQxLmRpZ2VzdCA+IHQyLmRpZ2VzdCkgcmV0dXJuIDE7XG4gICAgICAgIHJldHVybiAwOyAvL29ubHkgZm9yIGlkZW50aWNhbCB0cmFuc2FjdGlvbnMuLi5cbiAgICB9KVxuICAgIHJldHVybiBhcnI7XG59XG5cbmZ1bmN0aW9uIGdldE1ham9yaXR5RmllbGRJblB1bHNlcyhhbGxQdWxzZXMsIGZpZWxkTmFtZSwgZXh0cmFjdEZpZWxkTmFtZSwgdm90aW5nQm94KSB7XG4gICAgdmFyIGNvdW50ZXJGaWVsZHMgPSB7fTtcbiAgICB2YXIgbWFqb3JpdHlWYWx1ZTtcbiAgICB2YXIgcHVsc2U7XG5cbiAgICBmb3IgKHZhciBhZ2VudCBpbiBhbGxQdWxzZXMpIHtcbiAgICAgICAgcHVsc2UgPSBhbGxQdWxzZXNbYWdlbnRdO1xuICAgICAgICB2YXIgdiA9IHB1bHNlW2ZpZWxkTmFtZV07XG4gICAgICAgIGNvdW50ZXJGaWVsZHNbdl0gPSB2b3RpbmdCb3gudm90ZShjb3VudGVyRmllbGRzW3ZdKTsgICAgICAgIC8vICsrY291bnRlckZpZWxkc1t2XVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgaW4gY291bnRlckZpZWxkcykge1xuICAgICAgICBpZiAodm90aW5nQm94LmlzTWFqb3JpdGFyaWFuKGNvdW50ZXJGaWVsZHNbaV0pKSB7XG4gICAgICAgICAgICBtYWpvcml0eVZhbHVlID0gaTtcbiAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgPT0gZXh0cmFjdEZpZWxkTmFtZSkgeyAgICAgICAgICAgICAgICAgICAgLy8/Pz8gXCJ2c2RcIiwgXCJ2c2RcIlxuICAgICAgICAgICAgICAgIHJldHVybiBtYWpvcml0eVZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcImJsb2NrRGlnZXN0XCIsIFwicHRCbG9ja1wiXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYWdlbnQgaW4gYWxsUHVsc2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIHB1bHNlID0gYWxsUHVsc2VzW2FnZW50XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHB1bHNlW2ZpZWxkTmFtZV0gPT0gbWFqb3JpdHlWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHB1bHNlW2V4dHJhY3RGaWVsZE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBcIm5vbmVcIjsgLy90aGVyZSBpcyBubyBtYWpvcml0eVxufVxuXG5leHBvcnRzLmRldGVjdE1ham9yaXRhcmlhblZTRCA9IGZ1bmN0aW9uIChwdWxzZSwgcHVsc2VzSGlzdG9yeSwgdm90aW5nQm94KSB7XG4gICAgaWYgKHB1bHNlID09IDApIHJldHVybiBcIm5vbmVcIjtcbiAgICB2YXIgcHVsc2VzID0gcHVsc2VzSGlzdG9yeVtwdWxzZV07XG4gICAgdmFyIG1ham9yaXR5VmFsdWUgPSBnZXRNYWpvcml0eUZpZWxkSW5QdWxzZXMocHVsc2VzLCBcInZzZFwiLCBcInZzZFwiLCB2b3RpbmdCb3gpO1xuICAgIHJldHVybiBtYWpvcml0eVZhbHVlO1xufVxuXG4vKlxuICAgIGRldGVjdCBhIGNhbmRpZGF0ZSBibG9ja1xuICovXG5leHBvcnRzLmRldGVjdE1ham9yaXRhcmlhblBUQmxvY2sgPSBmdW5jdGlvbiAocHVsc2UsIHB1bHNlc0hpc3RvcnksIHZvdGluZ0JveCkge1xuICAgIGlmIChwdWxzZSA9PSAwKSByZXR1cm4gXCJub25lXCI7XG4gICAgdmFyIHB1bHNlcyA9IHB1bHNlc0hpc3RvcnlbcHVsc2VdO1xuICAgIHZhciBidEJsb2NrID0gZ2V0TWFqb3JpdHlGaWVsZEluUHVsc2VzKHB1bHNlcywgXCJibG9ja0RpZ2VzdFwiLCBcInB0QmxvY2tcIiwgdm90aW5nQm94KTtcbiAgICByZXR1cm4gYnRCbG9jaztcbn1cblxuZXhwb3J0cy5tYWtlU2V0RnJvbUJsb2NrID0gZnVuY3Rpb24gKGtub3duVHJhbnNhY3Rpb25zLCBibG9jaykge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJsb2NrLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBpdGVtID0gYmxvY2tbaV07XG4gICAgICAgIHJlc3VsdFtpdGVtXSA9IGtub3duVHJhbnNhY3Rpb25zW2l0ZW1dO1xuICAgICAgICBpZiAoIWtub3duVHJhbnNhY3Rpb25zLmhhc093blByb3BlcnR5KGl0ZW0pKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhuZXcgRXJyb3IoXCJEbyBub3QgZ2l2ZSB1bmtub3duIHRyYW5zYWN0aW9uIGRpZ2VzdHMgdG8gbWFrZVNldEZyb21CbG9jayBcIiArIGl0ZW0pKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnRzLnNldHNDb25jYXQgPSBmdW5jdGlvbiAodGFyZ2V0LCBmcm9tKSB7XG4gICAgZm9yICh2YXIgZCBpbiBmcm9tKSB7XG4gICAgICAgIHRhcmdldFtkXSA9IGZyb21bZF07XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbmV4cG9ydHMuc2V0c1JlbW92ZUFycmF5ID0gZnVuY3Rpb24gKHRhcmdldCwgYXJyKSB7XG4gICAgYXJyLmZvckVhY2goaXRlbSA9PiBkZWxldGUgdGFyZ2V0W2l0ZW1dKTtcbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG5leHBvcnRzLnNldHNSZW1vdmVQdEJsb2NrQW5kUGFzdFRyYW5zYWN0aW9ucyA9IGZ1bmN0aW9uICh0YXJnZXQsIGFyciwgbWF4UHVsc2UpIHtcbiAgICB2YXIgdG9CZVJlbW92ZWQgPSBbXTtcbiAgICBmb3IgKHZhciBkIGluIHRhcmdldCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGFycltpXSA9PSBkIHx8IHRhcmdldFtkXS5DUCA8IG1heFB1bHNlKSB7XG4gICAgICAgICAgICAgICAgdG9CZVJlbW92ZWQucHVzaChkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRvQmVSZW1vdmVkLmZvckVhY2goaXRlbSA9PiBkZWxldGUgdGFyZ2V0W2l0ZW1dKTtcbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG5leHBvcnRzLmNyZWF0ZURlbW9jcmF0aWNWb3RpbmdCb3ggPSBmdW5jdGlvbiAoc2hhcmVIb2xkZXJzQ291bnRlcikge1xuICAgIHJldHVybiB7XG4gICAgICAgIHZvdGU6IGZ1bmN0aW9uIChwcmV2aW9zVmFsdWUpIHtcbiAgICAgICAgICAgIGlmICghcHJldmlvc1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcHJldmlvc1ZhbHVlID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcmV2aW9zVmFsdWUgKyAxO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzTWFqb3JpdGFyaWFuOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2codmFsdWUgLCBNYXRoLmZsb29yKHNoYXJlSG9sZGVyc0NvdW50ZXIvMikgKyAxKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSA+PSBNYXRoLmZsb29yKHNoYXJlSG9sZGVyc0NvdW50ZXIgLyAyKSArIDE7XG4gICAgICAgIH1cbiAgICB9O1xufVxuIiwiLy8gcmVxdWlyZShcIi4vZmxvd3MvQ1NCbWFuYWdlclwiKTtcbnJlcXVpcmUoXCIuL2Zsb3dzL3JlbW90ZVN3YXJtaW5nXCIpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuY29uc3QgaHR0cFdyYXBwZXIgPSByZXF1aXJlKCcuL2xpYnMvaHR0cC13cmFwcGVyJyk7XG5jb25zdCBlZGZzID0gcmVxdWlyZShcImVkZnNcIik7XG5jb25zdCBFREZTTWlkZGxld2FyZSA9IGVkZnMuRURGU01pZGRsZXdhcmU7XG5jb25zdCBTZXJ2ZXIgPSBodHRwV3JhcHBlci5TZXJ2ZXI7XG5jb25zdCBSb3V0ZXIgPSBodHRwV3JhcHBlci5Sb3V0ZXI7XG5jb25zdCBUb2tlbkJ1Y2tldCA9IHJlcXVpcmUoJy4vbGlicy9Ub2tlbkJ1Y2tldCcpO1xuXG5cbmZ1bmN0aW9uIFZpcnR1YWxNUSh7bGlzdGVuaW5nUG9ydCwgcm9vdEZvbGRlciwgc3NsQ29uZmlnfSwgY2FsbGJhY2spIHtcblx0Y29uc3QgcG9ydCA9IGxpc3RlbmluZ1BvcnQgfHwgODA4MDtcblx0Y29uc3Qgc2VydmVyID0gbmV3IFNlcnZlcihzc2xDb25maWcpLmxpc3Rlbihwb3J0KTtcblx0Y29uc3QgdG9rZW5CdWNrZXQgPSBuZXcgVG9rZW5CdWNrZXQoNjAwMDAwLDEsMTApO1xuXHRjb25zdCBDU0Jfc3RvcmFnZV9mb2xkZXIgPSBcInVwbG9hZHNcIjtcblx0Y29uc3QgU1dBUk1fc3RvcmFnZV9mb2xkZXIgPSBcInN3YXJtc1wiO1xuXHRjb25zb2xlLmxvZyhcIkxpc3RlbmluZyBvbiBwb3J0OlwiLCBwb3J0KTtcblxuXHR0aGlzLmNsb3NlID0gc2VydmVyLmNsb3NlO1xuXHQkJC5mbG93LnN0YXJ0KFwiQnJpY2tzTWFuYWdlclwiKS5pbml0KHBhdGguam9pbihyb290Rm9sZGVyLCBDU0Jfc3RvcmFnZV9mb2xkZXIpLCBmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHR0aHJvdyBlcnI7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnNvbGUubG9nKFwiQ1NCTWFuYWdlciBpcyB1c2luZyBmb2xkZXJcIiwgcmVzdWx0KTtcblx0XHRcdCQkLmZsb3cuc3RhcnQoXCJSZW1vdGVTd2FybWluZ1wiKS5pbml0KHBhdGguam9pbihyb290Rm9sZGVyLCBTV0FSTV9zdG9yYWdlX2ZvbGRlciksIGZ1bmN0aW9uKGVyciwgcmVzdWx0KXtcblx0XHRcdFx0cmVnaXN0ZXJFbmRwb2ludHMoKTtcblx0XHRcdFx0aWYgKGNhbGxiYWNrKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KTtcblxuXHRmdW5jdGlvbiByZWdpc3RlckVuZHBvaW50cygpIHtcblx0XHRjb25zdCByb3V0ZXIgPSBuZXcgUm91dGVyKHNlcnZlcik7XG5cdFx0cm91dGVyLnVzZShcIi9FREZTXCIsIChuZXdTZXJ2ZXIpID0+IHtcblx0XHRcdG5ldyBFREZTTWlkZGxld2FyZShuZXdTZXJ2ZXIpO1xuXHRcdH0pO1xuXG5cdFx0c2VydmVyLnVzZShmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XG5cdFx0XHRyZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ0dFVCwgUE9TVCwgUFVULCBERUxFVEUnKTtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlLCBBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nKTtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJywgdHJ1ZSk7XG5cdFx0XHRuZXh0KCk7XG5cdFx0fSk7XG5cblx0XHRzZXJ2ZXIudXNlKGZ1bmN0aW9uIChyZXEsIHJlcywgbmV4dCkge1xuXHRcdFx0Y29uc3QgaXAgPSByZXMuc29ja2V0LnJlbW90ZUFkZHJlc3M7XG5cblx0XHRcdHRva2VuQnVja2V0LnRha2VUb2tlbihpcCwgdG9rZW5CdWNrZXQuQ09TVF9NRURJVU0sIGZ1bmN0aW9uKGVyciwgcmVtYWluZWRUb2tlbnMpIHtcblx0XHRcdFx0cmVzLnNldEhlYWRlcignWC1SYXRlTGltaXQtTGltaXQnLCB0b2tlbkJ1Y2tldC5nZXRMaW1pdEJ5Q29zdCh0b2tlbkJ1Y2tldC5DT1NUX01FRElVTSkpO1xuXHRcdFx0XHRyZXMuc2V0SGVhZGVyKCdYLVJhdGVMaW1pdC1SZW1haW5pbmcnLCB0b2tlbkJ1Y2tldC5nZXRSZW1haW5pbmdUb2tlbkJ5Q29zdChyZW1haW5lZFRva2VucywgdG9rZW5CdWNrZXQuQ09TVF9NRURJVU0pKTtcblxuXHRcdFx0XHRpZihlcnIpIHtcblx0XHRcdFx0XHRzd2l0Y2ggKGVycikge1xuXHRcdFx0XHRcdFx0Y2FzZSBUb2tlbkJ1Y2tldC5FUlJPUl9MSU1JVF9FWENFRURFRDpcblx0XHRcdFx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSA0Mjk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSA1MDA7XG5cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0bmV4dCgpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRzZXJ2ZXIucG9zdCgnLzpjaGFubmVsSWQnLCBmdW5jdGlvbiAocmVxLCByZXMpIHtcblxuXHRcdFx0JCQuZmxvdy5zdGFydChcIlJlbW90ZVN3YXJtaW5nXCIpLnN0YXJ0U3dhcm0ocmVxLnBhcmFtcy5jaGFubmVsSWQsIHJlcSwgZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG5cdFx0XHRcdHJlcy5zdGF0dXNDb2RlID0gMjAxO1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHRcdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDUwMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHNlcnZlci5nZXQoJy86Y2hhbm5lbElkJywgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG5cdFx0XHQkJC5mbG93LnN0YXJ0KFwiUmVtb3RlU3dhcm1pbmdcIikud2FpdEZvclN3YXJtKHJlcS5wYXJhbXMuY2hhbm5lbElkLCByZXMsIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCwgY29uZmlybWF0aW9uSWQpIHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSA1MDA7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsZXQgcmVzcG9uc2VNZXNzYWdlID0gcmVzdWx0O1xuXG5cdFx0XHRcdGlmKChyZXEucXVlcnkud2FpdENvbmZpcm1hdGlvbiB8fCAnZmFsc2UnKSAgPT09ICdmYWxzZScpIHtcblx0XHRcdFx0XHRyZXMub24oJ2ZpbmlzaCcsICgpID0+IHtcblx0XHRcdFx0XHRcdCQkLmZsb3cuc3RhcnQoJ1JlbW90ZVN3YXJtaW5nJykuY29uZmlybVN3YXJtKHJlcS5wYXJhbXMuY2hhbm5lbElkLCBjb25maXJtYXRpb25JZCwgKGVycikgPT4ge30pO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJlc3BvbnNlTWVzc2FnZSA9IHtyZXN1bHQsIGNvbmZpcm1hdGlvbklkfTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJlcy53cml0ZShKU09OLnN0cmluZ2lmeShyZXNwb25zZU1lc3NhZ2UpKTtcblx0XHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRzZXJ2ZXIuZGVsZXRlKFwiLzpjaGFubmVsSWQvOmNvbmZpcm1hdGlvbklkXCIsIGZ1bmN0aW9uKHJlcSwgcmVzKXtcblx0XHRcdCQkLmZsb3cuc3RhcnQoXCJSZW1vdGVTd2FybWluZ1wiKS5jb25maXJtU3dhcm0ocmVxLnBhcmFtcy5jaGFubmVsSWQsIHJlcS5wYXJhbXMuY29uZmlybWF0aW9uSWQsIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHRcdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDUwMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHNlcnZlci5vcHRpb25zKCcvKicsIGZ1bmN0aW9uIChyZXEsIHJlcykge1xuXHRcdFx0dmFyIGhlYWRlcnMgPSB7fTtcblx0XHRcdC8vIElFOCBkb2VzIG5vdCBhbGxvdyBkb21haW5zIHRvIGJlIHNwZWNpZmllZCwganVzdCB0aGUgKlxuXHRcdFx0Ly8gaGVhZGVyc1tcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiXSA9IHJlcS5oZWFkZXJzLm9yaWdpbjtcblx0XHRcdGhlYWRlcnNbXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIl0gPSBcIipcIjtcblx0XHRcdGhlYWRlcnNbXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCJdID0gXCJQT1NULCBHRVQsIFBVVCwgREVMRVRFLCBPUFRJT05TXCI7XG5cdFx0XHRoZWFkZXJzW1wiQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHNcIl0gPSB0cnVlO1xuXHRcdFx0aGVhZGVyc1tcIkFjY2Vzcy1Db250cm9sLU1heC1BZ2VcIl0gPSAnMzYwMCc7IC8vb25lIGhvdXJcblx0XHRcdGhlYWRlcnNbXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCJdID0gXCJDb250ZW50LVR5cGUsIEFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiwgVXNlci1BZ2VudFwiO1xuXHRcdFx0cmVzLndyaXRlSGVhZCgyMDAsIGhlYWRlcnMpO1xuXHRcdFx0cmVzLmVuZCgpO1xuXHRcdH0pO1xuXG5cdFx0c2VydmVyLnVzZShmdW5jdGlvbiAocmVxLCByZXMpIHtcblx0XHRcdHJlcy5zdGF0dXNDb2RlID0gNDA0O1xuXHRcdFx0cmVzLmVuZCgpO1xuXHRcdH0pO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZVZpcnR1YWxNUSA9IGZ1bmN0aW9uKHBvcnQsIGZvbGRlciwgc3NsQ29uZmlnLCBjYWxsYmFjayl7XG5cdGlmKHR5cGVvZiBzc2xDb25maWcgPT09ICdmdW5jdGlvbicpIHtcblx0XHRjYWxsYmFjayA9IHNzbENvbmZpZztcblx0XHRzc2xDb25maWcgPSB1bmRlZmluZWQ7XG5cdH1cblxuXHRyZXR1cm4gbmV3IFZpcnR1YWxNUSh7bGlzdGVuaW5nUG9ydDpwb3J0LCByb290Rm9sZGVyOmZvbGRlciwgc3NsQ29uZmlnfSwgY2FsbGJhY2spO1xufTtcblxubW9kdWxlLmV4cG9ydHMuVmlydHVhbE1RID0gVmlydHVhbE1RO1xuXG5tb2R1bGUuZXhwb3J0cy5nZXRIdHRwV3JhcHBlciA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gcmVxdWlyZSgnLi9saWJzL2h0dHAtd3JhcHBlcicpO1xufTtcbiIsImNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgZm9sZGVyTVEgPSByZXF1aXJlKFwiZm9sZGVybXFcIik7XG5cbmxldCByb290Zm9sZGVyO1xuY29uc3QgY2hhbm5lbHMgPSB7XG5cbn07XG5cbmZ1bmN0aW9uIHN0b3JlQ2hhbm5lbChpZCwgY2hhbm5lbCwgY2xpZW50Q29uc3VtZXIpe1xuXHR2YXIgc3RvcmVkQ2hhbm5lbCA9IHtcblx0XHRjaGFubmVsOiBjaGFubmVsLFxuXHRcdGhhbmRsZXI6IGNoYW5uZWwuZ2V0SGFuZGxlcigpLFxuXHRcdG1xQ29uc3VtZXI6IG51bGwsXG5cdFx0Y29uc3VtZXJzOltdXG5cdH07XG5cblx0aWYoIWNoYW5uZWxzW2lkXSl7XG5cdFx0Y2hhbm5lbHNbaWRdID0gc3RvcmVkQ2hhbm5lbDtcblx0fVxuXG5cdGlmKGNsaWVudENvbnN1bWVyKXtcblx0XHRzdG9yZWRDaGFubmVsID0gY2hhbm5lbHNbaWRdO1xuXHRcdGNoYW5uZWxzW2lkXS5jb25zdW1lcnMucHVzaChjbGllbnRDb25zdW1lcik7XG5cdH1cblxuXHRyZXR1cm4gc3RvcmVkQ2hhbm5lbDtcbn1cblxuXG5mdW5jdGlvbiByZWdpc3RlckNvbnN1bWVyKGlkLCBjb25zdW1lcil7XG5cdGNvbnN0IHN0b3JlZENoYW5uZWwgPSBjaGFubmVsc1tpZF07XG5cdGlmKHN0b3JlZENoYW5uZWwpe1xuXHRcdHN0b3JlZENoYW5uZWwuY29uc3VtZXJzLnB1c2goY29uc3VtZXIpO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gZGVsaXZlclRvQ29uc3VtZXJzKGNvbnN1bWVycywgZXJyLCByZXN1bHQsIGNvbmZpcm1hdGlvbklkKXtcblx0aWYoIWNvbnN1bWVycyl7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG4gICAgbGV0IGRlbGl2ZXJlZE1lc3NhZ2VzID0gMDtcbiAgICB3aGlsZShjb25zdW1lcnMubGVuZ3RoPjApe1xuICAgICAgICAvL3dlIGl0ZXJhdGUgdGhyb3VnaCB0aGUgY29uc3VtZXJzIGxpc3QgaW4gY2FzZSB0aGF0IHdlIGhhdmUgYSByZWYuIG9mIGEgcmVxdWVzdCB0aGF0IHRpbWUtb3V0ZWQgbWVhbndoaWxlXG4gICAgICAgIC8vYW5kIGluIHRoaXMgY2FzZSB3ZSBleHBlY3QgdG8gaGF2ZSBtb3JlIHRoZW4gb25lIGNvbnN1bWVyLi4uXG4gICAgICAgIGNvbnN0IGNvbnN1bWVyID0gY29uc3VtZXJzLnBvcCgpO1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBjb25zdW1lcihlcnIsIHJlc3VsdCwgY29uZmlybWF0aW9uSWQpO1xuICAgICAgICAgICAgZGVsaXZlcmVkTWVzc2FnZXMrKztcbiAgICAgICAgfWNhdGNoKGVycm9yKXtcbiAgICAgICAgICAgIC8vanVzdCBzb21lIHNtYWxsIGVycm9yIGlnbm9yZWRcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgY2F0Y2hlZFwiLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuICEhZGVsaXZlcmVkTWVzc2FnZXM7XG59XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyTWFpbkNvbnN1bWVyKGlkKXtcblx0Y29uc3Qgc3RvcmVkQ2hhbm5lbCA9IGNoYW5uZWxzW2lkXTtcblx0aWYoc3RvcmVkQ2hhbm5lbCAmJiAhc3RvcmVkQ2hhbm5lbC5tcUNvbnN1bWVyKXtcblx0XHRzdG9yZWRDaGFubmVsLm1xQ29uc3VtZXIgPSAoZXJyLCByZXN1bHQsIGNvbmZpcm1hdGlvbklkKSA9PiB7XG5cdFx0XHRjaGFubmVsc1tpZF0gPSBudWxsO1xuXHRcdFx0ZGVsaXZlclRvQ29uc3VtZXJzKHN0b3JlZENoYW5uZWwuY29uc3VtZXJzLCBlcnIsIHJlc3VsdCwgY29uZmlybWF0aW9uSWQpO1xuXHRcdFx0Lyp3aGlsZShzdG9yZWRDaGFubmVsLmNvbnN1bWVycy5sZW5ndGg+MCl7XG5cdFx0XHRcdC8vd2UgaXRlcmF0ZSB0aHJvdWdoIHRoZSBjb25zdW1lcnMgbGlzdCBpbiBjYXNlIHRoYXQgd2UgaGF2ZSBhIHJlZi4gb2YgYSByZXF1ZXN0IHRoYXQgdGltZS1vdXRlZCBtZWFud2hpbGVcblx0XHRcdFx0Ly9hbmQgaW4gdGhpcyBjYXNlIHdlIGV4cGVjdCB0byBoYXZlIG1vcmUgdGhlbiBvbmUgY29uc3VtZXIuLi5cblx0XHRcdFx0bGV0IGNvbnN1bWVyID0gc3RvcmVkQ2hhbm5lbC5jb25zdW1lcnMucG9wKCk7XG5cdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRjb25zdW1lcihlcnIsIHJlc3VsdCwgY29uZmlybWF0aW9uSWQpO1xuXHRcdFx0XHR9Y2F0Y2goZXJyb3Ipe1xuXHRcdFx0XHRcdC8vanVzdCBzb21lIHNtYWxsIGVycm9yIGlnbm9yZWRcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIkVycm9yIGNhdGNoZWRcIiwgZXJyb3IpO1xuXHRcdFx0XHR9XG5cdFx0XHR9Ki9cblx0XHR9O1xuXG5cdFx0c3RvcmVkQ2hhbm5lbC5jaGFubmVsLnJlZ2lzdGVyQ29uc3VtZXIoc3RvcmVkQ2hhbm5lbC5tcUNvbnN1bWVyLCBmYWxzZSwgKCkgPT4gISFjaGFubmVsc1tpZF0pO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmVhZFN3YXJtRnJvbVN0cmVhbShzdHJlYW0sIGNhbGxiYWNrKXtcbiAgICBsZXQgc3dhcm0gPSBcIlwiO1xuICAgIHN0cmVhbS5vbignZGF0YScsIChjaHVuaykgPT57XG4gICAgICAgIHN3YXJtICs9IGNodW5rO1xuXHR9KTtcblxuICAgIHN0cmVhbS5vbihcImVuZFwiLCAoKSA9PiB7XG4gICAgICAgY2FsbGJhY2sobnVsbCwgc3dhcm0pO1xuXHR9KTtcblxuICAgIHN0cmVhbS5vbihcImVycm9yXCIsIChlcnIpID0+e1xuICAgICAgICBjYWxsYmFjayhlcnIpO1xuXHR9KTtcbn1cblxuJCQuZmxvdy5kZXNjcmliZShcIlJlbW90ZVN3YXJtaW5nXCIsIHtcblx0aW5pdDogZnVuY3Rpb24ocm9vdEZvbGRlciwgY2FsbGJhY2spe1xuXHRcdGlmKCFyb290Rm9sZGVyKXtcblx0XHRcdGNhbGxiYWNrKG5ldyBFcnJvcihcIk5vIHJvb3QgZm9sZGVyIHNwZWNpZmllZCFcIikpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRyb290Rm9sZGVyID0gcGF0aC5yZXNvbHZlKHJvb3RGb2xkZXIpO1xuXHRcdGZzLm1rZGlyKHJvb3RGb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCBmdW5jdGlvbihlcnIsIHBhdGgpe1xuXHRcdFx0cm9vdGZvbGRlciA9IHJvb3RGb2xkZXI7XG5cblx0XHRcdGlmKCFlcnIpe1xuXHRcdFx0XHRmcy5yZWFkZGlyKHJvb3Rmb2xkZXIsIChjbGVhbkVyciwgZmlsZXMpID0+IHtcblx0XHRcdFx0XHR3aGlsZShmaWxlcyAmJiBmaWxlcy5sZW5ndGggPiAwKXtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiUm9vdCBmb2xkZXIgZm91bmQgdG8gaGF2ZSBzb21lIGRpcnMuIFN0YXJ0IGNsZWFuaW5nIGVtcHR5IGRpcnMuXCIpO1xuXHRcdFx0XHRcdFx0bGV0IGRpciA9IGZpbGVzLnBvcCgpO1xuXHRcdFx0XHRcdFx0dHJ5e1xuXHRcdFx0XHRcdFx0XHRjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5cdFx0XHRcdFx0XHRcdGRpciA9IHBhdGguam9pbihyb290Rm9sZGVyLCBkaXIpO1xuXHRcdFx0XHRcdFx0XHR2YXIgY29udGVudCA9IGZzLnJlYWRkaXJTeW5jKGRpcik7XG5cdFx0XHRcdFx0XHRcdGlmKGNvbnRlbnQgJiYgY29udGVudC5sZW5ndGggPT09IDApe1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiUmVtb3ZpbmcgZW1wdHkgZGlyXCIsIGRpcik7XG5cdFx0XHRcdFx0XHRcdFx0ZnMucm1kaXJTeW5jKGRpcik7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1jYXRjaChlcnIpe1xuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKGVycik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhbGxiYWNrKGNsZWFuRXJyLCByb290Rm9sZGVyKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVyciwgcm9vdEZvbGRlcik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdHN0YXJ0U3dhcm06IGZ1bmN0aW9uIChjaGFubmVsSWQsIHJlYWRTd2FybVN0cmVhbSwgY2FsbGJhY2spIHtcblx0XHRsZXQgY2hhbm5lbCA9IGNoYW5uZWxzW2NoYW5uZWxJZF07XG5cdFx0aWYgKCFjaGFubmVsKSB7XG5cdFx0XHRjb25zdCBjaGFubmVsRm9sZGVyID0gcGF0aC5qb2luKHJvb3Rmb2xkZXIsIGNoYW5uZWxJZCk7XG5cdFx0XHRsZXQgc3RvcmVkQ2hhbm5lbDtcblx0XHRcdGNoYW5uZWwgPSBmb2xkZXJNUS5jcmVhdGVRdWUoY2hhbm5lbEZvbGRlciwgKGVyciwgcmVzdWx0KSA9PiB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHQvL3dlIGRlbGV0ZSB0aGUgY2hhbm5lbCBpbiBvcmRlciB0byB0cnkgYWdhaW4gbmV4dCB0aW1lXG5cdFx0XHRcdFx0Y2hhbm5lbHNbY2hhbm5lbElkXSA9IG51bGw7XG5cdFx0XHRcdFx0Y2FsbGJhY2sobmV3IEVycm9yKFwiQ2hhbm5lbCBpbml0aWFsaXphdGlvbiBmYWlsZWRcIikpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG4gICAgICAgICAgICAgICAgcmVhZFN3YXJtRnJvbVN0cmVhbShyZWFkU3dhcm1TdHJlYW0sIChlcnIsIHN3YXJtU2VyaWFsaXphdGlvbikgPT4ge1xuXHRcdFx0XHRcdGlmKGVycil7XG5cdFx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdFx0XHR9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VudCA9IGRlbGl2ZXJUb0NvbnN1bWVycyhjaGFubmVsLmNvbnN1bWVycywgbnVsbCwgSlNPTi5wYXJzZShzd2FybVNlcmlhbGl6YXRpb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1jYXRjaChlcnIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFzZW50KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yZWRDaGFubmVsLmhhbmRsZXIuc2VuZFN3YXJtU2VyaWFsaXphdGlvbihzd2FybVNlcmlhbGl6YXRpb24sIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgXHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgc3dhcm1TZXJpYWxpemF0aW9uKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRcblx0XHRcdH0pO1xuXHRcdFx0c3RvcmVkQ2hhbm5lbCA9IHN0b3JlQ2hhbm5lbChjaGFubmVsSWQsIGNoYW5uZWwpO1xuXHRcdH0gZWxzZSB7XG4gICAgICAgICAgICByZWFkU3dhcm1Gcm9tU3RyZWFtKHJlYWRTd2FybVN0cmVhbSwgKGVyciwgc3dhcm1TZXJpYWxpemF0aW9uKSA9PiB7XG4gICAgICAgICAgICBcdGlmKGVycil7XG4gICAgICAgICAgICBcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHRcdH1lbHNle1xuICAgICAgICAgICAgXHRcdGxldCBzZW50ID0gZmFsc2U7XG4gICAgICAgICAgICBcdFx0dHJ5e1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VudCA9IGRlbGl2ZXJUb0NvbnN1bWVycyhjaGFubmVsLmNvbnN1bWVycywgbnVsbCwgSlNPTi5wYXJzZShzd2FybVNlcmlhbGl6YXRpb24pKTtcblx0XHRcdFx0XHR9Y2F0Y2goZXJyKXtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHRcdFx0fVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKCFzZW50KXtcblx0XHRcdFx0XHRcdGNoYW5uZWwuaGFuZGxlci5zZW5kU3dhcm1TZXJpYWxpemF0aW9uKHN3YXJtU2VyaWFsaXphdGlvbiwgY2FsbGJhY2spO1xuXHRcdFx0XHRcdH1lbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHN3YXJtU2VyaWFsaXphdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXHRjb25maXJtU3dhcm06IGZ1bmN0aW9uKGNoYW5uZWxJZCwgY29uZmlybWF0aW9uSWQsIGNhbGxiYWNrKXtcblx0XHRpZighY29uZmlybWF0aW9uSWQpe1xuXHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3Qgc3RvcmVkQ2hhbm5lbCA9IGNoYW5uZWxzW2NoYW5uZWxJZF07XG5cdFx0aWYoIXN0b3JlZENoYW5uZWwpe1xuXHRcdFx0Y29uc3QgY2hhbm5lbEZvbGRlciA9IHBhdGguam9pbihyb290Zm9sZGVyLCBjaGFubmVsSWQpO1xuXHRcdFx0Y29uc3QgY2hhbm5lbCA9IGZvbGRlck1RLmNyZWF0ZVF1ZShjaGFubmVsRm9sZGVyLCAoZXJyLCByZXN1bHQpID0+IHtcblx0XHRcdFx0aWYoZXJyKXtcblx0XHRcdFx0XHQvL3dlIGRlbGV0ZSB0aGUgY2hhbm5lbCBpbiBvcmRlciB0byB0cnkgYWdhaW4gbmV4dCB0aW1lXG5cdFx0XHRcdFx0Y2hhbm5lbHNbY2hhbm5lbElkXSA9IG51bGw7XG5cdFx0XHRcdFx0Y2FsbGJhY2sobmV3IEVycm9yKFwiQ2hhbm5lbCBpbml0aWFsaXphdGlvbiBmYWlsZWRcIikpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRjaGFubmVsLnVubGlua0NvbnRlbnQoY29uZmlybWF0aW9uSWQsIGNhbGxiYWNrKTtcblx0XHRcdH0pO1xuXHRcdH1lbHNle1xuXHRcdFx0c3RvcmVkQ2hhbm5lbC5jaGFubmVsLnVubGlua0NvbnRlbnQoY29uZmlybWF0aW9uSWQsIGNhbGxiYWNrKTtcblx0XHR9XG5cdH0sXG5cdHdhaXRGb3JTd2FybTogZnVuY3Rpb24oY2hhbm5lbElkLCB3cml0ZVN3YXJtU3RyZWFtLCBjYWxsYmFjayl7XG5cdFx0bGV0IGNoYW5uZWwgPSBjaGFubmVsc1tjaGFubmVsSWRdO1xuXHRcdGlmKCFjaGFubmVsKXtcblx0XHRcdGNvbnN0IGNoYW5uZWxGb2xkZXIgPSBwYXRoLmpvaW4ocm9vdGZvbGRlciwgY2hhbm5lbElkKTtcblx0XHRcdGNoYW5uZWwgPSBmb2xkZXJNUS5jcmVhdGVRdWUoY2hhbm5lbEZvbGRlciwgKGVyciwgcmVzdWx0KSA9PiB7XG5cdFx0XHRcdGlmKGVycil7XG5cdFx0XHRcdFx0Ly93ZSBkZWxldGUgdGhlIGNoYW5uZWwgaW4gb3JkZXIgdG8gdHJ5IGFnYWluIG5leHQgdGltZVxuXHRcdFx0XHRcdGNoYW5uZWxzW2NoYW5uZWxJZF0gPSBudWxsO1xuXHRcdFx0XHRcdGNhbGxiYWNrKG5ldyBFcnJvcihcIkNoYW5uZWwgaW5pdGlhbGl6YXRpb24gZmFpbGVkXCIpLCB7fSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmKCFyZWdpc3RlckNvbnN1bWVyKGNoYW5uZWxJZCwgY2FsbGJhY2spKXtcblx0XHRcdFx0XHRjYWxsYmFjayhuZXcgRXJyb3IoXCJSZWdpc3RlcmluZyBjb25zdW1lciBmYWlsZWQhXCIpLCB7fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmVnaXN0ZXJNYWluQ29uc3VtZXIoY2hhbm5lbElkKTtcblx0XHRcdH0pO1xuXHRcdFx0c3RvcmVDaGFubmVsKGNoYW5uZWxJZCwgY2hhbm5lbCk7XG5cdFx0fWVsc2V7XG5cdFx0XHQvL2NoYW5uZWwuY2hhbm5lbC5yZWdpc3RlckNvbnN1bWVyKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGlmKCFyZWdpc3RlckNvbnN1bWVyKGNoYW5uZWxJZCwgY2FsbGJhY2spKXtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJSZWdpc3RlcmluZyBjb25zdW1lciBmYWlsZWQhXCIpLCB7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZWdpc3Rlck1haW5Db25zdW1lcihjaGFubmVsSWQpO1xuXHRcdH1cblx0fVxufSk7IiwiLyoqXG4gKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgVG9rZW4gYnVja2V0IGFsZ29yaXRobVxuICogQHBhcmFtIHN0YXJ0VG9rZW5zIC0gbWF4aW11bSBudW1iZXIgb2YgdG9rZW5zIHBvc3NpYmxlIHRvIG9idGFpbiBhbmQgdGhlIGRlZmF1bHQgc3RhcnRpbmcgdmFsdWVcbiAqIEBwYXJhbSB0b2tlblZhbHVlUGVyVGltZSAtIG51bWJlciBvZiB0b2tlbnMgZ2l2ZW4gYmFjayBmb3IgZWFjaCBcInVuaXRPZlRpbWVcIlxuICogQHBhcmFtIHVuaXRPZlRpbWUgLSBmb3IgZWFjaCBcInVuaXRPZlRpbWVcIiAoaW4gbWlsbGlzZWNvbmRzKSBwYXNzZWQgXCJ0b2tlblZhbHVlUGVyVGltZVwiIGFtb3VudCBvZiB0b2tlbnMgd2lsbCBiZSBnaXZlbiBiYWNrXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuXG5mdW5jdGlvbiBUb2tlbkJ1Y2tldChzdGFydFRva2VucyA9IDYwMDAsIHRva2VuVmFsdWVQZXJUaW1lID0gMTAsIHVuaXRPZlRpbWUgPSAxMDApIHtcblxuICAgIGlmKHR5cGVvZiBzdGFydFRva2VucyAhPT0gJ251bWJlcicgfHwgdHlwZW9mICB0b2tlblZhbHVlUGVyVGltZSAhPT0gJ251bWJlcicgfHwgdHlwZW9mIHVuaXRPZlRpbWUgIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQWxsIHBhcmFtZXRlcnMgbXVzdCBiZSBvZiB0eXBlIG51bWJlcicpO1xuICAgIH1cblxuICAgIGlmKGlzTmFOKHN0YXJ0VG9rZW5zKSB8fCBpc05hTih0b2tlblZhbHVlUGVyVGltZSkgfHwgaXNOYU4odW5pdE9mVGltZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBbGwgcGFyYW1ldGVycyBtdXN0IG5vdCBiZSBOYU4nKTtcbiAgICB9XG5cbiAgICBpZihzdGFydFRva2VucyA8PSAwIHx8IHRva2VuVmFsdWVQZXJUaW1lIDw9IDAgfHwgdW5pdE9mVGltZSA8PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQWxsIHBhcmFtZXRlcnMgbXVzdCBiZSBiaWdnZXIgdGhhbiAwJyk7XG4gICAgfVxuXG5cbiAgICBUb2tlbkJ1Y2tldC5wcm90b3R5cGUuQ09TVF9MT1cgICAgPSAxMDsgIC8vIGVxdWl2YWxlbnQgdG8gMTBvcC9zIHdpdGggZGVmYXVsdCB2YWx1ZXNcbiAgICBUb2tlbkJ1Y2tldC5wcm90b3R5cGUuQ09TVF9NRURJVU0gPSAxMDA7IC8vIGVxdWl2YWxlbnQgdG8gMW9wL3Mgd2l0aCBkZWZhdWx0IHZhbHVlc1xuICAgIFRva2VuQnVja2V0LnByb3RvdHlwZS5DT1NUX0hJR0ggICA9IDUwMDsgLy8gZXF1aXZhbGVudCB0byAxMm9wL21pbnV0ZSB3aXRoIGRlZmF1bHQgdmFsdWVzXG5cbiAgICBUb2tlbkJ1Y2tldC5FUlJPUl9MSU1JVF9FWENFRURFRCAgPSAnZXJyb3JfbGltaXRfZXhjZWVkZWQnO1xuICAgIFRva2VuQnVja2V0LkVSUk9SX0JBRF9BUkdVTUVOVCAgICA9ICdlcnJvcl9iYWRfYXJndW1lbnQnO1xuXG5cblxuICAgIGNvbnN0IGxpbWl0cyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gdGFrZVRva2VuKHVzZXJLZXksIGNvc3QsIGNhbGxiYWNrID0gKCkgPT4ge30pIHtcbiAgICAgICAgaWYodHlwZW9mIGNvc3QgIT09ICdudW1iZXInIHx8IGlzTmFOKGNvc3QpIHx8IGNvc3QgPD0gMCB8fCBjb3N0ID09PSBJbmZpbml0eSkge1xuICAgICAgICAgICAgY2FsbGJhY2soVG9rZW5CdWNrZXQuRVJST1JfQkFEX0FSR1VNRU5UKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVzZXJCdWNrZXQgPSBsaW1pdHNbdXNlcktleV07XG5cbiAgICAgICAgaWYgKHVzZXJCdWNrZXQpIHtcbiAgICAgICAgICAgIHVzZXJCdWNrZXQudG9rZW5zICs9IGNhbGN1bGF0ZVJldHVyblRva2Vucyh1c2VyQnVja2V0LnRpbWVzdGFtcCk7XG4gICAgICAgICAgICB1c2VyQnVja2V0LnRva2VucyAtPSBjb3N0O1xuXG4gICAgICAgICAgICB1c2VyQnVja2V0LnRpbWVzdGFtcCA9IERhdGUubm93KCk7XG5cblxuXG4gICAgICAgICAgICBpZiAodXNlckJ1Y2tldC50b2tlbnMgPCAwKSB7XG4gICAgICAgICAgICAgICAgdXNlckJ1Y2tldC50b2tlbnMgPSAwO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKFRva2VuQnVja2V0LkVSUk9SX0xJTUlUX0VYQ0VFREVELCAwKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayh1bmRlZmluZWQsIHVzZXJCdWNrZXQudG9rZW5zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxpbWl0c1t1c2VyS2V5XSA9IG5ldyBMaW1pdChzdGFydFRva2VucywgRGF0ZS5ub3coKSk7XG4gICAgICAgICAgICB0YWtlVG9rZW4odXNlcktleSwgY29zdCwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TGltaXRCeUNvc3QoY29zdCkge1xuICAgICAgICBpZihzdGFydFRva2VucyA9PT0gMCB8fCBjb3N0ID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKHN0YXJ0VG9rZW5zIC8gY29zdCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0UmVtYWluaW5nVG9rZW5CeUNvc3QodG9rZW5zLCBjb3N0KSB7XG4gICAgICAgIGlmKHRva2VucyA9PT0gMCB8fCBjb3N0ID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKHRva2VucyAvIGNvc3QpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIExpbWl0KG1heGltdW1Ub2tlbnMsIHRpbWVzdGFtcCkge1xuICAgICAgICB0aGlzLnRva2VucyA9IG1heGltdW1Ub2tlbnM7XG4gICAgICAgIHRoaXMudGltZXN0YW1wID0gdGltZXN0YW1wO1xuXG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZXQgdG9rZW5zKG51bWJlck9mVG9rZW5zKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bWJlck9mVG9rZW5zIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBudW1iZXJPZlRva2VucyA9IC0xO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChudW1iZXJPZlRva2VucyA+IG1heGltdW1Ub2tlbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyT2ZUb2tlbnMgPSBtYXhpbXVtVG9rZW5zO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNlbGYudG9rZW5zID0gbnVtYmVyT2ZUb2tlbnM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0IHRva2VucygpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi50b2tlbnM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGltZXN0YW1wXG4gICAgICAgIH07XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBjYWxjdWxhdGVSZXR1cm5Ub2tlbnModGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgICAgICBjb25zdCBlbGFwc2VkVGltZSA9IE1hdGguZmxvb3IoKGN1cnJlbnRUaW1lIC0gdGltZXN0YW1wKSAvIHVuaXRPZlRpbWUpO1xuXG4gICAgICAgIHJldHVybiBlbGFwc2VkVGltZSAqIHRva2VuVmFsdWVQZXJUaW1lO1xuICAgIH1cblxuICAgIHRoaXMudGFrZVRva2VuICAgICAgICAgICAgICAgPSB0YWtlVG9rZW47XG4gICAgdGhpcy5nZXRMaW1pdEJ5Q29zdCAgICAgICAgICA9IGdldExpbWl0QnlDb3N0O1xuICAgIHRoaXMuZ2V0UmVtYWluaW5nVG9rZW5CeUNvc3QgPSBnZXRSZW1haW5pbmdUb2tlbkJ5Q29zdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUb2tlbkJ1Y2tldDtcbiIsImNvbnN0IGh0dHAgPSByZXF1aXJlKCdodHRwJyk7XG5jb25zdCB1cmwgPSByZXF1aXJlKCd1cmwnKTtcbmNvbnN0IHN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xuXG4vKipcbiAqIFdyYXBzIGEgcmVxdWVzdCBhbmQgYXVnbWVudHMgaXQgd2l0aCBhIFwiZG9cIiBtZXRob2QgdG8gbW9kaWZ5IGl0IGluIGEgXCJmbHVlbnQgYnVpbGRlclwiIHN0eWxlXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsXG4gKiBAcGFyYW0geyp9IGJvZHlcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBSZXF1ZXN0KHVybCwgYm9keSkge1xuICAgIHRoaXMucmVxdWVzdCA9IHtcbiAgICAgICAgb3B0aW9uczogdXJsLFxuICAgICAgICBib2R5XG4gICAgfTtcblxuICAgIHRoaXMuZG8gPSBmdW5jdGlvbiAobW9kaWZpZXIpIHtcbiAgICAgICAgbW9kaWZpZXIodGhpcy5yZXF1ZXN0KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SHR0cFJlcXVlc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlcXVlc3Q7XG4gICAgfTtcbn1cblxuXG4vKipcbiAqIE1vZGlmaWVzIHJlcXVlc3Qub3B0aW9ucyB0byBjb250YWluIHRoZSB1cmwgcGFyc2VkIGluc3RlYWQgb2YgYXMgc3RyaW5nXG4gKiBAcGFyYW0ge09iamVjdH0gcmVxdWVzdCAtIE9iamVjdCB0aGF0IGNvbnRhaW5zIG9wdGlvbnMgYW5kIGJvZHlcbiAqL1xuZnVuY3Rpb24gdXJsVG9PcHRpb25zKHJlcXVlc3QpIHtcbiAgICBjb25zdCBwYXJzZWRVcmwgPSB1cmwucGFyc2UocmVxdWVzdC5vcHRpb25zKTtcblxuICAgIC8vIFRPRE86IG1vdmllIGhlYWRlcnMgZGVjbGFyYXRpb24gZnJvbSBoZXJlXG4gICAgcmVxdWVzdC5vcHRpb25zID0ge1xuICAgICAgICBob3N0OiBwYXJzZWRVcmwuaG9zdG5hbWUsXG4gICAgICAgIHBvcnQ6IHBhcnNlZFVybC5wb3J0LFxuICAgICAgICBwYXRoOiBwYXJzZWRVcmwucGF0aG5hbWUsXG4gICAgICAgIGhlYWRlcnM6IHt9XG4gICAgfTtcbn1cblxuXG4vKipcbiAqIFRyYW5zZm9ybXMgdGhlIHJlcXVlc3QuYm9keSBpbiBhIHR5cGUgdGhhdCBjYW4gYmUgc2VudCB0aHJvdWdoIG5ldHdvcmsgaWYgaXQgaXMgbmVlZGVkXG4gKiBAcGFyYW0ge09iamVjdH0gcmVxdWVzdCAtIE9iamVjdCB0aGF0IGNvbnRhaW5zIG9wdGlvbnMgYW5kIGJvZHlcbiAqL1xuZnVuY3Rpb24gc2VyaWFsaXplQm9keShyZXF1ZXN0KSB7XG4gICAgaWYgKCFyZXF1ZXN0LmJvZHkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGhhbmRsZXIgPSB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKHRhcmdldCwgbmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5hbWUgaW4gdGFyZ2V0ID8gdGFyZ2V0W25hbWVdIDogKGRhdGEpID0+IGRhdGE7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgYm9keVNlcmlhbGl6YXRpb25NYXBwaW5nID0gbmV3IFByb3h5KHtcbiAgICAgICAgJ09iamVjdCc6IChkYXRhKSA9PiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICB9LCBoYW5kbGVyKTtcblxuICAgIHJlcXVlc3QuYm9keSA9IGJvZHlTZXJpYWxpemF0aW9uTWFwcGluZ1tyZXF1ZXN0LmJvZHkuY29uc3RydWN0b3IubmFtZV0ocmVxdWVzdC5ib2R5KTtcbn1cblxuLyoqXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlcXVlc3QgLSBPYmplY3QgdGhhdCBjb250YWlucyBvcHRpb25zIGFuZCBib2R5XG4gKi9cbmZ1bmN0aW9uIGJvZHlDb250ZW50TGVuZ3RoKHJlcXVlc3QpIHtcbiAgICBpZiAoIXJlcXVlc3QuYm9keSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHJlcXVlc3QuYm9keS5jb25zdHJ1Y3Rvci5uYW1lIGluIFsgJ1N0cmluZycsICdCdWZmZXInLCAnQXJyYXlCdWZmZXInIF0pIHtcbiAgICAgICAgcmVxdWVzdC5vcHRpb25zLmhlYWRlcnNbJ0NvbnRlbnQtTGVuZ3RoJ10gPSBCdWZmZXIuYnl0ZUxlbmd0aChyZXF1ZXN0LmJvZHkpO1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBDbGllbnQoKSB7XG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1JlcXVlc3R9IGN1c3RvbVJlcXVlc3RcbiAgICAgKiBAcGFyYW0gbW9kaWZpZXJzIC0gYXJyYXkgb2YgZnVuY3Rpb25zIHRoYXQgbW9kaWZ5IHRoZSByZXF1ZXN0XG4gICAgICogQHJldHVybnMge09iamVjdH0gLSB3aXRoIHVybCBhbmQgYm9keSBwcm9wZXJ0aWVzXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVxdWVzdChjdXN0b21SZXF1ZXN0LCBtb2RpZmllcnMpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtb2RpZmllcnMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGN1c3RvbVJlcXVlc3QuZG8obW9kaWZpZXJzW2ldKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjdXN0b21SZXF1ZXN0LmdldEh0dHBSZXF1ZXN0KCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0UmVxKHVybCwgY29uZmlnLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBtb2RpZmllcnMgPSBbXG4gICAgICAgICAgICB1cmxUb09wdGlvbnMsXG4gICAgICAgICAgICAocmVxdWVzdCkgPT4ge3JlcXVlc3Qub3B0aW9ucy5oZWFkZXJzID0gY29uZmlnLmhlYWRlcnMgfHwge307fVxuICAgICAgICBdO1xuXG4gICAgICAgIGNvbnN0IHBhY2tlZFJlcXVlc3QgPSByZXF1ZXN0KG5ldyBSZXF1ZXN0KHVybCwgY29uZmlnLmJvZHkpLCBtb2RpZmllcnMpO1xuICAgICAgICBjb25zdCBodHRwUmVxdWVzdCA9IGh0dHAucmVxdWVzdChwYWNrZWRSZXF1ZXN0Lm9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgICAgaHR0cFJlcXVlc3QuZW5kKCk7XG5cbiAgICAgICAgcmV0dXJuIGh0dHBSZXF1ZXN0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBvc3RSZXEodXJsLCBjb25maWcsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IG1vZGlmaWVycyA9IFtcbiAgICAgICAgICAgIHVybFRvT3B0aW9ucyxcbiAgICAgICAgICAgIChyZXF1ZXN0KSA9PiB7cmVxdWVzdC5vcHRpb25zLm1ldGhvZCA9ICdQT1NUJzsgfSxcbiAgICAgICAgICAgIChyZXF1ZXN0KSA9PiB7cmVxdWVzdC5vcHRpb25zLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTsgfSxcbiAgICAgICAgICAgIHNlcmlhbGl6ZUJvZHksXG4gICAgICAgICAgICBib2R5Q29udGVudExlbmd0aFxuICAgICAgICBdO1xuXG4gICAgICAgIGNvbnN0IHBhY2tlZFJlcXVlc3QgPSByZXF1ZXN0KG5ldyBSZXF1ZXN0KHVybCwgY29uZmlnLmJvZHkpLCBtb2RpZmllcnMpO1xuICAgICAgICBjb25zdCBodHRwUmVxdWVzdCA9IGh0dHAucmVxdWVzdChwYWNrZWRSZXF1ZXN0Lm9wdGlvbnMsIGNhbGxiYWNrKTtcblxuICAgICAgICBpZiAoY29uZmlnLmJvZHkgaW5zdGFuY2VvZiBzdHJlYW0uUmVhZGFibGUpIHtcbiAgICAgICAgICAgIGNvbmZpZy5ib2R5LnBpcGUoaHR0cFJlcXVlc3QpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaHR0cFJlcXVlc3QuZW5kKHBhY2tlZFJlcXVlc3QuYm9keSwgY29uZmlnLmVuY29kaW5nIHx8ICd1dGY4Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGh0dHBSZXF1ZXN0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlbGV0ZVJlcSh1cmwsIGNvbmZpZywgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgbW9kaWZpZXJzID0gW1xuICAgICAgICAgICAgdXJsVG9PcHRpb25zLFxuICAgICAgICAgICAgKHJlcXVlc3QpID0+IHtyZXF1ZXN0Lm9wdGlvbnMubWV0aG9kID0gJ0RFTEVURSc7fSxcbiAgICAgICAgICAgIChyZXF1ZXN0KSA9PiB7cmVxdWVzdC5vcHRpb25zLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTt9LFxuICAgICAgICBdO1xuXG4gICAgICAgIGNvbnN0IHBhY2tlZFJlcXVlc3QgPSByZXF1ZXN0KG5ldyBSZXF1ZXN0KHVybCwgY29uZmlnLmJvZHkpLCBtb2RpZmllcnMpO1xuICAgICAgICBjb25zdCBodHRwUmVxdWVzdCA9IGh0dHAucmVxdWVzdChwYWNrZWRSZXF1ZXN0Lm9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgICAgaHR0cFJlcXVlc3QuZW5kKCk7XG5cbiAgICAgICAgcmV0dXJuIGh0dHBSZXF1ZXN0O1xuICAgIH1cblxuICAgIHRoaXMuZ2V0ID0gZ2V0UmVxO1xuICAgIHRoaXMucG9zdCA9IHBvc3RSZXE7XG4gICAgdGhpcy5kZWxldGUgPSBkZWxldGVSZXE7XG59XG5cbi8qKlxuICogU3dhcCB0aGlyZCBhbmQgc2Vjb25kIHBhcmFtZXRlciBpZiBvbmx5IHR3byBhcmUgcHJvdmlkZWQgYW5kIGNvbnZlcnRzIGFyZ3VtZW50cyB0byBhcnJheVxuICogQHBhcmFtIHtPYmplY3R9IHBhcmFtc1xuICogQHJldHVybnMge0FycmF5fSAtIGFyZ3VtZW50cyBhcyBhcnJheVxuICovXG5mdW5jdGlvbiBwYXJhbWV0ZXJzUHJlUHJvY2Vzc2luZyhwYXJhbXMpIHtcbiAgICBjb25zdCByZXMgPSBbXTtcblxuICAgIGlmICh0eXBlb2YgcGFyYW1zWzBdICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0IHBhcmFtZXRlciBtdXN0IGJlIGEgc3RyaW5nICh1cmwpJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcGFyc2VkVXJsID0gdXJsLnBhcnNlKHBhcmFtc1swXSk7XG5cbiAgICBpZiAoIXBhcnNlZFVybC5ob3N0bmFtZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50ICh1cmwpIGlzIG5vdCB2YWxpZCcpO1xuICAgIH1cblxuICAgIGlmIChwYXJhbXMubGVuZ3RoID49IDMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwYXJhbXNbMV0gIT09ICdvYmplY3QnIHx8ICFwYXJhbXNbMV0pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignV2hlbiAzIHBhcmFtZXRlcnMgYXJlIHByb3ZpZGVkIHRoZSBzZWNvbmQgcGFyYW1ldGVyIG11c3QgYmUgYSBub3QgbnVsbCBvYmplY3QnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgcGFyYW1zWzJdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1doZW4gMyBwYXJhbWV0ZXJzIGFyZSBwcm92aWRlZCB0aGUgdGhpcmQgcGFyYW1ldGVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBhcmFtcy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwYXJhbXNbMV0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignV2hlbiAyIHBhcmFtZXRlcnMgYXJlIHByb3ZpZGVkIHRoZSBzZWNvbmQgb25lIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFyYW1zWzJdID0gcGFyYW1zWzFdO1xuICAgICAgICBwYXJhbXNbMV0gPSB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMocGFyYW1zKTtcbiAgICBmb3IobGV0IGkgPSAwLCBsZW4gPSBwcm9wZXJ0aWVzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIHJlcy5wdXNoKHBhcmFtc1twcm9wZXJ0aWVzW2ldXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbn1cblxuY29uc3QgaGFuZGxlciA9IHtcbiAgICBnZXQodGFyZ2V0LCBwcm9wTmFtZSkge1xuICAgICAgICBpZiAoIXRhcmdldFtwcm9wTmFtZV0pIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHByb3BOYW1lLCBcIk5vdCBpbXBsZW1lbnRlZCFcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBwYXJhbWV0ZXJzUHJlUHJvY2Vzc2luZyhhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcE5hbWVdLmFwcGx5KHRhcmdldCwgYXJncyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm94eShuZXcgQ2xpZW50KCksIGhhbmRsZXIpO1xufTsiLCJjb25zdCBxdWVyeXN0cmluZyA9IHJlcXVpcmUoJ3F1ZXJ5c3RyaW5nJyk7XG5cbmZ1bmN0aW9uIG1hdGNoVXJsKHBhdHRlcm4sIHVybCkge1xuXHRjb25zdCByZXN1bHQgPSB7XG5cdFx0bWF0Y2g6IHRydWUsXG5cdFx0cGFyYW1zOiB7fSxcblx0XHRxdWVyeToge31cblx0fTtcblxuXHRjb25zdCBxdWVyeVBhcmFtZXRlcnNTdGFydEluZGV4ID0gdXJsLmluZGV4T2YoJz8nKTtcblx0aWYocXVlcnlQYXJhbWV0ZXJzU3RhcnRJbmRleCAhPT0gLTEpIHtcblx0XHRjb25zdCB1cmxRdWVyeVN0cmluZyA9IHVybC5zdWJzdHIocXVlcnlQYXJhbWV0ZXJzU3RhcnRJbmRleCArIDEpOyAvLyArIDEgdG8gaWdub3JlIHRoZSAnPydcblx0XHRyZXN1bHQucXVlcnkgPSBxdWVyeXN0cmluZy5wYXJzZSh1cmxRdWVyeVN0cmluZyk7XG5cdFx0dXJsID0gdXJsLnN1YnN0cigwLCBxdWVyeVBhcmFtZXRlcnNTdGFydEluZGV4KTtcblx0fVxuXG4gICAgY29uc3QgcGF0dGVyblRva2VucyA9IHBhdHRlcm4uc3BsaXQoJy8nKTtcbiAgICBjb25zdCB1cmxUb2tlbnMgPSB1cmwuc3BsaXQoJy8nKTtcblxuICAgIGlmKHVybFRva2Vuc1t1cmxUb2tlbnMubGVuZ3RoIC0gMV0gPT09ICcnKSB7XG4gICAgICAgIHVybFRva2Vucy5wb3AoKTtcbiAgICB9XG5cbiAgICBpZiAocGF0dGVyblRva2Vucy5sZW5ndGggIT09IHVybFRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgcmVzdWx0Lm1hdGNoID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYocGF0dGVyblRva2Vuc1twYXR0ZXJuVG9rZW5zLmxlbmd0aCAtIDFdID09PSAnKicpIHtcbiAgICAgICAgcmVzdWx0Lm1hdGNoID0gdHJ1ZTtcbiAgICAgICAgcGF0dGVyblRva2Vucy5wb3AoKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhdHRlcm5Ub2tlbnMubGVuZ3RoICYmIHJlc3VsdC5tYXRjaDsgKytpKSB7XG4gICAgICAgIGlmIChwYXR0ZXJuVG9rZW5zW2ldLnN0YXJ0c1dpdGgoJzonKSkge1xuICAgICAgICAgICAgcmVzdWx0LnBhcmFtc1twYXR0ZXJuVG9rZW5zW2ldLnN1YnN0cmluZygxKV0gPSB1cmxUb2tlbnNbaV07XG4gICAgICAgIH0gZWxzZSBpZiAocGF0dGVyblRva2Vuc1tpXSAhPT0gdXJsVG9rZW5zW2ldKSB7XG4gICAgICAgICAgICByZXN1bHQubWF0Y2ggPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGlzVHJ1dGh5KHZhbHVlKSB7XG4gICAgcmV0dXJuICEhdmFsdWU7XG5cbn1cblxuZnVuY3Rpb24gbWV0aG9kTWF0Y2gocGF0dGVybiwgbWV0aG9kKSB7XG4gICAgaWYgKCFwYXR0ZXJuIHx8ICFtZXRob2QpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhdHRlcm4gPT09IG1ldGhvZDtcbn1cblxuZnVuY3Rpb24gTWlkZGxld2FyZSgpIHtcbiAgICBjb25zdCByZWdpc3RlcmVkTWlkZGxld2FyZUZ1bmN0aW9ucyA9IFtdO1xuXG4gICAgZnVuY3Rpb24gdXNlKG1ldGhvZCwgdXJsLCBmbikge1xuICAgICAgICBtZXRob2QgPSBtZXRob2QgPyBtZXRob2QudG9Mb3dlckNhc2UoKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgcmVnaXN0ZXJlZE1pZGRsZXdhcmVGdW5jdGlvbnMucHVzaCh7bWV0aG9kLCB1cmwsIGZufSk7XG4gICAgfVxuXG4gICAgdGhpcy51c2UgPSBmdW5jdGlvbiAoLi4ucGFyYW1zKSB7XG5cdCAgICBsZXQgYXJncyA9IFsgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCBdO1xuXG5cdCAgICBzd2l0Y2ggKHBhcmFtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcblx0XHRcdFx0dGhyb3cgRXJyb3IoJ1VzZSBtZXRob2QgbmVlZHMgYXQgbGVhc3Qgb25lIGFyZ3VtZW50LicpO1xuXHRcdFx0XHRcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHBhcmFtc1swXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcignSWYgb25seSBvbmUgYXJndW1lbnQgaXMgcHJvdmlkZWQgaXQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYXJnc1syXSA9IHBhcmFtc1swXTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcGFyYW1zWzBdICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgcGFyYW1zWzFdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKCdJZiB0d28gYXJndW1lbnRzIGFyZSBwcm92aWRlZCB0aGUgZmlyc3Qgb25lIG11c3QgYmUgYSBzdHJpbmcgKHVybCkgYW5kIHRoZSBzZWNvbmQgYSBmdW5jdGlvbicpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGFyZ3NbMV09cGFyYW1zWzBdO1xuICAgICAgICAgICAgICAgIGFyZ3NbMl09cGFyYW1zWzFdO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcGFyYW1zWzBdICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgcGFyYW1zWzFdICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgcGFyYW1zWzJdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IEVycm9yKCdJZiB0aHJlZSBvciBtb3JlIGFyZ3VtZW50cyBhcmUgcHJvdmlkZWQgdGhlIGZpcnN0IG9uZSBtdXN0IGJlIGEgc3RyaW5nIChIVFRQIHZlcmIpLCB0aGUgc2Vjb25kIGEgc3RyaW5nICh1cmwpIGFuZCB0aGUgdGhpcmQgYSBmdW5jdGlvbicpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghKFsgJ2dldCcsICdwb3N0JywgJ3B1dCcsICdkZWxldGUnLCAncGF0Y2gnLCAnaGVhZCcsICdjb25uZWN0JywgJ29wdGlvbnMnLCAndHJhY2UnIF0uaW5jbHVkZXMocGFyYW1zWzBdLnRvTG93ZXJDYXNlKCkpKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lmIHRocmVlIG9yIG1vcmUgYXJndW1lbnRzIGFyZSBwcm92aWRlZCB0aGUgZmlyc3Qgb25lIG11c3QgYmUgYSBIVFRQIHZlcmIgYnV0IG5vbmUgY291bGQgYmUgbWF0Y2hlZCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGFyZ3MgPSBwYXJhbXM7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHVzZS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9O1xuXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgZXhlY3V0aW9uIGZyb20gdGhlIGZpcnN0IHJlZ2lzdGVyZWQgbWlkZGxld2FyZSBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzXG4gICAgICovXG4gICAgdGhpcy5nbyA9IGZ1bmN0aW9uIGdvKHJlcSwgcmVzKSB7XG4gICAgICAgIGV4ZWN1dGUoMCwgcmVxLm1ldGhvZC50b0xvd2VyQ2FzZSgpLCByZXEudXJsLCByZXEsIHJlcyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGVzIGEgbWlkZGxld2FyZSBpZiBpdCBwYXNzZXMgdGhlIG1ldGhvZCBhbmQgdXJsIHZhbGlkYXRpb24gYW5kIGNhbGxzIHRoZSBuZXh0IG9uZSB3aGVuIG5lY2Vzc2FyeVxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGV4ZWN1dGUoaW5kZXgsIG1ldGhvZCwgdXJsLCAuLi5wYXJhbXMpIHtcbiAgICAgICAgaWYgKCFyZWdpc3RlcmVkTWlkZGxld2FyZUZ1bmN0aW9uc1tpbmRleF0pIHtcbiAgICAgICAgICAgIGlmKGluZGV4PT09MCl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIGhhbmRsZXJzIHJlZ2lzdGVyZWQgeWV0IVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG5cdCAgICBjb25zdCByZWdpc3RlcmVkTWV0aG9kID0gcmVnaXN0ZXJlZE1pZGRsZXdhcmVGdW5jdGlvbnNbaW5kZXhdLm1ldGhvZDtcblx0ICAgIGNvbnN0IHJlZ2lzdGVyZWRVcmwgPSByZWdpc3RlcmVkTWlkZGxld2FyZUZ1bmN0aW9uc1tpbmRleF0udXJsO1xuXHQgICAgY29uc3QgZm4gPSByZWdpc3RlcmVkTWlkZGxld2FyZUZ1bmN0aW9uc1tpbmRleF0uZm47XG5cblx0ICAgIGlmICghbWV0aG9kTWF0Y2gocmVnaXN0ZXJlZE1ldGhvZCwgbWV0aG9kKSkge1xuICAgICAgICAgICAgZXhlY3V0ZSgrK2luZGV4LCBtZXRob2QsIHVybCwgLi4ucGFyYW1zKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1RydXRoeShyZWdpc3RlcmVkVXJsKSkge1xuICAgICAgICAgICAgY29uc3QgdXJsTWF0Y2ggPSBtYXRjaFVybChyZWdpc3RlcmVkVXJsLCB1cmwpO1xuXG4gICAgICAgICAgICBpZiAoIXVybE1hdGNoLm1hdGNoKSB7XG4gICAgICAgICAgICAgICAgZXhlY3V0ZSgrK2luZGV4LCBtZXRob2QsIHVybCwgLi4ucGFyYW1zKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwYXJhbXNbMF0pIHtcbiAgICAgICAgICAgICAgICBwYXJhbXNbMF0ucGFyYW1zID0gdXJsTWF0Y2gucGFyYW1zO1xuICAgICAgICAgICAgICAgIHBhcmFtc1swXS5xdWVyeSAgPSB1cmxNYXRjaC5xdWVyeTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjb3VudGVyID0gMDtcblxuICAgICAgICBmbiguLi5wYXJhbXMsIChlcnIpID0+IHtcbiAgICAgICAgICAgIGNvdW50ZXIrKztcbiAgICAgICAgICAgIGlmIChjb3VudGVyID4gMSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignWW91IGNhbGxlZCBuZXh0IG11bHRpcGxlIHRpbWUsIG9ubHkgdGhlIGZpcnN0IG9uZSB3aWxsIGJlIGV4ZWN1dGVkJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXhlY3V0ZSgrK2luZGV4LCBtZXRob2QsIHVybCwgLi4ucGFyYW1zKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1pZGRsZXdhcmU7XG4iLCJmdW5jdGlvbiBSb3V0ZXIoc2VydmVyKSB7XG4gICAgdGhpcy51c2UgPSBmdW5jdGlvbiB1c2UodXJsLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayhzZXJ2ZXJXcmFwcGVyKHVybCwgc2VydmVyKSk7XG4gICAgfTtcbn1cblxuXG5mdW5jdGlvbiBzZXJ2ZXJXcmFwcGVyKGJhc2VVcmwsIHNlcnZlcikge1xuICAgIGlmIChiYXNlVXJsLmVuZHNXaXRoKCcvJykpIHtcbiAgICAgICAgYmFzZVVybCA9IGJhc2VVcmwuc3Vic3RyaW5nKDAsIGJhc2VVcmwubGVuZ3RoIC0gMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdXNlKHVybCwgcmVxUmVzb2x2ZXIpIHtcbiAgICAgICAgICAgIHNlcnZlci51c2UoYmFzZVVybCArIHVybCwgcmVxUmVzb2x2ZXIpO1xuICAgICAgICB9LFxuICAgICAgICBnZXQodXJsLCByZXFSZXNvbHZlcikge1xuICAgICAgICAgICAgc2VydmVyLmdldChiYXNlVXJsICsgdXJsLCByZXFSZXNvbHZlcik7XG4gICAgICAgIH0sXG4gICAgICAgIHBvc3QodXJsLCByZXFSZXNvbHZlcikge1xuICAgICAgICAgICAgc2VydmVyLnBvc3QoYmFzZVVybCArIHVybCwgcmVxUmVzb2x2ZXIpO1xuICAgICAgICB9LFxuICAgICAgICBwdXQodXJsLCByZXFSZXNvbHZlcikge1xuICAgICAgICAgICAgc2VydmVyLnB1dChiYXNlVXJsICsgdXJsLCByZXFSZXNvbHZlcik7XG4gICAgICAgIH0sXG4gICAgICAgIGRlbGV0ZSh1cmwsIHJlcVJlc29sdmVyKSB7XG4gICAgICAgICAgICBzZXJ2ZXIuZGVsZXRlKGJhc2VVcmwgKyB1cmwsIHJlcVJlc29sdmVyKTtcbiAgICAgICAgfSxcbiAgICAgICAgb3B0aW9ucyh1cmwsIHJlcVJlc29sdmVyKSB7XG4gICAgICAgICAgICBzZXJ2ZXIub3B0aW9ucyhiYXNlVXJsICsgdXJsLCByZXFSZXNvbHZlcik7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdXRlcjtcbiIsImNvbnN0IE1pZGRsZXdhcmUgPSByZXF1aXJlKCcuL01pZGRsZXdhcmUnKTtcbmNvbnN0IGh0dHAgPSByZXF1aXJlKCdodHRwJyk7XG5jb25zdCBodHRwcyA9IHJlcXVpcmUoJ2h0dHBzJyk7XG5cbmZ1bmN0aW9uIFNlcnZlcihzc2xPcHRpb25zKSB7XG4gICAgY29uc3QgbWlkZGxld2FyZSA9IG5ldyBNaWRkbGV3YXJlKCk7XG4gICAgY29uc3Qgc2VydmVyID0gX2luaXRTZXJ2ZXIoc3NsT3B0aW9ucyk7XG5cblxuICAgIHRoaXMubGlzdGVuID0gZnVuY3Rpb24gbGlzdGVuKHBvcnQpIHtcbiAgICAgICAgc2VydmVyLmxpc3Rlbihwb3J0KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHRoaXMudXNlID0gZnVuY3Rpb24gdXNlKHVybCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy9UT0RPOiBmaW5kIGEgYmV0dGVyIHdheVxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICBtaWRkbGV3YXJlLnVzZSh1cmwsIGNhbGxiYWNrKTtcbiAgICAgICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHVybDtcbiAgICAgICAgICAgIG1pZGRsZXdhcmUudXNlKGNhbGxiYWNrKTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgc2VydmVyLmNsb3NlKGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXQgPSBmdW5jdGlvbiBnZXRSZXEocmVxVXJsLCByZXFSZXNvbHZlcikge1xuICAgICAgICBtaWRkbGV3YXJlLnVzZShcIkdFVFwiLCByZXFVcmwsIHJlcVJlc29sdmVyKTtcbiAgICB9O1xuXG4gICAgdGhpcy5wb3N0ID0gZnVuY3Rpb24gcG9zdFJlcShyZXFVcmwsIHJlcVJlc29sdmVyKSB7XG4gICAgICAgIG1pZGRsZXdhcmUudXNlKFwiUE9TVFwiLCByZXFVcmwsIHJlcVJlc29sdmVyKTtcbiAgICB9O1xuXG4gICAgdGhpcy5wdXQgPSBmdW5jdGlvbiBwdXRSZXEocmVxVXJsLCByZXFSZXNvbHZlcikge1xuICAgICAgICBtaWRkbGV3YXJlLnVzZShcIlBVVFwiLCByZXFVcmwsIHJlcVJlc29sdmVyKTtcbiAgICB9O1xuXG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbiBkZWxldGVSZXEocmVxVXJsLCByZXFSZXNvbHZlcikge1xuICAgICAgICBtaWRkbGV3YXJlLnVzZShcIkRFTEVURVwiLCByZXFVcmwsIHJlcVJlc29sdmVyKTtcbiAgICB9O1xuXG4gICAgdGhpcy5vcHRpb25zID0gZnVuY3Rpb24gb3B0aW9uc1JlcShyZXFVcmwsIHJlcVJlc29sdmVyKSB7XG4gICAgICAgIG1pZGRsZXdhcmUudXNlKFwiT1BUSU9OU1wiLCByZXFVcmwsIHJlcVJlc29sdmVyKTtcbiAgICB9O1xuXG5cbiAgICAvKiBJTlRFUk5BTCBNRVRIT0RTICovXG5cbiAgICBmdW5jdGlvbiBfaW5pdFNlcnZlcihzc2xDb25maWcpIHtcbiAgICAgICAgaWYgKHNzbENvbmZpZykge1xuICAgICAgICAgICAgcmV0dXJuIGh0dHBzLmNyZWF0ZVNlcnZlcihzc2xDb25maWcsIG1pZGRsZXdhcmUuZ28pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGh0dHAuY3JlYXRlU2VydmVyKG1pZGRsZXdhcmUuZ28pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlcnZlcjsiLCJjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG5mdW5jdGlvbiBzZXREYXRhSGFuZGxlcihyZXF1ZXN0LCBjYWxsYmFjaykge1xuICAgIGxldCBib2R5Q29udGVudCA9ICcnO1xuXG4gICAgcmVxdWVzdC5vbignZGF0YScsIGZ1bmN0aW9uIChkYXRhQ2h1bmspIHtcbiAgICAgICAgYm9keUNvbnRlbnQgKz0gZGF0YUNodW5rO1xuICAgIH0pO1xuXG4gICAgcmVxdWVzdC5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGJvZHlDb250ZW50KTtcbiAgICB9KTtcblxuICAgIHJlcXVlc3Qub24oJ2Vycm9yJywgY2FsbGJhY2spO1xufVxuXG5mdW5jdGlvbiBzZXREYXRhSGFuZGxlck1pZGRsZXdhcmUocmVxdWVzdCwgcmVzcG9uc2UsIG5leHQpIHtcbiAgICBpZiAocmVxdWVzdC5oZWFkZXJzWydjb250ZW50LXR5cGUnXSAhPT0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScpIHtcbiAgICAgICAgc2V0RGF0YUhhbmRsZXIocmVxdWVzdCwgZnVuY3Rpb24gKGVycm9yLCBib2R5Q29udGVudCkge1xuICAgICAgICAgICAgcmVxdWVzdC5ib2R5ID0gYm9keUNvbnRlbnQ7XG4gICAgICAgICAgICBuZXh0KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNlbmRFcnJvclJlc3BvbnNlKGVycm9yLCByZXNwb25zZSwgc3RhdHVzQ29kZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIHJlc3BvbnNlLnN0YXR1c0NvZGUgPSBzdGF0dXNDb2RlO1xuICAgIHJlc3BvbnNlLmVuZCgpO1xufVxuXG5mdW5jdGlvbiBib2R5UGFyc2VyKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgbGV0IGJvZHlDb250ZW50ID0gJyc7XG5cbiAgICByZXEub24oJ2RhdGEnLCBmdW5jdGlvbiAoZGF0YUNodW5rKSB7XG4gICAgICAgIGJvZHlDb250ZW50ICs9IGRhdGFDaHVuaztcbiAgICB9KTtcblxuICAgIHJlcS5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXEuYm9keSA9IGJvZHlDb250ZW50O1xuICAgICAgICBuZXh0KCk7XG4gICAgfSk7XG5cbiAgICByZXEub24oJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBuZXh0KGVycik7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHNlcnZlU3RhdGljRmlsZShiYXNlRm9sZGVyLCBpZ25vcmVQYXRoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChyZXEsIHJlcykge1xuICAgICAgICBjb25zdCB1cmwgPSByZXEudXJsLnN1YnN0cmluZyhpZ25vcmVQYXRoLmxlbmd0aCk7XG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGJhc2VGb2xkZXIsIHVybCk7XG4gICAgICAgIGZzLnN0YXQoZmlsZVBhdGgsIChlcnIpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcbiAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodXJsLmVuZHNXaXRoKCcuaHRtbCcpKSB7XG4gICAgICAgICAgICAgICAgcmVzLmNvbnRlbnRUeXBlID0gJ3RleHQvaHRtbCc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHVybC5lbmRzV2l0aCgnLmNzcycpKSB7XG4gICAgICAgICAgICAgICAgcmVzLmNvbnRlbnRUeXBlID0gJ3RleHQvY3NzJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodXJsLmVuZHNXaXRoKCcuanMnKSkge1xuICAgICAgICAgICAgICAgIHJlcy5jb250ZW50VHlwZSA9ICd0ZXh0L2phdmFzY3JpcHQnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBmaWxlU3RyZWFtID0gZnMuY3JlYXRlUmVhZFN0cmVhbShmaWxlUGF0aCk7XG4gICAgICAgICAgICBmaWxlU3RyZWFtLnBpcGUocmVzKTtcblxuICAgICAgICB9KTtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtzZXREYXRhSGFuZGxlciwgc2V0RGF0YUhhbmRsZXJNaWRkbGV3YXJlLCBzZW5kRXJyb3JSZXNwb25zZSwgYm9keVBhcnNlciwgc2VydmVTdGF0aWNGaWxlfTtcbiIsImNvbnN0IENsaWVudCA9IHJlcXVpcmUoJy4vY2xhc3Nlcy9DbGllbnQnKTtcbmNvbnN0IFNlcnZlciA9IHJlcXVpcmUoJy4vY2xhc3Nlcy9TZXJ2ZXInKTtcbmNvbnN0IGh0dHBVdGlscyA9IHJlcXVpcmUoJy4vaHR0cFV0aWxzJyk7XG5jb25zdCBSb3V0ZXIgPSByZXF1aXJlKCcuL2NsYXNzZXMvUm91dGVyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1NlcnZlciwgQ2xpZW50LCBodHRwVXRpbHMsIFJvdXRlcn07XG5cbiIsInZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXI7XG5cbnZhciBDUkNfVEFCTEUgPSBbXG4gIDB4MDAwMDAwMDAsIDB4NzcwNzMwOTYsIDB4ZWUwZTYxMmMsIDB4OTkwOTUxYmEsIDB4MDc2ZGM0MTksXG4gIDB4NzA2YWY0OGYsIDB4ZTk2M2E1MzUsIDB4OWU2NDk1YTMsIDB4MGVkYjg4MzIsIDB4NzlkY2I4YTQsXG4gIDB4ZTBkNWU5MWUsIDB4OTdkMmQ5ODgsIDB4MDliNjRjMmIsIDB4N2ViMTdjYmQsIDB4ZTdiODJkMDcsXG4gIDB4OTBiZjFkOTEsIDB4MWRiNzEwNjQsIDB4NmFiMDIwZjIsIDB4ZjNiOTcxNDgsIDB4ODRiZTQxZGUsXG4gIDB4MWFkYWQ0N2QsIDB4NmRkZGU0ZWIsIDB4ZjRkNGI1NTEsIDB4ODNkMzg1YzcsIDB4MTM2Yzk4NTYsXG4gIDB4NjQ2YmE4YzAsIDB4ZmQ2MmY5N2EsIDB4OGE2NWM5ZWMsIDB4MTQwMTVjNGYsIDB4NjMwNjZjZDksXG4gIDB4ZmEwZjNkNjMsIDB4OGQwODBkZjUsIDB4M2I2ZTIwYzgsIDB4NGM2OTEwNWUsIDB4ZDU2MDQxZTQsXG4gIDB4YTI2NzcxNzIsIDB4M2MwM2U0ZDEsIDB4NGIwNGQ0NDcsIDB4ZDIwZDg1ZmQsIDB4YTUwYWI1NmIsXG4gIDB4MzViNWE4ZmEsIDB4NDJiMjk4NmMsIDB4ZGJiYmM5ZDYsIDB4YWNiY2Y5NDAsIDB4MzJkODZjZTMsXG4gIDB4NDVkZjVjNzUsIDB4ZGNkNjBkY2YsIDB4YWJkMTNkNTksIDB4MjZkOTMwYWMsIDB4NTFkZTAwM2EsXG4gIDB4YzhkNzUxODAsIDB4YmZkMDYxMTYsIDB4MjFiNGY0YjUsIDB4NTZiM2M0MjMsIDB4Y2ZiYTk1OTksXG4gIDB4YjhiZGE1MGYsIDB4MjgwMmI4OWUsIDB4NWYwNTg4MDgsIDB4YzYwY2Q5YjIsIDB4YjEwYmU5MjQsXG4gIDB4MmY2ZjdjODcsIDB4NTg2ODRjMTEsIDB4YzE2MTFkYWIsIDB4YjY2NjJkM2QsIDB4NzZkYzQxOTAsXG4gIDB4MDFkYjcxMDYsIDB4OThkMjIwYmMsIDB4ZWZkNTEwMmEsIDB4NzFiMTg1ODksIDB4MDZiNmI1MWYsXG4gIDB4OWZiZmU0YTUsIDB4ZThiOGQ0MzMsIDB4NzgwN2M5YTIsIDB4MGYwMGY5MzQsIDB4OTYwOWE4OGUsXG4gIDB4ZTEwZTk4MTgsIDB4N2Y2YTBkYmIsIDB4MDg2ZDNkMmQsIDB4OTE2NDZjOTcsIDB4ZTY2MzVjMDEsXG4gIDB4NmI2YjUxZjQsIDB4MWM2YzYxNjIsIDB4ODU2NTMwZDgsIDB4ZjI2MjAwNGUsIDB4NmMwNjk1ZWQsXG4gIDB4MWIwMWE1N2IsIDB4ODIwOGY0YzEsIDB4ZjUwZmM0NTcsIDB4NjViMGQ5YzYsIDB4MTJiN2U5NTAsXG4gIDB4OGJiZWI4ZWEsIDB4ZmNiOTg4N2MsIDB4NjJkZDFkZGYsIDB4MTVkYTJkNDksIDB4OGNkMzdjZjMsXG4gIDB4ZmJkNDRjNjUsIDB4NGRiMjYxNTgsIDB4M2FiNTUxY2UsIDB4YTNiYzAwNzQsIDB4ZDRiYjMwZTIsXG4gIDB4NGFkZmE1NDEsIDB4M2RkODk1ZDcsIDB4YTRkMWM0NmQsIDB4ZDNkNmY0ZmIsIDB4NDM2OWU5NmEsXG4gIDB4MzQ2ZWQ5ZmMsIDB4YWQ2Nzg4NDYsIDB4ZGE2MGI4ZDAsIDB4NDQwNDJkNzMsIDB4MzMwMzFkZTUsXG4gIDB4YWEwYTRjNWYsIDB4ZGQwZDdjYzksIDB4NTAwNTcxM2MsIDB4MjcwMjQxYWEsIDB4YmUwYjEwMTAsXG4gIDB4YzkwYzIwODYsIDB4NTc2OGI1MjUsIDB4MjA2Zjg1YjMsIDB4Yjk2NmQ0MDksIDB4Y2U2MWU0OWYsXG4gIDB4NWVkZWY5MGUsIDB4MjlkOWM5OTgsIDB4YjBkMDk4MjIsIDB4YzdkN2E4YjQsIDB4NTliMzNkMTcsXG4gIDB4MmViNDBkODEsIDB4YjdiZDVjM2IsIDB4YzBiYTZjYWQsIDB4ZWRiODgzMjAsIDB4OWFiZmIzYjYsXG4gIDB4MDNiNmUyMGMsIDB4NzRiMWQyOWEsIDB4ZWFkNTQ3MzksIDB4OWRkMjc3YWYsIDB4MDRkYjI2MTUsXG4gIDB4NzNkYzE2ODMsIDB4ZTM2MzBiMTIsIDB4OTQ2NDNiODQsIDB4MGQ2ZDZhM2UsIDB4N2E2YTVhYTgsXG4gIDB4ZTQwZWNmMGIsIDB4OTMwOWZmOWQsIDB4MGEwMGFlMjcsIDB4N2QwNzllYjEsIDB4ZjAwZjkzNDQsXG4gIDB4ODcwOGEzZDIsIDB4MWUwMWYyNjgsIDB4NjkwNmMyZmUsIDB4Zjc2MjU3NWQsIDB4ODA2NTY3Y2IsXG4gIDB4MTk2YzM2NzEsIDB4NmU2YjA2ZTcsIDB4ZmVkNDFiNzYsIDB4ODlkMzJiZTAsIDB4MTBkYTdhNWEsXG4gIDB4NjdkZDRhY2MsIDB4ZjliOWRmNmYsIDB4OGViZWVmZjksIDB4MTdiN2JlNDMsIDB4NjBiMDhlZDUsXG4gIDB4ZDZkNmEzZTgsIDB4YTFkMTkzN2UsIDB4MzhkOGMyYzQsIDB4NGZkZmYyNTIsIDB4ZDFiYjY3ZjEsXG4gIDB4YTZiYzU3NjcsIDB4M2ZiNTA2ZGQsIDB4NDhiMjM2NGIsIDB4ZDgwZDJiZGEsIDB4YWYwYTFiNGMsXG4gIDB4MzYwMzRhZjYsIDB4NDEwNDdhNjAsIDB4ZGY2MGVmYzMsIDB4YTg2N2RmNTUsIDB4MzE2ZThlZWYsXG4gIDB4NDY2OWJlNzksIDB4Y2I2MWIzOGMsIDB4YmM2NjgzMWEsIDB4MjU2ZmQyYTAsIDB4NTI2OGUyMzYsXG4gIDB4Y2MwYzc3OTUsIDB4YmIwYjQ3MDMsIDB4MjIwMjE2YjksIDB4NTUwNTI2MmYsIDB4YzViYTNiYmUsXG4gIDB4YjJiZDBiMjgsIDB4MmJiNDVhOTIsIDB4NWNiMzZhMDQsIDB4YzJkN2ZmYTcsIDB4YjVkMGNmMzEsXG4gIDB4MmNkOTllOGIsIDB4NWJkZWFlMWQsIDB4OWI2NGMyYjAsIDB4ZWM2M2YyMjYsIDB4NzU2YWEzOWMsXG4gIDB4MDI2ZDkzMGEsIDB4OWMwOTA2YTksIDB4ZWIwZTM2M2YsIDB4NzIwNzY3ODUsIDB4MDUwMDU3MTMsXG4gIDB4OTViZjRhODIsIDB4ZTJiODdhMTQsIDB4N2JiMTJiYWUsIDB4MGNiNjFiMzgsIDB4OTJkMjhlOWIsXG4gIDB4ZTVkNWJlMGQsIDB4N2NkY2VmYjcsIDB4MGJkYmRmMjEsIDB4ODZkM2QyZDQsIDB4ZjFkNGUyNDIsXG4gIDB4NjhkZGIzZjgsIDB4MWZkYTgzNmUsIDB4ODFiZTE2Y2QsIDB4ZjZiOTI2NWIsIDB4NmZiMDc3ZTEsXG4gIDB4MThiNzQ3NzcsIDB4ODgwODVhZTYsIDB4ZmYwZjZhNzAsIDB4NjYwNjNiY2EsIDB4MTEwMTBiNWMsXG4gIDB4OGY2NTllZmYsIDB4Zjg2MmFlNjksIDB4NjE2YmZmZDMsIDB4MTY2Y2NmNDUsIDB4YTAwYWUyNzgsXG4gIDB4ZDcwZGQyZWUsIDB4NGUwNDgzNTQsIDB4MzkwM2IzYzIsIDB4YTc2NzI2NjEsIDB4ZDA2MDE2ZjcsXG4gIDB4NDk2OTQ3NGQsIDB4M2U2ZTc3ZGIsIDB4YWVkMTZhNGEsIDB4ZDlkNjVhZGMsIDB4NDBkZjBiNjYsXG4gIDB4MzdkODNiZjAsIDB4YTliY2FlNTMsIDB4ZGViYjllYzUsIDB4NDdiMmNmN2YsIDB4MzBiNWZmZTksXG4gIDB4YmRiZGYyMWMsIDB4Y2FiYWMyOGEsIDB4NTNiMzkzMzAsIDB4MjRiNGEzYTYsIDB4YmFkMDM2MDUsXG4gIDB4Y2RkNzA2OTMsIDB4NTRkZTU3MjksIDB4MjNkOTY3YmYsIDB4YjM2NjdhMmUsIDB4YzQ2MTRhYjgsXG4gIDB4NWQ2ODFiMDIsIDB4MmE2ZjJiOTQsIDB4YjQwYmJlMzcsIDB4YzMwYzhlYTEsIDB4NWEwNWRmMWIsXG4gIDB4MmQwMmVmOGRcbl07XG5cbmlmICh0eXBlb2YgSW50MzJBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgQ1JDX1RBQkxFID0gbmV3IEludDMyQXJyYXkoQ1JDX1RBQkxFKTtcbn1cblxuZnVuY3Rpb24gbmV3RW1wdHlCdWZmZXIobGVuZ3RoKSB7XG4gIHZhciBidWZmZXIgPSBuZXcgQnVmZmVyKGxlbmd0aCk7XG4gIGJ1ZmZlci5maWxsKDB4MDApO1xuICByZXR1cm4gYnVmZmVyO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVCdWZmZXIoaW5wdXQpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihpbnB1dCkpIHtcbiAgICByZXR1cm4gaW5wdXQ7XG4gIH1cblxuICB2YXIgaGFzTmV3QnVmZmVyQVBJID1cbiAgICAgIHR5cGVvZiBCdWZmZXIuYWxsb2MgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgdHlwZW9mIEJ1ZmZlci5mcm9tID09PSBcImZ1bmN0aW9uXCI7XG5cbiAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gXCJudW1iZXJcIikge1xuICAgIHJldHVybiBoYXNOZXdCdWZmZXJBUEkgPyBCdWZmZXIuYWxsb2MoaW5wdXQpIDogbmV3RW1wdHlCdWZmZXIoaW5wdXQpO1xuICB9XG4gIGVsc2UgaWYgKHR5cGVvZiBpbnB1dCA9PT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiBoYXNOZXdCdWZmZXJBUEkgPyBCdWZmZXIuZnJvbShpbnB1dCkgOiBuZXcgQnVmZmVyKGlucHV0KTtcbiAgfVxuICBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnB1dCBtdXN0IGJlIGJ1ZmZlciwgbnVtYmVyLCBvciBzdHJpbmcsIHJlY2VpdmVkIFwiICtcbiAgICAgICAgICAgICAgICAgICAgdHlwZW9mIGlucHV0KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBidWZmZXJpemVJbnQobnVtKSB7XG4gIHZhciB0bXAgPSBlbnN1cmVCdWZmZXIoNCk7XG4gIHRtcC53cml0ZUludDMyQkUobnVtLCAwKTtcbiAgcmV0dXJuIHRtcDtcbn1cblxuZnVuY3Rpb24gX2NyYzMyKGJ1ZiwgcHJldmlvdXMpIHtcbiAgYnVmID0gZW5zdXJlQnVmZmVyKGJ1Zik7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIocHJldmlvdXMpKSB7XG4gICAgcHJldmlvdXMgPSBwcmV2aW91cy5yZWFkVUludDMyQkUoMCk7XG4gIH1cbiAgdmFyIGNyYyA9IH5+cHJldmlvdXMgXiAtMTtcbiAgZm9yICh2YXIgbiA9IDA7IG4gPCBidWYubGVuZ3RoOyBuKyspIHtcbiAgICBjcmMgPSBDUkNfVEFCTEVbKGNyYyBeIGJ1ZltuXSkgJiAweGZmXSBeIChjcmMgPj4+IDgpO1xuICB9XG4gIHJldHVybiAoY3JjIF4gLTEpO1xufVxuXG5mdW5jdGlvbiBjcmMzMigpIHtcbiAgcmV0dXJuIGJ1ZmZlcml6ZUludChfY3JjMzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKSk7XG59XG5jcmMzMi5zaWduZWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBfY3JjMzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbn07XG5jcmMzMi51bnNpZ25lZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIF9jcmMzMi5hcHBseShudWxsLCBhcmd1bWVudHMpID4+PiAwO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBjcmMzMjtcbiIsImNvbnN0IEVERlMgPSByZXF1aXJlKCcuL2xpYi9FREZTJyk7XG5jb25zdCBDU0JJZGVudGlmaWVyID0gcmVxdWlyZShcIi4vbGliL0NTQklkZW50aWZpZXJcIik7XG5jb25zdCBGaWxlSGFuZGxlciA9IHJlcXVpcmUoXCIuL2xpYi9GaWxlSGFuZGxlclwiKTtcbm1vZHVsZS5leHBvcnRzLkVERlMgPSBFREZTO1xubW9kdWxlLmV4cG9ydHMuQ1NCSWRlbnRpZmllciA9IENTQklkZW50aWZpZXI7XG5tb2R1bGUuZXhwb3J0cy5GaWxlSGFuZGxlciA9IEZpbGVIYW5kbGVyO1xubW9kdWxlLmV4cG9ydHMuRURGU01pZGRsZXdhcmUgPSByZXF1aXJlKFwiLi9FREZTTWlkZGxld2FyZVwiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0XHRcdFx0XHRjcmVhdGVRdWU6IHJlcXVpcmUoXCIuL2xpYi9mb2xkZXJNUVwiKS5nZXRGb2xkZXJRdWV1ZVxuXHRcdFx0XHRcdC8vZm9sZGVyTVE6IHJlcXVpcmUoXCIuL2xpYi9mb2xkZXJNUVwiKVxufTsiLCJ2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG52YXIgc3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJyk7XG52YXIgUmVhZGFibGUgPSBzdHJlYW0uUmVhZGFibGU7XG52YXIgV3JpdGFibGUgPSBzdHJlYW0uV3JpdGFibGU7XG52YXIgUGFzc1Rocm91Z2ggPSBzdHJlYW0uUGFzc1Rocm91Z2g7XG52YXIgUGVuZCA9IHJlcXVpcmUoJy4vbW9kdWxlcy9ub2RlLXBlbmQnKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbmV4cG9ydHMuY3JlYXRlRnJvbUJ1ZmZlciA9IGNyZWF0ZUZyb21CdWZmZXI7XG5leHBvcnRzLmNyZWF0ZUZyb21GZCA9IGNyZWF0ZUZyb21GZDtcbmV4cG9ydHMuQnVmZmVyU2xpY2VyID0gQnVmZmVyU2xpY2VyO1xuZXhwb3J0cy5GZFNsaWNlciA9IEZkU2xpY2VyO1xuXG51dGlsLmluaGVyaXRzKEZkU2xpY2VyLCBFdmVudEVtaXR0ZXIpO1xuZnVuY3Rpb24gRmRTbGljZXIoZmQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuXG4gIHRoaXMuZmQgPSBmZDtcbiAgdGhpcy5wZW5kID0gbmV3IFBlbmQoKTtcbiAgdGhpcy5wZW5kLm1heCA9IDE7XG4gIHRoaXMucmVmQ291bnQgPSAwO1xuICB0aGlzLmF1dG9DbG9zZSA9ICEhb3B0aW9ucy5hdXRvQ2xvc2U7XG59XG5cbkZkU2xpY2VyLnByb3RvdHlwZS5yZWFkID0gZnVuY3Rpb24oYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5wZW5kLmdvKGZ1bmN0aW9uKGNiKSB7XG4gICAgZnMucmVhZChzZWxmLmZkLCBidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgZnVuY3Rpb24oZXJyLCBieXRlc1JlYWQsIGJ1ZmZlcikge1xuICAgICAgY2IoKTtcbiAgICAgIGNhbGxiYWNrKGVyciwgYnl0ZXNSZWFkLCBidWZmZXIpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbkZkU2xpY2VyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYucGVuZC5nbyhmdW5jdGlvbihjYikge1xuICAgIGZzLndyaXRlKHNlbGYuZmQsIGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBmdW5jdGlvbihlcnIsIHdyaXR0ZW4sIGJ1ZmZlcikge1xuICAgICAgY2IoKTtcbiAgICAgIGNhbGxiYWNrKGVyciwgd3JpdHRlbiwgYnVmZmVyKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5GZFNsaWNlci5wcm90b3R5cGUuY3JlYXRlUmVhZFN0cmVhbSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBSZWFkU3RyZWFtKHRoaXMsIG9wdGlvbnMpO1xufTtcblxuRmRTbGljZXIucHJvdG90eXBlLmNyZWF0ZVdyaXRlU3RyZWFtID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICByZXR1cm4gbmV3IFdyaXRlU3RyZWFtKHRoaXMsIG9wdGlvbnMpO1xufTtcblxuRmRTbGljZXIucHJvdG90eXBlLnJlZiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnJlZkNvdW50ICs9IDE7XG59O1xuXG5GZFNsaWNlci5wcm90b3R5cGUudW5yZWYgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLnJlZkNvdW50IC09IDE7XG5cbiAgaWYgKHNlbGYucmVmQ291bnQgPiAwKSByZXR1cm47XG4gIGlmIChzZWxmLnJlZkNvdW50IDwgMCkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCB1bnJlZlwiKTtcblxuICBpZiAoc2VsZi5hdXRvQ2xvc2UpIHtcbiAgICBmcy5jbG9zZShzZWxmLmZkLCBvbkNsb3NlRG9uZSk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkNsb3NlRG9uZShlcnIpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5lbWl0KCdjbG9zZScpO1xuICAgIH1cbiAgfVxufTtcblxudXRpbC5pbmhlcml0cyhSZWFkU3RyZWFtLCBSZWFkYWJsZSk7XG5mdW5jdGlvbiBSZWFkU3RyZWFtKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIFJlYWRhYmxlLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5jb250ZXh0LnJlZigpO1xuXG4gIHRoaXMuc3RhcnQgPSBvcHRpb25zLnN0YXJ0IHx8IDA7XG4gIHRoaXMuZW5kT2Zmc2V0ID0gb3B0aW9ucy5lbmQ7XG4gIHRoaXMucG9zID0gdGhpcy5zdGFydDtcbiAgdGhpcy5kZXN0cm95ZWQgPSBmYWxzZTtcbn1cblxuUmVhZFN0cmVhbS5wcm90b3R5cGUuX3JlYWQgPSBmdW5jdGlvbihuKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYuZGVzdHJveWVkKSByZXR1cm47XG5cbiAgdmFyIHRvUmVhZCA9IE1hdGgubWluKHNlbGYuX3JlYWRhYmxlU3RhdGUuaGlnaFdhdGVyTWFyaywgbik7XG4gIGlmIChzZWxmLmVuZE9mZnNldCAhPSBudWxsKSB7XG4gICAgdG9SZWFkID0gTWF0aC5taW4odG9SZWFkLCBzZWxmLmVuZE9mZnNldCAtIHNlbGYucG9zKTtcbiAgfVxuICBpZiAodG9SZWFkIDw9IDApIHtcbiAgICBzZWxmLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgc2VsZi5wdXNoKG51bGwpO1xuICAgIHNlbGYuY29udGV4dC51bnJlZigpO1xuICAgIHJldHVybjtcbiAgfVxuICBzZWxmLmNvbnRleHQucGVuZC5nbyhmdW5jdGlvbihjYikge1xuICAgIGlmIChzZWxmLmRlc3Ryb3llZCkgcmV0dXJuIGNiKCk7XG4gICAgdmFyIGJ1ZmZlciA9IG5ldyBCdWZmZXIodG9SZWFkKTtcbiAgICBmcy5yZWFkKHNlbGYuY29udGV4dC5mZCwgYnVmZmVyLCAwLCB0b1JlYWQsIHNlbGYucG9zLCBmdW5jdGlvbihlcnIsIGJ5dGVzUmVhZCkge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBzZWxmLmRlc3Ryb3koZXJyKTtcbiAgICAgIH0gZWxzZSBpZiAoYnl0ZXNSZWFkID09PSAwKSB7XG4gICAgICAgIHNlbGYuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICAgICAgc2VsZi5wdXNoKG51bGwpO1xuICAgICAgICBzZWxmLmNvbnRleHQudW5yZWYoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYucG9zICs9IGJ5dGVzUmVhZDtcbiAgICAgICAgc2VsZi5wdXNoKGJ1ZmZlci5zbGljZSgwLCBieXRlc1JlYWQpKTtcbiAgICAgIH1cbiAgICAgIGNiKCk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuUmVhZFN0cmVhbS5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKGVycikge1xuICBpZiAodGhpcy5kZXN0cm95ZWQpIHJldHVybjtcbiAgZXJyID0gZXJyIHx8IG5ldyBFcnJvcihcInN0cmVhbSBkZXN0cm95ZWRcIik7XG4gIHRoaXMuZGVzdHJveWVkID0gdHJ1ZTtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG4gIHRoaXMuY29udGV4dC51bnJlZigpO1xufTtcblxudXRpbC5pbmhlcml0cyhXcml0ZVN0cmVhbSwgV3JpdGFibGUpO1xuZnVuY3Rpb24gV3JpdGVTdHJlYW0oY29udGV4dCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgV3JpdGFibGUuY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLmNvbnRleHQucmVmKCk7XG5cbiAgdGhpcy5zdGFydCA9IG9wdGlvbnMuc3RhcnQgfHwgMDtcbiAgdGhpcy5lbmRPZmZzZXQgPSAob3B0aW9ucy5lbmQgPT0gbnVsbCkgPyBJbmZpbml0eSA6ICtvcHRpb25zLmVuZDtcbiAgdGhpcy5ieXRlc1dyaXR0ZW4gPSAwO1xuICB0aGlzLnBvcyA9IHRoaXMuc3RhcnQ7XG4gIHRoaXMuZGVzdHJveWVkID0gZmFsc2U7XG5cbiAgdGhpcy5vbignZmluaXNoJywgdGhpcy5kZXN0cm95LmJpbmQodGhpcykpO1xufVxuXG5Xcml0ZVN0cmVhbS5wcm90b3R5cGUuX3dyaXRlID0gZnVuY3Rpb24oYnVmZmVyLCBlbmNvZGluZywgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoc2VsZi5kZXN0cm95ZWQpIHJldHVybjtcblxuICBpZiAoc2VsZi5wb3MgKyBidWZmZXIubGVuZ3RoID4gc2VsZi5lbmRPZmZzZXQpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKFwibWF4aW11bSBmaWxlIGxlbmd0aCBleGNlZWRlZFwiKTtcbiAgICBlcnIuY29kZSA9ICdFVE9PQklHJztcbiAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICBjYWxsYmFjayhlcnIpO1xuICAgIHJldHVybjtcbiAgfVxuICBzZWxmLmNvbnRleHQucGVuZC5nbyhmdW5jdGlvbihjYikge1xuICAgIGlmIChzZWxmLmRlc3Ryb3llZCkgcmV0dXJuIGNiKCk7XG4gICAgZnMud3JpdGUoc2VsZi5jb250ZXh0LmZkLCBidWZmZXIsIDAsIGJ1ZmZlci5sZW5ndGgsIHNlbGYucG9zLCBmdW5jdGlvbihlcnIsIGJ5dGVzKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICBjYigpO1xuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5ieXRlc1dyaXR0ZW4gKz0gYnl0ZXM7XG4gICAgICAgIHNlbGYucG9zICs9IGJ5dGVzO1xuICAgICAgICBzZWxmLmVtaXQoJ3Byb2dyZXNzJyk7XG4gICAgICAgIGNiKCk7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufTtcblxuV3JpdGVTdHJlYW0ucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuZGVzdHJveWVkKSByZXR1cm47XG4gIHRoaXMuZGVzdHJveWVkID0gdHJ1ZTtcbiAgdGhpcy5jb250ZXh0LnVucmVmKCk7XG59O1xuXG51dGlsLmluaGVyaXRzKEJ1ZmZlclNsaWNlciwgRXZlbnRFbWl0dGVyKTtcbmZ1bmN0aW9uIEJ1ZmZlclNsaWNlcihidWZmZXIsIG9wdGlvbnMpIHtcbiAgRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHRoaXMucmVmQ291bnQgPSAwO1xuICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgdGhpcy5tYXhDaHVua1NpemUgPSBvcHRpb25zLm1heENodW5rU2l6ZSB8fCBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjtcbn1cblxuQnVmZmVyU2xpY2VyLnByb3RvdHlwZS5yZWFkID0gZnVuY3Rpb24oYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrKSB7XG4gIHZhciBlbmQgPSBwb3NpdGlvbiArIGxlbmd0aDtcbiAgdmFyIGRlbHRhID0gZW5kIC0gdGhpcy5idWZmZXIubGVuZ3RoO1xuICB2YXIgd3JpdHRlbiA9IChkZWx0YSA+IDApID8gZGVsdGEgOiBsZW5ndGg7XG4gIHRoaXMuYnVmZmVyLmNvcHkoYnVmZmVyLCBvZmZzZXQsIHBvc2l0aW9uLCBlbmQpO1xuICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgY2FsbGJhY2sobnVsbCwgd3JpdHRlbik7XG4gIH0pO1xufTtcblxuQnVmZmVyU2xpY2VyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaykge1xuICBidWZmZXIuY29weSh0aGlzLmJ1ZmZlciwgcG9zaXRpb24sIG9mZnNldCwgb2Zmc2V0ICsgbGVuZ3RoKTtcbiAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgIGNhbGxiYWNrKG51bGwsIGxlbmd0aCwgYnVmZmVyKTtcbiAgfSk7XG59O1xuXG5CdWZmZXJTbGljZXIucHJvdG90eXBlLmNyZWF0ZVJlYWRTdHJlYW0gPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgcmVhZFN0cmVhbSA9IG5ldyBQYXNzVGhyb3VnaChvcHRpb25zKTtcbiAgcmVhZFN0cmVhbS5kZXN0cm95ZWQgPSBmYWxzZTtcbiAgcmVhZFN0cmVhbS5zdGFydCA9IG9wdGlvbnMuc3RhcnQgfHwgMDtcbiAgcmVhZFN0cmVhbS5lbmRPZmZzZXQgPSBvcHRpb25zLmVuZDtcbiAgLy8gYnkgdGhlIHRpbWUgdGhpcyBmdW5jdGlvbiByZXR1cm5zLCB3ZSdsbCBiZSBkb25lLlxuICByZWFkU3RyZWFtLnBvcyA9IHJlYWRTdHJlYW0uZW5kT2Zmc2V0IHx8IHRoaXMuYnVmZmVyLmxlbmd0aDtcblxuICAvLyByZXNwZWN0IHRoZSBtYXhDaHVua1NpemUgb3B0aW9uIHRvIHNsaWNlIHVwIHRoZSBjaHVuayBpbnRvIHNtYWxsZXIgcGllY2VzLlxuICB2YXIgZW50aXJlU2xpY2UgPSB0aGlzLmJ1ZmZlci5zbGljZShyZWFkU3RyZWFtLnN0YXJ0LCByZWFkU3RyZWFtLnBvcyk7XG4gIHZhciBvZmZzZXQgPSAwO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIHZhciBuZXh0T2Zmc2V0ID0gb2Zmc2V0ICsgdGhpcy5tYXhDaHVua1NpemU7XG4gICAgaWYgKG5leHRPZmZzZXQgPj0gZW50aXJlU2xpY2UubGVuZ3RoKSB7XG4gICAgICAvLyBsYXN0IGNodW5rXG4gICAgICBpZiAob2Zmc2V0IDwgZW50aXJlU2xpY2UubGVuZ3RoKSB7XG4gICAgICAgIHJlYWRTdHJlYW0ud3JpdGUoZW50aXJlU2xpY2Uuc2xpY2Uob2Zmc2V0LCBlbnRpcmVTbGljZS5sZW5ndGgpKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZWFkU3RyZWFtLndyaXRlKGVudGlyZVNsaWNlLnNsaWNlKG9mZnNldCwgbmV4dE9mZnNldCkpO1xuICAgIG9mZnNldCA9IG5leHRPZmZzZXQ7XG4gIH1cblxuICByZWFkU3RyZWFtLmVuZCgpO1xuICByZWFkU3RyZWFtLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICByZWFkU3RyZWFtLmRlc3Ryb3llZCA9IHRydWU7XG4gIH07XG4gIHJldHVybiByZWFkU3RyZWFtO1xufTtcblxuQnVmZmVyU2xpY2VyLnByb3RvdHlwZS5jcmVhdGVXcml0ZVN0cmVhbSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgdmFyIGJ1ZmZlclNsaWNlciA9IHRoaXM7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgd3JpdGVTdHJlYW0gPSBuZXcgV3JpdGFibGUob3B0aW9ucyk7XG4gIHdyaXRlU3RyZWFtLnN0YXJ0ID0gb3B0aW9ucy5zdGFydCB8fCAwO1xuICB3cml0ZVN0cmVhbS5lbmRPZmZzZXQgPSAob3B0aW9ucy5lbmQgPT0gbnVsbCkgPyB0aGlzLmJ1ZmZlci5sZW5ndGggOiArb3B0aW9ucy5lbmQ7XG4gIHdyaXRlU3RyZWFtLmJ5dGVzV3JpdHRlbiA9IDA7XG4gIHdyaXRlU3RyZWFtLnBvcyA9IHdyaXRlU3RyZWFtLnN0YXJ0O1xuICB3cml0ZVN0cmVhbS5kZXN0cm95ZWQgPSBmYWxzZTtcbiAgd3JpdGVTdHJlYW0uX3dyaXRlID0gZnVuY3Rpb24oYnVmZmVyLCBlbmNvZGluZywgY2FsbGJhY2spIHtcbiAgICBpZiAod3JpdGVTdHJlYW0uZGVzdHJveWVkKSByZXR1cm47XG5cbiAgICB2YXIgZW5kID0gd3JpdGVTdHJlYW0ucG9zICsgYnVmZmVyLmxlbmd0aDtcbiAgICBpZiAoZW5kID4gd3JpdGVTdHJlYW0uZW5kT2Zmc2V0KSB7XG4gICAgICB2YXIgZXJyID0gbmV3IEVycm9yKFwibWF4aW11bSBmaWxlIGxlbmd0aCBleGNlZWRlZFwiKTtcbiAgICAgIGVyci5jb2RlID0gJ0VUT09CSUcnO1xuICAgICAgd3JpdGVTdHJlYW0uZGVzdHJveWVkID0gdHJ1ZTtcbiAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGJ1ZmZlci5jb3B5KGJ1ZmZlclNsaWNlci5idWZmZXIsIHdyaXRlU3RyZWFtLnBvcywgMCwgYnVmZmVyLmxlbmd0aCk7XG5cbiAgICB3cml0ZVN0cmVhbS5ieXRlc1dyaXR0ZW4gKz0gYnVmZmVyLmxlbmd0aDtcbiAgICB3cml0ZVN0cmVhbS5wb3MgPSBlbmQ7XG4gICAgd3JpdGVTdHJlYW0uZW1pdCgncHJvZ3Jlc3MnKTtcbiAgICBjYWxsYmFjaygpO1xuICB9O1xuICB3cml0ZVN0cmVhbS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgd3JpdGVTdHJlYW0uZGVzdHJveWVkID0gdHJ1ZTtcbiAgfTtcbiAgcmV0dXJuIHdyaXRlU3RyZWFtO1xufTtcblxuQnVmZmVyU2xpY2VyLnByb3RvdHlwZS5yZWYgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5yZWZDb3VudCArPSAxO1xufTtcblxuQnVmZmVyU2xpY2VyLnByb3RvdHlwZS51bnJlZiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnJlZkNvdW50IC09IDE7XG5cbiAgaWYgKHRoaXMucmVmQ291bnQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCB1bnJlZlwiKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gY3JlYXRlRnJvbUJ1ZmZlcihidWZmZXIsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBCdWZmZXJTbGljZXIoYnVmZmVyLCBvcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRnJvbUZkKGZkLCBvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgRmRTbGljZXIoZmQsIG9wdGlvbnMpO1xufVxuIiwiLy90byBsb29rIG5pY2UgdGhlIHJlcXVpcmVNb2R1bGUgb24gTm9kZVxucmVxdWlyZShcIi4vbGliL3Bzay1hYnN0cmFjdC1jbGllbnRcIik7XG5pZighJCQuYnJvd3NlclJ1bnRpbWUpe1xuXHRyZXF1aXJlKFwiLi9saWIvcHNrLW5vZGUtY2xpZW50XCIpO1xufWVsc2V7XG5cdHJlcXVpcmUoXCIuL2xpYi9wc2stYnJvd3Nlci1jbGllbnRcIik7XG59IiwiY29uc3QgQmxvY2tjaGFpbiA9IHJlcXVpcmUoJy4vbGliL0Jsb2NrY2hhaW4nKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc3RhcnREQjogZnVuY3Rpb24gKGZvbGRlcikge1xuICAgICAgICBpZiAoJCQuYmxvY2tjaGFpbikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCckJC5ibG9ja2NoYWluIGlzIGFscmVhZHkgZGVmaW5lZCcpO1xuICAgICAgICB9XG4gICAgICAgICQkLmJsb2NrY2hhaW4gPSB0aGlzLmNyZWF0ZURCSGFuZGxlcihmb2xkZXIpO1xuICAgICAgICByZXR1cm4gJCQuYmxvY2tjaGFpbjtcbiAgICB9LFxuICAgIGNyZWF0ZURCSGFuZGxlcjogZnVuY3Rpb24oZm9sZGVyKXtcbiAgICAgICAgcmVxdWlyZSgnLi9saWIvZG9tYWluJyk7XG4gICAgICAgIHJlcXVpcmUoJy4vbGliL3N3YXJtcycpO1xuXG4gICAgICAgIGNvbnN0IGZwZHMgPSByZXF1aXJlKFwiLi9saWIvRm9sZGVyUGVyc2lzdGVudFBEU1wiKTtcbiAgICAgICAgY29uc3QgcGRzID0gZnBkcy5uZXdQRFMoZm9sZGVyKTtcblxuICAgICAgICByZXR1cm4gbmV3IEJsb2NrY2hhaW4ocGRzKTtcbiAgICB9LFxuICAgIHBhcnNlRG9tYWluVXJsOiBmdW5jdGlvbiAoZG9tYWluVXJsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRW1wdHkgZnVuY3Rpb25cIik7XG4gICAgfSxcbiAgICBnZXREb21haW5JbmZvOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRW1wdHkgZnVuY3Rpb25cIik7XG4gICAgfSxcbiAgICBzdGFydEluTWVtb3J5REI6IGZ1bmN0aW9uKCkge1xuXHRcdHJlcXVpcmUoJy4vbGliL2RvbWFpbicpO1xuXHRcdHJlcXVpcmUoJy4vbGliL3N3YXJtcycpO1xuXG5cdFx0Y29uc3QgcGRzID0gcmVxdWlyZSgnLi9saWIvSW5NZW1vcnlQRFMnKTtcblxuXHRcdHJldHVybiBuZXcgQmxvY2tjaGFpbihwZHMubmV3UERTKG51bGwpKTtcbiAgICB9LFxuICAgIHN0YXJ0RGI6IGZ1bmN0aW9uKHJlYWRlcldyaXRlcikge1xuICAgICAgICByZXF1aXJlKCcuL2xpYi9kb21haW4nKTtcbiAgICAgICAgcmVxdWlyZSgnLi9saWIvc3dhcm1zJyk7XG5cbiAgICAgICAgY29uc3QgcHBkcyA9IHJlcXVpcmUoXCIuL2xpYi9QZXJzaXN0ZW50UERTXCIpO1xuICAgICAgICBjb25zdCBwZHMgPSBwcGRzLm5ld1BEUyhyZWFkZXJXcml0ZXIpO1xuXG4gICAgICAgIHJldHVybiBuZXcgQmxvY2tjaGFpbihwZHMpO1xuICAgIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjb25zVXRpbDogcmVxdWlyZSgnLi9jb25zVXRpbCcpXG59OyIsImNvbnN0IFNlcnZlciA9IHJlcXVpcmUoJy4vVmlydHVhbE1RLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gU2VydmVyO1xuIiwidmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xudmFyIHpsaWIgPSByZXF1aXJlKFwiemxpYlwiKTtcbmNvbnN0IGZkX3NsaWNlciA9IHJlcXVpcmUoXCJub2RlLWZkLXNsaWNlclwiKTtcbnZhciBjcmMzMiA9IHJlcXVpcmUoXCJidWZmZXItY3JjMzJcIik7XG52YXIgdXRpbCA9IHJlcXVpcmUoXCJ1dGlsXCIpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyO1xudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuVHJhbnNmb3JtO1xudmFyIFBhc3NUaHJvdWdoID0gcmVxdWlyZShcInN0cmVhbVwiKS5QYXNzVGhyb3VnaDtcbnZhciBXcml0YWJsZSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuV3JpdGFibGU7XG5cbmV4cG9ydHMub3BlbiA9IG9wZW47XG5leHBvcnRzLmZyb21GZCA9IGZyb21GZDtcbmV4cG9ydHMuZnJvbUJ1ZmZlciA9IGZyb21CdWZmZXI7XG5leHBvcnRzLmZyb21SYW5kb21BY2Nlc3NSZWFkZXIgPSBmcm9tUmFuZG9tQWNjZXNzUmVhZGVyO1xuZXhwb3J0cy5kb3NEYXRlVGltZVRvRGF0ZSA9IGRvc0RhdGVUaW1lVG9EYXRlO1xuZXhwb3J0cy52YWxpZGF0ZUZpbGVOYW1lID0gdmFsaWRhdGVGaWxlTmFtZTtcbmV4cG9ydHMuWmlwRmlsZSA9IFppcEZpbGU7XG5leHBvcnRzLkVudHJ5ID0gRW50cnk7XG5leHBvcnRzLlJhbmRvbUFjY2Vzc1JlYWRlciA9IFJhbmRvbUFjY2Vzc1JlYWRlcjtcblxuZnVuY3Rpb24gb3BlbihwYXRoLCBvcHRpb25zLCBjYWxsYmFjaykge1xuXHRpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdGNhbGxiYWNrID0gb3B0aW9ucztcblx0XHRvcHRpb25zID0gbnVsbDtcblx0fVxuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdGlmIChvcHRpb25zLmF1dG9DbG9zZSA9PSBudWxsKSBvcHRpb25zLmF1dG9DbG9zZSA9IHRydWU7XG5cdGlmIChvcHRpb25zLmxhenlFbnRyaWVzID09IG51bGwpIG9wdGlvbnMubGF6eUVudHJpZXMgPSBmYWxzZTtcblx0aWYgKG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9PSBudWxsKSBvcHRpb25zLmRlY29kZVN0cmluZ3MgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPT0gbnVsbCkgb3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPT0gbnVsbCkgb3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPSBmYWxzZTtcblx0aWYgKGNhbGxiYWNrID09IG51bGwpIGNhbGxiYWNrID0gZGVmYXVsdENhbGxiYWNrO1xuXHRmcy5vcGVuKHBhdGgsIFwiclwiLCBmdW5jdGlvbiAoZXJyLCBmZCkge1xuXHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdGZyb21GZChmZCwgb3B0aW9ucywgZnVuY3Rpb24gKGVyciwgemlwZmlsZSkge1xuXHRcdFx0aWYgKGVycikgZnMuY2xvc2UoZmQsIGRlZmF1bHRDYWxsYmFjayk7XG5cdFx0XHRjYWxsYmFjayhlcnIsIHppcGZpbGUpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gZnJvbUZkKGZkLCBvcHRpb25zLCBjYWxsYmFjaykge1xuXHRpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdGNhbGxiYWNrID0gb3B0aW9ucztcblx0XHRvcHRpb25zID0gbnVsbDtcblx0fVxuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdGlmIChvcHRpb25zLmF1dG9DbG9zZSA9PSBudWxsKSBvcHRpb25zLmF1dG9DbG9zZSA9IGZhbHNlO1xuXHRpZiAob3B0aW9ucy5sYXp5RW50cmllcyA9PSBudWxsKSBvcHRpb25zLmxhenlFbnRyaWVzID0gZmFsc2U7XG5cdGlmIChvcHRpb25zLmRlY29kZVN0cmluZ3MgPT0gbnVsbCkgb3B0aW9ucy5kZWNvZGVTdHJpbmdzID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzID09IG51bGwpIG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzID09IG51bGwpIG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzID0gZmFsc2U7XG5cdGlmIChjYWxsYmFjayA9PSBudWxsKSBjYWxsYmFjayA9IGRlZmF1bHRDYWxsYmFjaztcblx0ZnMuZnN0YXQoZmQsIGZ1bmN0aW9uIChlcnIsIHN0YXRzKSB7XG5cdFx0aWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0dmFyIHJlYWRlciA9IGZkX3NsaWNlci5jcmVhdGVGcm9tRmQoZmQsIHthdXRvQ2xvc2U6IHRydWV9KTtcblx0XHRmcm9tUmFuZG9tQWNjZXNzUmVhZGVyKHJlYWRlciwgc3RhdHMuc2l6ZSwgb3B0aW9ucywgY2FsbGJhY2spO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gZnJvbUJ1ZmZlcihidWZmZXIsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG5cdGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0Y2FsbGJhY2sgPSBvcHRpb25zO1xuXHRcdG9wdGlvbnMgPSBudWxsO1xuXHR9XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblx0b3B0aW9ucy5hdXRvQ2xvc2UgPSBmYWxzZTtcblx0aWYgKG9wdGlvbnMubGF6eUVudHJpZXMgPT0gbnVsbCkgb3B0aW9ucy5sYXp5RW50cmllcyA9IGZhbHNlO1xuXHRpZiAob3B0aW9ucy5kZWNvZGVTdHJpbmdzID09IG51bGwpIG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9IHRydWU7XG5cdGlmIChvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9PSBudWxsKSBvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9IHRydWU7XG5cdGlmIChvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9PSBudWxsKSBvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9IGZhbHNlO1xuXHQvLyBsaW1pdCB0aGUgbWF4IGNodW5rIHNpemUuIHNlZSBodHRwczovL2dpdGh1Yi5jb20vdGhlam9zaHdvbGZlL3lhdXpsL2lzc3Vlcy84N1xuXHR2YXIgcmVhZGVyID0gZmRfc2xpY2VyLmNyZWF0ZUZyb21CdWZmZXIoYnVmZmVyLCB7bWF4Q2h1bmtTaXplOiAweDEwMDAwfSk7XG5cdGZyb21SYW5kb21BY2Nlc3NSZWFkZXIocmVhZGVyLCBidWZmZXIubGVuZ3RoLCBvcHRpb25zLCBjYWxsYmFjayk7XG59XG5cbmZ1bmN0aW9uIGZyb21SYW5kb21BY2Nlc3NSZWFkZXIocmVhZGVyLCB0b3RhbFNpemUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG5cdGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0Y2FsbGJhY2sgPSBvcHRpb25zO1xuXHRcdG9wdGlvbnMgPSBudWxsO1xuXHR9XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblx0aWYgKG9wdGlvbnMuYXV0b0Nsb3NlID09IG51bGwpIG9wdGlvbnMuYXV0b0Nsb3NlID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMubGF6eUVudHJpZXMgPT0gbnVsbCkgb3B0aW9ucy5sYXp5RW50cmllcyA9IGZhbHNlO1xuXHRpZiAob3B0aW9ucy5kZWNvZGVTdHJpbmdzID09IG51bGwpIG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9IHRydWU7XG5cdHZhciBkZWNvZGVTdHJpbmdzID0gISFvcHRpb25zLmRlY29kZVN0cmluZ3M7XG5cdGlmIChvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9PSBudWxsKSBvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9IHRydWU7XG5cdGlmIChvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9PSBudWxsKSBvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9IGZhbHNlO1xuXHRpZiAoY2FsbGJhY2sgPT0gbnVsbCkgY2FsbGJhY2sgPSBkZWZhdWx0Q2FsbGJhY2s7XG5cdGlmICh0eXBlb2YgdG90YWxTaXplICE9PSBcIm51bWJlclwiKSB0aHJvdyBuZXcgRXJyb3IoXCJleHBlY3RlZCB0b3RhbFNpemUgcGFyYW1ldGVyIHRvIGJlIGEgbnVtYmVyXCIpO1xuXHRpZiAodG90YWxTaXplID4gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJ6aXAgZmlsZSB0b28gbGFyZ2UuIG9ubHkgZmlsZSBzaXplcyB1cCB0byAyXjUyIGFyZSBzdXBwb3J0ZWQgZHVlIHRvIEphdmFTY3JpcHQncyBOdW1iZXIgdHlwZSBiZWluZyBhbiBJRUVFIDc1NCBkb3VibGUuXCIpO1xuXHR9XG5cblx0Ly8gdGhlIG1hdGNoaW5nIHVucmVmKCkgY2FsbCBpcyBpbiB6aXBmaWxlLmNsb3NlKClcblx0cmVhZGVyLnJlZigpO1xuXG5cdC8vIGVvY2RyIG1lYW5zIEVuZCBvZiBDZW50cmFsIERpcmVjdG9yeSBSZWNvcmQuXG5cdC8vIHNlYXJjaCBiYWNrd2FyZHMgZm9yIHRoZSBlb2NkciBzaWduYXR1cmUuXG5cdC8vIHRoZSBsYXN0IGZpZWxkIG9mIHRoZSBlb2NkciBpcyBhIHZhcmlhYmxlLWxlbmd0aCBjb21tZW50LlxuXHQvLyB0aGUgY29tbWVudCBzaXplIGlzIGVuY29kZWQgaW4gYSAyLWJ5dGUgZmllbGQgaW4gdGhlIGVvY2RyLCB3aGljaCB3ZSBjYW4ndCBmaW5kIHdpdGhvdXQgdHJ1ZGdpbmcgYmFja3dhcmRzIHRocm91Z2ggdGhlIGNvbW1lbnQgdG8gZmluZCBpdC5cblx0Ly8gYXMgYSBjb25zZXF1ZW5jZSBvZiB0aGlzIGRlc2lnbiBkZWNpc2lvbiwgaXQncyBwb3NzaWJsZSB0byBoYXZlIGFtYmlndW91cyB6aXAgZmlsZSBtZXRhZGF0YSBpZiBhIGNvaGVyZW50IGVvY2RyIHdhcyBpbiB0aGUgY29tbWVudC5cblx0Ly8gd2Ugc2VhcmNoIGJhY2t3YXJkcyBmb3IgYSBlb2NkciBzaWduYXR1cmUsIGFuZCBob3BlIHRoYXQgd2hvZXZlciBtYWRlIHRoZSB6aXAgZmlsZSB3YXMgc21hcnQgZW5vdWdoIHRvIGZvcmJpZCB0aGUgZW9jZHIgc2lnbmF0dXJlIGluIHRoZSBjb21tZW50LlxuXHR2YXIgZW9jZHJXaXRob3V0Q29tbWVudFNpemUgPSAyMjtcblx0dmFyIG1heENvbW1lbnRTaXplID0gMHhmZmZmOyAvLyAyLWJ5dGUgc2l6ZVxuXHR2YXIgYnVmZmVyU2l6ZSA9IE1hdGgubWluKGVvY2RyV2l0aG91dENvbW1lbnRTaXplICsgbWF4Q29tbWVudFNpemUsIHRvdGFsU2l6ZSk7XG5cdHZhciBidWZmZXIgPSBuZXdCdWZmZXIoYnVmZmVyU2l6ZSk7XG5cdHZhciBidWZmZXJSZWFkU3RhcnQgPSB0b3RhbFNpemUgLSBidWZmZXIubGVuZ3RoO1xuXHRyZWFkQW5kQXNzZXJ0Tm9Fb2YocmVhZGVyLCBidWZmZXIsIDAsIGJ1ZmZlclNpemUsIGJ1ZmZlclJlYWRTdGFydCwgZnVuY3Rpb24gKGVycikge1xuXHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdGZvciAodmFyIGkgPSBidWZmZXJTaXplIC0gZW9jZHJXaXRob3V0Q29tbWVudFNpemU7IGkgPj0gMDsgaSAtPSAxKSB7XG5cdFx0XHRpZiAoYnVmZmVyLnJlYWRVSW50MzJMRShpKSAhPT0gMHgwNjA1NGI1MCkgY29udGludWU7XG5cdFx0XHQvLyBmb3VuZCBlb2NkclxuXHRcdFx0dmFyIGVvY2RyQnVmZmVyID0gYnVmZmVyLnNsaWNlKGkpO1xuXG5cdFx0XHQvLyAwIC0gRW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHNpZ25hdHVyZSA9IDB4MDYwNTRiNTBcblx0XHRcdC8vIDQgLSBOdW1iZXIgb2YgdGhpcyBkaXNrXG5cdFx0XHR2YXIgZGlza051bWJlciA9IGVvY2RyQnVmZmVyLnJlYWRVSW50MTZMRSg0KTtcblx0XHRcdGlmIChkaXNrTnVtYmVyICE9PSAwKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJtdWx0aS1kaXNrIHppcCBmaWxlcyBhcmUgbm90IHN1cHBvcnRlZDogZm91bmQgZGlzayBudW1iZXI6IFwiICsgZGlza051bWJlcikpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gNiAtIERpc2sgd2hlcmUgY2VudHJhbCBkaXJlY3Rvcnkgc3RhcnRzXG5cdFx0XHQvLyA4IC0gTnVtYmVyIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZHMgb24gdGhpcyBkaXNrXG5cdFx0XHQvLyAxMCAtIFRvdGFsIG51bWJlciBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmRzXG5cdFx0XHR2YXIgZW50cnlDb3VudCA9IGVvY2RyQnVmZmVyLnJlYWRVSW50MTZMRSgxMCk7XG5cdFx0XHQvLyAxMiAtIFNpemUgb2YgY2VudHJhbCBkaXJlY3RvcnkgKGJ5dGVzKVxuXHRcdFx0Ly8gMTYgLSBPZmZzZXQgb2Ygc3RhcnQgb2YgY2VudHJhbCBkaXJlY3RvcnksIHJlbGF0aXZlIHRvIHN0YXJ0IG9mIGFyY2hpdmVcblx0XHRcdHZhciBjZW50cmFsRGlyZWN0b3J5T2Zmc2V0ID0gZW9jZHJCdWZmZXIucmVhZFVJbnQzMkxFKDE2KTtcblx0XHRcdC8vIDIwIC0gQ29tbWVudCBsZW5ndGhcblx0XHRcdHZhciBjb21tZW50TGVuZ3RoID0gZW9jZHJCdWZmZXIucmVhZFVJbnQxNkxFKDIwKTtcblx0XHRcdHZhciBleHBlY3RlZENvbW1lbnRMZW5ndGggPSBlb2NkckJ1ZmZlci5sZW5ndGggLSBlb2NkcldpdGhvdXRDb21tZW50U2l6ZTtcblx0XHRcdGlmIChjb21tZW50TGVuZ3RoICE9PSBleHBlY3RlZENvbW1lbnRMZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImludmFsaWQgY29tbWVudCBsZW5ndGguIGV4cGVjdGVkOiBcIiArIGV4cGVjdGVkQ29tbWVudExlbmd0aCArIFwiLiBmb3VuZDogXCIgKyBjb21tZW50TGVuZ3RoKSk7XG5cdFx0XHR9XG5cdFx0XHQvLyAyMiAtIENvbW1lbnRcblx0XHRcdC8vIHRoZSBlbmNvZGluZyBpcyBhbHdheXMgY3A0MzcuXG5cdFx0XHR2YXIgY29tbWVudCA9IGRlY29kZVN0cmluZ3MgPyBkZWNvZGVCdWZmZXIoZW9jZHJCdWZmZXIsIDIyLCBlb2NkckJ1ZmZlci5sZW5ndGgsIGZhbHNlKVxuXHRcdFx0XHQ6IGVvY2RyQnVmZmVyLnNsaWNlKDIyKTtcblxuXHRcdFx0aWYgKCEoZW50cnlDb3VudCA9PT0gMHhmZmZmIHx8IGNlbnRyYWxEaXJlY3RvcnlPZmZzZXQgPT09IDB4ZmZmZmZmZmYpKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCBuZXcgWmlwRmlsZShyZWFkZXIsIGNlbnRyYWxEaXJlY3RvcnlPZmZzZXQsIHRvdGFsU2l6ZSwgZW50cnlDb3VudCwgY29tbWVudCwgb3B0aW9ucy5hdXRvQ2xvc2UsIG9wdGlvbnMubGF6eUVudHJpZXMsIGRlY29kZVN0cmluZ3MsIG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzLCBvcHRpb25zLnN0cmljdEZpbGVOYW1lcykpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBaSVA2NCBmb3JtYXRcblxuXHRcdFx0Ly8gWklQNjQgWmlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IGxvY2F0b3Jcblx0XHRcdHZhciB6aXA2NEVvY2RsQnVmZmVyID0gbmV3QnVmZmVyKDIwKTtcblx0XHRcdHZhciB6aXA2NEVvY2RsT2Zmc2V0ID0gYnVmZmVyUmVhZFN0YXJ0ICsgaSAtIHppcDY0RW9jZGxCdWZmZXIubGVuZ3RoO1xuXHRcdFx0cmVhZEFuZEFzc2VydE5vRW9mKHJlYWRlciwgemlwNjRFb2NkbEJ1ZmZlciwgMCwgemlwNjRFb2NkbEJ1ZmZlci5sZW5ndGgsIHppcDY0RW9jZGxPZmZzZXQsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRcdFx0aWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cblx0XHRcdFx0Ly8gMCAtIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpciBsb2NhdG9yIHNpZ25hdHVyZSA9IDB4MDcwNjRiNTBcblx0XHRcdFx0aWYgKHppcDY0RW9jZGxCdWZmZXIucmVhZFVJbnQzMkxFKDApICE9PSAweDA3MDY0YjUwKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImludmFsaWQgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IGxvY2F0b3Igc2lnbmF0dXJlXCIpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyA0IC0gbnVtYmVyIG9mIHRoZSBkaXNrIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3Rvcnlcblx0XHRcdFx0Ly8gOCAtIHJlbGF0aXZlIG9mZnNldCBvZiB0aGUgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZFxuXHRcdFx0XHR2YXIgemlwNjRFb2Nkck9mZnNldCA9IHJlYWRVSW50NjRMRSh6aXA2NEVvY2RsQnVmZmVyLCA4KTtcblx0XHRcdFx0Ly8gMTYgLSB0b3RhbCBudW1iZXIgb2YgZGlza3NcblxuXHRcdFx0XHQvLyBaSVA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3JkXG5cdFx0XHRcdHZhciB6aXA2NEVvY2RyQnVmZmVyID0gbmV3QnVmZmVyKDU2KTtcblx0XHRcdFx0cmVhZEFuZEFzc2VydE5vRW9mKHJlYWRlciwgemlwNjRFb2NkckJ1ZmZlciwgMCwgemlwNjRFb2NkckJ1ZmZlci5sZW5ndGgsIHppcDY0RW9jZHJPZmZzZXQsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRcdFx0XHRpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblxuXHRcdFx0XHRcdC8vIDAgLSB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXIgc2lnbmF0dXJlICAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlcyAgKDB4MDYwNjRiNTApXG5cdFx0XHRcdFx0aWYgKHppcDY0RW9jZHJCdWZmZXIucmVhZFVJbnQzMkxFKDApICE9PSAweDA2MDY0YjUwKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiaW52YWxpZCB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3JkIHNpZ25hdHVyZVwiKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIDQgLSBzaXplIG9mIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmQgICAgICAgICAgICAgICAgOCBieXRlc1xuXHRcdFx0XHRcdC8vIDEyIC0gdmVyc2lvbiBtYWRlIGJ5ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMiBieXRlc1xuXHRcdFx0XHRcdC8vIDE0IC0gdmVyc2lvbiBuZWVkZWQgdG8gZXh0cmFjdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMiBieXRlc1xuXHRcdFx0XHRcdC8vIDE2IC0gbnVtYmVyIG9mIHRoaXMgZGlzayAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRcdFx0XHRcdC8vIDIwIC0gbnVtYmVyIG9mIHRoZSBkaXNrIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgNCBieXRlc1xuXHRcdFx0XHRcdC8vIDI0IC0gdG90YWwgbnVtYmVyIG9mIGVudHJpZXMgaW4gdGhlIGNlbnRyYWwgZGlyZWN0b3J5IG9uIHRoaXMgZGlzayAgICAgICAgIDggYnl0ZXNcblx0XHRcdFx0XHQvLyAzMiAtIHRvdGFsIG51bWJlciBvZiBlbnRyaWVzIGluIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgICAgICAgICAgIDggYnl0ZXNcblx0XHRcdFx0XHRlbnRyeUNvdW50ID0gcmVhZFVJbnQ2NExFKHppcDY0RW9jZHJCdWZmZXIsIDMyKTtcblx0XHRcdFx0XHQvLyA0MCAtIHNpemUgb2YgdGhlIGNlbnRyYWwgZGlyZWN0b3J5ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDggYnl0ZXNcblx0XHRcdFx0XHQvLyA0OCAtIG9mZnNldCBvZiBzdGFydCBvZiBjZW50cmFsIGRpcmVjdG9yeSB3aXRoIHJlc3BlY3QgdG8gdGhlIHN0YXJ0aW5nIGRpc2sgbnVtYmVyICAgICA4IGJ5dGVzXG5cdFx0XHRcdFx0Y2VudHJhbERpcmVjdG9yeU9mZnNldCA9IHJlYWRVSW50NjRMRSh6aXA2NEVvY2RyQnVmZmVyLCA0OCk7XG5cdFx0XHRcdFx0Ly8gNTYgLSB6aXA2NCBleHRlbnNpYmxlIGRhdGEgc2VjdG9yICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodmFyaWFibGUgc2l6ZSlcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgbmV3IFppcEZpbGUocmVhZGVyLCBjZW50cmFsRGlyZWN0b3J5T2Zmc2V0LCB0b3RhbFNpemUsIGVudHJ5Q291bnQsIGNvbW1lbnQsIG9wdGlvbnMuYXV0b0Nsb3NlLCBvcHRpb25zLmxhenlFbnRyaWVzLCBkZWNvZGVTdHJpbmdzLCBvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcywgb3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMpKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y2FsbGJhY2sobmV3IEVycm9yKFwiZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZCBzaWduYXR1cmUgbm90IGZvdW5kXCIpKTtcblx0fSk7XG59XG5cbnV0aWwuaW5oZXJpdHMoWmlwRmlsZSwgRXZlbnRFbWl0dGVyKTtcblxuZnVuY3Rpb24gWmlwRmlsZShyZWFkZXIsIGNlbnRyYWxEaXJlY3RvcnlPZmZzZXQsIGZpbGVTaXplLCBlbnRyeUNvdW50LCBjb21tZW50LCBhdXRvQ2xvc2UsIGxhenlFbnRyaWVzLCBkZWNvZGVTdHJpbmdzLCB2YWxpZGF0ZUVudHJ5U2l6ZXMsIHN0cmljdEZpbGVOYW1lcykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdEV2ZW50RW1pdHRlci5jYWxsKHNlbGYpO1xuXHRzZWxmLnJlYWRlciA9IHJlYWRlcjtcblx0Ly8gZm9yd2FyZCBjbG9zZSBldmVudHNcblx0c2VsZi5yZWFkZXIub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0Ly8gZXJyb3IgY2xvc2luZyB0aGUgZmRcblx0XHRlbWl0RXJyb3Ioc2VsZiwgZXJyKTtcblx0fSk7XG5cdHNlbGYucmVhZGVyLm9uY2UoXCJjbG9zZVwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0c2VsZi5lbWl0KFwiY2xvc2VcIik7XG5cdH0pO1xuXHRzZWxmLnJlYWRFbnRyeUN1cnNvciA9IGNlbnRyYWxEaXJlY3RvcnlPZmZzZXQ7XG5cdHNlbGYuZmlsZVNpemUgPSBmaWxlU2l6ZTtcblx0c2VsZi5lbnRyeUNvdW50ID0gZW50cnlDb3VudDtcblx0c2VsZi5jb21tZW50ID0gY29tbWVudDtcblx0c2VsZi5lbnRyaWVzUmVhZCA9IDA7XG5cdHNlbGYuYXV0b0Nsb3NlID0gISFhdXRvQ2xvc2U7XG5cdHNlbGYubGF6eUVudHJpZXMgPSAhIWxhenlFbnRyaWVzO1xuXHRzZWxmLmRlY29kZVN0cmluZ3MgPSAhIWRlY29kZVN0cmluZ3M7XG5cdHNlbGYudmFsaWRhdGVFbnRyeVNpemVzID0gISF2YWxpZGF0ZUVudHJ5U2l6ZXM7XG5cdHNlbGYuc3RyaWN0RmlsZU5hbWVzID0gISFzdHJpY3RGaWxlTmFtZXM7XG5cdHNlbGYuaXNPcGVuID0gdHJ1ZTtcblx0c2VsZi5lbWl0dGVkRXJyb3IgPSBmYWxzZTtcblxuXHRpZiAoIXNlbGYubGF6eUVudHJpZXMpIHNlbGYuX3JlYWRFbnRyeSgpO1xufVxuXG5aaXBGaWxlLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKCF0aGlzLmlzT3BlbikgcmV0dXJuO1xuXHR0aGlzLmlzT3BlbiA9IGZhbHNlO1xuXHR0aGlzLnJlYWRlci51bnJlZigpO1xufTtcblxuZnVuY3Rpb24gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIGVycikge1xuXHRpZiAoc2VsZi5hdXRvQ2xvc2UpIHNlbGYuY2xvc2UoKTtcblx0ZW1pdEVycm9yKHNlbGYsIGVycik7XG59XG5cbmZ1bmN0aW9uIGVtaXRFcnJvcihzZWxmLCBlcnIpIHtcblx0aWYgKHNlbGYuZW1pdHRlZEVycm9yKSByZXR1cm47XG5cdHNlbGYuZW1pdHRlZEVycm9yID0gdHJ1ZTtcblx0c2VsZi5lbWl0KFwiZXJyb3JcIiwgZXJyKTtcbn1cblxuWmlwRmlsZS5wcm90b3R5cGUucmVhZEVudHJ5ID0gZnVuY3Rpb24gKCkge1xuXHRpZiAoIXRoaXMubGF6eUVudHJpZXMpIHRocm93IG5ldyBFcnJvcihcInJlYWRFbnRyeSgpIGNhbGxlZCB3aXRob3V0IGxhenlFbnRyaWVzOnRydWVcIik7XG5cdHRoaXMuX3JlYWRFbnRyeSgpO1xufTtcblppcEZpbGUucHJvdG90eXBlLl9yZWFkRW50cnkgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0aWYgKHNlbGYuZW50cnlDb3VudCA9PT0gc2VsZi5lbnRyaWVzUmVhZCkge1xuXHRcdC8vIGRvbmUgd2l0aCBtZXRhZGF0YVxuXHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoc2VsZi5hdXRvQ2xvc2UpIHNlbGYuY2xvc2UoKTtcblx0XHRcdGlmIChzZWxmLmVtaXR0ZWRFcnJvcikgcmV0dXJuO1xuXHRcdFx0c2VsZi5lbWl0KFwiZW5kXCIpO1xuXHRcdH0pO1xuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoc2VsZi5lbWl0dGVkRXJyb3IpIHJldHVybjtcblx0dmFyIGJ1ZmZlciA9IG5ld0J1ZmZlcig0Nik7XG5cdHJlYWRBbmRBc3NlcnROb0VvZihzZWxmLnJlYWRlciwgYnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoLCBzZWxmLnJlYWRFbnRyeUN1cnNvciwgZnVuY3Rpb24gKGVycikge1xuXHRcdGlmIChlcnIpIHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgZXJyKTtcblx0XHRpZiAoc2VsZi5lbWl0dGVkRXJyb3IpIHJldHVybjtcblx0XHR2YXIgZW50cnkgPSBuZXcgRW50cnkoKTtcblx0XHQvLyAwIC0gQ2VudHJhbCBkaXJlY3RvcnkgZmlsZSBoZWFkZXIgc2lnbmF0dXJlXG5cdFx0dmFyIHNpZ25hdHVyZSA9IGJ1ZmZlci5yZWFkVUludDMyTEUoMCk7XG5cdFx0aWYgKHNpZ25hdHVyZSAhPT0gMHgwMjAxNGI1MCkgcmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IoXCJpbnZhbGlkIGNlbnRyYWwgZGlyZWN0b3J5IGZpbGUgaGVhZGVyIHNpZ25hdHVyZTogMHhcIiArIHNpZ25hdHVyZS50b1N0cmluZygxNikpKTtcblx0XHQvLyA0IC0gVmVyc2lvbiBtYWRlIGJ5XG5cdFx0ZW50cnkudmVyc2lvbk1hZGVCeSA9IGJ1ZmZlci5yZWFkVUludDE2TEUoNCk7XG5cdFx0Ly8gNiAtIFZlcnNpb24gbmVlZGVkIHRvIGV4dHJhY3QgKG1pbmltdW0pXG5cdFx0ZW50cnkudmVyc2lvbk5lZWRlZFRvRXh0cmFjdCA9IGJ1ZmZlci5yZWFkVUludDE2TEUoNik7XG5cdFx0Ly8gOCAtIEdlbmVyYWwgcHVycG9zZSBiaXQgZmxhZ1xuXHRcdGVudHJ5LmdlbmVyYWxQdXJwb3NlQml0RmxhZyA9IGJ1ZmZlci5yZWFkVUludDE2TEUoOCk7XG5cdFx0Ly8gMTAgLSBDb21wcmVzc2lvbiBtZXRob2Rcblx0XHRlbnRyeS5jb21wcmVzc2lvbk1ldGhvZCA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMTApO1xuXHRcdC8vIDEyIC0gRmlsZSBsYXN0IG1vZGlmaWNhdGlvbiB0aW1lXG5cdFx0ZW50cnkubGFzdE1vZEZpbGVUaW1lID0gYnVmZmVyLnJlYWRVSW50MTZMRSgxMik7XG5cdFx0Ly8gMTQgLSBGaWxlIGxhc3QgbW9kaWZpY2F0aW9uIGRhdGVcblx0XHRlbnRyeS5sYXN0TW9kRmlsZURhdGUgPSBidWZmZXIucmVhZFVJbnQxNkxFKDE0KTtcblx0XHQvLyAxNiAtIENSQy0zMlxuXHRcdGVudHJ5LmNyYzMyID0gYnVmZmVyLnJlYWRVSW50MzJMRSgxNik7XG5cdFx0Ly8gMjAgLSBDb21wcmVzc2VkIHNpemVcblx0XHRlbnRyeS5jb21wcmVzc2VkU2l6ZSA9IGJ1ZmZlci5yZWFkVUludDMyTEUoMjApO1xuXHRcdC8vIDI0IC0gVW5jb21wcmVzc2VkIHNpemVcblx0XHRlbnRyeS51bmNvbXByZXNzZWRTaXplID0gYnVmZmVyLnJlYWRVSW50MzJMRSgyNCk7XG5cdFx0Ly8gMjggLSBGaWxlIG5hbWUgbGVuZ3RoIChuKVxuXHRcdGVudHJ5LmZpbGVOYW1lTGVuZ3RoID0gYnVmZmVyLnJlYWRVSW50MTZMRSgyOCk7XG5cdFx0Ly8gMzAgLSBFeHRyYSBmaWVsZCBsZW5ndGggKG0pXG5cdFx0ZW50cnkuZXh0cmFGaWVsZExlbmd0aCA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMzApO1xuXHRcdC8vIDMyIC0gRmlsZSBjb21tZW50IGxlbmd0aCAoaylcblx0XHRlbnRyeS5maWxlQ29tbWVudExlbmd0aCA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMzIpO1xuXHRcdC8vIDM0IC0gRGlzayBudW1iZXIgd2hlcmUgZmlsZSBzdGFydHNcblx0XHQvLyAzNiAtIEludGVybmFsIGZpbGUgYXR0cmlidXRlc1xuXHRcdGVudHJ5LmludGVybmFsRmlsZUF0dHJpYnV0ZXMgPSBidWZmZXIucmVhZFVJbnQxNkxFKDM2KTtcblx0XHQvLyAzOCAtIEV4dGVybmFsIGZpbGUgYXR0cmlidXRlc1xuXHRcdGVudHJ5LmV4dGVybmFsRmlsZUF0dHJpYnV0ZXMgPSBidWZmZXIucmVhZFVJbnQzMkxFKDM4KTtcblx0XHQvLyA0MiAtIFJlbGF0aXZlIG9mZnNldCBvZiBsb2NhbCBmaWxlIGhlYWRlclxuXHRcdGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9IGJ1ZmZlci5yZWFkVUludDMyTEUoNDIpO1xuXG5cdFx0aWYgKGVudHJ5LmdlbmVyYWxQdXJwb3NlQml0RmxhZyAmIDB4NDApIHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKFwic3Ryb25nIGVuY3J5cHRpb24gaXMgbm90IHN1cHBvcnRlZFwiKSk7XG5cblx0XHRzZWxmLnJlYWRFbnRyeUN1cnNvciArPSA0NjtcblxuXHRcdGJ1ZmZlciA9IG5ld0J1ZmZlcihlbnRyeS5maWxlTmFtZUxlbmd0aCArIGVudHJ5LmV4dHJhRmllbGRMZW5ndGggKyBlbnRyeS5maWxlQ29tbWVudExlbmd0aCk7XG5cdFx0cmVhZEFuZEFzc2VydE5vRW9mKHNlbGYucmVhZGVyLCBidWZmZXIsIDAsIGJ1ZmZlci5sZW5ndGgsIHNlbGYucmVhZEVudHJ5Q3Vyc29yLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRpZiAoZXJyKSByZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIGVycik7XG5cdFx0XHRpZiAoc2VsZi5lbWl0dGVkRXJyb3IpIHJldHVybjtcblx0XHRcdC8vIDQ2IC0gRmlsZSBuYW1lXG5cdFx0XHR2YXIgaXNVdGY4ID0gKGVudHJ5LmdlbmVyYWxQdXJwb3NlQml0RmxhZyAmIDB4ODAwKSAhPT0gMDtcblx0XHRcdGVudHJ5LmZpbGVOYW1lID0gc2VsZi5kZWNvZGVTdHJpbmdzID8gZGVjb2RlQnVmZmVyKGJ1ZmZlciwgMCwgZW50cnkuZmlsZU5hbWVMZW5ndGgsIGlzVXRmOClcblx0XHRcdFx0OiBidWZmZXIuc2xpY2UoMCwgZW50cnkuZmlsZU5hbWVMZW5ndGgpO1xuXG5cdFx0XHQvLyA0NituIC0gRXh0cmEgZmllbGRcblx0XHRcdHZhciBmaWxlQ29tbWVudFN0YXJ0ID0gZW50cnkuZmlsZU5hbWVMZW5ndGggKyBlbnRyeS5leHRyYUZpZWxkTGVuZ3RoO1xuXHRcdFx0dmFyIGV4dHJhRmllbGRCdWZmZXIgPSBidWZmZXIuc2xpY2UoZW50cnkuZmlsZU5hbWVMZW5ndGgsIGZpbGVDb21tZW50U3RhcnQpO1xuXHRcdFx0ZW50cnkuZXh0cmFGaWVsZHMgPSBbXTtcblx0XHRcdHZhciBpID0gMDtcblx0XHRcdHdoaWxlIChpIDwgZXh0cmFGaWVsZEJ1ZmZlci5sZW5ndGggLSAzKSB7XG5cdFx0XHRcdHZhciBoZWFkZXJJZCA9IGV4dHJhRmllbGRCdWZmZXIucmVhZFVJbnQxNkxFKGkgKyAwKTtcblx0XHRcdFx0dmFyIGRhdGFTaXplID0gZXh0cmFGaWVsZEJ1ZmZlci5yZWFkVUludDE2TEUoaSArIDIpO1xuXHRcdFx0XHR2YXIgZGF0YVN0YXJ0ID0gaSArIDQ7XG5cdFx0XHRcdHZhciBkYXRhRW5kID0gZGF0YVN0YXJ0ICsgZGF0YVNpemU7XG5cdFx0XHRcdGlmIChkYXRhRW5kID4gZXh0cmFGaWVsZEJ1ZmZlci5sZW5ndGgpIHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKFwiZXh0cmEgZmllbGQgbGVuZ3RoIGV4Y2VlZHMgZXh0cmEgZmllbGQgYnVmZmVyIHNpemVcIikpO1xuXHRcdFx0XHR2YXIgZGF0YUJ1ZmZlciA9IG5ld0J1ZmZlcihkYXRhU2l6ZSk7XG5cdFx0XHRcdGV4dHJhRmllbGRCdWZmZXIuY29weShkYXRhQnVmZmVyLCAwLCBkYXRhU3RhcnQsIGRhdGFFbmQpO1xuXHRcdFx0XHRlbnRyeS5leHRyYUZpZWxkcy5wdXNoKHtcblx0XHRcdFx0XHRpZDogaGVhZGVySWQsXG5cdFx0XHRcdFx0ZGF0YTogZGF0YUJ1ZmZlcixcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGkgPSBkYXRhRW5kO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyA0NituK20gLSBGaWxlIGNvbW1lbnRcblx0XHRcdGVudHJ5LmZpbGVDb21tZW50ID0gc2VsZi5kZWNvZGVTdHJpbmdzID8gZGVjb2RlQnVmZmVyKGJ1ZmZlciwgZmlsZUNvbW1lbnRTdGFydCwgZmlsZUNvbW1lbnRTdGFydCArIGVudHJ5LmZpbGVDb21tZW50TGVuZ3RoLCBpc1V0ZjgpXG5cdFx0XHRcdDogYnVmZmVyLnNsaWNlKGZpbGVDb21tZW50U3RhcnQsIGZpbGVDb21tZW50U3RhcnQgKyBlbnRyeS5maWxlQ29tbWVudExlbmd0aCk7XG5cdFx0XHQvLyBjb21wYXRpYmlsaXR5IGhhY2sgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVqb3Nod29sZmUveWF1emwvaXNzdWVzLzQ3XG5cdFx0XHRlbnRyeS5jb21tZW50ID0gZW50cnkuZmlsZUNvbW1lbnQ7XG5cblx0XHRcdHNlbGYucmVhZEVudHJ5Q3Vyc29yICs9IGJ1ZmZlci5sZW5ndGg7XG5cdFx0XHRzZWxmLmVudHJpZXNSZWFkICs9IDE7XG5cblx0XHRcdGlmIChlbnRyeS51bmNvbXByZXNzZWRTaXplID09PSAweGZmZmZmZmZmIHx8XG5cdFx0XHRcdGVudHJ5LmNvbXByZXNzZWRTaXplID09PSAweGZmZmZmZmZmIHx8XG5cdFx0XHRcdGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9PT0gMHhmZmZmZmZmZikge1xuXHRcdFx0XHQvLyBaSVA2NCBmb3JtYXRcblx0XHRcdFx0Ly8gZmluZCB0aGUgWmlwNjQgRXh0ZW5kZWQgSW5mb3JtYXRpb24gRXh0cmEgRmllbGRcblx0XHRcdFx0dmFyIHppcDY0RWllZkJ1ZmZlciA9IG51bGw7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZW50cnkuZXh0cmFGaWVsZHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHR2YXIgZXh0cmFGaWVsZCA9IGVudHJ5LmV4dHJhRmllbGRzW2ldO1xuXHRcdFx0XHRcdGlmIChleHRyYUZpZWxkLmlkID09PSAweDAwMDEpIHtcblx0XHRcdFx0XHRcdHppcDY0RWllZkJ1ZmZlciA9IGV4dHJhRmllbGQuZGF0YTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoemlwNjRFaWVmQnVmZmVyID09IG51bGwpIHtcblx0XHRcdFx0XHRyZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihcImV4cGVjdGVkIHppcDY0IGV4dGVuZGVkIGluZm9ybWF0aW9uIGV4dHJhIGZpZWxkXCIpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgaW5kZXggPSAwO1xuXHRcdFx0XHQvLyAwIC0gT3JpZ2luYWwgU2l6ZSAgICAgICAgICA4IGJ5dGVzXG5cdFx0XHRcdGlmIChlbnRyeS51bmNvbXByZXNzZWRTaXplID09PSAweGZmZmZmZmZmKSB7XG5cdFx0XHRcdFx0aWYgKGluZGV4ICsgOCA+IHppcDY0RWllZkJ1ZmZlci5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKFwiemlwNjQgZXh0ZW5kZWQgaW5mb3JtYXRpb24gZXh0cmEgZmllbGQgZG9lcyBub3QgaW5jbHVkZSB1bmNvbXByZXNzZWQgc2l6ZVwiKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPSByZWFkVUludDY0TEUoemlwNjRFaWVmQnVmZmVyLCBpbmRleCk7XG5cdFx0XHRcdFx0aW5kZXggKz0gODtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyA4IC0gQ29tcHJlc3NlZCBTaXplICAgICAgICA4IGJ5dGVzXG5cdFx0XHRcdGlmIChlbnRyeS5jb21wcmVzc2VkU2l6ZSA9PT0gMHhmZmZmZmZmZikge1xuXHRcdFx0XHRcdGlmIChpbmRleCArIDggPiB6aXA2NEVpZWZCdWZmZXIubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihcInppcDY0IGV4dGVuZGVkIGluZm9ybWF0aW9uIGV4dHJhIGZpZWxkIGRvZXMgbm90IGluY2x1ZGUgY29tcHJlc3NlZCBzaXplXCIpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZW50cnkuY29tcHJlc3NlZFNpemUgPSByZWFkVUludDY0TEUoemlwNjRFaWVmQnVmZmVyLCBpbmRleCk7XG5cdFx0XHRcdFx0aW5kZXggKz0gODtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyAxNiAtIFJlbGF0aXZlIEhlYWRlciBPZmZzZXQgOCBieXRlc1xuXHRcdFx0XHRpZiAoZW50cnkucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID09PSAweGZmZmZmZmZmKSB7XG5cdFx0XHRcdFx0aWYgKGluZGV4ICsgOCA+IHppcDY0RWllZkJ1ZmZlci5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKFwiemlwNjQgZXh0ZW5kZWQgaW5mb3JtYXRpb24gZXh0cmEgZmllbGQgZG9lcyBub3QgaW5jbHVkZSByZWxhdGl2ZSBoZWFkZXIgb2Zmc2V0XCIpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZW50cnkucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID0gcmVhZFVJbnQ2NExFKHppcDY0RWllZkJ1ZmZlciwgaW5kZXgpO1xuXHRcdFx0XHRcdGluZGV4ICs9IDg7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gMjQgLSBEaXNrIFN0YXJ0IE51bWJlciAgICAgIDQgYnl0ZXNcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2hlY2sgZm9yIEluZm8tWklQIFVuaWNvZGUgUGF0aCBFeHRyYSBGaWVsZCAoMHg3MDc1KVxuXHRcdFx0Ly8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVqb3Nod29sZmUveWF1emwvaXNzdWVzLzMzXG5cdFx0XHRpZiAoc2VsZi5kZWNvZGVTdHJpbmdzKSB7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZW50cnkuZXh0cmFGaWVsZHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHR2YXIgZXh0cmFGaWVsZCA9IGVudHJ5LmV4dHJhRmllbGRzW2ldO1xuXHRcdFx0XHRcdGlmIChleHRyYUZpZWxkLmlkID09PSAweDcwNzUpIHtcblx0XHRcdFx0XHRcdGlmIChleHRyYUZpZWxkLmRhdGEubGVuZ3RoIDwgNikge1xuXHRcdFx0XHRcdFx0XHQvLyB0b28gc2hvcnQgdG8gYmUgbWVhbmluZ2Z1bFxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIFZlcnNpb24gICAgICAgMSBieXRlICAgICAgdmVyc2lvbiBvZiB0aGlzIGV4dHJhIGZpZWxkLCBjdXJyZW50bHkgMVxuXHRcdFx0XHRcdFx0aWYgKGV4dHJhRmllbGQuZGF0YS5yZWFkVUludDgoMCkgIT09IDEpIHtcblx0XHRcdFx0XHRcdFx0Ly8gPiBDaGFuZ2VzIG1heSBub3QgYmUgYmFja3dhcmQgY29tcGF0aWJsZSBzbyB0aGlzIGV4dHJhXG5cdFx0XHRcdFx0XHRcdC8vID4gZmllbGQgc2hvdWxkIG5vdCBiZSB1c2VkIGlmIHRoZSB2ZXJzaW9uIGlzIG5vdCByZWNvZ25pemVkLlxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIE5hbWVDUkMzMiAgICAgNCBieXRlcyAgICAgRmlsZSBOYW1lIEZpZWxkIENSQzMyIENoZWNrc3VtXG5cdFx0XHRcdFx0XHR2YXIgb2xkTmFtZUNyYzMyID0gZXh0cmFGaWVsZC5kYXRhLnJlYWRVSW50MzJMRSgxKTtcblx0XHRcdFx0XHRcdGlmIChjcmMzMi51bnNpZ25lZChidWZmZXIuc2xpY2UoMCwgZW50cnkuZmlsZU5hbWVMZW5ndGgpKSAhPT0gb2xkTmFtZUNyYzMyKSB7XG5cdFx0XHRcdFx0XHRcdC8vID4gSWYgdGhlIENSQyBjaGVjayBmYWlscywgdGhpcyBVVEYtOCBQYXRoIEV4dHJhIEZpZWxkIHNob3VsZCBiZVxuXHRcdFx0XHRcdFx0XHQvLyA+IGlnbm9yZWQgYW5kIHRoZSBGaWxlIE5hbWUgZmllbGQgaW4gdGhlIGhlYWRlciBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkLlxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIFVuaWNvZGVOYW1lICAgVmFyaWFibGUgICAgVVRGLTggdmVyc2lvbiBvZiB0aGUgZW50cnkgRmlsZSBOYW1lXG5cdFx0XHRcdFx0XHRlbnRyeS5maWxlTmFtZSA9IGRlY29kZUJ1ZmZlcihleHRyYUZpZWxkLmRhdGEsIDUsIGV4dHJhRmllbGQuZGF0YS5sZW5ndGgsIHRydWUpO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIHZhbGlkYXRlIGZpbGUgc2l6ZVxuXHRcdFx0aWYgKHNlbGYudmFsaWRhdGVFbnRyeVNpemVzICYmIGVudHJ5LmNvbXByZXNzaW9uTWV0aG9kID09PSAwKSB7XG5cdFx0XHRcdHZhciBleHBlY3RlZENvbXByZXNzZWRTaXplID0gZW50cnkudW5jb21wcmVzc2VkU2l6ZTtcblx0XHRcdFx0aWYgKGVudHJ5LmlzRW5jcnlwdGVkKCkpIHtcblx0XHRcdFx0XHQvLyB0cmFkaXRpb25hbCBlbmNyeXB0aW9uIHByZWZpeGVzIHRoZSBmaWxlIGRhdGEgd2l0aCBhIGhlYWRlclxuXHRcdFx0XHRcdGV4cGVjdGVkQ29tcHJlc3NlZFNpemUgKz0gMTI7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGVudHJ5LmNvbXByZXNzZWRTaXplICE9PSBleHBlY3RlZENvbXByZXNzZWRTaXplKSB7XG5cdFx0XHRcdFx0dmFyIG1zZyA9IFwiY29tcHJlc3NlZC91bmNvbXByZXNzZWQgc2l6ZSBtaXNtYXRjaCBmb3Igc3RvcmVkIGZpbGU6IFwiICsgZW50cnkuY29tcHJlc3NlZFNpemUgKyBcIiAhPSBcIiArIGVudHJ5LnVuY29tcHJlc3NlZFNpemU7XG5cdFx0XHRcdFx0cmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IobXNnKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKHNlbGYuZGVjb2RlU3RyaW5ncykge1xuXHRcdFx0XHRpZiAoIXNlbGYuc3RyaWN0RmlsZU5hbWVzKSB7XG5cdFx0XHRcdFx0Ly8gYWxsb3cgYmFja3NsYXNoXG5cdFx0XHRcdFx0ZW50cnkuZmlsZU5hbWUgPSBlbnRyeS5maWxlTmFtZS5yZXBsYWNlKC9cXFxcL2csIFwiL1wiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgZXJyb3JNZXNzYWdlID0gdmFsaWRhdGVGaWxlTmFtZShlbnRyeS5maWxlTmFtZSwgc2VsZi52YWxpZGF0ZUZpbGVOYW1lT3B0aW9ucyk7XG5cdFx0XHRcdGlmIChlcnJvck1lc3NhZ2UgIT0gbnVsbCkgcmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IoZXJyb3JNZXNzYWdlKSk7XG5cdFx0XHR9XG5cdFx0XHRzZWxmLmVtaXQoXCJlbnRyeVwiLCBlbnRyeSk7XG5cblx0XHRcdGlmICghc2VsZi5sYXp5RW50cmllcykgc2VsZi5fcmVhZEVudHJ5KCk7XG5cdFx0fSk7XG5cdH0pO1xufTtcblxuWmlwRmlsZS5wcm90b3R5cGUub3BlblJlYWRTdHJlYW0gPSBmdW5jdGlvbiAoZW50cnksIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0Ly8gcGFyYW1ldGVyIHZhbGlkYXRpb25cblx0dmFyIHJlbGF0aXZlU3RhcnQgPSAwO1xuXHR2YXIgcmVsYXRpdmVFbmQgPSBlbnRyeS5jb21wcmVzc2VkU2l6ZTtcblx0aWYgKGNhbGxiYWNrID09IG51bGwpIHtcblx0XHRjYWxsYmFjayA9IG9wdGlvbnM7XG5cdFx0b3B0aW9ucyA9IHt9O1xuXHR9IGVsc2Uge1xuXHRcdC8vIHZhbGlkYXRlIG9wdGlvbnMgdGhhdCB0aGUgY2FsbGVyIGhhcyBubyBleGN1c2UgdG8gZ2V0IHdyb25nXG5cdFx0aWYgKG9wdGlvbnMuZGVjcnlwdCAhPSBudWxsKSB7XG5cdFx0XHRpZiAoIWVudHJ5LmlzRW5jcnlwdGVkKCkpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5kZWNyeXB0IGNhbiBvbmx5IGJlIHNwZWNpZmllZCBmb3IgZW5jcnlwdGVkIGVudHJpZXNcIik7XG5cdFx0XHR9XG5cdFx0XHRpZiAob3B0aW9ucy5kZWNyeXB0ICE9PSBmYWxzZSkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBvcHRpb25zLmRlY3J5cHQgdmFsdWU6IFwiICsgb3B0aW9ucy5kZWNyeXB0KTtcblx0XHRcdGlmIChlbnRyeS5pc0NvbXByZXNzZWQoKSkge1xuXHRcdFx0XHRpZiAob3B0aW9ucy5kZWNvbXByZXNzICE9PSBmYWxzZSkgdGhyb3cgbmV3IEVycm9yKFwiZW50cnkgaXMgZW5jcnlwdGVkIGFuZCBjb21wcmVzc2VkLCBhbmQgb3B0aW9ucy5kZWNvbXByZXNzICE9PSBmYWxzZVwiKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMuZGVjb21wcmVzcyAhPSBudWxsKSB7XG5cdFx0XHRpZiAoIWVudHJ5LmlzQ29tcHJlc3NlZCgpKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuZGVjb21wcmVzcyBjYW4gb25seSBiZSBzcGVjaWZpZWQgZm9yIGNvbXByZXNzZWQgZW50cmllc1wiKTtcblx0XHRcdH1cblx0XHRcdGlmICghKG9wdGlvbnMuZGVjb21wcmVzcyA9PT0gZmFsc2UgfHwgb3B0aW9ucy5kZWNvbXByZXNzID09PSB0cnVlKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIG9wdGlvbnMuZGVjb21wcmVzcyB2YWx1ZTogXCIgKyBvcHRpb25zLmRlY29tcHJlc3MpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAob3B0aW9ucy5zdGFydCAhPSBudWxsIHx8IG9wdGlvbnMuZW5kICE9IG51bGwpIHtcblx0XHRcdGlmIChlbnRyeS5pc0NvbXByZXNzZWQoKSAmJiBvcHRpb25zLmRlY29tcHJlc3MgIT09IGZhbHNlKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcInN0YXJ0L2VuZCByYW5nZSBub3QgYWxsb3dlZCBmb3IgY29tcHJlc3NlZCBlbnRyeSB3aXRob3V0IG9wdGlvbnMuZGVjb21wcmVzcyA9PT0gZmFsc2VcIik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoZW50cnkuaXNFbmNyeXB0ZWQoKSAmJiBvcHRpb25zLmRlY3J5cHQgIT09IGZhbHNlKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcInN0YXJ0L2VuZCByYW5nZSBub3QgYWxsb3dlZCBmb3IgZW5jcnlwdGVkIGVudHJ5IHdpdGhvdXQgb3B0aW9ucy5kZWNyeXB0ID09PSBmYWxzZVwiKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMuc3RhcnQgIT0gbnVsbCkge1xuXHRcdFx0cmVsYXRpdmVTdGFydCA9IG9wdGlvbnMuc3RhcnQ7XG5cdFx0XHRpZiAocmVsYXRpdmVTdGFydCA8IDApIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuc3RhcnQgPCAwXCIpO1xuXHRcdFx0aWYgKHJlbGF0aXZlU3RhcnQgPiBlbnRyeS5jb21wcmVzc2VkU2l6ZSkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5zdGFydCA+IGVudHJ5LmNvbXByZXNzZWRTaXplXCIpO1xuXHRcdH1cblx0XHRpZiAob3B0aW9ucy5lbmQgIT0gbnVsbCkge1xuXHRcdFx0cmVsYXRpdmVFbmQgPSBvcHRpb25zLmVuZDtcblx0XHRcdGlmIChyZWxhdGl2ZUVuZCA8IDApIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuZW5kIDwgMFwiKTtcblx0XHRcdGlmIChyZWxhdGl2ZUVuZCA+IGVudHJ5LmNvbXByZXNzZWRTaXplKSB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLmVuZCA+IGVudHJ5LmNvbXByZXNzZWRTaXplXCIpO1xuXHRcdFx0aWYgKHJlbGF0aXZlRW5kIDwgcmVsYXRpdmVTdGFydCkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5lbmQgPCBvcHRpb25zLnN0YXJ0XCIpO1xuXHRcdH1cblx0fVxuXHQvLyBhbnkgZnVydGhlciBlcnJvcnMgY2FuIGVpdGhlciBiZSBjYXVzZWQgYnkgdGhlIHppcGZpbGUsXG5cdC8vIG9yIHdlcmUgaW50cm9kdWNlZCBpbiBhIG1pbm9yIHZlcnNpb24gb2YgeWF1emwsXG5cdC8vIHNvIHNob3VsZCBiZSBwYXNzZWQgdG8gdGhlIGNsaWVudCByYXRoZXIgdGhhbiB0aHJvd24uXG5cdGlmICghc2VsZi5pc09wZW4pIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJjbG9zZWRcIikpO1xuXHRpZiAoZW50cnkuaXNFbmNyeXB0ZWQoKSkge1xuXHRcdGlmIChvcHRpb25zLmRlY3J5cHQgIT09IGZhbHNlKSByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiZW50cnkgaXMgZW5jcnlwdGVkLCBhbmQgb3B0aW9ucy5kZWNyeXB0ICE9PSBmYWxzZVwiKSk7XG5cdH1cblx0Ly8gbWFrZSBzdXJlIHdlIGRvbid0IGxvc2UgdGhlIGZkIGJlZm9yZSB3ZSBvcGVuIHRoZSBhY3R1YWwgcmVhZCBzdHJlYW1cblx0c2VsZi5yZWFkZXIucmVmKCk7XG5cdHZhciBidWZmZXIgPSBuZXdCdWZmZXIoMzApO1xuXHRyZWFkQW5kQXNzZXJ0Tm9Fb2Yoc2VsZi5yZWFkZXIsIGJ1ZmZlciwgMCwgYnVmZmVyLmxlbmd0aCwgZW50cnkucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0Ly8gMCAtIExvY2FsIGZpbGUgaGVhZGVyIHNpZ25hdHVyZSA9IDB4MDQwMzRiNTBcblx0XHRcdHZhciBzaWduYXR1cmUgPSBidWZmZXIucmVhZFVJbnQzMkxFKDApO1xuXHRcdFx0aWYgKHNpZ25hdHVyZSAhPT0gMHgwNDAzNGI1MCkge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiaW52YWxpZCBsb2NhbCBmaWxlIGhlYWRlciBzaWduYXR1cmU6IDB4XCIgKyBzaWduYXR1cmUudG9TdHJpbmcoMTYpKSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBhbGwgdGhpcyBzaG91bGQgYmUgcmVkdW5kYW50XG5cdFx0XHQvLyA0IC0gVmVyc2lvbiBuZWVkZWQgdG8gZXh0cmFjdCAobWluaW11bSlcblx0XHRcdC8vIDYgLSBHZW5lcmFsIHB1cnBvc2UgYml0IGZsYWdcblx0XHRcdC8vIDggLSBDb21wcmVzc2lvbiBtZXRob2Rcblx0XHRcdC8vIDEwIC0gRmlsZSBsYXN0IG1vZGlmaWNhdGlvbiB0aW1lXG5cdFx0XHQvLyAxMiAtIEZpbGUgbGFzdCBtb2RpZmljYXRpb24gZGF0ZVxuXHRcdFx0Ly8gMTQgLSBDUkMtMzJcblx0XHRcdC8vIDE4IC0gQ29tcHJlc3NlZCBzaXplXG5cdFx0XHQvLyAyMiAtIFVuY29tcHJlc3NlZCBzaXplXG5cdFx0XHQvLyAyNiAtIEZpbGUgbmFtZSBsZW5ndGggKG4pXG5cdFx0XHR2YXIgZmlsZU5hbWVMZW5ndGggPSBidWZmZXIucmVhZFVJbnQxNkxFKDI2KTtcblx0XHRcdC8vIDI4IC0gRXh0cmEgZmllbGQgbGVuZ3RoIChtKVxuXHRcdFx0dmFyIGV4dHJhRmllbGRMZW5ndGggPSBidWZmZXIucmVhZFVJbnQxNkxFKDI4KTtcblx0XHRcdC8vIDMwIC0gRmlsZSBuYW1lXG5cdFx0XHQvLyAzMCtuIC0gRXh0cmEgZmllbGRcblx0XHRcdHZhciBsb2NhbEZpbGVIZWFkZXJFbmQgPSBlbnRyeS5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgKyBidWZmZXIubGVuZ3RoICsgZmlsZU5hbWVMZW5ndGggKyBleHRyYUZpZWxkTGVuZ3RoO1xuXHRcdFx0dmFyIGRlY29tcHJlc3M7XG5cdFx0XHRpZiAoZW50cnkuY29tcHJlc3Npb25NZXRob2QgPT09IDApIHtcblx0XHRcdFx0Ly8gMCAtIFRoZSBmaWxlIGlzIHN0b3JlZCAobm8gY29tcHJlc3Npb24pXG5cdFx0XHRcdGRlY29tcHJlc3MgPSBmYWxzZTtcblx0XHRcdH0gZWxzZSBpZiAoZW50cnkuY29tcHJlc3Npb25NZXRob2QgPT09IDgpIHtcblx0XHRcdFx0Ly8gOCAtIFRoZSBmaWxlIGlzIERlZmxhdGVkXG5cdFx0XHRcdGRlY29tcHJlc3MgPSBvcHRpb25zLmRlY29tcHJlc3MgIT0gbnVsbCA/IG9wdGlvbnMuZGVjb21wcmVzcyA6IHRydWU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwidW5zdXBwb3J0ZWQgY29tcHJlc3Npb24gbWV0aG9kOiBcIiArIGVudHJ5LmNvbXByZXNzaW9uTWV0aG9kKSk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgZmlsZURhdGFTdGFydCA9IGxvY2FsRmlsZUhlYWRlckVuZDtcblx0XHRcdHZhciBmaWxlRGF0YUVuZCA9IGZpbGVEYXRhU3RhcnQgKyBlbnRyeS5jb21wcmVzc2VkU2l6ZTtcblx0XHRcdGlmIChlbnRyeS5jb21wcmVzc2VkU2l6ZSAhPT0gMCkge1xuXHRcdFx0XHQvLyBib3VuZHMgY2hlY2sgbm93LCBiZWNhdXNlIHRoZSByZWFkIHN0cmVhbXMgd2lsbCBwcm9iYWJseSBub3QgY29tcGxhaW4gbG91ZCBlbm91Z2guXG5cdFx0XHRcdC8vIHNpbmNlIHdlJ3JlIGRlYWxpbmcgd2l0aCBhbiB1bnNpZ25lZCBvZmZzZXQgcGx1cyBhbiB1bnNpZ25lZCBzaXplLFxuXHRcdFx0XHQvLyB3ZSBvbmx5IGhhdmUgMSB0aGluZyB0byBjaGVjayBmb3IuXG5cdFx0XHRcdGlmIChmaWxlRGF0YUVuZCA+IHNlbGYuZmlsZVNpemUpIHtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiZmlsZSBkYXRhIG92ZXJmbG93cyBmaWxlIGJvdW5kczogXCIgK1xuXHRcdFx0XHRcdFx0ZmlsZURhdGFTdGFydCArIFwiICsgXCIgKyBlbnRyeS5jb21wcmVzc2VkU2l6ZSArIFwiID4gXCIgKyBzZWxmLmZpbGVTaXplKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHZhciByZWFkU3RyZWFtID0gc2VsZi5yZWFkZXIuY3JlYXRlUmVhZFN0cmVhbSh7XG5cdFx0XHRcdHN0YXJ0OiBmaWxlRGF0YVN0YXJ0ICsgcmVsYXRpdmVTdGFydCxcblx0XHRcdFx0ZW5kOiBmaWxlRGF0YVN0YXJ0ICsgcmVsYXRpdmVFbmQsXG5cdFx0XHR9KTtcblx0XHRcdHZhciBlbmRwb2ludFN0cmVhbSA9IHJlYWRTdHJlYW07XG5cdFx0XHRpZiAoZGVjb21wcmVzcykge1xuXHRcdFx0XHR2YXIgZGVzdHJveWVkID0gZmFsc2U7XG5cdFx0XHRcdHZhciBpbmZsYXRlRmlsdGVyID0gemxpYi5jcmVhdGVJbmZsYXRlUmF3KCk7XG5cdFx0XHRcdHJlYWRTdHJlYW0ub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRcdFx0Ly8gc2V0SW1tZWRpYXRlIGhlcmUgYmVjYXVzZSBlcnJvcnMgY2FuIGJlIGVtaXR0ZWQgZHVyaW5nIHRoZSBmaXJzdCBjYWxsIHRvIHBpcGUoKVxuXHRcdFx0XHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpZiAoIWRlc3Ryb3llZCkgaW5mbGF0ZUZpbHRlci5lbWl0KFwiZXJyb3JcIiwgZXJyKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJlYWRTdHJlYW0ucGlwZShpbmZsYXRlRmlsdGVyKTtcblxuXHRcdFx0XHRpZiAoc2VsZi52YWxpZGF0ZUVudHJ5U2l6ZXMpIHtcblx0XHRcdFx0XHRlbmRwb2ludFN0cmVhbSA9IG5ldyBBc3NlcnRCeXRlQ291bnRTdHJlYW0oZW50cnkudW5jb21wcmVzc2VkU2l6ZSk7XG5cdFx0XHRcdFx0aW5mbGF0ZUZpbHRlci5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRcdFx0XHRcdC8vIGZvcndhcmQgemxpYiBlcnJvcnMgdG8gdGhlIGNsaWVudC12aXNpYmxlIHN0cmVhbVxuXHRcdFx0XHRcdFx0c2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0aWYgKCFkZXN0cm95ZWQpIGVuZHBvaW50U3RyZWFtLmVtaXQoXCJlcnJvclwiLCBlcnIpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0aW5mbGF0ZUZpbHRlci5waXBlKGVuZHBvaW50U3RyZWFtKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyB0aGUgemxpYiBmaWx0ZXIgaXMgdGhlIGNsaWVudC12aXNpYmxlIHN0cmVhbVxuXHRcdFx0XHRcdGVuZHBvaW50U3RyZWFtID0gaW5mbGF0ZUZpbHRlcjtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyB0aGlzIGlzIHBhcnQgb2YgeWF1emwncyBBUEksIHNvIGltcGxlbWVudCB0aGlzIGZ1bmN0aW9uIG9uIHRoZSBjbGllbnQtdmlzaWJsZSBzdHJlYW1cblx0XHRcdFx0ZW5kcG9pbnRTdHJlYW0uZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRkZXN0cm95ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdGlmIChpbmZsYXRlRmlsdGVyICE9PSBlbmRwb2ludFN0cmVhbSkgaW5mbGF0ZUZpbHRlci51bnBpcGUoZW5kcG9pbnRTdHJlYW0pO1xuXHRcdFx0XHRcdHJlYWRTdHJlYW0udW5waXBlKGluZmxhdGVGaWx0ZXIpO1xuXHRcdFx0XHRcdC8vIFRPRE86IHRoZSBpbmZsYXRlRmlsdGVyIG1heSBjYXVzZSBhIG1lbW9yeSBsZWFrLiBzZWUgSXNzdWUgIzI3LlxuXHRcdFx0XHRcdHJlYWRTdHJlYW0uZGVzdHJveSgpO1xuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdFx0Y2FsbGJhY2sobnVsbCwgZW5kcG9pbnRTdHJlYW0pO1xuXHRcdH0gZmluYWxseSB7XG5cdFx0XHRzZWxmLnJlYWRlci51bnJlZigpO1xuXHRcdH1cblx0fSk7XG59O1xuXG5mdW5jdGlvbiBFbnRyeSgpIHtcbn1cblxuRW50cnkucHJvdG90eXBlLmdldExhc3RNb2REYXRlID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gZG9zRGF0ZVRpbWVUb0RhdGUodGhpcy5sYXN0TW9kRmlsZURhdGUsIHRoaXMubGFzdE1vZEZpbGVUaW1lKTtcbn07XG5FbnRyeS5wcm90b3R5cGUuaXNFbmNyeXB0ZWQgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiAodGhpcy5nZW5lcmFsUHVycG9zZUJpdEZsYWcgJiAweDEpICE9PSAwO1xufTtcbkVudHJ5LnByb3RvdHlwZS5pc0NvbXByZXNzZWQgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLmNvbXByZXNzaW9uTWV0aG9kID09PSA4O1xufTtcblxuZnVuY3Rpb24gZG9zRGF0ZVRpbWVUb0RhdGUoZGF0ZSwgdGltZSkge1xuXHR2YXIgZGF5ID0gZGF0ZSAmIDB4MWY7IC8vIDEtMzFcblx0dmFyIG1vbnRoID0gKGRhdGUgPj4gNSAmIDB4ZikgLSAxOyAvLyAxLTEyLCAwLTExXG5cdHZhciB5ZWFyID0gKGRhdGUgPj4gOSAmIDB4N2YpICsgMTk4MDsgLy8gMC0xMjgsIDE5ODAtMjEwOFxuXG5cdHZhciBtaWxsaXNlY29uZCA9IDA7XG5cdHZhciBzZWNvbmQgPSAodGltZSAmIDB4MWYpICogMjsgLy8gMC0yOSwgMC01OCAoZXZlbiBudW1iZXJzKVxuXHR2YXIgbWludXRlID0gdGltZSA+PiA1ICYgMHgzZjsgLy8gMC01OVxuXHR2YXIgaG91ciA9IHRpbWUgPj4gMTEgJiAweDFmOyAvLyAwLTIzXG5cblx0cmV0dXJuIG5ldyBEYXRlKHllYXIsIG1vbnRoLCBkYXksIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBtaWxsaXNlY29uZCk7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlRmlsZU5hbWUoZmlsZU5hbWUpIHtcblx0aWYgKGZpbGVOYW1lLmluZGV4T2YoXCJcXFxcXCIpICE9PSAtMSkge1xuXHRcdHJldHVybiBcImludmFsaWQgY2hhcmFjdGVycyBpbiBmaWxlTmFtZTogXCIgKyBmaWxlTmFtZTtcblx0fVxuXHRpZiAoL15bYS16QS1aXTovLnRlc3QoZmlsZU5hbWUpIHx8IC9eXFwvLy50ZXN0KGZpbGVOYW1lKSkge1xuXHRcdHJldHVybiBcImFic29sdXRlIHBhdGg6IFwiICsgZmlsZU5hbWU7XG5cdH1cblx0aWYgKGZpbGVOYW1lLnNwbGl0KFwiL1wiKS5pbmRleE9mKFwiLi5cIikgIT09IC0xKSB7XG5cdFx0cmV0dXJuIFwiaW52YWxpZCByZWxhdGl2ZSBwYXRoOiBcIiArIGZpbGVOYW1lO1xuXHR9XG5cdC8vIGFsbCBnb29kXG5cdHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiByZWFkQW5kQXNzZXJ0Tm9Fb2YocmVhZGVyLCBidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgY2FsbGJhY2spIHtcblx0aWYgKGxlbmd0aCA9PT0gMCkge1xuXHRcdC8vIGZzLnJlYWQgd2lsbCB0aHJvdyBhbiBvdXQtb2YtYm91bmRzIGVycm9yIGlmIHlvdSB0cnkgdG8gcmVhZCAwIGJ5dGVzIGZyb20gYSAwIGJ5dGUgZmlsZVxuXHRcdHJldHVybiBzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0Y2FsbGJhY2sobnVsbCwgbmV3QnVmZmVyKDApKTtcblx0XHR9KTtcblx0fVxuXHRyZWFkZXIucmVhZChidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgZnVuY3Rpb24gKGVyciwgYnl0ZXNSZWFkKSB7XG5cdFx0aWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0aWYgKGJ5dGVzUmVhZCA8IGxlbmd0aCkge1xuXHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcInVuZXhwZWN0ZWQgRU9GXCIpKTtcblx0XHR9XG5cdFx0Y2FsbGJhY2soKTtcblx0fSk7XG59XG5cbnV0aWwuaW5oZXJpdHMoQXNzZXJ0Qnl0ZUNvdW50U3RyZWFtLCBUcmFuc2Zvcm0pO1xuXG5mdW5jdGlvbiBBc3NlcnRCeXRlQ291bnRTdHJlYW0oYnl0ZUNvdW50KSB7XG5cdFRyYW5zZm9ybS5jYWxsKHRoaXMpO1xuXHR0aGlzLmFjdHVhbEJ5dGVDb3VudCA9IDA7XG5cdHRoaXMuZXhwZWN0ZWRCeXRlQ291bnQgPSBieXRlQ291bnQ7XG59XG5cbkFzc2VydEJ5dGVDb3VudFN0cmVhbS5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uIChjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG5cdHRoaXMuYWN0dWFsQnl0ZUNvdW50ICs9IGNodW5rLmxlbmd0aDtcblx0aWYgKHRoaXMuYWN0dWFsQnl0ZUNvdW50ID4gdGhpcy5leHBlY3RlZEJ5dGVDb3VudCkge1xuXHRcdHZhciBtc2cgPSBcInRvbyBtYW55IGJ5dGVzIGluIHRoZSBzdHJlYW0uIGV4cGVjdGVkIFwiICsgdGhpcy5leHBlY3RlZEJ5dGVDb3VudCArIFwiLiBnb3QgYXQgbGVhc3QgXCIgKyB0aGlzLmFjdHVhbEJ5dGVDb3VudDtcblx0XHRyZXR1cm4gY2IobmV3IEVycm9yKG1zZykpO1xuXHR9XG5cdGNiKG51bGwsIGNodW5rKTtcbn07XG5Bc3NlcnRCeXRlQ291bnRTdHJlYW0ucHJvdG90eXBlLl9mbHVzaCA9IGZ1bmN0aW9uIChjYikge1xuXHRpZiAodGhpcy5hY3R1YWxCeXRlQ291bnQgPCB0aGlzLmV4cGVjdGVkQnl0ZUNvdW50KSB7XG5cdFx0dmFyIG1zZyA9IFwibm90IGVub3VnaCBieXRlcyBpbiB0aGUgc3RyZWFtLiBleHBlY3RlZCBcIiArIHRoaXMuZXhwZWN0ZWRCeXRlQ291bnQgKyBcIi4gZ290IG9ubHkgXCIgKyB0aGlzLmFjdHVhbEJ5dGVDb3VudDtcblx0XHRyZXR1cm4gY2IobmV3IEVycm9yKG1zZykpO1xuXHR9XG5cdGNiKCk7XG59O1xuXG51dGlsLmluaGVyaXRzKFJhbmRvbUFjY2Vzc1JlYWRlciwgRXZlbnRFbWl0dGVyKTtcblxuZnVuY3Rpb24gUmFuZG9tQWNjZXNzUmVhZGVyKCkge1xuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblx0dGhpcy5yZWZDb3VudCA9IDA7XG59XG5cblJhbmRvbUFjY2Vzc1JlYWRlci5wcm90b3R5cGUucmVmID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLnJlZkNvdW50ICs9IDE7XG59O1xuUmFuZG9tQWNjZXNzUmVhZGVyLnByb3RvdHlwZS51bnJlZiA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRzZWxmLnJlZkNvdW50IC09IDE7XG5cblx0aWYgKHNlbGYucmVmQ291bnQgPiAwKSByZXR1cm47XG5cdGlmIChzZWxmLnJlZkNvdW50IDwgMCkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCB1bnJlZlwiKTtcblxuXHRzZWxmLmNsb3NlKG9uQ2xvc2VEb25lKTtcblxuXHRmdW5jdGlvbiBvbkNsb3NlRG9uZShlcnIpIHtcblx0XHRpZiAoZXJyKSByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG5cdFx0c2VsZi5lbWl0KCdjbG9zZScpO1xuXHR9XG59O1xuUmFuZG9tQWNjZXNzUmVhZGVyLnByb3RvdHlwZS5jcmVhdGVSZWFkU3RyZWFtID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0dmFyIHN0YXJ0ID0gb3B0aW9ucy5zdGFydDtcblx0dmFyIGVuZCA9IG9wdGlvbnMuZW5kO1xuXHRpZiAoc3RhcnQgPT09IGVuZCkge1xuXHRcdHZhciBlbXB0eVN0cmVhbSA9IG5ldyBQYXNzVGhyb3VnaCgpO1xuXHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRlbXB0eVN0cmVhbS5lbmQoKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gZW1wdHlTdHJlYW07XG5cdH1cblx0dmFyIHN0cmVhbSA9IHRoaXMuX3JlYWRTdHJlYW1Gb3JSYW5nZShzdGFydCwgZW5kKTtcblxuXHR2YXIgZGVzdHJveWVkID0gZmFsc2U7XG5cdHZhciByZWZVbnJlZkZpbHRlciA9IG5ldyBSZWZVbnJlZkZpbHRlcih0aGlzKTtcblx0c3RyZWFtLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycikge1xuXHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoIWRlc3Ryb3llZCkgcmVmVW5yZWZGaWx0ZXIuZW1pdChcImVycm9yXCIsIGVycik7XG5cdFx0fSk7XG5cdH0pO1xuXHRyZWZVbnJlZkZpbHRlci5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuXHRcdHN0cmVhbS51bnBpcGUocmVmVW5yZWZGaWx0ZXIpO1xuXHRcdHJlZlVucmVmRmlsdGVyLnVucmVmKCk7XG5cdFx0c3RyZWFtLmRlc3Ryb3koKTtcblx0fTtcblxuXHR2YXIgYnl0ZUNvdW50ZXIgPSBuZXcgQXNzZXJ0Qnl0ZUNvdW50U3RyZWFtKGVuZCAtIHN0YXJ0KTtcblx0cmVmVW5yZWZGaWx0ZXIub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0c2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICghZGVzdHJveWVkKSBieXRlQ291bnRlci5lbWl0KFwiZXJyb3JcIiwgZXJyKTtcblx0XHR9KTtcblx0fSk7XG5cdGJ5dGVDb3VudGVyLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG5cdFx0ZGVzdHJveWVkID0gdHJ1ZTtcblx0XHRyZWZVbnJlZkZpbHRlci51bnBpcGUoYnl0ZUNvdW50ZXIpO1xuXHRcdHJlZlVucmVmRmlsdGVyLmRlc3Ryb3koKTtcblx0fTtcblxuXHRyZXR1cm4gc3RyZWFtLnBpcGUocmVmVW5yZWZGaWx0ZXIpLnBpcGUoYnl0ZUNvdW50ZXIpO1xufTtcblJhbmRvbUFjY2Vzc1JlYWRlci5wcm90b3R5cGUuX3JlYWRTdHJlYW1Gb3JSYW5nZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG5cdHRocm93IG5ldyBFcnJvcihcIm5vdCBpbXBsZW1lbnRlZFwiKTtcbn07XG5SYW5kb21BY2Nlc3NSZWFkZXIucHJvdG90eXBlLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrKSB7XG5cdHZhciByZWFkU3RyZWFtID0gdGhpcy5jcmVhdGVSZWFkU3RyZWFtKHtzdGFydDogcG9zaXRpb24sIGVuZDogcG9zaXRpb24gKyBsZW5ndGh9KTtcblx0dmFyIHdyaXRlU3RyZWFtID0gbmV3IFdyaXRhYmxlKCk7XG5cdHZhciB3cml0dGVuID0gMDtcblx0d3JpdGVTdHJlYW0uX3dyaXRlID0gZnVuY3Rpb24gKGNodW5rLCBlbmNvZGluZywgY2IpIHtcblx0XHRjaHVuay5jb3B5KGJ1ZmZlciwgb2Zmc2V0ICsgd3JpdHRlbiwgMCwgY2h1bmsubGVuZ3RoKTtcblx0XHR3cml0dGVuICs9IGNodW5rLmxlbmd0aDtcblx0XHRjYigpO1xuXHR9O1xuXHR3cml0ZVN0cmVhbS5vbihcImZpbmlzaFwiLCBjYWxsYmFjayk7XG5cdHJlYWRTdHJlYW0ub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXJyb3IpIHtcblx0XHRjYWxsYmFjayhlcnJvcik7XG5cdH0pO1xuXHRyZWFkU3RyZWFtLnBpcGUod3JpdGVTdHJlYW0pO1xufTtcblJhbmRvbUFjY2Vzc1JlYWRlci5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblx0c2V0SW1tZWRpYXRlKGNhbGxiYWNrKTtcbn07XG5cbnV0aWwuaW5oZXJpdHMoUmVmVW5yZWZGaWx0ZXIsIFBhc3NUaHJvdWdoKTtcblxuZnVuY3Rpb24gUmVmVW5yZWZGaWx0ZXIoY29udGV4dCkge1xuXHRQYXNzVGhyb3VnaC5jYWxsKHRoaXMpO1xuXHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuXHR0aGlzLmNvbnRleHQucmVmKCk7XG5cdHRoaXMudW5yZWZmZWRZZXQgPSBmYWxzZTtcbn1cblxuUmVmVW5yZWZGaWx0ZXIucHJvdG90eXBlLl9mbHVzaCA9IGZ1bmN0aW9uIChjYikge1xuXHR0aGlzLnVucmVmKCk7XG5cdGNiKCk7XG59O1xuUmVmVW5yZWZGaWx0ZXIucHJvdG90eXBlLnVucmVmID0gZnVuY3Rpb24gKGNiKSB7XG5cdGlmICh0aGlzLnVucmVmZmVkWWV0KSByZXR1cm47XG5cdHRoaXMudW5yZWZmZWRZZXQgPSB0cnVlO1xuXHR0aGlzLmNvbnRleHQudW5yZWYoKTtcbn07XG5cbnZhciBjcDQzNyA9ICdcXHUwMDAw4pi64pi74pml4pmm4pmj4pmg4oCi4peY4peL4peZ4pmC4pmA4pmq4pmr4pi84pa64peE4oaV4oC8wrbCp+KWrOKGqOKGkeKGk+KGkuKGkOKIn+KGlOKWsuKWvCAhXCIjJCUmXFwnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xcXFxdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+4oyCw4fDvMOpw6LDpMOgw6XDp8Oqw6vDqMOvw67DrMOEw4XDicOmw4bDtMO2w7LDu8O5w7/DlsOcwqLCo8Kl4oKnxpLDocOtw7PDusOxw5HCqsK6wr/ijJDCrMK9wrzCocKrwrvilpHilpLilpPilILilKTilaHilaLilZbilZXilaPilZHilZfilZ3ilZzilZvilJDilJTilLTilKzilJzilIDilLzilZ7ilZ/ilZrilZTilanilabilaDilZDilazilafilajilaTilaXilZnilZjilZLilZPilavilarilJjilIzilojiloTilozilpDiloDOscOfzpPPgM6jz4PCtc+EzqbOmM6pzrTiiJ7Phs614oip4omhwrHiiaXiiaTijKDijKHDt+KJiMKw4oiZwrfiiJrigb/CsuKWoMKgJztcblxuZnVuY3Rpb24gZGVjb2RlQnVmZmVyKGJ1ZmZlciwgc3RhcnQsIGVuZCwgaXNVdGY4KSB7XG5cdGlmIChpc1V0ZjgpIHtcblx0XHRyZXR1cm4gYnVmZmVyLnRvU3RyaW5nKFwidXRmOFwiLCBzdGFydCwgZW5kKTtcblx0fSBlbHNlIHtcblx0XHR2YXIgcmVzdWx0ID0gXCJcIjtcblx0XHRmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuXHRcdFx0cmVzdWx0ICs9IGNwNDM3W2J1ZmZlcltpXV07XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cbn1cblxuZnVuY3Rpb24gcmVhZFVJbnQ2NExFKGJ1ZmZlciwgb2Zmc2V0KSB7XG5cdC8vIHRoZXJlIGlzIG5vIG5hdGl2ZSBmdW5jdGlvbiBmb3IgdGhpcywgYmVjYXVzZSB3ZSBjYW4ndCBhY3R1YWxseSBzdG9yZSA2NC1iaXQgaW50ZWdlcnMgcHJlY2lzZWx5LlxuXHQvLyBhZnRlciA1MyBiaXRzLCBKYXZhU2NyaXB0J3MgTnVtYmVyIHR5cGUgKElFRUUgNzU0IGRvdWJsZSkgY2FuJ3Qgc3RvcmUgaW5kaXZpZHVhbCBpbnRlZ2VycyBhbnltb3JlLlxuXHQvLyBidXQgc2luY2UgNTMgYml0cyBpcyBhIHdob2xlIGxvdCBtb3JlIHRoYW4gMzIgYml0cywgd2UgZG8gb3VyIGJlc3QgYW55d2F5LlxuXHR2YXIgbG93ZXIzMiA9IGJ1ZmZlci5yZWFkVUludDMyTEUob2Zmc2V0KTtcblx0dmFyIHVwcGVyMzIgPSBidWZmZXIucmVhZFVJbnQzMkxFKG9mZnNldCArIDQpO1xuXHQvLyB3ZSBjYW4ndCB1c2UgYml0c2hpZnRpbmcgaGVyZSwgYmVjYXVzZSBKYXZhU2NyaXB0IGJpdHNoaWZ0aW5nIG9ubHkgd29ya3Mgb24gMzItYml0IGludGVnZXJzLlxuXHRyZXR1cm4gdXBwZXIzMiAqIDB4MTAwMDAwMDAwICsgbG93ZXIzMjtcblx0Ly8gYXMgbG9uZyBhcyB3ZSdyZSBib3VuZHMgY2hlY2tpbmcgdGhlIHJlc3VsdCBvZiB0aGlzIGZ1bmN0aW9uIGFnYWluc3QgdGhlIHRvdGFsIGZpbGUgc2l6ZSxcblx0Ly8gd2UnbGwgY2F0Y2ggYW55IG92ZXJmbG93IGVycm9ycywgYmVjYXVzZSB3ZSBhbHJlYWR5IG1hZGUgc3VyZSB0aGUgdG90YWwgZmlsZSBzaXplIHdhcyB3aXRoaW4gcmVhc29uLlxufVxuXG4vLyBOb2RlIDEwIGRlcHJlY2F0ZWQgbmV3IEJ1ZmZlcigpLlxudmFyIG5ld0J1ZmZlcjtcbmlmICh0eXBlb2YgQnVmZmVyLmFsbG9jVW5zYWZlID09PSBcImZ1bmN0aW9uXCIpIHtcblx0bmV3QnVmZmVyID0gZnVuY3Rpb24gKGxlbikge1xuXHRcdHJldHVybiBCdWZmZXIuYWxsb2NVbnNhZmUobGVuKTtcblx0fTtcbn0gZWxzZSB7XG5cdG5ld0J1ZmZlciA9IGZ1bmN0aW9uIChsZW4pIHtcblx0XHRyZXR1cm4gbmV3IEJ1ZmZlcihsZW4pO1xuXHR9O1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0Q2FsbGJhY2soZXJyKSB7XG5cdGlmIChlcnIpIHRocm93IGVycjtcbn1cbiIsInZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKFwic3RyZWFtXCIpLlRyYW5zZm9ybTtcbnZhciBQYXNzVGhyb3VnaCA9IHJlcXVpcmUoXCJzdHJlYW1cIikuUGFzc1Rocm91Z2g7XG52YXIgemxpYiA9IHJlcXVpcmUoXCJ6bGliXCIpO1xudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcbnZhciBjcmMzMiA9IHJlcXVpcmUoXCJidWZmZXItY3JjMzJcIik7XG5cbmV4cG9ydHMuWmlwRmlsZSA9IFppcEZpbGU7XG5leHBvcnRzLmRhdGVUb0Rvc0RhdGVUaW1lID0gZGF0ZVRvRG9zRGF0ZVRpbWU7XG5cbnV0aWwuaW5oZXJpdHMoWmlwRmlsZSwgRXZlbnRFbWl0dGVyKTtcblxuZnVuY3Rpb24gWmlwRmlsZSgpIHtcblx0dGhpcy5vdXRwdXRTdHJlYW0gPSBuZXcgUGFzc1Rocm91Z2goKTtcblx0dGhpcy5lbnRyaWVzID0gW107XG5cdHRoaXMub3V0cHV0U3RyZWFtQ3Vyc29yID0gMDtcblx0dGhpcy5lbmRlZCA9IGZhbHNlOyAvLyAuZW5kKCkgc2V0cyB0aGlzXG5cdHRoaXMuYWxsRG9uZSA9IGZhbHNlOyAvLyBzZXQgd2hlbiB3ZSd2ZSB3cml0dGVuIHRoZSBsYXN0IGJ5dGVzXG5cdHRoaXMuZm9yY2VaaXA2NEVvY2QgPSBmYWxzZTsgLy8gY29uZmlndXJhYmxlIGluIC5lbmQoKVxufVxuXG5aaXBGaWxlLnByb3RvdHlwZS5hZGRGaWxlID0gZnVuY3Rpb24gKHJlYWxQYXRoLCBtZXRhZGF0YVBhdGgsIG9wdGlvbnMpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRtZXRhZGF0YVBhdGggPSB2YWxpZGF0ZU1ldGFkYXRhUGF0aChtZXRhZGF0YVBhdGgsIGZhbHNlKTtcblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXG5cdHZhciBlbnRyeSA9IG5ldyBFbnRyeShtZXRhZGF0YVBhdGgsIGZhbHNlLCBvcHRpb25zKTtcblx0c2VsZi5lbnRyaWVzLnB1c2goZW50cnkpO1xuXHRmcy5zdGF0KHJlYWxQYXRoLCBmdW5jdGlvbiAoZXJyLCBzdGF0cykge1xuXHRcdGlmIChlcnIpIHJldHVybiBzZWxmLmVtaXQoXCJlcnJvclwiLCBlcnIpO1xuXHRcdGlmICghc3RhdHMuaXNGaWxlKCkpIHJldHVybiBzZWxmLmVtaXQoXCJlcnJvclwiLCBuZXcgRXJyb3IoXCJub3QgYSBmaWxlOiBcIiArIHJlYWxQYXRoKSk7XG5cdFx0ZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9IHN0YXRzLnNpemU7XG5cdFx0aWYgKG9wdGlvbnMubXRpbWUgPT0gbnVsbCkgZW50cnkuc2V0TGFzdE1vZERhdGUoc3RhdHMubXRpbWUpO1xuXHRcdGlmIChvcHRpb25zLm1vZGUgPT0gbnVsbCkgZW50cnkuc2V0RmlsZUF0dHJpYnV0ZXNNb2RlKHN0YXRzLm1vZGUpO1xuXHRcdGVudHJ5LnNldEZpbGVEYXRhUHVtcEZ1bmN0aW9uKGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciByZWFkU3RyZWFtID0gZnMuY3JlYXRlUmVhZFN0cmVhbShyZWFsUGF0aCk7XG5cdFx0XHRlbnRyeS5zdGF0ZSA9IEVudHJ5LkZJTEVfREFUQV9JTl9QUk9HUkVTUztcblx0XHRcdHJlYWRTdHJlYW0ub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRcdHNlbGYuZW1pdChcImVycm9yXCIsIGVycik7XG5cdFx0XHR9KTtcblx0XHRcdHB1bXBGaWxlRGF0YVJlYWRTdHJlYW0oc2VsZiwgZW50cnksIHJlYWRTdHJlYW0pO1xuXHRcdH0pO1xuXHRcdHB1bXBFbnRyaWVzKHNlbGYpO1xuXHR9KTtcbn07XG5cblppcEZpbGUucHJvdG90eXBlLmFkZFJlYWRTdHJlYW0gPSBmdW5jdGlvbiAocmVhZFN0cmVhbSwgbWV0YWRhdGFQYXRoLCBvcHRpb25zKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0bWV0YWRhdGFQYXRoID0gdmFsaWRhdGVNZXRhZGF0YVBhdGgobWV0YWRhdGFQYXRoLCBmYWxzZSk7XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblx0dmFyIGVudHJ5ID0gbmV3IEVudHJ5KG1ldGFkYXRhUGF0aCwgZmFsc2UsIG9wdGlvbnMpO1xuXHRzZWxmLmVudHJpZXMucHVzaChlbnRyeSk7XG5cdGVudHJ5LnNldEZpbGVEYXRhUHVtcEZ1bmN0aW9uKGZ1bmN0aW9uICgpIHtcblx0XHRlbnRyeS5zdGF0ZSA9IEVudHJ5LkZJTEVfREFUQV9JTl9QUk9HUkVTUztcblx0XHRwdW1wRmlsZURhdGFSZWFkU3RyZWFtKHNlbGYsIGVudHJ5LCByZWFkU3RyZWFtKTtcblx0fSk7XG5cdHB1bXBFbnRyaWVzKHNlbGYpO1xufTtcblxuWmlwRmlsZS5wcm90b3R5cGUuYWRkQnVmZmVyID0gZnVuY3Rpb24gKGJ1ZmZlciwgbWV0YWRhdGFQYXRoLCBvcHRpb25zKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0bWV0YWRhdGFQYXRoID0gdmFsaWRhdGVNZXRhZGF0YVBhdGgobWV0YWRhdGFQYXRoLCBmYWxzZSk7XG5cdGlmIChidWZmZXIubGVuZ3RoID4gMHgzZmZmZmZmZikgdGhyb3cgbmV3IEVycm9yKFwiYnVmZmVyIHRvbyBsYXJnZTogXCIgKyBidWZmZXIubGVuZ3RoICsgXCIgPiBcIiArIDB4M2ZmZmZmZmYpO1xuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdGlmIChvcHRpb25zLnNpemUgIT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5zaXplIG5vdCBhbGxvd2VkXCIpO1xuXHR2YXIgZW50cnkgPSBuZXcgRW50cnkobWV0YWRhdGFQYXRoLCBmYWxzZSwgb3B0aW9ucyk7XG5cdGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPSBidWZmZXIubGVuZ3RoO1xuXHRlbnRyeS5jcmMzMiA9IGNyYzMyLnVuc2lnbmVkKGJ1ZmZlcik7XG5cdGVudHJ5LmNyY0FuZEZpbGVTaXplS25vd24gPSB0cnVlO1xuXHRzZWxmLmVudHJpZXMucHVzaChlbnRyeSk7XG5cdGlmICghZW50cnkuY29tcHJlc3MpIHtcblx0XHRzZXRDb21wcmVzc2VkQnVmZmVyKGJ1ZmZlcik7XG5cdH0gZWxzZSB7XG5cdFx0emxpYi5kZWZsYXRlUmF3KGJ1ZmZlciwgZnVuY3Rpb24gKGVyciwgY29tcHJlc3NlZEJ1ZmZlcikge1xuXHRcdFx0c2V0Q29tcHJlc3NlZEJ1ZmZlcihjb21wcmVzc2VkQnVmZmVyKTtcblx0XHRcdFxuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2V0Q29tcHJlc3NlZEJ1ZmZlcihjb21wcmVzc2VkQnVmZmVyKSB7XG5cdFx0ZW50cnkuY29tcHJlc3NlZFNpemUgPSBjb21wcmVzc2VkQnVmZmVyLmxlbmd0aDtcblx0XHRlbnRyeS5zZXRGaWxlRGF0YVB1bXBGdW5jdGlvbihmdW5jdGlvbiAoKSB7XG5cdFx0XHR3cml0ZVRvT3V0cHV0U3RyZWFtKHNlbGYsIGNvbXByZXNzZWRCdWZmZXIpO1xuXHRcdFx0d3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBlbnRyeS5nZXREYXRhRGVzY3JpcHRvcigpKTtcblx0XHRcdGVudHJ5LnN0YXRlID0gRW50cnkuRklMRV9EQVRBX0RPTkU7XG5cblx0XHRcdC8vIGRvbid0IGNhbGwgcHVtcEVudHJpZXMoKSByZWN1cnNpdmVseS5cblx0XHRcdC8vIChhbHNvLCBkb24ndCBjYWxsIHByb2Nlc3MubmV4dFRpY2sgcmVjdXJzaXZlbHkuKVxuXHRcdFx0c2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cHVtcEVudHJpZXMoc2VsZik7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRwdW1wRW50cmllcyhzZWxmKTtcblx0fVxufTtcblxuXG5aaXBGaWxlLnByb3RvdHlwZS5hZGRFbXB0eURpcmVjdG9yeSA9IGZ1bmN0aW9uIChtZXRhZGF0YVBhdGgsIG9wdGlvbnMpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRtZXRhZGF0YVBhdGggPSB2YWxpZGF0ZU1ldGFkYXRhUGF0aChtZXRhZGF0YVBhdGgsIHRydWUpO1xuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdGlmIChvcHRpb25zLnNpemUgIT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5zaXplIG5vdCBhbGxvd2VkXCIpO1xuXHRpZiAob3B0aW9ucy5jb21wcmVzcyAhPSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLmNvbXByZXNzIG5vdCBhbGxvd2VkXCIpO1xuXHR2YXIgZW50cnkgPSBuZXcgRW50cnkobWV0YWRhdGFQYXRoLCB0cnVlLCBvcHRpb25zKTtcblx0c2VsZi5lbnRyaWVzLnB1c2goZW50cnkpO1xuXHRlbnRyeS5zZXRGaWxlRGF0YVB1bXBGdW5jdGlvbihmdW5jdGlvbiAoKSB7XG5cdFx0d3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBlbnRyeS5nZXREYXRhRGVzY3JpcHRvcigpKTtcblx0XHRlbnRyeS5zdGF0ZSA9IEVudHJ5LkZJTEVfREFUQV9ET05FO1xuXHRcdHB1bXBFbnRyaWVzKHNlbGYpO1xuXHR9KTtcblx0cHVtcEVudHJpZXMoc2VsZik7XG59O1xuXG5aaXBGaWxlLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAob3B0aW9ucywgZmluYWxTaXplQ2FsbGJhY2spIHtcblx0aWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRmaW5hbFNpemVDYWxsYmFjayA9IG9wdGlvbnM7XG5cdFx0b3B0aW9ucyA9IG51bGw7XG5cdH1cblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXHRpZiAodGhpcy5lbmRlZCkgcmV0dXJuO1xuXHR0aGlzLmVuZGVkID0gdHJ1ZTtcblx0dGhpcy5maW5hbFNpemVDYWxsYmFjayA9IGZpbmFsU2l6ZUNhbGxiYWNrO1xuXHR0aGlzLmZvcmNlWmlwNjRFb2NkID0gISFvcHRpb25zLmZvcmNlWmlwNjRGb3JtYXQ7XG5cdHB1bXBFbnRyaWVzKHRoaXMpO1xufTtcblxuZnVuY3Rpb24gd3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBidWZmZXIpIHtcblx0c2VsZi5vdXRwdXRTdHJlYW0ud3JpdGUoYnVmZmVyKTtcblx0c2VsZi5vdXRwdXRTdHJlYW1DdXJzb3IgKz0gYnVmZmVyLmxlbmd0aDtcbn1cblxuZnVuY3Rpb24gcHVtcEZpbGVEYXRhUmVhZFN0cmVhbShzZWxmLCBlbnRyeSwgcmVhZFN0cmVhbSkge1xuXHR2YXIgY3JjMzJXYXRjaGVyID0gbmV3IENyYzMyV2F0Y2hlcigpO1xuXHR2YXIgdW5jb21wcmVzc2VkU2l6ZUNvdW50ZXIgPSBuZXcgQnl0ZUNvdW50ZXIoKTtcblx0dmFyIGNvbXByZXNzb3IgPSBlbnRyeS5jb21wcmVzcyA/IG5ldyB6bGliLkRlZmxhdGVSYXcoKSA6IG5ldyBQYXNzVGhyb3VnaCgpO1xuXHR2YXIgY29tcHJlc3NlZFNpemVDb3VudGVyID0gbmV3IEJ5dGVDb3VudGVyKCk7XG5cdHJlYWRTdHJlYW0ucGlwZShjcmMzMldhdGNoZXIpXG5cdFx0LnBpcGUodW5jb21wcmVzc2VkU2l6ZUNvdW50ZXIpXG5cdFx0LnBpcGUoY29tcHJlc3Nvcilcblx0XHQucGlwZShjb21wcmVzc2VkU2l6ZUNvdW50ZXIpXG5cdFx0LnBpcGUoc2VsZi5vdXRwdXRTdHJlYW0sIHtlbmQ6IGZhbHNlfSk7XG5cdGNvbXByZXNzZWRTaXplQ291bnRlci5vbihcImVuZFwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0ZW50cnkuY3JjMzIgPSBjcmMzMldhdGNoZXIuY3JjMzI7XG5cdFx0aWYgKGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPT0gbnVsbCkge1xuXHRcdFx0ZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9IHVuY29tcHJlc3NlZFNpemVDb3VudGVyLmJ5dGVDb3VudDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGVudHJ5LnVuY29tcHJlc3NlZFNpemUgIT09IHVuY29tcHJlc3NlZFNpemVDb3VudGVyLmJ5dGVDb3VudCkgcmV0dXJuIHNlbGYuZW1pdChcImVycm9yXCIsIG5ldyBFcnJvcihcImZpbGUgZGF0YSBzdHJlYW0gaGFzIHVuZXhwZWN0ZWQgbnVtYmVyIG9mIGJ5dGVzXCIpKTtcblx0XHR9XG5cdFx0ZW50cnkuY29tcHJlc3NlZFNpemUgPSBjb21wcmVzc2VkU2l6ZUNvdW50ZXIuYnl0ZUNvdW50O1xuXHRcdHNlbGYub3V0cHV0U3RyZWFtQ3Vyc29yICs9IGVudHJ5LmNvbXByZXNzZWRTaXplO1xuXHRcdHdyaXRlVG9PdXRwdXRTdHJlYW0oc2VsZiwgZW50cnkuZ2V0RGF0YURlc2NyaXB0b3IoKSk7XG5cdFx0ZW50cnkuc3RhdGUgPSBFbnRyeS5GSUxFX0RBVEFfRE9ORTtcblx0XHRwdW1wRW50cmllcyhzZWxmKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHB1bXBFbnRyaWVzKHNlbGYpIHtcblx0aWYgKHNlbGYuYWxsRG9uZSkgcmV0dXJuO1xuXHQvLyBmaXJzdCBjaGVjayBpZiBmaW5hbFNpemUgaXMgZmluYWxseSBrbm93blxuXHRpZiAoc2VsZi5lbmRlZCAmJiBzZWxmLmZpbmFsU2l6ZUNhbGxiYWNrICE9IG51bGwpIHtcblx0XHR2YXIgZmluYWxTaXplID0gY2FsY3VsYXRlRmluYWxTaXplKHNlbGYpO1xuXHRcdGlmIChmaW5hbFNpemUgIT0gbnVsbCkge1xuXHRcdFx0Ly8gd2UgaGF2ZSBhbiBhbnN3ZXJcblx0XHRcdHNlbGYuZmluYWxTaXplQ2FsbGJhY2soZmluYWxTaXplKTtcblx0XHRcdHNlbGYuZmluYWxTaXplQ2FsbGJhY2sgPSBudWxsO1xuXHRcdH1cblx0fVxuXG5cdC8vIHB1bXAgZW50cmllc1xuXHR2YXIgZW50cnkgPSBnZXRGaXJzdE5vdERvbmVFbnRyeSgpO1xuXG5cdGZ1bmN0aW9uIGdldEZpcnN0Tm90RG9uZUVudHJ5KCkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5lbnRyaWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgZW50cnkgPSBzZWxmLmVudHJpZXNbaV07XG5cdFx0XHRpZiAoZW50cnkuc3RhdGUgPCBFbnRyeS5GSUxFX0RBVEFfRE9ORSkgcmV0dXJuIGVudHJ5O1xuXHRcdH1cblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXG5cdGlmIChlbnRyeSAhPSBudWxsKSB7XG5cdFx0Ly8gdGhpcyBlbnRyeSBpcyBub3QgZG9uZSB5ZXRcblx0XHRpZiAoZW50cnkuc3RhdGUgPCBFbnRyeS5SRUFEWV9UT19QVU1QX0ZJTEVfREFUQSkgcmV0dXJuOyAvLyBpbnB1dCBmaWxlIG5vdCBvcGVuIHlldFxuXHRcdGlmIChlbnRyeS5zdGF0ZSA9PT0gRW50cnkuRklMRV9EQVRBX0lOX1BST0dSRVNTKSByZXR1cm47IC8vIHdlJ2xsIGdldCB0aGVyZVxuXHRcdC8vIHN0YXJ0IHdpdGggbG9jYWwgZmlsZSBoZWFkZXJcblx0XHRlbnRyeS5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgPSBzZWxmLm91dHB1dFN0cmVhbUN1cnNvcjtcblx0XHR2YXIgbG9jYWxGaWxlSGVhZGVyID0gZW50cnkuZ2V0TG9jYWxGaWxlSGVhZGVyKCk7XG5cdFx0d3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBsb2NhbEZpbGVIZWFkZXIpO1xuXHRcdGVudHJ5LmRvRmlsZURhdGFQdW1wKCk7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gYWxsIGNvdWdodCB1cCBvbiB3cml0aW5nIGVudHJpZXNcblx0XHRpZiAoc2VsZi5lbmRlZCkge1xuXHRcdFx0Ly8gaGVhZCBmb3IgdGhlIGV4aXRcblx0XHRcdHNlbGYub2Zmc2V0T2ZTdGFydE9mQ2VudHJhbERpcmVjdG9yeSA9IHNlbGYub3V0cHV0U3RyZWFtQ3Vyc29yO1xuXHRcdFx0c2VsZi5lbnRyaWVzLmZvckVhY2goZnVuY3Rpb24gKGVudHJ5KSB7XG5cdFx0XHRcdHZhciBjZW50cmFsRGlyZWN0b3J5UmVjb3JkID0gZW50cnkuZ2V0Q2VudHJhbERpcmVjdG9yeVJlY29yZCgpO1xuXHRcdFx0XHR3cml0ZVRvT3V0cHV0U3RyZWFtKHNlbGYsIGNlbnRyYWxEaXJlY3RvcnlSZWNvcmQpO1xuXHRcdFx0fSk7XG5cdFx0XHR3cml0ZVRvT3V0cHV0U3RyZWFtKHNlbGYsIGdldEVuZE9mQ2VudHJhbERpcmVjdG9yeVJlY29yZChzZWxmKSk7XG5cdFx0XHRzZWxmLm91dHB1dFN0cmVhbS5lbmQoKTtcblx0XHRcdHNlbGYuYWxsRG9uZSA9IHRydWU7XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZUZpbmFsU2l6ZShzZWxmKSB7XG5cdHZhciBwcmV0ZW5kT3V0cHV0Q3Vyc29yID0gMDtcblx0dmFyIGNlbnRyYWxEaXJlY3RvcnlTaXplID0gMDtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLmVudHJpZXMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgZW50cnkgPSBzZWxmLmVudHJpZXNbaV07XG5cdFx0Ly8gY29tcHJlc3Npb24gaXMgdG9vIGhhcmQgdG8gcHJlZGljdFxuXHRcdGlmIChlbnRyeS5jb21wcmVzcykgcmV0dXJuIC0xO1xuXHRcdGlmIChlbnRyeS5zdGF0ZSA+PSBFbnRyeS5SRUFEWV9UT19QVU1QX0ZJTEVfREFUQSkge1xuXHRcdFx0Ly8gaWYgYWRkUmVhZFN0cmVhbSB3YXMgY2FsbGVkIHdpdGhvdXQgcHJvdmlkaW5nIHRoZSBzaXplLCB3ZSBjYW4ndCBwcmVkaWN0IHRoZSBmaW5hbCBzaXplXG5cdFx0XHRpZiAoZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9PSBudWxsKSByZXR1cm4gLTE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIGlmIHdlJ3JlIHN0aWxsIHdhaXRpbmcgZm9yIGZzLnN0YXQsIHdlIG1pZ2h0IGxlYXJuIHRoZSBzaXplIHNvbWVkYXlcblx0XHRcdGlmIChlbnRyeS51bmNvbXByZXNzZWRTaXplID09IG51bGwpIHJldHVybiBudWxsO1xuXHRcdH1cblx0XHQvLyB3ZSBrbm93IHRoaXMgZm9yIHN1cmUsIGFuZCB0aGlzIGlzIGltcG9ydGFudCB0byBrbm93IGlmIHdlIG5lZWQgWklQNjQgZm9ybWF0LlxuXHRcdGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9IHByZXRlbmRPdXRwdXRDdXJzb3I7XG5cdFx0dmFyIHVzZVppcDY0Rm9ybWF0ID0gZW50cnkudXNlWmlwNjRGb3JtYXQoKTtcblxuXHRcdHByZXRlbmRPdXRwdXRDdXJzb3IgKz0gTE9DQUxfRklMRV9IRUFERVJfRklYRURfU0laRSArIGVudHJ5LnV0ZjhGaWxlTmFtZS5sZW5ndGg7XG5cdFx0cHJldGVuZE91dHB1dEN1cnNvciArPSBlbnRyeS51bmNvbXByZXNzZWRTaXplO1xuXHRcdGlmICghZW50cnkuY3JjQW5kRmlsZVNpemVLbm93bikge1xuXHRcdFx0Ly8gdXNlIGEgZGF0YSBkZXNjcmlwdG9yXG5cdFx0XHRpZiAodXNlWmlwNjRGb3JtYXQpIHtcblx0XHRcdFx0cHJldGVuZE91dHB1dEN1cnNvciArPSBaSVA2NF9EQVRBX0RFU0NSSVBUT1JfU0laRTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHByZXRlbmRPdXRwdXRDdXJzb3IgKz0gREFUQV9ERVNDUklQVE9SX1NJWkU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y2VudHJhbERpcmVjdG9yeVNpemUgKz0gQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX0ZJWEVEX1NJWkUgKyBlbnRyeS51dGY4RmlsZU5hbWUubGVuZ3RoO1xuXHRcdGlmICh1c2VaaXA2NEZvcm1hdCkge1xuXHRcdFx0Y2VudHJhbERpcmVjdG9yeVNpemUgKz0gWklQNjRfRVhURU5ERURfSU5GT1JNQVRJT05fRVhUUkFfRklFTERfU0laRTtcblx0XHR9XG5cdH1cblxuXHR2YXIgZW5kT2ZDZW50cmFsRGlyZWN0b3J5U2l6ZSA9IDA7XG5cdGlmIChzZWxmLmZvcmNlWmlwNjRFb2NkIHx8XG5cdFx0c2VsZi5lbnRyaWVzLmxlbmd0aCA+PSAweGZmZmYgfHxcblx0XHRjZW50cmFsRGlyZWN0b3J5U2l6ZSA+PSAweGZmZmYgfHxcblx0XHRwcmV0ZW5kT3V0cHV0Q3Vyc29yID49IDB4ZmZmZmZmZmYpIHtcblx0XHQvLyB1c2UgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHN0dWZmXG5cdFx0ZW5kT2ZDZW50cmFsRGlyZWN0b3J5U2l6ZSArPSBaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkUgKyBaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfTE9DQVRPUl9TSVpFO1xuXHR9XG5cdGVuZE9mQ2VudHJhbERpcmVjdG9yeVNpemUgKz0gRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFO1xuXHRyZXR1cm4gcHJldGVuZE91dHB1dEN1cnNvciArIGNlbnRyYWxEaXJlY3RvcnlTaXplICsgZW5kT2ZDZW50cmFsRGlyZWN0b3J5U2l6ZTtcbn1cblxudmFyIFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRSA9IDU2O1xudmFyIFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9MT0NBVE9SX1NJWkUgPSAyMDtcbnZhciBFTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkUgPSAyMjtcblxuZnVuY3Rpb24gZ2V0RW5kT2ZDZW50cmFsRGlyZWN0b3J5UmVjb3JkKHNlbGYsIGFjdHVhbGx5SnVzdFRlbGxNZUhvd0xvbmdJdFdvdWxkQmUpIHtcblx0dmFyIG5lZWRaaXA2NEZvcm1hdCA9IGZhbHNlO1xuXHR2YXIgbm9ybWFsRW50cmllc0xlbmd0aCA9IHNlbGYuZW50cmllcy5sZW5ndGg7XG5cdGlmIChzZWxmLmZvcmNlWmlwNjRFb2NkIHx8IHNlbGYuZW50cmllcy5sZW5ndGggPj0gMHhmZmZmKSB7XG5cdFx0bm9ybWFsRW50cmllc0xlbmd0aCA9IDB4ZmZmZjtcblx0XHRuZWVkWmlwNjRGb3JtYXQgPSB0cnVlO1xuXHR9XG5cdHZhciBzaXplT2ZDZW50cmFsRGlyZWN0b3J5ID0gc2VsZi5vdXRwdXRTdHJlYW1DdXJzb3IgLSBzZWxmLm9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3Rvcnk7XG5cdHZhciBub3JtYWxTaXplT2ZDZW50cmFsRGlyZWN0b3J5ID0gc2l6ZU9mQ2VudHJhbERpcmVjdG9yeTtcblx0aWYgKHNlbGYuZm9yY2VaaXA2NEVvY2QgfHwgc2l6ZU9mQ2VudHJhbERpcmVjdG9yeSA+PSAweGZmZmZmZmZmKSB7XG5cdFx0bm9ybWFsU2l6ZU9mQ2VudHJhbERpcmVjdG9yeSA9IDB4ZmZmZmZmZmY7XG5cdFx0bmVlZFppcDY0Rm9ybWF0ID0gdHJ1ZTtcblx0fVxuXHR2YXIgbm9ybWFsT2Zmc2V0T2ZTdGFydE9mQ2VudHJhbERpcmVjdG9yeSA9IHNlbGYub2Zmc2V0T2ZTdGFydE9mQ2VudHJhbERpcmVjdG9yeTtcblx0aWYgKHNlbGYuZm9yY2VaaXA2NEVvY2QgfHwgc2VsZi5vZmZzZXRPZlN0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5ID49IDB4ZmZmZmZmZmYpIHtcblx0XHRub3JtYWxPZmZzZXRPZlN0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5ID0gMHhmZmZmZmZmZjtcblx0XHRuZWVkWmlwNjRGb3JtYXQgPSB0cnVlO1xuXHR9XG5cdGlmIChhY3R1YWxseUp1c3RUZWxsTWVIb3dMb25nSXRXb3VsZEJlKSB7XG5cdFx0aWYgKG5lZWRaaXA2NEZvcm1hdCkge1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0WklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFICtcblx0XHRcdFx0WklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX0xPQ0FUT1JfU0laRSArXG5cdFx0XHRcdEVORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRVxuXHRcdFx0KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIEVORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRTtcblx0XHR9XG5cdH1cblxuXHR2YXIgZW9jZHJCdWZmZXIgPSBuZXcgQnVmZmVyKEVORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRSk7XG5cdC8vIGVuZCBvZiBjZW50cmFsIGRpciBzaWduYXR1cmUgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXMgICgweDA2MDU0YjUwKVxuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQzMkxFKDB4MDYwNTRiNTAsIDApO1xuXHQvLyBudW1iZXIgb2YgdGhpcyBkaXNrICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGVvY2RyQnVmZmVyLndyaXRlVUludDE2TEUoMCwgNCk7XG5cdC8vIG51bWJlciBvZiB0aGUgZGlzayB3aXRoIHRoZSBzdGFydCBvZiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgIDIgYnl0ZXNcblx0ZW9jZHJCdWZmZXIud3JpdGVVSW50MTZMRSgwLCA2KTtcblx0Ly8gdG90YWwgbnVtYmVyIG9mIGVudHJpZXMgaW4gdGhlIGNlbnRyYWwgZGlyZWN0b3J5IG9uIHRoaXMgZGlzayAgMiBieXRlc1xuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQxNkxFKG5vcm1hbEVudHJpZXNMZW5ndGgsIDgpO1xuXHQvLyB0b3RhbCBudW1iZXIgb2YgZW50cmllcyBpbiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgICAyIGJ5dGVzXG5cdGVvY2RyQnVmZmVyLndyaXRlVUludDE2TEUobm9ybWFsRW50cmllc0xlbmd0aCwgMTApO1xuXHQvLyBzaXplIG9mIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdGVvY2RyQnVmZmVyLndyaXRlVUludDMyTEUobm9ybWFsU2l6ZU9mQ2VudHJhbERpcmVjdG9yeSwgMTIpO1xuXHQvLyBvZmZzZXQgb2Ygc3RhcnQgb2YgY2VudHJhbCBkaXJlY3Rvcnkgd2l0aCByZXNwZWN0IHRvIHRoZSBzdGFydGluZyBkaXNrIG51bWJlciAgNCBieXRlc1xuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQzMkxFKG5vcm1hbE9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3RvcnksIDE2KTtcblx0Ly8gLlpJUCBmaWxlIGNvbW1lbnQgbGVuZ3RoICAgICAgICAgICAgICAgICAgICAgICAgICAgMiBieXRlc1xuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQxNkxFKDAsIDIwKTtcblx0Ly8gLlpJUCBmaWxlIGNvbW1lbnQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHZhcmlhYmxlIHNpemUpXG5cdC8vIG5vIGNvbW1lbnRcblxuXHRpZiAoIW5lZWRaaXA2NEZvcm1hdCkgcmV0dXJuIGVvY2RyQnVmZmVyO1xuXG5cdC8vIFpJUDY0IGZvcm1hdFxuXHQvLyBaSVA2NCBFbmQgb2YgQ2VudHJhbCBEaXJlY3RvcnkgUmVjb3JkXG5cdHZhciB6aXA2NEVvY2RyQnVmZmVyID0gbmV3IEJ1ZmZlcihaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkUpO1xuXHQvLyB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXIgc2lnbmF0dXJlICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlcyAgKDB4MDYwNjRiNTApXG5cdHppcDY0RW9jZHJCdWZmZXIud3JpdGVVSW50MzJMRSgweDA2MDY0YjUwLCAwKTtcblx0Ly8gc2l6ZSBvZiB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3JkICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDggYnl0ZXNcblx0d3JpdGVVSW50NjRMRSh6aXA2NEVvY2RyQnVmZmVyLCBaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkUgLSAxMiwgNCk7XG5cdC8vIHZlcnNpb24gbWFkZSBieSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdHppcDY0RW9jZHJCdWZmZXIud3JpdGVVSW50MTZMRShWRVJTSU9OX01BREVfQlksIDEyKTtcblx0Ly8gdmVyc2lvbiBuZWVkZWQgdG8gZXh0cmFjdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0emlwNjRFb2NkckJ1ZmZlci53cml0ZVVJbnQxNkxFKFZFUlNJT05fTkVFREVEX1RPX0VYVFJBQ1RfWklQNjQsIDE0KTtcblx0Ly8gbnVtYmVyIG9mIHRoaXMgZGlzayAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0emlwNjRFb2NkckJ1ZmZlci53cml0ZVVJbnQzMkxFKDAsIDE2KTtcblx0Ly8gbnVtYmVyIG9mIHRoZSBkaXNrIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0emlwNjRFb2NkckJ1ZmZlci53cml0ZVVJbnQzMkxFKDAsIDIwKTtcblx0Ly8gdG90YWwgbnVtYmVyIG9mIGVudHJpZXMgaW4gdGhlIGNlbnRyYWwgZGlyZWN0b3J5IG9uIHRoaXMgZGlzayAgICAgICAgICAgICAgICAgIDggYnl0ZXNcblx0d3JpdGVVSW50NjRMRSh6aXA2NEVvY2RyQnVmZmVyLCBzZWxmLmVudHJpZXMubGVuZ3RoLCAyNCk7XG5cdC8vIHRvdGFsIG51bWJlciBvZiBlbnRyaWVzIGluIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdHdyaXRlVUludDY0TEUoemlwNjRFb2NkckJ1ZmZlciwgc2VsZi5lbnRyaWVzLmxlbmd0aCwgMzIpO1xuXHQvLyBzaXplIG9mIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOCBieXRlc1xuXHR3cml0ZVVJbnQ2NExFKHppcDY0RW9jZHJCdWZmZXIsIHNpemVPZkNlbnRyYWxEaXJlY3RvcnksIDQwKTtcblx0Ly8gb2Zmc2V0IG9mIHN0YXJ0IG9mIGNlbnRyYWwgZGlyZWN0b3J5IHdpdGggcmVzcGVjdCB0byB0aGUgc3RhcnRpbmcgZGlzayBudW1iZXIgIDggYnl0ZXNcblx0d3JpdGVVSW50NjRMRSh6aXA2NEVvY2RyQnVmZmVyLCBzZWxmLm9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3RvcnksIDQ4KTtcblx0Ly8gemlwNjQgZXh0ZW5zaWJsZSBkYXRhIHNlY3RvciAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh2YXJpYWJsZSBzaXplKVxuXHQvLyBub3RoaW5nIGluIHRoZSB6aXA2NCBleHRlbnNpYmxlIGRhdGEgc2VjdG9yXG5cblxuXHQvLyBaSVA2NCBFbmQgb2YgQ2VudHJhbCBEaXJlY3RvcnkgTG9jYXRvclxuXHR2YXIgemlwNjRFb2NkbEJ1ZmZlciA9IG5ldyBCdWZmZXIoWklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX0xPQ0FUT1JfU0laRSk7XG5cdC8vIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpciBsb2NhdG9yIHNpZ25hdHVyZSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzICAoMHgwNzA2NGI1MClcblx0emlwNjRFb2NkbEJ1ZmZlci53cml0ZVVJbnQzMkxFKDB4MDcwNjRiNTAsIDApO1xuXHQvLyBudW1iZXIgb2YgdGhlIGRpc2sgd2l0aCB0aGUgc3RhcnQgb2YgdGhlIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSAgNCBieXRlc1xuXHR6aXA2NEVvY2RsQnVmZmVyLndyaXRlVUludDMyTEUoMCwgNCk7XG5cdC8vIHJlbGF0aXZlIG9mZnNldCBvZiB0aGUgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZCAgICAgICAgICAgICA4IGJ5dGVzXG5cdHdyaXRlVUludDY0TEUoemlwNjRFb2NkbEJ1ZmZlciwgc2VsZi5vdXRwdXRTdHJlYW1DdXJzb3IsIDgpO1xuXHQvLyB0b3RhbCBudW1iZXIgb2YgZGlza3MgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHR6aXA2NEVvY2RsQnVmZmVyLndyaXRlVUludDMyTEUoMSwgMTYpO1xuXG5cblx0cmV0dXJuIEJ1ZmZlci5jb25jYXQoW1xuXHRcdHppcDY0RW9jZHJCdWZmZXIsXG5cdFx0emlwNjRFb2NkbEJ1ZmZlcixcblx0XHRlb2NkckJ1ZmZlcixcblx0XSk7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlTWV0YWRhdGFQYXRoKG1ldGFkYXRhUGF0aCwgaXNEaXJlY3RvcnkpIHtcblx0aWYgKG1ldGFkYXRhUGF0aCA9PT0gXCJcIikgdGhyb3cgbmV3IEVycm9yKFwiZW1wdHkgbWV0YWRhdGFQYXRoXCIpO1xuXHRtZXRhZGF0YVBhdGggPSBtZXRhZGF0YVBhdGgucmVwbGFjZSgvXFxcXC9nLCBcIi9cIik7XG5cdGlmICgvXlthLXpBLVpdOi8udGVzdChtZXRhZGF0YVBhdGgpIHx8IC9eXFwvLy50ZXN0KG1ldGFkYXRhUGF0aCkpIHRocm93IG5ldyBFcnJvcihcImFic29sdXRlIHBhdGg6IFwiICsgbWV0YWRhdGFQYXRoKTtcblx0aWYgKG1ldGFkYXRhUGF0aC5zcGxpdChcIi9cIikuaW5kZXhPZihcIi4uXCIpICE9PSAtMSkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCByZWxhdGl2ZSBwYXRoOiBcIiArIG1ldGFkYXRhUGF0aCk7XG5cdHZhciBsb29rc0xpa2VEaXJlY3RvcnkgPSAvXFwvJC8udGVzdChtZXRhZGF0YVBhdGgpO1xuXHRpZiAoaXNEaXJlY3RvcnkpIHtcblx0XHQvLyBhcHBlbmQgYSB0cmFpbGluZyAnLycgaWYgbmVjZXNzYXJ5LlxuXHRcdGlmICghbG9va3NMaWtlRGlyZWN0b3J5KSBtZXRhZGF0YVBhdGggKz0gXCIvXCI7XG5cdH0gZWxzZSB7XG5cdFx0aWYgKGxvb2tzTGlrZURpcmVjdG9yeSkgdGhyb3cgbmV3IEVycm9yKFwiZmlsZSBwYXRoIGNhbm5vdCBlbmQgd2l0aCAnLyc6IFwiICsgbWV0YWRhdGFQYXRoKTtcblx0fVxuXHRyZXR1cm4gbWV0YWRhdGFQYXRoO1xufVxuXG52YXIgZGVmYXVsdEZpbGVNb2RlID0gcGFyc2VJbnQoXCIwMTAwNjY0XCIsIDgpO1xudmFyIGRlZmF1bHREaXJlY3RvcnlNb2RlID0gcGFyc2VJbnQoXCIwNDA3NzVcIiwgOCk7XG5cbi8vIHRoaXMgY2xhc3MgaXMgbm90IHBhcnQgb2YgdGhlIHB1YmxpYyBBUElcbmZ1bmN0aW9uIEVudHJ5KG1ldGFkYXRhUGF0aCwgaXNEaXJlY3RvcnksIG9wdGlvbnMpIHtcblx0dGhpcy51dGY4RmlsZU5hbWUgPSBuZXcgQnVmZmVyKG1ldGFkYXRhUGF0aCk7XG5cdGlmICh0aGlzLnV0ZjhGaWxlTmFtZS5sZW5ndGggPiAweGZmZmYpIHRocm93IG5ldyBFcnJvcihcInV0ZjggZmlsZSBuYW1lIHRvbyBsb25nLiBcIiArIHV0ZjhGaWxlTmFtZS5sZW5ndGggKyBcIiA+IFwiICsgMHhmZmZmKTtcblx0dGhpcy5pc0RpcmVjdG9yeSA9IGlzRGlyZWN0b3J5O1xuXHR0aGlzLnN0YXRlID0gRW50cnkuV0FJVElOR19GT1JfTUVUQURBVEE7XG5cdHRoaXMuc2V0TGFzdE1vZERhdGUob3B0aW9ucy5tdGltZSAhPSBudWxsID8gb3B0aW9ucy5tdGltZSA6IG5ldyBEYXRlKCkpO1xuXHRpZiAob3B0aW9ucy5tb2RlICE9IG51bGwpIHtcblx0XHR0aGlzLnNldEZpbGVBdHRyaWJ1dGVzTW9kZShvcHRpb25zLm1vZGUpO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuc2V0RmlsZUF0dHJpYnV0ZXNNb2RlKGlzRGlyZWN0b3J5ID8gZGVmYXVsdERpcmVjdG9yeU1vZGUgOiBkZWZhdWx0RmlsZU1vZGUpO1xuXHR9XG5cdGlmIChpc0RpcmVjdG9yeSkge1xuXHRcdHRoaXMuY3JjQW5kRmlsZVNpemVLbm93biA9IHRydWU7XG5cdFx0dGhpcy5jcmMzMiA9IDA7XG5cdFx0dGhpcy51bmNvbXByZXNzZWRTaXplID0gMDtcblx0XHR0aGlzLmNvbXByZXNzZWRTaXplID0gMDtcblx0fSBlbHNlIHtcblx0XHQvLyB1bmtub3duIHNvIGZhclxuXHRcdHRoaXMuY3JjQW5kRmlsZVNpemVLbm93biA9IGZhbHNlO1xuXHRcdHRoaXMuY3JjMzIgPSBudWxsO1xuXHRcdHRoaXMudW5jb21wcmVzc2VkU2l6ZSA9IG51bGw7XG5cdFx0dGhpcy5jb21wcmVzc2VkU2l6ZSA9IG51bGw7XG5cdFx0aWYgKG9wdGlvbnMuc2l6ZSAhPSBudWxsKSB0aGlzLnVuY29tcHJlc3NlZFNpemUgPSBvcHRpb25zLnNpemU7XG5cdH1cblx0aWYgKGlzRGlyZWN0b3J5KSB7XG5cdFx0dGhpcy5jb21wcmVzcyA9IGZhbHNlO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuY29tcHJlc3MgPSB0cnVlOyAvLyBkZWZhdWx0XG5cdFx0aWYgKG9wdGlvbnMuY29tcHJlc3MgIT0gbnVsbCkgdGhpcy5jb21wcmVzcyA9ICEhb3B0aW9ucy5jb21wcmVzcztcblx0fVxuXHR0aGlzLmZvcmNlWmlwNjRGb3JtYXQgPSAhIW9wdGlvbnMuZm9yY2VaaXA2NEZvcm1hdDtcbn1cblxuRW50cnkuV0FJVElOR19GT1JfTUVUQURBVEEgPSAwO1xuRW50cnkuUkVBRFlfVE9fUFVNUF9GSUxFX0RBVEEgPSAxO1xuRW50cnkuRklMRV9EQVRBX0lOX1BST0dSRVNTID0gMjtcbkVudHJ5LkZJTEVfREFUQV9ET05FID0gMztcbkVudHJ5LnByb3RvdHlwZS5zZXRMYXN0TW9kRGF0ZSA9IGZ1bmN0aW9uIChkYXRlKSB7XG5cdHZhciBkb3NEYXRlVGltZSA9IGRhdGVUb0Rvc0RhdGVUaW1lKGRhdGUpO1xuXHR0aGlzLmxhc3RNb2RGaWxlVGltZSA9IGRvc0RhdGVUaW1lLnRpbWU7XG5cdHRoaXMubGFzdE1vZEZpbGVEYXRlID0gZG9zRGF0ZVRpbWUuZGF0ZTtcbn07XG5FbnRyeS5wcm90b3R5cGUuc2V0RmlsZUF0dHJpYnV0ZXNNb2RlID0gZnVuY3Rpb24gKG1vZGUpIHtcblx0aWYgKChtb2RlICYgMHhmZmZmKSAhPT0gbW9kZSkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBtb2RlLiBleHBlY3RlZDogMCA8PSBcIiArIG1vZGUgKyBcIiA8PSBcIiArIDB4ZmZmZik7XG5cdC8vIGh0dHA6Ly91bml4LnN0YWNrZXhjaGFuZ2UuY29tL3F1ZXN0aW9ucy8xNDcwNS90aGUtemlwLWZvcm1hdHMtZXh0ZXJuYWwtZmlsZS1hdHRyaWJ1dGUvMTQ3MjcjMTQ3Mjdcblx0dGhpcy5leHRlcm5hbEZpbGVBdHRyaWJ1dGVzID0gKG1vZGUgPDwgMTYpID4+PiAwO1xufTtcbi8vIGRvRmlsZURhdGFQdW1wKCkgc2hvdWxkIG5vdCBjYWxsIHB1bXBFbnRyaWVzKCkgZGlyZWN0bHkuIHNlZSBpc3N1ZSAjOS5cbkVudHJ5LnByb3RvdHlwZS5zZXRGaWxlRGF0YVB1bXBGdW5jdGlvbiA9IGZ1bmN0aW9uIChkb0ZpbGVEYXRhUHVtcCkge1xuXHR0aGlzLmRvRmlsZURhdGFQdW1wID0gZG9GaWxlRGF0YVB1bXA7XG5cdHRoaXMuc3RhdGUgPSBFbnRyeS5SRUFEWV9UT19QVU1QX0ZJTEVfREFUQTtcbn07XG5FbnRyeS5wcm90b3R5cGUudXNlWmlwNjRGb3JtYXQgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiAoXG5cdFx0KHRoaXMuZm9yY2VaaXA2NEZvcm1hdCkgfHxcblx0XHQodGhpcy51bmNvbXByZXNzZWRTaXplICE9IG51bGwgJiYgdGhpcy51bmNvbXByZXNzZWRTaXplID4gMHhmZmZmZmZmZSkgfHxcblx0XHQodGhpcy5jb21wcmVzc2VkU2l6ZSAhPSBudWxsICYmIHRoaXMuY29tcHJlc3NlZFNpemUgPiAweGZmZmZmZmZlKSB8fFxuXHRcdCh0aGlzLnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciAhPSBudWxsICYmIHRoaXMucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID4gMHhmZmZmZmZmZSlcblx0KTtcbn1cbnZhciBMT0NBTF9GSUxFX0hFQURFUl9GSVhFRF9TSVpFID0gMzA7XG52YXIgVkVSU0lPTl9ORUVERURfVE9fRVhUUkFDVF9VVEY4ID0gMjA7XG52YXIgVkVSU0lPTl9ORUVERURfVE9fRVhUUkFDVF9aSVA2NCA9IDQ1O1xuLy8gMyA9IHVuaXguIDYzID0gc3BlYyB2ZXJzaW9uIDYuM1xudmFyIFZFUlNJT05fTUFERV9CWSA9ICgzIDw8IDgpIHwgNjM7XG52YXIgRklMRV9OQU1FX0lTX1VURjggPSAxIDw8IDExO1xudmFyIFVOS05PV05fQ1JDMzJfQU5EX0ZJTEVfU0laRVMgPSAxIDw8IDM7XG5FbnRyeS5wcm90b3R5cGUuZ2V0TG9jYWxGaWxlSGVhZGVyID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgY3JjMzIgPSAwO1xuXHR2YXIgY29tcHJlc3NlZFNpemUgPSAwO1xuXHR2YXIgdW5jb21wcmVzc2VkU2l6ZSA9IDA7XG5cdGlmICh0aGlzLmNyY0FuZEZpbGVTaXplS25vd24pIHtcblx0XHRjcmMzMiA9IHRoaXMuY3JjMzI7XG5cdFx0Y29tcHJlc3NlZFNpemUgPSB0aGlzLmNvbXByZXNzZWRTaXplO1xuXHRcdHVuY29tcHJlc3NlZFNpemUgPSB0aGlzLnVuY29tcHJlc3NlZFNpemU7XG5cdH1cblxuXHR2YXIgZml4ZWRTaXplU3R1ZmYgPSBuZXcgQnVmZmVyKExPQ0FMX0ZJTEVfSEVBREVSX0ZJWEVEX1NJWkUpO1xuXHR2YXIgZ2VuZXJhbFB1cnBvc2VCaXRGbGFnID0gRklMRV9OQU1FX0lTX1VURjg7XG5cdGlmICghdGhpcy5jcmNBbmRGaWxlU2l6ZUtub3duKSBnZW5lcmFsUHVycG9zZUJpdEZsYWcgfD0gVU5LTk9XTl9DUkMzMl9BTkRfRklMRV9TSVpFUztcblxuXHQvLyBsb2NhbCBmaWxlIGhlYWRlciBzaWduYXR1cmUgICAgIDQgYnl0ZXMgICgweDA0MDM0YjUwKVxuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKDB4MDQwMzRiNTAsIDApO1xuXHQvLyB2ZXJzaW9uIG5lZWRlZCB0byBleHRyYWN0ICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRShWRVJTSU9OX05FRURFRF9UT19FWFRSQUNUX1VURjgsIDQpO1xuXHQvLyBnZW5lcmFsIHB1cnBvc2UgYml0IGZsYWcgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRShnZW5lcmFsUHVycG9zZUJpdEZsYWcsIDYpO1xuXHQvLyBjb21wcmVzc2lvbiBtZXRob2QgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLmdldENvbXByZXNzaW9uTWV0aG9kKCksIDgpO1xuXHQvLyBsYXN0IG1vZCBmaWxlIHRpbWUgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLmxhc3RNb2RGaWxlVGltZSwgMTApO1xuXHQvLyBsYXN0IG1vZCBmaWxlIGRhdGUgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLmxhc3RNb2RGaWxlRGF0ZSwgMTIpO1xuXHQvLyBjcmMtMzIgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRShjcmMzMiwgMTQpO1xuXHQvLyBjb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRShjb21wcmVzc2VkU2l6ZSwgMTgpO1xuXHQvLyB1bmNvbXByZXNzZWQgc2l6ZSAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRSh1bmNvbXByZXNzZWRTaXplLCAyMik7XG5cdC8vIGZpbGUgbmFtZSBsZW5ndGggICAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHRoaXMudXRmOEZpbGVOYW1lLmxlbmd0aCwgMjYpO1xuXHQvLyBleHRyYSBmaWVsZCBsZW5ndGggICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSgwLCAyOCk7XG5cdHJldHVybiBCdWZmZXIuY29uY2F0KFtcblx0XHRmaXhlZFNpemVTdHVmZixcblx0XHQvLyBmaWxlIG5hbWUgKHZhcmlhYmxlIHNpemUpXG5cdFx0dGhpcy51dGY4RmlsZU5hbWUsXG5cdFx0Ly8gZXh0cmEgZmllbGQgKHZhcmlhYmxlIHNpemUpXG5cdFx0Ly8gbm8gZXh0cmEgZmllbGRzXG5cdF0pO1xufTtcbnZhciBEQVRBX0RFU0NSSVBUT1JfU0laRSA9IDE2O1xudmFyIFpJUDY0X0RBVEFfREVTQ1JJUFRPUl9TSVpFID0gMjQ7XG5FbnRyeS5wcm90b3R5cGUuZ2V0RGF0YURlc2NyaXB0b3IgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLmNyY0FuZEZpbGVTaXplS25vd24pIHtcblx0XHQvLyB0aGUgTWFjIEFyY2hpdmUgVXRpbGl0eSByZXF1aXJlcyB0aGlzIG5vdCBiZSBwcmVzZW50IHVubGVzcyB3ZSBzZXQgZ2VuZXJhbCBwdXJwb3NlIGJpdCAzXG5cdFx0cmV0dXJuIG5ldyBCdWZmZXIoMCk7XG5cdH1cblx0aWYgKCF0aGlzLnVzZVppcDY0Rm9ybWF0KCkpIHtcblx0XHR2YXIgYnVmZmVyID0gbmV3IEJ1ZmZlcihEQVRBX0RFU0NSSVBUT1JfU0laRSk7XG5cdFx0Ly8gb3B0aW9uYWwgc2lnbmF0dXJlIChyZXF1aXJlZCBhY2NvcmRpbmcgdG8gQXJjaGl2ZSBVdGlsaXR5KVxuXHRcdGJ1ZmZlci53cml0ZVVJbnQzMkxFKDB4MDgwNzRiNTAsIDApO1xuXHRcdC8vIGNyYy0zMiAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRcdGJ1ZmZlci53cml0ZVVJbnQzMkxFKHRoaXMuY3JjMzIsIDQpO1xuXHRcdC8vIGNvbXByZXNzZWQgc2l6ZSAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRcdGJ1ZmZlci53cml0ZVVJbnQzMkxFKHRoaXMuY29tcHJlc3NlZFNpemUsIDgpO1xuXHRcdC8vIHVuY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgNCBieXRlc1xuXHRcdGJ1ZmZlci53cml0ZVVJbnQzMkxFKHRoaXMudW5jb21wcmVzc2VkU2l6ZSwgMTIpO1xuXHRcdHJldHVybiBidWZmZXI7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gWklQNjQgZm9ybWF0XG5cdFx0dmFyIGJ1ZmZlciA9IG5ldyBCdWZmZXIoWklQNjRfREFUQV9ERVNDUklQVE9SX1NJWkUpO1xuXHRcdC8vIG9wdGlvbmFsIHNpZ25hdHVyZSAodW5rbm93biBpZiBhbnlvbmUgY2FyZXMgYWJvdXQgdGhpcylcblx0XHRidWZmZXIud3JpdGVVSW50MzJMRSgweDA4MDc0YjUwLCAwKTtcblx0XHQvLyBjcmMtMzIgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0XHRidWZmZXIud3JpdGVVSW50MzJMRSh0aGlzLmNyYzMyLCA0KTtcblx0XHQvLyBjb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICAgIDggYnl0ZXNcblx0XHR3cml0ZVVJbnQ2NExFKGJ1ZmZlciwgdGhpcy5jb21wcmVzc2VkU2l6ZSwgOCk7XG5cdFx0Ly8gdW5jb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdFx0d3JpdGVVSW50NjRMRShidWZmZXIsIHRoaXMudW5jb21wcmVzc2VkU2l6ZSwgMTYpO1xuXHRcdHJldHVybiBidWZmZXI7XG5cdH1cbn07XG52YXIgQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX0ZJWEVEX1NJWkUgPSA0NjtcbnZhciBaSVA2NF9FWFRFTkRFRF9JTkZPUk1BVElPTl9FWFRSQV9GSUVMRF9TSVpFID0gMjg7XG5FbnRyeS5wcm90b3R5cGUuZ2V0Q2VudHJhbERpcmVjdG9yeVJlY29yZCA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGZpeGVkU2l6ZVN0dWZmID0gbmV3IEJ1ZmZlcihDRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfRklYRURfU0laRSk7XG5cdHZhciBnZW5lcmFsUHVycG9zZUJpdEZsYWcgPSBGSUxFX05BTUVfSVNfVVRGODtcblx0aWYgKCF0aGlzLmNyY0FuZEZpbGVTaXplS25vd24pIGdlbmVyYWxQdXJwb3NlQml0RmxhZyB8PSBVTktOT1dOX0NSQzMyX0FORF9GSUxFX1NJWkVTO1xuXG5cdHZhciBub3JtYWxDb21wcmVzc2VkU2l6ZSA9IHRoaXMuY29tcHJlc3NlZFNpemU7XG5cdHZhciBub3JtYWxVbmNvbXByZXNzZWRTaXplID0gdGhpcy51bmNvbXByZXNzZWRTaXplO1xuXHR2YXIgbm9ybWFsUmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID0gdGhpcy5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXI7XG5cdHZhciB2ZXJzaW9uTmVlZGVkVG9FeHRyYWN0O1xuXHR2YXIgemVpZWZCdWZmZXI7XG5cdGlmICh0aGlzLnVzZVppcDY0Rm9ybWF0KCkpIHtcblx0XHRub3JtYWxDb21wcmVzc2VkU2l6ZSA9IDB4ZmZmZmZmZmY7XG5cdFx0bm9ybWFsVW5jb21wcmVzc2VkU2l6ZSA9IDB4ZmZmZmZmZmY7XG5cdFx0bm9ybWFsUmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID0gMHhmZmZmZmZmZjtcblx0XHR2ZXJzaW9uTmVlZGVkVG9FeHRyYWN0ID0gVkVSU0lPTl9ORUVERURfVE9fRVhUUkFDVF9aSVA2NDtcblxuXHRcdC8vIFpJUDY0IGV4dGVuZGVkIGluZm9ybWF0aW9uIGV4dHJhIGZpZWxkXG5cdFx0emVpZWZCdWZmZXIgPSBuZXcgQnVmZmVyKFpJUDY0X0VYVEVOREVEX0lORk9STUFUSU9OX0VYVFJBX0ZJRUxEX1NJWkUpO1xuXHRcdC8vIDB4MDAwMSAgICAgICAgICAgICAgICAgIDIgYnl0ZXMgICAgVGFnIGZvciB0aGlzIFwiZXh0cmFcIiBibG9jayB0eXBlXG5cdFx0emVpZWZCdWZmZXIud3JpdGVVSW50MTZMRSgweDAwMDEsIDApO1xuXHRcdC8vIFNpemUgICAgICAgICAgICAgICAgICAgIDIgYnl0ZXMgICAgU2l6ZSBvZiB0aGlzIFwiZXh0cmFcIiBibG9ja1xuXHRcdHplaWVmQnVmZmVyLndyaXRlVUludDE2TEUoWklQNjRfRVhURU5ERURfSU5GT1JNQVRJT05fRVhUUkFfRklFTERfU0laRSAtIDQsIDIpO1xuXHRcdC8vIE9yaWdpbmFsIFNpemUgICAgICAgICAgIDggYnl0ZXMgICAgT3JpZ2luYWwgdW5jb21wcmVzc2VkIGZpbGUgc2l6ZVxuXHRcdHdyaXRlVUludDY0TEUoemVpZWZCdWZmZXIsIHRoaXMudW5jb21wcmVzc2VkU2l6ZSwgNCk7XG5cdFx0Ly8gQ29tcHJlc3NlZCBTaXplICAgICAgICAgOCBieXRlcyAgICBTaXplIG9mIGNvbXByZXNzZWQgZGF0YVxuXHRcdHdyaXRlVUludDY0TEUoemVpZWZCdWZmZXIsIHRoaXMuY29tcHJlc3NlZFNpemUsIDEyKTtcblx0XHQvLyBSZWxhdGl2ZSBIZWFkZXIgT2Zmc2V0ICA4IGJ5dGVzICAgIE9mZnNldCBvZiBsb2NhbCBoZWFkZXIgcmVjb3JkXG5cdFx0d3JpdGVVSW50NjRMRSh6ZWllZkJ1ZmZlciwgdGhpcy5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIsIDIwKTtcblx0XHQvLyBEaXNrIFN0YXJ0IE51bWJlciAgICAgICA0IGJ5dGVzICAgIE51bWJlciBvZiB0aGUgZGlzayBvbiB3aGljaCB0aGlzIGZpbGUgc3RhcnRzXG5cdFx0Ly8gKG9taXQpXG5cdH0gZWxzZSB7XG5cdFx0dmVyc2lvbk5lZWRlZFRvRXh0cmFjdCA9IFZFUlNJT05fTkVFREVEX1RPX0VYVFJBQ1RfVVRGODtcblx0XHR6ZWllZkJ1ZmZlciA9IG5ldyBCdWZmZXIoMCk7XG5cdH1cblxuXHQvLyBjZW50cmFsIGZpbGUgaGVhZGVyIHNpZ25hdHVyZSAgIDQgYnl0ZXMgICgweDAyMDE0YjUwKVxuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKDB4MDIwMTRiNTAsIDApO1xuXHQvLyB2ZXJzaW9uIG1hZGUgYnkgICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRShWRVJTSU9OX01BREVfQlksIDQpO1xuXHQvLyB2ZXJzaW9uIG5lZWRlZCB0byBleHRyYWN0ICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh2ZXJzaW9uTmVlZGVkVG9FeHRyYWN0LCA2KTtcblx0Ly8gZ2VuZXJhbCBwdXJwb3NlIGJpdCBmbGFnICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoZ2VuZXJhbFB1cnBvc2VCaXRGbGFnLCA4KTtcblx0Ly8gY29tcHJlc3Npb24gbWV0aG9kICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodGhpcy5nZXRDb21wcmVzc2lvbk1ldGhvZCgpLCAxMCk7XG5cdC8vIGxhc3QgbW9kIGZpbGUgdGltZSAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHRoaXMubGFzdE1vZEZpbGVUaW1lLCAxMik7XG5cdC8vIGxhc3QgbW9kIGZpbGUgZGF0ZSAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHRoaXMubGFzdE1vZEZpbGVEYXRlLCAxNCk7XG5cdC8vIGNyYy0zMiAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKHRoaXMuY3JjMzIsIDE2KTtcblx0Ly8gY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUobm9ybWFsQ29tcHJlc3NlZFNpemUsIDIwKTtcblx0Ly8gdW5jb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUobm9ybWFsVW5jb21wcmVzc2VkU2l6ZSwgMjQpO1xuXHQvLyBmaWxlIG5hbWUgbGVuZ3RoICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLnV0ZjhGaWxlTmFtZS5sZW5ndGgsIDI4KTtcblx0Ly8gZXh0cmEgZmllbGQgbGVuZ3RoICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoemVpZWZCdWZmZXIubGVuZ3RoLCAzMCk7XG5cdC8vIGZpbGUgY29tbWVudCBsZW5ndGggICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKDAsIDMyKTtcblx0Ly8gZGlzayBudW1iZXIgc3RhcnQgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoMCwgMzQpO1xuXHQvLyBpbnRlcm5hbCBmaWxlIGF0dHJpYnV0ZXMgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSgwLCAzNik7XG5cdC8vIGV4dGVybmFsIGZpbGUgYXR0cmlidXRlcyAgICAgICAgNCBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKHRoaXMuZXh0ZXJuYWxGaWxlQXR0cmlidXRlcywgMzgpO1xuXHQvLyByZWxhdGl2ZSBvZmZzZXQgb2YgbG9jYWwgaGVhZGVyIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRShub3JtYWxSZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIsIDQyKTtcblxuXHRyZXR1cm4gQnVmZmVyLmNvbmNhdChbXG5cdFx0Zml4ZWRTaXplU3R1ZmYsXG5cdFx0Ly8gZmlsZSBuYW1lICh2YXJpYWJsZSBzaXplKVxuXHRcdHRoaXMudXRmOEZpbGVOYW1lLFxuXHRcdC8vIGV4dHJhIGZpZWxkICh2YXJpYWJsZSBzaXplKVxuXHRcdHplaWVmQnVmZmVyLFxuXHRcdC8vIGZpbGUgY29tbWVudCAodmFyaWFibGUgc2l6ZSlcblx0XHQvLyBlbXB0eSBjb21tZW50XG5cdF0pO1xufTtcbkVudHJ5LnByb3RvdHlwZS5nZXRDb21wcmVzc2lvbk1ldGhvZCA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIE5PX0NPTVBSRVNTSU9OID0gMDtcblx0dmFyIERFRkxBVEVfQ09NUFJFU1NJT04gPSA4O1xuXHRyZXR1cm4gdGhpcy5jb21wcmVzcyA/IERFRkxBVEVfQ09NUFJFU1NJT04gOiBOT19DT01QUkVTU0lPTjtcbn07XG5cbmZ1bmN0aW9uIGRhdGVUb0Rvc0RhdGVUaW1lKGpzRGF0ZSkge1xuXHR2YXIgZGF0ZSA9IDA7XG5cdGRhdGUgfD0ganNEYXRlLmdldERhdGUoKSAmIDB4MWY7IC8vIDEtMzFcblx0ZGF0ZSB8PSAoKGpzRGF0ZS5nZXRNb250aCgpICsgMSkgJiAweGYpIDw8IDU7IC8vIDAtMTEsIDEtMTJcblx0ZGF0ZSB8PSAoKGpzRGF0ZS5nZXRGdWxsWWVhcigpIC0gMTk4MCkgJiAweDdmKSA8PCA5OyAvLyAwLTEyOCwgMTk4MC0yMTA4XG5cblx0dmFyIHRpbWUgPSAwO1xuXHR0aW1lIHw9IE1hdGguZmxvb3IoanNEYXRlLmdldFNlY29uZHMoKSAvIDIpOyAvLyAwLTU5LCAwLTI5IChsb3NlIG9kZCBudW1iZXJzKVxuXHR0aW1lIHw9IChqc0RhdGUuZ2V0TWludXRlcygpICYgMHgzZikgPDwgNTsgLy8gMC01OVxuXHR0aW1lIHw9IChqc0RhdGUuZ2V0SG91cnMoKSAmIDB4MWYpIDw8IDExOyAvLyAwLTIzXG5cblx0cmV0dXJuIHtkYXRlOiBkYXRlLCB0aW1lOiB0aW1lfTtcbn1cblxuZnVuY3Rpb24gd3JpdGVVSW50NjRMRShidWZmZXIsIG4sIG9mZnNldCkge1xuXHQvLyBjYW4ndCB1c2UgYml0c2hpZnQgaGVyZSwgYmVjYXVzZSBKYXZhU2NyaXB0IG9ubHkgYWxsb3dzIGJpdHNoaXRpbmcgb24gMzItYml0IGludGVnZXJzLlxuXHR2YXIgaGlnaCA9IE1hdGguZmxvb3IobiAvIDB4MTAwMDAwMDAwKTtcblx0dmFyIGxvdyA9IG4gJSAweDEwMDAwMDAwMDtcblx0YnVmZmVyLndyaXRlVUludDMyTEUobG93LCBvZmZzZXQpO1xuXHRidWZmZXIud3JpdGVVSW50MzJMRShoaWdoLCBvZmZzZXQgKyA0KTtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdENhbGxiYWNrKGVycikge1xuXHRpZiAoZXJyKSB0aHJvdyBlcnI7XG59XG5cbnV0aWwuaW5oZXJpdHMoQnl0ZUNvdW50ZXIsIFRyYW5zZm9ybSk7XG5cbmZ1bmN0aW9uIEJ5dGVDb3VudGVyKG9wdGlvbnMpIHtcblx0VHJhbnNmb3JtLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cdHRoaXMuYnl0ZUNvdW50ID0gMDtcbn1cblxuQnl0ZUNvdW50ZXIucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2h1bmssIGVuY29kaW5nLCBjYikge1xuXHR0aGlzLmJ5dGVDb3VudCArPSBjaHVuay5sZW5ndGg7XG5cdGNiKG51bGwsIGNodW5rKTtcbn07XG5cbnV0aWwuaW5oZXJpdHMoQ3JjMzJXYXRjaGVyLCBUcmFuc2Zvcm0pO1xuXG5mdW5jdGlvbiBDcmMzMldhdGNoZXIob3B0aW9ucykge1xuXHRUcmFuc2Zvcm0uY2FsbCh0aGlzLCBvcHRpb25zKTtcblx0dGhpcy5jcmMzMiA9IDA7XG59XG5cbkNyYzMyV2F0Y2hlci5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uIChjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG5cdHRoaXMuY3JjMzIgPSBjcmMzMi51bnNpZ25lZChjaHVuaywgdGhpcy5jcmMzMik7XG5cdGNiKG51bGwsIGNodW5rKTtcbn07Il19
