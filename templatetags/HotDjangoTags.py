from django import template
from django.core.urlresolvers import reverse
import HotDjango.rest_views as rest_views

register = template.Library()

@register.tag(name='hot_render')
def hot_render(parser, token):
    try:
        _, app_name, model_name = token.split_contents()
    except ValueError:
        raise template.TemplateSyntaxError('render_table tag requires exactly two arguments, app_name and model_name')
    return HotTableNode(app_name, model_name)

class HotTableNode(template.Node):
    def __init__(self, app_name, model_name):
        self.app_name = template.Variable(app_name)
        self.model_name = template.Variable(model_name)

    def render(self, context):
        t = template.loader.get_template('handsontable.html')
        app_name = self.app_name.resolve(context)
        model_name = self.model_name.resolve(context)
        url = reverse(rest_views.generate_reverse(app_name, model_name) + '-list')
        return t.render(template.Context({'main_json_url': url}))
    
@register.simple_tag
def hot_render_js():
    return template.loader.render_to_string('hot_js.html')
    
@register.simple_tag
def hot_render_css():
    return template.loader.render_to_string('hot_css.html')