const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({storage: multer.memoryStorage()});
const users = require('../controllers/users');
const locations = require('../controllers/locations');

/**
 * @api {post} /user/register User Registration
 * @apiGroup user
 * @apiParam {String} uname User name
 * @apiParam {String} email User Email
 * @apiParam {String} password User Password
 * @apiParam {String} ureal_name User real name
 * @apiParam {String} gender User gender [male|female|unknown]
 * @apiParam {String} birthday User birthday
 * @apiParam {String} device_id User device ID
 * @apiParam {File} avatar User avatar
 * @apiParam {String} city City of the User
 * @apiSuccess {String} uid The user ID
 * @apiSuccess {String} uname User name
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 *      //the other success fields
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.post('/register', upload.single('avatar'), users.register);
/**
 * @api {post} /user/login User Login
 * @apiGroup user
 * @apiParam {String} email User Email
 * @apiParam {String} device_id User device ID
 * @apiSuccess {String} uid The user ID
 * @apiSuccess {String} uname User name
 * @apiSuccess {String} avatar internal photo reference of the User avatar
 * @apiSuccess {String} city City of the User
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 *      //the other success fields
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.post('/login', users.login);
/**
 * @api {post} /user/logout/:uid User Logout
 * @apiGroup user
 * @apiParam {String} device_id User device ID
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.post('/logout/:uid', users.logout);
/**
 * @api {post} /user/password/:uid Password Reset
 * @apiGroup user
 * @apiParam {String} orig_password Original Password
 * @apiParam {String} new_password New Password
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.post('/password/:uid', users.resetpassword);
/**
 * @api {post} /user/:follower_id/follow/:followed_id User Follows Another User
 * @apiGroup user
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.post('/:follower_id/follow/:followed_id', users.follow);
/**
 * @api {post} /user/updateprofile/:uid User Edits Profile
 * @apiGroup user
 * @apiParam {String} uname User name
 * @apiParam {String} ureal_name User real name
 * @apiParam {String} gender User gender [male|female|unknown]
 * @apiParam {String} birthday User birthday
 * @apiParam {String} device_id User device ID
 * @apiParam {File} avatar User avatar
 * @apiParam {String} city City of the User
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.post('/updateprofile/:uid', upload.single('avatar'), users.update);
/**
 * @api {post} /user/deletecomment/:comment_id Delete Comment
 * @apiGroup user
 * @apiParam {String} uid The user ID
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.post('/deletecomment/:comment_id', users.deletecomment);
/**
 * @api {get} /user/:followed_id/followers List Followers of User
 * @apiGroup user
 * @apiSuccess {Object[]} followers Follower List
 * @apiSuccess {String} followers.friendship_id Friendship ID
 * @apiSuccess {String} followers.uid User ID of Follower
 * @apiSuccess {String} followers.uname User Name of Follower
 * @apiSuccess {String} followers.ureal_name User Real Name of Follower
 * @apiSuccess {String} followers.avatar internal photo reference of the Follower's avatar
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 *      //the other success fields
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.get('/:followed_id/followers', users.getfollowers);
/**
 * @api {get} /user/:follower_id/followings List Followings of User
 * @apiGroup user
 * @apiSuccess {Object[]} followings Following List
 * @apiSuccess {String} followings.friendship_id Friendship ID
 * @apiSuccess {String} followings.uid User ID of Following
 * @apiSuccess {String} followings.uname User Name of Following
 * @apiSuccess {String} followings.ureal_name User Real Name of Following
 * @apiSuccess {String} followings.avatar internal photo reference of the Following's avatar
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 *      //the other success fields
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.get('/:follower_id/followings', users.getfollowings);
/**
 * @api {get} /user/usercomments/:uid List Comments of User
 * @apiGroup user
 * @apiParam {Number} page Page Number of the Required Page
 * @apiParam {Number} count Number of Comments per Page
 * @apiSuccess {Object[]} comments Comment List
 * @apiSuccess {String} comments.comment_id Comment ID
 * @apiSuccess {String} comments.timestamp Date of Creation of the Comment, DD/MM/YYYY
 * @apiSuccess {String} comments.text Comment Text
 * @apiSuccess {String} comments.lid ID of the Location that the Comment is about
 * @apiSuccess {String} comments.name Name of the Location that the Comment is about
 * @apiSuccess {String} comments.comment_photo Internal photo reference of the Comment Photo
 * @apiSuccess {String} comments.location_photo Internal photo reference of the Title Photo
 * @apiSuccess {String} total_pages Number of the maximal Pages of this comment list
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 *      //the other success fields
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.get('/usercomments/:uid', users.usercomments);
/**
 * @api {get} /user/profile/:uid View Profile of the given User
 * @apiGroup user
 * @apiParam {String} current_id User ID of 'me'
 * @apiSuccess {String} uid The user ID
 * @apiSuccess {String} uname User name
 * @apiSuccess {String} ureal_name User real name
 * @apiSuccess {String} birthday User birthday
 * @apiSuccess {String} avatar internal photo reference of the User avatar
 * @apiSuccess {String} city City of the User
 * @apiSuccess {Number} can_follow Can this user be followed? 1, yes. 0, no(already followed, it is 'me')
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 *      //the other success fields
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.get('/profile/:uid', users.userinfo);
/**
 * @api {get} /user/photo Download Single Photo
 * @apiGroup user
 * @apiParam {String} photo_ref internal photo reference
 * @apiSuccess {File} photo binary stream of image file, file name is identical with photo_ref
 * @apiSuccessExample {image} Success
 * {
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.get('/photo', locations.download_single_photo);
/**
 * @api {get} /user/:uid/checkins List my Checkins
 * @apiGroup user
 * @apiParam {Number} page the required page, pagination
 * @apiParam {Number} count count of results per page, pagination
 * @apiSuccess {Object[]} checkins List of checkins
 * @apiSuccess {String} checkins.lid Location ID
 * @apiSuccess {String} checkins.name Location Name
 * @apiSuccess {String} checkins.photo internal photo reference of title photo for the Location
 * @apiSuccess {String} checkins.timestamp timestamp of checkin, DD/MM/YYYY
 * @apiSuccess {Number} total_pages the maximal number of pages of this list of checkins
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 *      //the other success fields
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.get('/:uid/checkins', users.list_my_checkins);
/**
 * @api {get} /user/search Search for users given keywords
 * @apiGroup user
 * @apiParam {String} keyword keyword
 * @apiParam {String} uid user ID of 'me'
 * @apiSuccess {Object[]} users List of users
 * @apiSuccess {String} users.uid User ID
 * @apiSuccess {String} users.uname User Name
 * @apiSuccess {String} users.avatar internal photo reference of avatar
 * @apiSuccess {Number} users.can_follow Can this user be followed? 1, yes. 0, no(already followed, it is 'me')
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 *      //the other success fields
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.get('/search', users.search_users);
router.get('/:uid/history', users.list_my_history);
/**
 * @api {delete} /user/:uid/delete User Deregister
 * @apiGroup user
 * @apiParam {String} device_id device ID
 * @apiSuccessExample {json} Success
 * {
 *      "ret_code": "0",
 * }
 * @apiErrorExample {json} Error
 * {
 *      "ret_code": "1",
 *      "err_msg": error message
 * }
 */
router.delete('/:uid/delete', users.delete_user);
module.exports = router;
