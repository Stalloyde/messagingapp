const User = require('../models/user');
const mongoose = require('mongoose');
const express = require('express');
const expressAsyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

exports.signupGET = async (req, res, next) => {
  res.send('GET - Sign Up page');
};

exports.signupPOST = [
  body('username').notEmpty().trim().escape().withMessage('Username required'),
  body('password').notEmpty().trim().escape().withMessage('Password required'),
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
          jsonErrorResponses.usernameError = `*${error.msg}`;
        } else if (error.path === 'password') {
          jsonErrorResponses.passwordError = `*${error.msg}`;
        } else {
          jsonErrorResponses.confirmPasswordError = `*${error.msg}`;
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

exports.loginGET = async (req, res, next) => {
  res.send('GET - Login page');
};

exports.loginPOST = async (req, res, next) => {
  res.send('POST - Login page');
};

exports.homeGET = async (req, res, next) => {
  res.send(
    'GET - Home Page. Get all contacts and most recent message. Should be authorized to access',
  );
};

exports.contactRequestsGET = async (req, res, next) => {
  res.send('GET - Page to add contacts. Should be authorized to access');
};

exports.contactRequestsPOST = async (req, res, next) => {
  res.send(
    'POST - Search for username in the input. Should be authorized to access',
  );
};

//need a controller to handle sending contact request.. how to do?

exports.idMessagesGET = async (req, res, next) => {
  res.send('GET messages from userId. Should be authorized to access');
};

exports.idMessagesPOST = async (req, res, next) => {
  res.send('POST messages to userId. Should be authorized to access');
};
