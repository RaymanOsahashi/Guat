from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import Tag
from ..serializers import TagSerializer

# POST: Create tag
class TagListCreate(generics.ListCreateAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

# GET: List tags
class TagList(APIView):
    def get(self, request, format = None):
        name = request.query_params.get("name", "")

        if name:
            # Find all tags that contains name
            tags = Tag.objects.filter(name__icontains = name)
        
        else:
            # Return all tags
            tags = Tag.objects.all()
        
        serializer = TagSerializer(tags, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)