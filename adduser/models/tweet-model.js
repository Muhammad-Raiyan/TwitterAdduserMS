const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');

const tweetSchema = mongoose.Schema({
    content: {
        type: String,
        default: ''
    },

    contentType: {
        type: String,
        default: null
    }
});

tweetSchema.plugin(timestamps);
module.exports = mongoose.model('tweets', tweetSchema);
