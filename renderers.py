from rest_framework.renderers import JSONRenderer

class JavascriptRenderer(JSONRenderer):
    media_type = 'application/javascript'
    format = 'js'
    
    def render(self, data, accepted_media_type=None, renderer_context=None):
        json_str = super(JavascriptRenderer, self).render(data, accepted_media_type, renderer_context)
        return 'var django_rest_data = %s;' % json_str