require('dotenv').config();
require('./config/db');
require('./config/passport');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const indexRouter = require('./routes/index');

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: [
    //add deployed url here when in production
    'http://localhost:5173',
    'http://localhost:5174',
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
    saveUninitialized: false,
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(cors(corsOptions));
app.options('*', cors());

const io = new Server(server, {
  cors: {
    origin: [
      //add deployed url here when in production
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
    ],
  },
});

io.on('connection', (socket) => {
  console.log('User connected', socket.id);
  socket.on('joinRoom', (data) => {
    socket.join(data.room);
  });

  socket.on('sendMessage', (data) => {
    socket.in(data.room).emit('receiveMessage', data);
  });
});

app.use('/', indexRouter);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
module.exports = app;
