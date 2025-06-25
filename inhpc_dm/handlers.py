import os
import json

from pathlib import Path

from jupyter_server.base.handlers import JupyterHandler
from jupyter_server.utils import url_path_join

from .metamanager import MetaManager
from .fsmanager import FSManager
from fs.base import FS

import tornado

import inhpc_dm.uftp_handler as uftp_handler
import inhpc_dm.tasks as tasks

from pyunicore.uftp.uftpfs import UFTPFS
#from pyunicore.uftp.uftpmountfs import UFTPMOUNTFS

class AbstractDMHandler(JupyterHandler):
    """ Abstract base class for dm-tool handlers """
    
    def _get_settings_path(self):
        """
            File where the current user preferences for the DM tool are stored
        """
        settings_dir = os.environ['HOME']+"/.inhpc/"
        self._assert_dir_exists(settings_dir)
        return settings_dir + "settings.json"

    def _assert_dir_exists(self, name):
        try:
            target = Path(name);
            if not (target.exists() and target.is_dir()):
                target.mkdir()
        except:
            self.log.error("Cannot create directory: '%s' " % name)

    def write_error(self, status_code, **kwargs):
        """  override to send back error message as JSON content """
        self.set_header("Content-Type", "application/json")
        msg = self._reason
        if "exc_info" in kwargs:
            try:
                msg = msg + " [" + str(kwargs["exc_info"][1]) + "]"
            except:
                pass
        self.finish('{"message": "%s", "status_code": "%i"}' % (msg, status_code))


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
        if target is None or len(target)==0:
            raise ValueError("No target specified")
        if sources is None or len(sources)==0:
            raise ValueError("No source(s) specified!")
        source_drive, _ = self._resolve(sources[0])
        _sources = []
        for f in sources:
            _sources.append(self._resolve(f)[1])
        self.log.info("Copy %s -> %s" % (_sources, target))

        target_drive, target_dir = self._resolve(target)
        if target_dir.endswith("/"):
            target_dir = target_dir[:-1]
        if len(target_dir)==0:
            target_dir = "."
        mm: MetaManager = self.serverapp.contents_manager
        source_mgr: FSManager = mm._managers[source_drive]
        source_fs: FS = source_mgr._pyfilesystem_instance
        target_mgr: FSManager = mm._managers[target_drive]
        target_fs: FS = target_mgr._pyfilesystem_instance
        self.log.info("Source fsmanager %s" % source_fs)
        self.log.info("Target fsmanager %s" % target_fs)
        transfer_type = None
        if type(source_fs) is UFTPFS and type(target_fs) is UFTPFS:
            transfer_type = "uftp-to-uftp"
        result_data = {}
        if transfer_type=="uftp-to-uftp":
            cmd = uftp_handler.prepare_rcp_operation(_sources, source_fs, target_dir, target_fs)
            self.log.info("Running: uftp-to-uftp copy with command: %s" % cmd)
            task = tasks.Task(cmd, str(sources), str(target_dir))
            task.launch()
            self.application.dm_task_holder.add(task)
            result_data["status"] = "OK"
        else:
            # generic data movement via FS API
            task = tasks.CopyOperation(_sources, source_fs, target_dir, target_fs)
            task.launch()
            task.status = "RUNNING"
            self.application.dm_task_holder.add(task)
            result_data["status"] = "OK"
        self.finish(json.dumps(result_data))

    def _resolve(self, url):
        """ Split url into drive and path """
        return url.split("/",1)

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
    handlers = [(url_path_join(base_url, url_path, "tasks"), TaskHandler),
                (url_path_join(base_url, url_path, "info"), InfoHandler),
                ]
    web_app.dm_task_holder = tasks.TaskHolder()
    web_app.add_handlers(host_pattern, handlers)
