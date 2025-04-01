/**
 * Main data management widget, containing toolbars,
 * info windows and file browsers
 */

import {
  ILayoutRestorer,
  JupyterFrontEnd
} from '@jupyterlab/application';

import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';

import { ILauncher } from '@jupyterlab/launcher';

import {
  BoxPanel,
  BoxLayout,
  DockPanel,
  SplitPanel,
  Widget
} from '@lumino/widgets';

import{ IDocumentManager } from '@jupyterlab/docmanager';
import{ ISettingRegistry } from '@jupyterlab/settingregistry';
import { folderIcon } from '@jupyterlab/ui-components';

import {
  dm_TransferList
} from './dm_transferlist';

import { 
  dm_CopyButton,
  dm_RefreshButton,
  dm_SelectEndpointButton,
} from './dm_buttons';

import {
  dm_FileTreePanel
} from './dm_filetree';

export class dm_Settings {

  constructor() {}

  getDefaultEndpoint(): string {
    return this._settings["default_endpoint"];
  }

  setDefaultEndpoint(default_endpoint: string) {
    this._settings["default_endpoint"] = default_endpoint;
  }

  getUFTPEndpoints(): string[] {
    return this._settings["uftp_endpoints"];
  }

  private _settings = {
    "uftp_endpoints": [
      "https://localhost:9000/rest/auth/TEST",
      "https://gridftp-fr1.hww.hlrs.de:9000/rest/auth/HLRS",
      "https://uftp.fz-juelich.de/UFTP_Auth/rest/auth/JUDAC",
      "https://datagw03.supermuc.lrz.de:9000/rest/auth/DATAGW"
    ],
    "default_endpoint": ""
    };


}//end dm_Settings

export class dmWidget extends Widget {

