'using strict'
const superagent = require("superagent");
const cookieStorage = require("../../utils/cookies/cookieStorage");
const serviceConfiguration = require("./configuration.json");
const serviceName = serviceConfiguration.name;
const errors = require("./errors");
const logger = require("../../utils/Logger");


function getAgent(cookie) {
    let agent = superagent.agent().set('User-Agent', "Firefox");
    if (cookie) {
        agent.set("Cookie", cookie);
    }
    return agent;
}

/**
 * 
 * @param {string} email 
 * @param {string} password 
 * @param {boolean} forceLogin 
 */
async function loginAsync(email, password, forceLogin) {
    /**
     * @type {string}
     */
    let userCookie = cookieStorage.getUserCookie(email, serviceName);
    if (userCookie && !forceLogin) {
        return userCookie;
    }
    logger.debug(`attempting to log in to ${serviceName}`);
    var agent = getAgent();

    var landingURL = serviceConfiguration.baseURL + serviceConfiguration.landingURL;
    var result = await agent.get(landingURL);

    var loginURL = serviceConfiguration.baseURL + serviceConfiguration.loginURL;
    var result = await agent
        .post(loginURL)
        .type('form')
        .send({ email: email })
        .send({ pass: password });

    /**
     * @type {string}
     */
    var cookie = result.req._headers.cookie;
    if (!cookie.indexOf("c_user")) {
        throw new errors.IncorrectCredentialsError(`Could not log in as user ${email}`)
    }

    cookieStorage.storeCookie(email, serviceName, cookie);
    return cookie;
}

function getMonth(month) {
    const match = month.toLowerCase().slice(0, 3);
    switch (match) {
        case "jan":
            return 0;
        case "feb":
            return 1;
        case "mar":
            return 2;
        case "apr":
            return 3;
        case "may":
            return 4;
        case "jun":
            return 5;
        case "jul":
            return 6;
        case "aug":
            return 7;
        case "sep":
            return 8;
        case "oct":
            return 9;
        case "nov":
            return 10;
        case "dec":
            return 11;
    }
    return -1;
}

module.exports = {
    getAgent: getAgent,
    loginAsync: loginAsync,
    getMonth: getMonth,
    errors: errors
}