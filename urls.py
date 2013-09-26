from django.conf.urls import patterns, url, include
import HotDjango.views as views

urlpatterns = patterns('',
#    url(r'^$', views.AllView.as_view(), name='all-hot-table'),
    url(r'^restful/', include('HotDjango.rest_urls')),
#    url(r'^(?P<app>\w+)/(?P<model>\w+)$', views.TableView.as_view(), name='hot-table'),
)