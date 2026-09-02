# Airvana Flutter Mobile

Airvana 移动端的 Flutter 渐进式重构工程。当前交付的是第一条可验证纵切：

`首页发现 -> 打开已发布 Playable -> 服务端确认运行事件 -> 体验记录恢复`

状态为 `LOCAL / DEMO`。它不会把本地预览、运行回执或本地发布描述成生产审核、全网发布、归因或结算成功。

## 架构边界

- Flutter 负责移动端 UI、导航、安全会话和受控 WebView 容器。
- Playable 仍由现有 H5 Runtime 运行；只允许加载同源地址。
- H5 Runtime 向服务端按顺序提交事件；Flutter 只接收服务端确认后的桥接回执，不重复记账。
- 网络、权限或服务端失败时直接展示失败和重试状态，不生成伪成功数据。
- Campaign、商业权限、奖励、归因、结算和 Kill Switch 仍必须由服务端及获批的版本化 Campaign Contract 控制。

详细决策见：

`../../docs/adr/ADR-001-Flutter移动架构与受控Playable-Runtime.md`

## 本地运行

先在仓库根目录启动现有服务端：

```bash
npm run dev
```

iOS 模拟器：

```bash
flutter run \
  --dart-define=AIRVANA_API_BASE_URL=http://127.0.0.1:8082 \
  --dart-define=AIRVANA_DEMO_LOGIN=true
```

Android 模拟器：

```bash
flutter run \
  --dart-define=AIRVANA_API_BASE_URL=http://10.0.2.2:8082 \
  --dart-define=AIRVANA_DEMO_LOGIN=true
```

真机需要将 `AIRVANA_API_BASE_URL` 改为开发机的局域网地址，并确认设备与开发机处于同一网络。当前 HTTP/cleartext 配置只用于本地演示；生产构建必须使用 HTTPS 并关闭演示登录。

## 验证

```bash
flutter analyze
flutter test
flutter build apk --debug \
  --dart-define=AIRVANA_API_BASE_URL=http://10.0.2.2:8082
```

服务端纵切测试在仓库根目录运行：

```bash
node --test --test-concurrency=1 test/mobile-runtime-proof.test.mjs
```

## 当前未迁移

创作中心、社交、通知、私信、钱包、订阅、KYC、Campaign、连接器和生产发布尚未迁移到 Flutter。应用内对应入口会明确显示迁移边界，不伪造已完成状态。
