from base64 import b64encode
from fuse import FUSE
from os import environ
from pyunicore.client import Transport
from pyunicore.uftp import UFTP
from pyunicore.uftpfuse import UFTPDriver
from stat import S_ISDIR
import subprocess

def get_token(credentials):
    """ build authentication token from the supplied credentials """
    username = credentials.get("username", "demouser")
    password = credentials.get("password", "test123")
    token = b64encode(bytes("%s:%s" % (username, password), "ascii")).decode("ascii")
    is_bearer_token = False
    return token, is_bearer_token


def create_uftp_handler(remote_directory, auth_url, credentials):
    """ creates a UFTP handler (not yet authenticated or connected) """
    token, is_bearer_token = get_token(credentials)
    tr = Transport(token, oidc=is_bearer_token)
    return UFTP(tr, auth_url, remote_directory)


def run_fusedriver(host, port, pwd, mount_point, debug=False):
    cmds = ["export PYTHONPATH=%s" % environ.get("PYTHONPATH", ""),
            "export UFTP_PASSWORD=%s" % pwd,
            "python3 -m pyunicore.uftpfuse %s:%s '%s'" % (host, port, mount_point)]
    cmd = ""
    for c in cmds:
        cmd += c + u"\n"
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
    except Exception as e:
        uftp.close()
        error_code = 1
        output = repr(e)
    return error_code, output

