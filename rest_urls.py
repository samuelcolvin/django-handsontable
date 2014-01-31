import HotDjango.rest_views as rest_views
router = rest_views.ManyEnabledRouter(trailing_slash=False)
for view in rest_views.generate_viewsets():
    router.register(*view)
urlpatterns = router.urls