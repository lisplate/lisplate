{
  function makeInteger(arr) {
    return parseInt(arr.join(''), 10);
  }
  function withPosition(arr) {
    var loc = location().start;
    return arr.concat([loc.line, loc.column]);
  }
}

start
    = block

block
    = s:(Comment* t:(Tag / buffer) { return t; })* Comment*
    { return ['block', s]; }

eol
    = "\n"
    / "\r\n"
    / "\r"
    / "\u2028"
    / "\u2029"

ws
    = [\t\v\f \u00A0\uFEFF] / eol

opentag
    = "{"
closetag
    = "}"
openarray
    = "("
closearray
    = ")"

string
    = '"' s:(!'"' !eol c:. {return c})* '"'
    { return '"' + s.join('') + '"'; }

number
    = n:(float / integer) { return n; }

float
    = l:integer "." r:unsigned_integer { return parseFloat(l + "." + r); }

unsigned_integer
    = digits:[0-9]+ { return makeInteger(digits); }

signed_integer
    = '-' n:unsigned_integer { return n * -1; }

integer
    = signed_integer / unsigned_integer

boolean
    = "true" { return true; }
    / "false" { return false; }

literal
    = l:(string / number / boolean)
    { return ['literal', [l]]; }

keypart
    = s:[a-zA-Z$_] c:[a-zA-Z0-9$_]*
    { return s + c.join(''); }
key
    = f:keypart r:("." p:keypart { return p; })*
    { return r ? [f].concat(r).join('.') : f; }

ctx
    = s:[a-zA-Z] c:[a-zA-Z0-9_]*
    { return s + c.join(''); }

scopeoperator = "::"
identifier
    = c:ctx scopeoperator "."
    { return ['identifier', [c, null]]; }
    / c:ctx scopeoperator i:key
    { return ['identifier', [c, i]]; }
    / i:key
    { return ['identifier', ['', i]]; }

paramlist
    = openarray filler p:(k:key filler { return k; })* filler closearray
    { return p; }
paramset
    = p:(e:expression filler { return e; })*
    { return p; }

buffer
    = e:eol w:ws*
    { return ["format", ['\\n' + w.join('')]]; }
    / b:(!Comment !opentag !closetag !eol c:. {return c})+
    { return ["buffer", [b.join('')]]; }

escapekeys
    = "rb"
    / "lb"
    / "s"
    / "n"
    / "r"
escapes
    = opentag "~" k:escapekeys closetag
    { return ['escape', [k]]; }

commentopen
    = opentag "*"
commentclose
    = "*" closetag
Comment
    = commentopen (!commentclose .)* commentclose

filler
    = (ws / Comment)*

rawopen
    = opentag "`"
rawclose
    = "`" closetag
Raw
    = rawopen r:(!rawclose c:. {return c})* rawclose
    { return withPosition(['raw', [r.join('')]]); }

FnCreate
    = opentag filler "fn" filler p:(l:paramlist filler { return l; })? b:block filler closetag
    { return withPosition(['fn', [p, b]]); }

Call
    = opentag filler c:callable filler p:paramset filler closetag
    { return withPosition(['call', [c, p]]); }

associativeitem
    = ":" k:key filler v:expression
    { return [k, v]; }
Map
    = openarray ":" closearray
    { return ['map', []]; }
    / openarray filler a:(e:associativeitem filler { return e; })+ filler closearray
    { return ['map', [a]]; }
Array
    = openarray closearray
    { return ['array', []]; }
    / openarray filler a:(e:expression filler { return e; })+ filler closearray
    { return ['array', [a]]; }

Empty
    = opentag closetag
    { return ['empty', []]; }

Tag
    = FnCreate
    / Call
    / Raw
    / escapes
    / Empty
expression
    = Tag
    / literal
    / Map
    / Array
    / identifier

internalfunction
    = k:("include"
        / "safe"
        / "escapeHtml"
        / "escapeJson"
        / "escapeJs"
        / "each"
        / "if"
        / "isEmpty"
        / "isNotEmpty")
    { return ['internal', [k]]; }

comparators
    = c:(
        "==" {return 'eq'; }
      / "!=" {return 'neq'; }
      / "<=" {return 'lte'; }
      / ">=" {return 'gte'; }
      / "<" {return 'lt'; }
      / ">" {return 'gt'; }
      / "and" {return 'cmpand'; }
      / "or" {return 'cmpor'; }
      / "not" {return 'not';}
    )
    { return ['internal', [c]]; }
mathators
    = c:(
        "+" {return 'add'; }
      / "-" {return 'sub'; }
      / "*" {return 'mul'; }
      / "/" {return 'div'; }
      / "%" {return 'mod'; }
    )
    { return ['internal', [c]]; }

callable
    = FnCreate
    / comparators
    / mathators
    / internalfunction
    / identifier
