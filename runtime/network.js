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
        if (err.stack) {
          console.error(err.stack);
        } else {
          console.error('Error: ' + err.toString());
        }
      }.bind(this));
    }.bind(this));
  }

  if (options.captureOutput) {
    this.startCapture();
  }
  this.prototype.constructor.apply(this, arguments);
  this.receive = this.prototype.receive;
  this.canDo = this.prototype.canDo;
  this.getPermitted = this.prototype.getPermitted;
}
WebSocketRuntime.prototype = Base;
WebSocketRuntime.prototype.send = function (protocol, topic, payload, context) {
  if (!context.connection || !context.connection.connected) {
    return;
  }
  if (topic === 'error' && payload instanceof Error) {
    payload = {
      message: payload.message,
      stack: payload.stack
    };
  }
  context.connection.sendUTF(JSON.stringify({
    protocol: protocol,
    command: topic,
    payload: payload
  }));
  this.prototype.send.apply(this, arguments);
};

WebSocketRuntime.prototype.sendAll = function (protocol, topic, payload, context) {

  this.connections.forEach(function(connection) {
    this.send(protocol, topic, payload, {
      connection: connection
    });
  }.bind(this));
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
      var contents;
      try {
        contents = JSON.parse(message.utf8Data);
      } catch (e) {
        if (e.stack) {
          console.error(e.stack);
        } else {
          console.error('Error: ' + e.toString());
        }
        return;
      }
      runtime.receive(contents.protocol, contents.command, contents.payload, {
        connection: connection
      });
    }
  };

  wsServer.on('request', function (request) {
    var subProtocol = (request.requestedProtocols.indexOf("noflo") != -1) ? "noflo" : null;
    var connection = request.accept(subProtocol, request.origin);
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
