import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOSTER_SERVICE_REGION, lowestProductPriceFen, resolveProductPrice } from '@app/contracts';

const product = {
  priceFen: 1_000,
  originPriceFen: 1_200,
  pcPriceFen: 1_500,
  pcOriginPriceFen: 1_800,
};

test('商品价格按下单区服解析手机端或电脑端价格', () => {
  assert.deepEqual(resolveProductPrice(product, BOOSTER_SERVICE_REGION.Mobile), {
    priceFen: 1_000,
    originPriceFen: 1_200,
  });
  assert.deepEqual(resolveProductPrice(product, BOOSTER_SERVICE_REGION.Pc), {
    priceFen: 1_500,
    originPriceFen: 1_800,
  });
});

test('商品最低展示价取手机端与电脑端现价的较小值', () => {
  assert.equal(lowestProductPriceFen(product), 1_000);
  assert.equal(lowestProductPriceFen({ ...product, pcPriceFen: 800 }), 800);
});
