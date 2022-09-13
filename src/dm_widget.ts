/**
 * Main data management widget, containing toolbars,
 * info windows and file browsers
 */

import {
  ILayoutRestorer,
  JupyterFrontEnd,
} from '@jupyterlab/application';

import {
  Dialog,
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker,
  Toolbar,
  ToolbarButton,
  showDialog,
  showErrorMessage
} from '@jupyterlab/apputils';

import { DocumentManager} from '@jupyterlab/docmanager';
import { DocumentRegistry} from '@jupyterlab/docregistry';
import { ServiceManager} from '@jupyterlab/services';

import { //newFolderIcon,
  addIcon,
  settingsIcon
  //,   LabIcon 
} from '@jupyterlab/ui-components';

import { each} from '@lumino/algorithm';
import { Message} from '@lumino/messaging';

import {
  BoxPanel,
  BoxLayout,
  SplitPanel,
  Widget
} from '@lumino/widgets';

import { 
  FilterFileBrowserModel,
  DirListing
} from '@jupyterlab/filebrowser';

import { dm_FileBrowser } from './mod_browser';

import { requestAPI } from './dm_handler';

import { getMountInfo } from './dm_dialogs';


class ContentWidget extends Widget {

  static createNode(): HTMLElement {
    let node = document.createElement('div');
    let content = document.createElement('div');
    let input = document.createElement('textarea');
    input.placeholder = 'Placeholder...';
    content.appendChild(input);
    node.appendChild(content);
    return node;
  }

  constructor(name: string) {
    super({ node: ContentWidget.createNode() });
    this.setFlag(Widget.Flag.DisallowLayout);
    this.addClass('content');
    this.addClass(name.toLowerCase());
    this.title.label = name;
    this.title.closable = true;
    this.title.caption = `Long description for: ${name}`;
  }

  get textareaNode(): HTMLTextAreaElement {
    return this.node.getElementsByTagName('textarea')[0] as HTMLTextAreaElement;
  }

  protected onActivateRequest(msg: Message): void {
    if (this.isAttached) {
      this.textareaNode.focus();
    }
  }
}//end contentWidget

export class dmWidget extends Widget {

