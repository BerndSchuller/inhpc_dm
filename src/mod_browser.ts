/** 
 * Subclass of FileBrowser,
 * with more access to internals as needed for the dm tool
 */

//import { mountIcon } from './dm_icons';

import { 
  DirListing,
  FileBrowser
} from '@jupyterlab/filebrowser';

import { PathExt } from '@jupyterlab/coreutils';

export class dm_FileBrowser extends FileBrowser {
	
	constructor(options: FileBrowser.IOptions, title: string) {
		super(options);
		this.title.label = title;
	}

	getListing(): DirListing {
        return this.listing;
    }
    
    getSelectedDirectory(): string {
        var selected = this.listing.model.path;
    	var item = this.listing.selectedItems().next()
    	if(item){
    	  if(item.type=='directory'){
    	     selected = item.path;
    	  } 
		}
        return selected;
    }

	getCurrentPath(): string {
		return this.listing.model.path;
	}

	async copyFileFrom(pathToFile : string): Promise<void> {
		
		/*(var goTo = this.listing.model.manager.services.contents.resolvePath(
			this.listing.model.path,
			pathToFile
		);*/
		//var here = this.listing.model.driveName;
		//var prefix = this.listing.model.driveName;

		console.log("File is: " + pathToFile);

		/*const { services } = this.listing.model.manager;
		const localPath = services.contents.localPath(pathToFile);
		console.log("New way: " + localPath);*/
		//this.listing.model.cd(PathExt.dirname(prefix + pathToFile));

		var actualPath = this.getCurrentPath();
		console.log("I'm here: " + this.getCurrentPath());
		
		//moving to the files path
		await this.listing.model.cd("/");

		let pathWithOutFile : string
		pathWithOutFile = PathExt.dirname(pathToFile);
		await this.listing.model.cd(pathWithOutFile);
		//this.update;
		console.log("I'm here: " + this.getCurrentPath());//this.listing.model.path);

		this.listing.clearSelectedItems();

		var file = (PathExt.basename(pathToFile));
		this.selectItemByName(file).catch(() => {
			console.log("File " + (PathExt.basename(pathToFile)) + " on path " + (pathToFile) + " not found!");
		});

		console.log(file+ " is selected ");
        this.copy();
		console.log( "copied ");
		console.log(" preparing for cd to "+ actualPath);
		await this.listing.model.cd("/");
		console.log("I'm here: " + this.getCurrentPath());
		await this.listing.model.cd(actualPath);
		console.log("I'm here: " + this.getCurrentPath());
        this.paste();
		//console.log(file+ " is pasted ");
	}
/*
	async function navigateToPath(
		path: string,
		factory: IFileBrowserFactory,
		translator: ITranslator
	  ): Promise<Contents.IModel> {

		const trans = translator.load('jupyterlab');
		const browserForPath = Private.getBrowserForPath(path, factory);
		if (!browserForPath) {
		  throw new Error(trans.__('No browser for path'));
		}
		
		const { services } = getListing().model.manager;
		const localPath = services.contents.localPath(path);
	
		await services.ready;
		const item = await services.contents.get(path, { content: false });
		const { model } = browserForPath;
		await model.restored;
		if (item.type === 'directory') {
		  await model.cd(`/${localPath}`);
		} else {
		  await model.cd(`/${PathExt.dirname(localPath)}`);
		}
		return item;
	  }*/
}

