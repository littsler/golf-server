/**
 * Created by littsler on 26.05.17.
 */
const https = require('https');
const querystring = require('querystring');
const {wrap: async} = require('co');
const sleep = require('sleep');
const log = require('log4js').getLogger('controller-location');
const mongoose = require('mongoose');
const BSON = require('bson');
const bson = new BSON();
const ObjectId = require('mongodb').ObjectID;

const User = mongoose.model('User');
const Photo = mongoose.model('Photo');
const Comment = mongoose.model('Comment');
const Location = mongoose.model('Location');
const Checkin = mongoose.model('Checkin');
const Rate = mongoose.model('Rate');
const {json_success, json_error, send_binary_as_file} = require('../utils/jsonresponse');
const {date_to_str, str_to_date} = require('../utils/dateformat');
const google_host = 'maps.googleapis.com';
const nearby_search_path = '/maps/api/place/nearbysearch/json?';
const detail_path = '/maps/api/place/details/json?';
const photo_path = '/maps/api/place/photo?';
const api_keys = ['AIzaSyAqY25ramvlIDJn9TNiDw5D1ryCSi6Q34c', 'AIzaSyAeV4VlXRvkI5q1m607ZOTGj10lMUzPyuQ',
    'AIzaSyDJME4CsD7dtlzhPGRoNCzMOvydyzcUPKY', 'AIzaSyAg52kSQeSinUj9Cs5zZqFJCghJ9CvuewI', 'AIzaSyDJ5fN7VnQKmT2byDJXUyIgBrYtfbpyaVg'];
const max_retrials = 5;
const {default_max_photo_width, default_photo_count_per_page, num_of_top_checkins, photo_ref_segments_separator} = require('../settings/global_variables');

let api_idx = 0;
let api_key = api_keys[api_idx];
log.debug('default key:' + api_key);

/**
 * Switch the API Key
 * @private
 */
_switch_api = function () {
    api_idx = (api_idx + 1) % api_keys.length;
    api_key = api_keys[api_idx];
    log.debug('switched to api key #' + api_idx + ' key: ' + api_key);
};

/**
 * Refresh the location information in the database
 * @param lid location ID
 * @param result result object from the Google location details
 * @private
 */
_refresh_location_cache = async(function* (lid, result) {
    if (!result) {
        let query_obj = {
            placeid: lid,
            key: api_key
        };
        let query = querystring.stringify(query_obj);
        let options = {
            host: google_host,
            path: detail_path + query,
            method: 'GET'
        };
        for (let i in api_keys) {
            result = yield _json_promise(options);
            if (result.status === 'OVER_QUERY_LIMIT') {
                _switch_api();
                query_obj['key'] = api_key;
                query = querystring.stringify(query_obj);
                options['path'] = detail_path + query;
                continue;
            }
            break;
        }
    }
    if (result.status !== 'OK') {
        throw new Error('Getting detail from Google Error! Status: ' + result.status);
    }
    try {
        let photo_refs = [];
        for (let i in result.result.photos) {
            photo_refs.push(result.result.photos[i].photo_reference);
        }
        let new_location = {
            _id: lid,
            name: result.result.name,
            address: result.result.formatted_address,
            google_photo_refs: photo_refs,
            lat: parseFloat(result.result.geometry.location.lat),
            lng: parseFloat(result.result.geometry.location.lng)
        };
        if (result.result.international_phone_number != null) {
            new_location['telephone'] = result.result.international_phone_number;
        }
        if (result.result.opening_hours != null && result.result.opening_hours.weekday_text != null) {
            new_location['opening_hours'] = result.result.opening_hours.weekday_text.join('\n');
        }
        yield Location.create_or_update_location(new_location);
        return result;
    } catch (e) {
        log.error('Refreshing location detail error!', e);
        throw e;
    }
});

/**
 * Send a HTTPS request, and parse the response in a JSON form
 * @param options options for the request
 * @return {Promise} the parsed JSON object
 * @private
 */
function _json_promise(options) {
    return new Promise(function (resolve, reject) {
        let result = '';
        let req = https.request(options);
        req.on('response', function (res) {
            res.on('data', function (chunk) {
                result += chunk;
            });
            res.on('end', function () {
                resolve(JSON.parse(result));
            });
        });
        req.on('error', function (err) {
            log.error(err);
        });
        req.end();
    });
}

