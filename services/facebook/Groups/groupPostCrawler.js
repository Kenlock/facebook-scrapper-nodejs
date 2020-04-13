'using strict'
const serviceConfiguration = require("../configuration.json");
const serviceName = serviceConfiguration.name;
const errors = require("../errors");
const authentication = require("../../../utils/authentication");
const queryString = require("query-string");
const logger = require("../../../utils/Logger");
const matchFirst = require("../../../utils/utils").matchFirst;
const common = require("../common")

/**
 * @param {string} content 
 */
function extractPostsId(content) {
    const regex = /(?<=mall_post_)(.*?)(?=(:[0-9])|(%3A[0-9])|(\\u00253A[0-9]))/g;
    return [... new Set(content.match(regex))];
}

function extractMemberIds(content) {
    const regex = /(?<=member_id=)(.*?)(?=[&$])/g;
    return [... new Set(content.match(regex))];
}

/**
 * 
 * @param {string} content 
 * @param {string} user_id 
 * @param {string} groupId 
 * @param {string} async_get_token 
 * @param {string} ajaxpipe_token 
 * @param {string} hsi 
 * @param {string} rev 
 * @param {number} currentPage 
 * @param {number} start_index 
 */
function getNextPagePath(content, user_id, groupId, async_get_token, ajaxpipe_token, hsi, rev, currentPage, start_index) {
    const basePartialDocumentURL = "ajax/pagelet/generic.php/GroupEntstreamPagelet";
    let end_cursor_regex = new RegExp('(?<=story_index:' + start_index + ',end_cursor:")(.*?)(?=")');

    let story_index = start_index + (10 * (currentPage - 1));
    if (currentPage > 1) {
        end_cursor_regex = new RegExp('(?<="story_index":' + story_index + ',"end_cursor":")(.*?)(?=")');
    }

    let end_cursor = matchFirst(content, end_cursor_regex);
    if (!end_cursor) {
        throw new Error(errors.INCORRECT_SOURCE_FORMAT);
    }

    let query = {
        fb_dtsg_ag: async_get_token,
        ajaxpipe: 1,
        ajaxpipe_token: ajaxpipe_token,
        no_script_path: 1,
        data: JSON.stringify({
            last_view_time: 0,
            is_first_story_seen: true,
            postIdentifiersToFilter: [],
            story_index: story_index,
            end_cursor: end_cursor,
            group_id: groupId,
            has_cards: true,
            multi_permalinks: [],
            posts_visible: story_index - 1,
            sorting_setting: "CHRONOLOGICAL",
            multipermalinks_stories_ids: null,
            exclude_multipermalink_stories: null
        }),
        __user: user_id,
        __a: 1,
        __req: `jsonp_${currentPage + 1}`,
        __pc: "PHASED:DEFAULT",
        dpr: 1.5,
        __rev: rev,
        __hsi: hsi,
        __adt: currentPage + 1,
    }

    let stringQuery = queryString.stringify(query);
    return `${basePartialDocumentURL}?${stringQuery}`;
}

/**
 * 
 * @param {Object} agent 
 * @param {string} currentContent 
 * @param {string} user_id 
 * @param {string} groupId 
 * @param {string} start_index 
 * @param {string} async_get_token 
 * @param {string} ajaxpipe_token 
 * @param {string} hsi 
 * @param {string} rev 
 * @param {number} currentPage 
 * @param {PostIdListCallback} callback - callback to handle current post id found in page 
 * @param {PostIdListWhileCallback} crawlWhile - currentPagePostsIdArray{string[]} An array of posts ids. currentPage{number} - Current page being crawled. currentContent{string} - Current content being parsed.
 * @return {Promise<GroupCrawlResult>}
 */
async function crawlGroupPostRecursivelyAsync(agent, currentContent, user_id, groupId, start_index, async_get_token, ajaxpipe_token, hsi, rev, currentPage, callback, crawlWhile,
    posts, members) {
    logger.debug("scraping page " + currentPage + "...\n");
    if (!posts) posts = new Set();
    if (!members) members = new Set();
    const postIds = extractPostsId(currentContent);
    const memberIds = extractMemberIds(currentContent);
    var crawlWhileFlag = (crawlWhile != null) ? crawlWhile(postIds, currentPage, currentContent) : 1;
    if (crawlWhileFlag) {
        if (postIds.length >= 10) {
            callback(postIds, memberIds, currentPage);
            const nextPagePath = getNextPagePath(currentContent, user_id, groupId, async_get_token, ajaxpipe_token, hsi, rev, currentPage, start_index);
            const nextPageURL = `${serviceConfiguration.baseURL}/${nextPagePath}`;
            const response = await agent.get(nextPageURL);
            const content = response.text;
            postIds.forEach(id => posts.add(id));
            memberIds.forEach(id => members.add(id));
            return crawlGroupPostRecursivelyAsync(agent, content, user_id, groupId, start_index, async_get_token, ajaxpipe_token, hsi, rev, currentPage + 1, callback, crawlWhile,
                posts, members
            )
        }
    }
    /** @type {GroupCrawlResult} */
    const result = {
        postIdSet: posts,
        memberIdSet: members
    };
    return result;
}

/**
 * 
 * @param {string} groupId 
 * @param {string} username 
 * @param {PostIdListCallback} callback - callback to handle current post id found in page 
 * @param {PostIdListWhileCallback} crawlWhile - currentPagePostsIdArray{string[]} An array of posts ids. currentPage{number} - Current page being crawled. currentContent{string} - Current content being parsed.
 */
async function crawlGroupPostsAsync(groupId, username, callback, crawlWhile) {
    const groupURL = `${serviceConfiguration.baseURL}/groups/${groupId}/?sorting_setting=CHRONOLOGICAL`;
    try {
        const credentials = authentication.keychain.getCredentials(serviceName, username);
        const cookie = await common.loginAsync(credentials.username, credentials.password);
        const agent = common.getAgent(cookie);
        const response = await agent.get(groupURL);
        const body = response.text;
        const async_get_token = matchFirst(body, /(?<="async_get_token":")(.*?)(?=")/);
        const ajaxpipe_token = matchFirst(body, /(?<="ajaxpipe_token":")(.*?)(?=")/);
        const rev = matchFirst(body, /(?<=server_revision":)[0-9]+(?=,)/);
        const hsi = matchFirst(body, /(?<="hsi":")(.*?)(?=")/);
        const user_id = matchFirst(cookie, /(?<=c_user=)(.*?)(?=;)/)
        const start_index = +matchFirst(body, /(?<=story_index:)\d+/);
        return await crawlGroupPostRecursivelyAsync(agent, body, user_id, groupId,
            start_index, async_get_token, ajaxpipe_token, hsi, rev, 1, callback, crawlWhile)
    } catch (e) {
        switch (e.message) {
            case errors.ErrorTypes.IncorrectCredentialsError:
                logger.error(e.message);
            case authentication.errors.ErrorTypes.CredentialsNotFoundError:
                logger.error(e.message);
            default:
                logger.critical(e);
                throw e;
        }
    }
}

module.exports = crawlGroupPostsAsync;