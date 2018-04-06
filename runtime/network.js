const { server: WebSocketServer } = require('websocket');
const Base = require('noflo-runtime-base');

function normalizePayload(payload) {
  if (typeof payload !== 'object' && typeof payload !== 'function') {
    return payload;
  }
  if (payload instanceof Error) {
    return {
      message: payload.message,
      stack: payload.stack,
    };
  }
  if (Buffer.isBuffer(payload)) {
    return payload.slice(0, 20);
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload.toJSON) {
    return payload.toJSON();
  }
  if (payload.toString) {
    const stringified = payload.toString();
    if (stringified === '[object Object]') {
      try {
        return JSON.parse(JSON.stringify(payload));
      } catch (e) {
        return stringified;
      }
    }
    return stringified;
  }
  return payload;
}

class WebSocketRuntime extends Base {
  constructor(options = {}) {
    super(options);
    this.connections = [];
    if (options.catchExceptions) {
      process.on('uncaughtException', (err) => {
        this.connections.forEach((connection) => {
          this.send('network', 'error', err, {
            connection,
          });
          if (err.stack) {
            console.error(err.stack);
          } else {
            console.error(`Error: ${err.toString()}`);
          }
        });
      });
    }

    if (options.captureOutput) {
      this.startCapture();
    }
  }


  send(protocol, topic, payload, context) {
    if (!context || !context.connection || !context.connection.connected) {
      return;
    }
    let normalizedPayload = payload;
    if (payload instanceof Error) {
      normalizedPayload = normalizePayload(payload);
    }
    if (protocol === 'runtime' && topic === 'packet') {
      // With exported port packets we need to go one deeper
      normalizedPayload.payload = normalizePayload(normalizedPayload.payload);
    }
    context.connection.sendUTF(JSON.stringify({
      protocol,
      command: topic,
      payload: normalizedPayload,
    }));
    super.send(protocol, topic, payload, context);
  }

  sendAll(protocol, topic, payload) {
    this.connections.forEach((connection) => {
      this.send(protocol, topic, payload, {
        connection,
      });
    });
  }

  startCapture() {
    this.originalStdOut = process.stdout.write;
    process.stdout.write = (string) => {
      this.connections.forEach((connection) => {
        this.send('network', 'output', {
          message: string.replace(/\n$/, ''),
          type: 'message',
        }, {
          connection,
        });
      });
    };
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
    httpServer,
  });

  const runtime = new WebSocketRuntime(options);
  const handleMessage = function (message, connection) {
    if (message.type === 'utf8') {
      let contents;
      try {
        contents = JSON.parse(message.utf8Data);
      } catch (e) {
        if (e.stack) {
          console.error(e.stack);
        } else {
          console.error(`Error: ${e.toString()}`);
        }
        return;
      }
      runtime.receive(contents.protocol, contents.command, contents.payload, {
        connection,
      });
    }
  };

  wsServer.on('request', (request) => {
    const subProtocol = (request.requestedProtocols.indexOf('noflo') !== -1) ? 'noflo' : null;
    const connection = request.accept(subProtocol, request.origin);
    runtime.connections.push(connection);
    connection.on('message', (message) => {
      handleMessage(message, connection);
    });
    connection.on('close', () => {
      if (runtime.connections.indexOf(connection) === -1) {
        return;
      }
      runtime.connections.splice(runtime.connections.indexOf(connection), 1);
    });
  });

  return runtime;
};
