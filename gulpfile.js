import pkg from 'gulp';
const { src, dest, parallel, series, watch } = pkg;

import autoprefixer from 'gulp-autoprefixer';
import browserSync from 'browser-sync';
import cleancss from 'gulp-clean-css';
import { deleteAsync } from 'del';
import imagemin from 'gulp-imagemin';
import htmlmin from 'gulp-htmlmin';
import rename from 'gulp-rename';
import replace from 'gulp-replace';
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
const sass = gulpSass(dartSass);
import sourcemaps from 'gulp-sourcemaps';
import svgSprite from 'gulp-svg-sprite';
import svgmin from 'gulp-svgmin';
import webpack from 'webpack-stream';
import terser from 'gulp-terser';

// HTML

export const html = () => {
  return src('./src/*.html')
    .pipe(
      htmlmin({
        removeComments: true,
        collapseWhitespace: true,
      })
    )
    .pipe(dest('build'))
    .pipe(browserSync.stream());
};

// Style

export const styles = () => {
  return src('./src/scss/main.scss')
    .pipe(sourcemaps.init())
    .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
    .pipe(
      rename({
        suffix: '.min',
      })
    )
    .pipe(autoprefixer())
    .pipe(
      cleancss({
        level: 2,
      })
    )
    .pipe(sourcemaps.write('.'))
    .pipe(dest('build/css'))
    .pipe(browserSync.stream());
};

// Scripts

export const scripts = () => {
  return src('./src/js/main.js')
    .pipe(
      webpack({
        mode: 'development',
        output: {
          filename: 'main.js',
        },
        module: {
          rules: [
            {
              test: /\.m?js$/,
              exclude: /(node_modules|bower_components)/,
              use: {
                loader: 'babel-loader',
                options: {
                  presets: ['@babel/preset-env'],
                },
              },
            },
          ],
        },
      })
    )
    .on('error', function (err) {
      console.error('WEBPACK ERROR', err);
      this.emit('end'); // Don't stop the rest of the task
    })

    .pipe(sourcemaps.init())
    .pipe(
      rename({
        suffix: '.min',
      })
    )
    .pipe(terser())
    .pipe(sourcemaps.write('.'))
    .pipe(dest('build/js'))
    .pipe(browserSync.stream());
};

// Image

export const images = () => {
  return src('./src/img/**/*.{jpg,jpeg,png,svg,webp}')
    .pipe(
      imagemin({
        progressive: true,
        svgoPlugins: [{ removeViewBox: false }],
        interlaced: true,
        optimizationLevel: 3, // 0 to 7
      })
    )
    .pipe(dest('build/img'));
};

// SVG

export const svg = () => {
  return (
    src('./src/img/**/*.svg')
      .pipe(
        svgmin({
          multipass: true,
          js2svg: {
            pretty: true,
          },
          plugins: [
            {
              name: 'removeAttrs',
              params: {
                attrs: '(fill|stroke)',
              },
            },
            'removeComments',
            'removeStyleElement',
            'removeMetadata',
            'removeAttributesBySelector',
            'removeElementsByAttr',
          ],
        })
      )
      .pipe(replace('&gt;', '>'))
      // build svg sprite
      .pipe(
        svgSprite({
          mode: {
            symbol: {
              sprite: 'sprite.svg',
            },
          },
        })
      )
      .pipe(dest('build/img'))
  );
};

// Fonts

export const fonts = () => {
  return src('./src/fonts/**/*').pipe(dest('build/fonts'));
};

// Clean

export async function clean() {
  await deleteAsync(['build/*']);
}

export const watchFiles = () => {
  browserSync.init({
    server: {
      baseDir: 'build/',
    },
  });

  watch('./src/scss/**/*', styles);
  watch('./src/js/**/*.js', scripts);
  watch('./src/*.html', html);
  watch('./src/img/**/*.{jpg,jpeg,png,svg,webp}', images);
  watch('./src/img/**/*.svg', svg);
  watch('./src/fonts/**/*', fonts);
};

export default series(
  clean,
  parallel(html, scripts, fonts, images, svg),
  styles,
  watchFiles
);
