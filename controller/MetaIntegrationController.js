const axios = require('axios');
const { logger } = require('../utils/logger.js');
const { HandleError, Success } = require('../utils/response-handler.js');
const { DownloadTrackerModel, VideoModel } = require('../model/index.js');
const { MONTHS } = require('../utils/constant.js');
const downloadVideo = require('../utils/downloader.js');
const path = require('path');
const fs = require('fs');

class MetaIntegrationController {
  constructor() {
    console.log('Controller initialized.');
    // const base_url = 'https://graph.facebook.com';
    this.BASE_URL = 'https://graph.facebook.com';
    this.rateLimitCodes = new Set([4, 17, 32, 613]);
    this.access_token = null;
  }

  async callback(req, res) {
    try {
      console.log('callback reached.');
      console.log(req);
      console.log(req.query);

      res.status(200).send({
        data: null,
        message: 'Received',
      });
    } catch (error) {
      res.status(400).send({
        data: null,
        error: error,
      });
    }
  }

  async generateUserAccessToken() {
    const url = `https://www.facebook.com/v12.0/dialog/oauth`;
    const response = await axios.get(url, {
      params: {
        client_id: process.env.APP_ID,
        client_secret: process.env.APP_SECRET,
        redirect_uri: 'http://localhost:8888/meta/callback',
        scope: 'pages_show_list,pages_read_engagement',
        response_type: 'code',
      },
    });

    console.log(response);
  }

  async generatePageAccessToken() {
    const url = `https://www.facebook.com/v12.0/oauth/access_token`;
    const response = await axios.get(url, {
      params: {
        client_id: process.env.APP_ID,
        client_secret: process.env.APP_SECRET,
        redirect_uri: 'http://localhost:8888/meta/callback',
        scope: 'pages_show_list,pages_read_engagement',
        code: process.env.USER_TOKEN,
      },
    });

    console.log(response);
  }

  async generateAccessToken() {
    // const url = this.BASE_URL + '/oauth/access_token';
    // const params = {
    //   client_id: process.env.APP_ID,
    //   client_secret: process.env.APP_SECRET,
    //   grant_type: 'client_credentials',
    //   scope: 'pages_show_list,pages_read_engagement',
    // };
    // console.log(params);
    // const authentication_token = await axios.get(url, {
    //   params,
    // });

    // const userAccessToken = authentication_token.data.access_token;
    // console.log(userAccessToken);

    const accessTokenURL = new URL('v22.0/me/accounts', this.BASE_URL);
    // this.BASE_URL + '/' + process.env.USER_ID + '/' + 'accounts';
    accessTokenURL.searchParams.append('access_token', process.env.USER_TOKEN);
    const response = await axios.get(accessTokenURL.toString(), {
      params: {
        access_token: process.env.USER_TOKEN,
      },
    });
    const pageAccessToken = response.data.data[0].access_token;
    this.access_token = pageAccessToken;
    logger.debug('GENERATED ACCESS TOKEN: ' + pageAccessToken);
    // console.log(pageAccessToken);
  }

  async index(req, res) {
    const start = new Date('2024-04-01');
    const end = new Date('2025-05-01');
    // do {
    try {
      logger.debug('hit!');
      const page_id = process.env.PAGE_ID || '';

      const access_token =
        'EAANdIn2ZAhlcBO6pGptOlv3wHjp4GUaEa8YTY03FjDRtPzfKcrAtvTKwVMKQf5uYt1ot9VjUcLmhPsthchULZBb3moTvDJhSp8n8SvUH6gZBVFAHc6yuivuN6kJgCV9GSZBEICR0ssChVZCasUIVE1IducOQXhpQp7NehuVHyw0v5vJbpPQ915cIVplchhQyqZA4IZCaZAHGfQzZA2h0K5OX36pIZD';

      const filter = {
        start_date: new Date('2022-04-01').getTime() / 1000,
        end_date: new Date('2022-05-01').getTime() / 1000,
      };
      const request_url = new URL(`${base_url}/5128543733863710`);

      // Append the query parameter
      request_url.searchParams.append('fields', 'source');
      request_url.searchParams.append('access_token', access_token);
      // request_url.searchParams.append('since', filter.start_date);
      // request_url.searchParams.append('until', filter.end_date);
      // request_url.searchParams.append('limit', 30);
      // logger.debug('REQUESTING RESOURCE', {
      //   request_url: request_url.toString(),
      // });
      const live_videos = await axios.get(request_url.toString());
      const data = live_videos.data;
      Success({ res, data });
    } catch (error) {
      const error_code = error.response.data.error.code;
      console.log(error.response.data.error.code);
      if (this.rateLimitCodes.has(error_code)) {
        const message = `Rate Limit reached with code: ${error_code}`;
        HandleError({
          res,
          error: null,
          message,
          data: error.response.data.error,
        });
      }
      if (error_code == 190) {
        console.log('Token Expired');
        console.log('Retrying...');
        await this.generateAccessToken();
        // tries++;
      }
    }
    // } while (true);
  }

