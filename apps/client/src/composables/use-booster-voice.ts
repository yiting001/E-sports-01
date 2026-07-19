import { ref } from 'vue';
import { resolveMediaUrl } from '@/utils/media-url';

const activeUrl = ref('');
const playing = ref(false);
const loading = ref(false);
const failedUrl = ref('');
let audio: HTMLAudioElement | null = null;
let visibilityBound = false;

function pause(): void {
  audio?.pause();
  playing.value = false;
  loading.value = false;
}

function stop(): void {
  pause();
  if (audio) {
    audio.currentTime = 0;
  }
  activeUrl.value = '';
}

function createAudio(url: string): HTMLAudioElement {
  const element = new Audio(url);
  element.preload = 'metadata';
  element.addEventListener('loadstart', () => {
    if (activeUrl.value === url) {
      loading.value = true;
    }
  });
  element.addEventListener('playing', () => {
    if (activeUrl.value === url) {
      loading.value = false;
      playing.value = true;
    }
  });
  element.addEventListener('pause', () => {
    if (activeUrl.value === url) {
      playing.value = false;
    }
  });
  element.addEventListener('ended', () => {
    if (activeUrl.value === url) {
      playing.value = false;
    }
  });
  element.addEventListener('error', () => {
    if (activeUrl.value === url) {
      loading.value = false;
      playing.value = false;
      failedUrl.value = url;
    }
  });
  return element;
}

async function toggle(rawUrl: string): Promise<void> {
  const url = resolveMediaUrl(rawUrl);
  if (!url) {
    return;
  }
  failedUrl.value = '';
  if (activeUrl.value === url && audio) {
    if (playing.value) {
      pause();
      return;
    }
  } else {
    stop();
    activeUrl.value = url;
    audio = createAudio(url);
  }
  try {
    await audio?.play();
  } catch {
    loading.value = false;
    playing.value = false;
    failedUrl.value = url;
  }
}

export function useBoosterVoice() {
  if (!visibilityBound) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pause();
      }
    });
    visibilityBound = true;
  }

  return {
    activeUrl,
    failedUrl,
    loading,
    playing,
    toggle,
    stop,
  };
}
