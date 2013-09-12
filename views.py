# import test_data.models as m
import SkeletalDisplay
from SkeletalDisplay.views import base as skeletal_base
# import settings, os

def table(request):
    content = {}
    apps = SkeletalDisplay.get_display_apps()
    return skeletal_base(request, 'Table', content, 'show_table.html', apps, top_active='table')