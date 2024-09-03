require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');

const options = {};
options.secretOrKey = process.env.SECRET;
options.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();

const auth = async (jwtPayload, done) => {
  console.log('Auth middleware is running');
  try {
    const user = await prisma.user.findUnique({
      where: { id: jwtPayload.user.id },
    });

    if (!user) {
      return done(null, false);
    }
    return done(null, jwtPayload);
  } catch (err) {
    return done(err, false);
  }
};

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

const strategy = new JwtStrategy(options, auth);

passport.use(strategy);
