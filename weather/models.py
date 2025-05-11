from django.db import models

class Weather(models.Model):
    region_name = models.CharField(max_length=100)
    date = models.DateField()
    weather = models.CharField(max_length=50)
    temperature = models.FloatField()
    precipitation = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('region_name', 'date')
        db_table = 'weather_info'

    def __str__(self):
        return f"{self.region_name} - {self.date}"
