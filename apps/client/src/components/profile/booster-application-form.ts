import {
  BOOSTER_LIMITS,
  BOOSTER_SERVICE_REGION_LIMITS,
  BOOSTER_SERVICE_REGION_VALUES,
  type BoosterContactType,
  type BoosterGender,
  type BoosterView,
  type SubmitBoosterPayload,
} from "@app/contracts";

/** 表单编辑态允许单选项暂未选择，提交前再收窄为共享契约。 */
export type BoosterApplicationFormModel = Omit<
  SubmitBoosterPayload,
  "gender" | "contactType"
> & {
  gender: BoosterGender | "";
  contactType: BoosterContactType | "";
};

export function createBoosterApplicationForm(
  record?: BoosterView | null
): BoosterApplicationFormModel {
  return {
    applicantName: record?.applicantName ?? "",
    gender: record?.gender ?? "",
    serviceRegions: record ? [...record.serviceRegions] : [],
    intro: record?.intro ?? "",
    contactType: record?.contactType ?? "",
    contactValue: record?.contactValue ?? "",
    materialImage: record?.materialImage ?? "",
    invitationCode: record?.invitationCode ?? "",
  };
}

/** 校验并构造提交载荷，避免用类型断言绕过未选择的单选项。 */
export function toBoosterSubmitPayload(
  model: BoosterApplicationFormModel,
  allowedRegionValues: readonly string[] = BOOSTER_SERVICE_REGION_VALUES
): SubmitBoosterPayload | null {
  const applicantName = model.applicantName.trim();
  const intro = model.intro.trim();
  const contactValue = model.contactValue.trim();
  const materialImage = model.materialImage.trim();
  const invitationCode = model.invitationCode.trim();
  const regionsAreUnique =
    new Set(model.serviceRegions).size === model.serviceRegions.length;
  const regionsAreSupported = model.serviceRegions.every((value) =>
    allowedRegionValues.includes(value)
  );

  if (
    applicantName.length === 0 ||
    applicantName.length > BOOSTER_LIMITS.applicantNameMax ||
    !model.gender ||
    model.serviceRegions.length === 0 ||
    model.serviceRegions.length > BOOSTER_SERVICE_REGION_LIMITS.optionsMax ||
    !regionsAreUnique ||
    !regionsAreSupported ||
    intro.length < BOOSTER_LIMITS.introMin ||
    intro.length > BOOSTER_LIMITS.introMax ||
    !model.contactType ||
    contactValue.length === 0 ||
    contactValue.length > BOOSTER_LIMITS.contactValueMax ||
    materialImage.length > BOOSTER_LIMITS.materialImageMax ||
    invitationCode.length > BOOSTER_LIMITS.invitationCodeMax
  ) {
    return null;
  }

  return {
    applicantName,
    gender: model.gender,
    serviceRegions: [...model.serviceRegions],
    intro,
    contactType: model.contactType,
    contactValue,
    materialImage,
    invitationCode,
  };
}
