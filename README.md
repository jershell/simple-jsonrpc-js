# simple-jsonrpc-js

 + Client and server.
 + Support websocket and http. 
 + Full support json-rpc 2.0


## Installing

You can install this package either with 

```bower install simple-jsonrpc-js``` 
or 
```npm install simple-jsonrpc-js``` 

## Usage (over WebSocket) on server
```js

function add(x, y){
    return x + y;
}

//over ws
var WebSocketServer = new require('ws');
var JsonRPC = require('simple-jsonrpc-js');

var webSocketServer = new WebSocketServer.Server({
    host: '0.0.0.0',
    port: 8090
}).on('connection', function(ws) {
    var jrpc = new JsonRPC();
    ws.jrpc = jrpc;
    
    ws.jrpc.toStream = function(message){
        ws.send(message);
    };

    ws.on('message', function(message) {
        jrpc.messageHandler(message);
    });

    jrpc.dispatch('add', ['x', 'y'], add);
    
    jrpc.dispatch('mul', ['x', 'y'], function(x, y){
        return x*y;
    });

    jrpc.call('view.setTitle', ["JSONRPC over ws"]);

});

```

And on client:
```js
        //configure
        var jrpc = new simple_jsonrpc();
        var socket = new WebSocket("ws://localhost:8090");

        //wait of call
        jrpc.dispatch('view.setTitle', function(title){
            document.getElementsByClassName('title')[0].innerHTML = title;
        });

        socket.onmessage = function(event) {
            jrpc.messageHandler(event.data);
        };

        jrpc.toStream = function(_msg){
            socket.send(_msg);
        };

        socket.onerror = function(error) {
            console.error("Error: " + error.message);
        };

        socket.onclose = function(event) {
            if (event.wasClean) {
                console.info('Connection close was clean');
            } else {
                console.error('Connection suddenly close');
            }
            console.info('close code : ' + event.code + ' reason: ' + event.reason);
        };

        //usage
        //after connect
        socket.onopen = function(){

            //calls
            jrpc.call('add', [2, 3]).then(function (result) {
                document.getElementsByClassName('paragraph')[0].innerHTML += 'add(2, 3) result: ' + result + '<br>';
            });

            jrpc.call('mul', {y: 3, x: 2}).then(function (result) {
                document.getElementsByClassName('paragraph')[0].innerHTML += 'mul(2, 3) result: ' + result + '<br>';
            });
        };
```

More examples in directory

## API

```call(methodName, params)``` - call remote procedure
```notification(methodName, params)``` - call remote without response object
```batch(calls)``` - batch calls
```dispatch(methodName, paramsName, handler)``` - Registration method 
```customException(code, message, data)``` - return exception with implementation-defined server-errors

configuration:
```messageHandler(rawMessage)``` - 
```toStream(toRemoteService)```




