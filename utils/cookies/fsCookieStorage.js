'using strict'
const path = require("path")
const fs = require("fs");
const storageFolder = "./storage";

function storeCookie(userId, service, cookie) {
    let cookieFile = path.resolve(`${storageFolder}/${userId}.json`);
    if (!fs.existsSync(cookieFile)) {
        fs.writeFileSync(cookieFile, "{}");
    }
    let userCookieJar = JSON.parse(fs.readFileSync(cookieFile));
    userCookieJar[service] = cookie;
    fs.writeFileSync(cookieFile, JSON.stringify(userCookieJar));
}

function deleteCookie(userId, service) {
    let cookieFile = path.resolve(`${storageFolder}/${userId}.json`);
    if (!fs.existsSync(cookieFile)) {
        fs.writeFileSync(cookieFile, "{}");
    }
    let userCookieJar = JSON.parse(fs.readFileSync(cookieFile));
    if (Object.keys(userCookieJar).includes(service)) {
        delete userCookieJar[service];
        fs.writeFileSync(cookieFile, JSON.stringify(userCookieJar));
    }
    return true;
}

function getUserCookieJar(userId) {
    let cookieFile = path.resolve(`${storageFolder}/${userId}.json`);
    if (!fs.existsSync(cookieFile)) {
        fs.writeFileSync(cookieFile, "{}");
    }
    return JSON.parse(fs.readFileSync(cookieFile));
}

function getUserCookie(userId, service) {
    let cookieJar = getUserCookieJar(userId);
    return cookieJar[service];
};


module.exports = {
    getUserCookie: getUserCookie,
    getUserCookieJar: getUserCookieJar,
    storeCookie: storeCookie,
    deleteCookie: deleteCookie
}