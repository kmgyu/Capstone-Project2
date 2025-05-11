from datetime import timedelta
from .models import TaskProgress, FieldTodo

def create_task_progress_entries(task: FieldTodo):
    if not task.start_date or not task.period:
        return

    for i in range(task.period):
        date = (task.start_date + timedelta(days=i)).date()
        TaskProgress.objects.get_or_create(
            task_id=task,
            date=date,
            defaults={'status': 'skip'}
        )
