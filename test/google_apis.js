/**
 * Created by littsler on 26.05.17.
 */
const https = require('https');
const http = require('http');
const querystring = require('querystring');
const {wrap: async} = require('co');
const fs = require('fs');
const BSON = require('bson');
const bson = new BSON();
const sleep = require('sleep');

const googlemaps_host = 'maps.googleapis.com';
const api_key = 'AIzaSyAeV4VlXRvkI5q1m607ZOTGj10lMUzPyuQ';
const path_nearby_search = '/maps/api/place/nearbysearch/json?';
const path_location_detail = '/maps/api/place/details/json?';
const path_photo = '/maps/api/place/photo?';
const file_path = '/home/littsler/Dokumente/save.jpg';

photo_request = async(function* (photo_id) {
    let link = '';
    let query_options = {key: api_key, photoreference: photo_id, maxwidth: 400};
    let req_options = {
        hostname: googlemaps_host,
        path: path_photo + querystring.stringify(query_options),
        method: 'GET'
    };
    let promise = new Promise(function (resolve, reject) {
        let req = https.request(req_options);
        req.on('response', function (res) {
            res.on('data', function (chunk) {
                console.log(res.statusCode);
            });
            res.on('end', function () {
                console.log(res.statusCode);
                if (res.statusCode === 302) {
                    resolve(res.headers.location);
                } else {
                    console.error(res.statusCode);
                }
            });
        });
        req.on('error', function (err) {
            console.error(err);
        });
        req.end();
    });
    link = yield promise;
    console.log('link:' + link);
    if (link !== '') {
        let promise = new Promise(function (resolve, reject) {
            let req = https.get(link);
            req.on('response', function (res) {
                let image = '';
                res.setEncoding('binary');
                res.on('data', function (chunk) {
                    console.log(res);
                    image += chunk;
                });
                res.on('end', function () {
                    console.log(res);
                    resolve(fs.writeFileSync(file_path, image, 'binary'));
                });
            });
            req.end();
        });
        yield promise;
    }
    // fs.writeFileSync(file_path, result, 'binary');
});

nearby_search = async(function* (query_options) {
    query_options.key = api_key;
    let req_options = {
        hostname: googlemaps_host,
        path: path_nearby_search + querystring.stringify(query_options),
        method: 'GET',
    };
    let promise = new Promise(function (resolve, reject) {
        let result = '';
        let req = https.request(req_options);
        req.on('response', function (res) {
            res.setEncoding('binary');
            console.log(res);
            res.on('data', function (chunk) {
                console.log('onData:' + chunk);
                result += chunk;
            });
            res.on('end', function () {
                resolve(JSON.parse(result));
            });
        });
        req.on('error', function (err) {
            console.error(err);
        });
        req.end();
    });
    let result = yield promise;
    if (result.status === 'OK') {
        return result.results;
    } else {
        throw new Error(result.status);
    }
});

location_details = async(function* (place_id) {
    let query_options = {
        placeid: place_id,
        key: api_key
    };
    query_options.key = api_key;
    let req_options = {
        hostname: googlemaps_host,
        path: path_location_detail + querystring.stringify(query_options),
        method: 'GET',
    };
    let promise = new Promise(function (resolve, reject) {
        let result = '';
        let req = https.request(req_options);
        req.on('response', function (res) {
            res.on('data', function (chunk) {
                result += chunk;
            });
            res.on('end', function () {
                resolve(JSON.parse(result));
            });
        });
        req.on('error', function (err) {
            console.error(err);
        });
        req.end();
    });
    let result = yield promise;
    if (result.status === 'OK') {
        return result.result;
    } else {
        throw new Error(result.status);
    }
});

send_request = async(function* () {
    let query_obj = {
        photo_ref: 'avatar----59273858b26aba0019c1cd3e'
    };
    let query = querystring.stringify(query_obj);
    let options = {
        host: 'iptk-ss2017-team-golf-golf.7e14.starter-us-west-2.openshiftapps.com',
        path: '/location/photo?' + query,
        method: 'GET'
    };
    let promises = [];
    console.log(new Date());
    for (let i = 0; i < 5; i++) {
        let promise = new Promise(function (resolve, reject) {
            let req = http.request(options);
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
                res.on('error', function (err) {
                    console.error('test', err);
                });
            });
            req.on('error', function (err) {
                console.error('test', err);
            });
            req.end();
            console.log('begin');
        });
        promises.push(promise);
    }
    for (let i in promises) {
        let image = yield promises[i];
        console.log('#' + i + ' finished. length: ' + image.length());
    }
    console.log(new Date());
});

send_request();

// photo_request('CmRaAAAAXrtef3Jks3dsCug7GPkM9b-3yOv8hpRB5ompiRWvPDNhlVZy9yKuglVi62w8wFVYdioorDJkRJP4u1PvkwpF94uyYDO3w6-d46ZTz7lYzor9crYIP0yyrrJYq_YXba3OEhC4aLMQ4inZ-1oZi18Ex_TeGhSLXhWNS9HfeZivLcMj6vmzFwGhAA');