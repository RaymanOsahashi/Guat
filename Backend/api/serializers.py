from rest_framework import serializers
from .models import Activity, Tag, Song

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'color']
        read_only_fields = ['slug']

class ActivitySerializer(serializers.ModelSerializer):
    tags = TagSerializer(many = True, read_only = True)
    class Meta:
        model = Activity
        fields = ['id', 'name', 'description', 'description_spanish', 'tags', 'archived', 'starred']
    
class ActivityTagSerializer(serializers.Serializer):
    tags = serializers.PrimaryKeyRelatedField(
        many = True,
        queryset = Tag.objects.all()
    )
# Probably need to create a verse object and fill lyrics with said object
class SongSerializer(serializers.Serializer):
    class Meta:
        model = Song
        fields = ['id', 'name']
