/**
 * Created by zhuti on 2017/5/15.
 */
'use strict';
const {wrap: async} = require('co');
require('../models/user');
require('../models/comment');
require('../models/user_position');
require('../models/rate');
require('../models/user_location');
require('../models/user_comment');
require('../models/checkin');
require('../models/friendship');

const querystring = require('querystring');
const request = require('request');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Comment = mongoose.model('Comment');
const User_Position = mongoose.model('User_Position');
const Rate = mongoose.model('Rate');
const User_Location = mongoose.model('User_Location');
const User_Comment = mongoose.model('User_Comment');
const Checkin = mongoose.model('Checkin');
const Friendship = mongoose.model('Friendship');


mongoose.Promise = global.Promise;
// let db = mongoose.connect('mongodb://localhost/golf');
let db = mongoose.connect('mongodb://golf:golf@cluster0-shard-00-00-frwtv.mongodb.net:27017,cluster0-shard-00-01-frwtv.mongodb.net:27017,cluster0-shard-00-02-frwtv.mongodb.net:27017/golf?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin');
/*
 Testsdata below
 Hints: _uid is changable, plz check ur own uid before using!!!
 */

let john = new User({
    uname: 'Johnny',
    email: 'john@example.com',
    password: 'weqweqwe',
    device_id: 'sdafasdfasdfsadf'
});

let jane = new User({
    uname: 'Jane',
    email: 'jane@example.com',
    password: 'whatever',
    device_id: 'sdafasdfasdfsadf'
});

let oscar = new User({
    uname: 'Oscar',
    email: 'oscar@example.com',
    password: 'wwwww',
    device_id: 'sdafasdfasdfsadf'
});




let johnscheckin1 = new Checkin({
    timestamp: new Date(),
    _uid: "591a0c72e1da4626a8bb9f49",
    _lid: "Hawayii"
});

let johnscheckin2 = new Checkin({
    timestamp: new Date(),
    _uid: "591a0c72e1da4626a8bb9f49",
    _lid: "Italy"
});

let johnscomment1 = new Comment({
    timestamp: new Date(),
    _uid: "591a0c72e1da4626a8bb9f49",
    text: "so hot",
    _lid: "Italy"
});

let johnscomment2 = new Comment({
    timestamp: new Date(),
    _uid: "591a0c72e1da4626a8bb9f49",
    text: "sun of beach",
    _lid: "Hawayii"
});

let johnscomment3 = new Comment({
    timestamp: new Date(),
    _uid: "591a0c72e1da4626a8bb9f49",
    text: "study",
    _lid: "darmstadt"
});

let johnsrate = new Rate({
    timestamp: new Date(),
    _uid: "591a0c72e1da4626a8bb9f49",
    rate: 100,
    _lid: "Hawayii"
});

let johnsposition = new User_Position({
    timestamp: new Date(),
    _uid: "591a0c72e1da4626a8bb9f49",
    position: {x: 100, y: 200}
});

// About user.js
// User.add_user(john);
// User.find({uname: 'Johnny'}, function (err, result) {
//     console.log("step1"+result);
//
// });
// User.update_user({uname: 'Johnny3'},{password:'hahaha4'});
// let test_save_user = async(function*(user) {
//     yield user.save();
// });
// let test_update_user = async(function*(query_conditions, update_values) {
//     let j = yield User.get_user(query_conditions);
//     console.log(j);
//     yield User.update_user(j, update_values);
// });
//test_save_user(john);
// test_update_user({uname: 'Johnny'}, {password: 'hahaha5'});
// User.delete_user("59183092f8d60912346b4e46");

// About checkin.js
// Checkin.add_checkin(johnscheckin1);
// Checkin.add_checkin(johnscheckin2);
// Checkin.get_checkin({_uid : "591a0c72e1da4626a8bb9f49"}).exec(function(err, res) {console.log(res);});

//About comment.js
// Comment.add_comment(johnscomment1);
// Comment.add_comment(johnscomment2);
// Comment.add_comment(johnscomment3);
// Comment.list_comments({_uid : "591a0c72e1da4626a8bb9f49"}).exec(function(err, res) {console.log(res);});
// Comment.delete_comment({_lid : 'Hawayii'});

//About rate.js
// Rate.add_rate(johnsrate);
// Rate.get_rate({_uid: "591a0c72e1da4626a8bb9f49", _lid : 'Hawayii'}).exec(function(err, res) {console.log(res);});
// Rate.update_rate({_uid: "591a0c72e1da4626a8bb9f49", _lid : 'Hawayii'},{rate: 85});

//About user_position.js
// User_Position.add_userposition(johnsposition);
// User_Position.get_userposition({_uid: "591a0c72e1da4626a8bb9f49"}).exec(function(err, res) {console.log(res);});

// yield User.add_user(john);
// yield User.add_user(jane);
// yield User.add_user(oscar);

