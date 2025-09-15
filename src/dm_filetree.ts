/**
 * Filetree widget based on jupyter-fs
 */

import {
  ContentsProxy
} from "./contents_proxy";

import {
  TreeFinderSidebar,
} from "./treefinder";

import {
  JupyterFrontEnd
} from '@jupyterlab/application';

import { Toolbar} from "@jupyterlab/ui-components";

import { PanelLayout, Widget } from "@lumino/widgets";

import { ISettingRegistry } from "@jupyterlab/settingregistry";

//holds one TreeFinderSidebar
export class dm_FileTreePanel extends Widget {
  constructor(
    app : JupyterFrontEnd,
    settings: ISettingRegistry.ISettings
  ){
    super();
    this.addClass("jp-tree-finder-sidebar");
    this.app = app;
    this.settings = settings;
    this.drive = null;
    this.name = null;
    this.treefinder = null;
    this.toolbar = new Toolbar();
    this.layout = new PanelLayout();
    (this.layout as PanelLayout).addWidget(this.toolbar);

   }

  setEndpoint(url: string, drive: string, name: string){
    this.drive = drive;
    this.name = name;
    if(this.treefinder){
      // remove existing treefinder from UI
      this.treefinder.parent = null;
      this.update();
      TreeFinderSidebar.tracker.remove(this.treefinder);
      this.treefinder = null;
    }
    //this.treefinder = new dm_FileTree(this.app, drive);
    let columns = Array<keyof ContentsProxy.IJupyterContentRow>();
    columns.push("path");
    columns.push("size");
    this.treefinder = new TreeFinderSidebar( {app:this.app, columns:columns, url:url, rootPath: drive, settings:this.settings });
    (this.layout as PanelLayout).addWidget(this.treefinder);
    TreeFinderSidebar.tracker.add(this.treefinder);
    this.update();
  }

  getSelectedDir(): string | null {
    var sel: dm_FileTreeSelection[] = this.getSelected();
    if(sel.length==1 && sel[0].isDir){
      return sel[0].path;
    }
    else{
      return this.getCurrentDir();
    }
  }

  getSelected(): dm_FileTreeSelection[]{
    var result: dm_FileTreeSelection[] = [];
    this.treefinder.treefinder.model.selection.forEach((item)=>{
      console.log("selected: "+JSON.stringify(item));
      var x = new dm_FileTreeSelection();
      x.drive = this.drive;
      x.path = item.pathstr;
      x.isDir = "dir"==item.row.kind;
      console.log("--> "+JSON.stringify(x));
      result.push(x);
    });
    return result;
  }

  getCurrentDir(): string {
    var result = this.treefinder.treefinder.model.root.pathstr
    if (result.includes("/")){
      return result
    }
    else {
      return result+"/"
    }
  
  }
  toolbar: Toolbar;
  treefinder: TreeFinderSidebar;
  drive: string;
  name: string;
  app: JupyterFrontEnd;
  settings: ISettingRegistry.ISettings;
};

export class dm_FileTreeSelection {
  constructor(){};
  path: string;
  drive: string;
  isDir: boolean = false;
}