  constructor(app: JupyterFrontEnd, docManager: IDocumentManager) {
    super();
    this.addClass('my-dmWidget');

    this._settings = new dm_Settings();
  
	// ============= Dual FileBrowser view ======================================
	
    // left ("_l") and right ("_r") file browser panel each 
    // including browser and info panels
    
    // ============= Left FileBrowser ======================================
    let url_l = null; // TBD store in settings
    this._fbWidget_l = new dm_FileTreePanel(app, url_l);
    
    // TODO buttons / actions
    const tb_mountbutton_l = new dm_SelectEndpointButton(this._fbWidget_l, this._settings);
    this._fbWidget_l.toolbar.addItem("mountBtn", tb_mountbutton_l);
    //const tb_unmountbutton_l = new dm_UnmountButton(this._fbWidget_l);
    //this._fbWidget_l.toolbar.addItem("unmountBtn", tb_unmountbutton_l);

    this._fbPanel_l = new SplitPanel({
      orientation: 'vertical',
      spacing: 1
    });
    this._fbPanel_l.id = 'fb_panel_l';
    this._fbPanel_l.addWidget(this._fbWidget_l);
    this._fbPanel_l.setRelativeSizes([90, 10]);

    // ============= Right FileBrowser ======================================
    let url_r = null; //TBD store in settings
    this._fbWidget_r = new dm_FileTreePanel(app, url_r);
    
    // TODO buttons / actions
    const tb_mountbutton_r = new dm_SelectEndpointButton(this._fbWidget_r, this._settings);
    this._fbWidget_r.toolbar.addItem("mountBtn", tb_mountbutton_r);

    this._transferListWidget = new dm_TransferList();

    this._fbPanel_r = new SplitPanel({
      orientation: 'vertical',
      spacing: 1
    });
    this._fbPanel_r.id = 'fb_panel_r';
    this._fbPanel_r.addWidget(this._fbWidget_r);
    this._fbPanel_r.setRelativeSizes([90, 10]);

    // ============= Middle panel with copy buttons =====================================

    this._transferBoxPanel = new BoxPanel({
      direction: 'top-to-bottom'
    });
    this._transferBoxPanel.id = "transferToolbar";
    this._transferBoxPanel.node.style.maxWidth="100px";
    this._transferBoxPanel.node.style.maxHeight="100px";
    this._transferBoxPanel.node.style.top="200px";

    const copyToRight = new dm_CopyButton(this._fbWidget_l, this._fbWidget_r, this._transferListWidget,
         '-->', 'Copy left selected to right directory directly');
	   const copyToLeft =  new dm_CopyButton(this._fbWidget_r, this._fbWidget_l, this._transferListWidget,
         '<--', 'Copy right selected to left directory directly');
    this._transferBoxPanel.addWidget(copyToRight);
    this._transferBoxPanel.addWidget(copyToLeft);

    // ============= Middle main panel: FB-left / transfer buttons / FB-right ==============
    
    this._fbPanel = new BoxPanel({
        direction: 'left-to-right',
        spacing: 1
    });
    this._fbPanel.id = 'fb_panel';
    this._fbPanel.addClass('dm_Widget-main');
    this._fbPanel.addWidget(this._fbPanel_l);
    this._fbPanel.addWidget(this._transferBoxPanel);
    this._fbPanel.addWidget(this._fbPanel_r);


    // ======== Table with info about tasks / transfers ===========

    let _wrapper1 = new SplitPanel({
      orientation: 'horizontal',
      spacing: 1,

    });
    _wrapper1.title.label = "Transfers";
    _wrapper1.addWidget(this._transferListWidget);
    const refresh_transferlist_button = new dm_RefreshButton(this._transferListWidget, "refresh", "Refresh list of transfers");
    _wrapper1.addWidget(refresh_transferlist_button);
    _wrapper1.setRelativeSizes([80,20]);
    let _wrapper = new DockPanel();
    _wrapper.addWidget(_wrapper1);


    // ======== Main panel =====================
    this._mainLayout = (this.layout = new BoxLayout());
    
    this._panel_collection = new SplitPanel({
          orientation: 'vertical',
          spacing: 10,
          alignment: "center"
    });
    this._panel_collection.id = 'panel_collection';
    this._panel_collection.addWidget(this._fbPanel);
    this._panel_collection.addWidget(_wrapper);
    this._panel_collection.setRelativeSizes([80, 10]);
    
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

  setDefaultEndpoint(endpoint: string): void {
    this._settings.setDefaultEndpoint(endpoint);
  }

  private _fbWidget_l: dm_FileTreePanel;
  private _fbPanel_l: SplitPanel;
  private _fbWidget_r: dm_FileTreePanel;
  private _fbPanel_r: SplitPanel;
  private _transferBoxPanel: BoxPanel;
  private _fbPanel: BoxPanel;
  private _transferListWidget: dm_TransferList;
  
  private _mainLayout: BoxLayout;
  private _panel_collection: SplitPanel;
  private _settings: dm_Settings;

}// end class dmWidget

/**
* Activate the Data Management widget extension
*/
export function activate_dm(
  app: JupyterFrontEnd,
  documentManager: IDocumentManager, 
  palette: ICommandPalette, 
  restorer: ILayoutRestorer, 
  settingRegistry: ISettingRegistry,
  launcher: ILauncher | null,
  extension_id: string
  ) {

  console.log('JupyterLab extension InHPC data management activating.');

  let widget_dm: MainAreaWidget<dmWidget>;
  const command_dm: string = 'inhpc:opendm';
  const dmwidget = new dmWidget(app, documentManager);

  let cmd = {
    label: 'InHPC - Data Management dual browser view',
    icon: folderIcon,
    execute: () => {      
      if (! widget_dm || widget_dm.isDisposed) {
		// Create a new widget if one does not exist
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
  };
  app.commands.addCommand(command_dm, cmd);

  palette.addItem({ command: command_dm, category: 'Other' });

  // add to launcher
  if (launcher) {
    launcher.add({
      command: command_dm,
      category: 'Other'
    });
  }

  // Track and restore the widget state
  let tracker_dm = new WidgetTracker<MainAreaWidget<dmWidget>>({
    namespace: 'inhpc_dm'
  });
  restorer.restore(tracker_dm, {
    command: command_dm,
    name: () => 'inhpc_dm'
  });
  
  function updateDefaultSettings(regSettings: ISettingRegistry.ISettings): void{
    let defHostSetting: string;
    defHostSetting = regSettings.get("defaultHost").composite.toString();
    console.log("Settings are: " + defHostSetting);
    dmwidget.setDefaultEndpoint(defHostSetting);
  }

  Promise.all([settingRegistry.load(extension_id), app.started])
    .then(([settings]) => {
      console.log("Loading InHPC_dm settings.");
      updateDefaultSettings(settings);
      settings.changed.connect(() => {
      updateDefaultSettings(settings);
      });
    })
    .catch((reason: Error) => {
      console.error("Problem with InHPC_dm settings: " + reason.message);
    }
  );
  
}
