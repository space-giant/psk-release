exports.createSwarmMessageFromJson = function(swarmName, phaseName, agentName, messageSignature, jsonContent){
    var msg = {
        __meta:{
            swarm:swarmName,
            phase:phaseName,
            agent:AgentName,
            signature:messageSignature
        }
    }
    for(var v in jsonContent){
        msg[v] = jsonContent[v];
    }
    return msg;
}
