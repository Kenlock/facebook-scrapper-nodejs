'using strict'

const configuration = require("../configuration.json");
const LOGGING_LEVELS = {
    DEBUG: "DEBUG",
    ALL: "ALL",
    ERROR: "ERROR",
    INFO: "INFO"
}
function getLineDetails() {
    let stack = (new Error().stack).split("at ");
    let logLineDetails = stack[3].trim();
    return logLineDetails;
}

function getStack() {
    let stack = (new Error().stack).split("at ");
    return `\n${stack.slice(3).join()}`;
}

module.exports = {
    info: (...args) => console.log("INFO", new Date().toUTCString(), ...args),
    log: (...args) => console.log("LOG", new Date().toUTCString(), ...args),
    warn: (...args) => console.warn("WARN", new Date().toUTCString(), getLineDetails(), ...args, getStack()),
    error: (...args) => console.error("ERROR", new Date().toUTCString(), getLineDetails(), ...args, getStack()),
    critical: (...args) => console.error("CRITICAL", new Date().toUTCString(), getLineDetails(), ...args, getStack()),
    debug: (...args) => {
        if (configuration.loggerLevel === LOGGING_LEVELS.DEBUG) {
            console.debug("DEBUG", new Date().toUTCString(), getLineDetails(), ...args);
        }
    },
}