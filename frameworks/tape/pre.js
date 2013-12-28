var test = require('tape');
var through = require('through');
var parser = require('tap-parser');
var inspect = require('util').inspect;

var load_script = require('load-script');
var stack_mapper = require('stack-mapper');
var http = require('http');

process.stdout = through();

var params = (function () {
    var unesc = typeof decodeURIComponent !== 'undefined'
    ? decodeURIComponent : unescape
    ;
var parts = (window.location.search || '').replace(/^\?/, '').split('&');
var opts = {};
for (var i = 0; i < parts.length; i++) {
    var x = parts[i].split('=');
    opts[unesc(x[0])] = unesc(x[1]);
}
return opts;
})();

var originalLog = console.log;
console.log = function (msg) {
    var index = 1;
    var args = arguments;

    if (typeof msg === 'string') {
        msg = msg.replace(/(^|[^%])%[sd]/g, function (_, s) {
            return s + args[index++];
        });
    }
    else msg = inspect(msg);

    for (var i = index; i < args.length; i++) {
        msg += ' ' + inspect(args[i]);
    }

    if (params.show === undefined || parseBoolean(params.show)) {
        var elem = document.getElementById('__testling_output');
        if (elem) {
            var txt = document.createTextNode(msg + '\n');
            elem.appendChild(txt);
        }
    }

    process.stdout.write(msg + '\n');

    if (typeof originalLog === 'function') {
        return originalLog.apply(this, arguments);
    }
    else if (originalLog) return originalLog(arguments[0]);
};

var parse_stream = parser(function(results) {
    var failed = results.fail;
    window.zuul_results = {
        failed: failed,
        passed: failed.length === 0
    };
});

parse_stream.on('assert', function(res) {
   var ok = res.ok ? 'ok' : 'not ok';

   console.log('res', res);
   console.log(ok);
});

parse_stream.on('extra', function(res) {
});

process.stdout.pipe(parse_stream);

load_script('/__zuul/test-bundle.js', run);

function run(err) {
  if (err) {
    window.zuul_results = {
      failures: 0,
      passed: false
    };
    return;
  }

  var map = undefined;
  var mapper = undefined;

  var opt = {
    path: '/__zuul/test-bundle.map.json'
  };

  http.get(opt, function(res) {
    var body = '';
    res.on('data', function(chunk) {
      body += chunk;
    });

    res.on('end', function() {
      map = JSON.parse(body);
      mapper = stack_mapper(map);

      do_run();
    });
  });

  function do_run() {
  };
}
