var mongoose = require('mongoose');

var calendarSchema = new mongoose.Schema({
    calendarID : Number,
    name : String,
    description: String,
    date : Date,
    events : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }]
});

// the schema is useless so far
// we need to create a model using it
var Calendar = mongoose.model('Calendar', calendarSchema);

// make this available to our users in our Node applications
module.exports = Calendar;