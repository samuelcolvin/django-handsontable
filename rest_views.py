from rest_framework import viewsets
from rest_framework import permissions
import HotDjango
import settings
import rest_framework.routers as routers
from rest_framework.response import Response
from rest_framework import status
from django.http import Http404
import traceback
from django.db import models
from django.core.urlresolvers import reverse

class ManyEnabledRouter(routers.DefaultRouter):
    routes = routers.DefaultRouter.routes
    
    routes[0] = routers.Route(
        url=r'^{prefix}{trailing_slash}$',
        mapping={
            'get': 'list',
            'post': 'create',
            'patch': 'update_add_delete_many',
        },
        name='{basename}-list',
        initkwargs={'suffix': 'List'}
    )

class ManyEnabledViewSet(viewsets.ModelViewSet):
    def list(self, request):
        list_response = super(ManyEnabledViewSet, self).list(request)
        response_data = {'DATA': list_response.data, 'HEADINGS': self._get_headings()}
        return Response(response_data, status = list_response.status_code)
    
    def update_add_delete_many(self, request, *args, **kwargs):
        try:
            self._all_data = request.DATA
            self._base_request = request
            if isinstance(self._all_data, dict):
                response_data = {}
                self._response_status = status.HTTP_200_OK
                response_data['DELETED'] = self._delete(*args, **kwargs)
                response_data['MODIFIED'] = self._add_modify(*args, **kwargs)
            else:
                print 'request.DATA:', self._all_data
                raise Exception('request.DATA is not a dict')
        except Exception, e:
            error_msg = {'STATUS': 'ERROR', 'error': str(e), 'type': type(e).__name__}
            if hasattr(e, 'detail'):
                error_msg['detail'] = e.detail
            print error_msg
            traceback.print_exc()
            return Response(error_msg, status = status.HTTP_400_BAD_REQUEST)
        else:
            if self._response_status in [status.HTTP_200_OK, status.HTTP_201_CREATED]:
                return self.list(request)
            else:
                return Response(response_data, status = self._response_status)
        
    def _add_modify(self, *args, **kwargs):
        mod_data = self._all_data['MODIFY']
        if not isinstance(mod_data, list):
            print 'request.DATA:', self._all_data
            raise Exception('MODIFY DATA is not a list')
        response_data = {'STATUS': 'SUCCESS', 'IDS': {}}
        for data_item in mod_data:
            if data_item['id'] is None:
                response_data['IDS']['unknown'] = {'data': 'ID is blank: ' + str(data_item), 
                                                   'status': status.HTTP_400_BAD_REQUEST}
                response_data['STATUS'] = 'PARTIAL ERROR'
                continue
            self._base_request._data = data_item
            self.kwargs[self.pk_url_kwarg] = data_item['id']
            if self._check_object_exists():
                response = self.partial_update(self._base_request, *args, **kwargs)
            else:
                response = self.create(self._base_request, *args, **kwargs)
            response_data['IDS'][data_item['id']] = {'status': response.status_code}
            if response.status_code is status.HTTP_201_CREATED and self._response_status is status.HTTP_200_OK:
                self._response_status = status.HTTP_201_CREATED
            elif response.status_code is not status.HTTP_200_OK:
                self._response_status = status.HTTP_303_SEE_OTHER
                response_data['IDS'][data_item['id']]['data'] = response.data
                response_data['STATUS'] = 'PARTIAL ERROR'
        return response_data
    
    def _delete(self, *args, **kwargs):
        ids2delete = self._all_data['DELETE']
        if not isinstance(ids2delete, list):
            print 'request.DATA:', self._all_data
            raise Exception('request.DATA is not a list')
        response_data = {'STATUS': 'SUCCESS', 'IDS': {}}
        for item_id in ids2delete:
            self.kwargs[self.pk_url_kwarg] = item_id
            if self._check_object_exists():
                response = self.destroy(self._base_request, *args, **kwargs)
                response_data['IDS'][item_id] = {'status': response.status_code}
            else:
                response_data['IDS'][item_id] = {'status': status.HTTP_404_NOT_FOUND}
                self._response_status = status.HTTP_404_NOT_FOUND
                response_data['STATUS'] = 'PARTIAL ERROR'
        return response_data

    def _check_object_exists(self):
        try:
            self.get_object()
            return True
        except Http404:
            return False
    
    def _get_headings(self):
        dm = self._display_model
        fields = []
        for field_name in dm.HotTable.Meta.fields:
            dj_field = dm.model._meta.get_field_by_name(field_name)[0]
            if hasattr(dj_field, 'verbose_name'):
                verb_name = dj_field.verbose_name
            else:
                verb_name = field_name
            field = {'header': verb_name, 'name': field_name}
            field['type'] = dj_field.__class__.__name__
            if isinstance(dj_field, models.ForeignKey) or isinstance(dj_field, models.ManyToManyField):
                mod = dj_field.rel.to
                field['fk_items'] = self._add_fk_model(mod)
            elif isinstance(dj_field, models.related.RelatedObject):
                if hasattr(dm, 'related_tables'):
                    mod = dj_field.model
                    other_disp_model = dm.related_tables[field_name]
                    field['url'] = reverse(generate_reverse(self._app_name, other_disp_model.__name__) + '-list')
                    field['filter'] = dj_field.field.name
            fields.append(field)
        return fields
    
    def _add_fk_model(self, model):
        return ['%d: %s' % id_name for id_name in model.objects.all().values_list('id', 'name')]


def generate_viewsets():
    modelviewsets = []
    for app_name, app in HotDjango.get_rest_apps().iteritems():
        for model_name, disp_model in app.iteritems():
            props={'queryset': disp_model.model.objects.all()}
            props['serializer_class'] = disp_model.HotTable
            props['_display_model'] = disp_model
            props['_app_name'] = app_name
            if not settings.DEBUG:
                props['permission_classes'] = [permissions.IsAuthenticated]
            prefix = '%s.%s' % (app_name, model_name)
            cls=type(model_name, (ManyEnabledViewSet,), props)
            reverser = generate_reverse(app_name, model_name)
            modelviewsets.append((prefix, cls, reverser))
    return modelviewsets

def generate_reverse(app_name, model_name):
    return 'rest-%s-%s' % (app_name, model_name)