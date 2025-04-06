const { default: axios } = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { logger } = require('./logger');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { DownloadTrackerModel } = require('../model');

(function ensureTempFolder() {
  const directory = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }
})();

const temporaryVideo = async (videoURL, tempPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios.get(videoURL, { responseType: 'stream' });
      const writer = fs.createWriteStream(tempPath);

      response.data.pipe(writer);

      writer.on('finish', () => {
        console.log(`Download complete`);
        resolve(tempPath);
      });

      writer.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

const convertVideo = (stream, outputPath) => {
  logger.debug('Processing Video...');
  return new Promise((resolve, reject) => {
    ffmpeg(stream) // Use the same stream for conversion
      .outputOptions('-vf', 'scale=-1:720') // Scale while keeping aspect ratio
      .outputOptions('-crf 28')
      .videoCodec('libx264')
      .outputOptions('-preset ultrafast')
      .audioCodec('copy')
      .outputOptions('-threads 8')
      .output(outputPath)
      .on('progress', (progress) => {
        console.log(
          `Frames: ${progress.frames}, FPS: ${progress.currentFps}, Bitrate: ${progress.currentKbps}kbps`
        );
        console.log(`Processing time: ${progress.timemark}`);
        if (progress.percent) {
          console.log(`Processing: ${progress.percent.toFixed(2)}% done`);
        }
      })
      .on('end', () => {
        logger.info('Conversion complete!');
        resolve();
      })
      .on('error', (err) => {
        console.error('Error during conversion:', err);
        reject(err);
      })
      .run();
  });
};

const downloadVideo = async (videoURL, outputPath, video_id = '') => {
  try {
    // console.log('Downloading: ' + outputPath);
    // console.log(videoURL);
    // const randomName = generateTempFilename();
    // const temp_filename = path.join(directory, randomName);

    // const tempVideo = temporaryVideo(videoURL, temp_filename);
    // logger.debug('Processing Video...');
    const response = await axios.get(videoURL, { responseType: 'stream' });
    // console.log(response != null || response != undefined);
    // console.log(response.data);

    const writer = fs.createWriteStream(outputPath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Download complete: ${video_id}`);
        DownloadTrackerModel.updateProgress(video_id, 'downloaded');
        resolve(); // Resolve the promise when done
      });

      writer.on('error', (error) => {
        console.log(error);
        DownloadTrackerModel.updateProgress(video_id, 'failed download');
        reject(); // Reject the promise on error
      });
    });
    // const { height } = await getVideoResolution(tempVideo);
    // console.log(response.status);
    // const video = await convertVideo(response.data, outputPath);

    // console.log('Process Complete!');
    // } else {
    //   return new Promise((resolve, reject) => {
    //     ffmpeg(response.data)
    //       .output(outputPath)
    //       .on('end', () => {
    //         logger.info('Video saved without conversion.');
    //         resolve();
    //       })
    //       .on('error', reject)
    //       .run();
    //   });
    // }
  } catch (error) {
    DownloadTrackerModel.updateProgress(video_id, 'failed download');
    logger.error(`Error downloading video: ${error.message}`);
  }
};

async function getVideoResolution(stream) {
  return new Promise((resolve, reject) => {
    ffmpeg(stream).ffprobe((err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const { width, height } =
          metadata.streams.find((s) => s.codec_type === 'video') || {};
        resolve({ width, height });
      }
    });
  });
}

function generateTempFilename() {
  return `temp_${crypto.randomBytes(8).toString('hex')}.mp4`;
}

module.exports = downloadVideo;
