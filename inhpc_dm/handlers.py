import os
import json

from os.path import abspath, dirname
from pathlib import Path

from notebook.base.handlers import APIHandler
from notebook.utils import url_path_join

from subprocess import Popen
import tornado
import uuid

import inhpc_dm.uftp_handler as uftp_handler

class MountsHandler(APIHandler):
    """
    REST API dealing with mounts
    
    Mount information is stored in a JSON file $HOME/.inhpc/mounts.json

    """
    
    def get_settings_path(self):
        """
            File where the current user preferences for the DM tool are stored
        """
        name = os.environ['HOME']+"/.inhpc/settings.json"
        self.assert_dir_exists(name)
        return name

    def get_mount_info_path(self):
        """
            File where the current mounts are stored
        """
        name = os.environ['HOME']+"/.inhpc/mounts.json"
        self.assert_dir_exists(name)
        return name

    def force_unmount(self, mount_dir):
        child = Popen("fusermount -u %s" % mount_dir, shell=True)
        child.wait()

    def assert_dir_exists(self, name):
        try:
            Path(dirname(name)).mkdir()
        except:
            pass

    def read_mount_info(self):
        try:
            with open(self.get_mount_info_path(), 'r') as f:
                return json.load(f)
        except:
            return {}

    def store_mount_info(self, mount_info):
        with open(self.get_mount_info_path(), 'w') as f:
            f.write(json.dumps(mount_info))

    def write_error(self, status_code, **kwargs):
        """  override to send back error message as JSON content """
        self.set_header("Content-Type", "application/json")
        msg = self._reason
        if "exc_info" in kwargs:
            try:
                msg = msg + " [" + str(kwargs["exc_info"][1]) + "]"
            except:
                pass
        self.finish('{"message": "%s"}' % msg)
       
    @tornado.web.authenticated
    def get(self):
        """
        Get all mounts
        """
        self.finish(json.dumps({"mount_info": self.read_mount_info()}))

    @tornado.web.authenticated
    def post(self):
        """
        Create a new mount
        
        input: JSON object 
           {'protocol': 'uftp',
            'mount_point': 'local_directory',
            ... additional protocol-dependent parameters
           }
        
        Input contains also the protocol-dependent information 
        required to initiate the mount such as remote URL, remote directory etc
        """
        request_data = self.get_json_body()
        
        protocol = request_data.get("protocol", "uftp")
        mount_point = request_data['mount_point']
        if not mount_point.startswith("/"):
            mount_point = os.path.abspath(mount_point)
        self.force_unmount(mount_point)

        if "uftp"==protocol:
            parameters = request_data
            exit_code = uftp_handler.mount(mount_point, parameters)
            id = uuid.uuid4().hex
            mount_info = self.read_mount_info()
            parameters["protocol"] = "uftp"
            mount_info[id] = parameters
            self.store_mount_info(mount_info)
        else:
            raise Exception("No handler for protocol %s", protocol)
        
        data = {"status": "OK", "id": id}
        self.finish(json.dumps(data))


def setup_handlers(web_app, url_path):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]

    # Prepend the base_url so that it works in a JupyterHub setting
    route_pattern = url_path_join(base_url, url_path, "mounts")
    handlers = [(route_pattern, MountsHandler)]
    web_app.add_handlers(host_pattern, handlers)