  constructor(app: JupyterFrontEnd) {
    super();
    this.addClass('my-dmWidget');

    // ============= upper action toolbar panel =============

    this._actionToolbar = new Toolbar<Widget>();
    this._actionToolbar.id = "actionToolbar";
    
    //the Info UFTP Button on the top
    const tb_uftp_info = new ToolbarButton({
      icon: settingsIcon,
      onClick: async () => {
         // GET request
    	try {
      		const data = await requestAPI<any>('mounts');
      		console.log(data);
      		// TODO
      		this._logWidget.textareaNode.value = JSON.stringify(data);
    	} catch (reason) {
      		console.error(`Error on GET /inhpc_dm/mounts".\n${reason}`);
    	}
	  },
      tooltip: "Get mounts information"
    });

    this._actionToolbar.addItem('uftp_info', tb_uftp_info);

    // top horizontal panel
    this._top_panel = new SplitPanel({
      orientation: 'horizontal',
    });
    this._top_panel.id = 'top_panel';
    this._top_panel.addClass('dm_Widget-main');
    this._top_panel.addWidget(this._actionToolbar);
    
	// ============= Dual FileBrowser view ======================================
	
    // left ("_l") and right ("_r") file browser panel each 
    // including browser and info panels
    let docRegistry = new DocumentRegistry();
    const servicemanager = new ServiceManager();
    let docManager = new DocumentManager({
      registry: docRegistry,
      manager: servicemanager,
      opener
    });
    
    // ============= Left FileBrowser ======================================
    
    let fbModel_l = new FilterFileBrowserModel({ manager: docManager });

    this._fbWidget_l = new dm_FileBrowser({
        id: 'filebrowser-left',
        model: fbModel_l},
      'Filebrowser left'
    );

    // TODO connect to 'click' signal for displaying / updating file info?
    //this._fbWidget_l.listing.clicked.connect(this.eventSignalHandler, this);

    const tb_mountbutton_l = new dm_MountButton(this._fbWidget_l, this._settings["uftp_endpoints"]);
    this._fbWidget_l.toolbar.addItem("mountBtn", tb_mountbutton_l);

    this._infoWidget_l = new ContentWidget('Info');
    this._infoWidget_l.id = "infoWidget_l";
    this._infoWidget_l.textareaNode.value= "<n/a>";
	this._infoWidget_l.textareaNode.style.width="95%";

    this._fbPanel_l = new SplitPanel({
      orientation: 'vertical',
      spacing: 1
    });
    this._fbPanel_l.id = 'fb_panel_l';
    this._fbPanel_l.addWidget(this._fbWidget_l);
    this._fbPanel_l.addWidget(this._infoWidget_l);
    this._fbPanel_l.setRelativeSizes([85, 15]);
    
    // ============= Middle panel with copy/transfer buttons ======================================
    
    const copyToRight = new ToolbarButton({
      label: "-->",
      onClick: () => {

        //only debug printing:
        var text = 'Action: Copy to right';
        each(this._fbWidget_l.getListing().selectedItems(), item => {
		      text=text  + "\n" + item.path;
        });

        //end debug printing

        //the item clicked is item (item.path)
        
        each(this._fbWidget_l.getListing().selectedItems(), item => {
		      this._fbWidget_r.copyFileFrom(item.path);
        });

		    this._infoWidget_l.textareaNode.value=text;
      },
      tooltip: 'Copy left selected to right directory directly'
    });

	const copyToLeft = new ToolbarButton({
    label: "<--",
    onClick: () => {
        var text = 'Action: Copy to left';
        each(this._fbWidget_r.getListing().selectedItems(), item => {
          text=text  + "\n" + item.path;
        });
        this._infoWidget_r.textareaNode.value=text;
      },
      tooltip: 'Copy right selected to left directory directly'
    });

    const transferToRight = new ToolbarButton({
      label: "==>",
      onClick: () => {
        var text = 'Action: Transfer to right';
        var logentry = '';
        var logtext = '';
        each(this._fbWidget_l.getListing().selectedItems(), item => {
          text=text  + "\n" + item.path;
          console.log("R_PATH: ",this._fbWidget_r.model.path);
          
          if (this._fbWidget_r.model.path) {
            console.log("Path empty");
          } else {

          }
          logtext = logtext + logentry + "\n" ;
          //this._logWidget.textareaNode.value = logtext;
        });
        this._infoWidget_l.textareaNode.value=text;
      },
      tooltip: 'Transfer left selected to right directory via transfer tool'
    });
    transferToRight.node.style.verticalAlign = "middle";

    const transferToLeft = new ToolbarButton({
      label: "<==",
      onClick: () => {
        var text = 'Action: Transfer to left';
        var logentry = '';
        var logtext = '';
        
        each(this._fbWidget_r.getListing().selectedItems(), item => {
          text=text  + "\n" + item.path;
          console.log("L_PATH: ", this._fbWidget_l.model.path);
          if (this._fbWidget_l.model.path) {
            //
          }	
          else {
            //logentry = this._settings["uftp_bin"] + " cp " + this._settings["uftp_url"] + item.path + " ./ " + this._settings["uftp_options"];
          }
          logtext = logtext + logentry + "\n" ;
          //this._logWidget.textareaNode.value = logtext;
        });
        this._infoWidget_r.textareaNode.value=text;		
      },
      tooltip: 'Transfer left selected to right directory  via transfer tool'
    });
    transferToLeft.node.style.verticalAlign = "bottom";

    this._transferBoxPanel = new BoxPanel({
      direction: 'top-to-bottom'
    });
    this._transferBoxPanel.id = "transferToolbar";
    this._transferBoxPanel.node.style.maxWidth="100px";
    this._transferBoxPanel.node.style.maxHeight="100px";
    this._transferBoxPanel.node.style.top="200px";
    this._transferBoxPanel.addWidget(copyToRight);
    this._transferBoxPanel.addWidget(copyToLeft);
    this._transferBoxPanel.addWidget(transferToRight);
    this._transferBoxPanel.addWidget(transferToLeft);
    

    // ============= Right FileBrowser ======================================
    
    let fbModel_r = new FilterFileBrowserModel({ manager: docManager });

    this._fbWidget_r = new dm_FileBrowser({
        id: 'filebrowser-right',
        model: fbModel_r}, 
      'Filebrowser right'
    );	
    // connect to 'click' signal
    //this._fbWidget_r.listing.clicked.connect(this.eventSignalHandler, this);
      
    const tb_mountbutton_r = new dm_MountButton(this._fbWidget_r, this._settings["uftp_endpoints"]);
    this._fbWidget_r.toolbar.addItem("mountBtn", tb_mountbutton_r);

    this._infoWidget_r = new ContentWidget('Info');
    this._infoWidget_r.id = "infoWidget_r";
    this._infoWidget_r.textareaNode.value= "<n/a>";
	this._infoWidget_r.textareaNode.style.width="95%";

    this._fbPanel_r = new SplitPanel({
      orientation: 'vertical',
      spacing: 1
    });
    this._fbPanel_r.id = 'fb_panel_r';
    this._fbPanel_r.addWidget(this._fbWidget_r);
    this._fbPanel_r.addWidget(this._infoWidget_r);
    this._fbPanel_r.setRelativeSizes([85, 15]);


    this._fbPanel = new BoxPanel({
        direction: 'left-to-right',
        spacing: 1
    });
    this._fbPanel.id = 'fb_panel';
    this._fbPanel.addClass('dm_Widget-main');
    this._fbPanel.addWidget(this._fbPanel_l);
    this._fbPanel.addWidget(this._transferBoxPanel);
    this._fbPanel.addWidget(this._fbPanel_r);
    //fbModel_l.refreshed.connect(logger_onModelRefreshed);

    //========== Bottom Log window ============
    this._logWidget = new ContentWidget('Log');
    this._logWidget.id = "logWidget";
    this._logWidget.textareaNode.value="Log output";
    this._logWidget.textareaNode.style.width="95%";
    this._logWidget.textareaNode.style.height="95%";


    // ======== Main panel =====================
    this._mainLayout = (this.layout = new BoxLayout());
    
    this._panel_collection = new SplitPanel({
          orientation: 'vertical'
    });
    this._panel_collection.id = 'panel_collection';
    this._panel_collection.addWidget(this._top_panel);
    this._panel_collection.addWidget(this._fbPanel);
    //this._panel_collection.addWidget(this._logWidget);
    this._panel_collection.setRelativeSizes([15, 75, 10]);
    
    this._mainLayout.addWidget(this._panel_collection);	

  }//end constructor



