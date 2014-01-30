from rest_framework import serializers
import inspect, settings

__version__ = '0.1'

HOT_ID_IN_MODEL_STR = False
if hasattr(settings, 'HOT_ID_IN_MODEL_STR'):
    HOT_ID_IN_MODEL_STR = settings.HOT_ID_IN_MODEL_STR

class _MetaBaseDisplayModel(type):
    def __init__(cls, *args, **kw):
        type.__init__(cls, *args, **kw)
        if cls.__name__ in ('BaseDisplayModel', 'ModelDisplay'):
            return
        assert hasattr(cls, 'model'), '%s is missing a model, all display models must have a model attribute' % cls.__name__
        cls.model_name = cls.model.__name__
        if hasattr(cls, 'HotTable'):
            if hasattr(cls.HotTable, 'Meta'):
                cls.HotTable.Meta.model = cls.model
            else:
                cls.HotTable.Meta = type('Meta', (), {'model': cls.model})

class BaseDisplayModel:
    __metaclass__ = _MetaBaseDisplayModel
    verbose_names = {}

class IDNameSerialiser(serializers.RelatedField):
    read_only = False
    def __init__(self, model, *args, **kwargs):
        self._model = model
        super(IDNameSerialiser, self).__init__(*args, **kwargs)
        
    def to_native(self, item):
        if hasattr(item, 'hot_name'):
            name = item.hot_name()
        else:
            name = str(item)
        if HOT_ID_IN_MODEL_STR:
            return name
        else:
            return '%d: %s' % (item.id, name)
    
    def from_native(self, item):
        try:
            dj_id = int(item)
        except:
            dj_id = int(item[:item.index(':')])
        return self._model.objects.get(id = dj_id)

class ChoiceSerialiser(serializers.Serializer):
    read_only = False
    def __init__(self, choices, *args, **kwargs):
        self._choices = choices
        super(ChoiceSerialiser, self).__init__(*args, **kwargs)
        
    def to_native(self, item):
        return next(choice[1] for choice in self._choices if choice[0] == item)
    
    def from_native(self, item):
        return next(choice[0] for choice in self._choices if choice[1] == item)
    
class ModelSerialiser(serializers.ModelSerializer):
    def save(self, *args, **kwargs):
        if hasattr(self.object, 'hotsave_enabled') and self.object.hotsave_enabled:
            kwargs['hotsave'] = True
        super(ModelSerialiser, self).save(*args, **kwargs)


def get_verbose_name(dm, field_name):
    dj_field = dm.model._meta.get_field_by_name(field_name)[0]
    if hasattr(dj_field, 'verbose_name'):
        return dj_field.verbose_name
    elif field_name in dm.verbose_names:
        return dm.verbose_names[field_name]
    return field_name

def get_all_apps():
    importer = lambda m: __import__(m, globals(), locals(), ['display'], -1)
    display_modules = map(importer, settings.DISPLAY_APPS)
    apps={}
    for app in display_modules:
        app_name = app.display.app_name
        apps[app_name] = {}
        for ob_name in dir(app.display):
            ob = getattr(app.display, ob_name)
            if inherits_from(ob, 'BaseDisplayModel'):
                apps[app_name][ob_name] = ob
                apps[app_name][ob_name]._app_name = app_name
    return apps

def get_rest_apps():
    display_apps = get_all_apps()
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

def is_allowed_hot(user, permitted_groups=None):
    if user.is_staff:
        return True
    if permitted_groups is None:
        permitted_groups = settings.HOT_PERMITTED_GROUPS
        if permitted_groups is 'all':
            return True
    for group in user.groups.all().values_list('name', flat=True):
        if group in permitted_groups:
            return True
    return False