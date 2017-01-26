if (typeof require !== 'undefined') {
    var chai = require('chai');
    chai.should();
    var simple_jsonrpc = require('../simple-jsonrpc-js');
}

var assert = chai.assert;
var expect = chai.expect;

describe('Request object', function(){

    var JsonRpc;
    var ERRORS = {
        "PARSE_ERROR": -32700,
        "INVALID_REQUEST": -32600,
        "METHOD_NOT_FOUND": -32601,
        "INVALID_PARAMS": -32602,
        "INTERNAL_ERROR": -32603
    };

    beforeEach(function() {
        JsonRpc = new simple_jsonrpc();
    });

    describe('@call', function(){

        it('should be generate valid message', function (done) {
            var inputJson;
            JsonRpc.toStream = function (message) {
                inputJson = JSON.parse(message);

                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson.jsonrpc).equal("2.0");
                expect(inputJson).to.have.ownProperty('method');
                expect(inputJson).to.have.ownProperty('id');
                done();
            };
            JsonRpc.call('add', [2, 3]);
        });

        it('should be increment index', function(){
            var inputJson;
            var indexes = [];

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                indexes.push(parseInt(inputJson.id));
            };

            JsonRpc.call('createA');
            JsonRpc.call('updateA');
            JsonRpc.call('deleteA');

            expect(indexes[0] < indexes[1]).to.be.true;
            expect(indexes[1] < indexes[2]).to.be.true;

        });

        it('should be without params', function(done){
            var inputJson;
            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.not.have.ownProperty('params');
                done();
            };
            JsonRpc.call('createA');
        });

        it('should be by-position params', function(done){
            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('params');
                assert.isArray(inputJson.params);
                assert.isObject(inputJson.params[2]);
                done();
            };

            JsonRpc.call('createA', ['A', 2+3, {foo: "bar"}]);
        });

        it('should be by-name params', function(done){
            var inputJson;
            var params = {
                name: 'A',
                pos: 2 + 3,
                ext: {
                    foo: "bar"
                }
            };
            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('params');
                expect(inputJson.params.name).to.equal(params.name);
                expect(inputJson.params.pos).to.equal(params.pos);
                expect(inputJson.params.ext).to.eql(params.ext);
                done();
            };
            JsonRpc.call('createA', params);
        });

    });

    describe('@notification', function(){

        it('should be generate valid message', function(done){
            var inputMessage;
            var inputJson;
            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson.jsonrpc).equal("2.0");
                expect(inputJson).to.have.ownProperty('method');
                expect(inputJson).to.not.have.ownProperty('id');
                done();
            };
            JsonRpc.notification('add', [2,3]);
        });

        it('should be without params', function(done){
            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.not.have.ownProperty('params');
                done();
            };
            JsonRpc.notification('createA');
        });

        it('should be by-position params', function(done){
            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('params');
                assert.isArray(inputJson.params);
                assert.isObject(inputJson.params[2]);
                done();
            };

            JsonRpc.notification('createA', ['A', 2+3, {foo: "bar"}]);
        });

        it('should be by-name params', function(done){
            var inputJson;
            var params = {
                name: 'A',
                pos: 2 + 3,
                ext: {
                    foo: "bar"
                }
            };
            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('params');
                expect(inputJson.params.name).to.equal(params.name);
                expect(inputJson.params.pos).to.equal(params.pos);
                expect(inputJson.params.ext).to.eql(params.ext);
                done();
            };

            JsonRpc.notification('createA', params);
        });
    });

    describe('@batch', function(){

        it('should be generate valid message', function(done){
            var inputMessage;
            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);

                for(var idx in inputJson){
                    expect(inputJson[idx]).to.have.ownProperty('jsonrpc');
                    expect(inputJson[idx]).to.have.ownProperty('method');
                    if(inputJson[idx].method === "alert"){
                        expect(inputJson[idx]).to.not.have.ownProperty('id');
                    }
                    else {
                        expect(inputJson[idx]).to.have.ownProperty('id');
                    }
                }
                expect(inputJson.length).equal(6);
                done();
            };

            JsonRpc.batch([
                {call: {method: 'add', params: [2, 3]}},
                {notification: {method:'alert', params: {text:"Achtung!"}}},
                {call: {method: 'delete', params: {"id": "4"}}},
                {call: {method: 'delete', params: {"id": "5"}}},
                {call: {method: 'delete', params: {"id": "6"}}},
                {call: {method: 'start'}}
            ]);
        });

    });

});

