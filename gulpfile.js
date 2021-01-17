const { src, dest, parallel, series, watch } = require('gulp')

const autoprefixer = require('gulp-autoprefixer')
const browserSync  = require('browser-sync').create()
const cheerio      = require('gulp-cheerio')
const cleancss     = require('gulp-clean-css')
const del          = require('del')
const imagemin     = require('gulp-imagemin')
const htmlmin      = require('gulp-htmlmin')
const rename       = require('gulp-rename')
const replace      = require('gulp-replace')
const sass         = require('gulp-sass')
const sourcemaps   = require('gulp-sourcemaps')
const svgSprite    = require('gulp-svg-sprite')
const svgmin       = require('gulp-svgmin')
const webpack      = require('webpack-stream')
const uglify       = require('gulp-uglify-es').default;

// HTML

const html = () => {
	return src('./src/*.html')
		.pipe(htmlmin({
				removeComments: true,
				collapseWhitespace: true,
		}))
		.pipe(dest('./build'))
		.pipe(browserSync.stream());
}

// Style

const styles = () => {
	return src ('./src/scss/main.scss')
		.pipe(sourcemaps.init())
		.pipe(sass({
			outputStyle: 'expanded'
		}).on('error', sass.logError))
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(autoprefixer({
			overrideBrowserslist: ['last 10 versions'],
			grid: true
    }))
    .pipe(cleancss({
      level: 2
		}))
		.pipe(sourcemaps.write('.'))
		.pipe(dest('./build/css'))
		.pipe(browserSync.stream());
}

// Scripts

const scripts = () => {
  return src('./src/js/main.js')
    .pipe(webpack(
      {
        mode: 'development',
        output: {
          filename: 'main.js',
        },
        module: {
          rules: [{
            test: /\.m?js$/,
            exclude: /(node_modules|bower_components)/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env']
              }
            }
          }]
        },
      }
    ))
    .on('error', function (err) {
      console.error('WEBPACK ERROR', err);
      this.emit('end'); // Don't stop the rest of the task
    })

		.pipe(sourcemaps.init())
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(uglify())
		.pipe(sourcemaps.write('.'))
    .pipe(dest('./build/js'))
    .pipe(browserSync.stream());
}

// Image

const images = () => {
	return src('./src/img/**/*.{jpg,jpeg,png,svg,webp}')
		.pipe(imagemin([
			imagemin.mozjpeg({quality: 75, progressive: true}),
			imagemin.optipng({optimizationLevel: 3}),
			imagemin.svgo()
		]))
		.pipe(dest('./build/img'));
}

// SVG

const svg = () => {
	return src('./src/img/**/*.svg')
		.pipe(svgmin({
			js2svg: {
				pretty: true
			}
		}))
		.pipe(cheerio({
			run: function ($) {
				$('[fill]').removeAttr('fill');
				$('[stroke]').removeAttr('stroke');
				$('[style]').removeAttr('style');
			},
			parserOptions: {xmlMode: true}
		}))
		.pipe(replace('&gt;', '>'))
		// build svg sprite
		.pipe(svgSprite({
			mode: {
				symbol: {
					sprite: 'sprite.svg'
				}
			}
		}))
		.pipe(dest('./build/img'));
}

// Fonts

const fonts = () => {
	return src('./src/fonts/**/*')
		.pipe(dest('./build/fonts'));
}

// Clean

const clean = () => {
	return del(['build/*']);
}

const watchFiles = () => {
	browserSync.init({
		server: {
				baseDir: "./build"
		}
	});

	watch('./src/scss/main.scss', styles);
	watch('./src/js/**/*.js', scripts);
	watch('./src/*.html', html);
	watch('./src/img/**/*.{jpg,jpeg,png,svg,webp}', images);
	watch('./src/img/**/*.svg', svg);
	watch('./src/fonts/**/*', fonts);
}

exports.styles = styles;
exports.scripts = scripts;
exports.html = html;
exports.images = images;

exports.watchFiles = watchFiles;

exports.default = series(clean, parallel(html, scripts, fonts, images, svg), styles, watchFiles);
