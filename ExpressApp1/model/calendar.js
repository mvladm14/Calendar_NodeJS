var mongoose = require('mongoose');

var eventSchema = new mongoose.Schema({
    eventID : Number,
    name : String,
    description: String,
    date : Date,
    priority: String,
    duration : Number
});

var calendarSchema = new mongoose.Schema({
    calendarID : Number,
    name : String,
    description: String,
    date : Date,
    events : [eventSchema] 
});


var Event = mongoose.model('Event', eventSchema);
var Calendar = mongoose.model('Calendar', calendarSchema);

// make this available to our users in our Node applications
module.exports = Event;
module.exports = Calendar;

