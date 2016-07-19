describe('Request object', function(){

    var JsonRpc;

    beforeEach(function() {
        JsonRpc = new simple_jsonrpc();
    });

    describe('@call', function(){

        it('should be generate valid message', function(done){
            var inputJson;
            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);

                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson.jsonrpc).equal("2.0");
                expect(inputJson).to.have.ownProperty('method');
                expect(inputJson).to.have.ownProperty('id');
                done();
            };
            JsonRpc.call('add', [2,3]);
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

    describe('@callNotification', function(){

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
            JsonRpc.callNotification('add', [2,3]);
        });

        it('should be without params', function(done){
            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.not.have.ownProperty('params');
                done();
            };
            JsonRpc.callNotification('createA');
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

            JsonRpc.callNotification('createA', ['A', 2+3, {foo: "bar"}]);
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

            JsonRpc.callNotification('createA', params);
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

    describe('Success', function(){

        var JsonRpc;

        beforeEach(function() {
            JsonRpc = new simple_jsonrpc();
        });

        it('Incoming call. Positional parameters. Should be return object with result, id, jsonrpc properties', function(done){
            JsonRpc.dispatch('add', function(x, y){
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
            JsonRpc.dispatch('add', ['x', 'y'], function(x, y){
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

            JsonRpc.dispatch('alert', ["message", "level"], function(message, level){
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
            JsonRpc.dispatch('alert', ["message", "level"], function(message, level){
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

        var ERRORS = {
            "PARSE_ERROR":  -32700,
            "INVALID_REQUEST": -32600,
            "METHOD_NOT_FOUND":-32601,
            "INVALID_PARAMS": -32602,
            "INTERNAL_ERROR":  -32603
        };

        var JsonRpc;

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

            JsonRpc.dispatch('delete', function(){
               return;
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

        it('Named params. should be contained "Invalid params" the error property and not contained the result property', function(done){
            var inputJson;

            JsonRpc.dispatch('delete',["index"], function(index){
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

        it('Position params. should be contained "Invalid params" the error property and not contained the result property', function(done){
            var inputJson;

            JsonRpc.dispatch('delete', function(){
                return true;
            });

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson).to.have.ownProperty('error');
                expect(inputJson.error.code).to.have.equal(ERRORS.INVALID_PARAMS);
                expect(inputJson).to.not.have.ownProperty('result');
                done();
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id":44, "method": "delete", "params": [7]}');
        });

        it('should be contained the internal error property and not contained the result property', function(done){
            var inputJson;

            JsonRpc.dispatch('delete', function(){
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

            JsonRpc.dispatch('delete', function(index){
                return Promise.reject('3.14159265zdec');
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

    });
});