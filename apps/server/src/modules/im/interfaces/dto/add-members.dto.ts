import { AddMembersPayload } from '@app/contracts';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

/** 加成员入参 */
export class AddMembersDto implements AddMembersPayload {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds!: string[];
}
