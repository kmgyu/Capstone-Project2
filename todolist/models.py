from django.db import models
from django.contrib.auth import get_user_model
from fieldmanage.models import Field  # field_info 테이블과 연결되는 모델이 여기에 정의


User = get_user_model()

class FieldTodo(models.Model):
    task_id = models.AutoField(primary_key=True)
    owner = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name='todos', db_column='owner_id')
    field = models.ForeignKey(Field, on_delete=models.CASCADE, db_column='field_id')  # 어떤 노지의 할 일인지
    task_name = models.CharField(max_length=255)
    task_content = models.TextField(blank=True, null=True)
    priority = models.PositiveSmallIntegerField(default=3)
    cycle = models.IntegerField(blank=True, null=True)
    start_date = models.DateTimeField()
    period = models.IntegerField(blank=True, null=True)
    is_pest = models.BooleanField(default=False)

    class Meta:
        db_table = 'field_todo'

    def __str__(self):
        return self.task_name


class TaskProgress(models.Model):
    progress_id = models.AutoField(primary_key=True)
    task_id = models.ForeignKey(FieldTodo, on_delete=models.CASCADE, db_column='task_id', related_name="progresses")
    date = models.DateField() # 수행 여부를 기록한 날짜
    status = models.CharField(max_length=10, choices=[('done', '완료'), ('skip', '미수행')], default='done')

    class Meta:
        db_table = 'task_progress'
        unique_together = ('task_id', 'date')

    def __str__(self):
        return f"{self.task_id.task_name} - {self.date} ({self.status})"


