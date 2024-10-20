const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const inputPath = './creos/mori/1.mp4';  // Путь к основному видео
const trimmedOverlay1 = './creos/money/1.mp4';  // Путь к наложенному видео
const audioPath = './creos/audio/0.mp3';  // Путь к аудиофайлу


const outputPath = './temp/final_output.mp4';  // Путь к конечному видео с наложенным видео
const outputPathNoAudio = './temp/final_output_no_audio.mp4';  // Путь к видео без звука
const finalVideoWithAudio = 'output.mp4';  // Путь к конечному видео с аудио
const targetResolution = '1080x1920';  // Целевое разрешение

// Обрезаем наложенное видео до 10 секунд и приводим к целевому разрешению
const trimOverlayVideo = (overlayPath, outputTrimmed) => {
  return new Promise((resolve, reject) => {
    ffmpeg(overlayPath)
      .setStartTime(0)  // Начало с 0 секунды
      .duration(10)     // Длительность обрезки 10 секунд
      .videoFilter(`scale=${targetResolution}`) // Устанавливаем целевое разрешение
      .output(outputTrimmed)
      .on('end', () => {
        console.log('Наложенное видео обрезано до 10 секунд и приведено к разрешению ' + targetResolution);
        resolve(outputTrimmed);
      })
      .on('error', (err) => reject(err))
      .run();
  });
};

// Склеиваем обрезанное и полное наложенное видео с приведением к одному разрешению
const concatVideos = (trimmedVideo, fullVideo, output) => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(trimmedVideo)
      .input(fullVideo)
      .complexFilter([
        `[0:v]scale=${targetResolution}[v0]; [1:v]scale=${targetResolution}[v1]; [v0][v1] concat=n=2:v=1:a=0 [v]`
      ])
      .outputOptions('-map', '[v]')
      .outputOptions('-c:v', 'libx264')
      .outputOptions('-pix_fmt', 'yuv420p')
      .output(output)
      .on('end', () => {
        console.log('Видео успешно склеено и приведено к разрешению ' + targetResolution);
        resolve(output);
      })
      .on('error', (err) => reject(err))
      .run();
  });
};

// Накладываем видео на основной файл в заданный интервал, приводя к одному разрешению
const overlayVideoOnSegment = (background, overlay, start, duration, output) => {
  return new Promise((resolve, reject) => {
    ffmpeg(background)
      .input(overlay)
      .complexFilter([
        // Приводим фоновое видео к целевому разрешению
        `[0:v]scale=${targetResolution}[bg];` +
        // Обрезаем наложенное видео до нужной продолжительности и приводим к разрешению
        `[1:v] trim=start=0:end=${duration},setpts=PTS-STARTPTS,scale=${targetResolution} [ovl];` + 
        `[bg][ovl] overlay=enable='between(t,${start},${start + duration})'`  // Наложение на интервал
      ])
      .outputOptions('-c:v libx264')
      .outputOptions('-pix_fmt yuv420p')
      .on('start', (commandLine) => {
        console.log('FFmpeg command for overlay: ' + commandLine);
      })
      .on('progress', (progress) => {
        console.log('Overlay progress: ' + progress.percent + '% done');
      })
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output); // Сохранение результата
  });
};

// Убираем аудио из видео
const removeAudioFromVideo = (inputVideo, outputVideo) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputVideo)
      .outputOptions('-an')  // Убираем аудио
      .output(outputVideo)
      .on('end', () => {
        console.log('Аудио успешно убрано из видео.');
        resolve(outputVideo);
      })
      .on('error', (err) => reject(err))
      .run();
  });
};

// Добавляем аудио к финальному видео
const addAudioToVideo = (videoPath, audioPath, output) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(audioPath)  // Входной аудиофайл
      .outputOptions('-c:v', 'copy')  // Сохраняем видео как есть
      .outputOptions('-c:a', 'aac')  // Кодируем аудио в AAC
      .outputOptions('-strict', 'experimental')  // Флаг для использования experimental AAC
      .outputOptions('-shortest')  // Делаем выходное видео длиной в короткую часть (видео или аудио)
      .output(output)
      .on('end', () => {
        console.log('Аудио успешно наложено на видео.');
        resolve(output);
      })
      .on('error', (err) => reject(err))
      .run();
  });
};

// Асинхронная функция для выполнения процесса
const processVideos = async () => {
  try {
    // Обрезаем наложенное видео до 10 секунд
    const trimmedOverlay = './temp/trimmed_overlay.mp4';
    await trimOverlayVideo(trimmedOverlay1, trimmedOverlay);

    // Склеиваем обрезанное и полное наложенное видео
    const concatenatedOverlay = './temp/concatenated_overlay.mp4';
    await concatVideos(trimmedOverlay, trimmedOverlay1, concatenatedOverlay);

    // Накладываем склеенное наложенное видео на основное
    await overlayVideoOnSegment(inputPath, concatenatedOverlay, 10, 20, outputPath);

    // Убираем аудио из итогового видео
    await removeAudioFromVideo(outputPath, outputPathNoAudio);

    // Добавляем новое аудио к итоговому видео без звука
    await addAudioToVideo(outputPathNoAudio, audioPath, finalVideoWithAudio);

    console.log('Процесс завершен, итоговое видео с аудио: ' + finalVideoWithAudio);
  } catch (error) {
    console.error('Ошибка при обработке видео:', error);
  }
};

// Запуск процесса
processVideos();
