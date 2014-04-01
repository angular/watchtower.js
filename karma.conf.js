var sharedConfig = require('pipe/karma');

module.exports = function(config) {
  sharedConfig(config);

  config.set({
    files: [
      'test/test.js',

      { pattern: 'src/**/*.js', included: false },
      { pattern: 'test/**/matchers.js', included: false },
      { pattern: 'test/**/helpers.js', included: false },
      { pattern: 'test/**/*spec.js', included: false },
      { pattern: 'node_modules/es6-shim/es6-shim.js', included: false },
      { pattern: 'node_modules/rtts-assert/src/**/*.js', included: false }
    ],

    reporters: ['dots', 'coverage'],

    preprocessors: {
      'src/**/*.js': ['traceur', 'coverage'],
      'test/**/*.spec.js': ['traceur'],
      'test/matchers.js': ['traceur'],
      'test/helpers.js': ['traceur'],
      'node_modules/rtts-assert/src/**/*.js': ['traceur']
    },

    coverageReporter: {
      reporters: [
        { type: 'text' },
        { type: 'lcovonly' }
      ]
    }
  });

  config.sauceLabs.testName = 'AngularJS v2 - watchtower';

  function arrayRemove(array, item) {
    var index = array.indexOf(item);
    if (index >= 0) {
      array.splice(index, 1);
    }
  }
  if (process.argv.indexOf('--debug') >= 0) {
    arrayRemove(config.reporters, 'coverage');
    for (var key in config.preprocessors) {
      arrayRemove(config.preprocessors[key], 'coverage');
    }
  }
}
