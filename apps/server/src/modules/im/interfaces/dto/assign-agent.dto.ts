import { AssignAgentPayload } from '@app/contracts';
import { IsString, Length } from 'class-validator';

/** 指派坐席入参 */
export class AssignAgentDto implements AssignAgentPayload {
  @IsString()
  @Length(1, 36)
  agentId!: string;
}
