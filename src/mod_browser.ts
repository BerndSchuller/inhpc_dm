/** 
 * Subclass of FileBrowser,
 * with more access to internals as needed for the dm tool
 */
import { 
  DirListing,
  FileBrowser
} from '@jupyterlab/filebrowser';

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
    	if(item && item.value){
    	  if(item.value.type=='directory'){
    	     selected = item.value.path;
    	  } 
		}
        return selected;
    }

	getCurrentPath(): string {
		return this.listing.model.path;
	}
}

