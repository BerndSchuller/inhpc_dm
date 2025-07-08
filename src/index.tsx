import { ILayoutRestorer, JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import { ICommandPalette } from "@jupyterlab/apputils";
import { IDocumentManager } from "@jupyterlab/docmanager";
import { ILauncher} from '@jupyterlab/launcher';
import { ISettingRegistry } from "@jupyterlab/settingregistry";

import { IFSOptions, IFSResource, IFSSettingsResource } from "./filesystem";
import { initResources } from "./resources";
import { unpartialResource } from "./settings";
import { activate_dm } from './dm_widget';

let MY_ID = 'inhpc_dm:plugin';

/**
 * Initialization for the inhpc_dm extension
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: MY_ID,
  autoStart: true,
  requires: [ISettingRegistry,ICommandPalette, ILayoutRestorer, IDocumentManager, ILauncher],
  activate: (
    app: JupyterFrontEnd, 
    settingRegistry: ISettingRegistry,
    palette: ICommandPalette, 
    restorer: ILayoutRestorer,
    documentManager: IDocumentManager,
    launcher: ILauncher
)=>  {  
    console.log('JupyterLab extension InHPC data management activating.');

    async function handleSettingsUpdate(settings: ISettingRegistry.ISettings): Promise<void> {
      let resources: IFSResource[] = (
        settings?.composite.resources as unknown as IFSSettingsResource[] ?? []
      ).map(unpartialResource);
      const options: IFSOptions = settings?.composite.options as any ?? {};
      try {
        resources = (await initResources(resources, options)).filter(r => r.init);
        } catch (e) {
        console.error("Failed to update resources!", e);
      }
  }

  // Load application settings and setup update handler
  try {
    Promise.all([app.restored, settingRegistry.load(MY_ID)])
      .then(([, settings]) => {
        handleSettingsUpdate(settings);
        settings.changed.connect(() => {
          handleSettingsUpdate(settings);
        });
      })
    } catch (error) {
      console.warn(`Failed to load settings for the inhpc_dm extension.\n${error}`);
    }  
   activate_dm(app, documentManager, palette, restorer, launcher);
  }
};

export default extension ;