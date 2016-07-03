# Lisplate template engine #

Lisplate is a Lisp-like template engine with a reference implementation for JavaScript.

## Installing ##

Lisplate is available on NPM.
```
npm install lisplate
```

## Getting Started ##

Once you have lisplate installed, you can require it in like any other module.

Lisplate does require a global Promise to be set up. Native ES6 promises are supported
along with any Promise polyfill or setting global.Promise to the implementation
of your choice.

Lisplate exports a class to allow users to create different instances.
Each instance may have different loaders, configuration, and run completely separate.

In order to load templates,
Lisplate requires a `sourceLoader` function to find and read the source to be compiled.

Lisplate also provides a hook to load view models for templates using the
`viewModelLoader` function.

Both the `sourceLoader` and `viewModelLoader` may run synchronously or use a supplied callback.
In the examples below, the `sourceLoader` is used asynchronously with a callback
while the `viewModelLoad` is used synchronously.

```
var Lisplate = require('lisplate');
var engine = new Lisplate({
    sourceLoader: function(name, callback) {
        var filepath = path.resolve(myViewDirectory, name + '.ltml');
        fs.readFile(filepath, 'UTF-8', callback);
    },
    viewModelLoader: function(templateName) {
        var filepath = path.resolve(myViewModelDirectory, templatePath + '.js');
        var viewmodel = null;
        try {
            viewmodel = require(filepath);
        } catch(e) {
        }
        return viewmodel;
    }
});
```

## Lisplate Instance API ##

### function addHelper(name, fn) ###
Adds the function `fn` to the helpers context identified by `name`.

### function loadTemplate(templateName, [callback]) ###
Loads a template and returns a function that can be executed by `render`.
If the template is not cached, `loadTemplate` will use your `sourceLoader` to
load the source to be compiled.
This will use the compileFn function internally and cache the result.
Returns a Promise that returns the renderable function.
If a callback is passed, the callback will be used instead.

### function compileFn(templateName, src, [callback]) ###
Compiles the `src` using `compile` and caches the result under `templateName`.
Returns a Promise that returns the renderable function.
If a callback is passed, the callback will be used instead.

### function compile(templateName, src) ###
Compiles the `src`, attempts to load the view model class using `viewModelLoader`
and returns a function that can be passed to `render`.

### function render(template, data, [callback]) ###
Renders a template from the `template` function.
May return a string or a Promise if the template requires asynchronous handling.
If a callback is passed, the callback will be used instead.

### function renderTemplate(templateName, data, [callback]) ###
Similar to `render`, but accepts a `templateName` to determine which template to load
and render. If `templateName` is a function, the function is used as the template function
passed to `render`. The output is the same as the `render` function.

## Syntax ##

## Blocks ##

Blocks are special regions which can contain free-form HTML with expressions scattered throughout.
Every template starts with a Block, so you can get to adding HTML without any boilerplate.
Within an expression, only the create function expression may contain a Block.

## Expressions ##

Expressions in Lisplate are surrounded by `{}`.
The main expression type is the function call.
There are other expressions such as:

### Literals ###

Lisplate supports the string and number literals

Strings are surrounded by double quotes
```
"a string"
```

Numbers may be integers or decimal numbers.
```
42
6.28
```

Boolean values may be true or false.
```
true
false
```

### Empty Expression ###

The empty expression is mostly used for passing `null`-like values for parameters.

```
{}
```

## Arrays ##

The array expression allows creation of standard arrays.
Arrays may contain anything using expressions.
Unlike JavaScript arrays, Lisplate arrays are separated by spaces
similar to function parameters.

```
(itemOne itemTwo {+ 3 5} {fn (a b) {- a b}})
()
```

## Associative Arrays / Maps ##

Associative arrays expression creates a key to value map.
The values can be from any expression.
Associative arrays are essentially a JavaScript object internally.
Unlike JavaScript objects, Lisplate associative arrays look similar to arrays,
but use `:key value` with spaces separating the key:value pairs.
The syntax is similar to Clojure, but using `()` instead of `{}`.

```
(:key value :two {+ 3 5} :myfn {fn (a b) {- a b}})
(:)
```

### Raw ###

Raw expressions print out text without any processing.

```
{` raw text `}
```

### Calling Functions ###

The primary expression in Lisplate is the function call.
Where most languages use filters, helpers, and other constructs, Lisplate only needs functions.
The only exception is printing a variable, which is a special case.

Function calls start with the function to be called, either by identifier or an anonymous function.
Functions can have any number of parameters separated by spaces.
```
{myFunction valueOne valueTwo}
{{fn (param1 param2)
Calling an anonymous functions
} value1 value2}
```

#### Print variable ###

As printing variables is very common in a template language, Lisplate makes them easier.
Printing a variable is much like a function call with no parameters.
Lisplate will check if the variable is a function to be called or just output the variable.

```
{myValue}
{noParamFunction}
```

By default, printing the contexts of a variable will be escaped per the HTML escape function.
To disable automatic escaping, use a `!` before the identifier to print the contents as is.

```
{!myRawContents}
{!myFunction value}
```

