const mongoose = require('mongoose');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const Message = require('../models/message');
const expressAsyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const he = require('he');
const User = require('../models/user');

exports.signupGET = async (req, res, next) => {
  return res.json({ message: 'GET - Sign Up page' });
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
        jsonErrorResponses.usernameError = `Username is taken.`;
        return res.json(jsonErrorResponses);
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

exports.loginGET = (req, res, next) => {};

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

    const user = await User.findOne({ username: req.body.username }).select(
      '+password',
    );

    if (!user) {
      jsonErrorResponses.usernameError = '*User not found';
      return res.json(jsonErrorResponses);
    }

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) {
      jsonErrorResponses.passwordError = '*Incorrect password';
      return res.json(jsonErrorResponses);
    }

    jwt.sign(
      { user },
      process.env.SECRET,
      { expiresIn: '1h', algorithm: 'HS256' },
      (err, token) => {
        if (err) {
          throw Error(err);
        } else {
          const { username } = user;
          return res.json({ username, Bearer: `Bearer ${token}` });
        }
      },
    );
  }),
];

exports.contactRequestsGET = async (req, res, next) => {
  const currentUser = await User.findById(req.user.user._id)
    .populate('contactsRequests')
    .populate({
      path: 'contacts',
      populate: {
        path: 'username',
      },
    });
  return res.json(currentUser);
};

exports.searchUsernamePOST = [
  body('username').notEmpty().trim().escape().withMessage('*Username required'),
  expressAsyncHandler(async (req, res, next) => {
    const currentUser = await User.findById(req.user.user._id);

    const errors = validationResult(req);

    const jsonErrorResponses = {
      usernameError: null,
    };

    if (!errors.isEmpty()) {
      jsonErrorResponses.usernameError = errors.msg;
      return res.json(jsonErrorResponses);
    }

    const { username } = req.body;
    if (username === currentUser.username) {
      jsonErrorResponses.usernameError = 'Username is self';
      return res.json(jsonErrorResponses);
    }

    const searchResult = await User.find({ username });
    if (searchResult.length < 1) {
      jsonErrorResponses.usernameError = 'Username does not exist';
      return res.json(jsonErrorResponses);
    }

    searchResult.forEach((result) => {
      if (currentUser.contactsRequests.includes(result._id.toString())) {
        jsonErrorResponses.usernameError = 'Request to username is pending';
        return res.json(jsonErrorResponses);
      }

      if (currentUser.contacts.includes(result._id.toString())) {
        jsonErrorResponses.usernameError = 'Username is already a contact';
        return res.json(jsonErrorResponses);
      }
    });
    return res.json(searchResult);
  }),
];

exports.sendContactRequestPOST = async (req, res, next) => {
  const [currentUser, userToRequest] = await Promise.all([
    User.findById(req.user.user._id),
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
  const currentUserId = req.user.user._id;
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

      await Promise.all([currentUser.save(), requestingUser.save()]);
      return res.json(contactsRequests);
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

      await Promise.all([currentUser.save(), requestingUser.save()]);
      return res.json(contactsRequests);
    }
  }
};

exports.deleteContact = async (req, res, next) => {
  const [currentUser, targetUser] = await Promise.all([
    User.findById(req.user.user._id).populate('contacts'),
    User.findById(req.params.id).populate('contacts'),
  ]);

  for (const contact of currentUser.contacts) {
    if (contact._id.toString() === req.params.id) {
      //remove from currentUser's contact list
      const targetIndex = currentUser.contacts.indexOf(contact);
      currentUser.contacts.splice(targetIndex, 1);

      //remove currentUser from targetUser's contact list
      const targetUserIndex = targetUser.contacts.indexOf(currentUser);
      targetUser.contacts.splice(targetUserIndex, 1);

      await Promise.all([currentUser.save(), targetUser.save()]);
      return res.json(currentUser.contacts);
    }
  }
  return res.json('Contact not found!');
};

exports.homeGET = async (req, res, next) => {
  const currentUserObjectId = new mongoose.Types.ObjectId(req.user.user._id);
  const currentUser = await User.findById(req.user.user._id).populate({
    path: 'contacts',
    populate: [
      {
        path: 'messages',
        match: {
          $or: [{ from: currentUserObjectId }, { to: currentUserObjectId }],
        },
        options: {
          sort: { date: -1 },
        },
      },
    ],
  });

  return res.json(currentUser);
};

exports.idMessagesGET = async (req, res, next) => {
  const currentUser = await User.findById(req.user.user._id).populate({
    path: 'contacts',
    populate: { path: 'username', path: 'messages' },
  });
  //check if trying to access self
  if (req.params.id === currentUser._id.toString())
    return res.json('Cannot access to self');

  for (const contact of currentUser.contacts) {
    if (contact._id.toString() === req.params.id) {
      const targetMessages = contact.messages
        .sort((a, b) => a.date - b.date)
        .filter(
          (message) =>
            message.from.toString() === currentUser._id.toString() ||
            message.to.toString() === currentUser._id.toString(),
        );
      return res.json({
        username: contact.username,
        profilePic: contact.profilePic,
        messages: targetMessages,
      });
    }
  }
  return res.json('No messages found');
};

exports.idMessagesPOST = [
  body('newMessage').notEmpty().trim().escape().withMessage('Input required'),

  expressAsyncHandler(async (req, res, next) => {
    const [currentUser, recipient] = await Promise.all([
      User.findById(req.user.user._id).populate('messages'),
      User.findById(req.params.id).populate('messages'),
    ]);

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.json(errors);
    } else {
      //check if sending message to self
      if (req.params.id === currentUser._id.toString())
        return res.json('Cannot send message to self');

      const newMessage = new Message({
        from: currentUser,
        to: recipient,
        content: he.decode(req.body.newMessage),
        date: new Date(),
      });

      currentUser.messages.push(newMessage);
      recipient.messages.push(newMessage);

      await Promise.all([
        newMessage.save(),
        currentUser.save(),
        recipient.save(),
      ]);

      return res.redirect(`/messages/${req.params.id}`);
    }
  }),
];

exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
};
