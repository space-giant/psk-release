domainRequire=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/home/cosmin/Workspace/reorganizing/pskruntime/domains/exampleDomain/bundles/tmp/domain_intermediar.js":[function(require,module,exports){
(function (global){
global.domainLoadModules = function(){ 
	$$.__runtimeModules["example"] = require("example");
}
if (true) {
	domainLoadModules();
}; 
global.domainRequire = require;
if (typeof $$ !== "undefined") {            
    $$.requireBundle("domain");
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"example":"example"}],"example":[function(require,module,exports){
$$.swarm.describe("Echo", {
   say: function(message){
       this.return(null, "Echo:"+message);
   }
});
},{}]},{},["/home/cosmin/Workspace/reorganizing/pskruntime/domains/exampleDomain/bundles/tmp/domain_intermediar.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidW5kbGVzL3RtcC9kb21haW5faW50ZXJtZWRpYXIuanMiLCJsaWJyYXJpZXMvZXhhbXBsZS9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJnbG9iYWwuZG9tYWluTG9hZE1vZHVsZXMgPSBmdW5jdGlvbigpeyBcblx0JCQuX19ydW50aW1lTW9kdWxlc1tcImV4YW1wbGVcIl0gPSByZXF1aXJlKFwiZXhhbXBsZVwiKTtcbn1cbmlmICh0cnVlKSB7XG5cdGRvbWFpbkxvYWRNb2R1bGVzKCk7XG59OyBcbmdsb2JhbC5kb21haW5SZXF1aXJlID0gcmVxdWlyZTtcbmlmICh0eXBlb2YgJCQgIT09IFwidW5kZWZpbmVkXCIpIHsgICAgICAgICAgICBcbiAgICAkJC5yZXF1aXJlQnVuZGxlKFwiZG9tYWluXCIpO1xufTsiLCIkJC5zd2FybS5kZXNjcmliZShcIkVjaG9cIiwge1xuICAgc2F5OiBmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICB0aGlzLnJldHVybihudWxsLCBcIkVjaG86XCIrbWVzc2FnZSk7XG4gICB9XG59KTsiXX0=
