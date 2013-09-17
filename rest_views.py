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
            'delete': 'delete_many',
        },
        name='{basename}-list',
        initkwargs={'suffix': 'List'}
    )

class ManyEnabledViewSet(viewsets.ModelViewSet):
    
    def delete_many(self, request, *args, **kwargs):
        try:
            ids2delete = request.DATA
            print ids2delete
            if isinstance(ids2delete, list):
                response_data = {'STATUS': 'SUCCESS', 'IDS': {}}
                response_status = status.HTTP_204_NO_CONTENT
                for item_id in ids2delete:
                    self.kwargs[self.pk_url_kwarg] = item_id
                    if self.check_object_exists():
                        response = self.destroy(request, *args, **kwargs)
                        response_data['IDS'][item_id] = {'status': response.status_code}
                    else:
                        response_data['IDS'][item_id] = {'status': status.HTTP_404_NOT_FOUND}
                        response_status = status.HTTP_404_NOT_FOUND
                        response_data['STATUS'] = 'PARTIAL ERROR'
            else:
                raise Exception('request.DATA is not a list')
        except Exception, e:
#             import pdb; pdb.set_trace()
            error_msg = {'STATUS': 'ERROR', 'error': str(e), 'type': type(e).__name__}
            if hasattr(e, 'detail'):
                error_msg['detail'] = e.detail
            print error_msg
            traceback.print_exc()
            return Response(error_msg, status = status.HTTP_400_BAD_REQUEST)
        else:
            return Response(response_data, status = response_status)
    
    def partial_update_many(self, request, *args, **kwargs):
        try:
            all_data = request.DATA
            if isinstance(all_data, list):
                response_data = {'STATUS': 'SUCCESS', 'IDS': {}}
                response_status = status.HTTP_200_OK
                for data_item in all_data:
                    if data_item['id'] is None:
                        response_data['IDS']['unknown'] = {'data': 'ID is blank', 'status': status.HTTP_400_BAD_REQUEST}
                        response_data['STATUS'] = 'PARTIAL ERROR'
                        continue
                    request._data = data_item
                    self.kwargs[self.pk_url_kwarg] = data_item['id']
                    if self.check_object_exists():
                        response = self.partial_update(request, *args, **kwargs)
                    else:
                        response = self.create(request, *args, **kwargs)
                    response_data['IDS'][data_item['id']] = {'status': response.status_code}
                    if response.status_code is status.HTTP_201_CREATED and response_status is status.HTTP_200_OK:
                        response_status = status.HTTP_201_CREATED
                    elif response.status_code is not status.HTTP_200_OK:
                        response_status = status.HTTP_303_SEE_OTHER
                        response_data['IDS'][data_item['id']]['data'] = response.data
                        response_data['STATUS'] = 'PARTIAL ERROR'
            else:
                raise Exception('request.DATA is not a list')
        except Exception, e:
#             import pdb; pdb.set_trace()
            error_msg = {'STATUS': 'ERROR', 'error': str(e), 'type': type(e).__name__}
            if hasattr(e, 'detail'):
                error_msg['detail'] = e.detail
            print error_msg
            traceback.print_exc()
            return Response(error_msg, status = status.HTTP_400_BAD_REQUEST)
        else:
            return Response(response_data, status = response_status)

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