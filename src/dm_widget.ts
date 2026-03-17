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
  //BoxLayout,
  //DockPanel,
  SplitPanel,
  PanelLayout,
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
    this.addClass('dm-root');



    // === Create components ===
    this.source = new dm_FileTreePanel(app, settings);
    this.target = new dm_FileTreePanel(app, settings);
    this._transferListWidget = new dm_TransferList();

	  // === Headers ===
    const sourceHeader = this._createHeader('Source');
    const targetHeader = this._createHeader('Target');


    // ============= Left file tree ======================================
    const tb_selectEndpointButton_l = new dm_SelectEndpointButton(this.source);
    this.source.toolbar.addClass('dm-toolbar');
    this.source.toolbar.insertItem(0, "selectEndpointBtn", tb_selectEndpointButton_l);

    // ============= Right file tree =====================================
    const tb_selectEndpointButton_r = new dm_SelectEndpointButton(this.target);
    this.target.toolbar.addClass('dm-toolbar');
    this.target.toolbar.insertItem(0, "selectEndpointBtn", tb_selectEndpointButton_r);

    // ============= Middle panel with copy buttons =====================================
const actionPanel = new Widget();
    actionPanel.addClass('dm-action-panel');

    //setting up the buttons
    const copyBtntoR = new dm_CopyButton(
      this.source,
      this.target,
      this._transferListWidget,
      '→',
      'Copy left selected to right directory directly'
    );
    const copyBtntoL = new dm_CopyButton(
      this.target,
      this.source,
      this._transferListWidget,
      '<--',
      'Copy right selected to left directory directly'
    );

    // setting buttons inside layout to be displayed by lumino
    const actionLayout = new PanelLayout();
    actionLayout.addWidget(copyBtntoR);
    actionLayout.addWidget(copyBtntoL);
    actionPanel.layout = actionLayout;

    // ============= Middle main panel: FB-left / transfer buttons / FB-right ==============
    const sourcePanel = this._wrapPanel(sourceHeader, this.source);
    const targetPanel = this._wrapPanel(targetHeader, this.target);


     // === Split layout ===
    const split = new SplitPanel({ orientation: 'horizontal' });
    split.addClass('dm-main');

    split.addWidget(sourcePanel);
    split.addWidget(actionPanel);
    split.addWidget(targetPanel);

    SplitPanel.setStretch(sourcePanel, 1);
    SplitPanel.setStretch(targetPanel, 1);
    SplitPanel.setStretch(actionPanel, 0);
    actionPanel.node.style.minWidth = '60px';

    // ======== Table with info about tasks / transfers ===========
    const transferWrapper = new Widget();
    transferWrapper.addClass('dm-transfer-wrapper');

    const refresh_transferlist_button = new dm_RefreshButton(this._transferListWidget, "Refresh list of transfers");

    const wrapperLayout = new PanelLayout();
    wrapperLayout.addWidget(this._transferListWidget);
    wrapperLayout.addWidget(refresh_transferlist_button);
    transferWrapper.node.appendChild(this._transferListWidget.node);

    transferWrapper.layout = wrapperLayout;

    // ======== Main layout =====================

    const _mainLayout = new BoxPanel({
      direction: 'top-to-bottom',
      spacing: 0
    });
    _mainLayout.addClass('dm-root');

    _mainLayout.addWidget(split);
    _mainLayout.addWidget(transferWrapper);

    // Control proportions
    BoxPanel.setStretch(split, 3);
    BoxPanel.setStretch(transferWrapper, 1);

    this.layout = new PanelLayout();
    (this.layout as PanelLayout).addWidget(_mainLayout);
    //this._mainLayout.addWidget(split);
    //this._mainLayout.addWidget(transferWrapper);

  }//end constructor

    private _createHeader(title: string): Widget {
    const header = new Widget();
    header.addClass('dm-header');
    header.node.textContent = title;
    return header;
  }

    private _wrapPanel(header: Widget, content: Widget): Widget {
    const panel = new Widget();
    panel.addClass('dm-panel');

    const layout = new PanelLayout();
    panel.layout = layout;

    layout.addWidget(header);
    //layout.addWidget(toolbar);
    layout.addWidget(content);

    return panel;
  }

  //private _fbWidget_l: dm_FileTreePanel;
  //private _fbPanel_l: SplitPanel;
  private source: dm_FileTreePanel;
  private target: dm_FileTreePanel;
  //private _fbWidget_r: dm_FileTreePanel;
  //private _fbPanel_r: SplitPanel;
  //private _transferBoxPanel: BoxPanel;
  //private _fbPanel: BoxPanel;
  private _transferListWidget: dm_TransferList;
  //private _mainLayout: PanelLayout;
  //private _panel_collection: SplitPanel;

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
  
  // Tracker holding the widget state
  let tracker_dm = new WidgetTracker<MainAreaWidget<dmWidget>>({
    namespace: 'inhpc_dm'
  });
  widget_dm = tracker_dm.currentWidget

  let cmd = {
    label: 'InHPC - Data Management dual browser view',
    icon: folderIcon,
    execute: () => {      
      widget_dm = tracker_dm.currentWidget

      if (! widget_dm || widget_dm.isDisposed) {
		// Create a new widget if one does not exist
        const dmwidget = new dmWidget(app, settings);
        dmwidget.id = 'dmwidget_id';
        widget_dm = new MainAreaWidget({ content: dmwidget });
        widget_dm.id = 'inhpc-datamanagement';
        widget_dm.title.label = 'Data Management';
        widget_dm.title.closable = true;
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

  // restorer.restore(tracker_dm, {
  //    command: command_dm,
  //    name: () => 'inhpc_dm'
  // });

}
