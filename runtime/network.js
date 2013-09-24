var WebSocketServer = require('websocket').server;
var Base = require('noflo-runtime-base');

function WebSocketRuntime () {
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

module.exports = function (httpServer) {
  var wsServer = new WebSocketServer({
    httpServer: httpServer
  });

  var runtime = new WebSocketRuntime();
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
    connection.on('message', function (message) {
      handleMessage(message, connection);
    });
  });
};
