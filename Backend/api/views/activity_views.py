from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import Activity
from ..serializers import ActivitySerializer

# GET: List activities
class ActivityListCreate(generics.ListCreateAPIView):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer

class ActivityRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    lookup_field = 'pk'

# GET: List activities
class ActivityList(APIView):
    def get(self, request, format = None):
        name = request.query_params.get("name", "")

        if name:
            # Find all activities that contains name
            activities = Activity.objects.filter(name__icontains = name)
        
        else:
            # Return all activities
            activities = Activity.objects.all()
        
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)