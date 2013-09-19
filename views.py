import HotDjango
import django.views.generic as generic
from django.core.urlresolvers import reverse
from django.core.context_processors import csrf

class AllView(generic.TemplateView):

    template_name = 'all_hot.html'

    def get_context_data(self, **kwargs):
        context = super(AllView, self).get_context_data(**kwargs)
        context.update(base_context(self.request))
        return context

class TableView(generic.TemplateView):
    template_name = 'simple_hot.html'

    def get_context_data(self, **kwargs):
        context = super(TableView, self).get_context_data(**kwargs)
        self._app_name = kwargs['app']
        context['app_name'] = self._app_name
        context['model_name'] = kwargs['model']
        context.update(base_context(self.request))
        return context
    
def base_context(request):
    context = {}
    apps = HotDjango.get_rest_apps()
    context['menu'] = []
    for app_name, app in apps.iteritems():
        for model_name in app.keys():
            context['menu'].append({'name': model_name,
                         'url': reverse('hot-table', kwargs={'app': app_name, 'model': model_name})})
    context['menu'].append({'name': 'Restful API',
                 'url': reverse('all-hot-table') + 'restful'})
    context.update(csrf(request))
    return context