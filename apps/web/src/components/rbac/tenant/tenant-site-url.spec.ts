import { describe, expect, it } from "vitest";
import { buildTenantSiteUrl } from "./tenant-site-url";

describe("租户 C 端站点地址", () => {
  it("从显式配置的站点地址构造租户入口", () => {
    expect(
      buildTenantSiteUrl(
        "https://client.example.com/portal?source=admin",
        "tenant-one",
        "https://admin.example.com"
      )
    ).toBe(
      "https://client.example.com/portal?source=admin&tenantCode=tenant-one"
    );

    expect(
      buildTenantSiteUrl("/client/", "tenant-two", "https://example.com")
    ).toBe("https://example.com/client/?tenantCode=tenant-two");
  });

  it("配置缺失、无效或非 HTTP(S) 协议时关闭入口", () => {
    expect(
      buildTenantSiteUrl(undefined, "tenant-one", "https://admin.example.com")
    ).toBeNull();
    expect(
      buildTenantSiteUrl("not a url", "tenant-one", "invalid origin")
    ).toBeNull();
    expect(
      buildTenantSiteUrl(
        "javascript:alert(1)",
        "tenant-one",
        "https://admin.example.com"
      )
    ).toBeNull();
  });
});
