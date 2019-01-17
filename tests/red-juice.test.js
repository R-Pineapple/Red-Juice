const interpreter = require('../red-juice');

test('is numeric', () => {
  expect(interpreter.isNumeric('a')).toEqual(false);
  expect(interpreter.isNumeric('1')).toEqual(true);
  expect(interpreter.isNumeric('1,1')).toEqual(false);
  expect(interpreter.isNumeric('1.1')).toEqual(true);
});

test('random', () => {
  let rand;
  for (let i = 0; i < 20; i++) {
    rand = interpreter.random.new();
    expect(rand).toBeGreaterThanOrEqual(0);
    expect(rand).toBeLessThan(1);
    rand = interpreter.random.newFloat(50, 52);
    expect(rand).toBeGreaterThanOrEqual(50);
    expect(rand).toBeLessThan(52);
    rand = interpreter.random.newInt(100, 110);
    expect(rand).toBeGreaterThanOrEqual(100);
    expect(rand).toBeLessThan(110);
  }
});

test('random seed', () => {
  let seed = interpreter.random.seed;
  let r1 = interpreter.random.newInt(0, 10000);
  let r2 = interpreter.random.newInt(0, 10000);
  interpreter.random.seed = seed;
  expect(interpreter.random.newInt(0, 10000)).toEqual(r1);
  expect(interpreter.random.newInt(0, 10000)).toEqual(r2);
});

test('tokenize', () => {
  expect(interpreter.tokenize('A+B*(C-D)+RAND(-1.1,-2)'))
    .toEqual(['A', '+', 'B', '*', '(', 'C', '-', 'D', ')', '+', 'RAND', '(', '-1.1', ',', '-2', ')']);
  expect(interpreter.tokenize('A * -10 + 51.52e-05 + 10.35e+05'))
    .toEqual(['A', '*', '-10', '+', '51.52e-05', '+', '10.35e+05']);
  expect(interpreter.tokenize('VAR ABC01 = RAND(1.1,2+ABC02) / e^ABC03'))
    .toEqual(['VAR', 'ABC01', '=', 'RAND', '(', '1.1', ',', '2', '+', 'ABC02', ')', '/', 'e^', 'ABC03']);
  expect(interpreter.tokenize('IF ABC_01[0] == 1 && ABC_02 + 5 >= -2.2 || 5.5 > RAND(1.1) && !(ABC_01 != -ABC_02)'))
    .toEqual(['IF', 'ABC_01', '[', '0', ']', '==', '1', '&&', 'ABC_02', '+', '5', '>=', '-2.2', '||',
      '5.5', '>', 'RAND', '(', '1.1', ')', '&&', '!', '(', 'ABC_01', '!=', '.-', 'ABC_02', ')']);
  expect(interpreter.tokenize('(~ABC_01 .* ABC_01)[0]'))
    .toEqual(['(', '~', 'ABC_01', '.*', 'ABC_01', ')', '[', '0', ']']);
});

test('tokenize with indexes', () => {
  expect(interpreter.tokenize('A + B == 1 / 35.56e+05', true))
    .toEqual([['A', 0], ['+', 2], ['B', 4], ['==', 6], ['1', 9], ['/', 11], ['35.56e+05', 13]]);
});

