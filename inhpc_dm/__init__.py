import json
from jupyter_server.utils import url_path_join
from pathlib import Path
import warnings

from .handlers import setup_handlers
from .metamanager import MetaManagerShared, MetaManager, MetaManagerHandler
from ._version import __version__

_mm_config_warning_msg = """Misconfiguration of MetaManager. Please add:

"ServerApp": {
  "contents_manager_class": "inhpc_dm.metamanager.MetaManager"
}

to your Notebook Server config."""


HERE = Path(__file__).parent.resolve()

with (HERE / "labextension" / "package.json").open() as fid:
    data = json.load(fid)


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": data["name"]}]


def _jupyter_server_extension_points():
    return [{"module": "inhpc_dm"}]


def _load_jupyter_server_extension(serverapp):
    """Registers the API handler to receive HTTP requests from the frontend extension.
    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """

    if not isinstance(serverapp.contents_manager, MetaManagerShared):
        warnings.warn(_mm_config_warning_msg)
        return


    if isinstance(serverapp.contents_manager_class, type) and not issubclass(serverapp.contents_manager_class, MetaManagerShared):
        serverapp.contents_manager_class = MetaManager
        serverapp.log.info("Configuring inhpc_dm jfs manager as the content manager class")

    resources_url = "inhpc_dm/resources"
    base_url = serverapp.web_app.settings["base_url"]   
    serverapp.log.info("Installing inhpc jfs resources handler on path %s" % url_path_join(base_url, resources_url))
    host_pattern = ".*$"
    serverapp.web_app.add_handlers(
        host_pattern,
        [
            (url_path_join(base_url, resources_url), MetaManagerHandler),
        ],
    )

    setup_handlers(serverapp.web_app, "inhpc_dm")
    serverapp.log.info(
        f"Registered inhpc_dm extension at /inhpc_dm"
    )


# For backward compatibility with the classical notebook
load_jupyter_server_extension = _load_jupyter_server_extension


def open_fs(fs_url, **kwargs):
    """Wrapper around fs.open_fs with {{variable}} substitution"""
    import fs
    from .auth import stdin_prompt

    # substitute credential variables via `getpass` queries
    fs_url = stdin_prompt(fs_url)
    return fs.open_fs(fs_url, **kwargs)
