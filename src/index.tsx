import { ILayoutRestorer, JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import { ICommandPalette } from "@jupyterlab/apputils";
import { IDocumentManager } from "@jupyterlab/docmanager";
import { ILauncher} from '@jupyterlab/launcher';
import { ISettingRegistry } from "@jupyterlab/settingregistry";

import { activate_dm } from './dm_widget';

/**
 * Initialization for the jupyterlab extensions
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'inhpc_dm:plugin',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer, ISettingRegistry, IDocumentManager],
  optional: [ILauncher],
  activate: (
    app: JupyterFrontEnd, 
    palette: ICommandPalette, 
    restorer: ILayoutRestorer,
    settingReg: ISettingRegistry,
    documentManager: IDocumentManager,
    launcher: ILauncher
) =>
  {
    activate_dm(app, documentManager, palette, restorer, settingReg, launcher, extension.id);
  }
};

export default extension;
