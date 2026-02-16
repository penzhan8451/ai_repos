class TodoItem {
  final int? id;
  final String title;
  final String? description;
  final DateTime reminderTime;
  final bool isCompleted;
  final bool isAcknowledged;
  final DateTime createdAt;
  final int reminderInterval; // 提醒间隔（分钟）

  TodoItem({
    this.id,
    required this.title,
    this.description,
    required this.reminderTime,
    this.isCompleted = false,
    this.isAcknowledged = false,
    required this.createdAt,
    this.reminderInterval = 5,
  });

  TodoItem copyWith({
    int? id,
    String? title,
    String? description,
    DateTime? reminderTime,
    bool? isCompleted,
    bool? isAcknowledged,
    DateTime? createdAt,
    int? reminderInterval,
  }) {
    return TodoItem(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      reminderTime: reminderTime ?? this.reminderTime,
      isCompleted: isCompleted ?? this.isCompleted,
      isAcknowledged: isAcknowledged ?? this.isAcknowledged,
      createdAt: createdAt ?? this.createdAt,
      reminderInterval: reminderInterval ?? this.reminderInterval,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'reminderTime': reminderTime.toIso8601String(),
      'isCompleted': isCompleted ? 1 : 0,
      'isAcknowledged': isAcknowledged ? 1 : 0,
      'createdAt': createdAt.toIso8601String(),
      'reminderInterval': reminderInterval,
    };
  }

  factory TodoItem.fromMap(Map<String, dynamic> map) {
    return TodoItem(
      id: map['id'] as int?,
      title: map['title'] as String,
      description: map['description'] as String?,
      reminderTime: DateTime.parse(map['reminderTime'] as String),
      isCompleted: map['isCompleted'] == 1,
      isAcknowledged: map['isAcknowledged'] == 1,
      createdAt: DateTime.parse(map['createdAt'] as String),
      reminderInterval: map['reminderInterval'] as int? ?? 5,
    );
  }

  @override
  String toString() {
    return 'TodoItem(id: $id, title: $title, reminderTime: $reminderTime, isCompleted: $isCompleted)';
  }
}
