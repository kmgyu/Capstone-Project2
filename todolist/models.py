from django.db import models
from fieldmanage.models import FieldInfo  # field_info 테이블과 연결되는 모델이 여기에 정의

class FieldTodo(models.Model):
    task_id = models.AutoField(primary_key=True)
    field = models.ForeignKey(FieldInfo, on_delete=models.CASCADE, db_column='field_id')
    task_name = models.CharField(max_length=255)
    task_content = models.TextField(blank=True, null=True)
    cycle = models.IntegerField(blank=True, null=True)
    start_date = models.DateTimeField(blank=True, null=True)
    period = models.IntegerField(blank=True, null=True)
    is_tmp = models.BooleanField(default=False)

    class Meta:
        db_table = 'field_todo'

    def __str__(self):
        return self.task_name
