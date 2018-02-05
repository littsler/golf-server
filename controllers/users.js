/**
 * Created by littsler on 17.05.17.
 */
const {wrap: async} = require('co');
const {json_success, json_error} = require('../utils/jsonresponse');
const {date_to_str, str_to_date} = require('../utils/dateformat');
const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectID;
const Photo = mongoose.model('Photo');
const User = mongoose.model('User');
const Comment = mongoose.model('Comment');
const Friendship = mongoose.model('Friendship');
const Checkin = mongoose.model('Checkin');
const Rate = mongoose.model('Rate');
const log = require('log4js').getLogger('controller-users');
const {photo_ref_segments_separator} = require('../settings/global_variables');
const locations = require('../controllers/locations');

/**
 * User Register
 * @param req request
 * @param res response
 */
exports.register = async(function* (req, res) {
    log.debug('Enter register');
    let parameters = req.body;
    let birthday_str = parameters.birthday;
    if (birthday_str != null) {
        if (birthday_str.trim() !== '') {
            let birthday = str_to_date(birthday_str);
            parameters.birthday = birthday;
        } else {
            delete parameters.birthday;
        }
    }
    let user = new User(parameters);
    let avatar = req.file;
    user.status = 'online';
    log.debug('user object:\n', user);
    if (avatar != null) {
        log.debug('contains avatar');
        user.avatar = avatar.buffer;
    }
    try {
        let saved_user = yield User.add_user(user);
        res.status(200);
        let output = {uid: saved_user._id, uname: saved_user.uname};
        log.debug('output result:\n', output);
        return json_success(res, output);
    } catch (err) {
        log.error('Register user error.', err);
        res.status(500);
        return json_error(res, 'Register user failed');
    }
});

/**
 * User login
 * @param req request
 * @param res response
 */
exports.login = async(function* (req, res) {
    log.debug('Enter login');
    let email = req.body.email;
    let password = req.body.password;
    let device_id = req.body.device_id;
    log.debug('email: ' + email + ' password: ' + password + ' device_id: ' + device_id);
    if (email == null || password == null) {
        res.status(401);
        return json_error(res, new Error('Email or password is empty! Please check again E-mail address or password.'));
    }
    if (device_id == null) {
        res.status(403);
        return json_error(res, new Error('Please login through legal device!'));
    }
    let user = null;
    try {
        user = yield User.get_user({email: email, password: password}, photo_ref_segments_separator);
        if (!user) {
            res.status(401);
            log.info(email + ' ' + password + " does not exist!");
            return json_error(res, new Error("E-mail or password is incorrect! Please check again E-mail address or password."))
        }
    } catch (e) {
        log.error('Error occurred while finding user', e);
        res.status(500);
        return json_error(res, new Error('System Error! Please try again.'));
    }
    log.debug('retrieved user:\n', user);
    if (user.status && user.status !== 'offline' && req.device_id !== user.device_id) {
        log.warn('Use already logged in!' + user.status);
        return json_error(res, new Error('User already logged in!'));
    }
    yield User.update_user({_id: user._id}, {device_id: device_id, status: 'online'});
    user = yield User.get_user({email: email, password: password}, photo_ref_segments_separator);
    let output_result = {
        uname: user.uname,
        uid: user._id,
        gender: user.gender,
        birthday: date_to_str(user.birthday),
        city: user.city,
    };
    if (user.avatar) {
        output_result['avatar'] = user.avatar;
    }
    log.debug('output result:\n', output_result);
    res.status(200);
    return json_success(res, output_result);
});

/**
 * User logout
 * @param req request
 * @param res response
 */
exports.logout = async(function* (req, res) {
    log.debug('Enter logout');
    log.debug('uid: ' + req.params.uid);
    let user = null;
    try {
        user = yield User.get_user({_id: req.params.uid}, photo_ref_segments_separator);//http :para
    } catch (e) {
        log.error('Error occurred while finding user', e);
        res.status(500);
        return json_error(res, 'Unexpected error');
    }
    log.debug('retrieved user:\n', user);
    if (user == null) {
        log.warn('User not found!' + req.params.uid);
        res.status(404);
        return json_error(res, 'User not found!');
    }
    log.debug('given device_id: ' + req.body.device_id);
    log.debug('retrieved device_id: ' + user.device_id);
    if (req.body.device_id !== user.device_id)//post {}
    {
        log.warn('Different Device ID!');
        res.status(500);
        return json_error(res, 'Different Device ID!');
    }
    try {
        yield User.update_user({_id: user._id}, {status: "offline"});
    } catch (e) {
        log.error('Update status error!', e);
        res.status(500);
        return json_error(res, 'Unexpected error');
    }
    res.status(200);
    return json_success(res, {});
});

