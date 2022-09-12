/** 
 * Subclass of FileBrowser,
 * with more access to internals as needed for the dm tool
 */

//import { mountIcon } from './dm_icons';

import { 
  DirListing,
  FileBrowser
} from '@jupyterlab/filebrowser';

//import { PathExt } from '@jupyterlab/coreutils';

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

	copyFileFrom(pathToFile : string): void {
		/*
		var here = this.listing.model.driveName;

		var prefix = this.listing.model.driveName;
		console.log("I'm here: " + here);
		console.log("File is here: " + (prefix + pathToFile));

		this.listing.model.cd(PathExt.dirname(prefix + pathToFile));
		console.log("i want to go to: " + PathExt.dirname(prefix + pathToFile));
		console.log("I want to be here: " + (prefix + pathToFile) + " but I'm here: " + this.listing.model.path);
		this.listing.clearSelectedItems();
		this.selectItemByName(PathExt.basename(prefix + pathToFile)).catch(() => {
			console.log("File " + (prefix + pathToFile) + " not found!");
		});
        this.copy();

		this.listing.model.cd(here);
        this.paste();
		*/
	}
}

