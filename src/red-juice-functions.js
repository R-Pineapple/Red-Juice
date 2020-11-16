let giac;
try {
    giac = require('bindings')('giac');
} catch (e) {
    console.error(e);
    giac = {
        evaluate: function () {
            return 'true';
        }
    };
}

module.exports = function (random) {

    /**
   * All functions with number of arguments, if it is an operator and function to call
   */
    const functions = {
    /**
     * Transform expression into latex
     * @param {string} v
     * @return {string}
     */
        '$': function (v) {
            const res = giac.evaluate(`latex(${v})`);
            if (/^"\[([^\],],?)*]"$/g.test(res))
                return '\\begin{bmatrix} ' + res.slice(2, res.length - 2).split(',').join(' \\\\ ') + ' \\end{bmatrix}';
            return res.substr(1, res.length - 2);
        },
        /**
     * Simplify value
     * @param {string} v
     * @return {string}
     */
        '@': function (v) {
            return giac.evaluate(`simplify(${v})`);
        },
        // RANDOM
        'rand': {
            nargs: 2,
            exec: function (args) {
                return random.newInt(parseFloat(args[0]), parseFloat(args[1]) + 1);
            }
        },
        'randnn': {
            nargs: 2,
            exec: function (args) {
                if (parseFloat(args[0]) === 0 && parseFloat(args[1]) === 0)
                    return 0;
                let rand;
                do {
                    rand = random.newInt(parseFloat(args[0]), parseFloat(args[1]) + 1);
                } while (rand === 0);
                return rand;
            }
        },
        'randvec': {
            nargs: 3,
            exec: function (args) {
                const vec = [];
                for (let i = 0; i < Math.max(0, parseInt(args[0])); i++) {
                    vec.push(random.newInt(parseFloat(args[1]), parseFloat(args[2]) + 1));
                }
                return '[' + vec.join(',') + ']';
            }
        },
        'randmat': {
            nargs: 4,
            exec: function (args) {
                const mat = [];
                for (let i = 0; i < Math.max(0, parseInt(args[0])); i++) {
                    const vec = [];
                    for (let j = 0; j < Math.max(0, parseInt(args[1])); j++) {
                        vec.push(random.newInt(parseFloat(args[2]), parseFloat(args[3]) + 1));
                    }
                    mat.push('[' + vec.join(',') + ']');
                }
                return '[' + mat.join(',') + ']';
            }
        },
        // VECTOR AND MATRICES
        'get': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})[${args[1]}]`);
                return res.includes('ERROR:') ? args[0] : res;
            }
        },
        'ones': {
            nargs: 2,
            exec: function (args) {
                const mat = [];
                for (let i = 0; i < Math.max(0, parseInt(args[0])); i++) {
                    const vec = [];
                    for (let j = 0; j < Math.max(0, parseInt(args[1])); j++) {
                        vec.push(1);
                    }
                    mat.push('[' + vec.join(',') + ']');
                }
                return '[' + mat.join(',') + ']';
            }
        },
        'zeros': {
            nargs: 2,
            exec: function (args) {
                const mat = [];
                for (let i = 0; i < Math.max(0, parseInt(args[0])); i++) {
                    const vec = [];
                    for (let j = 0; j < Math.max(0, parseInt(args[1])); j++) {
                        vec.push(0);
                    }
                    mat.push('[' + vec.join(',') + ']');
                }
                return '[' + mat.join(',') + ']';
            }
        },
        // OPERATORS
        'neg': {
            nargs: 1,
            exec: function (args) {
                const res = giac.evaluate(`-(${args[0]})`);
                return res.includes('ERROR:') ? args[0] : res;
            }
        },
        'plus': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})+(${args[1]})`);
                return res.includes('ERROR:') ? 0 : res;
            }
        },
        'minus': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})-(${args[1]})`);
                return res.includes('ERROR:') ? 0 : res;
            }
        },
        'div': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})/(${args[1]})`);
                return res.includes('ERROR:') ? 0 : res;
            }
        },
        'mod': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})%(${args[1]})`);
                return res.includes('ERROR:') ? 0 : res;
            }
        },
        'pow': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})^(${args[1]})`);
                return res.includes('ERROR:') ? 0 : res;
            }
        },
        'times': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})*(${args[1]})`);
                return res.includes('ERROR:') ? 0 : res;
            }
        },
        'mtimes': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]}).*(${args[1]})`);
                if (res.includes('ERROR:'))
                    console.error(res);
                return res.includes('ERROR:') ? 0 : res;
            }
        },
        'eq': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})==(${args[1]})`);
                return res.includes('ERROR:') ? false : res;
            }
        },
        'neq': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})!=(${args[1]})`);
                return res.includes('ERROR:') ? false : res;
            }
        },
        'gte': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})>=(${args[1]})`);
                return res.includes('ERROR:') ? false : res;
            }
        },
        'lte': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})<=(${args[1]})`);
                return res.includes('ERROR:') ? false : res;
            }
        },
        'gt': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})>(${args[1]})`);
                return res.includes('ERROR:') ? false : res;
            }
        },
        'lt': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})<(${args[1]})`);
                return res.includes('ERROR:') ? false : res;
            }
        },
        'and': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})&&(${args[1]})`);
                return res.includes('ERROR:') ? false : res;
            }
        },
        'or': {
            nargs: 2,
            exec: function (args) {
                const res = giac.evaluate(`(${args[0]})||(${args[1]})`);
                return res.includes('ERROR:') ? false : res;
            }
        },
    };

    // 1 argument functions
    ['abs', 'sign', 'round', 'floor', 'frac', 'ceil', 're', 'im', 'arg', 'conj', 'factorial', 'sqrt', 'exp', 'log', 'ln',
        'log10', 'sin', 'cos', 'tan', 'cot', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
        'not', 'tran', 'rank', 'det', 'ker', 'image', 'idn', 'len']
        .forEach(function (fn) {
            functions[fn] = {
                nargs: 1,
                exec: function (args) {
                    const res = giac.evaluate(`${fn}(${args[0]})`);
                    return res.includes('ERROR:') ? args[0] : res;
                }
            };
        });

    // 2 arguments functions
    ['min', 'max', 'cross']
        .forEach(function (fn) {
            functions[fn] = {
                nargs: 2,
                exec: function (args) {
                    const res = giac.evaluate(`${fn}(${args[0]},${args[1]})`);
                    return res.includes('ERROR:') ? 0 : res;
                }
            };
        });

    // vector construct
    const vecfn = function (args) {
        return `[${args.join(',')}]`;
    };

    for (let i = 1; i <= 16; i++) {
        functions[`vec${i}`] = {
            nargs: i,
            exec: vecfn
        };
    }

    return functions;
};