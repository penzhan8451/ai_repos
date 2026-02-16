import 'package:flutter/foundation.dart';
import '../models/todo_item.dart';
import '../services/database_service.dart';
import '../services/notification_service.dart';

class TodoProvider extends ChangeNotifier {
  final DatabaseService _database = DatabaseService();
  final NotificationService _notification = NotificationService();

  List<TodoItem> _todos = [];
  bool _isLoading = false;
  String? _error;

  List<TodoItem> get todos => _todos;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // 获取未完成的待办事项
  List<TodoItem> get pendingTodos =>
      _todos.where((todo) => !todo.isCompleted).toList();

  // 获取已完成的待办事项
  List<TodoItem> get completedTodos =>
      _todos.where((todo) => todo.isCompleted).toList();

  // 获取即将到期的待办事项（未来24小时内）
  List<TodoItem> get upcomingTodos {
    final now = DateTime.now();
    final tomorrow = now.add(const Duration(days: 1));
    return _todos
        .where((todo) =>
            !todo.isCompleted &&
            todo.reminderTime.isAfter(now) &&
            todo.reminderTime.isBefore(tomorrow))
        .toList();
  }

  // 初始化
  Future<void> initialize() async {
    await _notification.initialize();
    await _notification.requestPermissions();
    await loadTodos();
  }

  // 加载所有待办事项
  Future<void> loadTodos() async {
    _setLoading(true);
    try {
      _todos = await _database.getAllTodoItems();
      _error = null;
    } catch (e) {
      _error = '加载待办事项失败: $e';
    } finally {
      _setLoading(false);
    }
  }

  // 添加待办事项
  Future<void> addTodo({
    required String title,
    String? description,
    required DateTime reminderTime,
    int reminderInterval = 5,
  }) async {
    debugPrint('TodoProvider: 开始添加待办事项 - $title');
    _setLoading(true);
    try {
      final todo = TodoItem(
        title: title,
        description: description,
        reminderTime: reminderTime,
        createdAt: DateTime.now(),
        reminderInterval: reminderInterval,
      );
      debugPrint('TodoProvider: 创建待办事项对象成功');

      final id = await _database.insertTodoItem(todo);
      debugPrint('TodoProvider: 数据库插入成功，ID = $id');
      
      final newTodo = todo.copyWith(id: id);

      // 安排提醒
      try {
        await _notification.scheduleTodoReminder(newTodo);
        debugPrint('TodoProvider: 提醒设置成功');
      } catch (e) {
        debugPrint('TodoProvider: 提醒设置失败（非关键错误）: $e');
      }

      _todos.add(newTodo);
      _todos.sort((a, b) => a.reminderTime.compareTo(b.reminderTime));
      _error = null;
      debugPrint('TodoProvider: 待办事项列表更新完成，共 ${_todos.length} 条');
      notifyListeners();
      debugPrint('TodoProvider: 通知监听器完成');
    } catch (e, stackTrace) {
      debugPrint('TodoProvider: 添加待办事项失败 - $e');
      debugPrint('TodoProvider: 堆栈 - $stackTrace');
      _error = '添加待办事项失败: $e';
    } finally {
      _setLoading(false);
    }
  }

  // 更新待办事项
  Future<void> updateTodo(TodoItem todo) async {
    _setLoading(true);
    try {
      await _database.updateTodoItem(todo);

      // 重新安排提醒
      await _notification.cancelReminder(todo.id!);
      if (!todo.isCompleted) {
        await _notification.scheduleTodoReminder(todo);
      }

      final index = _todos.indexWhere((t) => t.id == todo.id);
      if (index != -1) {
        _todos[index] = todo;
        notifyListeners();
      }
      _error = null;
    } catch (e) {
      _error = '更新待办事项失败: $e';
    } finally {
      _setLoading(false);
    }
  }

  // 标记为已完成
  Future<void> markAsCompleted(int id) async {
    try {
      await _database.markAsCompleted(id);
      await _notification.cancelReminder(id);

      final index = _todos.indexWhere((t) => t.id == id);
      if (index != -1) {
        _todos[index] = _todos[index].copyWith(isCompleted: true);
        notifyListeners();
      }
    } catch (e) {
      _error = '标记完成失败: $e';
    }
  }

  // 标记为已确认（停止重复提醒）
  Future<void> markAsAcknowledged(int id) async {
    try {
      await _database.markAsAcknowledged(id);
      await _notification.cancelReminder(id);

      final index = _todos.indexWhere((t) => t.id == id);
      if (index != -1) {
        _todos[index] = _todos[index].copyWith(isAcknowledged: true);
        notifyListeners();
      }
    } catch (e) {
      _error = '确认失败: $e';
    }
  }

  // 删除待办事项
  Future<void> deleteTodo(int id) async {
    try {
      await _database.deleteTodoItem(id);
      await _notification.cancelReminder(id);

      _todos.removeWhere((t) => t.id == id);
      notifyListeners();
    } catch (e) {
      _error = '删除失败: $e';
    }
  }

  // 测试通知
  Future<void> testNotification() async {
    await _notification.showTestNotification();
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _database.close();
    super.dispose();
  }
}
