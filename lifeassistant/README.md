# 🧧 生活助手

一个春节主题的待办事项提醒应用，帮助您管理日常事务。

## 功能特性

- 📝 添加待办事项，设置提醒时间
- 🔔 到时间自动响铃提醒
- 🔄 可配置的重复提醒间隔（默认5分钟）
- ✅ 滑动完成或删除待办
- 🎨 喜庆的春节主题界面
- 📱 支持 Android 和 iOS

## 技术栈

- **框架**: Flutter 3.0+
- **语言**: Dart
- **状态管理**: Provider
- **数据库**: SQLite (sqflite)
- **本地通知**: flutter_local_notifications

## 项目结构

```
lib/
├── main.dart                 # 应用入口
├── models/
│   └── todo_item.dart        # 待办事项数据模型
├── providers/
│   └── todo_provider.dart    # 状态管理
├── screens/
│   ├── home_screen.dart      # 首页
│   └── add_todo_screen.dart  # 添加待办页面
├── services/
│   ├── database_service.dart # 数据库服务
│   └── notification_service.dart # 通知服务
└── utils/
    └── app_theme.dart        # 主题配置
```

## 环境要求

- Flutter SDK 3.0 或更高版本
- Dart SDK 3.0 或更高版本
- Android Studio / Xcode
- Android SDK (API 21+)
- Xcode 14+ (iOS)

## 安装步骤

### 1. 安装 Flutter

如果还没有安装 Flutter，请访问 [Flutter 官网](https://flutter.dev/docs/get-started/install) 按照指引安装。

验证安装：
```bash
flutter doctor
```

### 2. 克隆项目

```bash
cd ai_repos/lifeassistant
```

### 3. 安装依赖

```bash
flutter pub get
```

### 4. 运行应用

#### Android:
```bash
flutter run
```

#### iOS (需要 Mac 和 Xcode):
```bash
flutter run -d ios
```

## 在手机上运行

### Android 手机

1. **启用开发者选项**:
   - 进入手机设置 → 关于手机
   - 连续点击"版本号"7次，开启开发者模式

2. **启用 USB 调试**:
   - 设置 → 系统 → 开发者选项
   - 开启"USB 调试"

3. **连接手机**:
   - 用 USB 线连接手机和电脑
   - 手机上允许 USB 调试

4. **运行应用**:
   ```bash
   flutter devices  # 查看已连接设备
   flutter run      # 运行应用
   ```

### iOS 手机

1. **连接手机**:
   - 用 USB 线连接 iPhone 和 Mac

2. **信任设备**:
   - 手机上点击"信任此电脑"

3. **配置签名**:
   - 打开 `ios/Runner.xcworkspace` 在 Xcode 中
   - 选择 Runner → Signing & Capabilities
   - 选择你的 Apple ID 作为 Team
   - 修改 Bundle Identifier 为唯一值

4. **运行应用**:
   ```bash
   flutter run -d <device_id>
   ```

## 发布到应用商店

### Android - Google Play 商店

#### 1. 准备发布版本

```bash
# 生成密钥库
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA \
  -keysize 2048 -validity 10000 -alias upload

# 配置签名
```

在 `android/key.properties` 创建文件：
```
storePassword=<密钥库密码>
keyPassword=<密钥密码>
keyAlias=upload
storeFile=<密钥库路径>/upload-keystore.jks
```

#### 2. 修改 `android/app/build.gradle`:

在 `android` 块之前添加：
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.withReader('UTF-8') { reader ->
        keystoreProperties.load(reader)
    }
}
```

在 `android` 块内添加签名配置：
```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
        storePassword keystoreProperties['storePassword']
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

#### 3. 构建 APK/AAB

```bash
# 构建 APK
flutter build apk --release

# 构建 AAB (推荐用于 Google Play)
flutter build appbundle --release
```

#### 4. 发布到 Google Play

