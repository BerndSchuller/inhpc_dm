import subprocess


def launch(cmd, args):
    """
    Runs command, returning the child process handle
    """
    
    return subprocess.Popen(cmd, shell=True)
    

class Task():
    """
    Holds info about an asynchronous task, e.g. a long-running download operation
    """
    
    def __init__(self, cmd, parameters={}):
        self.pid = -1
        self.cmd = cmd
        self.parameters = parameters
        self.status = "OK"
        pass

    def json(self):
        return { "pid": self.pid, 
                 "command": self.cmd,
                 "parameters": self.parameters,
                 "status": self.status
                }


