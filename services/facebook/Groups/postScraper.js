'using strict'
const authentication = require("../../../utils/authentication");
const serviceConfiguration = require("../configuration.json");
const serviceName = serviceConfiguration.name;
const errors = require("../errors");
const logger = require("../../../utils/Logger");
const common = require("../common")
const cheerio = require('cheerio')

const matchFirst = require("../../../utils/utils").matchFirst;
String.prototype.matchFirst = function (regex) { return matchFirst(this, regex) };

/**
 * 
 * @param {string} date_text 
 */
function parseDate(date_text) {
    let date = new Date();
    if (date_text.matchFirst(/.+ \d+, \d+ at \d+:\d+ ([Pp]|[Aa])[Mm]/)) {
        const normalizedDate = date_text.replace(" at", "");
        date = new Date(normalizedDate);
    }
    else if (date_text.matchFirst(/[Aa-zZ]+ \d+, \d+/)) {
        date = new Date(date_text);
        date.setHours(0, 0, 0, 0);
    }
    else if (date_text.matchFirst(/[Aa-zZ]+ \d+/)) {
        const monthday = date_text.split(" ");
        date.setMonth(common.getMonth(monthday[0]));
        date.setDate(+monthday[1]);
        date.setHours(0, 0, 0, 0);
    }
    else if (date_text.matchFirst(/yesterday at \d+:\d+ ([Pp]|[Aa])[Mm]/)) {
        const time = date_text.matchFirst(/\d+:\d+ ([Pp]|[Aa])[Mm]/).split(" ");
        const ampm = time[1].toLowerCase();
        const hoursMinutes = time[0].split(":");
        const minutes = hoursMinutes[1];
        let hours = 0;
        switch (ampm) {
            case "am":
                hours = +hoursMinutes[0];
                break;
            case "pm":
                hours = (+hoursMinutes[0]) + 12;
                break;
            default:
                logger.error("error getting time")
                throw new errors.ParsingError("error getting time");
        }
        date = new Date();
        date.setDate(date.getDate() - 1);
        date.setHours(hours, minutes, 0, 0);
    } else if (date_text.matchFirst(/hr/)) {
        const hours = date_text.matchFirst(/\d/);
        date.setHours(0, 0, 0, 0);
        date.setHours(date.getHours - hours);
    }
    else if (date_text.matchFirst(/min/)) {
        const minutes = date_text.matchFirst(/\d/);
        date.setHours(0, 0, 0, 0);
        date.setMinutes(date.getMinutes - minutes);
    }
    return date;
}

/**
 * 
 * @param {*} agent 
 * @param {string} path 
 * @param {FbCommentReply[]} replies 
 * @param {Set} insertedReplies 
 */
async function scrapeRepliesRecursivelyAsync(agent, path, replies, insertedReplies) {
    if (!replies) replies = [];
    if (!insertedReplies) insertedReplies = new Set();
    const getUrl = `${serviceConfiguration.baseMobileURL}/${path}`;
    const response = await agent.get(getUrl)
    const htmlBody = response.body.toString();
    const $ = cheerio.load(htmlBody);
    let replyNodes = $("div").filter((i, e) => !isNaN(e.attribs.id));
    if (replyNodes.length > 0) {
        // First element is ignored since is the original comment
        for (let i = replyNodes.length - 1; i > 0; i--) {
            let commentReplyNode = replyNodes[i];
            let commentData = await scrapeCommentDataFromCommentNodeAsync(agent, $, commentReplyNode);
            if (!insertedReplies.has(commentData.id)) {
                insertedReplies.add(commentData.id);
                replies.push(commentData);
            }
        }
        const nextPageLinkNode = $("[id*=comment_replies_more] a");
        if (nextPageLinkNode.length > 0) {
            const path = nextPageLinkNode[0].attribs.href;
            return await scrapeCommentsRecursivelyAsync(agent, path, replies, insertedReplies);
        }
    }
    return replies;
}

/**
 * 
 * @param {*} agent 
 * @param {string} htmlContent 
 * @param {string} path 
 * @param {number} currentPage 
 * @param {FbComment[]} comments 
 * @param {Set} insertedComments
 * @return {FbComment[]}
 */
async function scrapeCommentsRecursivelyAsync(agent, htmlContent, path, currentPage, comments, insertedComments) {
    const $ = cheerio.load(htmlContent);
    if (!path) {
        path = $("[id*=see_prev] a").attr("href");
        if(path){
            currentPage = +path.matchFirst(/(?<=p\=)\d+/);
        }
    }
    if (!comments) comments = [];
    if (!insertedComments) insertedComments = new Set();
    //Scrape
    let commentNodes = $("div").filter((i, e) => !isNaN(e.attribs.id));
    if (commentNodes.length > 0) {
        for (let i = commentNodes.length - 1; i >= 0; i--) {
            let commentNode = commentNodes[i];
            let commentData = await scrapeCommentDataFromCommentNodeAsync(agent, $, commentNode);
            let replies = await scrapeRepliesFromCommentNodeAsync(agent, $, commentNode);
            commentData.replies = replies;
            if (!insertedComments.has(commentData.id)) {
                insertedComments.add(commentData.id);
                comments.push(commentData);
            }
        };
        if(path){
            // only continue if there multiple pages
            const nextPage = currentPage + 10;
            path = path.replace(/(?<=p\=)\d+/, nextPage)
            const getUrl = `${serviceConfiguration.baseMobileURL}/${path}`;
            const response = await agent.get(getUrl)
            const htmlBody = response.body.toString();
            return await scrapeCommentsRecursivelyAsync(agent, htmlBody, path, nextPage, comments, insertedComments);
        }
    }
    return comments;
}

