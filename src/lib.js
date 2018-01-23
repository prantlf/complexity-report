/*globals require, process */

'use strict';

var options, formatter, state, queue, cli,

config = require('./config'),
fs = require('fs'),
path = require('path'),
escomplex = require('escomplex'),
check = require('check-types'),
async = require('async');

function initialize (input) {
    cli = input || {};

    if (check.function(cli.error) === false) {
        cli.error = function () {};
    }

    if (check.function(cli.fail) === false) {
        cli.fail = function () {};
    }

    configure();

    state = {
        sources: {
            js: []
        }
    };

    queue = async.queue(readFile, cli.maxfiles);
}

function configure () {
    var config;

    config = readConfig(cli.config);

    Object.keys(config).forEach(function (key) {
        if (cli[key] === undefined) {
            cli[key] = config[key];
        }
    });

    options = {
        logicalor: !cli.logicalor,
        switchcase: !cli.switchcase,
        forin: cli.forin || false,
        trycatch: cli.trycatch || false,
        newmi: cli.newmi || false,
        ignoreErrors: cli.ignoreerrors || false,
        noCoreSize: cli.nocoresize || false
    };

    if (check.nonEmptyString(cli.format) === false) {
        cli.format = 'plain';
    }

    if (check.nonEmptyString(cli.filepattern) === false) {
        cli.filepattern = '\\.js$';
    }
    cli.filepattern = new RegExp(cli.filepattern);

    if (check.nonEmptyString(cli.dirpattern)) {
        cli.dirpattern = new RegExp(cli.dirpattern);
    }

    if (check.nonEmptyString(cli.excludepattern)) {
        cli.excludepattern = new RegExp(cli.excludepattern);
    }

    if (check.number(cli.maxfiles) === false) {
        cli.maxfiles = 1024;
    }

    try {
        formatter = require('./formats/' + cli.format);
    } catch (err) {
        formatter = require(cli.format);
    }
}

function readConfig (configPath) {
    var configInfo;

    try {
        if (check.not.nonEmptyString(configPath)) {
            configPath = path.join(process.cwd(), '.complexrc');
        }

        if (fs.existsSync(configPath)) {
            configInfo = fs.statSync(configPath);

            if (configInfo.isFile()) {
                return JSON.parse(fs.readFileSync(configPath), { encoding: 'utf8' });
            }
        }
    } catch (err) {
        cli.error('readConfig', err);
    }

    return {};
}

function drainQueue (cb) {
    queue.drain = function() {
        getReports(cb);
    };
}

function processStream (fileName, stream, cb) {
    var source = '';
    stream.on('data', function (chunk) {
        source += chunk;
      })
      .on('end', function () {
        scheduleSourceFile(fileName, source);
        getReports(cb);
      })
      .on('error', function (error) {
        cli.error('readStream', error);
        cb();
      });
}

function processFiles (files, cb) {
    files.forEach(function (file) {
        queue.push(file);
    });
    drainQueue(cb);
}

function processPaths (paths, cb) {
    async.each(paths, processPath, function(err) {
        if (err) {
            cli.error('readFiles', err);
            return cb();
        }
        drainQueue(cb);
    });
}

function processPath(p, cb) {
    fs.stat(p, function(err, stat) {
        if (err) {
            return cb(err);
        }
        if (stat.isDirectory()) {
            if ((!cli.dirpattern || cli.dirpattern.test(p)) && (!cli.excludepattern || !cli.excludepattern.test(p))) {
                return readDirectory(p, cb);
            }
        } else if (cli.filepattern.test(p)) {
            queue.push(p);
        }
        cb();
    });
}

function readDirectory (directoryPath, cb) {
    fs.readdir(directoryPath, function(err, files) {
        if (err) {
            return cb(err);
        }
        files = files.filter(function (p) {
            return path.basename(p).charAt(0) !== '.' || cli.allfiles;
        }).map(function (p) {
            return path.resolve(directoryPath, p);
        });
        if (!files.length) {
            return cb();
        }
        async.each(files, processPath, cb);
    });
}

