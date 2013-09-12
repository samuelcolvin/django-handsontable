import test_data.models as m
import HotDjango.serializers as ser
# from rest_framework import generics
from rest_framework import viewsets
from rest_framework import permissions

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
    
class ComponentViewSet(viewsets.ModelViewSet):
    queryset = m.Component.objects.all()
    serializer_class = ser.ComponentSerializer
    permission_classes = [permissions.IsAuthenticated]

def generate_viewsets():
    cls=type('CVS', (viewsets.ModelViewSet,), {'queryset': m.Component.objects.all()})