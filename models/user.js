const mongoose = require('mongoose');
const { DateTime } = require('luxon');

const { Schema } = mongoose;

const userSchema = new Schema({
  username: { type: String, required: true },
  password: { type: String, required: true, select: false },
  status: { type: String },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  profilePic: { type: Object },
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  contactsRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

userSchema.virtual('postDateFormatted').get(function () {
  return DateTime.fromJSDate(this.date).toLocaleString(DateTime.TIME_SIMPLE);
});

module.exports = mongoose.model('User', userSchema);
