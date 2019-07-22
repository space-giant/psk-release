const child_process = require("child_process");
const path = require("path");
const fs = require("fs");

const pskBuildPath = path.resolve(path.join(__dirname, "..", "/psknode/bin/scripts/pskbuild.js"));

let domains = process.argv.slice(2);
console.log("Argument domain list: ", domains);

if(domains.length === 0){
    let domainsDir = path.join(__dirname, "..", "domains");
    console.log(`No domain specified. Directory "${domainsDir}" scan started...`);

    let content = fs.readdirSync(domainsDir, {withFileTypes: true});
    for(let i=0; i<content.length; i++){
        let file = content[i];
        if(file.isDirectory()){
            domains.push(file.name);
        }
    }

    console.log("Found next domains", domains);
}

for(let i=0; i<domains.length; i++){
    let domain = domains[i];
    let domainTargetsMap = path.resolve(path.join(__dirname, "..", "domains", domain, "build.json"));
    let domainBundlesInput = path.join("bundles", "tmp");
    let domainBundlesOutput = path.join("bundles");

    console.log("Building domain", domain);
    try{
        let res = child_process.execSync(`node ${pskBuildPath} ${domainTargetsMap} `+
            `--input="${domainBundlesInput}" `+
            `--output="${domainBundlesOutput}"`, {cwd: path.resolve(path.join(__dirname, "..", "domains", domain))});
        console.log(res.toString());
    }catch(err){
        console.log(err);
    }
}