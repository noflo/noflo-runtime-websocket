chai = require 'chai'
runtime = require '../runtime/network.js'
http = require 'http'
path = require 'path'
WebSocketClient = require('websocket').client

describe 'WebSocket network runtime', ->
  server = null
  client = null
  connection = null
  send = null
  rt = null
  before (done) ->
    server = http.createServer ->
    rt = runtime server,
      baseDir: path.resolve __dirname, '../'
    server.listen 8080, ->
      client = new WebSocketClient
      client.on 'connect', (conn) ->
        connection = conn
        done()
      client.connect 'ws://localhost:8080/', 'noflo'
  after ->
    server.close()

  send = (protocol, command, payload) ->
    connection.sendUTF JSON.stringify
      protocol: protocol
      command: command
      payload: payload

  receive = (expects, done) ->
    listener = (message) ->
      chai.expect(message.utf8Data).to.be.a 'string'
      msg = JSON.parse message.utf8Data
      expected = expects.shift()
      chai.expect(msg).to.eql expected
      if expects.length
        connection.once 'message', listener
      else
        done()
    connection.once 'message', listener

  describe 'Runtime Protocol', ->
    describe 'requesting runtime metadata', ->
      it 'should provide it back', (done) ->
        connection.once 'message', (message) ->
          msg = JSON.parse message.utf8Data
          chai.expect(msg.protocol).to.equal 'runtime'
          chai.expect(msg.command).to.equal 'runtime'
          chai.expect(msg.payload).to.be.an 'object'
          chai.expect(msg.payload.type).to.equal 'noflo-nodejs'
          chai.expect(msg.payload.capabilities).to.be.an 'array'
          done()
        send 'runtime', 'getruntime', ''

  describe 'Graph Protocol', ->
    describe 'receiving a graph and nodes', ->
      it 'should provide the nodes back', (done) ->
        expects = [
            protocol: 'graph'
            command: 'addnode'
            payload:
              id: 'Foo'
              component: 'core/Repeat'
              metadata:
                hello: 'World'
              graph: 'foo'
          ,
            protocol: 'graph'
            command: 'addnode'
            payload:
              id: 'Bar'
              component: 'core/Drop'
              metadata: {}
              graph: 'foo'
        ]
        receive expects, done
        send 'graph', 'clear',
          baseDir: path.resolve __dirname, '../'
          id: 'foo'
          main: true
        send 'graph', 'addnode', expects[0].payload
        send 'graph', 'addnode', expects[1].payload
    describe 'receiving an edge', ->
      it 'should provide the edge back', (done) ->
        expects = [
          protocol: 'graph'
          command: 'addedge'
          payload:
            src:
              node: 'Foo'
              port: 'out'
            tgt:
              node: 'Bar'
              port: 'in'
            metadata:
              route: 5
            graph: 'foo'
        ]
        receive expects, done
        send 'graph', 'addedge', expects[0].payload
    describe 'receiving an IIP', ->
      it 'should provide the IIP back', (done) ->
        expects = [
          protocol: 'graph'
          command: 'addinitial'
          payload:
            src:
              data: 'Hello, world!'
            tgt:
              node: 'Foo'
              port: 'in'
            metadata: {}
            graph: 'foo'
        ]
        receive expects, done
        send 'graph', 'addinitial', expects[0].payload
    describe 'removing a node', ->
      it 'should remove the node and its associated edges', (done) ->
        expects = [
          protocol: 'graph'
          command: 'removeedge'
          payload:
            src:
              node: 'Foo'
              port: 'out'
            tgt:
              node: 'Bar'
              port: 'in'
            metadata:
              route: 5
            graph: 'foo'
        ,
          protocol: 'graph'
          command: 'removenode'
          payload:
            id: 'Bar'
            component: 'core/Drop'
            metadata: {}
            graph: 'foo'
        ]
        receive expects, done
        send 'graph', 'removenode',
          id: 'Bar'
          graph: 'foo'
    describe 'removing an IIP', ->
      it 'should provide the IIP back', (done) ->
        expects = [
          protocol: 'graph'
          command: 'removeinitial'
          payload:
            src:
              data: 'Hello, world!'
            tgt:
              node: 'Foo'
              port: 'in'
            metadata: {}
            graph: 'foo'
        ]
        receive expects, done
        send 'graph', 'removeinitial',
          tgt:
            node: 'Foo'
            port: 'in'
          graph: 'foo'
    describe 'renaming a node', ->
      it 'should send the renamenode event', (done) ->
        expects = [
          protocol: 'graph'
          command: 'renamenode'
          payload:
            from: 'Foo'
            to: 'Baz'
            graph: 'foo'
        ]
        receive expects, done
        send 'graph', 'renamenode',
          from: 'Foo'
          to: 'Baz'
          graph: 'foo'

  describe 'Network protocol', ->
    # Set up a clean graph
    beforeEach (done) ->
      waitFor = 4
      listener = (message) ->
        waitFor--
        if waitFor
          connection.once 'message', listener
        else
          done()
      connection.once 'message', listener
      send 'graph', 'clear',
        baseDir: path.resolve __dirname, '../'
        id: 'bar'
        main: true
      send 'graph', 'addnode',
        id: 'Hello'
        component: 'core/Repeat'
        metadata: {}
        graph: 'bar'
      send 'graph', 'addnode',
        id: 'World'
        component: 'core/Drop'
        metadata: {}
        graph: 'bar'
      send 'graph', 'addedge',
        src:
          node: 'Hello'
          port: 'out'
        tgt:
          node: 'World'
          port: 'in'
        graph: 'bar'
      send 'graph', 'addinitial',
        src:
          data: 'Hello, world!'
        tgt:
          node: 'Hello'
          port: 'in'
        graph: 'bar'
    describe 'on starting the network', ->
      it 'should get started', (done) ->
        listener = (message) ->
          chai.expect(message.utf8Data).to.be.a 'string'
          msg = JSON.parse message.utf8Data
          chai.expect(msg.protocol).to.equal 'network'
          unless msg.command is 'started'
            connection.once 'message', listener
          else
            chai.expect(msg.payload).to.be.an 'object'
            chai.expect(msg.payload.graph).to.equal 'bar'
            chai.expect(msg.payload.time).to.be.a 'string'
            done()
        connection.once 'message', listener
        send 'network', 'start',
          graph: 'bar'

    describe 'on console output', ->
      it 'should be able to capture and transmit it', (done) ->
        listener = (message) ->
          rt.stopCapture()
          chai.expect(message.utf8Data).to.be.a 'string'
          msg = JSON.parse message.utf8Data
          chai.expect(msg.protocol).to.equal 'network'
          chai.expect(msg.command).to.equal 'output'
          chai.expect(msg.payload).to.be.an 'object'
          chai.expect(msg.payload.message).to.equal 'Hello, World!'
          done()
        connection.once 'message', listener
        rt.startCapture()
        console.log 'Hello, World!'

  describe 'Component protocol', ->
    describe 'on requesting a component list', ->
      it 'should receive some known components', (done) ->
        listener = (message) ->
          chai.expect(message.utf8Data).to.be.a 'string'
          msg = JSON.parse message.utf8Data
          chai.expect(msg.protocol).to.equal 'component'
          chai.expect(msg.payload).to.be.an 'object'
          unless msg.payload.name is 'core/Output'
            connection.once 'message', listener
          else
            expectedInPorts = [
              id: 'in'
              type: 'all'
              required: true
              addressable: true
              description: ''
            ,
              id: 'options'
              type: 'object'
              required: true
              addressable: false
              description: ''
            ]
            chai.expect(msg.payload.inPorts).to.eql expectedInPorts
            chai.expect(msg.payload.outPorts).to.eql [
              id: 'out'
              type: 'all'
              required: true
              addressable: false
              description: ''
            ]
            done()
        connection.once 'message', listener
        send 'component', 'list', process.cwd()
