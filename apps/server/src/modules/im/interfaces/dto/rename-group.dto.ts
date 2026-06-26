import { RenameGroupPayload } from '@app/contracts';
import { IsString, Length } from 'class-validator';

/** 群改名入参 */
export class RenameGroupDto implements RenameGroupPayload {
  @IsString()
  @Length(1, 128)
  title!: string;
}
