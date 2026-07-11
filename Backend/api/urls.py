from django.urls import path
from .views import activity_views, tag_views

urlpatterns = [
    # Activities
        # POST: Create activities
        # GET: List activities
        path("activity/", activity_views.ActivityListCreate.as_view(), name="activity-list-create"),
        # GET: List activities by tag
        path("activity/by-tags/", activity_views.ActivityListByTag.as_view(), name = "activities-by-tag"),
        # PATCH: Set tags to activities
        path('activity/<int:pk>/tags/', activity_views.ActivitySetTagsView.as_view(), name='activity-set-tags'),
        # GET: Get activities by id
        # PUT: Replace activities by id
        # PATCH: Edit activities by id
        # DELETE: Delete activities by id
        path("activity/<int:pk>/", activity_views.ActivityRetrieveUpdateDestroy.as_view(), name = "activity-update"),

    # Tags
        # POST/GET: Create and List tags
        path("tag/", tag_views.TagListCreate.as_view(), name = "tag-list-create"),
        # GET: Get tag by id
        # PUT: Replace tags by id
        # PATCH: Edit tags by id
        # DELETE: Delete tags by id
        path("tag/<int:pk>/", tag_views.TagRetrieveUpdateDestroy.as_view(), name = "tag-update")
    
]