describe('Response object', function () {

    // Handle incoming messages
    //1     Incoming call
    //1.1   Positional parameters
    //1.2   Named parameters
    //2     Incoming notifications
    //2.1   Positional parameters
    //2.2   Named parameters
    //3     Incoming results
    //4     Incoming error
    //5     Outgoing error
    var JsonRpc;
    var ERRORS = {
        "PARSE_ERROR": -32700,
        "INVALID_REQUEST": -32600,
        "METHOD_NOT_FOUND": -32601,
        "INVALID_PARAMS": -32602,
        "INTERNAL_ERROR": -32603
    };

    describe('Success', function(){

        beforeEach(function() {
            JsonRpc = new simple_jsonrpc();
        });

        it('Incoming call. The messageHandler(raw valid message) should be return resolved Promise', function(done){
            JsonRpc.on('add', function(x, y){
                return x+y;
            });

            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('result');
                expect(inputJson).to.not.have.ownProperty('error');
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id": 2, "method": "add", "params": [32, 48]}')
                .then(function(result){
                    console.log('messageHandler->', result);
                    done();
                });
        });

        it('Incoming call. The messageHandler(raw invalid message) should be return resolved Promise', function(done){


            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                done(message);
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id": 202, "result": "88"}')
                .then(function(result){
                    console.log('messageHandler->', result);
                    done();
                });
        });

        it('Incoming call. Positional parameters. Should be return object with result, id, jsonrpc properties', function(done){
            JsonRpc.on('add', function(x, y){
                return x+y;
            });

            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('result');
                expect(inputJson).to.not.have.ownProperty('error');
                done();
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id": 2, "method": "add", "params": [32, 48]}');
        });

        it('Incoming call. Named parameters. Should be return object with result, id, jsonrpc properties', function(done){
            JsonRpc.on('add', ['x', 'y'], function(x, y){
                return x+y;
            });

            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('result');
                expect(inputJson).to.not.have.ownProperty('error');
                done();
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id": 2, "method": "add", "params": {"x":32, "y": 48}}');

        });

        it('Incoming notification. Positional parameters. Should be nothing return', function(done){

            JsonRpc.on('alert', ["message", "level"], function(message, level){
                expect(message).to.equal("text");
                expect(level).to.equal(5);
                done();
            });

            JsonRpc.toStream = function(msg){
                done(new Error('Notification not should sending the result'+msg));
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "method": "alert", "params": ["text", 5]}');
        });

        it('Incoming notification. Named parameters. Should be nothing return', function(done){
            JsonRpc.on('alert', ["message", "level"], function(message, level){
                expect(message).to.equal("text");
                expect(level).to.equal(5);
                done();
                return message;
            });

            JsonRpc.toStream = function(msg){
                done(new Error('Notification not should sending the result:'+msg));
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "method": "alert", "params": {"level": 5, "message": "text"}}');
        });

        it('Incoming results. Should be resolve call', function(done){
            JsonRpc.call('add', [2,3])
                .then(function(result){
                    expect(result).to.equal(5);
                    done();
                });

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id": 1, "result": 5}');
        });

    });

    describe('Errors', function(){

        beforeEach(function() {
            JsonRpc = new simple_jsonrpc();
        });

        it('should be contained the parse error property and not contained the result property', function(done){

            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('error');
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson.error.code).to.have.equal(ERRORS.PARSE_ERROR);
                expect(inputJson).to.not.have.ownProperty('result');
                done();
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id": 2, "method": "delete", "params": {"id"');

        });

        it('should be contained the invalid request error property and not contained the result property', function(done){
            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('error');
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson.error.code).to.have.equal(ERRORS.INVALID_REQUEST);
                expect(inputJson).to.not.have.ownProperty('result');
                done();
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0"}');
        });

        it('should be contained "Method not found" the error property and not contained the result property', function(done){
            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('error');
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson.error).to.have.ownProperty('data');
                expect(inputJson.error.code).to.have.equal(ERRORS.METHOD_NOT_FOUND);
                expect(inputJson).to.not.have.ownProperty('result');
                done();
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id":44, "method": "delete", "params": {"id": 7}}');
        });

        it('Named params. should be contained "Invalid params" the error property and not contained the result property', function(done){
            var inputJson;

            JsonRpc.on('delete', function(){
               return;
            });

            var count = 0;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('error');
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson.error.code).to.have.equal(ERRORS.INVALID_PARAMS);
                expect(inputJson).to.not.have.ownProperty('result');
                done();
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id":445, "method": "delete", "params": {"id": 7}}');
        });

        it('Named params. should be contained "Invalid params" the error property and not contained the result property', function(done){
            var inputJson;

            JsonRpc.on('delete',["index"], function(index){
                return index;
            });

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('error');
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson.error.code).to.have.equal(ERRORS.INVALID_PARAMS);
                expect(inputJson).to.not.have.ownProperty('result');
                done();
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id":44, "method": "delete", "params": {"id": 7}}');
        });

        it('should be contained the internal error property and not contained the result property', function(done){
            var inputJson;

            JsonRpc.on('delete', function(){
               var item = {};
               return item.deleted();
            });

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson).to.have.ownProperty('error');
                expect(inputJson.error).to.have.ownProperty('data');
                expect(inputJson.error.code).to.have.equal(ERRORS.INTERNAL_ERROR);
                expect(inputJson).to.not.have.ownProperty('result');
                done();
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id":44, "method": "delete", "params": [7]}');
        });

        it('should be contained the internal error property and not contained the result property', function(done){
            var inputJson;

            JsonRpc.on('delete', function(index){
                return Promise.reject('3.14159265' + index);
            });

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson).to.have.ownProperty('error');
                expect(inputJson.error).to.have.ownProperty('data');
                expect(inputJson.error.code).to.have.equal(ERRORS.INTERNAL_ERROR);
                expect(inputJson).to.not.have.ownProperty('result');
                done();
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id":444, "method": "delete", "params": ["zdec"]}');
        });

        it('should be contained the custom error property and not contained the result property', function(done){
            var inputJson;

            JsonRpc.on('delete', function(index){
                throw JsonRpc.customException(-32001, "Utm offline");
                return Promise.reject('3.14159265' + index);
            });

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson).to.have.ownProperty('error');
                expect(inputJson.error).to.not.have.ownProperty('data');
                expect(inputJson.error.code).to.have.equal(-32001);
                expect(inputJson).to.not.have.ownProperty('result');
                done();
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id":444, "method": "delete", "params": ["zdec"]}');
        });


        it('should be contained data property in the custom error', function(done){
            var inputJson;

            JsonRpc.on('delete', function(index){
                throw JsonRpc.customException(-32001, "Utm offline", "504 Gateway Timeout");
                return Promise.reject('3.14159265' + index);
            });

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                console.log("###_###");
                console.log(message);
                console.log("###_###");
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson).to.have.ownProperty('error');
                expect(inputJson.error).to.have.ownProperty('data');
                expect(inputJson.error.code).to.have.equal(-32001);
                expect(inputJson).to.not.have.ownProperty('result');
                done();
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id":4445, "method": "delete", "params": ["zdec"]}');
        });

    });

    describe('Batch', function(){

        beforeEach(function() {
            JsonRpc = new simple_jsonrpc();
        });

        it('Incoming request', function(done){
            var inputJson;

            JsonRpc.on("sum", ["x", "y", "z"], function(x, y, z){
                return x+y+z;
            });

            JsonRpc.on("notify_hello", function(idx){
                return idx;
            });

            JsonRpc.on("subtract", ["x", "y"], function(x, y){
                return x-y;
            });

            JsonRpc.on("get_data", ["id"], function(id){
                return {"id":id, "name": "Darkwing duck"};
            });

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);

                for(var idx in inputJson){
                    expect(inputJson[idx]).to.have.ownProperty('jsonrpc');
                    expect(inputJson[idx]).to.have.ownProperty('id');
                }
                expect(inputJson.length).equal(5);

                //sum
                expect(inputJson[0].id).equal("11");
                expect(inputJson[0]).to.have.ownProperty('result');
                expect(inputJson[0].result).equal(7);

                //notify


                //subtract
                expect(inputJson[1].id).equal("223");
                expect(inputJson[1]).to.have.ownProperty('result');
                expect(inputJson[1].result).equal(19);

                //INVALID_REQUEST
                expect(inputJson[2]).to.have.ownProperty('error');
                expect(inputJson[2].error.code).to.have.equal(ERRORS.INVALID_REQUEST);
                expect(inputJson[2]).to.not.have.ownProperty('result');

                //METHOD_NOT_FOUND
                expect(inputJson[3]).to.have.ownProperty('error');
                expect(inputJson[3].error).to.have.ownProperty('data');
                expect(inputJson[3].error.code).to.have.equal(ERRORS.METHOD_NOT_FOUND);
                expect(inputJson[3]).to.not.have.ownProperty('result');

                //
                expect(inputJson[4].id).equal("9");
                expect(inputJson[4]).to.have.ownProperty('result');

                done();
            };

            JsonRpc.messageHandler('[\
            {"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "11"},\
            {"jsonrpc": "2.0", "method": "notify_hello", "params": ["hello"]},\
            {"jsonrpc": "2.0", "method": "subtract", "params": [42,23], "id": "223"},\
            {"foo": "boo"},\
            {"jsonrpc": "2.0", "method": "foo.get", "params": {"name": "myself"}, "id": "5"},\
            {"jsonrpc": "2.0", "method": "get_data", "id": "9"}\
            ]');

        });

        it('Incoming response batch', function(done){

            JsonRpc.batch([
                {call:{method: "add", params: [5,2]}},
                {call:{method: "concat_to_int", params: {"a": "1", "b":"9"}}},
                {call:{method: "concat_to_int", params: {"a": "1", "b":"9"}}},
                {call:{method: "get_item", params: {"a": "1", "b":"9"}}}
            ])
            .then(function(results){

                expect(results[0]).to.equal(7);
                expect(results[1]).to.equal(19);
                expect(results[2]).to.have.ownProperty("data"); // it error
                expect(results[3]).to.have.ownProperty("name");
                done();

            });

            JsonRpc.messageHandler('[' +
                '{"jsonrpc":"2.0","id":"1","result":7},' +
                '{"jsonrpc":"2.0","id":"2","result":19},' +
                '{"id":null,"jsonrpc":"2.0","error":{"code":-32600,"message":"Invalid Request. The JSON sent is not a valid Request object."}},' +
                '{"jsonrpc":"2.0","id":"3","error":{"code":-32603,"message":"Internal error. Internal JSON-RPC error.","data":"dispatcher[request.method] is not a function"}},' +
                '{"jsonrpc":"2.0","id":"4","result":{"name":"Darkwing duck"}}]' +
                '');
        });

        it('Incoming response each', function(done){

            var promises = [];

            promises.push(JsonRpc.call('add', [5, 2])
                .then(function (result) {
                    expect(result).to.equal(7);
                }));

            promises.push(JsonRpc.call('concat_to_int', {"a": "1", "b":"9"})
                .then(function (result) {
                    expect(result).to.equal(19);
                }));

            promises.push(JsonRpc.call('concat_to_int', {"a": "1", "b":"9"})
                .catch(function(error){
                    expect(error).to.have.ownProperty("data");
                    return Promise.resolve(error);
                })
            );

            promises.push(JsonRpc.call('get_item', {"a": "1", "b":"9"})
                .then(function(result){
                    expect(result).to.have.ownProperty("name");
                })
            );

            Promise.all(promises).then(function(){
                done();
            });

            JsonRpc.messageHandler('[' +
                '{"jsonrpc":"2.0","id":"1","result":7},' +
                '{"jsonrpc":"2.0","id":"2","result":19},' +
                '{"id":null,"jsonrpc":"2.0","error":{"code":-32600,"message":"Invalid Request. The JSON sent is not a valid Request object."}},' +
                '{"jsonrpc":"2.0","id":"3","error":{"code":-32603,"message":"Internal error. Internal JSON-RPC error.","data":"dispatcher[request.method] is not a function"}},' +
                '{"jsonrpc":"2.0","id":"4","result":{"name":"Darkwing duck"}}]' +
            '');
        });


    });

});
