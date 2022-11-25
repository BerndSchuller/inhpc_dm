from os import waitpid, WNOHANG
import subprocess
import threading
import time

class TaskHolder():
    """
    Holds info running asynchronous tasks. Starts a thread that tracks
    child processes and cleans up after they have finished
    """
    def __init__(self):
        self.tasks = []
        self.lock = threading.Lock()
        self.cleanup_thread = threading.Thread(target=self.cleanup,
                              name="Cleanup",
                              daemon=True,
                              args=())
        self.cleanup_thread.start()
    
    def add(self, task):
        self.tasks.append(task)
        
    def cleanup(self):
        while True:
            for task in self.tasks:
                if task.status == "FINISHED":
                    continue
                try:
                    (_pid, _status) = waitpid(task.child.pid, WNOHANG)
                    if _pid!=0:
                        task.status = "FINISHED"
                except ChildProcessError as cpe:
                    print(cpe)
            time.sleep(5)


class Task():
    """
    Holds info about a single asynchronous task, e.g. a long-running download operation
    """
    
    def __init__(self, cmd):
        self.child = None
        self.cmd = cmd
        self.status = "OK"

    def json(self):
        return { "pid": self.child.pid, 
                 "command": self.cmd,
                 "status": self.status
                }

    def launch(self):
        """
        Runs command
        """
        self.child = subprocess.Popen(self.cmd, shell=True)
        
