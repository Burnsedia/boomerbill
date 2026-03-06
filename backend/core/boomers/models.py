from django.db import models
from django.contrib.auth import get_user_model()
# Create your models here.
User = get_user_model()

class Boomer(models.Model):
    id = models.UUIDField
    name = models.CharField
    
    def __str__(self):
        return self.name

class Category(models.Model):
    id = models.CharField
    name = models.CharField
    is_defualt = models.BooleanField
    
    def __str__(self):
        return self.name

class Session(models.Model):
    owner = models.ForeignKey(User,  on_delete=CASCADE, related_name="Victom")
    boomer = models.ForeignKey(Boomer, on_delete=CASCADE, related_name="boomerSession")
    category = models.ForeignKey(Category, on_delete=CASCADE, related_name="boomerHelpType")
    #NOTE: Cost in Time in seconds
    minutes = models.IntegerField(on_delete=CASCADE, related_name="boomerHelpTime")
    #NOTE: Cost in penies 
    cost = models.IntegerField(on_delete=CASCADE, related_name="boomerHelpTime")
    start = models.DateTimeField(on_delete=CASCADE, related_name="boomerHelpStart")
    end = models.DateTimeField(on_delete=CASCADE, related_name="boomerHelpEnd")
    note = models.TextField(on_delete=CASCADE, related_name="boomerHelpNotes")

