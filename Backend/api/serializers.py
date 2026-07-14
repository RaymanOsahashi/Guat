from rest_framework import serializers
from .models import Activity, Tag, Song, Verse

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 
                  'name', 
                  'slug', 
                  'color']
        read_only_fields = ['slug']

class ActivitySerializer(serializers.ModelSerializer):
    tags = TagSerializer(many = True, read_only = True)
    class Meta:
        model = Activity
        fields = ['id', 
                  'name', 
                  'description', 
                  'description_spanish', 
                  'tags', 
                  'archived', 
                  'starred']
    
class ActivityTagSerializer(serializers.Serializer):
    tags = serializers.PrimaryKeyRelatedField(
        many = True,
        queryset = Tag.objects.all()
    )

class VerseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Verse
        fields = ['id', 
                  'order',
                  'name',
                  'lyrics', 
                  'lyrics_spanish', 
                  'lyrics_phonetic',]

class SongSerializer(serializers.ModelSerializer):
    verses = VerseSerializer(many=True, read_only=True)
    class Meta:
        model = Song
        fields = ['id', 
                  'name', 
                  'name_spanish', 
                  'url',
                  'verses',]
