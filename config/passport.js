require('dotenv').config();
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const GithubStrategy = require('passport-github2').Strategy;
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

const ghOptions = {
  clientID: process.env.GH_CLIENT_ID,
  clientSecret: process.env.GH_CLIENT_SECRET,
  callbackURL: process.env.GH_CALLBACK_URL,
};

const ghAuth = async function (accessToken, refreshToken, profile, done) {
  const user = await User.findOne({ username: profile.username });

  if (!user) {
    user = await User.create({
      username: profile.username,
    });
  }

  return done(null, user);
};

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

const strategy = new JwtStrategy(options, auth);
const githubStrategy = new GithubStrategy(ghOptions, ghAuth);

passport.use(strategy);
passport.use(githubStrategy);
