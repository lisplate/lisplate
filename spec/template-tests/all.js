(function(root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.IntegrationTests = factory();
  }
}(this, function() {
  var tests = {};
  var subcomponents = {};

  subcomponents['subcomponents/basic'] = {
    source: "{data::should} {data::show}",
  };

  subcomponents['subcomponents/plain'] = {
    source: "Plain",
  };

  subcomponents['subcomponents/ui-components-colors'] = {
    source: "{{fn (renderColor renderColors)\n" +
            "    <div className=\"colors\">\n" +
            "        Hello {data::name}\n" +
            "        {renderColors data::colors renderColor}\n" +
            "    </div>\n" +
            "}\n" +
            "    {fn (color)\n" +
            "        <li className=\"color\" style=\"background-color: {color}\">\n" +
            "            {color}\n" +
            "        </li>\n" +
            "    }\n" +
            "\n" +
            "    {fn (colors renderColor)\n" +
            "        {if {isNotEmpty colors} {fn\n" +
            "            <ul>{each colors renderColor}</ul>\n" +
            "        } {fn\n" +
            "            <div>No colors!</div>\n" +
            "        }}\n" +
            "   }\n" +
            "}",
  };

  tests['arrays-and-maps'] = {
    source: "{{fn (a b c d)\n" +
            "    {each a \"should not show\" \"should show\"}\n" +
            "    {each b \"3x\" \"should not show\"}\n" +
            "    {if c.a \"should not show\" \"should show\"}\n" +
            "    {d.a}\n" +
            "    {d.b}\n" +
            "    {d.c}\n" +
            "} () (1 2 3) (:) (:a 4 :b 5 :c 6)}",
    expected: "should show3x3x3xshould show456",
  };

  function AsyncModel() {
  }
  AsyncModel.prototype.showme = function() {
    return Promise.resolve('should show');
  };
  AsyncModel.prototype.iftest = function() {
    return Promise.resolve(true);
  };
  AsyncModel.prototype.eachtest = function() {
    return Promise.resolve(['a', 'b', 'c']);
  };
  tests['async'] = {
    source: "{viewmodel::showme}{~n}\n" +
            "{if {viewmodel::iftest} \"should show\" \"should not show\"}{~n}\n" +
            "{each {viewmodel::eachtest} \"3x\" \"should not show\"}",
    expected: "should show\n" +
              "should show\n" +
              "3x3x3x",
    viewmodel: AsyncModel,
  };

  tests['comments'] = {
    source: "{* hidden *}\n" +
            "{{* hidden *}if{* hidden *}}",
    expected: "",
  };

  tests['compares'] = {
    source: "{if {< 5 3} \"should not show\" \"should show\"}{~n}\n" +
            "{if {> 5 3} \"should show\" \"should not show\"}{~n}\n" +
            "{if {>= 5 3} \"should show\" \"should not show\"}{~n}\n" +
            "{if {>= 5 5} \"should show\" \"should not show\"}{~n}\n" +
            "{if {<= 5 3} \"should not show\" \"should show\"}{~n}\n" +
            "{if {<= 5 5} \"should show\" \"should not show\"}{~n}\n" +
            "{if {== 5 5} \"should show\" \"should not show\"}{~n}\n" +
            "{if {== 5 3} \"should not show\" \"should show\"}{~n}\n" +
            "{if {!= 5 3} \"should show\" \"should not show\"}{~n}\n" +
            "{if {!= 5 5} \"should not show\" \"should show\"}{~n}\n" +
            "{if {not {== 5 3}} \"should show\" \"should not show\"}{~n}\n" +
            "{if {and {== 5 5} {> 5 3}} \"should show\" \"should not show\"}{~n}\n" +
            "{if {and {== 5 5} {> 5 5}} \"should not show\" \"should show\"}{~n}\n" +
            "{if {and {== 5 3} {> 5 3}} \"should not show\" \"should show\"}{~n}\n" +
            "{if {and {== 5 3} {> 5 5}} \"should not show\" \"should show\"}{~n}\n" +
            "{if {or {== 5 5} {> 5 3}} \"should show\" \"should not show\"}{~n}\n" +
            "{if {or {== 5 5} {> 5 5}} \"should show\" \"should not show\"}{~n}\n" +
            "{if {or {== 5 3} {> 5 3}} \"should show\" \"should not show\"}{~n}\n" +
            "{if {or {== 5 3} {> 5 5}} \"should not show\" \"should show\"}",
    expected: "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show",
  };

  tests['data'] = {
    source: "{data::should} {data::show}",
    expected: "should show",
    data: {
      should: 'should',
      show: function() {
        return 'show';
      }
    },
  };

  tests['def'] = {
    source: "{def hello \"Hello\"}\n" +
            "{hello} World!{~n}\n" +
            "\n" +
            "{def func {fn\n" +
            "  {def hello \"Hola\"}\n" +
            "  {def four {+ {* 1 2} {- 87 85}}}\n" +
            "  {hello} Mundo! {four}\n" +
            "}}\n" +
            "{func}",
    expected: "Hello World!\n" +
              "Hola Mundo! 4",
  };

  tests['empty-each'] = {
    source: "{each () \"should not show\" \"should show\"}",
    expected: "should show",
  };

  tests['empty'] = {
    source: "",
    expected: "",
  };

  tests['escape-rules'] = {
    source: "{{fn (test renderColor renderColors)\n" +
            "    <div className=\"colors\">\n" +
            "        Hello {test.name}\n" +
            "        {renderColors test.colors renderColor}\n" +
            "    </div>\n" +
            "}\n" +
            "    (:name \"Test\" :colors (\"red\" \"green\" \"blue\"))\n" +
            "    {fn (color)\n" +
            "        <li className=\"color\" style=\"background-color: {color}\">\n" +
            "            {color}\n" +
            "        </li>\n" +
            "    }\n" +
            "\n" +
            "    {fn (colors renderColor)\n" +
            "        {if {isNotEmpty colors} {fn\n" +
            "            <ul>{each colors renderColor}</ul>\n" +
            "        } {fn\n" +
            "            <div>No colors!</div>\n" +
            "        }}\n" +
            "   }\n" +
            "}",
    expected: "<div className=\"colors\">Hello Test<ul><li className=\"color\" style=\"background-color: red\">red</li><li className=\"color\" style=\"background-color: green\">green</li><li className=\"color\" style=\"background-color: blue\">blue</li></ul></div>",
  };

  tests['escaped'] = {
    source: "{data::fn \"hello world\"}{~n}\n" +
            "{data::escape}{~n}\n" +
            "{escapeJs data::js}{~n}\n" +
            "{escapeHtml {escapeJs data::jsWithHtml}}{~n}\n" +
            "{escapeHtml {escapeJs {safe data::jsWithHtml}}}{~n}\n" +
            "{escapeJson data::json}{~n}\n" +
            "{escapeHtml \"\"}{~n}\n" +
            "{escapeJs \"\"}{~n}\n" +
            "{escapeJson \"\"}{~n}\n" +
            "{escapeJs {safe data::js}}{~n}\n" +
            "{escapeJson {safe data::json}}",
    expected: "&lt;br&gt;\n" +
              "&lt;br&gt;\n" +
              "var somejs = \\'test\\';\\n" +
              "var something = \\\"el\\\\\\\"se\\\";\n" +
              "var somehtml = \\&#39;&lt;br&gt;\\&#39;;\n" +
              "var somehtml = \\&#39;&lt;br&gt;\\&#39;;\n" +
              "{\\\"some\\\": \\\"json\\\"}\n" +
              "\n" +
              "\n" +
              "\n" +
              "var somejs = \\'test\\';\\n" +
              "var something = \\\"el\\\\\\\"se\\\";\n" +
              "{\\\"some\\\": \\\"json\\\"}",
    data: {
      fn: function(param) {
        return "<br>";
      },
      escape: "<br>",
      js: "var somejs = 'test';\nvar something = \"el\\\"se\";",
      jsWithHtml: "var somehtml = '<br>';",
      json: "{\"some\": \"json\"}"
    },
  };

  tests['escapes'] = {
    source: "{~s}{~n}{~lb}{~r}{~rb}",
    expected: " \n" +
              "{\r}",
  };

  tests['false-if'] = {
    source: "{if false \"should not show\" \"should show\"}",
    expected: "should show",
  };

  tests['if-expression'] = {
    source: "{each data::accounts {fn (account)\n" +
            "<div>\n" +
            "    {if {== account.accountStatus \"closed\"} {fn\n" +
            "    <div>\n" +
            "        Your account has been closed!\n" +
            "    </div>\n" +
            "    } {if {== account.accountStatus \"suspended\"} {fn\n" +
            "    <div>\n" +
            "        Your account has been temporarily suspended\n" +
            "    </div>\n" +
            "    } {fn\n" +
            "    <div>\n" +
            "        Bank balance:\n" +
            "        <span class=\"{if {< account.balance 0} \"negative\" \"positive\"}\">${account.balanceFormatted}</span>\n" +
            "    </div>\n" +
            "    }}}\n" +
            "</div>\n" +
            "}}",
    expected: "<div><div>Bank balance:<span class=\"positive\">$$0.00</span></div></div><div><div>Bank balance:<span class=\"positive\">$$10.00</span></div></div><div><div>Bank balance:<span class=\"negative\">$$-100.00</span></div></div><div><div>Bank balance:<span class=\"positive\">$$999.00</span></div></div>",
    data: {
        "accounts": [
            {
                "balance": 0,
                "balanceFormatted": "$0.00",
                "status": "open"
            },
            {
                "balance": 10,
                "balanceFormatted": "$10.00",
                "status": "closed"
            },
            {
                "balance": -100,
                "balanceFormatted": "$-100.00",
                "status": "suspended"
            },
            {
                "balance": 999,
                "balanceFormatted": "$999.00",
                "status": "open"
            }
        ]
    },
  };

  tests['immediate-functions'] = {
    source: "{{fn (show)\n" +
            "should {show}\n" +
            "} \"show\"}",
    expected: "should show",
  };

  tests['includes'] = {
    source: "{include \"subcomponents/basic\" (:should \"should\" :show {fn\n" +
            "show\n" +
            "})}{~n}\n" +
            "{include \"subcomponents/plain\"}",
    expected: "should show\n" +
              "Plain",
  };

  tests['isempty'] = {
    source: "{if {isEmpty 0} \"should not show\" \"should show\"}{~n}\n" +
            "{if {isEmpty 1} \"should not show\" \"should show\"}{~n}\n" +
            "{if {isEmpty 99999} \"should not show\" \"should show\"}{~n}\n" +
            "{if {isEmpty ()} \"should show\" \"should not show\"}{~n}\n" +
            "{if {isEmpty (1)} \"should not show\" \"should show\"}{~n}\n" +
            "{if {isEmpty \"\"} \"should show\" \"should not show\"}{~n}\n" +
            "{if {isEmpty \"a\"} \"should not show\" \"should show\"}{~n}\n" +
            "{if {isNotEmpty (1)} \"should show\" \"should not show\"}",
    expected: "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show",
  };

  tests['key-access'] = {
    source: "{data::value.test}{~n}\n" +
            "{get data::test}{~n}\n" +
            "{get data::value \"test\"}{~n}\n" +
            "{get data::value data::key}{~n}\n" +
            "{get data::arr 1}{~n}\n" +
            "{get data::arr data::index}",
    expected: "Should show\n" +
              "Should show\n" +
              "Should show\n" +
              "Should show\n" +
              "Should show\n" +
              "Should show",
    data: {
      test: 'Should show',

      arr: ['Should not show', 'Should show'],
      index: 1,

      value: {
        test: 'Should show'
      },
      key: 'test'
    },
  };

  tests['literals'] = {
    source: "{{fn (a b c d e f g)\n" +
            "{a}{~s}\n" +
            "{b}{~s}\n" +
            "{c}{~s}\n" +
            "{d}{~s}\n" +
            "{e}{~s}\n" +
            "{f}{~s}\n" +
            "{g}\n" +
            "} -1 42 3.14 \"string\" \"\" true false}",
    expected: "-1 42 3.14 string  true false",
  };

  function LookupsModel() {
    this.inviewmodel = 'should show';
  }
  tests['lookups'] = {
    source: "{inviewmodel}{~n}\n" +
            "{indata}{~n}\n" +
            "{instrings}{~n}\n" +
            "\n" +
            "{{fn (indata)\n" +
            "{inviewmodel}{~n}\n" +
            "{indata}{~n}\n" +
            "{instrings}\n" +
            "} \"something different\"}",
    expected: "should show\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "something different\n" +
              "should show",
    viewmodel: LookupsModel,
    strings: {
      "instrings": "should show"
    },
    data: {
      inviewmodel: 'should not show',
      indata: 'should show'
    },
  };

  tests['maths'] = {
    source: "{+ 1 1}{~s}{- 1 1}{~s}{* 5 5}{~s}{/ 42 7}{~s}{% 7 2}{~s}{* {+ 2 3} {- {% 7 2} {/ 4 2}}}",
    expected: "2 0 25 6 1 -5",
  };

  tests['nested-if'] = {
    source: "{if false \"should not show\"\n" +
            "    {if false \"should not show\"\n" +
            "        \"should show\"\n" +
            "    }\n" +
            "}",
    expected: "should show",
  };

  tests['no-out-each'] = {
    source: "{each (1 2 3) {} {}}\n" +
            "{each (1 2 3)}\n" +
            "{each () {}}\n" +
            "{each ()}\n" +
            "{each}",
    expected: "",
  };

  tests['no-out-if'] = {
    source: "{if true {} {}}\n" +
            "{if true {}}\n" +
            "{if true}\n" +
            "{if false {} {}}\n" +
            "{if false {}}\n" +
            "{if false}\n" +
            "{if}",
    expected: "",
  };

  tests['nonempty-each'] = {
    source: "{each (5 4 3 2 1) {fn (v i)\n" +
            "{+ i 1}: should show {- v 1} more times\n" +
            "} \"should not show\"}",
    expected: "1: should show 4 more times2: should show 3 more times3: should show 2 more times4: should show 1 more times5: should show 0 more times",
  };

  tests['nullwrite'] = {
    source: "{}",
    expected: "",
  };

  tests['pipes'] = {
    source: "{\"hello world\"|{fn (h) {h}}}{~n}\n" +
            "{(\"SHOULD SHOW\" \"should not show\" \"Should NOT show\")|data::fn2|data::fn3}{~n}\n" +
            "{data::v|data::fn1|data::fn2|data::fn3}{~n}\n" +
            "{(:key1 \"SHOULD SHOW\" :key2 \"should not show\")|data::getkey1|data::fn3}{~n}\n" +
            "{data::js|escapeJs}",
    expected: "hello world\n" +
              "should show\n" +
              "should show\n" +
              "should show\n" +
              "var js = \\\"test<br>\\\";",
    data: {
      v: 'SHOULD SHOW|should not show|should not show',
      fn1: function(p) {
        return p.split('|');
      },
      fn2: function(p) {
        return p[0];
      },
      fn3: function(p) {
        return p.toLowerCase();
      },

      getkey1: function(p) {
        return p.key1;
      },

      js: 'var js = "test<br>";'
    },
  };

  tests['pragma'] = {
    source: "{pragma keepWhitespace true}\n" +
            "   this keeps whitespace\n" +
            "   {data::test}\n" +
            "{pragma keepWhitespace false}\n" +
            "{pragma defaultEscape \"escapeJs\"}\n" +
            "   no longer keeps whitespace\n" +
            "   {data::test}",
    expected: "\n" +
              "   this keeps whitespace\n" +
              "   var js = &#39;test &lt;br&gt;&#39;;\n" +
              "no longer keeps whitespacevar js = \\'test <br>\\';",
    data: {
      "test": "var js = 'test <br>';"
    },
  };

  tests['raw'] = {
    source: "{`{should show}`}",
    expected: "{should show}",
  };

  tests['reverse-helper'] = {
    source: "{helper::reverse data::A}\n" +
            "{helper::reverse data::B}\n" +
            "{helper::reverse data::C}\n" +
            "{helper::reverse data::D}\n" +
            "{helper::reverse data::E}",
    expected: "knarFeoJmoTenaJrefinneJ",
    data: {
      "A": "Frank",
      "B": "Joe",
      "C": "Tom",
      "D": "Jane",
      "E": "Jennifer"
    },
  };

  tests['simple-1'] = {
    source: "<div class=\"colors\">\n" +
            "    Hello {data::name}!\n" +
            "\n" +
            "    {if {isNotEmpty data::colors} {fn\n" +
            "    <ul>\n" +
            "        {each data::colors {fn (color)\n" +
            "        <li class=\"color\">{color}</li>\n" +
            "        }}\n" +
            "    </ul>\n" +
            "    } {fn\n" +
            "    <div>\n" +
            "        No colors!\n" +
            "    </div>\n" +
            "    }}\n" +
            "</div>",
    expected: "<div class=\"colors\">Hello Jane Doe!<div>No colors!</div></div>",
    data: {
      "name": "Jane Doe",
      "colors": []
    },
  };

  tests['simple-2'] = {
    source: "<div>\n" +
            "    <h1 class='header'>{data::header}</h1>\n" +
            "    <h2 class='header2'>{data::header2}</h2>\n" +
            "    <h3 class='header3'>{data::header3}</h3>\n" +
            "    <h4 class='header4'>{data::header4}</h4>\n" +
            "    <h5 class='header5'>{data::header5}</h5>\n" +
            "    <h6 class='header6'>{data::header6}</h6>\n" +
            "    <ul class='list'>\n" +
            "        {each data::list {fn (item)\n" +
            "        <li class='item'>{item}</li>\n" +
            "        }}\n" +
            "    </ul>\n" +
            "</div>",
    expected: "<div><h1 class='header'>Header</h1><h2 class='header2'>Header2</h2><h3 class='header3'>Header3</h3><h4 class='header4'>Header4</h4><h5 class='header5'>Header5</h5><h6 class='header6'>Header6</h6><ul class='list'><li class='item'>1000000000</li><li class='item'>2</li><li class='item'>3</li><li class='item'>4</li><li class='item'>5</li><li class='item'>6</li><li class='item'>7</li><li class='item'>8</li><li class='item'>9</li><li class='item'>10</li></ul></div>",
    data: {
      "header": "Header",
      "header2": "Header2",
      "header3": "Header3",
      "header4": "Header4",
      "header5": "Header5",
      "header6": "Header6",
      "list": ["1000000000", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
    },
  };

  tests['strings'] = {
    source: "",
    expected: "",
  };

  tests['true-if'] = {
    source: "{if true \"should show\" \"should now show\"}",
    expected: "should show",
  };

  tests['ui-components'] = {
    source: "<div class=\"my-app\">\n" +
            "    {include \"subcomponents/ui-components-colors\" data::.}\n" +
            "</div>",
    expected: "<div class=\"my-app\"><div className=\"colors\">Hello John Doe<ul><li className=\"color\" style=\"background-color: red\">red</li><li className=\"color\" style=\"background-color: green\">green</li><li className=\"color\" style=\"background-color: blue\">blue</li><li className=\"color\" style=\"background-color: yellow\">yellow</li><li className=\"color\" style=\"background-color: orange\">orange</li><li className=\"color\" style=\"background-color: pink\">pink</li><li className=\"color\" style=\"background-color: black\">black</li><li className=\"color\" style=\"background-color: white\">white</li><li className=\"color\" style=\"background-color: beige\">beige</li><li className=\"color\" style=\"background-color: brown\">brown</li><li className=\"color\" style=\"background-color: cyan\">cyan</li><li className=\"color\" style=\"background-color: magenta\">magenta</li></ul></div></div>",
    data: {
      "name": "John Doe",
      "colors": ["red", "green", "blue", "yellow", "orange", "pink", "black", "white", "beige", "brown", "cyan", "magenta"]
    },
  };

  tests['undefined-each'] = {
    source: "{{fn (test)\n" +
            "    {each test.key \"should not show\" \"should show\"}\n" +
            "} (:otherkey \"value\")}",
    expected: "should show",
  };

  tests['undefined-if'] = {
    source: "{{fn (test)\n" +
            "    {if test.key \"should not show\" \"should show\"}\n" +
            "} (:otherkey \"value\")}",
    expected: "should show",
  };

  tests['unescaped'] = {
    source: "{safe {data::fn \"hello world\"}}{~n}\n" +
            "{safe data::escape}{~n}\n" +
            "{safe data::js}{~n}\n" +
            "{safe data::json}{~n}\n" +
            "{~n}\n" +
            "\n" +
            "{safe {{fn\n" +
            "  {data::fn \"hello world\"}{~n}\n" +
            "  {data::escape}\n" +
            "}}}",
    expected: "<br>\n" +
              "<br>\n" +
              "var somejs = 'test';\n" +
              "var something = \"el\\\"se\";\n" +
              "{\"some\": \"json\"}\n" +
              "\n" +
              "<br>\n" +
              "<br>",
    data: {
      fn: function(param) {
        return "<br>";
      },
      escape: "<br>",
      js: "var somejs = 'test';\nvar something = \"el\\\"se\";",
      json: "{\"some\": \"json\"}"
    },
  };

  function ViewmodelsModel() {
    this.should = 'should';
  }
  ViewmodelsModel.prototype.show = function() {
    return 'show';
  };
  tests['viewmodels'] = {
    source: "{viewmodel::should} {viewmodel::show}",
    expected: "should show",
    viewmodel: ViewmodelsModel,
  };

  return {
    tests: tests,
    subcomponents: subcomponents
  };
}));
