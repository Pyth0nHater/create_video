const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Проверка совместимости видеофайлов
function checkVideoCompatibility(filePaths, callback) {
   const commands = filePaths.map(filePath => {
      return new Promise((resolve, reject) => {
         ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
               reject(err);
            } else {
               resolve(metadata);
            }
         });
      });
   });

   Promise.all(commands)
      .then(results => {
         // Извлекаем параметры из метаданных
         const videoParams = results.map(metadata => ({
            width: metadata.streams[0].width,
            height: metadata.streams[0].height,
            codec: metadata.streams[0].codec_name,
            fps: metadata.streams[0].r_frame_rate
         }));

         // Проверяем, совпадают ли параметры у всех файлов
         const firstParams = videoParams[0];

         const areCompatible = videoParams.every(params => {
            return params.width === firstParams.width &&
                   params.height === firstParams.height &&
                   params.codec === firstParams.codec &&
                   params.fps === firstParams.fps;
         });

         if (!areCompatible) {
            callback(new Error('Video files have incompatible parameters'), null);
         } else {
            callback(null, results);
         }
      })
      .catch(err => callback(err, null));
}

function concatVideoFiles(filePaths, outputFilePath, cb) {
   if (filePaths.length === 0) {
      cb(new Error('No video files provided'), null);
      return;
   }

   checkVideoCompatibility(filePaths, (err, metadata) => {
      if (err) {
         cb(err, null);
         return;
      }

      // Если видеофайлы совместимы, продолжаем объединение
      const ffmpegCommand = ffmpeg();

      filePaths.forEach(filePath => {
         ffmpegCommand.input(filePath);
      });

      ffmpegCommand
         .outputOptions('-c:v libx264') // Кодек для видео
         .outputOptions('-c:a aac') // Кодек для аудио
         .outputOptions('-t 20') // Установите длительность выходного файла в 20 секунд
         .on('error', (err) => {
            cb(err, null);
         })
         .on('end', () => {
            cb(null, outputFilePath);
         })
         .mergeToFile(outputFilePath, path.join(__dirname, 'temp'));
   });
}

// Пример использования
const videoFiles = ['1.mp4', '2.mp4']; // Путь к вашим видеофайлам
const outputFile = path.join(__dirname, 'output.mp4'); // Путь к выходному файлу

concatVideoFiles(videoFiles, outputFile, (err, result) => {
   if (err) {
      console.error('Error concatenating videos:', err);
   } else {
      console.log('Videos concatenated successfully:', result);
   }
});
