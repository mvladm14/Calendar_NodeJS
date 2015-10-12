var express = require('express');
var router = express.Router();
var mongoose = require('mongoose'); //mongo connection
var bodyParser = require('body-parser'); //parses information from POST
var methodOverride = require('method-override'); //used to manipulate POST

router.use(bodyParser.urlencoded({ extended: true }));
router.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method;
        delete req.body._method;
        return method;
    }
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
}));

//build the REST operations at the base for calendars
//this will be accessible from http://127.0.0.1:3000/calendars if the default route for / is left unchanged
router.route('/')
    //GET all calendars
    .get(function (req, res, next) {
    //retrieve all calendars from Monogo
    mongoose.model('Calendar').find({}, function (err, calendars) {
        if (err) {
            return console.error(err);
        } else {
            res.json(calendars);
        }
    });
})

//POST a new calendar
.post(function (req, res) {
    // Get values from POST request. These can be done through forms or REST calls. These rely on the "name" attributes for forms
    var name = req.body.name;
    var description = req.body.description;
    //call the create function for our database
    mongoose.model('Calendar').create({
        name: name,
        description: description
    }, function (err, calendar) {
        if (err) {
            res.send("There was a problem adding the information to the database.");
        } else {
            //Blob has been created
            console.log('POST creating new calendar: ' + calendar);
            res.json(calendar);
        }
    });
});

// route middleware to validate :id
router.param('id', function (req, res, next, id) {
    console.log('validating ' + id + ' exists');
    //find the ID in the Database
    mongoose.model('Calendar').findById(id, function (err, calendar) {
        //if it isn't found, we are going to repond with 404
        if (err) {
            console.log(id + ' was not found');
            res.status(404);
            var err = new Error('Not Found');
            err.status = 404;
            res.json({ message : err.status + ' ' + err });
        //if it is found we continue on
        } else {
            //search through events table
            mongoose.model('Event').findById(id, function (err, calendar) {
                //if it isn't found, we are going to repond with 404
                if (err) {
                    console.log(id + ' was not found');
                    res.status(404);
                    var err = new Error('Not Found');
                    err.status = 404;
                    res.json({ message : err.status + ' ' + err });
                }
                else {
                    // once validation is done save the new item in the req
                    req.id = id;
                    // go to the next thing
                    next();
                }
            });
        }
    });
});

//GET Calendar by ID
router.route('/:id').get(function (req, res) {
    mongoose.model('Calendar').findById(req.id, function (err, calendar) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            console.log('GET Retrieving ID: ' + calendar._id);
            res.json(calendar);
        }
    });
})

.put(function (req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var name = req.body.name;
    var description = req.body.description;
    //find the calendar by ID
    mongoose.model('Calendar').findById(req.id, function (err, calendar) {
        //update it
        calendar.update({
            name: name,
            description: description
        }, function (err, calendarID) {
            if (err) {
                res.send("There was a problem updating the information to the database: " + err);
            } else {
                res.json(calendar);
            }
        });
    });
})

//DELETE a Calendar by ID
.delete(function (req, res) {
    //find blob by ID
    mongoose.model('Calendar').findById(req.id, function (err, calendar) {
        if (err) {
            return console.error(err);
        } else {
            //remove it from Mongo
            calendar.remove(function (err, calendar2) {
                if (err) {
                    return console.error(err);
                } else {
                    //Returning success messages saying it was deleted
                    console.log('DELETE removing ID: ' + calendar._id);
                    res.json({
                        message : 'deleted',
                        item : calendar2
                    });
                }
            });
        }
    });
});



//********************************EVENT PART *************************************************

router.route('/:id/events')

