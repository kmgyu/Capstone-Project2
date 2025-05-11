from django.db import models

class Weather(models.Model):
    region_name = models.CharField(max_length=100)
    date = models.DateField()
    weather = models.CharField(max_length=50, blank=True, default="정보없음")  # ✅ null 방지용 기본값 설정
    temperature = models.FloatField()
    precipitation = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('region_name', 'date')
        db_table = 'weather_info'

    def __str__(self):
        return f"{self.region_name} - {self.date}"