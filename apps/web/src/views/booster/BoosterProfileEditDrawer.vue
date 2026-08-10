<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import {
  BOOSTER_LIMITS,
  BOOSTER_SERVICE_REGIONS,
  BOOSTER_VOICE_LIMITS,
  BoosterContactType,
  BoosterGender,
  type BoosterServiceRegion,
  type BoosterServiceRegionOption,
  type BoosterView,
  type UpdateBoosterPayload,
} from "@app/contracts";
import { Delete, UploadFilled } from "@element-plus/icons-vue";
import { ElMessage, type UploadFile } from "element-plus";
import ImageUploader from "@/components/common/ImageUploader.vue";
import { boosterApi } from "@/api/booster.api";
import {
  BOOSTER_CONTACT_OPTIONS,
  BOOSTER_GENDER_OPTIONS,
} from "./booster-profile";

const VOICE_MAX_SIZE_MB = BOOSTER_VOICE_LIMITS.maxSizeBytes / (1024 * 1024);
const VOICE_ACCEPT = BOOSTER_VOICE_LIMITS.mimeTypes.join(",");

interface EditForm {
  applicantName: string;
  gender: BoosterGender | "";
  serviceRegions: BoosterServiceRegion[];
  intro: string;
  contactType: BoosterContactType | "";
  contactValue: string;
  materialImage: string;
  voiceUrl: string;
  invitationCode: string;
}

const props = defineProps<{
  modelValue: boolean;
  booster: BoosterView | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [];
}>();

const saving = ref(false);
const voiceUploading = ref(false);
const form = reactive<EditForm>(emptyForm());
const regionOptions = ref<BoosterServiceRegionOption[]>([
  ...BOOSTER_SERVICE_REGIONS,
]);

async function loadRegionOptions(): Promise<void> {
  try {
    regionOptions.value = await boosterApi.getRegions();
  } catch {
    regionOptions.value = [...BOOSTER_SERVICE_REGIONS];
  }
}

watch(
  [() => props.modelValue, () => props.booster],
  ([visible, booster]) => {
    if (!visible || !booster) {
      return;
    }
    void loadRegionOptions();
    Object.assign(form, {
      applicantName: booster.applicantName,
      gender: booster.gender,
      serviceRegions: [...booster.serviceRegions],
      intro: booster.intro,
      contactType: booster.contactType,
      contactValue: booster.contactValue,
      materialImage: booster.materialImage,
      voiceUrl: booster.voiceUrl,
      invitationCode: booster.invitationCode,
    });
  },
  { immediate: true }
);

function emptyForm(): EditForm {
  return {
    applicantName: "",
    gender: "",
    serviceRegions: [],
    intro: "",
    contactType: "",
    contactValue: "",
    materialImage: "",
    voiceUrl: "",
    invitationCode: "",
  };
}

function validateVoice(file: File): boolean {
  if (
    !BOOSTER_VOICE_LIMITS.mimeTypes.some((mimeType) => mimeType === file.type)
  ) {
    ElMessage.warning("仅支持 MP3、M4A、WAV 或 WebM 音频");
    return false;
  }
  if (file.size > BOOSTER_VOICE_LIMITS.maxSizeBytes) {
    ElMessage.warning(`语音文件不能超过 ${VOICE_MAX_SIZE_MB}MB`);
    return false;
  }
  return true;
}

async function uploadVoice(uploadFile: UploadFile): Promise<void> {
  const file = uploadFile.raw;
  if (!props.booster || !file || !validateVoice(file)) {
    return;
  }
  voiceUploading.value = true;
  try {
    const result = await boosterApi.uploadVoice(props.booster.id, file);
    form.voiceUrl = result.voiceUrl;
    ElMessage.success("语音已上传并保存");
    emit("saved");
  } finally {
    voiceUploading.value = false;
  }
}

async function clearVoice(): Promise<void> {
  if (!props.booster) {
    return;
  }
  voiceUploading.value = true;
  try {
    const result = await boosterApi.clearVoice(props.booster.id);
    form.voiceUrl = result.voiceUrl;
    ElMessage.success("语音已清空");
    emit("saved");
  } finally {
    voiceUploading.value = false;
  }
}

function close(): void {
  emit("update:modelValue", false);
}

function validate(): boolean {
  if (!form.applicantName.trim()) {
    ElMessage.warning("申请人姓名不能为空");
    return false;
  }
  if (!form.gender) {
    ElMessage.warning("请选择性别");
    return false;
  }
  if (form.serviceRegions.length === 0) {
    ElMessage.warning("接单区服至少选择 1 项");
    return false;
  }
  const introLength = form.intro.trim().length;
  if (introLength < BOOSTER_LIMITS.introMin) {
    ElMessage.warning(`自我介绍至少 ${BOOSTER_LIMITS.introMin} 个字符`);
    return false;
  }
  if (!form.contactType || !form.contactValue.trim()) {
    ElMessage.warning("请选择联系方式并填写联系账号");
    return false;
  }
  return true;
}

