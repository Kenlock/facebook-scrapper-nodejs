'using strict';

const ErrorTypes = {
    CredentialsNotFoundError: "CredentialsNotFoundError"
}

class CredentialsNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = ErrorTypes.CredentialsNotFoundError;
    }
}

module.exports = {
    CredentialsNotFoundError: CredentialsNotFoundError,
    ErrorTypes: ErrorTypes
}
