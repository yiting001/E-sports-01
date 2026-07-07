import { InviteCodeEntity } from './invite-code.entity';
import { InviteRecordEntity } from './invite-record.entity';

/** 邀请仓储注入令牌 */
export const INVITE_REPOSITORY = Symbol('INVITE_REPOSITORY');

/** 邀请仓储端口（邀请码 + 邀请记录） */
export interface InviteRepository {
  /** 按用户查邀请码 */
  findCodeByUser(userId: string): Promise<InviteCodeEntity | null>;
  /** 按邀请码查归属（填码绑定时定位邀请人） */
  findCodeByCode(code: string): Promise<InviteCodeEntity | null>;
  /** 保存邀请码（生成时用） */
  saveCode(data: Partial<InviteCodeEntity>): Promise<InviteCodeEntity>;
  /** 查被邀请人是否已有绑定记录 */
  findRecordByInvitee(inviteeId: string): Promise<InviteRecordEntity | null>;
  /** 保存邀请记录 */
  saveRecord(data: Partial<InviteRecordEntity>): Promise<InviteRecordEntity>;
  /** 某邀请人的全部邀请记录（C 端我的邀请） */
  listByInviter(inviterId: string): Promise<InviteRecordEntity[]>;
  /** 分页查询邀请记录（管理端） */
  paginateRecords(
    skip: number,
    take: number,
  ): Promise<[InviteRecordEntity[], number]>;
}