/**
 * User edits his profile
 * @param req request
 * @param res response
 */
exports.update = async(function* (req, res) {
    log.debug('Enter update user');
    let updatedata = req.body;
    if (updatedata.birthday != null) {
        if (updatedata.birthday.trim() !== '') {
            updatedata.birthday = str_to_date(updatedata.birthday);
        } else {
            delete updatedata.birthday;
        }
    }
    log.debug('update data:\n', updatedata);
    let avatar = req.file;
    if (avatar != null) {
        log.debug('contains avatar');
        updatedata.avatar = avatar.buffer;
    }
    let user = null;
    try {
        user = yield User.get_user({_id: req.params.uid}, photo_ref_segments_separator);
    } catch (e) {
        log.error('Error occurred while finding user', e);
        res.status(500);
        return json_error(res, 'Error occurred while finding user');
    }
    if (user == null) {
        res.status(404);
        return json_error(res, 'User does not exist!');
    }
    try {
        yield User.update_user({_id: user._id}, updatedata);
        res.status(200);
        return json_success(res, {});
    } catch (err) {
        log.error('Error occurred while updating user', err);
        res.status(500);
        return json_error(res, 'Error occurred while updating user');
    }
});

/**
 * User resets password
 * @param req request
 * @param res response
 */
exports.resetpassword = async(function* (req, res) {
    log.debug('Enter reset password');
    let orig_password = req.body.orig_password;
    let new_password = req.body.new_password;
    log.debug('uid: ' + req.params.uid + ' old password: ' + orig_password + ' new password: ' + new_password);
    let user = yield User.get_user({_id: req.params.uid}, photo_ref_segments_separator);
    if (user === null) {
        log.error('user not found');
        res.status(404);
        return json_error(res, 'user not found');
    }
    if (new_password === '' || new_password === orig_password || orig_password !== user.password) {
        log.warn('Invalid original or new password');
        res.status(500);
        return json_error(res, 'Invalid original or new password! Please check the passwords again');
    }
    yield User.update_user({_id: user._id}, {password: new_password});
    res.status(200);
    return json_success(res, {});
});

/**
 * List comments of the given user in a desc order of timestamp
 * @param req request
 * @param res response
 */
exports.usercomments = async(function* (req, res) {
    log.debug('Enter list user comments');
    let page = parseInt(req.query.page);//which page
    let count = parseInt(req.query.count);//how many infos per page
    log.debug('uid: ' + req.params.uid + ' page: ' + page + ' count: ' + count);
    try {
        let comments = yield Comment.list_comments({_uid: req.params.uid}, {_uid: 0}, {
            skip: (page - 1) * count,
            limit: count
        });
        log.debug('#comments retrieved: ' + comments.length);
        for (let c in comments) {
            comments[c].timestamp = date_to_str(comments[c].timestamp);
            comments[c]['comment_id'] = comments[c]._id;
            delete comments[c]._id;
            comments[c]['lid'] = comments[c]._lid._id;
            comments[c]['name'] = comments[c]._lid.name;
            delete comments[c]._lid;
            comments[c]['location_photo'] = yield locations.get_title_photo_ref_by_location(comments[c].lid);
            if (comments[c].photo) {
                comments[c]['comment_photo'] = comments[c].photo;
                delete comments[c]['photo'];
            }
        }
        let count_all_comments = yield Comment.count_all_my_comments(req.params.uid);
        log.debug('#all my comments: ' + count_all_comments);
        comments['total_pages'] = Math.ceil(count_all_comments / count);
        log.debug('output result:\n', comments);
        res.status(200);
        return json_success(res, comments);
    } catch (e) {
        log.error(e);
        res.status(500);
        return json_error(res, 'Unexpected error');
    }
});

