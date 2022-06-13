from base64 import b64encode
from fuse import FUSE
from os import environ
from pyunicore.client import Transport
from pyunicore.uftp import UFTP
from pyunicore.uftpfuse import UFTPDriver
from subprocess import Popen

def get_token(credentials):
    """ build authentication token from the supplied credentials """
    username = credentials.get("username", "demouser")
    password = credentials.get("password", "test123")
    token = b64encode(bytes("%s:%s" % (username, password), "ascii")).decode("ascii")
    is_bearer_token = False
    
    return token, is_bearer_token
    
def authenticate(remote_directory, auth_url, credentials):
    """ authenticate to a UFTP auth server 
    
    returns a tuple (server_host, server_port, one-time-password)
    """
    
    token, is_bearer_token = get_token(credentials)
    tr = Transport(token, oidc=is_bearer_token)
    uftp = UFTP(tr, auth_url, remote_directory)
    return uftp.authenticate()


def run_fusedriver(host, port, pwd, mount_point, debug=False):
    cmds = ["export PYTHONPATH=%s" % environ.get("PYTHONPATH", ""),
            "export UFTP_PASSWORD=%s" % pwd,
            "python3 -m pyunicore.uftpfuse %s:%s '%s'" % (host, port, mount_point)]
    cmd = ""
    for c in cmds:
        cmd += c + u"\n"
    child = Popen(cmd, shell=True)
    child.wait()


def mount(mount_directory, parameters):
    """
    Authenticates to UFTPD and mounts the requested directory
    """
    auth_url = parameters['endpoint']
    remote_directory = parameters['remote_directory']
    mount_point = parameters['mount_point']
    credentials = parameters.get('credentials', {})
    if ""==remote_directory:
        raise Exception("Illegal Argument: remote directory '%s' does not exist." % remote_directory)
    (host, port, pwd) = authenticate(remote_directory, auth_url, credentials)
    run_fusedriver(host, port, pwd, mount_point)

