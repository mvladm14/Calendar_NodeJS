var mongoose = require('mongoose');

var eventSchema = new mongoose.Schema({
    eventID : Number,
    name : String,
    description: String,
    date : Date,
    importance: String,
    duration : Number
});

mongoose.model('Event', eventSchema);