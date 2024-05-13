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
      contacts: [],
      profilePic: null,
      messages: [],
      contactsRequests: [],
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
  const currentUser = await User.findOne(req.user).populate('contactsRequests');
  res.json(currentUser.contactsRequests);
};

exports.searchUsernamePOST = [
  body('username').notEmpty().trim().escape().withMessage('*Username required'),

  expressAsyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    const jsonErrorResponses = {
      usernameError: null,
    };

    if (!errors.isEmpty()) {
      jsonErrorResponses.usernameError = errors.msg;
      return res.json(jsonErrorResponses);
    }

    const { username } = req.body;
    const searchResult = await User.find({ username });
    if (searchResult.length < 1) return res.json('No results found');
    return res.json(searchResult);
  }),
];

exports.sendContactRequestPOST = async (req, res, next) => {
  const [currentUser, userToRequest] = await Promise.all([
    User.findOne(req.user),
    User.findById(req.params.id).populate('contactsRequests'),
  ]);

  const { contactsRequests } = userToRequest;

  //check if request has already been made
  for (const request of contactsRequests) {
    if (request.username === currentUser.username)
      return res.json('Request has already been made');
  }

  //check if already a contact
  for (const contacts of currentUser.contacts) {
    if (contacts._id.toString() === req.params.id)
      return res.json('User is already in your contacts list.');
  }

  //check if requesting to self
  if (currentUser._id.toString() === req.params.id)
    return res.json('Cannot send request to yourself');

  contactsRequests.push(currentUser);
  await userToRequest.save();
  return res.json(userToRequest);
};

exports.handleRequestsPUT = async (req, res, next) => {
  const currentUserId = req.user._id;
  const [currentUser, requestingUser] = await Promise.all([
    User.findById(currentUserId).populate('contactsRequests'),
    User.findById(req.params.id),
  ]);

  const { contactsRequests } = currentUser;

  for (const request of contactsRequests) {
    if (
      req.params.id === request._id.toString() &&
      req.body.action === 'approve'
    ) {
      //add to currentUser's contacts list
      currentUser.contacts.push(request);

      //remove from currentUser's contactsRequest list
      const targetIndex = contactsRequests.indexOf(request);
      contactsRequests.splice(targetIndex, 1);

      //add to contacts lists of requesting user
      requestingUser.contacts.push(currentUser);

      //remove from contactsRequest list of requesting user
      const requestingTargetIndex =
        requestingUser.contactsRequests.indexOf(currentUser);

      requestingUser.contactsRequests.splice(requestingTargetIndex, 1);

      await currentUser.save();
      await requestingUser.save();
      return res.json('Contact request approved!');
    }

    if (
      req.params.id === request._id.toString() &&
      req.body.action === 'reject'
    ) {
      //remove from currentUser's contactsRequest list
      const targetIndex = contactsRequests.indexOf(request);
      contactsRequests.splice(targetIndex, 1);

      //remove from contactsRequest list of requesting user
      const requestingTargetIndex =
        requestingUser.contactsRequests.indexOf(currentUser);

      requestingUser.contactsRequests.splice(requestingTargetIndex, 1);

      await currentUser.save();
      await requestingUser.save();
      return res.json('Contact request rejected!');
    }
  }
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
