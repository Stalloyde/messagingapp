require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
}).$extends({
  result: {
    user: {
      messages: {
        needs: { messagesIn: true, messagesOut: true },
        compute(user) {
          const allMessages = [...user.messagesIn, ...user.messagesOut];
          return allMessages.sort((a, b) => b.date - a.date);
        },
      },
    },
  },
});
const passport = require('passport');
const jwt = require('jsonwebtoken');
const expressAsyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const uploadImage = require('../config/cloudinary.js');
const he = require('he');

exports.signupGET = async (req, res, next) => {
  return res.json({ message: 'GET - Sign Up page' });
};

exports.signupPOST = [
  body('username').trim().notEmpty().escape().withMessage('*Username required'),
  body('password').trim().notEmpty().escape().withMessage('*Password required'),
  body('confirmPassword')
    .trim()
    .notEmpty()
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

    let newUser = {
      username: req.body.username,
      password: req.body.password,
      status: 'Hello!',
    };

    try {
      const { username } = newUser;
      const checkDuplicate = await prisma.user.findUnique({
        where: { username: username },
      });

      if (checkDuplicate) {
        jsonErrorResponses.usernameError = `Username is taken.`;
        return res.json(jsonErrorResponses);
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      newUser.password = hashedPassword;
      await prisma.user.create({ data: newUser });

      return res.json('Sign up successful!');
    } catch (err) {
      return next(err);
    }
  }),
];

exports.loginPOST = [
  body('username').trim().notEmpty().escape().withMessage('*Username required'),
  body('password').trim().notEmpty().escape().withMessage('*Password required'),

  expressAsyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    const jsonErrorResponses = {
      passwordError: null,
      usernameError: null,
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

    const user = await prisma.user.findUnique({
      where: { username: req.body.username },
      select: { id: true, username: true, password: true },
    });

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
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.user.id },
    include: {
      contactsRequestsFrom: { include: { from: true } },
      contactsRequestsTo: { include: { to: true } },
      contacts: true,
    },
  });
  return res.json(currentUser);
};

exports.searchUsernamePOST = [
  body('username').trim().notEmpty().escape().withMessage('*Username required'),

  expressAsyncHandler(async (req, res, next) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.user.id },
      include: {
        contactsRequestsFrom: true,
        contacts: true,
        contactsRequestsTo: true,
      },
    });

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

    const searchResult = await prisma.user.findUnique({
      where: { username: username },
      include: {
        contactsRequestsFrom: true,
        contactsRequestsTo: true,
        contacts: true,
      },
    });

    //check if username exists
    if (!searchResult) {
      jsonErrorResponses.usernameError = 'Username does not exist';
      return res.json(jsonErrorResponses);
    }

    //check if a request for connection has already been made to username
    const contactsRequestTo = currentUser.contactsRequestsTo;
    const requestSent = contactsRequestTo.some(
      (result) => result.userIdTo === searchResult.id,
    );

    if (requestSent) {
      jsonErrorResponses.usernameError = 'Request has been made to username';
      return res.json(jsonErrorResponses);
    }

    //check if request has been received by username and pending approval
    const contactsRequestFrom = currentUser.contactsRequestsFrom;
    const requestReceived = contactsRequestFrom.some(
      (result) => result.userIdFrom === searchResult.id,
    );

    if (requestReceived) {
      jsonErrorResponses.usernameError =
        'Request from username is pending your approval';
      return res.json(jsonErrorResponses);
    }

    //check if username is already a contact
    const contacts = currentUser.contacts;
    const requestIsContact = contacts.some(
      (result) => result.id === searchResult.id,
    );

    if (requestIsContact) {
      jsonErrorResponses.usernameError = 'Username is already a contact';
      return res.json(jsonErrorResponses);
    }

    return res.json([searchResult]);
  }),
];

exports.sendContactRequestPOST = async (req, res, next) => {
  const getCurrentUser = prisma.user.findUnique({
    where: { id: req.user.user.id },
    include: {
      contactsRequestsFrom: true,
      contactsRequestsTo: true,
      contacts: true,
    },
  });

  const getTargetUser = prisma.user.findUnique({
    where: { id: Number(req.params.id) },
    include: { contactsRequestsFrom: true, contactsRequestsTo: true },
  });

  const [currentUser, targetUser] = await prisma.$transaction([
    getCurrentUser,
    getTargetUser,
  ]);

  const { contactsRequestsTo } = currentUser;

  //check if request has already been sent
  for (const request of contactsRequestsTo) {
    if (request.userIdTo === targetUser.id)
      return res.json('Request has already been made');
  }

  //check if already a contact
  for (const contacts of currentUser.contacts) {
    if (contacts.id.toString() === Number(req.params.id))
      return res.json('User is already in your contacts list.');
  }

  //check if requesting to self
  if (currentUser.id.toString() === Number(req.params.id))
    return res.json('Cannot send request to yourself');

  await prisma.contactsRequests.create({
    data: {
      userIdFrom: currentUser.id,
      userIdTo: targetUser.id,
    },
  });

  return res.json(targetUser);
};