test('verify tokens', () => {
  const env = {
    'ABC_01': 1,
    'ABC_02': 2
  };
  expect(interpreter.verifyTokens(env, interpreter.tokenize('ABC_01 == 1 && ABC_02 + 5 >= -2.2 || 5.5 > RAND(1.1,-1.2) && !(ABC_01 != -ABC_02)')))
    .toEqual([]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('3 + 4 .* 2 / ( 1 - 5 ) ^ 200 ^ 3')))
    .toEqual([]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('sin ( max ( 2, 3 / 3 * pi ))')))
    .toEqual([]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('RAND((1.1/3),5)')))
    .toEqual([]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('1 + 100 + 0.1 + 100.1 + -1 + -0.5 + -100 + 1e05 + 1e-5 + -51.56e+056')))
    .toEqual([]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('sin ( max ( 2, 3 / 3 ) * 3.1415 | 4 )')))
    .toEqual([['Invalid token "|"', 12]]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('sin ( max ( 2, 3 / 3 ) * _0pi)')))
    .toEqual([['Invalid token "_0pi"', 11]]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('sin ( max ( 2, 3 / 3 ) * 3.1415 ))')))
    .toEqual([['Invalid parenthesis', 13]]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('( sin ( max ( 2, 3 / 3 ) * 3.1415 )')))
    .toEqual([['Unclosed parenthesis', 0]]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('sin ( max ( 2, 3 / 3 ) * 3.1415 )]')))
    .toEqual([['Invalid bracket', 13]]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('[0] sin ( max ( 2, 3 / 3 ) * 3.1415 )')))
    .toEqual([['Invalid bracket', 0]]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('sin ( [0] max ( 2, 3 / 3 ) * 3.1415 )')))
    .toEqual([['Invalid bracket', 2]]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('sin ( max ( 2, 3 / 3 )[ * 3.1415 )')))
    .toEqual([['Unclosed bracket', 10]]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('sin ( max ( 2, 3 / 3 )[] * 3.1415 )')))
    .toEqual([['Empty brackets', 11]]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('sin max ( 2, 3 / 3 ) * 3.1415')))
    .toEqual([['Uncalled function', 0]]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('sin ( max ( 2, 3 / 3 ) * 3.1415 ) * 5 , 5')))
    .toEqual([['Argument separator outside of function', 15]]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('sin ( cos ( PI[2, 3 / 3] ) * 3.1415 )')))
    .toEqual([['Argument separator outside of function', 7]]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('ABC_03 == 1 && ABC_02 == 2.2 || 5.5 == RAND(1.1, 2)')))
    .toEqual([['Unresolved token "ABC_03"', 0]]);
  expect(interpreter.verifyTokens(env, interpreter.tokenize('ABC_02 == 1 && ABC_02 == 2.2 || 5.5 == RAND(1.1)')))
    .toEqual([['Invalid number of arguments', 10]]);
});


test('shunting yard', () => {
  expect(interpreter.shuntingYard(interpreter.tokenize('3 + 4 * 2 / ( 1 - 5 ) ^ 2 ^ 3')))
    .toEqual(['3', '4', '2', '*', '1', '5', '-', '2', '3', '^', '^', '/', '+']);
  expect(interpreter.shuntingYard(interpreter.tokenize('sin ( -max ( 2, 3 ) / 3 * -3.1415 )')))
    .toEqual(['2', '3', 'max', '.-', '3', '/', '-3.1415', '*', 'sin']);
  expect(interpreter.shuntingYard(interpreter.tokenize('ABC_01 == 1 && ABC_02 == 2.2 || 5.5 == RAND(1.1)')))
    .toEqual(['ABC_01', '1', '==', 'ABC_02', '2.2', '==', '&&', '5.5', '1.1', 'RAND', '==', '||']);
  expect(interpreter.shuntingYard(interpreter.tokenize('sin ( max ( 2, 3 / 3 * 3.1415 )')))
    .toEqual([]);
  expect(interpreter.shuntingYard(interpreter.tokenize('sin ( max ( 2, 3 / 3 ) * 3.1415 ))')))
    .toEqual([]);
  expect(interpreter.shuntingYard(interpreter.tokenize('RAND(10,20)/-RAND(1000,2000)')))
    .toEqual(['10', '20', 'RAND', '1000', '2000', 'RAND', '.-', '/']);
  expect(interpreter.shuntingYard(interpreter.tokenize('IDN(3)[1] * (~RANDMAT(3,3,4,5))[2+3]')))
    .toEqual(['3', 'IDN', '1', 'get', '3', '3', '4', '5', 'RANDMAT', '~', '2', '3', '+', 'get', '*']);
});


