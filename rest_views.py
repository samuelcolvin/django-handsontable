# import test_data.models as m
# import HotDjango.serializers as ser
# from rest_framework import generics
from rest_framework import viewsets
from rest_framework import permissions
import HotDjango
import settings

# class Components(generics.ListCreateAPIView):
#     queryset = m.Component.objects.all()
#     serializer_class = ser.ComponentSerializer
#     permission_classes = (permissions.IsAuthenticated,)
# 
# 
# class ComponentDetails(generics.RetrieveUpdateDestroyAPIView):
#     queryset = m.Component.objects.all()
#     serializer_class = ser.ComponentSerializer
#     permission_classes = (permissions.IsAuthenticated,)
    
# class ComponentViewSet(viewsets.ModelViewSet):
#     queryset = m.Component.objects.all()
#     serializer_class = ser.ComponentSerializer
#     permission_classes = [permissions.IsAuthenticated]

def generate_viewsets():
    modelviewsets = []
    for app_name, app in HotDjango.get_rest_apps().iteritems():
        for model_name, disp_model in app.iteritems():
            props={'queryset': disp_model.model.objects.all()}
            props['serializer_class'] = disp_model.Serializer
            if not settings.DEBUG:
                props['permission_classes'] = [permissions.IsAuthenticated]
            prefix = '%s.%s' % (app_name, model_name)
            cls=type(model_name, (viewsets.ModelViewSet,), props)
            modelviewsets.append((prefix, cls))
    return modelviewsets