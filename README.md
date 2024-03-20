# inhpc_dm

JupyterLab extension for InHPC-DE data management

WORK IN PROGRESS!

## Requirements

* JupyterLab >= 4.0

## Overview

This extension consists of a front-end part (basically an enhanced filebrowser) and a back-end (server) part,
that has the job of mounting remote file systems and invoking transfer commands.


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
