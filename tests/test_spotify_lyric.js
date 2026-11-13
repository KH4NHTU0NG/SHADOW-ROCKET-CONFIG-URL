'use strict';

const assert = require('assert');
const {
    DEFAULT_OPTIONS,
    parseArgument,
    buildTranslationQuery,
    applyTranslations,
    runLyricTranslation,
    ColorLyricsResponse,
    md5Hex
} = require('../app2smile-spotify-lyric/spotify-lyric.clean.js');

let passed = 0;

function runTest(name, fn) {
    return Promise.resolve()
        .then(fn)
        .then(function () {
            passed++;
            console.log('PASS:', name);
        });
}

function testParseArgument() {
    // Handles '=' and '+' inside Base64-like Baidu securityKey without truncation
    const parsed = parseArgument('appid=20260101&securityKey=secret==key+with=eq&to=vie', DEFAULT_OPTIONS);
    assert.strictEqual(parsed.invalidPairs, 0);
    assert.strictEqual(parsed.options.appid, '20260101');
    assert.strictEqual(parsed.options.securityKey, 'secret==key+with=eq');
    assert.strictEqual(parsed.options.to, 'vie');

    // Blocks prototype pollution & arbitrary disallowed keys
    const polluted = parseArgument('__proto__=evil&constructor=bad&unknown=ignored&appid=ok', DEFAULT_OPTIONS);
    assert.strictEqual(({}).evil, undefined);
    assert.strictEqual(polluted.options.unknown, undefined);
    assert.strictEqual(polluted.options.appid, 'ok');

    // Tracks invalid segments & handles malformed percent encoding gracefully
    const malformed = parseArgument('missingEquals&=nokey&securityKey=abc%ZZ', DEFAULT_OPTIONS);
    assert.strictEqual(malformed.invalidPairs, 2);
    assert.strictEqual(malformed.options.securityKey, 'abc%ZZ');
}

async function main() {
    await runTest('parseArgument preserves secrets with = and blocks prototype pollution', testParseArgument);
    console.log('PASSED TESTS:', passed);
}

main().catch(function (err) {
    console.error(err);
    process.exit(1);
});
