require('dotenv').config();
const app = require('./app.js');
const { logger } = require('./utils/logger.js');
// dotenv.config();

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
  logger.debug(`Now listening on port ${PORT}`);
});
