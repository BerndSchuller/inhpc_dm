

update:
	pip uninstall --yes inhpc_dm
	pip install .
	jupyter-labextension build .
	jupyter server extension enable --user inhpc_dm

clean:
	find -name "*~" --delete
