var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
chai.should();
var simple_jsonrpc = require('../simple-jsonrpc-js');

describe('Request object', function(){

    var JsonRpc;

    beforeEach(function() {
        JsonRpc = new simple_jsonrpc();
    });

    describe('@call', function(){

        it('should be generate valid message', function(){
            var inputMessage;
            var inputJson;

            JsonRpc.toStream = function(message){
                inputMessage = message;
            };

            JsonRpc.call('add', [2,3]);
            inputJson = JSON.parse(inputMessage);

            expect(inputJson).to.have.ownProperty('jsonrpc');
            expect(inputJson.jsonrpc).equal("2.0");
            expect(inputJson).to.have.ownProperty('method');
            expect(inputJson).to.have.ownProperty('id');

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

        it('should be without params', function(){
            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
            };

            JsonRpc.call('createA');

            expect(inputJson).to.not.have.ownProperty('params');
        });

        it('should be by-position params', function(){
            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
            };

            JsonRpc.call('createA', ['A', 2+3, {foo: "bar"}]);

            expect(inputJson).to.have.ownProperty('params');
            assert.isArray(inputJson.params);
            assert.isObject(inputJson.params[2]);

        });

        it('should be by-name params', function(){
            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
            };
            var params = {
                name: 'A',
                pos: 2 + 3,
                ext: {
                    foo: "bar"
                }
            };

            JsonRpc.call('createA', params);

            expect(inputJson).to.have.ownProperty('params');
            expect(inputJson.params.name).to.equal(params.name);
            expect(inputJson.params.pos).to.equal(params.pos);
            expect(inputJson.params.ext).to.eql(params.ext);
        });

    });

    describe('@callNotification', function(){

        it('should be generate valid message', function(){
            var inputMessage;
            var inputJson;

            JsonRpc.toStream = function(message){
                inputMessage = message;
            };

            JsonRpc.callNotification('add', [2,3]);
            inputJson = JSON.parse(inputMessage);

            expect(inputJson).to.have.ownProperty('jsonrpc');
            expect(inputJson.jsonrpc).equal("2.0");
            expect(inputJson).to.have.ownProperty('method');
            expect(inputJson).to.not.have.ownProperty('id');

        });

        it('should be without params', function(){
            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
            };

            JsonRpc.callNotification('createA');

            expect(inputJson).to.not.have.ownProperty('params');
        });

        it('should be by-position params', function(){
            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
            };

            JsonRpc.callNotification('createA', ['A', 2+3, {foo: "bar"}]);

            expect(inputJson).to.have.ownProperty('params');
            assert.isArray(inputJson.params);
            assert.isObject(inputJson.params[2]);

        });

        it('should be by-name params', function(){
            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
            };
            var params = {
                name: 'A',
                pos: 2 + 3,
                ext: {
                    foo: "bar"
                }
            };

            JsonRpc.callNotification('createA', params);

            expect(inputJson).to.have.ownProperty('params');
            expect(inputJson.params.name).to.equal(params.name);
            expect(inputJson.params.pos).to.equal(params.pos);
            expect(inputJson.params.ext).to.eql(params.ext);
        });
    });

});

describe('Response object', function () {

    var JsonRpc;


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

        beforeEach(function() {
            JsonRpc = new simple_jsonrpc();
        });

        it('Incoming call. Positional parameters. Should be return object with result, id, jsonrpc properties', function(){
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
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id": 2, "method": "add", "params": [32, 48]}');
        });

        it('Incoming call. Named parameters. Should be return object with result, id, jsonrpc properties', function(){
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
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id": 2, "method": "add", "params": {"x":32, "y": 48}}');

        });

        it('Incoming notification. Positional parameters. Should be nothing return', function(done){
            JsonRpc.dispatch('alert', ["message", "level"], function(message, level){
                expect(message).to.equal("text");
                expect(level).to.equal(5);
                return message;
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
                return message;
            });

            JsonRpc.toStream = function(msg){
                done(new Error('Notification not should sending the result:'+msg));
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "method": "alert", "params": {"level": 5, "message": "text"}}');
        });

        it('Incoming results. Should be resolve call', function(){

            JsonRpc.dispatch('add', function(x, y){
                return x+y;
            });

            JsonRpc.call('add', [2,3])
                .then(function(result){
                    expect(result).to.equal(5);
                });
            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id": 0, "result": "5"}');
        });

    });

    describe('Error', function(){
        
        beforeEach(function() {
            JsonRpc = new simple_jsonrpc();
        });

        it('should be contained the error property', function(){
            JsonRpc.dispatch('add', function(x, y){
                return x+y;
            });

            var inputJson;

            JsonRpc.toStream = function(message){
                inputJson = JSON.parse(message);
                expect(inputJson).to.have.ownProperty('id');
                expect(inputJson).to.have.ownProperty('jsonrpc');
                expect(inputJson).to.have.ownProperty('error');
                expect(inputJson).to.not.have.ownProperty('result');
            };

            JsonRpc.messageHandler('{"jsonrpc": "2.0", "id": 2, "method": "delete", "params": [32, 48]}');

        });
    });
});