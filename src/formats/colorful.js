'use strict';

require('colors');

exports.format = format;

function format (result) {
    var reports = result.reports,
        newmi = result.newmi,
        longestModulePath;
    makeRelativePaths(reports);
    longestModulePath = getLongestProperty(reports, 'path');
    return reports.reduce(function (formatted, report) {
        return formatted + formatModule(report, longestModulePath, newmi) + '\n\n';
    }, formatProject(result, newmi));
}

function formatProject (result, newmi) {
    var mark = result.failing ? '\u2717'.red : '\u2713'.green,
        bar = generateBar(result.maintainability, newmi);
    return [
        mark + ' ' , result.reports.length, ' modules ' + bar, '\n\n',
        '  Mean per-function logical LOC: ', result.loc, '\n',
        '  Mean per-function parameter count: ', result.params, '\n',
        '  Mean per-function cyclomatic complexity: ', result.cyclomatic, '\n',
        '  Mean per-function Halstead effort: ', result.effort, '\n',
        '  Mean per-module maintainability index: ', result.maintainability, '\n',
        '  First-order density: ', result.firstOrderDensity, '%\n',
        '  Change cost: ', result.changeCost, '%\n',
        '  Core size: ', result.coreSize, '%\n\n'
    ].join('');
}

function formatModule (report, longestModulePath, newmi) {
    var mark = report.failing ? '\u2717'.red : '\u2713'.green,
        module = padRight(report.path, longestModulePath),
        bar = generateBar(report.maintainability, newmi);
    return [
        mark + ' ' + module + ' ', bar, '\n\n',
        '  Physical LOC: ', report.aggregate.sloc.physical, '\n',
        '  Logical LOC: ', report.aggregate.sloc.logical, '\n',
        '  Mean parameter count: ', report.params, '\n',
        '  Cyclomatic complexity: ', report.aggregate.cyclomatic, '\n',
        '  Cyclomatic complexity density: ', report.aggregate.cyclomaticDensity, '%\n',
        '  Maintainability index: ', report.maintainability, '\n',
        '  Dependency count: ', report.dependencies.length,
        formatFunctions(report.functions)
    ].join('');
}

function formatFunctions (report) {
    return report.reduce(function (formatted, r) {
        return formatted + '\n\n' + formatFunction(r);
    }, '');
}

function formatFunction (report) {
    var mark = report.failing ? '\u2717'.red : '\u2713'.green;
    return [
        '  ' + mark + ' function ' + report.name, '\n',
        '    Line No.: ', report.line, '\n',
        '    Physical LOC: ', report.sloc.physical, '\n',
        '    Logical LOC: ', report.sloc.logical, '\n',
        '    Parameter count: ', report.params, '\n',
        '    Cyclomatic complexity: ', report.cyclomatic, '\n',
        '    Cyclomatic complexity density: ', report.cyclomaticDensity, '%\n',
        '    Halstead difficulty: ', report.halstead.difficulty, '\n',
        '    Halstead volume: ', report.halstead.volume, '\n',
        '    Halstead effort: ', report.halstead.effort
    ].join('');
}

function makeRelativePaths (reports) {
    var currentDirectory = process.cwd(),
        currentDirectoryLength = currentDirectory.length + 1;
    reports.forEach(function (report) {
        var module = report.path;
        if (module.startsWith(currentDirectory)) {
          report.path = module.substr(currentDirectoryLength);
        }
    });
}

function getLongestProperty (items, property) {
    return items.reduce(function (maxLength, item) {
        var thisLength = item[property].length;
        return thisLength > maxLength ? thisLength : maxLength;
    }, 0);
}

function generateBar (maintainability, newmi) {
    var score = newmi ? maintainability : maintainability * 100 / 171,
        blocks = Math.floor(score / 17.1),
        bar = Array(blocks).join('\u2588') + ' ' + maintainability.toFixed(1);
    return score < 10 ? bar.red : score < 20 ? bar.yellow : bar.green;
}

function padRight (string, maxLength) {
    var remaining = maxLength - string.length;
   return remaining > 0 ? string + Array(remaining).join(' ') : string;
}