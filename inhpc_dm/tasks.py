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
                    if t.is_alive():
                        task.status = "RUNNING"
                else:
                    try:
                        (_pid, _status) = waitpid(task.child.pid, WNOHANG)
                        if _pid!=0:
                            task.status = "FINISHED"
                    except ChildProcessError as cpe:
                        task.status_message = "f{cpe}"
                        print(cpe)
            time.sleep(5)


class Task():
    """
    A single asynchronous task, e.g. a long-running download operation
    """
    
    def __init__(self, cmd, source, target):
        self.child = None
        self.cmd = cmd
        self.status = "PENDING"
        self.status_message = ""
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

    def __init__(self, sources: str, source_fs: FS, target_dir: str, target_fs: FS):
        self.child: threading.Thread = None
        self.status = "PENDING"
        self.status_message = ""
        self.source_fs = source_fs
        self.sources = sources
        self.target_fs = target_fs
        self.target_dir = target_dir
        if self.target_dir.endswith("/"):
            self.target_dir = self.target_dir[:-1]
        if len(self.target_dir)==0:
            self.target_dir = "."
        self.started = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def json(self):
        return { "pid": self.child.ident, 
                 "Command": "n/a",
                 "Status":  self.status,
                 "StatusMessage": self.status_message,
                 "Started": self.started,
                 "Source":  self.sources,
                 "Target":  self.target_dir
                }

    def launch(self):
        self.child = threading.Thread(target=self.copy,
                              daemon=True,
                              args=())
        self.child.start()


    def copy(self):
        for source_path in self.sources:
            target_path = self.target_dir + "/" + source_path
            self._copy_data(source_path, target_path)

    def _copy_data(self, source_path, target_path, num_bytes = -1):
        buffer_size = 16384
        total = 0
        start_time = int(time.time())
        to_read = num_bytes if num_bytes>-1 else maxsize
        try:
            with (
                self.source_fs.openbin(source_path, "r") as source, 
                self.target_fs.openbin(target_path, "w") as target
            ):
                while total<to_read:
                    length = min(buffer_size, to_read-total)
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
            self.status = "FINISHED"
        except EOFError as e:
            if num_bytes>-1:
                self.status = "FAILED"
                self.status_message = f"Premature end of data, expected {num_bytes}, got {total}"
            else:
                self.status = "FINISHED"
        except Exception as e:
            self.status = "FAILED"
            self.status_message = f"{type(e).__name__}: {e}"
            print("Error: "+self.status_message)
        return total, int(time.time()) - start_time