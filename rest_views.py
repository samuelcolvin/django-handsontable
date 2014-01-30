from rest_framework import viewsets
from rest_framework import permissions
import HotDjango
import settings
import rest_framework.routers as routers
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action, link
from django.http import Http404
import traceback
from django.db import models
from django.core.urlresolvers import reverse
from time import sleep
from rest_framework.permissions import BasePermission
import json

class CustomIsAuthenticated(BasePermission):
    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated():
            return HotDjango.is_allowed_hot(request.user)
        return False

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
    query = None      
    def list(self, request, *args, **kwargs):
        query = dict(request.QUERY_PARAMS)
        if len(query) > 0:
            for k, v in query.items():
                try: query[k] = int(v[0])
                except: query[k] = v[0]
            self.query = query
        return self._standard_list_headings(request, *args, **kwargs)
        
    def get_queryset(self):
        if self.query:
            q = self.model.objects.filter(**self.query)
        else:
            q = self.model.objects.all()
        self.query = None
        return q
    
    @link()
    def getm2m(self, request, pk, *args, **kwargs):
        if 'field' not in request.QUERY_PARAMS:
            return self._repond_with_error(Exception('field must be specified as get param'))
        try:
            self._m2m_field = request.QUERY_PARAMS['field']
            dj_field = self.model._meta.get_field_by_name(self._m2m_field)[0]
            assert isinstance(dj_field, models.ManyToManyField), \
                    "field '%s' is not a ManyToManyField" % self._m2m_field
            response = {'options': self._add_fk_model(dj_field.rel.to)}
            items = getattr(self.model.objects.get(pk=pk), self._m2m_field).all()
            response['values'] = [self._get_id_name(item) for item in items]
        except Exception, e:
            return self._repond_with_error(e)
        return Response(response, status = status.HTTP_200_OK)
    
    @action()
    def setm2m(self, request, pk, *args, **kwargs):
#         return self._repond_with_error(Exception('Random error'))
        response = self.getm2m(request, pk, *args, **kwargs)
        if response.status_code != status.HTTP_200_OK:
            return response
        try:
#             print request.DATA
            ids = [int(i.split(':')[0]) for i in request.DATA]
            item = self.model.objects.get(pk=pk)
            m2m_field = getattr(item, self._m2m_field)
            m2m_field.clear()
            for item_id in ids:
                m2m_field.add(item_id)
            item.save()
            if hasattr(self.model, 'after_save'):
                self.model.after_save()
        except Exception, e:
            return self._repond_with_error(e)
        else:
            response = {'message': '%s updated' % self.model._meta.verbose_name}
            return Response(json.dumps(response), status = status.HTTP_200_OK)
        
    
    def _standard_list_headings(self, request, *args, **kwargs):
#         sleep(1.5)
        try:
            list_response = super(ManyEnabledViewSet, self).list(request, *args, **kwargs)
            add_delete = getattr(self._display_model.HotTable.Meta, 'add_delete', True)
            response_data = {'DATA': list_response.data, 
                             'HEADINGS': self._get_info(),
                             'SETTINGS':{'add_delete': add_delete}}
        except Exception, e:
            return self._repond_with_error(e)
        else:
            return Response(response_data, status = list_response.status_code)
    
    def update_add_delete_many(self, request, *args, **kwargs):
