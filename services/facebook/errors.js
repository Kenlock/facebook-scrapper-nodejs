'using strict';

const ErrorTypes = {
    IncorrectCredentialsError: "IncorrectCredentialsError",
    IncorrectSourceFormatError: "IncorrectSourceFormatError",
    ParsingError: "ParsingError"
}

class IncorrectCredentialsError extends Error {
    constructor(message) {
        super(message);
        this.name = ErrorTypes.IncorrectCredentialsError;
    }
}

class IncorrectSourceFormatError extends Error {
    constructor(message) {
        super(message);
        this.name = ErrorTypes.IncorrectSourceFormatError;
    }
}

class ParsingError extends Error {
    constructor(message) {
        super(message);
        this.name = ErrorTypes.ParsingError;
    }
}


module.exports = {
    IncorrectCredentialsError: IncorrectCredentialsError,
    IncorrectSourceFormatError: IncorrectSourceFormatError,
    ParsingError: ParsingError,
    ErrorTypes: ErrorTypes
}


// module.exports = {
//     INCORRECT_CREDENTIALS: "INCORRECT_CREDENTIALS",
//     INCORRECT_SOURCE_FORMAT: "INCORRECT_SOURCE_FORMAT"
// }