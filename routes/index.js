const express = require('express');
const passport = require('passport');
const router = express.Router();
const indexController = require('../controllers/indexController');

router.get('/signup', indexController.signupGET);
router.post('/signup', indexController.signupPOST);
router.get('/login', indexController.loginGET);
router.post('/login', indexController.loginPOST);

router.get(
  '/requests',
  passport.authenticate('jwt', { session: false }),
  indexController.contactRequestsGET,
);

router.post(
  '/requests',
  passport.authenticate('jwt', { session: false }),
  indexController.searchUsernamePOST,
);

router.post(
  '/requests/:id',
  passport.authenticate('jwt', { session: false }),
  indexController.sendContactRequestPOST,
);

router.put(
  '/requests/:id',
  passport.authenticate('jwt', { session: false }),
  indexController.handleRequestsPUT,
);

router.delete(
  '/requests/:id',
  passport.authenticate('jwt', { session: false }),
  indexController.deleteContact,
);

router.get(
  '/group',
  passport.authenticate('jwt', { session: false }),
  indexController.groupGET,
);

router.post(
  '/group',
  passport.authenticate('jwt', { session: false }),
  indexController.groupPOST,
);

router.put(
  '/messages/:id/exit-group',
  passport.authenticate('jwt', { session: false }),
  indexController.exitGroup,
);

router.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  indexController.homeGET,
);

router.get(
  '/messages/:id',
  passport.authenticate('jwt', { session: false }),
  indexController.idMessagesGET,
);

router.post(
  '/messages/:id',
  passport.authenticate('jwt', { session: false }),
  indexController.idMessagesPOST,
);

router.put(
  '/editProfile',
  passport.authenticate('jwt', { session: false }),
  indexController.editProfile,
);

module.exports = router;
