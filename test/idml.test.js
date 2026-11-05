import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIdmlFiles, layoutFor, xmlText, IDML_MIMETYPE } from '../src/idml.js';

const inputs = {
    pageWidth: 210, pageHeight: 297, leftMargin: 20, rightMargin: 20, topMargin: 25, bottomMargin: 30,
    typeSize: 12, leading: 14, fontFamily: 'Georgia', numCols: 3, gutterWidth: 4.233,
    hyphenation: true, justifyText: true,
};
const spec = { inputs, text: 'First & <second>.\nThird paragraph.', paraSpacePt: 14, facing: false };

/** Minimal well-formedness check: balanced tags, one root, quoted attributes. */
function wellFormed(xml) {
    const body = xml.replace(/<\?[\s\S]*?\?>/g, '');
    const stack = [];
    const re = /<(\/?)([A-Za-z_:][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>/g;
    let last = 0;
    let m;
    let roots = 0;
    while ((m = re.exec(body))) {
        const between = body.slice(last, m.index);
        assert.ok(!/<|>/.test(between.replace(/&gt;/g, '')) || between.trim() === '', 'stray angle bracket: ' + between.slice(0, 40));
        last = re.lastIndex;
        if (m[1]) {
            assert.equal(stack.pop(), m[2], 'mismatched close ' + m[2]);
        } else if (!m[4]) {
            if (stack.length === 0) roots++;
            stack.push(m[2]);
        } else if (stack.length === 0) roots++;
    }
    assert.equal(stack.length, 0, 'unclosed tags');
    assert.equal(roots, 1, 'one root element');
}

test('package starts with mimetype and every file is well-formed XML', () => {
    const files = buildIdmlFiles(spec);
    assert.deepEqual(files[0], ['mimetype', IDML_MIMETYPE]);
    for (const [path, content] of files.slice(1)) wellFormed(content), path;
});

test('designmap points at files that exist and ids are unique', () => {
    const files = new Map(buildIdmlFiles(spec));
    const map = files.get('designmap.xml');
    for (const m of map.matchAll(/src="([^"]+)"/g)) assert.ok(files.has(m[1]), m[1]);
    const ids = [];
    for (const [path, c] of files) {
        if (path === 'mimetype' || path.startsWith('META-INF')) continue;
        for (const m of c.matchAll(/ Self="([^"]+)"/g)) ids.push(m[1]);
    }
    assert.equal(new Set(ids).size, ids.length, 'duplicate Self ids');
});

test('frames are linked in order and point at the story and style that exist', () => {
    const files = new Map(buildIdmlFiles(spec));
    const spread = files.get('Spreads/Spread_u200.xml');
    const frames = [...spread.matchAll(/<TextFrame Self="(\w+)" ParentStory="(\w+)" PreviousTextFrame="(\w+)" NextTextFrame="(\w+)"/g)];
    assert.equal(frames.length, 1);
    const three = { ...spec, inputs: { ...inputs, columnSpanStart: 1, columnSpanEnd: 1, textColumns: [1] } };
    const sp3 = new Map(buildIdmlFiles(three)).get('Spreads/Spread_u200.xml');
    const f3 = [...sp3.matchAll(/<TextFrame Self="(\w+)" ParentStory="(\w+)" PreviousTextFrame="(\w+)" NextTextFrame="(\w+)"/g)];
    assert.equal(f3.length, 3);
    assert.equal(f3[0][3], 'n');
    assert.equal(f3[0][4], f3[1][1]);
    assert.equal(f3[2][3], f3[1][1]);
    assert.equal(f3[2][4], 'n');
    assert.ok(files.has('Stories/Story_' + frames[0][2] + '.xml'));
    assert.ok(files.get('Resources/Styles.xml').includes('Self="ParagraphStyle/Body"'));
});

test('text is escaped and split into paragraphs', () => {
    const story = new Map(buildIdmlFiles(spec)).get('Stories/Story_u1000.xml');
    assert.ok(story.includes('First &amp; &lt;second&gt;.'));
    assert.equal((story.match(/<Br\/>/g) || []).length, 1);
    assert.equal(xmlText('a\u0001b'), 'ab');
});

test('page, margins and columns come out in points', () => {
    const lay = layoutFor(inputs, false);
    assert.ok(Math.abs(lay.W - 595.2756) < 0.01);
    assert.ok(Math.abs(lay.pages[0].left - 56.6929) < 0.01);
    const sum = lay.pages[0].colWidth * 3 + lay.gutter * 2;
    assert.ok(Math.abs(sum - lay.pages[0].textWidth) < 0.001);
    const prefs = new Map(buildIdmlFiles(spec)).get('Resources/Preferences.xml');
    assert.ok(prefs.includes('FacingPages="false"'));
    assert.ok(prefs.includes('BaselineDivision="14"'));
});

test('facing pages make a two-page spread starting on a left page', () => {
    const facing = { ...spec, facing: true, inputs: { ...inputs, innerMarginLeft: 15, innerMarginRight: 15, outerMarginLeft: 25, outerMarginRight: 25 } };
    const files = new Map(buildIdmlFiles(facing));
    assert.ok(files.get('designmap.xml').includes('PageNumberStart="2"'));
    assert.equal((files.get('Spreads/Spread_u200.xml').match(/<Page /g) || []).length, 2);
    assert.ok(files.get('Resources/Preferences.xml').includes('FacingPages="true"'));
    const lay = layoutFor(facing.inputs, true);
    assert.ok(lay.pages[0].x < 0 && lay.pages[1].x === 0);
});