/**
 * Download photo from Google given a photo reference
 * @param photo_ref photo reference
 */
_get_photo_from_google = async(function* (photo_ref) {
    log.debug('retrieve photo from Google:' + photo_ref);
    let query_obj = {
        photoreference: photo_ref,
        maxwidth: default_max_photo_width,
        key: api_key
    };
    let query = querystring.stringify(query_obj);
    let options = {
        host: google_host,
        path: photo_path + query,
        method: 'GET'
    };
    log.debug('query options:\n', options);
    let promise = new Promise(function (resolve, reject) {
        let req = https.request(options);
        req.on('response', function (res) {
            res.on('data', function (chunk) {
            });
            res.on('end', function () {
                if (res.statusCode === 302) {
                    resolve(res.headers.location);
                } else {
                    reject(res.statusCode);
                }
            });
        });
        req.on('error', function (err) {
            reject(err);
        });
        req.end();
    });
    let url = yield promise;
    log.debug('true URL of photo: ' + url);
    if (url !== '' && url.startsWith('http')) {
        let promise2 = new Promise(function (resolve, reject) {
            let req = https.get(url);
            req.on('response', function (res) {
                let image = '';
                res.setEncoding('binary');
                res.on('data', function (chunk) {
                    image += chunk;
                });
                res.on('end', function () {
                    image = bson.deserialize(bson.serialize({buffer: new Buffer(image, 'binary')}));
                    resolve(image.buffer);
                });
            });
            req.end();
        });
        return yield promise2;
    } else {
        throw new Error('Cannot retrieve photo by the photo reference');
    }
});

/**
 * Get internal photo references of the given location
 * @param req request
 * @param res response
 * @return {Promise|*}
 */
exports.get_photos_per_location = async(function* (req, res) {
    log.debug('Enter download photos');
    let lid = req.params.lid;
    let page = req.query.page;
    let count = req.query.count || default_photo_count_per_page;
    page = parseInt(page);
    count = parseInt(count);
    log.debug('lid: ' + lid + ' page: ' + page + ' count: ' + count);
    try {
        if (yield Location.need_info_create_or_update(lid)) {
            log.debug('need to refresh location cache');
            yield _refresh_location_cache(lid);
        }
    } catch (e) {
        log.warn('Refreshing location cache error!', e);
    }
    let num_photos_local = yield Photo.count_photos_by_location(lid);
    let num_photos_google = yield Location.count_google_photo_refs_by_location(lid);
    log.debug('#local photos: ' + num_photos_local + ' #google photos: ' + num_photos_google);
    let max_local_page = Math.ceil(num_photos_local / count);
    log.debug('num of local photos: ' + num_photos_local + ' max of local pages (ceil): ' + max_local_page);
    let photos = [];
    if (page <= max_local_page) {
        try {
            let local_photos = yield Photo.list_photos({lid: lid}, {skip: count * (page - 1), limit: count});
            for (let i in local_photos) {
                photos.push(local_photos[i]._id);
            }
            log.debug('#local photos retrieved: ' + photos.length);
        } catch (e) {
            log.error('Retrieving local photos error!', e);
            res.status(500);
            return json_error(res, 'Retrieving local photos failed');
        }
    }
    if (page >= max_local_page) {
        try {
            // let google_photos = yield _get_goolge_photos(lid, count * (page - max_local_page), count - photos.length);
            let google_photos = yield Location.get_google_photo_refs(lid, Math.max(0, count * (page - 1) - num_photos_local),
                count - photos.length, photo_ref_segments_separator);
            log.debug('#Google photos retrieved: ' + google_photos.length);
            photos = photos.concat(google_photos);
            log.debug('#all photos retrieved: ' + photos.length);
        } catch (e) {
            log.error('Retrieving photos from google error!', e);
            res.status(500);
            return json_error(res, 'Retrieving photos from google failed');
        }
    }
    let output = {};
    if (photos) {
        output['photos'] = photos;
    }
    output['total_pages'] = Math.ceil((num_photos_google + num_photos_local) / count);
    log.trace('output result:\n', output);
    res.status(200);
    return json_success(res, output);
});