function readFile (filePath, cb) {
    fs.readFile(filePath, 'utf8', function (err, source) {
        if (err) {
            cli.error('readFile', err);
            return cb();
        }

        scheduleSourceFile(filePath, source);
        cb();
    });
}

function scheduleSourceFile (filePath, source) {
    if (beginsWithShebang(source)) {
        source = commentFirstLine(source);
    }

    setSource(filePath, source);
}

function beginsWithShebang (source) {
    return source[0] === '#' && source[1] === '!';
}

function commentFirstLine (source) {
    return '//' + source;
}

function setSource (modulePath, source) {
    var type = getType(modulePath);
    state.sources[type].push({
        path: modulePath,
        code: source
    });
}

function getType(modulePath) {
    return path.extname(modulePath).replace('.', '');
}

function getReports (cb) {
    var result, failingModules;

    function checkFailures () {
        failingModules = getFailingModules(result.reports);
        if (failingModules.length > 0) {
            cli.fail('Warning: Complexity threshold breached!\nFailing modules:\n' + failingModules.join('\n'));
        } else if (config.isProjectComplexityThresholdSet(cli) && isProjectTooComplex(result)) {
            cli.fail('Warning: Project complexity threshold breached!');
        }

        cb();
    }

    try {
        result = escomplex.analyse(state.sources.js, options);

        if (!cli.silent) {
            writeReports(result, checkFailures);
        } else {
            checkFailures();
        }
    } catch (err) {
        cli.error('getReports', err);
        cb();
    }
}

function writeReports (result, cb) {
    var formatted = formatter.format(result);

    if (check.function(cli.write)) {
        cli.write(formatted, cb);
    } else if (check.nonEmptyString(cli.output)) {
        fs.writeFile(cli.output, formatted, 'utf8', function (err) {
            if (err) {
                cli.error('writeReport', err);
            }
            cb();
        });
    } else {
        cb();
    }
}

function getFailingModules (reports) {
    return reports.reduce(function (failingModules, report) {
        if (
            (config.isModuleComplexityThresholdSet(cli) && isModuleTooComplex(report)) ||
            (config.isFunctionComplexityThresholdSet(cli) && isFunctionTooComplex(report))
        ) {
            return failingModules.concat(report.path);
        }

        return failingModules;
    }, []);
}


function isThresholdBreached (threshold, metric, inverse) {
    if (!inverse) {
        return check.number(threshold) && metric > threshold;
    }

    return check.number(threshold) && metric < threshold;
}

function isFunctionTooComplex (report) {
    var i;

    for (i = 0; i < report.functions.length; i += 1) {
        if (isThresholdBreached(cli.maxcyc, report.functions[i].cyclomatic)) {
            return true;
        }

        if (isThresholdBreached(cli.maxcycden, report.functions[i].cyclomaticDensity)) {
            return true;
        }

        if (isThresholdBreached(cli.maxhd, report.functions[i].halstead.difficulty)) {
            return true;
        }

        if (isThresholdBreached(cli.maxhv, report.functions[i].halstead.volume)) {
            return true;
        }

        if (isThresholdBreached(cli.maxhe, report.functions[i].halstead.effort)) {
            return true;
        }
    }

    return false;
}

function isModuleTooComplex (report) {
    if (isThresholdBreached(cli.minmi, report.maintainability, true)) {
        return true;
    }
}

function isProjectTooComplex (result) {
    if (isThresholdBreached(cli.maxfod, result.firstOrderDensity)) {
        return true;
    }

    if (isThresholdBreached(cli.maxcost, result.changeCost)) {
        return true;
    }

    if (isThresholdBreached(cli.maxsize, result.coreSize)) {
        return true;
    }

    return false;
}

module.exports = {
    initialize: initialize,
    processStream: processStream,
    processFiles: processFiles,
    processPaths: processPaths
};
