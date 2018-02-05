/**
 * Created by littsler on 17.05.17.
 */
/**
 * Send json response added with success ret_code
 * @param res should be a res object
 * @param data {object}the object to be converted into a json response
 */
function json_success(res, data) {
    let json_data = Object.assign({'ret_code': '0'}, data);
    return res.json(json_data);
}
/**
 * Send json response added with error ret_code & err_msg
 * @param res should be a res object
 * @param err {object}
 */
function json_error(res, err) {
    let json_data = null;
    if (typeof err === 'string') {
        json_data = {'ret_code': '1', 'err_msg': err};
    } else if (err.hasOwnProperty('err_code')) {
        json_data = {
            'ret_code': '1',
            'err_code': err.err_code,
            'err_msg': err.message
        };
    } else {
        json_data = {'ret_code': '1', 'err_msg': err.message};
    }
    res.status(200);
    return res.json(json_data);
}

/**
 * Send a binary array as an image file through an HTTP response
 * @param res HTTP response
 * @param data binary data of an image file
 * @param filename the filename as which the binary data is named through the HTTP response
 */
function send_binary_as_file(res, data, filename) {
    let header = {
        'Content-Type': 'image/jpeg',
        'Content-disposition': 'attachment;filename=' + filename,
        'Content-length': data.length
    };
    res.writeHeader(200, header);
    res.end(data);
}

module.exports = {
    json_success,
    json_error,
    send_binary_as_file
};