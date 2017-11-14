

function PDSFileStorage(baseFolder){

}



exports.createSTorage = function(type, options){
    return new PDSFileStorage(options);
}