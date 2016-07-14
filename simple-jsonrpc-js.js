(function(undefined) {
    'use strict';
    var simple_jsonrpc = function(){
        console.log('init simple_jsonrpc instance');
        var ERRORS = {
            "INVALID_REQUEST": {
                "code": -32600,
                "message": "Invalid Request	The JSON sent is not a valid Request object."
            },
            "PARSE_ERROR": {
                "code": -32700,
                "message": "Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text."
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
                            result = _.isArray(frame.params) ?
                                dispatcher[frame.method].apply(dispatcher, frame.params) :
                                (function () {
                                    throw new Error('position params is not implemented');
                                    // var argsName = $injector.annotate(dispatcher[frame.method]),
                                    //     argsValues = [];
                                    //
                                    // argsName.forEach(function (arg) {
                                    //
                                    //     if (frame.params.hasOwnProperty(arg)) {
                                    //         argsValues.push(frame.params[arg]);
                                    //     }
                                    //     else {
                                    //         argsValues.push(undefined);
                                    //     }
                                    // });
                                    // console.debug('argsValues', argsValues);
                                    // return dispatcher[frame.method].apply(dispatcher, argsValues);
                                }());
                        }
                        else {
                            result = dispatcher[frame.method]();
                        }

                        if (isPromise(result)) {
                            result
                                .then(function (res) {
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
                            self.toStream(JSON.stringify({
                                "jsonrpc": "2.0",
                                "id": frame.id,
                                "result": result
                            }));
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
                    self.toStream({
                        "jsonrpc": "2.0",
                        "id": frame.id,
                        "error": ERRORS.METHOD_NOT_FOUND
                    });
                }
            }
            else if(frame.error && frame.id){
                waitingframe[frame.id].reject(frame.error);
                delete waitingframe[frame.id];
            }
            else if(frame.error && !frame.id){
                console.debug('unknown error', frame.error);
            }
            return waitingframe[frame.id];
        }

        //{"jsonrpc": "2.0", "method": "subtract", "params": {"subtrahend": 23, "minuend": 42}, "id": 3}
        //{"jsonrpc": "2.0", "method": "subtract", "params": [23, 42], "id": 2}
        self.toStream = function(a){
            console.debug(arguments);
        };

        self.dispatch = function(functionName, callback) {
            dispatcher[functionName] = callback;
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

        self.callNotification = function(){
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

                if(_.isArray(message)){
                    // var r;
                    // frames.forEach(function(frame){
                    //     r = resolveFrame(frame);
                    //     if(isPromise(r)){
                    //
                    //     }
                    // });
                    console.error('not implement');
                    self.toStream(JSON.stringify({
                        "jsonrpc": "2.0",
                        "error": ERRORS.INTERNAL_ERROR
                    }));
                    throw "not implement"
                }
                else if(_.isObject(message)){
                    resolveFrame(message);
                }
            }
            catch (e) {
                self.toStream(JSON.stringify({
                    "jsonrpc": "2.0",
                    "error": ERRORS.PARSE_ERROR
                }));
            }
        };
    };

    var result = new simple_jsonrpc();

    if (typeof define == 'function' && define.amd) {
        define('simple_jsonrpc', [], function() {
            return result;
        });
    }
    else if(typeof module !== undefined && typeof module.exports !== undefined ){
        module.exports = result;
    }
    else {
        return result;
    }
})();