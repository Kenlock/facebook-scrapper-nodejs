'using strict'
function matchFirst(content, matchEx) {
    let match = content.match(matchEx);
    if (Array.isArray(match) && match.length > 0) {
        return match[0];
    }
    return false;

}

module.exports = {
    matchFirst: matchFirst
}