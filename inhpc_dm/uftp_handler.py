from base64 import b64encode
from fuse import FUSE
from os import environ
from pyunicore.client import Transport
from pyunicore.credentials import create_credential
from pyunicore.uftp import UFTP
from pyunicore.uftpfuse import UFTPDriver

from stat import S_ISDIR
import subprocess


def _setup_credential(credentials):
    # cleanup credential data we got from the UI side
    _user = credentials.get("username", "")
    if len(_user)==0:
        _user = None
    _password = credentials.get("password", "")
    if len(_password)==0:
        _password = None
    _token = credentials.get("token", "")
    if len(_token)==0:
        _token = None
    _identity = credentials.get("identity", "")
    if len(_identity)==0:
        _identity = None
    return create_credential(username = _user,
                             password = _password,
                             token = _token,
                             identity = _identity)


def create_uftp_handler(remote_directory, auth_url, credentials):
    """ creates a UFTP handler (not yet authenticated or connected) """
    credential = _setup_credential(credentials)
    return UFTP(Transport(credential), auth_url, remote_directory)


def run_fusedriver(host, port, pwd, mount_point, debug=False):
    cmds = ["export PYTHONPATH=%s" % environ.get("PYTHONPATH", ""),
            "export UFTP_PASSWORD=%s" % pwd,
            "python3 -m pyunicore.uftpfuse %s:%s '%s'" % (host, port, mount_point)]
    cmd = ""
    for c in cmds:
        cmd += c + u"\n"
    return run_command(cmd)


def run_command(cmd):
    try:
        raw_output = subprocess.check_output(cmd, shell=True, bufsize=4096,
                                             stderr=subprocess.STDOUT)
        exit_code = 0
    except subprocess.CalledProcessError as cpe:
        raw_output = cpe.output
        exit_code = cpe.returncode
    return exit_code, raw_output.decode("UTF-8")

def mount(mount_directory, parameters):
    """
    Authenticates to UFTPD and mounts the requested directory
    """
    auth_url = parameters['endpoint']
    remote_directory = parameters['remote_directory']
    mount_point = parameters['mount_point']
    credentials = parameters.get('credentials', {})
    try:
        uftp = create_uftp_handler(remote_directory, auth_url, credentials)
        (host, port, pwd) = uftp.authenticate()
        uftp.open_uftp_session(host, port, pwd)
        # avoid launching FUSE driver after an error during connect
        st = uftp.stat(".")
        error_code, output = run_fusedriver(host, port, pwd, mount_point)
    except Exception as ex:
        uftp.close()
        error_code = 1
        output = repr(ex)
    return error_code, output


def unmount(parameters):
    """
    Unmounts the requested directory
    """
    try:
        cmd = "fusermount -u '%s'" % parameters['mount_point']
        error_code, output = run_command(cmd)
    except Exception as ex:
        error_code = 1
        output = repr(ex)
    return error_code, output
