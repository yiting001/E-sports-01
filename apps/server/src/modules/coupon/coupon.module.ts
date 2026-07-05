import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RbacModule } from '../rbac/rbac.module';

import { CouponEntity } from './domain/coupon.entity';
import { UserCouponEntity } from './domain/user-coupon.entity';
import { COUPON_REPOSITORY } from './domain/coupon-repository.interface';

import { TypeormCouponRepository } from './infrastructure/coupon.repository';

import { CouponRedeemService } from './application/coupon-redeem.service';
import { ListCouponsUseCase } from './application/use-cases/list-coupons.usecase';
import { SaveCouponUseCase } from './application/use-cases/save-coupon.usecase';
import { RemoveCouponUseCase } from './application/use-cases/remove-coupon.usecase';
import { ListClaimableCouponsUseCase } from './application/use-cases/list-claimable-coupons.usecase';
import { ClaimCouponUseCase } from './application/use-cases/claim-coupon.usecase';
import { ListMyCouponsUseCase } from './application/use-cases/list-my-coupons.usecase';

import { CouponAdminListController } from './interfaces/controllers/coupon.admin.list.controller';
import { CouponAdminCreateController } from './interfaces/controllers/coupon.admin.create.controller';
import { CouponAdminUpdateController } from './interfaces/controllers/coupon.admin.update.controller';
import { CouponAdminRemoveController } from './interfaces/controllers/coupon.admin.remove.controller';
import { CouponCenterListController } from './interfaces/controllers/coupon.center.list.controller';
import { CouponMineController } from './interfaces/controllers/coupon.mine.controller';
import { CouponClaimController } from './interfaces/controllers/coupon.claim.controller';

/**
 * 优惠券模块。
 * DDD 四层：管理端发券（满减/折扣、门槛、库存、限领、有效期，RBAC 门控）；
 * C 端领券中心领取（条件自增杜绝超发、券面快照）、我的优惠券查看；
 * 下单结算经 CouponRedeemService 校验并核销抵扣，取消订单回退（订单模块调用）。
 * 注意：center/mine 等静态路由控制器需注册在带 :id 参数的控制器之前。
 */
@Module({
  imports: [
    RbacModule,
    TypeOrmModule.forFeature([CouponEntity, UserCouponEntity]),
  ],
  controllers: [
    CouponAdminListController,
    CouponAdminCreateController,
    CouponAdminUpdateController,
    CouponAdminRemoveController,
    CouponCenterListController,
    CouponMineController,
    CouponClaimController,
  ],
  providers: [
    { provide: COUPON_REPOSITORY, useClass: TypeormCouponRepository },
    CouponRedeemService,
    ListCouponsUseCase,
    SaveCouponUseCase,
    RemoveCouponUseCase,
    ListClaimableCouponsUseCase,
    ClaimCouponUseCase,
    ListMyCouponsUseCase,
  ],
  // 导出核销服务，供订单模块下单抵扣/取消回退复用
  exports: [CouponRedeemService],
})
export class CouponModule {}
