var express = require('express');
var router = express.Router();
var mongoose = require('mongoose'); //mongo connection
var bodyParser = require('body-parser'); //parses information from POST
var methodOverride = require('method-override'); //used to manipulate POST
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

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

var firstCalendar;

router.route('/synchronize').get(function (req, res) {
    mongoose.model('Calendar').find({"name":"tttt"}, function (err, calendars) {
        if (err) {
            return console.error(err);
        } else {
            firstCalendar = calendars[0];
            readJSONCredentials();
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


/******** SYNCRHONIZE WITH GOOGLE CALENDAR   ********/

// Load client secrets from a local file.
function readJSONCredentials() {
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        // Authorize a client with the loaded credentials, then call the
        // Google Calendar API.
        authorize(JSON.parse(content), synchronizeEvents);
    });
}


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
    
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        console.log(code);
        rl.close();
        
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function synchronizeEvents(auth) {
    var calendar = google.calendar('v3');
    
    console.log("Synchronizing with: " + firstCalendar.name);
    
    //add google events to calendar from mongoDB
    calendar.events.list({
        auth: auth,
        calendarId: 'primary',
        timeMin: (new Date()).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var events = response.items;
        if (events.length == 0) {
            console.log('No upcoming events found.');
        } else {
            console.log('Upcoming 10 events:');
            for (var i = 0; i < events.length; i++) {
                var event = events[i];
                var start = event.start.dateTime || event.start.date;
                console.log('%s - %s', start, event.summary);
                
                mongoose.model('Event').create({
                    name: event.summary,
                    description: "from google calendar",
                    startTime: start
                }, function (err, eventMongoDB) {
                    if (err) {
                        console.log("There was a problem adding the information to the database.");
                    } else {
                        mongoose.model('Calendar').findById(firstCalendar._id, function (err, calendarFromMongoDB) {
                            var exists = false;
                            var calendarEvents = calendarFromMongoDB.events;
                            for (var j = 0; j < calendarEvents.length; j++) {
                                if (calendarEvents[j].name === eventMongoDB.name) {
                                    exists = true;
                                }
                            }
                            if (!exists) {
                                calendarFromMongoDB.events.push(eventMongoDB);
                                calendarFromMongoDB.update({
                                    events: calendarFromMongoDB.events
                                }, function (errUpdate, calendarID) {
                                    if (err) {
                                        console.log("There was a problem updating the information to the database: " + errUpdate);
                                    } else {
                                        console.log("Event added");
                                    }
                                });
                            } else {
                                console.log("Event already exists");
                            }
                        });
                    }
                }
                );
            }
        }
    });
    
    //add mongoDB events to google calendar
    mongoose.model('Calendar').findById(firstCalendar._id, function (err, calendarFromMongoDB) {
        
        var mongoEvents = calendarFromMongoDB.events;
        
        calendar.events.list({
            auth: auth,
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime'
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return;
            }
            var googleEvents = response.items;
            for (var i = 0; i < mongoEvents.length; i++) {
                var mongoEvent = mongoEvents[i];
                var exists = false;
                for (var j = 0; j < googleEvents.length; j++) {
                    var googleEvent = googleEvents[j];
                    if (mongoEvent.name === googleEvent.summary) {
                        exists = true;
                    }
                }
                
                if (!exists) {
                    var event = {
                        'summary': mongoEvent.name,
                        'location': mongoEvent.location,
                        'description': mongoEvent.description,
                        'start': {
                            'dateTime': mongoEvent.startTime,
                            'timeZone': 'America/Los_Angeles',
                        },
                        'end': {
                            'dateTime': mongoEvent.endTime,
                            'timeZone': 'America/Los_Angeles',
                        }
                    };
                    calendar.events.insert({
                        auth: auth,
                        calendarId: 'primary',
                        resource: event,
                    }, function (err, event) {
                        if (err) {
                            console.log('There was an error contacting the Calendar service: ' + err);
                            return;
                        }
                        console.log('Event %s created.', event.summary);
                        console.log(event.htmlLink);
                    });
                }
            }
        });
    });
}

module.exports = router;