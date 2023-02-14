import os
import json

from pathlib import Path

from notebook.base.handlers import APIHandler
from notebook.utils import url_path_join

from subprocess import Popen
import tornado
import uuid

import inhpc_dm.uftp_handler as uftp_handler
import inhpc_dm.tasks as tasks


class AbstractDMHandler(APIHandler):
    """ Abstract base class for dm-tool handlers """
    
    def _get_settings_path(self):
        """
            File where the current user preferences for the DM tool are stored
        """
        settings_dir = os.environ['HOME']+"/.inhpc/"
        self._assert_dir_exists(settings_dir)
        return settings_dir + "settings.json"

    def _get_mount_info_path(self):
        """
            File where the current mounts are stored
        """
        settings_dir = os.environ['HOME']+"/.inhpc/"
        self._assert_dir_exists(settings_dir)
        return settings_dir + "mounts.json"

    def _assert_dir_exists(self, name):
        try:
            target = Path(name);
            if not (target.exists() and target.is_dir()):
                target.mkdir()
        except:
            self.log.error("Cannot create directory: '%s' " % name)

    def read_mount_info(self):
        try:
            with open(self._get_mount_info_path(), 'r') as f:
                return json.load(f)
        except:
            return {}

    def store_mount_info(self, mount_info):
        with open(self._get_mount_info_path(), 'w') as f:
            f.write(json.dumps(mount_info))

    def resolve_mount_point(self, directory, mount_info=None):
        """ find and return the mount info which contains the given directory """
        if mount_info==None:
            mount_info = self.read_mount_info()
        lookup = list(Path(directory).absolute().parts)
        for id in mount_info:
            m = mount_info.get(id)
            mount_point = list(Path(m.get("mount_point")).parts)
            # check if mount point is a parent dir for our target dir
            if mount_point == lookup[0:len(mount_point)]:
                return id, m
        # nothing found
        return None, None

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


class MountHandler(AbstractDMHandler):
    """
    REST API dealing with mount
    
    Mount information is stored in a JSON file $HOME/.inhpc/mounts.json

    """

    def force_unmount(self, mount_dir):
        child = Popen("fusermount -u %s" % mount_dir, shell=True)
        child.wait()


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
            mount_point = str(Path(mount_point).absolute())
            request_data['mount_point'] = mount_point
        self.force_unmount(mount_point)
        self._assert_dir_exists(mount_point)
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


class UnmountHandler(AbstractDMHandler):
    """
    REST API dealing with unmount

    """

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
            mount_point = str(Path(mount_point).absolute())
            request_data['mount_point'] = mount_point
        id, mount = self.resolve_mount_point(mount_point)
        if mount!=None:
            request_data['mount_point'] = mount["mount_point"]
            exit_code, error_info = uftp_handler.unmount(request_data)
        else:
            exit_code, error_info = -1, "Not a mounted directory"
        result_data = { "status": "OK" }
        if exit_code == 0:
            mount_info = self.read_mount_info()
            mount_info.pop(id)
            self.store_mount_info(mount_info)
        else:
            result_data["status"] = "ERROR"
            result_data["exit_code"] = exit_code
            result_data["error_info"] = error_info
        self.finish(json.dumps(result_data))

class TaskHandler(AbstractDMHandler):
    """
    REST API dealing with tasks (copy operations etc)
    """

    @tornado.web.authenticated
    def get(self):
        """
        Get tasks
        """
        self.finish(json.dumps({"tasks": [ t.json() for t in self.application.dm_task_holder.tasks]}))

    @tornado.web.authenticated
    def post(self):
        """
        Launch a new task
        
        input: JSON object 
           {
            "command": "<command_template_name or command>"
            "parameters": [...]
           }
        """
        request_data = self.get_json_body()
        cmd = request_data.get("command", "")
        args = request_data.get("parameters", {})
        if "copy"!=cmd:
            raise ValueError("Not understood: %s" % cmd)
        sources = args["sources"]
        target = args["target"]
        if len(target)==0:
            target = "."
        mount_info = self.read_mount_info()
        id_1, target_mount = self.resolve_mount_point(target, mount_info)
        id_2, source_mount = self.resolve_mount_point(sources[0], mount_info)
        if id_1==None and id_2==None:
            raise ValueError("Neither source nor target are remote")
        if id_1!=None and id_2!=None:
            raise ValueError("Cannot have both remote source and remote target")
        
        cmd = uftp_handler.prepare_data_move_operation(sources, target, mount_info)
        self.log.info("Running: %s" % cmd)
        task = tasks.Task(cmd)
        task.launch()
        self.application.dm_task_holder.add(task)
        result_data = { "status": "OK" }
        self.finish(json.dumps(result_data))

class InfoHandler(AbstractDMHandler):
    """
    Show information about a directory
    """

    @tornado.web.authenticated
    def get(self):
        """
        Get info about a file / directory

        input: URL query parameters
         "file": file path

        """
        requested_file = self.get_argument("file")
        mount_info = self.read_mount_info()
        id_1, target_mount = self.resolve_mount_point(requested_file, mount_info)
        result_data = { "status": "OK" }
        if id_1==None:
            result_data["protocol"] = "local"
        else:
            for key in ["protocol", "endpoint", "remote_directory"]:
                result_data[key] = target_mount[key]
        self.finish(json.dumps(result_data))


def setup_handlers(web_app, url_path):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    handlers = [(url_path_join(base_url, url_path, "mount"), MountHandler),
                (url_path_join(base_url, url_path, "unmount"), UnmountHandler),
                (url_path_join(base_url, url_path, "tasks"), TaskHandler),
                (url_path_join(base_url, url_path, "info"), InfoHandler),
                ]
    web_app.dm_task_holder = tasks.TaskHolder()
    web_app.add_handlers(host_pattern, handlers)
