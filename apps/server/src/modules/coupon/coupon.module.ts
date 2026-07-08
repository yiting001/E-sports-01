import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RbacModule } from '../rbac/rbac.module';

import { CouponEntity } from './domain/coupon.entity';
import { UserCouponEntity } from './domain/user-coupon.entity';
import { CouponDistributorEntity } from './domain/coupon-distributor.entity';
import { COUPON_REPOSITORY } from './domain/coupon-repository.interface';

import { TypeormCouponRepository } from './infrastructure/coupon.repository';

import { CouponRedeemService } from './application/coupon-redeem.service';
import { CouponGrantService } from './application/coupon-grant.service';
import { ListCouponsUseCase } from './application/use-cases/list-coupons.usecase';
import { SaveCouponUseCase } from './application/use-cases/save-coupon.usecase';
import { RemoveCouponUseCase } from './application/use-cases/remove-coupon.usecase';
import { ListClaimableCouponsUseCase } from './application/use-cases/list-claimable-coupons.usecase';
import { ClaimCouponUseCase } from './application/use-cases/claim-coupon.usecase';
import { ListMyCouponsUseCase } from './application/use-cases/list-my-coupons.usecase';
import { AddCouponDistributorUseCase } from './application/use-cases/add-coupon-distributor.usecase';
import { RemoveCouponDistributorUseCase } from './application/use-cases/remove-coupon-distributor.usecase';
import { ListCouponDistributorsUseCase } from './application/use-cases/list-coupon-distributors.usecase';
import { ListCouponClaimsUseCase } from './application/use-cases/list-coupon-claims.usecase';
import { ListDistributorCandidatesUseCase } from './application/use-cases/list-distributor-candidates.usecase';
import { ListMyDistributionsUseCase } from './application/use-cases/list-my-distributions.usecase';
import { GetCouponByCodeUseCase } from './application/use-cases/get-coupon-by-code.usecase';
import { ClaimCouponByCodeUseCase } from './application/use-cases/claim-coupon-by-code.usecase';

import { CouponAdminListController } from './interfaces/controllers/coupon.admin.list.controller';
import { CouponAdminCreateController } from './interfaces/controllers/coupon.admin.create.controller';
import { CouponAdminUpdateController } from './interfaces/controllers/coupon.admin.update.controller';
import { CouponAdminRemoveController } from './interfaces/controllers/coupon.admin.remove.controller';
import { CouponCenterListController } from './interfaces/controllers/coupon.center.list.controller';
import { CouponMineController } from './interfaces/controllers/coupon.mine.controller';
import { CouponClaimController } from './interfaces/controllers/coupon.claim.controller';
import { CouponAdminCandidatesController } from './interfaces/controllers/coupon.admin.candidates.controller';
import { CouponAdminDistributorsListController } from './interfaces/controllers/coupon.admin.distributors.list.controller';
import { CouponAdminDistributorsAddController } from './interfaces/controllers/coupon.admin.distributors.add.controller';
import { CouponAdminDistributorsRemoveController } from './interfaces/controllers/coupon.admin.distributors.remove.controller';
import { CouponAdminClaimsController } from './interfaces/controllers/coupon.admin.claims.controller';
import { CouponShareMineController } from './interfaces/controllers/coupon.share.mine.controller';
import { CouponCodeGetController } from './interfaces/controllers/coupon.code.get.controller';
import { CouponCodeClaimController } from './interfaces/controllers/coupon.code.claim.controller';

/**
 * 优惠券模块。
 * DDD 四层：管理端发券（满减/折扣、门槛、库存、限领、有效期，RBAC 门控）；
 * C 端领券中心领取（条件自增杜绝超发、券面快照）、我的优惠券查看；
 * 定向发放：指派分发人（客服/打手）一人一码，C 端凭分发链接领取并归因记录；
 * 下单结算经 CouponRedeemService 校验并核销抵扣，取消订单回退（订单模块调用）。
 * 注意：center/mine 等静态路由控制器需注册在带 :id 参数的控制器之前。
 */
@Module({
  imports: [
    RbacModule,
    TypeOrmModule.forFeature([
      CouponEntity,
      UserCouponEntity,
      CouponDistributorEntity,
    ]),
  ],
  controllers: [
    CouponAdminListController,
    CouponAdminCandidatesController,
    CouponAdminCreateController,
    CouponAdminUpdateController,
    CouponAdminRemoveController,
    CouponAdminDistributorsListController,
    CouponAdminDistributorsAddController,
    CouponAdminDistributorsRemoveController,
    CouponAdminClaimsController,
    CouponCenterListController,
    CouponMineController,
    CouponShareMineController,
    CouponCodeGetController,
    CouponCodeClaimController,
    CouponClaimController,
  ],
  providers: [
    { provide: COUPON_REPOSITORY, useClass: TypeormCouponRepository },
    CouponRedeemService,
    CouponGrantService,
    ListCouponsUseCase,
    SaveCouponUseCase,
    RemoveCouponUseCase,
    ListClaimableCouponsUseCase,
    ClaimCouponUseCase,
    ListMyCouponsUseCase,
    AddCouponDistributorUseCase,
    RemoveCouponDistributorUseCase,
    ListCouponDistributorsUseCase,
    ListCouponClaimsUseCase,
    ListDistributorCandidatesUseCase,
    ListMyDistributionsUseCase,
    GetCouponByCodeUseCase,
    ClaimCouponByCodeUseCase,
  ],
  // 导出核销服务（订单模块抵扣/回退）与系统发券服务（邀请奖励发放）
  exports: [CouponRedeemService, CouponGrantService],
})
export class CouponModule {}