  async downloadVideos(req, res) {
    try {
      const start_time = new Date();
      const filter = {
        start_date: new Date('2020-01-01'),
        end_date: new Date('2021-01-01'),
      };
      const videos = await this.#fetchLiveVideos(filter);
      logger.debug(`${videos?.data?.length} videos fetched!`);
      logger.debug('Now Processing...');
      const video_ids = await DownloadTrackerModel.createDownloadBatch(
        videos.data,
        filter,
        videos.paging
      );

      // const video = await this.#fetchSingleVideo(videos.data[0].video.id);
      await this.processAndDownloadVideos(res, start_time, video_ids, filter);

      const total_time = new Date() - start_time;
      const execution_time = this.getTotalTime(total_time);
      logger.info(`Processing Completed for a total of: ${execution_time}`);
      Success({
        res,
        data: null,
        message: 'Fetched Videos',
      });
    } catch (error) {
      // console.log(error);
      // console.log(error.response.data);

      HandleError({ res, error });
    }
  }

  async reprocessFailedAndRemainingVideos(req, res) {
    const start_time = new Date();
    try {
      const filter = {
        start_date: new Date('2020-01-01'),
        end_date: new Date('2021-01-01'),
      };
      DownloadTrackerModel.getCurrentBatch();
      console.log('Batch Loged');
      const video_ids = await DownloadTrackerModel.getUnfinishedVideos();
      console.log('Unfinished Videos');
      await this.processAndDownloadVideos(res, start_time, video_ids, filter);
      // console.log('Unfinished Video')

      const total_time = new Date() - start_time;
      const execution_time = this.getTotalTime(total_time);
      logger.info(`Processing Completed for a total of: ${execution_time}`);

      Success({
        res,
        data: null,
        message: 'Downloaded Unfinished Videos',
      });
    } catch (error) {
      // console.log(error);
      const total_time = new Date() - start_time;
      const execution_time = this.getTotalTime(total_time);
      logger.info(`Processing Completed for a total of: ${execution_time}`);
      HandleError({ res, error });
    }
  }
  async processAndDownloadVideos(res, start_time, video_ids, filter) {
    let count = 0;
    for (let video_id of video_ids) {
      const video = await this.#fetchSingleVideo(video_id);
      // console.log(video);
      if (!video) continue;
      const { time, video_output_path } = this.processVideoDetails(video);
      if (time.year !== filter.start_date.getFullYear()) {
        DownloadTrackerModel.updateProgress(video_id, 'not_in_range');
        continue;
      }
      if (video.source) {
        await downloadVideo(video.source, video_output_path, video_id);
      }

      count++;
      const total_count = video_ids.length;
      const percent_value = parseFloat((count / total_count) * 100).toFixed(2);
      const progress_message = `Progress: ${percent_value}% complete.`;
      logger.info(progress_message);

      const total_time = new Date() - start_time;
      const time_elapsed = this.getTotalTime(total_time);
      logger.info(`Time elapsed: ${time_elapsed}`);
    }
  }