/**
 * Get detailed information of the given location
 * @param req request
 * @param res response
 * @return {Promise|*}
 */
exports.details = async(function* (req, res) {
    log.debug('Enter location detail');
    let lid = req.params.lid;
    let uid = null;
    if (req.query && req.query.uid) {
        uid = req.query.uid;
    }
    log.debug('lid: ' + lid + ' uid: ' + uid);
    let query_obj = {
        placeid: lid,
        key: api_key
    };
    let query = querystring.stringify(query_obj);
    let options = {
        host: google_host,
        path: detail_path + query,
        method: 'GET'
    };
    let output_results = {};
    try {
        for (let i in api_keys) {//loop for all API Keys in case out of quota
            let result = yield _json_promise(options);
            log.debug('result from Google: ' + result.status);
            log.trace('full result: ', result);
            if (result.status === 'OK') {
                output_results = {
                    name: result.result.name,
                    address: result.result.formatted_address,
                };
                if (result.result.opening_hours != null) {
                    if (result.result.opening_hours.open_now) {
                        output_results['open_now'] = 1;
                    } else {
                        output_results['open_now'] = 0;
                    }
                }
                if (result.result.international_phone_number != null) {
                    output_results['telephone'] = result.result.international_phone_number;
                }
                if (yield Location.need_info_create_or_update(lid)) {
                    log.debug('need to refresh location cache');
                    _refresh_location_cache(lid, result);
                }
                break;
            } else if (result.status === 'OVER_QUERY_LIMIT') {
                _switch_api();
                query_obj['key'] = api_key;
                query = querystring.stringify(query_obj);
                options['path'] = detail_path + query;
            } else {
                res.status(500);
                return json_error(res, 'Retrieving Venue information failed');
            }
        }
    } catch (e) {
        log.error('Error!', e);
        res.status(500);
        return json_error(res, 'Unexpected error');
    }
    try {
        let top_checkins = yield Checkin.sort_checkins(lid, num_of_top_checkins, photo_ref_segments_separator);
        output_results['top_checkins'] = top_checkins;
    } catch (e) {
        log.error('Sorting top checkins error!', e);
        res.status(500);
        return json_error(res, 'Sorting top checkins failed');
    }
    let avg_rate = yield Rate.get_avg_rate(lid);
    if (avg_rate != null && avg_rate.length) {
        output_results['avg_rate'] = avg_rate[0].rate.toFixed(1);
    }
    if (uid) {
        let my_rate = yield Rate.get_my_rate(uid, lid);
        if (my_rate != null) {
            output_results['my_rate'] = my_rate.rate;
        }
        let my_checkins = yield Checkin.count_my_checkin_per_location(uid, lid);
        output_results['my_checkins'] = my_checkins;
    }
    log.debug('output result:\n', output_results);
    return json_success(res, output_results);
});

//format received location details from Google into the form of Location model
_format_location_list = async(function* (all_results) {
    let output_results = [];
    for (let i in all_results) {
        let lid = all_results[i].place_id;
        let photo = null;
        if (all_results[i].photos) {
            photo = 'direct' + photo_ref_segments_separator + all_results[i].photos[0].photo_reference;
        }
        let location_obj = {
            lid: lid,
            name: all_results[i].name,
            lat: all_results[i].geometry.location.lat,
            lng: all_results[i].geometry.location.lng,
        };
        if (photo) {
            location_obj['photo'] = photo;
        }
        output_results.push(location_obj);
    }
    return output_results;
});

/**
 * Search nearby for locations by given keyword
 * @param req request
 * @param res response
 */
