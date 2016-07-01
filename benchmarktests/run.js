var Lisplate = require('../');
var data = require('./friends/data');

var engine = new Lisplate({
});

var template = function(vmc){return function($L,$p,$i) {var $v=vmc?new vmc($p):null; var $h=$L.helpers; var $_w=$i.$W;
var $c = new $_w();
var $i_each= $i.each,
$i_escapeHtml= $i.escapeHtml,
$i_if= $i.if;

$c.w("<!doctype html><html lang=\"en\"><head><meta charset=\"UTF-8\"><title>Friends</title></head><body><div class=\"friends\">")
$c.w($i_each($p.friends,(function(friend) {
var $c = new $_w();
$c.w("<div class=\"friend\"><ul><li>Name: ")
$c.w($i_escapeHtml($p.getFullNameMve(friend)))
$c.w("</li><li>Balance: ")
$c.w($i_escapeHtml(friend.balance))
$c.w("</li><li>Age: ")
$c.w($i_escapeHtml(friend.age))
$c.w("</li><li>Address: ")
$c.w($i_escapeHtml(friend.address))
$c.w("</li><li>Image: <img src=\"")
$c.w($i_escapeHtml(friend.picture))
$c.w("\"></li><li>Company: ")
$c.w($i_escapeHtml(friend.company))
$c.w("</li><li>Email: <a href=\"mailto:")
$c.w($i_escapeHtml(friend.email))
$c.w("\">")
$c.w($i_escapeHtml(friend.email))
$c.w("</a></li><li>About: ")
$c.w($i_escapeHtml(friend.about))
$c.w("</li>")
$c.w($i_if(friend.tags,(function() {
var $c = new $_w();
$c.w("<li>Tags:<ul>")
$c.w($i_each(friend.tags,(function(item) {
var $c = new $_w();
$c.w("<li>")
$c.w($i_escapeHtml(item))
$c.w("</li>")

 return $c.getOutput();
})
))
$c.w("</ul></li>")

 return $c.getOutput();
})
))
$c.w($i_if(friend.friends.length,(function() {
var $c = new $_w();
$c.w("<li>Friends:<ul>")
$c.w($i_each(friend.friends,(function(f) {
var $c = new $_w();
$c.w("<li>")
$c.w($i_escapeHtml(f.name))
$c.w(" (")
$c.w($i_escapeHtml(f.id))
$c.w(")</li>")

 return $c.getOutput();
})
))
$c.w("</ul></li>")

 return $c.getOutput();
})
))
$c.w("</ul></div>")

 return $c.getOutput();
})
))
$c.w("</div></body></html>")

return $c.getOutput();
}
};

for (var i=0; i < 50000; i++) {
    engine.render(template, data);
}
