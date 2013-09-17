import test_data.models as m
import HotDjango
from SkeletalDisplay.views import base as skeletal_base
import django.views.generic as generic
from django.db import models
import json
from django.core.urlresolvers import reverse
import settings
import HotDjango.rest_views as rest_views
from django.core.context_processors import csrf

def table(request):
    content = {}
    return skeletal_base(request, 'Table', content, 'show_table.html', top_active='table')

class AllView(generic.TemplateView):

    template_name = 'all_tables.html'

    def get_context_data(self, **kwargs):
        context = super(AllView, self).get_context_data(**kwargs)
        apps = HotDjango.get_rest_apps()
        context['tables'] = []
        for app_name, app in apps.iteritems():
            for model_name in app.keys():
                context['tables'].append({'name': '%s: %s' % (app_name, model_name),
                             'url': reverse('hot-table', kwargs={'app': app_name, 'model': model_name})})
        context.update(base_context(self.request))
        return context

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
        context['main_json_url'] = reverse(rest_views.generate_reverse(app_name, disp_model.__name__) + '-list')
        context['column_json'] = json.dumps(fields)
        context['extra_models_json'] = json.dumps(extra_models)
        context.update(base_context(self.request))
        return context
    
    def _add_model(self, model):
        return ['%d: %s' % id_name for id_name in model.objects.all().values_list('id', 'name')]
    
def base_context(request, top_active=None):
    top_menu = []
    for item in settings.TOP_MENU:
        menu_item = {'url': reverse(item['url']), 'name': item['name']}
        if item['url'] == top_active:
            menu_item['class'] = 'active'
        top_menu.append(menu_item)
    if request.user.is_staff:
        top_menu.append({'url': reverse('admin:index'), 'name': 'Admin'})
    else:
        top_menu.append({'url': reverse('logout'), 'name': 'Logout'})
    site_title = settings.SITE_TITLE
    context = {'top_menu': top_menu, 'site_title': site_title}
    context.update(csrf(request))
    return context