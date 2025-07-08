import argparse
from os import environ, getenv
from pathlib import Path, PurePosixPath
from pyunicore.uftp.uftp import UFTP

from pyunicore.uftp.uftpfs import UFTPFS

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
    if target.startswith("/") and len(target)>1:
        target = target[1:]
    cmd += "--target '%s'" % target
    return cmd


def prepare_rcp_operation(sources, source_fs: UFTPFS, target, target_fs: UFTPFS):
    """ Create command to be executed for a data copy operation.
        Will resolve source/target endpoint, and determine what operation 
        (GET, PUT, RCP) is needed.
        Will authenticate with the stored credentials.
    """
    # remote copy - issue receive-file on target side
    _method = "RCP"
    _rcp_args = [source_fs.host, source_fs.port, source_fs.passwd]
    _host, _port, _pwd = target_fs.host,target_fs.port,target_fs.passwd
    return _create_command(_host, int(_port), _pwd, _method, sources, target, *_rcp_args)


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
            _write_to = _target + "/" + _source.name
            with _write_to.open("wb") as fp:
                uftp_session.ftp.retrbinary('RETR %s' % str(_source), fp.write)
    elif "PUT"==_operation:
        _target = PurePosixPath(args.target)
        is_dir = len(args.sources)>1 or args.target.endswith("/")
        for source in args.sources:
            _source = Path(source)
            _write_to = _target + "/" + _source.name
            with _source.open("rb") as fp:
                uftp_session.ftp.storbinary('STOR %s' % str(_write_to), fp)
    elif "RCP"==_operation:
        _target_dir = args.target
        _rhost, _rport, _rpwd =  args.remote.split(":")
        for source in args.sources:
            _source = Path(source)
            _write_to = _target_dir + "/" + _source.name
            cmd = f"RECEIVE-FILE '{_write_to}' '{_source}' '{_rhost}:{_rport}' '{_rpwd}'"
            uftp_session.ftp.sendcmd(cmd)

if __name__ == "__main__":
    main()
