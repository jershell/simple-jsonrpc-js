#!/usr/bin/env node
'use strict';

var title = "JSONRPC over ws";

function add(x, y){
    return x + y;
}

//over ws
var WebSocketServer = new require('ws');
var JsonRPC = require('../../index');

var webSocketServer = new WebSocketServer.Server({
    host: '0.0.0.0',
    port: 8090
}).on('connection', function(ws) {
    var jrpc = new JsonRPC();
    ws.jrpc = jrpc;
    
    ws.jrpc.toStream = function(_message){
        ws.send(_message);
    };

    ws.on('message', function(message) {
        jrpc.messageHandler(message);
    });

    jrpc.dispatch('add', ['x', 'y'], add);
    
    jrpc.dispatch('mul', ['x', 'y'], function(x, y){
        return x*y;
    });

    jrpc.call('view.setTitle', [title]);

});

