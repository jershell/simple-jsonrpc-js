# simple-jsonrpc-js

- Client and server.
- Support websocket and http.
- Full support for JSON-RPC 2.0 (including auto-incrementing request IDs)

Originally created by [jershell / QuickResto](https://github.com/jershell). ([original Github repo](https://github.com/jershell/simple-jsonrpc-js))

Some updates written by [Privex Inc.](https://github.com/Privex) ([Privex's simple-jsonrpc fork repo](https://github.com/jershell/simple-jsonrpc-js))

## Browser Quickstart

For usage in browsers, you can quickly add it to your web application from [Privex's](https://www.privex.io) CDN - which hosts both the latest
Git version (master) of the library, along with official tagged release versions for safe production use.

```html
<script src="https://cdn.privex.io/lib/simple-jsonrpc/master/simple-jsonrpc-js.min.js"></script>

<script>
    // Create a Simple-JsonRPC object which can call HTTP JSON-RPC queries against the remote server https://rpc.example.com
    var jrpc = simple_jsonrpc.connect_xhr('https://rpc.example.com');

    // Equivelent to: {"jsonrpc":"2.0","method":"get_account","id":1,"params":["johndoe"]}
    jrpc.call('get_account', ['johndoe']).then(function(res) {
        console.log("User ID:", res.id);
        console.log("User Email:", res.email);
        console.log("User Name:", res.full_name);
    });
    // Equivelent to: {"jsonrpc":"2.0","method":"find_posts","id":2,"params":{"tag":"python","author":"jane.doe"}}
    jrpc.call('find_posts', {tag: 'python', author: 'jane.doe'}).then(function(posts) {
        for (var p of posts) {
            console.log("Post title:", p.title)
            console.log("Post tags:", p.tags)
            console.log("Post content:", p.content)
        }
    });
    // Equivelent to: {"jsonrpc":"2.0","method":"status","id":3}
    jrpc.call('status').then(function(status) {
        console.log(status);
    });

</script>
```

For safe production usage, you should use a versioned release of the library, with asset integrity attributes like so:

```html
<script src="https://cdn.privex.io/lib/simple-jsonrpc/1.0.0/simple-jsonrpc-js.min.js" 
        integrity="sha384-AlmC3wzXXhOcKeP42iv0VOyrxth6bLTmu4l4YgK9oii9MArKWpLFBfrFN91OxnEO" 
        crossorigin="anonymous">
</script>
```

Privex's CDN regularly publishes integrity hashes for the JS and CSS files they host, along with script/link tags with the integrity
attributes pre-configured for easy copy pasting: [https://cdn.privex.io/integrity.txt](https://cdn.privex.io/integrity.txt) (CTRL-F for `simple-jsonrpc`)

## Installing

You can install this package either with

### Bower - for HTML web clients

```sh
bower install simple-jsonrpc-js
```

### NPM or Yarn - for NodeJS applications

```sh
# Installing simple-jsonrpc-js with Yarn (https://yarnpkg.com/)
yarn install simple-jsonrpc-js
# If you don't have / don't want to use Yarn, you can install using NPM normally
npm install simple-jsonrpc-js
```

## Building production JS

```sh
# Install the 'gulp' tool globally
npm install -g gulp-cli

git clone https://github.com/jershell/simple-jsonrpc-js.git
cd simple-jsonrpc-js
# Install NodeJS dependencies
yarn install   # or npm install
# Compile simple-jsonrpc-js.js into dist/simple-jsonrpc-js.min.js
yarn build     # or npm build   ||  or just 'gulp compress'
```

## Usage

(over WebSocket) on server:

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

    jrpc.on('add', ['x', 'y'], add);

    jrpc.on('mul', ['x', 'y'], function(x, y){
        return x*y;
    });

    var item_id = 120;

    jrpc.on('create', ['item', 'rewrite'], function(item, rewrite){
        item_id ++;
        item.id = item_id;
        return item;
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
        jrpc.on('view.setTitle', function(title){
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

            jrpc.batch([
                {call:{method: "add", params: [5,2]}},
                {call:{method: "mul", params: [100, 200]}},
                {call:{method: "create", params: {item: {foo: "bar"}, rewrite: true}}}
            ]);
        };
```

More examples in directory

## API

```call(methodName, params)``` - Remote method invocation. Returned `promise` object.  

```notification(methodName, params)``` - Remote method invocation without response object  

```batch(calls)``` - batch invocation. Returned `promise` object.  

```on(methodName, paramsName, handler)``` - Registration local method for incommig invocation

```off(methodName)``` - disable method for incommig invocation

```customException(code, message, data)``` - return exception with implementation-defined server-errors    

***configuration:***  

```messageHandler(rawMessage)``` -  All incoming messages must be passed as a parameter.  Returned `promise` object.

```toStream```  - The property, a function pointer. It is necessary to determine before use. Will be called for send a message to the remote host  

## Dependecies

- NodeJS <= 8.11.4 (if using within a NodeJS app, or compiling) || Latest browser (if using client side)
- (Optional) [promise-polyfill](https://github.com/taylorhakes/promise-polyfill) for OLD versions of NodeJS and certain older browsers

## Specification

[http://www.jsonrpc.org/specification](http://www.jsonrpc.org/specification)
