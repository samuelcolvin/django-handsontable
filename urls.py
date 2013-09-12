from django.conf.urls import patterns, url
# from rest_framework.urlpatterns import format_suffix_patterns
import HotDjango.rest_views as rest_views
from rest_framework.routers import DefaultRouter


router = DefaultRouter(trailing_slash=False)
router.register(r'components', rest_views.ComponentViewSet)
urlpatterns = router.urls

# urlpatterns = patterns('',
#     url(r'^restful/components$', rest_views.Components.as_view()),
# )
# urlpatterns = format_suffix_patterns(urlpatterns)

urlpatterns += patterns('HotDjango.views',
    url(r'^table$', 'table', name='table'),
)