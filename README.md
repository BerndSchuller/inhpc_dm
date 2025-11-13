# inhpc_dm

JupyterLab extension for InHPC-DE data management

WORK IN PROGRESS!

## Requirements

* JupyterLab >= 4.0

## Overview

This extension consists of a front-end part (basically an enhanced filebrowser) and a back-end (server) part,
that has the job of mounting remote file systems and invoking transfer commands.
The InHPC datamanagement extension is based on Jupyter-FS and pyfilesystem.

When remote filesystems are defined via the plugin settings, they can be selected in the frontend.
Then, operations on these remote file systems can be performed.


## Installation

The extension can be installed from PyPI with

```
pip install -U inhpc_dm
```

To enable the extension, you have two options.

The first option is to locate the Jupyter server config file, e.g
`~/.jupyter/jupyter_server_config.json`, and add the following

```    
    "ServerApp": {
      "contents_manager_class": "inhpc_dm.metamanager.MetaManager"
    }
```

if the file does not exist, you can create it yourself.

Alternatively - especially if you are using a virtual environment - launch Jupyter with the argument
    
```
    --ServerApp.contents_manager_class=inhpc_dm.metamanager.MetaManager
```

For example
```
  jupyter-lab --ServerApp.contents_manager_class=inhpc_dm.metamanager.MetaManager
```

(for more information, please refer to the Jupyter documentation)


## Usage

### Adding backends (remote file systems)

In the Jupyter Settings Editor (find it at the main menu at "Settings/Settings Editor"), locate the
"InHPC Datamanagement" section.

Under "Resources" you can now add or edit remote (or local) file system URLs.

For example, to add a local directory, you can use the URL `osfs:///path/to/local/dir`


UFTP is supported via

```
 uftp://[username:password]@uftp_auth_server_url:directory?[token=...|identity=....]
```

supporting different means of authentication. Choose one of:

 - `username:password`
 - `token=...` : OAuth token
 - `username:passphrase` and `identity=path/to/private_key` the remote user name and a path to
   a private key file. You can use `~` to refer to your HOME on the server where Jupyter is running.
   If the key is password-less, leave the passphrase empty.

You can use `{{VARIABLE}}` elements in the URL, in that case the extension will open a dialog where you can enter
value(s) for those variables..

### The main InHPC Datamanagement window

The main window is launched either from the Launcher, or via the command palette.

It is structured into two windows. For each of the sides, you can select one of the beforehand configured
file systems by clicking the "+" icon at the top.

After selecting a file system, a context menu (right click), as well as the buttons
in the top toolbars on each side give you access to a number of features, such as opening files,
renaming etc.

To trigger a data movement, select file(s) on one side, and click on the appropriate arrow
in the middle toolbar. The datamanagement extension will choose the optimal way of transfer.

In the bottom of the view, there is a list of transfer actions with a bit of information.


## Contributing

### Development install

Note: You will need JupyterLab, npm  and NodeJS to build the extension package.

To install NodeJS and npm, you can use the package manager on your system, e.g.
on a Debian system:

```
apt install nodejs npm
```


```bash
# Clone the repo to your local environment
# Change directory to the inhpc_dm directory

# Install packages required for development e.g. JupyterLab
pip install -r requirements-dev.txt

# Install package
pip install .

# Start the extension by starting JupyterLab e.g. with the argument
jupyter-lab --ServerApp.contents_manager_class=inhpc_dm.metamanager.MetaManager

# You can alternatively add this in the config file (see above in the installation section)
```

optionally you can do these steps before starting JupyterLab:
```bash

# Link your development version of the extension with JupyterLab
jupyter-labextension build .

# Enable server extension
jupyter server extension enable --user inhpc_dm

# Rebuild extension Typescript source after making changes
jlpm run build

# Run Jupyter lab
jupyter-lab --ServerApp.contents_manager_class=inhpc_dm.metamanager.MetaManager
```

### Uninstall

```bash
pip uninstall inhpc_dm
```
