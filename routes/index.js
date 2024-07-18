const express = require('express');
const passport = require('passport');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'public/images/uploads/' });
const indexController = require('../controllers/indexController');

router.get('/signup', indexController.signupGET);
router.post('/signup', indexController.signupPOST);
router.get('/login', indexController.loginGET);
router.post('/login', indexController.loginPOST);

router.get('/auth/error', (req, res) => console.log('Unknown Error'));

//page routes to this when cicking on 'sign in with github'
router.get(
  '/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }),
);

//upon allowing access of github profile, github auto routes to this
router.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/auth/error' }),
  indexController.test,
);

router.get(
  '/requests',
  passport.authenticate(['jwt', 'github'], { session: false }),
  indexController.contactRequestsGET,
);

router.post(
  '/requests',
  passport.authenticate(['jwt', 'github'], { session: false }),
  indexController.searchUsernamePOST,
);

router.post(
  '/requests/:id',
  passport.authenticate(['jwt', 'github'], { session: false }),
  indexController.sendContactRequestPOST,
);

router.put(
  '/requests/:id',
  passport.authenticate(['jwt', 'github'], { session: false }),
  indexController.handleRequestsPUT,
);

router.delete(
  '/requests/:id',
  passport.authenticate(['jwt', 'github'], { session: false }),
  indexController.deleteContact,
);

router.get(
  '/group',
  passport.authenticate(['jwt', 'github'], { session: false }),
  indexController.groupGET,
);

router.post(
  '/group',
  passport.authenticate(['jwt', 'github'], { session: false }),
  indexController.groupPOST,
);

router.put(
  '/messages/:id/exit-group',
  passport.authenticate(['jwt', 'github'], { session: false }),
  indexController.exitGroup,
);

router.get(
  '/',
  passport.authenticate(['jwt', 'github'], { session: false }),
  indexController.homeGET,
);

router.get(
  '/messages/:id',
  passport.authenticate(['jwt', 'github'], { session: false }),
  indexController.idMessagesGET,
);

router.post(
  '/messages/:id',
  passport.authenticate(['jwt', 'github'], { session: false }),
  indexController.idMessagesPOST,
);

router.put(
  '/editProfile',
  passport.authenticate(['jwt', 'github'], { session: false }),
  upload.single('newProfilePic'),
  indexController.editProfile,
);

module.exports = router;
