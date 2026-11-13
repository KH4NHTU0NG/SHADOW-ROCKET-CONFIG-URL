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

function testBuildTranslationQuery() {
    assert.strictEqual(buildTranslationQuery(null), '');
    assert.strictEqual(buildTranslationQuery([]), '');
    const query = buildTranslationQuery([
        { words: '' },
        { words: '\u266a' },
        { words: 'First line' },
        { words: 'Chorus' },
        { words: 'Chorus' },
        { words: 'Last line' }
    ]);
    assert.strictEqual(query, 'First line\nChorus\nLast line');
}

function testApplyTranslations() {
    const resp = {
        lyrics: {
            language: 'ja',
            lines: [
                { words: 'Line 1' },
                { words: 'Line 2' },
                { words: '\u266a' }
            ],
            alternatives: [
                { language: 'ja-Latn', lines: ['Romaji 1', 'Romaji 2', ''] },
                { language: 'z1', lines: ['Stale 1', 'Stale 2', ''] }
            ]
        }
    };

    applyTranslations(resp, [
        { src: 'Line 1', dst: 'Dong 1' },
        { src: 'Line 2', dst: 'Dong 2' }
    ], 'z1', true);

    assert.strictEqual(resp.lyrics.alternatives.length, 2);
    assert.strictEqual(resp.lyrics.alternatives[0].language, 'z1');
    assert.deepStrictEqual(resp.lyrics.alternatives[0].lines, ['Dong 1', 'Dong 2', '\u266a']);
    assert.strictEqual(resp.lyrics.alternatives[1].language, 'ja-Latn');

    // Graceful handling when trans_result is malformed or not an array
    applyTranslations(resp, null, 'z1', false);
    assert.strictEqual(resp.lyrics.alternatives.length, 1);
    assert.deepStrictEqual(resp.lyrics.alternatives[0].lines, ['Line 1', 'Line 2', '\u266a']);
}

async function main() {
    await runTest('parseArgument preserves secrets with = and blocks prototype pollution', testParseArgument);
    await runTest('buildTranslationQuery filters placeholders and deduplicates lines', testBuildTranslationQuery);
    await runTest('applyTranslations maps lines 1:1 and preserves non-target tracks', testApplyTranslations);
    console.log('PASSED TESTS:', passed);
}

main().catch(function (err) {
    console.error(err);
    process.exit(1);
});
