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
  dm_FileTreePanel,
} from './dm_filetree';
import { ISettingRegistry } from '@jupyterlab/settingregistry';


export class dmWidget extends Widget {

  constructor(app: JupyterFrontEnd, settings: ISettingRegistry.ISettings) {
    super();
    this.addClass('my-dmWidget');

	// ============= Dual file tree view ======================================
	
    // left ("_l") and right ("_r") file tree panel each 
    // including browser and info panels
    
    // ============= Left file tree ======================================
    this._fbWidget_l = new dm_FileTreePanel(app, settings);
    
    // TODO buttons / actions
    const tb_selectEndpointButton_l = new dm_SelectEndpointButton(this._fbWidget_l);
    this._fbWidget_l.toolbar.insertItem(0, "selectEndpointBtn", tb_selectEndpointButton_l);

    this._fbPanel_l = new SplitPanel({
      orientation: 'vertical',
      spacing: 1
    });
    this._fbPanel_l.id = 'fb_panel_l';
    this._fbPanel_l.addWidget(this._fbWidget_l);
    this._fbPanel_l.setRelativeSizes([90, 10]);

    // ============= Right file tree =====================================
    this._fbWidget_r = new dm_FileTreePanel(app, settings);
    
    // TODO buttons / actions
    const tb_selectEndpointButton_r = new dm_SelectEndpointButton(this._fbWidget_r);
    this._fbWidget_r.toolbar.insertItem(0, "selectEndpointBtn", tb_selectEndpointButton_r);

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
    const refresh_transferlist_button = new dm_RefreshButton(this._transferListWidget, "Refresh list of transfers");
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

  private _fbWidget_l: dm_FileTreePanel;
  private _fbPanel_l: SplitPanel;
  private _fbWidget_r: dm_FileTreePanel;
  private _fbPanel_r: SplitPanel;
  private _transferBoxPanel: BoxPanel;
  private _fbPanel: BoxPanel;
  private _transferListWidget: dm_TransferList;
  private _mainLayout: BoxLayout;
  private _panel_collection: SplitPanel;

}// end class dmWidget

/**
* Activate the Data Management widget extension
*/
export function activate_dm(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  restorer: ILayoutRestorer,
  launcher: ILauncher | null,
  settings: ISettingRegistry.ISettings
  ) {
  console.log('Initialising InHPC data management front-end.');
  let widget_dm: MainAreaWidget<dmWidget>;
  const command_dm: string = 'inhpc:opendm';
  const dmwidget = new dmWidget(app, settings);

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
 
}
