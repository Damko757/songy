
// require all the things!
const fs = require("fs");
const ytdl = require('@distube/ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const cp = require('child_process');
const stream = require('stream');

// default export: the ffmpeg muxer
const ytmux = (link, options = {}) => {
    const result = new stream.PassThrough({ highWaterMark: options.highWaterMark || 1024 * 512 });
    console.info("Loading:", link);
    ytdl.getInfo(link).then(info => {
      console.info(info)
      ytdl.downloadFromInfo(info, { quality: 'highestaudio', ...options }).pipe(fs.createWriteStream("out/vidOnly.mp4"));
      ytdl.downloadFromInfo(info, { quality: 'highestaudio', ...options }).pipe(fs.createWriteStream("out/audioOnly.mp4"));
      //ffmpeg -fflags +igndts -i video.mp4 -i audio.mp4 -c:v copy -c:a aac output.mp4 
        audioStream = ytdl.downloadFromInfo(info, { quality: 'highestaudio', ...options });
        videoStream = ytdl.downloadFromInfo(info, { quality: 'highestvideo', ...options });
        videoStream.on('progress', (...args) => result.emit('progress', ...args));
        videoStream.on("finish", (...args) => console.log("FINISH", ...args));
        audioStream.on("finish", (...args) => console.log("FINISH", ...args));
        // create the ffmpeg process for muxing
        ffmpegProcess = cp.spawn(ffmpegPath, [
            // supress non-crucial messages
            // '-loglevel', '8', '-hide_banner',
            "-fflags", "+igndts",
            // input audio and video by pipe
            '-i', 'pipe:3', //'-i', 'pipe:4',
            // map audio and video correspondingly
            '-map', '0:a', //'-map', '1:v',
            // no need to change the codec
            '-c', 'copy',
            // output mp4 and pipe
            '-f', 'matroska', 'pipe:5'
        ], {
            // no popup window for Windows users
            windowsHide: true,
            stdio: [
                // silence stdin/out, forward stderr,
                'inherit', 'inherit', 'inherit',
                // and pipe audio, video, output
                'pipe', 'pipe', 'pipe'
            ]
        });
        audioStream.pipe(ffmpegProcess.stdio[3]);
        videoStream.pipe(ffmpegProcess.stdio[4]);
        // ffmpegProcess.stdio[5].pipe(result);
        ffmpegProcess.stdio[5].pipe(fs.createWriteStream("out/full.mp4"));
    }).catch(err => result.emit('error', err));
    return result;
};

// export it
module.exports = ytmux;

// export other functions, in case you want them
ytmux.download = ytdl;
ytmux.chooseFormat = ytdl.chooseFormat;
ytmux.downloadFromInfo = ytdl.downloadFromInfo;
ytmux.filterFormats = ytdl.filterFormats;
ytmux.getBasicInfo = ytdl.getBasicInfo;
ytmux.getInfo = ytdl.getInfo;
ytmux.getURLVideoID = ytdl.getURLVideoID;
ytmux.getVideoID = ytdl.getVideoID;
ytmux.validateID = ytdl.validateID;
ytmux.validateURL = ytdl.validateURL;