exports.nearby_search = async(function* (req, res) {
    log.debug('Enter nearby search');
    let lat = req.query.lat;
    let lng = req.query.lng;
    let radius = req.query.radius;
    let keyword = req.query.keyword;
    let name = req.query.name;
    let types = req.query.types;
    log.debug('lat: ' + lat + ' lng: ' + lng + ' radius: ' + radius + ' keywords: ' + keyword + ' name: ' + name + ' types: ' + types);
    if (lat == null || lng == null || (keyword == null && name == null && types == null)) {
        res.status(406);
        return json_error(res, 'Missing keywords! Please enter a keyword');
    }
    let all_results = [];
    let has_more_page = false;
    let is_first_page = true;
    let acc_retry = 0;
    let key_changed = 0;
    let query_obj = {
        location: lat + ',' + lng,
        radius: radius || 5000,
        key: api_key
    };
    if (keyword != null) {
        query_obj['keyword'] = keyword;
    }
    if (name != null) {
        query_obj['name'] = name;
    }
    if (types != null) {
        query_obj['types'] = types;
    }
    let query = querystring.stringify(query_obj);
    let options = {
        host: google_host,
        path: nearby_search_path + query,
        method: 'GET'
    };
    do {
        log.debug('query options:\n', options);
        let result = yield _json_promise(options);
        if (result.status === 'OK') {
            all_results = all_results.concat(result.results);
            if (result.next_page_token) {
                acc_retry = 0;
                has_more_page = true;
                is_first_page = false;
                let next_query_obj = {pagetoken: result.next_page_token, key: api_key};
                query = querystring.stringify(next_query_obj);
                options['path'] = nearby_search_path + query;
            } else {
                has_more_page = false;
            }
        } else if (result.status === 'OVER_QUERY_LIMIT') {
            if (key_changed >= api_keys.length) {
                log.warn('result: ' + result.status);
                log.trace('full result:\n', result);
                res.status(500);
                return json_error(res, 'Unexpected server error');
            }
            _switch_api();
            query_obj['key'] = api_key;
            query = querystring.stringify(query_obj);
            options['path'] = detail_path + query;
            key_changed++;
        } else if (!is_first_page && result.status === 'INVALID_REQUEST' && acc_retry < max_retrials) {
            sleep.msleep(200 * (acc_retry + 1));
            log.debug('try again.');
            acc_retry++;
        } else if (result.status !== 'ZERO_RESULTS') {
            log.warn('result: ' + result.status);
            log.trace('full result:\n', result);
            res.status(500);
            return json_error(res, 'Search error');
        } else {
            break;
        }
    } while (has_more_page);
    let output_results = yield _format_location_list(all_results);
    log.debug('output result:\n', output_results);
    return json_success(res, output_results);
});

/**
 * List comments associated to the given location
 * @param req request
 * @param res response
 */
exports.list_comments = async(function* (req, res) {
    log.debug('Enter list location comments');
    let page = parseInt(req.query.page);//which page
    let count = parseInt(req.query.count);//how many infos per page
    log.debug('page: ' + page + ' count: ' + count);
    try {
        if (!(yield Location.do_location_exist(req.params.lid))) {
            log.debug('need to refresh location cache');
            _refresh_location_cache(req.params.lid);
        }
        let comments = yield Comment.list_comments({_lid: req.params.lid}, {_lid: 0}, {
            skip: (page - 1) * count,
            limit: count
        }, photo_ref_segments_separator);
        for (let c in comments) {
            comments[c].timestamp = date_to_str(comments[c].timestamp);
            comments[c]['comment_id'] = comments[c]._id;
            delete comments[c]._id;
            if (comments[c]._uid && comments[c]._uid.uname) {
                comments[c]['uid'] = comments[c]._uid._id;
                comments[c]['uname'] = comments[c]._uid.uname;
                if (comments[c]._uid.ureal_name) {
                    comments[c]['ureal_name'] = comments[c]._uid.ureal_name;
                }
                if (comments[c]._uid.avatar_ref) {
                    comments[c]['avatar'] = comments[c]._uid.avatar_ref;
                }
            } else {
                comments[c]['uid'] = '';
                comments[c]['uname'] = 'Unregistered User';
            }
            delete comments[c]._uid;
        }
        let count_all_comments = yield Comment.count_all_comments_per_location(req.params.lid);
        log.debug('#all comments of location: ' + count_all_comments);
        comments['total_pages'] = Math.ceil(count_all_comments / count);
        log.debug('output result:\n', comments);
        res.status(200);
        return json_success(res, comments);
    } catch (e) {
        log.error(e);
        res.status(500);
        return json_error(res, 'Searching Tips failed');
    }
});

/**
 * Add a comment by the given user on the given location
 * @param req request
 * @param res response
 */