exports.handleRequestsPUT = [
  body('action')
    .trim()
    .notEmpty()
    .isAlpha()
    .escape()
    .withMessage('Action required'),
  body('contactsRequestsId')
    .trim()
    .notEmpty()
    .escape()
    .withMessage('contactsRequestsId required'),

  expressAsyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    const jsonErrorResponses = {
      error: null,
    };

    if (!errors.isEmpty()) {
      jsonErrorResponses.error = errors.msg;
      return res.json(jsonErrorResponses);
    }

    const currentUserId = req.user.user.id;

    const getCurrentUser = prisma.user.findUnique({
      where: { id: currentUserId },
      include: {
        contactsRequestsFrom: true,
        contactsRequestsTo: true,
        contacts: true,
      },
    });

    const getRequestingUser = prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        contactsRequestsFrom: true,
        contactsRequestsTo: true,
        contacts: true,
      },
    });

    const [currentUser, requestingUser] = await prisma.$transaction([
      getCurrentUser,
      getRequestingUser,
    ]);

    const deleteTargetContactsRequests = prisma.contactsRequests.delete({
      where: { id: Number(req.body.contactsRequestsId) },
    });

    const updateCurrentUserApprove = prisma.user.update({
      where: { id: currentUser.id },
      data: {
        contacts: { connect: { id: requestingUser.id } },
      },
    });

    const updateRequestingUserApprove = prisma.user.update({
      where: { id: requestingUser.id },
      data: {
        contacts: { connect: { id: currentUser.id } },
      },
    });

    const getUpdatedCurrentUser = prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        contactsRequestsFrom: { include: { from: true } },
        contactsRequestsTo: { include: { to: true } },
        contacts: true,
      },
    });

    if (req.body.action === 'approve') {
      const results = await prisma.$transaction([
        updateCurrentUserApprove,
        updateRequestingUserApprove,
        deleteTargetContactsRequests,
        getUpdatedCurrentUser,
      ]);

      const updatedCurrentUser = results[3];
      return res.json(updatedCurrentUser);
    } else {
      const results = await prisma.$transaction([
        deleteTargetContactsRequests,
        getUpdatedCurrentUser,
      ]);
      const updatedCurrentUser = results[1];
      return res.json(updatedCurrentUser);
    }
  }),
];

exports.deleteContact = async (req, res, next) => {
  const getCurrentUser = prisma.user.findUnique({
    where: { id: req.user.user.id },
    include: { contacts: true },
  });

  const getTargetUser = prisma.user.findUnique({
    where: { id: Number(req.params.id) },
    include: { contacts: true },
  });

  const [currentUser, targetUser] = await prisma.$transaction([
    getCurrentUser,
    getTargetUser,
  ]);

  const contactIndex = currentUser.contacts.findIndex(
    (contact) => contact.id === Number(req.params.id),
  );

  if (contactIndex > -1) {
    // Remove targetUser from currentUser's contact list
    const [contactToDeleteInCurrentUser] = currentUser.contacts.splice(
      contactIndex,
      1,
    );

    const updateContactsCurrentUser = prisma.user.update({
      where: { id: currentUser.id },
      data: {
        contacts: { disconnect: { id: contactToDeleteInCurrentUser.id } },
      },
    });

    // Remove currentUser from targetUser's contact list
    const currentUserIndex = targetUser.contacts.findIndex(
      (contact) => contact.id === currentUser.id,
    );

    const [contactToDeleteInTargetUser] = targetUser.contacts.splice(
      currentUserIndex,
      1,
    );

    const updateContactsTargetUser = prisma.user.update({
      where: { id: targetUser.id },
      data: {
        contacts: { disconnect: { id: contactToDeleteInTargetUser.id } },
      },
    });

    await prisma.$transaction([
      updateContactsCurrentUser,
      updateContactsTargetUser,
    ]);

    return res.json(currentUser);
  }
  return res.json('Contact not found!');
};

exports.groupGET = async (req, res, next) => {
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.user.id },
    include: { contacts: true },
  });
  return res.json(currentUser);
};

exports.groupPOST = [
  body('groupName')
    .trim()
    .notEmpty()
    .escape()
    .withMessage('Group name cannot be empty or only empty spaces'),
  body('checkedUsers.*').escape(),

  async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorsArray = errors.array();
      return res.json({ error: errorsArray[0].msg });
    }

    if (req.body.checkedUsers.length < 2)
      return res.json({ error: 'Need more participants to create a group' });

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.user.id },
    });

    const checkedContacts = await prisma.user.findMany({
      where: { username: { in: req.body.checkedUsers } },
    });

    const groupParticipants = [{ id: currentUser.id }];

    checkedContacts.forEach((participant) =>
      groupParticipants.push({ id: participant.id }),
    );

    await prisma.group.create({
      data: {
        groupName: req.body.groupName,
        participants: {
          connect: groupParticipants,
        },
      },
    });

    const updatedCurrentUser = await prisma.user.findUnique({
      where: { id: req.user.user.id },
      include: {
        contactsRequestsFrom: true,
        contactsRequestsTo: true,
        contacts: { include: { messagesIn: true, messagesOut: true } },
        groups: { include: { messages: { orderBy: { date: 'desc' } } } },
      },
    });

    return res.json(updatedCurrentUser);
  },
];

