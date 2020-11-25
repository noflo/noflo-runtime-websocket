NoFlo WebSocket Runtime
====

WebSocket implementation of [FBP protocol](https://flowbased.github.io/fbp-protocol/) for NoFlo. Meant to be used as a library for actual runners like [noflo-nodejs](https://github.com/noflo/noflo-nodejs)

## Changes

* 0.12.0 (November 25th 2020)
  - Updated to NoFlo 1.3.0 model
* 0.11.0 (September 1st 2020)
  - Updated to NoFlo's new "Network drives graph" model available in NoFlo 1.2.0
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
