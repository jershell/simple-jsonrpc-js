
var assert = require("assert")
var simple_jsonrpc = require('../simple-jsonrpc-js');

describe('#1', function(){
    it('should return -1 when the value is not present', function(){
        assert.equal(-1, [1,2,3].indexOf(5));
        assert.equal(-1, [1,2,3].indexOf(0));
    });
});