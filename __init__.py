from rest_framework import serializers
import inspect, settings

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
        return self._model.objects.get(id = int(data[:data.index(':')]))


def get_display_apps():
    display_modules = map(lambda m: __import__(m + '.display'), settings.DISPLAY_APPS)
    apps={}
    for dm in display_modules:
        apps[dm.__name__] = {}
        for ob_name in dir(dm.display):
            ob = getattr(dm.display, ob_name)
            if inherits_from(ob, BaseDisplayModel):
                apps[dm.__name__][ob_name] = _process_display(dm, ob_name)
    return apps

def inherits_from(child, parent):
    return inspect.isclass(child) and inspect.isclass(parent) \
         and issubclass(child, parent) and not child is parent
                    
def _process_display(dm, ob_name):
    if not hasattr(dm.models, ob_name):
        raise Exception('%s does not have a model called %s' % (dm.__name__, ob_name))
    display = getattr(dm.display, ob_name)
    display.model = getattr(dm.models, ob_name)
    display.app_parent = dm.__name__
    return display