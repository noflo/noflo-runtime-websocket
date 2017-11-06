const { server: WebSocketServer } = require('websocket');
const Base = require('noflo-runtime-base');

class WebSocketRuntime extends Base {
  constructor(options = {}) {
    super(options);
    this.connections = [];
    if (options.catchExceptions) {
      process.on('uncaughtException', function (err) {
        this.connections.forEach(function (connection) {
          this.send('network', 'error', err, {
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
  }

  send(protocol, topic, payload, context) {
    if (!context.connection || !context.connection.connected) {
      return;
    }
    if (payload instanceof Error) {
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
    super.send(protocol, topic, payload, context);
  }

  sendAll(protocol, topic, payload, context) {
    this.connections.forEach((connection) => {
      this.send(protocol, topic, payload, {
        connection: connection
      });
    });
  }

  startCapture() {
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
  }

  stopCapture() {
    if (!this.originalStdOut) {
      return;
    }
    process.stdout.write = this.originalStdOut;
  }
}

module.exports = function (httpServer, options) {
  const wsServer = new WebSocketServer({
    httpServer: httpServer
  });

  const runtime = new WebSocketRuntime(options);
  const handleMessage = function (message, connection) {
    if (message.type == 'utf8') {
      let contents;
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
    const subProtocol = (request.requestedProtocols.indexOf("noflo") != -1) ? "noflo" : null;
    const connection = request.accept(subProtocol, request.origin);
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
