var spawn = require('child_process').spawn;

module.exports = exports = function karma(options, done) {
  var args = ['start'], proc;
  if (typeof options === 'function') done = options, options = undefined;
  if (typeof done !== 'function') throw "karma plugin requires callback function";
  if (typeof options === 'string') options = { configFile: options };
  else options = options || {};

  if (typeof options.configFile === 'undefined') options.configFile = 'karma.conf.js';
  if (typeof options.singleRun === 'undefined') options.singleRun = true;

  args.push(options.configFile);

  if (options.singleRun) args.push('--single-run');
  else if (options.watch) args.push('--watch');
  if (typeof options.browsers === 'string') options.browsers = [options.browsers];
  if (options.browsers instanceof Array) {
    args.push('--browsers');
    args.push(options.browsers.join(','));
  }

  console.log(args);
  proc = spawn('./node_modules/karma/bin/karma', args, {
    cwd: options.cwd,
    env: options.env || process.env,
    stdio: 'inherit'
  });

  proc.on('close', done);
  proc.on('exit', done);
};