//GET events of a calendar
    .get(function (req, res) {
    mongoose.model('Calendar').findById(req.id, function (err, calendar) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the calendar
            console.log('GET Retrieving ID: ' + calendar._id);
            //format the date properly for the value to show correctly in our edit form
            
            var events = calendar.events;
            if (typeof req.query.location !== "undefined") {
                if (req.query.location.length > 0) {
                    console.log("searching by location " + req.query.location);
                    events = events.filter(function (el) {
                        return el.location === req.query.location;
                    });
                }
            }
            if (typeof req.query.startTime !== "undefined") {
                if (req.query.startTime.length > 0) {
                    
                    
                    var month = parseInt(req.query.startTime.substring(0, 2));
                    var day = parseInt(req.query.startTime.substring(3, 5));
                    var year = parseInt(req.query.startTime.substring(6, 10));
                    var date = new Date(year, month - 1, day);
                    
                    console.log("searching by startTime " + date);
                    
                    console.log("year = " + date.getYear() + " month = " + date.getMonth() + " day = " + date.getDay());
                    events = events.filter(function (el) {
                        return el.startTime.getYear() === date.getYear() &&
                                el.startTime.getMonth() === date.getMonth() &&
                                el.startTime.getDay() === date.getDay();
                    });
                }
            }
            res.json(events);
        }
    });
})

//POST: add a new event
    .post(function (req, res) {
    // Get values from POST request. These can be done through forms or REST calls. These rely on the "name" attributes for forms
    var name = req.body.name;
    var description = req.body.description;
    var location = req.body.location;
    var priority = req.body.priority;
    var endTime = req.body.endTime;
    var startTime = req.body.startTime;
    //call the create function for our database
    mongoose.model('Event').create({
        name: name,
        description: description,
        priority: priority,
        location: location,
        endTime: endTime,
        startTime: startTime
    }, function (err, event) {
        if (err) {
            res.send("There was a problem adding the information to the database.");
        } else {
            //Event has been created
            console.log('POST creating new event: ' + event);
            //finding the calendar to add the event at
            mongoose.model('Calendar').findById(req.id, function (err, calendar) {
                //update it
                console.log("Events" + calendar.events);
                calendar.events.push(event);
                calendar.update({
                    events: calendar.events
                }, function (err, calendarID) {
                    if (err) {
                        res.send("There was a problem updating the information to the database: " + err);
                    } else {
                        res.json(event);
                    }
                });
            });
        }
    });
});


router.route('/events/:id/')

//PUT: modify an event
.put(function (req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var name = req.body.name;
    var description = req.body.description;
    var location = req.body.location;
    var startTime = req.body.startTime;
    var endTime = req.body.endTime;
    var priority = req.body.priority;
    
    //TODO maybe search  through the calendars events
    mongoose.model('Event').findById(req.id, function (err, event) {
        //update it
        event.update({
            name: name,
            description: description,
            location: location,
            startTime: startTime,
            endTime: endTime,
            priority: priority
        }, function (err, eventID) {
            if (err) {
                res.send("There was a problem updating the information to the database: " + err);
            } else {
                mongoose.model('Calendar').findOneAndUpdate({ "events._id": req.id }, {
                    '$set': {
                        'events.$.name': name,
                        'events.$.description': description,
                        'events.$.location': location,
                        'events.$.startTime': startTime,
                        'events.$.endTime': endTime,
                        'events.$.priority': priority
                    }

                }, function (err, calendar) {
                    if (err) {
                        res.send("There was a problem updating the information to the database: " + err);
                    } else {
                        res.json(event);
                    }
                });
            }
        });
    });
})

//DELETE a Calendar's Event by ID
.delete(function (req, res) {
    //find blob by ID
    mongoose.model('Calendar').findOne({ "events._id": req.id }, function (err, calendar) {
        if (err) {
            return console.error(err);
        } else {
            //remove it from Mongo
            calendar.events.pull({ "_id": req.id });
            calendar.update({
                events: calendar.events
            }, function (err, calendarID) {
                if (err) {
                    res.send("There was a problem updating the information to the database: " + err);
                } else {
                    res.json({
                        message : 'deleted',
                        item : calendar
                    });
                }
            });
           
        }
    });
});


module.exports = router;