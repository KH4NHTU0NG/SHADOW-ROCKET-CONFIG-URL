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

function makeSampleLyricsBinary(lang, linesWords) {
    const msg = ColorLyricsResponse.create({
        lyrics: {
            language: lang,
            lines: linesWords.map(function (w) { return { words: w }; }),
            alternatives: [
                { language: 'ja-Latn', lines: linesWords.map(function (w) { return 'alt:' + w; }) }
            ]
        }
    });
    return ColorLyricsResponse.toBinary(msg);
}

function parseFormBody(bodyStr) {
    const out = {};
    bodyStr.split('&').forEach(function (pair) {
        const idx = pair.indexOf('=');
        if (idx > 0) {
            out[pair.slice(0, idx)] = decodeURIComponent(pair.slice(idx + 1));
        }
    });
    return out;
}

function testSurgeShadowrocketRoundTrip() {
    return new Promise(function (resolve, reject) {
        const rawBytes = makeSampleLyricsBinary('en', ['Hello', 'World', 'Hello']);
        let httpCalls = 0;

        runLyricTranslation({
            $response: { status: 200, body: rawBytes },
            $argument: 'appid=testApp&securityKey=key==123&to=vie',
            $notification: { post: function () {} },
            $httpClient: {
                post: function (req, cb) {
                    httpCalls++;
                    try {
                        assert.strictEqual(req.headers['Content-Type'], 'application/x-www-form-urlencoded; charset=UTF-8');
                        const form = parseFormBody(req.body);
                        assert.strictEqual(form.to, 'vie');
                        assert.strictEqual(form.appid, 'testApp');
                        assert.strictEqual(form.q, 'Hello\nWorld');
                        assert.strictEqual(form.sign, md5Hex('testApp' + form.q + form.salt + 'key==123'));
                    } catch (e) {
                        reject(e);
                        return;
                    }
                    cb(null, { status: 200, headers: {} }, JSON.stringify({
                        trans_result: [
                            { src: 'Hello', dst: 'Xin chao' },
                            { src: 'World', dst: 'The gioi' }
                        ]
                    }));
                }
            },
            $done: function (out) {
                try {
                    assert.strictEqual(httpCalls, 1);
                    assert.ok(out && out.body instanceof Uint8Array);
                    const decoded = ColorLyricsResponse.fromBinary(out.body);
                    assert.strictEqual(decoded.lyrics.alternatives.length, 2);
                    assert.deepStrictEqual(decoded.lyrics.alternatives[0].lines, ['Xin chao', 'The gioi', 'Xin chao']);
                    assert.strictEqual(decoded.lyrics.alternatives[1].language, 'ja-Latn');
                    resolve();
                } catch (e) {
                    reject(e);
                }
            }
        });
    });
}

function testQuanXRoundTrip() {
    return new Promise(function (resolve, reject) {
        const rawBytes = makeSampleLyricsBinary('en', ['Song']);
        const padded = new Uint8Array(rawBytes.length + 4);
        padded.set(rawBytes, 2);
        const slicedInput = padded.buffer.slice(2, 2 + rawBytes.length);

        runLyricTranslation({
            $response: { statusCode: 200, bodyBytes: slicedInput },
            $argument: 'appid=qxApp&securityKey=qxSecret',
            $notify: function () {},
            $task: {
                fetch: function () {
                    return Promise.resolve({
                        statusCode: 200,
                        headers: {},
                        body: JSON.stringify({
                            trans_result: [{ src: 'Song', dst: 'Bai hat' }]
                        })
                    });
                }
            },
            $done: function (out) {
                try {
                    assert.ok(out && out.bodyBytes instanceof ArrayBuffer);
                    const decoded = ColorLyricsResponse.fromBinary(new Uint8Array(out.bodyBytes));
                    assert.deepStrictEqual(decoded.lyrics.alternatives[0].lines, ['Bai hat']);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            }
        });
    });
}

function testSecurityAndErrorPaths() {
    const logs = [];
    const mockNotify = function (title, sub, msg) {
        logs.push(String(title) + '|' + String(sub) + '|' + String(msg));
    };

    // 1. Malformed arg alongside secrets: secrets must NEVER be logged
    let httpCalled = false;
    let doneResult = null;
    runLyricTranslation({
        $response: { status: 200, body: makeSampleLyricsBinary('en', ['Test']) },
        $argument: 'badSegment&appid=SECRET_APP&securityKey=SECRET_KEY==',
        $notification: { post: mockNotify },
        $httpClient: {
            post: function (_, cb) {
                httpCalled = true;
                cb(null, { status: 200, headers: {} }, '{not-valid-json');
            }
        },
        $done: function (res) { doneResult = res; }
    });
    assert.strictEqual(httpCalled, true);
    assert.deepStrictEqual(doneResult, {});
    assert.strictEqual(logs.some(function (l) {
        return l.indexOf('SECRET_APP') !== -1 || l.indexOf('SECRET_KEY') !== -1;
    }), false);

    // 2. Missing credentials must abort before any HTTP call
    let outboundOnMissingCreds = false;
    runLyricTranslation({
        $response: { status: 200, body: makeSampleLyricsBinary('en', ['Test']) },
        $argument: 'to=vie',
        $notification: { post: mockNotify },
        $httpClient: { post: function () { outboundOnMissingCreds = true; } },
        $done: function (res) { doneResult = res; }
    });
    assert.strictEqual(outboundOnMissingCreds, false);
    assert.deepStrictEqual(doneResult, {});

    // 3. Corrupted Protobuf payload returns $done({}) without crashing
    runLyricTranslation({
        $response: { status: 200, body: new Uint8Array([0xff, 0xff, 0x00, 0x99]) },
        $argument: 'appid=a&securityKey=b',
        $notification: { post: mockNotify },
        $httpClient: { post: function () {} },
        $done: function (res) { doneResult = res; }
    });
    assert.deepStrictEqual(doneResult, {});

    // 4. Non-200 status and skipLanguage ('z1') short-circuit cleanly
    runLyricTranslation({
        $response: { status: 304, body: makeSampleLyricsBinary('en', ['Test']) },
        $done: function (res) { doneResult = res; }
    });
    assert.deepStrictEqual(doneResult, {});

    runLyricTranslation({
        $response: { status: 200, body: makeSampleLyricsBinary('z1', ['Test']) },
        $argument: 'appid=a&securityKey=b',
        $httpClient: { post: function () { throw new Error('Should not invoke API'); } },
        $done: function (res) { doneResult = res; }
    });
    assert.deepStrictEqual(doneResult, {});
}

async function main() {
    await runTest('parseArgument preserves secrets with = and blocks prototype pollution', testParseArgument);
    await runTest('buildTranslationQuery filters placeholders and deduplicates lines', testBuildTranslationQuery);
    await runTest('applyTranslations maps lines 1:1 and preserves non-target tracks', testApplyTranslations);
    await runTest('runLyricTranslation round-trips binary Protobuf under Surge/Shadowrocket', testSurgeShadowrocketRoundTrip);
    await runTest('runLyricTranslation round-trips ArrayBuffer under Quantumult X', testQuanXRoundTrip);
    await runTest('runLyricTranslation redacts secrets and handles malformed inputs safely', testSecurityAndErrorPaths);
    console.log('PASSED TESTS:', passed);
}

main().catch(function (err) {
    console.error(err);
    process.exit(1);
});
