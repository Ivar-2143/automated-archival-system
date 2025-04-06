const VideoModel = require('./VideoModel.js');
const DownloadTrackerModel = require('./DownloadTrackerModel.js');

module.exports = {
  VideoModel: new VideoModel(),
  DownloadTrackerModel: new DownloadTrackerModel(),
};
