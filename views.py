import test_data.models as m
import HotDjango
from SkeletalDisplay.views import base as skeletal_base
import django.views.generic as generic
from django.db import models
import json
from django.core.urlresolvers import reverse

def table(request):
    content = {}
    return skeletal_base(request, 'Table', content, 'show_table.html', top_active='table')

class TableView(generic.TemplateView):

    template_name = 'handsontable.html'

    def get_context_data(self, **kwargs):
        context = super(TableView, self).get_context_data(**kwargs)
        apps = HotDjango.get_rest_apps()
        app_name = kwargs['app']
        disp_model = apps[app_name][kwargs['model']]
        fields = []
        extra_models = {}
        for field_name in disp_model.Serializer.Meta.fields:
            dj_field = disp_model.model._meta.get_field_by_name(field_name)[0]
            field = {'header': dj_field.verbose_name, 'name': field_name, 'type': 'normal'}
            if isinstance(dj_field, models.TextField):
                field['type'] = 'long'
            if isinstance(dj_field, models.ForeignKey):
                field['type'] = 'foreign_key'
                mod = dj_field.rel.to
                field['model'] = mod.__name__
                extra_models[mod.__name__] = self._add_model(mod)
            fields.append(field)
        context['main_json_url'] = '%s.json' % reverse('rest-%s.%s-list' % (app_name, disp_model.__name__))
        context['column_json'] = json.dumps(fields)
        context['extra_models_json'] = json.dumps(extra_models)
        return context
    
    def _add_model(self, model):
        return ['%d: %s' % id_name for id_name in model.objects.all().values_list('id', 'name')]