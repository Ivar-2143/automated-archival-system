const express = require('express');
const bodyParser = require('body-parser');
const { winstonHTTPMiddleware } = require('./utils/logger.js');
const routes = require('./routes/index.js');
const downloadVideo = require('./utils/downloader.js');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(winstonHTTPMiddleware);
app.use('/api', routes);

(function ensureTempFolder() {
  const directory = path.join(__dirname, 'live_videos');
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }
})();

// const output_path = path.join(__dirname, 'live_videos', 'sample1.mp4');
// const url =
//   'https://scontent.fmnl17-5.fna.fbcdn.net/o1/v/t2/f2/m69/AQMrHlTeJmVeCLhh5arxEyicjnEhOGbCdOraepcNw2lbDepYxY720hL8fdRv4rtmSNQT6OgmC8x6gfJCzpemsnqP.mp4?strext=1&_nc_cat=110&_nc_oc=AdmZzcJHeyug6-W_H0KjrBJqIiYCLT7rNmKCSWeLV_gXm5XnzwRdkqa0bwpfzkLJEuM&_nc_sid=5e9851&_nc_ht=scontent.fmnl17-5.fna.fbcdn.net&_nc_ohc=_FUzqOm9_oYQ7kNvgFrGDPT&efg=eyJ2ZW5jb2RlX3RhZyI6Inhwdl9wcm9ncmVzc2l2ZS5GQUNFQk9PSy4uQzMuNjQwLmRhc2hfbGl2ZV9tZF9mcmFnXzJfdmlkZW8iLCJ4cHZfYXNzZXRfaWQiOjQwNDk3MzEzNjUyNzA4ODIsInZpX3VzZWNhc2VfaWQiOjEwMTI1LCJkdXJhdGlvbl9zIjowLCJ1cmxnZW5fc291cmNlIjoid3d3In0%3D&ccb=17-1&vs=f2842167af3f978&_nc_vs=HBksFQIYOnBhc3N0aHJvdWdoX2V2ZXJzdG9yZS9HSUNXbUFCaWZZdktQZVlCQUpvYl9xeloyWmR2YnY0R0FBQUYVAALIAQAVAhg6cGFzc3Rocm91Z2hfZXZlcnN0b3JlL0dIcTJYQnhtRkpvbjVMVUVBSFRkS1M1Vk1MSW9idjRHQUFBRhUCAsgBACgAGAAbAogHdXNlX29pbAExEnByb2dyZXNzaXZlX3JlY2lwZQExFQAAJsTVs_exzbEOFQIoAkMzLBdAs0tEWhysCBgZZGFzaF9saXZlX21kX2ZyYWdfMl92aWRlbxEAdQIA&_nc_zt=28&_nc_eui2=AeFYxu_s-zZlqW8jcZ6MGkHreUu94D2DcKF5S73gPYNwoZ7-ls7naV14C5fH4k73n7BffVQvlooWJRdEuhGoV38s&oh=00_AYHuTYEbZrF_Kco6pcBVE9miFSlQn27zzFjA6-yZWN6yVw&oe=67E8B2AC';
// downloadVideo(url, output_path);
module.exports = app;
