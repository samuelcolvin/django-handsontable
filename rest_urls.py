import HotDjango.rest_views as rest_views
# from pprint import pprint
router = rest_views.ManyEnabledRouter(trailing_slash=False)
# print 'REGISTERING VIEWS:'
for view in rest_views.generate_viewsets():
#     pprint(view)
    router.register(*view)
urlpatterns = router.urls