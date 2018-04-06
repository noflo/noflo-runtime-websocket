NoFlo WebSocket Runtime [![Build Status](https://travis-ci.org/noflo/noflo-runtime-websocket.svg?branch=master)](https://travis-ci.org/noflo/noflo-runtime-websocket) [![Coverage Status](https://coveralls.io/repos/github/noflo/noflo-runtime-websocket/badge.svg?branch=master)](https://coveralls.io/github/noflo/noflo-runtime-websocket?branch=master)
====

WebSocket implementation of [FBP protocol](https://flowbased.github.io/fbp-protocol/) for NoFlo. Meant to be used as a library for actual runners like [noflo-nodejs](https://github.com/noflo/noflo-nodejs)

## Changes

* 0.10.1 (April 6th 2018)
  - Fixed issue on sending without context
* 0.10.0 (March 22 2018)
  - Updated to FBP Protocol version 0.7 compatibility
* 0.9.2 (November 13 2017)
  - Fixed serialization of primitive values in payloads
* 0.9.1 (November 13 2017)
  - Improved payload normalization for errors and other non-serializable objects
  - Fixed regression with sending captured STDOUT messages
  - Exposed the `noflo-websocket-runtime` command to NPM bin
* 0.9.0 (November 6 2017)
  - NoFlo 1.x compatibility
  - Ported to ES6 class syntax
