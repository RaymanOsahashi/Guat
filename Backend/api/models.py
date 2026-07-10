from django.db import models

# Create your models here.
class Activity(models.Model):
    name = models.CharField(max_length = 64)
    description = models.TextField()

    def __str__(self):
        return self.name

class Tag(models.Model):
    name = models.CharField(max_length = 64)

    def __str__(self):
        return self.name
    