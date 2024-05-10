require('dotenv').config();
require('./config/db');
require('./config/passport');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const cors = require('cors');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

const corsOptions = {
  origin: [
    //add deployed url here when in production
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  optionsSuccessStatus: 200,
};

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
  }),
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(cors(corsOptions));
app.options('*', cors());

app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;
