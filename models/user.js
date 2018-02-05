// /**
//  * Created by zhuti on 2017/5/13.
//  */
'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const status_enum = {values: ['online', 'offline']};
const gender_enum = {values: ['male', 'female', 'unknown']};
const userschema = new Schema({
    uname: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    ureal_name: String,
    birthday: Date,
    city: String,
    avatar: Buffer,
    status: {type: String, enum: status_enum},
    gender: {type: String, enum: gender_enum, required: true, default: 'unknown'},
    device_id: {type: String, required: true}
});

userschema.methods = {};

/*
 * Created by zhuti on 2017/5/25.
 * Check email is not used before save()
 */
userschema.path('email').validate(function (email, fn) {
    const User = mongoose.model('User');
    if (this.isNew || this.isModified('email')) {
        User.find({email: email}).exec(function (err, users) {
            fn(!err && users.length === 0);
        });
    } else fn(true);
}, 'Used Email!');

/*
 * Created by zhuti on 2017/5/25.
 * Check uname is not used before save()
 */
userschema.path('uname').validate(function (uname, fn) {
    const User = mongoose.model('User');
    if (this.isNew || this.isModified('uname')) {
        User.find({uname: uname}).exec(function (err, users) {
            fn(!err && users.length === 0);
        });
    } else fn(true);
}, 'Used Uname!');


userschema.statics = {
    /**
     * Update a user document
     * @param condition query condition
     * @param attribute new attribute values to update
     */
    update_user: function (condition, attribute) {
        return this.update(condition, attribute);
    },

    /**
     * Add a user document
     * @param someone the user instance to be added
     */
    add_user: function (someone) {
        if (someone.uname && someone.email && someone.password && someone.device_id) {
            return someone.save();
        }
        else {
            throw new Error("Missing uname, email or password, or request from an illegal device");
        }
    },

    /**
     * Query for one single user
     * @param attribute query condition
     * @param separator separator used for concatenating the reference of the possible avatar
     * @return {Promise} a user document if found. Otherwise null
     */
    get_user: function (attribute, separator) {
        return this.findOne(attribute).lean().then(function (user) {
            if (user != null && user.avatar != null) {
                delete user['avatar'];
                user['avatar'] = 'avatar' + separator + user._id;
            }
            return user;
        });
    },
    /**
     * Delete user given user ID and password
     * @param uid user ID
     * @return {Promise} the deleted user document if successfully deleted. Otherwise null
     */
    delete_user: function (uid) {
        return this.findOneAndRemove({_id: uid}).exec();
    },
    /**
     * Download the avatar of the given user
     * @param uid user ID
     * @return {Promise}
     */
    download_avatar: function (uid) {
        return this.findById(uid, 'avatar').lean().exec();
    },
    /**
     * Search for users whose user names contain the keyword
     * @param keyword
     * @param separator separator used for concatenating the reference of the possible avatar
     * @return {Promise} a list of candidate users
     */
    search_uname: function (keyword, separator) {
        return this.find({uname: new RegExp(keyword, 'i')}, 'uname ureal_name avatar').lean().then(function (users) {
            if (users == null || users.length === 0) {
                return users;
            }
            for (let i in users) {
                if (users[i].avatar == null) {
                    continue;
                }
                users[i]['avatar_ref'] = 'avatar' + separator + users[i]._id;
            }
            return users;
        })
    },
    /**
     * Search for users whose user real names contain the keyword
     * @param keyword
     * @param separator separator used for concatenating the reference of the possible avatar
     * @return {Promise} a list of candidate users
     */
    search_ureal_name: function (keyword, separator) {
        return this.find({ureal_name: new RegExp(keyword, 'i')}, 'uname ureal_name avatar').lean().then(function (users) {
            if (users == null || users.length === 0) {
                return users;
            }
            for (let i in users) {
                if (users[i].avatar == null) {
                    continue;
                }
                users[i]['avatar_ref'] = 'avatar' + separator + users[i]._id;
            }
            return users;
        })
    }
};


module.exports = mongoose.model('User', userschema);