'using strict'


module.exports = {
    crawlGroupPostsAsync: require("./Groups/groupPostCrawler"),
    crawlGroupMembersAsync: require("./Groups/crawlMembers"),
    scrapePostDataAsync: require("./Groups/postScraper"),
    scrapeUserDataAsync: require("./Users/userDataScraper")
}