'use strict'
const facebookService = require("./services/facebook");
const logger = require("./utils/Logger");
var fs = require('fs');

const entry_group = 257525760937251;
const user_keychain_id = "carlos2";

const rootFolder = `./exports/${entry_group}`;
const users_folder = `${rootFolder}/users`;
const posts_folder = `${rootFolder}/posts`;

let user_queue = [];
let explored_users = new Set();

let post_queue = [];
let explored_posts = new Set();

if (!fs.existsSync(rootFolder)) {
    fs.mkdirSync(rootFolder);
    fs.mkdirSync(users_folder);
    fs.mkdirSync(posts_folder);
}


let postCrawlingIsFinished = false;
let memberCrawlinIsFinished = false;
let userDataScrappingIsFinished = false;
let postDataScrappingIsFinished = false;

facebookService.client.crawlGroupPostsAsync(entry_group, user_keychain_id, function (posts_ids, user_ids, index) {
    posts_ids.forEach(pid => post_queue.push(pid));
    user_ids.forEach(uid => user_queue.push(uid));
    logger.debug("Group page ", index, " crawled");
}).then(function (result) {
    postCrawlingIsFinished = true;
    fs.writeFileSync(`${rootFolder}/group_crawler_results.json`, JSON.stringify(result, null, 4));
})

facebookService.client.crawlGroupMembersAsync(entry_group, user_keychain_id, function (user_ids, index) {
    user_ids.forEach(uid => user_queue.push(uid));
    logger.debug("Member page ", index, " crawled");
}).then(function (result) {
    memberCrawlinIsFinished = true;
    fs.writeFileSync(`${rootFolder}/member_crawler_results.json`, JSON.stringify(result, null, 4));
})


let userCheckInterval = setInterval(async function () {
    if (user_queue.length > 0) {
        let user_id_to_explore = user_queue.shift();
        if (!explored_users.has(user_id_to_explore)) {
            explored_users.add(user_id_to_explore);
            let userData = await facebookService.client.scrapeUserDataAsync(user_id_to_explore, user_keychain_id);
            fs.writeFileSync(`${users_folder}/${user_id_to_explore}.json`, JSON.stringify(userData, null, 4));
        }
    } else if (post_queue.length === 0 && postCrawlingIsFinished && memberCrawlinIsFinished) {
        userDataScrappingIsFinished = true;
        clearInterval(userCheckInterval);
    }
}, 10000);

let postsCheckInterval = setInterval(async function () {
    if (post_queue.length > 0) {
        let post_id_to_explore = post_queue.shift();
        if (!explored_posts.has(post_id_to_explore)) {
            explored_posts.add(post_id_to_explore);
            let postData = await facebookService.client.scrapePostDataAsync(entry_group, post_id_to_explore);
            /** @type {FbPost} */
            if (postData) {
                fs.writeFileSync(`${posts_folder}/${post_id_to_explore}.json`, JSON.stringify(postData, null, 4));
                let users = new Set();
                users.add(postData.poster_id);
                postData.reactions.reactions.forEach(post_reaction => {
                    users.add(post_reaction.user_id);
                });
                postData.comments.forEach(c => {
                    users.add(c.poster_id);
                    c.reactions.reactions.forEach(post_reaction => {
                        users.add(post_reaction.user_id);
                    })
                    c.replies.forEach(r => {
                        users.add(r.poster_id);
                        r.reactions.reactions.forEach(post_reaction => {
                            users.add(post_reaction.user_id);
                        })
                    })
                })
                users.forEach(u => {
                    user_queue.push(u);
                })
            } else {
                logger.warn("Post, ", post_id_to_explore, " coudln't be srapped");
            }
        }
    } else if (postCrawlingIsFinished) {
        postDataScrappingIsFinished = true;
        clearInterval(postsCheckInterval);
    }
}, 5000);


var driver = setInterval(function () {
    if (userDataScrappingIsFinished && postDataScrappingIsFinished) {
        fs.writeFileSync(`${rootFolder}/users_processed.json`, JSON.stringify(explored_users, null, 4));
        fs.writeFileSync(`${rootFolder}/posts_processed.json`, JSON.stringify(explored_posts, null, 4));
        logger.info("Done.")
        clearInterval(driver);
    }
}, 1000)


