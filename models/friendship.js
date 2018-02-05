/**
 * Created by zhuti on 2017/5/25.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
/**
 * Friendship schema
 */
const friendshipschema = new Schema({
    follower_id: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    followed_id: {type: Schema.Types.ObjectId, ref: 'User', required: true},
});

friendshipschema.path('follower_id').validate(function (uid, fn) {
    let User = mongoose.model('User');
    if (this.isNew) {
        User.find({_id: uid}).exec(function (err, users) {
            fn(!err && users.length > 0);
        });
    } else fn(true);
}, 'Follower User not existing!');

friendshipschema.path('followed_id').validate(function (uid, fn) {
    let User = mongoose.model('User');
    if (this.isNew) {
        User.find({_id: uid}).exec(function (err, users) {
            fn(!err && users.length > 0);
        });
    } else fn(true);
}, 'Followed User not existing!');

friendshipschema.statics = {

    /**
     * Add a new followship
     * @param followship
     */
    add_followship: function (followship) {
        if (followship.follower_id && followship.followed_id) {
            return followship.save();
        }
        else {
            throw new Error("Missing follower id or followed id");
        }
    },
    /**
     * Delete the given followship
     * @param followship
     */
    delete_followship: function (followship) {
        return this.remove(followship, function (err, res) {
            if (err)
                return err;
        })
    },

    /**
     * Get all followings of the given user
     * @param _uid user ID
     * @param separator
     */
    get_followed: function (_uid, separator) {
        let Friendship = mongoose.model('Friendship');
        return this.find({'follower_id': _uid}, {'follower_id': 0}).lean().then(function (followeds) {
            return Friendship.populate(followeds, {path: 'followed_id', select: 'uname ureal_name avatar'}).then(function (followeds) {
                for (let i in followeds) {
                    if (followeds[i].followed_id.avatar == null) {
                        continue;
                    }
                    delete followeds[i].followed_id.avatar;
                    followeds[i].followed_id['avatar_ref'] = 'avatar' + separator + followeds[i].followed_id._id;
                }
                return followeds;
            });
        });
    },

    /**
     * Get all followers of the given user
     * @param _uid user ID
     * @param separator separator for user avatar reference
     */
    get_follower: function (_uid, separator) {
        let Friendship = mongoose.model('Friendship');
        return this.find({'followed_id': _uid}, {'followed_id': 0}).lean().then(function (followers) {
            return Friendship.populate(followers, {path: 'follower_id', select: 'uname ureal_name avatar'}).then(function (followers) {
                for (let i in followers) {
                    if (followers[i].follower_id.avatar == null) {
                        continue;
                    }
                    delete followers[i].follower_id.avatar;
                    followers[i].follower_id['avatar_ref'] = 'avatar' + separator + followers[i].follower_id._id;
                }
                return followers;
            });
        });
    },

    has_already_followed: function (follower, followed) {
        return this.count({follower_id: follower, followed_id: followed}).then(function (count) {
            return count > 0;
        })
    },
    /**
     * Delete the given user's friendships of both directions
     * @param uid user ID
     * @return {Promise|Promise.<TResult>|*}
     */
    delete_user: function (uid) {
        return this.remove({followed_id: uid}).then(function (err, friendship) {
            let Friendship = mongoose.model('Friendship');
            return Friendship.remove({follower_id: uid});
        })
    }
};

module.exports = mongoose.model('Friendship', friendshipschema);