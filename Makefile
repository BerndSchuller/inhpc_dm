.ONESHELL:

update:
	pip uninstall --yes inhpc_dm
	pip install .
	jupyter-labextension build .
	jupyter server extension enable --user inhpc_dm

jupyter-fs:
	git clone https://github.com/jpmorganchase/jupyter-fs.git
	
setup-jupyter-fs: jupyter-fs
	sed -i "s|file://.*\"|file://$(PWD)/jupyter-fs/js\"|" package.json
	cat <<- EOF >> jupyter-fs/js/src/index.tsx
	// inhpc-dm additions
	export * from './icons.js';
	export * from './contents_proxy.js';
	export * from './treefinder.js';
	export * from './filesystem.js';
	export * from './tokens.js';
	export * from './commands.js';
	EOF
	cd jupyter-fs; pip install .

clean:
	@find -name "*~" -delete

purge-node-js-stuff: clean
	@rm -rf node_modules/*
	@rm yarn.lock