function buildPayload(): UpdateBoosterPayload | null {
  if (!form.gender || !form.contactType) {
    return null;
  }
  return {
    applicantName: form.applicantName.trim(),
    gender: form.gender,
    serviceRegions: [...form.serviceRegions],
    intro: form.intro.trim(),
    contactType: form.contactType,
    contactValue: form.contactValue.trim(),
    materialImage: form.materialImage.trim(),
    invitationCode: form.invitationCode.trim(),
  };
}

async function save(): Promise<void> {
  if (!props.booster || !validate()) {
    return;
  }
  const payload = buildPayload();
  if (!payload) {
    return;
  }
  saving.value = true;
  try {
    await boosterApi.update(props.booster.id, payload);
    ElMessage.success("打手资料已更新");
    close();
    emit("saved");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    title="编辑打手资料"
    size="560px"
    class="admin-drawer booster-profile-drawer"
    destroy-on-close
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <el-form
      label-width="96px"
      @submit.prevent
    >
      <el-form-item
        label="申请人姓名"
        required
      >
        <el-input
          v-model="form.applicantName"
          :maxlength="BOOSTER_LIMITS.applicantNameMax"
          show-word-limit
        />
      </el-form-item>

      <el-form-item
        label="性别"
        required
      >
        <el-segmented
          v-model="form.gender"
          :options="BOOSTER_GENDER_OPTIONS"
        />
      </el-form-item>

      <el-form-item
        label="接单区服"
        required
      >
        <el-checkbox-group v-model="form.serviceRegions">
          <el-checkbox
            v-for="region in regionOptions"
            :key="region.value"
            :value="region.value"
          >
            {{ region.label }}
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item
        label="自我介绍"
        required
      >
        <el-input
          v-model="form.intro"
          type="textarea"
          :rows="5"
          :maxlength="BOOSTER_LIMITS.introMax"
          show-word-limit
        />
      </el-form-item>

      <el-form-item
        label="联系方式"
        required
      >
        <div class="booster-contact-editor">
          <el-segmented
            v-model="form.contactType"
            :options="BOOSTER_CONTACT_OPTIONS"
          />
          <el-input
            v-model="form.contactValue"
            :maxlength="BOOSTER_LIMITS.contactValueMax"
            placeholder="填写手机号、微信号或 QQ 号"
            show-word-limit
          />
        </div>
      </el-form-item>

      <el-form-item label="其他材料">
        <image-uploader
          v-model="form.materialImage"
          :show-url="false"
        />
      </el-form-item>

      <el-form-item label="语音介绍">
        <div class="booster-voice-editor">
          <el-upload
            :show-file-list="false"
            :auto-upload="false"
            :accept="VOICE_ACCEPT"
            @change="uploadVoice"
          >
            <el-button
              :icon="UploadFilled"
              :loading="voiceUploading"
            >
              {{ form.voiceUrl ? "更换语音" : "上传语音" }}
            </el-button>
          </el-upload>
          <div
            v-if="form.voiceUrl"
            class="booster-voice-editor__preview"
          >
            <audio
              :src="form.voiceUrl"
              controls
              preload="metadata"
            />
            <el-button
              type="danger"
              plain
              :icon="Delete"
              :loading="voiceUploading"
              @click="clearVoice"
            >
              清空
            </el-button>
          </div>
          <span class="booster-voice-editor__hint">
            上传或清空后立即生效；支持 MP3、M4A、WAV 或 WebM，单个文件不超过
            {{ VOICE_MAX_SIZE_MB }}MB
          </span>
        </div>
      </el-form-item>

      <el-form-item label="邀请码">
        <el-input
          v-model="form.invitationCode"
          :maxlength="BOOSTER_LIMITS.invitationCodeMax"
          placeholder="未填写"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="admin-drawer__footer">
        <el-button @click="close">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="save"
        >
          保存
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.booster-contact-editor {
  display: grid;
  width: 100%;
  gap: 12px;
}

.booster-contact-editor :deep(.el-segmented) {
  justify-self: start;
}

.booster-voice-editor {
  display: grid;
  width: 100%;
  gap: 10px;
}

.booster-voice-editor :deep(.el-upload) {
  display: block;
  text-align: left;
}

.booster-voice-editor__preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.booster-voice-editor__preview audio {
  width: min(100%, 320px);
  height: 40px;
}

.booster-voice-editor__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
