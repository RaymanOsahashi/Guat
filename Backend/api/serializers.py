from rest_framework import serializers
from .models import Activity, Tag

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']
        read_only_fields = ['slug']

class ActivitySerializer(serializers.ModelSerializer):
    tags = TagSerializer(many = True, read_only = True)
    class Meta:
        model = Activity
        fields = ['id', 'name', 'description', 'tags']
    
class ActivityTagSerializer(serializers.Serializer):
    tags = serializers.PrimaryKeyRelatedField(
        many = True,
        queryset = Tag.objects.all()
    )