/**
 * Delete a comment, which belongs to the given user.
 * @param req request
 * @param res response
 */
exports.deletecomment = async(function* (req, res) {
    log.debug('Enter delete comment');
    let id = req.params.comment_id;
    let comment_id = ObjectId(id);
    let uid = req.body.uid;
    log.debug('comment id: ' + comment_id + ' uid: ' + uid);
    try {
        let deleted_comment = yield Comment.delete_comment(id, uid);
        if (deleted_comment == null) {
            log.error('Tips not found or user has no permission');
            res.status(403);
            return json_error(res, 'Tips not found or user has no permission');
        }
        res.status(200);
        return json_success(res, {});
    } catch (err) {
        log.error('Delete comment error.', err);
        res.status(500);
        return json_error(res, 'Delete Tips failed');
    }
});

/**
 * Get followers of the given user
 * @param req request
 * @param res response
 */
exports.getfollowers = async(function* (req, res) {
    log.debug('Enter get followers');
    let followed_id = req.params.followed_id;
    log.debug('followed id: ' + followed_id);
    try {
        let followers = yield Friendship.get_follower(followed_id, photo_ref_segments_separator);
        log.debug('#followers: ' + followers.length);
        for (let i in followers) {
            followers[i]['friendship_id'] = followers[i]._id;
            delete followers[i]._id;
            followers[i]['uid'] = followers[i].follower_id._id;
            followers[i]['uname'] = followers[i].follower_id.uname;
            if (followers[i].follower_id.ureal_name) {
                followers[i]['ureal_name'] = followers[i].follower_id.ureal_name;
            }
            if (followers[i].follower_id.avatar_ref) {
                followers[i]['avatar'] = followers[i].follower_id.avatar_ref;
            }
            delete followers[i].follower_id;
        }
        log.debug('output result:\n', followers);
        res.status(200);
        return json_success(res, followers);
    } catch (err) {
        log.error('Get follower error.', err);
        res.status(500);
        return json_error(res, 'Getting followers failed');
    }
});

/**
 * Get followings of the given user
 * @param req request
 * @param res response
 */
exports.getfollowings = async(function* (req, res) {
    log.debug('Enter get followings');
    let follower_id = req.params.follower_id;
    log.debug('follower id: ' + follower_id);
    try {
        let followeds = yield Friendship.get_followed(follower_id, photo_ref_segments_separator);
        log.debug('#followeds: ' + followeds.length);
        for (let i in followeds) {
            followeds[i]['friendship_id'] = followeds[i]._id;
            delete followeds[i]._id;
            followeds[i]['uid'] = followeds[i].followed_id._id;
            followeds[i]['uname'] = followeds[i].followed_id.uname;
            if (followeds[i].followed_id.ureal_name) {
                followeds[i]['ureal_name'] = followeds[i].followed_id.ureal_name;
            }
            if (followeds[i].followed_id.avatar_ref) {
                followeds[i]['avatar'] = followeds[i].followed_id.avatar_ref;
            }
            delete followeds[i].followed_id;
        }
        log.debug('output result:\n', followeds);
        res.status(200);
        return json_success(res, followeds);
    } catch (err) {
        log.error('Get followed error.', err);
        res.status(500);
        return json_error(res, 'Getting followings failed');
    }
});

/**
 * User follows another user
 * @param req request
 * @param res response
 */
exports.follow = async(function* (req, res) {
    log.debug('Enter follow');
    let follower_id = req.params.follower_id;
    let followed_id = req.params.followed_id;
    let friends = new Friendship({follower_id: ObjectId(follower_id), followed_id: ObjectId(followed_id)});
    log.debug('friend object:\n', friends);
    try {
        yield Friendship.add_followship(friends);
        res.status(200);
        return json_success(res, {});
    } catch (err) {
        log.error('Add followship error.', err);
        res.status(500);
        return json_error(res, 'Unexpected error');
    }
});

/**
 * Get the profile of the given user
 * @param req request
 * @param res response
 */
