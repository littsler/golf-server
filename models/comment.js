/**
 * Created by zhuti on 2017/5/14.
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const commentschema = new Schema({
    timestamp: {type: Date, required: true},
    text: String,
    _lid: {type: String, ref: 'Location', required: true},
    pic: {type: Schema.Types.ObjectId, ref: 'Photo'},
    _uid: {type: Schema.Types.ObjectId, ref: 'User', required: true},//ref field means in which collection the id mentioned is going to be searched for
}, {versionKey: false});

commentschema.path('_uid').validate(function (uid, fn) {
    let User = mongoose.model('User');
    if (this.isNew) {
        User.find({_id: uid}).exec(function (err, users) {
            fn(!err && users.length > 0);
        });
    } else fn(true);
}, 'User not existing!');

commentschema.statics = {
    /**
     * Add a new comment
     * @param comment a new comment object
     * @param buffer a photo data, optional
     * @return {Promise.<TResult>}
     */
    add_comment: function (comment, buffer) {
        if (comment.timestamp && comment._lid && comment._uid) {
            if (buffer !== null && buffer !== undefined) {
                let Photo = mongoose.model('Photo');
                return Photo.new_photo(buffer, comment._uid, comment._lid).then(function (new_photo) {
                    comment.pic = new_photo._id;
                    return comment.save();
                })
            } else {
                return comment.save();
            }
        }
        else {
            throw new Error("Missing timestamp or location ID");
        }
    },

    /**
     * List comments given conditions, field projections and pagination, in a desc order of timestamp
     * @param conditions selection conditions
     * @param projections field projections
     * @param pagination pagination
     * @param separator seperator for concatenating avatar reference of user
     * @return {Promise.<TResult>}
     */
    list_comments: function (conditions, projections, pagination, separator) {
        let Comment = mongoose.model('Comment');
        return this.find(conditions, projections, pagination).lean().sort({_id: -1})
            .then(function (comments) {
                if (!projections || projections._lid == null) {
                    return Comment.populate(comments, {path: '_lid', select: 'name'});
                }
                return comments;
            }).then(function (comments) {
                if (!projections || projections._uid == null) {
                    return Comment.populate(comments, {
                        path: '_uid',
                        select: 'uname ureal_name avatar',
                        model: 'User'
                    }).then(function (comments) {
                        for (let i in comments) {
                            console.log(comments[i]);
                            if (comments[i]._uid == null || comments[i]._uid.avatar == null) {
                                continue;
                            }
                            comments[i]._uid['avatar_ref'] = 'avatar' + separator + comments[i]._uid._id;
                        }
                        return comments;
                    });
                }
                return comments;
            }).then(function (comments) {
                for (let i in comments) {
                    if (!comments[i].pic) {
                        continue;
                    }
                    comments[i]['comment_photo'] = comments[i].pic;
                    delete comments[i].pic;
                }
                return comments;
            });
    },

    /**
     * Delete a comment
     * @param comment_id comment ID to delete
     * @param uid 'my' user ID
     */
    delete_comment: function (comment_id, uid) {
        return this.findOneAndRemove({_id: comment_id, _uid: uid}).exec();
    },
    /**
     * Count all comments of the given user
     * @param uid user ID
     * @return {Promise}
     */
    count_all_my_comments: function (uid) {
        return this.count({_uid: uid}).exec();
    },
    /**
     * Count all comments of the given location
     * @param lid location ID
     * @return {Promise}
     */
    count_all_comments_per_location: function (lid) {
        return this.count({_lid: lid}).exec();
    }
};

module.exports = mongoose.model('Comment', commentschema);
