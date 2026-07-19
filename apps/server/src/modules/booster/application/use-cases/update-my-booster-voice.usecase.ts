import { BoosterStatus, BoosterView } from '@app/contracts';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UploadFileInput } from '../../../upload/application/use-cases/upload-file.usecase';
import { UploadFileUseCase } from '../../../upload/application/use-cases/upload-file.usecase';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  BOOSTER_REPOSITORY,
  BoosterRepository,
} from '../../domain/booster-repository.interface';
import { BoosterApplicationEntity } from '../../domain/booster-application.entity';
import { toBoosterView } from '../booster.mapper';
import { BoosterPolicyService } from '../booster-policy.service';
import { validateBoosterVoiceFile } from '../booster-voice-file';

@Injectable()
export class UpdateMyBoosterVoiceUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    private readonly uploadFile: UploadFileUseCase,
    private readonly users: UserDirectory,
    private readonly policy: BoosterPolicyService,
  ) {}

  async upload(userId: string, input: UploadFileInput): Promise<BoosterView> {
    const record = await this.getApprovedRecord(userId);
    const uploaded = await this.uploadFile.execute(
      validateBoosterVoiceFile(input),
      userId,
    );
    record.voiceUrl = uploaded.url;
    return this.saveAndMap(record);
  }

  async clear(userId: string): Promise<BoosterView> {
    const record = await this.getApprovedRecord(userId);
    record.voiceUrl = '';
    return this.saveAndMap(record);
  }

  async uploadById(
    id: string,
    uploaderId: string,
    input: UploadFileInput,
  ): Promise<BoosterView> {
    const record = await this.getRecordById(id);
    const uploaded = await this.uploadFile.execute(
      validateBoosterVoiceFile(input),
      uploaderId,
    );
    record.voiceUrl = uploaded.url;
    return this.saveAndMap(record);
  }

  async clearById(id: string): Promise<BoosterView> {
    const record = await this.getRecordById(id);
    record.voiceUrl = '';
    return this.saveAndMap(record);
  }

  private async getApprovedRecord(userId: string): Promise<BoosterApplicationEntity> {
    const record = await this.repo.findByUserId(userId);
    if (!record) {
      throw new NotFoundException('打手入驻记录不存在');
    }
    if (record.status !== BoosterStatus.Approved) {
      throw new ForbiddenException('仅审核通过的打手可维护试听语音');
    }
    return record;
  }

  private async getRecordById(id: string): Promise<BoosterApplicationEntity> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundException('打手入驻记录不存在');
    }
    return record;
  }

  private async saveAndMap(record: BoosterApplicationEntity): Promise<BoosterView> {
    const saved = await this.repo.save(record);
    const [profiles, tiers] = await Promise.all([
      this.users.resolveProfiles([saved.userId]),
      this.policy.getLevelTiers(),
    ]);
    return toBoosterView(saved, tiers, profiles.get(saved.userId));
  }
}
