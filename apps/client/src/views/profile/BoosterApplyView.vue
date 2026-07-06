<script setup lang="ts">
/**
 * 打手入驻页（全屏，入口在「我的」页更多功能）。
 * 按当前申请状态分场景：未申请展示申请表单；待审核展示进度提示；
 * 已入驻展示资料卡；被驳回展示理由并允许修改后重新提交。
 * 开启实名前置时，未通过实名认证不可提交（引导先去实名）。
 * 提交后由管理端审核，通过即授予 booster（打手）角色。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { BOOSTER_LIMITS, BoosterStatus, type BoosterMineView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { boosterApi } from '@/api/booster.api';
import { useToast } from '@/composables/use-toast';
import './BoosterApplyView.responsive.css';

const router = useRouter();
const toast = useToast();

const mine = ref<BoosterMineView | null>(null);
const loading = ref(true);
const submitting = ref(false);

const gameNickname = ref('');
const gameName = ref('');
const rank = ref('');
const intro = ref('');

const status = computed(() => mine.value?.status ?? BoosterStatus.None);
/** 未申请或被驳回时展示表单（驳回场景预填原资料供修改重提） */
const showForm = computed(
  () => status.value === BoosterStatus.None || status.value === BoosterStatus.Rejected,
);
/** 开启实名前置且未通过实名时需先完成实名认证 */
const realnameBlocked = computed(
  () => (mine.value?.requireRealname ?? false) && !(mine.value?.realnameApproved ?? false),
);
const canSubmit = computed(
  () =>
    !realnameBlocked.value &&
    gameNickname.value.trim() !== '' &&
    gameName.value.trim() !== '' &&
    rank.value.trim() !== '' &&
    intro.value.trim() !== '',
);

async function load(): Promise<void> {
  loading.value = true;
  try {
    mine.value = await boosterApi.mine();
    const record = mine.value.record;
    if (record) {
      gameNickname.value = record.gameNickname;
      gameName.value = record.gameName;
      rank.value = record.rank;
      intro.value = record.intro;
    }
  } finally {
    loading.value = false;
  }
}

async function submit(): Promise<void> {
  if (!canSubmit.value || submitting.value) {
    return;
  }
  submitting.value = true;
  try {
    await boosterApi.apply({
      gameNickname: gameNickname.value.trim(),
      gameName: gameName.value.trim(),
      rank: rank.value.trim(),
      intro: intro.value.trim(),
    });
    toast.show('申请已提交，请等待审核');
    await load();
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div class="booster-page client-page">
    <header class="bar">
      <div class="bar-inner">
        <button
          class="back"
          aria-label="返回"
          @click="router.back()"
        >
          <AppIcon
            name="chevron"
            :size="20"
          />
        </button>
        <span class="name">打手入驻</span>
      </div>
    </header>

    <div class="scroll">
      <p
        v-if="loading"
        class="hint"
      >
        加载中…
      </p>

      <template v-else>
        <section
          v-if="status === BoosterStatus.Pending"
          class="card state"
        >
          <h3 class="state-title state-title--pending">
            审核中
          </h3>
          <p class="state-tip">
            入驻申请已提交，请耐心等待管理员审核。
          </p>
        </section>

        <section
          v-else-if="status === BoosterStatus.Approved"
          class="card state"
        >
          <h3 class="state-title state-title--ok">
            已入驻
          </h3>
          <p class="state-tip">
            恭喜，你已成为平台打手，可开始接单服务。
          </p>
        </section>

        <section
          v-else-if="status === BoosterStatus.Rejected"
          class="card state state--reject"
        >
          <h3 class="state-title state-title--reject">
            申请被驳回
          </h3>
          <p class="state-tip">
            驳回理由：{{ mine?.record?.rejectReason || '未填写' }}，请修改资料后重新提交。
          </p>
        </section>

        <section
          v-if="status === BoosterStatus.Pending || status === BoosterStatus.Approved"
          class="card form form--readonly"
        >
          <div class="row">
            <span class="label">游戏昵称</span>
            <span class="value">{{ mine?.record?.gameNickname }}</span>
          </div>
          <div class="row">
            <span class="label">擅长游戏</span>
            <span class="value">{{ mine?.record?.gameName }}</span>
          </div>
          <div class="row">
            <span class="label">段位实力</span>
            <span class="value">{{ mine?.record?.rank }}</span>
          </div>
          <div class="row">
            <span class="label">自我介绍</span>
            <span class="value">{{ mine?.record?.intro }}</span>
          </div>
        </section>

        <template v-if="showForm">
          <section
            v-if="realnameBlocked"
            class="card state state--reject"
          >
            <h3 class="state-title state-title--reject">
              需先完成实名认证
            </h3>
            <p class="state-tip">
              平台要求打手实名入驻，请先在实名认证页完成认证后再提交申请。
            </p>
          </section>
          <section
            class="card form form--editable"
            :class="{ 'form--with-state': status === BoosterStatus.Rejected }"
          >
            <div class="row">
              <span class="label">游戏昵称</span>
              <input
                v-model="gameNickname"
                class="input"
                :maxlength="BOOSTER_LIMITS.gameNicknameMax"
                placeholder="填写游戏内昵称"
              >
            </div>
            <div class="row">
              <span class="label">擅长游戏</span>
              <input
                v-model="gameName"
                class="input"
                :maxlength="BOOSTER_LIMITS.gameNameMax"
                placeholder="如：英雄联盟 / 王者荣耀"
              >
            </div>
            <div class="row">
              <span class="label">段位实力</span>
              <input
                v-model="rank"
                class="input"
                :maxlength="BOOSTER_LIMITS.rankMax"
                placeholder="如：王者 50 星 / 最强王者"
              >
            </div>
            <div class="row row--textarea">
              <span class="label">自我介绍</span>
              <textarea
                v-model="intro"
                class="input textarea"
                :maxlength="BOOSTER_LIMITS.introMax"
                rows="4"
                placeholder="介绍接单经验、可服务时间等"
              />
            </div>
          </section>

          <button
            class="submit"
            :class="{ 'submit--with-state': status === BoosterStatus.Rejected }"
            :disabled="!canSubmit || submitting"
            @click="submit"
          >
            {{ submitting ? '提交中…' : status === BoosterStatus.Rejected ? '重新提交' : '提交申请' }}
          </button>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.booster-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--c-bg);
}

.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}

.bar-inner {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.back {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--c-text);
  transform: rotate(180deg);
}

.name {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-muted);
  padding: 24px 0;
}

.state {
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.state-title {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.state-title--pending {
  color: var(--c-accent);
}

.state-title--ok {
  color: var(--c-success, #4caf50);
}

.state-title--reject {
  color: var(--c-danger);
}

.state-tip {
  font-size: 13px;
  color: var(--c-text-secondary);
  line-height: 1.6;
}

.form {
  padding: 4px 14px;
}

.row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--c-border);
}

.row:last-child {
  border-bottom: none;
}

.row--textarea {
  align-items: flex-start;
}

.label {
  flex-shrink: 0;
  width: 64px;
  font-size: 14px;
  color: var(--c-text-secondary);
}

.value {
  flex: 1;
  font-size: 14px;
  color: var(--c-text);
  word-break: break-word;
}

.input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--c-text);
  font-size: 14px;
}

.textarea {
  resize: none;
  line-height: 1.6;
  font-family: inherit;
}

.submit {
  padding: 12px;
  font-size: 15px;
  font-weight: 800;
  font-style: italic;
  color: var(--c-bg);
  background: var(--c-accent);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.submit:disabled {
  opacity: 0.5;
}
</style>
