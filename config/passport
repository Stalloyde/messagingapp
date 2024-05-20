require('dotenv').config();
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const User = require('../models/user');

const options = {};
options.secretOrKey = process.env.SECRET;
options.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();

const auth = async (jwtPayload, done) => {
  console.log('Auth middleware is running');
  try {
    const user = await User.findOne({ id: jwtPayload.sub });

    if (!user) {
      return done(null, false);
    }
    return done(null, jwtPayload);
  } catch (err) {
    return done(err, false);
  }
};

const strategy = new JwtStrategy(options, auth);

passport.use(strategy);