  async #fetchLiveVideos(filter) {
    const page_id = process.env.PAGE_ID;
    const url = `${this.BASE_URL}/v22.0/${page_id}/live_videos`;
    try {
      const response = await axios.get(url, {
        params: {
          access_token: this.access_token,
          fields: 'video,id,created_time,status,source,end_time,title',
          limit: 500,
          since: filter.start_date,
          until: filter.end_date,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching videos', { filter });
      throw error;
    }
  }

  async #fetchSingleVideo(video_id) {
    console.log('fetching video', +video_id);
    try {
      const url = `${this.BASE_URL}/v22.0/${video_id}`;
      const response = await axios.get(url, {
        params: {
          fields: 'created_time,title,source,permalink_url,description',
          access_token: this.access_token,
        },
      });
      // console.log(response);

      DownloadTrackerModel.updateProgress(video_id, 'fetched');
      return response.data;
    } catch (error) {
      // logger.error('Error fetching video details', { video_id });
      DownloadTrackerModel.updateProgress(video_id, 'failed fetch');
      return null;
    }
  }

  processVideoDetails(video_data) {
    const created_time = new Date(video_data.created_time);
    const time = {
      day: created_time.getDate(),
      month: created_time.getMonth(),
      year: created_time.getFullYear(),
    };
    const month = time.month + 1;
    const regular_month = month > 9 ? month : '0' + month;
    const regular_day = time.day > 9 ? time.day : '0' + time.day;
    const date_string = `${time.year}-${regular_month}-${regular_day}`;

    const fb_link = 'https://facebook.com' + video_data.permalink_url;
    const { fields, category_key, category_name } =
      VideoModel.getVideoCategory(video_data);

    let file_name = null;
    if (fields.isTitleValid) {
      file_name = video_data.title;
    } else if (
      video_data?.description?.length > 0 &&
      fields.isDescriptionValid &&
      !fields.isTitleValid
    ) {
      file_name = video_data.description.split('.')[0] || category_name;
    } else {
      if (
        (!video_data.title || video_data?.title?.length == 0) &&
        video_data?.description?.length > 0
      ) {
        file_name = video_data?.description.split('.')[0] || category_name;
      }
      if (!video_data?.description || video_data?.description?.length == 0) {
        file_name = 'UnknownVideo';
      }
    }

    //Build Directory
    const initial_directory = path.join(
      process.cwd(),
      'live_videos',
      time.year.toString()
    );
    const month_group_directory = path.join(
      initial_directory,
      MONTHS[time.month]
    );
    const video_directory = path.join(month_group_directory, category_name);

    const video_output_path = path.join(
      video_directory,
      this.getSerializedFileName(`${date_string}-${file_name}`)
    );

    // console.log('output', video_output_path);

    //Ensure directory is existing
    if (!fs.existsSync(initial_directory)) {
      fs.mkdirSync(initial_directory);
    }
    if (!fs.existsSync(month_group_directory)) {
      fs.mkdirSync(month_group_directory);
    }
    if (!fs.existsSync(video_directory)) {
      fs.mkdirSync(video_directory);
    }

    const newVideoData = {
      ...video_data,
      fb_link,
    };
    delete newVideoData.source;
    delete newVideoData.permalink_url;
    VideoModel.createVideo(category_key, newVideoData);

    return {
      time,
      video_output_path,
    };
  }

  getTotalTime(total_time) {
    let timeOutput;

    // If total_time is greater than or equal to an hour
    if (total_time >= 1000 * 60 * 60) {
      const hours = Math.floor(total_time / (1000 * 60 * 60));
      const remainingMinutes = Math.floor(
        (total_time % (1000 * 60 * 60)) / (1000 * 60)
      ); // Get remaining minutes after extracting hours

      if (remainingMinutes > 0) {
        timeOutput = `${hours} hour${
          hours > 1 ? 's' : ''
        } and ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
      } else {
        timeOutput = `${hours} hour${hours > 1 ? 's' : ''}`;
      }
    }
    // If total_time is greater than or equal to a minute but less than an hour
    else if (total_time >= 1000 * 60) {
      const minutes = Math.floor(total_time / (1000 * 60));
      timeOutput = `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    // If total_time is greater than or equal to a second but less than a minute
    else if (total_time >= 1000) {
      const seconds = Math.floor(total_time / 1000);
      timeOutput = `${seconds} second${seconds > 1 ? 's' : ''}`;
    } else {
      // Otherwise, show milliseconds
      timeOutput = `${total_time} millisecond${total_time > 1 ? 's' : ''}`;
    }

    return timeOutput;
  }

  getSerializedFileName(fileName) {
    const sanitizedName = fileName
      .replace(/[\/:*?"<>|\\,]/g, '_') // Replace invalid characters (including commas) with '_'
      .replace(/\s+/g, '_') // Replace spaces with '_'
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove non-printable characters
      .replace(/\./g, '_');

    const trimmed = sanitizedName.slice(0, 200).toString();
    // console.log('trimmed', trimmed);
    return trimmed + '.mp4';
  }
}

module.exports = MetaIntegrationController;
