import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const html = renderToStaticMarkup(React.createElement(ReactMarkdown, {
  remarkPlugins: [remarkMath],
  rehypePlugins: [[rehypeKatex, { trust: false, strict: 'error' }]],
  children: 'Soal: $x^2 + \\frac{1}{2}$\n\n$$\n\\sqrt{16}=4\n$$',
}));
assert.match(html, /class="katex"/);
assert.match(html, /class="katex-display"/);
assert.match(html, /<mfrac>/);
assert.match(html, /<msqrt>/);
const restricted = renderToStaticMarkup(React.createElement(ReactMarkdown, {
  remarkPlugins: [remarkMath],
  rehypePlugins: [[rehypeKatex, { trust: false }]],
  children: '$\\href{javascript:alert(1)}{click}$',
}));
assert.doesNotMatch(restricted, /href="javascript:/);
console.log('PASS: inline/block math, fractions, square roots, and untrusted links');
