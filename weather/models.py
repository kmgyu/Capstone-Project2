from django.db import models

class Weather(models.Model):
    region_name = models.CharField(max_length=100)
    date = models.DateField()
    weather = models.CharField(max_length=50, default="정보없음")
    temperature_avg = models.FloatField()
    temperature_max = models.FloatField()
    temperature_min = models.FloatField()
    precipitation = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('region_name', 'date')
        db_table = 'weather_info'

class HourlyWeather(models.Model):
    region_name = models.CharField(max_length=100)
    date = models.DateField()
    hour = models.IntegerField()
    weather = models.CharField(max_length=50)
    temperature = models.FloatField()
    precipitation = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('region_name', 'date', 'hour')
        db_table = 'hourly_weather'