const { spawn, exec } = require('child_process');
const path = require('path');
const fbpHealthCheck = require('fbp-protocol-healthcheck');

function healthCheck(callback) {
  fbpHealthCheck('ws://localhost:8080')
    .then(() => callback(), () => healthCheck(callback));
}

describe('FBP Protocol Compatibility', () => {
  const prog = path.resolve(__dirname, '../bin/noflo-websocket-runtime');
  const tester = path.resolve(__dirname, '../node_modules/.bin/fbp-test --colors');
  const runtimeSecret = process.env.FBP_PROTOCOL_SECRET || 'noflo-runtime-websocket';
  let progProcess;
  before('start runtime', (done) => {
    progProcess = spawn(prog, [
      `--secret=${runtimeSecret}`,
    ]);
    progProcess.stdout.pipe(process.stdout);
    progProcess.stderr.pipe(process.stderr);
    healthCheck(done);
  });
  after('stop runtime', (done) => {
    if (!progProcess) {
      done();
      return;
    }
    process.kill(progProcess.pid);
    done();
  });
  it('should pass the test suite', (done) => {
    exec(tester, {
      env: {
        ...process.env,
        FBP_PROTOCOL_SECRET: runtimeSecret,
      },
    }, (err, stdout, stderr) => {
      console.log(stdout);
      console.error(stderr);
      done(err);
    });
  }).timeout(60000);
});
