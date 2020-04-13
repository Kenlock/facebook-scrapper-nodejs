'using strict'
const fs = require("fs");

const configuration = require("../../configuration.json");
switch (configuration.cookieStorageDriver) {
    case "FileSystem":
        module.exports = require("./fsCookieStorage");
        return;
    default:
        console.warn("PROP MISSING cookieStorageDriver.\nNo cookie storage driver defined in configuration.json.")
        module.exports = require("./fsCookieStorage");
        return;
}