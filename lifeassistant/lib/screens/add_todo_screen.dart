import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_datetime_picker_plus/flutter_datetime_picker_plus.dart' as picker;
import '../providers/todo_provider.dart';
import '../utils/app_theme.dart';

class AddTodoScreen extends StatefulWidget {
  const AddTodoScreen({super.key});

  @override
  State<AddTodoScreen> createState() => _AddTodoScreenState();
}

class _AddTodoScreenState extends State<AddTodoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  
  DateTime _reminderTime = DateTime.now().add(const Duration(hours: 1));
  int _reminderInterval = 5;

  final List<int> _intervalOptions = [1, 3, 5, 10, 15, 30];

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('添加待办事项'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 标题输入
              _buildSectionTitle('待办标题'),
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  hintText: '请输入待办事项标题',
                  prefixIcon: Icon(Icons.title, color: AppTheme.primaryRed),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '请输入标题';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),

              // 描述输入
              _buildSectionTitle('详细描述（可选）'),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  hintText: '请输入详细描述',
                  prefixIcon: Icon(Icons.description, color: AppTheme.primaryRed),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 24),

              // 提醒时间选择
              _buildSectionTitle('提醒时间'),
              _buildTimeSelector(),
              const SizedBox(height: 24),

              // 重复间隔选择
              _buildSectionTitle('重复提醒间隔'),
              _buildIntervalSelector(),
              const SizedBox(height: 32),

              // 提示信息
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.gold.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.gold.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: AppTheme.darkGold),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        '提醒时间到达后，每${_reminderInterval}分钟会重复提醒，直到您确认',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // 提交按钮
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryRed,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    '保存待办事项',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: Colors.black87,
        ),
      ),
    );
  }

  Widget _buildTimeSelector() {
    return InkWell(
      onTap: _selectDateTime,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.lightRed),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryRed.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.calendar_today,
                color: AppTheme.primaryRed,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '提醒时间',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatDateTime(_reminderTime),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.grey),
          ],
        ),
      ),
    );
  }

  Widget _buildIntervalSelector() {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: _intervalOptions.map((interval) {
        final isSelected = _reminderInterval == interval;
        return ChoiceChip(
          label: Text('$interval分钟'),
          selected: isSelected,
          onSelected: (selected) {
            if (selected) {
              setState(() {
                _reminderInterval = interval;
              });
            }
          },
          selectedColor: AppTheme.primaryRed,
          labelStyle: TextStyle(
            color: isSelected ? Colors.white : Colors.black87,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
          backgroundColor: Colors.white,
          side: BorderSide(
            color: isSelected ? AppTheme.primaryRed : Colors.grey.shade300,
          ),
        );
      }).toList(),
    );
  }

  String _formatDateTime(DateTime dateTime) {
    final now = DateTime.now();
    final tomorrow = now.add(const Duration(days: 1));
    
    String dateStr;
    if (dateTime.year == now.year &&
        dateTime.month == now.month &&
        dateTime.day == now.day) {
      dateStr = '今天';
    } else if (dateTime.year == tomorrow.year &&
               dateTime.month == tomorrow.month &&
               dateTime.day == tomorrow.day) {
      dateStr = '明天';
    } else {
      dateStr = '${dateTime.month}月${dateTime.day}日';
    }
    
    return '$dateStr ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  Future<void> _selectDateTime() async {
    picker.DatePicker.showDateTimePicker(
      context,
      showTitleActions: true,
      minTime: DateTime.now(),
      maxTime: DateTime.now().add(const Duration(days: 365)),
      onConfirm: (date) {
        setState(() {
          _reminderTime = date;
        });
      },
      currentTime: _reminderTime,
      locale: picker.LocaleType.zh,
      theme: picker.DatePickerTheme(
        backgroundColor: Colors.white,
        itemStyle: const TextStyle(
          color: Colors.black87,
          fontSize: 18,
        ),
        doneStyle: const TextStyle(
          color: AppTheme.primaryRed,
          fontSize: 16,
          fontWeight: FontWeight.bold,
        ),
        cancelStyle: TextStyle(
          color: Colors.grey.shade600,
          fontSize: 16,
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final provider = context.read<TodoProvider>();
    
    await provider.addTodo(
      title: _titleController.text.trim(),
      description: _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      reminderTime: _reminderTime,
      reminderInterval: _reminderInterval,
    );

    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('待办事项已添加'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }
}