//About friendship.js
// var co = require('co')
// co(function *() {
//     console.log("who are there?:")
//     yield User.find(function(err,res){console.log(res)});
//     yield Friendship.remove();
//     console.log("no relationship:")
//     yield Friendship.find(function(err,res){console.log(res)});
//
//     let jo = yield User.get_user({uname : 'Johnny'})
//     let ja = yield User.get_user({uname : 'Jane'})
//     let os = yield User.get_user({uname : 'Oscar'})
//
//     let johnsfriendship = new Friendship({
//         follower_id : jo,
//         followed_id : ja
//     });
//     let oscarsfriendship = new Friendship({
//         follower_id : os,
//         followed_id : jo
//     });
//     console.log("john is falling in love with jane")
//     yield Friendship.add_followship(johnsfriendship);
//     console.log("but oscar is falling in love with john")
//     yield Friendship.add_followship(oscarsfriendship);
//     yield Friendship.find(function(err,res){console.log(res)});
//     console.log("one day oscar decied to seperate with john")
//     yield Friendship.delete_followship(oscarsfriendship)
//     yield Friendship.find(function(err,res){console.log(res)});
//     console.log("and jane suddenly realize, she is loving oscar")
//     let janesnewfriendship = new Friendship({
//         follower_id : ja,
//         followed_id : os
//     });
//     yield Friendship.add_followship(janesnewfriendship);
//     yield Friendship.find(function(err,res){console.log(res)});
//     console.log("who loves jane?:")
//     let sb1 = yield Friendship.get_followed(ja)
//     console.log(sb1)
//     console.log("jane loves who?:")
//     let sb2 = yield Friendship.get_follower(ja)
//     console.log(sb2)
// });



//About user controllers
// User.find(function(err,res){console.log(res)});

// var querystring = require('querystring');
// var myJSONObject = {
//         uname: 'Johnny',
//         email: 'john@example.com',
//         password: 'weqweqwe',
//         device_id: 'sdafasdfasdfsadf'
// };
//
// request({
//     url: "http://localhost:3000/user/register",
//     method: "POST",
//     json: true,
//     body: myJSONObject
// }, function (error, response, body){
//     console.log(body);
// });
// var myJSONObject = {device_id: '000000000000000'};
// request({
//     url: "http://localhost:3000/user/logout/:592a77fb9e7c898df8822028",
//     method: "POST",
//     json: true,
//     body: myJSONObject
// }, function (error, response, body){
//     console.log(body);
// });
// User.find(function(err,res){console.log(res)});
// });
// var myJSONObject = {orig_password: 'weqweqwe',new_password: 'it is new!'};
// request({
//     url: "http://localhost:3000/user/password/592814aab17db81700c86b94",
//     method: "POST",
//     json: true,
//     body: myJSONObject
// }, function (error, response, body){
//     console.log(body);
// });
//
// User.find(function(err,res){console.log(res)});

// var myJSONObject = {uname: 'John',email: 'john@163.com'};
// request({
//     url: "http://localhost:3000/user/592814aab17db81700c86b94",
//     method: "POST",
//     json: true,
//     body: myJSONObject
// }, function (error, response, body){
//     console.log(body);
// });
//
// User.find(function(err,res){console.log(res)});

// var myJSONObject = {email: 'john@163.com',password: 'it is new!', device_id: 'sdafasdfasdfsadf'};
// request({
//     url: "http://localhost:3000/user/login",
//     method: "POST",
//     json: true,
//     body: myJSONObject
// }, function (error, response, body){
//     // console.log(body);
// });

// User.find(function(err,res){console.log(res)});
//
// var myJSONobject = {paginator: 1,page_num : 3};
//
// request({
//     url: "http://localhost:3000/user/comments/591a0c72e1da4626a8bb9f49?page=1&count=2",
//     method: "GET",
// }, function (error, response, body){
//     console.log(body);
// });


// var myJSONobject = {follower_id: '592a77fb9e7c898df8822029',followed_id:'592a77fb9e7c898df8822028'};
// request({
//     url: "http://localhost:3000/user/follow",
//     method: "POST",,
//     json: true,
//     body:  myJSONobject
// }, function (error, response, body){
//     console.log(body);
// });
// Friendship.find(function(err,res){console.log(res);});
// User.get_user({_id : myJSONobject.followed_id}).exec(function(err,res){console.log(res)});


// request({
//     url: "http://localhost:3000/user/592a77fb9e7c898df8822028/follower",
//     method: "GET"
// }, function (error, response, body){
//     console.log(body);
// });

//test user add comment to a location
// var myJSONObject = {
//         timestamp: new Date(),
//         text: 'pretty good bier',
//         _lid: "asdfghjkl",
//         _uid:'59273858b26aba0019c1cd3e'
// };
// request({
//     url: "http://localhost:3000/user/addcomment",
//     method: "POST",
//     json: true,
//     body: myJSONObject
// }, function (error, response, body){
//     console.log(body);
// });


// //test user delete a comment in a location
// var myJSONObject = {
//         _id:'5986b2c3bea9b71dc879b857'
// };
//
// request({
//     url: "http://localhost:3000/user/deletecomment",
//     method: "POST",
//     json: true,
//     body: myJSONObject
// }, function (error, response, body){
//     console.log(body);
// });

// //test get location comments
// request({
//     url: "http://localhost:3000/user/usercomments/591a0c72e1da4626a8bb9f49?page=1&count=3",
//     method: "GET",
// }, function (error, response, body){
//     console.log(body);
// });

let oscarsrate = new Rate({
    timestamp: new Date(),
    _uid: "592a77fb9e7c898df8822029",
    rate: 5,
    _lid: "Hawayii"
});
Rate.add_rate(oscarsrate);



