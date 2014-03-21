var gulp = require('gulp'),
    karma = require('./lib/gulp/karma'),
    traceur = require('gulp-traceur'),
    jshint = require('gulp-jshint'),
    path = require('path');

gulp.task('lint', function() {
  gulp.src('src/*.js')
  .pipe(jshint())
  .pipe(jshint.reporter('jshint-stylish'))
  .pipe(jshint.reporter('fail'));
});

gulp.task('build:amd', function() {
  gulp.src('src/*.js')
  .pipe(traceur({
    modules: 'amd',
    types: true,
    annotations: true,
    sourceMap: true
  }))
  .pipe(gulp.dest(path.resolve(__dirname,'dist/amd')));
});

gulp.task('build:cjs', function() {
  gulp.src('src/*.js')
  .pipe(traceur({
    modules: 'commonjs',
    types: true,
    annotations: true,
    sourceMap: true
  }))
  .pipe(gulp.dest(path.resolve(__dirname,'dist/cjs')));
});

gulp.task('build', ['lint', 'build:amd', 'build:cjs'], function() {

});

gulp.task('test', function(done) {
  var options = {
    configFile: 'karma.conf.js'
  };
  for (var i=0, ii = process.argv.length; i<ii; ++i) {
    var val = process.argv[i];
    if (val === '--debug') options.debugRun = true;
    if (val === '--watch') options.autoWatch = true;
    else if (val === '--single-run') options.singleRun = true;
    else if (val === '--browsers') options.browsers = process.argv[++i].split(',');
  }
  karma(options, done);
});
