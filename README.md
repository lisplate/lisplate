# Lisplate template engine #

Lisplate is a Lisp-like template engine with a reference implementation for JavaScript.

## Installing ##

Currently, Lisplate is only supported with NodeJS.
Browser support is planned for the initial release.

Lisplate will be available on NPM once released. Currently, only pre-release versions are available.
```
npm install lisplate@next
```

## Getting Started ##

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

### Empty Expression ###

The empty expression is mostly used for passing `null`-like values for parameters.

```
{}
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

##### if #####

The if built-in allows for conditional sections.
When the condition is truthy, the ThenExpression is executed.
Otherwise, the ElseExpression is executed.

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

##### include #####

**Incomplete** The include function is not complete and still in-development.

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
```
Context:Identifier
```
```
{p:myParameter}
{each p:myArray {fn (myItem)
  This is the array item: {myItem}
  This is the parameter item: {p:myItem}
}}
```

Built in functions are on the `i` context, but are accessible without a context specifier.

Parameters sent to the template via an include or through rendering are in the `p` context.

View model functions and data are in the `v` context.

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
        {renderColors p:colors {fn (color)
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
            <ul>{colors.map renderColor}</ul>
        } {fn
            <div>No colors!</div>
        }}
   }
}
```
