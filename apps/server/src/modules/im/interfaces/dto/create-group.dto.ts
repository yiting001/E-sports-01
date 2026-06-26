import { CreateGroupPayload } from '@app/contracts';
import { ArrayNotEmpty, IsArray, IsString, Length } from 'class-validator';

/** 建群入参 */
export class CreateGroupDto implements CreateGroupPayload {
  @IsString()
  @Length(1, 128)
  title!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  memberIds!: string[];
}
