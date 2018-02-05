/**
 * Created by zhuti on 2017/5/14.
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
/**
 * Checkin Schema
 */
const checkinschema = new Schema({
    timestamp: {type: Date, required: true}, //Timestamp
    _uid: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    _lid: {type: String, ref: 'Location', required: true}
});
const ObjectId = require('mongodb').ObjectID;

/**
 * Validation of uid
 */
checkinschema.path('_uid').validate(function (uid, fn) {
    let User = mongoose.model('User');
    if (this.isNew) {
        User.find({_id: uid}).exec(function (err, users) {
            fn(!err && users.length > 0);
        });
    } else fn(true);
}, 'User not existing!');

/**
 * Static methods of checkin schema
 * @type {{add_checkin: mongoose.Schema.statics.add_checkin, sort_checkins: mongoose.Schema.statics.sort_checkins, count_my_checkin_per_location: mongoose.Schema.statics.count_my_checkin_per_location, get_checkins_per_user: mongoose.Schema.statics.get_checkins_per_user, count_my_checkins: mongoose.Schema.statics.count_my_checkins, delete_user: mongoose.Schema.statics.delete_user}}
 */
checkinschema.statics = {

    /**
     * Add a checkin
     * @param new_checkin
     */
    add_checkin: function (new_checkin) {
        return new_checkin.save();
    },

    /**
     * Sort users checkins of the given location in desc order of checkin times
     * @param lid location ID
     * @param top_num top N users
     * @param separator separator for user avatar references
     * @return {Promise}
     */
    sort_checkins: function (lid, top_num, separator) {
        return this.aggregate().match({_lid: lid}).group({
            _id: "$_uid",
            times: {"$sum": 1},
        }).lookup({
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user"
        }).unwind("$user").sort({
            times: -1
        }).exec(function (err, user_checkins) {
            let top_checkins = user_checkins.slice(0, Math.min(user_checkins.length, top_num));
            for (let i in top_checkins) {
                top_checkins[i]['uname'] = top_checkins[i].user.uname;
                top_checkins[i]['uid'] = top_checkins[i]._id;
                if (top_checkins[i].user.ureal_name) {
                    top_checkins[i]['ureal_name'] = top_checkins[i].user.ureal_name;
                }
                if (top_checkins[i].user.avatar) {
                    top_checkins[i]['avatar'] = 'avatar' + separator + top_checkins[i].uid;
                }
                delete top_checkins[i].user;
                delete top_checkins[i]._id;
            }
            return top_checkins;
        });
    },
    /**
     * Count checkins of the given user at the given location
     * @param uid user ID
     * @param lid location ID
     */
    count_my_checkin_per_location: function (uid, lid) {
        return this.count({_uid: uid, _lid: lid}).exec();
    },
    /**
     * Get all checkins of the give user in desc order of timestamp
     * @param uid
     * @param pagination
     * @return {Promise}
     */
    get_checkins_per_user: function (uid, pagination) {
        return this.find({_uid: uid}, {_uid: 0}, pagination).lean().sort({_id: -1}).populate({
            path: '_lid',
            select: 'name address'
        }).exec();
    },
    /**
     * Count all checkins of the given user
     * @param uid user ID
     * @return {Promise}
     */
    count_my_checkins: function (uid) {
        return this.count({_uid: uid}).exec();
    },
    /**
     * Delete given user's checkins
     * @param uid user ID
     */
    delete_user: function (uid) {
        return this.remove({_uid: uid});
    }
};

module.exports = mongoose.model('Checkin', checkinschema);