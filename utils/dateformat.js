const moment = require('moment');
const format = 'DD/MM/YYYY';

/**
 * convert Date to String
 * @param date
 * @returns {string}
 */
function date_to_str(date) {
    return moment(date).format(format);
}

/**
 * convert String to Date
 * @param string
 * @returns {*|moment.Moment}
 */
function str_to_date(string) {
    return moment(string, format);
}

module.exports = {
    date_to_str, str_to_date
};