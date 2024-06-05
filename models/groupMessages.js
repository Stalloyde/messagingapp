const mongoose = require('mongoose');
const { DateTime } = require('luxon');

const { Schema } = mongoose;

const groupMessagesSchema = new Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  content: { type: String, required: true },
  date: { type: Date, required: true },
});

groupMessagesSchema.virtual('messageDateFormatted').get(function () {
  return DateTime.fromJSDate(this.date).toLocaleString(DateTime.TIME_SIMPLE);
});

module.exports = mongoose.model('group-messages', groupMessagesSchema);
