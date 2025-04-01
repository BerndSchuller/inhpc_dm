from os import waitpid, WNOHANG
import datetime
import subprocess
import threading
import time
from fs.base import FS
from sys import maxsize

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
                if type(task.child) is threading.Thread:
                    t: threading.Thread = task.child
                    if not t.is_alive():
                        task.status = "RUNNING"
                else:
                    try:
                        (_pid, _status) = waitpid(task.child.pid, WNOHANG)
                        if _pid!=0:
                            task.status = "FINISHED"
                    except ChildProcessError as cpe:
                        print(cpe)
            time.sleep(5)


class Task():
    """
    A single asynchronous task, e.g. a long-running download operation
    """
    
    def __init__(self, cmd, source, target):
        self.child = None
        self.cmd = cmd
        self.status = "RUNNING"
        self.source = source
        self.target = target
        self.started = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def json(self):
        return { "pid": self.child.pid,
                 "Command": self.cmd,
                 "Status":  self.status,
                 "Started": self.started,
                 "Source":  self.source,
                 "Target":  self.target
                }

    def launch(self):
        """
        Runs command
        """
        self.child = subprocess.Popen(self.cmd, shell=True)
        

class CopyOperation():
    """
    A single data copy operation running as a subthread
    """

    def __init__(self, source: str, source_fs: FS, target: str, target_fs: FS):
        self.child: threading.Thread = None
        self.status = "OK"
        self.source_fs = source_fs
        self.source_path = source
        self.target_fs = target_fs
        self.target_path = target
        self.started = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def json(self):
        return { "pid": self.child.ident, 
                 "Command": "n/a",
                 "Status":  self.status,
                 "Started": self.started,
                 "Source":  self.source_path,
                 "Target":  self.target_path
                }

    def launch(self):
        self.child = threading.Thread(target=self._copy_data,
                              daemon=True,
                              args=())
        self.child.start()

    def _copy_data(self, num_bytes = -1):
        buffer_size = 16384
        total = 0
        start_time = int(time.time())
        with (
            self.source_fs.openbin(self.source_path, "r") as source, 
            self.target_fs.openbin(self.target_path, "w") as target
        ):
            if num_bytes<0:
                num_bytes = maxsize
            while total<num_bytes:
                length = min(buffer_size, num_bytes-total)
                data = source.read(length)
                to_write = len(data)
                if to_write==0:
                    break
                write_offset = 0
                while to_write>0:
                    written = target.write(data[write_offset:])
                    if written is None:
                        written = 0
                    write_offset += written
                    to_write -= written
                total = total + len(data)
        return total, int(time.time()) - start_time