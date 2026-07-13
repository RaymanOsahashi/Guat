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
""""
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
"""

# GET: List activities by tags
class ActivityListByTag(generics.ListAPIView):
    serializer_class = ActivitySerializer

    """
    GET /activity/by-tags/?tags=outdoor,free                     → matches ANY tag (default)
    GET /activity/by-tags/?tags=outdoor,free&match=all           → matches ALL tags
    GET /activity/by-tags/?tags=outdoor,free&exclude=low-energy → matches ANY tag and excludes tags

    Returns the activities with the specified tags
    """

    def get_queryset(self):
        # Get params
        tags_param = self.request.query_params.get('tags')
        exclude_param = self.request.query_params.get('exclude')

        # Must have either tags or exclude params
        if not (tags_param or exclude_param):
            raise ParseError("Query parameter 'tags' or 'exclude' is required")

        # Parse params
        tag_slugs = [t.strip() for t in tags_param.split(',') if t.strip()] if tags_param else []
        exclude_slugs = [e.strip() for e in exclude_param.split(',') if e.strip()] if exclude_param else []
        match_mode = self.request.query_params.get('match', 'any')

        if match_mode == 'all':
            # Activity must have ALL specified tags
            queryset = Activity.objects.all()
            for slug in tag_slugs:
                queryset = queryset.filter(tags__slug = slug)
            queryset = queryset.distinct()
        else:
            # Activity must have AT LEAST ONE of the specified tags (default)
            queryset = Activity.objects.filter(tags__slug__in=tag_slugs).distinct()
        
        if exclude_slugs:
            # Activity must not have any excluded tags
            queryset = queryset.exclude(tags__slug__in = exclude_slugs)

        return queryset

# PATCH: Add tags to activity
class ActivitySetTagsView(APIView):
    """
    PATCH /activities/<id>/tags/
    Body: {"tags": [1, 2, 3]}   ← tag IDs

    Sets the given tags to the activity.
    """

    def patch(self, request, pk):
        activity = get_object_or_404(Activity, pk = pk)
        serializer = ActivityTagSerializer(data = request.data)
        serializer.is_valid(raise_exception = True)

        activity.tags.set(serializer.validated_data['tags'])

        return Response(ActivitySerializer(activity).data, status=status.HTTP_200_OK)