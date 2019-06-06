var gulp = require('gulp'),
    connect = require('gulp-connect'),
    uglify = require('gulp-uglify'),
    rename = require("gulp-rename");

gulp.task('compress', function () {
    return gulp.src('simple-jsonrpc-js.js')
        .pipe(uglify())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('webserver', function () {
    return connect.server({
        name: 'Dev App',
        root: ['test', './'],
        port: 8833,
        livereload: false
    });
});
