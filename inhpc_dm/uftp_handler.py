import argparse
from base64 import b64encode
from fuse import FUSE
from os import environ, getenv
from pathlib import Path, PosixPath, PurePosixPath
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


def run_fusedriver(host, port, pwd, mount_point, debug=False):
    cmds = ["export PYTHONPATH=%s" % environ.get("PYTHONPATH", ""),
            "export UFTP_PASSWORD=%s" % pwd,
            "python3 -m pyunicore.uftpfuse %s:%s '%s'" % (host, port, mount_point)]
    cmd = ""
    for c in cmds:
        cmd += c + u"\n"
    return _run_command(cmd)


def _resolve_mount_point(directory, mount_info):
        """ find and return the mount info which contains the given directory """
        lookup = list(Path(directory).absolute().parts)
        for id in mount_info:
            m = mount_info.get(id)
            mount_point = list(Path(m.get("mount_point")).parts)
            # check if mount point is a parent dir for our target dir
            if mount_point == lookup[0:len(mount_point)]:
                return m
        # nothing found
        return None

    
def _create_command(host, port, pwd, method, sources, target, rhost, rport, rpwd):
    cmd =  "export PYTHONPATH=%s\n" % environ.get("PYTHONPATH", "")
    cmd += "export UFTP_PASSWORD=%s\n" % pwd
    cmd += f"python3 -m inhpc_dm.uftp_handler {host}:{port} -X {method} "
    if method=="RCP":
        cmd += f"-R {rhost}:{rport}:{rpwd} "
    if len(sources)<1:
        raise ValueError("Need sources")
    cmd += "--sources "
    for source in sources:
        cmd += "'%s' " % source
    cmd += "--target '%s'" % target
    return cmd

def _run_command(cmd):
    try:
        raw_output = subprocess.check_output(cmd, shell=True, bufsize=4096,
                                             stderr=subprocess.STDOUT)
        exit_code = 0
    except subprocess.CalledProcessError as cpe:
        raw_output = cpe.output
        exit_code = cpe.returncode
    return exit_code, raw_output.decode("UTF-8")

def _relative_path(full, base):
    return str(PosixPath(full).absolute().relative_to(PosixPath(base)))


def prepare_data_move_operation(sources, target, mount_info):
    """ Create command to be executed for a data copy operation.
        Will resolve source/target endpoint, and determine what operation 
        (GET, PUT, RCP) is needed.
        Will authenticate with the stored credentials.
    """
    _target_mount = _resolve_mount_point(target, mount_info)
    _source_mount = _resolve_mount_point(sources[0], mount_info)
    _rcp_args = [None,None,None]
    if _source_mount is None:
        _method = "PUT"
        _mount = _target_mount
        _sources = sources
        _target = _relative_path(target, _mount["mount_point"])+"/"
    elif _target_mount is None:
        _method = "GET"
        _mount = _source_mount
        _target = target
        _sources = [ _relative_path(full, _mount["mount_point"]) for full in sources ]
    else:
        # remote copy - issue receive-file on target side
        _method = "RCP"
        _mount = _target_mount
        _sources = [ _relative_path(full, _source_mount["mount_point"]) for full in sources ]
        _target = _relative_path(target, _target_mount["mount_point"])+"/"
        _rauth_url = _source_mount["endpoint"]
        _rcredentials = _source_mount["credentials"]
        _r_remote_dir = _source_mount["remote_directory"]
        _rhost, _rport, _rpwd = UFTP().authenticate(_setup_credential(_rcredentials), _rauth_url, _r_remote_dir)
        _rcp_args = [_rhost, _rport, _rpwd]
    _auth_url = _mount["endpoint"]
    _credentials = _mount["credentials"]
    _remote_dir = _mount["remote_directory"]
    _host, _port, _pwd = UFTP().authenticate(_setup_credential(_credentials), _auth_url, _remote_dir)
    return _create_command(_host, int(_port), _pwd, _method, _sources, _target, *_rcp_args)

def mount(mount_directory, parameters):
    """
    Authenticates to UFTPD and mounts the requested directory
    """
    auth_url = parameters['endpoint']
    remote_directory = parameters['remote_directory']
    mount_point = parameters['mount_point']
    credentials = parameters.get('credentials', {})
    try:
        uftp = UFTP()
        (host, port, pwd) = uftp.authenticate(
            _setup_credential(credentials), auth_url, remote_directory)
        uftp.open_uftp_session(host, port, pwd)
        # avoid launching FUSE driver after an error during connect
        st = uftp.stat(".")
        error_code, output = run_fusedriver(host, port, pwd, mount_point)
    except Exception as ex:
        error_code = 1
        output = repr(ex)
    return error_code, output


def unmount(parameters):
    """
    Unmounts the requested directory
    """
    try:
        cmd = "fusermount -u '%s'" % parameters['mount_point']
        error_code, output = _run_command(cmd)
    except Exception as ex:
        error_code = 1
        output = repr(ex)
    return error_code, output


def main():
    """ 
    Main function to run download or upload from UFTPD.
    Requires the one-time password from authentication, which must have been done previously
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("address", help="UFTPD server's address (host:port)")
    parser.add_argument("-P", "--password",
                        help="one-time password (if not given, it is expected in the environment UFTP_PASSWORD)")
    parser.add_argument("-X", "--operation", required=True, help="what to do, GET or PUT")
    parser.add_argument("-R", "--remote", required=False,
                        help="Remote copy: host:port:password for accessing source file")
    parser.add_argument(
        "-s",
        "--sources",
        nargs="+",
        help="list of source files")
    parser.add_argument(
        "-t",
        "--target",
        help="target file or directory")

    args = parser.parse_args()
    _host, _port = args.address.split(":")
    _pwd = args.password
    if _pwd is None:
        _pwd = getenv("UFTP_PASSWORD")
    if _pwd is None:
        raise TypeError("UFTP one-time password must be given via --P or as environment UFTP_PASSWORD")
    _operation = args.operation
    if _operation not in ["GET", "PUT", "RCP"]:
        raise TypeError("Not understood: %s" % _operation)

    uftp_session = UFTP()
    uftp_session.open_uftp_session(_host, int(_port), _pwd)

    if "GET"==_operation:
        _target = Path(args.target)
        if len(args.sources)>1:
            if not _target.is_dir():
                raise TypeError("target must be a directory")
        for source in args.sources:
            _source = PurePosixPath(source)
            if _target.is_dir():
                _write_to = _target / _source.name
            else:
                _write_to = _source
            with _write_to.open("wb") as fp:
                uftp_session.ftp.retrbinary('RETR %s' % str(_source), fp.write)
    elif "PUT"==_operation:
        _target = PurePosixPath(args.target)
        is_dir = len(args.sources)>1 or args.target.endswith("/")
        for source in args.sources:
            _source = Path(source)
            if is_dir:
                _write_to = _target / _source.name
            else:
                _write_to = _target
            with _source.open("rb") as fp:
                uftp_session.ftp.storbinary('STOR %s' % str(_write_to), fp)
    elif "RCP"==_operation:
        if len(args.sources)>1:
            raise ValueError("Can only remote copy one file")
        _source = Path(args.sources[0])
        _target = args.target
        _rhost, _rport, _rpwd =  args.remote.split(":")
        cmd = f"RECEIVE-FILE '{_target}/{_source.name}' '{_source}' '{_rhost}:{_rport}' '{_rpwd}'"
        uftp_session.ftp.sendcmd(cmd)

if __name__ == "__main__":
    main()
