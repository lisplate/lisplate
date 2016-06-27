{
  function makeInteger(arr) {
    return parseInt(arr.join(''), 10);
  }
  function withPosition(arr) {
    return arr;/*.concat([['line', line()], ['col', column()]])*/;
  }
}

start
    = block

block
    = s:(Tag / buffer / Comment)*
    { return withPosition(['block', s]); }

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

literal
    = l:(string / number)
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

identifier
    = c:(c:ctx ":" { return c; })? i:key
    { return withPosition(['identifier', [c || '', i]]); }

paramlist
    = "(" filler p:(k:key filler { return k; })* filler ")"
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
    = "s"
    / "n"
    / "r"
    / "lb"
    / "rb"
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
    = opentag filler s:"!"? c:callable filler p:paramset filler closetag
    { return withPosition(['call', [c, p, !!s]]); }

Array
    = "[" filler a:(e:expression filler { return e; })* filler "]"
    { return withPosition(['array', [a]]); }

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
    / identifier
    / literal
    / Array

internalfunction
    = k:("helper"
        / "include"
        / "each"
        / "if")
    { return ['internal', [k]]; }

comparators
    = c:(
        "==" {return 'eq'; }
      / "!=" {return 'neq'; }
      / "<" {return 'lt'; }
      / ">" {return 'gt'; }
      / "<=" {return 'lte'; }
      / ">=" {return 'gte'; }
      / "&&" {return 'cmpand'; }
      / "||" {return 'cmpor'; }
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
    / internalfunction
    / identifier
    / comparators
    / mathators