test('verify expr', () => {
  expect(interpreter.verifyExpr(interpreter.tokenize('3 + 4 * 2 / ( 1 - 5 ) ^ 2 ^ 3')))
    .toEqual(true);
  expect(interpreter.verifyExpr(interpreter.tokenize('sin ( max ( 2, 3 ) / 3 * 3.1415 )')))
    .toEqual(true);
  expect(interpreter.verifyExpr(interpreter.tokenize('sin ( max ( 2, 3 / 3 * pi ))')))
    .toEqual(true);
  expect(interpreter.verifyExpr(interpreter.tokenize('sin ( max ( 2, 3 / 3 ) * 3.1415 ))')))
    .toEqual(false);
  expect(interpreter.verifyExpr(interpreter.tokenize('sin ( max ( 2, 3 / 3 * pi )) 1')))
    .toEqual(false);
  expect(interpreter.verifyExpr(interpreter.tokenize('ABC_01 == 1 && ABC_02 == 2.2 || 5.5 == RAND(1.1)')))
    .toEqual(false);
});

test('eval expr', () => {
  const env = {
    'ABC_02': -1,
    'ABC_03': '[[1,2,3],[4,5,6],[7,8,9]]'
  };

  expect(interpreter.evalExpr(env, interpreter.tokenize('3 + 4 * 2 / ( 1 - 5 ) ^ 2 ^ 3 * -ABC_02')))
    .toEqual('24577/8192');
  expect(interpreter.evalExpr(env, interpreter.tokenize('sin ( max ( 2, 8 / 5 * pi ))')))
    .toEqual('-√(2*√5+10)/4');
  expect(interpreter.evalExpr(env, interpreter.tokenize('ABC_02 > 0 || !(ABC_02 != 0 && -ABC_02 < -2)')))
    .toEqual('true');
  expect(interpreter.evalExpr(env, interpreter.tokenize('!ABC_02')))
    .toEqual('false');
  expect(interpreter.evalExpr(env, interpreter.tokenize('ln(e^256)')))
    .toEqual('256');
  expect(interpreter.evalExpr(env, interpreter.tokenize('IDN(3)[0] * VEC3(3,2,1)')))
    .toEqual('3');
  expect(interpreter.evalExpr(env, interpreter.tokenize('ABC_03 .* IDN(3)')))
    .toEqual('[[1,0,0],[0,5,0],[0,0,9]]');
});


