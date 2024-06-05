const mongoose = require('mongoose');
const { DateTime } = require('luxon');

const { Schema } = mongoose;

const groupSchema = new Schema({
  groupName: { type: String, required: true },
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'group-messages' }],
  profilePic: { type: Object },
});

groupSchema.virtual('postDateFormatted').get(function () {
  return DateTime.fromJSDate(this.date).toLocaleString(DateTime.TIME_SIMPLE);
});

module.exports = mongoose.model('Group', groupSchema);
