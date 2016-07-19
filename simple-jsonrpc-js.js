(function(undefined) {
    'use strict';
    var _;
    if(typeof _ === "undefined" && typeof require !== "undefined"){
        _ = require('lodash');
    }
    else if(typeof _ === "undefined" && typeof window._ !== "undefined"){
        _ = window._;
    }
  
    var simple_jsonrpc = function(){

        var ERRORS = {
            "PARSE_ERROR": {
                "code": -32700,
                "message": "Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text."
            },
            "INVALID_REQUEST": {
                "code": -32600,
                "message": "Invalid Request	The JSON sent is not a valid Request object."
            },
            "METHOD_NOT_FOUND": {
                "code": -32601,
                "message": "Method not found	The method does not exist / is not available."
            },
            "INVALID_PARAMS": {
                "code": -32602,
                "message": "Invalid params	Invalid method parameter(s)."
            },
            "INTERNAL_ERROR": {
                "code": -32603,
                "message": "Internal error	Internal JSON-RPC error."
            }
        };

        var self = this,
            waitingframe = {},
            id = 0,
            dispatcher = {};

        function isPromise(thing){
            return !!thing && 'function' === typeof thing.then;
        }

        function resolveFunction(frame) {

        }

        function resolveFrame (frame){

            //resolve called function
            if(frame.id && frame.hasOwnProperty('result')){
                waitingframe[frame.id].resolve(frame.result);
                delete waitingframe[frame.id];
            }
            //remote call
            else if(frame.method && !frame.result){

                if(dispatcher.hasOwnProperty(frame.method)){
                    try {
                        var result;

                        if (frame.hasOwnProperty('params')) {
                            if(_.isArray(frame.params)){
                                result = dispatcher[frame.method].fn.apply(dispatcher, frame.params);
                            }
                            else if(_.isObject(frame.params)){
                                if(dispatcher[frame.method].params instanceof Array){
                                    var argsValues = [];
                                    dispatcher[frame.method].params.forEach(function (arg) {

                                        if (frame.params.hasOwnProperty(arg)) {
                                            argsValues.push(frame.params[arg]);
                                        }
                                        else {
                                            argsValues.push(undefined);
                                        }
                                    });
                                    result = dispatcher[frame.method].fn.apply(dispatcher, argsValues);
                                }
                                else {
                                    throw new Error('Need register these parameters for their use');
                                }
                            }
                        }
                        else {
                            result = dispatcher[frame.method]();
                        }

                        if(frame.hasOwnProperty('id')){
                            if (isPromise(result)) {
                                result
                                    .then(function (res) {
                                        if(_.isUndefined(res)){
                                            res = true;
                                        }
                                        self.toStream(JSON.stringify({
                                            "jsonrpc": "2.0",
                                            "id": frame.id,
                                            "result": res
                                        }));
                                    })
                                    .catch(function (E) {
                                        console.error(E);
                                        var error = ERRORS.INTERNAL_ERROR;
                                        error.data = E.message;

                                        self.toStream(JSON.stringify({
                                            "jsonrpc": "2.0",
                                            "id": frame.id,
                                            "error": error
                                        }));
                                    });
                            }
                            else {

                                if(_.isUndefined(result)){
                                    result = true;
                                }

                                self.toStream(JSON.stringify({
                                    "jsonrpc": "2.0",
                                    "id": frame.id,
                                    "result": result
                                }));
                            }
                        }
                    }
                    catch(Error){
                        console.error(Error);
                        var error = ERRORS.INTERNAL_ERROR;
                        error.data = Error.message;

                        self.toStream(JSON.stringify({
                            "jsonrpc": "2.0",
                            "id": frame.id,
                            "error": error
                        }));
                    }
                }
                else {
                    var error = ERRORS.METHOD_NOT_FOUND;
                    error.data = frame.method;

                    self.toStream(JSON.stringify({
                        "jsonrpc": "2.0",
                        "id": frame.id,
                        "error": error
                    }));
                }
            }
            else if(frame.error && frame.id){
                waitingframe[frame.id].reject(frame.error);
                delete waitingframe[frame.id];
            }
            else if(frame.error && !frame.id){
                console.log('unknown error', frame.error);
            }
            return waitingframe[frame.id];
        }

        function error(jsonrpcError, exception){
            var error = _.clone(jsonrpcError);
            error.data = exception.message;
            return error;
        }


        function isError(message){
            return message.hasOwnProperty('error') && message.hasOwnProperty('id');
        }

        function isRequest(message){
            return message.hasOwnProperty('method') && message.hasOwnProperty('id');
        }

        function isResponse(message){

        }

        function validateMessage(message){
            if(message.hasOwnProperty("message"))
            if(_.isArray(message)){

            }
            else if(_.isObject(message) && !_.isEmpty(message)){
                isError()
                isRequest()
                isResponse()
            }
        }

        function resolver(message){
            try {
                if(_.isArray(message)){
                    // var r;
                    // frames.forEach(function(frame){
                    //     r = resolveFrame(frame);
                    //     if(isPromise(r)){
                    //
                    //     }
                    // });
                    console.error('not implement');
                    throw "not implement"
                }
                else if(_.isObject(message)){
                    resolveFrame(message);
                }
            }
            catch (e){
                self.toStream(JSON.stringify({
                    "jsonrpc": "2.0",
                    "error": error(ERRORS.INTERNAL_ERROR, e)
                }));
            }
        }

        //{"jsonrpc": "2.0", "method": "subtract", "params": {"subtrahend": 23, "minuend": 42}, "id": 3}
        //{"jsonrpc": "2.0", "method": "subtract", "params": [23, 42], "id": 2}
        self.toStream = function(a){
            console.log(arguments);
        };

        self.dispatch = function(functionName, paramsNameFn, fn) {

            if(_.isString(functionName) && _.isArray(paramsNameFn) && _.isFunction(fn)){
                dispatcher[functionName] = {
                    fn: fn,
                    params: paramsNameFn
                };
            }
            else if(_.isString(functionName) && _.isFunction(paramsNameFn) && _.isUndefined(fn)){
                dispatcher[functionName] = {
                    fn: paramsNameFn,
                    params: null
                };
            }
            else {
                throw new Error('Missing required argument: functionName - string, paramsNameFn - string or function');
            }
        };

        self.call = function(method, params){
            return new Promise(function(resolve, reject){
                id += 1;
                var message = {
                    "jsonrpc": "2.0",
                    "method": method,
                    "id": id
                };

                if(_.isObject(params) && !_.isEmpty(params)){
                    message.params = params;
                }

                waitingframe[id.toString()] = {
                    resolve: resolve,
                    reject: reject
                };

                if(_.isFunction(self.toStream)){
                    self.toStream(JSON.stringify(message));
                }
            });
        };

        self.callNotification = function(method, params){
            var message = {
                "jsonrpc": "2.0",
                "method": method,
                "params": params,
            };

            if(_.isObject(params) && !_.isEmpty(params)){
                message.params = params;
            }

            self.toStream(JSON.stringify(message));
        };

        self.messageHandler = function(rawMessage){
            try {
                var message = JSON.parse(rawMessage);
                resolver(message);
            }
            catch (e) {
                console.log(e);
                self.toStream(JSON.stringify({
                    "jsonrpc": "2.0",
                    "error": ERRORS.PARSE_ERROR
                }));
            }
        };
    };

    var result = simple_jsonrpc;

    if (typeof define == 'function' && define.amd) {
        define('simple_jsonrpc', [], function() {
            return result;
        });
    }
    else if(typeof module !== "undefined" && typeof module.exports !== "undefined" ){
        module.exports = result;
    }
    else if(typeof window !== "undefined"){
        window.simple_jsonrpc = result;
    }
    else {
        return result;
    }
})();