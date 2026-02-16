import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/todo_provider.dart';
import '../services/database_service.dart';
import '../services/notification_service.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('设置'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        children: [
          // 测试通知
          ListTile(
            leading: const Icon(Icons.notifications_active, color: Colors.orange),
            title: const Text('测试通知'),
            subtitle: const Text('立即发送一条测试通知'),
            onTap: () async {
              final notification = NotificationService();
              await notification.showTestNotification();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('测试通知已发送')),
                );
              }
            },
          ),
          const Divider(),
          
          // 清除所有数据
          ListTile(
            leading: const Icon(Icons.delete_forever, color: Colors.red),
            title: const Text('清除所有数据'),
            subtitle: const Text('删除所有待办事项，不可恢复'),
            onTap: () => _showClearDataDialog(context),
          ),
          const Divider(),
          
          // 重置数据库
          ListTile(
            leading: const Icon(Icons.restore, color: Colors.redAccent),
            title: const Text('重置数据库'),
            subtitle: const Text('彻底删除数据库文件，重新初始化'),
            onTap: () => _showResetDatabaseDialog(context),
          ),
          const Divider(),
          
          // 关于
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('关于'),
            subtitle: Text('生活助手 v1.0.0'),
          ),
        ],
      ),
    );
  }

  // 显示清除数据确认对话框
  void _showClearDataDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认清除'),
        content: const Text('确定要清除所有待办事项吗？此操作不可恢复。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await _clearAllData(context);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('清除'),
          ),
        ],
      ),
    );
  }

  // 显示重置数据库确认对话框
  void _showResetDatabaseDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认重置'),
        content: const Text('确定要重置数据库吗？这将删除所有数据并重新初始化。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await _resetDatabase(context);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('重置'),
          ),
        ],
      ),
    );
  }

  // 清除所有数据
  Future<void> _clearAllData(BuildContext context) async {
    try {
      final database = DatabaseService();
      
      // 取消所有通知
      final notification = NotificationService();
      await notification.cancelAllReminders();
      
      // 清除数据
      await database.clearAllData();
      
      // 刷新 Provider
      if (context.mounted) {
        final provider = Provider.of<TodoProvider>(context, listen: false);
        await provider.loadTodos();
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('所有数据已清除')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('清除失败: $e')),
        );
      }
    }
  }

  // 重置数据库
  Future<void> _resetDatabase(BuildContext context) async {
    try {
      final database = DatabaseService();
      
      // 取消所有通知
      final notification = NotificationService();
      await notification.cancelAllReminders();
      
      // 删除数据库
      await database.deleteDatabase();
      
      // 刷新 Provider
      if (context.mounted) {
        final provider = Provider.of<TodoProvider>(context, listen: false);
        await provider.loadTodos();
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('数据库已重置')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('重置失败: $e')),
        );
      }
    }
  }
}
