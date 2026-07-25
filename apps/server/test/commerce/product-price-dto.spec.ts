import assert from 'node:assert/strict';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from '../../src/modules/commerce/interfaces/dto/create-product.dto';
import { UpdateProductDto } from '../../src/modules/commerce/interfaces/dto/update-product.dto';

const validPayload = {
  categoryId: '11111111-1111-4111-8111-111111111111',
  title: '三角洲陪玩',
  coverTitle: '极速接单',
  priceFen: 1_000,
  originPriceFen: 1_200,
  pcPriceFen: 1_500,
  pcOriginPriceFen: 1_800,
};

test('创建商品要求同时提交手机端和电脑端价格', async () => {
  const valid = plainToInstance(CreateProductDto, validPayload);
  assert.deepEqual(await validate(valid), []);

  const missingPcPrices = plainToInstance(CreateProductDto, {
    ...validPayload,
    pcPriceFen: undefined,
    pcOriginPriceFen: undefined,
  });
  const errors = await validate(missingPcPrices);
  assert.deepEqual(errors.map((error) => error.property).sort(), [
    'pcOriginPriceFen',
    'pcPriceFen',
  ]);
});

test('更新商品允许单独修改电脑端价格并拒绝负数金额', async () => {
  const valid = plainToInstance(UpdateProductDto, {
    pcPriceFen: 900,
    pcOriginPriceFen: 1_100,
  });
  assert.deepEqual(await validate(valid), []);

  const invalid = plainToInstance(UpdateProductDto, {
    pcPriceFen: -1,
    pcOriginPriceFen: -1,
  });
  const errors = await validate(invalid);
  assert.deepEqual(errors.map((error) => error.property).sort(), [
    'pcOriginPriceFen',
    'pcPriceFen',
  ]);
});