The automatic escaping only occurs for externally-defined functions.
Built-in functions do not escape their output nor do any functions defined in the template.

#### Built-in functions ####

Lisplate provides a number of built-in functions.

##### Math #####

The standard math operators are available:
`+`, `-`, `*`, `/`, `%`

##### Comparisons #####

The standard comparison operators are available:
`==`, `<`, `>`, `<=`, `>=`

The one exception is for the `not`, `and`, and `or`
use the full work instead of the symbol notation.

##### if #####

The if built-in allows for conditional sections.
When the condition is truthy, the ThenExpression is executed.
Otherwise, the ElseExpression is executed.
A note with JavaScript: empty array is a truthy value. In these cases,
use the `isEmpty` or `isNotEmpty` built-ins along with the `if`.

The ElseExpression is optional, but the ThenExpression is required.
To use only an ElseExpression, define the ThenExpression to be an Empty, `{}`

Any expression may be used in either the ThenExpression or ElseExpression.
If a function is used for either expression, no parameter is passed to the call.

```
{if Condition ThenExpression ElseExpression}

{if myValue "It is true!" "It is not true}
```

##### each #####

The each built-in loops over an array.
The ThenExpression is executed for each item within the array.
If the array is falsey or empty, an ElseExpression may be used.

The ElseExpression is optional, but the ThenExpression is required.
To use only an ElseExpression, define the ThenExpression to be an Empty, `{}`

Any expression may be used in either the ThenExpression or ElseExpression.
If a function is used for the ThenExpression, two parameters will be passed.
The first parameter is the current item within the array.
The second parameter is the index of the item in the array.
if a function is used for the ElseExpression, no parameter is passed to the call.

```
{each Identifier ThenExpression ElseExpression}

{each myArray {fn (item index)
Item is: {item}
Index of the item is: {index}
} "There are no items in the array"}
```

##### isEmpty and isNotEmpty #####

The two functions `isEmpty` and `isNotEmpty` provide helpers to determine
if an item is considered empty. Strings and arrays are considered empty
when their length is 0. The number 0 is also empty.
All falsy value (false, null, undefined) are also considered empty.
All other values are considered not-empty;

##### include #####

The include built-in includes another template.
Parameters passed to the include call will be passed to the template.

```
{include string values...}

{include "my-other-template" valueOne valueTwo}
```

##### Binary Operators: Math and Comparisons #####

Binary operators are used in a prefix notation similar to Lisp.
Lisplate does not use order of operations.
The order must be defined within each operator call.

```
{+ 3 4}
7

{< {- 4 3} {* {+ 5 2} 7}
true (1 < 49)
```

Supported operators:
* `*`
* `/`
* `%`
* `+`
* `-`

* `==`
* `!=`
* `<`
* `>`
* `>=`
* `<=`

### Contexts ###

Contexts are special variables that provide access to template parameters and view models.
Contexts can be used to access variables even if the variable name is used as a parameter.
To select a context for an identifier, put the context label and a colon before the identifier.
Contexts and fields on a context are protected and can not be overriden by internal scopes.
```
Context:Identifier
```
```
{data:myParameter}
{helper:myHelper}
{viewmodel:myViewModelItem}
{strings:someString}
{each data:myArray {fn (myItem)
  This is the array item: {myItem}
  This is the data item: {data:myItem}
}}
```

Built in functions are on the `runtime` context, but are accessible without a context specifier.

Added helper functions are in the `helper` context.

Data sent to the template via an include or through rendering is in the `data` context.

View model fields are accessible in the `viewmodel` context.

Fields in the strings file are accessible in the `strings` context.

**Coming soon**: Currently Lisplate does not search contexts.
Before 1.0, a template should be capable of searching contexts (parameters and viewmodel).
Specifying a context will avoid the search and may be faster.

### Creating Functions ###

Anonymous functions can be created using the `fn` function.
Creating a function is the only way to create a Block outside of the starting Block.
Anonymous functions may be passed as a parameter or called directly.

Each function creates a new scope containing it's parameters.
The function also has access to the scope containing the function,
but does not have access to the scope calling the function.

The parameter specification is surrounded by `()` and is optional.
Each parameter name is separated by a space.

```
{fn (paramOne paramTwo)
This is now a block
<div>Free HTML is allowed here</div>
{paramOne} {paramTwo}
}
```

## Advanced Tips ##

### Defining variables ###

Much like Lisp and other functional langauges, local variables can be created using functions.

```
{{fn (newVariable)
We created the variable: {newVariable}
} "This is the value of the variable"}
```

The variable creation and scope rules can be used to reference the
surrounding scope.

```
{{fn (liTag liClass renderColors)
    <div>
        {renderColors data:colors {fn (color)
            <{liTag}
              {if liClass {+ {+ "class=\"" liClass} "\""}}
              style="background-color: {color}">
            {color}
            </{liTag}>
        }}
    </div>
}
    "li"
    "color"
    {fn (colors renderColor)
        {if colors.length {fn
            <ul>{each colors renderColor}</ul>
        } {fn
            <div>No colors!</div>
        }}
   }
}
```