  formatBytes(bytes:number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  print_object_details(obj:Object) {
    console.log("Print Object Details");
	  console.log(Object.getOwnPropertyNames(obj).sort());
  }

  /**
  *	Handle signals / clicki events
  *
  * TODO is such a handler even needed/useful for anything? 
  * If yes, it should be linked to a specific file browser instance
  */
  eventSignalHandler(sender: DirListing, eventType: string): void {

    if (sender.constructor.name === 'DirListing') {
      if (eventType === 'click') {

        //left FB
        var text = "Selected Files Info";
        var size_sum = 0;
        each(this._fbWidget_l.getListing().selectedItems(), item => {
          if (item.size) 
            size_sum = size_sum + item.size;
          if (item.size) 
            text=text  + "\n" + item.path + "(" + this.formatBytes(item.size) + ")";
        });
        
        text=text  + "\n" + "Overall Size: " + this.formatBytes(size_sum);
        
        //right FB
        text = "Selected Files Info";
        size_sum = 0;
        
        each(this._fbWidget_r.getListing().selectedItems(), item => {
          if (item.size) 
            size_sum = size_sum + item.size;
          if (item.size) 
            text=text  + "\n" + item.path + "(" + this.formatBytes(item.size) + ")";
        });
      
        text=text  + "\n" + "Overall Size: " + this.formatBytes(size_sum);
      
      } else {
              console.log('Unknown in DirListing: ', eventType);
      }
    } else {
      console.log('Unknown event sender: ', sender.constructor.name);
    }
  }


  private _actionToolbar: Toolbar;
  private _top_panel: SplitPanel;
  private _fbWidget_l: dm_FileBrowser;
  private _infoWidget_l: ContentWidget;
  private _fbPanel_l: SplitPanel;
  private _fbWidget_r: dm_FileBrowser;
  private _infoWidget_r: ContentWidget;
  private _fbPanel_r: SplitPanel;
  private _transferBoxPanel: BoxPanel;
  private _fbPanel: BoxPanel;
  private _logWidget: ContentWidget;
  private _mainLayout: BoxLayout;
  private _panel_collection: SplitPanel;
  private _settings = {
	"uftp_endpoints": [
	    "https://localhost:9000/rest/auth/TEST",
		"https://gridftp-fr1.hww.hlrs.de:9000/rest/auth/HLRS",
		"https://uftp.fz-juelich.de:9112/UFTP_Auth/rest/auth/JUDAC",
		"https://datagw03.supermuc.lrz.de:9000/rest/auth/DATAGW"
	]
  };

}// end class dmWidget

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
        getMountInfo(endpoints, mountDirectory).then(async value => {
          var req_data = JSON.stringify(value.value);
          if(req_data!="null") {
            console.log('mount params: ' + req_data);
            // perform POST request
            try {
      		  const data = await requestAPI<any>('mounts', {
      		      'body': req_data,
      		      'method': 'POST'});
      		  console.log(data);
      		  if("OK" == data.status) {
      		  	showDialog({ title: "OK", body: "Mount successful",
      		  	             buttons: [ Dialog.okButton() ] });
      		  	// TODO: change directory on fb to new mount dir
      		  	//fb....cd(mountDirectory);
      		  }
      		  else{
	      		showErrorMessage("Error", data.error_info);
	      	  }
      	    } catch (reason) {
      		    console.error(`Error on POST /inhpc_dm/mounts".\n${reason}`);
      		    showErrorMessage("Error", reason);
    	    }
    	  } else {
    	    console.log('Mount cancelled');
    	  }
	    });
	}

} // end dm_MountButton

