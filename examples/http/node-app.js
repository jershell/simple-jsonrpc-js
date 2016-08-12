#!/usr/bin/env node
'use strict';

var title = "JSONRPC over http";

function add(x, y){
    return x + y;
}

//over http
var http = require('http');
var url = require('url');
var JsonRPC = require('../../index');

http.createServer(function(request, response){
    var buffer = '';

    if (request.method === 'POST') {

        var jrpc = new JsonRPC();

        jrpc.dispatch('add', ['x', 'y'], add);

        jrpc.dispatch('mul', ['x', 'y'], function(x, y){
            return x*y;
        });

        jrpc.dispatch('view.getTitle', function(){
            return title;
        });

        jrpc.toStream = function(_msg){
            response.writeHead(200, {"Content-Type": "application/json"});
            response.end(_msg);
        };

        request.on('data', function (data) {
            buffer += data;
        });

        request.on('end', function () {
            jrpc.messageHandler(buffer);
        });
    }
    
}).listen(8888);
