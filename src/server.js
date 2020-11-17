const express = require('express');
const interpreter = require('./red-juice.js');
const app = express();
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');

function ok(result) {
    return {
        version: interpreter.version,
        status: 'OK',
        result: result
    };
}

function error(text) {
    return {
        version: interpreter.version,
        status: 'KO',
        error: text
    };
}

app.enable('trust proxy');
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.all('/', function (req, res) {
    if(req.method !== 'GET') return res.status(400).json(error('Bad method.'));
    return res.json(ok());
});

app.all('/verify', function(req, res) {
    if(req.method !== 'POST') return res.status(400).json(error('Bad method.'));
    if (!req.body.code) return res.status(400).json(error('Missing code.'));
    try {
        const errors = interpreter.verify(req.body.code);
        return res.json(ok(errors));
    } catch(e) {
        return res.status(500).json(error(e));
    }
});

app.all('/eval', function(req, res) {
    if(req.method !== 'POST') return res.status(400).json(error('Bad method.'));
    if (!req.body.code) return res.status(400).json(error('Missing code.'));
    interpreter.random.seed = parseInt(req.body.seed);
    const sort_keys = req.body.sort_keys;
    const verified = req.body.verified;
    try {
        if(!verified) {
            const errors = interpreter.verify(req.body.code);
            if(errors.length > 0)
                return res.status(422).json(error('Code has errors.'));
        }
        const output = interpreter.eval(req.body.code);
        if(sort_keys) {
            output.sorted_keys = interpreter.sortKeys(output.content);
        }
        return res.json(ok(output));
    } catch(e) {
        return res.status(500).json(error(e));
    }
});

if(require.main !== module) {
    module.exports = app;
} else {
    const DEFAULT_HOST = '0.0.0.0';
    const DEFAULT_PORT = '8274';

    const host = process.argv.length > 3 ? process.argv[3] : DEFAULT_HOST;
    const port = process.argv.length > 2 ? process.argv[2] : DEFAULT_PORT;

    const server = app.listen(port, host, () => {
        console.log('Red Juice API running at \x1b[4m' + host + ':' + port + '\x1b[0m');
    });

    const closeApp = () => {
        server.close();
    };

    process.on('exit', closeApp);
    process.on('SIGINT', closeApp); // ctrl+c
    process.on('SIGTERM', closeApp); // other graceful stop
}