#         sleep(1.5)
        try:
            self._all_data = request.DATA
            self._base_request = request
            if isinstance(self._all_data, dict):
                response_data = {}
                self._response_status = status.HTTP_200_OK
                self._all_ids = self.model.objects.all().values_list('id', flat=True)
                response_data['DELETED'] = self._delete(*args, **kwargs)
                response_data['ADDED'] = self._add_modify('ADD', *args, **kwargs)
                response_data['MODIFIED'] = self._add_modify('MODIFY', *args, **kwargs)
                if hasattr(self.model, 'after_save'):
                    self.model.after_save()
            else:
                print 'request.DATA:', self._all_data
                raise Exception('request.DATA is not a dict')
        except Exception, e:
            return self._repond_with_error(e)
        else:
            if self._response_status in [status.HTTP_200_OK, status.HTTP_201_CREATED]:
                return self.list(request)
            else:
                return Response(response_data, status = self._response_status)
    
    def _add_modify(self, action, *args, **kwargs):
        data = self._all_data[action]
        if not isinstance(data, list):
            raise Exception('%s DATA is not a list' % action)
        response_data = {'STATUS': 'SUCCESS', 'IDS': {}}
        for data_item in data:
            if data_item['id'] is None:
                response_data['IDS']['unknown'] = {'data': 'ID is blank: ' + str(data_item), 
                                                   'status': status.HTTP_400_BAD_REQUEST}
                response_data['STATUS'] = 'PARTIAL ERROR'
                continue
            self._base_request._data = data_item
            id_before = data_item['id']
            if action == 'MODIFY':
                self.kwargs[self.pk_url_kwarg] = data_item['id']
                response = self.partial_update(self._base_request, *args, **kwargs)
            else:
                del self._base_request._data['id']
                self.kwargs[self.pk_url_kwarg] = None
                response = self.create(self._base_request, *args, **kwargs)
            response_data['IDS'][id_before] = {'status': response.status_code}
            if response.status_code is status.HTTP_201_CREATED and self._response_status is status.HTTP_200_OK:
                self._response_status = status.HTTP_201_CREATED
            if response.status_code not in (status.HTTP_200_OK, status.HTTP_201_CREATED):
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
            if item_id in self._all_ids:
                response = self.destroy(self._base_request, *args, **kwargs)
                response_data['IDS'][item_id] = {'status': response.status_code}
            else:
                response_data['IDS'][item_id] = {'status': status.HTTP_404_NOT_FOUND}
                self._response_status = status.HTTP_404_NOT_FOUND
                response_data['STATUS'] = 'PARTIAL ERROR'
        return response_data
            
    def _repond_with_error(self, e):
        error_msg = {'STATUS': 'ERROR', 'error': str(e), 'type': type(e).__name__}
        if hasattr(e, 'detail'):
            error_msg['detail'] = e.detail
        print error_msg
        traceback.print_exc()
        return Response(error_msg, status = status.HTTP_400_BAD_REQUEST)
    
    def _get_info(self):
        fields = []
        self._all_apps = HotDjango.get_rest_apps()
        readonly = getattr(self._display_model.HotTable.Meta, 'readonly', [])
        for field_name in self._display_model.HotTable.Meta.fields:
            fields.append(self._get_field_info(field_name, field_name in readonly))
        return fields
    
    def _get_field_info(self, field_name, readonly):
        dm = self._display_model
        dj_field = dm.model._meta.get_field_by_name(field_name)[0]
        verb_name = HotDjango.get_verbose_name(dm, field_name)
        field = {'heading': verb_name, 'name': field_name, 'readonly': readonly or field_name == 'id'}
        field['type'] = dj_field.__class__.__name__
        if isinstance(dj_field, models.ForeignKey) or isinstance(dj_field, models.ManyToManyField):
            mod = dj_field.rel.to
            field['fk_items'] = self._add_fk_model(mod)
        elif isinstance(dj_field, models.related.RelatedObject) and hasattr(dm, 'related_tables'):
            other_disp_model = dm.related_tables[field_name]
            field['url'] = reverse(generate_reverse(self._app_name, other_disp_model.__name__) + '-list')
            field['filter_on'] = dj_field.field.name
        elif hasattr(dj_field, 'choices') and len(dj_field.choices) > 0:
            field['choices'] = [choice[1] for choice in dj_field.choices]
        return field
    
    def _add_fk_model(self, model):
        return [self._get_id_name(item) for item in model.objects.all()]
    
    def _get_id_name(self, item):
        if hasattr(item, 'hot_name'):
            name = item.hot_name()
        else:
            name = str(item)
        if HotDjango.HOT_ID_IN_MODEL_STR:
            return name
        else:
            return '%d: %s' % (item.id, name)

def generate_viewsets():
    modelviewsets = []
    for app_name, app in HotDjango.get_rest_apps().items():
        for model_name, disp_model in app.items():
            props={'model': disp_model.model}
            props['serializer_class'] = disp_model.HotTable
            props['_display_model'] = disp_model
            props['_app_name'] = app_name
            props['permission_classes'] = [permissions.IsAuthenticated, CustomIsAuthenticated]
            prefix = '%s.%s' % (app_name, model_name)
            cls=type(model_name, (ManyEnabledViewSet,), props)
            reverser = generate_reverse(app_name, model_name)
            modelviewsets.append((prefix, cls, reverser))
    return modelviewsets

def generate_reverse(app_name, model_name):
    return 'rest-%s-%s' % (app_name, model_name)