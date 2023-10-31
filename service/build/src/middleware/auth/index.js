import config from 'config';
const API_KEY = config.get('localAuth');
const X_SHEPHERD_HEADER = 'x-shepherd-header';
const authValidate = async (req, res, next) => {
    const requestApiKey = req.headers[X_SHEPHERD_HEADER];
    try {
        if (requestApiKey === API_KEY)
            next();
        else
            throw new Error('Invalid API key');
    }
    catch (e) {
        next(e);
    }
};
export default authValidate;
