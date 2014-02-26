var sharedConfig = require('./karma-shared.conf.js');

module.exports = function(config) {
  sharedConfig(config);

  config.set({
    files: [
      'src/**/*.js',
      'test/**/*.js'
    ],

    preprocessors: {
      'src/**/*.js': ['traceur'],
      'test/**/*.js': ['traceur']
    }
  });  
}
