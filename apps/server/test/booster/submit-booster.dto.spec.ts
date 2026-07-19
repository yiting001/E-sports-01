import assert from 'node:assert/strict';
import test from 'node:test';
import { BoosterContactType, BoosterGender, type BoosterServiceRegion } from '@app/contracts';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SubmitBoosterDto } from '../../src/modules/booster/interfaces/dto/submit-booster.dto';
import { UpdateBoosterDto } from '../../src/modules/booster/interfaces/dto/update-booster.dto';

function createDto(overrides: Partial<SubmitBoosterDto> = {}): SubmitBoosterDto {
  return plainToInstance(SubmitBoosterDto, {
    applicantName: '张三',
    gender: BoosterGender.Male,
    serviceRegions: ['delta-mobile'] as BoosterServiceRegion[],
    intro: '熟悉移动端接单流程',
    contactType: BoosterContactType.Phone,
    contactValue: '13800138000',
    materialImage: '/static/booster/material.jpg',
    invitationCode: '',
    ...overrides,
  });
}

test('accepts a complete booster application', async () => {
  const errors = await validate(createDto());
  assert.equal(errors.length, 0);
});

test('rejects an empty service region selection and a short intro', async () => {
  const errors = await validate(createDto({ serviceRegions: [], intro: '短' }));
  const properties = errors.map((error) => error.property);
  assert.ok(properties.includes('serviceRegions'));
  assert.ok(properties.includes('intro'));
});

test('rejects unsafe material image protocols', async () => {
  const errors = await validate(createDto({ materialImage: 'javascript:alert(1)' }));
  assert.ok(errors.some((error) => error.property === 'materialImage'));
});

test('allows an empty optional material image', async () => {
  const errors = await validate(createDto({ materialImage: '' }));
  assert.equal(errors.length, 0);
});

test('trims input before validation and rejects whitespace-only required fields', async () => {
  const errors = await validate(
    createDto({ applicantName: '   ', intro: '   ', contactValue: '   ' }),
  );
  const properties = errors.map((error) => error.property);
  assert.ok(properties.includes('applicantName'));
  assert.ok(properties.includes('intro'));
  assert.ok(properties.includes('contactValue'));
});

test('rejects null values in optional admin update fields', async () => {
  const dto = plainToInstance(UpdateBoosterDto, {
    applicantName: null,
    gender: null,
    serviceRegions: null,
    intro: null,
    contactType: null,
    contactValue: null,
    materialImage: null,
    invitationCode: null,
  });
  const errors = await validate(dto);
  assert.deepEqual(
    new Set(errors.map((error) => error.property)),
    new Set([
      'applicantName',
      'gender',
      'serviceRegions',
      'intro',
      'contactType',
      'contactValue',
      'materialImage',
      'invitationCode',
    ]),
  );
});
