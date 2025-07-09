import { ILayoutRestorer, JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import { ICommandPalette } from "@jupyterlab/apputils";
import { ILauncher} from '@jupyterlab/launcher';
import { ISettingRegistry } from "@jupyterlab/settingregistry";

import { IFSOptions, IFSResource, IFSSettingsResource } from "./filesystem";
import { initResources } from "./resources";
import { unpartialResource } from "./settings";
import { activate_dm } from './dm_widget';
import { createDynamicCommands, createStaticCommands } from "./commands";
import { TreeFinderSidebar } from "./treefinder";

let MY_ID = 'inhpc_dm:plugin';

/**
 * Initialization for the inhpc_dm extension
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: MY_ID,
  autoStart: true,
  requires: [ISettingRegistry,ICommandPalette, ILayoutRestorer, ILauncher],
  activate: (
    app: JupyterFrontEnd, 
    settingRegistry: ISettingRegistry,
    palette: ICommandPalette, 
    restorer: ILayoutRestorer,
    launcher: ILauncher
)=>  {  
    console.log('JupyterLab extension InHPC data management activating.');

    async function handleSettingsUpdate(app: JupyterFrontEnd, settings: ISettingRegistry.ISettings): Promise<void> {
      let resources: IFSResource[] = (
        settings?.composite.resources as unknown as IFSSettingsResource[] ?? []
      ).map(unpartialResource);
      const options: IFSOptions = settings?.composite.options as any ?? {};
      try {
        resources = (await initResources(resources, options)).filter(r => r.init);
        } catch (e) {
        console.error("Failed to update resources!", e);
      }
      createDynamicCommands(app, TreeFinderSidebar.tracker, TreeFinderSidebar.clipboard, resources, settings);
  }
  createStaticCommands(app, TreeFinderSidebar.tracker, TreeFinderSidebar.clipboard);
  // Load application settings and setup update handler
  try {
    Promise.all([app.restored, settingRegistry.load(MY_ID)])
      .then(([, settings]) => {
        handleSettingsUpdate(app, settings);
        settings.changed.connect(() => {
          handleSettingsUpdate(app, settings);
        });
        activate_dm(app, palette, restorer, launcher, settings);
      })
    } catch (error) {
      console.warn(`Failed to load settings for the inhpc_dm extension.\n${error}`);
    }
  }
};

export default extension ;