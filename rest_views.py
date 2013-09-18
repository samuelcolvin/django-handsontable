from rest_framework import viewsets
from rest_framework import permissions
import HotDjango
import settings
import rest_framework.routers as routers
from rest_framework.response import Response
from rest_framework import status
from django.http import Http404
import traceback

class ManyEnabledRouter(routers.DefaultRouter):
    routes = routers.DefaultRouter.routes
    
    routes[0] = routers.Route(
        url=r'^{prefix}{trailing_slash}$',
        mapping={
            'get': 'list',
            'post': 'create',
            'patch': 'partial_update_many',
        },
        name='{basename}-list',
        initkwargs={'suffix': 'List'}
    )

class ManyEnabledViewSet(viewsets.ModelViewSet):
    
    def partial_update_many(self, request, *args, **kwargs):
        try:
            self._all_data = request.DATA
            self._base_request = request
            if isinstance(self._all_data, dict):
                response_data = {}
                self._response_status = status.HTTP_200_OK
                response_data['MODIFIED'] = self._save_modifications(*args, **kwargs)
                response_data['DELETED'] = self._delete(*args, **kwargs)
            else:
                print 'request.DATA:', self._all_data
                raise Exception('request.DATA is not a dict')
        except Exception, e:
#             import pdb; pdb.set_trace()
            error_msg = {'STATUS': 'ERROR', 'error': str(e), 'type': type(e).__name__}
            if hasattr(e, 'detail'):
                error_msg['detail'] = e.detail
            print error_msg
            traceback.print_exc()
            return Response(error_msg, status = status.HTTP_400_BAD_REQUEST)
        else:
            return Response(response_data, status = self._response_status)
        
    def _save_modifications(self, *args, **kwargs):
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
            if self.check_object_exists():
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
            if self.check_object_exists():
                response = self.destroy(self._base_request, *args, **kwargs)
                response_data['IDS'][item_id] = {'status': response.status_code}
            else:
                response_data['IDS'][item_id] = {'status': status.HTTP_404_NOT_FOUND}
                self._response_status = status.HTTP_404_NOT_FOUND
                response_data['STATUS'] = 'PARTIAL ERROR'
        return response_data

    def check_object_exists(self):
        try:
            self.get_object()
            return True
        except Http404:
            return False


def generate_viewsets():
    modelviewsets = []
    for app_name, app in HotDjango.get_rest_apps().iteritems():
        for model_name, disp_model in app.iteritems():
            props={'queryset': disp_model.model.objects.all()}
            props['serializer_class'] = disp_model.Serializer
            if not settings.DEBUG:
                props['permission_classes'] = [permissions.IsAuthenticated]
            prefix = '%s.%s' % (app_name, model_name)
            cls=type(model_name, (ManyEnabledViewSet,), props)
            reverser = generate_reverse(app_name, model_name)
            modelviewsets.append((prefix, cls, reverser))
    return modelviewsets

def generate_reverse(app_name, model_name):
    return 'rest-%s-%s' % (app_name, model_name)