async function scrapeRepliesFromCommentNodeAsync(agent, $, commentNode) {
    //Replies
    const repliesLinkNode = $(commentNode).find("[id*=comment_replies]");
    let replies = []
    if (repliesLinkNode.length > 0) {
        const commentReplyPath = repliesLinkNode.find("a")[0].attribs.href;
        replies = await scrapeRepliesRecursivelyAsync(agent, commentReplyPath);
    }
    return replies;
}

async function scrapeCommentDataFromCommentNodeAsync(agent, $, commentNode) {
    const contentNodes = $(commentNode).find("div");
    const comment_id = commentNode.attribs.id;
    // Poster id
    const user_id = contentNodes.find("h3 a")[0]
        .attribs.href.replace(/\/|profile.php\?id=|\?(.*)+/g, "")

    // Date
    const date_text = contentNodes.find("abbr").text();
    const date = parseDate(date_text);

    // Text
    const postTextContentNode = $(contentNodes[1]);
    const postTextHTML = postTextContentNode.html();
    const postText = postTextContentNode.text();

    // Media if any
    /** @type {object|null} */
    const postMedia = $(contentNodes[2]).html();

    const reactionsNode = $(commentNode).find("a[href*='/ufi/reaction']");
    let commentReactions = {
        total_count: 0,
        reactions: []
    }

    if (reactionsNode.length > 0) {
        commentReactions = await scrapeEntReactionsAsync(agent, comment_id);
    }
    /** @type {FbComment} */
    const newComment = {
        id: comment_id,
        poster_id: user_id,
        created_time: date.getTime(),
        date_text: date_text,
        text: postText,
        text_html: postTextHTML,
        //TODO: add media parser
        media: [],
        media_html: postMedia,
        //TODO: add mention parser
        mentions: [],
        reactions: commentReactions
    };
    return newComment;
}

async function scrapeEntReactionsAsync(agent, postId) {
    const reactionsPath = `ufi/reaction/profile/browser/fetch/?limit=9999&total_count=9999&ft_ent_identifier=${postId}`;
    const getUrl = `${serviceConfiguration.baseMobileURL}/${reactionsPath}`;
    const response = await agent.get(getUrl)
    const htmlBody = response.body.toString();
    const $ = cheerio.load(htmlBody);
    const reactionNodes = $("li>table table").toArray();

    /**
     * @type {Reaction[]}
     */
    let reactionArray = [];
    reactionNodes.forEach((node, i) => {
        let user_id = $(node).find("a")[0].attribs.href.replace(/\/|profile.php\?id=|\?(.*)+/g, "");
        let reaction = $(node).find("img")[1].attribs.alt
        let reactionObject = {
            user_id: user_id,
            reaction: reaction
        }
        reactionArray.push(reactionObject);
    });

    /** @type {ReactionContainer} */
    return {
        total_count: reactionArray.length,
        reactions: reactionArray
    }
}

async function scrapePostDataAsync(groupId, postId, username) {
    const getUrl = `${serviceConfiguration.baseMobileURL}/groups/${groupId}?view=permalink&id=${postId}`;
    try {
        const credentials = authentication.keychain.getCredentials(serviceName, username);
        const cookie = await common.loginAsync(credentials.username, credentials.password);
        const agent = common.getAgent(cookie);
        const response = await agent.get(getUrl)
        const htmlBody = response.body.toString();
        const $ = cheerio.load(htmlBody);

        // Parsing
        const mainContentNode = $("div[data-ft*=top_level]");

        // Poster ID
        const poster_id = mainContentNode.data("ft").content_owner_id_new;

        // Date
        const date_text = mainContentNode.find("[data-ft*=W]").find("abbr").text();
        const date = parseDate(date_text);

        // Post Content
        const contentNode = $(mainContentNode.find(">div")[0]).find(">div")

        // Text
        const postTextContentNode = $(contentNode[1]);
        const postTextHTML = postTextContentNode.html();
        const postText = postTextContentNode.text();

        // Media if any
        /** @type {object|null} */
        const postMediaHTML = $(contentNode[2]).html();

        // Reactions
        const reactions = await scrapeEntReactionsAsync(agent, postId);
        const comments = await scrapeCommentsRecursivelyAsync(agent, htmlBody);

        /** @type {FbPost} */
        const postData = {
            id: poster_id,
            poster_id: poster_id,
            created_time: date,
            date_text: date_text,
            text: postText,
            text_html: postTextHTML,
            media_html: postMediaHTML,
            mentions: [],
            reactions: reactions,
            comments: comments
        }
        return postData;
    }
    catch (e) {
        switch (e.name) {
            case errors.ErrorTypes.ParsingError:
                return logger.error(e);
            default:
                logger.critical("Not found", e.response.error.path);
                throw e;
        }

    }
}

module.exports = scrapePostDataAsync;