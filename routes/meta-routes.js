const { Router } = require('express');
const { MetaIntegrationController } = require('../controller');

const metaRoutes = Router();

(async function () {
  await MetaIntegrationController.generateAccessToken();
})();

metaRoutes.get(
  '/',
  MetaIntegrationController.downloadVideos.bind(MetaIntegrationController)
);
metaRoutes.get(
  '/continue',
  MetaIntegrationController.reprocessFailedAndRemainingVideos.bind(
    MetaIntegrationController
  )
);
module.exports = metaRoutes;
