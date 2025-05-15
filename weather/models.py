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
        db_table = 'mid_weather'

class HourlyWeather(models.Model):
    region_name = models.CharField(max_length=50)
    date = models.DateField()
    temperature = models.FloatField()
    weather = models.CharField(max_length=30)
    precipitation = models.FloatField(default=0.0)
    hour = models.IntegerField()  
    #created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('region_name', 'date', 'hour')
        db_table = 'hourly_weather'