1. 访问 [Google Play Console](https://play.google.com/console)
2. 创建新应用
3. 填写应用信息
4. 上传 AAB 文件 (`build/app/outputs/bundle/release/app-release.aab`)
5. 设置定价和分发
6. 提交审核

---

### 国内应用商店发布（推荐）

由于国内无法访问 Google Play，建议发布到以下平台：

#### 华为应用市场

**1. 注册开发者账号**
- 访问 [华为开发者联盟](https://developer.huawei.com/)
- 注册企业或个人开发者账号（需实名认证）

**2. 准备材料**
- 应用 APK 文件
- 应用图标（512x512 PNG）
- 应用截图（3-5张，1080x1920）
- 应用介绍文案
- 隐私政策链接

**3. 发布步骤**
```bash
# 构建华为版本 APK
flutter build apk --release --target-platform android-arm64
```

1. 登录 [AppGallery Connect](https://developer.huawei.com/consumer/cn/service/josp/agc/index.html)
2. 点击"我的应用" → "新建"
3. 填写应用名称、分类、标签
4. 上传 APK 文件
5. 填写应用信息（名称、介绍、截图等）
6. 配置隐私政策和服务协议
7. 提交审核（通常1-3个工作日）

**4. 注意事项**
- 华为需要《软件著作权》或《应用免责函》
- 涉及隐私权限需详细说明用途
- 应用内不能包含Google服务相关内容

---

#### 腾讯应用宝

**1. 注册开发者账号**
- 访问 [腾讯开放平台](https://open.tencent.com/)
- 注册开发者账号并完成认证

**2. 准备材料**
- 应用 APK 文件
- 应用图标（512x512 PNG）
- 应用截图（3-5张，竖屏 1080x1920）
- 应用介绍（30-1000字）
- 更新说明
- 隐私政策链接

**3. 发布步骤**
```bash
# 构建应用宝版本 APK
flutter build apk --release
```

1. 登录 [腾讯开放平台](https://open.tencent.com/)
2. 进入"应用管理" → "创建应用"
3. 选择应用类型（Android 应用）
4. 上传 APK 文件
5. 填写应用信息：
   - 应用名称
   - 应用分类
   - 应用标签
   - 应用介绍
   - 更新日志
6. 上传应用图标和截图
7. 配置隐私政策 URL
8. 提交审核（通常1-3个工作日）

**4. 注意事项**
- 应用名称需与安装包内名称一致
- 应用图标需清晰，无白边
- 截图需展示应用实际界面
- 涉及敏感权限需提供说明

---

#### 其他国内应用商店

| 应用商店 | 开发者平台 | 特点 |
|---------|-----------|------|
| 小米应用商店 | [小米开放平台](https://dev.mi.com/) | 小米手机预装，用户量大 |
| OPPO/vivo 应用商店 | [OPPO 开放平台](https://open.oppomobile.com/) / [vivo 开放平台](https://dev.vivo.com.cn/) | 线下渠道强 |
| 百度手机助手 | [百度移动应用平台](https://app.baidu.com/) | 搜索流量支持 |
| 360 手机助手 | [360 移动开放平台](http://dev.360.cn/) | 安全品牌认知 |
| 阿里应用分发 | [阿里应用分发](http://open.uc.cn/) | 豌豆荚、PP助手等整合 |

**建议发布顺序：**
1. 华为应用市场（高端用户）
2. 腾讯应用宝（社交用户）
3. 小米/OPPO/vivo（覆盖主流品牌）
4. 其他平台（补充流量）

---

### iOS - App Store

#### 1. 准备发布版本

```bash
flutter build ios --release
```

#### 2. 在 Xcode 中归档

1. 打开 `ios/Runner.xcworkspace`
2. 选择 Product → Scheme → Runner
3. 选择 Product → Destination → Any iOS Device
4. 选择 Product → Archive

#### 3. 上传到 App Store

1. 在 Organizer 中选择归档
2. 点击 "Distribute App"
3. 选择 "App Store Connect"
4. 选择 "Upload"
5. 按照向导完成上传

#### 4. 在 App Store Connect 配置

1. 访问 [App Store Connect](https://appstoreconnect.apple.com)
2. 选择你的应用
3. 填写应用信息、截图、描述
4. 提交审核

## 注意事项

### Android 通知权限

Android 13+ 需要请求通知权限，应用已自动处理。

### iOS 通知权限

首次启动时会请求通知权限，请允许以确保提醒功能正常。

### 精确闹钟权限

Android 12+ 需要 `SCHEDULE_EXACT_ALARM` 权限，已在 AndroidManifest.xml 中声明。

## 常见问题

### Q: 通知不响铃？
- Android: 检查通知权限和勿扰模式
- iOS: 检查通知权限和静音开关

### Q: 数据库数据丢失？
应用数据存储在本地，卸载应用会清除数据。

### Q: 如何备份数据？
当前版本暂不支持云备份，建议定期导出重要事项。

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎反馈！

---

祝您使用愉快，新春快乐！🎊
