import pyunicore

def mount(mount_directory, parameters):
    """
    Authenticates to UFTPD and mounts the requested directory
    """
    auth_url = parameters['endpoint']
    remote_directory = parameters['remote_directory']
    if ""==remote_directory:
        raise Exception("Illegal Argument: remote directory '%s' does not exist." % remote_directory)
    pass