exports.userinfo = async(function* (req, res) {
    log.debug('Enter get user info');
    let uid = req.params.uid;
    let current_id = uid;
    if (req.query != null && req.query.current_id != null && req.query.current_id.trim() !== '') {
        log.debug('current id given');
        current_id = req.query.current_id;
    }
    log.debug('uid: ' + uid + ' current uid: ' + current_id);
    try {
        let user = yield User.get_user({_id: uid}, photo_ref_segments_separator);
        if (uid == current_id || (yield Friendship.has_already_followed(current_id, uid))) {
            user['can_follow'] = 0;
        } else {
            user['can_follow'] = 1;
        }
        if (user.birthday) {
            user['birthday'] = date_to_str(user.birthday);
        }
        delete user['password'];
        delete user['device_id'];
        delete user['status'];
        delete user['_id'];
        delete user['email'];
        log.debug('output result:\n', user);
        res.status(200);
        return json_success(res, user);
    }
    catch (err) {
        log.error('User Not Found', err);
        res.status(500);
        return json_error(res, 'User Not Found');
    }
});

/**
 * List checkins of the given user in a descend order of timestamp
 * @param req request
 * @param res response
 */
exports.list_my_checkins = async(function* (req, res) {
    log.debug('Enter list checkins per user');
    let uid = req.params.uid;
    let page = parseInt(req.query.page);
    let count = parseInt(req.query.count);
    log.debug('uid: ' + uid + ' page: ' + page + ' count: ' + count);
    if (uid == null) {
        log.error('uid is missing');
        res.status(400);
        return json_error(res, 'Please login first!');
    }
    let pagination = null;
    if (page && count) {
        pagination = {
            skip: count * (page - 1),
            limit: count
        };
    }
    let output_results = yield Checkin.get_checkins_per_user(uid, pagination);
    for (let i in output_results) {
        output_results[i]['timestamp'] = date_to_str(output_results[i].timestamp);
        output_results[i]['lid'] = output_results[i]._lid._id;
        output_results[i]['name'] = output_results[i]._lid.name;
        output_results[i]['address'] = output_results[i]._lid.address;
        output_results[i]['photo'] = yield locations.get_title_photo_ref_by_location(output_results[i].lid);
        delete output_results[i]['_lid'];
    }
    if (pagination) {
        let checkin_count = yield Checkin.count_my_checkins(uid);
        output_results['total_pages'] = Math.ceil(checkin_count / count);
    }
    log.debug('output result:\n', output_results);
    res.status(200);
    return json_success(res, output_results);
});

/**
 * Search user by one keyword. User name and user real name will be queried.
 * @param keyword the keyword for the query
 * @private
 */
_search_users_by_one_word = async(function* (keyword) {
    let uname_users = yield User.search_uname(keyword, photo_ref_segments_separator);
    log.debug('search uname results:\n', uname_users);
    let ureal_name_users = yield User.search_ureal_name(keyword, photo_ref_segments_separator);
    log.debug('search ureal_name results:\n', ureal_name_users);
    let users = uname_users.concat(ureal_name_users);
    for (let i in users) {
        delete users[i].avatar;
    }
    log.debug('search results:\n', users);
    return users;
});

/**
 * Search for users given keywords. User names and user real names will be queried.
 * @param req request
 * @param res response
 */
