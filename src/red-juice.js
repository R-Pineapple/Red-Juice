const random = {
    seed: new Date().getTime(),
    new: function () {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    },
    newFloat: function (min, max) {
        return this.new() * (max - min) + min;
    },
    newInt: function (min, max) {
        return Math.floor(this.newFloat(min, max));
    }
};

const functions = require('./red-juice-functions')(random);

/**
 * Red Juice interpreter v1.4.4
 */

const interpreter = {
    version: '1.4.4',
    debug: false, // put tdo comment when true, remove when done
    latex: true, // enable latex var output
    limit: 1e4, // limit of lines computed
    /**
   * Operators with priority and left assiociativity
   */
    operators: {
        '!': [8, false, 'not'],
        '.-': [8, false, 'neg'],
        'e^': [8, false, 'exp'],
        '~': [8, false, 'tran'],
        '^': [7, true, 'pow'],
        '%': [7, true, 'mod'],
        '*': [6, false, 'times'],
        '.*': [6, false, 'mtimes'],
        '/': [6, false, 'div'],
        '+': [5, false, 'plus'],
        '-': [5, false, 'minus'],
        '!=': [4, false, 'neq'],
        '==': [4, false, 'eq'],
        '>=': [4, false, 'gte'],
        '<=': [4, false, 'lte'],
        '>': [4, false, 'gt'],
        '<': [4, false, 'lt'],
        '&&': [3, false, 'and'],
        '||': [2, false, 'or'],
    },
    constants: ['e', 'pi', 'PI', 'Pi', 'i', 'infinity', 'inf', 'euler_gamma', 'true', 'True', 'false', 'False'],
    reserved: ['simplify'],
    blacklist: ['read', 'write'],
    random: random,
    /**
   * Check if javascript object is numeric
   * @param n
   * @return {boolean}
   */
    isNumeric: function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },
    /**
   * Check if javascript object is integer
   * @param n
   * @return {boolean}
   */
    isInteger: function (n) {
        return !isNaN(parseInt(n)) && isFinite(n) && /^\d*$/.test(n);
    },
    /**
   * Transform expression into latex
   * @param {string} v
   * @return {string}
   */
    giac2latex: function (v) {
        return interpreter.latex ? functions['$'](v) : v;
    },
    /**
   * Simplify value
   * @param {string} v
   * @return {string}
   */
    giacSimplify: functions['@'],
    /**
   * Evaluate a value returned by giac
   * @param {string|number} v
   * @return {boolean}
   */
    checkValue: function (v) {
        if (typeof v === 'number') {
            return v !== 0;
        } else if (typeof v === 'string') {
            return !(v.length === 0 || v === 'false' || v.startsWith('not(') || v == 0); // jshint ignore:line
            // can break if 'not(not(something))' but not likely to happen since 'not(something)' happen on '!var'
        } else {
            return true;
        }
    },
    /**
   * split a string expression into tokens
   * @param {string} exp
   * @param {boolean} [withIndexes]
   * @return {string[]|Array[]} tokens ([token, start index] if indexes)
   */
    tokenize: function (exp, withIndexes) {
    // first save space between 2 a-z words by ¤ then remove all spaces in string then replace .* by £*
        const expr2 = exp.replace(/([a-zA-Z0-9_]*) ([a-zA-Z0-9_]*)/g, '$1¤$2').replace(/\.\*/g, '£*');
        let output = [];
        const separators = '+-£*/%^,()=&|¤><![]~'; // valid separators
        let i0 = 0;
        let i;
        let char;
        for (i = 0; i < expr2.length; i++) {
            char = expr2[i].trim();
            if (char.length > 0) {
                if (separators.includes(char)) { // if current char is separator
                    char = char.replace(/£/g, '.'); // get back . from £
                    if (i > i0) { // save token before
                        output.push([expr2.substr(i0, i - i0).trim(), i0]);
                    }
                    // if token before is number followed by e, merge with + or -
                    if ((char === '-' || char === '+') && output.length > 0 && /^[0-9]*(\.[0-9]*)?e$/.test(output[output.length - 1][0]))
                        output[output.length - 1][0] += char;
                    else if (char !== '¤') // save separator as token if not word separator
                        output.push([char, i]);
                    i0 = i + 1;
                }
            } else if (i0 === i) {
                i0 = i + 1;
            }
        }
        if (i > i0) // save last token
            output.push([expr2.substr(i0, i - i0).trim(), i0]);
        const doubleSep = '&|=';
        const preEqual = '!<>';

        /**
     * Test if 2 tokens must be merged
     * @param a - first token
     * @param b - second token
     * @param c - [token before first]
     * @return {boolean} should be merged
     */
        function testMerge(a, b, c) {
            return (doubleSep.includes(a) && a.length === 1 && a === b) || // double separator
        (b === '=' && preEqual.includes(a) && a.length === 1) || // >= or <= or !=
        (a === 'e' && b === '^') || // exp
        (a === '.' && b === '*') || // mtimes
        (interpreter.isNumeric(b) && (a.endsWith('-') || a.endsWith('+')) && '+-*/%^=&|><(,!'.includes(c[c.length - 1]));
            // number preceded by + or - and token before is symbol
        }

        // join two separators of same char in output
        for (i = output.length - 1; i > 0; i--) {
            if (testMerge(output[i - 1][0], output[i][0], i > 1 ? output[i - 2][0] : undefined)) {
                output[i - 1][0] += output[i][0];
                output.splice(i, 1);
            } else if ('+-*/%^=&|><(,!'.includes(output[i - 1][0]) && output[i][0] === '-') {
                output[i][0] = '.-';
            }
        }
        return withIndexes ? output : output.map(t => t[0]);
    },
    /**
   * Verify tokens and returns errors found
   * @param {Object} env - defined variables
   * @param {string[]} tokens
   * @return {Array[]} errors with [error text, token index]
   */
    verifyTokens: function (env, tokens) {
        if (interpreter.debug)
            console.log('verifyTokens : ', tokens.join(' '));
        const errors = [];
        let fni = []; // functions positions stack
        let nargs = []; // functions args number stack
        let par = []; // left parenthesis indexes stack
        let brac = []; // left bracket indexes stack
        tokens.forEach(function (token, i) {
            // test if is valid variable word, numeric value or operator token
            if (!/^([a-zA-Z][a-zA-Z0-9_]*|-?[0-9]*(\.[0-9]*)?(e[-+]?[0-9]+)?|[()+\-*/^><,%![\]~]|==|<=|>=|.-|!=|&&|e\^|\|\||\.\*)$/.test(token)) {
                errors.push(['Invalid token "' + token + '"', i]);
            } else if (!interpreter.operators[token]) { // token is not operator
                if (functions[token.toLowerCase()]) { // token is known function
                    fni.push(i); // add function to stack
                    nargs.push(0);
                    if (i + 1 === tokens.length || tokens[i + 1] !== '(') { // next token is not left parenthesis
                        errors.push(['Uncalled function', i]);
                        fni.pop(); // remove function from stack
                        nargs.pop();
                    }
                } else if (token === '(') {
                    par.push(i);
                } else if (token === ')') {
                    // there is functions defined and the last left parenthesis is a function one
                    if (fni.length > 0 && par[par.length - 1] === fni[fni.length - 1] + 1) {
                        if (i - fni[fni.length - 1] > 2) // there is more tokens than function ( )
                            nargs[nargs.length - 1]++; // add one to argument list
                        if (nargs[nargs.length - 1] !== functions[tokens[fni[fni.length - 1]].toLowerCase()].nargs)
                            errors.push(['Invalid number of arguments', fni[fni.length - 1]]);
                        fni.pop(); // remove function from stack
                        nargs.pop();
                    }
                    if (par.length > 0) { // close an open left parenthesis
                        par.pop();
                    } else {
                        errors.push(['Invalid parenthesis', i]);
                    }
                } else if (token === ',') { // argument separator
                    if (brac.length > 0 && brac[brac.length - 1] > par[par.length - 1])
                        errors.push(['Argument separator outside of function', i]);
                    else if (fni.length > 0) // add argument to current function in stack
                        nargs[nargs.length - 1]++;
                    else
                        errors.push(['Argument separator outside of function', i]);
                } else if (token === '[') {
                    if (i === 0 || !/^([a-zA-Z][a-zA-Z0-9_]*|\)|])$/.test(tokens[i - 1]))
                        errors.push(['Invalid bracket', i]);
                    brac.push(i);
                } else if (token === ']') {
                    if (brac.length > 0) { // close an open left bracket
                        const left = brac.pop();
                        if (i - left < 2)
                            errors.push(['Empty brackets', i]);
                    } else {
                        errors.push(['Invalid bracket', i]);
                    }
                } else if (!interpreter.isNumeric(token) && !interpreter.constants.includes(token) && env[token] === undefined) { // not numeric token and not in environment
                    errors.push(['Unresolved token "' + token + '"', i]);
                }
            }
            if (interpreter.debug)
                console.log(i + ' token : ' + token + ' | fni : [' + fni.join(', ') + '] | nargs : [' + nargs.join(', ') + '] | par : [' + par.join(', ') + ']');
        });
        // error for each left parenthesis and bracket not closed
        par.forEach(function (i) {
            errors.push(['Unclosed parenthesis', i]);
        });
        brac.forEach(function (i) {
            errors.push(['Unclosed bracket', i]);
        });
        return errors;
    },
    /**
   * Transform infix notation into postfix notation
   * @param {string[]} tokens - infix tokens
   * @return {string[]} postfix tokens
   */
    shuntingYard: function (tokens) {
        if (interpreter.debug)
            console.log('shuntingYard : ', tokens.join(' '));
        const output = [];
        const stack = [];
        let error = false;

        function topStack() {
            return stack[stack.length - 1];
        }

        tokens.forEach(function (token, i) {
            if (error)
                return;
            if (token === ',') { // argument separator
                // push stack tokens until left parenthesis
                while (topStack() !== '(' && stack.length > 0) {
                    output.push(stack.pop());
                }
                if (stack.length === 0) // parenthesis not found
                    error = true;
            } else if (interpreter.operators[token]) { // operator
                // compare with operator on stack and push inferior operators to output
                while (stack.length > 0 &&
          ((interpreter.operators[topStack()] &&
            (interpreter.operators[topStack()][0] > interpreter.operators[token][0] ||
              !interpreter.operators[topStack()][1] &&
              interpreter.operators[topStack()][0] === interpreter.operators[token][0])
          ) || functions[topStack().toLowerCase()])
                ) {
                    output.push(stack.pop());
                }
                stack.push(token); // then add to stack
            } else if (token === '(' || token === '[' || functions[token.toLowerCase()]) { // left parenthesis or function
                stack.push(token); // add to stack
            } else if (token === ')') { // right parenthesis
                // push stack tokens until left parenthesis
                while (topStack() !== '(' && stack.length > 0) {
                    output.push(stack.pop());
                }
                if (stack.length === 0) // parenthesis not found
                    error = true;
                else {
                    stack.pop(); // remove left parenthesis from stack
                    if (stack.length > 0 && functions[topStack().toLowerCase()])
                        output.push(stack.pop()); // push from stack if top token is function
                }
            } else if (token === ']') { // right bracket
                // push stack tokens until left bracket
                while (topStack() !== '[' && stack.length > 0) {
                    output.push(stack.pop());
                }
                if (stack.length === 0) // bracket not found
                    error = true;
                else {
                    stack.pop(); // remove left bracket from stack
                    output.push('get');
                }
            } else {
                output.push(token); // push any other token (numeric value or variable) into output
            }
            if (interpreter.debug)
                console.log(i + ' token : ' + token + ' | output : ' + output.join(' ') + ' | stack : ' + stack.join(' '));
        });
        while (stack.length > 0) // push remaining tokens into output
            output.push(stack.pop());
        if (error || output.includes('(') || output.includes(')')) // on error or parenthesis in output return nothing
            return [];
        return output;
    },
    /**
   * Verify if expression will not fail when computed
   * @param {string[]} ifTokens - infix tokens
   * @return {boolean} valid
   */
    verifyExpr: function (ifTokens) {
        const pfTokens = interpreter.shuntingYard(ifTokens); // get postfix tokens
        if (pfTokens.length === 0 && ifTokens.length > 0) // error in shuntingYard
            return false;
        if (interpreter.debug)
            console.log('verifyExpr : ', pfTokens.join(' '));
        let stack = 0; // stack is just the length
        let stackError = false;
        let fn; // current function
        pfTokens.forEach(function (token, i) {
            if (stackError)
                return;
            if (interpreter.operators[token])
                token = interpreter.operators[token][2]; // get function of operator
            fn = functions[token.toLowerCase()];
            if (fn) { // if token is function or operator
                // check if enough arguments in stack
                if (stack < fn.nargs) {
                    stackError = true;
                } else { // remove used arguments from stack and add one
                    stack -= (fn.nargs - 1);
                }
            } else { // add token to stack
                stack++;
            }
            if (interpreter.debug)
                console.log(i + ' token : ' + token + ' | stack : ' + stack);
        });
        return !(stack > 1 || stackError); // fail if there is too much output in stack or error during eval
    },
    /**
   * Evaluate an expression (must be verified beforehand or unexpected behavior may occur)
   * @param {Object} env - defined variables
   * @param {string[]} ifTokens - infix tokens
   * @return {Object} evaluated value
   */
    evalExpr: function (env, ifTokens) {
        const pfTokens = interpreter.shuntingYard(ifTokens); // get postfix tokens
        if (interpreter.debug)
            console.log('evalExpr : ', pfTokens.join(' '));
        const stack = []; // current stack
        let stackError = false;
        let fn; // current function
        pfTokens.forEach(function (token, i) {
            if (stackError)
                return;
            if (interpreter.operators[token])
                token = interpreter.operators[token][2]; // get function of operator
            fn = functions[token.toLowerCase()];
            if (fn) { // if token is function or operator
                // check if enough arguments in stack
                if (stack.length < fn.nargs) {
                    stackError = true;
                } else { // execute the function by taking enough arguments from stack the push the result in the stack
                    stack.push(fn.exec(stack.splice(stack.length - fn.nargs, fn.nargs)));
                }
            } else if (interpreter.isNumeric(token) || interpreter.constants.includes(token)) {
                stack.push(token); // push numeric value into stack
            } else if (env[token] !== undefined) {
                stack.push(env[token]); // push defined value into stack
            } else {
                stack.push(0); // push 0 for undefined value
            }
            if (interpreter.debug)
                console.log(i + ' token : ' + token + ' | stack : ' + stack.join(' '));
        });
        return stack[0]; // return first element from stack
    },
    /**
   * Verify the given code and return errors found
   * @param {string} code
   * @return {Array[]} errors with [error text, start, end, line number]
   */
    verify: function (code) {
        const env = {};
        const errors = [];
        const condStack = []; // stack of condition indexes
        const lastCondStack = []; // stack of last condition keyword
        const blocks = []; // stack of block definitions
        const loopStack = []; // stack of loop condition indexes
        const lines = ('\n' + code).split('\n'); // add line before to shift line numbers by one

        /**
     * @param {Array[]} tokens
     * @param {number} i - line number
     * @param {string} line
     * @param {number} n - first token of expression
     */
        function verifyExprInLine(i, line, tokens, n) {
            const exprTokens = tokens.slice(n).map(t => t[0]);
            const exprErrors = interpreter.verifyTokens(env, exprTokens);
            if (exprErrors.length > 0) {
                // add any error to list with correct token index
                exprErrors.forEach(function (e) {
                    const token = tokens[e[1] + n];
                    errors.push([e[0], token[1], token[1] + token[0].length, i]);
                });
            } else if (!interpreter.verifyExpr(exprTokens)) { // postfix tokens cannot be computed correctly
                errors.push(['Invalid expression', tokens[n][1], line.indexOf(';'), i]);
            }
        }

        lines.forEach(function (line, ln) {
            if (line.trim().length > 0) {
                if (line.includes('#')) // remove comments from line
                    line = line.substr(0, line.indexOf('#'));
                if (line.includes(';')) { // line of code
                    if (line.lastIndexOf(';') !== line.indexOf(';'))
                        errors.push(['Multiple statements in one line', line.indexOf(';') + 1, line.lastIndexOf(';'), ln]);
                    const tokens = interpreter.tokenize(line.substr(0, line.indexOf(';')), true);
                    switch (tokens[0][0].toLowerCase()) {
                    case 'var': // assignment
                        if (tokens.length < 3)
                            errors.push(['Not enough tokens', tokens[0][1], line.indexOf(';'), ln]);
                        else {
                            let i = 2;
                            let error = false;
                            while (tokens[i][0] === '[') {
                                if (!interpreter.isInteger(tokens[i + 1][0]) && !env[tokens[i + 1][0]])
                                    errors.push([interpreter.isNumeric(tokens[i + 1][0]) ? `Invalid integer "${tokens[i + 1][0]}"` :
                                        `Unresolved token "${tokens[i + 1][0]}"`, tokens[i + 1][1], tokens[i + 1][1] + tokens[i + 1][0].length, ln]);
                                if (tokens[i + 2][0] !== ']') {
                                    error = true;
                                    errors.push(['Invalid assignment', tokens[0][1], line.indexOf(';'), ln]);
                                    break;
                                }
                                i += 3;
                            }
                            if (error)
                                break;
                            if (tokens[i][0] !== '=')
                                errors.push(['Invalid assignment', tokens[0][1], line.indexOf(';'), ln]);
                            else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(tokens[1][0]))
                                errors.push(['Invalid name for variable', tokens[1][1], tokens[1][1] + tokens[1][0].length, ln]);
                            else if (functions[tokens[1][0].toLowerCase()] ||
                    interpreter.constants.includes(tokens[1][0]) ||
                    interpreter.reserved.includes(tokens[1][0].toLowerCase()))
                                errors.push(['Restricted variable name', tokens[1][1], tokens[1][1] + tokens[1][0].length, ln]);
                            else if (i > 2 && !env[tokens[1][0]]) {
                                errors.push([`Unresolved token "${tokens[1][0]}"`, tokens[ln][1], tokens[1][1] + tokens[1][0].length, ln]);
                            } else {
                                verifyExprInLine(ln, line, tokens, i + 1);
                                env[tokens[1][0]] = 'tmp'; // add variable to environment
                            }
                        }
                        break;
                    case 'if': // new condition
                        condStack.push(ln); // register condition in stack
                        lastCondStack.push(tokens[0][0].toLowerCase());
                        if (tokens.length < 2)
                            errors.push(['Not enough tokens', tokens[0][1], line.indexOf(';'), ln]);
                        else
                            verifyExprInLine(ln, line, tokens, 1);
                        break;
                    case 'elif': // condition branch
                        if (condStack.length === 0) // no condition in stack
                            errors.push(['No condition detected before', tokens[0][1], line.indexOf(';'), ln]);
                        else if ((loopStack.length > 0 && condStack[condStack.length - 1] < loopStack[loopStack.length - 1]) ||
                  (blocks.length > 0 && condStack[condStack.length - 1] < blocks[blocks.length - 1][1]))
                            errors.push(['Cannot end condition branch here', tokens[0][1], line.indexOf(';'), ln]);
                        else if (lastCondStack[lastCondStack.length - 1] === 'else') // if last condition keyword is else
                            errors.push(['Invalid condition branch', tokens[0][1], line.indexOf(';'), ln]);
                        else if (tokens.length < 2)
                            errors.push(['Not enough tokens', tokens[0][1], line.indexOf(';'), ln]);
                        else {
                            lastCondStack.push(tokens[0][0].toLowerCase());
                            verifyExprInLine(ln, line, tokens, 1);
                        }
                        break;
                    case 'else': // condition branch
                        if (condStack.length === 0) // no condition in stack
                            errors.push(['No condition detected before', tokens[0][1], line.indexOf(';'), ln]);
                        else if ((loopStack.length > 0 && condStack[condStack.length - 1] < loopStack[loopStack.length - 1]) ||
                  (blocks.length > 0 && condStack[condStack.length - 1] < blocks[blocks.length - 1][1]))
                            errors.push(['Cannot end condition branch here', tokens[0][1], line.indexOf(';'), ln]);
                        else
                            lastCondStack.push(tokens[0][0].toLowerCase());
                        break;
                    case 'endif':
                        if (condStack.length === 0) // no condition in stack
                            errors.push(['No condition detected before', tokens[0][1], line.indexOf(';'), ln]);
                        else if ((loopStack.length > 0 && condStack[condStack.length - 1] < loopStack[loopStack.length - 1]) ||
                  (blocks.length > 0 && condStack[condStack.length - 1] < blocks[blocks.length - 1][1]))
                            errors.push(['Cannot end condition branch here', tokens[0][1], line.indexOf(';'), ln]);
                        if (tokens.length > 1)
                            errors.push(['Too many tokens', tokens[1][1], line.indexOf(';'), ln]);
                        condStack.pop(); // remove condition from stack
                        lastCondStack.pop();
                        break;
                    case 'while':
                        loopStack.push(ln); // register loop in stack
                        if (tokens.length < 2)
                            errors.push(['Not enough tokens', tokens[0][1], line.indexOf(';'), ln]);
                        else
                            verifyExprInLine(ln, line, tokens, 1);
                        break;
                    case 'endwhile':
                        if (loopStack.length === 0) // no condition in stack
                            errors.push(['No loop detected before', tokens[0][1], line.indexOf(';'), ln]);
                        else if ((condStack.length > 0 && loopStack[loopStack.length - 1] < condStack[condStack.length - 1]) ||
                  (blocks.length > 0 && loopStack[loopStack.length - 1] < blocks[blocks.length - 1][1]))
                            errors.push(['Cannot end loop here', tokens[0][1], line.indexOf(';'), ln]);
                        if (tokens.length > 1)
                            errors.push(['Too many tokens', tokens[1][1], line.indexOf(';'), ln]);
                        loopStack.pop(); // remove condition from stack
                        break;
                    case 'start':
                        if (tokens.length < 2)
                            errors.push(['Not enough tokens', tokens[0][1], line.indexOf(';'), ln]);
                        else {
                            if (tokens.length > 2)
                                errors.push(['Too many tokens', tokens[2][1], line.indexOf(';'), ln]);
                            blocks.push([tokens[1][0], ln]); // add block to stack
                        }
                        break;
                    case 'end':
                        if (tokens.length < 2)
                            errors.push(['Not enough tokens', tokens[0][1], line.indexOf(';'), ln]);
                        else {
                            if (tokens.length > 2)
                                errors.push(['Too many tokens', tokens[2][1], line.indexOf(';'), ln]);
                            if (blocks.length === 0) // no block in stack
                                errors.push(['No block detected before', tokens[0][1], line.indexOf(';'), ln]);
                            else if ((condStack.length > 0 && blocks[blocks.length - 1][1] < condStack[condStack.length - 1]) ||
                    (loopStack.length > 0 && blocks[blocks.length - 1][1] < loopStack[loopStack.length - 1]))
                                errors.push(['Cannot end block here', tokens[0][1], line.indexOf(';'), ln]);
                            else if (blocks[blocks.length - 1][0] === tokens[1][0]) // if it is the top block of stack
                                blocks.pop(); // remove block from stack
                            else
                                errors.push(['Invalid end of block', tokens[0][1], tokens[1][1] + tokens[1][0].length, ln]);
                        }
                        break;
                    case 'time':
                        if (tokens.length < 2)
                            errors.push(['Not enough tokens', tokens[0][1], line.indexOf(';'), ln]);
                        else {
                            if (tokens.length > 2)
                                errors.push(['Too many tokens', tokens[2][1], line.indexOf(';'), ln]);
                            if (!interpreter.isNumeric(tokens[1][0]))
                                errors.push(['Not a number', tokens[1][1], tokens[1][1] + tokens[1][0].length, ln]);
                        }
                        break;
                    default:
                        errors.push(['Invalid keyword "' + tokens[0][0] + '"', tokens[0][1], tokens[0][1] + tokens[0][0].length, ln]);
                        break;
                    }
                }
            }
        }
        )
        ;
        // error for not closed parts
        blocks.forEach(function (block) {
            const tokens = interpreter.tokenize(lines[block[1]].substr(0, lines[block[1]].indexOf(';')), true);
            errors.push(['Block is not closed', tokens[0][1], tokens[1][1] + tokens[1][0].length, block[1]]);
        });
        // error for not closed conditions
        condStack.forEach(function (ifIndex) {
            const tokens = interpreter.tokenize(lines[ifIndex].substr(0, lines[ifIndex].indexOf(';')), true);
            errors.push(['Condition is not closed', tokens[0][1], lines[ifIndex].indexOf(';'), ifIndex]);
        });
        // error for not closed loops
        loopStack.forEach(function (loIndex) {
            const tokens = interpreter.tokenize(lines[loIndex].substr(0, lines[loIndex].indexOf(';')), true);
            errors.push(['Loop is not closed', tokens[0][1], lines[loIndex].indexOf(';'), loIndex]);
        });
        return errors;
    },
    /**
   * Parse code and extract condition tree
   * @param {string[]} lines
   * @return {Object<number,{end:number,branches:number[]}>} output
   */
    getConditionTree: function (lines) {
        const conditionStack = []; // stack of condition indexes
        const output = {};
        lines.forEach(function (line, i) {
            line = line.trim();
            if (line.length > 0) {
                if (line.includes('#')) // remove comments from line
                    line = line.substr(0, line.indexOf('#'));
                if (line.includes(';')) { // line of code
                    const keyword = line.substr(0, line.indexOf(';')).split(' ')[0];
                    switch (keyword.toLowerCase()) {
                    case 'if': // register new condition in tree
                        conditionStack.push(i);
                        output[i] = {
                            end: -1,
                            branches: [i]
                        };
                        break;
                    case 'elif':
                    case 'else': // register new branch in current condition
                        output[conditionStack[conditionStack.length - 1]].branches.push(i);
                        break;
                    case 'endif': // register end point of current condition
                        output[conditionStack.pop()].end = i;
                        break;
                    }
                }
            }
        });
        return output;
    },
    /**
   * Calculate value to attribute to environment
   * @param {string|undefined} v - previous var
   * @param {Array} path
   * @param {string} value
   * @return {string} output
   */
    setVar(v, path, value) {
        if (path.length === 0) {
            return value;
        } else {
            if (v.indexOf('matrix') === 0)
                v = v.substr('matrix'.length);
            if (v.indexOf('[') !== 0)
                return value;
            for (let i = 0; i < path.length; i++) {
                if (!interpreter.isInteger(path[i]))
                    return value;
                path[i] = parseInt(path[i]);
            }
            let i0 = 0;
            let level = 0;
            const tmp = [];
            for (let i = 0; i < v.length; i++) {
                switch (v[i]) {
                case '[':
                    level++;
                    if (tmp.length < level) {
                        tmp.push([]);
                    } else {
                        tmp[level - 1] = [];
                    }
                    i0 = i + 1;
                    break;
                case ',':
                    if (level === tmp.length)
                        tmp[level - 1].push(v.slice(i0, i));
                    else
                        tmp[level - 1].push(tmp[level]);
                    i0 = i + 1;
                    break;
                case ']':
                    if (level === tmp.length)
                        tmp[level - 1].push(v.slice(i0, i));
                    else
                        tmp[level - 1].push(tmp[level]);
                    level--;
                    break;
                }
            }

            const m0 = tmp[0];

            /**
       * Check if 2 arrays are equals
       * @param a1
       * @param a2
       * @return {boolean}
       */
            const arEq = function (a1, a2) {
                if (a1.length !== a2.length)
                    return false;
                for (let i = 0; i < a1.length; i++)
                    if (a1[i] !== a2[i])
                        return false;
                return true;
            };

            /**
       * Replace recursively
       * @param m - tree/value
       * @param p - current path
       * @return {*} - modified tree/value
       */
            const replace = function (m, p) {
                if (arEq(p, path))
                    return value;
                else if (m instanceof Array) {
                    const p1 = p.slice(0);
                    p1.push(0);
                    for (let i = 0; i < m.length; i++) {
                        p1[p1.length - 1] = i;
                        m[i] = replace(m[i], p1);
                    }
                    return m;
                } else {
                    return m;
                }
            };

            /**
       * Flatten tree into string
       * @param m
       * @return {string} output
       */
            const flatten = function (m) {
                if (m instanceof Array) {
                    return '[' + m.map(x => flatten(x)).join(',') + ']';
                } else {
                    return m;
                }
            };
            return flatten(replace(m0, []));
        }
    },
    /**
   * Format output line with defined variables
   * @param {Object} env - defined variables
   * @param {string} line
   * @return {string} output
   */
    getOutputLine(env, line) {
        line = line.trim().replace(/(\+-)/g, 'µùç').replace(/(--)/g, 'ç²ù'); // escape +- et -- already there

        // detect conditions and interpret them
        let cursor = 0;
        let bracket = -1;

        function replaceVarValue(fragment) {
            let fragment2 = fragment;
            Object.keys(env).forEach(function (key) {
                const re = new RegExp('{' + key + '}', 'g');
                if (re.test(fragment2))
                    fragment2 = fragment2.replace(re, '(' + env[key] + ')');
            });
            return fragment2;
        }

        function gotoClosingBracket() {
            let level = 0;
            while (level >= 0 && cursor + 1 < line.length) { // go to closing bracket
                switch (line[++cursor]) {
                case '{':
                    level++;
                    break;
                case '}':
                    level--;
                    break;
                }
            }
            return level;
        }

        while (cursor < line.length) {
            switch (line[cursor]) {
            case '{': // possible condition
                bracket = cursor;
                break;
            case '}': // nah it wasnt
                bracket = -1;
                break;
            case ':':
                if (bracket >= 0) { // condition detected, lets check its expression
                    let tokens = interpreter.tokenize(line.substr(bracket + 1, cursor - bracket - 1));
                    if (tokens.length === 1 && tokens[0] === 'simplify') {
                        if (interpreter.debug)
                            console.log('detected simplify :', tokens.join(' '));
                        let tmp = cursor;
                        let level = gotoClosingBracket();
                        if (level >= 0) { // not closed condition
                            if (interpreter.debug)
                                console.log('not closed simplify', line.substr(bracket));
                            cursor = tmp + 1;
                        } else { // keep inside and simplify value
                            let fragI = line.substr(tmp + 1, cursor - tmp - 1);

                            let skipSimplify = false;
                            for (let i = 0; i < interpreter.blacklist.length; i++) {
                                if (fragI.includes(interpreter.blacklist[i])) {
                                    skipSimplify = true;
                                    break;
                                }
                            }

                            let fragO;
                            if (skipSimplify) {
                                fragO = `\\color{Red}{${fragI}}`;
                            } else {
                                let fragT = replaceVarValue(fragI); // replace each variable in fragment by its value
                                fragO = interpreter.giacSimplify(fragT);
                                if (fragO !== 'undef' && fragO !== 'nde') {
                                    fragO = interpreter.giac2latex(fragO);
                                } else { // simplify failed
                                    fragO = interpreter.giac2latex(fragT);
                                    if (fragO === '\\,\\mathrm{undef}\\,' || fragO === 'nde') // 2latex failed
                                        fragO = interpreter.giac2latex(fragI);
                                    if (fragO === '\\,\\mathrm{undef}\\,' || fragO === 'nde') // 2latex failed
                                        fragO = fragI;
                                    fragO = `\\color{Red}{${fragO}}`;
                                }
                            }

                            line = line.substr(0, bracket) + fragO.replace(/\n/g, '') + line.substr(cursor + 1);
                            cursor = bracket - 1;
                        }
                        bracket = -1;
                    } else if (interpreter.verifyTokens(env, tokens).length === 0) { // no error, its a valid expression
                        if (interpreter.debug)
                            console.log('detected expr :', tokens.join(' '));
                        let keep = interpreter.checkValue(interpreter.evalExpr(env, tokens));
                        let tmp = cursor;
                        let level = gotoClosingBracket();
                        if (level >= 0) { // not closed condition
                            if (interpreter.debug)
                                console.log('not closed condition', line.substr(bracket));
                            cursor = tmp + 1;
                        } else if (keep) { // keep inside value
                            line = line.substr(0, bracket) + line.substr(tmp + 1, cursor - tmp - 1) + line.substr(cursor + 1);
                            cursor = bracket - 1;
                        } else { // remove condition and inside value
                            line = line.substr(0, bracket) + line.substr(cursor + 1);
                            cursor = bracket - 1;
                        }
                        bracket = -1;
                    }
                }
                break;
            }
            cursor++;
        }

        // replace each variable in line by its value
        Object.keys(env).forEach(function (key) {
            const re = new RegExp('{' + key + '}', 'g');
            if (re.test(line))
                line = line.replace(re, interpreter.giac2latex(env[key])).replace(/\n/g, '');
        });
        // replace new +- and -- and put back +- and -- already there
        return line.replace(/(\+-)/g, '-').replace(/(--)/g, '+').replace(/(µùç)/g, '+-').replace(/(ç²ù)/g, '--');
    },
    /**
   * Evaluate the given code and return computed text (must be verified beforehand or unexpected behavior may occur)
   * @param {string} code
   * @return {Object<string,string>} output
   */
    eval: function (code) {
        const env = {};
        const lines = code.split('\n');
        const conditionTree = interpreter.getConditionTree(lines);
        const output = {
            content: {},
            timers: {}
        };
        const conditionStack = []; // stack of conditions
        const loopStack = []; // stack of loops
        let currentBlock = '';

        let cursor = 0;
        let computed = 0;

        while (cursor < lines.length && computed < interpreter.limit) { // while end line not reached
            let line = lines[cursor]; // get current line
            if (interpreter.debug)
                console.log(`eval ${cursor}:"${line.trim()}"`);
            if (line.trim().length > 0) {
                if (line.includes('#')) // remove comments from line
                    line = line.substr(0, line.indexOf('#'));
                if (line.includes(';')) { // line of code
                    const tokens = interpreter.tokenize(line.substr(0, line.indexOf(';')));
                    let i, path, cond, found;
                    switch (tokens[0].toLowerCase()) {
                    case 'var': // assignment, add new var to environment
                        i = 2;
                        path = [];
                        while (tokens[i] === '[') {
                            path.push(env[tokens[i + 1]] || tokens[i + 1]);
                            i += 3;
                        }
                        env[tokens[1]] = interpreter.setVar(env[tokens[1]], path, interpreter.evalExpr(env, tokens.slice(i + 1)));
                        break;
                    case 'if': // new condition
                        cond = conditionTree[cursor]; // get condition from tree
                        conditionStack.push(cond); // add current condition to stack
                        found = false;
                        // test each branch condition in order
                        for (let c = 0; c < cond.branches.length; c++) {
                            let condLine = lines[cond.branches[c]];
                            let condTokens = interpreter.tokenize(condLine.substr(0, condLine.indexOf(';')));
                            if (condTokens[0].toLowerCase() === 'else' ||
                  interpreter.checkValue(interpreter.evalExpr(env, condTokens.slice(1)))) {
                                found = true;
                                cursor = cond.branches[c]; // jump to correct branch
                                break;
                            }
                        }
                        if (!found) // no condition matched
                            cursor = cond.end;
                        break;
                    case 'elif':
                    case 'else': // condition branch
                        // jump to end of condition next iteration
                        cursor = conditionStack[conditionStack.length - 1].end - 1;
                        break;
                    case 'endif':
                        conditionStack.pop(); // remove current condition from stack
                        break;
                    case 'while': // new loop
                        if (interpreter.checkValue(interpreter.evalExpr(env, tokens.slice(1)))) {
                            loopStack.push(cursor); // add current loop index to stack
                        } else {
                            let level = 0;
                            for (let c = cursor + 1; c < lines.length; c++) {
                                let line2 = lines[c].trim().toLowerCase();
                                if (line2.includes(';')) {
                                    if (line2.indexOf('while') === 0) {
                                        level++;
                                    } else if (line2.indexOf('endwhile') === 0) {
                                        if (level === 0) {
                                            cursor = c;
                                            if (interpreter.debug)
                                                console.log(`Found next while end line ${cursor}`);
                                            break;
                                        } else {
                                            level--;
                                        }
                                    }
                                }
                            }
                        }
                        break;
                    case 'endwhile':
                        cursor = loopStack.pop() - 1;
                        break;
                    case 'start': // enter block
                        currentBlock += '#' + tokens[1];
                        break;
                    case 'end': // change block
                        currentBlock = currentBlock.substr(0, currentBlock.lastIndexOf('#'));
                        break;
                    case 'time':
                        output.timers[currentBlock] = parseFloat(tokens[1]);
                        break;
                    }
                } else { // line of output
                    let outputLine = interpreter.getOutputLine(env, line);
                    if (outputLine.length > 0)
                        output.content[currentBlock] = (output.content[currentBlock] || '') + outputLine + '\n';
                }
            }
            cursor++;
            computed++;
        }
        if (computed >= interpreter.limit)
            output.content[currentBlock] = (output.content[currentBlock] || '') + `Max computed lines reached (${interpreter.limit})\n`;
        return output;
    },
    /**
   * Sort the output keys and keep only necessary ones
   * @param {Object<string,string>} content
   * @return {string[]} output
   */
    sortKeys(content) {
        const tmp = Object.keys(content);
        let keys;
        if (tmp.includes('#problem') && tmp.includes('#result')) { // no subparts
            keys = ['', '#problem', '#hint', '#result', '#solution'];
        } else { // subparts
            keys = [''];
            tmp.forEach(function (key) {
                const spl = key.split('#');
                if (spl.length === 3) {
                    const name = spl[1];
                    if (!keys.includes('#' + name + '#problem') &&
            tmp.includes('#' + name + '#problem') &&
            tmp.includes('#' + name + '#result')) { // valid question not registered
                        keys.push('#' + name + '#problem', '#' + name + '#hint', '#' + name + '#result', '#' + name + '#solution');
                    }
                }
            });
        }
        const toRemove = [];
        keys.forEach(function (key) {
            if (content[key] === undefined)
                toRemove.push(keys.indexOf(key));
        });
        toRemove.sort();
        toRemove.reverse().forEach(function (i) {
            keys.splice(i, 1);
        });
        return keys;
    }
};

