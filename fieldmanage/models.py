from django.db import models
import jsonfield

class Field(models.Model):
    field_id = models.AutoField(primary_key=True)
    field_name = models.CharField(max_length=100)
    field_address = models.CharField(max_length=255)
    field_area = models.FloatField()
    crop_name = models.CharField(max_length=100)
    farm_startdate = models.DateField(auto_now_add=True)
    description = models.CharField(max_length=100)
    owner = models.ForeignKey("accounts.User", on_delete=models.CASCADE)
    # owner = models.ForeignKey("accounts.User", verbose_name=_(""), on_delete=models.CASCADE)
    
    geometry = jsonfield.JSONField()  # GeoJSON 저장용

    class Meta:
        db_table = "field_info"
        
    def __str__(self):
        return self.field_name