exports.add_comment = async(function* (req, res) {
    log.debug('Enter add comment');
    let parameters = {
        text: req.body.text,
        _lid: req.params.lid,
        _uid: req.params.uid,
        timestamp: str_to_date(req.body.timestamp)
    };
    log.debug('parameter:\n', parameters);
    let photo_buffer = null;
    if (req.file != null) {
        log.debug('contains photo');
        photo_buffer = req.file.buffer;
    }
    try {
        if (yield Location.need_info_create_or_update(req.params.lid)) {
            log.debug('need to refresh location cache');
            _refresh_location_cache(req.params.lid);
        }
        let comment = new Comment(parameters);
        let a_comment = yield Comment.add_comment(comment, photo_buffer);
        res.status(200);
        return json_success(res, {});
    } catch (err) {
        log.error('Add Comment error.', err);
        res.status(500);
        return json_error(res, 'Adding Tips failed');
    }
});

/**
 * User checks in at the given location
 * @param req request
 * @param res response
 */
exports.checkin = async(function* (req, res) {
    log.debug('Enter checkin');
    let parameter = {_lid: req.params.lid, _uid: req.params.uid, timestamp: str_to_date(req.body.timestamp)};
    log.debug('parameter:\n', parameter);
    let checkin = new Checkin(parameter);
    try {
        if (!(yield Location.do_location_exist(req.params.lid))) {
            log.debug('need to refresh location cache');
            _refresh_location_cache(req.params.lid);
        }
        yield Checkin.add_checkin(checkin);
        res.status(200);
        return json_success(res, {});
    } catch (err) {
        log.error('Check in error!', err);
        res.status(500);
        return json_error(res, 'Checking in failed');
    }
});

/**
 * User rates the given location
 * @param req request
 * @param res response
 */
exports.set_rate = async(function* (req, res) {
    log.debug('Enter set rate');
    let uid = req.params.uid;
    let lid = req.params.lid;
    let rate_score = req.body.rate;
    let timestamp = str_to_date(req.body.timestamp);
    log.debug('uid: ' + uid + ' lid: ' + lid + ' rate: ' + rate_score + ' timestamp: ' + timestamp);
    try {
        if (!(yield Location.do_location_exist(lid))) {
            log.debug('need to refresh location cache');
            _refresh_location_cache(lid);
        }
        yield Rate.create_or_update_rate(uid, lid, rate_score, timestamp);
        res.status(200);
        return json_success(res, {});
    } catch (e) {
        log.error('Add rate error!', e);
        res.status(500);
        return json_error(res, 'Rating failed');
    }
});

/**
 * User uploads photos on the given location
 * @param req request
 * @param res response
 */
exports.upload_photos = async(function* (req, res) {
    log.debug('Enter upload photos');
    let uid = req.params.uid;
    let lid = req.params.lid;
    log.debug('uid: ' + uid + ' lid: ' + lid);
    log.debug('#photos: ' + req.files.length);
    let promises = [];
    try {
        for (let i in req.files) {
            let data = req.files[i].buffer;
            log.debug(data);
            promises.push(Photo.new_photo(data, uid, lid));
        }
        for (let i in promises) {
            log.debug(yield promises[i]);
        }
    } catch (e) {
        log.error('Saving photo error!', e);
        res.status(500);
        return json_error(res, 'Uploading photos failed');
    }
    res.status(200);
    return json_success(res, {});
});

_get_title_photo_ref_by_location = async(function* (lid) {
    log.debug('get title photo ref for ' + lid);
    if (yield Location.need_info_create_or_update(lid)) {
        log.debug('need to refresh location cache');
        yield _refresh_location_cache(lid);
    }
    let local_photo_refs = yield Photo.list_photos({lid: lid}, null);
    if (local_photo_refs && local_photo_refs.length > 0) {
        return local_photo_refs[0]._id;
    }
    let google_photo_refs_count = yield Location.count_google_photo_refs_by_location(lid);
    if (google_photo_refs_count === null) {
        throw new Error('Venue not found');
    }
    if (google_photo_refs_count == 0) {
        return null;
    }
    return 'google' + photo_ref_segments_separator + lid + photo_ref_segments_separator + '0';
});

/**
 * Get the reference of the title photo given a location
 * @param lid location ID
 */
exports.get_title_photo_ref_by_location = _get_title_photo_ref_by_location;

