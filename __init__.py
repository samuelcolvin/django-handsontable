from rest_framework import serializers
import inspect, settings
from rest_framework import serializers

class BaseDisplayModel:
    pass

class IDNameSerialiser(serializers.RelatedField):
    read_only = False
    def __init__(self, model, *args, **kwargs):
        self._model = model
        super(IDNameSerialiser, self).__init__(*args, **kwargs)
        
    def to_native(self, item):
        return '%d: %s' % (item.id, item.name)
    
    def from_native(self, data):
        try:
            id = int(data)
        except:
            id = int(data[:data.index(':')])
        return self._model.objects.get(id = id)

class Serialiser(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        kwargs.pop('many', True)
        super(Serialiser, self).__init__(*args, **kwargs)

def get_display_apps():
    display_modules = map(lambda m: __import__(m + '.display'), settings.DISPLAY_APPS)
    apps={}
    for dm in display_modules:
        apps[dm.__name__] = {}
        for ob_name in dir(dm.display):
            ob = getattr(dm.display, ob_name)
            if inherits_from(ob, 'BaseDisplayModel'):
                apps[dm.__name__][ob_name] = _process_display(dm, ob_name)
    return apps

def get_rest_apps():
    display_apps = get_display_apps()
    for disp_app in display_apps.values():
        for model_name in disp_app.keys():
            if not hasattr(disp_app[model_name], 'Serializer'):
                del disp_app[model_name]
        if len(disp_app) == 0:
            del disp_app
    return display_apps

def inherits_from(child, parent_name):
    if inspect.isclass(child):
        if parent_name in [c.__name__ for c in inspect.getmro(child)[1:]]:
            return True
    return False
                    
def _process_display(dm, ob_name):
    if not hasattr(dm.models, ob_name):
        raise Exception('%s does not have a model called %s' % (dm.__name__, ob_name))
    display = getattr(dm.display, ob_name)
    display.model = getattr(dm.models, ob_name)
    display.app_parent = dm.__name__
    return display