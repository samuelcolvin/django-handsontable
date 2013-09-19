from rest_framework import serializers
import inspect, settings

class MetaBaseDisplayModel(type):
    def __init__(cls, *args, **kw):
        type.__init__(cls, *args, **kw)
        if not (hasattr(cls,'HotTable') or hasattr(cls, 'Table')):
            return
        assert hasattr(cls, 'model'), '%s is missing a model, all display models must have a model attribute' % cls.__name__
        cls.model_name = cls.model.__name__
        for inner_cls_name in ['HotTable', 'Table']:
            if hasattr(cls, inner_cls_name):
                inner_cls = getattr(cls, inner_cls_name)
                if hasattr(inner_cls, 'Meta'):
                    inner_cls.Meta.model = cls.model
                else:
                    inner_cls.Meta = type('Meta', (), {'model': cls.model})

class BaseDisplayModel:
    __metaclass__ = MetaBaseDisplayModel

class IDNameSerialiser(serializers.RelatedField):
    read_only = False
    def __init__(self, model, *args, **kwargs):
        self._model = model
        super(IDNameSerialiser, self).__init__(*args, **kwargs)
        
    def to_native(self, item):
        return '%d: %s' % (item.id, item.name)
    
    def from_native(self, item):
        try:
            dj_id = int(item)
        except:
            dj_id = int(item[:item.index(':')])
        return self._model.objects.get(id = dj_id)

class ModelSerialiser(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        kwargs.pop('many', True)
        super(ModelSerialiser, self).__init__(*args, **kwargs)

class Serialiser(serializers.Serializer):
    def __init__(self, *args, **kwargs):
        kwargs.pop('many', True)
        super(Serialiser, self).__init__(*args, **kwargs)

def get_display_apps():
    display_modules = map(lambda m: __import__(m + '.display'), settings.DISPLAY_APPS)
    apps={}
    for app in display_modules:
        apps[app.__name__] = {}
        for ob_name in dir(app.display):
            ob = getattr(app.display, ob_name)
            if inherits_from(ob, 'BaseDisplayModel'):
                apps[app.__name__][ob_name] = ob
                apps[app.__name__][ob_name].app_parent = app.__name__
    return apps

def get_rest_apps():
    display_apps = get_display_apps()
    for disp_app in display_apps.values():
        for model_name in disp_app.keys():
            if not hasattr(disp_app[model_name], 'HotTable'):
                del disp_app[model_name]
        if len(disp_app) == 0:
            del disp_app
    return display_apps

def inherits_from(child, parent_name):
    if inspect.isclass(child):
        if parent_name in [c.__name__ for c in inspect.getmro(child)[1:]]:
            return True
    return False