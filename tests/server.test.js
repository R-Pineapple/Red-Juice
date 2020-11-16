const request = require('supertest');
const app = require('../src/server');

const data = {
    testCode: function (response, code) {
        if (response.statusCode !== code)
            console.log('' +
        response.request.method + ' ' + response.request.req.path + ' ' + code + ' > ' + response.statusCode + ' :\n' +
        '' + response.text);
    }
};

test('GET /', (done) => {
    request(app)
        .get('/')
        .then((response) => {
            data.testCode(response, 200);
            expect(response.statusCode).toBe(200);
            done();
        });
});

test('GET /unkown 404', (done) => {
    request(app)
        .get('/unknown')
        .then((response) => {
            data.testCode(response, 404);
            expect(response.statusCode).toBe(404);
            done();
        });
});

test('POST / 400', (done) => {
    request(app)
        .post('/')
        .then((response) => {
            data.testCode(response, 400);
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Bad method.');
            done();
        });
});

test('GET /verify 400', (done) => {
    request(app)
        .get('/verify')
        .then((response) => {
            data.testCode(response, 400);
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Bad method.');
            done();
        });
});

test('POST /verify 400', (done) => {
    request(app)
        .post('/verify')
        .then((response) => {
            data.testCode(response, 400);
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Missing code.');
            done();
        });
});

test('POST /verify 200 no errors', (done) => {
    request(app)
        .post('/verify')
        .send({code:
            'VAR A = RAND(-30, 10);\n' +
            'VAR A = SIN(A);'
        })
        .then((response) => {
            data.testCode(response, 200);
            expect(response.statusCode).toBe(200);
            expect(response.body.result).toEqual({
                errors: []
            });
            done();
        });
});

test('POST /verify 200 with errors', (done) => {
    request(app)
        .post('/verify')
        .send({code:
            '   VAR ABC_01;'
        })
        .then((response) => {
            data.testCode(response, 200);
            expect(response.statusCode).toBe(200);
            expect(response.body.result).toEqual({
                errors: [['Not enough tokens', 3, 13, 1]]
            });
            done();
        });
});

test('GET /eval 400', (done) => {
    request(app)
        .get('/eval')
        .then((response) => {
            data.testCode(response, 400);
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Bad method.');
            done();
        });
});

test('POST /eval 400', (done) => {
    request(app)
        .post('/eval')
        .then((response) => {
            data.testCode(response, 400);
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Missing code.');
            done();
        });
});


test('POST /eval 42', (done) => {
    request(app)
        .post('/eval')
        .send({
            code: '   VAR ABC_01;'
        })
        .then((response) => {
            data.testCode(response, 422);
            expect(response.statusCode).toBe(422);
            expect(response.body.error).toBe('Code has errors.');
            done();
        });
});

test('POST /eval 200', (done) => {
    request(app)
        .post('/eval')
        .send({
            seed: 46,
            code: '' +
                'VAR a = RAND(10,20)/RAND(1000,2000);\n' +
                '${a}$\n'
        })
        .then((response) => {
            data.testCode(response, 200);
            expect(response.statusCode).toBe(200);
            expect(response.body.result).toEqual({
                content: {
                    '':
              '$\\frac{19}{1731}$\n',
                }, timers: {}
            });
            done();
        });
});

test('POST /eval 200', (done) => {
    request(app)
        .post('/eval')
        .send({
            code: '' +
                'START result;\n' +
                '   result\n' +
                'END result;\n' +
                'START problem;\n' +
                '   problem\n' +
                'END problem;\n',
            sort_keys: true
        })
        .then((response) => {
            data.testCode(response, 200);
            expect(response.statusCode).toBe(200);
            expect(response.body.result).toEqual({
                content: {
                    '#result': 'result\n',
                    '#problem': 'problem\n'
                },
                timers: {},
                sorted_keys: ['#problem', '#result']
            });
            done();
        });
});
