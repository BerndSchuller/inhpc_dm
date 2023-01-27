import {
    Dialog,
    ToolbarButton,
    showDialog,
    showErrorMessage
  } from '@jupyterlab/apputils';
  
  import { 
    addIcon,
    clearIcon,
  } from '@jupyterlab/ui-components';
  
  import { dm_FileBrowser } from './mod_browser';
  
  import { requestAPI } from './dm_handler';
  
  import { getMountInfo } from './dm_dialogs';
  
  import { each} from '@lumino/algorithm';

/**
 * Button for mounting remote FS
 */
export class dm_MountButton extends ToolbarButton {

	constructor(fb: dm_FileBrowser, endpoints: string[]){
		super( {
          icon: addIcon,
	      tooltip: 'Mount remote filesystem via UFTP',
	      onClick: () => { this.handle_click(fb, endpoints); }
	    });
	}
	
	handle_click(fb: dm_FileBrowser, endpoints: string[]){
	    console.log(this);
        var mountDirectory = fb.getSelectedDirectory();
        console.log("Mount dir: " + mountDirectory);
        getMountInfo(endpoints, mountDirectory).then(async value => {
          var req_data = JSON.stringify(value.value);
          if(req_data!="null") {
            console.log('mount params: ' + req_data);
            // perform POST request
            try {
      		  const data = await requestAPI<any>('mount', {
      		      'body': req_data,
      		      'method': 'POST'});
      		  console.log(data);
      		  if("OK" == data.status) {
      		  	showDialog({ title: "OK", body: "Mount successful",
      		  	             buttons: [ Dialog.okButton() ] });
      		  	// TODO: change directory on fb to new mount dir
              //await fb.getListing().model.cd("/");
              //await fb.getListing().model.cd(mountDirectory);
      		  }
      		  else{
	      		showErrorMessage("Error", data.error_info);
	      	  }
      	    } catch (reason) {
      		    console.error(`Error on POST /inhpc_dm/mount".\n${reason}`);
      		    showErrorMessage("Error", reason);
    	    }
    	  } else {
    	    console.log('Mount cancelled');
    	  }
	    });
	}
} // end dm_MountButton


/**
 * Button for un-mounting remote FS
 */
export class dm_UnmountButton extends ToolbarButton {

	constructor(fb: dm_FileBrowser){
		super( {
          icon: clearIcon,
	      tooltip: 'Unmount remote filesystem',
	      onClick: () => { this.handle_click(fb); }
	    });
	}
	
	async handle_click(fb: dm_FileBrowser){
	    console.log(this);
        var mountDirectory = fb.getSelectedDirectory();
        var req_data = JSON.stringify({ 'mount_point': mountDirectory })
        console.log('mount params: ' + req_data);
        try {
      	  const data = await requestAPI<any>('unmount', {
      	     'body': req_data,
      	     'method': 'POST'});
      	  console.log(data);
      	  if("OK" == data.status) {
      	    showDialog({ title: "OK", body: "Unmount successful",
      	 	             buttons: [ Dialog.okButton() ] });
      	 	// TODO trigger model refresh
          //fb.getListing().update;
          //fb.update;
      	  }
      	  else{
	        showErrorMessage("Error", data.error_info);
	      }
      	} catch (reason) {
      	    console.error(`Error on POST /inhpc_dm/unmount".\n${reason}`);
      	    showErrorMessage("Error", reason);
    	}
	}
} // end dm_UnmountButton

/**
 * Button for launching copy task
 */
export class dm_CopyButton extends ToolbarButton {

	constructor(source: dm_FileBrowser, target: dm_FileBrowser, label: string, tooltip: string){
		super( {
          label: label,
	      tooltip: tooltip,
	      onClick: () => { this.handle_click(source, target); }
	    });
	}
	
	async handle_click(source: dm_FileBrowser, target: dm_FileBrowser){
	    var _action = "copy";
	    var _target_dir = target.getSelectedDirectory();
	    var _sources: string[] = []
	    each(source.getListing().selectedItems(), item => {
		      _sources.push(item.path)
        });
		var req_data = JSON.stringify({
						"command": _action,
		                "parameters": { 
		                    "target" : _target_dir,
		                    "sources": _sources }
		                })	
        console.log('Copy command params: ' + req_data);
        try {
      	  const data = await requestAPI<any>('tasks', {
      	     'body': req_data,
      	     'method': 'POST'});
      	  console.log(data);
      	  if("OK" == data.status) {
      	    showDialog({ title: "OK", body: "Task launched successfully",
      	 	             buttons: [ Dialog.okButton() ] });
      	  }
      	  else{
	        showErrorMessage("Error", data.error_info);
	      }
      	} catch (reason) {
      	    console.error(`Error on POST /inhpc_dm/tasks".\n${reason}`);
      	    showErrorMessage("Error", reason);
    	}
	}
} // end dm_CopyButton