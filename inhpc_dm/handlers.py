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

from pyunicore.client import Resource
from pyunicore.uftp.uftp import AuthServer
from pyunicore.uftp.uftpfs import UFTPFS


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
        Get info about remote filesystem

        input: URL query parameters
         "drive": drive id

        """
        req_drive = self.get_argument("drive")
        mm: MetaManager = self.serverapp.contents_manager
        req_mgr: FSManager = mm._managers[req_drive]
        req_fs: FS = req_mgr._pyfilesystem_instance
        sharing_support = check_sharing_support(req_fs)
        if type(req_fs) is UFTPFS:
            protocol = "UFTP"
        else:
            protocol = str(type(req_fs))
        result_data = { "status": "OK",
                       "drive": req_drive,
                       "sharing_support": sharing_support,
                       "protocol": protocol }
        self.finish(json.dumps(result_data))

class ShareHandler(AbstractDMHandler):
    """
    Handler for file share operations
    """

    @tornado.web.authenticated
    def get(self):
        """
        List shares

        input: URL query parameters
         "drive": drive id

        """
        req_drive = self.get_argument("drive")
        mm: MetaManager = self.serverapp.contents_manager
        req_mgr: FSManager = mm._managers[req_drive]
        req_fs: FS = req_mgr._pyfilesystem_instance
        sharing_support = check_sharing_support(req_fs)
        result_data = {}
        result_data["status"] = "OK"
        result_data["statusMessage"] = "OK"
        if type(req_fs) is UFTPFS:
            protocol = "UFTP"
        else:
            protocol = str(type(req_fs))
            result_data["status"] = "ERROR"
            result_data["statusMessage"] = "Sharing not supported for '"+protocol+"'"
        if sharing_support:
            share_client = _get_uftp_authserver(req_fs).get_sharing_endpoint()
            shares = share_client.properties["shares"]
            result_data["shares"] = shares
        else:
            result_data["status"] = "ERROR"
            result_data["statusMessage"] = "Sharing not supported for this drive"
            result_data["shares"] = []
        self.finish(json.dumps(result_data))

    @tornado.web.authenticated
    def post(self):
        """
        Create new share

        input: JSON object
           {
             "path": file to share, including drive
             "user": target DN - defaults to 'cn=anonymous,o=unknown,ou=unknown'
             "access": READ, WRITE or NONE, defaults to "READ"
           }
        """
        params = self.get_json_body()
        _drive, _path = params["path"].split("/", 1)
        req_data = {}
        req_data["user"] = params.get("user", "cn=anonymous,o=unknown,ou=unknown")
        req_data["access"] = params.get("access", "READ")
        # TODO: other options
        mm: MetaManager = self.serverapp.contents_manager
        req_mgr: FSManager = mm._managers[_drive]
        req_fs: FS = req_mgr._pyfilesystem_instance
        if type(req_fs) is UFTPFS:
            _path = req_fs.base_path + "/" + _path
            req_data["path"] = _path
            share_client = _get_uftp_authserver(req_fs).get_sharing_endpoint()
            with share_client.transport.post(json=req_data, url = share_client.resource_url) as _response:
                new_share = Resource(share_client.transport, _response.headers["Location"])
                result_data = new_share.properties
                pass
        else:
            raise ValueError("Share not supported")
        self.finish(json.dumps(result_data))


def check_sharing_support(fs):
    if type(fs) is not UFTPFS:
            return None
    return _get_uftp_authserver(fs).is_sharing_supported()

def _get_uftp_authserver(fs: UFTPFS):
    if type(fs) is not UFTPFS:
            return None
    return AuthServer(fs.uftp_auth_credentials, fs.uftp_auth_url)

def setup_handlers(web_app, url_path):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    handlers = [(url_path_join(base_url, url_path, "tasks"), TaskHandler),
                (url_path_join(base_url, url_path, "info"), InfoHandler),
                (url_path_join(base_url, url_path, "share"), ShareHandler),
                ]
    web_app.dm_task_holder = tasks.TaskHolder()
    web_app.add_handlers(host_pattern, handlers)
