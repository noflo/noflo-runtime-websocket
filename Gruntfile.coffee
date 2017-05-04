path = require 'path'
{spawn} = require 'child_process'
module.exports = ->
  runtimeSecret  = process.env.FBP_PROTOCOL_SECRET or 'noflo'
  # Project configuration
  @initConfig
    pkg: @file.readJSON 'package.json'

    # Automated recompilation and testing when developing
    watch:
      files: ['runtime/*.js']
      tasks: ['test']

    # FBP Network Protocol tests
    exec:
      fbp_test:
        command: "node #{path.resolve(__dirname, 'node_modules/fbp-protocol/bin/fbp-test')} --colors"
        options:
          env:
            FBP_PROTOCOL_SECRET: runtimeSecret
            PATH: process.env.PATH

  # Grunt plugins used for testing
  @loadNpmTasks 'grunt-contrib-watch'
  @loadNpmTasks 'grunt-exec'

  @registerTask 'test', [
    'startRuntime'
    'exec:fbp_test'
    'stopRuntime'
  ]
  @registerTask 'default', ['test']
  runtime = null
  @registerTask 'startRuntime', ->
    done = @async()
    runtime = spawn 'node', [
      'bin/noflo-websocket-runtime'
      "--secret=#{runtimeSecret}"
    ]
    setTimeout ->
      done()
    , 4000
  @registerTask 'stopRuntime', ->
    return unless runtime
    done = @async()
    runtime.on 'close', ->
      runtime = null
      done()
    runtime.kill()