/**
 * Get a short summary of the given location. Latitude, longitude, formatted address and reference of the title photo (if any)
 * are returned.
 * @param req request
 * @param res response
 */
exports.get_location_summary = async(function* (req, res) {
    log.debug('Enter single location brief info');
    let lid = req.params.lid;
    log.debug('lid: ' + lid);
    if (yield Location.need_info_create_or_update(lid)) {
        log.debug('need to refresh location cache');
        yield _refresh_location_cache(lid);
    }
    let location = yield Location.get_location(lid);
    if (location === null) {
        log.error('location not found');
        res.status(404);
        return json_error(res, 'Venue not found');
    }
    let title_photo_ref = yield _get_title_photo_ref_by_location(lid);
    let output = {
        lat: location.lat,
        lng: location.lng,
        name: location.name,
        address: location.address,
    };
    if (title_photo_ref) {
        output['photo_ref'] = title_photo_ref;
    }
    log.debug('output result:\n', output);
    res.status(200);
    return json_success(res, output);
});

//transform a internal reference into a Google photo reference
_get_google_ref_by_photo_ref = async(function* (photo_ref) {
    if (photo_ref == null || !photo_ref.startsWith('google' + photo_ref_segments_separator)) {
        throw new Error(photo_ref + 'is not a valid photo ref for Google photos');
    }
    let segments = photo_ref.split(photo_ref_segments_separator);
    if (segments.length != 3) {
        throw new Error(photo_ref + 'is not a valid photo ref for Google photos');
    }
    let lid = segments[1];
    let idx = segments[2];
    let google_ref = yield Location.get_single_google_photo_ref(lid, idx);
    if (google_ref == null) {
        throw new Error('no google photo ref found for ' + photo_ref);
    }
    return google_ref;
});

/**
 * Download a single photo given a photo reference
 * @param req request
 * @param res response
 */
exports.download_single_photo = async(function* (req, res) {
    log.debug('Enter download single photo');
    let photo_ref = req.query.photo_ref;
    log.debug('photo_ref: ' + photo_ref);
    let photo = null;
    if (photo_ref.startsWith('google' + photo_ref_segments_separator)) {
        let google_ref = null;
        try {
            google_ref = yield _get_google_ref_by_photo_ref(photo_ref);
        } catch (e) {
            log.error('get google photo ref error', e);
            res.status(404);
            return json_error(res, 'Downloading photo failed');
        }
        try {
            photo = yield _get_photo_from_google(google_ref);
            photo = photo.buffer;
        } catch (e) {
            log.error('download photo from google error', e);
            res.status(500);
            return json_error(res, 'Downloading photo failed');
        }
    } else if (photo_ref.startsWith('avatar' + photo_ref_segments_separator)) {
        let segments = photo_ref.split(photo_ref_segments_separator);
        if (segments.length !== 2) {
            log.error(photo_ref + ' is not a valid avatar photo ref');
            res.status(400);
            return json_error(res, 'Invalid photo request');
        }
        photo = yield User.download_avatar(segments[1]);
        photo = photo.avatar.buffer;
    } else if (photo_ref.startsWith('direct' + photo_ref_segments_separator)) {
        let segments = photo_ref.split(photo_ref_segments_separator);
        if (segments.length !== 2) {
            log.error(photo_ref + ' is not a valid google photo ref');
            res.status(400);
            return json_error(res, 'Invalid photo request');
        }
        try {
            photo = yield _get_photo_from_google(segments[1]);
            photo = photo.buffer;
        } catch (e) {
            log.error('download photo from google error', e);
            res.status(500);
            return json_error(res, 'Downloading photo failed');
        }
    } else {
        try {
            photo = yield Photo.get_photo(ObjectId(photo_ref));
            photo = photo.data.buffer;
        } catch (e) {
            log.error('get local photo error', e);
            res.status(404);
            return json_error(res, 'Downloading photo failed');
        }
    }
    if (!photo) {
        log.warn('photo not found!');
        res.status(404);
        return json_error(res, 'Photo not found');
    }
    try {
        return send_binary_as_file(res, photo, photo_ref);
    } catch (e) {
        log.error('Retrieving photo error', e);
        res.status(500);
        return json_error(res, 'Retrieving photo failed');
    }
});