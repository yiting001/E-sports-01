import { NOTIFY_VOICE_MIN_INTERVAL_MS } from '@app/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVoiceNotifier } from './voice-notifier';

class FakeUtterance {
  lang = '';

  constructor(public text: string) {}
}

describe('语音播报器', () => {
  let spoken: FakeUtterance[];
  let speechWindow: Pick<Window, 'speechSynthesis'>;

  beforeEach(() => {
    spoken = [];
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    speechWindow = {
      speechSynthesis: {
        speak: (utterance: unknown) => {
          spoken.push(utterance as FakeUtterance);
        },
      } as unknown as SpeechSynthesis,
    };
  });

  it('播报文案并设置中文语言', () => {
    const notifier = createVoiceNotifier(speechWindow, () => 0);
    notifier.speak('order', '您有新的订单');
    expect(spoken).toHaveLength(1);
    expect(spoken[0].text).toBe('您有新的订单');
    expect(spoken[0].lang).toBe('zh-CN');
  });

  it('同一 key 在最小间隔内合并跳过，超过间隔恢复播报', () => {
    let now = 0;
    const notifier = createVoiceNotifier(speechWindow, () => now);
    notifier.speak('order', '第一次');
    now += NOTIFY_VOICE_MIN_INTERVAL_MS - 1;
    notifier.speak('order', '被节流');
    now += 1;
    notifier.speak('order', '第二次');
    expect(spoken.map((item) => item.text)).toEqual(['第一次', '第二次']);
  });

  it('不同 key 互不节流', () => {
    const notifier = createVoiceNotifier(speechWindow, () => 0);
    notifier.speak('order', '订单');
    notifier.speak('message', '消息');
    expect(spoken).toHaveLength(2);
  });

  it('浏览器不支持语音时静默跳过', () => {
    const notifier = createVoiceNotifier(undefined, () => 0);
    expect(() => notifier.speak('order', '不会抛错')).not.toThrow();
  });
});