exports.search_users = async(function* (req, res) {
    log.debug('Enter search users');
    let keyword = req.query.keyword;
    let my_uid = req.query.uid;
    log.debug('keyword: ' + keyword + ' my_uid: ' + my_uid);
    if (keyword == null || keyword.trim() === '') {
        log.error('missing keyword');
        res.status(400);
        return json_error(res, 'Missing keyword');
    }
    let keywords = keyword.split(' ');
    let candidate_scores = {};
    let candidate_map = {};
    try {
        for (let i in keywords) {
            log.debug('keyword: ' + keywords[i]);
            let subcandidates = yield _search_users_by_one_word(keywords[i]);
            if (subcandidates) {
                for (let j in subcandidates) {
                    candidate_scores[subcandidates[j]._id] = (candidate_scores[subcandidates[j]._id] || 0) + 1;
                    if (candidate_map[subcandidates[j]._id] == null) {
                        candidate_map[subcandidates[j]._id] = subcandidates[j];
                    }
                }
            }
        }
    } catch (e) {
        log.error('search with keyword error', e);
        res.status(500);
        return json_error(res, 'Unexpected error');
    }
    log.debug('candidate map:\n', candidate_map);
    log.debug('candidate scores:\n', candidate_scores);
    let candidates_sorted = Object.keys(candidate_scores).sort(function (a, b) {
        return candidate_scores[b] - candidate_scores[a];
    });
    log.debug('candidate sorted:\n', candidates_sorted);
    let candidates = [];
    for (let i in candidates_sorted) {
        let uid = candidates_sorted[i];
        if (uid === my_uid) {
            continue;
        }
        let candidate = {
            uid: uid,
            uname: candidate_map[uid].uname
        };
        if (candidate_map[uid].ureal_name) {
            candidate['ureal_name'] = candidate_map[uid].ureal_name;
        }
        if (candidate_map[uid].avatar_ref) {
            candidate['avatar'] = candidate_map[uid].avatar_ref;
        }
        candidates.push(candidate);
    }
    log.debug('output result:\n', candidates);
    res.status(200);
    return json_success(res, candidates);
});

/**
 * List historical records of checkins and ratings of the given user.
 * @param req request
 * @param res response
 */
exports.list_my_history = async(function* (req, res) {
    log.debug('Enter list my history');
    let page = req.query.page;
    let count = req.query.count;
    let uid = req.params.uid;
    log.debug('uid: ' + uid + ' page: ' + page + ' count: ' + count);
    let checkins = null;
    try {
        checkins = yield Checkin.get_checkins_per_user(uid, null);
        log.debug('all checkins:\n', checkins);
    } catch (e) {
        log.error('get checkins error', e);
        res.status(500);
        return json_error(res, 'Getting my checkins failed');
    }
    let rates = null;
    try {
        rates = yield Rate.get_all_my_rates(uid, null);
        log.debug('all rates:\n', rates);
    } catch (e) {
        log.error('get rates error', e);
        res.status(500);
        return json_error(res, 'Getting my rates failed');
    }
    for (let i in checkins) {
        checkins[i]['type'] = 'checkin';
    }
    for (let i in rates) {
        rates[i]['type'] = 'rate';
    }
    let histories = checkins.concat(rates);
    log.debug('#rates: ' + rates.length + ' #checkins: ' + checkins.length + ' #all histories: ' + histories.length);
    let histories_sorted = Object.values(histories).sort(function (a, b) {
        return b.timestamp - a.timestamp;
    });
    log.debug('sorted histories:\n', histories_sorted);
    let output = histories_sorted;
    if (page && count) {
        output = output.slice(count * (page - 1), count);
    }
    for (let i in output) {
        output[i]['timestamp'] = date_to_str(output[i].timestamp);
        let lid = output[i]._lid._id;
        output[i]['photo'] = yield locations.get_title_photo_ref_by_location(lid);
        output[i]['lid'] = lid;
        output[i]['name'] = output[i]._lid.name;
        if (output[i].type === 'rate') {
            output[i]['rate'] = output[i]._lid.rate;
        }
        delete output[i]['_lid'];
    }
    if (page && count) {
        output['total_pages'] = Math.ceil(histories.length / count);
    }
    log.debug('output result:\n', output);
    res.status(200);
    return json_success(res, output);
});

/**
 * User deletes his own account.
 * @param req request
 * @param res response
 */
exports.delete_user = async(function* (req, res) {
    log.debug('Enter delete user');
    let uid = req.params.uid;
    log.debug('uid: ' + uid);
    try {
        let deleted_user = yield User.delete_user(uid);
        if (deleted_user == null) {
            log.error('user not existing');
            res.status(404);
            return json_error(res, 'User does not exist');
        }
        try {
            yield Friendship.delete_user(uid);
        } catch (e) {
            log.warn('delete user friendships error', e);
        }
        try {
            yield Checkin.delete_user(uid);
        } catch (e) {
            log.warn('delete user friendships error', e);
        }
        res.status(200);
        return json_success(res, {});
    } catch (e) {
        log.error('delete user error', e);
        res.status(500);
        return json_error(res, 'Delete user failed');
    }
});