const fs = require('fs');
const express = require('express');
const path = require('path');
// const favicon = require('serve-favicon');
// const logger = require('morgan');
const log4js = require('log4js');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const models = path.join(__dirname, 'models');

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
// const db = mongoose.connect('mongodb://localhost');
const app = express();

fs.readdirSync(models)
    .filter(file => ~file.search(/^[^\.].*\.js$/))
    .forEach(file => require(path.join(models, file)));
//init db
connect()
    .on('error', console.log)
    .on('disconnected', connect);

// app.use(logger('dev'));
app.use(log4js.connectLogger(log4js.getLogger("http"), { level: 'auto' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', index);
app.use('/user', require('./routes/user'));
app.use('/location',require('./routes/location'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    // res.render('error');
    res.json({ error: err })
});

function connect() {
    let options = {server: {socketOptions: {keepAlive: 1}}};
    let db = process.env.MONGODB_CLOUD_URL || 'mongodb://localhost/golf';
    return mongoose.connect(db, options).connection;
}

module.exports = app;