test('verify', () => {
  expect(interpreter.verify('' +
    'VAR A = PI + RAND(1, 100);\n' +
    'VAR B = A + 5;\n' +
    'START exercise;\n' +
    '   print this line\n' +
    '   START part1;\n' +
    '       TIME 60;\n' +
    '       IF A < 40;\n' +
    '           VAR B = B - 5;\n' +
    '           print this other line\n' +
    '           IF B == 50;\n' +
    '               print special line\n' +
    '           ENDIF;\n' +
    '       ELIF A <= 60;\n' +
    '           VAR B = B + 5;\n' +
    '           print this third line\n' +
    '       ELSE;\n' +
    '           print this fourth line\n' +
    '       ENDIF;\n' +
    '   END part1;\n' +
    'END exercise;\n'))
    .toEqual([]);
  expect(interpreter.verify('' +
    'VAR A = RAND(-30, 10);\n' +
    'VAR A = SIN(A);'))
    .toEqual([]);
  expect(interpreter.verify('' +
    'VAR x0 = RAND(0,1);\n' +
    'IF x0 == 1;\n' +
    '\tVAR x0 = RAND(-30,30);\n' +
    'ENDIF;'))
    .toEqual([]);
  expect(interpreter.verify('' +
    '   VAR A = RAND(1, 100);VAR B = A + 5;\n' +
    'VAR A = RAND(1, 100);'))
    .toEqual([['Multiple statements in one line', 24, 37, 1]]);
  expect(interpreter.verify('' +
    '   VAR ABC_01;'))
    .toEqual([['Not enough tokens', 3, 13, 1]]);
  expect(interpreter.verify('' +
    '   VAR ABC_01 + 2;'))
    .toEqual([['Invalid assignment', 3, 17, 1]]);
  expect(interpreter.verify('' +
    '   VAR _01AB = 2;'))
    .toEqual([['Invalid name for variable', 7, 12, 1]]);
  expect(interpreter.verify('' +
    '   VAR RAND = 2;'))
    .toEqual([['Restricted variable name', 7, 11, 1]]);
  expect(interpreter.verify('' +
    '   VAR PI = 2;'))
    .toEqual([['Restricted variable name', 7, 9, 1]]);
  expect(interpreter.verify('' +
    '   VAR ABC_01 = RAND(1.1);'))
    .toEqual([['Invalid number of arguments', 16, 20, 1]]);
  expect(interpreter.verify('' +
    '   VAR ABC_01 = ABC_01;'))
    .toEqual([['Unresolved token "ABC_01"', 16, 22, 1]]);
  expect(interpreter.verify('' +
    '   VAR ABC_01 = 1 1;'))
    .toEqual([['Invalid expression', 16, 19, 1]]);
  expect(interpreter.verify('' +
    '   IF;\n' +
    '   ENDIF;\n'))
    .toEqual([['Not enough tokens', 3, 5, 1]]);
  expect(interpreter.verify('' +
    '   IF ABC_01 == 1;\n' +
    '   ENDIF;\n'))
    .toEqual([['Unresolved token "ABC_01"', 6, 12, 1]]);
  expect(interpreter.verify('' +
    '   IF 1 1;\n' +
    '   ENDIF;\n'))
    .toEqual([['Invalid expression', 6, 9, 1]]);
  expect(interpreter.verify('' +
    '   IF 1 == 1;\n' +
    '   ELIF ABC_01 == 1;\n' +
    '   ENDIF;\n'))
    .toEqual([['Unresolved token "ABC_01"', 8, 14, 2]]);
  expect(interpreter.verify('' +
    '   IF 1 == 1;\n' +
    '   ELIF 1 1;\n' +
    '   ENDIF;\n'))
    .toEqual([['Invalid expression', 8, 11, 2]]);
  expect(interpreter.verify('' +
    '   IF 1 == 1;\n' +
    '   ELIF;\n' +
    '   ENDIF;\n'))
    .toEqual([['Not enough tokens', 3, 7, 2]]);
  expect(interpreter.verify('' +
    '   IF 1 == 1;\n' +
    '   ELSE;\n' +
    '   ELIF 1 == 1;\n' +
    '   ENDIF;\n'))
    .toEqual([['Invalid condition branch', 3, 14, 3]]);
  expect(interpreter.verify('' +
    '   IF 1 == 2;\n' +
    '       IF 3 == 4;\n' +
    '       ELSE;\n' +
    '   ENDIF;\n'))
    .toEqual([['Condition is not closed', 3, 12, 1]]);
  expect(interpreter.verify('' +
    '   ELIF 1 == 2;\n' +
    '   ELSE;\n' +
    '   ENDIF 2;\n'))
    .toEqual([
      ['No condition detected before', 3, 14, 1],
      ['No condition detected before', 3, 7, 2],
      ['No condition detected before', 3, 10, 3],
      ['Too many tokens', 9, 10, 3]]);
  expect(interpreter.verify('' +
    '   IF 1 == 1;\n' +
    '   WHILE 1 == 1;\n' +
    '   ELIF 1 == 1;\n' +
    '   ENDWHILE;\n' +
    '   ENDIF;'))
    .toEqual([['Cannot end condition branch here', 3, 14, 3]]);
  expect(interpreter.verify('' +
    '   IF 1 == 1;\n' +
    '   START block;\n' +
    '   ELIF 1 == 1;\n' +
    '   END block;\n' +
    '   ENDIF;'))
    .toEqual([['Cannot end condition branch here', 3, 14, 3]]);
  expect(interpreter.verify('' +
    '   IF 1 == 1;\n' +
    '   WHILE 1 == 1;\n' +
    '   ELSE;\n' +
    '   ENDWHILE;\n' +
    '   ENDIF;'))
    .toEqual([['Cannot end condition branch here', 3, 7, 3]]);
  expect(interpreter.verify('' +
    '   IF 1 == 1;\n' +
    '   START block;\n' +
    '   ELSE;\n' +
    '   END block;\n' +
    '   ENDIF;'))
    .toEqual([['Cannot end condition branch here', 3, 7, 3]]);
  expect(interpreter.verify('' +
    '   IF 1 == 1;\n' +
    '   START block;\n' +
    '   ENDIF;\n' +
    '   END block;'))
    .toEqual([['Cannot end condition branch here', 3, 8, 3]]);
  expect(interpreter.verify('' +
    '   IF 1 == 1;\n' +
    '   WHILE 1 == 1;\n' +
    '   ENDIF;\n' +
    '   ENDWHILE;'))
    .toEqual([['Cannot end condition branch here', 3, 8, 3]]);
  expect(interpreter.verify('' +
    '    START exercise1;\n' +
    '    END exercise2;\n'))
    .toEqual([['Invalid end of block', 4, 17, 2],
      ['Block is not closed', 4, 19, 1]]);
  expect(interpreter.verify('' +
    '    START exercise1;\n' +
    '    IF 1 == 1;\n' +
    '    END exercise1;\n' +
    '    ENDIF;'))
    .toEqual([['Cannot end block here', 4, 17, 3],
      ['Block is not closed', 4, 19, 1]]);
  expect(interpreter.verify('' +
    '    START exercise1;\n' +
    '    WHILE 1 == 1;\n' +
    '    END exercise1;\n' +
    '    ENDWHILE;'))
    .toEqual([['Cannot end block here', 4, 17, 3],
      ['Block is not closed', 4, 19, 1]]);
  expect(interpreter.verify('' +
    '    START exercise1 (part 1);\n' +
    '    END exercise2 + 2;\n'))
    .toEqual([['Too many tokens', 20, 28, 1],
      ['Too many tokens', 18, 21, 2],
      ['Invalid end of block', 4, 17, 2],
      ['Block is not closed', 4, 19, 1]]);
  expect(interpreter.verify('' +
    '   START;\n' +
    '   END;\n'))
    .toEqual([['Not enough tokens', 3, 8, 1],
      ['Not enough tokens', 3, 6, 2]]);
  expect(interpreter.verify('' +
    '    STRAT exercise;\n'))
    .toEqual([['Invalid keyword "STRAT"', 4, 9, 1]]);
  expect(interpreter.verify('' +
    '   END exercise;\n'))
    .toEqual([['No block detected before', 3, 15, 1]]);
  expect(interpreter.verify('' +
    '   TIME;\n'))
    .toEqual([['Not enough tokens', 3, 7, 1]]);
  expect(interpreter.verify('' +
    '   TIME 5 6;\n'))
    .toEqual([['Too many tokens', 10, 11, 1]]);
  expect(interpreter.verify('' +
    '   TIME bla;\n'))
    .toEqual([['Not a number', 8, 11, 1]]);
  expect(interpreter.verify('' +
    '   VAR ABC_01[0][5] = 5;\n'))
    .toEqual([['Unresolved token "ABC_01"', 7, 13, 1]]);
  expect(interpreter.verify('' +
    '   VAR ABC_01 = IDN(3);\n' +
    '   VAR ABC_01[a][0.5] = 1;\n' +
    '   VAR a = pi;\n' +
    '   VAR ABC_01[a][1] = 1;\n'))
    .toEqual([['Unresolved token "a"', 14, 15, 2],
      ['Invalid integer "0.5"', 17, 20, 2]]);
  expect(interpreter.verify('' +
    '   VAR ABC_01 = IDN(3);\n' +
    '   VAR ABC_01[0)[0] = 1;\n'))
    .toEqual([['Invalid assignment', 3, 23, 2]]);
  expect(interpreter.verify('' +
    '   WHILE 1 == 1;\n' +
    '   ENDWHILE;\n'))
    .toEqual([]);
  expect(interpreter.verify('' +
    '   WHILE;\n' +
    '   ENDWHILE;\n'))
    .toEqual([['Not enough tokens', 3, 8, 1]]);
  expect(interpreter.verify('' +
    '   WHILE 1 1;\n' +
    '   ENDWHILE;\n'))
    .toEqual([['Invalid expression', 9, 12, 1]]);
  expect(interpreter.verify('' +
    '   WHILE 1 1;\n' +
    '   ENDWHILE;\n'))
    .toEqual([['Invalid expression', 9, 12, 1]]);
  expect(interpreter.verify('' +
    '   ENDWHILE;\n'))
    .toEqual([['No loop detected before', 3, 11, 1]]);
  expect(interpreter.verify('' +
    '   WHILE 1 == 1;\n' +
    '   START block;\n' +
    '   ENDWHILE;\n' +
    '   END block;'))
    .toEqual([['Cannot end loop here', 3, 11, 3]]);
  expect(interpreter.verify('' +
    '   WHILE 1 == 1;\n' +
    '   ENDWHILE 1;\n'))
    .toEqual([['Too many tokens', 12, 13, 2]]);
  expect(interpreter.verify('' +
    '   WHILE 1 == 1;\n'))
    .toEqual([['Loop is not closed', 3, 15, 1]]);
});

