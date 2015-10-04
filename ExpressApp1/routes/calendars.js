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
            //respond to both HTML and JSON. JSON responses require 'Accept: application/json;' in the Request Header
            res.format({
                //HTML response will render the index.jade file in the views/blobs folder. We are also setting "blobs" to be an accessible variable in our jade view
                html: function () {
                    res.render('calendars/index', {
                        title: 'All my calendars',
                        "calendars": calendars
                    });
                },
                //JSON response will show all blobs in JSON format
                json: function () {
                    res.json(calendars);
               
                }
            });
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
        name : name,
        description : description
    }, function (err, calendar) {
        if (err) {
            res.send("There was a problem adding the information to the database.");
        } else {
            //Blob has been created
            console.log('POST creating new calendar: ' + calendar);
            res.format({
                //HTML response will set the location and redirect back to the home page. 
                //You could also create a 'success' page if that 's your thing
                html: function () {
                    // If it worked, set the header so the address bar doesn't still say /adduser
                    res.location("calendars");
                    // And forward to success page
                    res.redirect("/calendars");
                },
                //JSON response will show the newly created blob
                json: function () {
                    res.json(calendar);
                }
            });
        }
    })
});


/* GET New Calendar page. */
router.route('/new')
    .get(function (req, res) {
    res.render('calendars/new', { title: 'Add New Calendar' });
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
            res.format({
                html: function () {
                    next(err);
                },
                json: function () {
                    res.json({ message : err.status + ' ' + err });
                }
            });
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
                    res.format({
                        html: function () {
                            next(err);
                        },
                        json: function () {
                            res.json({ message : err.status + ' ' + err });
                        }
                    });
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
            res.format({
                html: function () {
                    res.render('calendars/show', {
                        "calendar" : calendar
                    });
                },
                json: function () {
                    res.json(calendar);
                }
            });
        }
    });
});

//GET Edit Calendar Page
router.get('/:id/edit', function (req, res) {
    //search for the calendar within Mongo
    mongoose.model('Calendar').findById(req.id, function (err, calendar) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the calendar
            console.log('GET Retrieving ID: ' + calendar._id);
            //format the date properly for the value to show correctly in our edit form
            res.format({
                //HTML response will render the 'edit.jade' template
                html: function () {
                    res.render('calendars/edit', {
                        title: 'Calendar' + calendar._id,
                        "calendar": calendar
                    });
                },
                //JSON response will return the JSON output
                json: function () {
                    res.json(calendar);
                }
            });
        }
    });
});

//PUT to update a Calendar by ID
router.put('/:id/edit', function (req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var name = req.body.name;
    var description = req.body.description;
    //find the calendar by ID
    mongoose.model('Calendar').findById(req.id, function (err, calendar) {
        //update it
        calendar.update({
            name : name,
            description : description
        }, function (err, calendarID) {
            if (err) {
                res.send("There was a problem updating the information to the database: " + err);
            } 
            else {
                //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
                res.format({
                    html: function () {
                        res.redirect("/calendars/" + calendar._id);
                    },
                    //JSON responds showing the updated values
                    json: function () {
                        res.json(calendar);
                    }
                });
            }
        })
    });
});

//DELETE a Calendar by ID
router.delete('/:id', function (req, res) {
    //find blob by ID
    mongoose.model('Calendar').findById(req.id, function (err, calendar) {
        if (err) {
            return console.error(err);
        } else {
            //remove it from Mongo
            calendar.remove(function (err, calendar) {
                if (err) {
                    return console.error(err);
                } else {
                    //Returning success messages saying it was deleted
                    console.log('DELETE removing ID: ' + calendar._id);
                    res.format({
                        //HTML returns us back to the main page, or you can create a success page
                        html: function () {
                            res.redirect("/calendars");
                        },
                        //JSON returns the item with the message that is has been deleted
                        json: function () {
                            res.json({
                                message : 'deleted',
                                item : calendar
                            });
                        }
                    });
                }
            });
        }
    });
});






