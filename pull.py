#!/usr/bin/python

# Script to pull js and css libraries from remote location to static
# so they don't clog up git and the version are clear.
# list of url->file maps are loaded from libaries.json
# Copyright Samuel Colvin 2014

import json, os, urllib2

APP_ROOT = os.path.dirname(os.path.realpath(__file__))

def do_download():
    libs_json_path = os.path.join(APP_ROOT, 'libraries.json')
    url_files = json.load(open(libs_json_path, 'r'))
    downloaded = 0
    ignored = 0
    for url, path in url_files.items():
        print 'DOWNLOADING: %s\n             --> %s...' % (url, path)
        dest = os.path.join(APP_ROOT, path)
        if os.path.exists(dest):
            print 'file already exists at APP_ROOT/%s' % path
            print '*** IGNORING THIS DOWNLOAD ***\n'
            ignored += 1
            continue
        dest_dir = os.path.dirname(dest)
        if not os.path.exists(dest_dir):
            print '     mkdir: %s' % dest_dir
            os.makedirs(dest_dir)
        try:
            response = urllib2.urlopen(url)
            content = response.read()
        except Exception, e:
            print '\nURL: %s\nProblem occured during download: %r' % (url, e)
            print '*** ABORTING ***'
            return
        open(dest, 'w').write(content)
        downloaded += 1
        print 'Successfully downloaded %s\n' % os.path.basename(path)
    
    print 'Finish: %d files downloaded, %d files ignored' % (downloaded, ignored)
    if ignored > 0:
        print 'Delete the lib folder and rerun to download all fresh libaries'

if __name__ == '__main__':
    do_download()