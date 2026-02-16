import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz_data;
import '../models/todo_item.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;

  Future<void> initialize() async {
    if (_isInitialized) return;

    // Web 平台不支持本地通知
    if (kIsWeb) {
      _isInitialized = true;
      return;
    }

    // 初始化时区数据
    tz_data.initializeTimeZones();

    // Android 初始化设置
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');

    // iOS 初始化设置
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    _isInitialized = true;
    debugPrint('NotificationService: 初始化完成');
  }

  void _onNotificationTap(NotificationResponse response) {
    debugPrint('Notification tapped: ${response.payload}');
  }

  // 请求权限
  Future<bool> requestPermissions() async {
    // Web 平台直接返回 true
    if (kIsWeb) return true;

    if (!_isInitialized) await initialize();

    debugPrint('NotificationService: 请求通知权限...');

    final androidPlugin = _notifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    
    if (androidPlugin != null) {
      final granted = await androidPlugin.requestNotificationsPermission();
      debugPrint('NotificationService: Android 通知权限 = $granted');
      return granted ?? false;
    }

    final iosPermission = await _notifications
        .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(
          alert: true,
          badge: true,
          sound: true,
        );

    debugPrint('NotificationService: iOS 通知权限 = $iosPermission');
    return iosPermission ?? false;
  }

  // 检查权限状态
  Future<bool> checkPermissions() async {
    if (kIsWeb) return true;
    if (!_isInitialized) await initialize();

    final androidPlugin = _notifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    
    if (androidPlugin != null) {
      final enabled = await androidPlugin.areNotificationsEnabled();
      debugPrint('NotificationService: 通知是否启用 = $enabled');
      return enabled ?? false;
    }
    
    return true;
  }

  // 安排待办事项提醒
  Future<void> scheduleTodoReminder(TodoItem todo) async {
    // Web 平台不支持通知
    if (kIsWeb) return;

    if (!_isInitialized) await initialize();

    // 检查权限
    final hasPermission = await checkPermissions();
    if (!hasPermission) {
      debugPrint('NotificationService: 没有通知权限，无法安排提醒');
      return;
    }

    debugPrint('NotificationService: 安排提醒 - ${todo.title}，时间：${todo.reminderTime}');

    // 检查提醒时间是否已经过去
    final now = DateTime.now();
    if (todo.reminderTime.isBefore(now)) {
      debugPrint('NotificationService: 提醒时间已过去，立即显示通知');
      await _showImmediateNotification(todo);
      return;
    }

    final androidDetails = AndroidNotificationDetails(
      'todo_reminder_channel',
      '待办事项提醒',
      channelDescription: '提醒您即将到期的待办事项',
      importance: Importance.high,
      priority: Priority.high,
      enableVibration: true,
      vibrationPattern: Int64List.fromList([0, 1000, 500, 1000]),
      ongoing: true,
      autoCancel: false,
      fullScreenIntent: true,
      category: AndroidNotificationCategory.alarm,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      interruptionLevel: InterruptionLevel.timeSensitive,
    );

    final notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    try {
      // 安排精确提醒
      await _notifications.zonedSchedule(
        todo.id ?? DateTime.now().millisecond,
        '🧧 生活助手提醒',
        '待办事项：${todo.title}',
        tz.TZDateTime.from(todo.reminderTime, tz.local),
        notificationDetails,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        payload: todo.id.toString(),
      );
      debugPrint('NotificationService: 提醒安排成功');

      // 如果用户未确认，安排重复提醒
      await _scheduleRepeatingReminder(todo);
    } catch (e, stackTrace) {
      debugPrint('NotificationService: 安排提醒失败 - $e');
      debugPrint('NotificationService: 堆栈 - $stackTrace');
    }
  }

  // 立即显示通知（用于测试或过期提醒）
  Future<void> _showImmediateNotification(TodoItem todo) async {
    final androidDetails = AndroidNotificationDetails(
      'todo_reminder_channel',
      '待办事项提醒',
      channelDescription: '提醒您即将到期的待办事项',
      importance: Importance.high,
      priority: Priority.high,
      enableVibration: true,
      vibrationPattern: Int64List.fromList([0, 1000, 500, 1000]),
      ongoing: true,
      autoCancel: false,
      fullScreenIntent: true,
      category: AndroidNotificationCategory.alarm,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      interruptionLevel: InterruptionLevel.timeSensitive,
    );

    final notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      todo.id ?? DateTime.now().millisecond,
      '🧧 生活助手提醒（已到期）',
      '待办事项：${todo.title}',
      notificationDetails,
      payload: todo.id.toString(),
    );
  }

  // 安排重复提醒
  Future<void> _scheduleRepeatingReminder(TodoItem todo) async {
    if (kIsWeb || todo.isAcknowledged) return;

    final repeatTime = todo.reminderTime.add(
      Duration(minutes: todo.reminderInterval),
    );

    // 检查重复提醒时间是否已经过去
    final now = DateTime.now();
    if (repeatTime.isBefore(now)) {
      debugPrint('NotificationService: 重复提醒时间已过去，跳过');
      return;
    }

    final androidDetails = AndroidNotificationDetails(
      'todo_repeat_channel',
      '重复提醒',
      channelDescription: '待办事项的重复提醒',
      importance: Importance.high,
      priority: Priority.high,
      enableVibration: true,
      vibrationPattern: Int64List.fromList([0, 1000, 500, 1000]),
      ongoing: true,
      autoCancel: false,
      fullScreenIntent: true,
      category: AndroidNotificationCategory.alarm,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      interruptionLevel: InterruptionLevel.timeSensitive,
    );

    final notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    try {
      await _notifications.zonedSchedule(
        (todo.id ?? 0) + 1000000, // 使用不同的 ID
        '🧧 生活助手提醒（重复）',
        '待办事项：${todo.title} - 请确认',
        tz.TZDateTime.from(repeatTime, tz.local),
        notificationDetails,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        payload: todo.id.toString(),
      );
      debugPrint('NotificationService: 重复提醒安排成功，时间：$repeatTime');
    } catch (e) {
      debugPrint('NotificationService: 安排重复提醒失败 - $e');
    }
  }

  // 取消提醒
  Future<void> cancelReminder(int id) async {
    if (kIsWeb) return;
    await _notifications.cancel(id);
    await _notifications.cancel(id + 1000000); // 取消重复提醒
    debugPrint('NotificationService: 取消提醒 ID = $id');
  }

  // 取消所有提醒
  Future<void> cancelAllReminders() async {
    if (kIsWeb) return;
    await _notifications.cancelAll();
    debugPrint('NotificationService: 取消所有提醒');
  }

  // 立即显示测试通知
  Future<void> showTestNotification() async {
    if (kIsWeb) return;
    
    if (!_isInitialized) await initialize();

    final hasPermission = await checkPermissions();
    if (!hasPermission) {
      debugPrint('NotificationService: 没有通知权限，无法显示测试通知');
      return;
    }

    final androidDetails = AndroidNotificationDetails(
      'todo_test_channel',
      '测试通知',
      channelDescription: '测试通知功能',
      importance: Importance.high,
      priority: Priority.high,
      enableVibration: true,
      vibrationPattern: Int64List.fromList([0, 1000, 500, 1000]),
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      0,
      '🧧 生活助手测试',
      '通知功能正常工作！',
      notificationDetails,
    );
    debugPrint('NotificationService: 测试通知已发送');
  }
}
