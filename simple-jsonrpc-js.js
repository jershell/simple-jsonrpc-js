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
                "message": "Invalid Request. The JSON sent is not a valid Request object."
            },
            "METHOD_NOT_FOUND": {
                "code": -32601,
                "message": "Method not found. The method does not exist / is not available."
            },
            "INVALID_PARAMS": {
                "code": -32602,
                "message": "Invalid params. Invalid method parameter(s)."
            },
            "INTERNAL_ERROR": {
                "code": -32603,
                "message": "Internal error. Internal JSON-RPC error."
            }
        };

        var self = this,
            waitingframe = {},
            id = 0,
            dispatcher = {};


        function setError(jsonrpcError, exception){
            var error = _.clone(jsonrpcError);
            if(!!exception){
                if(_.isObject(exception) && exception.hasOwnProperty("message")) {
                    error.data = exception.message;
                }
                else if(_.isString(exception)){
                    error.data = exception;
                }
            }
            return error;
        }

        function isPromise(thing){
            return !!thing && 'function' === typeof thing.then;
        }

        function isError(message){
            return !!message.error;
        }

        function isRequest(message){
            return !!message.method;
        }

        function isResponse(message){
            return message.hasOwnProperty('result') && message.hasOwnProperty('id');
        }

        function beforeResolve(message) {
            var promises = [];
            if (_.isArray(message)) {

                _.each(message, function (msg) {
                    promises.push(resolver(msg));

                });
            }
            else if (_.isObject(message)) {
                promises.push(resolver(message));
            }

            Promise.all(promises)
                .then(function (result) {

                    var toStream = [];
                    _.each(result, function (r) {
                        if (!_.isUndefined(r)) {
                            toStream.push(r);
                        }
                    });

                    if (toStream.length === 1) {
                        self.toStream(JSON.stringify(toStream[0]));
                    }
                    else if (toStream.length > 1) {
                        self.toStream(JSON.stringify(toStream));
                    }
                });
        }

        function resolver(message) {
            try {
                if (isError(message)) {
                    return rejectRequest(message);
                }
                else if (isResponse(message)) {
                    return resolveRequest(message);
                }
                else if (isRequest(message)) {
                    return handleRemoteRequest(message);
                }
                else {
                    return Promise.resolve({
                        "id": null,
                        "jsonrpc": "2.0",
                        "error": setError(ERRORS.INVALID_REQUEST)
                    });
                }
            }
            catch (e) {
                console.error('Resolver error:' + e.message, e);
            }
        }

        function rejectRequest(error){
            if(waitingframe.hasOwnProperty(error.id)){
                waitingframe[error.id].reject(error.error);
                delete waitingframe[error.id];
            }
            else {
                console.log('Unknown request', error);
            }
        }

        function resolveRequest(result){
            if(waitingframe.hasOwnProperty(result.id)) {
                waitingframe[result.id].resolve(result.result);
                delete waitingframe[result.id];
            }
            else {
                console.log('unknown request');
            }
        }

        function handleRemoteRequest(request){
            if(dispatcher.hasOwnProperty(request.method)){
                try {
                    var result;

                    if (request.hasOwnProperty('params')) {
                        if(_.isArray(request.params)){
                            result = dispatcher[request.method].fn.apply(dispatcher, request.params);
                        }
                        else if(_.isObject(request.params)){
                            if(dispatcher[request.method].params instanceof Array){
                                var argsValues = [];
                                dispatcher[request.method].params.forEach(function (arg) {

                                    if (request.params.hasOwnProperty(arg)) {
                                        argsValues.push(request.params[arg]);
                                        delete request.params[arg];
                                    }
                                    else {
                                        argsValues.push(undefined);
                                    }
                                });

                                if(Object.keys(request.params).length > 0){
                                    return Promise.resolve({
                                        "jsonrpc": "2.0",
                                        "id": request.id,
                                        "error": setError(ERRORS.INVALID_PARAMS, {
                                            message: "Params: " + Object.keys(request.params).toString() + " not used"
                                        })
                                    });
                                }
                                else {
                                    result = dispatcher[request.method].fn.apply(dispatcher, argsValues);
                                }
                            }
                            else {
                                return Promise.resolve({
                                    "jsonrpc": "2.0",
                                    "id": request.id,
                                    "error": setError(ERRORS.INVALID_PARAMS, "Undeclared arguments of the method " + request.method)
                                });
                            }
                        }
                    }
                    else {
                        result = dispatcher[request.method].fn();
                    }

                    if(request.hasOwnProperty('id')){
                        if (isPromise(result)) {
                            return result.then(function (res) {
                                    if(_.isUndefined(res)){
                                        res = true;
                                    }
                                    return {
                                        "jsonrpc": "2.0",
                                        "id": request.id,
                                        "result": res
                                    };
                                })
                                .catch(function (e) {
                                    return {
                                        "jsonrpc": "2.0",
                                        "id": request.id,
                                        "error": setError(ERRORS.INTERNAL_ERROR, e)
                                    };
                                });
                        }
                        else {

                            if(_.isUndefined(result)){
                                result = true;
                            }

                            return Promise.resolve({
                                "jsonrpc": "2.0",
                                "id": request.id,
                                "result": result
                            });
                        }
                    }
                    else {
                        return Promise.resolve(); //nothing, it notification
                    }
                }
                catch(e){
                    return Promise.resolve({
                        "jsonrpc": "2.0",
                        "id": request.id,
                        "error": setError(ERRORS.INTERNAL_ERROR, e)
                    });
                }
            }
            else {
                return Promise.resolve({
                    "jsonrpc": "2.0",
                    "id": request.id,
                    "error": setError(ERRORS.METHOD_NOT_FOUND, {
                        message: request.method
                    })
                });
            }
        }

        function notification(method, params){
            var message = {
                "jsonrpc": "2.0",
                "method": method,
                "params": params,
            };

            if(_.isObject(params) && !_.isEmpty(params)){
                message.params = params;
            }

            return message;
        }

        function call(method, params){
            id += 1;
            var message = {
                "jsonrpc": "2.0",
                "method": method,
                "id": id
            };

            if(_.isObject(params) && !_.isEmpty(params)){
                message.params = params;
            }

            return {
                promise: new Promise(function(resolve, reject){
                    waitingframe[id.toString()] = {
                        resolve: resolve,
                        reject: reject
                    };
                }),
                message: message
            }
        }

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
            var _call = call(method, params);
            self.toStream(JSON.stringify(_call.message));
            return _call.promise;
        };

        self.notification = function(method, params){
            self.toStream(JSON.stringify(notification(method, params)));
        };

        self.batch = function(requests){
            var promises = [];
            var message = [];

            _.each(requests, function(req){
                if(req.hasOwnProperty('call')){
                    var _call = call(req.call.method, req.call.params);
                    message.push(_call.message);
                    //TODO(jershell): batch reject if one promise reject, so catch reject and resolve error;
                    promises.push(_call.promise.then(function(res){
                        return res;
                    }, function(err){
                        return err;
                    }));
                }
                else if(req.hasOwnProperty('notification')){
                    message.push(notification(req.notification.method, req.notification.params));
                }
            });

            self.toStream(JSON.stringify(message));
            return Promise.all(promises);
        };

        self.messageHandler = function(rawMessage){
            try {
                var message = JSON.parse(rawMessage);
                beforeResolve(message);
            }
            catch (e) {
                console.log("Error in messageHandler(): ", e);
                self.toStream(JSON.stringify({
                    "id": null,
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