//GET Add new Event to Calendar Page
router.get('/:id/events/new', function (req, res) {
    mongoose.model('Calendar').findById(req.id, function (err, calendar) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the calendar
            console.log('GET Retrieving ID: ' + calendar._id);
            //format the date properly for the value to show correctly in our edit form
            res.format({
                //HTML response will render the 'edit.jade' template
                html: function () {
                    res.render('calendars/events/new', {
                        title: 'Add New Event for calendar: ' + calendar._id,
                        "calendar": calendar
                    });
                },
                json: function () {
                    res.json(calendar);
                }

            });
        }
    });
});

//POST: add a new event
router.put('/:id/events/new', function (req, res) {
    // Get values from POST request. These can be done through forms or REST calls. These rely on the "name" attributes for forms
    var name = req.body.name;
    var description = req.body.description;
    var priority = req.body.priority;
    var endTime = req.body.endTime;
    var startTime = req.body.startTime;
    //call the create function for our database
    mongoose.model('Event').create({
        name : name,
        description : description,
        priority: priority,
        endTime : endTime,
        startTime : startTime
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
                        res.format({
                            //HTML response will set the location and redirect back to the home page. 
                            //You could also create a 'success' page if that 's your thing
                            html: function () {
                                // If it worked, set the header so the address bar doesn't still say /adduser
                                res.location("calendars");
                                // And forward to success page
                                res.redirect("/calendars");
                            },
                            //JSON response will show the newly created blob
                            json: function () {
                                res.json(event);
                            }
                        });
                    }
                });
            });
        }
        
    });

});



//GET Add new Event to Calendar Page
router.get('/events/:id/edit', function (req, res) {
    mongoose.model('Event').findById(req.id, function (err, event) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            //Return the calendar
            console.log('GET Retrieving ID: ' + event._id);
            //format the date properly for the value to show correctly in our edit form
            res.format({
                //HTML response will render the 'edit.jade' template
                html: function () {
                    res.render('calendars/events/edit', {
                        title: 'Edit  Event: ' + event.name,
                        "event": event
                    });
                },
                json: function () {
                    res.json(event);
                }

            });
        }
    });
});


router.put('/events/:id/edit', function (req, res) {
    // Get our REST or form values. These rely on the "name" attributes
    var name = req.body.name;
    var description = req.body.description;
    var startTime = req.body.startTime;
    var endTime = req.body.endTime;
    var priority = req.body.priority;
    
    //TODO maybe search  through the calendars events
    mongoose.model('Event').findById(req.id, function (err, event) {
        //update it
        event.update({
            name : name,
            description : description,
            startTime : startTime,
            endTime : endTime,
            priority : priority
        }, function (err, eventID) {
            if (err) {
                res.send("There was a problem updating the information to the database: " + err);
            } 
            else {
                mongoose.model('Calendar').findOneAndUpdate({ "events._id": req.id }, {
                    '$set': {
                        'events.$.name': name, 
                        'events.$.description': description,
                        'events.$.startTime': startTime,
                        'events.$.endTime': endTime,
                        'events.$.priority': priority
                    }
                    
                }, function (err, calendar) {
                    if (err) {
                        res.send("There was a problem updating the information to the database: " + err);
                    }
                    else {
                        //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
                        res.format({
                            html: function () {
                                res.redirect("/calendars/");
                            },
                            //JSON responds showing the updated values
                            json: function () {
                                res.json(event);
                            }
                        });
                    }

                });
            }
        })
    });
});

//DELETE a Calendar's Event by ID
router.delete('/events/:id', function (req, res) {
    //find blob by ID
    mongoose.model('Calendar').findOne({ "events._id": req.id }, function (err, calendar) {
        if (err) {
            return console.error(err);
        } else {
            //remove it from Mongo
            calendar.events.pull({ "_id": req.id });
            console.log("CE A MAI RAMAS" + calendar.events)
            calendar.update({
                events: calendar.events
            }, function (err, calendarID) {
                if (err) {
                    res.send("There was a problem updating the information to the database: " + err);
                } else {
                    //Returning success messages saying it was deleted
                    res.format({
                        //HTML returns us back to the main page, or you can create a success page
                        html: function () {
                            res.redirect("/calendars");
                        },
                        //JSON returns the item with the message that is has been deleted
                        json: function () {
                            res.json({
                                message : 'deleted',
                                item : calendar
                            });
                        }
                    });
                }
            });
           
        }
    });
});




module.exports = router;