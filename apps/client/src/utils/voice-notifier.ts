import { NOTIFY_VOICE_MIN_INTERVAL_MS } from '@app/contracts';

export interface VoiceNotifier {
  /** 播报一段文案；同一 key 在最小间隔内重复触发会被合并跳过 */
  speak(key: string, text: string): void;
}

/**
 * 浏览器语音播报器（Web Speech API）。
 * 单一职责：把通知文案朗读出来，并按 key 做最小间隔节流，
 * 不感知业务事件来源；浏览器不支持或被系统策略拦截时静默降级。
 */
export function createVoiceNotifier(
  speechWindow: Pick<Window, 'speechSynthesis'> | undefined = typeof window !== 'undefined'
    ? window
    : undefined,
  now: () => number = () => Date.now(),
): VoiceNotifier {
  const lastSpokenAt = new Map<string, number>();

  function speak(key: string, text: string): void {
    const synthesis = speechWindow?.speechSynthesis;
    if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      return;
    }
    const last = lastSpokenAt.get(key);
    const current = now();
    if (last !== undefined && current - last < NOTIFY_VOICE_MIN_INTERVAL_MS) {
      return;
    }
    lastSpokenAt.set(key, current);
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      synthesis.speak(utterance);
    } catch {
      // 浏览器自动播放策略或语音引擎不可用时静默跳过，不影响页面
    }
  }

  return { speak };
}

/** 全站共享的播报器单例（App 装配时使用） */
export const voiceNotifier = createVoiceNotifier();