exports.exitGroup = async (req, res, next) => {
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.user.id },
    include: { groups: true },
  });

  const targetGroupId = req.params.id;

  //remove currentUser from groups participants
  await prisma.group.update({
    where: { id: targetGroupId },
    data: { participants: { disconnect: { id: currentUser.id } } },
  });

  const updatedGroup = await prisma.group.findUnique({
    where: { id: targetGroupId },
    include: { participants: true },
  });

  const groupIsEmpty = updatedGroup.participants.length < 1;

  const latestCurrentUser = await prisma.user.findUnique({
    where: { id: req.user.user.id },
    include: { groups: true },
  });

  if (groupIsEmpty) {
    await prisma.group.delete({
      where: { id: targetGroupId },
    });
    return res.json(latestCurrentUser);
  }

  return res.json(latestCurrentUser);
};

exports.homeGET = async (req, res, next) => {
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.user.id },
    include: {
      contactsRequestsFrom: true,
      contactsRequestsTo: true,
      contacts: {
        include: {
          messagesIn: { orderBy: { date: 'desc' } },
          messagesOut: { orderBy: { date: 'desc' } },
        },
      },
      groups: {
        include: { messages: { orderBy: { date: 'desc' } } },
      },
    },
  });

  for (const contact of currentUser.contacts) {
    let filteredMessages = [];

    for (const msg of contact.messages) {
      if (
        (msg.userIdFrom === contact.id && msg.userIdTo === req.user.user.id) ||
        (msg.userIdFrom === req.user.user.id && msg.userIdTo === contact.id)
      ) {
        filteredMessages.push(msg);
      }
    }

    filteredMessages.sort((a, b) => b.date - a.date);
    contact.messages = filteredMessages;
  }

  return res.json(currentUser);
};

exports.idMessagesGET = async (req, res, next) => {
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.user.id },
    include: {
      contacts: { include: { messagesIn: true, messagesOut: true } },
      groups: {
        include: { participants: true, messages: { include: { from: true } } },
      },
    },
  });

  //check if trying to access self
  const targetId = Number(req.params.id);
  if (targetId === currentUser.id)
    return res.json({ error: 'Cannot access to self' });

  //check if targetId is a contact
  for (const contact of currentUser.contacts) {
    if (contact.id === targetId) {
      const targetMessages = contact.messages
        .sort((a, b) => b.date - a.date)
        .filter(
          (message) =>
            message.userIdFrom === currentUser.id ||
            message.userIdTo === currentUser.id,
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
    if (group.id === req.params.id.toString()) {
      const targetMessages = group.messages.sort((a, b) => b.date - a.date);
      return res.json({
        groupName: group.groupName,
        participants: group.participants,
        profilePic: group.profilePic,
        messages: targetMessages,
      });
    }
  }
  return res.json({ error: 'No messages found' });
};

exports.idMessagesPOST = [
  body('newMessage').trim().notEmpty().escape().withMessage('Input required'),

  expressAsyncHandler(async (req, res, next) => {
    const currentUserId = Number(req.user.user.id);
    const recipientId = Number(req.params.id);

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    const group = await prisma.group.findUnique({
      where: { id: req.params.id.toString() },
    });

    let recipient;
    if (recipientId) {
      recipient = await prisma.user.findUnique({
        where: { id: recipientId },
      });
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.json(errors);
    } else {
      //check if sending message to self
      if (recipient === currentUser.id)
        return res.json('Cannot send message to self');

      if (recipient && !group) {
        await prisma.message.create({
          data: {
            userIdFrom: currentUser.id,
            userIdTo: recipient.id,
            content: he.decode(req.body.newMessage),
          },
        });
      }

      if (!recipient && group) {
        await prisma.groupMessages.create({
          data: {
            userIdFrom: currentUser.id,
            groupIdTo: group.id,
            content: he.decode(req.body.newMessage),
          },
        });
      }

      return res.redirect(`/messages/${req.params.id}`);
    }
  }),
];

exports.editProfile = [
  body('newUsername').trim().notEmpty().escape().withMessage('Input required'),
  body('newStatus').trim().notEmpty().escape().withMessage('Input required'),

  expressAsyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    const pic = req.file ? await uploadImage(req.file.path) : null;
    if (!errors.isEmpty()) {
      return res.json(errors);
    } else {
      const updatedUser = await prisma.user.update({
        where: { id: req.user.user.id },
        data: {
          username: req.body.newUsername,
          status: he.decode(req.body.newStatus),
          profilePic: pic ? pic.url : null,
        },
      });
      return res.json(updatedUser);
    }
  }),
];
