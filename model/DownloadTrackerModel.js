const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

class DownloadTracker {
  constructor() {
    this.trackerFileName = 'logs.json';
    this.trackerDirectory = path.join(process.cwd(), 'data');
    this.trackerFile = path.join(this.trackerDirectory, this.trackerFileName);
    this.current_batch = null;
    this.createTrackerDirectory();
  }

  /**
   * Creates the data/videos directory if it doesn't exist.
   */
  createTrackerDirectory() {
    if (!fs.existsSync(this.trackerDirectory)) {
      fs.mkdirSync(this.trackerDirectory);
    }

    if (!fs.existsSync(this.trackerFile)) {
      fs.writeFileSync(this.trackerFile, JSON.stringify({}, null, 2));
    }
  }

  createLog(newLog) {
    // Read the JSON file and parse its contents into a JavaScript object
    const jsonData = fs.readFileSync(this.trackerFile, 'utf8');
    const jsonObject = JSON.parse(jsonData);

    jsonObject.logs.push(newLog);

    // Stringify the updated object and write it back to the JSON file
    const updatedJsonData = JSON.stringify(jsonObject, null, 2);
    fs.writeFileSync(this.trackerFile, updatedJsonData);
  }

  async getCurrentBatch() {
    const batches = await this.readLogs();
    const batch_num = Object.entries(batches).length;
    console.log('Batch num: ' + batch_num);
    if (batch_num === 0) {
      this.current_batch = null;
      logger.debug('No Batch Exists Yet');
    } else {
      this.current_batch = `batch_${batch_num}`;
      logger.debug(`Current Batch Successfully Loaded: ${this.current_batch}`);
    }
  }

  async readLogs() {
    const jsonData = fs.readFileSync(this.trackerFile, 'utf8');
    const jsonObject = JSON.parse(jsonData);
    // logger.debug('Logs loaded');
    return jsonObject;
  }

  async createDownloadBatch(data, filter, paging) {
    const data_set = {
      video_ids: [],
      progress: {},
    };

    const query = {
      since: filter.start_date,
      until: filter.end_date,
      paging,
    };

    const date_range = {
      from: filter.start_date.toString(),
      to: filter.end_date.toString(),
    };

    data.map((item) => {
      const video_id = item.video.id;
      data_set.video_ids.push(video_id);
      data_set.progress[video_id] = 'processing';
    });

    const batch_data = {
      query,
      date_range,
      ...data_set,
    };

    const existing_batches = await this.readLogs();
    const number_of_batches = Object.keys(existing_batches).length;
    const batch_num = number_of_batches + 1;
    const batch_name = `batch_${batch_num}`;
    this.current_batch = batch_name;
    existing_batches[batch_name] = batch_data;
    this.saveBatch(existing_batches);
    logger.debug('Batch Created');

    return data_set.video_ids;
  }

  async updateProgress(video_id, progress) {
    const existing_batches = await this.readLogs();
    const batch = existing_batches[this.current_batch];
    if (batch) {
      existing_batches[this.current_batch].progress[video_id] = progress;
      await this.saveBatch(existing_batches);
    }
    if (batch && progress == 'downloaded') {
      const downloaded = Object.entries(batch.progress).filter(
        ([id, status]) => status === 'downloaded'
      );
      logger.debug(
        `Processing videos ${downloaded.length}/${batch.video_ids.length}`
      );
      //do something...
    }
  }

  async saveBatch(batch_data) {
    const updatedJsonData = JSON.stringify(batch_data, null, 2);
    fs.writeFileSync(this.trackerFile, updatedJsonData);
  }
  async getUnfinishedVideos() {
    const existing_batches = await this.readLogs();
    const batch = existing_batches[this.current_batch];

    const all_progress = batch.progress;
    const unfinished_videos = Object.entries(all_progress).filter(
      ([id, status]) => status !== 'downloaded'
    );
    const unfinished_video_ids = unfinished_videos.map(
      ([video_id, _]) => video_id
    );
    return unfinished_video_ids;
  }
}

module.exports = DownloadTracker;