/**
* Activate the Data Management widget extension originally
*/
export function activate_dm(
  app: JupyterFrontEnd, 
  palette: ICommandPalette, 
  restorer: ILayoutRestorer, 
  ) {

  console.log('JupyterLab extension InHPC data management activating.');

  let widget_dm: MainAreaWidget<dmWidget>;
  const command_dm: string = 'inhpc:opendm';
  app.commands.addCommand(command_dm, {
    label: 'InHPC - Data Management dual browser view',
    execute: () => {      
      if (! widget_dm || widget_dm.isDisposed) {
		// Create a new widget if one does not exist
        const dmwidget = new dmWidget(app);
		    dmwidget.id = 'dmwidget_id';
        widget_dm = new MainAreaWidget({ content: dmwidget });
        widget_dm.id = 'inhpc-datamanagement';
        widget_dm.title.label = 'Data Management';
        widget_dm.title.closable = true;
      }
      if (!tracker_dm.has(widget_dm)) {
        // Track the state of the widget for later restoration
        tracker_dm.add(widget_dm);
      }
      if (!widget_dm.isAttached) {
        // Attach the widget to the main work area if it's not there
        app.shell.add(widget_dm, 'main');
      }
      widget_dm.content.update();

      app.shell.activateById(widget_dm.id);
    }
  });
  palette.addItem({ command: command_dm, category: 'Tutorial' });

  // Track and restore the widget state
  let tracker_dm = new WidgetTracker<MainAreaWidget<dmWidget>>({
    namespace: 'inhpc_dm'
  });
  restorer.restore(tracker_dm, {
    command: command_dm,
    name: () => 'inhpc_dm'
  });
}
