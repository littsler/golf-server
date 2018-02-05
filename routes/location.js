const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({storage: multer.memoryStorage()});
const locations = require('../controllers/locations');
const users = require('../controllers/users');

/**
 * @api {get} /location/:lid/details View Location Detail
 * @apiGroup location
 * @apiParam {String} uid User ID of 'me'. Could be not provided if the client has not logged in
 * @apiSuccess {String} name Location name
 * @apiSuccess {String} address Location address
 * @apiSuccess {Number} open_now Is the location open now? 1: yes. 0: no
 * @apiSuccess {String} telephone Telephone number of the location
 * @apiSuccess {Number} avg_rate average rating of the location
 * @apiSuccess {Number} my_rate 'my' rating to the location. This field will be unavailable if no user ID of 'me' passed
 * @apiSuccess {Number} my_checkins Number of 'my' checkins at the location
 * @apiSuccess {Object[]} top_checkins Top users of checkins at the location. As default only the top 1 user is returned
 * @apiSuccess {String} top_checkins.uid user ID of the top checkin user
 * @apiSuccess {String} top_checkins.uname user name of the top checkin user
 * @apiSuccess {String} top_checkins.ureal_name user real name of the top checkin user
 * @apiSuccess {String} top_checkins.avatar internal photo reference of user avatar of the top checkin user
 * @apiSuccess {Number} top_checkins.times times of checkins of the top checkin user
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
router.get('/:lid/details', locations.details);
/**
 * @api {get} /location/:lid/comments List Comments of the Location
 * @apiGroup location
 * @apiParam {Number} page Page Number of the Required Page
 * @apiParam {Number} count Number of Comments per Page
 * @apiSuccess {Object[]} comments Comment List
 * @apiSuccess {String} comments.comment_id Comment ID
 * @apiSuccess {String} comments.timestamp Date of Creation of the Comment, DD/MM/YYYY
 * @apiSuccess {String} comments.text Comment Text
 * @apiSuccess {String} comments.uid ID of the User who submitted the Comment
 * @apiSuccess {String} comments.uname User Name of the User who submitted the Comment
 * @apiSuccess {String} comments.ureal_name User Real Name of the User who submitted the Comment
 * @apiSuccess {String} comments.avatar Internal photo reference of avatar of the User who submitted the Comment
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
router.get('/:lid/comments', locations.list_comments);
/**
 * @api {post} /location/:lid/user/:uid/addcomment Add a comment to the Location
 * @apiGroup location
 * @apiParam {String} text Comment text
 * @apiParam {String} timestamp Timestamp of the comment, DD/MM/YYYY
 * @apiParam {File} photo Photo of the comment
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
router.post('/:lid/user/:uid/addcomment', upload.single('photo'), locations.add_comment);
/**
 * @api {post} /location/:lid/user/:uid/addphotos Add photos to the Location
 * @apiGroup location
 * @apiParam {File[]} photos Photos to be added
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
router.post('/:lid/user/:uid/addphotos', upload.any(), locations.upload_photos);
/**
 * @api {post} /location/deletecomment/:comment_id Delete a comment
 * @apiGroup location
 * @apiParam {String} uid User ID of 'me' for the checking whether 'I' am the author of the comment
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
 * @api {get} /location/:lid/photos Query photo references of the location
 * @apiGroup location
 * @apiParam {Number} page Page Number of the Required Page
 * @apiParam {Number} count Number of Photos per Page
 * @apiSuccess {Object[]} photos Array of photo references
 * @apiSuccess {String} photos.photo_ref internal photo reference
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
router.get('/:lid/photos', locations.get_photos_per_location);
/**
 * @api {get} /location/search Nearby Searching
 * @apiGroup location
 * @apiParam {Number} lat latitude
 * @apiParam {Number} lng longitude
 * @apiParam {Number} radius
 * @apiParam {Number} types Types of the locations
 * @apiParam {Number} keyword
 * @apiParam {Number} name exact name of the location
 * @apiSuccess {Object[]} locations Array of locations
 * @apiSuccess {String} locations.name name of the location
 * @apiSuccess {String} locations.lid ID of the location
 * @apiSuccess {String} locations.lat latitude of the location
 * @apiSuccess {String} locations.lng longitude of the location
 * @apiSuccess {String} locations.photo internal photo reference of the title photo of the location
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
router.get('/search', locations.nearby_search);
/**
 * @api {get} /location/photo Download single Photo
 * @apiGroup location
 * @apiParam {String} photo_ref Internal Photo Reference
 * @apiSuccess {File} data binary stream of the photo. File name is identical with the photo reference
 * @apiSuccessExample {File} Success
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
 * @api {get} /location/:lid/summary Get Summary of a Location
 * @apiGroup location
 * @apiSuccess {String} name name of the location
 * @apiSuccess {String} address address of the location
 * @apiSuccess {String} lat latitude of the location
 * @apiSuccess {String} lng longitude of the location
 * @apiSuccess {String} photo_ref internal photo reference of the title photo of the location
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
router.get('/:lid/summary', locations.get_location_summary);
/**
 * @api {post} /location/:lid/user/:uid/checkin Check in at a Location
 * @apiGroup location
 * @apiParam {String} timestamp timestamp of the checkin, DD/MM/YYYY
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
router.post('/:lid/user/:uid/checkin', locations.checkin);
/**
 * @api {post} /location/:lid/user/:uid/rate Rate a Location
 * @apiGroup location
 * @apiParam {String} timestamp timestamp of the rating, DD/MM/YYYY
 * @apiParam {String} rate rate score
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
router.post('/:lid/user/:uid/rate', locations.set_rate);
module.exports = router;