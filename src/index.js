#!/usr/bin/env node

'use strict';

var cli = require('commander'),
    reporter = require('./lib');

// Node v0.10 polyfill for process.exitCode
process.on('exit', function(code) {
    process.exit(code || process.exitCode);
});

parseCommandLine();

cli.error = error;
cli.fail = fail;
cli.write = write;
reporter.initialize(cli);

if (cli.args.length) {
    reporter.processPaths(cli.args, function() {});
} else {
    reporter.processStream('stdin.js', process.stdin, function() {});
}

function parseCommandLine () {
    cli.
        usage('[options] <paths>|stdin').
        option('-c, --config <path>', 'specify path to configuration JSON file').
        option('-o, --output <path>', 'specify an output file for the report').
        option('-f, --format <format>', 'specify the output format of the report').
        option('-e, --ignoreerrors', 'ignore parser errors').
        option('-a, --allfiles', 'include hidden files in the report').
        option('-p, --filepattern <pattern>', 'specify the files to process using a regular expression to match against file names').
        option('-P, --dirpattern <pattern>', 'specify the directories to process using a regular expression to match against directory names').
        option('-x, --excludepattern <pattern>', 'specify the the directories to exclude using a regular expression to match against directory names').
        option('-m, --maxfiles <number>', 'specify the maximum number of files to have open at any point', parseInt).
        option('-F, --maxfod <first-order density>', 'specify the per-project first-order density threshold', parseFloat).
        option('-O, --maxcost <change cost>', 'specify the per-project change cost threshold', parseFloat).
        option('-S, --maxsize <core size>', 'specify the per-project core size threshold', parseFloat).
        option('-M, --minmi <maintainability index>', 'specify the per-module maintainability index threshold', parseFloat).
        option('-C, --maxcyc <cyclomatic complexity>', 'specify the per-function cyclomatic complexity threshold', parseInt).
        option('-Y, --maxcycden <cyclomatic density>', 'specify the per-function cyclomatic complexity density threshold', parseInt).
        option('-D, --maxhd <halstead difficulty>', 'specify the per-function Halstead difficulty threshold', parseFloat).
        option('-V, --maxhv <halstead volume>', 'specify the per-function Halstead volume threshold', parseFloat).
        option('-E, --maxhe <halstead effort>', 'specify the per-function Halstead effort threshold', parseFloat).
        option('-r, --onlyfailures', 'report only modules and functions, which failed the complexity checks ').
        option('-s, --silent', 'don\'t write any output to the console').
        option('-l, --logicalor', 'disregard operator || as source of cyclomatic complexity').
        option('-w, --switchcase', 'disregard switch statements as source of cyclomatic complexity').
        option('-i, --forin', 'treat for...in statements as source of cyclomatic complexity').
        option('-t, --trycatch', 'treat catch clauses as source of cyclomatic complexity').
        option('-n, --newmi', 'use the Microsoft-variant maintainability index (scale of 0 to 100)').
        option('-Q, --nocoresize', 'don\'t calculate core size or visibility matrix').
        parse(process.argv);
}

function error (functionName, err) {
    fail('Fatal error [' + functionName + ']: ' + err.message);
    process.exit(1);
}

function fail (message) {
    console.log(message); // eslint-disable-line no-console
    process.exitCode = 2;
}

function write (formatted, cb) {
    console.log(formatted); // eslint-disable-line no-console
    cb();
}
