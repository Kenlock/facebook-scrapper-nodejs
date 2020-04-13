'using strict'
const serviceConfiguration = require("../configuration.json");
const serviceName = serviceConfiguration.name;
const errors = require("../errors");
const authentication = require("../../../utils/authentication");
const queryString = require("query-string");
const logger = require("../../../utils/Logger");
const matchFirst = require("../../../utils/utils").matchFirst;
const common = require("../common")

function getNextPathPath(gid, cursor, async_token, limit, rev, hsi, current_user_id) {
    const baseAjaxMembersURL = "ajax/browser/list/group_confirmed_members";
    const member_request_limit = serviceConfiguration.members_request_limit;
    let query = {
        gid: gid,
        order: "date",
        view: "list",
        limit: member_request_limit,
        sectiontype: "recently_joined",
        cursor: cursor,
        start: limit,
        av: current_user_id,
        fb_dtsg_ag: async_token,
        __user: current_user_id,
        __a: "1",
        __csr: "",
        __beoa: "0",
        __pc: "PHASED:DEFAULT",
        __rev: rev,
        __hsi: hsi
    }
    let stringQuery = queryString.stringify(query);
    return `${baseAjaxMembersURL}?${stringQuery}`;

}

function getMembers(content) {
    const regex = /(?<=member_id=)\d+/g;
    return [... new Set(content.match(regex))];
}

/**
 * 
 * @param {*} agent 
 * @param {Set} resultSet 
 * @param {string} content 
 * @param {string} gid 
 * @param {string} async_token 
 * @param {string} limit 
 * @param {string} rev 
 * @param {string} hsi 
 * @param {string} current_user_id 
 * @param {number} currentPage 
 * @param {MemberListCallback} callback 
 * @param {MemberCrawlWhileCallback} crawlWhile 
 */
async function crawlGroupMembersRecursivelyAsync(agent, resultSet, content, gid, async_token, limit, rev, hsi, current_user_id, currentPage, callback, crawlWhile) {
    const membersIds = getMembers(content);
    callback(membersIds, currentPage);
    var newEntry = false;
    membersIds.forEach(id => {
        if (!resultSet.has(id)) {
            newEntry = true;
            resultSet.add(id)
        }
    });
    var crawlWhileFlag = (crawlWhile != null) ? crawlWhile(membersIds, currentPage, content) : true;
    if (crawlWhileFlag && newEntry) {
        const cursor = matchFirst(content, /(?<=cursor=)(.*?)(?=&)/);
        const nextPagePath = getNextPathPath(gid, cursor, async_token, limit, rev, hsi, current_user_id);
        const nextPageURL = `${serviceConfiguration.baseURL}/${nextPagePath}`;
        const response = await agent.get(nextPageURL);
        const nextContent = response.text || response.body.toString();
        return await crawlGroupMembersRecursivelyAsync(agent, resultSet, nextContent, gid, async_token, limit, rev, hsi, current_user_id, currentPage + 1, callback, crawlWhile)

    }
    return resultSet;
}

/**
 * 
 * @param {string} groupId 
 * @param {string} username 
 * @param {MemberListCallback}
 * @param {MemberCrawlWhileCallback} crawlWhile
 * @returns {string[]} 
 */
async function crawlGroupMembersAsync(groupId, username, callback, crawlWhile) {
    const groupURL = `${serviceConfiguration.baseURL}/groups/${groupId}/members/`;
    try {
        const credentials = authentication.keychain.getCredentials(serviceName, username);
        const cookie = await common.loginAsync(credentials.username, credentials.password);
        const agent = common.getAgent(cookie);
        const response = await agent.get(groupURL);
        const body = response.text;
        const async_token = matchFirst(body, /(?<="async_get_token":")(.*?)(?=")/);
        const rev = matchFirst(body, /(?<="client_revision":)\d+/);
        const hsi = matchFirst(body, /(?<="hsi":")(.*?)(?=")/);
        const user_id = matchFirst(cookie, /(?<=c_user=)(.*?)(?=;)/)
        const limit = +matchFirst(body, /(?<=limit=)\d+/);
        var resultSet = new Set();
        const result = await crawlGroupMembersRecursivelyAsync(agent, resultSet, body, groupId, async_token, limit, rev, hsi, user_id, 1, callback, crawlWhile)
        return [... new Set(result)];
    } catch (e) {
        switch (e.message) {
            case errors.ErrorTypes.IncorrectCredentialsError:
                logger.error(e.message);
            case authentication.errors.ErrorTypes.CredentialsNotFoundError:
            default:
                logger.critical(e);
                throw e;
        }
    }

}

module.exports = crawlGroupMembersAsync;