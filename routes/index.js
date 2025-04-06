const { Router } = require('express');
const metaRoutes = require('./meta-routes.js');

const router = Router();

router.use('/_health', async (req, res) => {
  console.log('hit!');
  res.status(200).send({
    message: 'success',
  });
});
router.use('/meta', metaRoutes);

module.exports = router;
