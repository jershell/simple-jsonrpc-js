var gulp = require('gulp'),
//local web server
    webserver = require('gulp-webserver'),
    header = require('gulp-header');
//compress
var uglify = require('gulp-uglify'),
    rename = require("gulp-rename");

gulp.task('compress', function () {
    gulp.src('simple-jsonrpc-js.js')
        .pipe(uglify())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('webserver', function () {
    gulp.src('./')
        .pipe(webserver({
            livereload: false,
            port: 8833,
            proxies: [{
                source: '/rpc',
                target: 'http://localhost:8888',
            }],
            directoryListing: false
        }));
});