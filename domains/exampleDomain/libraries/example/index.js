$$.swarm.describe("Echo", {
   say: function(message){
       this.return(null, "Echo:"+message);
   }
});