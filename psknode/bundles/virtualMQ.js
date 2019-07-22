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

    server.post('/:fileId', (req, res) => {
        $$.flow.start("BricksManager").write(req.params.fileId, req, (err, result) => {
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
        $$.flow.start("BricksManager").addAlias(req.params.fileId, req,  (err, result) => {
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
},{"./flows/BricksManager":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/flows/BricksManager.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/flows/BricksManager.js":[function(require,module,exports){
const path = require("path");
const fs = require("fs");
const PskHash = require('pskcrypto').PskHash;

const folderNameSize = process.env.FOLDER_NAME_SIZE || 5;
const FILE_SEPARATOR = '-';
let rootfolder;

$$.flow.describe("BricksManager", {
    init: function (rootFolder, callback) {
        if (!rootFolder) {
            callback(new Error("No root folder specified!"));
            return;
        }
        rootFolder = path.resolve(rootFolder);
        this.__ensureFolderStructure(rootFolder, function (err, path) {
            rootfolder = rootFolder;
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

        const serial = this.serial(() => {
        });

        serial.__ensureFolderStructure(folderName, serial.__progress);
        serial.__writeFile(readFileStream, folderName, fileName, callback);
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
                callback(new Error("No file found."));
            }
        });
    },
    addAlias: function (filename, alias, callback) {
        if (!this.__verifyFileName(fileName, callback)) {
            return;
        }

        if (!alias) {
            return callback(new Error("No alias was provided"));
        }

        if (!this.aliases) {
            this.aliases = {};
        }

        this.aliases[alias] = filename;

        callback();
    },
    writeWithAlias: function (alias, readStream, callback) {
        const fileName = this.__getFileName(alias, callback);
        this.write(fileName, readStream, callback);
    },
    readWithAlias: function (alias, writeStream, callback) {
        const fileName = this.__getFileName(alias, callback);
        this.read(fileName, writeStream, callback);
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
        if (!fileName || typeof fileName != "string") {
            callback(new Error("No fileId specified."));
            return;
        }

        if (fileName.length < folderNameSize) {
            callback(new Error("FileId too small. " + fileName));
            return;
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
                    const hashDigest = hash.digest("hex");
                    if (hashDigest !== fileName) {
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                return callback(err);
                            } else {
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
    }
    ,
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
    }
    ,
    __maxElement: function (numbers) {
        let max = numbers[0];

        for (let i = 1; i < numbers.length; ++i) {
            max = Math.max(max, numbers[i]);
        }

        if (isNaN(max)) {
            throw new Error('Invalid element found');
        }

        return max;
    }
    ,
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
    }
    ,
    __readFile: function (writeFileStream, filePath, callback) {
        const readStream = fs.createReadStream(filePath);

        writeFileStream.on("finish", callback);
        writeFileStream.on("error", callback);

        readStream.pipe(writeFileStream);
    }
    ,
    __progress: function (err, result) {
        if (err) {
            console.error(err);
        }
    }
    ,
    __verifyFileExistence: function (filePath, callback) {
        fs.access(filePath, callback);
    }
    ,
    __getFileName: function (alias, callback) {
        if (!this.aliases) {
            return callback(new Error("No files have been associated with aliases"));
        }
        const fileName = this.aliases[alias];
        if (!fileName) {
            return callback(new Error("The specified alias was not associated with any file"));
        } else {
            return fileName;
        }
    }
    ,
});

},{"crypto":false,"fs":false,"path":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/Brick.js":[function(require,module,exports){
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
},{"pskdb":"pskdb"}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/FileHandler.js":[function(require,module,exports){
(function (Buffer){
const fs = require("fs");
const EDFSBrickStorage = require("edfs-brick-storage");
const Brick = require("./Brick");
const pskCrypto = require("pskcrypto");
const AsyncDispatcher = require("../utils/AsyncDispatcher");
const url = "http://localhost:8080";

function FileHandler(filePath, brickSize, fileBricksHashes, lastBrickSize) {

    const edfsServiceProxy = EDFSBrickStorage.createEDFSBrickStorage(url);


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
                        edfsServiceProxy.putBrick(brick, (err) => {

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

},{"../utils/AsyncDispatcher":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/utils/AsyncDispatcher.js","./Brick":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/Brick.js","buffer":false,"edfs-brick-storage":false,"fs":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/Header.js":[function(require,module,exports){
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
const EDFSBrickStorage = require("edfs-brick-storage");
const EDFSBlockchainProxy = require("./EDFSBlockchainProxy");
const AsyncDispatcher = require("../utils/AsyncDispatcher");

const Brick = require("./Brick");
const url = "http://localhost:8080";
const edfsServiceProxy = EDFSBrickStorage.createEDFSBrickStorage(url);
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

},{"../utils/AsyncDispatcher":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/utils/AsyncDispatcher.js","./Brick":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/Brick.js","./CSBIdentifier":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/CSBIdentifier.js","./EDFSBlockchainProxy":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/EDFSBlockchainProxy.js","./Header":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/Header.js","./HeadersHistory":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/HeadersHistory.js","./RawCSB":"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/lib/RawCSB.js","edfs-brick-storage":false,"events":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/edfs/utils/AsyncDispatcher.js":[function(require,module,exports){

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
(function (Buffer){
require("./flows/CSBmanager");
require("./flows/remoteSwarming");
const path = require("path");
const httpWrapper = require('./libs/http-wrapper');
const edfs = require("edfs");
const EDFSMiddleware = edfs.EDFSMiddleware;
const Server = httpWrapper.Server;
const Router = httpWrapper.Router;
const TokenBucket = require('./libs/TokenBucket');
const msgpack = require('@msgpack/msgpack');


function VirtualMQ({listeningPort, rootFolder, sslConfig}, callback) {
	const port = listeningPort || 8080;
	const server = new Server(sslConfig).listen(port);
	const tokenBucket = new TokenBucket(600000,1,10);
	const CSB_storage_folder = "uploads";
	const SWARM_storage_folder = "swarms";
	console.log("Listening on port:", port);

	this.close = server.close;
	$$.flow.start("CSBmanager").init(path.join(rootFolder, CSB_storage_folder), function (err, result) {
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

        server.post('/:channelId', function (req, res, next) {
            const contentType = req.headers['content-type'];

            if (contentType === 'application/octet-stream') {
                const contentLength = Number.parseInt(req.headers['content-length']);

                streamToBuffer(req, contentLength, (err, bodyAsBuffer) => {
                    if(err) {
                        res.statusCode = 500;
                        return;
                    }

                    req.body = msgpack.decode(bodyAsBuffer);

                    next();
                });
            } else {
                next();
            }


            /***** HELPER FUNCTION *****/

            function streamToBuffer(stream, bufferSize, callback) {
                const buffer = Buffer.alloc(bufferSize);
                let currentOffset = 0;

                stream
                    .on('data', chunk => {
                        const chunkSize = chunk.length;
                        const nextOffset = chunkSize + currentOffset;

                        if (currentOffset > bufferSize - 1) {
                            stream.close();
                            return callback(new Error('Stream is bigger than reported size'));
                        }

                        unsafeAppendInBufferFromOffset(buffer, chunk, currentOffset);
                        currentOffset = nextOffset;

                    })
                    .on('end', () => {
                        callback(undefined, buffer);
                    })
                    .on('error', callback);


            }

            function unsafeAppendInBufferFromOffset(buffer, dataToAppend, offset) {
                const dataSize = dataToAppend.length;

                for (let i = 0; i < dataSize; i++) {
                    buffer[offset++] = dataToAppend[i];
                }
            }

        });

        server.post('/:channelId', function (req, res) {
            $$.flow.start("RemoteSwarming").startSwarm(req.params.channelId, JSON.stringify(req.body), function (err, result) {
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

                if ((req.query.waitConfirmation || 'false') === 'false') {
                    res.on('finish', () => {
                        $$.flow.start('RemoteSwarming').confirmSwarm(req.params.channelId, confirmationId, (err) => {
                        });
                    });
                } else {
                    responseMessage = {result, confirmationId};
                }

                res.setHeader('Content-Type', 'application/octet-stream');

                const encodedResponseMessage = msgpack.encode(responseMessage);
                res.write(Buffer.from(encodedResponseMessage));
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

		server.post('/CSB', function (req, res) {
			//preventing illegal characters passing as fileId
			res.statusCode = 400;
			res.end();
		});

		server.post('/CSB/compareVersions', function(req, res) {
			$$.flow.start('CSBmanager').compareVersions(req, function(err, filesWithChanges) {
				if (err) {
					console.log(err);
					res.statusCode = 500;
				}
				res.end(JSON.stringify(filesWithChanges));
			});
		});

		server.post('/CSB/:fileId', function (req, res) {
			$$.flow.start("CSBmanager").write(req.params.fileId, req, function (err, result) {
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

		server.get('/CSB/:fileId', function (req, res) {
			res.setHeader("content-type", "application/octet-stream");
			$$.flow.start("CSBmanager").read(req.params.fileId, res, function (err, result) {
				res.statusCode = 200;
				if (err) {
					console.log(err);
					res.statusCode = 404;
				}
				res.end();
			});
		});

		server.get('/CSB/:fileId/versions', function (req, res) {
			$$.flow.start("CSBmanager").getVersionsForFile(req.params.fileId, function(err, fileVersions) {
				if(err) {
					console.error(err);
					res.statusCode = 404;
				}

				res.end(JSON.stringify(fileVersions));
			});
		});

		server.get('/CSB/:fileId/:version', function (req, res) {
			$$.flow.start("CSBmanager").readVersion(req.params.fileId, req.params.version, res, function (err, result) {
				res.statusCode = 200;
				if (err) {
					console.log(err);
					res.statusCode = 404;
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

}).call(this,require("buffer").Buffer)

},{"./flows/CSBmanager":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/flows/CSBmanager.js","./flows/remoteSwarming":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/flows/remoteSwarming.js","./libs/TokenBucket":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/TokenBucket.js","./libs/http-wrapper":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/index.js","@msgpack/msgpack":false,"buffer":false,"edfs":"edfs","path":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/flows/CSBmanager.js":[function(require,module,exports){
require('launcher');
const path = require("path");
const fs = require("fs");
const PskHash = require('pskcrypto').PskHash;

const folderNameSize = process.env.FOLDER_NAME_SIZE || 5;
const FILE_SEPARATOR = '-';
let rootfolder;

$$.flow.describe("CSBmanager", {
    init: function(rootFolder, callback){
        if(!rootFolder){
            callback(new Error("No root folder specified!"));
            return;
        }
        rootFolder = path.resolve(rootFolder);
        this.__ensureFolderStructure(rootFolder, function(err/*, path*/){
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

        const serial = this.serial(() => {}); //TODO: Empty function

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
                return callback(new Error("No file found."));
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
                return callback(new Error("No file found."));
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
                        return callback(undefined, filesData);
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
                return callback(e);
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
        fs.mkdir(folder, {recursive: true},  callback);
    },
    __writeFile: function(readStream, folderPath, fileName, callback){
        this.__getNextVersionFileName(folderPath, fileName, (err, nextVersionFileName) => {
            if(err) {
                console.error(err);
                return callback(err);
            }

            const hash = new PskHash();
            readStream.on('data', (data) => {
                hash.update(data);
            });

            const filePath = path.join(folderPath, nextVersionFileName.toString());
            const writeStream = fs.createWriteStream(filePath, {mode:0o444});

            writeStream.on("finish", () => {
                const hashDigest = hash.digest().toString('hex');
                const newPath = filePath + FILE_SEPARATOR + hashDigest;
                fs.rename(filePath, newPath, callback);
            });

            writeStream.on("error", function() {
				writeStream.close();
				readStream.close();
                callback(...arguments);
            });

            readStream.pipe(writeStream);
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
                    const allVersions = files.map((file) => file.split(FILE_SEPARATOR)[0]);
                    const latestFile = this.__maxElement(allVersions);
                    fileVersion = {
                        numericVersion: parseInt(latestFile),
                        fullVersion: files.filter((file) => file.split(FILE_SEPARATOR)[0] === latestFile.toString())[0]
                    };

                } catch (e) {
                    e.code = 'invalid_file_name_found';
                    return callback(e);
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

        entries.forEach(([ fileName, fileHash ]) => {
            this.getVersionsForFile(fileName, (err, versions) => {
                if (err) {
                    if(err.code === 'ENOENT') {
                        versions = [];
                    } else {
                        return callback(err);
                    }

                }

                const match = versions.some((version) => {
                    const hash = version.version.split(FILE_SEPARATOR)[1];
                    return hash === fileHash;
                });

                if (!match) {
                    filesWithChanges.push(fileName);
                }

                if (--remaining === 0) {
                    return callback(undefined, filesWithChanges);
                }
            });
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
},{"fs":false,"launcher":false,"path":false,"pskcrypto":false}],"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/flows/remoteSwarming.js":[function(require,module,exports){
const path = require("path");
const fs = require("fs");
const folderMQ = require("foldermq");

let rootfolder;
const channels = {};

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
	startSwarm: function (channelId, swarmSerialization, callback) {
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

				let sent = false;
				try {
					sent = deliverToConsumers(channel.consumers, null, JSON.parse(swarmSerialization));
				} catch (err) {
					console.log(err);
				}

				if (!sent) {
					storedChannel.handler.sendSwarmSerialization(swarmSerialization, callback);
				} else {
					return callback(null, swarmSerialization);
				}

			});
			storedChannel = storeChannel(channelId, channel);
		} else {

			let sent = false;
			try {
				sent = deliverToConsumers(channel.consumers, null, JSON.parse(swarmSerialization));
			} catch (err) {
				console.log(err);
			}

			if (!sent) {
				channel.handler.sendSwarmSerialization(swarmSerialization, callback);
			} else {
				return callback(null, swarmSerialization);
			}
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


},{"./classes/Client":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Client.js","./classes/Router":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Router.js","./classes/Server":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/classes/Server.js","./httpUtils":"/home/cosmin/Workspace/reorganizing/privatesky/modules/virtualmq/libs/http-wrapper/src/httpUtils.js"}],"/home/cosmin/Workspace/reorganizing/privatesky/node_modules/is-buffer/index.js":[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZHMvdG1wL3ZpcnR1YWxNUV9pbnRlcm1lZGlhci5qcyIsIm1vZHVsZXMvZWRmcy9FREZTTWlkZGxld2FyZS5qcyIsIm1vZHVsZXMvZWRmcy9mbG93cy9Ccmlja3NNYW5hZ2VyLmpzIiwibW9kdWxlcy9lZGZzL2xpYi9Ccmljay5qcyIsIm1vZHVsZXMvZWRmcy9saWIvQ1NCSWRlbnRpZmllci5qcyIsIm1vZHVsZXMvZWRmcy9saWIvRURGUy5qcyIsIm1vZHVsZXMvZWRmcy9saWIvRURGU0Jsb2NrY2hhaW5Qcm94eS5qcyIsIm1vZHVsZXMvZWRmcy9saWIvRmlsZUhhbmRsZXIuanMiLCJtb2R1bGVzL2VkZnMvbGliL0hlYWRlci5qcyIsIm1vZHVsZXMvZWRmcy9saWIvSGVhZGVyc0hpc3RvcnkuanMiLCJtb2R1bGVzL2VkZnMvbGliL1Jhd0NTQi5qcyIsIm1vZHVsZXMvZWRmcy9saWIvUm9vdENTQi5qcyIsIm1vZHVsZXMvZWRmcy91dGlscy9Bc3luY0Rpc3BhdGNoZXIuanMiLCJtb2R1bGVzL2VkZnMvdXRpbHMvRHNlZWRDYWdlLmpzIiwibW9kdWxlcy9mb2xkZXJtcS9saWIvZm9sZGVyTVEuanMiLCJtb2R1bGVzL25vZGUtZmQtc2xpY2VyL21vZHVsZXMvbm9kZS1wZW5kL2luZGV4LmpzIiwibW9kdWxlcy9wc2staHR0cC1jbGllbnQvbGliL3Bzay1hYnN0cmFjdC1jbGllbnQuanMiLCJtb2R1bGVzL3Bzay1odHRwLWNsaWVudC9saWIvcHNrLWJyb3dzZXItY2xpZW50LmpzIiwibW9kdWxlcy9wc2staHR0cC1jbGllbnQvbGliL3Bzay1ub2RlLWNsaWVudC5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL0Jsb2NrY2hhaW4uanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9Gb2xkZXJQZXJzaXN0ZW50UERTLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvSW5NZW1vcnlQRFMuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9QZXJzaXN0ZW50UERTLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0FDTFNjb3BlLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0FnZW50LmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0JhY2t1cC5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9DU0JNZXRhLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0NTQlJlZmVyZW5jZS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL2RvbWFpbi9Eb21haW5SZWZlcmVuY2UuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9kb21haW4vRW1iZWRkZWRGaWxlLmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL0ZpbGVSZWZlcmVuY2UuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9kb21haW4vS2V5LmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL2luZGV4LmpzIiwibW9kdWxlcy9wc2tkYi9saWIvZG9tYWluL3RyYW5zYWN0aW9ucy5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL3N3YXJtcy9hZ2VudHNTd2FybS5qcyIsIm1vZHVsZXMvcHNrZGIvbGliL3N3YXJtcy9kb21haW5Td2FybXMuanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9zd2FybXMvaW5kZXguanMiLCJtb2R1bGVzL3Bza2RiL2xpYi9zd2FybXMvc2hhcmVkUGhhc2VzLmpzIiwibW9kdWxlcy9zaWduc2Vuc3VzL2xpYi9jb25zVXRpbC5qcyIsIm1vZHVsZXMvdmlydHVhbG1xL1ZpcnR1YWxNUS5qcyIsIm1vZHVsZXMvdmlydHVhbG1xL2Zsb3dzL0NTQm1hbmFnZXIuanMiLCJtb2R1bGVzL3ZpcnR1YWxtcS9mbG93cy9yZW1vdGVTd2FybWluZy5qcyIsIm1vZHVsZXMvdmlydHVhbG1xL2xpYnMvVG9rZW5CdWNrZXQuanMiLCJtb2R1bGVzL3ZpcnR1YWxtcS9saWJzL2h0dHAtd3JhcHBlci9zcmMvY2xhc3Nlcy9DbGllbnQuanMiLCJtb2R1bGVzL3ZpcnR1YWxtcS9saWJzL2h0dHAtd3JhcHBlci9zcmMvY2xhc3Nlcy9NaWRkbGV3YXJlLmpzIiwibW9kdWxlcy92aXJ0dWFsbXEvbGlicy9odHRwLXdyYXBwZXIvc3JjL2NsYXNzZXMvUm91dGVyLmpzIiwibW9kdWxlcy92aXJ0dWFsbXEvbGlicy9odHRwLXdyYXBwZXIvc3JjL2NsYXNzZXMvU2VydmVyLmpzIiwibW9kdWxlcy92aXJ0dWFsbXEvbGlicy9odHRwLXdyYXBwZXIvc3JjL2h0dHBVdGlscy5qcyIsIm1vZHVsZXMvdmlydHVhbG1xL2xpYnMvaHR0cC13cmFwcGVyL3NyYy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9pcy1idWZmZXIvaW5kZXguanMiLCJtb2R1bGVzL2J1ZmZlci1jcmMzMi9pbmRleC5qcyIsIm1vZHVsZXMvZWRmcy9pbmRleC5qcyIsIm1vZHVsZXMvZm9sZGVybXEvaW5kZXguanMiLCJtb2R1bGVzL25vZGUtZmQtc2xpY2VyL2luZGV4LmpzIiwibW9kdWxlcy9wc2staHR0cC1jbGllbnQvaW5kZXguanMiLCJtb2R1bGVzL3Bza2RiL2luZGV4LmpzIiwibW9kdWxlcy9zaWduc2Vuc3VzL2xpYi9pbmRleC5qcyIsIm1vZHVsZXMvdmlydHVhbG1xL2luZGV4LmpzIiwibW9kdWxlcy95YXV6bC9pbmRleC5qcyIsIm1vZHVsZXMveWF6bC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3pVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdlhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN0TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzlKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDak5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBOzs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN4U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBOzs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDenlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiZ2xvYmFsLnZpcnR1YWxNUUxvYWRNb2R1bGVzID0gZnVuY3Rpb24oKXsgXG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJ2aXJ0dWFsbXFcIl0gPSByZXF1aXJlKFwidmlydHVhbG1xXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wiZm9sZGVybXFcIl0gPSByZXF1aXJlKFwiZm9sZGVybXFcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJ5YXpsXCJdID0gcmVxdWlyZShcInlhemxcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJ5YXV6bFwiXSA9IHJlcXVpcmUoXCJ5YXV6bFwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImJ1ZmZlci1jcmMzMlwiXSA9IHJlcXVpcmUoXCJidWZmZXItY3JjMzJcIik7XG5cdCQkLl9fcnVudGltZU1vZHVsZXNbXCJub2RlLWZkLXNsaWNlclwiXSA9IHJlcXVpcmUoXCJub2RlLWZkLXNsaWNlclwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImVkZnNcIl0gPSByZXF1aXJlKFwiZWRmc1wiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcInBza2RiXCJdID0gcmVxdWlyZShcInBza2RiXCIpO1xuXHQkJC5fX3J1bnRpbWVNb2R1bGVzW1wicHNrLWh0dHAtY2xpZW50XCJdID0gcmVxdWlyZShcInBzay1odHRwLWNsaWVudFwiKTtcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcInNpZ25zZW5zdXNcIl0gPSByZXF1aXJlKFwic2lnbnNlbnN1c1wiKTtcbn1cbmlmIChmYWxzZSkge1xuXHR2aXJ0dWFsTVFMb2FkTW9kdWxlcygpO1xufTsgXG5nbG9iYWwudmlydHVhbE1RUmVxdWlyZSA9IHJlcXVpcmU7XG5pZiAodHlwZW9mICQkICE9PSBcInVuZGVmaW5lZFwiKSB7ICAgICAgICAgICAgXG4gICAgJCQucmVxdWlyZUJ1bmRsZShcInZpcnR1YWxNUVwiKTtcbn07IiwicmVxdWlyZShcIi4vZmxvd3MvQnJpY2tzTWFuYWdlclwiKTtcblxuZnVuY3Rpb24gRURGU01pZGRsZXdhcmUoc2VydmVyKSB7XG5cbiAgICBzZXJ2ZXIucG9zdCgnLzpmaWxlSWQnLCAocmVxLCByZXMpID0+IHtcbiAgICAgICAgJCQuZmxvdy5zdGFydChcIkJyaWNrc01hbmFnZXJcIikud3JpdGUocmVxLnBhcmFtcy5maWxlSWQsIHJlcSwgKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMTtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcblxuICAgICAgICAgICAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VBQ0NFUycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG4gICAgc2VydmVyLmdldCgnLzpmaWxlSWQnLCAocmVxLCByZXMpID0+IHtcbiAgICAgICAgcmVzLnNldEhlYWRlcihcImNvbnRlbnQtdHlwZVwiLCBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiKTtcbiAgICAgICAgJCQuZmxvdy5zdGFydChcIkJyaWNrc01hbmFnZXJcIikucmVhZChyZXEucGFyYW1zLmZpbGVJZCwgcmVzLCAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwO1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgc2VydmVyLnBvc3QoJy9hZGRBbGlhcy86ZmlsZUlkJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgICAgICQkLmZsb3cuc3RhcnQoXCJCcmlja3NNYW5hZ2VyXCIpLmFkZEFsaWFzKHJlcS5wYXJhbXMuZmlsZUlkLCByZXEsICAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAxO1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVyci5jb2RlID09PSAnRUFDQ0VTJykge1xuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwOTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICBzZXJ2ZXIucG9zdCgnL2FsaWFzLzphbGlhcycsIChyZXEsIHJlcykgPT4ge1xuICAgICAgICAkJC5mbG93LnN0YXJ0KFwiQnJpY2tzTWFuYWdlclwiKS53cml0ZVdpdGhBbGlhcyhyZXEucGFyYW1zLmFsaWFzLCByZXEsICAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAxO1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVyci5jb2RlID09PSAnRUFDQ0VTJykge1xuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwOTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgc2VydmVyLmdldCgnL2FsaWFzLzphbGlhcycsIChyZXEsIHJlcykgPT4ge1xuICAgICAgICByZXMuc2V0SGVhZGVyKFwiY29udGVudC10eXBlXCIsIFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCIpO1xuICAgICAgICAkJC5mbG93LnN0YXJ0KFwiQnJpY2tzTWFuYWdlclwiKS5yZWFkV2l0aEFsaWFzKHJlcS5wYXJhbXMuYWxpYXMsIHJlcywgKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMDtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFREZTTWlkZGxld2FyZTsiLCJjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIik7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IFBza0hhc2ggPSByZXF1aXJlKCdwc2tjcnlwdG8nKS5Qc2tIYXNoO1xuXG5jb25zdCBmb2xkZXJOYW1lU2l6ZSA9IHByb2Nlc3MuZW52LkZPTERFUl9OQU1FX1NJWkUgfHwgNTtcbmNvbnN0IEZJTEVfU0VQQVJBVE9SID0gJy0nO1xubGV0IHJvb3Rmb2xkZXI7XG5cbiQkLmZsb3cuZGVzY3JpYmUoXCJCcmlja3NNYW5hZ2VyXCIsIHtcbiAgICBpbml0OiBmdW5jdGlvbiAocm9vdEZvbGRlciwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFyb290Rm9sZGVyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJObyByb290IGZvbGRlciBzcGVjaWZpZWQhXCIpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByb290Rm9sZGVyID0gcGF0aC5yZXNvbHZlKHJvb3RGb2xkZXIpO1xuICAgICAgICB0aGlzLl9fZW5zdXJlRm9sZGVyU3RydWN0dXJlKHJvb3RGb2xkZXIsIGZ1bmN0aW9uIChlcnIsIHBhdGgpIHtcbiAgICAgICAgICAgIHJvb3Rmb2xkZXIgPSByb290Rm9sZGVyO1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByb290Rm9sZGVyKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB3cml0ZTogZnVuY3Rpb24gKGZpbGVOYW1lLCByZWFkRmlsZVN0cmVhbSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0aGlzLl9fdmVyaWZ5RmlsZU5hbWUoZmlsZU5hbWUsIGNhbGxiYWNrKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFyZWFkRmlsZVN0cmVhbSB8fCAhcmVhZEZpbGVTdHJlYW0ucGlwZSB8fCB0eXBlb2YgcmVhZEZpbGVTdHJlYW0ucGlwZSAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJTb21ldGhpbmcgd3JvbmcgaGFwcGVuZWRcIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZm9sZGVyTmFtZSA9IHBhdGguam9pbihyb290Zm9sZGVyLCBmaWxlTmFtZS5zdWJzdHIoMCwgZm9sZGVyTmFtZVNpemUpKTtcblxuICAgICAgICBjb25zdCBzZXJpYWwgPSB0aGlzLnNlcmlhbCgoKSA9PiB7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNlcmlhbC5fX2Vuc3VyZUZvbGRlclN0cnVjdHVyZShmb2xkZXJOYW1lLCBzZXJpYWwuX19wcm9ncmVzcyk7XG4gICAgICAgIHNlcmlhbC5fX3dyaXRlRmlsZShyZWFkRmlsZVN0cmVhbSwgZm9sZGVyTmFtZSwgZmlsZU5hbWUsIGNhbGxiYWNrKTtcbiAgICB9LFxuICAgIHJlYWQ6IGZ1bmN0aW9uIChmaWxlTmFtZSwgd3JpdGVGaWxlU3RyZWFtLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIXRoaXMuX192ZXJpZnlGaWxlTmFtZShmaWxlTmFtZSwgY2FsbGJhY2spKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmb2xkZXJQYXRoID0gcGF0aC5qb2luKHJvb3Rmb2xkZXIsIGZpbGVOYW1lLnN1YnN0cigwLCBmb2xkZXJOYW1lU2l6ZSkpO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBmaWxlTmFtZSk7XG4gICAgICAgIHRoaXMuX192ZXJpZnlGaWxlRXhpc3RlbmNlKGZpbGVQYXRoLCAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGlmICghZXJyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fX3JlYWRGaWxlKHdyaXRlRmlsZVN0cmVhbSwgZmlsZVBhdGgsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiTm8gZmlsZSBmb3VuZC5cIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGFkZEFsaWFzOiBmdW5jdGlvbiAoZmlsZW5hbWUsIGFsaWFzLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIXRoaXMuX192ZXJpZnlGaWxlTmFtZShmaWxlTmFtZSwgY2FsbGJhY2spKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWFsaWFzKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiTm8gYWxpYXMgd2FzIHByb3ZpZGVkXCIpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5hbGlhc2VzKSB7XG4gICAgICAgICAgICB0aGlzLmFsaWFzZXMgPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYWxpYXNlc1thbGlhc10gPSBmaWxlbmFtZTtcblxuICAgICAgICBjYWxsYmFjaygpO1xuICAgIH0sXG4gICAgd3JpdGVXaXRoQWxpYXM6IGZ1bmN0aW9uIChhbGlhcywgcmVhZFN0cmVhbSwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgZmlsZU5hbWUgPSB0aGlzLl9fZ2V0RmlsZU5hbWUoYWxpYXMsIGNhbGxiYWNrKTtcbiAgICAgICAgdGhpcy53cml0ZShmaWxlTmFtZSwgcmVhZFN0cmVhbSwgY2FsbGJhY2spO1xuICAgIH0sXG4gICAgcmVhZFdpdGhBbGlhczogZnVuY3Rpb24gKGFsaWFzLCB3cml0ZVN0cmVhbSwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgZmlsZU5hbWUgPSB0aGlzLl9fZ2V0RmlsZU5hbWUoYWxpYXMsIGNhbGxiYWNrKTtcbiAgICAgICAgdGhpcy5yZWFkKGZpbGVOYW1lLCB3cml0ZVN0cmVhbSwgY2FsbGJhY2spO1xuICAgIH0sXG4gICAgcmVhZFZlcnNpb246IGZ1bmN0aW9uIChmaWxlTmFtZSwgZmlsZVZlcnNpb24sIHdyaXRlRmlsZVN0cmVhbSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0aGlzLl9fdmVyaWZ5RmlsZU5hbWUoZmlsZU5hbWUsIGNhbGxiYWNrKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IHBhdGguam9pbihyb290Zm9sZGVyLCBmaWxlTmFtZS5zdWJzdHIoMCwgZm9sZGVyTmFtZVNpemUpKTtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgZmlsZU5hbWUsIGZpbGVWZXJzaW9uKTtcbiAgICAgICAgdGhpcy5fX3ZlcmlmeUZpbGVFeGlzdGVuY2UoZmlsZVBhdGgsIChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFlcnIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9fcmVhZEZpbGUod3JpdGVGaWxlU3RyZWFtLCBwYXRoLmpvaW4oZmlsZVBhdGgpLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihcIk5vIGZpbGUgZm91bmQuXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBnZXRWZXJzaW9uc0ZvckZpbGU6IGZ1bmN0aW9uIChmaWxlTmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0aGlzLl9fdmVyaWZ5RmlsZU5hbWUoZmlsZU5hbWUsIGNhbGxiYWNrKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IHBhdGguam9pbihyb290Zm9sZGVyLCBmaWxlTmFtZS5zdWJzdHIoMCwgZm9sZGVyTmFtZVNpemUpLCBmaWxlTmFtZSk7XG4gICAgICAgIGZzLnJlYWRkaXIoZm9sZGVyUGF0aCwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgdG90YWxOdW1iZXJPZkZpbGVzID0gZmlsZXMubGVuZ3RoO1xuICAgICAgICAgICAgY29uc3QgZmlsZXNEYXRhID0gW107XG5cbiAgICAgICAgICAgIGxldCByZXNvbHZlZEZpbGVzID0gMDtcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3RhbE51bWJlck9mRmlsZXM7ICsraSkge1xuICAgICAgICAgICAgICAgIGZzLnN0YXQocGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGVzW2ldKSwgKGVyciwgc3RhdHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXNEYXRhLnB1c2goe3ZlcnNpb246IGZpbGVzW2ldLCBjcmVhdGlvblRpbWU6IG51bGwsIGNyZWF0aW9uVGltZU1zOiBudWxsfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmaWxlc0RhdGEucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBmaWxlc1tpXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0aW9uVGltZTogc3RhdHMuYmlydGh0aW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRpb25UaW1lTXM6IHN0YXRzLmJpcnRodGltZU1zXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmVkRmlsZXMgKz0gMTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzb2x2ZWRGaWxlcyA+PSB0b3RhbE51bWJlck9mRmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVzRGF0YS5zb3J0KChmaXJzdCwgc2Vjb25kKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlyc3RDb21wYXJlRGF0YSA9IGZpcnN0LmNyZWF0aW9uVGltZU1zIHx8IGZpcnN0LnZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2Vjb25kQ29tcGFyZURhdGEgPSBzZWNvbmQuY3JlYXRpb25UaW1lTXMgfHwgc2Vjb25kLnZlcnNpb247XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlyc3RDb21wYXJlRGF0YSAtIHNlY29uZENvbXBhcmVEYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGZpbGVzRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBjb21wYXJlVmVyc2lvbnM6IGZ1bmN0aW9uIChib2R5U3RyZWFtLCBjYWxsYmFjaykge1xuICAgICAgICBsZXQgYm9keSA9ICcnO1xuXG4gICAgICAgIGJvZHlTdHJlYW0ub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgYm9keSArPSBkYXRhO1xuICAgICAgICB9KTtcblxuICAgICAgICBib2R5U3RyZWFtLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGJvZHkgPSBKU09OLnBhcnNlKGJvZHkpO1xuICAgICAgICAgICAgICAgIHRoaXMuX19jb21wYXJlVmVyc2lvbnMoYm9keSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIF9fdmVyaWZ5RmlsZU5hbWU6IGZ1bmN0aW9uIChmaWxlTmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFmaWxlTmFtZSB8fCB0eXBlb2YgZmlsZU5hbWUgIT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiTm8gZmlsZUlkIHNwZWNpZmllZC5cIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpbGVOYW1lLmxlbmd0aCA8IGZvbGRlck5hbWVTaXplKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJGaWxlSWQgdG9vIHNtYWxsLiBcIiArIGZpbGVOYW1lKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIF9fZW5zdXJlRm9sZGVyU3RydWN0dXJlOiBmdW5jdGlvbiAoZm9sZGVyLCBjYWxsYmFjaykge1xuICAgICAgICBmcy5ta2Rpcihmb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCBjYWxsYmFjayk7XG4gICAgfSxcbiAgICBfX3dyaXRlRmlsZTogZnVuY3Rpb24gKHJlYWRTdHJlYW0sIGZvbGRlclBhdGgsIGZpbGVOYW1lLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBoYXNoID0gcmVxdWlyZShcImNyeXB0b1wiKS5jcmVhdGVIYXNoKFwic2hhMjU2XCIpO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBmaWxlTmFtZSk7XG4gICAgICAgIGZzLmFjY2VzcyhmaWxlUGF0aCwgKGVycikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJlYWRTdHJlYW0ub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBoYXNoLnVwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZVBhdGgsIHttb2RlOiAwbzQ0NH0pO1xuXG4gICAgICAgICAgICAgICAgd3JpdGVTdHJlYW0ub24oXCJmaW5pc2hcIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBoYXNoRGlnZXN0ID0gaGFzaC5kaWdlc3QoXCJoZXhcIik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNoRGlnZXN0ICE9PSBmaWxlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnMudW5saW5rKGZpbGVQYXRoLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiQ29udGVudCBoYXNoIGFuZCBmaWxlbmFtZSBhcmUgbm90IHRoZSBzYW1lXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgd3JpdGVTdHJlYW0ub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHdyaXRlU3RyZWFtLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlYWRTdHJlYW0uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soLi4uYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJlYWRTdHJlYW0ucGlwZSh3cml0ZVN0cmVhbSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBfX2dldE5leHRWZXJzaW9uRmlsZU5hbWU6IGZ1bmN0aW9uIChmb2xkZXJQYXRoLCBmaWxlTmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5fX2dldExhdGVzdFZlcnNpb25OYW1lT2ZGaWxlKGZvbGRlclBhdGgsIChlcnIsIGZpbGVWZXJzaW9uKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGZpbGVWZXJzaW9uLm51bWVyaWNWZXJzaW9uICsgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAsXG4gICAgX19nZXRMYXRlc3RWZXJzaW9uTmFtZU9mRmlsZTogZnVuY3Rpb24gKGZvbGRlclBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGZzLnJlYWRkaXIoZm9sZGVyUGF0aCwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBmaWxlVmVyc2lvbiA9IHtudW1lcmljVmVyc2lvbjogMCwgZnVsbFZlcnNpb246ICcwJyArIEZJTEVfU0VQQVJBVE9SfTtcblxuICAgICAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhbGxWZXJzaW9ucyA9IGZpbGVzLm1hcChmaWxlID0+IGZpbGUuc3BsaXQoRklMRV9TRVBBUkFUT1IpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGF0ZXN0RmlsZSA9IHRoaXMuX19tYXhFbGVtZW50KGFsbFZlcnNpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgZmlsZVZlcnNpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBudW1lcmljVmVyc2lvbjogcGFyc2VJbnQobGF0ZXN0RmlsZSksXG4gICAgICAgICAgICAgICAgICAgICAgICBmdWxsVmVyc2lvbjogZmlsZXMuZmlsdGVyKGZpbGUgPT4gZmlsZS5zcGxpdChGSUxFX1NFUEFSQVRPUilbMF0gPT09IGxhdGVzdEZpbGUudG9TdHJpbmcoKSlbMF1cbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5jb2RlID0gJ2ludmFsaWRfZmlsZV9uYW1lX2ZvdW5kJztcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGZpbGVWZXJzaW9uKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgICxcbiAgICBfX21heEVsZW1lbnQ6IGZ1bmN0aW9uIChudW1iZXJzKSB7XG4gICAgICAgIGxldCBtYXggPSBudW1iZXJzWzBdO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbnVtYmVycy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgbWF4ID0gTWF0aC5tYXgobWF4LCBudW1iZXJzW2ldKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc05hTihtYXgpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZWxlbWVudCBmb3VuZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1heDtcbiAgICB9XG4gICAgLFxuICAgIF9fY29tcGFyZVZlcnNpb25zOiBmdW5jdGlvbiAoZmlsZXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGZpbGVzV2l0aENoYW5nZXMgPSBbXTtcbiAgICAgICAgY29uc3QgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKGZpbGVzKTtcbiAgICAgICAgbGV0IHJlbWFpbmluZyA9IGVudHJpZXMubGVuZ3RoO1xuXG4gICAgICAgIGlmIChlbnRyaWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBmaWxlc1dpdGhDaGFuZ2VzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGVudHJpZXMuZm9yRWFjaCgoW2ZpbGVOYW1lLCBmaWxlSGFzaF0pID0+IHtcbiAgICAgICAgICAgIHRoaXMuZ2V0VmVyc2lvbnNGb3JGaWxlKGZpbGVOYW1lLCAoZXJyLCB2ZXJzaW9ucykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVyci5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gdmVyc2lvbnMuc29tZSh2ZXJzaW9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFzaCA9IHZlcnNpb24udmVyc2lvbi5zcGxpdChGSUxFX1NFUEFSQVRPUilbMV07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoYXNoID09PSBmaWxlSGFzaDtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmICghbWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsZXNXaXRoQ2hhbmdlcy5wdXNoKGZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoLS1yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBmaWxlc1dpdGhDaGFuZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLFxuICAgIF9fcmVhZEZpbGU6IGZ1bmN0aW9uICh3cml0ZUZpbGVTdHJlYW0sIGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCByZWFkU3RyZWFtID0gZnMuY3JlYXRlUmVhZFN0cmVhbShmaWxlUGF0aCk7XG5cbiAgICAgICAgd3JpdGVGaWxlU3RyZWFtLm9uKFwiZmluaXNoXCIsIGNhbGxiYWNrKTtcbiAgICAgICAgd3JpdGVGaWxlU3RyZWFtLm9uKFwiZXJyb3JcIiwgY2FsbGJhY2spO1xuXG4gICAgICAgIHJlYWRTdHJlYW0ucGlwZSh3cml0ZUZpbGVTdHJlYW0pO1xuICAgIH1cbiAgICAsXG4gICAgX19wcm9ncmVzczogZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAsXG4gICAgX192ZXJpZnlGaWxlRXhpc3RlbmNlOiBmdW5jdGlvbiAoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGZzLmFjY2VzcyhmaWxlUGF0aCwgY2FsbGJhY2spO1xuICAgIH1cbiAgICAsXG4gICAgX19nZXRGaWxlTmFtZTogZnVuY3Rpb24gKGFsaWFzLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIXRoaXMuYWxpYXNlcykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcIk5vIGZpbGVzIGhhdmUgYmVlbiBhc3NvY2lhdGVkIHdpdGggYWxpYXNlc1wiKSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZmlsZU5hbWUgPSB0aGlzLmFsaWFzZXNbYWxpYXNdO1xuICAgICAgICBpZiAoIWZpbGVOYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiVGhlIHNwZWNpZmllZCBhbGlhcyB3YXMgbm90IGFzc29jaWF0ZWQgd2l0aCBhbnkgZmlsZVwiKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmlsZU5hbWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLFxufSk7XG4iLCJjb25zdCBwc2tDcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuXG5mdW5jdGlvbiBCcmljayhkYXRhKSB7XG4gICAgaWYgKHR5cGVvZiBkYXRhID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGRhdGEgPSBCdWZmZXIuZnJvbShkYXRhKTtcbiAgICB9XG5cbiAgICB0aGlzLmdlbmVyYXRlSGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHBza0NyeXB0by5wc2tIYXNoKGRhdGEpLnRvU3RyaW5nKFwiaGV4XCIpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldERhdGEgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQnJpY2s7IiwiY29uc3QgY3J5cHRvID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcblxuXG5mdW5jdGlvbiBDU0JJZGVudGlmaWVyKGlkLCBkb21haW4sIGtleUxlbiA9IDMyKSB7XG4gICAgbGV0IHNlZWQ7XG4gICAgbGV0IGRzZWVkO1xuICAgIGxldCB1aWQ7XG4gICAgbGV0IGVuY1NlZWQ7XG4gICAgLy9UT0RPOiBlbGltaW5hdGUgdW51c2VkIHZhclxuICAgIC8vIGxldCBlbmNEc2VlZDtcblxuICAgIGluaXQoKTtcblxuICAgIHRoaXMuZ2V0U2VlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYoIXNlZWQpe1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJldHVybiBzZWVkLiBBY2Nlc3MgaXMgZGVuaWVkLlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKHNlZWQpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldERzZWVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZihkc2VlZCl7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybShkc2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZihzZWVkKXtcbiAgICAgICAgICAgIGRzZWVkID0gZGVyaXZlU2VlZChzZWVkKTtcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKGRzZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXR1cm4gZGVyaXZlZCBzZWVkLiBBY2Nlc3MgaXMgZGVuaWVkLlwiKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRVaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKHVpZCl7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybSh1aWQpLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZihkc2VlZCl7XG4gICAgICAgICAgICB1aWQgPSBjb21wdXRlVWlkKGRzZWVkKTtcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZUNvbXBhY3RGb3JtKHVpZCkudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHNlZWQpe1xuICAgICAgICAgICAgZHNlZWQgPSBkZXJpdmVTZWVkKHNlZWQpO1xuICAgICAgICAgICAgdWlkID0gY29tcHV0ZVVpZChkc2VlZCk7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybSh1aWQpLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcmV0dXJuIHVpZFwiKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRFbmNTZWVkID0gZnVuY3Rpb24gKGVuY3J5cHRpb25LZXkpIHtcbiAgICAgICAgaWYoZW5jU2VlZCl7XG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVDb21wYWN0Rm9ybShlbmNTZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCFzZWVkKXtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXR1cm4gZW5jU2VlZC4gQWNjZXNzIGlzIGRlbmllZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZW5jcnlwdGlvbktleSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJldHVybiBlbmNTZWVkLiBObyBlbmNyeXB0aW9uIGtleSB3YXMgcHJvdmlkZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvL1RPRE86IGVuY3J5cHQgc2VlZCB1c2luZyBlbmNyeXB0aW9uS2V5LiBFbmNyeXB0aW9uIGFsZ29yaXRobSByZW1haW5zIHRvIGJlIGNob3NlblxuICAgIH07XG5cblxuXG4gICAgdGhpcy5nZXREb21haW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKHNlZWQpe1xuICAgICAgICAgICAgcmV0dXJuIHNlZWQuZG9tYWluO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoZHNlZWQpe1xuICAgICAgICAgICAgcmV0dXJuIGRzZWVkLmRvbWFpbjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkJhY2t1cCBVUkxzIGNvdWxkIG5vdCBiZSByZXRyaWV2ZWQuIEFjY2VzcyBpcyBkZW5pZWRcIik7XG4gICAgfTtcblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGludGVybmFsIG1ldGhvZHMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgICAgaWYgKCFpZCkge1xuICAgICAgICAgICAgaWYgKCFkb21haW4pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBkb21haW5zIHByb3ZpZGVkLlwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2VlZCA9IGNyZWF0ZSgpO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGNsYXNzaWZ5SWQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsYXNzaWZ5SWQoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaWQgIT09IFwic3RyaW5nXCIgJiYgIUJ1ZmZlci5pc0J1ZmZlcihpZCkgJiYgISh0eXBlb2YgaWQgPT09IFwib2JqZWN0XCIgJiYgIUJ1ZmZlci5pc0J1ZmZlcihpZCkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYElkIG11c3QgYmUgYSBzdHJpbmcgb3IgYSBidWZmZXIuIFRoZSB0eXBlIHByb3ZpZGVkIHdhcyAke3R5cGVvZiBpZH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGV4cGFuZGVkSWQgPSBsb2FkKGlkKTtcbiAgICAgICAgc3dpdGNoKGV4cGFuZGVkSWQudGFnKXtcbiAgICAgICAgICAgIGNhc2UgJ3MnOlxuICAgICAgICAgICAgICAgIHNlZWQgPSBleHBhbmRlZElkO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZCc6XG4gICAgICAgICAgICAgICAgZHNlZWQgPSBleHBhbmRlZElkO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndSc6XG4gICAgICAgICAgICAgICAgdWlkID0gZXhwYW5kZWRJZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2VzJzpcbiAgICAgICAgICAgICAgICBlbmNTZWVkID0gZXhwYW5kZWRJZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2VkJzpcbiAgICAgICAgICAgICAgICBlbmNEc2VlZCA9IGV4cGFuZGVkSWQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0YWcnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgICAgICAgY29uc3QgbG9jYWxTZWVkID0ge307XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShkb21haW4pKSB7XG4gICAgICAgICAgICBkb21haW4gPSBbIGRvbWFpbiBdO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9jYWxTZWVkLnRhZyAgICA9ICdzJztcbiAgICAgICAgbG9jYWxTZWVkLnJhbmRvbSA9IGNyeXB0by5yYW5kb21CeXRlcyhrZXlMZW4pO1xuICAgICAgICBsb2NhbFNlZWQuZG9tYWluID0gZG9tYWluO1xuXG4gICAgICAgIHJldHVybiBsb2NhbFNlZWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVyaXZlU2VlZChzZWVkKSB7XG4gICAgICAgIGxldCBjb21wYWN0U2VlZCA9IHNlZWQ7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBzZWVkID09PSAnb2JqZWN0JyAmJiAhQnVmZmVyLmlzQnVmZmVyKHNlZWQpKSB7XG4gICAgICAgICAgICBjb21wYWN0U2VlZCA9IGdlbmVyYXRlQ29tcGFjdEZvcm0oc2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHNlZWQpKSB7XG4gICAgICAgICAgICBjb21wYWN0U2VlZCA9IHNlZWQudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb21wYWN0U2VlZFswXSA9PT0gJ2QnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RyaWVkIHRvIGRlcml2ZSBhbiBhbHJlYWR5IGRlcml2ZWQgc2VlZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRlY29kZWRDb21wYWN0U2VlZCA9IGRlY29kZVVSSUNvbXBvbmVudChjb21wYWN0U2VlZCk7XG4gICAgICAgIGNvbnN0IHNwbGl0Q29tcGFjdFNlZWQgPSBkZWNvZGVkQ29tcGFjdFNlZWQuc3Vic3RyaW5nKDEpLnNwbGl0KCd8Jyk7XG4gICAgICAgIGNvbnN0IHN0clNlZWQgPSBCdWZmZXIuZnJvbShzcGxpdENvbXBhY3RTZWVkWzBdLCAnYmFzZTY0JykudG9TdHJpbmcoJ2hleCcpO1xuICAgICAgICBjb25zdCBkb21haW4gPSBCdWZmZXIuZnJvbShzcGxpdENvbXBhY3RTZWVkWzFdLCAnYmFzZTY0JykudG9TdHJpbmcoKTtcbiAgICAgICAgY29uc3QgZHNlZWQgPSB7fTtcblxuICAgICAgICBkc2VlZC50YWcgPSAnZCc7XG4gICAgICAgIGRzZWVkLnJhbmRvbSA9IGNyeXB0by5kZXJpdmVLZXkoc3RyU2VlZCwgbnVsbCwga2V5TGVuKTtcbiAgICAgICAgZHNlZWQuZG9tYWluID0gSlNPTi5wYXJzZShkb21haW4pO1xuXG4gICAgICAgIHJldHVybiBkc2VlZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb21wdXRlVWlkKGRzZWVkKXtcbiAgICAgICAgaWYoIWRzZWVkKXtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRzZWVkIHdhcyBub3QgcHJvdmlkZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGRzZWVkID09PSBcIm9iamVjdFwiICYmICFCdWZmZXIuaXNCdWZmZXIoZHNlZWQpKSB7XG4gICAgICAgICAgICBkc2VlZCA9IGdlbmVyYXRlQ29tcGFjdEZvcm0oZHNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdWlkID0ge307XG4gICAgICAgIHVpZC50YWcgPSAndSc7XG4gICAgICAgIHVpZC5yYW5kb20gPSBCdWZmZXIuZnJvbShjcnlwdG8uZ2VuZXJhdGVTYWZlVWlkKGRzZWVkKSk7XG5cbiAgICAgICAgcmV0dXJuIHVpZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZW5lcmF0ZUNvbXBhY3RGb3JtKHt0YWcsIHJhbmRvbSwgZG9tYWlufSkge1xuICAgICAgICBsZXQgY29tcGFjdElkID0gdGFnICsgcmFuZG9tLnRvU3RyaW5nKCdiYXNlNjQnKTtcbiAgICAgICAgaWYgKGRvbWFpbikge1xuICAgICAgICAgICAgY29tcGFjdElkICs9ICd8JyArIEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KGRvbWFpbikpLnRvU3RyaW5nKCdiYXNlNjQnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gQnVmZmVyLmZyb20oZW5jb2RlVVJJQ29tcG9uZW50KGNvbXBhY3RJZCkpO1xuICAgIH1cblxuICAgIC8vIFRPRE86IHVudXNlZCBmdW5jdGlvbiEhIVxuICAgIC8vIGZ1bmN0aW9uIGVuY3J5cHQoaWQsIGVuY3J5cHRpb25LZXkpIHtcbiAgICAvLyAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCAhPT0gMil7XG4gICAgLy8gICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFdyb25nIG51bWJlciBvZiBhcmd1bWVudHMuIEV4cGVjdGVkOiAyOyBwcm92aWRlZCAke2FyZ3VtZW50cy5sZW5ndGh9YCk7XG4gICAgLy8gICAgIH1cblxuICAgIC8vICAgICBsZXQgdGFnO1xuICAgIC8vICAgICBpZiAodHlwZW9mIGlkID09PSBcIm9iamVjdFwiICYmICFCdWZmZXIuaXNCdWZmZXIoaWQpKSB7XG4gICAgLy8gICAgICAgICB0YWcgPSBpZC50YWc7XG4gICAgLy8gICAgICAgICBpZCA9IGdlbmVyYXRlQ29tcGFjdEZvcm0oaWQpO1xuICAgIC8vICAgICB9XG5cbiAgICAvLyAgICAgaWYgKHRhZyA9PT0gJ3MnKSB7XG4gICAgLy8gICAgICAgICAvL1RPRE8gZW5jcnlwdCBzZWVkXG4gICAgLy8gICAgIH1lbHNlIGlmICh0YWcgPT09ICdkJykge1xuICAgIC8vICAgICAgICAgLy9UT0RPIGVuY3J5cHQgZHNlZWRcbiAgICAvLyAgICAgfWVsc2V7XG4gICAgLy8gICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgcHJvdmlkZWQgaWQgY2Fubm90IGJlIGVuY3J5cHRlZFwiKTtcbiAgICAvLyAgICAgfVxuXG4gICAgLy8gfVxuXG4gICAgZnVuY3Rpb24gbG9hZChjb21wYWN0SWQpIHtcbiAgICAgICAgaWYodHlwZW9mIGNvbXBhY3RJZCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCB0eXBlIHN0cmluZyBvciBCdWZmZXIuIFJlY2VpdmVkIHVuZGVmaW5lZGApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodHlwZW9mIGNvbXBhY3RJZCAhPT0gXCJzdHJpbmdcIil7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbXBhY3RJZCA9PT0gXCJvYmplY3RcIiAmJiAhQnVmZmVyLmlzQnVmZmVyKGNvbXBhY3RJZCkpIHtcbiAgICAgICAgICAgICAgICBjb21wYWN0SWQgPSBCdWZmZXIuZnJvbShjb21wYWN0SWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb21wYWN0SWQgPSBjb21wYWN0SWQudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRlY29kZWRDb21wYWN0SWQgPSBkZWNvZGVVUklDb21wb25lbnQoY29tcGFjdElkKTtcbiAgICAgICAgY29uc3QgaWQgPSB7fTtcbiAgICAgICAgY29uc3Qgc3BsaXRDb21wYWN0SWQgPSBkZWNvZGVkQ29tcGFjdElkLnN1YnN0cmluZygxKS5zcGxpdCgnfCcpO1xuXG4gICAgICAgIGlkLnRhZyA9IGRlY29kZWRDb21wYWN0SWRbMF07XG4gICAgICAgIGlkLnJhbmRvbSA9IEJ1ZmZlci5mcm9tKHNwbGl0Q29tcGFjdElkWzBdLCAnYmFzZTY0Jyk7XG5cbiAgICAgICAgaWYoc3BsaXRDb21wYWN0SWRbMV0gJiYgc3BsaXRDb21wYWN0SWRbMV0ubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICBpZC5kb21haW4gPSBKU09OLnBhcnNlKEJ1ZmZlci5mcm9tKHNwbGl0Q29tcGFjdElkWzFdLCAnYmFzZTY0JykudG9TdHJpbmcoKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENTQklkZW50aWZpZXI7XG4iLCJjb25zdCBEU2VlZENhZ2UgPSByZXF1aXJlKFwiLi4vdXRpbHMvRHNlZWRDYWdlXCIpO1xuY29uc3QgUm9vdENTQiA9IHJlcXVpcmUoXCIuL1Jvb3RDU0JcIik7XG5cbmZ1bmN0aW9uIEVERlMoKXtcblxuICAgIHRoaXMuZ2V0RHNlZWRDYWdlID0gZnVuY3Rpb24gKGxvY2FsRm9sZGVyKSB7XG4gICAgICAgIHJldHVybiBuZXcgRFNlZWRDYWdlKGxvY2FsRm9sZGVyKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRSb290Q1NCID0gZnVuY3Rpb24gKGNzYklkZW50aWZpZXIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSb290Q1NCKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBjc2JJZGVudGlmaWVyKTtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVERlM7IiwiY29uc3QgcHNrZGIgPSByZXF1aXJlKFwicHNrZGJcIik7XG5cbmZ1bmN0aW9uIEVERlNCbG9ja2NoYWluUHJveHkoKSB7XG5cblx0Y29uc3QgYmxvY2tjaGFpbiA9IHBza2RiLnN0YXJ0SW5NZW1vcnlEQigpO1xuXG5cdHRoaXMuZ2V0Q1NCQW5jaG9yID0gZnVuY3Rpb24gKGNzYklkZW50aWZpZXIsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgdHJhbnNhY3Rpb24gPSBibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuXHRcdGNvbnN0IGFzc2V0ID0gdHJhbnNhY3Rpb24ubG9va3VwKFwiZ2xvYmFsLkNTQkFuY2hvclwiLCBjc2JJZGVudGlmaWVyLmdldFVpZCgpKTtcblx0XHRjYWxsYmFjayh1bmRlZmluZWQsIGFzc2V0KTtcblx0fTtcblxuXHR0aGlzLnNldENTQkFuY2hvciA9IGZ1bmN0aW9uIChjc2JBbmNob3IsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgdHJhbnNhY3Rpb24gPSBibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuXHRcdHRyYW5zYWN0aW9uLmFkZChjc2JBbmNob3IpO1xuXHRcdGJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcblx0XHRjYWxsYmFjaygpO1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVERlNCbG9ja2NoYWluUHJveHk7IiwiY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jb25zdCBFREZTQnJpY2tTdG9yYWdlID0gcmVxdWlyZShcImVkZnMtYnJpY2stc3RvcmFnZVwiKTtcbmNvbnN0IEJyaWNrID0gcmVxdWlyZShcIi4vQnJpY2tcIik7XG5jb25zdCBwc2tDcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuY29uc3QgQXN5bmNEaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uL3V0aWxzL0FzeW5jRGlzcGF0Y2hlclwiKTtcbmNvbnN0IHVybCA9IFwiaHR0cDovL2xvY2FsaG9zdDo4MDgwXCI7XG5cbmZ1bmN0aW9uIEZpbGVIYW5kbGVyKGZpbGVQYXRoLCBicmlja1NpemUsIGZpbGVCcmlja3NIYXNoZXMsIGxhc3RCcmlja1NpemUpIHtcblxuICAgIGNvbnN0IGVkZnNTZXJ2aWNlUHJveHkgPSBFREZTQnJpY2tTdG9yYWdlLmNyZWF0ZUVERlNCcmlja1N0b3JhZ2UodXJsKTtcblxuXG4gICAgdGhpcy5nZXRGaWxlQnJpY2tzSGFzaGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmlsZUJyaWNrc0hhc2hlcztcblxuICAgIH07XG5cbiAgICB0aGlzLnNhdmVGaWxlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgIF9faW5pdGlhbFNhdmluZyhjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9faW5pdGlhbFNhdmluZyhjYWxsYmFjaykge1xuICAgICAgICBmcy5zdGF0KGZpbGVQYXRoLCAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygoZXJyKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxhc3RCcmlja1NpemUgPSBzdGF0cy5zaXplICUgYnJpY2tTaXplO1xuICAgICAgICAgICAgY29uc3QgZmlsZVNpemUgPSBzdGF0cy5zaXplO1xuXG4gICAgICAgICAgICBmcy5vcGVuKGZpbGVQYXRoLCBcInJcIiwgKGVyciwgZmQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGFzeW5jRGlzcGF0Y2hlciA9IG5ldyBBc3luY0Rpc3BhdGNoZXIoKGVycm9ycywgcmVzdWx0cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9Ccmlja3MgPSBNYXRoLnJvdW5kKGZpbGVTaXplIC8gYnJpY2tTaXplICsgMSk7XG4gICAgICAgICAgICAgICAgYXN5bmNEaXNwYXRjaGVyLmRpc3BhdGNoRW1wdHkobm9Ccmlja3MpO1xuXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub0JyaWNrczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBicmlja0RhdGEgPSBCdWZmZXIuYWxsb2MoYnJpY2tTaXplKTtcbiAgICAgICAgICAgICAgICAgICAgZnMucmVhZChmZCwgYnJpY2tEYXRhLCAwLCBicmlja1NpemUsIGkgKiBicmlja1NpemUsIChlcnIsIGJ5dGVzUmVhZCwgYnVmZmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJyaWNrID0gbmV3IEJyaWNrKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBlZGZzU2VydmljZVByb3h5LnB1dEJyaWNrKGJyaWNrLCAoZXJyKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfX3JlYWRGaWxlRnJvbVN0YXJ0KGZkLCBicmlja1NpemUsIGZpbGVTaXplLCBwb3NpdGlvbiwgYnJpY2tzSGFzaGVzID0gW10sIGNhbGxiYWNrKSB7XG4gICAgICAgIGxldCBicmlja0RhdGEgPSBCdWZmZXIuYWxsb2MoYnJpY2tTaXplKTtcbiAgICAgICAgZnMucmVhZChmZCwgYnJpY2tEYXRhLCAwLCBicmlja1NpemUsIHBvc2l0aW9uLCAoZXJyLCBieXRlc1JlYWQsIGJ1ZmZlcikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwb3NpdGlvbiArPSBicmlja1NpemU7XG4gICAgICAgICAgICBicmlja3NIYXNoZXMucHVzaChwc2tDcnlwdG8ucHNrSGFzaChidWZmZXIpKTtcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbiA8PSBmaWxlU2l6ZSkge1xuICAgICAgICAgICAgICAgIF9fcmVhZEZpbGVGcm9tU3RhcnQoZmQsIGJyaWNrU2l6ZSwgZmlsZVNpemUsIHBvc2l0aW9uLCBicmlja3NIYXNoZXMsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGxhc3RCcmlja1NpemUgPSBieXRlc1JlYWQ7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBicmlja3NIYXNoZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfX3JlYWRGaWxlQmFja3dhcmRzKGZkLCBicmlja1NpemUsIGZpbGVTaXplLCBwb3NpdGlvbiA9IGxhc3RCcmlja1NpemUsIGJyaWNrc0hhc2hlcyA9IFtdLCBjYWxsYmFjaykge1xuXG4gICAgICAgIGxldCBicmlja0RhdGEgPSBCdWZmZXIuYWxsb2MoYnJpY2tTaXplKTtcbiAgICAgICAgZnMucmVhZChmZCwgYnJpY2tEYXRhLCAwLCBicmlja1NpemUsIGZpbGVTaXplIC0gcG9zaXRpb24sIChlcnIsIGJ5dGVzUmVhZCwgYnVmZmVyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyaWNrc0hhc2hlcy5wdXNoKHBza0NyeXB0by5wc2tIYXNoKGJ1ZmZlcikpO1xuICAgICAgICAgICAgaWYgKHBvc2l0aW9uIDw9IGZpbGVTaXplKSB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb24gKz0gYnJpY2tTaXplO1xuICAgICAgICAgICAgICAgIF9fcmVhZEZpbGVCYWNrd2FyZHMoZmQsIGJyaWNrU2l6ZSwgZmlsZVNpemUsIHBvc2l0aW9uLCBjYWxsYmFjaylcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVIYW5kbGVyO1xuXG4vL3JkaWZmIGFsZ29yaXRobVxuLy9cbiIsImNvbnN0IEJyaWNrID0gcmVxdWlyZShcIi4vQnJpY2tcIik7XG5jb25zdCBwc2tDcnlwdG8gPSByZXF1aXJlKFwicHNrY3J5cHRvXCIpO1xuXG5mdW5jdGlvbiBIZWFkZXIocHJldmlvdXNIZWFkZXJIYXNoLCBmaWxlcywgdHJhbnNhY3Rpb25zKXtcbiAgICBwcmV2aW91c0hlYWRlckhhc2ggPSBwcmV2aW91c0hlYWRlckhhc2ggfHwgXCJcIjtcbiAgICBmaWxlcyA9IGZpbGVzIHx8IHt9O1xuICAgIHRyYW5zYWN0aW9ucyA9IHRyYW5zYWN0aW9ucyB8fCBbXTtcblxuICAgIHRoaXMudG9CcmljayA9IGZ1bmN0aW9uIChlbmNyeXB0aW9uS2V5KSB7XG4gICAgICAgIGNvbnN0IGhlYWRlck9iaiA9IHtwcmV2aW91c0hlYWRlckhhc2gsIGZpbGVzLCB0cmFuc2FjdGlvbnN9O1xuICAgICAgICBjb25zdCBlbmNyeXB0ZWRIZWFkZXJPYmogPSBwc2tDcnlwdG8uZW5jcnlwdChoZWFkZXJPYmosIGVuY3J5cHRpb25LZXkpO1xuICAgICAgICByZXR1cm4gbmV3IEJyaWNrKGVuY3J5cHRlZEhlYWRlck9iaik7XG4gICAgfTtcblxuICAgIHRoaXMuZnJvbUJyaWNrID0gZnVuY3Rpb24gKGJyaWNrLCBkZWNyeXB0aW9uS2V5KSB7XG4gICAgICAgIGNvbnN0IGhlYWRlck9iaiA9IEpTT04ucGFyc2UocHNrQ3J5cHRvLmRlY3J5cHQoYnJpY2ssIGRlY3J5cHRpb25LZXkpKTtcbiAgICAgICAgcHJldmlvdXNIZWFkZXJIYXNoID0gaGVhZGVyT2JqLnByZXZpb3VzSGVhZGVySGFzaDtcbiAgICAgICAgZmlsZXMgPSBoZWFkZXJPYmouZmlsZXM7XG4gICAgICAgIHRyYW5zYWN0aW9ucyA9IGhlYWRlck9iai50cmFuc2FjdGlvbnM7XG4gICAgfTtcblxuICAgIHRoaXMuc2V0UHJldmlvdXNIZWFkZXJIYXNoID0gZnVuY3Rpb24gKGhhc2gpIHtcbiAgICAgICAgcHJldmlvdXNIZWFkZXJIYXNoID0gaGFzaDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRQcmV2aW91c0hlYWRlckhhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBwcmV2aW91c0hlYWRlckhhc2g7XG4gICAgfTtcblxuICAgIHRoaXMuYWRkVHJhbnNhY3Rpb25zID0gZnVuY3Rpb24gKG5ld1RyYW5zYWN0aW9ucykge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobmV3VHJhbnNhY3Rpb25zKSkge1xuICAgICAgICAgICAgbmV3VHJhbnNhY3Rpb25zID0gWyBuZXdUcmFuc2FjdGlvbnMgXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyYW5zYWN0aW9ucyA9IHRyYW5zYWN0aW9ucy5jb25jYXQobmV3VHJhbnNhY3Rpb25zKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRUcmFuc2FjdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0cmFuc2FjdGlvbnM7XG4gICAgfTtcblxuICAgIHRoaXMuYWRkRmlsZXMgPSBmdW5jdGlvbiAobmV3RmlsZXMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBuZXdGaWxlcyAhPT0gXCJvYmplY3RcIiB8fCBBcnJheS5pc0FycmF5KG5ld0ZpbGVzKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHR5cGUuIEV4cGVjdGVkIG5vbi1hcnJheSBvYmplY3QnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5ld0ZpbGVzS2V5cyA9IE9iamVjdC5rZXlzKG5ld0ZpbGVzKTtcbiAgICAgICAgbmV3RmlsZXNLZXlzLmZvckVhY2goKGZpbGVBbGlhcykgPT4ge1xuICAgICAgICAgICAgZmlsZXNbZmlsZUFsaWFzXSA9IG5ld0ZpbGVzW2ZpbGVBbGlhc107XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEZpbGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmlsZXM7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SGVhZGVyT2JqZWN0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwcmV2aW91c0hlYWRlckhhc2gsXG4gICAgICAgICAgICBmaWxlcyxcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uc1xuICAgICAgICB9O1xuICAgIH07XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBIZWFkZXI7IiwiY29uc3QgQnJpY2sgPSByZXF1aXJlKFwiLi9Ccmlja1wiKTtcbmNvbnN0IHBza0NyeXB0byA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5cbmZ1bmN0aW9uIEhlYWRlcnNIaXN0b3J5KGluaXRIZWFkZXJzKSB7XG5cbiAgICBsZXQgaGVhZGVycyA9IGluaXRIZWFkZXJzIHx8IFtdO1xuICAgIHRoaXMuYWRkSGVhZGVyID0gZnVuY3Rpb24gKGhlYWRlckJyaWNrLCBlbmNyeXB0aW9uS2V5KSB7XG4gICAgICAgIGNvbnN0IGhlYWRlckVudHJ5ID0ge307XG4gICAgICAgIGNvbnN0IGhlYWRlckhhc2ggPSBoZWFkZXJCcmljay5nZW5lcmF0ZUhhc2goKTtcbiAgICAgICAgaGVhZGVyRW50cnlbaGVhZGVySGFzaF0gPSBlbmNyeXB0aW9uS2V5O1xuICAgICAgICBoZWFkZXJzLnB1c2goaGVhZGVyRW50cnkpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEhlYWRlcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBoZWFkZXJzO1xuICAgIH07XG5cbiAgICB0aGlzLmdldExhc3RIZWFkZXJIYXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoaGVhZGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBoZWFkZXJFbnRyeSA9IGhlYWRlcnNbaGVhZGVycy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhoZWFkZXJFbnRyeSlbMF07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy50b0JyaWNrID0gZnVuY3Rpb24gKGVuY3J5cHRpb25LZXkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBCcmljayhwc2tDcnlwdG8uZW5jcnlwdChoZWFkZXJzLCBlbmNyeXB0aW9uS2V5KSk7XG4gICAgfTtcblxuICAgIHRoaXMuZnJvbUJyaWNrID0gZnVuY3Rpb24gKGJyaWNrLCBkZWNyeXB0aW9uS2V5KSB7XG4gICAgICAgIGhlYWRlcnMgPSBKU09OLnBhcnNlKHBza0NyeXB0by5kZWNyeXB0KGJyaWNrLCBkZWNyeXB0aW9uS2V5KS50b1N0cmluZygpKTtcbiAgICB9O1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSGVhZGVyc0hpc3Rvcnk7IiwiY29uc3QgT3dNID0gcmVxdWlyZSgnc3dhcm11dGlscycpLk93TTtcbmNvbnN0IHBza2RiID0gcmVxdWlyZSgncHNrZGInKTtcblxuZnVuY3Rpb24gUmF3Q1NCKGluaXREYXRhKSB7XG5cdGNvbnN0IGRhdGEgPSBuZXcgT3dNKHtibG9ja2NoYWluOiBpbml0RGF0YX0pO1xuXHRjb25zdCBibG9ja2NoYWluID0gcHNrZGIuc3RhcnREYih7Z2V0SW5pdFZhbHVlcywgcGVyc2lzdH0pO1xuXG5cdGlmKCFkYXRhLmJsb2NrY2hhaW4pIHtcblx0XHRkYXRhLmJsb2NrY2hhaW4gPSB7XG5cdFx0XHR0cmFuc2FjdGlvbkxvZzogW11cblx0XHR9O1xuXHR9XG5cblx0ZGF0YS5lbWJlZEZpbGUgPSBmdW5jdGlvbiAoZmlsZUFsaWFzLCBmaWxlRGF0YSkge1xuXHRcdGNvbnN0IGVtYmVkZGVkQXNzZXQgPSBkYXRhLmdldEFzc2V0KFwiZ2xvYmFsLkVtYmVkZGVkRmlsZVwiLCBmaWxlQWxpYXMpO1xuXHRcdGlmKGVtYmVkZGVkQXNzZXQuaXNQZXJzaXN0ZWQoKSl7XG5cdFx0XHRjb25zb2xlLmxvZyhgRmlsZSB3aXRoIGFsaWFzICR7ZmlsZUFsaWFzfSBhbHJlYWR5IGV4aXN0c2ApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGRhdGEuYmxvY2tjaGFpbi5lbWJlZGRlZEZpbGVzW2ZpbGVBbGlhc10gPSBmaWxlRGF0YTtcblx0XHRkYXRhLnNhdmVBc3NldChlbWJlZGRlZEFzc2V0KTtcblx0fTtcblxuXHRkYXRhLmF0dGFjaEZpbGUgPSBmdW5jdGlvbiAoZmlsZUFsaWFzLCBwYXRoLCBzZWVkKSB7XG5cdFx0ZGF0YS5tb2RpZnlBc3NldChcImdsb2JhbC5GaWxlUmVmZXJlbmNlXCIsIGZpbGVBbGlhcywgKGZpbGUpID0+IHtcblx0XHRcdGlmICghZmlsZS5pc0VtcHR5KCkpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coYEZpbGUgd2l0aCBhbGlhcyAke2ZpbGVBbGlhc30gYWxyZWFkeSBleGlzdHNgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG4vL1xuXHRcdFx0ZmlsZS5pbml0KGZpbGVBbGlhcywgcGF0aCwgc2VlZCk7XG5cdFx0fSk7XG5cdH07XG5cblx0ZGF0YS5zYXZlQXNzZXQgPSBmdW5jdGlvbihhc3NldCkge1xuXHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcblx0XHR0cmFuc2FjdGlvbi5hZGQoYXNzZXQpO1xuXHRcdGJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcblx0fTtcblxuXHRkYXRhLm1vZGlmeUFzc2V0ID0gZnVuY3Rpb24oYXNzZXRUeXBlLCBhaWQsIGFzc2V0TW9kaWZpZXIpIHtcblx0XHRjb25zdCB0cmFuc2FjdGlvbiA9IGJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG5cdFx0Y29uc3QgYXNzZXQgPSB0cmFuc2FjdGlvbi5sb29rdXAoYXNzZXRUeXBlLCBhaWQpO1xuXHRcdGFzc2V0TW9kaWZpZXIoYXNzZXQpO1xuXG5cdFx0dHJhbnNhY3Rpb24uYWRkKGFzc2V0KTtcblx0XHRibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG5cdH07XG5cblx0ZGF0YS5nZXRBc3NldCA9IGZ1bmN0aW9uIChhc3NldFR5cGUsIGFpZCkge1xuXHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcblx0XHRyZXR1cm4gdHJhbnNhY3Rpb24ubG9va3VwKGFzc2V0VHlwZSwgYWlkKTtcblx0fTtcblxuXHRkYXRhLmdldEFsbEFzc2V0cyA9IGZ1bmN0aW9uKGFzc2V0VHlwZSkge1xuXHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcblx0XHRyZXR1cm4gdHJhbnNhY3Rpb24ubG9hZEFzc2V0cyhhc3NldFR5cGUpO1xuXHR9O1xuXG5cdGRhdGEuYXBwbHlUcmFuc2FjdGlvbiA9IGZ1bmN0aW9uICh0cmFuc2FjdGlvblN3YXJtKSB7XG5cdFx0Ly8gY29uc3QgdHJhbnNhY3Rpb24gPSBibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24odHJhbnNhY3Rpb25Td2FybSk7XG5cdFx0YmxvY2tjaGFpbi5jb21taXRTd2FybSh0cmFuc2FjdGlvblN3YXJtKTtcblx0XHQvLyBibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG5cdH07XG5cblx0ZGF0YS5nZXRUcmFuc2FjdGlvbkxvZyA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gZGF0YS5ibG9ja2NoYWluLnRyYW5zYWN0aW9uTG9nO1xuXHR9O1xuXHQvKiBpbnRlcm5hbCBmdW5jdGlvbnMgKi9cblxuXHRmdW5jdGlvbiBwZXJzaXN0KHRyYW5zYWN0aW9uTG9nLCBjdXJyZW50VmFsdWVzLCBjdXJyZW50UHVsc2UpIHtcblx0XHR0cmFuc2FjdGlvbkxvZy5jdXJyZW50UHVsc2UgPSBjdXJyZW50UHVsc2U7XG5cblx0XHRkYXRhLmJsb2NrY2hhaW4uY3VycmVudFZhbHVlcyA9IGN1cnJlbnRWYWx1ZXM7XG5cdFx0ZGF0YS5ibG9ja2NoYWluLnRyYW5zYWN0aW9uTG9nLnB1c2godHJhbnNhY3Rpb25Mb2cpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0SW5pdFZhbHVlcyAoKSB7XG5cdFx0aWYoIWRhdGEuYmxvY2tjaGFpbiB8fCAhZGF0YS5ibG9ja2NoYWluLmN1cnJlbnRWYWx1ZXMpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRyZXR1cm4gZGF0YS5ibG9ja2NoYWluLmN1cnJlbnRWYWx1ZXM7XG5cdH1cblxuXHQvLyBUT0RPOiB1bnVzZWQgZnVuY3Rpb25cbiAgICAvLyBmdW5jdGlvbiBta1NpbmdsZUxpbmUoc3RyKSB7XG5cdC8vIFx0cmV0dXJuIHN0ci5yZXBsYWNlKC9cXG58XFxyL2csIFwiXCIpO1xuXHQvLyB9XG5cblx0cmV0dXJuIGRhdGE7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmF3Q1NCOyIsImNvbnN0IFJhd0NTQiA9IHJlcXVpcmUoJy4vUmF3Q1NCJyk7XG5jb25zdCBjcnlwdG8gPSByZXF1aXJlKCdwc2tjcnlwdG8nKTtcbi8vVE9ETzogdW51c2VkIHZhclxuLy8gY29uc3QgQ1NCQ2FjaGUgPSByZXF1aXJlKFwiLi9DU0JDYWNoZVwiKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKFwiLi9DU0JJZGVudGlmaWVyXCIpO1xuY29uc3QgSGVhZGVyID0gcmVxdWlyZShcIi4vSGVhZGVyXCIpO1xuY29uc3QgSGVhZGVyc0hpc3RvcnkgPSByZXF1aXJlKFwiLi9IZWFkZXJzSGlzdG9yeVwiKTtcbmNvbnN0IEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpO1xuY29uc3QgRURGU0JyaWNrU3RvcmFnZSA9IHJlcXVpcmUoXCJlZGZzLWJyaWNrLXN0b3JhZ2VcIik7XG5jb25zdCBFREZTQmxvY2tjaGFpblByb3h5ID0gcmVxdWlyZShcIi4vRURGU0Jsb2NrY2hhaW5Qcm94eVwiKTtcbmNvbnN0IEFzeW5jRGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi91dGlscy9Bc3luY0Rpc3BhdGNoZXJcIik7XG5cbmNvbnN0IEJyaWNrID0gcmVxdWlyZShcIi4vQnJpY2tcIik7XG5jb25zdCB1cmwgPSBcImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MFwiO1xuY29uc3QgZWRmc1NlcnZpY2VQcm94eSA9IEVERlNCcmlja1N0b3JhZ2UuY3JlYXRlRURGU0JyaWNrU3RvcmFnZSh1cmwpO1xuLyoqXG4gKlxuICogQHBhcmFtIGxvY2FsRm9sZGVyICAgLSByZXF1aXJlZFxuICogQHBhcmFtIGN1cnJlbnRSYXdDU0IgLSBvcHRpb25hbFxuICogQHBhcmFtIGNzYklkZW50aWZpZXIgLSByZXF1aXJlZFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFJvb3RDU0IobG9jYWxGb2xkZXIsIGN1cnJlbnRSYXdDU0IsIGNzYklkZW50aWZpZXIpIHtcbiAgICAvLyBpZiAoIWxvY2FsRm9sZGVyIHx8ICFjc2JJZGVudGlmaWVyKSB7XG4gICAgLy8gICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyByZXF1aXJlZCBwYXJhbWV0ZXJzJyk7XG4gICAgLy8gfVxuXG5cbiAgICBjb25zdCBldmVudCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgICBjb25zdCBlZGZzQmxvY2tjaGFpblByb3h5ID0gbmV3IEVERlNCbG9ja2NoYWluUHJveHkoY3NiSWRlbnRpZmllci5nZXREb21haW4oKSk7XG4gICAgdGhpcy5vbiA9IGV2ZW50Lm9uO1xuICAgIHRoaXMub2ZmID0gZXZlbnQucmVtb3ZlTGlzdGVuZXI7XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBldmVudC5yZW1vdmVBbGxMaXN0ZW5lcnM7XG4gICAgdGhpcy5lbWl0ID0gZXZlbnQuZW1pdDtcblxuICAgIHRoaXMuZ2V0TWlkUm9vdCA9IGZ1bmN0aW9uIChDU0JQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH07XG5cbiAgICB0aGlzLmNyZWF0ZVJhd0NTQiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSYXdDU0IoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5sb2FkUmF3Q1NCID0gZnVuY3Rpb24gKENTQlBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghY3VycmVudFJhd0NTQikge1xuICAgICAgICAgICAgZWRmc0Jsb2NrY2hhaW5Qcm94eS5nZXRDU0JBbmNob3IoY3NiSWRlbnRpZmllciwgKGVyciwgY3NiQW5jaG9yKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBfX2xvYWRSYXdDU0IoY3NiSWRlbnRpZmllciwgY3NiQW5jaG9yLmhlYWRlckhpc3RvcnlIYXNoLChlcnIsIHJhd0NTQikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRSYXdDU0IgPSByYXdDU0I7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKENTQlBhdGggfHwgQ1NCUGF0aCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFJhd0NTQihDU0JQYXRoLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGN1cnJlbnRSYXdDU0IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFDU0JQYXRoIHx8IENTQlBhdGggPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgY3VycmVudFJhd0NTQik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmxvYWRBc3NldEZyb21QYXRoKENTQlBhdGgsIChlcnIsIGFzc2V0LCByYXdDU0IpID0+IHtcblxuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWFzc2V0IHx8ICFhc3NldC5kc2VlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoYFRoZSBDU0JQYXRoICR7Q1NCUGF0aH0gaXMgaW52YWxpZC5gKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9fbG9hZFJhd0NTQihuZXcgQ1NCSWRlbnRpZmllcihhc3NldC5kc2VlZCksIGFzc2V0LmhlYWRlckhpc3RvcnlIYXNoLCBjYWxsYmFjayk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLmxvYWRBc3NldEZyb21QYXRoID0gZnVuY3Rpb24gKENTQlBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgIGxldCBwcm9jZXNzZWRQYXRoID0gX19zcGxpdFBhdGgoQ1NCUGF0aCk7XG4gICAgICAgIGlmICghY3VycmVudFJhd0NTQikge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignY3VycmVudFJhd0NTQiBkb2VzIG5vdCBleGlzdCcpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBDU0JSZWZlcmVuY2UgPSBudWxsO1xuICAgICAgICBpZiAocHJvY2Vzc2VkUGF0aC5DU0JBbGlhc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRBbGlhcyA9IHByb2Nlc3NlZFBhdGguQ1NCQWxpYXNlc1swXTtcbiAgICAgICAgICAgIENTQlJlZmVyZW5jZSA9IGN1cnJlbnRSYXdDU0IuZ2V0QXNzZXQoJ2dsb2JhbC5DU0JSZWZlcmVuY2UnLCBuZXh0QWxpYXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFwcm9jZXNzZWRQYXRoLmFzc2V0VHlwZSB8fCAhcHJvY2Vzc2VkUGF0aC5hc3NldEFpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ05vdCBhc3NldCB0eXBlIG9yIGlkIHNwZWNpZmllZCBpbiBDU0JQYXRoJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBDU0JSZWZlcmVuY2UgPSBjdXJyZW50UmF3Q1NCLmdldEFzc2V0KHByb2Nlc3NlZFBhdGguYXNzZXRUeXBlLCBwcm9jZXNzZWRQYXRoLmFzc2V0QWlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9jZXNzZWRQYXRoLkNTQkFsaWFzZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgQ1NCUmVmZXJlbmNlLCBjdXJyZW50UmF3Q1NCKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb2Nlc3NlZFBhdGguQ1NCQWxpYXNlcy5zaGlmdCgpO1xuXG4gICAgICAgIGlmKCFDU0JSZWZlcmVuY2UgfHwgIUNTQlJlZmVyZW5jZS5kc2VlZCl7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKGBUaGUgQ1NCUGF0aCAke0NTQlBhdGh9IGlzIGludmFsaWRgKSk7XG4gICAgICAgIH1cbiAgICAgICAgX19sb2FkQXNzZXRGcm9tUGF0aChwcm9jZXNzZWRQYXRoLCBuZXcgQ1NCSWRlbnRpZmllcihDU0JSZWZlcmVuY2UuZHNlZWQpLCBDU0JSZWZlcmVuY2UuaGVhZGVySGlzdG9yeUhhc2gsIDAsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgdGhpcy5zYXZlQXNzZXRUb1BhdGggPSBmdW5jdGlvbiAoQ1NCUGF0aCwgYXNzZXQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHNwbGl0UGF0aCA9IF9fc3BsaXRQYXRoKENTQlBhdGgsIHtrZWVwQWxpYXNlc0FzU3RyaW5nOiB0cnVlfSk7XG4gICAgICAgIHRoaXMubG9hZFJhd0NTQihzcGxpdFBhdGguQ1NCQWxpYXNlcywgKGVyciwgcmF3Q1NCKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJhd0NTQi5zYXZlQXNzZXQoYXNzZXQpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZVJhd0NTQihyYXdDU0IsIHNwbGl0UGF0aC5DU0JBbGlhc2VzLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5zYXZlUmF3Q1NCID0gZnVuY3Rpb24gKHJhd0NTQiwgQ1NCUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFDU0JQYXRoIHx8IENTQlBhdGggPT09ICcnKSB7XG4gICAgICAgICAgICBpZiAocmF3Q1NCKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFJhd0NTQiA9IHJhd0NTQjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRyYW5zYWN0aW9ucyA9IHJhd0NTQi5nZXRUcmFuc2FjdGlvbkxvZygpO1xuICAgICAgICBjb25zdCBoZWFkZXJzSGlzdG9yeSA9IG5ldyBIZWFkZXJzSGlzdG9yeSgpO1xuICAgICAgICBjb25zdCBoZWFkZXIgPSBuZXcgSGVhZGVyKCk7XG4gICAgICAgIGVkZnNCbG9ja2NoYWluUHJveHkuZ2V0Q1NCQW5jaG9yKGNzYklkZW50aWZpZXIsIChlcnIsIGNzYkFuY2hvcikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7IC8vVE9ETzogYmV0dGVyIGhhbmRsaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY3NiQW5jaG9yICYmIHR5cGVvZiBjc2JBbmNob3IuaGVhZGVySGlzdG9yeUhhc2ggIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICBlZGZzU2VydmljZVByb3h5LmdldEJyaWNrKGNzYkFuY2hvci5oZWFkZXJIaXN0b3J5SGFzaCwgKGVyciwgaGVhZGVyc0hpc3RvcnlCcmljaykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnNIaXN0b3J5LmZyb21CcmljayhoZWFkZXJzSGlzdG9yeUJyaWNrLCBjc2JJZGVudGlmaWVyLmdldERzZWVkKCkpO1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXIuc2V0UHJldmlvdXNIZWFkZXJIYXNoKGhlYWRlcnNIaXN0b3J5LmdldExhc3RIZWFkZXJIYXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX19zYXZlUmF3Q1NCKGNzYkFuY2hvciwgaGVhZGVyc0hpc3RvcnksIGhlYWRlciwgdHJhbnNhY3Rpb25zLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjc2JBbmNob3IuaW5pdChjc2JJZGVudGlmaWVyLmdldFVpZCgpLCBjc2JJZGVudGlmaWVyLmdldFVpZCgpKTtcbiAgICAgICAgICAgIF9fc2F2ZVJhd0NTQihjc2JBbmNob3IsIGhlYWRlcnNIaXN0b3J5LCBoZWFkZXIsIHRyYW5zYWN0aW9ucywgY2FsbGJhY2spO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG5cbiAgICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tIElOVEVSTkFMIE1FVEhPRFMgLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBDU0JQYXRoOiBzdHJpbmcgLSBpbnRlcm5hbCBwYXRoIHRoYXQgbG9va3MgbGlrZSAve0NTQk5hbWUxfS97Q1NCTmFtZTJ9Onthc3NldFR5cGV9Onthc3NldEFsaWFzT3JJZH1cbiAgICAgKiBAcGFyYW0gb3B0aW9uczpvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7e0NTQkFsaWFzZXM6IFtzdHJpbmddLCBhc3NldEFpZDogKCp8dW5kZWZpbmVkKSwgYXNzZXRUeXBlOiAoKnx1bmRlZmluZWQpfX1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9fc3BsaXRQYXRoKENTQlBhdGgsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCBwYXRoU2VwYXJhdG9yID0gJy8nO1xuXG4gICAgICAgIGlmIChDU0JQYXRoLnN0YXJ0c1dpdGgocGF0aFNlcGFyYXRvcikpIHtcbiAgICAgICAgICAgIENTQlBhdGggPSBDU0JQYXRoLnN1YnN0cmluZygxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBDU0JBbGlhc2VzID0gQ1NCUGF0aC5zcGxpdChwYXRoU2VwYXJhdG9yKTtcbiAgICAgICAgaWYgKENTQkFsaWFzZXMubGVuZ3RoIDwgMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDU0JQYXRoIHRvbyBzaG9ydCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbGFzdEluZGV4ID0gQ1NCQWxpYXNlcy5sZW5ndGggLSAxO1xuICAgICAgICBjb25zdCBvcHRpb25hbEFzc2V0U2VsZWN0b3IgPSBDU0JBbGlhc2VzW2xhc3RJbmRleF0uc3BsaXQoJzonKTtcblxuICAgICAgICBpZiAob3B0aW9uYWxBc3NldFNlbGVjdG9yWzBdID09PSAnJykge1xuICAgICAgICAgICAgQ1NCQWxpYXNlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQ1NCQWxpYXNlc1tsYXN0SW5kZXhdID0gb3B0aW9uYWxBc3NldFNlbGVjdG9yWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRpb25hbEFzc2V0U2VsZWN0b3JbMV0gJiYgIW9wdGlvbmFsQXNzZXRTZWxlY3RvclsyXSkge1xuICAgICAgICAgICAgb3B0aW9uYWxBc3NldFNlbGVjdG9yWzFdID0gJ2dsb2JhbC5DU0JSZWZlcmVuY2UnO1xuICAgICAgICAgICAgb3B0aW9uYWxBc3NldFNlbGVjdG9yWzJdID0gQ1NCQWxpYXNlc1tsYXN0SW5kZXhdO1xuICAgICAgICAgICAgQ1NCQWxpYXNlcy5wb3AoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLmtlZXBBbGlhc2VzQXNTdHJpbmcgPT09IHRydWUpIHtcbiAgICAgICAgICAgIENTQkFsaWFzZXMgPSBDU0JBbGlhc2VzLmpvaW4oJy8nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgQ1NCQWxpYXNlczogQ1NCQWxpYXNlcyxcbiAgICAgICAgICAgIGFzc2V0VHlwZTogb3B0aW9uYWxBc3NldFNlbGVjdG9yWzFdLFxuICAgICAgICAgICAgYXNzZXRBaWQ6IG9wdGlvbmFsQXNzZXRTZWxlY3RvclsyXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qIGZ1bmN0aW9uIF9faW5pdGlhbGl6ZUFzc2V0cyhyYXdDU0IsIGNzYlJlZiwgYmFja3VwVXJscykge1xuXG4gICAgICAgICBsZXQgY3NiTWV0YTtcbiAgICAgICAgIGxldCBpc01hc3RlcjtcblxuICAgICAgICAgY3NiTWV0YSA9IHJhd0NTQi5nZXRBc3NldCgnZ2xvYmFsLkNTQk1ldGEnLCAnbWV0YScpO1xuICAgICAgICAgaWYgKGN1cnJlbnRSYXdDU0IgPT09IHJhd0NTQikge1xuICAgICAgICAgICAgIGlzTWFzdGVyID0gdHlwZW9mIGNzYk1ldGEuaXNNYXN0ZXIgPT09ICd1bmRlZmluZWQnID8gdHJ1ZSA6IGNzYk1ldGEuaXNNYXN0ZXI7XG4gICAgICAgICAgICAgaWYgKCFjc2JNZXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgIGNzYk1ldGEuaW5pdCgkJC51aWRHZW5lcmF0b3Iuc2FmZV91dWlkKCkpO1xuICAgICAgICAgICAgICAgICBjc2JNZXRhLnNldElzTWFzdGVyKGlzTWFzdGVyKTtcbiAgICAgICAgICAgICAgICAgcmF3Q1NCLnNhdmVBc3NldChjc2JNZXRhKTtcbiAgICAgICAgICAgICB9XG4gICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgIGJhY2t1cFVybHMuZm9yRWFjaCgodXJsKSA9PiB7XG4gICAgICAgICAgICAgICAgIGNvbnN0IHVpZCA9ICQkLnVpZEdlbmVyYXRvci5zYWZlX3V1aWQoKTtcbiAgICAgICAgICAgICAgICAgY29uc3QgYmFja3VwID0gcmF3Q1NCLmdldEFzc2V0KCdnbG9iYWwuQmFja3VwJywgdWlkKTtcbiAgICAgICAgICAgICAgICAgYmFja3VwLmluaXQodWlkLCB1cmwpO1xuICAgICAgICAgICAgICAgICByYXdDU0Iuc2F2ZUFzc2V0KGJhY2t1cCk7XG4gICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICBpc01hc3RlciA9IHR5cGVvZiBjc2JNZXRhLmlzTWFzdGVyID09PSAndW5kZWZpbmVkJyA/IGZhbHNlIDogY3NiTWV0YS5pc01hc3RlcjtcbiAgICAgICAgICAgICBjc2JNZXRhLmluaXQoY3NiUmVmLmdldE1ldGFkYXRhKCdzd2FybUlkJykpO1xuICAgICAgICAgICAgIGNzYk1ldGEuc2V0SXNNYXN0ZXIoaXNNYXN0ZXIpO1xuICAgICAgICAgICAgIHJhd0NTQi5zYXZlQXNzZXQoY3NiTWV0YSk7XG4gICAgICAgICB9XG4gICAgIH0gKi9cblxuICAgIGZ1bmN0aW9uIF9fc2F2ZVJhd0NTQihjc2JBbmNob3IsIGhlYWRlcnNIaXN0b3J5LCBoZWFkZXIsIHRyYW5zYWN0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgYXN5bmNEaXNwYXRjaGVyID0gbmV3IEFzeW5jRGlzcGF0Y2hlcigoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBoZWFkZXJFbmNyeXB0aW9uS2V5ID0gY3J5cHRvLnJhbmRvbUJ5dGVzKDMyKTtcbiAgICAgICAgICAgIGNvbnN0IGhlYWRlckJyaWNrID0gaGVhZGVyLnRvQnJpY2soaGVhZGVyRW5jcnlwdGlvbktleSk7XG4gICAgICAgICAgICBlZGZzU2VydmljZVByb3h5LmFkZEJyaWNrKGhlYWRlckJyaWNrLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBoZWFkZXJzSGlzdG9yeS5hZGRIZWFkZXIoaGVhZGVyQnJpY2ssIGhlYWRlckVuY3J5cHRpb25LZXkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhpc3RvcnlCcmljayA9IGhlYWRlcnNIaXN0b3J5LnRvQnJpY2soY3NiSWRlbnRpZmllci5nZXREc2VlZCgpKTtcbiAgICAgICAgICAgICAgICBlZGZzU2VydmljZVByb3h5LmFkZEJyaWNrKGhpc3RvcnlCcmljaywgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNzYkFuY2hvci51cGRhdGVIZWFkZXJIaXN0b3J5SGFzaChoaXN0b3J5QnJpY2suZ2VuZXJhdGVIYXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICBlZGZzQmxvY2tjaGFpblByb3h5LnNldENTQkFuY2hvcihjc2JBbmNob3IsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9KTtcblxuICAgICAgICBhc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eSh0cmFuc2FjdGlvbnMubGVuZ3RoKTtcbiAgICAgICAgdHJhbnNhY3Rpb25zLmZvckVhY2goKHRyYW5zYWN0aW9uKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBlbmNyeXB0aW9uS2V5ID0gY3J5cHRvLnJhbmRvbUJ5dGVzKDMyKTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uQnJpY2sgPSBuZXcgQnJpY2soY3J5cHRvLmVuY3J5cHQodHJhbnNhY3Rpb24sIGVuY3J5cHRpb25LZXkpKTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uRW50cnkgPSB7fTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uSGFzaCA9IHRyYW5zYWN0aW9uQnJpY2suZ2VuZXJhdGVIYXNoKCk7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbkVudHJ5W3RyYW5zYWN0aW9uSGFzaF0gPSBlbmNyeXB0aW9uS2V5O1xuICAgICAgICAgICAgaGVhZGVyLmFkZFRyYW5zYWN0aW9ucyh0cmFuc2FjdGlvbkVudHJ5KTtcbiAgICAgICAgICAgIGVkZnNTZXJ2aWNlUHJveHkuYWRkQnJpY2sodHJhbnNhY3Rpb25CcmljaywgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYXN5bmNEaXNwYXRjaGVyLm1hcmtPbmVBc0ZpbmlzaGVkKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cblxuICAgIGZ1bmN0aW9uIF9fbG9hZFJhd0NTQihsb2NhbENTQklkZW50aWZpZXIsIGxvY2FsSGVhZGVySGlzdG9yeUhhc2gsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmKHR5cGVvZiBsb2NhbEhlYWRlckhpc3RvcnlIYXNoID09PSBcImZ1bmN0aW9uXCIpe1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBsb2NhbEhlYWRlckhpc3RvcnlIYXNoO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmF3Q1NCID0gbmV3IFJhd0NTQigpO1xuICAgICAgICBlZGZzU2VydmljZVByb3h5LmdldEJyaWNrKGxvY2FsSGVhZGVySGlzdG9yeUhhc2gsIChlcnIsIGhlYWRlcnNIaXN0b3J5QnJpY2tEYXRhKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGhlYWRlcnNIaXN0b3J5ID0gbmV3IEhlYWRlcnNIaXN0b3J5KCk7XG4gICAgICAgICAgICBoZWFkZXJzSGlzdG9yeS5mcm9tQnJpY2soaGVhZGVyc0hpc3RvcnlCcmlja0RhdGEsIGxvY2FsQ1NCSWRlbnRpZmllci5nZXREc2VlZCgpKTtcbiAgICAgICAgICAgIGNvbnN0IGhlYWRlcnNBc3luY0Rpc3BhdGNoZXIgPSBuZXcgQXN5bmNEaXNwYXRjaGVyKChlcnJvcnMsIHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHJhd0NTQik7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgaGVhZGVycyA9IGhlYWRlcnNIaXN0b3J5LmdldEhlYWRlcnMoKTtcbiAgICAgICAgICAgIGhlYWRlcnNBc3luY0Rpc3BhdGNoZXIuZGlzcGF0Y2hFbXB0eShoZWFkZXJzLmxlbmd0aCk7XG4gICAgICAgICAgICBoZWFkZXJzLmZvckVhY2goKGhlYWRlckVudHJ5KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVySGFzaCA9IE9iamVjdC5rZXlzKGhlYWRlckVudHJ5KVswXTtcbiAgICAgICAgICAgICAgICBlZGZzU2VydmljZVByb3h5LmdldEJyaWNrKGhlYWRlckhhc2gsIChlcnIsIGhlYWRlckJyaWNrKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG5ldyBIZWFkZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyLmZyb21CcmljayhoZWFkZXJCcmljaywgaGVhZGVyRW50cnlbaGVhZGVySGFzaF0pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2FjdGlvbnNFbnRyaWVzID0gaGVhZGVyLmdldFRyYW5zYWN0aW9ucygpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2FjdGlvbnNBc3luY0Rpc3BhdGNoZXIgPSBuZXcgQXN5bmNEaXNwYXRjaGVyKChlcnJvcnMsIHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHNPYmogPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHMuZm9yRWFjaCgocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gT2JqZWN0LmtleXMocmVzdWx0KVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzT2JqW2tleV0gPSBPYmplY3QudmFsdWVzKHJlc3VsdFtrZXldKVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbnNFbnRyaWVzLmZvckVhY2goKHRyYW5zYWN0aW9uRW50cnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2FjdGlvbkhhc2ggPSBPYmplY3Qua2V5cyh0cmFuc2FjdGlvbkVudHJ5KVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYXdDU0IuYXBwbHlUcmFuc2FjdGlvbihyZXN1bHRzT2JqW3RyYW5zYWN0aW9uSGFzaF0uc3dhcm0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlcnNBc3luY0Rpc3BhdGNoZXIubWFya09uZUFzRmluaXNoZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uc0FzeW5jRGlzcGF0Y2hlci5kaXNwYXRjaEVtcHR5KHRyYW5zYWN0aW9uc0VudHJpZXMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb25zRW50cmllcy5mb3JFYWNoKCh0cmFuc2FjdGlvbkVudHJ5KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2FjdGlvbkhhc2ggPSBPYmplY3Qua2V5cyh0cmFuc2FjdGlvbkVudHJ5KVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkZnNTZXJ2aWNlUHJveHkuZ2V0QnJpY2sodHJhbnNhY3Rpb25IYXNoLCAoZXJyLCB0cmFuc2FjdGlvbkJyaWNrKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2FjdGlvbk9iaiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uT2JqW3RyYW5zYWN0aW9uSGFzaF0gPSBjcnlwdG8uZGVjcnlwdE9iamVjdCh0cmFuc2FjdGlvbkJyaWNrLCB0cmFuc2FjdGlvbkVudHJ5W3RyYW5zYWN0aW9uSGFzaF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uc0FzeW5jRGlzcGF0Y2hlci5tYXJrT25lQXNGaW5pc2hlZCh1bmRlZmluZWQsIHRyYW5zYWN0aW9uT2JqKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9fbG9hZEFzc2V0RnJvbVBhdGgocHJvY2Vzc2VkUGF0aCwgbG9jYWxDU0JJZGVudGlmaWVyLCBsb2NhbEhlYWRlckhpc3RvcnlIYXNoLCBjdXJyZW50SW5kZXgsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9fbG9hZFJhd0NTQihsb2NhbENTQklkZW50aWZpZXIsIChlcnIsIHJhd0NTQikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudEluZGV4IDwgcHJvY2Vzc2VkUGF0aC5DU0JBbGlhc2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5leHRBbGlhcyA9IHByb2Nlc3NlZFBhdGguQ1NCQWxpYXNlc1tjdXJyZW50SW5kZXhdO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0ID0gcmF3Q1NCLmdldEFzc2V0KFwiZ2xvYmFsLkNTQlJlZmVyZW5jZVwiLCBuZXh0QWxpYXMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0NTQklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihhc3NldC5kc2VlZCk7XG5cbiAgICAgICAgICAgICAgICBfX2xvYWRBc3NldEZyb21QYXRoKHByb2Nlc3NlZFBhdGgsIG5ld0NTQklkZW50aWZpZXIsICsrY3VycmVudEluZGV4LCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhc3NldCA9IHJhd0NTQi5nZXRBc3NldChwcm9jZXNzZWRQYXRoLmFzc2V0VHlwZSwgcHJvY2Vzc2VkUGF0aC5hc3NldEFpZCk7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCBhc3NldCwgcmF3Q1NCKTtcblxuICAgICAgICB9KTtcblxuICAgIH1cblxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gUm9vdENTQjtcbiIsIlxuZnVuY3Rpb24gQXN5bmNEaXNwYXRjaGVyKGZpbmFsQ2FsbGJhY2spIHtcblx0bGV0IHJlc3VsdHMgPSBbXTtcblx0bGV0IGVycm9ycyA9IFtdO1xuXG5cdGxldCBzdGFydGVkID0gMDtcblxuXHRmdW5jdGlvbiBtYXJrT25lQXNGaW5pc2hlZChlcnIsIHJlcykge1xuXHRcdGlmKGVycikge1xuXHRcdFx0ZXJyb3JzLnB1c2goZXJyKTtcblx0XHR9XG5cblx0XHRpZihhcmd1bWVudHMubGVuZ3RoID4gMikge1xuXHRcdFx0YXJndW1lbnRzWzBdID0gdW5kZWZpbmVkO1xuXHRcdFx0cmVzID0gYXJndW1lbnRzO1xuXHRcdH1cblxuXHRcdGlmKHR5cGVvZiByZXMgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0XHRcdHJlc3VsdHMucHVzaChyZXMpO1xuXHRcdH1cblxuXHRcdGlmKC0tc3RhcnRlZCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbENhbGxiYWNrKCk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gZGlzcGF0Y2hFbXB0eShhbW91bnQgPSAxKSB7XG5cdFx0c3RhcnRlZCArPSBhbW91bnQ7XG5cdH1cblxuXHRmdW5jdGlvbiBjYWxsQ2FsbGJhY2soKSB7XG5cdCAgICBpZihlcnJvcnMubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgZXJyb3JzID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cblx0ICAgIGlmKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgcmVzdWx0cyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZpbmFsQ2FsbGJhY2soZXJyb3JzLCByZXN1bHRzKTtcbiAgICB9XG5cblx0cmV0dXJuIHtcblx0XHRkaXNwYXRjaEVtcHR5LFxuXHRcdG1hcmtPbmVBc0ZpbmlzaGVkXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQXN5bmNEaXNwYXRjaGVyOyIsImNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ3Bza2NyeXB0bycpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmNvbnN0IENTQklkZW50aWZpZXIgPSByZXF1aXJlKFwiLi4vbGliL0NTQklkZW50aWZpZXJcIik7XG5cbmZ1bmN0aW9uIERzZWVkQ2FnZShsb2NhbEZvbGRlcikge1xuXHRjb25zdCBkc2VlZEZvbGRlciA9IHBhdGguam9pbihsb2NhbEZvbGRlciwgJy5wcml2YXRlU2t5Jyk7XG5cdGNvbnN0IGRzZWVkUGF0aCA9IHBhdGguam9pbihkc2VlZEZvbGRlciwgJ2RzZWVkJyk7XG5cblx0ZnVuY3Rpb24gbG9hZERzZWVkQmFja3VwcyhwaW4sIGNhbGxiYWNrKSB7XG5cdFx0ZnMubWtkaXIoZHNlZWRGb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCAoZXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXG5cdFx0XHRjcnlwdG8ubG9hZERhdGEocGluLCBkc2VlZFBhdGgsIChlcnIsIGRzZWVkQmFja3VwcykgPT4ge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHRcdH1cblx0XHRcdFx0dHJ5e1xuXHRcdFx0XHRcdGRzZWVkQmFja3VwcyA9IEpTT04ucGFyc2UoZHNlZWRCYWNrdXBzLnRvU3RyaW5nKCkpO1xuXHRcdFx0XHR9Y2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsZXQgY3NiSWRlbnRpZmllcjtcblx0XHRcdFx0aWYgKGRzZWVkQmFja3Vwcy5kc2VlZCAmJiAhQnVmZmVyLmlzQnVmZmVyKGRzZWVkQmFja3Vwcy5kc2VlZCkpIHtcblx0XHRcdFx0XHRkc2VlZEJhY2t1cHMuZHNlZWQgPSBCdWZmZXIuZnJvbShkc2VlZEJhY2t1cHMuZHNlZWQpO1xuXHRcdFx0XHRcdGNzYklkZW50aWZpZXIgPSBuZXcgQ1NCSWRlbnRpZmllcihkc2VlZEJhY2t1cHMuZHNlZWQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2FsbGJhY2sodW5kZWZpbmVkLCBjc2JJZGVudGlmaWVyLCBkc2VlZEJhY2t1cHMuYmFja3Vwcyk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNhdmVEc2VlZEJhY2t1cHMocGluLCBjc2JJZGVudGlmaWVyLCBiYWNrdXBzLCBjYWxsYmFjaykge1xuXHRcdGZzLm1rZGlyKGRzZWVkRm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgKGVycikgPT4ge1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdH1cblxuXHRcdFx0bGV0IGRzZWVkO1xuXHRcdFx0aWYoY3NiSWRlbnRpZmllcil7XG5cdFx0XHRcdGRzZWVkID0gY3NiSWRlbnRpZmllci5nZXREc2VlZCgpO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZHNlZWRCYWNrdXBzID0gSlNPTi5zdHJpbmdpZnkoe1xuXHRcdFx0XHRkc2VlZCxcblx0XHRcdFx0YmFja3Vwc1xuXHRcdFx0fSk7XG5cblx0XHRcdGNyeXB0by5zYXZlRGF0YShCdWZmZXIuZnJvbShkc2VlZEJhY2t1cHMpLCBwaW4sIGRzZWVkUGF0aCwgY2FsbGJhY2spO1xuXHRcdH0pO1xuXHR9XG5cblxuXHRyZXR1cm4ge1xuXHRcdGxvYWREc2VlZEJhY2t1cHMsXG5cdFx0c2F2ZURzZWVkQmFja3Vwcyxcblx0fTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IERzZWVkQ2FnZTsiLCJjb25zdCB1dGlscyA9IHJlcXVpcmUoXCJzd2FybXV0aWxzXCIpO1xuY29uc3QgT3dNID0gdXRpbHMuT3dNO1xudmFyIGJlZXNIZWFsZXIgPSB1dGlscy5iZWVzSGVhbGVyO1xudmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xudmFyIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcblxuXG4vL1RPRE86IHByZXZlbnQgYSBjbGFzcyBvZiByYWNlIGNvbmRpdGlvbiB0eXBlIG9mIGVycm9ycyBieSBzaWduYWxpbmcgd2l0aCBmaWxlcyBtZXRhZGF0YSB0byB0aGUgd2F0Y2hlciB3aGVuIGl0IGlzIHNhZmUgdG8gY29uc3VtZVxuXG5mdW5jdGlvbiBGb2xkZXJNUShmb2xkZXIsIGNhbGxiYWNrID0gKCkgPT4ge30pe1xuXG5cdGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGNhbGxiYWNrIGZ1bmN0aW9uXCIpO1xuXHR9XG5cblx0Zm9sZGVyID0gcGF0aC5ub3JtYWxpemUoZm9sZGVyKTtcblxuXHRmcy5ta2Rpcihmb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCBmdW5jdGlvbihlcnIsIHJlcyl7XG5cdFx0ZnMuZXhpc3RzKGZvbGRlciwgZnVuY3Rpb24oZXhpc3RzKSB7XG5cdFx0XHRpZiAoZXhpc3RzKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCBmb2xkZXIpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIG1rRmlsZU5hbWUoc3dhcm1SYXcpe1xuXHRcdGxldCBtZXRhID0gT3dNLnByb3RvdHlwZS5nZXRNZXRhRnJvbShzd2FybVJhdyk7XG5cdFx0bGV0IG5hbWUgPSBgJHtmb2xkZXJ9JHtwYXRoLnNlcH0ke21ldGEuc3dhcm1JZH0uJHttZXRhLnN3YXJtVHlwZU5hbWV9YDtcblx0XHRjb25zdCB1bmlxdWUgPSBtZXRhLnBoYXNlSWQgfHwgJCQudWlkR2VuZXJhdG9yLnNhZmVfdXVpZCgpO1xuXG5cdFx0bmFtZSA9IG5hbWUrYC4ke3VuaXF1ZX1gO1xuXHRcdHJldHVybiBwYXRoLm5vcm1hbGl6ZShuYW1lKTtcblx0fVxuXG5cdHRoaXMuZ2V0SGFuZGxlciA9IGZ1bmN0aW9uKCl7XG5cdFx0aWYocHJvZHVjZXIpe1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiT25seSBvbmUgY29uc3VtZXIgaXMgYWxsb3dlZCFcIik7XG5cdFx0fVxuXHRcdHByb2R1Y2VyID0gdHJ1ZTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0c2VuZFN3YXJtU2VyaWFsaXphdGlvbjogZnVuY3Rpb24oc2VyaWFsaXphdGlvbiwgY2FsbGJhY2spe1xuXHRcdFx0XHRpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR3cml0ZUZpbGUobWtGaWxlTmFtZShKU09OLnBhcnNlKHNlcmlhbGl6YXRpb24pKSwgc2VyaWFsaXphdGlvbiwgY2FsbGJhY2spO1xuXHRcdFx0fSxcblx0XHRcdGFkZFN0cmVhbSA6IGZ1bmN0aW9uKHN0cmVhbSwgY2FsbGJhY2spe1xuXHRcdFx0XHRpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKCFzdHJlYW0gfHwgIXN0cmVhbS5waXBlIHx8IHR5cGVvZiBzdHJlYW0ucGlwZSAhPT0gXCJmdW5jdGlvblwiKXtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiU29tZXRoaW5nIHdyb25nIGhhcHBlbmVkXCIpKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGxldCBzd2FybSA9IFwiXCI7XG5cdFx0XHRcdHN0cmVhbS5vbignZGF0YScsIChjaHVuaykgPT57XG5cdFx0XHRcdFx0c3dhcm0gKz0gY2h1bms7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHN0cmVhbS5vbihcImVuZFwiLCAoKSA9PiB7XG5cdFx0XHRcdFx0d3JpdGVGaWxlKG1rRmlsZU5hbWUoSlNPTi5wYXJzZShzd2FybSkpLCBzd2FybSwgY2FsbGJhY2spO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRzdHJlYW0ub24oXCJlcnJvclwiLCAoZXJyKSA9Pntcblx0XHRcdFx0XHRjYWxsYmFjayhlcnIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHRhZGRTd2FybSA6IGZ1bmN0aW9uKHN3YXJtLCBjYWxsYmFjayl7XG5cdFx0XHRcdGlmKCFjYWxsYmFjayl7XG5cdFx0XHRcdFx0Y2FsbGJhY2sgPSAkJC5kZWZhdWx0RXJyb3JIYW5kbGluZ0ltcGxlbWVudGF0aW9uO1xuXHRcdFx0XHR9ZWxzZSBpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIHBhcmFtZXRlciBzaG91bGQgYmUgYSBjYWxsYmFjayBmdW5jdGlvblwiKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJlZXNIZWFsZXIuYXNKU09OKHN3YXJtLG51bGwsIG51bGwsIGZ1bmN0aW9uKGVyciwgcmVzKXtcblx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR3cml0ZUZpbGUobWtGaWxlTmFtZShyZXMpLCBKKHJlcyksIGNhbGxiYWNrKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdFx0c2VuZFN3YXJtRm9yRXhlY3V0aW9uOiBmdW5jdGlvbihzd2FybSwgY2FsbGJhY2spe1xuXHRcdFx0XHRpZighY2FsbGJhY2spe1xuXHRcdFx0XHRcdGNhbGxiYWNrID0gJCQuZGVmYXVsdEVycm9ySGFuZGxpbmdJbXBsZW1lbnRhdGlvbjtcblx0XHRcdFx0fWVsc2UgaWYodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRiZWVzSGVhbGVyLmFzSlNPTihzd2FybSwgT3dNLnByb3RvdHlwZS5nZXRNZXRhRnJvbShzd2FybSwgXCJwaGFzZU5hbWVcIiksIE93TS5wcm90b3R5cGUuZ2V0TWV0YUZyb20oc3dhcm0sIFwiYXJnc1wiKSwgZnVuY3Rpb24oZXJyLCByZXMpe1xuXHRcdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHZhciBmaWxlID0gbWtGaWxlTmFtZShyZXMpO1xuXHRcdFx0XHRcdHZhciBjb250ZW50ID0gSlNPTi5zdHJpbmdpZnkocmVzKTtcblxuXHRcdFx0XHRcdC8vaWYgdGhlcmUgYXJlIG5vIG1vcmUgRkQncyBmb3IgZmlsZXMgdG8gYmUgd3JpdHRlbiB3ZSByZXRyeS5cblx0XHRcdFx0XHRmdW5jdGlvbiB3cmFwcGVyKGVycm9yLCByZXN1bHQpe1xuXHRcdFx0XHRcdFx0aWYoZXJyb3Ipe1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhgQ2F1Z2h0IGFuIHdyaXRlIGVycm9yLiBSZXRyeSB0byB3cml0ZSBmaWxlIFske2ZpbGV9XWApO1xuXHRcdFx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHRcdFx0XHRcdFx0d3JpdGVGaWxlKGZpbGUsIGNvbnRlbnQsIHdyYXBwZXIpO1xuXHRcdFx0XHRcdFx0XHR9LCAxMCk7XG5cdFx0XHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycm9yLCByZXN1bHQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHdyaXRlRmlsZShmaWxlLCBjb250ZW50LCB3cmFwcGVyKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fTtcblxuXHR2YXIgcmVjaXBpZW50O1xuXHR0aGlzLnNldElQQ0NoYW5uZWwgPSBmdW5jdGlvbihwcm9jZXNzQ2hhbm5lbCl7XG5cdFx0aWYocHJvY2Vzc0NoYW5uZWwgJiYgIXByb2Nlc3NDaGFubmVsLnNlbmQgfHwgKHR5cGVvZiBwcm9jZXNzQ2hhbm5lbC5zZW5kKSAhPSBcImZ1bmN0aW9uXCIpe1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiUmVjaXBpZW50IGlzIG5vdCBpbnN0YW5jZSBvZiBwcm9jZXNzL2NoaWxkX3Byb2Nlc3Mgb3IgaXQgd2FzIG5vdCBzcGF3bmVkIHdpdGggSVBDIGNoYW5uZWwhXCIpO1xuXHRcdH1cblx0XHRyZWNpcGllbnQgPSBwcm9jZXNzQ2hhbm5lbDtcblx0XHRpZihjb25zdW1lcil7XG5cdFx0XHRjb25zb2xlLmxvZyhgQ2hhbm5lbCB1cGRhdGVkYCk7XG5cdFx0XHQocmVjaXBpZW50IHx8IHByb2Nlc3MpLm9uKFwibWVzc2FnZVwiLCByZWNlaXZlRW52ZWxvcGUpO1xuXHRcdH1cblx0fTtcblxuXG5cdHZhciBjb25zdW1lZE1lc3NhZ2VzID0ge307XG5cblx0ZnVuY3Rpb24gY2hlY2tJZkNvbnN1bW1lZChuYW1lLCBtZXNzYWdlKXtcblx0XHRjb25zdCBzaG9ydE5hbWUgPSBwYXRoLmJhc2VuYW1lKG5hbWUpO1xuXHRcdGNvbnN0IHByZXZpb3VzU2F2ZWQgPSBjb25zdW1lZE1lc3NhZ2VzW3Nob3J0TmFtZV07XG5cdFx0bGV0IHJlc3VsdCA9IGZhbHNlO1xuXHRcdGlmKHByZXZpb3VzU2F2ZWQgJiYgIXByZXZpb3VzU2F2ZWQubG9jYWxlQ29tcGFyZShtZXNzYWdlKSl7XG5cdFx0XHRyZXN1bHQgPSB0cnVlO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gc2F2ZTJIaXN0b3J5KGVudmVsb3BlKXtcblx0XHRjb25zdW1lZE1lc3NhZ2VzW3BhdGguYmFzZW5hbWUoZW52ZWxvcGUubmFtZSldID0gZW52ZWxvcGUubWVzc2FnZTtcblx0fVxuXG5cdGZ1bmN0aW9uIGJ1aWxkRW52ZWxvcGVDb25maXJtYXRpb24oZW52ZWxvcGUsIHNhdmVIaXN0b3J5KXtcblx0XHRpZihzYXZlSGlzdG9yeSl7XG5cdFx0XHRzYXZlMkhpc3RvcnkoZW52ZWxvcGUpO1xuXHRcdH1cblx0XHRyZXR1cm4gYENvbmZpcm0gZW52ZWxvcGUgJHtlbnZlbG9wZS50aW1lc3RhbXB9IHNlbnQgdG8gJHtlbnZlbG9wZS5kZXN0fWA7XG5cdH1cblxuXHRmdW5jdGlvbiBidWlsZEVudmVsb3BlKG5hbWUsIG1lc3NhZ2Upe1xuXHRcdHJldHVybiB7XG5cdFx0XHRkZXN0OiBmb2xkZXIsXG5cdFx0XHRzcmM6IHByb2Nlc3MucGlkLFxuXHRcdFx0dGltZXN0YW1wOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2UsXG5cdFx0XHRuYW1lOiBuYW1lXG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlY2VpdmVFbnZlbG9wZShlbnZlbG9wZSl7XG5cdFx0aWYoIWVudmVsb3BlIHx8IHR5cGVvZiBlbnZlbG9wZSAhPT0gXCJvYmplY3RcIil7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdC8vY29uc29sZS5sb2coXCJyZWNlaXZlZCBlbnZlbG9wZVwiLCBlbnZlbG9wZSwgZm9sZGVyKTtcblxuXHRcdGlmKGVudmVsb3BlLmRlc3QgIT09IGZvbGRlciAmJiBmb2xkZXIuaW5kZXhPZihlbnZlbG9wZS5kZXN0KSE9PSAtMSAmJiBmb2xkZXIubGVuZ3RoID09PSBlbnZlbG9wZS5kZXN0KzEpe1xuXHRcdFx0Y29uc29sZS5sb2coXCJUaGlzIGVudmVsb3BlIGlzIG5vdCBmb3IgbWUhXCIpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGxldCBtZXNzYWdlID0gZW52ZWxvcGUubWVzc2FnZTtcblxuXHRcdGlmKGNhbGxiYWNrKXtcblx0XHRcdC8vY29uc29sZS5sb2coXCJTZW5kaW5nIGNvbmZpcm1hdGlvblwiLCBwcm9jZXNzLnBpZCk7XG5cdFx0XHRyZWNpcGllbnQuc2VuZChidWlsZEVudmVsb3BlQ29uZmlybWF0aW9uKGVudmVsb3BlLCB0cnVlKSk7XG5cdFx0XHRjb25zdW1lcihudWxsLCBKU09OLnBhcnNlKG1lc3NhZ2UpKTtcblx0XHR9XG5cdH1cblxuXHR0aGlzLnJlZ2lzdGVyQXNJUENDb25zdW1lciA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblx0XHRpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGUgYXJndW1lbnQgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdFx0fVxuXHRcdHJlZ2lzdGVyZWRBc0lQQ0NvbnN1bWVyID0gdHJ1ZTtcblx0XHQvL3dpbGwgcmVnaXN0ZXIgYXMgbm9ybWFsIGNvbnN1bWVyIGluIG9yZGVyIHRvIGNvbnN1bWUgYWxsIGV4aXN0aW5nIG1lc3NhZ2VzIGJ1dCB3aXRob3V0IHNldHRpbmcgdGhlIHdhdGNoZXJcblx0XHR0aGlzLnJlZ2lzdGVyQ29uc3VtZXIoY2FsbGJhY2ssIHRydWUsICh3YXRjaGVyKSA9PiAhd2F0Y2hlcik7XG5cblx0XHQvL2NvbnNvbGUubG9nKFwiUmVnaXN0ZXJlZCBhcyBJUEMgQ29uc3VtbWVyXCIsICk7XG5cdFx0KHJlY2lwaWVudCB8fCBwcm9jZXNzKS5vbihcIm1lc3NhZ2VcIiwgcmVjZWl2ZUVudmVsb3BlKTtcblx0fTtcblxuXHR0aGlzLnJlZ2lzdGVyQ29uc3VtZXIgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIHNob3VsZERlbGV0ZUFmdGVyUmVhZCA9IHRydWUsIHNob3VsZFdhaXRGb3JNb3JlID0gKHdhdGNoZXIpID0+IHRydWUpIHtcblx0XHRpZih0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIil7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgY2FsbGJhY2sgZnVuY3Rpb25cIik7XG5cdFx0fVxuXHRcdGlmIChjb25zdW1lcikge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiT25seSBvbmUgY29uc3VtZXIgaXMgYWxsb3dlZCEgXCIgKyBmb2xkZXIpO1xuXHRcdH1cblxuXHRcdGNvbnN1bWVyID0gY2FsbGJhY2s7XG5cblx0XHRmcy5ta2Rpcihmb2xkZXIsIHtyZWN1cnNpdmU6IHRydWV9LCBmdW5jdGlvbiAoZXJyLCByZXMpIHtcblx0XHRcdGlmIChlcnIgJiYgKGVyci5jb2RlICE9PSAnRUVYSVNUJykpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHRcdH1cblx0XHRcdGNvbnN1bWVBbGxFeGlzdGluZyhzaG91bGREZWxldGVBZnRlclJlYWQsIHNob3VsZFdhaXRGb3JNb3JlKTtcblx0XHR9KTtcblx0fTtcblxuXHR0aGlzLndyaXRlTWVzc2FnZSA9IHdyaXRlRmlsZTtcblxuXHR0aGlzLnVubGlua0NvbnRlbnQgPSBmdW5jdGlvbiAobWVzc2FnZUlkLCBjYWxsYmFjaykge1xuXHRcdGNvbnN0IG1lc3NhZ2VQYXRoID0gcGF0aC5qb2luKGZvbGRlciwgbWVzc2FnZUlkKTtcblxuXHRcdGZzLnVubGluayhtZXNzYWdlUGF0aCwgKGVycikgPT4ge1xuXHRcdFx0Y2FsbGJhY2soZXJyKTtcblx0XHR9KTtcblx0fTtcblxuXHR0aGlzLmRpc3Bvc2UgPSBmdW5jdGlvbihmb3JjZSl7XG5cdFx0aWYodHlwZW9mIGZvbGRlciAhPSBcInVuZGVmaW5lZFwiKXtcblx0XHRcdHZhciBmaWxlcztcblx0XHRcdHRyeXtcblx0XHRcdFx0ZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhmb2xkZXIpO1xuXHRcdFx0fWNhdGNoKGVycm9yKXtcblx0XHRcdFx0Ly8uLlxuXHRcdFx0fVxuXG5cdFx0XHRpZihmaWxlcyAmJiBmaWxlcy5sZW5ndGggPiAwICYmICFmb3JjZSl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiRGlzcG9zaW5nIGEgY2hhbm5lbCB0aGF0IHN0aWxsIGhhcyBtZXNzYWdlcyEgRGlyIHdpbGwgbm90IGJlIHJlbW92ZWQhXCIpO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dHJ5e1xuXHRcdFx0XHRcdGZzLnJtZGlyU3luYyhmb2xkZXIpO1xuXHRcdFx0XHR9Y2F0Y2goZXJyKXtcblx0XHRcdFx0XHQvLy4uXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Zm9sZGVyID0gbnVsbDtcblx0XHR9XG5cblx0XHRpZihwcm9kdWNlcil7XG5cdFx0XHQvL25vIG5lZWQgdG8gZG8gYW55dGhpbmcgZWxzZVxuXHRcdH1cblxuXHRcdGlmKHR5cGVvZiBjb25zdW1lciAhPSBcInVuZGVmaW5lZFwiKXtcblx0XHRcdGNvbnN1bWVyID0gKCkgPT4ge307XG5cdFx0fVxuXG5cdFx0aWYod2F0Y2hlcil7XG5cdFx0XHR3YXRjaGVyLmNsb3NlKCk7XG5cdFx0XHR3YXRjaGVyID0gbnVsbDtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcblxuXG5cdC8qIC0tLS0tLS0tLS0tLS0tLS0gcHJvdGVjdGVkICBmdW5jdGlvbnMgKi9cblx0dmFyIGNvbnN1bWVyID0gbnVsbDtcblx0dmFyIHJlZ2lzdGVyZWRBc0lQQ0NvbnN1bWVyID0gZmFsc2U7XG5cdHZhciBwcm9kdWNlciA9IG51bGw7XG5cblx0ZnVuY3Rpb24gYnVpbGRQYXRoRm9yRmlsZShmaWxlbmFtZSl7XG5cdFx0cmV0dXJuIHBhdGgubm9ybWFsaXplKHBhdGguam9pbihmb2xkZXIsIGZpbGVuYW1lKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjb25zdW1lTWVzc2FnZShmaWxlbmFtZSwgc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCBjYWxsYmFjaykge1xuXHRcdHZhciBmdWxsUGF0aCA9IGJ1aWxkUGF0aEZvckZpbGUoZmlsZW5hbWUpO1xuXG5cdFx0ZnMucmVhZEZpbGUoZnVsbFBhdGgsIFwidXRmOFwiLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG5cdFx0XHRpZiAoIWVycikge1xuXHRcdFx0XHRpZiAoZGF0YSAhPT0gXCJcIikge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHR2YXIgbWVzc2FnZSA9IEpTT04ucGFyc2UoZGF0YSk7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiUGFyc2luZyBlcnJvclwiLCBlcnJvcik7XG5cdFx0XHRcdFx0XHRlcnIgPSBlcnJvcjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZihjaGVja0lmQ29uc3VtbWVkKGZ1bGxQYXRoLCBkYXRhKSl7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKGBtZXNzYWdlIGFscmVhZHkgY29uc3VtZWQgWyR7ZmlsZW5hbWV9XWApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkKSB7XG5cblx0XHRcdFx0XHRcdGZzLnVubGluayhmdWxsUGF0aCwgZnVuY3Rpb24gKGVyciwgcmVzKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChlcnIpIHt0aHJvdyBlcnI7fTtcblx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIsIG1lc3NhZ2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIkNvbnN1bWUgZXJyb3JcIiwgZXJyKTtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjb25zdW1lQWxsRXhpc3Rpbmcoc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCBzaG91bGRXYWl0Rm9yTW9yZSkge1xuXG5cdFx0bGV0IGN1cnJlbnRGaWxlcyA9IFtdO1xuXG5cdFx0ZnMucmVhZGRpcihmb2xkZXIsICd1dGY4JywgZnVuY3Rpb24gKGVyciwgZmlsZXMpIHtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0JCQuZXJyb3JIYW5kbGVyLmVycm9yKGVycik7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGN1cnJlbnRGaWxlcyA9IGZpbGVzO1xuXHRcdFx0aXRlcmF0ZUFuZENvbnN1bWUoZmlsZXMpO1xuXG5cdFx0fSk7XG5cblx0XHRmdW5jdGlvbiBzdGFydFdhdGNoaW5nKCl7XG5cdFx0XHRpZiAoc2hvdWxkV2FpdEZvck1vcmUodHJ1ZSkpIHtcblx0XHRcdFx0d2F0Y2hGb2xkZXIoc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCBzaG91bGRXYWl0Rm9yTW9yZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaXRlcmF0ZUFuZENvbnN1bWUoZmlsZXMsIGN1cnJlbnRJbmRleCA9IDApIHtcblx0XHRcdGlmIChjdXJyZW50SW5kZXggPT09IGZpbGVzLmxlbmd0aCkge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKFwic3RhcnQgd2F0Y2hpbmdcIiwgbmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuXHRcdFx0XHRzdGFydFdhdGNoaW5nKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHBhdGguZXh0bmFtZShmaWxlc1tjdXJyZW50SW5kZXhdKSAhPT0gaW5fcHJvZ3Jlc3MpIHtcblx0XHRcdFx0Y29uc3VtZU1lc3NhZ2UoZmlsZXNbY3VycmVudEluZGV4XSwgc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCAoZXJyLCBkYXRhKSA9PiB7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0aXRlcmF0ZUFuZENvbnN1bWUoZmlsZXMsICsrY3VycmVudEluZGV4KTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y29uc3VtZXIobnVsbCwgZGF0YSwgcGF0aC5iYXNlbmFtZShmaWxlc1tjdXJyZW50SW5kZXhdKSk7XG5cdFx0XHRcdFx0aWYgKHNob3VsZFdhaXRGb3JNb3JlKCkpIHtcblx0XHRcdFx0XHRcdGl0ZXJhdGVBbmRDb25zdW1lKGZpbGVzLCArK2N1cnJlbnRJbmRleCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGl0ZXJhdGVBbmRDb25zdW1lKGZpbGVzLCArK2N1cnJlbnRJbmRleCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gd3JpdGVGaWxlKGZpbGVuYW1lLCBjb250ZW50LCBjYWxsYmFjayl7XG5cdFx0aWYocmVjaXBpZW50KXtcblx0XHRcdHZhciBlbnZlbG9wZSA9IGJ1aWxkRW52ZWxvcGUoZmlsZW5hbWUsIGNvbnRlbnQpO1xuXHRcdFx0Ly9jb25zb2xlLmxvZyhcIlNlbmRpbmcgdG9cIiwgcmVjaXBpZW50LnBpZCwgcmVjaXBpZW50LnBwaWQsIFwiZW52ZWxvcGVcIiwgZW52ZWxvcGUpO1xuXHRcdFx0cmVjaXBpZW50LnNlbmQoZW52ZWxvcGUpO1xuXHRcdFx0dmFyIGNvbmZpcm1hdGlvblJlY2VpdmVkID0gZmFsc2U7XG5cblx0XHRcdGZ1bmN0aW9uIHJlY2VpdmVDb25maXJtYXRpb24obWVzc2FnZSl7XG5cdFx0XHRcdGlmKG1lc3NhZ2UgPT09IGJ1aWxkRW52ZWxvcGVDb25maXJtYXRpb24oZW52ZWxvcGUpKXtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKFwiUmVjZWl2ZWQgY29uZmlybWF0aW9uXCIsIHJlY2lwaWVudC5waWQpO1xuXHRcdFx0XHRcdGNvbmZpcm1hdGlvblJlY2VpdmVkID0gdHJ1ZTtcblx0XHRcdFx0XHR0cnl7XG5cdFx0XHRcdFx0XHRyZWNpcGllbnQub2ZmKFwibWVzc2FnZVwiLCByZWNlaXZlQ29uZmlybWF0aW9uKTtcblx0XHRcdFx0XHR9Y2F0Y2goZXJyKXtcblx0XHRcdFx0XHRcdC8vLi4uXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmVjaXBpZW50Lm9uKFwibWVzc2FnZVwiLCByZWNlaXZlQ29uZmlybWF0aW9uKTtcblxuXHRcdFx0c2V0VGltZW91dCgoKT0+e1xuXHRcdFx0XHRpZighY29uZmlybWF0aW9uUmVjZWl2ZWQpe1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coXCJObyBjb25maXJtYXRpb24uLi5cIiwgcHJvY2Vzcy5waWQpO1xuXHRcdFx0XHRcdGhpZGRlbl93cml0ZUZpbGUoZmlsZW5hbWUsIGNvbnRlbnQsIGNhbGxiYWNrKTtcblx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0aWYoY2FsbGJhY2spe1xuXHRcdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIGNvbnRlbnQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSwgMjAwKTtcblx0XHR9ZWxzZXtcblx0XHRcdGhpZGRlbl93cml0ZUZpbGUoZmlsZW5hbWUsIGNvbnRlbnQsIGNhbGxiYWNrKTtcblx0XHR9XG5cdH1cblxuXHRjb25zdCBpbl9wcm9ncmVzcyA9IFwiLmluX3Byb2dyZXNzXCI7XG5cdGZ1bmN0aW9uIGhpZGRlbl93cml0ZUZpbGUoZmlsZW5hbWUsIGNvbnRlbnQsIGNhbGxiYWNrKXtcblx0XHR2YXIgdG1wRmlsZW5hbWUgPSBmaWxlbmFtZStpbl9wcm9ncmVzcztcblx0XHR0cnl7XG5cdFx0XHRpZihmcy5leGlzdHNTeW5jKHRtcEZpbGVuYW1lKSB8fCBmcy5leGlzdHNTeW5jKGZpbGVuYW1lKSl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKG5ldyBFcnJvcihgT3ZlcndyaXRpbmcgZmlsZSAke2ZpbGVuYW1lfWApKTtcblx0XHRcdH1cblx0XHRcdGZzLndyaXRlRmlsZVN5bmModG1wRmlsZW5hbWUsIGNvbnRlbnQpO1xuXHRcdFx0ZnMucmVuYW1lU3luYyh0bXBGaWxlbmFtZSwgZmlsZW5hbWUpO1xuXHRcdH1jYXRjaChlcnIpe1xuXHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycik7XG5cdFx0fVxuXHRcdGNhbGxiYWNrKG51bGwsIGNvbnRlbnQpO1xuXHR9XG5cblx0dmFyIGFscmVhZHlLbm93bkNoYW5nZXMgPSB7fTtcblxuXHRmdW5jdGlvbiBhbHJlYWR5RmlyZWRDaGFuZ2VzKGZpbGVuYW1lLCBjaGFuZ2Upe1xuXHRcdHZhciByZXMgPSBmYWxzZTtcblx0XHRpZihhbHJlYWR5S25vd25DaGFuZ2VzW2ZpbGVuYW1lXSl7XG5cdFx0XHRyZXMgPSB0cnVlO1xuXHRcdH1lbHNle1xuXHRcdFx0YWxyZWFkeUtub3duQ2hhbmdlc1tmaWxlbmFtZV0gPSBjaGFuZ2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlcztcblx0fVxuXG5cdGZ1bmN0aW9uIHdhdGNoRm9sZGVyKHNob3VsZERlbGV0ZUFmdGVyUmVhZCwgc2hvdWxkV2FpdEZvck1vcmUpe1xuXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0ZnMucmVhZGRpcihmb2xkZXIsICd1dGY4JywgZnVuY3Rpb24gKGVyciwgZmlsZXMpIHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdCQkLmVycm9ySGFuZGxlci5lcnJvcihlcnIpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZvcih2YXIgaT0wOyBpPGZpbGVzLmxlbmd0aDsgaSsrKXtcblx0XHRcdFx0XHR3YXRjaEZpbGVzSGFuZGxlcihcImNoYW5nZVwiLCBmaWxlc1tpXSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIDEwMDApO1xuXG5cdFx0ZnVuY3Rpb24gd2F0Y2hGaWxlc0hhbmRsZXIoZXZlbnRUeXBlLCBmaWxlbmFtZSl7XG5cdFx0XHQvL2NvbnNvbGUubG9nKGBHb3QgJHtldmVudFR5cGV9IG9uICR7ZmlsZW5hbWV9YCk7XG5cblx0XHRcdGlmKCFmaWxlbmFtZSB8fCBwYXRoLmV4dG5hbWUoZmlsZW5hbWUpID09PSBpbl9wcm9ncmVzcyl7XG5cdFx0XHRcdC8vY2F1Z2h0IGEgZGVsZXRlIGV2ZW50IG9mIGEgZmlsZVxuXHRcdFx0XHQvL29yXG5cdFx0XHRcdC8vZmlsZSBub3QgcmVhZHkgdG8gYmUgY29uc3VtZWQgKGluIHByb2dyZXNzKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHZhciBmID0gYnVpbGRQYXRoRm9yRmlsZShmaWxlbmFtZSk7XG5cdFx0XHRpZighZnMuZXhpc3RzU3luYyhmKSl7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coXCJGaWxlIG5vdCBmb3VuZFwiLCBmKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvL2NvbnNvbGUubG9nKGBQcmVwYXJpbmcgdG8gY29uc3VtZSAke2ZpbGVuYW1lfWApO1xuXHRcdFx0aWYoIWFscmVhZHlGaXJlZENoYW5nZXMoZmlsZW5hbWUsIGV2ZW50VHlwZSkpe1xuXHRcdFx0XHRjb25zdW1lTWVzc2FnZShmaWxlbmFtZSwgc2hvdWxkRGVsZXRlQWZ0ZXJSZWFkLCAoZXJyLCBkYXRhKSA9PiB7XG5cdFx0XHRcdFx0Ly9hbGxvdyBhIHJlYWQgYSB0aGUgZmlsZVxuXHRcdFx0XHRcdGFscmVhZHlLbm93bkNoYW5nZXNbZmlsZW5hbWVdID0gdW5kZWZpbmVkO1xuXG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0Ly8gPz9cblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiXFxuQ2F1Z2h0IGFuIGVycm9yXCIsIGVycik7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Y29uc3VtZXIobnVsbCwgZGF0YSwgZmlsZW5hbWUpO1xuXG5cblx0XHRcdFx0XHRpZiAoIXNob3VsZFdhaXRGb3JNb3JlKCkpIHtcblx0XHRcdFx0XHRcdHdhdGNoZXIuY2xvc2UoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiU29tZXRoaW5nIGhhcHBlbnMuLi5cIiwgZmlsZW5hbWUpO1xuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0Y29uc3Qgd2F0Y2hlciA9IGZzLndhdGNoKGZvbGRlciwgd2F0Y2hGaWxlc0hhbmRsZXIpO1xuXG5cdFx0Y29uc3QgaW50ZXJ2YWxUaW1lciA9IHNldEludGVydmFsKCgpPT57XG5cdFx0XHRmcy5yZWFkZGlyKGZvbGRlciwgJ3V0ZjgnLCBmdW5jdGlvbiAoZXJyLCBmaWxlcykge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0JCQuZXJyb3JIYW5kbGVyLmVycm9yKGVycik7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYoZmlsZXMubGVuZ3RoID4gMCl7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coYFxcblxcbkZvdW5kICR7ZmlsZXMubGVuZ3RofSBmaWxlcyBub3QgY29uc3VtZWQgeWV0IGluICR7Zm9sZGVyfWAsIG5ldyBEYXRlKCkuZ2V0VGltZSgpLFwiXFxuXFxuXCIpO1xuXHRcdFx0XHRcdC8vZmFraW5nIGEgcmVuYW1lIGV2ZW50IHRyaWdnZXJcblx0XHRcdFx0XHR3YXRjaEZpbGVzSGFuZGxlcihcInJlbmFtZVwiLCBmaWxlc1swXSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIDUwMDApO1xuXHR9XG59XG5cbmV4cG9ydHMuZ2V0Rm9sZGVyUXVldWUgPSBmdW5jdGlvbihmb2xkZXIsIGNhbGxiYWNrKXtcblx0cmV0dXJuIG5ldyBGb2xkZXJNUShmb2xkZXIsIGNhbGxiYWNrKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFBlbmQ7XG5cbmZ1bmN0aW9uIFBlbmQoKSB7XG4gIHRoaXMucGVuZGluZyA9IDA7XG4gIHRoaXMubWF4ID0gSW5maW5pdHk7XG4gIHRoaXMubGlzdGVuZXJzID0gW107XG4gIHRoaXMud2FpdGluZyA9IFtdO1xuICB0aGlzLmVycm9yID0gbnVsbDtcbn1cblxuUGVuZC5wcm90b3R5cGUuZ28gPSBmdW5jdGlvbihmbikge1xuICBpZiAodGhpcy5wZW5kaW5nIDwgdGhpcy5tYXgpIHtcbiAgICBwZW5kR28odGhpcywgZm4pO1xuICB9IGVsc2Uge1xuICAgIHRoaXMud2FpdGluZy5wdXNoKGZuKTtcbiAgfVxufTtcblxuUGVuZC5wcm90b3R5cGUud2FpdCA9IGZ1bmN0aW9uKGNiKSB7XG4gIGlmICh0aGlzLnBlbmRpbmcgPT09IDApIHtcbiAgICBjYih0aGlzLmVycm9yKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmxpc3RlbmVycy5wdXNoKGNiKTtcbiAgfVxufTtcblxuUGVuZC5wcm90b3R5cGUuaG9sZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gcGVuZEhvbGQodGhpcyk7XG59O1xuXG5mdW5jdGlvbiBwZW5kSG9sZChzZWxmKSB7XG4gIHNlbGYucGVuZGluZyArPSAxO1xuICB2YXIgY2FsbGVkID0gZmFsc2U7XG4gIHJldHVybiBvbkNiO1xuICBmdW5jdGlvbiBvbkNiKGVycikge1xuICAgIGlmIChjYWxsZWQpIHRocm93IG5ldyBFcnJvcihcImNhbGxiYWNrIGNhbGxlZCB0d2ljZVwiKTtcbiAgICBjYWxsZWQgPSB0cnVlO1xuICAgIHNlbGYuZXJyb3IgPSBzZWxmLmVycm9yIHx8IGVycjtcbiAgICBzZWxmLnBlbmRpbmcgLT0gMTtcbiAgICBpZiAoc2VsZi53YWl0aW5nLmxlbmd0aCA+IDAgJiYgc2VsZi5wZW5kaW5nIDwgc2VsZi5tYXgpIHtcbiAgICAgIHBlbmRHbyhzZWxmLCBzZWxmLndhaXRpbmcuc2hpZnQoKSk7XG4gICAgfSBlbHNlIGlmIChzZWxmLnBlbmRpbmcgPT09IDApIHtcbiAgICAgIHZhciBsaXN0ZW5lcnMgPSBzZWxmLmxpc3RlbmVycztcbiAgICAgIHNlbGYubGlzdGVuZXJzID0gW107XG4gICAgICBsaXN0ZW5lcnMuZm9yRWFjaChjYkxpc3RlbmVyKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gY2JMaXN0ZW5lcihsaXN0ZW5lcikge1xuICAgIGxpc3RlbmVyKHNlbGYuZXJyb3IpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBlbmRHbyhzZWxmLCBmbikge1xuICBmbihwZW5kSG9sZChzZWxmKSk7XG59XG4iLCJjb25zdCBtc2dwYWNrID0gcmVxdWlyZSgnQG1zZ3BhY2svbXNncGFjaycpO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKiAgdXRpbGl0eSBjbGFzcyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuZnVuY3Rpb24gUmVxdWVzdE1hbmFnZXIocG9sbGluZ1RpbWVPdXQpe1xuICAgIGlmKCFwb2xsaW5nVGltZU91dCl7XG4gICAgICAgIHBvbGxpbmdUaW1lT3V0ID0gMTAwMDsgLy8xIHNlY29uZCBieSBkZWZhdWx0XG4gICAgfVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gUmVxdWVzdChlbmRQb2ludCwgaW5pdGlhbFN3YXJtKXtcbiAgICAgICAgdmFyIG9uUmV0dXJuQ2FsbGJhY2tzID0gW107XG4gICAgICAgIHZhciBvbkVycm9yQ2FsbGJhY2tzID0gW107XG4gICAgICAgIHZhciBvbkNhbGxiYWNrcyA9IFtdO1xuICAgICAgICB2YXIgcmVxdWVzdElkID0gaW5pdGlhbFN3YXJtLm1ldGEucmVxdWVzdElkO1xuICAgICAgICBpbml0aWFsU3dhcm0gPSBudWxsO1xuXG4gICAgICAgIHRoaXMuZ2V0UmVxdWVzdElkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0SWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vbiA9IGZ1bmN0aW9uKHBoYXNlTmFtZSwgY2FsbGJhY2spe1xuICAgICAgICAgICAgaWYodHlwZW9mIHBoYXNlTmFtZSAhPSBcInN0cmluZ1wiICAmJiB0eXBlb2YgY2FsbGJhY2sgIT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgZmlyc3QgcGFyYW1ldGVyIHNob3VsZCBiZSBhIHN0cmluZyBhbmQgdGhlIHNlY29uZCBwYXJhbWV0ZXIgc2hvdWxkIGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG9uQ2FsbGJhY2tzLnB1c2goe1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrOmNhbGxiYWNrLFxuICAgICAgICAgICAgICAgIHBoYXNlOnBoYXNlTmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzZWxmLnBvbGwoZW5kUG9pbnQsIHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vblJldHVybiA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgICAgIG9uUmV0dXJuQ2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgc2VsZi5wb2xsKGVuZFBvaW50LCB0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub25FcnJvciA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgICAgIGlmKG9uRXJyb3JDYWxsYmFja3MuaW5kZXhPZihjYWxsYmFjaykhPT0tMSl7XG4gICAgICAgICAgICAgICAgb25FcnJvckNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgY2FsbGJhY2sgYWxyZWFkeSByZWdpc3RlcmVkIVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoID0gZnVuY3Rpb24oZXJyLCByZXN1bHQpe1xuICAgICAgICAgICAgaWYoQXJyYXlCdWZmZXIuaXNWaWV3KHJlc3VsdCkgfHwgQnVmZmVyLmlzQnVmZmVyKHJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBtc2dwYWNrLmRlY29kZShyZXN1bHQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXN1bHQgPSB0eXBlb2YgcmVzdWx0ID09PSBcInN0cmluZ1wiID8gSlNPTi5wYXJzZShyZXN1bHQpIDogcmVzdWx0O1xuXG4gICAgICAgICAgICByZXN1bHQgPSBPd00ucHJvdG90eXBlLmNvbnZlcnQocmVzdWx0KTtcbiAgICAgICAgICAgIHZhciByZXN1bHRSZXFJZCA9IHJlc3VsdC5nZXRNZXRhKFwicmVxdWVzdElkXCIpO1xuICAgICAgICAgICAgdmFyIHBoYXNlTmFtZSA9IHJlc3VsdC5nZXRNZXRhKFwicGhhc2VOYW1lXCIpO1xuICAgICAgICAgICAgdmFyIG9uUmV0dXJuID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmKHJlc3VsdFJlcUlkID09PSByZXF1ZXN0SWQpe1xuICAgICAgICAgICAgICAgIG9uUmV0dXJuQ2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oYyl7XG4gICAgICAgICAgICAgICAgICAgIGMobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgb25SZXR1cm4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmKG9uUmV0dXJuKXtcbiAgICAgICAgICAgICAgICAgICAgb25SZXR1cm5DYWxsYmFja3MgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvckNhbGxiYWNrcyA9IFtdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG9uQ2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oaSl7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJYWFhYWFhYWDpcIiwgcGhhc2VOYW1lICwgaSk7XG4gICAgICAgICAgICAgICAgICAgIGlmKHBoYXNlTmFtZSA9PT0gaS5waGFzZSB8fCBpLnBoYXNlID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkuY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKG9uUmV0dXJuQ2FsbGJhY2tzLmxlbmd0aCA9PT0gMCAmJiBvbkNhbGxiYWNrcy5sZW5ndGggPT09IDApe1xuICAgICAgICAgICAgICAgIHNlbGYudW5wb2xsKGVuZFBvaW50LCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoRXJyb3IgPSBmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgZm9yKHZhciBpPTA7IGkgPCBvbkVycm9yQ2FsbGJhY2tzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICB2YXIgZXJyQ2IgPSBvbkVycm9yQ2FsbGJhY2tzW2ldO1xuICAgICAgICAgICAgICAgIGVyckNiKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vZmYgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi51bnBvbGwoZW5kUG9pbnQsIHRoaXMpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHRoaXMuY3JlYXRlUmVxdWVzdCA9IGZ1bmN0aW9uKHJlbW90ZUVuZFBvaW50LCBzd2FybSl7XG4gICAgICAgIGxldCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QocmVtb3RlRW5kUG9pbnQsIHN3YXJtKTtcbiAgICAgICAgcmV0dXJuIHJlcXVlc3Q7XG4gICAgfTtcblxuICAgIC8qICoqKioqKioqKioqKioqKioqKioqKioqKioqKiBwb2xsaW5nIHpvbmUgKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgIHZhciBwb2xsU2V0ID0ge1xuICAgIH07XG5cbiAgICB2YXIgYWN0aXZlQ29ubmVjdGlvbnMgPSB7XG4gICAgfTtcblxuICAgIHRoaXMucG9sbCA9IGZ1bmN0aW9uKHJlbW90ZUVuZFBvaW50LCByZXF1ZXN0KXtcbiAgICAgICAgdmFyIHJlcXVlc3RzID0gcG9sbFNldFtyZW1vdGVFbmRQb2ludF07XG4gICAgICAgIGlmKCFyZXF1ZXN0cyl7XG4gICAgICAgICAgICByZXF1ZXN0cyA9IHt9O1xuICAgICAgICAgICAgcG9sbFNldFtyZW1vdGVFbmRQb2ludF0gPSByZXF1ZXN0cztcbiAgICAgICAgfVxuICAgICAgICByZXF1ZXN0c1tyZXF1ZXN0LmdldFJlcXVlc3RJZCgpXSA9IHJlcXVlc3Q7XG4gICAgICAgIHBvbGxpbmdIYW5kbGVyKCk7XG4gICAgfTtcblxuICAgIHRoaXMudW5wb2xsID0gZnVuY3Rpb24ocmVtb3RlRW5kUG9pbnQsIHJlcXVlc3Qpe1xuICAgICAgICB2YXIgcmVxdWVzdHMgPSBwb2xsU2V0W3JlbW90ZUVuZFBvaW50XTtcbiAgICAgICAgaWYocmVxdWVzdHMpe1xuICAgICAgICAgICAgZGVsZXRlIHJlcXVlc3RzW3JlcXVlc3QuZ2V0UmVxdWVzdElkKCldO1xuICAgICAgICAgICAgaWYoT2JqZWN0LmtleXMocmVxdWVzdHMpLmxlbmd0aCA9PT0gMCl7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHBvbGxTZXRbcmVtb3RlRW5kUG9pbnRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJVbnBvbGxpbmcgd3JvbmcgcmVxdWVzdDpcIixyZW1vdGVFbmRQb2ludCwgcmVxdWVzdCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlUG9sbFRocmVhZChyZW1vdGVFbmRQb2ludCl7XG4gICAgICAgIGZ1bmN0aW9uIHJlQXJtKCl7XG4gICAgICAgICAgICAkJC5yZW1vdGUuZG9IdHRwR2V0KHJlbW90ZUVuZFBvaW50LCBmdW5jdGlvbihlcnIsIHJlcyl7XG4gICAgICAgICAgICAgICAgbGV0IHJlcXVlc3RzID0gcG9sbFNldFtyZW1vdGVFbmRQb2ludF07XG5cbiAgICAgICAgICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICAgICAgICAgICBmb3IobGV0IHJlcV9pZCBpbiByZXF1ZXN0cyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZXJyX2hhbmRsZXIgPSByZXF1ZXN0c1tyZXFfaWRdLmRpc3BhdGNoRXJyb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihlcnJfaGFuZGxlcil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyX2hhbmRsZXIoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVDb25uZWN0aW9uc1tyZW1vdGVFbmRQb2ludF0gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZihCdWZmZXIuaXNCdWZmZXIocmVzKSB8fCBBcnJheUJ1ZmZlci5pc1ZpZXcocmVzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzID0gbXNncGFjay5kZWNvZGUocmVzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgayBpbiByZXF1ZXN0cyl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0c1trXS5kaXNwYXRjaChudWxsLCByZXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoT2JqZWN0LmtleXMocmVxdWVzdHMpLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVBcm0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVDb25uZWN0aW9uc1tyZW1vdGVFbmRQb2ludF07XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVuZGluZyBwb2xsaW5nIGZvciBcIiwgcmVtb3RlRW5kUG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVBcm0oKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwb2xsaW5nSGFuZGxlcigpe1xuICAgICAgICBsZXQgc2V0VGltZXIgPSBmYWxzZTtcbiAgICAgICAgZm9yKHZhciB2IGluIHBvbGxTZXQpe1xuICAgICAgICAgICAgaWYoIWFjdGl2ZUNvbm5lY3Rpb25zW3ZdKXtcbiAgICAgICAgICAgICAgICBjcmVhdGVQb2xsVGhyZWFkKHYpO1xuICAgICAgICAgICAgICAgIGFjdGl2ZUNvbm5lY3Rpb25zW3ZdID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFRpbWVyID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZihzZXRUaW1lcikge1xuICAgICAgICAgICAgc2V0VGltZW91dChwb2xsaW5nSGFuZGxlciwgcG9sbGluZ1RpbWVPdXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0VGltZW91dCggcG9sbGluZ0hhbmRsZXIsIHBvbGxpbmdUaW1lT3V0KTtcbn1cblxuXG5mdW5jdGlvbiBleHRyYWN0RG9tYWluQWdlbnREZXRhaWxzKHVybCl7XG4gICAgY29uc3QgdlJlZ2V4ID0gLyhbYS16QS1aMC05XSp8LikqXFwvYWdlbnRcXC8oW2EtekEtWjAtOV0rKFxcLykqKSsvZztcblxuICAgIGlmKCF1cmwubWF0Y2godlJlZ2V4KSl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgZm9ybWF0LiAoRWcuIGRvbWFpblsuc3ViZG9tYWluXSovYWdlbnQvW29yZ2FuaXNhdGlvbi9dKmFnZW50SWQpXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IGRldmlkZXIgPSBcIi9hZ2VudC9cIjtcbiAgICBsZXQgZG9tYWluO1xuICAgIGxldCBhZ2VudFVybDtcblxuICAgIGNvbnN0IHNwbGl0UG9pbnQgPSB1cmwuaW5kZXhPZihkZXZpZGVyKTtcbiAgICBpZihzcGxpdFBvaW50ICE9PSAtMSl7XG4gICAgICAgIGRvbWFpbiA9IHVybC5zbGljZSgwLCBzcGxpdFBvaW50KTtcbiAgICAgICAgYWdlbnRVcmwgPSB1cmwuc2xpY2Uoc3BsaXRQb2ludCtkZXZpZGVyLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtkb21haW4sIGFnZW50VXJsfTtcbn1cblxuZnVuY3Rpb24gdXJsRW5kV2l0aFNsYXNoKHVybCl7XG5cbiAgICBpZih1cmxbdXJsLmxlbmd0aCAtIDFdICE9PSBcIi9cIil7XG4gICAgICAgIHVybCArPSBcIi9cIjtcbiAgICB9XG5cbiAgICByZXR1cm4gdXJsO1xufVxuXG5jb25zdCBPd00gPSByZXF1aXJlKFwic3dhcm11dGlsc1wiKS5Pd007XG5cbi8qKioqKioqKioqKioqKioqKioqKioqIG1haW4gQVBJcyBvbiB3b3JraW5nIHdpdGggcmVtb3RlIGVuZCBwb2ludHMgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbmZ1bmN0aW9uIFBza0h0dHBDbGllbnQocmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBvcHRpb25zKXtcbiAgICB2YXIgYmFzZU9mUmVtb3RlRW5kUG9pbnQgPSByZW1vdGVFbmRQb2ludDsgLy9yZW1vdmUgbGFzdCBpZFxuXG4gICAgcmVtb3RlRW5kUG9pbnQgPSB1cmxFbmRXaXRoU2xhc2gocmVtb3RlRW5kUG9pbnQpO1xuXG4gICAgLy9kb21haW5JbmZvIGNvbnRhaW5zIDIgbWVtYmVyczogZG9tYWluIChwcml2YXRlU2t5IGRvbWFpbikgYW5kIGFnZW50VXJsXG4gICAgY29uc3QgZG9tYWluSW5mbyA9IGV4dHJhY3REb21haW5BZ2VudERldGFpbHMoYWdlbnRVaWQpO1xuICAgIGxldCBob21lU2VjdXJpdHlDb250ZXh0ID0gZG9tYWluSW5mby5hZ2VudFVybDtcbiAgICBsZXQgcmV0dXJuUmVtb3RlRW5kUG9pbnQgPSByZW1vdGVFbmRQb2ludDtcblxuICAgIGlmKG9wdGlvbnMgJiYgdHlwZW9mIG9wdGlvbnMucmV0dXJuUmVtb3RlICE9IFwidW5kZWZpbmVkXCIpe1xuICAgICAgICByZXR1cm5SZW1vdGVFbmRQb2ludCA9IG9wdGlvbnMucmV0dXJuUmVtb3RlO1xuICAgIH1cblxuICAgIGlmKCFvcHRpb25zIHx8IG9wdGlvbnMgJiYgKHR5cGVvZiBvcHRpb25zLnVuaXF1ZUlkID09IFwidW5kZWZpbmVkXCIgfHwgb3B0aW9ucy51bmlxdWVJZCkpe1xuICAgICAgICBob21lU2VjdXJpdHlDb250ZXh0ICs9IFwiX1wiK01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KTtcbiAgICB9XG5cbiAgICByZXR1cm5SZW1vdGVFbmRQb2ludCA9IHVybEVuZFdpdGhTbGFzaChyZXR1cm5SZW1vdGVFbmRQb2ludCk7XG5cbiAgICB0aGlzLnN0YXJ0U3dhcm0gPSBmdW5jdGlvbihzd2FybU5hbWUsIHBoYXNlTmFtZSwgLi4uYXJncyl7XG4gICAgICAgIGNvbnN0IHN3YXJtID0gbmV3IE93TSgpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwic3dhcm1JZFwiLCAkJC51aWRHZW5lcmF0b3Iuc2FmZV91dWlkKCkpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwicmVxdWVzdElkXCIsIHN3YXJtLmdldE1ldGEoXCJzd2FybUlkXCIpKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInN3YXJtVHlwZU5hbWVcIiwgc3dhcm1OYW1lKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInBoYXNlTmFtZVwiLCBwaGFzZU5hbWUpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiYXJnc1wiLCBhcmdzKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImNvbW1hbmRcIiwgXCJleGVjdXRlU3dhcm1QaGFzZVwiKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInRhcmdldFwiLCBkb21haW5JbmZvLmFnZW50VXJsKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImhvbWVTZWN1cml0eUNvbnRleHRcIiwgcmV0dXJuUmVtb3RlRW5kUG9pbnQrJCQucmVtb3RlLmJhc2U2NEVuY29kZShob21lU2VjdXJpdHlDb250ZXh0KSk7XG5cbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cFBvc3QoZ2V0UmVtb3RlKHJlbW90ZUVuZFBvaW50LCBkb21haW5JbmZvLmRvbWFpbiksIG1zZ3BhY2suZW5jb2RlKHN3YXJtKSwgZnVuY3Rpb24oZXJyLCByZXMpe1xuICAgICAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gJCQucmVtb3RlLnJlcXVlc3RNYW5hZ2VyLmNyZWF0ZVJlcXVlc3Qoc3dhcm0uZ2V0TWV0YShcImhvbWVTZWN1cml0eUNvbnRleHRcIiksIHN3YXJtKTtcbiAgICB9O1xuXG4gICAgdGhpcy5jb250aW51ZVN3YXJtID0gZnVuY3Rpb24oZXhpc3RpbmdTd2FybSwgcGhhc2VOYW1lLCAuLi5hcmdzKXtcbiAgICAgICAgdmFyIHN3YXJtID0gbmV3IE93TShleGlzdGluZ1N3YXJtKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInBoYXNlTmFtZVwiLCBwaGFzZU5hbWUpO1xuICAgICAgICBzd2FybS5zZXRNZXRhKFwiYXJnc1wiLCBhcmdzKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImNvbW1hbmRcIiwgXCJleGVjdXRlU3dhcm1QaGFzZVwiKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcInRhcmdldFwiLCBkb21haW5JbmZvLmFnZW50VXJsKTtcbiAgICAgICAgc3dhcm0uc2V0TWV0YShcImhvbWVTZWN1cml0eUNvbnRleHRcIiwgcmV0dXJuUmVtb3RlRW5kUG9pbnQrJCQucmVtb3RlLmJhc2U2NEVuY29kZShob21lU2VjdXJpdHlDb250ZXh0KSk7XG5cbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cFBvc3QoZ2V0UmVtb3RlKHJlbW90ZUVuZFBvaW50LCBkb21haW5JbmZvLmRvbWFpbiksIG1zZ3BhY2suZW5jb2RlKHN3YXJtKSwgZnVuY3Rpb24oZXJyLCByZXMpe1xuICAgICAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy9yZXR1cm4gJCQucmVtb3RlLnJlcXVlc3RNYW5hZ2VyLmNyZWF0ZVJlcXVlc3Qoc3dhcm0uZ2V0TWV0YShcImhvbWVTZWN1cml0eUNvbnRleHRcIiksIHN3YXJtKTtcbiAgICB9O1xuXG4gICAgdmFyIGFsbENhdGNoQWxscyA9IFtdO1xuICAgIHZhciByZXF1ZXN0c0NvdW50ZXIgPSAwO1xuICAgIGZ1bmN0aW9uIENhdGNoQWxsKHN3YXJtTmFtZSwgcGhhc2VOYW1lLCBjYWxsYmFjayl7IC8vc2FtZSBpbnRlcmZhY2UgYXMgUmVxdWVzdFxuICAgICAgICB2YXIgcmVxdWVzdElkID0gcmVxdWVzdHNDb3VudGVyKys7XG4gICAgICAgIHRoaXMuZ2V0UmVxdWVzdElkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGxldCByZXFJZCA9IFwic3dhcm1OYW1lXCIgKyBcInBoYXNlTmFtZVwiICsgcmVxdWVzdElkO1xuICAgICAgICAgICAgcmV0dXJuIHJlcUlkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2ggPSBmdW5jdGlvbihlcnIsIHJlc3VsdCl7XG4gICAgICAgICAgICByZXN1bHQgPSBPd00ucHJvdG90eXBlLmNvbnZlcnQocmVzdWx0KTtcbiAgICAgICAgICAgIHZhciBjdXJyZW50UGhhc2VOYW1lID0gcmVzdWx0LmdldE1ldGEoXCJwaGFzZU5hbWVcIik7XG4gICAgICAgICAgICB2YXIgY3VycmVudFN3YXJtTmFtZSA9IHJlc3VsdC5nZXRNZXRhKFwic3dhcm1UeXBlTmFtZVwiKTtcbiAgICAgICAgICAgIGlmKChjdXJyZW50U3dhcm1OYW1lID09PSBzd2FybU5hbWUgfHwgc3dhcm1OYW1lID09PSAnKicpICYmIChjdXJyZW50UGhhc2VOYW1lID09PSBwaGFzZU5hbWUgfHwgcGhhc2VOYW1lID09PSAnKicpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyciwgcmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLm9uID0gZnVuY3Rpb24oc3dhcm1OYW1lLCBwaGFzZU5hbWUsIGNhbGxiYWNrKXtcbiAgICAgICAgdmFyIGMgPSBuZXcgQ2F0Y2hBbGwoc3dhcm1OYW1lLCBwaGFzZU5hbWUsIGNhbGxiYWNrKTtcbiAgICAgICAgYWxsQ2F0Y2hBbGxzLnB1c2goe1xuICAgICAgICAgICAgczpzd2FybU5hbWUsXG4gICAgICAgICAgICBwOnBoYXNlTmFtZSxcbiAgICAgICAgICAgIGM6Y1xuICAgICAgICB9KTtcblxuICAgICAgICAkJC5yZW1vdGUucmVxdWVzdE1hbmFnZXIucG9sbChnZXRSZW1vdGUocmVtb3RlRW5kUG9pbnQsIGRvbWFpbkluZm8uZG9tYWluKSAsIGMpO1xuICAgIH07XG5cbiAgICB0aGlzLm9mZiA9IGZ1bmN0aW9uKHN3YXJtTmFtZSwgcGhhc2VOYW1lKXtcbiAgICAgICAgYWxsQ2F0Y2hBbGxzLmZvckVhY2goZnVuY3Rpb24oY2Epe1xuICAgICAgICAgICAgaWYoKGNhLnMgPT09IHN3YXJtTmFtZSB8fCBzd2FybU5hbWUgPT09ICcqJykgJiYgKHBoYXNlTmFtZSA9PT0gY2EucCB8fCBwaGFzZU5hbWUgPT09ICcqJykpe1xuICAgICAgICAgICAgICAgICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlci51bnBvbGwoZ2V0UmVtb3RlKHJlbW90ZUVuZFBvaW50LCBkb21haW5JbmZvLmRvbWFpbiksIGNhLmMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy51cGxvYWRDU0IgPSBmdW5jdGlvbihjcnlwdG9VaWQsIGJpbmFyeURhdGEsIGNhbGxiYWNrKXtcbiAgICAgICAgJCQucmVtb3RlLmRvSHR0cFBvc3QoYmFzZU9mUmVtb3RlRW5kUG9pbnQgKyBcIi9DU0IvXCIgKyBjcnlwdG9VaWQsIGJpbmFyeURhdGEsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgdGhpcy5kb3dubG9hZENTQiA9IGZ1bmN0aW9uKGNyeXB0b1VpZCwgY2FsbGJhY2spe1xuICAgICAgICAkJC5yZW1vdGUuZG9IdHRwR2V0KGJhc2VPZlJlbW90ZUVuZFBvaW50ICsgXCIvQ1NCL1wiICsgY3J5cHRvVWlkLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGdldFJlbW90ZShiYXNlVXJsLCBkb21haW4pIHtcbiAgICAgICAgcmV0dXJuIHVybEVuZFdpdGhTbGFzaChiYXNlVXJsKSArICQkLnJlbW90ZS5iYXNlNjRFbmNvZGUoZG9tYWluKTtcbiAgICB9XG59XG5cbi8qKioqKioqKioqKioqKioqKioqKioqIGluaXRpYWxpc2F0aW9uIHN0dWZmICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5pZiAodHlwZW9mICQkID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgJCQgPSB7fTtcbn1cblxuaWYgKHR5cGVvZiAgJCQucmVtb3RlID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgJCQucmVtb3RlID0ge307XG4gICAgJCQucmVtb3RlLmNyZWF0ZVJlcXVlc3RNYW5hZ2VyID0gZnVuY3Rpb24odGltZU91dCl7XG4gICAgICAgICQkLnJlbW90ZS5yZXF1ZXN0TWFuYWdlciA9IG5ldyBSZXF1ZXN0TWFuYWdlcih0aW1lT3V0KTtcbiAgICB9O1xuXG5cbiAgICAkJC5yZW1vdGUuY3J5cHRvUHJvdmlkZXIgPSBudWxsO1xuICAgICQkLnJlbW90ZS5uZXdFbmRQb2ludCA9IGZ1bmN0aW9uKGFsaWFzLCByZW1vdGVFbmRQb2ludCwgYWdlbnRVaWQsIGNyeXB0b0luZm8pe1xuICAgICAgICBpZihhbGlhcyA9PT0gXCJuZXdSZW1vdGVFbmRQb2ludFwiIHx8IGFsaWFzID09PSBcInJlcXVlc3RNYW5hZ2VyXCIgfHwgYWxpYXMgPT09IFwiY3J5cHRvUHJvdmlkZXJcIil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlBza0h0dHBDbGllbnQgVW5zYWZlIGFsaWFzIG5hbWU6XCIsIGFsaWFzKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkJC5yZW1vdGVbYWxpYXNdID0gbmV3IFBza0h0dHBDbGllbnQocmVtb3RlRW5kUG9pbnQsIGFnZW50VWlkLCBjcnlwdG9JbmZvKTtcbiAgICB9O1xuXG5cbiAgICAkJC5yZW1vdGUuZG9IdHRwUG9zdCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGNhbGxiYWNrKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3ZlcndyaXRlIHRoaXMhXCIpO1xuICAgIH07XG5cbiAgICAkJC5yZW1vdGUuZG9IdHRwR2V0ID0gZnVuY3Rpb24gZG9IdHRwR2V0KHVybCwgY2FsbGJhY2spe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgdGhpcyFcIik7XG4gICAgfTtcblxuICAgICQkLnJlbW90ZS5iYXNlNjRFbmNvZGUgPSBmdW5jdGlvbiBiYXNlNjRFbmNvZGUoc3RyaW5nVG9FbmNvZGUpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPdmVyd3JpdGUgdGhpcyFcIik7XG4gICAgfTtcblxuICAgICQkLnJlbW90ZS5iYXNlNjREZWNvZGUgPSBmdW5jdGlvbiBiYXNlNjREZWNvZGUoZW5jb2RlZFN0cmluZyl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk92ZXJ3cml0ZSB0aGlzIVwiKTtcbiAgICB9O1xufVxuXG5cblxuLyogIGludGVyZmFjZVxuZnVuY3Rpb24gQ3J5cHRvUHJvdmlkZXIoKXtcblxuICAgIHRoaXMuZ2VuZXJhdGVTYWZlVWlkID0gZnVuY3Rpb24oKXtcblxuICAgIH1cblxuICAgIHRoaXMuc2lnblN3YXJtID0gZnVuY3Rpb24oc3dhcm0sIGFnZW50KXtcblxuICAgIH1cbn0gKi9cbiIsIiQkLnJlbW90ZS5kb0h0dHBQb3N0ID0gZnVuY3Rpb24gKHVybCwgZGF0YSwgY2FsbGJhY2spIHtcbiAgICBjb25zdCB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCAmJiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB4aHIucmVzcG9uc2U7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCBkYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmKHhoci5zdGF0dXM+PTQwMCl7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiQW4gZXJyb3Igb2NjdXJlZC4gU3RhdHVzQ29kZTogXCIgKyB4aHIuc3RhdHVzKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBTdGF0dXMgY29kZSAke3hoci5zdGF0dXN9IHJlY2VpdmVkLCByZXNwb25zZSBpcyBpZ25vcmVkLmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHhoci5vcGVuKFwiUE9TVFwiLCB1cmwsIHRydWUpO1xuICAgIC8veGhyLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLThcIik7XG5cbiAgICBpZihkYXRhICYmIGRhdGEucGlwZSAmJiB0eXBlb2YgZGF0YS5waXBlID09PSBcImZ1bmN0aW9uXCIpe1xuICAgICAgICBjb25zdCBidWZmZXJzID0gW107XG4gICAgICAgIGRhdGEub24oXCJkYXRhXCIsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGJ1ZmZlcnMucHVzaChkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGRhdGEub24oXCJlbmRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBhY3R1YWxDb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoYnVmZmVycyk7XG4gICAgICAgICAgICB4aHIuc2VuZChhY3R1YWxDb250ZW50cyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYoQXJyYXlCdWZmZXIuaXNWaWV3KGRhdGEpKSB7XG4gICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScpO1xuICAgICAgICB9XG5cbiAgICAgICAgeGhyLnNlbmQoZGF0YSk7XG4gICAgfVxufTtcblxuXG4kJC5yZW1vdGUuZG9IdHRwR2V0ID0gZnVuY3Rpb24gZG9IdHRwR2V0KHVybCwgY2FsbGJhY2spIHtcblxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgaGVhZGVycyB3ZXJlIHJlY2VpdmVkIGFuZCBpZiBhbnkgYWN0aW9uIHNob3VsZCBiZSBwZXJmb3JtZWQgYmVmb3JlIHJlY2VpdmluZyBkYXRhXG4gICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gMikge1xuICAgICAgICAgICAgdmFyIGNvbnRlbnRUeXBlID0geGhyLmdldFJlc3BvbnNlSGVhZGVyKFwiQ29udGVudC1UeXBlXCIpO1xuICAgICAgICAgICAgaWYgKGNvbnRlbnRUeXBlID09PSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiKSB7XG4gICAgICAgICAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PSA0ICYmIHhoci5zdGF0dXMgPT0gXCIyMDBcIikge1xuICAgICAgICAgICAgdmFyIGNvbnRlbnRUeXBlID0geGhyLmdldFJlc3BvbnNlSGVhZGVyKFwiQ29udGVudC1UeXBlXCIpO1xuXG4gICAgICAgICAgICBpZihjb250ZW50VHlwZT09PVwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCIpe1xuICAgICAgICAgICAgICAgIGxldCByZXNwb25zZUJ1ZmZlciA9IEJ1ZmZlci5mcm9tKHRoaXMucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlQnVmZmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiQW4gZXJyb3Igb2NjdXJlZC4gU3RhdHVzQ29kZTogXCIgKyB4aHIuc3RhdHVzKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgeGhyLm9wZW4oXCJHRVRcIiwgdXJsKTtcbiAgICB4aHIuc2VuZCgpO1xufTtcblxuXG5mdW5jdGlvbiBDcnlwdG9Qcm92aWRlcigpe1xuXG4gICAgdGhpcy5nZW5lcmF0ZVNhZmVVaWQgPSBmdW5jdGlvbigpe1xuICAgICAgICBsZXQgdWlkID0gXCJcIjtcbiAgICAgICAgdmFyIGFycmF5ID0gbmV3IFVpbnQzMkFycmF5KDEwKTtcbiAgICAgICAgd2luZG93LmNyeXB0by5nZXRSYW5kb21WYWx1ZXMoYXJyYXkpO1xuXG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdWlkICs9IGFycmF5W2ldLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB1aWQ7XG4gICAgfVxuXG4gICAgdGhpcy5zaWduU3dhcm0gPSBmdW5jdGlvbihzd2FybSwgYWdlbnQpe1xuICAgICAgICBzd2FybS5tZXRhLnNpZ25hdHVyZSA9IGFnZW50O1xuICAgIH1cbn1cblxuXG5cbiQkLnJlbW90ZS5jcnlwdG9Qcm92aWRlciA9IG5ldyBDcnlwdG9Qcm92aWRlcigpO1xuXG4kJC5yZW1vdGUuYmFzZTY0RW5jb2RlID0gZnVuY3Rpb24gYmFzZTY0RW5jb2RlKHN0cmluZ1RvRW5jb2RlKXtcbiAgICByZXR1cm4gd2luZG93LmJ0b2Eoc3RyaW5nVG9FbmNvZGUpO1xufTtcblxuJCQucmVtb3RlLmJhc2U2NERlY29kZSA9IGZ1bmN0aW9uIGJhc2U2NERlY29kZShlbmNvZGVkU3RyaW5nKXtcbiAgICByZXR1cm4gd2luZG93LmF0b2IoZW5jb2RlZFN0cmluZyk7XG59O1xuIiwicmVxdWlyZShcIi4vcHNrLWFic3RyYWN0LWNsaWVudFwiKTtcblxuY29uc3QgaHR0cCA9IHJlcXVpcmUoXCJodHRwXCIpO1xuY29uc3QgaHR0cHMgPSByZXF1aXJlKFwiaHR0cHNcIik7XG5jb25zdCBVUkwgPSByZXF1aXJlKFwidXJsXCIpO1xuY29uc3QgdXNlckFnZW50ID0gJ1BTSyBOb2RlQWdlbnQvMC4wLjEnO1xuXG5jb25zb2xlLmxvZyhcIlBTSyBub2RlIGNsaWVudCBsb2FkaW5nXCIpO1xuXG5mdW5jdGlvbiBnZXROZXR3b3JrRm9yT3B0aW9ucyhvcHRpb25zKSB7XG5cdGlmKG9wdGlvbnMucHJvdG9jb2wgPT09ICdodHRwOicpIHtcblx0XHRyZXR1cm4gaHR0cDtcblx0fSBlbHNlIGlmKG9wdGlvbnMucHJvdG9jb2wgPT09ICdodHRwczonKSB7XG5cdFx0cmV0dXJuIGh0dHBzO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgQ2FuJ3QgaGFuZGxlIHByb3RvY29sICR7b3B0aW9ucy5wcm90b2NvbH1gKTtcblx0fVxuXG59XG5cbiQkLnJlbW90ZS5kb0h0dHBQb3N0ID0gZnVuY3Rpb24gKHVybCwgZGF0YSwgY2FsbGJhY2spe1xuXHRjb25zdCBpbm5lclVybCA9IFVSTC5wYXJzZSh1cmwpO1xuXG5cdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0aG9zdG5hbWU6IGlubmVyVXJsLmhvc3RuYW1lLFxuXHRcdHBhdGg6IGlubmVyVXJsLnBhdGhuYW1lLFxuXHRcdHBvcnQ6IHBhcnNlSW50KGlubmVyVXJsLnBvcnQpLFxuXHRcdGhlYWRlcnM6IHtcblx0XHRcdCdVc2VyLUFnZW50JzogdXNlckFnZW50XG5cdFx0fSxcblx0XHRtZXRob2Q6ICdQT1NUJ1xuXHR9O1xuXG5cdGNvbnN0IG5ldHdvcmsgPSBnZXROZXR3b3JrRm9yT3B0aW9ucyhpbm5lclVybCk7XG5cblx0aWYoQXJyYXlCdWZmZXIuaXNWaWV3KGRhdGEpIHx8IEJ1ZmZlci5pc0J1ZmZlcihkYXRhKSkge1xuXHRcdGlmKCFCdWZmZXIuaXNCdWZmZXIoZGF0YSkpIHtcblx0XHRcdGRhdGEgPSBCdWZmZXIuZnJvbShkYXRhKTtcblx0XHR9XG5cblx0XHRvcHRpb25zLmhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSc7XG5cdFx0b3B0aW9ucy5oZWFkZXJzWydDb250ZW50LUxlbmd0aCddID0gZGF0YS5sZW5ndGg7XG5cdH1cblxuXHRjb25zdCByZXEgPSBuZXR3b3JrLnJlcXVlc3Qob3B0aW9ucywgKHJlcykgPT4ge1xuXHRcdGNvbnN0IHsgc3RhdHVzQ29kZSB9ID0gcmVzO1xuXG5cdFx0bGV0IGVycm9yO1xuXHRcdGlmIChzdGF0dXNDb2RlID49IDQwMCkge1xuXHRcdFx0ZXJyb3IgPSBuZXcgRXJyb3IoJ1JlcXVlc3QgRmFpbGVkLlxcbicgK1xuXHRcdFx0XHRgU3RhdHVzIENvZGU6ICR7c3RhdHVzQ29kZX1gKTtcblx0XHR9XG5cblx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdGNhbGxiYWNrKGVycm9yKTtcblx0XHRcdC8vIGZyZWUgdXAgbWVtb3J5XG5cdFx0XHRyZXMucmVzdW1lKCk7XG5cdFx0XHRyZXR1cm4gO1xuXHRcdH1cblxuXHRcdGxldCByYXdEYXRhID0gJyc7XG5cdFx0cmVzLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7IHJhd0RhdGEgKz0gY2h1bms7IH0pO1xuXHRcdHJlcy5vbignZW5kJywgKCkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIHJhd0RhdGEpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KS5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlBPU1QgRXJyb3JcIiwgZXJyb3IpO1xuXHRcdGNhbGxiYWNrKGVycm9yKTtcblx0fSk7XG5cbiAgICBpZihkYXRhICYmIGRhdGEucGlwZSAmJiB0eXBlb2YgZGF0YS5waXBlID09PSBcImZ1bmN0aW9uXCIpe1xuICAgICAgICBkYXRhLnBpcGUocmVxKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmKHR5cGVvZiBkYXRhICE9PSAnc3RyaW5nJyAmJiAhQnVmZmVyLmlzQnVmZmVyKGRhdGEpICYmICFBcnJheUJ1ZmZlci5pc1ZpZXcoZGF0YSkpIHtcblx0XHRkYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG5cdH1cblxuXHRyZXEud3JpdGUoZGF0YSk7XG5cdHJlcS5lbmQoKTtcbn07XG5cbiQkLnJlbW90ZS5kb0h0dHBHZXQgPSBmdW5jdGlvbiBkb0h0dHBHZXQodXJsLCBjYWxsYmFjayl7XG4gICAgY29uc3QgaW5uZXJVcmwgPSBVUkwucGFyc2UodXJsKTtcblxuXHRjb25zdCBvcHRpb25zID0ge1xuXHRcdGhvc3RuYW1lOiBpbm5lclVybC5ob3N0bmFtZSxcblx0XHRwYXRoOiBpbm5lclVybC5wYXRobmFtZSArIChpbm5lclVybC5zZWFyY2ggfHwgJycpLFxuXHRcdHBvcnQ6IHBhcnNlSW50KGlubmVyVXJsLnBvcnQpLFxuXHRcdGhlYWRlcnM6IHtcblx0XHRcdCdVc2VyLUFnZW50JzogdXNlckFnZW50XG5cdFx0fSxcblx0XHRtZXRob2Q6ICdHRVQnXG5cdH07XG5cblx0Y29uc3QgbmV0d29yayA9IGdldE5ldHdvcmtGb3JPcHRpb25zKGlubmVyVXJsKTtcblxuXHRjb25zdCByZXEgPSBuZXR3b3JrLnJlcXVlc3Qob3B0aW9ucywgKHJlcykgPT4ge1xuXHRcdGNvbnN0IHsgc3RhdHVzQ29kZSB9ID0gcmVzO1xuXG5cdFx0bGV0IGVycm9yO1xuXHRcdGlmIChzdGF0dXNDb2RlICE9PSAyMDApIHtcblx0XHRcdGVycm9yID0gbmV3IEVycm9yKCdSZXF1ZXN0IEZhaWxlZC5cXG4nICtcblx0XHRcdFx0YFN0YXR1cyBDb2RlOiAke3N0YXR1c0NvZGV9YCk7XG5cdFx0XHRlcnJvci5jb2RlID0gc3RhdHVzQ29kZTtcblx0XHR9XG5cblx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdGNhbGxiYWNrKGVycm9yKTtcblx0XHRcdC8vIGZyZWUgdXAgbWVtb3J5XG5cdFx0XHRyZXMucmVzdW1lKCk7XG5cdFx0XHRyZXR1cm4gO1xuXHRcdH1cblxuXHRcdGxldCByYXdEYXRhO1xuXHRcdGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzLmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddO1xuXG5cdFx0aWYoY29udGVudFR5cGUgPT09IFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCIpe1xuXHRcdFx0cmF3RGF0YSA9IFtdO1xuXHRcdH1lbHNle1xuXHRcdFx0cmF3RGF0YSA9ICcnO1xuXHRcdH1cblxuXHRcdHJlcy5vbignZGF0YScsIChjaHVuaykgPT4ge1xuXHRcdFx0aWYoQXJyYXkuaXNBcnJheShyYXdEYXRhKSl7XG5cdFx0XHRcdHJhd0RhdGEucHVzaCguLi5jaHVuayk7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0cmF3RGF0YSArPSBjaHVuaztcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXMub24oJ2VuZCcsICgpID0+IHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmKEFycmF5LmlzQXJyYXkocmF3RGF0YSkpe1xuXHRcdFx0XHRcdHJhd0RhdGEgPSBCdWZmZXIuZnJvbShyYXdEYXRhKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgcmF3RGF0YSk7XG5cdFx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJDbGllbnQgZXJyb3I6XCIsIGVycik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xuXG5cdHJlcS5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuXHRcdGlmKGVycm9yICYmIGVycm9yLmNvZGUgIT09ICdFQ09OTlJFU0VUJyl7XG4gICAgICAgIFx0Y29uc29sZS5sb2coXCJHRVQgRXJyb3JcIiwgZXJyb3IpO1xuXHRcdH1cblxuXHRcdGNhbGxiYWNrKGVycm9yKTtcblx0fSk7XG5cblx0cmVxLmVuZCgpO1xufTtcblxuJCQucmVtb3RlLmJhc2U2NEVuY29kZSA9IGZ1bmN0aW9uIGJhc2U2NEVuY29kZShzdHJpbmdUb0VuY29kZSl7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKHN0cmluZ1RvRW5jb2RlKS50b1N0cmluZygnYmFzZTY0Jyk7XG59O1xuXG4kJC5yZW1vdGUuYmFzZTY0RGVjb2RlID0gZnVuY3Rpb24gYmFzZTY0RGVjb2RlKGVuY29kZWRTdHJpbmcpe1xuICAgIHJldHVybiBCdWZmZXIuZnJvbShlbmNvZGVkU3RyaW5nLCAnYmFzZTY0JykudG9TdHJpbmcoJ2FzY2lpJyk7XG59O1xuIiwiY29uc3QgY29uc1V0aWwgPSByZXF1aXJlKCdzaWduc2Vuc3VzJykuY29uc1V0aWw7XG5jb25zdCBiZWVzSGVhbGVyID0gcmVxdWlyZShcInN3YXJtdXRpbHNcIikuYmVlc0hlYWxlcjtcblxuZnVuY3Rpb24gQmxvY2tjaGFpbihwZHMpIHtcbiAgICBsZXQgc3dhcm0gPSBudWxsO1xuXG4gICAgdGhpcy5iZWdpblRyYW5zYWN0aW9uID0gZnVuY3Rpb24gKHRyYW5zYWN0aW9uU3dhcm0pIHtcbiAgICAgICAgaWYgKCF0cmFuc2FjdGlvblN3YXJtKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3Npbmcgc3dhcm0nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3YXJtID0gdHJhbnNhY3Rpb25Td2FybTtcbiAgICAgICAgcmV0dXJuIG5ldyBUcmFuc2FjdGlvbihwZHMuZ2V0SGFuZGxlcigpKTtcbiAgICB9O1xuXG4gICAgdGhpcy5jb21taXQgPSBmdW5jdGlvbiAodHJhbnNhY3Rpb24pIHtcblxuICAgICAgICBjb25zdCBkaWZmID0gcGRzLmNvbXB1dGVTd2FybVRyYW5zYWN0aW9uRGlmZihzd2FybSwgdHJhbnNhY3Rpb24uZ2V0SGFuZGxlcigpKTtcbiAgICAgICAgY29uc3QgdCA9IGNvbnNVdGlsLmNyZWF0ZVRyYW5zYWN0aW9uKDAsIGRpZmYpO1xuICAgICAgICBjb25zdCBzZXQgPSB7fTtcbiAgICAgICAgc2V0W3QuZGlnZXN0XSA9IHQ7XG4gICAgICAgIHBkcy5jb21taXQoc2V0LCAxKTtcbiAgICB9O1xufVxuXG5cbmZ1bmN0aW9uIFRyYW5zYWN0aW9uKHBkc0hhbmRsZXIpIHtcbiAgICBjb25zdCBBTElBU0VTID0gJy9hbGlhc2VzJztcblxuXG4gICAgdGhpcy5hZGQgPSBmdW5jdGlvbiAoYXNzZXQpIHtcbiAgICAgICAgY29uc3Qgc3dhcm1UeXBlTmFtZSA9IGFzc2V0LmdldE1ldGFkYXRhKCdzd2FybVR5cGVOYW1lJyk7XG4gICAgICAgIGNvbnN0IHN3YXJtSWQgPSBhc3NldC5nZXRNZXRhZGF0YSgnc3dhcm1JZCcpO1xuXG4gICAgICAgIGNvbnN0IGFsaWFzSW5kZXggPSBuZXcgQWxpYXNJbmRleChzd2FybVR5cGVOYW1lKTtcbiAgICAgICAgaWYgKGFzc2V0LmFsaWFzICYmIGFsaWFzSW5kZXguZ2V0VWlkKGFzc2V0LmFsaWFzKSAhPT0gc3dhcm1JZCkge1xuICAgICAgICAgICAgYWxpYXNJbmRleC5jcmVhdGUoYXNzZXQuYWxpYXMsIHN3YXJtSWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXNzZXQuc2V0TWV0YWRhdGEoJ3BlcnNpc3RlZCcsIHRydWUpO1xuICAgICAgICBjb25zdCBzZXJpYWxpemVkU3dhcm0gPSBiZWVzSGVhbGVyLmFzSlNPTihhc3NldCwgbnVsbCwgbnVsbCk7XG5cbiAgICAgICAgcGRzSGFuZGxlci53cml0ZUtleShzd2FybVR5cGVOYW1lICsgJy8nICsgc3dhcm1JZCwgSihzZXJpYWxpemVkU3dhcm0pKTtcbiAgICB9O1xuXG4gICAgdGhpcy5sb29rdXAgPSBmdW5jdGlvbiAoYXNzZXRUeXBlLCBhaWQpIHsgLy8gYWxpYXMgc2F1IGlkXG4gICAgICAgIGxldCBsb2NhbFVpZCA9IGFpZDtcblxuICAgICAgICBpZiAoaGFzQWxpYXNlcyhhc3NldFR5cGUpKSB7XG4gICAgICAgICAgICBjb25zdCBhbGlhc0luZGV4ID0gbmV3IEFsaWFzSW5kZXgoYXNzZXRUeXBlKTtcbiAgICAgICAgICAgIGxvY2FsVWlkID0gYWxpYXNJbmRleC5nZXRVaWQoYWlkKSB8fCBhaWQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB2YWx1ZSA9IHBkc0hhbmRsZXIucmVhZEtleShhc3NldFR5cGUgKyAnLycgKyBsb2NhbFVpZCk7XG5cbiAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuICQkLmFzc2V0LnN0YXJ0KGFzc2V0VHlwZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBzd2FybSA9ICQkLmFzc2V0LmNvbnRpbnVlKGFzc2V0VHlwZSwgSlNPTi5wYXJzZSh2YWx1ZSkpO1xuICAgICAgICAgICAgc3dhcm0uc2V0TWV0YWRhdGEoXCJwZXJzaXN0ZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICByZXR1cm4gc3dhcm07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5sb2FkQXNzZXRzID0gZnVuY3Rpb24gKGFzc2V0VHlwZSkge1xuICAgICAgICBjb25zdCBhc3NldHMgPSBbXTtcblxuICAgICAgICBjb25zdCBhbGlhc0luZGV4ID0gbmV3IEFsaWFzSW5kZXgoYXNzZXRUeXBlKTtcbiAgICAgICAgT2JqZWN0LmtleXMoYWxpYXNJbmRleC5nZXRBbGlhc2VzKCkpLmZvckVhY2goKGFsaWFzKSA9PiB7XG4gICAgICAgICAgICBhc3NldHMucHVzaCh0aGlzLmxvb2t1cChhc3NldFR5cGUsIGFsaWFzKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBhc3NldHM7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHBkc0hhbmRsZXI7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGhhc0FsaWFzZXMoc3BhY2VOYW1lKSB7XG4gICAgICAgIHJldHVybiAhIXBkc0hhbmRsZXIucmVhZEtleShzcGFjZU5hbWUgKyBBTElBU0VTKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBBbGlhc0luZGV4KGFzc2V0VHlwZSkge1xuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIChhbGlhcywgdWlkKSB7XG4gICAgICAgICAgICBjb25zdCBhc3NldEFsaWFzZXMgPSB0aGlzLmdldEFsaWFzZXMoKTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBhc3NldEFsaWFzZXNbYWxpYXNdICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgJCQuZXJyb3JIYW5kbGVyLnRocm93RXJyb3IobmV3IEVycm9yKGBBbGlhcyAke2FsaWFzfSBmb3IgYXNzZXRzIG9mIHR5cGUgJHthc3NldFR5cGV9IGFscmVhZHkgZXhpc3RzYCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhc3NldEFsaWFzZXNbYWxpYXNdID0gdWlkO1xuXG4gICAgICAgICAgICBwZHNIYW5kbGVyLndyaXRlS2V5KGFzc2V0VHlwZSArIEFMSUFTRVMsIEooYXNzZXRBbGlhc2VzKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRVaWQgPSBmdW5jdGlvbiAoYWxpYXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0QWxpYXNlcyA9IHRoaXMuZ2V0QWxpYXNlcygpO1xuICAgICAgICAgICAgcmV0dXJuIGFzc2V0QWxpYXNlc1thbGlhc107XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRBbGlhc2VzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbGV0IGFsaWFzZXMgPSBwZHNIYW5kbGVyLnJlYWRLZXkoYXNzZXRUeXBlICsgQUxJQVNFUyk7XG4gICAgICAgICAgICByZXR1cm4gYWxpYXNlcyA/IEpTT04ucGFyc2UoYWxpYXNlcykgOiB7fTtcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmxvY2tjaGFpbjsiLCJ2YXIgbWVtb3J5UERTID0gcmVxdWlyZShcIi4vSW5NZW1vcnlQRFNcIik7XG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuXG5cbmZ1bmN0aW9uIEZvbGRlclBlcnNpc3RlbnRQRFMoZm9sZGVyKSB7XG4gICAgdGhpcy5tZW1DYWNoZSA9IG1lbW9yeVBEUy5uZXdQRFModGhpcyk7XG5cbiAgICBmdW5jdGlvbiBta1NpbmdsZUxpbmUoc3RyKSB7XG4gICAgICAgIHJldHVybiBzdHIucmVwbGFjZSgvW1xcblxccl0vZywgXCJcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZUN1cnJlbnRWYWx1ZUZpbGVuYW1lKCkge1xuICAgICAgICByZXR1cm4gcGF0aC5ub3JtYWxpemUoZm9sZGVyICsgJy9jdXJyZW50VmVyc2lvbicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEN1cnJlbnRWYWx1ZShwYXRoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZighZnMuZXhpc3RzU3luYyhwYXRoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGF0aCkudG9TdHJpbmcoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlcnJvciAnLCBlKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5wZXJzaXN0ID0gZnVuY3Rpb24gKHRyYW5zYWN0aW9uTG9nLCBjdXJyZW50VmFsdWVzLCBjdXJyZW50UHVsc2UpIHtcblxuICAgICAgICB0cmFuc2FjdGlvbkxvZy5jdXJyZW50UHVsc2UgPSBjdXJyZW50UHVsc2U7XG4gICAgICAgIHRyYW5zYWN0aW9uTG9nID0gbWtTaW5nbGVMaW5lKEpTT04uc3RyaW5naWZ5KHRyYW5zYWN0aW9uTG9nKSkgKyBcIlxcblwiO1xuXG4gICAgICAgIGZzLm1rZGlyKGZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sIGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgICAgICAgICAgaWYgKGVyciAmJiBlcnIuY29kZSAhPT0gXCJFRVhJU1RcIikge1xuICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnMuYXBwZW5kRmlsZVN5bmMoZm9sZGVyICsgJy90cmFuc2FjdGlvbnNMb2cnLCB0cmFuc2FjdGlvbkxvZywgJ3V0ZjgnKTtcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMobWFrZUN1cnJlbnRWYWx1ZUZpbGVuYW1lKCksIEpTT04uc3RyaW5naWZ5KGN1cnJlbnRWYWx1ZXMsIG51bGwsIDEpKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGNvbnN0IGlubmVyVmFsdWVzID0gZ2V0Q3VycmVudFZhbHVlKG1ha2VDdXJyZW50VmFsdWVGaWxlbmFtZSgpKTtcbiAgICB0aGlzLm1lbUNhY2hlLmluaXRpYWxpc2UoaW5uZXJWYWx1ZXMpO1xufVxuXG5leHBvcnRzLm5ld1BEUyA9IGZ1bmN0aW9uIChmb2xkZXIpIHtcbiAgICBjb25zdCBwZHMgPSBuZXcgRm9sZGVyUGVyc2lzdGVudFBEUyhmb2xkZXIpO1xuICAgIHJldHVybiBwZHMubWVtQ2FjaGU7XG59O1xuIiwiXG52YXIgY3V0aWwgICA9IHJlcXVpcmUoXCIuLi8uLi9zaWduc2Vuc3VzL2xpYi9jb25zVXRpbFwiKTtcbnZhciBzc3V0aWwgID0gcmVxdWlyZShcInBza2NyeXB0b1wiKTtcblxuXG5mdW5jdGlvbiBTdG9yYWdlKHBhcmVudFN0b3JhZ2Upe1xuICAgIHZhciBjc2V0ICAgICAgICAgICAgPSB7fTsgIC8vIGNvbnRhaW5lcyBhbGwga2V5cyBpbiBwYXJlbnQgc3RvcmFnZSwgY29udGFpbnMgb25seSBrZXlzIHRvdWNoZWQgaW4gaGFuZGxlcnNcbiAgICB2YXIgd3JpdGVTZXQgICAgICAgID0gIXBhcmVudFN0b3JhZ2UgPyBjc2V0IDoge307ICAgLy9jb250YWlucyBvbmx5IGtleXMgbW9kaWZpZWQgaW4gaGFuZGxlcnNcblxuICAgIHZhciByZWFkU2V0VmVyc2lvbnMgID0ge307IC8vbWVhbmluZ2Z1bCBvbmx5IGluIGhhbmRsZXJzXG4gICAgdmFyIHdyaXRlU2V0VmVyc2lvbnMgPSB7fTsgLy93aWxsIHN0b3JlIGFsbCB2ZXJzaW9ucyBnZW5lcmF0ZWQgYnkgd3JpdGVLZXlcblxuICAgIHZhciB2c2QgICAgICAgICAgICAgPSBcImVtcHR5XCI7IC8vb25seSBmb3IgcGFyZW50IHN0b3JhZ2VcbiAgICB2YXIgcHJldmlvdXNWU0QgICAgID0gbnVsbDtcblxuICAgIHZhciBteUN1cnJlbnRQdWxzZSAgICA9IDA7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cbiAgICBmdW5jdGlvbiBoYXNMb2NhbEtleShuYW1lKXtcbiAgICAgICAgcmV0dXJuIGNzZXQuaGFzT3duUHJvcGVydHkobmFtZSk7XG4gICAgfVxuXG4gICAgdGhpcy5oYXNLZXkgPSBmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgcmV0dXJuIHBhcmVudFN0b3JhZ2UgPyBwYXJlbnRTdG9yYWdlLmhhc0tleShuYW1lKSA6IGhhc0xvY2FsS2V5KG5hbWUpO1xuICAgIH07XG5cbiAgICB0aGlzLnJlYWRLZXkgPSBmdW5jdGlvbiByZWFkS2V5KG5hbWUpe1xuICAgICAgICB2YXIgdmFsdWU7XG4gICAgICAgIGlmKGhhc0xvY2FsS2V5KG5hbWUpKXtcbiAgICAgICAgICAgIHZhbHVlID0gY3NldFtuYW1lXTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBpZih0aGlzLmhhc0tleShuYW1lKSl7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBwYXJlbnRTdG9yYWdlLnJlYWRLZXkobmFtZSk7XG4gICAgICAgICAgICAgICAgY3NldFtuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHJlYWRTZXRWZXJzaW9uc1tuYW1lXSA9IHBhcmVudFN0b3JhZ2UuZ2V0VmVyc2lvbihuYW1lKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGNzZXRbbmFtZV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmVhZFNldFZlcnNpb25zW25hbWVdID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdyaXRlU2V0VmVyc2lvbnNbbmFtZV0gPSByZWFkU2V0VmVyc2lvbnNbbmFtZV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFZlcnNpb24gPSBmdW5jdGlvbihuYW1lLCByZWFsVmVyc2lvbil7XG4gICAgICAgIHZhciB2ZXJzaW9uID0gMDtcbiAgICAgICAgaWYoaGFzTG9jYWxLZXkobmFtZSkpe1xuICAgICAgICAgICAgdmVyc2lvbiA9IHJlYWRTZXRWZXJzaW9uc1tuYW1lXTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBpZih0aGlzLmhhc0tleShuYW1lKSl7XG4gICAgICAgICAgICAgICAgY3NldFtuYW1lXSA9IHBhcmVudFN0b3JhZ2UucmVhZEtleSgpO1xuICAgICAgICAgICAgICAgIHZlcnNpb24gPSByZWFkU2V0VmVyc2lvbnNbbmFtZV0gPSBwYXJlbnRTdG9yYWdlLmdldFZlcnNpb24obmFtZSk7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBjc2V0W25hbWVdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJlYWRTZXRWZXJzaW9uc1tuYW1lXSA9IHZlcnNpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZlcnNpb247XG4gICAgfTtcblxuICAgIHRoaXMud3JpdGVLZXkgPSBmdW5jdGlvbiBtb2RpZnlLZXkobmFtZSwgdmFsdWUpe1xuICAgICAgICB2YXIgayA9IHRoaXMucmVhZEtleShuYW1lKTsgLy9UT0RPOiB1bnVzZWQgdmFyXG5cbiAgICAgICAgY3NldCBbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgd3JpdGVTZXRWZXJzaW9uc1tuYW1lXSsrO1xuICAgICAgICB3cml0ZVNldFtuYW1lXSA9IHZhbHVlO1xuICAgIH07XG5cbiAgICB0aGlzLmdldElucHV0T3V0cHV0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaW5wdXQ6IHJlYWRTZXRWZXJzaW9ucyxcbiAgICAgICAgICAgIG91dHB1dDogd3JpdGVTZXRcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRJbnRlcm5hbFZhbHVlcyA9IGZ1bmN0aW9uKGN1cnJlbnRQdWxzZSwgdXBkYXRlUHJldmlvdXNWU0Qpe1xuICAgICAgICBpZih1cGRhdGVQcmV2aW91c1ZTRCl7XG4gICAgICAgICAgICBteUN1cnJlbnRQdWxzZSA9IGN1cnJlbnRQdWxzZTtcbiAgICAgICAgICAgIHByZXZpb3VzVlNEID0gdnNkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjc2V0OmNzZXQsXG4gICAgICAgICAgICB3cml0ZVNldFZlcnNpb25zOndyaXRlU2V0VmVyc2lvbnMsXG4gICAgICAgICAgICBwcmV2aW91c1ZTRDpwcmV2aW91c1ZTRCxcbiAgICAgICAgICAgIHZzZDp2c2QsXG4gICAgICAgICAgICBjdXJyZW50UHVsc2U6Y3VycmVudFB1bHNlXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIHRoaXMuaW5pdGlhbGlzZUludGVybmFsVmFsdWUgPSBmdW5jdGlvbihzdG9yZWRWYWx1ZXMpe1xuICAgICAgICBpZighc3RvcmVkVmFsdWVzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjc2V0ID0gc3RvcmVkVmFsdWVzLmNzZXQ7XG4gICAgICAgIHdyaXRlU2V0VmVyc2lvbnMgPSBzdG9yZWRWYWx1ZXMud3JpdGVTZXRWZXJzaW9ucztcbiAgICAgICAgdnNkID0gc3RvcmVkVmFsdWVzLnZzZDtcbiAgICAgICAgd3JpdGVTZXQgPSBjc2V0O1xuICAgICAgICBteUN1cnJlbnRQdWxzZSA9IHN0b3JlZFZhbHVlcy5jdXJyZW50UHVsc2U7XG4gICAgICAgIHByZXZpb3VzVlNEID0gc3RvcmVkVmFsdWVzLnByZXZpb3VzVlNEO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBhcHBseVRyYW5zYWN0aW9uKHQpe1xuICAgICAgICBmb3IobGV0IGsgaW4gdC5vdXRwdXQpeyBcbiAgICAgICAgICAgIGlmKCF0LmlucHV0Lmhhc093blByb3BlcnR5KGspKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yKGxldCBsIGluIHQuaW5wdXQpe1xuICAgICAgICAgICAgdmFyIHRyYW5zYWN0aW9uVmVyc2lvbiA9IHQuaW5wdXRbbF07XG4gICAgICAgICAgICB2YXIgY3VycmVudFZlcnNpb24gPSBzZWxmLmdldFZlcnNpb24obCk7XG4gICAgICAgICAgICBpZih0cmFuc2FjdGlvblZlcnNpb24gIT09IGN1cnJlbnRWZXJzaW9uKXtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGwsIHRyYW5zYWN0aW9uVmVyc2lvbiAsIGN1cnJlbnRWZXJzaW9uKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3IobGV0IHYgaW4gdC5vdXRwdXQpe1xuICAgICAgICAgICAgc2VsZi53cml0ZUtleSh2LCB0Lm91dHB1dFt2XSk7XG4gICAgICAgIH1cblxuXHRcdHZhciBhcnIgPSBwcm9jZXNzLmhydGltZSgpO1xuXHRcdHZhciBjdXJyZW50X3NlY29uZCA9IGFyclswXTtcblx0XHR2YXIgZGlmZiA9IGN1cnJlbnRfc2Vjb25kLXQuc2Vjb25kO1xuXG5cdFx0Z2xvYmFsW1wiVHJhbnphY3Rpb25zX1RpbWVcIl0rPWRpZmY7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbXB1dGVQVEJsb2NrID0gZnVuY3Rpb24obmV4dEJsb2NrU2V0KXsgICAvL21ha2UgYSB0cmFuc2FjdGlvbnMgYmxvY2sgZnJvbSBuZXh0QmxvY2tTZXQgYnkgcmVtb3ZpbmcgaW52YWxpZCB0cmFuc2FjdGlvbnMgZnJvbSB0aGUga2V5IHZlcnNpb25zIHBvaW50IG9mIHZpZXdcbiAgICAgICAgdmFyIHZhbGlkQmxvY2sgPSBbXTtcbiAgICAgICAgdmFyIG9yZGVyZWRCeVRpbWUgPSBjdXRpbC5vcmRlclRyYW5zYWN0aW9ucyhuZXh0QmxvY2tTZXQpO1xuICAgICAgICB2YXIgaSA9IDA7XG5cbiAgICAgICAgd2hpbGUoaSA8IG9yZGVyZWRCeVRpbWUubGVuZ3RoKXtcbiAgICAgICAgICAgIHZhciB0ID0gb3JkZXJlZEJ5VGltZVtpXTtcbiAgICAgICAgICAgIGlmKGFwcGx5VHJhbnNhY3Rpb24odCkpe1xuICAgICAgICAgICAgICAgIHZhbGlkQmxvY2sucHVzaCh0LmRpZ2VzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbGlkQmxvY2s7XG4gICAgfTtcblxuICAgIHRoaXMuY29tbWl0ID0gZnVuY3Rpb24oYmxvY2tTZXQpe1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHZhciBvcmRlcmVkQnlUaW1lID0gY3V0aWwub3JkZXJUcmFuc2FjdGlvbnMoYmxvY2tTZXQpO1xuXG4gICAgICAgIHdoaWxlKGkgPCBvcmRlcmVkQnlUaW1lLmxlbmd0aCl7XG4gICAgICAgICAgICB2YXIgdCA9IG9yZGVyZWRCeVRpbWVbaV07XG4gICAgICAgICAgICBpZighYXBwbHlUcmFuc2FjdGlvbih0KSl7IC8vcGFyYW5vaWQgY2hlY2ssICBmYWlsIHRvIHdvcmsgaWYgYSBtYWpvcml0eSBpcyBjb3JydXB0ZWRcbiAgICAgICAgICAgICAgICAvL3ByZXR0eSBiYWRcbiAgICAgICAgICAgICAgICAvL3Rocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBjb21taXQgYW4gaW52YWxpZCBibG9jay4gVGhpcyBjb3VsZCBiZSBhIG5hc3R5IGJ1ZyBvciB0aGUgc3Rha2Vob2xkZXJzIG1ham9yaXR5IGlzIGNvcnJ1cHRlZCEgSXQgc2hvdWxkIG5ldmVyIGhhcHBlbiFcIik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJGYWlsZWQgdG8gY29tbWl0IGFuIGludmFsaWQgYmxvY2suIFRoaXMgY291bGQgYmUgYSBuYXN0eSBidWcgb3IgdGhlIHN0YWtlaG9sZGVycyBtYWpvcml0eSBpcyBjb3JydXB0ZWQhIEl0IHNob3VsZCBuZXZlciBoYXBwZW4hXCIpOyAvL1RPRE86IHJlcGxhY2Ugd2l0aCBiZXR0ZXIgZXJyb3IgaGFuZGxpbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmdldFZTRCh0cnVlKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRWU0QgPSBmdW5jdGlvbihmb3JjZUNhbGN1bGF0aW9uKXtcbiAgICAgICAgaWYoZm9yY2VDYWxjdWxhdGlvbil7XG4gICAgICAgICAgICB2YXIgdG1wID0gdGhpcy5nZXRJbnRlcm5hbFZhbHVlcyhteUN1cnJlbnRQdWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB2c2QgPSBzc3V0aWwuaGFzaFZhbHVlcyh0bXApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2c2Q7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gSW5NZW1vcnlQRFMocGVybWFuZW50UGVyc2lzdGVuY2Upe1xuXG4gICAgdmFyIG1haW5TdG9yYWdlID0gbmV3IFN0b3JhZ2UobnVsbCk7XG5cblxuICAgIHRoaXMuZ2V0SGFuZGxlciA9IGZ1bmN0aW9uKCl7IC8vIGEgd2F5IHRvIHdvcmsgd2l0aCBQRFNcbiAgICAgICAgdmFyIHRlbXBTdG9yYWdlID0gbmV3IFN0b3JhZ2UobWFpblN0b3JhZ2UpO1xuICAgICAgICByZXR1cm4gdGVtcFN0b3JhZ2U7XG4gICAgfTtcblxuICAgIHRoaXMuY29tcHV0ZVN3YXJtVHJhbnNhY3Rpb25EaWZmID0gZnVuY3Rpb24oc3dhcm0sIGZvcmtlZFBkcyl7XG4gICAgICAgIHZhciBpbnBPdXRwICAgICA9IGZvcmtlZFBkcy5nZXRJbnB1dE91dHB1dCgpO1xuICAgICAgICBzd2FybS5pbnB1dCAgICAgPSBpbnBPdXRwLmlucHV0O1xuICAgICAgICBzd2FybS5vdXRwdXQgICAgPSBpbnBPdXRwLm91dHB1dDtcbiAgICAgICAgcmV0dXJuIHN3YXJtO1xuICAgIH07XG5cbiAgICB0aGlzLmNvbXB1dGVQVEJsb2NrID0gZnVuY3Rpb24obmV4dEJsb2NrU2V0KXtcbiAgICAgICAgdmFyIHRlbXBTdG9yYWdlID0gbmV3IFN0b3JhZ2UobWFpblN0b3JhZ2UpO1xuICAgICAgICByZXR1cm4gdGVtcFN0b3JhZ2UuY29tcHV0ZVBUQmxvY2sobmV4dEJsb2NrU2V0KTtcblxuICAgIH07XG5cbiAgICB0aGlzLmNvbW1pdCA9IGZ1bmN0aW9uKGJsb2NrU2V0LCBjdXJyZW50UHVsc2Upe1xuICAgICAgICBtYWluU3RvcmFnZS5jb21taXQoYmxvY2tTZXQpO1xuICAgICAgICBpZihwZXJtYW5lbnRQZXJzaXN0ZW5jZSkge1xuICAgICAgICAgICAgcGVybWFuZW50UGVyc2lzdGVuY2UucGVyc2lzdChibG9ja1NldCwgbWFpblN0b3JhZ2UuZ2V0SW50ZXJuYWxWYWx1ZXMoY3VycmVudFB1bHNlLCBmYWxzZSksIGN1cnJlbnRQdWxzZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXRWU0QgPSBmdW5jdGlvbiAoKXtcbiAgICAgICAgcmV0dXJuIG1haW5TdG9yYWdlLmdldFZTRChmYWxzZSk7XG4gICAgfTtcblxuICAgIHRoaXMuaW5pdGlhbGlzZSA9IGZ1bmN0aW9uKHNhdmVkSW50ZXJuYWxWYWx1ZXMpe1xuICAgICAgICBtYWluU3RvcmFnZS5pbml0aWFsaXNlSW50ZXJuYWxWYWx1ZShzYXZlZEludGVybmFsVmFsdWVzKTtcbiAgICB9O1xuXG59XG5cblxuZXhwb3J0cy5uZXdQRFMgPSBmdW5jdGlvbihwZXJzaXN0ZW5jZSl7XG4gICAgcmV0dXJuIG5ldyBJbk1lbW9yeVBEUyhwZXJzaXN0ZW5jZSk7XG59OyIsImNvbnN0IG1lbW9yeVBEUyA9IHJlcXVpcmUoXCIuL0luTWVtb3J5UERTXCIpO1xuXG5mdW5jdGlvbiBQZXJzaXN0ZW50UERTKHtnZXRJbml0VmFsdWVzLCBwZXJzaXN0fSkge1xuXHR0aGlzLm1lbUNhY2hlID0gbWVtb3J5UERTLm5ld1BEUyh0aGlzKTtcblx0dGhpcy5wZXJzaXN0ID0gcGVyc2lzdDtcblxuXHRjb25zdCBpbm5lclZhbHVlcyA9IGdldEluaXRWYWx1ZXMoKSB8fCBudWxsO1xuXHR0aGlzLm1lbUNhY2hlLmluaXRpYWxpc2UoaW5uZXJWYWx1ZXMpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzLm5ld1BEUyA9IGZ1bmN0aW9uIChyZWFkZXJXcml0ZXIpIHtcblx0Y29uc3QgcGRzID0gbmV3IFBlcnNpc3RlbnRQRFMocmVhZGVyV3JpdGVyKTtcblx0cmV0dXJuIHBkcy5tZW1DYWNoZTtcbn07XG4iLCJcbiQkLmFzc2V0LmRlc2NyaWJlKFwiQUNMU2NvcGVcIiwge1xuICAgIHB1YmxpYzp7XG4gICAgICAgIGNvbmNlcm46XCJzdHJpbmc6a2V5XCIsXG4gICAgICAgIGRiOlwianNvblwiXG4gICAgfSxcbiAgICBpbml0OmZ1bmN0aW9uKGNvbmNlcm4pe1xuICAgICAgICB0aGlzLmNvbmNlcm4gPSBjb25jZXJuO1xuICAgIH0sXG4gICAgYWRkUmVzb3VyY2VQYXJlbnQgOiBmdW5jdGlvbihyZXNvdXJjZUlkLCBwYXJlbnRJZCl7XG4gICAgICAgIC8vVE9ETzogZW1wdHkgZnVuY3Rpb25zIVxuICAgIH0sXG4gICAgYWRkWm9uZVBhcmVudCA6IGZ1bmN0aW9uKHpvbmVJZCwgcGFyZW50SWQpe1xuICAgICAgICAvL1RPRE86IGVtcHR5IGZ1bmN0aW9ucyFcbiAgICB9LFxuICAgIGdyYW50IDpmdW5jdGlvbihhZ2VudElkLCAgcmVzb3VyY2VJZCl7XG4gICAgICAgIC8vVE9ETzogZW1wdHkgZnVuY3Rpb25zIVxuICAgIH0sXG4gICAgYWxsb3cgOmZ1bmN0aW9uKGFnZW50SWQsICByZXNvdXJjZUlkKXtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufSk7IiwiXG4kJC5hc3NldC5kZXNjcmliZShcIkFnZW50XCIsIHtcbiAgICBwdWJsaWM6e1xuICAgICAgICBhbGlhczpcInN0cmluZzprZXlcIixcbiAgICAgICAgcHVibGljS2V5Olwic3RyaW5nXCJcbiAgICB9LFxuICAgIGluaXQ6ZnVuY3Rpb24oYWxpYXMsIHZhbHVlKXtcbiAgICAgICAgdGhpcy5hbGlhcyAgICAgID0gYWxpYXM7XG4gICAgICAgIHRoaXMucHVibGljS2V5ICA9IHZhbHVlO1xuICAgIH0sXG4gICAgdXBkYXRlOmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgdGhpcy5wdWJsaWNLZXkgPSB2YWx1ZTtcbiAgICB9LFxuICAgIGFkZEFnZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IEltcGxlbWVudGVkJyk7XG4gICAgfSxcbiAgICBsaXN0QWdlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgSW1wbGVtZW50ZWQnKTtcblxuICAgIH0sXG4gICAgcmVtb3ZlQWdlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgSW1wbGVtZW50ZWQnKTtcblxuICAgIH1cbn0pOyIsIlxuJCQuYXNzZXQuZGVzY3JpYmUoXCJCYWNrdXBcIiwge1xuICAgIHB1YmxpYzp7XG4gICAgICAgIGlkOiAgXCJzdHJpbmdcIixcbiAgICAgICAgdXJsOiBcInN0cmluZ1wiXG4gICAgfSxcblxuICAgIGluaXQ6ZnVuY3Rpb24oaWQsIHVybCl7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy51cmwgPSB1cmw7XG4gICAgfVxufSk7XG4iLCJcbiQkLmFzc2V0LmRlc2NyaWJlKFwiQ1NCTWV0YVwiLCB7XG5cdHB1YmxpYzp7XG5cdFx0aXNNYXN0ZXI6XCJzdHJpbmdcIixcblx0XHRhbGlhczpcInN0cmluZzprZXlcIixcblx0XHRkZXNjcmlwdGlvbjogXCJzdHJpbmdcIixcblx0XHRjcmVhdGlvbkRhdGU6IFwic3RyaW5nXCIsXG5cdFx0dXBkYXRlZERhdGUgOiBcInN0cmluZ1wiLFxuXHRcdGlkOiBcInN0cmluZ1wiLFxuXHRcdGljb246IFwic3RyaW5nXCJcblx0fSxcblx0aW5pdDpmdW5jdGlvbihpZCl7XG5cdFx0dGhpcy5hbGlhcyA9IFwibWV0YVwiO1xuXHRcdHRoaXMuaWQgPSBpZDtcblx0fSxcblxuXHRzZXRJc01hc3RlcjogZnVuY3Rpb24gKGlzTWFzdGVyKSB7XG5cdFx0dGhpcy5pc01hc3RlciA9IGlzTWFzdGVyO1xuXHR9XG5cbn0pO1xuIiwiXG4kJC5hc3NldC5kZXNjcmliZShcIkNTQlJlZmVyZW5jZVwiLCB7XG4gICAgcHVibGljOntcbiAgICAgICAgYWxpYXM6XCJzdHJpbmc6a2V5XCIsXG4gICAgICAgIHNlZWQgOlwic3RyaW5nXCIsXG4gICAgICAgIGRzZWVkOlwic3RyaW5nXCJcbiAgICB9LFxuICAgIGluaXQ6ZnVuY3Rpb24oYWxpYXMsIHNlZWQsIGRzZWVkICl7XG4gICAgICAgIHRoaXMuYWxpYXMgPSBhbGlhcztcbiAgICAgICAgdGhpcy5zZWVkICA9IHNlZWQ7XG4gICAgICAgIHRoaXMuZHNlZWQgPSBkc2VlZDtcbiAgICB9LFxuICAgIHVwZGF0ZTpmdW5jdGlvbihmaW5nZXJwcmludCl7XG4gICAgICAgIHRoaXMuZmluZ2VycHJpbnQgPSBmaW5nZXJwcmludDtcbiAgICAgICAgdGhpcy52ZXJzaW9uKys7XG4gICAgfSxcbiAgICByZWdpc3RlckJhY2t1cFVybDpmdW5jdGlvbihiYWNrdXBVcmwpe1xuICAgICAgICB0aGlzLmJhY2t1cHMuYWRkKGJhY2t1cFVybCk7XG4gICAgfVxufSk7XG4iLCJcbiQkLmFzc2V0LmRlc2NyaWJlKFwiRG9tYWluUmVmZXJlbmNlXCIsIHtcbiAgICBwdWJsaWM6e1xuICAgICAgICByb2xlOlwic3RyaW5nOmluZGV4XCIsXG4gICAgICAgIGFsaWFzOlwic3RyaW5nOmtleVwiLFxuICAgICAgICBhZGRyZXNzZXM6XCJtYXBcIixcbiAgICAgICAgY29uc3RpdHV0aW9uOlwic3RyaW5nXCIsXG4gICAgICAgIHdvcmtzcGFjZTpcInN0cmluZ1wiLFxuICAgICAgICByZW1vdGVJbnRlcmZhY2VzOlwibWFwXCIsXG4gICAgICAgIGxvY2FsSW50ZXJmYWNlczpcIm1hcFwiXG4gICAgfSxcbiAgICBpbml0OmZ1bmN0aW9uKHJvbGUsIGFsaWFzKXtcbiAgICAgICAgdGhpcy5yb2xlID0gcm9sZTtcbiAgICAgICAgdGhpcy5hbGlhcyA9IGFsaWFzO1xuICAgICAgICB0aGlzLmFkZHJlc3NlcyA9IHt9O1xuICAgICAgICB0aGlzLnJlbW90ZUludGVyZmFjZXMgPSB7fTtcbiAgICAgICAgdGhpcy5sb2NhbEludGVyZmFjZXMgPSB7fTtcbiAgICB9LFxuICAgIHVwZGF0ZURvbWFpbkFkZHJlc3M6ZnVuY3Rpb24ocmVwbGljYXRpb25BZ2VudCwgYWRkcmVzcyl7XG4gICAgICAgIGlmKCF0aGlzLmFkZHJlc3Nlcyl7XG4gICAgICAgICAgICB0aGlzLmFkZHJlc3NlcyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWRkcmVzc2VzW3JlcGxpY2F0aW9uQWdlbnRdID0gYWRkcmVzcztcbiAgICB9LFxuICAgIHJlbW92ZURvbWFpbkFkZHJlc3M6ZnVuY3Rpb24ocmVwbGljYXRpb25BZ2VudCl7XG4gICAgICAgIHRoaXMuYWRkcmVzc2VzW3JlcGxpY2F0aW9uQWdlbnRdID0gdW5kZWZpbmVkO1xuICAgICAgICBkZWxldGUgdGhpcy5hZGRyZXNzZXNbcmVwbGljYXRpb25BZ2VudF07XG4gICAgfSxcbiAgICBhZGRSZW1vdGVJbnRlcmZhY2U6ZnVuY3Rpb24oYWxpYXMsIHJlbW90ZUVuZFBvaW50KXtcbiAgICAgICAgaWYoIXRoaXMucmVtb3RlSW50ZXJmYWNlcyl7XG4gICAgICAgICAgICB0aGlzLnJlbW90ZUludGVyZmFjZXMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbW90ZUludGVyZmFjZXNbYWxpYXNdID0gcmVtb3RlRW5kUG9pbnQ7XG4gICAgfSxcbiAgICByZW1vdmVSZW1vdGVJbnRlcmZhY2U6ZnVuY3Rpb24oYWxpYXMpe1xuICAgICAgICBpZih0aGlzLnJlbW90ZUludGVyZmFjZSl7XG4gICAgICAgICAgICB0aGlzLnJlbW90ZUludGVyZmFjZXNbYWxpYXNdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMucmVtb3RlSW50ZXJmYWNlc1thbGlhc107XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGFkZExvY2FsSW50ZXJmYWNlOmZ1bmN0aW9uKGFsaWFzLCBwYXRoKXtcbiAgICAgICAgaWYoIXRoaXMubG9jYWxJbnRlcmZhY2VzKXtcbiAgICAgICAgICAgIHRoaXMubG9jYWxJbnRlcmZhY2VzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sb2NhbEludGVyZmFjZXNbYWxpYXNdID0gcGF0aDtcbiAgICB9LFxuICAgIHJlbW92ZUxvY2FsSW50ZXJmYWNlOmZ1bmN0aW9uKGFsaWFzKXtcbiAgICAgICAgaWYodGhpcy5sb2NhbEludGVyZmFjZXMpe1xuICAgICAgICAgICAgdGhpcy5sb2NhbEludGVyZmFjZXNbYWxpYXNdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMubG9jYWxJbnRlcmZhY2VzW2FsaWFzXTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2V0Q29uc3RpdHV0aW9uOmZ1bmN0aW9uKHBhdGhPclVybE9yQ1NCKXtcbiAgICAgICAgdGhpcy5jb25zdGl0dXRpb24gPSBwYXRoT3JVcmxPckNTQjtcbiAgICB9LFxuICAgIGdldENvbnN0aXR1dGlvbjpmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdGhpcy5jb25zdGl0dXRpb247XG4gICAgfSxcbiAgICBzZXRXb3Jrc3BhY2U6ZnVuY3Rpb24ocGF0aCl7XG4gICAgICAgIHRoaXMud29ya3NwYWNlID0gcGF0aDtcbiAgICB9LFxuICAgIGdldFdvcmtzcGFjZTpmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdGhpcy53b3Jrc3BhY2U7XG4gICAgfVxufSk7IiwiJCQuYXNzZXQuZGVzY3JpYmUoXCJFbWJlZGRlZEZpbGVcIiwge1xuXHRwdWJsaWM6e1xuXHRcdGFsaWFzOlwic3RyaW5nXCJcblx0fSxcblxuXHRpbml0OmZ1bmN0aW9uKGFsaWFzKXtcblx0XHR0aGlzLmFsaWFzID0gYWxpYXM7XG5cdH1cbn0pOyIsIiQkLmFzc2V0LmRlc2NyaWJlKFwiRmlsZVJlZmVyZW5jZVwiLCB7XG5cdHB1YmxpYzp7XG5cdFx0YWxpYXM6XCJzdHJpbmdcIixcblx0XHRzZWVkIDpcInN0cmluZ1wiLFxuXHRcdGRzZWVkOlwic3RyaW5nXCJcblx0fSxcblx0aW5pdDpmdW5jdGlvbihhbGlhcywgc2VlZCwgZHNlZWQpe1xuXHRcdHRoaXMuYWxpYXMgPSBhbGlhcztcblx0XHR0aGlzLnNlZWQgID0gc2VlZDtcblx0XHR0aGlzLmRzZWVkID0gZHNlZWQ7XG5cdH1cbn0pOyIsIlxuJCQuYXNzZXQuZGVzY3JpYmUoXCJrZXlcIiwge1xuICAgIHB1YmxpYzp7XG4gICAgICAgIGFsaWFzOlwic3RyaW5nXCJcbiAgICB9LFxuICAgIGluaXQ6ZnVuY3Rpb24oYWxpYXMsIHZhbHVlKXtcbiAgICAgICAgdGhpcy5hbGlhcyA9IGFsaWFzO1xuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgfSxcbiAgICB1cGRhdGU6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgfVxufSk7IiwibW9kdWxlLmV4cG9ydHMgPSAkJC5saWJyYXJ5KGZ1bmN0aW9uKCl7XG4gICAgcmVxdWlyZShcIi4vRG9tYWluUmVmZXJlbmNlXCIpO1xuICAgIHJlcXVpcmUoXCIuL0NTQlJlZmVyZW5jZVwiKTtcbiAgICByZXF1aXJlKFwiLi9BZ2VudFwiKTtcbiAgICByZXF1aXJlKFwiLi9CYWNrdXBcIik7XG4gICAgcmVxdWlyZShcIi4vQUNMU2NvcGVcIik7XG4gICAgcmVxdWlyZShcIi4vS2V5XCIpO1xuICAgIHJlcXVpcmUoXCIuL3RyYW5zYWN0aW9uc1wiKTtcbiAgICByZXF1aXJlKFwiLi9GaWxlUmVmZXJlbmNlXCIpO1xuICAgIHJlcXVpcmUoXCIuL0VtYmVkZGVkRmlsZVwiKTtcbiAgICByZXF1aXJlKCcuL0NTQk1ldGEnKTtcbn0pOyIsIiQkLnRyYW5zYWN0aW9uLmRlc2NyaWJlKFwidHJhbnNhY3Rpb25zXCIsIHtcbiAgICB1cGRhdGVLZXk6IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgICAgIHZhciB0cmFuc2FjdGlvbiA9ICQkLmJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih0aGlzKTtcbiAgICAgICAgdmFyIGtleSA9IHRyYW5zYWN0aW9uLmxvb2t1cChcIktleVwiLCBrZXkpO1xuICAgICAgICB2YXIga2V5UGVybWlzc2lvbnMgPSB0cmFuc2FjdGlvbi5sb29rdXAoXCJBQ0xTY29wZVwiLCBcIktleXNDb25jZXJuXCIpO1xuICAgICAgICBpZiAoa2V5UGVybWlzc2lvbnMuYWxsb3codGhpcy5hZ2VudElkLCBrZXkpKSB7XG4gICAgICAgICAgICBrZXkudXBkYXRlKHZhbHVlKTtcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uLmFkZChrZXkpO1xuICAgICAgICAgICAgJCQuYmxvY2tjaGFpbi5jb21taXQodHJhbnNhY3Rpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZWN1cml0eUVycm9yKFwiQWdlbnQgXCIgKyB0aGlzLmFnZW50SWQgKyBcIiBkZW5pZWQgdG8gY2hhbmdlIGtleSBcIiArIGtleSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGFkZENoaWxkOiBmdW5jdGlvbiAoYWxpYXMpIHtcbiAgICAgICAgdmFyIHRyYW5zYWN0aW9uID0gJCQuYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKCk7XG4gICAgICAgIHZhciByZWZlcmVuY2UgPSAkJC5jb250cmFjdC5zdGFydChcIkRvbWFpblJlZmVyZW5jZVwiLCBcImluaXRcIiwgXCJjaGlsZFwiLCBhbGlhcyk7XG4gICAgICAgIHRyYW5zYWN0aW9uLmFkZChyZWZlcmVuY2UpO1xuICAgICAgICAkJC5ibG9ja2NoYWluLmNvbW1pdCh0cmFuc2FjdGlvbik7XG4gICAgfSxcbiAgICBhZGRQYXJlbnQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgcmVmZXJlbmNlID0gJCQuY29udHJhY3Quc3RhcnQoXCJEb21haW5SZWZlcmVuY2VcIiwgXCJpbml0XCIsIFwiY2hpbGRcIiwgYWxpYXMpO1xuICAgICAgICB0aGlzLnRyYW5zYWN0aW9uLnNhdmUocmVmZXJlbmNlKTtcbiAgICAgICAgJCQuYmxvY2tjaGFpbi5wZXJzaXN0KHRoaXMudHJhbnNhY3Rpb24pO1xuICAgIH0sXG4gICAgYWRkQWdlbnQ6IGZ1bmN0aW9uIChhbGlhcywgcHVibGljS2V5KSB7XG4gICAgICAgIHZhciByZWZlcmVuY2UgPSAkJC5jb250cmFjdC5zdGFydChcIkFnZW50XCIsIFwiaW5pdFwiLCBhbGlhcywgcHVibGljS2V5KTtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbi5zYXZlKHJlZmVyZW5jZSk7XG4gICAgICAgICQkLmJsb2NrY2hhaW4ucGVyc2lzdCh0aGlzLnRyYW5zYWN0aW9uKTtcbiAgICB9LFxuICAgIHVwZGF0ZUFnZW50OiBmdW5jdGlvbiAoYWxpYXMsIHB1YmxpY0tleSkge1xuICAgICAgICB2YXIgYWdlbnQgPSB0aGlzLnRyYW5zYWN0aW9uLmxvb2t1cChcIkFnZW50XCIsIGFsaWFzKTtcbiAgICAgICAgYWdlbnQudXBkYXRlKHB1YmxpY0tleSk7XG4gICAgICAgIHRoaXMudHJhbnNhY3Rpb24uc2F2ZShyZWZlcmVuY2UpO1xuICAgICAgICAkJC5ibG9ja2NoYWluLnBlcnNpc3QodGhpcy50cmFuc2FjdGlvbik7XG4gICAgfVxufSk7XG5cblxuJCQubmV3VHJhbnNhY3Rpb24gPSBmdW5jdGlvbih0cmFuc2FjdGlvbkZsb3csY3RvciwuLi5hcmdzKXtcbiAgICB2YXIgdHJhbnNhY3Rpb24gPSAkJC5zd2FybS5zdGFydCggdHJhbnNhY3Rpb25GbG93KTtcbiAgICB0cmFuc2FjdGlvbi5tZXRhKFwiYWdlbnRJZFwiLCAkJC5jdXJyZW50QWdlbnRJZCk7XG4gICAgdHJhbnNhY3Rpb24ubWV0YShcImNvbW1hbmRcIiwgXCJydW5FdmVyeVdoZXJlXCIpO1xuICAgIHRyYW5zYWN0aW9uLm1ldGEoXCJjdG9yXCIsIGN0b3IpO1xuICAgIHRyYW5zYWN0aW9uLm1ldGEoXCJhcmdzXCIsIGFyZ3MpO1xuICAgIHRyYW5zYWN0aW9uLnNpZ24oKTtcbiAgICAvLyQkLmJsb2NrY2hhaW4uc2VuZEZvckNvbnNlbnQodHJhbnNhY3Rpb24pO1xuICAgIC8vdGVtcG9yYXJ5IHVudGlsIGNvbnNlbnQgbGF5ZXIgaXMgYWN0aXZhdGVkXG4gICAgdHJhbnNhY3Rpb25bY3Rvcl0uYXBwbHkodHJhbnNhY3Rpb24sYXJncyk7XG59O1xuXG4vKlxudXNhZ2VzOlxuICAgICQkLm5ld1RyYW5zYWN0aW9uKFwiZG9tYWluLnRyYW5zYWN0aW9uc1wiLCBcInVwZGF0ZUtleVwiLCBcImtleVwiLCBcInZhbHVlXCIpXG5cbiAqL1xuIiwiLy8gY29uc3Qgc2hhcmVkUGhhc2VzID0gcmVxdWlyZSgnLi9zaGFyZWRQaGFzZXMnKTtcbi8vIGNvbnN0IGJlZXNIZWFsZXIgPSByZXF1aXJlKCdzd2FybXV0aWxzJykuYmVlc0hlYWxlcjtcblxuJCQuc3dhcm1zLmRlc2NyaWJlKFwiYWdlbnRzXCIsIHtcbiAgICBhZGQ6IGZ1bmN0aW9uIChhbGlhcywgcHVibGljS2V5KSB7XG4gICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gJCQuYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcbiAgICAgICAgY29uc3QgYWdlbnRBc3NldCA9IHRyYW5zYWN0aW9uLmxvb2t1cCgnZ2xvYmFsLkFnZW50JywgYWxpYXMpO1xuXG4gICAgICAgIGFnZW50QXNzZXQuaW5pdChhbGlhcywgcHVibGljS2V5KTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uLmFkZChhZ2VudEFzc2V0KTtcblxuICAgICAgICAgICAgJCQuYmxvY2tjaGFpbi5jb21taXQodHJhbnNhY3Rpb24pO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMucmV0dXJuKG5ldyBFcnJvcihcIkFnZW50IGFscmVhZHkgZXhpc3RzXCIpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmV0dXJuKG51bGwsIGFsaWFzKTtcbiAgICB9LFxufSk7XG4iLCJjb25zdCBzaGFyZWRQaGFzZXMgPSByZXF1aXJlKCcuL3NoYXJlZFBoYXNlcycpO1xuY29uc3QgYmVlc0hlYWxlciA9IHJlcXVpcmUoJ3N3YXJtdXRpbHMnKS5iZWVzSGVhbGVyO1xuXG4kJC5zd2FybXMuZGVzY3JpYmUoXCJkb21haW5zXCIsIHtcbiAgICBhZGQ6IGZ1bmN0aW9uIChyb2xlLCBhbGlhcykge1xuICAgICAgICBjb25zdCB0cmFuc2FjdGlvbiA9ICQkLmJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG4gICAgICAgIGNvbnN0IGRvbWFpbnNTd2FybSA9IHRyYW5zYWN0aW9uLmxvb2t1cCgnZ2xvYmFsLkRvbWFpblJlZmVyZW5jZScsIGFsaWFzKTtcblxuICAgICAgICBpZiAoIWRvbWFpbnNTd2FybSkge1xuICAgICAgICAgICAgdGhpcy5yZXR1cm4obmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBzd2FybSBuYW1lZCBcImdsb2JhbC5Eb21haW5SZWZlcmVuY2VcIicpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvbWFpbnNTd2FybS5pbml0KHJvbGUsIGFsaWFzKTtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgdHJhbnNhY3Rpb24uYWRkKGRvbWFpbnNTd2FybSk7XG5cbiAgICAgICAgICAgICQkLmJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcbiAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICB0aGlzLnJldHVybihuZXcgRXJyb3IoXCJEb21haW4gYWxscmVhZHkgZXhpc3RzIVwiKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJldHVybihudWxsLCBhbGlhcyk7XG4gICAgfSxcbiAgICBnZXREb21haW5EZXRhaWxzOmZ1bmN0aW9uKGFsaWFzKXtcbiAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuICAgICAgICBjb25zdCBkb21haW4gPSB0cmFuc2FjdGlvbi5sb29rdXAoJ2dsb2JhbC5Eb21haW5SZWZlcmVuY2UnLCBhbGlhcyk7XG5cbiAgICAgICAgaWYgKCFkb21haW4pIHtcbiAgICAgICAgICAgIHRoaXMucmV0dXJuKG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgc3dhcm0gbmFtZWQgXCJnbG9iYWwuRG9tYWluUmVmZXJlbmNlXCInKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJldHVybihudWxsLCBiZWVzSGVhbGVyLmFzSlNPTihkb21haW4pLnB1YmxpY1ZhcnMpO1xuICAgIH0sXG4gICAgY29ubmVjdERvbWFpblRvUmVtb3RlKGRvbWFpbk5hbWUsIGFsaWFzLCByZW1vdGVFbmRQb2ludCl7XG4gICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gJCQuYmxvY2tjaGFpbi5iZWdpblRyYW5zYWN0aW9uKHt9KTtcbiAgICAgICAgY29uc3QgZG9tYWluID0gdHJhbnNhY3Rpb24ubG9va3VwKCdnbG9iYWwuRG9tYWluUmVmZXJlbmNlJywgZG9tYWluTmFtZSk7XG5cbiAgICAgICAgaWYgKCFkb21haW4pIHtcbiAgICAgICAgICAgIHRoaXMucmV0dXJuKG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgc3dhcm0gbmFtZWQgXCJnbG9iYWwuRG9tYWluUmVmZXJlbmNlXCInKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBkb21haW4uYWRkUmVtb3RlSW50ZXJmYWNlKGFsaWFzLCByZW1vdGVFbmRQb2ludCk7XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgdHJhbnNhY3Rpb24uYWRkKGRvbWFpbik7XG5cbiAgICAgICAgICAgICQkLmJsb2NrY2hhaW4uY29tbWl0KHRyYW5zYWN0aW9uKTtcbiAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgdGhpcy5yZXR1cm4obmV3IEVycm9yKFwiRG9tYWluIHVwZGF0ZSBmYWlsZWQhXCIpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmV0dXJuKG51bGwsIGFsaWFzKTtcbiAgICB9LFxuICAgIC8vIGdldERvbWFpbkRldGFpbHM6IHNoYXJlZFBoYXNlcy5nZXRBc3NldEZhY3RvcnkoJ2dsb2JhbC5Eb21haW5SZWZlcmVuY2UnKSxcbiAgICBnZXREb21haW5zOiBzaGFyZWRQaGFzZXMuZ2V0QWxsQXNzZXRzRmFjdG9yeSgnZ2xvYmFsLkRvbWFpblJlZmVyZW5jZScpXG59KTtcbiIsInJlcXVpcmUoJy4vZG9tYWluU3dhcm1zJyk7XG5yZXF1aXJlKCcuL2FnZW50c1N3YXJtJyk7IiwiY29uc3QgYmVlc0hlYWxlciA9IHJlcXVpcmUoXCJzd2FybXV0aWxzXCIpLmJlZXNIZWFsZXI7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGdldEFzc2V0RmFjdG9yeTogZnVuY3Rpb24oYXNzZXRUeXBlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihhbGlhcykge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSAkJC5ibG9ja2NoYWluLmJlZ2luVHJhbnNhY3Rpb24oe30pO1xuICAgICAgICAgICAgY29uc3QgZG9tYWluUmVmZXJlbmNlU3dhcm0gPSB0cmFuc2FjdGlvbi5sb29rdXAoYXNzZXRUeXBlLCBhbGlhcyk7XG5cbiAgICAgICAgICAgIGlmKCFkb21haW5SZWZlcmVuY2VTd2FybSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmV0dXJuKG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgc3dhcm0gbmFtZWQgXCIke2Fzc2V0VHlwZX1cImApKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMucmV0dXJuKHVuZGVmaW5lZCwgYmVlc0hlYWxlci5hc0pTT04oZG9tYWluUmVmZXJlbmNlU3dhcm0pKTtcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIGdldEFsbEFzc2V0c0ZhY3Rvcnk6IGZ1bmN0aW9uKGFzc2V0VHlwZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2FjdGlvbiA9ICQkLmJsb2NrY2hhaW4uYmVnaW5UcmFuc2FjdGlvbih7fSk7XG4gICAgICAgICAgICBjb25zdCBkb21haW5zID0gdHJhbnNhY3Rpb24ubG9hZEFzc2V0cyhhc3NldFR5cGUpIHx8IFtdO1xuXG4gICAgICAgICAgICB0aGlzLnJldHVybih1bmRlZmluZWQsIGRvbWFpbnMubWFwKChkb21haW4pID0+IGJlZXNIZWFsZXIuYXNKU09OKGRvbWFpbikpKTtcbiAgICAgICAgfTtcbiAgICB9XG59OyIsIi8qXG5jb25zZW5zdXMgaGVscGVyIGZ1bmN0aW9uc1xuKi9cblxudmFyIHBza2NyeXB0byA9IHJlcXVpcmUoXCJwc2tjcnlwdG9cIik7XG5cblxuZnVuY3Rpb24gUHVsc2Uoc2lnbmVyLCBjdXJyZW50UHVsc2VOdW1iZXIsIGJsb2NrLCBuZXdUcmFuc2FjdGlvbnMsIHZzZCwgdG9wLCBsYXN0KSB7XG4gICAgdGhpcy5zaWduZXIgICAgICAgICA9IHNpZ25lcjsgICAgICAgICAgICAgICAvL2Euay5hLiBkZWxlZ2F0ZWRBZ2VudE5hbWVcbiAgICB0aGlzLmN1cnJlbnRQdWxzZSAgID0gY3VycmVudFB1bHNlTnVtYmVyO1xuICAgIHRoaXMubHNldCAgICAgICAgICAgPSBuZXdUcmFuc2FjdGlvbnM7ICAgICAgLy9kaWdlc3QgLT4gdHJhbnNhY3Rpb25cbiAgICB0aGlzLnB0QmxvY2sgICAgICAgID0gYmxvY2s7ICAgICAgICAgICAgICAgIC8vYXJyYXkgb2YgZGlnZXN0c1xuICAgIHRoaXMudnNkICAgICAgICAgICAgPSB2c2Q7XG4gICAgdGhpcy50b3AgICAgICAgICAgICA9IHRvcDsgICAgICAgICAgICAgICAgICAvLyBhLmsuYS4gdG9wUHVsc2VDb25zZW5zdXNcbiAgICB0aGlzLmxhc3QgICAgICAgICAgID0gbGFzdDsgICAgICAgICAgICAgICAgIC8vIGEuay5hLiBsYXN0UHVsc2VBY2hpZXZlZENvbnNlbnN1c1xufVxuXG5mdW5jdGlvbiBUcmFuc2FjdGlvbihjdXJyZW50UHVsc2UsIHN3YXJtKSB7XG4gICAgdGhpcy5pbnB1dCAgICAgID0gc3dhcm0uaW5wdXQ7XG4gICAgdGhpcy5vdXRwdXQgICAgID0gc3dhcm0ub3V0cHV0O1xuICAgIHRoaXMuc3dhcm0gICAgICA9IHN3YXJtO1xuXG4gICAgdmFyIGFyciA9IHByb2Nlc3MuaHJ0aW1lKCk7XG4gICAgdGhpcy5zZWNvbmQgICAgID0gYXJyWzBdO1xuICAgIHRoaXMubmFub3NlY29kICA9IGFyclsxXTtcblxuICAgIHRoaXMuQ1AgICAgICAgICA9IGN1cnJlbnRQdWxzZTtcbiAgICB0aGlzLmRpZ2VzdCAgICAgPSBwc2tjcnlwdG8uaGFzaFZhbHVlcyh0aGlzKTtcbn1cblxuXG5leHBvcnRzLmNyZWF0ZVRyYW5zYWN0aW9uID0gZnVuY3Rpb24gKGN1cnJlbnRQdWxzZSwgc3dhcm0pIHtcbiAgICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uKGN1cnJlbnRQdWxzZSwgc3dhcm0pO1xufVxuXG5leHBvcnRzLmNyZWF0ZVB1bHNlID0gZnVuY3Rpb24gKHNpZ25lciwgY3VycmVudFB1bHNlTnVtYmVyLCBibG9jaywgbmV3VHJhbnNhY3Rpb25zLCB2c2QsIHRvcCwgbGFzdCkge1xuICAgIHJldHVybiBuZXcgUHVsc2Uoc2lnbmVyLCBjdXJyZW50UHVsc2VOdW1iZXIsIGJsb2NrLCBuZXdUcmFuc2FjdGlvbnMsIHZzZCwgdG9wLCBsYXN0KTtcbn1cblxuZXhwb3J0cy5vcmRlclRyYW5zYWN0aW9ucyA9IGZ1bmN0aW9uIChwc2V0KSB7IC8vb3JkZXIgaW4gcGxhY2UgdGhlIHBzZXQgYXJyYXlcbiAgICB2YXIgYXJyID0gW107XG4gICAgZm9yICh2YXIgZCBpbiBwc2V0KSB7XG4gICAgICAgIGFyci5wdXNoKHBzZXRbZF0pO1xuICAgIH1cblxuICAgIGFyci5zb3J0KGZ1bmN0aW9uICh0MSwgdDIpIHtcbiAgICAgICAgaWYgKHQxLkNQIDwgdDIuQ1ApIHJldHVybiAtMTtcbiAgICAgICAgaWYgKHQxLkNQID4gdDIuQ1ApIHJldHVybiAxO1xuICAgICAgICBpZiAodDEuc2Vjb25kIDwgdDIuc2Vjb25kKSByZXR1cm4gLTE7XG4gICAgICAgIGlmICh0MS5zZWNvbmQgPiB0Mi5zZWNvbmQpIHJldHVybiAxO1xuICAgICAgICBpZiAodDEubmFub3NlY29kIDwgdDIubmFub3NlY29kKSByZXR1cm4gLTE7XG4gICAgICAgIGlmICh0MS5uYW5vc2Vjb2QgPiB0Mi5uYW5vc2Vjb2QpIHJldHVybiAxO1xuICAgICAgICBpZiAodDEuZGlnZXN0IDwgdDIuZGlnZXN0KSByZXR1cm4gLTE7XG4gICAgICAgIGlmICh0MS5kaWdlc3QgPiB0Mi5kaWdlc3QpIHJldHVybiAxO1xuICAgICAgICByZXR1cm4gMDsgLy9vbmx5IGZvciBpZGVudGljYWwgdHJhbnNhY3Rpb25zLi4uXG4gICAgfSlcbiAgICByZXR1cm4gYXJyO1xufVxuXG5mdW5jdGlvbiBnZXRNYWpvcml0eUZpZWxkSW5QdWxzZXMoYWxsUHVsc2VzLCBmaWVsZE5hbWUsIGV4dHJhY3RGaWVsZE5hbWUsIHZvdGluZ0JveCkge1xuICAgIHZhciBjb3VudGVyRmllbGRzID0ge307XG4gICAgdmFyIG1ham9yaXR5VmFsdWU7XG4gICAgdmFyIHB1bHNlO1xuXG4gICAgZm9yICh2YXIgYWdlbnQgaW4gYWxsUHVsc2VzKSB7XG4gICAgICAgIHB1bHNlID0gYWxsUHVsc2VzW2FnZW50XTtcbiAgICAgICAgdmFyIHYgPSBwdWxzZVtmaWVsZE5hbWVdO1xuICAgICAgICBjb3VudGVyRmllbGRzW3ZdID0gdm90aW5nQm94LnZvdGUoY291bnRlckZpZWxkc1t2XSk7ICAgICAgICAvLyArK2NvdW50ZXJGaWVsZHNbdl1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpIGluIGNvdW50ZXJGaWVsZHMpIHtcbiAgICAgICAgaWYgKHZvdGluZ0JveC5pc01ham9yaXRhcmlhbihjb3VudGVyRmllbGRzW2ldKSkge1xuICAgICAgICAgICAgbWFqb3JpdHlWYWx1ZSA9IGk7XG4gICAgICAgICAgICBpZiAoZmllbGROYW1lID09IGV4dHJhY3RGaWVsZE5hbWUpIHsgICAgICAgICAgICAgICAgICAgIC8vPz8/IFwidnNkXCIsIFwidnNkXCJcbiAgICAgICAgICAgICAgICByZXR1cm4gbWFqb3JpdHlWYWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXCJibG9ja0RpZ2VzdFwiLCBcInB0QmxvY2tcIlxuICAgICAgICAgICAgICAgIGZvciAodmFyIGFnZW50IGluIGFsbFB1bHNlcykge1xuICAgICAgICAgICAgICAgICAgICBwdWxzZSA9IGFsbFB1bHNlc1thZ2VudF07XG4gICAgICAgICAgICAgICAgICAgIGlmIChwdWxzZVtmaWVsZE5hbWVdID09IG1ham9yaXR5VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwdWxzZVtleHRyYWN0RmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gXCJub25lXCI7IC8vdGhlcmUgaXMgbm8gbWFqb3JpdHlcbn1cblxuZXhwb3J0cy5kZXRlY3RNYWpvcml0YXJpYW5WU0QgPSBmdW5jdGlvbiAocHVsc2UsIHB1bHNlc0hpc3RvcnksIHZvdGluZ0JveCkge1xuICAgIGlmIChwdWxzZSA9PSAwKSByZXR1cm4gXCJub25lXCI7XG4gICAgdmFyIHB1bHNlcyA9IHB1bHNlc0hpc3RvcnlbcHVsc2VdO1xuICAgIHZhciBtYWpvcml0eVZhbHVlID0gZ2V0TWFqb3JpdHlGaWVsZEluUHVsc2VzKHB1bHNlcywgXCJ2c2RcIiwgXCJ2c2RcIiwgdm90aW5nQm94KTtcbiAgICByZXR1cm4gbWFqb3JpdHlWYWx1ZTtcbn1cblxuLypcbiAgICBkZXRlY3QgYSBjYW5kaWRhdGUgYmxvY2tcbiAqL1xuZXhwb3J0cy5kZXRlY3RNYWpvcml0YXJpYW5QVEJsb2NrID0gZnVuY3Rpb24gKHB1bHNlLCBwdWxzZXNIaXN0b3J5LCB2b3RpbmdCb3gpIHtcbiAgICBpZiAocHVsc2UgPT0gMCkgcmV0dXJuIFwibm9uZVwiO1xuICAgIHZhciBwdWxzZXMgPSBwdWxzZXNIaXN0b3J5W3B1bHNlXTtcbiAgICB2YXIgYnRCbG9jayA9IGdldE1ham9yaXR5RmllbGRJblB1bHNlcyhwdWxzZXMsIFwiYmxvY2tEaWdlc3RcIiwgXCJwdEJsb2NrXCIsIHZvdGluZ0JveCk7XG4gICAgcmV0dXJuIGJ0QmxvY2s7XG59XG5cbmV4cG9ydHMubWFrZVNldEZyb21CbG9jayA9IGZ1bmN0aW9uIChrbm93blRyYW5zYWN0aW9ucywgYmxvY2spIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBibG9jay5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaXRlbSA9IGJsb2NrW2ldO1xuICAgICAgICByZXN1bHRbaXRlbV0gPSBrbm93blRyYW5zYWN0aW9uc1tpdGVtXTtcbiAgICAgICAgaWYgKCFrbm93blRyYW5zYWN0aW9ucy5oYXNPd25Qcm9wZXJ0eShpdGVtKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2cobmV3IEVycm9yKFwiRG8gbm90IGdpdmUgdW5rbm93biB0cmFuc2FjdGlvbiBkaWdlc3RzIHRvIG1ha2VTZXRGcm9tQmxvY2sgXCIgKyBpdGVtKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0cy5zZXRzQ29uY2F0ID0gZnVuY3Rpb24gKHRhcmdldCwgZnJvbSkge1xuICAgIGZvciAodmFyIGQgaW4gZnJvbSkge1xuICAgICAgICB0YXJnZXRbZF0gPSBmcm9tW2RdO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG5leHBvcnRzLnNldHNSZW1vdmVBcnJheSA9IGZ1bmN0aW9uICh0YXJnZXQsIGFycikge1xuICAgIGFyci5mb3JFYWNoKGl0ZW0gPT4gZGVsZXRlIHRhcmdldFtpdGVtXSk7XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuZXhwb3J0cy5zZXRzUmVtb3ZlUHRCbG9ja0FuZFBhc3RUcmFuc2FjdGlvbnMgPSBmdW5jdGlvbiAodGFyZ2V0LCBhcnIsIG1heFB1bHNlKSB7XG4gICAgdmFyIHRvQmVSZW1vdmVkID0gW107XG4gICAgZm9yICh2YXIgZCBpbiB0YXJnZXQpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChhcnJbaV0gPT0gZCB8fCB0YXJnZXRbZF0uQ1AgPCBtYXhQdWxzZSkge1xuICAgICAgICAgICAgICAgIHRvQmVSZW1vdmVkLnB1c2goZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0b0JlUmVtb3ZlZC5mb3JFYWNoKGl0ZW0gPT4gZGVsZXRlIHRhcmdldFtpdGVtXSk7XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuZXhwb3J0cy5jcmVhdGVEZW1vY3JhdGljVm90aW5nQm94ID0gZnVuY3Rpb24gKHNoYXJlSG9sZGVyc0NvdW50ZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB2b3RlOiBmdW5jdGlvbiAocHJldmlvc1ZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoIXByZXZpb3NWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHByZXZpb3NWYWx1ZSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJldmlvc1ZhbHVlICsgMTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc01ham9yaXRhcmlhbjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKHZhbHVlICwgTWF0aC5mbG9vcihzaGFyZUhvbGRlcnNDb3VudGVyLzIpICsgMSk7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgPj0gTWF0aC5mbG9vcihzaGFyZUhvbGRlcnNDb3VudGVyIC8gMikgKyAxO1xuICAgICAgICB9XG4gICAgfTtcbn1cbiIsInJlcXVpcmUoXCIuL2Zsb3dzL0NTQm1hbmFnZXJcIik7XG5yZXF1aXJlKFwiLi9mbG93cy9yZW1vdGVTd2FybWluZ1wiKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IGh0dHBXcmFwcGVyID0gcmVxdWlyZSgnLi9saWJzL2h0dHAtd3JhcHBlcicpO1xuY29uc3QgZWRmcyA9IHJlcXVpcmUoXCJlZGZzXCIpO1xuY29uc3QgRURGU01pZGRsZXdhcmUgPSBlZGZzLkVERlNNaWRkbGV3YXJlO1xuY29uc3QgU2VydmVyID0gaHR0cFdyYXBwZXIuU2VydmVyO1xuY29uc3QgUm91dGVyID0gaHR0cFdyYXBwZXIuUm91dGVyO1xuY29uc3QgVG9rZW5CdWNrZXQgPSByZXF1aXJlKCcuL2xpYnMvVG9rZW5CdWNrZXQnKTtcbmNvbnN0IG1zZ3BhY2sgPSByZXF1aXJlKCdAbXNncGFjay9tc2dwYWNrJyk7XG5cblxuZnVuY3Rpb24gVmlydHVhbE1RKHtsaXN0ZW5pbmdQb3J0LCByb290Rm9sZGVyLCBzc2xDb25maWd9LCBjYWxsYmFjaykge1xuXHRjb25zdCBwb3J0ID0gbGlzdGVuaW5nUG9ydCB8fCA4MDgwO1xuXHRjb25zdCBzZXJ2ZXIgPSBuZXcgU2VydmVyKHNzbENvbmZpZykubGlzdGVuKHBvcnQpO1xuXHRjb25zdCB0b2tlbkJ1Y2tldCA9IG5ldyBUb2tlbkJ1Y2tldCg2MDAwMDAsMSwxMCk7XG5cdGNvbnN0IENTQl9zdG9yYWdlX2ZvbGRlciA9IFwidXBsb2Fkc1wiO1xuXHRjb25zdCBTV0FSTV9zdG9yYWdlX2ZvbGRlciA9IFwic3dhcm1zXCI7XG5cdGNvbnNvbGUubG9nKFwiTGlzdGVuaW5nIG9uIHBvcnQ6XCIsIHBvcnQpO1xuXG5cdHRoaXMuY2xvc2UgPSBzZXJ2ZXIuY2xvc2U7XG5cdCQkLmZsb3cuc3RhcnQoXCJDU0JtYW5hZ2VyXCIpLmluaXQocGF0aC5qb2luKHJvb3RGb2xkZXIsIENTQl9zdG9yYWdlX2ZvbGRlciksIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdHRocm93IGVycjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc29sZS5sb2coXCJDU0JNYW5hZ2VyIGlzIHVzaW5nIGZvbGRlclwiLCByZXN1bHQpO1xuXHRcdFx0JCQuZmxvdy5zdGFydChcIlJlbW90ZVN3YXJtaW5nXCIpLmluaXQocGF0aC5qb2luKHJvb3RGb2xkZXIsIFNXQVJNX3N0b3JhZ2VfZm9sZGVyKSwgZnVuY3Rpb24oZXJyLCByZXN1bHQpe1xuXHRcdFx0XHRyZWdpc3RlckVuZHBvaW50cygpO1xuXHRcdFx0XHRpZiAoY2FsbGJhY2spIHtcblx0XHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIHJlZ2lzdGVyRW5kcG9pbnRzKCkge1xuXHRcdGNvbnN0IHJvdXRlciA9IG5ldyBSb3V0ZXIoc2VydmVyKTtcblx0XHRyb3V0ZXIudXNlKFwiL0VERlNcIiwgKG5ld1NlcnZlcikgPT4ge1xuXHRcdFx0bmV3IEVERlNNaWRkbGV3YXJlKG5ld1NlcnZlcik7XG5cdFx0fSk7XG5cblx0XHRzZXJ2ZXIudXNlKGZ1bmN0aW9uIChyZXEsIHJlcywgbmV4dCkge1xuXHRcdFx0cmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBQVVQsIERFTEVURScpO1xuXHRcdFx0cmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicpO1xuXHRcdFx0cmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnLCB0cnVlKTtcblx0XHRcdG5leHQoKTtcblx0XHR9KTtcblxuICAgICAgICBzZXJ2ZXIudXNlKGZ1bmN0aW9uIChyZXEsIHJlcywgbmV4dCkge1xuICAgICAgICAgICAgY29uc3QgaXAgPSByZXMuc29ja2V0LnJlbW90ZUFkZHJlc3M7XG5cbiAgICAgICAgICAgIHRva2VuQnVja2V0LnRha2VUb2tlbihpcCwgdG9rZW5CdWNrZXQuQ09TVF9NRURJVU0sIGZ1bmN0aW9uKGVyciwgcmVtYWluZWRUb2tlbnMpIHtcbiAgICAgICAgICAgIFx0cmVzLnNldEhlYWRlcignWC1SYXRlTGltaXQtTGltaXQnLCB0b2tlbkJ1Y2tldC5nZXRMaW1pdEJ5Q29zdCh0b2tlbkJ1Y2tldC5DT1NUX01FRElVTSkpO1xuICAgICAgICAgICAgXHRyZXMuc2V0SGVhZGVyKCdYLVJhdGVMaW1pdC1SZW1haW5pbmcnLCB0b2tlbkJ1Y2tldC5nZXRSZW1haW5pbmdUb2tlbkJ5Q29zdChyZW1haW5lZFRva2VucywgdG9rZW5CdWNrZXQuQ09TVF9NRURJVU0pKTtcblxuICAgICAgICAgICAgXHRpZihlcnIpIHtcbiAgICAgICAgICAgIFx0XHRzd2l0Y2ggKGVycikge1xuICAgICAgICAgICAgXHRcdFx0Y2FzZSBUb2tlbkJ1Y2tldC5FUlJPUl9MSU1JVF9FWENFRURFRDpcbiAgICAgICAgICAgIFx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSA0Mjk7XG4gICAgICAgICAgICBcdFx0XHRcdGJyZWFrO1xuICAgICAgICAgICAgXHRcdFx0ZGVmYXVsdDpcbiAgICAgICAgICAgIFx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSA1MDA7XG5cbiAgICAgICAgICAgIFx0XHR9XG5cbiAgICAgICAgICAgIFx0XHRyZXMuZW5kKCk7XG4gICAgICAgICAgICBcdFx0cmV0dXJuO1xuICAgICAgICAgICAgXHR9XG5cbiAgICAgICAgICAgIFx0bmV4dCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNlcnZlci5wb3N0KCcvOmNoYW5uZWxJZCcsIGZ1bmN0aW9uIChyZXEsIHJlcywgbmV4dCkge1xuICAgICAgICAgICAgY29uc3QgY29udGVudFR5cGUgPSByZXEuaGVhZGVyc1snY29udGVudC10eXBlJ107XG5cbiAgICAgICAgICAgIGlmIChjb250ZW50VHlwZSA9PT0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50TGVuZ3RoID0gTnVtYmVyLnBhcnNlSW50KHJlcS5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddKTtcblxuICAgICAgICAgICAgICAgIHN0cmVhbVRvQnVmZmVyKHJlcSwgY29udGVudExlbmd0aCwgKGVyciwgYm9keUFzQnVmZmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXEuYm9keSA9IG1zZ3BhY2suZGVjb2RlKGJvZHlBc0J1ZmZlcik7XG5cbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgLyoqKioqIEhFTFBFUiBGVU5DVElPTiAqKioqKi9cblxuICAgICAgICAgICAgZnVuY3Rpb24gc3RyZWFtVG9CdWZmZXIoc3RyZWFtLCBidWZmZXJTaXplLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5hbGxvYyhidWZmZXJTaXplKTtcbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudE9mZnNldCA9IDA7XG5cbiAgICAgICAgICAgICAgICBzdHJlYW1cbiAgICAgICAgICAgICAgICAgICAgLm9uKCdkYXRhJywgY2h1bmsgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2h1bmtTaXplID0gY2h1bmsubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV4dE9mZnNldCA9IGNodW5rU2l6ZSArIGN1cnJlbnRPZmZzZXQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50T2Zmc2V0ID4gYnVmZmVyU2l6ZSAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJlYW0uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdTdHJlYW0gaXMgYmlnZ2VyIHRoYW4gcmVwb3J0ZWQgc2l6ZScpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdW5zYWZlQXBwZW5kSW5CdWZmZXJGcm9tT2Zmc2V0KGJ1ZmZlciwgY2h1bmssIGN1cnJlbnRPZmZzZXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudE9mZnNldCA9IG5leHRPZmZzZXQ7XG5cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5vbignZXJyb3InLCBjYWxsYmFjayk7XG5cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiB1bnNhZmVBcHBlbmRJbkJ1ZmZlckZyb21PZmZzZXQoYnVmZmVyLCBkYXRhVG9BcHBlbmQsIG9mZnNldCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFTaXplID0gZGF0YVRvQXBwZW5kLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGF0YVNpemU7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gZGF0YVRvQXBwZW5kW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgICAgICBzZXJ2ZXIucG9zdCgnLzpjaGFubmVsSWQnLCBmdW5jdGlvbiAocmVxLCByZXMpIHtcbiAgICAgICAgICAgICQkLmZsb3cuc3RhcnQoXCJSZW1vdGVTd2FybWluZ1wiKS5zdGFydFN3YXJtKHJlcS5wYXJhbXMuY2hhbm5lbElkLCBKU09OLnN0cmluZ2lmeShyZXEuYm9keSksIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAxO1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIHNlcnZlci5nZXQoJy86Y2hhbm5lbElkJywgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgICAgICAgICAkJC5mbG93LnN0YXJ0KFwiUmVtb3RlU3dhcm1pbmdcIikud2FpdEZvclN3YXJtKHJlcS5wYXJhbXMuY2hhbm5lbElkLCByZXMsIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCwgY29uZmlybWF0aW9uSWQpIHtcblxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbGV0IHJlc3BvbnNlTWVzc2FnZSA9IHJlc3VsdDtcblxuICAgICAgICAgICAgICAgIGlmICgocmVxLnF1ZXJ5LndhaXRDb25maXJtYXRpb24gfHwgJ2ZhbHNlJykgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLm9uKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkJC5mbG93LnN0YXJ0KCdSZW1vdGVTd2FybWluZycpLmNvbmZpcm1Td2FybShyZXEucGFyYW1zLmNoYW5uZWxJZCwgY29uZmlybWF0aW9uSWQsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZU1lc3NhZ2UgPSB7cmVzdWx0LCBjb25maXJtYXRpb25JZH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZW5jb2RlZFJlc3BvbnNlTWVzc2FnZSA9IG1zZ3BhY2suZW5jb2RlKHJlc3BvbnNlTWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlKEJ1ZmZlci5mcm9tKGVuY29kZWRSZXNwb25zZU1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cblx0XHRzZXJ2ZXIuZGVsZXRlKFwiLzpjaGFubmVsSWQvOmNvbmZpcm1hdGlvbklkXCIsIGZ1bmN0aW9uKHJlcSwgcmVzKXtcblx0XHRcdCQkLmZsb3cuc3RhcnQoXCJSZW1vdGVTd2FybWluZ1wiKS5jb25maXJtU3dhcm0ocmVxLnBhcmFtcy5jaGFubmVsSWQsIHJlcS5wYXJhbXMuY29uZmlybWF0aW9uSWQsIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHRcdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDUwMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHNlcnZlci5wb3N0KCcvQ1NCJywgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG5cdFx0XHQvL3ByZXZlbnRpbmcgaWxsZWdhbCBjaGFyYWN0ZXJzIHBhc3NpbmcgYXMgZmlsZUlkXG5cdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDQwMDtcblx0XHRcdHJlcy5lbmQoKTtcblx0XHR9KTtcblxuXHRcdHNlcnZlci5wb3N0KCcvQ1NCL2NvbXBhcmVWZXJzaW9ucycsIGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG5cdFx0XHQkJC5mbG93LnN0YXJ0KCdDU0JtYW5hZ2VyJykuY29tcGFyZVZlcnNpb25zKHJlcSwgZnVuY3Rpb24oZXJyLCBmaWxlc1dpdGhDaGFuZ2VzKSB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0XHRcdHJlcy5zdGF0dXNDb2RlID0gNTAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoZmlsZXNXaXRoQ2hhbmdlcykpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRzZXJ2ZXIucG9zdCgnL0NTQi86ZmlsZUlkJywgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG5cdFx0XHQkJC5mbG93LnN0YXJ0KFwiQ1NCbWFuYWdlclwiKS53cml0ZShyZXEucGFyYW1zLmZpbGVJZCwgcmVxLCBmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcblx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSAyMDE7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDUwMDtcblxuXHRcdFx0XHRcdGlmIChlcnIuY29kZSA9PT0gJ0VBQ0NFUycpIHtcblx0XHRcdFx0XHRcdHJlcy5zdGF0dXNDb2RlID0gNDA5O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHR9KTtcblxuXHRcdH0pO1xuXG5cdFx0c2VydmVyLmdldCgnL0NTQi86ZmlsZUlkJywgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG5cdFx0XHRyZXMuc2V0SGVhZGVyKFwiY29udGVudC10eXBlXCIsIFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCIpO1xuXHRcdFx0JCQuZmxvdy5zdGFydChcIkNTQm1hbmFnZXJcIikucmVhZChyZXEucGFyYW1zLmZpbGVJZCwgcmVzLCBmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcblx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSAyMDA7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0XHRcdHJlcy5zdGF0dXNDb2RlID0gNDA0O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0c2VydmVyLmdldCgnL0NTQi86ZmlsZUlkL3ZlcnNpb25zJywgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG5cdFx0XHQkJC5mbG93LnN0YXJ0KFwiQ1NCbWFuYWdlclwiKS5nZXRWZXJzaW9uc0ZvckZpbGUocmVxLnBhcmFtcy5maWxlSWQsIGZ1bmN0aW9uKGVyciwgZmlsZVZlcnNpb25zKSB7XG5cdFx0XHRcdGlmKGVycikge1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZXJyKTtcblx0XHRcdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDQwNDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoZmlsZVZlcnNpb25zKSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHNlcnZlci5nZXQoJy9DU0IvOmZpbGVJZC86dmVyc2lvbicsIGZ1bmN0aW9uIChyZXEsIHJlcykge1xuXHRcdFx0JCQuZmxvdy5zdGFydChcIkNTQm1hbmFnZXJcIikucmVhZFZlcnNpb24ocmVxLnBhcmFtcy5maWxlSWQsIHJlcS5wYXJhbXMudmVyc2lvbiwgcmVzLCBmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcblx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSAyMDA7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0XHRcdHJlcy5zdGF0dXNDb2RlID0gNDA0O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cblxuXG5cdFx0c2VydmVyLm9wdGlvbnMoJy8qJywgZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG5cdFx0XHR2YXIgaGVhZGVycyA9IHt9O1xuXHRcdFx0Ly8gSUU4IGRvZXMgbm90IGFsbG93IGRvbWFpbnMgdG8gYmUgc3BlY2lmaWVkLCBqdXN0IHRoZSAqXG5cdFx0XHQvLyBoZWFkZXJzW1wiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCJdID0gcmVxLmhlYWRlcnMub3JpZ2luO1xuXHRcdFx0aGVhZGVyc1tcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiXSA9IFwiKlwiO1xuXHRcdFx0aGVhZGVyc1tcIkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHNcIl0gPSBcIlBPU1QsIEdFVCwgUFVULCBERUxFVEUsIE9QVElPTlNcIjtcblx0XHRcdGhlYWRlcnNbXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFsc1wiXSA9IHRydWU7XG5cdFx0XHRoZWFkZXJzW1wiQWNjZXNzLUNvbnRyb2wtTWF4LUFnZVwiXSA9ICczNjAwJzsgLy9vbmUgaG91clxuXHRcdFx0aGVhZGVyc1tcIkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIl0gPSBcIkNvbnRlbnQtVHlwZSwgQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luLCBVc2VyLUFnZW50XCI7XG5cdFx0XHRyZXMud3JpdGVIZWFkKDIwMCwgaGVhZGVycyk7XG5cdFx0XHRyZXMuZW5kKCk7XG5cdFx0fSk7XG5cblx0XHRzZXJ2ZXIudXNlKGZ1bmN0aW9uIChyZXEsIHJlcykge1xuXHRcdFx0cmVzLnN0YXR1c0NvZGUgPSA0MDQ7XG5cdFx0XHRyZXMuZW5kKCk7XG5cdFx0fSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlVmlydHVhbE1RID0gZnVuY3Rpb24ocG9ydCwgZm9sZGVyLCBzc2xDb25maWcsIGNhbGxiYWNrKXtcblx0aWYodHlwZW9mIHNzbENvbmZpZyA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdGNhbGxiYWNrID0gc3NsQ29uZmlnO1xuXHRcdHNzbENvbmZpZyA9IHVuZGVmaW5lZDtcblx0fVxuXG5cdHJldHVybiBuZXcgVmlydHVhbE1RKHtsaXN0ZW5pbmdQb3J0OnBvcnQsIHJvb3RGb2xkZXI6Zm9sZGVyLCBzc2xDb25maWd9LCBjYWxsYmFjayk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5WaXJ0dWFsTVEgPSBWaXJ0dWFsTVE7XG5cbm1vZHVsZS5leHBvcnRzLmdldEh0dHBXcmFwcGVyID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiByZXF1aXJlKCcuL2xpYnMvaHR0cC13cmFwcGVyJyk7XG59O1xuIiwicmVxdWlyZSgnbGF1bmNoZXInKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmNvbnN0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgUHNrSGFzaCA9IHJlcXVpcmUoJ3Bza2NyeXB0bycpLlBza0hhc2g7XG5cbmNvbnN0IGZvbGRlck5hbWVTaXplID0gcHJvY2Vzcy5lbnYuRk9MREVSX05BTUVfU0laRSB8fCA1O1xuY29uc3QgRklMRV9TRVBBUkFUT1IgPSAnLSc7XG5sZXQgcm9vdGZvbGRlcjtcblxuJCQuZmxvdy5kZXNjcmliZShcIkNTQm1hbmFnZXJcIiwge1xuICAgIGluaXQ6IGZ1bmN0aW9uKHJvb3RGb2xkZXIsIGNhbGxiYWNrKXtcbiAgICAgICAgaWYoIXJvb3RGb2xkZXIpe1xuICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiTm8gcm9vdCBmb2xkZXIgc3BlY2lmaWVkIVwiKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcm9vdEZvbGRlciA9IHBhdGgucmVzb2x2ZShyb290Rm9sZGVyKTtcbiAgICAgICAgdGhpcy5fX2Vuc3VyZUZvbGRlclN0cnVjdHVyZShyb290Rm9sZGVyLCBmdW5jdGlvbihlcnIvKiwgcGF0aCovKXtcbiAgICAgICAgICAgIHJvb3Rmb2xkZXIgPSByb290Rm9sZGVyO1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByb290Rm9sZGVyKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB3cml0ZTogZnVuY3Rpb24oZmlsZU5hbWUsIHJlYWRGaWxlU3RyZWFtLCBjYWxsYmFjayl7XG4gICAgICAgIGlmKCF0aGlzLl9fdmVyaWZ5RmlsZU5hbWUoZmlsZU5hbWUsIGNhbGxiYWNrKSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZighcmVhZEZpbGVTdHJlYW0gfHwgIXJlYWRGaWxlU3RyZWFtLnBpcGUgfHwgdHlwZW9mIHJlYWRGaWxlU3RyZWFtLnBpcGUgIT09IFwiZnVuY3Rpb25cIil7XG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJTb21ldGhpbmcgd3JvbmcgaGFwcGVuZWRcIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZm9sZGVyTmFtZSA9IHBhdGguam9pbihyb290Zm9sZGVyLCBmaWxlTmFtZS5zdWJzdHIoMCwgZm9sZGVyTmFtZVNpemUpLCBmaWxlTmFtZSk7XG5cbiAgICAgICAgY29uc3Qgc2VyaWFsID0gdGhpcy5zZXJpYWwoKCkgPT4ge30pOyAvL1RPRE86IEVtcHR5IGZ1bmN0aW9uXG5cbiAgICAgICAgc2VyaWFsLl9fZW5zdXJlRm9sZGVyU3RydWN0dXJlKGZvbGRlck5hbWUsIHNlcmlhbC5fX3Byb2dyZXNzKTtcbiAgICAgICAgc2VyaWFsLl9fd3JpdGVGaWxlKHJlYWRGaWxlU3RyZWFtLCBmb2xkZXJOYW1lLCBmaWxlTmFtZSwgY2FsbGJhY2spO1xuICAgIH0sXG4gICAgcmVhZDogZnVuY3Rpb24oZmlsZU5hbWUsIHdyaXRlRmlsZVN0cmVhbSwgY2FsbGJhY2spe1xuICAgICAgICBpZighdGhpcy5fX3ZlcmlmeUZpbGVOYW1lKGZpbGVOYW1lLCBjYWxsYmFjaykpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IHBhdGguam9pbihyb290Zm9sZGVyLCBmaWxlTmFtZS5zdWJzdHIoMCwgZm9sZGVyTmFtZVNpemUpKTtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgZmlsZU5hbWUpO1xuICAgICAgICB0aGlzLl9fdmVyaWZ5RmlsZUV4aXN0ZW5jZShmaWxlUGF0aCwgKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBpZighZXJyKXtcbiAgICAgICAgICAgICAgICB0aGlzLl9fZ2V0TGF0ZXN0VmVyc2lvbk5hbWVPZkZpbGUoZmlsZVBhdGgsIChlcnIsIGZpbGVWZXJzaW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fX3JlYWRGaWxlKHdyaXRlRmlsZVN0cmVhbSwgcGF0aC5qb2luKGZpbGVQYXRoLCBmaWxlVmVyc2lvbi5mdWxsVmVyc2lvbiksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJObyBmaWxlIGZvdW5kLlwiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgcmVhZFZlcnNpb246IGZ1bmN0aW9uKGZpbGVOYW1lLCBmaWxlVmVyc2lvbiwgd3JpdGVGaWxlU3RyZWFtLCBjYWxsYmFjaykge1xuICAgICAgICBpZighdGhpcy5fX3ZlcmlmeUZpbGVOYW1lKGZpbGVOYW1lLCBjYWxsYmFjaykpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IHBhdGguam9pbihyb290Zm9sZGVyLCBmaWxlTmFtZS5zdWJzdHIoMCwgZm9sZGVyTmFtZVNpemUpKTtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgZmlsZU5hbWUsIGZpbGVWZXJzaW9uKTtcbiAgICAgICAgdGhpcy5fX3ZlcmlmeUZpbGVFeGlzdGVuY2UoZmlsZVBhdGgsIChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgaWYoIWVycil7XG4gICAgICAgICAgICAgICAgdGhpcy5fX3JlYWRGaWxlKHdyaXRlRmlsZVN0cmVhbSwgcGF0aC5qb2luKGZpbGVQYXRoKSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcIk5vIGZpbGUgZm91bmQuXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBnZXRWZXJzaW9uc0ZvckZpbGU6IGZ1bmN0aW9uIChmaWxlTmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0aGlzLl9fdmVyaWZ5RmlsZU5hbWUoZmlsZU5hbWUsIGNhbGxiYWNrKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IHBhdGguam9pbihyb290Zm9sZGVyLCBmaWxlTmFtZS5zdWJzdHIoMCwgZm9sZGVyTmFtZVNpemUpLCBmaWxlTmFtZSk7XG4gICAgICAgIGZzLnJlYWRkaXIoZm9sZGVyUGF0aCwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgdG90YWxOdW1iZXJPZkZpbGVzID0gZmlsZXMubGVuZ3RoO1xuICAgICAgICAgICAgY29uc3QgZmlsZXNEYXRhID0gW107XG5cbiAgICAgICAgICAgIGxldCByZXNvbHZlZEZpbGVzID0gMDtcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3RhbE51bWJlck9mRmlsZXM7ICsraSkge1xuICAgICAgICAgICAgICAgIGZzLnN0YXQocGF0aC5qb2luKGZvbGRlclBhdGgsIGZpbGVzW2ldKSwgKGVyciwgc3RhdHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXNEYXRhLnB1c2goe3ZlcnNpb246IGZpbGVzW2ldLCBjcmVhdGlvblRpbWU6IG51bGwsIGNyZWF0aW9uVGltZU1zOiBudWxsfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmaWxlc0RhdGEucHVzaCh7dmVyc2lvbjogZmlsZXNbaV0sIGNyZWF0aW9uVGltZTogc3RhdHMuYmlydGh0aW1lLCBjcmVhdGlvblRpbWVNczogc3RhdHMuYmlydGh0aW1lTXN9KTtcblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlZEZpbGVzICs9IDE7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc29sdmVkRmlsZXMgPj0gdG90YWxOdW1iZXJPZkZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlc0RhdGEuc29ydCgoZmlyc3QsIHNlY29uZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0Q29tcGFyZURhdGEgPSBmaXJzdC5jcmVhdGlvblRpbWVNcyB8fCBmaXJzdC52ZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlY29uZENvbXBhcmVEYXRhID0gc2Vjb25kLmNyZWF0aW9uVGltZU1zIHx8IHNlY29uZC52ZXJzaW9uO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpcnN0Q29tcGFyZURhdGEgLSBzZWNvbmRDb21wYXJlRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHVuZGVmaW5lZCwgZmlsZXNEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGNvbXBhcmVWZXJzaW9uczogZnVuY3Rpb24oYm9keVN0cmVhbSwgY2FsbGJhY2spIHtcbiAgICAgICAgbGV0IGJvZHkgPSAnJztcblxuICAgICAgICBib2R5U3RyZWFtLm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgIGJvZHkgKz0gZGF0YTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgYm9keVN0cmVhbS5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgYm9keSA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgICAgICB0aGlzLl9fY29tcGFyZVZlcnNpb25zKGJvZHksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlKTtcbiAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIF9fdmVyaWZ5RmlsZU5hbWU6IGZ1bmN0aW9uKGZpbGVOYW1lLCBjYWxsYmFjayl7XG4gICAgICAgIGlmKCFmaWxlTmFtZSB8fCB0eXBlb2YgZmlsZU5hbWUgIT0gXCJzdHJpbmdcIil7XG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJObyBmaWxlSWQgc3BlY2lmaWVkLlwiKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZihmaWxlTmFtZS5sZW5ndGggPCBmb2xkZXJOYW1lU2l6ZSl7XG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJGaWxlSWQgdG9vIHNtYWxsLiBcIitmaWxlTmFtZSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBfX2Vuc3VyZUZvbGRlclN0cnVjdHVyZTogZnVuY3Rpb24oZm9sZGVyLCBjYWxsYmFjayl7XG4gICAgICAgIGZzLm1rZGlyKGZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZX0sICBjYWxsYmFjayk7XG4gICAgfSxcbiAgICBfX3dyaXRlRmlsZTogZnVuY3Rpb24ocmVhZFN0cmVhbSwgZm9sZGVyUGF0aCwgZmlsZU5hbWUsIGNhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5fX2dldE5leHRWZXJzaW9uRmlsZU5hbWUoZm9sZGVyUGF0aCwgZmlsZU5hbWUsIChlcnIsIG5leHRWZXJzaW9uRmlsZU5hbWUpID0+IHtcbiAgICAgICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgaGFzaCA9IG5ldyBQc2tIYXNoKCk7XG4gICAgICAgICAgICByZWFkU3RyZWFtLm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBoYXNoLnVwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCBuZXh0VmVyc2lvbkZpbGVOYW1lLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlUGF0aCwge21vZGU6MG80NDR9KTtcblxuICAgICAgICAgICAgd3JpdGVTdHJlYW0ub24oXCJmaW5pc2hcIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc2hEaWdlc3QgPSBoYXNoLmRpZ2VzdCgpLnRvU3RyaW5nKCdoZXgnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdQYXRoID0gZmlsZVBhdGggKyBGSUxFX1NFUEFSQVRPUiArIGhhc2hEaWdlc3Q7XG4gICAgICAgICAgICAgICAgZnMucmVuYW1lKGZpbGVQYXRoLCBuZXdQYXRoLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgd3JpdGVTdHJlYW0ub24oXCJlcnJvclwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0d3JpdGVTdHJlYW0uY2xvc2UoKTtcblx0XHRcdFx0cmVhZFN0cmVhbS5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmVhZFN0cmVhbS5waXBlKHdyaXRlU3RyZWFtKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBfX2dldE5leHRWZXJzaW9uRmlsZU5hbWU6IGZ1bmN0aW9uIChmb2xkZXJQYXRoLCBmaWxlTmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5fX2dldExhdGVzdFZlcnNpb25OYW1lT2ZGaWxlKGZvbGRlclBhdGgsIChlcnIsIGZpbGVWZXJzaW9uKSA9PiB7XG4gICAgICAgICAgICBpZihlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgZmlsZVZlcnNpb24ubnVtZXJpY1ZlcnNpb24gKyAxKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBfX2dldExhdGVzdFZlcnNpb25OYW1lT2ZGaWxlOiBmdW5jdGlvbiAoZm9sZGVyUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgZnMucmVhZGRpcihmb2xkZXJQYXRoLCAoZXJyLCBmaWxlcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGZpbGVWZXJzaW9uID0ge251bWVyaWNWZXJzaW9uOiAwLCBmdWxsVmVyc2lvbjogJzAnICsgRklMRV9TRVBBUkFUT1J9O1xuXG4gICAgICAgICAgICBpZihmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWxsVmVyc2lvbnMgPSBmaWxlcy5tYXAoKGZpbGUpID0+IGZpbGUuc3BsaXQoRklMRV9TRVBBUkFUT1IpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGF0ZXN0RmlsZSA9IHRoaXMuX19tYXhFbGVtZW50KGFsbFZlcnNpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgZmlsZVZlcnNpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBudW1lcmljVmVyc2lvbjogcGFyc2VJbnQobGF0ZXN0RmlsZSksXG4gICAgICAgICAgICAgICAgICAgICAgICBmdWxsVmVyc2lvbjogZmlsZXMuZmlsdGVyKChmaWxlKSA9PiBmaWxlLnNwbGl0KEZJTEVfU0VQQVJBVE9SKVswXSA9PT0gbGF0ZXN0RmlsZS50b1N0cmluZygpKVswXVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBlLmNvZGUgPSAnaW52YWxpZF9maWxlX25hbWVfZm91bmQnO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGZpbGVWZXJzaW9uKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBfX21heEVsZW1lbnQ6IGZ1bmN0aW9uIChudW1iZXJzKSB7XG4gICAgICAgIGxldCBtYXggPSBudW1iZXJzWzBdO1xuXG4gICAgICAgIGZvcihsZXQgaSA9IDE7IGkgPCBudW1iZXJzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBtYXggPSBNYXRoLm1heChtYXgsIG51bWJlcnNbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoaXNOYU4obWF4KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGVsZW1lbnQgZm91bmQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtYXg7XG4gICAgfSxcbiAgICBfX2NvbXBhcmVWZXJzaW9uczogZnVuY3Rpb24gKGZpbGVzLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBmaWxlc1dpdGhDaGFuZ2VzID0gW107XG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBPYmplY3QuZW50cmllcyhmaWxlcyk7XG4gICAgICAgIGxldCByZW1haW5pbmcgPSBlbnRyaWVzLmxlbmd0aDtcblxuICAgICAgICBpZihlbnRyaWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBmaWxlc1dpdGhDaGFuZ2VzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGVudHJpZXMuZm9yRWFjaCgoWyBmaWxlTmFtZSwgZmlsZUhhc2ggXSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5nZXRWZXJzaW9uc0ZvckZpbGUoZmlsZU5hbWUsIChlcnIsIHZlcnNpb25zKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBpZihlcnIuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb25zID0gW107XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSB2ZXJzaW9ucy5zb21lKCh2ZXJzaW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhc2ggPSB2ZXJzaW9uLnZlcnNpb24uc3BsaXQoRklMRV9TRVBBUkFUT1IpWzFdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFzaCA9PT0gZmlsZUhhc2g7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVzV2l0aENoYW5nZXMucHVzaChmaWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKC0tcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayh1bmRlZmluZWQsIGZpbGVzV2l0aENoYW5nZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIF9fcmVhZEZpbGU6IGZ1bmN0aW9uKHdyaXRlRmlsZVN0cmVhbSwgZmlsZVBhdGgsIGNhbGxiYWNrKXtcbiAgICAgICAgY29uc3QgcmVhZFN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0oZmlsZVBhdGgpO1xuXG4gICAgICAgIHdyaXRlRmlsZVN0cmVhbS5vbihcImZpbmlzaFwiLCBjYWxsYmFjayk7XG4gICAgICAgIHdyaXRlRmlsZVN0cmVhbS5vbihcImVycm9yXCIsIGNhbGxiYWNrKTtcblxuICAgICAgICByZWFkU3RyZWFtLnBpcGUod3JpdGVGaWxlU3RyZWFtKTtcbiAgICB9LFxuICAgIF9fcHJvZ3Jlc3M6IGZ1bmN0aW9uKGVyciwgcmVzdWx0KXtcbiAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgX192ZXJpZnlGaWxlRXhpc3RlbmNlOiBmdW5jdGlvbihmaWxlUGF0aCwgY2FsbGJhY2spe1xuICAgICAgICBmcy5zdGF0KGZpbGVQYXRoLCBjYWxsYmFjayk7XG4gICAgfVxufSk7IiwiY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5jb25zdCBmb2xkZXJNUSA9IHJlcXVpcmUoXCJmb2xkZXJtcVwiKTtcblxubGV0IHJvb3Rmb2xkZXI7XG5jb25zdCBjaGFubmVscyA9IHt9O1xuXG5mdW5jdGlvbiBzdG9yZUNoYW5uZWwoaWQsIGNoYW5uZWwsIGNsaWVudENvbnN1bWVyKXtcblx0dmFyIHN0b3JlZENoYW5uZWwgPSB7XG5cdFx0Y2hhbm5lbDogY2hhbm5lbCxcblx0XHRoYW5kbGVyOiBjaGFubmVsLmdldEhhbmRsZXIoKSxcblx0XHRtcUNvbnN1bWVyOiBudWxsLFxuXHRcdGNvbnN1bWVyczpbXVxuXHR9O1xuXG5cdGlmKCFjaGFubmVsc1tpZF0pe1xuXHRcdGNoYW5uZWxzW2lkXSA9IHN0b3JlZENoYW5uZWw7XG5cdH1cblxuXHRpZihjbGllbnRDb25zdW1lcil7XG5cdFx0c3RvcmVkQ2hhbm5lbCA9IGNoYW5uZWxzW2lkXTtcblx0XHRjaGFubmVsc1tpZF0uY29uc3VtZXJzLnB1c2goY2xpZW50Q29uc3VtZXIpO1xuXHR9XG5cblx0cmV0dXJuIHN0b3JlZENoYW5uZWw7XG59XG5cblxuZnVuY3Rpb24gcmVnaXN0ZXJDb25zdW1lcihpZCwgY29uc3VtZXIpe1xuXHRjb25zdCBzdG9yZWRDaGFubmVsID0gY2hhbm5lbHNbaWRdO1xuXHRpZihzdG9yZWRDaGFubmVsKXtcblx0XHRzdG9yZWRDaGFubmVsLmNvbnN1bWVycy5wdXNoKGNvbnN1bWVyKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRyZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGRlbGl2ZXJUb0NvbnN1bWVycyhjb25zdW1lcnMsIGVyciwgcmVzdWx0LCBjb25maXJtYXRpb25JZCl7XG5cdGlmKCFjb25zdW1lcnMpe1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuICAgIGxldCBkZWxpdmVyZWRNZXNzYWdlcyA9IDA7XG4gICAgd2hpbGUoY29uc3VtZXJzLmxlbmd0aD4wKXtcbiAgICAgICAgLy93ZSBpdGVyYXRlIHRocm91Z2ggdGhlIGNvbnN1bWVycyBsaXN0IGluIGNhc2UgdGhhdCB3ZSBoYXZlIGEgcmVmLiBvZiBhIHJlcXVlc3QgdGhhdCB0aW1lLW91dGVkIG1lYW53aGlsZVxuICAgICAgICAvL2FuZCBpbiB0aGlzIGNhc2Ugd2UgZXhwZWN0IHRvIGhhdmUgbW9yZSB0aGVuIG9uZSBjb25zdW1lci4uLlxuICAgICAgICBjb25zdCBjb25zdW1lciA9IGNvbnN1bWVycy5wb3AoKTtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgY29uc3VtZXIoZXJyLCByZXN1bHQsIGNvbmZpcm1hdGlvbklkKTtcbiAgICAgICAgICAgIGRlbGl2ZXJlZE1lc3NhZ2VzKys7XG4gICAgICAgIH1jYXRjaChlcnJvcil7XG4gICAgICAgICAgICAvL2p1c3Qgc29tZSBzbWFsbCBlcnJvciBpZ25vcmVkXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIGNhdGNoZWRcIiwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAhIWRlbGl2ZXJlZE1lc3NhZ2VzO1xufVxuXG5mdW5jdGlvbiByZWdpc3Rlck1haW5Db25zdW1lcihpZCl7XG5cdGNvbnN0IHN0b3JlZENoYW5uZWwgPSBjaGFubmVsc1tpZF07XG5cdGlmKHN0b3JlZENoYW5uZWwgJiYgIXN0b3JlZENoYW5uZWwubXFDb25zdW1lcil7XG5cdFx0c3RvcmVkQ2hhbm5lbC5tcUNvbnN1bWVyID0gKGVyciwgcmVzdWx0LCBjb25maXJtYXRpb25JZCkgPT4ge1xuXHRcdFx0Y2hhbm5lbHNbaWRdID0gbnVsbDtcblx0XHRcdGRlbGl2ZXJUb0NvbnN1bWVycyhzdG9yZWRDaGFubmVsLmNvbnN1bWVycywgZXJyLCByZXN1bHQsIGNvbmZpcm1hdGlvbklkKTtcblx0XHRcdC8qd2hpbGUoc3RvcmVkQ2hhbm5lbC5jb25zdW1lcnMubGVuZ3RoPjApe1xuXHRcdFx0XHQvL3dlIGl0ZXJhdGUgdGhyb3VnaCB0aGUgY29uc3VtZXJzIGxpc3QgaW4gY2FzZSB0aGF0IHdlIGhhdmUgYSByZWYuIG9mIGEgcmVxdWVzdCB0aGF0IHRpbWUtb3V0ZWQgbWVhbndoaWxlXG5cdFx0XHRcdC8vYW5kIGluIHRoaXMgY2FzZSB3ZSBleHBlY3QgdG8gaGF2ZSBtb3JlIHRoZW4gb25lIGNvbnN1bWVyLi4uXG5cdFx0XHRcdGxldCBjb25zdW1lciA9IHN0b3JlZENoYW5uZWwuY29uc3VtZXJzLnBvcCgpO1xuXHRcdFx0XHR0cnl7XG5cdFx0XHRcdFx0Y29uc3VtZXIoZXJyLCByZXN1bHQsIGNvbmZpcm1hdGlvbklkKTtcblx0XHRcdFx0fWNhdGNoKGVycm9yKXtcblx0XHRcdFx0XHQvL2p1c3Qgc29tZSBzbWFsbCBlcnJvciBpZ25vcmVkXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJFcnJvciBjYXRjaGVkXCIsIGVycm9yKTtcblx0XHRcdFx0fVxuXHRcdFx0fSovXG5cdFx0fTtcblxuXHRcdHN0b3JlZENoYW5uZWwuY2hhbm5lbC5yZWdpc3RlckNvbnN1bWVyKHN0b3JlZENoYW5uZWwubXFDb25zdW1lciwgZmFsc2UsICgpID0+ICEhY2hhbm5lbHNbaWRdKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRyZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHJlYWRTd2FybUZyb21TdHJlYW0oc3RyZWFtLCBjYWxsYmFjayl7XG4gICAgbGV0IHN3YXJtID0gXCJcIjtcbiAgICBzdHJlYW0ub24oJ2RhdGEnLCAoY2h1bmspID0+e1xuICAgICAgICBzd2FybSArPSBjaHVuaztcblx0fSk7XG5cbiAgICBzdHJlYW0ub24oXCJlbmRcIiwgKCkgPT4ge1xuICAgICAgIGNhbGxiYWNrKG51bGwsIHN3YXJtKTtcblx0fSk7XG5cbiAgICBzdHJlYW0ub24oXCJlcnJvclwiLCAoZXJyKSA9PntcbiAgICAgICAgY2FsbGJhY2soZXJyKTtcblx0fSk7XG59XG5cbiQkLmZsb3cuZGVzY3JpYmUoXCJSZW1vdGVTd2FybWluZ1wiLCB7XG5cdGluaXQ6IGZ1bmN0aW9uKHJvb3RGb2xkZXIsIGNhbGxiYWNrKXtcblx0XHRpZighcm9vdEZvbGRlcil7XG5cdFx0XHRjYWxsYmFjayhuZXcgRXJyb3IoXCJObyByb290IGZvbGRlciBzcGVjaWZpZWQhXCIpKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0cm9vdEZvbGRlciA9IHBhdGgucmVzb2x2ZShyb290Rm9sZGVyKTtcblx0XHRmcy5ta2Rpcihyb290Rm9sZGVyLCB7cmVjdXJzaXZlOiB0cnVlfSwgZnVuY3Rpb24oZXJyLCBwYXRoKXtcblx0XHRcdHJvb3Rmb2xkZXIgPSByb290Rm9sZGVyO1xuXG5cdFx0XHRpZighZXJyKXtcblx0XHRcdFx0ZnMucmVhZGRpcihyb290Zm9sZGVyLCAoY2xlYW5FcnIsIGZpbGVzKSA9PiB7XG5cdFx0XHRcdFx0d2hpbGUoZmlsZXMgJiYgZmlsZXMubGVuZ3RoID4gMCl7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIlJvb3QgZm9sZGVyIGZvdW5kIHRvIGhhdmUgc29tZSBkaXJzLiBTdGFydCBjbGVhbmluZyBlbXB0eSBkaXJzLlwiKTtcblx0XHRcdFx0XHRcdGxldCBkaXIgPSBmaWxlcy5wb3AoKTtcblx0XHRcdFx0XHRcdHRyeXtcblx0XHRcdFx0XHRcdFx0Y29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xuXHRcdFx0XHRcdFx0XHRkaXIgPSBwYXRoLmpvaW4ocm9vdEZvbGRlciwgZGlyKTtcblx0XHRcdFx0XHRcdFx0dmFyIGNvbnRlbnQgPSBmcy5yZWFkZGlyU3luYyhkaXIpO1xuXHRcdFx0XHRcdFx0XHRpZihjb250ZW50ICYmIGNvbnRlbnQubGVuZ3RoID09PSAwKXtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIlJlbW92aW5nIGVtcHR5IGRpclwiLCBkaXIpO1xuXHRcdFx0XHRcdFx0XHRcdGZzLnJtZGlyU3luYyhkaXIpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9Y2F0Y2goZXJyKXtcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjYWxsYmFjayhjbGVhbkVyciwgcm9vdEZvbGRlcik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIsIHJvb3RGb2xkZXIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHRzdGFydFN3YXJtOiBmdW5jdGlvbiAoY2hhbm5lbElkLCBzd2FybVNlcmlhbGl6YXRpb24sIGNhbGxiYWNrKSB7XG5cdFx0bGV0IGNoYW5uZWwgPSBjaGFubmVsc1tjaGFubmVsSWRdO1xuXHRcdGlmICghY2hhbm5lbCkge1xuXHRcdFx0Y29uc3QgY2hhbm5lbEZvbGRlciA9IHBhdGguam9pbihyb290Zm9sZGVyLCBjaGFubmVsSWQpO1xuXHRcdFx0bGV0IHN0b3JlZENoYW5uZWw7XG5cdFx0XHRjaGFubmVsID0gZm9sZGVyTVEuY3JlYXRlUXVlKGNoYW5uZWxGb2xkZXIsIChlcnIsIHJlc3VsdCkgPT4ge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0Ly93ZSBkZWxldGUgdGhlIGNoYW5uZWwgaW4gb3JkZXIgdG8gdHJ5IGFnYWluIG5leHQgdGltZVxuXHRcdFx0XHRcdGNoYW5uZWxzW2NoYW5uZWxJZF0gPSBudWxsO1xuXHRcdFx0XHRcdGNhbGxiYWNrKG5ldyBFcnJvcihcIkNoYW5uZWwgaW5pdGlhbGl6YXRpb24gZmFpbGVkXCIpKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsZXQgc2VudCA9IGZhbHNlO1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHNlbnQgPSBkZWxpdmVyVG9Db25zdW1lcnMoY2hhbm5lbC5jb25zdW1lcnMsIG51bGwsIEpTT04ucGFyc2Uoc3dhcm1TZXJpYWxpemF0aW9uKSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIXNlbnQpIHtcblx0XHRcdFx0XHRzdG9yZWRDaGFubmVsLmhhbmRsZXIuc2VuZFN3YXJtU2VyaWFsaXphdGlvbihzd2FybVNlcmlhbGl6YXRpb24sIGNhbGxiYWNrKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgc3dhcm1TZXJpYWxpemF0aW9uKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9KTtcblx0XHRcdHN0b3JlZENoYW5uZWwgPSBzdG9yZUNoYW5uZWwoY2hhbm5lbElkLCBjaGFubmVsKTtcblx0XHR9IGVsc2Uge1xuXG5cdFx0XHRsZXQgc2VudCA9IGZhbHNlO1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0c2VudCA9IGRlbGl2ZXJUb0NvbnN1bWVycyhjaGFubmVsLmNvbnN1bWVycywgbnVsbCwgSlNPTi5wYXJzZShzd2FybVNlcmlhbGl6YXRpb24pKTtcblx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIXNlbnQpIHtcblx0XHRcdFx0Y2hhbm5lbC5oYW5kbGVyLnNlbmRTd2FybVNlcmlhbGl6YXRpb24oc3dhcm1TZXJpYWxpemF0aW9uLCBjYWxsYmFjayk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgc3dhcm1TZXJpYWxpemF0aW9uKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdGNvbmZpcm1Td2FybTogZnVuY3Rpb24oY2hhbm5lbElkLCBjb25maXJtYXRpb25JZCwgY2FsbGJhY2spe1xuXHRcdGlmKCFjb25maXJtYXRpb25JZCl7XG5cdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBzdG9yZWRDaGFubmVsID0gY2hhbm5lbHNbY2hhbm5lbElkXTtcblx0XHRpZighc3RvcmVkQ2hhbm5lbCl7XG5cdFx0XHRjb25zdCBjaGFubmVsRm9sZGVyID0gcGF0aC5qb2luKHJvb3Rmb2xkZXIsIGNoYW5uZWxJZCk7XG5cdFx0XHRjb25zdCBjaGFubmVsID0gZm9sZGVyTVEuY3JlYXRlUXVlKGNoYW5uZWxGb2xkZXIsIChlcnIsIHJlc3VsdCkgPT4ge1xuXHRcdFx0XHRpZihlcnIpe1xuXHRcdFx0XHRcdC8vd2UgZGVsZXRlIHRoZSBjaGFubmVsIGluIG9yZGVyIHRvIHRyeSBhZ2FpbiBuZXh0IHRpbWVcblx0XHRcdFx0XHRjaGFubmVsc1tjaGFubmVsSWRdID0gbnVsbDtcblx0XHRcdFx0XHRjYWxsYmFjayhuZXcgRXJyb3IoXCJDaGFubmVsIGluaXRpYWxpemF0aW9uIGZhaWxlZFwiKSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNoYW5uZWwudW5saW5rQ29udGVudChjb25maXJtYXRpb25JZCwgY2FsbGJhY2spO1xuXHRcdFx0fSk7XG5cdFx0fWVsc2V7XG5cdFx0XHRzdG9yZWRDaGFubmVsLmNoYW5uZWwudW5saW5rQ29udGVudChjb25maXJtYXRpb25JZCwgY2FsbGJhY2spO1xuXHRcdH1cblx0fSxcblx0d2FpdEZvclN3YXJtOiBmdW5jdGlvbihjaGFubmVsSWQsIHdyaXRlU3dhcm1TdHJlYW0sIGNhbGxiYWNrKXtcblx0XHRsZXQgY2hhbm5lbCA9IGNoYW5uZWxzW2NoYW5uZWxJZF07XG5cdFx0aWYoIWNoYW5uZWwpe1xuXHRcdFx0Y29uc3QgY2hhbm5lbEZvbGRlciA9IHBhdGguam9pbihyb290Zm9sZGVyLCBjaGFubmVsSWQpO1xuXHRcdFx0Y2hhbm5lbCA9IGZvbGRlck1RLmNyZWF0ZVF1ZShjaGFubmVsRm9sZGVyLCAoZXJyLCByZXN1bHQpID0+IHtcblx0XHRcdFx0aWYoZXJyKXtcblx0XHRcdFx0XHQvL3dlIGRlbGV0ZSB0aGUgY2hhbm5lbCBpbiBvcmRlciB0byB0cnkgYWdhaW4gbmV4dCB0aW1lXG5cdFx0XHRcdFx0Y2hhbm5lbHNbY2hhbm5lbElkXSA9IG51bGw7XG5cdFx0XHRcdFx0Y2FsbGJhY2sobmV3IEVycm9yKFwiQ2hhbm5lbCBpbml0aWFsaXphdGlvbiBmYWlsZWRcIiksIHt9KTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYoIXJlZ2lzdGVyQ29uc3VtZXIoY2hhbm5lbElkLCBjYWxsYmFjaykpe1xuXHRcdFx0XHRcdGNhbGxiYWNrKG5ldyBFcnJvcihcIlJlZ2lzdGVyaW5nIGNvbnN1bWVyIGZhaWxlZCFcIiksIHt9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZWdpc3Rlck1haW5Db25zdW1lcihjaGFubmVsSWQpO1xuXHRcdFx0fSk7XG5cdFx0XHRzdG9yZUNoYW5uZWwoY2hhbm5lbElkLCBjaGFubmVsKTtcblx0XHR9ZWxzZXtcblx0XHRcdC8vY2hhbm5lbC5jaGFubmVsLnJlZ2lzdGVyQ29uc3VtZXIoY2FsbGJhY2spO1xuICAgICAgICAgICAgaWYoIXJlZ2lzdGVyQ29uc3VtZXIoY2hhbm5lbElkLCBjYWxsYmFjaykpe1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihcIlJlZ2lzdGVyaW5nIGNvbnN1bWVyIGZhaWxlZCFcIiksIHt9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlZ2lzdGVyTWFpbkNvbnN1bWVyKGNoYW5uZWxJZCk7XG5cdFx0fVxuXHR9XG59KTtcbiIsIi8qKlxuICogQW4gaW1wbGVtZW50YXRpb24gb2YgdGhlIFRva2VuIGJ1Y2tldCBhbGdvcml0aG1cbiAqIEBwYXJhbSBzdGFydFRva2VucyAtIG1heGltdW0gbnVtYmVyIG9mIHRva2VucyBwb3NzaWJsZSB0byBvYnRhaW4gYW5kIHRoZSBkZWZhdWx0IHN0YXJ0aW5nIHZhbHVlXG4gKiBAcGFyYW0gdG9rZW5WYWx1ZVBlclRpbWUgLSBudW1iZXIgb2YgdG9rZW5zIGdpdmVuIGJhY2sgZm9yIGVhY2ggXCJ1bml0T2ZUaW1lXCJcbiAqIEBwYXJhbSB1bml0T2ZUaW1lIC0gZm9yIGVhY2ggXCJ1bml0T2ZUaW1lXCIgKGluIG1pbGxpc2Vjb25kcykgcGFzc2VkIFwidG9rZW5WYWx1ZVBlclRpbWVcIiBhbW91bnQgb2YgdG9rZW5zIHdpbGwgYmUgZ2l2ZW4gYmFja1xuICogQGNvbnN0cnVjdG9yXG4gKi9cblxuZnVuY3Rpb24gVG9rZW5CdWNrZXQoc3RhcnRUb2tlbnMgPSA2MDAwLCB0b2tlblZhbHVlUGVyVGltZSA9IDEwLCB1bml0T2ZUaW1lID0gMTAwKSB7XG5cbiAgICBpZih0eXBlb2Ygc3RhcnRUb2tlbnMgIT09ICdudW1iZXInIHx8IHR5cGVvZiAgdG9rZW5WYWx1ZVBlclRpbWUgIT09ICdudW1iZXInIHx8IHR5cGVvZiB1bml0T2ZUaW1lICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FsbCBwYXJhbWV0ZXJzIG11c3QgYmUgb2YgdHlwZSBudW1iZXInKTtcbiAgICB9XG5cbiAgICBpZihpc05hTihzdGFydFRva2VucykgfHwgaXNOYU4odG9rZW5WYWx1ZVBlclRpbWUpIHx8IGlzTmFOKHVuaXRPZlRpbWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQWxsIHBhcmFtZXRlcnMgbXVzdCBub3QgYmUgTmFOJyk7XG4gICAgfVxuXG4gICAgaWYoc3RhcnRUb2tlbnMgPD0gMCB8fCB0b2tlblZhbHVlUGVyVGltZSA8PSAwIHx8IHVuaXRPZlRpbWUgPD0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FsbCBwYXJhbWV0ZXJzIG11c3QgYmUgYmlnZ2VyIHRoYW4gMCcpO1xuICAgIH1cblxuXG4gICAgVG9rZW5CdWNrZXQucHJvdG90eXBlLkNPU1RfTE9XICAgID0gMTA7ICAvLyBlcXVpdmFsZW50IHRvIDEwb3AvcyB3aXRoIGRlZmF1bHQgdmFsdWVzXG4gICAgVG9rZW5CdWNrZXQucHJvdG90eXBlLkNPU1RfTUVESVVNID0gMTAwOyAvLyBlcXVpdmFsZW50IHRvIDFvcC9zIHdpdGggZGVmYXVsdCB2YWx1ZXNcbiAgICBUb2tlbkJ1Y2tldC5wcm90b3R5cGUuQ09TVF9ISUdIICAgPSA1MDA7IC8vIGVxdWl2YWxlbnQgdG8gMTJvcC9taW51dGUgd2l0aCBkZWZhdWx0IHZhbHVlc1xuXG4gICAgVG9rZW5CdWNrZXQuRVJST1JfTElNSVRfRVhDRUVERUQgID0gJ2Vycm9yX2xpbWl0X2V4Y2VlZGVkJztcbiAgICBUb2tlbkJ1Y2tldC5FUlJPUl9CQURfQVJHVU1FTlQgICAgPSAnZXJyb3JfYmFkX2FyZ3VtZW50JztcblxuXG5cbiAgICBjb25zdCBsaW1pdHMgPSB7fTtcblxuICAgIGZ1bmN0aW9uIHRha2VUb2tlbih1c2VyS2V5LCBjb3N0LCBjYWxsYmFjayA9ICgpID0+IHt9KSB7XG4gICAgICAgIGlmKHR5cGVvZiBjb3N0ICE9PSAnbnVtYmVyJyB8fCBpc05hTihjb3N0KSB8fCBjb3N0IDw9IDAgfHwgY29zdCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKFRva2VuQnVja2V0LkVSUk9SX0JBRF9BUkdVTUVOVCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB1c2VyQnVja2V0ID0gbGltaXRzW3VzZXJLZXldO1xuXG4gICAgICAgIGlmICh1c2VyQnVja2V0KSB7XG4gICAgICAgICAgICB1c2VyQnVja2V0LnRva2VucyArPSBjYWxjdWxhdGVSZXR1cm5Ub2tlbnModXNlckJ1Y2tldC50aW1lc3RhbXApO1xuICAgICAgICAgICAgdXNlckJ1Y2tldC50b2tlbnMgLT0gY29zdDtcblxuICAgICAgICAgICAgdXNlckJ1Y2tldC50aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuXG5cblxuICAgICAgICAgICAgaWYgKHVzZXJCdWNrZXQudG9rZW5zIDwgMCkge1xuICAgICAgICAgICAgICAgIHVzZXJCdWNrZXQudG9rZW5zID0gMDtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhUb2tlbkJ1Y2tldC5FUlJPUl9MSU1JVF9FWENFRURFRCwgMCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sodW5kZWZpbmVkLCB1c2VyQnVja2V0LnRva2Vucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsaW1pdHNbdXNlcktleV0gPSBuZXcgTGltaXQoc3RhcnRUb2tlbnMsIERhdGUubm93KCkpO1xuICAgICAgICAgICAgdGFrZVRva2VuKHVzZXJLZXksIGNvc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldExpbWl0QnlDb3N0KGNvc3QpIHtcbiAgICAgICAgaWYoc3RhcnRUb2tlbnMgPT09IDAgfHwgY29zdCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihzdGFydFRva2VucyAvIGNvc3QpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFJlbWFpbmluZ1Rva2VuQnlDb3N0KHRva2VucywgY29zdCkge1xuICAgICAgICBpZih0b2tlbnMgPT09IDAgfHwgY29zdCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcih0b2tlbnMgLyBjb3N0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBMaW1pdChtYXhpbXVtVG9rZW5zLCB0aW1lc3RhbXApIHtcbiAgICAgICAgdGhpcy50b2tlbnMgPSBtYXhpbXVtVG9rZW5zO1xuICAgICAgICB0aGlzLnRpbWVzdGFtcCA9IHRpbWVzdGFtcDtcblxuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2V0IHRva2VucyhudW1iZXJPZlRva2Vucykge1xuICAgICAgICAgICAgICAgIGlmIChudW1iZXJPZlRva2VucyA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyT2ZUb2tlbnMgPSAtMTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAobnVtYmVyT2ZUb2tlbnMgPiBtYXhpbXVtVG9rZW5zKSB7XG4gICAgICAgICAgICAgICAgICAgIG51bWJlck9mVG9rZW5zID0gbWF4aW11bVRva2VucztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzZWxmLnRva2VucyA9IG51bWJlck9mVG9rZW5zO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldCB0b2tlbnMoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYudG9rZW5zO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRpbWVzdGFtcFxuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gY2FsY3VsYXRlUmV0dXJuVG9rZW5zKHRpbWVzdGFtcCkge1xuICAgICAgICBjb25zdCBjdXJyZW50VGltZSA9IERhdGUubm93KCk7XG5cbiAgICAgICAgY29uc3QgZWxhcHNlZFRpbWUgPSBNYXRoLmZsb29yKChjdXJyZW50VGltZSAtIHRpbWVzdGFtcCkgLyB1bml0T2ZUaW1lKTtcblxuICAgICAgICByZXR1cm4gZWxhcHNlZFRpbWUgKiB0b2tlblZhbHVlUGVyVGltZTtcbiAgICB9XG5cbiAgICB0aGlzLnRha2VUb2tlbiAgICAgICAgICAgICAgID0gdGFrZVRva2VuO1xuICAgIHRoaXMuZ2V0TGltaXRCeUNvc3QgICAgICAgICAgPSBnZXRMaW1pdEJ5Q29zdDtcbiAgICB0aGlzLmdldFJlbWFpbmluZ1Rva2VuQnlDb3N0ID0gZ2V0UmVtYWluaW5nVG9rZW5CeUNvc3Q7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVG9rZW5CdWNrZXQ7XG4iLCJjb25zdCBodHRwID0gcmVxdWlyZSgnaHR0cCcpO1xuY29uc3QgdXJsID0gcmVxdWlyZSgndXJsJyk7XG5jb25zdCBzdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKTtcblxuLyoqXG4gKiBXcmFwcyBhIHJlcXVlc3QgYW5kIGF1Z21lbnRzIGl0IHdpdGggYSBcImRvXCIgbWV0aG9kIHRvIG1vZGlmeSBpdCBpbiBhIFwiZmx1ZW50IGJ1aWxkZXJcIiBzdHlsZVxuICogQHBhcmFtIHtzdHJpbmd9IHVybFxuICogQHBhcmFtIHsqfSBib2R5XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUmVxdWVzdCh1cmwsIGJvZHkpIHtcbiAgICB0aGlzLnJlcXVlc3QgPSB7XG4gICAgICAgIG9wdGlvbnM6IHVybCxcbiAgICAgICAgYm9keVxuICAgIH07XG5cbiAgICB0aGlzLmRvID0gZnVuY3Rpb24gKG1vZGlmaWVyKSB7XG4gICAgICAgIG1vZGlmaWVyKHRoaXMucmVxdWVzdCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEh0dHBSZXF1ZXN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0O1xuICAgIH07XG59XG5cblxuLyoqXG4gKiBNb2RpZmllcyByZXF1ZXN0Lm9wdGlvbnMgdG8gY29udGFpbiB0aGUgdXJsIHBhcnNlZCBpbnN0ZWFkIG9mIGFzIHN0cmluZ1xuICogQHBhcmFtIHtPYmplY3R9IHJlcXVlc3QgLSBPYmplY3QgdGhhdCBjb250YWlucyBvcHRpb25zIGFuZCBib2R5XG4gKi9cbmZ1bmN0aW9uIHVybFRvT3B0aW9ucyhyZXF1ZXN0KSB7XG4gICAgY29uc3QgcGFyc2VkVXJsID0gdXJsLnBhcnNlKHJlcXVlc3Qub3B0aW9ucyk7XG5cbiAgICAvLyBUT0RPOiBtb3ZpZSBoZWFkZXJzIGRlY2xhcmF0aW9uIGZyb20gaGVyZVxuICAgIHJlcXVlc3Qub3B0aW9ucyA9IHtcbiAgICAgICAgaG9zdDogcGFyc2VkVXJsLmhvc3RuYW1lLFxuICAgICAgICBwb3J0OiBwYXJzZWRVcmwucG9ydCxcbiAgICAgICAgcGF0aDogcGFyc2VkVXJsLnBhdGhuYW1lLFxuICAgICAgICBoZWFkZXJzOiB7fVxuICAgIH07XG59XG5cblxuLyoqXG4gKiBUcmFuc2Zvcm1zIHRoZSByZXF1ZXN0LmJvZHkgaW4gYSB0eXBlIHRoYXQgY2FuIGJlIHNlbnQgdGhyb3VnaCBuZXR3b3JrIGlmIGl0IGlzIG5lZWRlZFxuICogQHBhcmFtIHtPYmplY3R9IHJlcXVlc3QgLSBPYmplY3QgdGhhdCBjb250YWlucyBvcHRpb25zIGFuZCBib2R5XG4gKi9cbmZ1bmN0aW9uIHNlcmlhbGl6ZUJvZHkocmVxdWVzdCkge1xuICAgIGlmICghcmVxdWVzdC5ib2R5KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBoYW5kbGVyID0ge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICh0YXJnZXQsIG5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBuYW1lIGluIHRhcmdldCA/IHRhcmdldFtuYW1lXSA6IChkYXRhKSA9PiBkYXRhO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGJvZHlTZXJpYWxpemF0aW9uTWFwcGluZyA9IG5ldyBQcm94eSh7XG4gICAgICAgICdPYmplY3QnOiAoZGF0YSkgPT4gSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgfSwgaGFuZGxlcik7XG5cbiAgICByZXF1ZXN0LmJvZHkgPSBib2R5U2VyaWFsaXphdGlvbk1hcHBpbmdbcmVxdWVzdC5ib2R5LmNvbnN0cnVjdG9yLm5hbWVdKHJlcXVlc3QuYm9keSk7XG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZXF1ZXN0IC0gT2JqZWN0IHRoYXQgY29udGFpbnMgb3B0aW9ucyBhbmQgYm9keVxuICovXG5mdW5jdGlvbiBib2R5Q29udGVudExlbmd0aChyZXF1ZXN0KSB7XG4gICAgaWYgKCFyZXF1ZXN0LmJvZHkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChyZXF1ZXN0LmJvZHkuY29uc3RydWN0b3IubmFtZSBpbiBbICdTdHJpbmcnLCAnQnVmZmVyJywgJ0FycmF5QnVmZmVyJyBdKSB7XG4gICAgICAgIHJlcXVlc3Qub3B0aW9ucy5oZWFkZXJzWydDb250ZW50LUxlbmd0aCddID0gQnVmZmVyLmJ5dGVMZW5ndGgocmVxdWVzdC5ib2R5KTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gQ2xpZW50KCkge1xuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHtSZXF1ZXN0fSBjdXN0b21SZXF1ZXN0XG4gICAgICogQHBhcmFtIG1vZGlmaWVycyAtIGFycmF5IG9mIGZ1bmN0aW9ucyB0aGF0IG1vZGlmeSB0aGUgcmVxdWVzdFxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gd2l0aCB1cmwgYW5kIGJvZHkgcHJvcGVydGllc1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlcXVlc3QoY3VzdG9tUmVxdWVzdCwgbW9kaWZpZXJzKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbW9kaWZpZXJzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBjdXN0b21SZXF1ZXN0LmRvKG1vZGlmaWVyc1tpXSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY3VzdG9tUmVxdWVzdC5nZXRIdHRwUmVxdWVzdCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFJlcSh1cmwsIGNvbmZpZywgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgbW9kaWZpZXJzID0gW1xuICAgICAgICAgICAgdXJsVG9PcHRpb25zLFxuICAgICAgICAgICAgKHJlcXVlc3QpID0+IHtyZXF1ZXN0Lm9wdGlvbnMuaGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzIHx8IHt9O31cbiAgICAgICAgXTtcblxuICAgICAgICBjb25zdCBwYWNrZWRSZXF1ZXN0ID0gcmVxdWVzdChuZXcgUmVxdWVzdCh1cmwsIGNvbmZpZy5ib2R5KSwgbW9kaWZpZXJzKTtcbiAgICAgICAgY29uc3QgaHR0cFJlcXVlc3QgPSBodHRwLnJlcXVlc3QocGFja2VkUmVxdWVzdC5vcHRpb25zLCBjYWxsYmFjayk7XG4gICAgICAgIGh0dHBSZXF1ZXN0LmVuZCgpO1xuXG4gICAgICAgIHJldHVybiBodHRwUmVxdWVzdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwb3N0UmVxKHVybCwgY29uZmlnLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBtb2RpZmllcnMgPSBbXG4gICAgICAgICAgICB1cmxUb09wdGlvbnMsXG4gICAgICAgICAgICAocmVxdWVzdCkgPT4ge3JlcXVlc3Qub3B0aW9ucy5tZXRob2QgPSAnUE9TVCc7IH0sXG4gICAgICAgICAgICAocmVxdWVzdCkgPT4ge3JlcXVlc3Qub3B0aW9ucy5oZWFkZXJzID0gY29uZmlnLmhlYWRlcnMgfHwge307IH0sXG4gICAgICAgICAgICBzZXJpYWxpemVCb2R5LFxuICAgICAgICAgICAgYm9keUNvbnRlbnRMZW5ndGhcbiAgICAgICAgXTtcblxuICAgICAgICBjb25zdCBwYWNrZWRSZXF1ZXN0ID0gcmVxdWVzdChuZXcgUmVxdWVzdCh1cmwsIGNvbmZpZy5ib2R5KSwgbW9kaWZpZXJzKTtcbiAgICAgICAgY29uc3QgaHR0cFJlcXVlc3QgPSBodHRwLnJlcXVlc3QocGFja2VkUmVxdWVzdC5vcHRpb25zLCBjYWxsYmFjayk7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5ib2R5IGluc3RhbmNlb2Ygc3RyZWFtLlJlYWRhYmxlKSB7XG4gICAgICAgICAgICBjb25maWcuYm9keS5waXBlKGh0dHBSZXF1ZXN0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGh0dHBSZXF1ZXN0LmVuZChwYWNrZWRSZXF1ZXN0LmJvZHksIGNvbmZpZy5lbmNvZGluZyB8fCAndXRmOCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBodHRwUmVxdWVzdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWxldGVSZXEodXJsLCBjb25maWcsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IG1vZGlmaWVycyA9IFtcbiAgICAgICAgICAgIHVybFRvT3B0aW9ucyxcbiAgICAgICAgICAgIChyZXF1ZXN0KSA9PiB7cmVxdWVzdC5vcHRpb25zLm1ldGhvZCA9ICdERUxFVEUnO30sXG4gICAgICAgICAgICAocmVxdWVzdCkgPT4ge3JlcXVlc3Qub3B0aW9ucy5oZWFkZXJzID0gY29uZmlnLmhlYWRlcnMgfHwge307fSxcbiAgICAgICAgXTtcblxuICAgICAgICBjb25zdCBwYWNrZWRSZXF1ZXN0ID0gcmVxdWVzdChuZXcgUmVxdWVzdCh1cmwsIGNvbmZpZy5ib2R5KSwgbW9kaWZpZXJzKTtcbiAgICAgICAgY29uc3QgaHR0cFJlcXVlc3QgPSBodHRwLnJlcXVlc3QocGFja2VkUmVxdWVzdC5vcHRpb25zLCBjYWxsYmFjayk7XG4gICAgICAgIGh0dHBSZXF1ZXN0LmVuZCgpO1xuXG4gICAgICAgIHJldHVybiBodHRwUmVxdWVzdDtcbiAgICB9XG5cbiAgICB0aGlzLmdldCA9IGdldFJlcTtcbiAgICB0aGlzLnBvc3QgPSBwb3N0UmVxO1xuICAgIHRoaXMuZGVsZXRlID0gZGVsZXRlUmVxO1xufVxuXG4vKipcbiAqIFN3YXAgdGhpcmQgYW5kIHNlY29uZCBwYXJhbWV0ZXIgaWYgb25seSB0d28gYXJlIHByb3ZpZGVkIGFuZCBjb252ZXJ0cyBhcmd1bWVudHMgdG8gYXJyYXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXNcbiAqIEByZXR1cm5zIHtBcnJheX0gLSBhcmd1bWVudHMgYXMgYXJyYXlcbiAqL1xuZnVuY3Rpb24gcGFyYW1ldGVyc1ByZVByb2Nlc3NpbmcocGFyYW1zKSB7XG4gICAgY29uc3QgcmVzID0gW107XG5cbiAgICBpZiAodHlwZW9mIHBhcmFtc1swXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaXJzdCBwYXJhbWV0ZXIgbXVzdCBiZSBhIHN0cmluZyAodXJsKScpO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcnNlZFVybCA9IHVybC5wYXJzZShwYXJhbXNbMF0pO1xuXG4gICAgaWYgKCFwYXJzZWRVcmwuaG9zdG5hbWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaXJzdCBhcmd1bWVudCAodXJsKSBpcyBub3QgdmFsaWQnKTtcbiAgICB9XG5cbiAgICBpZiAocGFyYW1zLmxlbmd0aCA+PSAzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcGFyYW1zWzFdICE9PSAnb2JqZWN0JyB8fCAhcGFyYW1zWzFdKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1doZW4gMyBwYXJhbWV0ZXJzIGFyZSBwcm92aWRlZCB0aGUgc2Vjb25kIHBhcmFtZXRlciBtdXN0IGJlIGEgbm90IG51bGwgb2JqZWN0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIHBhcmFtc1syXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdXaGVuIDMgcGFyYW1ldGVycyBhcmUgcHJvdmlkZWQgdGhlIHRoaXJkIHBhcmFtZXRlciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwYXJhbXMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcGFyYW1zWzFdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1doZW4gMiBwYXJhbWV0ZXJzIGFyZSBwcm92aWRlZCB0aGUgc2Vjb25kIG9uZSBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcmFtc1syXSA9IHBhcmFtc1sxXTtcbiAgICAgICAgcGFyYW1zWzFdID0ge307XG4gICAgfVxuXG4gICAgY29uc3QgcHJvcGVydGllcyA9IE9iamVjdC5rZXlzKHBhcmFtcyk7XG4gICAgZm9yKGxldCBpID0gMCwgbGVuID0gcHJvcGVydGllcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICByZXMucHVzaChwYXJhbXNbcHJvcGVydGllc1tpXV0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG59XG5cbmNvbnN0IGhhbmRsZXIgPSB7XG4gICAgZ2V0KHRhcmdldCwgcHJvcE5hbWUpIHtcbiAgICAgICAgaWYgKCF0YXJnZXRbcHJvcE5hbWVdKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhwcm9wTmFtZSwgXCJOb3QgaW1wbGVtZW50ZWQhXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhcmdzID0gcGFyYW1ldGVyc1ByZVByb2Nlc3NpbmcoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BOYW1lXS5hcHBseSh0YXJnZXQsIGFyZ3MpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgUHJveHkobmV3IENsaWVudCgpLCBoYW5kbGVyKTtcbn07IiwiY29uc3QgcXVlcnlzdHJpbmcgPSByZXF1aXJlKCdxdWVyeXN0cmluZycpO1xuXG5mdW5jdGlvbiBtYXRjaFVybChwYXR0ZXJuLCB1cmwpIHtcblx0Y29uc3QgcmVzdWx0ID0ge1xuXHRcdG1hdGNoOiB0cnVlLFxuXHRcdHBhcmFtczoge30sXG5cdFx0cXVlcnk6IHt9XG5cdH07XG5cblx0Y29uc3QgcXVlcnlQYXJhbWV0ZXJzU3RhcnRJbmRleCA9IHVybC5pbmRleE9mKCc/Jyk7XG5cdGlmKHF1ZXJ5UGFyYW1ldGVyc1N0YXJ0SW5kZXggIT09IC0xKSB7XG5cdFx0Y29uc3QgdXJsUXVlcnlTdHJpbmcgPSB1cmwuc3Vic3RyKHF1ZXJ5UGFyYW1ldGVyc1N0YXJ0SW5kZXggKyAxKTsgLy8gKyAxIHRvIGlnbm9yZSB0aGUgJz8nXG5cdFx0cmVzdWx0LnF1ZXJ5ID0gcXVlcnlzdHJpbmcucGFyc2UodXJsUXVlcnlTdHJpbmcpO1xuXHRcdHVybCA9IHVybC5zdWJzdHIoMCwgcXVlcnlQYXJhbWV0ZXJzU3RhcnRJbmRleCk7XG5cdH1cblxuICAgIGNvbnN0IHBhdHRlcm5Ub2tlbnMgPSBwYXR0ZXJuLnNwbGl0KCcvJyk7XG4gICAgY29uc3QgdXJsVG9rZW5zID0gdXJsLnNwbGl0KCcvJyk7XG5cbiAgICBpZih1cmxUb2tlbnNbdXJsVG9rZW5zLmxlbmd0aCAtIDFdID09PSAnJykge1xuICAgICAgICB1cmxUb2tlbnMucG9wKCk7XG4gICAgfVxuXG4gICAgaWYgKHBhdHRlcm5Ub2tlbnMubGVuZ3RoICE9PSB1cmxUb2tlbnMubGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdC5tYXRjaCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmKHBhdHRlcm5Ub2tlbnNbcGF0dGVyblRva2Vucy5sZW5ndGggLSAxXSA9PT0gJyonKSB7XG4gICAgICAgIHJlc3VsdC5tYXRjaCA9IHRydWU7XG4gICAgICAgIHBhdHRlcm5Ub2tlbnMucG9wKCk7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXR0ZXJuVG9rZW5zLmxlbmd0aCAmJiByZXN1bHQubWF0Y2g7ICsraSkge1xuICAgICAgICBpZiAocGF0dGVyblRva2Vuc1tpXS5zdGFydHNXaXRoKCc6JykpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wYXJhbXNbcGF0dGVyblRva2Vuc1tpXS5zdWJzdHJpbmcoMSldID0gdXJsVG9rZW5zW2ldO1xuICAgICAgICB9IGVsc2UgaWYgKHBhdHRlcm5Ub2tlbnNbaV0gIT09IHVybFRva2Vuc1tpXSkge1xuICAgICAgICAgICAgcmVzdWx0Lm1hdGNoID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpc1RydXRoeSh2YWx1ZSkge1xuICAgIHJldHVybiAhIXZhbHVlO1xuXG59XG5cbmZ1bmN0aW9uIG1ldGhvZE1hdGNoKHBhdHRlcm4sIG1ldGhvZCkge1xuICAgIGlmICghcGF0dGVybiB8fCAhbWV0aG9kKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBwYXR0ZXJuID09PSBtZXRob2Q7XG59XG5cbmZ1bmN0aW9uIE1pZGRsZXdhcmUoKSB7XG4gICAgY29uc3QgcmVnaXN0ZXJlZE1pZGRsZXdhcmVGdW5jdGlvbnMgPSBbXTtcblxuICAgIGZ1bmN0aW9uIHVzZShtZXRob2QsIHVybCwgZm4pIHtcbiAgICAgICAgbWV0aG9kID0gbWV0aG9kID8gbWV0aG9kLnRvTG93ZXJDYXNlKCkgOiB1bmRlZmluZWQ7XG4gICAgICAgIHJlZ2lzdGVyZWRNaWRkbGV3YXJlRnVuY3Rpb25zLnB1c2goe21ldGhvZCwgdXJsLCBmbn0pO1xuICAgIH1cblxuICAgIHRoaXMudXNlID0gZnVuY3Rpb24gKC4uLnBhcmFtcykge1xuXHQgICAgbGV0IGFyZ3MgPSBbIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQgXTtcblxuXHQgICAgc3dpdGNoIChwYXJhbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjYXNlIDA6XG5cdFx0XHRcdHRocm93IEVycm9yKCdVc2UgbWV0aG9kIG5lZWRzIGF0IGxlYXN0IG9uZSBhcmd1bWVudC4nKTtcblx0XHRcdFx0XG4gICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBwYXJhbXNbMF0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ0lmIG9ubHkgb25lIGFyZ3VtZW50IGlzIHByb3ZpZGVkIGl0IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGFyZ3NbMl0gPSBwYXJhbXNbMF07XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHBhcmFtc1swXSAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIHBhcmFtc1sxXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcignSWYgdHdvIGFyZ3VtZW50cyBhcmUgcHJvdmlkZWQgdGhlIGZpcnN0IG9uZSBtdXN0IGJlIGEgc3RyaW5nICh1cmwpIGFuZCB0aGUgc2Vjb25kIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhcmdzWzFdPXBhcmFtc1swXTtcbiAgICAgICAgICAgICAgICBhcmdzWzJdPXBhcmFtc1sxXTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHBhcmFtc1swXSAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIHBhcmFtc1sxXSAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIHBhcmFtc1syXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcignSWYgdGhyZWUgb3IgbW9yZSBhcmd1bWVudHMgYXJlIHByb3ZpZGVkIHRoZSBmaXJzdCBvbmUgbXVzdCBiZSBhIHN0cmluZyAoSFRUUCB2ZXJiKSwgdGhlIHNlY29uZCBhIHN0cmluZyAodXJsKSBhbmQgdGhlIHRoaXJkIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIShbICdnZXQnLCAncG9zdCcsICdwdXQnLCAnZGVsZXRlJywgJ3BhdGNoJywgJ2hlYWQnLCAnY29ubmVjdCcsICdvcHRpb25zJywgJ3RyYWNlJyBdLmluY2x1ZGVzKHBhcmFtc1swXS50b0xvd2VyQ2FzZSgpKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJZiB0aHJlZSBvciBtb3JlIGFyZ3VtZW50cyBhcmUgcHJvdmlkZWQgdGhlIGZpcnN0IG9uZSBtdXN0IGJlIGEgSFRUUCB2ZXJiIGJ1dCBub25lIGNvdWxkIGJlIG1hdGNoZWQnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhcmdzID0gcGFyYW1zO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICB1c2UuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfTtcblxuXG4gICAgLyoqXG4gICAgICogU3RhcnRzIGV4ZWN1dGlvbiBmcm9tIHRoZSBmaXJzdCByZWdpc3RlcmVkIG1pZGRsZXdhcmUgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVxXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc1xuICAgICAqL1xuICAgIHRoaXMuZ28gPSBmdW5jdGlvbiBnbyhyZXEsIHJlcykge1xuICAgICAgICBleGVjdXRlKDAsIHJlcS5tZXRob2QudG9Mb3dlckNhc2UoKSwgcmVxLnVybCwgcmVxLCByZXMpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlcyBhIG1pZGRsZXdhcmUgaWYgaXQgcGFzc2VzIHRoZSBtZXRob2QgYW5kIHVybCB2YWxpZGF0aW9uIGFuZCBjYWxscyB0aGUgbmV4dCBvbmUgd2hlbiBuZWNlc3NhcnlcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBleGVjdXRlKGluZGV4LCBtZXRob2QsIHVybCwgLi4ucGFyYW1zKSB7XG4gICAgICAgIGlmICghcmVnaXN0ZXJlZE1pZGRsZXdhcmVGdW5jdGlvbnNbaW5kZXhdKSB7XG4gICAgICAgICAgICBpZihpbmRleD09PTApe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyBoYW5kbGVycyByZWdpc3RlcmVkIHlldCFcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuXHQgICAgY29uc3QgcmVnaXN0ZXJlZE1ldGhvZCA9IHJlZ2lzdGVyZWRNaWRkbGV3YXJlRnVuY3Rpb25zW2luZGV4XS5tZXRob2Q7XG5cdCAgICBjb25zdCByZWdpc3RlcmVkVXJsID0gcmVnaXN0ZXJlZE1pZGRsZXdhcmVGdW5jdGlvbnNbaW5kZXhdLnVybDtcblx0ICAgIGNvbnN0IGZuID0gcmVnaXN0ZXJlZE1pZGRsZXdhcmVGdW5jdGlvbnNbaW5kZXhdLmZuO1xuXG5cdCAgICBpZiAoIW1ldGhvZE1hdGNoKHJlZ2lzdGVyZWRNZXRob2QsIG1ldGhvZCkpIHtcbiAgICAgICAgICAgIGV4ZWN1dGUoKytpbmRleCwgbWV0aG9kLCB1cmwsIC4uLnBhcmFtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNUcnV0aHkocmVnaXN0ZXJlZFVybCkpIHtcbiAgICAgICAgICAgIGNvbnN0IHVybE1hdGNoID0gbWF0Y2hVcmwocmVnaXN0ZXJlZFVybCwgdXJsKTtcblxuICAgICAgICAgICAgaWYgKCF1cmxNYXRjaC5tYXRjaCkge1xuICAgICAgICAgICAgICAgIGV4ZWN1dGUoKytpbmRleCwgbWV0aG9kLCB1cmwsIC4uLnBhcmFtcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGFyYW1zWzBdKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zWzBdLnBhcmFtcyA9IHVybE1hdGNoLnBhcmFtcztcbiAgICAgICAgICAgICAgICBwYXJhbXNbMF0ucXVlcnkgID0gdXJsTWF0Y2gucXVlcnk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY291bnRlciA9IDA7XG5cbiAgICAgICAgZm4oLi4ucGFyYW1zLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBjb3VudGVyKys7XG4gICAgICAgICAgICBpZiAoY291bnRlciA+IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1lvdSBjYWxsZWQgbmV4dCBtdWx0aXBsZSB0aW1lcywgb25seSB0aGUgZmlyc3Qgb25lIHdpbGwgYmUgZXhlY3V0ZWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBleGVjdXRlKCsraW5kZXgsIG1ldGhvZCwgdXJsLCAuLi5wYXJhbXMpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTWlkZGxld2FyZTtcbiIsImZ1bmN0aW9uIFJvdXRlcihzZXJ2ZXIpIHtcbiAgICB0aGlzLnVzZSA9IGZ1bmN0aW9uIHVzZSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKHNlcnZlcldyYXBwZXIodXJsLCBzZXJ2ZXIpKTtcbiAgICB9O1xufVxuXG5cbmZ1bmN0aW9uIHNlcnZlcldyYXBwZXIoYmFzZVVybCwgc2VydmVyKSB7XG4gICAgaWYgKGJhc2VVcmwuZW5kc1dpdGgoJy8nKSkge1xuICAgICAgICBiYXNlVXJsID0gYmFzZVVybC5zdWJzdHJpbmcoMCwgYmFzZVVybC5sZW5ndGggLSAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB1c2UodXJsLCByZXFSZXNvbHZlcikge1xuICAgICAgICAgICAgc2VydmVyLnVzZShiYXNlVXJsICsgdXJsLCByZXFSZXNvbHZlcik7XG4gICAgICAgIH0sXG4gICAgICAgIGdldCh1cmwsIHJlcVJlc29sdmVyKSB7XG4gICAgICAgICAgICBzZXJ2ZXIuZ2V0KGJhc2VVcmwgKyB1cmwsIHJlcVJlc29sdmVyKTtcbiAgICAgICAgfSxcbiAgICAgICAgcG9zdCh1cmwsIHJlcVJlc29sdmVyKSB7XG4gICAgICAgICAgICBzZXJ2ZXIucG9zdChiYXNlVXJsICsgdXJsLCByZXFSZXNvbHZlcik7XG4gICAgICAgIH0sXG4gICAgICAgIHB1dCh1cmwsIHJlcVJlc29sdmVyKSB7XG4gICAgICAgICAgICBzZXJ2ZXIucHV0KGJhc2VVcmwgKyB1cmwsIHJlcVJlc29sdmVyKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVsZXRlKHVybCwgcmVxUmVzb2x2ZXIpIHtcbiAgICAgICAgICAgIHNlcnZlci5kZWxldGUoYmFzZVVybCArIHVybCwgcmVxUmVzb2x2ZXIpO1xuICAgICAgICB9LFxuICAgICAgICBvcHRpb25zKHVybCwgcmVxUmVzb2x2ZXIpIHtcbiAgICAgICAgICAgIHNlcnZlci5vcHRpb25zKGJhc2VVcmwgKyB1cmwsIHJlcVJlc29sdmVyKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUm91dGVyO1xuIiwiY29uc3QgTWlkZGxld2FyZSA9IHJlcXVpcmUoJy4vTWlkZGxld2FyZScpO1xuY29uc3QgaHR0cCA9IHJlcXVpcmUoJ2h0dHAnKTtcbmNvbnN0IGh0dHBzID0gcmVxdWlyZSgnaHR0cHMnKTtcblxuZnVuY3Rpb24gU2VydmVyKHNzbE9wdGlvbnMpIHtcbiAgICBjb25zdCBtaWRkbGV3YXJlID0gbmV3IE1pZGRsZXdhcmUoKTtcbiAgICBjb25zdCBzZXJ2ZXIgPSBfaW5pdFNlcnZlcihzc2xPcHRpb25zKTtcblxuXG4gICAgdGhpcy5saXN0ZW4gPSBmdW5jdGlvbiBsaXN0ZW4ocG9ydCkge1xuICAgICAgICBzZXJ2ZXIubGlzdGVuKHBvcnQpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdGhpcy51c2UgPSBmdW5jdGlvbiB1c2UodXJsLCBjYWxsYmFjaykge1xuICAgICAgICAvL1RPRE86IGZpbmQgYSBiZXR0ZXIgd2F5XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgIG1pZGRsZXdhcmUudXNlKHVybCwgY2FsbGJhY2spO1xuICAgICAgICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gdXJsO1xuICAgICAgICAgICAgbWlkZGxld2FyZS51c2UoY2FsbGJhY2spO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICBzZXJ2ZXIuY2xvc2UoY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICB0aGlzLmdldCA9IGZ1bmN0aW9uIGdldFJlcShyZXFVcmwsIHJlcVJlc29sdmVyKSB7XG4gICAgICAgIG1pZGRsZXdhcmUudXNlKFwiR0VUXCIsIHJlcVVybCwgcmVxUmVzb2x2ZXIpO1xuICAgIH07XG5cbiAgICB0aGlzLnBvc3QgPSBmdW5jdGlvbiBwb3N0UmVxKHJlcVVybCwgcmVxUmVzb2x2ZXIpIHtcbiAgICAgICAgbWlkZGxld2FyZS51c2UoXCJQT1NUXCIsIHJlcVVybCwgcmVxUmVzb2x2ZXIpO1xuICAgIH07XG5cbiAgICB0aGlzLnB1dCA9IGZ1bmN0aW9uIHB1dFJlcShyZXFVcmwsIHJlcVJlc29sdmVyKSB7XG4gICAgICAgIG1pZGRsZXdhcmUudXNlKFwiUFVUXCIsIHJlcVVybCwgcmVxUmVzb2x2ZXIpO1xuICAgIH07XG5cbiAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uIGRlbGV0ZVJlcShyZXFVcmwsIHJlcVJlc29sdmVyKSB7XG4gICAgICAgIG1pZGRsZXdhcmUudXNlKFwiREVMRVRFXCIsIHJlcVVybCwgcmVxUmVzb2x2ZXIpO1xuICAgIH07XG5cbiAgICB0aGlzLm9wdGlvbnMgPSBmdW5jdGlvbiBvcHRpb25zUmVxKHJlcVVybCwgcmVxUmVzb2x2ZXIpIHtcbiAgICAgICAgbWlkZGxld2FyZS51c2UoXCJPUFRJT05TXCIsIHJlcVVybCwgcmVxUmVzb2x2ZXIpO1xuICAgIH07XG5cblxuICAgIC8qIElOVEVSTkFMIE1FVEhPRFMgKi9cblxuICAgIGZ1bmN0aW9uIF9pbml0U2VydmVyKHNzbENvbmZpZykge1xuICAgICAgICBpZiAoc3NsQ29uZmlnKSB7XG4gICAgICAgICAgICByZXR1cm4gaHR0cHMuY3JlYXRlU2VydmVyKHNzbENvbmZpZywgbWlkZGxld2FyZS5nbyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gaHR0cC5jcmVhdGVTZXJ2ZXIobWlkZGxld2FyZS5nbyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VydmVyOyIsImNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbmZ1bmN0aW9uIHNldERhdGFIYW5kbGVyKHJlcXVlc3QsIGNhbGxiYWNrKSB7XG4gICAgbGV0IGJvZHlDb250ZW50ID0gJyc7XG5cbiAgICByZXF1ZXN0Lm9uKCdkYXRhJywgZnVuY3Rpb24gKGRhdGFDaHVuaykge1xuICAgICAgICBib2R5Q29udGVudCArPSBkYXRhQ2h1bms7XG4gICAgfSk7XG5cbiAgICByZXF1ZXN0Lm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgYm9keUNvbnRlbnQpO1xuICAgIH0pO1xuXG4gICAgcmVxdWVzdC5vbignZXJyb3InLCBjYWxsYmFjayk7XG59XG5cbmZ1bmN0aW9uIHNldERhdGFIYW5kbGVyTWlkZGxld2FyZShyZXF1ZXN0LCByZXNwb25zZSwgbmV4dCkge1xuICAgIGlmIChyZXF1ZXN0LmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddICE9PSAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJykge1xuICAgICAgICBzZXREYXRhSGFuZGxlcihyZXF1ZXN0LCBmdW5jdGlvbiAoZXJyb3IsIGJvZHlDb250ZW50KSB7XG4gICAgICAgICAgICByZXF1ZXN0LmJvZHkgPSBib2R5Q29udGVudDtcbiAgICAgICAgICAgIG5leHQoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV4dCgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc2VuZEVycm9yUmVzcG9uc2UoZXJyb3IsIHJlc3BvbnNlLCBzdGF0dXNDb2RlKSB7XG4gICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9IHN0YXR1c0NvZGU7XG4gICAgcmVzcG9uc2UuZW5kKCk7XG59XG5cbmZ1bmN0aW9uIGJvZHlQYXJzZXIocmVxLCByZXMsIG5leHQpIHtcbiAgICBsZXQgYm9keUNvbnRlbnQgPSAnJztcblxuICAgIHJlcS5vbignZGF0YScsIGZ1bmN0aW9uIChkYXRhQ2h1bmspIHtcbiAgICAgICAgYm9keUNvbnRlbnQgKz0gZGF0YUNodW5rO1xuICAgIH0pO1xuXG4gICAgcmVxLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlcS5ib2R5ID0gYm9keUNvbnRlbnQ7XG4gICAgICAgIG5leHQoKTtcbiAgICB9KTtcblxuICAgIHJlcS5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIG5leHQoZXJyKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc2VydmVTdGF0aWNGaWxlKGJhc2VGb2xkZXIsIGlnbm9yZVBhdGgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwuc3Vic3RyaW5nKGlnbm9yZVBhdGgubGVuZ3RoKTtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4oYmFzZUZvbGRlciwgdXJsKTtcbiAgICAgICAgZnMuc3RhdChmaWxlUGF0aCwgKGVycikgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh1cmwuZW5kc1dpdGgoJy5odG1sJykpIHtcbiAgICAgICAgICAgICAgICByZXMuY29udGVudFR5cGUgPSAndGV4dC9odG1sJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodXJsLmVuZHNXaXRoKCcuY3NzJykpIHtcbiAgICAgICAgICAgICAgICByZXMuY29udGVudFR5cGUgPSAndGV4dC9jc3MnO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1cmwuZW5kc1dpdGgoJy5qcycpKSB7XG4gICAgICAgICAgICAgICAgcmVzLmNvbnRlbnRUeXBlID0gJ3RleHQvamF2YXNjcmlwdCc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGZpbGVTdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKGZpbGVQYXRoKTtcbiAgICAgICAgICAgIGZpbGVTdHJlYW0ucGlwZShyZXMpO1xuXG4gICAgICAgIH0pO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge3NldERhdGFIYW5kbGVyLCBzZXREYXRhSGFuZGxlck1pZGRsZXdhcmUsIHNlbmRFcnJvclJlc3BvbnNlLCBib2R5UGFyc2VyLCBzZXJ2ZVN0YXRpY0ZpbGV9O1xuIiwiY29uc3QgQ2xpZW50ID0gcmVxdWlyZSgnLi9jbGFzc2VzL0NsaWVudCcpO1xuY29uc3QgU2VydmVyID0gcmVxdWlyZSgnLi9jbGFzc2VzL1NlcnZlcicpO1xuY29uc3QgaHR0cFV0aWxzID0gcmVxdWlyZSgnLi9odHRwVXRpbHMnKTtcbmNvbnN0IFJvdXRlciA9IHJlcXVpcmUoJy4vY2xhc3Nlcy9Sb3V0ZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7U2VydmVyLCBDbGllbnQsIGh0dHBVdGlscywgUm91dGVyfTtcblxuIiwiLyohXG4gKiBEZXRlcm1pbmUgaWYgYW4gb2JqZWN0IGlzIGEgQnVmZmVyXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuXG4vLyBUaGUgX2lzQnVmZmVyIGNoZWNrIGlzIGZvciBTYWZhcmkgNS03IHN1cHBvcnQsIGJlY2F1c2UgaXQncyBtaXNzaW5nXG4vLyBPYmplY3QucHJvdG90eXBlLmNvbnN0cnVjdG9yLiBSZW1vdmUgdGhpcyBldmVudHVhbGx5XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIG9iaiAhPSBudWxsICYmIChpc0J1ZmZlcihvYmopIHx8IGlzU2xvd0J1ZmZlcihvYmopIHx8ICEhb2JqLl9pc0J1ZmZlcilcbn1cblxuZnVuY3Rpb24gaXNCdWZmZXIgKG9iaikge1xuICByZXR1cm4gISFvYmouY29uc3RydWN0b3IgJiYgdHlwZW9mIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIob2JqKVxufVxuXG4vLyBGb3IgTm9kZSB2MC4xMCBzdXBwb3J0LiBSZW1vdmUgdGhpcyBldmVudHVhbGx5LlxuZnVuY3Rpb24gaXNTbG93QnVmZmVyIChvYmopIHtcbiAgcmV0dXJuIHR5cGVvZiBvYmoucmVhZEZsb2F0TEUgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIG9iai5zbGljZSA9PT0gJ2Z1bmN0aW9uJyAmJiBpc0J1ZmZlcihvYmouc2xpY2UoMCwgMCkpXG59XG4iLCJ2YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuXG52YXIgQ1JDX1RBQkxFID0gW1xuICAweDAwMDAwMDAwLCAweDc3MDczMDk2LCAweGVlMGU2MTJjLCAweDk5MDk1MWJhLCAweDA3NmRjNDE5LFxuICAweDcwNmFmNDhmLCAweGU5NjNhNTM1LCAweDllNjQ5NWEzLCAweDBlZGI4ODMyLCAweDc5ZGNiOGE0LFxuICAweGUwZDVlOTFlLCAweDk3ZDJkOTg4LCAweDA5YjY0YzJiLCAweDdlYjE3Y2JkLCAweGU3YjgyZDA3LFxuICAweDkwYmYxZDkxLCAweDFkYjcxMDY0LCAweDZhYjAyMGYyLCAweGYzYjk3MTQ4LCAweDg0YmU0MWRlLFxuICAweDFhZGFkNDdkLCAweDZkZGRlNGViLCAweGY0ZDRiNTUxLCAweDgzZDM4NWM3LCAweDEzNmM5ODU2LFxuICAweDY0NmJhOGMwLCAweGZkNjJmOTdhLCAweDhhNjVjOWVjLCAweDE0MDE1YzRmLCAweDYzMDY2Y2Q5LFxuICAweGZhMGYzZDYzLCAweDhkMDgwZGY1LCAweDNiNmUyMGM4LCAweDRjNjkxMDVlLCAweGQ1NjA0MWU0LFxuICAweGEyNjc3MTcyLCAweDNjMDNlNGQxLCAweDRiMDRkNDQ3LCAweGQyMGQ4NWZkLCAweGE1MGFiNTZiLFxuICAweDM1YjVhOGZhLCAweDQyYjI5ODZjLCAweGRiYmJjOWQ2LCAweGFjYmNmOTQwLCAweDMyZDg2Y2UzLFxuICAweDQ1ZGY1Yzc1LCAweGRjZDYwZGNmLCAweGFiZDEzZDU5LCAweDI2ZDkzMGFjLCAweDUxZGUwMDNhLFxuICAweGM4ZDc1MTgwLCAweGJmZDA2MTE2LCAweDIxYjRmNGI1LCAweDU2YjNjNDIzLCAweGNmYmE5NTk5LFxuICAweGI4YmRhNTBmLCAweDI4MDJiODllLCAweDVmMDU4ODA4LCAweGM2MGNkOWIyLCAweGIxMGJlOTI0LFxuICAweDJmNmY3Yzg3LCAweDU4Njg0YzExLCAweGMxNjExZGFiLCAweGI2NjYyZDNkLCAweDc2ZGM0MTkwLFxuICAweDAxZGI3MTA2LCAweDk4ZDIyMGJjLCAweGVmZDUxMDJhLCAweDcxYjE4NTg5LCAweDA2YjZiNTFmLFxuICAweDlmYmZlNGE1LCAweGU4YjhkNDMzLCAweDc4MDdjOWEyLCAweDBmMDBmOTM0LCAweDk2MDlhODhlLFxuICAweGUxMGU5ODE4LCAweDdmNmEwZGJiLCAweDA4NmQzZDJkLCAweDkxNjQ2Yzk3LCAweGU2NjM1YzAxLFxuICAweDZiNmI1MWY0LCAweDFjNmM2MTYyLCAweDg1NjUzMGQ4LCAweGYyNjIwMDRlLCAweDZjMDY5NWVkLFxuICAweDFiMDFhNTdiLCAweDgyMDhmNGMxLCAweGY1MGZjNDU3LCAweDY1YjBkOWM2LCAweDEyYjdlOTUwLFxuICAweDhiYmViOGVhLCAweGZjYjk4ODdjLCAweDYyZGQxZGRmLCAweDE1ZGEyZDQ5LCAweDhjZDM3Y2YzLFxuICAweGZiZDQ0YzY1LCAweDRkYjI2MTU4LCAweDNhYjU1MWNlLCAweGEzYmMwMDc0LCAweGQ0YmIzMGUyLFxuICAweDRhZGZhNTQxLCAweDNkZDg5NWQ3LCAweGE0ZDFjNDZkLCAweGQzZDZmNGZiLCAweDQzNjllOTZhLFxuICAweDM0NmVkOWZjLCAweGFkNjc4ODQ2LCAweGRhNjBiOGQwLCAweDQ0MDQyZDczLCAweDMzMDMxZGU1LFxuICAweGFhMGE0YzVmLCAweGRkMGQ3Y2M5LCAweDUwMDU3MTNjLCAweDI3MDI0MWFhLCAweGJlMGIxMDEwLFxuICAweGM5MGMyMDg2LCAweDU3NjhiNTI1LCAweDIwNmY4NWIzLCAweGI5NjZkNDA5LCAweGNlNjFlNDlmLFxuICAweDVlZGVmOTBlLCAweDI5ZDljOTk4LCAweGIwZDA5ODIyLCAweGM3ZDdhOGI0LCAweDU5YjMzZDE3LFxuICAweDJlYjQwZDgxLCAweGI3YmQ1YzNiLCAweGMwYmE2Y2FkLCAweGVkYjg4MzIwLCAweDlhYmZiM2I2LFxuICAweDAzYjZlMjBjLCAweDc0YjFkMjlhLCAweGVhZDU0NzM5LCAweDlkZDI3N2FmLCAweDA0ZGIyNjE1LFxuICAweDczZGMxNjgzLCAweGUzNjMwYjEyLCAweDk0NjQzYjg0LCAweDBkNmQ2YTNlLCAweDdhNmE1YWE4LFxuICAweGU0MGVjZjBiLCAweDkzMDlmZjlkLCAweDBhMDBhZTI3LCAweDdkMDc5ZWIxLCAweGYwMGY5MzQ0LFxuICAweDg3MDhhM2QyLCAweDFlMDFmMjY4LCAweDY5MDZjMmZlLCAweGY3NjI1NzVkLCAweDgwNjU2N2NiLFxuICAweDE5NmMzNjcxLCAweDZlNmIwNmU3LCAweGZlZDQxYjc2LCAweDg5ZDMyYmUwLCAweDEwZGE3YTVhLFxuICAweDY3ZGQ0YWNjLCAweGY5YjlkZjZmLCAweDhlYmVlZmY5LCAweDE3YjdiZTQzLCAweDYwYjA4ZWQ1LFxuICAweGQ2ZDZhM2U4LCAweGExZDE5MzdlLCAweDM4ZDhjMmM0LCAweDRmZGZmMjUyLCAweGQxYmI2N2YxLFxuICAweGE2YmM1NzY3LCAweDNmYjUwNmRkLCAweDQ4YjIzNjRiLCAweGQ4MGQyYmRhLCAweGFmMGExYjRjLFxuICAweDM2MDM0YWY2LCAweDQxMDQ3YTYwLCAweGRmNjBlZmMzLCAweGE4NjdkZjU1LCAweDMxNmU4ZWVmLFxuICAweDQ2NjliZTc5LCAweGNiNjFiMzhjLCAweGJjNjY4MzFhLCAweDI1NmZkMmEwLCAweDUyNjhlMjM2LFxuICAweGNjMGM3Nzk1LCAweGJiMGI0NzAzLCAweDIyMDIxNmI5LCAweDU1MDUyNjJmLCAweGM1YmEzYmJlLFxuICAweGIyYmQwYjI4LCAweDJiYjQ1YTkyLCAweDVjYjM2YTA0LCAweGMyZDdmZmE3LCAweGI1ZDBjZjMxLFxuICAweDJjZDk5ZThiLCAweDViZGVhZTFkLCAweDliNjRjMmIwLCAweGVjNjNmMjI2LCAweDc1NmFhMzljLFxuICAweDAyNmQ5MzBhLCAweDljMDkwNmE5LCAweGViMGUzNjNmLCAweDcyMDc2Nzg1LCAweDA1MDA1NzEzLFxuICAweDk1YmY0YTgyLCAweGUyYjg3YTE0LCAweDdiYjEyYmFlLCAweDBjYjYxYjM4LCAweDkyZDI4ZTliLFxuICAweGU1ZDViZTBkLCAweDdjZGNlZmI3LCAweDBiZGJkZjIxLCAweDg2ZDNkMmQ0LCAweGYxZDRlMjQyLFxuICAweDY4ZGRiM2Y4LCAweDFmZGE4MzZlLCAweDgxYmUxNmNkLCAweGY2YjkyNjViLCAweDZmYjA3N2UxLFxuICAweDE4Yjc0Nzc3LCAweDg4MDg1YWU2LCAweGZmMGY2YTcwLCAweDY2MDYzYmNhLCAweDExMDEwYjVjLFxuICAweDhmNjU5ZWZmLCAweGY4NjJhZTY5LCAweDYxNmJmZmQzLCAweDE2NmNjZjQ1LCAweGEwMGFlMjc4LFxuICAweGQ3MGRkMmVlLCAweDRlMDQ4MzU0LCAweDM5MDNiM2MyLCAweGE3NjcyNjYxLCAweGQwNjAxNmY3LFxuICAweDQ5Njk0NzRkLCAweDNlNmU3N2RiLCAweGFlZDE2YTRhLCAweGQ5ZDY1YWRjLCAweDQwZGYwYjY2LFxuICAweDM3ZDgzYmYwLCAweGE5YmNhZTUzLCAweGRlYmI5ZWM1LCAweDQ3YjJjZjdmLCAweDMwYjVmZmU5LFxuICAweGJkYmRmMjFjLCAweGNhYmFjMjhhLCAweDUzYjM5MzMwLCAweDI0YjRhM2E2LCAweGJhZDAzNjA1LFxuICAweGNkZDcwNjkzLCAweDU0ZGU1NzI5LCAweDIzZDk2N2JmLCAweGIzNjY3YTJlLCAweGM0NjE0YWI4LFxuICAweDVkNjgxYjAyLCAweDJhNmYyYjk0LCAweGI0MGJiZTM3LCAweGMzMGM4ZWExLCAweDVhMDVkZjFiLFxuICAweDJkMDJlZjhkXG5dO1xuXG5pZiAodHlwZW9mIEludDMyQXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gIENSQ19UQUJMRSA9IG5ldyBJbnQzMkFycmF5KENSQ19UQUJMRSk7XG59XG5cbmZ1bmN0aW9uIG5ld0VtcHR5QnVmZmVyKGxlbmd0aCkge1xuICB2YXIgYnVmZmVyID0gbmV3IEJ1ZmZlcihsZW5ndGgpO1xuICBidWZmZXIuZmlsbCgweDAwKTtcbiAgcmV0dXJuIGJ1ZmZlcjtcbn1cblxuZnVuY3Rpb24gZW5zdXJlQnVmZmVyKGlucHV0KSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoaW5wdXQpKSB7XG4gICAgcmV0dXJuIGlucHV0O1xuICB9XG5cbiAgdmFyIGhhc05ld0J1ZmZlckFQSSA9XG4gICAgICB0eXBlb2YgQnVmZmVyLmFsbG9jID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgIHR5cGVvZiBCdWZmZXIuZnJvbSA9PT0gXCJmdW5jdGlvblwiO1xuXG4gIGlmICh0eXBlb2YgaW5wdXQgPT09IFwibnVtYmVyXCIpIHtcbiAgICByZXR1cm4gaGFzTmV3QnVmZmVyQVBJID8gQnVmZmVyLmFsbG9jKGlucHV0KSA6IG5ld0VtcHR5QnVmZmVyKGlucHV0KTtcbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4gaGFzTmV3QnVmZmVyQVBJID8gQnVmZmVyLmZyb20oaW5wdXQpIDogbmV3IEJ1ZmZlcihpbnB1dCk7XG4gIH1cbiAgZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaW5wdXQgbXVzdCBiZSBidWZmZXIsIG51bWJlciwgb3Igc3RyaW5nLCByZWNlaXZlZCBcIiArXG4gICAgICAgICAgICAgICAgICAgIHR5cGVvZiBpbnB1dCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYnVmZmVyaXplSW50KG51bSkge1xuICB2YXIgdG1wID0gZW5zdXJlQnVmZmVyKDQpO1xuICB0bXAud3JpdGVJbnQzMkJFKG51bSwgMCk7XG4gIHJldHVybiB0bXA7XG59XG5cbmZ1bmN0aW9uIF9jcmMzMihidWYsIHByZXZpb3VzKSB7XG4gIGJ1ZiA9IGVuc3VyZUJ1ZmZlcihidWYpO1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHByZXZpb3VzKSkge1xuICAgIHByZXZpb3VzID0gcHJldmlvdXMucmVhZFVJbnQzMkJFKDApO1xuICB9XG4gIHZhciBjcmMgPSB+fnByZXZpb3VzIF4gLTE7XG4gIGZvciAodmFyIG4gPSAwOyBuIDwgYnVmLmxlbmd0aDsgbisrKSB7XG4gICAgY3JjID0gQ1JDX1RBQkxFWyhjcmMgXiBidWZbbl0pICYgMHhmZl0gXiAoY3JjID4+PiA4KTtcbiAgfVxuICByZXR1cm4gKGNyYyBeIC0xKTtcbn1cblxuZnVuY3Rpb24gY3JjMzIoKSB7XG4gIHJldHVybiBidWZmZXJpemVJbnQoX2NyYzMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cykpO1xufVxuY3JjMzIuc2lnbmVkID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gX2NyYzMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG59O1xuY3JjMzIudW5zaWduZWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBfY3JjMzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKSA+Pj4gMDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY3JjMzI7XG4iLCJjb25zdCBFREZTID0gcmVxdWlyZSgnLi9saWIvRURGUycpO1xuY29uc3QgQ1NCSWRlbnRpZmllciA9IHJlcXVpcmUoXCIuL2xpYi9DU0JJZGVudGlmaWVyXCIpO1xuY29uc3QgRmlsZUhhbmRsZXIgPSByZXF1aXJlKFwiLi9saWIvRmlsZUhhbmRsZXJcIik7XG5tb2R1bGUuZXhwb3J0cy5FREZTID0gRURGUztcbm1vZHVsZS5leHBvcnRzLkNTQklkZW50aWZpZXIgPSBDU0JJZGVudGlmaWVyO1xubW9kdWxlLmV4cG9ydHMuRmlsZUhhbmRsZXIgPSBGaWxlSGFuZGxlcjtcbm1vZHVsZS5leHBvcnRzLkVERlNNaWRkbGV3YXJlID0gcmVxdWlyZShcIi4vRURGU01pZGRsZXdhcmVcIik7XG5cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdFx0XHRcdFx0Y3JlYXRlUXVlOiByZXF1aXJlKFwiLi9saWIvZm9sZGVyTVFcIikuZ2V0Rm9sZGVyUXVldWVcblx0XHRcdFx0XHQvL2ZvbGRlck1ROiByZXF1aXJlKFwiLi9saWIvZm9sZGVyTVFcIilcbn07IiwidmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xudmFyIHN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xudmFyIFJlYWRhYmxlID0gc3RyZWFtLlJlYWRhYmxlO1xudmFyIFdyaXRhYmxlID0gc3RyZWFtLldyaXRhYmxlO1xudmFyIFBhc3NUaHJvdWdoID0gc3RyZWFtLlBhc3NUaHJvdWdoO1xudmFyIFBlbmQgPSByZXF1aXJlKCcuL21vZHVsZXMvbm9kZS1wZW5kJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG5leHBvcnRzLmNyZWF0ZUZyb21CdWZmZXIgPSBjcmVhdGVGcm9tQnVmZmVyO1xuZXhwb3J0cy5jcmVhdGVGcm9tRmQgPSBjcmVhdGVGcm9tRmQ7XG5leHBvcnRzLkJ1ZmZlclNsaWNlciA9IEJ1ZmZlclNsaWNlcjtcbmV4cG9ydHMuRmRTbGljZXIgPSBGZFNsaWNlcjtcblxudXRpbC5pbmhlcml0cyhGZFNsaWNlciwgRXZlbnRFbWl0dGVyKTtcbmZ1bmN0aW9uIEZkU2xpY2VyKGZkLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuICB0aGlzLmZkID0gZmQ7XG4gIHRoaXMucGVuZCA9IG5ldyBQZW5kKCk7XG4gIHRoaXMucGVuZC5tYXggPSAxO1xuICB0aGlzLnJlZkNvdW50ID0gMDtcbiAgdGhpcy5hdXRvQ2xvc2UgPSAhIW9wdGlvbnMuYXV0b0Nsb3NlO1xufVxuXG5GZFNsaWNlci5wcm90b3R5cGUucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYucGVuZC5nbyhmdW5jdGlvbihjYikge1xuICAgIGZzLnJlYWQoc2VsZi5mZCwgYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGZ1bmN0aW9uKGVyciwgYnl0ZXNSZWFkLCBidWZmZXIpIHtcbiAgICAgIGNiKCk7XG4gICAgICBjYWxsYmFjayhlcnIsIGJ5dGVzUmVhZCwgYnVmZmVyKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5GZFNsaWNlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLnBlbmQuZ28oZnVuY3Rpb24oY2IpIHtcbiAgICBmcy53cml0ZShzZWxmLmZkLCBidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgZnVuY3Rpb24oZXJyLCB3cml0dGVuLCBidWZmZXIpIHtcbiAgICAgIGNiKCk7XG4gICAgICBjYWxsYmFjayhlcnIsIHdyaXR0ZW4sIGJ1ZmZlcik7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuRmRTbGljZXIucHJvdG90eXBlLmNyZWF0ZVJlYWRTdHJlYW0gPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgUmVhZFN0cmVhbSh0aGlzLCBvcHRpb25zKTtcbn07XG5cbkZkU2xpY2VyLnByb3RvdHlwZS5jcmVhdGVXcml0ZVN0cmVhbSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBXcml0ZVN0cmVhbSh0aGlzLCBvcHRpb25zKTtcbn07XG5cbkZkU2xpY2VyLnByb3RvdHlwZS5yZWYgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5yZWZDb3VudCArPSAxO1xufTtcblxuRmRTbGljZXIucHJvdG90eXBlLnVucmVmID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5yZWZDb3VudCAtPSAxO1xuXG4gIGlmIChzZWxmLnJlZkNvdW50ID4gMCkgcmV0dXJuO1xuICBpZiAoc2VsZi5yZWZDb3VudCA8IDApIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgdW5yZWZcIik7XG5cbiAgaWYgKHNlbGYuYXV0b0Nsb3NlKSB7XG4gICAgZnMuY2xvc2Uoc2VsZi5mZCwgb25DbG9zZURvbmUpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25DbG9zZURvbmUoZXJyKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuZW1pdCgnY2xvc2UnKTtcbiAgICB9XG4gIH1cbn07XG5cbnV0aWwuaW5oZXJpdHMoUmVhZFN0cmVhbSwgUmVhZGFibGUpO1xuZnVuY3Rpb24gUmVhZFN0cmVhbShjb250ZXh0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBSZWFkYWJsZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuY29udGV4dC5yZWYoKTtcblxuICB0aGlzLnN0YXJ0ID0gb3B0aW9ucy5zdGFydCB8fCAwO1xuICB0aGlzLmVuZE9mZnNldCA9IG9wdGlvbnMuZW5kO1xuICB0aGlzLnBvcyA9IHRoaXMuc3RhcnQ7XG4gIHRoaXMuZGVzdHJveWVkID0gZmFsc2U7XG59XG5cblJlYWRTdHJlYW0ucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24obikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmIChzZWxmLmRlc3Ryb3llZCkgcmV0dXJuO1xuXG4gIHZhciB0b1JlYWQgPSBNYXRoLm1pbihzZWxmLl9yZWFkYWJsZVN0YXRlLmhpZ2hXYXRlck1hcmssIG4pO1xuICBpZiAoc2VsZi5lbmRPZmZzZXQgIT0gbnVsbCkge1xuICAgIHRvUmVhZCA9IE1hdGgubWluKHRvUmVhZCwgc2VsZi5lbmRPZmZzZXQgLSBzZWxmLnBvcyk7XG4gIH1cbiAgaWYgKHRvUmVhZCA8PSAwKSB7XG4gICAgc2VsZi5kZXN0cm95ZWQgPSB0cnVlO1xuICAgIHNlbGYucHVzaChudWxsKTtcbiAgICBzZWxmLmNvbnRleHQudW5yZWYoKTtcbiAgICByZXR1cm47XG4gIH1cbiAgc2VsZi5jb250ZXh0LnBlbmQuZ28oZnVuY3Rpb24oY2IpIHtcbiAgICBpZiAoc2VsZi5kZXN0cm95ZWQpIHJldHVybiBjYigpO1xuICAgIHZhciBidWZmZXIgPSBuZXcgQnVmZmVyKHRvUmVhZCk7XG4gICAgZnMucmVhZChzZWxmLmNvbnRleHQuZmQsIGJ1ZmZlciwgMCwgdG9SZWFkLCBzZWxmLnBvcywgZnVuY3Rpb24oZXJyLCBieXRlc1JlYWQpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgc2VsZi5kZXN0cm95KGVycik7XG4gICAgICB9IGVsc2UgaWYgKGJ5dGVzUmVhZCA9PT0gMCkge1xuICAgICAgICBzZWxmLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgICAgIHNlbGYucHVzaChudWxsKTtcbiAgICAgICAgc2VsZi5jb250ZXh0LnVucmVmKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLnBvcyArPSBieXRlc1JlYWQ7XG4gICAgICAgIHNlbGYucHVzaChidWZmZXIuc2xpY2UoMCwgYnl0ZXNSZWFkKSk7XG4gICAgICB9XG4gICAgICBjYigpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cblJlYWRTdHJlYW0ucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbihlcnIpIHtcbiAgaWYgKHRoaXMuZGVzdHJveWVkKSByZXR1cm47XG4gIGVyciA9IGVyciB8fCBuZXcgRXJyb3IoXCJzdHJlYW0gZGVzdHJveWVkXCIpO1xuICB0aGlzLmRlc3Ryb3llZCA9IHRydWU7XG4gIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xuICB0aGlzLmNvbnRleHQudW5yZWYoKTtcbn07XG5cbnV0aWwuaW5oZXJpdHMoV3JpdGVTdHJlYW0sIFdyaXRhYmxlKTtcbmZ1bmN0aW9uIFdyaXRlU3RyZWFtKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIFdyaXRhYmxlLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5jb250ZXh0LnJlZigpO1xuXG4gIHRoaXMuc3RhcnQgPSBvcHRpb25zLnN0YXJ0IHx8IDA7XG4gIHRoaXMuZW5kT2Zmc2V0ID0gKG9wdGlvbnMuZW5kID09IG51bGwpID8gSW5maW5pdHkgOiArb3B0aW9ucy5lbmQ7XG4gIHRoaXMuYnl0ZXNXcml0dGVuID0gMDtcbiAgdGhpcy5wb3MgPSB0aGlzLnN0YXJ0O1xuICB0aGlzLmRlc3Ryb3llZCA9IGZhbHNlO1xuXG4gIHRoaXMub24oJ2ZpbmlzaCcsIHRoaXMuZGVzdHJveS5iaW5kKHRoaXMpKTtcbn1cblxuV3JpdGVTdHJlYW0ucHJvdG90eXBlLl93cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlciwgZW5jb2RpbmcsIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYuZGVzdHJveWVkKSByZXR1cm47XG5cbiAgaWYgKHNlbGYucG9zICsgYnVmZmVyLmxlbmd0aCA+IHNlbGYuZW5kT2Zmc2V0KSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcihcIm1heGltdW0gZmlsZSBsZW5ndGggZXhjZWVkZWRcIik7XG4gICAgZXJyLmNvZGUgPSAnRVRPT0JJRyc7XG4gICAgc2VsZi5kZXN0cm95KCk7XG4gICAgY2FsbGJhY2soZXJyKTtcbiAgICByZXR1cm47XG4gIH1cbiAgc2VsZi5jb250ZXh0LnBlbmQuZ28oZnVuY3Rpb24oY2IpIHtcbiAgICBpZiAoc2VsZi5kZXN0cm95ZWQpIHJldHVybiBjYigpO1xuICAgIGZzLndyaXRlKHNlbGYuY29udGV4dC5mZCwgYnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoLCBzZWxmLnBvcywgZnVuY3Rpb24oZXJyLCBieXRlcykge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgY2IoKTtcbiAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuYnl0ZXNXcml0dGVuICs9IGJ5dGVzO1xuICAgICAgICBzZWxmLnBvcyArPSBieXRlcztcbiAgICAgICAgc2VsZi5lbWl0KCdwcm9ncmVzcycpO1xuICAgICAgICBjYigpO1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbldyaXRlU3RyZWFtLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmRlc3Ryb3llZCkgcmV0dXJuO1xuICB0aGlzLmRlc3Ryb3llZCA9IHRydWU7XG4gIHRoaXMuY29udGV4dC51bnJlZigpO1xufTtcblxudXRpbC5pbmhlcml0cyhCdWZmZXJTbGljZXIsIEV2ZW50RW1pdHRlcik7XG5mdW5jdGlvbiBCdWZmZXJTbGljZXIoYnVmZmVyLCBvcHRpb25zKSB7XG4gIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLnJlZkNvdW50ID0gMDtcbiAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG4gIHRoaXMubWF4Q2h1bmtTaXplID0gb3B0aW9ucy5tYXhDaHVua1NpemUgfHwgTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7XG59XG5cbkJ1ZmZlclNsaWNlci5wcm90b3R5cGUucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaykge1xuICB2YXIgZW5kID0gcG9zaXRpb24gKyBsZW5ndGg7XG4gIHZhciBkZWx0YSA9IGVuZCAtIHRoaXMuYnVmZmVyLmxlbmd0aDtcbiAgdmFyIHdyaXR0ZW4gPSAoZGVsdGEgPiAwKSA/IGRlbHRhIDogbGVuZ3RoO1xuICB0aGlzLmJ1ZmZlci5jb3B5KGJ1ZmZlciwgb2Zmc2V0LCBwb3NpdGlvbiwgZW5kKTtcbiAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgIGNhbGxiYWNrKG51bGwsIHdyaXR0ZW4pO1xuICB9KTtcbn07XG5cbkJ1ZmZlclNsaWNlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgY2FsbGJhY2spIHtcbiAgYnVmZmVyLmNvcHkodGhpcy5idWZmZXIsIHBvc2l0aW9uLCBvZmZzZXQsIG9mZnNldCArIGxlbmd0aCk7XG4gIHNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICBjYWxsYmFjayhudWxsLCBsZW5ndGgsIGJ1ZmZlcik7XG4gIH0pO1xufTtcblxuQnVmZmVyU2xpY2VyLnByb3RvdHlwZS5jcmVhdGVSZWFkU3RyZWFtID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIHJlYWRTdHJlYW0gPSBuZXcgUGFzc1Rocm91Z2gob3B0aW9ucyk7XG4gIHJlYWRTdHJlYW0uZGVzdHJveWVkID0gZmFsc2U7XG4gIHJlYWRTdHJlYW0uc3RhcnQgPSBvcHRpb25zLnN0YXJ0IHx8IDA7XG4gIHJlYWRTdHJlYW0uZW5kT2Zmc2V0ID0gb3B0aW9ucy5lbmQ7XG4gIC8vIGJ5IHRoZSB0aW1lIHRoaXMgZnVuY3Rpb24gcmV0dXJucywgd2UnbGwgYmUgZG9uZS5cbiAgcmVhZFN0cmVhbS5wb3MgPSByZWFkU3RyZWFtLmVuZE9mZnNldCB8fCB0aGlzLmJ1ZmZlci5sZW5ndGg7XG5cbiAgLy8gcmVzcGVjdCB0aGUgbWF4Q2h1bmtTaXplIG9wdGlvbiB0byBzbGljZSB1cCB0aGUgY2h1bmsgaW50byBzbWFsbGVyIHBpZWNlcy5cbiAgdmFyIGVudGlyZVNsaWNlID0gdGhpcy5idWZmZXIuc2xpY2UocmVhZFN0cmVhbS5zdGFydCwgcmVhZFN0cmVhbS5wb3MpO1xuICB2YXIgb2Zmc2V0ID0gMDtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICB2YXIgbmV4dE9mZnNldCA9IG9mZnNldCArIHRoaXMubWF4Q2h1bmtTaXplO1xuICAgIGlmIChuZXh0T2Zmc2V0ID49IGVudGlyZVNsaWNlLmxlbmd0aCkge1xuICAgICAgLy8gbGFzdCBjaHVua1xuICAgICAgaWYgKG9mZnNldCA8IGVudGlyZVNsaWNlLmxlbmd0aCkge1xuICAgICAgICByZWFkU3RyZWFtLndyaXRlKGVudGlyZVNsaWNlLnNsaWNlKG9mZnNldCwgZW50aXJlU2xpY2UubGVuZ3RoKSk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgcmVhZFN0cmVhbS53cml0ZShlbnRpcmVTbGljZS5zbGljZShvZmZzZXQsIG5leHRPZmZzZXQpKTtcbiAgICBvZmZzZXQgPSBuZXh0T2Zmc2V0O1xuICB9XG5cbiAgcmVhZFN0cmVhbS5lbmQoKTtcbiAgcmVhZFN0cmVhbS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgcmVhZFN0cmVhbS5kZXN0cm95ZWQgPSB0cnVlO1xuICB9O1xuICByZXR1cm4gcmVhZFN0cmVhbTtcbn07XG5cbkJ1ZmZlclNsaWNlci5wcm90b3R5cGUuY3JlYXRlV3JpdGVTdHJlYW0gPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIHZhciBidWZmZXJTbGljZXIgPSB0aGlzO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIHdyaXRlU3RyZWFtID0gbmV3IFdyaXRhYmxlKG9wdGlvbnMpO1xuICB3cml0ZVN0cmVhbS5zdGFydCA9IG9wdGlvbnMuc3RhcnQgfHwgMDtcbiAgd3JpdGVTdHJlYW0uZW5kT2Zmc2V0ID0gKG9wdGlvbnMuZW5kID09IG51bGwpID8gdGhpcy5idWZmZXIubGVuZ3RoIDogK29wdGlvbnMuZW5kO1xuICB3cml0ZVN0cmVhbS5ieXRlc1dyaXR0ZW4gPSAwO1xuICB3cml0ZVN0cmVhbS5wb3MgPSB3cml0ZVN0cmVhbS5zdGFydDtcbiAgd3JpdGVTdHJlYW0uZGVzdHJveWVkID0gZmFsc2U7XG4gIHdyaXRlU3RyZWFtLl93cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlciwgZW5jb2RpbmcsIGNhbGxiYWNrKSB7XG4gICAgaWYgKHdyaXRlU3RyZWFtLmRlc3Ryb3llZCkgcmV0dXJuO1xuXG4gICAgdmFyIGVuZCA9IHdyaXRlU3RyZWFtLnBvcyArIGJ1ZmZlci5sZW5ndGg7XG4gICAgaWYgKGVuZCA+IHdyaXRlU3RyZWFtLmVuZE9mZnNldCkge1xuICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihcIm1heGltdW0gZmlsZSBsZW5ndGggZXhjZWVkZWRcIik7XG4gICAgICBlcnIuY29kZSA9ICdFVE9PQklHJztcbiAgICAgIHdyaXRlU3RyZWFtLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBidWZmZXIuY29weShidWZmZXJTbGljZXIuYnVmZmVyLCB3cml0ZVN0cmVhbS5wb3MsIDAsIGJ1ZmZlci5sZW5ndGgpO1xuXG4gICAgd3JpdGVTdHJlYW0uYnl0ZXNXcml0dGVuICs9IGJ1ZmZlci5sZW5ndGg7XG4gICAgd3JpdGVTdHJlYW0ucG9zID0gZW5kO1xuICAgIHdyaXRlU3RyZWFtLmVtaXQoJ3Byb2dyZXNzJyk7XG4gICAgY2FsbGJhY2soKTtcbiAgfTtcbiAgd3JpdGVTdHJlYW0uZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgIHdyaXRlU3RyZWFtLmRlc3Ryb3llZCA9IHRydWU7XG4gIH07XG4gIHJldHVybiB3cml0ZVN0cmVhbTtcbn07XG5cbkJ1ZmZlclNsaWNlci5wcm90b3R5cGUucmVmID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMucmVmQ291bnQgKz0gMTtcbn07XG5cbkJ1ZmZlclNsaWNlci5wcm90b3R5cGUudW5yZWYgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5yZWZDb3VudCAtPSAxO1xuXG4gIGlmICh0aGlzLnJlZkNvdW50IDwgMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgdW5yZWZcIik7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZUZyb21CdWZmZXIoYnVmZmVyLCBvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgQnVmZmVyU2xpY2VyKGJ1ZmZlciwgb3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUZyb21GZChmZCwgb3B0aW9ucykge1xuICByZXR1cm4gbmV3IEZkU2xpY2VyKGZkLCBvcHRpb25zKTtcbn1cbiIsIi8vdG8gbG9vayBuaWNlIHRoZSByZXF1aXJlTW9kdWxlIG9uIE5vZGVcbnJlcXVpcmUoXCIuL2xpYi9wc2stYWJzdHJhY3QtY2xpZW50XCIpO1xuaWYoISQkLmJyb3dzZXJSdW50aW1lKXtcblx0cmVxdWlyZShcIi4vbGliL3Bzay1ub2RlLWNsaWVudFwiKTtcbn1lbHNle1xuXHRyZXF1aXJlKFwiLi9saWIvcHNrLWJyb3dzZXItY2xpZW50XCIpO1xufSIsImNvbnN0IEJsb2NrY2hhaW4gPSByZXF1aXJlKCcuL2xpYi9CbG9ja2NoYWluJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHN0YXJ0REI6IGZ1bmN0aW9uIChmb2xkZXIpIHtcbiAgICAgICAgaWYgKCQkLmJsb2NrY2hhaW4pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignJCQuYmxvY2tjaGFpbiBpcyBhbHJlYWR5IGRlZmluZWQnKTtcbiAgICAgICAgfVxuICAgICAgICAkJC5ibG9ja2NoYWluID0gdGhpcy5jcmVhdGVEQkhhbmRsZXIoZm9sZGVyKTtcbiAgICAgICAgcmV0dXJuICQkLmJsb2NrY2hhaW47XG4gICAgfSxcbiAgICBjcmVhdGVEQkhhbmRsZXI6IGZ1bmN0aW9uKGZvbGRlcil7XG4gICAgICAgIHJlcXVpcmUoJy4vbGliL2RvbWFpbicpO1xuICAgICAgICByZXF1aXJlKCcuL2xpYi9zd2FybXMnKTtcblxuICAgICAgICBjb25zdCBmcGRzID0gcmVxdWlyZShcIi4vbGliL0ZvbGRlclBlcnNpc3RlbnRQRFNcIik7XG4gICAgICAgIGNvbnN0IHBkcyA9IGZwZHMubmV3UERTKGZvbGRlcik7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBCbG9ja2NoYWluKHBkcyk7XG4gICAgfSxcbiAgICBwYXJzZURvbWFpblVybDogZnVuY3Rpb24gKGRvbWFpblVybCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkVtcHR5IGZ1bmN0aW9uXCIpO1xuICAgIH0sXG4gICAgZ2V0RG9tYWluSW5mbzogZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkVtcHR5IGZ1bmN0aW9uXCIpO1xuICAgIH0sXG4gICAgc3RhcnRJbk1lbW9yeURCOiBmdW5jdGlvbigpIHtcblx0XHRyZXF1aXJlKCcuL2xpYi9kb21haW4nKTtcblx0XHRyZXF1aXJlKCcuL2xpYi9zd2FybXMnKTtcblxuXHRcdGNvbnN0IHBkcyA9IHJlcXVpcmUoJy4vbGliL0luTWVtb3J5UERTJyk7XG5cblx0XHRyZXR1cm4gbmV3IEJsb2NrY2hhaW4ocGRzLm5ld1BEUyhudWxsKSk7XG4gICAgfSxcbiAgICBzdGFydERiOiBmdW5jdGlvbihyZWFkZXJXcml0ZXIpIHtcbiAgICAgICAgcmVxdWlyZSgnLi9saWIvZG9tYWluJyk7XG4gICAgICAgIHJlcXVpcmUoJy4vbGliL3N3YXJtcycpO1xuXG4gICAgICAgIGNvbnN0IHBwZHMgPSByZXF1aXJlKFwiLi9saWIvUGVyc2lzdGVudFBEU1wiKTtcbiAgICAgICAgY29uc3QgcGRzID0gcHBkcy5uZXdQRFMocmVhZGVyV3JpdGVyKTtcblxuICAgICAgICByZXR1cm4gbmV3IEJsb2NrY2hhaW4ocGRzKTtcbiAgICB9XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY29uc1V0aWw6IHJlcXVpcmUoJy4vY29uc1V0aWwnKVxufTsiLCJjb25zdCBTZXJ2ZXIgPSByZXF1aXJlKCcuL1ZpcnR1YWxNUS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlcnZlcjtcbiIsInZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciB6bGliID0gcmVxdWlyZShcInpsaWJcIik7XG5jb25zdCBmZF9zbGljZXIgPSByZXF1aXJlKFwibm9kZS1mZC1zbGljZXJcIik7XG52YXIgY3JjMzIgPSByZXF1aXJlKFwiYnVmZmVyLWNyYzMyXCIpO1xudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcjtcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKFwic3RyZWFtXCIpLlRyYW5zZm9ybTtcbnZhciBQYXNzVGhyb3VnaCA9IHJlcXVpcmUoXCJzdHJlYW1cIikuUGFzc1Rocm91Z2g7XG52YXIgV3JpdGFibGUgPSByZXF1aXJlKFwic3RyZWFtXCIpLldyaXRhYmxlO1xuXG5leHBvcnRzLm9wZW4gPSBvcGVuO1xuZXhwb3J0cy5mcm9tRmQgPSBmcm9tRmQ7XG5leHBvcnRzLmZyb21CdWZmZXIgPSBmcm9tQnVmZmVyO1xuZXhwb3J0cy5mcm9tUmFuZG9tQWNjZXNzUmVhZGVyID0gZnJvbVJhbmRvbUFjY2Vzc1JlYWRlcjtcbmV4cG9ydHMuZG9zRGF0ZVRpbWVUb0RhdGUgPSBkb3NEYXRlVGltZVRvRGF0ZTtcbmV4cG9ydHMudmFsaWRhdGVGaWxlTmFtZSA9IHZhbGlkYXRlRmlsZU5hbWU7XG5leHBvcnRzLlppcEZpbGUgPSBaaXBGaWxlO1xuZXhwb3J0cy5FbnRyeSA9IEVudHJ5O1xuZXhwb3J0cy5SYW5kb21BY2Nlc3NSZWFkZXIgPSBSYW5kb21BY2Nlc3NSZWFkZXI7XG5cbmZ1bmN0aW9uIG9wZW4ocGF0aCwgb3B0aW9ucywgY2FsbGJhY2spIHtcblx0aWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRjYWxsYmFjayA9IG9wdGlvbnM7XG5cdFx0b3B0aW9ucyA9IG51bGw7XG5cdH1cblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXHRpZiAob3B0aW9ucy5hdXRvQ2xvc2UgPT0gbnVsbCkgb3B0aW9ucy5hdXRvQ2xvc2UgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy5sYXp5RW50cmllcyA9PSBudWxsKSBvcHRpb25zLmxhenlFbnRyaWVzID0gZmFsc2U7XG5cdGlmIChvcHRpb25zLmRlY29kZVN0cmluZ3MgPT0gbnVsbCkgb3B0aW9ucy5kZWNvZGVTdHJpbmdzID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzID09IG51bGwpIG9wdGlvbnMudmFsaWRhdGVFbnRyeVNpemVzID0gdHJ1ZTtcblx0aWYgKG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzID09IG51bGwpIG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzID0gZmFsc2U7XG5cdGlmIChjYWxsYmFjayA9PSBudWxsKSBjYWxsYmFjayA9IGRlZmF1bHRDYWxsYmFjaztcblx0ZnMub3BlbihwYXRoLCBcInJcIiwgZnVuY3Rpb24gKGVyciwgZmQpIHtcblx0XHRpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRmcm9tRmQoZmQsIG9wdGlvbnMsIGZ1bmN0aW9uIChlcnIsIHppcGZpbGUpIHtcblx0XHRcdGlmIChlcnIpIGZzLmNsb3NlKGZkLCBkZWZhdWx0Q2FsbGJhY2spO1xuXHRcdFx0Y2FsbGJhY2soZXJyLCB6aXBmaWxlKTtcblx0XHR9KTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGZyb21GZChmZCwgb3B0aW9ucywgY2FsbGJhY2spIHtcblx0aWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRjYWxsYmFjayA9IG9wdGlvbnM7XG5cdFx0b3B0aW9ucyA9IG51bGw7XG5cdH1cblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXHRpZiAob3B0aW9ucy5hdXRvQ2xvc2UgPT0gbnVsbCkgb3B0aW9ucy5hdXRvQ2xvc2UgPSBmYWxzZTtcblx0aWYgKG9wdGlvbnMubGF6eUVudHJpZXMgPT0gbnVsbCkgb3B0aW9ucy5sYXp5RW50cmllcyA9IGZhbHNlO1xuXHRpZiAob3B0aW9ucy5kZWNvZGVTdHJpbmdzID09IG51bGwpIG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9IHRydWU7XG5cdGlmIChvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9PSBudWxsKSBvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcyA9IHRydWU7XG5cdGlmIChvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9PSBudWxsKSBvcHRpb25zLnN0cmljdEZpbGVOYW1lcyA9IGZhbHNlO1xuXHRpZiAoY2FsbGJhY2sgPT0gbnVsbCkgY2FsbGJhY2sgPSBkZWZhdWx0Q2FsbGJhY2s7XG5cdGZzLmZzdGF0KGZkLCBmdW5jdGlvbiAoZXJyLCBzdGF0cykge1xuXHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdHZhciByZWFkZXIgPSBmZF9zbGljZXIuY3JlYXRlRnJvbUZkKGZkLCB7YXV0b0Nsb3NlOiB0cnVlfSk7XG5cdFx0ZnJvbVJhbmRvbUFjY2Vzc1JlYWRlcihyZWFkZXIsIHN0YXRzLnNpemUsIG9wdGlvbnMsIGNhbGxiYWNrKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGZyb21CdWZmZXIoYnVmZmVyLCBvcHRpb25zLCBjYWxsYmFjaykge1xuXHRpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdGNhbGxiYWNrID0gb3B0aW9ucztcblx0XHRvcHRpb25zID0gbnVsbDtcblx0fVxuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdG9wdGlvbnMuYXV0b0Nsb3NlID0gZmFsc2U7XG5cdGlmIChvcHRpb25zLmxhenlFbnRyaWVzID09IG51bGwpIG9wdGlvbnMubGF6eUVudHJpZXMgPSBmYWxzZTtcblx0aWYgKG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9PSBudWxsKSBvcHRpb25zLmRlY29kZVN0cmluZ3MgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPT0gbnVsbCkgb3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPT0gbnVsbCkgb3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPSBmYWxzZTtcblx0Ly8gbGltaXQgdGhlIG1heCBjaHVuayBzaXplLiBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3RoZWpvc2h3b2xmZS95YXV6bC9pc3N1ZXMvODdcblx0dmFyIHJlYWRlciA9IGZkX3NsaWNlci5jcmVhdGVGcm9tQnVmZmVyKGJ1ZmZlciwge21heENodW5rU2l6ZTogMHgxMDAwMH0pO1xuXHRmcm9tUmFuZG9tQWNjZXNzUmVhZGVyKHJlYWRlciwgYnVmZmVyLmxlbmd0aCwgb3B0aW9ucywgY2FsbGJhY2spO1xufVxuXG5mdW5jdGlvbiBmcm9tUmFuZG9tQWNjZXNzUmVhZGVyKHJlYWRlciwgdG90YWxTaXplLCBvcHRpb25zLCBjYWxsYmFjaykge1xuXHRpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdGNhbGxiYWNrID0gb3B0aW9ucztcblx0XHRvcHRpb25zID0gbnVsbDtcblx0fVxuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdGlmIChvcHRpb25zLmF1dG9DbG9zZSA9PSBudWxsKSBvcHRpb25zLmF1dG9DbG9zZSA9IHRydWU7XG5cdGlmIChvcHRpb25zLmxhenlFbnRyaWVzID09IG51bGwpIG9wdGlvbnMubGF6eUVudHJpZXMgPSBmYWxzZTtcblx0aWYgKG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9PSBudWxsKSBvcHRpb25zLmRlY29kZVN0cmluZ3MgPSB0cnVlO1xuXHR2YXIgZGVjb2RlU3RyaW5ncyA9ICEhb3B0aW9ucy5kZWNvZGVTdHJpbmdzO1xuXHRpZiAob3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPT0gbnVsbCkgb3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMgPSB0cnVlO1xuXHRpZiAob3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPT0gbnVsbCkgb3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMgPSBmYWxzZTtcblx0aWYgKGNhbGxiYWNrID09IG51bGwpIGNhbGxiYWNrID0gZGVmYXVsdENhbGxiYWNrO1xuXHRpZiAodHlwZW9mIHRvdGFsU2l6ZSAhPT0gXCJudW1iZXJcIikgdGhyb3cgbmV3IEVycm9yKFwiZXhwZWN0ZWQgdG90YWxTaXplIHBhcmFtZXRlciB0byBiZSBhIG51bWJlclwiKTtcblx0aWYgKHRvdGFsU2l6ZSA+IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiemlwIGZpbGUgdG9vIGxhcmdlLiBvbmx5IGZpbGUgc2l6ZXMgdXAgdG8gMl41MiBhcmUgc3VwcG9ydGVkIGR1ZSB0byBKYXZhU2NyaXB0J3MgTnVtYmVyIHR5cGUgYmVpbmcgYW4gSUVFRSA3NTQgZG91YmxlLlwiKTtcblx0fVxuXG5cdC8vIHRoZSBtYXRjaGluZyB1bnJlZigpIGNhbGwgaXMgaW4gemlwZmlsZS5jbG9zZSgpXG5cdHJlYWRlci5yZWYoKTtcblxuXHQvLyBlb2NkciBtZWFucyBFbmQgb2YgQ2VudHJhbCBEaXJlY3RvcnkgUmVjb3JkLlxuXHQvLyBzZWFyY2ggYmFja3dhcmRzIGZvciB0aGUgZW9jZHIgc2lnbmF0dXJlLlxuXHQvLyB0aGUgbGFzdCBmaWVsZCBvZiB0aGUgZW9jZHIgaXMgYSB2YXJpYWJsZS1sZW5ndGggY29tbWVudC5cblx0Ly8gdGhlIGNvbW1lbnQgc2l6ZSBpcyBlbmNvZGVkIGluIGEgMi1ieXRlIGZpZWxkIGluIHRoZSBlb2Nkciwgd2hpY2ggd2UgY2FuJ3QgZmluZCB3aXRob3V0IHRydWRnaW5nIGJhY2t3YXJkcyB0aHJvdWdoIHRoZSBjb21tZW50IHRvIGZpbmQgaXQuXG5cdC8vIGFzIGEgY29uc2VxdWVuY2Ugb2YgdGhpcyBkZXNpZ24gZGVjaXNpb24sIGl0J3MgcG9zc2libGUgdG8gaGF2ZSBhbWJpZ3VvdXMgemlwIGZpbGUgbWV0YWRhdGEgaWYgYSBjb2hlcmVudCBlb2NkciB3YXMgaW4gdGhlIGNvbW1lbnQuXG5cdC8vIHdlIHNlYXJjaCBiYWNrd2FyZHMgZm9yIGEgZW9jZHIgc2lnbmF0dXJlLCBhbmQgaG9wZSB0aGF0IHdob2V2ZXIgbWFkZSB0aGUgemlwIGZpbGUgd2FzIHNtYXJ0IGVub3VnaCB0byBmb3JiaWQgdGhlIGVvY2RyIHNpZ25hdHVyZSBpbiB0aGUgY29tbWVudC5cblx0dmFyIGVvY2RyV2l0aG91dENvbW1lbnRTaXplID0gMjI7XG5cdHZhciBtYXhDb21tZW50U2l6ZSA9IDB4ZmZmZjsgLy8gMi1ieXRlIHNpemVcblx0dmFyIGJ1ZmZlclNpemUgPSBNYXRoLm1pbihlb2NkcldpdGhvdXRDb21tZW50U2l6ZSArIG1heENvbW1lbnRTaXplLCB0b3RhbFNpemUpO1xuXHR2YXIgYnVmZmVyID0gbmV3QnVmZmVyKGJ1ZmZlclNpemUpO1xuXHR2YXIgYnVmZmVyUmVhZFN0YXJ0ID0gdG90YWxTaXplIC0gYnVmZmVyLmxlbmd0aDtcblx0cmVhZEFuZEFzc2VydE5vRW9mKHJlYWRlciwgYnVmZmVyLCAwLCBidWZmZXJTaXplLCBidWZmZXJSZWFkU3RhcnQsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRmb3IgKHZhciBpID0gYnVmZmVyU2l6ZSAtIGVvY2RyV2l0aG91dENvbW1lbnRTaXplOyBpID49IDA7IGkgLT0gMSkge1xuXHRcdFx0aWYgKGJ1ZmZlci5yZWFkVUludDMyTEUoaSkgIT09IDB4MDYwNTRiNTApIGNvbnRpbnVlO1xuXHRcdFx0Ly8gZm91bmQgZW9jZHJcblx0XHRcdHZhciBlb2NkckJ1ZmZlciA9IGJ1ZmZlci5zbGljZShpKTtcblxuXHRcdFx0Ly8gMCAtIEVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSBzaWduYXR1cmUgPSAweDA2MDU0YjUwXG5cdFx0XHQvLyA0IC0gTnVtYmVyIG9mIHRoaXMgZGlza1xuXHRcdFx0dmFyIGRpc2tOdW1iZXIgPSBlb2NkckJ1ZmZlci5yZWFkVUludDE2TEUoNCk7XG5cdFx0XHRpZiAoZGlza051bWJlciAhPT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwibXVsdGktZGlzayB6aXAgZmlsZXMgYXJlIG5vdCBzdXBwb3J0ZWQ6IGZvdW5kIGRpc2sgbnVtYmVyOiBcIiArIGRpc2tOdW1iZXIpKTtcblx0XHRcdH1cblx0XHRcdC8vIDYgLSBEaXNrIHdoZXJlIGNlbnRyYWwgZGlyZWN0b3J5IHN0YXJ0c1xuXHRcdFx0Ly8gOCAtIE51bWJlciBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmRzIG9uIHRoaXMgZGlza1xuXHRcdFx0Ly8gMTAgLSBUb3RhbCBudW1iZXIgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3Jkc1xuXHRcdFx0dmFyIGVudHJ5Q291bnQgPSBlb2NkckJ1ZmZlci5yZWFkVUludDE2TEUoMTApO1xuXHRcdFx0Ly8gMTIgLSBTaXplIG9mIGNlbnRyYWwgZGlyZWN0b3J5IChieXRlcylcblx0XHRcdC8vIDE2IC0gT2Zmc2V0IG9mIHN0YXJ0IG9mIGNlbnRyYWwgZGlyZWN0b3J5LCByZWxhdGl2ZSB0byBzdGFydCBvZiBhcmNoaXZlXG5cdFx0XHR2YXIgY2VudHJhbERpcmVjdG9yeU9mZnNldCA9IGVvY2RyQnVmZmVyLnJlYWRVSW50MzJMRSgxNik7XG5cdFx0XHQvLyAyMCAtIENvbW1lbnQgbGVuZ3RoXG5cdFx0XHR2YXIgY29tbWVudExlbmd0aCA9IGVvY2RyQnVmZmVyLnJlYWRVSW50MTZMRSgyMCk7XG5cdFx0XHR2YXIgZXhwZWN0ZWRDb21tZW50TGVuZ3RoID0gZW9jZHJCdWZmZXIubGVuZ3RoIC0gZW9jZHJXaXRob3V0Q29tbWVudFNpemU7XG5cdFx0XHRpZiAoY29tbWVudExlbmd0aCAhPT0gZXhwZWN0ZWRDb21tZW50TGVuZ3RoKSB7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJpbnZhbGlkIGNvbW1lbnQgbGVuZ3RoLiBleHBlY3RlZDogXCIgKyBleHBlY3RlZENvbW1lbnRMZW5ndGggKyBcIi4gZm91bmQ6IFwiICsgY29tbWVudExlbmd0aCkpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gMjIgLSBDb21tZW50XG5cdFx0XHQvLyB0aGUgZW5jb2RpbmcgaXMgYWx3YXlzIGNwNDM3LlxuXHRcdFx0dmFyIGNvbW1lbnQgPSBkZWNvZGVTdHJpbmdzID8gZGVjb2RlQnVmZmVyKGVvY2RyQnVmZmVyLCAyMiwgZW9jZHJCdWZmZXIubGVuZ3RoLCBmYWxzZSlcblx0XHRcdFx0OiBlb2NkckJ1ZmZlci5zbGljZSgyMik7XG5cblx0XHRcdGlmICghKGVudHJ5Q291bnQgPT09IDB4ZmZmZiB8fCBjZW50cmFsRGlyZWN0b3J5T2Zmc2V0ID09PSAweGZmZmZmZmZmKSkge1xuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgbmV3IFppcEZpbGUocmVhZGVyLCBjZW50cmFsRGlyZWN0b3J5T2Zmc2V0LCB0b3RhbFNpemUsIGVudHJ5Q291bnQsIGNvbW1lbnQsIG9wdGlvbnMuYXV0b0Nsb3NlLCBvcHRpb25zLmxhenlFbnRyaWVzLCBkZWNvZGVTdHJpbmdzLCBvcHRpb25zLnZhbGlkYXRlRW50cnlTaXplcywgb3B0aW9ucy5zdHJpY3RGaWxlTmFtZXMpKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gWklQNjQgZm9ybWF0XG5cblx0XHRcdC8vIFpJUDY0IFppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSBsb2NhdG9yXG5cdFx0XHR2YXIgemlwNjRFb2NkbEJ1ZmZlciA9IG5ld0J1ZmZlcigyMCk7XG5cdFx0XHR2YXIgemlwNjRFb2NkbE9mZnNldCA9IGJ1ZmZlclJlYWRTdGFydCArIGkgLSB6aXA2NEVvY2RsQnVmZmVyLmxlbmd0aDtcblx0XHRcdHJlYWRBbmRBc3NlcnROb0VvZihyZWFkZXIsIHppcDY0RW9jZGxCdWZmZXIsIDAsIHppcDY0RW9jZGxCdWZmZXIubGVuZ3RoLCB6aXA2NEVvY2RsT2Zmc2V0LCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXG5cdFx0XHRcdC8vIDAgLSB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXIgbG9jYXRvciBzaWduYXR1cmUgPSAweDA3MDY0YjUwXG5cdFx0XHRcdGlmICh6aXA2NEVvY2RsQnVmZmVyLnJlYWRVSW50MzJMRSgwKSAhPT0gMHgwNzA2NGI1MCkge1xuXHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJpbnZhbGlkIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSBsb2NhdG9yIHNpZ25hdHVyZVwiKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gNCAtIG51bWJlciBvZiB0aGUgZGlzayB3aXRoIHRoZSBzdGFydCBvZiB0aGUgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5XG5cdFx0XHRcdC8vIDggLSByZWxhdGl2ZSBvZmZzZXQgb2YgdGhlIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmRcblx0XHRcdFx0dmFyIHppcDY0RW9jZHJPZmZzZXQgPSByZWFkVUludDY0TEUoemlwNjRFb2NkbEJ1ZmZlciwgOCk7XG5cdFx0XHRcdC8vIDE2IC0gdG90YWwgbnVtYmVyIG9mIGRpc2tzXG5cblx0XHRcdFx0Ly8gWklQNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZFxuXHRcdFx0XHR2YXIgemlwNjRFb2NkckJ1ZmZlciA9IG5ld0J1ZmZlcig1Nik7XG5cdFx0XHRcdHJlYWRBbmRBc3NlcnROb0VvZihyZWFkZXIsIHppcDY0RW9jZHJCdWZmZXIsIDAsIHppcDY0RW9jZHJCdWZmZXIubGVuZ3RoLCB6aXA2NEVvY2RyT2Zmc2V0LCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRcdFx0aWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cblx0XHRcdFx0XHQvLyAwIC0gemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyIHNpZ25hdHVyZSAgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXMgICgweDA2MDY0YjUwKVxuXHRcdFx0XHRcdGlmICh6aXA2NEVvY2RyQnVmZmVyLnJlYWRVSW50MzJMRSgwKSAhPT0gMHgwNjA2NGI1MCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImludmFsaWQgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZCBzaWduYXR1cmVcIikpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyA0IC0gc2l6ZSBvZiB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgcmVjb3JkICAgICAgICAgICAgICAgIDggYnl0ZXNcblx0XHRcdFx0XHQvLyAxMiAtIHZlcnNpb24gbWFkZSBieSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0XHRcdFx0XHQvLyAxNCAtIHZlcnNpb24gbmVlZGVkIHRvIGV4dHJhY3QgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0XHRcdFx0XHQvLyAxNiAtIG51bWJlciBvZiB0aGlzIGRpc2sgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0XHRcdFx0XHQvLyAyMCAtIG51bWJlciBvZiB0aGUgZGlzayB3aXRoIHRoZSBzdGFydCBvZiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgIDQgYnl0ZXNcblx0XHRcdFx0XHQvLyAyNCAtIHRvdGFsIG51bWJlciBvZiBlbnRyaWVzIGluIHRoZSBjZW50cmFsIGRpcmVjdG9yeSBvbiB0aGlzIGRpc2sgICAgICAgICA4IGJ5dGVzXG5cdFx0XHRcdFx0Ly8gMzIgLSB0b3RhbCBudW1iZXIgb2YgZW50cmllcyBpbiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgICAgICAgICAgICA4IGJ5dGVzXG5cdFx0XHRcdFx0ZW50cnlDb3VudCA9IHJlYWRVSW50NjRMRSh6aXA2NEVvY2RyQnVmZmVyLCAzMik7XG5cdFx0XHRcdFx0Ly8gNDAgLSBzaXplIG9mIHRoZSBjZW50cmFsIGRpcmVjdG9yeSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdFx0XHRcdFx0Ly8gNDggLSBvZmZzZXQgb2Ygc3RhcnQgb2YgY2VudHJhbCBkaXJlY3Rvcnkgd2l0aCByZXNwZWN0IHRvIHRoZSBzdGFydGluZyBkaXNrIG51bWJlciAgICAgOCBieXRlc1xuXHRcdFx0XHRcdGNlbnRyYWxEaXJlY3RvcnlPZmZzZXQgPSByZWFkVUludDY0TEUoemlwNjRFb2NkckJ1ZmZlciwgNDgpO1xuXHRcdFx0XHRcdC8vIDU2IC0gemlwNjQgZXh0ZW5zaWJsZSBkYXRhIHNlY3RvciAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHZhcmlhYmxlIHNpemUpXG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIG5ldyBaaXBGaWxlKHJlYWRlciwgY2VudHJhbERpcmVjdG9yeU9mZnNldCwgdG90YWxTaXplLCBlbnRyeUNvdW50LCBjb21tZW50LCBvcHRpb25zLmF1dG9DbG9zZSwgb3B0aW9ucy5sYXp5RW50cmllcywgZGVjb2RlU3RyaW5ncywgb3B0aW9ucy52YWxpZGF0ZUVudHJ5U2l6ZXMsIG9wdGlvbnMuc3RyaWN0RmlsZU5hbWVzKSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNhbGxiYWNrKG5ldyBFcnJvcihcImVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmQgc2lnbmF0dXJlIG5vdCBmb3VuZFwiKSk7XG5cdH0pO1xufVxuXG51dGlsLmluaGVyaXRzKFppcEZpbGUsIEV2ZW50RW1pdHRlcik7XG5cbmZ1bmN0aW9uIFppcEZpbGUocmVhZGVyLCBjZW50cmFsRGlyZWN0b3J5T2Zmc2V0LCBmaWxlU2l6ZSwgZW50cnlDb3VudCwgY29tbWVudCwgYXV0b0Nsb3NlLCBsYXp5RW50cmllcywgZGVjb2RlU3RyaW5ncywgdmFsaWRhdGVFbnRyeVNpemVzLCBzdHJpY3RGaWxlTmFtZXMpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRFdmVudEVtaXR0ZXIuY2FsbChzZWxmKTtcblx0c2VsZi5yZWFkZXIgPSByZWFkZXI7XG5cdC8vIGZvcndhcmQgY2xvc2UgZXZlbnRzXG5cdHNlbGYucmVhZGVyLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycikge1xuXHRcdC8vIGVycm9yIGNsb3NpbmcgdGhlIGZkXG5cdFx0ZW1pdEVycm9yKHNlbGYsIGVycik7XG5cdH0pO1xuXHRzZWxmLnJlYWRlci5vbmNlKFwiY2xvc2VcIiwgZnVuY3Rpb24gKCkge1xuXHRcdHNlbGYuZW1pdChcImNsb3NlXCIpO1xuXHR9KTtcblx0c2VsZi5yZWFkRW50cnlDdXJzb3IgPSBjZW50cmFsRGlyZWN0b3J5T2Zmc2V0O1xuXHRzZWxmLmZpbGVTaXplID0gZmlsZVNpemU7XG5cdHNlbGYuZW50cnlDb3VudCA9IGVudHJ5Q291bnQ7XG5cdHNlbGYuY29tbWVudCA9IGNvbW1lbnQ7XG5cdHNlbGYuZW50cmllc1JlYWQgPSAwO1xuXHRzZWxmLmF1dG9DbG9zZSA9ICEhYXV0b0Nsb3NlO1xuXHRzZWxmLmxhenlFbnRyaWVzID0gISFsYXp5RW50cmllcztcblx0c2VsZi5kZWNvZGVTdHJpbmdzID0gISFkZWNvZGVTdHJpbmdzO1xuXHRzZWxmLnZhbGlkYXRlRW50cnlTaXplcyA9ICEhdmFsaWRhdGVFbnRyeVNpemVzO1xuXHRzZWxmLnN0cmljdEZpbGVOYW1lcyA9ICEhc3RyaWN0RmlsZU5hbWVzO1xuXHRzZWxmLmlzT3BlbiA9IHRydWU7XG5cdHNlbGYuZW1pdHRlZEVycm9yID0gZmFsc2U7XG5cblx0aWYgKCFzZWxmLmxhenlFbnRyaWVzKSBzZWxmLl9yZWFkRW50cnkoKTtcbn1cblxuWmlwRmlsZS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICghdGhpcy5pc09wZW4pIHJldHVybjtcblx0dGhpcy5pc09wZW4gPSBmYWxzZTtcblx0dGhpcy5yZWFkZXIudW5yZWYoKTtcbn07XG5cbmZ1bmN0aW9uIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBlcnIpIHtcblx0aWYgKHNlbGYuYXV0b0Nsb3NlKSBzZWxmLmNsb3NlKCk7XG5cdGVtaXRFcnJvcihzZWxmLCBlcnIpO1xufVxuXG5mdW5jdGlvbiBlbWl0RXJyb3Ioc2VsZiwgZXJyKSB7XG5cdGlmIChzZWxmLmVtaXR0ZWRFcnJvcikgcmV0dXJuO1xuXHRzZWxmLmVtaXR0ZWRFcnJvciA9IHRydWU7XG5cdHNlbGYuZW1pdChcImVycm9yXCIsIGVycik7XG59XG5cblppcEZpbGUucHJvdG90eXBlLnJlYWRFbnRyeSA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKCF0aGlzLmxhenlFbnRyaWVzKSB0aHJvdyBuZXcgRXJyb3IoXCJyZWFkRW50cnkoKSBjYWxsZWQgd2l0aG91dCBsYXp5RW50cmllczp0cnVlXCIpO1xuXHR0aGlzLl9yZWFkRW50cnkoKTtcbn07XG5aaXBGaWxlLnByb3RvdHlwZS5fcmVhZEVudHJ5ID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmIChzZWxmLmVudHJ5Q291bnQgPT09IHNlbGYuZW50cmllc1JlYWQpIHtcblx0XHQvLyBkb25lIHdpdGggbWV0YWRhdGFcblx0XHRzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHNlbGYuYXV0b0Nsb3NlKSBzZWxmLmNsb3NlKCk7XG5cdFx0XHRpZiAoc2VsZi5lbWl0dGVkRXJyb3IpIHJldHVybjtcblx0XHRcdHNlbGYuZW1pdChcImVuZFwiKTtcblx0XHR9KTtcblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKHNlbGYuZW1pdHRlZEVycm9yKSByZXR1cm47XG5cdHZhciBidWZmZXIgPSBuZXdCdWZmZXIoNDYpO1xuXHRyZWFkQW5kQXNzZXJ0Tm9Fb2Yoc2VsZi5yZWFkZXIsIGJ1ZmZlciwgMCwgYnVmZmVyLmxlbmd0aCwgc2VsZi5yZWFkRW50cnlDdXJzb3IsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRpZiAoZXJyKSByZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIGVycik7XG5cdFx0aWYgKHNlbGYuZW1pdHRlZEVycm9yKSByZXR1cm47XG5cdFx0dmFyIGVudHJ5ID0gbmV3IEVudHJ5KCk7XG5cdFx0Ly8gMCAtIENlbnRyYWwgZGlyZWN0b3J5IGZpbGUgaGVhZGVyIHNpZ25hdHVyZVxuXHRcdHZhciBzaWduYXR1cmUgPSBidWZmZXIucmVhZFVJbnQzMkxFKDApO1xuXHRcdGlmIChzaWduYXR1cmUgIT09IDB4MDIwMTRiNTApIHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKFwiaW52YWxpZCBjZW50cmFsIGRpcmVjdG9yeSBmaWxlIGhlYWRlciBzaWduYXR1cmU6IDB4XCIgKyBzaWduYXR1cmUudG9TdHJpbmcoMTYpKSk7XG5cdFx0Ly8gNCAtIFZlcnNpb24gbWFkZSBieVxuXHRcdGVudHJ5LnZlcnNpb25NYWRlQnkgPSBidWZmZXIucmVhZFVJbnQxNkxFKDQpO1xuXHRcdC8vIDYgLSBWZXJzaW9uIG5lZWRlZCB0byBleHRyYWN0IChtaW5pbXVtKVxuXHRcdGVudHJ5LnZlcnNpb25OZWVkZWRUb0V4dHJhY3QgPSBidWZmZXIucmVhZFVJbnQxNkxFKDYpO1xuXHRcdC8vIDggLSBHZW5lcmFsIHB1cnBvc2UgYml0IGZsYWdcblx0XHRlbnRyeS5nZW5lcmFsUHVycG9zZUJpdEZsYWcgPSBidWZmZXIucmVhZFVJbnQxNkxFKDgpO1xuXHRcdC8vIDEwIC0gQ29tcHJlc3Npb24gbWV0aG9kXG5cdFx0ZW50cnkuY29tcHJlc3Npb25NZXRob2QgPSBidWZmZXIucmVhZFVJbnQxNkxFKDEwKTtcblx0XHQvLyAxMiAtIEZpbGUgbGFzdCBtb2RpZmljYXRpb24gdGltZVxuXHRcdGVudHJ5Lmxhc3RNb2RGaWxlVGltZSA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMTIpO1xuXHRcdC8vIDE0IC0gRmlsZSBsYXN0IG1vZGlmaWNhdGlvbiBkYXRlXG5cdFx0ZW50cnkubGFzdE1vZEZpbGVEYXRlID0gYnVmZmVyLnJlYWRVSW50MTZMRSgxNCk7XG5cdFx0Ly8gMTYgLSBDUkMtMzJcblx0XHRlbnRyeS5jcmMzMiA9IGJ1ZmZlci5yZWFkVUludDMyTEUoMTYpO1xuXHRcdC8vIDIwIC0gQ29tcHJlc3NlZCBzaXplXG5cdFx0ZW50cnkuY29tcHJlc3NlZFNpemUgPSBidWZmZXIucmVhZFVJbnQzMkxFKDIwKTtcblx0XHQvLyAyNCAtIFVuY29tcHJlc3NlZCBzaXplXG5cdFx0ZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9IGJ1ZmZlci5yZWFkVUludDMyTEUoMjQpO1xuXHRcdC8vIDI4IC0gRmlsZSBuYW1lIGxlbmd0aCAobilcblx0XHRlbnRyeS5maWxlTmFtZUxlbmd0aCA9IGJ1ZmZlci5yZWFkVUludDE2TEUoMjgpO1xuXHRcdC8vIDMwIC0gRXh0cmEgZmllbGQgbGVuZ3RoIChtKVxuXHRcdGVudHJ5LmV4dHJhRmllbGRMZW5ndGggPSBidWZmZXIucmVhZFVJbnQxNkxFKDMwKTtcblx0XHQvLyAzMiAtIEZpbGUgY29tbWVudCBsZW5ndGggKGspXG5cdFx0ZW50cnkuZmlsZUNvbW1lbnRMZW5ndGggPSBidWZmZXIucmVhZFVJbnQxNkxFKDMyKTtcblx0XHQvLyAzNCAtIERpc2sgbnVtYmVyIHdoZXJlIGZpbGUgc3RhcnRzXG5cdFx0Ly8gMzYgLSBJbnRlcm5hbCBmaWxlIGF0dHJpYnV0ZXNcblx0XHRlbnRyeS5pbnRlcm5hbEZpbGVBdHRyaWJ1dGVzID0gYnVmZmVyLnJlYWRVSW50MTZMRSgzNik7XG5cdFx0Ly8gMzggLSBFeHRlcm5hbCBmaWxlIGF0dHJpYnV0ZXNcblx0XHRlbnRyeS5leHRlcm5hbEZpbGVBdHRyaWJ1dGVzID0gYnVmZmVyLnJlYWRVSW50MzJMRSgzOCk7XG5cdFx0Ly8gNDIgLSBSZWxhdGl2ZSBvZmZzZXQgb2YgbG9jYWwgZmlsZSBoZWFkZXJcblx0XHRlbnRyeS5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgPSBidWZmZXIucmVhZFVJbnQzMkxFKDQyKTtcblxuXHRcdGlmIChlbnRyeS5nZW5lcmFsUHVycG9zZUJpdEZsYWcgJiAweDQwKSByZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihcInN0cm9uZyBlbmNyeXB0aW9uIGlzIG5vdCBzdXBwb3J0ZWRcIikpO1xuXG5cdFx0c2VsZi5yZWFkRW50cnlDdXJzb3IgKz0gNDY7XG5cblx0XHRidWZmZXIgPSBuZXdCdWZmZXIoZW50cnkuZmlsZU5hbWVMZW5ndGggKyBlbnRyeS5leHRyYUZpZWxkTGVuZ3RoICsgZW50cnkuZmlsZUNvbW1lbnRMZW5ndGgpO1xuXHRcdHJlYWRBbmRBc3NlcnROb0VvZihzZWxmLnJlYWRlciwgYnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoLCBzZWxmLnJlYWRFbnRyeUN1cnNvciwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0aWYgKGVycikgcmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBlcnIpO1xuXHRcdFx0aWYgKHNlbGYuZW1pdHRlZEVycm9yKSByZXR1cm47XG5cdFx0XHQvLyA0NiAtIEZpbGUgbmFtZVxuXHRcdFx0dmFyIGlzVXRmOCA9IChlbnRyeS5nZW5lcmFsUHVycG9zZUJpdEZsYWcgJiAweDgwMCkgIT09IDA7XG5cdFx0XHRlbnRyeS5maWxlTmFtZSA9IHNlbGYuZGVjb2RlU3RyaW5ncyA/IGRlY29kZUJ1ZmZlcihidWZmZXIsIDAsIGVudHJ5LmZpbGVOYW1lTGVuZ3RoLCBpc1V0ZjgpXG5cdFx0XHRcdDogYnVmZmVyLnNsaWNlKDAsIGVudHJ5LmZpbGVOYW1lTGVuZ3RoKTtcblxuXHRcdFx0Ly8gNDYrbiAtIEV4dHJhIGZpZWxkXG5cdFx0XHR2YXIgZmlsZUNvbW1lbnRTdGFydCA9IGVudHJ5LmZpbGVOYW1lTGVuZ3RoICsgZW50cnkuZXh0cmFGaWVsZExlbmd0aDtcblx0XHRcdHZhciBleHRyYUZpZWxkQnVmZmVyID0gYnVmZmVyLnNsaWNlKGVudHJ5LmZpbGVOYW1lTGVuZ3RoLCBmaWxlQ29tbWVudFN0YXJ0KTtcblx0XHRcdGVudHJ5LmV4dHJhRmllbGRzID0gW107XG5cdFx0XHR2YXIgaSA9IDA7XG5cdFx0XHR3aGlsZSAoaSA8IGV4dHJhRmllbGRCdWZmZXIubGVuZ3RoIC0gMykge1xuXHRcdFx0XHR2YXIgaGVhZGVySWQgPSBleHRyYUZpZWxkQnVmZmVyLnJlYWRVSW50MTZMRShpICsgMCk7XG5cdFx0XHRcdHZhciBkYXRhU2l6ZSA9IGV4dHJhRmllbGRCdWZmZXIucmVhZFVJbnQxNkxFKGkgKyAyKTtcblx0XHRcdFx0dmFyIGRhdGFTdGFydCA9IGkgKyA0O1xuXHRcdFx0XHR2YXIgZGF0YUVuZCA9IGRhdGFTdGFydCArIGRhdGFTaXplO1xuXHRcdFx0XHRpZiAoZGF0YUVuZCA+IGV4dHJhRmllbGRCdWZmZXIubGVuZ3RoKSByZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihcImV4dHJhIGZpZWxkIGxlbmd0aCBleGNlZWRzIGV4dHJhIGZpZWxkIGJ1ZmZlciBzaXplXCIpKTtcblx0XHRcdFx0dmFyIGRhdGFCdWZmZXIgPSBuZXdCdWZmZXIoZGF0YVNpemUpO1xuXHRcdFx0XHRleHRyYUZpZWxkQnVmZmVyLmNvcHkoZGF0YUJ1ZmZlciwgMCwgZGF0YVN0YXJ0LCBkYXRhRW5kKTtcblx0XHRcdFx0ZW50cnkuZXh0cmFGaWVsZHMucHVzaCh7XG5cdFx0XHRcdFx0aWQ6IGhlYWRlcklkLFxuXHRcdFx0XHRcdGRhdGE6IGRhdGFCdWZmZXIsXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRpID0gZGF0YUVuZDtcblx0XHRcdH1cblxuXHRcdFx0Ly8gNDYrbittIC0gRmlsZSBjb21tZW50XG5cdFx0XHRlbnRyeS5maWxlQ29tbWVudCA9IHNlbGYuZGVjb2RlU3RyaW5ncyA/IGRlY29kZUJ1ZmZlcihidWZmZXIsIGZpbGVDb21tZW50U3RhcnQsIGZpbGVDb21tZW50U3RhcnQgKyBlbnRyeS5maWxlQ29tbWVudExlbmd0aCwgaXNVdGY4KVxuXHRcdFx0XHQ6IGJ1ZmZlci5zbGljZShmaWxlQ29tbWVudFN0YXJ0LCBmaWxlQ29tbWVudFN0YXJ0ICsgZW50cnkuZmlsZUNvbW1lbnRMZW5ndGgpO1xuXHRcdFx0Ly8gY29tcGF0aWJpbGl0eSBoYWNrIGZvciBodHRwczovL2dpdGh1Yi5jb20vdGhlam9zaHdvbGZlL3lhdXpsL2lzc3Vlcy80N1xuXHRcdFx0ZW50cnkuY29tbWVudCA9IGVudHJ5LmZpbGVDb21tZW50O1xuXG5cdFx0XHRzZWxmLnJlYWRFbnRyeUN1cnNvciArPSBidWZmZXIubGVuZ3RoO1xuXHRcdFx0c2VsZi5lbnRyaWVzUmVhZCArPSAxO1xuXG5cdFx0XHRpZiAoZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9PT0gMHhmZmZmZmZmZiB8fFxuXHRcdFx0XHRlbnRyeS5jb21wcmVzc2VkU2l6ZSA9PT0gMHhmZmZmZmZmZiB8fFxuXHRcdFx0XHRlbnRyeS5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgPT09IDB4ZmZmZmZmZmYpIHtcblx0XHRcdFx0Ly8gWklQNjQgZm9ybWF0XG5cdFx0XHRcdC8vIGZpbmQgdGhlIFppcDY0IEV4dGVuZGVkIEluZm9ybWF0aW9uIEV4dHJhIEZpZWxkXG5cdFx0XHRcdHZhciB6aXA2NEVpZWZCdWZmZXIgPSBudWxsO1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVudHJ5LmV4dHJhRmllbGRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dmFyIGV4dHJhRmllbGQgPSBlbnRyeS5leHRyYUZpZWxkc1tpXTtcblx0XHRcdFx0XHRpZiAoZXh0cmFGaWVsZC5pZCA9PT0gMHgwMDAxKSB7XG5cdFx0XHRcdFx0XHR6aXA2NEVpZWZCdWZmZXIgPSBleHRyYUZpZWxkLmRhdGE7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHppcDY0RWllZkJ1ZmZlciA9PSBudWxsKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IoXCJleHBlY3RlZCB6aXA2NCBleHRlbmRlZCBpbmZvcm1hdGlvbiBleHRyYSBmaWVsZFwiKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGluZGV4ID0gMDtcblx0XHRcdFx0Ly8gMCAtIE9yaWdpbmFsIFNpemUgICAgICAgICAgOCBieXRlc1xuXHRcdFx0XHRpZiAoZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9PT0gMHhmZmZmZmZmZikge1xuXHRcdFx0XHRcdGlmIChpbmRleCArIDggPiB6aXA2NEVpZWZCdWZmZXIubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihcInppcDY0IGV4dGVuZGVkIGluZm9ybWF0aW9uIGV4dHJhIGZpZWxkIGRvZXMgbm90IGluY2x1ZGUgdW5jb21wcmVzc2VkIHNpemVcIikpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbnRyeS51bmNvbXByZXNzZWRTaXplID0gcmVhZFVJbnQ2NExFKHppcDY0RWllZkJ1ZmZlciwgaW5kZXgpO1xuXHRcdFx0XHRcdGluZGV4ICs9IDg7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gOCAtIENvbXByZXNzZWQgU2l6ZSAgICAgICAgOCBieXRlc1xuXHRcdFx0XHRpZiAoZW50cnkuY29tcHJlc3NlZFNpemUgPT09IDB4ZmZmZmZmZmYpIHtcblx0XHRcdFx0XHRpZiAoaW5kZXggKyA4ID4gemlwNjRFaWVmQnVmZmVyLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGVtaXRFcnJvckFuZEF1dG9DbG9zZShzZWxmLCBuZXcgRXJyb3IoXCJ6aXA2NCBleHRlbmRlZCBpbmZvcm1hdGlvbiBleHRyYSBmaWVsZCBkb2VzIG5vdCBpbmNsdWRlIGNvbXByZXNzZWQgc2l6ZVwiKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVudHJ5LmNvbXByZXNzZWRTaXplID0gcmVhZFVJbnQ2NExFKHppcDY0RWllZkJ1ZmZlciwgaW5kZXgpO1xuXHRcdFx0XHRcdGluZGV4ICs9IDg7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gMTYgLSBSZWxhdGl2ZSBIZWFkZXIgT2Zmc2V0IDggYnl0ZXNcblx0XHRcdFx0aWYgKGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9PT0gMHhmZmZmZmZmZikge1xuXHRcdFx0XHRcdGlmIChpbmRleCArIDggPiB6aXA2NEVpZWZCdWZmZXIubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZW1pdEVycm9yQW5kQXV0b0Nsb3NlKHNlbGYsIG5ldyBFcnJvcihcInppcDY0IGV4dGVuZGVkIGluZm9ybWF0aW9uIGV4dHJhIGZpZWxkIGRvZXMgbm90IGluY2x1ZGUgcmVsYXRpdmUgaGVhZGVyIG9mZnNldFwiKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9IHJlYWRVSW50NjRMRSh6aXA2NEVpZWZCdWZmZXIsIGluZGV4KTtcblx0XHRcdFx0XHRpbmRleCArPSA4O1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIDI0IC0gRGlzayBTdGFydCBOdW1iZXIgICAgICA0IGJ5dGVzXG5cdFx0XHR9XG5cblx0XHRcdC8vIGNoZWNrIGZvciBJbmZvLVpJUCBVbmljb2RlIFBhdGggRXh0cmEgRmllbGQgKDB4NzA3NSlcblx0XHRcdC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vdGhlam9zaHdvbGZlL3lhdXpsL2lzc3Vlcy8zM1xuXHRcdFx0aWYgKHNlbGYuZGVjb2RlU3RyaW5ncykge1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVudHJ5LmV4dHJhRmllbGRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dmFyIGV4dHJhRmllbGQgPSBlbnRyeS5leHRyYUZpZWxkc1tpXTtcblx0XHRcdFx0XHRpZiAoZXh0cmFGaWVsZC5pZCA9PT0gMHg3MDc1KSB7XG5cdFx0XHRcdFx0XHRpZiAoZXh0cmFGaWVsZC5kYXRhLmxlbmd0aCA8IDYpIHtcblx0XHRcdFx0XHRcdFx0Ly8gdG9vIHNob3J0IHRvIGJlIG1lYW5pbmdmdWxcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyBWZXJzaW9uICAgICAgIDEgYnl0ZSAgICAgIHZlcnNpb24gb2YgdGhpcyBleHRyYSBmaWVsZCwgY3VycmVudGx5IDFcblx0XHRcdFx0XHRcdGlmIChleHRyYUZpZWxkLmRhdGEucmVhZFVJbnQ4KDApICE9PSAxKSB7XG5cdFx0XHRcdFx0XHRcdC8vID4gQ2hhbmdlcyBtYXkgbm90IGJlIGJhY2t3YXJkIGNvbXBhdGlibGUgc28gdGhpcyBleHRyYVxuXHRcdFx0XHRcdFx0XHQvLyA+IGZpZWxkIHNob3VsZCBub3QgYmUgdXNlZCBpZiB0aGUgdmVyc2lvbiBpcyBub3QgcmVjb2duaXplZC5cblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyBOYW1lQ1JDMzIgICAgIDQgYnl0ZXMgICAgIEZpbGUgTmFtZSBGaWVsZCBDUkMzMiBDaGVja3N1bVxuXHRcdFx0XHRcdFx0dmFyIG9sZE5hbWVDcmMzMiA9IGV4dHJhRmllbGQuZGF0YS5yZWFkVUludDMyTEUoMSk7XG5cdFx0XHRcdFx0XHRpZiAoY3JjMzIudW5zaWduZWQoYnVmZmVyLnNsaWNlKDAsIGVudHJ5LmZpbGVOYW1lTGVuZ3RoKSkgIT09IG9sZE5hbWVDcmMzMikge1xuXHRcdFx0XHRcdFx0XHQvLyA+IElmIHRoZSBDUkMgY2hlY2sgZmFpbHMsIHRoaXMgVVRGLTggUGF0aCBFeHRyYSBGaWVsZCBzaG91bGQgYmVcblx0XHRcdFx0XHRcdFx0Ly8gPiBpZ25vcmVkIGFuZCB0aGUgRmlsZSBOYW1lIGZpZWxkIGluIHRoZSBoZWFkZXIgc2hvdWxkIGJlIHVzZWQgaW5zdGVhZC5cblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyBVbmljb2RlTmFtZSAgIFZhcmlhYmxlICAgIFVURi04IHZlcnNpb24gb2YgdGhlIGVudHJ5IEZpbGUgTmFtZVxuXHRcdFx0XHRcdFx0ZW50cnkuZmlsZU5hbWUgPSBkZWNvZGVCdWZmZXIoZXh0cmFGaWVsZC5kYXRhLCA1LCBleHRyYUZpZWxkLmRhdGEubGVuZ3RoLCB0cnVlKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyB2YWxpZGF0ZSBmaWxlIHNpemVcblx0XHRcdGlmIChzZWxmLnZhbGlkYXRlRW50cnlTaXplcyAmJiBlbnRyeS5jb21wcmVzc2lvbk1ldGhvZCA9PT0gMCkge1xuXHRcdFx0XHR2YXIgZXhwZWN0ZWRDb21wcmVzc2VkU2l6ZSA9IGVudHJ5LnVuY29tcHJlc3NlZFNpemU7XG5cdFx0XHRcdGlmIChlbnRyeS5pc0VuY3J5cHRlZCgpKSB7XG5cdFx0XHRcdFx0Ly8gdHJhZGl0aW9uYWwgZW5jcnlwdGlvbiBwcmVmaXhlcyB0aGUgZmlsZSBkYXRhIHdpdGggYSBoZWFkZXJcblx0XHRcdFx0XHRleHBlY3RlZENvbXByZXNzZWRTaXplICs9IDEyO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChlbnRyeS5jb21wcmVzc2VkU2l6ZSAhPT0gZXhwZWN0ZWRDb21wcmVzc2VkU2l6ZSkge1xuXHRcdFx0XHRcdHZhciBtc2cgPSBcImNvbXByZXNzZWQvdW5jb21wcmVzc2VkIHNpemUgbWlzbWF0Y2ggZm9yIHN0b3JlZCBmaWxlOiBcIiArIGVudHJ5LmNvbXByZXNzZWRTaXplICsgXCIgIT0gXCIgKyBlbnRyeS51bmNvbXByZXNzZWRTaXplO1xuXHRcdFx0XHRcdHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKG1zZykpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChzZWxmLmRlY29kZVN0cmluZ3MpIHtcblx0XHRcdFx0aWYgKCFzZWxmLnN0cmljdEZpbGVOYW1lcykge1xuXHRcdFx0XHRcdC8vIGFsbG93IGJhY2tzbGFzaFxuXHRcdFx0XHRcdGVudHJ5LmZpbGVOYW1lID0gZW50cnkuZmlsZU5hbWUucmVwbGFjZSgvXFxcXC9nLCBcIi9cIik7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGVycm9yTWVzc2FnZSA9IHZhbGlkYXRlRmlsZU5hbWUoZW50cnkuZmlsZU5hbWUsIHNlbGYudmFsaWRhdGVGaWxlTmFtZU9wdGlvbnMpO1xuXHRcdFx0XHRpZiAoZXJyb3JNZXNzYWdlICE9IG51bGwpIHJldHVybiBlbWl0RXJyb3JBbmRBdXRvQ2xvc2Uoc2VsZiwgbmV3IEVycm9yKGVycm9yTWVzc2FnZSkpO1xuXHRcdFx0fVxuXHRcdFx0c2VsZi5lbWl0KFwiZW50cnlcIiwgZW50cnkpO1xuXG5cdFx0XHRpZiAoIXNlbGYubGF6eUVudHJpZXMpIHNlbGYuX3JlYWRFbnRyeSgpO1xuXHRcdH0pO1xuXHR9KTtcbn07XG5cblppcEZpbGUucHJvdG90eXBlLm9wZW5SZWFkU3RyZWFtID0gZnVuY3Rpb24gKGVudHJ5LCBvcHRpb25zLCBjYWxsYmFjaykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdC8vIHBhcmFtZXRlciB2YWxpZGF0aW9uXG5cdHZhciByZWxhdGl2ZVN0YXJ0ID0gMDtcblx0dmFyIHJlbGF0aXZlRW5kID0gZW50cnkuY29tcHJlc3NlZFNpemU7XG5cdGlmIChjYWxsYmFjayA9PSBudWxsKSB7XG5cdFx0Y2FsbGJhY2sgPSBvcHRpb25zO1xuXHRcdG9wdGlvbnMgPSB7fTtcblx0fSBlbHNlIHtcblx0XHQvLyB2YWxpZGF0ZSBvcHRpb25zIHRoYXQgdGhlIGNhbGxlciBoYXMgbm8gZXhjdXNlIHRvIGdldCB3cm9uZ1xuXHRcdGlmIChvcHRpb25zLmRlY3J5cHQgIT0gbnVsbCkge1xuXHRcdFx0aWYgKCFlbnRyeS5pc0VuY3J5cHRlZCgpKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuZGVjcnlwdCBjYW4gb25seSBiZSBzcGVjaWZpZWQgZm9yIGVuY3J5cHRlZCBlbnRyaWVzXCIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKG9wdGlvbnMuZGVjcnlwdCAhPT0gZmFsc2UpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgb3B0aW9ucy5kZWNyeXB0IHZhbHVlOiBcIiArIG9wdGlvbnMuZGVjcnlwdCk7XG5cdFx0XHRpZiAoZW50cnkuaXNDb21wcmVzc2VkKCkpIHtcblx0XHRcdFx0aWYgKG9wdGlvbnMuZGVjb21wcmVzcyAhPT0gZmFsc2UpIHRocm93IG5ldyBFcnJvcihcImVudHJ5IGlzIGVuY3J5cHRlZCBhbmQgY29tcHJlc3NlZCwgYW5kIG9wdGlvbnMuZGVjb21wcmVzcyAhPT0gZmFsc2VcIik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChvcHRpb25zLmRlY29tcHJlc3MgIT0gbnVsbCkge1xuXHRcdFx0aWYgKCFlbnRyeS5pc0NvbXByZXNzZWQoKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLmRlY29tcHJlc3MgY2FuIG9ubHkgYmUgc3BlY2lmaWVkIGZvciBjb21wcmVzc2VkIGVudHJpZXNcIik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIShvcHRpb25zLmRlY29tcHJlc3MgPT09IGZhbHNlIHx8IG9wdGlvbnMuZGVjb21wcmVzcyA9PT0gdHJ1ZSkpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBvcHRpb25zLmRlY29tcHJlc3MgdmFsdWU6IFwiICsgb3B0aW9ucy5kZWNvbXByZXNzKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMuc3RhcnQgIT0gbnVsbCB8fCBvcHRpb25zLmVuZCAhPSBudWxsKSB7XG5cdFx0XHRpZiAoZW50cnkuaXNDb21wcmVzc2VkKCkgJiYgb3B0aW9ucy5kZWNvbXByZXNzICE9PSBmYWxzZSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJzdGFydC9lbmQgcmFuZ2Ugbm90IGFsbG93ZWQgZm9yIGNvbXByZXNzZWQgZW50cnkgd2l0aG91dCBvcHRpb25zLmRlY29tcHJlc3MgPT09IGZhbHNlXCIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGVudHJ5LmlzRW5jcnlwdGVkKCkgJiYgb3B0aW9ucy5kZWNyeXB0ICE9PSBmYWxzZSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJzdGFydC9lbmQgcmFuZ2Ugbm90IGFsbG93ZWQgZm9yIGVuY3J5cHRlZCBlbnRyeSB3aXRob3V0IG9wdGlvbnMuZGVjcnlwdCA9PT0gZmFsc2VcIik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChvcHRpb25zLnN0YXJ0ICE9IG51bGwpIHtcblx0XHRcdHJlbGF0aXZlU3RhcnQgPSBvcHRpb25zLnN0YXJ0O1xuXHRcdFx0aWYgKHJlbGF0aXZlU3RhcnQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLnN0YXJ0IDwgMFwiKTtcblx0XHRcdGlmIChyZWxhdGl2ZVN0YXJ0ID4gZW50cnkuY29tcHJlc3NlZFNpemUpIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuc3RhcnQgPiBlbnRyeS5jb21wcmVzc2VkU2l6ZVwiKTtcblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMuZW5kICE9IG51bGwpIHtcblx0XHRcdHJlbGF0aXZlRW5kID0gb3B0aW9ucy5lbmQ7XG5cdFx0XHRpZiAocmVsYXRpdmVFbmQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLmVuZCA8IDBcIik7XG5cdFx0XHRpZiAocmVsYXRpdmVFbmQgPiBlbnRyeS5jb21wcmVzc2VkU2l6ZSkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5lbmQgPiBlbnRyeS5jb21wcmVzc2VkU2l6ZVwiKTtcblx0XHRcdGlmIChyZWxhdGl2ZUVuZCA8IHJlbGF0aXZlU3RhcnQpIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuZW5kIDwgb3B0aW9ucy5zdGFydFwiKTtcblx0XHR9XG5cdH1cblx0Ly8gYW55IGZ1cnRoZXIgZXJyb3JzIGNhbiBlaXRoZXIgYmUgY2F1c2VkIGJ5IHRoZSB6aXBmaWxlLFxuXHQvLyBvciB3ZXJlIGludHJvZHVjZWQgaW4gYSBtaW5vciB2ZXJzaW9uIG9mIHlhdXpsLFxuXHQvLyBzbyBzaG91bGQgYmUgcGFzc2VkIHRvIHRoZSBjbGllbnQgcmF0aGVyIHRoYW4gdGhyb3duLlxuXHRpZiAoIXNlbGYuaXNPcGVuKSByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFwiY2xvc2VkXCIpKTtcblx0aWYgKGVudHJ5LmlzRW5jcnlwdGVkKCkpIHtcblx0XHRpZiAob3B0aW9ucy5kZWNyeXB0ICE9PSBmYWxzZSkgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImVudHJ5IGlzIGVuY3J5cHRlZCwgYW5kIG9wdGlvbnMuZGVjcnlwdCAhPT0gZmFsc2VcIikpO1xuXHR9XG5cdC8vIG1ha2Ugc3VyZSB3ZSBkb24ndCBsb3NlIHRoZSBmZCBiZWZvcmUgd2Ugb3BlbiB0aGUgYWN0dWFsIHJlYWQgc3RyZWFtXG5cdHNlbGYucmVhZGVyLnJlZigpO1xuXHR2YXIgYnVmZmVyID0gbmV3QnVmZmVyKDMwKTtcblx0cmVhZEFuZEFzc2VydE5vRW9mKHNlbGYucmVhZGVyLCBidWZmZXIsIDAsIGJ1ZmZlci5sZW5ndGgsIGVudHJ5LnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciwgZnVuY3Rpb24gKGVycikge1xuXHRcdHRyeSB7XG5cdFx0XHRpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblx0XHRcdC8vIDAgLSBMb2NhbCBmaWxlIGhlYWRlciBzaWduYXR1cmUgPSAweDA0MDM0YjUwXG5cdFx0XHR2YXIgc2lnbmF0dXJlID0gYnVmZmVyLnJlYWRVSW50MzJMRSgwKTtcblx0XHRcdGlmIChzaWduYXR1cmUgIT09IDB4MDQwMzRiNTApIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImludmFsaWQgbG9jYWwgZmlsZSBoZWFkZXIgc2lnbmF0dXJlOiAweFwiICsgc2lnbmF0dXJlLnRvU3RyaW5nKDE2KSkpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gYWxsIHRoaXMgc2hvdWxkIGJlIHJlZHVuZGFudFxuXHRcdFx0Ly8gNCAtIFZlcnNpb24gbmVlZGVkIHRvIGV4dHJhY3QgKG1pbmltdW0pXG5cdFx0XHQvLyA2IC0gR2VuZXJhbCBwdXJwb3NlIGJpdCBmbGFnXG5cdFx0XHQvLyA4IC0gQ29tcHJlc3Npb24gbWV0aG9kXG5cdFx0XHQvLyAxMCAtIEZpbGUgbGFzdCBtb2RpZmljYXRpb24gdGltZVxuXHRcdFx0Ly8gMTIgLSBGaWxlIGxhc3QgbW9kaWZpY2F0aW9uIGRhdGVcblx0XHRcdC8vIDE0IC0gQ1JDLTMyXG5cdFx0XHQvLyAxOCAtIENvbXByZXNzZWQgc2l6ZVxuXHRcdFx0Ly8gMjIgLSBVbmNvbXByZXNzZWQgc2l6ZVxuXHRcdFx0Ly8gMjYgLSBGaWxlIG5hbWUgbGVuZ3RoIChuKVxuXHRcdFx0dmFyIGZpbGVOYW1lTGVuZ3RoID0gYnVmZmVyLnJlYWRVSW50MTZMRSgyNik7XG5cdFx0XHQvLyAyOCAtIEV4dHJhIGZpZWxkIGxlbmd0aCAobSlcblx0XHRcdHZhciBleHRyYUZpZWxkTGVuZ3RoID0gYnVmZmVyLnJlYWRVSW50MTZMRSgyOCk7XG5cdFx0XHQvLyAzMCAtIEZpbGUgbmFtZVxuXHRcdFx0Ly8gMzArbiAtIEV4dHJhIGZpZWxkXG5cdFx0XHR2YXIgbG9jYWxGaWxlSGVhZGVyRW5kID0gZW50cnkucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyICsgYnVmZmVyLmxlbmd0aCArIGZpbGVOYW1lTGVuZ3RoICsgZXh0cmFGaWVsZExlbmd0aDtcblx0XHRcdHZhciBkZWNvbXByZXNzO1xuXHRcdFx0aWYgKGVudHJ5LmNvbXByZXNzaW9uTWV0aG9kID09PSAwKSB7XG5cdFx0XHRcdC8vIDAgLSBUaGUgZmlsZSBpcyBzdG9yZWQgKG5vIGNvbXByZXNzaW9uKVxuXHRcdFx0XHRkZWNvbXByZXNzID0gZmFsc2U7XG5cdFx0XHR9IGVsc2UgaWYgKGVudHJ5LmNvbXByZXNzaW9uTWV0aG9kID09PSA4KSB7XG5cdFx0XHRcdC8vIDggLSBUaGUgZmlsZSBpcyBEZWZsYXRlZFxuXHRcdFx0XHRkZWNvbXByZXNzID0gb3B0aW9ucy5kZWNvbXByZXNzICE9IG51bGwgPyBvcHRpb25zLmRlY29tcHJlc3MgOiB0cnVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcInVuc3VwcG9ydGVkIGNvbXByZXNzaW9uIG1ldGhvZDogXCIgKyBlbnRyeS5jb21wcmVzc2lvbk1ldGhvZCkpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGZpbGVEYXRhU3RhcnQgPSBsb2NhbEZpbGVIZWFkZXJFbmQ7XG5cdFx0XHR2YXIgZmlsZURhdGFFbmQgPSBmaWxlRGF0YVN0YXJ0ICsgZW50cnkuY29tcHJlc3NlZFNpemU7XG5cdFx0XHRpZiAoZW50cnkuY29tcHJlc3NlZFNpemUgIT09IDApIHtcblx0XHRcdFx0Ly8gYm91bmRzIGNoZWNrIG5vdywgYmVjYXVzZSB0aGUgcmVhZCBzdHJlYW1zIHdpbGwgcHJvYmFibHkgbm90IGNvbXBsYWluIGxvdWQgZW5vdWdoLlxuXHRcdFx0XHQvLyBzaW5jZSB3ZSdyZSBkZWFsaW5nIHdpdGggYW4gdW5zaWduZWQgb2Zmc2V0IHBsdXMgYW4gdW5zaWduZWQgc2l6ZSxcblx0XHRcdFx0Ly8gd2Ugb25seSBoYXZlIDEgdGhpbmcgdG8gY2hlY2sgZm9yLlxuXHRcdFx0XHRpZiAoZmlsZURhdGFFbmQgPiBzZWxmLmZpbGVTaXplKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihcImZpbGUgZGF0YSBvdmVyZmxvd3MgZmlsZSBib3VuZHM6IFwiICtcblx0XHRcdFx0XHRcdGZpbGVEYXRhU3RhcnQgKyBcIiArIFwiICsgZW50cnkuY29tcHJlc3NlZFNpemUgKyBcIiA+IFwiICsgc2VsZi5maWxlU2l6ZSkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHR2YXIgcmVhZFN0cmVhbSA9IHNlbGYucmVhZGVyLmNyZWF0ZVJlYWRTdHJlYW0oe1xuXHRcdFx0XHRzdGFydDogZmlsZURhdGFTdGFydCArIHJlbGF0aXZlU3RhcnQsXG5cdFx0XHRcdGVuZDogZmlsZURhdGFTdGFydCArIHJlbGF0aXZlRW5kLFxuXHRcdFx0fSk7XG5cdFx0XHR2YXIgZW5kcG9pbnRTdHJlYW0gPSByZWFkU3RyZWFtO1xuXHRcdFx0aWYgKGRlY29tcHJlc3MpIHtcblx0XHRcdFx0dmFyIGRlc3Ryb3llZCA9IGZhbHNlO1xuXHRcdFx0XHR2YXIgaW5mbGF0ZUZpbHRlciA9IHpsaWIuY3JlYXRlSW5mbGF0ZVJhdygpO1xuXHRcdFx0XHRyZWFkU3RyZWFtLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0XHRcdC8vIHNldEltbWVkaWF0ZSBoZXJlIGJlY2F1c2UgZXJyb3JzIGNhbiBiZSBlbWl0dGVkIGR1cmluZyB0aGUgZmlyc3QgY2FsbCB0byBwaXBlKClcblx0XHRcdFx0XHRzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKCFkZXN0cm95ZWQpIGluZmxhdGVGaWx0ZXIuZW1pdChcImVycm9yXCIsIGVycik7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZWFkU3RyZWFtLnBpcGUoaW5mbGF0ZUZpbHRlcik7XG5cblx0XHRcdFx0aWYgKHNlbGYudmFsaWRhdGVFbnRyeVNpemVzKSB7XG5cdFx0XHRcdFx0ZW5kcG9pbnRTdHJlYW0gPSBuZXcgQXNzZXJ0Qnl0ZUNvdW50U3RyZWFtKGVudHJ5LnVuY29tcHJlc3NlZFNpemUpO1xuXHRcdFx0XHRcdGluZmxhdGVGaWx0ZXIub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0XHRcdFx0XHQvLyBmb3J3YXJkIHpsaWIgZXJyb3JzIHRvIHRoZSBjbGllbnQtdmlzaWJsZSBzdHJlYW1cblx0XHRcdFx0XHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdGlmICghZGVzdHJveWVkKSBlbmRwb2ludFN0cmVhbS5lbWl0KFwiZXJyb3JcIiwgZXJyKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGluZmxhdGVGaWx0ZXIucGlwZShlbmRwb2ludFN0cmVhbSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gdGhlIHpsaWIgZmlsdGVyIGlzIHRoZSBjbGllbnQtdmlzaWJsZSBzdHJlYW1cblx0XHRcdFx0XHRlbmRwb2ludFN0cmVhbSA9IGluZmxhdGVGaWx0ZXI7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gdGhpcyBpcyBwYXJ0IG9mIHlhdXpsJ3MgQVBJLCBzbyBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBvbiB0aGUgY2xpZW50LXZpc2libGUgc3RyZWFtXG5cdFx0XHRcdGVuZHBvaW50U3RyZWFtLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0ZGVzdHJveWVkID0gdHJ1ZTtcblx0XHRcdFx0XHRpZiAoaW5mbGF0ZUZpbHRlciAhPT0gZW5kcG9pbnRTdHJlYW0pIGluZmxhdGVGaWx0ZXIudW5waXBlKGVuZHBvaW50U3RyZWFtKTtcblx0XHRcdFx0XHRyZWFkU3RyZWFtLnVucGlwZShpbmZsYXRlRmlsdGVyKTtcblx0XHRcdFx0XHQvLyBUT0RPOiB0aGUgaW5mbGF0ZUZpbHRlciBtYXkgY2F1c2UgYSBtZW1vcnkgbGVhay4gc2VlIElzc3VlICMyNy5cblx0XHRcdFx0XHRyZWFkU3RyZWFtLmRlc3Ryb3koKTtcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHRcdGNhbGxiYWNrKG51bGwsIGVuZHBvaW50U3RyZWFtKTtcblx0XHR9IGZpbmFsbHkge1xuXHRcdFx0c2VsZi5yZWFkZXIudW5yZWYoKTtcblx0XHR9XG5cdH0pO1xufTtcblxuZnVuY3Rpb24gRW50cnkoKSB7XG59XG5cbkVudHJ5LnByb3RvdHlwZS5nZXRMYXN0TW9kRGF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIGRvc0RhdGVUaW1lVG9EYXRlKHRoaXMubGFzdE1vZEZpbGVEYXRlLCB0aGlzLmxhc3RNb2RGaWxlVGltZSk7XG59O1xuRW50cnkucHJvdG90eXBlLmlzRW5jcnlwdGVkID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gKHRoaXMuZ2VuZXJhbFB1cnBvc2VCaXRGbGFnICYgMHgxKSAhPT0gMDtcbn07XG5FbnRyeS5wcm90b3R5cGUuaXNDb21wcmVzc2VkID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy5jb21wcmVzc2lvbk1ldGhvZCA9PT0gODtcbn07XG5cbmZ1bmN0aW9uIGRvc0RhdGVUaW1lVG9EYXRlKGRhdGUsIHRpbWUpIHtcblx0dmFyIGRheSA9IGRhdGUgJiAweDFmOyAvLyAxLTMxXG5cdHZhciBtb250aCA9IChkYXRlID4+IDUgJiAweGYpIC0gMTsgLy8gMS0xMiwgMC0xMVxuXHR2YXIgeWVhciA9IChkYXRlID4+IDkgJiAweDdmKSArIDE5ODA7IC8vIDAtMTI4LCAxOTgwLTIxMDhcblxuXHR2YXIgbWlsbGlzZWNvbmQgPSAwO1xuXHR2YXIgc2Vjb25kID0gKHRpbWUgJiAweDFmKSAqIDI7IC8vIDAtMjksIDAtNTggKGV2ZW4gbnVtYmVycylcblx0dmFyIG1pbnV0ZSA9IHRpbWUgPj4gNSAmIDB4M2Y7IC8vIDAtNTlcblx0dmFyIGhvdXIgPSB0aW1lID4+IDExICYgMHgxZjsgLy8gMC0yM1xuXG5cdHJldHVybiBuZXcgRGF0ZSh5ZWFyLCBtb250aCwgZGF5LCBob3VyLCBtaW51dGUsIHNlY29uZCwgbWlsbGlzZWNvbmQpO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUZpbGVOYW1lKGZpbGVOYW1lKSB7XG5cdGlmIChmaWxlTmFtZS5pbmRleE9mKFwiXFxcXFwiKSAhPT0gLTEpIHtcblx0XHRyZXR1cm4gXCJpbnZhbGlkIGNoYXJhY3RlcnMgaW4gZmlsZU5hbWU6IFwiICsgZmlsZU5hbWU7XG5cdH1cblx0aWYgKC9eW2EtekEtWl06Ly50ZXN0KGZpbGVOYW1lKSB8fCAvXlxcLy8udGVzdChmaWxlTmFtZSkpIHtcblx0XHRyZXR1cm4gXCJhYnNvbHV0ZSBwYXRoOiBcIiArIGZpbGVOYW1lO1xuXHR9XG5cdGlmIChmaWxlTmFtZS5zcGxpdChcIi9cIikuaW5kZXhPZihcIi4uXCIpICE9PSAtMSkge1xuXHRcdHJldHVybiBcImludmFsaWQgcmVsYXRpdmUgcGF0aDogXCIgKyBmaWxlTmFtZTtcblx0fVxuXHQvLyBhbGwgZ29vZFxuXHRyZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gcmVhZEFuZEFzc2VydE5vRW9mKHJlYWRlciwgYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrKSB7XG5cdGlmIChsZW5ndGggPT09IDApIHtcblx0XHQvLyBmcy5yZWFkIHdpbGwgdGhyb3cgYW4gb3V0LW9mLWJvdW5kcyBlcnJvciBpZiB5b3UgdHJ5IHRvIHJlYWQgMCBieXRlcyBmcm9tIGEgMCBieXRlIGZpbGVcblx0XHRyZXR1cm4gc2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdGNhbGxiYWNrKG51bGwsIG5ld0J1ZmZlcigwKSk7XG5cdFx0fSk7XG5cdH1cblx0cmVhZGVyLnJlYWQoYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGZ1bmN0aW9uIChlcnIsIGJ5dGVzUmVhZCkge1xuXHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdGlmIChieXRlc1JlYWQgPCBsZW5ndGgpIHtcblx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXCJ1bmV4cGVjdGVkIEVPRlwiKSk7XG5cdFx0fVxuXHRcdGNhbGxiYWNrKCk7XG5cdH0pO1xufVxuXG51dGlsLmluaGVyaXRzKEFzc2VydEJ5dGVDb3VudFN0cmVhbSwgVHJhbnNmb3JtKTtcblxuZnVuY3Rpb24gQXNzZXJ0Qnl0ZUNvdW50U3RyZWFtKGJ5dGVDb3VudCkge1xuXHRUcmFuc2Zvcm0uY2FsbCh0aGlzKTtcblx0dGhpcy5hY3R1YWxCeXRlQ291bnQgPSAwO1xuXHR0aGlzLmV4cGVjdGVkQnl0ZUNvdW50ID0gYnl0ZUNvdW50O1xufVxuXG5Bc3NlcnRCeXRlQ291bnRTdHJlYW0ucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2h1bmssIGVuY29kaW5nLCBjYikge1xuXHR0aGlzLmFjdHVhbEJ5dGVDb3VudCArPSBjaHVuay5sZW5ndGg7XG5cdGlmICh0aGlzLmFjdHVhbEJ5dGVDb3VudCA+IHRoaXMuZXhwZWN0ZWRCeXRlQ291bnQpIHtcblx0XHR2YXIgbXNnID0gXCJ0b28gbWFueSBieXRlcyBpbiB0aGUgc3RyZWFtLiBleHBlY3RlZCBcIiArIHRoaXMuZXhwZWN0ZWRCeXRlQ291bnQgKyBcIi4gZ290IGF0IGxlYXN0IFwiICsgdGhpcy5hY3R1YWxCeXRlQ291bnQ7XG5cdFx0cmV0dXJuIGNiKG5ldyBFcnJvcihtc2cpKTtcblx0fVxuXHRjYihudWxsLCBjaHVuayk7XG59O1xuQXNzZXJ0Qnl0ZUNvdW50U3RyZWFtLnByb3RvdHlwZS5fZmx1c2ggPSBmdW5jdGlvbiAoY2IpIHtcblx0aWYgKHRoaXMuYWN0dWFsQnl0ZUNvdW50IDwgdGhpcy5leHBlY3RlZEJ5dGVDb3VudCkge1xuXHRcdHZhciBtc2cgPSBcIm5vdCBlbm91Z2ggYnl0ZXMgaW4gdGhlIHN0cmVhbS4gZXhwZWN0ZWQgXCIgKyB0aGlzLmV4cGVjdGVkQnl0ZUNvdW50ICsgXCIuIGdvdCBvbmx5IFwiICsgdGhpcy5hY3R1YWxCeXRlQ291bnQ7XG5cdFx0cmV0dXJuIGNiKG5ldyBFcnJvcihtc2cpKTtcblx0fVxuXHRjYigpO1xufTtcblxudXRpbC5pbmhlcml0cyhSYW5kb21BY2Nlc3NSZWFkZXIsIEV2ZW50RW1pdHRlcik7XG5cbmZ1bmN0aW9uIFJhbmRvbUFjY2Vzc1JlYWRlcigpIHtcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cdHRoaXMucmVmQ291bnQgPSAwO1xufVxuXG5SYW5kb21BY2Nlc3NSZWFkZXIucHJvdG90eXBlLnJlZiA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5yZWZDb3VudCArPSAxO1xufTtcblJhbmRvbUFjY2Vzc1JlYWRlci5wcm90b3R5cGUudW5yZWYgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0c2VsZi5yZWZDb3VudCAtPSAxO1xuXG5cdGlmIChzZWxmLnJlZkNvdW50ID4gMCkgcmV0dXJuO1xuXHRpZiAoc2VsZi5yZWZDb3VudCA8IDApIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgdW5yZWZcIik7XG5cblx0c2VsZi5jbG9zZShvbkNsb3NlRG9uZSk7XG5cblx0ZnVuY3Rpb24gb25DbG9zZURvbmUoZXJyKSB7XG5cdFx0aWYgKGVycikgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuXHRcdHNlbGYuZW1pdCgnY2xvc2UnKTtcblx0fVxufTtcblJhbmRvbUFjY2Vzc1JlYWRlci5wcm90b3R5cGUuY3JlYXRlUmVhZFN0cmVhbSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cdHZhciBzdGFydCA9IG9wdGlvbnMuc3RhcnQ7XG5cdHZhciBlbmQgPSBvcHRpb25zLmVuZDtcblx0aWYgKHN0YXJ0ID09PSBlbmQpIHtcblx0XHR2YXIgZW1wdHlTdHJlYW0gPSBuZXcgUGFzc1Rocm91Z2goKTtcblx0XHRzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0ZW1wdHlTdHJlYW0uZW5kKCk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGVtcHR5U3RyZWFtO1xuXHR9XG5cdHZhciBzdHJlYW0gPSB0aGlzLl9yZWFkU3RyZWFtRm9yUmFuZ2Uoc3RhcnQsIGVuZCk7XG5cblx0dmFyIGRlc3Ryb3llZCA9IGZhbHNlO1xuXHR2YXIgcmVmVW5yZWZGaWx0ZXIgPSBuZXcgUmVmVW5yZWZGaWx0ZXIodGhpcyk7XG5cdHN0cmVhbS5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChlcnIpIHtcblx0XHRzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCFkZXN0cm95ZWQpIHJlZlVucmVmRmlsdGVyLmVtaXQoXCJlcnJvclwiLCBlcnIpO1xuXHRcdH0pO1xuXHR9KTtcblx0cmVmVW5yZWZGaWx0ZXIuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcblx0XHRzdHJlYW0udW5waXBlKHJlZlVucmVmRmlsdGVyKTtcblx0XHRyZWZVbnJlZkZpbHRlci51bnJlZigpO1xuXHRcdHN0cmVhbS5kZXN0cm95KCk7XG5cdH07XG5cblx0dmFyIGJ5dGVDb3VudGVyID0gbmV3IEFzc2VydEJ5dGVDb3VudFN0cmVhbShlbmQgLSBzdGFydCk7XG5cdHJlZlVucmVmRmlsdGVyLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycikge1xuXHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoIWRlc3Ryb3llZCkgYnl0ZUNvdW50ZXIuZW1pdChcImVycm9yXCIsIGVycik7XG5cdFx0fSk7XG5cdH0pO1xuXHRieXRlQ291bnRlci5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuXHRcdGRlc3Ryb3llZCA9IHRydWU7XG5cdFx0cmVmVW5yZWZGaWx0ZXIudW5waXBlKGJ5dGVDb3VudGVyKTtcblx0XHRyZWZVbnJlZkZpbHRlci5kZXN0cm95KCk7XG5cdH07XG5cblx0cmV0dXJuIHN0cmVhbS5waXBlKHJlZlVucmVmRmlsdGVyKS5waXBlKGJ5dGVDb3VudGVyKTtcbn07XG5SYW5kb21BY2Nlc3NSZWFkZXIucHJvdG90eXBlLl9yZWFkU3RyZWFtRm9yUmFuZ2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuXHR0aHJvdyBuZXcgRXJyb3IoXCJub3QgaW1wbGVtZW50ZWRcIik7XG59O1xuUmFuZG9tQWNjZXNzUmVhZGVyLnByb3RvdHlwZS5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaykge1xuXHR2YXIgcmVhZFN0cmVhbSA9IHRoaXMuY3JlYXRlUmVhZFN0cmVhbSh7c3RhcnQ6IHBvc2l0aW9uLCBlbmQ6IHBvc2l0aW9uICsgbGVuZ3RofSk7XG5cdHZhciB3cml0ZVN0cmVhbSA9IG5ldyBXcml0YWJsZSgpO1xuXHR2YXIgd3JpdHRlbiA9IDA7XG5cdHdyaXRlU3RyZWFtLl93cml0ZSA9IGZ1bmN0aW9uIChjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG5cdFx0Y2h1bmsuY29weShidWZmZXIsIG9mZnNldCArIHdyaXR0ZW4sIDAsIGNodW5rLmxlbmd0aCk7XG5cdFx0d3JpdHRlbiArPSBjaHVuay5sZW5ndGg7XG5cdFx0Y2IoKTtcblx0fTtcblx0d3JpdGVTdHJlYW0ub24oXCJmaW5pc2hcIiwgY2FsbGJhY2spO1xuXHRyZWFkU3RyZWFtLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycm9yKSB7XG5cdFx0Y2FsbGJhY2soZXJyb3IpO1xuXHR9KTtcblx0cmVhZFN0cmVhbS5waXBlKHdyaXRlU3RyZWFtKTtcbn07XG5SYW5kb21BY2Nlc3NSZWFkZXIucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cdHNldEltbWVkaWF0ZShjYWxsYmFjayk7XG59O1xuXG51dGlsLmluaGVyaXRzKFJlZlVucmVmRmlsdGVyLCBQYXNzVGhyb3VnaCk7XG5cbmZ1bmN0aW9uIFJlZlVucmVmRmlsdGVyKGNvbnRleHQpIHtcblx0UGFzc1Rocm91Z2guY2FsbCh0aGlzKTtcblx0dGhpcy5jb250ZXh0ID0gY29udGV4dDtcblx0dGhpcy5jb250ZXh0LnJlZigpO1xuXHR0aGlzLnVucmVmZmVkWWV0ID0gZmFsc2U7XG59XG5cblJlZlVucmVmRmlsdGVyLnByb3RvdHlwZS5fZmx1c2ggPSBmdW5jdGlvbiAoY2IpIHtcblx0dGhpcy51bnJlZigpO1xuXHRjYigpO1xufTtcblJlZlVucmVmRmlsdGVyLnByb3RvdHlwZS51bnJlZiA9IGZ1bmN0aW9uIChjYikge1xuXHRpZiAodGhpcy51bnJlZmZlZFlldCkgcmV0dXJuO1xuXHR0aGlzLnVucmVmZmVkWWV0ID0gdHJ1ZTtcblx0dGhpcy5jb250ZXh0LnVucmVmKCk7XG59O1xuXG52YXIgY3A0MzcgPSAnXFx1MDAwMOKYuuKYu+KZpeKZpuKZo+KZoOKAouKXmOKXi+KXmeKZguKZgOKZquKZq+KYvOKWuuKXhOKGleKAvMK2wqfilqzihqjihpHihpPihpLihpDiiJ/ihpTilrLilrwgIVwiIyQlJlxcJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXFxcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fuKMgsOHw7zDqcOiw6TDoMOlw6fDqsOrw6jDr8Ouw6zDhMOFw4nDpsOGw7TDtsOyw7vDucO/w5bDnMKiwqPCpeKCp8aSw6HDrcOzw7rDscORwqrCusK/4oyQwqzCvcK8wqHCq8K74paR4paS4paT4pSC4pSk4pWh4pWi4pWW4pWV4pWj4pWR4pWX4pWd4pWc4pWb4pSQ4pSU4pS04pSs4pSc4pSA4pS84pWe4pWf4pWa4pWU4pWp4pWm4pWg4pWQ4pWs4pWn4pWo4pWk4pWl4pWZ4pWY4pWS4pWT4pWr4pWq4pSY4pSM4paI4paE4paM4paQ4paAzrHDn86Tz4DOo8+DwrXPhM6mzpjOqc604oiez4bOteKIqeKJocKx4oml4omk4oyg4oyhw7fiiYjCsOKImcK34oia4oG/wrLilqDCoCc7XG5cbmZ1bmN0aW9uIGRlY29kZUJ1ZmZlcihidWZmZXIsIHN0YXJ0LCBlbmQsIGlzVXRmOCkge1xuXHRpZiAoaXNVdGY4KSB7XG5cdFx0cmV0dXJuIGJ1ZmZlci50b1N0cmluZyhcInV0ZjhcIiwgc3RhcnQsIGVuZCk7XG5cdH0gZWxzZSB7XG5cdFx0dmFyIHJlc3VsdCA9IFwiXCI7XG5cdFx0Zm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcblx0XHRcdHJlc3VsdCArPSBjcDQzN1tidWZmZXJbaV1dO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJlYWRVSW50NjRMRShidWZmZXIsIG9mZnNldCkge1xuXHQvLyB0aGVyZSBpcyBubyBuYXRpdmUgZnVuY3Rpb24gZm9yIHRoaXMsIGJlY2F1c2Ugd2UgY2FuJ3QgYWN0dWFsbHkgc3RvcmUgNjQtYml0IGludGVnZXJzIHByZWNpc2VseS5cblx0Ly8gYWZ0ZXIgNTMgYml0cywgSmF2YVNjcmlwdCdzIE51bWJlciB0eXBlIChJRUVFIDc1NCBkb3VibGUpIGNhbid0IHN0b3JlIGluZGl2aWR1YWwgaW50ZWdlcnMgYW55bW9yZS5cblx0Ly8gYnV0IHNpbmNlIDUzIGJpdHMgaXMgYSB3aG9sZSBsb3QgbW9yZSB0aGFuIDMyIGJpdHMsIHdlIGRvIG91ciBiZXN0IGFueXdheS5cblx0dmFyIGxvd2VyMzIgPSBidWZmZXIucmVhZFVJbnQzMkxFKG9mZnNldCk7XG5cdHZhciB1cHBlcjMyID0gYnVmZmVyLnJlYWRVSW50MzJMRShvZmZzZXQgKyA0KTtcblx0Ly8gd2UgY2FuJ3QgdXNlIGJpdHNoaWZ0aW5nIGhlcmUsIGJlY2F1c2UgSmF2YVNjcmlwdCBiaXRzaGlmdGluZyBvbmx5IHdvcmtzIG9uIDMyLWJpdCBpbnRlZ2Vycy5cblx0cmV0dXJuIHVwcGVyMzIgKiAweDEwMDAwMDAwMCArIGxvd2VyMzI7XG5cdC8vIGFzIGxvbmcgYXMgd2UncmUgYm91bmRzIGNoZWNraW5nIHRoZSByZXN1bHQgb2YgdGhpcyBmdW5jdGlvbiBhZ2FpbnN0IHRoZSB0b3RhbCBmaWxlIHNpemUsXG5cdC8vIHdlJ2xsIGNhdGNoIGFueSBvdmVyZmxvdyBlcnJvcnMsIGJlY2F1c2Ugd2UgYWxyZWFkeSBtYWRlIHN1cmUgdGhlIHRvdGFsIGZpbGUgc2l6ZSB3YXMgd2l0aGluIHJlYXNvbi5cbn1cblxuLy8gTm9kZSAxMCBkZXByZWNhdGVkIG5ldyBCdWZmZXIoKS5cbnZhciBuZXdCdWZmZXI7XG5pZiAodHlwZW9mIEJ1ZmZlci5hbGxvY1Vuc2FmZSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdG5ld0J1ZmZlciA9IGZ1bmN0aW9uIChsZW4pIHtcblx0XHRyZXR1cm4gQnVmZmVyLmFsbG9jVW5zYWZlKGxlbik7XG5cdH07XG59IGVsc2Uge1xuXHRuZXdCdWZmZXIgPSBmdW5jdGlvbiAobGVuKSB7XG5cdFx0cmV0dXJuIG5ldyBCdWZmZXIobGVuKTtcblx0fTtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdENhbGxiYWNrKGVycikge1xuXHRpZiAoZXJyKSB0aHJvdyBlcnI7XG59XG4iLCJ2YXIgZnMgPSByZXF1aXJlKFwiZnNcIik7XG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZShcInN0cmVhbVwiKS5UcmFuc2Zvcm07XG52YXIgUGFzc1Rocm91Z2ggPSByZXF1aXJlKFwic3RyZWFtXCIpLlBhc3NUaHJvdWdoO1xudmFyIHpsaWIgPSByZXF1aXJlKFwiemxpYlwiKTtcbnZhciB1dGlsID0gcmVxdWlyZShcInV0aWxcIik7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXI7XG52YXIgY3JjMzIgPSByZXF1aXJlKFwiYnVmZmVyLWNyYzMyXCIpO1xuXG5leHBvcnRzLlppcEZpbGUgPSBaaXBGaWxlO1xuZXhwb3J0cy5kYXRlVG9Eb3NEYXRlVGltZSA9IGRhdGVUb0Rvc0RhdGVUaW1lO1xuXG51dGlsLmluaGVyaXRzKFppcEZpbGUsIEV2ZW50RW1pdHRlcik7XG5cbmZ1bmN0aW9uIFppcEZpbGUoKSB7XG5cdHRoaXMub3V0cHV0U3RyZWFtID0gbmV3IFBhc3NUaHJvdWdoKCk7XG5cdHRoaXMuZW50cmllcyA9IFtdO1xuXHR0aGlzLm91dHB1dFN0cmVhbUN1cnNvciA9IDA7XG5cdHRoaXMuZW5kZWQgPSBmYWxzZTsgLy8gLmVuZCgpIHNldHMgdGhpc1xuXHR0aGlzLmFsbERvbmUgPSBmYWxzZTsgLy8gc2V0IHdoZW4gd2UndmUgd3JpdHRlbiB0aGUgbGFzdCBieXRlc1xuXHR0aGlzLmZvcmNlWmlwNjRFb2NkID0gZmFsc2U7IC8vIGNvbmZpZ3VyYWJsZSBpbiAuZW5kKClcbn1cblxuWmlwRmlsZS5wcm90b3R5cGUuYWRkRmlsZSA9IGZ1bmN0aW9uIChyZWFsUGF0aCwgbWV0YWRhdGFQYXRoLCBvcHRpb25zKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0bWV0YWRhdGFQYXRoID0gdmFsaWRhdGVNZXRhZGF0YVBhdGgobWV0YWRhdGFQYXRoLCBmYWxzZSk7XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblxuXHR2YXIgZW50cnkgPSBuZXcgRW50cnkobWV0YWRhdGFQYXRoLCBmYWxzZSwgb3B0aW9ucyk7XG5cdHNlbGYuZW50cmllcy5wdXNoKGVudHJ5KTtcblx0ZnMuc3RhdChyZWFsUGF0aCwgZnVuY3Rpb24gKGVyciwgc3RhdHMpIHtcblx0XHRpZiAoZXJyKSByZXR1cm4gc2VsZi5lbWl0KFwiZXJyb3JcIiwgZXJyKTtcblx0XHRpZiAoIXN0YXRzLmlzRmlsZSgpKSByZXR1cm4gc2VsZi5lbWl0KFwiZXJyb3JcIiwgbmV3IEVycm9yKFwibm90IGEgZmlsZTogXCIgKyByZWFsUGF0aCkpO1xuXHRcdGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPSBzdGF0cy5zaXplO1xuXHRcdGlmIChvcHRpb25zLm10aW1lID09IG51bGwpIGVudHJ5LnNldExhc3RNb2REYXRlKHN0YXRzLm10aW1lKTtcblx0XHRpZiAob3B0aW9ucy5tb2RlID09IG51bGwpIGVudHJ5LnNldEZpbGVBdHRyaWJ1dGVzTW9kZShzdGF0cy5tb2RlKTtcblx0XHRlbnRyeS5zZXRGaWxlRGF0YVB1bXBGdW5jdGlvbihmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgcmVhZFN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0ocmVhbFBhdGgpO1xuXHRcdFx0ZW50cnkuc3RhdGUgPSBFbnRyeS5GSUxFX0RBVEFfSU5fUFJPR1JFU1M7XG5cdFx0XHRyZWFkU3RyZWFtLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycikge1xuXHRcdFx0XHRzZWxmLmVtaXQoXCJlcnJvclwiLCBlcnIpO1xuXHRcdFx0fSk7XG5cdFx0XHRwdW1wRmlsZURhdGFSZWFkU3RyZWFtKHNlbGYsIGVudHJ5LCByZWFkU3RyZWFtKTtcblx0XHR9KTtcblx0XHRwdW1wRW50cmllcyhzZWxmKTtcblx0fSk7XG59O1xuXG5aaXBGaWxlLnByb3RvdHlwZS5hZGRSZWFkU3RyZWFtID0gZnVuY3Rpb24gKHJlYWRTdHJlYW0sIG1ldGFkYXRhUGF0aCwgb3B0aW9ucykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdG1ldGFkYXRhUGF0aCA9IHZhbGlkYXRlTWV0YWRhdGFQYXRoKG1ldGFkYXRhUGF0aCwgZmFsc2UpO1xuXHRpZiAob3B0aW9ucyA9PSBudWxsKSBvcHRpb25zID0ge307XG5cdHZhciBlbnRyeSA9IG5ldyBFbnRyeShtZXRhZGF0YVBhdGgsIGZhbHNlLCBvcHRpb25zKTtcblx0c2VsZi5lbnRyaWVzLnB1c2goZW50cnkpO1xuXHRlbnRyeS5zZXRGaWxlRGF0YVB1bXBGdW5jdGlvbihmdW5jdGlvbiAoKSB7XG5cdFx0ZW50cnkuc3RhdGUgPSBFbnRyeS5GSUxFX0RBVEFfSU5fUFJPR1JFU1M7XG5cdFx0cHVtcEZpbGVEYXRhUmVhZFN0cmVhbShzZWxmLCBlbnRyeSwgcmVhZFN0cmVhbSk7XG5cdH0pO1xuXHRwdW1wRW50cmllcyhzZWxmKTtcbn07XG5cblppcEZpbGUucHJvdG90eXBlLmFkZEJ1ZmZlciA9IGZ1bmN0aW9uIChidWZmZXIsIG1ldGFkYXRhUGF0aCwgb3B0aW9ucykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdG1ldGFkYXRhUGF0aCA9IHZhbGlkYXRlTWV0YWRhdGFQYXRoKG1ldGFkYXRhUGF0aCwgZmFsc2UpO1xuXHRpZiAoYnVmZmVyLmxlbmd0aCA+IDB4M2ZmZmZmZmYpIHRocm93IG5ldyBFcnJvcihcImJ1ZmZlciB0b28gbGFyZ2U6IFwiICsgYnVmZmVyLmxlbmd0aCArIFwiID4gXCIgKyAweDNmZmZmZmZmKTtcblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXHRpZiAob3B0aW9ucy5zaXplICE9IG51bGwpIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuc2l6ZSBub3QgYWxsb3dlZFwiKTtcblx0dmFyIGVudHJ5ID0gbmV3IEVudHJ5KG1ldGFkYXRhUGF0aCwgZmFsc2UsIG9wdGlvbnMpO1xuXHRlbnRyeS51bmNvbXByZXNzZWRTaXplID0gYnVmZmVyLmxlbmd0aDtcblx0ZW50cnkuY3JjMzIgPSBjcmMzMi51bnNpZ25lZChidWZmZXIpO1xuXHRlbnRyeS5jcmNBbmRGaWxlU2l6ZUtub3duID0gdHJ1ZTtcblx0c2VsZi5lbnRyaWVzLnB1c2goZW50cnkpO1xuXHRpZiAoIWVudHJ5LmNvbXByZXNzKSB7XG5cdFx0c2V0Q29tcHJlc3NlZEJ1ZmZlcihidWZmZXIpO1xuXHR9IGVsc2Uge1xuXHRcdHpsaWIuZGVmbGF0ZVJhdyhidWZmZXIsIGZ1bmN0aW9uIChlcnIsIGNvbXByZXNzZWRCdWZmZXIpIHtcblx0XHRcdHNldENvbXByZXNzZWRCdWZmZXIoY29tcHJlc3NlZEJ1ZmZlcik7XG5cdFx0XHRcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNldENvbXByZXNzZWRCdWZmZXIoY29tcHJlc3NlZEJ1ZmZlcikge1xuXHRcdGVudHJ5LmNvbXByZXNzZWRTaXplID0gY29tcHJlc3NlZEJ1ZmZlci5sZW5ndGg7XG5cdFx0ZW50cnkuc2V0RmlsZURhdGFQdW1wRnVuY3Rpb24oZnVuY3Rpb24gKCkge1xuXHRcdFx0d3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBjb21wcmVzc2VkQnVmZmVyKTtcblx0XHRcdHdyaXRlVG9PdXRwdXRTdHJlYW0oc2VsZiwgZW50cnkuZ2V0RGF0YURlc2NyaXB0b3IoKSk7XG5cdFx0XHRlbnRyeS5zdGF0ZSA9IEVudHJ5LkZJTEVfREFUQV9ET05FO1xuXG5cdFx0XHQvLyBkb24ndCBjYWxsIHB1bXBFbnRyaWVzKCkgcmVjdXJzaXZlbHkuXG5cdFx0XHQvLyAoYWxzbywgZG9uJ3QgY2FsbCBwcm9jZXNzLm5leHRUaWNrIHJlY3Vyc2l2ZWx5Lilcblx0XHRcdHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHB1bXBFbnRyaWVzKHNlbGYpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0cHVtcEVudHJpZXMoc2VsZik7XG5cdH1cbn07XG5cblxuWmlwRmlsZS5wcm90b3R5cGUuYWRkRW1wdHlEaXJlY3RvcnkgPSBmdW5jdGlvbiAobWV0YWRhdGFQYXRoLCBvcHRpb25zKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0bWV0YWRhdGFQYXRoID0gdmFsaWRhdGVNZXRhZGF0YVBhdGgobWV0YWRhdGFQYXRoLCB0cnVlKTtcblx0aWYgKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXHRpZiAob3B0aW9ucy5zaXplICE9IG51bGwpIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMuc2l6ZSBub3QgYWxsb3dlZFwiKTtcblx0aWYgKG9wdGlvbnMuY29tcHJlc3MgIT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5jb21wcmVzcyBub3QgYWxsb3dlZFwiKTtcblx0dmFyIGVudHJ5ID0gbmV3IEVudHJ5KG1ldGFkYXRhUGF0aCwgdHJ1ZSwgb3B0aW9ucyk7XG5cdHNlbGYuZW50cmllcy5wdXNoKGVudHJ5KTtcblx0ZW50cnkuc2V0RmlsZURhdGFQdW1wRnVuY3Rpb24oZnVuY3Rpb24gKCkge1xuXHRcdHdyaXRlVG9PdXRwdXRTdHJlYW0oc2VsZiwgZW50cnkuZ2V0RGF0YURlc2NyaXB0b3IoKSk7XG5cdFx0ZW50cnkuc3RhdGUgPSBFbnRyeS5GSUxFX0RBVEFfRE9ORTtcblx0XHRwdW1wRW50cmllcyhzZWxmKTtcblx0fSk7XG5cdHB1bXBFbnRyaWVzKHNlbGYpO1xufTtcblxuWmlwRmlsZS5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKG9wdGlvbnMsIGZpbmFsU2l6ZUNhbGxiYWNrKSB7XG5cdGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0ZmluYWxTaXplQ2FsbGJhY2sgPSBvcHRpb25zO1xuXHRcdG9wdGlvbnMgPSBudWxsO1xuXHR9XG5cdGlmIChvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblx0aWYgKHRoaXMuZW5kZWQpIHJldHVybjtcblx0dGhpcy5lbmRlZCA9IHRydWU7XG5cdHRoaXMuZmluYWxTaXplQ2FsbGJhY2sgPSBmaW5hbFNpemVDYWxsYmFjaztcblx0dGhpcy5mb3JjZVppcDY0RW9jZCA9ICEhb3B0aW9ucy5mb3JjZVppcDY0Rm9ybWF0O1xuXHRwdW1wRW50cmllcyh0aGlzKTtcbn07XG5cbmZ1bmN0aW9uIHdyaXRlVG9PdXRwdXRTdHJlYW0oc2VsZiwgYnVmZmVyKSB7XG5cdHNlbGYub3V0cHV0U3RyZWFtLndyaXRlKGJ1ZmZlcik7XG5cdHNlbGYub3V0cHV0U3RyZWFtQ3Vyc29yICs9IGJ1ZmZlci5sZW5ndGg7XG59XG5cbmZ1bmN0aW9uIHB1bXBGaWxlRGF0YVJlYWRTdHJlYW0oc2VsZiwgZW50cnksIHJlYWRTdHJlYW0pIHtcblx0dmFyIGNyYzMyV2F0Y2hlciA9IG5ldyBDcmMzMldhdGNoZXIoKTtcblx0dmFyIHVuY29tcHJlc3NlZFNpemVDb3VudGVyID0gbmV3IEJ5dGVDb3VudGVyKCk7XG5cdHZhciBjb21wcmVzc29yID0gZW50cnkuY29tcHJlc3MgPyBuZXcgemxpYi5EZWZsYXRlUmF3KCkgOiBuZXcgUGFzc1Rocm91Z2goKTtcblx0dmFyIGNvbXByZXNzZWRTaXplQ291bnRlciA9IG5ldyBCeXRlQ291bnRlcigpO1xuXHRyZWFkU3RyZWFtLnBpcGUoY3JjMzJXYXRjaGVyKVxuXHRcdC5waXBlKHVuY29tcHJlc3NlZFNpemVDb3VudGVyKVxuXHRcdC5waXBlKGNvbXByZXNzb3IpXG5cdFx0LnBpcGUoY29tcHJlc3NlZFNpemVDb3VudGVyKVxuXHRcdC5waXBlKHNlbGYub3V0cHV0U3RyZWFtLCB7ZW5kOiBmYWxzZX0pO1xuXHRjb21wcmVzc2VkU2l6ZUNvdW50ZXIub24oXCJlbmRcIiwgZnVuY3Rpb24gKCkge1xuXHRcdGVudHJ5LmNyYzMyID0gY3JjMzJXYXRjaGVyLmNyYzMyO1xuXHRcdGlmIChlbnRyeS51bmNvbXByZXNzZWRTaXplID09IG51bGwpIHtcblx0XHRcdGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPSB1bmNvbXByZXNzZWRTaXplQ291bnRlci5ieXRlQ291bnQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChlbnRyeS51bmNvbXByZXNzZWRTaXplICE9PSB1bmNvbXByZXNzZWRTaXplQ291bnRlci5ieXRlQ291bnQpIHJldHVybiBzZWxmLmVtaXQoXCJlcnJvclwiLCBuZXcgRXJyb3IoXCJmaWxlIGRhdGEgc3RyZWFtIGhhcyB1bmV4cGVjdGVkIG51bWJlciBvZiBieXRlc1wiKSk7XG5cdFx0fVxuXHRcdGVudHJ5LmNvbXByZXNzZWRTaXplID0gY29tcHJlc3NlZFNpemVDb3VudGVyLmJ5dGVDb3VudDtcblx0XHRzZWxmLm91dHB1dFN0cmVhbUN1cnNvciArPSBlbnRyeS5jb21wcmVzc2VkU2l6ZTtcblx0XHR3cml0ZVRvT3V0cHV0U3RyZWFtKHNlbGYsIGVudHJ5LmdldERhdGFEZXNjcmlwdG9yKCkpO1xuXHRcdGVudHJ5LnN0YXRlID0gRW50cnkuRklMRV9EQVRBX0RPTkU7XG5cdFx0cHVtcEVudHJpZXMoc2VsZik7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBwdW1wRW50cmllcyhzZWxmKSB7XG5cdGlmIChzZWxmLmFsbERvbmUpIHJldHVybjtcblx0Ly8gZmlyc3QgY2hlY2sgaWYgZmluYWxTaXplIGlzIGZpbmFsbHkga25vd25cblx0aWYgKHNlbGYuZW5kZWQgJiYgc2VsZi5maW5hbFNpemVDYWxsYmFjayAhPSBudWxsKSB7XG5cdFx0dmFyIGZpbmFsU2l6ZSA9IGNhbGN1bGF0ZUZpbmFsU2l6ZShzZWxmKTtcblx0XHRpZiAoZmluYWxTaXplICE9IG51bGwpIHtcblx0XHRcdC8vIHdlIGhhdmUgYW4gYW5zd2VyXG5cdFx0XHRzZWxmLmZpbmFsU2l6ZUNhbGxiYWNrKGZpbmFsU2l6ZSk7XG5cdFx0XHRzZWxmLmZpbmFsU2l6ZUNhbGxiYWNrID0gbnVsbDtcblx0XHR9XG5cdH1cblxuXHQvLyBwdW1wIGVudHJpZXNcblx0dmFyIGVudHJ5ID0gZ2V0Rmlyc3ROb3REb25lRW50cnkoKTtcblxuXHRmdW5jdGlvbiBnZXRGaXJzdE5vdERvbmVFbnRyeSgpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuZW50cmllcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGVudHJ5ID0gc2VsZi5lbnRyaWVzW2ldO1xuXHRcdFx0aWYgKGVudHJ5LnN0YXRlIDwgRW50cnkuRklMRV9EQVRBX0RPTkUpIHJldHVybiBlbnRyeTtcblx0XHR9XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRpZiAoZW50cnkgIT0gbnVsbCkge1xuXHRcdC8vIHRoaXMgZW50cnkgaXMgbm90IGRvbmUgeWV0XG5cdFx0aWYgKGVudHJ5LnN0YXRlIDwgRW50cnkuUkVBRFlfVE9fUFVNUF9GSUxFX0RBVEEpIHJldHVybjsgLy8gaW5wdXQgZmlsZSBub3Qgb3BlbiB5ZXRcblx0XHRpZiAoZW50cnkuc3RhdGUgPT09IEVudHJ5LkZJTEVfREFUQV9JTl9QUk9HUkVTUykgcmV0dXJuOyAvLyB3ZSdsbCBnZXQgdGhlcmVcblx0XHQvLyBzdGFydCB3aXRoIGxvY2FsIGZpbGUgaGVhZGVyXG5cdFx0ZW50cnkucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyID0gc2VsZi5vdXRwdXRTdHJlYW1DdXJzb3I7XG5cdFx0dmFyIGxvY2FsRmlsZUhlYWRlciA9IGVudHJ5LmdldExvY2FsRmlsZUhlYWRlcigpO1xuXHRcdHdyaXRlVG9PdXRwdXRTdHJlYW0oc2VsZiwgbG9jYWxGaWxlSGVhZGVyKTtcblx0XHRlbnRyeS5kb0ZpbGVEYXRhUHVtcCgpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIGFsbCBjb3VnaHQgdXAgb24gd3JpdGluZyBlbnRyaWVzXG5cdFx0aWYgKHNlbGYuZW5kZWQpIHtcblx0XHRcdC8vIGhlYWQgZm9yIHRoZSBleGl0XG5cdFx0XHRzZWxmLm9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3RvcnkgPSBzZWxmLm91dHB1dFN0cmVhbUN1cnNvcjtcblx0XHRcdHNlbGYuZW50cmllcy5mb3JFYWNoKGZ1bmN0aW9uIChlbnRyeSkge1xuXHRcdFx0XHR2YXIgY2VudHJhbERpcmVjdG9yeVJlY29yZCA9IGVudHJ5LmdldENlbnRyYWxEaXJlY3RvcnlSZWNvcmQoKTtcblx0XHRcdFx0d3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBjZW50cmFsRGlyZWN0b3J5UmVjb3JkKTtcblx0XHRcdH0pO1xuXHRcdFx0d3JpdGVUb091dHB1dFN0cmVhbShzZWxmLCBnZXRFbmRPZkNlbnRyYWxEaXJlY3RvcnlSZWNvcmQoc2VsZikpO1xuXHRcdFx0c2VsZi5vdXRwdXRTdHJlYW0uZW5kKCk7XG5cdFx0XHRzZWxmLmFsbERvbmUgPSB0cnVlO1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBjYWxjdWxhdGVGaW5hbFNpemUoc2VsZikge1xuXHR2YXIgcHJldGVuZE91dHB1dEN1cnNvciA9IDA7XG5cdHZhciBjZW50cmFsRGlyZWN0b3J5U2l6ZSA9IDA7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5lbnRyaWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGVudHJ5ID0gc2VsZi5lbnRyaWVzW2ldO1xuXHRcdC8vIGNvbXByZXNzaW9uIGlzIHRvbyBoYXJkIHRvIHByZWRpY3Rcblx0XHRpZiAoZW50cnkuY29tcHJlc3MpIHJldHVybiAtMTtcblx0XHRpZiAoZW50cnkuc3RhdGUgPj0gRW50cnkuUkVBRFlfVE9fUFVNUF9GSUxFX0RBVEEpIHtcblx0XHRcdC8vIGlmIGFkZFJlYWRTdHJlYW0gd2FzIGNhbGxlZCB3aXRob3V0IHByb3ZpZGluZyB0aGUgc2l6ZSwgd2UgY2FuJ3QgcHJlZGljdCB0aGUgZmluYWwgc2l6ZVxuXHRcdFx0aWYgKGVudHJ5LnVuY29tcHJlc3NlZFNpemUgPT0gbnVsbCkgcmV0dXJuIC0xO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBpZiB3ZSdyZSBzdGlsbCB3YWl0aW5nIGZvciBmcy5zdGF0LCB3ZSBtaWdodCBsZWFybiB0aGUgc2l6ZSBzb21lZGF5XG5cdFx0XHRpZiAoZW50cnkudW5jb21wcmVzc2VkU2l6ZSA9PSBudWxsKSByZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0Ly8gd2Uga25vdyB0aGlzIGZvciBzdXJlLCBhbmQgdGhpcyBpcyBpbXBvcnRhbnQgdG8ga25vdyBpZiB3ZSBuZWVkIFpJUDY0IGZvcm1hdC5cblx0XHRlbnRyeS5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgPSBwcmV0ZW5kT3V0cHV0Q3Vyc29yO1xuXHRcdHZhciB1c2VaaXA2NEZvcm1hdCA9IGVudHJ5LnVzZVppcDY0Rm9ybWF0KCk7XG5cblx0XHRwcmV0ZW5kT3V0cHV0Q3Vyc29yICs9IExPQ0FMX0ZJTEVfSEVBREVSX0ZJWEVEX1NJWkUgKyBlbnRyeS51dGY4RmlsZU5hbWUubGVuZ3RoO1xuXHRcdHByZXRlbmRPdXRwdXRDdXJzb3IgKz0gZW50cnkudW5jb21wcmVzc2VkU2l6ZTtcblx0XHRpZiAoIWVudHJ5LmNyY0FuZEZpbGVTaXplS25vd24pIHtcblx0XHRcdC8vIHVzZSBhIGRhdGEgZGVzY3JpcHRvclxuXHRcdFx0aWYgKHVzZVppcDY0Rm9ybWF0KSB7XG5cdFx0XHRcdHByZXRlbmRPdXRwdXRDdXJzb3IgKz0gWklQNjRfREFUQV9ERVNDUklQVE9SX1NJWkU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwcmV0ZW5kT3V0cHV0Q3Vyc29yICs9IERBVEFfREVTQ1JJUFRPUl9TSVpFO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNlbnRyYWxEaXJlY3RvcnlTaXplICs9IENFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9GSVhFRF9TSVpFICsgZW50cnkudXRmOEZpbGVOYW1lLmxlbmd0aDtcblx0XHRpZiAodXNlWmlwNjRGb3JtYXQpIHtcblx0XHRcdGNlbnRyYWxEaXJlY3RvcnlTaXplICs9IFpJUDY0X0VYVEVOREVEX0lORk9STUFUSU9OX0VYVFJBX0ZJRUxEX1NJWkU7XG5cdFx0fVxuXHR9XG5cblx0dmFyIGVuZE9mQ2VudHJhbERpcmVjdG9yeVNpemUgPSAwO1xuXHRpZiAoc2VsZi5mb3JjZVppcDY0RW9jZCB8fFxuXHRcdHNlbGYuZW50cmllcy5sZW5ndGggPj0gMHhmZmZmIHx8XG5cdFx0Y2VudHJhbERpcmVjdG9yeVNpemUgPj0gMHhmZmZmIHx8XG5cdFx0cHJldGVuZE91dHB1dEN1cnNvciA+PSAweGZmZmZmZmZmKSB7XG5cdFx0Ly8gdXNlIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSBzdHVmZlxuXHRcdGVuZE9mQ2VudHJhbERpcmVjdG9yeVNpemUgKz0gWklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFICsgWklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX0xPQ0FUT1JfU0laRTtcblx0fVxuXHRlbmRPZkNlbnRyYWxEaXJlY3RvcnlTaXplICs9IEVORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRTtcblx0cmV0dXJuIHByZXRlbmRPdXRwdXRDdXJzb3IgKyBjZW50cmFsRGlyZWN0b3J5U2l6ZSArIGVuZE9mQ2VudHJhbERpcmVjdG9yeVNpemU7XG59XG5cbnZhciBaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkUgPSA1NjtcbnZhciBaSVA2NF9FTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfTE9DQVRPUl9TSVpFID0gMjA7XG52YXIgRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFID0gMjI7XG5cbmZ1bmN0aW9uIGdldEVuZE9mQ2VudHJhbERpcmVjdG9yeVJlY29yZChzZWxmLCBhY3R1YWxseUp1c3RUZWxsTWVIb3dMb25nSXRXb3VsZEJlKSB7XG5cdHZhciBuZWVkWmlwNjRGb3JtYXQgPSBmYWxzZTtcblx0dmFyIG5vcm1hbEVudHJpZXNMZW5ndGggPSBzZWxmLmVudHJpZXMubGVuZ3RoO1xuXHRpZiAoc2VsZi5mb3JjZVppcDY0RW9jZCB8fCBzZWxmLmVudHJpZXMubGVuZ3RoID49IDB4ZmZmZikge1xuXHRcdG5vcm1hbEVudHJpZXNMZW5ndGggPSAweGZmZmY7XG5cdFx0bmVlZFppcDY0Rm9ybWF0ID0gdHJ1ZTtcblx0fVxuXHR2YXIgc2l6ZU9mQ2VudHJhbERpcmVjdG9yeSA9IHNlbGYub3V0cHV0U3RyZWFtQ3Vyc29yIC0gc2VsZi5vZmZzZXRPZlN0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5O1xuXHR2YXIgbm9ybWFsU2l6ZU9mQ2VudHJhbERpcmVjdG9yeSA9IHNpemVPZkNlbnRyYWxEaXJlY3Rvcnk7XG5cdGlmIChzZWxmLmZvcmNlWmlwNjRFb2NkIHx8IHNpemVPZkNlbnRyYWxEaXJlY3RvcnkgPj0gMHhmZmZmZmZmZikge1xuXHRcdG5vcm1hbFNpemVPZkNlbnRyYWxEaXJlY3RvcnkgPSAweGZmZmZmZmZmO1xuXHRcdG5lZWRaaXA2NEZvcm1hdCA9IHRydWU7XG5cdH1cblx0dmFyIG5vcm1hbE9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3RvcnkgPSBzZWxmLm9mZnNldE9mU3RhcnRPZkNlbnRyYWxEaXJlY3Rvcnk7XG5cdGlmIChzZWxmLmZvcmNlWmlwNjRFb2NkIHx8IHNlbGYub2Zmc2V0T2ZTdGFydE9mQ2VudHJhbERpcmVjdG9yeSA+PSAweGZmZmZmZmZmKSB7XG5cdFx0bm9ybWFsT2Zmc2V0T2ZTdGFydE9mQ2VudHJhbERpcmVjdG9yeSA9IDB4ZmZmZmZmZmY7XG5cdFx0bmVlZFppcDY0Rm9ybWF0ID0gdHJ1ZTtcblx0fVxuXHRpZiAoYWN0dWFsbHlKdXN0VGVsbE1lSG93TG9uZ0l0V291bGRCZSkge1xuXHRcdGlmIChuZWVkWmlwNjRGb3JtYXQpIHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9SRUNPUkRfU0laRSArXG5cdFx0XHRcdFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9MT0NBVE9SX1NJWkUgK1xuXHRcdFx0XHRFTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkVcblx0XHRcdCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBFTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkU7XG5cdFx0fVxuXHR9XG5cblx0dmFyIGVvY2RyQnVmZmVyID0gbmV3IEJ1ZmZlcihFTkRfT0ZfQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX1NJWkUpO1xuXHQvLyBlbmQgb2YgY2VudHJhbCBkaXIgc2lnbmF0dXJlICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzICAoMHgwNjA1NGI1MClcblx0ZW9jZHJCdWZmZXIud3JpdGVVSW50MzJMRSgweDA2MDU0YjUwLCAwKTtcblx0Ly8gbnVtYmVyIG9mIHRoaXMgZGlzayAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMiBieXRlc1xuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQxNkxFKDAsIDQpO1xuXHQvLyBudW1iZXIgb2YgdGhlIGRpc2sgd2l0aCB0aGUgc3RhcnQgb2YgdGhlIGNlbnRyYWwgZGlyZWN0b3J5ICAyIGJ5dGVzXG5cdGVvY2RyQnVmZmVyLndyaXRlVUludDE2TEUoMCwgNik7XG5cdC8vIHRvdGFsIG51bWJlciBvZiBlbnRyaWVzIGluIHRoZSBjZW50cmFsIGRpcmVjdG9yeSBvbiB0aGlzIGRpc2sgIDIgYnl0ZXNcblx0ZW9jZHJCdWZmZXIud3JpdGVVSW50MTZMRShub3JtYWxFbnRyaWVzTGVuZ3RoLCA4KTtcblx0Ly8gdG90YWwgbnVtYmVyIG9mIGVudHJpZXMgaW4gdGhlIGNlbnRyYWwgZGlyZWN0b3J5ICAgMiBieXRlc1xuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQxNkxFKG5vcm1hbEVudHJpZXNMZW5ndGgsIDEwKTtcblx0Ly8gc2l6ZSBvZiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgICAgICAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRlb2NkckJ1ZmZlci53cml0ZVVJbnQzMkxFKG5vcm1hbFNpemVPZkNlbnRyYWxEaXJlY3RvcnksIDEyKTtcblx0Ly8gb2Zmc2V0IG9mIHN0YXJ0IG9mIGNlbnRyYWwgZGlyZWN0b3J5IHdpdGggcmVzcGVjdCB0byB0aGUgc3RhcnRpbmcgZGlzayBudW1iZXIgIDQgYnl0ZXNcblx0ZW9jZHJCdWZmZXIud3JpdGVVSW50MzJMRShub3JtYWxPZmZzZXRPZlN0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5LCAxNik7XG5cdC8vIC5aSVAgZmlsZSBjb21tZW50IGxlbmd0aCAgICAgICAgICAgICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0ZW9jZHJCdWZmZXIud3JpdGVVSW50MTZMRSgwLCAyMCk7XG5cdC8vIC5aSVAgZmlsZSBjb21tZW50ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh2YXJpYWJsZSBzaXplKVxuXHQvLyBubyBjb21tZW50XG5cblx0aWYgKCFuZWVkWmlwNjRGb3JtYXQpIHJldHVybiBlb2NkckJ1ZmZlcjtcblxuXHQvLyBaSVA2NCBmb3JtYXRcblx0Ly8gWklQNjQgRW5kIG9mIENlbnRyYWwgRGlyZWN0b3J5IFJlY29yZFxuXHR2YXIgemlwNjRFb2NkckJ1ZmZlciA9IG5ldyBCdWZmZXIoWklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFKTtcblx0Ly8gemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyIHNpZ25hdHVyZSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXMgICgweDA2MDY0YjUwKVxuXHR6aXA2NEVvY2RyQnVmZmVyLndyaXRlVUludDMyTEUoMHgwNjA2NGI1MCwgMCk7XG5cdC8vIHNpemUgb2YgemlwNjQgZW5kIG9mIGNlbnRyYWwgZGlyZWN0b3J5IHJlY29yZCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdHdyaXRlVUludDY0TEUoemlwNjRFb2NkckJ1ZmZlciwgWklQNjRfRU5EX09GX0NFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9TSVpFIC0gMTIsIDQpO1xuXHQvLyB2ZXJzaW9uIG1hZGUgYnkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMiBieXRlc1xuXHR6aXA2NEVvY2RyQnVmZmVyLndyaXRlVUludDE2TEUoVkVSU0lPTl9NQURFX0JZLCAxMik7XG5cdC8vIHZlcnNpb24gbmVlZGVkIHRvIGV4dHJhY3QgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdHppcDY0RW9jZHJCdWZmZXIud3JpdGVVSW50MTZMRShWRVJTSU9OX05FRURFRF9UT19FWFRSQUNUX1pJUDY0LCAxNCk7XG5cdC8vIG51bWJlciBvZiB0aGlzIGRpc2sgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdHppcDY0RW9jZHJCdWZmZXIud3JpdGVVSW50MzJMRSgwLCAxNik7XG5cdC8vIG51bWJlciBvZiB0aGUgZGlzayB3aXRoIHRoZSBzdGFydCBvZiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdHppcDY0RW9jZHJCdWZmZXIud3JpdGVVSW50MzJMRSgwLCAyMCk7XG5cdC8vIHRvdGFsIG51bWJlciBvZiBlbnRyaWVzIGluIHRoZSBjZW50cmFsIGRpcmVjdG9yeSBvbiB0aGlzIGRpc2sgICAgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdHdyaXRlVUludDY0TEUoemlwNjRFb2NkckJ1ZmZlciwgc2VsZi5lbnRyaWVzLmxlbmd0aCwgMjQpO1xuXHQvLyB0b3RhbCBudW1iZXIgb2YgZW50cmllcyBpbiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOCBieXRlc1xuXHR3cml0ZVVJbnQ2NExFKHppcDY0RW9jZHJCdWZmZXIsIHNlbGYuZW50cmllcy5sZW5ndGgsIDMyKTtcblx0Ly8gc2l6ZSBvZiB0aGUgY2VudHJhbCBkaXJlY3RvcnkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDggYnl0ZXNcblx0d3JpdGVVSW50NjRMRSh6aXA2NEVvY2RyQnVmZmVyLCBzaXplT2ZDZW50cmFsRGlyZWN0b3J5LCA0MCk7XG5cdC8vIG9mZnNldCBvZiBzdGFydCBvZiBjZW50cmFsIGRpcmVjdG9yeSB3aXRoIHJlc3BlY3QgdG8gdGhlIHN0YXJ0aW5nIGRpc2sgbnVtYmVyICA4IGJ5dGVzXG5cdHdyaXRlVUludDY0TEUoemlwNjRFb2NkckJ1ZmZlciwgc2VsZi5vZmZzZXRPZlN0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5LCA0OCk7XG5cdC8vIHppcDY0IGV4dGVuc2libGUgZGF0YSBzZWN0b3IgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodmFyaWFibGUgc2l6ZSlcblx0Ly8gbm90aGluZyBpbiB0aGUgemlwNjQgZXh0ZW5zaWJsZSBkYXRhIHNlY3RvclxuXG5cblx0Ly8gWklQNjQgRW5kIG9mIENlbnRyYWwgRGlyZWN0b3J5IExvY2F0b3Jcblx0dmFyIHppcDY0RW9jZGxCdWZmZXIgPSBuZXcgQnVmZmVyKFpJUDY0X0VORF9PRl9DRU5UUkFMX0RJUkVDVE9SWV9MT0NBVE9SX1NJWkUpO1xuXHQvLyB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXIgbG9jYXRvciBzaWduYXR1cmUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNCBieXRlcyAgKDB4MDcwNjRiNTApXG5cdHppcDY0RW9jZGxCdWZmZXIud3JpdGVVSW50MzJMRSgweDA3MDY0YjUwLCAwKTtcblx0Ly8gbnVtYmVyIG9mIHRoZSBkaXNrIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSB6aXA2NCBlbmQgb2YgY2VudHJhbCBkaXJlY3RvcnkgIDQgYnl0ZXNcblx0emlwNjRFb2NkbEJ1ZmZlci53cml0ZVVJbnQzMkxFKDAsIDQpO1xuXHQvLyByZWxhdGl2ZSBvZmZzZXQgb2YgdGhlIHppcDY0IGVuZCBvZiBjZW50cmFsIGRpcmVjdG9yeSByZWNvcmQgICAgICAgICAgICAgOCBieXRlc1xuXHR3cml0ZVVJbnQ2NExFKHppcDY0RW9jZGxCdWZmZXIsIHNlbGYub3V0cHV0U3RyZWFtQ3Vyc29yLCA4KTtcblx0Ly8gdG90YWwgbnVtYmVyIG9mIGRpc2tzICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0emlwNjRFb2NkbEJ1ZmZlci53cml0ZVVJbnQzMkxFKDEsIDE2KTtcblxuXG5cdHJldHVybiBCdWZmZXIuY29uY2F0KFtcblx0XHR6aXA2NEVvY2RyQnVmZmVyLFxuXHRcdHppcDY0RW9jZGxCdWZmZXIsXG5cdFx0ZW9jZHJCdWZmZXIsXG5cdF0pO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZU1ldGFkYXRhUGF0aChtZXRhZGF0YVBhdGgsIGlzRGlyZWN0b3J5KSB7XG5cdGlmIChtZXRhZGF0YVBhdGggPT09IFwiXCIpIHRocm93IG5ldyBFcnJvcihcImVtcHR5IG1ldGFkYXRhUGF0aFwiKTtcblx0bWV0YWRhdGFQYXRoID0gbWV0YWRhdGFQYXRoLnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpO1xuXHRpZiAoL15bYS16QS1aXTovLnRlc3QobWV0YWRhdGFQYXRoKSB8fCAvXlxcLy8udGVzdChtZXRhZGF0YVBhdGgpKSB0aHJvdyBuZXcgRXJyb3IoXCJhYnNvbHV0ZSBwYXRoOiBcIiArIG1ldGFkYXRhUGF0aCk7XG5cdGlmIChtZXRhZGF0YVBhdGguc3BsaXQoXCIvXCIpLmluZGV4T2YoXCIuLlwiKSAhPT0gLTEpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgcmVsYXRpdmUgcGF0aDogXCIgKyBtZXRhZGF0YVBhdGgpO1xuXHR2YXIgbG9va3NMaWtlRGlyZWN0b3J5ID0gL1xcLyQvLnRlc3QobWV0YWRhdGFQYXRoKTtcblx0aWYgKGlzRGlyZWN0b3J5KSB7XG5cdFx0Ly8gYXBwZW5kIGEgdHJhaWxpbmcgJy8nIGlmIG5lY2Vzc2FyeS5cblx0XHRpZiAoIWxvb2tzTGlrZURpcmVjdG9yeSkgbWV0YWRhdGFQYXRoICs9IFwiL1wiO1xuXHR9IGVsc2Uge1xuXHRcdGlmIChsb29rc0xpa2VEaXJlY3RvcnkpIHRocm93IG5ldyBFcnJvcihcImZpbGUgcGF0aCBjYW5ub3QgZW5kIHdpdGggJy8nOiBcIiArIG1ldGFkYXRhUGF0aCk7XG5cdH1cblx0cmV0dXJuIG1ldGFkYXRhUGF0aDtcbn1cblxudmFyIGRlZmF1bHRGaWxlTW9kZSA9IHBhcnNlSW50KFwiMDEwMDY2NFwiLCA4KTtcbnZhciBkZWZhdWx0RGlyZWN0b3J5TW9kZSA9IHBhcnNlSW50KFwiMDQwNzc1XCIsIDgpO1xuXG4vLyB0aGlzIGNsYXNzIGlzIG5vdCBwYXJ0IG9mIHRoZSBwdWJsaWMgQVBJXG5mdW5jdGlvbiBFbnRyeShtZXRhZGF0YVBhdGgsIGlzRGlyZWN0b3J5LCBvcHRpb25zKSB7XG5cdHRoaXMudXRmOEZpbGVOYW1lID0gbmV3IEJ1ZmZlcihtZXRhZGF0YVBhdGgpO1xuXHRpZiAodGhpcy51dGY4RmlsZU5hbWUubGVuZ3RoID4gMHhmZmZmKSB0aHJvdyBuZXcgRXJyb3IoXCJ1dGY4IGZpbGUgbmFtZSB0b28gbG9uZy4gXCIgKyB1dGY4RmlsZU5hbWUubGVuZ3RoICsgXCIgPiBcIiArIDB4ZmZmZik7XG5cdHRoaXMuaXNEaXJlY3RvcnkgPSBpc0RpcmVjdG9yeTtcblx0dGhpcy5zdGF0ZSA9IEVudHJ5LldBSVRJTkdfRk9SX01FVEFEQVRBO1xuXHR0aGlzLnNldExhc3RNb2REYXRlKG9wdGlvbnMubXRpbWUgIT0gbnVsbCA/IG9wdGlvbnMubXRpbWUgOiBuZXcgRGF0ZSgpKTtcblx0aWYgKG9wdGlvbnMubW9kZSAhPSBudWxsKSB7XG5cdFx0dGhpcy5zZXRGaWxlQXR0cmlidXRlc01vZGUob3B0aW9ucy5tb2RlKTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLnNldEZpbGVBdHRyaWJ1dGVzTW9kZShpc0RpcmVjdG9yeSA/IGRlZmF1bHREaXJlY3RvcnlNb2RlIDogZGVmYXVsdEZpbGVNb2RlKTtcblx0fVxuXHRpZiAoaXNEaXJlY3RvcnkpIHtcblx0XHR0aGlzLmNyY0FuZEZpbGVTaXplS25vd24gPSB0cnVlO1xuXHRcdHRoaXMuY3JjMzIgPSAwO1xuXHRcdHRoaXMudW5jb21wcmVzc2VkU2l6ZSA9IDA7XG5cdFx0dGhpcy5jb21wcmVzc2VkU2l6ZSA9IDA7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gdW5rbm93biBzbyBmYXJcblx0XHR0aGlzLmNyY0FuZEZpbGVTaXplS25vd24gPSBmYWxzZTtcblx0XHR0aGlzLmNyYzMyID0gbnVsbDtcblx0XHR0aGlzLnVuY29tcHJlc3NlZFNpemUgPSBudWxsO1xuXHRcdHRoaXMuY29tcHJlc3NlZFNpemUgPSBudWxsO1xuXHRcdGlmIChvcHRpb25zLnNpemUgIT0gbnVsbCkgdGhpcy51bmNvbXByZXNzZWRTaXplID0gb3B0aW9ucy5zaXplO1xuXHR9XG5cdGlmIChpc0RpcmVjdG9yeSkge1xuXHRcdHRoaXMuY29tcHJlc3MgPSBmYWxzZTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLmNvbXByZXNzID0gdHJ1ZTsgLy8gZGVmYXVsdFxuXHRcdGlmIChvcHRpb25zLmNvbXByZXNzICE9IG51bGwpIHRoaXMuY29tcHJlc3MgPSAhIW9wdGlvbnMuY29tcHJlc3M7XG5cdH1cblx0dGhpcy5mb3JjZVppcDY0Rm9ybWF0ID0gISFvcHRpb25zLmZvcmNlWmlwNjRGb3JtYXQ7XG59XG5cbkVudHJ5LldBSVRJTkdfRk9SX01FVEFEQVRBID0gMDtcbkVudHJ5LlJFQURZX1RPX1BVTVBfRklMRV9EQVRBID0gMTtcbkVudHJ5LkZJTEVfREFUQV9JTl9QUk9HUkVTUyA9IDI7XG5FbnRyeS5GSUxFX0RBVEFfRE9ORSA9IDM7XG5FbnRyeS5wcm90b3R5cGUuc2V0TGFzdE1vZERhdGUgPSBmdW5jdGlvbiAoZGF0ZSkge1xuXHR2YXIgZG9zRGF0ZVRpbWUgPSBkYXRlVG9Eb3NEYXRlVGltZShkYXRlKTtcblx0dGhpcy5sYXN0TW9kRmlsZVRpbWUgPSBkb3NEYXRlVGltZS50aW1lO1xuXHR0aGlzLmxhc3RNb2RGaWxlRGF0ZSA9IGRvc0RhdGVUaW1lLmRhdGU7XG59O1xuRW50cnkucHJvdG90eXBlLnNldEZpbGVBdHRyaWJ1dGVzTW9kZSA9IGZ1bmN0aW9uIChtb2RlKSB7XG5cdGlmICgobW9kZSAmIDB4ZmZmZikgIT09IG1vZGUpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgbW9kZS4gZXhwZWN0ZWQ6IDAgPD0gXCIgKyBtb2RlICsgXCIgPD0gXCIgKyAweGZmZmYpO1xuXHQvLyBodHRwOi8vdW5peC5zdGFja2V4Y2hhbmdlLmNvbS9xdWVzdGlvbnMvMTQ3MDUvdGhlLXppcC1mb3JtYXRzLWV4dGVybmFsLWZpbGUtYXR0cmlidXRlLzE0NzI3IzE0NzI3XG5cdHRoaXMuZXh0ZXJuYWxGaWxlQXR0cmlidXRlcyA9IChtb2RlIDw8IDE2KSA+Pj4gMDtcbn07XG4vLyBkb0ZpbGVEYXRhUHVtcCgpIHNob3VsZCBub3QgY2FsbCBwdW1wRW50cmllcygpIGRpcmVjdGx5LiBzZWUgaXNzdWUgIzkuXG5FbnRyeS5wcm90b3R5cGUuc2V0RmlsZURhdGFQdW1wRnVuY3Rpb24gPSBmdW5jdGlvbiAoZG9GaWxlRGF0YVB1bXApIHtcblx0dGhpcy5kb0ZpbGVEYXRhUHVtcCA9IGRvRmlsZURhdGFQdW1wO1xuXHR0aGlzLnN0YXRlID0gRW50cnkuUkVBRFlfVE9fUFVNUF9GSUxFX0RBVEE7XG59O1xuRW50cnkucHJvdG90eXBlLnVzZVppcDY0Rm9ybWF0ID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gKFxuXHRcdCh0aGlzLmZvcmNlWmlwNjRGb3JtYXQpIHx8XG5cdFx0KHRoaXMudW5jb21wcmVzc2VkU2l6ZSAhPSBudWxsICYmIHRoaXMudW5jb21wcmVzc2VkU2l6ZSA+IDB4ZmZmZmZmZmUpIHx8XG5cdFx0KHRoaXMuY29tcHJlc3NlZFNpemUgIT0gbnVsbCAmJiB0aGlzLmNvbXByZXNzZWRTaXplID4gMHhmZmZmZmZmZSkgfHxcblx0XHQodGhpcy5yZWxhdGl2ZU9mZnNldE9mTG9jYWxIZWFkZXIgIT0gbnVsbCAmJiB0aGlzLnJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA+IDB4ZmZmZmZmZmUpXG5cdCk7XG59XG52YXIgTE9DQUxfRklMRV9IRUFERVJfRklYRURfU0laRSA9IDMwO1xudmFyIFZFUlNJT05fTkVFREVEX1RPX0VYVFJBQ1RfVVRGOCA9IDIwO1xudmFyIFZFUlNJT05fTkVFREVEX1RPX0VYVFJBQ1RfWklQNjQgPSA0NTtcbi8vIDMgPSB1bml4LiA2MyA9IHNwZWMgdmVyc2lvbiA2LjNcbnZhciBWRVJTSU9OX01BREVfQlkgPSAoMyA8PCA4KSB8IDYzO1xudmFyIEZJTEVfTkFNRV9JU19VVEY4ID0gMSA8PCAxMTtcbnZhciBVTktOT1dOX0NSQzMyX0FORF9GSUxFX1NJWkVTID0gMSA8PCAzO1xuRW50cnkucHJvdG90eXBlLmdldExvY2FsRmlsZUhlYWRlciA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGNyYzMyID0gMDtcblx0dmFyIGNvbXByZXNzZWRTaXplID0gMDtcblx0dmFyIHVuY29tcHJlc3NlZFNpemUgPSAwO1xuXHRpZiAodGhpcy5jcmNBbmRGaWxlU2l6ZUtub3duKSB7XG5cdFx0Y3JjMzIgPSB0aGlzLmNyYzMyO1xuXHRcdGNvbXByZXNzZWRTaXplID0gdGhpcy5jb21wcmVzc2VkU2l6ZTtcblx0XHR1bmNvbXByZXNzZWRTaXplID0gdGhpcy51bmNvbXByZXNzZWRTaXplO1xuXHR9XG5cblx0dmFyIGZpeGVkU2l6ZVN0dWZmID0gbmV3IEJ1ZmZlcihMT0NBTF9GSUxFX0hFQURFUl9GSVhFRF9TSVpFKTtcblx0dmFyIGdlbmVyYWxQdXJwb3NlQml0RmxhZyA9IEZJTEVfTkFNRV9JU19VVEY4O1xuXHRpZiAoIXRoaXMuY3JjQW5kRmlsZVNpemVLbm93bikgZ2VuZXJhbFB1cnBvc2VCaXRGbGFnIHw9IFVOS05PV05fQ1JDMzJfQU5EX0ZJTEVfU0laRVM7XG5cblx0Ly8gbG9jYWwgZmlsZSBoZWFkZXIgc2lnbmF0dXJlICAgICA0IGJ5dGVzICAoMHgwNDAzNGI1MClcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRSgweDA0MDM0YjUwLCAwKTtcblx0Ly8gdmVyc2lvbiBuZWVkZWQgdG8gZXh0cmFjdCAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoVkVSU0lPTl9ORUVERURfVE9fRVhUUkFDVF9VVEY4LCA0KTtcblx0Ly8gZ2VuZXJhbCBwdXJwb3NlIGJpdCBmbGFnICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoZ2VuZXJhbFB1cnBvc2VCaXRGbGFnLCA2KTtcblx0Ly8gY29tcHJlc3Npb24gbWV0aG9kICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodGhpcy5nZXRDb21wcmVzc2lvbk1ldGhvZCgpLCA4KTtcblx0Ly8gbGFzdCBtb2QgZmlsZSB0aW1lICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodGhpcy5sYXN0TW9kRmlsZVRpbWUsIDEwKTtcblx0Ly8gbGFzdCBtb2QgZmlsZSBkYXRlICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodGhpcy5sYXN0TW9kRmlsZURhdGUsIDEyKTtcblx0Ly8gY3JjLTMyICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUoY3JjMzIsIDE0KTtcblx0Ly8gY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUoY29tcHJlc3NlZFNpemUsIDE4KTtcblx0Ly8gdW5jb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUodW5jb21wcmVzc2VkU2l6ZSwgMjIpO1xuXHQvLyBmaWxlIG5hbWUgbGVuZ3RoICAgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLnV0ZjhGaWxlTmFtZS5sZW5ndGgsIDI2KTtcblx0Ly8gZXh0cmEgZmllbGQgbGVuZ3RoICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoMCwgMjgpO1xuXHRyZXR1cm4gQnVmZmVyLmNvbmNhdChbXG5cdFx0Zml4ZWRTaXplU3R1ZmYsXG5cdFx0Ly8gZmlsZSBuYW1lICh2YXJpYWJsZSBzaXplKVxuXHRcdHRoaXMudXRmOEZpbGVOYW1lLFxuXHRcdC8vIGV4dHJhIGZpZWxkICh2YXJpYWJsZSBzaXplKVxuXHRcdC8vIG5vIGV4dHJhIGZpZWxkc1xuXHRdKTtcbn07XG52YXIgREFUQV9ERVNDUklQVE9SX1NJWkUgPSAxNjtcbnZhciBaSVA2NF9EQVRBX0RFU0NSSVBUT1JfU0laRSA9IDI0O1xuRW50cnkucHJvdG90eXBlLmdldERhdGFEZXNjcmlwdG9yID0gZnVuY3Rpb24gKCkge1xuXHRpZiAodGhpcy5jcmNBbmRGaWxlU2l6ZUtub3duKSB7XG5cdFx0Ly8gdGhlIE1hYyBBcmNoaXZlIFV0aWxpdHkgcmVxdWlyZXMgdGhpcyBub3QgYmUgcHJlc2VudCB1bmxlc3Mgd2Ugc2V0IGdlbmVyYWwgcHVycG9zZSBiaXQgM1xuXHRcdHJldHVybiBuZXcgQnVmZmVyKDApO1xuXHR9XG5cdGlmICghdGhpcy51c2VaaXA2NEZvcm1hdCgpKSB7XG5cdFx0dmFyIGJ1ZmZlciA9IG5ldyBCdWZmZXIoREFUQV9ERVNDUklQVE9SX1NJWkUpO1xuXHRcdC8vIG9wdGlvbmFsIHNpZ25hdHVyZSAocmVxdWlyZWQgYWNjb3JkaW5nIHRvIEFyY2hpdmUgVXRpbGl0eSlcblx0XHRidWZmZXIud3JpdGVVSW50MzJMRSgweDA4MDc0YjUwLCAwKTtcblx0XHQvLyBjcmMtMzIgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0XHRidWZmZXIud3JpdGVVSW50MzJMRSh0aGlzLmNyYzMyLCA0KTtcblx0XHQvLyBjb21wcmVzc2VkIHNpemUgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0XHRidWZmZXIud3JpdGVVSW50MzJMRSh0aGlzLmNvbXByZXNzZWRTaXplLCA4KTtcblx0XHQvLyB1bmNvbXByZXNzZWQgc2l6ZSAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0XHRidWZmZXIud3JpdGVVSW50MzJMRSh0aGlzLnVuY29tcHJlc3NlZFNpemUsIDEyKTtcblx0XHRyZXR1cm4gYnVmZmVyO1xuXHR9IGVsc2Uge1xuXHRcdC8vIFpJUDY0IGZvcm1hdFxuXHRcdHZhciBidWZmZXIgPSBuZXcgQnVmZmVyKFpJUDY0X0RBVEFfREVTQ1JJUFRPUl9TSVpFKTtcblx0XHQvLyBvcHRpb25hbCBzaWduYXR1cmUgKHVua25vd24gaWYgYW55b25lIGNhcmVzIGFib3V0IHRoaXMpXG5cdFx0YnVmZmVyLndyaXRlVUludDMyTEUoMHgwODA3NGI1MCwgMCk7XG5cdFx0Ly8gY3JjLTMyICAgICAgICAgICAgICAgICAgICAgICAgICA0IGJ5dGVzXG5cdFx0YnVmZmVyLndyaXRlVUludDMyTEUodGhpcy5jcmMzMiwgNCk7XG5cdFx0Ly8gY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgICA4IGJ5dGVzXG5cdFx0d3JpdGVVSW50NjRMRShidWZmZXIsIHRoaXMuY29tcHJlc3NlZFNpemUsIDgpO1xuXHRcdC8vIHVuY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgOCBieXRlc1xuXHRcdHdyaXRlVUludDY0TEUoYnVmZmVyLCB0aGlzLnVuY29tcHJlc3NlZFNpemUsIDE2KTtcblx0XHRyZXR1cm4gYnVmZmVyO1xuXHR9XG59O1xudmFyIENFTlRSQUxfRElSRUNUT1JZX1JFQ09SRF9GSVhFRF9TSVpFID0gNDY7XG52YXIgWklQNjRfRVhURU5ERURfSU5GT1JNQVRJT05fRVhUUkFfRklFTERfU0laRSA9IDI4O1xuRW50cnkucHJvdG90eXBlLmdldENlbnRyYWxEaXJlY3RvcnlSZWNvcmQgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBmaXhlZFNpemVTdHVmZiA9IG5ldyBCdWZmZXIoQ0VOVFJBTF9ESVJFQ1RPUllfUkVDT1JEX0ZJWEVEX1NJWkUpO1xuXHR2YXIgZ2VuZXJhbFB1cnBvc2VCaXRGbGFnID0gRklMRV9OQU1FX0lTX1VURjg7XG5cdGlmICghdGhpcy5jcmNBbmRGaWxlU2l6ZUtub3duKSBnZW5lcmFsUHVycG9zZUJpdEZsYWcgfD0gVU5LTk9XTl9DUkMzMl9BTkRfRklMRV9TSVpFUztcblxuXHR2YXIgbm9ybWFsQ29tcHJlc3NlZFNpemUgPSB0aGlzLmNvbXByZXNzZWRTaXplO1xuXHR2YXIgbm9ybWFsVW5jb21wcmVzc2VkU2l6ZSA9IHRoaXMudW5jb21wcmVzc2VkU2l6ZTtcblx0dmFyIG5vcm1hbFJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9IHRoaXMucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyO1xuXHR2YXIgdmVyc2lvbk5lZWRlZFRvRXh0cmFjdDtcblx0dmFyIHplaWVmQnVmZmVyO1xuXHRpZiAodGhpcy51c2VaaXA2NEZvcm1hdCgpKSB7XG5cdFx0bm9ybWFsQ29tcHJlc3NlZFNpemUgPSAweGZmZmZmZmZmO1xuXHRcdG5vcm1hbFVuY29tcHJlc3NlZFNpemUgPSAweGZmZmZmZmZmO1xuXHRcdG5vcm1hbFJlbGF0aXZlT2Zmc2V0T2ZMb2NhbEhlYWRlciA9IDB4ZmZmZmZmZmY7XG5cdFx0dmVyc2lvbk5lZWRlZFRvRXh0cmFjdCA9IFZFUlNJT05fTkVFREVEX1RPX0VYVFJBQ1RfWklQNjQ7XG5cblx0XHQvLyBaSVA2NCBleHRlbmRlZCBpbmZvcm1hdGlvbiBleHRyYSBmaWVsZFxuXHRcdHplaWVmQnVmZmVyID0gbmV3IEJ1ZmZlcihaSVA2NF9FWFRFTkRFRF9JTkZPUk1BVElPTl9FWFRSQV9GSUVMRF9TSVpFKTtcblx0XHQvLyAweDAwMDEgICAgICAgICAgICAgICAgICAyIGJ5dGVzICAgIFRhZyBmb3IgdGhpcyBcImV4dHJhXCIgYmxvY2sgdHlwZVxuXHRcdHplaWVmQnVmZmVyLndyaXRlVUludDE2TEUoMHgwMDAxLCAwKTtcblx0XHQvLyBTaXplICAgICAgICAgICAgICAgICAgICAyIGJ5dGVzICAgIFNpemUgb2YgdGhpcyBcImV4dHJhXCIgYmxvY2tcblx0XHR6ZWllZkJ1ZmZlci53cml0ZVVJbnQxNkxFKFpJUDY0X0VYVEVOREVEX0lORk9STUFUSU9OX0VYVFJBX0ZJRUxEX1NJWkUgLSA0LCAyKTtcblx0XHQvLyBPcmlnaW5hbCBTaXplICAgICAgICAgICA4IGJ5dGVzICAgIE9yaWdpbmFsIHVuY29tcHJlc3NlZCBmaWxlIHNpemVcblx0XHR3cml0ZVVJbnQ2NExFKHplaWVmQnVmZmVyLCB0aGlzLnVuY29tcHJlc3NlZFNpemUsIDQpO1xuXHRcdC8vIENvbXByZXNzZWQgU2l6ZSAgICAgICAgIDggYnl0ZXMgICAgU2l6ZSBvZiBjb21wcmVzc2VkIGRhdGFcblx0XHR3cml0ZVVJbnQ2NExFKHplaWVmQnVmZmVyLCB0aGlzLmNvbXByZXNzZWRTaXplLCAxMik7XG5cdFx0Ly8gUmVsYXRpdmUgSGVhZGVyIE9mZnNldCAgOCBieXRlcyAgICBPZmZzZXQgb2YgbG9jYWwgaGVhZGVyIHJlY29yZFxuXHRcdHdyaXRlVUludDY0TEUoemVpZWZCdWZmZXIsIHRoaXMucmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyLCAyMCk7XG5cdFx0Ly8gRGlzayBTdGFydCBOdW1iZXIgICAgICAgNCBieXRlcyAgICBOdW1iZXIgb2YgdGhlIGRpc2sgb24gd2hpY2ggdGhpcyBmaWxlIHN0YXJ0c1xuXHRcdC8vIChvbWl0KVxuXHR9IGVsc2Uge1xuXHRcdHZlcnNpb25OZWVkZWRUb0V4dHJhY3QgPSBWRVJTSU9OX05FRURFRF9UT19FWFRSQUNUX1VURjg7XG5cdFx0emVpZWZCdWZmZXIgPSBuZXcgQnVmZmVyKDApO1xuXHR9XG5cblx0Ly8gY2VudHJhbCBmaWxlIGhlYWRlciBzaWduYXR1cmUgICA0IGJ5dGVzICAoMHgwMjAxNGI1MClcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRSgweDAyMDE0YjUwLCAwKTtcblx0Ly8gdmVyc2lvbiBtYWRlIGJ5ICAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoVkVSU0lPTl9NQURFX0JZLCA0KTtcblx0Ly8gdmVyc2lvbiBuZWVkZWQgdG8gZXh0cmFjdCAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodmVyc2lvbk5lZWRlZFRvRXh0cmFjdCwgNik7XG5cdC8vIGdlbmVyYWwgcHVycG9zZSBiaXQgZmxhZyAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKGdlbmVyYWxQdXJwb3NlQml0RmxhZywgOCk7XG5cdC8vIGNvbXByZXNzaW9uIG1ldGhvZCAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHRoaXMuZ2V0Q29tcHJlc3Npb25NZXRob2QoKSwgMTApO1xuXHQvLyBsYXN0IG1vZCBmaWxlIHRpbWUgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLmxhc3RNb2RGaWxlVGltZSwgMTIpO1xuXHQvLyBsYXN0IG1vZCBmaWxlIGRhdGUgICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSh0aGlzLmxhc3RNb2RGaWxlRGF0ZSwgMTQpO1xuXHQvLyBjcmMtMzIgICAgICAgICAgICAgICAgICAgICAgICAgIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRSh0aGlzLmNyYzMyLCAxNik7XG5cdC8vIGNvbXByZXNzZWQgc2l6ZSAgICAgICAgICAgICAgICAgNCBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKG5vcm1hbENvbXByZXNzZWRTaXplLCAyMCk7XG5cdC8vIHVuY29tcHJlc3NlZCBzaXplICAgICAgICAgICAgICAgNCBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQzMkxFKG5vcm1hbFVuY29tcHJlc3NlZFNpemUsIDI0KTtcblx0Ly8gZmlsZSBuYW1lIGxlbmd0aCAgICAgICAgICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUodGhpcy51dGY4RmlsZU5hbWUubGVuZ3RoLCAyOCk7XG5cdC8vIGV4dHJhIGZpZWxkIGxlbmd0aCAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKHplaWVmQnVmZmVyLmxlbmd0aCwgMzApO1xuXHQvLyBmaWxlIGNvbW1lbnQgbGVuZ3RoICAgICAgICAgICAgIDIgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MTZMRSgwLCAzMik7XG5cdC8vIGRpc2sgbnVtYmVyIHN0YXJ0ICAgICAgICAgICAgICAgMiBieXRlc1xuXHRmaXhlZFNpemVTdHVmZi53cml0ZVVJbnQxNkxFKDAsIDM0KTtcblx0Ly8gaW50ZXJuYWwgZmlsZSBhdHRyaWJ1dGVzICAgICAgICAyIGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDE2TEUoMCwgMzYpO1xuXHQvLyBleHRlcm5hbCBmaWxlIGF0dHJpYnV0ZXMgICAgICAgIDQgYnl0ZXNcblx0Zml4ZWRTaXplU3R1ZmYud3JpdGVVSW50MzJMRSh0aGlzLmV4dGVybmFsRmlsZUF0dHJpYnV0ZXMsIDM4KTtcblx0Ly8gcmVsYXRpdmUgb2Zmc2V0IG9mIGxvY2FsIGhlYWRlciA0IGJ5dGVzXG5cdGZpeGVkU2l6ZVN0dWZmLndyaXRlVUludDMyTEUobm9ybWFsUmVsYXRpdmVPZmZzZXRPZkxvY2FsSGVhZGVyLCA0Mik7XG5cblx0cmV0dXJuIEJ1ZmZlci5jb25jYXQoW1xuXHRcdGZpeGVkU2l6ZVN0dWZmLFxuXHRcdC8vIGZpbGUgbmFtZSAodmFyaWFibGUgc2l6ZSlcblx0XHR0aGlzLnV0ZjhGaWxlTmFtZSxcblx0XHQvLyBleHRyYSBmaWVsZCAodmFyaWFibGUgc2l6ZSlcblx0XHR6ZWllZkJ1ZmZlcixcblx0XHQvLyBmaWxlIGNvbW1lbnQgKHZhcmlhYmxlIHNpemUpXG5cdFx0Ly8gZW1wdHkgY29tbWVudFxuXHRdKTtcbn07XG5FbnRyeS5wcm90b3R5cGUuZ2V0Q29tcHJlc3Npb25NZXRob2QgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBOT19DT01QUkVTU0lPTiA9IDA7XG5cdHZhciBERUZMQVRFX0NPTVBSRVNTSU9OID0gODtcblx0cmV0dXJuIHRoaXMuY29tcHJlc3MgPyBERUZMQVRFX0NPTVBSRVNTSU9OIDogTk9fQ09NUFJFU1NJT047XG59O1xuXG5mdW5jdGlvbiBkYXRlVG9Eb3NEYXRlVGltZShqc0RhdGUpIHtcblx0dmFyIGRhdGUgPSAwO1xuXHRkYXRlIHw9IGpzRGF0ZS5nZXREYXRlKCkgJiAweDFmOyAvLyAxLTMxXG5cdGRhdGUgfD0gKChqc0RhdGUuZ2V0TW9udGgoKSArIDEpICYgMHhmKSA8PCA1OyAvLyAwLTExLCAxLTEyXG5cdGRhdGUgfD0gKChqc0RhdGUuZ2V0RnVsbFllYXIoKSAtIDE5ODApICYgMHg3ZikgPDwgOTsgLy8gMC0xMjgsIDE5ODAtMjEwOFxuXG5cdHZhciB0aW1lID0gMDtcblx0dGltZSB8PSBNYXRoLmZsb29yKGpzRGF0ZS5nZXRTZWNvbmRzKCkgLyAyKTsgLy8gMC01OSwgMC0yOSAobG9zZSBvZGQgbnVtYmVycylcblx0dGltZSB8PSAoanNEYXRlLmdldE1pbnV0ZXMoKSAmIDB4M2YpIDw8IDU7IC8vIDAtNTlcblx0dGltZSB8PSAoanNEYXRlLmdldEhvdXJzKCkgJiAweDFmKSA8PCAxMTsgLy8gMC0yM1xuXG5cdHJldHVybiB7ZGF0ZTogZGF0ZSwgdGltZTogdGltZX07XG59XG5cbmZ1bmN0aW9uIHdyaXRlVUludDY0TEUoYnVmZmVyLCBuLCBvZmZzZXQpIHtcblx0Ly8gY2FuJ3QgdXNlIGJpdHNoaWZ0IGhlcmUsIGJlY2F1c2UgSmF2YVNjcmlwdCBvbmx5IGFsbG93cyBiaXRzaGl0aW5nIG9uIDMyLWJpdCBpbnRlZ2Vycy5cblx0dmFyIGhpZ2ggPSBNYXRoLmZsb29yKG4gLyAweDEwMDAwMDAwMCk7XG5cdHZhciBsb3cgPSBuICUgMHgxMDAwMDAwMDA7XG5cdGJ1ZmZlci53cml0ZVVJbnQzMkxFKGxvdywgb2Zmc2V0KTtcblx0YnVmZmVyLndyaXRlVUludDMyTEUoaGlnaCwgb2Zmc2V0ICsgNCk7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRDYWxsYmFjayhlcnIpIHtcblx0aWYgKGVycikgdGhyb3cgZXJyO1xufVxuXG51dGlsLmluaGVyaXRzKEJ5dGVDb3VudGVyLCBUcmFuc2Zvcm0pO1xuXG5mdW5jdGlvbiBCeXRlQ291bnRlcihvcHRpb25zKSB7XG5cdFRyYW5zZm9ybS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXHR0aGlzLmJ5dGVDb3VudCA9IDA7XG59XG5cbkJ5dGVDb3VudGVyLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24gKGNodW5rLCBlbmNvZGluZywgY2IpIHtcblx0dGhpcy5ieXRlQ291bnQgKz0gY2h1bmsubGVuZ3RoO1xuXHRjYihudWxsLCBjaHVuayk7XG59O1xuXG51dGlsLmluaGVyaXRzKENyYzMyV2F0Y2hlciwgVHJhbnNmb3JtKTtcblxuZnVuY3Rpb24gQ3JjMzJXYXRjaGVyKG9wdGlvbnMpIHtcblx0VHJhbnNmb3JtLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cdHRoaXMuY3JjMzIgPSAwO1xufVxuXG5DcmMzMldhdGNoZXIucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2h1bmssIGVuY29kaW5nLCBjYikge1xuXHR0aGlzLmNyYzMyID0gY3JjMzIudW5zaWduZWQoY2h1bmssIHRoaXMuY3JjMzIpO1xuXHRjYihudWxsLCBjaHVuayk7XG59OyJdfQ==
