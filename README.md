# inhpc_dm

JupyterLab extension for InHPC-DE data management

WORK IN PROGRESS!

## Requirements

* JupyterLab >= 4.0

## Overview

This extension consists of a front-end part (basically an enhanced filebrowser) and a back-end (server) part,
that has the job of mounting remote file systems and invoking transfer commands.
The InHPC datamanagement extension is based on Jupyter-FS and pyfilesystem.

Remote filesystems can be defined via the plugin settings, and can be selected in the frontend.
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


Alternatively, launch Jupyter with an argument
    
```
    --ServerApp.contents_manager_class=inhpc_dm.metamanager.MetaManager
```

(if this is unclear please refer to the Jupyter documentation)


## Usage

TBD

## Contributing

### Development install

Note: You will need JupyterLab and NodeJS to build the extension package.

To install NodeJS, you can use the package manager on your system, e.g.
on a Debian system:

```
apt install nodejs npm
```


```bash
# Clone the repo to your local environment
# Change directory to the inhpc_dm directory

# Install packages required for development
pip install -r requirements-dev.txt

# Install package
pip install .

# Link your development version of the extension with JupyterLab
jupyter-labextension build .

# Enable server extension
jupyter server extension enable --user inhpc_dm

# Rebuild extension Typescript source after making changes
jlpm run build

# Run Jupyter lab
jupyter-lab
```

### Uninstall

```bash
pip uninstall inhpc_dm
```
