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
import inhpc_dm.tasks as tasks

class MountHandler(APIHandler):
    """
    REST API dealing with mount
    
    Mount information is stored in a JSON file $HOME/.inhpc/mounts.json

    """
    
    def get_settings_path(self):
        """
            File where the current user preferences for the DM tool are stored
        """
        name = os.environ['HOME']+"/.inhpc/settings.json"
        self.assert_dir_exists(dirname(name))
        return name

    def get_mount_info_path(self):
        """
            File where the current mounts are stored
        """
        name = os.environ['HOME']+"/.inhpc/mounts.json"
        self.assert_dir_exists(dirname(name))
        return name

    def force_unmount(self, mount_dir):
        child = Popen("fusermount -u %s" % mount_dir, shell=True)
        child.wait()

    def assert_dir_exists(self, name):
        try:
            target = Path(name);
            if not (target.exists() and target.is_dir()):
                target.mkdir()
        except:
            self.log.error("Cannot create directory: '%s' " % name)

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
            request_data['mount_point'] = mount_point
        self.force_unmount(mount_point)
        self.assert_dir_exists(mount_point)
        if "uftp"==protocol:
            parameters = request_data
            exit_code, error_info = uftp_handler.mount(mount_point, parameters)
            id = uuid.uuid4().hex
            mount_info = self.read_mount_info()
            parameters["protocol"] = "uftp"
            mount_info[id] = parameters
        else:
            raise Exception("No handler for protocol %s", protocol)
        result_data = {}
        if exit_code == 0:
            result_data["status"] = "OK"
            result_data["id"] = id
            self.store_mount_info(mount_info)
        else:
            result_data["status"] = "ERROR"
            result_data["exit_code"] = exit_code
            result_data["error_info"] = error_info
        self.finish(json.dumps(result_data))


class UnmountHandler(APIHandler):
    """
    REST API dealing with unmount

    """
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
    def post(self):
        """
        Un-mount a directory
        
        input: JSON object 
           {
             'mount_point': 'local_directory',
           }
        """
        request_data = self.get_json_body()
        mount_point = request_data['mount_point']
        if not mount_point.startswith("/"):
            mount_point = os.path.abspath(mount_point)
            request_data['mount_point'] = mount_point
        exit_code, error_info = uftp_handler.unmount(request_data)
        result_data = { "status": "OK" }
        if exit_code != 0:
            result_data["status"] = "ERROR"
            result_data["exit_code"] = exit_code
            result_data["error_info"] = error_info
        self.finish(json.dumps(result_data))

class TaskHandler(APIHandler):
    """
    REST API dealing with tasks (copy operations etc)
    """

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
        Get tasks
        """
        self.finish(json.dumps({"tasks": [ t.json() for t in self.application.dm_tool_tasks ]}))

    @tornado.web.authenticated
    def post(self):
        """
        Launch a new task
        
        input: JSON object 
           {
            "cmd": "<command_template_name or command>"
            "args": [...]
           }
        """
        request_data = self.get_json_body()
        cmd = request_data.get("command", "")
        args = request_data.get("parameters", {})
        task = tasks.Task(cmd, args)
        # task.launch()...
        self.application.dm_tool_tasks.append(task)
        result_data = { "status": "OK" }
        self.finish(json.dumps(result_data))


def setup_handlers(web_app, url_path):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    handlers = [(url_path_join(base_url, url_path, "mount"), MountHandler),
                (url_path_join(base_url, url_path, "unmount"), UnmountHandler),
                (url_path_join(base_url, url_path, "tasks"), TaskHandler),
                ]
    web_app.dm_tool_tasks = []
    web_app.add_handlers(host_pattern, handlers)
