from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import Tag
from ..serializers import TagSerializer

# POST: Create tags
# GET: List tags
class TagListCreate(generics.ListCreateAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

# GET: Get tags by id
# PUT: Replace tags by id
# PATCH: Edit tags by id
# DELETE: Delete tags by id
class TagRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    lookup_field = 'pk'
