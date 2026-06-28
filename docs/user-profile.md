# 用户资料自助编辑（User Profile）

## 模块职责

让任意登录用户自助维护本人资料（头像 / 昵称 / 绑定手机号），与「用户管理」（管理员对全量用户的增删改、状态、口令、角色）解耦：本模块只允许本人改本人，且不涉及状态/角色/口令。

实现的功能：

- **头像**：新增 `User.avatar` 字段（URL）；经 `POST /upload/self` 自助上传得到 URL 后保存。
- **昵称 / 手机号**：自助修改；手机号唯一性校验复用 `existsByPhone`（排除自身），传空串即解绑。
- **即时生效**：保存后前端回灌 `auth.store` 的 `profile`，侧边栏头像/昵称即时刷新；浏览器无需刷新。

> 复用既有能力，不重复造轮子：上传走 Upload 模块（新增免授权的自助端点），档案读取复用 `GET /auth/profile`（扩展 `avatar`/`phone` 字段），手机号唯一校验复用 RBAC 既有逻辑。

## 结构导图

```
能力              端点                       层
头像上传(自助)    POST /upload/self          upload.interfaces/UploadSelfController
                                            → 复用 UploadFileUseCase（仅去掉权限门控）
读取本人档案      GET  /auth/profile         rbac.application/GetProfileUseCase（+avatar/+phone）
更新本人档案      PUT  /auth/profile         rbac.application/UpdateProfileUseCase
前端              /profile（个人中心）        web/views/profile/ProfileView.vue
入口              右上角头像下拉「个人中心」    web/layouts/AppLayout.vue
```

## 设计要点

- **最小授权**：`PUT /auth/profile` 与 `POST /upload/self` 仅需登录态（无 `@Permissions`），所有角色通用；管理端上传仍受 `upload:file:upload` 门控。
- **职责单一**：`UpdateProfileUseCase` 只改 昵称/头像/手机号，与管理员的 `UpdateUserUseCase`（含状态/口令/角色）互不影响。
- **契约单一来源**：`UpdateProfilePayload`、`UserView.avatar`、`AuthProfile.avatar/phone` 均在 `@app/contracts` 定义，前后端共享。

## 涉及接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/auth/profile` | 登录 | 当前用户档案（含 `avatar`、`phone`） |
| PUT | `/auth/profile` | 登录 | 更新 `{ nickname?, avatar?, phone? }` → `UserView` |
| POST | `/upload/self` | 登录 | 自助上传单文件 → `{ url, key, ... }` |
