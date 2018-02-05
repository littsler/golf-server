/**
 * Created by zhuti on 2017/5/14.
 */
const mongoose = require('mongoose');
var Schema = mongoose.Schema;
var rateschema = new Schema({
    timestamp: {type: Date, required: true},
    _uid: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    _lid: {type: String, ref: 'Location', required: true},
    rate: {type: Number, required: true}
});

rateschema.path('_uid').validate(function (uid, fn) {
    let User = mongoose.model('User');
    if (this.isNew) {
        User.find({_id: uid}).exec(function (err, users) {
            fn(!err && users.length > 0);
        });
    } else fn(true);
}, 'User not existing!');

rateschema.statics = {
    /**
     * Set a rating of the given user to the given location
     * @param uid user ID
     * @param lid location ID
     * @param rate_score
     * @param timestamp
     * @return {Query|*}
     */
    create_or_update_rate: function (uid, lid, rate_score, timestamp) {
        if (uid == null || lid == null || rate_score == null || timestamp == null) {
            throw new Error('Missing parameter(s)');
        }
        return this.findOneAndUpdate({_uid: uid, _lid: lid}, {rate: rate_score, timestamp: timestamp}, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        });
    },

    /**
     * Get 'my' rating of the given location
     * @param uid user ID
     * @param lid location ID
     * @returns {Promise|Number} a rate score if any. Otherwise null.
     */
    get_my_rate: function (uid, lid) {
        if (uid == null || lid == null) {
            throw new Error('Missing parameter(s)');
        }
        return this.findOne({_uid: uid, _lid: lid}, 'rate', function (err, res) {
            if (err) {
                return err;
            }
        });
    },

    /**
     * Get average rating of the give location
     * @param lid location ID
     * @returns {Promise|Number} the average rate score if any. Otherwise null (this location is not yet rated).
     */
    get_avg_rate: function (lid) {
        return this.aggregate().match({
            _lid: lid
        }).group({
            _id: "$_lid",
            rate: {"$avg": "$rate"}
        }).exec();
    },
    /**
     * Get all 'my' ratings
     * @param uid user ID
     * @param pagination
     * @return {Promise}
     */
    get_all_my_rates: function (uid, pagination) {
        return this.find({_uid: uid}, {_uid: 0}, pagination).lean().sort({timestamp: -1}).populate({
            path: '_lid',
            select: 'name address'
        }).exec();
    }
};

module.exports = mongoose.model('Rate', rateschema);