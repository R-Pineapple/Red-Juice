# Red Juice v1.4.3 - Specification sheet

![Red Juice logo](redjuice.png)

## Introduction
Red Juice is a home-made language with the purpose of procedurally generate mathematical problems.

You can output lines and equations while executing formal expressions and storing them in variables.

Since v1.4, it is now a Turing Complete language.
## Usage
### With node
```
npm install red-juice
```
then
```javascript
const interpreter = require('red-juice');

...

const errors = interpreter.verify(code);
if(errors.length){
   //print/handle errors
} else {
   const output = interpreter.eval(code);
   // see example for output format
}
```

### Commande line
```
npm install -g red-juice
```
then
```
red-juice inputFile [-v][-h][-q][-d][-o outputFile][-j][-f][-s seed][-l]

-v / --verbose : more info
-h / --help : show this message
-q / --quiet : do not log output
-d / --debug : show debug log
-o / --output : indicate output file (activate json format)
-j / --json : json format
-f / --final : show as final exercise
-s / --seed : indicate numeric seed
-l / --latex : enable latex output of vars
```

## Example
The code :
```
VAR A = 2;
VAR B = (A + 1)/2;
$\frac{{A}}{{B}}$ #LaTeX expression
START ex1;
    TIME 60;
    IF A < 5;
        ${A}\times {B}$
        this is a test
        START partA;
            this is partA
        END partA;
    ELSE;
        START partA;
            this is partA
        END partA;
    ENDIF;
END ex1;
```
Will output (
```json
{
    content : {
        '' : '$\frac{2}{\frac{3}{2}}$\n',
        '#ex1' : '$2\times \frac{3}{2}$\nthis is a test\n',
        '#ex1#partA' : 'this is partA\n'
    },
    timers : {
        '#ex1' : 60
    }
}
```
## Writing rules

* A line without a semicolon (`;`) is an output line.
* Everything after an hashtag (`#`) is considered commented. (even outside code lines)
* Indentation doesn't matter.
* Variables in output surrounded by braces (`{var}`) will be replaced by its value in LaTeX.
* Variables can be tested in output with `{var:something}`, it will be replaced with 'something' only if 'var' is not null.
* Same thing, `{!var:something}`, it will be replaced with something only if 'var' is null.
* Tests in output can be more complex like `{var > 0 || var2 != 5:something}`
* In output you can use `{simplify:something}` and what's inside will be simplified and output in LaTeX
* If the simplify output is red, it means it failed somehow (there is maybe some * missing between values)
* Code line must start with a keyword (see below).
* Expression will be computed and stored as formal. (`1/3` will keep its formal value and be simplified if needed)
* Keywords should be uppercase, but will work as any capitalization.
* You can use predefined constants like `PI`.
* Variable names must start with a letter.
* Expression are written with basic mathematical symbols (`-+*/^%`) and functions. (see below)
* Functions can be used with any capitalization.

## Keywords

### `VAR` - Assignation

Example :
```
VAR A = RAND(1, 10);
VAR A = e^SIN(A);
```

### `IF`, `ELIF`, `ELSE`, `ENDIF` - Condition

Example :
```
IF A < 5;
    do something
ELIF A > 6 && A <= 10 || A >= 15;
    do something else
ELSE;
    do something else
ENDIF;
```

### `WHILE`, `ENDWHILE` - Loops

Example :
```
WHILE A != B;
   do something
ENDWHILE;
```

### `START`, `END` - Partition

Example :
```
will be outputed in part with blank name
START part1;
    will be outputed in part with name #part1
    START partA;
        will be outputed in part with name #part1#partA
    END partA;
    START partB;
        will be outputed in part with name #part1#partB
    END partB;
END part1;
```

### `TIME` - Indication

Example :
```
START part1;
    TIME 60; #indicate for #part1
    START partA;
        TIME 65; #indicate for #part1#partA
    END partA;
    TIME 30; #overwrite for #part1
END part1;
```

## Functions and operators list

### Basic functions

|Name|Alias|Arguments|More info|
|---|---|---|---|
|rand||2|random value between argument 1 and argument 2 included|
|randnn||2|random value not null between argument 1 and argument 2 included|
|abs||1|absolute value or module of complex|
|sign||1|sign (-1,0,+1)|
|max||2|maximum|
|min||2|minimum|
|round||1||
|floor||1||
|frac||1||
|ceil||1||
|factorial||1||
|sqrt||1|square root|
|exp|`e^var`|1|exponential|
|log|ln|1|natural logarithm|
|log10||1|base 10 logarithm|

### Complexes

|Name|Alias|Arguments|More info|
|---|---|---|---|
|re||1|real part of complex|
|im||1|imaginary part of complex|
|arg||1|argument|
|conj||1|conjugate|

### Trigonometry

|Name|Alias|Arguments|More info|
|---|---|---|---|
|sin||1|sine|
|cos||1|cosine|
|tan||1|tangent|
|cot||1|cotangent|
|asin||1|arc sine|
|acos||1|arc cosine|
|atan||1|arc tangent|
|sinh||1|hyperbolic sine|
|cosh||1|hyperbolic cosine|
|tanh||1|hyperbolic tangent|
|asinh||1|argument of hyperbolic sine|
|acosh||1|argument of hyperbolic cosine|
|atanh||1|argument of hyperbolic tangent|
|asinh||1|argument of hyperbolic sine|
|acosh||1|argument of hyperbolic cosine|
|atanh||1|argument of hyperbolic tangent|

### Operators

|Name|Alias|Arguments|More info|
|---|---|---|---|
|neg|`-var`|1|negative value|
|not|`!var`|1|inverse value|
|plus|`var1 + var2`|2|addition|
|minus|`var1 - var2`|2|substraction|
|div|`var1 / var2`|2|division|
|mod|`var1 % var2`|2|modulo|
|pow|`var1 ^ var2`|2|power|
|times|`var1 * var2`|2|multiplication|
|eq|`var1 == var2`|2|equal|
|neq|`var1 != var2`|2|not equal|
|gte|`var1 >= var2`|2|greater than or equal|
|lte|`var1 <= var2`|2|less than or equal|
|gt|`var1 > var2`|2|greater than|
|lt|`var1 < var2`|2|less than|
|and|`var1 && var2`|2||
|or|`var1 || var2`|2||

### Vectors and Matrices

|Name|Alias|Arguments|More info|
|---|---|---|---|
|length|len|1|size of var|
|randvec||3|random vector of size arg 1 and values between arg 2 and arg 3|
|randmat||4|random matrix of size arg 1 x arg 2 and values between arg 3 and arg 4|
|get|`var1[var2]`|2|get value of cell in var|
|cross||2|cross product between 2 vectors|
|vec{n}||n|creates a vector with n given values (ex: `vec3(1,2,3)`)|
|tran|`~mat1`|1|transpose of matrix|
|mtimes|`mat1.*mat2`|2|cell by cell multiplication|
|rank||1|rank of matrix|
|det||1|determinant of matrix|
|ker||1|kernel of matrix|
|image||1|image of matrix|
|idn||1|identity matrix of given size|
|zeros||2|create a matrix of size arg 1 x arg 2 filled with 0|
|ones||2|create a matrix of size arg 1 x arg 2 filled with 1|

### Constants
|Name|Alias|Explanation|
|---|---|---|
|e||exponential|
|pi|PI|π|
|infinity|inf|∞|
|i||complex i|
|euler_gamma||Euler constant γ|
|true|True|boolean value|
|false|False|boolean value|


## Changelog

* **1.4.3**: `zeros` and `ones` matrix functions
* **1.4.2**:
    * `VAR A[B] = ...;` var subscription by other var
    * no LaTeX in output by default in CLI (need `--latex`)
    * loop bug fix
* **1.4.1**: command line interface
* **1.4.0**: loops with `WHILE`, `ENDWHILE`
* **1.3.5**: Predefined capitalization for constants
* **1.3.4**: `len` function for vectors and matrices
* **1.3.3**: better looking vectors in LaTeX
* **1.3.2**: variable cell attribution `VAR A[0] = 2;`
* **1.3.1** :
    * More constants : `e`, `i`, `infinity`, `inf`, `euler_gamma`, `true`, `false`
    * `vec{n}` creates vectors size n
    * subscriptable vars in expressions `A[0] * A[1]`
* **1.3.0** :
    * Matrices and vectors functions
    * Safe giac call (avoid `ERROR: something` in output)
* **1.2.9** : TIME keyword and output format change
* **1.2.8** : RANDNN function
* **1.2.7** : Remove blank outputed lines
* **1.2.6** : Word blacklist for output
* **1.2.5** : `{simplify:2x+2x}` -> `4\\cdot x`
* **1.2.4** :  Version number to be shown in editor
* **1.2.3** : Added error 'Restricted variable name'
* **1.2.2** : Fix when output had a lot of -- or +-
* **1.2.1** : +- and -- handling (not replacing already there)
* **1.2** : A lot of functions ported from giac (see above)
* **1.1.1** :
    * Fixed mis-implementation of Shunting Yard
    * Operators into functions (`! -> not`)
* **1.1** :
    * LaTeX conditions `{v:{v > 1:new version}{v == 0:same version}}`
    * Bug fix
* **1.0** :
    * Versioning
    * Not operators (`!, `!=`)
    * Negative things (`-func`, `-var`)
    * Debug switch
    * Bug fix








