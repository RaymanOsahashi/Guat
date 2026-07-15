from django.db import models
from colorfield.fields import ColorField
from django.utils.text import slugify

# Tags
class Tag(models.Model):
    name = models.CharField(max_length=64, unique=True)
    slug = models.SlugField(max_length=64, unique=True, blank=True)
    color = ColorField(default='#FFFFFF')

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

# Activity
class Activity(models.Model):
    name = models.CharField(max_length=64)
    description = models.TextField(blank=True)
    description_spanish = models.TextField(blank=True)
    tags = models.ManyToManyField(Tag, related_name='activities', blank=True)
    starred = models.BooleanField(default=False)
    archived = models.BooleanField(default=False)

    def __str__(self):
        return self.name
    
# Song
class Song(models.Model):
    name = models.CharField(max_length=64, blank=True)
    name_spanish = models.CharField(max_length=64)
    url = models.TextField(blank=True)

    def __str__(self):
        return self.name_spanish

# Verse
class Verse(models.Model):
    song = models.ForeignKey(
        Song,
        on_delete=models.CASCADE,
        related_name="verses",
        null=True
    )
    order = models.PositiveIntegerField(null=True)

    name = models.CharField(max_length=64)
    lyrics = models.TextField(blank=True)
    lyrics_spanish = models.TextField(blank=True)
    lyrics_phonetic = models.TextField(blank=True)

    def __str__(self):
        return self.name
    