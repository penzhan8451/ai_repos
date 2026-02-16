import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/todo_provider.dart';
import '../models/todo_item.dart';
import '../utils/app_theme.dart';
import 'add_todo_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppTheme.darkRed,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const SettingsScreen()),
            ),
          ),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          // 春节主题头部
          SliverToBoxAdapter(
            child: _buildSpringFestivalHeader(context),
          ),
          
          // 统计卡片
          SliverToBoxAdapter(
            child: _buildStatisticsCards(context),
          ),
          
          // 待办事项列表标题
          SliverToBoxAdapter(
            child: _buildSectionTitle(context, '待办事项'),
          ),
          
          // 待办事项列表
          Consumer<TodoProvider>(
            builder: (context, provider, child) {
              if (provider.isLoading) {
                return const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                );
              }

              final pendingTodos = provider.pendingTodos;

              if (pendingTodos.isEmpty) {
                return SliverFillRemaining(
                  child: _buildEmptyState(context),
                );
              }

              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final todo = pendingTodos[index];
                    return _buildTodoCard(context, todo);
                  },
                  childCount: pendingTodos.length,
                ),
              );
            },
          ),
          
          // 底部间距
          const SliverToBoxAdapter(
            child: SizedBox(height: 80),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddTodoScreen(context),
        icon: const Icon(Icons.add),
        label: const Text('添加待办'),
      ),
    );
  }

  // 春节主题头部
  Widget _buildSpringFestivalHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppTheme.darkRed, AppTheme.primaryRed],
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            // 装饰元素
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildDecorationIcon(Icons.auto_awesome, AppTheme.gold),
                const SizedBox(width: 16),
                const Column(
                  children: [
                    Text(
                      '🧧 生活助手 🧧',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      '重要的事要提醒',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppTheme.gold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 16),
                _buildDecorationIcon(Icons.auto_awesome, AppTheme.gold),
              ],
            ),
            const SizedBox(height: 24),
            // 当前日期
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                DateFormat('yyyy年MM月dd日 EEEE', 'zh_CN').format(DateTime.now()),
                style: const TextStyle(
                  fontSize: 16,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDecorationIcon(IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.3),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, color: color, size: 20),
    );
  }

  // 统计卡片
  Widget _buildStatisticsCards(BuildContext context) {
    return Consumer<TodoProvider>(
      builder: (context, provider, child) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  '待办',
                  provider.pendingTodos.length.toString(),
                  Icons.pending_actions,
                  AppTheme.primaryRed,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  '今日',
                  provider.upcomingTodos.length.toString(),
                  Icons.today,
                  AppTheme.darkGold,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  '已完成',
                  provider.completedTodos.length.toString(),
                  Icons.check_circle,
                  Colors.green,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 区块标题
  Widget _buildSectionTitle(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 24,
            decoration: BoxDecoration(
              color: AppTheme.primaryRed,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  // 空状态
  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.celebration,
            size: 80,
            color: AppTheme.gold,
          ),
          const SizedBox(height: 16),
          const Text(
            '暂无待办事项',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '点击右下角按钮添加新的待办',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  // 待办卡片
  Widget _buildTodoCard(BuildContext context, TodoItem todo) {
    final now = DateTime.now();
    final isOverdue = todo.reminderTime.isBefore(now);
    final isToday = todo.reminderTime.year == now.year &&
        todo.reminderTime.month == now.month &&
        todo.reminderTime.day == now.day;

    Color statusColor = AppTheme.primaryRed;
    String statusText = '';
    
    if (isOverdue) {
      statusColor = Colors.red;
      statusText = '已逾期';
    } else if (isToday) {
      statusColor = AppTheme.darkGold;
      statusText = '今天';
    }

    return Dismissible(
      key: Key(todo.id.toString()),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: Colors.red,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) {
        context.read<TodoProvider>().deleteTodo(todo.id!);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('待办事项已删除')),
        );
      },
      child: Card(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          leading: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isOverdue ? Icons.error : Icons.notifications,
              color: statusColor,
            ),
          ),
          title: Text(
            todo.title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (todo.description != null && todo.description!.isNotEmpty)
                Text(
                  todo.description!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade600,
                  ),
                ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.access_time,
                    size: 14,
                    color: statusColor,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    DateFormat('MM-dd HH:mm').format(todo.reminderTime),
                    style: TextStyle(
                      fontSize: 13,
                      color: statusColor,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (statusText.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        statusText,
                        style: TextStyle(
                          fontSize: 11,
                          color: statusColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: const Icon(Icons.check_circle_outline, color: Colors.green),
                onPressed: () {
                  context.read<TodoProvider>().markAsCompleted(todo.id!);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('恭喜完成一项任务！')),
                  );
                },
              ),
            ],
          ),
          onTap: () => _showTodoDetail(context, todo),
        ),
      ),
    );
  }

  // 显示添加待办页面
  void _showAddTodoScreen(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const AddTodoScreen()),
    );
  }

  // 显示待办详情
  void _showTodoDetail(BuildContext context, TodoItem todo) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              todo.title,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (todo.description != null && todo.description!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                todo.description!,
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey.shade700,
                ),
              ),
            ],
            const SizedBox(height: 16),
            _buildDetailRow(
              Icons.access_time,
              '提醒时间',
              DateFormat('yyyy年MM月dd日 HH:mm').format(todo.reminderTime),
            ),
            _buildDetailRow(
              Icons.repeat,
              '重复间隔',
              '${todo.reminderInterval}分钟',
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      context.read<TodoProvider>().markAsCompleted(todo.id!);
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('恭喜完成一项任务！')),
                      );
                    },
                    icon: const Icon(Icons.check),
                    label: const Text('标记完成'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      context.read<TodoProvider>().deleteTodo(todo.id!);
                      Navigator.pop(context);
                    },
                    icon: const Icon(Icons.delete, color: Colors.red),
                    label: const Text('删除', style: TextStyle(color: Colors.red)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.red),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey),
          const SizedBox(width: 8),
          Text(
            '$label：',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
