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
      "https://client.example.com/portal?source=admin#/?tenantCode=tenant-one"
    );

    expect(
      buildTenantSiteUrl("/client/", "tenant-two", "https://example.com")
    ).toBe("https://example.com/client/#/?tenantCode=tenant-two");
  });

  it("tenantCode 置于 hash 路由 query 中，保留已有 hash 路径与参数", () => {
    expect(
      buildTenantSiteUrl(
        "https://client.example.com/#/home?foo=1",
        "tenant-one",
        "https://admin.example.com"
      )
    ).toBe("https://client.example.com/#/home?foo=1&tenantCode=tenant-one");
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
        "not a url",
        "tenant-one",
        "https://admin.example.com/rbac/tenants"
      )
    ).toBeNull();
    expect(
      buildTenantSiteUrl(
        "javascript:alert(1)",
        "tenant-one",
        "https://admin.example.com"
      )
    ).toBeNull();
  });

  it("同域 /admin/ 部署未显式配置时回退到 C 端根路径", () => {
    expect(
      buildTenantSiteUrl(
        undefined,
        "tenant-one",
        "https://esports.example.com/admin/rbac/tenants"
      )
    ).toBe("https://esports.example.com/#/?tenantCode=tenant-one");
  });

  it("本地开发未显式配置时按管理端端口推断 C 端入口", () => {
    expect(
      buildTenantSiteUrl(
        undefined,
        "tenant-two",
        "http://127.0.0.1:5180/rbac/tenants"
      )
    ).toBe("http://127.0.0.1:5181/#/?tenantCode=tenant-two");
  });
});
