from django.urls import path
from .views import activity_views, tag_views

# TODO: Edit endpoints so you have to specify GET, POST, PUT, DELETE 
# TODO: Verify database connectivity
urlpatterns = [
    # Activities
        # GET: List activities
        path("activity/", activity_views.ActivityListCreate.as_view(), name="activity-view-create"),
        # PUT: Edit activities by id
        path("activity/<int:pk>/", activity_views.ActivityRetrieveUpdateDestroy.as_view(), name = "update"),

    # Tags
        # GET: List all tags
        path("tag/", tag_views.TagList.as_view(), name="activity-list")
        # Get tag by id
    
]