var gulp = require('gulp'),
//local web server
    webserver = require('gulp-webserver'),
    header = require('gulp-header');

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