test('condition tree', () => {
  const code = '' +
    'IF A;\n' +
    '   IF B;\n' +
    '       line 0\n' +
    '   ELSE;\n' +
    '       line 1\n' +
    '   ENDIF;\n' +
    'ELIF C;\n' +
    '   line 2\n' +
    'ELSE;\n' +
    '   line 3\n' +
    '   IF D;\n' +
    '       line 4\n' +
    '   ELSE;\n' +
    '       line 5\n' +
    '   ENDIF;\n' +
    'ENDIF;';
  expect(interpreter.getConditionTree(code.split('\n')))
    .toEqual({
      0: {
        end: 15,
        branches: [0, 6, 8]
      },
      1: {
        end: 5,
        branches: [1, 3]
      },
      10: {
        end: 14,
        branches: [10, 12]
      }
    });
});

test('set var', () => {
  expect(interpreter.setVar(undefined, [], '6')).toEqual('6');
  expect(interpreter.setVar('5', [], '6')).toEqual('6');
  expect(interpreter.setVar('5', [1, 2], '6')).toEqual('6');
  expect(interpreter.setVar('[[0,1],[2,3],[4,5]]', [1, 2], '6')).toEqual('[[0,1],[2,3],[4,5]]');
  expect(interpreter.setVar('[[0,1],[2,3],[4,5]]', [1, 0], '6')).toEqual('[[0,1],[6,3],[4,5]]');
  expect(interpreter.setVar('[[0,1],[2,3],[4,5]]', [1], '[1,6]')).toEqual('[[0,1],[1,6],[4,5]]');
});

