/**
 * Main data management file
 */

import {
  ILayoutRestorer,
  JupyterFrontEnd,
} from '@jupyterlab/application';

import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker,
  Toolbar,
  ToolbarButton
} from '@jupyterlab/apputils';

import { 
  DocumentManager
} from '@jupyterlab/docmanager';

import { 
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  dm_FilterFileBrowserModel
} from './mod_model';

import { 
  ServiceManager
} from '@jupyterlab/services';

import { 
  each
} from '@lumino/algorithm'; // jlpm add @lumino/algorithm

import {
  Message
} from '@lumino/messaging';

import {
  BoxPanel,
  BoxLayout,
  SplitPanel,
  Widget
} from '@lumino/widgets';

import { dm_DirListing } from './mod_listing';
import { dm_FileBrowser } from './mod_browser';

//import {exec} from 'child_process';

// example class generating widgets used for showing colourful test widgets (based on css classes)
// https://github.com/jupyterlab/lumino/issues/43
// https://github.com/jupyterlab/lumino/blob/master/examples/example-dockpanel/src/index.ts
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
}

export class dmWidget extends Widget {
  /**
  * Construct a new data management widget.
  * smallest elements first then combining in next level
  * from single widget to line based panel to overall panel
  */
  constructor(app: JupyterFrontEnd) {
    super();
    this._settings["uftp_url"] = this._settings["uftp_host"] + ":" + this._settings["uftp_port"] + this._settings["uftp_dir"];
    this.addClass('my-dmWidget');

    // single panel with action toolbar buttons for debug
    this._actionToolbar = new Toolbar<Widget>();
    this._actionToolbar.id = "actionToolbar";
    //const {exec} = require ("child_process");
    const mount_ssh = new ToolbarButton({
    //  icon: newFolderIcon,
	  label: "mount_ssh",
      onClick: () => {
		this._infoWidget.textareaNode.value='Action: mount ssh fs from Hawk\n sshfs hpcbuch@hawk.hww.hlrs.de:/zhome/academic/HLRS/hlrs/hpcbuch ./mounts/hawk_home"';
//		exec("ls -la");
//		exec("touch test.touch");
      },
      tooltip: 'Mount ssh fs on Hawk '
    });
	const mount_uftp = new ToolbarButton({
    //  icon: newFolderIcon,
	  label: "mount_uftp",
      onClick: () => {
		this._infoWidget.textareaNode.value='Action: mount uftp fs from HLRS\n ./fuse-mount.sh';
		//app.commands.execute("filebrowser:go-up");
//		exec("ls -la");
//		exec("touch test.touch");
      },
      tooltip: 'Mount ssh fs on Hawk '
    });
	const scp = new ToolbarButton({
	  label: "scp TEST",
      onClick: () => {
		app.commands.execute('docmanager:open', {
			path: 'untitled.txt',
			options: {
				mode: 'split-right'
			}
		});
		this._infoWidget.textareaNode.value='Action: scp TEST';
      }, 
	  tooltip: 'Execute Test scp command '
    });

	this._actionToolbar.addItem('mount_ssh', mount_ssh);
	this._actionToolbar.addItem('mount_uftp', mount_uftp);
	this._actionToolbar.addItem('scp', scp);

	// single panel with settings widget
	this._settingsWidget = new ContentWidget('Settings');
	this._settingsWidget.id = "settingsWidget";
	//this._settingsWidget.textareaNode.value="Settings in future";
	//this._settingsWidget.textareaNode.value = "Settings\n" + JSON.stringify(this._settings);
	this._settingsWidget.textareaNode.value = "Settings\n" + "uftp_url: " + this._settings["uftp_url"] + "\n" + "uftp_options: " + this._settings["uftp_options"];
	this._settingsWidget.textareaNode.style.width = "95%";
	this._settingsWidget.textareaNode.style.height = "80px";
	//console.log(JSON.stringify(this._settings));
	
	// single panel with info widget, will later be extended and moved below file browsers
    	this._infoWidget = new ContentWidget('Info');
	this._infoWidget.id = "infoWidget";
	// this._infoWidget.textareaNode.value="Event Monitor";
	this._infoWidget.textareaNode.value="'lib' selected\n'dm_listing.js' selected";
	this._infoWidget.textareaNode.style.width = "95%";
	this._infoWidget.textareaNode.style.height = "80px";

	// top horizontal panel including actions and settings
	//this._top_panel = new BoxPanel({
	this._top_panel = new SplitPanel({
    //  direction: 'left-to-right', // BoxPanel
	  orientation: 'horizontal', // SplitPanel
    //  renderer: SplitPanel.defaultRenderer,
    //  spacing: 1
    });
	this._top_panel.id = 'top_panel';
	// add settings and actions to top_panel
	this._top_panel.addClass('dm_Widget-main');
	this._top_panel.addWidget(this._actionToolbar);
	this._top_panel.addWidget(this._settingsWidget);
	this._top_panel.addWidget(this._infoWidget);
	this._top_panel.setRelativeSizes([20, 50, 30 ]);
	
	// ==================== new horizontal panel
	
	// left ("_l") and right ("_r") file browser panel each including browser and info panels
	// common preparations
    let docRegistry = new DocumentRegistry();
    const servicemanager = new ServiceManager();
    let docManager = new DocumentManager({
      registry: docRegistry,
      manager: servicemanager,
      opener
    });
    // let fbRenderer = new dm_Renderer();
	// left panel filebrowser and info
    let fbModel_l = new dm_FilterFileBrowserModel({ manager: docManager });
    this._fbWidget_l = new dm_FileBrowser({
      id: 'filebrowser-left',
      model: fbModel_l},
	  'Filebrowser left'
    );	
	// connect to 'click' signal
	this._fbWidget_l.listing.clicked.connect(this.eventSignalHandler, this);
    // info box
    this._fbInfo_l = new ContentWidget('Info');
	this._fbInfo_l.id = "fbInfo_l";
	this._fbInfo_l.textareaNode.value="Info left FileBrowser";
	//this._fbInfo_l.textareaNode.cols=50;
	//this._fbInfo_l.textareaNode.rows=4;
	this._fbInfo_l.textareaNode.style.width="95%";
	this._fbInfo_l.textareaNode.style.height="95%";

	// filebrowser + info box in new panel
	this._fbPanel_l = new SplitPanel({
    //  direction: 'top-to-bottom', // BoxPanel
	  orientation: 'vertical', // SplitPanel
    //  renderer: SplitPanel.defaultRenderer,
      spacing: 1
    });
	this._fbPanel_l.id = 'fb_panel_l';
	this._fbPanel_l.addWidget(this._fbWidget_l);
	this._fbPanel_l.addWidget(this._fbInfo_l);
	this._fbPanel_l.setRelativeSizes([85, 15]);
	
	// Elements for the transfer boxpanel vertical between browsers
	// copy right/left for direct copy
	// transfer left/rigth for high speed transfer i.e. uftp

	// Button copying file to right directly
	const copyToRight = new ToolbarButton({
    //  icon: newFolderIcon,
	  label: "-->",
      onClick: () => {
        //console.log('Action: Copy to right');
		//this._infoWidget.textareaNode.value='Action: Copy to right';
		var text = 'Action: Copy to right';
        each(this._fbWidget_l.listing.selectedItems(), item => {
		  text=text  + "\n" + item.path;
        });
		this._infoWidget.textareaNode.value=text;
      },
      tooltip: 'Copy left selected to right directory directly'
    });
	
	// Button copying file to left directly
	const copyToLeft = new ToolbarButton({
    //  icon: newFolderIcon,
	  label: "<--",
      onClick: () => {
        //console.log('Action: Copy to left');
		//this._infoWidget.textareaNode.value='Action: Copy to left';
		var text = 'Action: Copy to left';
        each(this._fbWidget_r.listing.selectedItems(), item => {
		  text=text  + "\n" + item.path;
        });
		this._infoWidget.textareaNode.value=text;
	  },
      tooltip: 'Copy right selected to left directory directly'
    });
	
	// Button transferring file to right with transfer tool
	const transferToRight = new ToolbarButton({
    //  icon: newFolderIcon,
	  label: "==>",
      onClick: () => {
        //console.log('Action: Transfer to right');
		//this._infoWidget.textareaNode.value='Action: Transfer to right';
		var text = 'Action: Transfer to right';
		var logentry = '';
		var logtext = '';
        each(this._fbWidget_l.listing.selectedItems(), item => {
		  text=text  + "\n" + item.path;
		  // /opt/unicore/uftp-client-1.3.2/bin/uftp cp -v -B-10G -u hpcbuch /dev/zero https://gridftp-fr1.hww.hlrs.de:9000/rest/auth/HLRS:/lustre/hpe/ws10/ws10.3/ws/hpcbuch-test/10g-w2.img -i /home/hpcbuch/.ssh/2020_hpcbuch_inhpc_id_ed25519_nopw.key  -t 1
		  console.log("R_PATH: ",this._fbWidget_r.model.path);
		  if (this._fbWidget_r.model.path) {
			console.log("Path empty");
		    logentry = this._settings["uftp_bin"] + " cp " + "./" + item.path + " " + this._settings["uftp_url"] + this._fbWidget_r.model.path + "/ " + this._settings["uftp_options"] 
		  }
		  else {
		    logentry = this._settings["uftp_bin"] + " cp " + "./" + item.path + " " + this._settings["uftp_url"] + " " + this._settings["uftp_options"] 
		  }
		  //logtext = logtext + " https:/\/" + this._settings["uftp_host"] + ":" + this._settings["uftp_port"] + this._settings["uftp_dir"];
		  logtext = logtext + logentry + "\n" ;
		  this._logWidget.textareaNode.value = logtext;
        });
		this._infoWidget.textareaNode.value=text;
      },
      tooltip: 'Transfer left selected to right directory via transfer tool'
    });
	transferToRight.node.style.verticalAlign = "middle";
	
	// Button transferring file to left with transfer tool
	const transferToLeft = new ToolbarButton({
    //  icon: newFolderIcon,
	  label: "<==",
      onClick: () => {
        //console.log('Action: Transfer to left');
		//this._infoWidget.textareaNode.value='Action: Transfer to left';
		var text = 'Action: Transfer to left';
		var logentry = '';
		var logtext = '';
        each(this._fbWidget_r.listing.selectedItems(), item => {
		  text=text  + "\n" + item.path;
		  console.log("L_PATH: ",this._fbWidget_l.model.path);
		  if (this._fbWidget_l.model.path) {
		    logentry = this._settings["uftp_bin"] + " cp " + this._settings["uftp_url"] + item.path + " ./" + this._fbWidget_l.model.path + "/ " + this._settings["uftp_options"];
		  }	
		  else {
		    logentry = this._settings["uftp_bin"] + " cp " + this._settings["uftp_url"] + item.path + " ./ " + this._settings["uftp_options"];
		  }
		  logtext = logtext + logentry + "\n" ;
		  this._logWidget.textareaNode.value = logtext;
        });
		this._infoWidget.textareaNode.value=text;		
      },
      tooltip: 'Transfer left selected to right directory  via transfer tool'
    });
	transferToLeft.node.style.verticalAlign = "bottom";
	
	// transfer boxpanel itself
	this._transferBoxPanel = new BoxPanel({
      direction: 'top-to-bottom', // BoxPanel
	//  orientation: 'horizontal', // SplitPanel
    //  renderer: SplitPanel.defaultRenderer,
    //  spacing: 1
    });
	this._transferBoxPanel.id = "transferToolbar";
	this._transferBoxPanel.node.style.maxWidth="100px";
	this._transferBoxPanel.node.style.maxHeight="100px";
	this._transferBoxPanel.node.style.top="200px";
	this._transferBoxPanel.addWidget(copyToRight);
	this._transferBoxPanel.addWidget(copyToLeft);
	this._transferBoxPanel.addWidget(transferToRight);
	this._transferBoxPanel.addWidget(transferToLeft);
	
	// right panel filebrowser and info
    let fbModel_r = new dm_FilterFileBrowserModel({ manager: docManager });
    this._fbWidget_r = new dm_FileBrowser({
      id: 'filebrowser-right',
      model: fbModel_r}, 
	  'Filebrowser right'
    );	
	// connect to 'click' signal
	this._fbWidget_r.listing.clicked.connect(this.eventSignalHandler, this);
    // info box
    this._fbInfo_r = new ContentWidget('Info');
	this._fbInfo_r.id = "fbInfo_r";
	this._fbInfo_r.textareaNode.value="Info right FileBrowser";
    //this._fbInfo_r.textareaNode.cols=50;
	//this._fbInfo_r.textareaNode.rows=4;
	this._fbInfo_r.textareaNode.style.width="95%";
	this._fbInfo_r.textareaNode.style.height="95%";
	// filebrowser + info box in new panel
	this._fbPanel_r = new SplitPanel({
    //  direction: 'top-to-bottom', // BoxPanel
	  orientation: 'vertical', // SplitPanel
    //  renderer: SplitPanel.defaultRenderer,
      spacing: 1
    });
	this._fbPanel_r.id = 'fb_panel_r';
	this._fbPanel_r.addWidget(this._fbWidget_r);
		this._fbPanel_r.addWidget(this._fbInfo_r);
	this._fbPanel_r.setRelativeSizes([85, 15]);
	
    // horizontal panel including browser panels and transfer button
	this._fbPanel = new BoxPanel({
      direction: 'left-to-right', // BoxPanel
	//  orientation: 'horizontal',
    //  renderer: SplitPanel.defaultRenderer,
      spacing: 1
    });
	this._fbPanel.id = 'fb_panel';
	// add fb_widgets to fb_panel
	this._fbPanel.addClass('dm_Widget-main');
	this._fbPanel.addWidget(this._fbPanel_l);
	this._fbPanel.addWidget(this._transferBoxPanel);
	this._fbPanel.addWidget(this._fbPanel_r);
	
    // test to listen on signal "refreshed"
    fbModel_l.refreshed.connect(logger_onModelRefreshed);

	// lower panel for log output
	this._logWidget = new ContentWidget('Log');
	this._logWidget.id = "logWidget";
	this._logWidget.textareaNode.value="Log output";
	//this._logWidget.textareaNode.cols=120;
	//this._logWidget.textareaNode.rows=5;
	this._logWidget.textareaNode.style.width="95%";
	this._logWidget.textareaNode.style.height="95%";

	// ==================== starting main panel collection

        this._mainLayout = (this.layout = new BoxLayout());
	
	// main split panel hosting all horizontal panels
	this._panel_collection = new SplitPanel({
	      orientation: 'vertical', // for SplitPanel
	});
	this._panel_collection.id = 'panel_collection';
	this._panel_collection.addWidget(this._top_panel);
	this._panel_collection.addWidget(this._fbPanel);
	this._panel_collection.addWidget(this._logWidget);
	this._panel_collection.setRelativeSizes([15, 75, 10]);
	
	// add the panel collection to the main layout
	this._mainLayout.addWidget(this._panel_collection);	
  }

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
  *	Handle signals from visual objects used
  * Sender class and event type are usable information
  */
  eventSignalHandler(sender: dm_DirListing, eventType:string): void {
    //console.log(sender.constructor.name, eventType);
    if (sender.constructor.name === 'dm_DirListing') {
	  if (eventType === 'click') {
		var text = "Selected Files Info";
		var size_sum = 0;
		each(this._fbWidget_l.listing.selectedItems(), item => {
		  if (item.size) size_sum = size_sum + item.size;
		  if (item.size) text=text  + "\n" + item.path + "(" + this.formatBytes(item.size) + ")";
        });
	text=text  + "\n" + "Overall Size: " + this.formatBytes(size_sum);
       	this._fbInfo_l.textareaNode.value=text;
	text = "Selected Files Info";
	size_sum = 0;
        each(this._fbWidget_r.listing.selectedItems(), item => {
	  if (item.size) size_sum = size_sum + item.size;
	  if (item.size) text=text  + "\n" + item.path + "(" + this.formatBytes(item.size) + ")";
        });
	text=text  + "\n" + "Overall Size: " + this.formatBytes(size_sum);
        this._fbInfo_r.textareaNode.value=text;
	  } else {
            console.log('Unknown in DirListing: ', eventType);
	  }
	} else {
	  console.log('Unknown event sender: ', sender.constructor.name);
	}
  }
  private _actionToolbar: Toolbar;
  private _settingsWidget: ContentWidget;
  private _top_panel: SplitPanel;
  private _infoWidget: ContentWidget;
  private _fbWidget_l: dm_FileBrowser;
  private _fbInfo_l: ContentWidget;
  private _fbPanel_l: SplitPanel;
  private _fbWidget_r: dm_FileBrowser;
  private _fbInfo_r: ContentWidget;
  private _fbPanel_r: SplitPanel;
  private _transferBoxPanel: BoxPanel;
  private _fbPanel: BoxPanel;
  private _logWidget: ContentWidget;
  private _mainLayout: BoxLayout;
  private _panel_collection: SplitPanel;
  private _settings = {
	"uftp_bin": "uftp",
	"uftp_host": "https://gridftp-fr1.hww.hlrs.de",
	"uftp_port": "9000",
	"uftp_user": "hpcbuch",
	"uftp_password": "testtest",
	"uftp_options": "-u hpcbuch -i /home/hpcbuch/.ssh/2020_hpcbuch_inhpc_id_ed25519_nopw.key",
	"uftp_dir": "/tmp/",
	"uftp_url": "",
	"ssh_host": "hawk.hww.hlrs.de",
	"ssh_port": "22",
	"ssh_user": "hpcbuch",
	"ssh_password": "testtest",
	"ssh_dir": "./"
  };
  
