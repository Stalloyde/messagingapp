require('dotenv').config();
const mongoose = require('mongoose');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const Message = require('../models/message');
const User = require('../models/user');
const Group = require('../models/group');
const GroupMessages = require('../models/groupMessages');
const expressAsyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const uploadImage = require('../config/cloudinary.js');
const he = require('he');
const fetch = require('node-fetch');

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
      status: 'Hello!',
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

exports.test = async (req, res, next) => {
  res.redirect('http://localhost:5173');
};

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
      return res.json(currentUser);
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
      return res.json(currentUser);
    }
  }
};

//bug that sometimes occur. Target user deleted from currentUser's contact list, but currentUser not deleted from targetUser's contact list
exports.deleteContact = async (req, res, next) => {
  const [currentUser, targetUser] = await Promise.all([
    User.findById(req.user.user._id).populate('contacts'),
    User.findById(req.params.id).populate('contacts'),
  ]);

  // Remove targetUser from currentUser's contact list
  const contactIndex = currentUser.contacts.findIndex(
    (contact) => contact._id.toString() === req.params.id,
  );

  if (contactIndex > -1) {
    currentUser.contacts.splice(contactIndex, 1);

    // Remove currentUser from targetUser's contact list
    const currentUserIndex = targetUser.contacts.findIndex(
      (contact) => contact._id.toString() === currentUser._id.toString(),
    );

    if (currentUserIndex > -1) {
      targetUser.contacts.splice(currentUserIndex, 1);
    }

    await Promise.all([currentUser.save(), targetUser.save()]);
    return res.json(currentUser);
  }

  return res.json('Contact not found!');
};

exports.groupGET = async (req, res, next) => {
  const currentUser = await User.findById(req.user.user._id).populate(
    'contacts',
  );
  return res.json(currentUser);
};

exports.groupPOST = [
  body('groupName')
    .notEmpty()
    .trim()
    .escape()
    .withMessage('Group name required'),
  body('checkedUsers.*').escape(),

  async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.json(errors);
    }

    if (req.body.checkedUsers.length < 2)
      return res.json('Need more participants to create a group');

    const [currentUser, invitedParticipants] = await Promise.all([
      User.findById(req.user.user._id).populate('contacts'),
      User.find({
        username: { $in: req.body.checkedUsers },
      }),
    ]);

    const newGroup = new Group({
      groupName: req.body.groupName,
      participants: [currentUser, ...invitedParticipants],
      messages: [],
      profilePic: null,
    });

    await newGroup.save();

    for (const participant of invitedParticipants) {
      participant.groups.push(newGroup._id);
      await participant.save();
    }

    currentUser.groups.push(newGroup._id);
    await currentUser.save();
    return res.json(currentUser);
  },
];

exports.exitGroup = async (req, res, next) => {
  const [currentUser, group] = await Promise.all([
    User.findById(req.user.user._id),
    Group.findById(req.params.id),
  ]);
  const { participants } = group;
  const { groups } = currentUser;

  //remove currentUser from groups participants
  const updatedParticipants = participants.filter(
    (participant) => participant.toString() !== currentUser._id.toString(),
  );
  group.participants = updatedParticipants;

  if (group.participants.length < 1) {
    await group.deleteOne({ _id: req.params.id });
  } else {
    group.save();
  }

  //remove group from currentUser's users group
  const updatedGroups = groups.filter(
    (group) => group.toString() !== req.params.id,
  );
  currentUser.groups = updatedGroups;
  await currentUser.save();

  return res.json(currentUser);
};

exports.homeGET = async (req, res, next) => {
  const currentUserObjectId = new mongoose.Types.ObjectId(req.user.user._id);
  const currentUser = await User.findById(req.user.user._id)
    .populate({
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
    })
    .populate({
      path: 'groups',
      populate: {
        path: 'messages',
        options: {
          sort: { date: -1 },
        },
      },
    });
  return res.json(currentUser);
};

exports.idMessagesGET = async (req, res, next) => {
  const currentUser = await User.findById(req.user.user._id)
    .populate({
      path: 'groups',
      populate: [
        { path: 'participants' },
        { path: 'messages', populate: { path: 'from' } },
      ],
    })
    .populate({
      path: 'contacts',
      populate: [{ path: 'username' }, { path: 'messages' }],
    });

  //check if trying to access self
  if (req.params.id === currentUser._id.toString())
    return res.json('Cannot access to self');

  //check if targetId is a contact
  for (const contact of currentUser.contacts) {
    if (contact._id.toString() === req.params.id) {
      const targetMessages = contact.messages
        .sort((a, b) => b.date - a.date)
        .filter(
          (message) =>
            message.from.toString() === currentUser._id.toString() ||
            message.to.toString() === currentUser._id.toString(),
        );

      return res.json({
        username: contact.username,
        profilePic: contact.profilePic ? contact.profilePic : null,
        messages: targetMessages,
      });
    }
  }

  //check if targetId is a group
  for (const group of currentUser.groups) {
    if (group._id.toString() === req.params.id) {
      const targetMessages = group.messages.sort((a, b) => b.date - a.date);
      return res.json({
        groupName: group.groupName,
        participants: group.participants,
        profilePic: group.profilePic,
        messages: targetMessages,
      });
    }
  }
  return res.json('No messages found');
};

exports.idMessagesPOST = [
  body('newMessage').notEmpty().trim().escape().withMessage('Input required'),

  expressAsyncHandler(async (req, res, next) => {
    const [currentUser, recipient, group] = await Promise.all([
      User.findById(req.user.user._id).populate('messages'),
      User.findById(req.params.id).populate('messages'),
      Group.findById(req.params.id).populate('messages'),
    ]);

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.json(errors);
    } else {
      //check if sending message to self
      if (req.params.id === currentUser._id.toString())
        return res.json('Cannot send message to self');

      if (recipient && !group) {
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
      }

      if (!recipient && group) {
        const newGroupMessage = new GroupMessages({
          from: currentUser,
          to: group,
          content: he.decode(req.body.newMessage),
          date: new Date(),
        });

        currentUser.messages.push(newGroupMessage);
        group.messages.push(newGroupMessage);

        await Promise.all([
          newGroupMessage.save(),
          currentUser.save(),
          group.save(),
        ]);
      }

      return res.redirect(`/messages/${req.params.id}`);
    }
  }),
];

exports.editProfile = [
  body('newUsername').notEmpty().trim().escape().withMessage('Input required'),
  body('newStatus').notEmpty().trim().escape().withMessage('Input required'),

  expressAsyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.json(errors);
    } else {
      const currentUser = await User.findByIdAndUpdate(
        req.user.user._id,
        {
          username: req.body.newUsername,
          status: he.decode(req.body.newStatus),
          profilePic: req.file ? await uploadImage(req.file.path) : null,
        },
        { new: true },
      );
      return res.json(currentUser);
    }
  }),
];