test('output line', () => {
  const env = {
    'ABC_02': '1/2',
    'ABC_01': '0',
    'v': '1.1',
    'ABC_04': '-1/√2',
  };
  expect(interpreter.getOutputLine(env, 'this is {ABC_03}')).toEqual('this is {ABC_03}');
  expect(interpreter.getOutputLine(env, 'this is {ABC_02}')).toEqual('this is \\frac{1}{2}');
  expect(interpreter.getOutputLine(env, 'this is {ABC_01:{ABC_01}}{!ABC_01:null}')).toEqual('this is null');
  expect(interpreter.getOutputLine(env, 'this is {ABC_02:{ABC_02}}{!ABC_02:null}')).toEqual('this is \\frac{1}{2}');
  expect(interpreter.getOutputLine(env, 'this is {ABC_02 < 1:{ABC_01}}')).toEqual('this is 0');
  expect(interpreter.getOutputLine(env, 'this is {ABC_01:{ABC_01}{!ABC_01:null}')).toEqual('this is {ABC_01:0null');
  expect(interpreter.getOutputLine(env, '-{ABC_04}')).toEqual('+\\frac{1}{\\sqrt{2}}');
  expect(interpreter.getOutputLine(env, '{simplify:2+2x+2*{ABC_02}*x}')).toEqual('3\\cdot x+2');
  expect(interpreter.getOutputLine(env, '{simplify:2+2x+2*{ABC_02}x}')).toEqual('\\color{Red}{2+2x+2*\\frac{1}{2}x}');
  expect(interpreter.getOutputLine(env, '{simplify:2+2x+2*{ABC_02})x}')).toEqual('\\color{Red}{2+2x+2*\\frac{1}{2})x}');
  expect(interpreter.getOutputLine(env, '{simplify:read("/etc/passwd")}')).toEqual('\\color{Red}{read("/etc/passwd")}');
  expect(interpreter.getOutputLine(env, '{simplify:write("/etc/passwd")}')).toEqual('\\color{Red}{write("/etc/passwd")}');
});

