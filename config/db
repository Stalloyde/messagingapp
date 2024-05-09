require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const devConnectionString = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@${process.env.CLUSTER}.uqtjxjp.mongodb.net/${process.env.COLLECTION}?retryWrites=true&w=majority`;
const mongoDB = process.env.MONGODB_URI || devConnectionString;

async function main() {
  console.log('Connecting to mongoDB');
  await mongoose.connect(mongoDB);
}

main()
  .then(console.log('Connected to mongoDB'))
  .catch((err) => console.log(err));

module.exports = mongoose.connection;
