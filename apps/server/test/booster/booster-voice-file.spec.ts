import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOSTER_VOICE_LIMITS } from '@app/contracts';
import { validateBoosterVoiceFile } from '../../src/modules/booster/application/booster-voice-file';

test('语音上传同时校验 MIME 与文件头并规范化扩展名', () => {
  const wav = Buffer.alloc(12);
  wav.write('RIFF', 0, 'ascii');
  wav.write('WAVE', 8, 'ascii');

  const validated = validateBoosterVoiceFile({
    buffer: wav,
    originalName: '伪装文件.html',
    mimeType: 'audio/x-wav',
    size: wav.length,
  });

  assert.equal(validated.originalName, 'booster-voice.wav');
  assert.equal(validated.mimeType, 'audio/wav');
});

test('语音上传拒绝 MIME 与内容不匹配、未知格式和超过 5 MB', () => {
  const id3 = Buffer.from('ID3voice', 'ascii');
  assert.throws(
    () =>
      validateBoosterVoiceFile({
        buffer: id3,
        originalName: 'voice.wav',
        mimeType: 'audio/wav',
        size: id3.length,
      }),
    /类型与内容不匹配/,
  );
  assert.throws(
    () =>
      validateBoosterVoiceFile({
        buffer: Buffer.from('not-audio'),
        originalName: 'voice.mp3',
        mimeType: 'audio/mpeg',
        size: 9,
      }),
    /类型与内容不匹配/,
  );
  assert.throws(
    () =>
      validateBoosterVoiceFile({
        buffer: id3,
        originalName: 'voice.mp3',
        mimeType: 'audio/mpeg',
        size: BOOSTER_VOICE_LIMITS.maxSizeBytes + 1,
      }),
    /不能超过 5 MB/,
  );
});
