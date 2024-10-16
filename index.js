const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const video1Path = path.resolve(__dirname, 'creos/money/0.mp4');
const video2Path = path.resolve(__dirname, 'creos/mori/0.mp4');
const audioPath = path.resolve(__dirname, 'creos/audio/0.mp3');
const outputPath = path.resolve(__dirname, 'output_video.mp4'); // Path for saving the final video

// Trim and resize the video to 10 seconds and change resolution
const trimAndResizeVideo = (input, output, size) => {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .setStartTime(0)    // Начало с 0 секунды
      .setDuration(10)    // Длительность 10 секунд
      .outputOptions('-an') // Убираем аудио, если оно не нужно
      .size(size) // Изменение разрешения видео с использованием метода .size()
      .autopad() 
      .outputOptions('-c:v libx264')  // Приведение видео к кодеку H.264
      .outputOptions('-pix_fmt yuv420p') // Приведение к совместимому пиксельному формату
      .on('start', (commandLine) => {
        console.log('FFmpeg command for trimming and resizing: ' + commandLine);
      })
      .on('progress', (progress) => {
        console.log('Trimming and resizing progress: ' + progress.percent + '% done');
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(output); // Используйте save для указания файла
  });
};

// Merge two videos
const mergeVideos = (video1Path, video2Path, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(video1Path)
      .input(video2Path)
      .complexFilter([
        '[0:v] [1:v] concat=n=2:v=1:a=0 [v]'
      ]) // Apply concatenation filter
      .map('[v]')
      .outputOptions('-c:v libx264') // Use H.264 codec
      .outputOptions('-pix_fmt yuv420p') // Compatible pixel format
      .on('error', function(err) {
        console.log('Error: ' + err.message);
        reject(err);
      })
      .on('end', function() {
        console.log('Videos successfully merged');
        resolve();
      })
      .save(outputPath);  // Save final video output
  });
};

// Add audio to the final video
const addAudioToVideo = (video, audio, output) => {
  return new Promise((resolve, reject) => {
    ffmpeg(video)
      .addInput(audio)
      .outputOptions('-c:v copy')  // Keep original video
      .outputOptions('-c:a aac')   // Use AAC codec for audio
      .on('start', (commandLine) => {
        console.log('FFmpeg command for adding audio: ' + commandLine);
      })
      .on('progress', (progress) => {
        console.log('Adding audio progress: ' + progress.percent + '% done');
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(output); // Save output file
  });
};

// Main function: trim, merge, and add audio
const processVideos = async () => {
  try {
    const trimmedVideo1 = path.join(__dirname, 'temp', 'trimmed1.mp4');
    const trimmedVideo2 = path.join(__dirname, 'temp', 'trimmed2.mp4');
    const concatenatedVideo = path.join(__dirname, 'temp', 'concatenated.mp4');

    // Trim and resize both videos to the same resolution (e.g., 1920x1080)
    await trimAndResizeVideo(video1Path, trimmedVideo1, '1920x1080');
    await trimAndResizeVideo(video2Path, trimmedVideo2, '1920x1080');    

    // Merge the two videos
    await mergeVideos(trimmedVideo1, trimmedVideo2, concatenatedVideo);

    // Add audio to the merged video
    await addAudioToVideo(concatenatedVideo, audioPath, outputPath);

    console.log('Video successfully processed and saved at', outputPath);
  } catch (error) {
    console.error('Error processing video:', error);
  }
};

// Create temp folder if it does not exist
if (!fs.existsSync(path.join(__dirname, 'temp'))) {
  fs.mkdirSync(path.join(__dirname, 'temp'));
}

processVideos();
