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

    reporters: ['dots'],

    preprocessors: {
      'src/**/*.js': ['traceur'],
      'test/**/*.spec.js': ['traceur']
    }
  });  
}
