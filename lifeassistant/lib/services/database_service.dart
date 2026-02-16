import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/todo_item.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  Database? _database;
  SharedPreferences? _prefs;
  bool _isInitialized = false;
  bool _useWebStorage = false;

  Future<void> _init() async {
    if (_isInitialized) return;

    try {
      if (kIsWeb) {
        // Web 平台使用 SharedPreferences
        _useWebStorage = true;
        _prefs = await SharedPreferences.getInstance();
        debugPrint('DatabaseService: 使用 Web 存储 (SharedPreferences)');
      } else {
        // 移动端使用标准 SQLite
        final databasesPath = await getDatabasesPath();
        final path = join(databasesPath, 'lifeassistant.db');
        debugPrint('DatabaseService: 数据库路径 = $path');
        
        _database = await openDatabase(
          path,
          version: 1,
          onCreate: _onCreate,
          onOpen: (db) {
            debugPrint('DatabaseService: 数据库已打开');
          },
        );
        debugPrint('DatabaseService: 使用 SQLite 数据库');
      }
      _isInitialized = true;
    } catch (e, stackTrace) {
      debugPrint('DatabaseService: 初始化失败 - $e');
      debugPrint('DatabaseService: 堆栈 - $stackTrace');
      rethrow;
    }
  }

  Future<void> _onCreate(Database db, int version) async {
    debugPrint('DatabaseService: 创建数据库表');
    await db.execute('''
      CREATE TABLE todo_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        reminderTime TEXT NOT NULL,
        isCompleted INTEGER NOT NULL DEFAULT 0,
        isAcknowledged INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        reminderInterval INTEGER NOT NULL DEFAULT 5
      )
    ''');
    debugPrint('DatabaseService: 数据库表创建完成');
  }

  // Web 平台：从 SharedPreferences 获取数据
  List<TodoItem> _getItemsFromPrefs() {
    final String? data = _prefs?.getString('todo_items');
    if (data == null || data.isEmpty) return [];
    
    try {
      final List<dynamic> jsonList = jsonDecode(data);
      return jsonList.map((json) => TodoItem.fromMap(json)).toList();
    } catch (e) {
      debugPrint('Error loading from prefs: $e');
      return [];
    }
  }

  // Web 平台：保存数据到 SharedPreferences
  Future<void> _saveItemsToPrefs(List<TodoItem> items) async {
    final String data = jsonEncode(items.map((item) => item.toMap()).toList());
    await _prefs?.setString('todo_items', data);
  }

  // 创建待办事项
  Future<int> insertTodoItem(TodoItem item) async {
    debugPrint('DatabaseService: 开始插入待办事项 - ${item.title}');
    await _init();
    
    try {
      if (_useWebStorage) {
        final items = _getItemsFromPrefs();
        final newId = items.isEmpty ? 1 : items.map((i) => i.id ?? 0).reduce((a, b) => a > b ? a : b) + 1;
        final newItem = item.copyWith(id: newId);
        items.add(newItem);
        await _saveItemsToPrefs(items);
        debugPrint('DatabaseService: Web 存储插入成功，ID = $newId');
        return newId;
      } else {
        final map = item.toMap();
        debugPrint('DatabaseService: 插入数据 - $map');
        final id = await _database!.insert('todo_items', map);
        debugPrint('DatabaseService: SQLite 插入成功，ID = $id');
        return id;
      }
    } catch (e, stackTrace) {
      debugPrint('DatabaseService: 插入失败 - $e');
      debugPrint('DatabaseService: 堆栈 - $stackTrace');
      rethrow;
    }
  }

  // 获取所有待办事项
  Future<List<TodoItem>> getAllTodoItems() async {
    debugPrint('DatabaseService: 开始获取所有待办事项');
    await _init();
    
    try {
      if (_useWebStorage) {
        final items = _getItemsFromPrefs();
        debugPrint('DatabaseService: Web 存储获取到 ${items.length} 条记录');
        return items;
      } else {
        final List<Map<String, dynamic>> maps = await _database!.query(
          'todo_items',
          orderBy: 'reminderTime ASC',
        );
        final items = List.generate(maps.length, (i) => TodoItem.fromMap(maps[i]));
        debugPrint('DatabaseService: SQLite 获取到 ${items.length} 条记录');
        return items;
      }
    } catch (e, stackTrace) {
      debugPrint('DatabaseService: 获取数据失败 - $e');
      debugPrint('DatabaseService: 堆栈 - $stackTrace');
      rethrow;
    }
  }

  // 获取未完成的待办事项
  Future<List<TodoItem>> getPendingTodoItems() async {
    final items = await getAllTodoItems();
    return items.where((item) => !item.isCompleted).toList();
  }

  // 获取即将到期的待办事项
  Future<List<TodoItem>> getUpcomingTodoItems(DateTime before) async {
    final items = await getAllTodoItems();
    return items.where((item) =>
      !item.isCompleted && item.reminderTime.isBefore(before)
    ).toList();
  }

  // 更新待办事项
  Future<int> updateTodoItem(TodoItem item) async {
    await _init();
    
    if (_useWebStorage) {
      final items = _getItemsFromPrefs();
      final index = items.indexWhere((i) => i.id == item.id);
      if (index != -1) {
        items[index] = item;
        await _saveItemsToPrefs(items);
        return 1;
      }
      return 0;
    } else {
      return await _database!.update(
        'todo_items',
        item.toMap(),
        where: 'id = ?',
        whereArgs: [item.id],
      );
    }
  }

  // 删除待办事项
  Future<int> deleteTodoItem(int id) async {
    await _init();
    
    if (_useWebStorage) {
      final items = _getItemsFromPrefs();
      items.removeWhere((i) => i.id == id);
      await _saveItemsToPrefs(items);
      return 1;
    } else {
      return await _database!.delete(
        'todo_items',
        where: 'id = ?',
        whereArgs: [id],
      );
    }
  }

  // 标记为已完成
  Future<int> markAsCompleted(int id) async {
    await _init();
    
    if (_useWebStorage) {
      final items = _getItemsFromPrefs();
      final index = items.indexWhere((i) => i.id == id);
      if (index != -1) {
        items[index] = items[index].copyWith(isCompleted: true);
        await _saveItemsToPrefs(items);
        return 1;
      }
      return 0;
    } else {
      return await _database!.update(
        'todo_items',
        {'isCompleted': 1},
        where: 'id = ?',
        whereArgs: [id],
      );
    }
  }

  // 标记为已确认
  Future<int> markAsAcknowledged(int id) async {
    await _init();
    
    if (_useWebStorage) {
      final items = _getItemsFromPrefs();
      final index = items.indexWhere((i) => i.id == id);
      if (index != -1) {
        items[index] = items[index].copyWith(isAcknowledged: true);
        await _saveItemsToPrefs(items);
        return 1;
      }
      return 0;
    } else {
      return await _database!.update(
        'todo_items',
        {'isAcknowledged': 1},
        where: 'id = ?',
        whereArgs: [id],
      );
    }
  }

  // 关闭数据库连接
  Future<void> close() async {
    if (!_useWebStorage && _database != null) {
      await _database!.close();
      _database = null;
      _isInitialized = false;
    }
  }

  // 清除所有数据（用于重置应用或测试）
  Future<void> clearAllData() async {
    await _init();
    
    try {
      if (_useWebStorage) {
        // Web 平台：清除 SharedPreferences
        await _prefs?.remove('todo_items');
        debugPrint('DatabaseService: Web 存储数据已清除');
      } else {
        // 移动端：删除所有记录
        await _database!.delete('todo_items');
        debugPrint('DatabaseService: SQLite 数据已清除');
      }
    } catch (e) {
      debugPrint('DatabaseService: 清除数据失败 - $e');
      rethrow;
    }
  }

  // 删除数据库文件（彻底重置）
  Future<void> deleteDatabase() async {
    if (_useWebStorage) {
      // Web 平台清除 SharedPreferences
      await _prefs?.clear();
      debugPrint('DatabaseService: Web 存储已清空');
    } else {
      // 移动端删除数据库文件
      if (_database != null) {
        await _database!.close();
        _database = null;
      }
      final databasesPath = await getDatabasesPath();
      final path = join(databasesPath, 'lifeassistant.db');
      await databaseFactory.deleteDatabase(path);
      _isInitialized = false;
      debugPrint('DatabaseService: 数据库文件已删除');
    }
  }
}
