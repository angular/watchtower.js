// Shared Karma configuration. (https://github.com/angular/pipe)

module.exports = function(config) {
  config.set({
    frameworks: ['jasmine', 'traceur', 'requirejs'],

    traceurPreprocessor: {
      options: {
        modules: 'amd',
        types: true,
        annotations: true,
        sourceMap: true
      }
    },


    sauceLabs: {
      testName: 'AngularJS v2 - default',
      startConnect: true,
      options: {
        'selenium-version': '2.37.0'
      }
    },


    customLaunchers: {
      'Chrome_harmony': {
        base: 'Chrome',
        flags: ['--js-flags=--harmony']
      },

      // Sauce Labs browsers
      'SL_Chrome': {
        base: 'SauceLabs',
        browserName: 'chrome'
      },
      'SL_Firefox': {
        base: 'SauceLabs',
        browserName: 'firefox',
        version: '26'
      },
      'SL_Safari': {
        base: 'SauceLabs',
        browserName: 'safari',
        platform: 'OS X 10.9',
        version: '7'
      }
    },


    browsers: ['Chrome'],


    plugins: [
      'karma-*'
      // require('karma-sauce-launcher')
    ]
  });

  if (process.env.TRAVIS) {
    config.logLevel = config.LOG_DEBUG;
    config.sauceLabs.build = 'TRAVIS #' + process.env.TRAVIS_BUILD_NUMBER + ' (' + process.env.TRAVIS_BUILD_ID + ')';
    config.sauceLabs.tunnelIdentifier = process.env.TRAVIS_JOB_NUMBER;

    process.env.SAUCE_ACCESS_KEY = process.env.SAUCE_ACCESS_KEY.split('').reverse().join('');

    // TODO(vojta): remove once SauceLabs supports websockets.
    // This speeds up the capturing a bit, as browsers don't even try to use websocket.
    config.transports = ['xhr-polling'];
  }
};