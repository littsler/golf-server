'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const locationschema = new Schema({
    _id: String,
    name: {type: String, required: true},
    address: String,
    telephone: String,
    opening_hours: String,
    google_photo_refs: [{type: String}],
    last_update_date: {type: Date, required: true, default: Date.now()},
    lat: {type: Number, required: true},
    lng: {type: Number, required: true}
});
const {database_expiration_days} = require('../settings/global_variables');

locationschema.statics = {
    /**
     * Add a location document
     * @param a_location a location instance
     */
    add_location: function (a_location) {
        return a_location.save(function (err) {
            if (err) {
                return err;
            }
        });
    },
    /**
     * Find a location document given a location ID
     * @param lid location ID
     * @return {Promise} a location document if found. Otherwise null.
     */
    get_location: function (lid) {
        return this.findById(lid).exec();
    },
    /**
     * Check that if the location of the given ID exists (i.e. whether the information of this location is cached).
     * @param lid location ID
     * @return {Query} true if this location exists in database, otherwise false.
     */
    do_location_exist: function (lid) {
        return this.where({_id: lid}).count(function (err, count) {
            return count > 0;
        })
    },
    /**
     * Check if the information of the given location does not exist in the database or is already expired. The expiration
     * period is 30 days.
     * @param lid location ID
     * @return {Promise} true if the information of this location should be added or refreshed. Otherwise false.
     */
    need_info_create_or_update: function (lid) {
        return this.findOne({_id: lid}).then(function (location) {
            return location === null || Date.now() - location.last_update_date >= database_expiration_days * 24 * 3600 * 1000;
        });
    },
    /**
     * Create or update a location document
     * @param a_location a location instance
     * @return {Promise} the added/updated document if successfully added/updated. Otherwise null.
     */
    create_or_update_location: function (a_location) {
        if (a_location._id == null || a_location.name == null) {
            throw new Error('Missing parameter(s) for this location');
        }
        let Location = mongoose.model('Location');
        let lid = a_location._id;
        let name = a_location.name;
        delete a_location._id;
        a_location['last_update_date'] = Date.now();
        return Location.findOneAndUpdate({_id: lid, name: name}, a_location, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }).exec();
    },
    /**
     * Get list of photo references of Google photos of the given location, considering pagination
     * @param lid location ID
     * @param skip skip for pagination
     * @param count count for pagination
     * @param separator separator for concatenating the internal photo references
     * @return {Promise} a list of internal photo references if any. Otherwise null.
     */
    get_google_photo_refs: function (lid, skip, count, separator) {
        return this.findOne({_id: lid}, 'google_photo_refs').lean().then(function (location) {
            if (location.google_photo_refs == null) {
                return null;
            }
            let index_array = [];
            for (let i in location.google_photo_refs) {
                index_array.push('google' + separator + lid + separator + i);
            }
            let results = index_array.slice(skip, skip + count);
            return results;
        });
    },
    /**
     * Get the Google photo reference given an index of the photo reference array of the given location
     * @param lid location ID
     * @param idx idx of the photo reference array, i.e. the idx-th photo reference is acquired
     * @return {Promise} a string representing the Google photo reference if any. Otherwise null.
     */
    get_single_google_photo_ref: function (lid, idx) {
        return this.findOne({_id: lid}, 'google_photo_refs').lean().then(function (location) {
            if (location === null) {
                throw new Error('Location not found');
            }
            if (location.google_photo_refs == null || location.google_photo_refs.length <= idx) {
                return null;
            }
            return location.google_photo_refs[idx];
        })
    },
    /**
     * Count the Google photos of the given location
     * @param lid location ID
     * @return {Promise} an integer number of the Google photo references. 0 if no Google photos of this location. null if
     * information of this location is not cached.
     */
    count_google_photo_refs_by_location: function (lid) {
        return this.findById(lid).then(function (location) {
            if (location === null) {
                return null;
            }
            if (location.google_photo_refs == null || location.google_photo_refs.length == 0) {
                return 0;
            }
            return location.google_photo_refs.length;
        });
    }
};

module.exports = mongoose.model('Location', locationschema);