var mongoose = require('mongoose');
var calendarSchema = new mongoose.Schema({
    name: String,
    creation_date: { type: Date, default: Date.now },
    isActive: Boolean
});
mongoose.model('Calendar', calendarSchema);