import { BOOSTER_VOICE_LIMITS } from '@app/contracts';
import {
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { UploadFileInput } from '../../upload/application/use-cases/upload-file.usecase';

interface DetectedVoiceFormat {
  mimeType: string;
  extension: string;
  declaredMimeTypes: readonly string[];
}

const VOICE_FORMATS = {
  mpeg: {
    mimeType: 'audio/mpeg',
    extension: '.mp3',
    declaredMimeTypes: ['audio/mpeg'],
  },
  mp4: {
    mimeType: 'audio/mp4',
    extension: '.m4a',
    declaredMimeTypes: ['audio/mp4', 'audio/x-m4a', 'audio/m4a'],
  },
  wav: {
    mimeType: 'audio/wav',
    extension: '.wav',
    declaredMimeTypes: ['audio/wav', 'audio/x-wav'],
  },
  webm: {
    mimeType: 'audio/webm',
    extension: '.webm',
    declaredMimeTypes: ['audio/webm'],
  },
} as const satisfies Record<string, DetectedVoiceFormat>;

/** 校验并规范化语音文件，避免把可执行扩展名原样交给静态文件服务。 */
export function validateBoosterVoiceFile(input: UploadFileInput): UploadFileInput {
  if (!input.buffer.length || input.size <= 0) {
    throw new BadRequestException('未接收到有效语音文件');
  }
  if (input.size > BOOSTER_VOICE_LIMITS.maxSizeBytes) {
    throw new PayloadTooLargeException('语音文件不能超过 5 MB');
  }
  const declaredMime = input.mimeType.toLowerCase().split(';', 1)[0]?.trim() ?? '';
  if (!BOOSTER_VOICE_LIMITS.mimeTypes.some((mime) => mime === declaredMime)) {
    throw new BadRequestException('仅支持 MP3、M4A、WAV 或 WebM 语音');
  }
  const detected = detectVoiceFormat(input.buffer);
  if (!detected || !detected.declaredMimeTypes.includes(declaredMime)) {
    throw new BadRequestException('语音文件类型与内容不匹配');
  }
  return {
    buffer: input.buffer,
    originalName: `booster-voice${detected.extension}`,
    mimeType: detected.mimeType,
    size: input.size,
  };
}

function detectVoiceFormat(buffer: Buffer): DetectedVoiceFormat | null {
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return VOICE_FORMATS.wav;
  }
  if (buffer.length >= 8 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    return VOICE_FORMATS.mp4;
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return VOICE_FORMATS.webm;
  }
  const hasId3 = buffer.length >= 3 && buffer.toString('ascii', 0, 3) === 'ID3';
  const hasMpegFrame =
    buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
  return hasId3 || hasMpegFrame ? VOICE_FORMATS.mpeg : null;
}
