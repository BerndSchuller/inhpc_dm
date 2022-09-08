/** 
 * Subclass of FileBrowser,
 * with more access to internals as needed for the dm tool
 */

//import { mountIcon } from './dm_icons';

import { 
  DirListing,
  FileBrowser
} from '@jupyterlab/filebrowser';

export class dm_FileBrowser extends FileBrowser {
	
	constructor(options: FileBrowser.IOptions, title: string) {
		super(options);
		this.title.label = title;
	}

	get_listing(): DirListing {
        return this.listing;
    }
    
    get_selected_directory(): string {
        var selected = this.listing.model.path;
    	var item = this.listing.selectedItems().next()
    	if(item){
    	  if(item.type=='directory'){
    	     selected = item.path;
    	  } 
		}
        return selected;
    }
}

