var gulp = require('gulp'),
    karma = require('./lib/gulp/karma');

gulp.task('test', function(done) {
  var options = {
    configFile: 'karma.conf.js'
  };
  for (var i=0, ii = process.argv.length; i<ii; ++i) {
    var val = process.argv[i];
    if (val === '--watch') options.watch = true;
    else if (val === '--single-run') options.singleRun = true;
    else if (val === '--browsers') options.browsers = process.argv[++i].split(',');
  }
  karma(options, done);
});
