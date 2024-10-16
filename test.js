import editly from 'editly';
import ffmpeg from 'fluent-ffmpeg' 
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffprobePath from '@ffprobe-installer/ffprobe'


ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

async function main() {
    const clips = [
        {
            layers: [
                {
                    type: "video",
                    path: "./creos/money/0.mp4"
                }
            ]
        },
        {
            layers: [
                {
                    type: "video",
                    path: "./creos/money/mori.mp4"
                }
            ]
        }
    ];

    await editly({
        keepSourceAudio: true,   // to keep audio
        outPath: "./data/merged.mp4",
        clips: clips,
    });
}

main();
