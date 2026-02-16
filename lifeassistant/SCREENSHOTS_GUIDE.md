# 生活助手 - 应用截图指南

## 📱 截图要求

### 应用商店截图规范

| 平台 | 尺寸要求 | 数量 | 格式 |
|------|----------|------|------|
| **华为应用市场** | 1080x1920 或 1920x1080 | 3-5张 | JPG/PNG |
| **腾讯应用宝** | 1080x1920 | 3-5张 | JPG/PNG |
| **小米应用商店** | 1080x1920 | 3-8张 | JPG/PNG |
| **OPPO/vivo** | 1080x1920 | 3-5张 | JPG/PNG |

### 推荐截图内容

#### 截图1：首页/主界面
- **内容**：展示待办事项列表页面
- **要点**：
  - 显示春节主题头部
  - 展示多个待办事项示例
  - 包含不同状态的待办（待完成、已完成）
  - 展示悬浮添加按钮

#### 截图2：添加待办事项
- **内容**：展示添加待办事项的弹窗/页面
- **要点**：
  - 标题输入框
  - 描述输入框
  - 日期时间选择器
  - 保存按钮

#### 截图3：提醒通知
- **内容**：展示系统通知提醒
- **要点**：
  - 待办事项到期提醒
  - 通知内容清晰
  - 展示重复提醒功能

#### 截图4：设置页面
- **内容**：展示应用设置界面
- **要点**：
  - 测试通知功能
  - 清除数据选项
  - 关于信息

#### 截图5：空状态/引导页
- **内容**：展示无待办事项时的界面
- **要点**：
  - 友好的空状态提示
  - 引导用户添加第一条待办

## 📸 截图步骤

### 方法一：使用 Android Studio

1. 连接 Android 设备或启动模拟器
2. 运行应用：`flutter run`
3. 在 Android Studio 中打开 "Logcat" 窗口
4. 点击相机图标截图
5. 保存到指定目录

### 方法二：使用 ADB 命令

```bash
# 截图并保存到设备
adb shell screencap -p /sdcard/screenshot1.png

# 拉取到电脑
adb pull /sdcard/screenshot1.png ./screenshots/
```

### 方法三：使用设备自带截图

- **Android**：同时按住电源键 + 音量减键
- 在相册中找到截图，传输到电脑

## 🎨 截图美化建议

### 设备框架
- 使用带设备框架的截图更显专业
- 推荐工具：
  - [Screenshot Builder](https://screenshotbuilder.com/)
  - [MockUPhone](https://mockuphone.com/)
  - [AppLaunchpad](https://theapplaunchpad.com/)

### 文字标注
- 可在截图上添加简短文字说明
- 使用箭头指向关键功能
- 保持文字简洁，突出卖点

### 配色建议
- 与应用的春节主题保持一致
- 使用红色、金色为主色调
- 文字使用白色或黑色，确保可读性

## 📁 文件命名规范

```
screenshots/
├── screenshot_01_home.png          # 首页
├── screenshot_02_add_todo.png      # 添加待办
├── screenshot_03_notification.png  # 提醒通知
├── screenshot_04_settings.png      # 设置页面
├── screenshot_05_empty_state.png   # 空状态
└── feature_graphic.png             # 特色图片（横幅）
```

## ✨ 特色图片（Feature Graphic）

### 用途
- 应用商店详情页顶部横幅
- Google Play 必需

### 规格
- **尺寸**：1024x500 像素
- **格式**：JPG 或 PNG
- **内容**：展示应用核心功能和品牌

### 设计建议
- 左侧放置应用名称和标语
- 右侧展示应用界面预览
- 使用春节红色背景
- 添加金色装饰元素

## 📋 截图检查清单

提交前请确认：

- [ ] 截图清晰，无模糊
- [ ] 无状态栏干扰（可使用沉浸模式）
- [ ] 展示真实内容，非空白页面
- [ ] 文字可读，字体清晰
- [ ] 符合各平台尺寸要求
- [ ] 文件大小适中（单张不超过 2MB）

## 🚀 快速生成截图

### 使用 Flutter 集成测试生成截图

```dart
// 在 test/screenshot_test.dart 中添加
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:screenshot/screenshot.dart';

void main() {
  testWidgets('Screenshot home page', (WidgetTester tester) async {
    await tester.pumpWidget(MyApp());
    await tester.pumpAndSettle();
    
    // 截取首页
    await screenshot(
      tester,
      'screenshot_home',
    );
  });
}
```

---

**提示**：建议在真实设备上截图，效果比模拟器更好。

**生活助手开发团队**
**最后更新：2026年2月15日**
