from django.urls import path
from .views import activity_views, tag_views

urlpatterns = [
    # Activities
        # GET: List activities
        path("activity/", activity_views.ActivityList.as_view(), name="activity-view"),
        # GET: List activities by tag
        path("activity/by-tags/", activity_views.ActivityListByTag.as_view(), name = "activities-by-tag"),
        # POST: Add tags to activities
        path('activity/<int:pk>/tags/', activity_views.ActivityAddTagsView.as_view(), name='activity-add-tags'),
        # PUT: Edit activities by id
        path("activity/<int:pk>/", activity_views.ActivityRetrieveUpdateDestroy.as_view(), name = "activity-update"),

    # Tags
        # POST/GET: Create and List tags
        path("tag/", tag_views.TagListCreate.as_view(), name = "tag-list-create"),
        
        # GET: Get tag by id
    
]