import { UpdateBoosterAvailabilityPayload } from '@app/contracts';
import { IsBoolean } from 'class-validator';

/** 打手本人切换上线/下线状态入参。 */
export class UpdateBoosterAvailabilityDto implements UpdateBoosterAvailabilityPayload {
  @IsBoolean()
  acceptingOrders!: boolean;
}
