import type {
  BoosterGender,
  BoosterPublicView,
  BoosterServiceRegion,
  PaginatedResult,
} from '@app/contracts';
import { http, type RequestOptions } from './http';

export interface BoosterDirectoryQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  gender?: BoosterGender;
  serviceRegion?: BoosterServiceRegion;
}

/** C 端打手公开目录：仅返回老板挑选所需的公开资料。 */
export const boosterDirectoryApi = {
  list(params: BoosterDirectoryQuery): Promise<PaginatedResult<BoosterPublicView>> {
    const options: RequestOptions = { params, silent: true };
    return http.get('/booster/directory', options);
  },

  detail(userId: string): Promise<BoosterPublicView> {
    const options: RequestOptions = { silent: true };
    return http.get(`/booster/directory/${userId}`, options);
  },
};
