const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

class VideoModel {
  constructor() {
    this.categories = {
      devotion: 'DailyDevotion',
      revelation: 'DailyRevelation',
      sunday: 'SundayService',
      communion: 'WednesdayCommunion',
      others: 'Others',
    };
    this.categoryKeywords = {
      devotion: ['daily devotion', 'dd', 'titldd'],
      revelation: ['daily revelation', 'titldr'],
      sunday: ['sunday service', 'sunday online service', 'sunday'],
      communion: ['wednesday communion night', 'communion', 'communion night'],
    };
    this.videosDirectory = path.join(process.cwd(), 'data', 'videos');
    this.createVideosDirectory();
  }

  /**
   * Creates the data/videos directory if it doesn't exist.
   */
  createVideosDirectory() {
    for (const [key, category] of Object.entries(this.categories)) {
      const categoryFile = path.join(this.videosDirectory, `${category}.json`);

      if (!fs.existsSync(this.videosDirectory)) {
        fs.mkdirSync(this.videosDirectory);
      }

      if (!fs.existsSync(categoryFile)) {
        fs.writeFileSync(categoryFile, JSON.stringify({ videos: [] }, null, 2));
      }
    }
  }

  createVideo(category_key, newVideo) {
    // Read the JSON file and parse its contents into a JavaScript object
    const videoCategoryFile = path.join(
      this.videosDirectory,
      `${this.categories[category_key]}.json`
    );
    const jsonData = fs.readFileSync(videoCategoryFile, 'utf8');
    const jsonObject = JSON.parse(jsonData);

    jsonObject.videos.push(newVideo);

    // Stringify the updated object and write it back to the JSON file
    const updatedJsonData = JSON.stringify(jsonObject, null, 2);
    fs.writeFileSync(videoCategoryFile, updatedJsonData);
  }

  getVideoCategory(video_data) {
    const fields = {
      isTitleValid: false,
      isDescriptionValid: false,
    };
    const category = Object.entries(this.categoryKeywords).find(
      ([category, keywords]) => {
        const isTitleValid = keywords.some((value) => {
          const isValid = video_data.title?.toLowerCase().includes(value);
          if (isValid) fields.isTitleValid = true;
          return isValid;
        });
        const isDescValid = keywords.some((value) => {
          const isValid = video_data?.description
            ?.toLowerCase()
            .includes(value);
          if (isValid) fields.isDescriptionValid = true;
          return isValid;
        });
        if (isTitleValid || isDescValid) return category;
      }
    );

    const category_key = category?.[0] || 'others';
    return {
      fields,
      category_key,
      category_name: this.categories[category_key],
    };
  }
}

module.exports = VideoModel;
