const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController.js');

const isAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    console.log('Authenticated!');
    next();
  } else {
    console.log('Not authenticated!');
    res.redirect('/login');
  }
};

router.get('/', isAuth, indexController.homeGET);
router.get('/signup', indexController.signupGET);
router.post('/signup', indexController.signupPOST);
router.get('/login', indexController.loginGET);
router.post('/login', indexController.loginPOST);
router.get('/requests', isAuth, indexController.contactRequestsGET);
router.post('/requests', isAuth, indexController.searchUsernamePOST);
router.post('/requests/:id', isAuth, indexController.addContactPOST);
router.get('/messages/:id', isAuth, indexController.idMessagesGET);
router.post('/messages/:id', isAuth, indexController.idMessagesPOST);
router.get('/logout', indexController.logout);
module.exports = router;
