import { IsUUID } from 'class-validator';

/** 指派打手请求体 */
export class AssignOrderDto {
  /** 被指派的打手用户 id */
  @IsUUID()
  boosterId!: string;
}