test('eval', () => {
  const code1 = '' +
    'VAR A = 2;\n' +
    'VAR B = (A + 1)/2;\n' +
    '$\\frac{{A}}{{B}}$\n' +
    'START ex1;\n' +
    '   TIME 60;\n' +
    '   ${A}\\times {B}$\n' +
    '   this is a test\n' +
    '   START partA;\n' +
    '       this is partA\n' +
    '   END partA;\n' +
    'END ex1;\n';

  expect(interpreter.verify(code1)).toEqual([]);
  expect(interpreter.eval(code1))
    .toEqual({
      content: {
        '':
          '$\\frac{2}{\\frac{3}{2}}$\n',
        '#ex1':
        '$2\\times \\frac{3}{2}$\n' +
        'this is a test\n',
        '#ex1#partA':
          'this is partA\n'
      }, timers: {
        '#ex1': 60
      }
    });

  const code2 = '' +
    'IF 0 == 1;\n' +
    '   IF 1 == 1;\n' +
    '       line 0\n' +
    '   ELSE;\n' +
    '       line 1\n' +
    '   ENDIF;\n' +
    'ELIF 1 == 0;\n' +
    '   line 2\n' +
    'ELSE;\n' +
    '   line 3\n' +
    '   IF 1 == 1;\n' +
    '       line 4\n' +
    '   ELSE;\n' +
    '       line 5\n' +
    '   ENDIF;\n' +
    'ENDIF;\n' +
    'IF 1==4;\n' +
    '   line 6\n' +
    'ENDIF;\n';

  expect(interpreter.verify(code2)).toEqual([]);
  expect(interpreter.eval(code2))
    .toEqual({
      content: {
        '':
        'line 3\n' +
        'line 4\n',
      }, timers: {}
    });

  const code3 = '' +
    'VAR x0 = RAND(-30,30);\n' +
    'VAR x1 = RAND(0,2);\n' +
    'IF x1 == 1;\n' +
    '\tVAR x1 = RAND(-30,30);\n' +
    'ENDIF;\n' +
    'VAR x2 = RAND(0,2);\n' +
    'IF x2 == 1;\n' +
    '\tVAR x2 = RAND(-30,30);\n' +
    'ENDIF;\n' +
    '-------------- f(x)={x0:{x0}}{x1:+{x1}x}{x2:+{x2}x^2} +-';

  interpreter.random.seed = 47;

  expect(interpreter.verify(code3)).toEqual([]);
  expect(interpreter.eval(code3))
    .toEqual({
      content: {
        '':
          '-------------- f(x)=14-2x +-\n',
      }, timers: {}
    });

  const code4 = '' +
    'VAR a = RAND(10,20)/RAND(1000,2000);\n' +
    '${a}$\n';

  interpreter.random.seed = 46;

  expect(interpreter.verify(code4)).toEqual([]);
  expect(interpreter.eval(code4))
    .toEqual({
      content: {
        '':
          '$\\frac{19}{1731}$\n',
      }, timers: {}
    });

  const code5 = '' +
    'VAR ABC_04 = -1/sqrt(2);\n' +
    '$-{ABC_04}$\n' +
    '{ABC_04==0:blabla}\n';
  expect(interpreter.verify(code5)).toEqual([]);
  expect(interpreter.eval(code5))
    .toEqual({
      content: {
        '':
          '$+\\frac{1}{\\sqrt{2}}$\n',
      }, timers: {}
    });

  const code6 = '' +
    'VAR x1 = RAND(-10,10);\n' +
    'VAR x2 = RAND(-10,10);\n' +
    'VAR a = RANDNN(-10,10);\n' +
    'VAR b = -a*(x1+x2);\n' +
    'VAR delta = (a*(x2-x1))^2;\n' +
    'VAR c = (b^2-delta)/(4*a);';
  expect(interpreter.verify(code6)).toEqual([]);
  expect(interpreter.eval(code6))
    .toEqual({
      content: {}, timers: {}
    });

  const code7 = '' +
    'VAR A = VEC3(1,2,3);\n' +
    'VAR B = IDN(3);\n' +
    'VAR B[1] = A;\n' +
    'VAR C = ~B;\n' +
    '${C}$';
  expect(interpreter.verify(code7)).toEqual([]);
  expect(interpreter.eval(code7))
    .toEqual({
      content: {
        '':
          '$\\left(\\begin{array}{ccc}1 & 1 & 0 \\\\0 & 2 & 0 \\\\0 & 3 & 1\\end{array}\\right) $\n'
      }, timers: {}
    });
  const code8 = '' +
    'var a = 1071;\n' +
    'var b = 462;\n' +
    'while a != b;\n' +
    '   if a > b;\n' +
    '      var a = a - b;\n' +
    '   else;\n' +
    '      var b = b - a;\n' +
    '   endif;\n' +
    'endwhile;\n' +
    '{a}';
  expect(interpreter.verify(code8)).toEqual([]);
  expect(interpreter.eval(code8))
    .toEqual({
      content: {
        '':
          '21\n'
      }, timers: {}
    });
  const code9 = '' +
    'while 1 == 1;\n' +
    'endwhile;';
  const limit = interpreter.limit;
  interpreter.limit = 100;
  expect(interpreter.verify(code9)).toEqual([]);
  expect(interpreter.eval(code9))
    .toEqual({
      content: {
        '':
          'Max computed lines reached (100)\n'
      }, timers: {}
    });
  interpreter.limit = limit;
  const code10 = '' +
    'var a = 0;\n' +
    'while a < 10;\n' +
    '   {a},\n' +
    '   var a = a + 1;\n' +
    'endwhile;\n' +
    '{a}';
  expect(interpreter.verify(code10)).toEqual([]);
  expect(interpreter.eval(code10))
    .toEqual({
      content: {
        '':
          '0,\n1,\n2,\n3,\n4,\n5,\n6,\n7,\n8,\n9,\n10\n'
      }, timers: {}
    });
});

