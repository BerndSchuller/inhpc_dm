import {
    Dialog,
    ToolbarButton,
    showDialog,
    showErrorMessage
  } from '@jupyterlab/apputils';
  
import {
	BoxPanel,
	Widget
} from '@lumino/widgets';

import { 
    addIcon,
	infoIcon,
	LabIcon,
	refreshIcon,
	shareIcon
  } from '@jupyterlab/ui-components';

import { requestAPI } from './dm_handler';

import { selectEndpoint } from './dm_dialogs';

import { dm_SharesTable, dm_TransfersTable } from './dm_tables';

import { dm_FileTreePanel } from './dm_filetree';

/**
 * Button for selecting remote FS
 */
export class dm_SelectEndpointButton extends ToolbarButton {

	constructor(fb: dm_FileTreePanel){
		super( {
          icon: addIcon,
	      tooltip: 'Choose remote filesystem',
	      onClick: () => { this.handle_click(fb); }
	    });
	}
	
	/**
	 * gets the list of available resources, and opens a dialog
	 * allowing the user to select one of them
	 */
	async handle_click(fb: dm_FileTreePanel){
	    try {
			const data: Array<Object> = await requestAPI<any>('inhpc_dm/resources', {
				'method': 'GET'});
			console.log(data);
			const names: Array<string> = [];
			const tooltips: Array<string> = [];
			data.forEach( (v: any) => {
				names.push(v['name']);
				tooltips.push(v['url']);
			});
			const selection = await selectEndpoint(names, tooltips);
			const name = selection.value;
			if (name==null)
				return;
			let url:string;
			let drive:string;
			data.forEach( (v: any) => {
				if(name===v['name']){
					drive = v['drive'];
					url = v['url'];
				}
			});
			console.log(`Selected drive = ${drive}`);
			fb.setEndpoint(url, drive, name);
		} catch (reason) {
			console.error(`Error on GET /inhpc_dm/resources: ${reason}`);
			showErrorMessage("Error", `${reason}`);
		}
	}
} // end dm_SelectEndpointButton

/**
 * Button for launching copy task
 */
export class dm_CopyButton extends Widget{//ToolbarButton {

	constructor(source: dm_FileTreePanel, target: dm_FileTreePanel, monitor: dm_TransfersTable, icon: LabIcon, tooltip: string){
		/*super( {
          icon,
		  //label : 'Copy',
	      tooltip: tooltip,
	      onClick: () => { this.handle_click(source, target, monitor); }
	    });
	}*/
	
    super();

    this.addClass('dm-copy-button');

    const btn = document.createElement('button');
    btn.title = tooltip;

    const iconNode = icon.element({
  		tag: 'span',
  		className: 'jp-Icon'
	});

    btn.appendChild(iconNode);

    btn.onclick = () => {
      this.handle_click(source, target, monitor);
    };

    this.node.appendChild(btn);
  }
	
	async handle_click(source: dm_FileTreePanel, target: dm_FileTreePanel, monitor: dm_TransfersTable){
	    var _action = "copy";
	    var _target_dir = target.getSelectedDir();
	    var _sources: string[] = []
	    for (const item of source.getSelected()) {
			_sources.push(item.path);
		};
		if(_sources.length==0){
			showErrorMessage("Error", "Please select source file(s)");
			return
		}
		if(_target_dir==null){
			showErrorMessage("Error", "Please select a target directory");
			return
		}
		var req_data = JSON.stringify({
						"command": _action,
		                "parameters": { 
		                    "target" : _target_dir,
		                    "sources": _sources }
		                })
        console.log('Copy command params: ' + req_data);
        try {
      		const data = await requestAPI<any>('inhpc_dm/tasks', {
      	    	'body': req_data,
      	    	'method': 'POST'});
      	  	console.log(data);
		  	var _title = data.status ?? "OK";
		  	var _msg = data.error_info ?? "Task launched successfully";
		  	showDialog({ title: _title, body: _msg, buttons: [ Dialog.okButton() ] });
			monitor.refreshData();
      	} catch (reason) {
      	    console.error(`Error on POST /inhpc_dm/tasks: ${reason}`);
      	    showErrorMessage("Error", `${reason}`);
    	}
	}
} // end dm_CopyButton

/**
 * Button for refreshing the list of transfer tasks
 */
export class dm_RefreshButton extends ToolbarButton {

	constructor(transferlist: dm_TransfersTable, tooltip:string){
		super( {
		  icon: refreshIcon,
	      tooltip: tooltip,
	      onClick: () => { this.handle_click(transferlist); }
	    });
	}
	
	async handle_click(transferlist: dm_TransfersTable){
	    transferlist.refreshData();
	}
} // end dm_RefreshButton

/**
 * Button for showing info on remote FS
 */
export class dm_ShowEndpointInfoButton extends ToolbarButton {
	constructor(fb: dm_FileTreePanel){
		super( {
		  icon: infoIcon,
	      tooltip: "Show info about this back-end",
		  onClick: () => {this.handle_click(fb);}
	    });
	}
	async handle_click(fb: dm_FileTreePanel){
	    try {
      		const data = await requestAPI<any>('inhpc_dm/info'
				+"?drive="+fb.drive, { 'method': 'GET' });
			 console.log('info reply: ' + JSON.stringify(data));
			 showCustomDialog(
				"Drive information",
				[{label: "Status", value: data.status},
					{label: "Protocol", value: data.protocol}
				],
				Dialog.okButton()
			 );
			/* showDialog({
				title: "Drive information",
				body: "Status: "+data.status+" \n protocol: "+data.protocol,
				buttons: [Dialog.okButton()]})*/
		} catch (reason) {
      	    console.error(`Error on GET /inhpc_dm/info: ${reason}`);
      	    showErrorMessage("Error", `${reason}`);
    	}	
	}
}


/**
 * Button for showing shared files on remote FS
 */
export class dm_ShowSharesButton extends ToolbarButton {
	constructor(fb: dm_FileTreePanel){
		super( {
		  icon: shareIcon,
	      tooltip: "Show shares for this back-end",
		  onClick: () => {this.handle_click(fb);}
	    });
	}

	async handle_click(fb: dm_FileTreePanel){
	    try {
      		const data = await requestAPI<any>('inhpc_dm/share'
				+"?drive="+fb.drive, { 'method': 'GET' });
			console.log('get shares reply: ' + JSON.stringify(data));
			if(data.status!="OK"){
				showErrorMessage("Error", `${data.statusMessage}`);
			}
			else{
			const _widget = new BoxPanel();
			const t = new dm_SharesTable(data.shares);
			_widget.addWidget(t);
			// TODO get a decent layout
			_widget.node.style.width = "800px";
			_widget.node.style.height = "600px";
			showDialog({
    			body: _widget,
    			buttons: [ Dialog.okButton() ],
  			});
			}
		} catch (reason) {
      	    console.error(`Error on GET /inhpc_dm/share: ${reason}`);
      	    showErrorMessage("Error", `${reason}`);
    	}	
	}
}
export async function showCustomDialog(
  title: string,
  fields: { label: string; value: string }[],
  button: Readonly<Dialog.IButton>
): Promise<void> {
  const body = new Widget();

  body.node.innerHTML = `
    <div class="dm-dialog-body">
      ${fields
        .map(
          field => `
            <div class="dm-dialog-row">
              <span class="dm-dialog-label">${escapeHTML(field.label)}</span>
              <span class="dm-dialog-value">${escapeHTML(field.value)}</span>
            </div>
          `
        )
        .join('')}
    </div>
  `;

  await showDialog({
    title,
    body,
    buttons: [button]//[Dialog.okButton()]
  });
}
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

