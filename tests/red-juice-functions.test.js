const interpreter = require('../src/red-juice');
const functions = require('../src/red-juice-functions')(interpreter.random);

function testFn(fn, args, res) {
    test(fn, () => {
        expect(functions[fn]).toBeDefined();
        expect(functions[fn].exec(args)).toEqual(res);
    });
}

// basic
testFn('abs', ['-1'], '1');
testFn('sign', ['-256'], '-1');
testFn('max', ['-256', '256'], '256');
testFn('min', ['-256', '256'], '-256');
testFn('round', ['1.5'], '2');
testFn('floor', ['1.5'], '1');
testFn('frac', ['1.5'], '0.5');
testFn('ceil', ['1.5'], '2');
testFn('factorial', ['3'], '6');
testFn('sqrt', ['4'], '2');
testFn('exp', ['0'], '1');
testFn('log', ['1'], '0');
testFn('ln', ['1'], '0');
testFn('log10', ['10'], '1');

// complexes
testFn('re', ['1+i'], '1');
testFn('im', ['1+i'], '1');
testFn('abs', ['1+i'], '√2');
testFn('arg', ['1+i'], 'pi/4');
testFn('conj', ['1+i'], '1-i');

// trigonometry
testFn('sin', ['-pi/2'], '-1');
testFn('cos', ['pi'], '-1');
testFn('tan', ['pi/4'], '1');
testFn('cot', ['pi/4'], '1');
testFn('asin', ['-1'], '-pi/2');
testFn('acos', ['-1'], 'pi');
testFn('sinh', ['0'], '0');
testFn('cosh', ['0'], '1');
testFn('tanh', ['0'], '0');

// operators
testFn('neg', ['-5'], '5');
testFn('plus', ['-5', '4'], '-1');
testFn('minus', ['-5', '4'], '-9');
testFn('div', ['-5', '5'], '-1');
testFn('mod', ['-5', '4'], '-1 % 4');
testFn('pow', ['-5', '2'], '25');
testFn('times', ['-5', '2'], '-10');
testFn('eq', ['-5', '2'], 'false');
testFn('neq', ['-5', '2'], 'true');
testFn('gte', ['-5', '2'], 'false');
testFn('lte', ['-5', '2'], 'true');
testFn('gt', ['-5', '2'], 'false');
testFn('lt', ['-5', '2'], 'true');
testFn('and', ['true', 'false'], 'false');
testFn('or', ['true', 'false'], 'true');

// vectors
testFn('times', ['[1,2]', '[3,4]'], '11');
testFn('cross', ['[1,2,3]', '[4,5,6]'], '[-3,6,-3]');

testFn('vec1', ['1'], '[1]');
testFn('vec3', ['1', '2', '3'], '[1,2,3]');

// matrices
testFn('times', ['[[0,2],[3,0]]', '[[1,1],[1,1]]'], '[[2,2],[3,3]]');
testFn('mtimes', ['[[0,2],[3,0]]', '[[1,2],[2,1]]'], '[[0,4],[6,0]]');
testFn('div', ['1', '[[0,2],[3,0]]'], '[[0,1/3],[1/2,0]]');
testFn('tran', ['[[1,2],[3,4],[5,6]]'], 'matrix[[1,3,5],[2,4,6]]');
testFn('rank', ['[[0,2],[3,0]]'], '2');
testFn('det', ['[[0,2],[3,0]]'], '-6');
testFn('ker', ['[[1,2,3],[4,5,6]]'], '[[-1,2,-1]]');
testFn('image', ['[[1,2,3],[4,5,6]]'], '[[-2,0],[0,-2]]');
testFn('idn', ['2'], 'matrix[[1,0],[0,1]]');
testFn('zeros', [3, 2], '[[0,0],[0,0],[0,0]]');
testFn('ones', [3, 2], '[[1,1],[1,1],[1,1]]');

testFn('get', ['[[1,2,3],[4,5,6]]', '1'], '[4,5,6]');
testFn('get', ['[4,5,6]', '1'], '5');
testFn('get', ['[4,5,6]', '3'], '[4,5,6]');
testFn('get', ['5', '1'], '5');

testFn('len', ['[[0,2],[3,0]]'], '2');
testFn('len', ['[0,2]'], '2');

// random
test('rand', () => {
    expect(functions['rand']).toBeDefined();
    expect(functions['rand'].exec([0, 0])).toEqual(0);
    expect(functions['rand'].exec([1, 2])).not.toEqual(0);
});

test('randnn', () => {
    expect(functions['randnn']).toBeDefined();
    expect(functions['randnn'].exec([0, 0])).toEqual(0);
    expect(functions['randnn'].exec([0, 1])).toEqual(1);
});

test('randvec', () => {
    expect(functions['randvec']).toBeDefined();
    expect(functions['randvec'].exec([2, 0, 0])).toEqual('[0,0]');
    expect(functions['randvec'].exec([2, 1, 2])).not.toEqual('[0,0]');
});

test('randmat', () => {
    expect(functions['randmat']).toBeDefined();
    expect(functions['randmat'].exec([3, 2, 0, 0])).toEqual('[[0,0],[0,0],[0,0]]');
    expect(functions['randmat'].exec([3, 2, 1, 2])).not.toEqual('[[0,0],[0,0],[0,0]]');
});

function testSpFn(fn, args, res) {
    test(fn, () => {
        expect(functions[fn]).toBeDefined();
        expect(functions[fn](args)).toEqual(res);
    });
}

// special functions
testSpFn('$', '1/2', '\\frac{1}{2}');
testSpFn('$', '[1,2]', '\\begin{bmatrix} 1 \\\\ 2 \\end{bmatrix}');
testSpFn('@', 'x+x', '2*x');