  /**
  * Handle update requests for the widget.
  */
  //async onUpdateRequest(msg: Message): Promise<void> {
  //  console.log('dmWidget.onUpdateRequest');
  //}
}
// end class dmWidget


/**
* Handle signals with logging before integrating them in normal functions
* used i.e. where a method needs to be passed instead a string i.e. for signals
*/
function logger_onModelRefreshed(sender: dm_FilterFileBrowserModel): void {
//  console.log('fb_model refreshed');
}

/**
* Activate the Data Management widget extension originally
*/
export function activate_dm(
  app: JupyterFrontEnd, 
  palette: ICommandPalette, 
  restorer: ILayoutRestorer, 
  ) {

  console.log('JupyterLab extension InHPC data management is activated!');
  // Start Data Management with two browsers
  // Add an application command
  // the execute method is attached to the command but executed only when the
  // command is called, thus the "missing" tracker definition then exists 
  // Declare a widget variable
  let widget_dm: MainAreaWidget<dmWidget>;
  const command_dm: string = 'inhpc:opendm';
  app.commands.addCommand(command_dm, {
    label: 'InHPC - Data Management with two browsers',
    execute: () => {      
      if (! widget_dm || widget_dm.isDisposed) {
		//console.log('Widget dm does not exist/disposed');
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

      // Activate the widget
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
