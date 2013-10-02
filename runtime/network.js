var WebSocketServer = require('websocket').server;
var Base = require('noflo-runtime-base');

function WebSocketRuntime (options) {
  if (!options) {
    options = {};
  }
  this.connections = [];
  if (options.catchExceptions) {
    process.on('uncaughtException', function (err) {
      this.connections.forEach(function (connection) {
        this.send('network', 'error', {
          message: err.toString()
        }, {
          connection: connection
        });
      }.bind(this));
    }.bind(this));
  }

  if (options.captureOutput) {
    this.startCapture();
  }

  this.prototype.constructor.apply(this, arguments);
  this.receive = this.prototype.receive;
}
WebSocketRuntime.prototype = Base;
WebSocketRuntime.prototype.send = function (protocol, topic, payload, context) {
  if (!context.connection || !context.connection.connected) {
    return;
  }
  context.connection.sendUTF(JSON.stringify({
    protocol: protocol,
    command: topic,
    payload: payload
  }));
};

WebSocketRuntime.prototype.startCapture = function () {
  this.originalStdOut = process.stdout.write;
  process.stdout.write = function (string, encoding, fd) {
    this.connections.forEach(function (connection) {
      this.send('network', 'output', {
        message: string.replace(/\n$/, '')
      }, {
        connection: connection
      });
    }.bind(this));
  }.bind(this);
};

WebSocketRuntime.prototype.stopCapture = function () {
  if (!this.originalStdOut) {
    return;
  }
  process.stdout.write = this.originalStdOut;
};

module.exports = function (httpServer, options) {
  var wsServer = new WebSocketServer({
    httpServer: httpServer
  });

  var runtime = new WebSocketRuntime(options);
  var handleMessage = function (message, connection) {
    if (message.type == 'utf8') {
      try {
        var contents = JSON.parse(message.utf8Data);
      } catch (e) {
        return;
      }
      runtime.receive(contents.protocol, contents.command, contents.payload, {
        connection: connection
      });
    }
  };

  wsServer.on('request', function (request) {
    var connection = request.accept('noflo', request.origin);
    runtime.connections.push(connection);
    connection.on('message', function (message) {
      handleMessage(message, connection);
    });
    connection.on('close', function () {
      if (runtime.connections.indexOf(connection) === -1) {
        return;
      }
      runtime.connections.splice(runtime.connections.indexOf(connection), 1);
    });
  });

  return runtime;
};
