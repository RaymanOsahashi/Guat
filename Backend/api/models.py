from django.db import models

# Create your models here.
class Tag(models.Model):
    name = models.CharField(max_length = 64)

    def __str__(self):
        return self.name

class Activity(models.Model):
    name = models.CharField(max_length = 64)
    description = models.TextField()
    tags = models.ManyToManyField(Tag, related_name = 'tags')

    def __str__(self):
        return self.name
    