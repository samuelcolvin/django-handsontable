from django.conf.urls import patterns, url
import HotDjango.views as views

urlpatterns = patterns('',
    url(r'^$', views.AllView.as_view(), name='all-hot-table'),
    url(r'^(?P<app>\w+)/(?P<model>\w+)$', views.TableView.as_view(), name='hot-table'),
)