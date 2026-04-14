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
  SplitPanel,
  PanelLayout,
  Widget
} from '@lumino/widgets';

import { 
  folderIcon,
  Toolbar
 } from '@jupyterlab/ui-components';

import {
  dm_TransfersTable
} from './dm_tables';

import { 
  dm_CopyButton,
  dm_RefreshButton,
  dm_SelectEndpointButton
} from './dm_buttons';

import {
  dm_FileTreePanel,
} from './dm_filetree';

import {
  arrowRightIcon,
  arrowLeftIcon
}from './icons';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

export class dmWidget extends Widget {

  constructor(app: JupyterFrontEnd, settings: ISettingRegistry.ISettings) {
    super();
    this.addClass('dm-root');

    // === FileBrowsers left + right + tranferList in the middle ===
    this.leftFB = new dm_FileTreePanel(app, settings);
    this.rightFB = new dm_FileTreePanel(app, settings);
    this._transferListWidget = new dm_TransfersTable();

	  // === Headlines ===
    const sourceHeader = this._createHeader('Filesystem 1');
    const targetHeader = this._createHeader('Filesystem 2');

    // ============= Left file tree ======================================
    const tb_selectEndpointButton_l = new dm_SelectEndpointButton(this.leftFB);
    this.leftFB.toolbar.addClass('dm-toolbar');
    this.leftFB.toolbar.insertItem(0, "selectEndpointBtn", tb_selectEndpointButton_l);

    // ============= Right file tree =====================================
    const tb_selectEndpointButton_r = new dm_SelectEndpointButton(this.rightFB);
    this.rightFB.toolbar.addClass('dm-toolbar');
    this.rightFB.toolbar.insertItem(0, "selectEndpointBtn", tb_selectEndpointButton_r);

    // ============= Middle panel with copy buttons =====================================
    const actionPanel = new Widget();
    actionPanel.addClass('dm-action-panel');

    //setting up the buttons
    const copyBtntoR = new dm_CopyButton(
      this.leftFB,
      this.rightFB,
      this._transferListWidget,
      arrowRightIcon,
      'Copy left selected to right directory directly'
    );

    const copyBtntoL = new dm_CopyButton(
      this.rightFB,
      this.leftFB,
      this._transferListWidget,
      arrowLeftIcon,
      'Copy right selected to left directory directly'
    );

    // setting buttons inside layout (for displaying via lumino)
    const actionLayout = new PanelLayout();
    actionLayout.addWidget(copyBtntoR);
    actionLayout.addWidget(copyBtntoL);
    actionPanel.layout = actionLayout;

    // ============= Middle main panel: FB-left / transfer buttons / FB-right ==============
    //preparing left and right
    const sourcePanel = this._wrapPanel(sourceHeader, this.leftFB);
    const targetPanel = this._wrapPanel(targetHeader, this.rightFB);


     // === main Split layout ===
    const split = new SplitPanel({ orientation: 'horizontal' });
    split.addClass('dm-main');

    split.addWidget(sourcePanel);
    split.addWidget(actionPanel);
    split.addWidget(targetPanel);

    SplitPanel.setStretch(sourcePanel, 1);
    SplitPanel.setStretch(targetPanel, 1);
    SplitPanel.setStretch(actionPanel, 0.2);
    actionPanel.node.style.flexShrink = '0'; //not get shrinked away
    actionPanel.node.style.minWidth = '60px';

    // ======== Table with info about tasks / transfers ===========

    const transferWrapper = new SplitPanel({
      orientation: 'vertical'
    }); 
    transferWrapper.addClass('dm-transfer-wrapper');

  // refresh button
    const refresh_transferlist_button = new dm_RefreshButton(this._transferListWidget, "Refresh list of transfers");
    refresh_transferlist_button.addClass('dm-transfer-header-button');
    //refresh_transferlist_button.addClass('jp-ToolbarButton');
    refresh_transferlist_button.node.style.minWidth = '26px';
    
    // header with toolbar for good spacing and no clipping
    const headerPanel = new Toolbar();
    headerPanel.addClass('dm-transfer-header');

    const headerTitle = new Widget();
    headerTitle.node.textContent = 'Transfer-Log';
    headerTitle.addClass('dm-transfer-title');

    // assembling the header
    headerPanel.addItem('Title',headerTitle);
    headerPanel.addItem('spacing',Toolbar.createSpacerItem());
    headerPanel.addItem('refreshBtn',refresh_transferlist_button);

    // putting it all together
    transferWrapper.addWidget(headerPanel);
    transferWrapper.addWidget(this._transferListWidget);
    //getting the ration between header and table right
    SplitPanel.setStretch(headerPanel, 0.2);
    SplitPanel.setStretch(this._transferListWidget, 10);

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
    layout.addWidget(content);

    return panel;
  }

  private leftFB: dm_FileTreePanel;
  private rightFB: dm_FileTreePanel;
  private _transferListWidget: dm_TransfersTable;

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

  // TODO how does the restore logic work?
  // restorer.restore(tracker_dm, {
  //    command: command_dm,
  //    name: () => 'inhpc_dm'
  // });

}
