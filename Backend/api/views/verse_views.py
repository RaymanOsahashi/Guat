from rest_framework import generics
from ..models import Verse
from ..serializers import VerseSerializer

# POST: Create verses
# GET: List verses
class VerseListCreate(generics.ListCreateAPIView):
    queryset = Verse.objects.all()
    serializer_class = VerseSerializer

# GET: Get verses by id
# PUT: Replace verses by id
# PATCH: Edit verses by id
# DELETE: Delete verses by id
class VerseRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = Verse.objects.all()
    serializer_class = VerseSerializer
    lookup_field = 'pk'