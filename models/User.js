const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    services: {
        type: Array
    },
    widgets: {
        type: Array
    }
});

const User = mongoose.model('user', UserSchema);
module.exports = User;