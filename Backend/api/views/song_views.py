from django.shortcuts import render, get_object_or_404
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ParseError
from rest_framework import generics
from ..models import Song
from ..serializers import SongSerializer, VerseSerializer

# POST: Create songs
# GET: List songs
class SongListCreate(generics.ListCreateAPIView):
    queryset = Song.objects.all()
    serializer_class = SongSerializer

# GET: Get songs by id
# PUT: Replace songs by id
# PATCH: Edit songs by id
# DELETE: Delete songs by id
class SongRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = Song.objects.all()
    serializer_class = SongSerializer
    lookup_field = 'pk'

# POST: Add verse to song
class SongAddVerseView(APIView):
    """
    POST /song/<id>/verses/
    Body: {"order": 1, 
           "name": "Verse 1", 
           "lyrics": "...", 
           "lyrics_spanish": "...", 
           "lyrics_phonetic": "..."}

    Creates a new verse under the given song.
    """

    def post(self, request, pk):
        song = get_object_or_404(Song, pk=pk)
        serializer = VerseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        serializer.save(song=song)

        return Response(SongSerializer(song).data, status=status.HTTP_201_CREATED)