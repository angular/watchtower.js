var sharedConfig = require('./karma-shared.conf.js');

module.exports = function(config) {
  sharedConfig(config);

  config.set({
    files: [
      'test/test.js',

      { pattern: 'src/**/*.js', included: false },
      { pattern: 'test/**/matchers.js', included: false },
      { pattern: 'test/**/*spec.js', included: false },
      { pattern: 'node_modules/es6-shim/es6-shim.js', included: false }
    ],

    reporters: ['dots', 'coverage'],

    preprocessors: {
      'src/**/*.js': ['traceur', 'coverage'],
      'test/**/*.spec.js': ['traceur'],
      'test/matchers.js': ['traceur']
    },

    coverageReporter: {
      reporters: [
        { type: 'text' },
        { type: 'lcovonly' }
      ]
    }
  });

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
