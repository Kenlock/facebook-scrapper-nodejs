/**
 * This is called on each page crawled and contains the list of post id scrapped.
 * @callback PostIdListCallback
 * @param {string[]} post_ids
 * @param {string[]} user_ids
 * @param {number} current_iteration
 */

 /**
 * This is called on each page crawled, if specified the crawling operation will
 * continune while it evaluates to true.
 * If this is not speficied the crawling operation will continue until the last page is reached
 * @callback PostIdListWhileCallback
 * @param {string[]} post_ids
 * @param {number} current_iteration
 * @param {string} rawHtmlUTF8Content
 * @returns {boolean}
 */

/**
 * This is called on each page crawled and contains the list of user ids scrapped.
 * @callback MemberListCallback
 * @param {string[]} user_ids
 * @param {number} current_iteration
 */

 

 /**
 * This is called on each page crawled, if specified the crawling operation will
 * continune while it evaluates to true.
 * If this is not speficied the crawling operation will continue until the last page is reached
 * @callback MemberCrawlWhileCallback
 * @param {string[]} user_ids
 * @param {number} current_iteration
 * @param {string} rawHtmlUTF8Content
 * @returns {boolean}
 */

/**
* @typedef {object} ReactionContainer
* @property {number} total_count who reacted
* @property {Reaction[]} reactions haha, like, mad, etc.
*/

/**
* @typedef {object} Reaction
* @property {string} user_id who reacted
* @property {string} reaction haha, like, mad, etc.
*/

/**
 * @typedef {object} Media
 * @property {string} type who reacted
 * @property {string} uri haha, like, mad, etc.
 * @property {string} alt haha, like, mad, etc.
 */

/**
* @typedef {object} Mention
* @property {string} offset who reacted
* @property {string} text haha, like, mad, etc.
* @property {string} id haha, like, mad, etc.
*/

/**
 * @typedef {object} FbCommentReply
 * @property {string} id
 * @property {string} poster_id
 * @property {number} created_time
 * @property {string} date_text
 * @property {string} text
 * @property {string} text_html
 * @property {Media[]} media
 * @property {string} media_html
 * @property {Mention[]} mentions
 * @property {ReactionContainer} reactions
 */

/**
 * @typedef {object} FbComment
 * @property {string} id
 * @property {string} poster_id
 * @property {number} created_time
 * @property {string} date_text
 * @property {string} text
 * @property {string} text_html
 * @property {Media[]} media
 * @property {string} media_html
 * @property {Mention[]} mentions
 * @property {ReactionContainer} reactions
 * @property {FbCommentReply[]} replies
 */

/**
 * @typedef {object} FbPost
 * @property {string} id
 * @property {string} poster_id
 * @property {number} created_time
 * @property {string} date_text
 * @property {string} text
 * @property {string} text_html
 * @property {Media[]} media
 * @property {string} media_html
 * @property {Mention[]} mentions
 * @property {ReactionContainer} reactions
 * @property {FbComment[]} comments
 */

/**
 * @typedef {object} GroupCrawlResult
 * @property {Set<number>} postIdSet
 * @property {Set<number>} memberIdSet
 */