test('sort keys', () => {
  expect(interpreter
    .sortKeys({
      '': false,
      '#solution': false,
      '#result': false,
      '#1': false,
      '#hint': false,
      '#problem': false,
    }))
    .toEqual(['', '#problem', '#hint', '#result', '#solution']);

  expect(interpreter
    .sortKeys({
      '#result': false,
      '#problem': false,
    }))
    .toEqual(['#problem', '#result']);

  expect(interpreter
    .sortKeys({
      '': false,
      '#1': false,
      '#result': false,
    }))
    .toEqual(['']);

  expect(interpreter
    .sortKeys({
      '': false,
      '#solution': false,
      '#result': false,
      '#1': false,
      '#hint': false,
      '#problem': false,
    }))
    .toEqual(['', '#problem', '#hint', '#result', '#solution']);

  expect(interpreter
    .sortKeys({
      '#1#problem': false,
      '#1#result': false,
      '#result': false,
      '#problem': false,
    }))
    .toEqual(['#problem', '#result']);

  expect(interpreter
    .sortKeys({
      '': false,
      '#1#problem': false,
      '#1#result': false
    }))
    .toEqual(['', '#1#problem', '#1#result']);

  expect(interpreter
    .sortKeys({
      '#1#result': false,
      '#2#result': false,
      '#1#problem': false,
      '#2#problem': false,
      '#1#hint': false,
      '#2#solution': false,
      '#3#problem': false,
      '#3#hint': false,
      '#3#solution': false,
    }))
    .toEqual(['#1#problem', '#1#hint', '#1#result', '#2#problem', '#2#result', '#2#solution']);
});