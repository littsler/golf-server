'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const photoschema = new Schema({
    timestamp: {type: Date, default: Date.now},
    data: {type: Buffer, required: true},
    uid: {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    lid: {type: String, required: true},
});
photoschema.index({uid: 1});
photoschema.index({lid: 1});

photoschema.path('uid').validate(function (uid, fn) {
    let User = mongoose.model('User');
    if (this.isNew) {
        User.find({_id: uid}).exec(function (err, users) {
            fn(!err && users.length > 0);
        });
    } else fn(true);
}, 'User not existing!');

photoschema.statics = {
    /**
     * Upload new photo
     * @param data binary data of the photo
     * @param uid user ID
     * @param lid location ID
     */
    new_photo: function (data, uid, lid) {
        let Photo = mongoose.model('Photo');
        let photo = new Photo({data: data, uid: uid, lid: lid});
        return photo.save();
    },
    /**
     * Download a specific photo given a photo reference
     * @param photo_ref
     * @return {Promise}
     */
    get_photo: function (photo_ref) {
        return this.findById(photo_ref, 'data').lean().exec();
    },
    /**
     * Delete a photo given a photo reference
     * @param photo_ref
     */
    remove_photo: function (photo_ref) {
        return this.remove({_id: photo_ref}, function (err) {
            if (err) {
                return err;
            }
        });
    },
    /**
     * List local photos (Non-Google photos) given query conditions
     * @param conditions query conditions
     * @param pagination
     * @return {Promise} a list of photo documents if any. Otherwise null
     */
    list_photos: function (conditions, pagination) {
        return this.find(conditions, '_id', pagination).lean().exec();
    },
    /**
     * Count the number of the photos of the given locaion
     * @param lid location ID
     * @return {Array|{index: number, input: string}|Promise} a integer number of found photos. 0 if no photo found.
     */
    count_photos_by_location: function (lid) {
        return this.count({lid: lid}).exec();
    }
};

module.exports = mongoose.model('Photo', photoschema);