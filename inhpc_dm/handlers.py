import os
import json

from notebook.base.handlers import APIHandler
from notebook.utils import url_path_join

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
        return os.environ['HOME']+"/.inhpc/settings.json"

    def get_mount_info_path(self):
        """
            File where the current mounts are stored
        """
        return os.environ['HOME']+"/.inhpc/mounts.json"

    def read_mount_info(self):
        with open(self.get_mount_info_path(), 'r') as f:
            return json.load(f)

    def store_mount_info(self, mount_info):
        with open(self.get_mount_info_path(), 'w') as f:
            f.write(json.dumps(mount_info))
        
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
        
        if "uftp"==protocol:
            parameters = request_data
            uftp_handler.mount(mount_point, parameters)
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
