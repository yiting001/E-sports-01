import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeSystemMessageText } from '../../src/modules/im/application/system-message.service';

test('动态系统文案按纯文本编码，不允许昵称注入 HTML 或外链资源', () => {
  assert.equal(
    escapeSystemMessageText(`星河<img src="https://attacker.invalid/pixel"> & 'quoted'`),
    '星河&lt;img src=&quot;https://attacker.invalid/pixel&quot;&gt; &amp; &#39;quoted&#39;',
  );
});
