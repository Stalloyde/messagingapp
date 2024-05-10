const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');
const expressAsyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

exports.signupGET = async (req, res, next) => {
  res.send('GET - Sign Up page');
};

exports.signupPOST = [
  body('username').notEmpty().trim().escape().withMessage('*Username required'),
  body('password').notEmpty().trim().escape().withMessage('*Password required'),
  body('confirmPassword')
    .notEmpty()
    .trim()
    .custom((value, { req }) => value === req.body.password)
    .escape()
    .withMessage('Passwords do not match'),

  expressAsyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    const jsonErrorResponses = {
      usernameError: null,
      passwordError: null,
      confirmPasswordError: null,
    };

    if (!errors.isEmpty()) {
      const errorsArray = errors.array();

      errorsArray.forEach((error) => {
        if (error.path === 'username') {
          jsonErrorResponses.usernameError = error.msg;
        } else if (error.path === 'password') {
          jsonErrorResponses.passwordError = error.msg;
        } else {
          jsonErrorResponses.confirmPasswordError = error.msg;
        }
      });
      return res.json(jsonErrorResponses);
    }

    let newUser = new User({
      username: req.body.username,
      password: req.body.password,
      status: null,
      contacts: null,
      profilePic: null,
      messages: null,
      contactsRequests: null,
    });

    try {
      const { username } = newUser;
      const checkDuplicate = await User.findOne({ username });

      if (checkDuplicate) {
        return res.json('*Username has been taken. Try another.');
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      newUser.password = hashedPassword;
      await newUser.save();
      return res.json('Sign up successful!');
    } catch (err) {
      return next(err);
    }
  }),
];

exports.loginGET = (req, res, next) => {
  const errorMessages = req.flash();
  res.json(errorMessages);
};

exports.loginPOST = [
  body('username').notEmpty().trim().escape().withMessage('*Username required'),
  body('password').notEmpty().trim().escape().withMessage('*Password required'),

  expressAsyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    const jsonErrorResponses = {
      usernameError: null,
      passwordError: null,
    };

    if (!errors.isEmpty()) {
      const errorsArray = errors.array();

      errorsArray.forEach((error) => {
        if (error.path === 'username')
          jsonErrorResponses.usernameError = error.msg;
        if (error.path === 'password')
          jsonErrorResponses.passwordError = error.msg;
      });
      return res.json(jsonErrorResponses);
    }
    next();
  }),

  passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true,
  }),
  (req, res) => res.redirect(`/`),
];

exports.homeGET = async (req, res, next) => {
  const currentUser = await User.findOne(req.user);
  res.json(currentUser.contacts);
};

exports.contactRequestsGET = async (req, res, next) => {
  const currentUser = await User.findOne(req.user);
  res.json(currentUser.contactsRequests);
};

exports.searchUsernamePOST = async (req, res, next) => {
  const { username } = req.body;
  const searchResult = await User.find({ username });
  res.json(searchResult);
};

exports.addContactPOST = async (req, res, next) => {
  res.json(
    'POST - Add Contact.. search for id params and add user to contactRequest field. Should be authorized to access',
  );
};

exports.idMessagesGET = async (req, res, next) => {
  res.json('GET messages from userId. Should be authorized to access');
};

exports.idMessagesPOST = async (req, res, next) => {
  res.json('POST messages to userId. Should be authorized to access');
};

exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
  });
  res.redirect('/');
};
