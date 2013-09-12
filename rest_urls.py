import HotDjango.rest_views as rest_views
from rest_framework.routers import DefaultRouter

router = DefaultRouter(trailing_slash=False)
for prefix, modelviewset in rest_views.generate_viewsets():
    router.register(prefix, modelviewset, 'rest-' + prefix)
urlpatterns = router.urls