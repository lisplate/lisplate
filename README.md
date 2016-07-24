# Lisplate template engine #

[![npm version](https://badge.fury.io/js/lisplate.svg)](https://badge.fury.io/js/lisplate)
[![Build Status](https://travis-ci.org/lisplate/lisplate.svg?branch=master)](https://travis-ci.org/lisplate/lisplate)
[![Coverage Status](https://coveralls.io/repos/github/lisplate/lisplate/badge.svg?branch=master)](https://coveralls.io/github/lisplate/lisplate?branch=master)

Lisplate is a Lisp-like template engine with a reference implementation for JavaScript.

## Installing ##

Lisplate is available on NPM.
```
npm install lisplate
```

## Getting Started ##

Once you have lisplate installed, you can require it in like any other module.

For the browser side, Lisplate provides lisplate-core and lisplate-full bundles.
The lisplate-core bundle includes only the core and does not include the
compiler. The lisplate-full bundle includes the compiler as well as the core.

Lisplate does require a global Promise to be set up. Native ES6 promises are supported
along with any Promise polyfill or setting global.Promise to the implementation
of your choice.

Lisplate exports a class to allow users to create different instances.
Each instance may have different loaders, configuration, and run completely separate.

In order to load templates,
Lisplate requires a `sourceLoader` function to find and read the source to be compiled.

Lisplate also provides hooks to load view models for templates using the
`viewModelLoader` function and strings using the `stringsLoader`.

Each of the three hook points take only one parameter, the `templateName`.
The `templateName` is the same that is passed to `loadTemplate`, `renderTemplate`,
or as the key to the cache.

The `sourceLoader` and `viewModelLoader` may use Promises, run synchronously,
or use a supplied callback. If the hook takes a second argument, it is assumed
to be asynchronous with a callback.

In the examples below, the `sourceLoader` is used asynchronously with a callback,
the `viewModelLoad` is used synchronously,
and the `stringsLoader` is used as a Promise.

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
    },
    stringsLoader: function(templateName) {
        var readFileAsync = Bluebird.promisify(fs.readFile);

        var filepath = path.resolve(myStringDirectory, templatePath + '.json');
        return readFileAsync(filepath, 'UTF-8').then(JSON.parse);
    }
});
```

## Compiling ahead of time ##

The compiler can be used to compile templates ahead of time into UMD modules.
These modules support AMD and CommonJS loaders as well as being included
in browser script tags.

## Lisplate Instance API ##

### function addHelper(name, fn) ###
Adds the function `fn` to the helpers context identified by `name`.

### function loadTemplate(templateInfo, [callback]) ###
Loads a template by name or a pre-compiled template.

`templateInfo` may be an object with a `templateName` string and a
`render` factory function. if the `render` function is missing
and only a `templateName` exists, the `loadTemplate` will work as if
`templateInfo` was a string (see below).

`templateInfo` may be a string for the name of the template that will
be loaded with the `sourceLoader` and compiled into a render factory.

Once the render factory is loaded, the `viewModelLoader` is called
if one exists. The render factory is used to generate the final renderable.
The final renderable is cached using the `templateName` as the key.

This function returns a promise which returns the renderable.
The renderable can be passed to `render`.
In most cases, you will want to use `renderTemplate` and pass a `templateName`.

If a callback is passed, the callback is used to return instead of returning
a promise.

### function render(template, data, [callback]) ###
Renders a template from the `template` function.
May return a string or a Promise if the template requires asynchronous handling.
If a callback is passed, the callback will be used instead.

### function renderTemplate(templateName, data, [callback]) ###
Similar to `render`, but accepts a `templateName` to determine which template to load
and render. If `templateName` is a function, the function is used as the template function
passed to `render`. The output is the same as the `render` function.

## Lisplate.Compiler ##

### function compile(templateName, src) ###
Compiles the `src` and returns a render-factory function that can be passed to `loadTemplate`.
The compiled code must be loaded before the template can be rendered.

### function compileMpdule(templateName, src) ###
Runs the `compile` function and returns a UMD wrapped template.


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

### Comments ###

Comments can be anywhere in code and are surrounded by `{*` and `*}`

```
{* comment *}
{myfunction {* call with empty as parameter *} {}}
```

### Arrays ###

The array expression allows creation of standard arrays.
Arrays may contain anything using expressions.
Unlike JavaScript arrays, Lisplate arrays are separated by spaces
similar to function parameters.

```
(itemOne itemTwo {+ 3 5} {fn (a b) {- a b}})
()
```

### Associative Arrays / Maps ###

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

### Dynamic Key Lookup ###

Looking up a value using a key on an associative array or a normal array uses `get`.
```
{get myArray 0}
{get myArray index}
{get myObject "myKey"}
{get myObject dynamicKey}
```

`get` can also be used without a key to return the value of something.
```
{get myValue}
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

#### Escaping ###

By default, printing the contents of a variable will be escaped per the HTML escape function.
To disable automatic escaping, use a `safe` function before the identifier to print the contents as is.

```
{safe myRawContents}
{safe {myFunction value}}
```

The automatic escaping only occurs for externally-defined variables and functions.
Built-in functions do not escape their output nor do any functions defined in the template.

Externally defined functions recieve non-escaped values as inputs.
The output of the externally defined function will be escaped.
Using `safe` for passing parameters is a no-operation as no escaping is performed anyway.

The available escape functions are `escapeHtml`, `escapeJs`, and `escapeJson`.
These may be called in the code at any time and compiled.

Declaring anything as "safe" will not negate any later escapes.
Therefore, one may declare something as "safe" for HTML, then escape for JS.

Using one type of escape function will consider the value safe for printing.
Using an `escapeJs` may still need to be escaped for HTML to prevent errors.
In this case, you must use both `escapeJs` and `escapeHtml`.

```
{escapeHtml someHtml}
{escapeJs someJs}
{escapeJson someJson}

{escapeHtml {safe doesNotGetEscaped}}}
```

#### Built-in functions ####

Lisplate provides a number of built-in functions.

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

##### Math #####

The standard math operators are available:

`+`, `-`, `*`, `/`, `%`

Each can also be called by the internal names, which the operators are aliases for:

`add`, `sub`, `mul`, `div`, `mod`

##### Comparisons #####

The standard comparison operators are available:

`==`, `!=`, `<`, `>`, `<=`, `>=`

Each can also be called by the internal names, which the operators are aliases for:

`eq`, `neq`, `lt`, `gt`, `lte`, `gte`

The one exception is for the `not`, `and`, and `or`
use the full word instead of the symbol notation.

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

### Namespaces ###

Namespaces are special variables that provide access to template parameters and view models.
Namespaces can be used to access variables even if the variable name is used as a parameter.
To select a namespace for an identifier, put the namespace label and a colon before the identifier.
Namespaces and fields on a namespace are protected and can not be overriden by internal scopes.
```
Namespace::Identifier
```
```
{data::myParameter}
{helper::myHelper}
{viewmodel::myViewModelItem}
{strings::someString}
{each data::myArray {fn (myItem)
  This is the array item: {myItem}
  This is the data item: {data::myItem}
}}
```

Built in functions are on the `runtime` namespace, but are accessible without a namespace specifier.

Added helper functions are in the `helper` namespace.

Data sent to the template via an include or through rendering is in the `data` namespace.

View model fields are accessible in the `viewmodel` namespace.

Fields in the strings file are accessible in the `strings` namespace.

Not specifying a namespace will perform the following searches attempting to locate the identifier:

1. an internal function?
2. declared as a parameter to a parent block/function?
3. perform a search in the following order:
   1. viewmodel
   2. data
   3. helpers
   4. strings
   5. render-context

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

## Issues to watch for ##

### Parameters are not called automatically ###

Passing a function as a parameter does not resolve the return value immediate.
The function itself is passed as a parameter.
In order to call the function immediately, wrap it as an explicit function call.
```
{myFn1 {myfn2 fn2p1} fn1p2}
```

### this and Binding ###

Lisplate will use proper bindings to maintain `this` when making a function call.
The following two examples will call with the generally expected `this` context.
```
{myObject.aFunction}
{myObject.someFunction some parameters}
```

When passing a function as a parameter, the `this` context will be lost.
This is the same behavior as in normal JavaScript. The same workarounds apply here.
The most common occurances revolve around the `if` and `each`, which usually
expect functions to be passed in to execute.
```
{if myValue myObject.myFnCall} {* "this" context will not be the expected one *}
```

1. Pre-bind the function in your data or viewmodel before passing into Lisplate
3. Wrap in a block to preserve auto-binding behavior
   ```
   {if myValue {fn
     {myObject.myFnCall} {* proper binding is maintained here *}
   }}
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