module.exports = interpreter;

// CLI
if (require.main === module) {
    const fs = require('fs');

    let error;
    let expectOutput;
    let expectSeed;

    const options = {
        file: undefined,
        verbose: false,
        help: false,
        quiet: false,
        debug: false,
        output: undefined,
        json: false,
        final: false,
        seed: undefined,
        latex: false
    };

    process.argv.slice(2).forEach(function (arg) {
        if (error)
            return;
        if (expectOutput) {
            if (arg.indexOf('-') === 0) {
                error = `expecting file, instead got '${arg}'`;
            } else {
                options.output = arg;
                expectOutput = false;
            }
        } else if (expectSeed) {
            if (arg.indexOf('-') === 0 || interpreter.isNumeric(arg)) {
                error = `expecting seed, instead got '${arg}'`;
            } else {
                options.seed = parseFloat(arg);
            }
        } else {
            switch (arg) {
            default:
                if (arg.indexOf('-') === 0) {
                    error = `invalid parameter '${arg}'`;
                } else if (options.file !== undefined) {
                    return; // ignore
                } else if (!fs.existsSync(arg)) {
                    error = `File '${arg}' not found`;
                } else {
                    options.file = arg;
                }
                return;
            case '-v':
            case '--verbose':
                options.verbose = true;
                return;
            case '-h':
            case '--help':
                options.help = true;
                return;
            case '-q':
            case '--quiet':
                options.quiet = true;
                return;
            case '-d':
            case '--debug':
                options.debug = true;
                return;
            case '-j':
            case '--json':
                options.json = true;
                return;
            case '-f':
            case '--final':
                options.final = true;
                return;
            case '-o':
            case '--output':
                expectOutput = true;
                options.json = true;
                return;
            case '-s':
            case '--seed':
                expectSeed = true;
                return;
            case '-l':
            case '--latex':
                options.latex = true;
                return;
            }
        }
    });

    if (!options.quiet && (!options.json || options.output !== undefined)) {
        console.log(`Red Juice v${interpreter.version}\n`);
    }

    if (options.verbose) {
        const mainLines = fs.readFileSync(process.argv[1], 'utf-8')
            .split('\n').filter(x => x.trim().length).length;
        const fnLines = fs.readFileSync(process.argv[1].replace('red-juice', 'red-juice-functions'), 'utf-8')
            .split('\n').filter(x => x.trim().length).length;
        console.log(`By Klemek
* ${Object.keys(functions).length} giac functions
* ${mainLines + fnLines} lines of code\n`);
    }

    if (error !== undefined)
        console.error(error + '\n');

    if (!error && !options.help && (options.file === undefined && process.stdin.isTTY))
        console.error('Please specify a file\n');

    if (error !== undefined || options.help || (options.file === undefined && process.stdin.isTTY)) {
        console.log(`Usage : node red-juice.js inputFile [-v][-h][-q][-d][-o outputFile][-j][-f][-s seed][-l]

-v / --verbose : more info
-h / --help : show this message
-q / --quiet : do not log output
-d / --debug : show debug log
-o / --output : indicate output file (activate json format)
-j / --json : json format
-f / --final : show as final exercise
-s / --seed : indicate numeric seed
-l / --latex : enable latex output of vars`);
    } else {

        interpreter.debug = options.debug;

        if (options.seed !== undefined)
            interpreter.random.seed = options.seed;

        interpreter.latex = options.latex;


        const processData = function (code) {
            let t0 = new Date();
            if (options.verbose)
                console.log('verifying...');
            const errors = interpreter.verify(code);
            if (options.verbose)
                console.log(`verified in ${new Date() - t0}ms\n`);
            if (errors.length) {
                if (options.json) {
                    if (options.output !== undefined) {
                        fs.writeFileSync(options.output, JSON.stringify(errors, null, 2), 'utf-8');
                        if (!options.quiet)
                            console.log(`Output written in ${options.output}`);
                    } else
                        console.log(JSON.stringify(errors, null, 2));
                } else {
                    console.error(`${errors.length} errors in file :`);
                    errors.forEach(function (error) {
                        console.error(`line ${error[3]} : ${error[0]}`);
                    });
                }
            } else {
                t0 = new Date();
                if (options.verbose)
                    console.log('evaluating...');
                const output = interpreter.eval(code);
                if (options.verbose)
                    console.log(`evaluated in ${new Date() - t0}ms\n`);
                let keys = Object.keys(output.content);
                if (options.final) {
                    const newContent = {};
                    keys = interpreter.sortKeys(output.content);
                    keys.forEach(function (key) {
                        newContent[key] = output.content[key];
                    });
                    output.content = newContent;
                }
                if (options.json) {
                    if (options.output !== undefined) {
                        fs.writeFileSync(options.output, JSON.stringify(output, null, 2), 'utf-8');
                        if (!options.quiet)
                            console.log(`Output written in ${options.output}`);
                    } else
                        console.log(JSON.stringify(output, null, 2));
                } else {
                    keys.forEach(function (key) {
                        if (key.length > 0)
                            console.log(`#${key}\n${output.content[key]}`);
                        else
                            console.log(`${output.content[key]}`);
                    });
                }
            }
        };

        if (process.stdin.isTTY) {
            const code = fs.readFileSync(options.file, 'utf-8');
            processData(code);
        } else {
            // https://www.exratione.com/2015/12/accepting-input-via-stdin-and-arguments-in-a-command-line-node-js-script/
            let code = '';
            process.stdin.setEncoding('utf-8');

            process.stdin.on('readable', function () {
                let chunk;
                while ((chunk = process.stdin.read()) !== null) {
                    code += chunk;
                }
            });

            process.stdin.on('end', function () {
                // There will be a trailing \n from the user hitting enter. Get rid of it.
                code = code.replace(/\n$/, '');
                processData(code);
            });
        }


    }
}
