from django.db import models
from django.utils.text import slugify

# Tags
class Tag(models.Model):
    name = models.CharField(max_length = 64, unique = True)
    slug = models.SlugField(max_length = 64, unique = True, blank = True)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

# Activity
class Activity(models.Model):
    name = models.CharField(max_length = 64)
    description = models.TextField(blank = True)
    tags = models.ManyToManyField(Tag, related_name = 'activities', blank = True)
    archived = models.BooleanField(default = False)

    def __str__(self):
        return self.name
    