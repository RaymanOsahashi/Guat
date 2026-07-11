from django.shortcuts import render, get_object_or_404
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ParseError
from ..models import Activity, Tag
from ..serializers import ActivitySerializer, ActivityTagSerializer

# Generic views ===================================
# GET: List activities
class ActivityListCreate(generics.ListCreateAPIView):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer

class ActivityRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    lookup_field = 'pk'
#==================================================

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

# GET: List activities by tags
class ActivityListByTag(generics.ListAPIView):
    """
    GET /activity/by-tags/?tags=outdoor,free           → matches ANY tag (default)
    GET /activity/by-tags/?tags=outdoor,free&match=all → matches ALL tags

    Returns the activities with the specified tags
    """

    serializer_class = ActivitySerializer

    def get_queryset(self):
        tags_param = self.request.query_params.get('tags')
        if not tags_param:
            raise ParseError("Query parameter 'tags' is required, e.g. ?tags=outdoor,high-energy")

        tag_slugs = [t.strip() for t in tags_param.split(',') if t.strip()]
        match_mode = self.request.query_params.get('match', 'any')

        if match_mode == 'all':
            # Activity must have ALL specified tags
            queryset = Activity.objects.all()
            for slug in tag_slugs:
                queryset = queryset.filter(tags__slug=slug)
            queryset = queryset.distinct()
        else:
            # Activity must have AT LEAST ONE of the specified tags (default)
            queryset = Activity.objects.filter(tags__slug__in=tag_slugs).distinct()

        return queryset
# PUT: Add tags to activity
class ActivityAddTagsView(APIView):
    """
    POST /activities/<id>/tags/
    Body: {"tags": [1, 2, 3]}   ← tag IDs

    Adds the given tags to the activity, keeping any it already has.
    """

    def post(self, request, pk):
        activity = get_object_or_404(Activity, pk = pk)
        serializer = ActivityTagSerializer(data = request.data)
        serializer.is_valid(raise_exception = True)

        activity.tags.add(*serializer.validated_data['tags'])

        return Response(ActivitySerializer(activity).data, status=status.HTTP_200_OK)