import ElementPlus from "element-plus";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import AppMenu from "@/layouts/AppMenu.vue";
import { MENU_BADGE_CODES } from "@/stores/menu-badge.store";

describe("AppMenu badges", () => {
  it("超过 99 显示 99+，数量为 0 时隐藏角标", async () => {
    const app = createSSRApp(AppMenu, {
      activePath: "/order/admin",
      badgeCounts: {
        [MENU_BADGE_CODES.order]: 120,
        [MENU_BADGE_CODES.booster]: 0,
      },
      menus: [
        {
          key: "group:operations",
          title: "电竞运营",
          children: [
            {
              key: MENU_BADGE_CODES.order,
              path: "/order/admin",
              title: "订单管理",
            },
            {
              key: MENU_BADGE_CODES.booster,
              path: "/booster",
              title: "打手管理",
            },
          ],
        },
      ],
    });
    app.use(ElementPlus);

    const html = await renderToString(app);

    expect(html).toContain("99+");
    expect(html).toContain("订单管理");
    expect(html).toContain("打手管理");
    expect(html).toMatch(
      /el-badge__content[^>]*style="[^"]*display:none;?"[^>]*>0<\/sup>/
    );
  });
});
