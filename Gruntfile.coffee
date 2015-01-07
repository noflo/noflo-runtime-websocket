module.exports = ->
  # Project configuration
  @initConfig
    pkg: @file.readJSON 'package.json'

    # Automated recompilation and testing when developing
    watch:
      files: ['runtime/*.js']
      tasks: ['test']

    # FBP Network Protocol tests
    shell:
      runtime:
        command: 'node bin/noflo-websocket-runtime'
        options:
          async: true
      fbp_test:
        command: 'fbp-test --colors'

  # Grunt plugins used for testing
  @loadNpmTasks 'grunt-contrib-watch'
  @loadNpmTasks 'grunt-shell-spawn'

  @registerTask 'test', ['shell:runtime', 'shell:fbp_test', 'shell:runtime:kill']
  @registerTask 'default', ['test']
