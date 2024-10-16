const express = require('express');
const passport = require('passport');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'public/images/uploads/' });
const indexController = require('../controllers/indexController');

router.post('/signup', indexController.signupPOST);
router.post('/login', indexController.loginPOST);

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
  upload.single('newProfilePic'),
  indexController.editProfile,
);

module.exports = router;
