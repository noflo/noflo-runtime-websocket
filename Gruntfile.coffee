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
      fbp_test:
        command: './node_modules/.bin/fbp-test --colors'

  # Grunt plugins used for testing
  @loadNpmTasks 'grunt-contrib-watch'
  @loadNpmTasks 'grunt-shell-spawn'

  @registerTask 'test', ['shell:fbp_test']
  @registerTask 'default', ['test']
