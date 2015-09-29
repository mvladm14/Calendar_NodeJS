
/**
 * Module dependencies.
 */

var express = require('express');
//var routes = require('./routes');
var http = require('http');
var path = require('path');

var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var db = require('./model/db');
var routes = require('./routes/index');
//var users = require('./routes/users');
var calendars = require('./routes/calendars');
var app = express();
app.use('/calendars', calendars);
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
//app.use(favicon(__dirname + '/public/favicon.ico'));

app.use(logger('dev'));
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//// development only
//if ('development' == app.get('env')) {
//    app.use(errorHandler());
//}

app.get('/', routes.index);
app.get('/about', routes.about);
app.get('/contact', routes.contact);
app.get('/calendar', routes.calendar);


// Add callback handler for home (/) route
app.get('/', function (req, res) {
    res.render('index', { title: 'Calendar' });
});

// Create http server by passing "app" to it:
http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});