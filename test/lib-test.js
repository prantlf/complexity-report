'use strict';

var assert = require('chai').assert;
var reporter = require('../src/lib');
var fs = require('fs');
var path = require('path');

suite('Reporter Checks', function () {
    test('succeeds checking a file path', function (done) {
        var source = path.join(__dirname, 'samples'),
            afterAnalyse, beforeWrite, formatted, message;
        reporter.initialize({
            afterAnalyse: function (result) {
                afterAnalyse = result;
            },
            beforeWrite: function (result) {
                beforeWrite = result;
            },
            write: function () {
                formatted = arguments[0];
                arguments[1]();
            },
            fail: function () {
                message = arguments[0];
            }
        });
        reporter.processPaths([source], function () {
            assert.isObject(afterAnalyse);
            assert.isObject(beforeWrite);
            assert.isString(formatted);
            assert.isUndefined(message);
            done();
        });
    });

    test('fails checking a missing file path', function (done) {
        var source = path.join(__dirname, 'missing'),
            functionName, error;
        reporter.initialize({
            write: function (formatted, cb) {
                cb();
            },
            error: function () {
                functionName = arguments[0];
                error = arguments[1];
            }
        });
        reporter.processPaths([source], function () {
            assert.equal(functionName, 'readFiles');
            assert.instanceOf(error, Error);
            assert.equal(error.code, 'ENOENT');
            done();
        });
    });

    test('succeeds checking an stream', function (done) {
        var source = path.join(__dirname, 'samples/empty-function.js'),
            stream = fs.createReadStream(source),
            formatted, message;
        reporter.initialize({
            write: function () {
                formatted = arguments[0];
                arguments[1]();
            },
            fail: function () {
                message = arguments[0];
            }
        });
        reporter.processStream('stream.js', stream, function () {
            stream.close();
            assert.isString(formatted);
            assert.isUndefined(message);
            done();
        });
    });

    test('succeeds checking an existing file', function (done) {
        var source = path.join(__dirname, 'samples/empty-function.js'),
            formatted, message;
        reporter.initialize({
            write: function () {
                formatted = arguments[0];
                arguments[1]();
            },
            fail: function () {
                message = arguments[0];
            }
        });
        reporter.processFiles([source], function () {
            assert.isString(formatted);
            assert.isUndefined(message);
            done();
        });
    });

    test('succeeds checking a file with shebang', function (done) {
        var source = path.join(__dirname, 'samples/shebang-line.js'),
            formatted, message;
        reporter.initialize({
            write: function () {
                formatted = arguments[0];
                arguments[1]();
            },
            fail: function () {
                message = arguments[0];
            }
        });
        reporter.processFiles([source], function () {
            assert.isString(formatted);
            assert.isUndefined(message);
            done();
        });
    });

    test('succeeds silently', function (done) {
        var source = path.join(__dirname, 'samples/empty-function.js'),
            formatted, message;
        reporter.initialize({
            silent: true,
            write: function () {
                formatted = arguments[0];
                arguments[1]();
            },
            fail: function () {
                message = arguments[0];
            }
        });
        reporter.processFiles([source], function () {
            assert.isUndefined(formatted);
            assert.isUndefined(message);
            done();
        });
    });

    test('writes report to a file', function (done) {
        var source = path.join(__dirname, 'samples/empty-function.js'),
            report = path.join(__dirname, 'samples/empty-function.txt'),
            message;
        reporter.initialize({
            output: report,
            fail: function () {
                message = arguments[0];
            }
        });
        reporter.processFiles([source], function () {
            if (fs.existsSync(report)) {
                fs.unlinkSync(report);
            } else {
                assert.fail();
            }
            assert.isUndefined(message);
            done();
        });
    });

    test('fails writing report to a wrong path', function (done) {
        var source = path.join(__dirname, 'samples/empty-function.js'),
            report = path.join(__dirname, 'missing//empty-function.txt'),
            functionName, error;
        reporter.initialize({
            output: report,
            error: function () {
                functionName = arguments[0];
                error = arguments[1];
            }
        });
        reporter.processFiles([source], function () {
            assert.equal(functionName, 'writeReport');
            assert.instanceOf(error, Error);
            assert.equal(error.code, 'ENOENT');
            done();
        });
    });

    test('fails checking a missing file', function (done) {
        var source = path.join(__dirname, 'samples/missing.js'),
            functionName, error;
        reporter.initialize({
            write: function (formatted, cb) {
                cb();
            },
            error: function () {
                functionName = arguments[0];
                error = arguments[1];
            }
        });
        reporter.processFiles([source], function () {
            assert.equal(functionName, 'readFile');
            assert.instanceOf(error, Error);
            assert.equal(error.code, 'ENOENT');
            done();
        });
    });

    test('fails checking a complex file', function (done) {
        var source = path.join(__dirname, 'samples/complex-function.js'),
            formatted, message;
        reporter.initialize({
            maxcyc: 3,
            write: function () {
                formatted = arguments[0];
                arguments[1]();
            },
            fail: function () {
                message = arguments[0];
            }
        });
        reporter.processFiles([source], function () {
            assert.match(formatted, /complex/);
            assert.match(formatted, /clean/);
            assert.match(message, /samples\/complex-function.js/);
            done();
        });
    });

    test('fails checking a complex project', function (done) {
        var sources = [
                path.join(__dirname, 'samples/empty-function.js'),
                path.join(__dirname, 'samples/complex-function.js')
            ], formatted, message;
        reporter.initialize({
            maxcost: 20,
            write: function () {
                formatted = arguments[0];
                arguments[1]();
            },
            fail: function () {
                message = arguments[0];
            }
        });
        reporter.processFiles(sources, function () {
            assert.match(formatted, /empty/);
            assert.match(formatted, /complex/);
            assert.match(formatted, /clean/);
            assert.isString(message);
            done();
        });
    });

    test('can report only complex functions', function (done) {
        var source = path.join(__dirname, 'samples/complex-function.js'),
            formatted;
        reporter.initialize({
            maxcyc: 3,
            onlyfailures: true,
            write: function () {
                formatted = arguments[0];
                arguments[1]();
            }
        });
        reporter.processFiles([source], function () {
            assert.match(formatted, /complex/);
            assert.notMatch(formatted, /clean/);
            done();
        });
    });

    test('can report only complex modules', function (done) {
        var sources = [
                path.join(__dirname, 'samples/empty-function.js'),
                path.join(__dirname, 'samples/complex-function.js')
            ], formatted;
        reporter.initialize({
            maxcost: 20,
            onlyfailures: true,
            write: function () {
                formatted = arguments[0];
                arguments[1]();
            }
        });
        reporter.processFiles(sources, function () {
            assert.notMatch(formatted, /empty/);
            assert.match(formatted, /complex/);
            done();
        });
    });

    test('reads config from a file', function (done) {
        var source = path.join(__dirname, 'samples/complex-function.js'),
            config = path.join(__dirname, 'samples/complex-config.json'),
            message;
        reporter.initialize({
            config: config,
            write: function (formatted, cb) {
                cb();
            },
            fail: function () {
                message = arguments[0];
            }
        });
        reporter.processFiles([source], function () {
            assert.match(message, /samples\/complex-function.js/);
            done();
        });
    });

    test('ignores missing config file', function (done) {
        var source = path.join(__dirname, 'samples/complex-function.js'),
            config = path.join(__dirname, 'samples/missing.json'),
            formatted, message;
        reporter.initialize({
            config: config,
            write: function () {
                formatted = arguments[0];
                arguments[1]();
            },
            fail: function () {
                message = arguments[0];
            }
        });
        reporter.processFiles([source], function () {
            assert.isString(formatted);
            assert.isUndefined(message);
            done();
        });
    });

    test('can use a custom formatter', function (done) {
        var source = path.join(__dirname, 'samples/complex-function.js'),
            formatter = path.join(__dirname, 'samples/json-format'),
            formatted, message;
        reporter.initialize({
            format: formatter,
            write: function () {
                formatted = arguments[0];
                arguments[1]();
            },
            fail: function () {
                message = arguments[0];
            }
        });
        reporter.processFiles([source], function () {
            assert.isString(formatted);
            assert.isUndefined(message);
            done();
        });
    });
});
